/** A small, dependency-free WebGL viewer. Coordinates are never fitted or jittered. */
type Vec3 = [number, number, number];
type Mesh = { name: string; positions: number[]; triangles: number[] };
type Montage = { id: string; family: string; label: string; count: number; names: string[]; positions: Vec3[]; nativeFrame: string; note: string };
type Atlas = { schemaVersion: number; units: string; coordinateFrame: string; versions: Record<string, string>; montages: Montage[]; meshes: Mesh[]; fiducials: { name: string; position: Vec3 }[] };
type Electrode = { key: string; name: string; montage: Montage; position: Vec3; color: Vec3 };
type Projected = { x: number; y: number; z: number; electrode: Electrode };
const colors: Record<string, Vec3> = { '10–20': [.34, .85, .73], '10–10': [.98, .76, .32], BioSemi: [.42, .68, 1], HydroCel: [.97, .56, .77] };
const center: Vec3 = [0, .012, .025];
const finite = (a: unknown): a is number[] => Array.isArray(a) && a.every(v => typeof v === 'number' && Number.isFinite(v));

export function validateAtlas(value: unknown): Atlas {
  const a = value as Atlas;
  if (!a || a.schemaVersion !== 1 || a.units !== 'm' || a.coordinateFrame !== 'head' || !Array.isArray(a.montages) || !Array.isArray(a.meshes) || !Array.isArray(a.fiducials)) throw new Error('图谱数据版本或坐标系不匹配。');
  for (const m of a.montages) {
    if (!m.id || !colors[m.family] || !Array.isArray(m.names) || m.names.length !== m.positions?.length || m.count !== m.names.length || new Set(m.names).size !== m.count) throw new Error('电极名称与位置条目不匹配。');
    for (const p of m.positions) if (!finite(p) || p.length !== 3 || p.some(v => Math.abs(v) > .5)) throw new Error('电极坐标或单位不合法。');
  }
  for (const m of a.meshes) {
    if (!finite(m.positions) || m.positions.length % 3 || !finite(m.triangles) || m.triangles.length % 3 || m.triangles.some(v => !Number.isInteger(v) || v < 0 || v >= m.positions.length / 3)) throw new Error('表面网格不合法。');
    if (m.positions.length / 3 >= 65536) throw new Error('表面网格超出当前查看器的索引范围。');
  }
  return a;
}

function normals(mesh: Mesh): Float32Array {
  const p = mesh.positions, t = mesh.triangles, n = new Float32Array(p.length);
  for (let i = 0; i < t.length; i += 3) {
    const a = t[i] * 3, b = t[i + 1] * 3, c = t[i + 2] * 3;
    const u = [p[b] - p[a], p[b + 1] - p[a + 1], p[b + 2] - p[a + 2]];
    const v = [p[c] - p[a], p[c + 1] - p[a + 1], p[c + 2] - p[a + 2]];
    const cross = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
    for (const index of [a, b, c]) for (let k = 0; k < 3; k++) n[index + k] += cross[k];
  }
  for (let i = 0; i < n.length; i += 3) {
    const length = Math.hypot(n[i], n[i + 1], n[i + 2]) || 1;
    for (let k = 0; k < 3; k++) n[i + k] /= length;
  }
  return n;
}

