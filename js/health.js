const HealthService = {
    doctors: [
        {name:"ডাঃ রহিম উদ্দিন", spec:"মেডিসিন", time:"সকাল ৯টা - দুপুর ২টা"},
        {name:"ডাঃ করিনা আক্তার", spec:"গাইনি", time:"বিকাল ৪টা - রাত ৮টা"},
        {name:"ডাঃ আবুল কালাম", spec:"শিশু", time:"সকাল ১০টা - দুপুর ১টা"}
    ],

    init() {
        // ডাক্তার লিস্ট
        const listHTML = this.doctors.map(d => `
            <div class="medical-card p-6">
                <h3>${d.name}</h3>
                <p>${d.spec}</p>
                <p class="text-sm">${d.time}</p>
                <button onclick="HealthService.bookAppointment()" class="mt-4 w-full">এপয়েন্টমেন্ট নিন</button>
            </div>
        `).join('');
        document.getElementById('doctorList').innerHTML = listHTML;

        // সিডিউল
        document.getElementById('scheduleTable').innerHTML = `
            <thead><tr><th>ডাক্তার</th><th>সময়</th></tr></thead>
            <tbody>${this.doctors.map(d => `<tr><td>${d.name}</td><td>${d.time}</td></tr>`).join('')}</tbody>
        `;

        // AI চ্যাট
        document.getElementById('aiHealthChat').innerHTML = `<p>হ্যালো! আপনার সমস্যা বলুন...</p>`;
    },

    bookAppointment() {
        alert('✅ অ্যাপয়েন্টমেন্ট রিকোয়েস্ট পাঠানো হয়েছে!');
    }
};
