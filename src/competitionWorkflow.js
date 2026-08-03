import { sanitizeRestrictedEventsForCompetitor } from "./competitorRules.js";
import { upsertOfficialPlanningDocument } from "./officialPlanning.js";

const CATEGORY_MIN_SIZE = 2;
const FINAL_STATUSES = ["Terminé", "Terminée"];

export const COMPETITION_PHASES = {
  DRAFT: "Brouillon",
  PREPARATION: "Préparation",
  READY: "Tableaux générés",
  RUNNING: "En cours",
  COMPLETED: "Terminée",
};

export function createId(prefix = "id") {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function normalizeText(value) {
  return String(value ?? "").trim();
}

export function normalizeSex(value) {
  const text = normalizeText(value).toLowerCase();
  if (["f", "femme", "fille", "féminin", "feminin"].includes(text)) return "Femme";
  if (["m", "h", "homme", "garçon", "garcon", "masculin"].includes(text)) return "Homme";
  return normalizeText(value) || "Homme";
}

export function normalizeGrade(value) {
  return normalizeText(value) || "Blanche";
}

export function normalizeCategory(value, fallback = "Senior") {
  return normalizeText(value) || fallback;
}

export function normalizeWeight(value) {
  const number = Number(String(value ?? "").replace(",", "."));
  return Number.isFinite(number) && number > 0 ? number : "";
}

export function normalizeCompetitor(raw = {}, index = 0) {
  const nom = normalizeText(raw.nom || raw.name || raw.lastName).toUpperCase();
  const prenom = normalizeText(raw.prenom || raw.firstName);
  const licence = normalizeText(raw.licence || raw.license || raw.numeroLicence) || `AUTO-${Date.now()}-${index}`;
  const categorie = normalizeCategory(raw.categorie || raw.category);
  return {
    ...raw,
    id: normalizeText(raw.id) || createId("competitor"),
    nom,
    prenom,
    licence,
    club: normalizeText(raw.club) || "Club non renseigné",
    categorie,
    categoryId: raw.categoryId || null,
    poids: normalizeWeight(raw.poids || raw.weight),
    grade: normalizeGrade(raw.grade),
    sexe: normalizeSex(raw.sexe || raw.sex || raw.genre),
    certificatMedical: raw.certificatMedical ?? true,
    autorisationParentale: raw.autorisationParentale ?? true,
  };
}

export function validateCompetitor(competitor, allCompetitors = []) {
  const errors = [];
  if (!competitor.id) errors.push("id manquant");
  if (!competitor.nom) errors.push("nom manquant");
  if (!competitor.prenom) errors.push("prénom manquant");
  if (!competitor.licence) errors.push("licence manquante");
  if (!competitor.categorie) errors.push("catégorie manquante");
  if (!competitor.grade) errors.push("grade manquant");
  if (!competitor.poids) errors.push("poids manquant");
  if (!competitor.sexe) errors.push("sexe manquant");
  if (!competitor.club) errors.push("club manquant");
  const duplicates = allCompetitors.filter((item) => item.licence && item.licence.toLowerCase() === competitor.licence.toLowerCase());
  if (duplicates.length > 1) errors.push("licence en doublon");
  return errors;
}

function splitCsvLine(line, separator) {
  const cells = [];
  let current = "";
  let quoted = false;
  for (const char of line) {
    if (char === '"') quoted = !quoted;
    else if (char === separator && !quoted) {
      cells.push(current.trim().replace(/^"|"$/g, ""));
      current = "";
    } else current += char;
  }
  cells.push(current.trim().replace(/^"|"$/g, ""));
  return cells;
}

export function parseCompetitorFile(text) {
  const source = String(text || "").trim();
  if (!source) return { competitors: [], rejected: ["Fichier vide."] };
  if (source.startsWith("{") || source.startsWith("[")) {
    const payload = JSON.parse(source);
    const rows = Array.isArray(payload) ? payload : payload.competitors || payload.participants || [];
    return { competitors: rows.map(normalizeCompetitor), rejected: [] };
  }
  const lines = source.split(/\r?\n/).filter((line) => line.trim());
  const separator = (lines[0].match(/;/g) || []).length >= (lines[0].match(/,/g) || []).length ? ";" : ",";
  const headers = splitCsvLine(lines[0], separator).map((header) => header.trim().toLowerCase());
  const competitors = [];
  const rejected = [];
  lines.slice(1).forEach((line, index) => {
    const cells = splitCsvLine(line, separator);
    const row = Object.fromEntries(headers.map((header, cellIndex) => [header, cells[cellIndex] || ""]));
    const mapped = {
      nom: row.nom || row.name || row.last_name,
      prenom: row.prenom || row["prénom"] || row.first_name,
      licence: row.licence || row.license,
      club: row.club,
      categorie: row.categorie || row["catégorie"] || row.category,
      poids: row.poids || row.weight,
      grade: row.grade,
      sexe: row.sexe || row.sex,
      dateNaissance: row.datenaissance || row.date_naissance || row.naissance,
    };
    const competitor = normalizeCompetitor(mapped, index);
    const errors = validateCompetitor(competitor, [...competitors, competitor]);
    if (errors.length) rejected.push(`Ligne ${index + 2} : ${errors.join(", ")}.`);
    else competitors.push(competitor);
  });
  return { competitors, rejected };
}

export function normalizeCompetitionData(competition = {}) {
  const sourceCompetitors = Array.isArray(competition.competitors) && competition.competitors.length ? competition.competitors : competition.participants || [];
  const competitors = sourceCompetitors.map(normalizeCompetitor);
  return {
    ...competition,
    id: competition.id || createId("competition"),
    participants: competitors,
    competitors,
    categories: Array.isArray(competition.categories) ? competition.categories : [],
    settings: competition.settings || {},
    futureModules: { tirage: null, tableaux: [], notation: null, chronometre: null, classements: [], affichagePublic: null, ...(competition.futureModules || {}) },
    documents: Array.isArray(competition.documents) ? competition.documents : [],
    workflow: competition.workflow || { phase: competition.statut || COMPETITION_PHASES.DRAFT, currentScreen: "preparation" },
  };
}

const COMPETITOR_EVENT_FIELDS = [
  ["kata0", "Kata 0"],
  ["kata1", "Kata 1"],
  ["kata2", "Kata 2"],
  ["randori", "Randori"],
  ["juRandori1", "Ju Randori 1"],
  ["juRandori2", "Ju Randori 2"],
];

function getCompetitorEvents(competitor, referenceDate = new Date()) {
  const allowedCompetitor = sanitizeRestrictedEventsForCompetitor(competitor, referenceDate);
  const selected = COMPETITOR_EVENT_FIELDS.filter(([field]) => allowedCompetitor[field] || allowedCompetitor.epreuves?.[field]).map(([field, label]) => ({ field, label }));
  return selected.length ? selected : [{ field: "kata2", label: "Kata 2" }];
}

export function generateCategories(competition) {
  const normalized = normalizeCompetitionData(competition);
  const groups = new Map();
  normalized.competitors.forEach((competitor) => {
    getCompetitorEvents(competitor, normalized.date ? new Date(normalized.date) : new Date()).forEach((event) => {
      const key = `${event.field}|${competitor.categorie}|${competitor.sexe}`;
      if (!groups.has(key)) groups.set(key, { event, competitors: [] });
      groups.get(key).competitors.push(competitor);
    });
  });
  return [...groups.entries()].map(([key, group], index) => {
    const [epreuve, categorie, sexe] = key.split("|");
    return { id: `category-${index}-${key.replace(/[^a-z0-9]+/gi, "-")}`, nom: `${categorie} ${sexe}`, categorie, sexe, epreuve, epreuveLabel: group.event.label, competitorIds: group.competitors.map((item) => item.id), status: group.competitors.length >= CATEGORY_MIN_SIZE ? "Valide" : "Insuffisant" };
  });
}

function nextPowerOfTwo(value) {
  let size = 1;
  while (size < value) size *= 2;
  return size;
}

function buildRound(category, entrants, roundIndex, label) {
  const matches = [];
  for (let index = 0; index < entrants.length; index += 2) {
    const akaId = entrants[index] || null;
    const shiroId = entrants[index + 1] || null;
    matches.push({ id: createId("match"), categoryId: category.id, roundIndex, roundLabel: label, akaId, shiroId, winnerId: !shiroId ? akaId : null, statut: !shiroId ? "Terminé" : "À jouer", akaScore: null, shiroScore: null, bye: !shiroId });
  }
  return matches;
}

export function generateTournament(competition) {
  const normalized = normalizeCompetitionData(competition);
  const categories = generateCategories(normalized);
  const brackets = categories.map((category) => {
    const seeded = [...category.competitorIds];
    const size = nextPowerOfTwo(Math.max(2, seeded.length));
    while (seeded.length < size) seeded.push(null);
    const firstMatches = buildRound(category, seeded, 1, size <= 2 ? "Finale" : size === 4 ? "Demi-finales" : "Tour 1");
    const rounds = [{ index: 1, label: firstMatches[0]?.roundLabel || "Tour 1", matches: firstMatches }];
    return { id: `bracket-${category.id}`, categoryId: category.id, epreuve: category.epreuve, epreuveLabel: category.epreuveLabel, competitorIds: category.competitorIds, ageClass: category.categorie, sexe: category.sexe, status: category.status === "Valide" ? "À jouer" : "Insuffisant", rounds, podium: null };
  });
  const matches = brackets.flatMap((bracket) => bracket.rounds.flatMap((round) => round.matches));
  const readyCompetition = { ...normalized, categories, brackets, matches, pools: brackets, statut: COMPETITION_PHASES.READY, workflow: { phase: COMPETITION_PHASES.READY, currentScreen: "arbitrage" }, futureModules: { ...normalized.futureModules, tableaux: brackets, tirage: { generatedAt: new Date().toISOString(), categoryCount: categories.length, matchCount: matches.length } } };
  return upsertOfficialPlanningDocument(readyCompetition);
}

function categoryFinished(bracket) {
  const lastRound = bracket.rounds.at(-1);
  return lastRound?.matches.length === 1 && FINAL_STATUSES.includes(lastRound.matches[0].statut) && lastRound.matches[0].winnerId;
}

export function recordMatchResult(competition, matchId, winnerId, scores = {}) {
  const updated = normalizeCompetitionData(competition);
  const brackets = (updated.brackets || []).map((bracket) => ({ ...bracket, rounds: bracket.rounds.map((round) => ({ ...round, matches: round.matches.map((match) => match.id === matchId ? { ...match, ...scores, winnerId, statut: "Terminé" } : match) })) }));
  brackets.forEach((bracket) => {
    let lastRound = bracket.rounds.at(-1);
    while (lastRound && lastRound.matches.every((match) => match.statut === "Terminé") && !categoryFinished(bracket)) {
      const winners = lastRound.matches.map((match) => match.winnerId).filter(Boolean);
      const nextLabel = winners.length === 2 ? "Finale" : winners.length === 4 ? "Demi-finales" : `Tour ${lastRound.index + 1}`;
      const nextMatches = buildRound({ id: bracket.categoryId }, winners, lastRound.index + 1, nextLabel);
      bracket.rounds.push({ index: lastRound.index + 1, label: nextLabel, matches: nextMatches });
      lastRound = bracket.rounds.at(-1);
    }
    if (categoryFinished(bracket)) {
      const final = bracket.rounds.at(-1).matches[0];
      bracket.status = "Terminée";
      bracket.podium = { firstId: final.winnerId, secondId: final.akaId === final.winnerId ? final.shiroId : final.akaId, thirdId: null };
    }
  });
  const matches = brackets.flatMap((bracket) => bracket.rounds.flatMap((round) => round.matches));
  const allDone = brackets.length > 0 && brackets.every((bracket) => bracket.status === "Terminée" || bracket.status === "Insuffisant");
  return { ...updated, brackets, pools: brackets, matches, statut: allDone ? COMPETITION_PHASES.COMPLETED : COMPETITION_PHASES.RUNNING, workflow: { phase: allDone ? COMPETITION_PHASES.COMPLETED : COMPETITION_PHASES.RUNNING, currentScreen: allDone ? "classements" : "arbitrage" }, futureModules: { ...updated.futureModules, tableaux: brackets, classements: allDone ? buildRankings({ ...updated, brackets }) : updated.futureModules.classements } };
}

export function buildRankings(competition) {
  return (competition.brackets || []).filter((bracket) => bracket.podium).map((bracket) => ({ categoryId: bracket.categoryId, ...bracket.podium }));
}

export function canShowRankings(competition) {
  const normalized = normalizeCompetitionData(competition);
  return normalized.statut === COMPETITION_PHASES.COMPLETED && (normalized.brackets || []).length > 0 && (normalized.brackets || []).every((bracket) => bracket.status === "Terminée" || bracket.status === "Insuffisant");
}
