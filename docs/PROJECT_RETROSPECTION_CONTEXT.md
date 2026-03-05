# VisualInventory Technical Retrospection Context

Generated on: 2026-03-05

## 1) System Abstract

VisualInventory is a React + TypeScript single page app with a mixed data architecture:

- Active path: Supabase Postgres through `src/db/dal.ts`.
- Legacy path: local Dexie/IndexedDB in `src/db/dexie.ts`.

Current routed pages (`App.tsx`) mostly use Supabase-backed DAL, but several modules still read/write Dexie. This creates a hybrid runtime where not all features share one source of truth.

High level runtime:

1. `App.tsx` resolves firm from URL (`firmConfig.ts`), fetches firm UUID from `firms`, and calls `setSession(firmId, role)`.
2. UI pages call DAL methods.
3. DAL writes emit `dbEvents` (`mitt`) via `emitDbChange(table)`.
4. `useSupabaseLiveQuery` re-runs subscribed queries based on those emitted table names.

There is no direct Supabase realtime subscription in code; refresh is event-driven from local mutations.

## 2) Tech Stack

- Frontend: React 18, TypeScript, React Router v6.
- Styling: Tailwind CSS + custom utility classes (`src/index.css`).
- State: Zustand (`src/store/store.ts`) for cart, UI toasts/sidebar, media processing state.
- Data (active): Supabase JS client, Postgres schema in `docs/supabase_schema.sql`.
- Data (legacy): Dexie/IndexedDB schema and migrations in `src/db/dexie.ts`.
- Analytics/3D: Three.js, `@react-three/fiber`, `@react-three/drei`, `d3-hierarchy`.
- Docs/Export: `jspdf`, `jspdf-autotable`.
- Media processing: `browser-image-compression`, `@ffmpeg/ffmpeg` via web worker.
- Build: Vite (`vite.config.ts`).
- Testing: Vitest + jsdom + fake-indexeddb.
- Deployment config: Netlify (`netlify.toml`, `public/_headers`, `public/_redirects`).

## 3) Database Retrospection

## 3.1 Active DB: Supabase Postgres (multi-tenant)

Primary schema file: `docs/supabase_schema.sql`.

Core multi-tenancy model:

- `firms`: tenant master record + `enabled_features`.
- `firm_users`: maps auth user to one firm and role.
- Most business tables include `firm_id` and are RLS-protected.
- DAL injects `firm_id` on insert for tables in `FIRM_SCOPED_TABLES`.

RLS model summary:

- Isolation policy: `firm_id = get_my_firm_id()` for tenant tables.
- Variant params (`variant_params_1/2/3`) allow firm-or-global (`firm_id IS NULL OR firm_id = get_my_firm_id()`).
- Suppliers are global authenticated read/write.
- Child tables use parent scoped policies (`order_items`, `purchase_order_items`, `warehouse_cells`).

## 3.2 Table Dictionary (Postgres) - Purpose + Usage

Auth and tenancy:

- `firms`: tenant profile and feature flags. Used in `App.tsx`, `DAL.firms.*`, `DevFirmSwitcher`.
- `firm_users`: auth->firm mapping for RLS. Not directly queried by UI code.

Reference data:

- `verticals`: top business domain/category axis (Stationery, etc). Used by `DBEditor`, `Marketing`, `Suppliers` lookup.
- `brands`: brand dimension under verticals. Used by `DBEditor`, `Marketing`, analytics aggregation.
- `products`: generic product families under category/vertical. Used by `DBEditor`, `Marketing`, `Media`.
- `packing_units`: unit multipliers and naming. Used by `DBEditor` and item setup.
- `variant_params_1`: Variant dimension #1 (currently treated as "Size" in DBEditor, historically pages/count). Used by `DBEditor`, `Billing` display.
- `variant_params_2`: Variant dimension #2 (currently "Frequency/Type" label). Used by `DBEditor`.
- `variant_params_3`: Variant dimension #3 (currently "Spec/Item size" label). Used by `DBEditor`.

Inventory core:

