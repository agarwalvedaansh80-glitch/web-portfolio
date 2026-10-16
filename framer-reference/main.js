/* Overnight reference interactions.
   Every effect here is tagged with the Framer feature that rebuilds it. */
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasGsap = typeof window.gsap !== 'undefined';
  if (hasGsap && window.ScrollTrigger) gsap.registerPlugin(ScrollTrigger);
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const mobile = () => innerWidth < 810;

  /* ---------- Shutter + counter (Framer: component variants, On Tap -> next variant) ---------- */
  let left = 15;
  const roll = $('.hero .counter__roll');
  const flash = $('.hero .flash-overlay');
  function takeShot() {
    if (left <= 1) left = 16;
    left -= 1;
    roll.innerHTML = `${left + 1}<br>${left}`;
    roll.style.transition = 'none'; roll.style.transform = 'translateY(0)';
    roll.offsetHeight; // reflow
    roll.style.transition = ''; roll.style.transform = 'translateY(-26px)';
    if (hasGsap && !reduce) gsap.fromTo(flash, { opacity: .9 }, { opacity: 0, duration: .5, ease: 'power2.out' });
  }
  $('.hero .shutter').addEventListener('click', takeShot);

  /* ---------- Page-load sequence (Framer: Appear effect, Trigger = Page Load) ---------- */
  if (hasGsap && !reduce) {
    const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
    tl.from('.nav', { y: -30, opacity: 0, duration: 1 }, 0)
      .from('[data-load="1"]', { y: 20, opacity: 0, duration: .9 }, .15)
      .from('[data-load="2"]', { yPercent: 105, duration: 1.1 }, .2)
      // "develop" — the second line fades up out of a blur, like a print in the tray
      .from('[data-load="3"]', { opacity: 0, filter: 'blur(18px)', scale: 1.04, duration: 1.8, ease: 'power2.out' }, .55)
      .from('[data-load="4"]', { y: 24, opacity: 0, duration: 1 }, .7)
      .from('[data-load="5"]', { y: 24, opacity: 0, duration: 1 }, .8)
      .from('.hero__phone', { y: 220, rotate: 8, opacity: 0, duration: 1.4, ease: 'back.out(1.1)' }, .3)
      .from('.print--a', { x: 120, y: 80, rotate: 0, scale: .6, opacity: 0, duration: 1.2 }, .75)
      .from('.print--b', { x: -120, y: -40, rotate: 0, scale: .6, opacity: 0, duration: 1.2 }, .85)
      .from('.print--c', { x: 120, y: -60, rotate: 0, scale: .6, opacity: 0, duration: 1.2 }, .95)
      .add(() => takeShot(), 2.0)
      .eventCallback('onComplete', heroParallax);
  } else {
    setTimeout(takeShot, 600);
  }

  /* ---------- Hero parallax (Framer: Scroll Transform, Trigger = Page Scroll) ----------
     Created after the load sequence so the scroll tweens start from the settled layout. */
  function heroParallax() {
    if (!window.ScrollTrigger || reduce) return;
    $$('.hero [data-parallax]').forEach(el => {
      gsap.to(el, { y: +el.dataset.parallax, rotate: `+=${el.dataset.rot > 0 ? 6 : -6}`, ease: 'none',
        scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
    });
    gsap.to('.hero__phone', { y: 90, rotate: 4, ease: 'none',
      scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
  }

  if (hasGsap && window.ScrollTrigger && !reduce) {
    gsap.to('.hero__title', { y: -60, opacity: .25, ease: 'none',
      scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });

    /* ---------- Bento appear (Framer: Appear effect, Trigger = Layer in View, staggered delay) ---------- */
    gsap.from('[data-appear]', { y: 70, opacity: 0, duration: 1, ease: 'expo.out', stagger: .08,
      scrollTrigger: { trigger: '.bento', start: 'top 80%' } });

    /* ---------- Section headings rise (Framer: Appear, Layer in View) ---------- */
    $$('.h2').forEach(h => gsap.from(h, { y: 60, opacity: 0, duration: 1.1, ease: 'expo.out',
      scrollTrigger: { trigger: h, start: 'top 85%' } }));

    /* ---------- Sunrise (Framer: Scroll Transform, Trigger = Section "CTA") ---------- */
    gsap.fromTo('.cta__sun', { y: 260, scale: .8 }, { y: -40, scale: 1, ease: 'none',
      scrollTrigger: { trigger: '.cta', start: 'top bottom', end: 'bottom bottom', scrub: true } });

    /* ---------- Footer wordmark rise (Framer: Scroll Transform, Trigger = Section "Footer") ---------- */
    gsap.fromTo('.foot__word span', { yPercent: 60 }, { yPercent: 0, ease: 'none',
      scrollTrigger: { trigger: '.foot', start: 'top bottom', end: 'bottom bottom', scrub: true } });
  }

  if (hasGsap && window.ScrollTrigger) addEventListener('load', () => ScrollTrigger.refresh());

  /* ---------- Film strip (Framer: Ticker component, speed 40, hover factor 0.25) ---------- */
  const track = $('.strip__track');
  track.appendChild($('.strip__set').cloneNode(true)).setAttribute('aria-hidden', 'true');
  if (hasGsap && !reduce) {
    const tick = gsap.to(track, { xPercent: -50, duration: 48, ease: 'none', repeat: -1 });
    $('.strip').addEventListener('mouseenter', () => gsap.to(tick, { timeScale: .25, duration: .6 }));
    $('.strip').addEventListener('mouseleave', () => gsap.to(tick, { timeScale: 1, duration: .6 }));
  }

  /* ---------- How it works: sticky phone swaps screens per step (Framer: Sticky + Scroll Transform keyed to step sections) ---------- */
  const steps = $$('.step'), screens = $$('.scr');
  const setStep = n => {
    steps.forEach(s => s.classList.toggle('is-on', s.dataset.step === String(n)));
    screens.forEach(s => s.classList.toggle('is-on', s.dataset.screen === String(n)));
  };
  setStep(1);
  const io = new IntersectionObserver(es => es.forEach(e => e.isIntersecting && setStep(e.target.dataset.step)),
    { rootMargin: '-45% 0px -45% 0px' });
  steps.forEach(s => io.observe(s));

  /* ---------- Film looks chips (Framer: component with 3 variants, Hover/Tap on chip) ---------- */
  const lookImg = $('.looks-demo img');
  const looks = { dusk: 'img/look-dusk.webp', harbor: 'img/look-harbor.webp', bleach: 'img/look-bleach.webp' };
  Object.values(looks).forEach(src => { const i = new Image(); i.src = src; });
  lookImg.src = looks.dusk;
  $$('.looks-demo__chips em').forEach(chip => {
    const pick = () => {
      $$('.looks-demo__chips em').forEach(c => c.classList.toggle('on', c === chip));
      lookImg.src = looks[chip.dataset.look];
    };
    chip.addEventListener('mouseenter', pick); chip.addEventListener('click', pick);
  });
  // tap-friendly version of the counter hover on touch screens
  $('.tile--count').addEventListener('click', e => e.currentTarget.classList.toggle('is-shot'));

  /* ---------- Swipeable print stack (Framer: Drag on each card; or the SwipeStack code component in the guide) ---------- */
  const stack = $('#stack');
  let cards = $$('.card', stack);
  const frameNo = $('#frameNo');
  const tilts = [-3, 4, -6, 2, 5, -4, 3, -2];
  let seen = 1;
  function layout(animate = true) {
    cards.forEach((c, i) => {
      c.style.zIndex = String(cards.length - i);
      const t = `translate(${i * 3}px, ${i * 4}px) rotate(${i === 0 ? 0 : tilts[i % tilts.length]}deg) scale(${1 - Math.min(i, 4) * 0.02})`;
      c.style.transition = animate ? 'transform .6s cubic-bezier(.22,1,.36,1)' : 'none';
      c.style.transform = t;
      c.tabIndex = i === 0 ? 0 : -1;
    });
  }
  layout(false);
  function sendToBack(card, dirX, dirY = 0) {
    card.style.transition = 'transform .45s cubic-bezier(.4,0,.2,1)';
    card.style.transform = `translate(${dirX * 620}px, ${dirY * 0.6}px) rotate(${dirX * 24}deg)`;
    setTimeout(() => {
      cards = [...cards.slice(1), card];
      seen = seen % cards.length + 1;
      frameNo.textContent = seen;
      card.style.transition = 'none';
      layout(true);
    }, 380);
  }
  let drag = null;
  stack.addEventListener('pointerdown', e => {
    const card = e.target.closest('.card');
    if (!card || card !== cards[0]) return;
    drag = { card, x0: e.clientX, y0: e.clientY, dx: 0, dy: 0 };
    card.setPointerCapture(e.pointerId);
    card.style.transition = 'none';
  });
  stack.addEventListener('pointermove', e => {
    if (!drag) return;
    drag.dx = e.clientX - drag.x0; drag.dy = e.clientY - drag.y0;
    drag.card.style.transform = `translate(${drag.dx}px, ${drag.dy}px) rotate(${drag.dx * 0.06}deg)`;
  });
  const end = () => {
    if (!drag) return;
    const { card, dx, dy } = drag; drag = null;
    if (Math.abs(dx) > 110) sendToBack(card, Math.sign(dx), dy);
    else { card.style.transition = 'transform .6s cubic-bezier(.34,1.56,.64,1)'; card.style.transform = 'rotate(0deg)'; }
  };
  stack.addEventListener('pointerup', end);
  stack.addEventListener('pointercancel', end);
  $('#nextCard').addEventListener('click', () => sendToBack(cards[0], 1));
  stack.addEventListener('keydown', e => { if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') sendToBack(cards[0], e.key === 'ArrowRight' ? 1 : -1); });
  $('#reshuffle').addEventListener('click', () => {
    cards = $$('.card', stack); seen = 1; frameNo.textContent = 1; layout(true);
  });

  /* ---------- Waitlist form (Framer: Form Builder + Success variant) ---------- */
  const form = $('#form'), msg = $('#formMsg');
  form.addEventListener('submit', e => {
    e.preventDefault();
    const v = form.email.value.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) {
      msg.textContent = 'Enter an email address like name@example.com to join.';
      msg.classList.add('is-err'); form.email.focus(); return;
    }
    msg.classList.remove('is-err');
    form.classList.add('is-done');
    form.querySelector('button').textContent = 'You’re on the list';
    form.email.readOnly = true;
    msg.textContent = 'You’re on the list. We’ll email you when your invite is ready.';
  });

  /* ---------- FAQ: one open at a time (Framer: Accordion component, variants Open/Closed) ---------- */
  $$('.faq details').forEach(d => d.addEventListener('toggle', () => {
    if (d.open) $$('.faq details').forEach(o => o !== d && (o.open = false));
  }));
})();
