# Backlog — All Tasks, Ideas & Plans
**Source:** Changes.txt, Ideas.md, 5Mar Claude session, user prompts
**Rule:** Items move to SPRINT.md when selected for work

---

## 🔴 Critical (Code Not Applied — Needs Doing)

| ID | Task | File(s) | Depends On |
|----|------|---------|------------|
| T-chub - Analyse and summarise key points mentioned in this project readme - https://github.com/andrewyng/context-hub/tree/main | 
| T-DIRECTUS - Install Directus | self-hosted Docker + rewrite dal.ts to Directus SDK | 
| T-R2 - Suggest DB changes for media storage in cloudflare R2 and help me wire to cloudflare R2 for media uploads |
| T5-DAL | Add 15+ missing DAL methods (items.search, stock_movements CRUD, storage CRUD, item_locations, analytics) | `dal.ts` | Types exist in `types.ts` |
| T7b | Billing refactor: server search via items.search, atomic stock deduction via RPC, hotkeys (Alt+S, Enter, F10) | `Billing.tsx` | T5-DAL |
| T-RPC1 | Run in Supabase SQL: `backfill_keyword_ids()` + `get_low_stock_items` + `log_stock_movement` RPCs | Supabase SQL editor | Schema done (T1-T4) |
| T-RPC2 | Create `run_readonly_query(sql)` RPC for DBEditor raw SQL execution | Supabase SQL editor | — |

- Turn tables  specific ->global by removing firm_id from tables - verticals, no feature UI

## 🟡 High Priority

| ID | Task | File(s) | Depends On |
|----|------|---------|------------|
| T10 | DBEditor Page 2 — controls library (fire saved query buttons per table) | `DBEditor.tsx` | T9 done ✅ |
| T11 | TanStack Query replacing `useSupabaseLiveQuery` across all pages | All pages | DAL stable |
| T8 | Typesense sync + search UI | New files + config | Items table stable |
| DEXIE-CLEANUP | Migrate remaining Dexie pages to DAL: Inventory, Catalogue, PriceList, Dashboard, Prospects | 5 page files | DAL stable |
| STORE-FIX | Remove `@/db/dexie` type imports from `store/store.ts`, use `types.ts` | `store.ts` | — |

## 🟢 Medium Priority

| ID | Task | File(s) | Depends On |
|----|------|---------|------------|
| T6s | Subcategories SQL + `products.category` normalization | Supabase + `dal.ts` | — |
| T12 | Analytics.tsx — KPI graphs + heatmaps | `Analytics.tsx` | Schema done |
| T13 | Location UI — SVG top-view floor plans + item placement panel | New page | Location schema done |
| T16 | n8n workflows — restock signals + stock movement events | External | `stock_movements` table done |
| MEDIA-SUPABASE | Migrate Media.tsx blob storage from Dexie → Supabase Storage | `Media.tsx` | Supabase Storage bucket setup |

## ⚪ Low Priority / Future

| ID | Task | Depends On |
|----|------|-----------|
| T7d | MinIO + Directus Docker setup | Schema stable |
| T17 | CCTV pixel-watch + voxel sync | Physical zones established |
| T18 | three.js for store position model drawing for floors, stores, to hold expressions for stock location 3 layer system(co-ords, referential linked location naming, stock position variability using packaging type + stock selection grouping system) |
| T19 | https://gemini.google.com/share/a0ea49cbf50b
---

## 💡 Feature Ideas (From Changes.txt — Not Scoped Yet)

### Stock Management
- Stock movement tracking: sale (bill logged/offline), purchase, transfer, loss, adjustment, return
- Stock threshold limit → restock alert → n8n trigger
- "Priority target" flag on old/dead stock items → separate panel
- Stock formula: `remains = sold - bought + present_before`

### Purchase Analysis
- Purchase history table: items, qty, date, amount → grouped by supplier & vertical
- Split-screen viewer for purchase comparison
- Metrics: investments + costs with parameter filters (vertical, monthly for fast-sellers, yearly for seasonal)

### Billing / Accounting Enhancements
- Search/filter with thumbnail icons per item
- Invoice generation: A4 formal + thermal receipt print
- Pending payments: client list with date reminder settings
- Bill delete/edit after saving → reverse stock deduction

### Stock Position Detector (Location UI)
- SVG top-view drawings per floor (sectioned logically)
- Add/create storage places → draw sections → mark items with DB field values
- Multiple storage place views → click → shows items + qty grouped by place
- Panel for moving items between 2 storage places
- Location drill-down: store → floor → section → count

### Search & Filtering
- Typesense (primary) + PG FTS (fallback) + TanStack (client-side)
- Location-based browsing: click section/floor → see items placed there
- Group by vertical → products (generic)
- Stock direct search via `tsvector_search`

### Media
- Multiple images per item (already working)
- Catalogue/price list generator → HTML file export

### Roles & Access (via Directus or custom)
- Staff: Stock search, billing, location view
- Owners: Purchase features, prospect data, media
- Admin only: All metrics, full DB access, system config

---

## 📐 Tech Stack Plan (Confirmed)

| Layer | Tool | Status |
|-------|------|--------|
| DB | Supabase (Postgres + RLS + tsvector) | ✅ Active |
| Search | Typesense (primary) + PG FTS (fallback) + TanStack (client) | 📋 Planned |
| Automation | n8n self-hosted | 📋 Planned |
| Frontend | React 18 + TS + Vite + Zustand | ✅ Active |
| DB Admin UI | Custom React (DBEditor.tsx) | ✅ Active |
| Admin/Roles | Directus or custom feature toggles | 📋 Planned |
| KPI Dashboards | Grafana → Supabase direct | 📋 Planned |
| Floor Heatmaps | D3 in React | ✅ Available |
| Invoicing | jsPDF | ✅ Available |
| Diagrams | Inkscape SVG | 📋 Planned |
