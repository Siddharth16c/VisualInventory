# VisualOS Inventory - Database Migration & Architecture Documentation

## 🎯 Production Readiness Checklist (Next 2 Hours)

### Phase 1: Critical Path (30 mins)
- [ ] Fix Type Errors (Order → SalesOrder, DAL methods)
- [ ] Update Billing Components (ItemCard, InvoiceA4/Thermal)
- [ ] Fix Inventory Components (remove old fields)
- [ ] Test Build Success

### Phase 2: Core Features (60 mins)
- [ ] Stock Management (stock_details CRUD)
- [ ] Order Creation → SalesOrder flow
- [ ] Bill Generation & Printing
- [ ] Catalogue Generation with custom titles

### Phase 3: Data Integrity (30 mins)
- [ ] Keyword_ID generation logic
- [ ] Stock calculation formulas
- [ ] Price calculation (pack/parcel)
- [ ] Sync verification

---

## 📊 Database Architecture Map

### Current Schema (Phase 1 - Production Ready)

```
┌─────────────────────────────────────────────────────────────┐
│                    CORE REFERENCE TABLES                     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  firms              - Multi-tenant isolation                │
│  verticals          - Business verticals (Stationery, etc)  │
│  brands             - Product brands                        │
│  products           - Product definitions                   │
│  categories         - Product categories (NEW)              │
│  packing_units      - Unit multipliers                      │
│  variant_params_1/2/3 - Size, Color, Type variants          │
│                                                              │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    CORE ITEM TABLE                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  items {                                                    │
│    id, firm_id, item_name, keyword_id (UNIQUE),            │
│    product_id, brand_id, vertical_id,                       │
│    variant_param1/2/3_id,                                   │
│    thumbnail_base64, marketing_images,                      │
│    metadata, created_at, updated_at                         │
│  }                                                          │
│                                                              │
│  Keyword Format: vertical-brand-product-item-vp1-vp2-vp3    │
│  Example: stationery-cello-pen-gripp-blue                  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
                              │
          ┌───────────────────┼───────────────────┐
          ▼                   ▼                   ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│  STOCK DETAILS  │  │   PRICING       │  │    MEDIA        │
├─────────────────┤  ├─────────────────┤  ├─────────────────┤
│                 │  │                 │  │                 │
│ unit_multiplier │  │ retail_unit_    │  │ item_media {    │
│ pack_multiplier │  │   price         │  │   data_base64   │
│ stock_type      │  │ wholesale_unit_ │  │   media_role    │
│ parcel_id       │  │   price         │  │   is_watermarked│
│                 │  │                 │  │ }               │
└─────────────────┘  └─────────────────┘  └─────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────┐
│                    TOTAL STOCK                              │
├─────────────────────────────────────────────────────────────┤
│  total_stock {                                              │
│    item_keyword → FK to items.keyword_id                   │
│    total_units (calculated from stock_details)             │
│    updated_at                                              │
│  }                                                          │
│                                                              │
│  Formula: total_units = Σ(unit_multiplier × pack_multiplier)│
│                                                              │
└─────────────────────────────────────────────────────────────┘

```

---

## 🔄 Business Logic Flows

### 1. Item Creation Flow
```
User Input (item_name, vertical, brand, product, variants)
    │
    ▼
Keyword Generation:
  keyword_id = `${vertical}-${brand}-${product}-${item_name}-${vp1}-${vp2}-${vp3}`
  (null values filtered out)
    │
    ▼
Insert to items table
    │
    ▼
Create stock_details entry:
  - unit_multiplier = 1 (default)
  - pack_multiplier = 1 (default)
  - retail_unit_price = 0
  - wholesale_unit_price = 0
    │
    ▼
Update total_stock:
  total_units = 0 (initially)
```

### 2. Price Calculation
```
Pack Price = unit_multiplier × unit_price (retail/wholesale)
Parcel Price = pack_price × pack_multiplier

Example:
  unit_multiplier = 12 (dozens)
  pack_multiplier = 10 (cartons)
  retail_unit_price = ₹10
  
  Pack Price = 12 × ₹10 = ₹120
  Parcel Price = ₹120 × 10 = ₹1,200
```

### 3. Stock Calculation
```
Total Units = Σ(all stock_details rows for item)

When Sale Happens:
  1. Deduct from sales_order_items.sold_units
  2. Update total_stock.total_units (subtract)
  3. Create stock_movement record

When Order Modified/Cancelled:
  1. Adjust sold_units
  2. Recalculate total_units
  3. Reverse stock_movement
```

### 4. Sales Order → Bill Flow (End of Sale)
```
SalesOrder (temporary)
    │
    ├─ User verifies items (strike/unstrike UI)
    ├─ Order confirmed
    ├─ Payment completed
    ├─ User clicks "End Sale"
    │
    ▼
Copy to Bills (permanent):
  - bill_number generated
  - All order data copied
  - Order marked: end_of_sale = true
    │
    ▼
Order remains in sales_orders (for history)
  OR optionally archived
```

---

## 📁 File Architecture Map

