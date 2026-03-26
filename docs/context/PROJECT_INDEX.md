# VisualInventory — Project Index
**Last updated:** 2026-03-06 | **Update after:** Every structural change

> This is the **single indexed reference** for any AI model or developer joining the project.
> Read this first. Then read CURRENT_STATE.md for what's in progress.

-
## 1 — What This App Does (Functional)

Multi-tenant inventory management system for a small trading business (stationery, cutlery, fireworks, FMCG). 3 firms share one Supabase instance. Features: billing, stock tracking, warehouse visualization, supplier management, field operations (visit planning), analytics, media management, and a full DB editor UI.

**Users:** Owner (master admin), store staff, field reps.
**Access:** URL-based firm resolution (no login — auth removed, network-level access).

---

## 2 — Tech Stack

| Layer | Tech | Notes |
|-------|------|-------|
| Frontend | React 18 + TypeScript + Vite | SPA, no SSR |
| State | Zustand | Cart, UI, media slices |
| Styling | Vanilla CSS | `index.css` design tokens |
| Routing | React Router v6 | 12 routes in App.tsx |
| DB | Supabase PostgreSQL | Hosted, accessed via Cloudflare proxy (`kailash.observer`) |
| DAL | `src/db/dal.ts` | All Supabase calls, firm_id injection, event emission |
| Legacy DB | Dexie/IndexedDB | Still used by: Media (blob storage), Reports KPI, Maintenance |
| 3D Viz | Three.js + @react-three/fiber | Warehouse 3D view |
| Charts | D3.js | Analytics hierarchy viz |
| PDF | jsPDF | Invoice generation |
| Media | FFmpeg Web Worker + browser-image-compression | GIF gen, image compress |
| Events | mitt | `emitDbChange(table)` → reactive UI refresh |

---

## 3 — Architecture Patterns

### 3.1 Data Flow
```
User Action → DAL method → Supabase API → emitDbChange(table) → useSupabaseLiveQuery re-fetches → UI updates
```

### 3.2 Multi-Tenancy
- `firm_id` UUID on all tenant tables, auto-injected by `withFirmId()` on inserts
- `getAll()` manually filters by `firm_id` (RLS disabled due to Cloudflare proxy)
- Firm resolved from URL hostname → `firmConfig.ts` → `setSession(firmId, role)`

### 3.3 Stock Formula (INVARIANT — NEVER BREAK)
```
stock_units = p_unit × p_unit_per_parcel × stock_parcels
```

---

## §4 — Database Schema (Key Tables)

### Reference Data (firm-scoped, shared possible)
| Table | Key Columns | Notes |
|-------|------------|-------|
| `verticals` | name | e.g. Stationery, Cutlery |
| `brands` | name, vertical_id FK | |
| `products` | name, category, vertical_id FK | Generic product types |
| `packing_units` | unit_name, multiplier | dozen, box-5, carton-50 |
| `subcategories` | name, vertical_id FK | NEW — not yet normalized |
| `variant_params_1` | name | Size dimension (Large, Small) |
| `variant_params_2` | name | Frequency (172pg, 140pg) |
| `variant_params_3` | name | Spec (Single Line, Square) |

### Inventory Core
| Table | Key Columns | Notes |
|-------|------------|-------|
| `items` | item_name, product_id, brand_id, vertical_id, packing_unit_id, variant_param1/2/3_id, p_unit, p_unit_per_parcel, stock_parcels, stock_units, retail/wholesale prices, keyword_id, reorder_threshold, purchase_price_unit | Central table — everything references this |
| `stock_movements` | item_id, movement_type, qty_change, parcel_change, from/to_location_id | NEW — track all stock changes atomically |

### Sales & CRM
| Table | Key Columns | Notes |
|-------|------------|-------|
| `orders` | prospect_id, prospect_name, status, pricing_mode, payment_status, grand_total, due_amount | Status: quote→pending→dispatched→delivered |
| `order_items` | order_id, item_id, qty, unit_price, discount, total | No firm_id — inherits from order |
| `bills` | bill_number, order_id, amount | |
| `prospects` | prospectname, area_town, contact, route_id | Customers/leads |

### Location System (3-Layer)
| Table | Key Columns | Notes |
|-------|------------|-------|
| `storage_places` | place_name, place_slug, place_type, floors | Layer 1: buildings |
| `storage_zones` | place_id, floor, zone_slug, zone_label | Layer 2: floor sections |
| `storage_slots` | zone_id, slot_name, slot_label, capacity | Layer 3: named spots |
| `item_locations` | item_id, slot_id, parcel_count, is_primary | Links items → slots |

