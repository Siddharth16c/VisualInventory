import Dexie, { type Table } from 'dexie';

// ─── Type Definitions ───────────────────────────────────────────

/** Main inventory table — individual stock-keeping entries */
export interface Item {
    id?: number;
    item_name: string;          // e.g. "Apsara Long Notebook 172pg"
    keyword_id?: string;        // deterministic SKU identifier — barcode replacement
    category: string;           // e.g. "Stationery", "Fireworks"
    product_id?: number;        // FK → products (generic name like "Notebooks")
    brand_id?: number;          // FK → brands
    vertical_id?: number;       // FK → verticals
    packing_unit_id?: number;   // FK → packing_units (describes container type)

    // Variant parameters (replace item_size + item_type_id)
    variant_param1_id?: number; // FK → variant_params_1 (Pages: 172, 140, 72, 280, 380)
    variant_param2_id?: number; // FK → variant_params_2 (Line Type: Square, 4-Line, Plain)
    variant_param3_id?: number; // FK → variant_params_3 (Item Size: A4, A5, Big, Small, Jumbo)

    // 3-level stock:  p_unit × P_unit_per_parcel × stock_parcels = stock_units
    p_unit: number;             // atomic units per package (e.g. 12 = dozen)
    P_unit_per_parcel: number;            // packages per parcel (e.g. 15 dozens per bundle)
    stock_parcels: number;      // number of parcels in stock
    stock_units: number;        // computed: p_unit × P_unit_per_parcel × stock_parcels

    // Pricing — lean (retail) vs bulk (wholesale) × unit vs container
    retail_price_unit: number;       // price per single unit (lean)
    retail_price_container: number;  // price per container (lean)
    wholesale_price_unit: number;    // price per single unit (bulk)
    wholesale_price_container: number; // price per container (bulk)

    mrp: number;

    metadata?: Record<string, any>;   // Domain-specific dynamic fields
    createdAt: string;
    updatedAt?: string;
}

/** Generic product names tied to categories (e.g. "Notebooks" → Stationery) */
export interface Product {
    id?: number;
    name: string;               // "Notebooks", "Pens", "Sky Shot", "Flower Pot"
    category: string;           // "Stationery", "Fireworks", "Cutlery", "FMCG"
    vertical_id?: number;       // FK → verticals
}

export interface Vertical {
    id?: number;
    name: string;               // "Stationery", "Cutlery", "Fireworks", "FMCG"
}

export interface Brand {
    id?: number;
    name: string;               // "Reegal", "Prime", "Supreme", etc.
    vertical_id: number;        // FK → verticals
}

/** Packing multipliers — per-item (since each item can have different packing) */
export interface PackingUnit {
    id?: number;
    unit_name: string;          // "dozen", "box", "bundle"
    multiplier: number;         // 12, 5, 10, 20 etc.
}

/** Variant parameter 1 — Pages/Count (172, 140, 72, 280, 380, 12-shot, 25-shot) */
export interface VariantParam1 {
    id?: number;
    name: string;               // "172pg", "140pg", "72pg", "12-shot", "25-shot"
    product_id?: number;        // FK → products (optional, for product-specific variants)
}

/** Variant parameter 2 — Sub-variant/Type (Square Line, 4 Line, Plain, etc.) */
export interface VariantParam2 {
    id?: number;
    name: string;               // "Square Line", "4 Line", "Plain", "Ruled"
    product_id?: number;        // FK → products (optional)
}

/** Variant parameter 3 — Item Size/Dimensions (A4, A5, Big, Small, Jumbo, Special) */
export interface VariantParam3 {
    id?: number;
    name: string;               // "A4", "A5", "Jumbo", "Long", "Big", "Small", "Special"
    product_id?: number;        // FK → products (optional)
}

export interface Prospect {
    id?: number;
    prospectname: string;
    area_town: string;
    contact: string;
    business_type: string;
    route_id?: number;
    notes?: string;
    createdAt: string;
}

export interface Order {
    id?: number;
    prospect_id: number;
    prospect_name: string;
    order_date: string;
    pricing_mode: 'retail' | 'wholesale';   // Bulk/Lean
    status: 'quote' | 'pending' | 'dispatched' | 'delivered' | 'cancelled';
    subtotal: number;
    tax_amount: number;
    discount_amount: number;
    grand_total: number;
    paid_amount: number;
    due_amount: number;
    payment_status: 'unpaid' | 'partial' | 'paid';
    notes?: string;
    createdAt: string;
}

