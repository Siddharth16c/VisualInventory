# VisualInventory — Changes Log
**Date:** 2026-03-05
**Model:** Claude Sonnet 4.6 (claude.ai free chat)
**Session context:** Full schema redesign + DAL rewrite + Billing refactor

---

## DB Schema Changes (Run in Supabase SQL Editor)

### Task 1 — Items Table Additions
- Added `keyword_id TEXT UNIQUE` — deterministic composite SKU identifier (barcode replacement)
- Added `reorder_threshold INTEGER DEFAULT 0` — triggers n8n restock signals
- Added `purchase_price_unit NUMERIC DEFAULT 0` — cost price for margin KPIs
- Added `tsvector_search TSVECTOR GENERATED` — Postgres FTS fallback when Typesense unavailable
- Added GIN index on `tsvector_search`
- Added composite indexes: `(firm_id, created_at)`, `(firm_id, vertical_id)`, `(firm_id, brand_id)`
- Added trigger `set_keyword_id` — auto-generates `BRAND-VERTICAL-ITEMNAME` on insert
- Added function `backfill_keyword_ids()` — backfills existing items

### Task 2 — Stock Movements Table (NEW)
- New table `stock_movements` with fields: `movement_type`, `qty_change`, `parcel_change`, `from_location_id`, `to_location_id`, `order_id`, `purchase_order_id`
- movement_type CHECK: `sale | purchase | transfer | loss | adjustment | return`
- Indexes on `(firm_id, created_at)`, `item_id`, `movement_type`
- RLS enabled with firm-scoped policies

### Task 3 — 3-Layer Location System (NEW)
- New table `storage_places` — Layer 1: physical buildings (KT Shop, Shop N2, Warehouse)
- New table `storage_zones` — Layer 2: named sections per floor (no grid needed)
- New table `storage_slots` — Layer 3: free-text named spots (Stack A, Near Door)
- Auto-generated `zone_label` trigger: `KT-F0-FR`
- Auto-generated `slot_label` trigger: `KT-F0-FR-STACK_A`
- New table `item_locations` — links items to slots with `parcel_count`, `is_primary`, `last_verified_at`
- All 4 tables RLS enabled, firm-scoped
- CCTV/voxel columns commented as future placeholders throughout

### Task 4 — RLS Hardening
- RLS enabled on: items, orders, order_items, purchase_orders, costs, account, prospects, brands, verticals, routes, stock_movements, all location tables
- `order_items` policy uses JOIN to orders.firm_id (no direct firm_id column)
- `costs` and `account` restricted to `master_admin` role only
- Used existing `get_my_firm_id()` function — no changes to auth helpers

### RPCs Added (Supabase SQL Editor)
- `get_low_stock_items(p_firm_id)` — column-to-column comparison for restock signals
- `log_stock_movement(...)` — atomic: inserts movement record + updates stock_parcels in single transaction

---

## DAL Changes (`src/db/dal.ts`)

### Bug Fixes
- `getAll()` — now manually filters by `firm_id` for all firm-scoped tables (RLS-off safety for Cloudflare proxy workaround)
- `order_items.getByOrder()` — now verifies order belongs to current firm via JOIN (cross-firm leak fix)
- All analytics methods (`getBrandMetrics`, `getAccountFlow`, `getVerticalSummary`) — now explicitly filter by `getFirmId()`
- All reports methods — now explicitly filter by `getFirmId()`
- `account.getAllFirms()` — now guarded by `isMasterAdmin()` check
- `suppliers.getBusinessVolume()` — now filters by `firm_id`
- `visits.getFuturePlans()` — now filters by `firm_id`
- `warehouse.updateCell()` — now injects `firm_id`
- `bulkUpsert` for items — uses `keyword_id` as conflict column (not `id`)

### New Methods Added
- `items.getByKeywordId(keywordId)` — barcode replacement lookup
- `items.search(filters)` — server-side multi-filter search (brand, vertical, category, FTS query)
- `items.getLowStockRpc()` — calls `get_low_stock_items` RPC for restock signals
- `stock_movements.*` — full CRUD + `log()` + `logAndUpdateStock()` (atomic RPC)
- `storage_places.*` — CRUD + `getWithZones()`
- `storage_zones.*` — CRUD + `getByPlace()`
- `storage_slots.*` — CRUD + `getByZone()`
- `item_locations.*` — CRUD + `getByItem()` + `getBySlot()` + `moveItem()` + `setVerified()`
- `analytics.getStagnantStock(daysThreshold)` — items with no sales in N days
- `analytics.getMovementVelocity(from, to)` — top selling items by parcel movement
- `isMasterAdmin()` helper exported

