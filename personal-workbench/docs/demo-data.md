# 演示数据说明

## 三类信息

| 类型 | 内容 | 日期与来源 |
| --- | --- | --- |
| 虚构工作场景 | 知识库问答助手的待办、日程、月计划、日志、笔记、灵感、提示词与学习 | 初次进入以打开当天为锚点，后续按日历平移；不代表作者真实职业经历 |
| 模拟财务 | 收支、ETF 买卖与参考价格 | 用于复算分类、平均成本和盈亏，非市场数据或投资建议 |
| 公开资料快照 | 武汉天气、官方 AI 产品公告 | 固定在实际采集日期，不随演示时间变动 |

演示键为 `vcl.personal-workbench.demo.v1`，个人数据键仍为 `vcl.personal-workbench.data.v1`。只有 URL 明确包含 `?demo=1` 时启用演示；导航保留查询参数。切换空间完整重载，避免编辑器草稿或进行中的请求进入另一空间。首次进入不覆盖个人数据，首次编辑才持久化演示种子。

示例工作数据由 [demo.js](../js/demo.js) 生成并通过与个人数据相同的严格校验。`meta.device` 中的 `demo-v1:YYYY-MM-DD` 是演示日期锚点；没有此标记的导入备份不会自动平移。日程、任务、日志和模拟交易按天平移；账目和月计划按月份调整，防止跨月后本月汇总变空。公开快照单独存放于 [public-snapshot.js](../js/public-snapshot.js)。

## 公开资料

以下正文均于 **2026-10-29（Asia/Shanghai）** 打开核验。发布日期不等于采集日期；独立“观察”不是官方结论，也不是能力效果验证。公告中的预览和逐步推出状态按原文当时情况记录，不推断当前所有账号均可用。

| 发布日期 | 来源 | 内容 |
| --- | --- | --- |
| 2026-10-28 | GitHub Changelog | [Copilot 共享自动化](https://github.blog/changelog/2026-10-28-build-shared-workflows-for-your-team-with-copilot-automations/) |
| 2026-10-26 | GitHub Changelog | [Copilot 辅助权限正式可用](https://github.blog/changelog/2026-10-26-github-copilot-assisted-permissions-generally-available/) |
| 2026-10-20 | Cursor Changelog | [Agent SDK](https://cursor.com/changelog/agent-sdk) |
| 2026-09-25 | Microsoft Blog | [Home、Code 与 Autopilot 公告](https://blogs.microsoft.com/blog/2026/09/25/introducing-the-new-copilot-with-home-code-and-autopilot/) |
| 2026-03-17 | Google Blog | [Gemini 工具组合与上下文更新](https://blog.google/innovation-and-ai/technology/developers-tools/gemini-api-tooling-updates/) |

没有把以上条目统一包装成“今日发布”。更新资料时需要重新打开原始页面，核对发布日期、可用范围、摘要与链接，再修改采集日期；不能只改日期使旧资料看似实时。

## 武汉天气

- 来源：[Open-Meteo API](https://open-meteo.com/en/docs)。请求坐标为 `30.5928, 114.3055`；接口返回对应网格 `30.615112, 114.27562`。
- 采集日期：2026-10-29。接口 `current.time`：`2026-10-29T01:30`，时区 `Asia/Shanghai`、UTC+8。
- 当时模型值：气温 16.5°C、湿度 87%、风速 4.3 km/h、WMO 天气代码 3（阴）。这是模型数据，不标为气象站实测。
- 三天预报日期为 2026-10-29 至 2026-10-31。页面保留具体日期，不把第一项永远叫“今天”。
- [原请求 URL](https://api.open-meteo.com/v1/forecast?latitude=30.5928&longitude=114.3055&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset&timezone=Asia%2FShanghai&forecast_days=3) 会返回访问时的数据，不保证重现旧值；原采集值与单位已保存在静态模块中。

## 核查与复算

1. `npm test` 校验种子结构、跨日/跨月/跨年/闰日、隔离存储与错误状态。
2. `npm run test:browser` 验证真实 DOM 的编辑与联动、备份、重置、布局及 Service Worker 离线重载。
3. 全部演示模块可在拦截所有外部请求时显示，不把网络失败伪装成采集成功。
4. 更新快照必须保留来源和真实时间，不向个人空间注入模拟报价。
