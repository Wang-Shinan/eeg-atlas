import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';

class FakePreparedStatement {
  constructor(database, sql) {
    this.database = database;
    this.sql = sql;
    this.values = [];
  }

  bind(...values) {
    this.values = values;
    return this;
  }

  async run() {
    const result = this.database.prepare(this.sql).run(...this.values);
    return { success: true, meta: { changes: Number(result.changes || 0) } };
  }

  async first() {
    return this.database.prepare(this.sql).get(...this.values) ?? null;
  }

  async all() {
    return { results: this.database.prepare(this.sql).all(...this.values) };
  }
}

class FakeD1 {
  constructor() {
    this.database = new DatabaseSync(':memory:');
  }

  prepare(sql) {
    return new FakePreparedStatement(this.database, sql);
  }

  async batch(statements) {
    const results = [];
    for (const statement of statements) results.push(await statement.run());
    return results;
  }
}

class FakeR2 {
  constructor() {
    this.objects = new Map();
  }

  async put(key, value, options = {}) {
    this.objects.set(key, { value: new Uint8Array(value), options });
  }

  async get(key) {
    const object = this.objects.get(key);
    if (!object) return null;
    return { body: object.value, httpMetadata: object.options.httpMetadata || {} };
  }
}

const worker = (await import('../dist/server/index.js')).default;
const env = { DB: new FakeD1(), MEDIA: new FakeR2() };
const origin = 'https://eeg-atlas.test';
const authHeaders = {
  origin,
  'oai-authenticated-user-id': 'owner-1',
  'oai-authenticated-user-email': 'owner@example.com',
};

const home = await worker.fetch(new Request(`${origin}/`), env);
assert.equal(home.status, 200);

const me = await worker.fetch(new Request(`${origin}/api/editor/me`, { headers: authHeaders }), env);
assert.equal(me.status, 200);
assert.equal((await me.json()).canEdit, true);

const customChapter = {
  path: '/chapters/custom/smoke-test/',
  slug: 'smoke-test',
  sourceKind: 'custom',
  track: 'custom',
  group: '测试',
  order: 901,
  title: '站内编辑冒烟测试',
  subtitle: '可持久保存',
  summary: '测试摘要',
  contentHtml: '<h2>测试内容</h2><p>正文</p>',
};
const create = await worker.fetch(new Request(`${origin}/api/editor/pages`, {
  method: 'POST',
  headers: { ...authHeaders, 'content-type': 'application/json' },
  body: JSON.stringify(customChapter),
}), env);
assert.equal(create.status, 200, await create.clone().text());

const state = await worker.fetch(new Request(`${origin}/api/editor/state?path=%2Fchapters%2Fcustom%2Fsmoke-test%2F`, {
  headers: authHeaders,
}), env);
assert.equal((await state.json()).chapter.title, customChapter.title);

const customPage = await worker.fetch(new Request(`${origin}/chapters/custom/smoke-test/`, { headers: authHeaders }), env);
assert.equal(customPage.status, 200);
assert.match(await customPage.text(), /data-editor-custom-content/);

const form = new FormData();
form.append('file', new File([new Uint8Array([137, 80, 78, 71])], 'test.png', { type: 'image/png' }));
const upload = await worker.fetch(new Request(`${origin}/api/editor/media`, {
  method: 'POST',
  headers: authHeaders,
  body: form,
}), env);
const uploaded = await upload.json();
assert.equal(upload.status, 201, JSON.stringify(uploaded));
const media = await worker.fetch(new Request(`${origin}${uploaded.media.url}`, { headers: authHeaders }), env);
assert.equal(media.status, 200);
assert.equal(media.headers.get('content-type'), 'image/png');

console.log('Content Studio smoke test passed.');
