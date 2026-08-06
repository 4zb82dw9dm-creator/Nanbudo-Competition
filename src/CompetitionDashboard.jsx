import { useMemo, useState } from "react";
import CategoriesManager from "./CategoriesManager";
import PoolsManager from "./PoolsManager";
import ArbitrationManager from "./ArbitrationManager";
import ResultsManager from "./ResultsManager";
import { buildAutomaticCategories, calculateAge } from "./competitionLogic";
import { competitionRulesEngine } from "./rules/competitionRulesEngine";
import { validateRegistrationForm } from "./registrationProcessing";

export const AGE_OPTIONS = Array.from({ length: 95 }, (_, index) => index + 5);
export const BELT_OPTIONS = ["6ème Kyu", "5ème Kyu", "4ème Kyu", "3ème Kyu", "2ème Kyu", "1er Kyu", "1er Dan", "2ème Dan", "3ème Dan", "4ème Dan", "5ème Dan", "6ème Dan"];
export const REGISTRATION_CATEGORIES = [
  "Kata individuel",
  "Kata par équipe",
  "Randori",
  "Ju Randori",
  "Ju Randori par équipe",
  "Dantai Randori",
];
export const COMBAT_OPTIONS = ["Randori", "Ju randori 1", "Ju randori 2"];
export const KATA_OPTIONS = ["kata 0", "kata 1", "kata 2"];
export const REFEREE_OPTIONS = ["arbitre table", "sushin", "fukushin"];
export const INITIAL_PARTICIPANT_ROW = { nom: "", prenom: "", sexe: "", dateNaissance: "", ceinture: "", typeInscription: "", combat: "", kata: "", roleArbitre: "", observations: "" };
export const INITIAL_REGISTRATION_FORM = { club: "", email: "", responsableClub: "", telephoneResponsable: "", participants: Array.from({ length: 15 }, () => ({ ...INITIAL_PARTICIPANT_ROW })) };

export function competitionDiscipline(categoriesInscription = []) {
  const hasKata = categoriesInscription.some((category) => category.toLowerCase().startsWith("kata"));
  const hasCombat = categoriesInscription.some((category) => !category.toLowerCase().startsWith("kata"));
  if (hasKata && hasCombat) return "both";
  return hasKata ? "kata" : "combat";
}

export function isParticipantRowEmpty(row) {
  return Object.values(row).every((value) => !String(value || "").trim());
}

export function categoriesFromParticipant(row) {
  if (row.typeInscription === "Arbitre") return [];
  return [row.combat, row.kata].filter(Boolean);
}

export function normalizeCompetitor(form, existingId) {
  const participant = form.participant || form;
  const categoriesInscription = participant.categoriesInscription || categoriesFromParticipant(participant);
  const age = participant.age || calculateAge(participant.dateNaissance);
  return {
    id: existingId || Date.now() + Math.floor(Math.random() * 100000),
    nom: participant.nom.trim().toUpperCase(), prenom: participant.prenom.trim(), age: Number(age),
    ceinture: participant.ceinture, grade: participant.ceinture, club: form.club.trim(), email: form.email.trim(),
    responsableClub: form.responsableClub.trim(), telephoneResponsable: form.telephoneResponsable?.trim() || "",
    categoriesInscription, categorieInscription: categoriesInscription.join(", "), discipline: categoriesInscription.length ? competitionDiscipline(categoriesInscription) : "arbitrage",
    sexe: participant.sexe || "Non renseigné", dateNaissance: participant.dateNaissance || "", ligue: "", pays: "",
    typeInscription: participant.typeInscription || "Compétiteur", roleArbitre: participant.roleArbitre || "", observations: participant.observations || "",
    statutInscription: participant.statutInscription || "À valider",
  };
}

