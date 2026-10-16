/* Slotted reference interactions.
   Every effect here mirrors a native Webflow Interaction so the Webflow build can reproduce it:
   - [data-load]      -> Page trigger "Page load" (initial state + animate to final)
   - [data-reveal]    -> Element trigger "Scroll into view" (offset 15%)
   - [data-scrub]     -> Element trigger "While scrolling in view" (keyframes at 0-100%)
                         or Page trigger "While page is scrolling" (t:"page")
   - pricing tabs     -> Webflow Tabs component (fade in 300ms / out 100ms)
   - FAQ              -> Mouse click: height 0 -> auto, icon rotate 0 -> 45deg
*/
(function () {
  var root = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Page load */
  var loaded = false;
  function go() { if (loaded) return; loaded = true; requestAnimationFrame(function () { root.classList.add('is-loaded'); }); }
  if (document.fonts && document.fonts.ready) {
    Promise.race([document.fonts.ready, new Promise(function (r) { setTimeout(r, 900); })]).then(go);
  } else { go(); }

  /* Navbar (Webflow Navbar component handles this natively) */
  var nav = document.querySelector('.navbar');
  var burger = document.querySelector('.navbar_burger');
  if (nav && burger) {
    burger.addEventListener('click', function () {
      var open = nav.classList.toggle('is-open');
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    nav.querySelectorAll('.navbar_menu a').forEach(function (a) {
      a.addEventListener('click', function () { nav.classList.remove('is-open'); burger.setAttribute('aria-expanded', 'false'); });
    });
  }

  /* Scroll into view */
  var revealEls = document.querySelectorAll('[data-reveal]');
  if ('IntersectionObserver' in window && !reduce) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -15% 0px' });
    revealEls.forEach(function (el) { io.observe(el); });
  } else { revealEls.forEach(function (el) { el.classList.add('is-in'); }); }

  /* While scrolling in view (keyframe scrubbing) */
  function parse(v) {
    if (typeof v === 'number') return { n: v, u: 'px' };
    var m = String(v).match(/^(-?[\d.]+)(px|%|vh|vw|rem)?$/);
    return { n: parseFloat(m[1]), u: m[2] || 'px' };
  }
  var items = [];
  document.querySelectorAll('[data-scrub]').forEach(function (el) {
    var c = JSON.parse(el.getAttribute('data-scrub'));
    items.push({ el: el, t: c.t === 'page' ? 'page' : (c.t ? document.querySelector(c.t) : el), k: c.k, desk: !!c.desktop, cur: null });
  });
  function progress(it) {
    if (it.t === 'page') {
      var max = document.documentElement.scrollHeight - innerHeight;
      return max > 0 ? Math.min(100, Math.max(0, scrollY / max * 100)) : 0;
    }
    var r = it.t.getBoundingClientRect();
    var p = (innerHeight - r.top) / (r.height + innerHeight) * 100;
    return Math.min(100, Math.max(0, p));
  }
  function frameAt(k, p) {
    if (p <= k[0][0]) return k[0][1];
    if (p >= k[k.length - 1][0]) return k[k.length - 1][1];
    for (var i = 0; i < k.length - 1; i++) {
      var a = k[i], b = k[i + 1];
      if (p >= a[0] && p <= b[0]) {
        var f = (p - a[0]) / ((b[0] - a[0]) || 1), out = {};
        Object.keys(a[1]).forEach(function (key) {
          var va = parse(a[1][key]), vb = parse(b[1][key] !== undefined ? b[1][key] : a[1][key]);
          out[key] = { n: va.n + (vb.n - va.n) * f, u: va.u };
        });
        return out;
      }
    }
  }
  function norm(o) { var r = {}; Object.keys(o).forEach(function (k) { r[k] = typeof o[k] === 'object' && o[k].n !== undefined ? o[k] : parse(o[k]); }); return r; }
  function apply(el, o) {
    var t = [];
    if (o.x || o.y) t.push('translate(' + (o.x ? o.x.n + o.x.u : 0) + ',' + (o.y ? o.y.n + o.y.u : 0) + ')');
    if (o.s) t.push('scale(' + o.s.n + ')');
    if (o.sx) t.push('scaleX(' + o.sx.n + ')');
    if (o.sy) t.push('scaleY(' + o.sy.n + ')');
    if (o.rx) t.push('rotateX(' + o.rx.n + 'deg)');
    if (o.rz) t.push('rotate(' + o.rz.n + 'deg)');
    el.style.transform = t.join(' ');
    if (o.o) el.style.opacity = o.o.n;
  }
  var desktopMQ = window.matchMedia('(min-width: 992px)');
  var ticking = false;
  function update() {
    ticking = false;
    var again = false;
    items.forEach(function (it) {
      if (it.desk && !desktopMQ.matches) { it.el.style.transform = ''; it.el.style.opacity = ''; it.cur = null; return; }
      var target = norm(frameAt(it.k, progress(it)));
      if (!it.cur) it.cur = target;
      else {
        Object.keys(target).forEach(function (k) {
          var d = target[k].n - it.cur[k].n;
          if (Math.abs(d) > 0.002) { it.cur[k] = { n: it.cur[k].n + d * 0.2, u: target[k].u }; again = true; }
          else it.cur[k] = target[k];
        });
      }
      apply(it.el, it.cur);
    });
    if (again) request();
  }
  function request() { if (!ticking) { ticking = true; requestAnimationFrame(update); } }
  if (!reduce && items.length) {
    addEventListener('scroll', request, { passive: true });
    addEventListener('resize', request);
    request();
  }

  /* Pricing tabs (Webflow Tabs) */
  document.querySelectorAll('[data-tabs]').forEach(function (tabs) {
    var links = tabs.querySelectorAll('.pricing_tab-link');
    var panes = tabs.querySelectorAll('.pricing_tab-pane');
    links.forEach(function (l) {
      l.addEventListener('click', function (e) {
        e.preventDefault();
        links.forEach(function (x) { x.classList.toggle('w--current', x === l); x.setAttribute('aria-selected', x === l ? 'true' : 'false'); });
        panes.forEach(function (p) { p.classList.toggle('w--tab-active', p.getAttribute('data-pane') === l.getAttribute('data-tab')); });
      });
    });
  });

  /* FAQ accordion (Webflow click interaction: height 0 -> auto) */
  document.querySelectorAll('.faq_item').forEach(function (item) {
    var q = item.querySelector('.faq_question'), a = item.querySelector('.faq_answer');
    q.addEventListener('click', function () {
      var open = !item.classList.contains('is-open');
      item.classList.toggle('is-open', open);
      q.setAttribute('aria-expanded', open ? 'true' : 'false');
      if (open) {
        a.style.height = a.scrollHeight + 'px';
        a.addEventListener('transitionend', function te() { if (item.classList.contains('is-open')) a.style.height = 'auto'; a.removeEventListener('transitionend', te); });
      } else {
        a.style.height = a.scrollHeight + 'px';
        requestAnimationFrame(function () { requestAnimationFrame(function () { a.style.height = '0px'; }); });
      }
    });
  });
})();
