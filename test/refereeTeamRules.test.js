import assert from "node:assert/strict";
import test from "node:test";
import { fukushinSlotsForDiscipline, refereeSlotsForDiscipline } from "../src/refereeTeamRules.js";

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
