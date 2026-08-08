import test from "node:test";
import assert from "node:assert/strict";
import { calculatePoolPodium, calculateRanking, determineIndividualMatchWinner, nextPoolTieBreakStep, unresolvedPoolTieGroups } from "../src/competitionLogic.js";

function match(akaId, shiroId, { akaScore = 0, shiroScore = 0, akaNegative = 0, shiroNegative = 0, winnerId = null } = {}) {
  return { akaId, shiroId, akaScore, shiroScore, akaNegative, shiroNegative, winnerId, statut: "Terminé" };
}

function pool(competitorIds, matches) {
  return { discipline: "randori", competitorIds, matches };
}

test("test 1: an individual tied match is recorded without a winner or tie-break", () => {
  assert.equal(determineIndividualMatchWinner({ akaTotal: 4, shiroTotal: 4 }), null);
});

test("test 2: fewer pool negative points rank first without an extra sequence", () => {
  const tiedPool = pool(["A", "B"], [match("A", "B", { akaScore: 3, shiroScore: 3, akaNegative: 2, shiroNegative: 4 })]);
  assert.deepEqual(calculateRanking(tiedPool).map(({ competitorId }) => competitorId), ["A", "B"]);
  assert.deepEqual(unresolvedPoolTieGroups(tiedPool), []);
});

test("test 3: equal pool negative points require a Tsuki tie-break", () => {
  const tiedPool = pool(["A", "B"], [match("A", "B", { akaScore: 2, shiroScore: 2, akaNegative: 2, shiroNegative: 2 })]);
  assert.deepEqual(unresolvedPoolTieGroups(tiedPool), [["A", "B"]]);
  assert.deepEqual(nextPoolTieBreakStep(0, ""), { winner: null, stageIndex: 1 });
});

test("tests 4-6: draws progress from Tsuki to Mae Geri, Mawashi Geri, then flags", () => {
  assert.equal(nextPoolTieBreakStep(0, "HIKIWAKE").stageIndex, 1);
  assert.equal(nextPoolTieBreakStep(1, "HIKIWAKE").stageIndex, 2);
  assert.equal(nextPoolTieBreakStep(2, "HIKIWAKE").stageIndex, 3);
});

test("test 7: a three-way tie isolates only competitors with equal negative points", () => {
  const tiedPool = pool(["A", "B", "C"], [
    match("A", "B", { akaScore: 1, shiroScore: 1, akaNegative: 1, shiroNegative: 1 }),
    match("A", "C", { akaScore: 1, shiroScore: 1, akaNegative: 0, shiroNegative: 1 }),
    match("B", "C", { akaScore: 1, shiroScore: 1, akaNegative: 2, shiroNegative: 2 }),
  ]);
  const ranking = calculateRanking(tiedPool);
  assert.deepEqual(ranking.map(({ competitorId, negativePoints }) => [competitorId, negativePoints]), [["A", 1], ["B", 3], ["C", 3]]);
  assert.deepEqual(unresolvedPoolTieGroups(tiedPool), [["B", "C"]]);
});

test("automatic podium waits for the final randori match", () => {
  const unfinished = pool(["A", "B", "C"], [
    match("A", "B", { akaScore: 3, winnerId: "A" }),
    { ...match("A", "C"), statut: "À jouer" },
  ]);
  const calculation = calculatePoolPodium(unfinished);
  assert.equal(calculation.pool.podium, undefined);
  assert.deepEqual(calculation.tieGroups, []);
});

test("automatic podium closes a kata pool and is idempotent", () => {
  const kataPool = {
    discipline: "kata_individuel",
    competitorIds: ["A", "B"],
    matches: [
      { competitorId: "A", finalScore: 8.4, statut: "Terminé" },
      { competitorId: "B", finalScore: 8.8, statut: "Terminé" },
    ],
  };
  const first = calculatePoolPodium(kataPool).pool;
  const recalculated = calculatePoolPodium(first).pool;
  assert.equal(first.statut, "Terminée");
  assert.deepEqual(first.podium, { firstId: "B", secondId: "A", thirdId: null });
  assert.deepEqual(recalculated.podium, first.podium);
});

test("editing a completed result replaces the ranking", () => {
  const initial = calculatePoolPodium(pool(["A", "B"], [match("A", "B", { akaScore: 2, shiroScore: 1, winnerId: "A" })])).pool;
  const modified = calculatePoolPodium({
    ...initial,
    matches: [match("A", "B", { akaScore: 1, shiroScore: 2, winnerId: "B" })],
    poolTieBreakOrder: [],
  }).pool;
  assert.equal(initial.podium.firstId, "A");
  assert.equal(modified.podium.firstId, "B");
});

test("pool tie-break is proposed only once every match is complete", () => {
  const tiedMatch = match("A", "B", { akaScore: 2, shiroScore: 2 });
  assert.deepEqual(calculatePoolPodium({ ...pool(["A", "B"], [tiedMatch]), matches: [{ ...tiedMatch, statut: "À jouer" }] }).tieGroups, []);
  const completed = calculatePoolPodium(pool(["A", "B"], [tiedMatch]));
  assert.deepEqual(completed.tieGroups, [["A", "B"]]);
  assert.equal(completed.pool.statut, "En attente de départage");
});
