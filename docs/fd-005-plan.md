# FD-005 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans for implementation. Independent catalog preparation may use dispatching-parallel-agents; product integration and whole-change verification remain in this execution chat.

**Goal:** 实现可编辑、可迁移的 360 条公式库和明确可恢复的矩阵操作。

**Architecture:** 纯 JavaScript 模型验证目录及编辑副本，独立界面控制器连接现有工作区；Windows 宿主仅负责受限库文件读写与原生文件选择。矩阵控制器使用固定 MathLive 0.111.1 的模型与命令，不解析或重写整份用户 LaTeX。

**Tech Stack:** 原生 JavaScript/CSS、MathLive 0.111.1、Python 构建、C# WinForms/WebView2；不增加依赖。

**Spec:** [已批准设计](fd-005-design.md)。

## Global Constraints

- 沿用当前串行 checkout，保留管理侧任务登记；所有试制与收据放在 `.local-history/tasks/FD-005/`。
- 实施阶段未授权 Git/发布；用户验收试用修正后，已于 2026-11-17 授权提交、推送、新版 EXE/便携 ZIP 发布、本地版本整理及桌面快捷方式。按 v1.6.0 收尾。
- 用户已批准设计并要求继续实施，实施步骤无需再作一轮方案确认。
- Windows 使用 EXE 旁 `FormulaDesk.library.json`；网页使用当前浏览器存储；两者导入导出同一版本格式。
- 12 领域各 30 条；预设解析验证与数学内容审阅分开。
- 不保存工作区草稿，不记录用户公式或剪贴板；测试只用虚构内容。

## Review Focus

1. 写入失败不能更新已保存状态或丢掉编辑副本；实际锁文件和拒绝存储分别验证。
2. 导入损坏、重复 ID、超限或旧异步响应不能覆盖当前库；模型及宿主测试覆盖。
3. 编辑表单还未应用时退出、保存、导入或切换条目不能默默丢失；浏览器操作覆盖。
4. 矩阵删除确认期间光标或公式改变，不得删除错误行列；控制器与实际交互验证。
5. 管理库、移动领域、搜索以及取消矩阵操作不得更改工作区原文/说明；窄窗原生回归覆盖。

## Task 1: 目录模型与保存格式

**Files:** `src/library.js`, `tests/library.test.js`。

**Interfaces:** `FormulaDeskLibrary.create(groups)` 返回 `{format:"formuladesk-library",version:1,groups}`；组为 `{id,label,items}`，条目为 `{id,title,latex,note}`。`parse(text)` 验证后返回独立副本；`serialize(document)` 验证并保留文本；`clone(document)` 深拷贝；`move(array,index,delta)` 有界移动。大小上限 4 MiB UTF-8，100 个领域、每领域 500 条，总 5000 条，名称 100 字符，源码/说明各 10000 UTF-16 单位，空目录允许。

- [x] 先添加真实行为测试：原文/Unicode/顺序往返、编辑副本独立、空库、字段/ID/大小限制、移动边界；运行看到缺少接口失败。
- [x] 实现模型并运行 `node --test tests/library.test.js`，全部通过。

## Task 2: 默认库内容

**Files:** `src/examples.js`, `tests/examples.test.js`；内容核查收据在本机任务目录。

**Interfaces:** 保留 `FormulaDeskExamples`/CommonJS 导出组数组，使用 Task 1 的组和条目字段；内置 ID 固定，用户副本不会被升级改写。

- [x] 将现有预设测试改为 12 个领域各 30 条、唯一 ID/原文以及全部固定解析器/复制检查，先观察 48 条旧数据失败。
- [x] 按设计领域填入有代表性的公式；内容准备可拆成互不重叠的学科文件，整合后检查跨领域重复。
- [x] 运行 `node --test tests/examples.test.js`；逐领域审查数学条件、约定和变量说明，记录来源与已检查范围。

## Task 3: Windows 库文件桥接

**Files:** `src/windows/LibraryStore.cs`, `src/windows/Program.cs`, `tools/build_windows.py`, `tests/test_library_store.py`。

