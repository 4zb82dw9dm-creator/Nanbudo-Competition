import { DEFAULT_KATA_GROUP, getValidKataGroup } from "./constants/katas.js";
import { competitionRulesEngine } from "./rules/competitionRulesEngine.js";

export const DISCIPLINES = Object.entries(competitionRulesEngine.ruleset.disciplines).map(([id, discipline]) => ({
  id,
  label: discipline.label,
  family: discipline.family,
  team: discipline.team,
}));

export function calculateAge(dateNaissance, referenceDate = new Date()) {
  if (!dateNaissance) return "";
  const birth = new Date(dateNaissance);
  let age = referenceDate.getFullYear() - birth.getFullYear();
  const monthDifference = referenceDate.getMonth() - birth.getMonth();
  if (monthDifference < 0 || (monthDifference === 0 && referenceDate.getDate() < birth.getDate())) age -= 1;
  return age;
}

export function ageBand(age) {
  return competitionRulesEngine.findAgeBand(age).label;
}

export function gradeBand(grade = "") {
  return competitionRulesEngine.gradeBand(grade);
}

export function disciplineLabel(discipline) {
  return competitionRulesEngine.disciplineLabel(discipline);
}

export function determineIndividualMatchWinner({ akaTotal, shiroTotal, akaShikaku = false, shiroShikaku = false }) {
  if (akaShikaku !== shiroShikaku) return akaShikaku ? "shiro" : "aka";
  if (akaTotal > shiroTotal) return "aka";
  if (shiroTotal > akaTotal) return "shiro";
  return null;
}

export function nextPoolTieBreakStep(stageIndex, result) {
  if (result === "AKA" || result === "SHIRO") return { winner: result.toLowerCase(), stageIndex };
  return { winner: null, stageIndex: stageIndex + 1 };
}

export function disciplineIdFromRegistrationCategory(registrationCategory = "") {
  const normalized = registrationCategory.toLowerCase();
  if (normalized.includes("kata") && normalized.includes("équipe")) return "kata_equipe";
  if (normalized.includes("kata")) return "kata_individuel";
  if (normalized.includes("ju randori") && normalized.includes("équipe")) return "ju_randori_equipe";
  if (normalized.includes("ju randori")) return "ju_randori";
  if (normalized.includes("dantai")) return "dantai_randori";
  return "randori";
}

export function getRegistrationCategories(inscription) {
  if (inscription.typeInscription === "Arbitre") return [];
  if (Array.isArray(inscription.categoriesInscription) && inscription.categoriesInscription.length > 0) return inscription.categoriesInscription;
  if (inscription.categorieInscription) return [inscription.categorieInscription];
  return getEligibleDisciplines(inscription).map(disciplineLabel);
}

export function getEligibleDisciplines(inscription) {
  if (inscription.discipline === "both") return ["kata_individuel", "randori"];
  if (inscription.discipline === "kata") return ["kata_individuel"];
  return ["randori"];
}

export function buildAutomaticCategories(inscriptions) {
  const groups = new Map();
  inscriptions.forEach((inscription) => {
    getRegistrationCategories(inscription).forEach((registrationCategory) => {
      const discipline = disciplineIdFromRegistrationCategory(registrationCategory);
      const age = inscription.age ?? calculateAge(inscription.dateNaissance);
      const key = [registrationCategory, ageBand(age), inscription.sexe, gradeBand(inscription.grade)].join("|");
      if (!groups.has(key)) {
        groups.set(key, {
          id: `${discipline}-${key}`.replace(/\s+/g, "-").toLowerCase(),
          nom: `${registrationCategory} · ${ageBand(age)} · ${inscription.sexe} · ${gradeBand(inscription.grade)}`,
          discipline,
          registrationCategory,
          ageGroup: ageBand(age),
          sexe: inscription.sexe,
          gradeGroup: gradeBand(inscription.grade),
          competitorIds: [],
          kataGroup: competitionRulesEngine.isKataDiscipline(discipline) ? DEFAULT_KATA_GROUP : "",
          statut: "À valider",
        });
      }
      groups.get(key).competitorIds.push(inscription.id);
    });
  });
  return Array.from(groups.values()).map((category, index) => ({ ...category, id: `${Date.now()}-${index}`, statut: category.competitorIds.length >= competitionRulesEngine.ruleset.categories.minimumCompetitors ? "Prête" : "À fusionner" }));
}

