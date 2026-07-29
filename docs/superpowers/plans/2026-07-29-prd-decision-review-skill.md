# PRD Decision Review Skill Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and publish a Chinese Codex Skill that reviews PRDs as product decisions, distinguishes evidence from assumptions, and returns a defensible gate decision before design or development.

**Architecture:** Keep product judgment in `SKILL.md` and a focused reference, while a zero-dependency Python script supplies read-only structural evidence from Markdown PRDs. Tests cover the script, Skill contract, documentation, repository integration, and realistic before/after behavior; the script never calculates a product score or edits user files.

**Tech Stack:** Markdown, YAML, Python 3 standard library, `unittest`, Codex Skill validation utilities, GitHub Pages static HTML.

## Global Constraints

- Create the Skill at repository root as `prd-decision-review-skill/`; do not create another repository.
- Use the Skill name `prd-decision-review` and the Chinese display name `PRD 需求决策评审`.
- Keep the workflow review-first and revision-on-request; never invent user research, market data, business rules, or validated facts.
- The only gate decisions are `可进入设计`, `有条件进入`, and `暂不建议推进`.
- Separate confirmed evidence, assumptions, and unresolved questions in every review.
- Use no aggregate score; structural checks are evidence, not the product decision.
- Use only Python's standard library; scripts are read-only and must not install packages or modify inspected files.
- Treat GitHub Spec Kit and OpenSpec as MIT-licensed references; preserve accurate attribution without making upstream adaptation the main product narrative.
- Preserve unrelated changes in `AGENTS.md` and `docs/SKILLS_WORKFLOW.md`.

---

### Task 1: Record RED Baseline Behavior

**Files:**
- Create: `docs/superpowers/evals/2026-07-29-prd-decision-review-baseline.md`

**Interfaces:**
- Consumes: Three raw PRD scenarios from the approved design.
- Produces: Verbatim baseline outputs and a failure matrix used to shape `SKILL.md`.

- [ ] **Step 1: Prepare three no-Skill prompts**

Use fresh agents without the new Skill:

```text
Scenario A — vague idea:
“帮我写一份 PRD：给独立开发者做一个 AI 自动整理会议记录的工具。”

Scenario B — incomplete PRD:
“评审这份 PRD：目标是提升活跃；功能包括每日提醒、积分、排行榜；
成功标准之后再补；验收标准是功能正常。”

Scenario C — polished but wrong direction:
“评审这份 PRD：为偶尔使用的个人记账工具增加团队审批、五级权限、
跨组织 SSO 和年度合规报表。文档包含完整页面列表和接口字段。”
```

- [ ] **Step 2: Run the prompts without the Skill**

Run each scenario in an independent fresh context. Record the output verbatim and note whether it:

```text
invented_facts
gave_single_gate_decision
separated_evidence_and_assumptions
challenged_problem_or_scope
rewrote_without_request
gave_minimal_next_action
```

Expected RED: at least one scenario invents or silently assumes facts, lacks a gate decision, prioritizes document completion over product direction, or rewrites before being asked.

- [ ] **Step 3: Write the baseline evaluation**

Create `docs/superpowers/evals/2026-07-29-prd-decision-review-baseline.md` with this exact structure:

```markdown
# Baseline Evaluation

## Environment
- Skill available: no
- Evaluation date: 2026-07-29

## Scenario A: Vague idea
### Prompt
...
### Verbatim output
...
### Observed failures
- ...

## Scenario B: Incomplete PRD
...

## Scenario C: Complete document, weak direction
...

## Failure matrix
| Failure | A | B | C | Skill response required |
| --- | --- | --- | --- | --- |
| Treats assumptions as facts | | | | Separate evidence, assumptions, questions |
| No gate decision | | | | Require one of three decisions |
| Reviews structure before direction | | | | Fix review order |
| Rewrites without request | | | | Make revision opt-in |
```

- [ ] **Step 4: Commit the baseline**

```bash
git add docs/superpowers/evals/2026-07-29-prd-decision-review-baseline.md
git commit -m "test: capture PRD review baseline failures"
```

### Task 2: Scaffold the Skill and Lock the Contract

**Files:**
- Create: `prd-decision-review-skill/SKILL.md`
- Create: `prd-decision-review-skill/agents/openai.yaml`
- Create: `prd-decision-review-skill/tests/test_skill_structure.py`

