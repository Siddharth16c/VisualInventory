# VisualInventory - Enhanced Technical Context

**Generated:** 2026-03-05  
**Purpose:** Model-friendly technical documentation for DB schema redesign and major architectural changes

## 1. System Architecture Overview

### 1.1 Data Layer Architecture
- **Primary Database:** Supabase PostgreSQL with Row Level Security (RLS)
- **Legacy Database:** Dexie/IndexedDB (still active for specific modules)
- **Multi-tenancy:** Firm-based isolation via UUID `firm_id` field
- **Storage:** Supabase Storage for media files
- **Caching:** In-memory session management with reactive updates

### 1.2 Application Stack
- **Frontend:** React 18 + TypeScript + Vite
- **State Management:** Zustand
- **Styling:** Tailwind CSS
- **Routing:** React Router v6
- **3D Visualization:** Three.js + @react-three/fiber
- **Analytics:** D3.js hierarchy visualizations
- **Media Processing:** FFmpeg Web Worker + browser-image-compression

## 2. Database Schema Deep Dive

### 2.1 Core Multi-Tenancy Model

**Tenant Tables (firm_id required):**
- `firms` - Master tenant records with feature flags
- `firm_users` - User-to-firm mapping for RLS enforcement
- All business tables include `firm_id` for isolation

**Global Tables (no firm_id):**
- `suppliers` - Shared supplier directory across firms
- `auth.users` - Supabase auth users

**Semi-Global Tables (firm_id can be NULL):**
- `variant_params_1/2/3` - Can be shared (NULL) or firm-specific

### 2.2 Inventory Core Schema

#### Items Table - Critical Relationships
```sql
items (
    id PK,
    firm_id FK → firms(id),
    item_name,
    category,
    product_id FK → products(id),
    brand_id FK → brands(id),
    vertical_id FK → verticals(id),
    packing_unit_id FK → packing_units(id),
    variant_param1_id FK → variant_params_1(id),
    variant_param2_id FK → variant_params_2(id),
    variant_param3_id FK → variant_params_3(id),
    p_unit,                    -- atomic units per package
    P_unit_per_parcel,         -- packages per parcel
    stock_parcels,             -- number of parcels in stock
    stock_units,               -- computed: p_unit × P_unit_per_parcel × stock_parcels
    retail_price_unit,
    retail_price_container,
    wholesale_price_unit,
    wholesale_price_container,
    mrp
)
```

**Critical Invariant:** `stock_units = p_unit × P_unit_per_parcel × stock_parcels`

#### Variant Parameters - Flexible SKU Dimensions
- **VP1 (variant_params_1):** Pages/Count dimension (172, 140, 72, 280, 380, 12-shot, 25-shot)
- **VP2 (variant_params_2):** Line Type/Sub-variant (Square, 4-Line, Plain, Ruled)
- **VP3 (variant_params_3):** Item Size/Dimensions (A4, A5, Big, Small, Jumbo, Special)

**Design Philosophy:** Three configurable dimensions per SKU rather than hardcoded attributes

### 2.3 Reference Data Hierarchy

```
verticals (Stationery, Cutlery, Fireworks, FMCG)
├── brands (Reegal, Prime, Supreme, Fancy, Kings AK)
├── products (Notebooks, Pens, Sky Shot, Flower Pot)
└── packing_units (dozen, box-5, box-10, bundle-12, carton-50)
```

### 2.4 Business Transaction Schema

#### Orders & Line Items
```sql
orders (
    id PK,
    firm_id FK,
    prospect_id FK → prospects(id),
    prospect_name,           -- denormalized for reporting
    order_date,
    pricing_mode ENUM('retail','wholesale'),
    status ENUM('quote','pending','dispatched','delivered','cancelled'),
    subtotal, tax_amount, discount_amount, grand_total,
    paid_amount, due_amount,
    payment_status ENUM('unpaid','partial','paid'),
    due_date
)

order_items (
    id PK,
    order_id FK → orders(id),
    item_id FK → items(id),
    item_name,               -- denormalized for reporting
    qty, unit_price, discount, total
)
```

#### Warehouse Spatial Schema
```sql
warehouse_layout (
    id PK,
    firm_id FK,
    name, floors, sections_per_floor, rows_per_section, cols_per_row
)

warehouse_cells (
    id PK,
    warehouse_id FK → warehouse_layout(id),
    floor, section, row_num, col_num,
    item_id FK → items(id),
    parcel_count,
    UNIQUE(warehouse_id, floor, section, row_num, col_num)
)
```

## 3. Data Flow Architecture

### 3.1 Event-Driven UI Updates
- **Pattern:** `emitDbChange(table)` → `useSupabaseLiveQuery` → UI refresh
- **No Direct Supabase Realtime:** Refresh is mutation-driven, not subscription-based
- **Critical for DB Changes:** Any schema modifications must preserve this event flow

### 3.2 Hybrid Data Access Patterns

**Supabase Path (Primary):**
- All business logic routes use DAL methods
- RLS enforces tenant isolation
- Event-driven reactive updates

**Dexie Path (Legacy):**
- Media management (`product_media`)
- Reports KPI tab
- Maintenance utilities
- Backup/import functionality

### 3.3 Session Management
- **Firm Resolution:** URL-based (subdomain mapping in `firmConfig.ts`)
- **Role-Based Access:** `master_admin` vs `store_owner`
- **Session Context:** In-memory firm_id and role stored in DAL

## 4. Critical Constraints for DB Redesign

