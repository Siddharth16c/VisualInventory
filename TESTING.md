# VisualOS — Testing Guide

## Running Tests

```bash
# Run all tests once
npm test

# Watch mode (re-runs on file changes)
npm run test:watch

# With coverage report
npm run test:coverage
```

---

## Test Suites

### 1. Database Tests (`src/__tests__/dexie.test.ts`)

Tests Dexie.js CRUD operations:
- ✅ Create and read a product
- ✅ Update product fields
- ✅ Delete a product
- ✅ Create order with line items
- ✅ Query products by category index

### 2. Billing / Cart Tests (`src/__tests__/billing.test.ts`)

Tests cart business logic:
- ✅ Add items to cart
- ✅ Increment qty for same product
- ✅ Calculate subtotal correctly
- ✅ Apply line item discount
- ✅ Calculate tax (GST)
- ✅ Apply global discount
- ✅ Handle empty cart (zero totals)
- ✅ Remove items from cart
- ✅ Prevent negative quantities
- ✅ Prevent negative grand total
- ✅ Handle zero-price items (free samples)
- ✅ Clear cart resets everything

### 3. Backup Tests (`src/__tests__/backup.test.ts`)

Tests export/import logic:
- ✅ Serialize and deserialize products
- ✅ Handle empty backup
- ✅ Reject invalid JSON
- ✅ Base64 blob encoding roundtrip (media)
- ✅ Preserve metadata (domain-specific fields)
- ✅ Handle large datasets (1000 records)
- ✅ Validate backup structure

### 4. Price List Tests (`src/__tests__/pricelist.test.ts`)

Tests selection and filtering:
- ✅ Filter products by search query
- ✅ Handle empty selection
- ✅ Select all / deselect all
- ✅ Toggle individual selections
- ✅ Format prices correctly

---

## Manual Testing Checklist

### Billing Flow
1. [ ] Navigate to Inventory → Add 3-4 products
2. [ ] Navigate to Billing → Search and add products to cart
3. [ ] Adjust quantities, change unit prices
4. [ ] Set tax rate (e.g., 18%)
5. [ ] Apply global discount
6. [ ] Click "Create Order"
7. [ ] Verify A4 invoice renders correctly
8. [ ] Click "A4 Print" → verify print preview
9. [ ] Click "RawBT PDF" → verify PDF downloads
10. [ ] Click "Share" → verify WhatsApp share opens

### Price List
1. [ ] Navigate to Price List
2. [ ] Search and select products
3. [ ] Click "Download PDF" → verify PDF content
4. [ ] Click "Share" → verify sharing works

### Media
1. [ ] Navigate to Media → Select a product
2. [ ] Upload 3+ images → verify compression
3. [ ] Click "Generate GIF" → verify progress bar
4. [ ] Verify GIF downloads

### Backup / Maintenance
1. [ ] Navigate to Maintenance
2. [ ] Click "Export Database" → verify JSON downloads
3. [ ] Clear some data
4. [ ] Import the backup file → verify data restored

### PWA / Offline
1. [ ] Build production: `npm run build`
2. [ ] Serve: `npm run preview`
3. [ ] Open in Chrome → verify service worker in Dev Tools
4. [ ] Toggle offline mode → verify app still works
5. [ ] On mobile: "Add to Home Screen" → verify PWA installs