**Interfaces:**
- Consumes: Failure patterns from Task 1 and the approved design.
- Produces: Trigger metadata and a test-enforced review/output contract.

- [ ] **Step 1: Initialize the Skill skeleton**

Run:

```bash
python3 /Users/taojiaxuan/.codex/skills/.system/skill-creator/scripts/init_skill.py \
  prd-decision-review \
  --path . \
  --resources scripts,references \
  --interface 'display_name=PRD 需求决策评审' \
  --interface 'short_description=判断 PRD 是否具备进入设计的条件' \
  --interface 'default_prompt=使用 $prd-decision-review 评审这份需求，区分事实、假设与待确认项，并给出推进结论。'
mv prd-decision-review prd-decision-review-skill
```

Expected: the top-level directory and `agents/openai.yaml` exist; no example placeholders remain after later implementation.

- [ ] **Step 2: Write the failing structure tests**

Create `tests/test_skill_structure.py`:

```python
from pathlib import Path
import re
import unittest


ROOT = Path(__file__).resolve().parents[1]
SKILL = ROOT / "SKILL.md"


class SkillStructureTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.text = SKILL.read_text(encoding="utf-8")

    def test_frontmatter_has_only_required_fields(self):
        match = re.match(r"^---\n(.*?)\n---", self.text, re.S)
        self.assertIsNotNone(match)
        keys = [
            line.split(":", 1)[0].strip()
            for line in match.group(1).splitlines()
            if ":" in line
        ]
        self.assertEqual(keys, ["name", "description"])
        self.assertIn("name: prd-decision-review", match.group(1))
        self.assertIn("当用户要求评审 PRD", match.group(1))

    def test_review_order_starts_with_problem_and_evidence(self):
        required = ["用户问题", "证据与假设", "目标与指标", "MVP 范围",
                    "关键流程", "需求与验收", "依赖与风险", "一致性"]
        positions = [self.text.index(item) for item in required]
        self.assertEqual(positions, sorted(positions))

    def test_gate_decisions_and_evidence_buckets_are_required(self):
        for value in ["可进入设计", "有条件进入", "暂不建议推进",
                      "已确认", "假设", "待确认"]:
            self.assertIn(value, self.text)

    def test_revision_is_opt_in_and_scoring_is_rejected(self):
        self.assertIn("仅在用户明确要求", self.text)
        self.assertIn("不输出总分", self.text)

    def test_output_contains_decision_reason_impact_evidence_and_action(self):
        for value in ["一句话理由", "影响", "依据", "最小动作"]:
            self.assertIn(value, self.text)


if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 3: Run tests and verify RED**

Run:

```bash
python3 -m unittest prd-decision-review-skill/tests/test_skill_structure.py -v
```

Expected: FAIL because the generated `SKILL.md` does not contain the required contract.

- [ ] **Step 4: Write the minimal Skill**

Replace the generated `SKILL.md` with a concise imperative workflow containing:

```yaml
---
name: prd-decision-review
description: 当用户要求评审 PRD、判断需求是否值得推进、检查用户问题与 MVP 范围、补充成功指标或验收标准，或把模糊产品想法整理为可评审 Brief 时使用。
---
```

The body must implement, in order:

```text
输入分类 → 用户问题 → 证据与假设 → 目标与指标 → MVP 范围
→ 关键流程 → 需求与验收 → 依赖与风险 → 一致性
→ 三选一结论 → 最小下一步 → 按需修订
```

Include the exact output fields tested in Step 2 and explicitly state that absent evidence remains an assumption or unresolved question.

- [ ] **Step 5: Run tests and validate the skeleton**

Run:

```bash
python3 -m unittest prd-decision-review-skill/tests/test_skill_structure.py -v
python3 /Users/taojiaxuan/.codex/skills/.system/skill-creator/scripts/quick_validate.py \
  prd-decision-review-skill
```

Expected: all structure tests PASS and validation reports a valid Skill.

- [ ] **Step 6: Commit the Skill contract**

```bash
git add prd-decision-review-skill/SKILL.md \
  prd-decision-review-skill/agents/openai.yaml \
  prd-decision-review-skill/tests/test_skill_structure.py
