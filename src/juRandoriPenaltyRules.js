export const PENALTY_VALUES = {
  keikoku: 0,
  fujubun: 1,
  chui: 2,
  hansoku_chui: 3,
  shikaku: 0,
};

export function normalizeJuRandoriPenalties(penalties = []) {
  const normalized = penalties.filter((penalty) => PENALTY_VALUES[penalty.id] !== undefined);
  const keikoku = normalized.filter((penalty) => penalty.id === "keikoku");
  const other = normalized.filter((penalty) => penalty.id !== "keikoku");
  const convertedFujubunCount = Math.floor(keikoku.length / 3);
  const remainingKeikoku = keikoku.length % 3;
  const at = keikoku[0]?.at || new Date().toISOString();

  return [
    ...keikoku.slice(0, remainingKeikoku),
    ...other,
    ...Array.from({ length: convertedFujubunCount }, (_, index) => ({
      id: "fujubun",
      label: "Fujubun (-1)",
      value: 1,
      at,
      automatic: true,
      source: "keikoku_conversion",
      conversionIndex: index,
    })),
  ];
}

export function juRandoriNegativeTotal(penalties = []) {
  return normalizeJuRandoriPenalties(penalties).reduce(
    (total, penalty) => total + Number(PENALTY_VALUES[penalty.id] || 0),
    0,
  );
}

export function isJuRandoriDisqualified(penalties = []) {
  const normalized = normalizeJuRandoriPenalties(penalties);
  return normalized.some((penalty) => penalty.id === "shikaku" || penalty.id === "hansoku_chui")
    || juRandoriNegativeTotal(normalized) >= 3;
}
