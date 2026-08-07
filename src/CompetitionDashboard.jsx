import { useMemo, useState } from "react";
import CategoriesManager from "./CategoriesManager";
import PoolsManager from "./PoolsManager";
import ArbitrationManager from "./ArbitrationManager";
import ResultsManager from "./ResultsManager";
import { ageBand, buildAutomaticCategories, calculateAge, DISCIPLINES, gradeBand } from "./competitionLogic";
import { competitionRulesEngine } from "./rules/competitionRulesEngine";
import { validateRegistrationForm } from "./registrationProcessing";

export const AGE_OPTIONS = Array.from({ length: 95 }, (_, index) => index + 5);
export const BELT_OPTIONS = ["6e Kyu", "5e Kyu", "4e Kyu", "3e Kyu", "2e Kyu", "1er Kyu", "1er Dan", "2e Dan", "3e Dan", "4e Dan", "5e Dan", "6e Dan"];
export const REGISTRATION_CATEGORIES = DISCIPLINES.map((discipline) => discipline.label);
export const REFEREE_FUNCTION_OPTIONS = ["Arbitre de table", "Fukushin", "Shushin"];
export const INITIAL_PARTICIPANT_ROW = { nom: "", prenom: "", sexe: "", dateNaissance: "", ceinture: "", typeInscription: "", discipline: [], fonctionArbitrage: [], observations: "" };
export const INITIAL_REGISTRATION_FORM = { club: "", email: "", responsableClub: "", telephoneResponsable: "", participants: Array.from({ length: 15 }, () => ({ ...INITIAL_PARTICIPANT_ROW })) };

export function competitionDiscipline(categoriesInscription = []) {
  const hasKata = categoriesInscription.some((category) => category.toLowerCase().startsWith("kata"));
  const hasCombat = categoriesInscription.some((category) => !category.toLowerCase().startsWith("kata"));
  if (hasKata && hasCombat) return "both";
  return hasKata ? "kata" : "combat";
}

export function isParticipantRowEmpty(row) {
  return Object.values(row).every((value) => Array.isArray(value) ? value.length === 0 : !String(value || "").trim());
}

