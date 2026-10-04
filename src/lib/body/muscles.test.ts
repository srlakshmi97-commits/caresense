import { test } from "node:test";
import assert from "node:assert/strict";
import { BACK, FRONT, regionOfMuscleId, sideOf } from "./muscles";

test("front view: viewer's left is the person's right", () => {
  assert.equal(sideOf("front", false), "r");
  assert.equal(sideOf("front", true), "l");
  assert.equal(sideOf("back", false), "l");
  assert.equal(sideOf("back", true), "r");
  assert.equal(sideOf("front", false, true), "c");
});

test("muscles map to coarse regions the safety engine understands", () => {
  assert.equal(regionOfMuscleId("r.pectoralis"), "chest");
  assert.equal(regionOfMuscleId("l.oblique"), "left_side");
  assert.equal(regionOfMuscleId("r.oblique"), "right_side");
  assert.equal(regionOfMuscleId("c.upper_abs"), "upper_abdomen");
  assert.equal(regionOfMuscleId("c.lower_back"), "back");
  assert.equal(regionOfMuscleId("l.calf"), "legs");
});

test("invalid muscle ids are rejected", () => {
  assert.equal(regionOfMuscleId("x.deltoid"), null);
  assert.equal(regionOfMuscleId("r.upper_abs"), null); // centre muscle can't have a side
  assert.equal(regionOfMuscleId("c.deltoid"), null);
  assert.equal(regionOfMuscleId("r.<script>"), null);
});

test("every shape has a unique key per view", () => {
  for (const view of [FRONT, BACK]) {
    const keys = view.map((m) => m.key);
    assert.equal(new Set(keys).size, keys.length);
  }
});
