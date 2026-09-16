import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const outputDir = fileURLToPath(new URL('../public/figures/', import.meta.url));
await mkdir(outputDir, { recursive: true });

const colors = {
  paper: '#fbfaf7',
  ink: '#1a1a18',
  muted: '#6b6862',
  rule: '#e2ded4',
  accent: '#8a5a2b',
  teal: '#2f6f68',
  coral: '#b35d48',
  blue: '#487a9c',
  soft: '#f3ece1',
};

const escape = (value) => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const label = (x, y, value, size = 22, fill = colors.ink, anchor = 'start', weight = 400) =>
  `<text x="${x}" y="${y}" font-family="PingFang SC, Arial, sans-serif" font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}">${escape(value)}</text>`;
const line = (x1, y1, x2, y2, stroke = colors.rule, width = 2, dash = '') =>
  `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${stroke}" stroke-width="${width}" ${dash ? `stroke-dasharray="${dash}"` : ''}/>`;
const arrow = (x1, y1, x2, y2, stroke = colors.accent) =>
  `<path d="M ${x1} ${y1} L ${x2} ${y2}" stroke="${stroke}" stroke-width="4" fill="none" marker-end="url(#arrow)"/>`;
const polyline = (points, stroke, width = 4, fill = 'none') =>
  `<polyline points="${points.map(([x, y]) => `${x},${y}`).join(' ')}" stroke="${stroke}" stroke-width="${width}" fill="${fill}" stroke-linecap="round" stroke-linejoin="round"/>`;
const sine = (x, y, width, cycles, amplitude, phase = 0, samples = 120) => {
  const points = [];
  for (let i = 0; i <= samples; i += 1) {
    const px = x + (i / samples) * width;
    const py = y - Math.sin((i / samples) * Math.PI * 2 * cycles + phase) * amplitude;
    points.push([px, py]);
  }
  return points;
};

const shell = (title, subtitle, body, height = 900) => `
<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="${height}" viewBox="0 0 1600 ${height}">
  <defs>
    <marker id="arrow" markerWidth="12" markerHeight="12" refX="10" refY="6" orient="auto"><path d="M0,0 L12,6 L0,12 Z" fill="${colors.accent}"/></marker>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="8" stdDeviation="10" flood-color="#1a1a18" flood-opacity="0.08"/></filter>
  </defs>
  <rect width="1600" height="${height}" fill="${colors.paper}"/>
  ${label(80, 78, title, 40, colors.ink, 'start', 650)}
  ${label(80, 116, subtitle, 20, colors.muted)}
  ${body}
</svg>`;

async function save(name, svg) {
  await sharp(Buffer.from(svg)).png().toFile(join(outputDir, `${name}.png`));
}

