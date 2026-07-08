const HealthService = {
  doctors: [
    {name:"ডাঃ রহিম উদ্দিন", spec:"মেডিসিন বিশেষজ্ঞ", time:"প্রতিদিন সকাল ৯টা - দুপুর ২টা", fee:"ফ্রি"},
    {name:"ডাঃ করিনা আক্তার", spec:"গাইনি ও প্রসূতি", time:"শনি ও সোম বিকাল ৪টা - রাত ৮টা", fee:"ফ্রি"},
    {name:"ডাঃ আবুল কালাম", spec:"শিশু বিশেষজ্ঞ", time:"রবি ও বুধ সকাল ১০টা - দুপুর ১টা", fee:"ফ্রি"},
    {name:"ডাঃ সালমা সুলতানা", spec:"ডেন্টাল সার্জন", time:"শুক্র বিকাল ৩টা - রাত ৭টা", fee:"ফ্রি"},
    {name:"ডাঃ জাকির হোসেন", spec:"কার্ডিওলজি", time:"মাসের ১ম ও ৩য় রবিবার", fee:"ফ্রি"},
    {name:"ডাঃ নাফিসা আহমেদ", spec:"চক্ষু বিশেষজ্ঞ", time:"প্রতি মঙ্গলবার সকাল ৯টা - ১২টা", fee:"ফ্রি"}
  ],
  init() {
    this.renderDoctors();
    this.renderSchedule();
    this.initAIChat();
  },
  renderDoctors() {
    document.getElementById('doctorList').innerHTML = this.doctors.map(d => `
      <div class="medical-card p-6">
        <h3 class="font-semibold text-white">${d.name}</h3>
        <p class="text-emerald-400">${d.spec}</p>
        <p class="text-xs text-slate-400 mt-3">${d.time}</p>
        <p class="text-gold font-bold mt-1">${d.fee}</p>
        <button onclick="HealthService.bookAppointment()" class="mt-4 w-full btn-medical py-2 text-sm">এপয়েন্টমেন্ট নিন</button>
      </div>
    `).join('');
  },
  renderSchedule() {
    document.getElementById('scheduleTable').innerHTML = `
      <thead><tr><th>ডাক্তার</th><th>দিন</th><th>সময়</th></tr></thead>
      <tbody>
        <tr><td>ডাঃ রহিম উদ্দিন</td><td>প্রতিদিন</td><td>সকাল ৯টা - দুপুর ২টা</td></tr>
        <tr><td>ডাঃ করিনা আক্তার</td><td>শনি-সোম</td><td>বিকাল ৪টা - রাত ৮টা</td></tr>
        <tr><td>ডাঃ আবুল কালাম</td><td>রবি-বুধ</td><td>সকাল ১০টা - দুপুর ১টা</td></tr>
      </tbody>`;
  },
  initAIChat() {
    const chat = document.getElementById('aiHealthChat');
    chat.innerHTML = `
      <div class="cw-msg cw-bot">হ্যালো! আমি Golapi-এর AI স্বাস্থ্য সহায়ক। আপনার সমস্যা বলুন।</div>
      <div class="flex gap-2 mt-4">
        <button onclick="HealthService.quickAI('মাথাব্যথা')" class="btn-outline text-xs">মাথাব্যথা</button>
        <button onclick="HealthService.quickAI('জ্বর')" class="btn-outline text-xs">জ্বর</button>
      </div>
      <input id="aiInput" class="form-input mt-4" placeholder="আপনার সমস্যা লিখুন..." onkeypress="if(event.key==='Enter')HealthService.sendAI()">
    `;
  },
  quickAI(q) { document.getElementById('aiInput').value = q; this.sendAI(); },
  sendAI() {
    const inp = document.getElementById('aiInput');
    const txt = inp.value.trim();
    if (!txt) return;
    const chat = document.getElementById('aiHealthChat');
    chat.innerHTML += `<div class="cw-msg cw-user">${txt}</div>`;
    inp.value = '';
    chat.scrollTop = chat.scrollHeight;

    setTimeout(() => {
      chat.innerHTML += `<div class="cw-msg cw-bot">এই সমস্যায় বিশ্রাম নিন, পানি বেশি খান। প্রয়োজনে ডাক্তার দেখান। আরও বিস্তারিত বলুন।</div>`;
      chat.scrollTop = chat.scrollHeight;
    }, 800);
  },
  bookAppointment() {
    toast('✅ অ্যাপয়েন্টমেন্ট রিকোয়েস্ট পাঠানো হয়েছে। শীঘ্রই যোগাযোগ করা হবে।');
  }
};
