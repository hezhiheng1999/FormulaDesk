# FormulaDesk 项目执行指引

本目录是 FormulaDesk 唯一的日常开发与升级入口。先读 README.md、docs/project-context.md 和 docs/development.md；本机接手信息在忽略目录 .local-history/ 中。

## 实现与数据

- 工具用于可视化输入公式、检查 LaTeX、添加说明并复制到目标应用；保持离线、免安装、无账号、无后台服务的基本体验。
- 编辑 src/，用 build.py 生成 index.html 与旧名称兼容文件。不要直接修改成品 HTML、vendor/ 或依赖完整性记录以绕过检查。
- core.js 管输入保护与复制文本，app.js 管界面、MathLive、恢复和剪贴板；保留原始源码，不用修复后的排版模型覆盖用户输入。
- 保留公式和说明、异常输入、复制失败降级及无占位符时的 Tab 导航行为。新功能以用户实际提出的需求为准。
- 不记录个人公式、剪贴板内容或凭据。不要将 .local-history/、本机路径、缓存和历史日志加入公开发布文件。

## 执行与验证

默认 Windows / PowerShell，正确引用中文和空格路径。旧路径仅保留跳转；新根目录的具体位置与迁移收据见本机 .local-history/，不要将个人绝对路径写入公开文档。

- 用户已授权的任务直接完成，少量文档修改只核对内容与链接；功能变化运行适用的已有测试并进行必要的浏览器验证。
- 自动检查：node --test；python -m unittest discover -s tests -p "test_*.py"；python build.py；python checks/check_bundle.py。
- 普通构建和测试使用固定 vendor/，无需 npm install 或 pip install。新增依赖、联网能力、草稿存储和外部写入应说明具体影响并确认任务授权涵盖它们。
- 复制 API 返回成功与目标剪贴板内容验证分开记录；构建/静态检查不代表浏览器交互或数学正确性。
- 发布前更新版本、CHANGELOG、成品绑定的 docs/verification.json，并按 tools/package_release.py 白名单制作发布包。
- 当前 dist/ 是已发布 v1.2.0 的历史资产。迁移或文档整理时不覆盖这些包；下一版本在明确升级任务中另行生成。
- 本地提交、远程推送、标签与 Release 按当次授权执行。授权本地提交不包含推送或公开发布。
- 不在旧的工具连接工作区继续维护副本；历史内容只供追溯，不视为另一个开发分支。
