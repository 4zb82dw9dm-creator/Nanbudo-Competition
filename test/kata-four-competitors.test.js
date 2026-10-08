import test from "node:test";
import assert from "node:assert/strict";
import { generateMatches, calculateRanking, calculatePoolPodium, isPoolComplete } from "../src/competitionLogic.js";

const ids = ["A", "B", "C", "D"];
const category = { id: "kata-test", discipline: "kata_individuel", kataGroup: "Kata 2" };
const scores = { A: [4.5, 4.7], B: [4.6, 4.6], C: [4.3, 4.4], D: [4.2, 4.1] };
const makePool = () => ({
  id: "pool-kata-test", categoryId: category.id, discipline: category.discipline,
  competitorIds: ids, matches: generateMatches(ids, category),
});

test("four competitors get two complete ordered Kata rounds", () => {
  const pool = makePool();
  assert.equal(pool.matches.length, 8);
  assert.deepEqual(pool.matches.map(m => m.ordre), [1, 2, 3, 4, 5, 6, 7, 8]);
  assert.deepEqual(pool.matches.map(m => [m.kataRound, m.competitorId]), [
    [1, "A"], [1, "B"], [1, "C"], [1, "D"],
    [2, "A"], [2, "B"], [2, "C"], [2, "D"],
  ]);
});

test("podium stays closed until all eight Kata performances are completed", () => {
  const pool = makePool();
  pool.matches = pool.matches.map((m, i) => i === 7 ? m : {
    ...m, finalScore: scores[m.competitorId][m.kataRound - 1], statut: "Terminé",
  });
  assert.equal(isPoolComplete(pool), false);
  assert.equal(calculatePoolPodium(pool).pool.podium, undefined);
  pool.matches[7] = { ...pool.matches[7], finalScore: scores.D[1], statut: "Terminé" };
  assert.equal(isPoolComplete(pool), true);
});

test("ranking uses sum and average of both Kata performances", () => {
  const pool = makePool();
  pool.matches = pool.matches.map(m => ({
    ...m, finalScore: scores[m.competitorId][m.kataRound - 1], statut: "Terminé",
  }));
  const ranking = calculateRanking(pool);
  assert.deepEqual(ranking.map(r => r.competitorId), ["A", "B", "C", "D"]);
  assert.equal(ranking[0].kataTotal, 9.2);
  assert.equal(ranking[0].kataAverage, 4.6);
  assert.equal(ranking[0].kataRoundsCompleted, 2);
  // A and B are equal on both-round total; a tie-break is required before podium.
  const outcome = calculatePoolPodium(pool);
  assert.equal(outcome.tieGroups.length, 1);
  assert.deepEqual(outcome.tieGroups[0], ["A", "B"]);
  assert.equal(outcome.pool.podium, null);
});
