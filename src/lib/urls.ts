/**
 * Joins a root-relative path onto the configured base path.
 *
 * `import.meta.env.BASE_URL` is `/` for a root deployment and `/eeg-atlas/`
 * for a project site, so every internal link has to go through here rather
 * than hard-coding a leading slash.
 */
export function withBase(path = '/'): string {
  const prefix = import.meta.env.BASE_URL.replace(/\/+$/, '');
  const suffix = path.replace(/^\/+/, '');
  return suffix === '' ? `${prefix}/` : `${prefix}/${suffix}`;
}
