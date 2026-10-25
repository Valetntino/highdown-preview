// Phone menu: one tap opens the section list, a tap on a link (or outside, or Escape) closes it.
// The phone booking bar steps aside while the booking form itself is on screen, so it never covers the form.
(function () {
  var top = document.querySelector('.top'), btn = document.querySelector('.menu-btn');
  if (top && btn) {
    function set(open) { top.classList.toggle('open', open); btn.setAttribute('aria-expanded', open ? 'true' : 'false'); }
    btn.addEventListener('click', function () { set(!top.classList.contains('open')); });
    top.querySelectorAll('nav a').forEach(function (a) { a.addEventListener('click', function () { set(false); }); });
    document.addEventListener('click', function (ev) { if (!top.contains(ev.target)) set(false); });
    document.addEventListener('keydown', function (ev) { if (ev.key === 'Escape') set(false); });
  }
  var bar = document.querySelector('.mbar'), book = document.getElementById('book');
  if (bar && book && 'IntersectionObserver' in window) {
    new IntersectionObserver(function (es) { bar.classList.toggle('away', es[0].isIntersecting); }).observe(book);
  }
})();
// Date helpers for the Airbnb hand-off. The form works without this file; this only stops impossible dates,
// shows dates in words ('Fri 13 Nov') over the native input, and leaves empty fields out of the Airbnb link.
(function () {
  var ci = document.getElementById('ci'), co = document.getElementById('co'), form = document.getElementById('book');
  if (!ci || !co || !form) return;
  function iso(d) { return d.toISOString().slice(0, 10); }
  function show(el) {
    var s = el.parentNode.querySelector('.shown');
    if (!s) return;
    if (!el.value) { s.textContent = 'Add date'; s.classList.add('empty'); return; }
    var p = el.value.split('-'), d = new Date(+p[0], +p[1] - 1, +p[2]);
    s.textContent = d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
    s.classList.remove('empty');
  }
  function pick(el) { try { el.showPicker(); } catch (err) { /* older browsers: the native control still works */ } }
  var today = new Date(); ci.min = iso(today);
  ci.addEventListener('change', function () {
    if (!ci.value) return;
    var next = new Date(ci.value); next.setDate(next.getDate() + 1);
    co.min = iso(next);
    if (!co.value || co.value <= ci.value) co.value = iso(next);
    show(co);
  });
  [ci, co].forEach(function (el) {
    el.addEventListener('input', function () { show(el); });
    el.addEventListener('change', function () { show(el); });
    el.addEventListener('click', function () { pick(el); });
    el.addEventListener('keydown', function (ev) {
      if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); pick(el); }
    });
    show(el);
  });
  var ad = document.getElementById('ad'), gu = document.getElementById('gu');
  form.addEventListener('submit', function () {
    if (ad && gu) gu.value = ad.value;  // the hand-off URL that kept dates and party size on 23 Oct 2026 carried both adults= and guests=
    [ci, co].forEach(function (el) { if (!el.value) el.disabled = true; });
    setTimeout(function () { ci.disabled = false; co.disabled = false; }, 0);
  });
})();
// Direct price: the total for the dates typed in the booking bar, worked out from the settings in #pricing
// (src/pricing.json; research/booking-v1/PLAN.md, 25 Oct 2026). The guest requests the dates by email; the owners
// reply and agree them before anything is paid. Until show_everywhere is set, the quote shows only on the preview
// link and local tests; elsewhere the "ask us for a price" email still carries the dates and party.
(function () {
  var ask = document.getElementById('ask'), ci = document.getElementById('ci'), co = document.getElementById('co'),
      ad = document.getElementById('ad'), box = document.getElementById('quote'), cfg = document.getElementById('pricing');
  if (!ask || !ci || !co || !ad) return;
  var P = null, N = null, nt = document.getElementById('nights');
  try { P = JSON.parse(cfg.textContent); } catch (err) { P = null; }
  try { N = nt ? JSON.parse(nt.textContent) : null; } catch (err) { N = null; }
  var local = /^(localhost|127\.0\.0\.1)$/.test(location.hostname), preview = /\/highdown-preview\//.test(location.pathname);
  var base = ask.getAttribute('href').split('?')[0], DAY = 864e5;
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
    if (lead < P.earliest_days_ahead) return { msg: 'For arrivals in the next ' + P.earliest_days_ahead + ' days, please ring us.' };
    if (n < P.min_nights && !(n === 2 && lead <= P.two_night_within_days))
      return { msg: n === 1 ? 'We take stays of 2 nights or more.' :
        '2-night stays open up for arrivals within ' + Math.round(P.two_night_within_days / 7) + ' weeks; otherwise it’s ' + P.min_nights + ' nights or more.' };
    var direct = 0, air = 0;
    for (var i = 0; i < n; i++) {
      var d = new Date(a.getFullYear(), a.getMonth(), a.getDate() + i), we = d.getDay() === 5 || d.getDay() === 6;
      if (N) {
        var x = N.nights[iso(d)];
        if (!x) return { msg: 'We can’t price these dates here yet. Ask us for a price.' };
        if (!x.open) return { msg: 'Some of these nights are already booked. Try other dates, or ask us.' };
        direct += x.air * (1 - P.per_night.direct_off);
        air += x.air;
        continue;
      }
      var s = P.season[String(d.getMonth() + 1)] || 1, r = (we ? P.night.fri_sat : P.night.weekday) * s;
      if (Math.round((d - today) / DAY) <= P.last_minute.within_days) r *= 1 - P.last_minute.off;
      direct += r;
      air += (we ? P.airbnb.fri_sat : P.airbnb.weekday) * s;
    }
    for (var j = 0; j < P.long_stay.length; j++) if (n >= P.long_stay[j].from) { direct *= 1 - P.long_stay[j].off; break; }
    if (n >= 7) air *= 1 - P.airbnb.weekly_discount;
    var net = air * (1 - P.airbnb.host_fee * (1 + P.airbnb.vat_on_fee));
    var floor = (net + P.card_fee.fixed) / (1 - P.card_fee.rate);
    var stay = Math.round(Math.min(Math.max(direct, floor), air));
    var fee = dog ? (P.dog_fee.busy_months.indexOf(a.getMonth() + 1) >= 0 ? P.dog_fee.busy : P.dog_fee.quiet) : 0;
    return { n: n, stay: stay, fee: fee, total: stay + fee, from: a, to: b };
  }

  var parts = {};
  if (show) {
    box.innerHTML = '<p class="q-line"><b class="q-total"></b> <span class="q-what"></span></p>' +
      '<p class="q-msg"></p>' +
      '<label class="q-dog"><input type="checkbox" id="dog"> Bringing your dog <span class="q-fee"></span></label>' +
      '<p class="q-act"><a class="btn" id="req" href="#">Request these dates</a></p>' +
      '<p class="q-terms">Nothing is paid until we’ve spoken and agreed your dates. Then ' +
      Math.round(P.deposit_share * 100) + '% secures them and the rest is due ' + P.balance_days_before +
      ' days before you arrive, with a ' + money(P.damage_deposit) + ' damage deposit we refund after your stay.</p>';
    ['q-line', 'q-total', 'q-what', 'q-msg', 'q-dog', 'q-fee', 'q-act', 'q-terms'].forEach(function (c) { parts[c] = box.querySelector('.' + c); });
    parts.dog = box.querySelector('#dog'); parts.req = box.querySelector('#req');
  }

  function mail(subject, lines) {
    return base + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(lines.join('\n'));
  }
  function update() {
    var dog = show && parts.dog.checked, q = show ? quote(dog) : null;
    var lines = ['Hello Luca and Trina,', '', 'Please could you give us a direct price for Elderflower Lodge.', '',
      'Arrive: ' + words(ci.value), 'Leave: ' + words(co.value), 'Guests: ' + ad.value, '', 'Thank you,', ''];
    ask.setAttribute('href', mail('Elderflower Lodge: a direct price', lines));
    if (!show) return;
    box.hidden = !q;
    if (!q) return;
    var priced = q.total !== undefined;
    parts['q-line'].hidden = parts['q-dog'].hidden = parts['q-act'].hidden = parts['q-terms'].hidden = !priced;
    parts['q-msg'].hidden = priced;
    if (!priced) { parts['q-msg'].textContent = q.msg; return; }
    parts['q-total'].textContent = money(q.total);
    parts['q-what'].textContent = 'for ' + q.n + ' nights, booking direct with us' + (q.fee ? ', including your dog' : '') + '.';
    var month = q.from.getMonth() + 1;
    parts['q-fee'].textContent = '(+' + money(P.dog_fee.busy_months.indexOf(month) >= 0 ? P.dog_fee.busy : P.dog_fee.quiet) + ')';
    parts.req.setAttribute('href', mail('Elderflower Lodge: request for ' + short(q.from) + ' to ' + short(q.to), [
      'Hello Luca and Trina,', '', 'We’d like to stay at Elderflower Lodge, booking direct.', '',
      'Arrive: ' + words(ci.value), 'Leave: ' + words(co.value), 'Nights: ' + q.n, 'Guests: ' + ad.value,
      'Dog: ' + (dog ? 'yes, one small dog' : 'no'), 'Price shown on your website: ' + money(q.total) + ' in total', '',
      'Name:', 'Phone:', '', 'Thank you,', '']));
  }
  [ci, co, ad].forEach(function (el) { el.addEventListener('change', update); el.addEventListener('input', update); });
  if (show) parts.dog.addEventListener('change', update);
  update();
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
