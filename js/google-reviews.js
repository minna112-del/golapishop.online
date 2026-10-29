/* google-reviews.js — Real Google reviews on the homepage, loaded automatically.
 *
 * HOW IT WORKS (no server, no fake reviews):
 * The site already loads the Google Maps JS API (with the Places library)
 * for the location picker. This module uses that same API's PlacesService
 * to fetch the business's live Google reviews (up to 5, with rating and
 * total review count) and renders them in the homepage review section,
 * replacing the generic service-description cards — but ONLY when a
 * Place ID is configured. Until then the existing cards stay untouched.
 *
 * BUSINESS (verified from the owner's Maps link, 2026-10-29):
 * "Golapi Shop Online", grocery delivery service, Begumganj 3822,
 * Bangladesh (plus code W3JR+RX). At that check Google showed 5.0 stars
 * from 2 reviews. The short Maps link does NOT expose a Place ID
 * (only an ftid), so this module does NOT depend on one: if
 * window.GOLAPI_GOOGLE_PLACE_ID is set it is used directly, otherwise the
 * business is found by its verified name + address query and its reviews
 * are then fetched. Reviews appear automatically on every homepage visit,
 * straight from Google — nothing is typed by hand.
 */
(function createGoogleReviews(global) {
  'use strict';

  var PLACE_ID = global.GOLAPI_GOOGLE_PLACE_ID || '';
  var FIND_QUERY = 'Golapi Shop Online, Begumganj 3822, Bangladesh';
  var rendered = false;
  var cached = null;

  function stars(rating) {
    var full = Math.round(Number(rating) || 0);
    var out = '';
    for (var i = 1; i <= 5; i++) out += i <= full ? '★' : '☆';
    return out;
  }

  function timeAgo(unixSeconds) {
    if (!unixSeconds) return '';
    var days = Math.floor((Date.now() / 1000 - unixSeconds) / 86400);
    if (days <= 0) return 'আজ';
    if (days === 1) return 'গতকাল';
    if (days < 30) return days + ' দিন আগে';
    if (days < 365) return Math.floor(days / 30) + ' মাস আগে';
    return Math.floor(days / 365) + ' বছর আগে';
  }

  function render(place) {
    var grid = document.querySelector('.home-reviews-section .home-review-grid');
    if (!grid || !place || !place.reviews || !place.reviews.length) return;
    /* Customer review text must stay verbatim — never let the i18n
       walker rewrite a reviewer's own words. */
    grid.setAttribute('data-i18n-ignore', '');
    var cards = place.reviews.slice(0, 5).map(function (r) {
      var article = document.createElement('article');
      var starEl = document.createElement('strong');
      starEl.textContent = stars(r.rating);
      starEl.style.color = 'var(--home-gold, #b87816)';
      var textEl = document.createElement('p');
      textEl.textContent = r.text || '';
      var meta = document.createElement('span');
      meta.textContent = (r.author_name || 'Google ব্যবহারকারী') + ' · ' + timeAgo(r.time) + ' · Google রিভিউ';
      article.append(starEl, textEl, meta);
      return article;
    });
    grid.replaceChildren.apply(grid, cards);
    /* Rating summary above the grid, once. */
    var section = grid.closest('.home-reviews-section');
    if (section && !section.querySelector('.google-review-summary')) {
      var summary = document.createElement('p');
      summary.className = 'google-review-summary';
      summary.style.cssText = 'margin:0 0 16px;color:var(--ink);font-size:14px;font-weight:700';
      var link = document.createElement('a');
      link.href = 'https://www.google.com/maps/search/?api=1&query_place_id=' + encodeURIComponent(PLACE_ID);
      link.target = '_blank';
      link.rel = 'noopener';
      link.textContent = 'Google-এ সব রিভিউ দেখুন →';
      summary.append(
        document.createTextNode('★ ' + (place.rating || '') + ' · ' + (place.user_ratings_total || '') + 'টি Google রিভিউ  ·  ')
      );
      summary.append(link);
      grid.before(summary);
    }
    rendered = true;
  }

  var DEBUG = /[?&]grdebug=1/.test(global.location.search || '');
  function debug(msg) {
    if (!DEBUG) return;
    try {
      var section = document.querySelector('.home-reviews-section');
      if (!section) return;
      var el = section.querySelector('[data-gr-debug]');
      if (!el) {
        el = document.createElement('p');
        el.setAttribute('data-gr-debug', '1');
        el.setAttribute('data-i18n-ignore', '');
        el.style.cssText = 'font-size:12px;color:#b00;padding:8px;border:1px dashed #b00;border-radius:8px;';
        section.insertBefore(el, section.firstChild);
      }
      el.textContent = 'Google Reviews debug: ' + msg;
    } catch (e) { /* never break the page for debug output */ }
  }

  var _mapsLoading = null;
  function loadMapsApi() {
    if (_mapsLoading) return _mapsLoading;
    _mapsLoading = new Promise(function (resolve, reject) {
      if (global.google && global.google.maps && global.google.maps.places) { resolve(); return; }
      var key = global.GOOGLE_MAPS_API_KEY || '';
      if (!key) { debug('No GOOGLE_MAPS_API_KEY on window'); reject(new Error('no key')); return; }
      global.__onGMapsReviewsLoaded = function () { resolve(); };
      var script = document.createElement('script');
      script.src = 'https://maps.googleapis.com/maps/api/js?key=' + encodeURIComponent(key) + '&libraries=places&callback=__onGMapsReviewsLoaded&language=bn&region=BD';
      script.async = true;
      script.onerror = function () { reject(new Error('maps script error')); };
      document.head.appendChild(script);
    });
    return _mapsLoading;
  }

  function fetchDetails(service, placeId) {
    PLACE_ID = placeId;
    service.getDetails(
      { placeId: placeId, fields: ['name', 'rating', 'user_ratings_total', 'reviews'] },
      function (place, status) {
        debug('getDetails status=' + status + ' place=' + (place ? place.name : 'none'));
        if (status === global.google.maps.places.PlacesServiceStatus.OK && place) {
          cached = place;
          render(place);
        }
        /* Any failure (bad Place ID, API not enabled, quota): silently
           keep the existing homepage cards. Never show fake reviews. */
      }
    );
  }

  function fetchReviews() {
    if (rendered) return;
    if (cached) { render(cached); return; }
    if (!global.google || !global.google.maps || !global.google.maps.places) {
      /* Maps API not loaded yet (e.g. location picker never opened).
         ROOT CAUSE FOUND 2026-10-29: the previous code relied on
         window.LocationPicker.loadApi, but location.js declares
         LocationPicker with top-level const, which does NOT create a
         window property — so window.LocationPicker is undefined even
         though the picker itself works. Load the Maps API directly
         here instead of depending on another script's global. */
      debug('Maps API not loaded yet, loading it directly');
      loadMapsApi().then(fetchReviews, function () { debug('direct Maps API load failed'); });
      return;
    }
    debug('Maps API ready, finding place by query');
    try {
      var service = new global.google.maps.places.PlacesService(document.createElement('div'));
      if (PLACE_ID) { fetchDetails(service, PLACE_ID); return; }
      /* No Place ID configured: find the verified business by name +
         address, then fetch its reviews. */
      service.findPlaceFromQuery(
        { query: FIND_QUERY, fields: ['place_id'] },
        function (results, status) {
          debug('findPlace status=' + status + ' results=' + (results ? results.length : 0));
          if (status === global.google.maps.places.PlacesServiceStatus.OK && results && results[0] && results[0].place_id) {
            fetchDetails(service, results[0].place_id);
          }
          /* No match: keep the existing homepage cards. */
        }
      );
    } catch (e) { /* keep existing cards */ }
  }

  function maybeRender() {
    if (document.querySelector('.home-reviews-section .home-review-grid')) fetchReviews();
  }

  document.addEventListener('pages-ready', maybeRender);
  global.addEventListener('url-changed', maybeRender);
  if (document.readyState !== 'loading') maybeRender();
})(window);
