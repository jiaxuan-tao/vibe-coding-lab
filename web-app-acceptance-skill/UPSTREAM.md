# 上游来源与改造说明

## 上游项目

- 名称：`webapp-testing`
- 维护者：[Anthropic](https://github.com/anthropics)
- 来源：[anthropics/skills](https://github.com/anthropics/skills/tree/main/skills/webapp-testing)
- 许可证：Apache License 2.0

## 本版本的关系

本目录不是 Anthropic 的官方发布，也不将上游工作表述为完全原创。本版本参考上游的本地 Web 验收流程，针对 Codex 和中文用户进行了精简改造。

## 主要变化

- 使用中文触发描述、验收报告结构和浏览器检查清单。
- 不捆绑 Playwright 或服务器生命周期管理；默认使用零依赖 Python 标准库脚本做只读静态检查。
- 明确构建、静态检查、浏览器辅助验收和未覆盖风险的边界。
- 新增项目检测、静态引用检查及其自动化测试。

## 归属要求

分发本目录时请保留 `LICENSE.txt`、本来源说明及所有适用的归属信息。Apache-2.0 不授予使用 Anthropic 名称或商标来暗示背书的权利。
