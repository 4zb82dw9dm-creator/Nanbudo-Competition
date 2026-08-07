export const KATA_PLACEHOLDER = "Choisir un kata…";

export const KATA_2_KATAS = [
  "Nanbu Shodan",
  "Nanbu Nidan",
  "Nanbu Sandan",
  "Nanbu Yondan",
  "Nanbu Godan",
  "Ikkyoku",
  "Hyaku Hachi",
  "Seienchin",
];

export const KATA_GROUPS = {
  "Kata 0": [
    "Randori-tori",
    "Sotai randori-tori",
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
  "Kata 2": KATA_2_KATAS,
};

export const KATA_GROUP_OPTIONS = Object.keys(KATA_GROUPS);
export const DEFAULT_KATA_GROUP = "Kata 2";

export function getValidKataGroup(kataGroup = DEFAULT_KATA_GROUP) {
  return KATA_GROUP_OPTIONS.includes(kataGroup) ? kataGroup : DEFAULT_KATA_GROUP;
}

export function getKatasForGroup(kataGroup = DEFAULT_KATA_GROUP) {
  return KATA_GROUPS[getValidKataGroup(kataGroup)];
}

export function getKatasForCategory(_categoryName = "", kataGroup = "") {
  return getKatasForGroup(kataGroup);
}
