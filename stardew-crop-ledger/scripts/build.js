import { cp, mkdir, rm, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const root = new URL('../', import.meta.url);
const dist = new URL('../dist/', import.meta.url);
await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });
for (const file of ['index.html', 'styles.css', 'app.js', 'engine.js', 'settings.js', 'icons.js', 'calculation-client.js', 'calculation-worker.js', 'assets', 'vendor', 'docs', 'LICENSE', 'THIRD_PARTY_NOTICES.md']) {
  await stat(new URL(file, root));
  await cp(new URL(file, root), new URL(file, dist), { recursive: true });
}
console.log(`Static production build: ${fileURLToPath(dist)}`);
