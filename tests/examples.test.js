"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const core = require("../src/core.js");

// Catch omissions in the catalog and raw LaTeX that cannot be previewed or copied.
// This exercises the same pinned parser and input boundary as the shipped page.
test("all four example domains provide two full pages of renderable, copyable formulas", () => {
  const catalogPath = path.join(__dirname, "../src/examples.js");
  assert.ok(fs.existsSync(catalogPath), "The domain example catalog is missing");
  const groups = require(catalogPath);
  assert.deepEqual(groups.map((group) => group.label), ["相干通信", "通用数学", "线性代数", "概率论与数理统计"]);
  assert.equal(new Set(groups.map((group) => group.id)).size, 4);
  const context = vm.createContext({ exports: {}, module: { exports: {} }, HTMLElement: class {}, URL, console: { log() {}, warn() {}, error() {} } });
  vm.runInContext(fs.readFileSync(path.join(__dirname, "../vendor/mathlive.min.js"), "utf8"), context, { timeout: 10000 });
  const formulas = new Set();
  for (const group of groups) {
    assert.equal(group.items.length, 12, group.label);
    for (const item of group.items) {
      assert.ok(item.title.trim() && item.note.trim(), group.label + " has an unlabeled formula");
      assert.equal(formulas.has(item.latex), false, item.title + " duplicates another example");
      formulas.add(item.latex);
      assert.equal(core.analyzeSource(item.latex).preview, true, item.title);
      assert.equal(context.exports.validateLatex(item.latex).length, 0, item.title);
      assert.ok(context.exports.convertLatexToMarkup(item.latex).includes("ML__"), item.title);
      assert.equal(core.buildPayload(item.latex, item.note, false), item.latex);
      const payload = core.buildPayload(item.latex, item.note, true);
      assert.ok(payload.includes(item.latex) && payload.endsWith(item.note), item.title);
    }
  }
  assert.equal(formulas.size, 48);
});
