import { getCollection, type CollectionEntry } from 'astro:content';
import { tracks, type TrackDefinition } from '../site.config';
import { withBase } from './urls';

export type Chapter = CollectionEntry<'chapters'>;

export interface ChapterGroup {
  name: string;
  chapters: Chapter[];
}

export interface TrackSection {
  track: TrackDefinition;
  groups: ChapterGroup[];
}

export function chapterHref(chapter: Chapter): string {
  return withBase(`/chapters/${chapter.id}/`);
}

/** Two-digit label used in the chapter index, e.g. `03`. */
export function chapterNumber(chapter: Chapter): string {
  return String(chapter.data.order).padStart(2, '0');
}

export async function getSortedChapters(): Promise<Chapter[]> {
  const chapters = await getCollection('chapters');
  return chapters.sort((a, b) => a.data.order - b.data.order);
}

/**
 * Groups chapters for the home page. Group order follows `tracks` config, and
 * any group not listed there is appended so new content is never dropped.
 */
export async function getTrackSections(): Promise<TrackSection[]> {
  const chapters = await getSortedChapters();

  return tracks
    .map((track) => {
      const inTrack = chapters.filter((chapter) => chapter.data.track === track.id);
      const names = [
        ...track.groups.filter((name) => inTrack.some((c) => c.data.group === name)),
        ...new Set(
          inTrack.map((c) => c.data.group).filter((name) => !track.groups.includes(name)),
        ),
      ];

      return {
        track,
        groups: names.map((name) => ({
          name,
          chapters: inTrack.filter((chapter) => chapter.data.group === name),
        })),
      };
    })
    .filter((section) => section.groups.length > 0);
}

export async function getChapterNeighbors(
  id: string,
): Promise<{ prev: Chapter | undefined; next: Chapter | undefined }> {
  const chapters = await getSortedChapters();
  const index = chapters.findIndex((chapter) => chapter.id === id);
  return { prev: chapters[index - 1], next: chapters[index + 1] };
}
