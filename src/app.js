"use strict";

(() => {
  const core = window.FormulaDeskCore;
  const desktop = window.FormulaDeskDesktop;
  const byId = (id) => document.getElementById(id);
  const source = byId("latex-source");
  const note = byId("formula-note");
  const host = byId("mathfield-host");
  const previewState = byId("preview-state");
  const syntaxStatus = byId("syntax-status");
  const status = byId("copy-status");
  const keyboardContainer = byId("keyboard-container");
  const keyboardToggle = byId("keyboard-toggle");
  const keyboardLabel = byId("keyboard-label");
  const outputPanel = byId("output-panel");
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
  // A textarea exposes LF line endings. Keep imported CR/CRLF until that field is edited.
  let rawLatex = null;
  let rawNote = null;

  function message(text, type = "") {
    status.textContent = text;
    status.className = "copy-status" + (type ? " " + type : "");
    if (desktop) desktop.dirty(!safeToLeave);
  }

  if (!core) {
    previewState.textContent = "页面文件不完整，无法启动。请重新获取完整的 HTML 文件。";
    message("核心脚本未加载。", "error");
    return;
  }

  const exampleGroups = window.FormulaDeskExamples;
  const exampleDomains = byId("example-domains");
  const exampleList = byId("example-list");
  const examplePrev = byId("example-prev");
  const exampleNext = byId("example-next");
  const examplePageSize = 6;
  let exampleGroupIndex = 0;
  let examplePageIndex = 0;

  function renderExamples() {
    const group = exampleGroups[exampleGroupIndex];
    const pages = Math.ceil(group.items.length / examplePageSize);
    exampleList.replaceChildren();
    group.items.slice(examplePageIndex * examplePageSize, (examplePageIndex + 1) * examplePageSize).forEach((example) => {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = example.title;
      button.addEventListener("click", () => {
        replaceContents(example, "已载入“" + example.title + "”。");
        if (previewEditable && mf) mf.focus();
      });
      exampleList.appendChild(button);
    });
    byId("example-page").textContent = (examplePageIndex + 1) + " / " + pages;
    examplePrev.disabled = examplePageIndex === 0;
    exampleNext.disabled = examplePageIndex === pages - 1;
    byId("example-panel").setAttribute("aria-labelledby", "example-domain-" + group.id);
  }

  function selectExampleGroup(index) {
    exampleGroupIndex = index;
    examplePageIndex = 0;
    Array.from(exampleDomains.children).forEach((tab, tabIndex) => {
      tab.setAttribute("aria-selected", String(tabIndex === index));
      tab.tabIndex = tabIndex === index ? 0 : -1;
    });
    renderExamples();
  }

  function snapshot() { return { latex: rawLatex ?? source.value, note: rawNote ?? note.value }; }

  function setContents(value) {
    source.value = value.latex;
    note.value = value.note;
    rawLatex = source.value === value.latex ? null : value.latex;
    rawNote = note.value === value.note ? null : value.note;
  }

  function refreshControls() {
    const { latex, note: description } = snapshot();
    const copyable = core.canCopy(latex, description);
    const allowed = copyable && !copyPending;
    promptButton.disabled = !allowed;
    latexButton.disabled = !allowed;
    manualButton.disabled = !copyable;
    clearButton.disabled = source.value === "" && note.value === "";
    restoreButton.disabled = previous === null;
    undoButton.disabled = !previewEditable || !mf || !mf.canUndo();
    redoButton.disabled = !previewEditable || !mf || !mf.canRedo();
    insertButtons.forEach((button) => { button.disabled = !previewEditable; });
    keyboardToggle.disabled = !previewEditable || !keyboard;
    byId("source-count").textContent = latex.length + " / " + core.MAX_SOURCE_LENGTH;
    byId("source-count").classList.toggle("over-limit", latex.length > core.MAX_SOURCE_LENGTH);
  }

  function changed() {
    revision += 1;
    if (desktop) desktop.worksheetStatus("");
    safeToLeave = source.value === "" && note.value === "";
    manualCopy.hidden = true;
    refreshControls();
  }

  function hidePreview(reason) {
    previewEditable = false;
    if (desktop) desktop.select("source");
    outputPanel.open = true;
    byId("source-panel").open = true;
    if (mf) { mf.hidden = true; mf.readOnly = true; }
    if (keyboard && keyboard.visible) keyboard.hide();
    keyboardContainer.hidden = true;
    keyboardToggle.setAttribute("aria-expanded", "false");
    keyboardLabel.textContent = "展开数学键盘";
    previewState.hidden = false;
    previewState.textContent = reason;
  }

  function renderSource() {
    const { latex, note: description } = snapshot();
    const analysis = core.analyzeSource(latex);
    let warning = analysis.message;
    if (description.length > core.MAX_NOTE_LENGTH) {
      warning += (warning ? " " : "") + "说明超过 10000 字符，请缩短后再复制。";
    }
    if (!analysis.preview) {
      hidePreview("预览已暂停。原文保留在 LaTeX 源码区。");
    } else if (!mf) {
      hidePreview("排版组件未加载。仍可在下方源码区编辑并复制 LaTeX。");
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
        console.error("FormulaDesk renderer failed:", error.name);
      }
    }
    sourceWarning = warning;
    syntaxStatus.textContent = warning;
    refreshControls();
  }

  function editedSource() {
    rawLatex = null;
    const normalized = core.normalizeSource(source.value);
    if (normalized !== source.value) source.value = normalized;
    changed();
    renderSource();
    message("源码已保留。请检查预览和提示后再复制。");
  }

  function replaceContents(value, reason, saved = false) {
    if (saved || source.value !== "" || note.value !== "") previous = snapshot();
    setContents(value);
    changed();
    if (saved) safeToLeave = true;
    renderSource();
    message(reason + (previous ? " 可点“恢复上次内容”撤销这次替换。" : ""));
  }

  function fromVisual() {
    rawLatex = null;
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
    if (desktop) desktop.select("source");
    manualText.focus();
    manualText.select();
  }

  function payload(includeNote) {
    const { latex, note: description } = snapshot();
    return core.buildPayload(latex, description, includeNote);
  }

  function manual() {
    if (manualButton.disabled) return;
    selectManual(payload(true), revision, true);
    message("内容已选中，请按 Ctrl+C，随后在目标输入框粘贴检查。");
  }

  async function copy(includeNote) {
    if (copyPending || promptButton.disabled) return;
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
        safeToLeave ||= coversCurrentWork;
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
      function readableKeycap(keycap) {
        if (typeof keycap === "string") {
          if (!/#[@0?]/.test(keycap)) return keycap;
          keycap = { latex: keycap };
        }
        const result = { ...keycap };
        const latex = keycap.latex || keycap.insert;
        if (!keycap.label && typeof latex === "string" && /#[@0?]/.test(latex)) {
          const argument = latex.includes("#@") ? (/[\^_]/.test(latex) ? "n" : "y") : "x";
          const display = latex.replace(/#@/g, "{x}").replace(/#(?:0|\?)/g, "{" + argument + "}");
          result.label = window.MathLive.convertLatexToMarkup(display);
        }
        if (keycap.shift) result.shift = readableKeycap(keycap.shift);
        if (Array.isArray(keycap.variants)) result.variants = keycap.variants.map(readableKeycap);
        return result;
      }
      // Keep readable keycaps and expose missing alternative menus, preserving
      // insertion templates, selection markers and MathLive's Greek names.
      keyboard.layouts = keyboard.normalizedLayouts.map((layout, index) => ({
        ...layout,
        displayShiftedKeycaps: true,
        displayEditToolbar: !desktop,
        layers: layout.layers.map((layer) => ({
          ...layer,
          rows: layer.rows.map((row) => row.map((keycap) => {
            const cap = index === 3 ? { ...keycap } : readableKeycap(keycap);
            if (index === 3) {
              cap.class = (cap.class ? cap.class + " " : "") + "greek-keycap";
              return cap;
            }
            if (index === 2 && ["5", "6", "8", "9", "0"].includes(cap.label)) {
              cap.class = (cap.class ? cap.class + " " : "") + "hide-shift";
            }
            // A visible Shift preview should also be selectable by long press.
            // Preserve existing families; supply a pair only when none exists.
            if (cap.shift && !/(^|\s)hide-shift(\s|$)/.test(cap.class || "")) {
              if (!cap.variants) {
                const base = { ...cap };
                delete base.shift;
                cap.variants = [base, cap.shift];
              }
              cap.stickyVariantPanel = false;
            }
            return cap;
          })),
        })),
      }));
      function syncKeyboard() {
        keyboardContainer.hidden = !keyboard.visible;
        keyboardToggle.setAttribute("aria-expanded", String(keyboard.visible));
        keyboardLabel.textContent = keyboard.visible ? "收起数学键盘" : "展开数学键盘";
        keyboardToggle.title = keyboardLabel.textContent;
        // MathLive bottom-aligns the plate. Measure it after layout to include the toolbar and gaps.
        keyboardContainer.style.height = keyboard.visible ? Math.ceil(keyboard.boundingRect.height) + 1 + "px" : "0px";
      }
      keyboard.addEventListener("virtual-keyboard-toggle", syncKeyboard);
      keyboard.addEventListener("geometrychange", syncKeyboard);
      keyboard.addEventListener("math-virtual-keyboard-command", () => {
        // MathLive 0.111.1 disconnects on blur and reconnects after deferred
        // focus. Bind this field before the keyboard delivers the command.
        if (previewEditable && keyboard.visible) mf._mathfield.connectToVirtualKeyboard();
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
        else if (!promptButton.disabled) promptButton.focus();
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
          replaceContents({ latex: normalized, note: snapshot().note }, "粘贴内容已完整保留到源码区。");
          if (desktop) desktop.select("source");
          outputPanel.open = true;
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
    rawNote = null;
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
  exampleGroups.forEach((group, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.id = "example-domain-" + group.id;
    button.textContent = group.label;
    button.setAttribute("role", "tab");
    button.setAttribute("aria-controls", "example-panel");
    button.addEventListener("click", () => selectExampleGroup(index));
    button.addEventListener("keydown", (event) => {
      let nextIndex;
      if (event.key === "ArrowRight") nextIndex = (index + 1) % exampleGroups.length;
      else if (event.key === "ArrowLeft") nextIndex = (index - 1 + exampleGroups.length) % exampleGroups.length;
      else if (event.key === "Home") nextIndex = 0;
      else if (event.key === "End") nextIndex = exampleGroups.length - 1;
      else return;
      event.preventDefault();
      selectExampleGroup(nextIndex);
      exampleDomains.children[nextIndex].focus();
    });
    exampleDomains.appendChild(button);
  });
  selectExampleGroup(0);
  examplePrev.addEventListener("click", () => {
    examplePageIndex -= 1;
    renderExamples();
    if (examplePrev.disabled) exampleNext.focus();
  });
  exampleNext.addEventListener("click", () => {
    examplePageIndex += 1;
    renderExamples();
    if (exampleNext.disabled) examplePrev.focus();
  });
  undoButton.addEventListener("click", () => { mf.executeCommand("undo"); fromVisual(); mf.focus(); });
  redoButton.addEventListener("click", () => { mf.executeCommand("redo"); fromVisual(); mf.focus(); });
  // Keep the mathfield connected to its keyboard while clearing with a pointer.
  clearButton.addEventListener("pointerdown", (event) => { if (event.button === 0) event.preventDefault(); });
  clearButton.addEventListener("click", () => {
    replaceContents({ latex: "", note: "" }, "已清空。");
    // Release the disabled button before MathLive starts its deferred focus;
    // a later browser blur would otherwise cancel that focus request.
    clearButton.blur();
    if (previewEditable && mf) {
      // After panel navigation MathLive can still report focus while the DOM focus is on a button.
      HTMLElement.prototype.focus.call(mf);
      mf.focus();
    }
  });
  restoreButton.addEventListener("click", () => {
    if (!previous) return;
    const value = previous;
    previous = null;
    setContents(value);
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

  if (desktop) {
    window.FormulaDeskWorkspace = Object.freeze({ getSnapshot: () => ({ ...snapshot(), revision }) });
    window.chrome.webview.addEventListener("message", ({ data }) => {
      if (!data || !Number.isSafeInteger(data.revision) || data.revision < 0) return;
      let result;
      if (data.type === "worksheet-saved") {
        if (data.revision === revision) {
          safeToLeave = true;
          result = "工作单已保存。";
        } else result = "已保存选择文件时的内容。当前修改请再次保存。";
      } else if (data.type === "worksheet-opened" && typeof data.latex === "string" && typeof data.note === "string") {
        if (data.revision !== revision) result = "打开期间输入已更改。请重新打开工作单。";
        else {
          result = "已打开工作单。可点“恢复上次内容”找回替换前的公式和说明。";
          replaceContents(data, "", true);
        }
      } else return;
      desktop.worksheetStatus(result);
      message(result);
    });
  }

  source.disabled = false;
  renderSource();
  message("先编辑公式，再复制。");
  if (desktop && keyboard && previewEditable) {
    keyboardContainer.hidden = false;
    mf.focus();
    keyboard.show();
  }
})();

