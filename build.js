#!/usr/bin/env node
/* WORSHIP CONNECT site builder. node build.js → index.html, videos.html, join.html */
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const SEO = require('./build-shared.js');
const ORIGIN = 'https://worship.ccfczambia.org';
const hash = f => crypto.createHash('md5').update(fs.readFileSync(path.join(__dirname, f))).digest('hex').slice(0, 8);
const V = { chat: hash('js/chat.js'), css: hash('css/site.css'), js: hash('js/site.js'), fonts: hash('css/fonts.css'), core: hash('css/core.css'), corejs: hash('js/core.js') };
const SETTINGS_URL = 'https://dcqydtkjzgilyjnjyisb.supabase.co/rest/v1/site_settings?select=key,value&site=eq.worship';
function loadSettings(defaults){ try { const out = require('child_process').execSync(`curl -s --max-time 6 -H "apikey: sb_publishable_gPig-ePcoJIUnQ4fij6viw_ukAhlifp" "${SETTINGS_URL}"`, { encoding:'utf8' }); const rows = JSON.parse(out); const s = Object.assign({}, defaults); for (const r of rows) if (r.value && r.value.trim()) s[r.key] = r.value; console.log('settings: live'); return s; } catch (e){ console.log('settings: defaults (offline)'); return Object.assign({}, defaults); } }
const S = loadSettings({ latest:'Koinonia 25 worship sets', rehearsal:'Ask us for the weekly slot' });
const WA = '260975065391', MAIN = 'https://ccfczambia.org', KOI = 'https://koinonia.ccfczambia.org', YT = 'https://www.youtube.com/@christconnectfamilychurchz7833';
const ICON = { back: '<svg class="i" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M11 18l-6-6 6-6"/></svg>', arrow: '<svg class="i" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>', play: '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>' };
const img = (n, alt, sizes='(min-width:900px) 50vw, 100vw', eager=false) => `<img src="assets/img/${n}-1280.webp" srcset="assets/img/${n}-800.webp 800w, assets/img/${n}-1280.webp 1280w" sizes="${sizes}" alt="${alt}" ${eager ? 'fetchpriority="high"' : 'loading="lazy" decoding="async"'}>`;

