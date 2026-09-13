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
  leader:       { label:'Leader',  short:'Leader',  desc:'Posts announcements, moderates comments, reviews applications and adds material to the Upper Room library.' },
  media:        { label:'Media',   short:'Media',   desc:'Posts photos, videos and content to the CCFC, Koinonia and Worship Connect feeds.' },
  blogger:      { label:'Blogger', short:'Blogger', desc:'Writes, publishes and updates blog posts, and adds material to the Upper Room library.' },
  member:       { label:'Member',  short:'Member',  desc:'Follows the feed and the blog, comments and reacts.' },
};
const ADMINS = ['master_admin','admin'];
const can = {
  post: r => ['master_admin','admin','leader','media'].includes(r),
  blog: r => ['master_admin','admin','blogger'].includes(r),
  moderate: r => ['master_admin','admin','leader'].includes(r),
  library: r => ['master_admin','admin','leader','blogger'].includes(r),   /* who may add to the Upper Room; reading is open to all */
  staff: r => r && r !== 'member',
  admin: r => ADMINS.includes(r),
};
const KINDS = { news:'News', announcement:'Announcement', photo:'Photos', video:'Video', music:'Music' };
/* ---------- the three sites: identity, pages, what the feed is called, which post kinds it uses ---------- */
const SITES = {
  ccfc:     { label:'CCFC Zambia', short:'CCFC', origin:'https://ccfczambia.org', feed:'feed.html', feedLabel:'Church feed', feedWord:'the family',
              kinds:['news','photo','video','announcement'], logo:'assets/logo/ccfc-mark.png?v=2', dashTitle:'Church dashboard',
              links: r => [['feed.html','Church feed'], ['blog.html','Blog'], ['library.html','Upper Room library'], can.staff(r) ? ['dashboard.html','Dashboard'] : null] },
  koinonia: { label:'Koinonia Experience', short:'Koinonia', origin:'https://koinonia.ccfczambia.org', feed:'updates.html', feedLabel:'Conference updates', feedWord:'everyone coming to Koinonia',
              kinds:['news','announcement','video','photo'], logo:'assets/logo/ccfc-mark.png?v=2', dashTitle:'Koinonia dashboard',
              links: r => [['updates.html','Updates'], ['k26.html#register','Register for K26'], can.staff(r) ? ['dashboard.html','Dashboard'] : null] },
  worship:  { label:'Worship Connect', short:'Worship', origin:'https://worship.ccfczambia.org', feed:'latest.html', feedLabel:'Latest from the team', feedWord:'the team',
              kinds:['video','music','photo','news'], logo:'assets/logo/ccfc-mark-white.png?v=2', dashTitle:'Worship Connect dashboard',
              links: r => [['latest.html','Latest'], ['team.html','The team'], ['join.html','Join the team'], can.staff(r) ? ['dashboard.html','Dashboard'] : null] },
};
const SITE_KEY = (window.CCFC_SITE && SITES[window.CCFC_SITE.key]) ? window.CCFC_SITE.key : 'ccfc';
const SITE = Object.assign({}, SITES[SITE_KEY], window.CCFC_SITE || {});

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
const OFFLINE = 'Accounts are not switched on yet. The church team is finishing setup.';
const ICO = {
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
    $$('.nav__signout', slot).forEach(b => b.addEventListener('click', async () => { await sb.auth.signOut(); location.href = 'index.html'; }));
  });
  $$('[data-auth]').forEach(b => { if (b._bound) return; b._bound = true; b.addEventListener('click', e => { e.preventDefault(); modal.open(b.dataset.auth || 'in'); }); });
  $$('[data-role-gate]').forEach(el => { const need = el.dataset.roleGate.split(','); el.hidden = !(role() && (need.includes('staff') ? can.staff(role()) : need.includes(role()))); });
}
async function loadProfile(){ if (!session){ profile = null; return; }
  let { data } = await sb.from('profiles').select('*').eq('id', session.user.id).maybeSingle();
  if (!data){   /* first sign-in through Google / Facebook before the trigger row is visible: create a Member profile */
    const u = session.user, m = u.user_metadata || {};
    const row = { id:u.id, email:u.email || m.email || '', full_name: m.full_name || m.name || (u.email||'').split('@')[0] || '', avatar_url: m.avatar_url || m.picture || null, role:'member' };
    const ins = await sb.from('profiles').insert(row).select('*').maybeSingle();
    data = ins.data || (await sb.from('profiles').select('*').eq('id', u.id).maybeSingle()).data || row;
  }
  profile = data; }

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
  const menu = (mine || can.admin(r)) ? `<div class="post__menu"><button class="post__more" aria-label="Post options" aria-haspopup="true">${ICO.more}</button><div class="post__menuList" hidden>${can.admin(r) ? `<button class="post__pin">${p.pinned ? 'Unpin from top' : 'Pin to top'}</button>` : ''}<button class="post__del">Delete post</button></div></div>` : '';
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
    const { data } = await sb.from('comments').select('id, body, created_at, author_id, profiles(full_name, avatar_url)').eq(key, id).order('created_at');
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
async function feedPage(modal){
  const root = $('#feed'); if (!root) return; const site = root.dataset.site || SITE_KEY;
  const list = $('.feed__list', root), composerSlot = $('.feed__composer', root), filters = $('.feed__filters', root);
  if (!ready){ list.innerHTML = `<div class="empty"><h3>The feed is almost ready</h3><p>Accounts and the feed switch on as soon as the church team finishes setup. Follow us on Facebook in the meantime.</p></div>`; return; }
  const q = new URLSearchParams(location.search); let kind = q.get('kind') || '', page = 0; const PAGE = 20; let mine = new Set(); const lb = lightbox();
  if (filters){ const kinds = ['', ...SITES[site].kinds]; filters.innerHTML = kinds.map(k => `<button class="chip ${k === kind ? 'is-on' : ''}" data-k="${k}">${k ? KINDS[k] : 'All'}</button>`).join('');
    $$('.chip', filters).forEach(b => b.addEventListener('click', () => { kind = b.dataset.k; $$('.chip', filters).forEach(x => x.classList.toggle('is-on', x === b)); history.replaceState(null, '', location.pathname + (kind ? `?kind=${kind}` : '')); page = 0; load(); })); }
  if (can.post(role())) composer(composerSlot, site, () => { page = 0; load(); }); else if (composerSlot) composerSlot.innerHTML = '';
  async function load(append=false){
    if (!append) list.innerHTML = '<div class="skel"></div><div class="skel"></div><div class="skel"></div>';
    let qry = sb.from('feed').select('*').eq('site', site).order('pinned', { ascending:false }).order('created_at', { ascending:false }).range(page*PAGE, page*PAGE + PAGE - 1);
    if (kind) qry = qry.eq('kind', kind);
    const want = q.get('post'); if (want && !append && !kind){ const { data:one } = await sb.from('feed').select('*').eq('id', want).maybeSingle(); if (one){ qry = qry.neq('id', want); var first = one; } }
    const { data, error } = await qry;
    if (error){ list.innerHTML = `<div class="empty"><h3>Could not load the feed</h3><p>${esc(error.message)}</p></div>`; return; }
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
    if (more){ more.addEventListener('click', () => { ml.hidden = !ml.hidden; }); document.addEventListener('click', e => { if (!el.contains(e.target)) ml.hidden = true; });
      $('.post__del', el)?.addEventListener('click', async () => { if (!confirm('Delete this post?')) return; const { error } = await sb.from('posts').delete().eq('id', p.id); if (error) toast(friendly(error), false); else { el.remove(); toast('Post deleted.'); } });
      $('.post__pin', el)?.addEventListener('click', async () => { const { error } = await sb.from('posts').update({ pinned: !p.pinned }).eq('id', p.id); if (error) toast(friendly(error), false); else { toast(p.pinned ? 'Unpinned.' : 'Pinned to the top.'); page = 0; load(); } }); }
  }
  load();
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
        <button class="btn cmp__submit" type="submit">Post ${ICO.arrow}</button>
      </div>
      <div class="cmp__status" aria-live="polite"></div>
    </div></form>`;
  const f = $('.cmp', slot), body = $('.cmp__body', f), col = $('.cmp__collapsed', f), title = $('.cmp__title', f), text = $('.cmp__text', f), files = $('input[name=files]', f), prev = $('.cmp__preview', f), status = $('.cmp__status', f), yt = $('.cmp__yt', f), ytIn = $('input[name=youtube]', f), ytPrev = $('.cmp__ytprev', f), drop = $('.cmp__drop', f), count = $('.cmp__count', f), submit = $('.cmp__submit', f);
  let picked = [];
  const open = () => { col.hidden = true; body.hidden = false; title.focus(); }; const close = () => { body.hidden = true; col.hidden = false; };
  $('.cmp__open', f).addEventListener('click', open); $('.cmp__close', f).addEventListener('click', close);
  if (new URLSearchParams(location.search).get('compose')) open();
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
  f.addEventListener('submit', async e => { e.preventDefault(); const t = title.value.trim(); if (!t){ status.textContent = 'Give the post a headline.'; status.className = 'cmp__status is-err'; title.focus(); return; }
    submit.disabled = true; status.className = 'cmp__status';
    try { const media = []; const id = ytId(ytIn.value); if (id) media.push({ type:'youtube', id });
      for (let i = 0; i < picked.length; i++){ status.textContent = `Uploading ${i+1} of ${picked.length}...`; const u = await uploadTo('feed', picked[i], profile.id); media.push({ type:u.type, url:u.url, path:u.path }); }
      status.textContent = 'Publishing...';
      const kind = f.kind.value; const { error } = await sb.from('posts').insert({ site, author_id: profile.id, title:t, body: text.value.trim(), kind, media, pinned: !!(f.pinned && f.pinned.checked) }); if (error) throw error;
      f.reset(); picked = []; renderPreview(); ytPrev.innerHTML = ''; yt.hidden = ytPrev.hidden = drop.hidden = true; text.style.height = ''; $$('.cmp__kinds .chip', f).forEach((c,i) => c.classList.toggle('is-on', !i));
      status.textContent = ''; close(); toast('Posted.'); onPosted && onPosted();
    } catch (err){ status.textContent = friendly(err); status.className = 'cmp__status is-err'; } finally { submit.disabled = false; } });
}

/* ---------- BLOG ---------- */
async function blogPage(modal){
  const root = $('#blog'); if (!root) return; const list = $('.blog__list', root), single = $('.blog__single', root), editorSlot = $('.blog__editor', root);
  if (!ready){ list.innerHTML = `<div class="empty"><h3>The blog is almost ready</h3><p>Articles from the CCFC bloggers will appear here once accounts are switched on.</p></div>`; return; }
  const slug = new URLSearchParams(location.search).get('post');
  if (can.blog(role())) editorSlot.innerHTML = `<div class="row"><button class="btn btn--navy blog__new">Write a post</button><a class="link" href="dashboard.html?site=ccfc&tab=blogs">Manage my posts</a></div>`;
  $('.blog__new', root)?.addEventListener('click', () => { editorSlot.innerHTML = ''; blogEditor(editorSlot, null, () => location.href = 'blog.html'); editorSlot.scrollIntoView({ behavior:'smooth' }); });
  if (slug){ list.hidden = true; single.hidden = false;
    const { data:b } = await sb.from('blog_feed').select('*').eq('slug', slug).maybeSingle();
    if (!b){ single.innerHTML = `<div class="empty"><h3>Post not found</h3><p><a class="link" href="blog.html">Back to the blog</a></p></div>`; return; }
    document.title = `${b.title} | CCFC Blog`;
    single.innerHTML = `<article class="article"><a class="link" href="blog.html">All posts</a><h1>${esc(b.title)}</h1><p class="article__meta">By ${esc(b.author_name)} &middot; ${esc(when(b.published_at || b.created_at))}${b.tags?.length ? ' &middot; ' + b.tags.map(esc).join(', ') : ''}</p>
      ${b.cover_url ? `<img class="article__cover" src="${esc(b.cover_url)}" alt="">` : ''}<div class="article__body">${md(b.body)}</div>
      ${(profile && (profile.id === b.author_id || can.admin(role()))) ? '<div class="row mt-2"><button class="btn btn--ghost blog__edit">Edit this post</button></div>' : ''}
      <h3 class="mt-3">Comments</h3><div class="post__comments blog__comments"></div></article>`;
    const loadC = wireComments($('.blog__comments', single), 'blog_id', b.id, modal); loadC();
    $('.blog__edit', single)?.addEventListener('click', () => { editorSlot.innerHTML=''; blogEditor(editorSlot, b, () => location.reload()); editorSlot.scrollIntoView({ behavior:'smooth' }); });
    return; }
  const { data, error } = await sb.from('blog_feed').select('*').order('published_at', { ascending:false }).limit(30);
  if (error){ list.innerHTML = `<div class="empty"><h3>Could not load the blog</h3><p>${esc(error.message)}</p></div>`; return; }
  if (!data?.length){ list.innerHTML = `<div class="empty"><h3>No articles yet</h3><p>The first blog post will appear here.</p></div>`; return; }
  list.innerHTML = data.map((b,i) => `<a class="bcard ${i===0?'bcard--lead':''}" href="blog.html?post=${esc(b.slug)}"><div class="ph">${b.cover_url ? `<img src="${esc(b.cover_url)}" alt="" loading="lazy">` : `<span class="bcard__mono">${esc(initials(b.title))}</span>`}</div><div class="bcard__body"><span class="bcard__meta">${esc(b.author_name)} &middot; ${esc(when(b.published_at || b.created_at))}</span><h3>${esc(b.title)}</h3><p>${esc(b.excerpt)}</p><span class="link">Read ${b.comment_count ? `&middot; ${b.comment_count} comments` : ''}</span></div></a>`).join('');
}
function blogEditor(slot, b, onDone){
  slot.innerHTML = `<form class="compose blogform" novalidate><div class="compose__head"><b>${b ? 'Edit post' : 'New blog post'}</b></div>
    <div class="field"><label for="b-title">Title</label><input id="b-title" name="title" required maxlength="140" value="${esc(b?.title||'')}"></div>
    <div class="field"><label for="b-excerpt">Excerpt (one or two sentences shown in the list)</label><input id="b-excerpt" name="excerpt" maxlength="240" value="${esc(b?.excerpt||'')}"></div>
    <div class="field"><label for="b-body">Body</label><textarea id="b-body" name="body" rows="14" placeholder="Write here. Use ## for a heading, - for a list, **bold**.">${esc(b?.body||'')}</textarea></div>
    <div class="compose__row"><div class="field"><label for="b-tags">Tags (comma separated)</label><input id="b-tags" name="tags" value="${esc((b?.tags||[]).join(', '))}"></div><div class="field"><label for="b-cover">Cover image</label><input id="b-cover" name="cover" type="file" accept="image/*"></div></div>
    <div class="row"><button class="btn" type="submit" data-pub="1">${b?.published ? 'Update' : 'Publish'}</button><button class="btn btn--ghost" type="submit" data-pub="0">Save as draft</button>${b ? '<button class="btn btn--ghost blog__delete" type="button">Delete</button>' : ''}<span class="form__status" aria-live="polite"></span></div></form>`;
  const f = $('.blogform', slot), status = $('.form__status', f); let pub = true;
  $$('button[type=submit]', f).forEach(x => x.addEventListener('click', () => pub = x.dataset.pub === '1'));
  f.addEventListener('submit', async e => { e.preventDefault(); const title = f.title.value.trim(); if (!title){ status.textContent = 'Give the post a title.'; status.className='form__status is-err'; return; }
    status.className='form__status'; status.textContent = 'Saving...';
    try { let cover_url = b?.cover_url || null; if (f.cover.files[0]) cover_url = (await uploadTo('feed', f.cover.files[0], 'blog/' + profile.id)).url;
      const row = { title, excerpt: f.excerpt.value.trim(), body: f.body.value, tags: f.tags.value.split(',').map(s => s.trim()).filter(Boolean), cover_url, published: pub, published_at: pub ? (b?.published_at || new Date().toISOString()) : null };
      const { error } = b ? await sb.from('blogs').update(row).eq('id', b.id) : await sb.from('blogs').insert({ ...row, author_id: profile.id, slug: slugify(title) + '-' + Math.random().toString(36).slice(2,6) });
      if (error) throw error; toast(pub ? 'Published.' : 'Draft saved.'); onDone && onDone();
    } catch (err){ status.textContent = friendly(err); status.className='form__status is-err'; } });
  $('.blog__delete', f)?.addEventListener('click', async () => { if (!confirm('Delete this post?')) return; const { error } = await sb.from('blogs').delete().eq('id', b.id); if (error) toast(error.message, false); else location.href = 'blog.html'; });
}

/* ---------- UPPER ROOM LIBRARY (leaders and above) ---------- */
async function libraryPage(modal){
  const root = $('#library'); if (!root) return; const gate = $('.lib__gate', root), app = $('.lib__app', root);
  if (!ready){ gate.innerHTML = `<h2>Almost ready</h2><p class="sub">The library opens as soon as accounts are switched on.</p>`; return; }
  gate.hidden = true; app.hidden = false;
  const list = $('.lib__list', app), up = $('.lib__upload', app), search = $('.lib__search', app), filter = $('.lib__filter', app);
  const KINDS = { book:'Book', slides:'Slides', notes:'Notes', audio:'Audio', video:'Video', other:'Other' };
  if (can.library(role())) up.innerHTML = `<form class="compose" novalidate><div class="compose__head"><b>Add material</b><span class="pill">${esc(ROLES[role()].short)}</span></div>
    <div class="compose__row"><div class="field"><label for="l-title">Title</label><input id="l-title" name="title" required maxlength="160"></div><div class="field"><label for="l-series">Series or topic</label><input id="l-series" name="series" placeholder="Book of Acts, Foundations, Leadership..."></div></div>
    <div class="compose__row"><div class="field"><label for="l-kind">Type</label><select id="l-kind" name="kind">${Object.entries(KINDS).map(([k,v]) => `<option value="${k}">${v}</option>`).join('')}</select></div><div class="field"><label for="l-file">File (PDF, PowerPoint, Word, audio, up to 100 MB)</label><input id="l-file" name="file" type="file" required></div></div>
    <div class="field"><label for="l-desc">Description</label><textarea id="l-desc" name="description" rows="3"></textarea></div>
    <div class="row"><button class="btn" type="submit">Upload</button><span class="form__status" aria-live="polite"></span></div></form>`;
  const f = $('form', up) || document.createElement('form'), status = $('.form__status', f) || document.createElement('span');
  f.addEventListener('submit', async e => { e.preventDefault(); const file = f.file.files[0]; if (!f.title.value.trim() || !file){ status.textContent = 'Title and file are required.'; status.className='form__status is-err'; return; }
    status.className='form__status'; status.textContent = 'Uploading...';
    try { const u = await uploadTo('library', file, (f.series.value.trim() ? slugify(f.series.value) : 'general'));
      const { error } = await sb.from('library_items').insert({ uploader_id: profile.id, kind: f.kind.value, title: f.title.value.trim(), description: f.description.value.trim(), series: f.series.value.trim(), path: u.path, file_name: file.name, size_bytes: file.size }); if (error) throw error;
      f.reset(); status.textContent = 'Added to the library.'; status.className='form__status is-ok'; load();
    } catch (err){ status.textContent = friendly(err); status.className='form__status is-err'; } });
  let items = [];
  async function load(){ const { data } = await sb.from('library_items').select('*, profiles(full_name)').order('created_at', { ascending:false }); items = data || []; render(); }
  function render(){ const q = (search.value||'').toLowerCase(), k = filter.value;
    const rows = items.filter(i => (!k || i.kind === k) && (!q || (i.title + i.series + i.description).toLowerCase().includes(q)));
    if (!rows.length){ list.innerHTML = `<div class="empty"><h3>Nothing here yet</h3><p>Books, notes and slides will appear here as leaders and bloggers add them.</p></div>`; return; }
    const groups = {}; rows.forEach(i => (groups[i.series || 'General'] ||= []).push(i));
    list.innerHTML = Object.entries(groups).map(([s, its]) => `<h3 class="lib__series">${esc(s)}</h3><div class="lib__grid">${its.map(i => `<div class="libcard" data-id="${i.id}"><span class="libcard__kind">${esc(KINDS[i.kind]||i.kind)}</span><b>${esc(i.title)}</b><p>${esc(i.description)}</p><span class="libcard__meta">${esc(i.file_name)} &middot; ${fmtBytes(i.size_bytes)} &middot; ${esc(i.profiles?.full_name||'')} &middot; ${esc(when(i.created_at))}</span><div class="row"><button class="btn btn--navy lib__open">Open</button>${(profile.id === i.uploader_id || can.admin(role())) ? '<button class="pill lib__del">Delete</button>' : ''}</div></div>`).join('')}</div>`).join('');
    $$('.lib__open', list).forEach(b => b.addEventListener('click', async () => { const it = items.find(x => x.id === b.closest('.libcard').dataset.id); window.open(sb.storage.from('library').getPublicUrl(it.path).data.publicUrl, '_blank'); }));
    $$('.lib__del', list).forEach(b => b.addEventListener('click', async () => { const it = items.find(x => x.id === b.closest('.libcard').dataset.id); if (!confirm(`Delete "${it.title}"?`)) return; await sb.storage.from('library').remove([it.path]); const { error } = await sb.from('library_items').delete().eq('id', it.id); if (error) toast(error.message, false); else load(); }));
  }
  search.addEventListener('input', render); filter.addEventListener('change', render); load();
}

/* ================================================================ DASHBOARDS: one per site */
const DASH = {
  ccfc:     { eyebrow:'Christ Connect Family Church Zambia', intro:'Everything the church posts, publishes and keeps for its leaders.',
              stats: s => [['Members', s?.users], ['New this month', s?.new_users_30d], ['Feed posts', s?.posts], ['Blog posts', s?.blogs], ['Library items', s?.library]],
              tabs: r => [can.post(r) ? ['posts','Church feed'] : null, (can.blog(r) || can.admin(r)) ? ['blogs','Blog'] : null, can.library(r) ? ['library','Upper Room library'] : null, can.admin(r) ? ['users','Members and roles'] : null, can.admin(r) ? ['audit','Role changes'] : null, ['roles','Role guide']] },
  koinonia: { eyebrow:'Koinonia Experience', intro:'Conference updates, videos and photos, and everyone who has registered for the next edition.',
              stats: s => [['Registered for K26', s?.regs_next], ['All registrations', s?.registrations], ['Updates posted', s?.posts], ['Reactions', s?.reactions], ['Comments', s?.comments]],
              tabs: r => [can.staff(r) ? ['regs','Registrations'] : null, can.post(r) ? ['posts','Updates and media'] : null, can.admin(r) ? ['users','Members and roles'] : null, can.admin(r) ? ['audit','Role changes'] : null, ['roles','Role guide']] },
  worship:  { eyebrow:'Worship Connect', intro:'The team\'s videos and music, who is on the team, and the people asking to join.',
              stats: s => [['New applications', s?.apps_new], ['All applications', s?.applications], ['Team members', s?.team], ['Videos and posts', s?.posts], ['Reactions', s?.reactions]],
              tabs: r => [can.moderate(r) ? ['apps','Applications'] : null, can.post(r) ? ['posts','Videos and music'] : null, can.post(r) ? ['team','The team'] : null, can.admin(r) ? ['users','Members and roles'] : null, can.admin(r) ? ['audit','Role changes'] : null, ['roles','Role guide']] },
};
const APP_STATUS = { new:'New', contacted:'Contacted', audition:'Invited to rehearsal', accepted:'Accepted', declined:'Not now' };
async function dashboardPage(modal){
  const root = $('#dashboard'); if (!root) return; const gate = $('.dash__gate', root), app = $('.dash__app', root); const site = SITE_KEY, D = DASH[site];
  if (!ready){ gate.innerHTML = `<h2>Dashboard</h2><p class="sub">Accounts are not switched on yet. Once Supabase is connected, the team signs in here.</p>`; return; }
  if (!session){ gate.innerHTML = `<span class="eyebrow">${esc(D.eyebrow)}</span><h2>Team sign in</h2><p class="sub">The ${esc(SITE.short)} dashboard is for the church team. Sign in to continue.</p><button class="btn mt-2" data-auth="in">Sign in</button>`; accountUI(modal); return; }
  const r = role();
  if (!can.staff(r)){ gate.innerHTML = `<span class="eyebrow">${esc(D.eyebrow)}</span><h2>Members area</h2><p class="sub">Your account is a <b>Member</b> account. The dashboards are for the church team. If you serve on a team, ask an Admin to update your role.</p><a class="btn mt-2" href="${SITE.feed}">Go to the ${esc(SITE.feedLabel.toLowerCase())}</a>`; return; }
  gate.hidden = true; app.hidden = false;
  const q = new URLSearchParams(location.search);
  $('.dash__head', app).innerHTML = `<span class="eyebrow">${esc(D.eyebrow)}</span><h1>${esc(SITE.dashTitle)}</h1><p class="sub">${esc(D.intro)}</p>
    <div class="dash__who">${avatar(profile.full_name, profile.avatar_url)}<div><b>${esc(profile.full_name || profile.email)}</b><span class="pill pill--orange">${esc(ROLES[r].label)}</span></div>
    ${can.admin(r) ? `<div class="dash__others">${Object.entries(SITES).filter(([k]) => k !== site).map(([k,s]) => `<a href="${s.origin}/dashboard.html">${esc(s.short)} dashboard ${ICO.arrow}</a>`).join('')}</div>` : ''}</div>`;
  const bar = $('.dash__tabs', app), panel = $('.dash__panel', app), statsEl = $('.dash__stats', app);
  const { data: stats } = await sb.rpc('dashboard_stats', { p_site: site });
  statsEl.innerHTML = D.stats(stats).map(([k,v]) => `<div class="stat"><b>${v ?? 0}</b><span>${k}</span></div>`).join('');
  const tabs = D.tabs(r).filter(Boolean);
  bar.innerHTML = tabs.map(t => `<button class="dash__tab" data-t="${t[0]}">${t[1]}</button>`).join('');
  const show = t => { $$('.dash__tab', bar).forEach(x => x.classList.toggle('is-on', x.dataset.t === t)); history.replaceState(null, '', `dashboard.html?tab=${t}`); panel.innerHTML = '<div class="skel"></div>';
    ({ posts: postsTab, regs: regsTab, apps: appsTab, team: teamTab, blogs: blogsTab, library: () => { location.href = 'library.html'; }, users: usersTab, audit: auditTab, roles: rolesTab })[t](); };
  $$('.dash__tab', bar).forEach(b => b.addEventListener('click', () => show(b.dataset.t)));
  const want = q.get('tab'); show(tabs.find(t => t[0] === want) ? want : tabs[0][0]);
  const csvOf = (name, cols, rows) => { const body = [cols.join(','), ...rows.map(x => cols.map(c => '"' + String(x[c] ?? '').replace(/"/g,'""') + '"').join(','))].join('\n'); const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([body], { type:'text/csv' })); a.download = name; a.click(); };

  async function postsTab(){
    panel.innerHTML = `<div class="feed__composer"></div><div class="dash__toolbar mt-3"><h3>Recent posts</h3><div class="feed__filters"></div></div><div class="dash__list"></div>`;
    composer($('.feed__composer', panel), site, list);
    const filters = $('.feed__filters', panel); let kind = ''; filters.innerHTML = ['', ...SITES[site].kinds].map(k => `<button class="chip ${k ? '' : 'is-on'}" data-k="${k}">${k ? KINDS[k] : 'All'}</button>`).join('');
    $$('.chip', filters).forEach(b => b.addEventListener('click', () => { kind = b.dataset.k; $$('.chip', filters).forEach(x => x.classList.toggle('is-on', x === b)); list(); }));
    async function list(){ let qry = sb.from('feed').select('*').eq('site', site).order('created_at', { ascending:false }).limit(80); if (kind) qry = qry.eq('kind', kind); const { data } = await qry; const l = $('.dash__list', panel);
      l.innerHTML = (data||[]).map(p => { const th = (p.media||[]).find(m => m.type === 'image')?.url || ((p.media||[]).find(m => m.type === 'youtube') ? `https://i.ytimg.com/vi/${(p.media||[]).find(m => m.type === 'youtube').id}/mqdefault.jpg` : '');
        return `<div class="drow" data-id="${p.id}">${th ? `<img class="drow__thumb" src="${esc(th)}" alt="">` : `<span class="drow__thumb drow__thumb--k">${esc((KINDS[p.kind]||'')[0])}</span>`}<div><b>${esc(p.title)}${p.pinned ? ' <i class="pill pill--orange">Pinned</i>' : ''}</b><span>${esc(KINDS[p.kind]||p.kind)} &middot; ${esc(p.author_name)} &middot; ${esc(when(p.created_at))} &middot; ${p.reaction_count} likes &middot; ${p.comment_count} comments</span></div>
        <div class="row"><a class="pill" href="${SITE.feed}?post=${p.id}">View</a>${can.admin(r) ? `<button class="pill pin">${p.pinned ? 'Unpin' : 'Pin'}</button>` : ''}${(can.admin(r) || p.author_id === profile.id) ? '<button class="pill pill--danger del">Delete</button>' : ''}</div></div>`; }).join('') || '<p class="sub">No posts yet. Use the box above to post the first one.</p>';
      $$('.pin', l).forEach(b => b.addEventListener('click', async () => { const { error } = await sb.from('posts').update({ pinned: b.textContent === 'Pin' }).eq('id', b.closest('.drow').dataset.id); if (error) toast(friendly(error), false); else list(); }));
      $$('.del', l).forEach(b => b.addEventListener('click', async () => { if (!confirm('Delete this post?')) return; const { error } = await sb.from('posts').delete().eq('id', b.closest('.drow').dataset.id); if (error) toast(friendly(error), false); else list(); })); }
    list();
  }
  async function regsTab(){
    const { data } = await sb.from('registrations').select('*').eq('site','koinonia').order('created_at', { ascending:false }).limit(2000); const all = data || [];
    const editions = [...new Set(all.map(x => x.edition))].sort().reverse(); let ed = editions.includes('k26') ? 'k26' : (editions[0] || '');
    const cols = ['edition','first_name','surname','gender','age_range','residence','phone','email','participation','participation_detail','days','dietary','expectation','created_at'];
    panel.innerHTML = `<div class="dash__toolbar"><div class="feed__filters">${['', ...editions].map(e => `<button class="chip ${e === ed ? 'is-on' : ''}" data-e="${e}">${e ? 'K' + e.slice(1) : 'All editions'}</button>`).join('')}</div><input class="dash__search" placeholder="Search name, phone, town or email" aria-label="Search registrations"><button class="btn btn--ghost dash__csv">Download CSV</button></div>
      <div class="dash__kpis"></div><div class="dash__list"></div>`;
    const list = $('.dash__list', panel), s = $('.dash__search', panel), kpis = $('.dash__kpis', panel);
    const rows = () => all.filter(x => (!ed || x.edition === ed) && (!s.value || (x.first_name + ' ' + x.surname + ' ' + x.phone + ' ' + (x.residence||'') + ' ' + (x.email||'')).toLowerCase().includes(s.value.toLowerCase())));
    $('.dash__csv', panel).addEventListener('click', () => csvOf(`koinonia-registrations${ed ? '-' + ed : ''}.csv`, cols, rows()));
    $$('.chip', panel).forEach(b => b.addEventListener('click', () => { ed = b.dataset.e; $$('.chip', panel).forEach(x => x.classList.toggle('is-on', x === b)); render(); }));
    const render = () => { const rs = rows(); const week = rs.filter(x => Date.now() - new Date(x.created_at) < 7*86400e3).length, part = rs.filter(x => /particip/i.test(x.participation||'') && !/^participant\s*$/i.test(x.participation||'')).length;
      const towns = {}; rs.forEach(x => { const t = (x.residence||'').trim().toLowerCase().replace(/\b\w/g, c => c.toUpperCase()); if (t) towns[t] = (towns[t]||0) + 1; }); const top = Object.entries(towns).sort((a,b) => b[1]-a[1]).slice(0,3);
      kpis.innerHTML = `<div class="stat"><b>${rs.length}</b><span>${ed ? 'registered for K' + ed.slice(1) : 'registrations'}</span></div><div class="stat"><b>${week}</b><span>in the last 7 days</span></div><div class="stat"><b>${part}</b><span>want to take part on stage</span></div><div class="stat"><b>${top.map(([t,n]) => `${t} ${n}`).join(', ') || '0'}</b><span>top towns</span></div>`;
      list.innerHTML = rs.map(x => `<details class="drow drow--exp" data-id="${x.id}"><summary>${avatar(x.first_name + ' ' + x.surname)}<div><b>${esc(x.first_name)} ${esc(x.surname)} <i class="pill">K${esc(x.edition.slice(1))}</i></b><span>${esc(x.residence||'')} &middot; ${esc(x.phone)}${x.email ? ' &middot; ' + esc(x.email) : ''} &middot; ${esc(when(x.created_at))}</span></div><div class="row"><a class="pill" href="https://wa.me/${esc(String(x.phone).replace(/\D/g,''))}" target="_blank" rel="noopener">${ICO.wa} WhatsApp</a>${can.admin(r) ? '<button class="pill pill--danger del">Remove</button>' : ''}</div></summary>
        <dl class="drow__dl"><dt>Gender</dt><dd>${esc(x.gender||'')}</dd><dt>Age</dt><dd>${esc(x.age_range||'')}</dd><dt>Role</dt><dd>${esc(x.participation||'')} ${esc(x.participation_detail||'')}</dd><dt>Days</dt><dd>${esc(x.days||'')}</dd><dt>Dietary</dt><dd>${esc(x.dietary||'')}</dd><dt>Expectation</dt><dd>${esc(x.expectation||'')}</dd><dt>Registered</dt><dd>${esc(fullDate(x.created_at))}</dd></dl></details>`).join('') || '<p class="sub">No registrations match.</p>';
      $$('.del', list).forEach(b => b.addEventListener('click', async e => { e.preventDefault(); if (!confirm('Remove this registration?')) return; await sb.from('registrations').delete().eq('id', b.closest('.drow').dataset.id); const i = all.findIndex(x => x.id === b.closest('.drow').dataset.id); all.splice(i,1); render(); })); };
    s.addEventListener('input', render); render();
  }
  async function appsTab(){
    const { data } = await sb.from('applications').select('*').eq('site','worship').order('created_at', { ascending:false }).limit(1000); const all = data || []; let st = 'new';
    const cols = ['status','name','phone','email','gift','experience','church','message','notes','created_at'];
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
      $$('.del', list).forEach(b => b.addEventListener('click', async e => { e.preventDefault(); if (!confirm('Delete this application?')) return; const id = b.closest('.drow').dataset.id; await sb.from('applications').delete().eq('id', id); all.splice(all.findIndex(x => x.id === id), 1); render(); })); };
    s.addEventListener('input', render); render();
  }
  async function teamTab(){
    const load = async () => (await sb.from('team_members').select('*').eq('site','worship').order('sort').order('created_at')).data || [];
    let members = await load(); let editing = null;
    const formHtml = m => `<form class="cmp teamform" novalidate><div class="cmp__head"><b>${m ? 'Edit ' + esc(m.name) : 'Add a team member'}</b></div>
      <div class="compose__row"><label class="field"><span>Name</span><input name="name" required value="${esc(m?.name||'')}"></label><label class="field"><span>Role on the team</span><input name="role" required placeholder="Lead vocals, Keys, Sound..." value="${esc(m?.role||'')}"></label></div>
      <label class="field"><span>A line about them (optional)</span><input name="bio" maxlength="200" value="${esc(m?.bio||'')}"></label>
      <div class="compose__row"><label class="field"><span>Photo</span><input name="photo" type="file" accept="image/*"></label><label class="field cmp__pin"><input type="checkbox" name="active" ${!m || m.active ? 'checked' : ''}> Show on the public team page</label></div>
      <div class="row"><button class="btn" type="submit">${m ? 'Save' : 'Add to the team'}</button>${m ? '<button class="btn btn--ghost cancel" type="button">Cancel</button>' : ''}<span class="cmp__status"></span></div></form>`;
    const render = () => { panel.innerHTML = `<div class="team__editor">${formHtml(editing)}</div><h3 class="mt-3 mb-1">The team as shown on the site</h3><div class="dash__list team__list"></div>`;
      const list = $('.team__list', panel);
      list.innerHTML = members.map((m, i) => `<div class="drow ${m.active ? '' : 'is-off'}" data-id="${m.id}">${m.photo_url ? `<img class="drow__thumb" src="${esc(m.photo_url)}" alt="">` : avatar(m.name)}<div><b>${esc(m.name)}${m.active ? '' : ' <i class="pill">Hidden</i>'}</b><span>${esc(m.role)}${m.bio ? ' &middot; ' + esc(m.bio) : ''}</span></div>
        <div class="row"><button class="pill up" ${i ? '' : 'disabled'} aria-label="Move up">${ICO.up}</button><button class="pill down" ${i === members.length - 1 ? 'disabled' : ''} aria-label="Move down">${ICO.down}</button><button class="pill edit">Edit</button><button class="pill pill--danger del">Remove</button></div></div>`).join('') || '<p class="sub">No team members yet. Add the first one above.</p>';
      const f = $('.teamform', panel), status = $('.cmp__status', f);
      f.addEventListener('submit', async e => { e.preventDefault(); const name = f.name.value.trim(), rl = f.role.value.trim(); if (!name || !rl){ status.textContent = 'Name and role are needed.'; status.className = 'cmp__status is-err'; return; }
        status.className = 'cmp__status'; status.textContent = 'Saving...';
        try { let photo_url = editing?.photo_url || null; if (f.photo.files[0]) photo_url = (await uploadTo('feed', f.photo.files[0], 'team')).url;
          const row = { site:'worship', name, role: rl, bio: f.bio.value.trim(), photo_url, active: f.active.checked };
          const { error } = editing ? await sb.from('team_members').update(row).eq('id', editing.id) : await sb.from('team_members').insert({ ...row, sort: members.length, created_by: profile.id }); if (error) throw error;
          editing = null; members = await load(); render(); toast('Team updated.'); } catch (err){ status.textContent = friendly(err); status.className = 'cmp__status is-err'; } });
      $('.cancel', f)?.addEventListener('click', () => { editing = null; render(); });
      $$('.edit', list).forEach(b => b.addEventListener('click', () => { editing = members.find(m => m.id === b.closest('.drow').dataset.id); render(); scrollTo({ top: panel.offsetTop - 100, behavior:'smooth' }); }));
      $$('.del', list).forEach(b => b.addEventListener('click', async () => { const m = members.find(x => x.id === b.closest('.drow').dataset.id); if (!confirm(`Remove ${m.name} from the team page?`)) return; const { error } = await sb.from('team_members').delete().eq('id', m.id); if (error) toast(friendly(error), false); else { members = await load(); render(); } }));
      const move = async (id, dir) => { const i = members.findIndex(m => m.id === id), j = i + dir; if (j < 0 || j >= members.length) return; [members[i], members[j]] = [members[j], members[i]]; await Promise.all(members.map((m, k) => sb.from('team_members').update({ sort: k }).eq('id', m.id))); render(); };
      $$('.up', list).forEach(b => b.addEventListener('click', () => move(b.closest('.drow').dataset.id, -1))); $$('.down', list).forEach(b => b.addEventListener('click', () => move(b.closest('.drow').dataset.id, 1))); };
    render();
  }
  async function blogsTab(){
    const { data } = await sb.from('blogs').select('id, title, slug, published, published_at, created_at, author:author_id(full_name)').order('created_at', { ascending:false }).limit(100);
    panel.innerHTML = `<div class="row mb-2"><a class="btn" href="blog.html?new=1">Write a post</a></div><div class="dash__list">${(data||[]).map(b => `<div class="drow" data-id="${b.id}"><div><b>${esc(b.title)}</b><span>${b.published ? 'Published ' + esc(when(b.published_at)) : 'Draft'} &middot; ${esc(b.author?.full_name||'')}</span></div><div class="row"><a class="pill" href="blog.html?post=${esc(b.slug)}">Open</a>${can.admin(r) ? '<button class="pill pill--danger del">Delete</button>' : ''}</div></div>`).join('') || '<p class="sub">No blog posts yet.</p>'}</div>`;
    $$('.del', panel).forEach(b => b.addEventListener('click', async () => { if (!confirm('Delete this blog post?')) return; const { error } = await sb.from('blogs').delete().eq('id', b.closest('.drow').dataset.id); if (error) toast(friendly(error), false); else blogsTab(); }));
  }
  async function usersTab(){
    panel.innerHTML = `<div class="dash__toolbar"><input class="dash__search" placeholder="Search by name or email" aria-label="Search users"><select class="rolesel dash__rolefilter"><option value="">All roles</option>${Object.entries(ROLES).map(([k,v]) => `<option value="${k}">${v.label}</option>`).join('')}</select></div><div class="dash__list"></div>`;
    const list = $('.dash__list', panel), search = $('.dash__search', panel), rf = $('.dash__rolefilter', panel);
    const { data } = await sb.from('profiles').select('id, email, full_name, avatar_url, role, created_at').order('created_at', { ascending:false });
    const assignable = r === 'master_admin' ? Object.keys(ROLES) : ['leader','media','blogger','member'];
    const render = () => { const qq = search.value.toLowerCase();
      list.innerHTML = (data||[]).filter(u => (!rf.value || u.role === rf.value) && (!qq || (u.full_name+u.email).toLowerCase().includes(qq))).map(u => { const locked = r !== 'master_admin' && ADMINS.includes(u.role);
        return `<div class="drow" data-id="${u.id}">${avatar(u.full_name||u.email, u.avatar_url)}<div><b>${esc(u.full_name || '(no name)')}</b><span>${esc(u.email)} &middot; joined ${esc(when(u.created_at))}</span></div><div class="row">${locked ? `<span class="pill pill--orange">${esc(ROLES[u.role].label)}</span><small>Only the Master Administrator can change Admin accounts</small>` : `<select class="rolesel" aria-label="Role for ${esc(u.full_name||u.email)}">${assignable.map(k => `<option value="${k}" ${k===u.role?'selected':''}>${ROLES[k].label}</option>`).join('')}</select>`}</div></div>`; }).join('') || '<p class="sub">No users match.</p>';
      $$('.rolesel', list).forEach(s => s.addEventListener('change', async () => { const u = data.find(x => x.id === s.closest('.drow').dataset.id); const { error } = await sb.rpc('set_role', { target:u.id, new_role:s.value }); if (error){ toast(error.message,false); s.value = u.role; } else { u.role = s.value; toast(`${u.full_name || u.email} is now ${ROLES[s.value].label}.`); } })); };
    search.addEventListener('input', render); rf.addEventListener('change', render); render();
  }
  async function auditTab(){ const { data } = await sb.from('role_audit').select('created_at, old_role, new_role, actor:actor_id(full_name), target:target_id(full_name, email)').order('created_at', { ascending:false }).limit(100);
    panel.innerHTML = `<div class="dash__list">${(data||[]).map(a => `<div class="drow"><div><b>${esc(a.target?.full_name || a.target?.email || 'user')}</b><span>${esc(ROLES[a.old_role]?.label||'')} to ${esc(ROLES[a.new_role]?.label||'')} by ${esc(a.actor?.full_name || 'system')} &middot; ${esc(when(a.created_at))}</span></div></div>`).join('') || '<p class="sub">No role changes yet.</p>'}</div>`; }
  function rolesTab(){ panel.innerHTML = `<div class="values">${Object.values(ROLES).map(x => `<div class="value"><h3>${esc(x.label)}</h3><p>${esc(x.desc)}</p></div>`).join('')}</div>`; }
}

