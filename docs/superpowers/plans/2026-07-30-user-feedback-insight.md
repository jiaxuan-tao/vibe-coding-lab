# User Feedback Insight Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and publish a zero-dependency Codex Skill that turns raw user feedback into traceable product opportunities without inventing prevalence or treating requests as validated requirements.

**Architecture:** Keep judgment in a concise `SKILL.md`, move detailed analysis criteria and examples into one reference, and use a read-only Python standard-library script to normalize local feedback into stable evidence records. Protect the product contract with `unittest` tests for scripts, Skill structure, documentation, trigger boundaries, and repository integration.

**Tech Stack:** Markdown, YAML, Python 3 standard library, `unittest`, Git.

## Global Constraints

- Create `user-feedback-insight-skill/` as a top-level folder in the existing repository.
- Support UTF-8 Markdown, TXT, CSV, and JSON inputs.
- Do not modify source feedback files or require remote APIs, credentials, paid services, databases, or third-party Python packages.
- Do not infer population prevalence, causal conclusions, or validated requirements from the supplied sample.
- Keep Skills out of `site/index.html`; update only the repository README Skill index.
- Preserve unrelated changes in `AGENTS.md` and `docs/SKILLS_WORKFLOW.md`.

---

### Task 1: Skill Contract and Scaffold

**Files:**
- Create: `user-feedback-insight-skill/tests/test_skill_structure.py`
- Create: `user-feedback-insight-skill/tests/baseline-evaluation.md`
- Create: `user-feedback-insight-skill/SKILL.md`
- Create: `user-feedback-insight-skill/agents/openai.yaml`

**Interfaces:**
- Consumes: approved design at `docs/superpowers/specs/2026-07-30-user-feedback-insight-design.md`.
- Produces: a valid Skill directory named `user-feedback-insight-skill` whose frontmatter name is `user-feedback-insight`.

- [ ] **Step 1: Write the failing structure test**

```python
from pathlib import Path
import unittest


ROOT = Path(__file__).resolve().parents[1]


class SkillStructureTests(unittest.TestCase):
    def test_required_files_and_trigger_contract_exist(self):
        skill = (ROOT / "SKILL.md").read_text(encoding="utf-8")
        self.assertTrue(skill.startswith("---\nname: user-feedback-insight\n"))
        self.assertIn("访谈记录", skill)
        self.assertIn("客服工单", skill)
        self.assertIn("应用商店评论", skill)
        self.assertIn("分析范围与限制", skill)
        self.assertIn("证据台账", skill)
        self.assertIn("产品机会", skill)
        self.assertIn("待补证据", skill)
        self.assertNotIn("site/index.html", skill)
        self.assertTrue((ROOT / "agents" / "openai.yaml").is_file())


if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 2: Run the test and confirm RED**

Run:

```bash
python3 -m unittest user-feedback-insight-skill/tests/test_skill_structure.py -v
```

Expected: FAIL because `user-feedback-insight-skill/SKILL.md` does not exist.

- [ ] **Step 3: Initialize the Skill**

Run:

```bash
python3 /Users/taojiaxuan/.codex/skills/.system/skill-creator/scripts/init_skill.py \
  user-feedback-insight \
  --path /Users/taojiaxuan/Documents/个人项目\ 2/vibe-coding-lab \
  --resources scripts,references \
  --interface 'display_name=用户反馈洞察' \
  --interface 'short_description=从访谈、工单和评论中提炼可追溯的产品机会' \
  --interface 'default_prompt=使用 $user-feedback-insight 分析这批用户反馈，保留证据、矛盾与样本限制。'