const signalBody = `
  <rect x="80" y="170" width="320" height="600" rx="18" fill="#fff" stroke="${colors.rule}" filter="url(#shadow)"/>
  ${label(120, 225, '1  突触后电位', 25, colors.accent, 'start', 650)}
  ${label(120, 263, '大量方向相近的锥体细胞', 18, colors.muted)}
  <path d="M240 610 C180 530 190 420 240 350 C290 420 300 530 240 610Z" fill="${colors.soft}" stroke="${colors.accent}" stroke-width="4"/>
  <line x1="240" y1="350" x2="240" y2="260" stroke="${colors.accent}" stroke-width="4"/>
  <line x1="240" y1="260" x2="215" y2="215" stroke="${colors.accent}" stroke-width="4"/>
  <line x1="240" y1="260" x2="265" y2="215" stroke="${colors.accent}" stroke-width="4"/>
  <path d="M130 355 C160 310 170 280 190 260 M350 355 C320 310 310 280 290 260" stroke="${colors.teal}" stroke-width="5" fill="none" stroke-linecap="round"/>
  ${label(240, 665, '同步兴奋 / 抑制', 19, colors.teal, 'middle', 600)}
  ${arrow(420, 470, 520, 470)}

  <rect x="560" y="170" width="320" height="600" rx="18" fill="#fff" stroke="${colors.rule}" filter="url(#shadow)"/>
  ${label(600, 225, '2  电偶极子', 25, colors.accent, 'start', 650)}
  ${label(600, 263, '局部电流叠加成可传播的场', 18, colors.muted)}
  <ellipse cx="720" cy="470" rx="110" ry="170" fill="${colors.soft}" stroke="${colors.accent}" stroke-width="4"/>
  <circle cx="720" cy="345" r="24" fill="${colors.coral}"/>
  <circle cx="720" cy="595" r="24" fill="${colors.blue}"/>
  ${label(760, 354, '+', 26, colors.coral, 'start', 700)}
  ${label(760, 604, '−', 26, colors.blue, 'start', 700)}
  ${line(720, 375, 720, 565, colors.accent, 5)}
  ${label(720, 680, '方向与同步性决定头皮上能否看到', 17, colors.muted, 'middle')}
  ${arrow(900, 470, 1000, 470)}

  <rect x="1040" y="170" width="480" height="600" rx="18" fill="#fff" stroke="${colors.rule}" filter="url(#shadow)"/>
  ${label(1080, 225, '3  电极差分 → EEG', 25, colors.accent, 'start', 650)}
  ${label(1080, 263, '电极记录电位差，而不是单个神经元的动作电位', 18, colors.muted)}
  <path d="M1110 400 C1170 300 1320 300 1400 400 C1450 465 1440 570 1350 640 C1260 710 1140 655 1100 545 C1085 505 1085 445 1110 400Z" fill="#f6f2eb" stroke="${colors.rule}" stroke-width="3"/>
  <circle cx="1260" cy="345" r="15" fill="${colors.accent}"/>
  ${label(1290, 352, '头皮电极', 18, colors.ink, 'start', 600)}
  ${line(1260, 360, 1260, 475, colors.accent, 3, '7 7')}
  ${label(1260, 520, '参考', 17, colors.muted, 'middle')}
  ${line(1190, 490, 1330, 490, colors.teal, 4)}
  ${label(1260, 540, 'V电极 − V参考', 19, colors.teal, 'middle', 650)}
  ${line(1100, 690, 1460, 690, colors.rule, 2)}
  ${polyline(sine(1100, 690, 360, 5, 28, 0.5), colors.coral, 4)}
  ${label(1100, 735, '时间', 16, colors.muted)}
  ${label(1460, 735, '电压', 16, colors.muted, 'end')}
`;

const mapPoints = [
  ['Fp1', 650, 260], ['Fp2', 950, 260], ['F7', 550, 350], ['F3', 690, 345], ['Fz', 800, 335], ['F4', 910, 345], ['F8', 1050, 350],
  ['T7', 520, 475], ['C3', 680, 460], ['Cz', 800, 455], ['C4', 920, 460], ['T8', 1080, 475],
  ['P7', 555, 600], ['P3', 690, 585], ['Pz', 800, 595], ['P4', 910, 585], ['P8', 1045, 600], ['O1', 690, 700], ['O2', 910, 700],
];
const tenTwentyBody = `
  <g transform="translate(50 10)">
    <circle cx="800" cy="480" r="285" fill="#fff" stroke="${colors.ink}" stroke-width="5"/>
    <path d="M760 195 L800 150 L840 195" fill="#fff" stroke="${colors.ink}" stroke-width="5"/>
    <path d="M510 455 C470 420 470 520 510 485 M1090 455 C1130 420 1130 520 1090 485" fill="none" stroke="${colors.ink}" stroke-width="6"/>
    ${label(800, 128, '鼻根 / nasion', 18, colors.muted, 'middle')}
    ${label(800, 808, '枕骨 / inion', 18, colors.muted, 'middle')}
    ${line(800, 205, 800, 755, colors.rule, 2, '8 8')}
    ${line(535, 480, 1065, 480, colors.rule, 2, '8 8')}
    ${mapPoints.map(([name, x, y]) => `<circle cx="${x}" cy="${y}" r="14" fill="${name.endsWith('z') ? colors.coral : colors.accent}" stroke="#fff" stroke-width="4"/>${label(x, y - 24, name, 18, colors.ink, 'middle', 650)}`).join('')}
    ${label(800, 865, '示意图：实际放置应沿头部标志点测量 10% / 20% 间距', 19, colors.muted, 'middle')}
  </g>
  <g transform="translate(1120 220)">
    ${label(0, 0, '命名规则', 24, colors.accent, 'start', 650)}
    ${label(0, 46, 'Fp / F / C / P / O / T', 20, colors.ink, 'start', 600)}
    ${label(0, 78, '代表前额极、额、中央、顶、枕、颞区', 16, colors.muted)}
    ${label(0, 138, '奇数', 20, colors.coral, 'start', 650)}
    ${label(82, 138, '左侧', 18, colors.ink)}
    ${label(0, 180, '偶数', 20, colors.blue, 'start', 650)}
    ${label(82, 180, '右侧', 18, colors.ink)}
    ${label(0, 222, 'z', 20, colors.coral, 'start', 650)}
    ${label(30, 222, '中线', 18, colors.ink)}
    <rect x="0" y="280" width="360" height="155" rx="14" fill="${colors.soft}"/>
    ${label(24, 320, '注意', 18, colors.accent, 'start', 650)}
    ${label(24, 355, '这是拓扑与命名的学习图，', 17, colors.ink)}
    ${label(24, 382, '不是个体化定位或放置测量指南。', 17, colors.ink)}
  </g>
`;

