# 验证记录

日期：2026-10-17（Asia/Shanghai）。

## 本地验证

| 检查 | 结果 |
| --- | --- |
| 单元测试 `npm test` | 17 个文件，94 项通过 |
| 生产构建 `npm run build` | 类型检查与 Vite 构建通过 |
| 生产浏览器测试 `npm run test:e2e -- --headed` | 64 项通过 |
| GitHub Pages 同路径本地冒烟 | 11 项通过 |
| 响应式 | 1440×900、1024×768、768×1024、390×844、320×568 |
| 独立代码复审 | 本轮发现的 3 项重要状态问题已修复并复核 |

## 已覆盖

- 中文默认，英文切换与偏好恢复；切换不翻译正文、文件名或用户标题。
- 双栏、统一视图、按词 / 字符高亮、忽略大小写和正则、移动段落、差异合并。
- JSON、CSV 结构对比，Word、Excel、PDF 导入和图片像素差异。
- 记录保存、重命名、重新打开、删除，以及历史开关。
- 中文 / 英文 HTML 报告下载，分享前提醒、分享内容恢复与地址栏清理。
- 不支持文件的中文报错、手机合并按钮不遮挡文本、设置面板不溢出屏幕。
- 20 项竞态回归：旧文件读取与图片解码不能覆盖新导入、清空、编辑、交换或打开记录；两侧独立导入可以乱序完成；关闭草稿恢复后不会被旧计时器写回；语言切换保留待提交正则。
- 缓存只清理本应用命名空间，保留同源其他项目缓存；生产离线重载。
- `/vibe-coding-lab/text-compare/` 主路径与嵌套入口资源、Service Worker 作用域、许可证文件和可见署名。

## 复验命令

```sh
npm ci
npx playwright install chromium
npm test
npm run test:e2e
npm run build

# 对已运行的生产站点执行 11 项冒烟检查
TARGET_URL=https://jiaxuan-tao.github.io/vibe-coding-lab/text-compare/ node scripts/smoke.mjs
```

## 未覆盖与边界

- 本轮自动化使用 Chromium；未声称完成 Safari、Firefox 或真实手机硬件验证。
- PDF 是文字提取，不是 OCR；复杂字体、加密 PDF、Word 修订批注、Excel 公式和原始版式不保证完整保真。
- 尚未测试所有代码语言与极端大文件；解析、渲染和历史保存受浏览器内存与配额限制。
- 不支持云同步、账号、协作编辑，也不自动备份浏览器本地记录。
- 分享链接包含内容，不是加密通道；第三方聊天软件可能截断长链接。
- 离线只保证已加载的资源；未访问过的按需模块可能需要先联网加载。

## 发布验证

- 发布提交：`dfa6b07d8aac24663a4bfc0bab53001f665a9bb1`。
- [GitHub Actions 发布记录](https://github.com/jiaxuan-tao/vibe-coding-lab/actions/runs/39031753985)：完成，结果为 success。
- [线上体验](https://jiaxuan-tao.github.io/vibe-coding-lab/text-compare/)：已执行 `scripts/smoke.mjs`，11 项通过，无浏览器异常。
- 线上检查包含中文默认、中文差异、中英文切换保留输入、HTML 报告下载、分享确认与恢复、手机布局、Service Worker 作用域、许可证与署名、嵌套入口资源和离线重载。