/* Every Worship Connect video on the church channel (add new ones here; the Media team can also post to the Worship feed) */
const VIDEOS = [
  { id:'Xq1RXcOhWmE', t:'Praise and Worship Medley: Chawama, Hallelujah Hosanna', where:'Koinonia 25 Experience, Lusaka', when:'December 2025', dur:'20:27', kind:'Worship set', img:'worship-2',
    songs:[['Chawama', 23], ['Hallelujah Hosanna', 250], ['Twasumbula Ishina Lyenu', 665], ['You Are Yahweh', 952]] },
  { id:'wrOzwYRt4yM', t:'Praise Medley: You Are So Good, Bena Ba Suma Kuli Ine', where:'Koinonia 25 Experience, Lusaka', when:'December 2025', dur:'20:38', kind:'Praise set', img:'worship-5',
    songs:[['You Are So Good', 29], ['Bena Ba Suma Kuli Ine', 274]] },
];
/* songs we sing: [title, style, video id, start in seconds] */
const SONGS = [
  ['You Are So Good', 'Praise', 'wrOzwYRt4yM', 29], ['Bena Ba Suma Kuli Ine', 'Praise, Bemba', 'wrOzwYRt4yM', 274],
  ['Chawama', 'Praise, Nyanja', 'Xq1RXcOhWmE', 23], ['Hallelujah Hosanna', 'Worship', 'Xq1RXcOhWmE', 250],
  ['Twasumbula Ishina Lyenu', 'Worship, Bemba', 'Xq1RXcOhWmE', 665], ['You Are Yahweh', 'Worship', 'Xq1RXcOhWmE', 952],
];
const mmss = s => `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;

const WSEO = {
  'index.html': ["Worship Connect | Praise and Worship Team, CCFC Zambia", "Worship Connect is the praise and worship team of Christ Connect Family Church Zambia in Lusaka. Watch every set, learn the songs and join the team."],
  'videos.html': ["Worship Videos | Every Set, With Songs | Worship Connect", "Watch every Worship Connect set from CCFC Zambia and Koinonia, with song timestamps so you can jump straight to You Are Yahweh, Chawama and more."],
  'latest.html': ["Latest from Worship Connect | CCFC Zambia", "New sets, songs the team is learning, rehearsal news and photos from Sunday, posted by Worship Connect, the praise team of CCFC Zambia in Lusaka."],
  'team.html': ["The Team | Vocals, Band, Sound | Worship Connect", "Meet Worship Connect: the vocalists, musicians, sound and media volunteers who lead praise and worship at Christ Connect Family Church Zambia."],
  'join.html': ["Join Worship Connect | Singers and Musicians, Lusaka", "Sing, play, run sound or film? Apply to join Worship Connect at CCFC Zambia in Lusaka. Tell us your gift and a team leader will message you on WhatsApp."],
  'dashboard.html': ["Worship Connect Dashboard | CCFC", "Worship Connect team dashboard."],
  '404.html': ["Page not found | Worship Connect", "This page could not be found on the Worship Connect website."],
};
const CARD = { 'index.html':'home', 'videos.html':'videos', 'latest.html':'latest', 'team.html':'team', 'join.html':'join' };
const JOINFAQ = [
  ['Do I need professional experience?', 'No. We audition gently and rehearse seriously. Tell us what you do, and a team leader will invite you to a rehearsal.'],
  ['Which roles can I apply for?', 'Vocals, keys, guitar, bass, drums, sound and media.'],
  ['Do I have to be a member of CCFC?', 'Worship Connect is for members and friends of CCFC who love Jesus and can commit to rehearsals.'],
  ['When do you rehearse?', 'Every week. Ask us for the current rehearsal slot and a team leader will share it with you.'],
  ['What happens after I apply?', 'The team sees your application on their dashboard and replies on WhatsApp. You come to a rehearsal, and then join the rota for Sundays, Koinonia and outreach.'],
  ['What languages do you sing in?', 'English, Bemba and Nyanja, so the whole family can lift one voice.'],
];
const MENU = [['index.html','Home','The praise and worship team'],['videos.html','Videos','Every set we have recorded'],['latest.html','Latest','New sets, songs, rehearsal news'],['team.html','The team','Who leads worship'],['join.html','Join the team','Vocals, band, sound, media']];
function layout(p){
  const links = [['index.html','Home'],['videos.html','Videos'],['latest.html','Latest'],['team.html','Team'],['join.html','Join the team']].map(([f,l]) => `<li><a href="${f}"${f===p.file?' aria-current="page"':''}>${l}</a></li>`).join('');
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
${SEO.headTags({ origin: ORIGIN, file: p.file, title: WSEO[p.file][0], desc: WSEO[p.file][1], noindex: p.noindex, ogImage: 'assets/og/' + (CARD[p.file] || 'default') + '.jpg', ogAlt: WSEO[p.file][0].split(' | ')[0] + ', Worship Connect, CCFC Zambia', siteName: 'Worship Connect', themeColor: '#0A0A0B', preloadImage: p.file === 'index.html' ? '/assets/img/hero-poster-v2.webp' : null })}
<link rel="preload" href="assets/fonts/BricolageGrotesque-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="css/fonts.css?v=${V.fonts}"><link rel="stylesheet" href="css/site.css?v=${V.css}"><link rel="stylesheet" href="css/core.css?v=${V.core}">
<script type="application/ld+json">${JSON.stringify({'@context':'https://schema.org','@type':'MusicGroup',name:'Worship Connect',description:'Praise and worship team of Christ Connect Family Church Zambia',url:ORIGIN + '/',genre:'Gospel',foundingLocation:{'@type':'Place',name:'Lusaka, Zambia'},sameAs:[YT],memberOf:{'@type':'Church',name:'Christ Connect Family Church Zambia',url:'https://ccfczambia.org/'}})}</script>${p.jsonld ? `<script type="application/ld+json">${JSON.stringify(p.jsonld)}</script>` : ''}
</head>
<body>
<a class="sr" href="#main">Skip to content</a>
<header class="nav"><div class="wrap">
  <a class="nav__brand" href="index.html" aria-label="Worship Connect, home"><img src="assets/logo/ccfc-mark-white.png?v=2" alt="Christ Connect Family Church"><b>WORSHIP<i>Connect</i></b></a>
  <ul class="nav__links">${links}</ul>
  <div class="row"><span class="nav__account"></span><a class="btn btn--ghost nav__home" href="${MAIN}" title="Back to the main church website">${ICON.back}Church website</a><a class="btn nav__cta" href="join.html"><span class="nav__cta-long">Join the team</span><span class="nav__cta-short">Join</span> ${ICON.arrow}</a><button class="nav__burger" aria-label="Open menu" aria-expanded="false" aria-controls="menu"><i></i><span>Menu</span></button></div>
</div></header>
<div class="menu__veil"></div>
<nav class="menu" aria-label="Site menu" id="menu">
  <div class="menu__top"><a class="nav__brand" href="index.html"><img src="assets/logo/ccfc-mark-white.png?v=2" alt=""><b>WORSHIP<i>Connect</i></b></a><button class="menu__close" aria-label="Close menu"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>
  <div class="menu__scroll">
    <div class="menu__quick"><a class="mq mq--a" href="join.html"><b>Join the team</b><small>Tell us your gift</small></a><a class="mq mq--b" href="videos.html"><b>Watch every set</b><small>Praise and worship</small></a></div>
    <h4 class="menu__h">Pages</h4><ul class="menu__list">${MENU.map(([f,l,t],i) => `<li style="--i:${i}"><a href="${f}"${f===p.file?' aria-current="page"':''}><b>${l}</b><small>${t}</small><span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg></span></a></li>`).join('')}</ul>
    <h4 class="menu__h">Our sites</h4><div class="menu__cards"><a class="mcard mcard--church" href="${MAIN}"><b>CCFC Zambia</b><small>Back to the church website</small><span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg></span></a><a class="mcard mcard--koi" href="${KOI}"><b>KOINONIA<i>Experience</i></b><small>Koi 24' to Koi 26', videos, registration</small><span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg></span></a></div>
  </div>
  <div class="menu__bottom"><div class="menu__account"></div><a class="menu__wa" href="https://wa.me/${WA}" target="_blank" rel="noopener">WhatsApp the office</a></div>
</nav>
<main id="main">${p.body}</main>
<footer class="foot"><div class="wrap"><span>Worship Connect is the praise and worship team of Christ Connect Family Church Zambia.</span><span><a href="${MAIN}">CCFC Zambia</a> &nbsp;&middot;&nbsp; <a href="${KOI}">Koinonia</a> &nbsp;&middot;&nbsp; <a href="${YT}" target="_blank" rel="noopener">YouTube</a> &nbsp;&middot;&nbsp; <a href="https://wa.me/${WA}" target="_blank" rel="noopener">WhatsApp</a></span><nav class="legal" aria-label="Legal"><a href="${MAIN}/privacy">Privacy</a><a href="${MAIN}/terms">Terms</a><a href="${MAIN}/faq">FAQ</a><button type="button" data-consent-open>Cookie settings</button><a href="${MAIN}/sitemap">Site map</a><span>&copy; <span class="year"></span> CCFC</span></nav></div></footer>
<script src="js/site.js?v=${V.js}" defer></script>
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.49.4/dist/umd/supabase.min.js" defer></script>
<script>window.CCFC_SITE={key:'worship'};window.CCFC_CONFIG=Object.assign(window.CCFC_CONFIG||{supabaseUrl:'https://dcqydtkjzgilyjnjyisb.supabase.co',supabaseKey:'sb_publishable_gPig-ePcoJIUnQ4fij6viw_ukAhlifp'},{chatEndpoint:'https://dcqydtkjzgilyjnjyisb.supabase.co/functions/v1/ministry-chat'})</script>
<script src="js/core.js?v=${V.corejs}" defer></script>
<script src="js/chat.js?v=${V.chat}" defer></script>
</body></html>`;
}
const vcard = v => `<div class="vcard"><a href="https://www.youtube.com/watch?v=${v.id}" class="vcard__main" data-lb="${v.id}" data-title="${v.t}" aria-label="Play: ${v.t}"><div class="ph">${img(v.img,'','(min-width:800px) 50vw, 100vw')}</div><span class="vcard__play" aria-hidden="true">${ICON.play}</span><div class="vcard__meta"><b>${v.t}</b><span>${v.where} &middot; ${v.when} &middot; ${v.dur}</span></div></a>
  <div class="vcard__songs" aria-label="Songs in this set">${v.songs.map(([s,t]) => `<a href="https://www.youtube.com/watch?v=${v.id}&t=${t}s" data-lb="${v.id}" data-start="${t}" data-title="${s}, from ${v.t}"><i>${mmss(t)}</i>${s}</a>`).join('')}</div></div>`;
