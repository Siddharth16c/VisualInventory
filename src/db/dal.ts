/**
 * Data Access Layer (DAL) — Supabase Postgres edition
 *
 * All queries are automatically scoped to the current user's firm_id via RLS
 * (Supabase Row Level Security on the server side) combined with local
 * firmId injection for explicit `eq('firm_id', firmId)` calls.
 *
 * Usage: import { DAL } from '@/db/dal'
 */

import { supabase } from './supabase';
import mitt from 'mitt';

// ─── Reactive Change Emitter (same pattern as before) ─────────────
type Events = { change: string };
export const dbEvents = mitt<Events>();
export const emitDbChange = (table: string) => dbEvents.emit('change', table);

// ─── Session Helpers ─────────────────────────────────────────────
let _firmId: string | null = null;
let _role: string | null = null;

export function setSession(firmId: string, role: string) {
    _firmId = firmId;
    _role = role;
}

export function getFirmId(): string {
    if (!_firmId) throw new Error('[DAL] Not authenticated — firmId is not set');
    return _firmId;
}

export function getRole(): string {
    return _role ?? 'store_owner_a';
}

// ─── Generic Helpers ──────────────────────────────────────────────

async function insert<T>(table: string, values: Partial<T>): Promise<T> {
    const { data, error } = await supabase.from(table).insert(values).select().single();
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
    const { error } = await supabase.from(table).upsert(rows, { onConflict: 'id' });
    if (error) throw error;
    emitDbChange(table);
}

// ─── DAL Object ──────────────────────────────────────────────────

