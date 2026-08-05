import { useMemo, useState } from "react";
import CategoriesManager from "./CategoriesManager";
import PoolsManager from "./PoolsManager";
import ArbitrationManager from "./ArbitrationManager";
import ResultsManager from "./ResultsManager";
import { buildAutomaticCategories } from "./competitionLogic";

export const AGE_OPTIONS = Array.from({ length: 95 }, (_, index) => index + 5);
export const BELT_OPTIONS = ["Blanche", "Blanche/Jaune", "Jaune", "Jaune/Orange", "Orange", "Orange/Verte", "Verte", "Verte/Bleue", "Bleue", "Bleue/Marron", "Marron", "1er Dan", "2ème Dan", "3ème Dan", "4ème Dan", "5ème Dan", "6ème Dan"];
export const REGISTRATION_CATEGORIES = ["Kata 0", "Kata 1", "Kata 2", "Randori", "Ju Randori 1", "Ju Randori 2"];
export const INITIAL_REGISTRATION_FORM = { nom: "", prenom: "", age: "", ceinture: "", club: "", email: "", responsableClub: "", categoriesInscription: [] };

export function competitionDiscipline(categoriesInscription = []) {
  return categoriesInscription.some((category) => !category.startsWith("Kata")) ? "both" : "kata";
}

export function normalizeCompetitor(form, existingId) {
  return {
    id: existingId || Date.now(),
    nom: form.nom.trim().toUpperCase(), prenom: form.prenom.trim(), age: Number(form.age),
    ceinture: form.ceinture, grade: form.ceinture, club: form.club.trim(), email: form.email.trim(),
    responsableClub: form.responsableClub.trim(), categoriesInscription: form.categoriesInscription,
    categorieInscription: form.categoriesInscription.join(", "), discipline: competitionDiscipline(form.categoriesInscription),
    sexe: "Non renseigné", dateNaissance: "", ligue: "", pays: "", statutInscription: form.statutInscription || "À valider",
  };
}

