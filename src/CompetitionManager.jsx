import { useEffect, useState } from "react";
import CompetitionDashboard from "./CompetitionDashboard";

function CompetitionManager() {
  const [competitions, setCompetitions] = useState(() => JSON.parse(localStorage.getItem("nanbudo_competitions") || "[]"));
  const [showForm, setShowForm] = useState(false);
  const [selectedCompetitionId, setSelectedCompetitionId] = useState(null);
  const [form, setForm] = useState({ nom: "", date: "", lieu: "", tatamis: 3, horairesActifs: false });

  useEffect(() => { localStorage.setItem("nanbudo_competitions", JSON.stringify(competitions)); }, [competitions]);

  function createCompetition(event) {
    event.preventDefault();
    if (!form.nom.trim()) return alert("Indique le nom de la compétition.");
    setCompetitions((current) => [...current, { id: Date.now(), nom: form.nom.trim(), date: form.date, lieu: form.lieu.trim(), tatamis: Number(form.tatamis) || 1, horairesActifs: form.horairesActifs, statut: "Inscriptions ouvertes", competitors: [], categories: [], pools: [] }]);
    setForm({ nom: "", date: "", lieu: "", tatamis: 3, horairesActifs: false });
    setShowForm(false);
  }

  function updateCompetition(updatedCompetition) { setCompetitions((current) => current.map((competition) => competition.id === updatedCompetition.id ? updatedCompetition : competition)); }
  function deleteCompetition(id) { if (window.confirm("Supprimer cette compétition ?")) setCompetitions((current) => current.filter((competition) => competition.id !== id)); }

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
