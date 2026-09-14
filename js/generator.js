/* ============================================================
   ImagineAI — Text-to-Video Generator (Demo Engine)

   ⚠ IMPORTANT: This is the FRONT-END demo engine.
   Clicking Generate plays the ready-made demo result video
   (GEN.DEMO_VIDEO — a user-supplied mp4 in images/). When you
   get the real AI backend, replace that flow with your API call
   (send prompt → server returns a video URL → set it on
   the <video> element).

   Fallback: if the demo video is missing, the browser engine
   animates the prompt text over a cinematic gradient and records
   a REAL .webm video using MediaRecorder.

   Everything else — prompt UI, plans, gating — already works
   exactly like the final product.

   Plan system (localStorage):
     imagineai_plan    : '' (free) | 'monthly' | 'yearly' | 'lifetime'
     imagineai_credits : legacy counter (kept for the future backend)

   The demo video is ALWAYS free — free users can generate it as
   many times as they want (the prompt stays locked to the demo
   prompt until they upgrade).
   ============================================================ */

const GEN = {
  FREE_CREDITS: 5,
  KEY_PLAN: 'imagineai_plan',
  KEY_CREDITS: 'imagineai_credits',

  // Ready-made demo result video + default demo prompt
  DEMO_VIDEO: 'images/ai-8.mp4',
  DEMO_PROMPT: 'A majestic tiger running through a misty jungle at sunrise, golden light, cinematic camera',

  plan: () => localStorage.getItem(GEN.KEY_PLAN) || '',
  setPlan(plan) {
    localStorage.setItem(GEN.KEY_PLAN, plan);
    GEN.renderBadges();
  },
  credits() {
    const v = parseInt(localStorage.getItem(GEN.KEY_CREDITS), 10);
    return isNaN(v) ? GEN.FREE_CREDITS : v;
  },
  setCredits(n) {
    localStorage.setItem(GEN.KEY_CREDITS, n);
    GEN.renderBadges();
  },

  isUnlimited() { return GEN.plan() !== ''; },
  hasCredits() { return GEN.isUnlimited() || GEN.credits() > 0; },

  /* ---------- Update plan badge + credits chip everywhere ---------- */
  renderBadges() {
    const plan = GEN.plan();
    document.querySelectorAll('.plan-badge').forEach(b => {
      if (plan === 'lifetime') {
        b.textContent = '★ Lifetime';
        b.className = 'plan-badge pro';
      } else if (plan) {
        b.textContent = '★ Premium';
        b.className = 'plan-badge pro';
      } else {
        b.textContent = 'Free — Unlimited Demo';
        b.className = 'plan-badge free';
      }
    });
    const chip = document.getElementById('creditsChip');
    if (chip) {
      const left = chip.querySelector('.free-left');
      const unlimited = chip.querySelector('.unlimited');
      if (plan) {
        if (left) left.style.display = 'none';
        if (unlimited) unlimited.style.display = 'inline';
      } else {
        if (left) { left.style.display = 'inline'; left.textContent = 'Unlimited demo tries'; }
        if (unlimited) unlimited.style.display = 'none';
      }
    }
  }
};

document.addEventListener('DOMContentLoaded', () => {
  GEN.renderBadges();
  setupGenerator();
  setupModal();
  setupBuyButtons();
  setupMotionChips();
});

/* ============================================================
   Generator UI
   ============================================================ */
