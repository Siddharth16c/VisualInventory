/**
 * Supabase Database Types
 * These mirror the PostgreSQL schema created in the Supabase SQL editor.
 * firm_id is a UUID from the `firms` table, injected automatically by the DAL.
 *
 * CHANGELOG:
 * - Added: keyword_id, reorder_threshold, purchase_price_unit, tsvector_search to Item
 * - Added: StockMovement interface
 * - Added: StoragePlace, StorageZone, StorageSlot, ItemLocation interfaces (3-layer location system)
 * - Added: ItemSearchFilters, ItemSearchResult utility types for billing search UI
 * - Added: StagnantStockItem, MovementVelocityItem for analytics
 * - Added: LowStockItem for restock signals
 * - Added: StoragePackage, PackageItem interfaces (packaging system)
 * - Added: PackageType union type for static container names
 * - Added: width_meters, depth_meters to StoragePlace (dynamic canvas scaling)
 * - Preserved: All existing interfaces unchanged
 */

export type UserRole = 'master_admin' | 'store_owner_a' | 'store_owner_b';

export type MovementType = 'sale' | 'purchase' | 'transfer' | 'loss' | 'adjustment' | 'return';

export type StoragePlaceType = 'shop' | 'warehouse' | 'godown';

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
    // New fields — added in Task 1 schema migration
    keyword_id?: string | null;          // deterministic SKU identifier — barcode replacement
    reorder_threshold: number;           // triggers restock signal when stock_parcels <= this
    purchase_price_unit: number;         // cost price per unit for margin tracking
    // Existing relationships
    product_id?: number | null;
    brand_id?: number | null;
    vertical_id?: number | null;
    packing_unit_id?: number | null;
    variant_param1_id?: number | null;
    variant_param2_id?: number | null;
    variant_param3_id?: number | null;
    // Stock formula: stock_units = p_unit × p_unit_per_parcel × stock_parcels — NEVER BREAK
    p_unit: number;
    p_unit_per_parcel: number;
    stock_parcels: number;
    stock_units: number;                 // computed/maintained value
    retail_price_unit: number;
    retail_price_container: number;
    wholesale_price_unit: number;
    wholesale_price_container: number;
    mrp: number;
    metadata?: Record<string, any> | null;
    created_at: string;
    updated_at?: string | null;
    subcategory_id?: number | null;
}

/** Lightweight type for billing search results — avoids loading full Item */
export interface ItemSearchResult {
    id: number;
    item_name: string;
    keyword_id?: string | null;
    category: string;
    brand_id?: number | null;
    vertical_id?: number | null;
    stock_parcels: number;
    stock_units: number;
    retail_price_unit: number;
    retail_price_container: number;
    wholesale_price_unit: number;
    wholesale_price_container: number;
    packaging_type?: string | null;      // "gunny bag", "brown box medium"
    packaging_tags?: string[] | null;
    mrp: number;
    p_unit: number;
    p_unit_per_parcel: number;
}

/** Filters for multi-filter billing search UI */
export interface ItemSearchFilters {
    query?: string;         // full-text search across item_name + keyword_id
    brand_id?: number;
    vertical_id?: number;
    subcategory_id?: number; // Added for T6s subcategory support
    category?: string;
    limit?: number;
}

/** Restock signal item */
export interface LowStockItem {
    id: number;
    item_name: string;
    keyword_id?: string | null;
    stock_parcels: number;
    reorder_threshold: number;
    brand_id?: number | null;
    vertical_id?: number | null;
}

// ─── Stock Movements (NEW) ─────────────────────────────────────────

export interface StockMovement {
    id: number;
    firm_id: string;
    item_id: number;
    movement_type: MovementType;
    qty_change: number;              // negative = out, positive = in (unit level)
    parcel_change?: number | null;   // negative = out, positive = in (parcel level)
    from_location_id?: number | null; // storage_slots.id
    to_location_id?: number | null;   // storage_slots.id
    order_id?: number | null;
    purchase_order_id?: number | null;
    notes?: string | null;
    created_at: string;
    created_by?: string | null;      // auth.users.id
}

