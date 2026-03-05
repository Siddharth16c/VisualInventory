import { useState, useEffect, useCallback, useRef } from 'react';
import { DAL } from '@/db/dal';
import { useAppStore } from '@/store/store';
import {
    Database, Plus, Save, Trash2, RefreshCw, Check, Copy, ChevronDown,
} from 'lucide-react';

// ─── Column definitions ──────────────────────────────────────────
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

const TABLE_COLUMNS: Record<string, ColDef[]> = {
    verticals: [
        { name: 'name', header: 'Vertical Name', type: 'text', required: true, hint: 'e.g. Stationery, Fireworks', width: 260 },
    ],
    brands: [
        { name: 'name', header: 'Brand Name', type: 'text', required: true, width: 200 },
        { name: 'vertical_id', header: 'Vertical', type: 'select', fkTable: 'verticals', fkLabel: 'name', width: 180 },
    ],
    products: [
        { name: 'name', header: 'Product Name', type: 'text', required: true, width: 200 },
        { name: 'category', header: 'Category', type: 'text', required: true, width: 150 },
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
        { name: 'item_name', header: 'Item Name', type: 'text', required: true, width: 220 },
        { name: 'product_id', header: 'Product', type: 'select', fkTable: 'products', fkLabel: 'name', width: 160 },
        { name: 'brand_id', header: 'Brand', type: 'select', fkTable: 'brands', fkLabel: 'name', width: 140 },
        { name: 'vertical_id', header: 'Vertical', type: 'select', fkTable: 'verticals', fkLabel: 'name', width: 140 },
        { name: 'packing_unit_id', header: 'Pack Unit', type: 'select', fkTable: 'packing_units', fkLabel: 'unit_name', width: 120 },
        { name: 'variant_param1_id', header: 'Size', type: 'select', fkTable: 'variant_params_1', fkLabel: 'name', width: 120 },
        { name: 'variant_param2_id', header: 'Frequency', type: 'select', fkTable: 'variant_params_2', fkLabel: 'name', width: 120 },
        { name: 'variant_param3_id', header: 'Spec', type: 'select', fkTable: 'variant_params_3', fkLabel: 'name', width: 120 },
        { name: 'p_unit', header: 'Qty/Packet', type: 'number', defaultValue: 1, width: 90 },
        { name: 'p_unit_per_parcel', header: 'Qty/Parcel', type: 'number', defaultValue: 1, width: 90 },
        { name: 'stock_parcels', header: 'Stock (P)', type: 'number', defaultValue: 0, width: 80 },
        { name: 'stock_units', header: 'Stock (U)', type: 'number', defaultValue: 0, width: 80 },
        { name: 'retail_price_unit', header: 'Price/Unit ₹', type: 'number', defaultValue: 0, width: 100 },
        { name: 'retail_price_container', header: 'Price/Pkg ₹', type: 'number', defaultValue: 0, width: 100 },
        { name: 'wholesale_price_unit', header: 'WS/Unit ₹', type: 'number', defaultValue: 0, width: 100 },
        { name: 'wholesale_price_container', header: 'WS/Pkg ₹', type: 'number', defaultValue: 0, width: 100 },
    ],
    prospects: [
        { name: 'prospectname', header: 'Customer Name', type: 'text', required: true, width: 200 },
        { name: 'area_town', header: 'Area / Town', type: 'text', width: 160 },
        { name: 'contact', header: 'Contact', type: 'text', width: 140 },
        { name: 'business_type', header: 'Type', type: 'text', width: 120 },
        { name: 'route_id', header: 'Route', type: 'select', fkTable: 'routes', fkLabel: 'name', width: 140 },
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
        { name: 'vertical_id', header: 'Vertical', type: 'select', fkTable: 'verticals', fkLabel: 'name', width: 150 },
    ],
    costs: [
        { name: 'cost_type', header: 'Cost Type', type: 'text', required: true, width: 160 },
        { name: 'amount', header: 'Amount ₹', type: 'number', required: true, defaultValue: 0, width: 120 },
        { name: 'description', header: 'Description', type: 'text', width: 250 },
        { name: 'date', header: 'Date', type: 'date', defaultValue: new Date().toISOString().split('T')[0], width: 130 },
    ],
    orders: [
        { name: 'prospect_name', header: 'Customer', type: 'text', width: 180 },
        { name: 'status', header: 'Status', type: 'text', width: 100 },
        { name: 'grand_total', header: 'Total ₹', type: 'number', width: 100 },
        { name: 'paid_amount', header: 'Paid ₹', type: 'number', width: 100 },
        { name: 'due_amount', header: 'Due ₹', type: 'number', width: 100 },
    ],
    bills: [
        { name: 'bill_number', header: 'Bill #', type: 'text', width: 120 },
        { name: 'order_id', header: 'Order ID', type: 'number', width: 100 },
        { name: 'amount', header: 'Amount ₹', type: 'number', width: 120 },
    ],
    visits: [
        { name: 'prospect_id', header: 'Prospect', type: 'select', fkTable: 'prospects', fkLabel: 'prospectname', width: 180 },
        { name: 'route_id', header: 'Route', type: 'select', fkTable: 'routes', fkLabel: 'name', width: 150 },
        { name: 'visit_date', header: 'Date', type: 'date', width: 130 },
        { name: 'outcome', header: 'Outcome', type: 'text', width: 200 },
        { name: 'notes', header: 'Notes', type: 'text', width: 250 },
        { name: 'next_visit_plan', header: 'Next Visit', type: 'date', width: 130 },
    ],
    account: [
        { name: 'month_year', header: 'Month/Year', type: 'text', width: 120 },
        { name: 'revenue', header: 'Revenue ₹', type: 'number', width: 120 },
        { name: 'total_cost', header: 'Cost ₹', type: 'number', width: 120 },
        { name: 'profit', header: 'Profit ₹', type: 'number', width: 120 },
    ],
    purchase_orders: [
        { name: 'supplier_id', header: 'Supplier', type: 'select', fkTable: 'suppliers', fkLabel: 'name', width: 180 },
        { name: 'total_cost', header: 'Total ₹', type: 'number', width: 120 },
        { name: 'status', header: 'Status', type: 'text', width: 100 },
    ],
};

