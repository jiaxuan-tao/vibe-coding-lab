# Web 应用验收 Skill

这是一个面向 Codex 的中文交付前验收 Skill。它用流程指导浏览器辅助检查，并提供两个零依赖、只读的 Python 脚本，用于识别项目构建信息和检查静态站点的本地链接、资源引用。

## 能做什么

- 识别 `package.json`、包管理器、可用脚本和候选构建目录
- 在项目依赖已经就绪时，指导执行已有构建命令并记录结果
- 检查静态 HTML 中失效的本地页面链接和资源引用
- 组织关键交互、控制台、响应式和异常状态的浏览器辅助验收
- 明确输出通过、失败、跳过项与剩余风险

## 安装

需要先安装 Codex：

```bash
mkdir -p ~/.codex/skills/web-app-acceptance
curl -sL https://raw.githubusercontent.com/jiaxuan-tao/vibe-coding-lab/main/web-app-acceptance-skill/SKILL.md \
  > ~/.codex/skills/web-app-acceptance/SKILL.md
```

如需使用脚本、参考清单和许可证，请复制完整目录而不是只复制 `SKILL.md`。

## 使用示例

在 Codex 中提出：

- `验收这个 Web 项目`
- `发布前检查当前网页`
- `检查构建和失效链接`
- `验证这个页面的关键交互和移动端表现`

脚本也可以独立运行：

```bash
python3 scripts/inspect_web_project.py /path/to/project
python3 scripts/check_static_site.py /path/to/project/dist
```

第二个命令在发现缺失本地页面或资源时会返回退出码 1，适合接入已有的 CI 检查；它不会验证动态路由、外链或业务逻辑。

## 边界

该 Skill 不安装依赖、不改写被验收项目、不启动长期服务，也不代替端到端测试、人工产品验收或安全审计。没有实际执行的检查必须作为“跳过”或“未覆盖风险”报告。

## 来源与许可

本项目参考并改造了 [Anthropic 的 webapp-testing Skill](https://github.com/anthropics/skills/tree/main/skills/webapp-testing)。原版侧重 Playwright 本地浏览器自动化；本版本面向 Codex 做了中文化和低依赖改造，新增了静态检查脚本与明确的验收报告边界。

保留的上游内容及本目录发布均遵循 Apache-2.0，完整文本见 [LICENSE.txt](LICENSE.txt)，详细归属见 [UPSTREAM.md](UPSTREAM.md)。Anthropic 是其商标和相关名称的权利人；本项目不暗示官方关联或背书。
