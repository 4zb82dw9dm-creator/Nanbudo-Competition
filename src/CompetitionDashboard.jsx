import { useState } from "react";
import CategoriesManager from "./CategoriesManager";
import PoolsManager from "./PoolsManager";
import ArbitrationManager from "./ArbitrationManager";
import ResultsManager from "./ResultsManager";
import { buildAutomaticCategories } from "./competitionLogic";

const AGE_OPTIONS = Array.from({ length: 95 }, (_, index) => index + 5);
const BELT_OPTIONS = ["Blanche", "Blanche/Jaune", "Jaune", "Jaune/Orange", "Orange", "Orange/Verte", "Verte", "Verte/Bleue", "Bleue", "Bleue/Marron", "Marron", "1er Dan", "2ème Dan", "3ème Dan", "4ème Dan", "5ème Dan", "6ème Dan"];
const REGISTRATION_CATEGORIES = ["Kata 0", "Kata 1", "Kata 2", "Randori", "Ju Randori 1", "Ju Randori 2"];
const INITIAL_REGISTRATION_FORM = { nom: "", prenom: "", age: "", ceinture: "", club: "", email: "", responsableClub: "", categorieInscription: "" };

function competitionDiscipline(categorieInscription) {
  return categorieInscription.startsWith("Kata") ? "kata" : "combat";
}

