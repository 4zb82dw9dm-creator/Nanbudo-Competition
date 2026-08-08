function passageOrder(match) {
  const order = Number(match.ordre);
  return Number.isFinite(order) ? order : Number.MAX_SAFE_INTEGER;
}

function tatamiOrder(tatami) {
  const order = Number(tatami);
  return Number.isFinite(order) ? order : Number.MAX_SAFE_INTEGER;
}

export function scheduledTimeToMinutes(horaire) {
  if (typeof horaire !== "string") return Number.POSITIVE_INFINITY;
  const match = horaire.trim().match(/^(\d{1,2}):([0-5]\d)$/);
  if (!match) return Number.POSITIVE_INFINITY;

  const hours = Number(match[1]);
  if (hours > 23) return Number.POSITIVE_INFINITY;
  return hours * 60 + Number(match[2]);
}

export function sortArbitrationMatches(a, b) {
  return scheduledTimeToMinutes(a.match.horaire) - scheduledTimeToMinutes(b.match.horaire)
    || tatamiOrder(a.match.tatami) - tatamiOrder(b.match.tatami)
    || passageOrder(a.match) - passageOrder(b.match);
}
