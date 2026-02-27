import { useState, useMemo, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Item } from '@/db/dexie';
import { useAppStore } from '@/store/store';
import { Plus, Pencil, Trash2, Search, ChevronRight, ChevronDown, X, Package, Upload } from 'lucide-react';
import BulkInsertModal from '@/components/BulkInsertModal';

// ─── Inline quick-add for static tables ──────────────────────────

function InlineAdd({
    placeholder,
    onAdd,
}: {
    placeholder: string;
    onAdd: (name: string) => Promise<void>;
}) {
    const [open, setOpen] = useState(false);
    const [value, setValue] = useState('');

    const submit = async () => {
        const v = value.trim();
        if (!v) return;
        await onAdd(v);
        setValue('');
        setOpen(false);
    };

    if (!open)
        return (
            <button
                type="button"
                onClick={() => setOpen(true)}
                className="ml-1 p-0.5 rounded hover:bg-surface-100 text-emerald-600"
                title={`Add new ${placeholder}`}
            >
                <Plus className="h-3.5 w-3.5" />
            </button>
        );

    return (
        <div className="flex items-center gap-1 mt-1">
            <input
                autoFocus
                className="input-field text-xs flex-1"
                placeholder={placeholder}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && submit()}
            />
            <button type="button" onClick={submit} className="text-xs text-emerald-600 font-semibold px-1">Add</button>
            <button type="button" onClick={() => setOpen(false)} className="text-xs text-surface-400 px-1">✕</button>
        </div>
    );
}

// ─── Item Form Modal ────────────────────────────────────────────

