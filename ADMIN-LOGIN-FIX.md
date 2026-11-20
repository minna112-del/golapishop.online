# অ্যাডমিন লিংক ফাঁকা দেখানোর সংশোধন

লাইভ `/admin` খুললে URL ঠিক থাকলেও লগইন ফর্ম দেখায়নি। সরাসরি staff URL-এ `StaffAccess.request()` পপআপ লোড হওয়ার আগে চলত, পরে পপআপ এলেও আর `show` করা হতো না।

সংশোধিত ফাইল:
- `js/page-loader.js`: একই পপআপ ফাইল একাধিকবার লোড হয়ে পুরোনো ফর্ম মুছে ফেলা বন্ধ।
- `js/router.js`: সরাসরি staff URL-এ লগইন ফর্ম লোড করে তারপর দেখায়।
- `js/core/app-registry.js`: `/bussines-os` ও `/business-os` আবার `/admin`-এর বিকল্প লিংক হিসেবে কাজ করে।

শুধু Firestore Rules বদলালে এই সমস্যার সমাধান হবে না। তিনটি ফাইল রিপোর একই পাথে আপডেট করে Netlify-তে সফলভাবে deploy করুন। তারপর নতুন private/incognito tab-এ `https://golapishop.online/bussines-os` খুলে staff login form দেখুন। অনুমোদিত `admin` role-এর ইমেইল-পাসওয়ার্ড দিয়ে ঢুকুন। পাসওয়ার্ড কাউকে পাঠাবেন না। Firebase Cloud Functions deploy এই লগইন UI সংশোধনের জন্য প্রয়োজন নেই; অর্ডার পুশের জন্য আলাদা প্রয়োজন।

স্থানীয় যাচাই: তিন JS ফাইল syntax check এবং `npm run validate` পাস। লাইভ সাইটে এই সংশোধন প্রকাশিত বা লগইন সফল হয়েছে বলে যাচাই করা হয়নি।
