import { bands, scenarios, validateRecording, synthetic, welch, spectrogram, bandPower, decibels,
  extent, hull, inside, interpolate, type Recording, type Spectrum, type TimeFrequency } from './dsp.js';

const ink = '#324c4c', teal = '#197967', amber = '#aa6230', rule = '#dbe4dd';
const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));
const fmt = (x: number, digits = 2) => Number.isFinite(x) ? x.toFixed(digits) : '—';
function field<T extends HTMLElement>(root: HTMLElement, name: string): T {
  const element = root.querySelector<T>(`[data-${name}]`);
  if (!element) throw new Error(`Missing reading control: ${name}`); return element;
}
function option(select: HTMLSelectElement, value: string, label: string) {
  const o = document.createElement('option'); o.value = value; o.textContent = label; select.append(o);
}
function surface(canvas: HTMLCanvasElement) {
  const width = Math.max(240, canvas.clientWidth), height = Math.max(180, canvas.clientHeight);
  const ratio = Math.min(devicePixelRatio || 1, 2);
  canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio);
  const ctx = canvas.getContext('2d'); if (!ctx) throw new Error('浏览器不支持 Canvas；请阅读正文或下载样本。');
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0); ctx.fillStyle = '#fdfefa'; ctx.fillRect(0, 0, width, height);
  ctx.font = '11px system-ui, sans-serif'; ctx.fillStyle = ink; ctx.lineWidth = 1;
  return { ctx, width, height };
}
function line(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, color = rule) {
  ctx.strokeStyle = color; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
}
function color(t: number, signed = false): string {
  const u = clamp(t, 0, 1), a = signed && u < .5 ? [50, 101, 160] : signed ? [244, 246, 233] : [241, 246, 225];
  const b = signed && u < .5 ? [244, 246, 233] : signed ? [182, 70, 52] : [26, 100, 99];
  const f = signed ? u < .5 ? u * 2 : (u - .5) * 2 : u;
  return `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * f)).join(',')})`;
}

