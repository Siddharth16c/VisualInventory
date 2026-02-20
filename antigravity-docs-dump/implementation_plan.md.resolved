# VisualOS — Local-First Inventory Management PWA

A fully offline-capable, mobile-responsive Progressive Web App for inventory management, billing, media processing, prospect tracking, and accounting. Built with React 18 + TypeScript + Vite.

## User Review Required

> [!IMPORTANT]
> **Schema Improvements**: I propose the following changes to your Dexie schema:
> 1. **`orders` table**: Add `order_items` as a compound index on `order_id` — billing needs fast line-item lookup. Add `status` field index.
> 2. **`products` table**: Add `brand_id, vertical_id` indexes for relational lookups.
> 3. **`prospects` table**: Add `visit_date` to enable date-range queries for visits.
> 4. **`costs` table**: Add `order_id` index to link costs to specific orders.
> 5. **Add `order_items` table**: Normalize line items out of orders for cleaner billing queries: `'++id, order_id, product_id'`.
> 6. **Add `visits` table**: Separate from travel_records for prospect-level visit tracking: `'++id, prospect_id, visit_date, route_id'`.
> 7. **Remove `artifact_dimensions`** — no indexes defined, unused.

> [!WARNING]
> **TailwindCSS Version**: Will use TailwindCSS v3 (stable, widest plugin ecosystem). Let me know if you prefer v4.

> [!NOTE]
> **FFmpeg.wasm** requires `SharedArrayBuffer` which needs specific COOP/COEP headers. The dev server will be configured with these headers. For production, your hosting must also set them.

---

## Proposed Changes

### Phase 0 — Project Scaffold & Configuration

