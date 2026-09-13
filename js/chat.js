/* ================================================================
   Ozer, the AI assistant for the CCFC sites
   A Bible companion and a church helper in one panel:
   - Ask:   conversation with Ozer (ministry-chat edge function). Ozer is
            agentic: it returns action cards (verses, calendar reminders,
            prefilled forms, WhatsApp drafts, reading plans). Nothing is
            ever sent or submitted without the person pressing the button.
   - Bible: read any passage in four public domain translations.
   - Today: verse of the day and saved reading plans.
   - Tasks: one-tap agents for everyday jobs.
   Memory: the conversation follows the person across pages on this
   site (this device only, 7 days). Works offline from built-in answers.
   ================================================================ */
(() => {
'use strict';
const $ = (s, r=document) => r.querySelector(s), $$ = (s, r=document) => [...r.querySelectorAll(s)];
const CFG = window.CCFC_CONFIG || {};
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const KB = Object.assign({ sunday: '07:45 to 10:00', venue: 'Kings Sparkle School, off Kasangula Road, Mandevu, Lusaka', email: 'ccfczambia@gmail.com', phone: '+260 975 065 391', mission: 'Connecting people to Christ in the power of the Holy Spirit, and empowering them to become multiplying disciples.', midweek: 'group and prayer times on WhatsApp', koinoniaUrl: 'https://koinonia.ccfczambia.org', worshipUrl: 'https://worship.ccfczambia.org' }, window.CCFC_KB || {});
const SITE_KEY = (window.CCFC_SITE && window.CCFC_SITE.key) || 'ccfc';
const MAIN = SITE_KEY === 'ccfc' ? '' : 'https://ccfczambia.org';
const HERE = location.hostname + location.pathname;
const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
const PER_SITE = {
  ccfc:     { name: 'CCFC Zambia', greet: 'Peace to you. I am **Ozer**, the AI companion of Christ Connect Family Church Zambia.\n\nAsk me about the Bible, pray with me, or let me handle small jobs: planning your visit, finding a sermon, sending a prayer request.', nudge: 'Bible questions, prayer, service times, directions. I can also do small tasks for you.', placeholder: 'Ask Ozer about the Bible or the church...', suggest: ['Verses for when I feel anxious', 'Plan my visit this Sunday', 'Explain John 3:16', 'Send a prayer request', 'Service times', 'Watch a sermon'] },
  koinonia: { name: 'Koinonia', greet: "Peace to you. I am **Ozer**, the AI companion for Koinonia Experience.\n\nAsk me about Koi 26', let me fill in your registration, or open the Bible together.", nudge: "Koi 26', registration, photos, the Bible. I can fill in your registration for you.", placeholder: "Ask Ozer about Koi 26' or the Bible...", suggest: ["Register me for Koi 26'", "When is Koi 26'?", 'What does koinonia mean?', "Koi 25' photos", 'Remind me about Koi 26\'', 'How much does it cost?'] },
  worship:  { name: 'Worship Connect', greet: 'Peace to you. I am **Ozer**, the AI companion for Worship Connect.\n\nAsk me about joining the team, the songs we sing, or what the Bible says about worship.', nudge: 'Joining the team, rehearsals, worship in the Bible. I can start your application.', placeholder: 'Ask Ozer about worship or the team...', suggest: ['Help me apply to join', 'What does the Bible say about worship?', 'When do you rehearse?', 'Watch every set', 'A Psalm to start my day', 'Service times'] },
}[SITE_KEY] || {};
const abs = h => (!h || /^https?:/.test(h)) ? h : MAIN + h;
const ls = { get(k, d){ try { const v = JSON.parse(localStorage.getItem(k) || 'null'); return v ?? d; } catch (_) { return d; } }, set(k, v){ try { localStorage.setItem(k, JSON.stringify(v)); } catch (_) {} }, del(k){ try { localStorage.removeItem(k); } catch (_) {} } };

/* conversation memory: survives page changes on this site, kept on this device only, cleared by New chat or after 7 days */
const MEM_KEY = 'ozer:v2', OLD_KEY = 'ccfc-chat:v1', MEM_TTL = 7 * 24 * 3600 * 1000;
const mem = {
  load(){ const m = ls.get(MEM_KEY) || ls.get(OLD_KEY); return m && Date.now() - m.t < MEM_TTL ? Object.assign({ log: [], history: [] }, m) : null; },
  save(m){ m.t = Date.now(); m.log = m.log.slice(-40); m.history = m.history.slice(-16); ls.set(MEM_KEY, m); },
  clear(){ ls.del(MEM_KEY); ls.del(OLD_KEY); },
};
const PLANS_KEY = 'ozer:plans', PREF_KEY = 'ozer:prefs';
const prefs = Object.assign({ tr: 'web' }, ls.get(PREF_KEY, {}));

/* offline answers (used when the AI endpoint is unreachable) */
const INTENTS = [
  { k:['koi 25 photo','koi 25\' photo','photos','pictures','download photo','gallery'], a:"The Koi 25' photos are on the Koinonia site. You can view each one large and download it, or download them all.", go:[KB.koinoniaUrl + '/k25-photos', "Koi 25' photos"] },
  { k:['join the team','join worship','audition','rehearse','rehearsal','practice','apply'], a:'Worship Connect rehearses every week. Apply on the Join page and a team leader will message you on WhatsApp with the next rehearsal.', go:[KB.worshipUrl + '/join', 'Join the team'] },
  { k:['cost','price','fee','how much'], a:"The Koi 26' delegate fee will be announced with the dates. For Koi 25' it was K200 for Zambian delegates and USD 10 for international delegates.", go:[KB.koinoniaUrl + '/k26#register', "Register for Koi 26'"] },
  { k:['watch the worship','watch every set','worship video','songs'], a:'Every Worship Connect set is on the Videos page, with song timestamps so you can jump to a song.', go:[KB.worshipUrl + '/videos', 'Watch every set'] },
  { k:['service time','what time','when do you meet','sunday','when is church','times','schedule','midweek','plan my visit'], a:`We gather every Sunday, ${KB.sunday}, at ${KB.venue}. Connect groups and prayer meet through the week; the office shares ${KB.midweek}.`, go:['/visit','Plan a visit'] },
  { k:['where','address','location','directions','map','find you','venue','mandevu','kasangula'], a:`We meet at ${KB.venue}. Tap below for the map and directions, or message us on WhatsApp and we will send a pin.`, go:['/visit#map','Open directions'] },
  { k:['first time','visit','visiting','new here','what to expect','dress','wear','kids','children','parking'], a:'You are very welcome. No dress code. During the announcements visitors stand and introduce themselves and the church welcomes you warmly. Children are welcome and Connect Kids runs during the sermon. Service is 07:45 to 10:00.', go:['/visit','What to expect'] },
  { k:['watch','sermon','video','online','youtube','livestream','stream','acts','teaching'], a:'Teaching and worship from our gatherings are on the Watch page and on our YouTube channel. Pastor Francis Chewe is currently teaching through the Book of Acts.', go:['/watch','Watch'] },
  { k:['give','giving','tithe','offering','donate','mobile money','bank','airtel','mtn'], a:'Giving at CCFC comes from the heart; nobody is asked to give. If you want to, you can give in person on Sunday, by mobile money or by bank transfer. The Give page explains each.', go:['/give','Ways to give'] },
  { k:['contact','phone','email','whatsapp','call','number','reach'], a:`Email ${KB.email} or message us on WhatsApp at ${KB.phone}. A real person replies.`, go:['/contact','Contact us'] },
  { k:['koinonia','conference','k25','k26','k24','register','registration'], a:'Koinonia is our annual family conference in Lusaka every December. The next one is Koi 26\'. The Koinonia site has every edition, videos and registration.', go:[KB.koinoniaUrl || '/gatherings','Koinonia site'] },
  { k:['worship connect','worship team','choir','singers','band','join the choir','sing'], a:'Worship Connect is our praise and worship team. Their videos and the way to join are on the Worship Connect site.', go:[KB.worshipUrl || '/ministries','Worship Connect'] },
  { k:['ministry','ministries','youth','young','family connect','serve','volunteer'], a:'Worship Connect, Connect Kids, Youth Connect, Family Connect, Bible Study and Missions. There is a place for you to grow and serve.', go:['/ministries','Ministries'] },
  { k:['pastor','bishop','reverend','leader','leadership','who leads','francis','weston','austern','munyeke','katsande','deacon'], a:'Reverend Weston Chewe is Presiding Bishop of CCFC Zambia, Pastor Francis Chewe is Senior Pastor and Pastor Austern Munyeke serves as Pastor. Bishop Farai Katsande leads CCFC International from Harare.', go:['/about#leaders','Meet the leadership'] },
  { k:['believe','doctrine','statement of faith','denomination','what kind of church','evangelical','holy spirit'], a:'We are an evangelical church that teaches the Bible book by book, preaches Christ as the only way, and depends on the Holy Spirit. Our mission: ' + KB.mission, go:['/about','About us'] },
  { k:['feed','news','update','announcement','what is happening','events this week'], a:'The church feed carries news, photos and videos from the family. Members can comment and react.', go:['/feed','Open the feed'] },
  { k:['library','study material','notes','book','powerpoint','slides','upper room'], a:'The Upper Room library holds books, slides, notes and doctrine material, free for everyone to read and download.', go:['/library','Upper Room library'] },
  { k:['sign in','log in','login','account','sign up','password','role'], a:'Create a free account to comment on the feed and blog. The church team assigns roles (Media, Blogger, Leader, Admin).', go:['/feed?signin=1','Sign in'] },
  { k:['prayer','pray','prayer request','struggling','need help','counsel','anxious','afraid','sad'], a:'We would love to pray with you. Send a prayer request through the contact form; it goes only to the pastoral team. You can also open the Bible tab and read Psalm 23 or Philippians 4:6-7.', go:['/contact','Send a prayer request'] },
  { k:['hello','hi','hey','good morning','good evening','help'], a:'Hello. I can help with the Bible, prayer, service times, directions, watching sermons, giving, Koinonia, or finding anything on the site. What would you like?' },
];
const FALLBACK = `I cannot reach my thinking right now. Try the Bible tab, or message the church on WhatsApp at ${KB.phone} and someone will help.`;
function local(q){ const t = q.toLowerCase(); let best = null, bs = 0; for (const i of INTENTS){ const s = i.k.reduce((s,k) => s + (t.includes(k) ? (k.length > 6 ? 2 : 1) : 0), 0); if (s > bs){ bs = s; best = i; } } return best ? { text: best.a, go: best.go ? [abs(best.go[0]), best.go[1]] : undefined } : { text: FALLBACK }; }
async function remote(history){
  const r = await fetch(CFG.chatEndpoint, { method:'POST', headers:{ 'Content-Type':'application/json', ...(CFG.supabaseKey ? { apikey: CFG.supabaseKey, Authorization: 'Bearer ' + CFG.supabaseKey } : {}) }, body: JSON.stringify({ messages: history, page: HERE }) });
  if (!r.ok) throw new Error('chat endpoint ' + r.status); const ans = await r.json();
  if (!ans || typeof ans.text !== 'string') throw new Error('bad answer');
  ans.text = ans.text.replace(/\s*[\u2014\u2013]\s*/g, ', ');
  return ans;
}

/* ---------- Bible ---------- */
const TR = { web: 'WEB', kjv: 'KJV', bbe: 'BBE', asv: 'ASV' };
const TR_NAME = { web: 'World English Bible', kjv: 'King James Version', bbe: 'Bible in Basic English', asv: 'American Standard Version' };
async function passage(ref, tr){ const r = await fetch(`https://bible-api.com/${encodeURIComponent(ref)}?translation=${tr}`); if (!r.ok) throw new Error(r.status === 404 ? 'I could not find that passage. Try a form like John 3:16 or Psalm 23.' : 'The Bible service is busy. Please try again in a moment.'); return r.json(); }
const VOTD = ['Psalm 23:1-3','Isaiah 41:10','Philippians 4:6-7','John 3:16','Romans 8:28','Jeremiah 29:11','Proverbs 3:5-6','Matthew 11:28-30','Joshua 1:9','Psalm 46:1','2 Corinthians 5:17','Lamentations 3:22-23','Romans 12:2','Galatians 5:22-23','Hebrews 11:1','1 Peter 5:7','Psalm 121:1-2','Isaiah 40:31','Matthew 6:33','John 14:27','Ephesians 2:8-9','Micah 6:8','Psalm 139:13-14','Romans 15:13','Colossians 3:23','James 1:5','John 15:5','Psalm 37:4','Acts 1:8','Acts 2:42','Zephaniah 3:17','Psalm 91:1-2','Deuteronomy 31:8','2 Timothy 1:7','Hebrews 13:8','1 John 1:9','Matthew 5:14-16','Psalm 119:105','Isaiah 26:3','Romans 5:8','John 11:25-26','Psalm 34:18','Nahum 1:7','Philippians 4:13','1 Corinthians 13:4-7','Psalm 27:1','Matthew 28:19-20','Isaiah 43:2','Psalm 100:4-5','John 8:12','Ephesians 3:20-21','Hebrews 12:1-2','Psalm 16:11','Romans 10:9','Proverbs 16:3','Mark 11:24','Psalm 145:18','John 1:5','Revelation 21:4','Numbers 6:24-26'];
const dayKey = () => { const d = new Date(); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; };
const votdRef = () => { const d = new Date(), start = new Date(d.getFullYear(), 0, 0); return VOTD[Math.floor((d - start) / 864e5) % VOTD.length]; };

/* share a verse as an image: night sky, halo and the words */
async function verseImage(ref, text, trName){
  const c = document.createElement('canvas'); c.width = 1080; c.height = 1350; const x = c.getContext('2d');
  const g = x.createLinearGradient(0, 0, 0, 1350); g.addColorStop(0, '#141845'); g.addColorStop(.55, '#0A0C26'); g.addColorStop(1, '#05060F'); x.fillStyle = g; x.fillRect(0, 0, 1080, 1350);
  const glow = x.createRadialGradient(540, 120, 10, 540, 120, 760); glow.addColorStop(0, 'rgba(246,227,168,.42)'); glow.addColorStop(1, 'rgba(246,227,168,0)'); x.fillStyle = glow; x.fillRect(0, 0, 1080, 1350);
  for (let i = 0; i < 140; i++){ x.fillStyle = `rgba(255,248,230,${Math.random() * .6})`; x.beginPath(); x.arc(Math.random() * 1080, Math.random() * 1350, Math.random() * 1.6, 0, 7); x.fill(); }
  x.strokeStyle = 'rgba(235,200,114,.9)'; x.lineWidth = 4; x.beginPath(); x.arc(540, 250, 62, 0, 7); x.stroke();
  x.fillStyle = '#EBC872'; x.beginPath(); x.moveTo(540, 205); x.bezierCurveTo(544, 238, 556, 246, 585, 250); x.bezierCurveTo(556, 254, 544, 262, 540, 295); x.bezierCurveTo(536, 262, 524, 254, 495, 250); x.bezierCurveTo(524, 246, 536, 238, 540, 205); x.fill();
  let size = text.length > 520 ? 38 : text.length > 300 ? 46 : 56; x.textAlign = 'center';
  const wrap = () => { x.font = `${size}px "Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif`; const words = text.split(/\s+/), lines = []; let line = ''; for (const w of words){ const t = line ? line + ' ' + w : w; if (x.measureText(t).width > 860 && line){ lines.push(line); line = w; } else line = t; } if (line) lines.push(line); return lines; };
  let lines = wrap(); while (lines.length * size * 1.42 > 760 && size > 26){ size -= 3; lines = wrap(); }
  x.fillStyle = '#FFF8E6'; const top = 690 - (lines.length * size * 1.42) / 2 + size * .5; lines.forEach((l, i) => x.fillText(l, 540, top + i * size * 1.42));
  x.fillStyle = '#EBC872'; x.font = '600 34px system-ui, sans-serif'; x.fillText(ref.toUpperCase(), 540, top + lines.length * size * 1.42 + 70);
  x.fillStyle = 'rgba(237,235,247,.6)'; x.font = '26px system-ui, sans-serif'; x.fillText(`${trName}  ·  Ozer, CCFC Zambia`, 540, 1270);
  return new Promise(res => c.toBlob(res, 'image/png'));
}
async function shareVerse(ref, text, trName, asImage){
  const words = `"${text}" ${ref} (${trName})`;
  if (asImage){ const blob = await verseImage(ref, text, trName); const file = new File([blob], ref.replace(/[^\w]+/g, '-') + '.png', { type: 'image/png' });
    if (navigator.canShare && navigator.canShare({ files: [file] })){ try { await navigator.share({ files: [file], title: ref }); return 'Shared.'; } catch (_) { return ''; } }
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = file.name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000); return 'Image saved.'; }
  if (navigator.share){ try { await navigator.share({ text: words }); return 'Shared.'; } catch (_) { return ''; } }
  try { await navigator.clipboard.writeText(words); return 'Copied.'; } catch (_) { return 'Could not copy.'; }
}

/* ---------- forms Ozer prefills (cookie shared across *.ccfczambia.org, 15 minutes, read once) ---------- */
const FILL_COOKIE = 'ozer-fill';
const FORM_SEL = { koinonia_registration: 'form.reg[data-edition]', worship_join: 'form.join', contact: 'form[data-handoff]' };
function setFill(form, fields){ const dom = /ccfczambia\.org$/.test(location.hostname) ? '; domain=.ccfczambia.org' : ''; document.cookie = `${FILL_COOKIE}=${encodeURIComponent(JSON.stringify({ form, fields }))}; max-age=900; path=/; samesite=lax${location.protocol === 'https:' ? '; secure' : ''}${dom}`; }
function clearFill(){ const dom = /ccfczambia\.org$/.test(location.hostname) ? '; domain=.ccfczambia.org' : ''; document.cookie = `${FILL_COOKIE}=; max-age=0; path=/${dom}`; }
function applyFill(){
  const m = document.cookie.match(new RegExp('(?:^|; )' + FILL_COOKIE + '=([^;]*)')); if (!m) return;
  let d; try { d = JSON.parse(decodeURIComponent(m[1])); } catch (_) { clearFill(); return; }
  const form = FORM_SEL[d.form] && $(FORM_SEL[d.form]); if (!form) return;   /* not on this page yet: keep it for the right page */
  clearFill(); let n = 0;
  Object.entries(d.fields || {}).forEach(([k, v]) => { const els = $$(`[name="${CSS.escape(k)}"]`, form); if (!els.length) return; const val = String(v);
    const el = els[0];
    if (el.type === 'radio' || el.type === 'checkbox'){ const hit = els.find(e => e.value.toLowerCase() === val.toLowerCase()) || els.find(e => val.toLowerCase().includes(e.value.toLowerCase())); if (hit){ hit.checked = true; hit.dispatchEvent(new Event('change', { bubbles: true })); n++; } }
    else if (el.tagName === 'SELECT'){ const opt = [...el.options].find(o => o.value.toLowerCase() === val.toLowerCase() || o.text.toLowerCase() === val.toLowerCase()) || [...el.options].find(o => o.value && o.text.toLowerCase().includes(val.toLowerCase())); if (opt){ el.value = opt.value; el.dispatchEvent(new Event('change', { bubbles: true })); n++; } }
    else { el.value = val; el.dispatchEvent(new Event('input', { bubbles: true })); n++; } });
  if (!n) return;
  const note = document.createElement('div'); note.className = 'oz-filled'; note.setAttribute('role', 'status');
  note.innerHTML = `${markSvg('ozm-fill')}<span><b>Ozer filled in ${n} answer${n > 1 ? 's' : ''} for you.</b> Please check everything, complete anything missing, then press submit yourself.</span>`;
  form.parentNode.insertBefore(note, form);
  setTimeout(() => form.scrollIntoView({ behavior: RM ? 'auto' : 'smooth', block: 'start' }), 400);
}

/* ---------- UI pieces ---------- */
let markN = 0;
function markSvg(id){ id = (id || 'ozm') + '-' + (++markN); return `<svg class="oz-mark" viewBox="0 0 48 48" aria-hidden="true" focusable="false"><defs><linearGradient id="${id}" x1="8" y1="6" x2="40" y2="42" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#FFF7DC"/><stop offset=".5" stop-color="#EBC872"/><stop offset="1" stop-color="#B98A3E"/></linearGradient></defs><circle cx="24" cy="24" r="17.5" fill="none" stroke="url(#${id})" stroke-width="2"/><path d="M24 11.5c.9 7.7 3.9 11.2 12 12.5-8.1 1.3-11.1 4.8-12 12.5-.9-7.7-3.9-11.2-12-12.5 8.1-1.3 11.1-4.8 12-12.5z" fill="url(#${id})"/></svg>`; }
const I = {
  arrow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
  send: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M6 11l6-6 6 6"/></svg>',
  close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
  expand: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>',
  shrink: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 14h6v6M20 10h-6V4M14 10l7-7M3 21l7-7"/></svg>',
  cal: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M8 3v4M16 3v4M3 10h18"/></svg>',
  form: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13l2 2 4-4"/></svg>',
  wa: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm5.3 14.1c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .2-3.3-.7a11.4 11.4 0 0 1-4.4-3.9c-.3-.5-1.1-1.5-1.1-2.9s.7-2 1-2.3c.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.8 2c.1.1.1.3 0 .5l-.4.5-.3.4c-.1.1-.3.3-.1.6.2.3.7 1.2 1.6 1.9 1.1 1 2 1.3 2.3 1.4.3.1.4.1.6-.1l.8-1c.2-.3.4-.2.6-.1l1.9.9c.3.1.5.2.5.3.1.2.1.7-.1 1.3z"/></svg>',
  book: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5z"/><path d="M4 21.5V5.5M12 7v6M9 10h6"/></svg>',
  sun: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
  spark: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2c.6 5.3 2.7 7.7 8.3 8.6-5.6.9-7.7 3.3-8.3 8.6-.6-5.3-2.7-7.7-8.3-8.6C9.3 9.7 11.4 7.3 12 2zM19 15c.3 2.4 1.2 3.4 3.5 3.8-2.3.4-3.2 1.4-3.5 3.8-.3-2.4-1.2-3.4-3.5-3.8 2.3-.4 3.2-1.4 3.5-3.8z"/></svg>',
  chat: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1.1-4.2A8 8 0 1 1 21 12z"/></svg>',
  copy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>',
  img: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="9" cy="9" r="2"/><path d="M21 15l-5-5L5 21"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5 9-10"/></svg>',
};
const TASKS = [
  ['cal', 'Plan my Sunday visit', 'Service time, directions and a reminder', 'Plan my visit to church this Sunday and add a reminder to my calendar.'],
  ['form', "Register for Koi 26'", 'Ozer fills the form, you submit', "I want to register for Koi 26'. Please help me fill in the registration."],
  ['wa', 'Send a prayer request', 'Drafted for you to send', 'I would like to send a prayer request to the pastoral team.'],
  ['book', 'Build a reading plan', 'Day by day, saved in Today', 'Create a 7 day Bible reading plan for me. Ask me what topic first.'],
  ['spark', 'Find a sermon or study', 'Across all three sites', 'Help me find a sermon or study material. Ask me the topic.'],
  ['form', 'Join Worship Connect', 'Start your application', 'I want to join Worship Connect. Please help me fill in the application.'],
  ['cal', 'Remind me about an event', 'One tap to your calendar', 'Set a calendar reminder for me. Ask me which event.'],
  ['chat', 'Pray with me', 'A short prayer and a verse', 'Please pray with me. Ask me what is on my heart.'],
];
const rich = t => { const e = esc(t).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/(https?:\/\/[^\s<]+)/g, u => `<a href="${u}" target="_blank" rel="noopener">${u.replace(/^https?:\/\//, '').slice(0, 48)}</a>`);
  return e.split(/\n{2,}/).map(block => { const lines = block.split('\n'); return lines.every(l => /^\s*([-*•]|\d+\.)\s+/.test(l)) ? `<ul>${lines.map(l => `<li>${l.replace(/^\s*([-*•]|\d+\.)\s+/, '')}</li>`).join('')}</ul>` : `<p>${lines.join('<br>')}</p>`; }).join(''); };