export function categoriesFromParticipant(row) {
  if (row.typeInscription === "Arbitre") return [];
  if (Array.isArray(row.discipline)) return row.discipline.filter(Boolean);
  return row.discipline ? [row.discipline] : [];
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
    typeInscription: participant.typeInscription || "Compétiteur", roleArbitre: participant.typeInscription === "Arbitre" ? (Array.isArray(participant.fonctionArbitrage) ? participant.fonctionArbitrage.join(", ") : participant.fonctionArbitrage || "Arbitre") : "", fonctionArbitrage: participant.typeInscription === "Arbitre" ? (Array.isArray(participant.fonctionArbitrage) ? participant.fonctionArbitrage.filter(Boolean) : (participant.fonctionArbitrage ? [participant.fonctionArbitrage] : [])) : [], observations: participant.observations || "",
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
  function handleParticipantChange(index, field, value) { setForm((current) => ({ ...current, participants: current.participants.map((row, rowIndex) => {
    if (rowIndex !== index) return row;
    if (field === "typeInscription") return { ...row, typeInscription: value, discipline: Array.isArray(row.discipline) ? row.discipline : row.discipline ? [row.discipline] : [], fonctionArbitrage: value === "Arbitre" ? (Array.isArray(row.fonctionArbitrage) ? row.fonctionArbitrage : row.fonctionArbitrage ? [row.fonctionArbitrage] : []) : [] };
    return { ...row, [field]: value };
  }) })); }
  function clearParticipantRows() { if (window.confirm("Effacer toutes les lignes d’inscription ?")) setForm((current) => ({ ...current, participants: createEmptyParticipantRows(15) })); }
  function addParticipantRows(count = 5) { setForm((current) => ({ ...current, participants: [...current.participants, ...createEmptyParticipantRows(count)] })); }
  function resetForm() { setForm(INITIAL_REGISTRATION_FORM); setEditingId(null); setShowForm(false); }
  function saveCompetitor(event) {
    event.preventDefault();
    const validationError = validateRegistrationForm(form);
    if (validationError) return alert(validationError);
    const newCompetitors = form.participants.filter((row) => !isParticipantRowEmpty(row)).map((participant) => normalizeCompetitor({ ...form, participant }));
    onUpdateCompetition({ ...competition, competitors: editingId ? competitors.map((item) => item.id === editingId ? { ...newCompetitors[0], id: editingId } : item) : [...competitors, ...newCompetitors] });
    resetForm();
  }
  function editCompetitor(competitor) { setEditingId(competitor.id); setForm({ club: competitor.club || "", email: competitor.email || "", responsableClub: competitor.responsableClub || "", telephoneResponsable: competitor.telephoneResponsable || "", participants: [{ nom: competitor.nom || "", prenom: competitor.prenom || "", sexe: competitor.sexe || "", dateNaissance: competitor.dateNaissance || "", ceinture: competitor.ceinture || "", typeInscription: competitor.typeInscription || "Compétiteur", discipline: competitor.categoriesInscription || (competitor.categorieInscription ? [competitor.categorieInscription] : []), fonctionArbitrage: Array.isArray(competitor.fonctionArbitrage) ? competitor.fonctionArbitrage : (competitor.fonctionArbitrage || competitor.roleArbitre ? String(competitor.fonctionArbitrage || competitor.roleArbitre).split(",").map((value) => value.trim()).filter(Boolean) : []), observations: competitor.observations || "" }] }); setShowForm(true); }
  function deleteCompetitor(id) { if (window.confirm("Supprimer cette inscription ?")) onUpdateCompetition({ ...competition, competitors: competitors.filter((competitor) => competitor.id !== id) }); }
  function validateCompetitor(id) { onUpdateCompetition({ ...competition, competitors: competitors.map((competitor) => competitor.id === id ? { ...competitor, statutInscription: "Validée" } : competitor) }); }
  function closeRegistrations() { if (competitors.length === 0) return alert("Ajoutez au moins une inscription avant la clôture."); onUpdateCompetition({ ...competition, statut: "Catégories générées", categories: buildAutomaticCategories(competitors), pools: [] }); setView("categories"); }
  function exportCompetition() { const blob = new Blob([JSON.stringify(competition, null, 2)], { type: "application/json" }); const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = "nanbudo-competition.json"; document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url); }
  function sortBy(key) { setSort((current) => ({ key, direction: current.key === key && current.direction === "asc" ? "desc" : "asc" })); }
  const clubs = [...new Set(competitors.map((competitor) => competitor.club).filter(Boolean))];
  const referees = competitors.filter((competitor) => competitor.typeInscription === "Arbitre" && (competitor.fonctionArbitrage?.length || competitor.roleArbitre));
  const publicRegistrationUrl = `${window.location.origin}${import.meta.env.BASE_URL}?competition=${competition.publicToken || competition.id}`;

  return <section className="competition-dashboard">
    <button className="back-button" type="button" onClick={onBack}>← Retour aux compétitions</button>
    <div className="competition-dashboard-header"><div><p className="surtitle">CYCLE DE COMPÉTITION</p><h2>{competition.nom}</h2><p>{competition.lieu || "Lieu à définir"} · {competition.date || "Date à définir"}</p><p className="public-link">Lien clubs : <code>{publicRegistrationUrl}</code></p></div><span className="status">{competition.statut}</span></div>
    <nav className="competition-menu">{[["dashboard","Tableau de bord"],["competitors","Inscriptions"],["referees","Arbitres"],["categories","Catégories"],["poules","Poules / Tableau"],["arbitrage","Arbitrage"],["results","Résultats"]].map(([id,label]) => <button key={id} className={view === id ? "active" : ""} onClick={() => setView(id)}>{label}</button>)}</nav>
    {view === "dashboard" && <div className="competition-dashboard-content"><div className="dashboard"><div className="card"><span className="number">{competitors.length}</span><h3>Inscriptions</h3><p>Compétiteurs uniques enregistrés dans la base centrale.</p></div><div className="card"><span className="number">{competition.categories?.length || 0}</span><h3>Catégories</h3><p>Créées sans ressaisie depuis les catégories d’inscription.</p></div><div className="card"><span className="number">{matchCount}</span><h3>Matchs</h3><p>Générés depuis les mêmes fiches compétiteurs.</p></div></div><div className="beta-note"><strong>Moteur de règles CINDA 2025</strong><p>{competitionRulesEngine.ruleset.label} centralise les disciplines, catégories, pénalités et paramètres évolutifs. Les chapitres non encore structurés restent marqués comme ambiguïtés à traiter depuis le PDF officiel.</p></div><button className="primary" onClick={exportCompetition}>Exporter la compétition</button></div>}
    {view === "competitors" && <div className="competitors-module"><div className="manager-header"><div><p className="surtitle">TABLEAU DES INSCRITS</p><h2>Inscriptions</h2><p>{competitors.length} inscription{competitors.length > 1 ? "s" : ""} visible{competitors.length > 1 ? "s" : ""} en temps réel.</p></div><button className="primary" onClick={() => setShowForm((current) => !current)}>{showForm ? "Annuler" : "+ Inscrire"}</button></div>{showForm && <RegistrationForm form={form} onClubChange={handleClubChange} onParticipantChange={handleParticipantChange} onClearRows={clearParticipantRows} onAddRows={addParticipantRows} onSubmit={saveCompetitor} submitLabel={editingId ? "Enregistrer" : "Enregistrer l’inscription"} />}<button className="primary" type="button" onClick={closeRegistrations}>Créer les catégories</button><div className="filters"><input placeholder="Rechercher par nom" value={filters.search} onChange={(event) => setFilters({ ...filters, search: event.target.value })} /><select value={filters.club} onChange={(event) => setFilters({ ...filters, club: event.target.value })}><option value="">Tous les clubs</option>{clubs.map((club) => <option key={club} value={club}>{club}</option>)}</select><select value={filters.age} onChange={(event) => setFilters({ ...filters, age: event.target.value })}><option value="">Tous les âges</option>{AGE_OPTIONS.map((age) => <option key={age} value={age}>{age}</option>)}</select><select value={filters.ceinture} onChange={(event) => setFilters({ ...filters, ceinture: event.target.value })}><option value="">Toutes ceintures</option>{BELT_OPTIONS.map((belt) => <option key={belt} value={belt}>{belt}</option>)}</select><select value={filters.category} onChange={(event) => setFilters({ ...filters, category: event.target.value })}><option value="">Toutes catégories</option>{REGISTRATION_CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}</select></div><div className="registrations-table"><table><thead><tr>{[["nom","Nom"],["prenom","Prénom"],["age","Âge"],["ceinture","Ceinture"],["club","Club"],["email","Email"],["responsableClub","Responsable"],["categorieInscription","Catégories"],["statutInscription","Statut"]].map(([key,label]) => <th key={key}><button onClick={() => sortBy(key)}>{label}</button></th>)}<th>Actions</th></tr></thead><tbody>{filteredCompetitors.map((competitor) => <tr key={competitor.id}><td>{competitor.nom}</td><td>{competitor.prenom}</td><td>{competitor.age}</td><td>{competitor.ceinture}</td><td>{competitor.club}</td><td>{competitor.email}</td><td>{competitor.responsableClub}</td><td>{(competitor.categoriesInscription || [competitor.categorieInscription]).filter(Boolean).join(", ")}</td><td>{competitor.statutInscription || "À valider"}</td><td><button className="manage-button" onClick={() => editCompetitor(competitor)}>Consulter / modifier</button><button className="manage-button" onClick={() => validateCompetitor(competitor.id)}>Valider</button><button className="delete-button" onClick={() => deleteCompetitor(competitor.id)}>Supprimer</button></td></tr>)}</tbody></table></div></div>}
    {view === "referees" && <div className="competitors-module"><div className="manager-header"><div><p className="surtitle">LISTE AUTOMATIQUE</p><h2>Arbitres</h2><p>{referees.length} arbitre{referees.length > 1 ? "s" : ""} détecté{referees.length > 1 ? "s" : ""} automatiquement depuis les inscriptions.</p></div></div><div className="registrations-table"><table><thead><tr>{["Nom", "Prénom", "Club", "Sexe", "Date de naissance", "Grade", "Disciplines", "Fonctions d’arbitrage", "E-mail", "Téléphone"].map((label) => <th key={label}>{label}</th>)}</tr></thead><tbody>{referees.map((referee) => <tr key={referee.id}><td>{referee.nom}</td><td>{referee.prenom}</td><td>{referee.club}</td><td>{referee.sexe}</td><td>{referee.dateNaissance}</td><td>{referee.grade || referee.ceinture}</td><td>{(referee.categoriesInscription || []).join(", ") || "—"}</td><td>{(Array.isArray(referee.fonctionArbitrage) ? referee.fonctionArbitrage : String(referee.roleArbitre || "").split(",")).filter(Boolean).join(", ")}</td><td>{referee.email}</td><td>{referee.telephoneResponsable || "—"}</td></tr>)}</tbody></table></div></div>}
    {view === "categories" && <CategoriesManager competition={competition} onUpdateCompetition={onUpdateCompetition} />}{view === "poules" && <PoolsManager competition={competition} onUpdateCompetition={onUpdateCompetition} />}{view === "arbitrage" && <ArbitrationManager competition={competition} onUpdateCompetition={onUpdateCompetition} />}{view === "results" && <ResultsManager competition={competition} />}
  </section>;
}
function multiSelectValues(event) {
  return Array.from(event.target.selectedOptions, (option) => option.value).filter(Boolean);
}

