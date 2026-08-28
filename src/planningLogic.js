import { disciplineLabel } from "./competitionLogic.js";

export const PLANNING_TATAMIS = [1, 2, 3];
export const isKata = (discipline = "") => String(discipline).startsWith("kata");
export const minutesToTime = (minutes) => `${String(Math.floor(minutes / 60)).padStart(2, "0")}h${String(Math.round(minutes) % 60).padStart(2, "0")}`;

export function estimateCategoryDuration(pools = []) {
  const competitors = new Set(pools.flatMap((pool) => pool.competitorIds || [])).size;
  const matches = pools.reduce((total, pool) => total + (pool.matches?.length || 0), 0);
  return Math.max(15, Math.ceil((isKata(pools[0]?.discipline) ? competitors * 4 : matches * 5) / 5) * 5) + 5;
}

function categoryLoad(category) {
  const count = category.competitorIds?.length || 0;
  return isKata(category.discipline) ? count * 4 + 5 : Math.max(15, count * (count - 1) / 2 * 5) + 5;
}

function assignPhase(categories, tatamiCount, result) {
  const loads = Array.from({ length: tatamiCount }, () => 0);
  [...categories]
    .sort((a, b) => categoryLoad(b) - categoryLoad(a))
    .forEach((category) => {
      const index = loads.indexOf(Math.min(...loads));
      result.set(String(category.id), index + 1);
      loads[index] += categoryLoad(category);
    });
}

function combatDisciplinePriority(discipline = "") {
  return discipline === "randori" ? 0 : 1;
}

export function buildPlanning(competition) {
  const groups = new Map();
  (competition.pools || []).forEach((pool) => { const key = String(pool.categoryId || pool.id); groups.set(key, [...(groups.get(key) || []), pool]); });
  const adjustments = competition.planningAdjustments || {};
  const categories = [...groups].map(([categoryId, pools], sourceOrder) => ({ categoryId, pools, sourceOrder,
    name: pools[0].nom?.replace(/ · Poule \d+$/, "") || "Catégorie", discipline: pools[0].discipline,
    competitors: [...new Set(pools.flatMap((pool) => pool.competitorIds || []))], duration: estimateCategoryDuration(pools),
    tatami: Number(adjustments[categoryId]?.tatami || pools[0].tatami || 1), order: Number(adjustments[categoryId]?.order ?? sourceOrder),
    requestedStart: adjustments[categoryId]?.start == null ? null : Number(adjustments[categoryId].start) }));
  const busy = new Map();
  const session = (items, sessionStart, priority = () => 0) => {
    const cursors = { 1: sessionStart, 2: sessionStart, 3: sessionStart };
    return [...items].sort((a, b) => priority(a) - priority(b) || a.order - b.order || a.sourceOrder - b.sourceOrder).map((item) => {
      const tatami = PLANNING_TATAMIS.includes(item.tatami) ? item.tatami : 1;
      let start = Math.max(cursors[tatami], item.requestedStart ?? sessionStart), end = start + item.duration, conflict;
      do { conflict = item.competitors.flatMap((id) => busy.get(String(id)) || []).find((slot) => start < slot.end && end > slot.start); if (conflict) { start = conflict.end; end = start + item.duration; } } while (conflict);
      item.competitors.forEach((id) => busy.set(String(id), [...(busy.get(String(id)) || []), { start, end }])); cursors[tatami] = end;
      return { ...item, tatami, start, end, disciplineLabel: disciplineLabel(item.discipline) };
    });
  };
  const kataEntries = session(categories.filter((item) => isKata(item.discipline)), 540);
  const kataEnd = Math.max(540, ...kataEntries.map((item) => item.end));
  const combatStart = kataEnd;
  const combatEntries = session(categories.filter((item) => !isKata(item.discipline)), combatStart, (item) => combatDisciplinePriority(item.discipline));
  const ceremonyStart = Math.max(combatStart, ...combatEntries.map((item) => item.end));
  return { entries: [...kataEntries, ...combatEntries], kataEnd, combatStart, morningEnd: kataEnd, afternoonStart: combatStart, ceremonyStart };
}

export function balancedTatamiAssignments(categories, tatamiCount = 3) {
  const result = new Map();
  assignPhase(categories.filter((category) => isKata(category.discipline)), tatamiCount, result);
  assignPhase(categories.filter((category) => !isKata(category.discipline)), tatamiCount, result);
  return result;
}
