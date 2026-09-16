CREATE TABLE IF NOT EXISTS `site_settings` (
  `key` text PRIMARY KEY NOT NULL,
  `value` text NOT NULL,
  `updated_at` integer NOT NULL
);

CREATE TABLE IF NOT EXISTS `chapters` (
  `path` text PRIMARY KEY NOT NULL,
  `slug` text NOT NULL,
  `source_kind` text NOT NULL CHECK (`source_kind` IN ('static', 'custom')),
  `track` text NOT NULL,
  `group_name` text NOT NULL,
  `sort_order` integer NOT NULL DEFAULT 999,
  `title` text NOT NULL,
  `subtitle` text NOT NULL DEFAULT '',
  `summary` text NOT NULL DEFAULT '',
  `patches_json` text,
  `content_html` text,
  `created_by` text NOT NULL,
  `updated_by` text NOT NULL,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS `idx_chapters_slug`
ON `chapters` (`slug`);

CREATE INDEX IF NOT EXISTS `idx_chapters_source_order`
ON `chapters` (`source_kind`, `sort_order`);

CREATE INDEX IF NOT EXISTS `idx_chapters_track_group_order`
ON `chapters` (`track`, `group_name`, `sort_order`);

CREATE TABLE IF NOT EXISTS `chapter_revisions` (
  `id` text PRIMARY KEY NOT NULL,
  `chapter_path` text NOT NULL,
  `snapshot_json` text NOT NULL,
  `created_by` text NOT NULL,
  `created_at` integer NOT NULL
);

CREATE INDEX IF NOT EXISTS `idx_revisions_chapter_created`
ON `chapter_revisions` (`chapter_path`, `created_at`);

CREATE TABLE IF NOT EXISTS `media` (
  `id` text PRIMARY KEY NOT NULL,
  `object_key` text NOT NULL,
  `filename` text NOT NULL,
  `content_type` text NOT NULL,
  `size_bytes` integer NOT NULL,
  `owner_user_id` text NOT NULL,
  `created_at` integer NOT NULL
);

CREATE INDEX IF NOT EXISTS `idx_media_owner_created`
ON `media` (`owner_user_id`, `created_at`);

PRAGMA optimize;