export const DAL = {
    // ── Reference Data (tenant-scoped) ────────────────────────────
    verticals: {
        getAll: () => getAll<any>('verticals', q => q.eq('firm_id', getFirmId())),
        add: (val: any) => insert('verticals', { ...val, firm_id: getFirmId() }),
        update: (id: number, val: any) => update('verticals', id, val),
        delete: (id: number) => remove('verticals', id),
        bulkUpsert: (rows: any[]) => bulkUpsert('verticals', rows.map(r => ({ ...r, firm_id: getFirmId() }))),
    },
    brands: {
        getAll: () => getAll<any>('brands', q => q.eq('firm_id', getFirmId())),
        add: (val: any) => insert('brands', { ...val, firm_id: getFirmId() }),
        update: (id: number, val: any) => update('brands', id, val),
        delete: (id: number) => remove('brands', id),
        bulkUpsert: (rows: any[]) => bulkUpsert('brands', rows.map(r => ({ ...r, firm_id: getFirmId() }))),
    },
    products: {
        getAll: () => getAll<any>('products', q => q.eq('firm_id', getFirmId())),
        add: (val: any) => insert('products', { ...val, firm_id: getFirmId() }),
        update: (id: number, val: any) => update('products', id, val),
        delete: (id: number) => remove('products', id),
        bulkUpsert: (rows: any[]) => bulkUpsert('products', rows.map(r => ({ ...r, firm_id: getFirmId() }))),
    },
    packing_units: {
        getAll: () => getAll<any>('packing_units', q => q.eq('firm_id', getFirmId())),
        add: (val: any) => insert('packing_units', { ...val, firm_id: getFirmId() }),
        update: (id: number, val: any) => update('packing_units', id, val),
        delete: (id: number) => remove('packing_units', id),
        bulkUpsert: (rows: any[]) => bulkUpsert('packing_units', rows.map(r => ({ ...r, firm_id: getFirmId() }))),
    },
    variant_params_1: {
        getAll: () => getAll<any>('variant_params_1'),
        add: (val: any) => insert('variant_params_1', val),
        update: (id: number, val: any) => update('variant_params_1', id, val),
        delete: (id: number) => remove('variant_params_1', id),
    },
    variant_params_2: {
        getAll: () => getAll<any>('variant_params_2'),
        add: (val: any) => insert('variant_params_2', val),
        update: (id: number, val: any) => update('variant_params_2', id, val),
        delete: (id: number) => remove('variant_params_2', id),
    },
    variant_params_3: {
        getAll: () => getAll<any>('variant_params_3'),
        add: (val: any) => insert('variant_params_3', val),
        update: (id: number, val: any) => update('variant_params_3', id, val),
        delete: (id: number) => remove('variant_params_3', id),
    },

    // ── Items ──────────────────────────────────────────────────────
    items: {
        getAll: () => getAll<any>('items', q => q.eq('firm_id', getFirmId())),
        add: (val: any) => insert('items', { ...val, firm_id: getFirmId(), created_at: new Date().toISOString() }),
        update: (id: number, val: any) => update('items', id, { ...val, updated_at: new Date().toISOString() }),
        delete: (id: number) => remove('items', id),
        bulkUpsert: (rows: any[]) => bulkUpsert('items', rows.map(r => ({ ...r, firm_id: getFirmId() }))),
    },

    // ── CRM ────────────────────────────────────────────────────────
    prospects: {
        getAll: () => getAll<any>('prospects', q => q.eq('firm_id', getFirmId())),
        add: (val: any) => insert('prospects', { ...val, firm_id: getFirmId(), created_at: new Date().toISOString() }),
        update: (id: number, val: any) => update('prospects', id, val),
        delete: (id: number) => remove('prospects', id),
        bulkUpsert: (rows: any[]) => bulkUpsert('prospects', rows.map(r => ({ ...r, firm_id: getFirmId() }))),
    },

    // ── Orders ─────────────────────────────────────────────────────
    orders: {
        getAll: () => getAll<any>('orders', q => q.eq('firm_id', getFirmId())),
        /** Pending payments: dispatched orders where payment is not fully paid */
        getPendingPayments: async () => {
            const { data, error } = await supabase
                .from('orders')
                .select('*, prospects(prospectname, contact)')
                .eq('firm_id', getFirmId())
                .eq('status', 'dispatched')
                .neq('payment_status', 'paid')
                .order('due_date', { ascending: true });
            if (error) throw error;
            return data;
        },
        add: (val: any) => insert('orders', { ...val, firm_id: getFirmId(), created_at: new Date().toISOString() }),
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
        getAll: () => getAll<any>('bills', q => q.eq('firm_id', getFirmId())),
        add: (val: any) => insert('bills', { ...val, firm_id: getFirmId(), created_at: new Date().toISOString() }),
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
        /** Business volume per supplier grouped by month */
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
        getAll: () => getAll<any>('purchase_orders', q =>
            q.eq('firm_id', getFirmId()).select('*, suppliers(name, contact)')),
        getBySupplier: async (supplierId: number) => {
            const { data, error } = await supabase
                .from('purchase_orders')
                .select('*, purchase_order_items(*)')
                .eq('firm_id', getFirmId())
                .eq('supplier_id', supplierId)
                .order('order_date', { ascending: false });
            if (error) throw error;
            return data;
        },
        add: (val: any) => insert('purchase_orders', { ...val, firm_id: getFirmId(), created_at: new Date().toISOString() }),
        update: (id: number, val: any) => update('purchase_orders', id, val),
        delete: (id: number) => remove('purchase_orders', id),
    },
    purchase_order_items: {
        add: (val: any) => insert('purchase_order_items', val),
        update: (id: number, val: any) => update('purchase_order_items', id, val),
        delete: (id: number) => remove('purchase_order_items', id),
    },

    // ── Routes & Visits ────────────────────────────────────────────
    routes: {
        getAll: () => getAll<any>('routes', q => q.eq('firm_id', getFirmId())),
        add: (val: any) => insert('routes', { ...val, firm_id: getFirmId(), created_at: new Date().toISOString() }),
        update: (id: number, val: any) => update('routes', id, val),
        delete: (id: number) => remove('routes', id),
    },
    visits: {
        getAll: () => getAll<any>('visits', q => q.eq('firm_id', getFirmId())),
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
        add: (val: any) => insert('visits', { ...val, firm_id: getFirmId(), created_at: new Date().toISOString() }),
        update: (id: number, val: any) => update('visits', id, val),
        delete: (id: number) => remove('visits', id),
    },
    travel_records: {
        getAll: () => getAll<any>('travel_records', q => q.eq('firm_id', getFirmId())),
        add: (val: any) => insert('travel_records', { ...val, firm_id: getFirmId() }),
        update: (id: number, val: any) => update('travel_records', id, val),
        delete: (id: number) => remove('travel_records', id),
    },

    // ── Media ──────────────────────────────────────────────────────
    product_media: {
        getByItem: async (itemId: number) => {
            const { data, error } = await supabase
                .from('product_media')
                .select('*')
                .eq('item_id', itemId)
                .eq('firm_id', getFirmId());
            if (error) throw error;
            return data;
        },
        add: (val: any) => insert('product_media', { ...val, firm_id: getFirmId(), created_at: new Date().toISOString() }),
        update: (id: number, val: any) => update('product_media', id, val),
        delete: (id: number) => remove('product_media', id),
    },

    // ── Financials ─────────────────────────────────────────────────
    costs: {
        getAll: () => getAll<any>('costs', q => q.eq('firm_id', getFirmId())),
        add: (val: any) => insert('costs', { ...val, firm_id: getFirmId() }),
        update: (id: number, val: any) => update('costs', id, val),
        delete: (id: number) => remove('costs', id),
    },
    account: {
        getAll: () => getAll<any>('account', q => q.eq('firm_id', getFirmId())),
        /** Master admin: get combined P&L across ALL firms */
        getAllFirms: async () => {
            const { data, error } = await supabase
                .from('account')
                .select('*, firms(name, slug)')
                .order('month_year', { ascending: false });
            if (error) throw error;
            return data;
        },
        add: (val: any) => insert('account', { ...val, firm_id: getFirmId() }),
        update: (id: number, val: any) => update('account', id, val),
        delete: (id: number) => remove('account', id),
    },
    marketing_catalogues: {
        getAll: () => getAll<any>('marketing_catalogues', q => q.eq('firm_id', getFirmId())),
        add: (val: any) => insert('marketing_catalogues', { ...val, firm_id: getFirmId(), created_at: new Date().toISOString() }),
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
        /**
         * Revenue + order count per brand for a date range.
         * Joins: brands → items → order_items → orders
         */
        getBrandMetrics: async (from: string, to: string) => {
            const isAdmin = getRole() === 'master_admin';

            // Pull all orders in the range for this firm, with their items + brand
            let oiQuery = supabase
                .from('order_items')
                .select(`
                    total,
                    items!inner(brand_id, vertical_id, retail_price_container, stock_parcels),
                    orders!inner(created_at, firm_id, grand_total)
                `)
                .gte('orders.created_at', from)
                .lte('orders.created_at', to);

            if (!isAdmin) oiQuery = oiQuery.eq('orders.firm_id', getFirmId());

            const { data: orderItems, error } = await oiQuery;
            if (error) throw error;

            // Pull brands + verticals for name resolution
            let brandsQuery = supabase
                .from('brands')
                .select('id, name, vertical_id, verticals(name)');

            if (!isAdmin) brandsQuery = brandsQuery.eq('firm_id', getFirmId());

            const { data: brands } = await brandsQuery;

            // Aggregate revenue per brand_id
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

        /**
         * Total revenue (orders), procurement cost (purchase_orders), and
         * operational costs (costs table) for the period.
         */
        getAccountFlow: async (from: string, to: string) => {
            const firmId = getFirmId();
            const isAdmin = getRole() === 'master_admin';

            let oQ = supabase.from('orders').select('grand_total, paid_amount, due_amount').gte('created_at', from).lte('created_at', to);
            let pQ = supabase.from('purchase_orders').select('total_cost').gte('created_at', from).lte('created_at', to);
            let cQ = supabase.from('costs').select('amount').gte('date', from.split('T')[0]).lte('date', to.split('T')[0]);

            if (!isAdmin) {
                oQ = oQ.eq('firm_id', firmId);
                pQ = pQ.eq('firm_id', firmId);
                cQ = cQ.eq('firm_id', firmId);
            }

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

        /**
         * Revenue per vertical for the period.
         */
        getVerticalSummary: async (from: string, to: string) => {
            const isAdmin = getRole() === 'master_admin';
            let q = supabase
                .from('order_items')
                .select('total, items!inner(vertical_id, verticals!inner(name)), orders!inner(created_at, firm_id)')
                .gte('orders.created_at', from)
                .lte('orders.created_at', to);

            if (!isAdmin) q = q.eq('orders.firm_id', getFirmId());

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
        /** Full sales summary for a period: orders + order_items + prospects */
        getSalesSummary: async (from: string, to: string) => {
            const firmId = getFirmId();
            const { data: orders, error } = await supabase
                .from('orders')
                .select('*, prospects(prospectname, contact, area_town)')
                .eq('firm_id', firmId)
                .gte('created_at', from)
                .lte('created_at', to)
                .order('created_at', { ascending: false });
            if (error) throw error;

            const revenue = (orders ?? []).reduce((s: number, o: any) => s + Number(o.grand_total ?? 0), 0);
            const collected = (orders ?? []).reduce((s: number, o: any) => s + Number(o.paid_amount ?? 0), 0);
            const due = (orders ?? []).reduce((s: number, o: any) => s + Number(o.due_amount ?? 0), 0);
            return { orders: orders ?? [], revenue, collected, due, count: (orders ?? []).length };
        },

        /** Top prospects by revenue for a period */
        getTopProspects: async (from: string, to: string, limit = 10) => {
            const { data, error } = await supabase
                .from('orders')
                .select('prospect_id, prospect_name, grand_total, paid_amount, due_amount')
                .eq('firm_id', getFirmId())
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

        /** Stock snapshot: all items with stock value */
        getStockSnapshot: async () => {
            const { data, error } = await supabase
                .from('items')
                .select('item_name, category, stock_parcels, stock_units, retail_price_container, wholesale_price_container, p_unit, p_unit_per_parcel')
                .eq('firm_id', getFirmId())
                .order('stock_parcels', { ascending: false });
            if (error) throw error;
            return (data ?? []).map((i: any) => ({
                ...i,
                stock_value: Number(i.stock_parcels ?? 0) * Number(i.retail_price_container ?? 0),
            }));
        },

        /** Customer dues: all pending payment orders */
        getCustomerDues: async () => {
            const { data, error } = await supabase
                .from('orders')
                .select('*, prospects(prospectname, contact)')
                .eq('firm_id', getFirmId())
                .gt('due_amount', 0)
                .order('due_amount', { ascending: false });
            if (error) throw error;
            return data ?? [];
        },

        /** Items sold in period (for item-wise P&L) */
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

    // ── Warehouse ──────────────────────────────────────────────────
    warehouse: {
        getLayouts: () => getAll<any>('warehouse_layout', q => q.eq('firm_id', getFirmId())),
        addLayout: (val: any) => insert('warehouse_layout', { ...val, firm_id: getFirmId() }),
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


