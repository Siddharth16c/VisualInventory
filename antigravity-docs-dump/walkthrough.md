# VisualOS PWA — Build Walkthrough

## What Was Built

A complete **Local-First Progressive Web App** for inventory management, billing, media processing, prospect tracking, and accounting — fully offline-capable and mobile-responsive.

---

## Project Structure

```
src/
├── __tests__/                  # 4 test suites, 29 tests
│   ├── billing.test.ts         # Cart logic (12 tests)
│   ├── dexie.test.ts           # Database CRUD (5 tests)
│   ├── backup.test.ts          # Export/import (7 tests)
│   └── pricelist.test.ts       # Selection/filtering (5 tests)
├── components/
│   ├── billing/
│   │   ├── InvoiceA4.tsx       # A4 print layout
│   │   ├── InvoiceThermal.tsx  # 58mm/80mm thermal printer layout
│   │   └── PrintHandler.tsx    # Print orchestrator (A4, RawBT, share)
│   ├── layout/
│   │   ├── Sidebar.tsx         # Collapsible nav with glassmorphism
│   │   ├── Header.tsx          # Dynamic title + online/offline badge
│   │   └── MobileNav.tsx       # Bottom tab bar for mobile
│   └── ui/
│       └── ToastContainer.tsx  # Toast notifications
├── db/
│   └── dexie.ts                # Dexie.js schema + StorageManager persist
├── pages/
│   ├── Accounting.tsx          # Revenue/costs/profit + cost CRUD
│   ├── Billing.tsx             # POS cart interface
│   ├── Dashboard.tsx           # Stats cards + recent orders
│   ├── Inventory.tsx           # TanStack Table + product CRUD
│   ├── Maintenance.tsx         # DB export/import + storage info
│   ├── Media.tsx               # Image upload + GIF generation
│   ├── PriceList.tsx           # PDF generator + WhatsApp share
│   ├── Prospects.tsx           # Customer CRUD
│   └── Routes.tsx              # Visit + travel logging
├── store/
│   └── store.ts                # Zustand (cart, UI, media slices)
├── utils/
│   └── share.ts                # Web Share API + WhatsApp fallback
├── workers/
│   └── ffmpeg.worker.ts        # FFmpeg.wasm in Web Worker
├── App.tsx                     # Root layout + routing
├── main.tsx                    # Entry point
└── index.css                   # Tailwind + glassmorphism + print styles
```

---

## Key Features Implemented

| Module | Features |
|--------|----------|
| **Inventory** | TanStack Table, fuzzy search, sorting, dynamic metadata fields, CRUD modal |
| **Billing** | Product search, cart (qty/price/discount), tax, order creation, invoice print |
| **Invoicing** | A4 print (react-to-print), thermal/RawBT PDF (jsPDF), WhatsApp sharing |
| **Price List** | Multi-select products, PDF generation (jsPDF), download + share |
| **Media** | Image compression (browser-image-compression), GIF via FFmpeg.wasm Web Worker |
| **Prospects** | CRUD with search, contact info, business type |
| **Routes** | Visit logging with outcomes, travel records, ideal route marking |
| **Accounting** | Monthly revenue/costs/profit, cost entry CRUD, margin calculation |
| **Dashboard** | Today's revenue, total stats, low stock alerts, recent orders |
| **Maintenance** | Full DB JSON export (Blob→Base64), import with validation, storage usage |

---

## Verification Results

### Tests: ✅ All 29 Pass

```
✓ src/__tests__/backup.test.ts    (7 tests)
✓ src/__tests__/billing.test.ts   (12 tests)
✓ src/__tests__/dexie.test.ts     (5 tests)
✓ src/__tests__/pricelist.test.ts (5 tests)

Test Files  4 passed (4)
Tests       29 passed (29)
```

### TypeScript: ✅ Zero Errors

```
npx tsc --noEmit  →  0 errors
```

### Production Build: ✅ Successful

```
vite v6.4.1 building for production...
dist/index.html                    1.2 KB
dist/assets/index-*.css           27.2 KB
dist/assets/index-*.js           852.3 KB
dist/assets/ffmpeg.worker-*.js     1.0 KB
dist/sw.js                         1.9 KB
dist/manifest.webmanifest          0.4 KB
```

---

## Build Issue Fixed

> **Problem**: `Invalid value "iife" for option "output.format" - UMD and IIFE output formats are not supported for code-splitting builds`
>
> **Root Cause**: Vite defaults Web Workers to IIFE format, but FFmpeg.wasm uses dynamic imports (`import()`) which require code-splitting — incompatible with IIFE.
>
> **Fix**: Added `worker: { format: 'es' }` to [vite.config.ts](file:///c:/InventoryManagementSystem/vite.config.ts) to use ES module format for workers.

---

## How to Run

```bash
# Install
npm install

# Development
npm run dev          # → http://localhost:5173

# Tests
npm test             # Run all 29 tests
npm run test:watch   # Watch mode

# Production
npm run build        # TypeScript check + Vite build
npm run preview      # Preview production build
```

## Documentation

- [SETUP.md](file:///c:/InventoryManagementSystem/SETUP.md) — Install, run, deploy, free hosting guide
- [TESTING.md](file:///c:/InventoryManagementSystem/TESTING.md) — Test commands + manual testing checklist
