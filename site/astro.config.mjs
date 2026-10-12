import { defineConfig } from 'astro/config';
import preact from '@astrojs/preact';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  // SITE_URL / SITE_BASE are set when building for a sub-path host (see scripts/prefix-base.mjs)
  site: process.env.SITE_URL || 'https://observatoriomigracion.pe',
  base: process.env.SITE_BASE || '/',
  output: 'static',
  trailingSlash: 'always',
  integrations: [preact({ compat: false }), mdx(), sitemap()],
  i18n: { defaultLocale: 'es', locales: ['es', 'en'], routing: { prefixDefaultLocale: false } },
  vite: { build: { chunkSizeWarningLimit: 900 } },
});