export interface OrderItem {
    id?: number;
    order_id: number;
    item_id: number;            // FK → items
    item_name: string;
    qty: number;
    unit_price: number;         // the price used in this bill (temporarily edited)
    discount: number;
    total: number;
}

export interface Bill {
    id?: number;
    order_id: number;           // FK → orders
    bill_number: string;        // e.g. "INV-2026-001"
    business_name: string;      // which business generated this
    print_format: 'a4' | 'thermal' | 'rawbt';
    pdf_blob?: Blob;            // saved PDF for export
    createdAt: string;
}

export interface TravelRecord {
    id?: number;
    travel_date: string;
    route_id: number;
    route_name?: string;
    is_ideal: boolean;
    notes?: string;
}

export interface Visit {
    id?: number;
    prospect_id: number;
    visit_date: string;
    route_id?: number;
    outcome?: string;
    notes?: string;
}

export interface ProductMedia {
    id?: number;
    item_id: number;            // FK → items (renamed from product_id)
    media_role: 'primary' | 'gallery' | 'flipbook' | 'gif' | 'video';
    data: Blob;
    filename: string;
    mime_type: string;
    createdAt: string;
}

export interface Cost {
    id?: number;
    cost_type: string;
    business_type: string;
    cost_factor_id?: number;
    order_id?: number;
    amount: number;
    description?: string;
    date: string;
}

export interface Account {
    id?: number;
    month_year: string;
    total_revenue: number;
    total_cost: number;
    profit: number;
    notes?: string;
}

export interface MarketingCatalogue {
    id?: number;
    title: string;
    item_ids: number[];         // renamed from product_ids
    created_at: string;
}

export interface BusinessConfig {
    id?: number;
    name: string;               // "R.S. Enterprises", "Kartik Traders", "Kailash Cutlery"
    address?: string;
    contact?: string;
    email?: string;
    website?: string;
    gstin?: string;
    is_active: boolean;
    enabled_features: string[]; // ["inventory","billing","accounting","media","prospects"]
}

// ─── Database Class ─────────────────────────────────────────────

export class VisualOSDatabase extends Dexie {
    items!: Table<Item>;
    products!: Table<Product>;
    verticals!: Table<Vertical>;
    brands!: Table<Brand>;
    packing_units!: Table<PackingUnit>;
    variant_params_1!: Table<VariantParam1>;
    variant_params_2!: Table<VariantParam2>;
    variant_params_3!: Table<VariantParam3>;
    prospects!: Table<Prospect>;
    orders!: Table<Order>;
    order_items!: Table<OrderItem>;
    bills!: Table<Bill>;
    travel_records!: Table<TravelRecord>;
    visits!: Table<Visit>;
    product_media!: Table<ProductMedia>;
    costs!: Table<Cost>;
    account!: Table<Account>;
    marketing_catalogues!: Table<MarketingCatalogue>;
    business_config!: Table<BusinessConfig>;