/** Payload for logging a movement — used in DAL.stock_movements.log() */
export interface StockMovementPayload {
    item_id: number;
    movement_type: MovementType;
    qty_change: number;
    parcel_change?: number;
    from_location_id?: number;
    to_location_id?: number;
    order_id?: number;
    purchase_order_id?: number;
    notes?: string;
}

// ─── 3-Layer Location System (NEW) ────────────────────────────────

/**
 * Layer 1 — Physical building/store
 * Examples: "KT Shop", "Shop N2", "Warehouse"
 */
export interface StoragePlace {
    id: number;
    firm_id: string;
    place_name: string;       // "KT Shop"
    place_slug: string;       // "KT" — used in location labels
    place_type: StoragePlaceType;
    floor_count: number;
    width_meters?: number | null;  // real-world width for accurate 3D canvas scaling
    depth_meters?: number | null;  // real-world depth
    top_view_image_url?: string | null;  // photo/sketch of the building
    notes?: string | null;
    deleted_at?: string | null;          // soft delete
    created_at: string;
}

/**
 * Layer 2 — Named section within a place/floor
 * Examples: "Front Section", "Back Wall", "Near Door"
 * No grid required — works for completely unstructured/chaotic stores
 */
export interface StorageZone {
    id: number;
    firm_id: string;
    place_id: number;
    floor_num: number;        // 0 = ground floor
    zone_name: string;        // "Front Section"
    zone_slug: string;        // "FR"
    zone_label?: string | null; // auto-generated via DB trigger: "KT-F0-FR"
    polygon_coords?: number[][] | null;  // [[x,y],[x,y],...] for Three.js rendering
    zone_color?: string | null;          // hex color for 3D highlight
    notes?: string | null;
    deleted_at?: string | null;          // soft delete
}

/**
 * Layer 3 — Named spot within a zone
 * Free-text, staff names them however makes sense: "Stack A", "Corner Pile", "Near Blue Door"
 * Capacity optional — null = chaotic/unknown (fine for unstructured stores)
 */
export interface StorageSlot {
    id: number;
    firm_id: string;
    zone_id: number;
    slot_name: string;        // "Stack A"
    slot_label?: string | null; // auto-generated via DB trigger: "KT-F0-FR-STACK_A"
    order_index?: number | null; // z-level: 0 = floor, 1 = on top of 0, etc.
    capacity_parcels?: number | null;
    notes?: string | null;
    deleted_at?: string | null;          // soft delete
}

/**
 * Item ↔ Slot assignment
 * One item can be in multiple slots (split stock across locations)
 * is_primary = where to send billing staff to find it
 */
export interface ItemLocation {
    id: number;
    firm_id: string;
    item_id: number;
    slot_id: number;
    parcel_count: number;
    is_primary: boolean;
    packaging_type?: string | null;      // "gunny bag", "brown box medium"
    packaging_tags?: string[] | null;    // ["fragile", "seasonal", "holi"]
    last_verified_at?: string | null;   // when staff last confirmed position
    updated_at: string;
    deleted_at?: string | null;          // soft delete
}

/** Full location path — used in billing UI to show "where is this item" */
export interface ItemLocationFull extends ItemLocation {
    storage_slots?: StorageSlot & {
        storage_zones?: StorageZone & {
            storage_places?: StoragePlace;
        };
    };
}

// ─── Packaging System ────────────────────────────────────────────────────────

/**
 * Static container types for storage_packages.
 * These represent physical containers used to store grouped seasonal/custom stock.
 */
export type PackageType =
    | 'gunny_bag'       // Jute/cloth sack (ideal for dry goods, pulses, fireworks)
    | 'cardboard_box'   // Standard brown box
    | 'carry_bag'       // Plastic/polythene bag
    | 'open_tying'      // Items tied together without a container
    | 'crate'           // Wooden or plastic crate
    | 'sack'            // Large sack (rice bags, etc.)
    | 'polythene_bundle'// Wrapped in polythene/plastic film
    | 'wooden_crate'    // Heavy-duty wooden crate
    | 'other';          // Custom / unlisted type

