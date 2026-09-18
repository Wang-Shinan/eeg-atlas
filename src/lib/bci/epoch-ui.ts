import { analyze, makeTrials, times, type Alignment } from './epochs';
export function initEpochLabs() {
  for (const root of document.querySelectorAll<HTMLElement>('[data-epoch-lab]')) {
    if (root.dataset.ready) continue;
    const select = (s: string) => root.querySelector<HTMLSelectElement>(s)!;
    const flag = (s: string) => root.querySelector<HTMLInputElement>(s)!.checked;
    const canvas = root.querySelector<HTMLCanvasElement>('[data-epoch-mean]')!;
    const heat = root.querySelector<HTMLCanvasElement>('[data-epoch-trials]')!;
    const ctx = canvas.getContext('2d'), h = heat.getContext('2d');
    if (!ctx || !h) { root.querySelector('[data-epoch-status]')!.textContent = '此浏览器无法绘制 Canvas；请阅读下方构造说明。'; continue; }
    const line = ctx, map = h;
    const x = (t: number) => 60 + (t + 200) / 1200 * 740;
    const y = (v: number) => 165 - v * 4;
    function draw() {
      const align = select('[data-align]').value as Alignment;
      const n = Number(select('[data-count]').value);
      const result = analyze(makeTrials(Number(select('[data-jitter]').value)), n, align, flag('[data-baseline]'), flag('[data-reject]'));
      root.dataset.nA = String(result.a.length); root.dataset.nB = String(result.b.length); root.dataset.alignment = align;
      const status = `实际保留 A ${result.a.length} / B ${result.b.length} 条；${align === 'stimulus' ? '刺激' : '反应'}锁定；基线${flag('[data-baseline]') ? '始终为刺激前 −200～0 ms' : '未校正'}。`;
      root.querySelector('[data-epoch-status]')!.textContent = status + (result.a.length ? '' : '无有效 A 试次，不计算或绘制 A 平均与 A−B。');
      line.clearRect(0, 0, 840, 340); line.fillStyle = '#fbfaf7'; line.fillRect(0, 0, 840, 340); line.font = '16px sans-serif';
      for (let v = -30; v <= 30; v += 10) { line.strokeStyle = '#d7d9d5'; line.beginPath(); line.moveTo(60, y(v)); line.lineTo(800, y(v)); line.stroke(); line.fillStyle = '#525b60'; line.fillText(String(v), 12, y(v) + 5); }
      for (let t = -200; t <= 1000; t += 200) { line.strokeStyle = t === 0 ? '#59636b' : '#d7d9d5'; line.beginPath(); line.moveTo(x(t), 25); line.lineTo(x(t), 290); line.stroke(); line.fillStyle = '#525b60'; line.fillText(String(t), x(t) - 14, 316); }
      line.fillText('µV', 10, 20); line.fillText('ms', 803, 316);
      const rows: [number[], string, boolean][] = [[result.avgB, '#b56c2e', false]];
      if (result.a.length) rows.unshift([result.avgA, '#136b6e', false], [result.difference, '#64487b', true]);
      for (const [row, color, dashed] of rows) {
        line.save(); line.beginPath(); line.rect(60, 25, 740, 265); line.clip(); line.strokeStyle = color; line.lineWidth = 2.5; line.setLineDash(dashed ? [7, 4] : []); line.beginPath();
        row.forEach((v, i) => i ? line.lineTo(x(times[i]), y(v)) : line.moveTo(x(times[i]), y(v))); line.stroke(); line.restore();
      }
      map.clearRect(0, 0, 840, 230); map.fillStyle = '#fbfaf7'; map.fillRect(0, 0, 840, 230);
      result.a.forEach((row, r) => row.forEach((v, i) => {
        const u = Math.min(1, Math.abs(v) / 30), pale = Math.round(250 - 170 * u);
        map.fillStyle = v < 0 ? `rgb(${pale},${pale},235)` : `rgb(230,${pale},${pale})`;
        map.fillRect(x(times[i]), 15 + r * 180 / result.a.length, 740 / times.length + 1, 180 / result.a.length + .5);
      }));
      map.fillStyle = '#34454a'; map.font = '16px sans-serif'; map.fillText(result.a.length ? '1' : '无保留试次', 12, 30); if (result.a.length) map.fillText(String(result.a.length), 12, 193);
      for (let t = -200; t <= 1000; t += 200) map.fillText(String(t), x(t) - 14, 219);
      root.dataset.ready = 'true';
    }
    root.querySelectorAll('input, select').forEach(control => control.addEventListener('change', draw)); draw();
  }
}
