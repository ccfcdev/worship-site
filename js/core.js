/* ================================================================
   CCFC shared engine: accounts, roles, feeds, posting, dashboards.
   One file for all three sites (CCFC Zambia, Koinonia Experience,
   Worship Connect). Each site declares window.CCFC_SITE = { key }
   before this script; colours come from the site's own CSS tokens
   through css/core.css. Degrades gracefully while js/config.js is empty.
   Source of truth: ccfc-site/js/core.js (tools-sync-core.sh copies it).
   ================================================================ */
(() => {
'use strict';
const $  = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => [...r.querySelectorAll(s)];
const CFG = window.CCFC_CONFIG || {};
const ROLES = {
  master_admin: { label:'Master Administrator', short:'Master Admin', desc:'Controls everything on all three sites and assigns every role, including Admins.' },
  admin:        { label:'Admin',   short:'Admin',   desc:'Everything the Master Administrator can do, except assigning or changing Admin accounts.' },
  leader:       { label:'Leader',  short:'Leader',  desc:'Posts announcements, moderates comments, reviews Worship Connect applications and Koinonia registrations, and adds material to the Upper Room library.' },
  media:        { label:'Media',   short:'Media',   desc:'Posts photos, videos and content to the CCFC, Koinonia and Worship Connect feeds.' },
  blogger:      { label:'Writer', short:'Writer', desc:'Writes and publishes in the Church feed, and adds material to the Upper Room library.' },
  member:       { label:'Member',  short:'Member',  desc:'Follows the Church Feed, comments and reacts.' },
};
const ADMINS = ['master_admin','admin'];
const can = {
  post: (r, site=SITE_KEY) => ['master_admin','admin','leader','media'].includes(r) || (r === 'blogger' && site === 'ccfc'),
  moderate: r => ['master_admin','admin','leader'].includes(r),
  library: r => ['master_admin','admin','leader','blogger'].includes(r),   /* who may add to the Upper Room; reading is open to all */
  staff: r => r && r !== 'member',
  admin: r => ADMINS.includes(r),
  leadership: r => ['master_admin','admin','leader'].includes(r),
  master: r => r === 'master_admin',
};
const KINDS = { news:'News', announcement:'Announcement', photo:'Photos', video:'Video', music:'Music' };
/* ---------- the three sites: identity, pages, what the feed is called, which post kinds it uses ---------- */
const SITES = {
  ccfc:     { label:'CCFC Zambia', short:'CCFC', origin:'https://ccfczambia.org', feed:'/feed', feedLabel:'Church feed', feedWord:'the family',
              kinds:['news','photo','video','announcement'], logo:'/assets/logo/ccfc-mark.png?v=2', dashTitle:'Church dashboard',
              links: r => [['/account','Account Center'], ['/feed','Church feed'], can.leadership(r) ? ['https://portal.ccfczambia.org/leadership','Leadership Hub'] : null, ['/library','Upper Room library'], can.staff(r) ? [ADMIN_ORIGIN + '/?site=ccfc','Admin panel'] : null] },
  koinonia: { label:'Koinonia Experience', short:'Koinonia', origin:'https://koinonia.ccfczambia.org', feed:'/updates', feedLabel:'Conference updates', feedWord:'everyone coming to Koinonia',
              kinds:['news','announcement','video','photo'], logo:'/assets/logo/ccfc-mark.png?v=2', dashTitle:'Koinonia dashboard',
              links: r => [['https://ccfczambia.org/account','Account Center'], ['/updates','Updates'], ['/register',"Register for Koi 26'"], can.staff(r) ? [ADMIN_ORIGIN + '/?site=koinonia','Admin panel'] : null] },
  worship:  { label:'Worship Connect', short:'Worship', origin:'https://worship.ccfczambia.org', feed:'/latest', feedLabel:'Latest from the team', feedWord:'the team',
              kinds:['video','music','photo','news'], logo:'/assets/logo/ccfc-mark-white.png?v=2', dashTitle:'Worship Connect dashboard',
              links: r => [['https://ccfczambia.org/account','Account Center'], ['/latest','Latest'], ['/team','The team'], ['/join','Join the team'], can.staff(r) ? [ADMIN_ORIGIN + '/?site=worship','Admin panel'] : null] },
};
const SITE_KEY = (window.CCFC_SITE && SITES[window.CCFC_SITE.key]) ? window.CCFC_SITE.key : 'ccfc';
const SITE = Object.assign({}, SITES[SITE_KEY], window.CCFC_SITE || {});
/* the admin panel lives on its own subdomain and can show any site's dashboard (?site=ccfc|koinonia|worship) */
const ADMIN_ORIGIN = 'https://madmin.ccfczambia.org';
const IS_ADMIN = !!(window.CCFC_SITE && window.CCFC_SITE.admin);
if (IS_ADMIN) SITE.feed = SITE.origin + SITE.feed;

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const when = iso => { if (!iso) return ''; const d = new Date(iso), diff = (Date.now()-d)/1000;
  if (diff < 60) return 'just now'; if (diff < 3600) return Math.max(1, Math.round(diff/60)) + ' min ago'; if (diff < 86400) return Math.round(diff/3600) + ' h ago';
  if (diff < 7*86400) return Math.round(diff/86400) + ' d ago';
  return d.toLocaleDateString('en-GB', { day:'numeric', month:'short', year: d.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined }); };
const fullDate = iso => iso ? new Date(iso).toLocaleString('en-GB', { day:'numeric', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' }) : '';
const initials = n => (n || '?').split(/\s+/).slice(0,2).map(w => w[0] || '').join('').toUpperCase();
const slugify = s => s.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,70) || 'post';
const fmtBytes = b => b > 1048576 ? (b/1048576).toFixed(1) + ' MB' : Math.round(b/1024) + ' KB';
const md = s => { /* markdown-lite: ## headings, - lists, paragraphs, **bold**, links */
  const lines = esc(s).split(/\r?\n/); let out = '', list = false;
  const inline = t => t.replace(/\*\*(.+?)\*\*/g,'<b>$1</b>').replace(/\*(.+?)\*/g,'<i>$1</i>').replace(/(https?:\/\/[^\s<]+)/g, u => `<a href="${u}" target="_blank" rel="noopener">${u.replace(/^https?:\/\//,'').slice(0,60)}</a>`);
  for (const l of lines){ if (/^\s*[-*] /.test(l)){ if (!list){ out += '<ul>'; list = true; } out += `<li>${inline(l.replace(/^\s*[-*] /,''))}</li>`; continue; }
    if (list){ out += '</ul>'; list = false; }
    if (/^## /.test(l)) out += `<h3>${inline(l.slice(3))}</h3>`; else if (/^# /.test(l)) out += `<h2>${inline(l.slice(2))}</h2>`; else if (l.trim()) out += `<p>${inline(l)}</p>`; }
  if (list) out += '</ul>'; return out; };
const avatar = (name, url, cls='') => url ? `<img class="ava ${cls}" src="${esc(url)}" alt="" referrerpolicy="no-referrer">` : `<span class="ava ${cls}">${esc(initials(name))}</span>`;
const toast = (msg, ok=true) => { let t = $('.toast'); if (!t){ t = document.createElement('div'); t.className='toast'; document.body.appendChild(t); }
  t.textContent = msg; t.className = 'toast is-on' + (ok ? '' : ' is-err'); clearTimeout(t._t); t._t = setTimeout(() => t.classList.remove('is-on'), 3200); };
const friendly = err => { const t = (err && err.message) || 'Something went wrong.';
  if (/invalid login/i.test(t)) return 'Wrong email or password.'; if (/already registered/i.test(t)) return 'That email already has an account. Sign in instead.';
  if (/rate limit/i.test(t)) return 'Too many attempts. Please wait a minute.'; if (/duplicate key/i.test(t)) return 'That title is already used. Change it slightly.';
  if (/row-level security/i.test(t)) return 'Your account is not allowed to do that.'; return t; };
/* "Are you sure?": the sites' own replacement for the browser's confirm(). Resolves true only when confirmed.
   Enter confirms, Escape or the backdrop cancels, Tab stays inside, focus goes back to the button that opened it.
   Danger actions get a red button and start on Cancel. Opened from inside Mazar Prime it takes Prime's dark gold look.
   Use: if (!(await sure({ title, body, ok:'Delete', danger:true, from: button }))) return; */
let sureOpen = false, sureN = 0;
function sure({ title = 'Are you sure?', body = '', ok = 'Confirm', cancel = 'Cancel', danger = false, from = document.activeElement } = {}){
  if (sureOpen) return Promise.resolve(false);   /* a second click while one is open is a double click, never a yes */
  sureOpen = true;
  return new Promise(resolve => {
    const id = 'sure-' + (++sureN), html = document.documentElement, lock = html.style.overflow !== 'hidden', opened = Date.now();
    const prime = !!(from && from.closest && from.closest('.mzp'));
    const ico = danger ? '<path d="M12 6v7.5M12 17.8h.01"/>' : '<path d="M9 8.8a3 3 0 1 1 4.3 2.7c-.8.4-1.3 1.1-1.3 2v.4M12 17.8h.01"/>';
    const d = document.createElement('div'); d.className = 'sure' + (danger ? ' sure--danger' : '') + (prime ? ' sure--prime' : ''); d.dataset.site = IS_ADMIN ? 'admin' : SITE_KEY;
    d.innerHTML = `<div class="sure__card" role="alertdialog" aria-modal="true" aria-labelledby="${id}-t"${body ? ` aria-describedby="${id}-b"` : ''} tabindex="-1">
      <span class="sure__ico" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">${ico}</svg></span>
      <div class="sure__text"><h2 class="sure__title" id="${id}-t">${esc(title)}</h2>${body ? `<p class="sure__body" id="${id}-b">${esc(body)}</p>` : ''}</div>
      <div class="sure__btns"><button type="button" class="btn btn--ghost sure__no">${esc(cancel)}</button><button type="button" class="btn sure__ok">${esc(ok)}</button></div></div>`;
    const no = $('.sure__no', d), yes = $('.sure__ok', d);
    /* everything else on the page goes inert while the question is open (upload dialog, Prime full screen, the nav) */
    const muted = [...document.body.children].filter(el => !el.inert && !/^(SCRIPT|STYLE|LINK|TEMPLATE)$/.test(el.tagName));
    document.body.appendChild(d); muted.forEach(el => { el.inert = true; }); if (lock) html.style.overflow = 'hidden';
    requestAnimationFrame(() => d.classList.add('is-in')); setTimeout(() => d.classList.add('is-in'), 40);
    (danger ? no : yes).focus({ preventScroll: true });
    let done = false, downOnBack = false;
    const finish = v => { if (done) return; done = true; sureOpen = false; no.disabled = yes.disabled = true;
      document.removeEventListener('keydown', key, true); muted.forEach(el => { el.inert = false; }); if (lock) html.style.overflow = '';
      d.classList.remove('is-in'); setTimeout(() => d.remove(), matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 260);
      resolve(v);
      setTimeout(() => { if (from && from !== document.body && from.isConnected && !from.disabled && typeof from.focus === 'function') from.focus({ preventScroll: true }); }, 0); };
    const key = e => {
      if (e.key === 'Escape'){ e.preventDefault(); e.stopPropagation(); finish(false); }
      else if (e.key === 'Enter' && !e.isComposing){ e.preventDefault(); e.stopPropagation(); if (!e.repeat && Date.now() - opened > 200) finish(true); }
      else if (e.key === 'Tab'){ e.preventDefault(); const f = [no, yes], i = f.indexOf(document.activeElement); f[i < 0 ? (e.shiftKey ? 1 : 0) : (i + 1) % f.length].focus(); } };
    document.addEventListener('keydown', key, true);
    no.addEventListener('click', () => finish(false)); yes.addEventListener('click', () => finish(true));
    d.addEventListener('pointerdown', e => { downOnBack = e.target === d; });
    d.addEventListener('click', e => { if (e.target === d && downOnBack) finish(false); });
  });
}
const OFFLINE = 'Accounts are not switched on yet. The church team is finishing setup.';
const ICO = {
  lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="10" width="16" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>',
  heart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s-7-4.4-9-8.4A5 5 0 0 1 12 6a5 5 0 0 1 9 6.6C19 16.6 12 21 12 21z"/></svg>',
  chat: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1.1-4.2A8 8 0 1 1 21 12z"/></svg>',
  share: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7M16 6l-4-4-4 4M12 2v13"/></svg>',
  more: '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>',
  play: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>',
  pin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 17v5M5 9l2-6h10l2 6M5 9h14l-2 8H7z"/></svg>',
  x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  image: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-8 8"/></svg>',
  yt: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="20" height="14" rx="4"/><path d="M10 9l5 3-5 3z"/></svg>',
  wa: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.5 14.4c-.3-.1-1.8-.9-2-1s-.5-.1-.7.1-.8 1-1 1.2-.4.2-.7.1a8.1 8.1 0 0 1-4-3.5c-.3-.5.3-.5.9-1.6.1-.2 0-.4 0-.5l-.9-2.2c-.2-.6-.5-.5-.7-.5h-.6a1.1 1.1 0 0 0-.8.4 3.4 3.4 0 0 0-1.1 2.6 6 6 0 0 0 1.3 3.2c.2.2 2.2 3.4 5.4 4.8 2 .8 2.7.9 3.7.8.6-.1 1.8-.7 2-1.5.3-.7.3-1.3.2-1.5l-.7-.4zM12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2z"/></svg>',
  arrow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
  up: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg>',
  down: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M19 12l-7 7-7-7"/></svg>',
  swap: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 8h14l-4-4M20 16H6l4 4"/></svg>',
  edit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16v4zM14 6l4 4"/></svg>',
  trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6"/></svg>',
};

let sb = null, session = null, profile = null;
const ready = !!(CFG.supabaseUrl && CFG.supabaseKey && window.supabase);
/* ---------- one sign-in for all three sites ----------
   Browsers keep localStorage per hostname, so a session made on ccfczambia.org would not exist on koinonia. or worship.
   On the church domain the session is kept in cookies scoped to .ccfczambia.org instead (chunked, because a Supabase
   session is bigger than one cookie allows). Local previews keep using localStorage. */
const ROOT_DOMAIN = 'ccfczambia.org';
const sharedDomain = location.hostname === ROOT_DOMAIN || location.hostname.endsWith('.' + ROOT_DOMAIN);
const cookieStore = (() => {
  const CH = 2800, attrs = `; Domain=.${ROOT_DOMAIN}; Path=/; Max-Age=31536000; SameSite=Lax; Secure`;
  const read = name => { const m = document.cookie.match(new RegExp('(?:^|; )' + name.replace(/[.$?*|{}()[\]\\/+^]/g, '\\$&') + '=([^;]*)')); return m ? decodeURIComponent(m[1]) : null; };
  const write = (name, val) => { document.cookie = `${name}=${encodeURIComponent(val)}${attrs}`; };
  const kill = name => { document.cookie = `${name}=; Domain=.${ROOT_DOMAIN}; Path=/; Max-Age=0; SameSite=Lax; Secure`; };
  const count = k => +(read(k + '.n') || 0);
  return {
    getItem(k){ const n = count(k); if (!n) return read(k); let out = ''; for (let i = 0; i < n; i++){ const c = read(`${k}.${i}`); if (c === null) return null; out += c; } return out; },
    setItem(k, v){ this.removeItem(k); if (v.length <= CH){ write(k, v); return; } const n = Math.ceil(v.length / CH); for (let i = 0; i < n; i++) write(`${k}.${i}`, v.slice(i*CH, (i+1)*CH)); write(k + '.n', String(n)); },
    removeItem(k){ const n = count(k); for (let i = 0; i < n; i++) kill(`${k}.${i}`); kill(k + '.n'); kill(k); },
  };
})();
const STORAGE_KEY = 'ccfc-auth';
if (ready){
  if (sharedDomain){ /* carry an older per-site session across, once */
    try { const legacy = localStorage.getItem('sb-' + new URL(CFG.supabaseUrl).hostname.split('.')[0] + '-auth-token'); if (legacy && !cookieStore.getItem(STORAGE_KEY)){ cookieStore.setItem(STORAGE_KEY, legacy); localStorage.removeItem('sb-' + new URL(CFG.supabaseUrl).hostname.split('.')[0] + '-auth-token'); } } catch (_) {}
  }
  sb = window.supabase.createClient(CFG.supabaseUrl, CFG.supabaseKey, { auth: { persistSession:true, autoRefreshToken:true, storageKey: STORAGE_KEY, storage: sharedDomain ? cookieStore : undefined } });
}
const role = () => profile?.role || null;
const here = () => location.origin + location.pathname;

/* ================================================================ AUTH MODAL */
function authModal(){
  const m = document.createElement('div'); m.className='auth'; m.setAttribute('role','dialog'); m.setAttribute('aria-modal','true'); m.setAttribute('aria-label','Sign in or create an account');
  m.innerHTML = `<div class="auth__box">
    <button class="auth__close" aria-label="Close">${ICO.x}</button>
    <img class="auth__logo" src="${esc(SITE.logo)}" alt="">
    <p class="auth__site">${esc(SITE.label)}<small>One account works on all three CCFC sites</small></p>
    <div class="auth__social">
      <button type="button" class="auth__oauth" data-p="google"><svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.5c-.3 1.5-1.1 2.8-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.7z"/><path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3c-1.1.7-2.5 1.2-4.1 1.2-3.1 0-5.8-2.1-6.7-5H1.2v3.1C3.2 21.3 7.3 24 12 24z"/><path fill="#FBBC05" d="M5.3 14.3c-.5-1.5-.5-3.1 0-4.6V6.6H1.2c-1.6 3.3-1.6 7.2 0 10.8l4.1-3.1z"/><path fill="#EA4335" d="M12 4.7c1.7 0 3.3.6 4.5 1.8l3.4-3.4C17.9 1.2 15.1 0 12 0 7.3 0 3.2 2.7 1.2 6.6l4.1 3.1c.9-2.9 3.6-5 6.7-5z"/></svg>Continue with Google</button>
      <button type="button" class="auth__oauth" data-p="facebook"><svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#1877F2" d="M24 12a12 12 0 1 0-13.9 11.9v-8.4H7.1V12h3V9.4c0-3 1.8-4.7 4.5-4.7 1.3 0 2.7.2 2.7.2v3h-1.5c-1.5 0-2 .9-2 1.9V12h3.3l-.5 3.5h-2.8v8.4A12 12 0 0 0 24 12z"/></svg>Continue with Facebook</button>
      <span class="auth__or"><i></i>or use your email<i></i></span>
    </div>
    <div class="auth__tabs" role="tablist"><button class="is-on" data-t="in" role="tab" aria-selected="true">Sign in</button><button data-t="up" role="tab" aria-selected="false">Create account</button></div>
    <form class="auth__form" data-mode="in" novalidate>
      <div class="field auth__name" hidden><label for="a-name">Full name</label><input id="a-name" name="full_name" type="text" autocomplete="name" placeholder="Your name"></div>
      <div class="field"><label for="a-email">Email</label><input id="a-email" name="email" type="email" autocomplete="email" required placeholder="you@example.com"></div>
      <div class="field"><label for="a-pass">Password</label><input id="a-pass" name="password" type="password" autocomplete="current-password" required minlength="8" placeholder="At least 8 characters"></div>
      <p class="auth__msg" aria-live="polite"></p>
      <button class="btn auth__submit" type="submit">Sign in</button>
      <button class="auth__forgot" type="button">Forgot your password?</button>
      <p class="auth__fine">New accounts start as <b>Member</b>. The church team assigns other roles from the dashboard.</p>
    </form></div>`;
  document.body.appendChild(m);
  const form = $('.auth__form', m), msg = $('.auth__msg', m), submit = $('.auth__submit', m), tabs = $$('.auth__tabs button', m);
  const setMode = mode => { form.dataset.mode = mode; tabs.forEach(b => { const on = b.dataset.t === mode; b.classList.toggle('is-on', on); b.setAttribute('aria-selected', on); });
    $('.auth__name', m).hidden = mode !== 'up'; $('#a-name', m).required = mode === 'up'; submit.textContent = mode === 'up' ? 'Create account' : 'Sign in'; $('#a-pass', m).autocomplete = mode === 'up' ? 'new-password' : 'current-password'; msg.textContent = ''; };
  tabs.forEach(b => b.addEventListener('click', () => setMode(b.dataset.t)));
  const open = (mode='in') => { setMode(mode); m.classList.add('is-open'); document.body.style.overflow='hidden'; setTimeout(() => $('#a-email', m).focus(), 50); };
  const close = () => { m.classList.remove('is-open'); document.body.style.overflow=''; };
  $('.auth__close', m).addEventListener('click', close); m.addEventListener('click', e => { if (e.target === m) close(); });
  addEventListener('keydown', e => { if (e.key === 'Escape' && m.classList.contains('is-open')) close(); });
  form.addEventListener('submit', async e => { e.preventDefault();
    if (!ready){ msg.textContent = OFFLINE; return; }
    const d = Object.fromEntries(new FormData(form).entries());
    if (!/^\S+@\S+\.\S+$/.test(d.email)){ msg.textContent = 'Please enter a valid email address.'; return; }
    if ((d.password||'').length < 8){ msg.textContent = 'Password needs at least 8 characters.'; return; }
    submit.disabled = true; msg.textContent = 'One moment...';
    try { if (form.dataset.mode === 'up'){ if (!d.full_name.trim()){ msg.textContent = 'Please tell us your name.'; return; }
        const { data, error } = await sb.auth.signUp({ email:d.email, password:d.password, options:{ data:{ full_name:d.full_name.trim() }, emailRedirectTo: here() } }); if (error) throw error;
        if (data.session){ msg.textContent = 'Welcome to the family.'; setTimeout(close, 600); } else msg.textContent = 'Check your email to confirm your account, then sign in.';
      } else { const { error } = await sb.auth.signInWithPassword({ email:d.email, password:d.password }); if (error) throw error; msg.textContent = 'Signed in.'; setTimeout(close, 400); }
    } catch (err){ msg.textContent = friendly(err); } finally { submit.disabled = false; } });
  $$('.auth__oauth', m).forEach(b => b.addEventListener('click', async () => { if (!ready){ msg.textContent = OFFLINE; return; }
    b.disabled = true; msg.textContent = 'Opening ' + (b.dataset.p === 'google' ? 'Google' : 'Facebook') + '...';
    const { error } = await sb.auth.signInWithOAuth({ provider: b.dataset.p, options: { redirectTo: here() } });
    if (error){ msg.textContent = friendly(error); b.disabled = false; } }));
  $('.auth__forgot', m).addEventListener('click', async () => { const email = $('#a-email', m).value.trim();
    if (!ready){ msg.textContent = OFFLINE; return; } if (!email){ msg.textContent = 'Type your email above first.'; return; }
    const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: here() + '?reset=1' }); msg.textContent = error ? friendly(error) : 'Password reset email sent.'; });
  return { open, close };
}

/* ================================================================ ACCOUNT UI (nav, drawer, mobile menu) */
function accountUI(modal){
  $$('.nav__account, .drawer__account, .menu__account').forEach(slot => {
    if (!session){ slot.innerHTML = `<button class="nav__signin" data-auth="in">Sign in</button>`; return; }
    const name = profile?.full_name || session.user.email, r = role() || 'member', links = SITE.links(r).filter(Boolean);
    if (slot.classList.contains('drawer__account') || slot.classList.contains('menu__account')){
      slot.innerHTML = `<div class="drawer__user">${avatar(name, profile?.avatar_url)}<div><b>${esc(name)}</b><span class="pill">${esc(ROLES[r].short)}</span></div></div>
        ${links.map(([h,l]) => `<a href="${h}">${l}</a>`).join('')}<button class="nav__signout">Sign out</button>`;
    } else {
      slot.innerHTML = `<div class="nav__user"><button class="nav__avatar" aria-haspopup="true" aria-expanded="false" title="${esc(name)}">${avatar(name, profile?.avatar_url)}</button>
        <div class="nav__menu" hidden><b>${esc(name)}</b><span class="pill">${esc(ROLES[r].short)}</span>${links.map(([h,l]) => `<a href="${h}">${l}</a>`).join('')}<button class="nav__signout">Sign out</button></div></div>`;
      const btn = $('.nav__avatar', slot), menu = $('.nav__menu', slot);
      btn.addEventListener('click', () => { menu.hidden = !menu.hidden; btn.setAttribute('aria-expanded', !menu.hidden); });
      document.addEventListener('click', e => { if (!slot.contains(e.target)){ menu.hidden = true; btn.setAttribute('aria-expanded', false); } });
    }
    $$('.nav__signout', slot).forEach(b => b.addEventListener('click', async () => { clearPrime(); await sb.auth.signOut({ scope: 'local' }); location.href = '/'; }));
  });
  $$('[data-auth]').forEach(b => { if (b._bound) return; b._bound = true; b.addEventListener('click', e => { e.preventDefault(); modal.open(b.dataset.auth || 'in'); }); });
  $$('[data-guest]').forEach(el => { el.hidden = !!session; }); $$('[data-member]').forEach(el => { el.hidden = !session; });
  $$('[data-role-gate]').forEach(el => { const need = el.dataset.roleGate.split(','); el.hidden = !(role() && (need.includes('staff') ? can.staff(role()) : need.includes(role()))); });
}
async function loadProfile(){ if (!session){ profile = null; return; }
  let { data } = await sb.from('profiles').select('*').eq('id', session.user.id).maybeSingle();
  if (!data){   /* first sign-in through Google / Facebook before the trigger row is visible: create a Member profile */
    const u = session.user, m = u.user_metadata || {};
    const row = { id:u.id, email:u.email || m.email || '', full_name: m.full_name || m.name || (u.email||'').split('@')[0] || '', avatar_url: m.avatar_url || m.picture || null, role:'member' };
    const ins = await sb.from('profiles').insert(row).select('*').maybeSingle();
    if (ins.error && await accountGone(ins.error)) return;
    data = ins.data || (await sb.from('profiles').select('*').eq('id', u.id).maybeSingle()).data || row;
  }
  profile = data; }
/* an admin deleted this account while the browser still held its sign-in (the profile insert fails on the foreign key,
   or the sign-in server no longer knows the user): sign out on this device once and say so, never recreate the profile */
const GONE = 'ccfc:account-removed'; let goneHere = false;
async function accountGone(err){
  let gone = err.code === '23503' || /foreign key/i.test(err.message || '');
  if (!gone){ const res = await sb.auth.getUser().catch(() => null), e = res && res.error; gone = !!e && (e.code === 'user_not_found' || /user\b.*(does not exist|not found)/i.test(e.message || '')); }
  if (!gone) return false;
  profile = null; session = null; goneHere = true; clearPrime(); try { sessionStorage.setItem(GONE, '1'); } catch (_) {}
  await Promise.race([sb.auth.signOut({ scope: 'local' }).catch(() => {}), new Promise(res => setTimeout(res, 2000))]);
  return true; }
const goneNote = () => { let hit = goneHere; goneHere = false; try { hit = hit || !!sessionStorage.getItem(GONE); sessionStorage.removeItem(GONE); } catch (_) {}
  if (hit && !session) toast('Your account was removed. Create a new account to come back.', false); };

/* ================================================================ MEDIA */
function shrink(file, max=1800, q=.82){ return new Promise(res => { const img = new Image(); img.onload = () => { const s = Math.min(1, max/Math.max(img.width, img.height));
  const c = document.createElement('canvas'); c.width = Math.round(img.width*s); c.height = Math.round(img.height*s); c.getContext('2d').drawImage(img,0,0,c.width,c.height); c.toBlob(b => res(b || file), 'image/jpeg', q); }; img.onerror = () => res(file); img.src = URL.createObjectURL(file); }); }
async function uploadTo(bucket, file, prefix){
  const isImg = file.type.startsWith('image'); const blob = isImg && bucket === 'feed' ? await shrink(file) : file;
  const ext = isImg && bucket === 'feed' ? 'jpg' : (file.name.split('.').pop() || 'bin').toLowerCase();
  const path = `${prefix}/${Date.now()}-${Math.random().toString(36).slice(2,8)}.${ext}`;
  const { error } = await sb.storage.from(bucket).upload(path, blob, { contentType: blob.type || file.type, upsert:false }); if (error) throw error;
  return { path, url: bucket === 'feed' ? sb.storage.from(bucket).getPublicUrl(path).data.publicUrl : null, size: blob.size, type: isImg ? 'image' : 'video' };
}
const ytId = s => (String(s||'').match(/(?:v=|youtu\.be\/|shorts\/|embed\/|live\/)([\w-]{11})/)||[])[1];
/* image lightbox shared by feed, dashboard and team page */
function lightbox(){
  let lb = $('.ilb'); if (lb) return lb._api;
  lb = document.createElement('div'); lb.className = 'ilb'; lb.setAttribute('role','dialog'); lb.setAttribute('aria-modal','true'); lb.setAttribute('aria-label','Photo');
  lb.innerHTML = `<button class="ilb__close" aria-label="Close">${ICO.x}</button><button class="ilb__prev" aria-label="Previous">${ICO.arrow}</button><img alt=""><button class="ilb__next" aria-label="Next">${ICO.arrow}</button><div class="ilb__cap"></div>`;
  document.body.appendChild(lb); let list = [], i = 0;
  const show = () => { $('img', lb).src = list[i].url; $('.ilb__cap', lb).textContent = `${list[i].alt || ''} ${list.length > 1 ? `${i+1} / ${list.length}` : ''}`.trim(); $('.ilb__prev', lb).hidden = $('.ilb__next', lb).hidden = list.length < 2; };
  const open = (items, at=0) => { list = items; i = at; show(); lb.classList.add('is-open'); document.body.style.overflow = 'hidden'; };
  const close = () => { lb.classList.remove('is-open'); document.body.style.overflow = ''; };
  $('.ilb__close', lb).addEventListener('click', close); lb.addEventListener('click', e => { if (e.target === lb) close(); });
  $('.ilb__prev', lb).addEventListener('click', () => { i = (i - 1 + list.length) % list.length; show(); }); $('.ilb__next', lb).addEventListener('click', () => { i = (i + 1) % list.length; show(); });
  addEventListener('keydown', e => { if (!lb.classList.contains('is-open')) return; if (e.key === 'Escape') close(); if (e.key === 'ArrowRight') $('.ilb__next', lb).click(); if (e.key === 'ArrowLeft') $('.ilb__prev', lb).click(); });
  return lb._api = { open, close };
}

/* ================================================================ FEED */
function mediaBlock(p){
  const m = p.media || []; if (!m.length) return '';
  const imgs = m.filter(x => x.type === 'image'), rest = m.filter(x => x.type !== 'image');
  const cls = imgs.length === 1 ? 'one' : imgs.length === 2 ? 'two' : imgs.length === 3 ? 'three' : imgs.length >= 4 ? 'four' : '';
  const shown = imgs.slice(0, 4);
  const grid = imgs.length ? `<div class="pm pm--${cls}">${shown.map((x, i) => `<button class="pm__img" data-i="${i}" aria-label="Open photo ${i+1}"><img src="${esc(x.url)}" alt="${esc(x.alt||'')}" loading="lazy">${i === 3 && imgs.length > 4 ? `<span class="pm__more">+${imgs.length - 4}</span>` : ''}</button>`).join('')}</div>` : '';
  const others = rest.map(x => x.type === 'youtube'
    ? `<button class="pm__yt" data-yt="${esc(x.id)}" aria-label="Play video"><img src="https://i.ytimg.com/vi/${esc(x.id)}/hqdefault.jpg" alt="" loading="lazy"><span class="pm__play">${ICO.play}</span></button>`
    : `<video controls preload="metadata" playsinline src="${esc(x.url)}"></video>`).join('');
  return grid + others;
}
function postCard(p, liked){
  const mine = profile && profile.id === p.author_id, r = role();
  const long = (p.body || '').length > 420;
  const menu = (mine || can.admin(r)) ? `<div class="post__menu"><button class="post__more" aria-label="Post options" aria-haspopup="true">${ICO.more}</button><div class="post__menuList" hidden>${can.admin(r) ? `<button class="post__pin">${p.pinned ? 'Unpin from top' : 'Pin to top'}</button>` : ''}<button class="post__edit">Edit post</button><button class="post__del">Delete post</button></div></div>` : '';
  return `<article class="post ${p.pinned ? 'is-pinned' : ''} kind-${esc(p.kind)}" data-id="${p.id}" id="post-${p.id}">
    <header class="post__head">${avatar(p.author_name, p.author_avatar)}<div class="post__who"><b>${esc(p.author_name || SITE.short)}</b><span>${esc(ROLES[p.author_role]?.short || '')} &middot; <time title="${esc(fullDate(p.created_at))}">${esc(when(p.created_at))}</time>${p.pinned ? ` &middot; <i class="post__pinned">${ICO.pin} Pinned</i>` : ''}</span></div><span class="kind kind--${esc(p.kind)}">${esc(KINDS[p.kind] || p.kind)}</span>${menu}</header>
    <h3 class="post__title">${esc(p.title)}</h3>
    ${p.body ? `<div class="post__body ${long ? 'is-clamped' : ''}">${md(p.body)}</div>${long ? '<button class="post__readmore link">Read more</button>' : ''}` : ''}
    ${mediaBlock(p)}
    <footer class="post__foot">
      <button class="post__like ${liked ? 'is-on' : ''}" aria-pressed="${liked}" aria-label="Like">${ICO.heart}<span>${p.reaction_count || 0}</span></button>
      <button class="post__cbtn" aria-label="Comments">${ICO.chat}<span>${p.comment_count || 0}</span></button>
      <button class="post__share" aria-label="Copy link">${ICO.share}<span>Share</span></button>
    </footer>
    <div class="post__comments" hidden></div></article>`;
}
function wireComments(box, key, id, modal, onCount){
  const load = async () => {
    const { data } = await sb.from('comments').select('id, body, created_at, author_id, profiles:member_cards(full_name, avatar_url)').eq(key, id).order('created_at');
    box.innerHTML = (data||[]).map(c => `<div class="cmt" data-id="${c.id}">${avatar(c.profiles?.full_name, c.profiles?.avatar_url, 'ava--s')}<div><b>${esc(c.profiles?.full_name || 'Member')}</b> <span>${esc(when(c.created_at))}</span><p>${esc(c.body)}</p></div>${(profile && (profile.id === c.author_id || can.moderate(role()))) ? '<button class="cmt__del" aria-label="Delete comment">&times;</button>' : ''}</div>`).join('')
      + (session ? `<form class="cmt__form">${avatar(profile?.full_name, profile?.avatar_url, 'ava--s')}<textarea name="body" rows="1" maxlength="2000" placeholder="Write a comment" required></textarea><button class="btn" type="submit">Post</button></form>` : `<button class="cmt__signin link">Sign in to comment</button>`);
    $$('.cmt__del', box).forEach(b => b.addEventListener('click', async () => { await sb.from('comments').delete().eq('id', b.closest('.cmt').dataset.id); load(); }));
    const f = $('.cmt__form', box); if (f){ const ta = $('textarea', f); autosize(ta); ta.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey){ e.preventDefault(); f.requestSubmit(); } });
      f.addEventListener('submit', async e => { e.preventDefault(); const body = ta.value.trim(); if (!body) return;
        const { error } = await sb.from('comments').insert({ [key]: id, author_id: session.user.id, body }); if (error) toast(friendly(error), false); else { onCount && onCount(); load(); } }); }
    const s = $('.cmt__signin', box); if (s) s.addEventListener('click', () => modal.open('in'));
  }; return load;
}
function autosize(ta){ if (!ta) return; const fit = () => { ta.style.height = 'auto'; ta.style.height = Math.min(600, ta.scrollHeight + 2) + 'px'; }; ta.addEventListener('input', fit); fit(); }