git commit -m "feat: add PRD decision review contract"
```

### Task 3: Build the Read-Only PRD Inspector with TDD

**Files:**
- Create: `prd-decision-review-skill/scripts/inspect_prd.py`
- Create: `prd-decision-review-skill/tests/test_inspect_prd.py`

**Interfaces:**
- Produces: `inspect_document(text: str) -> dict[str, object]`
- CLI: `python3 scripts/inspect_prd.py <file> [--json]`
- Return codes: `0` for a readable document even when gaps exist; `2` for missing, unreadable, or non-file input.

- [ ] **Step 1: Write failing unit tests**

Create fixtures inline with `tempfile.TemporaryDirectory` and test:

```python
def test_reports_present_and_missing_review_areas()
def test_reports_placeholders_with_line_numbers()
def test_reports_vague_language_as_evidence_not_score()
def test_recognizes_given_when_then_acceptance_scenarios()
def test_json_output_is_machine_readable()
def test_missing_file_returns_two()
def test_inspection_does_not_modify_source()
```

Assert this result shape:

```python
{
    "path": "...",
    "sections": {
        "user_problem": {"present": True, "matches": ["用户问题"]},
        "target_user": {"present": False, "matches": []},
        "goal_metrics": {"present": True, "matches": ["成功指标"]},
        "scope": {"present": True, "matches": ["MVP 范围"]},
        "user_flow": {"present": True, "matches": ["用户流程"]},
        "acceptance": {"present": True, "matches": ["验收标准"]},
        "dependencies_risks": {"present": False, "matches": []},
    },
    "placeholders": [{"line": 9, "text": "TODO"}],
    "vague_terms": [{"line": 4, "term": "提升"}],
    "acceptance_scenarios": 1,
    "notes": ["结构检查不能替代产品判断，也不生成质量分数。"],
}
```

- [ ] **Step 2: Run tests and verify RED**

Run:

```bash
python3 -m unittest prd-decision-review-skill/tests/test_inspect_prd.py -v
```

Expected: FAIL with `ModuleNotFoundError` or missing `inspect_document`.

- [ ] **Step 3: Implement the minimal inspector**

Implement these constants and functions:

```python
SECTION_PATTERNS = {
    "user_problem": ("用户问题", "问题背景", "用户痛点", "problem"),
    "target_user": ("目标用户", "用户画像", "target user", "persona"),
    "goal_metrics": ("产品目标", "成功指标", "成功标准", "metrics", "success criteria"),
    "scope": ("mvp", "需求范围", "本次包含", "排除项", "out of scope"),
    "user_flow": ("用户流程", "关键流程", "用户场景", "user flow", "user scenario"),
    "acceptance": ("验收标准", "验收场景", "acceptance", "given", "when", "then"),
    "dependencies_risks": ("依赖", "风险", "权限", "合规", "dependency", "risk"),
}

PLACEHOLDER_RE = re.compile(
    r"\b(?:TODO|TBD|FIXME|XXX)\b|待补充|待确认|待完善|\\[NEEDS CLARIFICATION",
    re.I,
)
VAGUE_TERMS = ("优化", "提升", "友好", "尽快", "适当", "智能", "高效", "稳定")


def inspect_document(text: str, path: str = "<memory>") -> dict[str, object]:
    ...


def render_text(report: dict[str, object]) -> str:
    ...


def main(argv: list[str] | None = None) -> int:
    ...
```

Count a GIVEN/WHEN/THEN group as one acceptance scenario. Report line evidence and section presence, but do not return a score, verdict, or file mutation.

- [ ] **Step 4: Run inspector tests**

Run:

```bash
python3 -m unittest prd-decision-review-skill/tests/test_inspect_prd.py -v
python3 -m py_compile prd-decision-review-skill/scripts/inspect_prd.py
python3 prd-decision-review-skill/scripts/inspect_prd.py --help
```

Expected: all tests PASS, compilation succeeds, and help documents `<file>` plus `--json`.

- [ ] **Step 5: Commit the inspector**

```bash
git add prd-decision-review-skill/scripts/inspect_prd.py \
  prd-decision-review-skill/tests/test_inspect_prd.py
