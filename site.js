// Menu: one tap opens the section list, a tap on a link (or outside, or Escape) closes it. On desktop (1280 px and
// up) the links sit in the header and the one for the section on screen is marked.
// The header stays on screen and takes the page's ground once the hero is passed (K0293, 26 Oct 2026).
(function () {
  var top = document.querySelector('.top'), btn = document.querySelector('.menu-btn');
  if (!top) return;
  if (btn) {
    function set(open) {
      top.classList.toggle('open', open); btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      btn.lastChild.textContent = open ? 'Close' : 'Menu';  // the open list covers the page, so the button says how to leave it
    }
    // opening puts focus on the first link, since the logo and Book sit between the button and the list (26 Oct audit),
    // and Tab past the list closes it, as the booking panels do
    btn.addEventListener('click', function () {
      var open = !top.classList.contains('open'); set(open);
      if (open) top.querySelector('nav a').focus();
    });
    top.addEventListener('focusout', function (ev) { var t = ev.relatedTarget; if (t && !top.contains(t)) set(false); });
    top.querySelectorAll('nav a').forEach(function (a) { a.addEventListener('click', function () { set(false); }); });
    document.addEventListener('click', function (ev) { if (!top.contains(ev.target)) set(false); });
    document.addEventListener('keydown', function (ev) {
      if (ev.key === 'Escape' && top.classList.contains('open')) { set(false); btn.focus(); }
    });
    window.matchMedia('(min-width: 1280px)').addEventListener('change', function () { set(false); });
  }
  var hero = document.querySelector('.hero');
  function stick() { top.classList.toggle('stuck', window.scrollY > (hero ? hero.offsetHeight - top.offsetHeight : 40)); }
  window.addEventListener('scroll', stick, { passive: true });
  window.addEventListener('resize', stick);
  stick();
  var links = [].slice.call(top.querySelectorAll('nav a[href^="#"]')), seen = {};
  if (!links.length || !('IntersectionObserver' in window)) return;
  var spy = new IntersectionObserver(function (es) {
    es.forEach(function (x) { seen[x.target.id] = x.isIntersecting; });
    var cur = links.filter(function (a) { return seen[a.getAttribute('href').slice(1)]; })[0];
    links.forEach(function (a) { if (a === cur) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current'); });
  }, { rootMargin: '-45% 0px -50% 0px' });
  links.forEach(function (a) { var s = document.getElementById(a.getAttribute('href').slice(1)); if (s) spy.observe(s); });
})();
// The booking bar (K0293: our own version of The PIG's always-on bar). Its fields show the dates and guests chosen
// in the booking line and open the same calendar and guests panel, placed just above the bar (html.from-bar), so a
// guest can choose dates from anywhere on the page. Once both dates are in, the button takes them to the price.
// It steps aside while the booking line itself is on screen, so it never covers it.
(function () {
  var bar = document.querySelector('.bbar'), book = document.getElementById('book');
  if (!bar || !book) return;
  var ci = document.getElementById('ci'), co = document.getElementById('co'), ad = document.getElementById('ad');
  var go = bar.querySelector('.btn'), root = document.documentElement;
  var real = [ci, co, ad].map(function (el) { return el && el.closest('.f'); });
  if (real.every(Boolean)) {
    var box = document.createElement('div');
    box.className = 'bb-fields';
    box.innerHTML = ['Arrive', 'Leave', 'Guests'].map(function (t, k) {
      return '<button type="button" class="bb-f ' + ['bb-ci', 'bb-co', 'bb-ad'][k] + '">' + t + '<span></span></button>';
    }).join('');
    bar.insertBefore(box, go);
    bar.classList.add('on');
    // keep what keyboard focus scrolls to clear of the bar, as scroll-padding-top does for the header (page check, 26 Oct:
    // Tab left the photo arrows under the bar at 375 px)
    var pad = function () { root.style.scrollPaddingBottom = (bar.offsetHeight + 12) + 'px'; };
    pad(); window.addEventListener('resize', pad);
    var f = [].slice.call(box.querySelectorAll('.bb-f'));
    var shown = function (k) { return k < 2 ? real[k].querySelector('.shown') : real[2].querySelector('.gsel'); };
    function mirror() {
      f.forEach(function (b, k) {
        var s = shown(k), t = s ? s.textContent.trim() : '', none = !t || (s && s.classList.contains('empty'));
        b.lastChild.textContent = none ? 'Add date' : t;
        b.lastChild.className = none ? 'empty' : '';
        b.setAttribute('aria-label', s && s.getAttribute('aria-label') || b.textContent);  // the field's own words, not 'ArriveAdd date'
      });
      if (window.matchMedia('(max-width: 699px)').matches && ci.value) {
        f[0].firstChild.textContent = 'Dates';
        f[0].lastChild.textContent = shown(0).textContent.trim().replace(/^\w+\s/, '') + (co.value ? ' to ' + shown(1).textContent.trim().replace(/^\w+\s/, '') : '');
        f[0].setAttribute('aria-label', 'Dates: ' + f[0].lastChild.textContent);
      } else f[0].firstChild.textContent = 'Arrive';
      go.textContent = ci.value && co.value ? 'See your price' : 'Check dates';
    }
    [ci, co, ad].forEach(function (el) { el.addEventListener('change', mirror); });
    // the dog box is made later, by the quote: listen on the page, after its own handlers have run (26 Oct audit)
    document.addEventListener('change', function (ev) { if (ev.target.id === 'dog') mirror(); });
    f.forEach(function (b, k) {
      b.addEventListener('click', function (ev) {
        ev.stopPropagation();  // the page's own outside-click handlers would close what this opens
        root.classList.add('from-bar');
        shown(k).click();  // the field's own button: a click on its <label> is re-sent to that button, toggling twice
      });
    });
    go.addEventListener('click', function (ev) {
      // both dates in: bring the price and its request button into view together; the plain #book jump left the button
      // under the phone's fold (26 Oct audit: 803 px on an 812 px screen)
      var q = document.getElementById('quote');
      if (ci.value && co.value && q && !q.hidden) { ev.preventDefault(); q.scrollIntoView({ block: 'start' }); q.focus({ preventScroll: true }); }
      if (ci.value && co.value) return;
      ev.preventDefault(); ev.stopPropagation(); f[0].click();
    });
    // once a panel is closed, the next one opened from the booking line itself sits under it again
    new MutationObserver(function () {
      if (!document.querySelector('.cal:not([hidden])')) { root.classList.remove('from-bar'); mirror(); }
    }).observe(book, { subtree: true, attributes: true, attributeFilter: ['hidden'] });
    setTimeout(mirror, 0);
  }
  if ('IntersectionObserver' in window) {
    // the bar also steps aside while the price is on screen, which sits below the booking line (26 Oct audit)
    var seen = new Map();
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (x) { seen.set(x.target, x.isIntersecting); });
      var away = [].slice.call(seen.values()).some(Boolean);
      bar.classList.toggle('away', away);
      bar.inert = away; // A bar outside the viewport must not leave a hidden keyboard stop.
      bar.setAttribute('aria-hidden', away ? 'true' : 'false');
      setTimeout(function () { bar.classList.add('ready'); }, 300);
    });
    io.observe(book);
    var qb = document.getElementById('quote'); if (qb) io.observe(qb);
  }
})();
// Date picker: a calendar in the site's own type and colours, in place of the phone's built-in one, which the user
// called ugly (25 Oct 2026, K0286). Tap the arrival day, then the leaving day: two months side by side on wide
// screens, one month in a sheet from the bottom on phones. Past days can't be chosen, nor stays under the minimum,
// nor (once src/nights.json is held) booked nights. The hidden date inputs still hold the values, so the form and the
// quote read them as before, and the page works without this file.
(function () {
  var ci = document.getElementById('ci'), co = document.getElementById('co'), form = document.getElementById('book');
  if (!ci || !co || !form) return;
  var P = null, N = null;
  try { P = JSON.parse(document.getElementById('pricing').textContent); } catch (err) { P = null; }
  try { N = JSON.parse(document.getElementById('nights').textContent); } catch (err) { N = null; }
  var DAY = 864e5, now = new Date(), today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  var SHORT = { weekday: 'short', day: 'numeric', month: 'short' }, LONG = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
  var wide = window.matchMedia('(min-width: 700px)');
  function iso(d) { return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function day(v) { var p = v.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function add(d, n) { return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n); }
  function month(d, n) { return new Date(d.getFullYear(), d.getMonth() + (n || 0), 1); }
  function nights(a, b) { return Math.round((b - a) / DAY); }
  function fmt(d, o) { return d.toLocaleDateString('en-GB', o); }
  // the fewest nights a stay arriving on a may have (src/pricing.json): 2 for arrivals soon, else min_nights
  function least(a) { return P ? (nights(today, a) <= P.two_night_within_days ? 2 : P.min_nights) : 1; }
  function booked(d) { var x = N && N.nights[iso(d)]; return !!(x && !x.open); }
  function fits(a, b) {
    if (nights(a, b) < least(a)) return 'short';
    for (var x = a; x < b; x = add(x, 1)) if (booked(x)) return 'booked';
    return '';
  }

  var start = ci.value ? day(ci.value) : null, end = co.value ? day(co.value) : null;
  var picking = 'in', hover = null, view = month(today), last = month(today, 24);

  // the shown date becomes the button that opens the calendar; the native input is left only to hold the value
  var trig = [ci, co].map(function (el, k) {
    var s = el.parentNode.querySelector('.shown'), b = document.createElement('button');
    b.type = 'button'; b.className = s.className; b.setAttribute('aria-haspopup', 'dialog'); b.setAttribute('aria-expanded', 'false');
    s.parentNode.replaceChild(b, s);
    el.tabIndex = -1; el.setAttribute('aria-hidden', 'true');
    el.closest('.f').addEventListener('click', function (ev) { ev.preventDefault(); open(k ? 'out' : 'in'); });
    return b;
  });
  function label(k) {
    var el = k ? co : ci, b = trig[k], v = el.value;
    b.textContent = v ? fmt(day(v), SHORT) : 'Add date';
    b.classList.toggle('empty', !v);
    b.setAttribute('aria-label', (k ? 'Leave' : 'Arrive') + ': ' + (v ? fmt(day(v), LONG) : 'choose a date'));
  }

  var cal = document.createElement('div'), back = document.createElement('div');
  cal.className = 'cal'; cal.hidden = true; cal.setAttribute('role', 'dialog'); cal.setAttribute('aria-label', 'Choose your dates');
  back.className = 'cal-back'; back.hidden = true;
  cal.innerHTML = '<div class="cal-top"><p class="cal-say" aria-live="polite"></p><button type="button" class="cal-x">Close</button></div>' +
    '<div class="cal-nav"><button type="button" class="cal-prev" aria-label="Earlier month">&#8592;</button>' +
    '<button type="button" class="cal-next" aria-label="Later month">&#8594;</button></div>' +
    '<div class="cal-months"></div>' +
    '<div class="cal-foot"><button type="button" class="cal-clear">Clear dates</button><p class="cal-rule"></p></div>';
  form.appendChild(cal); document.body.appendChild(back);
  var months = cal.querySelector('.cal-months'), say = cal.querySelector('.cal-say');
  var tel = document.querySelector('a[href^="tel:"]');
  if (P) cal.querySelector('.cal-rule').textContent = 'Stays of ' + P.min_nights + ' nights or more, or 2 nights for arrivals in the next ' +
    Math.round(P.two_night_within_days / 7) + ' weeks. To arrive ' + (P.earliest_days_ahead === 2 ? 'today or tomorrow' : 'sooner') +
    ', ring us' + (tel ? ' on ' + tel.textContent.replace(/^\D+/, '').trim() : '') + '.';

  // why day d can't be chosen now ('past', 'short', 'booked'), or ''
  function why(d) {
    if (d < today) return 'past';
    if (picking === 'in' && P && d < add(today, P.earliest_days_ahead)) return 'soon';  // the quote would only say to ring
    if (picking === 'out' && start && d > start) return fits(start, d);
    return booked(d) ? 'booked' : '';
  }
  function render() {
    var html = '', count = wide.matches ? 2 : 1;
    for (var m = 0; m < count; m++) {
      var first = month(view, m), dim = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
      html += '<div class="cal-month"><p class="cal-name">' + fmt(first, { month: 'long', year: 'numeric' }) + '</p><div class="cal-days">' +
        '<span aria-hidden="true">Mo</span><span aria-hidden="true">Tu</span><span aria-hidden="true">We</span><span aria-hidden="true">Th</span>' +
        '<span aria-hidden="true">Fr</span><span aria-hidden="true">Sa</span><span aria-hidden="true">Su</span>';
      for (var i = (first.getDay() + 6) % 7; i > 0; i--) html += '<span></span>';
      for (var dd = 1; dd <= dim; dd++) html += '<button type="button" data-d="' + iso(new Date(first.getFullYear(), first.getMonth(), dd)) + '">' + dd + '</button>';
      html += '</div></div>';
    }
    months.innerHTML = html;
    cal.querySelector('.cal-prev').disabled = view <= month(today);
    cal.querySelector('.cal-next').disabled = month(view, count - 1) >= last;
    paint();
  }
  function paint() {
    var to = end || (picking === 'out' && start && hover && hover > start && !why(hover) ? hover : null), aim = target();
    months.querySelectorAll('button').forEach(function (b) {
      var d = day(b.dataset.d), no = why(d), s = !!(start && +d === +start), e = !!(to && +d === +to);
      b.className = (no ? 'no ' + no : '') + (s ? ' s' : '') + (e ? ' e' : '') + (start && to && d > start && d < to ? ' in' : '') +
        (+d === +today ? ' now' : '');
      b.setAttribute('aria-disabled', no ? 'true' : 'false');
      b.setAttribute('aria-pressed', s || (e && end) ? 'true' : 'false');
      b.setAttribute('aria-label', fmt(d, LONG) + (s ? ', arrival' : e && end ? ', leaving' : '') +
        (no === 'booked' ? ', booked' : no === 'short' ? ', too short a stay' : no === 'soon' ? ', ring us to arrive this soon' : ''));
      b.tabIndex = +d === +aim ? 0 : -1;
    });
    say.textContent = note || (start && end ? nights(start, end) + ' nights, ' + fmt(start, SHORT) + ' to ' + fmt(end, SHORT) :
      start ? 'Arriving ' + fmt(start, SHORT) + '. Now choose the day you leave.' : 'Choose the day you arrive.');
  }
  // the day keyboard focus starts on: the date being chosen, or the first open day on show
  function target() {
    var d = picking === 'out' && start ? (end || add(start, least(start))) : (start || today);
    var lo = month(view) < today ? today : month(view), hi = add(month(view, wide.matches ? 2 : 1), -1);
    return d < lo || d > hi ? lo : d;
  }
  function sync() {
    ci.value = start ? iso(start) : ''; co.value = end ? iso(end) : '';
    [ci, co].forEach(function (el, k) { label(k); el.dispatchEvent(new Event('change', { bubbles: true })); });
  }
  var note = '';  // why the last day tapped can't be chosen, said until the next choice
  function choose(d) {
    var no = why(d);
    if (no) {
      note = no === 'short' ? 'Too short: stays from ' + fmt(start, SHORT) + ' are ' + least(start) + ' nights or more.' :
        no === 'booked' ? (picking === 'out' ? 'A night in that stay is already booked.' : 'That night is already booked.') :
        no === 'soon' ? 'To arrive this soon, please ring us' + (tel ? ' on ' + tel.textContent.replace(/^\D+/, '').trim() : '') + '.' : '';
      paint(); return;
    }
    note = '';
    if (picking === 'out' && start && d > start) end = d;
    else { start = d; end = null; }  // a new arrival starts a new stay: keeping the old leaving day closed the picker unasked (26 Oct audit)
    picking = end ? 'in' : 'out'; hover = null;
    sync();
    if (!end) { paint(); return; }
    close(true);
    var q = document.getElementById('quote');  // bring the price for these dates into view
    if (q && !q.hidden) q.scrollIntoView({ block: 'nearest' });
  }
  var opener = null;  // the control that opened the calendar, which gets focus back when it closes
  function open(mode) {
    opener = document.activeElement; note = '';
    picking = mode === 'out' && start ? 'out' : 'in';
    view = month(start && start > today ? start : today);
    cal.hidden = false; back.hidden = wide.matches;
    document.documentElement.classList.toggle('cal-lock', !wide.matches);
    trig.forEach(function (b) { b.setAttribute('aria-expanded', 'true'); });
    render();
    var b = months.querySelector('button[tabindex="0"]'); if (b) b.focus({ preventScroll: wide.matches });
    // A picker opened low on a desktop screen hung below it: the screenshot tester clicked Arrive 5 times and saw
    // nothing (test/visual_arm_e4, 26 Oct 2026), so bring the whole picker into view.
    if (wide.matches) cal.scrollIntoView({ block: 'nearest' });
  }
  function close(refocus) {
    if (cal.hidden) return;
    cal.hidden = true; back.hidden = true; hover = null;
    document.documentElement.classList.remove('cal-lock');
    trig.forEach(function (b) { b.setAttribute('aria-expanded', 'false'); });
    if (refocus) (opener && opener.closest && opener.closest('.bbar') ? opener : trig[end ? 1 : 0]).focus({ preventScroll: true });
  }
  function go(d) {
    if (d < today || d >= month(last, 1)) return;
    var count = wide.matches ? 2 : 1;
    if (d < month(view)) { view = month(d); render(); }
    else if (d >= month(view, count)) { view = month(d, 1 - count); render(); }
    var b = months.querySelector('button[data-d="' + iso(d) + '"]');
    if (b) { months.querySelectorAll('button').forEach(function (x) { x.tabIndex = x === b ? 0 : -1; }); b.focus(); }
  }

  months.addEventListener('click', function (ev) { var b = ev.target.closest('button'); if (b) choose(day(b.dataset.d)); });
  months.addEventListener('mouseover', function (ev) {
    var b = ev.target.closest('button'); if (!b || picking !== 'out') return;
    hover = day(b.dataset.d); paint();
  });
  months.addEventListener('mouseleave', function () { if (hover) { hover = null; paint(); } });
  months.addEventListener('keydown', function (ev) {
    var b = ev.target.closest('button'); if (!b) return;
    var d = day(b.dataset.d), step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[ev.key];
    if (step) { ev.preventDefault(); go(add(d, step)); }
    else if (ev.key === 'PageUp' || ev.key === 'PageDown') {
      ev.preventDefault(); go(new Date(d.getFullYear(), d.getMonth() + (ev.key === 'PageUp' ? -1 : 1), d.getDate()));
    }
  });
  cal.querySelector('.cal-prev').addEventListener('click', function () { view = month(view, -1); render(); });
  cal.querySelector('.cal-next').addEventListener('click', function () { view = month(view, 1); render(); });
  cal.querySelector('.cal-x').addEventListener('click', function () { close(true); });
  cal.querySelector('.cal-clear').addEventListener('click', function () { start = end = null; picking = 'in'; sync(); render(); });
  cal.addEventListener('keydown', function (ev) { if (ev.key === 'Escape') { ev.stopPropagation(); close(true); } });
  // Tab out of the picker closes it, so focus never sits behind the phone's sheet (26 Oct audit); a redraw drops focus
  // with no new target, and a date field takes it to reopen, so neither counts
  cal.addEventListener('focusout', function (ev) { var t = ev.relatedTarget; if (t && !cal.contains(t) && !t.closest('.book .f')) close(false); });
  back.addEventListener('click', function () { close(false); });
  document.addEventListener('click', function (ev) {
    var fld = ev.target.closest('.book .f');  // a date field reopens it; any other click, the guests field included, closes it
    if (!cal.hidden && !cal.contains(ev.target) && !(fld && fld.querySelector('.when'))) close(false);
  });
  try { wide.addEventListener('change', function () { if (!cal.hidden) { back.hidden = wide.matches; document.documentElement.classList.toggle('cal-lock', !wide.matches); render(); } }); } catch (err) { /* old Safari */ }
  label(0); label(1);
})();
// Direct price: the total for the chosen dates, worked out from the settings in #pricing (src/pricing.json;
// research/booking-v1/PLAN.md, 25 Oct 2026). The booking button shows it here instead of sending guests to Airbnb
// (user, K0286); the guest requests the dates by email, and the owners reply and agree them before anything is paid.
// Airbnb stays one link away, with the same dates, for guests who want it. Without show_everywhere the price shows
// only on the preview link and local tests, and elsewhere the box offers the email request alone.
(function () {
  var ask = document.getElementById('ask'), ci = document.getElementById('ci'), co = document.getElementById('co'),
      ad = document.getElementById('ad'), box = document.getElementById('quote'), cfg = document.getElementById('pricing');
  var form = document.getElementById('book'), air = form ? form.getAttribute('action') : '';
  if (!ask || !ci || !co || !ad) return;
  var P = null, N = null, nt = document.getElementById('nights');
  try { P = JSON.parse(cfg.textContent); } catch (err) { P = null; }
  try { N = nt ? JSON.parse(nt.textContent) : null; } catch (err) { N = null; }
  var local = /^(localhost|127\.0\.0\.1)$/.test(location.hostname), preview = /\/highdown-preview\//.test(location.pathname);
  var base = ask.getAttribute('href').split('?')[0], DAY = 864e5, tel = document.querySelector('a[href^="tel:"]'), sent = '';
  // Each night's Airbnb price from PriceLabs (src/nights.json); once its prices are older than stale_days the quote
  // hides rather than guess, since the flat settings no longer match Airbnb.
  var stale = !!(N && P && !(Date.now() - Date.parse(N.fetched) <= P.per_night.stale_days * DAY));
  var show = !!(P && box && !stale && (P.show_everywhere || local || preview));
  function day(v) { var p = v.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function iso(d) { return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function words(v) {
    return v ? day(v).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : 'not chosen yet';
  }
  function short(d) { return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }); }
  function money(x) { return '£' + Math.round(x).toLocaleString('en-GB'); }

  // One stay's total, or a reason it can't be priced here. Each night: with nights.json, that night's Airbnb price
  // less direct_off (PriceLabs already moves season and last minute); without it, its own rate x the month's season,
  // less the last-minute step. Then the long-stay discount; then held between the floor (the same stay's Airbnb net
  // after card fees) and the ceiling (the same stay's Airbnb price).
  function quote(dog) {
    if (!ci.value || !co.value) return null;
    var a = day(ci.value), b = day(co.value), n = Math.round((b - a) / DAY);
    if (n < 1) return null;
    var now = new Date(), today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    var lead = Math.round((a - today) / DAY);
    if (lead < P.earliest_days_ahead) {
      var tel = document.querySelector('a[href^="tel:"]');
      return { msg: 'For arrivals in the next ' + P.earliest_days_ahead + ' days, please ring us' + (tel ? ' on ' + tel.textContent.replace(/^\D+/, '').trim() : '') + '.' };
    }
    if (n < P.min_nights && !(n === 2 && lead <= P.two_night_within_days))
      return { msg: n === 1 ? 'We take stays of 2 nights or more.' :
        '2-night stays open up for arrivals within ' + Math.round(P.two_night_within_days / 7) + ' weeks; otherwise it’s ' + P.min_nights + ' nights or more.' };
    // each night's own price in whole pounds (nl), so the lines under the total add up to it; the cuts come after
    var direct = 0, air = 0, base = 0, late = 0, cut = null, nl = [];
    for (var i = 0; i < n; i++) {
      var d = new Date(a.getFullYear(), a.getMonth(), a.getDate() + i), we = d.getDay() === 5 || d.getDay() === 6;
      if (N) {
        var x = N.nights[iso(d)];
        if (!x) return { msg: 'We can’t price these dates here yet. Ask us for a price.' };
        if (!x.open) return { msg: 'Some of these nights are already booked. Try other dates, or ask us.' };
        var p = Math.round(x.air * (1 - P.per_night.direct_off));
        base += p; nl.push([d, p]);
        air += x.air;
        continue;
      }
      var s = P.season[String(d.getMonth() + 1)] || 1, r = Math.round((we ? P.night.fri_sat : P.night.weekday) * s);
      base += r; nl.push([d, r]);
      if (Math.round((d - today) / DAY) <= P.last_minute.within_days) late += r * P.last_minute.off;
      air += (we ? P.airbnb.fri_sat : P.airbnb.weekday) * s;
    }
    direct = base - late;
    for (var j = 0; j < P.long_stay.length; j++) if (n >= P.long_stay[j].from) { cut = P.long_stay[j]; direct *= 1 - cut.off; break; }
    if (n >= 7) air *= 1 - P.airbnb.weekly_discount;
    var net = air * (1 - P.airbnb.host_fee * (1 + P.airbnb.vat_on_fee));
    var floor = (net + P.card_fee.fixed) / (1 - P.card_fee.rate);
    var stay = Math.round(Math.min(Math.max(direct, floor), air));
    var fee = dog ? P.dog_fee : 0;
    return { n: n, stay: stay, fee: fee, total: stay + fee, from: a, to: b, base: base, nl: nl, late: late > 0, cut: cut, direct: direct };
  }

  // the nights under the total, then any cut in words, so the figures add up to the total (Grok price-display return,
  // 25 Oct 2026: show each night, never a rounded average a night, which would not multiply back to the total)
  function how(q) {
    var t, off = q.base - q.stay, why = [];
    if (off < 0) return '';  // the floor lifted the stay above its nights: no line rather than one that does not add up
    if (q.n <= 4) t = q.nl.map(function (x) { return x[0].toLocaleDateString('en-GB', { weekday: 'long' }) + ' ' + money(x[1]); }).join(', ');
    else {
      var c = {}, k = [];
      q.nl.forEach(function (x) { if (!c[x[1]]) { c[x[1]] = 0; k.push(x[1]); } c[x[1]]++; });
      t = k.map(function (p, i) { return c[p] + (i ? '' : (c[p] > 1 ? ' nights' : ' night')) + ' at ' + money(p); }).join(', ');
    }
    // the percentages are named only when they make the whole cut; when our floor or the Airbnb price set the stay
    // instead, a named 20% beside a smaller sum does not add up (26 Oct audit)
    if (Math.round(q.base - q.direct) !== off) why.push('our price for booking direct');
    else if (q.late) why.push('nights in the next ' + P.last_minute.within_days + ' days are ' + Math.round(P.last_minute.off * 100) + '% less');
    if (q.cut && why[0] !== 'our price for booking direct') why.push('stays of ' + q.cut.from + ' nights or more are ' + Math.round(q.cut.off * 100) + '% less');
    return t + '.' + (off > 0 ? ' Less ' + money(off) + (why.length ? ': ' + why.join(', and ') : '') + '.' : '') +
      (q.fee ? ' Your dog ' + money(q.fee) + '.' : '');
  }

  var parts = {};
  if (box) {
    box.innerHTML = '<p class="q-line"><b class="q-total"></b> <span class="q-what"></span></p><p class="q-how"></p>' +
      '<p class="q-msg"></p>' +
      (show ? '<label class="q-dog"><input type="checkbox" id="dog"> Bringing your dog <span class="q-fee"></span></label>' : '') +
      '<p class="q-act"><a class="btn" id="req" href="#"></a><a class="q-air" href="#" target="_blank" rel="noopener">Or see these dates on Airbnb</a></p>' +
      '<p class="q-alt">No email program? <button type="button" class="q-copy">Copy the request</button> and send it to ' +
      '<a href="' + base + '">' + base.replace('mailto:', '') + '</a>' + (tel ? ', or ring <a href="' + tel.getAttribute('href') + '">' + tel.textContent.replace(/^\D+/, '').trim() + '</a>' : '') +
      '. <span class="q-done" aria-live="polite"></span></p>' +
      '<p class="q-terms">Nothing is paid until we’ve spoken and agreed your dates.' + (show && P.terms_confirmed ? ' Then ' +
      Math.round(P.deposit_share * 100) + '% secures them and the rest is due ' + P.balance_days_before +
      ' days before you arrive, with a ' + money(P.damage_deposit) + ' damage deposit we refund after your stay.' : '') +
      ' We use your details only to arrange your stay and keep our accounts, and never pass them on.</p>';
    box.tabIndex = -1;
    ['q-line', 'q-total', 'q-what', 'q-how', 'q-msg', 'q-dog', 'q-fee', 'q-air'].forEach(function (c) { parts[c] = box.querySelector('.' + c); });
    parts.dog = box.querySelector('#dog'); parts.req = box.querySelector('#req');
    box.querySelector('.q-copy').addEventListener('click', function () {
      var done = box.querySelector('.q-done'), ok = function () { done.textContent = 'Copied.'; };
      // the clipboard API needs a secure page; elsewhere fall back to a selected text box
      if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(sent).then(ok, old); else old();
      function old() {
        var t = document.createElement('textarea'); t.value = sent; t.setAttribute('readonly', ''); t.style.position = 'fixed'; t.style.opacity = '0';
        document.body.appendChild(t); t.select();
        try { done.textContent = document.execCommand('copy') ? 'Copied.' : 'Select and copy the details from your email draft.'; } catch (err) { done.textContent = ''; }
        document.body.removeChild(t);
      }
    });
  }

  function mail(subject, lines) {
    sent = 'To: ' + base.replace('mailto:', '') + '\nSubject: ' + subject + '\n\n' + lines.join('\n');
    return base + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(lines.join('\n'));
  }
  function update() {
    var dog = !!(parts.dog && parts.dog.checked);
    var lines = ['Hello Luca and Trina,', '', 'Please could you give us a direct price for Elderflower Lodge.', '',
      'Arrive: ' + words(ci.value), 'Leave: ' + words(co.value), 'Guests: ' + ad.value, '', 'Thank you,', ''];
    var asking = mail('Elderflower Lodge: a direct price', lines);
    ask.setAttribute('href', asking);
    if (!box) return;
    box.hidden = !(ci.value && co.value);
    if (box.hidden) return;
    parts['q-air'].setAttribute('href', air + '?check_in=' + ci.value + '&check_out=' + co.value + '&adults=' + ad.value + '&guests=' + ad.value + (dog ? '&pets=1' : ''));
    var q = show ? quote(dog) : null, priced = !!(q && q.total !== undefined);
    parts['q-line'].hidden = parts['q-how'].hidden = !priced; parts['q-msg'].hidden = priced;
    if (parts['q-dog']) parts['q-dog'].hidden = !priced;
    if (!priced) {
      parts['q-msg'].textContent = q && q.msg ? q.msg : 'Ask us for a price for these dates and we’ll reply by email.';
      parts.req.textContent = 'Ask us about these dates';
      parts.req.setAttribute('href', asking);
      return;
    }
    parts['q-total'].textContent = money(q.total);
    parts['q-what'].textContent = 'for ' + q.n + ' nights, booking direct with us' + (q.fee ? ', including your dog' : '') + '.';
    parts['q-how'].textContent = how(q); parts['q-how'].hidden = !parts['q-how'].textContent;
    parts['q-fee'].textContent = '(+' + money(P.dog_fee) + ')';
    parts.req.textContent = 'Request these dates';
    parts.req.setAttribute('href', mail('Elderflower Lodge: request for ' + short(q.from) + ' to ' + short(q.to), [
      'Hello Luca and Trina,', '', 'We’d like to stay at Elderflower Lodge, booking direct.', '',
      'Arrive: ' + words(ci.value), 'Leave: ' + words(co.value), 'Nights: ' + q.n, 'Guests: ' + ad.value,
      'Dog: ' + (dog ? 'yes, one small dog' : 'no'), 'Price shown on your website: ' + money(q.total) + ' in total', '',
      'Name:', 'Phone:', '', 'Thank you,', '']));
  }
  [ci, co, ad].forEach(function (el) { el.addEventListener('change', update); el.addEventListener('input', update); });
  if (parts.dog) parts.dog.addEventListener('change', update);
  // the booking button: no dates yet opens the calendar; with dates it brings the price into view. Without the box
  // (no script, or the box left out) the form still hands the dates to Airbnb.
  if (form && box) form.addEventListener('submit', function (ev) {
    ev.preventDefault();
    if (!ci.value || !co.value) { (ci.value ? co : ci).closest('.f').click(); return; }
    update();
    box.scrollIntoView({ block: 'nearest' });
    box.focus({ preventScroll: true });
  });
  update();
})();
// Guests: a small panel in the calendar's style, in place of the phone's own list, which the user called ugly
// (25 Oct 2026, K0288). Plus and minus up to the lodge's limit, and the dog, kept in step with the quote's dog box.
// The hidden select still holds the number, so the form, the quote and the emails read it as before.
(function () {
  var ad = document.getElementById('ad'), form = document.getElementById('book');
  if (!ad || !form) return;
  var f = ad.closest('.f'), max = ad.options.length, dog = document.getElementById('dog');
  var P = null;
  try { P = JSON.parse(document.getElementById('pricing').textContent); } catch (err) { P = null; }
  var wide = window.matchMedia('(min-width: 700px)');
  var b = document.createElement('button');
  b.type = 'button'; b.className = 'gsel'; b.setAttribute('aria-haspopup', 'dialog'); b.setAttribute('aria-expanded', 'false');
  ad.parentNode.insertBefore(b, ad);
  ad.tabIndex = -1; ad.setAttribute('aria-hidden', 'true'); ad.classList.add('native');

  var gp = document.createElement('div'), back = document.createElement('div');
  gp.className = 'cal gp'; gp.hidden = true; gp.setAttribute('role', 'dialog'); gp.setAttribute('aria-label', 'Guests');
  back.className = 'cal-back'; back.hidden = true;
  gp.innerHTML = '<div class="gp-row"><div><p class="gp-h">Guests</p><p class="gp-s">The lodge sleeps ' + max + '</p></div>' +
    '<div class="gp-step"><button type="button" class="gp-minus" aria-label="One fewer guest">&#8722;</button>' +
    '<output class="gp-n" aria-live="polite"></output>' +
    '<button type="button" class="gp-plus" aria-label="One more guest">+</button></div></div>' +
    (dog ? '<div class="gp-row"><div><p class="gp-h">Dog</p><p class="gp-s">One small, well-behaved dog' +
      (P ? ', ' + '£' + P.dog_fee + ' a stay' : '') + '</p></div>' +
      '<label class="gp-dog"><input type="checkbox"> Bringing a dog</label></div>' : '') +
    '<div class="gp-foot"><button type="button" class="btn gp-done">Done</button></div>';
  form.appendChild(gp); document.body.appendChild(back);
  var n = gp.querySelector('.gp-n'), minus = gp.querySelector('.gp-minus'), plus = gp.querySelector('.gp-plus');
  var gdog = gp.querySelector('.gp-dog input');

  function show() {
    var v = +ad.value, d = !!(dog && dog.checked);
    b.textContent = v + ' guest' + (v > 1 ? 's' : '') + (d ? ', 1 dog' : '');
    b.setAttribute('aria-label', 'Guests: ' + v + (d ? ', and a dog' : ''));
    n.textContent = v; minus.disabled = v <= 1; plus.disabled = v >= max;
    if (gdog) gdog.checked = d;
  }
  function set(v) {
    ad.value = String(Math.max(1, Math.min(max, v)));
    show();  // before the change event: the booking bar copies this button's words (26 Oct: the bar lagged one guest)
    ad.dispatchEvent(new Event('change', { bubbles: true }));
  }
  var opener = null;
  function open() {
    opener = document.activeElement;
    if (wide.matches) gp.style.left = f.offsetLeft + 'px'; else gp.style.left = '';
    gp.hidden = false; back.hidden = wide.matches;
    document.documentElement.classList.toggle('cal-lock', !wide.matches);
    b.setAttribute('aria-expanded', 'true');
    (plus.disabled ? minus : plus).focus({ preventScroll: wide.matches });
    if (wide.matches) gp.scrollIntoView({ block: 'nearest' });  // as the calendar: never open below the screen
  }
  function close(refocus) {
    if (gp.hidden) return;
    gp.hidden = true; back.hidden = true;
    document.documentElement.classList.remove('cal-lock');
    b.setAttribute('aria-expanded', 'false');
    if (refocus) (opener && opener.closest && opener.closest('.bbar') ? opener : b).focus({ preventScroll: true });
  }
  f.addEventListener('click', function (ev) { if (gp.contains(ev.target)) return; ev.preventDefault(); if (gp.hidden) open(); else close(true); });
  minus.addEventListener('click', function () { set(+ad.value - 1); });
  plus.addEventListener('click', function () { set(+ad.value + 1); });
  if (gdog) gdog.addEventListener('change', function () {
    dog.checked = gdog.checked; dog.dispatchEvent(new Event('change', { bubbles: true })); show();
  });
  if (dog) dog.addEventListener('change', show);
  gp.querySelector('.gp-done').addEventListener('click', function () { close(true); });
  gp.addEventListener('keydown', function (ev) { if (ev.key === 'Escape') { ev.stopPropagation(); close(true); } });
  gp.addEventListener('focusout', function (ev) { var t = ev.relatedTarget; if (t && !gp.contains(t) && !f.contains(t)) close(false); });  // as the calendar
  back.addEventListener('click', function () { close(false); });
  document.addEventListener('click', function (ev) { if (!gp.hidden && !gp.contains(ev.target) && !f.contains(ev.target)) close(false); });
  show();
})();
// Sunset at the lodge: today's time from the sunrise equation (NOAA-style; the lodge at 50.8224 N, 0.4563 W), shown
// in UK time. After sunset it shows tomorrow's sunrise. Hidden without this file. Why: blind judges named a live
// time-of-day detail (Heckfield's clock, The Newt's weather) as a sign of studio work (research/judge-v1, 24 Oct 2026).
(function () {
  var box = document.querySelector('.sun'); if (!box) return;
  var R = Math.PI / 180, LAT = 50.8224, LON = -0.4563, J2000 = Date.UTC(2000, 0, 1, 12);
  function sun(day, rise) {
    var n = Math.round((Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), 12) - J2000) / 864e5) - LON / 360;
    var M = (357.5291 + 0.98560028 * n) % 360;
    var C = 1.9148 * Math.sin(M * R) + 0.02 * Math.sin(2 * M * R) + 0.0003 * Math.sin(3 * M * R);
    var L = (M + C + 180 + 102.9372) % 360;
    var noon = n + 0.0053 * Math.sin(M * R) - 0.0069 * Math.sin(2 * L * R);
    var dec = Math.asin(Math.sin(L * R) * Math.sin(23.4397 * R));
    var w = Math.acos((Math.sin(-0.833 * R) - Math.sin(LAT * R) * Math.sin(dec)) / (Math.cos(LAT * R) * Math.cos(dec))) / R;
    return new Date(J2000 + (noon + (rise ? -w : w) / 360) * 864e5);
  }
  function fmt(d) {
    var t = d.toLocaleTimeString('en-GB', { timeZone: 'Europe/London', hour: 'numeric', minute: '2-digit', hour12: true });
    return t.replace(':', '.').replace(/\s/g, '').toLowerCase();
  }
  try {
    var now = new Date(), set = sun(now, false), label = 'Sunset at the lodge', t = set;
    if (now > set) { t = sun(new Date(now.getTime() + 864e5), true); label = 'Sunrise at the lodge'; }
    box.querySelector('.sun-l').textContent = label;
    box.querySelector('.sun-t').textContent = fmt(t);
    box.hidden = false;
  } catch (err) { /* leave it hidden */ }
})();
// Photos (K0293, 26 Oct 2026). Pointing at an area in the list swaps the large photo beside it (The PIG's tabbed
// lists); "All 26 photos" and "See all" open a photo tour, every photo by area in a full-screen sheet, instead of
// dropping them into the page; and a tap on any photo of the lodge, anywhere on the page, opens it large (F67) with
// next and previous, arrow keys and a swipe. Escape closes (the dialog's own) and focus returns to the photo.
(function () {
  if (!window.HTMLDialogElement) return;
  var all = document.getElementById('all-photos');
  function slug(img) { var m = img && /img\/(.+?)-sm\.jpg/.exec(img.getAttribute('src') || img.dataset.holdSrc || ''); return m ? m[1] : null; }  // or held for the hero (HOLD_JS)

  // the area list: hover, focus or tap shows that area
  var tabs = [].slice.call(document.querySelectorAll('.tour-list a')), panels = [].slice.call(document.querySelectorAll('.tour-panel'));
  function pick(i) {
    tabs.forEach(function (a, k) { a.classList.toggle('on', k === i); a.setAttribute('aria-pressed', k === i ? 'true' : 'false'); });
    panels.forEach(function (p, k) { p.classList.toggle('on', k === i); p.inert = k !== i; });
  }
  tabs.forEach(function (a, i) {
    a.setAttribute('role', 'button');
    a.addEventListener('mouseenter', function () { pick(i); });
    a.addEventListener('focus', function () { pick(i); });
    a.addEventListener('click', function (ev) { ev.preventDefault(); pick(i); });
  });
  if (tabs.length) pick(0);

  // the tour: the full list moves into a full-screen sheet with a row of area links at the top
  var td = null;
  if (all) {
    td = document.createElement('dialog');
    td.className = 'tdlg'; td.setAttribute('aria-label', 'All photos of the lodge');
    var heads = [].slice.call(all.querySelectorAll('.grid-h'));
    td.innerHTML = '<div class="td-head"><b>' + heads.length + ' areas</b>' + heads.map(function (h) {
      return '<a href="#' + h.id + '">' + h.textContent + '</a>';
    }).join('') + '<button type="button" class="btn line td-x">Close</button></div><div class="td-body"></div>';
    var body = td.querySelector('.td-body');
    [].slice.call(all.children).forEach(function (c) { if (c.tagName !== 'SUMMARY') body.appendChild(c); });
    document.body.appendChild(td);
    td.querySelector('.td-x').addEventListener('click', function () { td.close(); });
    td.querySelectorAll('.td-head a').forEach(function (a) {
      a.addEventListener('click', function (ev) {
        ev.preventDefault(); var h = document.getElementById(a.getAttribute('href').slice(1));
        if (h) td.scrollTo({ top: h.offsetTop - td.querySelector('.td-head').offsetHeight - 16 });
      });
    });
    all.querySelector('summary').addEventListener('click', function (ev) { ev.preventDefault(); tour(null, ev.currentTarget); });
  }
  var back = null;
  function tour(id, from) {
    if (!td) return;
    back = from; td.showModal(); td.scrollTop = 0;
    var h = id && document.getElementById(id);
    if (h) td.scrollTo({ top: h.offsetTop - td.querySelector('.td-head').offsetHeight - 16 });
  }
  if (td) td.addEventListener('close', function () { if (back) back.focus(); });
  document.querySelectorAll('.tp-all').forEach(function (a) {
    a.addEventListener('click', function (ev) { ev.preventDefault(); tour(a.getAttribute('href').slice(1), a); });
  });

  // chapter photos step through their area in place (arrows, swipe, arrow keys), as most of the award-listed set
  // does (K0294); only the guest's own press moves them. The viewer opens on whichever photo is showing.
  [].slice.call(document.querySelectorAll('figure[data-steps]')).forEach(function (f) {
    var list = JSON.parse(f.dataset.steps), k = 0, pic = f.querySelector('picture'), src = f.querySelector('source'), im = f.querySelector('img');
    if (list.length < 2) return;
    var nav = document.createElement('p');
    nav.className = 'steps';
    nav.innerHTML = '<button type="button" class="s-prev" aria-label="Previous photo"></button>' +
      '<span class="s-n" aria-live="polite"></span><button type="button" class="s-next" aria-label="Next photo"></button>';
    f.appendChild(nav);
    var n = nav.querySelector('.s-n');
    im.draggable = false;  // a mouse swipe would start a native image drag, which never sends pointerup
    function set(x) {
      var s = x[0];
      return 'img/' + s + '-xs.webp 400w, img/' + s + '-sm.webp 800w, img/' + s + '.webp 1400w' + (x[4] ? ', img/' + s + '-xl.webp 2400w' : '');
    }
    // the photos either side are fetched ahead, so a press shows the next one at once rather than after the
    // download (1.7-2.5 s a press on slow 4G, 26 Oct; user: "doesn't feel clean and has a slight lag")
    var held = {};
    function ahead() {
      // Next first and ahead of the page's other photos, Previous once it is in: on a slow link the two at once
      // queued behind a dozen page photos and Next still took 7 s
      var nx = list[(k + 1) % list.length], pv = list[(k - 1 + list.length) % list.length];
      // the 400 px copies either side first (about 30 KB each): a press then shows a photo at once even when the
      // page's released photos fill a slow link (Next took 3.2 s behind them, 26 Oct), and the full one follows
      [nx, pv].forEach(function (x) { if (!held[x[0] + '-xs']) { var q = new Image(); q.fetchPriority = 'high'; q.src = 'img/' + x[0] + '-xs.webp'; held[x[0] + '-xs'] = q; } });
      function one(x, then) {
        if (held[x[0]]) { if (then) then(); return; }
        // low: a press shows the 400 px copy at once anyway, and a photo on the screen comes before one a press away
        // (after a reload these took the link from the open tour tab's lead photo, 11-14 s on 1 Mbit, 26 Oct)
        var p = new Image(); p.fetchPriority = 'low'; p.sizes = src.sizes; p.srcset = set(x); held[x[0]] = p;
        if (then) p.onload = p.onerror = then;
      }
      one(nx, function () { one(pv); });
    }
    function show(j) {
      k = (j + list.length) % list.length;
      var x = list[k], s = x[0], p = held[s];
      // not fetched yet: its 400 px copy (about 30 KB) shows at once and the full one replaces it when it lands
      if (p && p.complete && p.naturalWidth) src.srcset = set(x);
      else {
        src.srcset = 'img/' + s + '-xs.webp 400w';
        if (!p) { p = new Image(); p.fetchPriority = 'high'; p.sizes = src.sizes; p.srcset = set(x); held[s] = p; }
        p.addEventListener('load', function () { if (list[k][0] === s) src.srcset = set(x); });
      }
      im.src = 'img/' + s + '-sm.jpg'; im.alt = x[1]; im.width = x[2]; im.height = x[3];
      n.textContent = (k + 1) + ' / ' + list.length;
      pic.dataset.v = s;
      if (pic.getAttribute('role') === 'button') pic.setAttribute('aria-label', 'Open photo: ' + x[1]);
      ahead();
    }
    // the page's own first photo stays as written (rewriting it at load restarted its download)
    n.textContent = '1 / ' + list.length; pic.dataset.v = list[0][0];
    if ('IntersectionObserver' in window) {
      var near = new IntersectionObserver(function (es) {
        if (!es[0].isIntersecting) return;
        near.disconnect();
        // while the page holds lower photos for the hero (build.py HOLD_JS), fetching ahead would compete with it
        if (document.documentElement.dataset.hold) addEventListener('photos-go', ahead, { once: true }); else ahead();
      }, { rootMargin: '1200px 0px' });
      near.observe(f);
    } else ahead();
    nav.addEventListener('click', function (ev) {
      var b = ev.target.closest('button'); ev.stopPropagation();
      if (b) show(k + (b.classList.contains('s-next') ? 1 : -1));
    });
    f.addEventListener('keydown', function (ev) {
      if (ev.key === 'ArrowRight' || ev.key === 'ArrowLeft') { ev.preventDefault(); show(k + (ev.key === 'ArrowRight' ? 1 : -1)); }
    });
    var x0 = null, swiped = false;
    f.addEventListener('pointerdown', function (ev) { x0 = ev.clientX; swiped = false; });
    f.addEventListener('pointerup', function (ev) {
      if (x0 !== null && Math.abs(ev.clientX - x0) > 50) { swiped = true; show(k + (ev.clientX < x0 ? 1 : -1)); }
      x0 = null;
    });
    // a swipe ends in a click on the photo, which would open the viewer
    f.addEventListener('click', function (ev) { if (swiped) { swiped = false; ev.stopImmediatePropagation(); ev.preventDefault(); } }, true);
  });

  // the viewer: one list of every photo, in the order of the full list
  var order = [];
  [].slice.call((td || document).querySelectorAll('.grid img')).forEach(function (img) {
    var s = slug(img); if (s && order.indexOf(s) < 0) order.push(s);
  });
  if (!order.length) return;
  var caps = {}, sets = {}, dims = {};
  [].slice.call((td || document).querySelectorAll('.grid figure')).forEach(function (f) {
    var im = f.querySelector('img'), s = slug(im), so = f.querySelector('source');
    caps[s] = (f.querySelector('figcaption') || {}).textContent || '';
    sets[s] = so ? so.getAttribute('srcset') || so.dataset.hold || '' : '';  // held until the hero arrives (HOLD_JS)
    dims[s] = [im.width || 4, im.height || 3];
  });
  var d = document.createElement('dialog'), i = 0, from = null;
  d.className = 'viewer';
  d.setAttribute('aria-label', 'Photo viewer');
  d.innerHTML = '<figure><img alt=""><figcaption></figcaption></figure><p class="v-nav">' +
    '<button type="button" class="v-prev">Previous</button><span class="v-n" aria-live="polite"></span>' +
    '<button type="button" class="v-next">Next</button><button type="button" class="v-x">Close</button></p>';
  document.body.appendChild(d);
  var img = d.querySelector('img'), cap = d.querySelector('figcaption'), n = d.querySelector('.v-n');
  img.draggable = false;  // as the steppers: a mouse swipe started a native image drag and never moved the photo (26 Oct audit)
  // Each photo shows at once from its 400 px copy (about 30 KB) and sharpens when the size the screen needs
  // arrives; the photos either side are fetched once this one is in. Before (26 Oct, slow 4G): a 320 KB JPEG
  // a step, 1.2-2.4 s blank, and a box 0 px tall while it came, so a step showed no photo at all.
  function fit(s) {
    var r = dims[s][0] / dims[s][1];
    return Math.ceil(Math.min(innerWidth - 32, (innerHeight - 120) * r));
  }
  function box(s) {  // the photo's own shape before it loads, so the small copy fills it
    var w = fit(s); img.style.width = w + 'px'; img.style.height = Math.round(w * dims[s][1] / dims[s][0]) + 'px';
  }
  addEventListener('resize', function () { if (d.open) { box(order[i]); img.sizes = fit(order[i]) + 'px'; } });
  var held = {};
  function fetch1(s) {
    if (!s || held[s]) return;
    var p = new Image(); p.sizes = fit(s) + 'px'; p.srcset = sets[s] || ''; if (!sets[s]) p.src = 'img/' + s + '.jpg'; held[s] = p;
  }
  function show(k) {
    i = (k + order.length) % order.length;
    var s = order[i], at = i;
    img.removeAttribute('srcset'); img.removeAttribute('src');  // never leave the last photo up under the new caption
    box(s);
    img.style.backgroundImage = 'url(img/' + s + '-xs.webp)';
    img.sizes = fit(s) + 'px';
    if (sets[s]) img.srcset = sets[s]; else img.src = 'img/' + s + '.jpg';
    img.alt = caps[s];
    cap.textContent = caps[s];
    n.textContent = (i + 1) + ' of ' + order.length;
    img.onload = function () {
      if (at !== i) return;
      img.style.backgroundImage = '';
      fetch1(order[(i + 1) % order.length]); fetch1(order[(i - 1 + order.length) % order.length]);
    };
  }
  function view(s, el) { from = el; show(order.indexOf(s)); d.showModal(); d.querySelector('.v-next').focus(); }
  // every photo of the lodge that is in the full list opens here: the hero is left alone
  [].slice.call(document.querySelectorAll('main figure img, .bed-ph img, .tour-show img, .tdlg img')).forEach(function (im) {
    var s = slug(im); if (!s || order.indexOf(s) < 0 || im.closest('.hero')) return;
    // a stepping figure holds its arrow buttons, so its picture (not the figure) is what opens the viewer
    var hold = im.closest('a') || (im.closest('figure[data-steps]') ? im.closest('picture') : im.closest('figure'));
    if (!hold || hold.classList.contains('zoomable')) return;
    hold.dataset.v = hold.dataset.v || s; hold.classList.add('zoomable');
    if (hold.tagName !== 'A') { hold.tabIndex = 0; hold.setAttribute('role', 'button'); hold.setAttribute('aria-label', 'Open photo: ' + (caps[s] || im.alt)); }
    hold.addEventListener('click', function (ev) {
      if (ev.ctrlKey || ev.metaKey || ev.shiftKey) return;
      ev.preventDefault(); view(hold.dataset.v, hold);
    });
    hold.addEventListener('keydown', function (ev) { if (hold.tagName !== 'A' && (ev.key === 'Enter' || ev.key === ' ')) { ev.preventDefault(); view(hold.dataset.v, hold); } });
  });
  d.querySelector('.v-prev').addEventListener('click', function () { show(i - 1); });
  d.querySelector('.v-next').addEventListener('click', function () { show(i + 1); });
  d.querySelector('.v-x').addEventListener('click', function () { d.close(); });
  // a tap on the dark around the photo closes it, as in most viewers; the end of a swipe is not a tap
  var x0 = null, swiped = false;
  d.addEventListener('click', function (ev) {
    if (!swiped && (ev.target === d || ev.target.tagName === 'FIGURE' || ev.target.classList.contains('v-nav'))) d.close();
    swiped = false;
  });
  d.addEventListener('keydown', function (ev) {
    if (ev.key === 'ArrowRight') show(i + 1);
    if (ev.key === 'ArrowLeft') show(i - 1);
  });
  d.addEventListener('pointerdown', function (ev) { x0 = ev.clientX; swiped = false; });
  d.addEventListener('pointerup', function (ev) {
    if (x0 !== null && Math.abs(ev.clientX - x0) > 50) { swiped = true; show(i + (ev.clientX < x0 ? 1 : -1)); }
    x0 = null;
  });
  d.addEventListener('close', function () { img.removeAttribute('srcset'); img.removeAttribute('src'); if (from) from.focus(); });
})();

