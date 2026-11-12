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
  window.FormulaDeskDesktop = Object.freeze({
    select,
    dirty(value) { window.chrome.webview.postMessage({ type: "dirty", value }); },
  });
})();
