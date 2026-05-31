import { config, fields, collection } from '@keystatic/core';

// In dev we edit files directly on disk (no auth). In production the admin UI
// commits to GitHub — the target repo is provided via env so it can be set on
// Netlify without touching code (format: "owner/repo").
const githubRepo = (import.meta.env.PUBLIC_KEYSTATIC_GITHUB_REPO ??
  'OWNER/REPO') as `${string}/${string}`;

export default config({
  storage: import.meta.env.DEV
    ? { kind: 'local' }
    : { kind: 'github', repo: githubRepo },
  ui: {
    brand: { name: 'Lucra' },
  },
  collections: {
    posts: collection({
      label: 'Artiklar',
      slugField: 'title',
      path: 'src/content/posts/*',
      format: { contentField: 'content' },
      entryLayout: 'content',
      columns: ['title', 'publishedDate'],
      schema: {
        title: fields.slug({
          name: { label: 'Titel' },
          slug: { label: 'URL-slug' },
        }),
        publishedDate: fields.date({
          label: 'Publiceringsdatum',
          validation: { isRequired: true },
        }),
        summary: fields.text({
          label: 'Sammanfattning',
          description: 'Kort ingress — visas i listan och som meta-beskrivning.',
          multiline: true,
          validation: { isRequired: true, length: { min: 1, max: 320 } },
        }),
        coverImage: fields.image({
          label: 'Omslagsbild',
          directory: 'public/blog/images',
          publicPath: '/blog/images/',
        }),
        content: fields.markdoc({
          label: 'Innehåll',
          options: {
            image: {
              directory: 'public/blog/images',
              publicPath: '/blog/images/',
            },
          },
        }),
      },
    }),
  },
});