```
src/
├── db/
│   ├── local/
│   │   ├── db.ts              # SQLite WASM schema
│   │   ├── sync.ts            # Supabase ↔ SQLite sync
│   │   ├── queries.ts         # Local query helpers
│   │   └── hooks.ts           # React hooks for sync
│   ├── types.ts               # TypeScript interfaces
│   ├── dal.ts                 # Data Access Layer
│   └── supabase.ts            # Supabase client
│
├── components/
│   ├── billing/
│   │   ├── ItemCard.tsx       # Uses: stock_details for pricing
│   │   ├── InvoiceA4.tsx      # Uses: SalesOrder type
│   │   ├── InvoiceThermal.tsx
│   │   ├── SavedBillsView.tsx
│   │   └── UnpaidBillsView.tsx
│   │
│   ├── inventory/
│   │   ├── StockDetailsForm.tsx    # NEW: Manage stock_details
│   │   ├── PricingForm.tsx         # NEW: Set retail/wholesale prices
│   │   └── ItemCreationWizard.tsx  # NEW: Step-by-step item creation
│   │
│   ├── orders/
│   │   ├── OrderVerification.tsx   # NEW: Strike/unstrike checklist
│   │   ├── SalesOrderForm.tsx      # NEW: Create sales orders
│   │   └── PurchaseOrderForm.tsx   # NEW: Create purchase orders
│   │
│   └── catalog/
│       ├── CatalogueBuilder.tsx    # Custom title support
│       └── PriceListGenerator.tsx
│
├── pages/
│   ├── Billing.tsx            # Main billing interface
│   ├── Inventory.tsx          # Stock management
│   ├── Orders.tsx             # Order management (NEW)
│   ├── Catalogue.tsx          # Catalogue generation
│   └── Media.tsx              # Image upload/management
│
├── hooks/
│   ├── useStock.ts            # NEW: Stock calculations
│   ├── usePricing.ts          # NEW: Price calculations
│   └── useSync.ts             # Sync status
│
└── utils/
    ├── keywordGenerator.ts    # NEW: SKU generation
    ├── priceCalculator.ts     # NEW: Pack/parcel price math
    └── catalogueGenerator.ts  # HTML generation
```

---

## 🔧 Quick Fix Reference

### Critical Errors to Fix Immediately:

#### 1. Type Errors
```typescript
// BEFORE (OLD):
import type { Order, OrderItem, ProductMedia } from '@/db/types';

// AFTER (NEW):
import type { SalesOrder, SalesOrderItem, ItemMedia } from '@/db/types';
```

#### 2. DAL Method Calls
```typescript
// BEFORE (OLD):
DAL.orders.getAll()
DAL.orders.add(data)
DAL.order_items.add(data)

// AFTER (NEW):
DAL.sales_orders.getAll()
DAL.sales_orders.add(data)
DAL.sales_order_items.add(data)
```

#### 3. Item Pricing (Changed Structure)
```typescript
// BEFORE (OLD):
item.retail_price_container
item.wholesale_price_container
item.stock_parcels

// AFTER (NEW) - Fetch from stock_details:
const stockDetails = await DAL.stock_details.getByItem(item.id);
const pricing = stockDetails[0]; // or appropriate row
pricing.retail_unit_price
pricing.wholesale_unit_price
```

#### 4. Category Field (Moved)
```typescript
// BEFORE (OLD):
item.category

// AFTER (NEW) - From product or separate query:
const product = await DAL.products.getById(item.product_id);
const category = product?.category;
```

---

## 🎮 Future: AR/3D Gaming Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    3D WAREHOUSE SYSTEM                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Three.js + React Three Fiber                               │
│    │                                                        │
│    ├─ Warehouse Layout (Blender → GLTF)                    │
│    ├─ Raycasting (click to select locations)               │
│    ├─ Item Placement (drag & drop parcels)                 │
│    └─ AR Mode (WebXR for mobile camera overlay)            │
│                                                              │
│  Real-time Sync:                                            │
│    WebSocket ←→ Supabase Realtime ←→ SQLite WASM           │
│                                                              │
│  Gaming Elements:                                           │
│    ├─ XP Points for accurate stock counts                  │
│    ├─ Achievements: "Speed Stocker", "Inventory Master"    │
│    ├─ Leaderboards (team-based warehouse challenges)       │
│    └─ Quests: "Find 5 items in 60 seconds"                 │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 🚀 Production Deployment Checklist

### Pre-Deploy (Vercel)
- [ ] Build succeeds (`npm run build`)
- [ ] All TypeScript errors resolved
- [ ] Environment variables set:
  - VITE_SUPABASE_URL
  - VITE_SUPABASE_ANON_KEY
  - VITE_FIRM_ID (for default firm)

### Supabase Setup
- [ ] Run migrations on production DB
- [ ] Verify RLS policies (or confirm disabled for CF proxy)
- [ ] Set up Storage bucket for backups (optional)

### Domain (Cloudflare)
- [ ] DNS A record → Vercel
- [ ] SSL/TLS encryption enabled
- [ ] Cache rules for static assets

### Post-Deploy
- [ ] Test login/authentication
- [ ] Create test firm
- [ ] Add sample items with stock
- [ ] Create test order → verify stock deduction
- [ ] Generate test catalogue
- [ ] Print test bill

---

## 📝 Migration Commands

```bash
# 1. Fix all imports (automated)
npx ts-migrate rename --srcDir=src

# 2. Build check
npm run build

# 3. Deploy to Vercel
vercel --prod

# 4. Clear browser cache (OPFS)
# Users: Clear site data in browser settings
```

---

## 🎯 Success Metrics (2 Hour Sprint)

✅ **Must Have:**
- Build passes
- Can create items with keyword_id
- Can set stock_details (price & multipliers)
- Can create sales orders
- Can print bills
- Can generate catalogues

✅ **Nice to Have:**
- Order verification UI (strike/unstrike)
- End of sale workflow
- Purchase order flow
- Custom catalogue titles

---

## 🆘 Emergency Rollback

If critical issues:
```bash
# Revert to last known good commit
git log --oneline -10
git revert <commit-hash>
vercel --prod
```

Or disable new features:
```typescript
// In App.tsx, wrap new features with feature flag
const ENABLE_NEW_SCHEMA = false;
{ENABLE_NEW_SCHEMA && <NewInventory />}
```
