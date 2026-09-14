/* ============================================================
   ImagineAI — Premium feel layer
   (scroll progress bar, live pulse dot, card spotlight glow,
    trust marquee, live activity toasts)

   Pure visual sugar — safe to remove by deleting this file.
   ============================================================ */

(function () {
  'use strict';

  /* ---------- 1. Scroll progress bar ---------- */
  const bar = document.createElement('div');
  bar.className = 'pf-progress';
  document.body.appendChild(bar);
  const onProgress = () => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    bar.style.transform = 'scaleX(' + (max > 0 ? Math.min(window.scrollY / max, 1) : 0) + ')';
  };
  window.addEventListener('scroll', onProgress, { passive: true });
  window.addEventListener('resize', onProgress, { passive: true });
  onProgress();

  /* ---------- 2. Live pulse dot on section eyebrows ---------- */
  document.querySelectorAll('.eyebrow').forEach(el => {
    const dot = document.createElement('span');
    dot.className = 'pf-live';
    el.insertBefore(dot, el.firstChild);
  });

  /* ---------- 3. Card spotlight (mouse-follow blue glow) ---------- */
  const SPOT = '.price-card, .feature-card, .service-card, .step-card, .testi-card';
  document.querySelectorAll(SPOT).forEach(card => {
    card.classList.add('spotlight');
    card.addEventListener('mousemove', e => {
      const r = card.getBoundingClientRect();
      card.style.setProperty('--mx', (e.clientX - r.left) + 'px');
      card.style.setProperty('--my', (e.clientY - r.top) + 'px');
    });
  });

  /* ---------- 4. Trust marquee under hero stats (home) ---------- */
  const stats = document.querySelector('.hero-stats');
  if (stats && stats.parentElement) {
    const items = [
      '★ 4.9/5 Average Rating',
      '10,000+ Happy Creators',
      '25M+ Videos Generated',
      '🛡️ 7-Day Money-Back Guarantee',
      '🔒 100% Secure Payments',
      '⚡ Instant Activation',
      '🎧 24/7 Premium Support',
    ];
    const track = document.createElement('div');
    track.className = 'pf-track';
    track.innerHTML = items.concat(items)
      .map(t => '<span><i></i>' + t + '</span>')
      .join('');
    const marquee = document.createElement('div');
    marquee.className = 'pf-marquee';
    marquee.appendChild(track);
    stats.parentElement.insertBefore(marquee, stats.nextSibling);
  }

  /* ---------- 5. Live activity toasts (social proof / FOMO) ---------- */
  const G_BLUE = 'linear-gradient(135deg,#2563eb,#3b82f6)';
  const G_GOLD = 'linear-gradient(135deg,#f59e0b,#fbbf24)';
  const G_SKY  = 'linear-gradient(135deg,#0ea5e9,#06b6d4)';

  const ACTIVITY = [
    { n: 'Rohan S.',  a: 'just unlocked the Yearly plan',        t: '2 min ago',  c: G_BLUE, go: 'premium' },
    { n: 'Priya M.',  a: 'upgraded to Lifetime — never pay again', t: '4 min ago', c: G_GOLD, go: 'premium' },
    { n: 'Ayaan K.',  a: 'generated a 4K cinematic video',       t: '6 min ago',  c: G_SKY,  go: 'generator' },
    { n: 'Zara N.',   a: 'unlocked Unlimited Creation',          t: '9 min ago',  c: G_BLUE, go: 'premium' },
    { n: 'Vikram D.', a: 'claimed the launch offer 🎁',           t: '12 min ago', c: G_GOLD, go: 'premium' },
    { n: 'Sneha R.',  a: 'turned her wedding photo into a video', t: '15 min ago', c: G_SKY,  go: 'generator' },
    { n: 'Arjun P.',  a: 'upgraded to Yearly — 2 years of AI video free', t: '18 min ago', c: G_BLUE, go: 'premium' },
    { n: 'Meera T.',  a: 'generated her first AI video ✨',        t: '22 min ago', c: G_GOLD, go: 'generator' },
    { n: 'Dev K.',    a: 'just unlocked the Lifetime deal',      t: '26 min ago',  c: G_SKY,  go: 'premium' },
    { n: 'Ananya S.', a: 'animated her product photos',          t: '29 min ago',  c: G_BLUE, go: 'generator' },
  ];

  let idx = 0;
  const showActivity = () => {
    const item = ACTIVITY[idx % ACTIVITY.length];
    idx++;

    const toast = document.createElement('div');
    toast.className = 'pf-toast';
    toast.innerHTML =
      '<div class="pf-av" style="background:' + item.c + '">' + item.n.charAt(0) + '</div>' +
      '<div class="pf-txt"><b>' + item.n + ' ' + item.a + '</b>' +
      '<span>' + item.t + ' · <u>Learn more</u></span></div>';

    toast.addEventListener('click', () => {
      const here = location.pathname.split('/').pop() || 'index.html';
      if (item.go === 'premium') {
        if (here === 'premium.html') {
          const grid = document.getElementById('pricing') || document.querySelector('.pricing-grid');
          if (grid) grid.scrollIntoView({ behavior: 'smooth' });
        } else {
          location.href = 'premium.html';
        }
      } else {
        if (here === 'index.html' || here === '') {
          const gen = document.getElementById('generator');
          if (gen) gen.scrollIntoView({ behavior: 'smooth' });
        } else {
          location.href = 'index.html#generator';
        }
      }
    });

    document.body.appendChild(toast);
    requestAnimationFrame(() => requestAnimationFrame(() => toast.classList.add('show')));

    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 650);
    }, 7000);

    setTimeout(showActivity, 15000 + Math.random() * 9000);
  };
  setTimeout(showActivity, 6000);
})();
