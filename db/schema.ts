export const editorSchema = {
  siteSettings: {
    name: 'site_settings',
    primaryKey: ['key'],
  },
  chapters: {
    name: 'chapters',
    primaryKey: ['path'],
    unique: ['slug'],
    indexes: [['source_kind', 'sort_order'], ['track', 'group_name', 'sort_order']],
  },
  chapterRevisions: {
    name: 'chapter_revisions',
    primaryKey: ['id'],
    indexes: [['chapter_path', 'created_at']],
  },
  media: {
    name: 'media',
    primaryKey: ['id'],
    indexes: [['owner_user_id', 'created_at']],
  },
} as const;

export type ChapterSourceKind = 'static' | 'custom';

export interface StoredChapter {
  path: string;
  slug: string;
  sourceKind: ChapterSourceKind;
  track: string;
  groupName: string;
  sortOrder: number;
  title: string;
  subtitle: string;
  summary: string;
  patchesJson: string | null;
  contentHtml: string | null;
  createdBy: string;
  updatedBy: string;
  createdAt: number;
  updatedAt: number;
}
