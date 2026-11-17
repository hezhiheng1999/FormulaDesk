"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const matrix = fs.existsSync(path.join(__dirname,"../src/matrix.js")) ? require("../src/matrix.js") : {};
test("matrix template preserves requested rows and columns as individual placeholders", () => {
  assert.equal(typeof matrix.template,"function");
  assert.equal(matrix.template(2,3,"bmatrix"),"\\begin{bmatrix}#0 & #0 & #0 \\\\ #0 & #0 & #0\\end{bmatrix}");
  assert.equal(matrix.template(1,1,"pmatrix"),"\\begin{pmatrix}#0\\end{pmatrix}");
});
test("matrix insertion refuses fractional, empty, unsupported and excessive dimensions", () => {
  assert.equal(typeof matrix.template,"function");
  for (const [rows,cols,env] of [[0,2,"matrix"],[2.5,2,"matrix"],[2,11,"matrix"],[11,1,"matrix"],[2,2,"cases"],["2",2,"bmatrix"]]) assert.throws(()=>matrix.template(rows,cols,env));
  assert.equal((matrix.template(10,10,"vmatrix").match(/#0/g)||[]).length,100);
});
