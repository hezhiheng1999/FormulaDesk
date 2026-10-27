"use strict";

// Pure input rules shared by the browser and the dependency-free Node tests.
(function (root) {
  const MAX_SOURCE_LENGTH = 10000;
  const MAX_NOTE_LENGTH = 10000;
  const MAX_NESTING = 64;
  const MAX_COMMAND_CHAIN = 64;

  function escapedAt(value, index) {
    let slashes = 0;
    for (let i = index - 1; i >= 0 && value[i] === "\\"; i -= 1) slashes += 1;
    return slashes % 2 === 1;
  }

  function normalizeSource(value) {
    let result = value;
    const fenced = result.trim().match(/^```(?:latex|tex|math)?[ \t]*\r?\n([\s\S]*?)\r?\n```$/i);
    if (fenced) result = fenced[1];
    const trimmed = result.trim();
    for (const pair of [["\\[", "\\]"], ["\\(", "\\)"], ["$$", "$$"], ["$", "$"]]) {
      const [start, end] = pair;
      if (trimmed.length < start.length + end.length || !trimmed.startsWith(start) || !trimmed.endsWith(end)) continue;
      if (escapedAt(trimmed, trimmed.length - end.length)) continue;
      const inner = trimmed.slice(start.length, -end.length);
      const hasOtherBlock = start.startsWith("$")
        ? inner.split("").some((char, index) => char === "$" && !escapedAt(inner, index))
        : inner.includes(start) || inner.includes(end);
      if (!hasOtherBlock) return inner;
    }
    return result;
  }

  function analyzeSource(source) {
    if (source.length > MAX_SOURCE_LENGTH) {
      return { valid: false, preview: false, code: "length", message: "公式超过 10000 字符，已暂停预览和复制。原文仍在源码区，请缩短后重试。" };
    }
    let braceDepth = 0;
    let bracketDepth = 0;
    let braces = 0;
    let unmatchedClosingBrace = false;
    for (let i = 0; i < source.length; i += 1) {
      if (source[i] === "\\") { i += 1; continue; }
      if ("([".includes(source[i])) bracketDepth += 1;
      if (")]".includes(source[i])) bracketDepth = Math.max(0, bracketDepth - 1);
      if (source[i] === "{") { braces += 1; braceDepth += 1; }
      if (source[i] === "}") { braces -= 1; braceDepth = Math.max(0, braceDepth - 1); if (braces < 0) unmatchedClosingBrace = true; }
      if (braceDepth + bracketDepth > MAX_NESTING) {
        return { valid: false, preview: false, code: "depth", message: "公式嵌套超过 64 层，已暂停预览和复制。请简化结构，原文不会被删除。" };
      }
    }
    let commandChain = 0;
    for (const match of source.matchAll(/\\[A-Za-z]+|[^\s]/g)) {
      commandChain = /^\\[A-Za-z]+$/.test(match[0]) ? commandChain + 1 : 0;
      if (commandChain > MAX_COMMAND_CHAIN) {
        return { valid: false, preview: false, code: "complexity", message: "连续控制指令超过 64 个，已暂停预览和复制。请补全参数或拆分公式，原文不会被删除。" };
      }
    }
    if (/\\(?:href|url|htmlData|htmlId|htmlClass|htmlStyle|class|cssId|style)\b/.test(source)) {
      return { valid: true, preview: false, code: "extension", message: "链接或 HTML 扩展指令仅保留为源码，不执行预览。可以复制原文。" };
    }
    if (braces !== 0 || unmatchedClosingBrace) {
      return { valid: true, preview: false, code: "braces", message: "花括号尚未配对，预览已暂停。可以继续编辑或复制原文。" };
    }
    return { valid: true, preview: true, code: "ok", message: "" };
  }

  function canCopy(source, note) {
    return source.trim().length > 0 && analyzeSource(source).valid && note.length <= MAX_NOTE_LENGTH;
  }

  function buildPayload(source, note, includeNote = true) {
    if (!canCopy(source, note)) throw new RangeError("Formula is empty or exceeds the supported input limits");
    if (!includeNote) return source.trim();
    const parts = ["请先复述下面的公式，说明分式、上下标、求和或积分的作用范围；遇到不明确的符号请指出，再根据补充说明回答。", "", "公式（LaTeX）：", "\\[", source.trim(), "\\]"];
    if (note.trim()) parts.push("", "补充说明：", note.trim());
    return parts.join("\n");
  }

  const api = Object.freeze({ MAX_SOURCE_LENGTH, MAX_NOTE_LENGTH, MAX_NESTING, MAX_COMMAND_CHAIN, normalizeSource, analyzeSource, canCopy, buildPayload });
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.FormulaDeskCore = api;
})(typeof window === "undefined" ? {} : window);
