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
  // Ordre réel du planning : catégorie/phase d'abord, puis #1, #2, #3 dans la catégorie.
  return (a.planningStart ?? Number.MAX_SAFE_INTEGER) - (b.planningStart ?? Number.MAX_SAFE_INTEGER)
    || (a.planningOrder ?? Number.MAX_SAFE_INTEGER) - (b.planningOrder ?? Number.MAX_SAFE_INTEGER)
    || (a.poolOrder ?? 0) - (b.poolOrder ?? 0)
    || passageOrder(a.match) - passageOrder(b.match)
    || scheduledTimeToMinutes(a.match.horaire) - scheduledTimeToMinutes(b.match.horaire)
    || tatamiOrder(a.match.tatami) - tatamiOrder(b.match.tatami);
}

export function findNextArbitrationPassage(matches = [], currentPoolId, currentMatchId) {
  const currentIndex = matches.findIndex(({ pool, match }) =>
    String(pool.id) === String(currentPoolId) && String(match.id) === String(currentMatchId));
  if (currentIndex < 0) return null;
  return matches.slice(currentIndex + 1).find(({ match }) => match.statut !== "Terminé") || null;
}
