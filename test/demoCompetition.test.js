import test from "node:test";
import assert from "node:assert/strict";
import { COMPLETE_TEST_COMPETITION_NAME, createCompleteTestCompetition, simulateCompleteTestCompetition } from "../src/demoCompetitionData.js";
import { calculateRanking, unresolvedPoolTieGroups } from "../src/competitionLogic.js";

test("the complete demo is isolated and has four unique competitors in every category", () => {
  const demo = createCompleteTestCompetition();
  assert.equal(demo.nom, COMPLETE_TEST_COMPETITION_NAME);
  assert.equal(demo.tatamis, 3);
  assert.equal(demo.categories.length, 6);
  assert.ok(demo.isDemoCompetition);
  assert.ok(demo.categories.every((category) => category.competitorIds.length === 4));
  assert.equal(new Set(demo.categories.flatMap((category) => category.competitorIds)).size, 24);
  assert.equal(new Set(demo.competitors.filter(({ typeInscription }) => typeInscription === "Compétiteur").map(({ nom, prenom }) => `${nom} ${prenom}`)).size, 24);
});

test("one category always remains on one tatami and planning disciplines are session-ready", () => {
  const demo = createCompleteTestCompetition();
  for (const category of demo.categories) {
    const pools = demo.pools.filter((pool) => pool.categoryId === category.id);
    assert.equal(new Set(pools.flatMap((pool) => [pool.tatami, ...pool.matches.map((match) => match.tatami)])).size, 1);
  }
  assert.deepEqual(new Set(demo.pools.map(({ tatami }) => tatami)), new Set([1, 2, 3]));
});

test("simulation supplies kata rankings, negative-point ordering and a targeted tie", () => {
  const simulated = simulateCompleteTestCompetition(createCompleteTestCompetition());
  const kataPools = simulated.pools.filter(({ discipline }) => discipline.startsWith("kata"));
  assert.ok(kataPools.every(({ podium, statut }) => podium && statut === "Terminée"));
  assert.deepEqual(calculateRanking(kataPools[0]).map(({ finalScore }) => finalScore), [4.57, 4.41, 4.28, 4.15]);

  const negativePool = simulated.pools.find(({ scenario }) => scenario === "B/D");
  assert.deepEqual(calculateRanking(negativePool).map(({ negativePoints }) => negativePoints), [2, 4, 6, 8]);
  assert.deepEqual(unresolvedPoolTieGroups(negativePool), []);
  assert.ok(negativePool.matches.some(({ winnerId }) => winnerId === null));

  const threeWayPool = simulated.pools.find(({ scenario }) => scenario === "C/E");
  assert.deepEqual(calculateRanking(threeWayPool).map(({ negativePoints }) => negativePoints), [1, 3, 3, 5]);
  assert.deepEqual(unresolvedPoolTieGroups(threeWayPool), [[threeWayPool.competitorIds[1], threeWayPool.competitorIds[2]]]);
  assert.equal(threeWayPool.statut, "En attente de départage");
});

test("simulation is unavailable to a real competition", () => {
  const realCompetition = { id: "real", nom: "Open réel", pools: [] };
  assert.equal(simulateCompleteTestCompetition(realCompetition), realCompetition);
});
