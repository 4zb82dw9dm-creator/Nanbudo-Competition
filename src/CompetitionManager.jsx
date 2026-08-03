import { Component, useEffect, useRef, useState } from "react";
import MatchManager from "./MatchManager";
import { COMPETITIONS_STORAGE_KEY } from "./backupUtils";
import { buildRankings, canShowRankings, generateTournament, normalizeCompetitionData, parseCompetitorFile, recordMatchResult } from "./competitionWorkflow";
import { buildCompetitionTestCompetitors } from "./competitionTestCompetitors";

const STORAGE_KEY = COMPETITIONS_STORAGE_KEY;
const ACTIVE_SHEET_KEY = "nanbudo-active-score-sheet";
const STRUCTURE_WARNING = "Attention.\n\nVous allez modifier des données qui peuvent rendre les tableaux actuels incohérents.\n\nSi vous continuez, les tableaux devront être régénérés et tous les résultats déjà saisis seront perdus.\n\nSouhaitez-vous continuer ?";
const UNSAVED_MATCH_MESSAGE = "Le combat en cours n'a pas encore été validé.\n\nQue souhaitez-vous faire ?";
const WIZARD_FILE = "src/CompetitionManager.jsx";

const CATEGORIES = ["Enfant", "Benjamin", "Minime", "Junior", "Senior", "Vétéran"];
const GRADES = ["Blanche", "Jaune", "Orange", "Verte", "Bleue", "Marron", "Noire"];
const SEXES = ["Fille", "Garçon", "Femme", "Homme"];

const DEFAULT_SETTINGS = {
  categoriesOuvertes: [...CATEGORIES],
  gradesAutorises: [...GRADES],
  poids: "Catégories officielles Nanbudo",
  sexe: "Fille, Garçon, Femme, Homme",
  mixteAutorise: false,
  tempsCombats: "2:00",
  tempsProlongations: "1:00",
  nombreArbitres: 3,
};

const EMPTY_COMPETITION = {
  nom: "",
  type: "Coupe régionale",
  date: "",
  lieu: "",
  adresse: "",
  ville: "",
  departement: "",
  pays: "France",
  organisateur: "",
  directeurCompetition: "",
  responsableArbitrage: "",
  medecin: "",
  nombreTatamis: 1,
  description: "",
  logo: "",
  statut: "Brouillon",
  status: "draft",
  registrationOpen: true,
  inscriptionsOuvertes: true,
};

const EMPTY_PARTICIPANT = {
  nom: "",
  prenom: "",
  licence: "",
  club: "",
  categorie: "Senior",
  poids: "",
  grade: "Blanche",
  sexe: "Homme",
  dateNaissance: "",
  certificatMedical: false,
  autorisationParentale: false,
};

/** Service centralisant les accès de persistance pour faciliter une migration Firebase ou Supabase. */
export const CompetitionStore = {
  /** Charge les compétitions depuis le stockage local avec une structure défensive. */
  load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw).map(CompetitionService.normalizeCompetition) : [];
    } catch {
      return [];
    }
  },
  /** Sauvegarde automatiquement toutes les compétitions dans le stockage local. */
  save(competitions) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(competitions));
    window.dispatchEvent(new Event("nanbudo-competitions-changed"));
  },
};

