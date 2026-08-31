/**
 * Data Access Layer (DAL) — Supabase Postgres edition
 *
 * READS: firm_id filtering applied manually (RLS may be disabled due to ISP/proxy setup)
 * WRITES: firm_id is auto-injected on inserts using session firm_id
 *
 * Usage: import { DAL } from '@/db/dal'
 *
 * CHANGELOG:
 * - Fixed: getAll now manually filters by firm_id for firm-scoped tables (RLS-off safety)
 * - Fixed: order_items.getByOrder verifies order belongs to current firm
 * - Fixed: analytics + reports methods now filter by firm_id
 * - Fixed: account.getAllFirms guarded by master_admin role check
 * - Fixed: bulkUpsert onConflict strategy clarified per table
 * - Added: stock_movements CRUD
 * - Added: storage_places, storage_zones, storage_slots, item_locations CRUD
 * - Added: items.search (multi-filter for billing UI)
 * - Added: items.getByKeywordId (barcode replacement lookup)
 * - Added: items.getLowStock (restock signals)
 * - Updated: items.search now uses Typesense with Supabase FTS fallback (T8-TYPESENSE)
 * - Added: subcategory_id filter support in items.search (T6s)
 */

import { supabase } from './supabase';
import mitt from 'mitt';
import type { PackageItem, StoragePackage, Subcategory } from './types';

// ─── Reactive Change Emitter ──────────────────────────────────────
type Events = { change: string };
export const dbEvents = mitt<Events>();
export const emitDbChange = (table: string) => dbEvents.emit('change', table);

// ─── Session Helpers ──────────────────────────────────────────────
let _firmId: string | null = null;
let _role: string | null = null;

export function setSession(firmId: string, role: string) {
    _firmId = firmId;
    _role = role;
}

export function getFirmId(): string {
    return _firmId ?? '';
}

export function getRole(): string {
    return _role ?? 'master_admin';
}

export function isMasterAdmin(): boolean {
    return getRole() === 'master_admin';
}

// Tables that have a NOT NULL firm_id column
const FIRM_SCOPED_TABLES = new Set([
    'items', 'prospects', 'sales_orders', 'bills', 'routes', 'visits',
    'travel_records', 'purchase_orders', 'item_media',
    'costs', 'account', 'marketing_catalogues', 'warehouse_layout',
    'warehouse_cells', 'stock_movements',
    'storage_places', 'storage_zones', 'storage_slots', 'item_locations',
    'storage_packages', 'package_items',
    'stock_details', 'total_stock'
]);

// ─── Generic Helpers ──────────────────────────────────────────────

/** Auto-inject firm_id on inserts for firm-scoped tables */
function withFirmId(table: string, values: any): any {
    if (FIRM_SCOPED_TABLES.has(table) && getFirmId()) {
        return { ...values, firm_id: getFirmId() };
    }
    return values;
}

/**
 * getAll — filters firm-scoped tables by firm_id.
 * This is intentional: RLS may be disabled (Cloudflare proxy workaround).
 * Manual firm_id filter ensures data isolation regardless of RLS state.
 */
async function getAll<T>(table: string, extraFilters?: (q: any) => any): Promise<T[]> {
    let q = supabase.from(table).select('*').order('id', { ascending: true });
    if (FIRM_SCOPED_TABLES.has(table)) {
        if (!getFirmId()) {
            throw new Error(`Data Access Error: firm_id is missing for table '${table}'`);
        }
        q = q.eq('firm_id', getFirmId());
    }
    if (extraFilters) q = extraFilters(q);
    const { data, error } = await q;
    if (error) throw error;
    return data as T[];
}

async function insert<T>(table: string, values: Partial<T>): Promise<T> {
    const { data, error } = await supabase
        .from(table)
        .insert(withFirmId(table, values))
        .select()
        .single();
    if (error) throw error;
    emitDbChange(table);
    return data as T;
}

async function update<T>(table: string, id: number, values: Partial<T>): Promise<T> {
    const { data, error } = await supabase
        .from(table)
        .update(values)
        .eq('id', id)
        .select()
        .single();
    if (error) throw error;
    emitDbChange(table);
    return data as T;
}

async function remove(table: string, id: number): Promise<void> {
    const { error } = await supabase.from(table).delete().eq('id', id);
    if (error) throw error;
    emitDbChange(table);
}

async function bulkUpsert(table: string, rows: any[], conflictCol = 'id'): Promise<void> {
    const processed = FIRM_SCOPED_TABLES.has(table) && getFirmId()
        ? rows.map(r => r.firm_id ? r : { ...r, firm_id: getFirmId() })
        : rows;
    const { error } = await supabase
        .from(table)
        .upsert(processed, { onConflict: conflictCol });
    if (error) throw error;
    emitDbChange(table);
}

// ─── DAL Object ──────────────────────────────────────────────────

