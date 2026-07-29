// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import tailwindcss from '@tailwindcss/vite';
import rehypeBaseLinks from './plugins/rehype-base-links.mjs';

// GitHub Pages project sites are served from a subdirectory. Both values are
// overridable so a custom domain (base `/`) needs no code change.
const site = process.env.SITE_URL ?? 'https://wang-shinan.github.io';
const base = process.env.SITE_BASE ?? '/eeg-atlas';

// https://astro.build/config
export default defineConfig({
  site,
  base,
  trailingSlash: 'always',
  integrations: [mdx()],
  vite: {
    plugins: [tailwindcss()],
  },
  markdown: {
    shikiConfig: { theme: 'github-light', wrap: true },
    rehypePlugins: [[rehypeBaseLinks, { base }]],
  },
});
