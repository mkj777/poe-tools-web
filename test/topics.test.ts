import assert from "node:assert/strict";
import test from "node:test";
import { SITE_TOOLS } from "../src/lib/nav.ts";
import { GROUP_CAPS, normalize } from "../src/lib/search.ts";
import { EXTERNAL_TOOLS } from "../src/lib/tools.ts";
import {
  TOPICS,
  toolsWithTopic,
  topicById,
  type TopicId,
} from "../src/lib/topics.ts";

const tools = [
  ...SITE_TOOLS.map((t) => ({ name: t.label, ...t })),
  ...EXTERNAL_TOOLS,
];

test("every subject has an id, a label and is spelled for a URL", () => {
  const ids = TOPICS.map((t) => t.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const topic of TOPICS) {
    assert.match(topic.id, /^[a-z][a-z-]*$/);
    assert.ok(topic.label.length > 0, topic.id);
    assert.ok(!topic.label.endsWith("."), topic.id);
    assert.ok(!topic.label.includes("\u2014"), topic.id);
  }
});

test("aliases are written the way the search reads them", () => {
  for (const topic of TOPICS) {
    assert.ok(topic.aliases.length > 0, topic.id);
    const seen = new Set<string>();
    for (const alias of topic.aliases) {
      assert.equal(alias, normalize(alias), `${topic.id}: ${alias}`);
      assert.ok(alias.length > 0, topic.id);
      assert.ok(!seen.has(alias), `${topic.id} lists ${alias} twice`);
      seen.add(alias);
    }
  }
});

test("every tool is about something, and something that exists", () => {
  assert.equal(tools.length, 22);
  for (const tool of tools) {
    assert.ok(tool.topics.length > 0, tool.name);
    assert.equal(new Set(tool.topics).size, tool.topics.length, tool.name);
    for (const id of tool.topics) assert.ok(topicById(id), `${tool.name}: ${id}`);
  }
});

test("no subject is declared that no tool is about", () => {
  for (const topic of TOPICS) {
    assert.ok(toolsWithTopic(topic.id).length > 0, `${topic.id} is unused`);
  }
});

test("a tool's aliases say something its name does not", () => {
  for (const tool of tools) {
    const aliases = (tool.aliases ?? []).map(normalize);
    assert.equal(new Set(aliases).size, aliases.length, tool.name);
    for (const alias of aliases) {
      assert.ok(alias.length > 0, tool.name);
      assert.ok(alias.length <= 40, `${tool.name}: ${alias}`);
      assert.notEqual(alias, normalize(tool.name), tool.name);
    }
  }
});

test("the subjects the search is measured against", () => {
  const under = (id: TopicId) => toolsWithTopic(id);
  assert.deepEqual(under("skill-tree"), [
    "Path of Building",
    "poe.ninja",
    "Timeless Jewels",
    "Cluster Jewels",
    "PoE Planner",
  ]);
  assert.deepEqual(under("overlay"), ["Leveling Guide", "Awakened PoE Trade"]);
  assert.deepEqual(under("regex"), ["Beast Regex", "Map Regex", "PoE Regex"]);
  assert.deepEqual(under("labyrinth"), ["PoELab"]);
  assert.deepEqual(under("atlas"), ["Scarab Nodes", "PoE Planner"]);
  assert.deepEqual(under("guides"), ["Maxroll"]);
  assert.deepEqual(under("wiki"), ["PoEDB"]);
  assert.deepEqual(under("crafting"), [
    "Cluster Jewels",
    "Craft of Exile",
    "PoEDB",
  ]);
  assert.deepEqual(under("desktop"), [
    "Leveling Guide",
    "Path of Building",
    "Awakened PoE Trade",
    "Exilence",
  ]);
  assert.deepEqual(under("leveling"), ["Leveling Guide", "Exile Leveling"]);
});

test("a subject holds no more tools than a query for it shows", () => {
  // The palette names the subject a record matched on, so a subject that
  // outgrows the group would name one and then leave a tool out of it.
  for (const topic of TOPICS) {
    assert.ok(
      toolsWithTopic(topic.id).length <= GROUP_CAPS.tools,
      `${topic.id} holds ${toolsWithTopic(topic.id).length}`,
    );
  }
});

test("asking for a subject that is not one is a mistake, not undefined", () => {
  assert.throws(() => topicById("nonsense" as TopicId), /nonsense/);
});
