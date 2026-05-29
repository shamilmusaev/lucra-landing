import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://lucra.se',
  output: 'static',
  integrations: [sitemap()],
});
