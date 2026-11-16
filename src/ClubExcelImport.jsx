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
  let previousClub = "";
  return rows.slice(headerIndex + 1).map((row, i) => {
    const currentClub = clean(get(row, "CLUB"));
    if (currentClub) previousClub = currentClub;
    return mapper(row, (name) => key(name) === "club" ? (currentClub || previousClub) : get(row, name), headerIndex + i + 2);
  }).filter(Boolean);
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
    const combatValue = clean(get("Combat"));
    const combat = selected(combatValue), kata = selected(get("Kata"));
    const combatDiscipline = /^randori$/i.test(combatValue) ? "Randori" : /^ju[ -]?randori/i.test(combatValue) ? "Ju-Randori" : (combat ? "Ju-Randori" : "");
    const categoriesInscription = [...(kata ? ["Kata"] : []), ...(combat ? [combatDiscipline] : [])];
    if (!categoriesInscription.length && !selected(get("Kata/Equipe")) && !selected(get("Ju Randori Equipe"))) errors.push(`Compétiteurs ligne ${line} : aucune discipline sélectionnée.`);
    const person = normalizeCompetitor({ club, ville: "", email: "", responsableClub: "", participant: {
      nom, prenom, sexe: clean(get("Sexe (M ou F)")).toUpperCase(), dateNaissance,
      ceinture: clean(get("Grade")), typeInscription: "Compétiteur", categoriesInscription,
      kataEquipe: selected(get("Kata/Equipe")), juRandoriEquipe: selected(get("Ju Randori Equipe")), observations: clean(get("N° Equipe")),
    } }, crypto.randomUUID());
    return { ...person, disciplineCombat: combatDiscipline, poids: get("Poids (kg)"), numeroEquipe: clean(get("N° Equipe")), categorieExcel: clean(get("Cat.")), sourceImportExcel: true };
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

  if (!participants.length && !arbitres.length) errors.push("Aucune inscription trouvée.");
  const identities = new Set();
  for (const p of [...participants, ...unmatchedReferees]) {
    const identity = [key(p.club), key(p.nom), key(p.prenom)].join("|");
    if (identities.has(identity) && p.typeInscription !== "Arbitre") errors.push(`Doublon dans le fichier : ${p.nom} ${p.prenom}.`);
    identities.add(identity);
  }
  return { club: clubs[0] || "", clubs, participants, arbitres: unmatchedReferees, refereeCount: arbitres.length, coaches, errors };
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
    const identity = (p) => [key(p.club), key(p.nom), key(p.prenom)].join("|");
    const existing = competition.competitors || [];
    const byIdentity = new Map(existing.map((p, i) => [identity(p), i]));
    const merged = [...existing];
    let added = 0, updatedCount = 0;
    for (const incoming of [...preview.participants, ...preview.arbitres]) {
      const id = identity(incoming);
      if (!byIdentity.has(id)) {
        byIdentity.set(id, merged.length);
        merged.push(incoming);
        added++;
        continue;
      }
      const index = byIdentity.get(id);
      const previous = merged[index];
      const wasCompetitor = (previous.categoriesInscription || []).length > 0 || /Compétiteur/i.test(previous.typeInscription || "");
      const isCompetitor = (incoming.categoriesInscription || []).length > 0 || /Compétiteur/i.test(incoming.typeInscription || "");
      const roles = [...new Set([...(previous.fonctionArbitrage || []), ...(incoming.fonctionArbitrage || [])])];
      const hasReferee = roles.length > 0 || /Arbitre/i.test(previous.typeInscription || "") || /Arbitre/i.test(incoming.typeInscription || "");
      const mergedPerson = { ...previous, ...incoming, id: previous.id,
        dateNaissance: incoming.dateNaissance || previous.dateNaissance,
        age: incoming.dateNaissance ? incoming.age : previous.age,
        categorie: incoming.dateNaissance ? incoming.categorie : previous.categorie,
        categoriesInscription: isCompetitor ? incoming.categoriesInscription : previous.categoriesInscription,
        fonctionArbitrage: roles,
        typeInscription: (wasCompetitor || isCompetitor) && hasReferee ? "Compétiteur + Arbitre" :
          (wasCompetitor || isCompetitor) ? "Compétiteur" : "Arbitre" };
      merged[index] = mergedPerson;
      updatedCount++;
    }
    const coaches = [...(competition.coaches || [])];
    const coachIndex = new Map(coaches.map((p, i) => [identity(p), i]));
    for (const coach of preview.coaches) {
      const id = identity(coach);
      if (coachIndex.has(id)) coaches[coachIndex.get(id)] = { ...coaches[coachIndex.get(id)], ...coach };
      else { coachIndex.set(id, coaches.length); coaches.push(coach); }
    }
    if (!window.confirm(`Importer ${preview.filename} : ${added} ajout(s), ${updatedCount} mise(s) à jour, ${preview.coaches.length} coach(s) à fusionner ? Les identifiants existants et les résultats seront conservés.`)) return;
    onUpdateCompetition({ ...competition, competitors: merged, coaches,
      excelImportHistory: [...(competition.excelImportHistory || []),
        { club: preview.clubs.join(", "), filename: preview.filename, date: new Date().toISOString(), added, updated: updatedCount, imported: added + updatedCount }] });
    setPreview(null); setError("");
  }
  return <section className="card" style={{ padding: 18, marginBottom: 16 }}>
    <h3>Importer les inscriptions Excel — un ou plusieurs clubs</h3>
    <p>Import global ou par club (.xlsx). Les inscriptions existantes sont mises à jour sans doublons ; les autres sont conservées.</p>
    <input type="file" accept=".xlsx" onChange={chooseFile} aria-label="Fichier Excel du club" />
    {error && <p role="alert" style={{ color: "#b3261e" }}>{error}</p>}
    {preview && <div><h4>{preview.clubs.join(", ") || "Club non identifié"} — {preview.filename}</h4>
      <p>{preview.participants.length} compétiteur(s), {(preview.refereeCount ?? preview.arbitres.length)} arbitre(s), {preview.coaches.length} coach(s).</p>
      {preview.errors.map((e, i) => <p role="alert" key={i} style={{ color: "#b3261e" }}>{e}</p>)}
      <button type="button" disabled={preview.errors.length > 0} onClick={confirmImport}>Confirmer l’ajout et la mise à jour</button>
      <button type="button" onClick={() => setPreview(null)}>Annuler</button>
    </div>}
    {(competition.excelImportHistory || []).length > 0 && <details><summary>Historique des imports Excel</summary><ul>{competition.excelImportHistory.map((item, i) => <li key={i}>{item.club} — {item.filename} — {new Date(item.date).toLocaleString("fr-FR")} — {item.imported} inscriptions</li>)}</ul></details>}
  </section>;
}
