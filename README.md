# Vibe Coding Lab｜轻量项目实验室 🚀

这是一个用于整理个人 Vibe Coding 轻量项目的实验仓库。

这里集中记录通过 Vibe Coding 完成或推进的 Web 应用、桌面工具、提示词资料库和 Codex Skill，包括产品定位、用户场景、核心功能、交互流程、Prompt 设计、开发记录和迭代思考。

当前阶段先搭建基础结构，后续会随着具体项目推进逐步补充内容。

---

## Projects

- [Prompt Library 提示词资料库](vibe-coding-prompt-library/README.md)
  面向 Vibe Coding 工作流的本地化提示词模板库，用于整理和复用 PRD、Codex 指令、UI 修改、Debug 和项目文档提示词。
  [在线体验](https://jiaxuan-tao.github.io/vibe-coding-lab/vibe-coding-prompt-library/)

- [Prompt Manager 提示词管理器](prompt-manager/README.md)
  纯本地、离线可用的提示词资产管理工具，支持场景、提示词、版本、标签和 JSON 数据流转。
  [在线体验](https://jiaxuan-tao.github.io/vibe-coding-lab/prompt-manager/)

- [Poker EV Coach 德扑决策助手](poker-ev-coach/README.md)
  面向德州扑克单手牌复盘的轻量 Web 工具，通过随机模拟比较 Equity、Pot Odds 与 Call EV，并解释行动建议。
  [在线体验](https://jiaxuan-tao.github.io/vibe-coding-lab/poker-ev-coach/)

- [Quota Float Native 额度悬浮窗](quota-float-native/README.md)
  macOS 原生风格的 Codex 额度悬浮窗，记录从开源基础能力、界面重构到真实桌面环境修复的 Vibe Coding 实践。
  [下载 macOS 版](https://github.com/jiaxuan-tao/vibe-coding-lab/releases/download/quota-float-native-v0.1.2/quota-float-native-macos-universal-unsigned.zip)

- [AI 热点采集 Skill](ai-topic-collector-skill/README.md)
  面向 Codex 的 AI 热点采集流程，支持手动触发，也可以结合定时任务自动整理近 24 小时的 AI 动态。

- [Web 交付风险评审 Skill](web-app-acceptance-skill/README.md)
  面向 Codex 的中文发布决策流程，以关键用户路径、实际证据、风险分级和未覆盖范围给出可发布、有条件发布或不建议发布的建议。

- [PRD 需求决策评审 Skill](prd-decision-review-skill/README.md)
  面向 Codex 的中文需求决策流程，区分证据、假设与待确认事项，收敛 MVP 范围，并给出可进入设计、有条件进入或暂不建议推进的 Gate 结论。

- [用户反馈洞察 Skill](user-feedback-insight-skill/README.md)
  面向 Codex 的证据驱动反馈分析流程，将访谈、工单、问卷和评论整理为可追溯的产品问题、矛盾与验证机会。

- [电脑文件整理 Skill](computer-file-organizer-skill/README.md)
  面向 Codex 的安全文件整理流程，先预览下载、桌面或指定文件夹的分类与重复项，确认后执行，并支持不覆盖的撤销。

- [What to Eat｜今天吃什么](what-to-eat/README.md)
  帮你结束点餐纠结的趣味食堂转盘，支持直接抽一道菜、按菜系逐层选择、快速筛选和个人菜库。
  [在线体验](https://jiaxuan-tao.github.io/vibe-coding-lab/what-to-eat/)

- [Pool Chase Score 台球追分计分台](pool-chase-score/README.md)
  供 2–6 名球友共用一台手机的实时追分工具，支持自定义规则、联动计分、跨局累计、误操作修正和本地历史。
  [在线体验](https://jiaxuan-tao.github.io/vibe-coding-lab/pool-chase-score/)

---

## Repository Structure｜仓库结构 📂

- 根目录项目文件夹
  每个可独立体验的产品或工具使用一个同级文件夹，例如 `vibe-coding-prompt-library/`、`prompt-manager/`、`poker-ev-coach/`、`quota-float-native/`、`ai-topic-collector-skill/`、`web-app-acceptance-skill/`、`prd-decision-review-skill/`、`user-feedback-insight-skill/`、`computer-file-organizer-skill/`、`what-to-eat/` 和 `pool-chase-score/`。

- `projects/`
  用于维护项目目录说明和后续归档信息。

- `templates/`
  用于存放项目文档模板，包括 README、PRD、用户流程、产品结构、Prompt 和迭代记录模板。

- `assets/`
  用于存放项目截图、流程图、原型图或其他展示素材。

---

## What This Repository Focuses On｜本仓库关注什么 🧭

- AI Product Thinking｜AI 产品思考
- Vibe Coding Practice｜Vibe Coding 实践
- Product Requirement Documents｜产品需求文档
- 用户流程设计
- Prompt Design｜Prompt 设计
- Product Iteration｜产品迭代记录

---

## Note｜说明 📝

本仓库用于记录个人 Vibe Coding 与产品实践过程。
内容会持续更新，重点不只是展示最终结果，也包括产品想法、需求拆解、功能设计和迭代过程。
