/* sms.js — Green Web + SSL Wireless Dual Gateway */
const SMSGateway = {

  /* =============================================
     🔴 এখানে তোমার আসল credentials বসাও
     ============================================= */
  GREENWEB: {
    token: 'YOUR_GREENWEB_TOKEN',
    url: 'https://api.greenweb.com.bd/api/v2/send.php'
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
    if (!this.GREENWEB.token || this.GREENWEB.token.includes('YOUR')) return { ok: false };
    try {
      const r = await fetch(
        `${this.GREENWEB.url}?token=${this.GREENWEB.token}&to=${phone}&message=${encodeURIComponent(msg)}&type=text`
      );
      const d = await r.json().catch(() => ({}));
      return { ok: d.status === 'SENT' || d.result === 'success', raw: d };
    } catch (e) { return { ok: false, err: e.message }; }
  },

  /* ── SSL Wireless send ── */
  async _ssl(phone, msg) {
    if (!this.SSL.api_token || this.SSL.api_token.includes('YOUR')) return { ok: false };
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

  /* ── Master send: GW first → SSL fallback ── */
  async send(toRaw, msg) {
    const phone = this.normalizePhone(toRaw);
    if (!phone) { devWarn('SMS: invalid phone', toRaw); return false; }

    let res = await this._gw(phone, msg);
    if (!res.ok) {
      devLog('GW failed → SSL fallback');
      res = await this._ssl(phone, msg);
    }
    if (res.ok) devLog('SMS sent ✓', phone);
    else        devWarn('SMS failed both gateways', phone);
    return res.ok;
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
    orderDelivered(no) {
      return `Golapi Shop: অর্ডার #${no} ডেলিভারি সম্পন্ন ✅ ধন্যবাদ! রিভিউ দিন: golapishop.online`;
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
     (pages.js / services.js থেকে call করো)
     ============================================ */

  /* নতুন অর্ডার হলে — customer + admin দুজনকেই SMS */
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

  /* ড্রাইভার assign হলে */
  async onDriverAssigned(order, driverName, driverPhone) {
    const no = (order.orderNumber || order.id || '').substring(0, 8).toUpperCase();
    await this.send(order.customerPhone, this.tpl.orderAssigned(no, driverName, driverPhone));
  },

  /* ডেলিভারি হলে */
  async onDelivered(order) {
    const no = (order.orderNumber || order.id || '').substring(0, 8).toUpperCase();
    await this.send(order.customerPhone, this.tpl.orderDelivered(no));
  },

  /* অর্ডার বাতিল হলে */
  async onCancelled(order) {
    const no = (order.orderNumber || order.id || '').substring(0, 8).toUpperCase();
    await this.send(order.customerPhone, this.tpl.orderCancelled(no));
  },

  /* রিফান্ড approved হলে */
  async onRefundApproved(order, amount) {
    const no = (order.orderNumber || order.id || '').substring(0, 8).toUpperCase();
    await this.send(order.customerPhone, this.tpl.refundApproved(no, amount));
  },

  /* Registration welcome */
  async onWelcome(phone, name) {
    await this.send(phone, this.tpl.welcome(name));
  }
};