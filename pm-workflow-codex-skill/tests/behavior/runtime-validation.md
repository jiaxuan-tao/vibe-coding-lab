# 本地运行验证记录

本记录对应设计文档的核心运行验证。验证只使用 fresh 临时项目、127.0.0.1 本地服务、脱敏示例与本机已有 Chrome；没有读写 TA说生产项目、没有连接真实账号、没有注册 LaunchAgent、没有访问网络，也没有下载浏览器。

## 可重现命令

测试脚本内部先执行与下面等价的安装，临时项目在测试结束后删除：

```bash
python3 scripts/initialize.py --project <fresh-临时项目> --no-launcher
```

### 便携命令

前置条件：macOS 已安装 Chrome，某个 Python 3.9+ 环境已安装与运行服务兼容的 Python Playwright，Node.js 能加载已安装的 Node Playwright。下面的三个路径由执行者按本机环境填写；测试不会安装依赖或下载浏览器。

```bash
PM_PYTHON=/path/to/python3
PM_PY_PLAYWRIGHT=/path/to/python/site-packages
PM_NODE_PLAYWRIGHT=/path/to/node_modules/playwright

PYTHON="$PM_PYTHON" \
PYTHONPATH="$PM_PY_PLAYWRIGHT" \
PLAYWRIGHT_MODULE="$PM_NODE_PLAYWRIGHT" \
PM_TEST_BROWSER_CHANNEL=chrome \
node tests/behavior/runtime-local-regression.js
```

运行脚本通过 `tests/behavior/runtime-server-wrapper.py` 在测试进程内把浏览器 channel 注入已安装的上游服务模块。它不修改核心文件、不写用户共享 state，也不覆盖 HOME。

### 本机执行记录

本轮实际使用临时 Python playwright 1.60.0 包和现有 Node Playwright，并复用本机 Chrome。本机的实际依赖路径由执行时环境变量传入，不是脚本默认值。两套 Playwright 都没有触发浏览器下载。

## 实际结果

- **只读健康检查：PASS。** 隔离服务以只读模式启动，`/api/health` 返回临时项目身份、版本和 `read_only: true`；写入请求返回 403。
- **原型/流程图截图：PASS。** 已执行：`/api/screenshot`。上游 Python 服务通过本机 Chrome 真实渲染，生成 6 张原型 PNG 和 1 张流程图 PNG；文件分别落入 `[需求名]/原型截图/` 与 `[需求名]/流程图截图/`，PNG 文件头和非空大小均已校验。`/api/snapshot` 也已直接使用 TA说 PRD 里 6 个 iframe 的实际 `src`/`base` 和 hash 返回 base64 PNG。
- **PRD 写回与项目身份与路径校验：PASS。** 错误 token 返回 403，项目根目录 HTML 被可写子目录白名单拒绝，只有临时项目的 `需求文档/` 副本被写入。写入前原文保存到 `.handoff/html-backups/`；旧 revision 重复提交返回 409，不会覆盖新内容。
- **复制与保存降级：PASS。** 验证对象是真实 TA说脱敏 PRD。浏览器中显式关闭 `navigator.clipboard` 和 `ClipboardItem`后，未替换 `document.execCommand`；真实 copy event 的选区包含 PRD 正文、0 个 iframe 和 7 张 `data:image` 内联图。File System Access 分支使用注入的 `showSaveFilePicker` 与文件句柄测试替身，仅验证向该句柄调用 `write/close` 及传入的完整 HTML；原生文件选择窗口和真实文件句柄覆盖未实跑。移除 `showSaveFilePicker` 后的 HTML 副本下载是真实浏览器下载，下载文件内容已读回校验。停止本地服务后从 `file://` 重新打开 PRD，复制仍成功并显示“导出服务未启动，已按纯文本复制（原型图缺失）”。
- **PRD 预览、hash 与跨页面 message 同步：PASS。** PRD 双栏预览从选择器切到 `#success`后，iframe 打开对应原型状态；原型发送 `page-changed` message 后，PRD 选择器同步到 `api-failure`；新打开 `#preview=date-invalid` 时，双栏与 iframe hash 也一致。

端到端脚本的最终输出：

```text
PASS runtime local validation: <fresh-临时项目>
PASS health read-only, identity/path/revision save, fallbacks, preview sync, and /api/screenshot PNG exports
```

## 边界

Windows 本地服务和 Edge 本轮未执行；这是 macOS + Chrome 的隔离运行证据。File System Access 的原生文件选择窗口与真实句柄覆盖未实跑，测试替身仅提供该分支的调用和内容证据；本地服务写回与下载副本另有真实读写验证。TA说 PRD 仍是本轮新生成的脱敏演示，不是当年上线的 PRD。
