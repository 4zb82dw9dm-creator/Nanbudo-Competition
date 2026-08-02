import { useEffect, useMemo, useRef, useState } from "react";
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

/** Barre de navigation interne du module Compétitions. */
function CompetitionToolbar({ view, setView }) {
  return <nav className="competition-submenu" aria-label="Menu compétitions">{[["list", "Liste des compétitions"], ["new", "Nouvelle compétition"], ["edit", "Modifier une compétition"], ["settings", "Paramètres"]].map(([id, label]) => <button key={id} className={view === id ? "active" : ""} onClick={() => setView(id)}>{label}</button>)}</nav>;
}

/** Carte synthétique utilisée sur le tableau de bord. */
function CompetitionCard({ label, value }) {
  return <article className="competition-stat-card"><strong>{value}</strong><span>{label}</span></article>;
}

/** Cartes statistiques et graphiques simples compatibles responsive. */
function CompetitionStats({ competition }) {
  const participants = competition.participants || [];
  const clubs = new Set(participants.map((p) => p.club).filter(Boolean)).size;
  const categories = new Set(participants.map((p) => p.categorie).filter(Boolean));
  const errors = participants.reduce((sum, p) => sum + ValidationService.validateParticipant(p, competition, p.id).length, 0);
  const byCategory = [...categories].map((cat) => ({ cat, count: participants.filter((p) => p.categorie === cat).length }));
  const byGrade = GRADES.map((grade) => ({ grade, count: participants.filter((p) => p.grade === grade).length })).filter((x) => x.count);
  const max = Math.max(1, ...byCategory.map((x) => x.count), ...byGrade.map((x) => x.count));
  return <><div className="competition-stats-grid"><CompetitionCard label="Compétiteurs" value={participants.length} /><CompetitionCard label="Clubs" value={clubs} /><CompetitionCard label="Catégories" value={categories.size} /><CompetitionCard label="Filles" value={participants.filter((p) => ["Fille", "Femme"].includes(p.sexe)).length} /><CompetitionCard label="Garçons" value={participants.filter((p) => ["Garçon", "Homme"].includes(p.sexe)).length} /><CompetitionCard label="Erreurs" value={errors} /></div><div className="charts-grid"><SimpleChart title="Combattants par catégorie" data={byCategory} max={max} labelKey="cat" /><SimpleChart title="Répartition des grades" data={byGrade} max={max} labelKey="grade" /></div></>;
}

/** Graphique horizontal minimaliste sans dépendance externe pour GitHub Pages. */
function SimpleChart({ title, data, max, labelKey }) {
  return <section className="simple-chart"><h3>{title}</h3>{data.length ? data.map((item) => <div className="chart-row" key={item[labelKey]}><span>{item[labelKey]}</span><div><b style={{ width: `${(item.count / max) * 100}%` }} /></div><em>{item.count}</em></div>) : <p className="muted">Aucune donnée.</p>}</section>;
}

/** Tableau de bord temps réel d'une compétition sélectionnée. */
function CompetitionDashboard({ competition }) {
  return <section className="competition-panel"><div className="section-title"><p className="surtitle">TABLEAU DE BORD</p><h2>{competition.nom || "Compétition sans nom"}</h2><p>{competition.ville || "Ville à définir"} · {competition.date || "Date à définir"} · {competition.statut}</p></div><CompetitionStats competition={competition} /></section>;
}

/** Formulaire réutilisable pour créer ou modifier une compétition. */
function CompetitionForm({ initialValue, onSubmit, submitLabel }) {
  const [form, setForm] = useState({ ...EMPTY_COMPETITION, ...initialValue });
  const logoRef = useRef(null);
  /** Met à jour un champ simple du formulaire de compétition. */
  function change(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }
  /** Convertit un logo en data URL pour une sauvegarde autonome locale. */
  function changeLogo(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setForm((current) => ({ ...current, logo: String(reader.result || "") }));
    reader.readAsDataURL(file);
  }
  /** Valide les champs minimaux puis transmet les données au store global. */
  function submit(event) {
    event.preventDefault();
    if (!form.nom.trim()) return alert("Le nom de la compétition est obligatoire.");
    onSubmit(form);
  }
  return <form className="competition-form" onSubmit={submit}><h3>{submitLabel}</h3><label>Nom de la compétition<input name="nom" value={form.nom} onChange={change} required /></label><div className="form-row"><label>Type<select name="type" value={form.type} onChange={change}>{TYPES.map((type) => <option key={type}>{type}</option>)}</select></label><label>Date<input name="date" type="date" value={form.date} onChange={change} /></label></div><div className="form-row"><label>Statut<select name="statut" value={form.statut} onChange={change}>{STATUSES.map((status) => <option key={status}>{status}</option>)}</select></label><label>Lieu<input name="lieu" value={form.lieu} onChange={change} /></label></div><label>Adresse<input name="adresse" value={form.adresse} onChange={change} /></label><div className="form-row"><label>Ville<input name="ville" value={form.ville} onChange={change} /></label><label>Département<input name="departement" value={form.departement} onChange={change} /></label></div><div className="form-row"><label>Pays<input name="pays" value={form.pays} onChange={change} /></label><label>Organisateur<input name="organisateur" value={form.organisateur} onChange={change} /></label></div><div className="form-row"><label>Directeur de compétition<input name="directeurCompetition" value={form.directeurCompetition} onChange={change} /></label><label>Responsable arbitrage<input name="responsableArbitrage" value={form.responsableArbitrage} onChange={change} /></label></div><div className="form-row"><label>Médecin<input name="medecin" value={form.medecin} onChange={change} /></label><label>Nombre de tatamis<input name="nombreTatamis" type="number" min="1" value={form.nombreTatamis} onChange={change} /></label></div><label>Description<textarea name="description" rows="4" value={form.description} onChange={change} /></label><label>Logo<input ref={logoRef} type="file" accept="image/*" onChange={changeLogo} /></label>{form.logo && <img className="competition-logo-preview" src={form.logo} alt="Logo de la compétition" />}<button className="primary" type="submit">{submitLabel}</button></form>;
}

