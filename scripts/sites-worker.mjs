import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { extname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectDir = fileURLToPath(new URL('../', import.meta.url));
const distDir = join(projectDir, 'dist');
const outputDir = join(distDir, 'server');
const workerTemplatePath = join(projectDir, 'worker', 'editor-worker.mjs');

const mimeTypes = {
  '.avif': 'image/avif',
  '.css': 'text/css; charset=utf-8',
  '.gif': 'image/gif',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
};

async function collectFiles(directory) {
  const entries = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const absolutePath = join(directory, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'server') entries.push(...(await collectFiles(absolutePath)));
      continue;
    }
    entries.push(absolutePath);
  }
  return entries;
}

const assets = {};
for (const absolutePath of await collectFiles(distDir)) {
  const pathname = `/${relative(distDir, absolutePath).split('\\').join('/')}`;
  assets[pathname] = {
    contentType: mimeTypes[extname(absolutePath)] ?? 'application/octet-stream',
    body: (await readFile(absolutePath)).toString('base64'),
  };
}

const template = await readFile(workerTemplatePath, 'utf8');
const output = template.replace('__ASSET_MAP__', JSON.stringify(assets));
if (output === template) throw new Error('Worker template is missing __ASSET_MAP__.');

await mkdir(outputDir, { recursive: true });
await writeFile(join(outputDir, 'index.js'), output);
