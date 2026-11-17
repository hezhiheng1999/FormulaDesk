"use strict";

window.FormulaDeskLibraryUI = Object.freeze({ init({ snapshot, load }) {
  const model = window.FormulaDeskLibrary;
  const root = document.getElementById("formula-library");
  const byId = (id) => document.getElementById(id);
  const defaults = model.create(window.FormulaDeskExamples);
  const desktop = Boolean(window.FormulaDeskDesktop);
  const key = "formuladesk.library.v1";
  let current = model.clone(defaults), draft = null, undo = null;
  let groupId = current.groups[0]?.id || "", page = 0, managePage = 0, mode = "formulas";
  let form = null, formChanged = new Set(), busy = false, loaded = false, damaged = false, recoveryChosen = false;
  let sequence = 0;
  const pending = new Map();

  root.innerHTML = `<div id="library-status" class="library-status" role="status" aria-live="polite"></div>
    <div id="library-browse">
      <div class="library-toolbar"><input id="library-search" type="search" placeholder="搜索名称、说明" aria-label="搜索公式名称和说明"><button id="library-manage" type="button">管理</button></div>
      <div class="library-domain-row"><div id="example-domains" class="example-domains" role="tablist" aria-label="公式使用领域"></div><label class="library-all-label">全部领域<select id="library-domain" aria-label="全部领域"></select></label></div>
      <label class="library-search-scope"><input id="library-search-all" type="checkbox"> 搜索全部领域</label>
      <div id="example-panel"><div id="example-list" class="example-list"></div></div>
      <nav class="example-pagination" aria-label="常用公式翻页"><button id="example-prev" class="icon-action" type="button" title="上一页" aria-label="上一页"><svg class="icon" aria-hidden="true"><use href="#icon-chevron-left"/></svg></button><span id="example-page" role="status" aria-live="polite"></span><button id="example-next" class="icon-action" type="button" title="下一页" aria-label="下一页"><svg class="icon" aria-hidden="true"><use href="#icon-chevron-right"/></svg></button></nav>
    </div>
    <div id="library-manager" hidden>
      <div class="library-toolbar"><strong>管理公式库</strong><button id="library-back" type="button">返回浏览</button></div>
      <p class="library-hint">可修改内置和自建条目。点“保存修改”后保留到下次打开。</p>
      <div class="library-actions"><button id="library-domains-mode" type="button">管理领域</button><button id="library-formulas-mode" type="button">管理公式</button></div>
      <div class="library-toolbar"><label id="library-edit-domain-label">领域<select id="library-edit-domain" aria-label="管理中的领域"></select></label><button id="library-add" type="button">新增公式</button><button id="library-add-current" type="button">从当前公式添加</button></div>
      <div id="library-rows"></div>
      <nav class="example-pagination" aria-label="管理清单翻页"><button id="library-prev" type="button" aria-label="管理清单上一页">‹</button><span id="library-page"></span><button id="library-next" type="button" aria-label="管理清单下一页">›</button></nav>
      <form id="library-form" class="library-form" hidden>
        <strong id="library-form-heading"></strong><label>名称<input id="library-title" maxlength="100" required></label>
        <div id="library-form-content"><label>LaTeX 源码<textarea id="library-latex" spellcheck="false"></textarea></label><label>变量与条件说明<textarea id="library-note"></textarea></label><div id="library-preview" class="library-preview" aria-label="公式预览"></div><p id="library-preview-status" class="library-hint"></p></div>
        <div class="library-actions"><button type="submit">应用到编辑清单</button><button id="library-form-cancel" type="button">取消条目编辑</button></div>
      </form>
      <div class="library-actions"><button id="library-save" class="library-primary" type="button">保存修改</button><button id="library-cancel" type="button">取消修改</button><button id="library-undo" type="button">撤销本轮操作</button></div>
    </div>
    <div class="library-actions library-file-actions"><button id="library-import" type="button">导入…</button><button id="library-export" type="button">导出备份…</button><button id="library-recover" type="button">恢复上次备份…</button><button id="library-reset" type="button">恢复内置库…</button></div>
    <input id="library-file" type="file" accept=".json,application/json" hidden>
    <p id="library-location" class="library-hint"></p>`;
  byId("library-location").textContent = desktop
    ? "保存位置：程序旁的 FormulaDesk.library.json。迁移时带走此文件，或导出备份。"
    : "保存到当前浏览器。清理浏览器数据或移动网页文件可能失去此副本；请导出文件备份、迁移。";
  function status(text, error = false) {
    byId("library-status").textContent = text;
    byId("library-status").classList.toggle("error", error);
  }
  function dirty() { return Boolean(draft && (formChanged.size || JSON.stringify(draft) !== JSON.stringify(current))); }
  function notifyDirty() {
    if (desktop) window.chrome.webview.postMessage({ type: "library-dirty", value: dirty() });
  }
  function id() { return "user-" + crypto.randomUUID(); }
  function selected(doc = current) { return doc.groups.find((g) => g.id === groupId); }
  function ensureGroup(doc) { if (!selected(doc)) groupId = doc.groups[0]?.id || ""; }
  function options(select, groups) {
    select.replaceChildren();
    for (const group of groups) {
      const option = document.createElement("option");
      option.value = group.id; option.textContent = group.label + "（" + group.items.length + "）";
      select.append(option);
    }
    select.value = groupId;
  }
  function button(label, action, disabled = false) {
    const result = document.createElement("button");
    result.type = "button"; result.textContent = label; result.disabled = disabled;
    result.addEventListener("click", action);
    return result;
  }
  function renderBrowse() {
    ensureGroup(current);
    const domains = byId("example-domains"); domains.replaceChildren();
    // Two quick tabs plus the full selector stay usable even with long domain names.
    const first = current.groups.slice(0, 2);
    const group = selected();
    if (group && !first.includes(group)) first[1] = group;
    for (const entry of first) {
      const tab = button(entry.label, () => { groupId = entry.id; page = 0; renderBrowse(); });
      tab.setAttribute("role", "tab"); tab.setAttribute("aria-selected", String(entry.id === groupId));
      tab.title = entry.label; tab.tabIndex = entry.id === groupId ? 0 : -1;
      tab.addEventListener("keydown", (event) => {
        let index = current.groups.findIndex((g) => g.id === groupId);
        if (event.key === "ArrowRight") index = (index + 1) % current.groups.length;
        else if (event.key === "ArrowLeft") index = (index - 1 + current.groups.length) % current.groups.length;
        else if (event.key === "Home") index = 0;
        else if (event.key === "End") index = current.groups.length - 1;
        else return;
        event.preventDefault(); groupId = current.groups[index].id; page = 0; renderBrowse();
        domains.querySelector('[aria-selected="true"]')?.focus();
      });
      domains.append(tab);
    }
    options(byId("library-domain"), current.groups);
    const query = byId("library-search").value.trim().toLocaleLowerCase();
    const groups = byId("library-search-all").checked && query ? current.groups : group ? [group] : [];
    const items = groups.flatMap((g) => g.items.map((item) => ({ item, group: g }))
      .filter(({item}) => !query || (item.title + " " + item.note).toLocaleLowerCase().includes(query)));
    const pages = Math.max(1, Math.ceil(items.length / 6)); page = Math.min(page, pages - 1);
    const list = byId("example-list"); list.replaceChildren();
    for (const {item, group: domain} of items.slice(page * 6, page * 6 + 6)) {
      const entry = button(item.title, () => load(item));
      entry.title = domain.label + "：" + item.note;
      list.append(entry);
    }
    if (!items.length) { const text = document.createElement("p"); text.className = "library-hint"; text.textContent = query ? "没有找到公式。试试其他名称或搜索全部领域。" : "这里还没有公式。打开“管理”添加领域或公式。"; list.append(text); }
    byId("example-page").textContent = (page + 1) + " / " + pages + " 页 · " + items.length + " 条";
    byId("example-prev").disabled = !page; byId("example-next").disabled = page >= pages - 1;
  }
  function clearForm() { form = null; formChanged.clear(); byId("library-form").hidden = true; }
  function discardForm() {
    if (formChanged.size && !confirm("条目还有未应用的修改。放弃这些修改？")) return false;
    clearForm(); return true;
  }
  function remember() { undo = { document: model.clone(draft), recoveryChosen }; }
  function updateManager() {
    ensureGroup(draft);
    byId("library-domains-mode").setAttribute("aria-pressed", String(mode === "domains"));
    byId("library-formulas-mode").setAttribute("aria-pressed", String(mode === "formulas"));
    byId("library-edit-domain-label").hidden = mode === "domains";
    byId("library-add-current").hidden = mode === "domains";
    byId("library-add").textContent = mode === "domains" ? "新增领域" : "新增公式";
    byId("library-add").disabled = mode === "formulas" && !selected(draft);
    byId("library-add-current").disabled = !selected(draft);
    options(byId("library-edit-domain"), draft.groups);
    const items = mode === "domains" ? draft.groups : selected(draft)?.items || [];
    const pages = Math.max(1, Math.ceil(items.length / 6)); managePage = Math.min(managePage, pages - 1);
    const rows = byId("library-rows"); rows.replaceChildren();
    items.slice(managePage * 6, managePage * 6 + 6).forEach((item, localIndex) => {
      const index = managePage * 6 + localIndex;
      const row = document.createElement("div"); row.className = "library-row";
      const title = document.createElement("span"); title.className = "library-row-title";
      title.textContent = mode === "domains" ? item.label + "（" + item.items.length + "）" : item.title;
      const actions = document.createElement("div"); actions.className = "library-row-actions";
      for (const [symbol, delta] of [["↑", -1], ["↓", 1]]) {
        const move = button(symbol, () => {
          if (!discardForm()) return;
          remember(); model.move(items, index, delta); managePage = Math.floor((index + delta) / 6); updateManager();
        }, index + delta < 0 || index + delta >= items.length);
        move.setAttribute("aria-label", (delta < 0 ? "上移“" : "下移“") + (item.label || item.title) + "”");
        actions.append(move);
      }
      actions.append(button("编辑", () => { if (discardForm()) openForm(item); }), button("删除", () => {
        if (!discardForm()) return;
        const label = item.label || item.title;
        if (!confirm("删除“" + label + "”" + (mode === "domains" ? "及其中 " + item.items.length + " 条公式" : "") + "？保存前可撤销本轮操作。")) return;
        remember(); items.splice(index, 1); updateManager();
      }));
      row.append(title, actions); rows.append(row);
    });
    if (!items.length) rows.textContent = mode === "domains" ? "尚无领域，请先新增领域。" : "尚无公式，可新增或从当前公式添加。";
    byId("library-page").textContent = (managePage + 1) + " / " + pages + " 页 · " + items.length + " 条";
    byId("library-prev").disabled = !managePage; byId("library-next").disabled = managePage >= pages - 1;
    byId("library-undo").disabled = !undo;
    notifyDirty();
  }
  function preview() {
    const out = byId("library-preview"), text = byId("library-latex").value;
    out.replaceChildren();
    const analysis = window.FormulaDeskCore.analyzeSource(text);
    let result = analysis.message || "预览只检查排版，不证明数学含义正确。";
    if (analysis.preview && window.MathLive) {
      try {
        if (window.MathLive.validateLatex(text).length) result = "源码未完整识别；仍可按原文保存，载入时继续编辑。";
        else {
          const math = document.createElement("math-span");
          math.textContent = text;
          out.append(math);
        }
      } catch (error) { result = "排版失败（" + error.name + "）；原文可继续编辑和保存。"; }
    }
    byId("library-preview-status").textContent = result;
  }
  function openForm(item, fromCurrent = false) {
    const initial = fromCurrent ? snapshot() : { latex: "", note: "" };
    form = item ? model.clone(item) : mode === "domains" ? { id: id(), label: "", items: [] } : { id: id(), title: "", ...initial };
    formChanged.clear();
    if (!item) formChanged.add("new");
    byId("library-form").hidden = false;
    byId("library-form-heading").textContent = (item ? "编辑" : "新增") + (mode === "domains" ? "领域" : "公式");
    byId("library-form-content").hidden = mode === "domains";
    byId("library-title").value = form.label ?? form.title;
    byId("library-latex").value = form.latex || ""; byId("library-note").value = form.note || "";
    preview(); byId("library-title").focus(); notifyDirty();
  }
  function applyForm() {
    if (!form) return true;
    const entry = model.clone(form), titleKey = mode === "domains" ? "label" : "title";
    if (formChanged.has("title") || formChanged.has("new")) entry[titleKey] = byId("library-title").value;
    for (const field of ["latex", "note"]) if (formChanged.has(field)) entry[field] = byId("library-" + field).value;
    const next = model.clone(draft), items = mode === "domains" ? next.groups : selected(next).items;
    const index = items.findIndex((item) => item.id === entry.id);
    if (index < 0) items.push(entry); else items[index] = entry;
    try { model.serialize(next); }
    catch (error) { status(error.message, true); return false; }
    remember(); draft = next;
    if (index < 0) managePage = Math.floor((items.length - 1) / 6);
    clearForm(); updateManager(); status("条目已应用到编辑清单；点“保存修改”后才会写入公式库。");
    return true;
  }
  function startManage() {
    if (!draft) draft = model.clone(current);
    byId("library-browse").hidden = true; byId("library-manager").hidden = false;
    updateManager();
  }
  function exitManage() {
    if (dirty() && !confirm("放弃本轮尚未保存的公式库修改？当前工作区不受影响。")) return;
    draft = null; undo = null; recoveryChosen = false; clearForm();
    byId("library-browse").hidden = false; byId("library-manager").hidden = true;
    notifyDirty(); renderBrowse();
  }
  async function run(action) {
    if (busy) return;
    busy = true;
    const states = Array.from(root.querySelectorAll("button,input,select,textarea")).map((el) => [el, el.disabled]);
    states.forEach(([el]) => { el.disabled = true; });
    try { await action(); }
    catch (error) { status(error.message || "公式库操作未完成。", true); }
    finally {
      busy = false; states.forEach(([el, disabled]) => { if (el.isConnected) el.disabled = disabled; });
      renderBrowse(); if (draft) updateManager(); notifyDirty();
    }
  }
  function host(action, text, replaceDamaged = false) {
    return new Promise((resolve, reject) => {
      const requestId = ++sequence;
      pending.set(requestId, { resolve, reject });
      window.chrome.webview.postMessage({ type: "library-request", id: requestId, action, text, replaceDamaged });
    });
  }
  if (desktop) window.chrome.webview.addEventListener("message", ({data}) => {
    if (data?.type !== "library-result" || !pending.has(data.id)) return;
    const {resolve, reject} = pending.get(data.id); pending.delete(data.id);
    if (data.ok) resolve(data); else reject(new Error(data.error || "公式库文件操作失败。"));
  });
  async function save() {
    if (!applyForm()) return;
    if (damaged && !recoveryChosen) { status("原公式库未能读取。请先选择导入、恢复备份或恢复内置库，再保存。原文件保持不变。", true); return; }
    const text = model.serialize(draft);
    await run(async () => {
      if (desktop) await host("save", text, damaged);
      else {
        const old = localStorage.getItem(key);
        if (old !== null) {
          if (damaged) localStorage.setItem(key + ".damaged", old);
          else { model.parse(old); localStorage.setItem(key + ".backup", old); }
        }
        localStorage.setItem(key, text);
      }
      current = model.parse(text); draft = model.clone(current); undo = null; damaged = false; recoveryChosen = false;
      status("公式库已保存。关闭后重新打开仍会保留。");
    });
  }
  function offerImport(text, description) {
    const imported = model.parse(text), count = imported.groups.reduce((n, g) => n + g.items.length, 0);
    if (!confirm(description + "包含 " + imported.groups.length + " 个领域、" + count + " 条公式。替换当前编辑清单？点击“保存修改”后才写入；当前工作区不变。")) return;
    startManage(); remember(); draft = imported; clearForm(); recoveryChosen = true; managePage = 0; updateManager();
    status("已载入待保存清单。检查后点击“保存修改”，也可取消修改。");
  }
  byId("library-manage").onclick = () => { if (loaded) startManage(); };
  byId("library-back").onclick = exitManage;
  byId("library-cancel").onclick = exitManage;
  byId("library-save").onclick = () => { void save(); };
  byId("library-search").oninput = () => { page = 0; renderBrowse(); };
  byId("library-search-all").onchange = () => { page = 0; renderBrowse(); };
  byId("library-domain").onchange = (event) => { groupId = event.target.value; page = 0; renderBrowse(); };
  byId("example-prev").onclick = () => { page--; renderBrowse(); };
  byId("example-next").onclick = () => { page++; renderBrowse(); };
  for (const [name, value] of [["domains", "domains"], ["formulas", "formulas"]]) byId("library-" + name + "-mode").onclick = () => { if (discardForm()) { mode = value; managePage = 0; updateManager(); } };
  byId("library-edit-domain").onchange = (event) => {
    if (!discardForm()) { event.target.value = groupId; return; }
    groupId = event.target.value; managePage = 0; updateManager();
  };
  byId("library-add").onclick = () => { if (discardForm()) openForm(null); };
  byId("library-add-current").onclick = () => { if (discardForm()) openForm(null, true); };
  byId("library-prev").onclick = () => { if (discardForm()) { managePage--; updateManager(); } };
  byId("library-next").onclick = () => { if (discardForm()) { managePage++; updateManager(); } };
  byId("library-undo").onclick = () => {
    if (!undo || !discardForm()) return;
    draft = undo.document; recoveryChosen = undo.recoveryChosen; undo = null; updateManager(); status("已撤销最近一次清单操作。");
  };
  byId("library-form").onsubmit = (event) => { event.preventDefault(); applyForm(); };
  byId("library-form-cancel").onclick = () => { if (discardForm()) notifyDirty(); };
  for (const field of ["title", "latex", "note"]) byId("library-" + field).oninput = () => { formChanged.add(field); if (field === "latex") preview(); notifyDirty(); };
  byId("library-reset").onclick = () => { if (!discardForm()) return; offerImport(model.serialize(defaults), "内置库"); };
  byId("library-recover").onclick = () => { if (!discardForm()) return; void run(async () => {
    const result = desktop ? await host("recover") : { text: localStorage.getItem(key + ".backup") };
    if (!result.text) { status("没有可恢复的上次保存备份。"); return; }
    offerImport(result.text, "上次保存备份");
  }); };
  byId("library-import").onclick = () => {
    if (!discardForm()) return;
    if (desktop) void run(async () => { const result = await host("import"); if (!result.cancelled) offerImport(result.text, "所选文件"); });
    else { byId("library-file").value = ""; byId("library-file").click(); }
  };
  byId("library-file").onchange = () => { const file = byId("library-file").files[0]; if (!file) return; void run(async () => {
    if (file.size > model.MAX_BYTES) throw new Error("公式库超过 4 MiB，未载入。");
    offerImport(await file.text(), "所选文件");
  }); };
  byId("library-export").onclick = () => {
    if (formChanged.size && !applyForm()) return;
    void run(async () => {
      const text = model.serialize(draft || current);
      if (desktop) { const result = await host("export", text); if (result.cancelled) return; }
      else {
        const url = URL.createObjectURL(new Blob([text], {type: "application/json;charset=utf-8"}));
        const link = document.createElement("a"); link.href = url; link.download = "FormulaDesk.library.json";
        link.click(); setTimeout(() => URL.revokeObjectURL(url), 60000);
      }
      status("已导出当前清单。导出备份不等于保存本机库修改。");
    });
  };
  window.addEventListener("beforeunload", (event) => { if (dirty()) { event.preventDefault(); event.returnValue = ""; } });
  renderBrowse();
  void run(async () => {
    try {
      const result = desktop ? await host("load") : { text: localStorage.getItem(key) };
      if (result.text !== null && result.text !== undefined) current = model.parse(result.text);
      status(result.text ? "已载入保存的公式库。" : "正在使用内置公式库。可在“管理”中编辑并保存。");
    } catch (error) { damaged = true; status("自定义库未能载入：" + error.message + " 原数据未改动，当前显示内置库；可导入或恢复备份。", true); }
    loaded = true;
  });
} });
