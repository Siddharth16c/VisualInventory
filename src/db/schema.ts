import { sqliteTable, text, integer, blob, real } from 'drizzle-orm/sqlite-core';

// ─── Reference Data Tables ──────────────────────────────────────

export const verticals = sqliteTable('verticals', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    name: text('name').notNull().unique(),
});

export const brands = sqliteTable('brands', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    name: text('name').notNull(),
    vertical_id: integer('vertical_id').notNull().references(() => verticals.id),
});

export const products = sqliteTable('products', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    name: text('name').notNull().unique(),
    vertical_id: integer('vertical_id').notNull().references(() => verticals.id),
});

export const packing_units = sqliteTable('packing_units', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    unit_name: text('unit_name').notNull(),
    multiplier: integer('multiplier').notNull(),
});

export const variant_params_1 = sqliteTable('variant_params_1', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    name: text('name').notNull(),
    product_id: integer('product_id').references(() => products.id),
});

export const variant_params_2 = sqliteTable('variant_params_2', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    name: text('name').notNull(),
    product_id: integer('product_id').references(() => products.id),
});

export const variant_params_3 = sqliteTable('variant_params_3', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    name: text('name').notNull(),
    product_id: integer('product_id').references(() => products.id),
});

// ─── Items (Core Inventory) ───────────────────────────────────────

export const items = sqliteTable('items', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    item_name: text('item_name').notNull(),
    product_id: integer('product_id').references(() => products.id),
    brand_id: integer('brand_id').references(() => brands.id),
    vertical_id: integer('vertical_id').references(() => verticals.id),
    packing_unit_id: integer('packing_unit_id').references(() => packing_units.id),

    variant_param1_id: integer('variant_param1_id').references(() => variant_params_1.id),
    variant_param2_id: integer('variant_param2_id').references(() => variant_params_2.id),
    variant_param3_id: integer('variant_param3_id').references(() => variant_params_3.id),

    p_unit: integer('p_unit').notNull().default(1),
    P_unit_per_parcel: integer('P_unit_per_parcel').notNull().default(1),
    stock_parcels: integer('stock_parcels').notNull().default(0),
    stock_units: integer('stock_units').notNull().default(0),

    retail_price_unit: real('retail_price_unit').notNull().default(0),
    retail_price_container: real('retail_price_container').notNull().default(0),
    wholesale_price_unit: real('wholesale_price_unit').notNull().default(0),
    wholesale_price_container: real('wholesale_price_container').notNull().default(0),
    mrp: real('mrp').notNull().default(0),

    metadata: text('metadata', { mode: 'json' }),
    createdAt: text('createdAt').notNull(),
    updatedAt: text('updatedAt'),
});

// ─── CRM & Orders ──────────────────────────────────────────────────

export const prospects = sqliteTable('prospects', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    prospectname: text('prospectname').notNull(),
    area_town: text('area_town').notNull(),
    contact: text('contact').notNull(),
    business_type: text('business_type').notNull(),
    route_id: integer('route_id'),
    notes: text('notes'),
    createdAt: text('createdAt').notNull(),
});

export const orders = sqliteTable('orders', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    prospect_id: integer('prospect_id').notNull().references(() => prospects.id),
    prospect_name: text('prospect_name').notNull(),
    order_date: text('order_date').notNull(),
    pricing_mode: text('pricing_mode').notNull(), // 'retail' | 'wholesale'
    status: text('status').notNull(), // 'quote' | 'pending' | 'dispatched' | 'delivered' | 'cancelled'
    subtotal: real('subtotal').notNull().default(0),
    tax_amount: real('tax_amount').notNull().default(0),
    discount_amount: real('discount_amount').notNull().default(0),
    grand_total: real('grand_total').notNull().default(0),
    paid_amount: real('paid_amount').notNull().default(0),
    due_amount: real('due_amount').notNull().default(0),
    payment_status: text('payment_status').notNull(), // 'unpaid' | 'partial' | 'paid'
    notes: text('notes'),
    createdAt: text('createdAt').notNull(),
});

export const order_items = sqliteTable('order_items', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    order_id: integer('order_id').notNull().references(() => orders.id),
    item_id: integer('item_id').notNull().references(() => items.id),
    item_name: text('item_name').notNull(),
    qty: integer('qty').notNull(),
    unit_price: real('unit_price').notNull(),
    discount: real('discount').notNull(),
    total: real('total').notNull(),
});

export const bills = sqliteTable('bills', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    order_id: integer('order_id').notNull().references(() => orders.id),
    bill_number: text('bill_number').notNull(),
    // business_name: text('business_name').notNull(),
    print_format: text('print_format').notNull(), // 'a4' | 'thermal' | 'rawbt'
    pdf_blob: blob('pdf_blob'), // Storing blobs directly isn't ideal for large files in SQLite but mapping it for migration
    createdAt: text('createdAt').notNull(),
});

// ─── Visits & Tours ────────────────────────────────────────────────

export const travel_records = sqliteTable('travel_records', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    travel_date: text('travel_date').notNull(),
    route_id: integer('route_id').notNull(),
    route_name: text('route_name'),
    is_ideal: integer('is_ideal', { mode: 'boolean' }).notNull(),
    notes: text('notes'),
});

export const visits = sqliteTable('visits', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    prospect_id: integer('prospect_id').notNull().references(() => prospects.id),
    visit_date: text('visit_date').notNull(),
    route_id: integer('route_id'),
    outcome: text('outcome'),
    notes: text('notes'),
});

// ─── Media & Extras ────────────────────────────────────────────────

export const item_media = sqliteTable('item_media', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    item_id: integer('item_id').notNull().references(() => items.id),
    media_role: text('media_role').notNull(), // 'primary' | 'gallery' | 'flipbook' | 'gif' | 'video'
    data: text('data').notNull(), // Storing OPFS URI string rather than raw blob
    filename: text('filename').notNull(),
    mime_type: text('mime_type').notNull(),
    createdAt: text('createdAt').notNull(),
});

export const costs = sqliteTable('costs', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    cost_type: text('cost_type').notNull(),
    business_type: text('business_type').notNull(),
    cost_factor_id: integer('cost_factor_id'),
    order_id: integer('order_id'),
    amount: real('amount').notNull(),
    description: text('description'),
    date: text('date').notNull(),
});

export const account = sqliteTable('account', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    month_year: text('month_year').notNull(),
    total_revenue: real('total_revenue').notNull(),
    total_cost: real('total_cost').notNull(),
    profit: real('profit').notNull(),
    notes: text('notes'),
});

export const marketing_catalogues = sqliteTable('marketing_catalogues', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    title: text('title').notNull(),
    item_ids: text('item_ids', { mode: 'json' }).notNull(), // Array of IDs converted to JSON string
    created_at: text('created_at').notNull(),
});

export const business_config = sqliteTable('business_config', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    name: text('name').notNull().unique(),
    address: text('address'),
    contact: text('contact'),
    email: text('email'),
    website: text('website'),
    gstin: text('gstin'),
    is_active: integer('is_active', { mode: 'boolean' }).notNull().default(false),
    enabled_features: text('enabled_features', { mode: 'json' }).notNull(),
});
