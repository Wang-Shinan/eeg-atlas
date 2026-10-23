export interface TrackDefinition {
  id: string;
  label: string;
  tagline: string;
  groups: readonly string[];
}
export const site = {
  title: 'EEG Atlas',
  tagline: '从零认识脑电与脑机接口',
  description: '从听见声音、想象动作和进入睡眠等熟悉经历出发，用例子、图示和小练习认识脑电与脑机接口。',
} as const;
export const tracks: readonly TrackDefinition[] = [
  { id: 'eeg', label: '脑电与脑机接口', tagline: '从熟悉的经历出发，逐步理解测量与实验', groups: ['基础', '实验与事件', '感知与选择', '行动与想象', '认知与状态', '应用与边界', '参考'] },
  { id: 'foundation-models', label: 'EEG 基础模型', tagline: '有机器学习基础后，继续阅读模型与评测', groups: ['模型与评测'] },
  { id: 'dataset-rules', label: 'Dataset Rules', tagline: '供整理研究数据时查阅的格式与规范', groups: ['规范导读', '核心规则', '预训练与校验'] },
];