const FIELD_LABEL = { first:'First name', middle:'Middle name', surname:'Surname', gender:'Gender', age:'Age', address:'Town', country:'Country', phone:'Phone', email:'Email', participation:'Taking part', detail:'Detail', days:'Days', dietary:'Dietary', expectation:'Expectation', name:'Name', gift:'Gift', experience:'Experience', church:'Church', message:'Message', contact:'Contact', topic:'Topic', via:'Reply by' };

function widget(){
  const w = document.createElement('div'); w.className = 'oz'; w.dataset.site = SITE_KEY;
  w.innerHTML = `
  <div class="oz__nudge" hidden><button class="oz__nudge-x" aria-label="Dismiss">&times;</button><b>Peace to you. I am Ozer.</b><span>${esc(PER_SITE.nudge)}</span></div>
  <button class="oz__fab" aria-label="Open Ozer, the AI assistant" aria-expanded="false"><span class="oz__fab-orb">${markSvg('ozm-fab')}<i class="oz__fab-x">${I.close}</i></span><span class="oz__fab-label">Ask Ozer</span></button>
  <section class="oz__panel" hidden role="dialog" aria-label="Ozer, the AI assistant">
    <div class="oz__sky" aria-hidden="true"><i class="oz__rays"></i><i class="oz__stars"></i></div>
    <header class="oz__head">
      <span class="oz__id">${markSvg('ozm-head')}<span><b>Ozer</b><small><i class="oz__live"></i>AI companion &middot; ${esc(PER_SITE.name)}</small></span></span>
      <span class="oz__tools"><button class="oz__btn oz__new" type="button" aria-label="New conversation" title="New conversation">${I.plus}</button><button class="oz__btn oz__size" type="button" aria-label="Expand" title="Expand">${I.expand}</button><button class="oz__btn oz__close" type="button" aria-label="Close">${I.close}</button></span>
    </header>
    <nav class="oz__tabs" role="tablist" aria-label="Ozer">${[['ask','Ask',I.chat],['bible','Bible',I.book],['today','Today',I.sun],['tasks','Tasks',I.spark]].map(([k,l,ic]) => `<button role="tab" type="button" data-tab="${k}" aria-selected="false">${ic}<span>${l}</span></button>`).join('')}<i class="oz__tabline" aria-hidden="true"></i></nav>
    <div class="oz__views">
      <div class="oz__view oz__view--ask" data-view="ask" role="tabpanel">
        <div class="oz__log" aria-live="polite"></div>
        <div class="oz__sugg">${(PER_SITE.suggest || []).map((s, i) => `<button type="button" style="--i:${i}">${esc(s)}</button>`).join('')}</div>
        <form class="oz__form"><textarea name="q" rows="1" autocomplete="off" placeholder="${esc(PER_SITE.placeholder)}" aria-label="Message Ozer" maxlength="1200"></textarea><button class="oz__send" type="submit" aria-label="Send">${I.send}</button></form>
      </div>
      <div class="oz__view oz__view--bible" data-view="bible" role="tabpanel" hidden>
        <form class="oz__ref"><input name="ref" autocomplete="off" placeholder="John 3:16, Psalm 23, Romans 8" aria-label="Bible passage" maxlength="60"><select name="tr" aria-label="Translation">${Object.entries(TR).map(([k, v]) => `<option value="${k}" ${k === prefs.tr ? 'selected' : ''}>${v}</option>`).join('')}</select><button class="oz__send" type="submit" aria-label="Open passage">${I.arrow}</button></form>
        <div class="oz__picks">${['Psalm 23','John 1:1-14','Romans 8:28-39','Matthew 5:1-12','Isaiah 40:28-31','Acts 2:37-47','1 Corinthians 13','Ephesians 6:10-18'].map(r => `<button type="button">${r}</button>`).join('')}</div>
        <article class="oz__scroll" aria-live="polite"><div class="oz__empty">${markSvg('ozm-bible')}<p>Open any passage in the World English Bible, King James, Basic English or American Standard Version. Then ask Ozer to explain it or pray it with you.</p></div></article>
      </div>
      <div class="oz__view oz__view--today" data-view="today" role="tabpanel" hidden><div class="oz__todayin"></div></div>
      <div class="oz__view oz__view--tasks" data-view="tasks" role="tabpanel" hidden>
        <p class="oz__lead">Ozer's agents take care of small jobs. They prepare everything; you check it and press the final button.</p>
        <div class="oz__tasks">${TASKS.map(([ic, t, s, p], i) => `<button type="button" class="oz__task" style="--i:${i}" data-prompt="${esc(p)}"><span class="oz__task-ico">${I[ic]}</span><b>${esc(t)}</b><small>${esc(s)}</small></button>`).join('')}</div>
      </div>
    </div>
    <p class="oz__fine">Ozer is an AI and can make mistakes. Check anything important with the church office.</p>
  </section>`;
  document.body.appendChild(w);

  const fab = $('.oz__fab', w), panel = $('.oz__panel', w), log = $('.oz__log', w), form = $('.oz__form', w), input = $('textarea', form), nudge = $('.oz__nudge', w);
  const saved = mem.load(); const state = saved || { log: [], history: [], open: false };
  const history = state.history; let closing;
  const persist = () => mem.save(state);

  /* tabs */
  const setTab = (k, focus) => { state.tab = k; persist(); $$('.oz__tabs [role=tab]', w).forEach(b => { const on = b.dataset.tab === k; b.setAttribute('aria-selected', on); b.tabIndex = on ? 0 : -1; if (on){ const line = $('.oz__tabline', w); line.style.transform = `translateX(${b.offsetLeft}px)`; line.style.width = b.offsetWidth + 'px'; } });
    $$('.oz__view', w).forEach(v => { v.hidden = v.dataset.view !== k; }); if (k === 'today') renderToday(); if (k === 'ask'){ log.scrollTop = log.scrollHeight; if (focus) input.focus({ preventScroll: true }); } };
  $$('.oz__tabs [role=tab]', w).forEach((b, i, all) => { b.addEventListener('click', () => setTab(b.dataset.tab, true)); b.addEventListener('keydown', e => { if (!/Arrow(Left|Right)/.test(e.key)) return; const n = all[(i + (e.key === 'ArrowRight' ? 1 : all.length - 1)) % all.length]; n.focus(); setTab(n.dataset.tab); }); });

  /* messages */
  const cardHtml = a => {
    if (a.type === 'verse') return `<div class="oz-card oz-card--verse" data-ref="${esc(a.reference)}" data-tr="${esc(a.translation)}"><span class="oz-card__k">${esc(a.reference)} <i>${esc(a.translation)}</i></span><blockquote>${esc(a.text)}</blockquote><div class="oz-card__row"><button type="button" class="oz-chip" data-act="copy">${I.copy}Copy</button><button type="button" class="oz-chip" data-act="image">${I.img}Share image</button><button type="button" class="oz-chip" data-act="read">${I.book}Read in context</button></div></div>`;
    if (a.type === 'calendar') return `<div class="oz-card" data-cal='${esc(JSON.stringify(a))}'><span class="oz-card__ico">${I.cal}</span><div><span class="oz-card__k">Reminder ready</span><b>${esc(a.title)}</b><small>${esc(new Date(a.start).toLocaleString([], { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }))}${a.location ? ' &middot; ' + esc(a.location) : ''}</small><div class="oz-card__row"><a class="oz-chip oz-chip--gold" href="${esc(a.gcal)}" target="_blank" rel="noopener">Google Calendar</a><button type="button" class="oz-chip" data-act="ics">Apple or Outlook (.ics)</button></div></div></div>`;
    if (a.type === 'form') return `<div class="oz-card" data-form='${esc(JSON.stringify({ form: a.form, fields: a.fields, href: a.href }))}'><span class="oz-card__ico">${I.form}</span><div><span class="oz-card__k">Filled in, waiting for you</span><b>${esc(a.label)}</b><dl>${Object.entries(a.fields || {}).slice(0, 6).map(([k, v]) => `<dt>${esc(FIELD_LABEL[k] || k)}</dt><dd>${esc(v)}</dd>`).join('')}</dl><div class="oz-card__row"><button type="button" class="oz-chip oz-chip--gold" data-act="form">Open, check and submit ${I.arrow}</button></div></div></div>`;
    if (a.type === 'whatsapp') return `<div class="oz-card"><span class="oz-card__ico">${I.wa}</span><div><span class="oz-card__k">Draft message</span><p class="oz-card__msg">${esc(a.message)}</p><div class="oz-card__row"><a class="oz-chip oz-chip--gold" href="${esc(a.href)}" target="_blank" rel="noopener">${esc(a.label || 'Send on WhatsApp')}</a></div></div></div>`;
    if (a.type === 'plan') return `<div class="oz-card" data-plan='${esc(JSON.stringify({ title: a.title, days: a.days }))}'><span class="oz-card__ico">${I.book}</span><div><span class="oz-card__k">Reading plan &middot; ${a.days.length} days</span><b>${esc(a.title)}</b><ol>${a.days.slice(0, 3).map(d => `<li>${esc(d.reference)}${d.focus ? ' <small>' + esc(d.focus) + '</small>' : ''}</li>`).join('')}${a.days.length > 3 ? `<li class="oz-more">and ${a.days.length - 3} more</li>` : ''}</ol><div class="oz-card__row"><button type="button" class="oz-chip oz-chip--gold" data-act="plan">Save to Today</button></div></div></div>`;
    return '';
  };
  const add = (who, text, go, actions, restored) => { const el = document.createElement('div'); el.className = 'oz-msg is-' + who + (restored ? ' is-restored' : '');
    if (!restored){ state.log.push({ who, text, go, actions }); persist(); }
    el.innerHTML = who === 'bot' ? `<span class="oz-msg__mark">${markSvg('ozm-m')}</span><div class="oz-msg__body"><div class="oz-rich">${rich(text)}</div>${(actions || []).map(cardHtml).join('')}${go ? `<a class="oz-go" href="${esc(go[0])}" data-oz-go>${esc(go[1])} ${I.arrow}</a>` : ''}</div>` : `<div class="oz-msg__body">${esc(text)}</div>`;
    log.appendChild(el);
    if (who === 'bot' && !restored && !RM){ const nodes = $$('.oz-rich p, .oz-rich li', el); const extras = $$('.oz-card, .oz-go', el); extras.forEach(x => x.classList.add('is-wait')); nodes.forEach(n => { n._full = n.innerHTML; n._parts = n.innerHTML.split(/(\s+)/); n.innerHTML = ''; }); const total = nodes.reduce((s, n) => s + n._parts.length, 0), step = Math.max(2, Math.ceil(total / 50));
      const tick = () => { let left = step; for (const n of nodes){ while (n._parts.length && left){ n.innerHTML += n._parts.shift(); left--; } if (!left) break; } log.scrollTop = log.scrollHeight; if (nodes.some(n => n._parts.length)) setTimeout(tick, 18); else { nodes.forEach(n => { n.innerHTML = n._full; }); extras.forEach((x, i) => setTimeout(() => x.classList.remove('is-wait'), 120 * i)); } }; tick(); }
    log.scrollTo({ top: log.scrollHeight, behavior: RM || restored ? 'auto' : 'smooth' }); return el; };
  const thinking = () => { const el = document.createElement('div'); el.className = 'oz-msg is-bot is-thinking'; el.innerHTML = `<span class="oz-msg__mark">${markSvg('ozm-t')}</span><div class="oz-msg__body"><span class="oz-think"><i></i><i></i><i></i></span><small>Ozer is thinking</small></div>`; log.appendChild(el); log.scrollTop = log.scrollHeight; return el; };

  /* open, close, expand */
  const hideNudge = () => { nudge.hidden = true; try { sessionStorage.setItem('ozer:nudged', '1'); } catch (e){} };
  const setExpanded = on => { state.big = on; persist(); w.classList.toggle('is-big', on); const b = $('.oz__size', w); b.innerHTML = on ? I.shrink : I.expand; b.setAttribute('aria-label', on ? 'Make smaller' : 'Expand'); b.title = on ? 'Make smaller' : 'Expand'; document.documentElement.classList.toggle('oz-lock', on && innerWidth > 640); setTimeout(() => setTab(state.tab || 'ask'), 30); };
  const open = (on, quiet) => { clearTimeout(closing); fab.setAttribute('aria-expanded', on); w.classList.toggle('is-open', on); hideNudge(); state.open = on; persist();
    if (on){ panel.hidden = false; void panel.offsetWidth; panel.classList.add('is-in'); setTab(state.tab || 'ask', !quiet); if (!log.children.length) add('bot', PER_SITE.greet); }
    else { panel.classList.remove('is-in'); document.documentElement.classList.remove('oz-lock'); closing = setTimeout(() => { panel.hidden = true; }, RM ? 0 : 360); if (!quiet) fab.focus({ preventScroll: true }); } };
  fab.addEventListener('click', () => open(panel.hidden || !panel.classList.contains('is-in')));
  $('.oz__close', w).addEventListener('click', () => open(false));
  $('.oz__size', w).addEventListener('click', () => setExpanded(!w.classList.contains('is-big')));
  $('.oz__nudge-x', w).addEventListener('click', e => { e.stopPropagation(); hideNudge(); }); nudge.addEventListener('click', () => open(true));
  addEventListener('keydown', e => { if (e.key === 'Escape' && !panel.hidden) open(false); });
  w.addEventListener('click', e => { if (e.target === w && w.classList.contains('is-big')) open(false); });
  document.addEventListener('click', e => { if (!panel.hidden && !w.classList.contains('is-big') && !w.contains(e.target) && !e.target.closest('[data-ozer]') && innerWidth > 640) open(false); });
  /* navbar and menu buttons */
  document.addEventListener('click', e => { const t = e.target.closest('[data-ozer]'); if (!t) return; e.preventDefault(); const closer = $('.drawer.is-open .drawer__close, .menu.is-open .menu__close, .is-menu-open .menu__close'); if (closer) closer.click(); if (innerWidth > 900) setExpanded(true); open(true); if (t.dataset.ozer) setTab(t.dataset.ozer, true); });

  /* ask */
  const ask = async q => { if (w.classList.contains('is-busy')) return; setTab('ask'); history.push({ role:'user', content:q }); add('user', q); w.classList.add('has-history'); const t = thinking(); w.classList.add('is-busy');
    let ans; try { ans = CFG.chatEndpoint ? await remote(history.slice(-10)) : local(q); } catch (e){ ans = local(q); }
    t.remove(); w.classList.remove('is-busy'); history.push({ role:'assistant', content: ans.text }); add('bot', ans.text, ans.go, (ans.actions || []).slice(0, 5)); };
  const grow = () => { input.style.height = 'auto'; input.style.height = Math.min(input.scrollHeight, 140) + 'px'; };
  input.addEventListener('input', grow);
  input.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey){ e.preventDefault(); form.requestSubmit(); } });
  form.addEventListener('submit', e => { e.preventDefault(); const q = input.value.trim(); if (!q) return; input.value = ''; grow(); ask(q); });
  $$('.oz__sugg button', w).forEach(b => b.addEventListener('click', () => ask(b.textContent)));
  $$('.oz__task', w).forEach(b => b.addEventListener('click', () => ask(b.dataset.prompt)));

  /* action cards */
  log.addEventListener('click', async e => {
    if (e.target.closest('[data-oz-go]')){ state.open = true; persist(); return; }
    const b = e.target.closest('[data-act]'); if (!b) return; const card = b.closest('.oz-card'); const act = b.dataset.act;
    if (act === 'copy' || act === 'image'){ const ref = card.dataset.ref, tr = card.dataset.tr, text = $('blockquote', card).textContent; b.disabled = true; const msg = act === 'copy' ? await (async () => { try { await navigator.clipboard.writeText(`"${text}" ${ref} (${tr})`); return 'Copied.'; } catch (_) { return 'Could not copy.'; } })() : await shareVerse(ref, text, tr, true); b.disabled = false; if (msg) flash(b, msg); }
    if (act === 'read'){ openPassage(card.dataset.ref.replace(/:\d+(-\d+)?$/, ''), null); }
    if (act === 'ics'){ const a = JSON.parse(card.dataset.cal); const z = d => new Date(d).toISOString().replace(/[-:]/g, '').replace(/\.\d+/, ''); const ics = ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//CCFC Zambia//Ozer//EN','BEGIN:VEVENT',`UID:${Date.now()}@ccfczambia.org`,`DTSTAMP:${z(Date.now())}`,`DTSTART:${z(a.start)}`,`DTEND:${z(a.end)}`,`SUMMARY:${a.title.replace(/[,;]/g, '\\$&')}`,`LOCATION:${(a.location || '').replace(/[,;]/g, '\\$&')}`,`DESCRIPTION:${(a.details || '').replace(/\n/g, '\\n').replace(/[,;]/g, '\\$&')}`,'BEGIN:VALARM','TRIGGER:-PT2H','ACTION:DISPLAY','DESCRIPTION:Reminder','END:VALARM','END:VEVENT','END:VCALENDAR'].join('\r\n');
      const link = document.createElement('a'); link.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' })); link.download = a.title.replace(/[^\w]+/g, '-') + '.ics'; document.body.appendChild(link); link.click(); setTimeout(() => { URL.revokeObjectURL(link.href); link.remove(); }, 1000); flash(b, 'Downloaded.'); }
    if (act === 'form'){ const f = JSON.parse(card.dataset.form); setFill(f.form, f.fields); state.open = false; persist(); location.href = f.href; }
    if (act === 'plan'){ const p = JSON.parse(card.dataset.plan); const plans = ls.get(PLANS_KEY, []); plans.unshift({ id: Date.now(), title: p.title, days: p.days, done: [] }); ls.set(PLANS_KEY, plans.slice(0, 8)); flash(b, 'Saved to Today.'); setTimeout(() => setTab('today'), 700); }
  });
  const flash = (b, msg) => { const old = b.innerHTML; b.innerHTML = I.check + esc(msg); b.classList.add('is-done'); setTimeout(() => { b.innerHTML = old; b.classList.remove('is-done'); }, 1800); };

  /* Bible reader */
  const scroll = $('.oz__scroll', w), refForm = $('.oz__ref', w);
  const openPassage = async (ref, tr) => { tr = tr || refForm.tr.value; refForm.ref.value = ref; setTab('bible'); scroll.innerHTML = '<div class="oz__loading"><i></i><i></i><i></i></div>';
    try { const d = await passage(ref, tr); prefs.tr = tr; ls.set(PREF_KEY, prefs); const text = d.verses.map(v => v.text.replace(/\s+/g, ' ').trim()).join(' ');
      scroll.innerHTML = `<header><span class="oz-card__k">${esc(TR_NAME[tr])}</span><h3>${esc(d.reference)}</h3></header><div class="oz__text">${d.verses.map(v => `<span class="oz__v"><sup>${v.verse}</sup>${esc(v.text.replace(/\s+/g, ' ').trim())} </span>`).join('')}</div>
        <div class="oz-card__row oz__bibleacts"><button type="button" class="oz-chip oz-chip--gold" data-b="explain">${I.spark}Explain with Ozer</button><button type="button" class="oz-chip" data-b="pray">Pray this</button><button type="button" class="oz-chip" data-b="image">${I.img}Share image</button><button type="button" class="oz-chip" data-b="copy">${I.copy}Copy</button></div>`;
      scroll.scrollTop = 0; scroll.dataset.ref = d.reference; scroll.dataset.text = text.slice(0, 1400); scroll.dataset.tr = TR_NAME[tr]; }
    catch (err){ scroll.innerHTML = `<div class="oz__empty"><p>${esc(err.message)}</p></div>`; } };
  refForm.addEventListener('submit', e => { e.preventDefault(); const r = refForm.ref.value.trim(); if (r) openPassage(r); });
  refForm.tr.addEventListener('change', () => { if (scroll.dataset.ref) openPassage(scroll.dataset.ref); });
  $$('.oz__picks button', w).forEach(b => b.addEventListener('click', () => openPassage(b.textContent)));
  scroll.addEventListener('click', async e => { const b = e.target.closest('[data-b]'); if (!b) return; const { ref, text, tr } = scroll.dataset;
    if (b.dataset.b === 'explain') ask(`Explain ${ref} for me: what it meant then and what it means for my life today.`);
    if (b.dataset.b === 'pray') ask(`Write a short prayer from ${ref} that I can pray today.`);
    if (b.dataset.b === 'image'){ const m = await shareVerse(ref, text, tr, true); if (m) flash(b, m); }
    if (b.dataset.b === 'copy'){ try { await navigator.clipboard.writeText(`${ref} (${tr})\n${text}`); flash(b, 'Copied.'); } catch (_) {} } });

  /* Today: verse of the day + reading plans */
  const todayEl = $('.oz__todayin', w);
  async function renderToday(){
    const plans = ls.get(PLANS_KEY, []); const ref = votdRef();
    todayEl.innerHTML = `<div class="oz-votd"><span class="oz-card__k">Verse for ${esc(new Date().toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long' }))}</span><blockquote class="oz-votd__text"><span class="oz__loading"><i></i><i></i><i></i></span></blockquote><b class="oz-votd__ref">${esc(ref)}</b>
      <div class="oz-card__row"><button type="button" class="oz-chip oz-chip--gold" data-t="reflect">${I.spark}Reflect with Ozer</button><button type="button" class="oz-chip" data-t="read">${I.book}Read the chapter</button><button type="button" class="oz-chip" data-t="image">${I.img}Share image</button></div></div>
      <div class="oz-plans"><div class="oz-plans__head"><h4>Reading plans</h4><button type="button" class="oz-chip" data-t="new">${I.plus}New plan</button></div>
      ${plans.length ? plans.map(p => `<details class="oz-plan" data-id="${p.id}" ${p === plans[0] ? 'open' : ''}><summary><b>${esc(p.title)}</b><span class="oz-plan__bar"><i style="width:${Math.round((p.done.length / p.days.length) * 100)}%"></i></span><small>${p.done.length} of ${p.days.length}</small></summary><ol>${p.days.map(d => `<li class="${p.done.includes(d.day) ? 'is-done' : ''}"><button type="button" class="oz-plan__tick" data-day="${d.day}" aria-label="Mark day ${d.day} ${p.done.includes(d.day) ? 'not done' : 'done'}">${I.check}</button><button type="button" class="oz-plan__ref" data-ref="${esc(d.reference)}"><b>Day ${d.day}: ${esc(d.reference)}</b>${d.focus ? `<small>${esc(d.focus)}</small>` : ''}</button></li>`).join('')}</ol><button type="button" class="oz-plan__del">Remove plan</button></details>`).join('') : '<p class="oz__lead">No plans yet. Ask Ozer for one, for example "a 7 day plan on peace" or "read through Acts in a month".</p>'}</div>`;
    const cacheKey = 'ozer:votd'; const cached = ls.get(cacheKey); const box = $('.oz-votd__text', todayEl);
    let text = cached && cached.day === dayKey() && cached.tr === prefs.tr ? cached.text : '';
    if (!text){ try { const d = await passage(ref, prefs.tr); text = d.verses.map(v => v.text.replace(/\s+/g, ' ').trim()).join(' '); ls.set(cacheKey, { day: dayKey(), tr: prefs.tr, text }); } catch (_) { text = ''; } }
    box.textContent = text || 'Open the Bible tab to read today\'s verse.'; todayEl.dataset.text = text;
  }
  todayEl.addEventListener('click', async e => {
    const t = e.target.closest('[data-t]'); const ref = votdRef();
    if (t){ const k = t.dataset.t;
      if (k === 'reflect') ask(`Give me a short devotional on today's verse, ${ref}: a reflection, one question to think about, and a one line prayer.`);
      if (k === 'read') openPassage(ref.replace(/:\d+(-\d+)?$/, ''));
      if (k === 'image' && todayEl.dataset.text){ const m = await shareVerse(ref, todayEl.dataset.text, TR_NAME[prefs.tr], true); if (m) flash(t, m); }
      if (k === 'new') ask('Create a Bible reading plan for me. Ask me the topic and how many days.');
      return; }
    const det = e.target.closest('.oz-plan'); if (!det) return; const plans = ls.get(PLANS_KEY, []); const p = plans.find(x => String(x.id) === det.dataset.id); if (!p) return;
    const tick = e.target.closest('.oz-plan__tick'), rb = e.target.closest('.oz-plan__ref');
    if (tick){ const d = +tick.dataset.day; p.done = p.done.includes(d) ? p.done.filter(x => x !== d) : [...p.done, d]; ls.set(PLANS_KEY, plans); renderToday(); }
    if (rb) openPassage(rb.dataset.ref);
    if (e.target.closest('.oz-plan__del') && confirm('Remove this reading plan?')){ ls.set(PLANS_KEY, plans.filter(x => x !== p)); renderToday(); }
  });

  /* restore the conversation from the last page and reopen if it was open */
  if (saved && saved.log.length){ saved.log.forEach(m => add(m.who, m.text, m.go, m.actions, true)); if (saved.log.some(m => m.who === 'user')) w.classList.add('has-history'); }
  $('.oz__new', w).addEventListener('click', () => { const keepOpen = state.open, big = state.big; mem.clear(); state.log = []; state.history.length = 0; state.open = keepOpen; state.big = big; log.innerHTML = ''; w.classList.remove('has-history'); setTab('ask'); add('bot', PER_SITE.greet); input.focus(); });
  let nudged = !!(saved && saved.log.length); try { nudged = nudged || !!sessionStorage.getItem('ozer:nudged') || !!sessionStorage.getItem('ccfc:nudged'); } catch (e){}
  const qp = new URLSearchParams(location.search);
  if (!nudged && !qp.get('chat') && !qp.get('ozer')) setTimeout(() => { if (panel.hidden) nudge.hidden = false; }, 9000);
  setTimeout(() => w.classList.add('is-ready'), 600);
  if (qp.get('ozer') || qp.get('chat')){ if (innerWidth > 900) setExpanded(true); open(true); if (['bible','today','tasks','ask'].includes(qp.get('ozer'))) setTab(qp.get('ozer')); }
  else if (saved && saved.open && saved.log.length){ if (saved.big && innerWidth > 900) setExpanded(true); open(true, true); }
  addEventListener('resize', () => { if (!panel.hidden) setTab(state.tab || 'ask'); }, { passive: true });
  window.Ozer = { open: tab => { open(true); if (tab) setTab(tab); }, ask };
}
function boot(){ widget(); applyFill(); }
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