- `items`: SKU records with pricing, stock, and variant FKs. Used by almost all modules (`Billing`, `Marketing`, `Warehouse`, reports, `Media`, `DBEditor`).
  - Important invariant: `stock_units = p_unit * p_unit_per_parcel * stock_parcels`.
  - Pricing fields separate retail/wholesale and unit/container.

CRM and sales:

- `routes`: field route plans. Used by `FieldOps`, `DBEditor`.
- `prospects`: customer/prospect master. Used by `Billing`, `FieldOps`, `DBEditor`, reports.
- `orders`: order headers and payment state. Used by `Billing`, `Accounting`, reports, analytics, `DBEditor`.
- `order_items`: line items per order. Used by `Billing`, reports, analytics.
- `bills`: printable invoice metadata per order. Used by `Billing`, `DBEditor`.
- `visits`: visit logs and future plans. Used by `FieldOps`, `DBEditor`.
- `travel_records`: travel tracking table exposed in DAL but no routed page actively uses it.

Procurement:

- `suppliers`: global supplier master (no `firm_id`). Used by `Suppliers`, `DBEditor`.
- `purchase_orders`: procurement headers. Used by `Suppliers`, `DBEditor`, financial analytics.
- `purchase_order_items`: line items for procurement. DAL exists; no routed UI flow writes line items today.

Media and marketing:

- `product_media`: item media references (intended for Supabase storage path). Read in `Marketing`, DAL media APIs.
- `marketing_catalogues`: saved catalogue definitions. DAL exists; no routed page currently writes/reads this table directly.

Finance and reporting:

- `costs`: opex/expense entries. Used by `Accounting`, reports, analytics, `DBEditor`.
- `account`: monthly rolled-up account rows. DAL exists; `DBEditor` can edit; limited routed usage.

Warehouse:

- `warehouse_layout`: warehouse dimensions/sections/floors. Used by `Warehouse`.
- `warehouse_cells`: per-cell item placement and parcel counts. Used by `Warehouse` (2D + 3D views).

## 3.3 Variant Params (1,2,3) - Intent

Variant params replaced older rigid fields (`item_size`, `item_type_id`) with 3 optional FK slots on items:

- `variant_param1_id` -> `variant_params_1`
- `variant_param2_id` -> `variant_params_2`
- `variant_param3_id` -> `variant_params_3`

They are semantically flexible per vertical/product. Current code labels are not fully consistent across old/new modules:

- DBEditor labels: VP1 Size, VP2 Frequency, VP3 Spec.
- Legacy Dexie comments/seeds: VP1 Pages/Count, VP2 Line Type, VP3 Item Size.

For a DB redesign, preserve the concept as "three configurable dimensions per SKU" rather than hardcoding names.

## 3.4 Legacy DB: Dexie/IndexedDB

Legacy schema + migrations live in `src/db/dexie.ts`:

- DB name: `VisualOS_DB`.
- Migrations: v2 -> v7.
- Seeds reference data on load (`seedReferenceData()`).
- Requests persistent browser storage (`navigator.storage.persist()`).

Key migration history:

- v3: introduced `item_types`.
- v4: renamed price fields and migrated stock structure.
- v5: migrated to variant params + 3-level stock formula.
- v6: business config contact details.
- v7: added `variant_params_3`.

Dexie is still used by several pages/components (see section 5 and 6), so legacy data path remains operational.

## 3.5 DAL Design Notes

`src/db/dal.ts` centralizes Supabase CRUD and analytics/report queries.

- `setSession(firmId, role)` stores in-memory session context.
- `withFirmId` auto-injects tenant id for firm-scoped tables on insert.
- `bulkUpsert` is used heavily by `DBEditor` to save full-grid edits.
- `emitDbChange(table)` triggers local reactive refresh hooks.

Important caveat:

- Reads are mostly unfiltered in DAL; RLS is expected to enforce tenant boundaries.
- If RLS is bypassed or misconfigured, client-side code does not enforce firm scoping.

## 4) Functional Overview (Routed Features)

## 4.1 Billing (`/billing`)

- Search/add item to cart.
- Retail vs wholesale mode switches default per-line price.
- Creates `orders` + `order_items`.
- Non-quote flow also creates `bills`.
- Stock deduction logic updates `items.stock_parcels` and recomputes `stock_units`.
- Supports saved orders view, unpaid grouping, status transitions, and share text export.

