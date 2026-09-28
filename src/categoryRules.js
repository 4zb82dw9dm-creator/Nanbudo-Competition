export const FFK_SEASON_START_YEAR = 2026;

export const FFK_BIRTH_YEAR_CATEGORIES_2026_2027 = [
  { id: "mini-poussins", label: "Mini-poussins", from: 2021, to: 2022 },
  { id: "poussins", label: "Poussins", from: 2019, to: 2020 },
  { id: "pupilles", label: "Pupilles", from: 2017, to: 2018 },
  { id: "benjamins", label: "Benjamins", from: 2015, to: 2016 },
  { id: "minimes", label: "Minimes", from: 2013, to: 2014 },
  { id: "cadets", label: "Cadets", from: 2011, to: 2012 },
  { id: "juniors", label: "Juniors", from: 2009, to: 2010 },
  { id: "seniors", label: "Seniors", from: 1987, to: 2008 },
  { id: "veterans", label: "Vétérans", from: null, to: 1986 },
];

export function categoryFromBirthYear(dateNaissance, fallbackAge = null) {
  const birthYear = Number(String(dateNaissance || "").slice(0, 4));
  if (Number.isFinite(birthYear) && birthYear > 1900) {
    return FFK_BIRTH_YEAR_CATEGORIES_2026_2027.find(({ from, to }) =>
      (from === null || birthYear >= from) && (to === null || birthYear <= to)
    )?.label || "Catégorie à vérifier";
  }
  const age = Number(fallbackAge);
  if (!Number.isFinite(age)) return "Catégorie à vérifier";
  if (age <= 5) return "Mini-poussins";
  if (age <= 7) return "Poussins";
  if (age <= 9) return "Pupilles";
  if (age <= 11) return "Benjamins";
  if (age <= 13) return "Minimes";
  if (age <= 15) return "Cadets";
  if (age <= 17) return "Juniors";
  if (age <= 39) return "Seniors";
  return "Vétérans";
}

export const CHILD_DISCIPLINE_MAX_AGE = 11;

export function categoryCompetitionRule(ageGroup) {
  if (["Mini-poussins", "Poussins"].includes(ageGroup)) return { ageGroup, kataGroup: "Kata 0", combatDisciplines: ["randori"] };
  if (["Pupilles", "Benjamins"].includes(ageGroup)) return { ageGroup, kataGroup: "Kata 1", combatDisciplines: ["randori"] };
  if (["Minimes", "Cadets", "Juniors", "Seniors", "Vétérans"].includes(ageGroup)) return { ageGroup, kataGroup: "Kata 2", combatDisciplines: ["ju_randori"] };
  return null;
}

export function registrationDisciplinesForCategory(ageGroup) {
  const rule = categoryCompetitionRule(ageGroup);
  if (!rule) return [];
  return [rule.kataGroup, rule.combatDisciplines[0] === "randori" ? "Randori" : "Ju Randori"];
}

export function ageCompetitionRule(age) {
  const numericAge = Number(age);
  if (!Number.isFinite(numericAge)) return null;
  if (numericAge >= 5 && numericAge <= 7) return categoryCompetitionRule("Poussins");
  if (numericAge >= 8 && numericAge <= 9) return categoryCompetitionRule("Pupilles");
  if (numericAge >= 10 && numericAge <= 11) return categoryCompetitionRule("Benjamins");
  if (numericAge >= 12 && numericAge <= 13) return categoryCompetitionRule("Minimes");
  if (numericAge >= 14 && numericAge <= 15) return categoryCompetitionRule("Cadets");
  if (numericAge >= 16 && numericAge <= 17) return categoryCompetitionRule("Juniors");
  if (numericAge >= 18 && numericAge <= 39) return categoryCompetitionRule("Seniors");
  if (numericAge >= 40) return categoryCompetitionRule("Vétérans");
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
  const rule = categoryCompetitionRule(category.ageGroup) || categoryAgeCompetitionRule(category, competitors);
  if (!rule) return category;

  let normalized = { ...category };

  if (category.manual !== true && ["randori", "ju_randori"].includes(normalized.discipline) && !rule.combatDisciplines.includes(normalized.discipline)) {
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
      nom: String(normalized.nom || "").replace(/^Kata [012]\b/, rule.kataGroup),
      ageRuleAdjusted: true,
    };
  }

  return normalized;
}

const MINIMUM_POOL_SIZE = 3;

function categoryWithSex(category, sex, competitorIds, index, extra = {}) {
  const currentName = String(category.nom || "");
  const sexPattern = / · (Mixte|Homme|Femme|Non renseigné)(?= ·|$)/;
  return {
    ...category,
    id: `${category.id}-sex-${index}`,
    sexe: sex,
    competitorIds,
    nom: sexPattern.test(currentName)
      ? currentName.replace(sexPattern, ` · ${sex}`)
      : `${currentName} · ${sex}`,
    autoSexSplit: true,
    ...extra,
  };
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

  const entries = [...groups.entries()].map(([sex, competitorIds]) => ({ sex, competitorIds }));
  const completeGroups = entries.filter(({ competitorIds }) => competitorIds.length >= MINIMUM_POOL_SIZE);
  const isolatedIds = entries.filter(({ competitorIds }) => competitorIds.length < MINIMUM_POOL_SIZE).flatMap(({ competitorIds }) => competitorIds);

  // Every sex that can form a complete pool stays strictly separated.
  if (isolatedIds.length === 0) {
    return completeGroups.map(({ sex, competitorIds }, index) => categoryWithSex(category, sex, competitorIds, index));
  }

  // Several undersized groups may together form the only valid mixed pool.
  if (isolatedIds.length >= MINIMUM_POOL_SIZE) {
    return [
      ...completeGroups.map(({ sex, competitorIds }, index) => categoryWithSex(category, sex, competitorIds, index)),
      categoryWithSex(category, "Mixte", isolatedIds, completeGroups.length, { autoMixedFallback: true }),
    ];
  }

  // Borrow only the minimum number of competitors from a complete group, and only
  // when that group can still keep a complete non-mixed pool.
  const needed = MINIMUM_POOL_SIZE - isolatedIds.length;
  const donorIndex = completeGroups.findIndex(({ competitorIds }) => competitorIds.length - needed >= MINIMUM_POOL_SIZE);
  if (donorIndex >= 0) {
    const separated = completeGroups.map(({ sex, competitorIds }) => ({ sex, competitorIds: [...competitorIds] }));
    const donors = separated[donorIndex].competitorIds.splice(-needed);
    return [
      ...separated.map(({ sex, competitorIds }, index) => categoryWithSex(category, sex, competitorIds, index)),
      categoryWithSex(category, "Mixte", [...isolatedIds, ...donors], separated.length, { autoMixedFallback: true }),
    ];
  }

  // Mixing the whole category is the last resort when separation would strand
  // one or two competitors without any complete pool.
  return [categoryWithSex(category, "Mixte", members.map(({ id }) => id), 0, { autoMixedFallback: true })];
}

export function prepareCategoriesForPools(categories = [], competitors = []) {
  return categories.flatMap((category) => splitCategoryBySex(normalizeCategoryForAge(category, competitors), competitors));
}