/** Panneau de paramètres sportifs et administratifs de la compétition. */
function CompetitionSettings({ competition, onUpdate }) {
  const settings = competition.settings || DEFAULT_SETTINGS;
  /** Active ou désactive une option multisélection dans les paramètres. */
  function toggleList(key, value) {
    const list = settings[key] || [];
    onUpdate({ ...competition, settings: { ...settings, [key]: list.includes(value) ? list.filter((x) => x !== value) : [...list, value] } });
  }
  /** Met à jour un paramètre scalaire. */
  function change(event) {
    const { name, value, type, checked } = event.target;
    onUpdate({ ...competition, settings: { ...settings, [name]: type === "checkbox" ? checked : value } });
  }
  return <section className="competition-form"><h3>Paramètres</h3><fieldset><legend>Catégories ouvertes</legend>{CATEGORIES.map((cat) => <label className="inline-check" key={cat}><input type="checkbox" checked={settings.categoriesOuvertes.includes(cat)} onChange={() => toggleList("categoriesOuvertes", cat)} />{cat}</label>)}</fieldset><fieldset><legend>Grades autorisés</legend>{GRADES.map((grade) => <label className="inline-check" key={grade}><input type="checkbox" checked={settings.gradesAutorises.includes(grade)} onChange={() => toggleList("gradesAutorises", grade)} />{grade}</label>)}</fieldset><div className="form-row"><label>Poids<input name="poids" value={settings.poids} onChange={change} /></label><label>Sexe<input name="sexe" value={settings.sexe} onChange={change} /></label></div><label className="inline-check"><input type="checkbox" name="mixteAutorise" checked={settings.mixteAutorise} onChange={change} />Mixte autorisé</label><div className="form-row"><label>Temps des combats<input name="tempsCombats" value={settings.tempsCombats} onChange={change} /></label><label>Temps des prolongations<input name="tempsProlongations" value={settings.tempsProlongations} onChange={change} /></label></div><label>Nombre d'arbitres<input name="nombreArbitres" type="number" min="1" value={settings.nombreArbitres} onChange={change} /></label></section>;
}

/** Filtres de recherche rapide des inscriptions. */
function CompetitionFilters({ filters, setFilters }) {
  /** Met à jour un filtre de la liste des compétiteurs. */
  function change(event) {
    const { name, value } = event.target;
    setFilters((current) => ({ ...current, [name]: value }));
  }
  return <div className="competition-filters"><input name="q" placeholder="Recherche rapide" value={filters.q} onChange={change} /><input name="club" placeholder="Club" value={filters.club} onChange={change} /><select name="categorie" value={filters.categorie} onChange={change}><option value="">Catégorie</option>{CATEGORIES.map((cat) => <option key={cat}>{cat}</option>)}</select><input name="poids" placeholder="Poids" value={filters.poids} onChange={change} /><select name="grade" value={filters.grade} onChange={change}><option value="">Grade</option>{GRADES.map((grade) => <option key={grade}>{grade}</option>)}</select><select name="sexe" value={filters.sexe} onChange={change}><option value="">Sexe</option>{SEXES.map((sexe) => <option key={sexe}>{sexe}</option>)}</select></div>;
}

