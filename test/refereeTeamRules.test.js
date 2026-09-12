import assert from "node:assert/strict";
import test from "node:test";
import { effectiveRefereeAssignments, fukushinSlotsForDiscipline, refereeSlotsForDiscipline, replaceCompetitionReferee, replaceMatchReferee } from "../src/refereeTeamRules.js";

test("Randori et Ju-Randori affichent trois Fukushin", () => {
  for (const discipline of ["randori", "ju_randori", "ju_randori_equipe", "dantai_randori"]) {
    assert.deepEqual(fukushinSlotsForDiscipline(discipline), ["Fukushin 1", "Fukushin 2", "Fukushin 3"]);
    assert.equal(refereeSlotsForDiscipline(discipline).includes("Fukushin 4"), false);
  }
});

test("les katas affichent quatre Fukushin", () => {
  for (const discipline of ["kata_individuel", "kata_equipe"]) {
    assert.deepEqual(fukushinSlotsForDiscipline(discipline), ["Fukushin 1", "Fukushin 2", "Fukushin 3", "Fukushin 4"]);
    assert.equal(refereeSlotsForDiscipline(discipline).includes("Fukushin 4"), true);
  }
});

test("un remplaçant libre ne modifie que le poste choisi pour ce match", () => {
  const baseTeam = {
    Shushin: { refereeId: "A" },
    "Fukushin 1": { refereeId: "B" },
  };
  const overrides = replaceMatchReferee(baseTeam, {}, "Shushin", "C");
  const effective = effectiveRefereeAssignments(baseTeam, overrides);
  assert.equal(effective.Shushin.refereeId, "C");
  assert.equal(effective["Fukushin 1"].refereeId, "B");
  assert.equal(baseTeam.Shushin.refereeId, "A");
});

test("deux arbitres déjà présents sont interchangés sans doublon", () => {
  const baseTeam = {
    Shushin: { refereeId: "A" },
    "Fukushin 1": { refereeId: "B" },
  };
  const overrides = replaceMatchReferee(baseTeam, {}, "Shushin", "B");
  const effective = effectiveRefereeAssignments(baseTeam, overrides);
  assert.equal(effective.Shushin.refereeId, "B");
  assert.equal(effective["Fukushin 1"].refereeId, "A");
  assert.equal(new Set(Object.values(effective).map(({ refereeId }) => refereeId)).size, 2);
});

test("une modification d'équipe fixe intervertit aussi deux arbitres de tatamis différents", () => {
  const assignments = {
    1: { Shushin: { refereeId: "A" } },
    2: { Shushin: { refereeId: "B" } },
  };
  const updated = replaceCompetitionReferee(assignments, 1, "Shushin", "B");
  assert.equal(updated[1].Shushin.refereeId, "B");
  assert.equal(updated[2].Shushin.refereeId, "A");
  assert.equal(assignments[1].Shushin.refereeId, "A");
});

test("un poste fixe peut être libéré sans déplacer un autre poste vide", () => {
  const assignments = {
    1: { Shushin: { refereeId: "A" }, "Fukushin 1": { refereeId: "" } },
  };
  const updated = replaceCompetitionReferee(assignments, 1, "Shushin", "");
  assert.equal(updated[1].Shushin.refereeId, "");
  assert.equal(updated[1]["Fukushin 1"].refereeId, "");
});