const waveformRows = [
  ['delta', '< 4 Hz', 2, colors.blue],
  ['theta', '4–< 8 Hz', 5.5, colors.teal],
  ['alpha', '8–13 Hz', 10, colors.accent],
  ['beta', '> 13 Hz', 18, colors.coral],
];
const frequencyBody = `
  ${waveformRows.map(([name, range, cycles, color], index) => {
    const y = 220 + index * 125;
    return `<rect x="90" y="${y - 58}" width="980" height="96" rx="12" fill="#fff" stroke="${colors.rule}"/>
      ${label(125, y - 18, name, 24, color, 'start', 650)}
      ${label(125, y + 12, range, 17, colors.muted)}
      ${line(300, y, 1035, y, colors.rule, 2)}
      ${polyline(sine(320, y, 680, cycles, 24), color, 4)}`;
  }).join('')}
  <rect x="1120" y="165" width="390" height="520" rx="18" fill="${colors.soft}"/>
  ${label(1160, 220, 'alpha blocking', 25, colors.accent, 'start', 650)}
  ${label(1160, 258, '闭眼 → 睁眼时，后部 alpha', 17, colors.muted)}
  ${label(1160, 285, '通常减弱；这是状态/反应性', 17, colors.muted)}
  ${label(1160, 312, '的示范，不是诊断阈值。', 17, colors.muted)}
  ${label(1160, 370, '闭眼', 18, colors.ink, 'start', 650)}
  ${polyline(sine(1160, 410, 290, 7, 27), colors.accent, 4)}
  ${label(1160, 485, '睁眼', 18, colors.ink, 'start', 650)}
  ${polyline(sine(1160, 525, 290, 7, 10), colors.accent, 4)}
  ${label(1160, 620, '频率是每秒周期数；振幅是', 16, colors.muted)}
  ${label(1160, 647, '电压变化的显示尺度。', 16, colors.muted)}
`;