mv user-feedback-insight user-feedback-insight-skill
```

- [ ] **Step 4: Write the minimal Skill contract**

Use frontmatter description:

```yaml
---
name: user-feedback-insight
description: Use when analyzing user interviews, customer feedback, support tickets, survey free text, app reviews, or feedback files to identify product problems and opportunities; also use when evidence is duplicated, contradictory, sampled, or easy to overgeneralize.
---
```

The body must state the six-section output contract and explicitly distinguish records, independent sources, sample frequency, severity, evidence quality, strategic fit, user-requested solutions, and product opportunities.

- [ ] **Step 5: Record the three baseline scenarios and observed gaps**

Create `tests/baseline-evaluation.md` with the exact prompts, verbatim outputs, and a comparison matrix for:

- import interview feedback;
- duplicated app reviews from a biased sample;
- contradictory support tickets containing direct identifiers.

- [ ] **Step 6: Run the structure test and confirm GREEN**

Run:

```bash
python3 -m unittest user-feedback-insight-skill/tests/test_skill_structure.py -v
```

Expected: PASS.

---

### Task 2: Read-only Feedback Preparation Script

**Files:**
- Create: `user-feedback-insight-skill/tests/test_prepare_feedback.py`
- Create: `user-feedback-insight-skill/scripts/prepare_feedback.py`

**Interfaces:**
- Consumes: one local `.md`, `.txt`, `.csv`, or `.json` file.
- Produces: JSON on stdout with `source_file`, `format`, `summary`, `warnings`, and `records`.
- Produces each record with `id`, `source_index`, `source_line`, `source`, `text`, `duplicate_of`, and `pii_types`.
- Returns exit code `2` for missing files, directories, unsupported extensions, empty usable input, invalid JSON/CSV, and non-UTF-8 content.

- [ ] **Step 1: Write failing tests for text normalization and stable IDs**

```python
def test_markdown_paragraphs_get_stable_ids_and_lines(self):
    path = self.write("feedback.md", "第一条反馈\\n\\n第二条反馈\\n")
    result = self.run_script(path)
    self.assertEqual(result.returncode, 0)
    payload = json.loads(result.stdout)
    self.assertEqual([item["id"] for item in payload["records"]], ["FB-0001", "FB-0002"])
    self.assertEqual([item["source_line"] for item in payload["records"]], [1, 3])
```

- [ ] **Step 2: Run the focused test and confirm RED**

Run:

```bash
python3 -m unittest \
  user-feedback-insight-skill.tests.test_prepare_feedback.PrepareFeedbackTests.test_markdown_paragraphs_get_stable_ids_and_lines \
  -v
```

Expected: FAIL because `scripts/prepare_feedback.py` does not exist.

- [ ] **Step 3: Implement text, CSV, and JSON readers**

Implement these functions:

```python
def read_utf8(path: Path) -> str: ...
def records_from_text(content: str) -> list[dict]: ...
def records_from_csv(content: str) -> list[dict]: ...
def records_from_json(content: str) -> list[dict]: ...
def load_records(path: Path) -> tuple[str, list[dict]]: ...
```

Text paragraphs are separated by blank lines. CSV selects the first available text field from `feedback`, `text`, `comment`, `content`, `review`, `message`, `反馈`, `评论`, `内容`; JSON accepts a top-level list or an object containing `records`, `feedback`, `items`, `comments`, or `reviews`.

- [ ] **Step 4: Run the focused test and confirm GREEN**

Run the same focused test. Expected: PASS.

- [ ] **Step 5: Write failing tests for duplicates, sources, PII, and errors**

Add tests asserting:

```python
self.assertEqual(payload["records"][1]["duplicate_of"], "FB-0001")
self.assertEqual(payload["summary"]["unique_source_count"], 2)
self.assertEqual(payload["records"][0]["pii_types"], ["email", "phone_cn"])
self.assertEqual(result.returncode, 2)
self.assertIn("不支持的文件类型", result.stderr)
self.assertEqual(before_bytes, path.read_bytes())
```

- [ ] **Step 6: Implement deterministic annotations**

Implement:

```python
def normalize_for_duplicate(text: str) -> str: ...
def detect_pii(text: str) -> list[str]: ...
def annotate_records(records: list[dict]) -> list[dict]: ...
def build_payload(path: Path, format_name: str, records: list[dict]) -> dict: ...
def main(argv: list[str] | None = None) -> int: ...
```

Use SHA-free sequential IDs for readability, exact normalized-text duplicate detection, case-insensitive email detection, and the mainland mobile pattern `(?<!\\d)1[3-9]\\d{9}(?!\\d)`.

- [ ] **Step 7: Run all script tests**

Run:

```bash
python3 -m unittest user-feedback-insight-skill/tests/test_prepare_feedback.py -v
```

Expected: all tests PASS with no warnings or errors.

---

### Task 3: Product Method, Documentation, and Licensing

**Files:**
- Create: `user-feedback-insight-skill/references/feedback-analysis-framework.md`
- Create: `user-feedback-insight-skill/README.md`
- Create: `user-feedback-insight-skill/UPSTREAM.md`
- Create: `user-feedback-insight-skill/LICENSE.txt`
- Create: `user-feedback-insight-skill/tests/test_documentation.py`
- Create: `user-feedback-insight-skill/tests/trigger-evaluation.md`
- Create: `user-feedback-insight-skill/tests/forward-evaluation.md`
- Modify: `user-feedback-insight-skill/SKILL.md`

**Interfaces:**
- Consumes: normalized evidence records and raw feedback context.
- Produces: an analysis with scope, evidence ledger, themes and contradictions, product opportunities, actions, and missing evidence.

- [ ] **Step 1: Write failing documentation tests**

```python
def test_readme_explains_product_value_and_boundaries(self):
    readme = (ROOT / "README.md").read_text(encoding="utf-8")
    for phrase in ["证据台账", "独立来源", "产品机会", "能力边界", "本地验证"]:
        self.assertIn(phrase, readme)