function makeRenderer(canvas: HTMLCanvasElement, data: Atlas) {
  const context = canvas.getContext('webgl', { alpha: false, antialias: true, preserveDrawingBuffer: true });
  if (!context) throw new Error('当前浏览器无法启用 WebGL；下方电极列表和坐标仍可使用。');
  const gl = context;
  const buffers: WebGLBuffer[] = [], programs: WebGLProgram[] = [], shaders: WebGLShader[] = [];
  function buffer(array: Float32Array | Uint16Array, target: number) {
    const b = gl.createBuffer(); if (!b) throw new Error('无法分配图形缓冲区。');
    buffers.push(b); gl.bindBuffer(target, b); gl.bufferData(target, array, gl.STATIC_DRAW); return b;
  }
  function program(vertex: string, fragment: string) {
    const p = gl.createProgram(); if (!p) throw new Error('无法创建图形程序。');
    for (const [kind, source] of [[gl.VERTEX_SHADER, vertex], [gl.FRAGMENT_SHADER, fragment]] as const) {
      const s = gl.createShader(kind); if (!s) throw new Error('无法创建着色器。');
      shaders.push(s); gl.shaderSource(s, source); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) || '着色器编译失败。');
      gl.attachShader(p, s);
    }
    gl.linkProgram(p); if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error('图形程序链接失败。');
    programs.push(p); return p;
  }
  const surfaceProgram = program(`
    attribute vec3 a_position; attribute vec3 a_normal; uniform mat4 u_view;
    varying float v_light;
    void main(){ gl_Position=u_view*vec4(a_position,1.0);
      v_light=0.35+0.65*abs(dot(normalize(a_normal),normalize(vec3(-0.4,0.7,1.0)))); }
  `, `precision mediump float; uniform vec4 u_color; varying float v_light;
    void main(){ gl_FragColor=vec4(u_color.rgb*v_light,u_color.a); }`);
  const pointProgram = program(`
    attribute vec3 a_position; attribute vec4 a_color; attribute float a_size;
    uniform mat4 u_view; uniform float u_dpr; varying vec4 v_color;
    void main(){ gl_Position=u_view*vec4(a_position,1.0); gl_PointSize=a_size*u_dpr; v_color=a_color; }
  `, `precision mediump float; varying vec4 v_color;
    void main(){ float r=length(gl_PointCoord-vec2(0.5)); if(r>0.5) discard;
      gl_FragColor=vec4(v_color.rgb*(r>0.39?0.55:1.0),v_color.a); }`);
  const meshes = data.meshes.map(m => ({ name: m.name, positions: buffer(new Float32Array(m.positions), gl.ARRAY_BUFFER), normals: buffer(normals(m), gl.ARRAY_BUFFER), indices: buffer(new Uint16Array(m.triangles), gl.ELEMENT_ARRAY_BUFFER), count: m.triangles.length }));
  const points = buffer(new Float32Array(0), gl.ARRAY_BUFFER);
  const sp = gl.getAttribLocation(surfaceProgram, 'a_position'), sn = gl.getAttribLocation(surfaceProgram, 'a_normal');
  const pp = gl.getAttribLocation(pointProgram, 'a_position'), pc = gl.getAttribLocation(pointProgram, 'a_color'), ps = gl.getAttribLocation(pointProgram, 'a_size');
  function attribute(location: number, size: number, stride = 0, offset = 0) { gl.enableVertexAttribArray(location); gl.vertexAttribPointer(location, size, gl.FLOAT, false, stride, offset); }
  return {
    draw(view: Float32Array, pointData: number[], brain: boolean, scalp: boolean, alpha: number, dpr: number) {
      gl.viewport(0, 0, canvas.width, canvas.height); gl.clearColor(.055, .115, .14, 1); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.enable(gl.DEPTH_TEST); gl.depthMask(true); gl.disable(gl.BLEND); gl.disable(gl.CULL_FACE);
      gl.useProgram(surfaceProgram); gl.uniformMatrix4fv(gl.getUniformLocation(surfaceProgram, 'u_view'), false, view);
      const ordered = [...meshes.filter(m => m.name !== 'scalp'), ...meshes.filter(m => m.name === 'scalp')];
      for (const mesh of ordered) {
        const isScalp = mesh.name === 'scalp'; if ((isScalp && (!scalp || alpha === 0)) || (!isScalp && !brain)) continue;
        if (isScalp) { gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); gl.depthMask(false); }
        gl.uniform4fv(gl.getUniformLocation(surfaceProgram, 'u_color'), isScalp ? [.63, .82, .82, alpha] : [.91, .81, .73, 1]);
        gl.bindBuffer(gl.ARRAY_BUFFER, mesh.positions); attribute(sp, 3);
        gl.bindBuffer(gl.ARRAY_BUFFER, mesh.normals); attribute(sn, 3);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, mesh.indices); gl.drawElements(gl.TRIANGLES, mesh.count, gl.UNSIGNED_SHORT, 0);
      }
      gl.disableVertexAttribArray(sp); gl.disableVertexAttribArray(sn);
      // X-ray markers show template mismatch without silently moving electrodes.
      gl.depthMask(true); gl.disable(gl.DEPTH_TEST); gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.useProgram(pointProgram); gl.uniformMatrix4fv(gl.getUniformLocation(pointProgram, 'u_view'), false, view); gl.uniform1f(gl.getUniformLocation(pointProgram, 'u_dpr'), dpr);
      gl.bindBuffer(gl.ARRAY_BUFFER, points); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(pointData), gl.DYNAMIC_DRAW);
      attribute(pp, 3, 32, 0); attribute(pc, 4, 32, 12); attribute(ps, 1, 32, 28);
      gl.drawArrays(gl.POINTS, 0, pointData.length / 8);
      gl.disableVertexAttribArray(pp); gl.disableVertexAttribArray(pc); gl.disableVertexAttribArray(ps);
    },
    dispose() { for (const b of buffers) gl.deleteBuffer(b); for (const p of programs) gl.deleteProgram(p); for (const s of shaders) gl.deleteShader(s); },
  };
}