function setupGenerator() {
  const form = document.getElementById('genForm');
  if (!form) return; // generator only lives on the home page

  const promptTa = document.getElementById('genPrompt');
  const promptCount = document.getElementById('promptCount');
  const sampleChips = document.getElementById('sampleChips');
  const motionSelect = document.getElementById('genMotion');
  const durationSelect = document.getElementById('genDuration');
  const frame = document.getElementById('genFrame');
  const placeholder = document.getElementById('genPlaceholder');
  const loading = document.getElementById('genLoading');
  const stageText = document.getElementById('stageText');
  const stageBar = document.getElementById('stageBar');
  const canvas = document.getElementById('genCanvas');
  const video = document.getElementById('genVideo');
  const downloadBtn = document.getElementById('downloadBtn');

  const state = { prompt: GEN.DEMO_PROMPT, url: null, live: null };

  const sleep = ms => new Promise(r => setTimeout(r, ms));

  /* ---------- Motion presets ---------- */
  const MOTIONS = {
    'zoom-in':  { from: { s: 1.0,  px: 0,      py: 0,      r: 0 },    to: { s: 1.22, px: 0,      py: 0,      r: 0 },    pulse: false },
    'zoom-out': { from: { s: 1.22, px: 0,      py: 0,      r: 0 },    to: { s: 1.0,  px: 0,      py: 0,      r: 0 },    pulse: false },
    'pan':      { from: { s: 1.14, px: -0.045, py: 0.012,  r: 0 },    to: { s: 1.14, px: 0.045,  py: -0.012, r: 0 },    pulse: false },
    'orbit':    { from: { s: 1.1,  px: 0,      py: 0.02,   r: -1.6 }, to: { s: 1.12, px: 0,      py: -0.02,  r: 1.6 },  pulse: false },
    'pulse':    { from: { s: 1.04, px: 0,      py: 0,      r: 0 },    to: { s: 1.16, px: 0,      py: 0,      r: 0 },    pulse: true }
  };

  /* ---------- Draw one frame of the scene (gradient + prompt text) ---------- */
  const drawScene = (promptText, m, t, cvs) => {
    const W = cvs.width, H = cvs.height;
    const ctx = cvs.getContext('2d');

    // animated cinematic gradient background
    const hue = (t * 360) % 360;
    const g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, 'hsl(' + hue + ', 65%, 45%)');
    g.addColorStop(0.5, 'hsl(' + ((hue + 45) % 360) + ', 70%, 32%)');
    g.addColorStop(1, 'hsl(' + ((hue + 90) % 360) + ', 75%, 22%)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    // drifting glow circles
    ctx.save();
    ctx.globalAlpha = 0.16;
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 3; i++) {
      const cx = W * (0.2 + 0.6 * Math.abs(Math.sin(t * Math.PI * 2 + i * 2.1)));
      const cy = H * (0.2 + 0.6 * Math.abs(Math.cos(t * Math.PI * 2 + i * 1.3)));
      ctx.beginPath();
      ctx.arc(cx, cy, 60 + i * 32, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // motion transform (same presets as the real engine)
    const ease = x => x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; // easeInOutCubic
    const et = ease(t);
    const lerp = (a, b) => a + (b - a) * et;
    let s, px, py, r;
    if (m.pulse) {
      const wave = Math.sin(t * Math.PI * 2); // in-out-in breathing
      s = m.from.s + (m.to.s - m.from.s) * (0.5 + 0.5 * wave);
      px = py = r = 0;
    } else {
      s = lerp(m.from.s, m.to.s);
      px = lerp(m.from.px, m.to.px);
      py = lerp(m.from.py, m.to.py);
      r = lerp(m.from.r, m.to.r);
    }

    // prompt text, wrapped and centered
    ctx.save();
    ctx.translate(W / 2 + px * W, H / 2 + py * H);
    ctx.rotate(r * Math.PI / 180);
    ctx.scale(s, s);
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '600 22px Inter, "Segoe UI", sans-serif';

    const words = String(promptText).split(/\s+/);
    const lines = [];
    let line = '';
    for (const w of words) {
      if ((line + ' ' + w).trim().length > 34) { lines.push(line.trim()); line = w; }
      else line = (line + ' ' + w).trim();
    }
    if (line) lines.push(line);
    const lh = 30;
    const startY = -((lines.length - 1) * lh) / 2;
    lines.forEach((ln, i) => ctx.fillText(ln, 0, startY + i * lh));
    ctx.restore();
  };

  /* ---------- Render the video (real recording when possible) ---------- */
  const renderMotion = async (promptText, m, duration, cvs, onProgress) => {
    const fps = 30;
    const frames = Math.max(Math.round(duration * fps), 1);
    cvs.width = 640; cvs.height = 360;

    let rec = null, chunks = [], recording = false;
    try {
      const stream = cvs.captureStream(fps);
      const mime = ['video/webm;codecs=vp9', 'video/webm', 'video/mp4']
        .find(mt => typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(mt));
      rec = new MediaRecorder(stream, mime ? { mimeType: mime, videoBitsPerSecond: 6000000 } : undefined);
      recording = true;
      rec.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); };
      rec.start(200);
    } catch (err) {
      recording = false; // recording blocked → live-preview fallback
    }

    for (let f = 0; f < frames; f++) {
      const t = frames === 1 ? 1 : f / (frames - 1);
      drawScene(promptText, m, t, cvs);
      if (onProgress) onProgress((f + 1) / frames);
      await sleep(1000 / fps);
    }

    let url = null;
    if (recording) {
      await new Promise(res => { rec.onstop = res; rec.stop(); });
      const blob = new Blob(chunks, { type: 'video/webm' });
      url = URL.createObjectURL(blob);
    }
    return { url, recording };
  };

  /* ---------- Live animation loop (fallback when recording blocked) ---------- */
  const startLiveLoop = (promptText, m, cvs) => {
    cancelAnimationFrame(state.live);
    const period = 8000;
    const start = performance.now();
    const loop = now => {
      const t = ((now - start) % period) / period;
      drawScene(promptText, m, t, cvs);
      state.live = requestAnimationFrame(loop);
    };
    state.live = requestAnimationFrame(loop);
  };

  /* ---------- Prompt input ---------- */
  const updateCount = () => { if (promptCount) promptCount.textContent = promptTa.value.length; };
  promptTa.addEventListener('input', () => { state.prompt = promptTa.value; updateCount(); });

  /* ---------- Free plan: the demo prompt is locked ---------- */
  if (!GEN.isUnlimited()) {
    promptTa.value = GEN.DEMO_PROMPT;
    promptTa.readOnly = true;
    const scLabel = sampleChips.querySelector('.sc-label');
    if (scLabel) scLabel.textContent = '🔒 Demo prompt locked — upgrade to write your own:';
    updateCount();

    // Any attempt to touch the prompt (tap, click, focus, keyboard)
    // → upgrade modal. readOnly stops typing; these block the rest.
    const lockPrompt = e => {
      e.preventDefault();
      openUpgradeModal(
        'Want to write your own prompt?',
        'The free demo runs with the featured prompt. Upgrade to Premium to write any prompt and turn it into a video.'
      );
    };
    promptTa.addEventListener('click', lockPrompt);
    promptTa.addEventListener('focus', lockPrompt);
    promptTa.addEventListener('keydown', lockPrompt);
  } else {
    updateCount();
  }

  /* ---------- Sample prompts ---------- */
  sampleChips.querySelectorAll('.prompt-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      if (!GEN.isUnlimited()) {
        openUpgradeModal(
          'Want to try more prompts?',
          'The free demo runs with the featured prompt. Upgrade to Premium to unlock all sample prompts and write your own.'
        );
        return;
      }
      promptTa.value = chip.dataset.prompt;
      state.prompt = chip.dataset.prompt;
      updateCount();
      sampleChips.querySelectorAll('.prompt-chip').forEach(c => c.classList.toggle('active', c === chip));
    });
  });

  /* ---------- Stage control ---------- */
  const setStage = (text, pct) => {
    stageText.textContent = text;
    stageBar.firstElementChild.style.width = pct + '%';
  };

  /* ---------- Submit ---------- */
  form.addEventListener('submit', async e => {
    e.preventDefault();

    state.prompt = (promptTa.value || '').trim();
    if (!state.prompt) {
      showToast('Write a prompt first ✍️');
      return;
    }

    // The demo video is always free — no credit gating here.
    // (Free users stay locked to the demo prompt; writing their
    //  own prompt is what needs a plan.)

    const motion = MOTIONS[motionSelect.value] || MOTIONS['zoom-in'];
    const duration = parseInt(durationSelect.value, 10) || 5;

    // reset output area
    placeholder.style.display = 'none';
    video.style.display = 'none';
    video.pause();
    if (video.src) URL.revokeObjectURL(video.src);
    video.removeAttribute('src');
    canvas.style.display = 'none';
    cancelAnimationFrame(state.live);
    downloadBtn.style.display = 'none';
    if (state.url) { URL.revokeObjectURL(state.url); state.url = null; }

    // stage 1-2
    loading.classList.add('active');
    setStage('Analyzing your prompt…', 6);
    await sleep(950);
    setStage('Understanding your scene…', 22);
    await sleep(950);

    // stage 3 — the AI engine. For now it plays the ready-made demo result
    // video (the real text-to-video backend plugs in here later).
    setStage('Rendering frames…', 32);
    const demoOk = await new Promise(res => {
      // safety timeout — agar demo video load na ho (stalled/blocked)
      // to 4s baad scene-engine fallback pe chale jao
      const to = setTimeout(() => done(false), 4000);
      const done = ok => { clearTimeout(to); video.onloadeddata = video.onerror = null; res(ok); };
      video.onloadeddata = () => done(true);
      video.onerror = () => done(false);
      video.src = GEN.DEMO_VIDEO;
      video.load();
    });
    for (let p = 40; p <= 80; p += 10) {
      setStage('Rendering frames… ' + p + '%', p);
      await sleep(180);
    }

    // stage 4
    setStage('Encoding video…', 88);
    await sleep(650);
    setStage('Finalizing your video…', 97);
    await sleep(500);

    // show result
    if (demoOk) {
      loading.classList.remove('active');
      state.url = GEN.DEMO_VIDEO; // local demo mp4 — downloadable as-is
      video.style.display = 'block';
      frame.classList.add('has-image');
      video.play().catch(() => {});
      downloadBtn.style.display = 'inline-flex';
      showToast('🎬 Your video is ready!');
    } else {
      // demo video missing → fall back to the in-browser scene engine
      video.removeAttribute('src');
      video.style.display = 'none';
      const result = await renderMotion(state.prompt, motion, duration, canvas,
        p => setStage('Rendering frames… ' + Math.round(p * 100) + '%', 32 + Math.round(p * 50)));
      loading.classList.remove('active');
      if (result.recording && result.url) {
        state.url = result.url;
        video.src = result.url;
        video.style.display = 'block';
        frame.classList.add('has-image');
        video.play().catch(() => {});
        downloadBtn.style.display = 'inline-flex';
        showToast('🎬 Your video is ready!');
      } else {
        // last resort: live animation preview
        canvas.style.display = 'block';
        frame.classList.add('has-image');
        startLiveLoop(state.prompt, motion, canvas);
        showToast('Live preview mode — run via local server to export video files');
      }
    }

  });

  /* ---------- Download ---------- */
  downloadBtn.addEventListener('click', () => {
    if (!state.url) return;
    const a = document.createElement('a');
    a.href = state.url;
    // demo result is a ready .mp4 on disk; recorded results are blob .webm
    a.download = state.url.startsWith('images/')
      ? 'imagineai-video.mp4'
      : 'imagineai-video-' + Date.now() + '.webm';
    a.click();
    showToast('Video downloaded 🎉');
  });
}

