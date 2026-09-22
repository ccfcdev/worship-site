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
const KB = Object.assign({ sunday: '07:20 to 10:00 (intercession and welcoming 07:20, interactive Bible study 07:45, praise and worship 08:30, main sermon 09:00, announcements and visitors 09:45, farewell praise 09:55)', venue: 'Kings Sparkle School, off Kasangula Road, Mandevu, Lusaka', email: 'info@ccfczambia.org', phone: '+260 573 762 913', call: '+260 772 890 854', mission: 'Connecting people to Christ in the power of the Holy Spirit, and empowering them to become multiplying disciples.', midweek: 'group and prayer times on WhatsApp', koinoniaUrl: 'https://koinonia.ccfczambia.org', worshipUrl: 'https://worship.ccfczambia.org' }, window.CCFC_KB || {});
const SITE_KEY = (window.CCFC_SITE && window.CCFC_SITE.key) || (MODE === 'studio' ? 'mazar' : 'ccfc');
const THEME = OPT.theme || SITE_KEY;
const MAIN = SITE_KEY === 'ccfc' ? '' : 'https://ccfczambia.org';
const STUDIO_URL = 'https://yuriel.ccfczambia.org';
const HERE = location.hostname + location.pathname;
const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
const NAME = 'Yuriel';
const PER_SITE = {
  ccfc:     { name: 'CCFC Zambia', greet: "Hi, I'm **Yuriel**, CCFC Zambia's Bible companion.\n\nWhat's on your mind? A verse you're stuck on, something you're carrying, or how to find us on Sunday. I can sort small things too, like a prayer request or planning your visit.", nudge: 'Bible questions, prayer, service times, directions. I can also do small tasks for you.', placeholder: 'Ask Yuriel about the Bible or the church...', suggest: ['Verses for when I feel anxious', 'Plan my visit this Sunday', 'Explain John 3:16', 'Send a prayer request', 'Service times', 'Watch a sermon'] },
  koinonia: { name: 'Koinonia', greet: "Hi, I'm **Yuriel**. Thinking about Koi 26'?\n\nI can answer your questions about the conference, fill in your registration for you, or open the Bible with you.", nudge: "Koi 26', registration, photos, the Bible. I can fill in your registration for you.", placeholder: "Ask Yuriel about Koi 26' or the Bible...", suggest: ["Register me for Koi 26'", "When is Koi 26'?", 'What does koinonia mean?', "Koi 25' photos", "Remind me about Koi 26'", 'How much does it cost?'] },
  worship:  { name: 'Worship Connect', greet: "Hi, I'm **Yuriel**. Thinking about joining Worship Connect, or curious what the Bible actually says about worship?\n\nAsk me anything.", nudge: 'Joining the team, rehearsals, worship in the Bible. I can start your application.', placeholder: 'Ask Yuriel about worship or the team...', suggest: ['Help me apply to join', 'What does the Bible say about worship?', 'When do you rehearse?', 'Watch every set', 'A Psalm to start my day', 'Service times'] },
  mazar:    { name: 'Yuriel', greet: "Hi, I'm **Yuriel**.\n\nBring me anything: a passage you want to understand, a question you've been sitting on, a doubt, a document or photo to study, or just a hard day. Where do you want to start?", nudge: '', placeholder: 'Ask Yuriel anything about the Bible...', suggest: ['Study Romans 8 with me', 'What does the Bible say about fear?', 'Build me a 14 day plan on prayer', 'Quiz me on the Gospel of John', 'Explain the Trinity simply', 'Pray with me for my family'] },
}[SITE_KEY] || {};
const abs = h => (!h || /^https?:/.test(h)) ? h : MAIN + h;
const ls = { get(k, d){ try { const v = JSON.parse(localStorage.getItem(k) || 'null'); return v ?? d; } catch (_) { return d; } }, set(k, v){ try { localStorage.setItem(k, JSON.stringify(v)); } catch (_) {} if (ls.onset) try { ls.onset(k, v); } catch (_) {} }, onset: null, del(k){ try { localStorage.removeItem(k); } catch (_) {} } };

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
/* the Sunday order is read from KB.sunday, "07:20 to 10:00 (intercession and welcoming 07:20, ...)", so a site's CCFC_KB stays the one source */
const SUNDAY = (() => { const s = String(KB.sunday || ''), span = s.split(' (')[0].trim(), end = (span.match(/(\d{1,2}:\d{2})\s*$/) || [])[1] || '';
  const items = ((s.match(/\((.*)\)/) || [])[1] || '').split(/,\s*/).map(x => x.trim().match(/^(.*?)\s+(\d{1,2}:\d{2})$/)).filter(Boolean).map(m => [m[2], m[1]]);
  return { span, list: items.map(([t, what], i) => { const nx = (items[i + 1] || [end])[0]; return `- **${t}${nx && nx !== t ? ' to ' + nx : ''}** ${what[0].toUpperCase() + what.slice(1)}`; }).join('\n') }; })();