/* ================================================================ FEED ANNOUNCEMENTS (leaders and admins manage them in place) */
const ICO_MEGA = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 11v2a1 1 0 0 0 1 1h2l5 4V6L6 10H4a1 1 0 0 0-1 1z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/></svg>';
async function feedAnnouncements(root, site){
  const col = ($('.feed__filters', root) || $('.feed__composer', root) || $('.feed__list', root)); if (!col) return;
  let box = $('.feed__announce', root);
  if (!box){ box = document.createElement('section'); box.className = 'feed__announce'; box.setAttribute('aria-label', 'Announcements'); box.hidden = true; col.parentElement.insertBefore(box, col); }
  const canEdit = can.moderate(role());
  const fmt = d => new Date(d).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' });
  const dateVal = d => d ? new Date(d).toISOString().slice(0, 10) : '';
  let items = [];
  const card = a => { const expired = a.ends_at && new Date(a.ends_at) < new Date();
    return `<article class="ann${a.active && !expired ? '' : ' is-off'}${a.pinned ? ' is-pinned' : ''}" data-id="${a.id}">
      <div class="ann__body"><b>${esc(a.title)}</b>${a.body ? `<div class="ann__text">${md(a.body)}</div>` : ''}${a.link_url ? `<a class="ann__link" href="${esc(a.link_url)}"${/^https?:\/\/([a-z0-9-]+\.)?ccfczambia\.org/i.test(a.link_url) ? '' : ' target="_blank" rel="noopener"'}>${esc(a.link_label || 'Find out more')} ${ICO.arrow}</a>` : ''}
        ${canEdit ? `<span class="ann__meta">${a.active ? (expired ? 'Expired' : 'Live') : 'Hidden'}${a.ends_at ? ' &middot; until ' + esc(fmt(a.ends_at)) : ''} &middot; updated ${esc(when(a.updated_at))}${a.editor?.full_name ? ' by ' + esc(a.editor.full_name) : ''}</span>` : ''}</div>
      ${canEdit ? `<div class="ann__acts"><button type="button" class="pill ann__edit">Edit</button><button type="button" class="pill ann__toggle">${a.active ? 'Hide' : 'Show'}</button><button type="button" class="pill pill--danger ann__del">Delete</button></div>` : ''}</article>`; };
  const form = (a = {}) => `<form class="ann ann--form" data-id="${a.id || ''}" novalidate>
      <div class="field"><label>Title</label><input name="title" required maxlength="140" value="${esc(a.title || '')}" placeholder="Youth camp registration closes Friday"></div>
      <div class="field"><label>Message <small>(optional)</small></label><textarea name="body" rows="3" maxlength="1200" placeholder="Short details people need to know">${esc(a.body || '')}</textarea></div>
      <div class="ann__row"><div class="field"><label>Link <small>(optional)</small></label><input name="link_url" type="url" value="${esc(a.link_url || '')}" placeholder="https://"></div><div class="field"><label>Link text</label><input name="link_label" maxlength="40" value="${esc(a.link_label || '')}" placeholder="Register now"></div></div>
      <div class="ann__row"><div class="field"><label>Show until <small>(optional)</small></label><input name="ends_at" type="date" value="${dateVal(a.ends_at)}"></div><label class="ann__check"><input type="checkbox" name="pinned" ${a.pinned ? 'checked' : ''}> Pin to the top</label></div>
      <div class="row"><button class="btn" type="submit">${a.id ? 'Save changes' : 'Publish announcement'}</button><button class="btn btn--ghost ann__cancel" type="button">Cancel</button><span class="form__status" aria-live="polite"></span></div></form>`;
  async function load(){
    const { data } = await sb.from('announcements').select('*, editor:member_cards!updated_by(full_name)').eq('site', site).order('pinned', { ascending:false }).order('updated_at', { ascending:false }).limit(20);
    items = (data || []).filter(a => canEdit || (a.active && (!a.ends_at || new Date(a.ends_at) > new Date()))); render();
  }
  function render(){
    if (!items.length && !canEdit){ box.hidden = true; return; }
    box.hidden = false;
    box.innerHTML = `<div class="ann__head"><span class="ann__ico">${ICO_MEGA}</span><h2>Announcements</h2>${canEdit ? '<button type="button" class="pill pill--orange ann__add">New announcement</button>' : ''}</div>
      <div class="ann__list">${items.length ? items.map(card).join('') : `<p class="ann__empty">No announcements yet. As a ${esc(ROLES[role()].label)} you can post one for everyone who opens the feed.</p>`}</div>`;
    if (!canEdit) return;
    $('.ann__add', box).addEventListener('click', () => { $('.ann__list', box).insertAdjacentHTML('afterbegin', form()); wireForm($('.ann--form', box)); });
    $$('.ann', box).forEach(el => { const a = items.find(x => x.id === el.dataset.id); if (!a) return;
      $('.ann__edit', el)?.addEventListener('click', () => { el.outerHTML = form(a); wireForm($(`.ann--form[data-id="${a.id}"]`, box)); });
      $('.ann__toggle', el)?.addEventListener('click', async () => { const { error } = await sb.from('announcements').update({ active: !a.active, updated_by: profile.id }).eq('id', a.id); if (error) toast(friendly(error), false); else { toast(a.active ? 'Hidden from the feed.' : 'Showing on the feed.'); load(); } });
      $('.ann__del', el)?.addEventListener('click', async e => { if (!(await sure({ title: `Delete "${a.title}"?`, body: 'It comes off the feed for everyone. This cannot be undone.', ok: 'Delete', danger: true, from: e.currentTarget }))) return; const { error } = await sb.from('announcements').delete().eq('id', a.id); if (error) toast(friendly(error), false); else { toast('Announcement deleted.'); load(); } }); });
  }
  function wireForm(f){ const st = $('.form__status', f); f.title.focus();
    $('.ann__cancel', f).addEventListener('click', render);
    f.addEventListener('submit', async e => { e.preventDefault(); const title = f.title.value.trim(); const url = f.link_url.value.trim();
      if (!title){ st.textContent = 'A title is needed.'; st.className = 'form__status is-err'; return; }
      if (url && !/^https?:\/\//i.test(url)){ st.textContent = 'Links must start with https://'; st.className = 'form__status is-err'; return; }
      const row = { site, title, body: f.body.value.trim(), link_url: url || null, link_label: f.link_label.value.trim() || null, pinned: f.pinned.checked, ends_at: f.ends_at.value ? new Date(f.ends_at.value + 'T23:59:59').toISOString() : null, updated_by: profile.id };
      st.textContent = 'Saving...'; st.className = 'form__status';
      const q = f.dataset.id ? sb.from('announcements').update(row).eq('id', f.dataset.id) : sb.from('announcements').insert({ ...row, created_by: profile.id, active: true });
      const { error } = await q; if (error){ st.textContent = friendly(error); st.className = 'form__status is-err'; return; }
      toast(f.dataset.id ? 'Announcement updated.' : 'Announcement published.'); load(); }); }
  load();
}

/* The Leadership Hub lives in the portal now (portal.ccfczambia.org), beside the data it
   reports on. The old /leadership address redirects there. */

/* The feed and the library are for people with an account. Their links are already hidden when
   signed out, but someone can still arrive on the page from a bookmark or a shared link, so the
   page says what it is and offers a way in rather than showing an empty list. */
function memberWall(what, why){
  return `<div class="empty"><h3>${esc(what)} is for the church family</h3><p>${esc(why)}</p>
    <div class="row mt-2"><button class="btn" data-auth="in">Sign in</button><button class="btn btn--ghost" data-auth="up">Create account</button></div></div>`;
}
async function feedPage(modal){
  const root = $('#feed'); if (!root) return; const site = root.dataset.site || SITE_KEY;
  const list = $('.feed__list', root), composerSlot = $('.feed__composer', root), filters = $('.feed__filters', root);
  if (!ready){ list.innerHTML = `<div class="empty"><h3>The feed is almost ready</h3><p>Accounts and the feed switch on as soon as the church team finishes setup. Follow us on Facebook in the meantime.</p></div>`; return; }
  if (!session){ list.innerHTML = memberWall('The church feed', 'News, photos and videos the church shares with its members. Create an account or sign in to read it.');
    if (composerSlot) composerSlot.innerHTML = ''; if (filters) filters.innerHTML = ''; accountUI(modal); return; }
  const q = new URLSearchParams(location.search); let kind = q.get('kind') || '', page = 0; const PAGE = 20; let mine = new Set(); const lb = lightbox();
  if (filters){ const kinds = ['', ...SITES[site].kinds]; filters.innerHTML = kinds.map(k => `<button class="chip ${k === kind ? 'is-on' : ''}" data-k="${k}">${k ? KINDS[k] : 'All'}</button>`).join('');
    $$('.chip', filters).forEach(b => b.addEventListener('click', () => { kind = b.dataset.k; $$('.chip', filters).forEach(x => x.classList.toggle('is-on', x === b)); history.replaceState(null, '', location.pathname + (kind ? `?kind=${kind}` : '')); page = 0; load(); })); }
  feedAnnouncements(root, site);
  if (can.post(role(), site)) composer(composerSlot, site, () => { page = 0; load(); }); else if (composerSlot) composerSlot.innerHTML = '';
  async function load(append=false){
    if (!append) list.innerHTML = '<div class="skel"></div><div class="skel"></div><div class="skel"></div>';
    let qry = sb.from('feed').select('*').eq('site', site).order('pinned', { ascending:false }).order('created_at', { ascending:false }).range(page*PAGE, page*PAGE + PAGE - 1);
    if (kind) qry = qry.eq('kind', kind);
    let want = q.get('post'); if (want && !/^[0-9a-f-]{36}$/i.test(want)){ const { data: legacy } = await sb.rpc('resolve_legacy_feed_post', { p_slug: want }); want = legacy; } if (want && !append && !kind){ const { data:one } = await sb.from('feed').select('*').eq('id', want).maybeSingle(); if (one){ qry = qry.neq('id', want); var first = one; } }
    let data, error;
    try { ({ data, error } = await qry); } catch (e) { error = e; }
    if (error){ list.innerHTML = `<div class="empty"><h3>Could not load the feed</h3><p>${esc(error.message || 'Please try again.')}</p></div>`; return; }
    const rows = first ? [first, ...data] : data;
    if (!rows.length && !append){ list.innerHTML = `<div class="empty"><h3>${kind ? 'Nothing in ' + KINDS[kind].toLowerCase() + ' yet' : 'Nothing posted yet'}</h3><p>${SITES[site].feedLabel} will appear here as the team posts.</p></div>`; return; }
    if (session && !append){ const { data:r } = await sb.from('reactions').select('post_id').eq('user_id', session.user.id); mine = new Set((r||[]).map(x => x.post_id)); }
    const html = rows.map(p => postCard(p, mine.has(p.id))).join('');
    if (append){ $('.feed__more', list)?.remove(); list.insertAdjacentHTML('beforeend', html); } else list.innerHTML = html;
    if (data.length === PAGE) list.insertAdjacentHTML('beforeend', `<button class="btn btn--ghost feed__more">Load older posts</button>`);
    $('.feed__more', list)?.addEventListener('click', () => { page++; load(true); });
    rows.forEach(p => wirePost($(`#post-${p.id}`, list), p));
    if (first && !append) $(`#post-${first.id}`)?.scrollIntoView({ block:'start', behavior:'smooth' });
  }
  function wirePost(el, p){ if (!el || el._wired) return; el._wired = true;
    const like = $('.post__like', el), cbtn = $('.post__cbtn', el), cbox = $('.post__comments', el), share = $('.post__share', el);
    like.addEventListener('click', async () => { if (!session){ modal.open('in'); return; } const on = like.classList.contains('is-on'), n = $('span', like);
      like.classList.toggle('is-on', !on); like.classList.add('is-pop'); setTimeout(() => like.classList.remove('is-pop'), 400); like.setAttribute('aria-pressed', !on); n.textContent = Math.max(0, +n.textContent + (on ? -1 : 1));
      if (on){ await sb.from('reactions').delete().match({ post_id:p.id, user_id:session.user.id }); mine.delete(p.id); } else { const { error } = await sb.from('reactions').insert({ post_id:p.id, user_id:session.user.id }); if (error){ like.classList.remove('is-on'); n.textContent = Math.max(0, +n.textContent-1); } else mine.add(p.id); } });
    const loadC = wireComments(cbox, 'post_id', p.id, modal, () => { $('span', cbtn).textContent = +$('span', cbtn).textContent + 1; });
    cbtn.addEventListener('click', () => { cbox.hidden = !cbox.hidden; if (!cbox.hidden) loadC(); });
    share.addEventListener('click', async () => { const url = `${location.origin}/${SITES[site].feed}?post=${p.id}`; try { if (navigator.share) await navigator.share({ title:p.title, url }); else { await navigator.clipboard.writeText(url); toast('Link copied.'); } } catch (_) {} });
    $('.post__readmore', el)?.addEventListener('click', e => { $('.post__body', el).classList.remove('is-clamped'); e.target.remove(); });
    const imgs = (p.media||[]).filter(x => x.type === 'image'); $$('.pm__img', el).forEach(b => b.addEventListener('click', () => lb.open(imgs, +b.dataset.i)));
    $$('.pm__yt', el).forEach(b => b.addEventListener('click', () => { b.outerHTML = `<div class="pm__frame"><iframe src="https://www.youtube-nocookie.com/embed/${esc(b.dataset.yt)}?autoplay=1&rel=0" title="${esc(p.title)}" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe></div>`; }));
    const more = $('.post__more', el), ml = $('.post__menuList', el);
    $('.post__edit', el)?.addEventListener('click', () => editFeedPost(p, () => load()));
    if (more){ more.addEventListener('click', () => { ml.hidden = !ml.hidden; }); document.addEventListener('click', e => { if (!el.contains(e.target)) ml.hidden = true; });
      $('.post__del', el)?.addEventListener('click', async () => { ml.hidden = true; if (!(await sure({ title: 'Delete this post?', body: `"${p.title}" is removed for everyone, with its comments and likes. This cannot be undone.`, ok: 'Delete post', danger: true, from: more }))) return; const { error } = await sb.from('posts').delete().eq('id', p.id); if (error) toast(friendly(error), false); else { el.remove(); toast('Post deleted.'); } });
      $('.post__pin', el)?.addEventListener('click', async () => { const { error } = await sb.from('posts').update({ pinned: !p.pinned }).eq('id', p.id); if (error) toast(friendly(error), false); else { toast(p.pinned ? 'Unpinned.' : 'Pinned to the top.'); page = 0; load(); } }); }
  }
  /* load() is the last thing feedPage does, so anything throwing above it would otherwise leave the
     list exactly as the page shipped: empty. */
  load().catch(() => { list.innerHTML = `<div class="empty"><h3>Could not load the feed</h3><p>Please refresh the page.</p></div>`; });
}

/* ================================================================ COMPOSER */
function composer(slot, site, onPosted){
  if (!slot) return; const r = role(), kinds = SITES[site].kinds.filter(k => k !== 'announcement' || can.moderate(r)), s = SITES[site];
  const hint = { ccfc:'Share news, a testimony, a notice or this week\'s photos.', koinonia:'Post a conference update, a speaker announcement, a video or photos.', worship:'Post a new set, a song, rehearsal news or photos from Sunday.' }[site];
  slot.innerHTML = `<form class="cmp" novalidate>
    <div class="cmp__collapsed">${avatar(profile.full_name, profile.avatar_url)}<button type="button" class="cmp__open">${esc(hint)}</button><span class="cmp__hint">${ICO.image}${ICO.yt}</span></div>
    <div class="cmp__body" hidden>
      <div class="cmp__head">${avatar(profile.full_name, profile.avatar_url)}<div><b>${esc(profile.full_name || profile.email)}</b><span>Posting to ${esc(s.feedLabel.toLowerCase())} as ${esc(ROLES[r].short)}</span></div><button type="button" class="cmp__close" aria-label="Close">${ICO.x}</button></div>
      <div class="cmp__kinds" role="radiogroup" aria-label="Post type">${kinds.map((k,i) => `<label class="chip ${i ? '' : 'is-on'}"><input type="radio" name="kind" value="${k}" ${i ? '' : 'checked'}>${KINDS[k]}</label>`).join('')}</div>
      <input class="cmp__title" name="title" required maxlength="140" placeholder="Give it a headline" aria-label="Title">
      <textarea class="cmp__text" name="body" maxlength="5000" rows="3" placeholder="Write the details. Use ## for a heading, - for a list, **bold**." aria-label="Details"></textarea>
      <div class="cmp__yt" hidden><span>${ICO.yt}</span><input name="youtube" placeholder="Paste a YouTube link" aria-label="YouTube link"><button type="button" class="cmp__ytx" aria-label="Remove link">${ICO.x}</button></div>
      <div class="cmp__ytprev" hidden></div>
      <div class="cmp__drop" hidden><input type="file" name="files" accept="image/*,video/mp4,video/webm,video/quicktime" multiple hidden><div class="cmp__preview"></div><button type="button" class="cmp__add">${ICO.image} Add photos or a video <small>up to 25 MB each</small></button></div>
      <div class="cmp__bar">
        <div class="cmp__tools"><button type="button" class="cmp__tool" data-t="media" title="Photos or video">${ICO.image}<span>Media</span></button><button type="button" class="cmp__tool" data-t="yt" title="YouTube video">${ICO.yt}<span>YouTube</span></button>${can.admin(r) ? `<label class="cmp__tool cmp__pin"><input type="checkbox" name="pinned">${ICO.pin}<span>Pin</span></label>` : ''}</div>
        <span class="cmp__count" aria-live="polite"></span>
        <button class="btn btn--ghost cmp__draft" type="submit" data-draft="1">Save draft</button><button class="btn cmp__submit" type="submit">Post ${ICO.arrow}</button>
      </div>
      <div class="cmp__status" aria-live="polite"></div>
    </div></form>`;
  const f = $('.cmp', slot), body = $('.cmp__body', f), col = $('.cmp__collapsed', f), title = $('.cmp__title', f), text = $('.cmp__text', f), files = $('input[name=files]', f), prev = $('.cmp__preview', f), status = $('.cmp__status', f), yt = $('.cmp__yt', f), ytIn = $('input[name=youtube]', f), ytPrev = $('.cmp__ytprev', f), drop = $('.cmp__drop', f), count = $('.cmp__count', f), submit = $('.cmp__submit', f);
  let picked = [];
  const open = () => { col.hidden = true; body.hidden = false; title.focus(); }; const close = () => { body.hidden = true; col.hidden = false; };
  $('.cmp__open', f).addEventListener('click', open); $('.cmp__close', f).addEventListener('click', close);
  if (new URLSearchParams(location.search).has('compose') || new URLSearchParams(location.search).has('new')) open();
  $$('.cmp__kinds input', f).forEach(i => i.addEventListener('change', () => { $$('.cmp__kinds .chip', f).forEach(c => c.classList.toggle('is-on', $('input', c).checked)); if (i.value === 'video' && i.checked){ yt.hidden = false; ytIn.focus(); } if ((i.value === 'photo') && i.checked) drop.hidden = false; }));
  $$('.cmp__tool[data-t]', f).forEach(b => b.addEventListener('click', () => { if (b.dataset.t === 'media'){ drop.hidden = false; files.click(); } else { yt.hidden = false; ytIn.focus(); } }));
  $('.cmp__ytx', f).addEventListener('click', () => { ytIn.value = ''; yt.hidden = true; ytPrev.hidden = true; ytPrev.innerHTML = ''; });
  ytIn.addEventListener('input', () => { const id = ytId(ytIn.value); ytPrev.hidden = !id; ytPrev.innerHTML = id ? `<img src="https://i.ytimg.com/vi/${id}/hqdefault.jpg" alt=""><span>${ICO.play}</span>` : ''; });
  autosize(text); text.addEventListener('input', () => { count.textContent = text.value.length > 4000 ? `${5000 - text.value.length} left` : ''; });
  const renderPreview = () => { prev.innerHTML = picked.map((x, i) => `<div class="cmp__thumb">${x.type.startsWith('image') ? `<img src="${URL.createObjectURL(x)}" alt="">` : `<div class="cmp__vid">${ICO.play}<small>${esc(x.name)}</small></div>`}<button type="button" data-i="${i}" aria-label="Remove">${ICO.x}</button><span>${fmtBytes(x.size)}</span></div>`).join('');
    $$('.cmp__thumb button', prev).forEach(b => b.addEventListener('click', () => { picked.splice(+b.dataset.i, 1); renderPreview(); })); };
  const addFiles = fl => { for (const x of fl){ if (x.size > 25*1024*1024){ toast(`${x.name} is larger than 25 MB.`, false); continue; } if (picked.length >= 12){ toast('Up to 12 files per post.', false); break; } picked.push(x); } renderPreview(); };
  files.addEventListener('change', () => { addFiles(files.files); files.value = ''; }); $('.cmp__add', f).addEventListener('click', () => files.click());
  ['dragenter','dragover'].forEach(ev => f.addEventListener(ev, e => { e.preventDefault(); drop.hidden = false; drop.classList.add('is-over'); }));
  ['dragleave','drop'].forEach(ev => f.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove('is-over'); if (ev === 'drop'){ open(); addFiles(e.dataTransfer.files); } }));
  f.addEventListener('paste', e => { const fl = [...(e.clipboardData?.files || [])]; if (fl.length){ drop.hidden = false; addFiles(fl); } });
  f.addEventListener('keydown', e => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') f.requestSubmit(); });
  f.addEventListener('submit', async e => { e.preventDefault(); if(submit.disabled) return; const draft = e.submitter?.dataset.draft === '1'; const t = title.value.trim(); if (!t){ status.textContent = 'Give the post a headline.'; status.className = 'cmp__status is-err'; title.focus(); return; }
    submit.disabled = true; status.className = 'cmp__status';
    try { const media = []; const id = ytId(ytIn.value); if (id) media.push({ type:'youtube', id });
      for (let i = 0; i < picked.length; i++){ status.textContent = `Uploading ${i+1} of ${picked.length}...`; const u = await uploadTo('feed', picked[i], profile.id); media.push({ type:u.type, url:u.url, path:u.path }); }
      status.textContent = draft ? 'Saving draft...' : 'Publishing...';
      const kind = f.kind.value; const { error } = await sb.from('posts').insert({ site, author_id: profile.id, title:t, body: text.value.trim(), kind, media, published: !draft, pinned: !!(f.pinned && f.pinned.checked) }); if (error) throw error;
      f.reset(); picked = []; renderPreview(); ytPrev.innerHTML = ''; yt.hidden = ytPrev.hidden = drop.hidden = true; text.style.height = ''; $$('.cmp__kinds .chip', f).forEach((c,i) => c.classList.toggle('is-on', !i));
      status.textContent = ''; close(); toast(draft ? 'Draft saved. Open the admin panel to edit or publish it.' : 'Posted.'); onPosted && onPosted();
    } catch (err){ status.textContent = friendly(err); status.className = 'cmp__status is-err'; } finally { submit.disabled = false; } });
}