Business assumption in stock deduction:

- Bill line `qty` is treated as parcels for stock decrement.

## 4.2 Inventory DB Editor (`/inventory`)

- Spreadsheet-style CRUD across many tables.
- Grouped table selector: reference data, inventory, CRM, sales, procurement, finance.
- FK dropdown lookups.
- Row add/duplicate/delete + bulk upsert save.
- Pre-save required field checks and friendly constraint error messaging.

## 4.3 Field Ops (`/fieldops`)

- Route tree with town grouping.
- Prospect assignment/editing.
- Visit logging with outcomes and next visit plans.
- Future plan and recent visit summaries.
- Google Maps route open from prospect towns.

## 4.4 Marketing (`/marketing`)

- Item grouping by vertical->brand.
- Generates:
  - Price list PDF (jsPDF).
  - HTML catalogue (via `catalogueGenerator.ts`) with media.
- Share/download output options.

## 4.5 Media (`/media`)

- Select item, upload/compress images.
- Generate GIF via ffmpeg web worker.
- Text overlays and watermark copies.
- Share/download/delete media.

Current data split:

- Item metadata from Supabase.
- Media records stored in Dexie (`db.product_media`), not Supabase.

## 4.6 Suppliers (`/suppliers`)

- Supplier CRUD.
- Supplier expansion loads business volume and purchase order history.
- Purchase order header creation (subtotal/freight/packaging/total).
- Monthly volume rollup display.

## 4.7 Warehouse (`/warehouse`)

- Warehouse layout creation.
- Cell assignment of items and parcel count.
- Search highlights item locations.
- Toggle 2D grid and 3D visualization.

## 4.8 Reports (`/reports`)

Tabs:

- KPIs (`Dashboard.tsx`, legacy Dexie source).
- Downloads (`ReportDownloads.tsx`, Supabase DAL source).
- Analytics (`Analytics.tsx`, Supabase DAL source, 3D visuals).

`ReportDownloads` builds multi-section PDFs from report and analytics DAL queries.

## 4.9 Accounting (`/accounting`)

- Month filter.
- Revenue from orders vs costs.
- Profit/margin summary.
- Cost entry CRUD.

## 4.10 Settings (`/settings`)

- Firm switcher (dev utility).
- Maintenance panel (Dexie backup/import and static data manager).

## 4.11 Split Viewer (`/splitviewer`)

- Side-by-side local file viewer for image/pdf.
- Object URLs only; no persistence.

## 5) Non-routed / Legacy Functional Modules

These pages exist but are not in current `App.tsx` routes:

- `Inventory.tsx`: Dexie-based inventory manager with inline ref-data add and bulk insert modal.
- `Catalogue.tsx`: Dexie catalogue builder with draft ordering and HTML export.
- `PriceList.tsx`: Dexie price list selector and PDF generator.
- `Prospects.tsx`: Dexie prospects CRUD.
- `Routes.tsx`: older route/visit module superseded by `FieldOps`.
- `Maintenance.tsx`: used inside Settings tab, still Dexie-centric.

## 6) Known Architectural Drift (Important for DB redesign)

1. Mixed data backends:
- Supabase DAL is primary for routed business flow.
- Dexie is still used by media, reports KPI tab, maintenance, and legacy pages.

2. Naming drift:
- `createdAt`/`updatedAt` (Dexie) vs `created_at`/`updated_at` (Supabase).
- `P_unit_per_parcel` in legacy vs `p_unit_per_parcel` in Supabase.

3. Legacy stubs:
- `src/db/db.ts` is a stub (`db = {} as any`), but `BulkImportModal` imports it and Drizzle schema, so that modal is likely non-functional in current runtime.

4. Feature flag hook incomplete:
- `useFeatureFlag` currently returns true for non-master roles.

5. Test/docs skew:
- Current tests and markdown docs are largely Dexie-era and do not fully match live Supabase flows.

## 7) Folder and File Map (one-line purpose)

Root config and docs:

