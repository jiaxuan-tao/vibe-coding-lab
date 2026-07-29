# Web 应用验收 Skill 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use inline execution task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 交付可在 Codex 中触发的中文 Web 应用验收 Skill，并提供不改动目标项目的确定性静态检查脚本。

**Architecture:** `SKILL.md` 编排验收阶段并解释脚本输出；两个 Python 标准库脚本分别检测项目配置和静态站点引用。测试用临时目录构造最小项目和站点，验证 JSON 输出与失败降级。

**Tech Stack:** Markdown、Python 3 标准库、unittest、Git。

## Global Constraints

- 所有脚本只读取验收目标，不安装依赖、不写入目标目录、不上传数据。
- 只检查可静态确定的本地 HTML、链接和资源；动态路由、外链与锚点必须作为跳过项报告。
- 新 Skill 位于仓库顶层，保持中文 README 与来源、Apache-2.0 归属说明。

---

### Task 1: 项目检测脚本与测试

**Files:**
- Create: `web-app-acceptance-skill/scripts/inspect_web_project.py`
- Create: `web-app-acceptance-skill/tests/test_inspect_web_project.py`

**Interfaces:**
- Consumes: 一个目录路径。
- Produces: JSON 对象，含 `project_path`、`status`、`package_manager`、`scripts`、`build_directories`、`warnings`。

- [ ] **Step 1: 写失败测试**

```python
result = inspect_project(project_dir)
self.assertEqual(result["status"], "ok")
self.assertEqual(result["package_manager"], "npm")
self.assertIn("build", result["scripts"])
self.assertIn("dist", result["build_directories"])
```

- [ ] **Step 2: 运行测试并确认失败**

Run: `python3 -m unittest web-app-acceptance-skill/tests/test_inspect_web_project.py -v`

Expected: 因模块或函数不存在而失败。

- [ ] **Step 3: 最小实现**

```python
def inspect_project(project_path: Path) -> dict:
    package_json = project_path / "package.json"
    if not package_json.is_file():
        return {"status": "warning", "package_manager": None, "scripts": {},
                "build_directories": [], "warnings": ["未找到 package.json"]}
    data = json.loads(package_json.read_text(encoding="utf-8"))
    return {"status": "ok", "package_manager": "npm", "scripts": data.get("scripts", {}),
            "build_directories": infer_build_directories(data), "warnings": []}
```

- [ ] **Step 4: 运行测试并确认通过**

Run: `python3 -m unittest web-app-acceptance-skill/tests/test_inspect_web_project.py -v`

Expected: PASS。

### Task 2: 静态站点检查脚本与测试

**Files:**
- Create: `web-app-acceptance-skill/scripts/check_static_site.py`
- Create: `web-app-acceptance-skill/tests/test_check_static_site.py`

**Interfaces:**
- Consumes: 一个静态站点目录。
- Produces: JSON 对象，含 `status`、`pages_scanned`、`broken_links`、`missing_resources`、`skipped`、`warnings`。

- [ ] **Step 1: 写失败测试**

```python
report = check_site(site_dir)
self.assertEqual(report["status"], "failed")
self.assertEqual(report["pages_scanned"], 1)
self.assertEqual(report["broken_links"], ["missing.html"])
self.assertEqual(report["missing_resources"], ["images/logo.png"])
```

- [ ] **Step 2: 运行测试并确认失败**

Run: `python3 -m unittest web-app-acceptance-skill/tests/test_check_static_site.py -v`

Expected: 因模块或函数不存在而失败。

- [ ] **Step 3: 最小实现**

```python
def check_site(site_dir: Path) -> dict:
    report = empty_report()
    for html_file in site_dir.rglob("*.html"):
        parser = ReferenceParser()
        parser.feed(html_file.read_text(encoding="utf-8"))
        collect_references(site_dir, html_file, parser.references, report)
    report["status"] = "failed" if report["broken_links"] or report["missing_resources"] else "passed"
    return report
```

- [ ] **Step 4: 运行测试并确认通过**

Run: `python3 -m unittest web-app-acceptance-skill/tests/test_check_static_site.py -v`

Expected: PASS。

### Task 3: Skill、参考清单、README 与许可归属

**Files:**
- Create: `web-app-acceptance-skill/SKILL.md`
- Create: `web-app-acceptance-skill/README.md`
- Create: `web-app-acceptance-skill/LICENSE.txt`
- Create: `web-app-acceptance-skill/UPSTREAM.md`
- Create: `web-app-acceptance-skill/references/browser-acceptance-checklist.md`
- Modify: `README.md`

**Interfaces:**
- Consumes: 用户指定的项目路径或当前工作目录。
- Produces: 含命令、结果、缺陷、跳过项与剩余风险的中文验收报告。

- [ ] **Step 1: 写文本结构测试**

```python
skill = (skill_dir / "SKILL.md").read_text(encoding="utf-8")
self.assertIn("name: web-app-acceptance", skill)
self.assertIn("description:", skill)
self.assertTrue((skill_dir / "LICENSE.txt").is_file())
self.assertIn("web-app-acceptance-skill/README.md", root_readme)
```

- [ ] **Step 2: 运行测试并确认失败**

Run: `python3 -m unittest discover -s web-app-acceptance-skill/tests -v`

Expected: 因 Skill 文件、许可或索引不存在而失败。

- [ ] **Step 3: 最小实现**

```markdown
---
name: web-app-acceptance
description: 对本地 Web 项目进行交付前验收；当用户要求验收网页、检查构建、排查失效链接、验证关键交互或发布前检查时使用。
---
```

Skill 规定检测、构建、静态检查、浏览器辅助验收和风险汇总的顺序；README 说明安装、使用、边界、来源和改造说明；根 README 新增索引；许可证保留 Apache-2.0 全文。

- [ ] **Step 4: 运行测试并确认通过**

Run: `python3 -m unittest discover -s web-app-acceptance-skill/tests -v`

Expected: PASS。

### Task 4: 完整验证与发布准备

**Files:**
- Modify: 所有 Task 1-3 文件（仅在验证发现问题时）。

- [ ] **Step 1: 运行脚本帮助与语法检查**

Run: `python3 -m py_compile web-app-acceptance-skill/scripts/*.py && python3 web-app-acceptance-skill/scripts/inspect_web_project.py --help && python3 web-app-acceptance-skill/scripts/check_static_site.py --help`

Expected: 全部退出码为 0。

- [ ] **Step 2: 运行完整测试与格式检查**

Run: `python3 -m unittest discover -s web-app-acceptance-skill/tests -v && git diff --check`

Expected: 全部 PASS，且无空白错误。

- [ ] **Step 3: 人工检查文档与许可**

Run: `rg -n "topic-collector|web-app-acceptance|Apache-2.0|Anthropic" README.md web-app-acceptance-skill`

Expected: 根索引、来源与许可均可定位。

- [ ] **Step 4: 提交、推送并验证远端**

Run: `git add web-app-acceptance-skill README.md && git commit -m "feat: add web app acceptance skill" && git push`

Expected: 推送成功；GitHub 默认分支可见该提交与 README 链接。