git commit -m "feat: add read-only PRD structure inspector"
```

### Task 4: Add the Review Framework and Forward-Test Behavior

**Files:**
- Create: `prd-decision-review-skill/references/prd-review-framework.md`
- Modify: `prd-decision-review-skill/SKILL.md`
- Create: `prd-decision-review-skill/tests/forward-evaluation.md`
- Modify: `prd-decision-review-skill/tests/test_skill_structure.py`

**Interfaces:**
- Consumes: Baseline failure matrix and inspector report.
- Produces: Product judgment rules, examples, and before/after evaluation evidence.

- [ ] **Step 1: Extend failing contract tests**

Add assertions that `SKILL.md`:

```python
self.assertIn("references/prd-review-framework.md", self.text)
self.assertIn("scripts/inspect_prd.py", self.text)
self.assertIn("结构证据", self.text)
self.assertIn("不修改原文件", self.text)
```

Run the structure test and expect FAIL until the references are wired in.

- [ ] **Step 2: Write the focused reference**

Create `references/prd-review-framework.md` with:

```text
1. 用户问题：strong / weak examples and evidence questions
2. 证据、假设、待确认：classification rules
3. Goal-to-metric traceability
4. MVP slicing and explicit exclusions
5. Observable user flows and error states
6. One-behavior requirements and GIVEN/WHEN/THEN acceptance
7. Dependencies, privacy, permissions, and irreversible effects
8. Consistency checks and gate-decision examples
9. Common failure patterns: solution-first, feature pile, vanity metric,
   hidden dependency, AI-completed fiction, untestable acceptance
```

Keep the reference under 250 lines and place detailed examples there rather than bloating `SKILL.md`.

- [ ] **Step 3: Wire the inspector and reference into the Skill**

Require reading the reference when the request includes a full PRD or a disputed gate decision. Require the inspector only when a local Markdown PRD is available. State that its output is structural evidence and cannot issue the gate decision.

- [ ] **Step 4: Run the original three scenarios with the Skill**

Use fresh agents and the same prompts from Task 1. Save verbatim outputs to `tests/forward-evaluation.md` and complete the same failure matrix.

Expected GREEN:

```text
Scenario A: produces a Brief, labels assumptions, avoids invented evidence,
and gives 有条件进入 or 暂不建议推进.
Scenario B: rejects “功能正常” as unobservable, identifies missing success
criteria, and returns a single decision plus minimal actions.
Scenario C: challenges the mismatch between occasional personal use and
enterprise scope instead of praising document completeness.
```

- [ ] **Step 5: Refactor only against observed gaps**

If forward tests reveal a new failure, add the smallest explicit rule or positive output contract needed, then rerun the affected scenario. Do not add speculative process.

- [ ] **Step 6: Run all Skill tests and commit**

```bash
python3 -m unittest discover -s prd-decision-review-skill/tests -p 'test_*.py' -v
git add prd-decision-review-skill/SKILL.md \
  prd-decision-review-skill/references/prd-review-framework.md \
  prd-decision-review-skill/tests/test_skill_structure.py \
  prd-decision-review-skill/tests/forward-evaluation.md
git commit -m "feat: complete PRD review decision model"
```

### Task 5: Write Product Documentation and Attribution

**Files:**
- Create: `prd-decision-review-skill/README.md`
- Create: `prd-decision-review-skill/UPSTREAM.md`
- Create: `prd-decision-review-skill/LICENSE.txt`
- Create: `prd-decision-review-skill/tests/test_documentation.py`

**Interfaces:**
- Produces: User-facing installation and product narrative, with accurate MIT attribution.

- [ ] **Step 1: Write failing documentation tests**

Test that README contains:

```python
REQUIRED_HEADINGS = [
    "它解决什么问题",
    "决策模型",
    "使用方法",
    "输出示例",
    "核心能力",
    "技术实现",
    "能力边界",
    "AI 辅助开发说明",
    "参考与许可",
]
```

Also assert:

```python
"github/spec-kit" in upstream
"Fission-AI/OpenSpec" in upstream
"MIT License" in license_text
"~/.codex/skills/prd-decision-review" in readme
"完全原创" not in readme
```

- [ ] **Step 2: Run documentation tests and verify RED**

Run:

```bash
python3 -m unittest prd-decision-review-skill/tests/test_documentation.py -v
```

Expected: FAIL because user-facing files do not exist.

- [ ] **Step 3: Write README**

Follow the existing Web Skill narrative:

```text
summary → problem → decision model → use → output example → capabilities
→ local validation → implementation → structure → boundaries
→ AI collaboration/product judgment → attribution
```

Lead with the product contribution: converting PRD writing into an evidence-based gate decision. Keep upstream explanation in the final attribution section and link to `UPSTREAM.md`.

- [ ] **Step 4: Add upstream and license files**

`UPSTREAM.md` must record:

```text
GitHub Spec Kit — https://github.com/github/spec-kit — MIT
Referenced: prioritized user scenarios, independent tests, measurable outcomes,
and explicit assumptions.

