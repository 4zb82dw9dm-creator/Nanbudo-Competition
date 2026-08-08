import test from "node:test";
import assert from "node:assert/strict";
import { calculateRanking, determineIndividualMatchWinner, finalizePoolResults, nextPoolTieBreakStep, unresolvedPoolTieGroups } from "../src/competitionLogic.js";
import { competitionResults } from "../src/resultsLogic.js";

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

test("a completed kata category is published automatically using saved final scores", () => {
  const category = { id: "kata", discipline: "kata_individuel" };
  const kataPool = finalizePoolResults({ id: "p1", categoryId: "kata", discipline: "kata_individuel", competitorIds: ["A", "B"], matches: [
    { competitorId: "A", finalScore: 7.2, statut: "Terminé", tatami: 1 },
    { competitorId: "B", finalScore: 8.1, statut: "Terminé", tatami: 3 },
  ] });
  assert.deepEqual(competitionResults({ categories: [category], pools: [kataPool] })[0].ranking.map((entry) => entry.competitorId), ["B", "A"]);
});

test("a completed randori pool is finalized and published automatically", () => {
  const category = { id: "randori", discipline: "randori" };
  const completed = finalizePoolResults({ ...pool(["A", "B"], [match("A", "B", { akaScore: 3, shiroScore: 1, winnerId: "A" })]), id: "p2", categoryId: "randori", tatami: 2 });
  assert.equal(completed.statut, "Terminée");
  assert.equal(completed.podium.firstId, "A");
  assert.equal(competitionResults({ categories: [category], pools: [completed] }).length, 1);
});

test("an unresolved final pool tie is not published before the pool tie-break", () => {
  const category = { id: "randori", discipline: "randori" };
  const completed = finalizePoolResults({ ...pool(["A", "B"], [match("A", "B", { akaScore: 2, shiroScore: 2 })]), id: "p3", categoryId: "randori" });
  assert.equal(completed.statut, "Départage requis");
  assert.equal(competitionResults({ categories: [category], pools: [completed] }).length, 0);
});

test("results from several tatamis survive the persisted JSON round trip", () => {
  const categories = [1, 2, 3].map((id) => ({ id, discipline: "randori" }));
  const pools = categories.map((category, index) => finalizePoolResults({ ...pool([`A${index}`, `B${index}`], [match(`A${index}`, `B${index}`, { akaScore: 1, winnerId: `A${index}` })]), id: `p${index}`, categoryId: category.id, tatami: index + 1 }));
  const reloaded = JSON.parse(JSON.stringify({ categories, pools }));
  assert.equal(competitionResults(reloaded).length, 3);
});
