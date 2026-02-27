/**
 * Supabase Database Types
 * These mirror the PostgreSQL schema created in the Supabase SQL editor.
 * firm_id is a UUID from the `firms` table, injected automatically by the DAL.
 */

export type UserRole = 'master_admin' | 'store_owner_a' | 'store_owner_b';

export interface Firm {
    id: string; // uuid
    name: string;
    slug: string;
    address?: string | null;
    gstin?: string | null;
    contact?: string | null;
    email?: string | null;
    website?: string | null;
    enabled_features: Record<string, boolean>;
    created_at: string;
}

export interface FirmUser {
    id: string; // uuid
    user_id: string; // uuid — auth.users.id
    firm_id: string; // uuid — firms.id
    role: UserRole;
    created_at: string;
}

// ─── Reference Data ────────────────────────────────────────────────

export interface Vertical {
    id: number;
    firm_id: string;
    name: string;
}

export interface Brand {
    id: number;
    firm_id: string;
    vertical_id?: number | null;
    name: string;
}

export interface Product {
    id: number;
    firm_id: string;
    vertical_id?: number | null;
    name: string;
    category: string;
}

export interface PackingUnit {
    id: number;
    firm_id: string;
    unit_name: string;
    multiplier: number;
}

export interface VariantParam {
    id: number;
    firm_id?: string | null;
    product_id?: number | null;
    name: string;
}

// ─── Core Inventory ────────────────────────────────────────────────

export interface Item {
    id: number;
    firm_id: string;
    item_name: string;
    category: string;
    product_id?: number | null;
    brand_id?: number | null;
    vertical_id?: number | null;
    packing_unit_id?: number | null;
    variant_param1_id?: number | null;
    variant_param2_id?: number | null;
    variant_param3_id?: number | null;
    p_unit: number;
    p_unit_per_parcel: number;
    stock_parcels: number;
    stock_units: number;
    retail_price_unit: number;
    retail_price_container: number;
    wholesale_price_unit: number;
    wholesale_price_container: number;
    mrp: number;
    metadata?: Record<string, any> | null;
    created_at: string;
    updated_at?: string | null;
}

// ─── CRM & Orders ──────────────────────────────────────────────────

export interface Prospect {
    id: number;
    firm_id: string;
    prospectname: string;
    area_town: string;
    contact: string;
    business_type: string;
    route_id?: number | null;
    notes?: string | null;
    created_at: string;
}

export interface Order {
    id: number;
    firm_id: string;
    prospect_id: number;
    prospect_name: string;
    order_date: string;
    pricing_mode: 'retail' | 'wholesale';
    status: 'quote' | 'pending' | 'dispatched' | 'delivered' | 'cancelled';
    subtotal: number;
    tax_amount: number;
    discount_amount: number;
    grand_total: number;
    paid_amount: number;
    due_amount: number;
    payment_status: 'unpaid' | 'partial' | 'paid';
    due_date?: string | null;
    notes?: string | null;
    created_at: string;
}

export interface OrderItem {
    id: number;
    order_id: number;
    item_id: number;
    item_name: string;
    qty: number;
    unit_price: number;
    discount: number;
    total: number;
}

export interface Bill {
    id: number;
    firm_id: string;
    order_id: number;
    bill_number: string;
    business_name: string;
    print_format: 'a4' | 'thermal' | 'rawbt';
    created_at: string;
}

// ─── Suppliers (global — no firm_id) ──────────────────────────────

export interface Supplier {
    id: number;
    name: string;
    contact?: string | null;
    address?: string | null;
    vertical_id?: number | null;
    notes?: string | null;
    created_at: string;
}

export interface PurchaseOrder {
    id: number;
    firm_id: string;
    supplier_id: number;
    order_date: string;
    status: 'ordered' | 'received' | 'partial' | 'cancelled';
    subtotal: number;
    freight_cost: number;
    packaging_cost: number;
    total_cost: number;
    notes?: string | null; // large text remarks
    created_at: string;
}

export interface PurchaseOrderItem {
    id: number;
    purchase_order_id: number;
    item_id?: number | null;
    item_name: string;
    qty: number;
    purchase_price_unit: number;
    total: number;
}

// ─── Routes & Visits ──────────────────────────────────────────────

export interface Route {
    id: number;
    firm_id: string;
    name: string;
    description?: string | null;
    area_towns: string[]; // array of town names
    color_tag: string;
    created_at: string;
}

export interface Visit {
    id: number;
    firm_id: string;
    prospect_id: number;
    route_id?: number | null;
    visit_date: string;
    outcome?: string | null;
    notes?: string | null;
    next_visit_plan?: string | null; // ISO date for future reminder
    is_future_plan: boolean;
    created_at: string;
}

export interface TravelRecord {
    id: number;
    firm_id: string;
    travel_date: string;
    route_id?: number | null;
    route_name?: string | null;
    is_ideal: boolean;
    notes?: string | null;
}

// ─── Media ────────────────────────────────────────────────────────

export interface ProductMedia {
    id: number;
    firm_id: string;
    item_id: number;
    media_role: 'primary' | 'gallery' | 'flipbook' | 'gif' | 'video';
    storage_path: string; // Supabase Storage path
    filename: string;
    mime_type: string;
    created_at: string;
}

// ─── Financials ────────────────────────────────────────────────────

export interface Cost {
    id: number;
    firm_id: string;
    cost_type: string;
    cost_factor_id?: number | null;
    order_id?: number | null;
    purchase_order_id?: number | null;
    amount: number;
    description?: string | null;
    date: string;
}

export interface Account {
    id: number;
    firm_id: string;
    month_year: string;
    total_revenue: number;
    total_cost: number;
    profit: number;
    notes?: string | null;
}

export interface MarketingCatalogue {
    id: number;
    firm_id: string;
    title: string;
    item_ids: number[];
    created_at: string;
}