export function initReading(root: HTMLElement) {
  if (root.dataset.initialized) return; root.dataset.initialized = 'true';
  const button = field<HTMLButtonElement>(root, 'load'), status = field(root, 'status');
  button.addEventListener('click', async () => {
    button.disabled = true; status.textContent = '正在载入并核对真实样本…';
    try {
      const response = await fetch(root.dataset.url || '', { signal: AbortSignal.timeout(20000) });
      if (!response.ok) throw new Error(`真实样本加载失败（HTTP ${response.status}），请重试。`);
      const data = validateRecording(await response.json());
      mount(root, data); button.hidden = true;
      status.textContent = '已载入真实记录。框选时间、切换通道，三种视图会使用同一份数据。';
    } catch (error) { button.disabled = false; button.textContent = '重新加载'; status.textContent = error instanceof Error ? error.message : '加载失败，请重试。'; }
  });
}
function mount(root: HTMLElement, base: Recording) {
  const sample = field<HTMLSelectElement>(root, 'sample'), channel = field<HTMLSelectElement>(root, 'channel');
  const count = field<HTMLSelectElement>(root, 'count'), gain = field<HTMLSelectElement>(root, 'gain');
  const start = field<HTMLInputElement>(root, 'start'), end = field<HTMLInputElement>(root, 'end');
  const cursorA = field<HTMLInputElement>(root, 'cursor-a'), cursorB = field<HTMLInputElement>(root, 'cursor-b');
  const target = field<HTMLSelectElement>(root, 'cursor-target'), mode = field<HTMLSelectElement>(root, 'spectrum-view');
  const mapMode = field<HTMLSelectElement>(root, 'map-mode'), band = field<HTMLSelectElement>(root, 'band'), lock = field<HTMLInputElement>(root, 'lock');
  const waveCanvas = field<HTMLCanvasElement>(root, 'wave'), spectrumCanvas = field<HTMLCanvasElement>(root, 'spectrum'), mapCanvas = field<HTMLCanvasElement>(root, 'map');
  sample.replaceChildren(); channel.replaceChildren(); band.replaceChildren();
  scenarios.forEach(s => option(sample, s.id, s.title)); base.channels.forEach((c, i) => option(channel, String(i), c.name));
  bands.forEach((b, i) => option(band, String(i), b.label)); band.value = '2'; channel.value = String(base.channels.findIndex(c => c.name === 'O1'));
  let data = base, view = [0, base.duration], selected = [0, base.values[0].length];
  let a = 4 * base.sampleRate, b = Math.round(4.1 * base.sampleRate), lockedScale: number | null = null;
  let cacheKey = '', spectra: Spectrum[] = [], tf: TimeFrequency | null = null, tfKey = '';
  let mapValues: number[] = [], currentScale = 1, shown: number[] = [], drawQueued = false;
  const indices = base.channels.map((_, i) => i), polygon = hull(base.channels.map(c => c.xy));
  const defaultNames = ['Fp1','Fp2','C3','C4','P3','P4','O1','O2'];
  field(root, 'workspace').hidden = false;
  const active = () => Number(channel.value), frequencyBand = () => bands[Number(band.value)];
  const numeric = (input: HTMLInputElement, fallback: number) => Number.isFinite(input.valueAsNumber) ? input.valueAsNumber : fallback;
  function chooseSelection(lo: number, hi: number) {
    const fs = data.sampleRate, n = data.values[0].length;
    const first = clamp(Math.round(Math.min(lo, hi) * fs), 0, n - fs);
    selected = [first, clamp(Math.round(Math.max(lo, hi) * fs), first + fs, n)];
    start.value = String(selected[0] / fs); end.value = String(selected[1] / fs);
    redraw();
  }
  function spectraForSelection() {
    const key = `${data.id}:${selected.join(':')}`;
    if (cacheKey !== key) { spectra = data.values.map(v => welch(v.slice(selected[0], selected[1]), data.sampleRate)); cacheKey = key; }
    const nextTfKey = `${key}:${active()}`;
    if (tfKey !== nextTfKey) { tf = spectrogram(data.values[active()].slice(selected[0], selected[1]), data.sampleRate); tfKey = nextTfKey; }
  }
  function redraw() {
    if (drawQueued) return; drawQueued = true;
    requestAnimationFrame(() => { drawQueued = false; render(); });
  }
  function drawWave() {
    shown = count.value === '19' ? indices : indices.filter(i => defaultNames.includes(data.channels[i].name));
    if (!shown.includes(active())) shown = [...shown.slice(0, -1), active()].sort((x, y) => x - y);
    waveCanvas.style.height = `${shown.length * 34 + 56}px`;
    const { ctx, width, height } = surface(waveCanvas), left = 48, right = width - 12, top = 18, bottom = height - 32;
    const row = (bottom - top) / shown.length, half = Number(gain.value), x = (t: number) => left + (t - view[0]) / (view[1] - view[0]) * (right - left);
    const tick = view[1] - view[0] <= 2 ? .2 : view[1] - view[0] <= 6 ? 1 : 2;
    for (let t = Math.ceil(view[0] / tick) * tick; t <= view[1] + 1e-9; t += tick) {
      line(ctx, x(t), top, x(t), bottom); ctx.fillStyle = ink; ctx.fillText(fmt(t, tick < 1 ? 1 : 0), x(t) - 5, height - 12);
    }
    ctx.save(); ctx.beginPath(); ctx.rect(left, top, right - left, bottom - top); ctx.clip();
    ctx.fillStyle = '#36796b12'; ctx.fillRect(x(selected[0] / data.sampleRate), top, x(selected[1] / data.sampleRate) - x(selected[0] / data.sampleRate), bottom - top); ctx.restore();
    shown.forEach((index, order) => {
      const y0 = top + (order + .5) * row, values = data.values[index];
      ctx.fillStyle = index === active() ? teal : ink; ctx.font = `${index === active() ? '700 ' : ''}11px system-ui`; ctx.fillText(data.channels[index].name, 5, y0 + 4);
      line(ctx, left, y0, right, y0); ctx.save(); ctx.beginPath(); ctx.rect(left, y0 - row / 2 + 1, right - left, row - 2); ctx.clip();
      ctx.strokeStyle = index === active() ? teal : '#50656a'; ctx.lineWidth = index === active() ? 1.3 : .85; ctx.beginPath();
      let clipping = false;
      for (let j = Math.floor(view[0] * data.sampleRate); j < Math.min(values.length, Math.ceil(view[1] * data.sampleRate)); j++) {
        const xx = x(j / data.sampleRate), yy = y0 - values[j] / half * row * .43;
        clipping ||= Math.abs(values[j]) > half;
        if (j === Math.floor(view[0] * data.sampleRate)) ctx.moveTo(xx, yy); else ctx.lineTo(xx, yy);
      }
      ctx.stroke(); ctx.restore(); if (clipping) { ctx.fillStyle = amber; ctx.fillText('!', width - 9, y0 + 3); }
    });
    ctx.font = '11px system-ui';
    for (const [j, label, dashed] of [[a, 'A', false], [b, 'B', true]] as const) {
      if (j / data.sampleRate < view[0] || j / data.sampleRate > view[1]) continue;
      ctx.setLineDash(dashed ? [4, 3] : []); line(ctx, x(j / data.sampleRate), top, x(j / data.sampleRate), bottom, amber); ctx.setLineDash([]);
      ctx.fillStyle = amber; ctx.fillText(label, x(j / data.sampleRate) + 3, 12);
    }
    ctx.fillStyle = ink; ctx.fillText(`每行 ±${half} µV；! 表示显示裁切`, 5, height - 1);
  }
  function drawSpectrum() {
    const { ctx, width, height } = surface(spectrumCanvas), left = 44, right = width - 15, top = 28, bottom = height - 38;
    const s = spectra[active()], freq = (f: number) => left + f / 45 * (right - left), db = (v: number) => bottom - (clamp(v, -40, 40) + 40) / 80 * (bottom - top);
    if (mode.value === 'psd') {
      const bb = frequencyBand(); ctx.fillStyle = '#dae9de'; ctx.fillRect(freq(bb.lo), top, freq(bb.hi) - freq(bb.lo), bottom - top);
      for (let v = -40; v <= 40; v += 20) { line(ctx, left, db(v), right, db(v)); ctx.fillStyle = ink; ctx.fillText(String(v), 8, db(v) + 3); }
      for (let f = 0; f <= 40; f += 10) { ctx.fillText(String(f), freq(f) - 4, bottom + 18); }
      ctx.save(); ctx.beginPath(); ctx.rect(left, top, right - left, bottom - top); ctx.clip(); ctx.strokeStyle = teal; ctx.lineWidth = 2; ctx.beginPath();
      s.frequencies.forEach((f, k) => { if (f > 45) return; if (k === 0) ctx.moveTo(freq(f), db(decibels(s.psd[k]))); else ctx.lineTo(freq(f), db(decibels(s.psd[k]))); });
      ctx.stroke(); ctx.restore(); ctx.fillStyle = ink; ctx.fillText('dB re 1 µV²/Hz', 9, 15); ctx.fillText('Hz', right - 15, height - 5);
    } else if (tf) {
      const first = selected[0] / data.sampleRate, last = selected[1] / data.sampleRate;
      const xx = (t: number) => left + (t - first) / (last - first) * (right - left), yy = (f: number) => bottom - f / 45 * (bottom - top);
      ctx.fillStyle = '#eef0ea'; ctx.fillRect(left, top, right - left, bottom - top);
      const hop = .125;
      tf.power.forEach((p, j) => p.forEach((value, k) => { if (k > 45) return;
        const t = first + tf!.times[j], low = Math.max(0, k - .5), high = Math.min(45, k + .5);
        ctx.fillStyle = color((decibels(value) + 40) / 80);
        ctx.fillRect(xx(t - hop / 2), yy(high), Math.max(1, xx(t + hop / 2) - xx(t - hop / 2)), yy(low) - yy(high) + .5);
      }));
      ctx.fillStyle = ink; for (let f = 0; f <= 40; f += 10) ctx.fillText(String(f), 10, yy(f) + 3);
      for (let j = 0; j <= 4; j++) { const t = first + (last - first) * j / 4; ctx.fillText(fmt(t, 1), xx(t) - 9, bottom + 18); }
      ctx.fillText('Hz · 颜色 −40 → 40 dB', 8, 15); ctx.fillText('片段内 s', right - 55, height - 5);
      for (let j = 0; j < 80; j++) { ctx.fillStyle = color(j / 79); ctx.fillRect(right - 85 + j, 6, 1, 8); }
    }
    line(ctx, left, top, left, bottom, ink); line(ctx, left, bottom, right, bottom, ink);
  }
  function mapGeometry() {
    const w = mapCanvas.clientWidth, h = mapCanvas.clientHeight, r = Math.min(w * .35, (h - 65) / 2);
    return { cx: w / 2, cy: (h - 30) / 2, r };
  }
  function drawMap() {
    const { ctx, width, height } = surface(mapCanvas), { cx, cy, r } = mapGeometry();
    const signed = mapMode.value === 'voltage';
    const rawScale = Math.max(1e-6, ...mapValues.map(Math.abs)); currentScale = lock.checked && lockedScale ? lockedScale : rawScale;
    const scale = currentScale;
    for (let y = -r; y <= r; y += 3) for (let x = -r; x <= r; x += 3) {
      const point = [x / r, -y / r]; if (!inside(point, polygon)) continue;
      const value = interpolate(point, data.channels.map(c => c.xy), mapValues);
      ctx.fillStyle = color(signed ? (value / scale + 1) / 2 : value / scale, signed); ctx.fillRect(cx + x, cy + y, 3.2, 3.2);
    }
    ctx.strokeStyle = ink; ctx.beginPath(); ctx.arc(cx, cy, r, 0, 2 * Math.PI); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx - r * .12, cy - r); ctx.lineTo(cx, cy - r - 12); ctx.lineTo(cx + r * .12, cy - r); ctx.stroke();
    ctx.fillStyle = ink; ctx.fillText('左', cx - r - 19, cy); ctx.fillText('右', cx + r + 5, cy);
    data.channels.forEach((c, i) => {
      const x = cx + c.xy[0] * r, y = cy - c.xy[1] * r;
      ctx.fillStyle = i === active() ? amber : '#fdfefa'; ctx.strokeStyle = i === active() ? amber : ink;
      ctx.beginPath(); ctx.arc(x, y, i === active() ? 5 : 3, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      const offsets: Record<string, number[]> = { Fp1:[-18,-8], Fp2:[5,-8], F7:[-17,-5], F3:[5,10], F4:[-17,10], F8:[6,-5], T7:[-18,-5], C3:[6,10], C4:[-17,10], T8:[6,-5], P7:[-18,10], P3:[6,-5], P4:[-17,-5], P8:[6,10], O1:[-18,13], O2:[6,13] };
      const offset = offsets[c.name] || [5,-5];
      ctx.fillStyle = ink; ctx.font = `${i === active() ? 'bold ' : ''}10px system-ui`; ctx.fillText(c.name, x + offset[0], y + offset[1]);
    });
    const bw = Math.min(180, width - 80), bx = (width - bw) / 2, by = height - 25;
    for (let j = 0; j < bw; j++) { ctx.fillStyle = color(j / (bw - 1), signed); ctx.fillRect(bx + j, by, 1, 8); }
    ctx.fillStyle = ink; ctx.font = '10px system-ui'; ctx.fillText(signed ? fmt(-scale, 1) : '0', bx, by + 21); ctx.fillText(fmt(scale, 1), bx + bw - 25, by + 21);
    ctx.fillText(signed ? 'µV' : 'µV²', width / 2 - 8, by + 21);
  }
  function render() {
    spectraForSelection(); const i = active(), fs = data.sampleRate, bb = frequencyBand();
    const powers = spectra.map(s => bandPower(s, bb.lo, bb.hi)), instant = data.values.map(v => v[a]);
    mapValues = mapMode.value === 'voltage' ? instant : powers;
    // A queued redraw must not overwrite a numeric field while the reader is typing.
    if (document.activeElement !== cursorA) cursorA.value = String(a / fs);
    if (document.activeElement !== cursorB) cursorB.value = String(b / fs);
    const segment = data.values[i].slice(selected[0], selected[1]), stats = extent(segment), dt = Math.abs(b - a) / fs;
    field(root, 'context').textContent = `${data.kind === 'real' ? '真实数据' : '合成示意'} · ${data.reference}。${data.condition}`;
    field(root, 'measure').textContent = `${data.channels[i].name}：Δt = ${fmt(dt, 4)} s；V(B)−V(A) = ${fmt(data.values[i][b] - data.values[i][a])} µV；1/Δt = ${dt ? fmt(1 / dt) : '未定义'} Hz`;
    field(root, 'numbers').textContent = `${data.channels[i].name} · [${fmt(selected[0] / fs)}, ${fmt(selected[1] / fs)}) s · 峰峰值 ${fmt(stats.peakToPeak)} µV · ${bb.lo}–${bb.hi} Hz 功率 ${fmt(powers[i])} µV²。峰峰值取整个选区，不是单个周期振幅。`;
    field(root, 'selection-note').textContent = `视野 ${fmt(view[0])}–${fmt(view[1])} s；分析选区 [${fmt(selected[0] / fs)}, ${fmt(selected[1] / fs)}) s（${selected[1] - selected[0]} 点）。最短 1 s；边界按采样点对齐。${data.kind === 'real' ? `对应原 EDF [${fmt(data.sourceOffset + selected[0] / fs)}, ${fmt(data.sourceOffset + selected[1] / fs)}) s。` : ''}`;
    field(root, 'spectral-note').textContent = `${data.channels[i].name}，同一选区。${mode.value === 'psd' ? `Welch 平均 ${spectra[i].segments} 个完整 1 秒窗；阴影为 ${bb.lo}–${bb.hi} Hz。` : '每列为 1 秒窗的 PSD，步长 0.125 秒；灰色边缘没有窗中心估计。'}纵轴或色标固定 −40 至 40 dB re 1 µV²/Hz。`;
    field(root, 'map-note').textContent = mapMode.value === 'voltage' ? `A = ${fmt(a / fs, 4)} s。带符号电压，相对于所述参考；不表示兴奋/抑制。${lock.checked ? '已锁定' : '自动对称'}色标。` : `[${fmt(selected[0] / fs)}, ${fmt(selected[1] / fs)}) s 的 ${bb.lo}–${bb.hi} Hz 功率，非负；不是该时刻电压。${lock.checked ? '已锁定' : '自动'}色标。`;
    band.disabled = false;
    const tbody = field<HTMLTableSectionElement>(root, 'values'); tbody.replaceChildren();
    data.channels.forEach((c, j) => { const tr = document.createElement('tr'); [c.name, fmt(instant[j], 3), fmt(powers[j], 3)].forEach(text => { const td = document.createElement('td'); td.textContent = text; tr.append(td); }); tbody.append(tr); });
    const provenance = data.provenance || {};
    field(root, 'provenance').textContent = data.kind === 'real' ? `S001R02 原始 [10,22) 秒；160 Hz，先在 64 路上平均参考再选 19 路。原采集参考未由已取得的头信息确认。未额外滤波、ICA、重采样或 z-score。EDF prefilter 字段：${String(provenance.edfPrefilters)}；该字段不构成完整硬件滤波器的确认。源 SHA-256：${String(provenance.sourceSHA256)}。` : `确定性合成样本；非周期背景由多频随机相位叠加构造，空间权重人为设置。${data.condition}`;
    const best = spectra[i].frequencies.reduce((winner, f, k) => f >= 1 && f <= 45 && spectra[i].psd[k] > spectra[i].psd[winner] ? k : winner, 1);
    field(root, 'answer').textContent = `记录条件：${data.reference}。观察范围：[${fmt(selected[0] / fs)}, ${fmt(selected[1] / fs)}) s，通道 ${data.channels[i].name}；选区峰峰值 ${fmt(stats.peakToPeak)} µV，1–45 Hz 中 PSD 最大的离散频点为 ${fmt(spectra[i].frequencies[best], 0)} Hz。这只是一个可复查的谱数值，不保证存在独立振荡。请再用原波形描述形态、持续方式与空间分布。${data.kind === 'real' ? '本片段没有睁闭眼切换事件，不能据此判断反应性，也不能用 12 秒作整次记录的诊断。' : '这是控制变量练习，不支持任何临床结论。'}`;
    drawWave(); drawSpectrum(); drawMap();
    root.dataset.loaded = 'true'; root.dataset.sample = data.id; root.dataset.channel = data.channels[i].name;
    root.dataset.selection = selected.join(':'); root.dataset.mode = mode.value; root.dataset.map = mapMode.value;
    root.dataset.power = String(powers[i]); root.dataset.cursorA = String(a); root.dataset.mapScale = String(currentScale);
  }
  sample.addEventListener('change', () => { data = synthetic(base, sample.value); gain.value = data.kind === 'real' ? '250' : '50'; cacheKey = ''; tfKey = ''; redraw(); });
  [channel, count, gain, mode, target].forEach(c => c.addEventListener('change', redraw));
  mapMode.addEventListener('change', () => { lock.checked = false; lockedScale = null; redraw(); });
  band.addEventListener('change', () => { lock.checked = false; lockedScale = null; redraw(); });
  lock.addEventListener('change', () => { lockedScale = lock.checked ? currentScale : null; redraw(); });
  start.addEventListener('change', () => chooseSelection(numeric(start, selected[0] / data.sampleRate), numeric(end, selected[1] / data.sampleRate)));
  end.addEventListener('change', () => chooseSelection(numeric(start, selected[0] / data.sampleRate), numeric(end, selected[1] / data.sampleRate)));
  cursorA.addEventListener('change', () => { a = clamp(Math.round(numeric(cursorA, a / data.sampleRate) * data.sampleRate), 0, data.values[0].length - 1); redraw(); });
  cursorB.addEventListener('change', () => { b = clamp(Math.round(numeric(cursorB, b / data.sampleRate) * data.sampleRate), 0, data.values[0].length - 1); redraw(); });
  field(root, 'zoom').addEventListener('click', () => { view = selected.map(v => v / data.sampleRate); redraw(); });
  field(root, 'reset').addEventListener('click', () => { view = [0, data.duration]; redraw(); });
  let drag: { x: number; y: number; time: number; id: number } | null = null;
  function pointerTime(clientX: number) { const box = waveCanvas.getBoundingClientRect(); return clamp(view[0] + (clientX - box.left - 48) / (box.width - 60) * (view[1] - view[0]), view[0], view[1]); }
  waveCanvas.addEventListener('pointerdown', event => { if (event.button !== 0) return; drag = { x: event.clientX, y: event.clientY, time: pointerTime(event.clientX), id: event.pointerId }; waveCanvas.setPointerCapture(event.pointerId); });
  waveCanvas.addEventListener('pointercancel', () => { drag = null; });
  waveCanvas.addEventListener('pointerup', event => {
    if (!drag || drag.id !== event.pointerId) return;
    const t = pointerTime(event.clientX), begin = drag; drag = null;
    if (Math.abs(event.clientX - begin.x) > 8) chooseSelection(begin.time, t);
    else {
      const j = clamp(Math.round(t * data.sampleRate), 0, data.values[0].length - 1);
      if (target.value === 'a') a = j; else b = j;
      const box = waveCanvas.getBoundingClientRect(), row = (box.height - 50) / shown.length;
      const which = clamp(Math.floor((event.clientY - box.top - 18) / row), 0, shown.length - 1); channel.value = String(shown[which]); redraw();
    }
  });
  waveCanvas.addEventListener('keydown', event => {
    if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return; event.preventDefault();
    const step = (event.key === 'ArrowRight' ? 1 : -1) * (event.shiftKey ? 16 : 1), last = data.values[0].length - 1;
    if (target.value === 'a') a = clamp(a + step, 0, last); else b = clamp(b + step, 0, last); redraw();
  });
  mapCanvas.addEventListener('click', event => {
    const box = mapCanvas.getBoundingClientRect(), { cx, cy, r } = mapGeometry();
    let nearest = -1, best = 18;
    data.channels.forEach((c, i) => { const d = Math.hypot(event.clientX - box.left - cx - c.xy[0] * r, event.clientY - box.top - cy + c.xy[1] * r); if (d < best) { best = d; nearest = i; } });
    if (nearest >= 0) { channel.value = String(nearest); redraw(); }
  });
  let width = root.clientWidth;
  new ResizeObserver(() => { if (width !== root.clientWidth) { width = root.clientWidth; redraw(); } }).observe(root);
  render();
}
