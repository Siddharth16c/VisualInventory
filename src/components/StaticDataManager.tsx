import { useState, useEffect } from 'react';
import { useAppStore } from '@/store/store';
import { Plus, Pencil, Trash2, X, Save, Settings } from 'lucide-react';
import { getDb } from '@/db/local/db';
import * as queries from '@/db/local/queries';
import { queueWrite } from '@/db/local/sync';
import { getFirmId, DAL } from '@/db/dal';

// ─── Types for the static tables we manage ──────────────────────

type TableConfig = {
    key: string;
    label: string;
    fields: FieldDef[];
    getAll: () => Promise<any[]>;
    add: (item: any) => Promise<any>;
    update: (id: number, item: any) => Promise<any>;
    remove: (id: number) => Promise<void>;
};

type FieldDef = {
    name: string;
    label: string;
    type: 'text' | 'number' | 'select';
    required?: boolean;
    options?: () => Promise<{ value: number; label: string }[]>;
};

// ─── Component ──────────────────────────────────────────────────

const genericUpdate = async (table: string, id: number, data: any) => {
    const setClauses: string[] = [];
    const values: any[] = [];
    for (const [key, value] of Object.entries(data)) {
        if (key === 'id') continue;
        setClauses.push(`${key} = ?`);
        values.push(value);
    }
    values.push(id);
    await getDb().sql(`UPDATE ${table} SET ${setClauses.join(', ')} WHERE id = ?`, values);
    await queueWrite(table, 'UPDATE', id, data);
};

const genericDelete = async (table: string, id: number) => {
    await getDb().sql(`DELETE FROM ${table} WHERE id = ?`, [id]);
    await queueWrite(table, 'DELETE', id);
};

