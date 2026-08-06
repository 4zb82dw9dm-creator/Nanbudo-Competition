import { useEffect, useState } from "react";
import CompetitionDashboard, { INITIAL_REGISTRATION_FORM, RegistrationForm, normalizeCompetitor } from "./CompetitionDashboard";
import { createDemoCompetitionTest30 } from "./demoCompetitionData";
import { persistCompetitions, processRegistration, reportRegistrationFailure } from "./registrationProcessing";

function CompetitionManager() {
  const [competitions, setCompetitions] = useState(() => {
    const savedCompetitions = JSON.parse(localStorage.getItem("nanbudo_competitions") || "[]");
    return savedCompetitions.some((competition) => competition.nom === "Compétition Test 30")
      ? savedCompetitions
      : [...savedCompetitions, createDemoCompetitionTest30()];
  });
  const [showForm, setShowForm] = useState(false);
  const [selectedCompetitionId, setSelectedCompetitionId] = useState(null);
  const [hash, setHash] = useState(window.location.hash);
  const [form, setForm] = useState({ nom: "", date: "", lieu: "", tatamis: 3, horairesActifs: false });
  const [registrationForm, setRegistrationForm] = useState(INITIAL_REGISTRATION_FORM);

  useEffect(() => { persistCompetitions(competitions); }, [competitions]);
  useEffect(() => { const listener = (event) => { if (Array.isArray(event.detail)) setCompetitions(event.detail); }; window.addEventListener("nanbudo:competitions-updated", listener); return () => window.removeEventListener("nanbudo:competitions-updated", listener); }, []);
  useEffect(() => { const listener = () => setHash(window.location.hash); window.addEventListener("hashchange", listener); return () => window.removeEventListener("hashchange", listener); }, []);

  function createCompetition(event) {
    event.preventDefault();
    if (!form.nom.trim()) return alert("Indique le nom de la compétition.");
    setCompetitions((current) => [...current, { id: Date.now(), publicToken: crypto.randomUUID(), nom: form.nom.trim(), date: form.date, lieu: form.lieu.trim(), tatamis: Number(form.tatamis) || 1, horairesActifs: form.horairesActifs, statut: "Inscriptions ouvertes", competitors: [], categories: [], pools: [] }]);
    setForm({ nom: "", date: "", lieu: "", tatamis: 3, horairesActifs: false });
    setShowForm(false);
  }

  function updateCompetition(updatedCompetition) { setCompetitions((current) => current.map((competition) => competition.id === updatedCompetition.id ? updatedCompetition : competition)); }
  function deleteCompetition(id) { if (window.confirm("Supprimer cette compétition ?")) setCompetitions((current) => current.filter((competition) => competition.id !== id)); }
  function handleRegistrationChange(event) { const { name, value } = event.target; setRegistrationForm((current) => ({ ...current, [name]: value })); }
  function toggleRegistrationCategory(category) { setRegistrationForm((current) => ({ ...current, categoriesInscription: current.categoriesInscription.includes(category) ? current.categoriesInscription.filter((item) => item !== category) : [...current.categoriesInscription, category] })); }

  const publicToken = hash.startsWith("#inscription-") ? hash.replace("#inscription-", "") : null;
  const publicCompetition = competitions.find((competition) => String(competition.publicToken || competition.id) === publicToken);
  if (publicCompetition) {
    async function submitPublicRegistration(event) {
      event.preventDefault();
      try {
        const { updatedCompetitions } = await processRegistration({ competitions, competition: publicCompetition, form: registrationForm, createCompetitor: normalizeCompetitor });
        setCompetitions(updatedCompetitions);
        setRegistrationForm(INITIAL_REGISTRATION_FORM);
        alert("Inscription enregistrée. Elle est visible par l’organisateur.");
      } catch (error) {
        reportRegistrationFailure("Traitement public", error);
        alert(error.message || "Une erreur est survenue pendant l’inscription.");
        throw error;
      }
    }
    return <section className="competition-manager public-registration"><p className="surtitle">LIEN PUBLIC SÉCURISÉ CLUB</p><h2>{publicCompetition.nom}</h2><p>Accès limité au formulaire d’inscription : aucune autre fonctionnalité organisateur n’est disponible depuis ce lien.</p><RegistrationForm form={registrationForm} onChange={handleRegistrationChange} onToggleCategory={toggleRegistrationCategory} onSubmit={submitPublicRegistration} /></section>;
  }

  const selectedCompetition = competitions.find((competition) => competition.id === selectedCompetitionId);
  if (selectedCompetition) return <CompetitionDashboard competition={selectedCompetition} onBack={() => setSelectedCompetitionId(null)} onUpdateCompetition={updateCompetition} />;

  return (
    <section className="competition-manager">
      <div className="manager-header"><div><p className="surtitle">COMPÉTITIONS</p><h2>Gestion des compétitions</h2><p>Créez une compétition puis suivez son cycle complet.</p></div><button className="primary" onClick={() => setShowForm((current) => !current)}>{showForm ? "Annuler" : "+ Nouvelle compétition"}</button></div>
      {showForm && <form className="competition-form" onSubmit={createCompetition}><h3>Nouvelle compétition</h3><label>Nom<input name="nom" value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} required /></label><div className="form-row"><label>Date<input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></label><label>Lieu<input value={form.lieu} onChange={(e) => setForm({ ...form, lieu: e.target.value })} /></label></div><div className="form-row"><label>Tatamis<input type="number" min="1" value={form.tatamis} onChange={(e) => setForm({ ...form, tatamis: e.target.value })} /></label><label className="checkbox-line"><input type="checkbox" checked={form.horairesActifs} onChange={(e) => setForm({ ...form, horairesActifs: e.target.checked })} /> Activer la planification horaire</label></div><button className="primary" type="submit">Créer</button></form>}
      {competitions.length === 0 ? <div className="empty-state"><span className="empty-number">0</span><h3>Aucune compétition</h3><p>Créez votre première compétition pour recevoir les inscriptions.</p></div> : <div className="managed-competitions">{competitions.map((competition) => <article className="managed-competition" key={competition.id}><div className="competition-main"><span className="status">{competition.statut}</span><h3>{competition.nom}</h3><p>{competition.lieu || "Lieu à définir"} · {competition.date || "Date à définir"}</p></div><div className="competition-stats"><div><strong>{competition.competitors?.length || 0}</strong><span>Inscriptions</span></div><div><strong>{competition.categories?.length || 0}</strong><span>Catégories</span></div></div><div className="competition-actions"><button className="manage-button" onClick={() => setSelectedCompetitionId(competition.id)}>Gérer</button><button className="delete-button" onClick={() => deleteCompetition(competition.id)}>Supprimer</button></div></article>)}</div>}
    </section>
  );
}
export default CompetitionManager;