/* ============================================================
   Upgrade / purchase modal
   ============================================================ */
let modalTitle, modalText;

function setupModal() {
  const overlay = document.getElementById('modalOverlay');
  if (!overlay) return;
  modalTitle = overlay.querySelector('.m-title');
  modalText = overlay.querySelector('.m-text');
  overlay.querySelector('.modal-close').addEventListener('click', closeModal);
  overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
}

function openUpgradeModal(title, text) {
  if (!modalTitle) return;
  modalTitle.textContent = title;
  modalText.textContent = text;
  document.getElementById('modalOverlay').classList.add('show');
}
function closeModal() {
  document.getElementById('modalOverlay').classList.remove('show');
}
window.openUpgradeModal = openUpgradeModal;

/* ============================================================
   Buy buttons — demo checkout (activates plan instantly)
   Replace with real payment gateway (Razorpay / Stripe) later.
   ============================================================ */
function setupBuyButtons() {
  document.querySelectorAll('[data-buy]').forEach(btn => {
    btn.addEventListener('click', () => {
      const plan = btn.dataset.buy;
      if (plan === 'free') {
        GEN.setPlan('');
        setTimeout(() => location.href = 'index.html#generator', 350);
        return;
      }
      // Real payments → js/payment.js handles the Razorpay link flow
      if (window.PAY) { PAY.buy(plan); return; }
      GEN.setPlan(plan);
      closeModal();
      const names = { monthly: 'Premium', yearly: 'Premium', lifetime: 'Lifetime', pro: 'Pro', elite: 'Elite' };
      const name = names[plan] || 'Premium';
      setTimeout(() => showToast(`🎉 Welcome to ${name}! Unlimited videos unlocked.`), 350);
      setTimeout(() => location.href = 'index.html', 1400);
    });
  });
}

/* ============================================================
   Motion preset chips on services page — jump to generator
   ============================================================ */
function setupMotionChips() {
  document.querySelectorAll('.preset-card').forEach(card => {
    card.addEventListener('click', () => {
      const motion = card.dataset.motion;
      sessionStorage.setItem('imagineai_motion', motion);
      location.href = 'index.html#generator';
    });
  });
  const motionSelect = document.getElementById('genMotion');
  if (motionSelect) {
    const pre = sessionStorage.getItem('imagineai_motion');
    if (pre && [...motionSelect.options].some(o => o.value === pre)) motionSelect.value = pre;
    sessionStorage.removeItem('imagineai_motion');
  }
}
