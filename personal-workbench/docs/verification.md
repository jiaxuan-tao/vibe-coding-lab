# 验证记录

## 2026-10-29 演示模式验收

环境：macOS、Node.js 24.17.0、Playwright 1.61.1 / Chromium。

| 检查 | 结果 |
| --- | --- |
| `npm test` | 77/77 通过 |
| `npm run build` | 成功生成静态目录及本地演示启动脚本 |
| `CI=1 BASE_URL=http://127.0.0.1:5196/ npx playwright test` | 生产构建全套 93/93 通过 |
| 应用 JavaScript 语法、Markdown 本地链接、`git diff --check` | 通过 |

- 演示模式独立存储和主题；进入、退出、编辑、重置及备份恢复不改写个人数据。
- 11 个模块均有可编辑示例；首页待办数量和项目进度随操作更新。
- 同页跨日编辑、跨月/年日期、旧演示备份导入保留用户修改；公开快照日期不平移。
- 320、390、768、1440px 全模块横向溢出检查，以及浅深色真实截图；图片见 [演示首页](images/demo-dashboard-1440.png) 和 [手机信息面板](images/demo-info-390.png)。
- 演示模式不请求外部天气、热榜或行情接口；Service Worker 离线打开、切换模块、修改记录和再次加载通过。
- 武汉天气保留实际读取的模型数据和单位，资讯保留官方原始链接、发布日期与采集日期，详见 [数据说明](demo-data.md)。这不是持续实时服务。
- 独立代码复查发现的同页跨日写入及旧备份日期对齐问题，均先增加失败回归用例再修复。

### 线上验收

- 应用提交：`527a453`。[GitHub 自动测试与 Pages 部署](https://github.com/jiaxuan-tao/vibe-coding-lab/actions/runs/40746848842)成功。
- 对[正式演示地址](https://jiaxuan-tao.github.io/vibe-coding-lab/personal-workbench/?demo=1#/dashboard)执行 `BASE_URL=https://jiaxuan-tao.github.io/vibe-coding-lab/personal-workbench/ CI=1 npx playwright test tests/browser/demo.spec.js tests/browser/offline.spec.js`，13/13 通过。
- 覆盖真实线上路径下的模式切换、个人数据隔离、编辑与刷新、重置确认、备份恢复、日期调整、主题隔离、各宽度布局与 Service Worker 离线使用。测试使用独立浏览器上下文，不改用户已有数据。
- 本地备用静态包包含 Python 启动脚本，压缩完整性检查通过；本地与线上数据不自动同步。

以下保留原版本验证记录。

## 2026-10-16 基础版本验收

日期：2026-10-16。环境：macOS、Node.js 24.17.0、Playwright 1.61.1 / Chromium。CI 使用 Node.js 22.22.0。

## 本地结果

| 检查 | 结果 |
| --- | --- |
| `npm test` | 69/69 通过 |
| `npm run test:browser` | 81/81 通过，包含实际截图 |
| `npm run build` | 成功生成独立静态目录 `dist/` |
| `BASE_URL=http://127.0.0.1:5191/dist/ npm run test:browser -- --grep-invert screenshots:` | 80/80 通过 |
| JavaScript 语法检查 | 21 个应用与构建脚本通过 |
| Pages workflow YAML 与本地 Markdown 链接 | 解析和目标存在性检查通过 |

## 覆盖范围

- 11 个模块的导航与刷新；待办、日程、笔记、灵感、提示词、学习、月计划、工作日志、账目的主要操作。
- 320、390、768、1440px 宽度的导航、弹窗与横向溢出；浅色与深色主题。桌面和手机截图使用虚构数据，未写入用户资料。
- 本地持久化、JSON 导出及完整替换、取消恢复、损坏原文导出、未知字段、异常日期、重复 ID、数值边界与危险富文本。
- 存储配额失败时保留表单，笔记切换和纯格式修改保留草稿；日志防抖计时器清理、路由离开保存、失败草稿恢复及日期冲突拒绝。
- 旧页面覆盖检测、失败写入不发布新快照、事务成功后才提示完成；不完整交易记录与缺失行情不伪装成完整盈亏。
- 天气与新闻的确定性模拟和失败回退；默认不请求行情、GitHub API、云同步或模型推理服务，不执行远程行情脚本。
- Service Worker 实际激活、升级与离线重载；离线新增待办可持久化，只清理本项目旧缓存，保留其他应用缓存。

相关测试：[数据](../tests/data.test.js)、[存储](../tests/store.test.js)、[完整浏览器验收](../tests/browser/workbench.spec.js)、[安全与草稿回归](../tests/browser/safety-regressions.spec.js)、[工作记录回归](../tests/browser/work-regressions.spec.js)、[离线验收](../tests/browser/offline.spec.js)。

## 修复闭环

独立复查后，先复现问题，再补回归和修复，覆盖了新建第二篇笔记误选、笔记草稿丢失、保存失败关闭表单、工作日志旧计时器覆盖、日期编辑覆盖其他记录、灵感回车后列表不刷新、短暂误报学习完成、首页部分行情或不完整交易误汇总、未知路由空页等问题。

## 线上验收

- 应用代码版本：`04b23e3`。[GitHub 自动测试与 Pages 部署](https://github.com/jiaxuan-tao/vibe-coding-lab/actions/runs/38863039080)成功。
- 对[实际发布地址](https://jiaxuan-tao.github.io/vibe-coding-lab/personal-workbench/)重跑导航、刷新、待办保存、灵感回车、浅深色外观持久化，共 15/15 通过。测试使用独立浏览器上下文，不改用户已有内容。
- 直接打开工作台和实验室首页，确认新项目入口存在，线上 Service Worker 使用构建生成的版本号而非开发版本 `v1`。
- 未模拟网络的信息面板实测：热榜接口当前未能拉取，页面明确显示失败和备用新闻入口。未选择城市时提示手动选择，不读取设备位置；没有据此宣称天气或行情实网成功。

## 验证边界

- 自动化中的天气和热榜成功响应使用固定模拟数据，不代表外部接口持续可用；真实网络失败时应使用明确回退状态。行情跨域可能不可用，不保证实时性。
- 浏览器覆盖以 Chromium 为主，未宣称完整覆盖 Safari、Firefox 和所有移动系统。
- localStorage 的比较与写入不是原子事务，不能保证极端同时写入完全无覆盖；建议单标签页编辑。
- 失败草稿只保留在当前页面内存，不等于已持久化；浏览器强制关闭、崩溃或用户确认离开仍可能丢失未保存内容。
- 通过上述测试不等于不存在任何缺陷。未覆盖多设备同步、后台提醒、模型推理、复杂投资会计或不可信超大压缩表格的资源消耗。
