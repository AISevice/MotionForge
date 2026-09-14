/* ============================================================
   ImagineAI — Showcase videos

   Saare `video.showcase` elements sirf tab play hote hain jab
   wo screen pe dikhte hain (IntersectionObserver) — data/battery
   bachata hai aur phone pe smooth chalta hai. Videos muted +
   loop + playsinline hote hain, isliye har browser me autoplay
   allowed hai.
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
  const vids = document.querySelectorAll('video.showcase');
  if (!vids.length) return;

  const play = v => v.play().catch(() => { /* abhi possible nahi — baad me retry hoga */ });

  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(entries => {
      entries.forEach(en => {
        if (en.isIntersecting) play(en.target);
        else en.target.pause();
      });
    }, { threshold: 0.15 });
    vids.forEach(v => io.observe(v));
  } else {
    vids.forEach(play); // purane browsers — sab chala do
  }
});
