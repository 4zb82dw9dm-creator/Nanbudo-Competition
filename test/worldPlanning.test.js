import test from "node:test";
import assert from "node:assert/strict";
import { buildPlanning, worldKataFinalistCount } from "../src/planningLogic.js";

function worldCompetition(count) {
  const ids = Array.from({ length: count }, (_, i) => `c${i + 1}`);
  return {
    categoryMode: "world_championship_2026",
    pools: [{
      id: "p1", categoryId: "k1", nom: "KATA WORLD · Poule 1", discipline: "kata_individuel",
      competitorIds: ids, tatami: 1,
      matches: [1, 2].flatMap((kataRound) => ids.map((competitorId, index) => ({ competitorId, kataRound, ordre: (kataRound - 1) * count + index + 1 }))),
    }],
  };
}

test("World Kata reproduit les tailles de finale du planning officiel", () => {
  assert.equal(worldKataFinalistCount(4), 0);
  assert.equal(worldKataFinalistCount(5), 0);
  assert.equal(worldKataFinalistCount(7), 4);
  assert.equal(worldKataFinalistCount(9), 5);
  assert.equal(worldKataFinalistCount(10), 5);
});

test("World Kata 7: 56 min de qualifications puis finale séparée de 16 min", () => {
  const planning = buildPlanning(worldCompetition(7));
  const qualification = planning.entries.find((entry) => entry.categoryId === "k1");
  const final = planning.worldKataFinals[0];
  assert.equal(qualification.duration, 65);
  assert.equal(final.duration, 16);
  assert.equal(final.finalistCount, 4);
  assert.ok(final.start >= 14 * 60);
});

test("AFDP ne reçoit aucune finale World programmée", () => {
  const competition = { ...worldCompetition(7), categoryMode: undefined };
  const planning = buildPlanning(competition);
  assert.deepEqual(planning.worldKataFinals, []);
});
