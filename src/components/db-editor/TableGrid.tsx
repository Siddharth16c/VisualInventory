import { useState, useEffect, useCallback, useMemo } from 'react';
import { DAL } from '@/db/dal';
import { useAppStore } from '@/store/store';
import { Plus, Save, Trash2, RefreshCw } from 'lucide-react';

// ─── Column definitions ───────────────────────────────────────────────────────
interface ColDef { name: string; header: string; type: 'text' | 'number' | 'select' | 'date'; required?: boolean; fkTable?: string; fkLabel?: string; defaultValue?: any }

const TABLE_COLUMNS: Record<string, ColDef[]> = {
    verticals: [{ name: 'name', header: 'Name', type: 'text', required: true }],
    brands: [
        { name: 'name', header: 'Name', type: 'text', required: true },
        { name: 'vertical_id', header: 'Vertical', type: 'select', fkTable: 'verticals', fkLabel: 'name' },
    ],
    products: [
        { name: 'name', header: 'Name', type: 'text', required: true },
        { name: 'category', header: 'Category', type: 'text', required: true },
        { name: 'vertical_id', header: 'Vertical', type: 'select', fkTable: 'verticals', fkLabel: 'name' },
    ],
    packing_units: [
        { name: 'unit_name', header: 'Unit Name', type: 'text', required: true },
        { name: 'multiplier', header: 'Multiplier', type: 'number', defaultValue: 1 },
    ],
    items: [
        { name: 'item_name', header: 'Item Name', type: 'text', required: true },
        { name: 'category', header: 'Category', type: 'text', required: true },
        { name: 'product_id', header: 'Product', type: 'select', fkTable: 'products', fkLabel: 'name' },
        { name: 'brand_id', header: 'Brand', type: 'select', fkTable: 'brands', fkLabel: 'name' },
        { name: 'vertical_id', header: 'Vertical', type: 'select', fkTable: 'verticals', fkLabel: 'name' },
        { name: 'packing_unit_id', header: 'Pack Unit', type: 'select', fkTable: 'packing_units', fkLabel: 'unit_name' },
        { name: 'p_unit', header: 'p_unit', type: 'number', defaultValue: 1 },
        { name: 'p_unit_per_parcel', header: 'Per Parcel', type: 'number', defaultValue: 1 },
        { name: 'stock_parcels', header: 'Stock (Parcels)', type: 'number', defaultValue: 0 },
        { name: 'retail_price_unit', header: 'Retail/Unit', type: 'number', defaultValue: 0 },
        { name: 'retail_price_container', header: 'Retail/Box', type: 'number', defaultValue: 0 },
        { name: 'wholesale_price_unit', header: 'WS/Unit', type: 'number', defaultValue: 0 },
        { name: 'wholesale_price_container', header: 'WS/Box', type: 'number', defaultValue: 0 },
        { name: 'mrp', header: 'MRP', type: 'number', defaultValue: 0 },
    ],
    prospects: [
        { name: 'prospectname', header: 'Name', type: 'text', required: true },
        { name: 'area_town', header: 'Area/Town', type: 'text' },
        { name: 'contact', header: 'Contact', type: 'text' },
        { name: 'business_type', header: 'Business Type', type: 'text' },
        { name: 'route_id', header: 'Route', type: 'select', fkTable: 'routes', fkLabel: 'name' },
    ],
    routes: [
        { name: 'name', header: 'Route Name', type: 'text', required: true },
        { name: 'description', header: 'Description', type: 'text' },
        { name: 'color_tag', header: 'Color', type: 'text', defaultValue: '#4f46e5' },
    ],
    suppliers: [
        { name: 'name', header: 'Supplier Name', type: 'text', required: true },
        { name: 'contact', header: 'Contact', type: 'text' },
        { name: 'address', header: 'Address', type: 'text' },
        { name: 'vertical_id', header: 'Vertical', type: 'select', fkTable: 'verticals', fkLabel: 'name' },
    ],
    costs: [
        { name: 'cost_type', header: 'Cost Type', type: 'text', required: true },
        { name: 'amount', header: 'Amount', type: 'number', required: true, defaultValue: 0 },
        { name: 'description', header: 'Description', type: 'text' },
        { name: 'date', header: 'Date', type: 'date', defaultValue: new Date().toISOString().split('T')[0] },
    ],
};

const EDITABLE_TABLES = new Set(['verticals', 'brands', 'products', 'packing_units', 'items', 'prospects', 'routes', 'costs']);

