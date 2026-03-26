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
    sort_order?: number;
    icon_base64?: string | null;
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
    keyword_id?: string | null;
    reorder_threshold: number;
    purchase_price_unit: number;
    // Thumbnail stored as base64 WebP (~5-10KB)
    thumbnail_base64?: string | null;
    // Marketing images for catalogue/sharing
    marketing_images?: { type: 'image' | 'video'; data: string; width?: number; height?: number }[] | null;
    // Relationships
    product_id?: number | null;
    brand_id?: number | null;
    vertical_id?: number | null;
    packing_unit_id?: number | null;
    variant_param1_id?: number | null;
    variant_param2_id?: number | null;
    variant_param3_id?: number | null;
    // Stock
    p_unit: number;
    p_unit_per_parcel: number;
    stock_parcels: number;
    stock_units: number;
    // Pricing
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
    brand_id?: number | null;
    vertical_id?: number | null;
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
    height_meters?: number | null; // real-world height (for 3D volume calculations)
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
    bounding_box?: {                    // NEW: 3D Volume Detection
      min: [number, number, number];    // [x, y, z]
      max: [number, number, number];    // [x, y, z]
    } | null;
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
    pos_x?: number | null;              // NEW: Global 3D X coordinate
    pos_y?: number | null;              // NEW: Global 3D Y (Height/Stacking) coordinate
    pos_z?: number | null;              // NEW: Global 3D Z (Depth) coordinate
    dim_w?: number | null;              // NEW: Parcel/Stack width
    dim_d?: number | null;              // NEW: Parcel/Stack depth
    dim_h?: number | null;              // NEW: Parcel/Stack height
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
    created_at?: string | null;
}

export interface SalesOrder {
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
    credit_amount: number;
    payment_status: 'unpaid' | 'partial' | 'paid';
    is_paid: boolean;
    due_date?: string | null;
    notes?: string | null;
    end_of_sale?: boolean | null;
    created_at: string;
}

// Backward compatibility alias
export type Order = SalesOrder;

export interface SalesOrderItem {
    id: number;
    sales_order_id: number;
    item_id: number;
    item_name: string;
    item_name_SKU: string;
    sold_units: number;
    qty: number;
    unit_price: number;
    discount: number;
    total: number;
}

// Backward compatibility alias
export type OrderItem = SalesOrderItem;

export interface Bill {
    id: number;
    firm_id: string;
    bill_number: string;
    created_at: string;
    prospect_id?: number | null;
    grand_total: number;
    paid_amount: number;
    notes?: string | null;
}

// ─── Suppliers (global — no firm_id) ──────────────────────────────

export interface Supplier {
    id: number;
    name: string;
    contact?: string | null;
    address?: string | null;
    notes?: string | null;
}

export interface PurchaseOrder {
    id: number;
    firm_id: string;
    purchase_log_id?: number | null;
    purchase_rate: number;
}

export interface PurchaseLog {
    id: number;
    purchase_date: string;
    supplier_id: number;
    shipment_date?: string | null;
    total_amount: number;
    item_keyword: string;
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

export interface VariantParams1 {
    id: number;
    name: string;
}

export interface VariantParams2 {
    id: number;
    name: string;
}

export interface VariantParams3 {
    id: number;
    name: string;
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
    reason_response?: string | null;
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

export interface ItemMedia {
    id: number;
    firm_id: string;
    item_id: number;
    item_keyword?: string | null;
    media_role: 'primary' | 'gallery' | 'video';
    data_base64: string;  // Base64 encoded image data (watermarked & compressed)
    filename: string;
    mime_type: string;
    file_size_kb?: number;
    width?: number;
    height?: number;
    is_watermarked: boolean;
    created_at: string;
}

// ─── Financials ────────────────────────────────────────────────────

export interface CostType {
    id: number;
    cost_type_name: string;
}

export interface Cost {
    id: number;
    firm_id: string;
    cost_type_id: number;
    sales_order_id?: number | null;
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
    product_id?: number | null;
    product_name?: string | null;
    vertical_id?: number | null;
    vertical_name?: string | null;
    brand_id?: number | null;
    brand_name?: string | null;
}


// --- Storage Packages (Packaging System) -------------------------------------

// export type PackageType = 
//     | 'gunny_bag' 
//     | 'cardboard_box' 
//     | 'carry_bag' 
//     | 'open_tying' 
//     | 'crate' 
//     | 'sack' 
//     | 'polythene_bundle' 
//     | 'other';

export interface StoragePackage {
    id: number;
    firm_id: string;
    zone_id?: number | null;
    slot_id?: number | null;
    package_type: PackageType;
    package_label?: string | null;
    description?: string | null;
    vertical_id?: number | null;
    created_at: string;
    deleted_at?: string | null;
}

export interface PackageItem {
    id: number;
    package_id: number;
    item_id: number;
    parcel_count: number;
    unit_count?: number | null;
    location_id?: number | null;
    notes?: string | null;
    created_at: string;
    // Joined fields
    item_name?: string;
    brand_name?: string;
    retail_price_unit?: number;
}

// ─── NEW: Stock & Pricing Tables ───────────────────────────────────

export interface Category {
    id: number;
    name: string;
}

export interface StockDetails {
    id: number;
    item_id: number;
    unit_multiplier_name: string;
    unit_multiplier: number;
    pack_multiplier: number;
    retail_unit_price: number;
    wholesale_unit_price: number;
    stock_type: boolean;
    parcel_id?: number | null;
    last_updated: string;
}

export interface TotalStock {
    id: number;
    item_keyword: string;
    total_units: number;
    updated_at: string;
}

export interface ParcelingDetails {
    id: number;
    packaging_type: string;
    location?: string | null;
}

export interface WarehouseLayout {
    id: number;
    firm_id: string;
    name: string;
    floors: number;
    sections_per_floor: number;
    rows_per_section: number;
    cols_per_row: number;
    created_at: string;
}

export interface WarehouseCell {
    id: number;
    warehouse_id: number;
    floor: number;
    section: string;
    row_num: number;
    col_num: number;
    item_id?: number | null;
    parcel_count: number;
    notes?: string | null;
}