const closeBlock = () => `<section class="close"><div class="bg">${img('p-band','','100vw')}</div><div class="wrap"><h2 data-split>Can you sing,<br>play or mix?</h2><p>Worship Connect is always growing. Vocalists, keys, guitar, bass, drums, sound and media: if God has given you a gift, bring it.</p><div class="row"><a class="btn" href="join.html">Join the team ${ICON.arrow}</a><a class="btn btn--ghost" href="${YT}" target="_blank" rel="noopener">Subscribe on YouTube</a></div></div></section>`;

const home = { file:'index.html', title:'Home', og:'worship-1', desc:'Worship Connect, the praise and worship team of Christ Connect Family Church Zambia. Watch every set, learn the songs, join the team.',
  body:`
<section class="hero"><div class="hero__media">${img('worship-1','Worship Connect leading praise at Koinonia 25','100vw',true)}<video data-src720="assets/img/hero-720.mp4" data-src="assets/img/hero-1080-v2.mp4" data-src4k="assets/img/hero-4k.mp4" poster="assets/img/hero-poster-v2.webp" muted loop playsinline autoplay preload="metadata" aria-hidden="true"></video></div><div class="hero__scrim"></div>
  <div class="wrap"><div class="hero__copy">
    <h1 class="wordmark">WORSHIP<br><em>CONNECT</em></h1>
    <p>The praise and worship team of Christ Connect Family Church Zambia. Songs in English, Bemba and Nyanja, sung so the whole family can lift one voice.</p>
    <div class="row"><a class="btn" href="videos.html">Watch every set ${ICON.arrow}</a><a class="btn btn--ghost" href="join.html">Join the team</a></div>
  </div>
  <div class="hero__meta" data-rv-stagger><div><b>Latest</b><span data-setting="latest">${S.latest}</span></div><div><b>Where we lead</b><span>Every Sunday from 08:30, Mandevu</span></div><div><b>Rehearsals</b><span data-setting="rehearsal">${S.rehearsal}</span></div></div></div>
</section>
<section class="sec"><div class="wrap"><h2 class="mb-2" data-split>Latest sets</h2><div class="vgrid" data-rv-stagger>${VIDEOS.map(vcard).join('')}</div><div class="row mt-2" data-rv><a class="link" href="videos.html">All videos ${ICON.arrow}</a></div></div></section>
<section class="sec" style="padding-top:0"><div class="wrap"><h2 data-split>Songs we sing</h2><p class="lede mt-1 mb-2" data-rv>The songs from our recorded sets, so you can learn them before Sunday. Tap a song and the set plays from where that song starts.</p>
  <div class="songs" data-rv-stagger>${SONGS.map(([s,k,id,t]) => `<a class="song" href="https://www.youtube.com/watch?v=${id}&t=${t}s" data-lb="${id}" data-start="${t}" data-title="${s}"><div><b>${s}</b><span>${k} &middot; starts at ${mmss(t)}</span></div><span class="pill">${ICON.play} Play</span></a>`).join('')}</div></div></section>
<section class="sec" style="padding-top:0"><div class="wrap"><div class="teamgrid" data-rv-stagger><div class="ph">${img('p-singer','A lead singer on a Sunday','50vw')}</div><div class="ph">${img('p-bass','Bass','25vw')}</div><div class="ph">${img('p-keys2','Keys','25vw')}</div><div class="ph">${img('p-drums','Drums','25vw')}</div><div class="ph">${img('p-mics','Vocalists at the mics','25vw')}</div></div></div></section>
<section class="sec" style="padding-top:0"><div class="wrap"><h2 class="mb-2" data-split>Who is on the team</h2><div class="roles" data-rv-stagger><div class="role"><b>Vocals</b><span>Lead singers and the choir, in three languages</span></div><div class="role"><b>Band</b><span>Keys, guitars, bass and drums</span></div><div class="role"><b>Sound</b><span>Front of house, monitors and recording</span></div><div class="role"><b>Media</b><span>Lyrics, cameras and the videos you watch here</span></div></div></div></section>
${closeBlock()}` };

