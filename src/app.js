"use strict";

(() => {
  const core = window.FormulaDeskCore;
  const byId = (id) => document.getElementById(id);
  const source = byId("latex-source");
  const note = byId("formula-note");
  const host = byId("mathfield-host");
  const previewState = byId("preview-state");
  const syntaxStatus = byId("syntax-status");
  const status = byId("copy-status");
  const keyboardContainer = byId("keyboard-container");
  const keyboardToggle = byId("keyboard-toggle");
  const promptButton = byId("copy-prompt");
  const latexButton = byId("copy-latex");
  const manualButton = byId("manual-copy-button");
  const clearButton = byId("clear");
  const restoreButton = byId("restore");
  const undoButton = byId("undo");
  const redoButton = byId("redo");
  const manualCopy = byId("manual-copy");
  const manualText = byId("manual-copy-text");
  const insertButtons = Array.from(document.querySelectorAll("[data-insert]"));
  let mf = null;
  let keyboard = null;
  let previewEditable = false;
  let copyPending = false;
  let revision = 0;
  let previous = null;
  let safeToLeave = true;
  let manualRevision = -1;
  let manualIncludesNote = false;
  let sourceWarning = "";

  function message(text, type = "") {
    status.textContent = text;
    status.className = "copy-status" + (type ? " " + type : "");
  }

  if (!core) {
    previewState.textContent = "页面文件不完整，无法启动。请重新获取完整的 HTML 文件。";
    message("核心脚本未加载。", "error");
    return;
  }

  const examples = {
    fraction: { latex: "x=\\frac{-b\\pm\\sqrt{b^2-4ac}}{2a}", note: "a、b、c 为实数，且 a ≠ 0。请解释这个公式。" },
    mean: { latex: "D=\\frac{1}{N}\\sum_{i=1}^{N}(y_i-r_i)^2", note: "y_i 和 r_i 是实数，N 是样本数。请解释各部分的含义。" },
    complex: { latex: "\\lvert z\\rvert^2=I^2+Q^2", note: "z = I + jQ，I、Q 为实数，j² = -1。请解释复数模的平方。" },
    integral: { latex: "E=\\int_{-\\infty}^{+\\infty}\\lvert x(t)\\rvert^2\\,\\mathrm{d}t", note: "这里 E 表示信号能量的数学定义。物理能量还需要说明 x(t) 的单位和标定。" },
    matrix: { latex: "\\begin{bmatrix}y_1\\\\y_2\\end{bmatrix}=\\begin{bmatrix}a&b\\\\c&d\\end{bmatrix}\\begin{bmatrix}x_1\\\\x_2\\end{bmatrix}", note: "这里使用矩阵乘法。请展开两个输出分量。" },
  };

  function snapshot() { return { latex: source.value, note: note.value }; }

  function refreshControls() {
    const allowed = core.canCopy(source.value, note.value) && !copyPending;
    promptButton.disabled = !allowed;
    latexButton.disabled = !allowed;
    manualButton.disabled = !core.canCopy(source.value, note.value);
    clearButton.disabled = source.value === "" && note.value === "";
    restoreButton.disabled = previous === null;
    undoButton.disabled = !previewEditable || !mf || !mf.canUndo();
    redoButton.disabled = !previewEditable || !mf || !mf.canRedo();
    insertButtons.forEach((button) => { button.disabled = !previewEditable; });
    keyboardToggle.disabled = !previewEditable || !keyboard;
    byId("source-count").textContent = source.value.length + " / " + core.MAX_SOURCE_LENGTH;
    byId("source-count").classList.toggle("over-limit", source.value.length > core.MAX_SOURCE_LENGTH);
  }

  function changed() {
    revision += 1;
    safeToLeave = source.value === "" && note.value === "";
    manualCopy.hidden = true;
    refreshControls();
  }

  function hidePreview(reason) {
    previewEditable = false;
    if (mf) { mf.hidden = true; mf.readOnly = true; }
    if (keyboard && keyboard.visible) keyboard.hide();
    keyboardContainer.hidden = true;
    keyboardToggle.setAttribute("aria-expanded", "false");
    keyboardToggle.textContent = "展开数学键盘";
    previewState.hidden = false;
    previewState.textContent = reason;
  }

  function renderSource() {
    const analysis = core.analyzeSource(source.value);
    let warning = analysis.message;
    if (note.value.length > core.MAX_NOTE_LENGTH) {
      warning += (warning ? " " : "") + "说明超过 10000 字符，请缩短后再复制。";
    }
    if (!analysis.preview) {
      hidePreview("预览已暂停。原文保留在 LaTeX 源码区。");
    } else if (!mf) {
      hidePreview("排版组件未加载。仍可在右侧源码区编辑并复制 LaTeX。");
      warning = "排版组件不可用。请重新打开完整 HTML；当前输入会保留。";
    } else {
      try {
        const errors = window.MathLive.validateLatex(source.value);
        if (errors.length) {
          hidePreview("源码待补全或包含未识别指令，请在源码区继续编辑。");
          warning = "原始 LaTeX 尚未被完整识别，已保留原文。复制前请检查。";
        } else {
          mf.setValue(source.value, { silenceNotifications: true });
          mf.hidden = false;
          mf.readOnly = false;
          previewState.hidden = true;
          previewEditable = true;
          if (source.value.includes("\\placeholder")) warning = "公式还有空位，可继续填写。";
        }
      } catch (error) {
        hidePreview("无法排版这段源码，原文仍然保留。");
        warning = "排版失败（" + error.name + "）。请修改源码；也可以复制原文。";
        console.error("FormulaDesk renderer failed:", error.name, error.message);
      }
    }
    sourceWarning = warning;
    syntaxStatus.textContent = warning;
    refreshControls();
  }

  function editedSource() {
    const normalized = core.normalizeSource(source.value);
    if (normalized !== source.value) source.value = normalized;
    changed();
    renderSource();
    message("源码已保留。请检查预览和提示后再复制。");
  }

  function replaceContents(value, reason) {
    if (source.value !== "" || note.value !== "") previous = snapshot();
    source.value = value.latex;
    note.value = value.note;
    changed();
    renderSource();
    message(reason + (previous ? " 可点“恢复上次内容”撤销这次替换。" : ""));
  }

  function fromVisual() {
    source.value = mf.getValue("latex-expanded");
    changed();
    const analysis = core.analyzeSource(source.value);
    if (!analysis.preview) hidePreview("公式超出预览范围，原文保留在源码区。");
    sourceWarning = analysis.message || (source.value.includes("\\placeholder") ? "公式还有空位，可继续填写。" : "");
    syntaxStatus.textContent = sourceWarning;
    refreshControls();
    message("已同步。检查公式后即可复制。");
  }

  function selectManual(text, capturedRevision, includeNote) {
    manualText.value = text;
    manualRevision = capturedRevision;
    manualIncludesNote = includeNote;
    manualCopy.hidden = false;
    manualText.focus();
    manualText.select();
  }

  function payload(includeNote) {
    return core.buildPayload(source.value, note.value, includeNote);
  }

  function manual() {
    if (!core.canCopy(source.value, note.value)) return;
    selectManual(payload(true), revision, true);
    message("内容已选中，请按 Ctrl+C，随后在目标输入框粘贴检查。");
  }

  async function copy(includeNote) {
    if (copyPending || !core.canCopy(source.value, note.value)) return;
    const text = payload(includeNote);
    const capturedRevision = revision;
    const coversCurrentWork = includeNote || note.value.trim() === "";
    copyPending = true;
    refreshControls();
    message("正在请求浏览器复制；也可以使用“手动复制”。");
    try {
      if (!navigator.clipboard || !navigator.clipboard.writeText) {
        throw new DOMException("Clipboard API unavailable", "NotSupportedError");
      }
      await navigator.clipboard.writeText(text);
      if (capturedRevision === revision) {
        safeToLeave = coversCurrentWork;
        message("已完成复制请求，请粘贴检查。若未粘贴出内容，请使用“手动复制”。", "success");
      } else {
        message("已复制点击时的内容；当前输入已更改，请按需要重新复制。");
      }
    } catch (error) {
      selectManual(text, capturedRevision, coversCurrentWork);
      message("自动复制失败（" + error.name + "）。已选中点击时的内容，请按 Ctrl+C。", "error");
      if (!(error instanceof DOMException)) console.error("FormulaDesk clipboard failed:", error);
    } finally {
      copyPending = false;
      refreshControls();
    }
  }

  try {
    if (typeof MathfieldElement !== "undefined") {
      MathfieldElement.fontsDirectory = null;
      MathfieldElement.soundsDirectory = null;
      MathfieldElement.computeEngine = null;
      MathfieldElement.openUrl = () => {};
      MathfieldElement.speakHook = () => {};
      MathfieldElement.readAloudHook = () => {};
      MathfieldElement.locale = "zh-cn";
      mf = new MathfieldElement();
      mf.id = "formula";
      mf.setAttribute("aria-label", "公式编辑区");
      mf.setAttribute("placeholder", "在这里写公式");
      mf.mathVirtualKeyboardPolicy = "manual";
      mf.smartFence = true;
      mf.smartMode = false;
      host.insertBefore(mf, previewState);
      mf.inlineShortcuts = { ...mf.inlineShortcuts, sqrt: "\\sqrt{#0}" };
      mf.onExport = (_field, latex) => latex;
      // Use a local keyboard even when this page is opened in a same-origin
      // preview frame; the default iframe proxy cannot accept a container.
      keyboard = window.MathLive.initVirtualKeyboardInCurrentBrowsingContext();
      keyboard.container = keyboardContainer;
      keyboard.layouts = ["numeric", "symbols", "alphabetic", "greek"];
      keyboard.addEventListener("virtual-keyboard-toggle", () => {
        keyboardContainer.hidden = !keyboard.visible;
        keyboardToggle.setAttribute("aria-expanded", String(keyboard.visible));
        keyboardToggle.textContent = keyboard.visible ? "收起数学键盘" : "展开数学键盘";
      });
      mf.addEventListener("input", fromVisual);
      mf.addEventListener("undo-state-change", refreshControls);
      mf.addEventListener("keydown", (event) => {
        if (event.key !== "Tab" || event.ctrlKey || event.altKey || event.metaKey || source.value.includes("\\placeholder")) return;
        event.preventDefault();
        event.stopPropagation();
        // MathLive's default Tab can remain inside a completed expression.
        // With no placeholders, continue through the visible DOM controls.
        if (event.shiftKey) insertButtons[insertButtons.length - 1].focus();
        else if (!restoreButton.disabled) restoreButton.focus();
        else keyboardToggle.focus();
      }, { capture: true });
      mf.addEventListener("beforeinput", (event) => {
        if (String(event.inputType).startsWith("insert") && source.value.length >= core.MAX_SOURCE_LENGTH) {
          event.preventDefault();
          message("已达到公式长度上限。请先缩短内容。", "error");
        }
      });
      mf.addEventListener("paste", (event) => {
        const raw = event.clipboardData && event.clipboardData.getData("text/plain");
        if (!raw) return;
        const normalized = core.normalizeSource(raw);
        const analysis = core.analyzeSource(normalized);
        let unsupported = false;
        if (analysis.preview) {
          try {
            unsupported = window.MathLive.validateLatex(normalized).length > 0;
          } catch (error) {
            unsupported = true;
            console.warn("FormulaDesk paste parser failed; preserving source:", error.name);
          }
        }
        if (!analysis.preview || !analysis.valid || unsupported || source.value.length + normalized.length > core.MAX_SOURCE_LENGTH) {
          event.preventDefault();
          replaceContents({ latex: normalized, note: note.value }, "粘贴内容已完整保留到源码区。");
          byId("source-panel").open = true;
          source.focus();
        } else if (normalized !== raw) {
          event.preventDefault();
          mf.insert(normalized, { insertionMode: "replaceSelection", format: "latex" });
          fromVisual();
        }
      }, { capture: true });
    }
  } catch (error) {
    if (mf) mf.remove();
    mf = null;
    keyboard = null;
    console.error("FormulaDesk initialization failed:", error.name, error.message);
  }

  keyboardToggle.addEventListener("click", () => {
    if (!keyboard || !previewEditable) return;
    if (keyboard.visible) keyboard.hide();
    else { keyboardContainer.hidden = false; mf.focus(); keyboard.show(); }
  });
  source.addEventListener("input", editedSource);
  note.addEventListener("input", () => {
    changed();
    syntaxStatus.textContent = sourceWarning + (note.value.length > core.MAX_NOTE_LENGTH ? " 说明超过 10000 字符，请缩短后再复制。" : "");
    message("说明已更改，请重新复制所需内容。");
  });

  insertButtons.forEach((button) => {
    button.addEventListener("pointerdown", (event) => { if (event.button === 0) event.preventDefault(); });
    button.addEventListener("click", () => {
      if (!previewEditable || !mf) return;
      mf.focus();
      mf.insert(button.dataset.insert, { insertionMode: "replaceSelection", selectionMode: "placeholder" });
      fromVisual();
    });
  });
  document.querySelectorAll("[data-example]").forEach((button) => {
    button.disabled = false;
    button.addEventListener("click", () => {
      replaceContents(examples[button.dataset.example], "已载入示例。");
      if (previewEditable && mf) mf.focus();
    });
  });
  undoButton.addEventListener("click", () => { mf.executeCommand("undo"); fromVisual(); mf.focus(); });
  redoButton.addEventListener("click", () => { mf.executeCommand("redo"); fromVisual(); mf.focus(); });
  clearButton.addEventListener("click", () => { replaceContents({ latex: "", note: "" }, "已清空。"); });
  restoreButton.addEventListener("click", () => {
    if (!previous) return;
    const value = previous;
    previous = null;
    source.value = value.latex;
    note.value = value.note;
    changed();
    renderSource();
    message("已恢复替换前的公式和说明。");
  });
  promptButton.addEventListener("click", () => { void copy(true); });
  latexButton.addEventListener("click", () => { void copy(false); });
  manualButton.addEventListener("click", manual);
  manualText.addEventListener("copy", () => {
    if (manualRevision === revision && manualIncludesNote && manualText.selectionStart === 0 && manualText.selectionEnd === manualText.value.length && manualText.value.length > 0) safeToLeave = true;
    message("已触发手动复制，请在目标输入框粘贴检查。", "success");
  });
  document.addEventListener("keydown", (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter" && !event.isComposing) {
      event.preventDefault();
      if (!promptButton.disabled) void copy(true);
    }
  });
  window.addEventListener("beforeunload", (event) => {
    if (!safeToLeave && (source.value !== "" || note.value !== "")) {
      event.preventDefault();
      event.returnValue = "";
    }
  });

  source.disabled = false;
  renderSource();
  message("先编辑公式，再复制。支持 LaTeX 的聊天、文档和编辑器都可以使用。");
})();

