/* ITLA site behaviour: search, sticky journal tabs, figure lightbox, copy citation */
(function () {
  var me = document.currentScript || document.querySelector('script[src$="site.js"]');
  var root = me ? me.getAttribute('src').replace(/assets\/site\.js$/, '') : '';

  /* compact Submit button when the journal tabs stick */
  var n = document.getElementById('jnav');
  if (n && 'IntersectionObserver' in window) {
    var s = document.createElement('div'); s.style.height = '1px';
    n.parentNode.insertBefore(s, n);
    new IntersectionObserver(function (e) { n.classList.toggle('stuck', !e[0].isIntersecting); }).observe(s);
  }

  /* search */
  var layer = document.getElementById('search'), q = document.getElementById('q'), hits = document.getElementById('hits');
  function norm(t) { return (t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }
  function esc(t) { return String(t).replace(/[&<>"]/g, function (c) { return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); }
  function run() {
    var terms = norm(q.value).split(/\s+/).filter(Boolean), rows = window.ITLA_INDEX || [], out = [];
    if (!terms.length) { hits.innerHTML = ''; return; }
    rows.forEach(function (r) {
      var hay = norm(r.t + ' ' + r.a + ' ' + r.k + ' ' + r.j), score = 0;
      for (var i = 0; i < terms.length; i++) { if (hay.indexOf(terms[i]) < 0) return; if (norm(r.t).indexOf(terms[i]) >= 0) score += 2; else score += 1; }
      out.push([score, r]);
    });
    out.sort(function (a, b) { return b[0] - a[0]; });
    hits.innerHTML = out.slice(0, 20).map(function (x) {
      var r = x[1], u = /^https?:/.test(r.u) ? r.u : root + r.u;
      return '<li><a href="' + esc(u) + '"><b>' + esc(r.t) + '</b><span>' + esc(r.a) + ' &middot; ' + esc(r.j) + ', ' + esc(r.i) + '</span></a></li>';
    }).join('') || '<li class="none">No articles found.</li>';
  }
  function open() { if (!layer) return; layer.hidden = false; q.focus(); }
  function close() { if (layer) layer.hidden = true; }
  document.addEventListener('click', function (e) {
    if (e.target.closest('[data-search]')) { e.preventDefault(); open(); }
    else if (e.target.closest('[data-close]') || e.target === layer) close();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { close(); closeLb(); }
    if (e.key === '/' && !/input|textarea/i.test((document.activeElement || {}).tagName)) { e.preventDefault(); open(); }
  });
  if (q) q.addEventListener('input', run);

  /* figure lightbox */
  var lb = document.getElementById('lightbox');
  function closeLb() { if (lb) lb.hidden = true; }
  document.addEventListener('click', function (e) {
    var z = e.target.closest('a.zoom');
    if (z && lb) { e.preventDefault(); var im = z.querySelector('img'); lb.querySelector('img').src = im ? im.src : z.getAttribute('href'); lb.hidden = false; }
    else if (lb && !lb.hidden && e.target.closest('#lightbox')) closeLb();
  });

  /* copy citation */
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-copy]');
    if (!b) return;
    var el = document.getElementById(b.getAttribute('data-copy'));
    if (!el || !navigator.clipboard) return;
    navigator.clipboard.writeText(el.innerText).then(function () {
      var t = b.textContent; b.textContent = 'Copied'; setTimeout(function () { b.textContent = t; }, 1400);
    });
  });
})();

/* issue accordions open when the pointer moves over them (mouse only; touch keeps tap) */
(function () {
  if (!window.matchMedia || !window.matchMedia("(hover: hover)").matches) return;
  document.querySelectorAll("details.arts").forEach(function (d) {
    var s = d.querySelector("summary");
    var t;
    s.addEventListener("mouseenter", function () { t = setTimeout(function () { d.open = true; }, 120); });
    s.addEventListener("mouseleave", function () { clearTimeout(t); });
  });
})();

/* ---------- motion: hero rotation, parallax, reveal, count-up, reading progress ---------- */
(function () {
  var still = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // rotating hero photos (one per issue)
  document.querySelectorAll('[data-rotate]').forEach(function (h) {
    var slides = [].slice.call(h.querySelectorAll('.slide')), dots = [].slice.call(h.querySelectorAll('.dot'));
    var cap = h.querySelector('.slide-cap'), i = 0, timer = null;
    if (slides.length < 2) return;
    function load(s) { if (!s.style.backgroundImage && s.dataset.bg) s.style.backgroundImage = "url('" + s.dataset.bg + "')"; }
    function show(n) {
      slides[i].classList.remove('is-on'); if (dots[i]) dots[i].classList.remove('is-on');
      i = (n + slides.length) % slides.length; load(slides[i]); load(slides[(i + 1) % slides.length]);
      slides[i].classList.add('is-on'); if (dots[i]) dots[i].classList.add('is-on');
      if (cap) { cap.innerHTML = slides[i].dataset.cap; cap.href = slides[i].dataset.href; }
    }
    function start() { if (!still) { clearInterval(timer); timer = setInterval(function () { show(i + 1); }, 4000); } }
    load(slides[1]);
    dots.forEach(function (d, k) { d.addEventListener('click', function () { show(k); start(); }); });
    h.addEventListener('mouseenter', function () { clearInterval(timer); });
    h.addEventListener('mouseleave', start);
    start();
  });

  // gentle parallax on hero photos
  var heroes = [].slice.call(document.querySelectorAll('.rot .slides'));
  if (heroes.length && !still) {
    var ticking = false;
    window.addEventListener('scroll', function () {
      if (ticking) return; ticking = true;
      requestAnimationFrame(function () {
        var y = window.scrollY;
        heroes.forEach(function (s) { if (y < 900) s.style.transform = 'translateY(' + (y * 0.18) + 'px)'; });
        ticking = false;
      });
    }, { passive: true });
  }

  if (!('IntersectionObserver' in window)) return;

  // cards and blocks rise into view (only those below the first screen)
  if (!still) {
    var items = document.querySelectorAll('.card, .issue, .li-head, .jcard, .most li, .proc, .publish, .join, .fig');
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('shown'); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -40px 0px' });
    var vh = window.innerHeight;
    [].forEach.call(items, function (el, k) {
      if (el.getBoundingClientRect().top > vh) {
        el.classList.add('reveal'); el.style.transitionDelay = ((k % 3) * 80) + 'ms'; io.observe(el);
      }
    });
  }

  // statistics count up the first time they are seen
  var nums = document.querySelectorAll('.figures-bar b');
  if (nums.length && !still) {
    var co = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        co.unobserve(e.target);
        var el = e.target, txt = el.textContent, end = parseInt(txt.replace(/[^0-9]/g, ''), 10);
        if (!end) return;
        var t0 = null, dur = 1200;
        function step(ts) {
          if (!t0) t0 = ts;
          var p = Math.min(1, (ts - t0) / dur), v = Math.round(end * (1 - Math.pow(1 - p, 3)));
          el.textContent = v.toLocaleString('en-US');
          if (p < 1) requestAnimationFrame(step); else el.textContent = txt;
        }
        requestAnimationFrame(step);
      });
    }, { threshold: .4 });
    [].forEach.call(nums, function (n) { co.observe(n); });
  }

  // article pages: reading progress and active section in the table of contents
  var art = document.querySelector('.art');
  if (art) {
    var bar = document.createElement('div'); bar.className = 'progress'; document.body.appendChild(bar);
    window.addEventListener('scroll', function () {
      var r = art.getBoundingClientRect(), total = r.height - window.innerHeight;
      bar.style.width = Math.max(0, Math.min(1, -r.top / Math.max(1, total))) * 100 + '%';
    }, { passive: true });
    var links = {}, heads = [];
    document.querySelectorAll('.toc a').forEach(function (a) {
      var id = a.getAttribute('href').slice(1), h = document.getElementById(id);
      if (h) { links[id] = a; heads.push(h); }
    });
    var so = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (e.isIntersecting) {
          Object.keys(links).forEach(function (k) { links[k].classList.remove('active'); });
          if (links[e.target.id]) links[e.target.id].classList.add('active');
        }
      });
    }, { rootMargin: '-15% 0px -75% 0px' });
    heads.forEach(function (h) { so.observe(h); });
  }
})();
/* every page opens at the top, unless the link points to a section */
(function () {
  try { if ('scrollRestoration' in history) history.scrollRestoration = 'manual'; } catch (e) {}
  if (location.hash) return;
  function top() {
    window.scrollTo(0, 0);
    var h = document.querySelector('.site-head') || document.body;
    if (h && h.scrollIntoView) h.scrollIntoView({ block: 'start' });
  }
  top();
  window.addEventListener('load', top);
})();

