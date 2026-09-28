import test from "node:test";
import assert from "node:assert/strict";
import { calculatePoolPodium, calculateRanking, generateMatches } from "../src/competitionLogic.js";
import { estimateCategoryDuration } from "../src/planningLogic.js";

const category = { id: "kata-a", discipline: "kata_individuel", kataGroup: "Kata 2" };

test("AFDP Kata génère deux rounds obligatoires par compétiteur", () => {
  const matches = generateMatches(["A", "B", "C"], category, 0, 1);
  assert.equal(matches.length, 6);
  assert.deepEqual(matches.map((match) => match.kataRound), [1, 1, 1, 2, 2, 2]);
  assert.deepEqual(matches.map((match) => match.ordre), [1, 2, 3, 4, 5, 6]);
});

test("classement Kata utilise le total des deux rounds", () => {
  const pool = {
    discipline: "kata_individuel",
    competitorIds: ["A", "B"],
    matches: [
      { competitorId: "A", akaId: "A", kataRound: 1, finalScore: 4.2, statut: "Terminé" },
      { competitorId: "B", akaId: "B", kataRound: 1, finalScore: 4.4, statut: "Terminé" },
      { competitorId: "A", akaId: "A", kataRound: 2, finalScore: 4.5, statut: "Terminé" },
      { competitorId: "B", akaId: "B", kataRound: 2, finalScore: 4.1, statut: "Terminé" },
    ],
  };
  const ranking = calculateRanking(pool);
  assert.equal(ranking[0].competitorId, "A");
  assert.equal(ranking[0].finalScore, 8.7);
});

test("égalité après les deux rounds déclenche un départage Kata", () => {
  const pool = {
    id: "p1",
    categoryId: "kata-a",
    discipline: "kata_individuel",
    competitorIds: ["A", "B"],
    matches: [
      { competitorId: "A", akaId: "A", kataRound: 1, finalScore: 4.2, statut: "Terminé" },
      { competitorId: "B", akaId: "B", kataRound: 1, finalScore: 4.3, statut: "Terminé" },
      { competitorId: "A", akaId: "A", kataRound: 2, finalScore: 4.4, statut: "Terminé" },
      { competitorId: "B", akaId: "B", kataRound: 2, finalScore: 4.3, statut: "Terminé" },
    ],
  };
  const result = calculatePoolPodium(pool);
  assert.deepEqual(result.tieGroups, [["A", "B"]]);
  assert.equal(result.pool.statut, "En attente de départage");
});

test("planning Kata compte bien les deux rounds et le combat utilise 6 minutes", () => {
  const kataPool = { discipline: "kata_individuel", competitorIds: ["A", "B", "C"], matches: Array.from({ length: 6 }, () => ({})) };
  const combatPool = { discipline: "ju_randori", competitorIds: ["A", "B", "C", "D"], matches: Array.from({ length: 6 }, () => ({})) };
  assert.equal(estimateCategoryDuration([kataPool]), 30);
  assert.equal(estimateCategoryDuration([combatPool]), 45);
});
