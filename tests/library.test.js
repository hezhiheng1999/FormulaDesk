"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const library = fs.existsSync(require("node:path").join(__dirname, "../src/library.js")) ? require("../src/library.js") : {};
const fixture = () => ({ format: "formuladesk-library", version: 1, groups: [
  { id: "domain-a", label: "领域一", items: [{ id: "entry-a", title: "自定公式", latex: " \\frac{x}{y}\r\n𝛼 ", note: "条件\r\n\u0000保留" }] },
  { id: "domain-b", label: "领域二", items: [] },
] });
test("library round trip preserves raw strings, order and independent editing copies", () => {
  assert.equal(typeof library.parse, "function", "library parser must exist");
  const original = fixture();
  const parsed = library.parse(library.serialize(original));
  assert.deepEqual(parsed, original);
  parsed.groups[0].items[0].latex = "edited";
  assert.equal(original.groups[0].items[0].latex, " \\frac{x}{y}\r\n𝛼 ");
  assert.deepEqual(library.create([]), { format: "formuladesk-library", version: 1, groups: [] });
});
test("library rejects malformed fields, duplicate identifiers and excessive content before replacement", () => {
  assert.equal(typeof library.parse, "function");
  for (const text of ["null", "{}", "[]", "{broken", JSON.stringify({...fixture(), version:2}),
    JSON.stringify({...fixture(), groups:null}), JSON.stringify({...fixture(), extra:1})]) assert.throws(() => library.parse(text));
  for (const change of [
    d => { d.groups[1].id = "domain-a"; },
    d => { d.groups[1].items.push({...d.groups[0].items[0]}); },
    d => { d.groups[0].items[0].latex = 5; },
    d => { d.groups[0].items[0].latex = "x".repeat(10001); },
    d => { d.groups[0].label = " "; },
    d => { d.groups[0].items[0].title = ""; },
    d => { d.groups[0].items[0].note = "x".repeat(10001); },
  ]) { const doc = fixture(); change(doc); assert.throws(() => library.serialize(doc)); }
  assert.throws(() => library.parse(" ".repeat(4194305)));
});
test("library moving entries respects boundaries and moves the original record with all content", () => {
  assert.equal(typeof library.move, "function");
  const items = [{id:"a",note:"first"},{id:"b",note:"second"},{id:"c",note:"third"}];
  library.move(items, 1, -1);
  assert.deepEqual(items.map(i=>i.id), ["b","a","c"]);
  library.move(items, 0, -1);
  assert.deepEqual(items.map(i=>i.note), ["second","first","third"]);
  library.move(items, 0, 1);
  assert.deepEqual(items.map(i=>i.id), ["a","b","c"]);
});
