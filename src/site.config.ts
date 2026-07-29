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
  tagline: 'a structured course in electroencephalography',
  description:
    'A chapter-by-chapter course in reading EEG, from membrane potentials through seizures, plus a track on EEG foundation models.',
} as const;

export const tracks: readonly TrackDefinition[] = [
  {
    id: 'eeg',
    label: 'Reading the EEG',
    tagline: 'from membrane potentials to seizures',
    groups: ['Foundations', 'Normal EEG', 'Developmental EEG', 'Abnormal EEG', 'Reference'],
  },
  {
    id: 'foundation-models',
    label: 'EEG Foundation Models',
    tagline: 'large-scale pretraining meets clinical signal',
    groups: ['Models & Benchmarks'],
  },
];
