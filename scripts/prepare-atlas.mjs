import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('..', import.meta.url));
const output = path.join(root, 'public/atlas/data/atlas.json');
const marker = path.join(root, 'public/atlas/data/build.json');
const digest = value => createHash('sha256').update(value).digest('hex');
const recipe = digest(Buffer.concat(['scripts/export-electrode-atlas.py', 'scripts/requirements-atlas.txt'].map(p => readFileSync(path.join(root, p)))));
let valid = false;
try {
  const saved = JSON.parse(readFileSync(marker, 'utf8'));
  valid = saved.recipe === recipe && existsSync(output) && saved.output === digest(readFileSync(output));
} catch { /* Missing/stale assets need a reproducible rebuild. */ }
if (!valid) {
  const result = spawnSync(process.env.PYTHON || 'python3', ['scripts/export-electrode-atlas.py'], { cwd: root, stdio: 'inherit' });
  if (result.error || result.status !== 0) {
    console.error('\nAtlas preparation failed. Install build-only dependencies first:\n  python3 -m pip install -r scripts/requirements-atlas.txt\nNo illustrative/fake coordinates will be substituted.');
    process.exit(1);
  }
  writeFileSync(marker, JSON.stringify({ recipe, output: digest(readFileSync(output)) }) + '\n');
}
console.log('Atlas assets ready (self-contained static JSON; no browser CDN).');