export async function mountElectrodeAtlas(root: HTMLElement): Promise<void> {
  const query = <T extends HTMLElement>(selector: string): T => { const el = root.querySelector<T>(selector); if (!el) throw new Error(`Missing atlas element: ${selector}`); return el; };
  const status = query<HTMLElement>('[data-atlas-status]');
  const controller = new AbortController(); const timeout = setTimeout(() => controller.abort(), 30000);
  let data: Atlas;
  try { const response = await fetch(root.dataset.url || '', { signal: controller.signal }); if (!response.ok) throw new Error(`图谱数据加载失败（${response.status}）。`); data = validateAtlas(await response.json()); }
  finally { clearTimeout(timeout); }
  const canvas = query<HTMLCanvasElement>('[data-atlas-canvas]'), overlay = query<HTMLCanvasElement>('[data-atlas-overlay]');
  const overlayContext = overlay.getContext('2d'); if (!overlayContext) throw new Error('无法创建标签画布。'); const ctx = overlayContext;
  const viewport = query<HTMLElement>('[data-atlas-viewport]'), groups = query<HTMLElement>('[data-atlas-groups]'), list = query<HTMLElement>('[data-atlas-list]');
  const search = query<HTMLInputElement>('[data-atlas-search]'), details = query<HTMLElement>('[data-atlas-details]');
  const labels = query<HTMLInputElement>('[data-atlas-labels]'), brain = query<HTMLInputElement>('[data-atlas-brain]'), scalp = query<HTMLInputElement>('[data-atlas-scalp]');
  const fiducials = query<HTMLInputElement>('[data-atlas-fiducials]'), opacity = query<HTMLInputElement>('[data-atlas-opacity]');
  let renderer: ReturnType<typeof makeRenderer> | null = null;
  let rendererError = '';
  try { renderer = makeRenderer(canvas, data); root.dataset.renderer = 'webgl'; }
  catch (error) { rendererError = error instanceof Error ? error.message : String(error); root.dataset.renderer = 'unavailable'; }
  const enabled = new Map<string, boolean>(), chosen = new Map<string, string>(), selected = new Set<string>();
  let visible: Electrode[] = [], projected: Projected[] = [], hover: string | null = null;
  let yaw = .6, pitch = .4, zoom = 1, width = 1, height = 1, dpr = 1, scheduled = false, disposed = false;
  const dot = (a: number[], b: number[]) => a.reduce((s, v, i) => s + v * b[i], 0);
  function viewMatrix() {
    const right = [-Math.cos(yaw), Math.sin(yaw), 0];
    const up = [-Math.sin(yaw) * Math.sin(pitch), -Math.cos(yaw) * Math.sin(pitch), Math.cos(pitch)];
    const depth = [Math.sin(yaw) * Math.cos(pitch), Math.cos(yaw) * Math.cos(pitch), Math.sin(pitch)];
    const s = 2 * zoom / .32, aspect = width / height;
    const rows = [right.map(v => v * s / aspect), up.map(v => v * s), depth.map(v => -v * 4)];
    return new Float32Array([rows[0][0], rows[1][0], rows[2][0], 0, rows[0][1], rows[1][1], rows[2][1], 0, rows[0][2], rows[1][2], rows[2][2], 0, -dot(rows[0], center), -dot(rows[1], center), -dot(rows[2], center), 1]);
  }
  function project(p: Vec3, m: Float32Array) { return { x: (m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12] + 1) * width / 2, y: (1 - m[1] * p[0] - m[5] * p[1] - m[9] * p[2] - m[13]) * height / 2, z: m[2] * p[0] + m[6] * p[1] + m[10] * p[2] + m[14] }; }
  function text(value: string, x: number, y: number, color = '#e4eeeb') { ctx.font = '12px system-ui,sans-serif'; ctx.lineWidth = 3; ctx.strokeStyle = '#102027'; ctx.strokeText(value, x, y); ctx.fillStyle = color; ctx.fillText(value, x, y); }
  function draw() {
    scheduled = false; if (disposed) return;
    const rect = viewport.getBoundingClientRect(); width = Math.max(1, rect.width); height = Math.max(1, rect.height); dpr = Math.min(2, devicePixelRatio || 1);
    for (const c of [canvas, overlay]) { const w = Math.round(width * dpr), h = Math.round(height * dpr); if (c.width !== w || c.height !== h) { c.width = w; c.height = h; } }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, width, height);
    const view = viewMatrix(), pointData: number[] = [];
    projected = visible.map(e => ({ ...project(e.position, view), electrode: e }));
    // Back points first; selection remains possible through the coordinate list.
    projected.sort((a, b) => b.z - a.z);
    for (const p of projected) {
      const e = p.electrode, active = selected.has(e.key) || hover === e.key, front = p.z < 0;
      pointData.push(...e.position, ...e.color, active ? 1 : front ? .95 : .27, active ? 12 : front ? 8 : 5);
      if (active) { ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(p.x, p.y, 8, 0, 2 * Math.PI); ctx.stroke(); }
      if (active || (labels.checked && visible.length <= 80 && front)) text(`${e.name}${active ? ' · ' + e.montage.family : ''}`, p.x + 9, p.y - 8);
    }
    if (fiducials.checked) for (const f of data.fiducials) { const p = project(f.position, view); pointData.push(...f.position, 1, 1, 1, 1, 7); text(f.name, p.x + 7, p.y + 15); }
    renderer?.draw(view, pointData, brain.checked, scalp.checked, Number(opacity.value), dpr);
    const axes: [string, Vec3][] = [['R / 右', [.13, .012, .025]], ['L / 左', [-.13, .012, .025]], ['A / 前', [0, .14, .025]], ['P / 后', [0, -.125, .025]]];
    for (const [label, position] of axes) { const p = project(position, view); if (p.x > 10 && p.x < width - 45 && p.y > 18 && p.y < height - 10) text(label, p.x, p.y, '#a5b9b7'); }
  }
  function requestDraw() { if (!scheduled && !disposed) { scheduled = true; requestAnimationFrame(draw); } }
  function updateDetails() {
    const picks = visible.filter(e => selected.has(e.key)); details.replaceChildren();
    if (!picks.length) details.textContent = '点击电极或在列表中勾选，查看头坐标（mm）。重合点不移位，可在列表中分别选择。';
    for (const e of picks.slice(-8)) { const line = document.createElement('p'); line.textContent = `${e.name} · ${e.montage.id}: x ${ (e.position[0] * 1000).toFixed(1)}, y ${(e.position[1] * 1000).toFixed(1)}, z ${(e.position[2] * 1000).toFixed(1)} mm`; details.append(line); }
    if (picks.length > 8) { const p = document.createElement('p'); p.textContent = `已选 ${picks.length} 个；此处显示最近排序的 8 个，全部选中项在电极列表中保留。`; details.append(p); }
    status.textContent = rendererError || `已加载 ${visible.length} 个电极位置，选中 ${picks.length} 个。MNE ${data.versions.mne}；模板坐标，不是个体测量。`;
    root.dataset.visibleCount = String(visible.length); root.dataset.selectedCount = String(picks.length);
  }
  function rebuildList() {
    const filter = search.value.trim().toLowerCase(); list.replaceChildren();
    const matches = visible.filter(e => `${e.name} ${e.montage.id} ${e.montage.family}`.toLowerCase().includes(filter));
    for (const e of matches) {
      const label = document.createElement('label'), input = document.createElement('input'), span = document.createElement('span');
      input.type = 'checkbox'; input.checked = selected.has(e.key); input.dataset.electrode = e.key;
      span.textContent = `${e.name} · ${e.montage.id}`;
      label.style.setProperty('--electrode-color', `rgb(${e.color.map(v => Math.round(v * 255)).join(',')})`);
      input.addEventListener('change', () => { input.checked ? selected.add(e.key) : selected.delete(e.key); updateDetails(); requestDraw(); });
      label.append(input, span); list.append(label);
    }
    if (!matches.length) list.textContent = visible.length ? '没有匹配的电极。' : '请先勾选一种布局。';
  }
  function updateVisible() {
    visible = [];
    for (const montage of data.montages) if (enabled.get(montage.family) && chosen.get(montage.family) === montage.id) montage.names.forEach((name, i) => visible.push({ key: `${montage.id}:${name}`, name, montage, position: montage.positions[i], color: colors[montage.family] }));
    hover = null; rebuildList(); updateDetails(); requestDraw();
  }
  for (const family of Object.keys(colors)) {
    const items = data.montages.filter(m => m.family === family); if (!items.length) continue;
    const defaultItem = items.find(m => m.id === 'biosemi64' || m.id === 'GSN-HydroCel-129') || items[0];
    chosen.set(family, defaultItem.id); enabled.set(family, family === '10–20');
    const row = document.createElement('div'), label = document.createElement('label'), checkbox = document.createElement('input'), name = document.createElement('span'), select = document.createElement('select');
    row.className = 'atlas-family'; row.style.setProperty('--family-color', `rgb(${colors[family].map(v => Math.round(v * 255)).join(',')})`);
    checkbox.type = 'checkbox'; checkbox.checked = enabled.get(family) || false; checkbox.dataset.family = family; name.textContent = family;
    label.append(checkbox, name); select.dataset.family = family; select.setAttribute('aria-label', `${family} 型号`);
    for (const m of items) { const option = document.createElement('option'); option.value = m.id; option.textContent = `${m.id} · ${m.count} 点`; option.selected = m.id === defaultItem.id; select.append(option); }
    checkbox.addEventListener('change', () => { enabled.set(family, checkbox.checked); updateVisible(); });
    select.addEventListener('change', () => { chosen.set(family, select.value); checkbox.checked = true; enabled.set(family, true); updateVisible(); });
    row.append(label, select); groups.append(row);
  }
  search.addEventListener('input', rebuildList);
  for (const el of [labels, brain, scalp, fiducials, opacity]) el.addEventListener('input', requestDraw);
  root.querySelectorAll<HTMLButtonElement>('[data-view]').forEach(button => button.addEventListener('click', () => {
    const views: Record<string, [number, number]> = { front: [0, 0], left: [-Math.PI / 2, 0], right: [Math.PI / 2, 0], top: [Math.PI, Math.PI / 2], reset: [.6, .4] };
    [yaw, pitch] = views[button.dataset.view || 'reset']; zoom = 1; requestDraw();
  }));
  root.querySelectorAll<HTMLButtonElement>('[data-zoom]').forEach(button => button.addEventListener('click', () => { zoom = Math.max(.6, Math.min(3, zoom * Number(button.dataset.zoom))); requestDraw(); }));
  query<HTMLButtonElement>('[data-atlas-clear]').addEventListener('click', () => { selected.clear(); rebuildList(); updateDetails(); requestDraw(); });
  const pointers = new Map<number, { x: number; y: number }>(); let travel = 0, pinch = 0, multi = false;
  canvas.addEventListener('pointerdown', e => { canvas.focus({ preventScroll: true }); canvas.setPointerCapture(e.pointerId); pointers.set(e.pointerId, { x: e.clientX, y: e.clientY }); if (pointers.size === 1) { travel = 0; multi = false; } else { multi = true; const p = [...pointers.values()]; pinch = Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y); } });
  canvas.addEventListener('pointermove', e => {
    const previous = pointers.get(e.pointerId);
    if (previous) {
      const dx = e.clientX - previous.x, dy = e.clientY - previous.y; travel += Math.hypot(dx, dy); pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.size > 1) { const p = [...pointers.values()]; const distance = Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y); if (pinch > 0) zoom = Math.max(.6, Math.min(3, zoom * distance / pinch)); pinch = distance; }
      else { yaw += dx * .007; pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, pitch + dy * .007)); }
    } else {
      const rect = canvas.getBoundingClientRect(), x = e.clientX - rect.left, y = e.clientY - rect.top;
      const hit = [...projected].reverse().find(p => Math.hypot(p.x - x, p.y - y) < 10); hover = hit?.electrode.key || null;
      canvas.style.cursor = hit ? 'pointer' : 'grab';
    }
    requestDraw();
  });
  canvas.addEventListener('pointerup', e => {
    pointers.delete(e.pointerId);
    if (!multi && travel < 5) {
      const rect = canvas.getBoundingClientRect(), x = e.clientX - rect.left, y = e.clientY - rect.top;
      const hits = [...projected].reverse().filter(p => Math.hypot(p.x - x, p.y - y) < 10);
      const hit = hits.find(p => !selected.has(p.electrode.key)) || hits[0];
      if (hit) { const key = hit.electrode.key; selected.has(key) ? selected.delete(key) : selected.add(key); rebuildList(); updateDetails(); requestDraw(); }
    }
  });
  canvas.addEventListener('pointercancel', e => { pointers.delete(e.pointerId); multi = true; });
  canvas.addEventListener('pointerleave', () => { hover = null; requestDraw(); });
  canvas.addEventListener('wheel', e => { e.preventDefault(); zoom = Math.max(.6, Math.min(3, zoom * Math.exp(-e.deltaY * .001))); requestDraw(); }, { passive: false });
  canvas.addEventListener('keydown', e => {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', '+', '=', '-', 'r', 'R'].includes(e.key)) return;
    e.preventDefault();
    if (e.key === 'ArrowLeft') yaw -= .12; if (e.key === 'ArrowRight') yaw += .12;
    if (e.key === 'ArrowUp') pitch += .12; if (e.key === 'ArrowDown') pitch -= .12;
    if (e.key === '+' || e.key === '=') zoom *= 1.1; if (e.key === '-') zoom /= 1.1;
    if (e.key.toLowerCase() === 'r') { yaw = .6; pitch = .4; zoom = 1; }
    pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, pitch)); zoom = Math.max(.6, Math.min(3, zoom)); requestDraw();
  });
  canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); rendererError = '图形上下文已丢失；可继续使用列表，重新加载页面可恢复三维视图。'; root.dataset.renderer = 'lost'; renderer = null; updateDetails(); });
  const observer = new ResizeObserver(requestDraw); observer.observe(viewport);
  window.addEventListener('pagehide', () => { disposed = true; observer.disconnect(); renderer?.dispose(); }, { once: true });
  query<HTMLElement>('[data-atlas-controls]').hidden = false;
  root.dataset.loaded = 'true'; updateVisible();
}
