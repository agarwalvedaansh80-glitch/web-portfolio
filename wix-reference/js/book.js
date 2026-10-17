/* Ondé booking flow (front-end preview of Wix Bookings): service → date & time → details → confirmation.
   Nothing is sent anywhere. */
(function () {
  'use strict';
  var O = window.Onde || {}, RM = O.RM, doc = document;
  var $ = function (s, r) { return (r || doc).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || doc).querySelectorAll(s)); };
  var root = $('#booking'); if (!root) return;
  var Q = new URLSearchParams(location.search);
  var panes = $$('.bk-pane', root), stepLis = $$('.bk-steps li', root), line = $('.bk-steps-line i', root);
  var grid = $('.cal-grid', root), monthEl = $('.cal-m', root), slotsEl = $('.slots', root);
  var next2 = $('[data-next="2"]', root), next3 = $('[data-next="3"]', root), form = $('#bk-form');
  var S = { svc: null, with: 'any', date: null, time: null, step: 1 };
  var WITH = { any: 'First available', mira: 'Mira Castell', jonah: 'Jonah Reyes', adaeze: 'Adaeze Kole' };
  var SHADE = { dark: 'Natural dark brown', mid: 'Soft mid-brown', dblonde: 'Dark blonde', brassy: 'Brassy blonde', fcopper: 'Faded copper', grey: 'Grey coming through', pearl: 'Pearl blonde', honey: 'Honey balayage', copper: 'Rich copper', rose: 'Rose gold', ash: 'Cool ash brown', espresso: 'Glossy espresso' };
  var ALIAS = { cut: 'restyle', colour: 'root', location: 'consult', correction: 'consult', lightening: 'consult', fringe: 'reshape', scalp: 'bond', glossadd: 'gloss' };
  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  var DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  var HOURS = { 2: [10, 19], 3: [10, 19], 4: [10, 20], 5: [10, 20], 6: [9, 17] };

  function mins(d) { var m = /(\d+)\s*hr(?:\s*(\d+))?/.exec(d); if (m) return +m[1] * 60 + (+m[2] || 0); m = /(\d+)\s*min/.exec(d); return m ? +m[1] : 60; }
  function hash(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0); }
  function ymd(d) { return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function hm(m) { return ('0' + Math.floor(m / 60)).slice(-2) + ':' + ('0' + m % 60).slice(-2); }
  function nice(d) { return DAYS[d.getDay()] + ' ' + d.getDate() + ' ' + MONTHS[d.getMonth()]; }

  function sum(k, v) {
    var dd = $('[data-sum=' + k + ']'); if (!dd || dd.textContent === v) return;
    dd.textContent = v; dd.classList.remove('flash'); void dd.offsetWidth; dd.classList.add('flash');
  }
  function setStep(n, back) {
    var cur = panes[S.step - 1], nxt = panes[n - 1]; if (cur === nxt) return;
    S.step = n; syncGo();
    stepLis.forEach(function (li, i) { li.classList.toggle('is-on', i === n - 1); li.classList.toggle('is-done', i < n - 1); if (i === n - 1) li.setAttribute('aria-current', 'step'); else li.removeAttribute('aria-current'); });
    var from = parseFloat(getComputedStyle(line).getPropertyValue('--p')) || 1 / 3, to = n / 3;
    if (O.tween) O.tween({ dur: 900, ease: O.E.io, update: function (e) { line.style.setProperty('--p', (from + (to - from) * e).toFixed(4)); } });
    var top = root.getBoundingClientRect().top;
    if (top < 0 && O.scrollToEl) O.scrollToEl(root, 90);
    cur.classList.add(back ? 'is-out-back' : 'is-out');
    setTimeout(function () {
      cur.hidden = true; cur.classList.remove('is-out', 'is-out-back', 'is-on');
      nxt.hidden = false; nxt.classList.add('is-on', back ? 'is-in-back' : 'is-in');
      var h = $('.bk-h', nxt); if (h) h.focus({ preventScroll: true });
      setTimeout(function () { nxt.classList.remove('is-in', 'is-in-back'); }, 900);
    }, RM ? 0 : 430);
  }
  $$('[data-next]', root).forEach(function (b) { b.addEventListener('click', function () { setStep(+b.getAttribute('data-next')); }); });
  // the summary card carries the next action too, so it is always in reach
  var go = $('[data-sum-go]');
  function syncGo() {
    if (!go) return;
    var lbl = S.step === 1 ? 'Choose a time' : S.step === 2 ? 'Your details' : '';
    go.hidden = S.step === 3; $('span', go).textContent = lbl;
    go.disabled = S.step === 1 ? !S.svc : S.step === 2 ? !S.time : true;
  }
  if (go) go.addEventListener('click', function () { if (S.step < 3) setStep(S.step + 1); });
  syncGo();
  $$('[data-prev]', root).forEach(function (b) { b.addEventListener('click', function () { setStep(+b.getAttribute('data-prev'), true); }); });

  /* step 1 */
  function pick(input) {
    S.svc = { id: input.value, name: input.getAttribute('data-name'), dur: input.getAttribute('data-dur'), price: input.getAttribute('data-price'), col: input.getAttribute('data-col'), min: mins(input.getAttribute('data-dur')) };
    doc.documentElement.style.setProperty('--sc', S.svc.col);
    sum('service', S.svc.name); sum('dur', S.svc.dur); sum('price', S.svc.price);
    next2.disabled = false;
    if (S.date) { S.time = null; sum('time', '–'); next3.disabled = true; slots(); }
    syncGo();
  }
  $$('input[name=service]', root).forEach(function (r) { r.addEventListener('change', function () { pick(r); }); });
  $$('input[name=with]', root).forEach(function (r) { r.addEventListener('change', function () { S.with = r.value; sum('with', WITH[r.value]); if (S.date) slots(); }); });

  /* step 2: calendar */
  var today = new Date(); today.setHours(0, 0, 0, 0);
  var view = new Date(today.getFullYear(), today.getMonth(), 1);
  var maxDate = new Date(today); maxDate.setDate(maxDate.getDate() + 75);
  function status(d) {
    var dow = d.getDay();
    if (dow === 0 || dow === 1) return 'off';
    if (d < today || d > maxDate) return 'past';
    if (hash(ymd(d) + 'full') % 6 === 0) return 'full';
    return 'open';
  }
  function renderCal(dir) {
    monthEl.textContent = MONTHS[view.getMonth()] + ' ' + view.getFullYear();
    $('[data-month="-1"]', root).disabled = view <= new Date(today.getFullYear(), today.getMonth(), 1);
    $('[data-month="1"]', root).disabled = new Date(view.getFullYear(), view.getMonth() + 1, 1) > maxDate;
    grid.innerHTML = '';
    var first = (view.getDay() + 6) % 7, n = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate();
    for (var b = 0; b < first; b++) { var bl = doc.createElement('span'); bl.className = 'day is-blank'; grid.appendChild(bl); }
    for (var i = 1; i <= n; i++) {
      var d = new Date(view.getFullYear(), view.getMonth(), i), st = status(d);
      var btn = doc.createElement('button'); btn.type = 'button'; btn.className = 'day is-' + st; btn.textContent = i;
      btn.setAttribute('data-date', ymd(d));
      btn.setAttribute('aria-label', nice(d) + (st === 'open' ? '' : st === 'full' ? ', fully booked' : st === 'off' ? ', closed' : ', unavailable'));
      if (st !== 'open') btn.disabled = true;
      if (+d === +today) btn.classList.add('is-today');
      if (S.date && +d === +S.date) { btn.classList.add('is-sel'); btn.setAttribute('aria-pressed', 'true'); }
      btn.tabIndex = -1;
      grid.appendChild(btn);
    }
    var focusable = $('.day.is-sel', grid) || $('.day.is-open', grid); if (focusable) focusable.tabIndex = 0;
    if (dir && !RM) { grid.classList.remove('slide-l', 'slide-r'); void grid.offsetWidth; grid.classList.add(dir > 0 ? 'slide-l' : 'slide-r'); }
  }
  $$('[data-month]', root).forEach(function (b) {
    b.addEventListener('click', function () { var dir = +b.getAttribute('data-month'); view = new Date(view.getFullYear(), view.getMonth() + dir, 1); renderCal(dir); });
  });
  grid.addEventListener('click', function (e) {
    var btn = e.target.closest('.day'); if (!btn || btn.disabled) return;
    var p = btn.getAttribute('data-date').split('-');
    S.date = new Date(+p[0], +p[1] - 1, +p[2]); S.time = null; next3.disabled = true;
    $$('.day', grid).forEach(function (x) { x.classList.remove('is-sel'); x.removeAttribute('aria-pressed'); var r = $('.ripple', x); if (r) r.remove(); x.tabIndex = -1; });
    btn.classList.add('is-sel'); btn.setAttribute('aria-pressed', 'true'); btn.tabIndex = 0;
    var rp = doc.createElement('span'); rp.className = 'ripple'; btn.appendChild(rp);
    sum('date', nice(S.date)); sum('time', '–');
    slots(); syncGo();
  });
  grid.addEventListener('keydown', function (e) {
    var btn = e.target.closest('.day'); if (!btn) return;
    var mv = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[e.key]; if (!mv) return;
    e.preventDefault();
    var p = btn.getAttribute('data-date').split('-'), d = new Date(+p[0], +p[1] - 1, +p[2] + mv);
    if (d.getMonth() !== view.getMonth()) { view = new Date(d.getFullYear(), d.getMonth(), 1); renderCal(mv > 0 ? 1 : -1); }
    var t = $('[data-date="' + ymd(d) + '"]', grid); if (t) { $$('.day', grid).forEach(function (x) { x.tabIndex = -1; }); t.tabIndex = 0; t.focus(); }
  });
  function slots() {
    if (!S.date || !S.svc) return;
    var h = HOURS[S.date.getDay()], dur = S.svc.min, step = dur <= 30 ? 15 : 30, out = { Morning: [], Afternoon: [], Evening: [] };
    var nowM = new Date(); var isToday = +S.date === +today, nowMin = nowM.getHours() * 60 + nowM.getMinutes() + 60;
    for (var m = h[0] * 60; m + dur <= h[1] * 60; m += step) {
      if (isToday && m < nowMin) continue;
      if (hash(ymd(S.date) + hm(m) + S.with) % 10 >= 6) continue;
      (m < 720 ? out.Morning : m < 1020 ? out.Afternoon : out.Evening).push(m);
    }
    slotsEl.innerHTML = ''; var k = 0, any = false;
    Object.keys(out).forEach(function (g) {
      if (!out[g].length) return; any = true;
      var wrap = doc.createElement('div'); wrap.className = 'slot-g'; wrap.innerHTML = '<h4>' + g + '</h4><div class="slot-row"></div>';
      out[g].forEach(function (m) {
        var b = doc.createElement('button'); b.type = 'button'; b.className = 'slot'; b.textContent = hm(m); b.style.setProperty('--i', k++);
        b.setAttribute('aria-pressed', 'false'); b.setAttribute('aria-label', hm(m) + ' on ' + nice(S.date));
        b.addEventListener('click', function () {
          $$('.slot', slotsEl).forEach(function (x) { x.setAttribute('aria-pressed', 'false'); });
          b.setAttribute('aria-pressed', 'true'); S.time = hm(m); sum('time', S.time + ' to ' + hm(m + dur)); next3.disabled = false; syncGo();
        });
        $('.slot-row', wrap).appendChild(b);
      });
      slotsEl.appendChild(wrap);
    });
    if (!any) slotsEl.innerHTML = '<p class="slots-empty">No times left that day for this service. Try another day.</p>';
  }

  /* prefill from links (services menu, team cards, colour route) */
  var want = Q.get('service'); want = ALIAS[want] || want;
  var pre = want && $('input[name=service][value="' + want + '"]', root);
  if (pre) { pre.checked = true; pick(pre); }
  var w = Q.get('with'); var wi = w && $('input[name=with][value="' + w + '"]', root);
  if (wi) { wi.checked = true; S.with = w; sum('with', WITH[w]); }
  var route = Q.get('route');
  if (route) { var rp = route.split('-'); if (SHADE[rp[0]] && SHADE[rp[1]]) $('#f-notes').value = 'Colour route: ' + SHADE[rp[0]] + ' to ' + SHADE[rp[1]] + '.'; }
  renderCal(0);

  /* step 3 + confirmation */
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var f = form.elements.first, em = form.elements.email, bad = null;
    O.fieldErr(f, f.value.trim() ? '' : 'Please add your first name.'); if (!f.value.trim()) bad = f;
    var ok = O.EMAIL.test(em.value.trim()); O.fieldErr(em, ok ? '' : 'Please add an email address.'); if (!ok) bad = bad || em;
    if (bad) { bad.focus(); return; }
    confirmVisit(e.submitter || $('button[type=submit]', form));
  });
  function confirmVisit(btn) {
    var bloom = $('.bloom'), r = btn.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    var R = Math.hypot(Math.max(cx, innerWidth - cx), Math.max(cy, innerHeight - cy)) / 20 * 1.12;
    var first = form.elements.first.value.trim();
    $('[data-done-h]').textContent = 'See you ' + DAYS[S.date.getDay()] + ', ' + first + '.';
    $('[data-done-when]').textContent = S.svc.name + (S.with !== 'any' ? ' with ' + WITH[S.with].split(' ')[0] : '') + ' · ' + nice(S.date) + ' at ' + S.time;
    function swap() {
      $('.bk-grid', root).hidden = true;
      var d = $('.bk-done', root); d.hidden = false;
      if (O.scrollToEl) O.scrollToEl(root, 120);
      d.focus({ preventScroll: true });
    }
    if (RM || !O.tween) { swap(); return; }
    bloom.style.left = cx + 'px'; bloom.style.top = cy + 'px';
    O.tween({ dur: 950, ease: O.E.io, update: function (e) { bloom.style.opacity = Math.min(1, e * 3).toFixed(3); bloom.style.transform = 'scale(' + (e * R).toFixed(2) + ')'; }, done: function () {
      swap();
            O.tween({ dur: 1000, delay: 150, ease: O.E.io, update: function (e) { bloom.style.opacity = (1 - e).toFixed(3); } , done: function () { bloom.style.transform = 'scale(0)'; } });
    } });
  }
  $('[data-ics]').addEventListener('click', function () {
    if (!S.date || !S.time) return;
    var t = S.time.split(':'), st = new Date(S.date); st.setHours(+t[0], +t[1]); var en = new Date(st.getTime() + S.svc.min * 60000);
    var f = function (d) { return d.getFullYear() + ('0' + (d.getMonth() + 1)).slice(-2) + ('0' + d.getDate()).slice(-2) + 'T' + ('0' + d.getHours()).slice(-2) + ('0' + d.getMinutes()).slice(-2) + '00'; };
    var ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Onde//Preview//EN', 'BEGIN:VEVENT', 'UID:' + Date.now() + '@onde.example', 'DTSTAMP:' + f(new Date()), 'DTSTART:' + f(st), 'DTEND:' + f(en), 'SUMMARY:Ondé: ' + S.svc.name, 'LOCATION:7 Lavell Yard\\, London N16', 'DESCRIPTION:Preview of the booking flow. No booking was sent.', 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
    var a = doc.createElement('a'); a.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' })); a.download = 'onde-visit.ics'; doc.body.appendChild(a); a.click(); a.remove();
  });
})();