### Procurement & Finance
| Table | Key Columns | Notes |
|-------|------------|-------|
| `suppliers` | name, contact, address, vertical_id | GLOBAL — no firm_id |
| `purchase_orders` | supplier_id, total_cost, status | |
| `costs` | cost_type, amount, description, date | |
| `account` | month_year, revenue, total_cost, profit | |

### Operational
| Table | Key Columns | Notes |
|-------|------------|-------|
| `routes` | name, description, color_tag | Field visit routes |
| `visits` | prospect_id, route_id, visit_date, outcome, next_visit_plan | |
| `warehouse_layout` | name, floors, sections | Legacy grid system |
| `warehouse_cells` | warehouse_id, floor, section, row, col, item_id, parcel_count | Legacy grid system |

---

## §5 — File Index

### 5.1 Data Layer (`src/db/`)
| File | Lines | Purpose |
|------|-------|---------|
| `dal.ts` | 1110 | **Primary DAL.** All Supabase CRUD. Exports `DAL` object with per-table methods. Handles firm_id injection, event emission. Missing: items.search, stock_movements, storage_places, item_locations methods (see CURRENT_STATE) |
| `types.ts` | 512 | TypeScript interfaces mirroring DB schema. Has: Item, Order, StockMovement, StoragePlace/Zone/Slot, ItemLocation, ItemSearchResult, LowStockItem, analytics types |
| `dexie.ts` | ~200 | Legacy IndexedDB schema. Still used by Media.tsx, Reports KPI tab, Maintenance |
| `supabase.ts` | ~20 | Supabase client init with env vars (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) |

### 5.2 Pages (`src/pages/`) — 20 files
| File                  | Lines | Functional Purpose                                                           | Data Source                              | Status                                                        |
| --------------------- | ----- | ---------------------------------------------------------------------------- | ---------------------------------------- | ------------------------------------------------------------- |
| `Billing.tsx`         | 777   | Order creation, cart, stock deduction, print/share, unpaid tracking          | DAL (Supabase)                           | ✅ Migrated. Needs: server search, atomic stock, hotkeys (T7b) |
| `DBEditor.tsx`        | 845   | Excel-like CRUD grid for all tables + SQL query constructor + named controls | DAL (Supabase)                           | ✅ Working. Has: location tables, subcategories, query panel   |
| `Accounting.tsx`      | 300   | Monthly revenue/costs/profit, cost entry CRUD                                | DAL (Supabase)                           | ✅ Migrated                                                    |
| `Marketing.tsx`       | 400   | Price list + catalogue PDF generation                                        | DAL (Supabase)                           | ✅ Migrated                                                    |
| `Media.tsx`           | 440   | Image upload/compress, GIF gen, watermark, text overlay                      | Hybrid: items from DAL, blobs from Dexie | ⚠️ Partial migration                                          |
| `Suppliers.tsx`       | 600   | Supplier CRUD, purchase orders, business volume charts                       | DAL (Supabase)                           | ✅ Working                                                     |
| `Warehouse.tsx`       | 600   | 3D warehouse viz, cell assignment, item search                               | DAL (Supabase)                           | ✅ Working                                                     |
| `FieldOps.tsx`        | 800   | Visit planning, route management, prospect visits                            | DAL (Supabase)                           | ✅ Working                                                     |
| `Analytics.tsx`       | 500   | D3 hierarchy viz, brand metrics, account flow                                | DAL (Supabase)                           | ✅ Working                                                     |
| `Reports.tsx`         | 80    | Tab container for report sub-pages                                           | Mixed                                    | ⚠️ KPI tab uses Dexie                                         |
| `Inventory.tsx`       | 900   | Legacy inventory page (may be superseded by DBEditor)                        | Dexie                                    | ❌ Still on Dexie                                              |
| `Catalogue.tsx`       | 450   | Catalogue view/generation                                                    | Dexie                                    | ❌ Still on Dexie                                              |
| `PriceList.tsx`       | 400   | Price list view                                                              | Dexie                                    | ❌ Still on Dexie                                              |
| `Dashboard.tsx`       | 200   | Overview dashboard                                                           | Dexie                                    | ❌ Still on Dexie                                              |
| `Prospects.tsx`       | 200   | Customer management (basic)                                                  | Dexie                                    | ❌ Still on Dexie                                              |
| `Routes.tsx`          | 500   | Route management (separate from FieldOps)                                    | Mixed                                    | ⚠️ Partially                                                  |
| `Settings.tsx`        | 70    | Settings placeholder                                                         | —                                        | Stub                                                          |
| `SplitViewer.tsx`     | 150   | Split-screen comparison view                                                 | —                                        | Working                                                       |
| `Maintenance.tsx`     | 370   | Backup/restore utilities                                                     | Dexie                                    | ❌ Still on Dexie                                              |
| `ReportDownloads.tsx` | 600   | Report export (PDF/CSV)                                                      | DAL                                      | ✅ Working                                                     |

