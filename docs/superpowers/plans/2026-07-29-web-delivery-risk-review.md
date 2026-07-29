# Web 交付风险评审重构实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use inline execution task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将现有验收 Skill 和 README 升级为以关键路径、风险分级和发布建议为核心的 Web 交付风险评审工具。

**Architecture:** 保持两个只读脚本不变，将 `SKILL.md` 改为“范围 → 证据 → 风险 → 发布建议”的编排层；将 README 改为完整的产品说明，并以结构测试证明叙事与实际机制对应。

**Tech Stack:** Markdown、Python 3 标准库、unittest、Git。

## Global Constraints

- 不引入依赖、账户、远程服务或目标项目写入。
- 不将未实际执行的路径写成通过，不以数字伪装风险精度。
- 归属信息放在 README 末尾，但保留 Apache-2.0 与上游链接。

---

### Task 1: 风险决策 Skill 与结构测试

**Files:**
- Modify: `web-app-acceptance-skill/SKILL.md`
- Modify: `web-app-acceptance-skill/tests/test_skill_structure.py`

**Interfaces:**
- Consumes: 项目路径、发布目标与关键用户路径。
- Produces: 含范围、证据、风险、未覆盖项和发布建议的中文决策单。

- [ ] **Step 1: 写失败测试**

```python
self.assertIn("## 1. 范围与关键路径", skill)
self.assertIn("## 3. 风险分级", skill)
self.assertIn("## 5. 发布建议", skill)
self.assertIn("阻塞", skill)
self.assertIn("有条件发布", skill)
```

- [ ] **Step 2: 运行测试并确认失败**

Run: `python3 -m unittest web-app-acceptance-skill/tests/test_skill_structure.py -v`

Expected: FAIL，因为旧 Skill 没有风险分级或发布建议章节。

- [ ] **Step 3: 最小实现**

将 Skill 章节改为：范围与关键路径、证据采集、风险分级、未覆盖范围、发布建议；写明四级风险定义和三种发布结论。

- [ ] **Step 4: 运行测试并确认通过**

Run: `python3 -m unittest web-app-acceptance-skill/tests/test_skill_structure.py -v`

Expected: PASS。

### Task 2: 完整产品 README 与结构测试

**Files:**
- Modify: `web-app-acceptance-skill/README.md`
- Modify: `web-app-acceptance-skill/tests/test_skill_structure.py`

**Interfaces:**
- Consumes: 对发布前风险评审能力的说明。
- Produces: 与仓库现有作品一致的完整 README，并提供可复制的发布决策单示例。

- [ ] **Step 1: 写失败测试**

```python
for heading in ["它解决什么问题", "决策模型", "风险等级", "输出示例", "能力边界", "AI 辅助开发说明"]:
    self.assertIn(heading, readme)
self.assertLess(readme.index("参考与许可"), len(readme))
```

- [ ] **Step 2: 运行测试并确认失败**

Run: `python3 -m unittest web-app-acceptance-skill/tests/test_skill_structure.py -v`

Expected: FAIL，因为旧 README 缺少决策模型、风险等级和完整产品说明。

- [ ] **Step 3: 最小实现**

README 依次说明用户问题、决策模型、使用方式、风险等级、决策单示例、核心能力、技术实现、项目结构、边界、AI 协作与验证，最后说明参考与许可。

- [ ] **Step 4: 运行测试并确认通过**

Run: `python3 -m unittest web-app-acceptance-skill/tests/test_skill_structure.py -v`

Expected: PASS。

### Task 3: 完整验证与发布

**Files:**
- Modify: `README.md`（仅在 Skill 名称说明需要同步时）
- Modify: `docs/superpowers/plans/2026-07-29-web-delivery-risk-review.md`（仅勾选执行状态）

- [ ] **Step 1: 运行完整测试与语法检查**

Run: `PYTHONPYCACHEPREFIX=/private/tmp/web-app-acceptance-pycache python3 -m py_compile web-app-acceptance-skill/scripts/*.py && python3 -m unittest discover -s web-app-acceptance-skill/tests -v`

Expected: 所有测试通过，且两个脚本可编译。

- [ ] **Step 2: 检查本地链接、归属和差异**

Run: `rg -n "风险评审|发布建议|参考与许可|Apache-2.0|anthropics/skills" README.md web-app-acceptance-skill && git diff --check`

Expected: 产品定位、归属和根索引均可定位，且无空白错误。

- [ ] **Step 3: 提交、推送并核验远端**

Run: `git add README.md web-app-acceptance-skill docs/superpowers/plans/2026-07-29-web-delivery-risk-review.md && git commit -m "feat: upgrade web delivery risk review" && git push`

Expected: 推送成功，远端 `main` 提交哈希与本地 HEAD 一致。
