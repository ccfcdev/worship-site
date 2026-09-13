/* ================================================================
   Mazar, the AI Bible companion of Christ Connect Family Church Zambia
   One engine, three modes (window.MAZAR.mode):
   - widget: floating companion on ccfczambia.org, koinonia., worship.
             (each site's own colours; Ask, Bible, Today, Tasks)
   - page:   the same companion filling a page (ccfczambia.org/mazar)
   - studio: the full Mazar platform on mazar.ccfczambia.org: many
             conversations, Study tools, doctrine, reading plans.
   The Mazar figure is a living field of tiny stars (canvas) that reacts
   to the conversation: listening, thinking, speaking, joy, error.
   Mazar prepares things (calendar, forms, drafts, plans) but never sends
   or submits anything; the person always presses the final button.
   ================================================================ */
(() => {
'use strict';
const $ = (s, r=document) => r.querySelector(s), $$ = (s, r=document) => [...r.querySelectorAll(s)];
const CFG = window.CCFC_CONFIG || {};
const OPT = window.MAZAR || {};
const MODE = ['widget', 'page', 'studio'].includes(OPT.mode) ? OPT.mode : 'widget';
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const KB = Object.assign({ sunday: '07:45 to 10:00', venue: 'Kings Sparkle School, off Kasangula Road, Mandevu, Lusaka', email: 'ccfczambia@gmail.com', phone: '+260 975 065 391', mission: 'Connecting people to Christ in the power of the Holy Spirit, and empowering them to become multiplying disciples.', midweek: 'group and prayer times on WhatsApp', koinoniaUrl: 'https://koinonia.ccfczambia.org', worshipUrl: 'https://worship.ccfczambia.org' }, window.CCFC_KB || {});
const SITE_KEY = (window.CCFC_SITE && window.CCFC_SITE.key) || (MODE === 'studio' ? 'mazar' : 'ccfc');
const THEME = OPT.theme || SITE_KEY;
const MAIN = SITE_KEY === 'ccfc' ? '' : 'https://ccfczambia.org';
const STUDIO_URL = 'https://mazar.ccfczambia.org';
const HERE = location.hostname + location.pathname;
const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
const NAME = 'Mazar';
const PER_SITE = {
  ccfc:     { name: 'CCFC Zambia', greet: 'Peace to you. I am **Mazar**, the AI Bible companion of Christ Connect Family Church Zambia.\n\nAsk me about the Bible, pray with me, or let me handle small jobs: planning your visit, finding a sermon, sending a prayer request.', nudge: 'Bible questions, prayer, service times, directions. I can also do small tasks for you.', placeholder: 'Ask Mazar about the Bible or the church...', suggest: ['Verses for when I feel anxious', 'Plan my visit this Sunday', 'Explain John 3:16', 'Send a prayer request', 'Service times', 'Watch a sermon'] },
  koinonia: { name: 'Koinonia', greet: "Peace to you. I am **Mazar**, the AI Bible companion for Koinonia Experience.\n\nAsk me about Koi 26', let me fill in your registration, or open the Bible together.", nudge: "Koi 26', registration, photos, the Bible. I can fill in your registration for you.", placeholder: "Ask Mazar about Koi 26' or the Bible...", suggest: ["Register me for Koi 26'", "When is Koi 26'?", 'What does koinonia mean?', "Koi 25' photos", "Remind me about Koi 26'", 'How much does it cost?'] },
  worship:  { name: 'Worship Connect', greet: 'Peace to you. I am **Mazar**, the AI Bible companion for Worship Connect.\n\nAsk me about joining the team, the songs we sing, or what the Bible says about worship.', nudge: 'Joining the team, rehearsals, worship in the Bible. I can start your application.', placeholder: 'Ask Mazar about worship or the team...', suggest: ['Help me apply to join', 'What does the Bible say about worship?', 'When do you rehearse?', 'Watch every set', 'A Psalm to start my day', 'Service times'] },
  mazar:    { name: 'Mazar', greet: 'Peace to you. I am **Mazar**, an AI companion for the Word, built by Christ Connect Family Church Zambia.\n\nAsk me anything about the Bible, study a passage with me, build a reading plan, pray, or let me take care of a small task.', nudge: '', placeholder: 'Ask Mazar anything about the Bible...', suggest: ['Study Romans 8 with me', 'What does the Bible say about fear?', 'Build me a 14 day plan on prayer', 'Quiz me on the Gospel of John', 'Explain the Trinity simply', 'Pray with me for my family'] },
}[SITE_KEY] || {};
const abs = h => (!h || /^https?:/.test(h)) ? h : MAIN + h;
const ls = { get(k, d){ try { const v = JSON.parse(localStorage.getItem(k) || 'null'); return v ?? d; } catch (_) { return d; } }, set(k, v){ try { localStorage.setItem(k, JSON.stringify(v)); } catch (_) {} }, del(k){ try { localStorage.removeItem(k); } catch (_) {} } };

/* ---------- storage ---------- */
const MEM_KEY = 'mazar:v1', OLD_KEYS = ['ozer:v2', 'ccfc-chat:v1'], MEM_TTL = 7 * 24 * 3600 * 1000;
const mem = {   /* widget and page: one conversation that follows the person across pages, 7 days, this device only */
  load(){ let m = ls.get(MEM_KEY); if (!m) for (const k of OLD_KEYS){ m = ls.get(k); if (m) break; } return m && Date.now() - m.t < MEM_TTL ? Object.assign({ log: [], history: [] }, m) : null; },
  save(m){ m.t = Date.now(); m.log = m.log.slice(-40); m.history = m.history.slice(-16); ls.set(MEM_KEY, m); },
  clear(){ ls.del(MEM_KEY); OLD_KEYS.forEach(k => ls.del(k)); },
};
const CONVOS_KEY = 'mazar:convos';   /* studio: many conversations */
const PLANS_KEY = 'mazar:plans', PREF_KEY = 'mazar:prefs';
const prefs = Object.assign({ tr: 'web' }, ls.get('ozer:prefs', {}), ls.get(PREF_KEY, {}));
const loadPlans = () => ls.get(PLANS_KEY) || ls.get('ozer:plans', []);

/* ---------- offline answers (when the AI endpoint is unreachable) ---------- */
const INTENTS = [
  { k:['koi 25 photo','koi 25\' photo','photos','pictures','download photo','gallery'], a:"The Koi 25' photos are on the Koinonia site. You can view each one large and download it, or download them all.", go:[KB.koinoniaUrl + '/k25-photos', "Koi 25' photos"] },
  { k:['join the team','join worship','audition','rehearse','rehearsal','practice','apply'], a:'Worship Connect rehearses every week. Apply on the Join page and a team leader will message you on WhatsApp with the next rehearsal.', go:[KB.worshipUrl + '/join', 'Join the team'] },
  { k:['cost','price','fee','how much'], a:"The Koi 26' delegate fee will be announced with the dates. For Koi 25' it was K200 for Zambian delegates and USD 10 for international delegates.", go:[KB.koinoniaUrl + '/k26#register', "Register for Koi 26'"] },
  { k:['service time','what time','when do you meet','sunday','when is church','times','schedule','midweek','plan my visit'], a:`We gather every Sunday, ${KB.sunday}, at ${KB.venue}. Connect groups and prayer meet through the week; the office shares ${KB.midweek}.`, go:['/visit','Plan a visit'] },
  { k:['where','address','location','directions','map','find you','venue','mandevu','kasangula'], a:`We meet at ${KB.venue}. Tap below for the map and directions, or message us on WhatsApp and we will send a pin.`, go:['/visit#map','Open directions'] },
  { k:['first time','visit','visiting','new here','what to expect','dress','wear','kids','children','parking'], a:'You are very welcome. No dress code. During the announcements visitors stand and introduce themselves and the church welcomes you warmly. Children are welcome and Connect Kids runs during the sermon. Service is 07:45 to 10:00.', go:['/visit','What to expect'] },
  { k:['watch','sermon','video','online','youtube','livestream','stream','acts','teaching'], a:'Teaching and worship from our gatherings are on the Watch page and on our YouTube channel. Pastor Francis Chewe is currently teaching through the Book of Acts.', go:['/watch','Watch'] },
  { k:['give','giving','tithe','offering','donate','mobile money','bank','airtel','mtn'], a:'Giving at CCFC comes from the heart; nobody is asked to give. If you want to, you can give in person on Sunday, by mobile money or by bank transfer. The Give page explains each.', go:['/give','Ways to give'] },
  { k:['contact','phone','email','whatsapp','call','number','reach'], a:`Email ${KB.email} or message us on WhatsApp at ${KB.phone}. A real person replies.`, go:['/contact','Contact us'] },
  { k:['koinonia','conference','k25','k26','k24','register','registration'], a:'Koinonia is our annual family conference in Lusaka every December. The next one is Koi 26\'. The Koinonia site has every edition, videos and registration.', go:[KB.koinoniaUrl || '/gatherings','Koinonia site'] },
  { k:['worship connect','worship team','choir','singers','band','join the choir','sing'], a:'Worship Connect is our praise and worship team. Their videos and the way to join are on the Worship Connect site.', go:[KB.worshipUrl || '/ministries','Worship Connect'] },
  { k:['pastor','bishop','reverend','leader','leadership','who leads','francis','weston','austern','munyeke','katsande','deacon'], a:'Reverend Weston Chewe is Presiding Bishop of CCFC Zambia, Pastor Francis Chewe is Senior Pastor and Pastor Austern Munyeke serves as Pastor. Bishop Farai Katsande leads CCFC International from Harare.', go:['/about#leaders','Meet the leadership'] },
  { k:['believe','doctrine','statement of faith','denomination','what kind of church','evangelical','holy spirit'], a:'We are an evangelical church that teaches the Bible book by book, preaches Christ as the only way, and depends on the Holy Spirit. Our mission: ' + KB.mission, go:['/about','About us'] },
  { k:['library','study material','notes','book','powerpoint','slides','upper room'], a:'The Upper Room library holds books, slides, notes and doctrine material, free for everyone to read and download.', go:['/library','Upper Room library'] },
  { k:['prayer','pray','prayer request','struggling','need help','counsel','anxious','afraid','sad'], a:'We would love to pray with you. Send a prayer request through the contact form; it goes only to the pastoral team. You can also open the Bible tab and read Psalm 23 or Philippians 4:6-7.', go:['/contact','Send a prayer request'] },
  { k:['hello','hi','hey','good morning','good evening','help'], a:'Hello. I can help with the Bible, prayer, service times, directions, watching sermons, giving, Koinonia, or finding anything on the site. What would you like?' },
];
const FALLBACK = `I cannot reach my thinking right now. Try the Bible tab, or message the church on WhatsApp at ${KB.phone} and someone will help.`;
function local(q){ const t = q.toLowerCase(); let best = null, bs = 0; for (const i of INTENTS){ const s = i.k.reduce((s,k) => s + (t.includes(k) ? (k.length > 6 ? 2 : 1) : 0), 0); if (s > bs){ bs = s; best = i; } } return best ? { text: best.a, go: best.go ? [abs(best.go[0]), best.go[1]] : undefined } : { text: FALLBACK }; }
async function remote(history){
  const r = await fetch(CFG.chatEndpoint, { method:'POST', headers:{ 'Content-Type':'application/json', ...(CFG.supabaseKey ? { apikey: CFG.supabaseKey, Authorization: 'Bearer ' + CFG.supabaseKey } : {}) }, body: JSON.stringify({ messages: history, page: HERE, mode: MODE === 'studio' ? 'studio' : 'site' }) });
  if (!r.ok) throw new Error('chat endpoint ' + r.status); const ans = await r.json();
  if (!ans || typeof ans.text !== 'string') throw new Error('bad answer');
  ans.text = ans.text.replace(/\s*[\u2014\u2013]\s*/g, ', ');
  return ans;
}

/* ---------- Bible: every version we can serve freely, from the original languages to today ----------
   sources: api = bible-api.com, gb = api.getbible.net v2, bolls = bolls.life. Copyrighted modern versions are
   linked to BibleGateway instead of being served (their publishers hold the rights). */
const VERSIONS = [
  ['Original languages', [
    ['wlc', 'WLC', 'Westminster Leningrad Codex, Hebrew Old Testament', 'c. 1008', 'gb', 'codex', 'he', 'ot'],
    ['lxx', 'LXX', 'Septuagint, Greek Old Testament', '3rd to 1st century BC', 'gb', 'lxx', 'grc', 'ot'],
    ['tr', 'TR', 'Textus Receptus, Greek New Testament (Stephanus)', '1550', 'gb', 'textusreceptus', 'grc', 'nt'],
    ['wh', 'WH', 'Westcott and Hort, Greek New Testament', '1881', 'gb', 'westcotthort', 'grc', 'nt'],
    ['vul', 'VUL', 'Vulgata Clementina, Latin', '405, ed. 1592', 'gb', 'vulgate', 'la'],
  ]],
  ['Before the King James', [
    ['wyc', 'WYC', 'Wycliffe Bible', 'c. 1395', 'gb', 'wycliffe'],
    ['tyn', 'TYN', 'Tyndale Bible', '1526 to 1530', 'gb', 'tyndale'],
    ['gnv', 'GNV', 'Geneva Bible, with its study notes', '1560, ed. 1599', 'bolls', 'GNV'],
    ['drb', 'DRB', 'Douay-Rheims Bible', '1582 to 1610', 'bolls', 'DRB'],
    ['lxxe', 'LXX-E', "Brenton's English Septuagint (Old Testament)", '1851', 'bolls', 'LXXE', 'en', 'ot'],
  ]],
  ['Classic English', [
    ['kjv', 'KJV', 'King James Version', '1611, ed. 1769', 'api', 'kjv'],
    ['wb', 'WBT', "Webster's Bible", '1833', 'gb', 'wb'],
    ['ylt', 'YLT', "Young's Literal Translation", '1862, ed. 1898', 'gb', 'ylt'],
    ['dby', 'DBY', 'Darby Translation', '1890', 'api', 'darby'],
    ['dra', 'DRA', 'Douay-Rheims, 1899 American Edition', '1899', 'api', 'dra'],
    ['asv', 'ASV', 'American Standard Version', '1901', 'api', 'asv'],
    ['wey', 'WEY', 'Weymouth New Testament', '1903', 'gb', 'weymouth', 'en', 'nt'],
    ['akjv', 'AKJV', 'American King James Version', '1999', 'gb', 'akjv'],
  ]],
  ['Modern, freely available', [
    ['web', 'WEB', 'World English Bible', '2000', 'api', 'web'],
    ['webbe', 'WEBBE', 'World English Bible, British Edition', '2000', 'api', 'webbe'],
    ['bbe', 'BBE', 'Bible in Basic English', '1949 to 1964', 'api', 'bbe'],
    ['oeb', 'OEB', 'Open English Bible', '2010', 'api', 'oeb-us'],
    ['bsb', 'BSB', 'Berean Standard Bible', '2016 to 2022', 'bolls', 'BSB'],
    ['lsv', 'LSV', 'Literal Standard Version', '2020', 'bolls', 'LSV'],
  ]],
  ['Copyrighted, read on BibleGateway', [
    ['niv', 'NIV', 'New International Version', '1978, ed. 2011', 'bg', 'NIV'], ['esv', 'ESV', 'English Standard Version', '2001, ed. 2016', 'bg', 'ESV'], ['nkjv', 'NKJV', 'New King James Version', '1982', 'bg', 'NKJV'], ['nlt', 'NLT', 'New Living Translation', '1996, ed. 2015', 'bg', 'NLT'], ['nasb', 'NASB', 'New American Standard Bible', '1971, ed. 2020', 'bg', 'NASB'], ['csb', 'CSB', 'Christian Standard Bible', '2017', 'bg', 'CSB'], ['nrsv', 'NRSV', 'New Revised Standard Version', '1989, ed. 2021', 'bg', 'NRSVUE'], ['rsv', 'RSV', 'Revised Standard Version', '1952', 'bg', 'RSV'], ['amp', 'AMP', 'Amplified Bible', '1965, ed. 2015', 'bg', 'AMP'], ['msg', 'MSG', 'The Message', '2002', 'bg', 'MSG'], ['net', 'NET', 'New English Translation', '2005', 'bg', 'NET'], ['gnt', 'GNT', 'Good News Translation', '1976', 'bg', 'GNT'],
  ]],
];
const VER = {}; VERSIONS.forEach(([, list]) => list.forEach(v => { VER[v[0]] = { id: v[0], abbr: v[1], name: v[2], year: v[3], src: v[4], code: v[5], lang: v[6] || 'en', part: v[7] || 'all' }; }));
if (!VER[prefs.tr]) prefs.tr = 'web';
const TR_NAME = new Proxy({}, { get: (_, k) => (VER[k] ? VER[k].name : String(k)) });
const NOT_DIGITISED = 'Coverdale (1535), Matthew\'s Bible (1537), the Great Bible (1539) and the Bishops\' Bible (1568) have no free digital text yet; Wycliffe, Tyndale, Geneva and Douay-Rheims are here.';
const BOOK_ALIASES = { ps: 19, psa: 19, psalm: 19, psalms: 19, song: 22, songofsongs: 22, sos: 22, canticles: 22, is: 23, jn: 43, joh: 43, jhn: 43, jon: 32, jud: 7, jdg: 7, jude: 65, jas: 59, phm: 57, phlm: 57, php: 50, phil: 50, mrk: 41, mk: 41, mt: 40, matt: 40, lk: 42, luk: 42, ac: 44, rom: 45, ro: 45, re: 66, rev: 66, ex: 2, exo: 2, dt: 5, deu: 5, deut: 5, ru: 8, est: 17, jb: 18, pr: 20, prov: 20, ecc: 21, eccl: 21, qoh: 21, isa: 23, jer: 24, lam: 25, eze: 26, ezek: 26, dan: 27, hos: 28, joe: 29, am: 30, oba: 31, ob: 31, mic: 33, nah: 34, hab: 35, zep: 36, zeph: 36, hag: 37, zec: 38, zech: 38, mal: 39, heb: 58, tit: 56, gal: 48, eph: 49, col: 51, gen: 1, lev: 3, num: 4, jos: 6, josh: 6, neh: 16, ezr: 15 };
function parseRef(s){
  const m = String(s).trim().match(/^((?:[1-3]|i{1,3})\s*)?([a-z][a-z .']*?)\s*(\d+)?(?::(\d+)(?:\s*[-–]\s*(\d+))?)?\s*$/i); if (!m) return null;
  const numPre = m[1] ? { i: 1, ii: 2, iii: 3 }[m[1].trim().toLowerCase()] || m[1].trim() : '';
  const key = (numPre + m[2]).toLowerCase().replace(/[^a-z0-9]/g, '');
  let book = BOOK_ALIASES[key] || 0;
  if (!book){ const norm = BOOKS.map(b => b.toLowerCase().replace(/[^a-z0-9]/g, '')); book = norm.indexOf(key) + 1 || norm.findIndex(b => b.startsWith(key)) + 1; }
  if (!book) return null;
  return { book, name: BOOKS[book - 1], chapter: +(m[3] || 1), from: m[4] ? +m[4] : 0, to: m[5] ? +m[5] : (m[4] ? +m[4] : 0) };
}
const strip = t => String(t).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
async function passage(ref, vid){
  const v = VER[vid] || VER.web; const chapterOnly = !/\d:\d/.test(ref);
  if (v.src === 'bg'){ const err = new Error(`${v.name} is copyrighted, so Mazar links to it instead of showing the text.`); err.bg = `https://www.biblegateway.com/passage/?search=${encodeURIComponent(ref)}&version=${v.code}`; throw err; }
  if (v.src === 'api'){ const r = await fetch(`https://bible-api.com/${encodeURIComponent(ref)}?translation=${v.code}`); if (!r.ok) throw new Error(r.status === 404 ? 'I could not find that passage. Try a form like John 3:16 or Psalm 23.' : 'The Bible service is busy. Please try again in a moment.'); const d = await r.json(); return { reference: d.reference, verses: (d.verses || []).map(x => ({ verse: x.verse, text: strip(x.text) })), version: v }; }
  const p = parseRef(ref); if (!p) throw new Error('I could not read that reference. Try a form like John 3:16 or Psalm 23.');
  if (v.part === 'ot' && p.book > 39) throw new Error(`${v.name} covers the Old Testament only.`); if (v.part === 'nt' && p.book < 40) throw new Error(`${v.name} covers the New Testament only.`);
  const url = v.src === 'gb' ? `https://api.getbible.net/v2/${v.code}/${p.book}/${p.chapter}.json` : `https://bolls.life/get-chapter/${v.code}/${p.book}/${p.chapter}/`;
  const r = await fetch(url); if (!r.ok) throw new Error(r.status === 404 ? `${p.name} ${p.chapter} is not in ${v.name}.` : 'The Bible service is busy. Please try again in a moment.');
  const d = await r.json(); let rows = v.src === 'gb' ? (d.verses || []) : d; if (!Array.isArray(rows) || !rows.length) throw new Error(`${p.name} ${p.chapter} is not in ${v.name}.`);
  rows = rows.map(x => ({ verse: +x.verse, text: strip(x.text), note: x.comment ? strip(x.comment) : '' })).filter(x => !p.from || (x.verse >= p.from && x.verse <= p.to));
  if (!rows.length) throw new Error('Those verses are not in this chapter.');
  return { reference: `${p.name} ${p.chapter}${p.from ? ':' + p.from + (p.to > p.from ? '-' + p.to : '') : ''}`, verses: rows, version: v, notes: rows.filter(x => x.note).map(x => ({ verse: x.verse, note: x.note })) };
}
const VOTD = ['Psalm 23:1-3','Isaiah 41:10','Philippians 4:6-7','John 3:16','Romans 8:28','Jeremiah 29:11','Proverbs 3:5-6','Matthew 11:28-30','Joshua 1:9','Psalm 46:1','2 Corinthians 5:17','Lamentations 3:22-23','Romans 12:2','Galatians 5:22-23','Hebrews 11:1','1 Peter 5:7','Psalm 121:1-2','Isaiah 40:31','Matthew 6:33','John 14:27','Ephesians 2:8-9','Micah 6:8','Psalm 139:13-14','Romans 15:13','Colossians 3:23','James 1:5','John 15:5','Psalm 37:4','Acts 1:8','Acts 2:42','Zephaniah 3:17','Psalm 91:1-2','Deuteronomy 31:8','2 Timothy 1:7','Hebrews 13:8','1 John 1:9','Matthew 5:14-16','Psalm 119:105','Isaiah 26:3','Romans 5:8','John 11:25-26','Psalm 34:18','Nahum 1:7','Philippians 4:13','1 Corinthians 13:4-7','Psalm 27:1','Matthew 28:19-20','Isaiah 43:2','Psalm 100:4-5','John 8:12','Ephesians 3:20-21','Hebrews 12:1-2','Psalm 16:11','Romans 10:9','Proverbs 16:3','Mark 11:24','Psalm 145:18','John 1:5','Revelation 21:4','Numbers 6:24-26'];
const dayKey = () => { const d = new Date(); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; };
const votdRef = () => { const d = new Date(), start = new Date(d.getFullYear(), 0, 0); return VOTD[Math.floor((d - start) / 864e5) % VOTD.length]; };
const BOOKS = ['Genesis','Exodus','Leviticus','Numbers','Deuteronomy','Joshua','Judges','Ruth','1 Samuel','2 Samuel','1 Kings','2 Kings','1 Chronicles','2 Chronicles','Ezra','Nehemiah','Esther','Job','Psalms','Proverbs','Ecclesiastes','Song of Solomon','Isaiah','Jeremiah','Lamentations','Ezekiel','Daniel','Hosea','Joel','Amos','Obadiah','Jonah','Micah','Nahum','Habakkuk','Zephaniah','Haggai','Zechariah','Malachi','Matthew','Mark','Luke','John','Acts','Romans','1 Corinthians','2 Corinthians','Galatians','Ephesians','Philippians','Colossians','1 Thessalonians','2 Thessalonians','1 Timothy','2 Timothy','Titus','Philemon','Hebrews','James','1 Peter','2 Peter','1 John','2 John','3 John','Jude','Revelation'];

/* share a verse as an image: night sky, halo of light and the words */
function themeColors(root){ const cs = getComputedStyle(root); const g = s => cs.getPropertyValue(s).trim(); return { bg1: g('--mz-bg1') || '#141845', bg2: g('--mz-bg2') || '#05060F', glow: g('--mz-glow') || '#EBC872', light: g('--mz-light') || '#FFF8E6', accent: g('--mz-accent') || '#EBC872' }; }
async function verseImage(ref, text, trName, col){
  const c = document.createElement('canvas'); c.width = 1080; c.height = 1350; const x = c.getContext('2d');
  const g = x.createLinearGradient(0, 0, 0, 1350); g.addColorStop(0, col.bg1); g.addColorStop(1, col.bg2); x.fillStyle = g; x.fillRect(0, 0, 1080, 1350);
  const rgb = hex2rgb(col.glow);
  const glow = x.createRadialGradient(540, 120, 10, 540, 120, 760); glow.addColorStop(0, `rgba(${rgb},.42)`); glow.addColorStop(1, `rgba(${rgb},0)`); x.fillStyle = glow; x.fillRect(0, 0, 1080, 1350);
  for (let i = 0; i < 160; i++){ x.fillStyle = `rgba(255,248,230,${Math.random() * .6})`; x.beginPath(); x.arc(Math.random() * 1080, Math.random() * 1350, Math.random() * 1.6, 0, 7); x.fill(); }
  x.strokeStyle = col.glow; x.lineWidth = 3; x.beginPath(); x.arc(540, 250, 62, 0.35 * Math.PI, 2.15 * Math.PI); x.stroke();
  x.fillStyle = col.light; x.beginPath(); x.moveTo(540, 195); x.bezierCurveTo(543, 240, 550, 247, 595, 250); x.bezierCurveTo(550, 253, 543, 260, 540, 305); x.bezierCurveTo(537, 260, 530, 253, 485, 250); x.bezierCurveTo(530, 247, 537, 240, 540, 195); x.fill();
  let size = text.length > 520 ? 38 : text.length > 300 ? 46 : 56; x.textAlign = 'center';
  const wrap = () => { x.font = `${size}px "Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif`; const words = text.split(/\s+/), lines = []; let line = ''; for (const w of words){ const t = line ? line + ' ' + w : w; if (x.measureText(t).width > 860 && line){ lines.push(line); line = w; } else line = t; } if (line) lines.push(line); return lines; };
  let lines = wrap(); while (lines.length * size * 1.42 > 760 && size > 26){ size -= 3; lines = wrap(); }
  x.fillStyle = col.light; const top = 690 - (lines.length * size * 1.42) / 2 + size * .5; lines.forEach((l, i) => x.fillText(l, 540, top + i * size * 1.42));
  x.fillStyle = col.glow; x.font = '600 34px system-ui, sans-serif'; x.fillText(ref.toUpperCase(), 540, top + lines.length * size * 1.42 + 70);
  x.fillStyle = 'rgba(237,235,247,.6)'; x.font = '26px system-ui, sans-serif'; x.fillText(`${trName}  ·  Mazar, CCFC Zambia`, 540, 1270);
  return new Promise(res => c.toBlob(res, 'image/png'));
}
function hex2rgb(h){ h = String(h).trim(); const m = h.match(/^#?([0-9a-f]{3}|[0-9a-f]{6})$/i); if (!m) return '235,200,114'; let s = m[1]; if (s.length === 3) s = s.split('').map(c => c + c).join(''); return [0, 2, 4].map(i => parseInt(s.slice(i, i + 2), 16)).join(','); }
async function shareVerse(ref, text, trName, asImage, col){
  const words = `"${text}" ${ref} (${trName})`;
  if (asImage){ const blob = await verseImage(ref, text, trName, col); const file = new File([blob], ref.replace(/[^\w]+/g, '-') + '.png', { type: 'image/png' });
    if (navigator.canShare && navigator.canShare({ files: [file] })){ try { await navigator.share({ files: [file], title: ref }); return 'Shared.'; } catch (_) { return ''; } }
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = file.name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000); return 'Image saved.'; }
  if (navigator.share){ try { await navigator.share({ text: words }); return 'Shared.'; } catch (_) { return ''; } }
  try { await navigator.clipboard.writeText(words); return 'Copied.'; } catch (_) { return 'Could not copy.'; }
}

/* ---------- forms Mazar prefills (cookie shared across *.ccfczambia.org, 15 minutes, read once) ---------- */
const FILL_COOKIE = 'mazar-fill';
const FORM_SEL = { koinonia_registration: 'form.reg[data-edition]', worship_join: 'form.join', contact: 'form[data-handoff]' };
const cookieDomain = () => /ccfczambia\.org$/.test(location.hostname) ? '; domain=.ccfczambia.org' : '';
function setFill(form, fields){ document.cookie = `${FILL_COOKIE}=${encodeURIComponent(JSON.stringify({ form, fields }))}; max-age=900; path=/; samesite=lax${location.protocol === 'https:' ? '; secure' : ''}${cookieDomain()}`; }
function clearFill(){ document.cookie = `${FILL_COOKIE}=; max-age=0; path=/${cookieDomain()}`; document.cookie = `ozer-fill=; max-age=0; path=/${cookieDomain()}`; }
function applyFill(){
  const m = document.cookie.match(new RegExp('(?:^|; )(?:' + FILL_COOKIE + '|ozer-fill)=([^;]*)')); if (!m) return;
  let d; try { d = JSON.parse(decodeURIComponent(m[1])); } catch (_) { clearFill(); return; }
  const form = FORM_SEL[d.form] && $(FORM_SEL[d.form]); if (!form) return;
  clearFill(); let n = 0;
  Object.entries(d.fields || {}).forEach(([k, v]) => { const els = $$(`[name="${CSS.escape(k)}"]`, form); if (!els.length) return; const val = String(v); const el = els[0];
    if (el.type === 'radio' || el.type === 'checkbox'){ const hit = els.find(e => e.value.toLowerCase() === val.toLowerCase()) || els.find(e => val.toLowerCase().includes(e.value.toLowerCase())); if (hit){ hit.checked = true; hit.dispatchEvent(new Event('change', { bubbles: true })); n++; } }
    else if (el.tagName === 'SELECT'){ const opt = [...el.options].find(o => o.value.toLowerCase() === val.toLowerCase() || o.text.toLowerCase() === val.toLowerCase()) || [...el.options].find(o => o.value && o.text.toLowerCase().includes(val.toLowerCase())); if (opt){ el.value = opt.value; el.dispatchEvent(new Event('change', { bubbles: true })); n++; } }
    else { el.value = val; el.dispatchEvent(new Event('input', { bubbles: true })); n++; } });
  if (!n) return;
  const note = document.createElement('div'); note.className = 'mz-filled'; note.setAttribute('role', 'status');
  note.innerHTML = `${markSvg()}<span><b>Mazar filled in ${n} answer${n > 1 ? 's' : ''} for you.</b> Please check everything, complete anything missing, then press submit yourself.</span>`;
  form.parentNode.insertBefore(note, form);
  setTimeout(() => form.scrollIntoView({ behavior: RM ? 'auto' : 'smooth', block: 'start' }), 400);
}

/* ================================================================
   The Mazar figure: a field of tiny stars in the shape of a
   four-point star of light inside a broken halo, with a beam above and
   below and a reflection beneath. Always moving; it listens, thinks,
   speaks, rejoices and flinches with the conversation.
   ================================================================ */
class Figure {
  constructor(canvas, host){
    this.c = canvas; this.x = canvas.getContext('2d'); this.host = host; this.state = 'idle'; this.t0 = performance.now();
    this.env = 0; this.burst = 0; this.err = 0; this.px = null; this.py = null; this.par = { x: 0, y: 0 }; this.spin = 0; this.spin2 = 0; this.glowT = 0.75; this.glow = 0.75;
    this.parts = []; this.W = 0; this.H = 0; this.S = 0; this.dpr = Math.min(devicePixelRatio || 1, 1.5); this.visible = true; this.running = false;
    this.colors(); this.resize();
    this.ro = new ResizeObserver(() => this.resize()); this.ro.observe(host);
    this.io = new IntersectionObserver(es => { this.visible = es.some(e => e.isIntersecting); if (this.visible) this.start(); }, { threshold: 0.01 }); this.io.observe(canvas);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) this.start(); });
    host.addEventListener('pointermove', e => { const r = this.c.getBoundingClientRect(); this.px = (e.clientX - r.left); this.py = (e.clientY - r.top); }, { passive: true });
    host.addEventListener('pointerleave', () => { this.px = this.py = null; });
    host.addEventListener('click', e => { if (e.target === canvas) this.joy(); });
    this.start();
  }
  colors(){ const col = themeColors(this.host); this.col = col; this.rgb = hex2rgb(col.glow); this.rgbL = hex2rgb(col.light === '#fff' ? '#FFFFFF' : col.light); this.sprite = this.makeSprite(this.rgb, 24); this.spriteL = this.makeSprite(this.rgbL, 24); this.spriteErr = this.makeSprite('255,120,110', 24); }
  makeSprite(rgb, s){ const c = document.createElement('canvas'); c.width = c.height = s; const x = c.getContext('2d'); const g = x.createRadialGradient(s/2, s/2, 0, s/2, s/2, s/2); g.addColorStop(0, `rgba(${rgb},1)`); g.addColorStop(0.25, `rgba(${rgb},.85)`); g.addColorStop(0.6, `rgba(${rgb},.18)`); g.addColorStop(1, `rgba(${rgb},0)`); x.fillStyle = g; x.fillRect(0, 0, s, s); return c; }
  resize(){ const r = this.host.getBoundingClientRect(); const W = Math.max(40, Math.round(r.width)), H = Math.max(40, Math.round(r.height)); if (W === this.W && H === this.H) return; this.W = W; this.H = H; this.c.width = Math.round(W * this.dpr); this.c.height = Math.round(H * this.dpr); this.c.style.width = W + 'px'; this.c.style.height = H + 'px'; this.build(); }
  build(){
    const W = this.W, H = this.H; const S = this.S = Math.min(W, H * 1.15); const cx = W / 2, cy = H * 0.5; this.cx = cx; this.cy = cy;
    const n = Math.round(Math.min(2400, Math.max(420, S * (innerWidth < 720 ? 4.2 : 6.5))));
    const P = []; const R = Math.random;
    const add = (x, y, b, g, sz) => P.push({ hx: cx + x, hy: cy + y, x: cx + x + (R() - .5) * S * .8, y: cy + y + (R() - .5) * S * .8, b, g, sz: sz || 1, ph: R() * 6.28, sp: .4 + R() * .8, r: Math.hypot(x, y), a: Math.atan2(y, x) });
    const nStar = Math.round(n * .46), nRing = Math.round(n * .3), nBeam = Math.round(n * .12), nRef = n - nStar - nRing - nBeam;
    for (let i = 0; i < nStar; i++){
      const u = R(); if (u < .18){ const a = R() * 6.28, d = Math.pow(R(), 1.6) * S * .022; add(Math.cos(a) * d, Math.sin(a) * d, 1, 0, 1.4); }
      else if (u < .68){ const s = R() < .5 ? -1 : 1, d = Math.pow(R(), 1.7) * S * .37; const b = 1 - d / (S * .37); add(s * d, (R() - .5) * (1.2 + (1 - b) * 3), .35 + b * .65, 0, .7 + b * .8); }
      else { const s = R() < .5 ? -1 : 1, d = Math.pow(R(), 1.5) * S * .43; const b = 1 - d / (S * .43); add((R() - .5) * (1 + (1 - b) * 2.2), s * d, .3 + b * .6, 0, .6 + b * .7); }
    }
    const rO = S * .147, rI = S * .128;
    const gap = (a, gs) => gs.some(([s, e]) => a > s && a < e);
    for (let i = 0; i < nRing; i++){
      const outer = i % 5 !== 0; const rr = outer ? rO : rI; let a = R() * 6.2832;
      if (outer && gap(a, [[-1.45, -0.55], [2.55, 2.85]])) { i--; continue; }
      if (!outer && gap(a, [[-2.9, -2.2], [0.35, 0.95]])) { i--; continue; }
      add(Math.cos(a) * (rr + (R() - .5) * 1.4), Math.sin(a) * (rr + (R() - .5) * 1.4), outer ? .75 + R() * .25 : .5 + R() * .3, outer ? 1 : 2, outer ? .95 : .75);
    }
    for (let i = 0; i < nBeam; i++){
      const u = R();
      if (u < .45){ const d = [-.235, -.30, .245, .31, .40][Math.floor(R() * 5)] * S; const a = R() * 6.28, q = Math.pow(R(), 1.5) * S * .006; add(Math.cos(a) * q, Math.sin(a) * q + d, .8, 3, 1.1); }
      else { const s = R() < .55 ? -1 : 1; const d = (S * .42 + R() * S * .14) * s; add((R() - .5) * 1.4, d, .25 + R() * .3, 3, .8); }
    }
    for (let i = 0; i < nRef; i++){ const d = Math.pow(R(), 1.3) * S * .2 * (R() < .5 ? -1 : 1); add(d, S * .5 + (R() - .5) * S * .05, .18 + (1 - Math.abs(d) / (S * .2)) * .25, 4, 1.8 + R() * 1.2); }
    this.parts = P;
  }
  set(s){ if (this.state === s) return; this.state = s; if (s === 'error') this.err = 1; if (s === 'joy') this.burst = 1; }
  pulse(){ this.env = Math.min(1, this.env + .55); }
  joy(){ this.burst = 1; }
  start(){ if (this.running) return; this.running = true; const loop = () => { if (!this.visible || document.hidden){ this.running = false; return; } this.frame(); requestAnimationFrame(loop); }; requestAnimationFrame(loop); }
  frame(){
    const x = this.x, W = this.W, H = this.H, S = this.S, dpr = this.dpr, st = this.state;
    const t = (performance.now() - this.t0) / 1000;
    const still = RM;
    const wob = still ? 0 : (st === 'think' ? 1.9 : st === 'listen' ? .45 : st === 'speak' ? 1.1 : st === 'error' ? 2.4 : 1) * (S / 260);
    const spinV = still ? 0 : (st === 'think' ? .9 : st === 'listen' ? .22 : st === 'speak' ? .3 : .085) * (1 + this.env * .6);
    this.spin += spinV * (1/60); this.spin2 -= spinV * .72 * (1/60);
    this.env *= .9; this.burst *= .93; this.err *= .92;
    this.glowT = st === 'listen' ? .95 : st === 'think' ? .8 + .12 * Math.sin(t * 5) : st === 'speak' ? .85 + this.env * .5 : st === 'error' ? .5 : .68 + .08 * Math.sin(t * .9);
    this.glow += (this.glowT - this.glow) * .08;
    const breath = still ? 1 : 1 + .02 * Math.sin(t * .95) + this.env * .05 + this.burst * .12;
    const tx = this.px == null ? 0 : (this.px - W / 2) * .025, ty = this.py == null ? 0 : (this.py - H / 2) * .025;
    this.par.x += (tx - this.par.x) * .05; this.par.y += (ty - this.par.y) * .05;
    const cx = this.cx + this.par.x, cy = this.cy + this.par.y;
    x.setTransform(dpr, 0, 0, dpr, 0, 0); x.clearRect(0, 0, W, H);
    /* light from above and the core glow */
    const rgb = this.err > .05 ? `255,${Math.round(200 - this.err * 90)},${Math.round(114 - this.err * 30)}` : this.rgb;
    const cone = x.createLinearGradient(0, 0, 0, cy); cone.addColorStop(0, `rgba(${rgb},${.16 * this.glow})`); cone.addColorStop(1, `rgba(${rgb},0)`);
    x.fillStyle = cone; x.beginPath(); x.moveTo(cx - S * .06, -10); x.lineTo(cx + S * .06, -10); x.lineTo(cx + S * .34, cy); x.lineTo(cx - S * .34, cy); x.closePath(); x.fill();
    const core = x.createRadialGradient(cx, cy, 0, cx, cy, S * .26 * breath); core.addColorStop(0, `rgba(${rgb},${.55 * this.glow})`); core.addColorStop(.35, `rgba(${rgb},${.12 * this.glow})`); core.addColorStop(1, `rgba(${rgb},0)`);
    x.fillStyle = core; x.fillRect(cx - S * .3, cy - S * .3, S * .6, S * .6);
    const refl = x.createRadialGradient(cx, cy + S * .5, 0, cx, cy + S * .5, S * .28); refl.addColorStop(0, `rgba(${rgb},${.18 * this.glow})`); refl.addColorStop(1, `rgba(${rgb},0)`);
    x.fillStyle = refl; x.fillRect(cx - S * .3, cy + S * .38, S * .6, S * .18);
    /* the stars */
    x.globalCompositeOperation = 'lighter';
    const sp = this.err > .05 ? this.spriteErr : this.sprite, spL = this.spriteL;
    const pxr = this.px, pyr = this.py, rep = S * .16;
    for (const p of this.parts){
      let hx, hy;
      if (p.g === 1 || p.g === 2){ const a = p.a + (p.g === 1 ? this.spin : this.spin2); hx = cx + Math.cos(a) * p.r * breath; hy = cy + Math.sin(a) * p.r * breath; }
      else if (p.g === 4){ hx = cx + (p.hx - this.cx) * breath; hy = cy + (p.hy - this.cy); }
      else { hx = cx + (p.hx - this.cx) * breath; hy = cy + (p.hy - this.cy) * breath; }
      if (this.burst > .01){ const d = Math.max(1, p.r); hx += (hx - cx) / d * this.burst * S * .12; hy += (hy - cy) / d * this.burst * S * .12; }
      const n = still ? 0 : wob * (1 + (1 - p.b) * 1.5);
      const txp = hx + Math.sin(t * p.sp * 1.7 + p.ph) * n, typ = hy + Math.cos(t * p.sp * 1.3 + p.ph * 1.7) * n;
      p.x += (txp - p.x) * .09; p.y += (typ - p.y) * .09;
      if (pxr != null){ const dx = p.x - pxr, dy = p.y - pyr, d2 = dx * dx + dy * dy; if (d2 < rep * rep && d2 > 0.01){ const d = Math.sqrt(d2), f = (1 - d / rep) * S * .05; p.x += dx / d * f; p.y += dy / d * f; } }
      const tw = .75 + .25 * Math.sin(t * 2.2 * p.sp + p.ph * 3);
      const a = Math.min(1, p.b * tw * (p.g === 4 ? .7 : 1) * (.55 + this.glow * .6) * (st === 'error' ? .6 + .4 * Math.sin(t * 40) : 1));
      const sz = (p.sz * (S / 210) * (1.9 + this.env * .8)) * (p.g === 4 ? 2.4 : 1);
      x.globalAlpha = a; x.drawImage(p.b > .85 && p.g === 0 ? spL : sp, p.x - sz / 2, p.y - sz / 2, sz, sz);
    }
    x.globalAlpha = 1; x.globalCompositeOperation = 'source-over';
  }
  destroy(){ this.ro.disconnect(); this.io.disconnect(); this.visible = false; }
}

/* ---------- marks and icons ---------- */
let markN = 0;
function markSvg(){ const id = 'mzm-' + (++markN); return `<svg class="mz-mark" viewBox="0 0 48 48" aria-hidden="true" focusable="false"><defs><linearGradient id="${id}" x1="8" y1="6" x2="40" y2="42" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="var(--mz-light,#FFF7DC)"/><stop offset=".55" stop-color="var(--mz-glow,#EBC872)"/><stop offset="1" stop-color="var(--mz-glow-2,#B98A3E)"/></linearGradient></defs><path d="M24 6.5a17.5 17.5 0 1 1-12.4 5.1" fill="none" stroke="url(#${id})" stroke-width="1.6" stroke-linecap="round"/><path d="M24 2v6M24 40v6" stroke="url(#${id})" stroke-width="1.2" stroke-linecap="round" opacity=".8"/><path d="M24 12c.8 8.4 3.6 11.2 12 12-8.4.8-11.2 3.6-12 12-.8-8.4-3.6-11.2-12-12 8.4-.8 11.2-3.6 12-12z" fill="url(#${id})"/></svg>`; }
const I = {
  arrow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
  send: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M6 11l6-6 6 6"/></svg>',
  close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
  expand: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>',
  shrink: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 14h6v6M20 10h-6V4M14 10l7-7M3 21l7-7"/></svg>',
  ext: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/></svg>',
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
  study: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19V5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v14"/><path d="M4 19a2 2 0 0 0 2 2h14M8 7h8M8 11h8M8 15h5"/></svg>',
  menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
  trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>',
  pen: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h4l10.5-10.5a2.1 2.1 0 0 0-3-3L5 17z"/><path d="M13 7l3 3"/></svg>',
  cross: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M12 3v18M6 9h12"/></svg>',
  heart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s-7-4.4-9-8.4A5 5 0 0 1 12 6a5 5 0 0 1 9 6.6C19 16.6 12 21 12 21z"/></svg>',
  q: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 .9-1 1.7M12 17h.01"/></svg>',
};
const TASKS = [
  ['cal', 'Plan my Sunday visit', 'Service time, directions and a reminder', 'Plan my visit to church this Sunday and add a reminder to my calendar.'],
  ['form', "Register for Koi 26'", 'Mazar fills the form, you submit', "I want to register for Koi 26'. Please help me fill in the registration."],
  ['wa', 'Send a prayer request', 'Drafted for you to send', 'I would like to send a prayer request to the pastoral team.'],
  ['book', 'Build a reading plan', 'Day by day, saved in Today', 'Create a 7 day Bible reading plan for me. Ask me what topic first.'],
  ['spark', 'Find a sermon or study', 'Across all three sites', 'Help me find a sermon or study material. Ask me the topic.'],
  ['form', 'Join Worship Connect', 'Start your application', 'I want to join Worship Connect. Please help me fill in the application.'],
  ['cal', 'Remind me about an event', 'One tap to your calendar', 'Set a calendar reminder for me. Ask me which event.'],
  ['chat', 'Pray with me', 'A short prayer and a verse', 'Please pray with me. Ask me what is on my heart.'],
];
const STUDY = [
  ['study', 'Study a passage', 'Context, meaning, application, questions', 'Give me a full study guide on {ref}: historical context, what it says, what it means, how it applies to my life, cross references and three discussion questions.'],
  ['cross', 'Compare translations', 'WEB, KJV, BBE and ASV side by side', 'Compare the translations of {ref} and explain any differences that matter.'],
  ['q', 'Quiz me', 'Ten questions with answers', 'Quiz me on {ref} with ten multiple choice questions.'],
  ['heart', 'Memory verse', 'Learn it, then hide it', 'Help me memorise {ref}: show it as a memory card and give me a way to remember it.'],
  ['pen', 'Sermon or lesson notes', 'An outline you can teach from', 'Write a teaching outline on {ref} for a small group: big idea, three points with verses, illustration ideas and a closing challenge.'],
  ['spark', 'Word study', 'The key words and what they meant', 'Do a word study on {ref}: the key Hebrew or Greek words, what they meant to the first readers, and where else they appear.'],
  ['book', 'Read through a book', 'A plan for the whole book', 'Build me a reading plan to read through {ref} in a month with a focus line for each day.'],
  ['chat', 'What we believe', 'CCFC doctrine, explained', 'Explain what Christ Connect Family Church believes, point by point, with the Bible verses behind each belief.'],
];
const DOCTRINE = [
  ['The Bible is our authority', 'We teach the Scriptures as the inspired Word of God, book by book, so that every believer can read, understand and obey it for themselves.', '2 Timothy 3:16-17'],
  ['Jesus is the only way', 'Salvation is by grace through faith in the finished work of Jesus Christ. The gospel is the centre of every gathering, not an add-on.', 'John 14:6, Ephesians 2:8-9'],
  ['The Holy Spirit empowers us', 'We are an evangelical church that expects the presence and power of the Holy Spirit in worship, in prayer and in daily life.', 'Acts 1:8'],
  ['Family is how we live', 'The church is a household. We share meals, carry one another\'s burdens and raise our children together.', 'Acts 2:42-47, Galatians 6:2'],
  ['Every disciple multiplies', 'Discipleship is not a class you finish. It is a life that reproduces, which is why missions and church planting are part of who we are.', 'Matthew 28:19-20, 2 Timothy 2:2'],
];
const rich = t => { const e = esc(t).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/(https?:\/\/[^\s<]+)/g, u => `<a href="${u}" target="_blank" rel="noopener">${u.replace(/^https?:\/\//, '').slice(0, 48)}</a>`);
  return e.split(/\n{2,}/).map(block => { const lines = block.split('\n'); if (lines.length && lines.every(l => /^\s*([-*•]|\d+\.)\s+/.test(l))) return `<ul>${lines.map(l => `<li>${l.replace(/^\s*([-*•]|\d+\.)\s+/, '')}</li>`).join('')}</ul>`; if (/^#{1,3}\s/.test(lines[0])) { const h = lines.shift().replace(/^#+\s*/, ''); return `<h4>${h}</h4>` + (lines.length ? `<p>${lines.join('<br>')}</p>` : ''); } return `<p>${lines.join('<br>')}</p>`; }).join(''); };
const FIELD_LABEL = { first:'First name', middle:'Middle name', surname:'Surname', gender:'Gender', age:'Age', address:'Town', country:'Country', phone:'Phone', email:'Email', participation:'Taking part', detail:'Detail', days:'Days', dietary:'Dietary', expectation:'Expectation', name:'Name', gift:'Gift', experience:'Experience', church:'Church', message:'Message', contact:'Contact', topic:'Topic', via:'Reply by' };

/* ================================================================ app ================================================================ */
function app(){
  const STUDIO = MODE === 'studio', PAGE = MODE === 'page', FLOAT = MODE === 'widget';
  const host = PAGE ? ($(OPT.target || '#mazar-page') || document.body) : STUDIO ? ($(OPT.target || '#mazar') || document.body) : document.body;
  const w = document.createElement('div'); w.className = 'mz mz--' + MODE; w.dataset.theme = THEME;
  const TABS = [['ask','Ask',I.chat],['bible','Bible',I.book],['today','Today',I.sun],['tasks','Tasks',I.spark]]; if (STUDIO) TABS.splice(3, 0, ['study','Study',I.study]);
  const fine = 'Mazar is an AI and can make mistakes. Check anything important with the Bible and with the church office.';
  w.innerHTML = `
  ${FLOAT ? `<div class="mz__nudge" hidden><button class="mz__nudge-x" aria-label="Dismiss">&times;</button><b>Peace to you. I am Mazar.</b><span>${esc(PER_SITE.nudge)}</span></div>
  <button class="mz__fab" aria-label="Open Mazar, the AI Bible companion" aria-expanded="false"><span class="mz__fab-orb"><span class="mz__fab-fig"><canvas></canvas></span><i class="mz__fab-x">${I.close}</i></span><span class="mz__fab-label">Ask Mazar</span></button>` : ''}
  <section class="mz__panel" ${FLOAT ? 'hidden' : ''} role="${FLOAT ? 'dialog' : 'region'}" aria-label="Mazar, the AI Bible companion">
    <div class="mz__sky" aria-hidden="true"><i class="mz__stars"></i></div>
    ${STUDIO ? `<aside class="mz__side"><div class="mz__side-top"><a class="mz__brand" href="/">${markSvg()}<b>Mazar</b><small>by CCFC Zambia</small></a><button class="mz__btn mz__side-x" type="button" aria-label="Close menu">${I.close}</button></div>
      <button class="mz__newchat" type="button">${I.plus}<span>New conversation</span></button>
      <nav class="mz__convos" aria-label="Conversations"></nav>
      <div class="mz__side-bottom"><a class="mz__side-link" href="https://ccfczambia.org" target="_blank" rel="noopener">${I.ext}<span>Christ Connect Family Church</span></a><a class="mz__side-link" href="https://ccfczambia.org/library" target="_blank" rel="noopener">${I.book}<span>Upper Room library</span></a></div></aside>` : ''}
    <div class="mz__main">
      <header class="mz__head">
        ${STUDIO ? `<button class="mz__btn mz__menu" type="button" aria-label="Open menu">${I.menu}</button>` : ''}
        <span class="mz__id">${markSvg()}<span><b>Mazar${STUDIO ? '' : ''}</b><small><i class="mz__live"></i>${STUDIO ? 'AI Bible companion' : 'AI companion &middot; ' + esc(PER_SITE.name)}</small></span></span>
        <span class="mz__tools">${STUDIO ? '' : `<a class="mz__btn mz__open" href="${STUDIO_URL}" target="_blank" rel="noopener" aria-label="Open the full Mazar platform" title="Open the full Mazar platform">${I.ext}</a>`}<button class="mz__btn mz__new" type="button" aria-label="New conversation" title="New conversation">${I.plus}</button>${FLOAT ? `<button class="mz__btn mz__size" type="button" aria-label="Expand" title="Expand">${I.expand}</button><button class="mz__btn mz__close" type="button" aria-label="Close">${I.close}</button>` : ''}</span>
      </header>
      <nav class="mz__tabs" role="tablist" aria-label="Mazar">${TABS.map(([k,l,ic]) => `<button role="tab" type="button" data-tab="${k}" aria-selected="false">${ic}<span>${l}</span></button>`).join('')}<i class="mz__tabline" aria-hidden="true"></i></nav>
      <div class="mz__views">
        <div class="mz__view mz__view--ask" data-view="ask" role="tabpanel">
          <div class="mz__log" aria-live="polite"><div class="mz__stage"><canvas></canvas></div></div>
          <div class="mz__sugg">${(PER_SITE.suggest || []).map((s, i) => `<button type="button" style="--i:${i}">${esc(s)}</button>`).join('')}</div>
          <form class="mz__form"><textarea name="q" rows="1" autocomplete="off" placeholder="${esc(PER_SITE.placeholder)}" aria-label="Message Mazar" maxlength="2000"></textarea><button class="mz__send" type="submit" aria-label="Send">${I.send}</button></form>
        </div>
        <div class="mz__view mz__view--bible" data-view="bible" role="tabpanel" hidden>
          <form class="mz__ref"><input name="ref" autocomplete="off" placeholder="John 3:16, Psalm 23, Romans 8" aria-label="Bible passage" maxlength="60" list="mz-books"><select name="tr" aria-label="Bible version">${VERSIONS.map(([g, list]) => `<optgroup label="${esc(g)}">${list.map(v => `<option value="${v[0]}" ${v[0] === prefs.tr ? 'selected' : ''}>${esc(v[1])} &middot; ${esc(v[2])} (${esc(v[3])})</option>`).join('')}</optgroup>`).join('')}</select><button class="mz__send" type="submit" aria-label="Open passage">${I.arrow}</button></form>
          <datalist id="mz-books">${BOOKS.map(b => `<option value="${b} 1">`).join('')}</datalist>
          <div class="mz__picks">${['Psalm 23','John 1:1-14','Romans 8:28-39','Matthew 5:1-12','Isaiah 40:28-31','Acts 2:37-47','1 Corinthians 13','Ephesians 6:10-18','Genesis 1','Revelation 21:1-7'].map(r => `<button type="button">${r}</button>`).join('')}</div>
          <article class="mz__scroll" aria-live="polite"><div class="mz__empty">${markSvg()}<p>Open any passage in ${Object.keys(VER).filter(k => VER[k].src !== 'bg').length} versions: Hebrew, Greek and Latin originals, Wycliffe, Tyndale, Geneva and Douay-Rheims from before the King James, the classics, and today's free translations. Then ask Mazar to explain it, study it or pray it with you.</p><small class="mz__note">${esc(NOT_DIGITISED)}</small></div></article>
        </div>
        <div class="mz__view mz__view--today" data-view="today" role="tabpanel" hidden><div class="mz__todayin"></div></div>
        ${STUDIO ? `<div class="mz__view mz__view--study" data-view="study" role="tabpanel" hidden>
          <p class="mz__lead">Pick a passage or book, then choose how you want to study it. Mazar teaches in line with the historic evangelical faith held by CCFC.</p>
          <form class="mz__ref mz__ref--study"><input name="ref" autocomplete="off" placeholder="Passage or book, for example Romans 8 or Jonah" aria-label="Passage to study" maxlength="60" list="mz-books"></form>
          <div class="mz__tasks">${STUDY.map(([ic, t, s, p], i) => `<button type="button" class="mz__task" style="--i:${i}" data-prompt="${esc(p)}"><span class="mz__task-ico">${I[ic]}</span><b>${esc(t)}</b><small>${esc(s)}</small></button>`).join('')}</div>
          <section class="mz__doctrine"><h4>What CCFC believes</h4>${DOCTRINE.map(([h, b, r]) => `<details><summary><b>${esc(h)}</b><small>${esc(r)}</small></summary><p>${esc(b)}</p><button type="button" class="mz-chip" data-ask="Explain this CCFC belief with Scripture: ${esc(h)}. ${esc(b)}">${I.spark}Explain with Mazar</button></details>`).join('')}</section>
        </div>` : ''}
        <div class="mz__view mz__view--tasks" data-view="tasks" role="tabpanel" hidden>
          <p class="mz__lead">Mazar's agents take care of small jobs. They prepare everything; you check it and press the final button.</p>
          <div class="mz__tasks">${TASKS.map(([ic, t, s, p], i) => `<button type="button" class="mz__task" style="--i:${i}" data-prompt="${esc(p)}"><span class="mz__task-ico">${I[ic]}</span><b>${esc(t)}</b><small>${esc(s)}</small></button>`).join('')}</div>
        </div>
      </div>
      <p class="mz__fine">${fine}</p>
    </div>
  </section>`;
  host.appendChild(w);

  const fab = $('.mz__fab', w), panel = $('.mz__panel', w), log = $('.mz__log', w), form = $('.mz__form', w), input = $('textarea', form), nudge = $('.mz__nudge', w), stage = $('.mz__stage', w);
  const fig = new Figure($('canvas', stage), stage);
  const fabFig = fab ? new Figure($('.mz__fab-fig canvas', fab), $('.mz__fab-fig', fab)) : null;
  const figs = [fig, fabFig].filter(Boolean);
  const mood = s => figs.forEach(f => f.set(s));
  const col = () => themeColors(w);

  /* ---- conversations ---- */
  let convos = STUDIO ? loadPlansSafe(CONVOS_KEY) : null;
  function loadPlansSafe(k){ const v = ls.get(k, []); return Array.isArray(v) ? v : []; }
  const saved = STUDIO ? (convos[0] || null) : mem.load();
  const state = STUDIO ? (saved || newConvo()) : (saved || { log: [], history: [], open: false });
  if (STUDIO && !saved) convos.unshift(state);
  function newConvo(){ return { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), title: 'New conversation', t: Date.now(), log: [], history: [], tab: 'ask' }; }
  const persist = () => { if (STUDIO){ state.t = Date.now(); state.log = state.log.slice(-60); state.history = state.history.slice(-24); ls.set(CONVOS_KEY, convos.slice(0, 40)); renderConvos(); } else mem.save(state); };
  const history = () => state.history;

  const renderConvos = () => { const nav = $('.mz__convos', w); if (!nav) return; const groups = [['Today', 0], ['Yesterday', 1], ['Earlier', 99]]; const day = t => Math.floor((Date.now() - new Date(t).setHours(0,0,0,0)) / 864e5);
    nav.innerHTML = groups.map(([label, d]) => { const rows = convos.filter(c => (d === 99 ? day(c.t) > 1 : day(c.t) === d)); return rows.length ? `<h5>${label}</h5>` + rows.map(c => `<div class="mz__convo ${c.id === state.id ? 'is-on' : ''}" data-id="${c.id}"><button type="button" class="mz__convo-open">${esc(c.title)}</button><button type="button" class="mz__convo-del" aria-label="Delete conversation">${I.trash}</button></div>`).join('') : ''; }).join('') || '<p class="mz__side-empty">Your conversations will appear here.</p>'; };
  const switchConvo = id => { const c = convos.find(x => x.id === id); if (!c) return; Object.keys(state).forEach(k => delete state[k]); Object.assign(state, c); convos[convos.indexOf(c)] = state; log.querySelectorAll('.mz-msg').forEach(n => n.remove()); w.classList.toggle('has-history', state.log.some(m => m.who === 'user')); state.log.forEach(m => add(m.who, m.text, m.go, m.actions, true)); if (!state.log.length) add('bot', PER_SITE.greet); setTab('ask'); renderConvos(); closeSide(); };
  if (STUDIO){ $('.mz__convos', w).addEventListener('click', e => { const row = e.target.closest('.mz__convo'); if (!row) return; if (e.target.closest('.mz__convo-del')){ if (!confirm('Delete this conversation?')) return; convos = convos.filter(c => c.id !== row.dataset.id); if (row.dataset.id === state.id){ const n = newConvo(); convos.unshift(n); switchConvo(n.id); } ls.set(CONVOS_KEY, convos); renderConvos(); return; } switchConvo(row.dataset.id); });
    const startNew = () => { if (!state.log.some(m => m.who === 'user')){ setTab('ask', true); closeSide(); return; } const n = newConvo(); convos.unshift(n); switchConvo(n.id); input.focus(); };
    $('.mz__newchat', w).addEventListener('click', startNew);
    const openSide = () => w.classList.add('is-side'); const closeSide = () => w.classList.remove('is-side');
    $('.mz__menu', w).addEventListener('click', openSide); $('.mz__side-x', w).addEventListener('click', closeSide); w.addEventListener('click', e => { if (e.target === panel && w.classList.contains('is-side')) closeSide(); });
    w.closeSide = closeSide; }
  function closeSide(){ if (w.closeSide) w.closeSide(); }

  /* ---- tabs ---- */
  const setTab = (k, focus) => { if (!$(`.mz__tabs [data-tab="${k}"]`, w)) k = 'ask'; state.tab = k; persist(); $$('.mz__tabs [role=tab]', w).forEach(b => { const on = b.dataset.tab === k; b.setAttribute('aria-selected', on); b.tabIndex = on ? 0 : -1; if (on){ const line = $('.mz__tabline', w); line.style.transform = `translateX(${b.offsetLeft}px)`; line.style.width = b.offsetWidth + 'px'; } });
    $$('.mz__view', w).forEach(v => { v.hidden = v.dataset.view !== k; }); if (k === 'today') renderToday(); if (k === 'ask'){ log.scrollTop = log.scrollHeight; fig.resize(); if (focus) input.focus({ preventScroll: true }); } };
  $$('.mz__tabs [role=tab]', w).forEach((b, i, all) => { b.addEventListener('click', () => setTab(b.dataset.tab, true)); b.addEventListener('keydown', e => { if (!/Arrow(Left|Right)/.test(e.key)) return; const n = all[(i + (e.key === 'ArrowRight' ? 1 : all.length - 1)) % all.length]; n.focus(); setTab(n.dataset.tab); }); });

  /* ---- messages and action cards ---- */
  const cardHtml = a => {
    if (a.type === 'verse') return `<div class="mz-card mz-card--verse" data-ref="${esc(a.reference)}" data-tr="${esc(a.translation)}"><span class="mz-card__k">${esc(a.reference)} <i>${esc(a.translation)}</i></span><blockquote>${esc(a.text)}</blockquote><div class="mz-card__row"><button type="button" class="mz-chip" data-act="copy">${I.copy}Copy</button><button type="button" class="mz-chip" data-act="image">${I.img}Share image</button><button type="button" class="mz-chip" data-act="read">${I.book}Read in context</button>${STUDIO ? `<button type="button" class="mz-chip" data-act="study">${I.study}Study</button>` : ''}</div></div>`;
    if (a.type === 'calendar') return `<div class="mz-card" data-cal='${esc(JSON.stringify(a))}'><span class="mz-card__ico">${I.cal}</span><div><span class="mz-card__k">Reminder ready</span><b>${esc(a.title)}</b><small>${esc(new Date(a.start).toLocaleString([], { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }))}${a.location ? ' &middot; ' + esc(a.location) : ''}</small><div class="mz-card__row"><a class="mz-chip mz-chip--gold" href="${esc(a.gcal)}" target="_blank" rel="noopener">Google Calendar</a><button type="button" class="mz-chip" data-act="ics">Apple or Outlook (.ics)</button></div></div></div>`;
    if (a.type === 'form') return `<div class="mz-card" data-form='${esc(JSON.stringify({ form: a.form, fields: a.fields, href: a.href }))}'><span class="mz-card__ico">${I.form}</span><div><span class="mz-card__k">Filled in, waiting for you</span><b>${esc(a.label)}</b><dl>${Object.entries(a.fields || {}).slice(0, 6).map(([k, v]) => `<dt>${esc(FIELD_LABEL[k] || k)}</dt><dd>${esc(v)}</dd>`).join('')}</dl><div class="mz-card__row"><button type="button" class="mz-chip mz-chip--gold" data-act="form">Open, check and submit ${I.arrow}</button></div></div></div>`;
    if (a.type === 'whatsapp') return `<div class="mz-card"><span class="mz-card__ico">${I.wa}</span><div><span class="mz-card__k">Draft message</span><p class="mz-card__msg">${esc(a.message)}</p><div class="mz-card__row"><a class="mz-chip mz-chip--gold" href="${esc(a.href)}" target="_blank" rel="noopener">${esc(a.label || 'Send on WhatsApp')}</a></div></div></div>`;
    if (a.type === 'plan') return `<div class="mz-card" data-plan='${esc(JSON.stringify({ title: a.title, days: a.days }))}'><span class="mz-card__ico">${I.book}</span><div><span class="mz-card__k">Reading plan &middot; ${a.days.length} days</span><b>${esc(a.title)}</b><ol>${a.days.slice(0, 3).map(d => `<li>${esc(d.reference)}${d.focus ? ' <small>' + esc(d.focus) + '</small>' : ''}</li>`).join('')}${a.days.length > 3 ? `<li class="mz-more">and ${a.days.length - 3} more</li>` : ''}</ol><div class="mz-card__row"><button type="button" class="mz-chip mz-chip--gold" data-act="plan">Save to Today</button></div></div></div>`;
    if (a.type === 'compare') return `<div class="mz-card mz-card--wide"><div><span class="mz-card__k">${esc(a.reference)} in ${a.rows.length} translations</span><div class="mz-cmp">${a.rows.map(r => `<div class="mz-cmp__row"><b>${esc(r.translation)}</b><p>${esc(r.text)}</p></div>`).join('')}</div></div></div>`;
    if (a.type === 'quiz') return `<div class="mz-card mz-card--wide mz-quiz" data-n="${a.questions.length}"><div><span class="mz-card__k">Quiz &middot; ${esc(a.title || '')}</span><ol>${a.questions.map((q, i) => `<li class="mz-quiz__q" data-answer="${q.answer}"><b>${esc(q.q)}</b><div class="mz-quiz__opts">${q.options.map((o, j) => `<button type="button" data-i="${j}">${esc(o)}</button>`).join('')}</div>${q.why ? `<small class="mz-quiz__why" hidden>${esc(q.why)}</small>` : ''}</li>`).join('')}</ol><p class="mz-quiz__score" hidden></p></div></div>`;
    if (a.type === 'memory') return `<div class="mz-card mz-card--verse mz-memo" data-ref="${esc(a.reference)}" data-tr="${esc(a.translation)}"><span class="mz-card__k">Memory verse &middot; ${esc(a.reference)}</span><blockquote>${esc(a.text)}</blockquote>${a.hint ? `<small class="mz-memo__hint">${esc(a.hint)}</small>` : ''}<div class="mz-card__row"><button type="button" class="mz-chip mz-chip--gold" data-act="hide">Hide the words</button><button type="button" class="mz-chip" data-act="copy">${I.copy}Copy</button><button type="button" class="mz-chip" data-act="image">${I.img}Share image</button></div></div>`;
    return '';
  };
  const add = (who, text, go, actions, restored) => { const el = document.createElement('div'); el.className = 'mz-msg is-' + who + (restored ? ' is-restored' : '');
    if (!restored){ state.log.push({ who, text, go, actions }); if (STUDIO && who === 'user' && state.title === 'New conversation'){ state.title = text.slice(0, 48) + (text.length > 48 ? '…' : ''); } persist(); }
    el.innerHTML = who === 'bot' ? `<span class="mz-msg__mark">${markSvg()}</span><div class="mz-msg__body"><div class="mz-rich">${rich(text)}</div>${(actions || []).map(cardHtml).join('')}${go ? `<a class="mz-go" href="${esc(go[0])}" data-mz-go>${esc(go[1])} ${I.arrow}</a>` : ''}</div>` : `<div class="mz-msg__body">${esc(text)}</div>`;
    log.appendChild(el);
    if (who === 'bot' && !restored && !RM){ const nodes = $$('.mz-rich p, .mz-rich li, .mz-rich h4', el); const extras = $$('.mz-card, .mz-go', el); extras.forEach(x => x.classList.add('is-wait')); nodes.forEach(n => { n._full = n.innerHTML; n._parts = n.innerHTML.split(/(\s+)/); n.innerHTML = ''; }); const total = nodes.reduce((s, n) => s + n._parts.length, 0), step = Math.max(2, Math.ceil(total / 55));
      mood('speak'); let k = 0;
      const tick = () => { let left = step; for (const n of nodes){ while (n._parts.length && left){ n.innerHTML += n._parts.shift(); left--; } if (!left) break; } if (++k % 3 === 0) figs.forEach(f => f.pulse()); log.scrollTop = log.scrollHeight; if (nodes.some(n => n._parts.length)) setTimeout(tick, 18); else { nodes.forEach(n => { n.innerHTML = n._full; }); extras.forEach((x, i) => setTimeout(() => x.classList.remove('is-wait'), 120 * i)); if (extras.length) figs.forEach(f => f.joy()); setTimeout(() => mood('idle'), 600); } }; tick(); }
    log.scrollTo({ top: log.scrollHeight, behavior: RM || restored ? 'auto' : 'smooth' }); return el; };
  const thinking = () => { const el = document.createElement('div'); el.className = 'mz-msg is-bot is-thinking'; el.innerHTML = `<span class="mz-msg__mark">${markSvg()}</span><div class="mz-msg__body"><span class="mz-think"><i></i><i></i><i></i></span><small>Mazar is thinking</small></div>`; log.appendChild(el); log.scrollTop = log.scrollHeight; return el; };

  /* ---- open, close, expand (widget) ---- */
  const hideNudge = () => { if (!nudge) return; nudge.hidden = true; try { sessionStorage.setItem('mazar:nudged', '1'); } catch (e){} };
  const setExpanded = on => { if (!FLOAT) return; state.big = on; persist(); w.classList.toggle('is-big', on); const b = $('.mz__size', w); b.innerHTML = on ? I.shrink : I.expand; b.setAttribute('aria-label', on ? 'Make smaller' : 'Expand'); b.title = on ? 'Make smaller' : 'Expand'; document.documentElement.classList.toggle('mz-lock', on && innerWidth > 640); setTimeout(() => { setTab(state.tab || 'ask'); fig.resize(); }, 30); };
  const open = (on, quiet) => { if (!FLOAT) return; clearTimeout(open.closing); fab.setAttribute('aria-expanded', on); w.classList.toggle('is-open', on); hideNudge(); state.open = on; persist();
    if (on){ panel.hidden = false; void panel.offsetWidth; panel.classList.add('is-in'); setTab(state.tab || 'ask', !quiet); if (!log.querySelector('.mz-msg')) add('bot', PER_SITE.greet); fig.resize(); }
    else { panel.classList.remove('is-in'); document.documentElement.classList.remove('mz-lock'); open.closing = setTimeout(() => { panel.hidden = true; }, RM ? 0 : 360); if (!quiet) fab.focus({ preventScroll: true }); } };
  if (FLOAT){
    fab.addEventListener('click', () => open(panel.hidden || !panel.classList.contains('is-in')));
    $('.mz__close', w).addEventListener('click', () => open(false));
    $('.mz__size', w).addEventListener('click', () => setExpanded(!w.classList.contains('is-big')));
    $('.mz__nudge-x', w).addEventListener('click', e => { e.stopPropagation(); hideNudge(); }); nudge.addEventListener('click', () => open(true));
    addEventListener('keydown', e => { if (e.key === 'Escape' && !panel.hidden) open(false); });
    w.addEventListener('click', e => { if (e.target === w && w.classList.contains('is-big')) open(false); });
    document.addEventListener('click', e => { if (!panel.hidden && !w.classList.contains('is-big') && !w.contains(e.target) && !e.target.closest('[data-mazar],[data-ozer]') && innerWidth > 640) open(false); });
  }
  document.addEventListener('click', e => { const t = e.target.closest('[data-mazar],[data-ozer]'); if (!t) return; e.preventDefault(); const closer = $('.drawer.is-open .drawer__close, .menu.is-open .menu__close, .is-menu-open .menu__close'); if (closer) closer.click(); if (FLOAT){ if (innerWidth > 900) setExpanded(true); open(true); } const tab = t.dataset.mazar || t.dataset.ozer; if (tab) setTab(tab, true); else if (!FLOAT){ input.focus(); w.scrollIntoView({ behavior: 'smooth', block: 'start' }); } });

  /* ---- ask ---- */
  const ask = async q => { if (w.classList.contains('is-busy')) return; setTab('ask'); history().push({ role:'user', content:q }); add('user', q); w.classList.add('has-history'); fig.resize(); const t = thinking(); w.classList.add('is-busy'); mood('think');
    let ans, failed = false; try { ans = CFG.chatEndpoint ? await remote(history().slice(-10)) : local(q); } catch (e){ ans = local(q); failed = !!CFG.chatEndpoint; }
    t.remove(); w.classList.remove('is-busy'); if (failed){ mood('error'); setTimeout(() => mood('idle'), 900); } history().push({ role:'assistant', content: ans.text }); add('bot', ans.text, ans.go, (ans.actions || []).slice(0, 6)); };
  const grow = () => { input.style.height = 'auto'; input.style.height = Math.min(input.scrollHeight, 160) + 'px'; };
  input.addEventListener('input', () => { grow(); mood(input.value ? 'listen' : 'idle'); });
  input.addEventListener('focus', () => mood('listen')); input.addEventListener('blur', () => { if (!w.classList.contains('is-busy')) mood('idle'); });
  input.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey){ e.preventDefault(); form.requestSubmit(); } });
  form.addEventListener('submit', e => { e.preventDefault(); const q = input.value.trim(); if (!q) return; input.value = ''; grow(); ask(q); });
  $$('.mz__sugg button', w).forEach(b => b.addEventListener('click', () => ask(b.textContent)));
  $$('.mz__view--tasks .mz__task', w).forEach(b => b.addEventListener('click', () => ask(b.dataset.prompt)));
  if (STUDIO){ const sref = $('.mz__ref--study input', w); const refOr = () => sref.value.trim() || ($('.mz__scroll', w).dataset.ref) || '';
    $$('.mz__view--study .mz__task', w).forEach(b => b.addEventListener('click', () => { const r = refOr(); if (!r && b.dataset.prompt.includes('{ref}') && !b.dataset.prompt.startsWith('Explain what')){ sref.focus(); sref.placeholder = 'Type a passage or book first'; sref.classList.add('is-shake'); setTimeout(() => sref.classList.remove('is-shake'), 600); return; } ask(b.dataset.prompt.replace(/\{ref\}/g, r)); }));
    $('.mz__ref--study', w).addEventListener('submit', e => { e.preventDefault(); const r = sref.value.trim(); if (r) ask(`Give me a full study guide on ${r}: historical context, what it says, what it means, how it applies to my life, cross references and three discussion questions.`); });
    $$('.mz__doctrine [data-ask]', w).forEach(b => b.addEventListener('click', () => ask(b.dataset.ask))); }

  /* ---- action cards ---- */
  const flash = (b, msg) => { const old = b.innerHTML; b.innerHTML = I.check + esc(msg); b.classList.add('is-done'); setTimeout(() => { b.innerHTML = old; b.classList.remove('is-done'); }, 1800); };
  log.addEventListener('click', async e => {
    if (e.target.closest('[data-mz-go]')){ state.open = true; persist(); return; }
    const opt = e.target.closest('.mz-quiz__opts button'); if (opt){ const li = opt.closest('.mz-quiz__q'); if (li.dataset.done) return; li.dataset.done = '1'; const ok = +opt.dataset.i === +li.dataset.answer; opt.classList.add(ok ? 'is-right' : 'is-wrong'); $$('button', li).forEach(b => { b.disabled = true; if (+b.dataset.i === +li.dataset.answer) b.classList.add('is-right'); }); const why = $('.mz-quiz__why', li); if (why) why.hidden = false; const card = li.closest('.mz-quiz'); const done = $$('.mz-quiz__q[data-done]', card), right = $$('.mz-quiz__opts .is-right:not([disabled])', card); if (done.length === +card.dataset.n){ const score = $$('.mz-quiz__q', card).filter(q => $('.mz-quiz__opts .is-wrong', q) == null).length; const sc = $('.mz-quiz__score', card); sc.hidden = false; sc.textContent = `You scored ${score} of ${card.dataset.n}.`; if (score === +card.dataset.n) figs.forEach(f => f.joy()); } else if (ok) figs.forEach(f => f.pulse()); return; }
    const b = e.target.closest('[data-act]'); if (!b) return; const card = b.closest('.mz-card'); const act = b.dataset.act;
    if (act === 'copy' || act === 'image'){ const ref = card.dataset.ref, tr = card.dataset.tr, text = $('blockquote', card).textContent; b.disabled = true; const msg = act === 'copy' ? await (async () => { try { await navigator.clipboard.writeText(`"${text}" ${ref} (${tr})`); return 'Copied.'; } catch (_) { return 'Could not copy.'; } })() : await shareVerse(ref, text, tr, true, col()); b.disabled = false; if (msg) flash(b, msg); }
    if (act === 'read'){ openPassage(card.dataset.ref.replace(/:\d+(-\d+)?$/, ''), null); }
    if (act === 'study'){ ask(`Give me a full study guide on ${card.dataset.ref}: historical context, what it says, what it means, how it applies to my life, cross references and three discussion questions.`); }
    if (act === 'hide'){ const q = $('blockquote', card); const on = card.classList.toggle('is-hidden'); q.dataset.full = q.dataset.full || q.textContent; q.textContent = on ? q.dataset.full.replace(/[A-Za-z]/g, c => (Math.random() < .25 ? c : '_')) : q.dataset.full; b.textContent = on ? 'Show the words' : 'Hide the words'; }
    if (act === 'ics'){ const a = JSON.parse(card.dataset.cal); const z = d => new Date(d).toISOString().replace(/[-:]/g, '').replace(/\.\d+/, ''); const ics = ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//CCFC Zambia//Mazar//EN','BEGIN:VEVENT',`UID:${Date.now()}@ccfczambia.org`,`DTSTAMP:${z(Date.now())}`,`DTSTART:${z(a.start)}`,`DTEND:${z(a.end)}`,`SUMMARY:${a.title.replace(/[,;]/g, '\\$&')}`,`LOCATION:${(a.location || '').replace(/[,;]/g, '\\$&')}`,`DESCRIPTION:${(a.details || '').replace(/\n/g, '\\n').replace(/[,;]/g, '\\$&')}`,'BEGIN:VALARM','TRIGGER:-PT2H','ACTION:DISPLAY','DESCRIPTION:Reminder','END:VALARM','END:VEVENT','END:VCALENDAR'].join('\r\n');
      const link = document.createElement('a'); link.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' })); link.download = a.title.replace(/[^\w]+/g, '-') + '.ics'; document.body.appendChild(link); link.click(); setTimeout(() => { URL.revokeObjectURL(link.href); link.remove(); }, 1000); flash(b, 'Downloaded.'); }
    if (act === 'form'){ const f = JSON.parse(card.dataset.form); setFill(f.form, f.fields); state.open = false; persist(); location.href = f.href; }
    if (act === 'plan'){ const p = JSON.parse(card.dataset.plan); const plans = loadPlans(); plans.unshift({ id: Date.now(), title: p.title, days: p.days, done: [] }); ls.set(PLANS_KEY, plans.slice(0, 8)); flash(b, 'Saved to Today.'); figs.forEach(f => f.joy()); setTimeout(() => setTab('today'), 700); }
  });

  /* ---- Bible reader ---- */
  const scroll = $('.mz__scroll', w), refForm = $('.mz__ref:not(.mz__ref--study)', w);
  const openPassage = async (ref, tr) => { tr = tr || refForm.tr.value; refForm.ref.value = ref; setTab('bible'); scroll.innerHTML = '<div class="mz__loading"><i></i><i></i><i></i></div>'; mood('think');
    try { const d = await passage(ref, tr); prefs.tr = tr; ls.set(PREF_KEY, prefs); const text = d.verses.map(v => v.text).join(' '); const V = d.version;
      scroll.innerHTML = `<header><span class="mz-card__k">${esc(V.name)} <i>${esc(V.year)}</i></span><h3>${esc(d.reference)}</h3></header><div class="mz__text mz__text--${esc(V.lang)}" lang="${esc(V.lang)}" ${V.lang === 'he' ? 'dir="rtl"' : ''}>${d.verses.map(v => `<span class="mz__v"><sup>${v.verse}</sup>${esc(v.text)} </span>`).join('')}</div>${d.notes && d.notes.length ? `<details class="mz__notes"><summary>${esc(V.abbr)} study notes (${d.notes.length})</summary>${d.notes.map(n => `<p><b>${n.verse}</b> ${esc(n.note)}</p>`).join('')}</details>` : ''}
        <div class="mz-card__row mz__bibleacts"><button type="button" class="mz-chip mz-chip--gold" data-b="explain">${I.spark}Explain with Mazar</button>${STUDIO ? `<button type="button" class="mz-chip" data-b="study">${I.study}Study guide</button>` : ''}<button type="button" class="mz-chip" data-b="pray">Pray this</button><button type="button" class="mz-chip" data-b="image">${I.img}Share image</button><button type="button" class="mz-chip" data-b="copy">${I.copy}Copy</button></div>`;
      scroll.scrollTop = 0; scroll.dataset.ref = d.reference; scroll.dataset.text = text.slice(0, 1400); scroll.dataset.tr = TR_NAME[tr]; mood('idle'); figs.forEach(f => f.pulse()); }
    catch (err){ scroll.innerHTML = `<div class="mz__empty"><p>${esc(err.message)}</p>${err.bg ? `<a class="mz-chip mz-chip--gold" href="${esc(err.bg)}" target="_blank" rel="noopener">Read ${esc(ref)} on BibleGateway ${I.ext}</a>` : ''}</div>`; if (!err.bg){ mood('error'); setTimeout(() => mood('idle'), 900); } } };
  refForm.addEventListener('submit', e => { e.preventDefault(); const r = refForm.ref.value.trim(); if (r) openPassage(r); });
  refForm.tr.addEventListener('change', () => { if (scroll.dataset.ref) openPassage(scroll.dataset.ref); });
  $$('.mz__picks button', w).forEach(b => b.addEventListener('click', () => openPassage(b.textContent)));
  scroll.addEventListener('click', async e => { const b = e.target.closest('[data-b]'); if (!b) return; const { ref, text, tr } = scroll.dataset;
    if (b.dataset.b === 'explain') ask(`Explain ${ref} for me: what it meant then and what it means for my life today.`);
    if (b.dataset.b === 'study') ask(`Give me a full study guide on ${ref}: historical context, what it says, what it means, how it applies to my life, cross references and three discussion questions.`);
    if (b.dataset.b === 'pray') ask(`Write a short prayer from ${ref} that I can pray today.`);
    if (b.dataset.b === 'image'){ const m = await shareVerse(ref, text, tr, true, col()); if (m) flash(b, m); }
    if (b.dataset.b === 'copy'){ try { await navigator.clipboard.writeText(`${ref} (${tr})\n${text}`); flash(b, 'Copied.'); } catch (_) {} } });

  /* ---- Today: verse of the day + reading plans ---- */
  const todayEl = $('.mz__todayin', w);
  async function renderToday(){
    const plans = loadPlans(); const ref = votdRef();
    todayEl.innerHTML = `<div class="mz-votd"><span class="mz-card__k">Verse for ${esc(new Date().toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long' }))}</span><blockquote class="mz-votd__text"><span class="mz__loading"><i></i><i></i><i></i></span></blockquote><b class="mz-votd__ref">${esc(ref)}</b>
      <div class="mz-card__row"><button type="button" class="mz-chip mz-chip--gold" data-t="reflect">${I.spark}Reflect with Mazar</button><button type="button" class="mz-chip" data-t="read">${I.book}Read the chapter</button><button type="button" class="mz-chip" data-t="image">${I.img}Share image</button></div></div>
      <div class="mz-plans"><div class="mz-plans__head"><h4>Reading plans</h4><button type="button" class="mz-chip" data-t="new">${I.plus}New plan</button></div>
      ${plans.length ? plans.map(p => `<details class="mz-plan" data-id="${p.id}" ${p === plans[0] ? 'open' : ''}><summary><b>${esc(p.title)}</b><span class="mz-plan__bar"><i style="width:${Math.round((p.done.length / p.days.length) * 100)}%"></i></span><small>${p.done.length} of ${p.days.length}</small></summary><ol>${p.days.map(d => `<li class="${p.done.includes(d.day) ? 'is-done' : ''}"><button type="button" class="mz-plan__tick" data-day="${d.day}" aria-label="Mark day ${d.day} ${p.done.includes(d.day) ? 'not done' : 'done'}">${I.check}</button><button type="button" class="mz-plan__ref" data-ref="${esc(d.reference)}"><b>Day ${d.day}: ${esc(d.reference)}</b>${d.focus ? `<small>${esc(d.focus)}</small>` : ''}</button></li>`).join('')}</ol><button type="button" class="mz-plan__del">Remove plan</button></details>`).join('') : '<p class="mz__lead">No plans yet. Ask Mazar for one, for example "a 7 day plan on peace" or "read through Acts in a month".</p>'}</div>`;
    const cacheKey = 'mazar:votd'; const cached = ls.get(cacheKey); const box = $('.mz-votd__text', todayEl);
    let text = cached && cached.day === dayKey() && cached.tr === prefs.tr ? cached.text : '';
    if (!text){ try { const d = await passage(ref, VER[prefs.tr] && VER[prefs.tr].src !== 'bg' && VER[prefs.tr].lang === 'en' && VER[prefs.tr].part === 'all' ? prefs.tr : 'web'); text = d.verses.map(v => v.text).join(' '); ls.set(cacheKey, { day: dayKey(), tr: prefs.tr, text }); } catch (_) { text = ''; } }
    box.textContent = text || 'Open the Bible tab to read today\'s verse.'; todayEl.dataset.text = text;
  }
  todayEl.addEventListener('click', async e => {
    const t = e.target.closest('[data-t]'); const ref = votdRef();
    if (t){ const k = t.dataset.t;
      if (k === 'reflect') ask(`Give me a short devotional on today's verse, ${ref}: a reflection, one question to think about, and a one line prayer.`);
      if (k === 'read') openPassage(ref.replace(/:\d+(-\d+)?$/, ''));
      if (k === 'image' && todayEl.dataset.text){ const m = await shareVerse(ref, todayEl.dataset.text, TR_NAME[prefs.tr], true, col()); if (m) flash(t, m); }
      if (k === 'new') ask('Create a Bible reading plan for me. Ask me the topic and how many days.');
      return; }
    const det = e.target.closest('.mz-plan'); if (!det) return; const plans = loadPlans(); const p = plans.find(x => String(x.id) === det.dataset.id); if (!p) return;
    const tick = e.target.closest('.mz-plan__tick'), rb = e.target.closest('.mz-plan__ref');
    if (tick){ const d = +tick.dataset.day; p.done = p.done.includes(d) ? p.done.filter(x => x !== d) : [...p.done, d]; ls.set(PLANS_KEY, plans); renderToday(); if (p.done.includes(d)) figs.forEach(f => f.pulse()); }
    if (rb) openPassage(rb.dataset.ref);
    if (e.target.closest('.mz-plan__del') && confirm('Remove this reading plan?')){ ls.set(PLANS_KEY, plans.filter(x => x !== p)); renderToday(); }
  });

  /* ---- restore ---- */
  if (state.log.length){ state.log.forEach(m => add(m.who, m.text, m.go, m.actions, true)); if (state.log.some(m => m.who === 'user')) w.classList.add('has-history'); }
  $('.mz__new', w).addEventListener('click', () => { if (STUDIO){ $('.mz__newchat', w).click(); return; } const keepOpen = state.open, big = state.big; mem.clear(); state.log = []; state.history.length = 0; state.open = keepOpen; state.big = big; log.querySelectorAll('.mz-msg').forEach(n => n.remove()); w.classList.remove('has-history'); setTab('ask'); add('bot', PER_SITE.greet); fig.resize(); input.focus(); });
  if (STUDIO) renderConvos();
  const qp = new URLSearchParams(location.search); const deep = qp.get('mazar') || qp.get('ozer') || qp.get('chat');
  if (FLOAT){
    let nudged = !!(saved && saved.log.length); try { nudged = nudged || !!sessionStorage.getItem('mazar:nudged') || !!sessionStorage.getItem('ozer:nudged'); } catch (e){}
    if (!nudged && !deep && PER_SITE.nudge) setTimeout(() => { if (panel.hidden) nudge.hidden = false; }, 9000);
    setTimeout(() => w.classList.add('is-ready'), 600);
    if (deep){ if (innerWidth > 900) setExpanded(true); open(true); if (['bible','today','tasks','ask'].includes(deep)) setTab(deep); }
    else if (saved && saved.open && saved.log.length){ if (saved.big && innerWidth > 900) setExpanded(true); open(true, true); }
  } else {
    if (!log.querySelector('.mz-msg')) add('bot', PER_SITE.greet, null, null, true);
    setTab(['bible','today','tasks','study','ask'].includes(deep) ? deep : (state.tab || 'ask'));
    const q = qp.get('q'); if (q) setTimeout(() => ask(q), 400);
  }
  addEventListener('resize', () => { if (FLOAT && panel.hidden) return; setTab(state.tab || 'ask'); }, { passive: true });
  window.Mazar = { open: tab => { if (FLOAT) open(true); if (tab) setTab(tab); }, ask, figure: fig };
}
window.MazarFigure = Figure;
function boot(){ if (OPT.mode === 'none') return; app(); applyFill(); }
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