const TABLE_LIST = [
    { group: 'Reference Data', tables: ['verticals', 'brands', 'products', 'packing_units', 'variant_params_1', 'variant_params_2', 'variant_params_3'] },
    { group: 'Inventory', tables: ['items'] },
    { group: 'CRM', tables: ['prospects', 'routes', 'visits'] },
    { group: 'Sales', tables: ['orders', 'bills'] },
    { group: 'Procurement', tables: ['suppliers', 'purchase_orders'] },
    { group: 'Finance', tables: ['costs', 'account'] },
];

const EDITABLE_TABLES = new Set(['verticals', 'brands', 'products', 'packing_units', 'items', 'prospects', 'routes', 'costs', 'suppliers', 'visits', 'purchase_orders', 'variant_params_1', 'variant_params_2', 'variant_params_3']);

const TABLE_LABELS: Record<string, string> = {
    verticals: 'Verticals', brands: 'Brands', products: 'Products', packing_units: 'Packing Units',
    items: 'Items', prospects: 'Prospects', routes: 'Routes', suppliers: 'Suppliers', costs: 'Costs',
    orders: 'Orders', bills: 'Bills', visits: 'Visits', account: 'Account',
    purchase_orders: 'Purchase Orders',
    variant_params_1: 'Sizes (VP1)', variant_params_2: 'Frequency (VP2)', variant_params_3: 'Specs (VP3)',
};

