/** Build-time sample export, using the same Python environment as the electrode atlas. */
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
const root = fileURLToPath(new URL('..', import.meta.url));
const output = new URL('../public/reading/real-eeg.json', import.meta.url);
const fixture = new URL('../public/reading/scipy-reference.json', import.meta.url);
function valid() {
  if (!existsSync(output) || !existsSync(fixture)) return false;
  let d, reference;
  try { d = JSON.parse(readFileSync(output, 'utf8')); reference = JSON.parse(readFileSync(fixture, 'utf8')); } catch { return false; }
  return reference.selections?.length === 3 && d.schemaVersion === 1 && d.unit === 'µV' && d.sampleRate === 160 && d.values?.length === 19 &&
    d.values.every(v => v.length === 1920 && v.every(Number.isFinite)) &&
    d.provenance?.sourceSHA256 === '31a95e0a880e6c3d89960d9d62c144f24cc4e9f5d7e93c7f864ef61cd49e847e';
}
if (!valid()) {
  const python = process.env.PYTHON || (process.platform === 'win32' ? 'python' : 'python3');
  const result = spawnSync(python, ['scripts/export-reading-sample.py'], { cwd: root, stdio: 'inherit' });
  if (result.error || result.status !== 0 || !valid()) throw new Error('Reading sample export failed. Install scripts/requirements-atlas.txt in Python; set PYTHON to its executable.');
}
