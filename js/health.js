const HealthService = {
  init() {
    console.log('Health page loaded');
    document.getElementById('doctorList').innerHTML = `
      <div class="medical-card p-6">ডাঃ রহিম উদ্দিন - মেডিসিন বিশেষজ্ঞ</div>
      <div class="medical-card p-6">ডাঃ করিনা আক্তার - গাইনি</div>
    `;
    document.getElementById('aiHealthChat').innerHTML = `<p style="color:#aaa">AI চ্যাট রেডি। আপনার সমস্যা বলুন।</p>`;
  },
  bookAppointment() {
    toast('✅ অ্যাপয়েন্টমেন্ট রিকোয়েস্ট পাঠানো হয়েছে।');
  }
};