// ─── Inline cell editor ───────────────────────────────────────────────────────
function EditCell({ value, col, fkOptions, onChange }: {
    value: any; col: ColDef; fkOptions: any[]; onChange: (v: any) => void;
}) {
    const cls = 'w-full text-xs bg-transparent outline-none border-0 text-surface-100 placeholder-surface-500 py-0.5 px-1';
    if (col.type === 'select') {
        return (
            <select value={value ?? ''} onChange={e => onChange(e.target.value ? Number(e.target.value) : null)}
                className={cls + ' cursor-pointer'} style={{ background: '#1e293b' }}>
                <option value="">—</option>
                {fkOptions.map(o => <option key={o.id} value={o.id}>{o[col.fkLabel!]}</option>)}
            </select>
        );
    }
    return (
        <input
            type={col.type === 'number' ? 'number' : col.type === 'date' ? 'date' : 'text'}
            value={value ?? ''}
            onChange={e => onChange(col.type === 'number' ? Number(e.target.value) : e.target.value)}
            className={cls}
            style={{ border: 'none', background: 'transparent', minWidth: 60 }}
        />
    );
}

// ─── TableGrid component ──────────────────────────────────────────────────────
interface TableGridProps { tableName: string }

export default function TableGrid({ tableName }: TableGridProps) {
    const addToast = useAppStore(s => s.addToast);
    const [rows, setRows] = useState<any[]>([]);
    const [fkData, setFkData] = useState<Record<string, any[]>>({});
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [isDirty, setIsDirty] = useState(false);

    const colDefs = TABLE_COLUMNS[tableName] ?? [];
    const isEditable = EDITABLE_TABLES.has(tableName);

    // Load FK data
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
    }, [tableName]);

    const loadRows = useCallback(async () => {
        setLoading(true);
        try {
            const dal = (DAL as any)[tableName];
            if (!dal?.getAll) { setLoading(false); return; }
            const data = await dal.getAll();
            setRows((data ?? []).map((r: any, i: number) => ({ ...r, _key: r.id ?? `row-${i}` })));
            setIsDirty(false);
        } catch (e: any) { addToast(`Load error: ${e.message}`, 'error'); }
        finally { setLoading(false); }
    }, [tableName, addToast]);

    useEffect(() => { loadRows(); }, [loadRows]);

    const updateCell = (rowKey: string, field: string, val: any) => {
        setRows(prev => prev.map(r => r._key === rowKey ? { ...r, [field]: val } : r));
        setIsDirty(true);
    };

    const addRow = () => {
        const newRow: any = { _key: `new-${Date.now()}` };
        colDefs.forEach(c => { newRow[c.name] = c.defaultValue ?? null; });
        setRows(prev => [newRow, ...prev]);
        setIsDirty(true);
    };

    const deleteSelected = async () => {
        if (!selected.size) { addToast('Select rows first', 'info'); return; }
        const dal = (DAL as any)[tableName];
        for (const key of selected) {
            const row = rows.find(r => String(r._key) === key);
            if (row?.id) await dal.delete(row.id).catch(() => { });
        }
        setRows(prev => prev.filter(r => !selected.has(String(r._key))));
        setSelected(new Set());
        addToast(`Deleted ${selected.size} row(s)`, 'success');
    };

    const saveAll = async () => {
        for (const row of rows) {
            for (const col of colDefs.filter(c => c.required)) {
                const v = row[col.name];
                if (v === null || v === undefined || v === '') {
                    addToast(`"${col.header}" is required`, 'error'); return;
                }
            }
        }
        setSaving(true);
        try {
            const dal = (DAL as any)[tableName];
            const clean = rows.map(({ _key, ...rest }) => rest);
            await dal.bulkUpsert(clean);
            addToast(`Saved ${clean.length} rows to ${tableName}`, 'success');
            loadRows();
        } catch (e: any) { addToast(`Save error: ${e.message}`, 'error'); }
        finally { setSaving(false); }
    };

    if (!colDefs.length) {
        return (
            <div className="flex items-center justify-center h-full text-surface-400 text-sm flex-col gap-2">
                <p className="font-semibold text-surface-300">{tableName}</p>
                <p>This table is managed from its dedicated page.</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full gap-2">
            {/* Toolbar */}
            <div className="flex items-center gap-2 flex-wrap flex-shrink-0">
                <span className="text-xs font-semibold text-surface-300 capitalize">{tableName}</span>
                <span className="text-surface-500 text-xs">{rows.length} rows</span>
                <div className="flex-1" />
                {isEditable && (
                    <>
                        <button onClick={addRow} className="btn-ghost text-xs flex items-center gap-1 py-1 px-2">
                            <Plus className="h-3 w-3" /> Add Row
                        </button>
                        <button onClick={deleteSelected} className="btn-ghost text-xs flex items-center gap-1 py-1 px-2 text-red-400">
                            <Trash2 className="h-3 w-3" /> Delete
                        </button>
                        <button onClick={saveAll} disabled={!isDirty || saving}
                            className={`btn-primary text-xs flex items-center gap-1 py-1 px-3 ${!isDirty ? 'opacity-50' : ''}`}>
                            <Save className="h-3 w-3" /> {saving ? 'Saving…' : isDirty ? 'Save All *' : 'Saved'}
                        </button>
                    </>
                )}
                <button onClick={loadRows} className="btn-ghost text-xs p-1"><RefreshCw className="h-3 w-3" /></button>
            </div>

            {/* Table */}
            <div className="flex-1 min-h-0 overflow-auto rounded-lg" style={{ background: '#0f172a', border: '1px solid #1e293b' }}>
                {loading ? (
                    <div className="flex items-center justify-center h-full text-surface-400 text-sm">Loading…</div>
                ) : (
                    <table className="w-full text-xs border-collapse" style={{ minWidth: 600 }}>
                        <thead style={{ position: 'sticky', top: 0, background: '#0f172a', zIndex: 1 }}>
                            <tr>
                                {isEditable && <th className="w-8 px-2 py-2 text-left" style={{ borderBottom: '1px solid #1e293b' }}>
                                    <input type="checkbox" onChange={e => setSelected(e.target.checked ? new Set(rows.map(r => String(r._key))) : new Set())} className="rounded" />
                                </th>}
                                <th className="px-2 py-2 text-left text-surface-500 font-medium" style={{ borderBottom: '1px solid #1e293b', width: 40 }}>ID</th>
                                {colDefs.map(c => (
                                    <th key={c.name} className="px-2 py-2 text-left text-surface-400 font-medium whitespace-nowrap" style={{ borderBottom: '1px solid #1e293b' }}>
                                        {c.required ? <><span className="text-amber-400 mr-0.5">*</span>{c.header}</> : c.header}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {rows.length === 0 && (
                                <tr><td colSpan={colDefs.length + 2} className="px-4 py-6 text-center text-surface-500">
                                    {isEditable ? 'No rows yet — click + Add Row to begin' : 'No data'}
                                </td></tr>
                            )}
                            {rows.map(row => (
                                <tr key={String(row._key)}
                                    onClick={() => { const k = String(row._key); setSelected(prev => { const n = new Set(prev); n.has(k) ? n.delete(k) : n.add(k); return n; }); }}
                                    style={{ background: selected.has(String(row._key)) ? '#1e3a5f' : undefined, cursor: 'pointer' }}
                                    className="hover:bg-surface-800/30 transition-colors"
                                >
                                    {isEditable && <td className="px-2 py-1" style={{ borderBottom: '1px solid #0f172a' }}>
                                        <input type="checkbox" checked={selected.has(String(row._key))} readOnly className="rounded"
                                            onClick={e => e.stopPropagation()} onChange={e => { const k = String(row._key); setSelected(prev => { const n = new Set(prev); e.target.checked ? n.add(k) : n.delete(k); return n; }); }} />
                                    </td>}
                                    <td className="px-2 py-1 text-surface-500" style={{ borderBottom: '1px solid #0f172a' }}>{row.id ?? <span className="text-amber-400 text-xs">new</span>}</td>
                                    {colDefs.map(col => (
                                        <td key={col.name} className="px-1 py-0.5" style={{ borderBottom: '1px solid #0f172a' }}
                                            onClick={e => e.stopPropagation()}>
                                            {isEditable ? (
                                                <EditCell
                                                    value={row[col.name]}
                                                    col={col}
                                                    fkOptions={col.fkTable ? fkData[col.fkTable] ?? [] : []}
                                                    onChange={v => updateCell(String(row._key), col.name, v)}
                                                />
                                            ) : (
                                                <span className="text-surface-300 px-1">
                                                    {col.type === 'select' && col.fkTable
                                                        ? (fkData[col.fkTable] ?? []).find(o => o.id === row[col.name])?.[col.fkLabel!] ?? '—'
                                                        : String(row[col.name] ?? '—')
                                                    }
                                                </span>
                                            )}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
            <div className="text-xs text-surface-600 flex-shrink-0">
                <span className="text-amber-400">*</span> Required · Click row to select · Save All pushes to Supabase
            </div>
        </div>
    );
}
