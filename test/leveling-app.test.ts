import assert from "node:assert/strict";
import test from "node:test";
import { LEVELING_APP, LEVELING_SETUP } from "../src/lib/leveling-app.ts";

test("every download points at the release the page names", () => {
  assert.match(LEVELING_APP.version, /^v\d+\.\d+\.\d+$/);
  for (const url of [LEVELING_APP.setup, LEVELING_APP.portable]) {
    assert.match(url, /^https:\/\/github\.com\/mkj777\/poe-leveling-app\//);
    // A bumped version that only reached one of the two would hand out an
    // installer and a zip from different builds.
    assert.ok(url.includes(`/download/${LEVELING_APP.version}/`), url);
  }
});

test("the setup stays short enough to read at a glance", () => {
  assert.equal(LEVELING_SETUP.length, 3);
  for (const step of LEVELING_SETUP) assert.ok(step.length < 60, step);
});