const seizureStages = [
  ['起始', '局部节律', 2.5, 18, colors.coral],
  ['演进', '频率 / 波幅改变', 4, 30, colors.accent],
  ['扩散', '更多导联参与', 5.5, 36, colors.teal],
  ['发作后', '衰减 / 慢化', 1.6, 15, colors.blue],
];
const seizureBody = seizureStages.map(([stage, detail, cycles, amplitude, color], index) => {
  const x = 90 + index * 375;
  const y = 255;
  const traces = Array.from({ length: 4 }, (_, trace) => {
    const gain = index === 2 ? 1 - trace * 0.14 : index === 0 ? 1 - trace * 0.22 : 0.9 - trace * 0.08;
    const points = sine(x + 32, y + 90 + trace * 52, 305, cycles, amplitude * gain, trace * 0.4);
    return polyline(points, color, trace === 0 ? 4 : 2.5);
  }).join('');
  return `<rect x="${x}" y="${y}" width="335" height="360" rx="16" fill="#fff" stroke="${colors.rule}" filter="url(#shadow)"/>
    ${label(x + 28, y + 44, `${index + 1}  ${stage}`, 23, color, 'start', 650)}
    ${label(x + 28, y + 75, detail, 16, colors.muted)}
    ${Array.from({ length: 4 }, (_, trace) => line(x + 32, y + 90 + trace * 52, x + 305, y + 90 + trace * 52, colors.rule, 1)).join('')}
    ${traces}`;
}).join('');
const seizureSvg = shell('电图发作不是一条静态波形', '教学示意：抓住节律、演进、分布与发作后改变；不要把示意图当作诊断规则。', seizureBody, 760);
const modelBody = `
  <rect x="85" y="230" width="270" height="360" rx="18" fill="#fff" stroke="${colors.rule}" filter="url(#shadow)"/>
  ${label(120, 280, '原始 EEG', 24, colors.accent, 'start', 650)}
  ${label(120, 315, '多通道 · 不同设备', 17, colors.muted)}
  ${Array.from({ length: 6 }, (_, i) => `${label(120, 365 + i * 36, ['Fp1', 'F3', 'C3', 'P3', 'O1', 'EOG'][i], 16, colors.muted)}${polyline(sine(180, 358 + i * 36, 135, i + 2, 10, i * 0.3), colors.blue, 2.5)}`).join('')}
  ${arrow(385, 410, 470, 410)}
  <rect x="500" y="230" width="270" height="360" rx="18" fill="${colors.soft}" stroke="${colors.rule}"/>
  ${label(535, 280, '切窗 / patch', 24, colors.accent, 'start', 650)}
  ${label(535, 315, '通道身份 + 时间位置', 17, colors.muted)}
  ${Array.from({ length: 5 }, (_, row) => Array.from({ length: 7 }, (_, col) => {
    const masked = (row + col) % 4 === 0;
    return `<rect x="${540 + col * 29}" y="${365 + row * 34}" width="22" height="22" rx="4" fill="${masked ? colors.rule : colors.teal}" opacity="${masked ? 0.9 : 0.78}"/>`;
  }).join('')).join('')}
  ${label(535, 570, '遮住一部分，让模型学会重建', 16, colors.muted)}
  ${arrow(800, 410, 885, 410)}
  <rect x="915" y="230" width="270" height="360" rx="18" fill="#fff" stroke="${colors.rule}" filter="url(#shadow)"/>
  ${label(950, 280, '表示学习', 24, colors.accent, 'start', 650)}
  ${label(950, 315, '重建 / 对比 / 时空编码', 17, colors.muted)}
  ${Array.from({ length: 3 }, (_, i) => `<circle cx="1050" cy="410" r="${82 - i * 22}" fill="none" stroke="${[colors.blue, colors.teal, colors.accent][i]}" stroke-width="${12 - i * 2}" stroke-dasharray="${18 - i * 3} ${10 + i * 3}"/>`).join('')}
  ${label(1050, 540, '跨数据集的可迁移表示', 16, colors.muted, 'middle')}
  ${arrow(1215, 410, 1295, 410)}
  <rect x="1325" y="230" width="200" height="360" rx="18" fill="#fff" stroke="${colors.rule}"/>
  ${label(1360, 280, '下游任务', 24, colors.accent, 'start', 650)}
  ${label(1360, 340, '发作检测', 18, colors.ink)}
  ${label(1360, 385, '睡眠分期', 18, colors.ink)}
  ${label(1360, 430, '异常筛查', 18, colors.ink)}
  ${label(1360, 475, 'BCI 解码', 18, colors.ink)}
  ${label(1360, 545, '注意：通道映射、预处理、', 15, colors.muted)}
  ${label(1360, 570, '划分协议都会改变比较含义。', 15, colors.muted)}
`;

