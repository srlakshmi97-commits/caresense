import { test } from "node:test";
import assert from "node:assert/strict";
import { estimateProtein, sumProtein, mealTypeForHour, searchFoods } from "./foods";

test("protein estimate lookup", () => {
  assert.equal(estimateProtein("idli", "3"), 6);
  assert.equal(estimateProtein("sambar", "bowl"), 6);
  assert.equal(estimateProtein("custom", "bowl"), null);
  assert.equal(estimateProtein("rice", "nope"), null);
});

test("sum keeps track of unknown items", () => {
  assert.deepEqual(sumProtein([{ protein_g: 6 }, { protein_g: 8 }, { protein_g: null }]), { grams: 14, unknown: 1 });
});

test("meal type by hour", () => {
  assert.equal(mealTypeForHour(8), "breakfast");
  assert.equal(mealTypeForHour(13), "lunch");
  assert.equal(mealTypeForHour(16), "snack");
  assert.equal(mealTypeForHour(20), "dinner");
});

test("foods are found in any language", () => {
  const first = (q: string) => searchFoods(q)[0]?.key;
  assert.equal(first("cabbage koottu"), "koottu");
  assert.equal(first("முட்டைகோஸ் கூட்டு"), "koottu");
  assert.equal(first("சாதம்"), "rice");
  assert.equal(first("chawal"), "rice");
  assert.equal(first("दाल"), "dal");
  assert.equal(first("thayir sadam"), "curd_rice");
  assert.equal(first("ಮೊಸರನ್ನ"), "curd_rice");
  assert.equal(first("idly"), "idli");
  assert.deepEqual(searchFoods("x"), []);
});
