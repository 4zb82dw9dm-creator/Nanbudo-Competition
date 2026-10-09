import { DEFAULT_KATA_GROUP, getValidKataGroup } from "./constants/katas.js";
import { competitionRulesEngine } from "./rules/competitionRulesEngine.js";
import { ageCompetitionRule, categoryCompetitionRule, categoryFromBirthYear } from "./categoryRules.js";

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

export function determineIndividualMatchWinner({ akaTotal, shiroTotal, akaShikaku = false, shiroShikaku = false, akaDisqualified = akaShikaku, shiroDisqualified = shiroShikaku }) {
  if (akaDisqualified !== shiroDisqualified) return akaDisqualified ? "shiro" : "aka";
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
      const birthCategory = categoryFromBirthYear(inscription.dateNaissance, age);
      const key = [registrationCategory, birthCategory, inscription.sexe, gradeBand(inscription.grade)].join("|");
      if (!groups.has(key)) {
        groups.set(key, {
          id: `${discipline}-${key}`.replace(/\s+/g, "-").toLowerCase(),
          nom: `${registrationCategory} · ${birthCategory} · ${inscription.sexe} · ${gradeBand(inscription.grade)}`,
          discipline,
          registrationCategory,
          ageGroup: birthCategory,
          sexe: inscription.sexe,
          gradeGroup: gradeBand(inscription.grade),
          competitorIds: [],
          kataGroup: competitionRulesEngine.isKataDiscipline(discipline) ? (categoryCompetitionRule(birthCategory)?.kataGroup || ageCompetitionRule(age)?.kataGroup || DEFAULT_KATA_GROUP) : "",
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
    const createdAt = Date.now();
    return [1, 2].flatMap((kataRound) => competitorIds.map((competitorId, index) => ({
      id: `${createdAt}-${category.id}-${poolIndex}-kata-r${kataRound}-${index}`,
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
      kataRound,
      tatami,
      ordre: (kataRound - 1) * competitorIds.length + index + 1,
      horaire: "",
      statut: "À jouer",
    })));
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
  const baseScores = matches
    .filter((match) => !match.isKataTieBreak)
    .sort((a, b) => Number(a.kataRound || 1) - Number(b.kataRound || 1))
    .map(kataScore)
    .filter((score) => score != null);
  const twoRoundTotal = Number(baseScores.slice(0, 2).reduce((sum, score) => sum + score, 0).toFixed(1));
  const tieBreakScores = matches
    .filter((match) => match.isKataTieBreak)
    .sort((a, b) => Number(a.kataTieBreakRound || 0) - Number(b.kataTieBreakRound || 0))
    .map(kataScore);
  return [twoRoundTotal, ...tieBreakScores.slice(0, 1)];
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

function usesJuRandoriPoolTieBreak(discipline) {
  return discipline === "ju_randori" || discipline === "ju_randori_equipe";
}

function directEncounterWinner(pool, competitorA, competitorB) {
  const match = (pool.matches || []).find((item) => item.statut === "Terminé"
    && ((item.akaId === competitorA && item.shiroId === competitorB) || (item.akaId === competitorB && item.shiroId === competitorA)));
  return match?.winnerId === competitorA || match?.winnerId === competitorB ? match.winnerId : null;
}

export function calculateRanking(pool) {
  if (competitionRulesEngine.isKataDiscipline(pool.discipline)) {
    return pool.competitorIds.map((id) => {
      const scoreVector = kataScoreVector(pool, id);
      const score = scoreVector[0] ?? 0;
      const completedBaseRounds = (pool.matches || []).filter((match) => !match.isKataTieBreak && (match.competitorId === id || match.akaId === id) && match.statut === "Terminé").length;
      const average = completedBaseRounds >= 2 ? Number((score / 2).toFixed(2)) : null;
      return { competitorId: id, victories: 0, defeats: 0, draws: 0, scoreFor: score, scoreAgainst: 0, difference: score, finalScore: score, kataTotal: score, kataAverage: average, kataRoundsCompleted: completedBaseRounds, kataScoreVector: scoreVector };
    }).sort((a, b) => compareScoreVectors(a.kataScoreVector, b.kataScoreVector)
      || (pool.kataFlagOrder || []).indexOf(a.competitorId) - (pool.kataFlagOrder || []).indexOf(b.competitorId));
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
    || a.negativePoints - b.negativePoints
    || ((tieBreakPositions.has(a.competitorId) && tieBreakPositions.has(b.competitorId))
      ? tieBreakPositions.get(a.competitorId) - tieBreakPositions.get(b.competitorId) : 0)
    || (directEncounterWinner(pool, a.competitorId, b.competitorId) === a.competitorId ? -1
      : directEncounterWinner(pool, a.competitorId, b.competitorId) === b.competitorId ? 1 : 0));
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
  return groups.filter((ids) => !ids.every((id) => (pool.kataFlagOrder || []).includes(id)));
}

export function unresolvedPoolTieGroups(pool) {
  if (competitionRulesEngine.isKataDiscipline(pool.discipline)) return unresolvedKataTieGroups(pool);
  const ranking = calculateRanking({ ...pool, poolTieBreakOrder: [] });
  const resolved = new Set(pool.poolTieBreakOrder || []);
  const groups = [];
  for (let start = 0; start < ranking.length;) {
    let end = start + 1;
    while (end < ranking.length
      && ranking[end].victories === ranking[start].victories
      && ranking[end].negativePoints === ranking[start].negativePoints) end += 1;
    const ids = ranking.slice(start, end).map((item) => item.competitorId);
    if (ids.length === 2 && directEncounterWinner(pool, ids[0], ids[1])) {
      start = end;
      continue;
    }
    if (ids.length > 1 && ids.some((id) => !resolved.has(id))) groups.push(ids);
    start = end;
  }
  return groups;
}

export function createKataTieBreakMatches(pool, tieGroups = []) {
  if (!competitionRulesEngine.isKataDiscipline(pool.discipline) || tieGroups.length === 0) return pool;
  const existingMatches = pool.matches || [];
  // Never create another scored Kata round after the imposed Kata.
  if (existingMatches.some((match) => match.isKataTieBreak)) return pool;
  let nextOrder = existingMatches.reduce((maximum, match) => Math.max(maximum, Number(match.ordre || 0)), 0) + 1;
  const createdAt = Date.now();
  const newMatches = [];

  tieGroups.forEach((competitorIds, groupIndex) => {
    const previousRound = existingMatches
      .filter((match) => match.isKataTieBreak && competitorIds.includes(match.competitorId || match.akaId))
      .reduce((maximum, match) => Math.max(maximum, Number(match.kataTieBreakRound || 0)), 0);
    const round = previousRound + 1;
    const mode = "Kata imposé";

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

// Repair legacy Kata pools created with only one round, without losing first-round scores.
export function restoreMissingKataSecondRound(pool) {
  if (!competitionRulesEngine.isKataDiscipline(pool.discipline)) return pool;
  const original = pool.matches || [];
  const regular = original.filter((match) => !match.isKataTieBreak);
  const ids = pool.competitorIds || [];
  if (!ids.length || regular.length !== ids.length) return pool;
  if (!ids.every((id) => regular.filter((match) => (match.competitorId || match.akaId) === id).length === 1)) return pool;
  const ordered = ids.map((id) => regular.find((match) => (match.competitorId || match.akaId) === id));
  const firstRound = ordered.map((match, index) => ({ ...match, kataRound: 1, ordre: index + 1 }));
  const secondRound = ordered.map((match, index) => ({
    ...match,
    id: `${match.id}-kata-round-2`,
    kataRound: 2,
    ordre: ids.length + index + 1,
    kataName: "",
    kataScores: [],
    kataHighestRemoved: undefined,
    kataLowestRemoved: undefined,
    kataRetainedScores: undefined,
    finalScore: null,
    akaScore: null,
    shiroScore: null,
    scoreAka: null,
    scoreShiro: null,
    winnerId: null,
    vainqueur: null,
    startedAt: undefined,
    endedAt: undefined,
    durationSeconds: undefined,
    statut: "À jouer",
  }));
  return { ...pool, matches: [...firstRound, ...secondRound], podium: null, rankingLocked: [], statut: "En cours" };
}

// Legacy competitions may already contain extra free/imposed Kata rounds.
// Keep the earliest completed tie-break for each competitor as the imposed round;
// remove subsequent rounds so the decision can move to flags.
export function normalizeKataTieBreakRounds(pool) {
  if (!competitionRulesEngine.isKataDiscipline(pool.discipline)) return pool;
  const matches = pool.matches || [];
  const ties = matches.filter((match) => match.isKataTieBreak);
  if (!ties.length) return pool;
  const firstByCompetitor = new Set();
  const normalized = matches.filter((match) => {
    if (!match.isKataTieBreak) return true;
    const id = match.competitorId || match.akaId;
    if (firstByCompetitor.has(id)) return false;
    firstByCompetitor.add(id);
    return true;
  }).map((match) => match.isKataTieBreak && (match.kataTieBreakMode !== "Kata imposé" || match.kataTieBreakRound !== 1)
    ? { ...match, kataTieBreakMode: "Kata imposé", kataTieBreakRound: 1 }
    : match);
  if (normalized.length === matches.length && normalized.every((match, index) => match === matches[index])) return pool;
  return { ...pool, matches: normalized, podium: null, rankingLocked: [] };
}

export function isPoolComplete(pool) {
  if (!(pool.matches || []).length || !pool.matches.every((match) => match.statut === "Terminé")) return false;
  if (competitionRulesEngine.isKataDiscipline(pool.discipline)) {
    return (pool.competitorIds || []).every((id) => {
      const rounds = pool.matches.filter((match) => !match.isKataTieBreak && (match.competitorId === id || match.akaId === id));
      return rounds.some((match) => Number(match.kataRound || 1) === 1)
        && rounds.some((match) => Number(match.kataRound || 1) === 2);
    });
  }
  return true;
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

/** Create one final and one bronze match once both qualifying pools are ranked. */
export function synchronizeTwoPoolFinals(pools) {
  const result = [...pools];
  const categories = new Set(result.filter((pool) => !pool.isFinalsPool && !competitionRulesEngine.isKataDiscipline(pool.discipline)).map((pool) => String(pool.categoryId)));
  for (const categoryId of categories) {
    const qualifiers = result.filter((pool) => !pool.isFinalsPool && String(pool.categoryId) === categoryId);
    if (qualifiers.length !== 2) continue;
    const finalsIndex = result.findIndex((pool) => pool.isFinalsPool && String(pool.categoryId) === categoryId);
    const ready = qualifiers.every((pool) => pool.statut === "Terminée" && pool.podium?.firstId && pool.podium?.secondId);
    if (!ready) {
      if (finalsIndex >= 0) result.splice(finalsIndex, 1);
      continue;
    }
    const [a, b] = qualifiers;
    const specs = [
      { finalType: "bronze", akaId: a.podium.secondId, shiroId: b.podium.secondId, ordre: 1 },
      { finalType: "gold", akaId: a.podium.firstId, shiroId: b.podium.firstId, ordre: 2 },
    ];
    const existing = finalsIndex >= 0 ? result[finalsIndex] : null;
    const unchanged = existing && specs.every((spec) => {
      const match = existing.matches?.find((item) => item.finalType === spec.finalType);
      return match && match.akaId === spec.akaId && match.shiroId === spec.shiroId;
    });
    if (unchanged) continue;
    const tatami = a.tatami || b.tatami || 1;
    const matches = specs.map((spec) => ({
      ...spec, id: `final-${categoryId}-${spec.finalType}`, categoryId: a.categoryId,
      discipline: a.discipline, tatami, horaire: "", statut: "À jouer",
      akaScore: null, shiroScore: null, winnerId: null,
    }));
    const finalsPool = {
      id: `finals-${categoryId}`, categoryId: a.categoryId, discipline: a.discipline,
      nom: "Finale et petite finale", isFinalsPool: true, closingMode: "finals",
      competitorIds: [...new Set(matches.flatMap((match) => [match.akaId, match.shiroId]))],
      tatami, matches, statut: "En cours", rankingLocked: [], podium: null,
    };
    if (finalsIndex >= 0) result[finalsIndex] = finalsPool;
    else result.push(finalsPool);
  }
  return result;
}

export function calculateFinalsPodium(pool) {
  const gold = pool.matches.find((match) => match.finalType === "gold");
  const bronze = pool.matches.find((match) => match.finalType === "bronze");
  if (!gold || !bronze || gold.statut !== "Terminé" || bronze.statut !== "Terminé" || !gold.winnerId || !bronze.winnerId) {
    return { pool: { ...pool, statut: "En cours", podium: null }, tieGroups: [] };
  }
  return { pool: { ...pool, statut: "Terminée", podium: {
    firstId: gold.winnerId,
    secondId: gold.winnerId === gold.akaId ? gold.shiroId : gold.akaId,
    thirdId: bronze.winnerId,
  } }, tieGroups: [] };
}
