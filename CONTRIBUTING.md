# 参与贡献

欢迎提交可复现的问题、文档改进和有明确用途的小范围修复。请先读 README、[开发说明](docs/development.md) 和 [测试说明](docs/testing.md)。

运行环境：Python 3.10+、Node.js 20+。日常使用者不需要它们。项目没有需要安装的 Python/Node 第三方依赖。

提交改动前运行：

```text
node --test
python -m unittest discover -s tests -p "test_*.py"
python build.py
python checks/check_bundle.py
python tools/package_release.py
```

修改界面或交互时，补充实际浏览器验证：输入和源码同步、Tab、清空与恢复、复制失败的手动路径、窄窗口。说明测试的系统、浏览器、输入和结果；模拟测试、静态检查与真实浏览器结果应分开记录。

请勿提交个人公式、密钥、剪贴板记录、本机绝对路径或自动生成的 `dist/`。新测试使用虚构的小公式。依赖升级需要同步更新固定版本、完整性值、文件清单、许可证和验证结果。

保持工具可离线、可双击使用。新增联网、保存草稿、分析统计或第三方服务需要单独说明数据流与用户选择；不默认开启。

Pull request 请写明具体问题、行为变化和实际验证。不要只因测试数量增加就声称全面兼容。贡献代码按项目 MIT 许可证提供，请确保有权贡献相关内容。