const videos = { file:'videos.html', title:'Videos', og:'worship-2', desc:'Every Worship Connect video: praise sets, worship sets and live recordings from CCFC Zambia gatherings.',
  body:`
<section class="hero hero--short"><div class="hero__media">${img('worship-2','','100vw',true)}</div><div class="hero__scrim"></div><div class="wrap"><div class="hero__copy"><h1 class="wordmark" style="font-size:clamp(2.6rem,8vw,6.5rem)">Every <em>set.</em></h1><p>Praise and worship recordings from our gatherings. New sets land here and on the church YouTube channel.</p></div></div></section>
<section class="sec"><div class="wrap tabs"><div class="tabs__bar" role="tablist"><button class="tabs__btn is-on" role="tab">All</button><button class="tabs__btn" role="tab">Praise</button><button class="tabs__btn" role="tab">Worship</button></div>
  <div class="tabs__panel"><div class="vgrid vgrid--3" data-rv-stagger>${VIDEOS.map(vcard).join('')}</div></div>
  <div class="tabs__panel" hidden><div class="vgrid vgrid--3">${VIDEOS.filter(v => v.kind==='Praise set').map(vcard).join('')}</div></div>
  <div class="tabs__panel" hidden><div class="vgrid vgrid--3">${VIDEOS.filter(v => v.kind==='Worship set').map(vcard).join('')}</div></div>
  <div class="row mt-3"><a class="btn btn--ghost" href="${YT}" target="_blank" rel="noopener">Subscribe on YouTube ${ICON.arrow}</a></div></div></section>
${closeBlock()}` };

