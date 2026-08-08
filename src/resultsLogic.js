import { calculateRanking, isPoolComplete, unresolvedPoolTieGroups } from "./competitionLogic.js";
import { competitionRulesEngine } from "./rules/competitionRulesEngine.js";

export function competitionResults(competition) {
  const pools = competition.pools || [];
  const results = [];
  (competition.categories || []).forEach((category) => {
    const categoryPools = pools.filter((pool) => String(pool.categoryId) === String(category.id));
    if (!categoryPools.length) return;
    if (competitionRulesEngine.isKataDiscipline(category.discipline)) {
      if (!categoryPools.every(isPoolComplete)) return;
      const ranking = categoryPools.flatMap((pool) => pool.rankingLocked?.length ? pool.rankingLocked : calculateRanking(pool))
        .sort((a, b) => Number(b.finalScore ?? b.scoreFor ?? 0) - Number(a.finalScore ?? a.scoreFor ?? 0));
      results.push({ id: `category-${category.id}`, category, pool: null, ranking });
      return;
    }
    categoryPools.forEach((pool) => {
      if (!isPoolComplete(pool) || unresolvedPoolTieGroups(pool).length) return;
      results.push({ id: `pool-${pool.id}`, category, pool, ranking: pool.rankingLocked?.length ? pool.rankingLocked : calculateRanking(pool) });
    });
  });
  return results;
}
