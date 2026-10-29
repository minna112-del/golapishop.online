/* update-check.js — zero-touch website/app release synchronization.
   Customer and Driver Android shells load the deployed HTTPS applications, so
   a website deployment is the app update. This module notices a new immutable
   release id and refreshes the visible app without asking the user to install
   another APK. Native Android permission/engine changes still require a newly
   signed APK because Android does not allow ordinary apps to silently replace
   their own package. */
(function createReleaseSync(global) {
  'use strict';

  const STORAGE_KEY = 'golapi_active_release';
  const CHECK_INTERVAL_MS = 5 * 60 * 1000;
  let checking = false;

  function canReloadSafely() {
    const protectedPages = new Set(['checkout', 'custom-bazar', 'admin-dash', 'company-os']);
    const currentPage = global.Router?.current;
    const editing = document.activeElement?.matches?.('input, textarea, select, [contenteditable="true"]');
    const staffWorkspace = global.AppRegistry?.isStaff?.(currentPage);
    return !editing && !protectedPages.has(currentPage) && !staffWorkspace;
  }

  async function fetchRelease() {
    const response = await fetch(`/app-version.json?_=${Date.now()}`, {
      cache: 'no-store',
      headers: { Accept: 'application/json' }
    });
    if (!response.ok) throw new Error(`release check failed (${response.status})`);
    const data = await response.json();
    if (!data?.release) throw new Error('release id is missing');
    return String(data.release);
  }

  async function check() {
    if (checking || !navigator.onLine) return;
    checking = true;
    try {
      const release = await fetchRelease();
      const activeRelease = localStorage.getItem(STORAGE_KEY);
      if (!activeRelease) {
        localStorage.setItem(STORAGE_KEY, release);
        return;
      }
      if (activeRelease !== release) {
        if (!canReloadSafely()) return;
        /* AUDIT FIX 2026-10-29: never reload silently mid-browsing.
           Show a banner; the user taps to refresh. The stored release is
           only updated on that tap, so the banner survives until then. */
        const registration = await navigator.serviceWorker?.getRegistration?.();
        await registration?.update?.().catch(() => {});
        showUpdateBanner(release);
      }
    } catch (error) {
      if (global.isDev) console.warn('[release-sync]', error);
    } finally {
      checking = false;
    }
  }

  function showUpdateBanner(release) {
    if (document.getElementById('golapi-update-banner')) return;
    const bar = document.createElement('div');
    bar.id = 'golapi-update-banner';
    bar.setAttribute('role', 'status');
    bar.style.cssText = 'position:fixed;left:12px;right:12px;bottom:calc(84px + env(safe-area-inset-bottom));z-index:9999;display:flex;align-items:center;gap:10px;padding:12px 14px;border-radius:14px;background:#181114;color:#fff;box-shadow:0 12px 32px rgba(0,0,0,.3);font-size:13px;line-height:1.5';
    const msg = document.createElement('span');
    msg.style.flex = '1';
    msg.textContent = 'নতুন ভার্সন এসেছে — রিফ্রেশ করলে নতুন সুবিধা পাবেন।';
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = 'রিফ্রেশ করুন';
    btn.style.cssText = 'flex:0 0 auto;padding:10px 14px;border:0;border-radius:10px;background:#DC3062;color:#fff;font-weight:800;cursor:pointer';
    btn.addEventListener('click', () => { try { localStorage.setItem('golapi_active_release', release); } catch (e) {} window.location.reload(); });
    bar.append(msg, btn);
    document.body.appendChild(bar);
  }

  function init() {
    check();
    global.setInterval(check, CHECK_INTERVAL_MS);
    global.addEventListener('online', check);
    global.addEventListener('popstate', check);
    global.addEventListener('url-changed', check);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') check();
    });
  }

  global.UpdateCheck = Object.freeze({ init, check });
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})(window);