function CompetitionDashboard({ competition, onBack, onUpdateCompetition }) {
  const [view, setView] = useState("dashboard");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(INITIAL_REGISTRATION_FORM);
  const [editingId, setEditingId] = useState(null);
  const [filters, setFilters] = useState({ search: "", club: "", age: "", ceinture: "", category: "" });
  const [sort, setSort] = useState({ key: "nom", direction: "asc" });
  const competitors = competition.competitors || [];
  const pools = competition.pools || [];
  const matchCount = pools.reduce((total, pool) => total + (pool.matches?.length || 0), 0);

  const filteredCompetitors = useMemo(() => competitors.filter((competitor) => {
    const fullName = `${competitor.nom} ${competitor.prenom}`.toLowerCase();
    const categories = competitor.categoriesInscription || (competitor.categorieInscription ? [competitor.categorieInscription] : []);
    return (!filters.search || fullName.includes(filters.search.toLowerCase())) && (!filters.club || competitor.club === filters.club) && (!filters.age || String(competitor.age) === filters.age) && (!filters.ceinture || competitor.ceinture === filters.ceinture) && (!filters.category || categories.includes(filters.category));
  }).sort((a, b) => {
    const av = Array.isArray(a[sort.key]) ? a[sort.key].join(", ") : a[sort.key] || "";
    const bv = Array.isArray(b[sort.key]) ? b[sort.key].join(", ") : b[sort.key] || "";
    return String(av).localeCompare(String(bv), "fr", { numeric: true }) * (sort.direction === "asc" ? 1 : -1);
  }), [competitors, filters, sort]);

  function handleChange(event) { const { name, value } = event.target; setForm((current) => ({ ...current, [name]: value })); }
  function toggleCategory(category) { setForm((current) => ({ ...current, categoriesInscription: current.categoriesInscription.includes(category) ? current.categoriesInscription.filter((item) => item !== category) : [...current.categoriesInscription, category] })); }
  function resetForm() { setForm(INITIAL_REGISTRATION_FORM); setEditingId(null); setShowForm(false); }
  function saveCompetitor(event) {
    event.preventDefault();
    if (!form.nom.trim() || !form.prenom.trim() || !form.age || !form.ceinture || !form.club.trim() || form.categoriesInscription.length === 0) return alert("Veuillez renseigner tous les champs obligatoires.");
    const competitor = normalizeCompetitor(form, editingId);
    onUpdateCompetition({ ...competition, competitors: editingId ? competitors.map((item) => item.id === editingId ? competitor : item) : [...competitors, competitor] });
    resetForm();
  }
  function editCompetitor(competitor) { setEditingId(competitor.id); setForm({ ...INITIAL_REGISTRATION_FORM, ...competitor, categoriesInscription: competitor.categoriesInscription || [competitor.categorieInscription].filter(Boolean) }); setShowForm(true); }
  function deleteCompetitor(id) { if (window.confirm("Supprimer cette inscription ?")) onUpdateCompetition({ ...competition, competitors: competitors.filter((competitor) => competitor.id !== id) }); }
  function validateCompetitor(id) { onUpdateCompetition({ ...competition, competitors: competitors.map((competitor) => competitor.id === id ? { ...competitor, statutInscription: "Validée" } : competitor) }); }
  function closeRegistrations() { if (competitors.length === 0) return alert("Ajoutez au moins une inscription avant la clôture."); onUpdateCompetition({ ...competition, statut: "Catégories générées", categories: buildAutomaticCategories(competitors), pools: [] }); setView("categories"); }
  function exportCompetition() { const blob = new Blob([JSON.stringify(competition, null, 2)], { type: "application/json" }); const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = "nanbudo-competition.json"; document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url); }
  function sortBy(key) { setSort((current) => ({ key, direction: current.key === key && current.direction === "asc" ? "desc" : "asc" })); }
  const clubs = [...new Set(competitors.map((competitor) => competitor.club).filter(Boolean))];

  return <section className="competition-dashboard">
    <button className="back-button" type="button" onClick={onBack}>← Retour aux compétitions</button>
    <div className="competition-dashboard-header"><div><p className="surtitle">CYCLE DE COMPÉTITION</p><h2>{competition.nom}</h2><p>{competition.lieu || "Lieu à définir"} · {competition.date || "Date à définir"}</p><p className="public-link">Lien clubs : <code>{`${window.location.origin}${window.location.pathname}#inscription-${competition.publicToken || competition.id}`}</code></p></div><span className="status">{competition.statut}</span></div>
    <nav className="competition-menu">{[["dashboard","Tableau de bord"],["competitors","Inscriptions"],["categories","Catégories"],["poules","Poules / Tableau"],["arbitrage","Arbitrage"],["results","Résultats"]].map(([id,label]) => <button key={id} className={view === id ? "active" : ""} onClick={() => setView(id)}>{label}</button>)}</nav>
    {view === "dashboard" && <div className="competition-dashboard-content"><div className="dashboard"><div className="card"><span className="number">{competitors.length}</span><h3>Inscriptions</h3><p>Compétiteurs uniques enregistrés dans la base centrale.</p></div><div className="card"><span className="number">{competition.categories?.length || 0}</span><h3>Catégories</h3><p>Créées sans ressaisie depuis les catégories d’inscription.</p></div><div className="card"><span className="number">{matchCount}</span><h3>Matchs</h3><p>Générés depuis les mêmes fiches compétiteurs.</p></div></div><div className="beta-note"><strong>Architecture centralisée</strong><p>Le compétiteur existe une seule fois : inscriptions, catégories, poules, arbitrage et résultats réutilisent son identifiant unique.</p></div><button className="primary" onClick={exportCompetition}>Exporter la compétition</button></div>}
    {view === "competitors" && <div className="competitors-module"><div className="manager-header"><div><p className="surtitle">TABLEAU DES INSCRITS</p><h2>Inscriptions</h2><p>{competitors.length} inscription{competitors.length > 1 ? "s" : ""} visible{competitors.length > 1 ? "s" : ""} en temps réel.</p></div><button className="primary" onClick={() => setShowForm((current) => !current)}>{showForm ? "Annuler" : "+ Inscrire"}</button></div>{showForm && <RegistrationForm form={form} onChange={handleChange} onToggleCategory={toggleCategory} onSubmit={saveCompetitor} submitLabel={editingId ? "Enregistrer" : "S’inscrire"} />}<button className="primary" type="button" onClick={closeRegistrations}>Créer les catégories</button><div className="filters"><input placeholder="Rechercher par nom" value={filters.search} onChange={(event) => setFilters({ ...filters, search: event.target.value })} /><select value={filters.club} onChange={(event) => setFilters({ ...filters, club: event.target.value })}><option value="">Tous les clubs</option>{clubs.map((club) => <option key={club} value={club}>{club}</option>)}</select><select value={filters.age} onChange={(event) => setFilters({ ...filters, age: event.target.value })}><option value="">Tous les âges</option>{AGE_OPTIONS.map((age) => <option key={age} value={age}>{age}</option>)}</select><select value={filters.ceinture} onChange={(event) => setFilters({ ...filters, ceinture: event.target.value })}><option value="">Toutes ceintures</option>{BELT_OPTIONS.map((belt) => <option key={belt} value={belt}>{belt}</option>)}</select><select value={filters.category} onChange={(event) => setFilters({ ...filters, category: event.target.value })}><option value="">Toutes catégories</option>{REGISTRATION_CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}</select></div><div className="registrations-table"><table><thead><tr>{[["nom","Nom"],["prenom","Prénom"],["age","Âge"],["ceinture","Ceinture"],["club","Club"],["email","Email"],["responsableClub","Responsable"],["categorieInscription","Catégories"],["statutInscription","Statut"]].map(([key,label]) => <th key={key}><button onClick={() => sortBy(key)}>{label}</button></th>)}<th>Actions</th></tr></thead><tbody>{filteredCompetitors.map((competitor) => <tr key={competitor.id}><td>{competitor.nom}</td><td>{competitor.prenom}</td><td>{competitor.age}</td><td>{competitor.ceinture}</td><td>{competitor.club}</td><td>{competitor.email}</td><td>{competitor.responsableClub}</td><td>{(competitor.categoriesInscription || [competitor.categorieInscription]).filter(Boolean).join(", ")}</td><td>{competitor.statutInscription || "À valider"}</td><td><button className="manage-button" onClick={() => editCompetitor(competitor)}>Consulter / modifier</button><button className="manage-button" onClick={() => validateCompetitor(competitor.id)}>Valider</button><button className="delete-button" onClick={() => deleteCompetitor(competitor.id)}>Supprimer</button></td></tr>)}</tbody></table></div></div>}
    {view === "categories" && <CategoriesManager competition={competition} onUpdateCompetition={onUpdateCompetition} />}{view === "poules" && <PoolsManager competition={competition} onUpdateCompetition={onUpdateCompetition} />}{view === "arbitrage" && <ArbitrationManager competition={competition} onUpdateCompetition={onUpdateCompetition} />}{view === "results" && <ResultsManager competition={competition} />}
  </section>;
}
export function RegistrationForm({ form, onChange, onToggleCategory, onSubmit, submitLabel = "S’inscrire" }) { return <form className="competition-form registration-form" onSubmit={onSubmit}><div className="form-title"><p className="surtitle">FORMULAIRE CLUB</p><h3>Inscription compétiteur</h3><p>Les clubs utilisent uniquement ce formulaire public sécurisé.</p></div><div className="form-row"><label>Nom *<input name="nom" value={form.nom} onChange={onChange} required /></label><label>Prénom *<input name="prenom" value={form.prenom} onChange={onChange} required /></label></div><div className="form-row"><label>Âge *<select name="age" value={form.age} onChange={onChange} required><option value="">Sélectionner l’âge</option>{AGE_OPTIONS.map((age) => <option key={age} value={age}>{age} ans</option>)}</select></label><label>Ceinture *<select name="ceinture" value={form.ceinture} onChange={onChange} required><option value="">Sélectionner la ceinture</option>{BELT_OPTIONS.map((belt) => <option key={belt} value={belt}>{belt}</option>)}</select></label></div><div className="form-row"><label>Club *<input name="club" value={form.club} onChange={onChange} required /></label><label>Email<input name="email" type="email" value={form.email} onChange={onChange} /></label></div><label>Responsable du club<input name="responsableClub" value={form.responsableClub} onChange={onChange} /></label><div className="category-checklist"><strong>Catégories d’inscription *</strong>{REGISTRATION_CATEGORIES.map((category) => <label key={category} className="checkbox-line"><input type="checkbox" checked={form.categoriesInscription.includes(category)} onChange={() => onToggleCategory(category)} /> {category}</label>)}</div><button className="primary" type="submit">{submitLabel}</button></form>; }
export default CompetitionDashboard;
