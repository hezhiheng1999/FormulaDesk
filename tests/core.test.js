"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const core = require("../src/core.js");

const wrapped = [
  ["\\[x^2\\]", "x^2"], ["\\(x_i\\)", "x_i"], ["$$x+y$$", "x+y"],
  ["$x+y$", "x+y"], ["```latex\n\\frac{a}{b}\n```", "\\frac{a}{b}"],
  ["```tex\r\n\\[x+y\\]\r\n```", "x+y"],
];
for (const [input, expected] of wrapped) {
  test("unwrap complete formula " + JSON.stringify(input), () => assert.equal(core.normalizeSource(input), expected));
}
for (const input of ["  x+y  ", "$a$ + $b$", "$$a$$\n$$b$$", "\\[a\\] + \\[b\\]", "```latex\nx+y", "\\frac{a}{"]) {
  test("preserve original " + JSON.stringify(input), () => assert.equal(core.normalizeSource(input), input));
}
test("size boundaries retain raw input and prevent copies", () => {
  assert.equal(core.analyzeSource("x".repeat(10000)).valid, true);
  assert.equal(core.analyzeSource("x".repeat(10001)).code, "length");
  assert.equal(core.canCopy("x", "n".repeat(10000)), true);
  assert.equal(core.canCopy("x", "n".repeat(10001)), false);
});
test("nesting boundaries and escaped braces", () => {
  assert.equal(core.analyzeSource("{".repeat(64) + "x" + "}".repeat(64)).valid, true);
  assert.equal(core.analyzeSource("(".repeat(65) + "x" + ")".repeat(65)).code, "depth");
  assert.equal(core.analyzeSource("\\{x\\}").preview, true);
  assert.equal(core.analyzeSource("\\frac{a}{").code, "braces");
  assert.equal(core.analyzeSource("}x{").preview, false);
  assert.equal(core.analyzeSource("{]".repeat(65) + "x" + "}".repeat(65)).code, "depth");
});
test("command chains are bounded before the recursive parser runs", () => {
  assert.equal(core.analyzeSource("\\sqrt".repeat(64) + "{x}").valid, true);
  assert.equal(core.analyzeSource("\\sqrt".repeat(65) + "{x}").code, "complexity");
  assert.equal(core.analyzeSource("\\sqrt".repeat(1600) + "{x}").valid, false);
});
for (const command of ["href{https://example.test}{x}", "href{javascript:alert(1)}{x}", "url{file:///test}", "htmlClass{a}{x}", "style{a}{x}"]) {
  test("source-only active extension " + command, () => {
    const source = "\\" + command;
    assert.equal(core.analyzeSource(source).preview, false);
    assert.equal(core.buildPayload(source, "", false), source);
  });
}
test("payload is plain text with formula and note intact", () => {
  const source = "\\begin{bmatrix}a&b\\\\c&d\\end{bmatrix}";
  const note = "I、Q 为实数；<script>alert(1)</script> 是普通文本。";
  const result = core.buildPayload(source, note);
  assert.ok(result.includes(source));
  assert.ok(result.endsWith(note));
  assert.ok(result.startsWith("请先复述"));
  assert.equal(core.buildPayload(source, note, false), source);
  assert.throws(() => core.buildPayload("  ", "note"), RangeError);
});
test("empty formula and wrapper normalization", () => {
  assert.equal(core.canCopy(core.normalizeSource("$$ $$"), "note"), false);
  assert.equal(core.canCopy("x", ""), true);
});
test("escaped closing delimiters are not stripped", () => {
  assert.equal(core.normalizeSource("$x\\$"), "$x\\$");
  assert.equal(core.normalizeSource("$$x\\$$"), "$$x\\$$");
  assert.equal(core.normalizeSource("$x\\\\$"), "x\\\\");
  assert.equal(core.normalizeSource("$x\\\\$ + $y$"), "$x\\\\$ + $y$");
  assert.equal(core.normalizeSource("$x\\$+y$"), "x\\$+y");
});
test("supplementary mathematical symbols keep UTF-16 delimiter offsets", () => {
  const original = "$𝑥\\i$ + \\j$y$";
  assert.equal(core.normalizeSource(original), original);
  assert.equal(core.normalizeSource("$𝑥+y$"), "𝑥+y");
});

const context = vm.createContext({ exports: {}, module: { exports: {} }, HTMLElement: class {}, URL, console: { log() {}, warn() {}, error() {} } });
vm.runInContext(fs.readFileSync(path.join(__dirname, "../vendor/mathlive.min.js"), "utf8"), context, { timeout: 10000 });
const mathlive = context.exports;
for (const input of ["x=\\frac{a+b}{c+d}", "\\sqrt{x^2+y^2}", "\\sum_{i=1}^{N}x_i", "\\int_0^1 x\\,\\mathrm{d}x", "\\begin{bmatrix}1&2\\\\3&4\\end{bmatrix}", "\\lvert z\\rvert^2"]) {
  test("real pinned parser accepts supported formula " + input, () => {
    assert.equal(mathlive.validateLatex(input).length, 0);
    assert.ok(mathlive.convertLatexToMarkup(input).includes("ML__"));
  });
}
test("own brace check blocks a partial fraction accepted by the pinned parser", () => {
  assert.equal(mathlive.validateLatex("\\frac{a}{").length, 0);
  assert.equal(core.analyzeSource("\\frac{a}{").preview, false);
});
for (const input of ["\\left(x", "\\begin{bmatrix}a&b", "\\badcmd{x}"]) {
  test("real pinned parser flags incomplete or unknown raw input " + input, () => {
    assert.ok(mathlive.validateLatex(input).length > 0);
  });
}
