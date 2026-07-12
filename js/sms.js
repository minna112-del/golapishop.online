/* sms.js — SMS Gateway Integration (Green Web / SSL Wireless) */
const SMSGateway = {

  /* Green Web Foundation SMS API */
  GREENWEB: {
    token: 'YOUR_GREENWEB_TOKEN', // Green Web থেকে token নাও
    url: 'https://api.greenweb.com.bd/api/v2/send.php'
  },

  /* SSL Wireless SMS API */
  SSL_WIRELESS: {
    user: 'YOUR_SSL_USER',
    pass: 'YOUR_SSL_PASS',
    sid: 'GOLAPI',
    url: 'https://api.sslwireless.com/sms/v3/api-sms.php'
  },

  /* Send SMS via Green Web */
  async sendGreenWeb(to, message) {
    if (!this.GREENWEB.token || this.GREENWEB.token === 'YOUR_GREENWEB_TOKEN') {
      devWarn('Green Web token not set');
      return { success: false, error: 'Token not configured' };
    }
    try {
      const url = `${this.GREENWEB.url}?token=${this.GREENWEB.token}&to=${to}&message=${encodeURIComponent(message)}`;
      const res = await fetch(url);
      const data = await res.json();
      devLog('SMS sent:', data);
      return { success: data.status === 'SENT', data };
    } catch (e) {
      devWarn('SMS error:', e.message);
      return { success: false, error: e.message };
    }
  },

  /* Send SMS via SSL Wireless */
  async sendSSLWireless(to, message) {
    if (this.SSL_WIRELESS.user === 'YOUR_SSL_USER') {
      devWarn('SSL Wireless credentials not set');
      return { success: false, error: 'Credentials not configured' };
    }
    try {
      const res = await fetch(this.SSL_WIRELESS.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_token: this.SSL_WIRELESS.pass,
          sid: this.SSL_WIRELESS.sid,
          msisdn: to,
          sms: message,
          csms_id: 'golapi_' + Date.now()
        })
      });
      const data = await res.json();
      return { success: data.status === 'SUCCESS', data };
    } catch (e) {
      devWarn('SMS error:', e.message);
      return { success: false, error: e.message };
    }
  },

  /* Main send function — tries Green Web first, then SSL */
  async send(to, message) {
    /* Clean phone number */
    let phone = to.replace(/[^0-9]/g, '');
    if (phone.startsWith('88')) phone = phone.substring(2);
    if (phone.startsWith('0')) phone = '88' + phone;
    if (!phone.startsWith('88') && phone.length === 11) phone = '88' + phone;
    if (phone.length < 13) {
      devWarn('Invalid phone:', to);
      return { success: false, error: 'Invalid phone number' };
    }

    devLog('Sending SMS to:', phone, 'msg:', message.substring(0, 50));
    let result = await this.sendGreenWeb(phone, message);
    if (!result.success) {
      devLog('Green Web failed, trying SSL...');
      result = await this.sendSSLWireless(phone, message);
    }
    return result;
  },

  /* Pre-built message templates */
  templates: {
    orderConfirmed(orderId, total) {
      return `Golapi Shop: আপনার অর্ডার #${orderId.substring(0,8).toUpperCase()} নিশ্চিত হয়েছে। মোট: ${total}৳। ডেলিভারি হতে ৬০-৯০ মিনিট। ধন্যবাদ! 🌹`;
    },
    orderShipped(orderId, driverName, driverPhone) {
      return `Golapi Shop: অর্ডার #${orderId.substring(0,8).toUpperCase()} রাস্তায়! ড্রাইভার: ${driverName}, মোবাইল: ${driverPhone}`;
    },
    orderDelivered(orderId) {
      return `Golapi Shop: অর্ডার #${orderId.substring(0,8).toUpperCase()} ডেলিভারি সম্পন্ন! 🎉 আপনাকে ধন্যবাদ। রিভিউ দিন: golapishop.online`;
    },
    orderCancelled(orderId) {
      return `Golapi Shop: অর্ডার #${orderId.substring(0,8).toUpperCase()} বাতিল করা হয়েছে। যেকোনো প্রশ্নে: 01612-057371`;
    },
    welcome(userName) {
      return `Golapi Shop Online-এ স্বাগতম ${userName}! 🌹 আপনার দায়িত্ব লিস্ট করা, আমাদের দায়িত্ব বাজার করে দেওয়া। golapishop.online`;
    }
  }
};