function ItemModal({
    item,
    onClose,
}: {
    item: Item | null;
    onClose: () => void;
}) {
    const addToast = useAppStore((s) => s.addToast);
    const verticals = useLiveQuery(() => db.verticals.toArray()) || [];
    const allProducts = useLiveQuery(() => db.products.toArray()) || [];
    const allBrands = useLiveQuery(() => db.brands.toArray()) || [];
    const packingUnits = useLiveQuery(() => db.packing_units.toArray()) || [];
    const allVP1 = useLiveQuery(() => db.variant_params_1.toArray()) || [];
    const allVP2 = useLiveQuery(() => db.variant_params_2.toArray()) || [];
    const allVP3 = useLiveQuery(() => db.variant_params_3.toArray()) || [];

    const [form, setForm] = useState({
        item_name: item?.item_name || '',
        category: item?.category || '',
        product_id: item?.product_id ?? 0,
        brand_id: item?.brand_id ?? 0,
        vertical_id: item?.vertical_id ?? 0,
        packing_unit_id: item?.packing_unit_id ?? 0,
        variant_param1_id: item?.variant_param1_id ?? 0,
        variant_param2_id: item?.variant_param2_id ?? 0,
        variant_param3_id: item?.variant_param3_id ?? 0,
        p_unit: item?.p_unit ?? 1,
        P_unit_per_parcel: item?.P_unit_per_parcel ?? 1,
        retail_price_unit: item?.retail_price_unit ?? '',
        retail_price_container: item?.retail_price_container ?? '',
        wholesale_price_unit: item?.wholesale_price_unit ?? '',
        wholesale_price_container: item?.wholesale_price_container ?? '',
        mrp: item?.mrp ?? '',
        stock_parcels: item?.stock_parcels ?? '',
        stock_units: item?.stock_units ?? '',
    });

    const filteredProducts = useMemo(
        () => allProducts.filter((p) => !form.category || p.category === form.category),
        [allProducts, form.category]
    );

    const filteredBrands = useMemo(
        () => allBrands.filter((b) => !form.vertical_id || b.vertical_id === form.vertical_id),
        [allBrands, form.vertical_id]
    );

    // Variant params filtered by selected product (+ generic ones with no product_id)
    const filteredVP1 = useMemo(
        () => allVP1.filter((v) => !v.product_id || v.product_id === form.product_id),
        [allVP1, form.product_id]
    );
    const filteredVP2 = useMemo(
        () => allVP2.filter((v) => !v.product_id || v.product_id === form.product_id),
        [allVP2, form.product_id]
    );
    const filteredVP3 = useMemo(
        () => allVP3.filter((v) => !v.product_id || v.product_id === form.product_id),
        [allVP3, form.product_id]
    );

    const categories = useMemo(() => verticals.map((v) => v.name), [verticals]);

    // Get currently selected packing multiplier
    const selectedMultiplier = useMemo(() => {
        if (!form.packing_unit_id) return 0;
        const pu = packingUnits.find((p) => p.id === form.packing_unit_id);
        return pu?.multiplier ?? 0;
    }, [packingUnits, form.packing_unit_id]);

    // Auto-compute container prices from packing unit
    useEffect(() => {
        if (selectedMultiplier > 1) {
            setForm((f) => ({
                ...f,
                p_unit: selectedMultiplier,
                retail_price_container: Number(f.retail_price_unit) * selectedMultiplier || '',
                wholesale_price_container: Number(f.wholesale_price_unit) * selectedMultiplier || '',
            }));
        }
    }, [form.retail_price_unit, form.wholesale_price_unit, selectedMultiplier]);

    // Auto-compute stock_units: p_unit × P_unit_per_parcel × parcels
    useEffect(() => {
        const pUnit = Number(form.p_unit) || 1;
        const pkgQty = Number(form.P_unit_per_parcel) || 1;
        const parcels = Number(form.stock_parcels) || 0;
        setForm((f) => ({
            ...f,
            stock_units: pUnit * pkgQty * parcels,
        }));
    }, [form.stock_parcels, form.p_unit, form.P_unit_per_parcel]);

    const handleCategoryChange = (cat: string) => {
        const vert = verticals.find((v) => v.name === cat);
        setForm((f) => ({
            ...f,
            category: cat,
            vertical_id: vert?.id ?? 0,
            product_id: 0,
            brand_id: 0,
            variant_param1_id: 0,
            variant_param2_id: 0,
            variant_param3_id: 0,
        }));
    };

    const handleProductChange = (productId: number) => {
        setForm((f) => ({ ...f, product_id: productId, variant_param1_id: 0, variant_param2_id: 0, variant_param3_id: 0 }));
    };

    const handlePackingChange = (puId: number) => {
        const pu = packingUnits.find((p) => p.id === puId);
        const mult = pu?.multiplier ?? 0;
        if (mult > 1) {
            setForm((f) => ({
                ...f,
                packing_unit_id: puId,
                p_unit: mult,
                retail_price_container: Number(f.retail_price_unit) * mult || '',
                wholesale_price_container: Number(f.wholesale_price_unit) * mult || '',
            }));
        } else {
            setForm((f) => ({ ...f, packing_unit_id: puId }));
        }
    };

    const handleSave = async () => {
        if (!form.item_name.trim()) {
            addToast('Item name is required', 'error');
            return;
        }

        const data: Omit<Item, 'id'> = {
            item_name: form.item_name.trim(),
            category: form.category,
            product_id: form.product_id || undefined,
            brand_id: form.brand_id || undefined,
            vertical_id: form.vertical_id || undefined,
            packing_unit_id: form.packing_unit_id || undefined,
            variant_param1_id: form.variant_param1_id || undefined,
            variant_param2_id: form.variant_param2_id || undefined,
            variant_param3_id: form.variant_param3_id || undefined,
            p_unit: Number(form.p_unit) || 1,
            P_unit_per_parcel: Number(form.P_unit_per_parcel) || 1,
            retail_price_unit: Number(form.retail_price_unit) || 0,
            retail_price_container: Number(form.retail_price_container) || 0,
            wholesale_price_unit: Number(form.wholesale_price_unit) || 0,
            wholesale_price_container: Number(form.wholesale_price_container) || 0,
            mrp: Number(form.mrp) || 0,
            stock_parcels: Number(form.stock_parcels) || 0,
            stock_units: Number(form.stock_units) || 0,
            createdAt: item?.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };

        if (item?.id) {
            await db.items.update(item.id, data);
            addToast('Item updated', 'success');
        } else {
            await db.items.add(data);
            addToast('Item added', 'success');
        }
        onClose();
    };

    const numField = (label: string, key: string, placeholder = '', readOnly = false) => (
        <div>
            <label className="block text-xs text-surface-500 mb-1">{label}</label>
            <input
                type="number"
                step="0.01"
                className={`input-field ${readOnly ? 'opacity-60 bg-surface-100' : ''}`}
                placeholder={placeholder || label}
                value={(form as any)[key]}
                readOnly={readOnly}
                onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
            />
        </div>
    );

    const containerAutoComputed = selectedMultiplier > 1;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="glass rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 space-y-4 animate-fade-in">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold text-surface-900">{item ? 'Edit Item' : 'Add New Item'}</h2>
                    <button onClick={onClose} className="p-1 hover:bg-surface-100 rounded-lg">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Category dropdown + inline add */}
                <div>
                    <div className="flex items-center">
                        <label className="block text-xs text-surface-500 mb-1">Category</label>
                        <InlineAdd
                            placeholder="New Category"
                            onAdd={async (name) => {
                                await db.verticals.add({ name });
                                addToast(`Category "${name}" added`, 'success');
                            }}
                        />
                    </div>
                    <select className="input-field" value={form.category} onChange={(e) => handleCategoryChange(e.target.value)}>
                        <option value="">Select Category</option>
                        {categories.map((c) => (<option key={c} value={c}>{c}</option>))}
                    </select>
                </div>

                {/* Product dropdown + inline add */}
                {form.category && (
                    <div>
                        <div className="flex items-center">
                            <label className="block text-xs text-surface-500 mb-1">Product</label>
                            <InlineAdd
                                placeholder="New Product"
                                onAdd={async (name) => {
                                    await db.products.add({ name, category: form.category, vertical_id: form.vertical_id || undefined });
                                    addToast(`Product "${name}" added`, 'success');
                                }}
                            />
                        </div>
                        <select className="input-field" value={form.product_id} onChange={(e) => handleProductChange(Number(e.target.value))}>
                            <option value={0}>Select Product</option>
                            {filteredProducts.map((p) => (<option key={p.id} value={p.id}>{p.name}</option>))}
                        </select>
                    </div>
                )}

                {/* Item name */}
                <div>
                    <label className="block text-xs text-surface-500 mb-1">Item Name</label>
                    <input className="input-field" placeholder="e.g. Apsara Long 172pg" value={form.item_name} onChange={(e) => setForm((f) => ({ ...f, item_name: e.target.value }))} />
                </div>

                {/* Variant Param 1 (Size) + inline add */}
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <div className="flex items-center">
                            <label className="block text-xs text-surface-500 mb-1">Variant 1 (Size)</label>
                            <InlineAdd
                                placeholder="New Size"
                                onAdd={async (name) => {
                                    await db.variant_params_1.add({ name, product_id: form.product_id || undefined });
                                    addToast(`Variant "${name}" added`, 'success');
                                }}
                            />
                        </div>
                        <select className="input-field" value={form.variant_param1_id} onChange={(e) => setForm((f) => ({ ...f, variant_param1_id: Number(e.target.value) }))}>
                            <option value={0}>Select Size</option>
                            {filteredVP1.map((v) => (<option key={v.id} value={v.id}>{v.name}</option>))}
                        </select>
                    </div>

                    {/* Variant Param 2 (Line Type) + inline add */}
                    <div>
                        <div className="flex items-center">
                            <label className="block text-xs text-surface-500 mb-1">Variant 2 (Type)</label>
                            <InlineAdd
                                placeholder="New Type"
                                onAdd={async (name) => {
                                    await db.variant_params_2.add({ name, product_id: form.product_id || undefined });
                                    addToast(`Variant "${name}" added`, 'success');
                                }}
                            />
                        </div>
                        <select className="input-field" value={form.variant_param2_id} onChange={(e) => setForm((f) => ({ ...f, variant_param2_id: Number(e.target.value) }))}>
                            <option value={0}>Select Type</option>
                            {filteredVP2.map((v) => (<option key={v.id} value={v.id}>{v.name}</option>))}
                        </select>
                    </div>

                    {/* Variant Param 3 (Item Size) + inline add */}
                    <div>
                        <div className="flex items-center">
                            <label className="block text-xs text-surface-500 mb-1">Variant 3 (Size)</label>
                            <InlineAdd
                                placeholder="New Size"
                                onAdd={async (name) => {
                                    await db.variant_params_3.add({ name, product_id: form.product_id || undefined });
                                    addToast(`Size "${name}" added`, 'success');
                                }}
                            />
                        </div>
                        <select className="input-field" value={form.variant_param3_id} onChange={(e) => setForm((f) => ({ ...f, variant_param3_id: Number(e.target.value) }))}>
                            <option value={0}>Select Size</option>
                            {filteredVP3.map((v) => (<option key={v.id} value={v.id}>{v.name}</option>))}
                        </select>
                    </div>
                </div>

                {/* Brand dropdown + inline add */}
                <div>
                    <div className="flex items-center">
                        <label className="block text-xs text-surface-500 mb-1">Brand</label>
                        <InlineAdd
                            placeholder="New Brand"
                            onAdd={async (name) => {
                                if (!form.vertical_id) { addToast('Select a category first', 'error'); return; }
                                await db.brands.add({ name, vertical_id: form.vertical_id });
                                addToast(`Brand "${name}" added`, 'success');
                            }}
                        />
                    </div>
                    <select className="input-field" value={form.brand_id} onChange={(e) => setForm((f) => ({ ...f, brand_id: Number(e.target.value) }))}>
                        <option value={0}>Select Brand</option>
                        {filteredBrands.map((b) => (<option key={b.id} value={b.id}>{b.name}</option>))}
                    </select>
                </div>

                {/* Packing unit + inline add */}
                <div>
                    <div className="flex items-center">
                        <label className="block text-xs text-surface-500 mb-1">Packing Unit</label>
                        <InlineAdd
                            placeholder="e.g. box-10"
                            onAdd={async (name) => {
                                const mult = parseInt(name.replace(/\D/g, '')) || 1;
                                await db.packing_units.add({ unit_name: name, multiplier: mult });
                                addToast(`Packing "${name}" (×${mult}) added`, 'success');
                            }}
                        />
                    </div>
                    <select className="input-field" value={form.packing_unit_id} onChange={(e) => handlePackingChange(Number(e.target.value))}>
                        <option value={0}>Select Packing</option>
                        {packingUnits.map((pu) => (<option key={pu.id} value={pu.id}>{pu.unit_name} (×{pu.multiplier})</option>))}
                    </select>
                    {containerAutoComputed && (
                        <p className="text-xs text-emerald-600 mt-1">
                            Container prices auto-computed (×{selectedMultiplier})
                        </p>
                    )}
                </div>

                {/* MRP */}
                {numField('MRP', 'mrp', 'Maximum Retail Price')}

                {/* Pricing — unit vs container, lean vs bulk */}
                <div className="border border-surface-300 rounded-xl p-3 space-y-3">
                    <h3 className="text-xs font-semibold text-surface-500 uppercase tracking-wider">
                        Lean (Retail) Prices
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                        {numField('Per Unit', 'retail_price_unit', '0.00')}
                        {numField('Per Container', 'retail_price_container', '0.00', containerAutoComputed)}
                    </div>
                </div>
                <div className="border border-surface-300 rounded-xl p-3 space-y-3">
                    <h3 className="text-xs font-semibold text-surface-500 uppercase tracking-wider">
                        Bulk (Wholesale) Prices
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                        {numField('Per Unit', 'wholesale_price_unit', '0.00')}
                        {numField('Per Container', 'wholesale_price_container', '0.00', containerAutoComputed)}
                    </div>
                </div>

                {/* 3-Level Stock */}
                <div className="border border-surface-300 rounded-xl p-3 space-y-3">
                    <h3 className="text-xs font-semibold text-surface-500 uppercase tracking-wider">
                        Stock
                    </h3>
                    <div className="grid grid-cols-4 gap-3">
                        {numField('p_unit', 'p_unit', '12')}
                        {numField('P_unit_per_parcel', 'P_unit_per_parcel', '1')}
                        {numField('Parcels', 'stock_parcels', '0')}
                        {numField('Total Units', 'stock_units', '0', true)}
                    </div>
                    <p className="text-xs text-surface-400">
                        Total = p_unit × P_unit_per_parcel × parcels ({Number(form.p_unit) || 1} × {Number(form.P_unit_per_parcel) || 1} × {Number(form.stock_parcels) || 0} = {Number(form.stock_units) || 0})
                    </p>
                </div>

                <div className="flex gap-3 pt-2">
                    <button onClick={handleSave} className="btn-primary flex-1">Save</button>
                    <button onClick={onClose} className="btn-ghost flex-1">Cancel</button>
                </div>
            </div>
        </div>
    );
}

