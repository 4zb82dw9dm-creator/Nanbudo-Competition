export const CHILD_DISCIPLINE_MAX_AGE = 12;

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

export function normalizeCategoryForAge(category, competitors = []) {
  const maxAge = categoryMaxAge(category, competitors);
  if (maxAge === null || maxAge <= CHILD_DISCIPLINE_MAX_AGE) return category;

  if (category.discipline === "randori") {
    return {
      ...category,
      discipline: "ju_randori",
      registrationCategory: "Ju Randori",
      nom: String(category.nom || "").replace(/^Randori\b/, "Ju Randori"),
      ageRuleAdjusted: true,
    };
  }

  if ((category.discipline === "kata_individuel" || category.discipline === "kata_equipe") && ["Kata 0", "Kata 1"].includes(category.kataGroup)) {
    return {
      ...category,
      kataGroup: "Kata 2",
      nom: String(category.nom || "").replace(/^Kata [01]\b/, "Kata 2"),
      ageRuleAdjusted: true,
    };
  }

  return category;
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
