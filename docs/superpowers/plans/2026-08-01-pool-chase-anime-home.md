# 台球追分计分台动漫首页 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将台球追分计分台首页的写实照片替换为热血运动番插画，并保持现有一屏布局、操作流程和离线能力。

**Architecture:** 使用桌面横版与手机竖版两套独立 WebP 资源，通过现有 `<picture>` 断点加载。HTML、Service Worker、契约测试和 Playwright 测试只更新资源契约，不改变应用状态或计分逻辑。

**Tech Stack:** 静态 HTML/CSS/JavaScript、WebP、Node.js Test Runner、Playwright、GitHub Pages

## Global Constraints

- 插画使用热血运动番风格，人物为三位年轻、帅气的成年男性球友。
- 一人俯身瞄准击球，另外两人关注局势；画面不得出现手机、计分界面、文字、品牌或水印。
- 桌面端使用独立 16:9 横版，手机端使用独立竖版，不使用横版机械裁切。
- 保留现有墨绿金色 UI、历史入口、按钮和全部计分流程。
- 首页在手机和桌面端保持一屏显示。

---

### Task 1: 生成并验证动漫插画资源

**Files:**
- Create: `pool-chase-score/assets/pool-table-home-anime.webp`
- Create: `pool-chase-score/assets/pool-table-home-anime-mobile.webp`

**Interfaces:**
- Consumes: `docs/superpowers/specs/2026-08-01-pool-chase-anime-home-design.md`
- Produces: 横版 `1600x900` WebP 与竖版 `900x1600` WebP，供 `<picture>` 和 Service Worker 引用。

- [ ] **Step 1: 使用内置 ImageGen 生成桌面横版**

```text
Use case: stylized-concept
Asset type: desktop homepage hero for a billiards scorekeeping web app
Primary request: three handsome young adult male friends playing Chinese eight-ball in a modern Chinese pool hall; the central player bends low and aims a precise shot while two friends watch with competitive focus.
Style/medium: premium 2D sports anime, crisp linework, polished cel shading, dynamic perspective, restrained speed lines, mature adult proportions.
Composition/framing: 16:9 landscape; all three adults visible; cue and green table form a strong diagonal; keep the lower center visually calm and slightly dark for a web-app button overlay.
Color palette: billiard green, deep ink green, warm amber and restrained red accents.
Constraints: no phone, no screen, no UI, no readable text, no logo, no watermark, no children; anatomically plausible hands; one complete cue; correct aiming relationship between bridge hand, cue and cue ball.
```

- [ ] **Step 2: 使用同一角色与场景方向生成手机竖版**

```text
Use case: stylized-concept
Asset type: mobile homepage hero for the same billiards scorekeeping web app
Primary request: the same scene and visual identity as the desktop asset: three handsome young adult male friends playing Chinese eight-ball; one player bends low and aims while two friends watch.
Style/medium: the same premium 2D sports-anime linework and cel shading.
Composition/framing: 9:16 portrait; preserve all three adults, the aiming action and enough green table; keep the lower center calm and dark for the primary button.
Color palette: billiard green, deep ink green, warm amber and restrained red accents.
Constraints: no phone, no screen, no UI, no readable text, no logo, no watermark, no children; plausible hands and billiards geometry.
```

- [ ] **Step 3: 检查两张原图**

使用 `view_image` 核查三位成年人、球杆、手架、母球关系、无手机和按钮留白。若任一项不合格，只针对该项重新生成一次。

- [ ] **Step 4: 转换为项目 WebP**

使用仓库已安装的 `sharp` 运行时，将横版输出调整为 `1600x900`，竖版输出调整为 `900x1600`，均使用 `fit: cover` 和高质量 WebP。运行：

```bash
file pool-chase-score/assets/pool-table-home-anime.webp \
  pool-chase-score/assets/pool-table-home-anime-mobile.webp
```

Expected: 第一张报告 `1600x900`，第二张报告 `900x1600`。

- [ ] **Step 5: 提交图片资源**

```bash
git add pool-chase-score/assets/pool-table-home-anime.webp \
  pool-chase-score/assets/pool-table-home-anime-mobile.webp
git commit -m "assets: add pool chase anime home art"
```

### Task 2: 用测试驱动替换首页资源

