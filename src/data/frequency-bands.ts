/** Teaching convention, not universal physiological boundaries. Used by the introductory reading chapter. */
export const frequencyBands = [
  { name: 'Delta', symbol: 'δ', range: '每秒 0.5～不足 4 周', example: 2, note: '较慢的起伏，结合睡眠等状态一起观察。' },
  { name: 'Theta', symbol: 'θ', range: '每秒 4～不足 8 周', example: 6, note: '常在困倦和多种任务研究中遇到。' },
  { name: 'Alpha', symbol: 'α', range: '每秒 8～不足 13 周', example: 10, note: '闭眼时后部常见的节奏在这一范围。' },
  { name: 'Beta', symbol: 'β', range: '每秒 13～不足 30 周', example: 20, note: '较快的起伏，运动等研究会观察它的变化。' },
  { name: 'Gamma', symbol: 'γ', range: '每秒 30～80 周（本页示例范围）', example: 40, note: '更快的起伏，测量时也要留意肌肉活动的影响。' },
] as const;
