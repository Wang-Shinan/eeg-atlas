/**
 * Maps each source file in the local vault to the metadata the site needs.
 *
 * Subtitles and summaries here are our own editorial copy, not imported text.
 * To point the site at different source material, change `sourceDir` in
 * `sync-content.ts` and rewrite this list.
 */
export interface ChapterSource {
  /** File name inside the source directory. */
  file: string;
  /** URL segment, also the MDX file name. */
  slug: string;
  title: string;
  subtitle: string;
  summary: string;
  order: number;
  track: string;
  group: string;
}

export const chapterSources: readonly ChapterSource[] = [
  {
    file: '01 Basic EEG Electrophysiology.md',
    slug: 'basic-electrophysiology',
    title: 'Basic EEG Electrophysiology',
    subtitle: 'from ion channels to scalp voltage',
    summary:
      'How membrane potentials, synaptic currents and dipole geometry combine into the voltages an electrode can actually record.',
    order: 1,
    track: 'eeg',
    group: 'Foundations',
  },
  {
    file: '02 Montages and Technical Components.md',
    slug: 'montages-and-technical-components',
    title: 'Montages and Technical Components',
    subtitle: 'where electrodes become meaning',
    summary:
      'The 10–20 system, bipolar and referential montages, phase reversal, and the filter and sensitivity settings that shape every tracing.',
    order: 2,
    track: 'eeg',
    group: 'Foundations',
  },
  {
    file: '03 Terminology and Waveforms.md',
    slug: 'terminology-and-waveforms',
    title: 'Terminology and Waveforms',
    subtitle: 'the vocabulary of waveforms',
    summary:
      'Frequency, amplitude, phase and morphology — the descriptive language every later chapter depends on.',
    order: 3,
    track: 'eeg',
    group: 'Foundations',
  },
  {
    file: '04 Normal Awake EEG.md',
    slug: 'normal-awake',
    title: 'Normal Awake EEG',
    subtitle: 'reading the baseline brain',
    summary:
      'A systematic approach to the waking background: organisation, gradient, symmetry, reactivity and the posterior dominant rhythm.',
    order: 4,
    track: 'eeg',
    group: 'Normal EEG',
  },
  {
    file: '05 Normal Asleep EEG.md',
    slug: 'normal-asleep',
    title: 'Normal Asleep EEG',
    subtitle: 'architecture of the sleeping brain',
    summary:
      'Drowsiness through slow wave and REM sleep, and the graphoelements that mark each stage.',
    order: 5,
    track: 'eeg',
    group: 'Normal EEG',
  },
  {
    file: '06 Artifacts.md',
    slug: 'artifacts',
    title: 'Artifacts',
    subtitle: "everything that isn't cortex",
    summary:
      'Eye, muscle, cardiac, electrode and environmental signals — how to recognise them before mistaking them for pathology.',
    order: 6,
    track: 'eeg',
    group: 'Normal EEG',
  },
  {
    file: '07 Normal Variants.md',
    slug: 'normal-variants',
    title: 'Normal Variants',
    subtitle: 'benign patterns that look alarming',
    summary:
      'Sharply contoured but benign patterns that are routinely over-read as epileptiform.',
    order: 7,
    track: 'eeg',
    group: 'Normal EEG',
  },
  {
    file: '08 Neonatal EEG.md',
    slug: 'neonatal',
    title: 'Neonatal EEG',
    subtitle: 'the brain before term',
    summary:
      'Conceptional age, continuity, graphoelements and the abnormality patterns specific to the neonate.',
    order: 8,
    track: 'eeg',
    group: 'Developmental EEG',
  },
  {
    file: '09 Pediatric EEG.md',
    slug: 'pediatric',
    title: 'Pediatric EEG',
    subtitle: 'a background that keeps changing',
    summary:
      'How the normal background matures through childhood, and the age-dependent patterns and syndromes that follow it.',
    order: 9,
    track: 'eeg',
    group: 'Developmental EEG',
  },
  {
    file: '10 Slowing and Non-Epileptiform Abnormalities.md',
    slug: 'non-epileptiform-abnormalities',
    title: 'Slowing and Non-Epileptiform Abnormalities',
    subtitle: 'dysfunction without discharges',
    summary:
      'Focal and generalised slowing, attenuation and encephalopathy patterns, and what each localises to.',
    order: 10,
    track: 'eeg',
    group: 'Abnormal EEG',
  },
  {
    file: '11 Epileptiform Activity.md',
    slug: 'epileptiform-activity',
    title: 'Epileptiform Activity',
    subtitle: 'the irritable cortex',
    summary:
      'Spikes, sharp waves and their fields — the criteria that separate a true discharge from a convincing mimic.',
    order: 11,
    track: 'eeg',
    group: 'Abnormal EEG',
  },
  {
    file: '12 Seizures.md',
    slug: 'seizures',
    title: 'Seizures',
    subtitle: 'evolution in time and space',
    summary:
      'Electrographic seizure onset and evolution across focal, generalised, tonic, myoclonic and absence types.',
    order: 12,
    track: 'eeg',
    group: 'Abnormal EEG',
  },
  {
    file: '13 Glossary.md',
    slug: 'glossary',
    title: 'Glossary',
    subtitle: 'terms in one place',
    summary: 'Definitions for the terminology used across the course.',
    order: 13,
    track: 'eeg',
    group: 'Reference',
  },
];