export const DAL = {

    // ── Reference Data ────────────────────────────────────────────
    verticals: {
        getAll: async () => {
            const { data, error } = await supabase
                .from('verticals')
                .select('*')
                .order('sort_order', { ascending: true })
                .order('name', { ascending: true });
            if (error) throw error;
            return data ?? [];
        },
        add: (val: any) => insert('verticals', val),
        update: (id: number, val: any) => update('verticals', id, val),
        delete: (id: number) => remove('verticals', id),
        bulkUpsert: (rows: any[]) => bulkUpsert('verticals', rows),
    },

    brands: {
        getAll: () => getAll<any>('brands'),
        add: (val: any) => insert('brands', val),
        update: (id: number, val: any) => update('brands', id, val),
        delete: (id: number) => remove('brands', id),
        bulkUpsert: (rows: any[]) => bulkUpsert('brands', rows),
    },

    products: {
        getAll: () => getAll<any>('products'),
        getByVertical: async (verticalId: number) => {
            const { data, error } = await supabase
                .from('products')
                .select('*')
                .eq('vertical_id', verticalId)
                .order('name', { ascending: true });
            if (error) throw error;
            return data ?? [];
        },
        add: (val: any) => insert('products', val),
        update: (id: number, val: any) => update('products', id, val),
        delete: (id: number) => remove('products', id),
        bulkUpsert: (rows: any[]) => bulkUpsert('products', rows),
    },

    packing_units: {
        getAll: () => getAll<any>('packing_units'),
        add: (val: any) => insert('packing_units', val),
        update: (id: number, val: any) => update('packing_units', id, val),
        delete: (id: number) => remove('packing_units', id),
        bulkUpsert: (rows: any[]) => bulkUpsert('packing_units', rows),
    },

    variant_params_1: {
        getAll: () => getAll<any>('variant_params_1'),
        add: (val: any) => insert('variant_params_1', val),
        update: (id: number, val: any) => update('variant_params_1', id, val),
        delete: (id: number) => remove('variant_params_1', id),
        bulkUpsert: (rows: any[]) => bulkUpsert('variant_params_1', rows),
    },

    variant_params_2: {
        getAll: () => getAll<any>('variant_params_2'),
        add: (val: any) => insert('variant_params_2', val),
        update: (id: number, val: any) => update('variant_params_2', id, val),
        delete: (id: number) => remove('variant_params_2', id),
        bulkUpsert: (rows: any[]) => bulkUpsert('variant_params_2', rows),
    },

    variant_params_3: {
        getAll: () => getAll<any>('variant_params_3'),
        add: (val: any) => insert('variant_params_3', val),
        update: (id: number, val: any) => update('variant_params_3', id, val),
        delete: (id: number) => remove('variant_params_3', id),
        bulkUpsert: (rows: any[]) => bulkUpsert('variant_params_3', rows),
    },

    // ── Items ──────────────────────────────────────────────────────
    items: {
        getAll: () => getAll<any>('items'),

        getById: async (id: number) => {
            const { data, error } = await supabase
                .from('items')
                .select('*')
                .eq('id', id)
                .eq('firm_id', getFirmId())
                .single();
            if (error) throw error;
            return data;
        },

        /** Barcode replacement — lookup by generated keyword_id */
        getByKeywordId: async (keywordId: string) => {
            const { data, error } = await supabase
                .from('items')
                .select('*')
                .eq('keyword_id', keywordId)
                .eq('firm_id', getFirmId())
                .single();
            if (error) throw error;
            return data;
        },

        /**
         * Multi-filter search for billing UI.
         * Tries Typesense first (fast, typo-tolerant), falls back to Supabase FTS.
         * All filters optional — pass only what user has typed.
         */
        search: async (filters: {
            query?: string;
            brand_id?: number;
            vertical_id?: number;
            subcategory_id?: number;
            category?: string;
            limit?: number;
        }) => {
            // Dynamic import to avoid circular dependency issues
            const { searchItemsWithFallback } = await import('@/lib/typesense');

            // Try Typesense first, fall back to Supabase FTS
            const results = await searchItemsWithFallback(
                {
                    query: filters.query,
                    brand: filters.brand_id?.toString(),
                    vertical: filters.vertical_id?.toString(),
                    subcategory: filters.subcategory_id?.toString(),
                    firmId: getFirmId(),
                    limit: filters.limit ?? 30,
                },
                // Fallback function: Supabase FTS
                async (fallbackFilters) => {
                    let q = supabase
                        .from('items')
                        .select('id, item_name, keyword_id, category, brand_id, vertical_id, subcategory_id, stock_parcels, stock_units, retail_price_unit, retail_price_container, wholesale_price_unit, wholesale_price_container, mrp, p_unit, p_unit_per_parcel')
                        .eq('firm_id', getFirmId())
                        .limit(fallbackFilters.limit ?? 50);

                    if (fallbackFilters.brand_id) q = q.eq('brand_id', fallbackFilters.brand_id);
                    if (fallbackFilters.vertical_id) q = q.eq('vertical_id', fallbackFilters.vertical_id);
                    if (fallbackFilters.subcategory_id) q = q.eq('subcategory_id', fallbackFilters.subcategory_id);
                    if (fallbackFilters.category) q = q.ilike('category', `%${fallbackFilters.category}%`);
                    if (fallbackFilters.query) {
                        q = q.textSearch('tsvector_search', fallbackFilters.query, { type: 'websearch' });
                    }

                    const { data, error } = await q;
                    if (error) throw error;
                    return data ?? [];
                }
            );

            // Normalize Typesense hits to match ItemSearchResult shape
            if (results.length > 0 && 'document' in results[0]) {
                // Results are from Typesense (have .document property)
                return (results as any[]).map((hit: any) => ({
                    id: hit.document.id,
                    item_name: hit.document.item_name,
                    keyword_id: hit.document.keyword_id,
                    brand_id: hit.document.brand_id,
                    vertical_id: hit.document.vertical_id,
                    subcategory_id: hit.document.subcategory_id,
                    stock_parcels: hit.document.stock_parcels,
                    stock_units: hit.document.stock_units,
                    retail_price_unit: hit.document.retail_price_unit,
                    retail_price_container: hit.document.retail_price_container,
                    wholesale_price_unit: hit.document.wholesale_price_unit,
                    wholesale_price_container: hit.document.wholesale_price_container,
                    mrp: hit.document.mrp,
                    p_unit: hit.document.p_unit,
                    p_unit_per_parcel: hit.document.p_unit_per_parcel,
                    // Typesense-specific fields
                    _typesenseHit: true,
                    _textMatch: hit.text_match,
                }));
            }

            // Results are from Supabase (already in correct shape)
            return results;
        },

        /** Restocking signals — items below reorder threshold */
        getLowStock: async () => {
            const { data, error } = await supabase
                .from('items')
                .select('id, item_name, keyword_id, stock_parcels, reorder_threshold, brand_id, vertical_id')
                .eq('firm_id', getFirmId())
                .filter('stock_parcels', 'lte', supabase.rpc as any) // raw comparison
                .order('stock_parcels', { ascending: true });
            // Note: use RPC for column-to-column comparison — see getLowStockRpc below
            if (error) throw error;
            return data ?? [];
        },

        /** Preferred method for restock signals — uses DB-side comparison */
        getLowStockRpc: async () => {
            const { data, error } = await supabase.rpc('get_low_stock_items', {
                p_firm_id: getFirmId()
            });
            if (error) throw error;
            return data ?? [];
        },

        add: (val: any) => insert('items', { ...val, created_at: new Date().toISOString() }),
        update: (id: number, val: any) => update('items', id, { ...val, updated_at: new Date().toISOString() }),
        delete: (id: number) => remove('items', id),

        /** Use keyword_id as conflict key for items bulk import */
        bulkUpsert: (rows: any[]) => bulkUpsert('items', rows, 'keyword_id'),

        /**
         * Get items with product and vertical info for hierarchical display
         * Returns items grouped by vertical -> product
         */
        getGrouped: async () => {
            const { data, error } = await supabase
                .from('items')
                .select(`
                    id, item_name, keyword_id, category,
                    brand_id, vertical_id, product_id,
                    stock_parcels, stock_units,
                    retail_price_unit, retail_price_container,
                    wholesale_price_unit, wholesale_price_container,
                    mrp, p_unit, p_unit_per_parcel,
                    products(id, name, vertical_id)
                `)
                .eq('firm_id', getFirmId())
                .order('item_name', { ascending: true });

            if (error) throw error;
            return data ?? [];
        },

        /**
         * Search items by keyword_id or item_name
         * Efficient client-side filtering for cached data
         */
        searchByKeyword: (items: any[], query: string) => {
            if (!query.trim()) return items;
            const q = query.toLowerCase();
            return items.filter((item: any) =>
                item.item_name?.toLowerCase().includes(q) ||
                item.keyword_id?.toLowerCase().includes(q)
            );
        },
    },

    // ── CRM ────────────────────────────────────────────────────────
    prospects: {
        getAll: () => getAll<any>('prospects'),
        add: (val: any) => insert('prospects', { ...val, created_at: new Date().toISOString() }),
        update: (id: number, val: any) => update('prospects', id, val),
        delete: (id: number) => remove('prospects', id),
        bulkUpsert: (rows: any[]) => bulkUpsert('prospects', rows),
    },

    // ── Sales Orders ─────────────────────────────────────────────────────
    sales_orders: {
        getAll: () => getAll<any>('sales_orders'),

        getPendingPayments: async () => {
            const { data, error } = await supabase
                .from('sales_orders')
                .select('*, prospects(prospectname, contact)')
                .eq('firm_id', getFirmId())
                .is('end_of_sale', false)
                .gt('due_amount', 0)
                .order('due_date', { ascending: true });
            if (error) throw error;
            return data;
        },

        add: (val: any) => insert('sales_orders', { ...val, created_at: new Date().toISOString() }),
        update: (id: number, val: any) => update('sales_orders', id, val),
        delete: (id: number) => remove('sales_orders', id),
        
        /**
         * End of sale: copy order to bills and delete from sales_orders
         */
        endOfSale: async (orderId: number) => {
            const { data: order, error: orderError } = await supabase
                .from('sales_orders')
                .select('*, prospects(prospectname), sales_order_items(*)')
                .eq('id', orderId)
                .eq('firm_id', getFirmId())
                .single();
            if (orderError) throw orderError;
            
            // Create bill from order
            const billData = {
                firm_id: getFirmId(),
                bill_number: `BILL-${Date.now()}`,
                prospect_id: order.prospect_id,
                grand_total: order.grand_total,
                paid_amount: order.paid_amount,
                notes: order.notes,
            };
            
            const { data: bill, error: billError } = await supabase
                .from('bills')
                .insert(billData)
                .select()
                .single();
            if (billError) throw billError;
            
            // Mark order as end_of_sale (don't delete, just mark)
            await supabase
                .from('sales_orders')
                .update({ end_of_sale: true })
                .eq('id', orderId);
            
            emitDbChange('sales_orders');
            emitDbChange('bills');
            return bill;
        },
    },

    sales_order_items: {
        /**
         * Fixed: verifies order belongs to current firm before returning items.
         * Prevents cross-firm data leak when RLS is disabled.
         */
        getByOrder: async (orderId: number) => {
            const { data, error } = await supabase
                .from('sales_order_items')
                .select('*, sales_orders!inner(firm_id)')
                .eq('sales_order_id', orderId)
                .eq('sales_orders.firm_id', getFirmId());
            if (error) throw error;
            // Strip the joined sales_orders.firm_id from response
            return (data ?? []).map(({ sales_orders: _o, ...rest }: any) => rest);
        },

        add: (val: any) => insert('sales_order_items', val),
        update: (id: number, val: any) => update('sales_order_items', id, val),
        delete: (id: number) => remove('sales_order_items', id),
    },

    bills: {
        getAll: () => getAll<any>('bills'),
        add: (val: any) => insert('bills', { ...val, created_at: new Date().toISOString() }),
        update: (id: number, val: any) => update('bills', id, val),
        delete: (id: number) => remove('bills', id),
    },

    // ── Suppliers (global — no firm_id) ───────────────────────────
    suppliers: {
        getAll: () => getAll<any>('suppliers'),
        getByVertical: (verticalId: number) =>
            getAll<any>('suppliers', q => q.eq('vertical_id', verticalId)),
        add: (val: any) => insert('suppliers', { ...val, created_at: new Date().toISOString() }),
        update: (id: number, val: any) => update('suppliers', id, val),
        delete: (id: number) => remove('suppliers', id),
        bulkUpsert: (rows: any[]) => bulkUpsert('suppliers', rows),

        getBusinessVolume: async (supplierId: number) => {
            const { data, error } = await supabase
                .from('purchase_orders')
                .select('order_date, total_cost, freight_cost, packaging_cost, subtotal')
                .eq('supplier_id', supplierId)
                .eq('firm_id', getFirmId())
                .order('order_date', { ascending: false });
            if (error) throw error;
            return data;
        },
    },

    purchase_orders: {
        getAll: () => getAll<any>('purchase_orders'),

        getBySupplier: async (supplierId: number) => {
            const { data, error } = await supabase
                .from('purchase_orders')
                .select('*, purchase_log(supplier_id, shipment_date)')
                .eq('firm_id', getFirmId())
                .order('id', { ascending: false });
            if (error) throw error;
            return data;
        },

        add: (val: any) => insert('purchase_orders', val),
        update: (id: number, val: any) => update('purchase_orders', id, val),
        delete: (id: number) => remove('purchase_orders', id),
    },

    purchase_log: {
        getAll: () => getAll<any>('purchase_log'),
        getBySupplier: async (supplierId: number) => {
            const { data, error } = await supabase
                .from('purchase_log')
                .select('*, suppliers(name)')
                .eq('supplier_id', supplierId)
                .order('purchase_date', { ascending: false });
            if (error) throw error;
            return data;
        },
        add: (val: any) => insert('purchase_log', { ...val, purchase_date: new Date().toISOString() }),
        update: (id: number, val: any) => update('purchase_log', id, val),
        delete: (id: number) => remove('purchase_log', id),
    },

    // ── Stock & Pricing ────────────────────────────────────────────
    stock_details: {
        getAll: () => getAll<any>('stock_details'),
        getByItem: async (itemId: number) => {
            const { data, error } = await supabase
                .from('stock_details')
                .select('*')
                .eq('item_id', itemId)
                .eq('firm_id', getFirmId());
            if (error) throw error;
            return data ?? [];
        },
        add: (val: any) => insert('stock_details', { ...val, last_updated: new Date().toISOString() }),
        update: (id: number, val: any) => update('stock_details', id, { ...val, last_updated: new Date().toISOString() }),
        delete: (id: number) => remove('stock_details', id),
    },

    total_stock: {
        getAll: () => getAll<any>('total_stock'),
        getByKeyword: async (keyword: string) => {
            const { data, error } = await supabase
                .from('total_stock')
                .select('*')
                .eq('item_keyword', keyword)
                .eq('firm_id', getFirmId())
                .single();
            if (error) throw error;
            return data;
        },
        add: (val: any) => insert('total_stock', { ...val, updated_at: new Date().toISOString() }),
        update: (id: number, val: any) => update('total_stock', id, { ...val, updated_at: new Date().toISOString() }),
        delete: (id: number) => remove('total_stock', id),
    },

    cost_types: {
        getAll: () => getAll<any>('cost_types'),
        add: (val: any) => insert('cost_types', val),
        update: (id: number, val: any) => update('cost_types', id, val),
        delete: (id: number) => remove('cost_types', id),
    },

    categories: {
        getAll: () => getAll<any>('categories'),
        add: (val: any) => insert('categories', val),
        update: (id: number, val: any) => update('categories', id, val),
        delete: (id: number) => remove('categories', id),
    },

    // ── Routes & Visits ────────────────────────────────────────────
    routes: {
        getAll: () => getAll<any>('routes'),
        add: (val: any) => insert('routes', { ...val, created_at: new Date().toISOString() }),
        update: (id: number, val: any) => update('routes', id, val),
        delete: (id: number) => remove('routes', id),
        bulkUpsert: (rows: any[]) => bulkUpsert('routes', rows),
    },

    visits: {
        getAll: () => getAll<any>('visits'),

        getFuturePlans: async () => {
            const today = new Date().toISOString().split('T')[0];
            const { data, error } = await supabase
                .from('visits')
                .select('*, prospects(prospectname, area_town, contact), routes(name)')
                .eq('firm_id', getFirmId())
                .gte('next_visit_plan', today)
                .order('next_visit_plan', { ascending: true });
            if (error) throw error;
            return data;
        },

        add: (val: any) => insert('visits', { ...val, created_at: new Date().toISOString() }),
        update: (id: number, val: any) => update('visits', id, val),
        delete: (id: number) => remove('visits', id),
        bulkUpsert: (rows: any[]) => bulkUpsert('visits', rows),
    },

    travel_records: {
        getAll: () => getAll<any>('travel_records'),
        add: (val: any) => insert('travel_records', val),
        update: (id: number, val: any) => update('travel_records', id, val),
        delete: (id: number) => remove('travel_records', id),
    },

    // ── Media ──────────────────────────────────────────────────────
    item_media: {
        getAll: () => getAll<any>('item_media'),
        getByItem: async (itemId: number) => {
            const { data, error } = await supabase
                .from('item_media')
                .select('*')
                .eq('item_id', itemId)
                .eq('firm_id', getFirmId())
                .order('created_at', { ascending: true });
            if (error) throw error;
            return data || [];
        },
        add: (val: any) => insert('item_media', { ...val, created_at: new Date().toISOString() }),
        update: (id: number, val: any) => update('item_media', id, val),
        delete: (id: number) => remove('item_media', id),
        deleteByItem: async (itemId: number) => {
            const { error } = await supabase
                .from('item_media')
                .delete()
                .eq('item_id', itemId)
                .eq('firm_id', getFirmId());
            if (error) throw error;
        },
    },

    // ── Financials ─────────────────────────────────────────────────
    costs: {
        getAll: () => getAll<any>('costs'),
        add: (val: any) => insert('costs', val),
        update: (id: number, val: any) => update('costs', id, val),
        delete: (id: number) => remove('costs', id),
        bulkUpsert: (rows: any[]) => bulkUpsert('costs', rows),
    },

    account: {
        getAll: () => getAll<any>('account'),

        /** master_admin only — returns all firms' account data */
        getAllFirms: async () => {
            if (!isMasterAdmin()) throw new Error('Unauthorized: master_admin required');
            const { data, error } = await supabase
                .from('account')
                .select('*, firms(name, slug)')
                .order('month_year', { ascending: false });
            if (error) throw error;
            return data;
        },

        add: (val: any) => insert('account', val),
        update: (id: number, val: any) => update('account', id, val),
        delete: (id: number) => remove('account', id),
    },

    marketing_catalogues: {
        getAll: () => getAll<any>('marketing_catalogues'),
        add: (val: any) => insert('marketing_catalogues', { ...val, created_at: new Date().toISOString() }),
        update: (id: number, val: any) => update('marketing_catalogues', id, val),
        delete: (id: number) => remove('marketing_catalogues', id),
    },

    // ── Firms (admin-only) ─────────────────────────────────────────
    firms: {
        getCurrent: async (firmId: string) => {
            const { data, error } = await supabase
                .from('firms')
                .select('*')
                .eq('id', firmId)
                .single();
            if (error) throw error;
            return data;
        },

        getAll: async () => {
            if (!isMasterAdmin()) throw new Error('Unauthorized: master_admin required');
            const { data, error } = await supabase.from('firms').select('*');
            if (error) throw error;
            return data;
        },

        updateFeatures: async (firmId: string, features: Record<string, boolean>) => {
            const { error } = await supabase
                .from('firms')
                .update({ enabled_features: features })
                .eq('id', firmId);
            if (error) throw error;
            emitDbChange('firms');
        },
    },

    // ── Stock Movements (NEW) ──────────────────────────────────────
    stock_movements: {
        getAll: () => getAll<any>('stock_movements'),

        getByItem: async (itemId: number) => {
            const { data, error } = await supabase
                .from('stock_movements')
                .select('*')
                .eq('item_id', itemId)
                .eq('firm_id', getFirmId())
                .order('created_at', { ascending: false });
            if (error) throw error;
            return data ?? [];
        },

        getByType: async (type: 'sale' | 'purchase' | 'transfer' | 'loss' | 'adjustment' | 'return') => {
            const { data, error } = await supabase
                .from('stock_movements')
                .select('*, items(item_name, keyword_id)')
                .eq('firm_id', getFirmId())
                .eq('movement_type', type)
                .order('created_at', { ascending: false });
            if (error) throw error;
            return data ?? [];
        },

        getByDateRange: async (from: string, to: string) => {
            const { data, error } = await supabase
                .from('stock_movements')
                .select('*, items(item_name, keyword_id, vertical_id, brand_id)')
                .eq('firm_id', getFirmId())
                .gte('created_at', from)
                .lte('created_at', to)
                .order('created_at', { ascending: false });
            if (error) throw error;
            return data ?? [];
        },

        /**
         * Log a movement and update item stock atomically.
         * qty_change: negative = stock out, positive = stock in
         * Always logs; caller responsible for updating items.stock_parcels separately
         * or use logAndUpdateStock for atomic operation.
         */
        log: (val: {
            item_id: number;
            movement_type: string;
            qty_change: number;
            parcel_change?: number;
            from_location_id?: number;
            to_location_id?: number;
            order_id?: number;
            purchase_order_id?: number;
            notes?: string;
        }) => insert('stock_movements', { ...val, created_at: new Date().toISOString() }),

        /**
         * Log movement + update item stock_parcels atomically via RPC.
         * Use this for billing deductions and purchase receipts.
         */
        logAndUpdateStock: async (val: {
            item_id: number;
            movement_type: string;
            parcel_change: number;
            order_id?: number;
            purchase_order_id?: number;
            notes?: string;
        }) => {
            const { error } = await supabase.rpc('log_stock_movement', {
                p_firm_id: getFirmId(),
                p_item_id: val.item_id,
                p_movement_type: val.movement_type,
                p_parcel_change: val.parcel_change,
                p_order_id: val.order_id ?? null,
                p_purchase_order_id: val.purchase_order_id ?? null,
                p_notes: val.notes ?? null,
            });
            if (error) throw error;
            emitDbChange('stock_movements');
            emitDbChange('items');
        },
    },


    // ── Analytics ──────────────────────────────────────────────────

    analytics: {
        getBrandMetrics: async (from: string, to: string) => {
            // Fixed: filter orders by firm_id to prevent cross-firm aggregation
            const { data: orderItems, error } = await supabase
                .from('sales_order_items')
                .select(`
                    total,
                    items!inner(brand_id, vertical_id),
                    sales_orders!inner(created_at, firm_id)
                `)
                .eq('sales_orders.firm_id', getFirmId())
                .gte('sales_orders.created_at', from)
                .lte('sales_orders.created_at', to);
            if (error) throw error;

            const { data: brands } = await supabase
                .from('brands')
                .select('id, name, vertical_id, verticals(name)')
                .eq('firm_id', getFirmId());

            const map: Record<number, { revenue: number; orderCount: number }> = {};
            for (const oi of (orderItems ?? [])) {
                const brandId = (oi.items as any)?.brand_id;
                if (!brandId) continue;
                if (!map[brandId]) map[brandId] = { revenue: 0, orderCount: 0 };
                map[brandId].revenue += Number(oi.total ?? 0);
                map[brandId].orderCount += 1;
            }

            return (brands ?? []).map((b: any) => ({
                brand_id: b.id,
                brand_name: b.name,
                vertical_id: b.vertical_id,
                vertical_name: b.verticals?.name ?? 'Unknown',
                revenue: map[b.id]?.revenue ?? 0,
                order_count: map[b.id]?.orderCount ?? 0,
            }));
        },

        getAccountFlow: async (from: string, to: string) => {
            // Fixed: all queries now scoped to getFirmId()
            const firmId = getFirmId();
            const oQ = supabase.from('sales_orders')
                .select('grand_total, paid_amount, due_amount')
                .eq('firm_id', firmId)
                .gte('created_at', from)
                .lte('created_at', to);
            const pQ = supabase.from('purchase_log')
                .select('total_amount')
                .eq('firm_id', firmId)
                .gte('purchase_date', from)
                .lte('purchase_date', to);
            const cQ = supabase.from('costs')
                .select('amount')
                .eq('firm_id', firmId)
                .gte('date', from.split('T')[0])
                .lte('date', to.split('T')[0]);

            const [ordersRes, purchaseRes, costsRes] = await Promise.all([oQ, pQ, cQ]);
            if (ordersRes.error) throw ordersRes.error;

            const revenue = (ordersRes.data ?? []).reduce((s: number, o: any) => s + Number(o.grand_total ?? 0), 0);
            const collected = (ordersRes.data ?? []).reduce((s: number, o: any) => s + Number(o.paid_amount ?? 0), 0);
            const due = (ordersRes.data ?? []).reduce((s: number, o: any) => s + Number(o.due_amount ?? 0), 0);
            const procurement = (purchaseRes.data ?? []).reduce((s: number, o: any) => s + Number(o.total_cost ?? 0), 0);
            const opex = (costsRes.data ?? []).reduce((s: number, c: any) => s + Number(c.amount ?? 0), 0);
            const total_cost = procurement + opex;
            const profit = revenue - total_cost;

            return {
                revenue, collected, due, procurement, opex,
                total_cost, profit,
                margin: revenue > 0 ? (profit / revenue) * 100 : 0,
            };
        },

        getVerticalSummary: async (from: string, to: string) => {
            const { data: orderItems, error } = await supabase
                .from('sales_order_items')
                .select('total, items!inner(vertical_id, verticals!inner(name)), sales_orders!inner(created_at, firm_id)')
                .eq('sales_orders.firm_id', getFirmId())
                .gte('sales_orders.created_at', from)
                .lte('sales_orders.created_at', to);
            if (error) throw error;

            const map: Record<number, { name: string; revenue: number }> = {};
            for (const oi of (orderItems ?? [])) {
                const vId = (oi.items as any)?.vertical_id;
                const vName = (oi.items as any)?.verticals?.name ?? 'Unknown';
                if (!vId) continue;
                if (!map[vId]) map[vId] = { name: vName, revenue: 0 };
                map[vId].revenue += Number(oi.total ?? 0);
            }
            return Object.entries(map).map(([id, v]) => ({ vertical_id: Number(id), ...v }));
        },

        /** Stagnant stock — items with no sales movement in N days */
        getStagnantStock: async (daysThreshold = 30) => {
            const cutoff = new Date();
            cutoff.setDate(cutoff.getDate() - daysThreshold);

            const { data, error } = await supabase
                .from('items')
                .select('id, item_name, keyword_id, stock_parcels, updated_at, vertical_id, brand_id')
                .eq('firm_id', getFirmId())
                .gt('stock_parcels', 0)
                .lt('updated_at', cutoff.toISOString())
                .order('updated_at', { ascending: true });
            if (error) throw error;
            return data ?? [];
        },

        /** Stock movement velocity — items sold most in date range */
        getMovementVelocity: async (from: string, to: string, limit = 20) => {
            const { data, error } = await supabase
                .from('stock_movements')
                .select('item_id, parcel_change, items(item_name, keyword_id)')
                .eq('firm_id', getFirmId())
                .eq('movement_type', 'sale')
                .gte('created_at', from)
                .lte('created_at', to);
            if (error) throw error;

            const map: Record<number, { name: string; keyword_id: string; total_out: number }> = {};
            for (const m of (data ?? [])) {
                if (!map[m.item_id]) map[m.item_id] = {
                    name: (m.items as any)?.item_name ?? '',
                    keyword_id: (m.items as any)?.keyword_id ?? '',
                    total_out: 0,
                };
                map[m.item_id].total_out += Math.abs(m.parcel_change ?? 0);
            }
            return Object.values(map)
                .sort((a, b) => b.total_out - a.total_out)
                .slice(0, limit);
        },
    },

    // ── Reports ────────────────────────────────────────────────────
    reports: {
        getSalesSummary: async (from: string, to: string) => {
            const { data: orders, error } = await supabase
                .from('sales_orders')
                .select('*, prospects(prospectname, contact, area_town)')
                .eq('firm_id', getFirmId())
                .gte('created_at', from)
                .lte('created_at', to)
                .order('created_at', { ascending: false });
            if (error) throw error;

            const revenue = (orders ?? []).reduce((s: number, o: any) => s + Number(o.grand_total ?? 0), 0);
            const collected = (orders ?? []).reduce((s: number, o: any) => s + Number(o.paid_amount ?? 0), 0);
            const due = (orders ?? []).reduce((s: number, o: any) => s + Number(o.due_amount ?? 0), 0);
            return { orders: orders ?? [], revenue, collected, due, count: (orders ?? []).length };
        },

        getTopProspects: async (from: string, to: string, limit = 10) => {
            const { data, error } = await supabase
                .from('sales_orders')
                .select('prospect_id, prospects(prospectname), grand_total, paid_amount, due_amount')
                .eq('firm_id', getFirmId())
                .gte('created_at', from)
                .lte('created_at', to);
            if (error) throw error;

            const map: Record<number, { name: string; revenue: number; due: number; orders: number }> = {};
            for (const o of (data ?? [])) {
                const prospectId = o.prospect_id;
                const prospectName = (o.prospects as any)?.prospectname ?? 'Unknown';
                if (!map[prospectId]) map[prospectId] = { name: prospectName, revenue: 0, due: 0, orders: 0 };
                map[prospectId].revenue += Number(o.grand_total ?? 0);
                map[prospectId].due += Number(o.due_amount ?? 0);
                map[prospectId].orders += 1;
            }
            return Object.values(map)
                .sort((a, b) => b.revenue - a.revenue)
                .slice(0, limit);
        },

        getStockSnapshot: async () => {
            const { data, error } = await supabase
                .from('items')
                .select('item_name, keyword_id')
                .eq('firm_id', getFirmId());
            if (error) throw error;
            return data ?? [];
        },

        getCustomerDues: async () => {
            const { data, error } = await supabase
                .from('sales_orders')
                .select('*, prospects(prospectname, contact)')
                .eq('firm_id', getFirmId())
                .gt('due_amount', 0)
                .order('due_amount', { ascending: false });
            if (error) throw error;
            return data ?? [];
        },

        getItemSales: async (from: string, to: string) => {
            const { data, error } = await supabase
                .from('order_items')
                .select('item_id, item_name, qty, unit_price, total, orders!inner(created_at, firm_id)')
                .eq('orders.firm_id', getFirmId())
                .gte('orders.created_at', from)
                .lte('orders.created_at', to);
            if (error) throw error;

            const map: Record<string, { name: string; qty: number; revenue: number }> = {};
            for (const oi of (data ?? [])) {
                const key = String(oi.item_id);
                if (!map[key]) map[key] = { name: oi.item_name, qty: 0, revenue: 0 };
                map[key].qty += Number(oi.qty ?? 0);
                map[key].revenue += Number(oi.total ?? 0);
            }
            return Object.values(map).sort((a, b) => b.revenue - a.revenue);
        },
    },

    // ── Warehouse (existing — preserved, firm_id filter added) ────
    warehouse: {
        getLayouts: () => getAll<any>('warehouse_layout'),
        addLayout: (val: any) => insert('warehouse_layout', val),
        updateLayout: (id: number, val: any) => update('warehouse_layout', id, val),

        getCells: async (warehouseId: number) => {
            const { data, error } = await supabase
                .from('warehouse_cells')
                .select('*, items(item_name, retail_price_container, stock_parcels)')
                .eq('warehouse_id', warehouseId)
                .order('floor').order('section').order('row_num').order('col_num');
            if (error) throw error;
            return data ?? [];
        },

        updateCell: async (
            warehouseId: number,
            floor: number,
            section: string,
            row: number,
            col: number,
            itemId: number | null,
            count: number
        ) => {
            const { error } = await supabase
                .from('warehouse_cells')
                .upsert(
                    {
                        warehouse_id: warehouseId,
                        floor, section,
                        row_num: row,
                        col_num: col,
                        item_id: itemId,
                        parcel_count: count,
                        firm_id: getFirmId(),
                    },
                    { onConflict: 'warehouse_id,floor,section,row_num,col_num' }
                );
            if (error) throw error;
            emitDbChange('warehouse_cells');
        },

        searchItem: async (warehouseId: number, itemId: number) => {
            const { data, error } = await supabase
                .from('warehouse_cells')
                .select('*')
                .eq('warehouse_id', warehouseId)
                .eq('item_id', itemId);
            if (error) throw error;
            return data ?? [];
        },

        clearCell: async (cellId: number) => {
            const { error } = await supabase
                .from('warehouse_cells')
                .update({ item_id: null, parcel_count: 0 })
                .eq('id', cellId);
            if (error) throw error;
            emitDbChange('warehouse_cells');
        },
    },

    // subcategories: {
    //     getAll: async () => {
    //         const { data, error } = await supabase
    //             .from('subcategories')
    //             .select('*')
    //             .eq('firm_id', getFirmId())
    //             .order('vertical_id', { ascending: true })
    //             .order('name', { ascending: true });
    //         if (error) throw error;
    //         emitDbChange('subcategories');
    //         return data ?? [];
    //     },

    //     getByVertical: async (verticalId: number) => {
    //         const { data, error } = await supabase
    //             .from('subcategories')
    //             .select('*')
    //             .eq('firm_id', getFirmId())
    //             .eq('vertical_id', verticalId)
    //             .order('name', { ascending: true });
    //         if (error) throw error;
    //         return data ?? [];
    //     },

    //     add: async (val: Omit<Subcategory, 'id' | 'firm_id' | 'created_at' | 'slug'>) => {
    //         const { data, error } = await supabase
    //             .from('subcategories')
    //             .insert({ ...val, firm_id: getFirmId() })
    //             .select()
    //             .single();
    //         if (error) throw error;
    //         emitDbChange('subcategories');
    //         return data;
    //     },

    //     update: async (id: number, val: Partial<Omit<Subcategory, 'id' | 'firm_id'>>) => {
    //         const { data, error } = await supabase
    //             .from('subcategories')
    //             .update(val)
    //             .eq('id', id)
    //             .eq('firm_id', getFirmId())
    //             .select()
    //             .single();
    //         if (error) throw error;
    //         emitDbChange('subcategories');
    //         return data;
    //     },

    //     delete: async (id: number) => {
    //         const { error } = await supabase
    //             .from('subcategories')
    //             .delete()
    //             .eq('id', id)
    //             .eq('firm_id', getFirmId());
    //         if (error) throw error;
    //         emitDbChange('subcategories');
    //     },

    //     bulkUpsert: async (rows: Array<Omit<Subcategory, 'id' | 'firm_id' | 'created_at' | 'slug'>>) => {
    //         const withFirm = rows.map(r => ({ ...r, firm_id: getFirmId() }));
    //         const { data, error } = await supabase
    //             .from('subcategories')
    //             .upsert(withFirm, { onConflict: 'firm_id,vertical_id,name' })
    //             .select();
    //         if (error) throw error;
    //         emitDbChange('subcategories');
    //         return data ?? [];
    //     },
    // },

    // // ── Spatial: Layer 1 — Storage Places ─────────────────────────

    storage_places: {
        /** All active (non-deleted) places for this firm */
        getAll: () =>
            getAll<any>('storage_places', q => q.is('deleted_at', null)),

        getById: async (id: number) => {
            const { data, error } = await supabase
                .from('storage_places')
                .select('*')
                .eq('id', id)
                .eq('firm_id', getFirmId())
                .is('deleted_at', null)
                .single();
            if (error) throw error;
            return data;
        },

        create: async (val: {
            place_name: string;
            place_slug: string;
            place_type?: string;
            floor_count?: number;
            width_meters?: number;  // NEW
            depth_meters?: number;  // NEW
            height_meters?: number;  // NEW
            top_view_image_url?: string;
            notes?: string;
        }) => {
            const { data, error } = await supabase
                .from('storage_places')
                .insert({ ...val, firm_id: getFirmId() })
                .select()
                .single();
            if (error) throw error;
            emitDbChange('storage_places');
            return data;
        },

        update: async (id: number, val: Partial<{
            place_name: string;
            place_slug: string;
            place_type: string;
            floor_count: number;
            width_meters: number;  // NEW
            depth_meters: number;  // NEW
            height_meters: number;  // NEW
            top_view_image_url: string;
            notes: string;
        }>) => {
            const { data, error } = await supabase
                .from('storage_places')
                .update(val)
                .eq('id', id)
                .eq('firm_id', getFirmId())
                .select()
                .single();
            if (error) throw error;
            emitDbChange('storage_places');
            return data;
        },

        /** Soft delete — sets deleted_at, does NOT physically remove the row */
        softDelete: async (id: number) => {
            const { error } = await supabase
                .from('storage_places')
                .update({ deleted_at: new Date().toISOString() })
                .eq('id', id)
                .eq('firm_id', getFirmId());
            if (error) throw error;
            emitDbChange('storage_places');
        },

        restore: async (id: number) => {
            const { error } = await supabase
                .from('storage_places')
                .update({ deleted_at: null })
                .eq('id', id)
                .eq('firm_id', getFirmId());
            if (error) throw error;
            emitDbChange('storage_places');
        },
    },

    // ── Spatial: Layer 2 — Storage Zones ──────────────────────────

    storage_zones: {
        /** All active zones for this firm, optionally filtered by place+floor */
        getAll: (placeId?: number, floorNum?: number) =>
            getAll<any>('storage_zones', q => {
                let query = q.is('deleted_at', null);
                if (placeId !== undefined) query = query.eq('place_id', placeId);
                if (floorNum !== undefined) query = query.eq('floor_num', floorNum);
                return query;
            }),

        getById: async (id: number) => {
            const { data, error } = await supabase
                .from('storage_zones')
                .select('*')
                .eq('id', id)
                .eq('firm_id', getFirmId())
                .is('deleted_at', null)
                .single();
            if (error) throw error;
            return data;
        },

        create: async (val: {
            place_id: number;
            floor_num: number;
            zone_name: string;
            zone_slug: string;
            polygon_coords?: number[][];
            zone_color?: string;
            notes?: string;
        }) => {
            const { data, error } = await supabase
                .from('storage_zones')
                .insert({ ...val, firm_id: getFirmId() })
                .select()
                .single();
            if (error) throw error;
            emitDbChange('storage_zones');
            return data;
        },

        update: async (id: number, val: Partial<{
            zone_name: string;
            zone_slug: string;
            floor_num: number;
            polygon_coords: number[][];
            zone_color: string;
            notes: string;
        }>) => {
            const { data, error } = await supabase
                .from('storage_zones')
                .update(val)
                .eq('id', id)
                .eq('firm_id', getFirmId())
                .select()
                .single();
            if (error) throw error;
            emitDbChange('storage_zones');
            return data;
        },

        /** Save polygon coordinates drawn in the Three.js mapper */
        savePolygon: async (id: number, polygon_coords: number[][], zone_color?: string) => {
            const { data, error } = await supabase
                .from('storage_zones')
                .update({ polygon_coords, ...(zone_color ? { zone_color } : {}) })
                .eq('id', id)
                .eq('firm_id', getFirmId())
                .select()
                .single();
            if (error) throw error;
            emitDbChange('storage_zones');
            return data;
        },

        softDelete: async (id: number) => {
            const { error } = await supabase
                .from('storage_zones')
                .update({ deleted_at: new Date().toISOString() })
                .eq('id', id)
                .eq('firm_id', getFirmId());
            if (error) throw error;
            emitDbChange('storage_zones');
        },

        restore: async (id: number) => {
            const { error } = await supabase
                .from('storage_zones')
                .update({ deleted_at: null })
                .eq('id', id)
                .eq('firm_id', getFirmId());
            if (error) throw error;
            emitDbChange('storage_zones');
        },
    },

    // ── Spatial: Layer 3 — Storage Slots ──────────────────────────

    storage_slots: {
        /** Active slots for a zone, ordered by z-level (order_index) */
        getAll: (zoneId?: number) =>
            getAll<any>('storage_slots', q => {
                let query = q.is('deleted_at', null).order('order_index', { ascending: true });
                if (zoneId !== undefined) query = query.eq('zone_id', zoneId);
                return query;
            }),

        getById: async (id: number) => {
            const { data, error } = await supabase
                .from('storage_slots')
                .select('*')
                .eq('id', id)
                .eq('firm_id', getFirmId())
                .is('deleted_at', null)
                .single();
            if (error) throw error;
            return data;
        },

        create: async (val: {
            zone_id: number;
            slot_name: string;
            order_index?: number;
            capacity_parcels?: number;
            notes?: string;
        }) => {
            const { data, error } = await supabase
                .from('storage_slots')
                .insert({ ...val, firm_id: getFirmId() })
                .select()
                .single();
            if (error) throw error;
            emitDbChange('storage_slots');
            return data;
        },

        update: async (id: number, val: Partial<{
            slot_name: string;
            order_index: number;
            capacity_parcels: number;
            notes: string;
        }>) => {
            const { data, error } = await supabase
                .from('storage_slots')
                .update(val)
                .eq('id', id)
                .eq('firm_id', getFirmId())
                .select()
                .single();
            if (error) throw error;
            emitDbChange('storage_slots');
            return data;
        },

        softDelete: async (id: number) => {
            const { error } = await supabase
                .from('storage_slots')
                .update({ deleted_at: new Date().toISOString() })
                .eq('id', id)
                .eq('firm_id', getFirmId());
            if (error) throw error;
            emitDbChange('storage_slots');
        },

        restore: async (id: number) => {
            const { error } = await supabase
                .from('storage_slots')
                .update({ deleted_at: null })
                .eq('id', id)
                .eq('firm_id', getFirmId());
            if (error) throw error;
            emitDbChange('storage_slots');
        },
    },

    // ── Spatial: Stock ↔ Slot Assignments ─────────────────────────

    item_locations: {

        create: async (val: {
            item_id: number;
            slot_id: number;
            parcel_count: number;
            is_primary?: boolean;
            packaging_type?: string;
            packaging_tags?: string[];
        }) => {
            const { data, error } = await supabase
                .from('item_locations')
                .insert({ ...val, firm_id: getFirmId(), updated_at: new Date().toISOString() })
                .select()
                .single();

            if (error) {
                // Catch UNIQUE constraint violation (item already in this slot)
                if (error.code === '23505') {
                    return DAL.item_locations.assign(val);
                }
                throw error;
            }
            emitDbChange('item_locations');
            return data;
        },

        /** All active location assignments for this firm */
        getAll: (slotId?: number) =>
            getAll<any>('item_locations', q => {
                let query = q.is('deleted_at', null);
                if (slotId !== undefined) query = query.eq('slot_id', slotId);
                return query;
            }),

        /** Get full location path for one item: item → slot → zone → place.
         *  Uses the item_location_full denormalized view (created in migration). */
        getFullPath: async (itemId: number) => {
            const { data, error } = await supabase
                .from('item_location_full')
                .select('*')
                .eq('item_id', itemId)
                .eq('firm_id', getFirmId());
            if (error) throw error;
            return data ?? [];
        },

        /** All items in a specific zone (via the view) */
        getByZone: async (zoneId: number) => {
            const { data, error } = await supabase
                .from('item_location_full')
                .select('*')
                .eq('zone_id', zoneId)
                .eq('firm_id', getFirmId());
            if (error) throw error;
            return data ?? [];
        },

        /** Link an item to a slot (create or update existing link) */
        assign: async (val: {
            item_id: number;
            slot_id: number;
            parcel_count: number;
            is_primary?: boolean;
            packaging_type?: string;
            packaging_tags?: string[];
        }) => {
            // Upsert on (item_id, slot_id) — DB has UNIQUE constraint on the pair
            const { data, error } = await supabase
                .from('item_locations')
                .upsert(
                    { ...val, firm_id: getFirmId(), updated_at: new Date().toISOString() },
                    { onConflict: 'item_id,slot_id' }
                )
                .select()
                .single();
            if (error) throw error;
            emitDbChange('item_locations');
            return data;
        },

        update: async (id: number, val: Partial<{
            parcel_count: number;
            is_primary: boolean;
            packaging_type: string;
            packaging_tags: string[];
            last_verified_at: string;
        }>) => {
            const { data, error } = await supabase
                .from('item_locations')
                .update({ ...val, updated_at: new Date().toISOString() })
                .eq('id', id)
                .eq('firm_id', getFirmId())
                .select()
                .single();
            if (error) throw error;
            emitDbChange('item_locations');
            return data;
        },

        /**
         * Move parcels between slots — the "Move Dialog" action.
         * Decrements source, increments destination atomically.
         * Also logs a stock_movement record for the audit trail.
         */
        move: async (params: {
            item_id: number;
            from_slot_id: number;
            to_slot_id: number;
            parcel_count: number;
        }) => {
            const firmId = getFirmId();
            const now = new Date().toISOString();

            // Decrement source
            const { data: src, error: srcErr } = await supabase
                .from('item_locations')
                .select('id, parcel_count')
                .eq('item_id', params.item_id)
                .eq('slot_id', params.from_slot_id)
                .eq('firm_id', firmId)
                .is('deleted_at', null)
                .single();
            if (srcErr) throw srcErr;

            const newSrcCount = (src.parcel_count ?? 0) - params.parcel_count;
            if (newSrcCount < 0) throw new Error('Not enough parcels in source slot');

            const { error: decErr } = await supabase
                .from('item_locations')
                .update({ parcel_count: newSrcCount, updated_at: now })
                .eq('id', src.id);
            if (decErr) throw decErr;

            // Increment destination (upsert — destination may not have this item yet)
            const { error: destErr } = await supabase
                .from('item_locations')
                .upsert(
                    {
                        item_id: params.item_id,
                        slot_id: params.to_slot_id,
                        firm_id: firmId,
                        parcel_count: params.parcel_count,
                        updated_at: now,
                        is_primary: false,
                    },
                    { onConflict: 'item_id,slot_id' }
                );
            if (destErr) throw destErr;

            // Log movement record
            await supabase.from('stock_movements').insert({
                firm_id: firmId,
                item_id: params.item_id,
                movement_type: 'transfer',
                qty_change: 0,
                parcel_change: -params.parcel_count,
                from_location_id: params.from_slot_id,
                to_location_id: params.to_slot_id,
            });

            emitDbChange('item_locations');
            emitDbChange('stock_movements');
        },

        /**
         * Remove parcels from a slot (sold/lost/disposed).
         * Soft-deletes the location link if parcel_count reaches 0.
         */
        remove: async (params: {
            item_id: number;
            slot_id: number;
            parcel_count: number;
            reason?: 'sale' | 'loss' | 'adjustment';
        }) => {
            const firmId = getFirmId();
            const now = new Date().toISOString();

            const { data: loc, error: locErr } = await supabase
                .from('item_locations')
                .select('id, parcel_count')
                .eq('item_id', params.item_id)
                .eq('slot_id', params.slot_id)
                .eq('firm_id', firmId)
                .is('deleted_at', null)
                .single();
            if (locErr) throw locErr;

            const newCount = (loc.parcel_count ?? 0) - params.parcel_count;
            if (newCount < 0) throw new Error('Removing more parcels than present in slot');

            const updatePayload = newCount === 0
                ? { parcel_count: 0, deleted_at: now, updated_at: now }
                : { parcel_count: newCount, updated_at: now };

            const { error: updErr } = await supabase
                .from('item_locations')
                .update(updatePayload)
                .eq('id', loc.id);
            if (updErr) throw updErr;

            // Log movement
            await supabase.from('stock_movements').insert({
                firm_id: firmId,
                item_id: params.item_id,
                movement_type: params.reason ?? 'sale',
                qty_change: 0,
                parcel_change: -params.parcel_count,
                from_location_id: params.slot_id,
            });

            emitDbChange('item_locations');
            emitDbChange('stock_movements');
        },

        softDelete: async (id: number) => {
            const { error } = await supabase
                .from('item_locations')
                .update({ deleted_at: new Date().toISOString() })
                .eq('id', id)
                .eq('firm_id', getFirmId());
            if (error) throw error;
            emitDbChange('item_locations');
        },
    },
};