async function editFeedPost(post, onSaved){
  if(!post || !(can.admin(role()) || post.author_id === profile?.id)) return;
  const dialog=document.createElement('dialog'); dialog.className='feed-editor'; dialog.setAttribute('aria-label','Edit feed post');
  dialog.innerHTML=`<form><h2>Edit post</h2><label class="field"><span>Title</span><input name="title" required value="${esc(post.title)}"></label><label class="field"><span>Post</span><textarea name="body" rows="10">${esc(post.body||'')}</textarea></label><p class="sub">Existing photos and videos will be kept.</p><div class="row"><button class="btn" type="submit" value="publish">${post.published === false ? 'Publish' : 'Save changes'}</button><button class="btn btn--ghost" type="submit" value="draft">Save as draft</button><button class="btn btn--ghost" type="button" data-cancel>Cancel</button></div><p class="form__status" aria-live="polite"></p></form>`;
  const form=$('form',dialog), status=$('.form__status',dialog); let busy=false;
  $('[data-cancel]',dialog).addEventListener('click',()=>{if(!busy) dialog.close();});
  dialog.addEventListener('cancel',e=>{if(busy)e.preventDefault();}); dialog.addEventListener('close',()=>dialog.remove());
  form.addEventListener('submit',async e=>{e.preventDefault();if(busy || !form.title.value.trim())return;busy=true;$$('button',form).forEach(b=>b.disabled=true);status.textContent='Saving...';
    try{const {data,error}=await sb.from('posts').update({title:form.title.value.trim(),body:form.body.value.trim(),published:e.submitter?.value!=='draft'}).eq('id',post.id).select('id').maybeSingle();
      if(error || !data)throw new Error('The post could not be saved. Please check your access and try again.');dialog.close();toast('Post saved.');onSaved?.();
    }catch(err){status.textContent=err.message;}finally{busy=false;$$('button',form).forEach(b=>b.disabled=false);}
  });document.body.append(dialog);dialog.showModal();
}

/* ---------- UPPER ROOM LIBRARY (leaders and above) ---------- */
/* Upper Room tools shared by the public library page and the admin dashboard's library tab:
   file types, covers, uploads with progress, preview and delete. getItems() feeds the series list; onChanged() reloads the caller. */
function libraryKit(getItems, onChanged){
  const KINDS = { book:'Book', slides:'Slides', notes:'Notes', audio:'Audio', video:'Video', other:'Other' };
  const pub = path => sb.storage.from('library').getPublicUrl(path).data.publicUrl;
  const extOf = n => (String(n).split('.').pop() || '').toLowerCase();
  const TYPE = e => ({ pdf:'pdf', ppt:'slides', pptx:'slides', key:'slides', odp:'slides', doc:'doc', docx:'doc', odt:'doc', rtf:'doc', txt:'doc', xls:'sheet', xlsx:'sheet', csv:'sheet', mp3:'audio', m4a:'audio', wav:'audio', ogg:'audio', mp4:'video', mov:'video', webm:'video', jpg:'image', jpeg:'image', png:'image', webp:'image', gif:'image' })[e] || 'file';
  const KIND_FOR = t => ({ pdf:'book', slides:'slides', doc:'notes', sheet:'notes', audio:'audio', video:'video', image:'other', file:'other' })[t];
  const art = (t, e) => `<span class="lcov__art lcov__art--${t}"><i>${esc(e.toUpperCase() || 'FILE')}</i></span>`;
  let pdfjs = null;
  const loadPdf = () => pdfjs || (pdfjs = new Promise((ok, no) => { const sc = document.createElement('script'); sc.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js'; sc.onload = () => { window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'; ok(window.pdfjsLib); }; sc.onerror = no; document.head.appendChild(sc); }));
  /* a 600px JPEG cover from the file itself: PDF first page, image, or a video frame */
  const withTimeout = (p, ms) => Promise.race([p, new Promise(r => setTimeout(() => r(null), ms))]);
  const coverFor = file => withTimeout(coverFrom(file), 15000);
  async function coverFrom(file){
    const t = TYPE(extOf(file.name)); const canvas = document.createElement('canvas'); const ctx = canvas.getContext('2d');
    const fit = (w, h) => { const s = Math.min(1, 600 / Math.max(w, h)); canvas.width = Math.round(w * s); canvas.height = Math.round(h * s); return s; };
    try {
      if (t === 'pdf'){ const lib = await loadPdf(); const doc = await lib.getDocument({ data: await file.arrayBuffer() }).promise; const page = await doc.getPage(1); const v = page.getViewport({ scale: 1 }); const s = fit(v.width, v.height); await page.render({ canvasContext: ctx, viewport: page.getViewport({ scale: s }), intent: 'print' }).promise; return { blob: await new Promise(r => canvas.toBlob(r, 'image/jpeg', .82)), pages: doc.numPages }; }
      if (t === 'image'){ const bmp = await createImageBitmap(file); fit(bmp.width, bmp.height); ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height); return { blob: await new Promise(r => canvas.toBlob(r, 'image/jpeg', .82)) }; }
      if (t === 'video'){ const v = document.createElement('video'); v.muted = true; v.preload = 'auto'; v.src = URL.createObjectURL(file); await new Promise((ok, no) => { v.onloadeddata = ok; v.onerror = no; }); v.currentTime = Math.min(2, (v.duration || 4) / 3); await new Promise(ok => { v.onseeked = ok; }); fit(v.videoWidth, v.videoHeight); ctx.drawImage(v, 0, 0, canvas.width, canvas.height); URL.revokeObjectURL(v.src); return { blob: await new Promise(r => canvas.toBlob(r, 'image/jpeg', .8)), duration: v.duration }; }
    } catch (err) { console.warn('Upper Room cover preview failed', err); }
    return null;
  }
  /* upload with real progress (the storage REST API over XHR) */
  function send(path, blob, type, onProgress){ return new Promise(async (ok, no) => { const { data: { session: s } } = await sb.auth.getSession();
    const x = new XMLHttpRequest(); x.open('POST', `${CFG.supabaseUrl}/storage/v1/object/library/${path}`); x.setRequestHeader('Authorization', 'Bearer ' + s.access_token); x.setRequestHeader('apikey', CFG.supabaseKey); x.setRequestHeader('x-upsert', 'false'); x.setRequestHeader('Content-Type', type || 'application/octet-stream');
    x.upload.onprogress = e => e.lengthComputable && onProgress && onProgress(e.loaded / e.total); x.onload = () => x.status < 300 ? ok() : no(new Error(JSON.parse(x.responseText || '{}').message || 'Upload failed (' + x.status + ')')); x.onerror = () => no(new Error('Network error while uploading')); x.send(blob); }); }

  function openUpload(){
    const dlg = document.createElement('div'); dlg.className = 'upl'; dlg.setAttribute('role', 'dialog'); dlg.setAttribute('aria-modal', 'true'); dlg.setAttribute('aria-labelledby', 'upl-h');
    dlg.innerHTML = `<div class="upl__card">
      <div class="upl__head"><div><h2 id="upl-h">Add to the Upper Room</h2><p>PDFs, slides, notes, audio or video. Up to 50 MB each.</p></div><button type="button" class="upl__x" aria-label="Close">&times;</button></div>
      <label class="upl__drop"><input type="file" multiple accept=".pdf,.ppt,.pptx,.key,.doc,.docx,.odt,.txt,.xls,.xlsx,.mp3,.m4a,.wav,.mp4,.mov,.webm,.jpg,.jpeg,.png"><span class="upl__dropico" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 16V4M7 9l5-5 5 5M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3"/></svg></span><b>Drop files here or <u>browse</u></b><small>You can add several at once</small></label>
      <div class="upl__files" aria-live="polite"></div>
      <div class="upl__shared" hidden><div class="field"><label for="upl-series">Series or topic</label><input id="upl-series" list="upl-series-list" placeholder="Book of Acts, Foundations, Leadership..."><datalist id="upl-series-list">${[...new Set(getItems().map(i => i.series).filter(Boolean))].map(sr => `<option value="${esc(sr)}">`).join('')}</datalist></div>
        <div class="field"><label for="upl-desc">Description <small>(optional, shared by these files)</small></label><textarea id="upl-desc" rows="2" placeholder="What is this material for?"></textarea></div></div>
      <div class="upl__foot"><span class="upl__status" aria-live="polite"></span><button type="button" class="btn btn--ghost upl__cancel">Cancel</button><button type="button" class="btn upl__go" disabled>Upload</button></div>
    </div>`;
    document.body.appendChild(dlg); document.documentElement.style.overflow = 'hidden'; requestAnimationFrame(() => dlg.classList.add('is-in')); setTimeout(() => dlg.classList.add('is-in'), 60);
    const input = $('input[type=file]', dlg), drop = $('.upl__drop', dlg), filesEl = $('.upl__files', dlg), go = $('.upl__go', dlg), statusEl = $('.upl__status', dlg);
    const queue = []; let busy = false;
    let closing = false;
    const close = async () => { if (closing) return; if (busy && !(await sure({ title: 'Close anyway?', body: 'Uploads are still running.', ok: 'Close anyway', cancel: 'Keep uploading' }))) return; if (closing) return; closing = true; dlg.classList.remove('is-in'); document.documentElement.style.overflow = ''; setTimeout(() => dlg.remove(), 250); };
    $('.upl__x', dlg).addEventListener('click', close); $('.upl__cancel', dlg).addEventListener('click', close);
    dlg.addEventListener('click', e => { if (e.target === dlg) close(); }); dlg.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
    const refresh = () => { go.disabled = !queue.some(q => q.state === 'ready'); $('.upl__shared', dlg).hidden = !queue.length; drop.classList.toggle('is-compact', queue.length > 0); go.textContent = queue.filter(q => q.state === 'ready').length > 1 ? `Upload ${queue.filter(q => q.state === 'ready').length} files` : 'Upload'; };
    const addFiles = fl => { [...fl].forEach(file => {
      if (file.size > 50 * 1048576){ statusEl.textContent = `${file.name} is larger than 50 MB, the storage limit.`; return; }
      const e = extOf(file.name), t = TYPE(e); const q = { file, t, state: 'ready', cover: null };
      const el = document.createElement('div'); el.className = 'upf'; q.el = el;
      el.innerHTML = `<div class="upf__thumb">${art(t, e)}<span class="upf__spin" aria-hidden="true"></span></div>
        <div class="upf__body"><input class="upf__title" value="${esc(file.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' '))}" aria-label="Title for ${esc(file.name)}"><div class="upf__meta"><select class="upf__kind" aria-label="Type">${Object.entries(KINDS).map(([k, v]) => `<option value="${k}" ${k === KIND_FOR(t) ? 'selected' : ''}>${v}</option>`).join('')}</select><span>${esc(e.toUpperCase())} &middot; ${fmtBytes(file.size)}</span><span class="upf__extra"></span></div><div class="upf__bar"><i></i></div></div>
        <button type="button" class="upf__rm" aria-label="Remove ${esc(file.name)}">&times;</button>`;
      $('.upf__rm', el).addEventListener('click', () => { if (q.state === 'uploading') return; queue.splice(queue.indexOf(q), 1); el.remove(); refresh(); });
      filesEl.appendChild(el); queue.push(q); requestAnimationFrame(() => el.classList.add('is-in')); setTimeout(() => el.classList.add('is-in'), 60);
      if (['pdf', 'image', 'video'].includes(t)){ el.classList.add('is-rendering');
        coverFor(file).then(c => { el.classList.remove('is-rendering'); if (!c) return; q.cover = c.blob; const u = URL.createObjectURL(c.blob); $('.upf__thumb', el).insertAdjacentHTML('afterbegin', `<img src="${u}" alt="">`); $('.upf__thumb', el).classList.add('has-img');
          if (c.pages) $('.upf__extra', el).textContent = `${c.pages} page${c.pages > 1 ? 's' : ''}`; if (c.duration) $('.upf__extra', el).textContent = `${Math.round(c.duration / 60)} min`; }); }
    }); refresh(); };
    input.addEventListener('change', () => { addFiles(input.files); input.value = ''; });
    ['dragenter', 'dragover'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add('is-over'); }));
    ['dragleave', 'drop'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove('is-over'); }));
    drop.addEventListener('drop', e => addFiles(e.dataTransfer.files));
    go.addEventListener('click', async () => { const series = $('#upl-series', dlg).value.trim(), desc = $('#upl-desc', dlg).value.trim(); busy = true; go.disabled = true; let done = 0, failed = 0;
      for (const q of queue.filter(x => x.state === 'ready')){
        const title = $('.upf__title', q.el).value.trim() || q.file.name; q.state = 'uploading'; q.el.classList.add('is-uploading'); const bar = $('.upf__bar i', q.el);
        try {
          const base = `${series ? slugify(series) : 'general'}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}`; const path = `${base}.${extOf(q.file.name) || 'bin'}`;
          await send(path, q.file, q.file.type, p => { bar.style.width = Math.round(p * 100) + '%'; });
          let cover_path = null; if (q.cover){ cover_path = `covers/${base.split('/').pop()}.jpg`; await send(cover_path, q.cover, 'image/jpeg'); }
          const { error } = await sb.from('library_items').insert({ uploader_id: profile.id, kind: $('.upf__kind', q.el).value, title, description: desc, series, path, file_name: q.file.name, size_bytes: q.file.size, cover_path }); if (error) throw error;
          q.state = 'done'; q.el.classList.remove('is-uploading'); q.el.classList.add('is-done'); bar.style.width = '100%'; done++;
        } catch (err){ q.state = 'ready'; q.el.classList.remove('is-uploading'); q.el.classList.add('is-error'); $('.upf__extra', q.el).textContent = friendly(err); failed++; }
      }
      busy = false; statusEl.textContent = failed ? `${done} uploaded, ${failed} failed. Fix and try again.` : `${done} added to the library.`; refresh(); onChanged();
      if (!failed) setTimeout(close, 1100); });
    setTimeout(() => drop.focus && $('.upl__x', dlg).focus(), 50);
  }

  function preview(i){ const url = pub(i.path), e = extOf(i.file_name), t = TYPE(e);
    const body = t === 'pdf' ? `<iframe src="${esc(url)}#view=FitH" title="${esc(i.title)}"></iframe>` : t === 'image' ? `<img src="${esc(url)}" alt="${esc(i.title)}">` : t === 'video' ? `<video src="${esc(url)}" controls playsinline></video>` : t === 'audio' ? `<div class="lpv__audio">${art(t, e)}<audio src="${esc(url)}" controls></audio></div>` : `<div class="lpv__none">${i.cover_path ? `<img src="${esc(pub(i.cover_path))}" alt="">` : art(t, e)}<p>This ${esc(e.toUpperCase())} file opens in its own app. Download it to read.</p></div>`;
    const d = document.createElement('div'); d.className = 'upl lpv'; d.setAttribute('role', 'dialog'); d.setAttribute('aria-modal', 'true'); d.setAttribute('aria-label', i.title);
    d.innerHTML = `<div class="upl__card lpv__card"><div class="upl__head"><div><span class="lpv__kind">${esc(KINDS[i.kind] || i.kind)}${i.series ? ' &middot; ' + esc(i.series) : ''}</span><h2>${esc(i.title)}</h2>${i.description ? `<p>${esc(i.description)}</p>` : ''}</div><div class="lpv__acts"><a class="btn" href="${esc(url)}" download="${esc(i.file_name)}" target="_blank" rel="noopener">Download <small>${fmtBytes(i.size_bytes)}</small></a><button type="button" class="upl__x" aria-label="Close">&times;</button></div></div><div class="lpv__body">${body}</div></div>`;
    document.body.appendChild(d); document.documentElement.style.overflow = 'hidden'; requestAnimationFrame(() => d.classList.add('is-in')); setTimeout(() => d.classList.add('is-in'), 60); const x = $('.upl__x', d); x.focus();
    const close = () => { d.classList.remove('is-in'); document.documentElement.style.overflow = ''; setTimeout(() => d.remove(), 250); };
    x.addEventListener('click', close); d.addEventListener('click', ev => { if (ev.target === d) close(); }); d.addEventListener('keydown', ev => { if (ev.key === 'Escape') close(); });
  }
  async function remove(it, from){ if (!it || !(await sure({ title: `Delete "${it.title}" from the library?`, body: 'The file and its cover leave the Upper Room for everyone. This cannot be undone.', ok: 'Delete', danger: true, from }))) return false;
    await sb.storage.from('library').remove([it.path, it.cover_path].filter(Boolean)); const { error } = await sb.from('library_items').delete().eq('id', it.id);
    if (error){ toast(friendly(error), false); return false; } toast('Deleted.'); return true; }
  return { KINDS, pub, extOf, TYPE, art, openUpload, preview, remove };
}

async function libraryPage(modal){
  const root = $('#library'); if (!root) return; const gate = $('.lib__gate', root), app = $('.lib__app', root);
  if (!ready){ gate.innerHTML = `<h2>Almost ready</h2><p class="sub">The library opens as soon as accounts are switched on.</p>`; return; }
  if (!session){ gate.innerHTML = memberWall('The Upper Room library', 'Books, notes and slides the church shares with its members. Create an account or sign in to open it.');
    gate.hidden = false; app.hidden = true; accountUI(modal); return; }
  gate.hidden = true; app.hidden = false;
  const list = $('.lib__list', app), search = $('.lib__search', app), chips = $('.lib__chips', app), tools = $('.lib__tools', app);
  let items = [], kind = '';
  const { KINDS, pub, extOf, TYPE, art, openUpload, preview, remove } = libraryKit(() => items, () => load());

  /* ---------- upload pop-up ---------- */
  if (can.library(role())){
    tools.insertAdjacentHTML('beforeend', `<button class="btn lib__add" type="button">${ICO.plus || '+'} Upload material</button>`);
    $('.lib__add', tools).addEventListener('click', openUpload);
  }
  /* ---------- visual library ---------- */
  chips.innerHTML = [['', 'All'], ...Object.entries(KINDS)].map(([k, v]) => `<button type="button" class="chip ${k ? '' : 'is-on'}" data-k="${k}">${v}</button>`).join('');
  $$('.chip', chips).forEach(b => b.addEventListener('click', () => { kind = b.dataset.k; $$('.chip', chips).forEach(x => x.classList.toggle('is-on', x === b)); render(); }));
  async function load(){ list.innerHTML = `<div class="lshelf"><div class="lgrid">${'<div class="lcard lcard--skel"><div class="lcov"></div><b></b><span></span></div>'.repeat(8)}</div></div>`;
    const { data } = await sb.from('library_items').select('*, profiles:member_cards(full_name)').order('created_at', { ascending:false }); items = data || []; render(); }
  function card(i){ const e = extOf(i.file_name), t = TYPE(e);
    return `<article class="lcard" data-id="${i.id}"><button type="button" class="lcov lcov--${t}" aria-label="Preview ${esc(i.title)}">${i.cover_path ? `<img src="${esc(pub(i.cover_path))}" alt="" loading="lazy">` : art(t, e)}<span class="lcov__kind">${esc(KINDS[i.kind] || i.kind)}</span><span class="lcov__open" aria-hidden="true">Preview</span></button>
      <b>${esc(i.title)}</b><span class="lcard__meta">${esc(e.toUpperCase())} &middot; ${fmtBytes(i.size_bytes)}${i.profiles?.full_name ? ' &middot; ' + esc(i.profiles.full_name) : ''}</span>
      ${(can.admin(role()) || i.uploader_id === profile?.id) ? `<button type="button" class="lcard__del" aria-label="Delete ${esc(i.title)}">&times;</button>` : ''}</article>`; }
  function render(){ const q = (search.value || '').toLowerCase();
    const rows = items.filter(i => (!kind || i.kind === kind) && (!q || (i.title + ' ' + i.series + ' ' + i.description + ' ' + i.file_name).toLowerCase().includes(q)));
    if (!rows.length){ list.innerHTML = `<div class="empty"><h3>${items.length ? 'Nothing matches' : 'The shelves are empty for now'}</h3><p>${items.length ? 'Try another word or type.' : 'Books, notes and slides will appear here as leaders and writers add them.'}</p>${!items.length && can.library(role()) ? '<button class="btn mt-2 lib__add2" type="button">Upload the first item</button>' : ''}</div>`; const b2 = $('.lib__add2', list); if (b2) b2.addEventListener('click', openUpload); return; }
    const groups = {}; rows.forEach(i => (groups[i.series || 'General'] ||= []).push(i));
    list.innerHTML = Object.entries(groups).map(([sr, its]) => `<section class="lshelf"><h3 class="lshelf__h">${esc(sr)}<span>${its.length}</span></h3><div class="lgrid">${its.map(card).join('')}</div></section>`).join('');
    $$('.lcov', list).forEach(b => b.addEventListener('click', () => preview(items.find(x => x.id === b.closest('.lcard').dataset.id))));
    $$('.lcard__del', list).forEach(b => b.addEventListener('click', async () => { if (await remove(items.find(x => x.id === b.closest('.lcard').dataset.id), b)) load(); }));
  }
  search.addEventListener('input', render); load();
}

