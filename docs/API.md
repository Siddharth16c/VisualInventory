# VisualOS — API Reference

## Database API (`src/db/dexie.ts`)

All database operations use Dexie.js. Import: `import { db } from '@/db/dexie'`

---

### Items Table (`db.items`)

The main inventory table. Each entry is an individual stock-keeping unit.

| Field | Type | Description |
|-------|------|-------------|
| `id` | `number` (auto) | Primary key |
| `item_name` | `string` | e.g. "Apsara Long Notebook 172pg" |
| `item_size` | `string` | e.g. "172 pages", "500g" |
| `category` | `string` | e.g. "Stationery", "Fireworks" |
| `product_id` | `number?` | FK → `products` |
| `brand_id` | `number?` | FK → `brands` |
| `vertical_id` | `number?` | FK → `verticals` |
| `packing_unit_id` | `number?` | FK → `packing_units` |
| `retail_price_piece` | `number` | Per-piece retail price |
| `retail_price_pack` | `number` | Per-pack retail price |
| `wholesale_price_piece` | `number` | Per-piece wholesale price |
| `wholesale_price_pack` | `number` | Per-pack wholesale price |
| `mrp` | `number` | Maximum retail price |
| `stock_qty` | `number` | Available quantity |
| `metadata` | `Record<string, any>?` | Domain-specific extra fields |
| `createdAt` | `string` | ISO date |
| `updatedAt` | `string?` | ISO date |

**Indexes**: `item_name`, `item_size`, `category`, `product_id`, `brand_id`, `vertical_id`, `packing_unit_id`, `createdAt`

**CRUD Examples**:
```typescript
// Create
const id = await db.items.add({ item_name: 'Pencil', ... });

// Read all
const items = await db.items.toArray();

// Read by id
const item = await db.items.get(1);

// Update
await db.items.update(id, { stock_qty: 45 });

// Delete
await db.items.delete(id);

// Query by category
const stationery = await db.items.where('category').equals('Stationery').toArray();
```

---

### Products Table (`db.products`)

Generic product names for grouping items.

| Field | Type | Description |
|-------|------|-------------|
| `id` | `number` (auto) | Primary key |
| `name` | `string` (unique) | "Notebooks", "Pens", "Sky Shot" |
| `category` | `string` | "Stationery", "Fireworks" |
| `vertical_id` | `number?` | FK → `verticals` |

---

### Orders Table (`db.orders`)

| Field | Type | Description |
|-------|------|-------------|
| `id` | `number` (auto) | Primary key |
| `prospect_id` | `number` | FK → `prospects` |
| `prospect_name` | `string` | Denormalized customer name |
| `order_date` | `string` | ISO date |
| `pricing_mode` | `'retail' \| 'wholesale'` | Bulk/Lean |
| `status` | `'pending' \| 'dispatched' \| 'delivered' \| 'cancelled'` | Order status |
| `subtotal` | `number` | Sum of line totals |
| `tax_amount` | `number` | Calculated tax |
| `discount_amount` | `number` | Global discount |
| `grand_total` | `number` | Final total |
| `paid_amount` | `number` | Amount paid |
| `due_amount` | `number` | Remaining due |
| `payment_status` | `'unpaid' \| 'partial' \| 'paid'` | Payment tracking |

---

### Order Items Table (`db.order_items`)

| Field | Type | Description |
|-------|------|-------------|
| `id` | `number` (auto) | Primary key |
| `order_id` | `number` | FK → `orders` |
| `item_id` | `number` | FK → `items` |
| `item_name` | `string` | Denormalized |
| `qty` | `number` | Quantity |
| `unit_price` | `number` | Price used in bill (may be edited) |
| `discount` | `number` | Per-line discount |
| `total` | `number` | `qty × unit_price - discount` |

---

### Bills Table (`db.bills`)

| Field | Type | Description |
|-------|------|-------------|
| `id` | `number` (auto) | Primary key |
| `order_id` | `number` | FK → `orders` |
| `bill_number` | `string` | e.g. "INV-2026-001" |
| `business_name` | `string` | Which business |
| `print_format` | `'a4' \| 'thermal' \| 'rawbt'` | Format used |
| `pdf_blob` | `Blob?` | Saved PDF |

---

### Other Tables

| Table | Key Fields | Purpose |
|-------|-----------|---------|
| `verticals` | `name` | Business categories |
| `brands` | `name`, `vertical_id` | Brand registry |
| `packing_units` | `unit_name`, `multiplier` | Pack size definitions |
| `prospects` | `prospectname`, `area_town`, `contact` | Customer CRM |
| `travel_records` | `travel_date`, `route_id` | Travel logging |
| `visits` | `prospect_id`, `visit_date`, `outcome` | Visit tracking |
| `product_media` | `item_id`, `data` (Blob) | Image gallery |
| `costs` | `cost_type`, `amount`, `date` | Cost tracking |
| `account` | `month_year`, `revenue`, `cost` | Monthly summaries |
| `business_config` | `name`, `is_active`, `enabled_features` | Multi-business |

---

## Store API (`src/store/store.ts`)

Import: `import { useAppStore } from '@/store/store'`

### Cart Actions

| Action | Signature | Description |
|--------|-----------|-------------|
| `addToCart` | `(item: Item) => void` | Add item to cart (sets price by pricing mode) |
| `removeFromCart` | `(itemId: number) => void` | Remove from cart |
| `updateCartItemQty` | `(itemId: number, qty: number) => void` | Update line qty |
| `updateCartItemPrice` | `(itemId: number, price: number) => void` | Override line price |
| `updateCartItemDiscount` | `(itemId: number, discount: number) => void` | Set line discount |
| `setPricingMode` | `(mode: 'retail' \| 'wholesale') => void` | Switch mode, updates all cart prices |
| `setSelectedProspect` | `(prospect: Prospect \| null) => void` | Set billing customer |
| `clearCart` | `() => void` | Reset cart |

### Cart Computed

| Getter | Returns | Formula |
|--------|---------|---------|
| `getSubtotal()` | `number` | `Σ(qty × unit_price - discount)` per line |
| `getTaxAmount()` | `number` | `subtotal × taxRate / 100` |
| `getGrandTotal()` | `number` | `subtotal + tax - globalDiscount` |

### UI Actions

| Action | Signature | Description |
|--------|-----------|-------------|
| `toggleSidebar` | `() => void` | Open/close sidebar |
| `addToast` | `(message: string, type) => void` | Show notification (auto-removes after 4s) |
| `setActiveBusiness` | `(name: string) => void` | Switch business |

---

## Utility Functions

### `share.ts`

```typescript
shareFile(file: File, title: string): Promise<void>     // Web Share API
downloadBlob(blob: Blob, filename: string): void         // Download file
```

### `requestStoragePersistence(): Promise<boolean>`

Requests persistent storage from `navigator.storage.persist()`.

### `estimateStorage(): Promise<{ usage: number; quota: number }>`

Returns storage usage and quota from `navigator.storage.estimate()`.