const montageBody = `
  <rect x="80" y="165" width="690" height="520" rx="18" fill="#fff" stroke="${colors.rule}" filter="url(#shadow)"/>
  ${label(120, 220, '纵向双极：相位反转指向 T7', 26, colors.accent, 'start', 650)}
  ${label(120, 255, '同一局灶负向源，显示相邻电极之差', 17, colors.muted)}
  ${['F7–T7', 'T7–P7', 'P7–O1'].map((name, i) => `${label(120, 345 + i * 105, name, 18, colors.muted, 'start', 600)}${line(235, 340 + i * 105, 700, 340 + i * 105, colors.rule, 2)}`).join('')}
  <path d="M250 340 C330 340 350 300 405 250 C455 305 470 340 555 340" fill="none" stroke="${colors.coral}" stroke-width="5" stroke-linecap="round"/>
  <path d="M250 445 C330 445 350 485 405 535 C455 480 470 445 555 445" fill="none" stroke="${colors.teal}" stroke-width="5" stroke-linecap="round"/>
  ${polyline(sine(250, 550, 305, 4.5, 9), colors.blue, 3)}
  ${line(405, 270, 405, 520, colors.accent, 3, '7 7')}
  ${label(405, 610, '反转点靠近最大电位电极', 17, colors.accent, 'middle', 650)}

  <rect x="830" y="165" width="690" height="520" rx="18" fill="#fff" stroke="${colors.rule}" filter="url(#shadow)"/>
  ${label(870, 220, '平均参考：最大波幅显示电场中心', 26, colors.accent, 'start', 650)}
  ${label(870, 255, '各电极都与同一参考比较，没有链上相位反转', 17, colors.muted)}
  ${['F7–AVG', 'T7–AVG', 'P7–AVG'].map((name, i) => `${label(870, 345 + i * 105, name, 18, colors.muted, 'start', 600)}${line(1005, 340 + i * 105, 1450, 340 + i * 105, colors.rule, 2)}`).join('')}
  <path d="M1020 340 C1100 340 1140 315 1190 285 C1240 315 1270 340 1370 340" fill="none" stroke="${colors.coral}" stroke-width="4" stroke-linecap="round"/>
  <path d="M1020 445 C1100 445 1135 350 1190 280 C1245 350 1280 445 1370 445" fill="none" stroke="${colors.accent}" stroke-width="6" stroke-linecap="round"/>
  <path d="M1020 550 C1100 550 1140 525 1190 495 C1240 525 1270 550 1370 550" fill="none" stroke="${colors.teal}" stroke-width="4" stroke-linecap="round"/>
  ${label(1190, 610, 'T7 波幅最大，但仍需结合电场与参考质量', 17, colors.accent, 'middle', 650)}
`;

const sleepBody = [
  ['N1', 'alpha 解体 · theta 增多', colors.blue],
  ['N2', '纺锤 + K 复合波', colors.accent],
  ['N3', '高幅同步 delta', colors.teal],
  ['REM', '低幅混合频率 + 快速眼动', colors.coral],
].map(([stage, detail, color], index) => {
  const x = 80 + index * 380;
  const baseline = 440;
  let waveform = '';
  if (stage === 'N1') waveform = polyline(sine(x + 35, baseline, 285, 5.5, 18), color, 4);
  if (stage === 'N2') waveform = `${polyline(sine(x + 35, baseline, 90, 2, 12), color, 3)}<path d="M${x + 125} ${baseline} C${x + 145} ${baseline - 95} ${x + 165} ${baseline + 110} ${x + 205} ${baseline}" fill="none" stroke="${color}" stroke-width="5"/>${polyline(sine(x + 205, baseline, 115, 10, 22), color, 4)}`;
  if (stage === 'N3') waveform = polyline(sine(x + 35, baseline, 285, 2, 65), color, 5);
  if (stage === 'REM') waveform = `${polyline(sine(x + 35, baseline, 285, 7, 10), color, 3)}<path d="M${x + 80} 330 L${x + 115} 375 L${x + 150} 330 M${x + 185} 370 L${x + 220} 325 L${x + 255} 370" stroke="${colors.coral}" stroke-width="5" fill="none"/>`;
  return `<rect x="${x}" y="170" width="340" height="480" rx="16" fill="#fff" stroke="${colors.rule}" filter="url(#shadow)"/>
    ${label(x + 30, 225, stage, 30, color, 'start', 700)}
    ${label(x + 30, 260, detail, 17, colors.muted)}
    ${line(x + 30, baseline, x + 310, baseline, colors.rule, 2)}
    ${waveform}
    ${label(x + 30, 575, stage === 'N2' ? '注意：尖锐的顶点波仍可为正常睡眠结构' : stage === 'REM' ? '结合 EOG / EMG 才能可靠识别' : stage === 'N3' ? '慢波占比与年龄、药物有关' : '先看状态转换，不只看单个尖波', 15, colors.muted)}`;
}).join('');

