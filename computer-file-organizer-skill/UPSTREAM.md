# 上游来源与参考说明

## CommandCodeAI/agent-skills

- 项目：[CommandCodeAI/agent-skills](https://github.com/CommandCodeAI/agent-skills)
- 参考 Skill：[file-organizer](https://github.com/CommandCodeAI/agent-skills/tree/main/skills/file-organizer)
- 许可证：MIT
- 核对时间：2026-07-30
- 参考范围：明确整理范围、分析文件类型与重复项、在操作前提出计划、确认后移动文件、记录移动以便恢复。

## 本项目的实现策略

本目录采用聚焦式重实现（focused reimplementation），没有复制、修改或捆绑上游 SKILL 文本、shell 命令、示例或其他运行时代码。

上游提供的是面向通用 Agent 的流程说明。本项目围绕“一个明确文件夹的安全整理”重新定义了产品和技术边界：

- 把扫描与执行拆成独立的 `plan`、`apply` 和 `undo` 命令；
- 计划文件必须位于目标目录之外，保证扫描阶段零写入；
- 以 Python 标准库替代依赖 GNU `find -printf`、`md5` 等平台差异明显的命令；
- 默认只处理顶层普通文件，拒绝根目录、用户主目录、隐藏文件和符号链接；
- 先按大小分组，再用 SHA-256 判定精确重复；
- 重复文件默认整组保持原位；用户明确选择后，非保留副本移到待确认目录，保留项按普通类型归类；
- 计划阶段生成无冲突目标名，执行阶段再次拒绝覆盖；
- 通过目录句柄与同文件系统原子硬链接执行移动，保留 inode、扩展属性与 ACL，并检测分类目录或历史目录被替换；
- 执行前核对文件大小和修改时间，避免使用过期计划；
- 每次执行保存机器可读 write-ahead manifest，支持中断状态协调和不覆盖的反序撤销；
- 对部分失败保留逐项记录，不宣称整批成功。

这些能力是本项目新增的聚焦实现，不将上游工作表述为本项目原创，也不暗示与上游存在官方关联。

## 许可关系

本项目自身代码与文档按 [MIT License](LICENSE.txt) 发布。由于没有复制上游代码或文本，本目录的 `LICENSE.txt` 记录本项目版权；`UPSTREAM.md` 保留思想与产品方向层面的来源说明。

如果后续实质复用上游文件，应同时保留对应文件中的原始版权声明与 MIT 许可文本，并在本文件中更新复用范围。