const join = { jsonld: { '@context':'https://schema.org', '@type':'FAQPage', mainEntity: JOINFAQ.map(([q, a]) => ({ '@type':'Question', name:q, acceptedAnswer:{ '@type':'Answer', text:a } })) }, file:'join.html', title:'Join the team', og:'worship-3', desc:'Join Worship Connect: vocalists, musicians, sound and media. Tell us your gift and we will invite you to the next rehearsal.',
  body:`
<section class="hero hero--short"><div class="hero__media">${img('p-mics','','100vw',true)}</div><div class="hero__scrim"></div><div class="wrap"><div class="hero__copy"><h1 class="wordmark" style="font-size:clamp(2.6rem,8vw,6.5rem)">Bring your <em>gift.</em></h1><p>We audition gently and rehearse seriously. Tell us what you do and a team leader will message you about the next rehearsal.</p></div></div></section>
<section class="sec"><div class="wrap reg__grid">
  <div><h2 data-split>How it works</h2><div class="details mt-2" data-rv-stagger><div class="detail"><b>1. Apply</b><p>Send the form. The team sees it on their dashboard and replies on WhatsApp.</p></div><div class="detail"><b>2. Rehearsal</b><p>Come and sing or play with the team at a weekly rehearsal.</p></div><div class="detail"><b>3. Serve</b><p>Join the rota for Sundays, Koinonia and outreach missions.</p></div><div class="detail"><b>Who</b><p>Members and friends of CCFC who love Jesus and can commit to rehearsals.</p></div></div></div>
  <form class="reg join" data-wa="${WA}" novalidate data-rv="fade">
    <div class="reg__row"><div class="field"><label for="j-name">Your name</label><input id="j-name" name="name" required autocomplete="name"></div><div class="field"><label for="j-phone">WhatsApp number</label><input id="j-phone" name="phone" type="tel" required autocomplete="tel" placeholder="+260 97 ..."></div></div>
    <div class="field"><label for="j-email">Email (optional)</label><input id="j-email" name="email" type="email" autocomplete="email" placeholder="you@example.com"></div>
    <div class="field"><label for="j-gift">What do you do?</label><select id="j-gift" name="gift"><option>Vocals</option><option>Keys</option><option>Guitar</option><option>Bass</option><option>Drums</option><option>Sound</option><option>Media and cameras</option><option>Something else</option></select></div>
    <div class="field"><label for="j-exp">Experience (optional)</label><textarea id="j-exp" name="experience" rows="3" placeholder="Where have you sung or played before?"></textarea></div>
    <div class="field"><label for="j-church">Your church (if not CCFC)</label><input id="j-church" name="church"></div>
    <div class="field"><label for="j-msg">Anything else you want the team to know? (optional)</label><textarea id="j-msg" name="message" rows="2"></textarea></div>
    <div class="row"><button class="btn" type="submit">Send my application ${ICON.arrow}</button><span class="reg__status" aria-live="polite"></span></div>
  </form></div></section>
<section class="sec" id="faq" style="padding-top:0"><div class="wrap"><div class="kfaq"><div><h2 data-split>Good to<br>know.</h2><p class="sub mt-1" data-rv>What people ask before they apply.</p></div><div class="kfaq__list" data-rv>${JOINFAQ.map(([q, a]) => `<details class="kfaq__item"><summary>${q}<span aria-hidden="true">${ICON.arrow}</span></summary><p>${a}</p></details>`).join('')}</div></div></div></section>
${closeBlock()}` };


