/* i18n.js — one bilingual lifecycle for static fragments and dynamic UI */
(function createI18n(global) {
  'use strict';

  const STORAGE_KEY = 'golapi_lang';
  const supported = new Set(['bn', 'en']);
  const textSource = new WeakMap();
  const attributeSource = new WeakMap();
  const observedAttributes = ['placeholder', 'title', 'aria-label', 'alt', 'content'];
  const ignoredParents = new Set(['SCRIPT', 'STYLE', 'CODE', 'PRE', 'TEXTAREA']);
  let language = supported.has(localStorage.getItem(STORAGE_KEY)) ? localStorage.getItem(STORAGE_KEY) : 'bn';
  // FAST-LOAD FIX: the generated English dictionary (~255KB) is no longer
  // parsed on every first paint. It is loaded on demand for English users
  // (see index.html + ensureEnglishTranslations below). Track whether it
  // is already available so toggling to English never silently falls back
  // to the small built-in vocabulary.
  let translationsLoaded = Boolean(global.GOLAPI_TRANSLATIONS_EN);
  let translationsLoading = null;

  /* Generated exact UI copy is loaded before this runtime. Curated entries
     below intentionally win when product-specific wording is better. */
  const phrases = new Map(Object.entries({
    ...(global.GOLAPI_TRANSLATIONS_EN || {}),
    /* Person names are proper nouns, not common words. The generated
       dictionary translated standalone names into nouns ("creation",
       "the heart", "bang"); these curated entries win over it. */
    'সৃজন': 'Srijon',
    'রাজু': 'Raju',
    'শিবলু': 'Shiblu',
    'বাবু': 'Babu',
    'বাবলু': 'Bablu',
    'হৃদয়': 'Hridoy',
    'হৃদয় — হটলাইন ও অপারেশন মনিটরিং': 'Hridoy — Hotline and Operations Monitoring',
    'হটলাইন ইনচার্জ হৃদয়কে কল করুন': 'Call the hotline in-charge Hridoy',
    '🔴 হটলাইন — হৃদয়': '🔴 Hotline — Hridoy',
    'বাং': 'BN',
    'গোলাপি শপ অনলাইন': 'Golapi Shop Online',
    'আপনার কার্ট খালি': 'Your cart is empty',
    'কোনো পণ্য পাওয়া যায়নি': 'No products found',
    'কোনো প্রোডাক্ট পাওয়া যায়নি': 'No products found',
    'কোনো অর্ডার পাওয়া যায়নি': 'No orders found',
    'কোনো তথ্য পাওয়া যায়নি': 'No information found',
    'কোনো Workspace assign করা হয়নি।': 'No workspace has been assigned.',
    'এখনও কোনো recent workspace নেই।': 'No recent workspace yet.',
    'কোনো company notice নেই।': 'No company notices.',
    'কোনো notification নেই।': 'No notifications.',
    'কোনো activity নেই।': 'No activity yet.',
    'সংযোগ সমস্যা': 'Connection problem',
    'আবার চেষ্টা করুন': 'Try again',
    'লোড হচ্ছে...': 'Loading...',
    'তথ্য লোড হচ্ছে...': 'Loading information...',
    'অর্ডার সম্পন্ন হয়নি': 'The order was not completed',
    'সব প্রয়োজনীয় তথ্য সঠিকভাবে পূরণ করুন': 'Complete all required information correctly',
    'ইমেইল ও পাসওয়ার্ড দিন': 'Enter email and password',
    'ইমেইল বা পাসওয়ার্ড সঠিক নয়': 'The email or password is incorrect',
    'লগইন ব্যর্থ': 'Login failed',
    'লগইন সফল': 'Login successful',
    'সফলভাবে সংরক্ষিত হয়েছে': 'Saved successfully',
    'সফলভাবে আপডেট হয়েছে': 'Updated successfully',
    'সফলভাবে মুছে ফেলা হয়েছে': 'Deleted successfully',
    'এই কাজের অনুমতি নেই': 'You do not have permission for this action',
    'প্রথমে লগইন করুন': 'Please sign in first',
    'আপনি কি নিশ্চিত?': 'Are you sure?',
    'নেটওয়ার্ক সংযোগ নেই': 'No network connection',
    'নেটওয়ার্ক ফিরে এসেছে': 'Network connection restored',
    'আজকের অর্ডার': "Today's orders",
    'মোট অর্ডার': 'Total orders',
    'মোট বিক্রয়': 'Total sales',
    'মোট আয়': 'Total revenue',
    'মোট খরচ': 'Total expense',
    'বর্তমান স্টক': 'Current stock',
    'স্টক শেষ': 'Out of stock',
    'অল্প স্টক': 'Low stock',
    'ডেলিভারি ঠিকানা': 'Delivery address',
    'পেমেন্ট পদ্ধতি': 'Payment method',
    'অর্ডার রিভিউ': 'Order review',
    'অর্ডার নিশ্চিত করুন': 'Confirm order',
    'অর্ডার করুন': 'Place order',
    'কার্টে যোগ করুন': 'Add to cart',
    'এখনই কিনুন': 'Buy now',
    'বাজার করুন': 'Shop now',
    'কাস্টম বাজার': 'Custom Shopping',
    'কাস্টম বাজার অর্ডার': 'Custom Shopping Order',
    'আমার অর্ডার': 'My Orders',
    'সব দেখুন': 'View all',
    'বিস্তারিত দেখুন': 'View details',
    'নতুন অর্ডার': 'New order',
    'অর্ডার নম্বর': 'Order number',
    'গ্রাহকের নাম': 'Customer name',
    'মোবাইল নম্বর': 'Mobile number',
    'পূর্ণ নাম': 'Full name',
    'ডেলিভারি চার্জ': 'Delivery charge',
    'মোট মূল্য': 'Total amount',
    'সাবটোটাল': 'Subtotal',
    'প্রোডাক্ট ম্যানেজমেন্ট': 'Product management',
    'অর্ডার ম্যানেজমেন্ট': 'Order management',
    'স্টাফ ম্যানেজমেন্ট': 'Staff management',
    'ইনভেন্টরি ম্যানেজমেন্ট': 'Inventory management',
    'কাস্টমার সাপোর্ট': 'Customer support',
    'রিপোর্ট ও অ্যানালিটিক্স': 'Reports and analytics',
    'নতুন স্টাফ যোগ করুন': 'Add new staff',
    'নতুন পণ্য যোগ করুন': 'Add new product',
    'নতুন শাখা যোগ করুন': 'Add new branch',
    'পরিবর্তন সংরক্ষণ করুন': 'Save changes',
    'কাজ শেষে Sign Out করুন এবং নিজের account অন্য কারও সঙ্গে শেয়ার করবেন না।': 'Sign out after work and never share your account with anyone.',
    'আপনার পদ ও permission অনুযায়ী নির্ধারিত office খুলুন।': 'Open the office assigned to your role and permissions.',
    'Workspace না দেখালে Executive Office থেকে permission matrix যাচাই করুন।': 'If a workspace is missing, verify the permission matrix from the Executive Office.',
    'আপনার অফিস প্রস্তুত': 'your office is ready',
    'আপনার Workspace': 'Your workspace',
    'আপনার সাম্প্রতিক Activity': 'Your recent activity',
    'দ্রুত সহায়তা': 'Quick help',
    'সব Read করুন': 'Mark all as read',
    'Customer Store খুলুন': 'Open Customer Store',
    'Workspace খুঁজুন': 'Search workspaces',
    'Workspace বা action লিখুন': 'Type a workspace or action',
    'নতুন Notice প্রকাশ করুন': 'Publish a new notice',
    'সব Staff': 'All staff',
    'বাতিল': 'Cancel',
    'প্রকাশ করুন': 'Publish',
    'ডিসপ্লে সচল রাখুন': 'Keep display awake',
    'ডিসপ্লে সচল': 'Display awake',
    'পুনরায় চালু করুন': 'Enable again',
    'এই ব্রাউজারে সমর্থিত নয়': 'Not supported in this browser'
  }));

  const vocabulary = Object.entries({
    'অনুমোদিত নয়': 'is not authorized', 'অনুমতি নেই': 'permission denied', 'পাওয়া যায়নি': 'not found',
    'প্রয়োজনীয় ফাইল': 'required file', 'প্রয়োজন': 'required', 'প্রয়োজন': 'required', 'অসম্পূর্ণ': 'incomplete',
    'সফল হয়েছে': 'completed successfully', 'ব্যর্থ হয়েছে': 'failed', 'সমস্যা হয়েছে': 'an error occurred',
    'সংরক্ষণ করুন': 'Save', 'সংরক্ষিত': 'saved', 'আপডেট করুন': 'Update', 'মুছে ফেলুন': 'Delete',
    'যোগ করুন': 'Add', 'তৈরি করুন': 'Create', 'খুলুন': 'Open', 'বন্ধ করুন': 'Close', 'ফিরে যান': 'Go back',
    'পরবর্তী': 'Next', 'পেছনে': 'Back', 'খুঁজুন': 'Search', 'নির্বাচন করুন': 'Select', 'বেছে নিন': 'Select',
    'দেখুন': 'View', 'সম্পাদনা': 'Edit', 'বিস্তারিত': 'Details', 'নিশ্চিত করুন': 'Confirm', 'রিসেট করুন': 'Reset',
    'অ্যাকাউন্ট': 'Account', 'অ্যাডমিন': 'Admin', 'স্টাফ': 'Staff', 'কর্মী': 'Employee', 'কর্মচারী': 'Employee',
    'গ্রাহক': 'Customer', 'ড্রাইভার': 'Driver', 'রাইডার': 'Rider', 'ম্যানেজার': 'Manager', 'শাখা': 'Branch',
    'ম্যানেজার, Zone-A শাখা': 'Manager, Zone-A Branch', 'ম্যানেজার, Zone-B শাখা': 'Manager, Zone-B Branch', 'ম্যানেজার, Zone-C শাখা': 'Manager, Zone-C Branch', 'ম্যানেজার, Zone-D শাখা': 'Manager, Zone-D Branch',
    'পণ্য': 'Product', 'প্রোডাক্ট': 'Product', 'অর্ডার': 'Order', 'কার্ট': 'Cart', 'ক্যাটাগরি': 'Category',
    'ইনভেন্টরি': 'Inventory', 'স্টক': 'Stock', 'পরিমাণ': 'Quantity', 'মূল্য': 'Price', 'ছাড়': 'Discount',
    'পেমেন্ট': 'Payment', 'ডেলিভারি': 'Delivery', 'ঠিকানা': 'Address', 'লোকেশন': 'Location', 'এলাকা': 'Area',
    'বিক্রয়': 'Sales', 'আয়': 'Revenue', 'খরচ': 'Expense', 'হিসাব': 'Accounts', 'বেতন': 'Salary',
    'উপস্থিতি': 'Attendance', 'ছুটি': 'Leave', 'শিফট': 'Shift', 'বিভাগ': 'Department', 'পদবী': 'Designation',
    'রিপোর্ট': 'Report', 'তথ্য': 'Information', 'নথি': 'Document', 'ডকুমেন্ট': 'Document', 'নোটিশ': 'Notice',
    'শিরোনাম': 'Title', 'বিবরণ': 'Description', 'নাম': 'Name', 'নম্বর': 'Number', 'তারিখ': 'Date', 'সময়': 'Time',
    'আজ': 'Today', 'গতকাল': 'Yesterday', 'সাম্প্রতিক': 'Recent', 'সব': 'All', 'মোট': 'Total', 'নতুন': 'New',
    'সক্রিয়': 'Active', 'নিষ্ক্রিয়': 'Inactive', 'চালু': 'Active', 'বন্ধ': 'Inactive', 'অপেক্ষমাণ': 'Pending',
    'অনুমোদিত': 'Approved', 'বাতিল': 'Cancelled', 'সম্পন্ন': 'Completed', 'জরুরি': 'Urgent', 'গুরুত্বপূর্ণ': 'Important',
    'সেটিংস': 'Settings', 'নিরাপত্তা': 'Security', 'সহায়তা': 'Support', 'সহায়তা': 'Support', 'গোপনীয়তা': 'Privacy',
    'শর্তাবলী': 'Terms', 'স্বাস্থ্য': 'Health', 'ঔষধ': 'Medicine', 'মুদি': 'Grocery', 'বাজার': 'Shopping',
    'ছবি': 'Photo', 'ফাইল': 'File', 'বার্তা': 'Message', 'কল করুন': 'Call', 'যোগাযোগ': 'Contact',
    'আপনার': 'Your', 'আমার': 'My', 'আমাদের': 'Our', 'এই': 'This', 'কোনো': 'Any', 'এখনও': 'yet',
    'প্রথমে': 'first', 'আবার': 'again', 'সঠিক': 'correct', 'সম্পূর্ণ': 'complete', 'দ্রুত': 'quick',
    'অনলাইন': 'Online', 'অফলাইন': 'Offline', 'হয়েছে': 'has been', 'হয়েছে': 'has been', 'হয়নি': 'was not',
    'করুন': '', 'দিন': '', 'নিন': '', 'আছে': 'is available', 'নেই': 'is unavailable', 'থেকে': 'from',
    'এবং': 'and', 'অথবা': 'or', 'জন্য': 'for', 'সঙ্গে': 'with', 'অনুযায়ী': 'according to'
  }).sort((a, b) => b[0].length - a[0].length);

  const digits = { '০':'0','১':'1','২':'2','৩':'3','৪':'4','৫':'5','৬':'6','৭':'7','৮':'8','৯':'9' };
  const phraseBuckets = new Map();
  for (const entry of phrases) {
    if (entry[0].length > 160) continue;
    const initial = entry[0].match(/[\u0980-\u09FF]/)?.[0];
    if (!initial) continue;
    if (!phraseBuckets.has(initial)) phraseBuckets.set(initial, []);
    phraseBuckets.get(initial).push(entry);
  }
  phraseBuckets.forEach(entries => entries.sort((a, b) => b[0].length - a[0].length));

  // Merge a late-loaded English dictionary into the live phrases map.
  // Curated entries above intentionally win, so existing entries are
  // never overwritten by the generated dictionary.
  function addTranslations(dict) {
    if (!dict || typeof dict !== 'object') return;
    for (const [bn, en] of Object.entries(dict)) {
      if (phrases.has(bn)) continue;
      phrases.set(bn, en);
      if (bn.length > 160) continue;
      const initial = bn.match(/[\u0980-\u09FF]/)?.[0];
      if (!initial) continue;
      if (!phraseBuckets.has(initial)) phraseBuckets.set(initial, []);
      phraseBuckets.get(initial).push([bn, en]);
      phraseBuckets.get(initial).sort((a, b) => b[0].length - a[0].length);
    }
    translationsLoaded = true;
    if (language === 'en') apply(document);
  }

  function ensureEnglishTranslations() {
    if (translationsLoaded) return Promise.resolve(true);
    if (translationsLoading) return translationsLoading;
    translationsLoading = new Promise(resolve => {
      const script = document.createElement('script');
      script.src = './js/core/translations-en.js';
      script.onload = () => {
        if (global.GOLAPI_TRANSLATIONS_EN) addTranslations(global.GOLAPI_TRANSLATIONS_EN);
        resolve(true);
      };
      script.onerror = () => resolve(false);
      document.head.appendChild(script);
    }).finally(() => { translationsLoading = null; });
    return translationsLoading;
  }

  function toEnglish(value) {
    if (!/[\u0980-\u09FF]/.test(value)) return value;
    const compact = value.replace(/\s+/g, ' ').trim();
    if (phrases.has(compact)) return value.replace(compact, phrases.get(compact));
    /* AUDIT FIX 2026-10-29: word-by-word substring replacement garbled
       Bengali (e.g. a short word inside a longer word got swapped, leaving
       mixed fragments) and broke the EN->BN round-trip. Only an exact
       whole-phrase match is translated now; unmatched text is left as-is
       (still Bengali) instead of being mangled. Paired [data-bn][data-en]
       elements and the curated phrase map still cover the main UI. */
    /* Unmapped Bangla may be a product, customer, staff or place name — leave it untouched. */
    return value;
  }

  function shouldIgnore(node) {
    const parent = node.parentElement;
    /* The language button's own label (EN / বাং) is set by apply() itself.
       Translating it corrupted it to "bang" in English mode, and the
       corruption then poisoned the round-trip. Never translate it. */
    if (parent && (parent.id === 'langBtnLabel' || parent.closest('#langBtn'))) return true;
    return !parent || ignoredParents.has(parent.tagName) || parent.closest('[data-i18n-ignore], [contenteditable="true"]');
  }

  function translateTextNode(node) {
    if (shouldIgnore(node)) return;
    const current = node.nodeValue || '';
    if (!textSource.has(node)) {
      /* First encounter: freeze the original source forever. */
      textSource.set(node, current);
    } else {
      /* AUDIT FIX 2026-10-29: never overwrite the frozen source with a
         (partially) translated rendering. Only treat the text as new
         content when it differs from BOTH the source and its own
         translation — that means app code genuinely changed it. */
      const source = textSource.get(node);
      const expected = language === 'en' ? toEnglish(source) : source;
      /* AUDIT FIX 2026-10-29 (round 2): the previous "any different text is
         new content" rule let English strings written by app code in
         English mode overwrite the frozen Bengali source, so toggling
         back to Bengali showed English. Only a string that still contains
         Bengali may become the new source (genuinely new Bengali content
         from the app); English renderings never replace it. */
      if (current !== source && current !== expected && /[\u0980-\u09FF]/.test(current)) textSource.set(node, current);
    }
    const source = textSource.get(node);
    const next = language === 'en' ? toEnglish(source) : source;
    if (node.nodeValue !== next) node.nodeValue = next;
  }

  function translateAttributes(element) {
    if (element.matches('[data-i18n-ignore]')) return;
    let originals = attributeSource.get(element);
    if (!originals) {
      originals = {};
      observedAttributes.forEach(name => {
        if (element.hasAttribute(name)) originals[name] = element.getAttribute(name);
      });
      if (element.matches('input[type="button"], input[type="submit"], input[type="reset"]')) {
        originals.value = element.getAttribute('value') || '';
      }
      attributeSource.set(element, originals);
    }
    Object.entries(originals).forEach(([name, source]) => {
      /* Paired labels own their button's aria-label (see above); the
         frozen attribute source would otherwise restore the render-time
         language and undo the paired switch. */
      if (name === 'aria-label' && element.querySelector('[data-bn][data-en]')) return;
      const next = language === 'en' ? toEnglish(source) : source;
      if (element.getAttribute(name) !== next) element.setAttribute(name, next);
    });
  }

  function translatePairedElement(element) {
    const next = language === 'en' ? element.dataset.en : element.dataset.bn;
    if (typeof next !== 'string') return;
    if (element.innerHTML !== next) element.innerHTML = next;
    /* AUDIT FIX 2026-10-29 (round 2d): a category button rendered in
       English mode had aria-label="Grocery" frozen as its attribute
       source, so toggling back to Bengali left the button's accessible
       name in English even though its visible label was Bengali. The
       paired label owns the button's name, so keep them in sync. */
    const button = element.closest('button');
    if (button && button.hasAttribute('aria-label') && button.getAttribute('aria-label') !== next) button.setAttribute('aria-label', next);
  }

  function apply(root = document, notify = root === document) {
    const paired = [];
    if (root.nodeType === Node.ELEMENT_NODE && root.matches('[data-bn][data-en]')) paired.push(root);
    if (root.querySelectorAll) paired.push(...root.querySelectorAll('[data-bn][data-en]'));
    paired.forEach(translatePairedElement);

    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      if (!node.parentElement?.closest('[data-bn][data-en]')) translateTextNode(node);
    }

    const elements = [];
    if (root.nodeType === Node.ELEMENT_NODE) elements.push(root);
    if (root.querySelectorAll) elements.push(...root.querySelectorAll('*'));
    elements.forEach(translateAttributes);

    document.documentElement.lang = language;
    document.documentElement.dataset.language = language;
    const label = document.getElementById('langBtnLabel');
    if (label) label.textContent = language === 'bn' ? 'EN' : 'বাং';
    if (notify) document.dispatchEvent(new CustomEvent('languagechange', { detail: { language } }));
    return language;
  }

  function setLanguage(nextLanguage) {
    language = supported.has(nextLanguage) ? nextLanguage : 'bn';
    localStorage.setItem(STORAGE_KEY, language);
    apply(document);
    // If English was requested before its dictionary arrived, apply again
    // once it loads instead of leaving the page half-translated.
    if (language === 'en' && !translationsLoaded) {
      ensureEnglishTranslations().then(() => apply(document));
    }
    return language;
  }

  function toggle() {
    return setLanguage(language === 'bn' ? 'en' : 'bn');
  }

  const observer = new MutationObserver(mutations => {
    for (const mutation of mutations) {
      if (mutation.type === 'characterData') translateTextNode(mutation.target);
      mutation.addedNodes.forEach(node => {
        if (node.nodeType === Node.TEXT_NODE) translateTextNode(node);
        else if (node.nodeType === Node.ELEMENT_NODE) apply(node, false);
      });
    }
  });

  function start() {
    apply(document);
    observer.observe(document.documentElement, { childList: true, characterData: true, subtree: true });
  }

  global.I18n = Object.freeze({
    apply,
    start,
    toggle,
    setLanguage,
    addTranslations,
    ensureEnglishTranslations,
    language: () => language,
    t: (bn, en) => language === 'bn' ? bn : (en || toEnglish(bn)),
    toEnglish
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})(window);
