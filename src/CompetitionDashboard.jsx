import { useEffect, useMemo, useRef, useState } from "react";
import CategoriesManager from "./CategoriesManager";
import ClubExcelImport from "./ClubExcelImport";
import PoolsManager from "./PoolsManager";
import ArbitrationManager from "./ArbitrationManager";
import ResultsManager from "./ResultsManager";
import PlanningManager from "./PlanningManager";
import TeamEventsManager from "./TeamEventsManager";
import RefereeManager from "./RefereeManager";
import StatisticsManager from "./StatisticsManager";
import { ageBand, buildAutomaticCategories, calculateAge, DISCIPLINES, gradeBand } from "./competitionLogic";
import { categoryFromBirthYear, registrationDisciplinesForCategory } from "./categoryRules";
import { competitionRulesEngine } from "./rules/competitionRulesEngine";
import { validateRegistrationForm } from "./registrationProcessing";
import { exportRegistrationsCsv, exportRegistrationsPdf } from "./registrationExports";
import { DEMO_COMPETITION_MARKER, TEST_COMPETITION_2_NAME, simulateCompleteTestCompetition } from "./demoCompetitionData";
import { publicRegistrationUrl } from "./routing";
export { REGISTRATION_EXPORT_COLUMNS } from "./registrationExports";

export const AGE_OPTIONS = Array.from({ length: 95 }, (_, index) => index + 5);
export const BELT_OPTIONS = ["6e Kyu", "6e Kyu Han", "5e Kyu", "5e Kyu Han", "4e Kyu", "4e Kyu Han", "3e Kyu", "3e Kyu Han", "2e Kyu", "2e Kyu Han", "1er Kyu", "1er Kyu Han", "1er Dan", "2e Dan", "3e Dan", "4e Dan", "5e Dan", "6e Dan"];
export const REGISTRATION_CATEGORIES = DISCIPLINES.map((discipline) => discipline.label);
export const REFEREE_FUNCTION_OPTIONS = ["Arbitre de table", "Fukushin", "Shushin"];
export const COMBAT_TYPE_OPTIONS = ["Randori", "Ju-Randori 1", "Ju-Randori 2"];
export const REGISTRATION_TYPE_OPTIONS = ["Compétiteur", "Arbitre", "Compétiteur + Arbitre"];
export const INITIAL_PARTICIPANT_ROW = { nom: "", prenom: "", sexe: "", dateNaissance: "", ceinture: "", niveauKata: "", poids: "", typeCombat: "", typeInscription: "", discipline: [], fonctionArbitrage: [], kataEquipe: false, juRandoriEquipe: false, juRandoriOpen: false, observations: "" };
export const INITIAL_REGISTRATION_FORM = { club: "", ville: "", responsableClub: "", email: "", telephoneResponsable: "", participants: Array.from({ length: 15 }, () => ({ ...INITIAL_PARTICIPANT_ROW })) };

export function competitionDiscipline(categoriesInscription = []) {
  const hasKata = categoriesInscription.some((category) => category.toLowerCase().startsWith("kata"));
  const hasCombat = categoriesInscription.some((category) => !category.toLowerCase().startsWith("kata"));
  if (hasKata && hasCombat) return "both";
  return hasKata ? "kata" : "combat";
}

export function isParticipantRowEmpty(row) {
  return Object.values(row).every((value) => Array.isArray(value) ? value.length === 0 : typeof value === "boolean" ? !value : !String(value || "").trim());
}

export function hasCompetitorRole(typeInscription) {
  return typeInscription === "Compétiteur" || typeInscription === "Compétiteur + Arbitre";
}

export function hasRefereeRole(typeInscription) {
  return typeInscription === "Arbitre" || typeInscription === "Compétiteur + Arbitre";
}

export function normalizeParticipantTypeChange(row, typeInscription) {
  return {
    ...row,
    typeInscription,
    discipline: hasCompetitorRole(typeInscription) ? (Array.isArray(row.discipline) ? row.discipline : row.discipline ? [row.discipline] : []) : [],
    fonctionArbitrage: hasRefereeRole(typeInscription) ? (Array.isArray(row.fonctionArbitrage) ? row.fonctionArbitrage : row.fonctionArbitrage ? [row.fonctionArbitrage] : []) : [],
    kataEquipe: hasCompetitorRole(typeInscription) && Boolean(row.kataEquipe),
    juRandoriEquipe: hasCompetitorRole(typeInscription) && Boolean(row.juRandoriEquipe),
    juRandoriOpen: hasCompetitorRole(typeInscription) && Boolean(row.juRandoriOpen),
  };
}

