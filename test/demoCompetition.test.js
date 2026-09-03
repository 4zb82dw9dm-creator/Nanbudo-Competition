import test from "node:test";
import assert from "node:assert/strict";
import { COMPLETE_TEST_COMPETITION_NAME, createCompleteTestCompetition, simulateCompleteTestCompetition } from "../src/demoCompetitionData.js";
import { calculateRanking, generateMatches, unresolvedPoolTieGroups } from "../src/competitionLogic.js";
import { prepareCategoriesForPools } from "../src/categoryRules.js";

test("the complete demo has 100 competitors, 30 referees and broad age coverage", () => {
  const demo = createCompleteTestCompetition();
  const competitors = demo.competitors.filter(({ typeInscription }) => typeInscription === "Compétiteur");
  const referees = demo.competitors.filter(({ typeInscription }) => typeInscription === "Arbitre");
  assert.equal(demo.nom, COMPLETE_TEST_COMPETITION_NAME);
  assert.equal(demo.tatamis, 3);
  assert.equal(demo.categories.length, 25);
  assert.ok(demo.isDemoCompetition);
  assert.equal(competitors.length, 100);
  assert.equal(referees.length, 30);
  assert.ok(demo.categories.every((category) => category.competitorIds.length === 4));
  assert.equal(new Set(demo.categories.flatMap((category) => category.competitorIds)).size, 100);
  assert.equal(new Set(competitors.map(({ nom, prenom }) => `${nom} ${prenom}`)).size, 100);
  assert.ok(Math.min(...competitors.map(({ age }) => age)) <= 7);
  assert.ok(Math.max(...competitors.map(({ age }) => age)) >= 65);
  assert.equal(Object.keys(demo.refereeAssignments).length, 3);
  assert.ok(Object.values(demo.refereeAssignments).every((team) => Object.keys(team).length === 8));
});

test("automatic demo categories never mix sexes and child disciplines stop at 12", () => {
  const demo = createCompleteTestCompetition();
  const competitors = demo.competitors.filter(({ typeInscription }) => typeInscription === "Compétiteur");
  for (const category of demo.categories) {
    const members = competitors.filter((competitor) => category.competitorIds.includes(competitor.id));
    assert.equal(new Set(members.map(({ sexe }) => sexe)).size, 1);
    const maxAge = Math.max(...members.map(({ age }) => age));
    if (category.discipline === "randori") assert.ok(maxAge <= 12);
    if (["Kata 0", "Kata 1"].includes(category.kataGroup)) assert.ok(maxAge <= 12);
  }
});

test("pool preparation keeps complete same-sex groups separate", () => {
  const competitors = [
    ...Array.from({ length: 7 }, (_, index) => ({ id: `h${index + 1}`, sexe: "Homme", age: 10 })),
    ...Array.from({ length: 5 }, (_, index) => ({ id: `f${index + 1}`, sexe: "Femme", age: 10 })),
  ];
  const category = { id: "mixed", nom: "Randori · Mixte", discipline: "randori", competitorIds: competitors.map(({ id }) => id) };
  const split = prepareCategoriesForPools([category], competitors);
  assert.deepEqual(split.map(({ competitorIds }) => competitorIds.length).sort((a, b) => a - b), [5, 7]);
  assert.ok(split.every((item) => new Set(item.competitorIds.map((id) => competitors.find((competitor) => competitor.id === id).sexe)).size === 1));
});

test("pool preparation uses mixing only for competitors who cannot form a complete same-sex pool", () => {
  const competitors = [
    ...Array.from({ length: 5 }, (_, index) => ({ id: `h${index + 1}`, sexe: "Homme", age: 10 })),
    ...Array.from({ length: 2 }, (_, index) => ({ id: `f${index + 1}`, sexe: "Femme", age: 10 })),
  ];
  const category = { id: "mixed", nom: "Randori · Mixte", discipline: "randori", competitorIds: competitors.map(({ id }) => id) };
  const split = prepareCategoriesForPools([category], competitors);
  assert.deepEqual(split.map(({ competitorIds }) => competitorIds.length).sort((a, b) => a - b), [3, 4]);
  assert.equal(split.filter(({ sexe }) => sexe === "Mixte").length, 1);
  assert.equal(split.find(({ sexe }) => sexe === "Mixte").autoMixedFallback, true);
  assert.equal(prepareCategoriesForPools([{ ...category, manualMixed: true }], competitors).length, 1);
});

test("pool preparation falls back to one mixed pool when neither sex reaches three", () => {
  const competitors = [
    { id: "h1", sexe: "Homme", age: 10 }, { id: "h2", sexe: "Homme", age: 10 },
    { id: "f1", sexe: "Femme", age: 10 }, { id: "f2", sexe: "Femme", age: 10 },
  ];
  const category = { id: "mixed", nom: "Randori · Mixte", discipline: "randori", competitorIds: competitors.map(({ id }) => id) };
  const [poolCategory] = prepareCategoriesForPools([category], competitors);
  assert.equal(poolCategory.sexe, "Mixte");
  assert.equal(poolCategory.competitorIds.length, 4);
  assert.equal(poolCategory.autoMixedFallback, true);
});

test("pool preparation converts Randori and Kata 0/1 above 12", () => {
  const competitors = [{ id: "adult", sexe: "Homme", age: 18 }];
  const [combat] = prepareCategoriesForPools([{ id: "r", nom: "Randori · Seniors · Homme", discipline: "randori", registrationCategory: "Randori", competitorIds: ["adult"] }], competitors);
  const [kata] = prepareCategoriesForPools([{ id: "k", nom: "Kata 1 · Seniors · Homme", discipline: "kata_individuel", kataGroup: "Kata 1", competitorIds: ["adult"] }], competitors);
  assert.equal(combat.discipline, "ju_randori");
  assert.equal(combat.registrationCategory, "Ju Randori");
  assert.equal(kata.kataGroup, "Kata 2");
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

test("combat matches alternate competitors within each round", () => {
  const matches = generateMatches(["a", "b", "c", "d"], { id: "category", discipline: "ju_randori" });
  assert.equal(matches.length, 6);
  assert.equal(new Set(matches.flatMap(({ akaId, shiroId }) => [akaId, shiroId])).size, 4);
  assert.equal(new Set([matches[0].akaId, matches[0].shiroId, matches[1].akaId, matches[1].shiroId]).size, 4);
  assert.equal(new Set(matches.map(({ akaId, shiroId }) => [akaId, shiroId].sort().join("-"))).size, 6);
});
