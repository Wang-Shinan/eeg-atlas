/** Constructed teaching signals, never experimental recordings or a diagnostic model. */
export const dt = 4;
export const times = Array.from({ length: 301 }, (_, i) => -200 + i * dt);
export type Alignment = 'stimulus' | 'response';
export interface Trial { condition: 'A' | 'B'; rt: number; artifact: boolean; values: number[]; }
function random(seed: number) { let a = seed >>> 0; return () => { a = (1664525 * a + 1013904223) >>> 0; return a / 4294967296; }; }
export function gaussian(t: number, center: number, width: number) { return Math.exp(-0.5 * ((t - center) / width) ** 2); }
export function makeTrials(jitterMs = 0): Trial[] {
  if (!Number.isFinite(jitterMs) || jitterMs < 0 || jitterMs > 100) throw new RangeError('jitter must be 0..100 ms');
  return (['A', 'B'] as const).flatMap((condition, c) => Array.from({ length: 64 }, (_, k) => {
    const rng = random(113 + k * 193 + c * 100003);
    const rt = 320 + Math.floor(rng() * 81) * dt;
    const jitter = (rng() * 2 - 1) * jitterMs;
    const artifact = condition === 'A' && k % 13 === 0;
    let noise = 0;
    const values = Array.from({ length: 751 }, (_, i) => {
      const t = -1000 + i * dt;
      noise = 0.75 * noise + (rng() - 0.5) * 16;
      return -3 * gaussian(t, 130 + jitter, 25) + (c ? 2 : 6) * gaussian(t, 370 + jitter, 65)
        - (c ? 2 : 5) * gaussian(t, rt - 35, 22) + noise + 3
        + (artifact ? 45 * gaussian(t, 170, 70) : 0);
    });
    return { condition, rt, artifact, values };
  }));
}
export function epoch(trial: Trial, alignment: Alignment, baseline: boolean): number[] {
  // Baseline remains stimulus-relative [-200,0), even after response re-alignment.
  const base = baseline ? trial.values.slice(200, 250).reduce((a, b) => a + b, 0) / 50 : 0;
  const shift = alignment === 'response' ? trial.rt : 0;
  return times.map(t => trial.values[Math.round((t + shift + 1000) / dt)] - base);
}
export function analyze(trials: Trial[], count: number, alignment: Alignment, baseline: boolean, reject: boolean) {
  if (![1, 8, 32, 64].includes(count)) throw new RangeError('unsupported trial count');
  const get = (c: string) => trials.filter(t => t.condition === c).slice(0, count).filter(t => !reject || !t.artifact).map(t => epoch(t, alignment, baseline));
  const a = get('A'), b = get('B');
  const mean = (rows: number[][]) => times.map((_, j) => rows.length ? rows.reduce((s, r) => s + r[j], 0) / rows.length : 0);
  const avgA = mean(a), avgB = mean(b);
  return { a, b, avgA, avgB, difference: avgA.map((v, i) => v - avgB[i]) };
}
