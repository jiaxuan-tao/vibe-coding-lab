# 产品经理 AI 工作流 Skill 🚀

一套面向 Codex 的产品经理工作流，把需求洞察、PRD 与交互原型、功能验收和数据分析串成完整的交付过程。

它适合在 Vibe Coding 或日常产品工作中使用：从一句还不够清楚的需求开始，逐步补齐场景、范围、状态和指标，最后形成可以查看、修改和验收的实际文件。

[🛠️ 安装与使用](#️-安装与使用) · [🧭 四阶段工作流](#-四阶段工作流) · [✨ 核心能力](#-核心能力) · [🧩 应用案例](#-应用案例ta说纪念日新增流程) · [⚠️ 能力边界](#️-能力边界)

---

## 🎯 它解决什么问题

一个产品需求从想法走到上线，往往会在不同阶段出现信息断层：

- 需求只有一句功能描述，用户场景、真实问题和首版范围还没有说清楚；
- PRD 写了正常流程，却遗漏空状态、失败状态、权限限制和恢复方式；
- 文档、原型与流程图分开维护，修改后容易出现规则不一致；
- 功能完成后缺少逐项验收依据，只能依靠记忆检查；
- 上线后虽然拿到了数据，却没有提前说明指标口径和分析目标。

这个 Skill 把这些工作组织为一条可以重复执行的流程。每个阶段都有明确输入、输出和检查方式，也可以根据当前需求单独使用其中一个阶段。

## 🧭 四阶段工作流

| 阶段 | 主要工作 | 交付物 |
| --- | --- | --- |
| **1. 需求洞察** | 梳理目标用户、使用场景、问题、可能原因、价值和首版范围 | 需求洞察 HTML、待确认清单 |
| **2. PRD 与交互原型** | 明确目标、范围、功能规则、页面状态、异常情况和数据埋点 | HTML PRD、可点击原型、业务流程图、按需生成的交互流程图 |
| **3. 功能验收** | 从 PRD 拆解核心链路、功能点和异常分支，逐项记录验收状态 | 可交互验收清单 |
| **4. 数据分析** | 根据真实数据、指标口径和关注问题分析漏斗、趋势与分群 | 数据分析 HTML、洞察与行动建议 |

同一个需求会使用统一的需求目录和沟通记录，方便后续阶段继续读取前面的结论。信息不足时会标记为待确认；没有真实数据时，不会把模拟内容写成真实用户反馈或上线效果。

## ✨ 核心能力

- **结构化 PRD**：使用固定骨架组织背景、目标、范围、详细方案和数据埋点，并根据需求复杂度裁剪流程图、时序图等章节。
- **状态与边界补全**：将校验失败、保存失败、空状态、权限和恢复方式放回对应功能，避免只描述理想路径。
- **双栏原型预览**：左侧阅读 PRD，右侧查看对应界面；正文滚动时，原型预览会跟随切换。
- **文档直接编辑**：PRD 支持正文编辑、表格增删、撤销重做，以及保存后继续让 AI 同步原型和流程图。
- **一键复制全文**：复制 PRD 时可以把原型和流程图转换成内嵌图片，便于粘贴到其他文档系统。
- **原型与流程图导出**：交互原型、业务流程图和交互流程图可以通过本地服务导出高清 PNG。
- **验收状态管理**：验收清单支持通过、未通过和待验收状态，方便按链路逐项检查。
- **交付前校验**：内置 PRD 结构检查和完整性测试，减少章节、表格、编号和预览关联遗漏。

## 🛠️ 安装与使用

### 1. 安装到 Codex

先克隆仓库，再把完整 Skill 目录复制到 Codex 的个人 Skills 目录：

```bash
git clone https://github.com/jiaxuan-tao/vibe-coding-lab.git
mkdir -p "$HOME/.codex/skills/edu-pm-workflow"
cp -R vibe-coding-lab/pm-workflow-codex-skill/. \
  "$HOME/.codex/skills/edu-pm-workflow/"
```

复制完成后重新打开 Codex 任务，让 Skill 被发现。需要使用时，可以直接说：

```text
$edu-pm-workflow 帮我梳理这个需求，先完成需求洞察并列出待确认问题。
```

也可以直接指定某一个阶段：

```text
$edu-pm-workflow 根据已经确认的需求写一份 PRD，并生成交互原型。
$edu-pm-workflow 根据当前 PRD 生成一份功能验收清单。
$edu-pm-workflow 根据这份数据和指标口径完成上线效果分析。
```

建议同时提供需求背景、目标用户、现有流程、业务限制和数据定义。输入越具体，产出的内容越接近可以直接评审和交付的状态。

### 2. 初始化当前项目

第一次在某个项目中使用时，Skill 会自动调用安装器；也可以在项目根目录手动执行：

```bash
python3 ~/.codex/skills/edu-pm-workflow/scripts/initialize.py --project .
```

Windows 使用：

```bat
py -3 %USERPROFILE%\.codex\skills\edu-pm-workflow\scripts\initialize.py --project .
```

初始化会写入工作流说明、PRD 模板、本地导出服务和启动入口。重复执行时，运行文件会更新，用户改过的工作流说明会保留，新版本会放入 `.pm-workflow/updates/` 供对照。

### 3. 启动本地导出服务

- **macOS**：默认注册按需启动的 LaunchAgent。打开 PRD 或原型并点击导出时，服务会自动启动，空闲时不保留项目进程。
- **Windows**：双击项目根目录的 `启动原型导出服务.bat`，并在导出期间保持窗口打开。
- **手动启动**：macOS 可以双击 `启动原型导出服务.command`；两个平台也可以运行 `scripts/start_service.py`。

如果不希望初始化时注册 LaunchAgent，可以使用：

```bash
python3 ~/.codex/skills/edu-pm-workflow/scripts/initialize.py --project . --no-launcher
```

检查运行环境：

```bash
python3 scripts/start_service.py --doctor
```

Windows 对应命令为 `py -3 scripts\start_service.py --doctor`。

### 4. 卸载

只卸载某个 macOS 项目的自动启动能力：

```bash
bash scripts/install_launcher.sh --uninstall
```

这不会删除项目里的 PRD、原型、工作流或其他产物。要停用整个 Skill，可以从 Codex 的个人 Skills 目录移走 `edu-pm-workflow` 文件夹。项目文件可能已经被修改，因此当前不提供自动批量删除命令。

## 📦 产物如何组织

每个需求使用一个独立目录，自己的 PRD、原型、流程图、验收清单和分析报告放在一起：

```text
项目根目录/
├── [需求名称]/
│   ├── 需求挖掘/
│   ├── 需求文档/[需求名称]-PRD.html
│   ├── 原型/[需求名称]-prototype.html
│   ├── 原型截图/
│   ├── 流程图/
│   ├── 流程图截图/
│   ├── 验收清单/
│   ├── 数据分析/
│   └── 沟通记录.md
├── scripts/
├── .agents/workflows/
└── .pm-workflow/
```

工作流不会强制所有需求生成完全相同的文件。简单需求可以省略不必要的流程图或时序图，复杂需求则保留能够帮助理解状态和协作关系的内容。

## 🧩 应用案例：TA说纪念日新增流程

以“纪念日新增弹窗”为例，将名称或日期缺失、日期非法、保存失败等情况整理为明确的交互规则：校验或保存失败时保留输入，保存成功后关闭弹窗并更新列表。

围绕这一需求，工作流产出了 PRD、可点击原型、业务流程图和验收清单，并通过交互检查验证各份材料中的状态与规则是否一致。

[查看案例与交付物](examples/tasay-anniversary-modal/README.md)

案例根据项目中的真实问题整理，展示文件为后续制作的脱敏示例，不含真实用户数据。

## 📁 项目结构

```text
pm-workflow-codex-skill/
├── SKILL.md                         # Skill 入口与执行规则
├── README.md                        # 项目说明与使用方法
├── LICENSE.txt                     # MIT License
├── agents/openai.yaml              # Codex 显示信息与默认提示词
├── assets/
│   ├── workflows/                  # 四阶段工作流说明
│   ├── templates/                  # PRD 与绘图模板
│   ├── scripts/                    # 初始化后使用的运行文件
│   └── config/                     # 可选配置示例
├── scripts/                         # Skill 初始化入口
├── examples/                        # 脱敏案例与交付物
└── tests/                           # 完整性、文档与运行验证
```

## 🧪 本地验证

在 Skill 目录中运行：

```bash
python3 -m unittest discover -s tests -v
python3 assets/scripts/validate_prd.py \
  'examples/tasay-anniversary-modal/纪念日新增弹窗/需求文档/纪念日新增弹窗-PRD.html'
```

仓库已经在 macOS + Chrome 的隔离临时项目中检查过初始化、运行环境、本地截图、PRD 安全写回、复制与保存降级，以及 PRD 与原型的页面同步。可重现步骤和未覆盖项目见 [`tests/behavior/runtime-validation.md`](tests/behavior/runtime-validation.md)。

## ⚠️ 能力边界

- Skill 可以组织需求和产出交付物，但不能替代真实用户研究、业务判断和最终产品决策。
- 没有真实数据或明确口径时，需求洞察和数据分析中的结论必须标为假设或待确认。
- 自动校验主要检查文档结构和文件关联，不能证明需求本身正确，也不能代替人工评审和实际功能验收。
- 本地运行验证已覆盖 macOS + Chrome；Windows、Edge 和系统原生文件选择窗口尚未完成同等程度的实际操作验证。
- 本地导出服务只处理当前项目中的受支持文件，使用前仍应检查项目目录和输出位置。

## 📄 许可证

本 Skill 目录使用 [MIT 许可证](LICENSE.txt)，允许使用、修改、分发和商用；复制时须保留版权及许可声明。该许可证只适用于本目录，不改变 `vibe-coding-lab` 中其他项目的许可。