    constructor() {
        super('VisualOS_DB');

        this.version(2).stores({
            items: '++id, item_name, item_size, category, product_id, brand_id, vertical_id, packing_unit_id, createdAt',
            products: '++id, &name, category, vertical_id',
            verticals: '++id, &name',
            brands: '++id, name, vertical_id',
            packing_units: '++id, unit_name, multiplier',
            prospects: '++id, prospectname, area_town, contact, business_type, route_id',
            orders: '++id, prospect_id, order_date, status, payment_status, due_amount, createdAt',
            order_items: '++id, order_id, item_id',
            bills: '++id, order_id, bill_number, business_name, createdAt',
            travel_records: '++id, travel_date, route_id, is_ideal',
            visits: '++id, prospect_id, visit_date, route_id',
            product_media: '++id, item_id, media_role',
            costs: '++id, cost_type, business_type, cost_factor_id, order_id, date',
            account: '++id, month_year',
            marketing_catalogues: '++id, title, created_at',
            business_config: '++id, &name, is_active',
        });

        // v3: Add item_types table + item_type_id index on items
        this.version(3).stores({
            items: '++id, item_name, item_size, category, product_id, brand_id, vertical_id, packing_unit_id, item_type_id, createdAt',
            item_types: '++id, name, product_id',
        });

        // v4: Dual stock tracking + price field rename
        this.version(4).stores({
            items: '++id, item_name, item_size, category, product_id, brand_id, vertical_id, packing_unit_id, item_type_id, createdAt',
        }).upgrade(async (tx) => {
            const items = tx.table('items');
            await items.toCollection().modify((item: any) => {
                // Migrate price fields
                item.retail_price_unit = item.retail_price_piece ?? item.retail_price_unit ?? 0;
                item.retail_price_container = item.retail_price_pack ?? item.retail_price_container ?? 0;
                item.wholesale_price_unit = item.wholesale_price_piece ?? item.wholesale_price_unit ?? 0;
                item.wholesale_price_container = item.wholesale_price_pack ?? item.wholesale_price_container ?? 0;

                // Migrate stock
                item.packaging_qty = item.packaging_qty ?? 1;
                item.stock_units = item.stock_qty ?? item.stock_units ?? 0;
                item.stock_parcels = item.packaging_qty > 0
                    ? Math.floor(item.stock_units / item.packaging_qty)
                    : 0;

                // Clean up old fields
                delete item.retail_price_piece;
                delete item.retail_price_pack;
                delete item.wholesale_price_piece;
                delete item.wholesale_price_pack;
                delete item.stock_qty;
            });
        });

        // v5: Variant params + 3-level stock (p_unit × P_unit_per_parcel × parcels)
        this.version(5).stores({
            items: '++id, item_name, category, product_id, brand_id, vertical_id, packing_unit_id, variant_param1_id, variant_param2_id, createdAt',
            variant_params_1: '++id, name, product_id',
            variant_params_3: '++id, name, product_id',
            variant_params_2: '++id, name, product_id',
            // item_types kept (not deleted) for backward compat — no longer used in UI
            item_types: '++id, name, product_id',
        }).upgrade(async (tx) => {
            // Migrate item_types → variant_params_1
            const itemTypes = tx.table('item_types');
            const vp1 = tx.table('variant_params_1');

            const allTypes = await itemTypes.toArray();
            const typeIdMap = new Map<number, number>(); // old item_type_id → new vp1 id

            for (const t of allTypes) {
                const newId = await vp1.add({
                    name: (t as any).name,
                    product_id: (t as any).product_id,
                });
                typeIdMap.set((t as any).id, newId as number);
            }

            // Migrate items
            const items = tx.table('items');
            await items.toCollection().modify((item: any) => {
                // Map item_type_id → variant_param1_id
                if (item.item_type_id && typeIdMap.has(item.item_type_id)) {
                    item.variant_param1_id = typeIdMap.get(item.item_type_id);
                }
                item.variant_param2_id = item.variant_param2_id ?? undefined;

                // Rename packaging_qty → P_unit_per_parcel, add p_unit
                const oldPkgQty = item.packaging_qty ?? 1;
                item.p_unit = oldPkgQty;        // was "units per container", now "atomic units"
                item.P_unit_per_parcel = item.P_unit_per_parcel ?? 1; // packages per parcel (new, default 1)

                // Recompute stock_units: p_unit × P_unit_per_parcel × parcels
                const parcels = item.stock_parcels ?? 0;
                item.stock_units = item.p_unit * item.P_unit_per_parcel * parcels;

                // Clean up old fields
                delete item.item_size;
                delete item.item_type_id;
                delete item.packaging_qty;
            });
        });
        // v6: Add contact details to business_config
        this.version(6).stores({
            business_config: '++id, &name, is_active', // No index change needed, but explicit update
        }).upgrade(async (tx) => {
            const config = tx.table('business_config');
            await config.toCollection().modify((b: any) => {
                b.address = b.address || '';
                b.contact = b.contact || '';
                b.email = b.email || '';
                b.website = b.website || '';
                b.gstin = b.gstin || '';
            });
        });

        // v7: Add variant_params_3 (Item Size/Dimensions)
        this.version(7).stores({
            items: '++id, item_name, category, product_id, brand_id, vertical_id, packing_unit_id, variant_param1_id, variant_param2_id, variant_param3_id, createdAt',
            variant_params_3: '++id, name, product_id',
        }).upgrade(async (tx) => {
            // Set variant_param3_id to undefined for existing items
            const items = tx.table('items');
            await items.toCollection().modify((item: any) => {
                item.variant_param3_id = item.variant_param3_id ?? undefined;
            });
        });
    }
}

