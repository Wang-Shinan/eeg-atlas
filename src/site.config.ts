export interface TrackDefinition {
  /** Value stored in each chapter's `track` frontmatter field. */
  id: string;
  label: string;
  tagline: string;
  /** Order in which groups belonging to this track are listed on the home page. */
  groups: readonly string[];
}

export const site = {
  title: 'EEG Atlas',
  tagline: '脑电图结构化教程',
  description:
    '按章节学习脑电图判读：从膜电位到发作，并另设 EEG 基础模型专题。',
} as const;

export const tracks: readonly TrackDefinition[] = [
  {
    id: 'eeg',
    label: '判读脑电图',
    tagline: '从膜电位到发作',
    groups: ['基础', '正常 EEG', '发育期 EEG', '异常 EEG', '参考'],
  },
  {
    id: 'foundation-models',
    label: 'EEG 基础模型',
    tagline: '大规模预训练遇见临床信号',
    groups: ['模型与评测'],
  },
];