export function RegistrationForm({ form, onClubChange, onParticipantChange, onClearRows, onAddRows, onSubmit, submitLabel = "Enregistrer l’inscription" }) {
  const rows = form.participants;

  return <form className="club-registration-form" onSubmit={onSubmit}>
    <section className="club-info-panel">
      <div className="form-title"><p className="surtitle">FORMULAIRE CLUB</p><h3>Inscription collective par club</h3><p>Renseignez le club une seule fois, puis ajoutez autant de lignes que nécessaire pour inscrire compétiteurs ou arbitres sans revenir en arrière.</p></div>
      <div className="club-grid"><label>Nom du club *<input name="club" value={form.club} onChange={onClubChange} required /></label><label>Responsable du club *<input name="responsableClub" value={form.responsableClub} onChange={onClubChange} required /></label><label>E-mail du responsable *<input name="email" type="email" value={form.email} onChange={onClubChange} required /></label><label>Téléphone<input name="telephoneResponsable" value={form.telephoneResponsable} onChange={onClubChange} /></label></div>
    </section>
    <section className="participants-section">
      <div className="form-title"><p className="surtitle">TABLEAU DES PARTICIPANTS</p><h3>{rows.length} lignes d’inscription</h3><p>Choisissez le type d’inscription : les champs compétiteur ou arbitre s’affichent automatiquement sur chaque ligne.</p></div>
      <div className="participants-table-wrap"><table className="participants-table"><thead><tr>{["#", "Nom", "Prénom", "Sexe", "Date de naissance", "Grade", "Type d’inscription", "Discipline", "Fonction d’arbitrage", "Observations"].map((label) => <th key={label}>{label}</th>)}</tr></thead><tbody>{rows.map((participant, index) => <tr key={index} className={participant.typeInscription === "Arbitre" ? "participant-referee" : ""}><td data-label="#" className="row-index">{index + 1}</td><td data-label="Nom"><input value={participant.nom} onChange={(event) => onParticipantChange(index, "nom", event.target.value)} /></td><td data-label="Prénom"><input value={participant.prenom} onChange={(event) => onParticipantChange(index, "prenom", event.target.value)} /></td><td data-label="Sexe"><select value={participant.sexe} onChange={(event) => onParticipantChange(index, "sexe", event.target.value)}><option value="">Sexe</option><option>Homme</option><option>Femme</option></select></td><td data-label="Date de naissance"><input type="date" value={participant.dateNaissance} onChange={(event) => onParticipantChange(index, "dateNaissance", event.target.value)} /></td><td data-label="Grade"><select value={participant.ceinture} onChange={(event) => onParticipantChange(index, "ceinture", event.target.value)}><option value="">Grade</option>{BELT_OPTIONS.map((belt) => <option key={belt}>{belt}</option>)}</select></td><td data-label="Type d’inscription"><select value={participant.typeInscription} onChange={(event) => onParticipantChange(index, "typeInscription", event.target.value)}><option value="">Type</option><option>Compétiteur</option><option>Arbitre</option></select></td><td data-label="Discipline"><select multiple value={Array.isArray(participant.discipline) ? participant.discipline : (participant.discipline ? [participant.discipline] : [])} onChange={(event) => onParticipantChange(index, "discipline", multiSelectValues(event))}>{REGISTRATION_CATEGORIES.map((option) => <option key={option}>{option}</option>)}</select></td><td data-label="Fonction d’arbitrage">{participant.typeInscription === "Arbitre" ? <select multiple value={Array.isArray(participant.fonctionArbitrage) ? participant.fonctionArbitrage : (participant.fonctionArbitrage ? [participant.fonctionArbitrage] : [])} onChange={(event) => onParticipantChange(index, "fonctionArbitrage", multiSelectValues(event))}>{REFEREE_FUNCTION_OPTIONS.map((option) => <option key={option}>{option}</option>)}</select> : <span className="cell-placeholder">—</span>}</td><td data-label="Observations"><textarea value={participant.observations} onChange={(event) => onParticipantChange(index, "observations", event.target.value)} /></td></tr>)}</tbody></table></div>
    </section>
    <div className="registration-actions"><button className="manage-button" type="button" onClick={() => onAddRows?.(5)}>➕ Rajouter 5 lignes</button><button className="delete-button" type="button" onClick={onClearRows}>Effacer les lignes</button><button className="primary" type="submit">{submitLabel}</button></div>
  </form>;
}
export default CompetitionDashboard;