def test_upstream_and_license_are_explicit(self):
    upstream = (ROOT / "UPSTREAM.md").read_text(encoding="utf-8")
    self.assertIn("aws-solutions-library-samples", upstream)
    self.assertIn("MIT-0", upstream)
    self.assertIn("Meituan-Dianping/asap", upstream)
    self.assertIn("Apache-2.0", upstream)
    self.assertIn("focused reimplementation", upstream)
    self.assertIn("MIT License", (ROOT / "LICENSE.txt").read_text(encoding="utf-8"))
```

- [ ] **Step 2: Run documentation tests and confirm RED**

Run:

```bash
python3 -m unittest user-feedback-insight-skill/tests/test_documentation.py -v
```

Expected: FAIL because the files do not yet exist.

- [ ] **Step 3: Write the reference and Skill workflow**

Define:

- evidence atom schema;
- source diversity rules;
- sample-frequency language;
- contradiction and outlier handling;
- separate scales for severity, evidence confidence, and strategic fit;
- four allowed actions: `立即处理`, `进入验证`, `持续观察`, `暂不推进`;
- one complete worked example.

- [ ] **Step 4: Write the user-facing README**

Explain the product problem, decision model, installation, prompts, output example, local script, tests, architecture, product boundaries, AI-assisted development statement, upstream references, and license. Emphasize product decisions and evidence control rather than localization or reproduction.

- [ ] **Step 5: Run documentation tests and confirm GREEN**

Run the same documentation command. Expected: PASS.

- [ ] **Step 6: Forward-test the Skill**

Run the three baseline prompts with the completed Skill in fresh contexts. Record verbatim outputs and verify:

- every conclusion references evidence IDs;
- repeated feedback from one source does not become independent corroboration;
- sample proportions are labeled as sample-only;
- contradictions and outliers remain visible;
- product opportunities precede feature suggestions;
- PII is flagged without reproducing it unnecessarily.

---

### Task 4: Repository Integration and Publication

**Files:**
- Create: `user-feedback-insight-skill/tests/test_repository_integration.py`
- Modify: `README.md`

**Interfaces:**
- Consumes: completed Skill directory.
- Produces: a root README entry linking to the Skill while keeping the showcase unchanged.

- [ ] **Step 1: Write the failing integration test**

```python
class RepositoryIntegrationTests(unittest.TestCase):
    def test_root_readme_indexes_skill_but_showcase_does_not(self):
        root = ROOT.parents[1]
        readme = (root / "README.md").read_text(encoding="utf-8")
        site = (root / "site" / "index.html").read_text(encoding="utf-8")
        self.assertIn("user-feedback-insight-skill/README.md", readme)
        self.assertNotIn("user-feedback-insight-skill", site)
        self.assertNotIn("用户反馈洞察 Skill", site)
```

- [ ] **Step 2: Run the integration test and confirm RED**

Run:

```bash
python3 -m unittest user-feedback-insight-skill/tests/test_repository_integration.py -v
```

Expected: FAIL because the root README does not contain the new Skill.

- [ ] **Step 3: Add the README index entry**

Add:

```markdown
- [用户反馈洞察 Skill](user-feedback-insight-skill/README.md)
  面向 Codex 的证据驱动反馈分析流程，将访谈、工单、问卷和评论整理为可追溯的产品问题、矛盾与验证机会。
```

Also add `user-feedback-insight-skill/` to the repository structure example list.

- [ ] **Step 4: Run full verification**

Run:

```bash
python3 -m unittest discover -s user-feedback-insight-skill/tests -p 'test_*.py' -v
python3 /Users/taojiaxuan/.codex/skills/.system/skill-creator/scripts/quick_validate.py \
  user-feedback-insight-skill
git diff --check
```

Expected: all tests PASS, validation reports a valid Skill, and `git diff --check` exits `0`.

- [ ] **Step 5: Review, commit, and push only intended scope**

Run:

```bash
git status --short
git diff -- README.md user-feedback-insight-skill
git add README.md user-feedback-insight-skill \
  docs/superpowers/plans/2026-07-30-user-feedback-insight.md
git commit -m "feat: add user feedback insight skill"
git push origin main
```

Do not stage `AGENTS.md` or `docs/SKILLS_WORKFLOW.md`.

- [ ] **Step 6: Verify publication**

Confirm the GitHub directory and README are accessible at:

```text
https://github.com/jiaxuan-tao/vibe-coding-lab/tree/main/user-feedback-insight-skill
https://github.com/jiaxuan-tao/vibe-coding-lab/blob/main/user-feedback-insight-skill/README.md
```