#### [NEW] [package.json](file:///c:/InventoryManagementSystem/package.json)
Full dependency list:
- **Core**: `react@18`, `react-dom@18`, `react-router-dom@6`, `typescript`
- **Build**: `vite`, `@vitejs/plugin-react`
- **PWA**: `vite-plugin-pwa`
- **State**: `zustand`
- **DB**: `dexie`, `dexie-react-hooks`
- **UI/Table**: `@tanstack/react-table`, `@tanstack/match-sorter-utils`
- **Styling**: `tailwindcss@3`, `postcss`, `autoprefixer`
- **Billing/Print**: `react-to-print`, `jspdf`
- **Media**: `@ffmpeg/ffmpeg`, `@ffmpeg/util`, `browser-image-compression`
- **Testing**: `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `jsdom`
- **Icons**: `lucide-react`

#### [NEW] [vite.config.ts](file:///c:/InventoryManagementSystem/vite.config.ts)
- Vite config with `@vitejs/plugin-react`
- `vite-plugin-pwa` with `generateSW` strategy, runtime caching for assets
- COOP/COEP headers for FFmpeg SharedArrayBuffer support

#### [NEW] [tailwind.config.js](file:///c:/InventoryManagementSystem/tailwind.config.js)
TailwindCSS v3 configuration with custom color palette (dark-mode first, premium aesthetic).

#### [NEW] [tsconfig.json](file:///c:/InventoryManagementSystem/tsconfig.json)
Strict TypeScript config with path aliases (`@/` → `src/`).

---

### Phase 0 — Database & State

#### [NEW] [src/db/dexie.ts](file:///c:/InventoryManagementSystem/src/db/dexie.ts)
- Enhanced Dexie schema with all proposed improvements (order_items, visits tables)
- `persist()` function using `navigator.storage.persist()`
- TypeScript interfaces for all tables

#### [NEW] [src/store/store.ts](file:///c:/InventoryManagementSystem/src/store/store.ts)
Zustand store with slices:
- `cartSlice` — POS cart state (items, totals, prospect selection)
- `uiSlice` — sidebar open, active view, modals
- `mediaSlice` — FFmpeg progress, processing state

---

### Phase 0 — App Shell & Layout

#### [NEW] [src/App.tsx](file:///c:/InventoryManagementSystem/src/App.tsx)
Root app with React Router, layout shell, PWA install prompt.

#### [NEW] [src/components/layout/Sidebar.tsx](file:///c:/InventoryManagementSystem/src/components/layout/Sidebar.tsx)
Collapsible sidebar with navigation to all modules.

#### [NEW] [src/components/layout/Header.tsx](file:///c:/InventoryManagementSystem/src/components/layout/Header.tsx)
Top bar with PWA status indicator, offline badge, page title.

#### [NEW] [src/components/layout/MobileNav.tsx](file:///c:/InventoryManagementSystem/src/components/layout/MobileNav.tsx)
Bottom navigation bar for mobile screens.

---

### Phase 1 — Billing & Orders (Priority 1)

#### [NEW] [src/pages/Inventory.tsx](file:///c:/InventoryManagementSystem/src/pages/Inventory.tsx)
- TanStack Table with fuzzy search, column sorting
- CRUD modal for products (supports dynamic metadata JSON for Stationery/FMCG)
- Bulk actions

#### [NEW] [src/pages/Billing.tsx](file:///c:/InventoryManagementSystem/src/pages/Billing.tsx)
- POS cart interface: product search → add to cart → quantity/price adjust
- Prospect selection for the order
- Order summary with subtotal, tax, discount, grand total
- Save order to Dexie

#### [NEW] [src/components/billing/Cart.tsx](file:///c:/InventoryManagementSystem/src/components/billing/Cart.tsx)
Cart component with line items, editable quantities, remove items.

#### [NEW] [src/components/billing/InvoiceA4.tsx](file:///c:/InventoryManagementSystem/src/components/billing/InvoiceA4.tsx)
A4-formatted invoice component for `react-to-print`.

#### [NEW] [src/components/billing/InvoiceThermal.tsx](file:///c:/InventoryManagementSystem/src/components/billing/InvoiceThermal.tsx)
Thermal-width (58mm/80mm) invoice. Generates print-ready layout for RawBT.

#### [NEW] [src/components/billing/PrintHandler.tsx](file:///c:/InventoryManagementSystem/src/components/billing/PrintHandler.tsx)
Orchestrates printing: A4 via `react-to-print`, thermal via jsPDF image generation for RawBT.

---

### Phase 2 — Price List Generator (Priority 2)

#### [NEW] [src/pages/PriceList.tsx](file:///c:/InventoryManagementSystem/src/pages/PriceList.tsx)
- Product multi-select with search/filter
- Preview of price list layout
- Generate PDF via jsPDF (text-based, clean formatting)
- Share via WhatsApp

---

### Phase 3 — Media & Sharing (Priority 3)

#### [NEW] [src/pages/Media.tsx](file:///c:/InventoryManagementSystem/src/pages/Media.tsx)
- Product media gallery (multiple images per product)
- Upload with browser-image-compression
- GIF/Flipbook generation trigger with progress bar

#### [NEW] [src/workers/ffmpeg.worker.ts](file:///c:/InventoryManagementSystem/src/workers/ffmpeg.worker.ts)
Web Worker for FFmpeg.wasm — handles GIF/flipbook creation off main thread.

#### [NEW] [src/utils/share.ts](file:///c:/InventoryManagementSystem/src/utils/share.ts)
WhatsApp sharing utility: Web Share API with `window.open(whatsapp_url)` fallback.

---

### Phase 4 — Prospect Management (Priority 4)

#### [NEW] [src/pages/Prospects.tsx](file:///c:/InventoryManagementSystem/src/pages/Prospects.tsx)
- Prospects CRUD with TanStack Table
- Visit log per prospect
- Route assignment

#### [NEW] [src/pages/Routes.tsx](file:///c:/InventoryManagementSystem/src/pages/Routes.tsx)
- Route management, travel records
- Visit planning by date/route

---

### Phase 5 — Accounting (Priority 5)

#### [NEW] [src/pages/Dashboard.tsx](file:///c:/InventoryManagementSystem/src/pages/Dashboard.tsx)
- Daily/monthly revenue, costs, profit margin
- Calculated dynamically from Dexie orders + costs tables
- Summary cards with key metrics

---

### Phase 6 — Maintenance & Backup

#### [NEW] [src/pages/Maintenance.tsx](file:///c:/InventoryManagementSystem/src/pages/Maintenance.tsx)
- Full DB export as JSON file download
- JSON file import with validation
- Storage usage display

---

### Phase 7 — Testing

#### [NEW] [src/__tests__/dexie.test.ts](file:///c:/InventoryManagementSystem/src/__tests__/dexie.test.ts)
- DB creation, CRUD operations, persist check

#### [NEW] [src/__tests__/billing.test.tsx](file:///c:/InventoryManagementSystem/src/__tests__/billing.test.tsx)
- Cart add/remove/quantity update
- Order total calculations (subtotals, taxes, discounts)
- Edge cases: empty cart submit, negative quantities, zero-price items

#### [NEW] [src/__tests__/pricelist.test.ts](file:///c:/InventoryManagementSystem/src/__tests__/pricelist.test.ts)
- PDF generation with selected products
- Empty selection handling

#### [NEW] [src/__tests__/backup.test.ts](file:///c:/InventoryManagementSystem/src/__tests__/backup.test.ts)
- Export/import roundtrip, corrupt file handling

---

### Documentation

#### [NEW] [SETUP.md](file:///c:/InventoryManagementSystem/SETUP.md)
Step-by-step: prerequisites, clone, install, env setup, run dev, build, deploy.

#### [NEW] [TESTING.md](file:///c:/InventoryManagementSystem/TESTING.md)
How to run all tests, what each test covers, manual testing checklist.

---

## Verification Plan

### Automated Tests
```bash
# Run all unit/integration tests
npx vitest run

# Run with coverage
npx vitest run --coverage
```

### Browser Verification
1. **Dev server**: `npm run dev` → verify app loads at `http://localhost:5173`
2. **PWA**: Check service worker registration in DevTools → Application tab
3. **Offline**: Toggle DevTools offline mode → verify app still works
4. **Responsive**: Resize browser to mobile widths → verify layout adapts

### Manual Verification
1. **Billing flow**: Add products → create cart → generate order → print A4 invoice → verify PDF renders correctly
2. **Price list**: Select products → generate PDF → verify formatting
3. **Backup**: Export DB → clear DB → import → verify data restored
4. **Media**: Upload images → generate GIF → verify progress bar + output
