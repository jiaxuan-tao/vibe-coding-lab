# 视觉素材记录

采用已确认的「像素农场经营台」方案。全部界面文字使用深棕、棕灰、绿色或高对比浅色，不使用纯黑字体。标题使用 Fusion Pixel，正文和数字使用系统字体。

## 生成方式

通过 Codex 内置 ImageGen 生成，不使用 CLI、额外付费接口或手绘替代。以已确认视觉稿为风格参考；真实 UI 使用 HTML/CSS，不把生成的界面截图作为可交互页面。

## 素材

- `assets/farm-landscape.png`：1536 × 1024，昼间像素农场场景。
- `assets/ledger-frame.png`：1024 × 1024，空白木框，作为九宫格边框使用。
- `assets/crops/`：原项目随附的实际作物图标，保持像素锐度。
- `assets/fonts/`：Fusion Pixel Font 官方发布文件及许可。

## 背景提示词

```text
Use case: stylized-concept. Production raster landscape background for a Stardew crop ledger Web app, NOT an interface mockup. Use selected desktop image as style and landscape reference only. Full-bleed opaque 1536x1024 landscape: bright azure daytime sky, crisp pixel clouds, layered blue/green mountains, lush detailed trees at side edges, rustic fence across upper midground, small wooden cottage at far right with red roof and blue windows, vivid grass and vegetable garden along bottom. Concentrate detail in top230px and side edges, calm uninterrupted green center for opaque HTML UI. Match dense polished16-bit farming-game pixel clusters, stepped silhouettes, coherent pixel scale. Green and blue dominate, restrained wood accents. NO UI, text, letters, numbers, signs, logos, watermark, buttons, tabs, panels, crop cutouts, characters, animals or people.
```

## 木框提示词

```text
Use case: stylized-concept. One production raster nine-slice wooden ledger frame texture, NOT a UI screenshot. Use selected desktop reference's amber wooden ledger borders and parchment. Opaque1024x1024 square, flat orthographic front view, blank pale warm offwhite parchment interior and substantial layered wooden frame on all four canvas edges. Frame about48px thick; dark brown outer outline, amber bevel, timber, recessed inner bevel and small dull iron corner nails all within64px perimeter. Consistent straight edges, restrained grain for border-image stretching. Crisp square16-bit pixel clusters, no photographic texture or smooth3D. No text, numbers, symbols, icons, crops, plants, characters, buttons, internal divisions, charts, tabs, scenery or outside shadow.
```

木框生成原图为1254 ×1254，用最近邻重采样规范为1024 ×1024。未新增或重绘内容。