**Interfaces:** 页面发 `{type:"library-request",id,action,text?}`，action 为 load/save/import/export/recover。宿主回 `{type:"library-result",id,ok,text?,missing?,cancelled?,error?}`。load 读默认文件；save 写默认文件；import 仅选取并读文件供页面预览；export 仅导出传入快照；recover 读 `.bak` 供预览。全部保存确认由页面持有，宿主不能悄悄加载默认库。

- [x] 编写 Windows I/O 测试先观察缺少存储类失败：原始 JSON 往返、备份、UTF-8/文件上限、锁文件失败后旧文件与备份仍可读。
- [x] 独立存储类限制读取/写入字节、同目录临时写入与替换；网页输入先由模型验证，宿主独立检查格式标记和版本、基本结构与大小。
- [x] 接入受来源限制的异步请求，文件对话框退出 WebView 回调后打开；阻止并发文件动作并给出失败响应。编译源清单纳入新类。
- [x] 运行 `python -m unittest discover -s tests -p test_library_store.py`，全部通过。

## Task 4: 公式库界面与网页保存

**Files:** `src/library-ui.js`, `src/template.html`, `src/app.css`, `src/app.js`, `build.py`。

**Interfaces:** `FormulaDeskLibraryUI.init({snapshot,load})`，snapshot 返回当前原文/说明，load 调用既有 replaceContents；控制器独立管理库副本、分页、搜索、保存和导入，不直接操作数学编辑器。网页键 `formuladesk.library.v1`，备份键加 `.backup`；离开提醒与桌面 dirty 保留工作区和目录两种状态。

- [x] 在旧页面验证缺少管理入口/搜索与保存功能，记录为 UI 基线。
- [x] 实现目录浏览、两级编辑、上移下移、删除确认、本轮撤销、取消/保存和导入预览；表单未应用时用明确提示处理，保存时纳入表单更改。
- [x] 载入失败显示错误并保留原文件；恢复备份和恢复内置库先预览，再明确保存。存储失败保留待保存副本。
- [x] 用虚构目录验证增删改/排序、取消、保存/重开、导入导出和非法输入；验证所有目录操作均不改工作区。原生 400/560 像素检查长名称和焦点。

## Task 5: 矩阵入口与操作

**Files:** `src/matrix.js`, `src/app.js`, `src/template.html`, `src/app.css`, `tests/matrix.test.js`。

**Interfaces:** `FormulaDeskMatrix.template(rows,cols,environment)` 生成空位模板；`context(mf)` 只读定位当前矩阵与单元格；`describeRemoval(context,axis)` 返回受影响单元格；控制器由 app 传入变更前快照及变更后同步方法。

- [x] 先测试 2×3 模板、尺寸限制并观察功能缺失失败；非矩阵/嵌套单元格定位及非空删除摘要另用真实固定组件交互验证。
- [x] 按用户试用反馈恢复快捷栏原版图标和样式，操作区采用原有附加面板的尺寸反馈；记录打开时选区，定位改变使删除请求失效；至少保留 1 行 1 列。新增列补齐与新增行一致的输入空位。
- [x] 使用固定版增删命令，删除前保留整条原文与说明；取消不变更，支持撤销及“恢复上次内容”。
- [x] 核对 1×1、2×3、10×10、嵌套表达式、多矩阵、边界和源码暂停场景；在实际浮窗检查源文与两种复制粘贴。

## Task 6: 整体验证与文档

**Files:** 使用/开发/测试说明、`docs/tasks.md`、`tools/package_release.py` 白名单及适用测试。

- [x] 增补使用说明、离线数据保存说明与新源码白名单；不改发布版本或历史验证绑定。
- [x] `node --test`、`python -m unittest discover -s tests -p "test_*.py"`、`python build.py`、`python checks/check_bundle.py` 全部通过。
- [x] 在任务目录构建 Windows 试制件，执行新功能与必需既有能力的原生 400/560 像素回归，记录真实结果及未覆盖项目。
- [x] 进行一次全改动独立审阅，修复实际问题并验证；更新唯一任务检查点，交付试制件和证据。