/* ================================================================ DASHBOARDS: one per site */
const DASH = {
  ccfc:     { eyebrow:'Christ Connect Family Church Zambia', intro:'Everything the church posts, publishes and keeps for its leaders.',
              stats: s => [['Members', s?.users], ['New this month', s?.new_users_30d], ['Feed posts', s?.posts], ['Library items', s?.library]],
              tabs: r => [can.master(r) ? ['assistant','Yuriel Prime'] : null, can.post(r) ? ['posts','Church feed'] : null, can.admin(r) ? ['settings','Site text'] : null, can.library(r) ? ['library','Upper Room library'] : null, can.admin(r) ? ['users','Members and roles'] : null, can.admin(r) ? ['audit','Role changes'] : null, ['roles','Role guide']] },
  koinonia: { eyebrow:'Koinonia Experience', intro:'Conference updates, videos and photos, and everyone who has registered for the next edition.',
              stats: s => [["Registered for Koi 26'", s?.regs_next], ['All registrations', s?.registrations], ['Updates posted', s?.posts], ['Reactions', s?.reactions], ['Comments', s?.comments]],
              tabs: r => [can.master(r) ? ['assistant','Yuriel Prime'] : null, can.moderate(r) ? ['regs','Registrations'] : null, can.admin(r) ? ['settings','Site text'] : null, can.post(r) ? ['posts','Updates and media'] : null, can.admin(r) ? ['users','Members and roles'] : null, can.admin(r) ? ['audit','Role changes'] : null, ['roles','Role guide']] },
  worship:  { eyebrow:'Worship Connect', intro:'The team\'s videos and music, who is on the team, and the people asking to join.',
              stats: s => [['New applications', s?.apps_new], ['All applications', s?.applications], ['Team members', s?.team], ['Videos and posts', s?.posts], ['Reactions', s?.reactions]],
              tabs: r => [can.master(r) ? ['assistant','Yuriel Prime'] : null, can.moderate(r) ? ['apps','Applications'] : null, can.admin(r) ? ['settings','Site text'] : null, can.post(r) ? ['posts','Videos and music'] : null, can.post(r) ? ['team','The team'] : null, can.admin(r) ? ['users','Members and roles'] : null, can.admin(r) ? ['audit','Role changes'] : null, ['roles','Role guide']] },
};
const APP_STATUS = { new:'New', contacted:'Contacted', audition:'Invited to rehearsal', accepted:'Accepted', declined:'Not now' };
/* Mazar Prime's mark, and where its conversations are kept on this device (cleared on sign out) */
const PRIME_KEY = 'mazar-prime:v1:';
let primeN = 0;
function primeMark(){ const id = 'mzp-' + (++primeN); return `<svg class="mz-mark mz-mark--prime" viewBox="0 0 48 48" aria-hidden="true" focusable="false"><defs><linearGradient id="${id}" x1="8" y1="6" x2="40" y2="42" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#FFF7DC"/><stop offset=".55" stop-color="#EBC872"/><stop offset="1" stop-color="#B98A3E"/></linearGradient></defs><path d="M24 6.5a17.5 17.5 0 1 1-12.4 5.1" fill="none" stroke="url(#${id})" stroke-width="1.6" stroke-linecap="round"/><circle cx="24" cy="24" r="22" fill="none" stroke="url(#${id})" stroke-width="1" stroke-dasharray="2 3.2" opacity=".8"/><path d="M17 9.5l2.2 2.4L24 7.6l4.8 4.3L31 9.5" fill="none" stroke="url(#${id})" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M24 12c.8 8.4 3.6 11.2 12 12-8.4.8-11.2 3.6-12 12-.8-8.4-3.6-11.2-12-12 8.4-.8 11.2-3.6 12-12z" fill="url(#${id})"/></svg>`; }
const clearPrime = () => { try { Object.keys(localStorage).filter(k => k.startsWith(PRIME_KEY)).forEach(k => localStorage.removeItem(k)); } catch (_) {} };
async function dashboardPage(modal){
  const root = $('#dashboard'); if (!root) return; const gate = $('.dash__gate', root), app = $('.dash__app', root); const site = SITE_KEY, D = DASH[site];
  if (!ready){ gate.innerHTML = `<h2>Dashboard</h2><p class="sub">Accounts are not switched on yet. Once Supabase is connected, the team signs in here.</p>`; return; }
  if (!session){ gate.innerHTML = `<span class="eyebrow">${esc(D.eyebrow)}</span><h2>Team sign in</h2><p class="sub">The ${esc(SITE.short)} dashboard is for the church team. Sign in to continue.</p><button class="btn mt-2" data-auth="in">Sign in</button>`; accountUI(modal); return; }
  const r = role();
  if (!can.staff(r)){ gate.innerHTML = `<span class="eyebrow">${esc(D.eyebrow)}</span><h2>Members area</h2><p class="sub">Your account is a <b>Member</b> account. The dashboards are for the church team. If you serve on a team, ask an Admin to update your role.</p><a class="btn mt-2" href="${SITE.feed}">Go to the ${esc(SITE.feedLabel.toLowerCase())}</a>`; return; }
  gate.hidden = true; app.hidden = false;
  const q = new URLSearchParams(location.search);
  $('.dash__head', app).innerHTML = `<span class="eyebrow">${esc(D.eyebrow)}</span><h1>${esc(SITE.dashTitle)}</h1><p class="sub">${esc(D.intro)}</p>
    ${can.leadership(r) ? '<p><a class="btn btn--ghost" href="https://ccfczambia.org/leadership">Leadership Hub</a></p>' : ''}<div class="dash__who">${avatar(profile.full_name, profile.avatar_url)}<div><b>${esc(profile.full_name || profile.email)}</b><span class="pill pill--orange">${esc(ROLES[r].label)}</span></div>
    ${can.admin(r) && !IS_ADMIN ? `<div class="dash__others">${Object.entries(SITES).filter(([k]) => k !== site).map(([k,s]) => `<a href="${ADMIN_ORIGIN}/?site=${k}">${esc(s.short)} dashboard ${ICO.arrow}</a>`).join('')}</div>` : ''}</div>`;
  const bar = $('.dash__tabs', app), panel = $('.dash__panel', app), statsEl = $('.dash__stats', app);
  const { data: stats } = await sb.rpc('dashboard_stats', { p_site: site });
  statsEl.innerHTML = D.stats(stats).map(([k,v]) => `<div class="stat"><b>${v ?? 0}</b><span>${k}</span></div>`).join('');
  const tabs = D.tabs(r).filter(Boolean);
  /* The portal is not one of this dashboard's sections, so it is not in the tab list: it sits in the top bar
     beside the three sites. It follows portal roles, not website roles, so it shows for whoever may manage them. */
  const mine = IS_ADMIN ? (await sb.schema('ms').rpc('my_access')).data : null;
  const mayPortal = !!(mine && (mine.permissions || []).includes('users.manage'));
  const portalPill = IS_ADMIN ? $('.adm-sites [data-portal]') : null, sitePill = IS_ADMIN ? $(`.adm-sites [data-site="${site}"]`) : null;
  if (portalPill && mayPortal){
    portalPill.hidden = false; portalPill.href = `/?site=${site}&tab=portal`;
    portalPill.addEventListener('click', e => { e.preventDefault(); show('portal'); });
  }
  bar.innerHTML = tabs.map(t => `<button class="dash__tab" data-t="${t[0]}">${t[1]}</button>`).join('');
  const show = t => { $$('.dash__tab', bar).forEach(x => x.classList.toggle('is-on', x.dataset.t === t)); history.replaceState(null, '', IS_ADMIN ? `/?site=${site}&tab=${t}` : `/dashboard?tab=${t}`); panel.innerHTML = '<div class="skel"></div>';
    if (portalPill){ const on = t === 'portal';
      portalPill[on ? 'setAttribute' : 'removeAttribute']('aria-current', 'page');
      if (sitePill) sitePill[on ? 'removeAttribute' : 'setAttribute']('aria-current', 'page');
      const open = $('.adm-open'); if (open) open.href = on ? 'https://portal.ccfczambia.org' : SITE.origin; }
    const opened = ({ assistant: assistantTab, settings: settingsTab, posts: postsTab, regs: regsTab, apps: appsTab, team: teamTab, library: libraryTab, users: usersTab, audit: auditTab, portal: portalTab, roles: rolesTab })[t]();
    Promise.resolve(opened).finally(() => Tour.page(t)); };
  $$('.dash__tab', bar).forEach(b => b.addEventListener('click', () => show(b.dataset.t)));
  const csvOf = (name, cols, rows) => { const body = [cols.join(','), ...rows.map(x => cols.map(c => '"' + String(x[c] ?? '').replace(/"/g,'""') + '"').join(','))].join('\n'); const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([body], { type:'text/csv' })); a.download = name; a.click(); };

  async function postsTab(){
    panel.innerHTML = `<div class="feed__composer"></div><div class="dash__toolbar mt-3"><h3>Recent posts</h3><div class="feed__filters"></div></div><div class="dash__list"></div>`;
    composer($('.feed__composer', panel), site, list);
    const filters = $('.feed__filters', panel); let kind = ''; filters.innerHTML = ['', ...SITES[site].kinds].map(k => `<button class="chip ${k ? '' : 'is-on'}" data-k="${k}">${k ? KINDS[k] : 'All'}</button>`).join('');
    $$('.chip', filters).forEach(b => b.addEventListener('click', () => { kind = b.dataset.k; $$('.chip', filters).forEach(x => x.classList.toggle('is-on', x === b)); list(); }));
    async function list(){ let qry = sb.from('posts').select('*').eq('site', site).order('created_at', { ascending:false }).limit(80); if (kind) qry = qry.eq('kind', kind); const { data, error } = await qry; const l = $('.dash__list', panel); if(error){ l.textContent='Posts could not be loaded. Please try again.'; return; }
      l.innerHTML = (data||[]).map(p => { const th = (p.media||[]).find(m => m.type === 'image')?.url || ((p.media||[]).find(m => m.type === 'youtube') ? `https://i.ytimg.com/vi/${(p.media||[]).find(m => m.type === 'youtube').id}/mqdefault.jpg` : '');
        return `<div class="drow" data-id="${p.id}">${th ? `<img class="drow__thumb" src="${esc(th)}" alt="">` : `<span class="drow__thumb drow__thumb--k">${esc((KINDS[p.kind]||'')[0])}</span>`}<div><b>${esc(p.title)}${p.pinned ? ' <i class="pill pill--orange">Pinned</i>' : ''}</b><span>${esc(KINDS[p.kind]||p.kind)} &middot; ${p.published ? 'Published' : 'Draft'} &middot; ${esc(when(p.created_at))}</span></div>
        <div class="row">${p.published ? `<a class="pill" href="${SITES[site].origin}${SITE.feed}?post=${p.id}">View</a>` : ''}${can.admin(r) || p.author_id === profile.id ? '<button class="pill edit">Edit</button>' : ''}${can.admin(r) ? `<button class="pill pin">${p.pinned ? 'Unpin' : 'Pin'}</button>` : ''}${(can.admin(r) || p.author_id === profile.id) ? '<button class="pill pill--danger del">Delete</button>' : ''}</div></div>`; }).join('') || '<p class="sub">No posts yet. Use the box above to post the first one.</p>';
      $$('.edit', l).forEach(b => b.addEventListener('click', () => editFeedPost(data.find(p => p.id === b.closest('.drow').dataset.id), list)));
      $$('.pin', l).forEach(b => b.addEventListener('click', async () => { const { error } = await sb.from('posts').update({ pinned: b.textContent === 'Pin' }).eq('id', b.closest('.drow').dataset.id); if (error) toast(friendly(error), false); else list(); }));
      $$('.del', l).forEach(b => b.addEventListener('click', async () => { if (!(await sure({ title: 'Delete this post?', body: `"${((data || []).find(x => x.id === b.closest('.drow').dataset.id) || {}).title || 'This post'}" is removed for everyone, with its comments and likes. This cannot be undone.`, ok: 'Delete post', danger: true, from: b }))) return; const { error } = await sb.from('posts').delete().eq('id', b.closest('.drow').dataset.id); if (error) toast(friendly(error), false); else list(); })); }
    list();
  }
  /* Mazar Prime: the master admin's AI assistant. Mazar's Bible and content skills plus admin powers. Reads live data, proposes a plan,
     writes only after Apply (admin-agent: Claude plans changes, OpenAI answers questions). A workspace with saved conversations
     (this device only, cleared on sign out), the living Mazar figure, and plan cards that wait for Apply. */
  async function assistantTab(){
    const EP = CFG.adminEndpoint, KEY = PRIME_KEY + profile.id, RAIL = 'mazar-prime:rail';
    const SITE_NAME = { ccfc: 'Church', koinonia: 'Koinonia', worship: 'Worship Connect' };
    const TOOL = { set_setting: 'Site text', create_post: 'New post', update_post: 'Edit post', delete_post: 'Delete post', create_announcement: 'Announcement', update_announcement: 'Announcement', delete_announcement: 'Announcement', upsert_team_member: 'Team', remove_team_member: 'Team', set_application_status: 'Application',
      set_page_text: 'Page text', set_page_image: 'Photo', set_page_link: 'Link', set_section_visible: 'Section', reset_page_content: 'Undo edit' };
    const svg = d => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
    const PI = {
      plus: svg('<path d="M12 5v14M5 12h14"/>'), rail: svg('<rect x="3" y="4" width="18" height="16" rx="3"/><path d="M9 4v16"/>'), menu: svg('<path d="M4 7h16M4 12h16M4 17h10"/>'),
      full: svg('<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>'), shrink: svg('<path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5"/>'), trash: svg('<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>'),
      clip: svg('<path d="M20.5 11.2l-8.4 8.4a5.3 5.3 0 0 1-7.5-7.5l8.9-8.9a3.6 3.6 0 0 1 5.1 5.1l-8.9 8.9a1.8 1.8 0 0 1-2.5-2.5l8.2-8.2"/>'),
      send: svg('<path d="M12 19V5M6 11l6-6 6 6"/>'), edit: svg('<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13 7l4 4"/>'), pulse: svg('<path d="M3 12h4l3-7 4 14 3-7h4"/>'), book: svg('<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><path d="M4 19V5M9 7h6"/>'),
    };
    const GROUPS = [
      [PI.edit, 'Change the sites', 'I plan it; you press Apply', ["Change the Koi 26' dates to 18 to 20 December 2026", 'Put up an announcement: no service this Sunday, we are at Koinonia', 'Pin the latest post on the church feed']],
      [PI.pulse, 'Know what is happening', 'Live numbers from the database', ["How are Koi 26' registrations going?", 'Which Worship Connect applications are still new?', "Give me this week's numbers for all three sites"]],
      [PI.book, 'Write with scripture', 'Drafts with exact verses', ['Draft a Sunday devotional post on Psalm 23', 'Write a Koinonia announcement with Acts 2:42', 'Suggest five verses for a youth night on courage']],
    ];
    const rich = t => window.MazarRich ? window.MazarRich(t) : esc(t).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').split(/\n{2,}/).map(b => { const ls = b.split('\n'); if (ls.every(l => /^\s*([-*•]|\d+\.)\s+/.test(l))) return `<ul>${ls.map(l => `<li>${l.replace(/^\s*([-*•]|\d+\.)\s+/, '')}</li>`).join('')}</ul>`; if (/^#{1,3}\s/.test(ls[0])){ const h = ls.shift().replace(/^#+\s*/, ''); return `<h4>${h}</h4>` + (ls.length ? `<p>${ls.join('<br>')}</p>` : ''); } return `<p>${ls.join('<br>')}</p>`; }).join('');
    const name = String(profile.full_name || '').trim(), first = name && name.split(/\s+/).length <= 3 ? name.split(/\s+/)[0] : '';   /* an organisation account gets no first name */
    const hr = new Date().getHours(), hello = hr < 12 ? 'Good morning' : hr < 17 ? 'Good afternoon' : 'Good evening';

    /* ---- conversations (this device) ---- */
    /* what a conversation has read that other people wrote: 'submissions' (public forms) is stronger than 'content'
       (posts, search results). The server says what each answer read; the conversation keeps the strongest and sends it
       back, so a page change asked for later in the same conversation is still refused or flagged. New conversation resets it. */
    const stronger = (a, b) => a === 'submissions' || b === 'submissions' ? 'submissions' : a === 'content' || b === 'content' ? 'content' : null;
    const load = () => { try { const v = JSON.parse(localStorage.getItem(KEY) || '[]'); return (Array.isArray(v) ? v : []).filter(c => c && c.id && Array.isArray(c.log)).map(c => ({ ...c, history: Array.isArray(c.history) ? c.history : [], untrusted: stronger(c.untrusted, null) })); } catch (_) { return []; } };
    const save = () => { try { localStorage.setItem(KEY, JSON.stringify(convos.filter(c => c.log.length).slice(0, 30).map(c => ({ ...c, log: c.log.slice(-60), history: c.history.slice(-24) })))); } catch (_) {} };
    const fresh = () => ({ id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), title: 'New conversation', t: Date.now(), site, log: [], history: [] });
    let convos = load(), cur = fresh(); convos.unshift(cur);
    const livePlans = new Set();   /* plans made in this visit can be applied; saved ones are shown as history only */

    panel.innerHTML = `<section class="mzp" data-theme="mazar" aria-label="Yuriel Prime">
      <canvas class="mzp__sky" aria-hidden="true"></canvas>
      <aside class="mzp__side" aria-label="Yuriel Prime conversations">
        <button class="mzp__new" type="button">${PI.plus}<span>New conversation</span></button>
        <nav class="mzp__convos" aria-label="Conversations"></nav>
        <div class="mzp__foot"><span class="mzp__k">Engines</span>
          <div class="mzp__eng" data-e="Claude"><i></i><b>Claude</b><small>Plans changes to the sites</small></div>
          <div class="mzp__eng" data-e="OpenAI"><i></i><b>OpenAI</b><small>Answers questions and drafts</small></div>
          <p>Conversations stay on this device and are cleared when you sign out.</p></div>
      </aside>
      <div class="mzp__main">
        <div class="mzp__fig" aria-hidden="true"><canvas></canvas></div>
        <header class="mzp__bar">
          <button class="mzp__btn mzp__rail" type="button" aria-label="Hide conversations" title="Hide conversations" aria-expanded="true">${PI.rail}</button>
          <span class="mzp__id">${primeMark()}<span><b>Yuriel <em>Prime</em></b><small><i class="mzp__live"></i><span class="mzp__status">Ready</span></small></span></span>
          <span class="mzp__scope" title="Yuriel Prime can work on all three sites. This dashboard is its starting point."><i></i>Working from <b>${esc(SITE_NAME[site] || site)}</b></span>
          <span class="mzp__tools"><button class="mzp__btn mzp__newbtn" type="button" aria-label="New conversation" title="New conversation">${PI.plus}</button><button class="mzp__btn mzp__full" type="button" aria-label="Full screen" title="Full screen">${PI.full}</button></span>
        </header>
        <div class="mzp__log" aria-live="polite">
          <div class="mzp__hello">
            <div class="mzp__stage" aria-hidden="true"></div>
            <span class="mzp__eyebrow">Master Administrator</span>
            <h3>${hello}${first ? ', ' + esc(first) : ''}.</h3>
            <p>Everything Yuriel knows, with the keys to all three sites. I look first, then show you a plan. Nothing changes until you press Apply.</p>
            <div class="mzp__starts">${GROUPS.map(([ic, h, s, xs]) => `<div class="mzp__group"><h4>${ic}${esc(h)}</h4><small>${esc(s)}</small>${xs.map(x => `<button type="button">${esc(x)}</button>`).join('')}</div>`).join('')}</div>
          </div>
        </div>
        <form class="mz__form mzp__form"><div class="mzp__atts" hidden></div>${EP ? `<button class="mzp__attach" type="button" aria-label="Attach a photo" title="Attach a photo for a page (JPG, PNG or WebP, up to 5 MB)">${PI.clip}</button><input class="mzp__file" type="file" accept="image/jpeg,image/png,image/webp" hidden>` : ''}<textarea name="q" rows="1" placeholder="${EP ? (innerWidth <= 640 ? 'Ask Yuriel Prime...' : 'Ask Yuriel Prime to change, check or write something...') : 'Yuriel Prime is not configured (js/config.js adminEndpoint)'}" aria-label="Instruction for Yuriel Prime" maxlength="4000"></textarea><button class="mz__send" type="submit" aria-label="Send">${PI.send}</button></form>
        <p class="mzp__fine"><span>Enter to send. Shift and Enter for a new line.</span><span>Every applied change is logged under your name.</span></p>
      </div></section>`;

    const root = $('.mzp', panel), main = $('.mzp__main', root), log = $('.mzp__log', root), hi = $('.mzp__hello', root), form = $('.mzp__form', root), ta = $('textarea', form), status = $('.mzp__status', root);
    const figHost = $('.mzp__fig', root);
    const fig = window.MazarFigure ? new window.MazarFigure($('canvas', figHost), figHost, { bg: true, pointer: main, cy: .5 }) : null;
    if (window.MazarSky && fig) new window.MazarSky($('.mzp__sky', root), root, fig);
    const mood = s => fig && fig.set(s);
    const scrollEnd = () => { log.scrollTop = log.scrollHeight; };
    /* before the first message the figure sits in the space above the greeting (never behind the text); after it, it fills the background */
    const stage = $('.mzp__stage', hi);
    const fitFig = () => { if (root.classList.contains('has-history')){ figHost.style.height = ''; stage.style.height = '0px'; return; }
      stage.style.height = '0px'; const top = log.offsetTop + parseFloat(getComputedStyle(log).paddingTop), free = hi.offsetTop - top, need = innerWidth <= 640 ? 170 : 210;
      if (free < need) stage.style.height = (need - free) + 'px';
      figHost.style.height = Math.round(hi.offsetTop + stage.offsetHeight + 12) + 'px'; };
    new ResizeObserver(() => requestAnimationFrame(fitFig)).observe(log);
    log.addEventListener('scroll', () => { figHost.style.transform = root.classList.contains('has-history') ? '' : `translateY(${-log.scrollTop}px)`; }, { passive: true });
    const setHistory = on => { root.classList.toggle('has-history', on); if (on) figHost.style.transform = ''; requestAnimationFrame(fitFig); };

    /* ---- messages ---- */
    const verse = a => a && a.reference ? `<div class="mz-card mz-card--verse"><span class="mz-card__k">${esc(a.reference)} <i>${esc(a.translation || '')}</i></span><blockquote>${esc(a.text)}</blockquote></div>` : '';
    /* a page step's exact before and after: every word (changes highlighted), every link target with its host (off-site in
       red), both photos, and a section's visibility. Plans saved before this carry no diff and show their summary only. */
    const pieces = s => String(s).split(/(\s+)/).filter(Boolean);
    const wordDiff = (a, b) => { const A = pieces(a), B = pieces(b), n = A.length, m = B.length;
      if (n * m > 400000) return [esc(a), esc(b)];
      const T = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
      for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) T[i][j] = A[i] === B[j] ? T[i + 1][j + 1] + 1 : Math.max(T[i + 1][j], T[i][j + 1]);
      let i = 0, j = 0, x = '', y = '';
      while (i < n || j < m){
        if (i < n && j < m && A[i] === B[j]){ x += esc(A[i++]); y += esc(B[j++]); }
        else if (j >= m || (i < n && T[i + 1][j] >= T[i][j + 1])){ const t = A[i++]; x += /^\s+$/.test(t) ? esc(t) : `<del>${esc(t)}</del>`; }
        else { const t = B[j++]; y += /^\s+$/.test(t) ? esc(t) : `<ins>${esc(t)}</ins>`; } }
      return [x, y]; };
    const hrefChip = h => { const w = pageHref(h); return `<span class="mzp__href${w.off ? ' is-off' : ''}"><code>${esc(h)}</code><em>${esc(w.where)}${w.off ? ', off-site' : ''}</em></span>`; };
    const linksIn = t => [...String(t || '').matchAll(/\[([^\[\]\n]{1,300})\]\(([^()\s]{1,500})\)/g)].map(k => ({ label: k[1], href: k[2] }));
    const photoUrl = (src, s) => PAGE_PHOTO.test(src) ? src : (/^\/assets\/[A-Za-z0-9_.\/-]+(\?v=[A-Za-z0-9._-]+)?$/.test(src) && !/\.\.|\/\//.test(src) && SITES[s]) ? SITES[s].origin + src : '';
    const diffHtml = x => { const d = x.diff; if (!d || typeof d !== 'object' || !d.before || !d.after || typeof d.before !== 'object' || typeof d.after !== 'object') return '';
      const s = x.args && x.args.site, row = (k, v, cls = '') => `<div class="mzp__dr${cls}"><span class="mzp__dk">${k}</span><div class="mzp__dv">${v}</div></div>`;
      const said = v => v.label != null ? `<b>${esc(v.label)}</b>` : '';
      switch (d.kind){
        case 'text': { const [b, a] = wordDiff(d.before.text || '', d.after.text || ''), lb = linksIn(d.before.text), la = linksIn(d.after.text);
          const moved = la.some(l => !lb.some(o => o.href === l.href)) || lb.some(o => !la.some(l => l.href === o.href));
          return `<div class="mzp__diff">${row('Now', `<p class="mzp__dt">${b}</p>`)}${row('New', `<p class="mzp__dt">${a}</p>`)}${la.length || lb.length ? row(moved ? 'Links changed' : 'Links', la.length ? la.map(l => `<span class="mzp__lk"><b>${esc(l.label)}</b>${hrefChip(l.href)}</span>`).join('') : '<small>No links after this change</small>', moved ? ' is-chg' : '') : ''}</div>`; }
        case 'link': return `<div class="mzp__diff">${row('Now', `${said(d.before)}${hrefChip(d.before.href)}`)}${row('New', `${said(d.after)}${hrefChip(d.after.href)}`, d.before.href !== d.after.href ? ' is-chg' : '')}</div>`;
        case 'image': { const fig = v => { const u = photoUrl(v.src, s); return `<figure class="mzp__ph">${u ? `<img src="${esc(u)}" alt="" loading="lazy">` : '<span class="mzp__ph-none">No preview</span>'}<figcaption><code>${esc(v.src)}</code><span>${v.alt ? esc(v.alt) : 'No description'}</span></figcaption></figure>`; };
          return `<div class="mzp__diff">${row('Now', fig(d.before))}${row('New', fig(d.after), ' is-chg')}</div>`; }
        case 'section': { const pill = v => `<span class="mzp__vis ${v ? 'is-on' : 'is-off'}">${v ? 'Visible' : 'Hidden'}</span>`;
          return `<div class="mzp__diff">${row('Section', `${pill(d.before.visible !== false)}<span class="mzp__to" aria-label="becomes">&rarr;</span>${pill(d.after.visible !== false)}`)}</div>`; }
      }
      return ''; };
    const planHtml = (p, id) => { const n = p.steps.length, res = p.results || [];
      const head = p.status === 'applied' ? `Applied <span>${res.filter(x => x.ok).length} of ${n} done</span>` : p.status === 'discarded' ? 'Discarded <span>Nothing was changed</span>' : livePlans.has(id) ? `Plan <span>${n} change${n > 1 ? 's' : ''}, waiting for your approval</span>` : 'Plan <span>Not applied</span>';
      const steps = p.steps.map((x, i) => { const r = res[i]; return `<li class="${r ? (r.ok ? 'is-ok' : 'is-err') : ''}"><span class="mzp__tag">${esc(TOOL[x.tool] || 'Change')}</span><span class="mzp__sum">${esc(x.summary || x.tool)}</span>${r ? `<span class="mzp__res">${r.ok ? (r.detail === 'already done' ? 'Already done' : 'Done') : 'Failed: ' + esc(String(r.detail || ''))}</span>` : ''}${diffHtml(x)}</li>`; }).join('');
      const foot = p.status === 'pending' ? (livePlans.has(id) ? `<button class="mz-chip mz-chip--gold" type="button" data-plan="apply">Apply ${n} change${n > 1 ? 's' : ''}</button><button class="mz-chip" type="button" data-plan="discard">Discard</button><small>Nothing changes until you apply</small>` : '<small>Plans are not kept between visits. Ask again for a fresh plan.</small>') : '';
      return `<div class="mzp__plan is-${p.status}" data-id="${id}"><div class="mzp__plan-h">${head}</div>${p.notice ? `<p class="mzp__notice" role="note">${esc(p.notice)}</p>` : ''}<ol class="mzp__steps">${steps}</ol>${foot ? `<div class="mzp__plan-f">${foot}</div>` : ''}</div>`; };
    const render = (m, i) => { const el = document.createElement('div'); el.className = 'mz-msg is-' + (m.who === 'user' ? 'user' : 'bot'); el.dataset.i = i;
      if (m.who === 'user') el.innerHTML = `<div class="mz-msg__body">${esc(m.text)}${m.photo && PAGE_PHOTO.test(m.photo) ? `<img class="mzp__sent" src="${esc(m.photo)}" alt="Attached photo" loading="lazy">` : ''}</div>`;
      else el.innerHTML = `<span class="mz-msg__mark">${primeMark()}</span><div class="mz-msg__body">${m.who === 'err' ? `<p class="mzp__err">${esc(m.text)}</p>` : `<div class="mz-rich">${rich(m.text)}</div>`}${(m.actions || []).map(verse).join('')}${m.plan ? planHtml(m.plan, cur.id + ':' + i) : ''}${m.engine ? `<div class="mzp__meta"><span>via ${esc(m.engine)}</span></div>` : ''}</div>`;
      return el; };
    const paintLog = () => { $$('.mz-msg', log).forEach(n => n.remove()); cur.log.forEach((m, i) => log.appendChild(render(m, i))); setHistory(cur.log.length > 0); if (cur.log.length) scrollEnd(); else log.scrollTop = 0; };
    const repaint = i => { const old = $(`.mz-msg[data-i="${i}"]`, log); if (old) old.replaceWith(render(cur.log[i], i)); };
    const push = (m, conv = cur) => { conv.log.push(m); conv.t = Date.now(); if (m.who === 'user' && conv.title === 'New conversation') conv.title = m.text.replace(/\s+/g, ' ').slice(0, 60); const i = conv.log.length - 1; if (conv === cur){ log.appendChild(render(m, i)); setHistory(true); scrollEnd(); } save(); paintSide(); return i; };
    const engineOn = e => { $$('.mzp__eng', root).forEach(x => x.classList.toggle('is-on', !!e && e.startsWith(x.dataset.e))); };

    /* ---- sidebar ---- */
    const paintSide = () => { const nav = $('.mzp__convos', root); const day = t => Math.floor((new Date().setHours(0, 0, 0, 0) - new Date(t).setHours(0, 0, 0, 0)) / 864e5);
      const list = convos.filter(c => c.log.length);
      nav.innerHTML = list.length ? [['Today', d => d === 0], ['Yesterday', d => d === 1], ['Earlier', d => d > 1]].map(([h, f]) => { const rs = list.filter(c => f(day(c.t))); return rs.length ? `<h5>${h}</h5>` + rs.map(c => `<div class="mzp__convo ${c === cur ? 'is-on' : ''}" data-id="${esc(c.id)}"><button type="button" class="mzp__convo-open"><b>${esc(c.title)}</b><small>${esc(SITE_NAME[c.site] || '')} &middot; ${esc(when(new Date(c.t).toISOString()))}</small></button><button type="button" class="mzp__convo-del" aria-label="Delete conversation">${PI.trash}</button></div>`).join('') : ''; }).join('') : '<p class="mzp__side-empty">Your conversations with Yuriel Prime will appear here.</p>'; };
    const open = c => { cur = c; paintLog(); paintSide(); root.classList.remove('is-side'); if (innerWidth > 900) ta.focus({ preventScroll: true }); };
    const startNew = () => { if (!cur.log.length){ open(cur); return; } convos = convos.filter(c => c.log.length); const c = fresh(); convos.unshift(c); open(c); };
    $('.mzp__convos', root).addEventListener('click', async e => { const row = e.target.closest('.mzp__convo'); if (!row) return; const c = convos.find(x => x.id === row.dataset.id); if (!c) return;
      const del = e.target.closest('.mzp__convo-del');
      if (del){ if (!(await sure({ title: 'Delete this conversation?', body: `"${c.title}" is removed from this device. This cannot be undone.`, ok: 'Delete', danger: true, from: del })) || !convos.includes(c)) return; convos = convos.filter(x => x !== c); save(); if (c === cur){ const n = fresh(); convos.unshift(n); open(n); } else paintSide(); return; }
      open(c); });
    $('.mzp__new', root).addEventListener('click', startNew); $('.mzp__newbtn', root).addEventListener('click', startNew);
    const railBtn = $('.mzp__rail', root);
    const setRail = on => { root.classList.toggle('is-rail', on); const l = on ? 'Show conversations' : 'Hide conversations'; railBtn.setAttribute('aria-label', l); railBtn.title = l; railBtn.setAttribute('aria-expanded', String(!on)); try { localStorage.setItem(RAIL, on ? '1' : ''); } catch (_) {} };
    railBtn.addEventListener('click', () => { if (innerWidth <= 900) root.classList.toggle('is-side'); else setRail(!root.classList.contains('is-rail')); });
    try { if (localStorage.getItem(RAIL)) setRail(true); } catch (_) {}
    main.addEventListener('click', e => { if (root.classList.contains('is-side') && !e.target.closest('.mzp__rail')) root.classList.remove('is-side'); });
    const fullBtn = $('.mzp__full', root);
    const setFull = on => { root.classList.toggle('is-full', on); document.body.classList.toggle('mzp-lock', on); fullBtn.innerHTML = on ? PI.shrink : PI.full; const l = on ? 'Exit full screen' : 'Full screen'; fullBtn.setAttribute('aria-label', l); fullBtn.title = l; };
    fullBtn.addEventListener('click', () => setFull(!root.classList.contains('is-full')));
    root.addEventListener('keydown', e => { if (e.key === 'Escape' && root.classList.contains('is-full')) setFull(false); });

    /* ---- talking to Mazar Prime ---- */
    let busy = false;
    const setBusy = (on, text) => { busy = on; root.classList.toggle('is-busy', on); status.textContent = text; };
    const call = async body => { const { data: { session: s } } = await sb.auth.getSession(); if (!s) throw new Error('Your sign-in has expired. Please sign in again.'); const r = await fetch(EP, { method:'POST', headers:{ 'Content-Type':'application/json', apikey: CFG.supabaseKey, Authorization: 'Bearer ' + s.access_token }, body: JSON.stringify(Object.assign({ site }, body)) }); const j = await r.json().catch(() => ({})); if (!r.ok || j.error) throw new Error(j.error || ('HTTP ' + r.status)); return j; };
    /* the model gets an attached photo as its public address, so it can propose set_page_image with it */
    const ask = async (q, photo = null) => { if (busy || !EP || !q) return; const conv = cur; setBusy(true, 'Working...');
      push(photo ? { who: 'user', text: q, photo } : { who: 'user', text: q }); conv.history.push({ role: 'user', content: photo ? `${q}\n\n[Attached photo: ${photo}]` : q }); mood('think');
      const t = document.createElement('div'); t.className = 'mz-msg is-bot'; t.innerHTML = `<span class="mz-msg__mark">${primeMark()}</span><div class="mz-msg__body"><span class="mz-think"><i></i><i></i><i></i></span><small class="mzp__muted">Looking at the sites</small></div>`; log.appendChild(t); scrollEnd();
      try { const ans = await call(Object.assign({ messages: conv.history.slice(-14) }, conv.untrusted ? { untrusted: conv.untrusted } : {})); t.remove();
        conv.untrusted = stronger(conv.untrusted, ans.untrusted);
        const m = { who: 'bot', text: ans.text || '', actions: ans.actions || [], engine: ans.engine || '' };
        if (ans.plan && ans.plan.length){ m.plan = { steps: ans.plan.map(x => Object.assign({ tool: x.tool, args: x.args, summary: x.summary }, x.diff ? { diff: x.diff } : {})), status: 'pending', instruction: q, ...(ans.planNotice ? { notice: String(ans.planNotice) } : {}) }; livePlans.add(conv.id + ':' + conv.log.length); }
        mood('speak'); push(m, conv); conv.history.push({ role: 'assistant', content: m.text }); save(); engineOn(m.engine); setTimeout(() => mood('idle'), 900);
        setBusy(false, m.engine ? 'Ready. Last answer by ' + m.engine.replace(/ \(.*\)$/, '') : 'Ready'); }
      catch (e){ t.remove(); push({ who: 'err', text: e.message }, conv); mood('error'); setTimeout(() => mood('idle'), 900); setBusy(false, 'Ready'); }
      finally { if (busy) setBusy(false, 'Ready'); if (innerWidth > 900) ta.focus({ preventScroll: true }); } };
    log.addEventListener('click', async e => { const b = e.target.closest('[data-plan]'); if (!b || busy) return; const card = b.closest('.mzp__plan'), i = +card.closest('.mz-msg').dataset.i, m = cur.log[i]; if (!m || !m.plan || m.plan.status !== 'pending') return;
      if (b.dataset.plan === 'discard'){ m.plan.status = 'discarded'; livePlans.delete(card.dataset.id); cur.history.push({ role: 'user', content: '[The admin discarded the plan. Nothing was changed.]' }); save(); repaint(i); return; }
      $$('[data-plan]', card).forEach(x => { x.disabled = true; }); b.textContent = 'Applying...'; setBusy(true, 'Applying changes...'); mood('think');
      try { const { results } = await call({ apply: m.plan.steps.map(x => ({ tool: x.tool, args: x.args })), instruction: m.plan.instruction });
        m.plan.status = 'applied'; m.plan.results = (results || []).map(x => ({ ok: !!x.ok, detail: x.ok ? (x.detail === 'already done' ? 'already done' : '') : String(x.detail || '') })); livePlans.delete(card.dataset.id);
        /* the note carries each step's summary so Mazar Prime knows exactly what is now live and never proposes it again */
        cur.history.push({ role: 'user', content: '[The admin applied the plan. Results: ' + (results || []).map((x, j) => `${x.ok ? (x.detail === 'already done' ? 'already done' : 'done') : 'failed'}: ${(m.plan.steps[j] && m.plan.steps[j].summary) || x.tool}`).join('; ') + ']' }); save(); repaint(i); scrollEnd();
        applySettings(); applyPageContent(); const bad = m.plan.results.filter(x => !x.ok).length; toast(bad ? `${bad} change${bad > 1 ? 's' : ''} failed. See the plan for details.` : 'Changes applied.', !bad); if (fig) fig.joy(); mood('idle'); setBusy(false, 'Ready'); }
      catch (err){ $$('[data-plan]', card).forEach(x => { x.disabled = false; }); b.textContent = 'Apply'; toast(err.message, false); mood('error'); setTimeout(() => mood('idle'), 900); setBusy(false, 'Ready'); } });

    const grow = () => { ta.style.height = 'auto'; ta.style.height = Math.min(ta.scrollHeight, 180) + 'px'; };
    ta.addEventListener('input', () => { grow(); if (!busy) mood(ta.value ? 'listen' : 'idle'); });
    /* ---- a photo for the page editor: JPG, PNG or WebP up to 5 MB, uploaded with the admin's own sign-in to the site-photos bucket, <site>/<uuid>.<ext> ---- */
    let att = null; const attBox = $('.mzp__atts', form), fileIn = $('.mzp__file', form);
    const paintAtt = () => { attBox.hidden = !att; attBox.innerHTML = att ? `<span class="mzp__att${att.status === 'up' ? ' is-up' : att.status === 'err' ? ' is-err' : ''}"><img src="${esc(att.thumb)}" alt=""><span class="mzp__att-t"><b>${esc(att.name)}</b><small>${att.status === 'up' ? 'Uploading...' : att.status === 'err' ? esc(att.error) : 'Attached. Say where it goes.'}</small></span><button type="button" class="mzp__att-x" aria-label="Remove the photo">${ICO.x}</button></span>` : ''; };
    const dropAtt = () => { if (att && att.thumb) URL.revokeObjectURL(att.thumb); att = null; paintAtt(); };
    const attach = async file => {
      if (!file || busy) return;
      const ext = PHOTO_TYPES[file.type];
      if (!ext){ toast('Photos for the pages must be JPG, PNG or WebP.', false); return; }
      if (file.size > PHOTO_MAX){ toast(`That photo is ${fmtBytes(file.size)}. Please choose one under 5 MB.`, false); return; }
      dropAtt(); const me = att = { name: file.name, thumb: URL.createObjectURL(file), status: 'up' }; paintAtt();
      const id = (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2)).replace(/[^a-z0-9-]/gi, '');
      const path = `${site}/${id}.${ext}`;
      try { const { error } = await sb.storage.from('site-photos').upload(path, file, { contentType: file.type, upsert: false, cacheControl: '31536000' }); if (error) throw error;
        const url = sb.storage.from('site-photos').getPublicUrl(path).data.publicUrl; if (!PAGE_PHOTO.test(url)) throw new Error('The photo was stored somewhere unexpected.');
        if (att === me){ me.status = 'ok'; me.url = url; } }
      catch (err){ if (att === me){ me.status = 'err'; me.error = friendly(err); } }
      if (att === me){ paintAtt(); if (me.status === 'ok' && innerWidth > 900) ta.focus({ preventScroll: true }); } };
    if (fileIn){
      $('.mzp__attach', form).addEventListener('click', () => { if (!busy) fileIn.click(); });
      fileIn.addEventListener('change', () => { attach(fileIn.files[0]); fileIn.value = ''; });
      attBox.addEventListener('click', e => { if (e.target.closest('.mzp__att-x')) dropAtt(); });
      ta.addEventListener('paste', e => { const f = [...((e.clipboardData && e.clipboardData.files) || [])].find(x => /^image\//.test(x.type)); if (f){ e.preventDefault(); attach(f); } });
    }
    form.addEventListener('submit', e => { e.preventDefault(); if (busy) return; const q = ta.value.trim();
      if (att && att.status === 'up'){ toast('The photo is still uploading.', false); return; }
      const photo = att && att.status === 'ok' ? att.url : null; if (!q && !photo) return;
      ta.value = ''; grow(); if (att) dropAtt(); ask(q || 'Use the attached photo on the site.', photo); });
    ta.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing){ e.preventDefault(); form.requestSubmit(); } });
    $$('.mzp__group button', hi).forEach(b => b.addEventListener('click', () => ask(b.textContent)));
    paintSide(); paintLog();
  }
  /* Site text: every editable setting for this site, saved straight to the database and live within seconds */
  async function settingsTab(){
    const { data, error } = await sb.from('site_settings').select('*').eq('site', site).order('key'); if (error){ panel.innerHTML = `<p class="sub">${esc(friendly(error))}</p>`; return; }
    panel.innerHTML = `<div class="dash__toolbar"><h3>Site text</h3><span class="sub">These lines appear on the pages. Edits go live within seconds, no rebuild needed.</span></div><div class="settings">${(data||[]).map(x => `<div class="setting" data-key="${esc(x.key)}"><label><b>${esc(x.label || x.key)}</b><small>${esc(x.key)}</small></label><textarea rows="2">${esc(x.value)}</textarea><div class="row"><button class="pill save" type="button">Save</button><span class="sub when">${x.updated_at ? 'Updated ' + esc(when(x.updated_at)) : ''}</span></div></div>`).join('') || '<p class="sub">No settings for this site yet.</p>'}</div>`;
    $$('.setting', panel).forEach(el => { const ta = $('textarea', el); ta.addEventListener('input', () => el.classList.add('is-dirty'));
      $('.save', el).addEventListener('click', async () => { const { error } = await sb.from('site_settings').update({ value: ta.value.trim(), updated_by: profile.id, updated_at: new Date().toISOString() }).eq('site', site).eq('key', el.dataset.key); if (error) toast(friendly(error), false); else { el.classList.remove('is-dirty'); $('.when', el).textContent = 'Saved just now'; toast('Saved.'); applySettings(); } }); });
  }
  async function regsTab(){
    const { data } = await sb.from('registrations').select('*').eq('site','koinonia').order('created_at', { ascending:false }).limit(2000); const all = data || [];
    const delivery = new Map(); if(all.length){ const {data:states,error:deliveryError}=await sb.rpc('registration_delivery_status',{p_ids:all.map(x=>x.id)}); if(!deliveryError) (states||[]).forEach(x=>delivery.set(x.registration_id,x)); }
    const editions = [...new Set(all.map(x => x.edition))].sort().reverse(); let ed = editions.includes('k26') ? 'k26' : (editions[0] || '');
    const cols = ['reference','edition','first_name','middle_name','surname','gender','age_range','residence','country','phone','whatsapp_number','email','participation','participation_detail','days','dietary','expectation','created_at'];
    panel.innerHTML = `<div class="dash__toolbar"><div class="feed__filters">${['', ...editions].map(e => `<button class="chip ${e === ed ? 'is-on' : ''}" data-e="${e}">${e ? "Koi " + e.slice(1) + "'" : 'All editions'}</button>`).join('')}</div><input class="dash__search" placeholder="Search number, name, phone, town or email" aria-label="Search registrations"><button class="btn btn--ghost dash__csv">Download CSV</button></div>
      <div class="dash__kpis"></div><div class="dash__list"></div>`;
    const list = $('.dash__list', panel), s = $('.dash__search', panel), kpis = $('.dash__kpis', panel);
    const rows = () => all.filter(x => (!ed || x.edition === ed) && (!s.value || ((x.reference||'') + ' ' + x.first_name + ' ' + (x.middle_name||'') + ' ' + x.surname + ' ' + x.phone + ' ' + (x.residence||'') + ' ' + (x.country||'') + ' ' + (x.email||'')).toLowerCase().includes(s.value.toLowerCase())));
    $('.dash__csv', panel).addEventListener('click', () => csvOf(`koinonia-registrations${ed ? '-' + ed : ''}.csv`, cols, rows()));
    $$('.chip', panel).forEach(b => b.addEventListener('click', () => { ed = b.dataset.e; $$('.chip', panel).forEach(x => x.classList.toggle('is-on', x === b)); render(); }));
    const render = () => { const rs = rows(); const week = rs.filter(x => Date.now() - new Date(x.created_at) < 7*86400e3).length, part = rs.filter(x => /particip/i.test(x.participation||'') && !/^participant\s*$/i.test(x.participation||'')).length;
      const towns = {}; rs.forEach(x => { const t = (x.residence||'').trim().toLowerCase().replace(/\b\w/g, c => c.toUpperCase()); if (t) towns[t] = (towns[t]||0) + 1; }); const top = Object.entries(towns).sort((a,b) => b[1]-a[1]).slice(0,3);
      kpis.innerHTML = `<div class="stat"><b>${rs.length}</b><span>${ed ? "registered for Koi " + ed.slice(1) + "'" : 'registrations'}</span></div><div class="stat"><b>${week}</b><span>in the last 7 days</span></div><div class="stat"><b>${part}</b><span>want to take part on stage</span></div><div class="stat"><b>${top.map(([t,n]) => `${t} ${n}`).join(', ') || '0'}</b><span>top towns</span></div>`;
      list.innerHTML = rs.map(x => `<details class="drow drow--exp" data-id="${x.id}"><summary>${avatar(x.first_name + ' ' + x.surname)}<div><b>${esc(x.first_name)} ${x.middle_name ? esc(x.middle_name) + ' ' : ''}${esc(x.surname)} <i class="pill">Koi ${esc(x.edition.slice(1))}'</i></b><span>${x.reference ? '<b class="ref">' + esc(x.reference) + '</b> &middot; ' : ''}${esc(x.residence||'')}${x.country ? ', ' + esc(x.country) : ''} &middot; ${esc(x.phone)}${x.email ? ' &middot; ' + esc(x.email) : ''} &middot; ${esc(when(x.created_at))}</span></div><div class="row"><a class="pill" href="https://wa.me/${esc(String(x.phone).replace(/\D/g,''))}" target="_blank" rel="noopener">${ICO.wa} WhatsApp</a>${can.admin(r) ? '<button class="pill pill--danger del">Remove</button>' : ''}</div></summary>
        <dl class="drow__dl"><dt>Registration ID</dt><dd>${esc(x.reference||'Not assigned')}</dd><dt>Drive copy</dt><dd>${esc(delivery.get(x.id)?.drive_status || 'Status unavailable')}</dd><dt>Confirmation email</dt><dd>${esc(delivery.get(x.id)?.email_status || 'Status unavailable')}</dd><dt>WhatsApp</dt><dd>${esc(x.whatsapp_number||'Not supplied')}</dd><dt>Gender</dt><dd>${esc(x.gender||'')}</dd><dt>Age</dt><dd>${esc(x.age_range||'')}</dd><dt>Role</dt><dd>${esc(x.participation||'')} ${esc(x.participation_detail||'')}</dd><dt>Days</dt><dd>${esc(x.days||'')}</dd><dt>Dietary</dt><dd>${esc(x.dietary||'')}</dd><dt>Expectation</dt><dd>${esc(x.expectation||'')}</dd><dt>Registered</dt><dd>${esc(fullDate(x.created_at))}</dd></dl></details>`).join('') || '<p class="sub">No registrations match.</p>';
      $$('.del', list).forEach(b => b.addEventListener('click', async e => { e.preventDefault(); const x = all.find(y => y.id === b.closest('.drow').dataset.id); if (!(await sure({ title: 'Remove this registration?', body: x ? `${x.first_name} ${x.surname} (${x.reference || 'no number'}) comes off the Koi ${String(x.edition).slice(1)}' list, and the copy in the Drive folder goes to the Drive trash within a few minutes. This cannot be undone here.` : 'This cannot be undone.', ok: 'Remove', danger: true, from: b }))) return; await sb.from('registrations').delete().eq('id', b.closest('.drow').dataset.id); const i = all.findIndex(x => x.id === b.closest('.drow').dataset.id); all.splice(i,1); render(); })); };
    s.addEventListener('input', render); render();
  }
  async function appsTab(){
    const { data } = await sb.from('applications').select('*').eq('site','worship').order('created_at', { ascending:false }).limit(1000); const all = data || []; let st = 'new';
    const cols = ['status','name','phone','whatsapp_number','email','gift','experience','church','message','notes','created_at'];
    const count = k => all.filter(x => k ? x.status === k : true).length;
    panel.innerHTML = `<div class="dash__toolbar"><div class="feed__filters">${['new','contacted','audition','accepted','declined',''].map(k => `<button class="chip ${k === st ? 'is-on' : ''}" data-s="${k}">${k ? APP_STATUS[k] : 'All'} <i>${count(k)}</i></button>`).join('')}</div><input class="dash__search" placeholder="Search name, phone or gift" aria-label="Search applications"><button class="btn btn--ghost dash__csv">Download CSV</button></div><div class="dash__list"></div>`;
    const list = $('.dash__list', panel), s = $('.dash__search', panel);
    const rows = () => all.filter(x => (!st || x.status === st) && (!s.value || (x.name + ' ' + x.phone + ' ' + x.gift).toLowerCase().includes(s.value.toLowerCase())));
    $('.dash__csv', panel).addEventListener('click', () => csvOf('worship-connect-applications.csv', cols, rows()));
    $$('.chip', panel).forEach(b => b.addEventListener('click', () => { st = b.dataset.s; $$('.chip', panel).forEach(x => x.classList.toggle('is-on', x === b)); render(); }));
    const render = () => { list.innerHTML = rows().map(x => `<details class="drow drow--exp" data-id="${x.id}" ${st === 'new' ? 'open' : ''}><summary>${avatar(x.name)}<div><b>${esc(x.name)} <i class="pill">${esc(x.gift)}</i></b><span>${esc(x.phone)}${x.email ? ' &middot; ' + esc(x.email) : ''}${x.church ? ' &middot; ' + esc(x.church) : ''} &middot; applied ${esc(when(x.created_at))}</span></div>
        <div class="row"><a class="pill" href="https://wa.me/${esc(String(x.phone).replace(/\D/g,''))}?text=${encodeURIComponent('Hello ' + x.name.split(' ')[0] + ', this is Worship Connect. Thank you for applying to join the team.')}" target="_blank" rel="noopener">${ICO.wa} WhatsApp</a><select class="rolesel status" aria-label="Status">${Object.entries(APP_STATUS).map(([k,v]) => `<option value="${k}" ${k === x.status ? 'selected' : ''}>${v}</option>`).join('')}</select></div></summary>
        <div class="drow__body"><dl class="drow__dl"><dt>Experience</dt><dd>${esc(x.experience||'') || 'Not given'}</dd><dt>Message</dt><dd>${esc(x.message||'') || 'None'}</dd></dl><label class="field"><span>Team notes (private)</span><textarea class="notes" rows="2" placeholder="Auditioned on..., voice part, availability">${esc(x.notes||'')}</textarea></label><div class="row"><button class="btn btn--ghost save">Save notes</button>${can.admin(r) ? '<button class="pill pill--danger del">Delete</button>' : ''}</div></div></details>`).join('') || `<div class="empty"><h3>No ${st ? APP_STATUS[st].toLowerCase() : ''} applications</h3><p>Applications from the Join page land here.</p></div>`;
      $$('.status', list).forEach(sel => sel.addEventListener('change', async () => { const id = sel.closest('.drow').dataset.id; const { error } = await sb.from('applications').update({ status: sel.value, reviewed_by: profile.id }).eq('id', id); if (error) toast(friendly(error), false); else { all.find(x => x.id === id).status = sel.value; toast('Status updated.'); $$('.chip', panel).forEach(b => { const i = $('i', b); if (i) i.textContent = count(b.dataset.s); }); } }));
      $$('.save', list).forEach(b => b.addEventListener('click', async e => { e.preventDefault(); const d = b.closest('.drow'); const { error } = await sb.from('applications').update({ notes: $('.notes', d).value }).eq('id', d.dataset.id); toast(error ? friendly(error) : 'Notes saved.', !error); }));
      $$('.del', list).forEach(b => b.addEventListener('click', async e => { e.preventDefault(); const x = all.find(y => y.id === b.closest('.drow').dataset.id); if (!(await sure({ title: 'Delete this application?', body: `${x ? x.name + "'s application and the team notes on it are" : 'The application is'} removed. This cannot be undone.`, ok: 'Delete', danger: true, from: b }))) return; const id = b.closest('.drow').dataset.id; await sb.from('applications').delete().eq('id', id); all.splice(all.findIndex(x => x.id === id), 1); render(); })); };
    s.addEventListener('input', render); render();
  }
  async function teamTab(){
    const load = async () => (await sb.from('team_members').select('*').eq('site','worship').order('sort').order('created_at')).data || [];
    let members = await load(), editing = null, view = 'all', blob = null;
    /* the Worshipers / Media choice appears once the team column exists (migration 20260925190000), so a late migration never breaks saving */
    const hasTeam = () => !members.length || members.some(m => Object.hasOwn(m, 'team'));
    const TABS = { worshipers: ['Worshipers', 'Vocals and band'], media: ['Media', 'Sound, cameras, lyrics'] };
    const tabOf = m => m.team === 'media' ? 'media' : 'worshipers', byId = id => members.find(m => m.id === id);
    const inView = () => view === 'all' ? members : members.filter(m => tabOf(m) === view);
    /* the form, with the member's tile beside it as the dark team page will show it */
    const formHtml = m => `<form class="cmp teamform" novalidate><div class="cmp__head"><div><b>${m ? 'Edit ' + esc(m.name) : 'Add a team member'}</b><span>${m ? 'Changes show on the team page as soon as you save.' : 'They appear on the Worship Connect team page when you save.'}</span></div></div>
      <div class="teamform__grid">
        <div class="teamform__side"><span class="teamform__eyebrow">On the team page</span>
          <div class="tm-prev" aria-hidden="true"><div class="tm-prev__ph"></div><b class="tm-prev__name"></b><span class="tm-prev__role"></span><p class="tm-prev__bio"></p></div>
          <div class="teamform__photo"><label class="btn btn--ghost teamform__pick">${ICO.image}<span>Upload photo</span><input name="photo" type="file" accept="image/*"></label><button class="teamform__unphoto" type="button" hidden>Remove photo</button></div>
          <small class="teamform__note">Portrait photos fill the tile best. You can also drop a photo on the tile.</small></div>
        <div class="teamform__fields">
          <div class="compose__row"><label class="field"><span>Name</span><input name="name" required autocomplete="off" value="${esc(m?.name||'')}"></label><label class="field"><span>Role on the team</span><input name="role" required autocomplete="off" placeholder="Lead vocals, Keys, Sound..." value="${esc(m?.role||'')}"></label></div>
          ${hasTeam() ? `<fieldset class="teamform__tab"><legend>Tab on the team page</legend><div class="teamform__segs">${Object.entries(TABS).map(([k, [t, d]]) => `<label class="seg"><input type="radio" name="team" value="${k}"${(m ? tabOf(m) : 'worshipers') === k ? ' checked' : ''}><span><b>${t}</b><small>${d}</small></span></label>`).join('')}</div></fieldset>` : ''}
          <label class="field"><span>A line about them <em>optional</em></span><input name="bio" maxlength="200" autocomplete="off" value="${esc(m?.bio||'')}"><small class="teamform__count" aria-hidden="true"></small></label>
          <label class="teamform__switch"><input type="checkbox" role="switch" name="active"${!m || m.active ? ' checked' : ''}><span><b>Show on the public team page</b><small>Off keeps them here without showing them on the site.</small></span></label>
        </div></div>
      <div class="row teamform__bar"><button class="btn" type="submit">${m ? 'Save changes' : 'Add to the team'}</button>${m ? '<button class="btn btn--ghost cancel" type="button">Cancel</button>' : ''}<span class="cmp__status" role="status"></span></div></form>`;
    const headHtml = () => `<div class="team__head"><div><h3>The team on the site</h3><p class="sub">The order here is the order on the team page.</p></div>${hasTeam() && members.length ? `<div class="team__filters" role="group" aria-label="Show">${[['all', 'All', members.length], ...Object.entries(TABS).map(([k, [t]]) => [k, t, members.filter(m => tabOf(m) === k).length])].map(([k, t, n]) => `<button class="chip${view === k ? ' is-on' : ''}" type="button" data-v="${k}" aria-pressed="${view === k}">${t} <i>${n}</i></button>`).join('')}</div>` : ''}</div>`;
    const rowHtml = (m, i, rows) => { const t = tabOf(m), to = t === 'media' ? 'worshipers' : 'media';
      return `<div class="drow team__row${m.active ? '' : ' is-off'}" data-id="${m.id}">${m.photo_url ? `<img class="drow__thumb" src="${esc(m.photo_url)}" alt="" loading="lazy">` : `<span class="drow__thumb drow__thumb--k">${esc(initials(m.name))}</span>`}<div><b>${esc(m.name)}${m.active ? '' : ' <i class="pill">Hidden</i>'}</b><span>${esc(m.role)}${m.bio ? ' &middot; ' + esc(m.bio) : ''}</span></div>
        <div class="row team__acts">${hasTeam() ? `<button class="pill team__swap${t === 'media' ? ' is-media' : ''}" type="button" data-to="${to}" title="Move to ${TABS[to][0]}" aria-label="${esc(m.name)} is on the ${TABS[t][0]} tab. Move to ${TABS[to][0]}">${ICO.swap}${TABS[t][0]}</button>` : ''}<button class="pill up" type="button" ${i ? '' : 'disabled'} aria-label="Move ${esc(m.name)} up">${ICO.up}</button><button class="pill down" type="button" ${i === rows.length - 1 ? 'disabled' : ''} aria-label="Move ${esc(m.name)} down">${ICO.down}</button><button class="pill edit" type="button" aria-label="Edit ${esc(m.name)}">${ICO.edit}<span>Edit</span></button><button class="pill pill--danger del" type="button" aria-label="Remove ${esc(m.name)}">${ICO.trash}<span>Remove</span></button></div></div>`; };
    const render = flash => { if (blob){ URL.revokeObjectURL(blob); blob = null; }
      panel.innerHTML = `<div class="team__editor">${formHtml(editing)}</div><div class="team__all"></div>`; wireForm(); renderList(flash); };
    /* the list re-draws on its own (filters, moves, tab swaps) so a half-typed form is never thrown away */
    const renderList = (flash, focus) => { const wrap = $('.team__all', panel), rows = inView();
      wrap.innerHTML = headHtml() + `<div class="dash__list team__list">${rows.map((m, i) => rowHtml(m, i, rows)).join('') || `<p class="team__none">${members.length ? `No one is on the ${TABS[view][0]} tab yet. Press the tab button on someone's row, or edit them, to move them here.` : 'No team members yet. Add the first one above.'}</p>`}</div>`;
      $$('.team__filters .chip', wrap).forEach(b => b.addEventListener('click', () => { view = b.dataset.v; renderList(null, `.team__filters [data-v="${view}"]`); }));
      $$('.team__row', wrap).forEach(row => { const m = byId(row.dataset.id);
        $('.team__swap', row)?.addEventListener('click', e => swap(m, e.currentTarget));
        $('.up', row).addEventListener('click', () => move(m, -1)); $('.down', row).addEventListener('click', () => move(m, 1));
        $('.edit', row).addEventListener('click', async e => { const f = $('.teamform', panel);
          if (f?.dataset.dirty && !(await sure({ title: 'Discard your changes?', body: 'The form has changes that are not saved yet.', ok: 'Discard', danger: true, from: e.currentTarget }))) return;
          editing = m; render(); const nf = $('.teamform', panel); nf.scrollIntoView({ behavior: 'smooth', block: 'start' }); nf.name.focus({ preventScroll: true }); });
        $('.del', row).addEventListener('click', async e => { if (!(await sure({ title: `Remove ${m.name} from the team page?`, body: 'They will no longer show on the Worship Connect team page. You can add them again later.', ok: 'Remove', danger: true, from: e.currentTarget }))) return;
          const { error } = await sb.from('team_members').delete().eq('id', m.id); if (error) return toast(friendly(error), false);
          members = members.filter(x => x.id !== m.id); if (editing?.id === m.id){ editing = null; render(); } else renderList(); toast(`${m.name} removed from the team page.`); }); });
      if (flash) { const el = $(`[data-id="${flash}"]`, wrap); if (el){ el.classList.add('is-new'); if (!focus) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); } }
      if (focus) $(focus, wrap)?.focus(); };
    /* one tap moves someone between the two tabs; an open form for that person follows along so saving it cannot undo the move */
    const swap = async (m, btn) => { const to = btn.dataset.to, at = inView().indexOf(m); btn.disabled = true;
      const { error } = await sb.from('team_members').update({ team: to }).eq('id', m.id); if (error){ btn.disabled = false; return toast(friendly(error), false); }
      m.team = to; if (editing?.id === m.id){ editing.team = to; const r = $(`.teamform input[name="team"][value="${to}"]`, panel); if (r) r.checked = true; }
      const rows = inView(), stays = rows.includes(m), next = stays ? m : rows[at] || rows[at - 1];   /* in a filtered list they leave it, and focus goes to whoever took their place */
      renderList(stays ? m.id : null, next ? `[data-id="${next.id}"] .team__swap` : '.team__filters .is-on'); toast(`${m.name} is now on the ${TABS[to][0]} tab.`); };
    /* arrows move within what is showing: in Media, up swaps places with the media member above */
    const move = (m, dir) => { const rows = inView(), other = rows[rows.indexOf(m) + dir]; if (!other) return;
      const a = members.indexOf(m), b = members.indexOf(other); [members[a], members[b]] = [members[b], members[a]];
      const btn = dir < 0 ? 'up' : 'down'; renderList(m.id, `[data-id="${m.id}"] .${btn}:not([disabled]), [data-id="${m.id}"] .edit`); persist(); };
    /* saves run one after another, each writing the order as it stands then, so quick repeated clicks cannot land out of order */
    let saving = Promise.resolve();
    const persist = () => (saving = saving.then(async () => {
      const res = await Promise.all(members.map((x, k) => x.sort === k ? null : sb.from('team_members').update({ sort: k }).eq('id', x.id).then(r => { if (!r.error) x.sort = k; return r; })));
      if (res.some(r => r?.error)){ toast('The new order was not saved. Try again.', false); members = await load(); renderList(); } }));
    const wireForm = () => { const f = $('.teamform', panel), status = $('.cmp__status', f), prev = $('.tm-prev', f), ph = $('.tm-prev__ph', prev), pick = $('.teamform__pick span', f), un = $('.teamform__unphoto', f), count = $('.teamform__count', f);
      let file = null, dropped = false;
      const say = (msg, err) => { status.textContent = msg; status.className = 'cmp__status' + (err ? ' is-err' : ''); };
      const photo = () => blob || (dropped ? null : editing?.photo_url || null);
      const paintText = () => { const v = n => f[n].value.trim(), put = (cls, text, empty) => { const el = $(cls, prev); el.textContent = text || empty; el.classList.toggle('is-empty', !text); };
        put('.tm-prev__name', v('name'), 'Their name'); put('.tm-prev__role', v('role'), 'Their role'); put('.tm-prev__bio', v('bio'), ''); $('.tm-prev__bio', prev).hidden = !v('bio');
        const mono = $('.tm-prev__mono', prev); if (mono) mono.textContent = initials(v('name') || '?');
        const n = f.bio.value.length; count.textContent = `${n} / 200`; count.classList.toggle('is-near', n >= 180); };
      const paintPhoto = () => { const url = photo(); ph.innerHTML = url ? `<img src="${esc(url)}" alt="">` : '<span class="tm-prev__mono"></span>'; pick.textContent = url ? 'Change photo' : 'Upload photo'; un.hidden = !url; paintText(); };
      const take = fl => { if (!fl) return; f.photo.value = '';
        if (!/^image\//.test(fl.type)) return say('Choose a photo: a JPG, PNG or WebP image.', true);
        if (fl.size > 20e6) return say('That photo is over 20 MB. Choose a smaller one.', true);
        if (blob) URL.revokeObjectURL(blob); file = fl; dropped = false; blob = URL.createObjectURL(fl); f.dataset.dirty = '1'; say(''); paintPhoto(); };
      f.photo.addEventListener('change', () => take(f.photo.files[0]));
      un.addEventListener('click', () => { if (blob){ URL.revokeObjectURL(blob); blob = null; } file = null; dropped = true; f.dataset.dirty = '1'; paintPhoto(); f.photo.focus(); });
      ph.addEventListener('dragover', e => { e.preventDefault(); prev.classList.add('is-over'); });
      ph.addEventListener('dragleave', () => prev.classList.remove('is-over'));
      ph.addEventListener('drop', e => { e.preventDefault(); prev.classList.remove('is-over'); take(e.dataTransfer?.files[0]); });
      f.addEventListener('input', e => { if (e.target.name !== 'photo') f.dataset.dirty = '1'; e.target.removeAttribute?.('aria-invalid'); if (['name', 'role', 'bio'].includes(e.target.name)) paintText(); });
      f.addEventListener('submit', async e => { e.preventDefault(); const name = f.name.value.trim(), rl = f.role.value.trim();
        const miss = [!name && f.name, !rl && f.role].filter(Boolean); miss.forEach(i => i.setAttribute('aria-invalid', 'true'));
        if (miss.length){ miss[0].focus(); return say(miss.length > 1 ? 'Add their name and role.' : name ? 'Add their role on the team.' : 'Add their name.', true); }
        const go = $('button[type="submit"]', f); go.disabled = true; say(file ? 'Uploading the photo...' : 'Saving...');
        try { let photo_url = dropped ? null : editing?.photo_url || null; if (file) photo_url = (await uploadTo('feed', file, 'team')).url;
          const row = { site:'worship', name, role: rl, bio: f.bio.value.trim(), photo_url, active: f.active.checked };
          if (f.team) row.team = f.team.value;
          const was = editing; const { error } = was ? await sb.from('team_members').update(row).eq('id', was.id) : await sb.from('team_members').insert({ ...row, sort: members.length, created_by: profile.id }); if (error) throw error;
          editing = null; members = await load(); const id = was ? was.id : members[members.length - 1]?.id;
          if (view !== 'all' && byId(id) && tabOf(byId(id)) !== view) view = 'all';   /* keep the saved member in sight */
          render(id); toast(was ? `${name} saved.` : `${name} added to the team.`);
        } catch (err){ go.disabled = false; say(friendly(err), true); } });
      $('.cancel', f)?.addEventListener('click', () => { editing = null; render(); });
      paintPhoto(); };
    render();
  }
  /* Upper Room library: everything on the shelves at a glance, with upload, preview and delete (the reading room is ccfczambia.org/library) */
  async function libraryTab(){
    let items = [], kind = '';
    const kit = libraryKit(() => items, () => load());
    panel.innerHTML = `<div class="dash__toolbar"><h3>Upper Room library</h3>${can.library(r) ? `<button class="btn dash__upload" type="button">${ICO.plus || '+'} Upload material</button>` : ''}<a class="btn btn--ghost" href="https://ccfczambia.org/library" target="_blank" rel="noopener">Open the Upper Room</a></div>
      <div class="dash__kpis"></div>
      <div class="dash__toolbar"><div class="feed__filters lib__kinds">${[['', 'All'], ...Object.entries(kit.KINDS)].map(([k, v]) => `<button class="chip ${k ? '' : 'is-on'}" data-k="${k}">${v}</button>`).join('')}</div><input class="dash__search" placeholder="Search title, series or file name" aria-label="Search the library"></div>
      <div class="dash__list"></div>`;
    const list = $('.dash__list', panel), search = $('.dash__search', panel), kpis = $('.dash__kpis', panel), up = $('.dash__upload', panel);
    if (up) up.addEventListener('click', kit.openUpload);
    $$('.lib__kinds .chip', panel).forEach(b => b.addEventListener('click', () => { kind = b.dataset.k; $$('.lib__kinds .chip', panel).forEach(x => x.classList.toggle('is-on', x === b)); render(); }));
    async function load(){ list.innerHTML = '<div class="skel"></div>';
      const { data, error } = await sb.from('library_items').select('*, profiles:member_cards(full_name)').order('created_at', { ascending:false });
      if (error){ list.innerHTML = `<p class="sub">${esc(friendly(error))}</p>`; return; } items = data || []; render(); }
    function render(){ const q = search.value.toLowerCase();
      const rows = items.filter(i => (!kind || i.kind === kind) && (!q || (i.title + ' ' + i.series + ' ' + i.description + ' ' + i.file_name).toLowerCase().includes(q)));
      const total = items.reduce((n, i) => n + (+i.size_bytes || 0), 0), series = new Set(items.map(i => i.series || 'General')).size;
      kpis.innerHTML = `<div class="stat"><b>${items.length}</b><span>item${items.length === 1 ? '' : 's'} on the shelves</span></div><div class="stat"><b>${series}</b><span>series</span></div><div class="stat"><b>${fmtBytes(total)}</b><span>stored</span></div><div class="stat"><b>${items[0] ? esc(when(items[0].created_at)) : 'Nothing yet'}</b><span>last added</span></div>`;
      list.innerHTML = rows.map(i => { const e = kit.extOf(i.file_name), t = kit.TYPE(e), canDel = can.admin(r) || i.uploader_id === profile.id;
        return `<div class="drow lrow" data-id="${esc(i.id)}"><button type="button" class="drow__thumb lrow__thumb" aria-label="Preview ${esc(i.title)}">${i.cover_path ? `<img src="${esc(kit.pub(i.cover_path))}" alt="" loading="lazy">` : kit.art(t, e)}</button>
          <div><b>${esc(i.title)} <i class="pill">${esc(kit.KINDS[i.kind] || i.kind)}</i></b><span>${esc(i.series || 'General')} &middot; ${esc(e.toUpperCase() || 'FILE')} &middot; ${fmtBytes(i.size_bytes)}${i.profiles?.full_name ? ' &middot; ' + esc(i.profiles.full_name) : ''} &middot; added ${esc(when(i.created_at))}</span></div>
          <div class="row"><button type="button" class="pill lrow__view">Preview</button><a class="pill" href="${esc(kit.pub(i.path))}" target="_blank" rel="noopener">Open</a>${canDel ? '<button type="button" class="pill pill--danger del">Delete</button>' : ''}</div></div>`; }).join('')
        || `<p class="sub">${items.length ? 'Nothing matches. Try another word or type.' : 'The Upper Room is empty. Upload the first book, notes or slides.'}</p>`;
      $$('.lrow__thumb, .lrow__view', list).forEach(b => b.addEventListener('click', () => kit.preview(items.find(x => x.id === b.closest('.drow').dataset.id))));
      $$('.del', list).forEach(b => b.addEventListener('click', async () => { if (b.disabled) return; b.disabled = true; if (await kit.remove(items.find(x => x.id === b.closest('.drow').dataset.id), b)) load(); else b.disabled = false; })); }
    search.addEventListener('input', render); load();
  }
  async function usersTab(){
    panel.innerHTML = `<div class="dash__toolbar"><input class="dash__search" placeholder="Search by name or email" aria-label="Search users"><select class="rolesel dash__rolefilter"><option value="">All roles</option>${Object.entries(ROLES).map(([k,v]) => `<option value="${k}">${v.label}</option>`).join('')}</select></div><div class="dash__list"></div>`;
    const list = $('.dash__list', panel), search = $('.dash__search', panel), rf = $('.dash__rolefilter', panel);
    const { data } = await sb.from('profiles').select('id, email, full_name, avatar_url, role, created_at').order('created_at', { ascending:false });
    const assignable = r === 'master_admin' ? Object.keys(ROLES) : ['leader','media','blogger','member'];
    const canDelete = u => !!CFG.usersEndpoint && can.admin(r) && u.id !== profile.id && (r === 'master_admin' || !ADMINS.includes(u.role)); let busy = false;
    const render = () => { const qq = search.value.toLowerCase();
      list.innerHTML = (data||[]).filter(u => (!rf.value || u.role === rf.value) && (!qq || (u.full_name+u.email).toLowerCase().includes(qq))).map(u => { const locked = r !== 'master_admin' && ADMINS.includes(u.role);
        return `<div class="drow" data-id="${u.id}">${avatar(u.full_name||u.email, u.avatar_url)}<div><b>${esc(u.full_name || '(no name)')}</b><span>${esc(u.email)} &middot; joined ${esc(when(u.created_at))}</span></div><div class="row">${locked ? `<span class="pill pill--orange">${esc(ROLES[u.role].label)}</span><small>Only the Master Administrator can change Admin accounts</small>` : `<select class="rolesel" aria-label="Role for ${esc(u.full_name||u.email)}">${assignable.map(k => `<option value="${k}" ${k===u.role?'selected':''}>${ROLES[k].label}</option>`).join('')}</select>`}${canDelete(u) ? `<button class="pill pill--danger del" aria-label="Delete the account of ${esc(u.full_name||u.email)}">Delete</button>` : ''}</div></div>`; }).join('') || '<p class="sub">No users match.</p>';
      $$('.rolesel', list).forEach(s => s.addEventListener('change', async () => { const u = data.find(x => x.id === s.closest('.drow').dataset.id); const { error } = await sb.rpc('set_role', { target:u.id, new_role:s.value }); if (error){ toast(error.message,false); s.value = u.role; } else { u.role = s.value; toast(`${u.full_name || u.email} is now ${ROLES[s.value].label}.`); } }));
      $$('.del', list).forEach(b => b.addEventListener('click', () => removeAccount(data.find(x => x.id === b.closest('.drow').dataset.id), b))); };
    /* deleting an account (admin-users function): the function has the final say, the button only hides the obvious no's */
    const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
    const andList = xs => xs.length > 1 ? xs.slice(0, -1).join(', ') + ' and ' + xs[xs.length - 1] : (xs[0] || '');
    const usersFn = async body => { const { data: { session: s } } = await sb.auth.getSession(); if (!s) throw new Error('Your sign-in has expired. Please sign in again.'); const res = await fetch(CFG.usersEndpoint, { method:'POST', headers:{ 'Content-Type':'application/json', apikey: CFG.supabaseKey, Authorization: 'Bearer ' + s.access_token }, body: JSON.stringify(Object.assign({ site }, body)) }).catch(() => null); const j = res ? await res.json().catch(() => ({})) : {}; if (!res || !res.ok || j.error){ const e = new Error(res && res.status === 429 ? 'You have deleted several accounts in the last few minutes. Please wait a little and try again.' : (j.error || 'The account service could not be reached. Please try again.')); e.status = res ? res.status : 0; throw e; } return j; };
    async function removeAccount(u, b){ if (!u || busy) return; busy = true; const lock = on => $$('.del, .rolesel', list).forEach(x => { x.disabled = on; }); lock(true); b.textContent = 'Checking...';
      try { const c = await usersFn({ action:'check', user_id:u.id }); if (!c.allowed){ toast(c.reason || 'This account cannot be deleted.', false); return; }
        const name = (c.target && c.target.name) || u.full_name || '', email = (c.target && c.target.email) || u.email || '', m = c.moves || {};
        const parts = [m.posts ? plural(m.posts, 'post', 'posts') : '', m.library ? plural(m.library, 'library file', 'library files') : ''].filter(Boolean);
        const moves = parts.length ? ` Their ${andList(parts)} ${parts.length === 1 && /^1 /.test(parts[0]) ? 'moves' : 'move'} to you.` : '';
        if (!(await sure({ title: `Delete ${name ? `${name} (${email})` : email}?`, body: `${moves.trim() ? moves.trim() + ' ' : ''}Their registrations and applications stay with the church without their account link. Their profile, comments and likes are removed. To come back they will need to create a new account. This cannot be undone.`, ok: 'Delete account', danger: true, from: b }))) return;
        b.textContent = 'Deleting...'; await usersFn({ action:'delete', user_id:u.id });
        data.splice(data.indexOf(u), 1); busy = false; render(); toast(`${name || email}'s account was deleted.`);
      } catch (e){ toast(e.message, false); if (e.status === 502) usersTab(); }   /* 502: not deleted, but already a Member with their content moved, so reload the list */
      finally { busy = false; if (b.isConnected){ lock(false); b.textContent = 'Delete'; } } }
    search.addEventListener('input', render); rf.addEventListener('change', render); render();
  }
  async function auditTab(){ const [{ data }, { data: dels }] = await Promise.all([sb.from('role_audit').select('created_at, old_role, new_role, actor:actor_id(full_name), target:target_id(full_name, email)').order('created_at', { ascending:false }).limit(100),
      sb.from('admin_actions').select('created_at, args, ok, actor:actor_id(full_name)').eq('tool', 'delete_account').order('created_at', { ascending:false }).limit(100)]);
    const rows = [...(data||[]).map(a => ({ at: a.created_at, html: `<div class="drow"><div><b>${esc(a.target ? (a.target.full_name || a.target.email || 'user') : 'Deleted account')}</b><span>${esc(ROLES[a.old_role]?.label||'')} to ${esc(ROLES[a.new_role]?.label||'')} by ${esc(a.actor?.full_name || 'system')} &middot; ${esc(when(a.created_at))}</span></div></div>` })),
      ...(dels||[]).map(a => { const g = a.args || {}, who = g.name ? `${g.name}${g.email ? ` (${g.email})` : ''}` : (g.email || 'user');
        return { at: a.created_at, html: `<div class="drow"><div><b>${esc(who)} <i class="pill pill--danger">${a.ok === false ? 'Not finished' : 'Deleted'}</i></b><span>${a.ok === false ? 'Account deletion tried' : 'Account deleted'} by ${esc(a.actor?.full_name || 'an admin')} &middot; ${esc(when(a.created_at))}</span></div></div>` }; })];
    panel.innerHTML = `<div class="dash__list">${rows.sort((x, y) => new Date(y.at) - new Date(x.at)).slice(0, 100).map(x => x.html).join('') || '<p class="sub">No role changes yet.</p>'}</div>`; }
  /* Portal roles (the CCFC Portal, portal.ccfczambia.org), separate from website roles. A person may hold several, except
     Master Admin, which is held on its own and which only another Master Admin can grant, change or remove, never their own.
     The controls only hide the obvious no's: ms.set_portal_roles and the table rules behind it have the final say. */
  async function portalTab(){
    const db = sb.schema('ms'), MASTER = 'master_admin';
    const { data: R, error } = await db.rpc('portal_roster');
    if (error || !R){ panel.innerHTML = `<p class="sub">Portal roles could not be loaded. ${esc(error ? error.message : 'Please try again.')}</p>`; return; }
    const roles = R.roles || [], accounts = R.accounts || [], meMaster = !!(R.me && R.me.is_master), meId = R.me && R.me.account;
    const byId = Object.fromEntries(accounts.map(u => [u.account, u]));
    const label = k => (roles.find(x => x.key === k) || {}).name || k;
    const names = ks => ks && ks.length ? ks.map(label).join(', ') : 'Member';
    const who = u => u ? (u.name || u.email) : 'a removed account';
    /* your own row is read-only here, as on the website; a Master Admin's row is for other Master Admins only */
    const locked = u => u.account === meId || (u.roles.includes(MASTER) && !meMaster);
    const chips = u => (u.roles.length ? u.roles.map(k => `<span class="pill${k === MASTER ? ' pill--master' : ''}">${esc(label(k))}</span>`).join('') : '<span class="pill pill--quiet">Member</span>')
      + (u.active === false ? '<span class="pill pill--quiet">Paused</span>' : '');
    panel.innerHTML = `<p class="sub proles__intro">Roles in the <a href="https://portal.ccfczambia.org" target="_blank" rel="noopener">CCFC Portal</a>. They are separate from website roles, so changing one never changes the other. Every church member can open the portal, and their roles decide what they see there. Anyone can hold several roles except Master Admin, which is held on its own. Only a Master Admin can grant or change Master Admin, and never their own.</p>
      <div class="dash__toolbar"><input class="dash__search" placeholder="Search by name, email or CCFC ID" aria-label="Search church accounts"><select class="rolesel" aria-label="Filter by portal role"><option value="">Everyone</option><option value="+">With a portal role</option><option value="-">No portal role</option>${roles.map(x => `<option value="${esc(x.key)}">${esc(x.name)}</option>`).join('')}</select></div>
      <div class="dash__list"></div><div class="plog"></div>`;
    const list = $('.dash__list', panel), search = $('.dash__search', panel), pf = $('.dash__toolbar .rolesel', panel);
    const row = u => `<details class="drow drow--exp" data-id="${esc(u.account)}"><summary>${avatar(u.name || u.email, u.avatar_url)}<div><b>${esc(u.name || '(no name)')}</b><span>${esc(u.email)}${ROLES[u.site_role] ? ` &middot; website ${esc(ROLES[u.site_role].short)}` : ''}${u.person_id ? ` &middot; <span class="ref">${esc(u.person_id)}</span>` : ''}</span></div><div class="proles">${chips(u)}</div></summary><div class="drow__body"></div></details>`;
    const editor = u => locked(u)
      ? `<p class="proles__lock">${ICO.lock}${u.account !== meId ? 'Only another Master Admin can change a Master Admin.' : u.roles.includes(MASTER) ? 'This is you. A Master Admin cannot change their own role; another Master Admin has to.' : 'This is you. Another administrator changes your portal roles.'}</p>`
      : `<fieldset class="proles__pick" aria-label="Portal roles for ${esc(who(u))}">${roles.filter(x => x.key !== MASTER || meMaster).map(x => `<label class="proles__opt"><input type="checkbox" value="${esc(x.key)}"${u.roles.includes(x.key) ? ' checked' : ''}><b>${esc(x.name)}</b><small>${esc(x.description || '')}</small></label>`).join('')}</fieldset>
         <div class="proles__foot"><button class="btn psave" disabled>Save roles</button>${meMaster ? '<small>Master Admin is held on its own, so choosing it clears the other roles.</small>' : ''}</div>`;
    /* Master Admin, when ticked, clears and holds the others; Save wakes only when something changed */
    const sync = (d, u) => { const boxes = $$('input', d), m = boxes.find(b => b.value === MASTER);
      boxes.forEach(b => { if (b === m) return; if (m && m.checked) b.checked = false; b.disabled = !!(m && m.checked); });
      const save = $('.psave', d); if (save) save.disabled = boxes.filter(b => b.checked).map(b => b.value).sort().join() === u.roles.slice().sort().join(); };
    let busy = false;
    async function saveRoles(d, u, btn){
      if (busy) return;
      const pick = roles.map(x => x.key).filter(k => $$('input', d).some(b => b.checked && b.value === k));
      const addM = pick.includes(MASTER) && !u.roles.includes(MASTER), dropM = u.roles.includes(MASTER) && !pick.includes(MASTER);
      if (addM && !(await sure({ title: `Make ${who(u)} a Master Admin?`, body: `A Master Admin holds every permission in the portal and is locked: only another Master Admin can change their roles, and they can never change their own.${u.roles.length ? ` Their other portal roles (${names(u.roles)}) are replaced.` : ''}`, ok: 'Make Master Admin', from: btn }))) return;
      if (dropM && !(await sure({ title: `Remove Master Admin from ${who(u)}?`, body: pick.length ? `They will hold ${names(pick)} in the portal instead.` : 'They will be a Member in the portal, with no portal role.', ok: 'Remove Master Admin', danger: true, from: btn }))) return;
      busy = true; btn.disabled = true; btn.textContent = 'Saving...';
      const { error: e } = await db.rpc('set_portal_roles', { p_account: u.account, p_roles: pick });
      busy = false;
      if (e){ toast(e.message, false); btn.textContent = 'Save roles'; sync(d, u); return; }
      u.roles = pick; if (u.active == null) u.active = true;
      toast(pick.length ? `${who(u)} now holds ${names(pick)} in the portal.` : `${who(u)} no longer holds a portal role.`);
      render(); const again = $$('details.drow', list).find(x => x.dataset.id === u.account); if (again) again.open = true; log();
    }
    const render = () => { const qq = search.value.trim().toLowerCase(), f = pf.value;
      const shown = accounts.filter(u => (!qq || `${u.name} ${u.email} ${u.person_id || ''}`.toLowerCase().includes(qq)) && (!f || (f === '+' ? u.roles.length > 0 : f === '-' ? !u.roles.length : u.roles.includes(f))));
      list.innerHTML = shown.map(row).join('') || '<p class="sub proles__none">Nobody matches.</p>'; };
    /* each row builds its editor the first time it opens ('toggle' does not bubble, so listen while it travels down) */
    list.addEventListener('toggle', ev => { const d = ev.target; if (!d.open || !d.matches || !d.matches('details.drow')) return;
      const u = byId[d.dataset.id], body = $('.drow__body', d); if (!u || body.dataset.ready) return; body.dataset.ready = '1'; body.innerHTML = editor(u);
      $$('input', body).forEach(b => b.addEventListener('change', () => sync(d, u))); sync(d, u);
      const save = $('.psave', body); if (save) save.addEventListener('click', () => saveRoles(d, u, save)); }, true);
    async function log(){ const box = $('.plog', panel); if (!box) return;
      const { data: rows, error: e } = await db.from('audit_logs').select('at, actor_auth_id, entity_key, detail').eq('action', 'portal.roles').order('audit_key', { ascending:false }).limit(25);
      if (e || !rows || !rows.length){ box.innerHTML = ''; return; }
      box.innerHTML = `<h3 class="plog__title">Recent portal role changes</h3><div class="dash__list">${rows.map(a => { const g = a.detail || {};
        return `<div class="drow"><div><b>${esc(who(byId[a.entity_key]))}</b><span>${esc(names(g.from))} to ${esc(names(g.to))} by ${esc(who(byId[a.actor_auth_id]))} &middot; ${esc(when(a.at))}</span></div></div>`; }).join('')}</div>`; }
    search.addEventListener('input', render); pf.addEventListener('change', render); render(); log();
  }
  function rolesTab(){ panel.innerHTML = `<div class="values">${Object.values(ROLES).map(x => `<div class="value"><h3>${esc(x.label)}</h3><p>${esc(x.desc)}</p></div>`).join('')}</div>`; }
  /* open the first tab last, once every helper above exists */
  const want = q.get('tab') === 'blogs' ? 'posts' : q.get('tab');
  show(want === 'portal' && mayPortal ? 'portal' : (tabs.find(t => t[0] === want) ? want : tabs[0][0]));   /* ?tab=portal still opens it, from a link or a reload */
}


/* ================================================================ ACCOUNT CENTER */
async function accountPage(modal){
  const root = $('#account'); if (!root) return; const gate = $('.acct__gate', root), app = $('.acct__app', root);
  if (!ready){ gate.innerHTML = `<h2>Almost ready</h2><p class="sub">Accounts switch on as soon as the church team finishes setup.</p>`; return; }
  if (!session){ gate.innerHTML = `<h2>Your account</h2><p class="sub">Sign in to update your name, photo, phone number, email and password. One account works on all three CCFC sites.</p><div class="row mt-2"><button class="btn" data-auth="in">Sign in</button><button class="btn btn--ghost" data-auth="up">Create account</button></div>`; accountUI(modal); return; }
  gate.hidden = true; app.hidden = false;
  const u = session.user, providers = (u.app_metadata?.providers || [u.app_metadata?.provider || 'email']);
  const render = () => { app.innerHTML = `
    <div class="acct__grid">
      <section class="acct__card acct__photo">
        <div class="acct__avatar">${avatar(profile.full_name || profile.email, profile.avatar_url, 'ava--xl')}<label class="acct__camera" title="Change photo"><input type="file" accept="image/*" hidden>${ICO.image}</label></div>
        <b>${esc(profile.full_name || 'Add your name')}</b><span class="pill">${esc(ROLES[role()||'member'].label)}</span>
        <p class="sub">${esc(profile.email)}</p>
        <div class="row"><button class="btn btn--ghost acct__pick">Change photo</button>${profile.avatar_url ? '<button class="pill pill--danger acct__unpick">Remove</button>' : ''}</div>
        <small class="acct__note">JPG or PNG. The photo is resized in your browser before upload and shows next to your posts and comments.</small>
      </section>
      <section class="acct__card">
        <h2>Profile</h2>
        <form class="acct__form" novalidate>
          <div class="field"><label for="ac-name">Profile name</label><input id="ac-name" name="full_name" required maxlength="80" value="${esc(profile.full_name||'')}" placeholder="Your name as it shows on the feed"></div>
          <div class="field"><label for="ac-phone">Phone number</label><input id="ac-phone" name="phone" type="tel" autocomplete="tel" maxlength="30" value="${esc(profile.phone||'')}" placeholder="+260 97 ..."><small>Only the church team can see it. Used to reach you about registrations and ministry.</small></div>
          <div class="row"><button class="btn" type="submit">Save profile</button><span class="form__status" aria-live="polite"></span></div>
        </form>
      </section>
      <section class="acct__card">
        <h2>Email address</h2>
        <form class="acct__email" novalidate>
          <div class="field"><label for="ac-email">Email</label><input id="ac-email" name="email" type="email" autocomplete="email" required value="${esc(u.email||'')}"><small>${providers.includes('google') || providers.includes('facebook') ? 'You sign in with ' + providers.filter(p => p !== 'email').map(p => p[0].toUpperCase() + p.slice(1)).join(' and ') + '. Changing the email here changes where church emails reach you.' : 'We send a confirmation link to both the old and the new address.'}</small></div>
          <div class="row"><button class="btn btn--ghost" type="submit">Update email</button><span class="form__status" aria-live="polite"></span></div>
        </form>
      </section>
      <section class="acct__card">
        <h2>Password</h2>
        <form class="acct__pass" novalidate>
          <div class="field"><label for="ac-pass">New password</label><input id="ac-pass" name="password" type="password" autocomplete="new-password" minlength="8" placeholder="At least 8 characters"></div>
          <div class="field"><label for="ac-pass2">Repeat it</label><input id="ac-pass2" name="password2" type="password" autocomplete="new-password"></div>
          <div class="row"><button class="btn btn--ghost" type="submit">Change password</button><span class="form__status" aria-live="polite"></span></div>
        </form>
        <small class="acct__note">${providers.every(p => p !== 'email') ? 'Setting a password also lets you sign in with your email, alongside ' + providers.map(p => p[0].toUpperCase() + p.slice(1)).join(' and ') + '.' : ''}</small>
      </section>
      <section class="acct__card acct__apps">
        <h2>Connected apps</h2>
        <div class="acct__app"><span class="acct__app-ico" aria-hidden="true"><svg viewBox="0 0 48 48"><circle cx="24" cy="24" r="17" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M24 12c.8 8.4 3.6 11.2 12 12-8.4.8-11.2 3.6-12 12-.8-8.4-3.6-11.2-12-12 8.4-.8 11.2-3.6 12-12z" fill="currentColor"/></svg></span><div><b>Yuriel</b><span class="acct__app-status">Checking...</span></div></div>
        <div class="acct__app-list"></div>
        <small class="acct__note">Yuriel is the church's AI Bible companion app, with its own accounts. Connecting shows your church name and role there and lets you sign in to Yuriel with this account. Your Yuriel conversations stay private to you.</small>
      </section>
      <section class="acct__card acct__meta">
        <h2>Your account</h2>
        <dl class="drow__dl"><dt>Role</dt><dd>${esc(ROLES[role()||'member'].label)}: ${esc(ROLES[role()||'member'].desc)}</dd><dt>Signs in with</dt><dd>${esc(providers.map(p => p === 'email' ? 'Email and password' : p[0].toUpperCase() + p.slice(1)).join(', '))}</dd><dt>Member since</dt><dd>${esc(fullDate(profile.created_at))}</dd><dt>Works on</dt><dd>ccfczambia.org, koinonia.ccfczambia.org, worship.ccfczambia.org</dd></dl>
        <div class="row mt-2"><button class="btn btn--ghost nav__signout">Sign out</button><button class="btn btn--ghost acct__tour" type="button">Show me around again</button><a class="link" href="/privacy">Privacy policy</a></div>
      </section>
    </div>`;
    const setStatus = (f, msg, ok) => { const st = $('.form__status', f); st.textContent = msg; st.className = 'form__status ' + (ok ? 'is-ok' : 'is-err'); };
    if (new URLSearchParams(location.search).get('connect') === 'mazar' && !$('.acct__connect', root)){ const note = document.createElement('div'); note.className = 'acct__connect'; note.innerHTML = `<b>You're signed in.</b> Go back to Yuriel to finish connecting. ${window.opener ? 'This window closes by itself.' : '<a class="link" href="https://yuriel.ccfczambia.org/?account=connect">Return to Yuriel</a>'}`; app.prepend(note); }
    /* Mazar keeps its accounts in its own database (CFG.mazarUrl); its mazar-account function checks this church sign-in and answers for it */
    const mazarFn = async (action) => { const { data: { session: s } } = await sb.auth.getSession(); if (!s || !CFG.mazarUrl) throw new Error('Not available right now.');
      const r = await fetch(CFG.mazarUrl + '/functions/v1/mazar-account', { method:'POST', headers:{ 'Content-Type':'application/json', apikey: CFG.mazarKey }, body: JSON.stringify({ action, ccfc_token: s.access_token }) });
      const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || 'Not available right now.'); return j; };
    const loadApps = async () => { const box = $('.acct__apps', app); if (!box) return; const st = $('.acct__app-status', box), list = $('.acct__app-list', box);
      let m; try { ({ mazar: m } = await mazarFn('ccfc-apps')); } catch (e){ st.textContent = 'Not available right now.'; return; }
      if (!m){ st.innerHTML = 'Not connected. <a class="link" href="https://yuriel.ccfczambia.org/?account=connect" target="_blank" rel="noopener">Connect in Yuriel</a>'; list.innerHTML = ''; return; }
      st.textContent = 'Connected';
      list.innerHTML = `<div class="drow"><div><b>${esc(m.name || 'Your Yuriel account')}</b><span>${m.linked_at ? 'Connected ' + esc(when(m.linked_at)) : ''}</span></div><div class="row"><a class="pill" href="https://yuriel.ccfczambia.org" target="_blank" rel="noopener">Open Yuriel</a><button class="pill pill--danger" data-unlink>Disconnect</button></div></div>`;
      $$('[data-unlink]', list).forEach(b => b.addEventListener('click', async () => { if (!(await sure({ title: 'Disconnect Yuriel from your church account?', body: 'Your Yuriel account and conversations stay as they are. You can connect again any time.', ok: 'Disconnect', danger: true, from: b }))) return; try { await mazarFn('ccfc-disconnect'); toast('Disconnected from Yuriel.'); loadApps(); } catch (e){ toast(e.message, false); } })); };
    loadApps();
    const file = $('.acct__camera input', app); const pick = () => file.click();
    $('.acct__pick', app).addEventListener('click', pick); $('.acct__camera', app).addEventListener('click', e => { e.preventDefault(); pick(); });
    file.addEventListener('change', async () => { const fl = file.files[0]; if (!fl) return; if (!fl.type.startsWith('image')){ toast('Please choose an image.', false); return; }
      toast('Uploading photo...');
      try { const small = await shrink(fl, 512, .85); const path = `avatars/${profile.id}/${Date.now()}.jpg`;
        const { error } = await sb.storage.from('feed').upload(path, small, { contentType:'image/jpeg', upsert:true }); if (error) throw error;
        const url = sb.storage.from('feed').getPublicUrl(path).data.publicUrl;
        const { error: e2 } = await sb.from('profiles').update({ avatar_url: url }).eq('id', profile.id); if (e2) throw e2;
        await sb.auth.updateUser({ data: { avatar_url: url } }); profile.avatar_url = url; accountUI(modal); render(); toast('Photo updated.');
      } catch (err){ toast(friendly(err), false); } });
    $('.acct__unpick', app)?.addEventListener('click', async () => { const { error } = await sb.from('profiles').update({ avatar_url: null }).eq('id', profile.id); if (error) toast(friendly(error), false); else { profile.avatar_url = null; accountUI(modal); render(); toast('Photo removed.'); } });
    $('.acct__form', app).addEventListener('submit', async e => { e.preventDefault(); const f = e.target; const full_name = f.full_name.value.trim(), phone = f.phone.value.trim();
      if (!full_name){ setStatus(f, 'Please enter your name.', false); return; }
      const { error } = await sb.from('profiles').update({ full_name, phone: phone || null }).eq('id', profile.id); if (error){ setStatus(f, friendly(error), false); return; }
      await sb.auth.updateUser({ data: { full_name } }); profile.full_name = full_name; profile.phone = phone; accountUI(modal); $('.acct__photo b', app).textContent = full_name; setStatus(f, 'Saved.', true); });
    $('.acct__email', app).addEventListener('submit', async e => { e.preventDefault(); const f = e.target; const email = f.email.value.trim();
      if (!/^\S+@\S+\.\S+$/.test(email)){ setStatus(f, 'Please enter a valid email address.', false); return; } if (email === u.email){ setStatus(f, 'That is already your email.', false); return; }
      const { error } = await sb.auth.updateUser({ email }, { emailRedirectTo: here() }); if (error){ setStatus(f, friendly(error), false); return; }
      setStatus(f, 'Check both inboxes and confirm the change from the links we sent.', true); });
    $('.acct__pass', app).addEventListener('submit', async e => { e.preventDefault(); const f = e.target; const p1 = f.password.value, p2 = f.password2.value;
      if (p1.length < 8){ setStatus(f, 'Use at least 8 characters.', false); return; } if (p1 !== p2){ setStatus(f, 'The two passwords do not match.', false); return; }
      const { error } = await sb.auth.updateUser({ password: p1 }); if (error){ setStatus(f, friendly(error), false); return; } f.reset(); setStatus(f, 'Password changed.', true); });
    $('.nav__signout', app).addEventListener('click', async () => { clearPrime(); await sb.auth.signOut({ scope: 'local' }); location.href = '/'; });
    $('.acct__tour', app).addEventListener('click', () => Tour.replay());
  };
  render();
}

/* ================================================================ PUBLIC TEAM PAGE (Worship Connect) */
/* The Worship Connect team page. Members sit under three tabs, All, Worshipers and Media, by the team each
   was given in the admin panel. The query asks for that column and falls back without it, so the page still
   works if the column has not been added yet; everyone then counts as a worshiper. The tabs come up at once on
   the page's own placeholder tiles (what shows when there are no profiles or the database is unreachable) and
   filter again when the profiles arrive, so the bar never pops in above a grid that is already on screen. */
async function teamPage(){
  const root = $('#team'); if (!root) return; const grid = $('.team__grid', root); if (!grid) return;
  const tabs = teamTabs(root, grid, ready); if (!ready) return;
  const q = cols => sb.from('team_members').select(cols).eq('site','worship').eq('active', true).order('sort');
  try {
    let { data, error } = await q('name, role, bio, photo_url, team');
    if (error) ({ data } = await q('name, role, bio, photo_url'));
    if (!data?.length) return;   /* keep the placeholder tiles */
    grid.innerHTML = data.map(m => `<div class="tm" data-team="${m.team === 'media' ? 'media' : 'worshipers'}">${m.photo_url ? `<div class="ph"><img src="${esc(m.photo_url)}" alt="${esc(m.name)}" loading="lazy"></div>` : `<div class="ph tm__mono">${esc(initials(m.name))}</div>`}<b>${esc(m.name)}</b><span>${esc(m.role)}</span>${m.bio ? `<p>${esc(m.bio)}</p>` : ''}</div>`).join('');
    const lb = lightbox(); const imgs = data.filter(m => m.photo_url).map(m => ({ url:m.photo_url, alt:m.name }));
    $$('.tm .ph img', grid).forEach((im, i) => im.addEventListener('click', () => lb.open(imgs, i)));
  } finally { tabs?.settle(); }
}
/* the tab bar is ARIA tabs: arrow keys, Home and End move between them; ?team=media opens on that tab */
function teamTabs(root, grid, loading){
  const bar = $('.team__tabs', root), empty = $('.team__empty', root); if (!bar) return null;
  const tabs = $$('[role="tab"]', bar); bar.hidden = false; let cur = 'all', settled = !loading;   /* no "on their way" note while the profiles are still loading */
  const show = (t, focus) => { cur = t;
    tabs.forEach(b => { const on = b.dataset.team === t; b.setAttribute('aria-selected', on); b.classList.toggle('is-on', on); b.tabIndex = on ? 0 : -1; if (on){ grid.setAttribute('aria-labelledby', b.id); if (focus) b.focus(); } });
    let n = 0; $$('.tm', grid).forEach(el => { const hit = t === 'all' || el.dataset.team === t; el.hidden = !hit; if (hit) n++; });
    if (empty){ empty.hidden = n > 0 || !settled; const tab = tabs.find(b => b.dataset.team === t); $('p', empty).innerHTML = (tab && tab.dataset.empty) || 'No one here yet.'; }
    const u = new URL(location.href); if (t === 'all') u.searchParams.delete('team'); else u.searchParams.set('team', t);
    history.replaceState(null, '', u.pathname + u.search + u.hash); };
  tabs.forEach((b, i) => {
    b.addEventListener('click', () => show(b.dataset.team));
    b.addEventListener('keydown', e => {
      const step = { ArrowRight: 1, ArrowLeft: -1 }[e.key], edge = { Home: 0, End: tabs.length - 1 }[e.key];
      if (step === undefined && edge === undefined) return; e.preventDefault();
      show(tabs[edge !== undefined ? edge : (i + step + tabs.length) % tabs.length].dataset.team, true); }); });
  const want = new URLSearchParams(location.search).get('team');
  show(tabs.some(b => b.dataset.team === want) ? want : 'all');
  return { settle: () => { settled = true; show(cur); } };
}


/* ================================================================ COOKIE CONSENT + ANALYTICS
   One choice covers all three sites (cookie on .ccfczambia.org, 6 months). Essential cookies (sign-in, this choice)
   are always on. Optional: anonymous analytics (Vercel Web Analytics + Speed Insights, cookieless) and third-party
   embeds that set their own cookies (Google Maps). Nothing optional loads until the visitor says yes. */
const Consent = (() => {
  const NAME = 'ccfc-consent', VER = 1, CAP = new URLSearchParams(location.search).has('cap');
  const onDomain = /(^|\.)ccfczambia\.org$/.test(location.hostname);
  const read = () => { const m = document.cookie.match(/(?:^|;\s*)ccfc-consent=([^;]*)/); if (!m) return null; try { const v = JSON.parse(decodeURIComponent(m[1])); return v && v.v === VER ? v : null; } catch (_) { return null; } };
  const write = v => { document.cookie = `${NAME}=${encodeURIComponent(JSON.stringify(v))}; Max-Age=${60 * 60 * 24 * 180}; Path=/; SameSite=Lax${location.protocol === 'https:' ? '; Secure' : ''}${onDomain ? '; Domain=.ccfczambia.org' : ''}`; };
  let state = read(), el = null;
  const analytics = () => { if (window.__ccfcVA || !onDomain || (window.CCFC_SITE && window.CCFC_SITE.admin)) return; window.__ccfcVA = true;
    window.va = window.va || function(){ (window.vaq = window.vaq || []).push(arguments); };
    window.si = window.si || function(){ (window.siq = window.siq || []).push(arguments); };
    ['/_vercel/insights/script.js', '/_vercel/speed-insights/script.js'].forEach(src => { const sc = document.createElement('script'); sc.defer = true; sc.src = src; document.head.appendChild(sc); }); };
  const loadFrame = f => { if (f.getAttribute('src')) return; f.setAttribute('src', f.dataset.consentSrc); const g = f.parentElement.querySelector('.cgate'); if (g) g.remove(); };
  const gates = () => $$('iframe[data-consent-src]').forEach(f => {
    if (state && state.media) return loadFrame(f);
    if (f.parentElement.querySelector('.cgate')) return;
    const g = document.createElement('div'); g.className = 'cgate';
    g.innerHTML = `<div><b>${esc(f.dataset.consentLabel || 'Map')}</b><p>This map comes from Google, which may set its own cookies.</p><div class="cgate__btns"><button type="button" class="btn cgate__load">Load the map</button>${f.dataset.consentLink ? `<a class="cgate__open" href="${esc(f.dataset.consentLink)}" target="_blank" rel="noopener">Open in Google Maps</a>` : ''}</div><label class="cgate__remember"><input type="checkbox"> Always load maps on these sites</label></div>`;
    $('.cgate__load', g).addEventListener('click', () => { if ($('.cgate__remember input', g).checked) set({ analytics: !!(state && state.analytics), media: true }); loadFrame(f); });
    f.parentElement.appendChild(g); });
  const apply = () => { if (state && state.analytics) analytics(); gates(); };
  function set(v){ state = { v: VER, t: Date.now(), analytics: !!v.analytics, media: !!v.media }; write(state); close(); apply(); }
  function close(){ if (!el) return; el.classList.remove('is-in'); document.body.classList.remove('has-consent'); const x = el; el = null; setTimeout(() => x.remove(), 350); }
  function open(){
    if (el) return; el = document.createElement('div'); el.className = 'consent'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'Cookie choices'); el.setAttribute('aria-describedby', 'consent-text');
    const a = state ? state.analytics : false, m = state ? state.media : false;
    el.innerHTML = `<div class="consent__card"><div class="consent__head"><span class="consent__ico" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-9-9 3 3 0 0 0 3 3 3 3 0 0 0 3 3 3 3 0 0 0 3 3z"/><circle cx="8.5" cy="10.5" r="1"/><circle cx="12" cy="15.5" r="1"/><circle cx="15.5" cy="12" r="1"/></svg></span><b>Your privacy on our sites</b></div>
      <p id="consent-text">We use essential cookies to keep you signed in. With your OK we also count visits anonymously and load maps from Google. One choice covers all three CCFC sites. <a href="https://ccfczambia.org/privacy#cookies">Read the privacy policy</a></p>
      <div class="consent__opts" ${state ? '' : 'hidden'}>
        <label class="consent__opt"><input type="checkbox" checked disabled><span><b>Essential</b><small>Sign-in and remembering this choice. Always on.</small></span></label>
        <label class="consent__opt"><input type="checkbox" name="analytics" ${a ? 'checked' : ''}><span><b>Anonymous analytics</b><small>Counts page views and page speed with Vercel. No cookies, no advertising.</small></span></label>
        <label class="consent__opt"><input type="checkbox" name="media" ${m ? 'checked' : ''}><span><b>Maps</b><small>Loads Google Maps on the visit and contact pages. Google may set cookies.</small></span></label>
      </div>
      <div class="consent__btns"><button type="button" class="btn consent__all">Accept all</button><button type="button" class="btn btn--ghost consent__min">Essential only</button><button type="button" class="consent__more" ${state ? 'hidden' : ''}>Choose</button><button type="button" class="btn consent__save" ${state ? '' : 'hidden'}>Save my choices</button></div></div>`;
    document.body.appendChild(el); document.body.classList.add('has-consent'); requestAnimationFrame(() => requestAnimationFrame(() => el && el.classList.add('is-in'))); setTimeout(() => el && el.classList.add('is-in'), 80);
    $('.consent__all', el).addEventListener('click', () => set({ analytics: true, media: true }));
    $('.consent__min', el).addEventListener('click', () => set({ analytics: false, media: false }));
    $('.consent__more', el).addEventListener('click', e => { $('.consent__opts', el).hidden = false; e.currentTarget.hidden = true; $('.consent__save', el).hidden = false; $('input[name=analytics]', el).focus(); });
    $('.consent__save', el).addEventListener('click', () => set({ analytics: $('input[name=analytics]', el).checked, media: $('input[name=media]', el).checked }));
    if (state) $('.consent__save', el).focus();
  }
  function init(){
    document.addEventListener('click', e => { const b = e.target.closest('[data-consent-open]'); if (b){ e.preventDefault(); open(); } });
    addEventListener('keydown', e => { if (e.key === 'Escape' && el && state) close(); });
    apply(); if (!state && !CAP) setTimeout(open, 900);
  }
  return { init, open, get: () => state };
})();

/* ---------- helpers other site scripts call (Koinonia registration, Worship applications) ---------- */
window.CCFC = {
  consent: { open: () => Consent.open(), get: () => Consent.get() },
  async register(row){ if (!ready) return { offline:true };
    const { error } = await sb.from('registrations').insert({ ...row, user_id: session?.user?.id || null });
    if (error) return { error };
    // The privacy rules hide registrations from the person who made one, so the number comes back
    // through a function that answers only for a record created in the last few minutes.
    const { data } = await sb.rpc('registration_receipt', { p_id: row.id });
    return { reference: typeof data === 'string' ? data : null };
  },
  async apply(row){ if (!ready) return { offline:true }; const { error } = await sb.from('applications').insert({ site:'worship', ...row, user_id: session?.user?.id || null }); return { error }; },
};


/* ================================================================ SITE SETTINGS (editable text, announcement bar) */
async function applySettings(){ if (!ready) return; try {
  const { data } = await sb.from('site_settings').select('key, value').eq('site', SITE_KEY); if (!data) return;
  const map = Object.fromEntries(data.map(x => [x.key, x.value]));
  $$('[data-setting]').forEach(el => { const v = map[el.dataset.setting]; if (typeof v === 'string' && v.trim() && el.textContent.trim() !== v.trim()) el.textContent = v; });
  const a = (map.announcement || '').trim(); let bar = $('.announce');
  if (a && !$('#dashboard')){ let hidden = false; try { hidden = sessionStorage.getItem('ccfc:announce') === a; } catch (_) {}
    if (!hidden){ if (!bar){ bar = document.createElement('div'); bar.className = 'announce'; const main = $('main') || document.body; main.insertBefore(bar, main.firstChild); }
      bar.innerHTML = `<div class="wrap"><span class="announce__dot"></span><p>${esc(a)}</p><button class="announce__x" aria-label="Dismiss">&times;</button></div>`; requestAnimationFrame(() => bar.classList.add('is-in'));
      $('.announce__x', bar).addEventListener('click', () => { bar.remove(); try { sessionStorage.setItem('ccfc:announce', a); } catch (_) {} }); } }
  else if (bar) bar.remove();
} catch (_) {} }

/* ================================================================ PAGE EDITOR (text, photos, links and sections changed through Mazar Prime)
   build-shared.js editable() tags the public pages with data-edit="<page>:<kind>:<hash>" and bakes the changes stored
   in public.page_content into the HTML. This applies what changed since the last build, and puts back the original
   where a change was undone (data-edit-default, written by the build). Stored values never become HTML: text is
   built from text nodes and a few safe elements, and links and photos must pass the same allowlist as the database.
   The child rules (decoration, inline markup, {n} pieces) mirror build-shared.js; change both together.
   ?edit=1 on any page, for the Master Administrator only: every editable piece is outlined, and clicking one copies
   its key with a ready sentence for Mazar Prime. Hidden sections show dimmed. */
const PAGE_SITES = ['ccfc', 'koinonia', 'worship'];
const PAGE_PHOTO = /^https:\/\/dcqydtkjzgilyjnjyisb\.supabase\.co\/storage\/v1\/object\/public\/site-photos\/(ccfc|koinonia|worship)\/[A-Za-z0-9_-]{1,80}\.(jpe?g|png|webp)$/;
const PHOTO_TYPES = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }, PHOTO_MAX = 5 * 1024 * 1024;
/* where a link goes, in words, for the plan card: this site, email, phone, a church host, or off-site */
const pageHref = h => { const s = String(h || '');
  if (/^mailto:/i.test(s)) return { where: 'email', off: false }; if (/^tel:/i.test(s)) return { where: 'phone', off: false };
  if (/^[\/#]/.test(s) && !/^\/\//.test(s)) return { where: 'this site', off: false };
  if (!/^https:\/\/[!-~]+$/i.test(s)) return { where: 'not an allowed link', off: true };
  try { const host = new URL(s).hostname.toLowerCase(); return { where: host, off: !(host === 'ccfczambia.org' || host.endsWith('.ccfczambia.org')) }; } catch (_) { return { where: 'not a valid address', off: true }; } };
const PE = (() => {
  /* printable ASCII only: no look-alike hosts */
  const href = h => typeof h === 'string' && h.length <= 500 && !/[^ -~]/.test(h) && /^(https:\/\/[^\s"'<>\\\/][^\s"'<>\\]*|\/(?![\/\\])[^\s"'<>\\]*|#[A-Za-z0-9_:.-]*|mailto:[^\s"'<>\\]+|tel:\+?[0-9 ()-]{3,30})$/.test(h);
  const src = s => typeof s === 'string' && s.length <= 500 && !s.includes('..') && ((/^\/assets\/[A-Za-z0-9_.\/-]+\.(webp|jpe?g|png|avif|gif|svg)(\?v=[A-Za-z0-9._-]+)?$/.test(s) && !s.includes('//')) || PAGE_PHOTO.test(s));
  const DASH = '[' + String.fromCharCode(0x2013, 0x2014) + ']', RANGE = new RegExp('(\\d)\\s*' + DASH + '\\s*(\\d)', 'g'), DASHES = new RegExp('\\s*' + DASH + '\\s*', 'g');
  const dash = s => String(s ?? '').replace(RANGE, '$1 to $2').replace(DASHES, ', ');
  const norm = s => String(s).replace(/[^\S\n]+/g, ' ').replace(/ *\n */g, '\n').trim();
  const spaces = s => String(s).replace(/\s+/g, ' '), blank = s => !/\S/.test(String(s)), tagLike = /<\s*\/?\s*[a-z!]/i;
  const INLINE = { B: 'b', STRONG: 'b', EM: 'em', I: 'em' }, LIVE = ['data-setting', 'data-cd', 'data-count', 'aria-live'];
  const BR = { nodeType: 1, tagName: 'BR', textContent: '', attributes: [], childNodes: [], hasAttribute: () => false, getAttribute: () => null, querySelector: () => null, classList: { contains: () => false }, virtual: true };
  /* a [data-split] heading after js/site.js wrapped its lines: read it as the lines joined by <br> */
  const isSplit = el => el.hasAttribute('data-split') && el.children.length > 0 && [...el.children].every(c => c.classList.contains('ml')) && [...el.childNodes].every(c => c.nodeType === 1);
  const kidsOf = el => isSplit(el) ? [...el.children].flatMap((ml, i) => [...(i ? [BR] : []), ...(ml.firstElementChild || ml).childNodes]) : [...el.childNodes];
  const unsplit = el => { const out = []; [...el.children].forEach((ml, i) => { if (i) out.push(document.createElement('br')); out.push(...(ml.firstElementChild || ml).childNodes); }); el.replaceChildren(...out); };
  const resplit = el => { const lines = [[]]; [...el.childNodes].forEach(n => n.nodeName === 'BR' ? lines.push([]) : lines[lines.length - 1].push(n));
    el.replaceChildren(...lines.map(ns => { const ml = document.createElement('span'), s = document.createElement('span'); ml.className = 'ml is-rv'; s.append(...ns); ml.append(s); return ml; })); };
  const live = el => LIVE.some(a => el.hasAttribute(a)) || el.classList.contains('year');
  const content = c => c.nodeType === 3 ? !blank(c.data) : c.nodeType === 1 && !(blank(c.textContent) && !(c.tagName === 'IMG' || c.querySelector('img')) && !live(c));
  const inline = c => { if (c.nodeType !== 1) return null; if (c.tagName === 'BR') return 'br';
    const plain = c.childNodes.length > 0 && [...c.childNodes].every(x => x.nodeType === 3) && !blank(c.textContent);
    if (INLINE[c.tagName] && !c.attributes.length && plain) return INLINE[c.tagName];
    if (c.tagName === 'A' && plain && [...c.attributes].every(a => ['href', 'target', 'rel'].includes(a.name)) && href(c.getAttribute('href'))) return 'a';
    return null; };
  const zones = kids => { kids = kids.filter(c => c.nodeType === 3 || c.nodeType === 1); const F = kids.findIndex(content); if (F < 0) return null; let L = kids.length - 1; while (!content(kids[L])) L--; return { kids, F, L }; };
  const mini = z => { let out = ''; const pieces = [];
    for (let k = z.F; k <= z.L; k++){ const c = z.kids[k]; if (c.nodeType === 3){ out += spaces(c.data); continue; }
      const kind = inline(c);
      if (kind === 'br') out += '\n';
      else if (kind === 'b' || kind === 'em'){ const t = spaces(c.textContent), mk = kind === 'b' ? '**' : '_'; out += (/^ /.test(t) ? ' ' : '') + mk + t.trim() + mk + (/ $/.test(t) ? ' ' : ''); }
      else if (kind === 'a') out += `[${spaces(c.textContent).trim()}](${c.getAttribute('href')})`;
      else { pieces.push(c); out += `{${pieces.length}}`; } }
    return { text: norm(out), pieces }; };
  const parse = s => { const out = [], re = /\{(\d{1,2})\}|\n|\[([^\[\]\n]{1,300})\]\(([^()\s]{1,500})\)|\*\*([^*\n]+?)\*\*|_([^_\n]+?)_/g; let last = 0, m;
    while ((m = re.exec(s))){ if (m.index > last) out.push({ t: 'text', v: s.slice(last, m.index) });
      if (m[1] !== undefined) out.push({ t: 'piece', n: +m[1] }); else if (m[0] === '\n') out.push({ t: 'br' });
      else if (m[2] !== undefined) out.push({ t: 'a', v: m[2], href: m[3] }); else if (m[4] !== undefined) out.push({ t: 'b', v: m[4] }); else out.push({ t: 'em', v: m[5] });
      last = re.lastIndex; }
    if (last < s.length) out.push({ t: 'text', v: s.slice(last) }); return out; };
  const external = h => /^https:\/\//i.test(h) && !/^https:\/\/([a-z0-9-]+\.)?ccfczambia\.org(\/|$)/i.test(h);
  const replaceZone = (el, z, nodes) => { const first = z.kids[z.F], last = z.kids[z.L], out = [...z.kids.slice(0, z.F)];
    if (first.nodeType === 3 && /^\s/.test(first.data)) out.push(document.createTextNode(' '));
    out.push(...nodes);
    if (last.nodeType === 3 && /\s$/.test(last.data)) out.push(document.createTextNode(' '));
    out.push(...z.kids.slice(z.L + 1)); el.replaceChildren(...out); };

  function text(el, value){
    const v = norm(dash(value)); if (!v || v.length > 2000 || tagLike.test(v) || parse(v).some(x => (x.t === 'text' && /\]\(/.test(x.v)) || (x.t === 'a' && !href(x.href)))) return;   /* ignored whole, as the build does */
    let z = zones(kidsOf(el)); if (!z || mini(z).text === v) return;   /* already showing it: nothing moves */
    const rich = el.hasAttribute('data-edit-rich'), [bTag, emTag] = (el.getAttribute('data-edit-rich') || '').split(' ');
    const split = isSplit(el); if (split){ unsplit(el); z = zones([...el.childNodes]); if (!z) return; }
    const { pieces } = mini(z); let nodes;
    if (!rich) nodes = [document.createTextNode(v)];
    else { nodes = []; const used = new Set();
      for (const x of parse(v)){
        if (x.t === 'text') nodes.push(document.createTextNode(x.v));
        else if (x.t === 'br') nodes.push(document.createElement('br'));
        else if (x.t === 'b' || x.t === 'em'){ const t = document.createElement(x.t === 'b' ? (bTag === 'strong' ? 'strong' : 'b') : (emTag === 'i' ? 'i' : 'em')); t.textContent = x.v; nodes.push(t); }
        else if (x.t === 'a'){ if (!href(x.href)){ nodes.push(document.createTextNode(x.v)); continue; } const a = document.createElement('a'); a.setAttribute('href', x.href); if (external(x.href)){ a.target = '_blank'; a.rel = 'noopener'; } a.textContent = x.v; nodes.push(a); }
        else { if (x.n < 1 || x.n > pieces.length || used.has(x.n)){ if (split) resplit(el); return; } used.add(x.n); nodes.push(pieces[x.n - 1]); } }
      if (used.size !== pieces.length){ if (split) resplit(el); return; } }
    replaceZone(el, z, nodes); if (split) resplit(el);
  }
  /* a value with any part out of bounds is ignored whole, exactly as the build does. isDefault: the original written by
     the build (data-edit-default) being put back; it passes the same link and photo allowlists as a stored change. */
  const srcsetOk = s => typeof s === 'string' && s.length <= 2000 && s.split(',').every(c => src(c.trim().split(/\s+/)[0]));
  function image(el, v, isDefault){
    if (!src(v.src)) return;
    if (v.alt != null && (typeof v.alt !== 'string' || (!isDefault && (v.alt.length > 300 || tagLike.test(v.alt))))) return;
    const alt = typeof v.alt === 'string' ? (isDefault ? v.alt : norm(dash(v.alt))) : null;
    if (el.getAttribute('src') !== v.src){ el.removeAttribute('srcset'); el.removeAttribute('sizes');
      if (isDefault && srcsetOk(v.srcset)){ el.setAttribute('srcset', v.srcset); if (typeof v.sizes === 'string' && /^[\w\s(),:.%-]{0,300}$/.test(v.sizes)) el.setAttribute('sizes', v.sizes); }
      el.setAttribute('src', v.src); }
    if (alt !== null && el.getAttribute('alt') !== alt) el.setAttribute('alt', alt);
  }
  function link(el, v, isDefault){
    const hasHref = v.href != null, hasLabel = v.label != null;
    if ((hasHref && !href(v.href)) || (hasLabel && (typeof v.label !== 'string' || !norm(v.label) || (!isDefault && (v.label.length > 200 || tagLike.test(v.label))))) || (!hasHref && !hasLabel)) return;
    const z = zones([...el.childNodes]), zone = z ? z.kids.slice(z.F, z.L + 1) : [];
    const labelled = !!z && zone.every(c => c.nodeType === 3 || (c.tagName === 'BR' && !c.attributes.length));
    if (!isDefault && hasLabel && !labelled) return;   /* a link made of several pieces has no single label to change */
    if (typeof v.href === 'string' && el.getAttribute('href') !== v.href) el.setAttribute('href', v.href);
    if (typeof v.label !== 'string' || !labelled) return;
    const label = isDefault ? v.label : norm(dash(v.label));
    if (norm(zone.map(c => c.nodeType === 3 ? spaces(c.data) : '\n').join('')) === label) return;
    replaceZone(el, z, label.split('\n').flatMap((l, i) => i ? [document.createElement('br'), document.createTextNode(l)] : [document.createTextNode(l)]));
  }
  function apply(el, kind, v, isDefault){
    if (!v || typeof v !== 'object') return;
    if (kind === 'text' && typeof v.text === 'string') text(el, v.text);
    else if (kind === 'image') image(el, v, isDefault);
    else if (kind === 'link') link(el, v, isDefault);
    else if (kind === 'section' && typeof v.visible === 'boolean'){ if (el.hasAttribute('data-pe-seen')) el.classList.toggle('pe-hidden', !v.visible); else if (el.hidden !== !v.visible) el.hidden = !v.visible; }
  }
  return { apply, text, parse, mini: el => { const z = zones(kidsOf(el)); return z ? mini(z).text : ''; } };
})();
const pageEditable = () => !IS_ADMIN && !!window.CCFC_SITE && PAGE_SITES.includes(window.CCFC_SITE.key);
const PAGE_KEY = /^(site|[a-z0-9][a-z0-9-]{0,60}):(text|image|link|section):[0-9a-f]{8}(-[0-9]{1,3})?$/;
async function applyPageContent(){
  if (!pageEditable()) return;
  /* the elements are taken before waiting on the network, so nothing added to the page later is ever patched */
  const els = $$('[data-edit]').filter(el => PAGE_KEY.test(el.dataset.edit)); if (!els.length) return;
  const keys = [...new Set(els.map(el => el.dataset.edit))];
  let rows = null;   /* stays null when the changes could not be read: then the page keeps what the build baked in */
  if (ready) try {
    const parts = await Promise.all(Array.from({ length: Math.ceil(keys.length / 150) }, (_, i) => keys.slice(i * 150, (i + 1) * 150))
      .map(chunk => sb.from('page_content').select('key, kind, value').eq('site', SITE_KEY).in('key', chunk).limit(chunk.length)));
    if (parts.every(p => !p.error && Array.isArray(p.data))) rows = parts.flatMap(p => p.data);
  } catch (_) {}
  if (!rows) return;
  const byKey = new Map(rows.map(r => [r.key, r]));
  for (const el of els){
    const key = el.dataset.edit, kind = key.split(':')[1], r = byKey.get(key);
    let v = r && r.kind === kind ? r.value : null, isDefault = false;
    if (!v && el.hasAttribute('data-edit-default')){ try { v = JSON.parse(el.getAttribute('data-edit-default')); isDefault = true; } catch (_) {} }
    try { PE.apply(el, kind, v, isDefault); } catch (_) {}
  }
}
function pageEditView(){
  if ($('.pe-bar')) return;
  const els = $$('[data-edit]'), site = SITES[SITE_KEY];
  document.documentElement.classList.add('pe-on');
  const mark = () => $$('section[data-edit]').forEach(s => { s.setAttribute('data-pe-seen', ''); if (s.hidden){ s.hidden = false; s.classList.add('pe-hidden'); } });
  mark();
  const bar = document.createElement('div'); bar.className = 'pe-bar'; bar.setAttribute('role', 'region'); bar.setAttribute('aria-label', 'Page editor');
  const off = new URL(location.href); off.searchParams.delete('edit');
  bar.innerHTML = `<b>Page editor</b><span class="pe-bar__t">${els.length} editable pieces. Click one to copy its key for Yuriel Prime.</span><button type="button" class="pe-bar__pick" aria-pressed="true">Picking</button><a class="pe-bar__x" href="${esc('/' + off.pathname.replace(/^\/+/, '') + off.search + off.hash)}">Exit</a>`;   /* one leading slash: never a //other-host address */
  const badge = document.createElement('div'); badge.className = 'pe-badge'; badge.hidden = true; badge.setAttribute('aria-hidden', 'true');
  document.body.append(bar, badge);
  let cur = null, picking = true;
  const kindWord = el => ({ text: /^H\d$/.test(el.tagName) ? 'heading' : el.tagName === 'LI' ? 'list item' : el.tagName === 'P' ? 'paragraph' : el.tagName === 'BUTTON' ? 'button' : 'text', image: 'photo', link: 'link', section: 'section' })[el.dataset.edit.split(':')[1]] || 'piece';
  const place = el => { cur = el; const r = el.getBoundingClientRect(); badge.textContent = `${kindWord(el)} ${el.dataset.edit}${el.classList.contains('pe-hidden') ? ' (hidden)' : ''}`; badge.hidden = false;
    badge.style.top = Math.max(bar.offsetHeight + 4, r.top - badge.offsetHeight - 2) + 'px'; badge.style.left = Math.min(innerWidth - badge.offsetWidth - 8, Math.max(8, r.left)) + 'px';
    $$('.pe-cur').forEach(x => x.classList.remove('pe-cur')); el.classList.add('pe-cur'); };
  const hint = el => { const key = el.dataset.edit, kind = key.split(':')[1], where = `on ${site.label}`;
    return kind === 'section' ? `Tell Prime: ${where}, ${el.classList.contains('pe-hidden') ? 'show' : 'hide'} section ${key}`
      : kind === 'image' ? `Tell Prime: ${where}, change photo ${key} to the attached photo`
      : kind === 'link' ? `Tell Prime: ${where}, change link ${key} to go to ... and read "..."`
      : `Tell Prime: ${where}, change ${key} to "..."`; };
  const copy = async el => { const h = hint(el); let ok = false;
    try { await navigator.clipboard.writeText(h); ok = true; } catch (_) { const t = document.createElement('textarea'); t.value = h; t.setAttribute('readonly', ''); t.style.cssText = 'position:fixed;opacity:0'; document.body.appendChild(t); t.select(); try { ok = document.execCommand('copy'); } catch (__) {} t.remove(); }
    toast(ok ? 'Copied: ' + h : h, ok); };
  document.addEventListener('mouseover', e => { if (!picking || e.target.closest('.pe-bar')) return; const el = e.target.closest('[data-edit]'); if (el && el !== cur) place(el); }, true);
  addEventListener('scroll', () => { if (cur && !badge.hidden) place(cur); }, { passive: true });
  addEventListener('resize', () => { if (cur && !badge.hidden) place(cur); });
  document.addEventListener('click', e => { if (!picking || e.target.closest('.pe-bar') || e.altKey) return; const el = e.target.closest('[data-edit]'); if (!el) return;
    e.preventDefault(); e.stopPropagation(); place(el); copy(el); }, true);
  const pick = $('.pe-bar__pick', bar);
  pick.addEventListener('click', () => { picking = !picking; pick.setAttribute('aria-pressed', String(picking)); pick.textContent = picking ? 'Picking' : 'Links work'; document.documentElement.classList.toggle('pe-on', picking); badge.hidden = !picking; if (!picking) $$('.pe-cur').forEach(x => x.classList.remove('pe-cur')); });
}

/* ================================================================ BOOT */
/* ================================================================ TOUR
   A short guided tour for new accounts. The first page someone opens on each site says what their role
   gives them there; each page with something to learn (the feed, the library, Account Center, the
   registration and join forms, each admin tab) gets its own few steps the first time it is opened, and
   pages with nothing account-specific stay quiet. Skip ends the tour on this page; "Turn off tips" ends it
   on every page. What has been seen is kept per account in a cookie on the shared domain, so it follows
   the person between the church sites. Accounts made before the tour shipped only see it after asking for
   it in Account Center ("Show me around again"). Every step's wording comes from the same ROLES, can and
   SITES the rest of the engine uses, so the tour can never describe access the account does not have. */
const TOUR_SINCE = '2026-09-25T00:00:00Z';
const Tour = (() => {
  const P = IS_ADMIN ? 'a' : ({ ccfc:'c', koinonia:'k', worship:'w' })[SITE_KEY] || 'c';
  const key = () => 'ccfc-tour-' + String(session?.user?.id || '').slice(0, 8);
  const read = () => { let raw = null; try { raw = sharedDomain ? cookieStore.getItem(key()) : localStorage.getItem(key()); } catch (_) {}
    try { const v = JSON.parse(raw || '{}'); return { s: Array.isArray(v.s) ? v.s : [], o: !!v.o, r: !!v.r }; } catch (_) { return { s: [], o: false, r: false }; } };
  const write = v => { const raw = JSON.stringify({ s: v.s.slice(-60), o: v.o ? 1 : 0, r: v.r ? 1 : 0 });
    try { if (sharedDomain) cookieStore.setItem(key(), raw); else localStorage.setItem(key(), raw); } catch (_) {} };
  const eligible = () => {
    if (!ready || !session || !profile || window.top !== window) return false;
    const q = new URLSearchParams(location.search); if (q.has('cap') || q.get('edit') === '1') return false;
    const v = read(); if (v.o) return false;
    return v.r || new Date(session.user.created_at || 0) >= new Date(TOUR_SINCE); };
  const r = () => role() || 'member';
  const and = xs => xs.length < 2 ? (xs[0] || '') : xs.slice(0, -1).join(', ') + ' and ' + xs[xs.length - 1];
  const first = () => String(profile?.full_name || '').trim().split(/\s+/)[0] || '';
  const ACCOUNT = '.nav__account .nav__avatar, .nav__menubtn, .nav__burger', YURIEL = '.nav__mazar, .mz__fab';
  const personal = 'These hold people\'s personal details: open them when there is a reason to.';
  const roleCard = rr => `<p class="tour__role"><b>${esc(ROLES[rr].label)}</b>${esc(ROLES[rr].desc)}</p>`;   /* the role guide's own wording */

  const welcome = () => {
    const rr = r(), links = IS_ADMIN ? [] : SITE.links(rr).filter(Boolean).map(([, l]) => l);
    if (IS_ADMIN) return [
      { title: 'Welcome to the admin panel', body: `<p>Your role here:</p>${roleCard(rr)}` },
      { sel: '.adm-sites', title: 'One site at a time', body: '<p>Switch between the church, Koinonia and Worship Connect here. The tabs change with the site.</p>' },
      { sel: '.dash__tabs', title: 'Your tabs', body: '<p>Only what your role can use appears here. Each tab shows you around the first time you open it.</p>' } ];
    return [
      { title: first() ? `Welcome, ${first()}` : 'Welcome', body: `<p>You are signed in to ${esc(SITE.label)}. Your role:</p>${roleCard(rr)}` },
      { sel: ACCOUNT, title: 'Your account menu', body: `<p>Everything your account opens on this site is here: ${esc(and(links))}.</p>` },
      { sel: YURIEL, title: 'Ask Yuriel', body: '<p>The church\'s AI Bible companion. Ask about the Bible or anything on this site. It can prepare a form or a calendar entry for you, but you always press the final button.</p>' } ];
  };
  const PAGES = {
    feed: () => [
      { sel: '#feed .feed__filters', title: SITE.feedLabel, body: `<p>Everything ${esc(SITE.feedWord)} shares, newest first. Filter by kind here.</p>` },
      { sel: '#feed .feed__list', title: 'Like and comment', body: `<p>Tap the heart to like a post, and open the comments to join in. ${can.moderate(r()) ? 'Your role can also remove a comment that is not right for the family.' : 'Comments are looked after by the church\'s leaders.'}</p>` },
      can.post(r(), SITE_KEY) ? { sel: '#feed .feed__composer', title: 'You can post here', body: `<p>Your role can post to ${esc(SITE.feedLabel)}. Everyone signed in sees what you post.</p>` } : null ],
    library: () => [
      { sel: '#library .lib__search', title: 'The Upper Room library', body: '<p>Books, notes and slides the church shares with its members. Search by title here.</p>' },
      { sel: '#library .lib__chips', title: 'Filter by kind', body: '<p>Narrow the shelf to one kind of material.</p>' },
      can.library(r()) ? { sel: '#library .lib__add', title: 'You can add material', body: '<p>Your role can upload to the library. Everyone signed in can open what you add.</p>' } : null ],
    account: () => [
      { sel: '#account .acct__photo', title: 'Your photo', body: '<p>Other members see your name, photo and role, and nothing else.</p>' },
      { sel: '#account .acct__form', title: 'Your details', body: '<p>Your name and phone number. Only the church\'s administrators can see your phone number and email address.</p>' },
      { sel: '#account .acct__apps', title: 'Connected apps', body: '<p>Connect Yuriel to sign in there with this account. Your Yuriel conversations stay private to you.</p>' },
      { sel: '#account .acct__meta', title: 'Your role', body: '<p>What your role can do and how you sign in. <b>Show me around again</b> brings this tour back whenever you want it.</p>' } ],
    register: () => [
      { sel: 'form.reg:not(.join)', title: "Register for Koi 26'", body: '<p>One form per person. You get a registration number and a confirmation email straight away, with the delegate fee that applies to you. The email confirms your registration, not payment.</p>' },
      { sel: YURIEL, title: 'Yuriel can fill it in', body: '<p>Ask Yuriel to register you and it fills in this form for you to check. You always press submit yourself.</p>' } ],
    join: () => [
      { sel: 'form.join', title: 'Join Worship Connect', body: '<p>Tell the team about yourself and your gifts. The team\'s leaders read every application and get in touch.</p>' } ],
    yuriel: () => [
      { sel: '#mazar-page', title: 'Yuriel', body: '<p>Ask anything about the Bible or the church, open a passage in the Bible tab, or ask it to prepare a small job. For your conversations on every device, use yuriel.ccfczambia.org.</p>' } ],
    /* the admin panel's tabs, one tour each, whichever site they are opened on */
    assistant: () => [ { sel: '.dash__tab.is-on', title: 'Yuriel Prime', body: '<p>Ask it to change, check or write something. It plans first, shows exactly what would change, and does nothing until you press <b>Apply</b>. Never paste anybody\'s personal details into it.</p>' } ],
    posts: () => [ { sel: '.dash__panel .feed__composer', title: 'Post to this site', body: '<p>Write news or an announcement, or add photos and videos. Everyone signed in sees it in the site\'s feed. Below, edit, pin or remove what has been posted.</p>' } ],
    settings: () => [ { sel: '.dash__tab.is-on', title: 'Site text', body: '<p>Short texts the office changes often, like the service note. A change shows on the site straight away, and Yuriel answers from it too.</p>' } ],
    regs: () => [ { sel: '.dash__tab.is-on', title: 'Registrations', body: `<p>Everyone registered for Koinonia, each with their registration number. Deleting a registration here also removes its copy in Google Drive. ${personal}</p>` } ],
    apps: () => [ { sel: '.dash__tab.is-on', title: 'Applications', body: `<p>People asking to join Worship Connect. Move each one on as you get in touch. ${personal}</p>` } ],
    team: () => [ { sel: '.dash__tab.is-on', title: 'The team', body: '<p>Who appears on the public team page, their roles, and which tab they sit under there: Worshipers or Media.</p>' } ],
    library_tab: () => [ { sel: '.dash__tab.is-on', title: 'Upper Room library', body: '<p>Add, edit and remove material. Everyone signed in can open what is here.</p>' } ],
    users: () => [ { sel: '.dash__tab.is-on', title: 'Members and roles', body: `<p>Everyone with an account and the role they hold.${can.master(r()) ? '' : ' Your role can change any role except an Admin\'s.'} Every change is written to Role changes. ${personal}</p>` } ],
    audit: () => [ { sel: '.dash__tab.is-on', title: 'Role changes', body: '<p>Every role change: who made it, and when.</p>' } ],
    roles: () => [ { sel: '.dash__tab.is-on', title: 'Role guide', body: '<p>What each role can do. When someone asks what they are allowed to do, this is the answer.</p>' } ],
  };
  /* which of the pages above this is, from what it contains */
  const pageOf = () => $('#feed') ? 'feed' : $('#library') ? 'library' : $('#account') ? 'account' : $('form.join') ? 'join'
    : $('form.reg') ? 'register' : $('#mazar-page') ? 'yuriel' : null;

  const visible = el => { if (!el || !el.getClientRects().length) return false; const b = el.getBoundingClientRect(), cs = getComputedStyle(el);
    return b.width > 0 && b.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none'; };
  const pick = sel => { for (const s of sel.split(',')) { const el = $$(s.trim()).find(visible); if (el) return el; } return null; };
  const later = ms => new Promise(res => setTimeout(res, ms));
  const blocked = () => $$('.consent, .auth.is-open, .sure, .tour').some(visible);   /* never on top of the cookie choice, sign-in or a confirmation */
  async function whenClear(){ for (let i = 0; i < 400 && blocked(); i++) await later(600); return !blocked(); }
  async function find(sel){ for (let i = 0; i < 32; i++) { const el = pick(sel); if (el) return el; await later(250); } return null; }

  let busy = false;
  async function run(keys, steps){
    steps = steps.filter(Boolean); if (!steps.length || busy) return; busy = true;
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches, back = document.activeElement;
    const root = document.createElement('div'); root.className = 'tour'; root.dataset.site = SITE_KEY;
    root.innerHTML = `<div class="tour__hole" hidden></div><div class="tour__card" role="dialog" aria-modal="true" aria-labelledby="tour-t" aria-describedby="tour-b">
      <p class="tour__count" aria-hidden="true"></p><h2 class="tour__title" id="tour-t" aria-live="polite"></h2><div class="tour__body" id="tour-b"></div>
      <div class="tour__btns"><button type="button" class="tour__skip">Skip</button><span class="tour__gap"></span><button type="button" class="btn btn--ghost tour__back">Back</button><button type="button" class="btn tour__next">Next</button></div>
      <button type="button" class="tour__off">Turn off tips on every page</button></div>`;
    document.body.appendChild(root);
    const hole = $('.tour__hole', root), card = $('.tour__card', root), nextB = $('.tour__next', root), backB = $('.tour__back', root);
    let i = -1, el = null, frame = 0, moving = false;   /* the controls wait while a step is being found and drawn */
    const place = () => {
      const vw = innerWidth, vh = innerHeight, sheet = vw < 640;
      root.classList.toggle('is-center', !el); root.classList.toggle('is-sheet', !!el && sheet);
      if (!el){ hole.hidden = true; card.style.top = card.style.left = ''; return; }
      const b = el.getBoundingClientRect(), pad = 8, top = Math.max(b.top - pad, 6), bottom = Math.min(b.bottom + pad, vh - 6);
      hole.hidden = false; Object.assign(hole.style, { top: top + 'px', left: (b.left - pad) + 'px', width: (b.width + pad * 2) + 'px', height: Math.max(bottom - top, 24) + 'px' });
      if (sheet){ card.style.top = card.style.left = ''; return; }
      const cw = card.offsetWidth, ch = card.offsetHeight, gap = 14;
      let y = bottom + gap; if (y + ch > vh - 12) y = top - gap - ch; if (y < 12) y = Math.max(12, vh - ch - 12);
      card.style.top = y + 'px'; card.style.left = Math.max(12, Math.min(vw - cw - 12, b.left + b.width / 2 - cw / 2)) + 'px'; };
    const onMove = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(place); };
    const close = how => {
      removeEventListener('resize', onMove); removeEventListener('scroll', onMove, true); removeEventListener('keydown', onKey, true);
      const v = read(); if (how === 'off') v.o = true; else keys.forEach(k => { if (!v.s.includes(k)) v.s.push(k); }); write(v);
      root.remove(); busy = false; if (back && back.focus && document.contains(back)) back.focus({ preventScroll: true }); };
    const go = async n => {
      if (moving) return; if (n < 0) n = 0; if (n >= steps.length) return close('done');
      moving = true; root.setAttribute('aria-busy', 'true');
      const s = steps[n];
      el = s.sel ? await find(s.sel) : null;   /* a slow page that never drew the target still gets the words, centred, rather than losing the step */
      i = n;
      if (el){ const nav = el.closest('.nav'); if (nav) nav.classList.remove('is-hidden');
        if (!el.closest('.nav, .mz__fab')) el.scrollIntoView({ block: 'center', behavior: reduce ? 'auto' : 'smooth' }); await later(reduce ? 0 : 320); }
      $('.tour__count', root).textContent = steps.length > 1 ? `${i + 1} of ${steps.length}` : '';
      $('.tour__title', root).textContent = s.title; $('.tour__body', root).innerHTML = s.body;
      backB.hidden = i === 0; nextB.textContent = i === steps.length - 1 ? 'Done' : 'Next';
      place(); moving = false; root.removeAttribute('aria-busy'); requestAnimationFrame(() => { root.classList.add('is-in'); nextB.focus({ preventScroll: true }); }); };
    const onKey = e => {
      if (e.key === 'Escape'){ e.preventDefault(); close('skip'); return; }
      if (moving) return;
      if (e.key === 'ArrowRight'){ e.preventDefault(); go(i + 1); return; }
      if (e.key === 'ArrowLeft' && i > 0){ e.preventDefault(); go(i - 1); return; }
      if (e.key === 'Tab'){ const f = $$('button:not([hidden])', card); const at = f.indexOf(document.activeElement);
        e.preventDefault(); f[(at + (e.shiftKey ? -1 : 1) + f.length) % f.length].focus(); } };
    nextB.addEventListener('click', () => go(i + 1)); backB.addEventListener('click', () => go(i - 1));
    $('.tour__skip', root).addEventListener('click', () => close('skip')); $('.tour__off', root).addEventListener('click', () => close('off'));
    addEventListener('resize', onMove); addEventListener('scroll', onMove, true); addEventListener('keydown', onKey, true);
    go(0);
  }
  /* A page, or an admin tab, was opened: show its tour if this account has not seen it, after the site's welcome if that is new too. */
  async function page(name){
    if (!eligible() || busy || !(await whenClear()) || !eligible()) return;
    const seen = read().s, keys = [], steps = [];
    if (!seen.includes(P + ':welcome')){ keys.push(P + ':welcome'); steps.push(...welcome()); }
    const tab = name === 'library' && IS_ADMIN ? 'library_tab' : name;
    if (name && PAGES[tab] && !seen.includes(P + ':' + name)){ keys.push(P + ':' + name); steps.push(...PAGES[tab]()); }
    if (keys.length) run(keys, steps); }
  return {
    start(){ if (IS_ADMIN) return; later(900).then(() => page(pageOf())); },   /* the admin panel starts its tour from each tab as it opens */
    page,
    replay(){ write({ s: [], o: false, r: true }); location.reload(); },
  };
})();

async function boot(){
  Consent.init();
  const pageContent = applyPageContent();   /* starts straight away; the ?edit=1 view waits for the sign-in below */
  const modal = authModal();
  if (ready){
    /* Restoring a session can throw, and it can also simply never settle. Either way boot used to
       stop here, so no page rendered at all: the feed kept the empty list it shipped with and the
       library kept its untouched gate, with nothing in the console to say why. Boot now carries on
       after six seconds and treats the visitor as signed out; the auth listener below reloads the
       page if the session turns up late. */
    const restore = (async () => { const { data } = await sb.auth.getSession(); session = data.session; await loadProfile(); })();
    try { await Promise.race([restore, new Promise((_, stop) => setTimeout(() => stop(new Error('auth-slow')), 6000))]); }
    catch (e) { if (e && e.message !== 'auth-slow'){ session = null; profile = null; } }
    goneNote();
    if (location.hash === '' && location.href.endsWith('#')) history.replaceState(null, '', location.pathname + location.search);
    /* Reload once when someone signs in or out so role-dependent pages re-render. Guarded so it can never loop. */
    let lastUid = session?.user?.id || null; const RL = 'ccfc:reloaded-for';
    const mem = (k, v) => { try { return v === undefined ? sessionStorage.getItem(k) : sessionStorage.setItem(k, v); } catch (_) { return null; } };
    if (lastUid) mem(RL, lastUid);
    sb.auth.onAuthStateChange(async (e, s) => {
      if (e !== 'SIGNED_IN' && e !== 'SIGNED_OUT') return;
      const uid = s?.user?.id || null; if (uid === lastUid) return;
      lastUid = uid; session = s; await loadProfile(); accountUI(modal);
      const key = uid || 'signed-out'; if (mem(RL) === key) return goneNote(); mem(RL, key);
      if ($('#feed,#dashboard,#library,#account,#leadership')){ if (location.hash) history.replaceState(null, '', location.pathname + location.search); location.reload(); } else goneNote();
    });
    if (new URLSearchParams(location.search).get('reset')){ const p = prompt('Choose a new password (at least 8 characters)'); if (p && p.length >= 8){ const { error } = await sb.auth.updateUser({ password:p }); toast(error ? friendly(error) : 'Password updated.', !error); } } }
  const safe = (what, run) => { try { const r = run(); if (r && r.catch) r.catch(e => console.error('CCFC ' + what, e)); }
    catch (e) { console.error('CCFC ' + what, e); } };
  safe('account bar', () => accountUI(modal));
  safe('settings', applySettings); safe('feed', () => feedPage(modal));
  safe('library', () => libraryPage(modal)); safe('dashboard', () => dashboardPage(modal)); safe('team', teamPage);
  safe('account', () => accountPage(modal));
  safe('tour', () => Tour.start());
  if (new URLSearchParams(location.search).get('edit') === '1' && pageEditable() && can.master(role())) pageContent.then(pageEditView, pageEditView);
  if (new URLSearchParams(location.search).get('signin')) modal.open('in');
}
document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', boot) : boot();
})();