export function createEmptyParticipantRows(count = 15) {
  return Array.from({ length: count }, () => ({ ...INITIAL_PARTICIPANT_ROW }));
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

  function handleClubChange(event) { const { name, value } = event.target; setForm((current) => ({ ...current, [name]: value })); }
  function handleParticipantChange(index, field, value) { setForm((current) => ({ ...current, participants: current.participants.map((row, rowIndex) => rowIndex === index ? { ...row, [field]: value } : row) })); }
  function addParticipantRows() { setForm((current) => ({ ...current, participants: [...current.participants, ...createEmptyParticipantRows(5)] })); }
  function clearParticipantRows() { setForm((current) => ({ ...current, participants: createEmptyParticipantRows(15) })); }
  function resetForm() { setForm(INITIAL_REGISTRATION_FORM); setEditingId(null); setShowForm(false); }
  function saveCompetitor(event) {
    event.preventDefault();
    const validationError = validateRegistrationForm(form);
    if (validationError) return alert(validationError);
    const newCompetitors = form.participants.filter((row) => !isParticipantRowEmpty(row)).map((participant) => normalizeCompetitor({ ...form, participant }));
    onUpdateCompetition({ ...competition, competitors: editingId ? competitors.map((item) => item.id === editingId ? { ...newCompetitors[0], id: editingId } : item) : [...competitors, ...newCompetitors] });
    resetForm();
  }
  function editCompetitor(competitor) { setEditingId(competitor.id); setForm({ club: competitor.club || "", email: competitor.email || "", responsableClub: competitor.responsableClub || "", telephoneResponsable: competitor.telephoneResponsable || "", participants: [{ nom: competitor.nom || "", prenom: competitor.prenom || "", sexe: competitor.sexe || "", dateNaissance: competitor.dateNaissance || "", ceinture: competitor.ceinture || "", typeInscription: competitor.typeInscription || "Compétiteur", combat: (competitor.categoriesInscription || []).find((category) => !category.toLowerCase().startsWith("kata")) || "", kata: (competitor.categoriesInscription || []).find((category) => category.toLowerCase().startsWith("kata")) || "", roleArbitre: competitor.roleArbitre || "", observations: competitor.observations || "" }] }); setShowForm(true); }
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
    {view === "dashboard" && <div className="competition-dashboard-content"><div className="dashboard"><div className="card"><span className="number">{competitors.length}</span><h3>Inscriptions</h3><p>Compétiteurs uniques enregistrés dans la base centrale.</p></div><div className="card"><span className="number">{competition.categories?.length || 0}</span><h3>Catégories</h3><p>Créées sans ressaisie depuis les catégories d’inscription.</p></div><div className="card"><span className="number">{matchCount}</span><h3>Matchs</h3><p>Générés depuis les mêmes fiches compétiteurs.</p></div></div><div className="beta-note"><strong>Moteur de règles CINDA 2025</strong><p>{competitionRulesEngine.ruleset.label} centralise les disciplines, catégories, pénalités et paramètres évolutifs. Les chapitres non encore structurés restent marqués comme ambiguïtés à traiter depuis le PDF officiel.</p></div><button className="primary" onClick={exportCompetition}>Exporter la compétition</button></div>}
    {view === "competitors" && <div className="competitors-module"><div className="manager-header"><div><p className="surtitle">TABLEAU DES INSCRITS</p><h2>Inscriptions</h2><p>{competitors.length} inscription{competitors.length > 1 ? "s" : ""} visible{competitors.length > 1 ? "s" : ""} en temps réel.</p></div><button className="primary" onClick={() => setShowForm((current) => !current)}>{showForm ? "Annuler" : "+ Inscrire"}</button></div>{showForm && <RegistrationForm form={form} onClubChange={handleClubChange} onParticipantChange={handleParticipantChange} onAddRows={addParticipantRows} onClearRows={clearParticipantRows} onSubmit={saveCompetitor} submitLabel={editingId ? "Enregistrer" : "Enregistrer l’inscription"} />}<button className="primary" type="button" onClick={closeRegistrations}>Créer les catégories</button><div className="filters"><input placeholder="Rechercher par nom" value={filters.search} onChange={(event) => setFilters({ ...filters, search: event.target.value })} /><select value={filters.club} onChange={(event) => setFilters({ ...filters, club: event.target.value })}><option value="">Tous les clubs</option>{clubs.map((club) => <option key={club} value={club}>{club}</option>)}</select><select value={filters.age} onChange={(event) => setFilters({ ...filters, age: event.target.value })}><option value="">Tous les âges</option>{AGE_OPTIONS.map((age) => <option key={age} value={age}>{age}</option>)}</select><select value={filters.ceinture} onChange={(event) => setFilters({ ...filters, ceinture: event.target.value })}><option value="">Toutes ceintures</option>{BELT_OPTIONS.map((belt) => <option key={belt} value={belt}>{belt}</option>)}</select><select value={filters.category} onChange={(event) => setFilters({ ...filters, category: event.target.value })}><option value="">Toutes catégories</option>{REGISTRATION_CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}</select></div><div className="registrations-table"><table><thead><tr>{[["nom","Nom"],["prenom","Prénom"],["age","Âge"],["ceinture","Ceinture"],["club","Club"],["email","Email"],["responsableClub","Responsable"],["categorieInscription","Catégories"],["statutInscription","Statut"]].map(([key,label]) => <th key={key}><button onClick={() => sortBy(key)}>{label}</button></th>)}<th>Actions</th></tr></thead><tbody>{filteredCompetitors.map((competitor) => <tr key={competitor.id}><td>{competitor.nom}</td><td>{competitor.prenom}</td><td>{competitor.age}</td><td>{competitor.ceinture}</td><td>{competitor.club}</td><td>{competitor.email}</td><td>{competitor.responsableClub}</td><td>{(competitor.categoriesInscription || [competitor.categorieInscription]).filter(Boolean).join(", ")}</td><td>{competitor.statutInscription || "À valider"}</td><td><button className="manage-button" onClick={() => editCompetitor(competitor)}>Consulter / modifier</button><button className="manage-button" onClick={() => validateCompetitor(competitor.id)}>Valider</button><button className="delete-button" onClick={() => deleteCompetitor(competitor.id)}>Supprimer</button></td></tr>)}</tbody></table></div></div>}
    {view === "categories" && <CategoriesManager competition={competition} onUpdateCompetition={onUpdateCompetition} />}{view === "poules" && <PoolsManager competition={competition} onUpdateCompetition={onUpdateCompetition} />}{view === "arbitrage" && <ArbitrationManager competition={competition} onUpdateCompetition={onUpdateCompetition} />}{view === "results" && <ResultsManager competition={competition} />}
  </section>;
}
export function RegistrationForm({ form, onClubChange, onParticipantChange, onAddRows, onClearRows, onSubmit, submitLabel = "Enregistrer l’inscription" }) {
  return <form className="club-registration-form" onSubmit={onSubmit}>
    <section className="club-info-panel"><div className="form-title"><p className="surtitle">FORMULAIRE CLUB</p><h3>Inscription collective par club</h3><p>Renseignez le club une seule fois, puis ajoutez tous les participants dans le tableau.</p></div><div className="club-grid"><label>Nom du club *<input name="club" value={form.club} onChange={onClubChange} required /></label><label>Responsable du club *<input name="responsableClub" value={form.responsableClub} onChange={onClubChange} required /></label><label>Adresse e-mail du responsable *<input name="email" type="email" value={form.email} onChange={onClubChange} required /></label><label>Téléphone du responsable<input name="telephoneResponsable" value={form.telephoneResponsable} onChange={onClubChange} /></label></div></section>
    <div className="participants-table-wrap"><table className="participants-table"><thead><tr>{["Nom", "Prénom", "Sexe", "Date de naissance", "Grade", "Type d’inscription", "Combat", "Kata", "Arbitrage", "Observations"].map((label) => <th key={label}>{label}</th>)}</tr></thead><tbody>{form.participants.map((participant, index) => <tr key={index}><td data-label="Nom"><input value={participant.nom} onChange={(event) => onParticipantChange(index, "nom", event.target.value)} /></td><td data-label="Prénom"><input value={participant.prenom} onChange={(event) => onParticipantChange(index, "prenom", event.target.value)} /></td><td data-label="Sexe"><select value={participant.sexe} onChange={(event) => onParticipantChange(index, "sexe", event.target.value)}><option value="">Sexe</option><option>Féminin</option><option>Masculin</option><option>Non renseigné</option></select></td><td data-label="Date de naissance"><input type="date" value={participant.dateNaissance} onChange={(event) => onParticipantChange(index, "dateNaissance", event.target.value)} /></td><td data-label="Grade"><select value={participant.ceinture} onChange={(event) => onParticipantChange(index, "ceinture", event.target.value)}><option value="">Grade</option>{BELT_OPTIONS.map((belt) => <option key={belt}>{belt}</option>)}</select></td><td data-label="Type"><select value={participant.typeInscription} onChange={(event) => onParticipantChange(index, "typeInscription", event.target.value)}><option value="">Type</option><option>Compétiteur</option><option>Arbitre</option></select></td><td data-label="Combat"><select value={participant.combat} onChange={(event) => onParticipantChange(index, "combat", event.target.value)} disabled={participant.typeInscription === "Arbitre"}><option value="">Aucun</option>{COMBAT_OPTIONS.map((option) => <option key={option}>{option}</option>)}</select></td><td data-label="Kata"><select value={participant.kata} onChange={(event) => onParticipantChange(index, "kata", event.target.value)} disabled={participant.typeInscription === "Arbitre"}><option value="">Aucun</option>{KATA_OPTIONS.map((option) => <option key={option}>{option}</option>)}</select></td><td data-label="Arbitrage"><select value={participant.roleArbitre} onChange={(event) => onParticipantChange(index, "roleArbitre", event.target.value)} disabled={participant.typeInscription !== "Arbitre"}><option value="">Rôle</option>{REFEREE_OPTIONS.map((option) => <option key={option}>{option}</option>)}</select></td><td data-label="Observations"><textarea value={participant.observations} onChange={(event) => onParticipantChange(index, "observations", event.target.value)} /></td></tr>)}</tbody></table></div>
    <div className="registration-actions"><button className="manage-button" type="button" onClick={onAddRows}>Ajouter 5 lignes</button><button className="delete-button" type="button" onClick={onClearRows}>Effacer toutes les lignes</button><button className="primary" type="submit">{submitLabel}</button></div>
  </form>;
}
export default CompetitionDashboard;
