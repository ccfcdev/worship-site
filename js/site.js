/* KOINONIA EXPERIENCE — motion. Dependency-free, degrades to static. */
(() => {
'use strict';
const Q = new URLSearchParams(location.search), IS_CAP = Q.has('cap');
if (IS_CAP){ const st = document.createElement('style'); st.textContent = `.grain{display:none!important}*{transition:none!important;animation:none!important}[data-rv],[data-rv-stagger]>*{opacity:1!important;transform:none!important}.ml>span{transform:none!important}.hero__media video{display:none}`; document.documentElement.appendChild(st); }
const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = (s, r=document) => r.querySelector(s), $$ = (s, r=document) => [...r.querySelectorAll(s)];
const Bus = (() => { const subs = new Set(); let t = false, y = 0; addEventListener('scroll', () => { y = scrollY; if (!t){ t = true; requestAnimationFrame(() => { t = false; subs.forEach(f => f(y)); }); } }, {passive:true}); return { add(f){ subs.add(f); f(scrollY); } }; })();

function grain(){ if (RM || IS_CAP) return; const c = document.createElement('canvas'); c.width = c.height = 180; const x = c.getContext('2d'), d = x.createImageData(180,180), p = d.data;
  for (let i=0;i<p.length;i+=4){ const v = Math.random()*255; p[i]=p[i+1]=p[i+2]=v; p[i+3]=40; } x.putImageData(d,0,0);
  document.documentElement.style.setProperty('--grain-url',`url(${c.toDataURL()})`); const g = document.createElement('div'); g.className='grain'; document.body.appendChild(g); }
function split(){ $$('[data-split]').forEach(el => { el.innerHTML = el.innerHTML.split(/<br\s*\/?>/i).map(l => `<span class="ml"><span>${l.trim()}</span></span>`).join(''); if (!el.hasAttribute('data-rv')) el.setAttribute('data-rv',''); }); }
function reveals(){ const els = $$('[data-rv],[data-rv-stagger]'); if (RM || IS_CAP || !('IntersectionObserver' in window)){ els.forEach(e => e.classList.add('is-rv')); return; }
  const io = new IntersectionObserver(es => es.forEach(en => { if (en.isIntersecting){ en.target.classList.add('is-rv'); io.unobserve(en.target); } }), {rootMargin:'0px 0px -10% 0px', threshold:.06}); els.forEach(e => io.observe(e)); }
function nav(){ const n = $('.nav'); if (!n) return; const hero = $('.hero'); Bus.add(y => n.classList.toggle('is-solid', y > (hero ? hero.offsetHeight - 120 : 40)));
  const menu = $('.menu'), veil = $('.menu__veil'), open = $('.nav__burger'), close = $('.menu__close'); if (!menu) return;
  const t = on => { menu.classList.toggle('is-open', on); veil && veil.classList.toggle('is-open', on); document.body.style.overflow = on ? 'hidden' : ''; open.setAttribute('aria-expanded', on); (on ? close : open).focus(); };
  open.addEventListener('click', () => t(true)); close.addEventListener('click', () => t(false)); veil && veil.addEventListener('click', () => t(false));
  $$('.menu a', menu).forEach(a => a.addEventListener('click', () => { if (a.getAttribute('href').startsWith('#')) t(false); }));
  addEventListener('keydown', e => { if (e.key === 'Escape' && menu.classList.contains('is-open')) t(false); }); }
function hero(){ const h = $('.hero'); if (!h) return; const v = $('video', h); if (v && !RM && !IS_CAP){ const conn = navigator.connection || {}; const slow = !!conn.saveData || ['slow-2g','2g','3g'].includes(conn.effectiveType); const px = Math.max(screen.width, screen.height) * (devicePixelRatio || 1); const pick = slow ? null : (px >= 2560 && (conn.downlink || 10) >= 10 && v.dataset.src4k) ? v.dataset.src4k : (Math.min(screen.width, screen.height) * (devicePixelRatio || 1) < 1100 || innerWidth < 900) && v.dataset.src720 ? v.dataset.src720 : v.dataset.src; if (pick) v.src = pick; v.muted = true; const p = v.play(); p && p.catch && p.catch(()=>{}); }
  if (RM || IS_CAP) return; const m = $('.hero__media', h), c = $('.hero__copy', h);
  Bus.add(y => { if (y > innerHeight*1.2) return; const t = Math.min(1, y/innerHeight); if (m) m.style.transform = `translate3d(0,${(y*.35).toFixed(1)}px,0) scale(${1+t*.08})`; if (c){ c.style.transform = `translate3d(0,${(y*.18).toFixed(1)}px,0)`; c.style.opacity = 1 - t*1.25; } }); }
function lightbox(){ const tr = $$('[data-lb]'); if (!tr.length) return; const lb = document.createElement('div'); lb.className='lb'; lb.setAttribute('role','dialog'); lb.setAttribute('aria-modal','true');
  lb.innerHTML = `<button class="lb__close" aria-label="Close video"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 6l12 12M18 6L6 18"/></svg></button><div class="lb__frame"><div class="lb__box"></div><p class="lb__title"></p></div>`; document.body.appendChild(lb);
  const box = $('.lb__box', lb), title = $('.lb__title', lb), cb = $('.lb__close', lb); let last = null;
  const open = (id, t, start) => { last = document.activeElement; box.innerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0${start ? '&start=' + start : ''}" title="${t}" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe>`; title.textContent = t; lb.classList.add('is-open'); document.body.style.overflow='hidden'; cb.focus(); };
  const close = () => { lb.classList.remove('is-open'); box.innerHTML=''; document.body.style.overflow=''; last && last.focus(); };
  tr.forEach(t => t.addEventListener('click', e => { e.preventDefault(); open(t.dataset.lb, t.dataset.title || 'Video', +t.dataset.start || 0); })); cb.addEventListener('click', close); lb.addEventListener('click', e => { if (e.target === lb) close(); }); addEventListener('keydown', e => { if (e.key === 'Escape' && lb.classList.contains('is-open')) close(); });
  const v = Q.get('lb'); if (v){ const t = tr.find(x => x.dataset.lb === v); if (t) open(v, t.dataset.title, +Q.get('t') || 0); } }
function countdown(){ const el = $('[data-countdown]'); if (!el) return; const to = new Date(el.dataset.countdown); if (isNaN(to)) return;
  const tick = () => { const d = Math.max(0, to - Date.now())/1000; const set = (k,v) => { const e = $(`[data-cd=${k}]`, el); if (e) e.textContent = String(v).padStart(2,'0'); };
    set('d', Math.floor(d/86400)); set('h', Math.floor(d%86400/3600)); set('m', Math.floor(d%3600/60)); set('s', Math.floor(d%60)); }; tick(); if (!IS_CAP) setInterval(tick, 1000); }
function capture(){ if (!IS_CAP) return; const y = +(Q.get('y')||0); const apply = () => { document.body.style.transform = `translateY(-${y}px)`; }; addEventListener('load', () => setTimeout(apply, 300)); setTimeout(apply, 1500); }
function register(){ const f = $('.reg'); if (!f) return; const g = $('.reg__gform'), status = $('.reg__status', f), map = window.KOI_GFORM || {};
  f.addEventListener('submit', async e => { e.preventDefault(); let ok = true;
    $$('.field', f).forEach(fl => { const inp = $('input:not([type=radio]):not([type=checkbox]), select, textarea', fl); if (!inp) return; const bad = inp.required && !inp.value.trim() || (inp.type === 'email' && inp.value && !/^\S+@\S+\.\S+$/.test(inp.value)); fl.classList.toggle('is-invalid', bad); if (bad) ok = false; });
    const part = f.querySelector('input[name=participation]:checked'); const days = $$('input[name=days]:checked', f).map(x => x.value);
    if (!part || !days.length) ok = false;
    if (!ok){ status.textContent = 'Please complete the highlighted fields, your role and the days.'; status.className = 'reg__status is-err'; return; }
    const d = { first: f.first.value.trim(), surname: f.surname.value.trim(), gender: f.gender.value, age: f.age.value, residence: f.residence.value.trim(), phone: f.phone.value.trim(), email: f.email.value.trim(), participation: part.value, detail: f.detail.value.trim(), days: days.includes('Both') ? 'Both' : days.join(', '), dietary: f.dietary.value.trim(), expectation: f.expectation.value.trim() };
    status.className = 'reg__status'; status.textContent = 'Sending...'; const btn = $('.btn', f); btn.disabled = true;
    try { if (g){ Object.entries(map).forEach(([k, name]) => { const inp = g.querySelector(`[name="${name}"]`); if (inp) inp.value = d[k] ?? ''; }); g.submit(); }
      if (window.CCFC && window.CCFC.register) await window.CCFC.register({ site:'koinonia', edition: f.dataset.edition, first_name:d.first, surname:d.surname, gender:d.gender, age_range:d.age, residence:d.residence, phone:d.phone, email:d.email, participation:d.participation, participation_detail:d.detail, days:d.days, dietary:d.dietary, expectation:d.expectation });
      f.reset(); status.textContent = 'Registered. Thank you, ' + d.first + '. We will be in touch with dates and delegate rates.'; status.className = 'reg__status is-ok';
    } catch (err){ status.textContent = 'Something went wrong. Please try again or WhatsApp the office.'; status.className = 'reg__status is-err'; } finally { btn.disabled = false; } }); }
function tabs(){ $$('.tabs').forEach(t => { const bs = $$('.tabs__btn', t), ps = $$('.tabs__panel', t); const go = i => { bs.forEach((b,j) => b.classList.toggle('is-on', j===i)); ps.forEach((p,j) => p.hidden = j!==i); }; bs.forEach((b,i) => b.addEventListener('click', () => go(i))); go(+(Q.get('tab')||0)||0); }); }
function joinForm(){ const f = $('.join'); if (!f) return; const status = $('.reg__status', f);
  f.addEventListener('submit', async e => { e.preventDefault(); const d = Object.fromEntries(new FormData(f).entries());
    if (!d.name.trim() || !d.phone.trim()){ status.textContent = 'Your name and WhatsApp number are needed.'; status.className = 'reg__status is-err'; return; }
    const btn = $('.btn', f); btn.disabled = true; status.className = 'reg__status'; status.textContent = 'Sending...';
    const text = `Hello Worship Connect, I would like to join.\nName: ${d.name}\nPhone: ${d.phone}\nI can: ${d.gift}\nExperience: ${d.experience || '-'}\nChurch: ${d.church || '-'}`;
    const wa = `https://wa.me/${f.dataset.wa}?text=${encodeURIComponent(text)}`;
    try { const api = window.CCFC && window.CCFC.apply ? await window.CCFC.apply({ name:d.name.trim(), phone:d.phone.trim(), email:d.email?.trim() || null, gift:d.gift, experience:d.experience?.trim() || null, church:d.church?.trim() || null, message:d.message?.trim() || null }) : { offline:true };
      if (api.error) throw api.error;
      f.reset(); status.innerHTML = `Thank you, ${d.name.split(' ')[0]}. The team has your application and will reply on WhatsApp. <a href="${wa}" target="_blank" rel="noopener">Say hello on WhatsApp now</a> if you like.`; status.className = 'reg__status is-ok';
    } catch (err){ status.innerHTML = `We could not save that. <a href="${wa}" target="_blank" rel="noopener">Send it on WhatsApp instead</a>.`; status.className = 'reg__status is-err'; } finally { btn.disabled = false; } }); }
function revealSafety(){ const inView = () => $$('[data-rv]:not(.is-rv),[data-rv-stagger]:not(.is-rv)').forEach(e => { const r = e.getBoundingClientRect(); if (r.top < innerHeight && r.bottom > 0) e.classList.add('is-rv'); });
  const target = () => { const id = location.hash.slice(1); const t = id && document.getElementById(id); if (t) $$('[data-rv],[data-rv-stagger]', t).forEach(e => e.classList.add('is-rv')); inView(); };
  addEventListener('hashchange', () => setTimeout(target, 50)); addEventListener('pageshow', () => setTimeout(target, 50)); setTimeout(target, 400); setTimeout(inView, 1800); }
function boot(){ register(); tabs(); joinForm(); split(); grain(); nav(); reveals(); revealSafety(); hero(); lightbox(); countdown(); capture(); $$('.year').forEach(e => e.textContent = new Date().getFullYear()); }
document.readyState === 'loading' ? addEventListener('DOMContentLoaded', boot) : boot();
})();
