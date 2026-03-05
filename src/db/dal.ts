/**
 * Data Access Layer (DAL) — Supabase Postgres edition
 *
 * READS: No firm_id filtering — data is shared across firms.
 * WRITES: firm_id is auto-injected on inserts using the real UUID
 *         fetched from the firms table at startup.
 *
 * Usage: import { DAL } from '@/db/dal'
 */

import { supabase } from './supabase';
import mitt from 'mitt';

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

// Tables that have a NOT NULL firm_id column
const FIRM_SCOPED_TABLES = new Set([
    'verticals', 'brands', 'products', 'packing_units', 'items',
    'prospects', 'orders', 'bills', 'routes', 'visits',
    'travel_records', 'purchase_orders', 'product_media',
    'costs', 'account', 'marketing_catalogues', 'warehouse_layout',
]);

// ─── Generic Helpers ──────────────────────────────────────────────

/** Auto-inject firm_id on inserts for firm-scoped tables */
function withFirmId(table: string, values: any): any {
    if (FIRM_SCOPED_TABLES.has(table) && getFirmId()) {
        return { ...values, firm_id: getFirmId() };
    }
    return values;
}

async function insert<T>(table: string, values: Partial<T>): Promise<T> {
    const { data, error } = await supabase.from(table).insert(withFirmId(table, values)).select().single();
    if (error) throw error;
    emitDbChange(table);
    return data as T;
}

async function update<T>(table: string, id: number, values: Partial<T>): Promise<T> {
    const { data, error } = await supabase.from(table).update(values).eq('id', id).select().single();
    if (error) throw error;
    emitDbChange(table);
    return data as T;
}

async function remove(table: string, id: number): Promise<void> {
    const { error } = await supabase.from(table).delete().eq('id', id);
    if (error) throw error;
    emitDbChange(table);
}

async function getAll<T>(table: string, extraFilters?: (q: any) => any): Promise<T[]> {
    let q = supabase.from(table).select('*').order('id', { ascending: true });
    if (extraFilters) q = extraFilters(q);
    const { data, error } = await q;
    if (error) throw error;
    return data as T[];
}

async function bulkUpsert(table: string, rows: any[]): Promise<void> {
    // Auto-inject firm_id for rows that don't already have one
    const processed = FIRM_SCOPED_TABLES.has(table) && getFirmId()
        ? rows.map(r => r.firm_id ? r : { ...r, firm_id: getFirmId() })
        : rows;
    const { error } = await supabase.from(table).upsert(processed, { onConflict: 'id' });
    if (error) throw error;
    emitDbChange(table);
}

// ─── DAL Object ──────────────────────────────────────────────────