export function shuffle(items) {
  return [...items].sort(() => Math.random() - 0.5);
}

export function generateMatches(competitorIds, category, poolIndex = 0, tatami = 1) {
  if (competitionRulesEngine.isKataDiscipline(category.discipline)) {
    return competitorIds.map((competitorId, index) => ({
      id: `${Date.now()}-${category.id}-${poolIndex}-kata-${index}`,
      categoryId: category.id,
      discipline: category.discipline,
      competitorId,
      akaId: competitorId,
      shiroId: null,
      akaScore: null,
      shiroScore: null,
      winnerId: null,
      kataName: "",
      kataGroup: getValidKataGroup(category.kataGroup),
      kataScores: [],
      finalScore: null,
      tatami,
      ordre: index + 1,
      horaire: "",
      statut: "À jouer",
    }));
  }
  const matches = [];
  const rotation = [...competitorIds];
  if (rotation.length % 2 === 1) rotation.push(null);
  const roundCount = Math.max(0, rotation.length - 1);
  for (let round = 0; round < roundCount; round += 1) {
    for (let index = 0; index < rotation.length / 2; index += 1) {
      const akaId = rotation[index];
      const shiroId = rotation[rotation.length - 1 - index];
      if (!akaId || !shiroId) continue;
      matches.push({
        id: `${Date.now()}-${category.id}-${poolIndex}-${round}-${index}`,
        categoryId: category.id,
        discipline: category.discipline,
        akaId,
        shiroId,
        akaScore: null,
        shiroScore: null,
        winnerId: null,
        avertissementsAka: 0,
        avertissementsShiro: 0,
        penalitesAka: {},
        penalitesShiro: {},
        tatami,
        ordre: matches.length + 1,
        horaire: "",
        statut: "À jouer",
      });
    }
    rotation.splice(1, 0, rotation.pop());
  }
  return matches;
}

export function setPoolTatami(pool, tatami) {
  return { ...pool, tatami, matches: (pool.matches || []).map((match) => ({ ...match, tatami })) };
}

export function buildPoolsForCategory(category, options = {}) {
  const { tatamiCount = 1, startIndex = 0 } = options;
  const normalizedTatamiCount = Math.max(1, Number(tatamiCount) || 1);
  const shuffled = shuffle(category.competitorIds);
  const poolCount = Math.max(1, Math.ceil(shuffled.length / 4));
  const buckets = Array.from({ length: poolCount }, () => []);
  shuffled.forEach((id, index) => buckets[index % poolCount].push(id));
  return buckets.filter((ids) => ids.length > 0).map((ids, index) => {
    const tatami = ((startIndex + index) % normalizedTatamiCount) + 1;
    return {
      id: `${Date.now()}-${category.id}-${index}`,
      categoryId: category.id,
      discipline: category.discipline,
      nom: `${category.nom} · Poule ${index + 1}`,
      competitorIds: ids,
      tatami,
      matches: generateMatches(ids, category, index, tatami),
      statut: "À valider",
      rankingLocked: [],
      podium: null,
    };
  });
}

function kataScore(match) {
  return match?.statut === "Terminé" ? Number(match.finalScore ?? match.akaScore ?? 0) : null;
}

function kataScoreVector(pool, competitorId) {
  const matches = (pool.matches || []).filter((match) => (match.competitorId === competitorId || match.akaId === competitorId) && match.statut === "Terminé");
  const baseMatch = matches.find((match) => !match.isKataTieBreak);
  const tieBreakScores = matches
    .filter((match) => match.isKataTieBreak)
    .sort((a, b) => Number(a.kataTieBreakRound || 0) - Number(b.kataTieBreakRound || 0))
    .map(kataScore);
  return [kataScore(baseMatch) ?? 0, ...tieBreakScores];
}