**Files:**
- Modify: `pool-chase-score/tests/ui-contract.test.js:32-39`
- Modify: `pool-chase-score/tests/browser/layout.spec.js:61-64`
- Modify: `pool-chase-score/index.html:26-31`
- Modify: `pool-chase-score/sw.js:1-16`
- Delete: `pool-chase-score/assets/pool-table-home-v2.webp`
- Delete: `pool-chase-score/assets/pool-table-home-v2-mobile.webp`

**Interfaces:**
- Consumes: `pool-table-home-anime.webp` and `pool-table-home-anime-mobile.webp`
- Produces: 首页与离线缓存统一引用动漫资源；旧图片不再被项目消费。

- [ ] **Step 1: 先更新静态契约测试**

将资源断言改为：

```js
assert.match(html, /assets\/pool-table-home-anime\.webp/);
assert.match(html, /assets\/pool-table-home-anime-mobile\.webp/);
assert.doesNotMatch(html, /pool-table-home-v2/);
```

将浏览器测试视口资源改为：

```js
{ width: 390, height: 844, asset: "pool-table-home-anime-mobile.webp" },
{ width: 1440, height: 900, asset: "pool-table-home-anime.webp" },
```

- [ ] **Step 2: 运行测试并确认先失败**

Run: `cd pool-chase-score && npm test`

Expected: 新动漫资源断言失败，因为 `index.html` 仍引用 `v2` 图片。

- [ ] **Step 3: 更新首页与缓存清单**

将首页图片改为：

```html
<picture>
  <source media="(max-width: 719px)" srcset="assets/pool-table-home-anime-mobile.webp" />
  <img src="assets/pool-table-home-anime.webp" alt="三位年轻球友在台球桌边专注追分对局" />
</picture>
```

将 `CACHE_NAME` 更新为 `pool-chase-score-v3`，并在 `APP_SHELL` 中仅缓存两张动漫资源。

- [ ] **Step 4: 删除旧图片并运行逻辑测试**

```bash
git rm pool-chase-score/assets/pool-table-home-v2.webp \
  pool-chase-score/assets/pool-table-home-v2-mobile.webp
cd pool-chase-score && npm test
```

Expected: `26` tests pass，`0` fail。

- [ ] **Step 5: 运行浏览器测试**

Run: `cd pool-chase-score && npm run test:browser`

Expected: `15` tests pass，手机加载竖版，桌面加载横版，页面高度等于视口高度。

- [ ] **Step 6: 提交功能替换**

```bash
git add pool-chase-score/index.html pool-chase-score/sw.js \
  pool-chase-score/tests/ui-contract.test.js \
  pool-chase-score/tests/browser/layout.spec.js
git commit -m "feat: use anime art on pool chase home"
```

### Task 3: 更新预览并发布验收

**Files:**
- Modify: `pool-chase-score/docs/images/pool-chase-score-preview.png`
- Modify: `pool-chase-score/README.md`

**Interfaces:**
- Consumes: 已完成的动漫首页。
- Produces: 与线上页面一致的 README 预览图和已部署的 GitHub Pages 页面。

- [ ] **Step 1: 生成 README 桌面预览图**

在 `980x551` 视口打开本地首页，等待动漫图片 `decode()` 完成后截图到：

```text
pool-chase-score/docs/images/pool-chase-score-preview.png
```

- [ ] **Step 2: 更新 README 图片替代文本**

```markdown
![台球追分计分台动漫竞技首页](docs/images/pool-chase-score-preview.png)
```

- [ ] **Step 3: 完成视觉与仓库检查**

```bash
git diff --check
git status --short
```

确认没有提交现存的 `AGENTS.md` 和 `docs/SKILLS_WORKFLOW.md` 改动。

- [ ] **Step 4: 提交预览图**

```bash
git add pool-chase-score/README.md \
  pool-chase-score/docs/images/pool-chase-score-preview.png
git commit -m "docs: refresh pool chase preview"
```

- [ ] **Step 5: 推送并等待 Pages**

```bash
git push origin main
gh run list --workflow pages.yml --limit 3
```

Expected: 最新 `HEAD` 对应的 Pages workflow 为 `completed / success`。

- [ ] **Step 6: 验收线上页面**

用 Playwright 分别以 `390x844` 和 `1440x900` 打开：

```text
https://jiaxuan-tao.github.io/vibe-coding-lab/pool-chase-score/
```

确认两种视口加载正确动漫资源、`body.scrollHeight === innerHeight`、历史入口唯一、开始按钮可进入设置页。
