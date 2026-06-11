import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://lucra-app.ai',
  output: 'static',
  // Single canonical URL shape: every route is emitted as dir/index.html and
  // linked with a trailing slash (canonical/hreflang/internal links all match).
  trailingSlash: 'always',
  integrations: [
    // i18n: emit hreflang alternates linking the sv (/) and en (/en/) routes.
    sitemap({ i18n: { defaultLocale: 'sv', locales: { sv: 'sv-SE', en: 'en-US' } } }),
  ],
});
