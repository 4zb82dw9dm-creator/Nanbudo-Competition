const MIN_POOL_SIZE = 3;
const PREFERRED_POOL_SIZES = [6, 4];
const MAX_ACCEPTABLE_POOL_SIZE = 6;

function normalizeClub(competitor) {
  return String(competitor?.club || "Club non renseigné").trim() || "Club non renseigné";
}

function scoreSizeCombination(sizes, total) {
  const hasTwo = sizes.some((size) => size <= 2);
  const hasOversized = sizes.some((size) => size >= 7);
  const idealCount = sizes.filter((size) => PREFERRED_POOL_SIZES.includes(size)).length;
  const average = total / sizes.length;
  const balancePenalty = sizes.reduce((sum, size) => sum + Math.abs(size - average), 0);
  const preferredPenalty = sizes.reduce((sum, size) => {
    if (size === 6) return sum;
    if (size === 4) return sum + 0.5;
    if (size === 5) return sum + 1;
    if (size === 3) return sum + 2;
    return sum + 8;
  }, 0);

  return (
    preferredPenalty * 12 +
    balancePenalty * 4 +
    (hasTwo ? 1000 : 0) +
    (hasOversized ? 500 : 0) -
    idealCount
  );
}

export function calculatePoolSizes(totalCompetitors) {
  if (totalCompetitors < 2) return [];

  const officialExamples = {
    8: [4, 4],
    12: [6, 6],
    13: [6, 4, 3],
    15: [5, 5, 5],
    17: [6, 6, 5],
    18: [6, 6, 6],
    19: [5, 5, 5, 4],
    24: [6, 6, 6, 6],
  };

  if (officialExamples[totalCompetitors]) {
    return officialExamples[totalCompetitors];
  }

  let best = null;

  function explore(remaining, sizes) {
    if (remaining === 0) {
      const sorted = [...sizes].sort((a, b) => b - a);
      const score = scoreSizeCombination(sorted, totalCompetitors);

      if (!best || score < best.score) {
        best = { sizes: sorted, score };
      }

      return;
    }

    if (remaining < MIN_POOL_SIZE && remaining !== 0) {
      return;
    }

    for (let size = MAX_ACCEPTABLE_POOL_SIZE; size >= MIN_POOL_SIZE; size--) {
      if (remaining - size >= 0) {
        explore(remaining - size, [...sizes, size]);
      }
    }
  }

  explore(totalCompetitors, []);

  if (best) return best.sizes;

  return [totalCompetitors];
}

function getPoolClubCounts(pool) {
  return pool.competitors.reduce((counts, competitor) => {
    const club = normalizeClub(competitor);
    counts[club] = (counts[club] || 0) + 1;
    return counts;
  }, {});
}

function pickBestPool(pools, competitor) {
  const club = normalizeClub(competitor);

  return pools
    .filter((pool) => pool.competitors.length < pool.targetSize)
    .map((pool) => {
      const clubCounts = getPoolClubCounts(pool);
      const duplicatePenalty = (clubCounts[club] || 0) * 100;
      const fillPenalty = pool.competitors.length / pool.targetSize;
      const clubDiversityBonus = Object.keys(clubCounts).length * -2;

      return {
        pool,
        score: duplicatePenalty + fillPenalty + clubDiversityBonus,
      };
    })
    .sort((a, b) => a.score - b.score || b.pool.targetSize - a.pool.targetSize)[0]?.pool;
}

export function distributeCompetitorsIntoPools(competitors = []) {
  const sizes = calculatePoolSizes(competitors.length);
  const pools = sizes.map((targetSize, index) => ({
    index,
    targetSize,
    competitors: [],
  }));

  const byClub = [...competitors].sort((a, b) => {
    const clubCompare = normalizeClub(a).localeCompare(normalizeClub(b), "fr");
    if (clubCompare !== 0) return clubCompare;
    return String(a.nom || "").localeCompare(String(b.nom || ""), "fr");
  });

  while (byClub.length > 0) {
    const clubGroups = byClub.reduce((groups, competitor) => {
      const club = normalizeClub(competitor);
      if (!groups[club]) groups[club] = [];
      groups[club].push(competitor);
      return groups;
    }, {});

    const nextClub = Object.entries(clubGroups).sort((a, b) => b[1].length - a[1].length)[0][0];
    const competitor = byClub.splice(byClub.findIndex((item) => normalizeClub(item) === nextClub), 1)[0];
    const pool = pickBestPool(pools, competitor);

    if (pool) {
      pool.competitors.push(competitor);
    }
  }

  return pools.map((pool) => pool.competitors.map((competitor) => competitor.id));
}

export function buildPoolQualityReport(poolCompetitorIds, competitors = [], matchGroups = []) {
  const competitorById = new Map(competitors.map((competitor) => [String(competitor.id), competitor]));
  const sizes = poolCompetitorIds.map((ids) => ids.length);
  const conflicts = poolCompetitorIds.map((ids, index) => {
    const clubCounts = ids.reduce((counts, id) => {
      const club = normalizeClub(competitorById.get(String(id)));
      counts[club] = (counts[club] || 0) + 1;
      return counts;
    }, {});

    return {
      poolIndex: index,
      duplicatedClubs: Object.entries(clubCounts)
        .filter(([, count]) => count > 1)
        .map(([club, count]) => ({ club, count })),
      clubCount: Object.keys(clubCounts).length,
    };
  });

  const sizePenalty = sizes.reduce((sum, size) => sum + (PREFERRED_POOL_SIZES.includes(size) ? 0 : Math.abs(5 - size) * 3), 0);
  const clubPenalty = conflicts.reduce((sum, conflict) => sum + conflict.duplicatedClubs.reduce((inner, item) => inner + (item.count - 1) * 4, 0), 0);
  const consecutiveCount = matchGroups.reduce((total, matches) => {
    return total + matches.reduce((count, match, index) => {
      if (index === 0) return count;
      const previous = matches[index - 1];
      const currentIds = [String(match.akaId), String(match.shiroId)];
      return currentIds.includes(String(previous.akaId)) ||
        currentIds.includes(String(previous.shiroId))
        ? count + 1
        : count;
    }, 0);
  }, 0);
  const rotationPenalty = consecutiveCount * 3;

  return {
    poolCount: poolCompetitorIds.length,
    sizes,
    conflicts,
    consecutiveCount,
    score: Math.max(0, Math.min(100, Math.round(100 - sizePenalty - clubPenalty - rotationPenalty))),
  };
}
