const assets = __ASSET_MAP__;

const schemaStatements = [
  `CREATE TABLE IF NOT EXISTS site_settings (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL,
    updated_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS chapters (
    path TEXT PRIMARY KEY NOT NULL,
    slug TEXT NOT NULL,
    source_kind TEXT NOT NULL CHECK (source_kind IN ('static', 'custom')),
    track TEXT NOT NULL,
    group_name TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 999,
    title TEXT NOT NULL,
    subtitle TEXT NOT NULL DEFAULT '',
    summary TEXT NOT NULL DEFAULT '',
    patches_json TEXT,
    content_html TEXT,
    created_by TEXT NOT NULL,
    updated_by TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  )`,
  'CREATE UNIQUE INDEX IF NOT EXISTS idx_chapters_slug ON chapters (slug)',
  'CREATE INDEX IF NOT EXISTS idx_chapters_source_order ON chapters (source_kind, sort_order)',
  'CREATE INDEX IF NOT EXISTS idx_chapters_track_group_order ON chapters (track, group_name, sort_order)',
  `CREATE TABLE IF NOT EXISTS chapter_revisions (
    id TEXT PRIMARY KEY NOT NULL,
    chapter_path TEXT NOT NULL,
    snapshot_json TEXT NOT NULL,
    created_by TEXT NOT NULL,
    created_at INTEGER NOT NULL
  )`,
  'CREATE INDEX IF NOT EXISTS idx_revisions_chapter_created ON chapter_revisions (chapter_path, created_at)',
  `CREATE TABLE IF NOT EXISTS media (
    id TEXT PRIMARY KEY NOT NULL,
    object_key TEXT NOT NULL,
    filename TEXT NOT NULL,
    content_type TEXT NOT NULL,
    size_bytes INTEGER NOT NULL,
    owner_user_id TEXT NOT NULL,
    created_at INTEGER NOT NULL
  )`,
  'CREATE INDEX IF NOT EXISTS idx_media_owner_created ON media (owner_user_id, created_at)',
];

let schemaPromise;

function decodeBase64(value) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  });
}

function normalizePath(value) {
  let pathname = String(value || '/').split('?')[0].split('#')[0];
  if (!pathname.startsWith('/')) pathname = `/${pathname}`;
  pathname = pathname.replace(/\/{2,}/g, '/');
  if (pathname !== '/' && !pathname.endsWith('/')) pathname += '/';
  return pathname;
}

function getUser(request) {
  const id = request.headers.get('oai-authenticated-user-id');
  if (!id) return null;
  return {
    id,
    email: request.headers.get('oai-authenticated-user-email') || '',
  };
}

async function ensureSchema(env) {
  if (!env.DB) return false;
  if (!schemaPromise) {
    schemaPromise = (async () => {
      await env.DB.batch(schemaStatements.map((statement) => env.DB.prepare(statement)));
      await env.DB.prepare('PRAGMA optimize').run();
    })().catch((error) => {
      schemaPromise = undefined;
      throw error;
    });
  }
  await schemaPromise;
  return true;
}

async function editorStatus(request, env) {
  const user = getUser(request);
  const owner = await env.DB.prepare("SELECT value FROM site_settings WHERE key = 'owner_user_id'").first();
  return {
    user,
    ownerId: owner?.value || null,
    canEdit: Boolean(user && (!owner?.value || owner.value === user.id)),
  };
}

async function requireEditor(request, env) {
  const user = getUser(request);
  if (!user) return { response: json({ error: '需要登录后才能编辑。' }, 401) };
  const now = Date.now();
  await env.DB.prepare(
    "INSERT OR IGNORE INTO site_settings (key, value, updated_at) VALUES ('owner_user_id', ?, ?)",
  ).bind(user.id, now).run();
  const owner = await env.DB.prepare("SELECT value FROM site_settings WHERE key = 'owner_user_id'").first();
  if (!owner || owner.value !== user.id) {
    return { response: json({ error: '当前账号没有此站点的编辑权限。' }, 403) };
  }
  return { user };
}

function verifySameOrigin(request) {
  const origin = request.headers.get('origin');
  if (!origin) return true;
  return origin === new URL(request.url).origin;
}

