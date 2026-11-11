# 开发与构建

源码根目录需要 Python 3.10+、Node.js 20+。不需要 npm install、pip install、编译器或服务。运行资源已固定并包含在 vendor/。

```text
src/core.js        输入规则、分隔符处理、长度/嵌套边界与复制文本
src/app.js         MathLive、DOM、剪贴板、恢复与离开提醒
src/examples.js    按领域分类的公式示例，与 app.js 合入同一应用脚本
src/template.html  页面语义与控件
src/app.css        响应式布局
vendor/           MathLive 固定版本与字体，禁止手动修改
build.py          校验依赖并原子生成独立 HTML
tests/            Node 规则/真实解析器测试与 Python 构建测试
checks/           独立成品检查与本机浏览器预览
tools/            按白名单制作与检查公开发布包
.local-history/   本机迁移、归档与接手资料，不进入公开包
```

运行 `python build.py` 生成 index.html 与旧名称兼容文件。两者内容相同。UTF-8、LF 换行和内嵌资源固定；同一源码应得到相同 HTML 哈希。

`dependency-receipt.json` 记录公开 npm 包来源、固定 SHA-512 和全部 24 个资产的 SHA-256。构建要求清单身份正确、没有重复/漏项、所有资产哈希正确、20 个字体引用齐全。校验失败不会覆盖已有成品。完成全部渲染后才写同目录临时文件，再原子替换单个输出。

首次缺少 vendor/ 时，可显式运行 `python build.py --fetch-vendor`。它只下载固定的公开 npm 发布包，先核对完整性，在临时目录准备必需文件，再移入 vendor/；已存在的 vendor/ 不会覆盖。普通构建不联网。不要为解决校验失败而自动改写 receipt。

日常自动检查：

```text
node --test
python -m unittest discover -s tests -p "test_*.py"
python build.py
python checks/check_bundle.py
```

Python 测试在项目内创建独立临时副本，不修改真实 vendor/；失败注入模拟资产损坏、清单漏项与原子替换失败。独立成品检查在 `python -O` 下仍有效。

仅文档修改核对内容与链接即可；功能修改还需验证对应交互。当前结果和历史发布证据分别见[测试说明](testing.md)。若 Windows 的 `python` 命令落到不可用的应用执行别名，请使用已安装解释器的完整路径运行相同命令，无需修改项目或安装依赖。

浏览器预览：`python checks/preview.py`。只绑定 127.0.0.1，终端显示临时地址，结束后按 Ctrl+C。`--fixtures` 另外启用明确标注的复制拒绝/延迟、组件缺失及指针拖选测试页面；这些页面用于测试，不进入便携包。指针夹具在浏览器中向真实键盘节点发送按下、长按、移入和释放事件，用于验证拖选路径，不等同于完整原生鼠标移动实测。

CI 定义在 `.github/workflows/ci.yml`，使用只读仓库权限、不保存 checkout 凭据，第三方 Actions 固定到提交。在三类系统和两种 Python 版本运行测试、离线构建与独立成品检查；`v` 开头的版本标签另外执行发布打包并检查验证报告绑定。日常分支推送可保留已发布版本的历史报告，打包器的拒绝条件仍由 Python 测试覆盖。具体提交的执行结果见 [GitHub Actions](https://github.com/hezhiheng1999/FormulaDesk/actions)，配置文件本身不是通过证据。

发布脚本要求 docs/verification.json 的版本、HTML 哈希和字节数与当前构建一致，避免把旧验证报告与新成品一起发布。这只检查报告绑定关系，不会替维护者重新执行浏览器测试；运行行为改变后，应实际复测并更新报告。

`python tools/package_release.py` 会生成并替换同版本的 dist/ 文件，不属于日常检查。dist/ 可保留不同版本的 ZIP，汇总清单与报告对应最近制作的版本；新版打包前归档旧汇总文件，保留历史 ZIP。文档整理不重新打包，新版本按[发布说明](releasing.md)执行。

依赖升级时请核对上游公开版本、包完整性、资产清单和许可证，然后重跑测试与浏览器检查。MathLive 的 URL、朗读和下载入口必须保持禁用。新增能力不要依赖未记录的全局安装或某位开发者的文件路径。
