# 上游来源与参考说明

## GitHub Spec Kit

- 项目：[github/spec-kit](https://github.com/github/spec-kit)
- 许可证：MIT
- 核对文件：[`templates/spec-template.md`](https://github.com/github/spec-kit/blob/main/templates/spec-template.md)
- 参考范围：按优先级组织用户场景、说明可独立测试的价值、使用 GIVEN / WHEN / THEN 验收场景、定义可衡量结果，以及对假设的显式记录。

## OpenSpec

- 项目：[Fission-AI/OpenSpec](https://github.com/Fission-AI/OpenSpec)
- 许可证：MIT
- 核对文件：[`schemas/spec-driven/schema.yaml`](https://github.com/Fission-AI/OpenSpec/blob/main/schemas/spec-driven/schema.yaml)
- 参考范围：先用 proposal 对齐变更意图、能力范围与影响，再描述用户或下游系统可观察的需求；当前 schema 使用 WHEN / THEN 场景，并要求任务足够小且可验证。

## 本项目的实现策略

本目录采用聚焦的轻量重实现（focused reimplementation），将适用于产品需求判断的原则重新组织为中文 Codex Skill：

- 从“编写规格”进一步收敛为“判断一个需求是否具备进入设计的条件”；
- 建立用户问题、证据、目标、MVP、流程、指标、验收与 Gate 之间的决策链；
- 提供中文评审口径、三种推进结论、只读结构检查脚本和自动测试；
- 不复制、安装或捆绑 GitHub Spec Kit 与 OpenSpec 的 CLI、运行时代码、模板目录或完整工程工作流。

这里记录的是思想与方法层面的参考关系，不将上游工作表述为本项目自有方法。若后续实质复用任一上游的代码或文本，分发时还应保留对应文件中的原始版权与 MIT 许可声明。

## 分发要求

本项目按 [MIT License](LICENSE.txt) 发布。分发本目录时请保留 `LICENSE.txt`、本来源说明及所有适用的上游归属信息。本项目不暗示 GitHub、Fission AI 或相关维护者对其提供官方关联或背书。
