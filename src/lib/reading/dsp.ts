/** Calibrated teaching DSP. No filtering of the waveform; all spectra are one-sided. */
export interface Channel { name: string; xy: number[]; xyzHeadM: number[]; }
export interface Recording {
  schemaVersion: number; id: string; kind: 'real' | 'synthetic'; title: string;
  sampleRate: number; unit: string; duration: number; sourceOffset: number;
  channels: Channel[]; values: number[][]; reference: string; condition: string;
  provenance?: Record<string, unknown>;
}
export interface Spectrum { frequencies: number[]; psd: number[]; segments: number; }
export interface TimeFrequency { frequencies: number[]; times: number[]; power: number[][]; }
export const bands = [
  { label: 'δ · 0.5–4 Hz', lo: 0.5, hi: 4 }, { label: 'θ · 4–8 Hz', lo: 4, hi: 8 },
  { label: 'α · 8–13 Hz', lo: 8, hi: 13 }, { label: 'β · 13–30 Hz', lo: 13, hi: 30 },
  { label: 'γ 子区间 · 30–45 Hz', lo: 30, hi: 45 },
];
export const scenarios = [
  { id: 'real', title: '真实 · S001R02 闭眼基线' },
  { id: 'continuous', title: '合成 A · 持续的 10 Hz 振荡' },
  { id: 'burst', title: '合成 B · 短暂成串的 10 Hz 振荡' },
  { id: 'transient', title: '合成 C · 振荡与尖锐瞬态' },
  { id: 'background-low', title: '合成 D · 较低非周期背景' },
  { id: 'background-high', title: '合成 E · 较高非周期背景' },
];
export function validateRecording(value: unknown): Recording {
  const r = value as Recording;
  if (!r || r.schemaVersion !== 1 || r.sampleRate !== 160 || r.unit !== 'µV' ||
      r.duration !== 12 || !Array.isArray(r.channels) || r.channels.length !== 19 ||
      !Array.isArray(r.values) || r.values.length !== 19 ||
      !r.channels.every(c => typeof c.name === 'string' && c.xy?.length === 2 &&
        c.xy.every(Number.isFinite) && c.xyzHeadM?.length === 3 && c.xyzHeadM.every(Number.isFinite)) ||
      new Set(r.channels.map(c => c.name)).size !== 19 ||
      !r.values.every(v => Array.isArray(v) && v.length === 1920 && v.every(Number.isFinite))) {
    throw new Error('样本格式、单位或数值校验失败；没有用合成数据替代真实记录。');
  }
  return r;
}
const plans = new Map<number, { window: Float64Array; cos: Float64Array[]; sin: Float64Array[]; energy: number }>();
function plan(n: number) {
  const cached = plans.get(n); if (cached) return cached;
  const window = Float64Array.from({ length: n }, (_, j) => 0.5 - 0.5 * Math.cos(2 * Math.PI * j / n));
  const cos: Float64Array[] = [], sin: Float64Array[] = [];
  for (let k = 0; k <= Math.floor(n / 2); k++) {
    cos.push(Float64Array.from({ length: n }, (_, j) => Math.cos(2 * Math.PI * k * j / n)));
    sin.push(Float64Array.from({ length: n }, (_, j) => Math.sin(2 * Math.PI * k * j / n)));
  }
  const result = { window, cos, sin, energy: window.reduce((s, x) => s + x * x, 0) };
  plans.set(n, result); return result;
}
export function periodogram(x: ArrayLike<number>, fs: number): number[] {
  const n = x.length;
  if (n < 2 || !Number.isFinite(fs) || fs <= 0) throw new Error('Invalid spectral input');
  const p = plan(n); let mean = 0;
  for (let j = 0; j < n; j++) mean += x[j] / n;
  const windowed = Float64Array.from({ length: n }, (_, j) => (x[j] - mean) * p.window[j]);
  return p.cos.map((cos, k) => {
    let re = 0, im = 0;
    for (let j = 0; j < n; j++) { re += windowed[j] * cos[j]; im -= windowed[j] * p.sin[k][j]; }
    const oneSided = k === 0 || (n % 2 === 0 && k === n / 2) ? 1 : 2;
    return (re * re + im * im) * oneSided / (fs * p.energy);
  });
}
/** 1 s periodic Hann, per-window mean removal, 50% overlap; trailing partial windows omitted. */
export function welch(x: number[], fs: number): Spectrum {
  const n = Math.round(fs), hop = Math.floor(n / 2);
  if (x.length < n) throw new Error('频谱需要至少 1 秒的选区。');
  const psd = Array(Math.floor(n / 2) + 1).fill(0) as number[]; let segments = 0;
  for (let start = 0; start + n <= x.length; start += hop) {
    const p = periodogram(x.slice(start, start + n), fs);
    for (let k = 0; k < psd.length; k++) psd[k] += p[k];
    segments++;
  }
  return { frequencies: psd.map((_, k) => k * fs / n), psd: psd.map(v => v / segments), segments };
}
/** Same estimator, 0.125 s hop. Times are centres; no padding invented at boundaries. */
export function spectrogram(x: number[], fs: number): TimeFrequency {
  const n = Math.round(fs), hop = Math.round(fs / 8), times: number[] = [], power: number[][] = [];
  for (let start = 0; start + n <= x.length; start += hop) {
    times.push((start + n / 2) / fs); power.push(periodogram(x.slice(start, start + n), fs));
  }
  return { frequencies: Array.from({ length: Math.floor(n / 2) + 1 }, (_, k) => k * fs / n), times, power };
}
/** Integral of the piecewise-linear PSD between the exact requested frequency boundaries. */
export function bandPower(s: Spectrum, lo: number, hi: number): number {
  let area = 0;
  for (let k = 0; k < s.frequencies.length - 1; k++) {
    const f0 = s.frequencies[k], f1 = s.frequencies[k + 1];
    const a = Math.max(lo, f0), b = Math.min(hi, f1); if (b <= a) continue;
    const at = (f: number) => s.psd[k] + (s.psd[k + 1] - s.psd[k]) * (f - f0) / (f1 - f0);
    area += (at(a) + at(b)) * (b - a) / 2;
  }
  return area;
}
export const decibels = (v: number) => 10 * Math.log10(Math.max(1e-12, v));
export function extent(x: number[]) {
  let min = Infinity, max = -Infinity;
  for (const v of x) { min = Math.min(min, v); max = Math.max(max, v); }
  return { min, max, peakToPeak: max - min };
}
export function synthetic(base: Recording, id: string): Recording {
  if (id === 'real') return base;
  const descriptor = scenarios.find(s => s.id === id); if (!descriptor) throw new Error('Unknown sample');
  const n = base.values[0].length, fs = base.sampleRate;
  const envelope = Array.from({ length: n }, (_, j) => {
    const t = j / fs; if (t < 4 || t >= 6) return 0;
    return Math.min(1, (t - 4) / .2, (6 - t) / .2);
  });
  // Match the actual sampled carrier energy, not just the envelope RMS.
  const carrier = envelope.map((_, j) => Math.sin(2 * Math.PI * 10 * j / fs));
  const norm = Math.sqrt(envelope.reduce((s, e, j) => s + e * e * carrier[j] ** 2, 0) /
    carrier.reduce((s, v) => s + v * v, 0));
  const values = base.channels.map((channel, i) => {
    let seed = 20260917 + i;
    const random = () => { seed = (Math.imul(1664525, seed) + 1013904223) >>> 0; return seed / 4294967296; };
    const phases = Array.from({ length: 60 }, () => random() * 2 * Math.PI);
    const noise = Array.from({ length: n }, (_, j) => phases.reduce((s, phase, k) =>
      s + Math.sin(2 * Math.PI * (k + 1) * j / fs + phase) / Math.sqrt(k + 1), 0));
    const rms = Math.sqrt(noise.reduce((s, v) => s + v * v, 0) / n);
    const gain = channel.name.startsWith('O') ? 1 : channel.name.startsWith('P') ? .7 : .25;
    return noise.map((background, j) => {
      const t = j / fs;
      const scale = id === 'background-high' ? 12 : id === 'background-low' ? 2 : .7;
      const oscillation = 12 * gain * Math.sin(2 * Math.PI * 10 * t) * (id === 'burst' ? envelope[j] / norm : 1);
      const transient = id === 'transient' ? 55 * gain * (Math.exp(-(((t - 7) / .03) ** 2)) - .5 * Math.exp(-(((t - 7.07) / .06) ** 2))) : 0;
      return oscillation + background / rms * scale + transient;
    });
  });
  const condition = id === 'burst' ? '仅 4–6 s 有 10 Hz 成串活动；包络归一化使振荡成分的全段均方值与 A 相同，不保证 Welch 频带积分完全相等。'
    : id.startsWith('background') ? 'D/E 使用同一组相位和完全相同的 10 Hz 振荡，只改变 1/f-like 背景的幅度。不进行生理机制推断。'
    : id === 'transient' ? '7 s 附近人为加入尖锐瞬态，用于量时限；不是癫痫样放电或诊断样本。'
    : '后部权重较大的持续 10 Hz 合成振荡；用于与短暂成串活动比较。';
  return { ...base, id, kind: 'synthetic', title: descriptor.title, sourceOffset: 0, values,
    reference: '指定零参考的合成通道；空间权重人为设置，不是生物物理正向模拟', condition,
    provenance: { generator: 'EEG Atlas deterministic synthetic v1', seed: 20260917, note: '仅复用模板位置，不包含真实被试信号；不是患者记录。' } };
}
/** Convex hull and inverse-distance interpolation for a declared, masked teaching map. */
export function hull(points: number[][]): number[][] {
  const sorted = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o: number[], a: number[], b: number[]) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const half = (ps: number[][]) => { const h: number[][] = []; for (const p of ps) { while (h.length >= 2 && cross(h[h.length - 2], h[h.length - 1], p) <= 0) h.pop(); h.push(p); } return h.slice(0, -1); };
  return [...half(sorted), ...half([...sorted].reverse())];
}
export function inside(point: number[], polygon: number[][]): boolean {
  let yes = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i], [xj, yj] = polygon[j], [x, y] = point;
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) yes = !yes;
  }
  return yes;
}
export function interpolate(point: number[], positions: number[][], values: number[]): number {
  let weighted = 0, total = 0;
  for (let i = 0; i < positions.length; i++) {
    const d2 = (point[0] - positions[i][0]) ** 2 + (point[1] - positions[i][1]) ** 2;
    if (d2 < 1e-12) return values[i];
    weighted += values[i] / d2; total += 1 / d2;
  }
  return weighted / total;
}
