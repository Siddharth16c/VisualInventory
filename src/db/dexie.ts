import Dexie, { type Table } from 'dexie';

// ─── Type Definitions ───────────────────────────────────────────

export interface Product {
    id?: number;
    item_name: string;
    category: string;
    product_name: string;
    type: string;
    brand_id?: number;
    vertical_id?: number;
    mrp: number;
    selling_price: number;
    unit: string;
    stock_qty: number;
    metadata?: Record<string, any>; // Dynamic fields for Stationery/FMCG domains
    createdAt: string;
    updatedAt?: string;
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
    status: 'pending' | 'dispatched' | 'delivered' | 'cancelled';
    subtotal: number;
    tax_amount: number;
    discount_amount: number;
    grand_total: number;
    due_amount: number;
    paid_amount: number;
    notes?: string;
    createdAt: string;
}

export interface OrderItem {
    id?: number;
    order_id: number;
    product_id: number;
    product_name: string;
    qty: number;
    unit_price: number;
    discount: number;
    total: number;
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
    product_id: number;
    media_role: 'primary' | 'gallery' | 'flipbook';
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
    product_ids: number[];
    created_at: string;
}

export interface Vertical {
    id?: number;
    name: string;
}

export interface Brand {
    id?: number;
    name: string;
    vertical_id: number;
}

// ─── Database Class ─────────────────────────────────────────────

export class VisualOSDatabase extends Dexie {
    products!: Table<Product>;
    prospects!: Table<Prospect>;
    orders!: Table<Order>;
    order_items!: Table<OrderItem>;
    travel_records!: Table<TravelRecord>;
    visits!: Table<Visit>;
    product_media!: Table<ProductMedia>;
    costs!: Table<Cost>;
    account!: Table<Account>;
    marketing_catalogues!: Table<MarketingCatalogue>;
    verticals!: Table<Vertical>;
    brands!: Table<Brand>;

    constructor() {
        super('VisualOS_DB');

        this.version(1).stores({
            products: '++id, item_name, category, product_name, type, brand_id, vertical_id, createdAt',
            prospects: '++id, prospectname, area_town, contact, business_type, route_id',
            orders: '++id, prospect_id, order_date, status, due_amount, createdAt',
            order_items: '++id, order_id, product_id',
            travel_records: '++id, travel_date, route_id, is_ideal',
            visits: '++id, prospect_id, visit_date, route_id',
            product_media: '++id, product_id, media_role',
            costs: '++id, cost_type, business_type, cost_factor_id, order_id, date',
            account: '++id, month_year',
            marketing_catalogues: '++id, title, created_at',
            verticals: '++id, &name',
            brands: '++id, name, vertical_id',
        });
    }
}

export const db = new VisualOSDatabase();

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

// Auto-request persistence on load
requestPersistence();
