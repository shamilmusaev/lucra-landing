import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://lucra.se',
  output: 'static',
  integrations: [
    // i18n: emit hreflang alternates linking the sv (/) and en (/en/) routes.
    sitemap({ i18n: { defaultLocale: 'sv', locales: { sv: 'sv-SE', en: 'en-US' } } }),
  ],
});