### 5.3 Components (`src/components/`)
| File | Purpose |
|------|---------|
| `layout/Sidebar.tsx` | Navigation sidebar with route links |
| `layout/Header.tsx` | Top bar with firm switcher, search |
| `layout/DevFirmSwitcher.tsx` | Dev-mode firm switching dialog |
| `billing/PrintHandler.tsx` | Invoice print/PDF overlay |
| `AutoBackup.tsx` | Auto-backup logic (Dexie) |
| `BulkImportModal.tsx` | CSV/JSON bulk import (Dexie) |
| `BulkInsertModal.tsx` | Bulk row insertion |
| `StaticDataManager.tsx` | Reference data management |
| `ui/ToastContainer.tsx` | Toast notification display |

### 5.4 Config & Utils
| File | Purpose |
|------|---------|
| `config/firmConfig.ts` | URL → firm resolution (hostname mapping) |
| `store/store.ts` | Zustand store: CartSlice + UISlice + MediaSlice. Still imports from Dexie types |
| `hooks/useLiveQuery.ts` | `useSupabaseLiveQuery` — reactive data hook replacing Dexie's useLiveQuery |
| `utils/share.ts` | `shareFile()`, `shareText()`, `downloadBlob()` |
| `workers/ffmpeg.worker.ts` | FFmpeg GIF generation in Web Worker |

---

## 6 — Invariants (NEVER BREAK)

1. `stock_units = p_unit × p_unit_per_parcel × stock_parcels`
2. `variant_params_1/2/3` stay as 3 separate tables
3. `suppliers` stays global (no firm_id)
4. `emitDbChange(table)` must fire after every DAL mutation
5. All firm-scoped reads filter by `getFirmId()` (manual — RLS off)
6. All firm-scoped inserts inject `firm_id` via `withFirmId()`

---

## 7 — RPCs (Supabase SQL)

| RPC | Purpose | Status |
|-----|---------|--------|
| `get_low_stock_items(p_firm_id)` | Items where stock < reorder_threshold | ❓ May need running |
| `log_stock_movement(...)` | Atomic: insert movement + update stock | ❓ May need running |
| `run_readonly_query(sql)` | DBEditor raw SQL execution | ❓ Not yet created |
| `backfill_keyword_ids()` | Backfill keyword_id for existing items | ❓ May need running |

---

## 8 — Deep-Dive Architecture

### 8.1 Data Layer
| Layer | Tool | Role |
|-------|------|------|
| Primary DB | Supabase PostgreSQL | All business data, multi-tenant via `firm_id` |
| Legacy DB | Dexie / IndexedDB | Media blobs, Reports KPI, Maintenance, Backup |
| Media Files | Supabase Storage | Path: `firm_id/item_id/filename.webp` |
| State | Zustand | Cart, UI toggles, media session |
| Caching | In-memory (session) | `sessionStorage` for firm_id + role |

### 8.2 Session & Multi-Tenancy
- **Firm Resolution:** URL hostname → `firmConfig.ts` → `setSession(firmId, role)`
- **Role Access:** `master_admin` (all features) vs `store_owner` (limited views)
- **Firm_id Injection:** `withFirmId(table, values)` on every insert
- **Firm_id Reading:** manual `.eq('firm_id', getFirmId())` — RLS is off
- **Semi-Global Tables:** `variant_params_1/2/3` can have `firm_id = NULL` for shared data
- **Global Tables:** `suppliers` only — no `firm_id` column at all

### 8.3 Event-Driven Reactivity
```
emitDbChange('table') → dbEvents.emit('change', 'table') → useSupabaseLiveQuery re-fetches
```
- **NOT** Supabase Realtime — purely mutation-driven
- Every DAL mutation MUST call `emitDbChange(tableName)` after success
- `useSupabaseLiveQuery` hook watches specific tables and re-fetches on match

### 8.4 TanStack Query (T11 — In Progress)
- Package installed: `@tanstack/react-query ^5.90`
- New hook written: `src/hooks/useSupabaseQuery.ts` (replaces `useSupabaseLiveQuery`)
- **NOT yet wired up** — `QueryClientProvider` not added to `main.tsx`, no pages migrated
- Old hook `useLiveQuery.ts` still active — all pages still use it

