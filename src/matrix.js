"use strict";
((root, factory) => {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.FormulaDeskMatrix = api;
})(typeof window === "object" ? window : this, () => {
  const environments = ["matrix", "bmatrix", "pmatrix", "vmatrix", "Vmatrix", "Bmatrix"];
  function template(rows, cols, environment) {
    if (!Number.isInteger(rows) || !Number.isInteger(cols) || rows < 1 || rows > 10 || cols < 1 || cols > 10 || !environments.includes(environment))
      throw new Error("行数和列数必须是 1–10 的整数，并选择支持的矩阵括号。");
    return "\\begin{" + environment + "}" + Array.from({length: rows}, () => Array(cols).fill("#0").join(" & ")).join(" \\\\ ") + "\\end{" + environment + "}";
  }
  // These model getters and commands were checked against the pinned 0.111.1 asset.
  function context(mf) {
    const model = mf?._mathfield?.model;
    if (!model || (!model.selectionIsCollapsed && !model.selectionIsPlaceholder)) return null;
    const array = model.parentEnvironment, cell = model.parentCell;
    if (!array || !environments.includes(array.environmentName.replace(/\*$/, "")) || !Array.isArray(cell)) return null;
    return { mf, model, array, row: cell[0], col: cell[1], rows: array.rowCount, cols: array.colCount };
  }
  function describeRemoval(ctx, axis) {
    if (!ctx || !["row", "column"].includes(axis)) throw new Error("请先定位矩阵单元格。");
    const nonempty = [];
    const count = axis === "row" ? ctx.cols : ctx.rows;
    for (let i = 0; i < count; i++) {
      const atoms = ctx.array.getCell(axis === "row" ? ctx.row : i, axis === "row" ? i : ctx.col) || [];
      if (!atoms.some((atom) => !["first", "placeholder"].includes(atom.type))) continue;
      const text = ctx.mf.getValue([ctx.model.offsetOf(atoms[0]), ctx.model.offsetOf(atoms[atoms.length - 1])], "latex-expanded");
      nonempty.push(text);
    }
    return nonempty;
  }
  function init({ mf, canEdit, snapshot, remember, sync }) {
    const byId = (id) => document.getElementById(id), desktop = window.FormulaDeskDesktop;
    const panel = byId("matrix-panel"), toggle = byId("matrix-toggle");
    const sizePreview = document.createElement("div");
    sizePreview.className = "matrix-size-preview";
    sizePreview.setAttribute("aria-live", "polite");
    panel.querySelector(".matrix-new").after(sizePreview);
    function renderSize() {
      sizePreview.replaceChildren();
      try {
        const rows = Number(byId("matrix-rows").value), cols = Number(byId("matrix-cols").value);
        const latex = template(rows, cols, byId("matrix-brackets").value).replaceAll("#0", "\\square");
        sizePreview.setAttribute("aria-label", "新矩阵预览：" + rows + " 行、" + cols + " 列");
        if (window.MathLive) {
          const math = document.createElement("math-span");
          math.textContent = latex;
          sizePreview.append(math);
        }
        else sizePreview.textContent = rows + " 行 × " + cols + " 列";
      } catch (error) { sizePreview.textContent = error.message; }
    }
    for (const name of ["matrix-rows", "matrix-cols", "matrix-brackets"]) byId(name).addEventListener("input", renderSize);
    renderSize();
    let anchor = null, pending = null;
    const commandButtons = Array.from(panel.querySelectorAll("[data-matrix-command]"));
    function stateKey() { return JSON.stringify(snapshot()); }
    function selectionKey() { return JSON.stringify(mf?.selection); }
    function cancelDeletion(text = "") {
      pending = null; byId("matrix-confirm").hidden = true;
      if (text) byId("matrix-status").textContent = text;
    }
    function refresh() {
      toggle.disabled = !canEdit();
      if (pending && (pending.state !== stateKey() || pending.selection !== selectionKey()))
        cancelDeletion("公式或光标位置已改变，已取消删除请求。请重新选择要删除的行列。");
      const ctx = canEdit() ? context(mf) : null;
      byId("matrix-context").textContent = ctx ? "当前 " + ctx.rows + " 行 × " + ctx.cols + " 列 · 光标在第 " + (ctx.row + 1) + " 行、第 " + (ctx.col + 1) + " 列"
        : "先在公式中的矩阵单元格内点一下，再使用下方增删按钮。";
      for (const button of commandButtons) {
        const command = button.dataset.matrixCommand;
        button.disabled = !ctx || (command.startsWith("addRow") && ctx.rows >= 10) ||
          (command.startsWith("addColumn") && ctx.cols >= Math.min(10, ctx.array.maxColumns)) ||
          (command === "removeRow" && ctx.rows <= 1) || (command === "removeColumn" && ctx.cols <= Math.max(1, ctx.array.minColumns));
      }
      byId("matrix-insert").disabled = !canEdit();
    }
    function open() {
      if (!canEdit()) return;
      anchor = JSON.parse(JSON.stringify(mf.selection));
      cancelDeletion(); byId("matrix-status").textContent = "";
      if (desktop) desktop.select("matrix"); else panel.hidden = false;
      toggle.setAttribute("aria-expanded", "true"); refresh();
    }
    toggle.addEventListener("pointerdown", (event) => { if (event.button === 0) event.preventDefault(); });
    toggle.addEventListener("click", () => { if (panel.hidden) open(); else close(); });
    function close() {
      cancelDeletion();
      if (desktop) desktop.select(null); else panel.hidden = true;
      toggle.setAttribute("aria-expanded", "false");
      if (canEdit()) mf.focus();
    }
    byId("matrix-close").onclick = close;
    byId("matrix-insert").onclick = () => {
      if (!canEdit()) return;
      let latex;
      try { latex = template(Number(byId("matrix-rows").value), Number(byId("matrix-cols").value), byId("matrix-brackets").value); }
      catch (error) { byId("matrix-status").textContent = error.message; return; }
      const before = snapshot();
      mf.focus(); if (anchor) mf.selection = anchor;
      mf.insert(latex, { insertionMode: "replaceSelection", selectionMode: "placeholder" });
      remember(before); sync(); anchor = JSON.parse(JSON.stringify(mf.selection)); refresh();
      byId("matrix-status").textContent = "已插入矩阵。填写空位，按 Tab 前往下一个空位。";
    };
    function execute(command) {
      const ctx = context(mf); if (!canEdit() || !ctx) return;
      const before = snapshot(), latex = mf.getValue("latex-expanded");
      mf.focus();
      // 0.111.1 records some structural commands before the edit, but none
      // afterwards. Record the completed change as one undo step ourselves.
      const engine = mf._mathfield;
      engine.stopCoalescingUndo();
      engine.stopRecording();
      let success;
      try {
        success = mf.executeCommand(command);
        // 0.111.1 creates placeholders for new rows, but only empty cells
        // for new columns. Fill just those new cells using the normal editor.
        if (success !== false && command.startsWith("addColumn") && ctx.array.colCount === ctx.cols + 1) {
          const col = ctx.col + (command === "addColumnAfter" ? 1 : 0);
          for (let row = ctx.rows - 1; row >= 0; row--) {
            const cell = ctx.array.getCell(row, col);
            mf.position = ctx.model.offsetOf(cell[0]);
            mf.insert("\\placeholder{}", { selectionMode: "item", silenceNotifications: true });
          }
          const cell = ctx.array.getCell(ctx.row, col);
          mf.selection = { ranges: [[ctx.model.offsetOf(cell[0]), ctx.model.offsetOf(cell[cell.length - 1])]], direction: "forward" };
        }
      }
      finally { engine.startRecording(); }
      if (success === false || latex === mf.getValue("latex-expanded")) {
        byId("matrix-status").textContent = "未改变矩阵。请检查光标位置及行列上限。"; refresh(); return;
      }
      engine.snapshot();
      remember(before); sync(); anchor = JSON.parse(JSON.stringify(mf.selection));
      byId("matrix-status").textContent = "已更新矩阵。可撤销或恢复上次完整内容。"; refresh();
    }
    for (const button of commandButtons) {
      button.addEventListener("pointerdown", (event) => { if (event.button === 0) event.preventDefault(); });
      button.onclick = () => {
        const command = button.dataset.matrixCommand;
        if (!command.startsWith("remove")) { cancelDeletion(); execute(command); return; }
        const ctx = context(mf); if (!ctx || !canEdit()) return;
        const axis = command === "removeRow" ? "row" : "column";
        const values = describeRemoval(ctx, axis);
        pending = { command, state: stateKey(), selection: selectionKey() };
        byId("matrix-removal-summary").textContent = "删除第 " + ((axis === "row" ? ctx.row : ctx.col) + 1) + (axis === "row" ? " 行" : " 列") + "？将移除 " + values.length + " 个有内容的单元格。";
        byId("matrix-removal-content").textContent = values.map((value) => value.length > 100 ? value.slice(0, 100) + "…" : value).join("；");
        byId("matrix-confirm").hidden = false;
      };
    }
    byId("matrix-cancel-delete").onclick = () => cancelDeletion("已取消删除，矩阵内容未改变。");
    byId("matrix-confirm-delete").onclick = () => {
      if (!pending) return;
      if (pending.state !== stateKey() || pending.selection !== selectionKey()) { cancelDeletion("位置已改变，请重新选择要删除的行列。"); return; }
      const command = pending.command; cancelDeletion(); execute(command);
    };
    mf?.addEventListener("selection-change", () => {
      anchor = JSON.parse(JSON.stringify(mf.selection)); refresh();
    });
    refresh();
    return { refresh };
  }
  return Object.freeze({ template, context, describeRemoval, init });
});
