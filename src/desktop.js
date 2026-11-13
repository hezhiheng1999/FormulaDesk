"use strict";

(() => {
  if (location.href !== "https://formuladesk.example/index.html" || !window.chrome?.webview) return;
  document.documentElement.classList.add("desktop");
  const root = document.querySelector(".workspace");
  const editor = document.querySelector(".editor-card");
  editor.removeAttribute("aria-labelledby");
  editor.setAttribute("aria-label", "公式输入");
  const examples = document.querySelector(".examples-card");
  const source = document.getElementById("output-panel");
  const help = document.getElementById("how-to");
  const leaveTip = help.querySelector(".help-tip p:last-child");
  leaveTip.replaceChildren();
  const leaveHeading = document.createElement("strong");
  leaveHeading.textContent = "保留输入";
  leaveTip.append(leaveHeading, "　Ctrl+S 保存工作单，Ctrl+O 打开。Ctrl+Alt+F 唤出或隐藏窗口。关闭前请复制或保存需要保留的内容。");
  const foot = editor.querySelector(".editor-foot");
  foot.prepend(editor.querySelector(".editor-actions"));
  for (const button of editor.querySelectorAll(".formula-tools button")) {
    button.title = button.getAttribute("aria-label");
  }
  const restore = document.getElementById("restore");
  restore.title = "恢复上次内容";
  restore.setAttribute("aria-label", "恢复上次内容");
  const feedback = editor.querySelector(".copy-feedback");
  feedback.classList.add("sr-only");
  source.append(document.getElementById("manual-copy"));
  const noteHeading = source.querySelector(".note-heading");
  noteHeading.querySelector("label span").remove();
  noteHeading.append(document.getElementById("manual-copy-button"));
  source.prepend(document.getElementById("syntax-status"));
  const worksheetActions = document.createElement("div");
  worksheetActions.className = "worksheet-actions";
  function requestWorksheet(action) { window.chrome.webview.postMessage({ type: "worksheet-" + action }); }
  for (const [action, label, shortcut] of [["open", "打开工作单…", "Ctrl+O"], ["save", "保存工作单…", "Ctrl+S"]]) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = label;
    button.title = label + " (" + shortcut + ")";
    button.addEventListener("click", () => requestWorksheet(action));
    worksheetActions.append(button);
  }
  const worksheetResult = document.createElement("p");
  worksheetResult.className = "worksheet-result";
  source.append(worksheetActions, worksheetResult);
  document.addEventListener("keydown", (event) => {
    if (!event.ctrlKey || event.altKey || event.metaKey || event.shiftKey ||
        event.isComposing || event.keyCode === 229) return;
    const key = event.key.toLowerCase();
    if (key !== "o" && key !== "s") return;
    event.preventDefault();
    event.stopPropagation();
    if (!event.repeat) requestWorksheet(key === "o" ? "open" : "save");
  }, true);
  const panels = { examples, source, help };
  const bar = document.createElement("nav");
  bar.id = "desktop-tabs";
  bar.className = "example-domains";
  bar.setAttribute("aria-label", "附加编辑面板");
  const content = document.createElement("div");
  content.id = "desktop-panels";
  content.hidden = true;
  let active = null;
  let pending = false;
  let previous = "";
  const buttons = {};
  const labels = { examples: "常用公式", source: "LaTeX源码和补充说明", help: "使用方法" };

  function select(name) {
    active = name;
    content.hidden = name === null;
    for (const [key, panel] of Object.entries(panels)) {
      panel.hidden = key !== name;
      if (panel instanceof HTMLDetailsElement) panel.open = key === name;
      buttons[key].setAttribute("aria-expanded", String(key === name));
      buttons[key].classList.toggle("selected", key === name);
    }
    report();
  }

  function report() {
    if (pending) return;
    pending = true;
    requestAnimationFrame(() => {
      pending = false;
      const base = bar.getBoundingClientRect().bottom + window.scrollY +
        parseFloat(getComputedStyle(root).paddingBottom);
      const layout = { type: "layout", panel: active, base,
        total: root.getBoundingClientRect().height, scale: window.devicePixelRatio };
      const serialized = JSON.stringify(layout);
      if (serialized !== previous) {
        previous = serialized;
        window.chrome.webview.postMessage(layout);
      }
    });
  }

  for (const [name, panel] of Object.entries(panels)) {
    if (!panel.id) panel.id = "desktop-" + name;
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = labels[name];
    button.setAttribute("aria-controls", panel.id);
    button.setAttribute("aria-expanded", "false");
    button.addEventListener("click", () => select(active === name ? null : name));
    buttons[name] = button;
    bar.appendChild(button);
    content.appendChild(panel);
  }
  editor.after(bar, content);
  select(null);
  new ResizeObserver(report).observe(root);
  document.fonts.ready.then(report);
  window.addEventListener("resize", report);
  window.chrome.webview.addEventListener("message", (event) => {
    if (event.data?.type === "measure") { previous = ""; report(); }
  });
  window.FormulaDeskDesktop = Object.freeze({
    select,
    worksheetStatus(text) {
      worksheetResult.textContent = text;
      if (text) select("source");
    },
    dirty(value) { window.chrome.webview.postMessage({ type: "dirty", value }); },
  });
})();