// A photo whose download fails (a phone dropping signal mid-scroll) is asked for again, up to 3 times, instead of
// staying blank until the page is refreshed (user, 26 Oct: "the images dont load on my phone and I have to refresh").
(function () {
  document.addEventListener('error', function (ev) {
    var im = ev.target;
    if (im.tagName !== 'IMG' || !(im.getAttribute('src') || im.getAttribute('srcset'))) return;
    var n = +(im.dataset.tries || 0);
    if (n >= 3) return;
    im.dataset.tries = n + 1;
    setTimeout(function () {
      var p = im.parentNode, again = '#r' + (n + 1);
      // a changed address makes the browser fetch it again; the part after # is never sent
      if (p && p.tagName === 'PICTURE') [].forEach.call(p.querySelectorAll('source'), function (so) {
        so.srcset = so.getAttribute('srcset').replace(/(\.\w+)(#r\d)?(\s)/g, '$1' + again + '$3');
      });
      if (im.getAttribute('srcset')) im.srcset = im.getAttribute('srcset').replace(/(\.\w+)(#r\d)?(\s)/g, '$1' + again + '$3');
      if (im.getAttribute('src')) im.src = im.getAttribute('src').replace(/#r\d$/, '') + again;
    }, 1500 * (n + 1));
  }, true);
  // the viewer reuses one image for every photo, so its count starts again on each photo that arrives
  document.addEventListener('load', function (ev) { if (ev.target.tagName === 'IMG') delete ev.target.dataset.tries; }, true);
})();

// Back closes an open photo dialog rather than leaving the page, as a phone's back gesture does in an app (26 Oct
// audit). Each dialog that opens adds a history step; closing it any other way takes that step back off.
(function () {
  if (!history.pushState) return;
  var skip = 0;
  [].slice.call(document.querySelectorAll('dialog')).forEach(function (d) {
    var mine = false, byBack = false;
    new MutationObserver(function () {
      if (d.open && !mine) { mine = true; history.pushState({ dlg: 1 }, ''); }
      else if (!d.open && mine) { mine = false; if (byBack) byBack = false; else { skip++; history.back(); } }
    }).observe(d, { attributes: true, attributeFilter: ['open'] });
    d.addEventListener('back', function () { byBack = true; d.close(); });
  });
  window.addEventListener('popstate', function () {
    if (skip) {
      // our own Back step can land on an in-page link's entry, and Chrome then focuses that section
      skip--;
      var had = document.activeElement;
      setTimeout(function () { if (had && had !== document.activeElement && document.contains(had)) had.focus({ preventScroll: true }); }, 0);
      return;
    }
    var top = [].slice.call(document.querySelectorAll('dialog[open]')).pop();  // the viewer comes after the photo list
    if (top) top.dispatchEvent(new Event('back'));
  });
})();

// gentle wheel smoothing on desktop, as 8 of the 13 measured sites do (The PIG and 5 of 8 jury picks use Lenis or
// GSAP; research/compare-v2, K0294). Touch and keyboard scrolling stay native, and reduced motion turns it off.
(function () {
  if (!window.matchMedia('(pointer: fine)').matches || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var s = document.createElement('script');
  s.src = 'lenis.min.js'; s.async = true;
  s.onload = function () {
    var off = window.matchMedia('(prefers-reduced-motion: reduce)');
    var lenis = new window.Lenis({ autoRaf: true, allowNestedScroll: true,
      // the calendar, guest panel and dialogs scroll on their own
      prevent: function (n) { return !!(n.closest && n.closest('dialog, .cal, .gp, .tdlg')); } });
    off.addEventListener('change', function () { if (off.matches) lenis.destroy(); });
    // in-page links glide to their section below the fixed header; a link whose own handler took the click is left alone
    document.addEventListener('click', function (ev) {
      var a = ev.target.closest && ev.target.closest('a[href^="#"]');
      if (!a || ev.defaultPrevented || ev.ctrlKey || ev.metaKey || ev.shiftKey) return;
      var t = document.getElementById(a.getAttribute('href').slice(1));
      if (!t || !t.offsetParent) return;
      ev.preventDefault();
      lenis.scrollTo(t);  // Lenis already honours the page's scroll-padding-top for the header
      // a native jump moves where Tab goes next; this one must too, or Tab carries on from the menu (26 Oct audit)
      if (!t.hasAttribute('tabindex')) t.setAttribute('tabindex', '-1');
      t.focus({ preventScroll: true });
      history.pushState(null, '', a.getAttribute('href'));
    });
  };
  document.head.appendChild(s);
})();
// The map keeps its labels readable by scrolling sideways on a phone, which nothing said (26 Oct audit): name it, and
// let the keyboard scroll it too.
(function () {
  var w = document.querySelector('.map-wrap'); if (!w) return;
  var hint = document.createElement('p'); hint.className = 'map-hint'; hint.textContent = 'Swipe the map sideways to see all of it.';
  w.parentNode.insertBefore(hint, w.nextSibling);
  function fit() {
    var over = w.scrollWidth > w.clientWidth + 1; hint.hidden = !over;
    if (over) { w.tabIndex = 0; w.setAttribute('role', 'region'); w.setAttribute('aria-label', 'Map, scrolls sideways'); }
    else { w.removeAttribute('tabindex'); w.removeAttribute('role'); w.removeAttribute('aria-label'); }
  }
  fit(); window.addEventListener('resize', fit);
})();
