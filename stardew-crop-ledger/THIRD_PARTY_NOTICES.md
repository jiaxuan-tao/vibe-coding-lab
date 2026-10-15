# Third-Party Notices

## Stardew-Profits

计算函数、预测模型及作物数据来源于 [Thorinair/Stardew-Profits](https://github.com/Thorinair/Stardew-Profits)，固定版本 `bc8b72255e6960360415de9736756496971ccdcf`（页面标注 Stardew Profits 1.7.5 / Stardew Valley 1.6.15）。

原 MIT 许可保存在 [`vendor/LICENSE.txt`](vendor/LICENSE.txt)。计算代码被隔离为无 DOM、D3 依赖的模块，加入输入校验、独立随机种子和回归测试；修正预测加工、品质扣减、留种守恒、植物学家与咖啡批次单位等错误，详见 [计算修正说明](docs/calculation-notes.md)。界面、中文交互与本地设置管理重新实现。作物数据文件原注释另记录其基础来源为 `polarstoat/stardew-crop-data` 的修改版本。

## Stardew Valley Assets

`assets/crops/` 中的作物和金币像素素材随原项目提供。Stardew Valley 及游戏素材版权归 ConcernedApe；原项目的 MIT 代码许可不改变游戏素材版权。本工具为非官方、非商业玩家工具，不表示获得 ConcernedApe 的官方授权。商业使用或重新分发游戏素材前需另行核实授权。

## Lucide

`icons.js` 复用本仓库计分台使用的 Lucide 图标路径，采用 ISC License。

Copyright (c) for portions of Lucide are held by Cole Bemis 2013-2022 as part of Feather (MIT). All other copyright (c) for Lucide are held by Lucide Contributors 2022.

Permission to use, copy, modify, and/or distribute this software for any purpose with or without fee is hereby granted, provided that the above copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.

## Generated Landscape

`assets/farm-landscape.png` 通过内置 ImageGen 生成，按已确认的像素农场视觉稿制作，不是从游戏导出的场景。提示词及制作记录见 [`docs/visual-assets.md`](docs/visual-assets.md)。

## Fusion Pixel Font

标题使用 [TakWolf/Fusion Pixel Font](https://github.com/TakWolf/fusion-pixel-font) 的简体中文 12px proportional 字体，官方发布版本 `2026.09.25`。采用 SIL Open Font License 1.1；原始许可与所含字形来源许可一起保存在 `assets/fonts/OFL.txt` 和 `assets/fonts/LICENSES/`。字体未修改，正文使用系统字体。
