import { disciplineLabel } from "./competitionLogic.js";

export const PLANNING_TATAMIS = [1, 2, 3];
export const isKata = (discipline = "") => String(discipline).startsWith("kata");
export const minutesToTime = (minutes) => `${String(Math.floor(minutes / 60)).padStart(2, "0")}h${String(Math.round(minutes) % 60).padStart(2, "0")}`;

export function estimateCategoryDuration(pools = []) {
  const matches = pools.filter((pool) => !pool.isFinalsPool).reduce((total, pool) => total + (pool.matches?.length || 0), 0);
  const passageMinutes = isKata(pools[0]?.discipline) ? 4 : 6;
  const finalsMinutes = !isKata(pools[0]?.discipline) && pools.filter((pool) => !pool.isFinalsPool).length === 2 ? 12 : 0;
  return Math.max(15, Math.ceil(((matches * passageMinutes) + finalsMinutes) / 5) * 5) + 5;
}

function categoryLoad(category) {
  const count = category.competitorIds?.length || 0;
  return isKata(category.discipline) ? count * 2 * 4 + 5 : Math.max(15, count * (count - 1) / 2 * 6) + 5;
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
  (competition.pools || []).filter((pool) => !pool.isManualFinal).forEach((pool) => { const key = String(pool.categoryId || pool.id); groups.set(key, [...(groups.get(key) || []), pool]); });
  const adjustments = competition.planningAdjustments || {};
  const categories = [...groups].map(([categoryId, allPools], sourceOrder) => { const pools = allPools.filter((pool) => !pool.isFinalsPool); const finalsPool = allPools.find((pool) => pool.isFinalsPool); return ({ categoryId, pools, sourceOrder,
    name: pools[0].nom?.replace(/ · Poule \d+$/, "") || "Catégorie", discipline: pools[0].discipline,
    competitors: [...new Set(pools.flatMap((pool) => pool.competitorIds || []))], duration: estimateCategoryDuration(pools),
    tatami: Number(adjustments[categoryId]?.tatami || pools[0].tatami || 1),
    finals: !isKata(pools[0].discipline) && pools.length === 2 ? [
      { label: "PETITE FINALE — 3e et 4e places", participants: "2e Poule 1 contre 2e Poule 2", match: finalsPool?.matches?.find((match) => match.finalType === "bronze") },
      { label: "FINALE — 1re et 2e places", participants: "1re Poule 1 contre 1re Poule 2", match: finalsPool?.matches?.find((match) => match.finalType === "gold") },
    ] : [],
    requestedOrder: adjustments[categoryId]?.order == null ? null : Number(adjustments[categoryId].order),
    requestedStart: adjustments[categoryId]?.start == null ? null : Number(adjustments[categoryId].start) }); });
  const busy = new Map();
  const session = (items, sessionStart, priority = () => 0) => {
    const cursors = { 1: sessionStart, 2: sessionStart, 3: sessionStart };
    const defaultOrders = new Map();
    PLANNING_TATAMIS.forEach((tatami) => {
      [...items]
        .filter((item) => (PLANNING_TATAMIS.includes(item.tatami) ? item.tatami : 1) === tatami)
        .sort((a, b) => priority(a) - priority(b) || a.sourceOrder - b.sourceOrder)
        .forEach((item, index) => defaultOrders.set(item.categoryId, index + 1));
    });
    const orderFor = (item) => item.requestedOrder ?? defaultOrders.get(item.categoryId) ?? 1;
    const displayOrders = { 1: 0, 2: 0, 3: 0 };
    return [...items].sort((a, b) => priority(a) - priority(b) || orderFor(a) - orderFor(b) || a.sourceOrder - b.sourceOrder).map((item) => {
      const tatami = PLANNING_TATAMIS.includes(item.tatami) ? item.tatami : 1;
      let start = Math.max(cursors[tatami], item.requestedStart ?? sessionStart), end = start + item.duration, conflict;
      do { conflict = item.competitors.flatMap((id) => busy.get(String(id)) || []).find((slot) => start < slot.end && end > slot.start); if (conflict) { start = conflict.end; end = start + item.duration; } } while (conflict);
      item.competitors.forEach((id) => busy.set(String(id), [...(busy.get(String(id)) || []), { start, end }])); cursors[tatami] = end;
      const order = ++displayOrders[tatami];
      return { ...item, tatami, order, start, end, disciplineLabel: disciplineLabel(item.discipline) };
    });
  };
  const kataEntries = session(categories.filter((item) => isKata(item.discipline)), 540);
  const kataEnd = Math.max(540, ...kataEntries.map((item) => item.end));
  const combatStart = kataEnd;
  const combatEntries = session(categories.filter((item) => !isKata(item.discipline)), combatStart, (item) => combatDisciplinePriority(item.discipline));
  const manualFinalEntries = (competition.pools || []).filter((pool) => pool.isManualFinal).map((pool, index) => {
    const tatami = Number(pool.tatami) || 1;
    const prior = combatEntries.filter((entry) => entry.tatami === tatami);
    const earlierManual = (competition.pools || []).filter((p) => p.isManualFinal && Number(p.tatami || 1) === tatami).findIndex((p) => p.id === pool.id);
    const start = Math.max(combatStart, ...prior.map((entry) => entry.end)) + earlierManual * 10;
    return { categoryId: String(pool.id), pools: [pool], name: pool.nom, discipline: pool.discipline,
      disciplineLabel: "FINALE MANUELLE", competitors: pool.competitorIds || [],
      tatami, start, end: start + 10, duration: 10, order: prior.length + earlierManual + 1,
      finals: [{ label: "FINALE MANUELLE", participants: "AKA contre SHIRO", match: pool.matches?.[0] }] };
  });
  combatEntries.push(...manualFinalEntries);
  const ceremonyStart = Math.max(combatStart, ...combatEntries.map((item) => item.end));
  return { entries: [...kataEntries, ...combatEntries], kataEnd, combatStart, morningEnd: kataEnd, afternoonStart: combatStart, ceremonyStart };
}

export function balancedTatamiAssignments(categories, tatamiCount = 3) {
  const result = new Map();
  assignPhase(categories.filter((category) => isKata(category.discipline)), tatamiCount, result);
  assignPhase(categories.filter((category) => !isKata(category.discipline)), tatamiCount, result);
  return result;
}
