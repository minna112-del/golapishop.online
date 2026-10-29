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
 * TO ACTIVATE — one value, in this file or in index.html before this script:
 *   window.GOLAPI_GOOGLE_PLACE_ID = 'ChIJ...';   // from the business's
 * Google Maps link: open the business on Google Maps, copy the link, and
 * take the value after "place/" ... "/data=" or the "place_id=" parameter
 * (a "ChIJ..." string). The shop owner can also paste the Maps link and
 * the Place ID can be read from it. Reviews then appear automatically on
 * every homepage visit, straight from Google — nothing is typed by hand.
 */
(function createGoogleReviews(global) {
  'use strict';

  var PLACE_ID = global.GOLAPI_GOOGLE_PLACE_ID || '';
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

  function fetchReviews() {
    if (rendered || !PLACE_ID) return;
    if (cached) { render(cached); return; }
    if (!global.google || !global.google.maps || !global.google.maps.places) {
      /* Maps API not loaded yet (e.g. location picker never opened). */
      if (global.LocationPicker && typeof global.LocationPicker.loadApi === 'function') {
        global.LocationPicker.loadApi().then(fetchReviews, function () {});
      }
      return;
    }
    try {
      var service = new global.google.maps.places.PlacesService(document.createElement('div'));
      service.getDetails(
        { placeId: PLACE_ID, fields: ['name', 'rating', 'user_ratings_total', 'reviews'] },
        function (place, status) {
          if (status === global.google.maps.places.PlacesServiceStatus.OK && place) {
            cached = place;
            render(place);
          }
          /* Any failure (bad Place ID, API not enabled, quota): silently
             keep the existing homepage cards. Never show fake reviews. */
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
