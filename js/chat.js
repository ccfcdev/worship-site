/* ================================================================
   CCFC ministry assistant ("Ask Connect")
   Answers questions about the church and helps people navigate.
   Works offline from a built-in knowledge base; when
   CCFC_CONFIG.chatEndpoint is set (Supabase Edge Function proxying
   Claude), free-text questions go to the model with the same knowledge
   base as its grounding.
   ================================================================ */
(() => {
'use strict';
const $ = (s, r=document) => r.querySelector(s), $$ = (s, r=document) => [...r.querySelectorAll(s)];
const CFG = window.CCFC_CONFIG || {};
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const KB = Object.assign({ sunday: '07:45 to 10:00', venue: 'Kings Sparkle School, off Kasangula Road, Mandevu, Lusaka', email: 'ccfczambia@gmail.com', phone: '+260 975 065 391', mission: 'Connecting people to Christ in the power of the Holy Spirit, and empowering them to become multiplying disciples.', midweek: 'group and prayer times on WhatsApp', koinoniaUrl: 'https://koinonia.ccfczambia.org', worshipUrl: 'https://worship.ccfczambia.org' }, window.CCFC_KB || {});
const SITE_KEY = (window.CCFC_SITE && window.CCFC_SITE.key) || 'ccfc';
const MAIN = SITE_KEY === 'ccfc' ? '' : 'https://ccfczambia.org';   /* church page links from the subdomains */
const HERE = location.hostname + location.pathname;
const PER_SITE = {
  ccfc:     { name: 'CCFC Zambia', greet: 'Hello, I am Connect. Ask me anything about CCFC Zambia, or pick a question below.', nudge: 'Service times, directions, giving, Koinonia. Ask me anything.', placeholder: 'Ask about services, directions, giving...', suggest: ['Service times', 'Where do you meet?', 'What should I expect?', 'Watch a sermon', 'How do I give?', "Koi 26'"] },
  koinonia: { name: 'Koinonia', greet: "Hello, I am Connect. Ask me anything about Koinonia Experience, registering for Koi 26', or the church.", nudge: "Dates, registration, cost, Koi 25' photos. Ask me anything.", placeholder: "Ask about Koi 26', registration, photos...", suggest: ["When is Koi 26'?", 'How do I register?', 'How much does it cost?', "Koi 25' photos", 'Watch the worship', 'Contact the office'] },
  worship:  { name: 'Worship Connect', greet: 'Hello, I am Connect. Ask me about Worship Connect, joining the team, or the church.', nudge: 'Joining the team, rehearsals, every set. Ask me anything.', placeholder: 'Ask about joining, rehearsals, songs...', suggest: ['How do I join the team?', 'When do you rehearse?', 'Watch every set', 'Service times', 'Where do you meet?', 'Contact the office'] },
}[SITE_KEY] || {};
const abs = h => (!h || /^https?:/.test(h)) ? h : MAIN + h;
/* conversation memory: survives page changes on this site, kept on this device only, cleared by New chat or after 7 days */
const MEM_KEY = 'ccfc-chat:v1', MEM_TTL = 7 * 24 * 3600 * 1000;
const mem = {
  load(){ try { const m = JSON.parse(localStorage.getItem(MEM_KEY) || 'null'); return m && Date.now() - m.t < MEM_TTL ? m : null; } catch (_) { return null; } },
  save(m){ try { m.t = Date.now(); m.log = m.log.slice(-40); m.history = m.history.slice(-16); localStorage.setItem(MEM_KEY, JSON.stringify(m)); } catch (_) {} },
  clear(){ try { localStorage.removeItem(MEM_KEY); } catch (_) {} },
};

/* intents: keywords -> answer + optional navigation */
const INTENTS = [
  { k:['service time','what time','when do you meet','sunday','when is church','times','schedule','midweek','bible study time'], a:`We gather every Sunday, ${KB.sunday}, at ${KB.venue}. Connect groups and prayer meet through the week; the office shares ${KB.midweek}.`, go:['/visit','Plan a visit'] },
  { k:['where','address','location','directions','map','find you','venue','mandevu','kasangula'], a:`We meet at ${KB.venue}. Tap below for the map and directions, or message us on WhatsApp and we will send a pin.`, go:['/visit#map','Open directions'] },
  { k:['first time','visit','visiting','new here','what to expect','dress','wear','kids','children','parking'], a:'You are very welcome. No dress code. During the announcements visitors stand and introduce themselves and the church welcomes you warmly. Children are welcome and Connect Kids runs during the sermon. Service is 07:45 to 10:00.', go:['/visit','What to expect'] },
  { k:['watch','sermon','video','online','youtube','livestream','stream','acts','teaching'], a:'Teaching and worship from our gatherings are on the Watch page and on our YouTube channel. Pastor Francis Chewe is currently teaching through the Book of Acts.', go:['/watch','Watch'] },
  { k:['give','giving','tithe','offering','donate','mobile money','bank','airtel','mtn'], a:'Giving at CCFC comes from the heart; nobody is asked to give. If you want to, you can give in person on Sunday, by mobile money or by bank transfer. The Give page explains each.', go:['/give','Ways to give'] },
  { k:['contact','phone','email','whatsapp','call','number','reach'], a:`Email ${KB.email} or message us on WhatsApp at ${KB.phone}. A real person replies.`, go:['/contact','Contact us'] },
  { k:['koinonia','conference','k25','k26','k24','register','registration'], a:'Koinonia is our annual family conference in Lusaka every December. The next one is Koi 26\'. The Koinonia site has every edition, videos and registration.', go:[KB.koinoniaUrl || '/gatherings','Koinonia site'] },
  { k:['worship connect','worship team','choir','singers','band','join the choir','sing'], a:'Worship Connect is our praise and worship team. Their videos and the way to join are on the Worship Connect site.', go:[KB.worshipUrl || '/ministries','Worship Connect'] },
  { k:['ministry','ministries','youth','young','family connect','serve','volunteer','team'], a:'Worship Connect, Connect Kids, Youth Connect, Family Connect, Bible Study and Missions. There is a place for you to grow and serve.', go:['/ministries','Ministries'] },
  { k:['pastor','bishop','reverend','leader','leadership','who leads','francis','weston','austern','munyeke','katsande','deacon'], a:'Reverend Weston Chewe is Presiding Bishop of CCFC Zambia, Pastor Francis Chewe is Senior Pastor and Pastor Austern Munyeke serves as Pastor. Bishop Farai Katsande leads CCFC International from Harare.', go:['/about#leaders','Meet the leadership'] },
  { k:['believe','doctrine','statement of faith','denomination','what kind of church','evangelical','holy spirit'], a:'We are an evangelical church that teaches the Bible book by book, preaches Christ as the only way, and depends on the Holy Spirit. Our mission: ' + KB.mission, go:['/about','About us'] },
  { k:['outreach','mission','copperbelt','macedonian','kitwe','kalulushi','evangelism'], a:'Our Macedonian Call outreach missions take the gospel across Zambia. In September 2025 the team spent a week in Kitwe and Kalulushi with Campus Crusade for Christ Zambia.', go:['/gatherings','Gatherings'] },
  { k:['feed','news','update','announcement','what is happening','events this week'], a:'The church feed carries news, photos and videos from the family. Members can comment and react.', go:['/feed','Open the feed'] },
  { k:['blog','article','read','devotional'], a:'Our bloggers write devotionals and articles on the Blog page.', go:['/blog','Read the blog'] },
  { k:['library','study material','notes','book','powerpoint','slides','upper room'], a:'The Upper Room library holds books, slides, notes and doctrine material, free for everyone to read and download. Leaders and bloggers add to it.', go:['/library','Upper Room library'] },
  { k:['sign in','log in','login','account','sign up','register an account','password','role'], a:'Create a free account to comment on the feed and blog. The church team assigns roles (Media, Blogger, Leader, Admin) from the dashboard.', go:['/feed?signin=1','Sign in'] },
  { k:['prayer','pray','prayer request','struggling','need help','counsel'], a:'We would love to pray with you. Send a prayer request through the contact form; it goes only to the pastoral team.', go:['/contact','Send a prayer request'] },
  { k:['hello','hi','hey','good morning','good evening','help'], a:'Hello. I can help with service times, directions, what to expect, watching sermons, giving, Koinonia, or finding anything on the site. What would you like?' },
];
const FALLBACK = `I am not sure about that one. Try the questions below, or message the church on WhatsApp at ${KB.phone} and someone will help.`;
const SUGGEST = PER_SITE.suggest;
INTENTS.unshift(
  { k:['koi 25 photo','koi 25\' photo','photos','pictures','download photo','gallery'], a:"The Koi 25' photos are on the Koinonia site. You can view each one large and download it, or download them all.", go:[KB.koinoniaUrl + '/k25-photos', "Koi 25' photos"] },
  { k:['join the team','join worship','audition','rehearse','rehearsal','practice'], a:'Worship Connect rehearses every week. Apply on the Join page and a team leader will message you on WhatsApp with the next rehearsal.', go:[KB.worshipUrl + '/join', 'Join the team'] },
  { k:['cost','price','fee','how much'], a:"The Koi 26' delegate fee will be announced with the dates. For Koi 25' it was K200 for Zambian delegates and USD 10 for international delegates.", go:[KB.koinoniaUrl + '/k26#register', "Register for Koi 26'"] },
  { k:['watch the worship','watch every set','worship video','songs'], a:'Every Worship Connect set is on the Videos page, with song timestamps so you can jump to a song.', go:[KB.worshipUrl + '/videos', 'Watch every set'] },
);

function score(q, intent){ const t = q.toLowerCase(); return intent.k.reduce((s,k) => s + (t.includes(k) ? (k.length > 6 ? 2 : 1) : 0), 0); }
function local(q){ let best = null, bs = 0; for (const i of INTENTS){ const s = score(q, i); if (s > bs){ bs = s; best = i; } } return best ? { text: best.a, go: best.go ? [abs(best.go[0]), best.go[1]] : undefined } : { text: FALLBACK }; }
async function remote(history){
  const r = await fetch(CFG.chatEndpoint, { method:'POST', headers:{ 'Content-Type':'application/json', ...(CFG.supabaseKey ? { apikey: CFG.supabaseKey, Authorization: 'Bearer ' + CFG.supabaseKey } : {}) }, body: JSON.stringify({ messages: history, page: HERE }) });
  if (!r.ok) throw new Error('chat endpoint ' + r.status); const ans = await r.json();   /* { text, go?: [href,label] } */
  if (ans && typeof ans.text === 'string') ans.text = ans.text.replace(/\s*[\u2014\u2013]\s*/g, ', ');   /* house style: no dashes */
  return ans;
}

function widget(){
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const w = document.createElement('div'); w.className = 'chat';
  const ARROW = '<svg class="i" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
  w.innerHTML = `
  <div class="chat__nudge" hidden><button class="chat__nudge-x" aria-label="Dismiss">&times;</button><b>Hi, I am Connect.</b><span>${esc(PER_SITE.nudge)}</span></div>
  <button class="chat__fab" aria-label="Ask a question" aria-expanded="false"><span class="chat__ring"></span><span class="chat__ico"><svg class="chat__ico-open" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1.1-4.2A8 8 0 1 1 21 12z"/><path d="M8.5 12h.01M12 12h.01M15.5 12h.01"/></svg><svg class="chat__ico-close" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg></span><span class="chat__fab-label">Ask Connect</span></button>
  <div class="chat__panel" hidden role="dialog" aria-label="Ask Connect, the ${esc(PER_SITE.name)} assistant">
    <div class="chat__head"><div class="chat__orb" aria-hidden="true"></div><div class="chat__who"><span class="chat__avatar"><img src="/assets/logo/ccfc-mark-white.png?v=2" alt=""></span><div><b>Connect</b><span><i class="chat__dot"></i>${esc(PER_SITE.name)} assistant, online</span></div></div><button class="chat__new" type="button" aria-label="Start a new chat" title="New chat"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg></button><button class="chat__close" aria-label="Close"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>
    <div class="chat__log" aria-live="polite"></div>
    <div class="chat__sugg">${SUGGEST.map((s, i) => `<button style="--i:${i}">${esc(s)}</button>`).join('')}</div>
    <form class="chat__form"><input name="q" autocomplete="off" placeholder="${esc(PER_SITE.placeholder)}" aria-label="Your question" maxlength="400"><button class="chat__send" type="submit" aria-label="Send">${ARROW}</button></form>
    <p class="chat__fine">${CFG.chatEndpoint ? 'Answers are generated with AI from the church\'s own information and can be wrong. For anything important, message the office.' : 'Answers come from the church\'s published information. For anything else, message the office on WhatsApp.'}</p>
  </div>`;
  document.body.appendChild(w);
  const fab = $('.chat__fab', w), panel = $('.chat__panel', w), log = $('.chat__log', w), form = $('.chat__form', w), input = $('input', form), nudge = $('.chat__nudge', w);
  const saved = mem.load(); const state = saved || { log: [], history: [], open: false };
  const history = state.history; let closing;
  const persist = () => mem.save(state);
  const add = (who, text, go, restored) => { const el = document.createElement('div'); el.className = 'chat__msg is-' + who + (restored ? ' is-restored' : '');
    if (!restored){ state.log.push({ who, text, go }); persist(); }
    el.innerHTML = `${who === 'bot' ? '<span class="chat__mark" aria-hidden="true">C</span>' : ''}<div>${esc(text)}${go ? `<a class="chat__go" href="${esc(go[0])}" data-chat-go>${esc(go[1])} ${ARROW}</a>` : ''}</div>`;
    log.appendChild(el); log.scrollTo({ top: log.scrollHeight, behavior: RM || restored ? 'auto' : 'smooth' }); return el; };
  const typing = () => { const el = document.createElement('div'); el.className = 'chat__msg is-bot is-typing'; el.innerHTML = '<span class="chat__mark" aria-hidden="true">C</span><div><i></i><i></i><i></i></div>'; log.appendChild(el); log.scrollTop = log.scrollHeight; return el; };
  const hideNudge = () => { nudge.hidden = true; try { sessionStorage.setItem('ccfc:nudged', '1'); } catch (e){} };
  const open = (on, quiet) => { clearTimeout(closing); fab.setAttribute('aria-expanded', on); w.classList.toggle('is-open', on); hideNudge(); state.open = on; persist();
    if (on){ panel.hidden = false; requestAnimationFrame(() => panel.classList.add('is-in')); if (!quiet) setTimeout(() => input.focus({ preventScroll:true }), 350); if (!log.children.length) add('bot', PER_SITE.greet); log.scrollTop = log.scrollHeight; }
    else { panel.classList.remove('is-in'); closing = setTimeout(() => { panel.hidden = true; }, RM ? 0 : 320); fab.focus({ preventScroll:true }); } };
  fab.addEventListener('click', () => open(panel.hidden || !panel.classList.contains('is-in'))); $('.chat__close', w).addEventListener('click', () => open(false));
  $('.chat__nudge-x', w).addEventListener('click', e => { e.stopPropagation(); hideNudge(); }); nudge.addEventListener('click', () => open(true));
  addEventListener('keydown', e => { if (e.key === 'Escape' && !panel.hidden) open(false); });
  document.addEventListener('click', e => { if (!panel.hidden && !w.contains(e.target) && innerWidth > 640) open(false); });
  const ask = async q => { history.push({ role:'user', content:q }); add('user', q); const t = typing(); w.classList.add('is-busy');
    let ans; try { ans = CFG.chatEndpoint ? await remote(history.slice(-8)) : local(q); } catch (e){ ans = local(q); }
    t.remove(); w.classList.remove('is-busy'); history.push({ role:'assistant', content: ans.text }); add('bot', ans.text, ans.go); };
  form.addEventListener('submit', e => { e.preventDefault(); const q = input.value.trim(); if (!q) return; input.value = ''; ask(q); });
  $$('.chat__sugg button', w).forEach(b => b.addEventListener('click', () => { b.classList.add('is-used'); ask(b.textContent); }));

  /* restore the conversation from the last page and reopen if it was open */
  if (saved && saved.log.length){ saved.log.forEach(m => add(m.who, m.text, m.go, true)); if (saved.log.some(m => m.who === 'user')) w.classList.add('has-history'); }
  log.addEventListener('click', e => { if (e.target.closest('[data-chat-go]')){ state.open = true; persist(); } });   /* follow a suggestion: keep the chat open on the next page */
  $('.chat__new', w).addEventListener('click', () => { mem.clear(); state.log = []; state.history.length = 0; log.innerHTML = ''; $$('.chat__sugg button', w).forEach(b => b.classList.remove('is-used')); w.classList.remove('has-history'); add('bot', PER_SITE.greet); input.focus(); });
  let nudged = !!(saved && saved.log.length); try { nudged = nudged || !!sessionStorage.getItem('ccfc:nudged'); } catch (e){}
  if (!nudged && !new URLSearchParams(location.search).get('chat')) setTimeout(() => { if (panel.hidden) nudge.hidden = false; }, 9000);
  setTimeout(() => w.classList.add('is-ready'), 600);
  if (new URLSearchParams(location.search).get('chat')) open(true); else if (saved && saved.open && saved.log.length) open(true, true);
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', widget); else widget();
})();
