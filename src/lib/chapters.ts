import { getCollection, type CollectionEntry } from 'astro:content';
import { tracks, type TrackDefinition } from '../site.config';
import { legacyChapters } from '../data/legacy-chapters';
import { withBase } from './urls';
export type Chapter = CollectionEntry<'chapters'>;
export interface ChapterGroup { name: string; chapters: Chapter[]; }
export interface TrackSection { track: TrackDefinition; groups: ChapterGroup[]; }
export function chapterHref(chapter: Chapter): string { return withBase(`/chapters/${chapter.id}/`); }
export function chapterNumber(chapter: Chapter): string {
  if (legacyChapters[chapter.id]) return '参考';
  if (chapter.id === 'eeg/glossary') return '附录';
  const offset = chapter.data.track === 'foundation-models' ? 13 : chapter.data.track === 'dataset-rules' ? 15 : 0;
  return String(chapter.data.order - offset).padStart(2, '0');
}
export async function getSortedChapters(includeLegacy = false): Promise<Chapter[]> {
  const all = await getCollection('chapters');
  return all.filter(c => includeLegacy || !legacyChapters[c.id]).sort((a, b) => {
    const order = (c: Chapter) => c.id === 'eeg/glossary' ? 99 : c.data.order;
    return order(a) - order(b) || a.id.localeCompare(b.id);
  });
}
export async function getTrackSections(): Promise<TrackSection[]> {
  const chapters = await getSortedChapters();
  return tracks.map(track => {
    const inTrack = chapters.filter(c => c.data.track === track.id);
    const names = [...track.groups.filter(name => inTrack.some(c => c.data.group === name)),
      ...new Set(inTrack.map(c => c.data.group).filter(name => !track.groups.includes(name)))];
    return { track, groups: names.map(name => ({ name, chapters: inTrack.filter(c => c.data.group === name) })) };
  }).filter(section => section.groups.length > 0);
}
export async function getChapterNeighbors(id: string): Promise<{ prev: Chapter | undefined; next: Chapter | undefined }> {
  const all = await getSortedChapters();
  const current = all.find(c => c.id === id);
  if (!current) return { prev: undefined, next: undefined };
  const inTrack = all.filter(c => c.data.track === current.data.track);
  const i = inTrack.findIndex(c => c.id === id);
  return { prev: inTrack[i - 1], next: inTrack[i + 1] };
}
