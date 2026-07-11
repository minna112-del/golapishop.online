/* app.js — Firebase init listener + Flash countdown + Lang + Emergency + Boot */

let FB = null;

window.addEventListener('firebase-ready', () => {
  FB = window.__fb;
  if (typeof Auth !== 'undefined') Auth.init();
  if (typeof ProductStore !== 'undefined') ProductStore.startLiveSync();
});

/* ── Flash Sale Countdown ── */
let flashSec = getFlashDeadline();
function getFlashDeadline() {
  const n = new Date(), d = new Date();
  d.setHours(20, 0, 0, 0);
  if (n >= d) d.setDate(d.getDate() + 1);
  return Math.floor((d - n) / 1000);
}
setInterval(() => {
  flashSec = flashSec > 0 ? flashSec - 1 : getFlashDeadline();
  const h = Math.floor(flashSec / 3600);
  const m = Math.floor((flashSec % 3600) / 60);
  const s = flashSec % 60;
  const hEl = document.getElementById('t-h');
  const mEl = document.getElementById('t-m');
  const sEl = document.getElementById('t-s');
  if (hEl) hEl.textContent = bn(String(h).padStart(2, '0'));
  if (mEl) mEl.textContent = bn(String(m).padStart(2, '0'));
  if (sEl) sEl.textContent = bn(String(s).padStart(2, '0'));
}, 1000);

/* ── Language ── */
let currentLang = localStorage.getItem('golapi_lang') || 'bn';
function applyLang() {
  document.querySelectorAll('[data-bn][data-en]').forEach(el => {
    el.innerHTML = el.dataset[currentLang];
  });
  document.documentElement.lang = currentLang;
  const l = document.getElementById('langBtnLabel');
  if (l) l.textContent = currentLang === 'bn' ? 'EN' : 'বাং';
}
function toggleLang() {
  currentLang = currentLang === 'bn' ? 'en' : 'bn';
  localStorage.setItem('golapi_lang', currentLang);
  applyLang();
}

/* ── Emergency Banner ── */
function isEmergencyHours() {
  const h = new Date().getHours();
  return h >= 0 && h < 6;
}
function updateEmergencyBanner() {
  const b = document.getElementById('emergencyBanner');
  if (!b) return;
  b.style.display = isEmergencyHours() ? 'flex' : 'none';
}

/* ── Search helpers ── */
function doSearch(val) {
  // Sync both search inputs
  const mob = document.getElementById('searchInputMob');
  const desk = document.getElementById('searchInput');
  if (mob && mob !== document.activeElement && desk) mob.value = val;
  if (desk && desk !== document.activeElement && mob) desk.value = val;
}
function submitSearch() {
  const val = (document.getElementById('searchInput')?.value
    || document.getElementById('searchInputMob')?.value || '').trim();
  if (val) Router.go('listing', { q: val });
}

/* ── Upazila → Union helper ── */
function onUpazilaChange(prefix) {
  const district = document.getElementById(prefix + 'District')?.value;
  const zoneEl   = document.getElementById(prefix + 'Zone');
  const bkashEl  = document.getElementById(prefix === 'cb' ? 'cbBkashNum' : null);
  if (!zoneEl) return;
  const unions = district ? AREA_ZONES[district] || [] : [];
  zoneEl.innerHTML = unions.length
    ? unions.map(u => `<option value="${u}">${u}</option>`).join('')
    : '<option value="">ইউনিয়ন পাওয়া যায়নি</option>';
  if (bkashEl && district) {
    const bi = BRANCH_INFO[district];
    bkashEl.textContent = bi ? '0' + bi.bkashNumber : '';
  }
}

/* ── Payment selector ── */
function selectPay(method) {
  ['bkash', 'nagad', 'cod'].forEach(m => {
    const el = document.getElementById('pay' + m.charAt(0).toUpperCase() + m.slice(1));
    if (el) el.classList.toggle('selected', m === method);
    const inp = el?.querySelector('input[type=radio]');
    if (inp) inp.checked = m === method;
  });
  const bkashBox = document.getElementById('bkashInfoBox');
  const advRow   = document.getElementById('coAdvRow');
  if (bkashBox) bkashBox.style.display = ['bkash', 'nagad'].includes(method) ? 'block' : 'none';
  if (advRow)   advRow.style.display   = ['bkash', 'nagad'].includes(method) ? 'flex'  : 'none';
}

/* ── Custom Bazar type selector ── */
function selectBazarType(el, type) {
  document.querySelectorAll('.bazar-type').forEach(b => {
    b.style.borderColor = 'var(--line)';
    b.querySelector('div:last-child').style.color = 'var(--ink-muted)';
  });
  el.style.borderColor = 'var(--gold-line)';
  el.querySelector('div:last-child').style.color = 'var(--gold)';
  const inp = document.getElementById('cbType');
  if (inp) inp.value = type;
}

/* ── Service Worker ── */
function registerSW() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () =>
      navigator.serviceWorker.register('/firebase-messaging-sw.js').catch(e => devWarn(e))
    );
  }
}

/* ── MAIN INIT ── */
document.addEventListener('DOMContentLoaded', async () => {
  registerSW();
  updateEmergencyBanner();
  setInterval(updateEmergencyBanner, 60000);
  applyLang();
  /* Boot the SPA — loads partials then routes */
  await bootApp();
});