export const db = new VisualOSDatabase();

// ─── Seed Data ──────────────────────────────────────────────────

export async function seedReferenceData() {
    // Only seed if verticals table is empty
    const count = await db.verticals.count();
    if (count > 0) return;

    console.log('[VisualOS] Seeding reference data...');

    // Verticals
    const stationeryId = await db.verticals.add({ name: 'Stationery' });
    const cutleryId = await db.verticals.add({ name: 'Cutlery' });
    const fireworksId = await db.verticals.add({ name: 'Fireworks' });
    const fmcgId = await db.verticals.add({ name: 'FMCG' });

    // Brands
    await db.brands.bulkAdd([
        { name: 'Reegal', vertical_id: stationeryId as number },
        { name: 'Prime', vertical_id: stationeryId as number },
        { name: 'Supreme', vertical_id: fireworksId as number },
        { name: 'Fancy', vertical_id: fireworksId as number },
        { name: 'Kings AK', vertical_id: fireworksId as number },
    ]);

    // Products (generic names tied to categories)
    await db.products.bulkAdd([
        // Stationery
        { name: 'Notebooks', category: 'Stationery', vertical_id: stationeryId as number },
        { name: 'Pens', category: 'Stationery', vertical_id: stationeryId as number },
        { name: 'Pencils', category: 'Stationery', vertical_id: stationeryId as number },
        { name: 'Erasers', category: 'Stationery', vertical_id: stationeryId as number },
        { name: 'Rulers', category: 'Stationery', vertical_id: stationeryId as number },
        { name: 'Sharpeners', category: 'Stationery', vertical_id: stationeryId as number },
        // Fireworks
        { name: 'Sky Shot', category: 'Fireworks', vertical_id: fireworksId as number },
        { name: 'Flower Pot', category: 'Fireworks', vertical_id: fireworksId as number },
        { name: 'Sparklers', category: 'Fireworks', vertical_id: fireworksId as number },
        { name: 'Crackers', category: 'Fireworks', vertical_id: fireworksId as number },
        // Cutlery
        { name: 'Plates', category: 'Cutlery', vertical_id: cutleryId as number },
        { name: 'Glasses', category: 'Cutlery', vertical_id: cutleryId as number },
        { name: 'Spoons', category: 'Cutlery', vertical_id: cutleryId as number },
        // FMCG
        { name: 'Soaps', category: 'FMCG', vertical_id: fmcgId as number },
        { name: 'Detergents', category: 'FMCG', vertical_id: fmcgId as number },
    ]);

    // Packing units (static multipliers)
    await db.packing_units.bulkAdd([
        { unit_name: 'piece', multiplier: 1 },
        { unit_name: 'pair', multiplier: 2 },
        { unit_name: 'half-dozen', multiplier: 6 },
        { unit_name: 'dozen', multiplier: 12 },
        { unit_name: 'box-5', multiplier: 5 },
        { unit_name: 'box-10', multiplier: 10 },
        { unit_name: 'box-20', multiplier: 20 },
        { unit_name: 'bundle-10', multiplier: 10 },
        { unit_name: 'bundle-12', multiplier: 12 },
        { unit_name: 'carton-50', multiplier: 50 },
        { unit_name: 'carton-100', multiplier: 100 },
    ]);

    // Variant Param 1 — Sizes (seeded per product where applicable)
    const notebooks = await db.products.where('name').equals('Notebooks').first();
    const skyShot = await db.products.where('name').equals('Sky Shot').first();
    const plates = await db.products.where('name').equals('Plates').first();
    const sparklers = await db.products.where('name').equals('Sparklers').first();

    const vp1ToSeed: { name: string; product_id?: number }[] = [
        // Generic sizes (no product_id = usable across all products)
        { name: 'Big' },
        { name: 'Small' },
        { name: 'Deluxe' },
        { name: 'Special' },
    ];
    if (notebooks?.id) {
        vp1ToSeed.push(
            { name: 'A4', product_id: notebooks.id },
            { name: 'A5', product_id: notebooks.id },
            { name: 'Jumbo', product_id: notebooks.id },
            { name: 'Long', product_id: notebooks.id },
        );
    }
    if (skyShot?.id) {
        vp1ToSeed.push(
            { name: '12-shot', product_id: skyShot.id },
            { name: '25-shot', product_id: skyShot.id },
            { name: '50-shot', product_id: skyShot.id },
        );
    }
    if (plates?.id) {
        vp1ToSeed.push(
            { name: '6 inch', product_id: plates.id },
            { name: '8 inch', product_id: plates.id },
            { name: '10 inch', product_id: plates.id },
        );
    }
    if (sparklers?.id) {
        vp1ToSeed.push(
            { name: '10cm', product_id: sparklers.id },
            { name: '15cm', product_id: sparklers.id },
            { name: '30cm', product_id: sparklers.id },
        );
    }
    if (vp1ToSeed.length > 0) {
        await db.variant_params_1.bulkAdd(vp1ToSeed);
    }

    // Variant Param 2 — Line types / sub-variants
    const vp2ToSeed: { name: string; product_id?: number }[] = [
        { name: 'Plain' },
        { name: 'Ruled' },
    ];
    if (notebooks?.id) {
        vp2ToSeed.push(
            { name: 'Square Line', product_id: notebooks.id },
            { name: '4 Line', product_id: notebooks.id },
            { name: 'Single Line', product_id: notebooks.id },
            { name: 'Interleaf', product_id: notebooks.id },
        );
    }
    if (vp2ToSeed.length > 0) {
        await db.variant_params_2.bulkAdd(vp2ToSeed);
    }

    // Variant Param 3 — Item Size/Dimensions
    const flowerPot = await db.products.where('name').equals('Flower Pot').first();
    const vp3ToSeed: { name: string; product_id?: number }[] = [
        // Generic sizes (usable across products)
        { name: 'Big' },
        { name: 'Small' },
        { name: 'Special' },
        { name: 'Deluxe' },
    ];
    if (notebooks?.id) {
        vp3ToSeed.push(
            { name: 'A4', product_id: notebooks.id },
            { name: 'A5', product_id: notebooks.id },
            { name: 'Long (A3)', product_id: notebooks.id },
            { name: 'Jumbo', product_id: notebooks.id },
        );
    }
    if (flowerPot?.id) {
        vp3ToSeed.push(
            { name: 'Big', product_id: flowerPot.id },
            { name: 'Small', product_id: flowerPot.id },
            { name: 'Special', product_id: flowerPot.id },
        );
    }
    if (vp3ToSeed.length > 0) {
        await db.variant_params_3.bulkAdd(vp3ToSeed);
    }

    // Business configs
    await db.business_config.bulkAdd([
        {
            name: 'R.S. Enterprises',
            address: '123 Market Road, City',
            contact: '9876543210',
            email: 'info@rsent.com',
            is_active: true,
            enabled_features: ['inventory', 'billing', 'accounting', 'media', 'prospects', 'pricelist', 'routes']
        },
        { name: 'Kartik Traders', is_active: false, enabled_features: ['inventory', 'billing', 'accounting'] },
        { name: 'Kailash Cutlery', is_active: false, enabled_features: ['inventory', 'billing', 'accounting'] },
    ]);

    console.log('[VisualOS] ✅ Reference data seeded');
}

// ─── Request Persistent Storage ─────────────────────────────────

export async function requestPersistence(): Promise<boolean> {
    if (navigator.storage && navigator.storage.persist) {
        const isPersisted = await navigator.storage.persist();
        console.log(`[VisualOS] Storage persistence: ${isPersisted ? '✅ Guaranteed' : '⚠️ Best-effort'}`);
        return isPersisted;
    }
    console.warn('[VisualOS] StorageManager API not available');
    return false;
}

export async function getStorageEstimate(): Promise<{ usage: number; quota: number } | null> {
    if (navigator.storage && navigator.storage.estimate) {
        const estimate = await navigator.storage.estimate();
        return { usage: estimate.usage ?? 0, quota: estimate.quota ?? 0 };
    }
    return null;
}

// Auto-initialize on load
requestPersistence();
seedReferenceData();
