export const KATA_PLACEHOLDER = "Choisir un kata…";

export const JUNIOR_KATA_GROUP = "Juniors";
export const SENIOR_KATA_GROUP = "Seniors";

export const JUNIOR_KATAS = [
  "Nanbu Shodan",
  "Nanbu Nidan",
  "Nanbu Sandan",
  "Nanbu Yondan",
  "Nanbu Godan",
  "Ikkyoku",
  "Hyaku Hachi",
  "Seienchin",
];

export const SENIOR_KATAS = [
  ...JUNIOR_KATAS,
  "Seipai",
  "Sampo Sho",
  "Shin Tajima",
  "Kaguya Hime",
];

export const KATA_GROUPS = {
  "Kata 0": [
    "Randori-Tori",
    "Sotai Randori-Tori",
  ],
  "Kata 1": [
    "Shiho-taï Tsuki",
    "Shiho-taï Ten",
    "Shiho-taï Chi",
    "Shiho-taï Hasu",
    "Shiho-taï Mizu",
    "Shiho-taï Ki",
    "Shiho-taï Ku",
  ],
  "Kata 2": JUNIOR_KATAS,
  [JUNIOR_KATA_GROUP]: JUNIOR_KATAS,
  [SENIOR_KATA_GROUP]: SENIOR_KATAS,
};

export const KATA_GROUP_OPTIONS = Object.keys(KATA_GROUPS);
export const DEFAULT_KATA_GROUP = JUNIOR_KATA_GROUP;

export function getKatasForGroup(kataGroup = DEFAULT_KATA_GROUP) {
  return KATA_GROUPS[kataGroup] || KATA_GROUPS[DEFAULT_KATA_GROUP];
}

function normalizeCategoryName(categoryName = "") {
  return categoryName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function kataGroupForAgeGroup(ageGroup = "") {
  const normalizedAgeGroup = normalizeCategoryName(ageGroup);
  if (normalizedAgeGroup.includes("senior")) return SENIOR_KATA_GROUP;
  if (normalizedAgeGroup.includes("junior")) return JUNIOR_KATA_GROUP;
  return DEFAULT_KATA_GROUP;
}

export function getKatasForCategory(categoryName = "", kataGroup = "") {
  if (kataGroup) return getKatasForGroup(kataGroup);

  const normalizedCategoryName = normalizeCategoryName(categoryName);
  if (normalizedCategoryName.includes("senior")) return getKatasForGroup(SENIOR_KATA_GROUP);
  if (normalizedCategoryName.includes("junior")) return getKatasForGroup(JUNIOR_KATA_GROUP);
  const matchingGroup = KATA_GROUP_OPTIONS.find((group) => normalizeCategoryName(group) === normalizedCategoryName);

  if (matchingGroup) return getKatasForGroup(matchingGroup);

  return getKatasForGroup(DEFAULT_KATA_GROUP);
}
