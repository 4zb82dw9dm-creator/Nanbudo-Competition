import { useEffect, useMemo, useState } from "react";
import { demoCompetitors } from "./demoCompetitors";
import { GRADES, WEIGHT_CATEGORIES, validateCompetitor } from "./competitorRules";
import {
  COMPETITORS_CHANGED_EVENT,
  COMPETITORS_STORAGE_KEY,
  readCompetitorsFromStorage,
  writeCompetitorsToStorage,
} from "./competitorRepository";

export { COMPETITORS_STORAGE_KEY };
const CSV_COLUMNS = [
  "id",
  "nom",
  "prenom",
  "sexe",
  "dateNaissance",
  "club",
  "region",
  "numeroLicence",
  "grade",
  "categoriePoids",
  "coach",
  "telephone",
  "email",
  "certificatMedical",
  "autorisationParentale",
];
const emptyForm = Object.fromEntries(CSV_COLUMNS.map((column) => [column, ""]));

function readCompetitors() {
  return readCompetitorsFromStorage(demoCompetitors);
}

function parseCsv(text) {
  const [headerLine, ...lines] = text.trim().split(/\r?\n/);
  const headers = headerLine.split(";").map((header) => header.trim());
  return {
    headers,
    rows: lines.filter(Boolean).map((line) =>
      Object.fromEntries(line.split(";").map((value, index) => [headers[index], value.trim()])),
    ),
  };
}

function csvEscape(value) {
  return String(value ?? "").replaceAll(";", ",");
}

