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
      id: `${Date.now()}-${poolIndex}-kata-${index}`,
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
  for (let i = 0; i < competitorIds.length; i += 1) {
    for (let j = i + 1; j < competitorIds.length; j += 1) {
      matches.push({
        id: `${Date.now()}-${poolIndex}-${i}-${j}`,
        categoryId: category.id,
        discipline: category.discipline,
        akaId: competitorIds[i],
        shiroId: competitorIds[j],
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

export function calculateRanking(pool) {
  if (competitionRulesEngine.isKataDiscipline(pool.discipline)) {
    return pool.competitorIds.map((id) => {
      const match = (pool.matches || []).find((item) => item.competitorId === id || item.akaId === id);
      const score = match?.statut === "Terminé" ? (match.finalScore ?? match.akaScore ?? 0) : 0;
      return { competitorId: id, victories: 0, defeats: 0, draws: 0, scoreFor: score, scoreAgainst: 0, difference: score, finalScore: score };
    }).sort((a, b) => b.finalScore - a.finalScore);
  }
  const ranking = pool.competitorIds.map((id) => ({ competitorId: id, victories: 0, defeats: 0, draws: 0, scoreFor: 0, scoreAgainst: 0, difference: 0 }));
  (pool.matches || []).forEach((match) => {
    if (match.statut !== "Terminé") return;
    const aka = ranking.find((item) => item.competitorId === match.akaId);
    const shiro = ranking.find((item) => item.competitorId === match.shiroId);
    if (!aka || !shiro) return;
    aka.scoreFor += match.akaScore || 0; aka.scoreAgainst += match.shiroScore || 0;
    shiro.scoreFor += match.shiroScore || 0; shiro.scoreAgainst += match.akaScore || 0;
    if (match.winnerId === match.akaId) { aka.victories += 1; shiro.defeats += 1; }
    else if (match.winnerId === match.shiroId) { shiro.victories += 1; aka.defeats += 1; }
    else { aka.draws += 1; shiro.draws += 1; }
  });
  ranking.forEach((item) => { item.difference = item.scoreFor - item.scoreAgainst; });
  return ranking.sort((a, b) => b.victories - a.victories || b.difference - a.difference || b.scoreFor - a.scoreFor);
}

export function podiumFromPool(pool) {
  const ranking = calculateRanking(pool);
  return { firstId: ranking[0]?.competitorId || null, secondId: ranking[1]?.competitorId || null, thirdId: ranking[2]?.competitorId || null };
}
