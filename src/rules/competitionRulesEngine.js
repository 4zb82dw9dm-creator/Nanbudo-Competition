import { CINDA_2025_RULESET } from "./cinda2025RulesConfig";

export const RULE_STATUS_TO_BE_STRUCTURED = "to_be_structured_from_pdf";

export function createCompetitionRulesEngine(ruleset = CINDA_2025_RULESET) {
  function normalizeDisciplineId(disciplineId) {
    if (disciplineId === "kata") return "kata_individuel";
    if (disciplineId === "combat") return "randori";
    return disciplineId;
  }

  function getDiscipline(disciplineId) {
    return ruleset.disciplines[normalizeDisciplineId(disciplineId)] || null;
  }

  function disciplineLabel(disciplineId) {
    return getDiscipline(disciplineId)?.label || disciplineId || "Discipline à vérifier";
  }

  function disciplineFamily(disciplineId) {
    return getDiscipline(disciplineId)?.family || "unknown";
  }

  function isKataDiscipline(disciplineId) {
    return disciplineFamily(disciplineId) === "kata";
  }

  function findAgeBand(age) {
    if (age === "" || age === undefined || Number.isNaN(Number(age))) return { label: "Âge à vérifier" };
    return ruleset.categories.ageBands.find((band) => Number(age) >= band.min && (band.max === null || Number(age) <= band.max)) || { label: "Âge à vérifier" };
  }

  function gradeBand(grade = "") {
    const normalized = grade.toLowerCase();
    if (normalized.includes("dan")) return "Dan";
    if (normalized.includes("kyu")) return "Kyu";
    return grade.trim() || "Grade à vérifier";
  }

  function requiresWeight(disciplineId) {
    const family = disciplineFamily(disciplineId);
    return ruleset.categories.weightCategories.appliesToFamilies.includes(family);
  }

  function unresolvedRule(path, message) {
    return { path, status: RULE_STATUS_TO_BE_STRUCTURED, message };
  }

  function calculateKataPoints(notes) {
    if (notes.some((note) => note === "")) return null;
    const numericNotes = notes.map(Number);
    const highest = Math.max(...numericNotes);
    const lowest = Math.min(...numericNotes);
    const retained = [...numericNotes];
    retained.splice(retained.indexOf(highest), 1);
    retained.splice(retained.indexOf(lowest), 1);
    const total = retained.reduce((sum, note) => sum + note, 0);
    return { highest, lowest, retained, total, average: total / retained.length };
  }

  function applyPenaltyConsequences(scores, penaltiesBySide = {}) {
    const shikakuSide = Object.entries(penaltiesBySide).find(([, penalties]) => penalties?.shikaku > 0)?.[0];
    if (!shikakuSide) return { scores, winnerSide: null, unresolved: unresolvedRule("penalties", "Les conséquences chiffrées des pénalités doivent être structurées depuis le règlement officiel.") };
    return { scores, winnerSide: shikakuSide === "aka" ? "shiro" : "aka", disqualifiedSide: shikakuSide };
  }

  return { ruleset, normalizeDisciplineId, getDiscipline, disciplineLabel, disciplineFamily, isKataDiscipline, findAgeBand, gradeBand, requiresWeight, calculateKataPoints, applyPenaltyConsequences, unresolvedRule };
}

export const competitionRulesEngine = createCompetitionRulesEngine();