const artifactRows = [
  ['眨眼', '前额高幅慢偏转，后部电场弱', colors.coral],
  ['肌电', '额颞部高频毛刺，随紧张或咀嚼改变', colors.accent],
  ['心电', '与 ECG 的 QRS 严格锁时', colors.teal],
  ['电极跳变', '单电极突发大幅偏移，无合理电场', colors.blue],
];
const artifactBody = artifactRows.map(([name, detail, color], index) => {
  const y = 205 + index * 125;
  let trace = '';
  if (index === 0) trace = `<path d="M430 ${y} C520 ${y} 545 ${y - 75} 600 ${y - 75} C655 ${y - 75} 680 ${y} 760 ${y} C850 ${y} 875 ${y - 55} 925 ${y - 55} C980 ${y - 55} 1005 ${y} 1110 ${y}" fill="none" stroke="${color}" stroke-width="5"/>`;
  if (index === 1) trace = polyline(sine(430, y, 680, 34, 16), color, 3);
  if (index === 2) trace = `<path d="M430 ${y} L530 ${y} L545 ${y - 52} L558 ${y + 25} L575 ${y} L735 ${y} L750 ${y - 52} L763 ${y + 25} L780 ${y} L940 ${y} L955 ${y - 52} L968 ${y + 25} L985 ${y} L1110 ${y}" fill="none" stroke="${color}" stroke-width="4"/>`;
  if (index === 3) trace = `<path d="M430 ${y} L670 ${y} L685 ${y - 95} L700 ${y + 75} L720 ${y - 25} L740 ${y} L1110 ${y}" fill="none" stroke="${color}" stroke-width="5"/>`;
  return `<rect x="90" y="${y - 55}" width="1420" height="100" rx="14" fill="#fff" stroke="${colors.rule}"/>
    ${label(125, y - 10, name, 23, color, 'start', 650)}
    ${label(125, y + 20, detail, 16, colors.muted)}
    ${line(410, y, 1140, y, colors.rule, 2)}${trace}
    ${label(1180, y + 6, ['看分布', '看频率', '看同步', '看单电极'][index], 18, color, 'start', 650)}`;
}).join('');

const sharpCompareBody = `
  <rect x="80" y="170" width="690" height="500" rx="18" fill="#fff" stroke="${colors.rule}" filter="url(#shadow)"/>
  ${label(120, 225, '癫痫样尖波：尖 + 慢波 + 合理电场', 25, colors.coral, 'start', 650)}
  ${['F7–T7', 'T7–P7', 'P7–O1'].map((name, i) => `${label(120, 340 + i * 95, name, 17, colors.muted, 'start', 600)}${line(235, 335 + i * 95, 700, 335 + i * 95, colors.rule, 2)}`).join('')}
  ${[0.55, 1, 0.45].map((gain, i) => `<path d="M250 ${335 + i * 95} L390 ${335 + i * 95} L410 ${335 - 110 * gain + i * 95} L430 ${335 + 36 * gain + i * 95} C470 ${335 + 78 * gain + i * 95} 525 ${335 + 70 * gain + i * 95} 575 ${335 + i * 95} L690 ${335 + i * 95}" fill="none" stroke="${colors.coral}" stroke-width="${i === 1 ? 5 : 3.5}"/>`).join('')}
  ${label(425, 620, '后继慢波', 17, colors.coral, 'middle', 650)}

  <rect x="830" y="170" width="690" height="500" rx="18" fill="#fff" stroke="${colors.rule}" filter="url(#shadow)"/>
  ${label(870, 225, 'Wicket 波：成串弧形 · 无后继慢波', 25, colors.teal, 'start', 650)}
  ${['F7–T7', 'T7–P7', 'P7–O1'].map((name, i) => `${label(870, 340 + i * 95, name, 17, colors.muted, 'start', 600)}${line(1005, 335 + i * 95, 1450, 335 + i * 95, colors.rule, 2)}`).join('')}
  ${[0.35, 1, 0.35].map((gain, i) => `<path d="M1020 ${335 + i * 95} ${Array.from({length: 6}, (_, j) => `Q${1050 + j * 62} ${335 - 50 * gain + i * 95} ${1080 + j * 62} ${335 + i * 95}`).join(' ')}" fill="none" stroke="${colors.teal}" stroke-width="${i === 1 ? 5 : 3}"/>`).join('')}
  ${label(1175, 620, '频率与形态稳定，不向周围演进', 17, colors.teal, 'middle', 650)}
`;

