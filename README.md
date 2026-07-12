# Golapi Shop Online — Page Split Architecture

## What Changed
- `index.html` was **106 KB** with all pages inline
- Now it's **~3 KB** — a thin skeleton with slot `<div>`s
- Each page is a separate HTML file in `pages/`
- Reusable components (header, footer, modals) are in `partials/`

## New Files to Upload

| File/Folder | Action |
|-------------|--------|
| `index.html` | **REPLACE** existing |
| `js/router.js` | **REPLACE** existing |
| `css/components.css` | **ADD** new |
| `pages/` | **CREATE** folder + 17 files |
| `partials/` | **CREATE** folder + 8 files |

## Files to Keep Unchanged
- `css/style.css`
- `js/firebase-init.js`, `js/utils.js`, `js/data.js`, `js/store.js`,
  `js/services.js`, `js/auth.js`, `js/widgets.js`, `js/pages.js`,
  `js/driver.js`, `js/zone-manager.js`, `js/admin.js`, `js/app.js`
- `js/page-loader.js` (can be deleted — router.js now handles loading)
- All icons, manifest.json, service worker files

## Architecture
```
index.html (skeleton)
  ├── slot-topbar      ← partials/topbar.html
  ├── slot-header      ← partials/header.html
  ├── slot-cart-drawer ← partials/cart-drawer.html
  ├── pageContainer    ← pages/home.html, pages/listing.html, etc.
  ├── slot-footer      ← partials/footer.html
  ├── slot-mobnav      ← partials/mobnav.html
  ├── slot-chat        ← partials/chat-widget.html
  ├── slot-modals      ← partials/modals.html
  └── slot-toast       ← partials/toast.html
```

## How It Works
1. Browser loads `index.html` (tiny skeleton) → shows loading spinner
2. `router.js` → `PartialLoader.injectPartials()` fetches all 8 partials
3. `Router.go('home')` → fetches `pages/home.html` → injects into `#pageContainer`
4. User navigates → `PartialLoader.ensureView(page)` fetches only the needed page
5. Pages are cached after first load (no refetch)

## Benefits
- ⚡ 97% smaller initial HTML = faster first paint
- 📱 Better mobile performance (less to parse upfront)
- 🔧 Edit one page without touching others
- 🎯 Lazy-load pages only when visited
- 🏗️ Industry-standard architecture (like Amazon, Chaldal)
