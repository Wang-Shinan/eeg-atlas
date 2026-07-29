import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'zod';

const chapters = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/chapters' }),
  schema: z.object({
    title: z.string(),
    subtitle: z.string(),
    /** Position within the whole course; also drives prev/next navigation. */
    order: z.number().int(),
    track: z.string(),
    group: z.string(),
    /** Shown on the chapter header and in link previews. */
    summary: z.string().optional(),
    /** True for chapters produced by `npm run sync` from the local vault. */
    generated: z.boolean().default(false),
  }),
});

export const collections = { chapters };
