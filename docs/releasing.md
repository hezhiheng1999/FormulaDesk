# 制作与发布

当前已公开发布 v1.2.0，dist/ 保留该版本的原始资产。发布脚本会替换同版本的 ZIP、校验清单和报告；日常开发、迁移或文档整理不运行打包，也不覆盖这些历史文件。

## 制作新版本

1. 在本项目修改源码，更新 package.json 版本与 CHANGELOG，按[开发说明](development.md)完成适用测试和构建。
2. 按[测试说明](testing.md)实测当前成品的浏览器行为，再更新 docs/verification.json 的环境、范围、结果和成品绑定。打包会拒绝版本、HTML 哈希或字节数不匹配的报告，但不会代替浏览器测试。
3. 运行 `python tools/package_release.py`，检查 dist/ 的新版 portable ZIP、source ZIP、SHA256SUMS.txt 与 release-report.json。新版本 ZIP 使用新的版本文件名；打包会更新汇总校验清单和报告，发布前先归档旧版的这两个文件。
4. 将 portable ZIP 完整解压到新目录验证使用；将 source ZIP 解压后离线重建，核对 HTML 哈希。portable ZIP 面向使用者，source ZIP 包含源码、固定依赖与成品。
5. 检查实际 ZIP 清单、文档、许可证、截图和差异。脚本的公开白名单排除本机历史、缓存、内部计划和 dist/，并检查常见个人路径及密钥形态；仍需人工核对公开内容。

## 提交与公开发布

正式仓库为 [hezhiheng1999/FormulaDesk](https://github.com/hezhiheng1999/FormulaDesk)。本地提交、远程推送、标签和 Release 按当次授权执行；文档整理或本地提交不包含公开发布授权。

发布前查看与发布提交对应的 [Actions 运行结果](https://github.com/hezhiheng1999/FormulaDesk/actions)，确认全部任务通过，再上传 portable ZIP、source ZIP 与校验文件。旧提交的 CI、本地检查和浏览器测试各有范围，不能互相替代。不要修改已有版本的标签或附件来发布新内容。

项目采用 MIT，版权署名为 FormulaDesk contributors；MathLive 与字体保留原许可证和声明。后续发布直接使用本独立仓库，不在旧工作区维护发布副本。

## 核对下载文件

例如核对既有 v1.2.0 便携包（Windows）：

```powershell
Get-FileHash -Algorithm SHA256 .\formuladesk-1.2.0-portable.zip
```

将结果与 SHA256SUMS.txt 对应条目比较。macOS/Linux 可使用系统自带的 SHA-256 校验工具。便携 ZIP 解压后直接打开 index.html。
