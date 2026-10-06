export const DIRECT_FLAG_ASSAULTS = [
  "Tsuki 1",
  "Tsuki 2",
  "Mae Geri 1",
  "Mae Geri 2",
  "Mawashi 1",
  "Mawashi 2",
  "Dernier Tsuki",
];

export const RANDORI_SHORT_ASSAULT_INDEXES = [0, 2, 4];

function normalizeFlagCount(value) {
  const count = Number(value || 0);
  return count >= 1 && count <= 3 ? count : 0;
}

export function normalizeDirectFlagRows(rows = [], labels = DIRECT_FLAG_ASSAULTS) {
  return labels.map((label, index) => {
    const row = rows[index] || {};

    // Backward compatibility: keep old matches readable while new matches use
    // akaFlags/shiroFlags. Old individual Fukushin votes are converted to counts.
    if (Array.isArray(row.votes) && row.akaFlags == null && row.shiroFlags == null) {
      return {
        ...row,
        label,
        akaFlags: row.votes.filter((vote) => vote === "AKA").length,
        shiroFlags: row.votes.filter((vote) => vote === "SHIRO").length,
      };
    }

    return {
      ...row,
      label,
      akaFlags: normalizeFlagCount(row.akaFlags),
      shiroFlags: normalizeFlagCount(row.shiroFlags),
    };
  });
}

export function isDirectFlagRowResolved(row) {
  return normalizeFlagCount(row?.akaFlags) > 0 || normalizeFlagCount(row?.shiroFlags) > 0;
}

export function directFlagRowResult(row) {
  if (!isDirectFlagRowResolved(row)) return "";
  const aka = normalizeFlagCount(row?.akaFlags);
  const shiro = normalizeFlagCount(row?.shiroFlags);
  if (aka > shiro) return "AKA";
  if (shiro > aka) return "SHIRO";
  return "HIKIWAKE";
}

export function scoreDirectFlagRows(rows = []) {
  return rows.reduce((score, row) => ({
    akaPositive: score.akaPositive + normalizeFlagCount(row?.akaFlags),
    shiroPositive: score.shiroPositive + normalizeFlagCount(row?.shiroFlags),
  }), { akaPositive: 0, shiroPositive: 0 });
}

export function isFullDirectFlagMatchResolved(rows = []) {
  return rows.length >= DIRECT_FLAG_ASSAULTS.length
    && DIRECT_FLAG_ASSAULTS.every((_, index) => isDirectFlagRowResolved(rows[index]));
}

export function isShortRandoriResolved(rows = []) {
  return RANDORI_SHORT_ASSAULT_INDEXES.every((index) => isDirectFlagRowResolved(rows[index]));
}

export function setDirectFlagCount(rows, rowIndex, side, value) {
  const key = side === "aka" ? "akaFlags" : "shiroFlags";
  const nextValue = normalizeFlagCount(value);
  return rows.map((row, index) => index === rowIndex
    ? { ...row, [key]: normalizeFlagCount(row[key]) === nextValue ? 0 : nextValue }
    : row);
}