export const DAL = {
    // ── Reference Data ────────────────────────────────────────────
    verticals: {
        getAll: () => getAll<any>('verticals'),
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
            const { data, error } = await supabase.from('items').select('*').eq('id', id).single();
            if (error) throw error;
            return data;
        },
        add: (val: any) => insert('items', { ...val, created_at: new Date().toISOString() }),
        update: (id: number, val: any) => update('items', id, { ...val, updated_at: new Date().toISOString() }),
        delete: (id: number) => remove('items', id),
        bulkUpsert: (rows: any[]) => bulkUpsert('items', rows),
    },

    // ── CRM ────────────────────────────────────────────────────────
    prospects: {
        getAll: () => getAll<any>('prospects'),
        add: (val: any) => insert('prospects', { ...val, created_at: new Date().toISOString() }),
        update: (id: number, val: any) => update('prospects', id, val),
        delete: (id: number) => remove('prospects', id),
        bulkUpsert: (rows: any[]) => bulkUpsert('prospects', rows),
    },

    // ── Orders ─────────────────────────────────────────────────────
    orders: {
        getAll: () => getAll<any>('orders'),
        getPendingPayments: async () => {
            const { data, error } = await supabase
                .from('orders')
                .select('*, prospects(prospectname, contact)')
                .eq('status', 'dispatched')
                .neq('payment_status', 'paid')
                .order('due_date', { ascending: true });
            if (error) throw error;
            return data;
        },
        add: (val: any) => insert('orders', { ...val, created_at: new Date().toISOString() }),
        update: (id: number, val: any) => update('orders', id, val),
        delete: (id: number) => remove('orders', id),
    },
    order_items: {
        getByOrder: async (orderId: number) => {
            const { data, error } = await supabase.from('order_items').select('*').eq('order_id', orderId);
            if (error) throw error;
            return data;
        },
        add: (val: any) => insert('order_items', val),
        update: (id: number, val: any) => update('order_items', id, val),
        delete: (id: number) => remove('order_items', id),
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
        getByVertical: (verticalId: number) => getAll<any>('suppliers', q => q.eq('vertical_id', verticalId)),
        add: (val: any) => insert('suppliers', { ...val, created_at: new Date().toISOString() }),
        update: (id: number, val: any) => update('suppliers', id, val),
        delete: (id: number) => remove('suppliers', id),
        bulkUpsert: (rows: any[]) => bulkUpsert('suppliers', rows),
        getBusinessVolume: async (supplierId: number) => {
            const { data, error } = await supabase
                .from('purchase_orders')
                .select('order_date, total_cost, freight_cost, packaging_cost, subtotal')
                .eq('supplier_id', supplierId)
                .order('order_date', { ascending: false });
            if (error) throw error;
            return data;
        },
    },
    purchase_orders: {
        getAll: () => getAll<any>('purchase_orders', q =>
            q.select('*, suppliers(name, contact)')),
        getBySupplier: async (supplierId: number) => {
            const { data, error } = await supabase
                .from('purchase_orders')
                .select('*, purchase_order_items(*)')
                .eq('supplier_id', supplierId)
                .order('order_date', { ascending: false });
            if (error) throw error;
            return data;
        },
        add: (val: any) => insert('purchase_orders', { ...val, created_at: new Date().toISOString() }),
        update: (id: number, val: any) => update('purchase_orders', id, val),
        delete: (id: number) => remove('purchase_orders', id),
        bulkUpsert: (rows: any[]) => bulkUpsert('purchase_orders', rows),
    },
    purchase_order_items: {
        add: (val: any) => insert('purchase_order_items', val),
        update: (id: number, val: any) => update('purchase_order_items', id, val),
        delete: (id: number) => remove('purchase_order_items', id),
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
    product_media: {
        getByItem: async (itemId: number) => {
            const { data, error } = await supabase
                .from('product_media')
                .select('*')
                .eq('item_id', itemId);
            if (error) throw error;
            return data;
        },
        add: (val: any) => insert('product_media', { ...val, created_at: new Date().toISOString() }),
        update: (id: number, val: any) => update('product_media', id, val),
        delete: (id: number) => remove('product_media', id),
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
        getAllFirms: async () => {
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
            const { data, error } = await supabase.from('firms').select('*').eq('id', firmId).single();
            if (error) throw error;
            return data;
        },
        getAll: async () => {
            const { data, error } = await supabase.from('firms').select('*');
            if (error) throw error;
            return data;
        },
        updateFeatures: async (firmId: string, features: Record<string, boolean>) => {
            const { error } = await supabase.from('firms').update({ enabled_features: features }).eq('id', firmId);
            if (error) throw error;
            emitDbChange('firms');
        },
    },

    // ── Analytics ──────────────────────────────────────────────────
    analytics: {
        getBrandMetrics: async (from: string, to: string) => {
            const oiQuery = supabase
                .from('order_items')
                .select(`
                    total,
                    items!inner(brand_id, vertical_id, retail_price_container, stock_parcels),
                    orders!inner(created_at, grand_total)
                `)
                .gte('orders.created_at', from)
                .lte('orders.created_at', to);

            const { data: orderItems, error } = await oiQuery;
            if (error) throw error;

            const brandsQuery = supabase
                .from('brands')
                .select('id, name, vertical_id, verticals(name)');

            const { data: brands } = await brandsQuery;

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
            const oQ = supabase.from('orders').select('grand_total, paid_amount, due_amount').gte('created_at', from).lte('created_at', to);
            const pQ = supabase.from('purchase_orders').select('total_cost').gte('created_at', from).lte('created_at', to);
            const cQ = supabase.from('costs').select('amount').gte('date', from.split('T')[0]).lte('date', to.split('T')[0]);

            const [ordersRes, purchaseRes, costsRes] = await Promise.all([oQ, pQ, cQ]);

            const revenue = (ordersRes.data ?? []).reduce((s: number, o: any) => s + Number(o.grand_total ?? 0), 0);
            const collected = (ordersRes.data ?? []).reduce((s: number, o: any) => s + Number(o.paid_amount ?? 0), 0);
            const due = (ordersRes.data ?? []).reduce((s: number, o: any) => s + Number(o.due_amount ?? 0), 0);
            const procurement = (purchaseRes.data ?? []).reduce((s: number, o: any) => s + Number(o.total_cost ?? 0), 0);
            const opex = (costsRes.data ?? []).reduce((s: number, c: any) => s + Number(c.amount ?? 0), 0);
            const total_cost = procurement + opex;
            const profit = revenue - total_cost;

            return { revenue, collected, due, procurement, opex, total_cost, profit, margin: revenue > 0 ? (profit / revenue) * 100 : 0 };
        },

        getVerticalSummary: async (from: string, to: string) => {
            const q = supabase
                .from('order_items')
                .select('total, items!inner(vertical_id, verticals!inner(name)), orders!inner(created_at)')
                .gte('orders.created_at', from)
                .lte('orders.created_at', to);

            const { data: orderItems, error } = await q;
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
    },

    // ── Reports ────────────────────────────────────────────────────
    reports: {
        getSalesSummary: async (from: string, to: string) => {
            const { data: orders, error } = await supabase
                .from('orders')
                .select('*, prospects(prospectname, contact, area_town)')
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
                .from('orders')
                .select('prospect_id, prospect_name, grand_total, paid_amount, due_amount')
                .gte('created_at', from)
                .lte('created_at', to);
            if (error) throw error;

            const map: Record<number, { name: string; revenue: number; due: number; orders: number }> = {};
            for (const o of (data ?? [])) {
                if (!map[o.prospect_id]) map[o.prospect_id] = { name: o.prospect_name, revenue: 0, due: 0, orders: 0 };
                map[o.prospect_id].revenue += Number(o.grand_total ?? 0);
                map[o.prospect_id].due += Number(o.due_amount ?? 0);
                map[o.prospect_id].orders += 1;
            }
            return Object.values(map)
                .sort((a, b) => b.revenue - a.revenue)
                .slice(0, limit);
        },

        getStockSnapshot: async () => {
            const { data, error } = await supabase
                .from('items')
                .select('item_name, category, stock_parcels, stock_units, retail_price_container, wholesale_price_container, p_unit, p_unit_per_parcel')
                .order('stock_parcels', { ascending: false });
            if (error) throw error;
            return (data ?? []).map((i: any) => ({
                ...i,
                stock_value: Number(i.stock_parcels ?? 0) * Number(i.retail_price_container ?? 0),
            }));
        },

        getCustomerDues: async () => {
            const { data, error } = await supabase
                .from('orders')
                .select('*, prospects(prospectname, contact)')
                .gt('due_amount', 0)
                .order('due_amount', { ascending: false });
            if (error) throw error;
            return data ?? [];
        },

        getItemSales: async (from: string, to: string) => {
            const { data, error } = await supabase
                .from('order_items')
                .select('item_id, item_name, qty, unit_price, total, orders!inner(created_at)')
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

    // ── Warehouse ──────────────────────────────────────────────────
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
        updateCell: async (warehouseId: number, floor: number, section: string, row: number, col: number, itemId: number | null, count: number) => {
            const { error } = await supabase
                .from('warehouse_cells')
                .upsert({ warehouse_id: warehouseId, floor, section, row_num: row, col_num: col, item_id: itemId, parcel_count: count },
                    { onConflict: 'warehouse_id,floor,section,row_num,col_num' });
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
};