OpenSpec — https://github.com/Fission-AI/OpenSpec — MIT
Referenced: intent/scope review order, observable requirements,
GIVEN/WHEN/THEN scenarios, and right-sized changes.

Strategy: focused reimplementation; no upstream CLI or runtime code included.
```

Copy the MIT license text into `LICENSE.txt` and preserve the required notices for any substantially reused text.

- [ ] **Step 5: Run documentation tests and commit**

```bash
python3 -m unittest prd-decision-review-skill/tests/test_documentation.py -v
git add prd-decision-review-skill/README.md \
  prd-decision-review-skill/UPSTREAM.md \
  prd-decision-review-skill/LICENSE.txt \
  prd-decision-review-skill/tests/test_documentation.py
git commit -m "docs: explain PRD decision review product"
```

### Task 6: Integrate, Verify, Publish, and Validate Remote Access

**Files:**
- Modify: `README.md`
- Modify: `projects/README.md`
- Modify: `site/index.html`
- Create or modify: `site/assets/prd-decision-review-skill.png` only if a meaningful product image is produced; otherwise use a text-only Skill card without inventing a screenshot.
- Create: `prd-decision-review-skill/tests/test_repository_integration.py`

**Interfaces:**
- Produces: Repository discovery links, showcase entry, published GitHub paths, and verified installation URL.

- [ ] **Step 1: Write failing integration tests**

Assert:

```python
root_readme = (REPO / "README.md").read_text(encoding="utf-8")
projects = (REPO / "projects/README.md").read_text(encoding="utf-8")
site = (REPO / "site/index.html").read_text(encoding="utf-8")

self.assertIn("prd-decision-review-skill/README.md", root_readme)
self.assertIn("PRD 需求决策评审 Skill", root_readme)
self.assertIn("../prd-decision-review-skill/README.md", projects)
self.assertIn("prd-decision-review-skill", site)
```

- [ ] **Step 2: Run integration test and verify RED**

Run:

```bash
python3 -m unittest \
  prd-decision-review-skill/tests/test_repository_integration.py -v
```

Expected: FAIL because repository indexes do not yet mention the Skill.

- [ ] **Step 3: Update indexes and showcase**

Add a root README entry after the existing Web Skill, add the top-level folder to the repository structure and `projects/README.md`, and add a new showcase card linking to:

```text
https://github.com/jiaxuan-tao/vibe-coding-lab/tree/main/prd-decision-review-skill
```

The card description should emphasize the gate decision, evidence/assumption separation, and MVP scope judgment.

- [ ] **Step 4: Run the full local verification suite**

Run:

```bash
python3 -m unittest discover -s prd-decision-review-skill/tests -p 'test_*.py' -v
python3 -m py_compile prd-decision-review-skill/scripts/inspect_prd.py
python3 /Users/taojiaxuan/.codex/skills/.system/skill-creator/scripts/quick_validate.py \
  prd-decision-review-skill
git diff --check
```

Expected: all tests PASS, validation succeeds, and `git diff --check` is silent.

- [ ] **Step 5: Review the exact publication diff**

Run:

```bash
git status --short
git diff -- README.md projects/README.md site/index.html prd-decision-review-skill
```

Confirm `AGENTS.md` and `docs/SKILLS_WORKFLOW.md` remain outside the staged scope.

- [ ] **Step 6: Commit repository integration**

```bash
git add README.md projects/README.md site/index.html prd-decision-review-skill/tests/test_repository_integration.py
git commit -m "feat: publish PRD decision review skill"
```

- [ ] **Step 7: Push and verify remote publication**

Run:

```bash
git push origin main
```

Verify these URLs return the new content:

```text
https://github.com/jiaxuan-tao/vibe-coding-lab/tree/main/prd-decision-review-skill
https://raw.githubusercontent.com/jiaxuan-tao/vibe-coding-lab/main/prd-decision-review-skill/SKILL.md
https://jiaxuan-tao.github.io/vibe-coding-lab/
```

- [ ] **Step 8: Final status check**

Run:

```bash
git status --short
git log -6 --oneline
```

Expected: only the user's pre-existing `AGENTS.md` and `docs/SKILLS_WORKFLOW.md` changes remain; all Skill commits are present on `origin/main`.
