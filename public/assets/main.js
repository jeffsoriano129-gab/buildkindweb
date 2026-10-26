/* =========================================================
   BuildKind Web — site behaviour (all pages)
   ========================================================= */
(function () {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];

  /* ---------- Header state + back-to-top ---------- */
  const header = $('.site-header');
  const toTop = $('#toTop');
  const onScroll = () => {
    const y = window.scrollY;
    if (header) header.classList.toggle('scrolled', y > 20);
    if (toTop) toTop.classList.toggle('show', y > 700);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
  if (toTop) toTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' }));

  /* ---------- Mobile menu ---------- */
  const toggle = $('#menuToggle');
  const links = $('#navLinks');
  const closeMenu = () => {
    document.body.classList.remove('menu-open');
    if (toggle) { toggle.setAttribute('aria-expanded', 'false'); toggle.setAttribute('aria-label', 'Open menu'); }
  };
  if (toggle && links) {
    toggle.addEventListener('click', () => {
      const open = document.body.classList.toggle('menu-open');
      toggle.setAttribute('aria-expanded', open);
      toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    });
    links.addEventListener('click', e => { if (e.target.closest('a')) closeMenu(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeMenu(); });
    document.addEventListener('click', e => {
      if (document.body.classList.contains('menu-open') && !e.target.closest('.nav')) closeMenu();
    });
    window.matchMedia('(min-width: 901px)').addEventListener('change', closeMenu);
  }

  /* ---------- Scroll reveal ---------- */
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(entries => {
      entries.forEach(en => { if (en.isIntersecting) { en.target.classList.add('in-view'); io.unobserve(en.target); } });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    $$('.reveal, .process, .timeline').forEach(el => io.observe(el));
  } else {
    $$('.reveal').forEach(el => el.classList.add('in-view'));
  }

  /* ---------- Card spotlight ---------- */
  $$('.card').forEach(card => {
    card.addEventListener('pointermove', e => {
      const r = card.getBoundingClientRect();
      card.style.setProperty('--mx', (e.clientX - r.left) + 'px');
      card.style.setProperty('--my', (e.clientY - r.top) + 'px');
    });
  });

  /* ---------- Hero browser: typed URL ---------- */
  const typed = $('#typedUrl');
  if (typed) {
    const url = 'yourbusiness.co.uk';
    if (reduce) typed.textContent = url;
    else {
      let i = 0;
      setTimeout(function type() {
        typed.textContent = url.slice(0, ++i);
        if (i < url.length) setTimeout(type, 60 + Math.random() * 60);
      }, 400);
    }
  }

  /* ---------- Count-up numbers ---------- */
  if ('IntersectionObserver' in window) {
    const countIO = new IntersectionObserver(entries => {
      entries.forEach(en => {
        if (!en.isIntersecting) return;
        const el = en.target, end = +el.dataset.count, suffix = el.dataset.suffix || '';
        countIO.unobserve(el);
        if (reduce || !end) return;
        const start = performance.now(), dur = 1100;
        const step = t => {
          const p = Math.min((t - start) / dur, 1);
          el.textContent = Math.round(end * (1 - Math.pow(1 - p, 3))) + suffix;
          if (p < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      });
    }, { threshold: .6 });
    $$('[data-count]').forEach(el => countIO.observe(el));
  }

  /* ---------- FAQ accordions (one open per list) ---------- */
  $$('.faq-q').forEach(btn => {
    btn.addEventListener('click', () => {
      const item = btn.closest('.faq-item'), list = btn.closest('.faq-list');
      const isOpen = item.classList.contains('open');
      $$('.faq-item.open', list).forEach(o => { o.classList.remove('open'); $('.faq-q', o).setAttribute('aria-expanded', 'false'); });
      if (!isOpen) { item.classList.add('open'); btn.setAttribute('aria-expanded', 'true'); }
    });
  });

  /* ---------- Portfolio filters ---------- */
  const grid = $('.work-grid[data-filterable]');
  const filterBtns = $$('.filter-btn');
  if (grid && filterBtns.length) {
    const cards = $$('.work-card', grid);
    filterBtns.forEach(btn => btn.addEventListener('click', () => {
      const f = btn.dataset.filter;
      filterBtns.forEach(b => { b.classList.toggle('active', b === btn); b.setAttribute('aria-pressed', b === btn); });
      cards.forEach(c => {
        const show = f === 'all' || c.dataset.cat === f;
        c.classList.remove('is-showing');
        c.classList.toggle('is-hidden', !show);
        if (show) { c.classList.add('in-view'); void c.offsetWidth; c.classList.add('is-showing'); }
      });
    }));
  }

  /* ---------- Portfolio lightbox ---------- */
  const lb = $('#lightbox');
  if (lb && typeof lb.showModal === 'function') {
    const lbImg = $('.lb-body img', lb), lbTitle = $('h3', lb), lbNiche = $('small', lb);
    const lbBody = $('.lb-body', lb), lbLoad = $('.lb-loading', lb);
    document.addEventListener('click', e => {
      const shot = e.target.closest('.shot');
      if (!shot) return;
      const card = shot.closest('.work-card');
      lbTitle.textContent = $('h3', card).textContent;
      lbNiche.textContent = $('.work-niche', card).textContent;
      lbImg.hidden = true; lbLoad.hidden = false;
      lbImg.onload = () => { lbLoad.hidden = true; lbImg.hidden = false; };
      lbImg.alt = 'Full-page screenshot of the ' + lbTitle.textContent + ' website';
      lbImg.src = $('img', shot).src;
      lbBody.scrollTop = 0;
      lb.showModal();
      document.body.style.overflow = 'hidden';
    });
    $('.lb-close', lb).addEventListener('click', () => lb.close());
    lb.addEventListener('click', e => { if (e.target === lb) lb.close(); });
    lb.addEventListener('close', () => { document.body.style.overflow = ''; });
  }

  /* ---------- Contact / project inquiry form (Web3Forms) ----------
     Submissions are sent to Web3Forms (https://web3forms.com), which emails
     them to the address set in the Web3Forms dashboard. On success the
     visitor is sent to /thank-you/. Without JavaScript the form still
     posts normally and Web3Forms uses the hidden "redirect" field.        */
  const form = $('#inquiryForm');
  if (form) {
    const THANK_YOU = '/thank-you/';
    // Absolute redirect URL for the no-JavaScript fallback
    const redirect = $('input[name="redirect"]', form);
    if (redirect && /^https?:/.test(location.protocol)) redirect.value = new URL(THANK_YOU, location.href).href;

    // Pre-select a service from ?service=landing|starter|business|migration|fixes
    const svc = new URLSearchParams(location.search).get('service');
    const map = { landing: 'Landing Page', starter: 'Starter Website', business: 'Business Website', migration: 'Website Migration', fixes: 'Website Fixes' };
    const sel = $('#service', form);
    if (svc && map[svc] && sel) sel.value = map[svc];

    const err = $('.form-error', form);
    form.addEventListener('submit', async e => {
      e.preventDefault();
      err.hidden = true;
      const bot = $('input[name="botcheck"]', form);
      if (bot && bot.checked) return; // spam bot ticked the hidden box

      let valid = true;
      $$('[required]', form).forEach(f => {
        const good = f.type === 'checkbox' ? f.checked
          : f.value.trim() && (f.type !== 'email' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.value.trim()));
        f.closest('.field, .check').classList.toggle('invalid', !good);
        if (!good) valid = false;
      });
      if (!valid) { const first = $('.invalid input, .invalid textarea, .invalid select', form); if (first) first.focus(); return; }

      const btn = $('button[type="submit"]', form);
      const label = btn.innerHTML;
      btn.disabled = true;
      btn.textContent = 'Sending…';

      // Personalised email subject, e.g. "New project inquiry: Starter Website – Smith Landscaping"
      const data = new FormData(form);
      const bits = [data.get('Service needed'), data.get('Business name') || data.get('name')].filter(Boolean);
      data.set('subject', 'New project inquiry' + (bits.length ? ': ' + bits.join(' – ') : ''));
      data.delete('redirect');
      [...data.keys()].forEach(k => { if (typeof data.get(k) === 'string' && !data.get(k).trim()) data.delete(k); }); // skip blank optional fields

      try {
        const res = await fetch(form.action, { method: 'POST', body: data, headers: { Accept: 'application/json' } });
        const json = await res.json().catch(() => ({}));
        if (!res.ok || json.success === false) throw new Error(json.message || 'Request failed');
        try { sessionStorage.setItem('bkw-inquiry-name', String(data.get('name') || '').split(' ')[0]); } catch (_) {}
        window.location.href = THANK_YOU;
      } catch (_) {
        err.hidden = false;
        err.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
        btn.disabled = false;
        btn.innerHTML = label;
      }
    });
    $$('input, textarea, select', form).forEach(f => f.addEventListener('input', () => {
      const w = f.closest('.field, .check'); if (w) w.classList.remove('invalid');
    }));
  }

  /* ---------- Thank-you page: greet by first name ---------- */
  const greet = $('[data-greet-name]');
  if (greet) {
    try {
      const n = sessionStorage.getItem('bkw-inquiry-name');
      if (n) { greet.textContent = ', ' + n; sessionStorage.removeItem('bkw-inquiry-name'); }
    } catch (_) {}
  }
})();