### 4.1 Stock Formula Invariant
**MUST PRESERVE:** `stock_units = p_unit × P_unit_per_parcel × stock_parcels`
- Used in billing stock deduction logic
- Displayed in inventory views
- Critical for warehouse cell assignments

### 4.2 Multi-Tenancy Requirements
- **RLS Policies:** All tenant tables must have `firm_id = get_my_firm_id()` policy
- **Global Tables:** Only `suppliers` should be truly global
- **Semi-Global:** Variant params can be shared across firms

### 4.3 Foreign Key Relationships
- **Cascading Deletes:** Most FKs use `ON DELETE SET NULL` or `ON DELETE CASCADE`
- **Referential Integrity:** Critical for reporting and analytics queries
- **Index Strategy:** Composite indexes on `(firm_id, created_at)` for performance

### 4.4 Denormalization Strategy
- **prospect_name** in orders table (for reporting)
- **item_name** in order_items (for reporting)
- **Vertical/Brand names** in analytics queries

## 5. Module-Specific Data Requirements

### 5.1 Billing Module
- **Stock Deduction:** Treats bill line `qty` as parcels for stock decrement
- **Pricing Logic:** Retail vs wholesale mode switches default per-line prices
- **Status Transitions:** Quote → Pending → Dispatched → Delivered

### 5.2 Warehouse Module
- **Spatial Assignment:** Items assigned to specific warehouse cells
- **3D Visualization:** Parcel count determines box height in 3D view
- **Search Highlighting:** Item location lookup across warehouse cells

### 5.3 Media Module
- **Dual Storage:** Item metadata in Supabase, media files in Dexie
- **Storage Paths:** Supabase Storage path format: `firm_id/item_id/filename.webp`
- **Media Roles:** primary, gallery, flipbook, gif, video

### 5.4 Analytics Module
- **Brand Metrics:** Revenue aggregation by brand with vertical context
- **Account Flow:** Revenue vs costs vs profit calculations
- **3D Visualizations:** D3 hierarchy + Three.js for treemaps and arc diagrams

## 6. Migration Touchpoints

### 6.1 Legacy Dexie → Supabase Migration
**Active Dexie Usage:**
- `src/pages/Media.tsx` - Media records
- `src/pages/Reports.tsx` - KPI tab
- `src/pages/Maintenance.tsx` - Backup utilities
- `src/components/BulkImportModal.tsx` - Import functionality

### 6.2 Schema Evolution Strategy
1. **Backward Compatibility:** Maintain existing API contracts
2. **Data Migration:** Preserve stock formula calculations
3. **Event Flow:** Ensure `emitDbChange` continues to work
4. **RLS Policies:** Update policies for new table structures

### 6.3 Performance Considerations
- **Index Strategy:** Composite indexes on frequently queried columns
- **Query Optimization:** Use `SELECT *` sparingly, prefer specific columns
- **Pagination:** Implement for large datasets (orders, items, prospects)

## 7. Change Impact Analysis

### 7.1 High-Impact Changes (Require Careful Planning)
- **Variant Parameters:** Any changes affect SKU flexibility and UI dropdowns
- **Stock Formula:** Modifications break inventory calculations
- **Multi-Tenancy:** RLS policy changes affect data isolation
- **Event System:** Changes to `emitDbChange` break reactive updates

### 7.2 Medium-Impact Changes (Test Thoroughly)
- **Reference Data:** Changes to verticals/brands/products affect categorization
- **Pricing Fields:** Modifications impact billing and reporting
- **Warehouse Schema:** Spatial data changes affect 2D/3D views

### 7.3 Low-Impact Changes (Safer to Modify)
- **Metadata Fields:** JSON columns for flexible data storage
- **Audit Fields:** created_at, updated_at timestamps
- **Optional Fields:** Fields with NULL defaults

## 8. Recommended DB Redesign Principles

### 8.1 Preserve Core Invariants
1. **Stock Formula:** Never break the 3-level stock calculation
2. **Multi-Tenancy:** Always include firm_id where appropriate
3. **Event Flow:** Maintain reactive update mechanism
4. **Data Integrity:** Preserve FK relationships and constraints

### 8.2 Enhance Flexibility
1. **Variant Parameters:** Keep the 3-dimension approach
2. **Metadata Storage:** Use JSON columns for domain-specific attributes
3. **Audit Trail:** Consider soft deletes for critical business data
4. **Versioning:** Plan for schema version compatibility

### 8.3 Performance Optimization
1. **Index Strategy:** Composite indexes on (firm_id, frequently filtered columns)
2. **Query Patterns:** Optimize for common reporting queries
3. **Storage Efficiency:** Use appropriate data types and constraints
4. **Caching Strategy:** Leverage in-memory session data effectively

## 9. File Structure Reference

### 9.1 Database Layer
- `src/db/dal.ts` - Primary data access layer (Supabase)
- `src/db/types.ts` - TypeScript interfaces
- `src/db/dexie.ts` - Legacy Dexie schema and migrations
- `docs/supabase_schema.sql` - Canonical PostgreSQL schema

### 9.2 Business Logic
- `src/pages/Billing.tsx` - Order creation and stock management
- `src/pages/DBEditor.tsx` - Spreadsheet-style CRUD interface
- `src/pages/Warehouse.tsx` - Spatial inventory management
- `src/pages/Analytics.tsx` - Data visualization and reporting

### 9.3 Configuration
- `src/config/firmConfig.ts` - Multi-tenancy URL resolution
- `src/db/supabase.ts` - Database connection setup
- `src/store/store.ts` - Application state management

This enhanced documentation provides the critical technical context needed for major database schema redesigns while maintaining model-friendly formatting for your local AI system.