const INTENTS = [
  { k:['koi 25 photo','koi 25\' photo','photos','pictures','download photo','gallery'], a:"The Koi 25' photos are on the Koinonia site. You can view each one large and download it, or download them all.", go:[KB.koinoniaUrl + '/k25-photos', "Koi 25' photos"] },
  { k:['join the team','join worship','audition','rehearse','rehearsal','practice','apply'], a:'Worship Connect rehearses every week. Apply on the Join page and a team leader will message you on WhatsApp with the next rehearsal.', go:[KB.worshipUrl + '/join', 'Join the team'] },
  { k:['cost','price','fee','how much'], a:"The Koi 26' delegate fee will be announced with the dates. For Koi 25' it was K200 for Zambian delegates and USD 10 for international delegates.", go:[KB.koinoniaUrl + '/register', "Register for Koi 26'"] },
  { k:['service time','what time','when do you meet','sunday','when is church','times','schedule','midweek','plan my visit'], a:`We gather every Sunday, ${SUNDAY.span}, at ${KB.venue}.${SUNDAY.list ? '\n\n' + SUNDAY.list + '\n\n' : ' '}Connect groups and prayer meet through the week; the office shares ${KB.midweek}.`, go:['/visit','Plan a visit'] },
  { k:['where','address','location','directions','map','find you','venue','mandevu','kasangula'], a:`We meet at ${KB.venue}. Tap below for the map and directions, or message us on WhatsApp and we will send a pin.`, go:['/visit#map','Open directions'] },
  { k:['first time','visit','visiting','new here','what to expect','dress','wear','kids','children','parking'], a:`You are very welcome. No dress code. Near the end of the service, during announcements and visitors, you are invited to stand and introduce yourself, and the church welcomes you warmly. Children are welcome and Connect Kids runs during the sermon. Service is ${SUNDAY.span}.`, go:['/visit','What to expect'] },
  { k:['watch','sermon','video','online','youtube','livestream','stream','acts','teaching'], a:'Teaching and worship from our gatherings are on the Watch page and on our YouTube channel. Pastor Francis Chewe is currently teaching through the Book of Acts.', go:['/watch','Watch'] },
  { k:['give','giving','tithe','offering','donate','mobile money','bank','airtel','mtn'], a:'Giving at CCFC comes from the heart; nobody is asked to give. If you want to, you can give in person on Sunday, by mobile money or by bank transfer. The Give page explains each.', go:['/give','Ways to give'] },
  { k:['contact','phone','email','whatsapp','call','number','reach'], a:`Email ${KB.email}, call ${KB.call} or message us on WhatsApp at ${KB.phone}. A real person replies.`, go:['/contact','Contact us'] },
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
const ATTS = new WeakMap();   /* message -> files attached to it (kept in memory only, never in localStorage) */
async function remote(history){
  let used = null, attachments = [];
  for (let i = history.length - 1; i >= 0; i--){ const d = history[i].att && ATTS.get(history[i]); if (d){ used = history[i]; attachments = d.map(({ kind, name, data }) => ({ kind, name, data })); break; } }
  const messages = history.map(m => ({ role: m.role, content: m.content, ...(m === used ? { att: true } : {}) }));
  const r = await fetch(CFG.chatEndpoint, { method:'POST', headers:{ 'Content-Type':'application/json', ...(CFG.supabaseKey ? { apikey: CFG.supabaseKey, Authorization: 'Bearer ' + CFG.supabaseKey } : {}) }, body: JSON.stringify({ messages, page: HERE, mode: MODE === 'studio' ? 'studio' : 'site', attachments, ...(window.__mazarWho ? { who: window.__mazarWho } : {}) }) });
  if (!r.ok) throw new Error('chat endpoint ' + r.status); const ans = await r.json();
  if (!ans || typeof ans.text !== 'string') throw new Error('bad answer');
  ans.text = ans.text.replace(/^([ \t]*)[\u2014\u2013][ \t]+/gm, '$1- ').replace(/(\d)[ \t]*[\u2014\u2013][ \t]*(\d)/g, '$1-$2').replace(/[ \t]*[\u2014\u2013][ \t]*/g, ', ');   /* no dashes, but a dash-led bullet stays a bullet and 07:20–07:45 stays a range */
  return ans;
}

/* ---------- Bible: every version Mazar can serve freely, in every language the sources carry ----------
   sources: api = bible-api.com, gb = api.getbible.net, bolls = bolls.life (public domain picks). Copyrighted modern
   English editions are linked to BibleGateway instead of being served. Registry generated by tools-bibles.py. */
/*__BIBLES__*/ const BIBLES = [["web","WEB","World English Bible","2000","en","English","ltr","api","web","all"],["webbe","WEBBE","World English Bible, British Edition","2000","en","English","ltr","api","webbe","all"],["kjv","KJV","King James Version","1611, ed. 1769","en","English","ltr","api","kjv","all"],["asv","ASV","American Standard Version","1901","en","English","ltr","api","asv","all"],["bbe","BBE","Bible in Basic English","1949 to 1964","en","English","ltr","api","bbe","all"],["dby","DBY","Darby Translation","1890","en","English","ltr","api","darby","all"],["dra","DRA","Douay-Rheims, 1899 American Edition","1899","en","English","ltr","api","dra","all"],["oeb","OEB","Open English Bible","2010","en","English","ltr","api","oeb-us","all"],["akjv","AKJV","American King James Version","1999","en","English","ltr","gb","akjv","all"],["alb","ALB","Albanian Bible","","sq","Albanian","ltr","gb","alb","all"],["aleppo","ALEP","Aleppo Codex, Hebrew Old Testament","c. 930","he","Hebrew","rtl","gb","aleppo","ot"],["almeida","ARA","Almeida Atualizada","","pt","Portuguese","ltr","gb","almeida","all"],["aov","AOV","Afrikaans Ou Vertaling","1933","af","Afrikaans","ltr","gb","aov","all"],["arabicsv","SVD","Smith and Van Dyke, Arabic","1865","ar","Arabic","rtl","gb","arabicsv","all"],["basque","BASQUE","(Navarro Labourdin) NT","","eu","Basque","ltr","gb","basque","nt"],["bibelselskap","NOR","Det Norsk Bibelselskap","1930","nb","Norwegian bokmal","ltr","gb","bibelselskap","all"],["bkr","BKR","Bible kralická, Czech","1613","cs","Czech","ltr","gb","bkr","all"],["breton","BRETON","Gospels","","br","Breton","ltr","gb","breton","nt"],["burcbcm","CBCM","Burmese Catholic Bible","","my","Myanmar Burmse","ltr","gb","burcbcm",[19,20,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60,61,62,63,64,65,66]],["calo","CALO","El Evangelio segun S. Lucas, traducido al Romaní, ó dialecto de los Gitanos de España","","rmq","Calo","ltr","gb","calo",[42]],["canisius","CANISIU","Petrus Canisius Translation","","nl","Dutch","ltr","gb","canisius","all"],["cep","CEP","Český ekumenický překlad","1985","cs","Czech","ltr","gb","cep","all"],["chamorro","CHAMORR","(Psalms Gospels Acts)","","ch","Chamorro","ltr","gb","chamorro",[19,40,41,42,43,44]],["che1860","CHE1860","Cherokee New Testament (1860) with Sequoyah transliterated forms","1860","chr","Cherokee","ltr","gb","che1860","nt"],["chiunl","CUVWL","Chinese Union Version, Wenli","1919","zh","Chinese","ltr","gb","chiunl","all"],["cns","NCVS","New Chinese Version, Simplified","","zh-Hans","Chinese","ltr","gb","cns","all"],["cnt","NCVT","New Chinese Version, Traditional","","zh-Hant","Chinese","ltr","gb","cnt","all"],["codex","WLC","Westminster Leningrad Codex, Hebrew Old Testament","c. 1008","he","Hebrew","rtl","gb","codex","ot"],["coptic","COP","Coptic New Testament (Bohairic)","","cop","Coptic","ltr","gb","coptic","nt"],["cornilescu","COR","Cornilescu, Romanian","1924","ro","Romanian","ltr","gb","cornilescu","all"],["croatia","CRO","Croatian Bible","","hr","Croatian","ltr","gb","croatia","all"],["csielizabeth","CSIELIZ","1757 Church Slavonic Elizabeth Bible","1757","cu","Slavonic Elizabeth","ltr","gb","csielizabeth","all"],["cus","CUVS","Chinese Union Version, Simplified","1919","zh-Hans","Chinese","ltr","gb","cus","all"],["cut","CUVT","Chinese Union Version, Traditional","1919","zh-Hant","Chinese","ltr","gb","cut","all"],["danish","DAN","Danish Bible","","da","Danish","ltr","gb","danish","all"],["danish1819","DANISH1","Danish New Testament from 1819 with original orthography","1819","da","Danish","ltr","gb","danish1819","nt"],["danish1871","DANISH1","Danish OT1871 + NT1907 with original orthography","1871","da","Danish","ltr","gb","danish1871","all"],["darby","FRDBY","Bible Darby, French","1890","fr","French","ltr","gb","darby","all"],["dari","DARI","Dari Bible","","prs","Dari","rtl","gb","dari","all"],["douayrheims","DRB2","Douay-Rheims","1610","en","English","ltr","gb","douayrheims","all"],["easternarmenian","EASTERN","Eastern (Genesis Exodus Gospels)","","hy","Armenian","ltr","gb","easternarmenian",[1,2,40,41,42,43]],["elberfelder","ELB","Elberfelder Bibel","1871","de","German","ltr","gb","elberfelder","all"],["elberfelder1905","ELB05","Elberfelder Bibel","1905","de","German","ltr","gb","elberfelder1905","all"],["esperanto","ESP","Esperanto Bible","1926","eo","Esperanto","ltr","gb","esperanto","all"],["estonian","EST","Estonian Bible","","et","Estonian","ltr","gb","estonian",[1,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60,61,62,63,64,65,66]],["finnish1776","FIN76","Finnish Bible","1776","fi","Finnish","ltr","gb","finnish1776","all"],["gaelic","GAELIC","Scots Gaelic (Gospel of Mark)","","gd","Scottish Gaelic","ltr","gb","gaelic",[41]],["giovanni","DIO","Giovanni Diodati","1649","it","Italian","ltr","gb","giovanni","all"],["gothic","GOT","Gothic Bible (Wulfila)","4th century","got","Gothic","ltr","gb","gothic",[16,40,41,42,43,45,46,47,48,49,50,51,52,53,54,55,56,57]],["japbungo","JBG","Japanese Bungo-yaku 文語訳","1953","ja","Japanese","ltr","gb","japbungo","all"],["japdenmo","JDM","Japanese Denmo 電網聖書","","ja","Japanese","ltr","gb","japdenmo",[40,41,42,43,44,58,59,60,61,62,63,64,65]],["japkougo","JKG","Japanese Kougo-yaku 口語訳","1955","ja","Japanese","ltr","gb","japkougo","all"],["japraguet","JRG","Japanese Raguet-yaku ラゲ訳","1910","ja","Japanese","ltr","gb","japraguet","nt"],["judson","JUD","Judson Bible, Burmese","1835","my","Myanmar Burmse","ltr","gb","judson","all"],["karoli","KAR","Károli, Hungarian","1590","hu","Hungarian","ltr","gb","karoli","all"],["kjva","KJVA","King James Version with Apocrypha","1769","en","English","ltr","gb","kjva","all"],["korean","KOR","Korean Bible","","ko","Korean","ltr","gb","korean","all"],["koreankjv","KKJV","Hangul King James Version","","ko","Korean","ltr","gb","koreankjv","all"],["latvian","LATVIAN","New Testament","","lv","Latvian","ltr","gb","latvian","nt"],["lithuanian","LIT","Lithuanian Bible","","lt","Lithuanian","ltr","gb","lithuanian","all"],["livre","BLIVRE","Bíblia Livre","2018","pt","Portuguese","ltr","gb","livre","all"],["livretr","BLTR","Bíblia Livre, Textus Receptus","2018","pt","Portuguese","ltr","gb","livretr","all"],["ls1910","LSG","Louis Segond","1910","fr","French","ltr","gb","ls1910","all"],["luther1545","LUT","Lutherbibel","1545","de","German","ltr","gb","luther1545","all"],["lxx","LXX","Septuagint, Greek Old Testament","3rd to 1st century BC","grc","Greek","ltr","gb","lxx",[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,67,69,70,73,74,75,77,78,80,81,82,83,84,85,86]],["mal1910","MAL","Sathyavedapusthakam, Malayalam","1910","mlf","Malayalam","ltr","gb","mal1910","all"],["manxgaelic","MANXGAE","Manx Gaelic (Esther Jonah 4 Gospels)","","gv","Manx Gaelic","ltr","gb","manxgaelic",[17,32,40,42,43]],["maori","MAO","Maori Bible","","mi","Maori","ltr","gb","maori","all"],["martin","MAR","Bible Martin","1744","fr","French","ltr","gb","martin","all"],["mg1865","MG","Baiboly Malagasy","1865","mg","Malagasy","ltr","gb","mg1865","all"],["moderngreek","GRM","Modern Greek Bible","","el","Greek Modern","ltr","gb","moderngreek","all"],["modernhebrew","HEB","Modern Hebrew Bible","","he","Hebrew","rtl","gb","modernhebrew","all"],["monkjv","MKJV","Mongolian King James Version","","mn","Mongolian","ltr","gb","monkjv","nt"],["ndebele","NDE","IBhayibhili, Ndebele","","nd","Ndebele","ltr","gb","ndebele","all"],["norsmb","NORSMB","Studentmållagsbibelen frå 1921","1921","nn","Norwegian nynorsk","ltr","gb","norsmb","all"],["peshitta","PESH","Peshitta, Syriac New Testament","5th century","syr","Syriac","rtl","gb","peshitta","nt"],["pohnold","POHNOLD","Old Public Domain Pohnpeian Bible","","pon","Pohnpeian","ltr","gb","pohnold",[19,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60,61,62,63,64,65,66]],["pohnpeian","POHNPEI","Bible in Pohnpeian language","","pon","Pohnpeian","ltr","gb","pohnpeian","all"],["polgdanska","BGD","Biblia Gdańska","1881","pl","Polish","ltr","gb","polgdanska","all"],["polugdanska","UBG","Uwspółcześniona Biblia Gdańska","2017","pl","Polish","ltr","gb","polugdanska","all"],["potawatomi","POTAWAT","Potawatomi (Matthew Acts) (Lykins 1844)","1844","pot","Potawatomi","ltr","gb","potawatomi",[40,44]],["pyharaamattu1933","FIN33","Pyhä Raamattu","1933 to 1938","fi","Finnish","ltr","gb","pyharaamattu1933","all"],["pyharaamattu1992","FIN92","Pyhä Raamattu","1992","fi","Finnish","ltr","gb","pyharaamattu1992","all"],["riveduta","RIV","Riveduta","1927","it","Italian","ltr","gb","riveduta","all"],["rv1858","RV58","Reina Valera, New Testament","1858","es","Spanish","ltr","gb","rv1858","all"],["sahidic","SAH","Coptic New Testament (Sahidic)","","cop","Coptic","ltr","gb","sahidic","nt"],["schlachter","SCH","Schlachter","1951","de","German","ltr","gb","schlachter","all"],["shona","SHO","Bhaibheri, Shona","","sn","Shona","ltr","gb","shona","nt"],["srkdekavski","SRKDEKA","Serbian Bible Daničić-Karadžić Ekavski","","sr","Serbian","ltr","gb","srkdekavski","all"],["srkdijekav","SRKDIJE","Serbian Bible Daničić-Karadžić Ijekavski","","sr","Serbian","ltr","gb","srkdijekav","all"],["sse","SSE","Sagradas Escrituras","1569","es","Spanish","ltr","gb","sse","all"],["statenvertaling","SV","Statenvertaling","1637","nl","Dutch","ltr","gb","statenvertaling","all"],["statenvertalinga","STATENV","De ganse Heilige Schrift bevattende al de kanonieke boeken van het Oude en Nieuwe Testament, met de apocriefe (deuterocanonieke) boeken","","nl","Dutch","ltr","gb","statenvertalinga","all"],["swahili","SWA","Biblia, Swahili","","sw","Swahili","ltr","gb","swahili",[40,41,42,43,44,45,46,47,48,49,51,52,53,54,55,56,57,58,59,60,61,62,63,64,65,66]],["swedish","SWE","Swedish Bible","1917","sv","Swedish","ltr","gb","swedish","all"],["swekarlxii","SWEKARL","Svenska Karl XII:s Bibel (1703)","1703","sv","Swedish","ltr","gb","swekarlxii",[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,22,27,29,32,40,41,42,43,44,45,46,47,49,50,51,52,53,54,55,56,58,59,60,61,66]],["swekarlxii1873","SWEKARL","Svenska Karl XII:s Bibel (1873)","1873","sv","Swedish","ltr","gb","swekarlxii1873","all"],["synodal","SYN","Synodal Translation, Russian","1876","ru","Russian","ltr","gb","synodal","all"],["tagalog","ADB","Ang Dating Biblia, Tagalog","1905","tl","Tagalog","ltr","gb","tagalog","all"],["tausug","TAUSUG","Tausug Kitab Injil","","tsg","Tausug","ltr","gb","tausug","nt"],["textusreceptus","TR","Textus Receptus, Greek New Testament (Stephanus 1550)","1550","grc","Greek","ltr","gb","textusreceptus","nt"],["thai","THAI","Thai Bible, from the KJV","","th","Thai","ltr","gb","thai","all"],["tischendorf","TISCH","Tischendorf 8th Edition, Greek New Testament","1872","grc","Greek","ltr","gb","tischendorf","nt"],["tpikjpb","TPI","King Jems Pisin Baibel, Tok Pisin","","tpi","Tok Pisin","ltr","gb","tpikjpb","all"],["turhadi","HADI","Turkish Easy-to-Read Translation","","tr","Turkish","ltr","gb","turhadi","nt"],["turkish","TUR","Turkish Bible","","tr","Turkish","ltr","gb","turkish","all"],["tyndale","TYN","Tyndale Bible","1526 to 1530","en","English","ltr","gb","tyndale",[1,2,3,4,5,32,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60,61,62,63,64,65,66]],["ukranian","UKRANIA","NT (P Kulish 1871)","1871","uk","Ukrainian","ltr","gb","ukranian","nt"],["ukrogienko","UKR","Ukrainian Bible, Ohienko","1962","uk","Ukrainian","ltr","gb","ukrogienko","all"],["uma","UMA","Uma NT","","ppk","Uma","ltr","gb","uma","nt"],["valera","RVR","Reina Valera","1909","es","Spanish","ltr","gb","valera","all"],["vietnamese","VIE","Kinh Thánh, Vietnamese","1934","vi","Vietnamese","ltr","gb","vietnamese","all"],["vulgate","VUL","Vulgata Clementina, Latin","405, ed. 1592","la","Latin","ltr","gb","vulgate","all"],["wb","WBT","Webster's Bible","1833","en","English","ltr","gb","wb","all"],["westcotthort","WH","Westcott and Hort, Greek New Testament","1881","grc","Greek","ltr","gb","westcotthort","nt"],["westernarmenian","WESTERN","Western NT","","hy","Armenian","ltr","gb","westernarmenian","nt"],["weymouth","WEY","Weymouth New Testament","1903","en","English","ltr","gb","weymouth","nt"],["wycliffe","WYC","Wycliffe Bible","c. 1395","enm","English","ltr","gb","wycliffe","all"],["ylt","YLT","Young's Literal Translation","1862, ed. 1898","en","English","ltr","gb","ylt","all"],["zhuromsky","ZHUROMS","Victor Zhuromsky NT","","ru","Russian","ltr","gb","zhuromsky","nt"],["gnv","GNV","Geneva Bible, with its study notes","1560, ed. 1599","en","English","ltr","bolls","GNV","all"],["drb","DRB","Douay-Rheims Bible","1582 to 1610","en","English","ltr","bolls","DRB","all"],["lxxe","LXX-E","Brenton's English Septuagint","1851","en","English","ltr","bolls","LXXE","ot"],["bsb","BSB","Berean Standard Bible","2016 to 2022","en","English","ltr","bolls","BSB","all"],["lsv","LSV","Literal Standard Version","2020","en","English","ltr","bolls","LSV","all"],["sblgnt","SBLGNT","SBL Greek New Testament","2010","grc","Greek","ltr","bolls","SBLGNT","nt"],["dhnt","DHNT","Delitzsch's Hebrew New Testament","1877","he","Hebrew","rtl","bolls","DHNT","nt"],["cuv","CUV","Chinese Union Version, Traditional 和合本","1919","zh","Chinese","ltr","bolls","CUV","all"],["pcb","PCB","Peking Committee Bible 京委本聖經","1872","zh","Chinese","ltr","bolls","PCB","all"],["dsv","DSV","Statenvertaling met Strong's","1637","nl","Dutch","ltr","bolls","DSV","all"],["kb","KB","Károli Biblia","1908","hu","Hungarian","ltr","bolls","KB","all"],["bg","BG","Biblia gdańska","1881","pl","Polish","ltr","bolls","BG","all"],["tamovr","TAMOVR","பரிசுத்த வேதாகமம் O.V., Tamil Old Version","1871","ta","Tamil","ltr","bolls","TAMOVR","all"],["niv","NIV","New International Version","1978, ed. 2011","en","English","ltr","bg","NIV","all"],["esv","ESV","English Standard Version","2001, ed. 2016","en","English","ltr","bg","ESV","all"],["nkjv","NKJV","New King James Version","1982","en","English","ltr","bg","NKJV","all"],["nlt","NLT","New Living Translation","1996, ed. 2015","en","English","ltr","bg","NLT","all"],["nasb","NASB","New American Standard Bible","1971, ed. 2020","en","English","ltr","bg","NASB","all"],["csb","CSB","Christian Standard Bible","2017","en","English","ltr","bg","CSB","all"],["nrsv","NRSV","New Revised Standard Version","1989, ed. 2021","en","English","ltr","bg","NRSVUE","all"],["rsv","RSV","Revised Standard Version","1952","en","English","ltr","bg","RSV","all"],["amp","AMP","Amplified Bible","1965, ed. 2015","en","English","ltr","bg","AMP","all"],["msg","MSG","The Message","2002","en","English","ltr","bg","MSG","all"],["net","NET","New English Translation","2005","en","English","ltr","bg","NET","all"],["gnt","GNT","Good News Translation","1976","en","English","ltr","bg","GNT","all"]]; /*__/BIBLES__*/
const VER = {}; BIBLES.forEach(([id, abbr, name, year, lang, langName, dir, src, code, part]) => { VER[id] = { id, abbr, name, year, lang, langName, dir, src, code, part }; });
if (!VER[prefs.tr]) prefs.tr = 'web';
const TR_NAME = new Proxy({}, { get: (_, k) => (VER[k] ? VER[k].name : String(k)) });
const ORIGINAL_LANGS = ['he', 'grc', 'la', 'syc', 'cop', 'got', 'cu'];
const NOT_DIGITISED = 'Coverdale (1535), Matthew\'s Bible (1537), the Great Bible (1539) and the Bishops\' Bible (1568) have no free digital text yet; Wycliffe, Tyndale, Geneva and Douay-Rheims are here.';
const CHAPTERS = [50,40,27,36,34,24,21,4,31,24,22,25,29,36,10,13,10,42,150,31,12,8,66,52,5,48,12,14,3,9,1,4,7,3,3,3,2,14,4,28,16,24,21,28,16,16,13,6,6,4,4,5,3,6,4,3,1,13,5,5,3,5,1,1,1,22];
const BOOK_ALIASES = { ps: 19, psa: 19, psalm: 19, psalms: 19, song: 22, songofsongs: 22, sos: 22, canticles: 22, is: 23, jn: 43, joh: 43, jhn: 43, jon: 32, jud: 7, jdg: 7, jude: 65, jas: 59, phm: 57, phlm: 57, php: 50, phil: 50, mrk: 41, mk: 41, mt: 40, matt: 40, lk: 42, luk: 42, ac: 44, rom: 45, ro: 45, re: 66, rev: 66, ex: 2, exo: 2, dt: 5, deu: 5, deut: 5, ru: 8, est: 17, jb: 18, pr: 20, prov: 20, ecc: 21, eccl: 21, qoh: 21, isa: 23, jer: 24, lam: 25, eze: 26, ezek: 26, dan: 27, hos: 28, joe: 29, am: 30, oba: 31, ob: 31, mic: 33, nah: 34, hab: 35, zep: 36, zeph: 36, hag: 37, zec: 38, zech: 38, mal: 39, heb: 58, tit: 56, gal: 48, eph: 49, col: 51, gen: 1, lev: 3, num: 4, jos: 6, josh: 6, neh: 16, ezr: 15 };
function parseRef(s){
  const m = String(s).trim().match(/^((?:[1-3]|i{1,3})\s*)?([a-z][a-z .']*?)\s*(\d+)?(?::(\d+)(?:\s*[-–]\s*(\d+))?)?\s*$/i); if (!m) return null;
  const numPre = m[1] ? { i: 1, ii: 2, iii: 3 }[m[1].trim().toLowerCase()] || m[1].trim() : '';
  const key = (numPre + m[2]).toLowerCase().replace(/[^a-z0-9]/g, '');
  let book = BOOK_ALIASES[key] || 0;
  if (!book){ const norm = BOOKS.map(b => b.toLowerCase().replace(/[^a-z0-9]/g, '')); book = norm.indexOf(key) + 1 || norm.findIndex(b => b.startsWith(key)) + 1; }
  if (!book) return null;
  const chapter = Math.min(Math.max(+(m[3] || 1), 1), CHAPTERS[book - 1]);
  return { book, name: BOOKS[book - 1], chapter, from: m[4] ? +m[4] : 0, to: m[5] ? +m[5] : (m[4] ? +m[4] : 0) };
}
const hasBook = (v, b) => v.part === 'all' || (v.part === 'ot' && b <= 39) || (v.part === 'nt' && b >= 40) || (Array.isArray(v.part) && v.part.includes(b));
const partLabel = v => v.part === 'ot' ? 'Old Testament' : v.part === 'nt' ? 'New Testament' : Array.isArray(v.part) ? `${v.part.length} books` : '';
const refOf = (book, chapter, vs) => `${BOOKS[book - 1]} ${chapter}${vs ? ':' + vs : ''}`;
const strip = t => String(t).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
/* chapters are fetched once and kept on this device (memory + the last 80 in localStorage) */
const chapMem = new Map();
const CIDX = 'mazar:cidx';
function cacheGet(key){ if (chapMem.has(key)) return chapMem.get(key); const v = ls.get('mazar:c:' + key); if (v) chapMem.set(key, v); return v; }
function cachePut(key, val){ chapMem.set(key, val); try { const idx = ls.get(CIDX, []).filter(k => k !== key); idx.push(key); while (idx.length > 80) ls.del('mazar:c:' + idx.shift()); ls.set(CIDX, idx); ls.set('mazar:c:' + key, val); } catch (_) {} }
async function fetchChapter(vid, book, chapter){
  const v = VER[vid] || VER.web; const key = `${v.id}:${book}:${chapter}`; const hit = cacheGet(key); if (hit) return hit;
  if (v.src === 'bg'){ const err = new Error(`${v.name} is copyrighted, so Yuriel links to it instead of showing the text.`); err.bg = `https://www.biblegateway.com/passage/?search=${encodeURIComponent(refOf(book, chapter))}&version=${v.code}`; throw err; }
  if (!hasBook(v, book)) throw new Error(`${BOOKS[book - 1]} is not in ${v.name} (${partLabel(v) || 'partial text'}).`);
  const url = v.src === 'api' ? `https://bible-api.com/${encodeURIComponent(refOf(book, chapter))}?translation=${v.code}` : v.src === 'gb' ? `https://api.getbible.net/v2/${v.code}/${book}/${chapter}.json` : `https://bolls.life/get-chapter/${v.code}/${book}/${chapter}/`;
  const r = await fetch(url); if (!r.ok) throw new Error(r.status === 404 ? `${refOf(book, chapter)} is not in ${v.name}.` : 'The Bible service is busy. Please try again in a moment.');
  const d = await r.json(); let rows = v.src === 'bolls' ? d : (d.verses || []); if (!Array.isArray(rows) || !rows.length) throw new Error(`${refOf(book, chapter)} is not in ${v.name}.`);
  rows = rows.map(x => ({ verse: +x.verse, text: strip(x.text), note: x.comment ? strip(x.comment) : '' }));
  const out = { verses: rows.map(x => ({ verse: x.verse, text: x.text })), notes: rows.filter(x => x.note).map(x => ({ verse: x.verse, note: x.note })) };
  cachePut(key, out); return out;
}
async function passage(ref, vid){
  const v = VER[vid] || VER.web; const p = parseRef(ref); if (!p) throw new Error('I could not read that reference. Try a form like John 3:16 or Psalm 23.');
  const d = await fetchChapter(v.id, p.book, p.chapter);
  const verses = d.verses.filter(x => !p.from || (x.verse >= p.from && x.verse <= p.to)); if (!verses.length) throw new Error('Those verses are not in this chapter.');
  const vs = p.from ? p.from + (p.to > p.from ? '-' + p.to : '') : '';
  return { reference: refOf(p.book, p.chapter, vs), verses, version: v, notes: d.notes.filter(n => !p.from || (n.verse >= p.from && n.verse <= p.to)), book: p.book, chapter: p.chapter };
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
  x.fillStyle = 'rgba(237,235,247,.6)'; x.font = '26px system-ui, sans-serif'; x.fillText(`${trName}  ·  Yuriel, CCFC Zambia`, 540, 1270);
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
  note.innerHTML = `${markSvg()}<span><b>Yuriel filled in ${n} answer${n > 1 ? 's' : ''} for you.</b> Please check everything, complete anything missing, then press submit yourself.</span>`;
  form.parentNode.insertBefore(note, form);
  setTimeout(() => form.scrollIntoView({ behavior: RM ? 'auto' : 'smooth', block: 'start' }), 400);
}

/* ================================================================
   The Mazar figure: a field of tiny stars in the shape of a
   four-point star of light inside a broken halo, with a beam above and
   below and a reflection beneath. Always moving; it listens, thinks,
   speaks, rejoices and flinches with the conversation.
   ================================================================ */
const FIGS = new Set();
const sprite = (rgb, s = 24) => { const c = document.createElement('canvas'); c.width = c.height = s; const x = c.getContext('2d'); const g = x.createRadialGradient(s/2, s/2, 0, s/2, s/2, s/2); g.addColorStop(0, `rgba(${rgb},1)`); g.addColorStop(0.25, `rgba(${rgb},.85)`); g.addColorStop(0.6, `rgba(${rgb},.18)`); g.addColorStop(1, `rgba(${rgb},0)`); x.fillStyle = g; x.fillRect(0, 0, s, s); return c; };
/* every click or tap anywhere sends a gravitational pulse through each visible figure */
document.addEventListener('pointerdown', () => FIGS.forEach(f => f.shock()), { passive: true });
class Figure {
  /* opt.bg: large background figure (pointer from opt.pointer); opt.lite: tiny launcher, no accretion disk */
  constructor(canvas, host, opt = {}){
    this.c = canvas; this.x = canvas.getContext('2d'); this.host = host; this.opt = opt; this.bg = !!opt.bg; this.lite = !!opt.lite; this.state = 'idle'; this.t0 = performance.now(); this.last = this.t0;
    this.env = 0; this.burst = 0; this.err = 0; this.px = null; this.py = null; this.par = { x: 0, y: 0 }; this.spin = 0; this.spin2 = 0; this.glowT = 0.75; this.glow = 0.75;
    this.parts = []; this.disk = []; this.waves = []; this.W = 0; this.H = 0; this.S = 0; this.dpr = Math.min(devicePixelRatio || 1, this.bg ? 1.25 : 1.5); this.visible = true; this.running = false;
    this.colors(); this.resize();
    this.ro = new ResizeObserver(() => this.resize()); this.ro.observe(host);
    this.io = new IntersectionObserver(es => { this.visible = es.some(e => e.isIntersecting); if (this.visible) this.start(); }, { threshold: 0.01 }); this.io.observe(canvas);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) this.start(); });
    const ph = opt.pointer || host;
    ph.addEventListener('pointermove', e => { const r = this.c.getBoundingClientRect(); this.px = (e.clientX - r.left); this.py = (e.clientY - r.top); }, { passive: true });
    ph.addEventListener('pointerleave', () => { this.px = this.py = null; });
    FIGS.add(this);
    this.start();
  }
  colors(){ const col = themeColors(this.host); this.col = col; this.rgb = hex2rgb(col.glow); this.rgbL = hex2rgb(col.light === '#fff' ? '#FFFFFF' : col.light); this.sprite = sprite(this.rgb); this.spriteL = sprite(this.rgbL); this.spriteErr = sprite('255,120,110'); }
  makeSprite(rgb, s){ return sprite(rgb, s); }
  resize(){ const r = this.host.getBoundingClientRect(); const W = Math.max(40, Math.round(r.width)), H = Math.max(40, Math.round(r.height)); if (W === this.W && H === this.H) return; this.W = W; this.H = H; this.c.width = Math.round(W * this.dpr); this.c.height = Math.round(H * this.dpr); this.c.style.width = W + 'px'; this.c.style.height = H + 'px'; this.build(); }
  build(){
    const W = this.W, H = this.H; const S = this.S = this.bg ? Math.min(W * .96, H * 1.04) : Math.min(W, H * 1.15);
    const cx = W / 2, cy = H * (this.bg ? (this.opt.cy || .46) : .5); this.bx = this.cx = cx; this.by = this.cy = cy;
    const cap = this.lite ? 700 : this.bg ? 3000 : 2400;
    const n = Math.round(Math.min(cap, Math.max(this.lite ? 260 : 420, S * (innerWidth < 720 ? 4.2 : 6.5))));
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
    /* the black hole: an accretion disk of stars spiralling in, lensed over the top of the shadow */
    this.disk = []; if (!this.lite){ const nd = Math.round(n * (this.bg ? .45 : .34)); for (let i = 0; i < nd; i++) this.disk.push(this.diskStar(true)); }
    if (/[?&]mzsnap/.test(location.search)) for (let i = 0; i < 150; i++) this.frame();   /* screenshots: settle the stars at once */
  }
  diskStar(fresh){ const rI = this.S * .128, R = Math.random; return { r: fresh ? rI * (1.22 + Math.pow(R(), 1.35) * 2.5) : rI * (3.2 + R() * .5), th: R() * 6.2832, j: (R() - .5) * this.S * .007, b: .35 + R() * .65, sz: .55 + R() * .9, life: fresh ? 1 : 0 }; }
  set(s){ if (this.state === s) return; this.state = s; if (s === 'error') this.err = 1; if (s === 'joy') this.burst = 1; }
  pulse(){ this.env = Math.min(1, this.env + .55); }
  joy(){ this.burst = 1; }
  shock(){ if (!this.visible || !this.c.isConnected || !this.W) return; const now = performance.now(); if (now - (this.lastShock || 0) < 80) return; this.lastShock = now; this.waves.push(now); if (this.waves.length > 4) this.waves.shift(); this.env = Math.min(1, this.env + .75); this.burst = Math.min(1, this.burst + .3); this.start(); }
  focus(frac){ this.cyT = this.H * frac; }
  start(){ if (this.running) return; this.running = true; const loop = () => { if (!this.visible || document.hidden){ this.running = false; return; } this.frame(); requestAnimationFrame(loop); }; requestAnimationFrame(loop); }
  frame(){
    const x = this.x, W = this.W, H = this.H, S = this.S, dpr = this.dpr, st = this.state;
    const now = performance.now(), t = (now - this.t0) / 1000, dt = Math.min(.05, Math.max(.001, (now - this.last) / 1000)); this.last = now;
    const still = RM;
    const wob = still ? 0 : (st === 'think' ? 1.9 : st === 'listen' ? .45 : st === 'speak' ? 1.1 : st === 'error' ? 2.4 : 1) * (S / 260);
    const spinV = still ? 0 : (st === 'think' ? .9 : st === 'listen' ? .22 : st === 'speak' ? .3 : .085) * (1 + this.env * .6);
    this.spin += spinV * (1/60); this.spin2 -= spinV * .72 * (1/60);
    this.env *= .9; this.burst *= .93; this.err *= .92;
    this.glowT = st === 'listen' ? .95 : st === 'think' ? .8 + .12 * Math.sin(t * 5) : st === 'speak' ? .85 + this.env * .5 : st === 'error' ? .5 : .68 + .08 * Math.sin(t * .9);
    this.glow += (this.glowT - this.glow) * .08;
    if (this.cyT != null) this.cy += (this.cyT - this.cy) * .05;
    const breath = still ? 1 : 1 + .02 * Math.sin(t * .95) + this.env * .05 + this.burst * .12;
    const tx = this.px == null ? 0 : (this.px - W / 2) * (this.bg ? .012 : .025), ty = this.py == null ? 0 : (this.py - H / 2) * (this.bg ? .012 : .025);
    this.par.x += (tx - this.par.x) * .05; this.par.y += (ty - this.par.y) * .05;
    const cx = this.cx + this.par.x, cy = this.cy + this.par.y, bx0 = this.bx, by0 = this.by;
    x.setTransform(dpr, 0, 0, dpr, 0, 0); x.clearRect(0, 0, W, H);
    /* light from above */
    const rgb = this.err > .05 ? `255,${Math.round(200 - this.err * 90)},${Math.round(114 - this.err * 30)}` : this.rgb;
    const cone = x.createLinearGradient(0, 0, 0, cy); cone.addColorStop(0, `rgba(${rgb},${.16 * this.glow})`); cone.addColorStop(1, `rgba(${rgb},0)`);
    x.fillStyle = cone; x.beginPath(); x.moveTo(cx - S * .06, -10); x.lineTo(cx + S * .06, -10); x.lineTo(cx + S * .34, cy); x.lineTo(cx - S * .34, cy); x.closePath(); x.fill();
    const rI = S * .128, rs = S * .118 * breath;
    /* event horizon: a soft shadow ring between the star of light and the halo */
    if (!this.lite){ const sh = x.createRadialGradient(cx, cy, rs * .18, cx, cy, rs * 1.45); sh.addColorStop(0, 'rgba(0,0,0,0)'); sh.addColorStop(.38, 'rgba(0,0,0,.5)'); sh.addColorStop(.74, 'rgba(0,0,0,.4)'); sh.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = sh; x.beginPath(); x.arc(cx, cy, rs * 1.45, 0, 6.2832); x.fill(); }
    const core = x.createRadialGradient(cx, cy, 0, cx, cy, S * (this.lite ? .26 : .2) * breath); core.addColorStop(0, `rgba(${rgb},${.55 * this.glow})`); core.addColorStop(.35, `rgba(${rgb},${.12 * this.glow})`); core.addColorStop(1, `rgba(${rgb},0)`);
    x.fillStyle = core; x.fillRect(cx - S * .3, cy - S * .3, S * .6, S * .6);
    const refl = x.createRadialGradient(cx, cy + S * .5, 0, cx, cy + S * .5, S * .28); refl.addColorStop(0, `rgba(${rgb},${(this.bg ? .06 : .18) * this.glow})`); refl.addColorStop(1, `rgba(${rgb},0)`);
    x.fillStyle = refl; x.fillRect(cx - S * .3, cy + S * .38, S * .6, S * .18);
    x.globalCompositeOperation = 'lighter';
    const sp = this.err > .05 ? this.spriteErr : this.sprite, spL = this.spriteL;
    /* photon ring */
    if (!this.lite){ const pr = S * .122 * breath, a0 = .26 * this.glow + this.env * .22; const g = x.createRadialGradient(cx, cy, pr * .88, cx, cy, pr * 1.14); g.addColorStop(0, `rgba(${rgb},0)`); g.addColorStop(.5, `rgba(${rgb},${a0})`); g.addColorStop(1, `rgba(${rgb},0)`); x.fillStyle = g; x.beginPath(); x.arc(cx, cy, pr * 1.14, 0, 6.2832); x.arc(cx, cy, pr * .88, 0, 6.2832, true); x.fill(); }
    /* gravitational pulses from clicks */
    this.waves = this.waves.filter(w0 => now - w0 < 1700);
    const W8 = this.waves.map(w0 => { const a = (now - w0) / 1700; return { a, R: S * (.13 + a * .62), amp: S * .032 * (1 - a) * (1 - a) }; });
    for (const wv of W8){ x.strokeStyle = `rgba(${rgb},${.3 * (1 - wv.a) * (1 - wv.a)})`; x.lineWidth = Math.max(.6, S * .005 * (1 - wv.a)); x.beginPath(); x.arc(cx, cy, wv.R, 0, 6.2832); x.stroke(); }
    const kick = (px, py) => { let ox = 0, oy = 0; for (const wv of W8){ const dx = px - cx, dy = py - cy, d = Math.hypot(dx, dy) || 1, f = Math.exp(-Math.pow((d - wv.R) / (S * .05), 2)) * wv.amp; ox += dx / d * f; oy += dy / d * f; } return [ox, oy]; };
    /* accretion disk */
    if (this.disk.length){
      const tilt = this.bg ? .2 : .24, cr = Math.cos(-.1), sr = Math.sin(-.1);
      const pace = still ? 0 : (st === 'think' ? 2.6 : st === 'speak' ? 1.6 : st === 'listen' ? .8 : 1) * (1 + this.env * 1.4);
      for (const p of this.disk){
        p.th += dt * .7 * pace * Math.pow(rI / p.r, 1.5); p.r -= dt * S * .0045 * pace * (rI * 1.5 / p.r);
        if (p.r < rI * 1.02) Object.assign(p, this.diskStar(false));
        p.life = Math.min(1, p.life + dt * .7);
        const ct = Math.cos(p.th), stn = Math.sin(p.th), X = ct * p.r * breath, Z = stn * p.r * breath, yy = Z * tilt + p.j;
        let qx = cx + X * cr - yy * sr, qy = cy + X * sr + yy * cr;
        const heat = Math.max(0, 1 - (p.r - rI) / (rI * 2.6)), dop = .5 + .5 * -Math.cos(p.th + .5);
        const a = p.b * p.life * (.22 + heat * .78) * (.35 + dop * .65) * (.5 + this.glow * .6);
        if (W8.length){ const [ox, oy] = kick(qx, qy); qx += ox; qy += oy; }
        const sz = p.sz * (S / 210) * (1.2 + heat * 1.3 + this.env * .6);
        if (Z > 0 || Math.abs(X) > rs * 1.05){ x.globalAlpha = Math.min(1, a * (Z > 0 ? 1 : .7)); x.drawImage(heat > .62 ? spL : sp, qx - sz / 2, qy - sz / 2, sz, sz); }
        if (p.r < rI * 2.7){ const L = rI * 1.03 + (p.r - rI) * .17, la = Z > 0 ? .14 : .55; x.globalAlpha = Math.min(1, a * la * (.4 + heat)); const ls = sz * .7; x.drawImage(sp, cx + ct * L - ls / 2, cy + stn * L * .98 - ls / 2, ls, ls); }
      }
    }
    /* the stars of the figure */
    const pxr = this.px, pyr = this.py, rep = S * .16;
    for (const p of this.parts){
      let hx, hy;
      if (p.g === 1 || p.g === 2){ const a = p.a + (p.g === 1 ? this.spin : this.spin2); hx = cx + Math.cos(a) * p.r * breath; hy = cy + Math.sin(a) * p.r * breath; }
      else if (p.g === 4){ hx = cx + (p.hx - bx0) * breath; hy = cy + (p.hy - by0); }
      else { hx = cx + (p.hx - bx0) * breath; hy = cy + (p.hy - by0) * breath; }
      if (this.burst > .01){ const d = Math.max(1, p.r); hx += (hx - cx) / d * this.burst * S * .12; hy += (hy - cy) / d * this.burst * S * .12; }
      if (W8.length){ const [ox, oy] = kick(hx, hy); hx += ox; hy += oy; }
      const n = still ? 0 : wob * (1 + (1 - p.b) * 1.5);
      const txp = hx + Math.sin(t * p.sp * 1.7 + p.ph) * n, typ = hy + Math.cos(t * p.sp * 1.3 + p.ph * 1.7) * n;
      p.x += (txp - p.x) * .09; p.y += (typ - p.y) * .09;
      if (pxr != null){ const dx = p.x - pxr, dy = p.y - pyr, d2 = dx * dx + dy * dy; if (d2 < rep * rep && d2 > 0.01){ const d = Math.sqrt(d2), f = (1 - d / rep) * S * .05; p.x += dx / d * f; p.y += dy / d * f; } }
      const tw = .75 + .25 * Math.sin(t * 2.2 * p.sp + p.ph * 3);
      const a = Math.min(1, p.b * tw * (p.g === 4 ? (this.bg ? .22 : .7) : 1) * (.55 + this.glow * .6) * (st === 'error' ? .6 + .4 * Math.sin(t * 40) : 1));
      const sz = (p.sz * (S / 210) * (1.9 + this.env * .8)) * (p.g === 4 ? 2.4 : 1);
      x.globalAlpha = a; x.drawImage(p.b > .85 && p.g === 0 ? spL : sp, p.x - sz / 2, p.y - sz / 2, sz, sz);
    }
    x.globalAlpha = 1; x.globalCompositeOperation = 'source-over';
  }
  destroy(){ this.ro.disconnect(); this.io.disconnect(); this.visible = false; FIGS.delete(this); }
}

/* ---------- the sky: very faint stars, dust and distant galaxies behind Mazar, lensed around the black hole ---------- */
class Sky {
  constructor(canvas, host, fig, opt = {}){
    this.c = canvas; this.x = canvas.getContext('2d'); this.host = host; this.fig = fig; this.opt = opt; this.dpr = Math.min(devicePixelRatio || 1, 1.5); this.W = this.H = 0; this.t0 = performance.now(); this.visible = true; this.running = false; this.n = 0;
    this.ro = new ResizeObserver(() => this.resize()); this.ro.observe(host);
    this.io = new IntersectionObserver(es => { this.visible = es.some(e => e.isIntersecting); if (this.visible) this.start(); }, { threshold: 0 }); this.io.observe(canvas);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) this.start(); });
    this.resize(); this.start();
  }
  resize(){ const r = this.host.getBoundingClientRect(); const W = Math.max(40, Math.round(r.width)), H = Math.max(40, Math.round(r.height)); if (Math.abs(W - this.W) < 2 && Math.abs(H - this.H) < 2) return; this.W = W; this.H = H; this.c.width = Math.round(W * this.dpr); this.c.height = Math.round(H * this.dpr); this.c.style.width = W + 'px'; this.c.style.height = H + 'px'; this.build(); this.frame(); }
  build(){
    const W = this.W, H = this.H, D = Math.ceil(Math.hypot(W, H)), R = Math.random, col = themeColors(this.host), glow = hex2rgb(col.glow), light = hex2rgb(col.light), cool = '150,175,255';
    const k = Math.min(1.5, this.dpr), o = this.off = document.createElement('canvas'); o.width = o.height = Math.ceil(D * k); const g = o.getContext('2d'); g.scale(k, k); this.D = D;
    for (let i = 0; i < 6; i++){ const x0 = R() * D, y0 = R() * D, rr = D * (.12 + R() * .22), tint = i % 3 === 0 ? cool : glow, gr = g.createRadialGradient(x0, y0, 0, x0, y0, rr); gr.addColorStop(0, `rgba(${tint},${.022 + R() * .02})`); gr.addColorStop(1, `rgba(${tint},0)`); g.fillStyle = gr; g.fillRect(x0 - rr, y0 - rr, rr * 2, rr * 2); }
    g.save(); g.translate(D / 2, D / 2); g.rotate(-.55 + R() * .3); const band = Math.round(2600 * D / 2000); for (let i = 0; i < band; i++){ g.fillStyle = `rgba(${light},${.025 + R() * .07})`; g.fillRect((R() - .5) * D, (R() + R() + R() - 1.5) * D * .08, .8, .8); } g.restore();
    const faint = Math.round(D * D / (this.opt.lite ? 1500 : 700)); for (let i = 0; i < faint; i++){ const s = R() < .93 ? .7 : 1.2; g.fillStyle = `rgba(${R() < .16 ? glow : R() < .2 ? cool : light},${.04 + Math.pow(R(), 3) * .26})`; g.fillRect(R() * D, R() * D, s, s); }
    const gal = this.opt.lite ? 5 : 11; for (let i = 0; i < gal; i++) this.galaxy(g, R() * D, R() * D, D * (.012 + Math.pow(R(), 2.2) * .05), R() < .68, R() < .5 ? glow : cool);
    this.tw = []; const nt = Math.round(W * H / (this.opt.lite ? 4200 : 2200)); for (let i = 0; i < nt; i++) this.tw.push({ x: R() * W, y: R() * H, s: .7 + Math.pow(R(), 4) * 2, a: .1 + R() * .32, ph: R() * 6.28, sp: .4 + R() * 1.8, warm: R() < .22 });
    this.sp = sprite(light, 16); this.spW = sprite(glow, 16);
  }
  galaxy(g, x0, y0, r, spiral, tint){
    const R = Math.random; g.save(); g.translate(x0, y0); g.rotate(R() * 6.28); g.scale(1, .3 + R() * .6);
    const core = g.createRadialGradient(0, 0, 0, 0, 0, r * .55); core.addColorStop(0, `rgba(${tint},.2)`); core.addColorStop(.3, `rgba(${tint},.06)`); core.addColorStop(1, `rgba(${tint},0)`); g.fillStyle = core; g.beginPath(); g.arc(0, 0, r * .55, 0, 6.2832); g.fill();
    if (spiral){ const arms = R() < .3 ? 3 : 2; for (let a = 0; a < arms; a++){ const off = a * 6.2832 / arms; for (let i = 0; i < 240; i++){ const t = i / 240, ang = off + t * 7, rr = r * (.1 + t * .9), j = r * .1 * (.4 + t); g.fillStyle = `rgba(${tint},${.15 * (1 - t) + .02})`; g.fillRect(Math.cos(ang) * rr + (R() - .5) * j, Math.sin(ang) * rr + (R() - .5) * j, 1, 1); } } }
    else { const e = g.createRadialGradient(0, 0, 0, 0, 0, r); e.addColorStop(0, `rgba(${tint},.09)`); e.addColorStop(1, `rgba(${tint},0)`); g.fillStyle = e; g.beginPath(); g.arc(0, 0, r, 0, 6.2832); g.fill(); }
    g.restore();
  }
  center(){ const f = this.fig; if (!f || !f.W || !f.c.isConnected) return null; if (!this._cc || performance.now() - this._ct > 400){ const a = f.c.getBoundingClientRect(), b = this.c.getBoundingClientRect(); this._cc = a.width ? { ox: a.left - b.left, oy: a.top - b.top } : null; this._ct = performance.now(); } return this._cc ? { x: this._cc.ox + f.cx + f.par.x, y: this._cc.oy + f.cy + f.par.y, S: f.S } : null; }
  start(){ if (this.running || RM) return; this.running = true; const loop = () => { if (!this.visible || document.hidden){ this.running = false; return; } if ((this.n++ & 1) === 0) this.frame(); requestAnimationFrame(loop); }; requestAnimationFrame(loop); }
  frame(){
    const x = this.x, W = this.W, H = this.H, t = (performance.now() - this.t0) / 1000, D = this.D;
    x.setTransform(this.dpr, 0, 0, this.dpr, 0, 0); x.clearRect(0, 0, W, H);
    x.save(); x.translate(W / 2, H / 2); x.rotate(RM ? 0 : t * .0035); x.drawImage(this.off, -D / 2, -D / 2, D, D); x.restore();
    const fc = this.center(), E = fc ? fc.S * .2 : 0, E2 = E * E;
    x.globalCompositeOperation = 'lighter';
    for (const s of this.tw){
      let sx = s.x, sy = s.y;
      if (fc){ const dx = sx - fc.x, dy = sy - fc.y, d = Math.hypot(dx, dy) || 1; if (d < E * 4){ const k = E2 / d * (1 - d / (E * 4)); sx += dx / d * k; sy += dy / d * k; } }
      x.globalAlpha = s.a * (.5 + .5 * Math.sin(t * s.sp + s.ph)); const z = s.s * 3.2; x.drawImage(s.warm ? this.spW : this.sp, sx - z / 2, sy - z / 2, z, z);
    }
    x.globalAlpha = 1; x.globalCompositeOperation = 'source-over';
  }
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
  down: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>',
  prev: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>',
  next: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5l7 7-7 7"/></svg>',
  lang: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5h9M8.5 3v2M11 5c-.6 3.5-2.8 6.6-6 8.5M6 8c1.2 2.6 3.4 4.6 6 5.5M13 21l4-10 4 10M14.5 17h5"/></svg>',
  user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>',
  church: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v5M9.5 4.5h5M5 21V11l7-4 7 4v10M3 21h18M10 21v-5h4v5"/></svg>',
  shield: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/></svg>',
  db: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5.5" rx="8" ry="3"/><path d="M4 5.5v13c0 1.7 3.6 3 8 3s8-1.3 8-3v-13M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/></svg>',
  rail: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="3"/><path d="M9.5 4v16"/></svg>',
  clip: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20.5 11.2l-8.4 8.4a5.3 5.3 0 0 1-7.5-7.5l8.9-8.9a3.6 3.6 0 0 1 5.1 5.1l-8.9 8.9a1.8 1.8 0 0 1-2.5-2.5l8.2-8.2"/></svg>',
  file: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h4"/></svg>',
  menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
  trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>',
  pen: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h4l10.5-10.5a2.1 2.1 0 0 0-3-3L5 17z"/><path d="M13 7l3 3"/></svg>',
  cross: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M12 3v18M6 9h12"/></svg>',
  heart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s-7-4.4-9-8.4A5 5 0 0 1 12 6a5 5 0 0 1 9 6.6C19 16.6 12 21 12 21z"/></svg>',
  q: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 .9-1 1.7M12 17h.01"/></svg>',
};
const TASKS = [
  ['cal', 'Plan my Sunday visit', 'Service time, directions and a reminder', 'Plan my visit to church this Sunday and add a reminder to my calendar.'],
  ['form', "Register for Koi 26'", 'Yuriel fills the form, you submit', "I want to register for Koi 26'. Please help me fill in the registration."],
  ['wa', 'Send a prayer request', 'Drafted for you to send', 'I would like to send a prayer request to the pastoral team.'],
  ['book', 'Build a reading plan', 'Day by day, saved in Today', 'Create a 7 day Bible reading plan for me. Ask me what topic first.'],
  ['spark', 'Find a sermon or study', 'Across all three sites', 'Help me find a sermon or study material. Ask me the topic.'],
  ['form', 'Join Worship Connect', 'Start your application', 'I want to join Worship Connect. Please help me fill in the application.'],
  ['cal', 'Remind me about an event', 'One tap to your calendar', 'Set a calendar reminder for me. Ask me which event.'],
  ['chat', 'Pray with me', 'A short prayer and a verse', 'Please pray with me. Ask me what is on my heart.'],
];
const STUDY = [
  ['study', 'Study a passage', 'Context, meaning, application, questions', 'Give me a full study guide on {ref}: historical context, what it says, what it means, how it applies to my life, cross references and three discussion questions.'],
  ['cross', 'Compare versions', 'Hebrew, Greek, Geneva, King James and today, side by side', 'Compare {ref} in the original language, the Geneva Bible, the King James Version and the World English Bible, and explain any differences that matter.'],
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
/* ---------- replies: a small, safe markdown renderer (window.MazarRich). All text is escaped with esc() before any rule
   runs, only tags built here are emitted and links must be http(s). Blocks: fenced code (with Copy), # headings (ranked into
   h3 to h6), > quotes, nested - and 1. lists, pipe tables, --- rules, paragraphs (a single newline is a line break).
   Inline: `code`, **bold**, *italic*, ~~strike~~, ==highlight==, [label](https://...) and bare links. ---------- */
const MD = { fence: /^ {0,3}(`{3,}|~{3,})[ \t]*([^`\s]*)[^`]*$/, hr: /^ {0,3}([-*_])(?:[ \t]*\1){2,}[ \t]*$/, head: /^ {0,3}(#{1,6})[ \t]+(.*?)(?:[ \t]+#+)?[ \t]*$/, quote: /^ {0,3}> ?/, item: /^( *)([-*+•]|\d{1,9}[.)])(?:([ \t]+)(.*))?$/, sep: /^ *\|? *:?-+:? *(?:\| *:?-+:? *)*\|? *$/, label: /^(\p{L}[\p{L}\p{M}\p{N}'’.-]*(?:[ \t]+[\p{L}\p{N}][\p{L}\p{M}\p{N}'’.-]*){0,3}):(?=[ \t]|$)/u };
const mdEmph = s => s.replace(/(^|[^~])~~([^\s~](?:.{0,400}?[^\s~])?)~~(?!~)/g, '$1<del>$2</del>').replace(/(^|[^\w=])==([^\s=](?:.{0,400}?[^\s=])?)==(?![\w=])/g, '$1<mark>$2</mark>')
  .replace(/\*\*\*([^\s*](?:.{0,400}?[^\s*])?)\*\*\*/g, '<strong><em>$1</em></strong>').replace(/\*\*([^\s*](?:.{0,400}?[^\s*])?)\*\*/g, '<strong>$1</strong>').replace(/(^|[^\w_])__([^\s_](?:.{0,400}?[^\s_])?)__(?![\w_])/g, '$1<strong>$2</strong>')
  .replace(/(^|[^\w*])\*([^\s*](?:[^*\n]{0,400}?[^\s*])?)\*(?![\w*])/g, '$1<em>$2</em>').replace(/(^|[^\w_])_([^\s_](?:[^_\n]{0,400}?[^\s_])?)_(?![\w_])/g, '$1<em>$2</em>');
const mdInline = s => { const K = [], keep = h => '\u0001' + (K.push(h) - 1) + '\u0001', a = (u, label) => keep(`<a href="${u}" target="_blank" rel="noopener">${label}</a>`);
  let e = esc(s.replace(/(`+)(?!`)([\s\S]*?[^`])\1(?!`)/g, (_, f, c) => keep(`<code>${esc(/^ .*[^ ].* $/.test(c) ? c.slice(1, -1) : c)}</code>`)).replace(/\\([\\`*_{}[\]()#+\-.!|~=>])/g, (_, c) => keep(esc(c))))
    .replace(/\[([^\]\n]{1,300})\]\((https?:\/\/(?:[^\s()\u0001]|\([^\s()\u0001]*\))+)(?:[ \t]+&quot;.*?&quot;)?\)/g, (_, l, u) => a(u, mdEmph(l)))
    .replace(/\bhttps?:\/\/(?:(?!&(?:lt|gt|quot|#39);)[^\s\u0001])+/g, m => { let u = m.replace(/[.,;:!?*_~=]+$/, ''); while (/\)$/.test(u) && (u.match(/\(/g) || []).length < (u.match(/\)/g) || []).length) u = u.slice(0, -1).replace(/[.,;:!?*_~=]+$/, '');
      const d = u.replace(/^https?:\/\//, '').replace(/\/$/, ''); return a(u, d.length > 48 ? d.slice(0, 46).replace(/&[#\w]*$/, '') + '…' : d) + m.slice(u.length); });
  e = mdEmph(e); for (let n = 0; n < 5 && e.includes('\u0001'); n++) e = e.replace(/\u0001(\d+)\u0001/g, (_, i) => K[+i]); return e; };
const mdCells = l => l.replace(/\\\|/g, '\u0002').trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(c => c.trim().replace(/\u0002/g, '\\|'));
/* a numbered item with details under it gets its lead line as a bold title (the whole line when short, else its first sentence
   where that cut leaves every inline tag closed); a lead the model already opened with bold is left alone */
const mdTitle = h => { const p = h.startsWith('<p>'), a = p ? 3 : 0, e = p ? h.indexOf('</p>') : h.search(/<(?:ul|ol|div|blockquote|hr|p)[\s>]|<h\u0003/); if (e <= a) return h;
  let lead = h.slice(a, e), tail = ''; if (/^<strong>/.test(lead) || !lead.replace(/<[^>]+>/g, '').trim()) return h;
  const br = lead.indexOf('<br>'); if (br > 0){ tail = lead.slice(br); lead = lead.slice(0, br); }
  if (lead.replace(/<[^>]+>/g, '').length > 140){ const shut = x => (x.match(/<(strong|em|del|mark|code|a)[\s>]/g) || []).length === (x.match(/<\/(strong|em|del|mark|code|a)>/g) || []).length;
    for (const mm of lead.matchAll(/[.!?:](?=\s)/g)){ const cut = mm.index + 1; if (cut > 12 && !/<[^>]*$/.test(lead.slice(0, cut)) && shut(lead.slice(0, cut))){ tail = lead.slice(cut) + tail; lead = lead.slice(0, cut); break; } } }
  return h.slice(0, a) + `<strong>${lead}</strong>` + tail + h.slice(e); };
const mdBlocks = (L, H, dp = 0) => { const n = L.length, ind = l => l.match(/^ */)[0].length; let out = '', i = 0, m;
  const table = j => j + 1 < n && L[j].includes('|') && L[j + 1].includes('-') && MD.sep.test(L[j + 1]) && !MD.item.test(L[j]) && mdCells(L[j]).length === mdCells(L[j + 1]).length;
  const start = j => MD.fence.test(L[j]) || MD.hr.test(L[j]) || MD.head.test(L[j]) || MD.quote.test(L[j]) || MD.item.test(L[j]) || table(j);
  while (i < n){ const l = L[i];
    if (!l.trim()){ i++; continue; }
    if ((m = l.match(MD.fence))){ const f = m[1], body = []; for (i++; i < n; i++){ const t = L[i].trim(); if (ind(L[i]) < 4 && t.length >= f.length && t === f[0].repeat(t.length)) break; body.push(L[i]); } i++;
      out += `<div class="mz-code"><div class="mz-code__bar"><span>${esc(m[2].slice(0, 24))}</span><button type="button" class="mz-copy" aria-label="Copy code">Copy</button></div><pre><code>${esc(body.join('\n'))}</code></pre></div>`; continue; }
    if (MD.hr.test(l)){ out += '<hr>'; i++; continue; }
    if ((m = l.match(MD.head))){ i++; if (m[2].trim()){ H.push(m[1].length); out += `<h\u0003${m[1].length}>${mdInline(m[2])}</h\u0003${m[1].length}>`; } continue; }
    if (dp < 12 && MD.quote.test(l)){ const q = []; while (i < n && MD.quote.test(L[i])) q.push(L[i++].replace(MD.quote, '')); out += `<blockquote>${mdBlocks(q, H, dp + 1)}</blockquote>`; continue; }
    if (table(i)){ const hd = mdCells(L[i]), k = hd.length, al = mdCells(L[i + 1]).map(c => /^:-+:$/.test(c) ? 'c' : /-:$/.test(c) ? 'r' : ''), rows = [];
      for (i += 2; i < n && L[i].trim() && L[i].includes('|') && !MD.fence.test(L[i]) && !MD.head.test(L[i]) && !MD.quote.test(L[i]); i++){ const r = mdCells(L[i]); rows.push(Array.from({ length: k }, (_, j) => r[j] || '')); }
      const cls = hd.map((h, j) => { const col = rows.map(r => r[j]), c = [al[j] === 'c' ? 'is-c' : al[j] === 'r' || (!al[j] && col.some(Boolean) && col.every(x => !x || /^[-+]?(?:[A-Z]{1,3}\s?)?\d[\d.,]*\s?%?$/.test(x.replace(/[*`]/g, '')))) ? 'is-r' : '', [h, ...col].some(x => x.replace(/\]\([^)]*\)|[*_`[]/g, '').length > 30) ? 'is-w' : ''].filter(Boolean).join(' '); return c ? ` class="${c}"` : ''; });
      out += `<div class="mz-table"><table><thead><tr>${hd.map((h, j) => `<th${cls[j]}>${mdInline(h)}</th>`).join('')}</tr></thead>${rows.length ? `<tbody>${rows.map(r => `<tr>${r.map((c, j) => `<td${cls[j]}>${mdInline(c)}</td>`).join('')}</tr>`).join('')}</tbody>` : ''}</table></div>`; continue; }
    if (dp < 12 && (m = l.match(MD.item))){ const base = m[1].length, ord = /\d/.test(m[2]), first = parseInt(m[2], 10), items = []; let loose = false;
      const sib = j => { const s = !MD.hr.test(L[j]) && L[j].match(MD.item); return s && s[1].length < base + 2 && /\d/.test(s[2]) === ord; };
      /* a "-" bullet written flat under a numbered item is that item's detail: it nests inside it, so the numbering stays one list. Straight
         after the item it always nests; after a blank line only when another numbered item follows, the item already has details, or earlier
         items also left a blank line before theirs (so a separate closing list, like "- Pinned: ...", stays separate) */
      const flat = j => { const s = ord && !MD.hr.test(L[j]) && L[j].match(MD.item); return !!s && !/\d/.test(s[2]) && s[1].length >= base && s[1].length < base + 2; };
      const run = j => { let k = j; while (k < n){ if (L[k].trim() && (flat(k) || ind(L[k]) >= base + 2 || (L[k - 1].trim() && !start(k)))){ k++; continue; } if (!L[k].trim()){ let q = k; while (q < n && !L[q].trim()) q++; if (q < n && (flat(q) || ind(L[q]) >= base + 2)){ k = q; continue; } } break; } return k; };
      while (i < n && sib(i)){ const s = L[i].match(MD.item), col = s[1].length + s[2].length + (s[3] ? Math.min(s[3].replace(/\t/g, '    ').length, 4) : 1), body = [s[4] || '']; let mine = false; i++;
        while (i < n){ const x = L[i];
          if (!x.trim()){ let j = i; while (j < n && !L[j].trim()) j++; if (j < n && ind(L[j]) >= base + 2){ body.push(...L.slice(i, j)); i = j; continue; }
            if (j < n && flat(j)){ const k = run(j); let q = k; while (q < n && !L[q].trim()) q++; if (mine || loose || (q < n && sib(q))){ body.push(...L.slice(i, k)); i = k; loose = loose || !mine; mine = true; continue; } }
            if (j < n && sib(j)) i = j; break; }
          if (flat(i)){ body.push(x); i++; mine = true; continue; }
          if (ind(x) >= base + 2 || (body[body.length - 1].trim() && !start(i))){ body.push(x); i++; continue; }
          break; }
        const rest = body.slice(1), d = Math.min(col, ...rest.filter(x => x.trim()).map(ind)), sub = rest.some(x => MD.item.test(x) && !MD.hr.test(x));
        /* a bullet that opens with a short label ("What it means:", "Key verses:") shows the label in bold; times (07:20) and references (John 3:16) are not labels */
        const lead = !ord && !/^(\*\*|__)/.test(body[0]) ? body[0].replace(MD.label, '**$1:**') : body[0];
        let h = mdBlocks([lead, ...rest.map(x => x.slice(Math.min(d, ind(x))))], H, dp + 1);
        if (h.startsWith('<p>') && h.split('<p>').length === 2) h = h.replace(/^<p>([\s\S]*?)<\/p>/, '$1');
        if (ord && sub) h = mdTitle(h); items.push(`<li>${h}</li>`); }
      out += ord ? `<ol${first !== 1 ? ` start="${first}"` : ''}>${items.join('')}</ol>` : `<ul>${items.join('')}</ul>`; continue; }
    const p = [l.trim()]; for (i++; i < n && L[i].trim() && !start(i); i++) p.push(L[i].trim()); out += `<p>${mdInline(p.join('\n')).replace(/\n/g, '<br>')}</p>`; }
  return out; };
const rich = t => { try { const H = [], html = mdBlocks(String(t ?? '').replace(/[\u0001-\u0003]/g, '').replace(/\r\n?/g, '\n').replace(/^[ \t]+/gm, w => w.replace(/\t/g, '    ')).split('\n'), H), lv = [...new Set(H)].sort();
  return html.replace(/\u0003(\d)/g, (_, d) => 3 + Math.min(3, lv.indexOf(+d))); } catch (_) { return `<p>${esc(t).replace(/\n/g, '<br>')}</p>`; } };
/* type a rendered reply out word by word: text nodes refill in document order (markup is never split), code blocks, tables
   and rules appear whole, and each element stays hidden until its first words arrive */
const TYPE_ATOM = 'pre,table,hr,.mz-code,.mz-table';
const typeOut = (root, tick, done) => { const full = root.innerHTML, units = [];
  const inAtom = x => { for (let p = x.parentElement; p && p !== root; p = p.parentElement) if (p.matches(TYPE_ATOM)) return true; return false; };
  const walk = x => x.childNodes.forEach(c => { if (c.nodeType === 3){ if (c.data) units.push({ n: c, parts: c.data.split(/(\s+)/).filter(Boolean) }); } else if (c.nodeType === 1){ if (c.matches(TYPE_ATOM) || !c.firstChild) units.push({ n: c, w: c.nodeName === 'BR' ? 0 : 4 }); else walk(c); } });
  walk(root); const all = $$('*', root).filter(x => !inAtom(x)); units.forEach(u => { if (u.parts) u.n.data = ''; }); all.forEach(x => x.classList.add('mz-tw'));
  const show = x => { for (let p = x; p && p !== root; p = p.parentNode) if (p.nodeType === 1 && p.classList.contains('mz-tw')){ p.classList.remove('mz-tw'); if (!p.classList.length) p.removeAttribute('class'); } };
  const step = Math.max(2, Math.ceil(units.reduce((s, u) => s + (u.parts ? u.parts.length : u.w), 0) / 55)); let i = 0, k = 0;
  const run = () => { let left = step; while (left > 0 && i < units.length){ const u = units[i]; show(u.n); if (u.parts){ u.n.data += u.parts.shift(); left--; if (!u.parts.length) i++; } else { left -= u.w; i++; } }
    if (tick) tick(++k); if (i < units.length) return void setTimeout(run, 18); all.forEach(show); if (root.innerHTML !== full) root.innerHTML = full; if (done) done(); };
  run(); };
document.addEventListener('click', e => { const b = e.target.closest && e.target.closest('.mz-copy'), box = b && b.closest('.mz-code'), code = box && $('code', box); if (!code) return;
  const txt = code.textContent, said = ok => { b.textContent = ok ? 'Copied' : 'Not copied'; b.classList.toggle('is-done', ok); clearTimeout(b._t); b._t = setTimeout(() => { b.textContent = 'Copy'; b.classList.remove('is-done'); }, 1600); };
  const legacy = () => { const ta = document.createElement('textarea'); ta.value = txt; ta.setAttribute('readonly', ''); ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0'; document.body.appendChild(ta); ta.select(); let ok = false; try { ok = document.execCommand('copy'); } catch (_) {} ta.remove(); return ok; };
  if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(txt).then(() => said(true), () => said(legacy())); else said(legacy()); });
/* ---------- "are you sure?": Mazar's own confirm, rendered inside the Mazar root so the --mz-* colours apply and the widget's
   outside-click close never fires. sure(root, { title, body, ok, cancel, danger, icon, from }) resolves true (confirm) or false
   (Cancel, Esc, backdrop). danger focuses Cancel first; Enter confirms unless the person has moved onto Cancel themselves;
   cancel: false makes a one-button notice. Everything else in the root is inert while it is open. ---------- */
let sureN = 0, sureOpen = null;
function sure(root, o = {}){
  if (sureOpen) sureOpen(false);
  return new Promise(resolve => {
    const n = ++sureN, from = o.from || document.activeElement, danger = !!o.danger, t0 = performance.now(); let moved = false;
    const el = document.createElement('div'); el.className = 'mz-sure' + (danger ? ' is-danger' : '');
    el.innerHTML = `<div class="mz-sure__veil" data-no></div><div class="mz-sure__card" role="alertdialog" aria-modal="true" aria-labelledby="mz-sure-t${n}"${o.body ? ` aria-describedby="mz-sure-b${n}"` : ''}><span class="mz-sure__ico" aria-hidden="true">${danger ? I[o.icon] || I.trash : markSvg()}</span><h2 class="mz-sure__t" id="mz-sure-t${n}">${esc(o.title || 'Are you sure?')}</h2>${o.body ? `<p class="mz-sure__b" id="mz-sure-b${n}">${esc(o.body)}</p>` : ''}<div class="mz-sure__row">${o.cancel === false ? '' : `<button type="button" class="mz-sure__btn mz-sure__no" data-no>${esc(o.cancel || 'Cancel')}</button>`}<button type="button" class="mz-sure__btn mz-sure__ok">${esc(o.ok || 'OK')}</button></div></div>`;
    const okB = $('.mz-sure__ok', el), noB = $('.mz-sure__no', el), btns = [noB, okB].filter(Boolean), off = [...root.children].filter(x => !x.inert);
    const done = yes => { if (el.classList.contains('is-out')) return; sureOpen = null; removeEventListener('keydown', key, true); el.classList.remove('is-in'); el.classList.add('is-out'); off.forEach(x => { x.inert = false; }); setTimeout(() => el.remove(), RM ? 0 : 260); if (from && from.isConnected && from.focus) from.focus({ preventScroll: true }); resolve(yes); };
    /* capture on window: the account window, the widget and the Bible reader never see keys meant for the dialog */
    const key = e => { e.stopPropagation(); const k = e.key;
      if (k === 'Escape'){ e.preventDefault(); done(false); }
      else if (k === 'Enter'){ e.preventDefault(); if (!e.repeat && performance.now() - t0 > 250) done(!(moved && document.activeElement === noB)); }
      else if (k === 'Tab' || /^Arrow(Left|Right|Up|Down)$/.test(k)){ e.preventDefault(); moved = true; const i = btns.indexOf(document.activeElement); btns[i < 0 ? 0 : (i + (e.shiftKey || /Left|Up/.test(k) ? btns.length - 1 : 1)) % btns.length].focus(); } };
    el.addEventListener('click', e => { if (e.target.closest('.mz-sure__ok')) done(true); else if (e.target.closest('[data-no]')) done(false); });
    root.appendChild(el); off.forEach(x => { x.inert = true; }); addEventListener('keydown', key, true); sureOpen = done;
    (danger && noB ? noB : okB).focus({ preventScroll: true }); void el.offsetWidth; el.classList.add('is-in');
  });
}
const FIELD_LABEL = { first:'First name', middle:'Middle name', surname:'Surname', gender:'Gender', age:'Age', address:'Town', country:'Country', phone:'Phone', email:'Email', participation:'Taking part', detail:'Detail', days:'Days', dietary:'Dietary', expectation:'Expectation', name:'Name', gift:'Gift', experience:'Experience', church:'Church', message:'Message', contact:'Contact', topic:'Topic', via:'Reply by' };

/* ================================================================ Mazar accounts (mazar.ccfczambia.org) ================================================================
   Mazar is its own app with its own sign-in and database (Supabase project "Mazar AI", CFG.mazarUrl; session in localStorage
   "mazar-ai-auth"), separate from the church database, so a Mazar account never becomes a church member or gets a church role.
   People sign in with Google, Facebook or email, or continue with their CCFC church account: the Mazar AI mazar-account
   function checks the church sign-in with the church project and opens the Mazar account connected to it. Signed-in
   conversations and reading plans sync to the Mazar account. */
const ACCT_FN = () => (CFG.mazarUrl || '') + '/functions/v1/mazar-account';
const CCFC_ACCOUNT = 'https://ccfczambia.org/account';
const onChurchDomain = () => /(^|\.)ccfczambia\.org$/.test(location.hostname);
function ccfcCookieSession(){
  if (!onChurchDomain()) return null;
  const read = n => { const m = document.cookie.match(new RegExp('(?:^|; )' + n.replace(/[.]/g, '[.]') + '=([^;]*)')); return m ? decodeURIComponent(m[1]) : null; };
  const n = +(read('ccfc-auth.n') || 0); let raw = '';
  if (n){ for (let i = 0; i < n; i++){ const c = read('ccfc-auth.' + i); if (c == null) return null; raw += c; } } else raw = read('ccfc-auth') || '';
  if (!raw) return null; try { const s = JSON.parse(raw); return s && s.access_token ? s : null; } catch (_) { return null; }
}
const freshCcfc = s => !!(s && s.access_token && (+s.expires_at || 0) * 1000 > Date.now() + 60000);
const GOOGLE_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.3-1.6 3.8-5.5 3.8-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.2 14.6 2.2 12 2.2 6.6 2.2 2.2 6.6 2.2 12s4.4 9.8 9.8 9.8c5.7 0 9.4-4 9.4-9.6 0-.6-.1-1.1-.2-1.6H12z"/><path fill="#34A853" d="M3.3 7.4l3.2 2.4C7.4 7.9 9.5 6.3 12 6.3c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.2 14.6 2.2 12 2.2 8.2 2.2 4.9 4.3 3.3 7.4z" opacity=".001"/><path fill="#4285F4" d="M21.4 12.2c0-.6-.1-1.1-.2-1.6H12v3.9h5.5c-.3 1.3-1.1 2.4-2.3 3.1l3.6 2.8c2.1-1.9 2.6-4.9 2.6-8.2z"/><path fill="#FBBC05" d="M6 14.1c-.2-.6-.4-1.3-.4-2.1s.1-1.5.4-2.1L2.8 7.4C2.2 8.8 1.8 10.4 1.8 12s.4 3.2 1 4.6L6 14.1z"/><path fill="#34A853" d="M12 21.8c2.6 0 4.8-.9 6.4-2.4l-3.6-2.8c-.9.6-2.1 1.1-3.8 1.1-2.5 0-4.6-1.7-5.3-4L2.5 16.4c1.6 3.2 5.1 5.4 9.5 5.4z"/></svg>';
const FB_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#1877F2" d="M24 12a12 12 0 1 0-13.9 11.9v-8.4H7.1V12h3V9.4c0-3 1.8-4.7 4.5-4.7 1.3 0 2.7.2 2.7.2v2.9h-1.5c-1.5 0-2 .9-2 1.9V12h3.4l-.5 3.5h-2.9v8.4A12 12 0 0 0 24 12z"/><path fill="#fff" d="M16.7 15.5l.5-3.5h-3.4V9.7c0-1 .5-1.9 2-1.9h1.5V4.9s-1.4-.2-2.7-.2c-2.7 0-4.5 1.6-4.5 4.7V12h-3v3.5h3v8.4a12 12 0 0 0 3.7 0v-8.4h2.9z"/></svg>';
const ROLE_LABEL = { master_admin: 'Master Administrator', admin: 'Administrator', leader: 'Leader', media: 'Media team', blogger: 'Blogger', member: 'Member' };

function accounts(w, api){
  const btns = () => $$('.mz__acct, .mz__me', w);
  if (!window.supabase || !CFG.mazarUrl || !CFG.mazarKey){ btns().forEach(b => { b.hidden = true; }); return; }
  ls.del('mazar-auth');   /* a session from before Mazar moved to its own database */
  const sb = window.supabase.createClient(CFG.mazarUrl, CFG.mazarKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storageKey: 'mazar-ai-auth' } });
  const A = { session: null, row: null, ccfc: null };
  const qp = new URLSearchParams(location.search);
  let wantCenter = qp.has('account') || qp.has('reset'), centerTab = qp.get('account') === 'connect' ? 'ccfc' : 'profile', mode = 'in';
  if (qp.has('account') || qp.has('reset')){ qp.delete('account'); qp.delete('reset'); history.replaceState(null, '', location.pathname + (qp.toString() ? '?' + qp : '') + location.hash); }

  const meta = () => (A.session && A.session.user && A.session.user.user_metadata) || {};
  const nameOf = () => (A.row && A.row.display_name) || meta().full_name || meta().name || ((A.session && A.session.user.email) || '').split('@')[0] || '';
  const photoOf = () => (A.row && A.row.avatar_url) || meta().avatar_url || meta().picture || '';
  const initials = s => (String(s || '').trim().split(/\s+/).filter(Boolean).map(x => x[0]).slice(0, 2).join('') || '?').toUpperCase();
  const av = (name, url, cls = '') => url && /^https:\/\//.test(url) ? `<span class="mza-av ${cls}"><img src="${esc(url)}" alt="" referrerpolicy="no-referrer"></span>` : `<span class="mza-av ${cls}">${esc(initials(name))}</span>`;
  const friendly = e => { const s = String((e && (e.message || e.error_description)) || e || ''); if (/invalid login/i.test(s)) return "That email and password don't match. Try again or reset your password."; if (/already registered|already been registered/i.test(s)) return 'That email already has an account. Sign in instead, or continue with your CCFC account.'; if (/not confirmed/i.test(s)) return 'Please confirm your email first. The link is in your inbox.'; if (/provider is not enabled|unsupported provider/i.test(s)) return "That sign-in option isn't switched on yet. Use Google or email for now."; if (/password.*(6|8|short|weak)/i.test(s)) return 'Please choose a stronger password (at least 8 characters).'; if (/rate limit|too many/i.test(s)) return 'Too many tries. Please wait a minute and try again.'; if (/reauth/i.test(s)) return 'For your security, sign out and back in, then change your password.'; return s || 'Something went wrong. Please try again.'; };
  const fn = async (action, extra = {}) => { const h = { 'Content-Type': 'application/json', apikey: CFG.mazarKey }; if (A.session) h.Authorization = 'Bearer ' + A.session.access_token; const r = await fetch(ACCT_FN(), { method: 'POST', headers: h, body: JSON.stringify({ action, ...extra }) }); const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || 'The account service is not available right now.'); return j; };

  /* ---- the window ---- */
  const m = document.createElement('div'); m.className = 'mza'; m.hidden = true; m.setAttribute('role', 'dialog'); m.setAttribute('aria-modal', 'true'); m.setAttribute('aria-label', 'Yuriel account');
  m.innerHTML = `<div class="mza__veil" data-close></div><div class="mza__box"><button class="mz__btn mza__x" type="button" aria-label="Close" data-close>${I.close}</button><div class="mza__body"></div></div>`;
  w.appendChild(m); const body = $('.mza__body', m);
  let lastFocus = null;
  const openM = view => { lastFocus = document.activeElement; m.hidden = false; void m.offsetWidth; m.classList.add('is-in'); if (view === 'center' && A.session) renderCenter(); else renderLogin(); api.figs.forEach(f => f.joy()); setTimeout(() => { const f = $('input, button:not([data-close])', body); if (f && innerWidth > 640) f.focus({ preventScroll: true }); }, 80); };
  const closeM = () => { m.classList.remove('is-in'); setTimeout(() => { m.hidden = true; }, RM ? 0 : 260); if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true }); };
  m.addEventListener('click', e => { if (e.target.closest('[data-close]')) closeM(); });
  addEventListener('keydown', e => { if (e.key === 'Escape' && !m.hidden) closeM(); });
  btns().forEach(b => b.addEventListener('click', () => openM(A.session ? 'center' : 'login')));

  /* ---- CCFC account on this device ---- */
  async function getCcfc(msgEl){
    const s = ccfcCookieSession(); if (freshCcfc(s)) return s;
    if (!onChurchDomain()) throw new Error('Connecting a CCFC account works on yuriel.ccfczambia.org.');
    const pop = window.open(CCFC_ACCOUNT + '?connect=mazar', 'ccfc-connect', 'width=520,height=760');
    if (!pop) throw new Error('Your browser blocked the CCFC sign-in window. Allow pop-ups for Yuriel, or sign in at ccfczambia.org first and try again.');
    if (msgEl){ msgEl.className = 'mza__msg'; msgEl.textContent = 'Sign in to your CCFC account in the window that opened. Yuriel will carry on by itself.'; }
    return await new Promise((res, rej) => { const t0 = Date.now(); const iv = setInterval(() => { const x = ccfcCookieSession(); if (freshCcfc(x)){ clearInterval(iv); try { pop.close(); } catch (_) {} res(x); } else if ((pop.closed && Date.now() - t0 > 1500) || Date.now() - t0 > 600000){ clearInterval(iv); rej(new Error('The CCFC sign-in window was closed before you signed in.')); } }, 1000); });
  }
  async function ccfcContinue(btn, msgEl){
    btn.disabled = true;
    try {
      const s = await getCcfc(msgEl); if (msgEl){ msgEl.className = 'mza__msg'; msgEl.textContent = 'Signing you in with your CCFC account...'; }
      const { token_hash } = await fn('ccfc-signin', { ccfc_token: s.access_token });
      let r = await sb.auth.verifyOtp({ token_hash, type: 'magiclink' }); if (r.error) r = await sb.auth.verifyOtp({ token_hash, type: 'email' }); if (r.error) throw r.error;
      A.session = r.data.session; centerTab = 'profile'; await refresh(true);
    } catch (e){ if (msgEl){ msgEl.className = 'mza__msg is-err'; msgEl.textContent = friendly(e); } }
    finally { btn.disabled = false; }
  }
  async function ccfcConnect(btn, msgEl){
    btn.disabled = true;
    try { const s = await getCcfc(msgEl); const { linked } = await fn('link', { ccfc_token: s.access_token }); await refresh(true); flash(`Connected to ${linked.full_name || 'your CCFC account'}.`); }
    catch (e){ if (msgEl){ msgEl.className = 'mza__msg is-err'; msgEl.textContent = friendly(e); } }
    finally { btn.disabled = false; }
  }

  /* ---- sign-in window ---- */
  function renderLogin(note, isErr){
    const c = ccfcCookieSession(), cu = c && c.user, cm = (cu && cu.user_metadata) || {}, cname = cu ? (cm.full_name || cm.name || cu.email || '') : '';
    body.innerHTML = `
      <div class="mza__hero">${markSvg()}<h2>Welcome to Yuriel</h2><p>Sign in to keep your conversations, reading plans and studies with you on every device.</p></div>
      <button type="button" class="mza__ccfc">${cu ? av(cname, cm.avatar_url || cm.picture) : `<span class="mza-av mza-av--ccfc">${I.church}</span>`}<span class="mza__ccfc-t"><b>${cu ? 'Continue as ' + esc(cname || 'your CCFC account') : 'Continue with your CCFC account'}</b><small>${cu ? 'Your CCFC church account on this device' : 'The account you use on ccfczambia.org'}</small></span>${I.arrow}</button>
      <div class="mza__or"><span>or use a separate Yuriel account</span></div>
      <div class="mza__oauth"><button type="button" class="mza__prov" data-p="google">${GOOGLE_ICON}<span>Continue with Google</span></button><button type="button" class="mza__prov" data-p="facebook">${FB_ICON}<span>Continue with Facebook</span></button></div>
      <form class="mza__form" novalidate>
        <div class="mza__seg" role="tablist" aria-label="Sign in or create an account"><button type="button" role="tab" data-m="in" aria-selected="${mode === 'in'}">Sign in</button><button type="button" role="tab" data-m="up" aria-selected="${mode === 'up'}">Create account</button></div>
        ${mode === 'up' ? '<label class="mza__f"><span>Your name</span><input name="name" autocomplete="name" maxlength="80" required></label>' : ''}
        <label class="mza__f"><span>Email</span><input name="email" type="email" autocomplete="email" inputmode="email" required></label>
        <label class="mza__f"><span>Password</span><input name="password" type="password" autocomplete="${mode === 'up' ? 'new-password' : 'current-password'}" minlength="8" required${mode === 'up' ? ' placeholder="At least 8 characters"' : ''}></label>
        <button class="mza__submit" type="submit">${mode === 'up' ? 'Create my Yuriel account' : 'Sign in'}</button>
        ${mode === 'in' ? '<button type="button" class="mza__link mza__forgot">Forgot your password?</button>' : ''}
        <p class="mza__msg${isErr ? ' is-err' : note ? ' is-ok' : ''}" role="status" aria-live="polite">${note ? esc(note) : ''}</p>
      </form>
      <p class="mza__fine">Yuriel has its own secure sign-in. Your Yuriel account is never added to the church's member list, even when you connect your CCFC account. <a href="https://ccfczambia.org/privacy" target="_blank" rel="noopener">Privacy</a></p>`;
    const msg = $('.mza__msg', body), form = $('.mza__form', body);
    const say = (t, err) => { msg.className = 'mza__msg ' + (err ? 'is-err' : 'is-ok'); msg.textContent = t; };
    $('.mza__ccfc', body).addEventListener('click', e => ccfcContinue(e.currentTarget, msg));
    $$('.mza__prov', body).forEach(b => b.addEventListener('click', async () => { b.disabled = true; const { error } = await sb.auth.signInWithOAuth({ provider: b.dataset.p, options: { redirectTo: location.origin + '/?account=1' } }); if (error){ b.disabled = false; say(friendly(error), true); } }));
    $$('.mza__seg [data-m]', body).forEach(b => b.addEventListener('click', () => { if (mode === b.dataset.m) return; mode = b.dataset.m; renderLogin(); $('input', $('.mza__form', body)).focus(); }));
    form.addEventListener('submit', async e => { e.preventDefault(); const email = form.email.value.trim(), password = form.password.value, name = form.name ? form.name.value.trim() : '';
      if (mode === 'up' && !name){ say('Please add your name.', true); return; } if (!/^\S+@\S+\.\S+$/.test(email)){ say('Please enter a valid email address.', true); return; } if (password.length < 8){ say('Use at least 8 characters for your password.', true); return; }
      const sub = $('.mza__submit', form); sub.disabled = true; say(mode === 'up' ? 'Creating your account...' : 'Signing you in...');
      try {
        if (mode === 'up'){ const { data, error } = await sb.auth.signUp({ email, password, options: { data: { full_name: name }, emailRedirectTo: location.origin + '/?account=1' } }); if (error) throw error; if (!data.session){ say('Almost there. Check your inbox and tap the link to confirm your email.'); sub.disabled = false; return; } }
        else { const { error } = await sb.auth.signInWithPassword({ email, password }); if (error) throw error; }
      } catch (err){ say(friendly(err), true); sub.disabled = false; } });
    const forgot = $('.mza__forgot', body); if (forgot) forgot.addEventListener('click', async () => { const email = form.email.value.trim(); if (!/^\S+@\S+\.\S+$/.test(email)){ say('Type your email above first, then tap Forgot your password.', true); form.email.focus(); return; } const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin + '/?reset=1' }); say(error ? friendly(error) : 'We sent a reset link to your email.', !!error); });
  }

  /* ---- accounts centre ---- */
  const flash = t => { const n = $('.mzc__flash', body); if (n){ n.textContent = t; n.hidden = false; clearTimeout(flash.t); flash.t = setTimeout(() => { n.hidden = true; }, 4000); } };
  function renderCenter(note){
    if (!A.session){ renderLogin(); return; }
    const u = A.session.user, name = nameOf(), providers = (u.app_metadata && (u.app_metadata.providers || [u.app_metadata.provider])) || ['email'];
    const prov = p => ({ email: 'Email and password', google: 'Google', facebook: 'Facebook' }[p] || p);
    const kind = 'Yuriel account';
    const tabs = [['profile', 'Profile', I.user], ['ccfc', 'CCFC account', I.church], ['security', 'Sign-in', I.shield], ['data', 'Your data', I.db]];
    const local = api.list().filter(c => c.log && c.log.some(x => x.who === 'user')).length;
    const panes = {
      profile: `<form class="mzc__card mzc__profile" novalidate><h3>Profile</h3>
          <div class="mzc__photo">${av(name, photoOf(), 'mza-av--lg')}<div class="mzc__photo-opts">${A.ccfc && A.ccfc.avatar_url ? '<button type="button" class="mza__chip" data-photo="ccfc">Use my CCFC photo</button>' : ''}${meta().avatar_url || meta().picture ? '<button type="button" class="mza__chip" data-photo="provider">Use my ' + esc(prov(providers.find(p => p !== 'email') || 'account')) + ' photo</button>' : ''}${photoOf() ? '<button type="button" class="mza__chip" data-photo="none">Remove photo</button>' : ''}</div></div>
          <label class="mza__f"><span>Your name in Yuriel</span><input name="name" maxlength="80" value="${esc(name)}" autocomplete="name"></label>
          <label class="mza__f"><span>Email</span><input value="${esc(u.email || '')}" disabled></label>
          <div class="mzc__row"><button class="mza__submit" type="submit">Save</button></div></form>`,
      ccfc: A.ccfc
        ? `<div class="mzc__card"><h3>Connected CCFC account</h3>
            <div class="mzc__person">${av(A.ccfc.full_name, A.ccfc.avatar_url)}<div><b>${esc(A.ccfc.full_name || 'CCFC account')}</b><span>${esc(ROLE_LABEL[A.ccfc.role] || 'Member')} &middot; Christ Connect Family Church Zambia</span>${A.row && A.row.ccfc_linked_at ? `<small>Connected ${esc(new Date(A.row.ccfc_linked_at).toLocaleDateString([], { day: 'numeric', month: 'long', year: 'numeric' }))}</small>` : ''}</div></div>
            <ul class="mzc__list"><li>${I.check}Your church name and role show in Yuriel</li><li>${I.check}You can sign in to Yuriel with your CCFC account</li><li>${I.check}Your Yuriel conversations stay private to you; the church team cannot see them</li><li>${I.check}Yuriel stays separate from the church's member list</li></ul>
            <div class="mzc__row"><a class="mza__chip" href="${CCFC_ACCOUNT}" target="_blank" rel="noopener">${I.ext}Open my CCFC account</a><button type="button" class="mza__chip mza__chip--danger mzc__unlink">Disconnect</button></div><p class="mza__msg" role="status" aria-live="polite"></p></div>`
        : `<div class="mzc__card"><h3>Connect your CCFC account</h3>
            <p class="mzc__lead">Your Yuriel account is separate from the church. You can keep it that way, or connect the account you use on ccfczambia.org.</p>
            <ul class="mzc__list"><li>${I.check}Your church name and role show in Yuriel</li><li>${I.check}Sign in to Yuriel with your CCFC account</li><li>${I.check}Your Yuriel conversations stay private to you</li></ul>
            <div class="mzc__row"><button type="button" class="mza__submit mzc__link">${I.church}Connect my CCFC account</button></div><p class="mza__msg" role="status" aria-live="polite"></p></div>`,
      security: `<div class="mzc__card"><h3>How you sign in</h3><ul class="mzc__list">${providers.map(p => `<li>${p === 'google' ? GOOGLE_ICON : p === 'facebook' ? FB_ICON : I.shield}${esc(prov(p))}</li>`).join('')}${A.ccfc ? `<li>${I.church}Continue with CCFC (${esc(A.ccfc.full_name || 'your church account')})</li>` : ''}</ul></div>
          <form class="mzc__card mzc__pass" novalidate><h3>${providers.includes('email') ? 'Change password' : 'Add a password'}</h3>${providers.includes('email') ? '' : '<p class="mzc__lead">A password lets you also sign in with your email address.</p>'}
            <label class="mza__f"><span>New password</span><input name="p1" type="password" autocomplete="new-password" minlength="8" placeholder="At least 8 characters"></label>
            <label class="mza__f"><span>Repeat it</span><input name="p2" type="password" autocomplete="new-password"></label>
            <div class="mzc__row"><button class="mza__submit" type="submit">Save password</button></div><p class="mza__msg" role="status" aria-live="polite"></p></form>
          <div class="mzc__card"><h3>Sign out</h3><p class="mzc__lead">Signing out of Yuriel does not sign you out of the church websites.</p><div class="mzc__row"><button type="button" class="mza__chip mzc__out">Sign out</button><button type="button" class="mza__chip mzc__out" data-clear>Sign out and clear this device</button></div></div>`,
      data: `<div class="mzc__card"><h3>Sync</h3><label class="mzc__toggle"><input type="checkbox" class="mzc__sync" ${A.row && A.row.sync ? 'checked' : ''}><span><b>Save my conversations and reading plans to my account</b><small>${local} conversation${local === 1 ? '' : 's'} on this device. Only you can see them.</small></span></label></div>
          <div class="mzc__card"><h3>Your Yuriel data</h3><div class="mzc__row"><button type="button" class="mza__chip mzc__export">${I.down}Download my data</button><button type="button" class="mza__chip mzc__wipe">${I.trash}Delete all conversations</button></div><p class="mza__msg" role="status" aria-live="polite"></p></div>
          <div class="mzc__card mzc__danger"><h3>Delete account</h3><p class="mzc__lead">Deletes your Yuriel account with its conversations and reading plans. This cannot be undone. ${A.ccfc ? 'Your CCFC church account is not affected.' : ''}</p><div class="mzc__row"><button type="button" class="mza__chip mza__chip--danger mzc__delete">Delete my Yuriel account</button></div></div>`,
    };
    body.innerHTML = `<div class="mzc">
      <header class="mzc__head">${av(name, photoOf(), 'mza-av--lg')}<div class="mzc__who"><h2>${esc(name || 'Your account')}</h2><p>${esc(u.email || '')}</p><div class="mzc__badges"><span class="mzc__badge">${kind}</span>${A.ccfc ? `<span class="mzc__badge mzc__badge--ok">${I.check}Connected to CCFC</span>` : ''}${A.row && A.row.sync ? `<span class="mzc__badge">${I.check}Synced</span>` : ''}</div></div></header>
      <p class="mzc__flash mza__msg is-ok" role="status" ${note ? '' : 'hidden'}>${note ? esc(note) : ''}</p>
      <nav class="mzc__tabs" role="tablist" aria-label="Account sections">${tabs.map(([k, l, ic]) => `<button type="button" role="tab" data-ct="${k}" aria-selected="${centerTab === k}">${ic}<span>${l}</span></button>`).join('')}</nav>
      <div class="mzc__pane" role="tabpanel">${panes[centerTab] || panes.profile}</div></div>`;
    $$('[data-ct]', body).forEach(b => b.addEventListener('click', () => { centerTab = b.dataset.ct; renderCenter(); }));
    const say = (el, t, err) => { if (!el) return; el.className = 'mza__msg ' + (err ? 'is-err' : 'is-ok'); el.textContent = t; };
    const pf = $('.mzc__profile', body);
    if (pf){
      pf.addEventListener('submit', async e => { e.preventDefault(); const display_name = pf.name.value.trim().slice(0, 80); if (!display_name) return; const { error } = await sb.from('mazar_accounts').update({ display_name }).eq('user_id', u.id); if (error){ flash(friendly(error)); return; } A.row = { ...(A.row || {}), display_name }; paint(); flash('Saved.'); });
      $$('[data-photo]', pf).forEach(b => b.addEventListener('click', async () => { const k = b.dataset.photo; const avatar_url = k === 'ccfc' ? A.ccfc.avatar_url : k === 'provider' ? (meta().avatar_url || meta().picture) : null; const { error } = await sb.from('mazar_accounts').update({ avatar_url: avatar_url && /^https:\/\//.test(avatar_url) ? avatar_url : null }).eq('user_id', u.id); if (error){ flash(friendly(error)); return; } A.row = { ...(A.row || {}), avatar_url }; paint(); flash('Photo updated.'); }));
    }
    const link = $('.mzc__link', body); if (link) link.addEventListener('click', () => ccfcConnect(link, $('.mza__msg', link.closest('.mzc__card'))));
    const unlink = $('.mzc__unlink', body); if (unlink) unlink.addEventListener('click', async () => { if (!await sure(w, { title: 'Disconnect your CCFC account from Yuriel?', body: 'Your church name and role will no longer show in Yuriel. You can connect it again any time.', ok: 'Disconnect', danger: true, icon: 'church', from: unlink })) return; try { await fn('unlink'); await refresh(true); flash('Disconnected.'); } catch (e){ say($('.mza__msg', unlink.closest('.mzc__card')), friendly(e), true); } });
    const pass = $('.mzc__pass', body); if (pass) pass.addEventListener('submit', async e => { e.preventDefault(); const out = $('.mza__msg', pass); if (pass.p1.value.length < 8){ say(out, 'Use at least 8 characters.', true); return; } if (pass.p1.value !== pass.p2.value){ say(out, 'The two passwords do not match.', true); return; } const { error } = await sb.auth.updateUser({ password: pass.p1.value }); if (error){ say(out, friendly(error), true); return; } pass.reset(); say(out, 'Password saved.'); });
    $$('.mzc__out', body).forEach(b => b.addEventListener('click', async () => { const clear = b.hasAttribute('data-clear'); await sb.auth.signOut({ scope: 'local' }); if (clear){ ls.del(PLANS_KEY); api.replace([]); } closeM(); }));
    const sync = $('.mzc__sync', body); if (sync) sync.addEventListener('change', async () => { const { error } = await sb.from('mazar_accounts').update({ sync: sync.checked }).eq('user_id', u.id); if (error){ sync.checked = !sync.checked; flash(friendly(error)); return; } A.row = { ...(A.row || {}), sync: sync.checked }; if (sync.checked) await syncPull(); paint(); flash(sync.checked ? 'Your conversations will be saved to your account.' : 'Sync is off. New conversations stay on this device.'); });
    const exp = $('.mzc__export', body); if (exp) exp.addEventListener('click', async () => { const { data } = await sb.from('mazar_conversations').select('id, title, data, updated_at').order('updated_at', { ascending: false }); const blob = new Blob([JSON.stringify({ exported: new Date().toISOString(), account: { name: nameOf(), email: u.email, type: kind, connected_to_ccfc: !!A.ccfc }, conversations_saved: data || [], conversations_on_this_device: api.list(), reading_plans: ls.get(PLANS_KEY, []) }, null, 2)], { type: 'application/json' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'mazar-data.json'; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000); });
    const wipe = $('.mzc__wipe', body); if (wipe) wipe.addEventListener('click', async () => { if (!await sure(w, { title: 'Delete all your Yuriel conversations?', body: 'Every conversation will be removed from this device and from your account. This cannot be undone.', ok: 'Delete all', danger: true, from: wipe })) return; const { error } = await sb.from('mazar_conversations').delete().eq('user_id', u.id); if (error){ say($('.mza__msg', wipe.closest('.mzc__card')), friendly(error), true); return; } synced.clear(); api.replace([]); say($('.mza__msg', wipe.closest('.mzc__card')), 'All conversations deleted.'); });
    const del = $('.mzc__delete', body); if (del) del.addEventListener('click', async () => { if (!await sure(w, { title: 'Delete your Yuriel account?', body: `Your Yuriel account, conversations and reading plans will be deleted. This cannot be undone.${A.ccfc ? ' Your CCFC church account is not affected.' : ''}`, ok: 'Delete my account', danger: true, icon: 'user', from: del })) return; del.disabled = true; try { const r = await fn('delete'); await sb.auth.signOut({ scope: 'local' }); ls.del(PLANS_KEY); api.replace([]); closeM(); sure(w, r.deleted === 'account' ? { title: 'Your Yuriel account has been deleted', body: 'Thank you for spending time with Yuriel. You are welcome back any time.', ok: 'Close', cancel: false } : { title: 'Done', ok: 'Close', cancel: false }); } catch (e){ del.disabled = false; flash(friendly(e)); } });
  }

  /* ---- state ---- */
  function paint(){
    const signed = !!A.session, name = nameOf();
    $$('.mz__acct', w).forEach(b => { b.innerHTML = signed ? `${av(name, photoOf())}<span class="mz__acct-t"><b>${esc(name || 'Your account')}</b><small>${A.ccfc ? 'Connected to CCFC' : A.row && A.row.sync ? 'Saved to your account' : 'Yuriel account'}</small></span>${I.menu}` : `<span class="mza-av">${I.user}</span><span class="mz__acct-t"><b>Sign in</b><small>Keep your conversations on every device</small></span>`; b.setAttribute('aria-label', signed ? 'Your Yuriel account' : 'Sign in to Yuriel'); });
    $$('.mz__me', w).forEach(b => { b.innerHTML = signed ? av(name, photoOf(), 'mza-av--sm') : I.user; b.setAttribute('aria-label', signed ? 'Your Yuriel account' : 'Sign in to Yuriel'); b.title = b.getAttribute('aria-label'); });
    window.__mazarWho = signed && name && !/\b(church|ministr\w*|fellowship|ccfc|zambia|admin\w*|office|team|mazar|yuriel)\b/i.test(name) ? { name: name.split(' ')[0] } : null;   /* an account named after the church is not a first name ("Christ, here they are") */
    if (!m.hidden) (signed ? renderCenter : renderLogin)();
  }
  let loading = null;
  async function load(){
    if (!A.session){ A.row = A.ccfc = null; paint(); return; }
    const { data: row, error } = await sb.rpc('mazar_ensure_account'); if (error) console.warn('mazar account', error.message);
    A.row = row || null;
    A.ccfc = A.row && A.row.ccfc_user_id ? { full_name: A.row.ccfc_name || '', role: A.row.ccfc_role || 'member', avatar_url: A.row.ccfc_avatar_url || null, email: A.row.ccfc_email || '' } : null;
    paint(); if (A.row && A.row.sync) await syncPull();
    /* keep the church name, role and photo current while the church account is signed in on this device */
    const c = ccfcCookieSession();
    if (A.ccfc && freshCcfc(c) && c.user && c.user.id === A.row.ccfc_user_id) fn('link', { ccfc_token: c.access_token }).then(({ linked }) => { if (linked && ['full_name', 'role', 'avatar_url'].some(k => (linked[k] || null) !== (A.ccfc[k] || null))){ A.ccfc = { ...A.ccfc, ...linked }; paint(); } }).catch(() => {});
  }
  const refresh = force => { if (force) loading = null; return (loading = loading || load().finally(() => { loading = null; })); };
  sb.auth.onAuthStateChange((ev, session) => {
    A.session = session; if (ev === 'TOKEN_REFRESHED') return;
    setTimeout(async () => {
      if (!session){ A.row = A.ccfc = null; synced.clear(); paint(); return; }
      if (ev === 'PASSWORD_RECOVERY'){ centerTab = 'security'; openM('center'); renderCenter('Choose a new password below.'); }
      if (ev === 'SIGNED_IN' || ev === 'INITIAL_SESSION' || ev === 'USER_UPDATED'){ await refresh(); if (ev === 'SIGNED_IN' && !m.hidden && m.querySelector('.mza__hero')) renderCenter(`Welcome${nameOf() ? ', ' + nameOf().split(' ')[0] : ''}. You're signed in.`); if (wantCenter){ wantCenter = false; openM('center'); } }
    }, 0);
  });
  paint();
  if (location.hostname === 'localhost') w._acctDebug = { A, openM, paint, renderCenter, setTab: t => { centerTab = t; } };   /* local previews only: layout checks without a real account */

  /* ---- sync: conversations and reading plans ---- */
  const synced = new Map(); let pushT = null, suppress = false, lastPlans = '';
  async function syncPull(){
    if (!A.session) return;
    const { data, error } = await sb.from('mazar_conversations').select('id, title, data, updated_at').order('updated_at', { ascending: false }).limit(80);
    if (error){ console.warn('mazar sync', error.message); return; }
    const byId = new Map(api.list().map(c => [c.id, c])); let changed = false;
    for (const r of data || []){ const t = +new Date(r.updated_at); synced.set(r.id, t); const cur = byId.get(r.id); if (!cur || (cur.t || 0) < t - 1000){ byId.set(r.id, { id: r.id, title: r.title || 'Conversation', t, log: (r.data && r.data.log) || [], history: (r.data && r.data.history) || [], tab: 'ask' }); changed = true; } }
    if (changed) api.replace([...byId.values()].sort((a, b) => (b.t || 0) - (a.t || 0)));
    const rp = A.row && A.row.data && A.row.data.plans, lp = ls.get(PLANS_KEY, []) || [];
    if (Array.isArray(rp)){ const map = new Map(); [...rp, ...lp].forEach(p => { const k = String(p.id); const e = map.get(k); if (!e || (p.done || []).length > (e.done || []).length) map.set(k, p); }); const merged = [...map.values()].slice(0, 8); lastPlans = JSON.stringify(rp); suppress = true; ls.set(PLANS_KEY, merged); suppress = false; }
    queuePush(true);
  }
  const queuePush = now => { clearTimeout(pushT); pushT = setTimeout(push, now ? 60 : 1500); };
  async function push(){
    if (!A.session || !A.row || !A.row.sync) return;
    const uid = A.session.user.id;
    const rows = api.list().filter(c => c.log && c.log.some(x => x.who === 'user') && synced.get(c.id) !== c.t).slice(0, 40)
      .map(c => ({ user_id: uid, id: String(c.id).slice(0, 40), title: String(c.title || '').slice(0, 120), data: { log: c.log.slice(-60).map(({ who, text, go, actions, files }) => ({ who, text, go, actions, files: files && files.map(({ kind, name }) => ({ kind, name })) })), history: (c.history || []).slice(-24).map(({ role, content }) => ({ role, content })) }, updated_at: new Date(c.t || Date.now()).toISOString() }));
    if (rows.length){ const { error } = await sb.from('mazar_conversations').upsert(rows, { onConflict: 'user_id,id' }); if (error) console.warn('mazar sync', error.message); else rows.forEach(r => synced.set(r.id, +new Date(r.updated_at))); }
    const plans = ls.get(PLANS_KEY, []) || [], pj = JSON.stringify(plans);
    if (pj !== lastPlans){ const data = { ...((A.row && A.row.data) || {}), plans }; const { error } = await sb.from('mazar_accounts').update({ data }).eq('user_id', uid); if (!error){ lastPlans = pj; A.row.data = data; } }
  }
  ls.onset = k => { if (!suppress && (k === CONVOS_KEY || k === PLANS_KEY) && A.session && A.row && A.row.sync) queuePush(); };
  w._mzDel = id => { if (A.session && A.row && A.row.sync) sb.from('mazar_conversations').delete().eq('id', id).then(() => synced.delete(id)); };
  w._mzSynced = () => !!(A.session && A.row && A.row.sync);
}

/* ================================================================ app ================================================================ */
function app(){
  const STUDIO = MODE === 'studio', PAGE = MODE === 'page', FLOAT = MODE === 'widget';
  const host = PAGE ? ($(OPT.target || '#mazar-page') || document.body) : STUDIO ? ($(OPT.target || '#mazar') || document.body) : document.body;
  const w = document.createElement('div'); w.className = 'mz mz--' + MODE; w.dataset.theme = THEME;
  const TABS = [['ask','Ask',I.chat],['bible','Bible',I.book],['today','Today',I.sun],['tasks','Tasks',I.spark]]; if (STUDIO) TABS.splice(3, 0, ['study','Study',I.study]);
  const fine = 'Yuriel is an AI and can make mistakes. Check anything important with the Bible and with the church office.';
  w.innerHTML = `
  ${FLOAT ? `<div class="mz__nudge" hidden><button class="mz__nudge-x" aria-label="Dismiss">&times;</button><b>Hi, I'm Yuriel.</b><span>${esc(PER_SITE.nudge)}</span></div>
  <button class="mz__fab" aria-label="Open Yuriel, the AI Bible companion" aria-expanded="false"><span class="mz__fab-orb"><span class="mz__fab-fig"><canvas></canvas></span><i class="mz__fab-x">${I.close}</i></span><span class="mz__fab-label">Ask Yuriel</span></button>` : ''}
  <section class="mz__panel" ${FLOAT ? 'hidden' : ''} role="${FLOAT ? 'dialog' : 'region'}" aria-label="Yuriel, the AI Bible companion">
    <div class="mz__sky" aria-hidden="true"><canvas class="mz__skycv"></canvas></div>
    ${STUDIO ? `<aside class="mz__side"><div class="mz__side-top"><a class="mz__brand" href="/">${markSvg()}<b>Yuriel</b><small>by CCFC Zambia</small></a><button class="mz__btn mz__side-x" type="button" aria-label="Close menu">${I.close}</button></div>
      <button class="mz__newchat" type="button">${I.plus}<span>New conversation</span></button>
      <nav class="mz__convos" aria-label="Conversations"></nav>
      <div class="mz__side-bottom"><button class="mz__acct" type="button" aria-label="Sign in to Yuriel"></button><a class="mz__side-link" href="https://ccfczambia.org" target="_blank" rel="noopener">${I.ext}<span>Christ Connect Family Church</span></a><a class="mz__side-link" href="https://ccfczambia.org/library" target="_blank" rel="noopener">${I.book}<span>Upper Room library</span></a></div></aside>` : ''}
    <div class="mz__main">
      <header class="mz__head">
        ${STUDIO ? `<button class="mz__btn mz__menu" type="button" aria-label="Open menu">${I.menu}</button>` : ''}<button class="mz__btn mz__rail" type="button" aria-label="Collapse sidebar" title="Collapse sidebar" aria-expanded="true">${I.rail}</button>
        <span class="mz__id">${markSvg()}<span><b>Yuriel${STUDIO ? '' : ''}</b><small><i class="mz__live"></i>${STUDIO ? 'AI Bible companion' : 'AI companion &middot; ' + esc(PER_SITE.name)}</small></span></span>
        <span class="mz__tools">${STUDIO ? `<button class="mz__btn mz__me" type="button" aria-label="Sign in to Yuriel" title="Sign in to Yuriel">${I.user}</button>` : `<a class="mz__btn mz__open" href="${STUDIO_URL}" target="_blank" rel="noopener" aria-label="Open the full Yuriel platform" title="Open the full Yuriel platform">${I.ext}</a>`}<button class="mz__btn mz__new" type="button" aria-label="New conversation" title="New conversation">${I.plus}</button>${FLOAT ? `<button class="mz__btn mz__size" type="button" aria-label="Expand" title="Expand">${I.expand}</button><button class="mz__btn mz__close" type="button" aria-label="Close">${I.close}</button>` : ''}</span>
      </header>
      <nav class="mz__tabs" role="tablist" aria-label="Yuriel">${TABS.map(([k,l,ic]) => `<button role="tab" type="button" data-tab="${k}" aria-selected="false">${ic}<span>${l}</span></button>`).join('')}<i class="mz__tabline" aria-hidden="true"></i></nav>
      <div class="mz__views"><div class="mz__bgfig" aria-hidden="true"><canvas></canvas></div>
        <div class="mz__view mz__view--ask" data-view="ask" role="tabpanel">
          <div class="mz__log" aria-live="polite"><div class="mz__stage" aria-hidden="true"></div></div>
          <div class="mz__sugg">${(PER_SITE.suggest || []).map((s, i) => `<button type="button" style="--i:${i}">${esc(s)}</button>`).join('')}</div>
          <form class="mz__form">${STUDIO ? `<div class="mz__atts" hidden></div><button class="mz__attach" type="button" aria-label="Attach images or documents" title="Attach images, PDFs or documents">${I.clip}</button><input class="mz__file" type="file" multiple hidden accept="image/*,.pdf,.docx,.txt,.md,.markdown,.csv,.json,.html,.htm,.srt,.vtt">` : ''}<textarea name="q" rows="1" autocomplete="off" placeholder="${esc(PER_SITE.placeholder)}" aria-label="Message Yuriel" maxlength="2000"></textarea><button class="mz__send" type="submit" aria-label="Send">${I.send}</button></form>
        </div>
        <div class="mz__view mz__view--bible" data-view="bible" role="tabpanel" hidden>
          <div class="mz__bnav"><button class="mz__bbtn mz__bbook" type="button" aria-haspopup="dialog"><b>John 3</b>${I.down}</button><button class="mz__bbtn mz__bver" type="button" aria-haspopup="dialog"><b>WEB</b>${I.down}</button><span class="mz__bsp"></span><button class="mz__btn mz__bprev" type="button" aria-label="Previous chapter">${I.prev}</button><button class="mz__btn mz__bnext" type="button" aria-label="Next chapter">${I.next}</button></div>
          <article class="mz__scroll" aria-live="polite"><div class="mz__loading"><i></i><i></i><i></i></div></article>
          <div class="mz__vsheet" hidden><b class="mz__vsheet-ref"></b><div class="mz-card__row"><button type="button" class="mz-chip mz-chip--gold" data-vs="explain">${I.spark}Explain</button><button type="button" class="mz-chip" data-vs="copy">${I.copy}Copy</button><button type="button" class="mz-chip" data-vs="image">${I.img}Share image</button><button type="button" class="mz-chip" data-vs="compare">${I.cross}Compare</button><button type="button" class="mz-chip mz__vs-tr" data-vs="translate">${I.lang}Translate</button><button type="button" class="mz-chip" data-vs="clear">${I.close}</button></div></div>
          <div class="mz__picker" hidden role="dialog" aria-label="Choose a passage or version"></div>
        </div>
        <div class="mz__view mz__view--today" data-view="today" role="tabpanel" hidden><div class="mz__todayin"></div></div>
        ${STUDIO ? `<div class="mz__view mz__view--study" data-view="study" role="tabpanel" hidden>
          <p class="mz__lead">Pick a passage or book, then choose how you want to study it. Yuriel teaches in line with the historic evangelical faith held by CCFC.</p>
          <form class="mz__ref mz__ref--study"><input name="ref" autocomplete="off" placeholder="Passage or book, for example Romans 8 or Jonah" aria-label="Passage to study" maxlength="60" list="mz-books"></form><datalist id="mz-books">${BOOKS.map(b => `<option value="${b} 1">`).join('')}</datalist>
          <div class="mz__tasks">${STUDY.map(([ic, t, s, p], i) => `<button type="button" class="mz__task" style="--i:${i}" data-prompt="${esc(p)}"><span class="mz__task-ico">${I[ic]}</span><b>${esc(t)}</b><small>${esc(s)}</small></button>`).join('')}</div>
          <section class="mz__doctrine"><h4>What CCFC believes</h4>${DOCTRINE.map(([h, b, r]) => `<details><summary><b>${esc(h)}</b><small>${esc(r)}</small></summary><p>${esc(b)}</p><button type="button" class="mz-chip" data-ask="Explain this CCFC belief with Scripture: ${esc(h)}. ${esc(b)}">${I.spark}Explain with Yuriel</button></details>`).join('')}</section>
        </div>` : ''}
        <div class="mz__view mz__view--tasks" data-view="tasks" role="tabpanel" hidden>
          <p class="mz__lead">Yuriel's agents take care of small jobs. They prepare everything; you check it and press the final button.</p>
          <div class="mz__tasks">${TASKS.map(([ic, t, s, p], i) => `<button type="button" class="mz__task" style="--i:${i}" data-prompt="${esc(p)}"><span class="mz__task-ico">${I[ic]}</span><b>${esc(t)}</b><small>${esc(s)}</small></button>`).join('')}</div>
        </div>
      </div>
      <p class="mz__fine">${fine}</p>
    </div>
  </section>`;
  host.appendChild(w);

  const fab = $('.mz__fab', w), panel = $('.mz__panel', w), log = $('.mz__log', w), form = $('.mz__form', w), input = $('textarea', form), nudge = $('.mz__nudge', w), stage = $('.mz__stage', w);
  const bgHost = $('.mz__bgfig', w);
  const fig = new Figure($('canvas', bgHost), bgHost, { bg: true, pointer: panel, cy: FLOAT ? .42 : .45 });
  const fabFig = fab ? new Figure($('.mz__fab-fig canvas', fab), $('.mz__fab-fig', fab), { lite: true }) : null;
  new Sky($('.mz__skycv', w), panel, fig, { lite: FLOAT });
  const fitStage = () => { if (w.classList.contains('has-history')){ stage.style.height = ''; return; } const lr = log.getBoundingClientRect(), vr = bgHost.getBoundingClientRect(); if (!vr.height || !lr.height) return; const want = (vr.top - lr.top) + log.scrollTop + fig.cy + fig.S * .21; stage.style.height = Math.round(Math.max(110, Math.min(want, vr.height - 240))) + 'px'; };
  new ResizeObserver(() => requestAnimationFrame(fitStage)).observe(bgHost);
  const figs = [fig, fabFig].filter(Boolean);
  const mood = s => figs.forEach(f => f.set(s));
  const col = () => themeColors(w);

  /* ---- conversations ---- */
  let convos = STUDIO ? loadPlansSafe(CONVOS_KEY) : null;
  /* saved conversations are repaired on load, so one damaged entry can never stop Mazar from starting */
  function loadPlansSafe(k){ const v = ls.get(k, []); return (Array.isArray(v) ? v : []).filter(c => c && typeof c === 'object' && c.id).map(c => ({ ...c, title: String(c.title || 'Conversation'), t: +c.t || Date.now(), log: Array.isArray(c.log) ? c.log.filter(m => m && typeof m.text === 'string') : [], history: Array.isArray(c.history) ? c.history.filter(m => m && typeof m.content === 'string') : [] })).filter((c, i, a) => a.findIndex(x => x.id === c.id) === i); }
  const saved = STUDIO ? (convos[0] || null) : mem.load();
  /* studio: state IS the open conversation's own object inside convos. Switching points state at another stored object and
     never copies into or clears one, so every closure that reads state (persist, add, history, the account sync) follows along. */
  let state = STUDIO ? (saved || newConvo()) : (saved || { log: [], history: [], open: false });
  if (STUDIO && !saved) convos.unshift(state);
  function newConvo(){ return { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), title: 'New conversation', t: Date.now(), log: [], history: [], tab: 'ask' }; }
  /* quiet saves (a tab change) are not activity: they keep the conversation's time and place in the list */
  const persist = quiet => { if (STUDIO){ if (!quiet){ state.t = Date.now(); const i = convos.indexOf(state); if (i > 0){ convos.splice(i, 1); convos.unshift(state); } } state.log = state.log.slice(-60); state.history = state.history.slice(-24); ls.set(CONVOS_KEY, convos.slice(0, 40)); renderConvos(); } else mem.save(state); };
  const history = () => state.history;

  const renderConvos = () => { const nav = $('.mz__convos', w); if (!nav) return; const groups = [['Today', 0], ['Yesterday', 1], ['Earlier', 99]]; const day = t => Math.floor((Date.now() - new Date(t).setHours(0,0,0,0)) / 864e5);
    nav.innerHTML = groups.map(([label, d]) => { const rows = convos.filter(c => (d === 99 ? day(c.t) > 1 : day(c.t) === d)); return rows.length ? `<h5>${label}</h5>` + rows.map(c => `<div class="mz__convo ${c.id === state.id ? 'is-on' : ''}" data-id="${esc(c.id)}"><button type="button" class="mz__convo-open"${c.id === state.id ? ' aria-current="true"' : ''}>${esc(c.title)}</button><button type="button" class="mz__convo-del" aria-label="Delete conversation: ${esc(c.title)}" title="Delete conversation">${I.trash}</button></div>`).join('') : ''; }).join('') || '<p class="mz__side-empty">Your conversations will appear here.</p>'; };
  const switchConvo = id => { const found = convos.find(x => x.id === id); if (!found) return; if (found === state){ setTab('ask'); renderConvos(); closeSide(); return; }
    const pi = convos.indexOf(state); if (pi >= 0 && state.id !== found.id && !state.log.some(m => m.who === 'user')) convos.splice(pi, 1);   /* a new conversation left without a word from the person is not kept */
    state = found; log.querySelectorAll('.mz-msg').forEach(n => n.remove()); w.classList.toggle('has-history', state.log.some(m => m.who === 'user')); requestAnimationFrame(fitStage); state.log.forEach(m => add(m.who, m.text, m.go, m.actions, true, m.files)); if (!state.log.length) add('bot', PER_SITE.greet); setTab('ask'); renderConvos(); closeSide(); };
  if (STUDIO){ $('.mz__convos', w).addEventListener('click', async e => { const row = e.target.closest('.mz__convo'); if (!row) return; const id = row.dataset.id, delB = e.target.closest('.mz__convo-del');
      if (delB){ if (!await sure(w, { title: 'Delete this conversation?', body: w._mzSynced && w._mzSynced() ? 'It will be removed from this device and from your account.' : 'It will be removed from this device.', ok: 'Delete', danger: true, from: delB })) return;
        convos = convos.filter(c => c.id !== id); if (w._mzDel) w._mzDel(id); if (id === state.id){ const n = newConvo(); convos.unshift(n); switchConvo(n.id); } ls.set(CONVOS_KEY, convos.slice(0, 40)); renderConvos();
        const nx = $('.mz__convo.is-on .mz__convo-open', w) || $('.mz__newchat', w); if (nx && (innerWidth > 900 || w.classList.contains('is-side'))) nx.focus({ preventScroll: true }); return; }
      switchConvo(id); });
    const startNew = () => { if (!state.log.some(m => m.who === 'user')){ setTab('ask', true); closeSide(); return; } const n = newConvo(); convos.unshift(n); switchConvo(n.id); input.focus(); };
    $('.mz__newchat', w).addEventListener('click', startNew);
    const openSide = () => w.classList.add('is-side'); const closeSide = () => w.classList.remove('is-side');
    $('.mz__menu', w).addEventListener('click', openSide); $('.mz__side-x', w).addEventListener('click', closeSide); w.addEventListener('click', e => { if (e.target === panel && w.classList.contains('is-side')) closeSide(); });
    w.closeSide = closeSide; }
  function closeSide(){ if (w.closeSide) w.closeSide(); }

  /* ---- retractable sidebar (wide layouts): conversations and the tab rail fold away ---- */
  const RAIL_KEY = 'mazar:rail:' + MODE;
  const setRail = on => { w.classList.toggle('is-rail', on); const b = $('.mz__rail', w); const l = on ? 'Expand sidebar' : 'Collapse sidebar'; b.setAttribute('aria-label', l); b.title = l; b.setAttribute('aria-expanded', String(!on)); ls.set(RAIL_KEY, on); clearTimeout(setRail.t); setRail.t = setTimeout(() => { setTab(state.tab || 'ask'); fig.resize(); }, 480); };
  $('.mz__rail', w).addEventListener('click', () => setRail(!w.classList.contains('is-rail')));
  if (ls.get(RAIL_KEY, false)) w.classList.add('is-rail');

  /* ---- tabs ---- */
  const setTab = (k, focus) => { if (!$(`.mz__tabs [data-tab="${k}"]`, w)) k = 'ask'; state.tab = k; persist(true); $$('.mz__tabs [role=tab]', w).forEach(b => { const on = b.dataset.tab === k; b.setAttribute('aria-selected', on); b.tabIndex = on ? 0 : -1; if (on){ const line = $('.mz__tabline', w); line.style.transform = `translateX(${b.offsetLeft}px)`; line.style.width = b.offsetWidth + 'px'; } });
    $$('.mz__view', w).forEach(v => { v.hidden = v.dataset.view !== k; }); if (k === 'today') renderToday(); if (k === 'bible' && w._rd && !w._rd.loaded && !w._rd.loading) showChapter(); w.dataset.tab = k; if (k === 'ask'){ log.scrollTop = log.scrollHeight; fig.resize(); requestAnimationFrame(fitStage); if (focus) input.focus({ preventScroll: true }); } };
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
    if (a.type === 'sources') return `<div class="mz-card mz-card--wide mz-src"><div><span class="mz-card__k">${esc(a.site || 'Sources')}</span><ul>${(a.items || []).slice(0, 5).map(x => `<li><a href="${esc(x.url)}" target="_blank" rel="noopener"><span>${esc(x.title)}</span>${I.ext}</a>${x.date ? `<small>${esc(String(x.date).slice(0, 4))}</small>` : ''}</li>`).join('')}</ul></div></div>`;
    return '';
  };
  const add = (who, text, go, actions, restored, files) => { const el = document.createElement('div'); el.className = 'mz-msg is-' + who + (restored ? ' is-restored' : '');
    if (!restored){ state.log.push({ who, text, go, actions, ...(files && files.length ? { files } : {}) }); if (STUDIO && who === 'user' && state.title === 'New conversation'){ const tt = text || (files && files[0] ? files[0].name : 'Attachment'); state.title = tt.slice(0, 48) + (tt.length > 48 ? '…' : ''); } persist(); }
    const fl = files && files.length ? `<div class="mz-msg__files">${files.map(f => f.thumb ? `<img src="${esc(f.thumb)}" alt="${esc(f.name)}" title="${esc(f.name)}">` : `<span class="mz-att mz-att--sent">${I.file}<b>${esc(f.name)}</b></span>`).join('')}</div>` : '';
    el.innerHTML = who === 'bot' ? `<span class="mz-msg__mark">${markSvg()}</span><div class="mz-msg__body"><div class="mz-rich">${rich(text)}</div>${(actions || []).map(cardHtml).join('')}${go ? `<a class="mz-go" href="${esc(go[0])}" data-mz-go>${esc(go[1])} ${I.arrow}</a>` : ''}</div>` : `<div class="mz-msg__col">${fl}${text ? `<div class="mz-msg__body">${esc(text)}</div>` : ''}</div>`;
    log.appendChild(el);
    if (who === 'bot' && !restored && !RM){ const extras = $$('.mz-card, .mz-go', el); extras.forEach(x => x.classList.add('is-wait')); mood('speak');
      typeOut($('.mz-rich', el), k => { if (k % 3 === 0) figs.forEach(f => f.pulse()); log.scrollTop = log.scrollHeight; }, () => { extras.forEach((x, i) => setTimeout(() => x.classList.remove('is-wait'), 120 * i)); if (extras.length) figs.forEach(f => f.joy()); setTimeout(() => mood('idle'), 600); }); }
    log.scrollTo({ top: log.scrollHeight, behavior: RM || restored ? 'auto' : 'smooth' }); return el; };
  const thinking = () => { const el = document.createElement('div'); el.className = 'mz-msg is-bot is-thinking'; el.innerHTML = `<span class="mz-msg__mark">${markSvg()}</span><div class="mz-msg__body"><span class="mz-think"><i></i><i></i><i></i></span><small>Yuriel is thinking</small></div>`; log.appendChild(el); log.scrollTop = log.scrollHeight; return el; };

  /* ---- open, close, expand (widget) ---- */
  const hideNudge = () => { if (!nudge) return; nudge.hidden = true; try { sessionStorage.setItem('mazar:nudged', '1'); } catch (e){} };
  const setExpanded = on => { if (!FLOAT) return; state.big = on; persist(); w.classList.toggle('is-big', on); const b = $('.mz__size', w); b.innerHTML = on ? I.shrink : I.expand; b.setAttribute('aria-label', on ? 'Make smaller' : 'Expand'); b.title = on ? 'Make smaller' : 'Expand'; document.documentElement.classList.toggle('mz-lock', on && innerWidth > 640); setTimeout(() => { setTab(state.tab || 'ask'); fig.resize(); }, 30); };
  const open = (on, quiet) => { if (!FLOAT) return; clearTimeout(open.closing); fab.setAttribute('aria-expanded', on); w.classList.toggle('is-open', on); hideNudge(); state.open = on; persist();
    if (on){ panel.hidden = false; void panel.offsetWidth; panel.classList.add('is-in'); setTab(state.tab || 'ask', !quiet); if (!log.querySelector('.mz-msg')) add('bot', PER_SITE.greet); fig.resize(); }
    else { panel.classList.remove('is-in'); document.documentElement.classList.remove('mz-lock'); if (w.classList.contains('is-big')){ w.classList.remove('is-big'); state.big = false; persist(); const sb = $('.mz__size', w); sb.innerHTML = I.expand; sb.setAttribute('aria-label', 'Expand'); sb.title = 'Expand'; } open.closing = setTimeout(() => { panel.hidden = true; }, RM ? 0 : 360); if (!quiet) fab.focus({ preventScroll: true }); } };
  if (FLOAT){
    fab.addEventListener('click', () => open(panel.hidden || !panel.classList.contains('is-in')));
    $('.mz__close', w).addEventListener('click', () => open(false));
    $('.mz__size', w).addEventListener('click', () => setExpanded(!w.classList.contains('is-big')));
    $('.mz__nudge-x', w).addEventListener('click', e => { e.stopPropagation(); hideNudge(); }); nudge.addEventListener('click', () => open(true));
    addEventListener('keydown', e => { if (e.key === 'Escape' && !panel.hidden) open(false); });
    w.addEventListener('click', e => { if (e.target === w && w.classList.contains('is-big')) open(false); });
    document.addEventListener('click', e => { const path = e.composedPath ? e.composedPath() : [e.target]; if (!panel.hidden && !w.classList.contains('is-big') && !path.includes(w) && e.target.isConnected && !e.target.closest('[data-mazar],[data-ozer]') && innerWidth > 640) open(false); });
  }
  document.addEventListener('click', e => { const t = e.target.closest('[data-mazar],[data-ozer]'); if (!t) return; e.preventDefault(); const closer = $('.drawer.is-open .drawer__close, .menu.is-open .menu__close, .is-menu-open .menu__close'); if (closer) closer.click(); if (FLOAT){ if (innerWidth > 900) setExpanded(true); open(true); } const tab = t.dataset.mazar || t.dataset.ozer; if (tab) setTab(tab, true); else if (!FLOAT){ input.focus(); w.scrollIntoView({ behavior: 'smooth', block: 'start' }); } });

  /* ---- ask ---- */
  const queue = [];
  const ask = async q => { if (w.classList.contains('is-busy')){ if (q && queue[queue.length - 1] !== q && queue.length < 3){ queue.push(q); figs.forEach(f => f.pulse()); } return; } setTab('ask');
    const sent = STUDIO ? atts.splice(0) : [], conv = state; if (STUDIO) renderAtts();
    const entry = { role:'user', content: q || 'Please look at what I attached.' }; if (sent.length){ entry.att = true; ATTS.set(entry, sent); }
    history().push(entry); add('user', q, null, null, false, sent.map(a => ({ kind: a.kind, name: a.name, thumb: a.thumb }))); w.classList.add('has-history'); fitStage(); fig.resize(); const t = thinking(); w.classList.add('is-busy'); mood('think');
    let ans, failed = false; try { ans = CFG.chatEndpoint ? await remote(history().slice(-10)) : local(q); } catch (e){ ans = local(q); failed = !!CFG.chatEndpoint; }
    t.remove(); w.classList.remove('is-busy'); if (failed){ mood('error'); setTimeout(() => mood('idle'), 900); }
    if (conv !== state){ const i = convos.indexOf(conv); if (i >= 0){ conv.history = [...conv.history, { role:'assistant', content: ans.text }].slice(-24); conv.log = [...conv.log, { who: 'bot', text: ans.text, go: ans.go, actions: (ans.actions || []).slice(0, 6) }].slice(-60); conv.t = Date.now(); convos.splice(i, 1); convos.unshift(conv); ls.set(CONVOS_KEY, convos.slice(0, 40)); renderConvos(); } }   /* the person opened another conversation while Mazar was thinking: the answer is kept where the question was asked */
    else { history().push({ role:'assistant', content: ans.text }); add('bot', ans.text, ans.go, (ans.actions || []).slice(0, 6)); }
    if (queue.length) setTimeout(() => ask(queue.shift()), 700); };
  const grow = () => { input.style.height = 'auto'; input.style.height = Math.min(input.scrollHeight, 160) + 'px'; };
  input.addEventListener('input', () => { grow(); mood(input.value ? 'listen' : 'idle'); });
  input.addEventListener('focus', () => mood('listen')); input.addEventListener('blur', () => { if (!w.classList.contains('is-busy')) mood('idle'); });
  input.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey){ e.preventDefault(); form.requestSubmit(); } });
  form.addEventListener('submit', e => { e.preventDefault(); const q = input.value.trim(); if (!q && !(STUDIO && atts.length)) return; input.value = ''; grow(); ask(q); });

  /* ---- attachments (Mazar platform only): images, PDFs, Word documents and text files ---- */
  const atts = []; const attBox = $('.mz__atts', w);
  const renderAtts = () => { if (!attBox) return; attBox.hidden = !atts.length && !attBox.dataset.note; attBox.innerHTML = atts.map((a, i) => `<span class="mz-att">${a.kind === 'image' ? `<img src="${a.thumb}" alt="">` : I.file}<b>${esc(a.name)}</b><button type="button" data-rm="${i}" aria-label="Remove ${esc(a.name)}">${I.close}</button></span>`).join('') + (attBox.dataset.note ? `<small class="mz-att__note">${esc(attBox.dataset.note)}</small>` : ''); };
  const attNote = m => { if (!attBox) return; attBox.dataset.note = m; renderAtts(); clearTimeout(attNote.t); attNote.t = setTimeout(() => { delete attBox.dataset.note; renderAtts(); }, 5000); };
  const imageData = async file => { const url = URL.createObjectURL(file); try { const im = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; }); const k = Math.min(1, 1600 / Math.max(im.naturalWidth, im.naturalHeight)); const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(im.naturalWidth * k)); c.height = Math.max(1, Math.round(im.naturalHeight * k)); const cx = c.getContext('2d'); cx.fillStyle = '#fff'; cx.fillRect(0, 0, c.width, c.height); cx.drawImage(im, 0, 0, c.width, c.height); const tk = Math.min(1, 180 / Math.max(c.width, c.height)); const tc = document.createElement('canvas'); tc.width = Math.max(1, Math.round(c.width * tk)); tc.height = Math.max(1, Math.round(c.height * tk)); tc.getContext('2d').drawImage(c, 0, 0, tc.width, tc.height); return { data: c.toDataURL('image/jpeg', .86), thumb: tc.toDataURL('image/jpeg', .7) }; } finally { URL.revokeObjectURL(url); } };
  const docxText = async file => { const buf = new Uint8Array(await file.arrayBuffer()), dv = new DataView(buf.buffer), dec = new TextDecoder(); let e = -1; for (let i = buf.length - 22; i >= Math.max(0, buf.length - 66000); i--) if (dv.getUint32(i, true) === 0x06054b50){ e = i; break; } if (e < 0) throw new Error('not a zip');
    let q = dv.getUint32(e + 16, true); for (let n = dv.getUint16(e + 10, true); n > 0; n--){ const method = dv.getUint16(q + 10, true), size = dv.getUint32(q + 20, true), nl = dv.getUint16(q + 28, true), xl = dv.getUint16(q + 30, true), cl = dv.getUint16(q + 32, true), off = dv.getUint32(q + 42, true), name = dec.decode(buf.subarray(q + 46, q + 46 + nl)); q += 46 + nl + xl + cl; if (name !== 'word/document.xml') continue;
      const start = off + 30 + dv.getUint16(off + 26, true) + dv.getUint16(off + 28, true), raw = buf.subarray(start, start + size);
      const xml = method === 0 ? dec.decode(raw) : await new Response(new Blob([raw]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).text();
      return xml.replace(/<w:tab\/>/g, '\t').replace(/<w:br[^>]*\/>|<\/w:p>/g, '\n').replace(/<[^>]+>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&').replace(/\n{3,}/g, '\n\n').trim(); }
    throw new Error('no document text'); };
  const addFiles = async files => { for (const f of [...files]){ if (atts.length >= 5){ attNote('Up to 5 files per message.'); break; } const ext = (f.name.split('.').pop() || '').toLowerCase();
      try {
        if (/^image\//.test(f.type)){ if (f.size > 25e6) throw new Error('big'); const d = await imageData(f); atts.push({ kind: 'image', name: f.name, ...d }); }
        else if (f.type === 'application/pdf' || ext === 'pdf'){ if (f.size > 8e6){ attNote(`${f.name} is over 8 MB. Try a smaller PDF.`); continue; } const d = await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.onerror = rej; r.readAsDataURL(f); }); atts.push({ kind: 'pdf', name: f.name, data: d.replace(/^data:[^;,]*;/, 'data:application/pdf;') }); }
        else if (ext === 'docx'){ atts.push({ kind: 'text', name: f.name, data: await docxText(f) }); }
        else if (/^text\//.test(f.type) || ['txt','md','markdown','csv','json','html','htm','srt','vtt'].includes(ext)){ if (f.size > 4e6) throw new Error('big'); let t = await f.text(); if (/^html?$/.test(ext)) t = new DOMParser().parseFromString(t, 'text/html').body.textContent || ''; atts.push({ kind: 'text', name: f.name, data: t.trim() }); }
        else attNote('Yuriel reads images, PDFs, Word (.docx) and text files.');
      } catch (_) { attNote(`Couldn't open ${f.name}.`); }
    }
    renderAtts(); if (atts.length){ figs.forEach(f => f.joy()); mood('listen'); input.focus({ preventScroll: true }); } };
  if (STUDIO){
    attBox.addEventListener('click', e => { const b = e.target.closest('[data-rm]'); if (!b) return; atts.splice(+b.dataset.rm, 1); renderAtts(); });
    $('.mz__attach', w).addEventListener('click', () => $('.mz__file', w).click());
    $('.mz__file', w).addEventListener('change', e => { addFiles(e.target.files); e.target.value = ''; });
    input.addEventListener('paste', e => { const fs = [...((e.clipboardData && e.clipboardData.files) || [])]; if (fs.length){ e.preventDefault(); addFiles(fs); } });
    panel.addEventListener('dragover', e => { if (e.dataTransfer && [...e.dataTransfer.types].includes('Files')){ e.preventDefault(); w.classList.add('is-drop'); } });
    panel.addEventListener('dragleave', e => { if (!e.relatedTarget || !panel.contains(e.relatedTarget)) w.classList.remove('is-drop'); });
    panel.addEventListener('drop', e => { w.classList.remove('is-drop'); if (!e.dataTransfer || !e.dataTransfer.files.length) return; e.preventDefault(); setTab('ask'); addFiles(e.dataTransfer.files); });
  }
  $$('.mz__sugg button', w).forEach(b => b.addEventListener('click', () => ask(b.textContent)));
  $$('.mz__view--tasks .mz__task', w).forEach(b => b.addEventListener('click', () => ask(b.dataset.prompt)));
  if (STUDIO){ const sref = $('.mz__ref--study input', w); const refOr = () => sref.value.trim() || ($('.mz__scroll', w).dataset.ref) || (w._rd ? refOf(w._rd.book, w._rd.chapter) : '') || 'John 3';
    $$('.mz__view--study .mz__task', w).forEach(b => b.addEventListener('click', () => { const r = refOr(); if (!r && b.dataset.prompt.includes('{ref}') && !b.dataset.prompt.startsWith('Explain what')){ sref.focus(); sref.placeholder = 'Type a passage or book first'; sref.classList.add('is-shake'); setTimeout(() => sref.classList.remove('is-shake'), 600); return; } ask(b.dataset.prompt.replace(/\{ref\}/g, r)); }));
    $('.mz__ref--study', w).addEventListener('submit', e => { e.preventDefault(); const r = sref.value.trim(); if (r) ask(`Give me a full study guide on ${r}: historical context, what it says, what it means, how it applies to my life, cross references and three discussion questions.`); });
    $$('.mz__doctrine [data-ask]', w).forEach(b => b.addEventListener('click', () => ask(b.dataset.ask))); }

  /* ---- action cards ---- */
  const flash = (b, msg) => { const old = b.innerHTML; b.innerHTML = I.check + esc(msg); b.classList.add('is-done'); setTimeout(() => { b.innerHTML = old; b.classList.remove('is-done'); }, 1800); };
  log.addEventListener('click', async e => {
    if (e.target.closest('[data-mz-go]')){ state.open = true; persist(true); return; }
    const opt = e.target.closest('.mz-quiz__opts button'); if (opt){ const li = opt.closest('.mz-quiz__q'); if (li.dataset.done) return; li.dataset.done = '1'; const ok = +opt.dataset.i === +li.dataset.answer; opt.classList.add(ok ? 'is-right' : 'is-wrong'); $$('button', li).forEach(b => { b.disabled = true; if (+b.dataset.i === +li.dataset.answer) b.classList.add('is-right'); }); const why = $('.mz-quiz__why', li); if (why) why.hidden = false; const card = li.closest('.mz-quiz'); const done = $$('.mz-quiz__q[data-done]', card), right = $$('.mz-quiz__opts .is-right:not([disabled])', card); if (done.length === +card.dataset.n){ const score = $$('.mz-quiz__q', card).filter(q => $('.mz-quiz__opts .is-wrong', q) == null).length; const sc = $('.mz-quiz__score', card); sc.hidden = false; sc.textContent = `You scored ${score} of ${card.dataset.n}.`; if (score === +card.dataset.n) figs.forEach(f => f.joy()); } else if (ok) figs.forEach(f => f.pulse()); return; }
    const b = e.target.closest('[data-act]'); if (!b) return; const card = b.closest('.mz-card'); const act = b.dataset.act;
    if (act === 'copy' || act === 'image'){ const ref = card.dataset.ref, tr = card.dataset.tr, text = $('blockquote', card).textContent; b.disabled = true; const msg = act === 'copy' ? await (async () => { try { await navigator.clipboard.writeText(`"${text}" ${ref} (${tr})`); return 'Copied.'; } catch (_) { return 'Could not copy.'; } })() : await shareVerse(ref, text, tr, true, col()); b.disabled = false; if (msg) flash(b, msg); }
    if (act === 'read'){ openPassage(card.dataset.ref); }
    if (act === 'study'){ ask(`Give me a full study guide on ${card.dataset.ref}: historical context, what it says, what it means, how it applies to my life, cross references and three discussion questions.`); }
    if (act === 'hide'){ const q = $('blockquote', card); const on = card.classList.toggle('is-hidden'); q.dataset.full = q.dataset.full || q.textContent; q.textContent = on ? q.dataset.full.replace(/[A-Za-z]/g, c => (Math.random() < .25 ? c : '_')) : q.dataset.full; b.textContent = on ? 'Show the words' : 'Hide the words'; }
    if (act === 'ics'){ const a = JSON.parse(card.dataset.cal); const z = d => new Date(d).toISOString().replace(/[-:]/g, '').replace(/\.\d+/, ''); const ics = ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//CCFC Zambia//Yuriel//EN','BEGIN:VEVENT',`UID:${Date.now()}@ccfczambia.org`,`DTSTAMP:${z(Date.now())}`,`DTSTART:${z(a.start)}`,`DTEND:${z(a.end)}`,`SUMMARY:${a.title.replace(/[,;]/g, '\\$&')}`,`LOCATION:${(a.location || '').replace(/[,;]/g, '\\$&')}`,`DESCRIPTION:${(a.details || '').replace(/\n/g, '\\n').replace(/[,;]/g, '\\$&')}`,'BEGIN:VALARM','TRIGGER:-PT2H','ACTION:DISPLAY','DESCRIPTION:Reminder','END:VALARM','END:VEVENT','END:VCALENDAR'].join('\r\n');
      const link = document.createElement('a'); link.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' })); link.download = a.title.replace(/[^\w]+/g, '-') + '.ics'; document.body.appendChild(link); link.click(); setTimeout(() => { URL.revokeObjectURL(link.href); link.remove(); }, 1000); flash(b, 'Downloaded.'); }
    if (act === 'form'){ const f = JSON.parse(card.dataset.form); setFill(f.form, f.fields); state.open = false; persist(true); location.href = f.href; }
    if (act === 'plan'){ const p = JSON.parse(card.dataset.plan); const plans = loadPlans(); plans.unshift({ id: Date.now(), title: p.title, days: p.days, done: [] }); ls.set(PLANS_KEY, plans.slice(0, 8)); flash(b, 'Saved to Today.'); figs.forEach(f => f.joy()); setTimeout(() => setTab('today'), 700); }
  });

  /* ---- Bible reader (YouVersion-style: book and chapter picker, version picker, verse selection, parallel English) ---- */
  const scroll = $('.mz__scroll', w), bnav = $('.mz__bnav', w), picker = $('.mz__picker', w), vsheet = $('.mz__vsheet', w);
  const RD = { book: Math.min(Math.max(+prefs.book || 43, 1), 66), chapter: +prefs.chapter || 3, vid: VER[prefs.tr] ? prefs.tr : 'web', sel: new Set(), par: !!prefs.par, pk: null };
  RD.chapter = Math.min(Math.max(RD.chapter, 1), CHAPTERS[RD.book - 1]); w._rd = RD;
  const curV = () => VER[RD.vid] || VER.web;
  const savePos = () => { prefs.book = RD.book; prefs.chapter = RD.chapter; prefs.tr = RD.vid; prefs.par = RD.par; prefs.recent = [RD.vid, ...(prefs.recent || []).filter(x => x !== RD.vid && VER[x])].slice(0, 6); ls.set(PREF_KEY, prefs); };
  const updateNav = () => { $('.mz__bbook b', bnav).textContent = refOf(RD.book, RD.chapter); $('.mz__bver b', bnav).textContent = curV().abbr; $('.mz__bprev', bnav).disabled = RD.book === 1 && RD.chapter === 1; $('.mz__bnext', bnav).disabled = RD.book === 66 && RD.chapter === CHAPTERS[65]; };
  const rangeLabel = vs => { const out = []; let a = vs[0], b = vs[0]; for (let i = 1; i <= vs.length; i++){ if (vs[i] === b + 1){ b = vs[i]; continue; } out.push(a === b ? String(a) : `${a}-${b}`); a = b = vs[i]; } return out.join(', '); };
  const selVerses = () => [...RD.sel].sort((a, b) => a - b);
  const selText = () => selVerses().map(n => { const el = $(`.mz__v[data-v="${n}"]`, scroll); return el ? el.textContent.replace(/^\d+\s*/, '').trim() : ''; }).filter(Boolean).join(' ');
  const selRef = () => refOf(RD.book, RD.chapter, rangeLabel(selVerses()));
  const hideSheet = () => { vsheet.hidden = true; };
  const updateSheet = () => { $$('.mz__v', scroll).forEach(el => el.classList.toggle('is-sel', RD.sel.has(+el.dataset.v))); if (!RD.sel.size){ hideSheet(); return; } vsheet.hidden = false; $('.mz__vsheet-ref', vsheet).textContent = selRef(); $('.mz__vs-tr', vsheet).hidden = curV().lang === 'en'; };
  const closePicker = () => { picker.hidden = true; picker.innerHTML = ''; RD.pk = null; };
  let chapterRequest = 0;
  async function showChapter(opts = {}){
    const requestId = ++chapterRequest;
    const v = curV(); updateNav(); savePos(); closePicker(); RD.sel.clear(); hideSheet(); RD.loading = true;
    scroll.innerHTML = '<div class="mz__loading"><i></i><i></i><i></i></div>'; delete scroll.dataset.ref; mood('think');
    try {
      const d = await fetchChapter(v.id, RD.book, RD.chapter);
      if(requestId !== chapterRequest) return;
      let enMap = null; if (RD.par && v.lang !== 'en'){ try { const en = await fetchChapter('web', RD.book, RD.chapter); enMap = Object.fromEntries(en.verses.map(x => [x.verse, x.text])); } catch (_) {} }
      if(requestId !== chapterRequest) return;
      const prevRef = RD.book === 1 && RD.chapter === 1 ? '' : (RD.chapter > 1 ? refOf(RD.book, RD.chapter - 1) : refOf(RD.book - 1, CHAPTERS[RD.book - 2]));
      const nextRef = RD.book === 66 && RD.chapter === CHAPTERS[65] ? '' : (RD.chapter < CHAPTERS[RD.book - 1] ? refOf(RD.book, RD.chapter + 1) : refOf(RD.book + 1, 1));
      scroll.innerHTML = `<header><span class="mz-card__k">${esc(v.name)} <i>${esc(v.year)}</i>${v.lang !== 'en' ? ` <i>&middot; ${esc(v.langName)}</i>` : ''}</span><h3>${esc(refOf(RD.book, RD.chapter))}</h3></header>
        <div class="mz__text mz__text--${esc(v.lang)}${enMap ? ' mz__text--par' : ''}" lang="${esc(v.lang)}"${v.dir === 'rtl' ? ' dir="rtl"' : ''}>${d.verses.map(x => enMap ? `<div class="mz__pv"><span class="mz__v" data-v="${x.verse}" tabindex="0"><sup>${x.verse}</sup>${esc(x.text)}</span><span class="mz__pv-en" dir="ltr" lang="en">${esc(enMap[x.verse] || '')}</span></div>` : `<span class="mz__v" data-v="${x.verse}" tabindex="0"><sup>${x.verse}</sup>${esc(x.text)} </span>`).join('')}</div>
        ${d.notes.length ? `<details class="mz__notes"><summary>${esc(v.abbr)} study notes (${d.notes.length})</summary>${d.notes.map(n => `<p><b>${n.verse}</b> ${esc(n.note)}</p>`).join('')}</details>` : ''}
        <p class="mz__hint">Tap a verse to copy, share, explain${v.lang !== 'en' ? ' or translate' : ''} it.</p>
        <div class="mz-card__row mz__bibleacts"><button type="button" class="mz-chip mz-chip--gold" data-b="explain">${I.spark}Explain this chapter</button>${STUDIO ? `<button type="button" class="mz-chip" data-b="study">${I.study}Study guide</button>` : ''}<button type="button" class="mz-chip" data-b="pray">Pray this</button>${v.lang !== 'en' ? `<button type="button" class="mz-chip${RD.par ? ' is-on' : ''}" data-b="par">${I.lang}${RD.par ? 'Hide English' : 'Show English alongside'}</button><button type="button" class="mz-chip" data-b="translate">${I.spark}Translate with Yuriel</button>` : ''}<button type="button" class="mz-chip" data-b="image">${I.img}Share image</button></div>
        <div class="mz__chnav">${prevRef ? `<button type="button" class="mz__chnav-b" data-step="-1">${I.prev}<span>${esc(prevRef)}</span></button>` : '<span></span>'}${nextRef ? `<button type="button" class="mz__chnav-b" data-step="1"><span>${esc(nextRef)}</span>${I.next}</button>` : ''}</div>`;
      scroll.dataset.ref = refOf(RD.book, RD.chapter); scroll.dataset.text = d.verses.map(x => x.text).join(' ').slice(0, 1400); scroll.dataset.tr = v.name;
      if (opts.focus){ const [a, b] = opts.focus; for (let n = a; n <= (b || a); n++) if ($(`.mz__v[data-v="${n}"]`, scroll)) RD.sel.add(n); updateSheet(); const first = $(`.mz__v[data-v="${a}"]`, scroll); if (first) setTimeout(() => first.scrollIntoView({ block: 'center', behavior: RM ? 'auto' : 'smooth' }), 60); }
      else scroll.scrollTop = 0;
      mood('idle'); figs.forEach(f => f.pulse());
    } catch (err){ if(requestId !== chapterRequest) return; scroll.innerHTML = `<div class="mz__empty">${markSvg()}<p>${esc(err.message)}</p>${err.bg ? `<a class="mz-chip mz-chip--gold" href="${esc(err.bg)}" target="_blank" rel="noopener">Read ${esc(refOf(RD.book, RD.chapter))} on BibleGateway ${I.ext}</a>` : ''}<button type="button" class="mz-chip" data-b="pickver">Choose another version</button></div>`; if (!err.bg){ mood('error'); setTimeout(() => mood('idle'), 900); } else mood('idle'); }
    RD.loading = false; RD.loaded = true;
  }
  const step = dir => { let b = RD.book, c = RD.chapter + dir; if (c < 1){ if (b === 1) return; b--; c = CHAPTERS[b - 1]; } else if (c > CHAPTERS[b - 1]){ if (b === 66) return; b++; c = 1; } RD.book = b; RD.chapter = c; showChapter(); };
  $('.mz__bprev', bnav).addEventListener('click', () => step(-1)); $('.mz__bnext', bnav).addEventListener('click', () => step(1));
  w.addEventListener('keydown', e => { if (state.tab !== 'bible' || /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) return; if (e.key === 'ArrowLeft') step(-1); if (e.key === 'ArrowRight') step(1); if (e.key === 'Escape' && !picker.hidden){ e.stopPropagation(); closePicker(); } });
  /* pickers */
  const BOOK_SHORT = BOOKS.map(b => b.replace('Song of Solomon', 'Song of Songs'));
  function openPicker(kind){ RD.pk = kind; picker.hidden = false; renderPicker(); }
  function renderPicker(bookFor){
    const v = curV();
    if (RD.pk === 'book'){
      if (bookFor){ picker.innerHTML = `<div class="mz__pk-head"><button type="button" class="mz__pk-back mz-chip">${I.prev}Books</button><b>${esc(BOOKS[bookFor - 1])}</b><button type="button" class="mz__btn mz__pk-x" aria-label="Close">${I.close}</button></div><div class="mz__pk-chapters">${Array.from({ length: CHAPTERS[bookFor - 1] }, (_, i) => `<button type="button" data-c="${i + 1}" class="${bookFor === RD.book && i + 1 === RD.chapter ? 'is-on' : ''}">${i + 1}</button>`).join('')}</div>`;
        $('.mz__pk-back', picker).addEventListener('click', () => renderPicker()); $$('[data-c]', picker).forEach(b => b.addEventListener('click', () => { RD.book = bookFor; RD.chapter = +b.dataset.c; showChapter(); })); }
      else { const t = RD.book > 39 ? 'nt' : 'ot';
        picker.innerHTML = `<div class="mz__pk-head"><input class="mz__pk-q" type="search" autocomplete="off" placeholder="Search books, or type John 3:16" aria-label="Search books or a reference"><button type="button" class="mz__btn mz__pk-x" aria-label="Close">${I.close}</button></div><div class="mz__pk-tabs"><button type="button" data-t="ot" class="${t === 'ot' ? 'is-on' : ''}">Old Testament</button><button type="button" data-t="nt" class="${t === 'nt' ? 'is-on' : ''}">New Testament</button></div><div class="mz__pk-books"></div>`;
        const grid = $('.mz__pk-books', picker), q = $('.mz__pk-q', picker);
        const draw = (tab, filter) => { const f = (filter || '').toLowerCase().replace(/[^a-z0-9]/g, ''); grid.innerHTML = BOOKS.map((b, i) => ({ b, i })).filter(({ b, i }) => f ? b.toLowerCase().replace(/[^a-z0-9]/g, '').includes(f) : (tab === 'ot' ? i < 39 : i >= 39)).map(({ b, i }) => `<button type="button" data-b="${i + 1}" class="${i + 1 === RD.book ? 'is-on' : ''}${hasBook(v, i + 1) ? '' : ' is-off'}" title="${hasBook(v, i + 1) ? '' : 'Not in ' + esc(v.abbr)}">${esc(BOOK_SHORT[i])}<small>${CHAPTERS[i]}</small></button>`).join('') || '<p class="mz__pk-none">No book matches. Try a reference like Romans 8:28.</p>'; $$('[data-b]', grid).forEach(x => x.addEventListener('click', () => renderPicker(+x.dataset.b))); };
        draw(t); $$('.mz__pk-tabs button', picker).forEach(b => b.addEventListener('click', () => { $$('.mz__pk-tabs button', picker).forEach(x => x.classList.toggle('is-on', x === b)); q.value = ''; draw(b.dataset.t); }));
        q.addEventListener('input', () => draw($('.mz__pk-tabs .is-on', picker).dataset.t, q.value));
        q.addEventListener('keydown', e => { if (e.key !== 'Enter') return; e.preventDefault(); const p = parseRef(q.value); if (p){ RD.book = p.book; RD.chapter = p.chapter; showChapter({ focus: p.from ? [p.from, p.to] : null }); } else { const first = $('[data-b]', grid); if (first) first.click(); } });
        setTimeout(() => q.focus(), 50); }
    } else {
      picker.innerHTML = `<div class="mz__pk-head"><input class="mz__pk-q" type="search" autocomplete="off" placeholder="Search ${BIBLES.length} versions or a language" aria-label="Search versions"><button type="button" class="mz__btn mz__pk-x" aria-label="Close">${I.close}</button></div><div class="mz__pk-list"></div>`;
      const list = $('.mz__pk-list', picker), q = $('.mz__pk-q', picker);
      const item = x => `<button type="button" data-vid="${x.id}" class="${x.id === RD.vid ? 'is-on' : ''}${x.src === 'bg' ? ' is-bg' : ''}"><b>${esc(x.abbr)}</b><span>${esc(x.name)}</span><small>${[x.year, x.langName, partLabel(x), x.src === 'bg' ? 'opens on BibleGateway' : ''].filter(Boolean).join(' · ')}</small></button>`;
      const draw = filter => { const f = (filter || '').trim().toLowerCase(); const all = Object.values(VER); const hit = x => !f || (x.abbr + ' ' + x.name + ' ' + x.langName + ' ' + x.year + ' ' + x.lang).toLowerCase().includes(f);
        const sections = []; if (!f && prefs.recent && prefs.recent.length) sections.push(['Recent', prefs.recent.map(id => VER[id]).filter(Boolean)]);
        sections.push(['English', all.filter(x => x.lang === 'en' && x.src !== 'bg' && hit(x))]); sections.push(['Original languages', all.filter(x => ORIGINAL_LANGS.includes(x.lang) && hit(x))]);
        const others = {}; all.filter(x => x.lang !== 'en' && !ORIGINAL_LANGS.includes(x.lang) && hit(x)).forEach(x => { (others[x.langName] = others[x.langName] || []).push(x); }); Object.keys(others).sort((a, b) => a.localeCompare(b)).forEach(k => sections.push([k, others[k]]));
        sections.push(['Copyrighted English editions', all.filter(x => x.src === 'bg' && hit(x))]);
        list.innerHTML = sections.filter(([, xs]) => xs.length).map(([h, xs]) => `<h5>${esc(h)} <i>${xs.length}</i></h5>${xs.map(item).join('')}`).join('') || '<p class="mz__pk-none">No version matches.</p>';
        $$('[data-vid]', list).forEach(b => b.addEventListener('click', () => { RD.vid = b.dataset.vid; showChapter(); })); };
      draw(''); q.addEventListener('input', () => draw(q.value)); setTimeout(() => q.focus(), 50);
    }
    $$('.mz__pk-x', picker).forEach(b => b.addEventListener('click', closePicker));
  }
  $('.mz__bbook', bnav).addEventListener('click', () => (RD.pk === 'book' ? closePicker() : openPicker('book')));
  $('.mz__bver', bnav).addEventListener('click', () => (RD.pk === 'version' ? closePicker() : openPicker('version')));
  const openPassage = (ref, vid) => { const p = parseRef(ref); if (!p) return; if (vid && VER[vid]) RD.vid = vid; RD.book = p.book; RD.chapter = p.chapter; setTab('bible'); showChapter({ focus: p.from ? [p.from, p.to] : null }); };
  const translatePrompt = (ref, text) => `Translate ${ref} from ${curV().langName} (${curV().name}) into English: first as literally as possible, word by word where it helps, then a natural English rendering. Text: "${text}"`;
  scroll.addEventListener('click', async e => {
    const vEl = e.target.closest('.mz__v'); if (vEl){ const n = +vEl.dataset.v; if (RD.sel.has(n)) RD.sel.delete(n); else RD.sel.add(n); updateSheet(); return; }
    const st = e.target.closest('[data-step]'); if (st){ step(+st.dataset.step); return; }
    const b = e.target.closest('[data-b]'); if (!b) return; const { ref, text, tr } = scroll.dataset; const v = curV();
    if (b.dataset.b === 'explain') ask(`Explain ${ref} for me: what it meant then and what it means for my life today.`);
    if (b.dataset.b === 'study') ask(`Give me a full study guide on ${ref}: historical context, what it says, what it means, how it applies to my life, cross references and three discussion questions.`);
    if (b.dataset.b === 'pray') ask(`Write a short prayer from ${ref} that I can pray today.`);
    if (b.dataset.b === 'par'){ RD.par = !RD.par; showChapter(); }
    if (b.dataset.b === 'translate') ask(translatePrompt(ref, (text || '').slice(0, 900)));
    if (b.dataset.b === 'image'){ const m = await shareVerse(ref, text, tr, true, col()); if (m) flash(b, m); }
    if (b.dataset.b === 'pickver') openPicker('version');
  });
  scroll.addEventListener('keydown', e => { const vEl = e.target.closest('.mz__v'); if (vEl && (e.key === 'Enter' || e.key === ' ')){ e.preventDefault(); vEl.click(); } });
  vsheet.addEventListener('click', async e => { const b = e.target.closest('[data-vs]'); if (!b) return; const ref = selRef(), text = selText();
    if (b.dataset.vs === 'copy'){ try { await navigator.clipboard.writeText(`"${text}" ${ref} (${curV().name})`); flash(b, 'Copied.'); } catch (_) { flash(b, 'Could not copy.'); } }
    if (b.dataset.vs === 'image'){ const m = await shareVerse(ref, text, curV().name, true, col()); if (m) flash(b, m); }
    if (b.dataset.vs === 'explain') ask(`Explain ${ref} (${curV().name}) for me: what it meant then and what it means for my life today.`);
    if (b.dataset.vs === 'compare') ask(`Compare ${ref} in the original language, the Geneva Bible, the King James Version and the World English Bible, and explain any differences that matter.`);
    if (b.dataset.vs === 'translate') ask(translatePrompt(ref, text.slice(0, 900)));
    if (b.dataset.vs === 'clear'){ RD.sel.clear(); updateSheet(); }
  });
  updateNav();
  /* ---- Today: verse of the day + reading plans ---- */
  const todayEl = $('.mz__todayin', w);
  async function renderToday(){
    const plans = loadPlans(); const ref = votdRef();
    todayEl.innerHTML = `<div class="mz-votd"><span class="mz-card__k">Verse for ${esc(new Date().toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long' }))}</span><blockquote class="mz-votd__text"><span class="mz__loading"><i></i><i></i><i></i></span></blockquote><b class="mz-votd__ref">${esc(ref)}</b>
      <div class="mz-card__row"><button type="button" class="mz-chip mz-chip--gold" data-t="reflect">${I.spark}Reflect with Yuriel</button><button type="button" class="mz-chip" data-t="read">${I.book}Read the chapter</button><button type="button" class="mz-chip" data-t="image">${I.img}Share image</button></div></div>
      <div class="mz-plans"><div class="mz-plans__head"><h4>Reading plans</h4><button type="button" class="mz-chip" data-t="new">${I.plus}New plan</button></div>
      ${plans.length ? plans.map(p => `<details class="mz-plan" data-id="${p.id}" ${p === plans[0] ? 'open' : ''}><summary><b>${esc(p.title)}</b><span class="mz-plan__bar"><i style="width:${Math.round((p.done.length / p.days.length) * 100)}%"></i></span><small>${p.done.length} of ${p.days.length}</small></summary><ol>${p.days.map(d => `<li class="${p.done.includes(d.day) ? 'is-done' : ''}"><button type="button" class="mz-plan__tick" data-day="${d.day}" aria-label="Mark day ${d.day} ${p.done.includes(d.day) ? 'not done' : 'done'}">${I.check}</button><button type="button" class="mz-plan__ref" data-ref="${esc(d.reference)}"><b>Day ${d.day}: ${esc(d.reference)}</b>${d.focus ? `<small>${esc(d.focus)}</small>` : ''}</button></li>`).join('')}</ol><button type="button" class="mz-plan__del">Remove plan</button></details>`).join('') : '<p class="mz__lead">No plans yet. Ask Yuriel for one, for example "a 7 day plan on peace" or "read through Acts in a month".</p>'}</div>`;
    const cacheKey = 'mazar:votd'; const cached = ls.get(cacheKey); const box = $('.mz-votd__text', todayEl);
    let text = cached && cached.day === dayKey() && cached.tr === prefs.tr ? cached.text : '';
    if (!text){ try { const d = await passage(ref, VER[prefs.tr] && VER[prefs.tr].src !== 'bg' && VER[prefs.tr].lang === 'en' && VER[prefs.tr].part === 'all' ? prefs.tr : 'web'); text = d.verses.map(v => v.text).join(' '); ls.set(cacheKey, { day: dayKey(), tr: prefs.tr, text }); } catch (_) { text = ''; } }
    box.textContent = text || 'Open the Bible tab to read today\'s verse.'; todayEl.dataset.text = text;
  }
  todayEl.addEventListener('click', async e => {
    const t = e.target.closest('[data-t]'); const ref = votdRef();
    if (t){ const k = t.dataset.t;
      if (k === 'reflect') ask(`Give me a short devotional on today's verse, ${ref}: a reflection, one question to think about, and a one line prayer.`);
      if (k === 'read') openPassage(ref);
      if (k === 'image' && todayEl.dataset.text){ const m = await shareVerse(ref, todayEl.dataset.text, TR_NAME[prefs.tr], true, col()); if (m) flash(t, m); }
      if (k === 'new') ask('Create a Bible reading plan for me. Ask me the topic and how many days.');
      return; }
    const det = e.target.closest('.mz-plan'); if (!det) return; const plans = loadPlans(); const p = plans.find(x => String(x.id) === det.dataset.id); if (!p) return;
    const tick = e.target.closest('.mz-plan__tick'), rb = e.target.closest('.mz-plan__ref');
    if (tick){ const d = +tick.dataset.day; p.done = p.done.includes(d) ? p.done.filter(x => x !== d) : [...p.done, d]; ls.set(PLANS_KEY, plans); renderToday(); if (p.done.includes(d)) figs.forEach(f => f.pulse()); }
    if (rb) openPassage(rb.dataset.ref);
    const pdel = e.target.closest('.mz-plan__del'); if (pdel && await sure(w, { title: 'Remove this reading plan?', body: `"${p.title}" and the days you have ticked off will be removed from Today.`, ok: 'Remove', danger: true, from: pdel })){ ls.set(PLANS_KEY, loadPlans().filter(x => String(x.id) !== String(p.id))); renderToday(); }
  });

  /* ---- restore ---- */
  if (state.log.length){ state.log.forEach(m => add(m.who, m.text, m.go, m.actions, true, m.files)); if (state.log.some(m => m.who === 'user')) w.classList.add('has-history'); }
  $('.mz__new', w).addEventListener('click', async e => { if (STUDIO){ $('.mz__newchat', w).click(); return; }
    if (state.log.some(m => m.who === 'user') && !await sure(w, { title: 'Start a new conversation?', body: 'Your current chat will be cleared.', ok: 'Start new', from: e.currentTarget })) return;
    const keepOpen = state.open, big = state.big; mem.clear(); state.log = []; state.history.length = 0; state.open = keepOpen; state.big = big; log.querySelectorAll('.mz-msg').forEach(n => n.remove()); w.classList.remove('has-history'); fitStage(); setTab('ask'); add('bot', PER_SITE.greet); fig.resize(); input.focus(); });
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
  const passageRef = qp.get('ref'); if (passageRef && parseRef(passageRef)){ if (FLOAT) open(true); openPassage(passageRef); }
  addEventListener('resize', () => { if (FLOAT && panel.hidden) return; setTab(state.tab || 'ask'); }, { passive: true });
  if (STUDIO) accounts(w, { figs,
    list: () => convos,
    replace(list){ const cur = state.id, fresh = list.find(c => c.id === cur); convos = list.slice(0, 40);
      if (!convos.length){ const n = newConvo(); convos.unshift(n); switchConvo(n.id); }
      else if (fresh && fresh !== state && (fresh.t || 0) > (state.t || 0)){ switchConvo(cur); }
      else { const i = convos.findIndex(c => c.id === cur); if (i >= 0) convos[i] = state; else convos.unshift(state); }
      ls.set(CONVOS_KEY, convos); renderConvos(); } });
  window.Mazar = { open: tab => { if (FLOAT) open(true); if (tab) setTab(tab); }, ask, figure: fig };
}
window.MazarFigure = Figure; window.MazarSky = Sky; window.MazarRich = rich; window.MazarType = typeOut;
function boot(){ if (OPT.mode === 'none') return; app(); applyFill(); }
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