export function categoriesFromParticipant(row) {
  if (!hasCompetitorRole(row.typeInscription)) return [];
  const ageGroup = categoryFromBirthYear(row.dateNaissance);
  const allowed = registrationDisciplinesForCategory(ageGroup);
  if (allowed.length) return allowed.map((item) => /^Kata\s*[0-3]$/i.test(item) && row.niveauKata ? row.niveauKata : /randori/i.test(item) && row.typeCombat ? row.typeCombat : item);
  if (Array.isArray(row.discipline)) return row.discipline.filter(Boolean);
  return row.discipline ? [row.discipline] : [];
}

export function normalizeCompetitor(form, existingId) {
  const participant = form.participant || form;
  const categoriesInscription = participant.categoriesInscription || categoriesFromParticipant(participant);
  const age = participant.age || calculateAge(participant.dateNaissance);
  return {
    id: existingId || Date.now() + Math.floor(Math.random() * 100000),
    nom: participant.nom.trim().toUpperCase(), prenom: participant.prenom.trim(), age: Number(age), ageGroup: categoryFromBirthYear(participant.dateNaissance, age),
    ceinture: participant.ceinture, niveauKata: participant.niveauKata || "", typeCombat: participant.typeCombat || "", poids: participant.poids === "" || participant.poids == null ? null : Number(String(participant.poids).replace(",", ".")), grade: participant.ceinture, club: form.club.trim(), ville: form.ville.trim(), email: form.email.trim(),
    responsableClub: form.responsableClub.trim(), telephoneResponsable: form.telephoneResponsable?.trim() || "",
    categoriesInscription, categorieInscription: categoriesInscription.join(", "), discipline: categoriesInscription.length ? competitionDiscipline(categoriesInscription) : "arbitrage",
    sexe: participant.sexe || "Non renseigné", dateNaissance: participant.dateNaissance || "", ligue: "", pays: "",
    typeInscription: participant.typeInscription || "Compétiteur", roleArbitre: hasRefereeRole(participant.typeInscription) ? (Array.isArray(participant.fonctionArbitrage) ? participant.fonctionArbitrage.join(", ") : participant.fonctionArbitrage || "Arbitre") : "", fonctionArbitrage: hasRefereeRole(participant.typeInscription) ? (Array.isArray(participant.fonctionArbitrage) ? participant.fonctionArbitrage.filter(Boolean) : (participant.fonctionArbitrage ? [participant.fonctionArbitrage] : [])) : [], kataEquipe: Boolean(participant.kataEquipe), juRandoriEquipe: Boolean(participant.juRandoriEquipe), juRandoriOpen: Boolean(participant.juRandoriOpen), observations: participant.observations || "",
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
    if (field === "typeInscription") return normalizeParticipantTypeChange(row, value);
    return { ...row, [field]: value };
  }) })); }
  function clearParticipantRows() { if (window.confirm("Effacer toutes les lignes d’inscription ?")) setForm((current) => ({ ...current, participants: createEmptyParticipantRows(15) })); }
  function addParticipantRows(count = 5) { setForm((current) => ({ ...current, participants: [...current.participants, ...createEmptyParticipantRows(count)] })); }
  function resetForm() { setForm(INITIAL_REGISTRATION_FORM); setEditingId(null); setShowForm(false); }
  function syncCategoriesForRegistrations(nextCompetitors) {
    const existingCategories = competition.categories || [];
    if (!existingCategories.length) return existingCategories;
    const generated = buildAutomaticCategories(nextCompetitors);
    const nextCategories = existingCategories.map((category) => ({ ...category, competitorIds: [...(category.competitorIds || [])] }));
    const assigned = new Set(nextCategories.flatMap((category) => category.competitorIds.map(String)));
    const byId = new Map(nextCompetitors.map((competitor) => [String(competitor.id), competitor]));
    for (const generatedCategory of generated) {
      for (const id of generatedCategory.competitorIds) {
        if (assigned.has(String(id))) continue;
        const target = nextCategories.find((category) =>
          !category.manual &&
          category.discipline === generatedCategory.discipline &&
          category.ageGroup === generatedCategory.ageGroup &&
          category.sexe === generatedCategory.sexe &&
          (category.gradeGroup || "") === (generatedCategory.gradeGroup || "") &&
          (category.kataGroup || "") === (generatedCategory.kataGroup || "")
        );
        if (target) {
          target.competitorIds.push(id);
        } else {
          nextCategories.push({ ...generatedCategory, id: `${generatedCategory.id}-added-${id}`, competitorIds: [id] });
        }
        assigned.add(String(id));
      }
    }
    return nextCategories.map((category) => ({
      ...category,
      competitorIds: category.competitorIds.filter((id) => byId.has(String(id))),
    })).filter((category) => category.competitorIds.length > 0);
  }
  function saveCompetitor(event) {
    event.preventDefault();
    const validationError = validateRegistrationForm(form);
    if (validationError) return alert(validationError);
    const newCompetitors = form.participants.filter((row) => !isParticipantRowEmpty(row)).map((participant) => normalizeCompetitor({ ...form, participant }));
    const updatedCompetitors = editingId ? competitors.map((item) => item.id === editingId ? { ...newCompetitors[0], id: editingId } : item) : [...competitors, ...newCompetitors];
    onUpdateCompetition({ ...competition, competitors: updatedCompetitors, categories: syncCategoriesForRegistrations(updatedCompetitors) });
    resetForm();
  }
  function editCompetitor(competitor) { setEditingId(competitor.id); setForm({ club: competitor.club || "", ville: competitor.ville || "", responsableClub: competitor.responsableClub || "", email: competitor.email || "", telephoneResponsable: competitor.telephoneResponsable || "", participants: [{ nom: competitor.nom || "", prenom: competitor.prenom || "", sexe: competitor.sexe || "", dateNaissance: competitor.dateNaissance || "", ceinture: competitor.ceinture || "", niveauKata: competitor.niveauKata || "", typeCombat: competitor.typeCombat || "", poids: competitor.poids ?? "", typeInscription: competitor.typeInscription || "Compétiteur", discipline: competitor.categoriesInscription || (competitor.categorieInscription ? [competitor.categorieInscription] : []), fonctionArbitrage: Array.isArray(competitor.fonctionArbitrage) ? competitor.fonctionArbitrage : (competitor.fonctionArbitrage || competitor.roleArbitre ? String(competitor.fonctionArbitrage || competitor.roleArbitre).split(",").map((value) => value.trim()).filter(Boolean) : []), kataEquipe: Boolean(competitor.kataEquipe), juRandoriEquipe: Boolean(competitor.juRandoriEquipe), juRandoriOpen: Boolean(competitor.juRandoriOpen), observations: competitor.observations || "" }] }); setShowForm(true); }
  function deleteCompetitor(id) { if (window.confirm("Supprimer cette inscription ?")) onUpdateCompetition({ ...competition, competitors: competitors.filter((competitor) => competitor.id !== id) }); }
  function validateCompetitor(id) { onUpdateCompetition({ ...competition, competitors: competitors.map((competitor) => competitor.id === id ? { ...competitor, statutInscription: "Validée" } : competitor) }); }
  function closeRegistrations() { if (competitors.length === 0) return alert("Ajoutez au moins une inscription avant la clôture."); const preservedWorldCategories = competition.categoryMode === "world_championship_2026" && Array.isArray(competition.categories) && competition.categories.length > 0; onUpdateCompetition({ ...competition, statut: "Catégories générées", categories: preservedWorldCategories ? competition.categories : buildAutomaticCategories(competitors), pools: [] }); setView("categories"); }
  function exportCompetition() { const blob = new Blob([JSON.stringify(competition, null, 2)], { type: "application/json" }); const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = "nanbudo-competition.json"; document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url); }
  function simulateDemoResults() {
    if (!window.confirm("Simuler tous les résultats ? Cette opération remplacera les résultats existants de cette compétition de test.")) return;
    try {
      const simulated = simulateCompleteTestCompetition({ ...competition, demoMarker: DEMO_COMPETITION_MARKER });
      const completed = (simulated.pools || []).flatMap((pool) => pool.matches || []).filter((match) => match.statut === "Terminé").length;
      if (!completed) {
        window.alert("Aucun match simulé : vérifie que les poules et les matchs ont été générés.");
        return;
      }
      onUpdateCompetition(simulated);
      window.alert(`Simulation effectuée : ${completed} passages terminés. Vérifie les poules et les résultats.`);
    } catch (error) {
      console.error("Simulation impossible", error);
      window.alert(`Erreur pendant la simulation : ${error?.message || "erreur inconnue"}`);
    }
  }
  function sortBy(key) { setSort((current) => ({ key, direction: current.key === key && current.direction === "asc" ? "desc" : "asc" })); }
  const clubs = [...new Set(competitors.map((competitor) => competitor.club).filter(Boolean))];
  const referees = competitors.filter((competitor) => hasRefereeRole(competitor.typeInscription) && (competitor.fonctionArbitrage?.length || competitor.roleArbitre));
  const clubRegistrationUrl = publicRegistrationUrl(window.location.origin, import.meta.env.BASE_URL, competition.slug);
  const registrationsOpen = competition.statut === "Inscriptions ouvertes";
  function toggleRegistrations() { onUpdateCompetition({ ...competition, statut: registrationsOpen ? "Inscriptions fermées" : "Inscriptions ouvertes" }); }

  return <section className="competition-dashboard">
    <button className="back-button" type="button" onClick={onBack}>← Retour aux compétitions</button>
    <div className="competition-dashboard-header"><div className="competition-identity"><p className="surtitle">CYCLE DE COMPÉTITION</p><h2>{competition.nom}</h2><p className="competition-meta">▣ {competition.lieu || "Lieu à définir"} · {competition.date || "Date à définir"}</p><p className="public-link">↗ Lien clubs : <a href={clubRegistrationUrl}><code>{clubRegistrationUrl}</code></a></p><p className="registration-state">▣ <strong>{registrationsOpen ? "Inscriptions ouvertes" : "Inscriptions fermées"}</strong></p><div className="dashboard-actions"><button className="manage-button" type="button" onClick={toggleRegistrations}>{registrationsOpen ? "Fermer les inscriptions" : "Ouvrir les inscriptions"}</button>{(competition.demoMarker === DEMO_COMPETITION_MARKER || (competition.isDemoCompetition && competition.nom === TEST_COMPETITION_2_NAME)) && <button className="primary" type="button" onClick={simulateDemoResults}>▶ Simuler tous les résultats</button>}</div></div><span className="status">▥ {competition.statut}</span></div>
    <nav className="competition-menu">{[["dashboard","▦","Tableau de bord"],["competitors","◎","Inscriptions"],["referees","⚑","Arbitres"],["categories","≡","Catégories"],["poules","◉","Poules"],["planning","▣","Planning"],["arbitrage","◇","Arbitrage"],["results","✓","Résultats"],["teams","♧","Équipes"],["statistics","◔","Statistiques"]].map(([id,icon,label]) => <button key={id} className={view === id ? "active" : ""} onClick={() => setView(id)}><span aria-hidden="true">{icon}</span>{label}</button>)}</nav>
    {view === "competitors" && <ClubExcelImport competition={competition} onUpdateCompetition={onUpdateCompetition} />}
    {view === "dashboard" && <div className="competition-dashboard-content"><div className="dashboard"><div className="card dashboard-kpi"><span className="kpi-icon" aria-hidden="true">♟</span><div><span className="number">{competitors.length}</span><h3>Inscriptions</h3><p>Compétiteurs uniques enregistrés dans la base centrale.</p></div></div><div className="card dashboard-kpi"><span className="kpi-icon" aria-hidden="true">♛</span><div><span className="number">{competition.categories?.length || 0}</span><h3>Catégories</h3><p>Créées sans ressaisie depuis les catégories d’inscription.</p></div></div><div className="card dashboard-kpi"><span className="kpi-icon" aria-hidden="true">▤</span><div><span className="number">{matchCount}</span><h3>Matchs</h3><p>Générés depuis les mêmes fiches compétiteurs.</p></div></div></div><div className="beta-note"><strong>Moteur de règles CINDA 2025</strong><p>{competitionRulesEngine.ruleset.label} centralise les disciplines, catégories, pénalités et paramètres évolutifs. Les chapitres non encore structurés restent marqués comme ambiguïtés à traiter depuis le PDF officiel.</p></div><button className="primary" onClick={exportCompetition}>Exporter la compétition</button></div>}
    {view === "competitors" && <div className="competitors-module"><div className="manager-header"><div><p className="surtitle">TABLEAU DES INSCRITS</p><h2>Inscriptions</h2><p>{competitors.length} inscription{competitors.length > 1 ? "s" : ""} visible{competitors.length > 1 ? "s" : ""} en temps réel.</p></div><button className="primary" onClick={() => setShowForm((current) => !current)}>{showForm ? "Annuler" : "+ Inscrire"}</button></div>{showForm && <RegistrationForm form={form} onClubChange={handleClubChange} onParticipantChange={handleParticipantChange} onClearRows={clearParticipantRows} onAddRows={addParticipantRows} onSubmit={saveCompetitor} submitLabel={editingId ? "Enregistrer" : "Enregistrer l’inscription"} />}<div className="registration-actions"><button className="primary" type="button" onClick={closeRegistrations}>Créer les catégories</button><button type="button" onClick={() => exportRegistrationsCsv(competition)}>Exporter CSV</button><button type="button" onClick={() => exportRegistrationsPdf(competition)}>Exporter PDF</button></div><div className="filters"><input placeholder="Rechercher par nom" value={filters.search} onChange={(event) => setFilters({ ...filters, search: event.target.value })} /><select value={filters.club} onChange={(event) => setFilters({ ...filters, club: event.target.value })}><option value="">Tous les clubs</option>{clubs.map((club) => <option key={club} value={club}>{club}</option>)}</select><select value={filters.age} onChange={(event) => setFilters({ ...filters, age: event.target.value })}><option value="">Tous les âges</option>{AGE_OPTIONS.map((age) => <option key={age} value={age}>{age}</option>)}</select><select value={filters.ceinture} onChange={(event) => setFilters({ ...filters, ceinture: event.target.value })}><option value="">Toutes ceintures</option>{BELT_OPTIONS.map((belt) => <option key={belt} value={belt}>{belt}</option>)}</select><select value={filters.category} onChange={(event) => setFilters({ ...filters, category: event.target.value })}><option value="">Toutes catégories</option>{REGISTRATION_CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}</select></div><div className="registrations-table"><table><thead><tr>{[["nom","Nom"],["prenom","Prénom"],["age","Âge"],["ageGroup","Catégorie"],["ceinture","Ceinture"],["club","Club"],["ville","Ville"],["email","Email"],["responsableClub","Responsable"],["categorieInscription","Catégories"],["statutInscription","Statut"]].map(([key,label]) => <th key={key}><button onClick={() => sortBy(key)}>{label}</button></th>)}<th>Actions</th></tr></thead><tbody>{filteredCompetitors.map((competitor) => <tr key={competitor.id}><td>{competitor.nom}</td><td>{competitor.prenom}</td><td>{competitor.age}</td><td>{competitor.ageGroup || categoryFromBirthYear(competitor.dateNaissance, competitor.age)}</td><td>{competitor.ceinture}</td><td>{competitor.club}</td><td>{competitor.ville}</td><td>{competitor.email}</td><td>{competitor.responsableClub}</td><td>{(competitor.categoriesInscription || [competitor.categorieInscription]).filter(Boolean).join(", ")}</td><td>{competitor.statutInscription || "À valider"}</td><td><button className="manage-button" onClick={() => editCompetitor(competitor)}>Consulter / modifier</button><button className="manage-button" onClick={() => validateCompetitor(competitor.id)}>Valider</button><button className="delete-button" onClick={() => deleteCompetitor(competitor.id)}>Supprimer</button></td></tr>)}</tbody></table></div></div>}
    {view === "teams" && <TeamEventsManager competition={competition} onUpdateCompetition={onUpdateCompetition} />}
    {view === "referees" && <RefereeManager competition={competition} referees={referees} onUpdateCompetition={onUpdateCompetition} />}
    {view === "planning" && <PlanningManager competition={competition} onUpdateCompetition={onUpdateCompetition} />}{view === "categories" && <CategoriesManager competition={competition} onUpdateCompetition={onUpdateCompetition} />}{view === "poules" && <PoolsManager competition={competition} onUpdateCompetition={onUpdateCompetition} />}{view === "arbitrage" && <ArbitrationManager competition={competition} onUpdateCompetition={onUpdateCompetition} />}{view === "results" && <ResultsManager competition={competition} />}{view === "statistics" && <StatisticsManager competition={competition} />}
  </section>;
}
function multiSelectValues(event) {
  return Array.from(event.target.selectedOptions, (option) => option.value).filter(Boolean);
}

