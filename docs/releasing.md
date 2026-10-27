# 制作与发布

1. 完成开发文档中的测试，以及 testing.md 的浏览器检查。
2. 更新 package.json 版本与 CHANGELOG，实际复测当前成品后更新 docs/verification.json。打包会拒绝版本、HTML 哈希或字节数不匹配的旧报告。
3. 运行 `python tools/package_release.py`。
4. 检查 dist/ 的 portable ZIP、source ZIP、SHA256SUMS.txt 与 release-report.json。
5. portable ZIP 面向使用者；source ZIP 是可以作为独立 GitHub 仓库根目录的公开项目。

不要直接发布上级的工具连接工作区。它可能包含其他连接说明、历史验证和本机信息。制作脚本只选择显式白名单中的项目文件，排除本机历史检查、缓存、临时目录、内部计划和 dist/，并检查常见个人路径及密钥形态。

白名单和模式检查不能证明世界上不存在任何秘密。维护者发布前仍应阅读实际 ZIP 清单、文档、许可证、截图和差异，确认不包含个人或未公开内容。

首次公开仓库时，请从 source ZIP 解压出的项目目录开始；不要把父工作区当作仓库。发布包已包含编译好的 HTML，也包含可离线重建的源码和依赖。

正式仓库为 [hezhiheng1999/FormulaDesk](https://github.com/hezhiheng1999/FormulaDesk)，在 Releases 上传 portable ZIP、source ZIP 与校验文件。应查看与发布提交对应的 [Actions 运行结果](https://github.com/hezhiheng1999/FormulaDesk/actions)，确认全部任务通过再发布。不得用本地检查代替远程 CI 或浏览器交互实测。

许可证默认为 MIT，版权署名为 FormulaDesk contributors；MathLive 与字体保留原许可证与声明。若维护者希望采用其他许可或署名，请在真正公开前调整，而不是在发布后假定可以撤回已授予的许可。

校验发布包（Windows）：

```powershell
Get-FileHash -Algorithm SHA256 .\formuladesk-1.2.0-portable.zip
```

将结果与 SHA256SUMS.txt 对应条目比较。macOS/Linux 可使用系统自带的 SHA-256 校验工具。便携 ZIP 解压后直接打开 index.html。
