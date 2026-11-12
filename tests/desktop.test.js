"use strict";

const test = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

test("application entry scripts parse before being bundled together", () => {
  for (const file of ["desktop.js", "app.js"]) {
    new vm.Script(fs.readFileSync(path.join(__dirname, "../src", file), "utf8"), { filename: file });
  }
});