/** Service métier chargé de créer, normaliser, cloner et exporter les compétitions. */
export const CompetitionService = {
  /** Génère un identifiant stable et lisible pour les objets créés côté client. */
  createId(prefix = "item") {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  },
  /** Construit une compétition complète à partir des champs du formulaire. */
  createCompetition(values) {
    return this.normalizeCompetition({
      ...values,
      id: this.createId("competition"),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      participants: [],
      competitors: [],
      clubs: [],
      categories: [],
      errors: [],
      status: "open",
      registrationOpen: true,
      inscriptionsOuvertes: true,
      futureModules: { tirage: null, tableaux: [], notation: null, chronometre: null, classements: [], affichagePublic: null },
    });
  },
  /** Garantit la présence des modèles nécessaires aux modules futurs sans casser les anciennes données. */
  normalizeCompetition(competition) {
    const registrationOpen =
      competition.registrationOpen === true ||
      competition.status === "open" ||
      competition.statut === "Inscriptions ouvertes" ||
      competition.inscriptionsOuvertes === true;
    const normalized = normalizeCompetitionData({
      ...EMPTY_COMPETITION,
      ...competition,
      settings: { ...DEFAULT_SETTINGS, ...(competition.settings || {}) },
      clubs: Array.isArray(competition.clubs) ? competition.clubs : [],
      categories: Array.isArray(competition.categories) ? competition.categories : [],
      errors: Array.isArray(competition.errors) ? competition.errors : [],
      registrationOpen,
      status: registrationOpen ? "open" : competition.status || "draft",
      inscriptionsOuvertes: registrationOpen,
    });
    return {
      ...normalized,
      settings: { ...DEFAULT_SETTINGS, ...(normalized.settings || {}) },
      clubs: Array.isArray(normalized.clubs) ? normalized.clubs : [],
      errors: Array.isArray(normalized.errors) ? normalized.errors : [],
    };
  },
  /** Duplique une compétition en conservant ses paramètres mais sans reprendre les inscriptions. */
  cloneCompetition(competition) {
    return this.normalizeCompetition({
      ...competition,
      id: this.createId("competition"),
      nom: `${competition.nom} (copie)`,
      statut: "Brouillon",
      status: "draft",
      registrationOpen: false,
      inscriptionsOuvertes: false,
      participants: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  },
  /** Télécharge un fichier JSON exportable ou réimportable plus tard. */
  exportCompetition(competition) {
    const blob = new Blob([JSON.stringify(competition, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${competition.nom || "competition"}.json`.replace(/[^a-z0-9_.-]+/gi, "-");
    link.click();
    URL.revokeObjectURL(url);
  },
};

/** Service de validation automatique des compétiteurs avant inscription. */
export const ValidationService = {
  /** Calcule l'âge à la date du jour pour contrôler la catégorie déclarée. */
  age(dateNaissance) {
    if (!dateNaissance) return null;
    const birth = new Date(`${dateNaissance}T00:00:00`);
    if (Number.isNaN(birth.getTime())) return null;
    const now = new Date();
    let age = now.getFullYear() - birth.getFullYear();
    if (now.getMonth() < birth.getMonth() || (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate())) age -= 1;
    return age;
  },
  /** Retourne les erreurs bloquantes : âge, grade, catégorie, poids, licence et pièces obligatoires. */
  validateParticipant(values, competition, ignoredId = null) {
    const errors = [];
    const age = this.age(values.dateNaissance);
    const settings = competition.settings || DEFAULT_SETTINGS;
    if (!values.nom.trim() || !values.prenom.trim()) errors.push("Nom et prénom obligatoires.");
    if (!values.licence.trim()) errors.push("Numéro de licence obligatoire.");
    if (age === null) errors.push("Date de naissance invalide ou manquante.");
    if (age !== null && age < 18 && !values.autorisationParentale) errors.push("Autorisation parentale obligatoire pour les mineurs.");
    if (!settings.categoriesOuvertes.includes(values.categorie)) errors.push(`Catégorie ${values.categorie} non ouverte.`);
    if (!settings.gradesAutorises.includes(values.grade)) errors.push(`Grade ${values.grade} non autorisé.`);
    if (!String(values.poids).trim() || Number(values.poids) <= 0) errors.push("Poids obligatoire et positif.");
    if (!values.certificatMedical) errors.push("Certificat médical obligatoire.");
    const duplicate = (competition.participants || []).some((p) => p.id !== ignoredId && p.licence && p.licence.trim().toLowerCase() === values.licence.trim().toLowerCase());
    if (duplicate) errors.push("Doublon de licence détecté.");
    return errors;
  },
};

/** Service léger d'import CSV pour préparer les inscriptions en masse. */
export const CSVImportService = {
  /** Transforme un fichier CSV ou JSON en compétiteurs normalisés. */
  parse(text) {
    return parseCompetitorFile(text).competitors;
  },
};

/** Étapes courtes du nouvel assistant de création de compétition. */
const WIZARD_STEPS = [
  "Créer la compétition",
  "Ajouter les compétiteurs",
  "Contrôler automatiquement les inscriptions",
  "Générer les tableaux",
  "Arbitrer les combats",
  "Classement et résultats",
];

export function WizardProgress({ step, onStep }) {
  return <ol className="wizard-progress" aria-label="Progression de l'assistant compétition">{WIZARD_STEPS.map((label, index) => <li key={label} className={index === step ? "active" : index < step ? "done" : ""}><button type="button" onClick={() => onStep?.(index)}><span>Étape {index + 1}</span><strong>{label}</strong></button></li>)}</ol>;
}

export function WizardCard({ eyebrow, title, children, action, actionClass = "primary", disabled = false }) {
  return <section className="wizard-card"><div className="wizard-title"><p className="surtitle">{eyebrow}</p><h2>{title}</h2></div>{children}{action && <button className={actionClass} type="button" onClick={action.onClick} disabled={disabled}>{action.label}</button>}</section>;
}

export function CompetitionCard({ label, value }) {
  return <article className="competition-card"><strong>{value ?? 0}</strong><span>{label}</span></article>;
}

export function quickStats(competition) {
  const participants = competition?.participants || [];
  return {
    clubs: new Set(participants.map((p) => p.club).filter(Boolean)).size,
    competitors: participants.length,
    categories: new Set(participants.map((p) => p.categorie).filter(Boolean)).size,
  };
}

export function drawStats(competition) {
  const stats = quickStats(competition);
  return {
    categories: stats.categories,
    pools: Math.ceil(stats.competitors / 4),
    brackets: Math.max(0, stats.categories - Math.ceil(stats.competitors / 4)),
  };
}

export function CompetitionStepOne({ competition, onChange, onContinue }) {
  const form = competition || EMPTY_COMPETITION;
  function change(event) {
    const { name, value } = event.target;
    onChange({ ...form, [name]: value });
  }
  return <WizardCard eyebrow="Étape 1" title="Créer la compétition" action={{ label: "Continuer", onClick: onContinue }} disabled={!form.nom.trim()}><div className="wizard-form five-fields"><label>Nom<input name="nom" value={form.nom} onChange={change} required /></label><label>Date<input name="date" type="date" value={form.date} onChange={change} /></label><label>Ville<input name="ville" value={form.ville} onChange={change} /></label><label>Club organisateur<input name="organisateur" value={form.organisateur} onChange={change} /></label><label>Nombre de tatamis<input name="nombreTatamis" type="number" min="1" max="8" value={form.nombreTatamis} onChange={change} /></label></div></WizardCard>;
}

export function CompetitorMiniForm({ competition, onUpdate, initialValue = null, submitLabel = "Ajouter" }) {
  const [form, setForm] = useState({ ...EMPTY_PARTICIPANT, ...(initialValue || {}) });
  const [errors, setErrors] = useState([]);
  function change(event) {
    const { name, value, type, checked } = event.target;
    setForm((current) => ({ ...current, [name]: type === "checkbox" ? checked : value }));
  }
  function submit(event) {
    event.preventDefault();
    const validation = ValidationService.validateParticipant(form, competition, form.id || null);
    setErrors(validation);
    if (validation.length) return;
    const participant = { ...form, id: form.id || CompetitionService.createId("participant") };
    const participants = competition.participants || [];
    const updatedParticipants = participants.some((p) => p.id === participant.id) ? participants.map((p) => (p.id === participant.id ? participant : p)) : [...participants, participant];
    onUpdate({ ...competition, participants: updatedParticipants, competitors: updatedParticipants });
    setForm({ ...EMPTY_PARTICIPANT });
  }
  return <form className="wizard-form compact-competitor" onSubmit={submit}><input name="nom" placeholder="Nom" value={form.nom} onChange={change} /><input name="prenom" placeholder="Prénom" value={form.prenom} onChange={change} /><input name="licence" placeholder="Licence" value={form.licence} onChange={change} /><input name="club" placeholder="Club" value={form.club} onChange={change} /><select name="categorie" value={form.categorie} onChange={change}>{CATEGORIES.map((cat) => <option key={cat}>{cat}</option>)}</select><input name="poids" placeholder="Poids" value={form.poids} onChange={change} /><select name="grade" value={form.grade} onChange={change}>{GRADES.map((grade) => <option key={grade}>{grade}</option>)}</select><select name="sexe" value={form.sexe} onChange={change}>{SEXES.map((sexe) => <option key={sexe}>{sexe}</option>)}</select><input name="dateNaissance" type="date" value={form.dateNaissance} onChange={change} /><label className="inline-check"><input type="checkbox" name="certificatMedical" checked={form.certificatMedical} onChange={change} />Licence valide</label><label className="inline-check"><input type="checkbox" name="autorisationParentale" checked={form.autorisationParentale} onChange={change} />Autorisation mineur</label><button className="primary" type="submit">{submitLabel}</button>{errors.length > 0 && <div className="validation-errors">{errors.map((error) => <p key={error}>{error}</p>)}</div>}</form>;
}

export function CompetitionStepTwo({ competition, onUpdate, onContinue }) {
  const safeCompetition = CompetitionService.normalizeCompetition(competition || {});
  const [showForm, setShowForm] = useState(false);
  const csvRef = useRef(null);
  const stats = quickStats(safeCompetition);
  function mergeParticipants(importedParticipants, report = {}) {
    const existingLicences = new Set(safeCompetition.participants.map((item) => String(item.licence || "").toLowerCase()).filter(Boolean));
    const uniqueParticipants = importedParticipants.filter((item) => !existingLicences.has(String(item.licence || "").toLowerCase()));
    const updatedParticipants = [...safeCompetition.participants, ...uniqueParticipants];
    onUpdate({ ...safeCompetition, participants: updatedParticipants, competitors: updatedParticipants, importReport: { imported: uniqueParticipants.length, rejected: report.rejected || [], skippedDuplicates: importedParticipants.length - uniqueParticipants.length } });
  }
  function importCsv(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = parseCompetitorFile(String(reader.result || ""));
      mergeParticipants(result.competitors.map((row) => ({ ...row, id: row.id || CompetitionService.createId("participant") })), result);
    };
    reader.readAsText(file, "UTF-8");
    event.target.value = "";
  }
  function createTestCompetition() {
    const currentYear = new Date().getFullYear();
    const testParticipants = buildCompetitionTestCompetitors(currentYear, CompetitionService.createId("test"))
      .map((competitor, index) => ({ ...competitor, licence: competitor.licence || `TEST-${currentYear}-${index + 1}`, categorie: competitor.age < 18 ? "Junior" : competitor.age > 39 ? "Vétéran" : "Senior", grade: "Noire", certificatMedical: true, autorisationParentale: true }));
    onUpdate({ ...safeCompetition, nom: safeCompetition.nom || "Coupe de test Nanbudo", statut: "Préparation", participants: testParticipants, competitors: testParticipants, testData: true, importReport: { imported: testParticipants.length, rejected: [], skippedDuplicates: 0 } });
  }
  return <WizardCard eyebrow="Étape 2" title="Ajouter les compétiteurs" action={{ label: "Continuer", onClick: onContinue }}><input ref={csvRef} type="file" accept=".csv,.json,text/csv,application/json" onChange={importCsv} hidden /><div className="wizard-choice step-two-actions"><button className="wizard-card action-card" type="button" onClick={() => setShowForm((value) => !value)}>➕ Ajouter un compétiteur</button><span>OU</span><button className="wizard-card action-card" type="button" onClick={() => csvRef.current?.click()}>📄 Importer CSV/JSON</button><span>OU</span><button className="wizard-card action-card" type="button" onClick={createTestCompetition}>🧪 Créer une compétition de test</button></div>{showForm && <CompetitorMiniForm competition={safeCompetition} onUpdate={onUpdate} />}{safeCompetition.importReport && <p className="info">Import : {safeCompetition.importReport.imported} ajouté(s), {safeCompetition.importReport.skippedDuplicates} doublon(s), {safeCompetition.importReport.rejected?.length || 0} rejet(s).</p>}<div className="wizard-stats"><CompetitionCard label="Clubs" value={stats.clubs} /><CompetitionCard label="Compétiteurs" value={stats.competitors} /><CompetitionCard label="Catégories" value={stats.categories} /></div></WizardCard>;
}

export function CompetitionStepThree({ competition, onUpdate, onContinue }) {
  const safeCompetition = CompetitionService.normalizeCompetition(competition || {});
  const participants = safeCompetition.participants;
  const rows = participants.map((p) => ({ participant: p, errors: ValidationService.validateParticipant(p, safeCompetition, p.id) }));
  const errorCount = rows.reduce((sum, row) => sum + row.errors.length, 0);
  const [editing, setEditing] = useState(null);
  return <WizardCard eyebrow="Étape 3" title="Contrôle automatique" action={{ label: "Continuer", onClick: onContinue }} actionClass={errorCount ? "primary" : "primary success-action"} disabled={errorCount > 0 || participants.length === 0}><div className="control-checks"><span>âge</span><span>grade</span><span>catégorie</span><span>licence</span><span>doublons</span><span>poids</span></div><div className="control-list">{rows.length ? rows.map(({ participant, errors }) => <article key={participant.id} className={errors.length ? "control-row error" : "control-row ok"}><strong>{participant.nom} {participant.prenom}</strong><span>{errors.length ? "❌ erreur" : "✓ conforme"}</span>{errors.length > 0 && <button type="button" onClick={() => setEditing(participant)}>Corriger</button>}<small>{errors.join(" ")}</small></article>) : <p className="muted">Ajoutez des compétiteurs pour lancer le contrôle.</p>}</div>{editing && <CompetitorMiniForm initialValue={editing} submitLabel="Corriger" competition={safeCompetition} onUpdate={(updated) => { onUpdate(updated); setEditing(null); }} />}</WizardCard>;
}

export function CompetitionStepFour({ competition, onUpdate, onContinue }) {
  const safeCompetition = CompetitionService.normalizeCompetition(competition || {});
  const stats = drawStats(safeCompetition);
  function generate() {
    const generated = generateTournament(safeCompetition);
    onUpdate(generated);
    onContinue();
  }
  return <WizardCard eyebrow="Étape 4" title="Génération des tableaux" action={{ label: "Générer les tableaux et combats", onClick: generate }} disabled={safeCompetition.participants.length < 2}><div className="wizard-stats"><CompetitionCard label="Catégories" value={stats.categories} /><CompetitionCard label="Compétiteurs" value={stats.competitors} /><CompetitionCard label="Tableaux prévus" value={stats.categories} /></div><p className="wizard-helper">Cette étape crée les catégories, tableaux, tours, byes, demi-finales et finales avant toute navigation vers les résultats.</p></WizardCard>;
}

function getCompetitorLabel(competition, id) {
  const competitor = (competition.competitors || []).find((item) => String(item.id) === String(id));
  return competitor ? `${competitor.nom} ${competitor.prenom}` : "Bye";
}

function getMatchStatusMeta(status) {
  if (status === "Terminé") return { className: "finished", label: "🟢 Terminé" };
  if (status === "En cours") return { className: "active", label: "🔵 En cours" };
  return { className: "pending", label: "🟡 À jouer" };
}


function getMatchRoundContext(brackets, matchId) {
  for (const bracket of brackets || []) {
    for (const round of bracket.rounds || []) {
      for (const match of round.matches || []) {
        if (String(match.id) === String(matchId)) return { bracket, round, match };
      }
    }
  }
  return null;
}

function buildScoreSheetContext(competition, item) {
  if (!item) return null;
  const category = (competition.categories || []).find((cat) => String(cat.id) === String(item.bracket.categoryId));
  const aka = (competition.competitors || []).find((competitor) => String(competitor.id) === String(item.match.akaId));
  const shiro = (competition.competitors || []).find((competitor) => String(competitor.id) === String(item.match.shiroId));
  return {
    category,
    round: item.round,
    match: { ...item.match, aka, shiro },
    pool: { nom: category?.nom || item.bracket.categoryId, tatami: item.bracket.tatami || category?.tatami || "—" },
    eventType: category?.epreuve || item.bracket.epreuve || "Ju Randori",
  };
}

function scoreSheetIsDirty(sheetState) {
  return Boolean(sheetState && !sheetState.validated);
}

function confirmScoreSheetExit() {
  const choice = window.prompt(`${UNSAVED_MATCH_MESSAGE}\n\n1 - 💾 Enregistrer et quitter\n2 - ❌ Quitter sans enregistrer\n3 - ↩ Revenir au combat`, "3");
  if (choice === "1") return "save";
  if (choice === "2") return "discard";
  return "stay";
}

function hasCompetitionStructureResults(competition) {
  return (competition.brackets || []).length > 0 || (competition.matches || []).some((match) => match.statut === "Terminé") || (competition.pools || []).some((pool) => (pool.matches || []).some((match) => match.statut === "Terminé"));
}

function invalidateGeneratedStructure(competition) {
  return { ...competition, brackets: [], matches: [], pools: [], futureModules: { ...(competition.futureModules || {}), tableaux: [], tirage: null, classements: [] }, statut: "Préparation", workflow: { phase: "Préparation", currentScreen: "preparation" } };
}

export function CompetitionStepFive({ competition, onUpdate, onContinue }) {
  const safeCompetition = CompetitionService.normalizeCompetition(competition || {});
  const brackets = safeCompetition.brackets || [];
  const playableMatches = brackets.flatMap((bracket) => bracket.rounds.flatMap((round) => round.matches.map((match) => ({ bracket, round, match })))).filter(({ match }) => match.statut !== "Terminé" && match.akaId && match.shiroId);
  const completedMatches = (safeCompetition.matches || []).filter((match) => match.statut === "Terminé").length;
  const totalMatches = (safeCompetition.matches || []).length;
  const [selectedMatchId, setSelectedMatchId] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(ACTIVE_SHEET_KEY) || "null");
      return saved?.competitionId === safeCompetition.id ? saved.matchId : null;
    } catch { return null; }
  });
  const [sheetState, setSheetState] = useState(null);
  const scrollPositionRef = useRef(0);
  const selectedMatch = (selectedMatchId && getMatchRoundContext(brackets, selectedMatchId)) || null;
  const sheetContext = buildScoreSheetContext(safeCompetition, selectedMatch);

  useEffect(() => {
    if (selectedMatchId) localStorage.setItem(ACTIVE_SHEET_KEY, JSON.stringify({ competitionId: safeCompetition.id, matchId: selectedMatchId, openedAt: new Date().toISOString() }));
    else localStorage.removeItem(ACTIVE_SHEET_KEY);
  }, [safeCompetition.id, selectedMatchId]);

  function launch() {
    if (!brackets.length) { onUpdate(generateTournament(safeCompetition)); return; }
    onUpdate({ ...safeCompetition, statut: "En cours", workflow: { phase: "En cours", currentScreen: "arbitrage" } });
  }

  function openScoreSheet(matchId) {
    scrollPositionRef.current = window.scrollY;
    setSelectedMatchId(matchId);
    setSheetState({ validated: false });
    onUpdate({ ...safeCompetition, lastOpenedMatchId: matchId, autosavedAt: new Date().toISOString() });
    requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: "instant" }));
  }

  function closeScoreSheet() {
    setSelectedMatchId(null);
    setSheetState(null);
    requestAnimationFrame(() => window.scrollTo({ top: scrollPositionRef.current, behavior: "instant" }));
  }

  function requestCloseScoreSheet() {
    if (!scoreSheetIsDirty(sheetState)) { closeScoreSheet(); return true; }
    const action = confirmScoreSheetExit();
    if (action === "stay") return false;
    if (action === "save") onUpdate({ ...safeCompetition, draftScoreSheets: { ...(safeCompetition.draftScoreSheets || {}), [selectedMatchId]: { ...(sheetState || {}), savedAt: new Date().toISOString() } } });
    closeScoreSheet();
    return true;
  }

  function saveArbitration(match, result) {
    const winnerId = result.vainqueur === "aka" ? match.akaId : result.vainqueur === "shiro" ? match.shiroId : null;
    if (!winnerId) return;
    setSheetState({ validated: true });
    onUpdate(recordMatchResult(safeCompetition, match.id, winnerId, { akaScore: result.scoreAka, shiroScore: result.scoreShiro, scoreBrutAka: result.scoreBrutAka, scoreBrutShiro: result.scoreBrutShiro, assauts: result.assauts, penalitesAka: result.penalitesAka, penalitesShiro: result.penalitesShiro, pointsNegatifsAka: result.pointsNegatifsAka, pointsNegatifsShiro: result.pointsNegatifsShiro, akaDisqualifie: result.akaDisqualifie, shiroDisqualifie: result.shiroDisqualifie, departageActif: result.departageActif, assautsDepartage: result.assautsDepartage, scoreDepartageAka: result.scoreDepartageAka, scoreDepartageShiro: result.scoreDepartageShiro, decisionType: result.decisionType, decisionDrapeaux: result.decisionDrapeaux }));
    closeScoreSheet();
  }

  function goToRankings() { if (canShowRankings(safeCompetition) && requestCloseScoreSheet()) onContinue(); }

  if (sheetContext) {
    return <WizardCard eyebrow="Étape 5" title="Feuille de notation du combat"><button className="public-back" type="button" onClick={requestCloseScoreSheet}>← Retour au tableau</button><MatchManager key={sheetContext.match.id} match={sheetContext.match} mode="ju-randori" type="ju-randori" initialResult={sheetContext.match} category={sheetContext.category} pool={sheetContext.pool} eventType={sheetContext.eventType} onDirtyChange={setSheetState} onSave={(result) => saveArbitration(sheetContext.match, result)} /></WizardCard>;
  }

  return (
    <WizardCard eyebrow="Étape 5" title="Arbitrage des combats">
      <div className="wizard-stats"><CompetitionCard label="Combats terminés" value={completedMatches} /><CompetitionCard label="Combats générés" value={totalMatches} /><CompetitionCard label="À arbitrer" value={playableMatches.length} /></div>
      {!brackets.length && <button className="launch-button" type="button" onClick={launch}>Générer avant lancement</button>}
      {brackets.length > 0 && safeCompetition.statut !== "En cours" && !canShowRankings(safeCompetition) && <button className="launch-button" type="button" onClick={launch}>Lancer la compétition</button>}
      <div className="competition-board" aria-label="Liste des combats par catégorie et par tour">{brackets.map((bracket) => { const categoryLabel = safeCompetition.categories.find((category) => category.id === bracket.categoryId)?.nom || bracket.categoryId; return <section key={bracket.id} className="competition-category-section"><header className="competition-category-header"><div><p className="competition-category-kicker">Catégorie</p><h3>{categoryLabel}</h3></div><span className={bracket.status === "Terminée" ? "category-status finished" : "category-status"}>{bracket.status}</span></header><div className="competition-rounds">{bracket.rounds.map((round) => <section key={`${bracket.id}-${round.index}`} className="competition-round-section"><h4>{round.label}</h4><div className="match-card-list">{round.matches.map((match) => { const status = getMatchStatusMeta(match.statut); const canReferee = match.statut !== "Terminé" && match.akaId && match.shiroId; return <article key={match.id} className="match-card"><div className="match-card-main"><strong className="fighter-name">{getCompetitorLabel(safeCompetition, match.akaId)}</strong><span className="match-versus">VS</span><strong className="fighter-name">{getCompetitorLabel(safeCompetition, match.shiroId)}</strong></div><div className="match-card-footer"><span className={`match-status-badge ${status.className}`}>{status.label}</span>{match.statut === "Terminé" && <span className="match-score">Score {match.akaScore ?? "-"} / {match.shiroScore ?? "-"}</span>}{canReferee && <button className="referee-button" type="button" onClick={() => openScoreSheet(match.id)}>⚖️ À arbitrer</button>}</div></article>; })}</div></section>)}</div></section>; })}</div>
      {playableMatches.length === 0 && <p className="wizard-helper">Tous les combats jouables sont arbitrés. Les vainqueurs ont été qualifiés automatiquement jusqu'à la finale.</p>}
      <button className="primary" type="button" onClick={goToRankings} disabled={!canShowRankings(safeCompetition)}>Accéder aux classements</button><p className="wizard-helper">Le classement reste bloqué tant que tous les combats générés ne sont pas terminés.</p>
    </WizardCard>
  );
}

export function CompetitionStepSix({ competition }) {
  const safeCompetition = CompetitionService.normalizeCompetition(competition || {});
  const rankings = buildRankings(safeCompetition);
  if (!canShowRankings(safeCompetition)) {
    return <WizardCard eyebrow="Étape 6" title="Classement verrouillé"><p className="validation-errors">Les classements ne sont pas disponibles : tous les combats doivent être terminés.</p></WizardCard>;
  }
  return <WizardCard eyebrow="Étape 6" title="Classement et résultats"><div className="control-list">{rankings.map((ranking) => <article key={ranking.categoryId} className="control-row ok"><strong>{safeCompetition.categories.find((category) => category.id === ranking.categoryId)?.nom || ranking.categoryId}</strong><span>1. {getCompetitorLabel(safeCompetition, ranking.firstId)}</span><small>2. {getCompetitorLabel(safeCompetition, ranking.secondId)}{ranking.thirdId ? ` · 3. ${getCompetitorLabel(safeCompetition, ranking.thirdId)}` : ""}</small></article>)}</div><p className="wizard-helper">{safeCompetition.nom || "La compétition"} est terminée et les résultats peuvent être publiés.</p></WizardCard>;
}

export const WIZARD_STEP_COMPONENTS = [
  CompetitionStepOne,
  CompetitionStepTwo,
  CompetitionStepThree,
  CompetitionStepFour,
  CompetitionStepFive,
  CompetitionStepSix,
];

export function WizardFallback({ message }) {
  return (
    <section className="wizard-card wizard-error" role="alert">
      <div className="wizard-title">
        <p className="surtitle">Assistant compétition</p>
        <h2>Étape indisponible</h2>
      </div>
      <p>{message}</p>
    </section>
  );
}

export class WizardErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    const stack = error?.stack || "Stack indisponible";
    const componentStack = info?.componentStack || "Composant indisponible";
    const stackLocation = stack.match(/(src\/[^:)]+):(\d+):(\d+)/) || stack.match(/([^@()\s]+):(\d+):(\d+)/);
    console.error("Erreur React détaillée dans l'assistant compétition", {
      file: stackLocation?.[1] || WIZARD_FILE,
      line: stackLocation?.[2] || "ligne inconnue",
      column: stackLocation?.[3] || "colonne inconnue",
      component: componentStack.split("\n").map((line) => line.trim()).filter(Boolean)[0] || "composant inconnu",
      stack,
      componentStack,
      error,
    });
  }

  componentDidUpdate(previousProps) {
    if (previousProps.resetKey !== this.props.resetKey && this.state.error) {
      this.setState({ error: null });
    }
  }

  render() {
    if (this.state.error) {
      return <WizardFallback message="Une erreur JavaScript a empêché l'affichage de cette étape. Le détail est disponible dans la console de développement." />;
    }
    return this.props.children;
  }
}

export function getStepComponent(step) {
  const StepComponent = WIZARD_STEP_COMPONENTS[step];
  if (!StepComponent) {
    console.error(`Étape d'assistant absente ou invalide : ${step + 1}`, { step, total: WIZARD_STEP_COMPONENTS.length });
    return null;
  }
  return StepComponent;
}

/** Module Compétition repensé comme assistant guidé en six étapes. */
function CompetitionManager() {
  const [competitions, setCompetitions] = useState(CompetitionStore.load);
  const [currentStep, setCurrentStep] = useState(() => Number(localStorage.getItem("nanbudo-current-step") || 0));
  const [selectedId, setSelectedId] = useState(() => localStorage.getItem("nanbudo-selected-competition-id"));
  const [resumeChoiceMade, setResumeChoiceMade] = useState(() => CompetitionStore.load().length === 0);
  const [draftCompetition, setDraftCompetition] = useState(() => CompetitionService.createCompetition(EMPTY_COMPETITION));
  const selected = competitions.find((c) => c.id === selectedId) || competitions[0] || draftCompetition;
  const StepComponent = getStepComponent(currentStep);

  useEffect(() => CompetitionStore.save(competitions), [competitions]);
  useEffect(() => localStorage.setItem("nanbudo-current-step", String(currentStep)), [currentStep]);
  useEffect(() => { if (selectedId) localStorage.setItem("nanbudo-selected-competition-id", selectedId); }, [selectedId]);

  function upsert(competition) {
    const normalized = CompetitionService.normalizeCompetition({ ...competition, updatedAt: new Date().toISOString() });
    if (normalized.id === draftCompetition.id) setDraftCompetition(normalized);
    setCompetitions((current) => current.some((c) => c.id === normalized.id) ? current.map((c) => (c.id === normalized.id ? normalized : c)) : [...current, normalized]);
    setSelectedId(normalized.id);
  }

  function guardedUpdate(competition) {
    if (hasCompetitionStructureResults(selected) && currentStep <= 2 && !window.confirm(STRUCTURE_WARNING)) return;
    upsert(hasCompetitionStructureResults(selected) && currentStep <= 2 ? invalidateGeneratedStructure(competition) : competition);
  }

  function goToStep(stepIndex) {
    const safeStep = Math.max(0, Math.min(WIZARD_STEPS.length - 1, stepIndex));
    if (WIZARD_STEP_COMPONENTS[safeStep]) setCurrentStep(safeStep);
  }

  function next(event) {
    event?.preventDefault?.();
    setCurrentStep((step) => {
      const nextStep = Math.min(WIZARD_STEPS.length - 1, step + 1);
      if (!WIZARD_STEP_COMPONENTS[nextStep]) {
        console.error(`Impossible d'ouvrir l'étape ${nextStep + 1} : composant manquant.`);
        return step;
      }
      return nextStep;
    });
  }

  const stepProps = {
    competition: selected,
    onChange: guardedUpdate,
    onUpdate: guardedUpdate,
    onContinue: next,
  };


  if (!resumeChoiceMade && competitions.length > 0) {
    return <section className="competition-manager wizard-manager"><div className="wizard-card"><div className="wizard-title"><p className="surtitle">REPRISE AUTOMATIQUE</p><h2>Une compétition non terminée a été détectée.</h2></div><div className="hero-actions"><button className="primary" type="button" onClick={() => setResumeChoiceMade(true)}>▶ Reprendre la compétition</button><button className="delete-button" type="button" onClick={() => { if (window.confirm("Effacer les données existantes et créer une nouvelle compétition ?")) { setCompetitions([]); setSelectedId(null); setCurrentStep(0); setResumeChoiceMade(true); localStorage.removeItem(STORAGE_KEY); } }}>🆕 Nouvelle compétition</button></div></div></section>;
  }

  return (
    <section className="competition-manager wizard-manager">
      <div className="manager-header">
        <div>
          <p className="surtitle">ASSISTANT COMPÉTITION</p>
          <h2>Créer une compétition en moins de 2 minutes</h2>
          <p>Une seule action principale par écran, de la création aux résultats.</p>
        </div>
        {competitions.length > 1 && (
          <label className="select-current">
            Compétition
            <select value={selected.id} onChange={(event) => setSelectedId(event.target.value)}>
              {competitions.map((c) => <option key={c.id} value={c.id}>{c.nom || "Compétition sans nom"}</option>)}
            </select>
          </label>
        )}
      </div>
      <WizardProgress step={currentStep} onStep={goToStep} />
      <WizardErrorBoundary resetKey={currentStep}>
        {StepComponent ? <StepComponent {...stepProps} /> : <WizardFallback message="Cette étape n'existe pas dans l'assistant. Vérifiez la configuration des étapes." />}
      </WizardErrorBoundary>
    </section>
  );
}

export default CompetitionManager;