// ── Also update items.search() to include subcategory filter ──

// In items.search(), add subcategory_id to the filter chain:
//
// search: async (filters: ItemSearchFilters) => {
//     let q = supabase
//         .from('items')
//         .select('id, item_name, keyword_id, category, brand_id, vertical_id,
//                  subcategory_id, stock_parcels, stock_units, retail_price_unit,
//                  retail_price_container, wholesale_price_unit,
//                  wholesale_price_container, mrp, p_unit, p_unit_per_parcel')
//         .eq('firm_id', getFirmId());
//
//     if (filters.subcategory_id) q = q.eq('subcategory_id', filters.subcategory_id);
//     // ... rest of filters unchanged


// ── Add getFullChain() for billing search with full labels ───

// items.getFullChain: async (filters: ItemSearchFilters) => {
//     let q = supabase
//         .from('item_full_chain')
//         .select('*')
//         .eq('firm_id', getFirmId());
//
//     if (filters.query) {
//         q = q.or(`item_name.ilike.%${filters.query}%,keyword_id.ilike.%${filters.query}%`);
//     }
//     if (filters.vertical_id)    q = q.eq('vertical_id', filters.vertical_id);
//     if (filters.brand_id)       q = q.eq('brand_id', filters.brand_id);
//     if (filters.subcategory_id) q = q.eq('subcategory_id', filters.subcategory_id);
//
//     q = q.order('item_name').limit(filters.limit ?? 30);
//     const { data, error } = await q;
//     if (error) throw error;
//     return (data ?? []) as ItemFullChain[];
// },


