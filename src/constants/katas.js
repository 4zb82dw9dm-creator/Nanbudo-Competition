export const KATA_PLACEHOLDER = "Choisir un kata…";

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
  "Kata 2": [
    "Nanbu Shodan",
    "Nanbu Nidan",
    "Nanbu Sandan",
    "Nanbu Yondan",
    "Nanbu Godan",
    "Ikkyoku",
    "Nikyoku",
    "Sankyoku",
    "Yonkyoku",
    "Gokyoku",
    "Rokkyoku",
    "Nanakyoku",
    "Happokyoku",
    "Kyukoku",
    "Jukyoku",
  ],
};

export const KATA_GROUP_OPTIONS = Object.keys(KATA_GROUPS);
export const DEFAULT_KATA_GROUP = "Kata 2";

export function getKatasForGroup(kataGroup = DEFAULT_KATA_GROUP) {
  return KATA_GROUPS[kataGroup] || KATA_GROUPS[DEFAULT_KATA_GROUP];
}

function normalizeCategoryName(categoryName = "") {
  return categoryName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function getKatasForCategory(categoryName = "", kataGroup = "") {
  if (kataGroup) return getKatasForGroup(kataGroup);

  const normalizedCategoryName = normalizeCategoryName(categoryName);
  const matchingGroup = KATA_GROUP_OPTIONS.find((group) => normalizeCategoryName(group) === normalizedCategoryName);

  if (matchingGroup) return getKatasForGroup(matchingGroup);

  return getKatasForGroup(DEFAULT_KATA_GROUP);
}