/** Onglet inscriptions avec ajout, modification, suppression, CSV et validations bloquantes. */
function CompetitionParticipants({ competition, onUpdate }) {
  const [form, setForm] = useState({ ...EMPTY_PARTICIPANT });
  const [editingId, setEditingId] = useState(null);
  const [errors, setErrors] = useState([]);
  const [filters, setFilters] = useState({ q: "", club: "", categorie: "", poids: "", grade: "", sexe: "" });
  const csvRef = useRef(null);
  const participants = competition.participants || [];
  const filtered = participants.filter((p) => Object.entries(filters).every(([key, value]) => !value || String(key === "q" ? `${p.nom} ${p.prenom} ${p.licence}` : p[key] || "").toLowerCase().includes(value.toLowerCase())));
  /** Met à jour le formulaire d'inscription. */
  function change(event) {
    const { name, value, type, checked } = event.target;
    setForm((current) => ({ ...current, [name]: type === "checkbox" ? checked : value }));
  }
  /** Enregistre un compétiteur uniquement si tous les contrôles automatiques passent. */
  function submit(event) {
    event.preventDefault();
    const validation = ValidationService.validateParticipant(form, competition, editingId);
    setErrors(validation);
    if (validation.length) return;
    const participant = { ...form, id: editingId || CompetitionService.createId("participant") };
    onUpdate({ ...competition, participants: editingId ? participants.map((p) => (p.id === editingId ? participant : p)) : [...participants, participant] });
    setForm({ ...EMPTY_PARTICIPANT });
    setEditingId(null);
  }
  /** Place un compétiteur existant dans le formulaire de modification. */
  function edit(participant) {
    setForm({ ...EMPTY_PARTICIPANT, ...participant });
    setEditingId(participant.id);
    setErrors([]);
  }
  /** Supprime définitivement un compétiteur de la compétition. */
  function remove(id) {
    onUpdate({ ...competition, participants: participants.filter((p) => p.id !== id) });
  }
  /** Importe un fichier CSV et rejette les lignes qui ne passent pas la validation. */
  function importCsv(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const rows = CSVImportService.parse(String(reader.result || ""));
      const accepted = [];
      rows.forEach((row) => {
        const participant = { ...row, id: CompetitionService.createId("participant") };
        const validation = ValidationService.validateParticipant(participant, { ...competition, participants: [...participants, ...accepted] });
        if (!validation.length) accepted.push(participant);
      });
      onUpdate({ ...competition, participants: [...participants, ...accepted] });
    };
    reader.readAsText(file, "UTF-8");
    event.target.value = "";
  }
  return <section className="competition-panel"><div className="manager-header"><div><p className="surtitle">INSCRIPTIONS</p><h3>Compétiteurs</h3></div><div><input ref={csvRef} type="file" accept=".csv,text/csv" onChange={importCsv} hidden /><button className="manage-button" onClick={() => csvRef.current?.click()}>Importer un CSV</button></div></div><CompetitionFilters filters={filters} setFilters={setFilters} /><form className="participant-form" onSubmit={submit}><input name="nom" placeholder="Nom" value={form.nom} onChange={change} /><input name="prenom" placeholder="Prénom" value={form.prenom} onChange={change} /><input name="licence" placeholder="Licence" value={form.licence} onChange={change} /><input name="club" placeholder="Club" value={form.club} onChange={change} /><select name="categorie" value={form.categorie} onChange={change}>{CATEGORIES.map((cat) => <option key={cat}>{cat}</option>)}</select><input name="poids" placeholder="Poids" value={form.poids} onChange={change} /><select name="grade" value={form.grade} onChange={change}>{GRADES.map((grade) => <option key={grade}>{grade}</option>)}</select><select name="sexe" value={form.sexe} onChange={change}>{SEXES.map((sexe) => <option key={sexe}>{sexe}</option>)}</select><input name="dateNaissance" type="date" value={form.dateNaissance} onChange={change} /><label><input type="checkbox" name="certificatMedical" checked={form.certificatMedical} onChange={change} /> Certificat médical</label><label><input type="checkbox" name="autorisationParentale" checked={form.autorisationParentale} onChange={change} /> Autorisation parentale</label><button className="primary" type="submit">{editingId ? "Modifier" : "Ajouter"}</button></form>{errors.length > 0 && <div className="validation-errors"><strong>🔴 Validation impossible</strong>{errors.map((error) => <p key={error}>{error}</p>)}</div>}<div className="responsive-table"><table><thead><tr><th>État</th><th>Nom</th><th>Club</th><th>Catégorie</th><th>Poids</th><th>Grade</th><th>Sexe</th><th>Actions</th></tr></thead><tbody>{filtered.map((p) => { const rowErrors = ValidationService.validateParticipant(p, competition, p.id); return <tr key={p.id}><td>{rowErrors.length ? <span title={rowErrors.join(" ")}>🔴</span> : "✅"}</td><td>{p.nom} {p.prenom}<br /><small>{p.licence}</small></td><td>{p.club}</td><td>{p.categorie}</td><td>{p.poids}</td><td>{p.grade}</td><td>{p.sexe}</td><td><button className="manage-button" onClick={() => edit(p)}>Modifier</button><button className="delete-button" onClick={() => remove(p.id)}>Supprimer</button></td></tr>; })}</tbody></table></div></section>;
}

