/* Shared build helpers for the three CCFC sites (ccfczambia.org, koinonia., worship.).
   Source of truth lives in ccfc-site; tools-sync-core.sh copies it to the other two repos.
   - headTags(): canonical, robots, Open Graph, Twitter, manifest, favicons, preconnects
   - clean(): rewrites internal links to root-relative clean URLs (/about, not about.html) and assets to /assets/...
   - sitemapXml(), robotsTxt(), manifestJson() */
'use strict';
const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const slug = file => (file === 'index.html' ? '' : file.replace(/\.html$/, ''));
const urlOf = (origin, file) => origin + '/' + slug(file);

function headTags({ origin, file, title, desc, noindex, ogImage, ogAlt, siteName, themeColor, locale = 'en_ZM', type = 'website' }) {
  const url = urlOf(origin, file);
  const img = /^https?:/.test(ogImage) ? ogImage : origin + '/' + String(ogImage).replace(/^\//, '');
  return [
    `<title>${esc(title)}</title>`,
    `<meta name="description" content="${esc(desc)}">`,
    `<link rel="canonical" href="${url}">`,
    `<meta name="robots" content="${noindex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large'}">`,
    `<meta name="theme-color" content="${themeColor}">`,
    `<link rel="icon" href="/favicon.ico" sizes="any"><link rel="icon" href="/assets/logo/favicon-32.png?v=3" sizes="32x32" type="image/png"><link rel="icon" href="/assets/logo/favicon-192.png?v=3" sizes="192x192" type="image/png"><link rel="apple-touch-icon" href="/assets/logo/apple-touch-icon.png?v=3"><link rel="manifest" href="/site.webmanifest">`,
    `<meta property="og:type" content="${type}"><meta property="og:site_name" content="${esc(siteName)}"><meta property="og:locale" content="${locale}">`,
    `<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}"><meta property="og:url" content="${url}">`,
    `<meta property="og:image" content="${img}"><meta property="og:image:secure_url" content="${img}"><meta property="og:image:type" content="image/jpeg"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:image:alt" content="${esc(ogAlt || title)}">`,
    `<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${esc(title)}"><meta name="twitter:description" content="${esc(desc)}"><meta name="twitter:image" content="${img}"><meta name="twitter:image:alt" content="${esc(ogAlt || title)}">`,
    `<link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin><link rel="preconnect" href="https://dcqydtkjzgilyjnjyisb.supabase.co" crossorigin>`,
  ].join('\n');
}

/* internal .html links -> clean root-relative URLs; relative asset paths -> root-relative (so /any/unknown/path 404s still load CSS) */
function clean(html) {
  return html
    .replace(/(href|action)="(?:\.\/)?([a-z0-9][a-z0-9-]*)\.html((?:\?[^"#]*)?)((?:#[^"]*)?)"/gi, (m, attr, name, q, h) => `${attr}="/${name === 'index' ? '' : name}${q}${h}"`)
    .replace(/(href)="(https:\/\/(?:koinonia\.|worship\.)?ccfczambia\.org)\/([a-z0-9][a-z0-9-]*)\.html/gi, (m, attr, o, name) => `${attr}="${o}/${name === 'index' ? '' : name}`)
    .replace(/(\s(?:src|href|poster|data-src|data-src4k)=")(assets|css|js)\//g, '$1/$2/')
    .replace(/(\ssrcset=")([^"]+)"/g, (m, a, v) => a + v.replace(/(^|,\s*)assets\//g, '$1/assets/') + '"')
    .replace(/url\((['"]?)assets\//g, 'url($1/assets/');
}

function sitemapXml(origin, pages, today = new Date().toISOString().slice(0, 10)) {
  const rows = pages.filter(p => !p.noindex && p.file !== '404.html').map(p => {
    const pr = p.file === 'index.html' ? '1.0' : (p.priority || '0.6');
    return `  <url><loc>${urlOf(origin, p.file)}</loc><lastmod>${p.lastmod || today}</lastmod><changefreq>${p.changefreq || 'monthly'}</changefreq><priority>${pr}</priority></url>`;
  });
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${rows.join('\n')}\n</urlset>\n`;
}

function robotsTxt(origin, extraSitemaps = [], disallow = ['/dashboard', '/account']) {
  return `# ${origin}\nUser-agent: *\nAllow: /\n${disallow.map(d => `Disallow: ${d}`).join('\n')}\n\nSitemap: ${origin}/sitemap.xml\n${extraSitemaps.map(s => `Sitemap: ${s}`).join('\n')}${extraSitemaps.length ? '\n' : ''}`;
}

function manifestJson({ name, short, themeColor, background }) {
  return JSON.stringify({ name, short_name: short, start_url: '/', scope: '/', display: 'standalone', theme_color: themeColor, background_color: background,
    icons: [{ src: '/assets/logo/favicon-192.png?v=3', sizes: '192x192', type: 'image/png' }, { src: '/assets/logo/favicon-512.png?v=3', sizes: '512x512', type: 'image/png' }, { src: '/assets/logo/favicon-512.png?v=3', sizes: '512x512', type: 'image/png', purpose: 'maskable' }] }, null, 2);
}

/* checks run on every page at build time so bad SEO never ships silently */
function lint(p, title, desc) {
  const w = [];
  if (!p.noindex && p.file !== '404.html') {
    if (title.length > 60) w.push(`title ${title.length} chars`);
    if (desc.length < 110 || desc.length > 160) w.push(`description ${desc.length} chars`);
  }
  if (/[—–]/.test(title + desc)) w.push('dash in title or description');
  if (w.length) console.warn(`  seo ${p.file}: ${w.join(', ')}`);
  return w;
}

module.exports = { headTags, clean, sitemapXml, robotsTxt, manifestJson, lint, urlOf, slug, esc };
