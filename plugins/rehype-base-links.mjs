import { visit } from 'unist-util-visit';

/**
 * Prefixes root-relative links inside Markdown/MDX with the site's base path.
 *
 * Astro rewrites links written in `.astro` files (via `import.meta.env.BASE_URL`),
 * but a plain `[text](/chapters/…)` in content is emitted verbatim and would 404
 * when the site is served from a subdirectory such as `/eeg-atlas`.
 */
export default function rehypeBaseLinks({ base = '/' } = {}) {
  const prefix = base.replace(/\/+$/, '');

  return (tree) => {
    if (prefix === '') return;

    visit(tree, 'element', (node) => {
      if (node.tagName !== 'a') return;

      const href = node.properties?.href;
      if (typeof href !== 'string') return;

      // Leave protocol-relative URLs, anchors, and already-prefixed paths alone.
      if (!href.startsWith('/') || href.startsWith('//') || href.startsWith(`${prefix}/`)) return;

      node.properties.href = prefix + href;
    });
  };
}
