/* sms.js — Green Web + SSL Wireless Dual Gateway, with retry queue + Firestore logging */
const SMSGateway = {

  /* =============================================
     🔴 এখানে তোমার আসল credentials বসাও
     ============================================= */
  GREENWEB: {
    token: 'YOUR_GREENWEB_TOKEN',
    url: 'https://api.bdbulksms.net/api.php'
  },

  SSL: {
    api_token: 'YOUR_SSL_API_TOKEN',
    sid: 'GOLAPI',
    url: 'https://api.sslwireless.com/sms/v3/api-sms.php'
  },

  /* Admin alert number */
  ADMIN_PHONE: '01612057371',

  /* ── Phone normalizer ── */
  normalizePhone(raw) {
    let p = raw.replace(/[^0-9]/g, '');
    if (p.startsWith('880')) p = p.slice(3);
    if (p.startsWith('0'))   p = p.slice(1);
    if (p.length !== 10 || !/^[13-9]/.test(p)) return null;
    return '88' + (p.startsWith('0') ? p : '0' + p);
  },

  /* ── Green Web send ── */
  async _gw(phone, msg) {
    if (!this.GREENWEB.token || this.GREENWEB.token.includes('YOUR')) return { ok: false, reason:'not_configured' };
    try {
      const r = await fetch(
        `${this.GREENWEB.url}?json&token=${this.GREENWEB.token}&to=${phone}&message=${encodeURIComponent(msg)}`
      );
      const d = await r.json().catch(() => ({}));
      const ok = d.error === '0' || d.error === 0 || (typeof d.msg === 'string' && d.msg.toLowerCase().includes('success'));
      return { ok, raw: d };
    } catch (e) { return { ok: false, err: e.message }; }
  },

  /* ── SSL Wireless send ── */
  async _ssl(phone, msg) {
    if (!this.SSL.api_token || this.SSL.api_token.includes('YOUR')) return { ok: false, reason:'not_configured' };
    try {
      const r = await fetch(this.SSL.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_token: this.SSL.api_token,
          sid: this.SSL.sid,
          msisdn: phone,
          sms: msg,
          csms_id: 'gs_' + Date.now()
        })
      });
      const d = await r.json().catch(() => ({}));
      return { ok: d.status === 'SUCCESS' || d.statusCode === 200, raw: d };
    } catch (e) { return { ok: false, err: e.message }; }
  },

  /* ── Firestore-এ SMS লগ রাখা (সফল/ব্যর্থ দুটোই) ── */
  async _log(phone, msg, gateway, result, attempt){
    if(!window.__fb) return;
    try{
      await FB.addDoc(FB.collection(FB.db,'sms_logs'), {
        phone, message: msg.slice(0,300), gateway, success: !!result.ok,
        errorReason: result.ok ? null : (result.reason || result.err || 'unknown'),
        attempt, createdAt: FB.serverTimestamp()
      });
    }catch(e){ devWarn('sms log write failed', e.message); }
  },

  /* ── Master send: GW first → SSL fallback → ব্যর্থ হলে retry queue-তে যোগ ── */
  async send(toRaw, msg, _attempt=1) {
    const phone = this.normalizePhone(toRaw);
    if (!phone) { devWarn('SMS: invalid phone', toRaw); return false; }

    let res = await this._gw(phone, msg);
    let gatewayUsed = 'greenweb';
    if (!res.ok) {
      devLog('GW failed → SSL fallback');
      res = await this._ssl(phone, msg);
      gatewayUsed = 'ssl';
    }
    await this._log(phone, msg, gatewayUsed, res, _attempt);

    if (res.ok) { devLog('SMS sent ✓', phone); return true; }

    devWarn('SMS failed both gateways', phone, `attempt ${_attempt}`);
    if(_attempt < 3){
      await this._queueRetry(toRaw, msg, _attempt);
    } else {
      await this._logPermanentFailure(phone, msg);
    }
    return false;
  },

  /* ── ব্যর্থ হলে ৩০ সেকেন্ড পর আবার চেষ্টা (max ৩ বার) ── */
  async _queueRetry(toRaw, msg, attempt){
    setTimeout(()=>{ this.send(toRaw, msg, attempt+1); }, 30000);
  },

  /* ── ৩ বার চেষ্টার পরেও ব্যর্থ হলে admin-এর জন্য visible failure log ── */
  async _logPermanentFailure(phone, msg){
    if(!window.__fb) return;
    try{
      await FB.addDoc(FB.collection(FB.db,'sms_failures'), {
        phone, message: msg.slice(0,300), createdAt: FB.serverTimestamp(), resolved:false
      });
    }catch(e){ devWarn('permanent failure log failed', e.message); }
  },

  /* ── Send to multiple numbers ── */
  async sendMulti(phones, msg) {
    return Promise.all(phones.map(p => this.send(p, msg)));
  },

  /* ============================================
     📩 Message Templates
     ============================================ */
  tpl: {
    orderNew(no, name, total) {
      return `Golapi Shop: ${name} ভাই, অর্ডার #${no} কনফার্ম! মোট: ${total}৳। ৬০-৯০ মিনিটে ডেলিভারি। ধন্যবাদ 🌹 golapishop.online`;
    },
    orderAssigned(no, driverName, driverPhone) {
      return `Golapi Shop: অর্ডার #${no} রওনা হয়েছে! ড্রাইভার: ${driverName} (${driverPhone})। অ্যাপে লাইভ ট্র্যাক করুন।`;
    },
    orderDelivered(no, productId) {
      const link = productId ? `golapishop.online/#product?id=${productId}` : 'golapishop.online';
      return `Golapi Shop: অর্ডার #${no} ডেলিভারি সম্পন্ন ✅ কেমন লাগলো জানান, ৩০ সেকেন্ডে রিভিউ দিন: ${link}`;
    },
    orderCancelled(no) {
      return `Golapi Shop: অর্ডার #${no} বাতিল হয়েছে। যোগাযোগ: 01612-057371`;
    },
    refundApproved(no, amount) {
      return `Golapi Shop: অর্ডার #${no}-এর ${amount}৳ রিফান্ড অনুমোদিত। ২-৩ কার্যদিবসে পাবেন।`;
    },
    welcome(name) {
      return `Golapi Shop Online-এ স্বাগতম ${name}! 🌹 আপনার দায়িত্ব লিস্ট করা, আমাদের বাজার করা। golapishop.online`;
    },
    adminNewOrder(no, name, total, zone) {
      return `[নতুন অর্ডার] #${no} | ${name} | ${total}৳ | ${zone} — Admin: golapishop.online`;
    },
    otp(code) {
      return `Golapi Shop: আপনার OTP কোড ${code}। ৫ মিনিট বৈধ। কাউকে শেয়ার করবেন না।`;
    }
  },

  /* ============================================
     🚀 Auto-trigger Functions
     ============================================ */

  async onOrderPlaced(order) {
    const no = (order.orderNumber || order.id || '').substring(0, 8).toUpperCase();
    const total = order.subtotal || 0;
    const name = order.customerName || 'গ্রাহক';
    const phone = order.customerPhone || '';
    const zone = order.district || '';

    await Promise.all([
      this.send(phone, this.tpl.orderNew(no, name, total)),
      this.send(this.ADMIN_PHONE, this.tpl.adminNewOrder(no, name, total, zone))
    ]);
  },

  async onDriverAssigned(order, driverName, driverPhone) {
    const no = (order.orderNumber || order.id || '').substring(0, 8).toUpperCase();
    await this.send(order.customerPhone, this.tpl.orderAssigned(no, driverName, driverPhone));
  },

  async onDelivered(order) {
    const no = (order.orderNumber || order.id || '').substring(0, 8).toUpperCase();
    const firstProductId = order.items?.[0]?.productId || null;
    await this.send(order.customerPhone, this.tpl.orderDelivered(no, firstProductId));
  },

  async onCancelled(order) {
    const no = (order.orderNumber || order.id || '').substring(0, 8).toUpperCase();
    await this.send(order.customerPhone, this.tpl.orderCancelled(no));
  },

  async onRefundApproved(order, amount) {
    const no = (order.orderNumber || order.id || '').substring(0, 8).toUpperCase();
    await this.send(order.customerPhone, this.tpl.refundApproved(no, amount));
  },

  async onWelcome(phone, name) {
    await this.send(phone, this.tpl.welcome(name));
  }
};

/* devLog না থাকলে ক্র্যাশ এড়াতে ফলব্যাক */
if(typeof devLog === 'undefined'){ window.devLog = function(...a){ if(typeof isDev!=='undefined' && isDev) console.log(...a); }; }