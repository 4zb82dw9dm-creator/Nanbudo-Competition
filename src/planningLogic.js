import { disciplineLabel } from "./competitionLogic.js";

export const PLANNING_TATAMIS = [1, 2, 3];
export const isKata = (discipline = "") => String(discipline).startsWith("kata");
export const minutesToTime = (minutes) => `${String(Math.floor(minutes / 60)).padStart(2, "0")}h${String(Math.round(minutes) % 60).padStart(2, "0")}`;

export function estimateCategoryDuration(pools = []) {
  const competitors = new Set(pools.flatMap((pool) => pool.competitorIds || [])).size;
  const matches = pools.reduce((total, pool) => total + (pool.matches?.length || 0), 0);
  return Math.max(15, Math.ceil((isKata(pools[0]?.discipline) ? competitors * 4 : matches * 5) / 5) * 5) + 5;
}

export function buildPlanning(competition) {
  const groups = new Map();
  (competition.pools || []).forEach((pool) => { const key = String(pool.categoryId || pool.id); groups.set(key, [...(groups.get(key) || []), pool]); });
  const adjustments = competition.planningAdjustments || {};
  const categories = [...groups].map(([categoryId, pools], sourceOrder) => ({ categoryId, pools, sourceOrder,
    name: pools[0].nom?.replace(/ · Poule \d+$/, "") || "Catégorie", discipline: pools[0].discipline,
    competitors: [...new Set(pools.flatMap((pool) => pool.competitorIds || []))], duration: estimateCategoryDuration(pools),
    requestedTatami: PLANNING_TATAMIS.includes(Number(adjustments[categoryId]?.tatami)) ? Number(adjustments[categoryId].tatami) : null,
    order: Number(adjustments[categoryId]?.order ?? sourceOrder),
    requestedStart: adjustments[categoryId]?.start == null ? null : Number(adjustments[categoryId].start) }));
  const session = (items, sessionStart) => {
    const cursors = { 1: sessionStart, 2: sessionStart, 3: sessionStart };
    const loads = { 1: 0, 2: 0, 3: 0 };
    const busy = new Map();

    const firstCompatibleStart = (item, tatami) => {
      let start = Math.max(cursors[tatami], item.requestedStart ?? sessionStart);
      let conflict;
      do {
        const end = start + item.duration;
        conflict = item.competitors
          .flatMap((id) => busy.get(String(id)) || [])
          .find((slot) => start < slot.end && end > slot.start);
        if (conflict) start = conflict.end;
      } while (conflict);
      return start;
    };

    return [...items].sort((a, b) => a.order - b.order || a.sourceOrder - b.sourceOrder).map((item) => {
      const candidates = item.requestedTatami
        ? [item.requestedTatami]
        : [...PLANNING_TATAMIS].sort((a, b) => loads[a] - loads[b] || a - b);
      const starts = candidates.map((tatami) => ({ tatami, start: firstCompatibleStart(item, tatami) }));
      const immediatelyAvailable = starts.find(({ tatami, start }) => start === Math.max(cursors[tatami], item.requestedStart ?? sessionStart));
      const selected = immediatelyAvailable || starts.reduce((best, option) => option.start < best.start ? option : best);
      const { tatami, start } = selected;
      const end = start + item.duration;
      item.competitors.forEach((id) => busy.set(String(id), [...(busy.get(String(id)) || []), { start, end }]));
      cursors[tatami] = end;
      loads[tatami] += item.duration;
      return { ...item, tatami, start, end, disciplineLabel: disciplineLabel(item.discipline) };
    });
  };
  const morning = session(categories.filter((item) => isKata(item.discipline)), 540);
  const morningEnd = Math.max(750, ...morning.map((item) => item.end));
  const afternoonStart = Math.max(840, morningEnd + (morningEnd > 750 ? 60 : 0));
  const afternoon = session(categories.filter((item) => !isKata(item.discipline)), afternoonStart);
  return { entries: [...morning, ...afternoon], morningEnd, afternoonStart, ceremonyStart: Math.max(afternoonStart, ...afternoon.map((item) => item.end)) };
}

export function balancedTatamiAssignments(categories, tatamiCount = 3) {
  const loads = Array.from({ length: tatamiCount }, () => 0), result = new Map();
  categories.forEach((category) => { const index = loads.indexOf(Math.min(...loads)); result.set(String(category.id), index + 1); const count = category.competitorIds?.length || 0; loads[index] += isKata(category.discipline) ? count * 4 + 5 : Math.max(15, count * (count - 1) / 2 * 5) + 5; });
  return result;
}
