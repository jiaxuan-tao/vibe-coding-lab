// Verified on 2026-10-29. Publication dates and model-weather time are immutable.
export const publicSnapshot = {
  collectedOn: '2026-10-29',
  timezone: 'Asia/Shanghai',
  articles: [
    {
      id: 'shared-automations', title: 'Copilot 自动化从个人任务走向团队共享',
      source: 'GitHub Changelog', publishedOn: '2026-10-28', category: '团队协作',
      summary: '共享自动化正逐步推出：工作流归属仓库，成员按仓库权限查看或编辑，费用由仓库所有者承担。创建者离队后，仓库中的自动化仍可继续运行。',
      observation: '个人自动化变成团队资产后，需要重新设计所有权、费用归属和交接机制。',
      url: 'https://github.blog/changelog/2026-10-28-build-shared-workflows-for-your-team-with-copilot-automations/',
    },
    {
      id: 'assisted-permissions', title: 'Copilot 辅助权限正式可用',
      source: 'GitHub Changelog', publishedOn: '2026-10-26', category: 'Agent 权限',
      summary: '辅助权限模式在 Copilot CLI、桌面应用和 VS Code 正式可用。模型将请求判断为明确安全时自动继续，其他请求仍需人工批准；企业可配置允许的模式。',
      observation: '自动批准与人工确认如何分工？模型判断安全不等于操作绝对安全。',
      url: 'https://github.blog/changelog/2026-10-26-github-copilot-assisted-permissions-generally-available/',
    },
    {
      id: 'cursor-sdk', title: 'Cursor 发布 Agent SDK',
      source: 'Cursor Changelog', publishedOn: '2026-10-20', category: '开发工具',
      summary: 'Agent SDK 把提示、工具和技能组织为代码项目，支持本地运行、持续集成评测以及部署到 Cursor 或自有基础设施。真实事件可重放为评测输入。',
      observation: '评测是否覆盖工具选择与参数，而不只是最终答案？同一项目能否跨环境部署？',
      url: 'https://cursor.com/changelog/agent-sdk',
    },
    {
      id: 'copilot-home', title: '微软提出 Home、Code 与 Autopilot 统一入口',
      source: 'Microsoft Blog', publishedOn: '2026-09-25', category: 'AI 办公',
      summary: '微软公布新版 Copilot，将对话、委派工作、应用构建和持续代理整合。公告中部分能力计划分阶段推出，Autopilot 扩大私人预览，不能视为全部可用。',
      observation: '统一入口怎样区分即时问答与长任务？持续代理如何交代身份、权限和任务状态？',
      url: 'https://blogs.microsoft.com/blog/2026/09/25/introducing-the-new-copilot-with-home-code-and-autopilot/',
    },
    {
      id: 'gemini-tools', title: 'Gemini API 组合内置工具与自定义函数',
      source: 'Google Blog', publishedOn: '2026-03-17', category: '工具编排',
      summary: 'Gemini API 允许在同一请求中组合搜索等内置工具和自定义函数，并在工具调用间传递上下文。新增调用标识，便于关联并行调用和对应响应。',
      observation: '公开信息检索接业务操作时，仍需考虑调用追踪、权限边界和失败恢复。',
      url: 'https://blog.google/innovation-and-ai/technology/developers-tools/gemini-api-tooling-updates/',
    },
  ],
  weather: {
    city: '武汉', cityId: 'wuhan', collectedOn: '2026-10-29',
    source: 'Open-Meteo',
    sourceUrl: 'https://api.open-meteo.com/v1/forecast?latitude=30.5928&longitude=114.3055&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset&timezone=Asia%2FShanghai&forecast_days=3',
    raw: {
      latitude: 30.615112, longitude: 114.27562, utc_offset_seconds: 28800, timezone: 'Asia/Shanghai', elevation: 15,
      current_units: { time: 'iso8601', interval: 'seconds', temperature_2m: '°C', relative_humidity_2m: '%', apparent_temperature: '°C', is_day: '', precipitation: 'mm', weather_code: 'wmo code', wind_speed_10m: 'km/h' },
      current: { time: '2026-10-29T01:30', interval: 900, temperature_2m: 16.5, relative_humidity_2m: 87, apparent_temperature: 17.3, is_day: 0, precipitation: 0, weather_code: 3, wind_speed_10m: 4.3 },
      daily_units: { time: 'iso8601', weather_code: 'wmo code', temperature_2m_max: '°C', temperature_2m_min: '°C', precipitation_probability_max: '%', sunrise: 'iso8601', sunset: 'iso8601' },
      daily: {
        time: ['2026-10-29', '2026-10-30', '2026-10-31'], weather_code: [51, 45, 3],
        temperature_2m_max: [19.9, 22.7, 26], temperature_2m_min: [15.7, 13.5, 17.6], precipitation_probability_max: [39, 2, 12],
        sunrise: ['2026-10-29T06:34', '2026-10-30T06:35', '2026-10-31T06:36'],
        sunset: ['2026-10-29T17:37', '2026-10-30T17:37', '2026-10-31T17:36'],
      },
    },
  },
};
