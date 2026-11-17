"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const library = require("../src/library.js");
const key = "formuladesk.library.v1";
const flush = () => new Promise(setImmediate);

// Small DOM boundary for the real controller's save/recovery state machine.
// Native controls, focus and MathLive remain covered by browser/Windows checks.
function fixture({ valid = false } = {}) {
  const elements = {};
  class Element {
    constructor() { this.children=[]; this.value=""; this.checked=false; this.disabled=false; this.isConnected=true; this.classList={toggle(){}}; }
    set innerHTML(text) { for (const match of text.matchAll(/id="([^"]+)"/g)) elements[match[1]]=new Element(); }
    append(...items) { this.children.push(...items); }
    replaceChildren(...items) { this.children=items; }
    setAttribute() {}
    addEventListener(name,callback) { this["on"+name]=callback; }
    focus() {}
    querySelectorAll() { return Object.values(elements); }
  }
  elements["formula-library"]=new Element();
  const backup=library.create([{id:"g-saved",label:"Saved user library",items:[]}]);
  const initial=library.create([{id:"g-default",label:"Default library",items:[
    {id:"f1",title:"One",latex:"a\r\n+b",note:"line one\r\nline two"},
    {id:"f2",title:"Two",latex:"c",note:""}]}]);
  const storage=new Map([[key,valid?library.serialize(initial):"{broken"],[key+".backup",library.serialize(backup)]]);
  const window={ FormulaDeskLibrary:library, FormulaDeskCore:require("../src/core.js"), FormulaDeskExamples:initial.groups,addEventListener(){} };
  const context={window, document:{getElementById:id=>elements[id],createElement:()=>new Element()},
    localStorage:{getItem:k=>storage.get(k)??null,setItem:(k,value)=>storage.set(k,value)},
    confirm:()=>true, crypto:{randomUUID:()=>"fixture"},TextEncoder,URL,Blob,setTimeout };
  vm.runInNewContext(fs.readFileSync(require("node:path").join(__dirname,"../src/library-ui.js"),"utf8"),context);
  window.FormulaDeskLibraryUI.init({snapshot:()=>({latex:"",note:""}),load(){throw Error("catalog must not write workspace");}});
  return {elements,storage,backup,context,initial};
}

for (const action of ["cancel", "undo"]) test("damaged library recovery choice does not survive " + action, async()=>{
  const {elements,storage,backup}=fixture(); await flush();
  elements["library-recover"].onclick(); await flush();
  if(action==="cancel") { elements["library-cancel"].onclick(); elements["library-manage"].onclick(); }
  else elements["library-undo"].onclick();
  elements["library-save"].onclick(); await flush();
  assert.equal(storage.get(key),"{broken", "cancelled recovery must not authorize replacing the damaged original");
  assert.deepEqual(library.parse(storage.get(key+".backup")),backup);
});

test("failed browser save retains the edited library for a successful retry", async()=>{
  const {elements,storage,context,initial}=fixture({valid:true}); await flush();
  elements["library-manage"].onclick(); elements["library-add"].onclick();
  elements["library-title"].value="User formula"; elements["library-title"].oninput();
  elements["library-latex"].value="\\frac{a}{"; elements["library-latex"].oninput();
  const originalWrite=context.localStorage.setItem;
  context.localStorage.setItem=()=>{throw new Error("Quota exceeded in test");};
  elements["library-save"].onclick(); await flush();
  assert.deepEqual(library.parse(storage.get(key)),initial);
  assert.match(elements["library-status"].textContent,/Quota exceeded/);
  assert.match(elements["library-page"].textContent,/3 条/);
  context.localStorage.setItem=originalWrite;
  elements["library-save"].onclick(); await flush();
  const saved=library.parse(storage.get(key));
  assert.equal(saved.groups[0].items[2].latex,"\\frac{a}{", "unfinished input must survive save and retry");
  assert.equal(saved.groups[0].items[2].title,"User formula");
});

test("deletion is confirmed, staged, reversible and only written by save", async()=>{
  const {elements,storage,context,initial}=fixture({valid:true}); await flush();
  elements["library-manage"].onclick();
  const removeFirst=()=>elements["library-rows"].children[0].children[1].children[3].onclick();
  context.confirm=()=>false; removeFirst();
  assert.match(elements["library-page"].textContent,/2 条/);
  context.confirm=()=>true; removeFirst();
  assert.match(elements["library-page"].textContent,/1 条/);
  assert.deepEqual(library.parse(storage.get(key)),initial);
  elements["library-undo"].onclick();
  assert.match(elements["library-page"].textContent,/2 条/);
  removeFirst(); elements["library-save"].onclick(); await flush();
  assert.deepEqual(library.parse(storage.get(key)).groups[0].items.map(f=>f.id),["f2"]);
});

test("editing only a preset name preserves original CRLF formula and note", async()=>{
  const {elements,storage,initial}=fixture({valid:true}); await flush();
  elements["library-manage"].onclick();
  elements["library-rows"].children[0].children[1].children[2].onclick();
  // Real textareas expose LF even when the source has CRLF.
  elements["library-latex"].value="a\n+b"; elements["library-note"].value="line one\nline two";
  elements["library-title"].value="Renamed"; elements["library-title"].oninput();
  elements["library-save"].onclick(); await flush();
  const saved=library.parse(storage.get(key)).groups[0].items[0];
  assert.equal(saved.title,"Renamed");
  assert.equal(saved.latex,initial.groups[0].items[0].latex);
  assert.equal(saved.note,initial.groups[0].items[0].note);
});

test("invalid import cannot replace the saved or editable catalog", async()=>{
  const {elements,storage,initial}=fixture({valid:true}); await flush();
  elements["library-manage"].onclick();
  for(const text of ["{broken",JSON.stringify({...initial,version:2})]) {
    elements["library-file"].files=[{size:text.length,text:async()=>text}];
    elements["library-file"].onchange(); await flush();
    assert.deepEqual(library.parse(storage.get(key)),initial);
    assert.match(elements["library-page"].textContent,/2 条/);
    assert.doesNotMatch(elements["library-status"].textContent,/已保存|已载入待保存/);
  }
});