function CompetitionDashboard({ competition, onBack, onUpdateCompetition }) {
  const [view, setView] = useState("dashboard");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(INITIAL_REGISTRATION_FORM);
  const competitors = competition.competitors || [];
  const pools = competition.pools || [];
  const matchCount = pools.reduce((total, pool) => total + (pool.matches?.length || 0), 0);

  function handleChange(event) { const { name, value } = event.target; setForm((current) => ({ ...current, [name]: value })); }
  function addCompetitor(event) {
    event.preventDefault();
    if (!form.nom.trim() || !form.prenom.trim() || !form.age || !form.ceinture || !form.club.trim() || !form.categorieInscription) return alert("Veuillez renseigner tous les champs obligatoires.");
    const competitor = {
      id: Date.now(),
      nom: form.nom.trim().toUpperCase(),
      prenom: form.prenom.trim(),
      age: Number(form.age),
      ceinture: form.ceinture,
      grade: form.ceinture,
      club: form.club.trim(),
      email: form.email.trim(),
      responsableClub: form.responsableClub.trim(),
      categorieInscription: form.categorieInscription,
      discipline: competitionDiscipline(form.categorieInscription),
      sexe: "Non renseigné",
      dateNaissance: "",
      ligue: "",
      pays: "",
    };
    onUpdateCompetition({ ...competition, competitors: [...competitors, competitor] });
    setForm(INITIAL_REGISTRATION_FORM);
    setShowForm(false);
  }
  function deleteCompetitor(id) { if (window.confirm("Supprimer cette inscription ?")) onUpdateCompetition({ ...competition, competitors: competitors.filter((competitor) => competitor.id !== id) }); }
  function closeRegistrations() {
    if (competitors.length === 0) return alert("Ajoutez au moins une inscription avant la clôture.");
    onUpdateCompetition({ ...competition, statut: "Catégories générées", categories: buildAutomaticCategories(competitors), pools: [] });
    setView("categories");
  }
  function exportCompetition() {
    const blob = new Blob([JSON.stringify(competition, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob); const link = document.createElement("a");
    link.href = url; link.download = "nanbudo-competition.json"; document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url);
  }

  return <section className="competition-dashboard">
    <button className="back-button" type="button" onClick={onBack}>← Retour aux compétitions</button>
    <div className="competition-dashboard-header"><div><p className="surtitle">CYCLE DE COMPÉTITION</p><h2>{competition.nom}</h2><p>{competition.lieu || "Lieu à définir"} · {competition.date || "Date à définir"}</p></div><span className="status">{competition.statut}</span></div>
    <nav className="competition-menu">{[["dashboard","Tableau de bord"],["competitors","Inscriptions"],["categories","Catégories"],["poules","Poules / Tableau"],["arbitrage","Arbitrage"],["results","Résultats"]].map(([id,label]) => <button key={id} className={view === id ? "active" : ""} onClick={() => setView(id)}>{label}</button>)}</nav>

    {view === "dashboard" && <div className="competition-dashboard-content"><div className="dashboard"><div className="card"><span className="number">{competitors.length}</span><h3>Inscriptions</h3><p>Compétiteurs inscrits à cette compétition.</p></div><div className="card"><span className="number">{competition.categories?.length || 0}</span><h3>Catégories</h3><p>Créées à partir de l'âge, du sexe et du grade.</p></div><div className="card"><span className="number">{matchCount}</span><h3>Matchs</h3><p>Ordre, tatamis et horaires prêts pour l'arbitrage.</p></div></div><div className="beta-note"><strong>Cycle fonctionnel</strong><p>1. Recevez les inscriptions. 2. Clôturez pour créer les catégories. 3. Générez les poules et tableaux. 4. Arbitrez chaque match par clic direct. 5. Consultez les résultats.</p></div><button className="primary" onClick={exportCompetition}>Exporter la compétition</button></div>}

    {view === "competitors" && <div className="competitors-module"><div className="manager-header"><div><p className="surtitle">RÉCEPTION DES INSCRIPTIONS</p><h2>Inscriptions</h2><p>{competitors.length} inscription{competitors.length > 1 ? "s" : ""} enregistrée{competitors.length > 1 ? "s" : ""} dans cette compétition.</p></div><button className="primary" onClick={() => setShowForm((current) => !current)}>{showForm ? "Annuler" : "+ Inscrire"}</button></div>{showForm && <form className="competition-form registration-form" onSubmit={addCompetitor}><div className="form-title"><p className="surtitle">FICHE DYNAMIQUE</p><h3>Inscription compétiteur</h3><p>Les champs marqués d’un astérisque sont obligatoires.</p></div><div className="form-row"><label>Nom *<input name="nom" value={form.nom} onChange={handleChange} required /></label><label>Prénom *<input name="prenom" value={form.prenom} onChange={handleChange} required /></label></div><div className="form-row"><label>Âge *<select name="age" value={form.age} onChange={handleChange} required><option value="">Sélectionner l’âge</option>{AGE_OPTIONS.map((age) => <option key={age} value={age}>{age} ans</option>)}</select></label><label>Ceinture *<select name="ceinture" value={form.ceinture} onChange={handleChange} required><option value="">Sélectionner la ceinture</option>{BELT_OPTIONS.map((belt) => <option key={belt} value={belt}>{belt}</option>)}</select></label></div><div className="form-row"><label>Club *<input name="club" value={form.club} onChange={handleChange} required /></label><label>Email<input name="email" type="email" value={form.email} onChange={handleChange} /></label></div><div className="form-row"><label>Responsable du club<input name="responsableClub" value={form.responsableClub} onChange={handleChange} /></label><label>Catégorie d’inscription *<select name="categorieInscription" value={form.categorieInscription} onChange={handleChange} required><option value="">Sélectionner une catégorie</option>{REGISTRATION_CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}</select></label></div><button className="primary" type="submit">S’inscrire</button></form>}<button className="primary" type="button" onClick={closeRegistrations}>Clôturer les inscriptions et créer les catégories</button><div className="competition-list">{competitors.map((competitor) => <article className="competition" key={competitor.id}><div><h3>{competitor.nom} {competitor.prenom}</h3><p>{competitor.age ? `${competitor.age} ans` : competitor.dateNaissance || "Âge à renseigner"} · {competitor.ceinture || competitor.grade || "Ceinture à renseigner"} · {competitor.categorieInscription || "Catégorie à renseigner"}</p><div className="competitor-events"><span>{competitor.club || "Club non renseigné"}</span>{competitor.email && <span>{competitor.email}</span>}{competitor.responsableClub && <span>Responsable : {competitor.responsableClub}</span>}</div></div><button className="delete-button" onClick={() => deleteCompetitor(competitor.id)}>Supprimer</button></article>)}</div></div>}
    {view === "categories" && <CategoriesManager competition={competition} onUpdateCompetition={onUpdateCompetition} />}
    {view === "poules" && <PoolsManager competition={competition} onUpdateCompetition={onUpdateCompetition} />}
    {view === "arbitrage" && <ArbitrationManager competition={competition} onUpdateCompetition={onUpdateCompetition} />}
    {view === "results" && <ResultsManager competition={competition} />}
  </section>;
}
export default CompetitionDashboard;
