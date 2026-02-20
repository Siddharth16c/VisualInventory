# VisualOS Inventory Management System — Functional Documentation

## Overview

VisualOS is a cross-business inventory management PWA designed for managing stock, billing, and accounting across multiple business verticals (Stationery, Cutlery, Fireworks, FMCG). It runs entirely in the browser via IndexedDB — no server required.

---

## Navigation

| Page | Purpose |
|------|---------|
| Dashboard | At-a-glance KPIs — item count, low stock alerts, recent orders, revenue |
| Inventory | CRUD items with search, sort, group, and 4-tier pricing |
| Billing | Build cart, switch Bulk/Lean pricing, create orders, track payments |
| Price List | Select items → generate branded PDF price lists |
| Accounting | Month-wise revenue, costs, profit, and cost entry management |
| Prospects | Customer/prospect CRM — name, area, contact, notes |
| Routes | Visit logs and travel records linked to prospects |
| Media | Item image gallery with compression and GIF generation |
| Maintenance | Database backup/restore, storage usage |

---

## Feature Details

### 1. Inventory Management

- **Add/Edit/Delete items** with advanced schema:
    - **Variants**: Pages/Count (VP1), Type (VP2), Size (VP3)
    - **3-Tier Stock**: 
        - Atomic Unit (e.g. 1 pc)
        - Packing Unit (e.g. 12 pcs/dozen)
        - Parcel Unit (e.g. 15 dozens/carton)
- **Cascading dropdowns**: Category → Product, Brand filtered by vertical
- **4-tier pricing**: Retail per-piece, Retail per-pack, Wholesale per-piece, Wholesale per-pack
- **Search**: Fuzzy search across item name, category, variants
- **Sort**: Click any column header to sort ascending/descending
- **Group by Product**: Toggle to collapse items under their generic product name
- **Low stock highlighting**: Items with ≤10 qty shown in red

### 2. Billing

- **Pricing Mode Toggle**: Switch between `Lean (Retail)` and `Bulk (Wholesale)`
- **Saved Bills**: View, reprint, or share previously generated bills
- **Editable prices**: Override per-item price for the current bill
- **Cart management**: Add items, adjust qty, apply discounts per line
- **Payment tracking**: Enter paid amount → system computes due, sets status
- **Print options**: A4, Thermal, RawBT, PDF download
- **Stock deduction**: Automatically deducts from stock based on 3-tier logic

### 3. Catalogue Builder (New)

- **Interactive Flipbook**: Generate a professional HTML flipbook catalog
- **Advanced Filtering**: Filter by Vertical, Brand, Product, and Variants
- **Draft Mode**: Select items, reorder them, and preview before generating
- **Sharing**: 
    - **Download HTML**: Self-contained file, works offline
    - **Share**: via Web Share API (mobile)
- **Media**: Displays item images and sets

### 4. Price List

- **Select items** to include in a price list via checkboxes
- **Columns**: #, Item Name, Brand, Variant, Unit Price, Pack Price, **Units/Parcel**
- **Generate PDF** with business branding

### 5. Accounting

- **Monthly filter** via month picker
- **KPI cards**: Revenue, Costs, Profit (with margin %)
- **Cost entries**: Add/delete with type, business, description, amount
- **Order revenue table**: Shows order totals and due amounts

### 6. Prospects CRM

- **Add prospects**: Name, area/town, contact, business type, notes
- **Search and filter** by name or area
- **Edit/Delete** with confirmation

### 7. Routes

- **Visit log**: Record visits to prospects with outcome notes
- **Travel records**: Log travel with route, date, ideal flag, and notes

### 8. Media

- **Upload images** to items (auto-compressed)
- **Image gallery** per item
- **Generate GIF** from multiple images

### 9. Maintenance

- **Reference Data**: Manage Verticals, Products, Brands, Packing Units, and Variants (1, 2, 3)
- **Export backup**: JSON dump of all tables
- **Import backup**: Restore full database state
- **Storage info**: Shows used/available IndexedDB quota

---

## configuration

The system ships with 3 pre-configured businesses (manageable via UI):
1. **R.S. Enterprises** (Active)
2. **Kartik Traders**
3. **Kailash Cutlery**

Features can be toggled per business.

---

## Pricing & Stock Model

### Stock Logic (3-Tier)
1. **P_unit**: Atomic units per package (e.g., 12 for a Dozen)
2. **P_unit_per_parcel**: Packages per outer parcel (e.g., 20 dozens per Carton)
3. **Stock Parcels**: Physical count of outer parcels
-> **Total Stock Units** = `P_unit` × `P_unit_per_parcel` × `Stock Parcels`

### Pricing
- **Retail (Lean)**: Unit Price / Container Price
- **Wholesale (Bulk)**: Unit Price / Container Price

