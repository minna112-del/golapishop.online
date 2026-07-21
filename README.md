# Golapi Shop Online

নোয়াখালী সদর ও বেগমগঞ্জের নিজস্ব অনলাইন শপ — মুদি, ঔষধ, গ্যাস, কসমেটিকস, কাস্টম বাজার ও স্বাস্থ্য সেবা (ডাক্তার এপয়েন্টমেন্ট/সিরিয়াল বুকিং সহায়তা)। PWA আর্কিটেকচার, Firebase ব্যাকএন্ড, Google Maps-ভিত্তিক লোকেশন সিস্টেম।

🔗 লাইভ সাইট: https://www.golapishop.online

---

## 🏗️ আর্কিটেকচার — Page Split (হালকা, দ্রুত লোড)

```
index.html (~3 KB স্কেলিটন, শুধু <div id="slot-...">/<main id="pageContainer"> থাকে)
  │
  ├─ js/page-loader.js  ── সব পেজ ও পার্শিয়াল "pages/" ফোল্ডার থেকে fetch করে
  │                         (⚠️ কোনো আলাদা "partials/" ফোল্ডার নেই — সবকিছু pages/-এ)
  │
  ├─ slot-topbar        ← pages/topbar.html
  ├─ slot-header        ← pages/header.html
  ├─ slot-cart-drawer   ← pages/cart-drawer.html
  ├─ pageContainer      ← pages/home.html, listing.html, product.html, checkout.html ...
  ├─ slot-footer        ← pages/footer.html
  ├─ slot-mobnav        ← pages/mobnav.html
  ├─ slot-chat          ← pages/chat-widget.html
  ├─ slot-modals        ← pages/modals.html (auth, location picker, ইত্যাদি সব মডাল এখানে)
  └─ slot-toast         ← pages/toast.html
```

**লোড হওয়ার ক্রম:**
1. `index.html` লোড হয় → স্পিনার দেখায়
2. `page-loader.js` সব পার্শিয়াল + প্রথম-দরকারি পেজগুলো (`home, listing, product, checkout, myorders, account, medical, custom-bazar, order-success, account-addresses, about-app, privacy-info, terms, contact`) একসাথে fetch করে
3. **স্টাফ-অনলি পেজ** (`admin-dash`, `driver`, `zone-manager`) **lazy-load** হয় — শুধু `Router.go()` কল হলে তখনই `window.__ensureLazyPage()` দিয়ে আনা হয়, প্রথম লোডে না
4. সব রেডি হলে `pages-ready` ইভেন্ট ফায়ার হয়, স্পিনার সরে যায়

**রাউটিং:**
- `js/router.js` — `Router.go(page, params)` দিয়ে পেজ বদলানো, `OwnerAuth` (Firebase Auth + `staff` কালেকশনে role চেক) দিয়ে admin-dash সুরক্ষিত
- `js/deep-links.js` — TWA/native app path-based রাউটিং (`/driver`, `/manager` ইত্যাদি URL থেকে সরাসরি সঠিক পেজ খোলে)
- `netlify.toml` — SPA fallback rewrite (`/driver`, `/manager`, `/*` → `index.html`)

---

## 📁 ফাইল কাঠামো

| ফোল্ডার/ফাইল | কী আছে |
|---|---|
| `pages/*.html` | সব পেজ **ও** পার্শিয়াল (header/footer/topbar/mobnav/chat-widget/modals/toast সহ) |
| `css/style.css` | মূল ডিজাইন সিস্টেম — cream/rose/ink কালার টোকেন, dark mode override |
| `css/components.css` | Icon সিস্টেম (emoji-free line icons), ফুটার/হিরো/quick-category কম্পোনেন্ট |
| `js/utils.js` | কনস্ট্যান্ট (CATEGORIES, BRANCH_INFO, DELIVERY_ZONES), হেল্পার ফাংশন, ThemeToggle |
| `js/location.js` | LocationPicker (Google Maps সার্চ+পিন) + LocationService (GPS/battery শেয়ার্ড লজিক) |
| `js/livemap.js` | কাস্টমার-facing লাইভ ট্র্যাকিং ম্যাপ (Leaflet/OpenStreetMap — ফ্রি) |
| `js/pages.js` | Home, Listing, PDP, Cart, Checkout, CustomBazar — মূল কাস্টমার লজিক |
| `js/driver.js` | ড্রাইভার পোর্টাল — Accept/Reject, GPS/battery প্যানেল, নেভিগেশন |
| `js/admin.js` | Admin Dashboard — প্রোডাক্ট, অর্ডার, Delivery Pricing, Delivery Zone এডিটর |
| `js/zone-manager.js` | শাখা ম্যানেজার পোর্টাল |
| `js/firebase-init.js` | Firebase config, Auth/Firestore/Storage/Messaging সেটআপ, push token registration |
| `firebase-messaging-sw.js` | ব্যাকগ্রাউন্ড push notification হ্যান্ডলার |
| `sw.js` | PWA অফলাইন সাপোর্ট (network-first, ক্যাশ ভার্সন বদলালে সব ইউজার অটো-আপডেট পায়) |

---

## 🎨 ডিজাইন সিস্টেম

