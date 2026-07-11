const HealthService = {
  init() {
    console.log("Health page loaded successfully");

    const doctorHTML = `
      <div style="background:#1f1f1f;padding:20px;margin:10px 0;border-radius:12px;">
        <h3>ডাঃ রহিম উদ্দিন</h3>
        <p>মেডিসিন বিশেষজ্ঞ</p>
        <p>সকাল ৯টা - দুপুর ২টা</p>
      </div>
      <div style="background:#1f1f1f;padding:20px;margin:10px 0;border-radius:12px;">
        <h3>ডাঃ করিনা আক্তার</h3>
        <p>গাইনি ও প্রসূতি</p>
        <p>বিকাল ৪টা - রাত ৮টা</p>
      </div>
    `;
    document.getElementById('doctorList').innerHTML = doctorHTML;
  }
};
