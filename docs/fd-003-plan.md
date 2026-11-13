# FD-003 浮窗适配、快捷唤出与工作单实施计划

> 本文保留立项时的实施顺序与验收约定。最终完成情况、用户确认和发布状态见[任务记录](tasks.md#fd-003--浮窗适配快捷唤出与工作单)，分阶段实测见[测试说明](testing.md)。

**目标：** 在 v1.4.0 上完成高 DPI 浮窗适配、单实例与快速唤出、手动保存和打开公式工作单。用户已要求三项合并为 FD-003，计划完成后在一个新对话中实施。

**架构：** 沿用 WinForms、.NET Framework 4.8 系列和固定 WebView2 SDK 1.0.4314.35，扩展原生窗口、进程协调和现有网页状态桥接。新增功能以 Windows 浮窗版为主，独立网页版保留既有行为并做回归。

**技术栈：** C#、WinForms、WebView2、原生 Win32 热键、JavaScript、现有 Node/Python 测试和系统 C# 编译器；不新增第三方依赖或常驻服务。

**需求来源：** [FD-003 任务记录](tasks.md#fd-003--浮窗适配快捷唤出与工作单)。基线为 main / e9e97e892a74fbe7d56182245f8f8c80e88de06a；规划前工作区干净。本计划、任务登记和源码包白名单调整属于管理侧交接改动，执行对话应保留。

## 范围、选择与默认行为

- 采用扩展现有宿主的方式。替换桌面框架会增加依赖和既有交互的重验范围，当前三项需求不需要框架迁移。
- 三部分共用窗口状态与编辑内容，按下文阶段顺序实施，在同一执行对话中完成。
- 热键默认 `Ctrl+Alt+F`。单实例范围为同一 Windows 用户、登录会话和便携目录；不同目录的版本可独立运行，热键占用须明确提示。
- 浮窗已获得焦点时按热键隐藏；隐藏、最小化或位于其他应用后方时按热键显示并激活。隐藏不销毁页面，保留公式、说明、面板、窗口大小及图钉状态。关闭按钮仍退出程序；本任务不增加托盘、自启动或设置中心。
- 再次启动同一便携目录的 EXE 只激活已有窗口，不再创建 WebView2。实例协调只传递激活信号，不传递公式、文件路径或启动命令。
- 工作单通过用户主动选择文件保存和打开；不增加自动保存、最近文件列表、文件关联或启动时自动恢复。原生对话框是用户授权读写该文件的位置选择，不向网页开放任意路径读写。
- 在桌面版的“LaTeX源码和补充说明”面板提供“打开工作单…”和“保存工作单…”，并支持 `Ctrl+O`、`Ctrl+S`。每次保存选择目标文件，覆盖已有文件使用原生确认。
- 立项时的授权覆盖三项实现、验证和相关文档。用户验收试制版后另行授权提交、推送和公开发布 v1.5.0。

## 全局约束与证据边界

- 保留原始 LaTeX、说明、单步整组恢复、复制防重入及失败降级、模板 Tab、键盘长按拖选、31 个希腊字母名称、三个面板的互斥与高度行为。
- 原有公式/说明各 10000 个 UTF-16 代码单元、嵌套与连续指令各 64 的预览/复制保护继续有效。保存和打开工作单不能用修复后的排版结果替换原文。
- 已有部分缩放处理：网页通过 devicePixelRatio 上报布局，宿主换算成设备像素。新增 DPI 处理必须避免重复乘倍率；标题栏、命中区域、最小尺寸和还原边界也要纳入。
- 基础实测范围为 Windows 11 x64 的 100%、125%、150% 缩放。切换系统显示设置需要用户配合时给出明确步骤；网页缩放不能代替原生 DPI 实测。
- 有真实多屏环境时验证不同 DPI 的跨屏拖动和还原。无该环境则保留未验证项，不把模拟坐标或单屏检查称为跨屏实测；Windows 10 仍按实际可用环境报告。
- 只用虚构公式和项目内测试文件验证保存/打开，不把用户公式、工作单内容或剪贴板写进日志、发布包或测试收据。
- 本任务的新产物和运行收据放在忽略的 .local-history/tasks/FD-003/；v1.4.0 及更早的附件、标签和原报告保持原样。

## 阶段 1：DPI 与窗口适配

**文件：** 修改 src/windows/Program.cs、PinToggle.cs、app.config、app.manifest，以及必要的 src/desktop.js；新增 src/windows/WindowMetrics.cs，扩展 tests/test_windows.py。

**接口：** `WindowMetrics.Scale(int logical, int dpi)` 将 96 DPI 逻辑尺寸转换为设备像素，使用向上取整；`WindowMetrics.Clamp(Rectangle bounds, Rectangle workingArea)` 约束窗口到指定显示器工作区。保留 WindowHeight.Calculate 的既有职责，窗口位置约束另行处理。

- [ ] 添加能独立编译运行的 C# 行为测试：40 个逻辑像素在 96/120/144 DPI 下分别为 40/50/60；边界约束覆盖负坐标显示器、窗口越界及工作区变小，结果来自明确的坐标预期。
- [ ] 先运行针对测试确认新行为尚未提供，再实现 WindowMetrics 并接入窗口。统一逻辑尺寸和设备像素，按 DPI 更新标题栏、图钉、图标、按钮、调整尺寸命中区和最小尺寸。
- [ ] 核对 Framework 4.8 的 DPI 配置与 DPI 变化事件。变化时同步 normalBounds、collapsedHeight、naturalBase，依据当前显示器工作区处理布局，避免展开收起积累高度误差或还原到屏幕外。
- [ ] 在 100%、125%、150% 下实测完整标题栏、点击位置、键盘、窄窗、三个面板的展开收起、最大化/最小化还原。400 是现有 96 DPI 下的窗口最小宽度基准，不能在所有 DPI 下固定为 400 个物理像素。
- [ ] 在具备真实环境时执行跨屏测试；记录未具备的环境。此阶段只修复复现问题或实现明确的 DPI/边界契约，不扩展到新系统适配。

## 阶段 2：单实例与快捷唤出

**文件：** 新增 src/windows/SingleInstance.cs；修改 Program.cs、tools/build_windows.py、tools/package_release.py 和 tests/test_windows.py。

**接口：** `SingleInstance.Create(string installationDirectory)` 返回可释放的协调对象，提供 `IsPrimary`、`StartListening(Action activate)`、`SignalPrimary()` 和 `Dispose()`。命名 Mutex 决定主实例，命名 EventWaitHandle 传递激活信号；UI 激活回调切回窗口线程。

- [ ] 添加真实子进程测试：同一实例标识只能有一个主实例；第二进程的激活信号由主实例收到；主实例退出后可重新取得主身份。名称基于规范化便携目录和当前用户，在当前登录会话内使用；不能用原始路径字符串或窗口标题判断身份。
- [ ] 在创建 DeskWindow 和 WebView2 前建立协调对象。第二进程发出激活信号后退出；处理首个窗口尚在初始化时的激活，失败明确提示，不静默创建另一个编辑器。
- [ ] 为默认 `Ctrl+Alt+F` 注册 Win32 热键，在窗口销毁/退出时注销。注册失败给出具体提示，继续保留正常编辑和再次启动激活能力，不静默抢占或改用另一组快捷键。
- [ ] 实现显示、激活、隐藏及最小化恢复。显示隐藏只改变窗口可见性，保留编辑内容和置顶状态；关闭仍执行原有内容保护及退出流程。
- [ ] 实机验证从其他应用唤出、连续切换、最小化后唤出、重复启动、两次快速启动、退出后重启及热键占用。Win32 不允许强制前台切换时提供可见反馈，不伪报已激活。

## 阶段 3：手动工作单保存与打开

**文件：** 新增 src/windows/WorksheetStore.cs；修改 Program.cs、src/app.js、src/desktop.js、src/app.css、tools/build_windows.py、tools/package_release.py，扩展 tests/test_windows.py 和必要的网页回归。

**文件契约：** UTF-8 JSON，建议扩展名 `.fdesk.json`，文件上限 1 MiB（1048576 字节）。字段固定为下例，version 为整数 1，latex 与 note 必须为字符串。未知格式/版本、损坏 JSON、错误字段类型、无效 UTF-8 和超大文件均明确拒绝，保留当前编辑内容。

```json
{"format":"formuladesk-worksheet","version":1,"latex":"x^2+y^2=z^2","note":"说明原文"}
```

文件上限用于约束读写资源，不代替现有编辑保护。格式正确的工作单可保存和打开未完成、未知指令或超出预览/复制限制的源码，载入后继续沿用原有保护，不补全、不截断、不擅自规范化。

**原生接口：** `WorksheetDocument` 保存 `Latex` 与 `Note`；`WorksheetStore.Serialize/Deserialize` 处理格式，`Read(string path)` 严格读取并验证，`WriteAtomic(string path, WorksheetDocument document)` 在目标同目录写临时文件后替换，失败时保留旧目标文件并报告原因。

**网页接口：** 在 app.js 中提供只面向本地宿主的 `window.FormulaDeskWorkspace.getSnapshot()`，返回 `{latex,note,revision}`。复用现有 snapshot/replaceContents/changed/恢复逻辑；原生通过固定的快照调用读取状态，通过 JSON 消息传入工作单和保存结果，不把用户文本拼接成可执行脚本。

- [ ] 添加 C# 往返测试：中文、反斜线、换行、补充平面符号、空内容和未完成 LaTeX 原文完全一致。加入格式拒绝、严格 UTF-8、1 MiB 边界及写入失败保持旧文件的测试；不得只检查实现中出现了某个字符串。
- [ ] 保存：捕获完整快照与 revision，显示 SaveFileDialog，仅在成功写入后提示完成。取消或失败不更改输入、恢复点或离开保护；如果当前 revision 已改变，只说明保存了捕获时的内容，不能将新输入标记为已保存。
- [ ] 打开：先读完并验证文件，再对当前非空内容提示替换确认；取消、验证失败或读取失败不覆盖输入。成功打开沿用整组替换与恢复机制，原文进入源码与说明，错误源码保持可继续编辑。
- [ ] 载入成功或保存成功且 revision 未变化时，将当前内容标记为已有保存副本，并同步宿主关闭保护；之后任何编辑恢复未保存状态。保存不能等同于复制到目标应用，既有复制提示与保护语义要相应区分。
- [ ] 在源码/说明面板放置两个操作入口，绑定桌面版 Ctrl+O/Ctrl+S，防止打开浏览器原生保存/打开页面；不占用现有公式快捷键，输入法组合状态下不误触发。
- [ ] 原生与网页消息只接受现有受信任本地页面来源，明确校验消息类型与数据；文件内容只作为数据处理，不执行其中的路径、命令或 HTML。
- [ ] 实机验证保存后关闭重开、取消对话框、覆盖确认、导入后恢复、损坏文件不覆盖，以及打开工作单后两个复制模式的结果。用独立本机文本框核对虚构测试内容，不自动操作 Codex 自身输入框。

## 阶段 4：集成、文档与交付

**文件：** tests/ 中受影响测试，tools/build_windows.py 的显式编译清单，tools/package_release.py 的公开源码白名单；README、QUICKSTART、SECURITY、兼容性与测试说明、CHANGELOG 及任务记录。

- [ ] 新增 C# 文件同步加入 Windows 编译入口和公开源码白名单；工作单、临时写入文件、个人路径及缓存不得进入包。更新手动文件读写的数据流说明、热键与单实例范围，并把新增能力标为未发布开发改动。
- [ ] 运行 `node --test`、`python -m unittest discover -s tests -p "test_*.py"`、`python build.py`、`python checks/check_bundle.py` 和 `git diff --check`。应零失败；平台跳过项如实报告。
- [ ] 用现有固定 SDK 在私有测试目录离线构建：`python tools/build_windows.py --sdk-package <本地已验证的SDK文件> --output .local-history/tasks/FD-003/windows-trial`。不使用 dist/ 作为本任务试制输出，不下载新依赖来绕过固定依赖校验。
- [ ] 核对实际公开源码导出的文件、链接和新 helper；在临时目录离线重建 HTML 并比较摘要，验证 Windows 编译入口包含新增模块。没有发布授权时不执行会覆盖正式资产的发布脚本。
- [ ] 整体回归浮窗和独立网页：四领域公式分页、三个面板、清空后输入、分数 Tab、31 个英文名称、长按拖选、原文保护、整组恢复、复制降级。再串联“唤出 → 打开工作单 → 修改 → 保存 → 隐藏/显示 → 复制 → 关闭重开”。
- [ ] 新证据按阶段保存在 .local-history/tasks/FD-003/，只记录虚构输入及必要环境/结果。不要覆盖 v1.4.0 的发布验证报告来伪装旧资产已重测；任务完成时明确各项实际覆盖范围和未验证环境。
- [ ] 更新 docs/tasks.md 中唯一的当前检查点与结果。只有三项实现和必要验收均满足才标记已完成；提交/推送/发版按另行授权记录，不因代码可运行就标记已发布。

## 最终可观察验收

| 项目 | 通过表现 |
|---|---|
| DPI 与窗口 | 100/125/150% 下原生控件与内容不重叠、不裁切，点击命中正确；面板高度与还原正常；实际环境中的窗口保持可达，跨屏覆盖范围有明确记录 |
| 单实例与唤出 | 同目录重复启动只保留一个编辑窗口；热键显示隐藏、最小化恢复后内容及图钉状态不变；冲突和失败有明确反馈 |
| 工作单 | 公式及说明按原文往返；取消/失败不覆盖输入或旧文件；成功打开可恢复原内容；保存状态只对应实际保存的 revision |
| 基线回归 | 原有编辑与复制等行为无回归，必要自动检查通过，网页仍可离线运行，历史发布资产保持原样 |

## 参考依据

- [WinForms .NET Framework 高 DPI 支持](https://learn.microsoft.com/en-us/dotnet/desktop/winforms/high-dpi-support-in-windows-forms)
- [RegisterHotKey](https://learn.microsoft.com/en-us/windows/win32/api/winuser/nf-winuser-registerhotkey)
- [Mutex](https://learn.microsoft.com/en-us/dotnet/api/system.threading.mutex?view=netframework-4.8.1) 与 [EventWaitHandle](https://learn.microsoft.com/en-us/dotnet/api/system.threading.eventwaithandle?view=netframework-4.8.1)
- [File.Replace](https://learn.microsoft.com/en-us/dotnet/api/system.io.file.replace?view=netframework-4.8.1) 与 [WebView2 JSON 消息](https://learn.microsoft.com/en-us/dotnet/api/microsoft.web.webview2.core.corewebview2.postwebmessageasjson)