### FIRM_SCOPED_TABLES updated
- Added: `warehouse_cells`, `stock_movements`, `storage_places`, `storage_zones`, `storage_slots`, `item_locations`

---

## Types Changes (`src/db/types.ts`)

### Modified Interfaces
- `Item` — added `keyword_id`, `reorder_threshold`, `purchase_price_unit` fields

### New Interfaces Added
- `MovementType` — union type for stock movement types
- `StoragePlaceType` — union type for place types
- `StockMovement` — full movement record
- `StockMovementPayload` — insert payload type
- `StoragePlace` — Layer 1 location
- `StorageZone` — Layer 2 location
- `StorageSlot` — Layer 3 location
- `ItemLocation` — item-to-slot assignment
- `ItemLocationFull` — with nested joins for billing display
- `ItemSearchResult` — lightweight type for billing search (avoids full Item load)
- `ItemSearchFilters` — filter params for `DAL.items.search()`
- `LowStockItem` — restock signal payload
- `BrandMetric`, `AccountFlow`, `VerticalSummary` — analytics return types
- `StagnantStockItem`, `MovementVelocityItem` — new analytics types

---

## Billing.tsx Changes (`src/pages/Billing.tsx`)

### Performance
- Removed `useSupabaseLiveQuery` for full items table — was loading ALL items into memory
- Replaced with server-side debounced search via `DAL.items.search()` (250ms debounce)
- Search only fires on user input — zero idle DB load

### Correctness
- Stock deduction now uses `DAL.stock_movements.logAndUpdateStock()` RPC — atomic, no race condition
- Single `deductStock()` function used by both `handleCreateOrder` and `handleConfirmQuote` — no duplicated logic
- `isSaving` flag prevents double-submit

### UX Additions
- Hotkeys: `Alt+S` focuses search, `Enter` adds first result to cart, `F10` saves & prints
- Hotkey hint bar shown above tabs
- Search spinner during async search
- First result highlighted with `↵` indicator
- `keyword_id` shown in search results and cart items
- `₹` symbol used throughout (was `Rs.`)
- "Clear all" button in cart header
- Prospect dropdown `onBlur`/`onMouseDown` fix — selection no longer lost on click

---

## Decisions Made

| Decision | Reasoning |
|---|---|
| Keep `variant_params_1/2/3` as 3 separate tables | Merging breaks existing UI dropdowns and DAL — not worth migration cost |
| Keep `suppliers` global (no firm_id) | Architectural decision from original design — suppliers shared across firms |
| Skip Directus for now | Custom React DB UI serves same purpose with more control |
| Keep Supabase | Cloudflare proxy solves ISP ban — migration cost to Convex too high mid-project |
| Manual firm_id filter in getAll() | RLS disabled due to proxy; manual filter ensures isolation regardless of RLS state |
| 3-layer location system without PostGIS | Simple text labels sufficient for high-level detection; no spatial engine overhead |
| CCTV/voxel as commented placeholders | Requires fixed zones first; implement at final stage after stores are physically zoned |

---

## Pending Tasks (Next Sessions)

| # | Task | Depends On | Priority |
|---|---|---|---|
| T6 | Subcategories table + products.category normalization | dal.ts done | Medium |
| T7 | MinIO config + Directus Docker setup | Schema stable | Medium |
| T8 | Typesense sync setup + search UI | Items table settled | High |
| T9 | DBEditor.tsx — named button query UI (Page 1) | — | High |
| T10 | DBEditor Page 2 — fire saved query buttons per table | T9 done | High |
| T11 | TanStack Query integration | DAL done | High |
| T12 | Analytics.tsx — KPI + heatmaps (Grafana direct) | Schema done | Medium |
| T13 | Location UI — top-view SVG floor plans + item placement | Location schema done | Medium |
| T14 | Grafana dashboard setup (Supabase direct connection) | — | Low |
| T15 | Inkscape SVG diagrams — store architecture + DB schema | — | Low |
| T16 | n8n workflows — restock signals + movement events | stock_movements done | Medium |
| T17 | CCTV pixel-watch + voxel sync (LAST — advanced) | Physical zones established | Low |