- `README.md`: top-level intro and quick start.
- `SETUP.md`: local setup and hosting instructions.
- `TESTING.md`: test execution and manual checklist.
- `package.json`: scripts and dependency manifest.
- `vite.config.ts`: Vite config, aliasing, worker format, COOP/COEP dev headers.
- `vitest.config.ts`: Vitest + jsdom configuration.
- `tailwind.config.js`: design tokens, animations, typography.
- `postcss.config.js`: Tailwind + autoprefixer pipeline.
- `tsconfig.json`: app TS baseline and path aliases.
- `tsconfig.app.json`: app project build info settings.
- `tsconfig.node.json`: node-side TS config for Vite config typing.
- `drizzle.config.ts`: drizzle-kit schema/migration config.
- `netlify.toml`: Netlify build + SPA redirect config.
- `index.html`: SPA host page and root mounting point.
- `vite-env.d.ts`: Vite type definitions.
- `EmptyREADME.md`: unused placeholder readme.

Public assets:

- `public/_headers`: production COOP/COEP headers.
- `public/_redirects`: SPA route fallback.
- `public/favicon.svg`: app icon.
- `public/templates/Bulk_Import_Template.csv`: CSV template for import.
- `public/templates/Bulk_Import_Guide.md`: import guidance.

Project docs folder:

- `docs/API.md`: API-related project notes (legacy).
- `docs/CHANGELOG.md`: change history notes.
- `docs/Changes.txt`: ad-hoc change log text.
- `docs/DEPLOY.md`: deployment-specific notes.
- `docs/FLOWCHARTS.md`: workflow charts.
- `docs/FUNCTIONAL.md`: older functional doc (not fully current).
- `docs/Ideas.md`: backlog/ideas notes.
- `docs/supabase_schema.sql`: canonical Postgres schema and RLS policies.
- `docs/TECHNICAL.md`: older technical architecture note (partially stale).
- `docs/PROJECT_RETROSPECTION_CONTEXT.md`: this consolidated context document.

Drizzle artifacts:

- `drizzle/0000_whole_tenebrous.sql`: generated SQLite migration SQL.
- `drizzle/meta/_journal.json`: migration journal metadata.
- `drizzle/meta/0000_snapshot.json`: generated schema snapshot.

App entry and shell:

- `src/main.tsx`: React root render and router mount.
- `src/App.tsx`: global layout, route definitions, firm session initialization.
- `src/index.css`: global CSS utilities and print styles.

Config:

- `src/config/firmConfig.ts`: hostname-to-firm mapping and role defaults.

Data layer:

- `src/db/supabase.ts`: Supabase client setup from env vars.
- `src/db/dal.ts`: central CRUD/report/analytics/warehouse APIs + change emitter.
- `src/db/types.ts`: TS interfaces mirroring Supabase schema.
- `src/db/events.ts`: EventTarget-based db event helper (legacy alternative).
- `src/db/schema.ts`: Drizzle SQLite schema (legacy/local model).
- `src/db/dexie.ts`: Dexie schema, migrations, seeding, storage helpers.
- `src/db/db.ts`: placeholder/stub db adapter (not implemented).

Hooks:

- `src/hooks/useLiveQuery.ts`: DAL-backed reactive query hook via emitted table events.
- `src/hooks/useFeatureFlag.ts`: feature flag helper (currently permissive stub).

Store:

- `src/store/store.ts`: Zustand slices for cart, UI, and media processing states.

Pages (routed primary):

- `src/pages/Billing.tsx`: order creation, quote/invoice flow, payment and status handling.
- `src/pages/DBEditor.tsx`: spreadsheet CRUD for core business tables with bulk upsert.
- `src/pages/FieldOps.tsx`: routes, prospects, visits, and next-visit planning UI.
- `src/pages/Marketing.tsx`: grouped listing plus price list/catalogue generation.
- `src/pages/Media.tsx`: per-item media upload/edit/gif/share management.
- `src/pages/Suppliers.tsx`: suppliers and purchase order history/workflow.
- `src/pages/Warehouse.tsx`: warehouse layout/cell assignment in 2D/3D.
- `src/pages/Reports.tsx`: reports tab shell (KPIs, downloads, analytics).
- `src/pages/ReportDownloads.tsx`: report preview and PDF export generator.
- `src/pages/Accounting.tsx`: cost tracking and monthly revenue/cost/profit summaries.
- `src/pages/Settings.tsx`: firm switcher and maintenance tab container.
- `src/pages/SplitViewer.tsx`: temporary dual-panel document/image viewer.

