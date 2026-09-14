/* ============================================================
   ImagineAI — Image-to-Video Generator (Demo Engine)

   ⚠ IMPORTANT: This is the FRONT-END demo engine.
   Clicking Generate plays the ready-made demo result video
   (GEN.DEMO_VIDEO — a user-supplied mp4 in images/). When you
   get the real AI backend, replace that flow with your API call
   (upload image → server returns a video URL → set it on
   the <video> element).

   Fallback: if the demo video is missing, the Ken Burns engine
   animates the uploaded image and records a REAL .webm video
   in the browser using MediaRecorder.

   Everything else — upload UI, plans, free credits, gating —
   already works exactly like the final product.

   Plan system (localStorage):
     imagineai_plan    : '' (free) | 'monthly' | 'yearly' | 'lifetime'
     imagineai_credits : legacy counter (kept for the future backend)

   The demo video is ALWAYS free — free users can generate it as
   many times as they want (the image stays locked to the demo
   image until they upgrade).
   ============================================================ */

const GEN = {
  FREE_CREDITS: 5,
  KEY_PLAN: 'imagineai_plan',
  KEY_CREDITS: 'imagineai_credits',

  // Ready-made demo result video + default input image (user-supplied, in images/)
  DEMO_VIDEO: 'images/WhatsApp Video 2026-09-04 at 12.30.16 PM.mp4',
  DEFAULT_IMAGE: 'images/WhatsApp Image 2026-09-04 at 1.00.13 PM.jpeg',

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

  const dropzone = document.getElementById('dropzone');
  const fileInput = document.getElementById('genImage');
  const dzInner = document.getElementById('dzInner');
  const dzPreview = document.getElementById('dzPreview');
  const dzPreviewImg = document.getElementById('dzPreviewImg');
  const dzRemove = document.getElementById('dzRemove');
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

  const state = { img: null, url: null, live: null };

  const sleep = ms => new Promise(r => setTimeout(r, ms));

  /* ---------- Motion presets ---------- */
  const MOTIONS = {
    'zoom-in':  { from: { s: 1.0,  px: 0,      py: 0,      r: 0 },    to: { s: 1.22, px: 0,      py: 0,      r: 0 },    pulse: false },
    'zoom-out': { from: { s: 1.22, px: 0,      py: 0,      r: 0 },    to: { s: 1.0,  px: 0,      py: 0,      r: 0 },    pulse: false },
    'pan':      { from: { s: 1.14, px: -0.045, py: 0.012,  r: 0 },    to: { s: 1.14, px: 0.045,  py: -0.012, r: 0 },    pulse: false },
    'orbit':    { from: { s: 1.1,  px: 0,      py: 0.02,   r: -1.6 }, to: { s: 1.12, px: 0,      py: -0.02,  r: 1.6 },  pulse: false },
    'pulse':    { from: { s: 1.04, px: 0,      py: 0,      r: 0 },    to: { s: 1.16, px: 0,      py: 0,      r: 0 },    pulse: true }
  };

  /* ---------- Draw one frame of the motion (Ken Burns) ---------- */
  const drawFrame = (img, m, t, cvs) => {
    const W = cvs.width, H = cvs.height;
    const ctx = cvs.getContext('2d');
    ctx.clearRect(0, 0, W, H);

    const ease = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; // easeInOutCubic
    let et = ease(t);

    let s, px, py, r;
    if (m.pulse) {
      const wave = Math.sin(t * Math.PI * 2); // in-out-in breathing
      s = m.from.s + (m.to.s - m.from.s) * (0.5 + 0.5 * wave);
      px = py = r = 0;
    } else {
      const lerp = (a, b) => a + (b - a) * et;
      s = lerp(m.from.s, m.to.s);
      px = lerp(m.from.px, m.to.px);
      py = lerp(m.from.py, m.to.py);
      r = lerp(m.from.r, m.to.r);
    }

    // cover-fit source dims
    const ir = img.width / img.height, cr = W / H;
    let dw, dh;
    if (ir > cr) { dh = img.height; dw = dh * cr; }
    else { dw = img.width; dh = dw / cr; }

    ctx.save();
    ctx.translate(W / 2 + px * W, H / 2 + py * H);
    ctx.rotate(r * Math.PI / 180);
    ctx.scale(s, s);
    ctx.drawImage(img, -dw / 2, -dh / 2, dw, dh);
    ctx.restore();
  };

  /* ---------- Render the video (real recording when possible) ---------- */
  const renderMotion = async (img, m, duration, cvs, onProgress) => {
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
      recording = false; // canvas tainted (e.g. file:// samples) → live-preview fallback
    }

    for (let f = 0; f < frames; f++) {
      const t = frames === 1 ? 1 : f / (frames - 1);
      drawFrame(img, m, t, cvs);
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
  const startLiveLoop = (img, m, cvs) => {
    cancelAnimationFrame(state.live);
    const period = 8000;
    const start = performance.now();
    const loop = now => {
      const t = ((now - start) % period) / period;
      drawFrame(img, m, t, cvs);
      state.live = requestAnimationFrame(loop);
    };
    state.live = requestAnimationFrame(loop);
  };

  /* ---------- Upload handling ---------- */
  const showPreview = src => {
    dzPreviewImg.src = src;
    dzInner.style.display = 'none';
    dzPreview.style.display = 'block';
  };
  const clearImage = () => {
    state.img = null;
    fileInput.value = '';
    dzPreview.style.display = 'none';
    dzInner.style.display = 'block';
    sampleChips.querySelectorAll('.sample-chip').forEach(c => c.classList.remove('active'));
  };

  /* ---------- Default image: pre-set so the demo is one click ---------- */
  const defaultImg = new Image();
  defaultImg.onload = () => {
    state.img = defaultImg;
    showPreview(GEN.DEFAULT_IMAGE);
  };
  defaultImg.src = GEN.DEFAULT_IMAGE;

  /* ---------- Free plan: the demo image is locked ---------- */
  if (!GEN.isUnlimited()) {
    dzRemove.style.display = 'none';
    const scLabel = sampleChips.querySelector('.sc-label');
    if (scLabel) scLabel.textContent = '🔒 Demo image locked — upgrade to upload your own:';
  }

  /* ---------- The "Your Image" label points at the file input —
     on phones, tapping the label would open the file picker
     directly and bypass the upgrade modal. Block the input
     itself for free users (demo image stays locked). ---------- */
  fileInput.addEventListener('click', e => {
    if (!GEN.isUnlimited()) {
      e.preventDefault(); // stops the file picker from opening
      openUpgradeModal(
        'Want to upload your own image?',
        'The free demo runs with the featured image. Upgrade to Premium to upload any image and turn it into a video.'
      );
    }
  });

  dropzone.addEventListener('click', () => {
    if (!GEN.isUnlimited()) {
      openUpgradeModal(
        'Want to upload your own image?',
        'The free demo runs with the featured image. Upgrade to Premium to upload any image and turn it into a video.'
      );
      return;
    }
    fileInput.click();
  });
  dzRemove.addEventListener('click', e => {
    e.stopPropagation();
    if (!GEN.isUnlimited()) return;
    clearImage();
  });

  fileInput.addEventListener('change', () => {
    if (!GEN.isUnlimited()) {
      // Safety net — free users can NEVER change the demo image.
      fileInput.value = '';
      openUpgradeModal(
        'Want to upload your own image?',
        'The free demo runs with the featured image. Upgrade to Premium to upload any image and turn it into a video.'
      );
      return;
    }
    const file = fileInput.files && fileInput.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { showToast('Please choose an image file 📷'); return; }
    if (file.size > 10 * 1024 * 1024) { showToast('Image is too big — max 10MB'); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        state.img = img;
        showPreview(reader.result);
        sampleChips.querySelectorAll('.sample-chip').forEach(c => c.classList.remove('active'));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });

  /* drag & drop */
  ['dragenter', 'dragover'].forEach(ev => dropzone.addEventListener(ev, e => {
    e.preventDefault();
    dropzone.classList.add('dragover');
  }));
  ['dragleave', 'drop'].forEach(ev => dropzone.addEventListener(ev, e => {
    e.preventDefault();
    dropzone.classList.remove('dragover');
  }));
  dropzone.addEventListener('drop', e => {
    if (!GEN.isUnlimited()) {
      openUpgradeModal(
        'Want to upload your own image?',
        'The free demo runs with the featured image. Upgrade to Premium to upload any image and turn it into a video.'
      );
      return;
    }
    const file = e.dataTransfer.files && e.dataTransfer.files[0];
    if (!file) return;
    const dt = new DataTransfer();
    dt.items.add(file);
    fileInput.files = dt.files;
    fileInput.dispatchEvent(new Event('change'));
  });

  /* ---------- Sample images ---------- */
  sampleChips.querySelectorAll('.sample-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      if (!GEN.isUnlimited()) {
        openUpgradeModal(
          'Want to try more images?',
          'The free demo runs with the featured image. Upgrade to Premium to unlock sample images and upload your own.'
        );
        return;
      }
      const src = chip.dataset.sample;
      const img = new Image();
      img.onload = () => {
        state.img = img;
        showPreview(src);
        sampleChips.querySelectorAll('.sample-chip').forEach(c => c.classList.toggle('active', c === chip));
      };
      img.src = src;
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

    if (!state.img) {
      showToast('Upload an image or pick a sample first 📷');
      return;
    }

    // The demo video is always free — no credit gating here.
    // (Free users stay locked to the demo image; uploading their
    //  own image is what needs a plan.)

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
    setStage('Analyzing your image…', 6);
    await sleep(950);
    setStage('Understanding motion…', 22);
    await sleep(950);

    // stage 3 — the AI engine. For now it plays the ready-made demo result
    // video (the real image-to-video backend plugs in here later).
    setStage('Rendering frames…', 32);
    const demoOk = await new Promise(res => {
      const done = ok => { video.onloadeddata = video.onerror = null; res(ok); };
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
      // demo video missing → fall back to the in-browser Ken Burns engine
      video.removeAttribute('src');
      video.style.display = 'none';
      const result = await renderMotion(state.img, motion, duration, canvas,
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
        startLiveLoop(state.img, motion, canvas);
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