export default function StaticDataManager({ tableKey, onClose }: { tableKey: string; onClose: () => void }) {
    const addToast = useAppStore((s) => s.addToast);
    const [rows, setRows] = useState<any[]>([]);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [form, setForm] = useState<Record<string, any>>({});
    const [isAdding, setIsAdding] = useState(false);
    const [selectOptions, setSelectOptions] = useState<Record<string, { value: number; label: string }[]>>({});

    // Table configurations
    const tableConfigs: Record<string, TableConfig> = {
        verticals: {
            key: 'verticals',
            label: 'Verticals',
            fields: [
                { name: 'name', label: 'Name', type: 'text', required: true },
            ],
            getAll: () => queries.getVerticals(),
            add: (item) => queries.insertVertical(getFirmId(), item),
            update: (id, item) => genericUpdate('verticals', id, item),
            remove: (id) => genericDelete('verticals', id),
        },
        brands: {
            key: 'brands',
            label: 'Brands',
            fields: [
                { name: 'name', label: 'Name', type: 'text', required: true },
                {
                    name: 'vertical_id', label: 'Vertical', type: 'select',
                    options: async () => {
                        const verts = await queries.getVerticals();
                        return verts.map((v: any) => ({ value: v.id!, label: v.name }));
                    },
                },
            ],
            getAll: () => queries.getBrands(),
            add: (item) => queries.insertBrand(getFirmId(), item),
            update: (id, item) => genericUpdate('brands', id, item),
            remove: (id) => genericDelete('brands', id),
        },

        packing_units: {
            key: 'packing_units',
            label: 'Packing Units',
            fields: [
                { name: 'unit_name', label: 'Unit Name', type: 'text', required: true },
                { name: 'multiplier', label: 'Multiplier', type: 'number', required: true },
            ],
            getAll: () => queries.getPackingUnits(),
            add: (item) => queries.insertPackingUnit(getFirmId(), item),
            update: (id, item) => genericUpdate('packing_units', id, item),
            remove: (id) => genericDelete('packing_units', id),
        },
        products: {
            key: 'products',
            label: 'Products',
            fields: [
                { name: 'name', label: 'Name', type: 'text', required: true },
                { name: 'category', label: 'Category', type: 'text', required: true },
                {
                    name: 'vertical_id', label: 'Vertical', type: 'select',
                    options: async () => {
                        const verts = await queries.getVerticals();
                        return verts.map((v: any) => ({ value: v.id!, label: v.name }));
                    },
                },
            ],
            getAll: () => DAL.products.getAll(),
            add: (item) => queries.insertProduct(getFirmId(), item),
            update: (id, item) => genericUpdate('products', id, item),
            remove: (id) => genericDelete('products', id),
        },
        variant_params_1: {
            key: 'variant_params_1',
            label: 'Variant 1 (Pages/Count)',
            fields: [
                { name: 'name', label: 'Name', type: 'text', required: true },
                {
                    name: 'product_id', label: 'Product', type: 'select',
                    options: async () => {
                        const prods = await DAL.products.getAll();
                        return prods.map((p: any) => ({ value: p.id!, label: p.name }));
                    },
                },
            ],
            getAll: () => DAL.variant_params_1.getAll(),
            add: (item) => queries.insertVariantParam(getFirmId(), 'variant_params_1', item),
            update: (id, item) => genericUpdate('variant_params_1', id, item),
            remove: (id) => genericDelete('variant_params_1', id),
        },
        variant_params_2: {
            key: 'variant_params_2',
            label: 'Variant 2 (Types)',
            fields: [
                { name: 'name', label: 'Name', type: 'text', required: true },
                {
                    name: 'product_id', label: 'Product', type: 'select',
                    options: async () => {
                        const prods = await DAL.products.getAll();
                        return prods.map((p: any) => ({ value: p.id!, label: p.name }));
                    },
                },
            ],
            getAll: () => DAL.variant_params_2.getAll(),
            add: (item) => queries.insertVariantParam(getFirmId(), 'variant_params_2', item),
            update: (id, item) => genericUpdate('variant_params_2', id, item),
            remove: (id) => genericDelete('variant_params_2', id),
        },
        variant_params_3: {
            key: 'variant_params_3',
            label: 'Variant 3 (Item Size)',
            fields: [
                { name: 'name', label: 'Name', type: 'text', required: true },
                {
                    name: 'product_id', label: 'Product', type: 'select',
                    options: async () => {
                        const prods = await DAL.products.getAll();
                        return prods.map((p: any) => ({ value: p.id!, label: p.name }));
                    },
                },
            ],
            getAll: () => DAL.variant_params_3.getAll(),
            add: (item) => queries.insertVariantParam(getFirmId(), 'variant_params_3', item),
            update: (id, item) => genericUpdate('variant_params_3', id, item),
            remove: (id) => genericDelete('variant_params_3', id),
        },
    };

    const config = tableConfigs[tableKey];

    // Load rows
    const loadRows = async () => {
        if (!config) return;
        const data = await config.getAll();
        setRows(data);
    };

    // Load select options for fields that need them
    const loadSelectOptions = async () => {
        if (!config) return;
        const opts: Record<string, { value: number; label: string }[]> = {};
        for (const field of config.fields) {
            if (field.type === 'select' && field.options) {
                opts[field.name] = await field.options();
            }
        }
        setSelectOptions(opts);
    };

    useEffect(() => {
        loadRows();
        loadSelectOptions();
    }, [tableKey]);

    if (!config) return null;

    const startAdd = () => {
        const empty: Record<string, any> = {};
        config.fields.forEach((f) => { empty[f.name] = f.type === 'number' ? '' : ''; });
        setForm(empty);
        setIsAdding(true);
        setEditingId(null);
    };

    const startEdit = (row: any) => {
        const data: Record<string, any> = {};
        config.fields.forEach((f) => { data[f.name] = row[f.name] ?? ''; });
        setForm(data);
        setEditingId(row.id);
        setIsAdding(false);
    };

    const handleSave = async () => {
        // Validate required fields
        for (const field of config.fields) {
            if (field.required && !form[field.name] && form[field.name] !== 0) {
                addToast(`${field.label} is required`, 'error');
                return;
            }
        }

        // Convert number types
        const data = { ...form };
        config.fields.forEach((f) => {
            if (f.type === 'number') data[f.name] = Number(data[f.name]) || 0;
            if (f.type === 'select') {
                const val = Number(data[f.name]);
                if (val) data[f.name] = val;
                else delete data[f.name]; // Save undefined so generic relations don't falsely map to 0
            }
        });

        try {
            if (editingId) {
                await config.update(editingId, data);
                addToast('Updated successfully', 'success');
            } else {
                await config.add(data);
                addToast('Added successfully', 'success');
            }
            setEditingId(null);
            setIsAdding(false);
            setForm({});
            await loadRows();
        } catch (e: any) {
            addToast(`Save failed: ${e.message}`, 'error');
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Delete this entry? Items referencing it may be affected.')) return;
        try {
            await config.remove(id);
            addToast('Deleted', 'info');
            await loadRows();
        } catch (e: any) {
            addToast(`Delete failed: ${e.message}`, 'error');
        }
    };

    const cancelEdit = () => {
        setEditingId(null);
        setIsAdding(false);
        setForm({});
    };

    // Get display value for select fields
    const getDisplayValue = (fieldName: string, value: any) => {
        const opts = selectOptions[fieldName];
        if (opts) {
            const opt = opts.find((o) => o.value === value);
            return opt ? opt.label : String(value || '-');
        }
        return String(value ?? '-');
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="glass rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col animate-fade-in">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-surface-200">
                    <div className="flex items-center gap-2">
                        <Settings className="h-5 w-5 text-brand-600" />
                        <h2 className="text-lg font-bold text-surface-900">Manage {config.label}</h2>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={startAdd} className="btn-primary text-xs flex items-center gap-1">
                            <Plus className="h-3.5 w-3.5" /> Add
                        </button>
                        <button onClick={onClose} className="p-1 hover:bg-surface-100 rounded-lg text-brand-600">
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                </div>

                {/* Add/Edit form */}
                {(isAdding || editingId !== null) && (
                    <div className="p-4 border-b border-surface-200 bg-surface-50">
                        <div className="flex flex-wrap gap-3 items-end">
                            {config.fields.map((field) => (
                                <div key={field.name} className="flex-1 min-w-[140px]">
                                    <label className="block text-xs text-surface-500 mb-1">{field.label}</label>
                                    {field.type === 'select' ? (
                                        <select
                                            className="input-field text-sm"
                                            value={form[field.name] || ''}
                                            onChange={(e) => setForm((f) => ({ ...f, [field.name]: e.target.value }))}
                                        >
                                            <option value="">Select {field.label}</option>
                                            {(selectOptions[field.name] || []).map((opt) => (
                                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                                            ))}
                                        </select>
                                    ) : (
                                        <input
                                            className="input-field text-sm"
                                            type={field.type}
                                            step={field.type === 'number' ? '0.01' : undefined}
                                            placeholder={field.label}
                                            value={form[field.name] || ''}
                                            onChange={(e) => setForm((f) => ({ ...f, [field.name]: e.target.value }))}
                                        />
                                    )}
                                </div>
                            ))}
                            <div className="flex gap-1">
                                <button onClick={handleSave} className="btn-primary text-xs px-3 py-2 flex items-center gap-1">
                                    <Save className="h-3.5 w-3.5" /> Save
                                </button>
                                <button onClick={cancelEdit} className="btn-ghost text-xs px-3 py-2">
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Rows */}
                <div className="flex-1 overflow-y-auto">
                    <table className="w-full text-sm">
                        <thead className="sticky top-0 bg-white shadow-sm">
                            <tr className="border-b border-surface-200">
                                <th className="px-4 py-2 text-left text-xs font-medium text-surface-500 uppercase tracking-wider w-12">#</th>
                                {config.fields.map((f) => (
                                    <th key={f.name} className="px-4 py-2 text-left text-xs font-medium text-surface-500 uppercase tracking-wider">
                                        {f.label}
                                    </th>
                                ))}
                                <th className="px-4 py-2 text-left text-xs font-medium text-surface-500 uppercase tracking-wider w-20">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.length === 0 ? (
                                <tr>
                                    <td colSpan={config.fields.length + 2} className="px-4 py-8 text-center text-surface-500">
                                        No entries yet. Click "Add" to create one.
                                    </td>
                                </tr>
                            ) : (
                                rows.map((row, idx) => (
                                    <tr key={row.id} className="border-b border-surface-100 hover:bg-surface-50 transition-colors">
                                        <td className="px-4 py-2 text-surface-500">{idx + 1}</td>
                                        {config.fields.map((f) => (
                                            <td key={f.name} className="px-4 py-2 text-surface-500">
                                                {f.type === 'select' ? getDisplayValue(f.name, row[f.name]) : String(row[f.name] ?? '-')}
                                            </td>
                                        ))}
                                        <td className="px-4 py-2 text-surface-500">
                                            <div className="flex gap-1">
                                                <button
                                                    onClick={() => startEdit(row)}
                                                    className="p-1.5 hover:bg-surface-100 rounded-lg transition-colors"
                                                >
                                                    <Pencil className="h-3.5 w-3.5 text-surface-500" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(row.id)}
                                                    className="p-1.5 hover:bg-red-50 rounded-lg transition-colors"
                                                >
                                                    <Trash2 className="h-3.5 w-3.5 text-red-500" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