---

## 9 — Module-Specific Logic

### 9.1 Billing
- Stock deduction treats bill line `qty` as **parcels** (not units)
- Pricing modal: `retail` vs `wholesale` flips per-line default prices
- Status flow: `quote → pending → dispatched → delivered → cancelled`
- Payment: `unpaid / partial / paid` tracked separately on `orders` table
- Pending: **T7b** — server-side search, atomic stock deduction via RPC, hotkeys

### 9.2 Warehouse
- **Legacy Grid:** `warehouse_layout` + `warehouse_cells` (floor/section/row/col)
- **New 3-Layer:** `storage_places → storage_zones → storage_slots → item_locations`
- 3D viz: Three.js — parcel count drives box height
- Search highlights item location across cells

### 9.3 Media
- Item metadata in Supabase (`items` table)
- Blob files still in Dexie IndexedDB (not yet migrated)
- Media roles: `primary`, `gallery`, `flipbook`, `gif`, `video`
- FFmpeg runs in a Web Worker to avoid blocking UI

### 9.4 Analytics
- D3.js for hierarchy/treemap visualizations
- Three.js arc diagrams for brand relationships
- Revenue/costs/profit pulled from `account` + `orders` tables
- Stagnant stock and movement velocity methods: **pending** (T5-DAL)

---

## 10 — DB Design Principles

### 10.1 Invariants (Absolute)
1. `stock_units = p_unit × p_unit_per_parcel × stock_parcels` — **never compute differently**
2. `emitDbChange` fires after every successful mutation
3. `firm_id` present on all tenant tables, injected via `withFirmId()`
4. `suppliers` remains global (no `firm_id`)
5. 3 separate `variant_params` tables — don't merge

### 10.2 Denormalization (Intentional)
- `prospect_name` stored on `orders` — keeps historical billing reports stable
- `item_name` stored on `order_items` — same reason
- Don't remove these; they are not redundancy, they are audit anchors

### 10.3 FK Strategy
- Most FKs: `ON DELETE SET NULL` (preserve data, unlink reference)
- Items→Orders: `ON DELETE CASCADE` (delete line items when order deleted)
- Composite index pattern: `(firm_id, created_at DESC)` on all large tables

### 10.4 JSON / Flexible Fields
- `firms.enabled_features` — JSONB for per-firm feature toggles
- Use JSONB for domain-specific metadata rather than adding columns

---

## 11 — Change Impact Tiers

| Risk | What Changes | Why Dangerous |
|------|-------------|---------------|
| 🔴 Critical | `stock_units` formula, `emitDbChange` signature, `firm_id` removal | Breaks billing or all reactive UI |
| 🔴 Critical | `variant_params` table merging | Breaks all item dropdowns |
| 🟡 Medium | `verticals`, `brands`, `products` schema | Breaks categorization + analytics |
| 🟡 Medium | Pricing fields on `items` | Breaks billing default prices |
| 🟡 Medium | `warehouse_cells` spatial schema | Breaks 3D viz + grid assignment |
| 🟢 Safe | JSONB metadata columns, `created_at/updated_at`, optional fields |
| 🟢 Safe | Adding new columns with NULL defaults to existing tables |

---

## 12 — Migration & Performance Strategy

### 12.1 Dexie → Supabase Remaining Work
| Module | Status | Blocker |
|--------|--------|--------|
| Media blobs | ❌ Dexie | Need Supabase Storage bucket + migration script |
| Reports KPI tab | ❌ Dexie | Needs aggregation queries on `orders` |
| Maintenance utilities | ❌ Dexie | Low priority — backup/restore rarely used |
| BulkImportModal | ❌ Dexie | Needs DAL bulk upsert pattern |
| Inventory, Catalogue, PriceList, Dashboard, Prospects | ❌ Dexie | Needs full DAL port |

### 12.2 Schema Evolution Rules
1. Maintain existing API contracts — don't rename DAL methods
2. Preserve stock formula in any migration script
3. Run `emitDbChange` after any data migration script
4. Update RLS policies (when re-enabling) before removing manual filters

### 12.3 Performance Targets
- Composite indexes: `(firm_id, created_at DESC)` on `orders`, `items`, `stock_movements`
- Avoid `SELECT *` in high-frequency queries — specify columns
- Paginate large datasets: `orders`, `items`, `prospects` (>500 rows)
- Use `tsvector_search` column on `items` for FTS — indexed, not `ILIKE`