function compareScoreVectors(a = [], b = []) {
  const length = Math.max(a.length, b.length);
  for (let index = 0; index < length; index += 1) {
    const aScore = a[index] ?? Number.NEGATIVE_INFINITY;
    const bScore = b[index] ?? Number.NEGATIVE_INFINITY;
    if (aScore !== bScore) return bScore - aScore;
  }
  return 0;
}

function sameScoreVector(a = [], b = []) {
  return a.length === b.length && a.every((score, index) => score === b[index]);
}

export function calculateRanking(pool) {
  if (competitionRulesEngine.isKataDiscipline(pool.discipline)) {
    return pool.competitorIds.map((id) => {
      const scoreVector = kataScoreVector(pool, id);
      const score = scoreVector[0] ?? 0;
      return { competitorId: id, victories: 0, defeats: 0, draws: 0, scoreFor: score, scoreAgainst: 0, difference: score, finalScore: score, kataScoreVector: scoreVector };
    }).sort((a, b) => compareScoreVectors(a.kataScoreVector, b.kataScoreVector));
  }
  const ranking = pool.competitorIds.map((id) => ({ competitorId: id, victories: 0, defeats: 0, draws: 0, scoreFor: 0, scoreAgainst: 0, difference: 0, negativePoints: 0 }));
  (pool.matches || []).forEach((match) => {
    if (match.statut !== "Terminé") return;
    const aka = ranking.find((item) => item.competitorId === match.akaId);
    const shiro = ranking.find((item) => item.competitorId === match.shiroId);
    if (!aka || !shiro) return;
    aka.scoreFor += match.akaScore || 0; aka.scoreAgainst += match.shiroScore || 0;
    shiro.scoreFor += match.shiroScore || 0; shiro.scoreAgainst += match.akaScore || 0;
    aka.negativePoints += match.akaNegative ?? (match.penalties?.aka || []).reduce((total, penalty) => total + Number(penalty.value || 0), 0);
    shiro.negativePoints += match.shiroNegative ?? (match.penalties?.shiro || []).reduce((total, penalty) => total + Number(penalty.value || 0), 0);
    if (match.winnerId === match.akaId) { aka.victories += 1; shiro.defeats += 1; }
    else if (match.winnerId === match.shiroId) { shiro.victories += 1; aka.defeats += 1; }
    else { aka.draws += 1; shiro.draws += 1; }
  });
  ranking.forEach((item) => { item.difference = item.scoreFor - item.scoreAgainst; });
  const tieBreakPositions = new Map((pool.poolTieBreakOrder || []).map((competitorId, index) => [competitorId, index]));
  return ranking.sort((a, b) => b.victories - a.victories
    || b.difference - a.difference
    || b.scoreFor - a.scoreFor
    || a.negativePoints - b.negativePoints
    || (tieBreakPositions.get(a.competitorId) ?? Number.MAX_SAFE_INTEGER) - (tieBreakPositions.get(b.competitorId) ?? Number.MAX_SAFE_INTEGER));
}

function samePoolResult(a, b) {
  return a.victories === b.victories && a.difference === b.difference && a.scoreFor === b.scoreFor;
}

function unresolvedKataTieGroups(pool) {
  const ranking = calculateRanking(pool);
  const groups = [];
  for (let start = 0; start < ranking.length;) {
    let end = start + 1;
    while (end < ranking.length && sameScoreVector(ranking[start].kataScoreVector, ranking[end].kataScoreVector)) end += 1;
    if (end - start > 1 && start < 3) groups.push(ranking.slice(start, end).map((item) => item.competitorId));
    start = end;
  }
  return groups;
}

