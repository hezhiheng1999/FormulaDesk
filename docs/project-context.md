# FormulaDesk 项目背景与接手导航

## 定位与形成过程

FormulaDesk 是可离线使用的可视化 LaTeX 公式输入台。用户希望边输入边看到公式，再把公式和变量说明带入 Codex 或其他对话/文档。试用 MathLive 官方演示后选用 MathLive，采用独立 HTML 和系统剪贴板的数据流，不对目标输入框做注入，也不调用 AI API。

2026-10-26 形成初版；2026-10-27 优化布局并加固输入、复制、恢复、构建与发布流程；2026-10-29 完成首个公开版本。2026-11-10 从工具连接工作区迁入独立项目。本次迁移保持运行代码和成品不变。

## 发布基线与证据

- 仓库：[hezhiheng1999/FormulaDesk](https://github.com/hezhiheng1999/FormulaDesk)，默认分支 main。
- 本次版本：[v1.4.0](https://github.com/hezhiheng1999/FormulaDesk/releases/tag/v1.4.0)，增加 FD-002 的 Windows 浮窗、置顶开关和完整便携包。发布状态见[任务管理](tasks.md)。
- 上一版本：[v1.3.0](https://github.com/hezhiheng1999/FormulaDesk/releases/tag/v1.3.0)，包含 FD-001 的界面优化、公式库与键盘修复。
- 首个历史版本：[v1.2.0](https://github.com/hezhiheng1999/FormulaDesk/releases/tag/v1.2.0)，起始提交为 32f2e47d2558efd5b99a781ac36b02f5bed30f68。
- MathLive 0.111.1；项目、依赖和字体许可证随项目保留。
- v1.2.0 HTML SHA-256：8af378741c18616cc3afb184a8fb9c14bc201c0357dc14a20d3b9c097394943d。
- 历史本地验证：34 项 Node 测试、18 项 Python 测试、20 个浏览器场景；主分支与标签两轮远程 CI 均为 6/6。
- 历史运行：[主分支](https://github.com/hezhiheng1999/FormulaDesk/actions/runs/40725429827)、[版本标签](https://github.com/hezhiheng1999/FormulaDesk/actions/runs/40727408960)。这些是 2026-10-29 的发布证据，不等于今天重新检查了远程服务。
- 四个 Release 附件当时完成匿名下载与哈希比对；dist/ 保留原包，本机回读结果已归档至 .local-history/archive/checks/github-publication-2026-10-29.json。

## 代码与工作流

| 位置 | 作用 |
|---|---|
| src/core.js | 输入规范化、资源边界、复制文本；可独立测试 |
| src/app.js | MathLive、源码同步、恢复、剪贴板和焦点 |
| src/desktop.js / src/windows/ | 桌面三面板布局、WebView2 宿主、标题栏、图钉和窗口高度 |
| src/examples.js | 按使用领域组织的常用公式示例 |
| src/template.html / src/app.css | 页面结构、布局和无障碍标签 |
| vendor/ / dependency-receipt.json | 固定依赖、20 个字体和完整性清单 |
| build.py | 离线生成单文件 HTML，校验依赖，原子替换单个成品 |
| tools/build_windows.py | 固定 SDK 校验、原生 EXE、版本信息及 Windows 目录清单 |
| tests/ | Node 输入/真实解析器测试与 Python 构建/发布测试 |
| checks/ | 当前成品检查器与临时预览脚本 |
| tools/package_release.py | 公开文件白名单、文档链接/敏感形态检查和 ZIP |
| docs/ | 使用、开发、兼容性、安全/发布证据等导航 |
| docs/tasks.md | 串行对话规则、候选队列、任务范围与当前检查点 |
| .local-history/ | 本机迁移/维护收据、历史检查与计划、原开发归档和接手提示词，禁止公开上传 |

运行时不需要 Python/Node；从源码构建需要 Python 3.10+，测试需要 Node.js 20+。已带 vendor/，普通构建不联网，无需安装第三方包。具体命令见 docs/development.md。

## 当前维护状态：2026-11-10

独立项目迁移后完成文档核查：清理首次公开前的操作说明，分开日常检查与发布打包，修正输入边界表述，将已完成计划、旧截图和检查记录归入 .local-history/archive/。原始迁移收据和开发归档保留，历史记录不作为当前待办。

文档整理已通过本地提交 11d8e73 保存。现采用“一个管理对话、每项改进一个新执行对话”的串行方式；候选队列、任务范围、当前检查点和提交/推送状态统一见[任务管理](tasks.md)。Git 操作按对应任务授权执行。

迁移与文档整理当时未改变运行源码、版本号或成品。FD-001 后续界面改动的状态见[任务管理](tasks.md)。文档整理时的自动检查与 v1.2.0 历史浏览器验证分开见[测试说明](testing.md)；未发布变更见[变更日志](../CHANGELOG.md)。工作树和提交状态以实际 Git 为准，不沿用文档整理时的“干净”结论。

## 已形成的关键行为

- 公式和说明各最多 10000 个 JavaScript 字符单位；显式分组与连续控制指令各限制 64。超限保留原文并暂停相应操作。
- 未完成/未知指令保留原始源码并暂停预览，在长度等保护允许时可复制原文；链接和 HTML 扩展不进入可视化排版器。
- 自动复制防重入、记录点击时内容；失败选择文本供手动复制。不自动读取剪贴板。
- 清空、示例替换和异常粘贴之前的公式与说明可单步恢复；不保存永久草稿。
- 排版组件缺失时仍可编辑和复制源码。编辑区内包含复制操作，示例按领域分页；源码与说明默认收起，需要修复源码时自动展开。展开后宽窗口并列源码与说明，窄窗口上下排列。
- 同源 iframe 内使用 initVirtualKeyboardInCurrentBrowsingContext；完成公式后的 Tab 不应困在编辑器中。

## 已知验证边界与后续工作

浏览器交互历史验证限 Windows 内置 Chromium 的 HTTP 预览及真实 520px 同源 iframe；独立浏览器、file:// 启动窗口、移动端与其他系统交互仍需实测。跨系统 CI 通过只是构建和测试证据。自动复制 API 成功未独立证明系统剪贴板完整，原生手动复制则做过逐字回读。浏览器离开提醒受策略限制；工具不检查数学推导或模型理解。

已观察到旧 Actions 的 Node 20 弃用提示，当前属于后续维护候选项；不要因看到它就自行升级全部依赖。下一步应先与用户确定一个具体改进目标，再修改、验证和发布。

## 新会话如何接手

先读本文件、AGENTS.md 和[任务管理](tasks.md)中的对应任务，按需读取开发/测试说明，再核对当前 Git 状态。目标、验收标准和本次授权由新执行对话的启动消息明确传入；不要假定它自动获得旧对话全文。需要追溯时从 .local-history/archive/README.md 查找历史检查和已完成计划；完整原开发文件保存在 .local-history/development-before-move/，迁移清单在 .local-history/migration-2026-11-10/manifest.json。迁移清单描述迁移当时的文件位置和字节；后续文档修改及归档位置以维护收据为准。

AGENTS.md、本文件和 docs/tasks.md 已加入未来源码包的公开白名单；本机 .local-history/ 仍排除。既有 v1.2.0 ZIP 和历史验证记录保持原字节，未来新版本应生成自己的资产与证据。