- **থিম:** Cream ব্যাকগ্রাউন্ড + Rose/Pink প্রাইমারি অ্যাকসেন্ট (ব্র্যান্ড নাম "গোলাপি" থেকে অনুপ্রাণিত) + গাঢ় ink ব্যান্ড (footer/topbar/বাটনে)
- **Dark Mode:** Auto (সিস্টেম অনুযায়ী) / Light / Manual toggle — `html[data-theme]` অ্যাট্রিবিউট দিয়ে নিয়ন্ত্রিত, `--ink-band` টোকেন mode-independent রাখা হয়েছে (footer/topbar dark mode-এ ভেঙে না যায়)
- **Icon সিস্টেম:** কোনো emoji নেই (`js` লাইব্রেরি ছাড়া CSS mask-based line icon, `components.css`-এ `.ic-*` ক্লাস)
- **Typography:** Hind Siliguri (বাংলা), Poppins (নাম্বার/হেডিং অ্যাকসেন্ট)

---

## 📍 লোকেশন সিস্টেম

- **Google Maps** (Places Autocomplete + Geocoding + Distance Matrix) — `index.html`-এ `window.GOOGLE_MAPS_API_KEY` বসাতে হয়
- **Delivery Zone:** প্রতিটা শাখার (সদর/বেগমগঞ্জ) নিচে বৃত্তাকার Zone A/B/C (radius + flat fee) — Admin Panel থেকে লাইভ-এডিটেবল, `setting/delivery_zones` Firestore ডকুমেন্টে সেভ থাকে
- **Checkout-এ লোকেশন বাধ্যতামূলক** — ম্যাপে পিন না করলে অর্ডার confirm হয় না; Zone-এর বাইরে হলে ব্লক
- **LocationService** (`location.js`) — GPS watch, battery status, bearing calculation — একটাই শেয়ার্ড মডিউল, driver.js ও ভবিষ্যতের native app (TWA/Android/iOS WebView) একই কোড ব্যবহার করবে

---

## 🚚 ড্রাইভার ও ট্র্যাকিং

- Accept/Reject workflow (নতুন অর্ডার assign হলে ড্রাইভার প্রথমে accept করে, reject করলে admin-এর কাছে ফিরে যায়)
- লাইভ GPS status, battery %, last-update টাইমার
- Google Maps নেভিগেশন (সঠিক GPS পিন থাকলে সেটাই ব্যবহার হয়, না থাকলে টেক্সট ঠিকানা fallback)
- কাস্টমারকে Call/SMS/Chat — সব এক জায়গায়
- কাস্টমার-facing লাইভ ট্র্যাকিং (Leaflet, বাইক আইকন heading অনুযায়ী ঘোরে) + ETA countdown

---

## 🔔 Push Notification

- Firebase Cloud Messaging — VAPID key `firebase-init.js`-এ সেট করা আছে
- `registerPushToken()` — লগইন করলেই অনুমতি চেয়ে token সেভ করে (`fcmTokens` কালেকশনে)
- `firebase-messaging-sw.js` — ব্যাকগ্রাউন্ড নোটিফিকেশন রিসিভ করে
- ⚠️ **এখনো বাকি:** actual notification **পাঠানোর** ট্রিগার (Cloud Function দরকার — Blaze plan + Firebase CLI/কম্পিউটার লাগবে, iPhone থেকে সম্ভব না)

---

## 💰 Delivery Pricing (Admin-editable)

Admin Panel → সেটিংস → "🚚 ডেলিভারি প্রাইসিং":
- Base Charge, Per KM Charge, প্রতি আইটেম চার্জ, Free Delivery threshold, Delivery Radius, Max Distance
- সেভ করলেই `setting/delivery` Firestore ডকুমেন্টে যায় এবং **সাথে সাথে লাইভ** (রিফ্রেশ/ডিপ্লয় লাগে না)

---

## 🔑 চালু করার আগে যা বসাতে হবে

| জায়গা | কী বসাতে হবে |
|---|---|
| `index.html` | `window.GOOGLE_MAPS_API_KEY` — Maps JavaScript API + Places API + Distance Matrix API + Geocoding API enabled থাকতে হবে, billing চালু থাকতে হবে |
| `js/firebase-init.js` | `VAPID_KEY` (Firebase Console → Project Settings → Cloud Messaging → Web Push certificates) |
| `js/utils.js` | `BRANCH_INFO`-এর `lat`/`lng` — বাস্তব শাখায় দাঁড়িয়ে GPS দিয়ে যাচাই করে বসানো উচিত |

## 🚀 ডিপ্লয়মেন্ট নোট

- **Netlify** — `netlify.toml`-এ SPA rewrite + security headers + TWA `assetlinks.json` হেডার সেট করা আছে
- **Cache বাম্প করতে ভুলো না** — `sw.js`-এর `CACHE = 'golapi-vX'` সংখ্যা প্রতিবার বড় আপডেটে বাড়াতে হবে, নইলে পুরনো ইউজারদের কাছে পুরনো ভার্সন cache-এ আটকে থাকবে
- **TWA/Native-ready** — সব লোকেশন/নোটিফিকেশন লজিক browser-standard API (Geolocation, Battery, Web Push) দিয়ে বানানো, তাই ভবিষ্যতে Android/iOS WebView wrapper-এও কোড rewrite ছাড়াই কাজ করবে