const latest = { file:'latest.html', title:'Latest', og:'worship-2', desc:'The latest from Worship Connect: new sets, songs, rehearsal news and photos from Sunday, posted by the team.',
  body:`
<section class="hero hero--short"><div class="hero__media">${img('worship-2','','100vw',true)}</div><div class="hero__scrim"></div><div class="wrap"><div class="hero__copy"><span class="pill pill--orange">From the team</span><h1 class="wordmark mt-1" style="font-size:clamp(2.6rem,8vw,6.5rem)">The <em>latest.</em></h1><p>New sets, songs we are learning, rehearsal news and photos from Sunday. Sign in to react and comment.</p></div></div></section>
<section class="sec" id="feed" data-site="worship" style="padding-top:clamp(40px,6vw,70px)"><div class="wrap"><div class="feed__grid">
  <div><div class="feed__filters mb-2"></div><div class="feed__composer"></div><div class="feed__list mt-2"></div></div>
  <aside class="feed__side">
    <div class="side"><span class="eyebrow">Sundays</span><h3>We lead from 08:30</h3><p>Kings Sparkle School, off Kasangula Road, Mandevu.</p><a class="link" href="${MAIN}/visit">Plan a visit ${ICON.arrow}</a></div>
    <div class="side"><h3>Join the team</h3><p>Vocals, keys, guitar, bass, drums, sound or media.</p><a class="btn" href="join.html">Apply ${ICON.arrow}</a></div>
    <div class="side"><h3>Every set</h3><p>All our recordings, praise and worship.</p><a class="link" href="videos.html">Watch ${ICON.arrow}</a></div>
  </aside></div></div></section>
${closeBlock()}` };
const team = { file:'team.html', title:'The team', og:'worship-3', desc:'Meet Worship Connect: the vocalists, musicians, sound and media people who lead praise and worship at Christ Connect Family Church Zambia.',
  body:`
<section class="hero hero--short"><div class="hero__media">${img('p-singer','','100vw',true)}</div><div class="hero__scrim"></div><div class="wrap"><div class="hero__copy"><h1 class="wordmark" style="font-size:clamp(2.6rem,8vw,6.5rem)">The <em>team.</em></h1><p>One voice, many gifts. Vocalists and the choir, the band, sound and media.</p></div></div></section>
<section class="sec" id="team"><div class="wrap"><div class="team__grid" data-rv-stagger>
  <div class="tm"><div class="ph">${img('p-singer','Lead vocals','25vw')}</div><b>Vocals</b><span>Lead singers and the choir</span><p>In English, Bemba and Nyanja.</p></div>
  <div class="tm"><div class="ph">${img('p-keys2','Keys','25vw')}</div><b>Keys</b><span>Band</span></div>
  <div class="tm"><div class="ph">${img('p-bass','Bass','25vw')}</div><b>Bass and guitars</b><span>Band</span></div>
  <div class="tm"><div class="ph">${img('p-drums','Drums','25vw')}</div><b>Drums</b><span>Band</span></div>
</div><p class="sub mt-3" data-rv>Individual profiles are added by the team from their dashboard.</p></div></section>
${closeBlock()}` };
const dashboard = { file:'dashboard.html', title:'Dashboard', og:'worship-1', desc:'Worship Connect team dashboard.', noindex:true, body:`
<section class="sec" id="dashboard" style="padding-top:calc(var(--nav-h) + clamp(40px,6vw,80px))"><div class="wrap">
  <div class="dash__gate"></div>
  <div class="dash__app" hidden><div class="dash__head"></div><div class="dash__stats"></div><div class="dash__tabs"></div><div class="dash__panel"></div></div>
</div></section>` };

