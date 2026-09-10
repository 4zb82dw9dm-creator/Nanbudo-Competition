import test from "node:test";
import assert from "node:assert/strict";
import { calculateRanking, unresolvedPoolTieGroups } from "../src/competitionLogic.js";

function match(akaId, shiroId, winnerId, { akaNegative = 0, shiroNegative = 0 } = {}) {
  return {
    akaId,
    shiroId,
    winnerId,
    akaScore: winnerId === akaId ? 1 : 0,
    shiroScore: winnerId === shiroId ? 1 : 0,
    akaNegative,
    shiroNegative,
    statut: "Terminé",
  };
}

function pool(matches, extra = {}) {
  return {
    id: "ju-test",
    discipline: "ju_randori",
    competitorIds: ["A", "B", "C"],
    matches,
    ...extra,
  };
}

test("Ju-Randori: fewer negative points comes before direct encounter", () => {
  const matches = [
    match("A", "B", "A", { akaNegative: 2, shiroNegative: 1 }),
    match("A", "C", "C"),
    match("B", "C", "B"),
  ];
  const ranking = calculateRanking(pool(matches)).map(({ competitorId }) => competitorId);
  assert.ok(ranking.indexOf("B") < ranking.indexOf("A"));
});

test("Ju-Randori: direct encounter resolves a two-person tie after negative points", () => {
  const matches = [
    match("A", "B", "A"),
    match("A", "C", "C"),
    match("B", "C", "B"),
  ];
  const juPool = pool(matches);
  const ranking = calculateRanking(juPool).map(({ competitorId }) => competitorId);
  assert.ok(ranking.indexOf("A") < ranking.indexOf("B"));
  assert.deepEqual(unresolvedPoolTieGroups(juPool), []);
});

test("Ju-Randori: unresolved tie requires supplemental assaults, then respects recorded order", () => {
  const matches = [
    match("A", "B", null),
    match("A", "C", "A"),
    match("B", "C", "B"),
  ];
  const juPool = pool(matches);
  assert.deepEqual(unresolvedPoolTieGroups(juPool), [["A", "B"]]);

  const resolved = { ...juPool, poolTieBreakOrder: ["B", "A"] };
  assert.deepEqual(unresolvedPoolTieGroups(resolved), []);
  const ranking = calculateRanking(resolved).map(({ competitorId }) => competitorId);
  assert.ok(ranking.indexOf("B") < ranking.indexOf("A"));
});