Pages (legacy or indirectly used):

- `src/pages/Dashboard.tsx`: KPI dashboard using Dexie local tables.
- `src/pages/Analytics.tsx`: 3D analytics using DAL metrics and custom visual components.
- `src/pages/Inventory.tsx`: older Dexie inventory manager + bulk insert.
- `src/pages/Catalogue.tsx`: older Dexie catalogue draft and HTML exporter.
- `src/pages/PriceList.tsx`: older Dexie price list selector/export.
- `src/pages/Prospects.tsx`: older Dexie prospect manager.
- `src/pages/Routes.tsx`: older route/visit manager variant.
- `src/pages/Maintenance.tsx`: Dexie backup/import and static reference manager.

Components:

- `src/components/layout/Sidebar.tsx`: left navigation and section links.
- `src/components/layout/Header.tsx`: top bar with title, network state, active firm label.
- `src/components/layout/MobileNav.tsx`: legacy bottom nav for mobile routes.
- `src/components/layout/DevFirmSwitcher.tsx`: dev firm selector UI from `firms`.
- `src/components/ui/ToastContainer.tsx`: app toast rendering.
- `src/components/AutoBackup.tsx`: Dexie backup reminder and JSON export prompt.
- `src/components/BulkInsertModal.tsx`: text/tsv bulk insert into Dexie items.
- `src/components/BulkImportModal.tsx`: CSV import flow via DAL + Drizzle stub path (likely outdated).
- `src/components/StaticDataManager.tsx`: modal CRUD for Dexie reference tables.
- `src/components/billing/PrintHandler.tsx`: print/share wrapper for A4 and thermal invoice layouts.
- `src/components/billing/InvoiceA4.tsx`: A4 invoice printable template.
- `src/components/billing/InvoiceThermal.tsx`: thermal receipt printable template.
- `src/components/analytics/BrandHeatmap.tsx`: 3D treemap mesh visualization for brand revenue.
- `src/components/analytics/AccountArc.tsx`: concentric arc visualization for financial flow.

Utilities and worker:

- `src/utils/catalogueGenerator.ts`: HTML catalogue generator with embedded base64 media.
- `src/utils/share.ts`: web share and file download helper fallback.
- `src/utils/storage.ts`: Supabase storage upload/url/delete helpers.
- `src/utils/opfs.ts`: OPFS blob storage helpers (legacy/local path).
- `src/workers/ffmpeg.worker.ts`: background GIF generation worker.

Tests:

- `src/__tests__/dexie.test.ts`: Dexie CRUD and order/bill behavior tests (legacy schema focus).
- `src/__tests__/billing.test.ts`: cart math/unit logic tests.
- `src/__tests__/backup.test.ts`: backup serialization validation tests.
- `src/__tests__/pricelist.test.ts`: selection/filtering/formatting logic tests.

## 8) DB Redesign Touchpoints (for your local model experiments)

If you perform a major DB redesign, highest impact files are:

- Schema: `docs/supabase_schema.sql`, `src/db/types.ts`.
- Data layer: `src/db/dal.ts`.
- Core editors/workflows: `src/pages/DBEditor.tsx`, `src/pages/Billing.tsx`, `src/pages/FieldOps.tsx`, `src/pages/Warehouse.tsx`, `src/pages/Suppliers.tsx`.
- Reporting: `src/pages/ReportDownloads.tsx`, `src/pages/Analytics.tsx`.
- Hybrid cleanup candidates: `src/db/dexie.ts`, legacy Dexie pages/components listed above.

Recommended invariants to keep explicit in prompts/models:

- Tenant isolation by `firm_id` + RLS.
- Stock formula and stock mutation semantics.
- Order header and line item separation.
- Variant dimensions as flexible SKU metadata, not fixed labels.
- Event-driven UI refresh contract (`emitDbChange` + `useSupabaseLiveQuery`).
