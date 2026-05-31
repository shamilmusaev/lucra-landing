import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import react from '@astrojs/react';
import markdoc from '@astrojs/markdoc';
import keystatic from '@keystatic/astro';
import netlify from '@astrojs/netlify';

export default defineConfig({
  site: 'https://lucra.se',
  output: 'static',
  adapter: netlify(),
  integrations: [react(), markdoc(), keystatic(), sitemap()],
});
