import { useState } from "react";
import * as XLSX from "xlsx";
import { normalizeCompetitor } from "./CompetitionDashboard";

const clean = (v) => String(v ?? "").trim();
const key = (v) => clean(v).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
const truthy = (v) => /^(oui|yes|x|1|vrai|true|kata(?:\s*\/\s*equipe)?)$/i.test(clean(v));
const selected = (v) => Boolean(clean(v)) && !/^(non|no|0|false)$/i.test(clean(v));
const dateValue = (v) => {
  if (v instanceof Date && !Number.isNaN(v.getTime())) return `${v.getFullYear()}-${String(v.getMonth()+1).padStart(2,"0")}-${String(v.getDate()).padStart(2,"0")}`;
  if (typeof v === "number") {
    const d = XLSX.SSF.parse_date_code(v);
    return d ? `${d.y}-${String(d.m).padStart(2, "0")}-${String(d.d).padStart(2, "0")}` : "";
  }
  const s = clean(v);
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (m) return `${m[3].length === 2 ? (Number(m[3]) > 40 ? "19" : "20") + m[3] : m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : "";
};
function sheetRows(workbook, name) {
  const sheet = workbook.SheetNames.find((n) => key(n) === key(name) || (key(name) === "arbitres" && key(n) === "arbitrescoach"));
  if (!sheet) throw new Error(`Onglet « ${name} » introuvable.`);
  return XLSX.utils.sheet_to_json(workbook.Sheets[sheet], { header: 1, defval: "", raw: true });
}
function extract(rows, expected, mapper) {
  const headerIndex = rows.findIndex((row) => expected.every((name) => row.some((cell) => key(cell) === key(name))));
  if (headerIndex < 0) throw new Error(`En-têtes introuvables : ${expected.join(", ")}.`);
  const header = rows[headerIndex].map(key);
  const get = (row, name) => row[header.indexOf(key(name))] ?? "";
  return rows.slice(headerIndex + 1).map((row, i) => mapper(row, (name) => get(row, name), headerIndex + i + 2)).filter(Boolean);
}
export function parseClubWorkbook(buffer) {
  const workbook = XLSX.read(buffer, { type: "array", cellDates: false });
  const errors = [];
  const participants = extract(sheetRows(workbook, "COMPETITEURS"), ["CLUB", "NOM", "Prénom", "Grade"], (row, get, line) => {
    const nom = clean(get("NOM")), prenom = clean(get("Prénom"));
    if ((!nom && !prenom) || (key(nom) === "nom" && key(prenom) === "prenom")) return null;
    const club = clean(get("CLUB"));
    const dateNaissance = dateValue(get("Date de naissance (XX/XX/XX)"));
    if (!club || !nom || !prenom || !dateNaissance || !clean(get("Grade"))) errors.push(`Compétiteurs ligne ${line} : club, identité, date et grade obligatoires.`);
    const combat = selected(get("Combat")), kata = selected(get("Kata"));
    const categoriesInscription = [...(kata ? ["Kata"] : []), ...(combat ? ["Ju-Randori"] : [])];
    if (!categoriesInscription.length && !selected(get("Kata/Equipe")) && !selected(get("Ju Randori Equipe"))) errors.push(`Compétiteurs ligne ${line} : aucune discipline sélectionnée.`);
    const person = normalizeCompetitor({ club, ville: "", email: "", responsableClub: "", participant: {
      nom, prenom, sexe: clean(get("Sexe (M ou F)")).toUpperCase(), dateNaissance,
      ceinture: clean(get("Grade")), typeInscription: "Compétiteur", categoriesInscription,
      kataEquipe: selected(get("Kata/Equipe")), juRandoriEquipe: selected(get("Ju Randori Equipe")), observations: clean(get("N° Equipe")),
    } }, crypto.randomUUID());
    return { ...person, poids: get("Poids (kg)"), numeroEquipe: clean(get("N° Equipe")), categorieExcel: clean(get("Cat.")), sourceImportExcel: true };
  });
  const refereeRows = sheetRows(workbook, "ARBITRES");
  const coachSectionIndex = refereeRows.findIndex((row) => row.some((cell) => key(cell) === "coach"));
  const arbitres = extract(coachSectionIndex >= 0 ? refereeRows.slice(0, coachSectionIndex) : refereeRows, ["CLUB", "NOM", "Prénom"], (row, get, line) => {
    const nom = clean(get("NOM")), prenom = clean(get("Prénom"));
    if (!nom && !prenom) return null;
    const club = clean(get("CLUB"));
    if (!nom || !prenom || !club) errors.push(`Arbitres ligne ${line} : club et identité obligatoires.`);
    return { id: crypto.randomUUID(), nom: nom.toUpperCase(), prenom, club, typeInscription: "Arbitre",
      ceinture: clean(get("Grade WNF")), grade: clean(get("Grade WNF")),
      fonctionArbitrage: [truthy(get("Arbitre Champs")) ? "Shushin" : "", truthy(get("Arbitre de table")) ? "Arbitre de table" : ""].filter(Boolean),
      roleArbitre: "Arbitre", competiteurDeclare: truthy(get("Compétiteurs (Oui, Non)")), sourceImportExcel: true };
  });
  const coachRows = refereeRows;
  const coachStart = coachSectionIndex;
  const coaches = coachStart < 0 ? [] : extract(coachRows.slice(coachStart + 1), ["CLUB", "NOM", "Prénom"], (row, get) => {
    const nom = clean(get("NOM")), prenom = clean(get("Prénom"));
    return nom && prenom && !(key(nom) === "nom" && key(prenom) === "prenom") ? { club: clean(get("CLUB")), nom, prenom, email: clean(get("email")) } : null;
  });
  // One person can compete and referee: keep a single registration and its real birth date.
  const participantByIdentity = new Map(participants.map((p) => [[key(p.club), key(p.nom), key(p.prenom)].join("|"), p]));
  const unmatchedReferees = [];
  for (const referee of arbitres) {
    const identity = [key(referee.club), key(referee.nom), key(referee.prenom)].join("|");
    const participant = participantByIdentity.get(identity);
    if (!participant) {
      // Referee-only records have no birth date; never classify them as mini-poussins.
      unmatchedReferees.push({ ...referee, age: null, categorie: "", dateNaissance: "" });
      continue;
    }
    participant.typeInscription = "Compétiteur + Arbitre";
    participant.fonctionArbitrage = referee.fonctionArbitrage;
    participant.roleArbitre = referee.fonctionArbitrage.join(", ") || "Arbitre";
    participant.gradeArbitre = referee.grade;
    participant.competiteurDeclare = true;
  }
  const clubs = [...new Set([...participants, ...unmatchedReferees, ...coaches].map((p) => p.club).filter(Boolean))];
  if (clubs.length !== 1) errors.push(`Le fichier doit concerner un seul club (détectés : ${clubs.join(", ") || "aucun"}).`);
  if (!participants.length && !arbitres.length) errors.push("Aucune inscription trouvée.");
  const identities = new Set();
  for (const p of [...participants, ...unmatchedReferees]) {
    const identity = [key(p.club), key(p.nom), key(p.prenom)].join("|");
    if (identities.has(identity) && p.typeInscription !== "Arbitre") errors.push(`Doublon dans le fichier : ${p.nom} ${p.prenom}.`);
    identities.add(identity);
  }
  return { club: clubs[0] || "", participants, arbitres: unmatchedReferees, refereeCount: arbitres.length, coaches, errors };
}
export default function ClubExcelImport({ competition, onUpdateCompetition }) {
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState("");
  async function chooseFile(event) {
    const file = event.target.files?.[0]; event.target.value = "";
    setPreview(null); setError("");
    if (!file) return;
    try {
      if (!/\.xlsx$/i.test(file.name)) throw new Error("Choisir un fichier Excel .xlsx.");
      setPreview({ ...parseClubWorkbook(await file.arrayBuffer()), filename: file.name });
    } catch (e) { setError(e.message); }
  }
  function confirmImport() {
    if (!preview || preview.errors.length) return;
    const old = (competition.competitors || []).filter((p) => key(p.club) === key(preview.club));
    const oldIds = new Set(old.map((p) => String(p.id)));
    const hasDependencies = (competition.pools || []).some((p) => (p.competitorIds || []).some((id) => oldIds.has(String(id))) ||
      (p.matches || []).some((m) => [m.competitorId, m.akaId, m.shiroId].some((id) => oldIds.has(String(id)))));
    if (hasDependencies || (competition.categories || []).some((c) => (c.competitorIds || []).some((id) => oldIds.has(String(id))))) {
      setError("Remplacement bloqué : des tableaux, catégories ou matchs utilisent déjà les inscrits de ce club. Corriger ces dépendances avant de remplacer.");
      return;
    }
    if (!window.confirm(`Remplacer ${old.length} inscription(s) du club « ${preview.club} » par ${preview.participants.length + preview.arbitres.length} inscription(s) du fichier ${preview.filename} ? Cette opération est irréversible.`)) return;
    const others = (competition.competitors || []).filter((p) => key(p.club) !== key(preview.club));
    const updated = { ...competition, competitors: [...others, ...preview.participants, ...preview.arbitres],
      coaches: [...(competition.coaches || []).filter((p) => key(p.club) !== key(preview.club)), ...preview.coaches],
      excelImportHistory: [...(competition.excelImportHistory || []), { club: preview.club, filename: preview.filename, date: new Date().toISOString(), replaced: old.length, imported: preview.participants.length + preview.arbitres.length }] };
    onUpdateCompetition(updated); setPreview(null); setError("");
  }
  return <section className="card" style={{ padding: 18, marginBottom: 16 }}>
    <h3>Importer les inscriptions Excel d'un club</h3>
    <p>Un fichier .xlsx par club. Le remplacement concerne uniquement ce club et nécessite une confirmation.</p>
    <input type="file" accept=".xlsx" onChange={chooseFile} aria-label="Fichier Excel du club" />
    {error && <p role="alert" style={{ color: "#b3261e" }}>{error}</p>}
    {preview && <div><h4>{preview.club || "Club non identifié"} — {preview.filename}</h4>
      <p>{preview.participants.length} compétiteur(s), {(preview.refereeCount ?? preview.arbitres.length)} arbitre(s), {preview.coaches.length} coach(s).</p>
      {preview.errors.map((e, i) => <p role="alert" key={i} style={{ color: "#b3261e" }}>{e}</p>)}
      <button type="button" disabled={preview.errors.length > 0} onClick={confirmImport}>Confirmer le remplacement du club</button>
      <button type="button" onClick={() => setPreview(null)}>Annuler</button>
    </div>}
    {(competition.excelImportHistory || []).length > 0 && <details><summary>Historique des imports Excel</summary><ul>{competition.excelImportHistory.map((item, i) => <li key={i}>{item.club} — {item.filename} — {new Date(item.date).toLocaleString("fr-FR")} — {item.imported} inscriptions</li>)}</ul></details>}
  </section>;
}