const awakeBody = `
  <rect x="80" y="170" width="450" height="500" rx="18" fill="#fff" stroke="${colors.rule}" filter="url(#shadow)"/>
  ${label(120, 225, '1  连续与对称', 25, colors.accent, 'start', 650)}
  ${label(120, 260, '左右频率与波幅大体相称', 17, colors.muted)}
  ${['左侧', '右侧'].map((name, i) => `${label(120, 380 + i * 120, name, 17, colors.muted, 'start', 600)}${line(195, 375 + i * 120, 475, 375 + i * 120, colors.rule, 2)}${polyline(sine(205, 375 + i * 120, 255, 8, 18, i * 0.4), colors.teal, 4)}`).join('')}
  ${label(305, 610, '先确认整页组织，再追单个瞬态', 16, colors.teal, 'middle', 650)}

  <rect x="575" y="170" width="450" height="500" rx="18" fill="#fff" stroke="${colors.rule}" filter="url(#shadow)"/>
  ${label(615, 225, '2  前后梯度', 25, colors.accent, 'start', 650)}
  ${label(615, 260, '前部较快低幅，后部 alpha 更突出', 17, colors.muted)}
  ${['F3–C3', 'C3–P3', 'P3–O1'].map((name, i) => `${label(615, 355 + i * 105, name, 17, colors.muted, 'start', 600)}${line(700, 350 + i * 105, 970, 350 + i * 105, colors.rule, 2)}${polyline(sine(710, 350 + i * 105, 245, 14 - i * 3, 9 + i * 7), [colors.blue, colors.teal, colors.accent][i], 3.5)}`).join('')}
  ${label(800, 610, '分布规律比单一频段更有信息', 16, colors.accent, 'middle', 650)}

  <rect x="1070" y="170" width="450" height="500" rx="18" fill="#fff" stroke="${colors.rule}" filter="url(#shadow)"/>
  ${label(1110, 225, '3  PDR 反应性', 25, colors.accent, 'start', 650)}
  ${label(1110, 260, '闭眼出现，睁眼通常衰减', 17, colors.muted)}
  ${label(1110, 350, '闭眼', 17, colors.muted, 'start', 600)}
  ${line(1180, 345, 1460, 345, colors.rule, 2)}
  ${polyline(sine(1190, 345, 255, 9, 24), colors.accent, 4)}
  ${label(1110, 485, '睁眼', 17, colors.muted, 'start', 600)}
  ${line(1180, 480, 1460, 480, colors.rule, 2)}
  ${polyline(sine(1190, 480, 255, 9, 8), colors.accent, 3)}
  ${label(1295, 610, '检查频率、对称与反应性', 16, colors.accent, 'middle', 650)}
`;

await save('signal-origin', shell('从突触后电位到头皮 EEG', '原创教学图：把“细胞—电场—差分—波形”串成一条可追踪的链路。', signalBody));
await save('ten-twenty-map', shell('10–20 电极命名与空间拓扑', '原创示意图：按国际系统的命名规则绘制；具体放置仍需测量头部标志点。', tenTwentyBody, 980));
await save('frequency-atlas', shell('频率只是描述的第一步', '四个常用频段的形态示意，以及闭眼到睁眼时 alpha 减弱的教学演示。', frequencyBody, 760));
await save('seizure-evolution', seizureSvg);
await save('model-pipeline', shell('EEG 基础模型：从窗口到可迁移表示', '原创流程图：输入结构、遮罩重建与下游适配之间的关系。', modelBody, 760));
await save('montage-phase-reversal', shell('同一局灶源，在两种导联下如何变化', '原创合成示意：导联改变显示方式，不改变底层源。', montageBody, 760));
await save('sleep-stage-atlas', shell('睡眠结构速览', '原创合成示意：用典型元素建立分期线索，不代表单一患者记录。', sleepBody, 760));
await save('artifact-atlas', shell('四类常见伪迹：先找非脑线索', '原创合成示意：分布、频率、同步关系和单电极行为往往比“形态像不像”更可靠。', artifactBody, 760));
await save('sharp-vs-wicket', shell('尖锐不等于癫痫样', '原创合成对照：把后继慢波、电场与演进放在形态之前。', sharpCompareBody, 760));
await save('awake-background', shell('正常清醒背景：先看整页结构', '原创合成示意：连续性、对称性、前后梯度与后部主导节律是一组关系。', awakeBody, 760));