// ─── Inventory Page ─────────────────────────────────────────────

type SortKey = 'item_name' | 'category' | 'retail_price_container' | 'wholesale_price_container' | 'stock_parcels';
type SortDir = 'asc' | 'desc';

export default function Inventory() {
    const items = useLiveQuery(() => db.items.toArray()) || [];
    const allBrands = useLiveQuery(() => db.brands.toArray()) || [];
    const allProducts = useLiveQuery(() => db.products.toArray()) || [];
    const packingUnits = useLiveQuery(() => db.packing_units.toArray()) || [];
    const allVP1 = useLiveQuery(() => db.variant_params_1.toArray()) || [];
    const allVP2 = useLiveQuery(() => db.variant_params_2.toArray()) || [];
    const allVP3 = useLiveQuery(() => db.variant_params_3.toArray()) || [];
    const addToast = useAppStore((s) => s.addToast);

    const [showModal, setShowModal] = useState(false);
    const [showBulkInsert, setShowBulkInsert] = useState(false);
    const [editItem, setEditItem] = useState<Item | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [sortKey, setSortKey] = useState<SortKey>('item_name');
    const [sortDir, setSortDir] = useState<SortDir>('asc');
    const [groupByProduct, setGroupByProduct] = useState(true);
    const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

    // Lookup maps
    const brandMap = useMemo(() => {
        const m = new Map<number, string>();
        allBrands.forEach((b) => m.set(b.id!, b.name));
        return m;
    }, [allBrands]);

    const productMap = useMemo(() => {
        const m = new Map<number, string>();
        allProducts.forEach((p) => m.set(p.id!, p.name));
        return m;
    }, [allProducts]);

    const packingNameMap = useMemo(() => {
        const m = new Map<number, string>();
        packingUnits.forEach((pu) => m.set(pu.id!, pu.unit_name));
        return m;
    }, [packingUnits]);

    const vp1Map = useMemo(() => {
        const m = new Map<number, string>();
        allVP1.forEach((v) => m.set(v.id!, v.name));
        return m;
    }, [allVP1]);

    const vp2Map = useMemo(() => {
        const m = new Map<number, string>();
        allVP2.forEach((v) => m.set(v.id!, v.name));
        return m;
    }, [allVP2]);

    const vp3Map = useMemo(() => {
        const m = new Map<number, string>();
        allVP3.forEach((v) => m.set(v.id!, v.name));
        return m;
    }, [allVP3]);

    // Filter by search
    const filtered = useMemo(() => {
        if (!searchQuery.trim()) return items;
        const q = searchQuery.toLowerCase();
        return items.filter(
            (i) =>
                i.item_name.toLowerCase().includes(q) ||
                i.category.toLowerCase().includes(q) ||
                (i.brand_id && (brandMap.get(i.brand_id) || '').toLowerCase().includes(q)) ||
                (i.product_id && (productMap.get(i.product_id) || '').toLowerCase().includes(q)) ||
                (i.variant_param1_id && (vp1Map.get(i.variant_param1_id) || '').toLowerCase().includes(q))
        );
    }, [items, searchQuery, brandMap, productMap, vp1Map]);

    // Sort
    const sorted = useMemo(() => {
        return [...filtered].sort((a, b) => {
            const av = a[sortKey] ?? '';
            const bv = b[sortKey] ?? '';
            if (typeof av === 'number' && typeof bv === 'number') {
                return sortDir === 'asc' ? av - bv : bv - av;
            }
            const cmp = String(av).localeCompare(String(bv));
            return sortDir === 'asc' ? cmp : -cmp;
        });
    }, [filtered, sortKey, sortDir]);

    // Group by product name — always on, product name shown as header row
    const grouped = useMemo(() => {
        if (!groupByProduct) return null;
        const map = new Map<string, Item[]>();
        sorted.forEach((item) => {
            const groupKey = item.product_id ? productMap.get(item.product_id) || 'Uncategorized' : 'Uncategorized';
            if (!map.has(groupKey)) map.set(groupKey, []);
            map.get(groupKey)!.push(item);
        });
        return map;
    }, [sorted, groupByProduct, productMap]);

    const toggleSort = (key: SortKey) => {
        if (sortKey === key) {
            setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
        } else {
            setSortKey(key);
            setSortDir('asc');
        }
    };

    const toggleGroup = (key: string) => {
        setExpandedGroups((prev) => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key);
            else next.add(key);
            return next;
        });
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Delete this item?')) return;
        await db.items.delete(id);
        addToast('Item deleted', 'success');
    };

    // Price display helper — container price with unit in brackets
    const priceDisplay = (containerPrice: number, unitPrice: number) => {
        if (!containerPrice && !unitPrice) return '-';
        if (containerPrice && unitPrice && containerPrice !== unitPrice) {
            return (
                <span>
                    Rs.{containerPrice.toFixed(2)}
                    <span className="text-surface-400 text-xs ml-1">(Rs.{unitPrice.toFixed(2)}/u)</span>
                </span>
            );
        }
        return `Rs.${(containerPrice || unitPrice).toFixed(2)}`;
    };

    // Stock display — total packages (P_unit_per_parcel × parcels), with total units
    const stockDisplay = (item: Item) => {
        const puName = item.packing_unit_id ? packingNameMap.get(item.packing_unit_id) || '' : '';
        const totalPkgs = item.P_unit_per_parcel * item.stock_parcels * item.p_unit;
        return (
            <span>

                <span className={item.stock_parcels <= 5 ? 'text-red-600 font-semibold' : 'font-medium'}>
                    {item.stock_parcels} parcels
                </span>
                {puName && <span className="text-surface-400 text-xs ml-0.5"></span>}
                <span className="text-surface-400 text-xs ml-1">({totalPkgs} {puName})</span>

            </span>
        );
    };

    // Stats
    const totalItems = items.length;
    const lowStock = items.filter((i) => i.stock_parcels <= 5).length;
    const totalValue = items.reduce((sum, i) => sum + i.retail_price_container * i.stock_parcels, 0);

    const sortIcon = (key: SortKey) => {
        if (sortKey !== key) return '';
        return sortDir === 'asc' ? ' ↑' : ' ↓';
    };

    const TH = 'px-3 py-3 text-left text-xs font-medium text-surface-500 uppercase tracking-wider';
    const THSort = `${TH} cursor-pointer select-none hover:text-surface-900`;

    const COL_SPAN = 9;

    const renderItemRow = (item: Item) => (
        <tr key={item.id} className="border-b border-surface-200 hover:bg-surface-50 transition-colors">
            <td className="px-3 py-2.5 text-surface-700">{item.item_name}</td>
            <td className="px-3 py-2.5 text-surface-500">{item.variant_param1_id ? vp1Map.get(item.variant_param1_id) || '-' : '-'}</td>
            <td className="px-3 py-2.5 text-surface-500">{item.variant_param2_id ? vp2Map.get(item.variant_param2_id) || '-' : '-'}</td>
            <td className="px-3 py-2.5 text-surface-500">{item.variant_param3_id ? vp3Map.get(item.variant_param3_id) || '-' : '-'}</td>
            <td className="px-3 py-2.5 text-surface-500">{item.brand_id ? brandMap.get(item.brand_id) || '-' : '-'}</td>
            <td className="px-3 py-2.5 text-surface-500">{priceDisplay(item.retail_price_container, item.retail_price_unit)}</td>
            <td className="px-3 py-2.5 text-surface-500">{priceDisplay(item.wholesale_price_container, item.wholesale_price_unit)}</td>
            <td className="px-3 py-2.5 text-surface-500">{stockDisplay(item)}</td>
            <td className="px-3 py-2.5 text-surface-500">
                <div className="flex gap-1">
                    <button
                        onClick={() => { setEditItem(item); setShowModal(true); }}
                        className="p-1.5 hover:bg-surface-100 rounded-lg transition-colors"
                    >
                        <Pencil className="h-3.5 w-3.5 text-surface-500" />
                    </button>
                    <button
                        onClick={() => handleDelete(item.id!)}
                        className="p-1.5 hover:bg-red-50 rounded-lg transition-colors"
                    >
                        <Trash2 className="h-3.5 w-3.5 text-red-500" />
                    </button>
                </div>
            </td>
        </tr>
    );

    return (
        <div className="animate-fade-in space-y-4">
            {/* Stats bar */}
            <div className="grid grid-cols-3 gap-3">
                <div className="glass rounded-xl p-3 text-center">
                    <p className="text-2xl font-bold text-surface-900">{totalItems}</p>
                    <p className="text-xs text-surface-500">Total Items</p>
                </div>
                <div className="glass rounded-xl p-3 text-center">
                    <p className="text-2xl font-bold text-red-600">{lowStock}</p>
                    <p className="text-xs text-surface-500">Low Stock</p>
                </div>
                <div className="glass rounded-xl p-3 text-center">
                    <p className="text-2xl font-bold text-emerald-600">Rs.{totalValue.toFixed(0)}</p>
                    <p className="text-xs text-surface-500">Inventory Value</p>
                </div>
            </div>

            {/* Search + Group toggle + Add */}
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-400" />
                    <input
                        className="input-field pl-10"
                        placeholder="Search items..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => { setGroupByProduct((g) => !g); setExpandedGroups(new Set()); }}
                        className={`btn-ghost text-xs flex items-center gap-1.5 ${groupByProduct ? 'text-surface-900 font-semibold' : ''}`}
                    >
                        <Package className="h-3.5 w-3.5" />
                        {groupByProduct ? 'Ungroup' : 'Group by Product'}
                    </button>
                    <button
                        onClick={() => setShowBulkInsert(true)}
                        className="btn-secondary text-sm flex items-center gap-2"
                    >
                        <Upload className="h-4 w-4" /> Bulk Insert
                    </button>
                    <button
                        onClick={() => { setEditItem(null); setShowModal(true); }}
                        className="btn-primary text-sm flex items-center gap-2"
                    >
                        <Plus className="h-4 w-4" /> Add Item
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="glass rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-surface-200 bg-surface-50">
                                <th className={THSort} onClick={() => toggleSort('item_name')}>
                                    Item Name{sortIcon('item_name')}
                                </th>
                                <th className={TH}>Var 1</th>
                                <th className={TH}>Var 2</th>
                                <th className={TH}>Var 3</th>
                                <th className={TH}>Brand</th>
                                <th className={THSort} onClick={() => toggleSort('retail_price_container')}>
                                    Lean{sortIcon('retail_price_container')}
                                </th>
                                <th className={THSort} onClick={() => toggleSort('wholesale_price_container')}>
                                    Bulk{sortIcon('wholesale_price_container')}
                                </th>
                                <th className={THSort} onClick={() => toggleSort('stock_parcels')}>
                                    Stock{sortIcon('stock_parcels')}
                                </th>
                                <th className={TH}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(groupByProduct && grouped) ? (
                                Array.from(grouped.entries()).map(([groupKey, groupItems]) => (
                                    <>{/* Fragment per group */}
                                        <tr
                                            key={`group-${groupKey}`}
                                            className="bg-surface-100 cursor-pointer hover:bg-surface-200 border-b border-surface-200"
                                            onClick={() => toggleGroup(groupKey)}
                                        >
                                            <td colSpan={COL_SPAN} className="px-4 py-2.5">
                                                <span className="flex items-center gap-2 font-bold text-surface-900 text-sm">
                                                    {expandedGroups.has(groupKey) ? (
                                                        <ChevronDown className="h-4 w-4 text-surface-900" />
                                                    ) : (
                                                        <ChevronRight className="h-4 w-4 text-surface-400" />
                                                    )}
                                                    {groupKey}
                                                    <span className="text-xs text-surface-400 font-normal ml-1">
                                                        ({groupItems.length} items)
                                                    </span>
                                                </span>
                                            </td>
                                        </tr>
                                        {expandedGroups.has(groupKey) && groupItems.map((item) => renderItemRow(item))}
                                    </>
                                ))
                            ) : sorted.length === 0 ? (
                                <tr>
                                    <td colSpan={COL_SPAN} className="px-4 py-12 text-center text-surface-400">
                                        No items found. Add your first item to get started.
                                    </td>
                                </tr>
                            ) : (
                                sorted.map((item) => renderItemRow(item))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {showModal && (
                <ItemModal
                    item={editItem}
                    onClose={() => { setShowModal(false); setEditItem(null); }}
                />
            )}
            {showBulkInsert && (
                <BulkInsertModal
                    onClose={() => setShowBulkInsert(false)}
                    onSuccess={() => setShowBulkInsert(false)}
                />
            )}
        </div>
    );
}