export function unresolvedPoolTieGroups(pool) {
  if (competitionRulesEngine.isKataDiscipline(pool.discipline)) return unresolvedKataTieGroups(pool);
  const ranking = calculateRanking({ ...pool, poolTieBreakOrder: [] });
  const resolved = new Set(pool.poolTieBreakOrder || []);
  const groups = [];
  for (let start = 0; start < ranking.length;) {
    let end = start + 1;
    while (end < ranking.length && samePoolResult(ranking[start], ranking[end])) end += 1;
    const resultGroup = ranking.slice(start, end);
    for (let negativeStart = 0; negativeStart < resultGroup.length;) {
      let negativeEnd = negativeStart + 1;
      while (negativeEnd < resultGroup.length && resultGroup[negativeEnd].negativePoints === resultGroup[negativeStart].negativePoints) negativeEnd += 1;
      const competitorIds = resultGroup.slice(negativeStart, negativeEnd).map((item) => item.competitorId);
      if (competitorIds.length > 1 && competitorIds.some((id) => !resolved.has(id))) groups.push(competitorIds);
      negativeStart = negativeEnd;
    }
    start = end;
  }
  return groups;
}

export function createKataTieBreakMatches(pool, tieGroups = []) {
  if (!competitionRulesEngine.isKataDiscipline(pool.discipline) || tieGroups.length === 0) return pool;
  const existingMatches = pool.matches || [];
  let nextOrder = existingMatches.reduce((maximum, match) => Math.max(maximum, Number(match.ordre || 0)), 0) + 1;
  const createdAt = Date.now();
  const newMatches = [];

  tieGroups.forEach((competitorIds, groupIndex) => {
    const previousRound = existingMatches
      .filter((match) => match.isKataTieBreak && competitorIds.includes(match.competitorId || match.akaId))
      .reduce((maximum, match) => Math.max(maximum, Number(match.kataTieBreakRound || 0)), 0);
    const round = previousRound + 1;
    const mode = round === 1 ? "Kata supplémentaire libre" : "Kata imposé";

    competitorIds.forEach((competitorId, competitorIndex) => {
      const baseMatch = existingMatches.find((match) => !match.isKataTieBreak && (match.competitorId === competitorId || match.akaId === competitorId));
      newMatches.push({
        id: `${createdAt}-${pool.id}-kata-tiebreak-${groupIndex}-${round}-${competitorIndex}`,
        categoryId: pool.categoryId,
        discipline: pool.discipline,
        competitorId,
        akaId: competitorId,
        shiroId: null,
        akaScore: null,
        shiroScore: null,
        winnerId: null,
        kataName: "",
        kataGroup: baseMatch?.kataGroup || DEFAULT_KATA_GROUP,
        kataScores: [],
        finalScore: null,
        tatami: pool.tatami || baseMatch?.tatami || 1,
        ordre: nextOrder++,
        horaire: "",
        statut: "À jouer",
        isKataTieBreak: true,
        kataTieBreakRound: round,
        kataTieBreakMode: mode,
      });
    });
  });

  return { ...pool, matches: [...existingMatches, ...newMatches], statut: "En attente de départage", rankingLocked: [], podium: null };
}

export function podiumFromPool(pool) {
  const ranking = calculateRanking(pool);
  return { firstId: ranking[0]?.competitorId || null, secondId: ranking[1]?.competitorId || null, thirdId: ranking[2]?.competitorId || null };
}

export function isPoolComplete(pool) {
  return (pool.matches || []).length > 0 && pool.matches.every((match) => match.statut === "Terminé");
}

// Unique entry point used by the manual fallback button and automatic closing.
export function calculatePoolPodium(pool) {
  if (!isPoolComplete(pool)) return { pool, tieGroups: [] };
  const tieGroups = unresolvedPoolTieGroups(pool);
  if (tieGroups.length) return { pool: { ...pool, rankingLocked: [], podium: null, statut: "En attente de départage" }, tieGroups };
  return {
    pool: { ...pool, rankingLocked: calculateRanking(pool), podium: podiumFromPool(pool), statut: "Terminée" },
    tieGroups: [],
  };
}