/* ================================================================ PUBLIC TEAM PAGE (Worship Connect) */
async function teamPage(){
  const root = $('#team'); if (!root || !ready) return; const grid = $('.team__grid', root); if (!grid) return;
  const { data } = await sb.from('team_members').select('name, role, bio, photo_url').eq('site','worship').eq('active', true).order('sort');
  if (!data?.length) return;   /* keep the static fallback */
  grid.innerHTML = data.map(m => `<div class="tm">${m.photo_url ? `<div class="ph"><img src="${esc(m.photo_url)}" alt="${esc(m.name)}" loading="lazy"></div>` : `<div class="ph tm__mono">${esc(initials(m.name))}</div>`}<b>${esc(m.name)}</b><span>${esc(m.role)}</span>${m.bio ? `<p>${esc(m.bio)}</p>` : ''}</div>`).join('');
  const lb = lightbox(); const imgs = data.filter(m => m.photo_url).map(m => ({ url:m.photo_url, alt:m.name }));
  $$('.tm .ph img', grid).forEach((im, i) => im.addEventListener('click', () => lb.open(imgs, i)));
}

/* ---------- helpers other site scripts call (Koinonia registration, Worship applications) ---------- */
window.CCFC = {
  async register(row){ if (!ready) return { offline:true }; const { error } = await sb.from('registrations').insert({ ...row, user_id: session?.user?.id || null }); return { error }; },
  async apply(row){ if (!ready) return { offline:true }; const { error } = await sb.from('applications').insert({ site:'worship', ...row, user_id: session?.user?.id || null }); return { error }; },
};

