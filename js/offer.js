/* ============================================================
   ImagineAI — Launch Offer countdown

   Offer: buy any plan before 25 September 2026 and get
   12 months of unlimited text-to-video creation FREE.

   After the deadline, every element marked with
   data-offer-banner hides itself automatically.
   ============================================================ */
(function () {
  const DEADLINE = new Date('2026-09-25T23:59:59');
  const pad = n => String(n).padStart(2, '0');

  const tick = () => {
    const diff = DEADLINE - Date.now();
    const expired = diff <= 0;

    document.querySelectorAll('[data-offer-banner]').forEach(el => {
      el.style.display = expired ? 'none' : '';
    });
    if (expired) return;

    const d = Math.floor(diff / 86400000);
    const h = Math.floor(diff / 3600000) % 24;
    const m = Math.floor(diff / 60000) % 60;
    const s = Math.floor(diff / 1000) % 60;

    document.querySelectorAll('[data-offer-countdown]').forEach(el => {
      const set = (cls, v) => {
        const cell = el.querySelector('.' + cls);
        if (cell) cell.textContent = v;
      };
      set('days', d);
      set('hrs', pad(h));
      set('mins', pad(m));
      set('secs', pad(s));
    });
  };

  tick();
  setInterval(tick, 1000);
})();