/** Human-readable labels for PackageType dropdown */
export const PACKAGE_TYPE_LABELS: Record<PackageType, string> = {
    gunny_bag: 'Gunny Bag',
    cardboard_box: 'Cardboard Box',
    carry_bag: 'Carry Bag',
    open_tying: 'Open Tying (Bundle)',
    crate: 'Crate',
    sack: 'Sack',
    polythene_bundle: 'Polythene Bundle',
    wooden_crate: 'Wooden Crate',
    other: 'Other',
};

/**
 * Layer 4 — A physical grouping/container for items within a zone/slot.
 * Used for custom/seasonal stock bundling (e.g. "Holi Pichkari Set", "Diwali Gift Box")
 */
export interface StoragePackage {
    id: number;
    firm_id: string;
    zone_id?: number | null;        // which zone it's stored in
    slot_id?: number | null;        // optional slot within the zone
    package_type: PackageType;      // static enum — see above
    package_label?: string | null;  // "Holi Pichkari Large", "Fancy Fireworks Supreme"
    description?: string | null;    // free text notes
    vertical_id?: number | null;    // categorization by vertical
    created_at: string;
    deleted_at?: string | null;     // soft delete
}

/** An item inside a storage package, with quantity */
export interface PackageItem {
    id: number;
    package_id: number;
    item_id: number;
    parcel_count: number;
    unit_count?: number | null;
    location_id?: number | null;    // which item_location this draws from
    notes?: string | null;
    created_at: string;
    // Joined fields (when fetched with getWithItems)
    item_name?: string;
    brand_name?: string;
    vertical_name?: string;
    retail_price_unit?: number;
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
    notes?: string | null;
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
    area_towns: string[];
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
    next_visit_plan?: string | null;
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
    storage_path: string;
    filename: string;
    mime_type: string;
    created_at: string;
    subcategory_id?: number | null;
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

// ─── Analytics utility types ───────────────────────────────────────

export interface StagnantStockItem {
    id: number;
    item_name: string;
    keyword_id?: string | null;
    stock_parcels: number;
    updated_at: string;
    vertical_id?: number | null;
    brand_id?: number | null;
}

export interface MovementVelocityItem {
    name: string;
    keyword_id: string;
    total_out: number;   // total parcels moved out in date range
}

export interface BrandMetric {
    brand_id: number;
    brand_name: string;
    vertical_id: number;
    vertical_name: string;
    revenue: number;
    order_count: number;
}

export interface AccountFlow {
    revenue: number;
    collected: number;
    due: number;
    procurement: number;
    opex: number;
    total_cost: number;
    profit: number;
    margin: number;
}

export interface VerticalSummary {
    vertical_id: number;
    name: string;
    revenue: number;
}

export interface Subcategory {
    id: number;
    firm_id: string;
    vertical_id?: number | null;    // null = cross-vertical (rare)
    name: string;                   // "Notebooks", "Pens", "Crackers"
    slug?: string | null;           // auto-generated: "notebooks"
    description?: string | null;
    created_at: string;
}

// Full chain — returned by item_full_chain view and DAL.items.search()
export interface ItemFullChain {
    item_id: number;
    firm_id: string;
    item_name: string;
    keyword_id?: string | null;
    stock_parcels: number;
    stock_units: number;
    retail_price_unit: number;
    retail_price_container: number;
    wholesale_price_unit: number;
    wholesale_price_container: number;
    mrp: number;
    reorder_threshold: number;
    product_id?: number | null;
    product_name?: string | null;
    subcategory_id?: number | null;
    subcategory_name?: string | null;   // COALESCE(item subcat, product subcat)
    vertical_id?: number | null;
    vertical_name?: string | null;
    brand_id?: number | null;
    brand_name?: string | null;
}