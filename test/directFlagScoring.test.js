import test from "node:test";
import assert from "node:assert/strict";
import {
  DIRECT_FLAG_ASSAULTS,
  normalizeDirectFlagRows,
  directFlagRowResult,
  scoreDirectFlagRows,
  isFullDirectFlagMatchResolved,
  isShortRandoriResolved,
  setDirectFlagCount,
} from "../src/directFlagScoring.js";

test("stores AKA and SHIRO flag counts independently", () => {
  let rows = normalizeDirectFlagRows([]);
  rows = setDirectFlagCount(rows, 0, "aka", 3);
  rows = setDirectFlagCount(rows, 0, "shiro", 2);
  assert.equal(rows[0].akaFlags, 3);
  assert.equal(rows[0].shiroFlags, 2);
  assert.equal(directFlagRowResult(rows[0]), "AKA");
});

test("clicking the selected flag count again clears it", () => {
  let rows = normalizeDirectFlagRows([]);
  rows = setDirectFlagCount(rows, 0, "aka", 2);
  rows = setDirectFlagCount(rows, 0, "aka", 2);
  assert.equal(rows[0].akaFlags, 0);
});

test("scores the announced number of flags rather than individual judges", () => {
  const rows = normalizeDirectFlagRows([]).map((row, index) => index === 0
    ? { ...row, akaFlags: 3, shiroFlags: 2 }
    : row);
  assert.deepEqual(scoreDirectFlagRows(rows), { akaPositive: 3, shiroPositive: 2 });
});

test("converts legacy individual votes to direct flag counts", () => {
  const legacy = [{ label: "Tsuki 1", votes: ["AKA", "AKA", "SHIRO"] }];
  const rows = normalizeDirectFlagRows(legacy);
  assert.equal(rows[0].akaFlags, 2);
  assert.equal(rows[0].shiroFlags, 1);
});

test("short Randori resolves on Tsuki 1, Mae Geri 1 and Mawashi 1", () => {
  let rows = normalizeDirectFlagRows([]);
  for (const index of [0, 2, 4]) rows[index] = { ...rows[index], akaFlags: 2, shiroFlags: 1 };
  assert.equal(isShortRandoriResolved(rows), true);
  assert.equal(isFullDirectFlagMatchResolved(rows), false);
});

test("full match requires all seven sequences", () => {
  const rows = DIRECT_FLAG_ASSAULTS.map((label) => ({ label, akaFlags: 1, shiroFlags: 2 }));
  assert.equal(isFullDirectFlagMatchResolved(rows), true);
});
