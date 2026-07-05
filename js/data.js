function sampleProduct(i,opts={}){
  const names = ['গোলাপি সিল্ক শাড়ি','স্মার্ট ওয়াচ প্রো','ব্লুটুথ হেডফোন','চামড়ার হ্যান্ডব্যাগ','রোজ গোল্ড লিপস্টিক','কটন পাঞ্জাবি','LED ডেস্ক ল্যাম্প','অরগানিক হেয়ার অয়েল','কিডস টয় কার','স্পোর্টস শু','কিচেন অর্গানাইজার','বেবি ডায়াপার ব্যাগ','দেশি চাল (মিনিকেট)','তাজা দেশি মুরগি','খোলা দুধ','লাল আলু','দেশি ডিম','সয়াবিন তেল','মসুর ডাল','পাকা কাঁঠাল'];
  const unitsByCat = {
    medicine: ['পাতা','বক্স','পিস','প্যাকেট'],
    grocery: ['কেজি','৫০০ গ্রাম','২৫০ গ্রাম','লিটার','ডজন','প্যাকেট'],
    confectionery: ['পিস','বক্স','প্যাকেট','ডজন'],
    stationery: ['পিস','প্যাকেট','বক্স'],
    gas: ['পিস'], // সিলিন্ডার প্রতি
    mobile: ['পিস'],
    watch: ['পিস'],
    cosmetics: ['পিস','১০০ মিলি','প্যাকেট'],
    clothing: ['পিস'],
    furniture: ['পিস'],
  };
  const cat = opts.category || CATEGORIES[i%CATEGORIES.length].id;
  const units = unitsByCat[cat] || ['পিস'];
  const price = 500 + (i*137)%4500;
  const groceryPrice = 25 + (i*17)%475; // smaller price range for grocery-style items
  const isGrocery = cat==='grocery';
  const hasDiscount = i%3===0;
  const basePrice = isGrocery? groceryPrice : price;
  return {
    id:'p'+i,
    name: names[i%names.length] + ' #' + (i+1),
    category: cat,
    zone: i%2===0 ? 'noakhali_sadar' : 'begumganj',
    unit: units[i%units.length],
    price: hasDiscount ? Math.round(basePrice*1.25) : basePrice,
    salePrice: basePrice,
    rating: (3.5 + (i%15)/10).toFixed(1),
    reviews: 10 + (i*7)%300,
    sold: 20 + (i*13)%900,
    cod: i%4!==0,
    img: `https://picsum.photos/seed/golapi${i}/400/400`,
    isFlash: i%5===0,
    isFeatured: i%4===0,
    fastDelivery: i%3===0,
    stock: 5 + (i*3)%50,
  };
}

let ALL_PRODUCTS = Array.from({length:48},(_,i)=>sampleProduct(i)); // fallback demo data until Firestore loads


const AREA_ZONES = {
  noakhali_sadar: [
    'মাইজদী কোর্ট','সোনাপুর','লক্ষ্মীনারায়ণপুর','বিনোদপুর','চরমটুয়া','চর আমানুল্লা',
    'কালাদরাপ','নোয়ান্নই','দাদপুর','আন্ডারচর','এওজবালিয়া','নোয়াখালী শহর (মূল)','ধর্মপুর'
  ],
  begumganj: [
    'বেগমগঞ্জ সদর','রাজগঞ্জ','সোনাইমুড়ী রোড','একলাশপুর','দুর্গাপুর','আলাইয়ারপুর',
    'জিরতলী','গোপালপুর','লক্ষ্মীনারায়ণপুর (বেগমগঞ্জ)','শরীফপুর','চাটখিল রোড','নাটেশ্বর'
  ]
};
// Full branch details — used in Zone Manager Portal header, Owner Dashboard, and footer contact info.
const BRANCH_INFO = {
  noakhali_sadar: {
    label: 'নোয়াখালী সদর',
    address: 'মাইজদী বাজার, সদর, নোয়াখালী',
    zonePoint: 'মাইজদী বাজার',
    managerName: 'রিমন',
    managerPhone: '+880 1627-010060',
    managerWhatsApp: '+880 1627-010060',
    bkashNumber: '01627010060', // এই জোনের কাস্টমাররা এই bKash-এ পেমেন্ট করবে
    nagadNumber: '01627010060',
  },
  begumganj: {
    label: 'বেগমগঞ্জ',
    address: 'আমানতপুর, বেগমগঞ্জ, নোয়াখালী',
    zonePoint: 'আমানতপুর',
    managerName: 'সৃজন',
    managerPhone: '+880 1310-006959',
    managerWhatsApp: '+880 1310-006959',
    bkashNumber: '01310006959', // এই জোনের কাস্টমাররা এই bKash-এ পেমেন্ট করবে
    nagadNumber: '01310006959',
  },
};
const AREA_CITY_LABELS = { noakhali_sadar: BRANCH_INFO.noakhali_sadar.label, begumganj: BRANCH_INFO.begumganj.label };

// Company leadership & contact
const COMPANY_INFO = {
  ceoName: 'মহসিন',
  ceoTitle: 'CEO / উপদেষ্টা',
  ceoPhone: '+1 516-585-8019',
  headOfficeWhatsApp: '+1 917-419-9814',
  hotline: '+880 1612-057371',
};

// AreaUI অবজেক্ট সরিয়ে ফেলা হয়েছে — আগে এটা সাইটে ঢোকার সাথেই একটা জোন-সিলেক্ট পপআপ
// জোর করে দেখাত (Chaldal-স্টাইল)। এখন জোন/শাখা নির্বাচন checkout-এর Step 1-এ
// ঠিকানার সাথেই হয় (Checkout.onUpazilaChange() দেখো), browsing শুরু করার আগে নয়।


const ORDER_STATUS_LABELS = {
  pending:{label:'পেন্ডিং',cls:'pending'},
  confirmed:{label:'কনফার্মড',cls:'confirmed'},
  assigned:{label:'ড্রাইভার অ্যাসাইনড',cls:'confirmed'},
  picked_up:{label:'পিকআপ হয়েছে',cls:'confirmed'},
  in_transit:{label:'ডেলিভারির পথে',cls:'confirmed'},
  delivered:{label:'ডেলিভারি সম্পন্ন',cls:'delivered'},
  cancelled:{label:'বাতিল',cls:'cancelled'},
};