/* Windows that send to Google Forms (Report an error, ITLA application form) */
(function () {
  var openers = document.querySelectorAll('[data-open]');
  openers.forEach(function (b) {
    var dlg = document.getElementById(b.dataset.open);
    if (!dlg || typeof dlg.showModal !== 'function') {   /* old browser: links keep working, the button hides */
      if (b.tagName === 'BUTTON') b.hidden = true;
      return;
    }
    b.addEventListener('click', function (e) {
      e.preventDefault();
      var form = dlg.querySelector('form');
      form.hidden = false;
      dlg.querySelector('.gf-msg').textContent = '';
      form.querySelector('[type=submit]').disabled = false;
      dlg.showModal();
      var first = form.querySelector('textarea, input:not([type=hidden]):not(.hp)');
      if (first) first.focus();
    });
  });
  document.querySelectorAll('dialog.gform').forEach(function (dlg) {
    var form = dlg.querySelector('form');
    var msg = dlg.querySelector('.gf-msg');
    var send = form.querySelector('[type=submit]');
    dlg.querySelector('[data-close]').addEventListener('click', function () { dlg.close(); });
    dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!form.reportValidity()) return;
      if (form.elements.website && form.elements.website.value) { dlg.close(); return; } /* filled only by bots */
      var page = form.querySelector('[data-autopage]');
      if (page) page.value = location.href.split('#')[0] + (document.title ? ' | ' + document.title : '');
      var data = new FormData(form);
      data.delete('website');
      send.disabled = true; msg.textContent = 'Sending...';
      fetch(dlg.dataset.action, { method: 'POST', mode: 'no-cors', body: data })
        .then(function () {
          msg.textContent = dlg.dataset.done;
          form.reset();
          setTimeout(function () { if (dlg.open) dlg.close(); }, 3000);
        })
        .catch(function () {
          msg.textContent = 'Sending failed. Please check your connection and try again.';
          send.disabled = false;
        });
    });
  });
})();
