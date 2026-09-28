import { disciplineLabel } from "./competitionLogic.js";

export const PLANNING_TATAMIS = [1, 2, 3];
export const isKata = (discipline = "") => String(discipline).startsWith("kata");
export const minutesToTime = (minutes) => `${String(Math.floor(minutes / 60)).padStart(2, "0")}h${String(Math.round(minutes) % 60).padStart(2, "0")}`;

export function estimateCategoryDuration(pools = []) {
  const matches = pools.reduce((total, pool) => total + (pool.matches?.length || 0), 0);
  const passageMinutes = isKata(pools[0]?.discipline) ? 4 : 6;
  return Math.max(15, Math.ceil((matches * passageMinutes) / 5) * 5) + 5;
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

export function worldKataFinalistCount(competitorCount) {
  const count = Number(competitorCount) || 0;
  if (count <= 5) return 0;
  return count <= 8 ? 4 : 5;
}

export function buildPlanning(competition) {
  const groups = new Map();
  (competition.pools || []).forEach((pool) => { const key = String(pool.categoryId || pool.id); groups.set(key, [...(groups.get(key) || []), pool]); });
  const adjustments = competition.planningAdjustments || {};
  const categories = [...groups].map(([categoryId, pools], sourceOrder) => ({ categoryId, pools, sourceOrder,
    name: pools[0].nom?.replace(/ · Poule \d+$/, "") || "Catégorie", discipline: pools[0].discipline,
    competitors: [...new Set(pools.flatMap((pool) => pool.competitorIds || []))], duration: estimateCategoryDuration(pools),
    tatami: Number(adjustments[categoryId]?.tatami || pools[0].tatami || 1),
    requestedOrder: adjustments[categoryId]?.order == null ? null : Number(adjustments[categoryId].order),
    requestedStart: adjustments[categoryId]?.start == null ? null : Number(adjustments[categoryId].start) }));
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
  const isWorld = competition.categoryMode === "world_championship_2026";
  const isTeam = (item) => item.discipline === "kata_equipe" || item.discipline === "ju_randori_equipe" || item.discipline === "dantai_randori" || /équipe|equipe|team/i.test(item.name);
  const individualKata = categories.filter((item) => isKata(item.discipline) && (!isWorld || !isTeam(item)));
  const teamCategories = isWorld ? categories.filter(isTeam) : [];
  const kataEntries = session(individualKata, 540);
  const kataEnd = Math.max(540, ...kataEntries.map((item) => item.end));
  const worldKataFinals = isWorld ? kataEntries
    .map((entry) => {
      const finalistCount = worldKataFinalistCount(entry.competitors.length);
      return finalistCount ? {
        ...entry,
        categoryId: `${entry.categoryId}::world-final`,
        sourceCategoryId: entry.categoryId,
        name: `${entry.name} · FINALE`,
        phase: "world-kata-final",
        finalistCount,
        competitors: [],
        duration: finalistCount * 4,
        requestedOrder: null,
        requestedStart: null,
      } : null;
    })
    .filter(Boolean) : [];
  const finalEntries = worldKataFinals.length ? session(worldKataFinals, Math.max(840, kataEnd)) : [];
  const worldFinalsEnd = finalEntries.length ? Math.max(...finalEntries.map((item) => item.end)) : kataEnd;
  const combatStart = isWorld ? 540 : kataEnd;
  const individualCombat = categories.filter((item) => !isKata(item.discipline) && (!isWorld || !isTeam(item)));
  const combatEntries = session(individualCombat, combatStart, (item) => combatDisciplinePriority(item.discipline)).map((entry) => ({ ...entry, day: isWorld ? 2 : 1 }));
  const day1KataEntries = kataEntries.map((entry) => ({ ...entry, day: 1 }));
  const day1FinalEntries = finalEntries.map((entry) => ({ ...entry, day: 1 }));
  const teamEntries = isWorld ? session(teamCategories, 540, (item) => isKata(item.discipline) ? 0 : 1).map((entry) => ({ ...entry, day: 3, phase: "world-team" })) : [];
  const ceremonyStart = isWorld
    ? Math.max(540, ...teamEntries.map((item) => item.end))
    : Math.max(combatStart, ...combatEntries.map((item) => item.end));
  return { entries: [...day1KataEntries, ...day1FinalEntries, ...combatEntries, ...teamEntries], kataEnd, worldKataFinals: day1FinalEntries, worldFinalsEnd, combatStart, worldTeamEntries: teamEntries, morningEnd: kataEnd, afternoonStart: combatStart, ceremonyStart };
}

export function balancedTatamiAssignments(categories, tatamiCount = 3) {
  const result = new Map();
  assignPhase(categories.filter((category) => isKata(category.discipline)), tatamiCount, result);
  assignPhase(categories.filter((category) => !isKata(category.discipline)), tatamiCount, result);
  return result;
}
