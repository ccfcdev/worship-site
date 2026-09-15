/* Shared build helpers for the three CCFC sites (ccfczambia.org, koinonia., worship.).
   Source of truth lives in ccfc-site; tools-sync-core.sh copies it to the other two repos.
   - headTags(): canonical, robots, Open Graph, Twitter, manifest, favicons, preconnects
   - clean(): rewrites internal links to root-relative clean URLs (/about, not about.html) and assets to /assets/...
   - sitemapXml(), robotsTxt(), manifestJson()
   - editable(), loadPageContent(), writeContentMap(): the page editor (see PAGE EDITOR below) */
'use strict';
const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const slug = file => (file === 'index.html' ? '' : file.replace(/\.html$/, ''));
const urlOf = (origin, file) => origin + '/' + slug(file);

function headTags({ origin, file, title, desc, noindex, ogImage, ogAlt, siteName, themeColor, locale = 'en_ZM', type = 'website', preloadImage, iconV = '3' }) {
  const url = urlOf(origin, file);
  const img = /^https?:/.test(ogImage) ? ogImage : origin + '/' + String(ogImage).replace(/^\//, '');
  return [
    `<title>${esc(title)}</title>`,
    `<meta name="description" content="${esc(desc)}">`,
    `<link rel="canonical" href="${url}">`,
    `<meta name="robots" content="${noindex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large'}">`,
    `<meta name="theme-color" content="${themeColor}">`,
    `<link rel="icon" href="/favicon.ico?v=${iconV}" sizes="any"><link rel="icon" href="/assets/logo/favicon-32.png?v=${iconV}" sizes="32x32" type="image/png"><link rel="icon" href="/assets/logo/favicon-192.png?v=${iconV}" sizes="192x192" type="image/png"><link rel="apple-touch-icon" href="/assets/logo/apple-touch-icon.png?v=${iconV}"><link rel="manifest" href="/site.webmanifest">`,
    `<meta property="og:type" content="${type}"><meta property="og:site_name" content="${esc(siteName)}"><meta property="og:locale" content="${locale}">`,
    `<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}"><meta property="og:url" content="${url}">`,
    `<meta property="og:image" content="${img}"><meta property="og:image:secure_url" content="${img}"><meta property="og:image:type" content="image/jpeg"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:image:alt" content="${esc(ogAlt || title)}">`,
    `<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${esc(title)}"><meta name="twitter:description" content="${esc(desc)}"><meta name="twitter:image" content="${img}"><meta name="twitter:image:alt" content="${esc(ogAlt || title)}">`,
    preloadImage ? `<link rel="preload" as="image" href="${preloadImage}" fetchpriority="high">` : '',
    `<link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin><link rel="preconnect" href="https://dcqydtkjzgilyjnjyisb.supabase.co" crossorigin>`,
  ].join('\n');
}

/* internal .html links -> clean root-relative URLs; relative asset paths -> root-relative (so /any/unknown/path 404s still load CSS) */
function clean(html) {
  return html
    .replace(/(href|action)="(?:\.\/)?([a-z0-9][a-z0-9-]*)\.html((?:\?[^"#]*)?)((?:#[^"]*)?)"/gi, (m, attr, name, q, h) => `${attr}="/${name === 'index' ? '' : name}${q}${h}"`)
    .replace(/(href)="(https:\/\/(?:koinonia\.|worship\.)?ccfczambia\.org)\/([a-z0-9][a-z0-9-]*)\.html/gi, (m, attr, o, name) => `${attr}="${o}/${name === 'index' ? '' : name}`)
    .replace(/(\s(?:src|href|poster|data-src|data-src720|data-src4k)=")(assets|css|js)\//g, '$1/$2/')
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
  if (new RegExp('[' + String.fromCharCode(0x2013, 0x2014) + ']').test(title + desc)) w.push('dash in title or description');
  if (w.length) console.warn(`  seo ${p.file}: ${w.join(', ')}`);
  return w;
}

/* Mazar, the AI Bible companion: its mark (a star of light in a broken halo) and the navbar / menu buttons that open it (js/mazar.js binds [data-mazar]) */
function mazarMark(id = 'mzm') {
  return `<svg class="mz-mark" viewBox="0 0 48 48" aria-hidden="true" focusable="false"><defs><linearGradient id="${id}" x1="8" y1="6" x2="40" y2="42" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="var(--mz-light,#FFF7DC)"/><stop offset=".55" stop-color="var(--mz-glow,#EBC872)"/><stop offset="1" stop-color="var(--mz-glow-2,#B98A3E)"/></linearGradient></defs><path d="M24 6.5a17.5 17.5 0 1 1-12.4 5.1" fill="none" stroke="url(#${id})" stroke-width="1.6" stroke-linecap="round"/><path d="M24 2v6M24 40v6" stroke="url(#${id})" stroke-width="1.2" stroke-linecap="round" opacity=".8"/><path d="M24 12c.8 8.4 3.6 11.2 12 12-8.4.8-11.2 3.6-12 12-.8-8.4-3.6-11.2-12-12 8.4-.8 11.2-3.6 12-12z" fill="url(#${id})"/></svg>`;
}
const mazarNav = () => `<button class="nav__mazar" type="button" data-mazar aria-label="Open Mazar, the AI Bible companion">${mazarMark('mzm-nav')}<span>Mazar</span></button>`;
const mazarMenu = () => `<button class="mzq" type="button" data-mazar>${mazarMark('mzm-menu')}<span><b>Ask Mazar</b><small>AI Bible companion, prayer and small tasks</small></span></button>`;

/* ================================================================ PAGE EDITOR
   Master Admins change the static pages through Mazar Prime (table public.page_content, one row per changed slot).
   editable(html, { site, file, origin, overrides, map }) runs on every built page (after clean()) and:
   - tags every heading, paragraph, list item, quote, label, link and photo inside <main>, plus the shared header,
     menu and footer, with data-edit="<page>:<kind>:<hash>" (kind text | image | link | section). The hash is taken
     from the element's own default text or src, so a key stays the same when sections are added above it; the same
     text twice on a page gets -2, -3. Header, menu and footer use the "site" scope so one change shows on every page.
     An override whose default changed in code no longer matches any key and is reported as stale.
   - bakes the current overrides into the HTML, exactly as js/core.js applyPageContent() renders them at runtime, so
     search engines see the change and the page does not flash when the script runs.
   - pushes one entry per slot into opts.map; writeContentMap() writes content-map.json, which Mazar Prime reads.
   Text with inline markup uses a tiny safe markup (the HTML is escaped first): **bold**, _emphasis_, [label](url),
   a new line for <br>, and {1}, {2} for pieces that must stay as they are (a styled word, the year, a live setting).
   Never tagged: scripts, forms, the Mazar widget, [data-setting] text (Site text tab), live counters and anything
   inside [data-no-edit]. Dashboard and account pages keep only the shared header, menu and footer.
   The child rules below (decoration, inline markup, {n} pieces) are mirrored in js/core.js; change both together. */
const PE_SITES = ['ccfc', 'koinonia', 'worship'], PE_SEP = String.fromCharCode(0x203a);
const PE_STORAGE = 'https://dcqydtkjzgilyjnjyisb.supabase.co/storage/v1/object/public/site-photos/';   /* the page photos bucket */
const PE_VOID = new Set('area base br col embed hr img input link meta param source track wbr'.split(' '));
const PE_RAW = new Set(['script', 'style', 'textarea', 'title']);
const PE_P_CLOSERS = new Set('address article aside blockquote details dialog div dl fieldset figcaption figure footer form h1 h2 h3 h4 h5 h6 header hgroup hr main menu nav ol p pre section table ul'.split(' '));
const PE_SKIP_TAGS = new Set('script style noscript template iframe video audio canvas svg math form input select textarea option object embed picture dialog head'.split(' '));
const PE_SKIP_ATTRS = ['data-no-edit', 'data-setting', 'data-mazar', 'data-count', 'data-cd', 'aria-live', 'data-photos', 'data-zips', 'data-auth'];
const PE_SKIP_CLASS = /^(mz|nav__mazar$|nav__account$|drawer__account$|menu__account$|nav__signin$|pre$|toast$|feed__list$|feed__composer$|feed__filters$|dash__|reg__status$)/;
const PE_SKIP_IDS = new Set(['mazar', 'mazar-page', 'dashboard', 'account']);
const PE_SKIP_PAGES = /^(dashboard|account|admin)\.html$/;
/* live pieces are filled in by scripts, so inside a text they always count as a {n} piece, never as decoration */
const PE_LIVE_ATTRS = ['data-setting', 'data-cd', 'data-count', 'aria-live'], PE_LIVE_CLASS = /(^|\s)year(\s|$)/;
const PE_INLINE = { b: 'b', strong: 'b', em: 'em', i: 'em' };
const PE_ENT = { amp: 38, lt: 60, gt: 62, quot: 34, apos: 39, nbsp: 160, middot: 183, copy: 169, reg: 174, trade: 8482, times: 215, hellip: 8230, rsquo: 8217, lsquo: 8216, rdquo: 8221, ldquo: 8220, ndash: 8211, mdash: 8212, bull: 8226, rarr: 8594, larr: 8592, deg: 176, euro: 8364, pound: 163 };
const peDecode = s => String(s).replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => e[0] === '#' ? String.fromCodePoint(/^#x/i.test(e) ? parseInt(e.slice(2), 16) : +e.slice(1)) : (PE_ENT[e.toLowerCase()] ? String.fromCodePoint(PE_ENT[e.toLowerCase()]) : m));
const peText = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const peAttrText = s => peText(s).replace(/"/g, '&quot;');
/* the sites' writing rule: no em or en dashes (a range becomes "19 to 21", anything else a comma) */
const PE_DASH = '[' + String.fromCharCode(0x2013, 0x2014) + ']', PE_RANGE = new RegExp('(\\d)\\s*' + PE_DASH + '\\s*(\\d)', 'g'), PE_DASHES = new RegExp('\\s*' + PE_DASH + '\\s*', 'g');
const PE_DASH1 = new RegExp(PE_DASH);
const peDash = s => String(s ?? '').replace(PE_RANGE, '$1 to $2').replace(PE_DASHES, ', ');
const peNorm = s => String(s).replace(/[^\S\n]+/g, ' ').replace(/ *\n */g, '\n').trim();
const peSpaces = s => String(s).replace(/\s+/g, ' ');   /* JS \s includes the no-break space */
const peBlank = s => !/\S/.test(String(s));
const peTag = /<\s*\/?\s*[a-z!]/i;
/* link targets the page editor accepts (the same list is enforced by the database and by Mazar Prime) */
/* printable ASCII only: no look-alike hosts, and no dash can reach a page through a link */
const peHref = h => typeof h === 'string' && h.length <= 500 && !/[^ -~]/.test(h) && /^(https:\/\/[^\s"'<>\\\/][^\s"'<>\\]*|\/(?![\/\\])[^\s"'<>\\]*|#[A-Za-z0-9_:.-]*|mailto:[^\s"'<>\\]+|tel:\+?[0-9 ()-]{3,30})$/.test(h);
const PE_SRC_STORAGE = new RegExp('^' + PE_STORAGE.replace(/[.\/]/g, '\\$&') + '(ccfc|koinonia|worship)/[A-Za-z0-9_-]{1,80}\\.(jpe?g|png|webp)$');
const peSrc = s => typeof s === 'string' && s.length <= 500 && !s.includes('..') && ((/^\/assets\/[A-Za-z0-9_.\/-]+\.(webp|jpe?g|png|avif|gif|svg)(\?v=[A-Za-z0-9._-]+)?$/.test(s) && !s.includes('//')) || PE_SRC_STORAGE.test(s));
const peJsonAttr = v => peAttrText(JSON.stringify(v).replace(/[^ -~]/g, c => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0')));

/* ---- a small HTML tree with source offsets (our own generated markup; enough of the HTML rules for it) ---- */
function peParse(src) {
  const root = { type: 'root', tag: '#root', attrs: [], children: [], s: 0, se: 0, ce: src.length, e: src.length };
  const stack = [root], top = () => stack[stack.length - 1];
  let i = 0, t0 = 0;
  const text = (a, b) => { if (b > a) top().children.push({ type: 'text', s: a, e: b, parent: top() }); };
  const pop = at => { const n = stack.pop(); n.ce = n.e = at; };
  while (i < src.length) {
    const lt = src.indexOf('<', i); if (lt < 0) break;
    if (src.startsWith('<!--', lt)) { const x = src.indexOf('-->', lt + 4), e = x < 0 ? src.length : x + 3; text(t0, lt); top().children.push({ type: 'comment', s: lt, e, parent: top() }); i = t0 = e; continue; }
    if (src[lt + 1] === '!' || src[lt + 1] === '?') { const x = src.indexOf('>', lt), e = x < 0 ? src.length : x + 1; text(t0, lt); top().children.push({ type: 'comment', s: lt, e, parent: top() }); i = t0 = e; continue; }
    if (src[lt + 1] === '/') {
      const m = /^<\/([a-zA-Z][a-zA-Z0-9-]*)\s*>/.exec(src.slice(lt, lt + 80)); if (!m) { i = lt + 1; continue; }
      const name = m[1].toLowerCase(); let k = stack.length - 1; while (k > 0 && stack[k].tag !== name) k--;
      text(t0, lt); const e = lt + m[0].length;
      if (k > 0) { while (stack.length - 1 > k) pop(lt); const n = stack.pop(); n.ce = lt; n.e = e; }
      else top().children.push({ type: 'comment', s: lt, e, parent: top() });   /* a stray end tag is kept as it is */
      i = t0 = e; continue;
    }
    const m = /^<([a-zA-Z][a-zA-Z0-9-]*)/.exec(src.slice(lt, lt + 80)); if (!m) { i = lt + 1; continue; }
    const tag = m[1].toLowerCase(), attrs = []; let j = lt + m[0].length, selfClose = false;
    const re = /\s*(?:(\/?>)|([^\s"'>\/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?|(\/))/y;
    for (;;) {
      if (j >= src.length) break;
      re.lastIndex = j; const a = re.exec(src); if (!a) { j++; continue; }
      j = re.lastIndex;
      if (a[1]) { selfClose = a[1] === '/>'; break; }
      if (a[2]) attrs.push({ name: a[2].toLowerCase(), value: peDecode(a[3] ?? a[4] ?? a[5] ?? ''), raw: src.slice(a.index, j).trim() });
    }
    text(t0, lt);
    if (top().tag === 'p' && PE_P_CLOSERS.has(tag)) pop(lt);
    else if ((tag === 'li' && top().tag === 'li') || (/^d[td]$/.test(tag) && /^d[td]$/.test(top().tag))) pop(lt);
    const n = { type: 'el', tag, attrs, s: lt, se: j, ce: j, e: j, children: [], parent: top(), selfClose };
    top().children.push(n);
    if (PE_RAW.has(tag)) {
      const close = src.toLowerCase().indexOf('</' + tag, j), ce = close < 0 ? src.length : close, x = close < 0 ? src.length : src.indexOf('>', close) + 1;
      if (ce > j) n.children.push({ type: 'text', s: j, e: ce, parent: n, raw: true });
      n.ce = ce; n.e = x; i = t0 = x; continue;
    }
    if (!PE_VOID.has(tag) && !selfClose) stack.push(n);
    i = t0 = j;
  }
  text(t0, src.length);
  while (stack.length > 1) pop(src.length);
  return root;
}
const peAttr = (n, name) => { const a = n.attrs && n.attrs.find(x => x.name === name); return a ? a.value : null; };
const peHas = (n, name) => !!(n.attrs && n.attrs.some(x => x.name === name));
function peEmit(src, n, hook) {
  if (n.type !== 'el' && n.type !== 'root') return src.slice(n.s, n.e);
  const h = hook && n.type === 'el' ? hook(n) : null;
  const start = h && h.start != null ? h.start : src.slice(n.s, n.se);
  const inner = h && h.inner != null ? h.inner : n.children.map(c => peEmit(src, c, hook)).join('');
  return start + inner + src.slice(n.ce, n.e);
}
const peStartTag = (n, attrs) => `<${n.tag}${attrs.map(a => ' ' + a).join('')}${n.selfClose ? ' />' : '>'}`;

/* ---- the child rules (mirrored in js/core.js) ---- */
/* words for labels (a <br> reads as a space); keys keep using peTextOf so they never move */
const peWords = (src, n) => n.type === 'text' ? peTextOf(src, n) : n.type === 'el' ? (n.tag === 'br' ? ' ' : n.children.map(c => peWords(src, c)).join('')) : '';
const peTextOf = (src, n) => n.type === 'text' ? (n.raw ? '' : peDecode(src.slice(n.s, n.e))) : n.type === 'el' ? n.children.map(c => peTextOf(src, c)).join('') : '';
const peHasImg = n => n.type === 'el' && (n.tag === 'img' || n.children.some(peHasImg));
const peLive = n => PE_LIVE_ATTRS.some(a => peHas(n, a)) || PE_LIVE_CLASS.test(peAttr(n, 'class') || '');
function peSkip(n) {
  if (n.type !== 'el') return false;
  if (PE_SKIP_TAGS.has(n.tag) || PE_SKIP_ATTRS.some(a => peHas(n, a)) || PE_SKIP_IDS.has(peAttr(n, 'id')) || peAttr(n, 'aria-hidden') === 'true') return true;
  return String(peAttr(n, 'class') || '').split(/\s+/).some(c => c && PE_SKIP_CLASS.test(c));
}
/* an inline child the markup can say: <b>/<strong>/<em>/<i> with no attributes and plain text, <a> with only href/target/rel and plain text, <br> */
function peInline(src, n) {
  if (n.type !== 'el') return null;
  if (n.tag === 'br') return 'br';
  const plain = n.children.length > 0 && n.children.every(c => c.type === 'text') && !peBlank(peTextOf(src, n));
  if (PE_INLINE[n.tag] && !n.attrs.length && plain) return PE_INLINE[n.tag];
  if (n.tag === 'a' && plain && n.attrs.every(a => ['href', 'target', 'rel'].includes(a.name)) && peHref(peAttr(n, 'href'))) return 'a';
  return null;
}
/* decoration: an element with no text, no photo and nothing live (an icon, an empty separator, a <br>). Decorations
   before the first and after the last piece of text stay outside the editable text; ones in between become {n}. */
const peContent = (src, c) => c.type === 'text' ? !peBlank(peTextOf(src, c)) : !(peBlank(peTextOf(src, c)) && !peHasImg(c) && !peLive(c));
function peZones(src, n) {
  const kids = n.children.filter(c => c.type === 'text' || c.type === 'el');
  const F = kids.findIndex(c => peContent(src, c)); if (F < 0) return null;
  let L = kids.length - 1; while (!peContent(src, kids[L])) L--;
  return { kids, F, L };
}
function peMini(src, n) {   /* the element's text in the page-editor markup, and its {n} pieces */
  const z = peZones(src, n); if (!z) return null;
  let out = '', marks = 0; const pieces = [], tags = { b: null, em: null };
  for (let k = z.F; k <= z.L; k++) {
    const c = z.kids[k];
    if (c.type === 'text') { out += peSpaces(peTextOf(src, c)); continue; }
    const kind = peInline(src, c);
    if (kind === 'br') { out += '\n'; marks++; }
    else if (kind === 'b' || kind === 'em') { const t = peSpaces(peTextOf(src, c)), mark = kind === 'b' ? '**' : '_'; tags[kind] = tags[kind] || c.tag; out += (/^ /.test(t) ? ' ' : '') + mark + t.trim() + mark + (/ $/.test(t) ? ' ' : ''); marks++; }
    else if (kind === 'a') { out += `[${peSpaces(peTextOf(src, c)).trim()}](${peAttr(c, 'href')})`; marks++; }
    else { pieces.push(c); out += `{${pieces.length}}`; marks++; }
  }
  const first = z.kids[z.F], last = z.kids[z.L];
  return { text: peNorm(out), marks, pieces, tags, z, wsBefore: first.type === 'text' && /^\s/.test(peTextOf(src, first)), wsAfter: last.type === 'text' && /\s$/.test(peTextOf(src, last)) };
}
/* parse the markup into text, br, b, em, a and {n} piece tokens */
function peMiniParse(s) {
  const out = [], re = /\{(\d{1,2})\}|\n|\[([^\[\]\n]{1,300})\]\(([^()\s]{1,500})\)|\*\*([^*\n]+?)\*\*|_([^_\n]+?)_/g; let last = 0, m;
  while ((m = re.exec(s))) {
    if (m.index > last) out.push({ t: 'text', v: s.slice(last, m.index) });
    if (m[1] !== undefined) out.push({ t: 'piece', n: +m[1] }); else if (m[0] === '\n') out.push({ t: 'br' });
    else if (m[2] !== undefined) out.push({ t: 'a', v: m[2], href: m[3] }); else if (m[4] !== undefined) out.push({ t: 'b', v: m[4] }); else out.push({ t: 'em', v: m[5] });
    last = re.lastIndex;
  }
  if (last < s.length) out.push({ t: 'text', v: s.slice(last) });
  return out;
}
const peExternal = h => /^https:\/\//i.test(h) && !/^https:\/\/([a-z0-9-]+\.)?ccfczambia\.org(\/|$)/i.test(h);
/* markup -> HTML for baking; pieces are the HTML of the {n} pieces. null when the value cannot be used. */
function peMiniHtml(value, { rich, tags = {}, pieces = [] }) {
  if (!rich) return peText(value);
  const used = []; let html = '';
  for (const x of peMiniParse(value)) {
    if (x.t === 'text') html += peText(x.v);
    else if (x.t === 'br') html += '<br>';
    else if (x.t === 'b' || x.t === 'em') { const t = tags[x.t] || x.t; html += `<${t}>${peText(x.v)}</${t}>`; }
    else if (x.t === 'a') { if (!peHref(x.href)) return null; html += `<a href="${peAttrText(x.href)}"${peExternal(x.href) ? ' target="_blank" rel="noopener"' : ''}>${peText(x.v)}</a>`; }
    else { if (x.n < 1 || x.n > pieces.length || used.includes(x.n)) return null; used.push(x.n); html += pieces[x.n - 1]; }
  }
  return used.length === pieces.length ? html : null;
}
const peHash = s => require('crypto').createHash('sha1').update(s).digest('hex').slice(0, 8);
const peClip = (s, n = 70) => { s = peNorm(String(s || '').replace(/\n/g, ' ')); return s.length > n ? s.slice(0, n - 3).trimEnd() + '...' : s; };

/* value rules used when baking (the database and Mazar Prime enforce the same ones); returns the cleaned value or null */
function peValue(kind, v, slot) {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return null;
  /* text: also refused when something that looks like a [link](target) does not read as an allowed link (it would show its brackets) */
  if (kind === 'text') { if (typeof v.text !== 'string') return null; const t = peNorm(peDash(v.text)); return t && t.length <= 2000 && !peTag.test(t) && !peMiniParse(t).some(x => x.t === 'text' && /\]\(/.test(x.v)) ? { text: t } : null; }
  if (kind === 'image') { if (!peSrc(v.src) || (v.alt != null && (typeof v.alt !== 'string' || v.alt.length > 300 || peTag.test(v.alt)))) return null; return { src: v.src, alt: v.alt != null ? peNorm(peDash(v.alt)) : null }; }
  if (kind === 'link') {
    const href = v.href == null ? null : v.href, label = v.label == null ? null : v.label;
    if (href !== null && !peHref(href)) return null;
    if (label !== null && (typeof label !== 'string' || !peNorm(label) || label.length > 200 || peTag.test(label) || (slot && slot.label == null))) return null;
    return href === null && label === null ? null : { href, label: label === null ? null : peNorm(peDash(label)) };
  }
  if (kind === 'section') return typeof v.visible === 'boolean' ? { visible: v.visible } : null;
  return null;
}

function editable(html, opts = {}) {
  const { site, file = 'index.html', origin = '', overrides = [], map = null } = opts;
  if (!PE_SITES.includes(site)) throw new Error('editable(): site must be one of ' + PE_SITES.join(', '));
  const page = String(file).replace(/\.html$/, '') || 'index';
  if (!/^[a-z0-9][a-z0-9-]*$/.test(page) || page === 'site') throw new Error('editable(): unsupported page file ' + file);
  const src = String(html), root = peParse(src);
  const byKey = new Map((overrides || []).filter(r => r && typeof r.key === 'string').map(r => [r.key, r]));
  const find = (n, f) => { if (f(n)) return n; for (const c of n.children || []) { const x = find(c, f); if (x) return x; } return null; };
  const body = find(root, n => n.tag === 'body'); if (!body) return src;
  const titleEl = find(root, n => n.tag === 'title');
  const pageLabel = page === 'index' ? 'Home' : (titleEl ? peClip(peDecode(src.slice(titleEl.se, titleEl.ce)).split(' | ')[0], 50) : '') || page;
  const counts = {}, slots = [], applied = [];
  const keyOf = (scope, kind, sig) => { const k = `${scope}:${kind}:${peHash(kind + '\n' + sig)}`; counts[k] = (counts[k] || 0) + 1; return counts[k] > 1 ? `${k}-${counts[k]}` : k; };
  /* where a slot sits, in words: the nearest heading above it (for a heading, the nearest bigger one) */
  const where = (st, level = 7) => { let h = ''; for (let l = Math.min(level, st.hs.length) - 1; l >= 1; l--) if (st.hs[l]) { h = st.hs[l]; break; } return st.zone ? (h ? `${st.zone} ${PE_SEP} ${h}` : st.zone) : (h || st.label); };
  const addSlot = (n, scope, kind, sig, extra) => {
    const key = keyOf(scope, kind, sig), slot = Object.assign({ n, key, kind, scope }, extra);
    const row = byKey.get(key); if (row && row.kind === kind) slot.row = row;
    n.pe = slot; slots.push(slot); return slot;
  };
  const visit = (n, scope, st) => {
    if (n.type !== 'el' || peSkip(n)) return;
    const tag = n.tag, level = /^h([1-6])$/.exec(tag);
    if (tag === 'section' && scope !== 'site') {
      const h = find(n, x => x.type === 'el' && /^h[1-3]$/.test(x.tag)), ht = h ? peNorm(peTextOf(src, h)) : '';
      const label = peClip((h ? peWords(src, h) : '') || peAttr(n, 'aria-label') || String(peAttr(n, 'class') || peAttr(n, 'id') || 'section').split(/\s+/)[0].replace(/[-_]+/g, ' ').replace(/^./, c => c.toUpperCase()), 60);
      addSlot(n, scope, 'section', ht || `${peAttr(n, 'id') || ''}|${peAttr(n, 'class') || ''}|${peNorm(peTextOf(src, n)).slice(0, 160)}`, { context: label, label });
      st = { label, hs: [] };
    }
    if (tag === 'img') {
      const s = peAttr(n, 'src');
      if (s) addSlot(n, scope, 'image', s, { context: where(st), src: s, alt: peAttr(n, 'alt') || '', srcset: peAttr(n, 'srcset'), sizes: peAttr(n, 'sizes') });
      return;
    }
    if (tag === 'a' && peHas(n, 'href') && !peHas(n, 'data-lb')) {
      const href = peAttr(n, 'href'), z = peZones(src, n), kids = z ? z.kids.slice(z.F, z.L + 1) : [];
      const labelOk = !!z && kids.every(c => c.type === 'text' || (c.tag === 'br' && !c.attrs.length));
      const label = labelOk ? peNorm(kids.map(c => c.type === 'text' ? peSpaces(peTextOf(src, c)) : '\n').join('')) : null;
      addSlot(n, scope, 'link', `${href} ${label ?? ''}`, { context: where(st), href, label, z: labelOk ? z : null,
        wsBefore: labelOk && kids[0].type === 'text' && /^\s/.test(peTextOf(src, kids[0])), wsAfter: labelOk && kids[kids.length - 1].type === 'text' && /\s$/.test(peTextOf(src, kids[kids.length - 1])) });
      if (labelOk) return;
    } else if (n.children.some(c => c.type === 'text' && !peBlank(peTextOf(src, c)))) {
      const mini = peMini(src, n);
      /* the markup must read back as the same pieces (a literal ** or _ in plain words would not), otherwise go inside */
      if (mini && mini.text && peMiniParse(mini.text).filter(x => x.t !== 'text').length === mini.marks) {
        addSlot(n, scope, 'text', mini.text, { context: where(st, level ? +level[1] : 7), text: mini.text, rich: mini.marks > 0, tags: mini.tags, pieces: mini.pieces, z: mini.z, wsBefore: mini.wsBefore, wsAfter: mini.wsAfter });
        if (level) { st.hs[+level[1]] = peClip(mini.text.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/\{\d+\}|\*\*|_/g, ' '), 60); st.hs.length = +level[1] + 1; }
        mini.pieces.forEach(p => visit(p, scope, st));
        return;
      }
    }
    if (level) { const t = peClip(peWords(src, n), 60); if (t) { st.hs[+level[1]] = t; st.hs.length = +level[1] + 1; } }
    n.children.forEach(c => visit(c, scope, st));
  };
  for (const c of body.children) {
    if (c.type !== 'el') continue;
    if (c.tag === 'main') { if (!PE_SKIP_PAGES.test(file)) visit(c, page, { label: pageLabel, hs: [] }); }
    else if (!/(^|\s)sr(\s|$)/.test(peAttr(c, 'class') || '')) visit(c, 'site', { zone: c.tag === 'header' ? 'Header' : c.tag === 'footer' ? 'Footer' : c.tag === 'nav' ? 'Menu' : 'Page', label: '', hs: [] });
  }

  /* write the tags and bake the overrides */
  const hook = n => {
    const slot = n.pe; if (!slot) return null;
    const attrs = n.attrs.map(a => a.raw), add = [`data-edit="${slot.key}"`];
    let v = slot.row ? peValue(slot.kind, slot.row.value, slot) : null;
    /* the builds refuse a page with an em or en dash: a stored change that would bring one in is left out, never the build */
    if (v && PE_DASH1.test(JSON.stringify(v))) { console.warn(`  page content ${slot.key}: the change contains an em or en dash, left out`); v = null; slot.row = null; }
    const zone = (from, to) => slot.z.kids.slice(from, to).map(c => peEmit(src, c, hook)).join('');
    const wrap = body => zone(0, slot.z.F) + (slot.wsBefore ? ' ' : '') + body + (slot.wsAfter ? ' ' : '') + zone(slot.z.L + 1);
    let inner = null, def = null;
    if (slot.kind === 'text') {
      if (slot.rich) add.push(`data-edit-rich="${slot.tags.b || 'b'} ${slot.tags.em || 'em'}"`);
      if (v && v.text !== slot.text) {
        const body = peMiniHtml(v.text, { rich: slot.rich, tags: slot.tags, pieces: slot.pieces.map(p => peEmit(src, p, hook)) });
        if (body !== null) { inner = wrap(body); def = { text: slot.text }; }
        else console.warn(`  page content ${slot.key}: the new text does not fit this slot, left as it is`);
      }
    } else if (slot.kind === 'image') {
      if (v && (v.src !== slot.src || (v.alt != null && v.alt !== slot.alt))) {
        applied.push(slot.key);
        const keep = n.attrs.filter(a => !['src', 'srcset', 'sizes', 'alt'].includes(a.name)).map(a => a.raw);
        return { start: peStartTag(n, [`src="${peAttrText(v.src)}"`, `alt="${peAttrText(v.alt != null ? v.alt : slot.alt)}"`, ...keep, ...add, `data-edit-default="${peJsonAttr({ src: slot.src, alt: slot.alt, srcset: slot.srcset, sizes: slot.sizes })}"`]) };
      }
    } else if (slot.kind === 'link') {
      if (v && ((v.href !== null && v.href !== slot.href) || (v.label !== null && v.label !== slot.label))) {
        if (v.href !== null && v.href !== slot.href) attrs[n.attrs.findIndex(a => a.name === 'href')] = `href="${peAttrText(v.href)}"`;
        if (v.label !== null && v.label !== slot.label) inner = wrap(v.label.split('\n').map(peText).join('<br>'));
        def = { href: slot.href, label: slot.label };
      }
    } else if (v && v.visible === false && !peHas(n, 'hidden')) { add.push('hidden'); def = { visible: true }; }
    if (def) { add.push(`data-edit-default="${peJsonAttr(def)}"`); applied.push(slot.key); }
    else if (slot.row && !v) console.warn(`  page content ${slot.key}: stored value is not valid for this slot, ignored`);
    return { start: peStartTag(n, [...attrs, ...add]), inner };
  };
  const out = peEmit(src, root, hook);

  if (map) {
    for (const s of slots) {
      const e = { key: s.key, page: s.scope, title: s.scope === 'site' ? 'Every page' : pageLabel, url: origin + '/' + (s.scope === 'site' || page === 'index' ? '' : page), kind: s.kind, tag: s.n.tag, section: s.context };
      const v = s.row ? peValue(s.kind, s.row.value, s) : null;
      if (s.kind === 'text') Object.assign(e, { default: s.text, current: v ? v.text : s.text, rich: s.rich }, s.pieces.length ? { parts: s.pieces.map((p, i) => { const inside = p.pe || (find(p, x => !!x.pe) || {}).pe; return { n: i + 1, text: peClip(peTextOf(src, p), 60) || `(${p.tag}${peAttr(p, 'class') ? '.' + peAttr(p, 'class').split(/\s+/)[0] : ''})`, key: inside ? inside.key : null }; }) } : {});
      else if (s.kind === 'image') Object.assign(e, { src: s.src, alt: s.alt, current: v ? { src: v.src, alt: v.alt != null ? v.alt : s.alt } : { src: s.src, alt: s.alt } });
      else if (s.kind === 'link') Object.assign(e, { href: s.href, default: s.label, current: { href: v && v.href !== null ? v.href : s.href, label: v && v.label !== null ? v.label : s.label } });
      else Object.assign(e, { default: true, current: v ? v.visible : true });
      map.push(e);
    }
  }
  if (Array.isArray(opts.applied)) opts.applied.push(...applied);
  return out;
}

/* page_content rows for one site at build time: a public read, like the site settings. Fails open (no overrides) when
   offline or before the table exists. CCFC_PAGE_CONTENT=<file.json> reads local rows instead (tests); =off skips. */
function loadPageContent(site) {
  if (!PE_SITES.includes(site)) return [];
  const env = process.env.CCFC_PAGE_CONTENT;
  if (env === 'off') return [];
  const pick = rows => (Array.isArray(rows) ? rows : []).filter(r => r && typeof r.key === 'string' && (!r.site || r.site === site));
  if (env) { try { const rows = pick(JSON.parse(require('fs').readFileSync(env, 'utf8'))); console.log(`page content: ${rows.length} from ${env}`); return rows; } catch (e) { console.log(`page content: could not read ${env}`); return []; } }
  try {
    const out = require('child_process').execSync(`curl -s --max-time 6 -H "apikey: sb_publishable_gPig-ePcoJIUnQ4fij6viw_ukAhlifp" "https://dcqydtkjzgilyjnjyisb.supabase.co/rest/v1/page_content?select=key,kind,value&site=eq.${site}"`, { encoding: 'utf8' });
    const rows = JSON.parse(out); if (!Array.isArray(rows)) throw new Error('not set up');
    console.log(`page content: ${rows.length} live`); return pick(rows);
  } catch (e) { console.log('page content: none (offline or not set up)'); return []; }
}
/* content-map.json at the site root: every editable slot once (the shared header, menu and footer are listed once, page "site") */
function writeContentMap(dir, map, overrides = []) {
  const seen = new Set(), out = [];
  for (const e of map) { if (seen.has(e.key)) continue; seen.add(e.key); out.push(e); }
  require('fs').writeFileSync(require('path').join(dir, 'content-map.json'), JSON.stringify(out));
  const stale = (overrides || []).filter(r => r && !seen.has(r.key)).map(r => r.key);
  console.log(`content map: ${out.length} slots` + (stale.length ? `; ${stale.length} stale override${stale.length > 1 ? 's' : ''} (default changed in code): ${stale.join(', ')}` : ''));
  return { slots: out.length, stale };
}

module.exports = { mazarMark, mazarNav, mazarMenu, headTags, clean, sitemapXml, robotsTxt, manifestJson, lint, urlOf, slug, esc, editable, loadPageContent, writeContentMap,
  pageEditor: { parse: peParse, emit: peEmit, miniParse: peMiniParse, miniHtml: peMiniHtml, href: peHref, src: peSrc, dash: peDash, value: peValue } };
