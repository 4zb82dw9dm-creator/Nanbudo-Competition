export const KATA_PLACEHOLDER = "Choisir un kata…";

export const CADETS_JUNIORS_KATAS = [
  "Nanbu Shodan",
  "Nanbu Nidan",
  "Nanbu Sandan",
  "Nanbu Yondan",
  "Nanbu Godan",
  "Ikkyoku",
  "Hyaku Hachi",
  "Seienchin",
];

export const SENIORS_KATAS = [
  "Nanbu Shodan",
  "Nanbu Nidan",
  "Nanbu Sandan",
  "Nanbu Yondan",
  "Nanbu Godan",
  "Ikkyoku",
  "Hyaku Hachi",
  "Seipai",
  "Seienchin",
  "Sampo Sho",
  "Shin Tajima",
  "Kaguya Hime",
];

export const DEFAULT_KATAS = [
  "Nanbu Shodan",
  "Nanbu Nidan",
  "Nanbu Sandan",
  "Nanbu Yondan",
  "Nanbu Godan",
];

function normalizeCategoryName(categoryName = "") {
  return categoryName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function getKatasForCategory(categoryName = "") {
  const normalizedCategoryName = normalizeCategoryName(categoryName);

  if (normalizedCategoryName.includes("senior")) return SENIORS_KATAS;
  if (normalizedCategoryName.includes("cadet") || normalizedCategoryName.includes("junior")) return CADETS_JUNIORS_KATAS;

  return DEFAULT_KATAS;
}
