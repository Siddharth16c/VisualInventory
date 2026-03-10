# Current State — VisualInventory
**Last updated:** 2026-03-10
**Update after:** Every coding session

---

## What Works Right Now ✅

- **Billing** — order creation, cart, print/share, unpaid tracking (uses DAL)
- **DBEditor** — full CRUD grid for all tables, location tables, SQL query panel, named controls
- **Accounting** — monthly P&L, cost CRUD (uses DAL)
- **Marketing** — price list + catalogue generation (uses DAL)
- **Suppliers** — CRUD, purchase orders, business volume
- **Warehouse** — 3D viz, cell assignment
- **FieldOps** — visit planning, route management
- **Analytics** — D3 viz, brand metrics
- **Media** — Image upload, GIF gen (items from DAL, blobs from Dexie)
- **Feature Flags** — Full admin UI for master_admin to toggle features per firm
- **Admin Panel** — Route `/admin` for firm management (master_admin only)

---

## New Features Added (2026-03-10) ✅

### Feature Flag System (Directus-like)
- `src/config/featuresConfig.ts` — All 12 feature definitions with metadata
- `src/hooks/useFeatureFlag.ts` — Hook for checking feature access
- `src/components/FeatureRoute.tsx` — Route wrapper for feature protection
- `src/pages/AdminFeatures.tsx` — Admin panel for toggling features per firm
- Feature flags stored in `firms.enabled_features` JSONB column
- Master admin bypasses all feature checks
- Sidebar navigation hides disabled features
- App routes redirect to /billing if feature disabled

### Sample Data Generation
- `docs/seed.sql` — SQL seed file with 1000+ items for 3 firms
- `scripts/seed.ts` — TypeScript seed script for programmatic generation
- 3 firms: R.S. Enterprises, Kailash Cutlery, Kartik Traders
- Each firm has different verticals, brands, and feature access
- Tests: billing, warehouse, stock movements, orders, prospects, etc.

### UI Improvements
- ItemCard component reduced from 140px to 80px for denser display
- Search results grid updated to show 7 columns on large screens

---

## What's Broken / Missing ❌

### Code Not Applied (from 5Mar Claude chat session)
The following were generated in Claude chat but **never pasted into actual files**:

| Item | File | What's Missing |
|------|------|---------------|
| `items.search()` | `dal.ts` | Server-side multi-filter search method |
| `items.getByKeywordId()` | `dal.ts` | Barcode replacement lookup |
| `items.getLowStockRpc()` | `dal.ts` | RPC call for restock signals |
| `stock_movements.*` | `dal.ts` | Full CRUD + log() + logAndUpdateStock() |
| `storage_places/zones/slots.*` | `dal.ts` | Full CRUD + nested queries |
| `item_locations.*` | `dal.ts` | CRUD + moveItem + setVerified |
| `analytics.getStagnantStock()` | `dal.ts` | Items with no sales in N days |
| `analytics.getMovementVelocity()` | `dal.ts` | Top selling items by movement |
| `isMasterAdmin()` export | `dal.ts` | Already exists as function but not exported properly |
| Billing hotkeys | `Billing.tsx` | Alt+S, Enter, F10 |
| Atomic stock deduction | `Billing.tsx` | logAndUpdateStock RPC |
| Server-side search | `Billing.tsx` | Debounced DAL.items.search() |

### Already Applied ✅ (verified in code)
| Item | File | Status |
|------|------|--------|
| `StockMovement` + location types | `types.ts` | ✅ Present |
| `ItemSearchResult`, `ItemSearchFilters` | `types.ts` | ✅ Present |
| `LowStockItem`, analytics types | `types.ts` | ✅ Present |
| Location table columns in DBEditor | `DBEditor.tsx` | ✅ Present |
| `subcategories` in DBEditor | `DBEditor.tsx` | ✅ Present |
| `isMasterAdmin()` function | `dal.ts` | ✅ Present (line 47) |
| Firm-scoped `getAll()` filtering | `dal.ts` | ✅ Present |
| Feature flag system | `featuresConfig.ts` | ✅ NEW |
| Admin feature panel | `AdminFeatures.tsx` | ✅ NEW |

### Dexie Still Active In
- `store/store.ts` — imports types from `@/db/dexie`
- `Media.tsx` — blob storage
- `Inventory.tsx`, `Catalogue.tsx`, `PriceList.tsx`, `Dashboard.tsx`, `Prospects.tsx` — full Dexie
- `Maintenance.tsx`, `Reports.tsx` KPI tab — Dexie
- `AutoBackup.tsx`, `BulkImportModal.tsx` — Dexie

### SQL RPCs (May Not Be Run Yet)
- `get_low_stock_items(p_firm_id)` — ❓ check Supabase
- `log_stock_movement(...)` — ❓ check Supabase  
- `backfill_keyword_ids()` — ❓ check Supabase

---

## Environment

- **Supabase URL:** `https://kailash.observer` (Cloudflare proxy)
- **Auth:** Disabled (network-level access)
- **RLS:** Disabled (manual firm_id filtering in DAL)
- **Dev server:** `npm run dev` on localhost
- **Deployment:** Netlify (domain pending)

---

## Project Structure

```text
VisualInventory/
├── docs/               # Documentation & Workflow
│   ├── context/        # Core context (Index, State)
│   ├── tasks/          # Task management (Sprint, Backlog)
│   ├── prompts/        # Model onboarding & verification
│   ├── Changelog/      # Historical session logs
│   ├── setup/          # Infrastructure guides
│   ├── seed.sql        # SQL seed file for sample data
│   └── UserBase/       # User/Role definitions
├── scripts/            # Seed scripts
│   └── seed.ts         # TypeScript seed generator
├── src/                # Frontend Source
│   ├── components/     # UI Components
│   │   ├── billing/    # Billing components
│   │   ├── layout/     # Sidebar, Header
│   │   └── FeatureRoute.tsx  # Feature flag route wrapper
│   ├── pages/          # Full page views
│   │   └── AdminFeatures.tsx  # Admin panel (NEW)
│   ├── db/             # Data layer (DAL, Supabase, Dexie, types)
│   ├── store/          # Zustand state slices
│   ├── hooks/          # Custom React hooks
│   │   └── useFeatureFlag.ts  # Feature flag hook (UPDATED)
│   ├── config/         # Configuration
│   │   ├── firmConfig.ts    # Firm resolution
│   │   └── featuresConfig.ts # Feature definitions (NEW)
│   └── workers/        # BG workers (FFmpeg)
├── public/             # Static assets
└── drizzle/            # (Future) SQL migrations
```
