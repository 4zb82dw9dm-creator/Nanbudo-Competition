import { useState } from "react";
import CategoriesManager from "./CategoriesManager";
import PoolsManager from "./PoolsManager";
import ArbitrationManager from "./ArbitrationManager";
import ResultsManager from "./ResultsManager";
import { buildAutomaticCategories, calculateAge } from "./competitionLogic";

function CompetitionDashboard({ competition, onBack, onUpdateCompetition }) {
  const [view, setView] = useState("dashboard");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ nom: "", prenom: "", sexe: "Homme", dateNaissance: "", grade: "", club: "", ligue: "", pays: "", discipline: "both" });
  const competitors = competition.competitors || [];
  const pools = competition.pools || [];
  const matchCount = pools.reduce((total, pool) => total + (pool.matches?.length || 0), 0);

  function handleChange(event) { const { name, value } = event.target; setForm((current) => ({ ...current, [name]: value })); }
  function addCompetitor(event) {
    event.preventDefault();
    if (!form.nom.trim() || !form.prenom.trim()) return alert("Le nom et le prénom sont obligatoires.");
    const competitor = { id: Date.now(), nom: form.nom.trim().toUpperCase(), prenom: form.prenom.trim(), sexe: form.sexe, dateNaissance: form.dateNaissance, age: calculateAge(form.dateNaissance), grade: form.grade.trim(), club: form.club.trim(), ligue: form.ligue.trim(), pays: form.pays.trim(), discipline: form.discipline };
    onUpdateCompetition({ ...competition, competitors: [...competitors, competitor] });
    setForm({ nom: "", prenom: "", sexe: "Homme", dateNaissance: "", grade: "", club: "", ligue: "", pays: "", discipline: "both" });
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

    {view === "competitors" && <div className="competitors-module"><div className="manager-header"><div><p className="surtitle">RÉCEPTION DES INSCRIPTIONS</p><h2>Inscriptions</h2><p>{competitors.length} inscription{competitors.length > 1 ? "s" : ""} enregistrée{competitors.length > 1 ? "s" : ""} dans cette compétition.</p></div><button className="primary" onClick={() => setShowForm((current) => !current)}>{showForm ? "Annuler" : "+ Inscrire"}</button></div>{showForm && <form className="competition-form" onSubmit={addCompetitor}><h3>Inscription à la compétition</h3><div className="form-row"><label>Nom<input name="nom" value={form.nom} onChange={handleChange} required /></label><label>Prénom<input name="prenom" value={form.prenom} onChange={handleChange} required /></label></div><div className="form-row"><label>Sexe<select name="sexe" value={form.sexe} onChange={handleChange}><option>Homme</option><option>Femme</option></select></label><label>Date de naissance<input name="dateNaissance" type="date" value={form.dateNaissance} onChange={handleChange} /></label></div><div className="form-row"><label>Grade<input name="grade" value={form.grade} onChange={handleChange} /></label><label>Club<input name="club" value={form.club} onChange={handleChange} /></label></div><div className="form-row"><label>Ligue<input name="ligue" value={form.ligue} onChange={handleChange} /></label><label>Pays facultatif<input name="pays" value={form.pays} onChange={handleChange} /></label></div><label>Disciplines<select name="discipline" value={form.discipline} onChange={handleChange}><option value="kata">Kata</option><option value="combat">Combat</option><option value="both">Les deux</option></select></label><button className="primary" type="submit">Enregistrer dans la compétition</button></form>}<button className="primary" type="button" onClick={closeRegistrations}>Clôturer les inscriptions et créer les catégories</button><div className="competition-list">{competitors.map((competitor) => <article className="competition" key={competitor.id}><div><h3>{competitor.nom} {competitor.prenom}</h3><p>{competitor.sexe} · {competitor.dateNaissance || "Naissance à renseigner"} · {competitor.grade || "Grade à renseigner"}</p><div className="competitor-events"><span>{competitor.club || "Club non renseigné"}</span><span>{competitor.ligue || "Ligue non renseignée"}</span>{competitor.pays && <span>{competitor.pays}</span>}<span>{competitor.discipline === "both" ? "Kata + Combat" : competitor.discipline}</span></div></div><button className="delete-button" onClick={() => deleteCompetitor(competitor.id)}>Supprimer</button></article>)}</div></div>}
    {view === "categories" && <CategoriesManager competition={competition} onUpdateCompetition={onUpdateCompetition} />}
    {view === "poules" && <PoolsManager competition={competition} onUpdateCompetition={onUpdateCompetition} />}
    {view === "arbitrage" && <ArbitrationManager competition={competition} onUpdateCompetition={onUpdateCompetition} />}
    {view === "results" && <ResultsManager competition={competition} />}
  </section>;
}
export default CompetitionDashboard;
