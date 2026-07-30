# 电脑文件整理 Skill

一个面向 Codex 的安全文件整理工具，用于整理下载、桌面或用户明确指定的文件夹。它会先扫描目录并生成可检查的整理计划，只有获得确认后才移动文件；每次执行都保留操作清单，可以在不覆盖现有文件的前提下撤销。

它解决的不是“让 AI 随便帮我挪文件”，而是一个更具体的问题：**怎样让 AI 参与电脑文件整理，同时避免误删、覆盖、越界扫描和无法恢复？**

[🧭 使用方法](#-使用方法) · [🛡️ 安全模型](#️-安全模型) · [🧾 输出示例](#-输出示例) · [✨ 核心能力](#-核心能力) · [⚠️ 能力边界](#️-能力边界)

---

## 🎯 它解决什么问题

下载和桌面目录很容易积累文档、截图、安装包、压缩包和临时文件。手工整理并不困难，但需要反复判断文件类型、创建目录、处理同名文件、检查重复副本，并承担移动错误后的恢复成本。

直接让 AI 执行一组 `mv` 命令也有明显风险：

- 用户还没看清方案，目录已经被改变；
- 同名目标可能被覆盖，或者每次临时采用不同的命名规则；
- 相同文件名被误判为重复，真正相同的文件反而没有验证；
- 执行到一半失败，却只返回一句“整理完成”；
- 没有完整记录，事后很难把文件放回原处；
- “整理下载目录”被扩大成扫描整个主目录。

这个 Skill 将整理过程设计为一个有边界的变更流程：

```text
明确目录
  → 只读扫描
  → 生成 JSON 计划
  → 展示分类、重复和冲突
  → 用户明确确认
  → 执行移动
  → 保存 manifest
  → 按需撤销
```

核心原则是：**先预览，再执行；不删除，不覆盖，可撤销。**

## 🛡️ 安全模型

### 1. 计划与执行分离

`plan` 只读取目标目录，计划文件必须保存在目标目录之外。它不会提前创建分类目录，也不会移动或重命名文件。

`apply` 必须显式携带 `--confirm`。即使用户一开始说“别问，直接整理”，Codex 也必须先展示计划；对 Skill 方向的确认不能替代对某次真实文件移动的授权。

计划文件本身也使用独占创建：如果 `--output` 指向的文件已经存在，脚本会报错并保留原内容，不会用新计划覆盖其他文件。

### 2. 范围不会自动扩大

- 一次只处理一个明确目录；
- 默认只检查顶层文件；
- 递归扫描必须显式开启；
- 拒绝文件系统根目录和用户主目录；
- 忽略隐藏文件、符号链接、现有目录和已经整理过的分类目录。

### 3. 精确重复，而不是猜重复

脚本先按文件大小缩小候选范围，再对同尺寸文件计算 SHA-256。只有内容哈希完全相同才是精确重复。

默认计划只报告重复组，组内所有文件都保持原位。只有用户明确选择后，`--include-duplicates` 才会把每组除保留项之外的副本加入 `待确认重复文件/` 移动计划；保留项再按普通类型归类。任何模式都不会删除文件。

### 4. 执行前再次核对

计划会记录源文件大小和修改时间。执行时如果文件已经改变、消失或变成符号链接，该项会失败，不会继续猜测。目标路径已存在时也会拒绝覆盖。

### 5. 部分失败可见

每一项移动单独记录成功或失败。只要存在失败，结果就会明确标记为“部分完成”，同时仍保存已经成功移动的 manifest，方便用户撤销。

### 6. 撤销同样不覆盖

撤销按执行清单的反序进行。如果原路径后来出现了新文件，撤销会保留当前状态并报告冲突，不会为了恢复旧文件而覆盖新文件。

## 🧭 使用方法

按照仓库现有 Skill 的安装方式，将完整目录复制到用户级 Skills 目录：

```bash
git clone https://github.com/jiaxuan-tao/vibe-coding-lab.git
mkdir -p "$HOME/.agents/skills/computer-file-organizer"
cp -R vibe-coding-lab/computer-file-organizer-skill/. \
  "$HOME/.agents/skills/computer-file-organizer/"
```

请复制完整目录，因为 `SKILL.md` 会读取分类规则并调用计划、执行与撤销脚本。安装后重新打开 Codex 任务，让 Skill 被发现。

部分仍使用旧版发现机制的 Codex 构建会扫描 `$CODEX_HOME/skills`；未设置 `CODEX_HOME` 时通常对应 `$HOME/.codex/skills`。只有确认当前构建未发现 `.agents/skills` 中的 Skill 时，才将完整目录复制到 `$CODEX_HOME/skills/computer-file-organizer`。

安装后可以提出：

- `帮我整理下载文件夹，先给我看计划，不要直接移动`
- `桌面文件太乱了，按类型整理一下`
- `检查这个文件夹里有没有完全重复的文件`
- `把下载目录顶层的文档、图片、安装包和压缩包分开`
- `撤销刚才那次文件整理`

“电脑文件整理”不是邮件收件箱。整理邮箱、邮件分类和收取邮件不会触发这个 Skill。

### 直接运行脚本

生成只读计划：

```bash
cd vibe-coding-lab/computer-file-organizer-skill
python3 scripts/organize_files.py plan "/path/to/folder" \
  --output "/tmp/file-organization-plan.json"
```

包括子目录：

```bash
python3 scripts/organize_files.py plan "/path/to/folder" \
  --output "/tmp/file-organization-plan.json" \
  --recursive
```

把精确重复副本加入待确认移动计划：

```bash
python3 scripts/organize_files.py plan "/path/to/folder" \
  --output "/tmp/file-organization-plan.json" \
  --include-duplicates
```

查看计划并获得用户明确确认后执行：

```bash
python3 scripts/organize_files.py apply \
  "/tmp/file-organization-plan.json" --confirm
```

按执行结果返回的 manifest 撤销：

```bash
python3 scripts/organize_files.py undo \
  "/path/to/.file-organizer-history/manifest.json" --confirm
```

## 🧾 输出示例

计划阶段会返回机器可读摘要：

```json
{
  "plan": "/tmp/file-organization-plan.json",
  "eligible_files": 18,
  "total_bytes": 47291013,
  "planned_moves": 12,
  "unclassified": 4,
  "skipped": 2,
  "duplicate_groups": 1,
  "category_counts": {
    "图片": 4,
    "安装包": 2,
    "文档": 6
  }
}
```

Codex 会结合完整计划向用户说明：

```text
目标：下载目录顶层
计划移动：12 个文件
- 文档：6
- 图片：4
- 安装包：2

保持原位：4 个无法识别类型
发现精确重复：1 组
保持原位的重复组文件：2 个
本次只报告重复组，组内文件均未加入移动操作

计划文件：/tmp/file-organization-plan.json
是否按该计划执行？
```

执行后返回：

```json
{
  "moved": 12,
  "skipped": 0,
  "failed": 0,
  "failures": [],
  "manifest": "/path/to/folder/.file-organizer-history/20260730T103000Z-a1b2c3d4.json"
}
```

如果 `failed` 不为零，Codex 必须说明为“部分完成”，并解释哪些源文件发生变化、哪些目标路径已被占用或哪些操作无法执行。

## ✨ 核心能力

- 把高风险的文件写操作拆成只读计划和确认后执行两个阶段。
- 使用保守、透明的扩展名分类，不臆测文件属于工作、个人或具体项目。
- 通过“文件大小 → SHA-256”两阶段查重，减少不必要的哈希计算。
- 默认只报告重复组；用户确认后，非保留副本移到待确认目录，保留项再按普通类型归类，任何模式都不删除。
- 在计划阶段解决同名冲突，执行阶段再次拒绝任何覆盖。
- 通过已验证的目录句柄执行原子硬链接与源目录项删除，既不覆盖同名目标，也不会因为复制丢失 macOS 扩展属性、Finder 标签或 ACL。
- 在删除源目录项前再次确认源目录和目标目录仍连接在目标根目录内，检测目录被并发替换或移走的情况。
- 检测计划生成后发生变化的源文件，避免执行过期计划。
- 首次移动前创建 write-ahead JSON manifest，逐项记录 `pending`、`moving`、`moved` 或 `failed`，并提供反序撤销；撤销也会协调异常中断留下的 `moving` 项。
- 撤销前复核目标文件大小与 SHA-256，避免把后来替换的无关文件移回原路径。
- 在部分失败时保留真实执行证据，不用笼统成功文案掩盖异常。
- 拒绝主目录、根目录、符号链接和隐式递归，控制 Agent 的操作半径。
- 仅使用 Python 标准库，支持提供目录句柄操作的 macOS 与 Linux Python 环境。

## 🧪 本地验证

运行全部自动测试：

```bash
cd vibe-coding-lab/computer-file-organizer-skill
python3 -m unittest discover -s tests -p 'test_*.py' -v
```

测试全部在临时目录中运行，不读取或修改用户真实的下载、桌面和文档目录。覆盖范围包括：

- 分类、未识别类型、隐藏文件、符号链接和递归边界；
- 精确重复检测与重复文件处理的显式开关；
- 计划阶段只读；
- 缺少确认时拒绝执行；
- 计划路径越界和计划生成后文件变化；
- 同名目标不覆盖；
- 分类目录和历史目录的符号链接替换竞态；
- 原子移动对 inode 与扩展属性的保留；
- 执行清单、成功撤销和撤销路径冲突；
- 异常中断后 `moving` 状态的恢复；
- Skill 触发边界、文档链接、来源许可和仓库集成。

运行官方 Skill 结构校验：

```bash
python3 /path/to/skill-creator/scripts/quick_validate.py \
  computer-file-organizer-skill
```

## 🛠️ 技术实现

- **工作流约束**：[`SKILL.md`](SKILL.md) 定义作用范围、计划展示、确认门槛、结果报告和撤销条件。
- **确定性执行**：[`scripts/organize_files.py`](scripts/organize_files.py) 提供 `plan`、`apply` 和 `undo` 三个子命令。
- **整理规则**：[`references/file-organization-policy.md`](references/file-organization-policy.md) 记录默认分类、扫描边界、重复判定和计划检查要求。
- **行为证据**：[`tests/baseline-evaluation.md`](tests/baseline-evaluation.md)、[`tests/trigger-evaluation.md`](tests/trigger-evaluation.md) 和 [`tests/forward-evaluation.md`](tests/forward-evaluation.md) 记录无 Skill 基线、选择边界和临时目录前向测试。
- **自动测试**：`unittest` 使用真实临时文件验证读写行为，不通过 mock 假装文件系统操作成功。

### 项目结构

```text
computer-file-organizer-skill/
├── SKILL.md
├── README.md
├── UPSTREAM.md
├── LICENSE.txt
├── agents/
│   └── openai.yaml
├── references/
│   └── file-organization-policy.md
├── scripts/
│   └── organize_files.py
└── tests/
    ├── baseline-evaluation.md
    ├── trigger-evaluation.md
    ├── forward-evaluation.md
    └── test_*.py
```

## 🧠 产品设计

这个项目的重点不是扩充更多分类，而是设计 Agent 执行真实电脑操作时的信任机制。

### 把“确认”放在正确的位置

如果每移动一个文件都询问一次，用户会被频繁打断；如果完全不询问，风险又不可接受。因此交互采用“整批预览、一次确认、逐项留痕”：用户只需要做一次方向级确认，但确认时已经能看到完整影响范围。

### 把安全从文案变成程序约束

“请谨慎操作”无法保证执行安全。这个 Skill 将关键规则放进脚本：

- 没有 `--confirm` 就不能执行；
- 计划路径越界就整批拒绝；
- 文件发生变化就跳过该项；
- 目标存在就拒绝覆盖；
- 历史目录异常就会在首次移动前停止；
- 没有 manifest 或文件身份不一致就无法自动撤销。

这些约束即使在用户催促、上下文缩短或 Agent 更换后仍然成立。

### 保留不确定性

扩展名只能说明文件格式，不能可靠判断业务归属。因此首版不自动区分工作与个人、不根据名字判断文件“过期”，也不提供智能删除建议。无法确定的文件保持原位，比看似聪明但错误的整理更有价值。

### 为失败设计，而不只为成功设计

文件系统可能在计划和执行之间发生变化。实现没有追求虚假的“整批原子性”，而是通过目录句柄约束单次移动、在删除源路径前写入 `moving` 状态，并记录每个成功和失败项。即使进程在移动后、状态更新前中断，撤销也会根据源路径、目标路径、大小和 SHA-256 协调恢复。

## ⚠️ 能力边界

- 它整理一个明确目录，不是邮件管理、全盘搜索、磁盘清理或备份工具。
- 它不会删除文件、清空待确认目录或判断哪些内容“没用了”。
- 默认分类依据扩展名，不读取文档正文、图片内容或业务语义。
- SHA-256 相同表示文件字节完全一致，不代表两个副本在业务上没有分别保留的意义。
- 递归整理可能改变子目录中的文件位置，因此必须由用户明确开启。
- 执行依赖同文件系统硬链接；如果递归扫描进入了其他挂载点，对应操作会失败并保留源文件。
- 当前执行器面向 macOS 与 Linux；未提供目录句柄能力的 Python/Windows 环境只适合阅读计划，不应执行移动。
- 撤销只恢复 manifest 记录的成功移动，不删除后来创建的空分类目录。
- 计划阶段和执行阶段之间修改文件，会导致对应操作失败；需要重新生成计划。
- 脚本降低误操作风险，但不能替代重要资料的正式备份。
- 它防护误操作和常见目录竞态，但不是针对拥有同目录写权限、持续恶意竞争每个系统调用的本地进程所设计的安全隔离边界。

## 🤖 AI 辅助开发说明

本项目通过 Vibe Coding 方式完成。作者负责定义用户场景、安全模型、确认机制、分类边界、重复文件策略、失败状态、撤销协议和验收标准；Codex 用于协助实现安全执行脚本、自动测试和文档。

产品判断集中在“Agent 应该在什么时候自主行动，什么时候必须停下来让用户确认”。首版主动放弃自动删除、语义分类和后台监控，把能力控制在高频、可理解、可恢复的文件移动范围内。

## 📚 参考与许可

产品方向参考了 [CommandCodeAI/agent-skills 的 file-organizer](https://github.com/CommandCodeAI/agent-skills/tree/main/skills/file-organizer)：理解目标目录、识别文件类型与重复项、先提出整理方案、确认后移动，并记录操作。

本目录采用聚焦式重实现，没有复制或捆绑上游的 SKILL 文本、shell 命令和示例。这里进一步增加了 Python 标准库执行器、只读计划、计划完整性检查、精确重复判定、同名保护、源文件状态复核、部分失败清单和可执行撤销。完整来源与差异说明见 [`UPSTREAM.md`](UPSTREAM.md)。

本项目按 [`MIT License`](LICENSE.txt) 发布。上游项目也采用 MIT License；分发或改造时请保留本目录的许可证、来源说明，以及任何实际复用材料所要求的原始版权与许可声明。本项目不暗示与 CommandCodeAI 或上游维护者存在官方关联或背书。
