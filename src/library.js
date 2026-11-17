"use strict";

((root, factory) => {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.FormulaDeskLibrary = api;
})(typeof window === "object" ? window : this, () => {
  const MAX_BYTES = 4 * 1024 * 1024;
  const clone = (value) => JSON.parse(JSON.stringify(value));
  function fields(value, names) {
    if (!value || typeof value !== "object" || Array.isArray(value) ||
        Object.keys(value).length !== names.length || names.some((name) => !Object.hasOwn(value, name)))
      throw new Error("公式库字段不完整或包含未知字段。");
  }
  function string(value, limit, required, label) {
    if (typeof value !== "string" || value.length > limit || (required && !value.trim()))
      throw new Error(label + "不能为空或超过 " + limit + " 字符，且必须是文本。");
  }
  function validate(value) {
    fields(value, ["format", "version", "groups"]);
    if (value.format !== "formuladesk-library" || value.version !== 1)
      throw new Error("无法识别公式库格式或版本（需要版本 1）。");
    if (!Array.isArray(value.groups) || value.groups.length > 100)
      throw new Error("公式库最多包含 100 个领域。");
    const ids = new Set();
    function id(value) {
      if (typeof value !== "string" || !/^[A-Za-z0-9_-]{1,100}$/.test(value) || ids.has(value))
        throw new Error("公式库包含无效或重复的标识。");
      ids.add(value);
    }
    let count = 0;
    for (const group of value.groups) {
      fields(group, ["id", "label", "items"]);
      id(group.id);
      string(group.label, 100, true, "领域名称");
      if (!Array.isArray(group.items) || group.items.length > 500)
        throw new Error("每个领域最多包含 500 条公式。");
      count += group.items.length;
      if (count > 5000) throw new Error("公式库最多包含 5000 条公式。");
      for (const item of group.items) {
        fields(item, ["id", "title", "latex", "note"]);
        id(item.id);
        string(item.title, 100, true, "公式名称");
        string(item.latex, 10000, false, "公式源码");
        string(item.note, 10000, false, "公式说明");
      }
    }
    return value;
  }
  function size(text) {
    if (new TextEncoder().encode(text).length > MAX_BYTES) throw new Error("公式库超过 4 MiB，未载入或保存。");
  }
  function parse(text) {
    if (typeof text !== "string") throw new Error("公式库文件必须是文本。");
    size(text);
    let value;
    try { value = JSON.parse(text.replace(/^\uFEFF/, "")); }
    catch (error) { if (!(error instanceof SyntaxError)) throw error; throw new Error("公式库不是有效的 JSON 文件。"); }
    return validate(value);
  }
  function serialize(value) {
    validate(value);
    const text = JSON.stringify(value, null, 2);
    size(text);
    return text;
  }
  function create(groups) { return parse(JSON.stringify({ format: "formuladesk-library", version: 1, groups })); }
  function move(array, index, delta) {
    const target = index + delta;
    if (!Number.isInteger(index) || ![-1, 1].includes(delta) || index < 0 || index >= array.length || target < 0 || target >= array.length) return;
    const [item] = array.splice(index, 1);
    array.splice(target, 0, item);
  }
  return Object.freeze({ MAX_BYTES, create, parse, serialize, clone, move });
});
