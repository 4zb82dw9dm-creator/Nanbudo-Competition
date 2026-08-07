import test from "node:test";
import assert from "node:assert/strict";
import { createCompleteTestCompetition } from "./demoCompetitionData.js";
import { buildPlanning, isKata, PLANNING_TATAMIS } from "./planningLogic.js";

test("the complete test competition is balanced independently across three tatamis", () => {
  const planning = buildPlanning(createCompleteTestCompetition());
  const sessions = [
    planning.entries.filter((entry) => isKata(entry.discipline)),
    planning.entries.filter((entry) => !isKata(entry.discipline)),
  ];

  for (const entries of sessions) {
    if (entries.length >= 3) assert.deepEqual(new Set(entries.map((entry) => entry.tatami)), new Set(PLANNING_TATAMIS));
    const loads = PLANNING_TATAMIS.map((tatami) => entries.filter((entry) => entry.tatami === tatami).reduce((sum, entry) => sum + entry.duration, 0));
    assert.ok(Math.max(...loads) - Math.min(...loads) <= Math.max(...entries.map((entry) => entry.duration)));
  }
});

test("categories stay whole, disciplines stay in their session, and competitors never overlap", () => {
  const competition = createCompleteTestCompetition();
  const planning = buildPlanning(competition);
  assert.equal(planning.entries.length, new Set(planning.entries.map((entry) => entry.categoryId)).size);

  for (const entry of planning.entries) {
    assert.ok(entry.pools.every((pool) => String(pool.categoryId || pool.id) === entry.categoryId));
    assert.equal(entry.start < planning.afternoonStart, isKata(entry.discipline));
  }

  const slotsByCompetitor = new Map();
  for (const entry of planning.entries) for (const id of entry.competitors) {
    const slots = slotsByCompetitor.get(String(id)) || [];
    assert.ok(slots.every((slot) => entry.start >= slot.end || entry.end <= slot.start));
    slots.push(entry);
    slotsByCompetitor.set(String(id), slots);
  }
});

test("automatic scheduling ignores old pool tatamis while explicit adjustments remain respected", () => {
  const competition = createCompleteTestCompetition();
  competition.pools = competition.pools.map((pool) => ({ ...pool, tatami: 1 }));
  let planning = buildPlanning(competition);
  assert.deepEqual(new Set(planning.entries.filter((entry) => isKata(entry.discipline)).map((entry) => entry.tatami)), new Set(PLANNING_TATAMIS));

  const categoryId = planning.entries[0].categoryId;
  competition.planningAdjustments = { [categoryId]: { tatami: 3 } };
  planning = buildPlanning(competition);
  assert.equal(planning.entries.find((entry) => entry.categoryId === categoryId).tatami, 3);
});