// ─── Main Component ──────────────────────────────────────────────
export default function DBEditor() {
    const addToast = useAppStore(s => s.addToast);
    const [selectedTable, setSelectedTable] = useState('verticals');
    const [rows, setRows] = useState<any[]>([]);
    const [fkData, setFkData] = useState<Record<string, any[]>>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [isDirty, setIsDirty] = useState(false);
    const [activeCell, setActiveCell] = useState<{ rowKey: string; col: string } | null>(null);
    const tableRef = useRef<HTMLDivElement>(null);

    const colDefs = TABLE_COLUMNS[selectedTable] ?? [];
    const isEditable = EDITABLE_TABLES.has(selectedTable);

    // Load FK dropdown data
    useEffect(() => {
        const fkTables = [...new Set(colDefs.filter(c => c.fkTable).map(c => c.fkTable!))];
        Promise.all(fkTables.map(async t => {
            const dal = (DAL as any)[t];
            if (!dal?.getAll) return [t, []];
            const data = await dal.getAll().catch(() => []);
            return [t, data];
        })).then(results => {
            const map: Record<string, any[]> = {};
            results.forEach(([t, data]) => { map[t as string] = data as any[]; });
            setFkData(map);
        });
    }, [selectedTable]);

    // Load rows
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

    const updateCell = (rowKey: string, field: string, val: any) => {
        setRows(prev => prev.map(r => r._key === rowKey ? { ...r, [field]: val } : r));
        setIsDirty(true);
    };

    const addRow = () => {
        const newRow: any = { _key: `new-${Date.now()}` };
        colDefs.forEach(c => { newRow[c.name] = c.defaultValue ?? (c.type === 'number' ? 0 : ''); });
        setRows(prev => [...prev, newRow]);
        setIsDirty(true);
        // Scroll to bottom
        setTimeout(() => tableRef.current?.scrollTo({ top: tableRef.current.scrollHeight, behavior: 'smooth' }), 50);
    };

    const duplicateRow = (rowKey: string) => {
        const source = rows.find(r => String(r._key) === rowKey);
        if (!source) return;
        const { _key, id, created_at, updated_at, ...rest } = source;
        const dup: any = { ...rest, _key: `new-${Date.now()}` };
        const idx = rows.findIndex(r => String(r._key) === rowKey);
        setRows(prev => {
            const next = [...prev];
            next.splice(idx + 1, 0, dup);
            return next;
        });
        setIsDirty(true);
        addToast('Row duplicated — edit and save', 'info');
    };

    const deleteRow = (rowKey: string) => {
        const row = rows.find(r => String(r._key) === rowKey);
        if (!row) return;
        if (row.id && !confirm('Delete this row permanently?')) return;
        (async () => {
            if (row.id) {
                try {
                    const dal = (DAL as any)[selectedTable];
                    await dal.delete(row.id);
                } catch (e: any) {
                    addToast(`Delete error: ${e.message}`, 'error');
                    return;
                }
            }
            setRows(prev => prev.filter(r => String(r._key) !== rowKey));
            addToast('Row deleted', 'success');
        })();
    };

    const saveAll = async () => {
        // Validate required fields in UI before sending to DB
        for (const row of rows) {
            for (const col of colDefs.filter(c => c.required)) {
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
            // Strip UI-only and system columns — DAL handles firm_id, timestamps
            const SYSTEM_COLS = new Set(['_key', 'firm_id', 'created_at', 'updated_at']);
            const clean = rows.map(row => {
                const out: any = {};
                for (const [k, v] of Object.entries(row)) {
                    if (SYSTEM_COLS.has(k)) continue;
                    // Strip id for NEW rows so Supabase auto-generates it
                    if (k === 'id' && !v) continue;
                    out[k] = v;
                }
                return out;
            });
            await dal.bulkUpsert(clean);
            addToast(`✓ Saved ${clean.length} rows`, 'success');
            loadRows();
        } catch (e: any) {
            // Parse Supabase constraint errors into friendly messages
            const msg = e?.message ?? String(e);
            let friendly = msg;
            if (msg.includes('violates not-null constraint')) {
                const col = msg.match(/column "(\w+)"/)?.[1];
                friendly = `Missing required field: "${col}". This column cannot be empty.`;
            } else if (msg.includes('violates foreign key constraint')) {
                friendly = 'Invalid reference — the selected value doesn\'t exist in the related table.';
            } else if (msg.includes('violates unique constraint')) {
                friendly = 'Duplicate value — this value already exists and must be unique.';
            } else if (msg.includes('invalid input syntax')) {
                const type = msg.match(/for type (\w+)/)?.[1];
                friendly = `Invalid data format for type "${type}". Check number/date fields.`;
            }
            addToast(`Save error: ${friendly}`, 'error');
        } finally {
            setSaving(false);
        }
    };

    // FK display label
    const fkLabel = (col: ColDef, val: any): string => {
        if (!col.fkTable || val == null) return '';
        const item = (fkData[col.fkTable] ?? []).find((o: any) => o.id === val);
        return item?.[col.fkLabel!] ?? String(val);
    };

    return (
        <div className="animate-fade-in flex flex-col" style={{ height: 'calc(100vh - 80px)' }}>
            {/* ── Top Bar: Table selector + Actions ── */}
            <div className="flex items-center gap-3 px-2 py-2 border-b border-surface-200 flex-shrink-0 flex-wrap">
                <Database className="h-4 w-4 text-brand-500 flex-shrink-0" />

                {/* Table selector */}
                <div className="relative">
                    <select
                        value={selectedTable}
                        onChange={e => {
                            if (isDirty && !confirm('You have unsaved changes. Switch table and lose them?')) return;
                            setSelectedTable(e.target.value); setActiveCell(null);
                        }}
                        className="appearance-none bg-surface-100 text-surface-900 text-sm font-semibold pl-3 pr-8 py-1.5 rounded-lg border border-surface-200 cursor-pointer focus:ring-2 focus:ring-brand-400 focus:outline-none"
                    >
                        {TABLE_LIST.map(g => (
                            <optgroup key={g.group} label={g.group}>
                                {g.tables.map(t => (
                                    <option key={t} value={t}>{TABLE_LABELS[t] ?? t}</option>
                                ))}
                            </optgroup>
                        ))}
                    </select>
                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-surface-400 pointer-events-none" />
                </div>

                <span className="text-xs text-surface-500">
                    {rows.length} record{rows.length !== 1 ? 's' : ''}
                </span>

                <div className="flex-1" />

                {isEditable && (
                    <>
                        <button onClick={addRow}
                            className="text-xs flex items-center gap-1.5 py-1.5 px-3 rounded-lg bg-brand-50 text-brand-700 border border-brand-200 hover:bg-brand-100 transition-colors">
                            <Plus className="h-3.5 w-3.5" /> Add Row
                        </button>

                        <button onClick={saveAll} disabled={!isDirty || saving}
                            className={`text-xs flex items-center gap-1.5 py-1.5 px-4 rounded-lg font-semibold transition-all ${isDirty
                                ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm'
                                : 'bg-surface-100 text-surface-400 cursor-default'
                                }`}>
                            {saving ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : isDirty ? <Save className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}
                            {saving ? 'Saving…' : isDirty ? 'Save All' : 'Saved'}
                        </button>
                    </>
                )}

                <button onClick={loadRows} className="p-1.5 rounded-lg hover:bg-surface-100 transition-colors" title="Refresh">
                    <RefreshCw className={`h-3.5 w-3.5 text-surface-400 ${loading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            {/* ── Spreadsheet Grid ── */}
            <div ref={tableRef} className="flex-1 overflow-auto min-h-0">
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
                    <table className="w-full border-collapse text-sm" style={{ minWidth: colDefs.reduce((s, c) => s + (c.width || 120), 100) }}>
                        {/* Column headers */}
                        <thead className="sticky top-0 z-10">
                            <tr className="bg-surface-100 border-b border-surface-200">
                                <th className="px-2 py-2 text-left text-[11px] font-semibold text-surface-500 uppercase tracking-wide w-[60px] bg-surface-100">#</th>
                                {colDefs.map(col => (
                                    <th key={col.name}
                                        className="px-2 py-2 text-left text-[11px] font-semibold text-surface-500 uppercase tracking-wide bg-surface-100 border-l border-surface-200"
                                        style={{ minWidth: col.width || 120 }}>
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
                                    <tr key={rowKey}
                                        className={`border-b border-surface-100 transition-colors ${isNew ? 'bg-amber-50/50' : idx % 2 === 0 ? 'bg-white' : 'bg-surface-50/50'} hover:bg-brand-50/30`}>
                                        {/* Row number */}
                                        <td className="px-2 py-1.5 text-xs text-surface-400 font-mono">
                                            {isNew ? <span className="text-amber-500 font-semibold text-[10px]">NEW</span> : idx + 1}
                                        </td>

                                        {/* Data cells */}
                                        {colDefs.map(col => {
                                            const cellKey = `${rowKey}:${col.name}`;
                                            const isActive = activeCell?.rowKey === rowKey && activeCell?.col === col.name;
                                            const val = row[col.name];

                                            return (
                                                <td key={col.name}
                                                    className={`px-1 py-0.5 border-l border-surface-100 ${isActive ? 'ring-2 ring-inset ring-brand-400' : ''} ${col.required && (val === null || val === undefined || val === '') ? 'bg-red-50/50' : ''}`}
                                                    onClick={() => isEditable && setActiveCell({ rowKey, col: col.name })}>
                                                    {isEditable && isActive ? (
                                                        // Edit mode
                                                        col.type === 'select' ? (
                                                            <select
                                                                autoFocus
                                                                value={val ?? ''}
                                                                onChange={e => updateCell(rowKey, col.name, e.target.value ? Number(e.target.value) : null)}
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
                                                                onChange={e => updateCell(rowKey, col.name, col.type === 'number' ? (e.target.value === '' ? null : Number(e.target.value)) : e.target.value)}
                                                                onBlur={() => setActiveCell(null)}
                                                                onKeyDown={e => {
                                                                    if (e.key === 'Enter') setActiveCell(null);
                                                                    if (e.key === 'Tab') {
                                                                        e.preventDefault();
                                                                        const colIdx = colDefs.findIndex(c => c.name === col.name);
                                                                        if (colIdx < colDefs.length - 1) {
                                                                            setActiveCell({ rowKey, col: colDefs[colIdx + 1].name });
                                                                        } else if (idx < rows.length - 1) {
                                                                            setActiveCell({ rowKey: String(rows[idx + 1]._key), col: colDefs[0].name });
                                                                        }
                                                                    }
                                                                }}
                                                                className="w-full bg-white text-surface-900 text-xs py-1 px-1.5 border-none outline-none"
                                                            />
                                                        )
                                                    ) : (
                                                        // Display mode
                                                        <div className="text-xs text-surface-700 py-1 px-1.5 truncate cursor-cell min-h-[28px] flex items-center">
                                                            {col.type === 'select' ? fkLabel(col, val) || <span className="text-surface-300">—</span> :
                                                                val !== null && val !== undefined && val !== '' ? String(val) : <span className="text-surface-300">—</span>}
                                                        </div>
                                                    )}
                                                </td>
                                            );
                                        })}

                                        {/* Action buttons */}
                                        {isEditable && (
                                            <td className="px-1 py-0.5 border-l border-surface-100 text-center">
                                                <div className="flex items-center justify-center gap-0.5">
                                                    <button onClick={() => duplicateRow(rowKey)}
                                                        title="Duplicate row"
                                                        className="p-1 rounded hover:bg-surface-200 transition-colors text-surface-400 hover:text-brand-600">
                                                        <Copy className="h-3.5 w-3.5" />
                                                    </button>
                                                    <button onClick={() => deleteRow(rowKey)}
                                                        title="Delete row"
                                                        className="p-1 rounded hover:bg-red-50 transition-colors text-surface-400 hover:text-red-500">
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

            {/* ── Status Bar ── */}
            <div className="flex items-center gap-4 px-3 py-1.5 border-t border-surface-200 text-[11px] text-surface-500 flex-shrink-0 bg-surface-50">
                <span><span className="text-red-400">*</span> Required</span>
                <span>Click cell to edit</span>
                <span><Copy className="inline h-3 w-3" /> Duplicate copies row values</span>
                <span>Tab to move between cells</span>
                {isDirty && <span className="text-amber-600 font-medium ml-auto">● Unsaved changes</span>}
            </div>
        </div>
    );
}
