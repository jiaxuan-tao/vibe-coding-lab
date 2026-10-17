import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { type Plugin, defineConfig } from "vite";

// Public address of the site, used for canonical links, the sitemap and share
// previews. Set SITE_URL when building your own copy.
const SITE_URL = 'https://jiaxuan-tao.github.io/vibe-coding-lab/text-compare/';
const entries: Record<string, object> = {
  'json-compare': {lang: 'JSON'}, 'pdf-compare': {prose: true},
  'word-compare': {prose: true}, 'excel-compare': {data: true},
  'image-compare': {image: true}, 'code-compare': {},
};

/** Renders the home page content, then writes one page per landing page plus sitemap.xml and robots.txt. */
function seoPages(): Plugin {
  let outDir = "dist";
  return {
    name: "seo-pages",
    configResolved(config) {
      outDir = resolve(config.root, config.build.outDir);
    },
    transformIndexHtml: {
      order: "pre",
      handler: (html) => html.replace(/<!--seo:head-->[\s\S]*?<!--\/seo:head-->/,
        `<title>文本对比台 · Text Compare</title><meta name="description" content="中文与英文文本、文档、图片对比工具。内容在浏览器本地处理。"><link rel="canonical" href="${SITE_URL}">`),
    },
    closeBundle() {
      const home = readFileSync(join(outDir, "index.html"), "utf8");
      for (const [slug, start] of Object.entries(entries)) {
        const html = home.replace('<!--seo:config--><!--/seo:config-->', `<script type="application/json" id="page-config">${JSON.stringify({start})}</script>`)
          .replace(/(href|src|content)="\.\//g, '$1="../')
          .replace(`href="${SITE_URL}"`, `href="${SITE_URL}${slug}/"`);
        mkdirSync(join(outDir, slug), { recursive: true });
        writeFileSync(join(outDir, slug, "index.html"), html);
      }
      const today = new Date().toISOString().slice(0, 10);
      writeFileSync(
        join(outDir, "sitemap.xml"),
        `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
          ['', ...Object.keys(entries).map((slug) => slug + '/')].map((slug) => `  <url><loc>${SITE_URL}${slug}</loc><lastmod>${today}</lastmod></url>`).join("\n") +
          `\n</urlset>\n`,
      );
      for (const file of ['LICENSE', 'NOTICE']) writeFileSync(join(outDir, file), readFileSync(file));
      const version = createHash('sha256').update(home).update(readdirSync(join(outDir, 'assets')).sort().join('\n')).digest('hex').slice(0, 12);
      writeFileSync(join(outDir, 'sw.js'), readFileSync('public/sw.js', 'utf8').replace('BUILD_VERSION', version));
    },
  };
}

export default defineConfig({
  base: "./",
  plugins: [seoPages()],
  server: { host: '127.0.0.1', port: 5192 },
  preview: { port: 8785 },
  build: {
    target: "es2022",
    chunkSizeWarningLimit: 1500,
  },
  test: { include: ["tests/**/*.test.ts"] },
} as any);
