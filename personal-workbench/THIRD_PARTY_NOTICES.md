# Sources and Permissions

## Upstream Application

- Project: [TMJ97-10/workbench](https://github.com/TMJ97-10/workbench)
- Revision: `cff3aacc2770d6ddee810528b276033c80217d76`
- Reused: module/view structure, shared layout, form/editor and chart foundations, stock-format parsing and spreadsheet helpers.
- Authorization basis: the owner of this adaptation reports having obtained the original author's permission to reproduce and modify the product for this repository. No independent verification of the private permission was performed.
- The upstream repository has no general open-source license at the referenced revision. This directory does not grant a new blanket license over upstream-owned code or assets. Others seeking to reuse upstream portions should obtain the applicable permission.
- Changes include local-only transactional storage, monochrome themes, input/backup safeguards, scoped offline caching, safe public-data reads, mobile navigation, tests and deployment integration. This is an adaptation, not a claim that the upstream implementation is wholly original work by Jiaxuan Tao.

## SheetJS Community Edition

- Vendored file: `vendor/xlsx.full.min.js`, version **0.20.3**.
- Official distribution: <https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js>
- Copyright SheetJS LLC and contributors. Distributed under Apache License 2.0; full text retained in [vendor/SHEETJS-LICENSE.txt](vendor/SHEETJS-LICENSE.txt).
- Upstream's bundled spreadsheet library was replaced with this official distribution; its original embedded copyright notices remain.

## Public Data and External Links

Open-Meteo provides weather data; its attribution is linked from the information panel. Public hot-list endpoints and quote endpoints are third-party services, not guaranteed application infrastructure. AI site names and other trademarks belong to their respective owners. No ownership of third-party content, branding or public data is claimed.
