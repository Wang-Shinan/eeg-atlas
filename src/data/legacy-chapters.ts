/** Preserve published URLs without keeping the old clinical syllabus in navigation. */
export const legacyChapters: Record<string, string> = {
  'eeg/normal-awake': 'eeg/states-and-sleep',
  'eeg/normal-asleep': 'eeg/states-and-sleep',
  'eeg/artifacts': 'eeg/experiments-and-epochs',
  'eeg/normal-variants': 'eeg/clinical-overview',
  'eeg/neonatal': 'eeg/clinical-overview',
  'eeg/pediatric': 'eeg/clinical-overview',
  'eeg/non-epileptiform-abnormalities': 'eeg/clinical-overview',
  'eeg/epileptiform-activity': 'eeg/clinical-overview',
  'eeg/seizures': 'eeg/clinical-overview',
};
