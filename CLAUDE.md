# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MiaoCarb is an Italian-language PWA that helps cat owners manage nutrition for diabetic cats. It analyzes cat food nutritional labels (via OCR or manual entry), calculates carbohydrate content, scores foods, and provides personalized portion recommendations.

## Development

This is a **no-build, vanilla JS** project — no bundler, no package.json, no npm. To develop:

- Serve the root directory with any static HTTP server (e.g. `python3 -m http.server 8000`)
- Open `index.html` in a browser
- There are no tests, no linter, and no CI pipeline

When changing static assets or JS files, update `CACHE_VERSION` in `sw.js` (timestamp format `YYYYMMDDHHmmss`) so the service worker cache busts correctly.

## Architecture

**Single-page app** with three tabs (Catalogo, Cibo, Profilo) controlled by `switchTab()` in app.js. All UI is in `index.html`; visibility is toggled via CSS classes (`active`, `hidden`).

### File roles

- **`js/app.js`** (~1600 lines) — all application logic organized in labeled sections:
  - STATE → INITIALIZATION → ONBOARDING → TAB SWITCHING → WIZARD NAVIGATION → PHOTO HANDLING → OCR → FOOD ANALYSIS → SAVE FOOD → CATALOG → SHARE → PROFILE → SETTINGS → INFO SYSTEM → ANIMATIONS → SERVICE WORKER
- **`js/storage.js`** — `window.appStorage` wrapper around localStorage with JSON helpers
- **`js/idb.js`** — `window.imagesDB` IndexedDB layer for binary image storage (avoids localStorage quota limits)
- **`sw.js`** — service worker with stale-while-revalidate for static assets, network-first for navigation
- **`index.html`** — all markup including modals, wizard steps, onboarding screens
- **`styles.css`** — all styling, responsive, no preprocessor

### Key patterns

- **Global state**: mutable module-level variables in app.js (`frontImage`, `labelImage`, `currentAnalysis`, `catProfile`, etc.)
- **Storage split**: metadata/profiles in localStorage (`appStorage`), images in IndexedDB (`imagesDB`). Catalog items reference images by ID (`frontImageId`/`labelImageId`), not inline base64.
- **Image migration**: `imagesDB.migrateCatalogImages()` converts legacy inline base64 images to IndexedDB references.
- **OCR pipeline**: Tesseract.js v5 loaded from CDN → image preprocessing via Canvas (grayscale, contrast) → dual-canvas crop UI (base + overlay) → Italian+English text recognition → regex extraction of nutritional values with OCR error correction (O→0, l→1, etc.)
- **Nutritional scoring**: calculates dry-matter-basis carbs, metabolizable energy percentages (%ME), nutrients per 100 kcal. Scores are green (≤12% ME carbs), yellow (12–15%), red (>15%).
- **Inline event handlers**: HTML uses `onclick` attributes calling global functions — this is intentional, not a refactoring target.

### External dependencies

- **Tesseract.js v5** (CDN: `cdn.jsdelivr.net/npm/tesseract.js@5`) — only external dependency

## Language

All UI text, comments, and variable names related to cat nutrition are in **Italian**. Code structure and function names are in English.
