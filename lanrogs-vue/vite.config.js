import { defineConfig, loadEnv } from 'vite';
import vue from '@vitejs/plugin-vue';

// The public address of the site (used for Google: sitemap, canonical, link previews).
function siteUrl(env) {
  const v = env.VITE_SITE_URL || process.env.VITE_SITE_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL ? 'https://' + process.env.VERCEL_PROJECT_PRODUCTION_URL : '');
  return v.replace(/\/+$/, '');
}

function seoFiles(env) {
  const site = siteUrl(env);
  return {
    name: 'lanrogs-seo',
    // fills __SITE_URL__ in index.html
    transformIndexHtml(html) { return html.replace(/__SITE_URL__/g, site); },
    // writes sitemap.xml and robots.txt into the build
    generateBundle() {
      const pages = ['/', '/contact', '/privacy'];
      const sitemap = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
        pages.map(function (p) { return '  <url><loc>' + site + p + '</loc></url>'; }).join('\n') + '\n</urlset>\n';
      const robots = 'User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /login\nDisallow: /profile\n' +
        (site ? '\nSitemap: ' + site + '/sitemap.xml\n' : '');
      this.emitFile({ type: 'asset', fileName: 'sitemap.xml', source: sitemap });
      this.emitFile({ type: 'asset', fileName: 'robots.txt', source: robots });
    },
  };
}

export default defineConfig(function ({ mode }) {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  return { plugins: [vue(), seoFiles(env)] };
});
