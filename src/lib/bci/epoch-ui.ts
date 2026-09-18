import { analyze, makeTrials, times, type Alignment } from './epochs';
export function initEpochLabs() {
  for (const root of document.querySelectorAll<HTMLElement>('[data-epoch-lab]')) {
    if (root.dataset.ready) continue;
    const select = (s: string) => root.querySelector<HTMLSelectElement>(s)!;
    const flag = (s: string) => root.querySelector<HTMLInputElement>(s)!.checked;
    const canvas = root.querySelector<HTMLCanvasElement>('[data-epoch-mean]')!;
    const heat = root.querySelector<HTMLCanvasElement>('[data-epoch-trials]')!;
    const ctx = canvas.getContext('2d'), hc = heat.getContext('2d');
    if (!ctx || !hc) { root.querySelector('[data-epoch-status]')!.textContent = '此浏览器无法绘制 Canvas；请阅读下方构造说明。'; continue; }
    const line = ctx, map = hc;
    function surface(c: HTMLCanvasElement, context: CanvasRenderingContext2D, height: number) {
      const width = Math.max(250, c.getBoundingClientRect().width);
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      c.width = Math.round(width * dpr); c.height = Math.round(height * dpr); c.style.height = `${height}px`;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      context.fillStyle = '#fbfaf7'; context.fillRect(0, 0, width, height); context.font = '12px sans-serif';
      return width;
    }
    function draw() {
      const align = select('[data-align]').value as Alignment;
      const n = Number(select('[data-count]').value), range = Number(select('[data-range]').value);
      const result = analyze(makeTrials(Number(select('[data-jitter]').value)), n, align, flag('[data-baseline]'), flag('[data-reject]'));
      root.dataset.nA = String(result.a.length); root.dataset.nB = String(result.b.length); root.dataset.alignment = align;
      const status = `实际保留 A ${result.a.length} / B ${result.b.length} 条；${align === 'stimulus' ? '刺激' : '反应'}锁定；基线${flag('[data-baseline]') ? '始终为刺激前 −200～0 ms' : '未校正'}。`;
      const clipped = [...result.avgA, ...result.avgB, ...result.difference].some(v => Math.abs(v) > range);
      root.querySelector('[data-epoch-status]')!.textContent = status + (result.a.length ? '' : '无有效 A 试次，不计算或绘制 A 平均与 A−B。') + (clipped ? '部分曲线超出显示量程，可调大量程查看。' : '');
      const width = surface(canvas, line, 300), left = 44, right = width - 18;
      const x = (t: number) => left + (t + 200) / 1200 * (right - left);
      const y = (v: number) => 140 - v / range * 110;
      for (let i = -3; i <= 3; i++) {
        const v = i * range / 3;
        line.strokeStyle = '#d7d9d5'; line.beginPath(); line.moveTo(left, y(v)); line.lineTo(right, y(v)); line.stroke();
        line.fillStyle = '#525b60'; line.textAlign = 'right'; line.fillText(String(v), left - 8, y(v) + 4);
      }
      const ticks = width < 500 ? [-200, 0, 400, 800, 1000] : [-200, 0, 200, 400, 600, 800, 1000];
      for (const t of ticks) {
        line.strokeStyle = t === 0 ? '#59636b' : '#d7d9d5'; line.beginPath(); line.moveTo(x(t), 25); line.lineTo(x(t), 250); line.stroke();
        line.fillStyle = '#525b60'; line.textAlign = t === 1000 ? 'right' : 'center'; line.fillText(String(t), x(t), 278);
      }
      line.textAlign = 'left'; line.fillText('µV', 8, 16); line.textAlign = 'right'; line.fillText('ms', right, 16);
      const rows: [number[], string, boolean][] = [[result.avgB, '#b56c2e', false]];
      if (result.a.length) rows.unshift([result.avgA, '#136b6e', false], [result.difference, '#64487b', true]);
      for (const [row, color, dashed] of rows) {
        line.save(); line.beginPath(); line.rect(left, 30, right - left, 220); line.clip(); line.strokeStyle = color; line.lineWidth = 2; line.setLineDash(dashed ? [6, 4] : []); line.beginPath();
        row.forEach((v, i) => i ? line.lineTo(x(times[i]), y(v)) : line.moveTo(x(times[i]), y(v))); line.stroke(); line.restore();
      }
      const hw = surface(heat, map, 230), hx = (t: number) => left + (t + 200) / 1200 * (hw - 18 - left);
      result.a.forEach((row, r) => row.forEach((v, i) => {
        const u = Math.min(1, Math.abs(v) / 30), pale = Math.round(250 - 170 * u);
        map.fillStyle = v < 0 ? `rgb(${pale},${pale},235)` : `rgb(230,${pale},${pale})`;
        map.fillRect(hx(times[i]), 15 + r * 180 / result.a.length, (hw - 18 - left) / times.length + .5, 180 / result.a.length + .5);
      }));
      map.fillStyle = '#34454a'; map.textAlign = 'left'; map.fillText(result.a.length ? '1' : '无保留试次', 8, 28);
      if (result.a.length) map.fillText(String(result.a.length), 8, 193);
      for (const t of ticks) { map.textAlign = t === 1000 ? 'right' : 'center'; map.fillText(String(t), hx(t), 219); }
      root.dataset.ready = 'true';
    }
    root.querySelectorAll('input, select').forEach(control => control.addEventListener('change', draw)); draw();
    new ResizeObserver(draw).observe(canvas);
  }
}
