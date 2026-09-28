import test from "node:test";
import assert from "node:assert/strict";
import { juRandoriNegativeTotal, isJuRandoriDisqualified, normalizeJuRandoriPenalties } from "../src/juRandoriPenaltyRules.js";

const p = (id) => ({ id });

test("3 Keikoku deviennent 1 Fujubun", () => {
  const normalized = normalizeJuRandoriPenalties([p("keikoku"), p("keikoku"), p("keikoku")]);
  assert.equal(normalized.filter((x) => x.id === "fujubun").length, 1);
  assert.equal(juRandoriNegativeTotal(normalized), 1);
});

test("3 Fujubun donnent -3 et disqualification", () => {
  const penalties = [p("fujubun"), p("fujubun"), p("fujubun")];
  assert.equal(juRandoriNegativeTotal(penalties), 3);
  assert.equal(isJuRandoriDisqualified(penalties), true);
});

test("1 Chui + 1 Fujubun donnent -3 et disqualification", () => {
  const penalties = [p("chui"), p("fujubun")];
  assert.equal(juRandoriNegativeTotal(penalties), 3);
  assert.equal(isJuRandoriDisqualified(penalties), true);
});

test("2 Fujubun restent -2 sans disqualification", () => {
  const penalties = [p("fujubun"), p("fujubun")];
  assert.equal(juRandoriNegativeTotal(penalties), 2);
  assert.equal(isJuRandoriDisqualified(penalties), false);
});

test("Hansoku Chui disqualifie immédiatement", () => {
  assert.equal(isJuRandoriDisqualified([p("hansoku_chui")]), true);
});
