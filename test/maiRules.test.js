import test from "node:test";
import assert from "node:assert/strict";
import { applyMaiWarning } from "../src/maiRules.js";

function warning(assaultIndex) {
  return { assaultIndex, assaultLabel: `Assaut ${assaultIndex}` };
}

function add(state, assaultIndex) {
  const result = applyMaiWarning(state.activeWarnings, warning(assaultIndex));
  return {
    activeWarnings: result.activeWarnings,
    fujubun: state.fujubun + Number(Boolean(result.conversion)),
  };
}

test("test 1: two Maï in Tsuki 1 immediately give one Fujubun and reset Maï", () => {
  let state = { activeWarnings: [], fujubun: 0 };
  state = add(state, 0);
  state = add(state, 0);
  assert.deepEqual(state, { activeWarnings: [], fujubun: 1 });
});

test("test 2: one Maï in each of two distinct assaults remains as two Maï", () => {
  let state = { activeWarnings: [], fujubun: 0 };
  state = add(state, 0);
  state = add(state, 1);
  assert.equal(state.fujubun, 0);
  assert.deepEqual(state.activeWarnings.map(({ assaultIndex }) => assaultIndex), [0, 1]);
});

test("test 3: Maï in three distinct assaults give one Fujubun and reset Maï", () => {
  let state = { activeWarnings: [], fujubun: 0 };
  for (const assaultIndex of [0, 1, 2]) state = add(state, assaultIndex);
  assert.deepEqual(state, { activeWarnings: [], fujubun: 1 });
});

test("test 4: a same-assault pair resets all accumulated Maï", () => {
  let state = { activeWarnings: [], fujubun: 0 };
  for (const assaultIndex of [0, 1, 1]) state = add(state, assaultIndex);
  assert.deepEqual(state, { activeWarnings: [], fujubun: 1 });
});

test("test 5: AKA and SHIRO Maï states remain independent", () => {
  let aka = { activeWarnings: [], fujubun: 0 };
  let shiro = { activeWarnings: [], fujubun: 0 };
  aka = add(add(aka, 0), 0);
  shiro = add(shiro, 1);
  assert.deepEqual(aka, { activeWarnings: [], fujubun: 1 });
  assert.equal(shiro.fujubun, 0);
  assert.deepEqual(shiro.activeWarnings.map(({ assaultIndex }) => assaultIndex), [1]);
});

test("removing a Maï leaves the remaining assault state available for recalculation", () => {
  let state = { activeWarnings: [], fujubun: 0 };
  state = add(add(state, 0), 1);
  state.activeWarnings = state.activeWarnings.slice(0, -1);
  state = add(state, 2);
  assert.equal(state.fujubun, 0);
  assert.deepEqual(state.activeWarnings.map(({ assaultIndex }) => assaultIndex), [0, 2]);
});
