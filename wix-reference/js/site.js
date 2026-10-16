// Ondé reference interactions. Each block notes the Wix Studio feature that reproduces it.
(() => {
  const root = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];

  // Page-load sequence (Wix: Entrance animations on load — headline lines "Reveal" bottom, toned strands "Reveal" from left)
  const go = () => requestAnimationFrame(() => root.classList.add('loaded'));
  (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(go);
  setTimeout(go, 1200);

  // Mobile menu (Wix: Hamburger Menu element)
  const burger = $('.burger');
  if (burger) burger.addEventListener('click', () => {
    const open = root.classList.toggle('menu-open');
    burger.setAttribute('aria-expanded', open);
  });
  $$('.mnav a').forEach(a => a.addEventListener('click', () => root.classList.remove('menu-open')));

  // Entrance on scroll (Wix: Animations > Entrance, plays once when in view)
  $$('[data-d]').forEach(el => el.style.setProperty('--d', el.dataset.d + 's'));
  if ('IntersectionObserver' in window && !reduce) {
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -10% 0px', threshold: .08 });
    $$('[data-anim]').forEach(el => io.observe(el));
  } else $$('[data-anim]').forEach(el => el.classList.add('in'));

  // Scroll-linked effects (Wix: Animations > Scroll — "Parallax", "Pan", "Reveal")
  const par = $$('[data-parallax]'), pan = $$('[data-pan]');
  const steps = $('.steps'), ba = $('.ba');
  let baTouched = false;
  const prog = (el, a = 1, b = 0) => { // 0 when el top hits a*vh, 1 when el bottom hits b*vh
    const r = el.getBoundingClientRect(), vh = innerHeight;
    return Math.min(1, Math.max(0, (a * vh - r.top) / (r.height + (a - b) * vh)));
  };
  function onScroll() {
    if (reduce) return;
    const vh = innerHeight;
    par.forEach(el => { const r = el.parentElement.getBoundingClientRect(); const c = r.top + r.height / 2 - vh / 2; el.style.transform = `translate3d(0, ${(-c * parseFloat(el.dataset.parallax)).toFixed(1)}px, 0)`; });
    const k = Math.min(1, innerWidth / 1200) * (innerWidth < 640 ? .4 : 1);
    pan.forEach(el => { const p = prog(el); el.style.transform = `translate3d(${((p - .5) * parseFloat(el.dataset.pan) * k).toFixed(1)}px, 0, 0)`; });
    if (steps) {
      const p = Math.min(1, Math.max(0, prog(steps, .8, .55) * 1.25));
      steps.style.setProperty('--p', p.toFixed(3));
      $$('.step', steps).forEach((s, i, all) => s.classList.toggle('on', p >= (i / all.length) + .02 || p >= .99));
    }
    if (ba && !baTouched) { const p = prog(ba, .95, .2); setCut(92 - Math.min(1, p * 1.6) * 42); }
  }
  let ticking = false;
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(() => { onScroll(); ticking = false; }); } }, { passive: true });
  addEventListener('resize', onScroll);

  // Hero strands follow the pointer slightly (Wix: Animations > Mouse > "Track Mouse", soft)
  const track = $('[data-track]');
  if (track && !reduce && matchMedia('(pointer: fine)').matches) {
    let tx = 0, ty = 0, cx = 0, cy = 0;
    addEventListener('pointermove', e => { tx = (e.clientX / innerWidth - .5) * -28; ty = (e.clientY / innerHeight - .5) * -16; });
    (function loop() { cx += (tx - cx) * .06; cy += (ty - cy) * .06; track.style.transform = `translate3d(${cx.toFixed(2)}px, ${cy.toFixed(2)}px, 0)`; requestAnimationFrame(loop); })();
  }

  // Before / after slider
  function setCut(v) { if (ba) { ba.style.setProperty('--cut', v + '%'); const i = $('input', ba); if (i) i.value = v; } }
  if (ba) {
    const inp = $('input', ba);
    inp.addEventListener('input', () => { baTouched = true; setCut(inp.value); });
    // Pointer drag anywhere on the image (Wix: "Before & After Slider" app, or Scroll "Reveal" only)
    let drag = false;
    const at = e => { const r = ba.getBoundingClientRect(); baTouched = true; setCut(Math.round(Math.min(100, Math.max(0, (e.clientX - r.left) / r.width * 100)))); };
    ba.addEventListener('pointerdown', e => { drag = true; ba.setPointerCapture(e.pointerId); at(e); e.preventDefault(); });
    ba.addEventListener('pointermove', e => { if (drag) at(e); });
    ba.addEventListener('pointerup', () => drag = false); ba.addEventListener('pointercancel', () => drag = false);
    if (reduce) setCut(50);
  }

  // Tabs (Wix: Tabs element)
  $$('[role="tablist"]').forEach(list => {
    const tabs = $$('[role="tab"]', list), ind = $('.tab-ind', list);
    const place = t => { if (ind) { ind.style.left = t.offsetLeft + 'px'; ind.style.width = t.offsetWidth + 'px'; } };
    const select = (t, focus) => {
      tabs.forEach(x => { const on = x === t; x.setAttribute('aria-selected', on); x.tabIndex = on ? 0 : -1; const p = document.getElementById(x.getAttribute('aria-controls')); p.hidden = !on; p.classList.toggle('show', on); });
      place(t); if (focus) t.focus();
    };
    tabs.forEach((t, i) => {
      t.addEventListener('click', () => select(t));
      t.addEventListener('keydown', e => { const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0; if (d) { e.preventDefault(); select(tabs[(i + d + tabs.length) % tabs.length], true); } });
    });
    const first = tabs.find(t => t.getAttribute('aria-selected') === 'true') || tabs[0];
    requestAnimationFrame(() => place(first));
    (document.fonts ? document.fonts.ready : Promise.resolve()).then(() => place(tabs.find(t => t.getAttribute('aria-selected') === 'true')));
    addEventListener('resize', () => place(tabs.find(t => t.getAttribute('aria-selected') === 'true')));
  });

  // FAQ height animation (Wix: Accordion element, "animate on open")
  $$('.faq details').forEach(d => {
    const s = $('summary', d), a = $('.ans', d);
    s.addEventListener('click', e => {
      if (reduce) return; e.preventDefault();
      if (d.open) { a.animate([{ height: a.offsetHeight + 'px', opacity: 1 }, { height: '0px', opacity: 0 }], { duration: 380, easing: 'cubic-bezier(.2,.7,.1,1)' }).onfinish = () => d.open = false; }
      else { d.open = true; const h = a.offsetHeight; a.animate([{ height: '0px', opacity: 0 }, { height: h + 'px', opacity: 1 }], { duration: 480, easing: 'cubic-bezier(.2,.7,.1,1)' }); }
    });
  });

  // Booking data — mirrors three Wix Bookings demo services
  const SERVICES = {
    consult: { name: 'Colour consultation', dur: '15 min', price: 'Free', len: 15 },
    root: { name: 'Root colour & gloss', dur: '2 hr', price: '£95', len: 120 },
    cut: { name: 'Restyle cut & finish', dur: '1 hr 15 min', price: '£72', len: 75 },
  };
  const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const MON = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const open = d => d.getDay() >= 2; // Tue–Sat
  function slotsFor(date, svc) {
    if (!open(date)) return [];
    const startH = date.getDay() === 6 ? 9 : 10, endH = date.getDay() === 6 ? 17 : (date.getDay() >= 4 ? 20 : 19);
    const out = []; let seed = date.getDate() * 31 + date.getMonth() * 7 + svc.length;
    for (let m = startH * 60; m + SERVICES[svc].len <= endH * 60; m += svc === 'consult' ? 30 : 60) {
      seed = (seed * 9301 + 49297) % 233280; if (seed / 233280 > .45) out.push(m);
    }
    return out.slice(0, 8);
  }
  const fmt = m => `${Math.floor(m / 60) % 12 || 12}:${String(m % 60).padStart(2, '0')} ${m < 720 ? 'am' : 'pm'}`;

  // Home mini-widget (Wix: static design; buttons link to /book where the real Wix Bookings calendar lives)
  const w = $('.widget[data-mini]');
  if (w) {
    let svc = 'root', day = null, slot = null;
    const days = $('.days', w), slots = $('.slots', w), sum = $('.w-sum', w), cta = $('.w-cta', w);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const list = [...Array(7)].map((_, i) => new Date(today.getTime() + (i + 1) * 864e5));
    days.innerHTML = list.map((d, i) => `<button class="day" data-i="${i}" ${open(d) ? '' : 'disabled'} aria-pressed="false" aria-label="${WD[d.getDay()]} ${d.getDate()} ${MON[d.getMonth()]}${open(d) ? '' : ', closed'}">${WD[d.getDay()]}<b>${d.getDate()}</b></button>`).join('');
    const render = () => {
      $$('.chip', w).forEach(c => c.setAttribute('aria-pressed', c.dataset.svc === svc));
      $$('.day', days).forEach(b => b.setAttribute('aria-pressed', +b.dataset.i === day));
      const s = day == null ? [] : slotsFor(list[day], svc);
      slots.innerHTML = s.length ? s.map((m, i) => `<button class="slot" style="animation-delay:${i * 40}ms" data-m="${m}" aria-pressed="${m === slot}">${fmt(m)}</button>`).join('') : `<p class="small" style="grid-column:1/-1;color:var(--ink-soft)">${day == null ? 'Choose a day to see open times.' : 'No open times that day.'}</p>`;
      const S = SERVICES[svc];
      sum.innerHTML = slot != null ? `<b>${S.name}</b>, ${WD[list[day].getDay()]} ${list[day].getDate()} at ${fmt(slot)}` : `<b>${S.name}</b>, ${S.dur}, ${S.price}`;
      cta.textContent = slot != null ? 'Continue booking' : 'See all times';
      cta.href = `book.html?service=${svc}`;
    };
    w.addEventListener('click', e => {
      const c = e.target.closest('.chip'), d = e.target.closest('.day'), s = e.target.closest('.slot');
      if (c) { svc = c.dataset.svc; slot = null; render(); }
      if (d && !d.disabled) { day = +d.dataset.i; slot = null; render(); }
      if (s) { slot = +s.dataset.m; render(); }
    });
    day = list.findIndex(open); render();
  }

  // Book page flow (Wix: Bookings — Service List page > Booking Calendar > Booking Form)
  const bk = $('#booking');
  if (bk) {
    const st = { svc: new URLSearchParams(location.search).get('service'), date: null, slot: null, view: new Date() };
    st.view.setDate(1);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const show = n => {
      $$('[data-step]', bk).forEach(s => s.hidden = s.dataset.step !== String(n));
      $$('.bsteps li').forEach((li, i) => { li.className = i + 1 === n ? 'on' : i + 1 < n ? 'done' : ''; });
      if (n !== 'done') { const top = bk.getBoundingClientRect().top + scrollY - 120; if (scrollY > top) scrollTo({ top, behavior: reduce ? 'auto' : 'smooth' }); }
    };
    const month = $('.month', bk), mtitle = $('.cal-top h3', bk), slotsEl = $('.slots', bk);
    const sumEl = $('.summary dl', bk), next = $('#to-details', bk);
    function drawMonth() {
      const y = st.view.getFullYear(), m = st.view.getMonth(); mtitle.textContent = `${MON[m]} ${y}`;
      const first = (new Date(y, m, 1).getDay() + 6) % 7, n = new Date(y, m + 1, 0).getDate();
      let h = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => `<span class="wd">${d}</span>`).join('') + '<span></span>'.repeat(first);
      for (let d = 1; d <= n; d++) {
        const dt = new Date(y, m, d); const av = dt > today && open(dt) && slotsFor(dt, st.svc).length;
        const sel = st.date && dt.getTime() === st.date.getTime();
        h += `<button ${av ? 'class="av"' : 'disabled'} data-d="${d}" aria-pressed="${!!sel}" aria-label="${d} ${MON[m]}${av ? ', times available' : ''}">${d}</button>`;
      }
      month.innerHTML = h;
    }
    function drawSlots() {
      const s = st.date ? slotsFor(st.date, st.svc) : [];
      slotsEl.innerHTML = s.length ? s.map((m, i) => `<button class="slot" style="animation-delay:${i * 40}ms" data-m="${m}" aria-pressed="${m === st.slot}">${fmt(m)}</button>`).join('') : `<p class="small" style="grid-column:1/-1;color:var(--ink-soft)">Choose a date with a dot to see open times.</p>`;
    }
    function drawSum() {
      const S = SERVICES[st.svc] || {};
      sumEl.innerHTML = `<div><dt>Service</dt><dd>${S.name || 'Not chosen'}</dd></div><div><dt>Duration and price</dt><dd>${S.dur ? S.dur + ', ' + S.price : '-'}</dd></div><div><dt>Date and time</dt><dd>${st.date ? `${WD[st.date.getDay()]} ${st.date.getDate()} ${MON[st.date.getMonth()]}${st.slot != null ? ', ' + fmt(st.slot) : ''}` : 'Not chosen'}</dd></div><div><dt>With</dt><dd>First available colourist</dd></div>`;
      next.disabled = st.slot == null; next.setAttribute('aria-disabled', st.slot == null);
    }
    const pickSvc = k => {
      st.svc = k; st.date = null; st.slot = null; st.view = new Date(); st.view.setDate(1);
      // jump to first available date
      for (let i = 1; i < 40; i++) { const d = new Date(today.getTime() + i * 864e5); if (open(d) && slotsFor(d, k).length) { st.date = d; st.view = new Date(d.getFullYear(), d.getMonth(), 1); break; } }
      drawMonth(); drawSlots(); drawSum(); show(2);
    };
    $$('[data-pick]', bk).forEach(b => b.addEventListener('click', () => pickSvc(b.dataset.pick)));
    month.addEventListener('click', e => { const b = e.target.closest('button'); if (!b || b.disabled) return; st.date = new Date(st.view.getFullYear(), st.view.getMonth(), +b.dataset.d); st.slot = null; drawMonth(); drawSlots(); drawSum(); });
    slotsEl.addEventListener('click', e => { const b = e.target.closest('.slot'); if (!b) return; st.slot = +b.dataset.m; drawSlots(); drawSum(); });
    $$('.cal-nav button', bk).forEach(b => b.addEventListener('click', () => { st.view = new Date(st.view.getFullYear(), st.view.getMonth() + (+b.dataset.dir), 1); drawMonth(); }));
    next.addEventListener('click', () => { if (st.slot != null) { $('#chosen').textContent = `${SERVICES[st.svc].name}, ${WD[st.date.getDay()]} ${st.date.getDate()} ${MON[st.date.getMonth()]} at ${fmt(st.slot)}`; show(3); } });
    $$('[data-back]', bk).forEach(b => b.addEventListener('click', () => show(+b.dataset.back)));
    $('#details', bk).addEventListener('submit', e => { e.preventDefault(); if (!e.target.reportValidity()) return; $('#done-when').textContent = $('#chosen').textContent; show('done'); });
    if (st.svc && SERVICES[st.svc]) pickSvc(st.svc); else show(1);
  }

  // Contact form (Wix: Wix Forms, success message)
  const cf = $('#contact-form');
  if (cf) cf.addEventListener('submit', e => { e.preventDefault(); if (!cf.reportValidity()) return; cf.hidden = true; $('#contact-done').hidden = false; });

  onScroll();
})();
