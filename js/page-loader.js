/* page-loader.js — reusable, promise-based fragment loader
 *
 * FAST-LOAD FIX (2026-10-29):
 * Before this fix the fullscreen #pageLoader stayed visible until ALL of
 * these finished: 7 layout partials + home + listing + product fragments.
 * Any single slow/hung fetch therefore held the whole homepage hostage,
 * and the only escape was the 15-second fallback timer — which is exactly
 * the ~15s blank spinner customers were seeing.
 *
 * Now the loader only waits for what the first paint actually needs:
 *   - topbar + header (layout chrome)
 *   - the one page for the URL the visitor actually opened (usually home)
 * Everything else (footer, cart drawer, mobile nav, chat, toast, modals,
 * listing/product warm-up) loads in the background AFTER the loader hides,
 * so a slow non-critical fragment can never blank the screen again.
 * The loader also has a hard 4-second ceiling: after that it hides with
 * whatever critical content arrived, and failed critical fragments are
 * retried in the background and injected when they arrive.
 */
(function createPageLoader(global) {
  'use strict';

  const criticalPartials = [
    ['pages/topbar.html', 'slot-topbar'],
    ['pages/header.html', 'slot-header']
  ];
  const deferredPartials = [
    ['pages/footer.html', 'slot-footer'],
    ['pages/cart-drawer.html', 'slot-cart-drawer'],
    ['pages/mobnav.html', 'slot-mobnav'],
    ['pages/chat-widget.html', 'slot-chat'],
    ['pages/toast.html', 'slot-toast'],
    ['pages/modals.html', 'slot-modals']
  ];
  const container = document.getElementById('pageContainer');
  const requests = new Map();
  let ready = false;
  let readyTimeout = null;

  global.__lazyPages = global.AppRegistry ? global.AppRegistry.lazyPages() : [];
  global.__loadedLazyPages = Object.create(null);

  function isSafeFragment(text) {
    return typeof text === 'string' && !/<!doctype\s+html|<html[\s>]/i.test(text);
  }

  async function fetchFragment(url, timeoutMs) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs || 8000);
    try {
      const response = await fetch(url, { signal: controller.signal, credentials: 'same-origin' });
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
      const text = await response.text();
      if (!isSafeFragment(text)) throw new Error('SPA fallback is not a valid fragment');
      return text;
    } finally {
      clearTimeout(timeout);
    }
  }

  function translate(root) {
    if (global.I18n) global.I18n.apply(root);
  }

  async function loadPartial(url, slotId) {
    const slot = document.getElementById(slotId);
    if (!slot) return false;
    try {
      slot.innerHTML = await fetchFragment(url);
      translate(slot);
      return true;
    } catch (error) {
      console.warn('[page-loader] partial load failed:', url, error.message);
      return false;
    }
  }

  async function ensurePage(name) {
    if (document.getElementById(`page-${name}`)) {
      global.__loadedLazyPages[name] = true;
      return true;
    }
    if (!global.AppRegistry || !global.AppRegistry.definition(name)) return false;
    if (requests.has(name)) return requests.get(name);

    const request = (async () => {
      try {
        const html = await fetchFragment(`pages/${name}.html`);
        const wrapper = document.createElement('div');
        wrapper.innerHTML = html;
        const fragment = document.createDocumentFragment();
        while (wrapper.firstChild) fragment.appendChild(wrapper.firstChild);
        container.appendChild(fragment);
        const page = document.getElementById(`page-${name}`);
        if (!page) throw new Error(`Missing #page-${name}`);
        global.__loadedLazyPages[name] = true;
        translate(page);
        return true;
      } catch (error) {
        // A transient network failure must not poison this page for the rest
        // of the SPA session. Remove the rejected/resolved-false request so a
        // later navigation can retry the fragment.
        requests.delete(name);
        console.warn('[page-loader] page load failed:', name, error.message);
        return false;
      }
    })();
    requests.set(name, request);
    return request;
  }

  function dispatchReady() {
    if (ready) return;
    ready = true;
    clearTimeout(readyTimeout);
    const loader = document.getElementById('pageLoader');
    if (loader) { loader.hidden = true; loader.style.display = 'none'; }
    document.dispatchEvent(new Event('pages-ready'));
    // Non-critical work starts only after the first paint is unblocked.
    loadDeferredWork();
  }

  function runWhenIdle(fn) {
    if ('requestIdleCallback' in global) global.requestIdleCallback(fn, { timeout: 3000 });
    else setTimeout(fn, 500);
  }

  async function retryFailedCritical(failedPartials, failedPage) {
    // Background-only: never re-show the loader for these retries.
    for (let attempt = 0; attempt < 2; attempt++) {
      await new Promise(r => setTimeout(r, 2000 * (attempt + 1)));
      let remaining = [];
      for (const [url, slotId] of failedPartials) {
        const ok = await loadPartial(url, slotId);
        if (!ok) remaining.push([url, slotId]);
      }
      failedPartials = remaining;
      if (failedPage && !(await ensurePage(failedPage))) {
        // ensurePage already removed the failed request, so a later
        // navigation can retry; keep trying once more in this loop.
      } else if (failedPage) {
        failedPage = null;
      }
      if (!failedPartials.length && !failedPage) break;
    }
  }

  function loadDeferredWork() {
    runWhenIdle(() => {
      deferredPartials.forEach(([url, slot]) => loadPartial(url, slot));
      // Warm up the other first-level pages so navigating to them is
      // instant, but without ever blocking the homepage again.
      if (global.AppRegistry) {
        global.AppRegistry.initialPages()
          .filter(name => !document.getElementById(`page-${name}`))
          .forEach(name => ensurePage(name));
      }
    });
  }

  global.PageLoader = Object.freeze({ ensurePage, loadPartial, fetchFragment });
  global.__ensureLazyPage = function ensureLazyPage(name, callback) {
    ensurePage(name).then(() => callback?.());
  };

  // The page for the URL actually opened (home for '/', listing for
  // '/category/...', etc.). Falling back to 'home' keeps the old behaviour
  // for unknown paths, which Router then resolves as before.
  let criticalPage = 'home';
  try {
    if (global.AppRegistry && typeof global.AppRegistry.resolve === 'function') {
      const resolved = global.AppRegistry.resolve(window.location.pathname);
      if (resolved && resolved.page && !global.AppRegistry.external(resolved.page)) {
        criticalPage = resolved.page;
      }
    }
  } catch (e) { /* keep 'home' */ }

  const criticalLoads = criticalPartials.map(([url, slot]) => loadPartial(url, slot));
  const criticalPageLoad = ensurePage(criticalPage);

  Promise.allSettled([...criticalLoads, criticalPageLoad]).then(results => {
    const failedPartials = [];
    criticalPartials.forEach(([url, slot], index) => {
      if (results[index] && results[index].value !== true) failedPartials.push([url, slot]);
    });
    const pageResult = results[criticalPartials.length];
    const failedPage = pageResult && pageResult.value !== true ? criticalPage : null;
    dispatchReady();
    if (failedPartials.length || failedPage) retryFailedCritical(failedPartials, failedPage);
  });

  // Hard ceiling: the loader must never blank the screen for 15 seconds
  // again. 4s after this script runs is enough for the critical fragments
  // on a normal connection; on a bad one the page still appears and the
  // missing pieces are retried in the background.
  readyTimeout = setTimeout(dispatchReady, 4000);
})(window);
