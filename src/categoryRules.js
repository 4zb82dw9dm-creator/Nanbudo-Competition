export const CHILD_DISCIPLINE_MAX_AGE = 11;

export function ageCompetitionRule(age) {
  const numericAge = Number(age);
  if (!Number.isFinite(numericAge)) return null;
  if (numericAge >= 6 && numericAge <= 7) return { ageGroup: "Poussins", kataGroup: "Kata 0", combatDisciplines: ["randori"] };
  if (numericAge >= 8 && numericAge <= 9) return { ageGroup: "Pupilles", kataGroup: "Kata 1", combatDisciplines: ["randori"] };
  if (numericAge >= 10 && numericAge <= 11) return { ageGroup: "Benjamins", kataGroup: "Kata 1", combatDisciplines: ["randori", "ju_randori"] };
  if (numericAge >= 12) return { ageGroup: null, kataGroup: "Kata 2", combatDisciplines: ["ju_randori"] };
  return null;
}

export function competitorAge(competitor = {}) {
  if (competitor.age !== "" && competitor.age !== undefined && competitor.age !== null) return Number(competitor.age);
  if (!competitor.dateNaissance) return null;
  const birth = new Date(competitor.dateNaissance);
  if (Number.isNaN(birth.getTime())) return null;
  const reference = new Date();
  let age = reference.getFullYear() - birth.getFullYear();
  const monthDifference = reference.getMonth() - birth.getMonth();
  if (monthDifference < 0 || (monthDifference === 0 && reference.getDate() < birth.getDate())) age -= 1;
  return age;
}

export function categoryCompetitors(category, competitors = []) {
  const ids = new Set((category.competitorIds || []).map(String));
  return competitors.filter((competitor) => ids.has(String(competitor.id)));
}

export function categoryMaxAge(category, competitors = []) {
  const ages = categoryCompetitors(category, competitors).map(competitorAge).filter((age) => Number.isFinite(age));
  return ages.length ? Math.max(...ages) : null;
}

export function categorySexes(category, competitors = []) {
  return [...new Set(categoryCompetitors(category, competitors).map((competitor) => competitor.sexe || "Non renseigné"))];
}

export function categoryAgeCompetitionRule(category, competitors = []) {
  return ageCompetitionRule(categoryMaxAge(category, competitors));
}

export function normalizeCategoryForAge(category, competitors = []) {
  if (category.manual === true) return category;
  const rule = categoryAgeCompetitionRule(category, competitors);
  if (!rule) return category;

  let normalized = { ...category };

  if (["randori", "ju_randori"].includes(normalized.discipline) && !rule.combatDisciplines.includes(normalized.discipline)) {
    const discipline = rule.combatDisciplines[0];
    const registrationCategory = discipline === "ju_randori" ? "Ju Randori" : "Randori";
    normalized = {
      ...normalized,
      discipline,
      registrationCategory,
      nom: String(normalized.nom || "").replace(/^(Randori|Ju Randori)\b/, registrationCategory),
      ageRuleAdjusted: true,
    };
  }

  if (["kata_individuel", "kata_equipe"].includes(normalized.discipline) && normalized.kataGroup !== rule.kataGroup) {
    normalized = {
      ...normalized,
      kataGroup: rule.kataGroup,
      ageRuleAdjusted: true,
    };
  }

  return normalized;
}

export function splitCategoryBySex(category, competitors = []) {
  if (category.manualMixed === true) return [category];
  const members = categoryCompetitors(category, competitors);
  const groups = new Map();
  members.forEach((competitor) => {
    const sex = competitor.sexe || "Non renseigné";
    if (!groups.has(sex)) groups.set(sex, []);
    groups.get(sex).push(competitor.id);
  });
  if (groups.size <= 1) return [category];
  return [...groups.entries()].map(([sex, competitorIds], index) => ({
    ...category,
    id: `${category.id}-sex-${index}`,
    sexe: sex,
    competitorIds,
    nom: String(category.nom || "").replace(/ · Mixte(?= ·|$)/, ` · ${sex}`),
    autoSexSplit: true,
  }));
}

export function prepareCategoriesForPools(categories = [], competitors = []) {
  return categories.flatMap((category) => splitCategoryBySex(normalizeCategoryForAge(category, competitors), competitors));
}
