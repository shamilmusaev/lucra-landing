import { defineCollection } from 'astro:content';
import { z } from 'astro:schema';
import { glob } from 'astro/loaders';

// Blog articles authored in Keystatic — Markdoc files written to src/content/posts.
const posts = defineCollection({
  loader: glob({ pattern: '**/*.mdoc', base: './src/content/posts' }),
  schema: z.object({
    title: z.string(),
    publishedDate: z.coerce.date(),
    summary: z.string(),
    coverImage: z.string().nullable().optional(),
  }),
});

export const collections = { posts };
