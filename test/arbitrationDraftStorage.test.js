import assert from "node:assert/strict";
import test from "node:test";
import { arbitrationDraftKey, arbitrationSheetKey, deleteArbitrationDraft, loadArbitrationDraft, saveArbitrationDraft } from "../src/arbitrationDraftStorage.js";

function memoryStorage() {
  const values = new Map();
  return { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: (key) => values.delete(key) };
}

const passage = { competitionId: "competition-42", discipline: "kata", poolId: "pool-7", id: "passage-3", tatami: 2, statut: "À venir" };

test("une saisie Kata survit à un rechargement et restaure le kata et les cinq notes", () => {
  const storage = memoryStorage();
  const payload = { kataName: "Nanbu Shodan", notes: ["7.0", "7.5", "8.0", "7.5", "8.5"] };

  assert.equal(saveArbitrationDraft(storage, passage, payload, "2026-08-29T12:00:00.000Z"), true);
  const samePassageAfterReload = { ...passage };
  assert.equal(arbitrationDraftKey(samePassageAfterReload), arbitrationDraftKey(passage));
  assert.deepEqual(loadArbitrationDraft(storage, samePassageAfterReload)?.payload, payload);
});

test("les brouillons sont isolés par compétition, épreuve, passage et tatami", () => {
  assert.notEqual(arbitrationDraftKey(passage), arbitrationDraftKey({ ...passage, competitionId: "competition-43" }));
  assert.notEqual(arbitrationDraftKey(passage), arbitrationDraftKey({ ...passage, discipline: "ju_randori" }));
  assert.notEqual(arbitrationDraftKey(passage), arbitrationDraftKey({ ...passage, id: "passage-4" }));
  assert.notEqual(arbitrationDraftKey(passage), arbitrationDraftKey({ ...passage, tatami: 3 }));
});

test("un résultat terminé ne peut ni charger ni écraser un ancien brouillon", () => {
  const storage = memoryStorage();
  saveArbitrationDraft(storage, passage, { kataName: "Nanbu Shodan", notes: ["7", "7", "7", "7", "7"] });
  const completed = { ...passage, statut: "Terminé" };
  assert.equal(loadArbitrationDraft(storage, completed), null);
  assert.equal(saveArbitrationDraft(storage, completed, { kataName: "ancien" }), false);
});

test("le brouillon reste présent jusqu'à une suppression explicite", () => {
  const storage = memoryStorage();
  saveArbitrationDraft(storage, passage, { kataName: "Nanbu Shodan", notes: ["7", "7", "7", "7", "7"] });
  assert.ok(loadArbitrationDraft(storage, passage));
  deleteArbitrationDraft(storage, passage);
  assert.equal(loadArbitrationDraft(storage, passage), null);
});

test("une feuille Ju-Randori vierge ne crée pas de sauvegarde de secours", () => {
  const storage = memoryStorage();
  const juRandori = { ...passage, discipline: "ju_randori", id: "combat-vierge" };
  const blankPayload = {
    kataAka: ["", "", ""], kataShiro: ["", "", ""],
    assaults: [{ label: "Tsuki 1", votes: ["", "", ""] }],
    tieBreakAssaults: [], finalFlags: ["", "", ""],
    penalties: { aka: [], shiro: [] }, maiWarnings: { aka: [], shiro: [] }, maiHistory: [],
  };
  assert.equal(saveArbitrationDraft(storage, juRandori, blankPayload), false);
  assert.equal(loadArbitrationDraft(storage, juRandori), null);
});

test("le premier vote Ju-Randori crée bien une sauvegarde de secours", () => {
  const storage = memoryStorage();
  const juRandori = { ...passage, discipline: "ju_randori", id: "combat-commence" };
  const startedPayload = { assaults: [{ label: "Tsuki 1", votes: ["AKA", "", ""] }] };
  assert.equal(saveArbitrationDraft(storage, juRandori, startedPayload), true);
  assert.deepEqual(loadArbitrationDraft(storage, juRandori)?.payload, startedPayload);
});

test("la clé de la feuille reste stable quand une sauvegarde automatique est créée", () => {
  const beforeSave = { ...passage, discipline: "ju_randori", id: "combat-stable" };
  const afterSave = { ...beforeSave, statut: "En cours", liveDraftSavedAt: "2026-09-03T09:14:23.000Z", penalties: { aka: [{ id: "keikoku" }], shiro: [] } };
  assert.equal(arbitrationSheetKey(afterSave), arbitrationSheetKey(beforeSave));
});
