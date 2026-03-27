import { useState, useEffect, useCallback, useRef } from 'react';
import { DAL, getFirmId } from '@/db/dal';
import { supabase } from '@/db/supabase';
import { useAppStore } from '@/store/store';
import {
    Database, Plus, Save, Trash2, RefreshCw, Check, Copy, ChevronDown, X, Play
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────
interface ColDef {
    name: string;
    header: string;
    type: 'text' | 'number' | 'select' | 'date';
    required?: boolean;
    fkTable?: string;
    fkLabel?: string;
    defaultValue?: any;
    hint?: string;
    width?: number;
}



// ─── Column definitions (your original, + new tables added) ──────
const TABLE_COLUMNS: Record<string, ColDef[]> = {
    verticals: [
        { name: 'name', header: 'Vertical Name', type: 'text', required: true, hint: 'e.g. Stationery, Fireworks', width: 260 },
        { name: 'sort_order', header: 'Sort Order', type: 'number', defaultValue: 0, hint: 'Lower = appears first', width: 100 },
    ],
    brands: [
        { name: 'name', header: 'Brand Name', type: 'text', required: true, width: 200 },
        { name: 'vertical_id', header: 'Vertical', type: 'select', fkTable: 'verticals', fkLabel: 'name', width: 180 },
    ],
    products: [
        { name: 'name', header: 'Product Name', type: 'text', required: true, width: 200 },
        { name: 'vertical_id', header: 'Vertical', type: 'select', fkTable: 'verticals', fkLabel: 'name', width: 180 },
    ],
    packing_units: [
        { name: 'unit_name', header: 'Unit Name', type: 'text', required: true, width: 200 },
        { name: 'multiplier', header: 'Multiplier', type: 'number', defaultValue: 1, width: 100 },
    ],
    variant_params_1: [
        { name: 'name', header: 'Size Name', type: 'text', required: true, hint: 'e.g. Large, Medium, Small', width: 260 },
    ],
    variant_params_2: [
        { name: 'name', header: 'Frequency Name', type: 'text', required: true, hint: 'e.g. 172 pages, 140 pages', width: 260 },
    ],
    variant_params_3: [
        { name: 'name', header: 'Spec Name', type: 'text', required: true, hint: 'e.g. Single Line, Square Line', width: 260 },
    ],
    items: [
        { name: 'keyword_id', header: 'Keyword ID', type: 'text', required: true, width: 140 },
        { name: 'item_name', header: 'Item Name', type: 'text', required: true, width: 220 },
        { name: 'product_id', header: 'Product', type: 'select', fkTable: 'products', fkLabel: 'name', width: 160 },
        { name: 'brand_id', header: 'Brand', type: 'select', fkTable: 'brands', fkLabel: 'name', width: 140 },
        { name: 'vertical_id', header: 'Vertical', type: 'select', fkTable: 'verticals', fkLabel: 'name', width: 140 },
        { name: 'variant_param1_id', header: 'Size', type: 'select', fkTable: 'variant_params_1', fkLabel: 'name', width: 120 },
        { name: 'variant_param2_id', header: 'Frequency', type: 'select', fkTable: 'variant_params_2', fkLabel: 'name', width: 120 },
        { name: 'variant_param3_id', header: 'Spec', type: 'select', fkTable: 'variant_params_3', fkLabel: 'name', width: 120 },
        { name: 'thumbnail_base64', header: 'Thumbnail', type: 'text', width: 120 },
    ],
    stock_details: [
        { name: 'item_id', header: 'Item', type: 'select', fkTable: 'items', fkLabel: 'item_name', width: 180 },
        { name: 'unit_multiplier', header: 'Unit Multiplier', type: 'number', required: true, width: 120 },
        { name: 'unit_multiplier_name', header: 'Unit Name', type: 'text', required: true, width: 120 },
        { name: 'pack_multiplier', header: 'Pack Multiplier', type: 'number', required: true, width: 120 },
        { name: 'pack_multiplier_name', header: 'Pack Name', type: 'text', required: true, width: 120 },
        { name: 'retail_unit_price', header: 'Retail Unit Price', type: 'number', required: true, width: 120 },
        { name: 'wholesale_unit_price', header: 'Wholesale Unit Price', type: 'number', required: true, width: 120 },
        { name: 'is_active', header: 'Active?', type: 'text', defaultValue: 'true', width: 100 },
        { name: 'discount_cap_percent', header: 'Discount Cap %', type: 'number', width: 120 },
    ],
    prospects: [
        { name: 'prospectname', header: 'Customer Name', type: 'text', required: true, width: 200 },
        { name: 'area_town', header: 'Area / Town', type: 'text', width: 160 },
        { name: 'contact', header: 'Contact', type: 'text', width: 140 },
        { name: 'business_type', header: 'Type', type: 'text', width: 120 },
        { name: 'route_id', header: 'Route', type: 'select', fkTable: 'routes', fkLabel: 'name', width: 140 },
        { name: 'notes', header: 'Notes', type: 'text', width: 250 },
    ],
    routes: [
        { name: 'name', header: 'Route Name', type: 'text', required: true, width: 200 },
        { name: 'description', header: 'Description', type: 'text', width: 250 },
        { name: 'color_tag', header: 'Color', type: 'text', defaultValue: '#4f46e5', width: 100 },
    ],
    suppliers: [
        { name: 'name', header: 'Supplier Name', type: 'text', required: true, width: 200 },
        { name: 'contact', header: 'Contact', type: 'text', width: 150 },
        { name: 'address', header: 'Address', type: 'text', width: 250 },
        { name: 'notes', header: 'Notes', type: 'text', width: 250 },
    ],
    cost_types: [
        { name: 'cost_type_name', header: 'Cost Type', type: 'text', required: true, width: 200 },
    ],
    costs: [
        { name: 'cost_type_id', header: 'Cost Type', type: 'select', fkTable: 'cost_types', fkLabel: 'cost_type_name', width: 160 },
        { name: 'amount', header: 'Amount ₹', type: 'number', required: true, defaultValue: 0, width: 120 },
        { name: 'description', header: 'Description', type: 'text', width: 250 },
        { name: 'date', header: 'Date', type: 'date', defaultValue: new Date().toISOString().split('T')[0], width: 130 },
        { name: 'sales_order_id', header: 'Sales Order ID', type: 'number', width: 130 },
        { name: 'purchase_order_id', header: 'Purchase Order ID', type: 'number', width: 130 },
    ],
    sales_orders: [
        { name: 'prospect_id', header: 'Customer', type: 'select', fkTable: 'prospects', fkLabel: 'prospectname', width: 180 },
        { name: 'grand_total', header: 'Total ₹', type: 'number', width: 100 },
        { name: 'paid_amount', header: 'Paid ₹', type: 'number', width: 100 },
        { name: 'due_amount', header: 'Due ₹', type: 'number', width: 100 },
        { name: 'end_of_sale', header: 'Ended', type: 'text', width: 80 },
    ],
    bills: [
        { name: 'bill_number', header: 'Bill #', type: 'text', required: true, width: 120 },
        { name: 'prospect_id', header: 'Customer', type: 'select', fkTable: 'prospects', fkLabel: 'prospectname', width: 180 },
        { name: 'grand_total', header: 'Amount ₹', type: 'number', required: true, width: 120 },
        { name: 'paid_amount', header: 'Paid ₹', type: 'number', required: true, width: 120 },
        { name: 'notes', header: 'Notes', type: 'text', width: 200 },
    ],
    visits: [
        { name: 'prospect_id', header: 'Prospect', type: 'select', fkTable: 'prospects', fkLabel: 'prospectname', width: 180 },
        { name: 'route_id', header: 'Route', type: 'select', fkTable: 'routes', fkLabel: 'name', width: 150 },
        { name: 'visit_date', header: 'Date', type: 'date', width: 130 },
        { name: 'reason_response', header: 'Reason/Response', type: 'text', width: 200 },
        { name: 'notes', header: 'Notes', type: 'text', width: 250 },
        { name: 'next_visit_plan', header: 'Next Visit', type: 'date', width: 130 },
    ],
    account: [
        { name: 'month_year', header: 'Month/Year', type: 'text', width: 120 },
        { name: 'total_revenue', header: 'Revenue ₹', type: 'number', width: 120 },
        { name: 'total_cost', header: 'Cost ₹', type: 'number', width: 120 },
        { name: 'profit', header: 'Profit ₹', type: 'number', width: 120 },
    ],
    purchase_log: [
        { name: 'supplier_id', header: 'Supplier', type: 'select', fkTable: 'suppliers', fkLabel: 'name', width: 180 },
        { name: 'total_amount', header: 'Total Amount ₹', type: 'number', required: true, width: 140 },
        { name: 'purchase_date', header: 'Purchase Date', type: 'date', required: true, width: 130 },
        { name: 'shipment_date', header: 'Shipment Date', type: 'date', width: 130 },
    ],
    purchase_orders: [
        { name: 'item_keyword', header: 'Item Keyword', type: 'text', required: true, width: 160 },
        { name: 'purchase_rate', header: 'Rate ₹', type: 'number', required: true, width: 120 },
        { name: 'purchase_log_id', header: 'Log ID', type: 'number', width: 100 },
    ],
    // ── New location tables ──────────────────────────────────────
    storage_places: [
        { name: 'place_name', header: 'Place Name', type: 'text', required: true, hint: 'e.g. KT Shop', width: 200 },
        { name: 'place_slug', header: 'Slug', type: 'text', required: true, hint: 'e.g. KT', width: 100 },
        { name: 'place_type', header: 'Type', type: 'text', hint: 'shop / warehouse / godown', width: 130 },
        { name: 'floor_count', header: 'Floors', type: 'number', defaultValue: 1, width: 80 },
        { name: 'notes', header: 'Notes', type: 'text', width: 200 },
    ],
    storage_zones: [
        { name: 'place_id', header: 'Place', type: 'select', fkTable: 'storage_places', fkLabel: 'place_name', width: 160 },
        { name: 'floor_num', header: 'Floor', type: 'number', defaultValue: 0, width: 80 },
        { name: 'zone_name', header: 'Zone Name', type: 'text', required: true, hint: 'e.g. Front Section', width: 180 },
        { name: 'zone_slug', header: 'Slug', type: 'text', required: true, hint: 'e.g. FR', width: 80 },
        { name: 'notes', header: 'Notes', type: 'text', width: 180 },
    ],
    storage_slots: [
        { name: 'zone_id', header: 'Zone', type: 'select', fkTable: 'storage_zones', fkLabel: 'zone_label', width: 160 },
        { name: 'slot_name', header: 'Slot Name', type: 'text', required: true, hint: 'e.g. Stack A', width: 180 },
        { name: 'capacity_parcels', header: 'Capacity', type: 'number', width: 100 },
        { name: 'notes', header: 'Notes', type: 'text', width: 180 },
    ],
};

const TABLE_LIST = [
    { group: 'Reference Data', tables: ['verticals', 'brands', 'products', 'packing_units', 'variant_params_1', 'variant_params_2', 'variant_params_3'] },
    { group: 'Inventory', tables: ['items', 'stock_details'] },
    { group: 'Locations', tables: ['storage_places', 'storage_zones', 'storage_slots'] },
    { group: 'CRM', tables: ['prospects', 'routes', 'visits'] },
    { group: 'Sales', tables: ['sales_orders', 'bills'] },
    { group: 'Procurement', tables: ['suppliers', 'purchase_orders', 'purchase_log'] },
    { group: 'Finance', tables: ['cost_types', 'costs', 'account'] },
];

const EDITABLE_TABLES = new Set([
    'verticals', 'brands', 'products', 'packing_units', 'items', 'stock_details',
    'prospects', 'routes', 'cost_types', 'costs', 'suppliers', 'visits', 'purchase_orders', 'purchase_log',
    'variant_params_1', 'variant_params_2', 'variant_params_3',
    'storage_places', 'storage_zones', 'storage_slots', 'sales_orders'
]);

const TABLE_LABELS: Record<string, string> = {
    verticals: 'Verticals', brands: 'Brands', products: 'Products', packing_units: 'Packing Units',
    items: 'Items / SKUs', stock_details: 'Stock & Pricing', prospects: 'Prospects', routes: 'Routes', suppliers: 'Suppliers',
    cost_types: 'Cost Types', costs: 'Costs', sales_orders: 'Sales Orders', bills: 'Bills', visits: 'Visits', account: 'Account',
    purchase_orders: 'Purchase Orders', purchase_log: 'Purchase Log',
    variant_params_1: 'Sizes (VP1)', variant_params_2: 'Frequency (VP2)', variant_params_3: 'Specs (VP3)',
    storage_places: 'Storage Places', storage_zones: 'Storage Zones', storage_slots: 'Storage Slots',
};

// Columns that are auto-generated or system-managed — stripped before save
const SYSTEM_COLS = new Set([
    '_key', 'firm_id', 'created_at', 'updated_at',
    '_dirty', 'tsvector_search', 'zone_label', 'slot_label',
]);



// ─── Main Component ───────────────────────────────────────────────
export default function DBEditor() {
    const addToast = useAppStore((s) => s.addToast);

    // ── Spreadsheet state (your original) ────────────────────────
    const [selectedTable, setSelectedTable] = useState('verticals');
    const [rows, setRows] = useState<any[]>([]);
    const [fkData, setFkData] = useState<Record<string, any[]>>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [isDirty, setIsDirty] = useState(false);
    const [activeCell, setActiveCell] = useState<{ rowKey: string; col: string } | null>(null);
    const tableRef = useRef<HTMLDivElement>(null);



    // ── Paste Rows modal state ────────────────────────────────────
    const [showPasteModal, setShowPasteModal] = useState(false);
    const [pasteText, setPasteText] = useState('');
    const [pastePreview, setPastePreview] = useState<{ headers: string[]; rows: any[][] } | null>(null);
    const [isPasting, setIsPasting] = useState(false);

    const colDefs = TABLE_COLUMNS[selectedTable] ?? [];
    const isEditable = EDITABLE_TABLES.has(selectedTable);

    // ── Load FK dropdown data ─────────────────────────────────────
    useEffect(() => {
        const fkTables = [...new Set(colDefs.filter((c) => c.fkTable).map((c) => c.fkTable!))];
        Promise.all(
            fkTables.map(async (t) => {
                const dal = (DAL as any)[t];
                if (!dal?.getAll) return [t, []];
                const data = await dal.getAll().catch(() => []);
                return [t, data];
            })
        ).then((results) => {
            const map: Record<string, any[]> = {};
            results.forEach(([t, data]) => { map[t as string] = data as any[]; });
            setFkData(map);
        });
    }, [selectedTable]);

    // ── Load rows ─────────────────────────────────────────────────
    const loadRows = useCallback(async () => {
        setLoading(true);
        try {
            const dal = (DAL as any)[selectedTable];
            if (!dal?.getAll) { setLoading(false); return; }
            const data = await dal.getAll();
            setRows((data ?? []).map((r: any, i: number) => ({ ...r, _key: r.id ?? `row-${i}` })));
            setIsDirty(false);
        } catch (e: any) {
            addToast(`Load error: ${e.message}`, 'error');
        } finally {
            setLoading(false);
        }
    }, [selectedTable, addToast]);

    useEffect(() => { loadRows(); }, [loadRows]);



    // ── Cell / row operations (your original logic, unchanged) ────
    const updateCell = (rowKey: string, field: string, val: any) => {
        setRows((prev) => prev.map((r) => r._key === rowKey ? { ...r, [field]: val, _dirty: true } : r));
        setIsDirty(true);
    };

    const addRow = () => {
        const newRow: any = { _key: `new-${Date.now()}`, _dirty: true };
        colDefs.forEach((c) => { newRow[c.name] = c.defaultValue ?? (c.type === 'number' ? 0 : ''); });
        setRows((prev) => [...prev, newRow]);
        setIsDirty(true);
        setTimeout(() => tableRef.current?.scrollTo({ top: tableRef.current.scrollHeight, behavior: 'smooth' }), 50);
    };

    const duplicateRow = (rowKey: string) => {
        const source = rows.find((r) => String(r._key) === rowKey);
        if (!source) return;
        const { _key, id, created_at, updated_at, keyword_id, zone_label, slot_label, ...rest } = source;
        const dup: any = { ...rest, _key: `new-${Date.now()}`, _dirty: true };
        const idx = rows.findIndex((r) => String(r._key) === rowKey);
        setRows((prev) => { const next = [...prev]; next.splice(idx + 1, 0, dup); return next; });
        setIsDirty(true);
        addToast('Row duplicated — edit and save', 'info');
    };

    const deleteRow = (rowKey: string) => {
        const row = rows.find((r) => String(r._key) === rowKey);
        if (!row) return;
        if (row.id && !confirm('Delete this row permanently?')) return;
        (async () => {
            if (row.id) {
                try { await (DAL as any)[selectedTable].delete(row.id); }
                catch (e: any) { addToast(`Delete error: ${e.message}`, 'error'); return; }
            }
            setRows((prev) => prev.filter((r) => String(r._key) !== rowKey));
            addToast('Row deleted', 'success');
        })();
    };

    const saveAll = async () => {
        for (const row of rows) {
            for (const col of colDefs.filter((c) => c.required)) {
                const v = row[col.name];
                if (v === null || v === undefined || v === '') {
                    addToast(`"${col.header}" is required — fill all highlighted cells`, 'error');
                    return;
                }
            }
        }
        setSaving(true);
        try {
            const dal = (DAL as any)[selectedTable];

            // Split into new rows (no id) and existing rows (have id)
            // This prevents bulkUpsert from trying onConflict: 'id' with id=undefined,
            // which causes "Missing required field: id" on Postgres GENERATED ALWAYS columns.
            const newRows: any[] = [];
            const existingRows: any[] = [];

            rows.forEach((row) => {
                if (row.id && !row._dirty) return; // SKIP non-dirty existing rows
                
                const out: any = {};
                for (const [k, v] of Object.entries(row)) {
                    if (SYSTEM_COLS.has(k)) continue;
                    if (k === 'id' && !v) continue; // strip falsy id
                    out[k] = v === '' ? null : v;
                }
                if (row.id) {
                    existingRows.push(out);
                } else {
                    newRows.push(out);
                }
            });

            // Insert new rows (no conflict key needed — DB auto-generates id)
            if (newRows.length > 0) {
                const toInsert = FIRM_SCOPED_TABLES.has(selectedTable) && getFirmId()
                    ? newRows.map((r: any) => ({ ...r, firm_id: getFirmId() }))
                    : newRows;
                const { error } = await supabase.from(selectedTable).insert(toInsert);
                if (error) throw error;
            }

            // Upsert existing rows (conflict on id)
            if (existingRows.length > 0) {
                await dal.bulkUpsert(existingRows);
            }

            addToast(`✓ Saved ${existingRows.length + newRows.length} modified row(s)`, 'success');
            loadRows();
        } catch (e: any) {
            const msg = e?.message ?? String(e);
            let friendly = msg;
            if (msg.includes('violates not-null constraint')) {
                const col = msg.match(/column "(\w+)"/)?.[1];
                friendly = `Missing required field: "${col}"`;
            } else if (msg.includes('violates foreign key constraint')) {
                friendly = 'Invalid reference — selected value doesn\'t exist in related table';
            } else if (msg.includes('violates unique constraint')) {
                friendly = 'Duplicate value — must be unique';
            } else if (msg.includes('invalid input syntax')) {
                const type = msg.match(/for type (\w+)/)?.[1];
                friendly = `Invalid format for type "${type}"`;
            }
            addToast(`Save error: ${friendly}`, 'error');
        } finally {
            setSaving(false);
        }
    };

    // ── Paste Rows logic ──────────────────────────────────────────
    const parsePasteText = (text: string) => {
        const lines = text.trim().split('\n').filter(Boolean);
        if (lines.length === 0) return null;

        // First line = headers (column names from Excel/Sheets)
        const headers = lines[0].split('\t').map(h => h.trim().toLowerCase().replace(/\s+/g, '_'));
        const dataRows = lines.slice(1).map(line =>
            line.split('\t').map(cell => cell.trim())
        );
        return { headers, rows: dataRows };
    };

    const handlePasteTextChange = (text: string) => {
        setPasteText(text);
        if (!text.trim()) { setPastePreview(null); return; }
        const parsed = parsePasteText(text);
        setPastePreview(parsed);
    };

    const FIRM_SCOPED_TABLES = new Set([
        'items', 'prospects', 'orders', 'bills', 'routes', 'visits',
        'costs', 'account', 'purchase_orders', 'storage_places',
        'storage_zones', 'storage_slots', 'subcategories',
    ]);

    const executePaste = async () => {
        if (!pastePreview || pastePreview.rows.length === 0) return;
        setIsPasting(true);
        try {
            const { headers, rows: dataRows } = pastePreview;
            const colNames = colDefs.map(c => c.name);

            // Map pasted headers to colDef field names (fuzzy match)
            const headerMap: Record<number, string> = {};
            headers.forEach((h, i) => {
                // Exact match first
                if (colNames.includes(h)) { headerMap[i] = h; return; }
                // Partial match — e.g. "item name" → "item_name"
                const match = colNames.find(c => c.includes(h) || h.includes(c));
                if (match) headerMap[i] = match;
            });

            const mapped = dataRows.map(cells => {
                const row: any = {};
                cells.forEach((cell, i) => {
                    const field = headerMap[i];
                    if (!field) return;
                    const colDef = colDefs.find(c => c.name === field);
                    if (!colDef) return;
                    // Type coercion
                    if (colDef.type === 'number') {
                        row[field] = cell === '' ? null : Number(cell.replace(/,/g, ''));
                    } else {
                        row[field] = cell === '' ? null : cell;
                    }
                });
                return row;
            }).filter(r => Object.keys(r).length > 0);

            if (mapped.length === 0) {
                addToast('No columns matched — check that your header row matches table column names', 'error');
                return;
            }

            const dal = (DAL as any)[selectedTable];
            await dal.bulkUpsert(mapped);
            addToast(`✓ Pasted ${mapped.length} row${mapped.length !== 1 ? 's' : ''} into ${TABLE_LABELS[selectedTable]}`, 'success');
            setShowPasteModal(false);
            setPasteText('');
            setPastePreview(null);
            loadRows();
        } catch (e: any) {
            addToast(`Paste error: ${e.message}`, 'error');
        } finally {
            setIsPasting(false);
        }
    };

    const fkLabel = (col: ColDef, val: any): string => {
        if (!col.fkTable || val == null) return '';
        const item = (fkData[col.fkTable] ?? []).find((o: any) => o.id === val);
        return item?.[col.fkLabel!] ?? String(val);
    };



    // ─────────────────────────────────────────────────────────────
    return (
        <div className="animate-fade-in flex flex-col h-full">

            {/* ── Top Bar ─────── */}
            <div className="flex items-center gap-2 sm:gap-3 px-2 py-2 border-b border-surface-200 flex-shrink-0 flex-wrap bg-surface-50">
                <Database className="h-4 w-4 text-brand-500 flex-shrink-0 hidden sm:block" />

                <div className="relative">
                    <select
                        value={selectedTable}
                        onChange={(e) => {
                            if (isDirty && !confirm('Unsaved changes. Switch table?')) return;
                            setSelectedTable(e.target.value); setActiveCell(null);
                        }}
                        className="appearance-none bg-surface-100 text-surface-900 text-xs sm:text-sm font-semibold pl-2 sm:pl-3 pr-7 sm:pr-8 py-1.5 rounded-lg border border-surface-200 cursor-pointer focus:ring-2 focus:ring-brand-400 focus:outline-none"
                    >
                        {TABLE_LIST.map((g) => (
                            <optgroup key={g.group} label={g.group}>
                                {g.tables.map((t) => (
                                    <option key={t} value={t}>{TABLE_LABELS[t] ?? t}</option>
                                ))}
                            </optgroup>
                        ))}
                    </select>
                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-surface-400 pointer-events-none" />
                </div>

                <span className="text-[10px] sm:text-xs text-surface-500 flex items-center gap-1.5">
                    {rows.length} record{rows.length !== 1 ? 's' : ''}
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" title="Connected" />
                </span>

                <div className="flex-1 hidden sm:block" />

                {isEditable && (
                    <div className="flex items-center gap-1.5 sm:gap-2 ml-auto sm:ml-0">
                        <button
                            onClick={addRow}
                            className="text-[10px] sm:text-xs flex items-center gap-1 py-1 sm:py-1.5 px-2 sm:px-3 rounded-lg bg-brand-50 text-brand-700 border border-brand-200 hover:bg-brand-100 transition-colors"
                        >
                            <Plus className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> <span className="hidden sm:inline">Add Row</span><span className="sm:hidden">Add</span>
                        </button>
                        <button
                            onClick={() => setShowPasteModal(true)}
                            className="text-[10px] sm:text-xs flex items-center gap-1 py-1 sm:py-1.5 px-2 sm:px-3 rounded-lg bg-violet-50 text-violet-700 border border-violet-200 hover:bg-violet-100 transition-colors hidden md:flex"
                            title="Paste rows from Excel or Google Sheets"
                        >
                            <Copy className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> <span className="hidden lg:inline">Paste Rows</span><span className="lg:hidden">Paste</span>
                        </button>
                        <button
                            onClick={saveAll}
                            disabled={!isDirty || saving}
                            className={`text-[10px] sm:text-xs flex items-center gap-1 py-1 sm:py-1.5 px-2 sm:px-4 rounded-lg font-semibold transition-all ${isDirty
                                    ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm'
                                    : 'bg-surface-100 text-surface-400 cursor-default'
                                }`}
                        >
                            {saving ? <RefreshCw className="h-3 w-3 sm:h-3.5 sm:w-3.5 animate-spin" /> : isDirty ? <Save className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> : <Check className="h-3 w-3 sm:h-3.5 sm:w-3.5" />}
                            <span className="hidden sm:inline">{saving ? 'Saving…' : isDirty ? 'Save All' : 'Saved'}</span>
                        </button>
                    </div>
                )}

                <button onClick={loadRows} className="p-1 sm:p-1.5 rounded-lg hover:bg-surface-100 transition-colors" title="Refresh">
                    <RefreshCw className={`h-3.5 w-3.5 text-surface-400 ${loading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            {/* ── Spreadsheet Grid ─ */}
            <div ref={tableRef} className="overflow-auto bg-white flex-1" style={{ minHeight: 0 }}>
                {loading ? (
                    <div className="flex items-center justify-center h-full text-surface-400 text-sm gap-2">
                        <RefreshCw className="h-4 w-4 animate-spin" /> Loading…
                    </div>
                ) : rows.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
                        <Database className="h-10 w-10 text-surface-300" />
                        <p className="text-surface-500 text-sm">No records in <strong>{TABLE_LABELS[selectedTable]}</strong></p>
                        {isEditable && (
                            <button onClick={addRow} className="btn-primary text-sm py-2 px-5 rounded-lg">
                                + Add First Row
                            </button>
                        )}
                    </div>
                ) : (
                    <table
                        className="w-full border-collapse text-sm"
                        style={{ minWidth: colDefs.reduce((s, c) => s + (c.width || 120), 100) }}
                    >
                        <thead className="sticky top-0 z-10">
                            <tr className="bg-surface-100 border-b border-surface-200">
                                <th className="px-2 py-2 text-left text-[11px] font-semibold text-surface-500 uppercase tracking-wide w-[60px] bg-surface-100">#</th>
                                {colDefs.map((col) => (
                                    <th
                                        key={col.name}
                                        className="px-2 py-2 text-left text-[11px] font-semibold text-surface-500 uppercase tracking-wide bg-surface-100 border-l border-surface-200"
                                        style={{ minWidth: col.width || 120 }}
                                    >
                                        <span className="flex items-center gap-1">
                                            {col.required && <span className="text-red-400">*</span>}
                                            {col.header}
                                        </span>
                                    </th>
                                ))}
                                {isEditable && (
                                    <th className="px-2 py-2 text-center text-[11px] font-semibold text-surface-500 uppercase tracking-wide w-[80px] bg-surface-100 border-l border-surface-200">
                                        Actions
                                    </th>
                                )}
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((row, idx) => {
                                const rowKey = String(row._key);
                                const isNew = !row.id;
                                return (
                                    <tr
                                        key={rowKey}
                                        className={`border-b border-surface-100 transition-colors ${isNew ? 'bg-amber-50/50' : idx % 2 === 0 ? 'bg-white' : 'bg-surface-50/50'
                                            } hover:bg-brand-50/30`}
                                    >
                                        <td className="px-2 py-1.5 text-xs text-surface-400 font-mono">
                                            {isNew ? <span className="text-amber-500 font-semibold text-[10px]">NEW</span> : idx + 1}
                                        </td>
                                        {colDefs.map((col) => {
                                            const isActive = activeCell?.rowKey === rowKey && activeCell?.col === col.name;
                                            const val = row[col.name];
                                            const isEmpty = col.required && (val === null || val === undefined || val === '');
                                            return (
                                                <td
                                                    key={col.name}
                                                    className={`px-1 py-0.5 border-l border-surface-100 ${isActive ? 'ring-2 ring-inset ring-brand-400' : ''} ${isEmpty ? 'bg-red-50/50' : ''}`}
                                                    onClick={() => isEditable && setActiveCell({ rowKey, col: col.name })}
                                                >
                                                    {isEditable && isActive ? (
                                                        col.type === 'select' ? (
                                                            <select
                                                                autoFocus
                                                                value={val ?? ''}
                                                                onChange={(e) => updateCell(rowKey, col.name, e.target.value ? Number(e.target.value) : null)}
                                                                onBlur={() => setActiveCell(null)}
                                                                className="w-full bg-white text-surface-900 text-xs py-1 px-1.5 border-none outline-none"
                                                            >
                                                                <option value="">— select —</option>
                                                                {(fkData[col.fkTable!] ?? []).map((o: any) => (
                                                                    <option key={o.id} value={o.id}>{o[col.fkLabel!]}</option>
                                                                ))}
                                                            </select>
                                                        ) : (
                                                            <input
                                                                autoFocus
                                                                type={col.type === 'date' ? 'date' : 'text'}
                                                                inputMode={col.type === 'number' ? 'decimal' : undefined}
                                                                value={val ?? ''}
                                                                placeholder={col.hint || ''}
                                                                onChange={(e) => updateCell(
                                                                    rowKey, col.name,
                                                                    col.type === 'number'
                                                                        ? (e.target.value === '' ? null : Number(e.target.value))
                                                                        : e.target.value
                                                                )}
                                                                onBlur={() => setActiveCell(null)}
                                                                onKeyDown={(e) => {
                                                                    if (e.key === 'Enter') setActiveCell(null);
                                                                    if (e.key === 'Tab') {
                                                                        e.preventDefault();
                                                                        const ci = colDefs.findIndex((c) => c.name === col.name);
                                                                        if (ci < colDefs.length - 1) {
                                                                            setActiveCell({ rowKey, col: colDefs[ci + 1].name });
                                                                        } else if (idx < rows.length - 1) {
                                                                            setActiveCell({ rowKey: String(rows[idx + 1]._key), col: colDefs[0].name });
                                                                        }
                                                                    }
                                                                }}
                                                                className="w-full bg-white text-surface-900 text-xs py-1 px-1.5 border-none outline-none"
                                                            />
                                                        )
                                                    ) : (
                                                        <div className="text-xs text-surface-700 py-1 px-1.5 truncate cursor-cell min-h-[28px] flex items-center">
                                                            {col.type === 'select'
                                                                ? fkLabel(col, val) || <span className="text-surface-300">—</span>
                                                                : (val !== null && val !== undefined && val !== '')
                                                                    ? String(val)
                                                                    : <span className="text-surface-300">—</span>
                                                            }
                                                        </div>
                                                    )}
                                                </td>
                                            );
                                        })}
                                        {isEditable && (
                                            <td className="px-1 py-0.5 border-l border-surface-100 text-center">
                                                <div className="flex items-center justify-center gap-0.5">
                                                    <button
                                                        onClick={() => duplicateRow(rowKey)}
                                                        title="Duplicate row"
                                                        className="p-1 rounded hover:bg-surface-200 transition-colors text-surface-400 hover:text-brand-600"
                                                    >
                                                        <Copy className="h-3.5 w-3.5" />
                                                    </button>
                                                    <button
                                                        onClick={() => deleteRow(rowKey)}
                                                        title="Delete row"
                                                        className="p-1 rounded hover:bg-red-50 transition-colors text-surface-400 hover:text-red-500"
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </button>
                                                </div>
                                            </td>
                                        )}
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>



            {/* ── Status Bar ───────────────────────────────────────── */}
            <div className="flex items-center gap-4 px-3 py-1.5 border-t border-surface-200 text-[11px] text-surface-500 flex-shrink-0 bg-surface-50">
                <span><span className="text-red-400">*</span> Required</span>
                <span>Click cell to edit · Tab to move · Enter to confirm</span>

                <span><Copy className="inline h-3 w-3" /> duplicates row</span>
                {isDirty && <span className="text-amber-600 font-medium ml-auto">● Unsaved changes</span>}
            </div>

            {/* ── Paste Rows Modal ──────────────────────────────────── */}
            {showPasteModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 flex flex-col max-h-[85vh]">

                        {/* Modal header */}
                        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-200">
                            <div>
                                <h2 className="text-sm font-semibold text-surface-900">Paste Rows from Excel / Google Sheets</h2>
                                <p className="text-[11px] text-surface-400 mt-0.5">
                                    Copy rows including the header row → paste below. Columns matched by name automatically.
                                </p>
                            </div>
                            <button
                                onClick={() => { setShowPasteModal(false); setPasteText(''); setPastePreview(null); }}
                                className="p-1.5 rounded-lg hover:bg-surface-100 text-surface-400"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        {/* Expected columns hint */}
                        <div className="px-5 py-2 bg-surface-50 border-b border-surface-100">
                            <p className="text-[10px] text-surface-400 font-semibold uppercase tracking-wide mb-1">
                                Expected columns for <span className="text-brand-600">{TABLE_LABELS[selectedTable]}</span>
                            </p>
                            <p className="text-[11px] text-surface-500 font-mono leading-relaxed">
                                {colDefs.map(c => c.name).join(' · ')}
                            </p>
                        </div>

                        {/* Textarea */}
                        <div className="px-5 py-4 flex-1 min-h-0 flex flex-col gap-3">
                            <textarea
                                autoFocus
                                className="flex-1 min-h-[160px] w-full text-xs font-mono bg-surface-50 border border-surface-200 rounded-lg px-3 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-brand-400 placeholder:text-surface-300"
                                placeholder={`Paste tab-separated data here.\nFirst row must be headers.\n\nExample:\nitem_name\tbrand_id\tretail_price_unit\nNotebook 172pg\t3\t45`}
                                value={pasteText}
                                onChange={(e) => handlePasteTextChange(e.target.value)}
                                spellCheck={false}
                            />

                            {/* Preview */}
                            {pastePreview && (
                                <div className="rounded-lg border border-surface-200 overflow-hidden">
                                    <div className="bg-surface-100 px-3 py-1.5 flex items-center justify-between">
                                        <span className="text-[11px] font-semibold text-surface-600">
                                            Preview — {pastePreview.rows.length} row{pastePreview.rows.length !== 1 ? 's' : ''} detected
                                        </span>
                                        <span className="text-[10px] text-surface-400">
                                            {pastePreview.headers.length} columns
                                        </span>
                                    </div>
                                    <div className="overflow-x-auto max-h-[140px] overflow-y-auto">
                                        <table className="w-full text-[11px]">
                                            <thead>
                                                <tr className="bg-surface-50">
                                                    {pastePreview.headers.map((h, i) => {
                                                        const matched = colDefs.some(c => c.name === h || c.name.includes(h) || h.includes(c.name));
                                                        return (
                                                            <th key={i} className={`px-2 py-1 text-left font-semibold border-r border-surface-100 last:border-0 ${matched ? 'text-emerald-700' : 'text-red-400'}`}>
                                                                {h}
                                                                {matched ? ' ✓' : ' ?'}
                                                            </th>
                                                        );
                                                    })}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {pastePreview.rows.slice(0, 4).map((row, ri) => (
                                                    <tr key={ri} className="border-t border-surface-100">
                                                        {row.map((cell, ci) => (
                                                            <td key={ci} className="px-2 py-1 text-surface-600 border-r border-surface-100 last:border-0 truncate max-w-[120px]">
                                                                {cell || <span className="text-surface-300">—</span>}
                                                            </td>
                                                        ))}
                                                    </tr>
                                                ))}
                                                {pastePreview.rows.length > 4 && (
                                                    <tr className="border-t border-surface-100">
                                                        <td colSpan={pastePreview.headers.length} className="px-2 py-1 text-surface-400 text-center">
                                                            + {pastePreview.rows.length - 4} more rows…
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="flex items-center justify-between px-5 py-3 border-t border-surface-200 bg-surface-50 rounded-b-2xl">
                            <p className="text-[11px] text-surface-400">
                                Green headers = matched · Red = unrecognised (will be skipped)
                            </p>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => { setShowPasteModal(false); setPasteText(''); setPastePreview(null); }}
                                    className="text-xs px-4 py-1.5 rounded-lg border border-surface-200 text-surface-600 hover:bg-surface-100 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={executePaste}
                                    disabled={!pastePreview || pastePreview.rows.length === 0 || isPasting}
                                    className="text-xs px-5 py-1.5 rounded-lg bg-violet-600 text-white font-semibold hover:bg-violet-700 transition-colors disabled:opacity-40 flex items-center gap-1.5"
                                >
                                    {isPasting
                                        ? <><div className="h-3 w-3 border border-white border-t-transparent rounded-full animate-spin" /> Inserting…</>
                                        : <><Play className="h-3 w-3" /> Insert {pastePreview?.rows.length ?? 0} Rows</>
                                    }
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}