function sanitizeHtml(input) {
  return String(input || '')
    .slice(0, 1_500_000)
    .replace(/<\s*(script|style|iframe|object|embed|form)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, '')
    .replace(/<\s*(script|style|iframe|object|embed|form)[^>]*\/?>/gi, '')
    .replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/\s(href|src)\s*=\s*(["'])\s*javascript:[\s\S]*?\2/gi, '');
}

function sanitizePatches(value) {
  const patches = value && typeof value === 'object' ? value : {};
  const fields = {};
  for (const [key, html] of Object.entries(patches.fields || {})) {
    if (!/^(title|subtitle|summary|body-\d+)$/.test(key)) continue;
    fields[key] = sanitizeHtml(html);
  }
  const inserts = Array.isArray(patches.inserts)
    ? patches.inserts.slice(0, 100).map((item) => ({
        id: String(item.id || crypto.randomUUID()).slice(0, 100),
        afterKey: String(item.afterKey || '').slice(0, 100),
        html: sanitizeHtml(item.html),
      }))
    : [];
  return { fields, inserts };
}

function chapterPayload(row) {
  if (!row) return null;
  return {
    path: row.path,
    slug: row.slug,
    sourceKind: row.source_kind,
    track: row.track,
    group: row.group_name,
    order: row.sort_order,
    title: row.title,
    subtitle: row.subtitle,
    summary: row.summary,
    patches: row.patches_json ? JSON.parse(row.patches_json) : null,
    contentHtml: row.content_html,
    updatedAt: row.updated_at,
  };
}

async function readJson(request) {
  const text = await request.text();
  if (text.length > 2_000_000) throw new Error('请求内容过大。');
  return JSON.parse(text || '{}');
}

async function handleApi(request, env, url) {
  if (!(await ensureSchema(env))) return json({ error: '内容存储尚未配置。' }, 503);

  if (url.pathname === '/api/editor/me' && request.method === 'GET') {
    const status = await editorStatus(request, env);
    return json({ authenticated: Boolean(status.user), canEdit: status.canEdit, user: status.user });
  }

  if (url.pathname === '/api/editor/chapters' && request.method === 'GET') {
    const result = await env.DB.prepare(
      'SELECT path, slug, source_kind, track, group_name, sort_order, title, subtitle, summary, updated_at FROM chapters ORDER BY sort_order, updated_at',
    ).all();
    return json({ chapters: (result.results || []).map(chapterPayload) });
  }

  if (url.pathname === '/api/editor/state' && request.method === 'GET') {
    const path = normalizePath(url.searchParams.get('path'));
    const row = await env.DB.prepare('SELECT * FROM chapters WHERE path = ?').bind(path).first();
    return json({ chapter: chapterPayload(row) });
  }

  if (url.pathname === '/api/editor/pages' && request.method === 'POST') {
    if (!verifySameOrigin(request)) return json({ error: '请求来源无效。' }, 403);
    const authorization = await requireEditor(request, env);
    if (authorization.response) return authorization.response;
    let input;
    try {
      input = await readJson(request);
    } catch (error) {
      return json({ error: error.message || '无法读取保存内容。' }, 400);
    }

    const path = normalizePath(input.path);
    const sourceKind = input.sourceKind === 'custom' ? 'custom' : 'static';
    const slug = String(input.slug || path.split('/').filter(Boolean).at(-1) || '').toLowerCase();
    const track = String(input.track || 'eeg').slice(0, 80);
    const group = String(input.group || '自定义章节').slice(0, 120);
    const title = String(input.title || '').trim().slice(0, 200);
    const subtitle = String(input.subtitle || '').trim().slice(0, 300);
    const summary = String(input.summary || '').trim().slice(0, 1200);
    const order = Number.isFinite(Number(input.order)) ? Math.round(Number(input.order)) : 999;

    if (!path.startsWith('/chapters/') || !/^[a-z0-9-]+$/.test(slug) || !title) {
      return json({ error: '章节路径、slug 或标题无效。' }, 400);
    }
    if (sourceKind === 'custom' && assets[path.slice(0, -1) + '/index.html']) {
      return json({ error: '该路径已被内置章节占用。' }, 409);
    }

    const existing = await env.DB.prepare('SELECT * FROM chapters WHERE path = ?').bind(path).first();
    if (existing && input.expectedUpdatedAt && Number(input.expectedUpdatedAt) !== Number(existing.updated_at)) {
      return json({ error: '该章节已在其他位置更新，请刷新后重试。' }, 409);
    }
    const slugConflict = await env.DB.prepare('SELECT path FROM chapters WHERE slug = ? AND path != ?').bind(slug, path).first();
    if (slugConflict) return json({ error: '这个 slug 已被其他章节使用。' }, 409);

    const now = Date.now();
    if (existing) {
      await env.DB.prepare(
        'INSERT INTO chapter_revisions (id, chapter_path, snapshot_json, created_by, created_at) VALUES (?, ?, ?, ?, ?)',
      ).bind(crypto.randomUUID(), path, JSON.stringify(chapterPayload(existing)), authorization.user.id, now).run();
    }

    const patchesJson = sourceKind === 'static' ? JSON.stringify(sanitizePatches(input.patches)) : null;
    const contentHtml = sourceKind === 'custom' ? sanitizeHtml(input.contentHtml) : null;
    const createdAt = existing?.created_at || now;
    const createdBy = existing?.created_by || authorization.user.id;
    await env.DB.prepare(
      `INSERT INTO chapters (
        path, slug, source_kind, track, group_name, sort_order, title, subtitle, summary,
        patches_json, content_html, created_by, updated_by, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(path) DO UPDATE SET
        slug = excluded.slug,
        source_kind = excluded.source_kind,
        track = excluded.track,
        group_name = excluded.group_name,
        sort_order = excluded.sort_order,
        title = excluded.title,
        subtitle = excluded.subtitle,
        summary = excluded.summary,
        patches_json = excluded.patches_json,
        content_html = excluded.content_html,
        updated_by = excluded.updated_by,
        updated_at = excluded.updated_at`,
    ).bind(
      path, slug, sourceKind, track, group, order, title, subtitle, summary,
      patchesJson, contentHtml, createdBy, authorization.user.id, createdAt, now,
    ).run();

    const saved = await env.DB.prepare('SELECT * FROM chapters WHERE path = ?').bind(path).first();
    return json({ chapter: chapterPayload(saved) });
  }

  if (url.pathname === '/api/editor/media' && request.method === 'POST') {
    if (!verifySameOrigin(request)) return json({ error: '请求来源无效。' }, 403);
    const authorization = await requireEditor(request, env);
    if (authorization.response) return authorization.response;
    if (!env.MEDIA) return json({ error: '图片存储尚未配置。' }, 503);
    const form = await request.formData();
    const file = form.get('file');
    if (!file || typeof file.arrayBuffer !== 'function') return json({ error: '请选择图片文件。' }, 400);
    const allowedTypes = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/avif']);
    if (!allowedTypes.has(file.type)) return json({ error: '仅支持 PNG、JPEG、WebP、GIF 或 AVIF。' }, 400);
    if (file.size > 10 * 1024 * 1024) return json({ error: '单张图片不能超过 10 MB。' }, 413);
    const id = crypto.randomUUID();
    const safeName = String(file.name || 'image').replace(/[^a-zA-Z0-9._-]+/g, '-').slice(-120);
    const objectKey = `${authorization.user.id}/${id}-${safeName}`;
    await env.MEDIA.put(objectKey, await file.arrayBuffer(), {
      httpMetadata: { contentType: file.type },
      customMetadata: { originalName: String(file.name || 'image') },
    });
    const now = Date.now();
    await env.DB.prepare(
      'INSERT INTO media (id, object_key, filename, content_type, size_bytes, owner_user_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    ).bind(id, objectKey, String(file.name || 'image'), file.type, file.size, authorization.user.id, now).run();
    return json({ media: { id, url: `/media/${id}`, filename: String(file.name || 'image') } }, 201);
  }

  return json({ error: 'Not Found' }, 404);
}

async function serveMedia(env, id) {
  if (!(await ensureSchema(env)) || !env.MEDIA) return new Response('Not Found', { status: 404 });
  const row = await env.DB.prepare('SELECT * FROM media WHERE id = ?').bind(id).first();
  if (!row) return new Response('Not Found', { status: 404 });
  const object = await env.MEDIA.get(row.object_key);
  if (!object) return new Response('Not Found', { status: 404 });
  return new Response(object.body, {
    headers: {
      'content-type': row.content_type,
      'cache-control': 'private, max-age=31536000, immutable',
    },
  });
}

function findAsset(pathname) {
  const candidates = pathname === '/'
    ? ['/index.html']
    : pathname.endsWith('/')
    ? [pathname.slice(0, -1) + '/index.html']
    : [pathname, pathname + '/index.html'];
  return candidates.find((candidate) => assets[candidate]);
}

function assetResponse(pathname) {
  const asset = assets[pathname];
  return new Response(decodeBase64(asset.body), {
    headers: {
      'content-type': asset.contentType,
      'x-content-type-options': 'nosniff',
    },
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api/editor/')) return handleApi(request, env, url);
    if (url.pathname.startsWith('/media/')) return serveMedia(env, url.pathname.split('/').filter(Boolean).at(-1));

    const pathname = findAsset(url.pathname);
    if (pathname) return assetResponse(pathname);

    if (env.DB && url.pathname.startsWith('/chapters/')) {
      await ensureSchema(env);
      const customPath = normalizePath(url.pathname);
      const chapter = await env.DB.prepare(
        "SELECT path FROM chapters WHERE path = ? AND source_kind = 'custom'",
      ).bind(customPath).first();
      if (chapter && assets['/editor-shell/index.html']) return assetResponse('/editor-shell/index.html');
    }

    return new Response('Not Found', { status: 404 });
  },
};