function CompetitorManager() {
  const [competitors, setCompetitors] = useState(readCompetitors);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [importReport, setImportReport] = useState(null);
  const [highlightedIds, setHighlightedIds] = useState([]);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);

  const validatedCompetitors = useMemo(() => {
    const seen = new Set();
    return competitors.map((competitor) => {
      const validated = validateCompetitor(competitor, seen);
      seen.add(validated.numeroLicence);
      return validated;
    });
  }, [competitors]);

  const validatedForm = useMemo(() => validateCompetitor(form), [form]);
  const validCount = validatedCompetitors.filter((competitor) => competitor.errors.length === 0).length;
  const filteredCompetitors = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return validatedCompetitors;
    return validatedCompetitors.filter((competitor) =>
      [competitor.nom, competitor.prenom, competitor.club, competitor.numeroLicence, competitor.email]
        .some((value) => String(value || "").toLowerCase().includes(query)),
    );
  }, [search, validatedCompetitors]);

  useEffect(() => {
    function refreshCompetitors() {
      setCompetitors(readCompetitors());
    }

    window.addEventListener("storage", refreshCompetitors);
    window.addEventListener(COMPETITORS_CHANGED_EVENT, refreshCompetitors);

    return () => {
      window.removeEventListener("storage", refreshCompetitors);
      window.removeEventListener(COMPETITORS_CHANGED_EVENT, refreshCompetitors);
    };
  }, []);

  function persist(nextCompetitors) {
    setCompetitors(nextCompetitors);
    writeCompetitorsToStorage(nextCompetitors);
  }

  function updateField(event) {
    const { name, value } = event.target;
    setForm((currentForm) => ({ ...currentForm, [name]: value }));
  }

  function submitCompetitor(event) {
    event.preventDefault();
    const formToValidate = { ...form, id: form.id || `competiteur-${Date.now()}` };
    const checkedForm = validateCompetitor(formToValidate);
    if (checkedForm.errors.length) return;
    const saved = { ...checkedForm, errors: undefined };
    persist(
      editingId
        ? competitors.map((competitor) => (competitor.id === editingId ? saved : competitor))
        : [...competitors, { ...saved, id: saved.id || `competiteur-${Date.now()}` }],
    );
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(false);
  }

  function editCompetitor(competitor) {
    setForm(Object.fromEntries(CSV_COLUMNS.map((column) => [column, competitor[column] || ""])));
    setEditingId(competitor.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function deleteCompetitor(id) {
    if (!window.confirm("Supprimer cette fiche compétiteur ?")) return;
    persist(competitors.filter((competitor) => String(competitor.id) !== String(id)));
    if (String(editingId) === String(id)) {
      setForm(emptyForm);
      setEditingId(null);
      setShowForm(false);
    }
  }

  function downloadCsv() {
    const rows = [CSV_COLUMNS.join(";"), ...competitors.map((competitor) => CSV_COLUMNS.map((column) => csvEscape(competitor[column])).join(";"))];
    const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "competiteurs-demo-afdp.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  function importCsv(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const { headers, rows } = parseCsv(String(reader.result || ""));
      const missingColumns = CSV_COLUMNS.filter((column) => !headers.includes(column));
      const accepted = [];
      const refused = [];
      const seenLicences = new Set(competitors.map((competitor) => competitor.numeroLicence));

      rows.forEach((row, index) => {
        const validated = validateCompetitor(row, seenLicences);
        if (missingColumns.length) validated.errors.push(`Colonnes obligatoires absentes : ${missingColumns.join(", ")}.`);
        if (validated.errors.length) refused.push({ ...validated, id: validated.id || `csv-erreur-${index}` });
        else {
          accepted.push(validated);
          seenLicences.add(validated.numeroLicence);
        }
      });

      persist([...competitors, ...accepted]);
      setImportReport({ imported: accepted.length, errors: refused.reduce((total, competitor) => total + competitor.errors.length, 0), refused });
      setHighlightedIds(refused.map((competitor) => competitor.id));
      event.target.value = "";
    };
    reader.readAsText(file, "UTF-8");
  }

  return (
    <section className="registration-manager competitor-module">
      <div className="manager-header">
        <div><p className="surtitle">COMMISSION</p><h2>Base unique des compétiteurs</h2><p>Les fiches sont créées automatiquement par les inscriptions publiques. Recherchez, contrôlez les documents et modifiez uniquement si nécessaire.</p></div>
        <div className="category-total"><strong>{validCount}/{competitors.length}</strong><span>valides</span></div>
      </div>

      <div className="competitor-actions"><button className="primary" type="button" onClick={() => { setShowForm(true); setEditingId(null); setForm(emptyForm); }}>Nouveau compétiteur</button></div>

      {showForm && <form className="competition-form" onSubmit={submitCompetitor}>
        <h3>{editingId ? "Modifier une fiche" : "Nouvelle fiche compétiteur"}</h3>
        <div className="form-row"><label>Id<input name="id" value={form.id} onChange={updateField} placeholder="Auto si vide" /></label><label>Nom<input name="nom" value={form.nom} onChange={updateField} required /></label></div>
        <div className="form-row"><label>Prénom<input name="prenom" value={form.prenom} onChange={updateField} required /></label><label>Statut<input value={validatedForm.statut} readOnly /></label></div>
        <div className="form-row"><label>Sexe<select name="sexe" value={form.sexe} onChange={updateField} required><option value="">Choisir</option><option value="F">F</option><option value="M">M</option></select></label><label>Date de naissance<input type="date" name="dateNaissance" value={form.dateNaissance} onChange={updateField} required /></label></div>
        <div className="form-row"><label>Club<input name="club" value={form.club} onChange={updateField} required /></label><label>N° licence<input name="numeroLicence" value={form.numeroLicence} onChange={updateField} required /></label></div>
        <div className="form-row"><label>Grade<select name="grade" value={form.grade} onChange={updateField} required><option value="">Choisir</option>{GRADES.map((grade) => <option key={grade}>{grade}</option>)}</select></label><label>Poids<select name="categoriePoids" value={form.categoriePoids} onChange={updateField} required><option value="">Choisir</option>{WEIGHT_CATEGORIES.map((weight) => <option key={weight}>{weight}</option>)}</select></label></div>
        <div className="form-row"><label>Certificat médical<select name="certificatMedical" value={form.certificatMedical} onChange={updateField} required><option>Non</option><option>Oui</option></select></label><label>Autorisation parentale<select name="autorisationParentale" value={form.autorisationParentale} onChange={updateField} required><option>Non</option><option>Oui</option></select></label></div>
        <div className={validatedForm.errors.length ? "validation-panel invalid" : "validation-panel valid"}>
          <strong>{validatedForm.errors.length ? "Badge rouge Invalide" : "Badge vert Valide"}</strong>
          <span>Âge calculé : {validatedForm.age ?? "—"} · Catégorie : {validatedForm.categorieAge}</span>
          {validatedForm.errors.map((error) => <p key={error}>{error}</p>)}
        </div>
        <div className="competitor-actions"><button className="primary" disabled={validatedForm.errors.length > 0}>Enregistrer</button>{editingId && <button type="button" className="back-button" onClick={() => { setEditingId(null); setForm(emptyForm); }}>Annuler</button>}</div>
      </form>}

      <div className="registration-toolbar"><input type="search" placeholder="Rechercher nom, prénom, club, licence…" value={search} onChange={(event) => setSearch(event.target.value)} /><span>{filteredCompetitors.length} affiché{filteredCompetitors.length > 1 ? "s" : ""}</span></div>

      <div className="manager-header registration-list-header"><div><p className="surtitle">IMPORT CSV</p><h3>Contrôle automatique</h3></div><div className="competitor-actions"><label className="manage-button registration-import-label">Importer CSV<input type="file" accept=".csv,text/csv" onChange={importCsv} hidden /></label><button className="manage-button" onClick={downloadCsv}>Télécharger le CSV de démonstration</button></div></div>
      {importReport && <div className="import-report"><p>✓ {importReport.imported} compétiteurs importés</p><p>⚠ {importReport.errors} erreurs détectées</p><p>❌ {importReport.refused.length} compétiteurs refusés</p>{importReport.refused.length > 0 && <button className="delete-button" onClick={() => editCompetitor(importReport.refused[0])}>Corriger les erreurs</button>} {importReport.refused.map((competitor) => <p key={competitor.id}><strong>{competitor.nom} {competitor.prenom}</strong> : {competitor.errors.join(" ")}</p>)}</div>}

      <div className="competitor-list">
        {filteredCompetitors.map((competitor) => <article key={competitor.id} className={`competitor-card ${competitor.errors.length ? "invalid-card" : "valid-card"} ${highlightedIds.includes(competitor.id) ? "highlight-card" : ""}`}>
          <div><h3>{competitor.nom} {competitor.prenom}</h3><p>{competitor.club}</p><span className={competitor.errors.length ? "status-badge invalid" : "status-badge valid"}>{competitor.errors.length ? "Invalide" : "Valide"}</span></div>
          <div className="competitor-details"><span>{competitor.age} ans</span><span>{competitor.categorieAge}</span><span>{competitor.categoriePoids}</span><span>{competitor.grade}</span><span>Licence {competitor.numeroLicence}</span>{competitor.email && <span>{competitor.email}</span>}{competitor.telephone && <span>{competitor.telephone}</span>}</div>
          {competitor.errors.length > 0 && <p className="info">{competitor.errors.join(" ")}</p>}
          <div className="competition-actions"><button className="manage-button" onClick={() => editCompetitor(competitor)}>Consulter / modifier</button><button className="delete-button" type="button" onClick={() => deleteCompetitor(competitor.id)}>Supprimer</button></div>
        </article>)}
      </div>
    </section>
  );
}

export default CompetitorManager;
