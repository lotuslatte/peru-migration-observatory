import type { APIRoute } from 'astro';
// Generated so the sitemap URL follows SITE_URL / SITE_BASE.
export const GET: APIRoute = ({ site }) => {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  const sitemap = new URL(`${base}/sitemap-index.xml`, site).toString();
  return new Response(`User-agent: *\nAllow: /\nDisallow: ${base}/embed/\n\nSitemap: ${sitemap}\n`, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