/* ================================================================ BOOT */
async function boot(){
  const modal = authModal();
  if (ready){ const { data } = await sb.auth.getSession(); session = data.session; await loadProfile();
    if (location.hash === '' && location.href.endsWith('#')) history.replaceState(null, '', location.pathname + location.search);
    /* Reload once when someone signs in or out so role-dependent pages re-render. Guarded so it can never loop. */
    let lastUid = session?.user?.id || null; const RL = 'ccfc:reloaded-for';
    const mem = (k, v) => { try { return v === undefined ? sessionStorage.getItem(k) : sessionStorage.setItem(k, v); } catch (_) { return null; } };
    if (lastUid) mem(RL, lastUid);
    sb.auth.onAuthStateChange(async (e, s) => {
      if (e !== 'SIGNED_IN' && e !== 'SIGNED_OUT') return;
      const uid = s?.user?.id || null; if (uid === lastUid) return;
      lastUid = uid; session = s; await loadProfile(); accountUI(modal);
      const key = uid || 'signed-out'; if (mem(RL) === key) return; mem(RL, key);
      if ($('#feed,#dashboard,#library,#blog')){ if (location.hash) history.replaceState(null, '', location.pathname + location.search); location.reload(); }
    });
    if (new URLSearchParams(location.search).get('reset')){ const p = prompt('Choose a new password (at least 8 characters)'); if (p && p.length >= 8){ const { error } = await sb.auth.updateUser({ password:p }); toast(error ? friendly(error) : 'Password updated.', !error); } } }
  accountUI(modal);
  feedPage(modal); blogPage(modal); libraryPage(modal); dashboardPage(modal); teamPage();
  if (new URLSearchParams(location.search).get('signin')) modal.open('in');
  if (new URLSearchParams(location.search).get('new') && $('#blog') && can.blog(role())) $('.blog__new')?.click();
}
document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', boot) : boot();
})();