export function FrenchBirthDateInput({ value, onChange }) {
  const format = (iso) => /^\d{4}-\d{2}-\d{2}$/.test(iso || "") ? iso.slice(8,10) + "/" + iso.slice(5,7) + "/" + iso.slice(0,4) : (iso || "");
  const [draft, setDraft] = useState(format(value));
  useEffect(() => setDraft(format(value)), [value]);
  function commit() {
    const match = draft.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (!match) { setDraft(format(value)); return; }
    const iso = match[3] + "-" + match[2].padStart(2,"0") + "-" + match[1].padStart(2,"0");
    const date = new Date(iso + "T12:00:00");
    if (Number.isNaN(date.getTime()) || date.toISOString().slice(0,10) !== iso) { setDraft(format(value)); return; }
    onChange(iso);
    setDraft(format(iso));
  }
  return <input type="text" inputMode="numeric" aria-label="Date de naissance (JJ/MM/AAAA)" placeholder="JJ/MM/AAAA" style={{width:135,minWidth:135,boxSizing:"border-box"}} value={draft} onChange={event => setDraft(event.target.value)} onBlur={commit} />;
}

export function RegistrationForm({ form, onClubChange, onParticipantChange, onClearRows, onAddRows, onSubmit, submitLabel = "Enregistrer l’inscription" }) {
  const rows = form.participants;
  const participantsTableRef = useRef(null);
  const scrollParticipants = (direction) => participantsTableRef.current?.scrollBy({ left: direction * Math.max(320, participantsTableRef.current.clientWidth * 0.75), behavior: "smooth" });

  return <form className="club-registration-form" onSubmit={onSubmit} noValidate>
    <section className="club-info-panel">
      <div className="form-title"><p className="surtitle">FORMULAIRE CLUB</p><h3>Inscription collective par club</h3><p>Renseignez le club une seule fois, puis ajoutez autant de lignes que nécessaire pour inscrire compétiteurs ou arbitres sans revenir en arrière.</p></div>
      <div className="club-grid"><label>Nom du club *<input name="club" value={form.club} onChange={onClubChange} required /></label><label>Ville *<input name="ville" value={form.ville} onChange={onClubChange} required /></label><label>Responsable du club *<input name="responsableClub" value={form.responsableClub} onChange={onClubChange} required /></label><label>E-mail du responsable *<input name="email" type="email" value={form.email} onChange={onClubChange} required /></label><label>Téléphone<input name="telephoneResponsable" value={form.telephoneResponsable} onChange={onClubChange} /></label></div>
    </section>
    <section className="participants-section">
      <div className="form-title"><p className="surtitle">TABLEAU DES PARTICIPANTS</p><h3>{rows.length} lignes d’inscription</h3><p>Choisissez le type d’inscription : les champs compétiteur ou arbitre s’affichent automatiquement sur chaque ligne.</p></div>
      <div className="participants-scroll-controls"><button type="button" onClick={() => scrollParticipants(-1)}>← Colonnes précédentes</button><span>Faites glisser le tableau ou utilisez les flèches</span><button type="button" onClick={() => scrollParticipants(1)}>Colonnes suivantes →</button></div><div className="participants-table-wrap" ref={participantsTableRef}><table className="participants-table" style={{width:"max-content",minWidth:"100%",tableLayout:"auto"}}><thead><tr>{["#", "Nom", "Prénom", "Sexe", "Date de naissance", "Catégorie", "Type d’inscription", "Grade", "Niveau Kata", "Poids (kg)", "Type de combat", "Discipline", "Fonction d’arbitrage", "Kata Équipe", "Ju-Randori Équipe", "Ju-Randori Open", "Observations"].map((label) => <th key={label}>{label}</th>)}</tr></thead><tbody>{rows.map((participant, index) => <tr key={index} className={participant.typeInscription === "Arbitre" ? "participant-referee" : ""}><td data-label="#" className="row-index">{index + 1}</td><td data-label="Nom" style={{minWidth:170}}><input style={{width:160,minWidth:160,boxSizing:"border-box"}} value={participant.nom} onChange={(event) => onParticipantChange(index, "nom", event.target.value)} /></td><td data-label="Prénom" style={{minWidth:170}}><input style={{width:160,minWidth:160,boxSizing:"border-box"}} value={participant.prenom} onChange={(event) => onParticipantChange(index, "prenom", event.target.value)} /></td><td data-label="Sexe"><select value={participant.sexe} onChange={(event) => onParticipantChange(index, "sexe", event.target.value)}><option value="">—</option><option value="Homme">H</option><option value="Femme">F</option></select></td><td data-label="Date de naissance"><FrenchBirthDateInput value={participant.dateNaissance} onChange={(value) => onParticipantChange(index, "dateNaissance", value)} /></td><td data-label="Catégorie"><strong>{participant.dateNaissance ? categoryFromBirthYear(participant.dateNaissance) : "—"}</strong></td><td data-label="Type d’inscription"><select value={participant.typeInscription} onChange={(event) => onParticipantChange(index, "typeInscription", event.target.value)}><option value="">Type</option>{REGISTRATION_TYPE_OPTIONS.map((option) => <option key={option}>{option}</option>)}</select></td><td data-label="Grade"><select value={participant.ceinture} onChange={(event) => onParticipantChange(index, "ceinture", event.target.value)}><option value="">Grade</option>{BELT_OPTIONS.map((belt) => <option key={belt}>{belt}</option>)}</select></td><td data-label="Niveau Kata"><select value={participant.niveauKata || ""} onChange={(event) => onParticipantChange(index, "niveauKata", event.target.value)}><option value="">Kata</option>{["Kata 0", "Kata 1", "Kata 2", "Kata 3"].map((niveau) => <option key={niveau} value={niveau}>{niveau}</option>)}</select></td><td data-label="Poids (kg)"><input type="number" min="1" max="500" step="0.1" placeholder="kg" value={participant.poids ?? ""} onChange={(event) => onParticipantChange(index, "poids", event.target.value)} /></td><td data-label="Type de combat" style={{minWidth:180}}><select style={{minWidth:165,width:"100%"}} aria-label="Type de combat" value={participant.typeCombat || ""} disabled={!hasCompetitorRole(participant.typeInscription)} onChange={(event) => onParticipantChange(index, "typeCombat", event.target.value)}><option value="">Choisir combat</option>{COMBAT_TYPE_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}</select></td><td data-label="Discipline">{hasCompetitorRole(participant.typeInscription) ? (participant.dateNaissance ? <strong>{categoriesFromParticipant(participant).join(" + ") || "À vérifier"}</strong> : <span className="cell-placeholder">Saisir la date</span>) : <span className="cell-placeholder">—</span>}</td><td data-label="Fonction d’arbitrage">{hasRefereeRole(participant.typeInscription) ? <select multiple required value={Array.isArray(participant.fonctionArbitrage) ? participant.fonctionArbitrage : (participant.fonctionArbitrage ? [participant.fonctionArbitrage] : [])} onChange={(event) => onParticipantChange(index, "fonctionArbitrage", multiSelectValues(event))}>{REFEREE_FUNCTION_OPTIONS.map((option) => <option key={option}>{option}</option>)}</select> : <span className="cell-placeholder">—</span>}</td>{[["kataEquipe", "Kata Équipe"], ["juRandoriEquipe", "Ju-Randori Équipe"], ["juRandoriOpen", "Ju-Randori Open"]].map(([field, label]) => <td key={field} data-label={label}><input type="checkbox" aria-label={`${label} — ${participant.prenom} ${participant.nom}`} checked={Boolean(participant[field])} disabled={!hasCompetitorRole(participant.typeInscription)} onChange={(event) => onParticipantChange(index, field, event.target.checked)} /></td>)}<td data-label="Observations" style={{minWidth:160,width:160}}><textarea aria-label="Observations" placeholder="Observations" style={{minWidth:145,width:145,minHeight:64,boxSizing:"border-box"}} value={participant.observations} onChange={(event) => onParticipantChange(index, "observations", event.target.value)} /></td></tr>)}</tbody></table></div>
    </section>
    <div className="registration-actions"><button className="manage-button" type="button" onClick={() => onAddRows?.(5)}>➕ Rajouter 5 lignes</button><button className="delete-button" type="button" onClick={onClearRows}>Effacer les lignes</button><button className="primary" type="submit">{submitLabel}</button></div>
  </form>;
}
export default CompetitionDashboard;