/** Tableau principal de la liste des compétitions et de ses actions. */
function CompetitionList({ competitions, onOpen, onEdit, onClone, onDelete, onExport }) {
  return <div className="responsive-table"><table className="competition-table"><thead><tr><th>Nom</th><th>Date</th><th>Ville</th><th>Organisateur</th><th>Nombre de clubs</th><th>Nombre de compétiteurs</th><th>Statut</th><th>Actions</th></tr></thead><tbody>{competitions.map((c) => <tr key={c.id}><td><strong>{c.nom}</strong></td><td>{c.date || "—"}</td><td>{c.ville || c.lieu || "—"}</td><td>{c.organisateur || "—"}</td><td>{new Set((c.participants || []).map((p) => p.club).filter(Boolean)).size}</td><td>{(c.participants || []).length}</td><td><span className="status-pill">{c.statut}</span></td><td><div className="table-actions"><button className="manage-button" onClick={() => onOpen(c.id)}>Ouvrir</button><button className="manage-button" onClick={() => onEdit(c.id)}>Modifier</button><button className="manage-button" onClick={() => onClone(c)}>Cloner</button><button className="delete-button" onClick={() => onDelete(c.id)}>Supprimer</button><button className="manage-button" onClick={() => onExport(c)}>Exporter</button></div></td></tr>)}</tbody></table></div>;
}

/** Module complet de gestion des compétitions avant tirage au sort. */
function CompetitionManager() {
  const [competitions, setCompetitions] = useState(CompetitionStore.load);
  const [view, setView] = useState("list");
  const [selectedId, setSelectedId] = useState(null);
  const selected = competitions.find((c) => c.id === selectedId) || competitions[0];
  useEffect(() => CompetitionStore.save(competitions), [competitions]);
  /** Met à jour ou ajoute une compétition dans le store global. */
  function upsert(competition) {
    const normalized = CompetitionService.normalizeCompetition({ ...competition, inscriptionsOuvertes: competition.statut === "Inscriptions ouvertes", updatedAt: new Date().toISOString() });
    setCompetitions((current) => current.some((c) => c.id === normalized.id) ? current.map((c) => (c.id === normalized.id ? normalized : c)) : [...current, normalized]);
    setSelectedId(normalized.id);
    setView("edit");
  }
  /** Supprime une compétition après confirmation utilisateur. */
  function remove(id) {
    if (window.confirm("Supprimer cette compétition ?")) setCompetitions((current) => current.filter((c) => c.id !== id));
  }
  /** Calcule la compétition à éditer selon la sélection courante. */
  const editInitial = useMemo(() => selected || EMPTY_COMPETITION, [selected]);
  return <section className="competition-manager"><div className="manager-header"><div><p className="surtitle">BÊTA STABLE</p><h2>Gestion des compétitions</h2><p>Créer, modifier et contrôler une compétition avant le tirage au sort.</p></div><button className="primary" onClick={() => setView("new")}>+ Nouvelle compétition</button></div><CompetitionToolbar view={view} setView={setView} />{view === "list" && <CompetitionList competitions={competitions} onOpen={(id) => { setSelectedId(id); setView("dashboard"); }} onEdit={(id) => { setSelectedId(id); setView("edit"); }} onClone={(c) => setCompetitions((current) => [...current, CompetitionService.cloneCompetition(c)])} onDelete={remove} onExport={CompetitionService.exportCompetition} />}{view === "new" && <CompetitionForm submitLabel="Créer la compétition" onSubmit={(values) => upsert(CompetitionService.createCompetition(values))} />}{view === "edit" && selected && <><label className="select-current">Compétition à modifier<select value={selectedId || selected.id} onChange={(e) => setSelectedId(e.target.value)}>{competitions.map((c) => <option key={c.id} value={c.id}>{c.nom}</option>)}</select></label><CompetitionForm key={selected.id} initialValue={editInitial} submitLabel="Enregistrer les modifications" onSubmit={upsert} /><CompetitionParticipants competition={selected} onUpdate={upsert} /></>}{view === "settings" && selected && <CompetitionSettings competition={selected} onUpdate={upsert} />}{view === "dashboard" && selected && <CompetitionDashboard competition={selected} />}{competitions.length === 0 && view === "list" && <div className="empty-state"><span className="empty-number">0</span><h3>Aucune compétition</h3><p>Créez une compétition pour démarrer la préparation.</p></div>}</section>;
}

export default CompetitionManager;
