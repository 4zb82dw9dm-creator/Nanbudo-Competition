import { Component, useEffect, useMemo, useRef, useState } from "react";
import { COMPETITIONS_STORAGE_KEY } from "./backupUtils";

const STORAGE_KEY = COMPETITIONS_STORAGE_KEY;

const STATUSES = [
  "Brouillon",
  "Inscriptions ouvertes",
  "Inscriptions clôturées",
  "En cours",
  "Terminée",
  "Archivée",
];

const TYPES = ["Coupe régionale", "Coupe de France", "Championnat", "Stage", "Open", "Autre"];
const CATEGORIES = ["Enfant", "Benjamin", "Minime", "Junior", "Senior", "Vétéran"];
const GRADES = ["Blanche", "Jaune", "Orange", "Verte", "Bleue", "Marron", "Noire"];
const SEXES = ["Fille", "Garçon", "Femme", "Homme"];

const DEFAULT_SETTINGS = {
  categoriesOuvertes: ["Enfant", "Benjamin", "Minime", "Junior", "Senior"],
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
  inscriptionsOuvertes: false,
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
      inscriptionsOuvertes: values.statut === "Inscriptions ouvertes",
      futureModules: { tirage: null, tableaux: [], notation: null, chronometre: null, classements: [], affichagePublic: null },
    });
  },
  /** Garantit la présence des modèles nécessaires aux modules futurs sans casser les anciennes données. */
  normalizeCompetition(competition) {
    return {
      ...EMPTY_COMPETITION,
      ...competition,
      settings: { ...DEFAULT_SETTINGS, ...(competition.settings || {}) },
      participants: competition.participants || competition.competitors || [],
      inscriptionsOuvertes: competition.statut === "Inscriptions ouvertes" || competition.inscriptionsOuvertes === true,
      futureModules: {
        tirage: null,
        tableaux: [],
        notation: null,
        chronometre: null,
        classements: [],
        affichagePublic: null,
        ...(competition.futureModules || {}),
      },
    };
  },
  /** Duplique une compétition en conservant ses paramètres mais sans reprendre les inscriptions. */
  cloneCompetition(competition) {
    return this.normalizeCompetition({
      ...competition,
      id: this.createId("competition"),
      nom: `${competition.nom} (copie)`,
      statut: "Brouillon",
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
  /** Transforme un CSV à en-têtes en compétiteurs compatibles avec le formulaire. */
  parse(text) {
    const [headerLine, ...lines] = text.split(/\r?\n/).filter(Boolean);
    if (!headerLine) return [];
    const headers = headerLine.split(";").map((h) => h.trim());
    return lines.map((line) => {
      const values = line.split(";");
      return headers.reduce((acc, header, index) => ({ ...acc, [header]: values[index]?.trim() || "" }), { ...EMPTY_PARTICIPANT });
    });
  },
};

/** Étapes courtes du nouvel assistant de création de compétition. */
const WIZARD_STEPS = [
  "Créer la compétition",
  "Ajouter les compétiteurs",
  "Contrôler automatiquement les inscriptions",
  "Générer le tirage au sort",
  "Lancer les combats",
  "Classement et résultats",
];

function WizardProgress({ step }) {
  return <ol className="wizard-progress" aria-label="Progression de l'assistant compétition">{WIZARD_STEPS.map((label, index) => <li key={label} className={index === step ? "active" : index < step ? "done" : ""}><span>Étape {index + 1}</span><strong>{label}</strong></li>)}</ol>;
}

function WizardCard({ eyebrow, title, children, action, actionClass = "primary", disabled = false }) {
  return <section className="wizard-card"><div className="wizard-title"><p className="surtitle">{eyebrow}</p><h2>{title}</h2></div>{children}{action && <button className={actionClass} type="button" onClick={action.onClick} disabled={disabled}>{action.label}</button>}</section>;
}

function quickStats(competition) {
  const participants = competition?.participants || [];
  return {
    clubs: new Set(participants.map((p) => p.club).filter(Boolean)).size,
    competitors: participants.length,
    categories: new Set(participants.map((p) => p.categorie).filter(Boolean)).size,
  };
}

function drawStats(competition) {
  const stats = quickStats(competition);
  return {
    categories: stats.categories,
    pools: Math.ceil(stats.competitors / 4),
    brackets: Math.max(0, stats.categories - Math.ceil(stats.competitors / 4)),
  };
}

function CompetitionStepOne({ competition, onChange, onContinue }) {
  const form = competition || EMPTY_COMPETITION;
  function change(event) {
    const { name, value } = event.target;
    onChange({ ...form, [name]: value });
  }
  return <WizardCard eyebrow="Étape 1" title="Créer la compétition" action={{ label: "Continuer", onClick: onContinue }} disabled={!form.nom.trim()}><div className="wizard-form five-fields"><label>Nom<input name="nom" value={form.nom} onChange={change} required /></label><label>Date<input name="date" type="date" value={form.date} onChange={change} /></label><label>Ville<input name="ville" value={form.ville} onChange={change} /></label><label>Club organisateur<input name="organisateur" value={form.organisateur} onChange={change} /></label><label>Nombre de tatamis<input name="nombreTatamis" type="number" min="1" max="8" value={form.nombreTatamis} onChange={change} /></label></div></WizardCard>;
}

function CompetitorMiniForm({ competition, onUpdate, initialValue = null, submitLabel = "Ajouter" }) {
  const [form, setForm] = useState({ ...EMPTY_PARTICIPANT, ...(initialValue || {}) });
  const [errors, setErrors] = useState([]);
  function change(event) {
    const { name, value, type, checked } = event.target;
    setForm((current) => ({ ...current, [name]: type === "checkbox" ? checked : value }));
  }
  function submit(event) {
    event.preventDefault();
    const validation = ValidationService.validateParticipant(form, competition);
    setErrors(validation);
    if (validation.length) return;
    const participant = { ...form, id: form.id || CompetitionService.createId("participant") };
    const participants = competition.participants || [];
    onUpdate({ ...competition, participants: participants.some((p) => p.id === participant.id) ? participants.map((p) => (p.id === participant.id ? participant : p)) : [...participants, participant] });
    setForm({ ...EMPTY_PARTICIPANT });
  }
  return <form className="wizard-form compact-competitor" onSubmit={submit}><input name="nom" placeholder="Nom" value={form.nom} onChange={change} /><input name="prenom" placeholder="Prénom" value={form.prenom} onChange={change} /><input name="licence" placeholder="Licence" value={form.licence} onChange={change} /><input name="club" placeholder="Club" value={form.club} onChange={change} /><select name="categorie" value={form.categorie} onChange={change}>{CATEGORIES.map((cat) => <option key={cat}>{cat}</option>)}</select><input name="poids" placeholder="Poids" value={form.poids} onChange={change} /><select name="grade" value={form.grade} onChange={change}>{GRADES.map((grade) => <option key={grade}>{grade}</option>)}</select><select name="sexe" value={form.sexe} onChange={change}>{SEXES.map((sexe) => <option key={sexe}>{sexe}</option>)}</select><input name="dateNaissance" type="date" value={form.dateNaissance} onChange={change} /><label className="inline-check"><input type="checkbox" name="certificatMedical" checked={form.certificatMedical} onChange={change} />Licence valide</label><label className="inline-check"><input type="checkbox" name="autorisationParentale" checked={form.autorisationParentale} onChange={change} />Autorisation mineur</label><button className="primary" type="submit">{submitLabel}</button>{errors.length > 0 && <div className="validation-errors">{errors.map((error) => <p key={error}>{error}</p>)}</div>}</form>;
}

function CompetitionStepTwo({ competition, onUpdate, onContinue }) {
  const [showForm, setShowForm] = useState(false);
  const csvRef = useRef(null);
  const stats = quickStats(competition);
  function importCsv(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => onUpdate({ ...competition, participants: [...(competition.participants || []), ...CSVImportService.parse(String(reader.result || "")).map((row) => ({ ...row, id: CompetitionService.createId("participant") }))] });
    reader.readAsText(file, "UTF-8");
    event.target.value = "";
  }
  return <WizardCard eyebrow="Étape 2" title="Ajouter les compétiteurs" action={{ label: "Continuer", onClick: onContinue }}><input ref={csvRef} type="file" accept=".csv,text/csv" onChange={importCsv} hidden /><div className="wizard-choice"><button type="button" onClick={() => csvRef.current?.click()}>Importer un CSV</button><span>OU</span><button type="button" onClick={() => setShowForm((value) => !value)}>Ajouter un compétiteur</button></div>{showForm && <CompetitorMiniForm competition={competition} onUpdate={onUpdate} />}<div className="wizard-stats"><CompetitionCard label="Clubs" value={stats.clubs} /><CompetitionCard label="Compétiteurs" value={stats.competitors} /><CompetitionCard label="Catégories" value={stats.categories} /></div></WizardCard>;
}

function CompetitionStepThree({ competition, onUpdate, onContinue }) {
  const participants = competition.participants || [];
  const rows = participants.map((p) => ({ participant: p, errors: ValidationService.validateParticipant(p, competition, p.id) }));
  const errorCount = rows.reduce((sum, row) => sum + row.errors.length, 0);
  const [editing, setEditing] = useState(null);
  return <WizardCard eyebrow="Étape 3" title="Contrôle automatique" action={{ label: "Continuer", onClick: onContinue }} actionClass={errorCount ? "primary" : "primary success-action"} disabled={errorCount > 0 || participants.length === 0}><div className="control-checks"><span>âge</span><span>grade</span><span>catégorie</span><span>licence</span><span>doublons</span><span>poids</span></div><div className="control-list">{rows.length ? rows.map(({ participant, errors }) => <article key={participant.id} className={errors.length ? "control-row error" : "control-row ok"}><strong>{participant.nom} {participant.prenom}</strong><span>{errors.length ? "❌ erreur" : "✓ conforme"}</span>{errors.length > 0 && <button type="button" onClick={() => setEditing(participant)}>Corriger</button>}<small>{errors.join(" ")}</small></article>) : <p className="muted">Ajoutez des compétiteurs pour lancer le contrôle.</p>}</div>{editing && <CompetitorMiniForm initialValue={editing} submitLabel="Corriger" competition={competition} onUpdate={(updated) => { onUpdate(updated); setEditing(null); }} />}</WizardCard>;
}

function CompetitionStepFour({ competition, onUpdate, onContinue }) {
  const stats = drawStats(competition);
  function generate() {
    onUpdate({ ...competition, futureModules: { ...(competition.futureModules || {}), tirage: { mode: "automatique", generatedAt: new Date().toISOString(), stats } } });
    onContinue();
  }
  return <WizardCard eyebrow="Étape 4" title="Tirage au sort" action={{ label: "Générer automatiquement", onClick: generate }}><div className="wizard-stats"><CompetitionCard label="Catégories" value={stats.categories} /><CompetitionCard label="Poules" value={stats.pools} /><CompetitionCard label="Tableaux" value={stats.brackets} /></div><p className="wizard-helper">Le meilleur mode de tirage sera choisi automatiquement.</p></WizardCard>;
}

function CompetitionStepFive({ competition, onUpdate, onContinue }) {
  function launch() {
    onUpdate({ ...competition, statut: "En cours" });
    onContinue();
  }
  return <WizardCard eyebrow="Étape 5" title="Lancer la compétition"><button className="launch-button" type="button" onClick={launch}>Lancer la compétition</button><p className="wizard-helper">Les tatamis s'ouvrent directement après le lancement.</p></WizardCard>;
}

function CompetitionStepSix({ competition }) {
  return <WizardCard eyebrow="Étape 6" title="Classement et résultats"><div className="results-grid">{["Classements", "Podiums", "Médailles", "Classement des clubs", "Export PDF", "Export Excel"].map((item) => <button type="button" key={item}>{item}</button>)}</div><p className="wizard-helper">{competition.nom || "La compétition"} est prête pour la publication des résultats.</p></WizardCard>;
}

const WIZARD_STEP_COMPONENTS = [
  CompetitionStepOne,
  CompetitionStepTwo,
  CompetitionStepThree,
  CompetitionStepFour,
  CompetitionStepFive,
  CompetitionStepSix,
];

function WizardFallback({ message }) {
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

class WizardErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("Erreur de rendu dans l'assistant compétition", error, info);
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

function getStepComponent(step) {
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
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedId, setSelectedId] = useState(null);
  const selected = competitions.find((c) => c.id === selectedId) || competitions[0] || CompetitionService.createCompetition(EMPTY_COMPETITION);
  const StepComponent = getStepComponent(currentStep);

  useEffect(() => CompetitionStore.save(competitions), [competitions]);

  function upsert(competition) {
    const normalized = CompetitionService.normalizeCompetition({ ...competition, updatedAt: new Date().toISOString() });
    setCompetitions((current) => current.some((c) => c.id === normalized.id) ? current.map((c) => (c.id === normalized.id ? normalized : c)) : [...current, normalized]);
    setSelectedId(normalized.id);
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
    onChange: upsert,
    onUpdate: upsert,
    onContinue: next,
  };

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
      <WizardProgress step={currentStep} />
      <WizardErrorBoundary resetKey={currentStep}>
        {StepComponent ? <StepComponent {...stepProps} /> : <WizardFallback message="Cette étape n'existe pas dans l'assistant. Vérifiez la configuration des étapes." />}
      </WizardErrorBoundary>
    </section>
  );
}

export default CompetitionManager;
