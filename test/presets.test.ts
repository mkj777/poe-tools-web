import assert from "node:assert/strict";
import test from "node:test";
import { BAND_MIN, PRESET_THRESHOLDS, inBand } from "../src/lib/presets.ts";

test("the presets are the five whole-chaos steps a beast list offers", () => {
  assert.deepEqual(PRESET_THRESHOLDS, [1, 2, 3, 4, 5]);
});

test("a value at the threshold is in its band", () => {
  assert.equal(inBand(3, 3), true);
});

test("a value one short of the threshold is not", () => {
  assert.equal(inBand(2.99, 3), false);
});

test("a value up to just under the next whole number stays in the band", () => {
  assert.equal(inBand(3.99, 3), true);
});

test("the next whole number itself has left the band", () => {
  assert.equal(inBand(4, 3), false);
});

test("BAND_MIN is the count a bulk step needs before it splits off", () => {
  assert.equal(BAND_MIN, 10);
});
