/* ============================================================
   ImagineAI — Razorpay Payment Links

   LINKS: user ke Razorpay account se banaye gaye payment links
   (2026-09-06). Buy button seedha Razorpay checkout pe le jata
   hai — payment ke baad Razorpay user ko payment-success.html
   pe redirect karta hai (redirect URL har link ke dashboard me
   set hona chahiye — "After payment, redirect customer to").

   ⚠ WHATSAPP me abhi user ka number nahi hai — jab mile to
   '91XXXXXXXXXX' ki jagah daalo.
   ============================================================ */

window.PAY = {
  LINKS: {
    monthly:  'https://rzp.io/rzp/JxiNsYI', // ₹399/month
    yearly:   'https://rzp.io/rzp/Rhk7DjT', // ₹459/year (launch offer plan)
    lifetime: 'https://rzp.io/rzp/gjNjaFT', // ₹799 one-time
  },

  WHATSAPP: '91XXXXXXXXXX', // ⚠ apna WhatsApp number (country code ke saath)

  PLAN_INFO: {
    monthly:  { name: 'Monthly Premium',  price: '₹399/month' },
    yearly:   { name: 'Yearly Premium',   price: '₹459/year' },
    lifetime: { name: 'Lifetime Premium', price: '₹799 one-time' },
  },

  /* ---------- Buy button handler ---------- */
  buy(plan) {
    const link = PAY.LINKS[plan];
    if (link) {
      // Real payment — user Razorpay checkout pe jayega,
      // payment ke baad success page pe wapas redirect hoga.
      location.href = link;
      return;
    }

    // Payment link abhi set nahi hua — demo mode (old behaviour).
    // Links paste hote hi ye branch kabhi nahi chalega — user
    // seedha Razorpay checkout pe jayega.
    const info = PAY.PLAN_INFO[plan] || { name: 'Premium' };
    GEN.setPlan(plan);
    if (typeof closeModal === 'function') closeModal();
    setTimeout(() => showToast(
      '🎉 ' + info.name + ' activated!'
    ), 350);
    setTimeout(() => location.href = 'index.html', 1800);
  },

  /* ---------- Success page ---------- */
  initSuccessPage() {
    const wa = document.getElementById('waSupport');
    if (wa) {
      const num = (PAY.WHATSAPP || '').replace(/[^0-9]/g, '');
      if (num && num.length >= 10) wa.href = 'https://wa.me/' + num;
    }

    const box = document.getElementById('payStatus');
    if (!box) return; // sirf payment-success.html pe chalta hai

    const q = new URLSearchParams(location.search);
    const plan = q.get('plan');
    const paymentId = q.get('razorpay_payment_id') || q.get('razorpay_payment_link_id') || '';
    const info = PAY.PLAN_INFO[plan];

    if (plan && info) {
      document.getElementById('payPlanName').textContent = info.name;
      document.getElementById('payPlanPrice').textContent =
        info.price + (plan === 'yearly' ? ' + 1 Year FREE 🎁' : '');
      try {
        localStorage.setItem('imagineai_pending_payment', JSON.stringify({
          plan: plan,
          payment_id: paymentId,
          at: new Date().toISOString()
        }));
      } catch (e) { /* private mode — ignore */ }
    }

    if (paymentId) {
      document.getElementById('payId').textContent = paymentId;

      // Payment confirmed by Razorpay (redirect happens only after
      // successful payment) → activate the plan on this device right
      // away. Static site, no backend needed.
      if (plan && info) {
        try { localStorage.setItem('imagineai_plan', plan); } catch (e) { /* private mode */ }
        document.getElementById('payNote').innerHTML =
          'Aapka plan <b>activate ho gaya hai</b> 🎉 — generator kholo aur apna prompt likh kar video banao. Payment ID WhatsApp pe bhej do taaki hum aapka record rakh sakein. 👇';
      }

      const msg = 'Namaste! 👋 Maine ImagineAI ka plan kharida hai.%0A• Plan: ' +
        (info ? info.name + ' — ' + info.price : 'Premium') +
        '%0A• Payment ID: ' + paymentId +
        '%0APlease activate kijiye. 🙏';
      const num = (PAY.WHATSAPP || '').replace(/[^0-9]/g, '');
      if (num && num.length >= 10) {
        document.getElementById('payWaBtn').href = 'https://wa.me/' + num + '?text=' + msg;
      }
    } else {
      // Payment abhi process ho raha hai
      document.getElementById('payTitle').textContent = 'Checking your payment…';
      document.getElementById('payNote').innerHTML =
        'Payment abhi process ho raha hai. <b>2-3 second me page refresh</b> kar lo — ya payment ka screenshot WhatsApp pe bhej do.';
      document.getElementById('payIdBox').style.display = 'none';
      document.getElementById('payWaBtn').style.display = 'none';
    }
  }
};

document.addEventListener('DOMContentLoaded', PAY.initSuccessPage);