const notFound = { file:'404.html', title:'Page not found', og:'worship-1', noindex:true, desc:WSEO['404.html'][1], body:`
<section class="sec nf" style="padding-top:calc(var(--nav-h) + clamp(40px,6vw,90px))"><div class="wrap">
  <span class="pill pill--orange">Error 404</span>
  <h1 class="wordmark mt-1" style="font-size:clamp(3rem,10vw,7rem)">Off <em>key.</em></h1>
  <p class="lede mt-1">This page does not exist, or it has moved. Pick up the song from here.</p>
  <div class="row mt-2"><a class="btn" href="index.html">Worship Connect home ${ICON.arrow}</a><a class="btn btn--ghost" href="videos.html">Watch every set</a></div>
  <ul class="nf__links mt-3">
    <li><a href="videos.html"><b>Videos</b><span>Every set, with song timestamps</span></a></li>
    <li><a href="join.html"><b>Join the team</b><span>Vocals, band, sound, media</span></a></li>
    <li><a href="team.html"><b>The team</b><span>Who leads worship</span></a></li>
    <li><a href="latest.html"><b>Latest</b><span>News from rehearsal</span></a></li>
    <li><a href="${MAIN}"><b>CCFC Zambia</b><span>The church website</span></a></li>
  </ul>
</div></section>` };
const pages = [home, videos, latest, team, join, notFound];
for (const p of pages){ SEO.lint(p, WSEO[p.file][0], WSEO[p.file][1]); const html = SEO.clean(layout(p)); if (/[—–]/.test(html)) { console.error('dash in', p.file); process.exit(1); } fs.writeFileSync(path.join(__dirname, p.file), html); }
fs.writeFileSync(path.join(__dirname, 'sitemap.xml'), SEO.sitemapXml(ORIGIN, pages.map(p => Object.assign({ priority: { 'videos.html':'0.9', 'join.html':'0.8', 'team.html':'0.7' }[p.file], changefreq: ['index.html','latest.html','videos.html'].includes(p.file) ? 'weekly' : 'monthly' }, p))));
fs.writeFileSync(path.join(__dirname, 'robots.txt'), SEO.robotsTxt(ORIGIN));
fs.writeFileSync(path.join(__dirname, 'site.webmanifest'), SEO.manifestJson({ name: 'Worship Connect', short: 'Worship Connect', themeColor: '#0A0A0B', background: '#0A0A0B' }));
console.log('built', pages.length, 'pages', V);

/* Knowledge base for Ozer, the AI assistant: the visible text of every page, rebuilt on each deploy (kb.json). */
function writeKb(pages, site){
  const strip = html => { const main = (html.match(/<main[^>]*>([\s\S]*?)<\/main>/) || [,''])[1];
    return main.replace(/<(script|style|svg|video|iframe|form)[\s\S]*?<\/\1>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;|&middot;|&amp;|&quot;|&#39;/g, m => ({'&nbsp;':' ','&middot;':'.','&amp;':'&','&quot;':'"','&#39;':"'"}[m])).replace(/\s+/g, ' ').trim().slice(0, 6000); };
  const out = { site, built: new Date().toISOString(), pages: pages.filter(p => !p.noindex).map(p => ({ url: site.origin + '/' + p.file.replace(/\.html$/, '').replace(/^index$/, ''), file: p.file, title: p.title, description: p.desc, text: strip(fs.readFileSync(path.join(__dirname, p.file), 'utf8')) })) };
  fs.writeFileSync(path.join(__dirname, 'kb.json'), JSON.stringify(out));
}

writeKb(pages, { key:'worship', name:'Worship Connect', origin:'https://worship.ccfczambia.org' });
