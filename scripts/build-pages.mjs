import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// GitHub Pages serves files only. Keep the Sites Worker build and editor intact.
const project = fileURLToPath(new URL('..', import.meta.url));
const astro = fileURLToPath(new URL('../node_modules/astro/bin/astro.mjs', import.meta.url));
const result = spawnSync(process.execPath, [astro, 'build', '--outDir', './dist-pages'], {
  cwd: project,
  env: {
    ...process.env,
    SITE_URL: process.env.SITE_URL || 'https://wang-shinan.github.io',
    SITE_BASE: process.env.SITE_BASE || '/eeg-atlas',
    PUBLIC_CONTENT_EDITOR: 'false',
  },
  stdio: 'inherit',
});
if (result.error) throw result.error;
process.exit(result.status ?? 1);
