import {readFileSync, writeFileSync, existsSync, readdirSync, mkdirSync, statSync} from 'node:fs';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const lock = JSON.parse(readFileSync(join(root, 'package-lock.json'), 'utf8'));
let output = 'Third-party dependency license texts\nVersions: see package-lock.json\n\n';
for (const [path, meta] of Object.entries(lock.packages)) {
  if (!path || meta.dev) continue;
  const dir = join(root, path);
  if (!existsSync(dir)) continue;
  for (const file of readdirSync(dir).filter((name) => /^(LICEN[CS]E|NOTICE|OFL|COPYING)(\.|$|-)/i.test(name))) {
    const source = join(dir, file);
    if (!statSync(source).isFile()) continue;
    output += `\n--- ${path}@${meta.version} / ${file} ---\n\n${readFileSync(source, 'utf8')}\n`;
  }
}
mkdirSync(join(root, 'public/licenses'), {recursive: true});
writeFileSync(join(root, 'public/licenses/THIRD_PARTY-LICENSES.txt'), output.trimEnd() + '\n');
