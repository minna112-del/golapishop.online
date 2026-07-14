/* payment.js — bKash/Nagad Payment Gateway Integration (Zone-aware) */
const PaymentGateway = {

  /* জোন অনুযায়ী merchant নম্বর — একক সোর্স utils.js এর BRANCH_INFO */
  getMerchantNumber(method, zone) {
    const info = (typeof BRANCH_INFO !== 'undefined') ? BRANCH_INFO[zone] : null;
    if (!info) return null;
    return method === 'bkash' ? info.bkashNumber : info.nagadNumber;
  },

  accountType: 'personal', // দুই জোনের নম্বরই personal অ্যাকাউন্ট

  /* Generate payment instructions for customer */
  generateBkashInstructions(amount, orderId, zone) {
    const number = this.getMerchantNumber('bkash', zone) || 'শাখা নির্বাচন করুন';
    return {
      number,
      amount: amount,
      reference: orderId.substring(0, 8).toUpperCase(),
      instructions: [
        `*247# ডায়াল করুন অথবা bKash App খুলুন`,
        `Send Money নির্বাচন করুন`,
        `নম্বর: ${number}`,
        `টাকা: ${amount}৳`,
        `রেফারেন্স: ${orderId.substring(0,8).toUpperCase()}`,
        `PIN দিয়ে কনফার্ম করুন`,
        `ট্রানজেকশন ID কপি করে নিচে পেস্ট করুন`
      ]
    };
  },

  generateNagadInstructions(amount, orderId, zone) {
    const number = this.getMerchantNumber('nagad', zone) || 'শাখা নির্বাচন করুন';
    return {
      number,
      amount: amount,
      reference: orderId.substring(0, 8).toUpperCase(),
      instructions: [
        `Nagad App খুলুন`,
        `Send Money নির্বাচন করুন`,
        `নম্বর: ${number}`,
        `টাকা: ${amount}৳`,
        `রেফারেন্স: ${orderId.substring(0,8).toUpperCase()}`,
        `PIN দিয়ে কনফার্ম করুন`,
        `ট্রানজেকশন ID কপি করে নিচে পেস্ট করুন`
      ]
    };
  },

  /* Verify payment transaction ID format */
  validateTrxId(trxId, method) {
    if (!trxId || trxId.trim().length < 8) return false;
    if (method === 'bkash') return /^[A-Z0-9]{8,}$/.test(trxId.trim().toUpperCase());
    if (method === 'nagad') return /^[A-Z0-9]{8,}$/.test(trxId.trim().toUpperCase());
    return true;
  },

  /* Show payment modal with instructions */
  showPaymentModal(method, amount, orderId, zone) {
    const isBkash = method === 'bkash';
    const info = isBkash
      ? this.generateBkashInstructions(amount, orderId, zone)
      : this.generateNagadInstructions(amount, orderId, zone);
    const logo = isBkash ? '📱 bKash' : '📱 Nagad';
    const color = isBkash ? '#E2136E' : '#EC1C24';

    const existing = document.getElementById('paymentModalOverlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'paymentModalOverlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:10000;display:flex;align-items:center;justify-content:center;padding:16px';
    overlay.innerHTML = `
      <div style="background:#0d1117;border:1px solid ${color}33;border-radius:18px;max-width:400px;width:100%;overflow:hidden">
        <div style="background:${color};padding:16px;text-align:center">
          <div style="font-size:20px;font-weight:700;color:#fff">${logo}</div>
          <div style="font-size:28px;font-weight:800;color:#fff;margin-top:4px">${money(amount)}৳</div>
        </div>
        <div style="padding:16px">
          <div style="background:rgba(${isBkash?'226,19,110':'236,28,36'},0.08);border:1px solid ${color}33;border-radius:12px;padding:12px;margin-bottom:14px;text-align:center">
            <div style="font-size:11px;color:var(--ink-muted);margin-bottom:4px">পেমেন্ট নম্বর</div>
            <div style="font-size:22px;font-weight:700;color:${color};letter-spacing:1px;font-family:Poppins">${info.number}</div>
            <div style="font-size:11px;color:var(--ink-muted);margin-top:4px">রেফারেন্স: ${info.reference}</div>
          </div>
          <div style="margin-bottom:14px">
            <div style="font-size:13px;color:#fff;margin-bottom:8px;font-weight:600">📋 নিয়মাবলী:</div>
            ${info.instructions.map((s,i) => `<div style="font-size:12px;color:var(--ink-muted);margin-bottom:4px;display:flex;gap:6px"><span style="color:${color};font-weight:700">${i+1}.</span><span>${s}</span></div>`).join('')}
          </div>
          <div style="margin-bottom:14px">
            <label style="font-size:12px;color:#fff;display:block;margin-bottom:6px">ট্রানজেকশন ID লিখুন *</label>
            <input id="trxIdInput" type="text" placeholder="যেমন: 8N7K4M2X" style="width:100%;padding:12px;background:rgba(255,255,255,0.05);border:1px solid var(--line);border-radius:10px;color:#fff;font-size:15px;font-family:Poppins" oninput="this.value=this.value.toUpperCase()">
          </div>
          <div style="display:flex;gap:8px">
            <button class="btn btn-outline" style="flex:1" onclick="PaymentGateway.closeModal()">বাতিল</button>
            <button class="btn" style="flex:1;background:${color};border:none;color:#fff" onclick="PaymentGateway.confirmPayment('${method}', '${orderId}', ${amount})">কনফার্ম ✅</button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
  },

  closeModal() {
    const el = document.getElementById('paymentModalOverlay');
    if (el) el.remove();
  },

  async confirmPayment(method, orderId, amount) {
    const trxId = document.getElementById('trxIdInput')?.value.trim() || '';
    if (!this.validateTrxId(trxId, method)) {
      toast('সঠিক ট্রানজেকশন ID লিখুন', 'error');
      return;
    }
    if (FB) {
      try {
        await FB.updateDoc(FB.doc(FB.db, 'orders', orderId), {
          paymentStatus: 'paid_pending_verification',
          paymentMethod: method,
          paymentTrxId: trxId,
          paymentVerifiedAt: null
        });
        this.closeModal();
        toast('✓ পেমেন্ট সাবমিট হয়েছে! যাচাই হলে অর্ডার কনফার্ম হবে', 'success');
        setTimeout(() => Router.go('order-success'), 1500);
      } catch (e) {
        toast('সাবমিট ব্যর্থ: ' + e.message, 'error');
      }
    }
  }
};