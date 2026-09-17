/** Teaching convention, not universal physiological boundaries. Used by chapters 1 and 3. */
export const frequencyBands = [
  { name: 'Delta', symbol: 'δ', range: '0.5 ≤ f < 4 Hz', example: 2, note: '慢波的常用描述；意义取决于年龄、状态与空间分布。' },
  { name: 'Theta', symbol: 'θ', range: '4 ≤ f < 8 Hz', example: 6, note: '可见于困倦和多种任务过程；不能只凭频段判断异常。' },
  { name: 'Alpha', symbol: 'α', range: '8 ≤ f < 13 Hz', example: 10, note: '闭眼后部节律的常见频率范围；其他部位也可有同频活动。' },
  { name: 'Beta', symbol: 'β', range: '13 ≤ f < 30 Hz', example: 20, note: '较快活动；观察时仍需结合分布、状态及药物等背景。' },
  { name: 'Gamma', symbol: 'γ', range: '30 ≤ f ≤ 80 Hz', example: 40, note: '本教程采用的示例分析范围；头皮记录尤其需要排查肌电等污染。' },
] as const;
