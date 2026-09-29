import test from "node:test";
import assert from "node:assert/strict";
import { findNextArbitrationPassage, scheduledTimeToMinutes, sortArbitrationMatches } from "../src/arbitrationSorting.js";

const entry = (tatami, horaire, ordre, statut = "À jouer", id = `${tatami}-${horaire}-${ordre}`) => ({
  pool: { id: `pool-${tatami}` },
  match: { id, tatami, horaire, ordre, statut },
});

const sort = (matches) => [...matches].sort(sortArbitrationMatches);
const times = (matches) => sort(matches).map(({ match }) => match.horaire);
const orders = (matches) => sort(matches).map(({ match }) => match.ordre);

test("converts the scheduled horaire string to comparable minutes", () => {
  assert.equal(scheduledTimeToMinutes("09:20"), 560);
  assert.equal(scheduledTimeToMinutes("14:50"), 890);
  assert.equal(scheduledTimeToMinutes("horaire inconnu"), Number.POSITIVE_INFINITY);
});

for (const tatami of [1, 2, 3]) {
  test(`Tatami ${tatami} follows the displayed passage numbers`, () => {
    const matches = [
      entry(tatami, "14:50", 2),
      entry(tatami, "09:30", 3),
      entry(tatami, "09:20", 1),
      entry(tatami, "14:55", 5),
      entry(tatami, "09:25", 4),
    ];
    assert.deepEqual(orders(matches), [1, 2, 3, 4, 5]);
  });
}

test("the All tab keeps every tatami chronological within its group", () => {
  const matches = [entry(1, "15:00", 3), entry(2, "09:10", 2), entry(1, "09:00", 1), entry(2, "14:00", 1), entry(3, "09:25", 2), entry(3, "14:50", 1)];
  for (const tatami of [1, 2, 3]) {
    const group = matches.filter(({ match }) => match.tatami === tatami);
    const minutes = sort(group).map(({ match }) => scheduledTimeToMinutes(match.horaire));
    assert.deepEqual(minutes, [...minutes].sort((a, b) => a - b));
  }
});

test("status never changes passage position", () => {
  const matches = [
    entry(1, "14:50", 3, "Terminé"),
    entry(1, "09:25", 2, "En cours"),
    entry(1, "09:20", 1, "À jouer"),
  ];
  assert.deepEqual(orders(matches), [1, 2, 3]);
});

test("equal passage numbers use time then tatami and remain stable after that", () => {
  const matches = [entry(2, "10:00", 2, "À jouer", "first"), entry(1, "10:00", 3), entry(2, "10:00", 1), entry(2, "10:00", 2, "Terminé", "second")];
  assert.deepEqual(sort(matches).map(({ match }) => match.id), ["2-10:00-1", "first", "second", "1-10:00-3"]);
});

test("the next passage is located by pool and match when match ids are duplicated", () => {
  const matches = [
    { pool: { id: "pool-a" }, match: { id: "duplicate", statut: "À jouer" } },
    { pool: { id: "pool-a" }, match: { id: "a-2", statut: "À jouer" } },
    { pool: { id: "pool-b" }, match: { id: "duplicate", statut: "À jouer" } },
    { pool: { id: "pool-b" }, match: { id: "b-2", statut: "À jouer" } },
  ];
  assert.equal(findNextArbitrationPassage(matches, "pool-b", "duplicate").match.id, "b-2");
});

test("the next passage skips a completed match and reports the end of planning", () => {
  const matches = [
    { pool: { id: "pool" }, match: { id: "current", statut: "À jouer" } },
    { pool: { id: "pool" }, match: { id: "finished", statut: "Terminé" } },
    { pool: { id: "pool" }, match: { id: "next", statut: "À jouer" } },
  ];
  assert.equal(findNextArbitrationPassage(matches, "pool", "current").match.id, "next");
  assert.equal(findNextArbitrationPassage(matches, "pool", "next"), null);
});