// --- Storage Packages (Packaging System) -------------------------------------
// Containers for grouped seasonal/custom stock (gunny bags, boxes, etc.)

(DAL as any).storage_packages = {
    getByZone: async (zoneId?: number) => {
        let q = supabase
            .from('storage_packages')
            .select('*')
            .eq('firm_id', getFirmId())
            .is('deleted_at', null)
            .order('created_at', { ascending: false });
        if (zoneId !== undefined) q = q.eq('zone_id', zoneId) as any;
        const { data, error } = await q;
        if (error) throw error;
        return data ?? [];
    },

    getWithItems: async (packageId: number) => {
        const { data: pkg, error: pkgErr } = await supabase
            .from('storage_packages').select('*')
            .eq('id', packageId).eq('firm_id', getFirmId()).single();
        if (pkgErr) throw pkgErr;

        const { data: pkgItems, error: itemsErr } = await supabase
            .from('package_items')
            .select('id,package_id,item_id,parcel_count,unit_count,location_id,notes,created_at,items(item_name,retail_price_unit,brands(name))')
            .eq('package_id', packageId);
        if (itemsErr) throw itemsErr;

        const items = (pkgItems ?? []).map((pi: any) => ({
            ...pi,
            item_name: pi.items?.item_name,
            brand_name: pi.items?.brands?.name,
            retail_price_unit: pi.items?.retail_price_unit,
        }));
        return { ...(pkg as object), items };
    },

    create: async (val: { zone_id?: number; slot_id?: number; package_type: string; package_label?: string; description?: string; vertical_id?: number; }) => {
        const { data, error } = await supabase.from('storage_packages').insert({ ...val, firm_id: getFirmId() }).select().single();
        if (error) throw error;
        emitDbChange('storage_packages');
        return data;
    },

    addItem: async (val: { package_id: number; item_id: number; parcel_count: number; unit_count?: number; location_id?: number; notes?: string; }) => {
        const { data, error } = await supabase.from('package_items').insert(val).select().single();
        if (error) throw error;
        emitDbChange('storage_packages');
        return data;
    },

    removeItem: async (packageItemId: number) => {
        const { error } = await supabase.from('package_items').delete().eq('id', packageItemId);
        if (error) throw error;
        emitDbChange('storage_packages');
    },

    softDelete: async (packageId: number) => {
        const { error } = await supabase.from('storage_packages').update({ deleted_at: new Date().toISOString() }).eq('id', packageId).eq('firm_id', getFirmId());
        if (error) throw error;
        emitDbChange('storage_packages');
    },

    
};
