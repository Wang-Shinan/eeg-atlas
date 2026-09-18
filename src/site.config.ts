export interface TrackDefinition {
  id: string;
  label: string;
  tagline: string;
  groups: readonly string[];
}
export const site = {
  title: 'EEG Atlas',
  tagline: '脑电与脑机接口交互教材',
  description: '从脑电生理、空间坐标和信号观察，到 ERP、SSVEP、运动、听觉注意与人机协作；附 EEG 基础模型和神经影像数据规范。',
} as const;
export const tracks: readonly TrackDefinition[] = [
  { id: 'eeg', label: '脑电与脑机接口', tagline: '从信号、实验到人机协作', groups: ['基础', '实验与事件', '感知与选择', '行动与想象', '认知与状态', '应用与边界', '参考'] },
  { id: 'foundation-models', label: 'EEG 基础模型', tagline: '表示学习、迁移与评测', groups: ['模型与评测'] },
  { id: 'dataset-rules', label: 'Dataset Rules', tagline: 'Lance + TOML 神经影像数据规范', groups: ['规范导读', '核心规则', '预训练与校验'] },
];
