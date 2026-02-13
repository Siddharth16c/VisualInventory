import { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Product } from '@/db/dexie';
import { useAppStore } from '@/store/store';
import {
    useReactTable,
    getCoreRowModel,
    getSortedRowModel,
    getFilteredRowModel,
    flexRender,
    type ColumnDef,
    type SortingState,
} from '@tanstack/react-table';
import { rankItem } from '@tanstack/match-sorter-utils';
import { Plus, Pencil, Trash2, Search, ArrowUpDown, X } from 'lucide-react';

// ─── Fuzzy Filter ───────────────────────────────────────────────

const fuzzyFilter = (row: any, columnId: string, value: string, addMeta: any) => {
    const itemRank = rankItem(row.getValue(columnId), value);
    addMeta({ itemRank });
    return itemRank.passed;
};

// ─── Product Form Modal ─────────────────────────────────────────

function ProductModal({
    product,
    onClose,
}: {
    product: Product | null;
    onClose: () => void;
}) {
    const addToast = useAppStore((s) => s.addToast);
    const verticals = useLiveQuery(() => db.verticals.toArray()) || [];
    const brands = useLiveQuery(() => db.brands.toArray()) || [];

    const [form, setForm] = useState<Partial<Product>>(
        product || {
            item_name: '',
            category: '',
            product_name: '',
            type: '',
            mrp: 0,
            selling_price: 0,
            unit: 'pcs',
            stock_qty: 0,
            metadata: {},
        }
    );
    const [metaKey, setMetaKey] = useState('');
    const [metaVal, setMetaVal] = useState('');

    const handleSave = async () => {
        if (!form.item_name || !form.product_name) {
            addToast('Item name and Product name are required', 'error');
            return;
        }
        try {
            const now = new Date().toISOString();
            if (product?.id) {
                await db.products.update(product.id, { ...form, updatedAt: now });
                addToast('Product updated', 'success');
            } else {
                await db.products.add({ ...form, createdAt: now } as Product);
                addToast('Product added', 'success');
            }
            onClose();
        } catch (e) {
            addToast('Failed to save product', 'error');
        }
    };

    const addMeta = () => {
        if (metaKey.trim()) {
            setForm((f) => ({ ...f, metadata: { ...f.metadata, [metaKey]: metaVal } }));
            setMetaKey('');
            setMetaVal('');
        }
    };

    const removeMeta = (key: string) => {
        const m = { ...form.metadata };
        delete m[key];
        setForm((f) => ({ ...f, metadata: m }));
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="glass rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto animate-slide-up">
                <div className="flex items-center justify-between mb-5">
                    <h3 className="text-lg font-semibold">{product ? 'Edit Product' : 'Add Product'}</h3>
                    <button onClick={onClose} className="btn-ghost p-1.5"><X className="h-5 w-5" /></button>
                </div>
                <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs text-surface-400 mb-1 block">Item Name *</label>
                            <input className="input-field" value={form.item_name || ''} onChange={(e) => setForm((f) => ({ ...f, item_name: e.target.value }))} />
                        </div>
                        <div>
                            <label className="text-xs text-surface-400 mb-1 block">Product Name *</label>
                            <input className="input-field" value={form.product_name || ''} onChange={(e) => setForm((f) => ({ ...f, product_name: e.target.value }))} />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs text-surface-400 mb-1 block">Category</label>
                            <input className="input-field" value={form.category || ''} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} />
                        </div>
                        <div>
                            <label className="text-xs text-surface-400 mb-1 block">Type</label>
                            <input className="input-field" value={form.type || ''} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))} />
                        </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                        <div>
                            <label className="text-xs text-surface-400 mb-1 block">MRP</label>
                            <input type="number" className="input-field" value={form.mrp || 0} onChange={(e) => setForm((f) => ({ ...f, mrp: parseFloat(e.target.value) || 0 }))} />
                        </div>
                        <div>
                            <label className="text-xs text-surface-400 mb-1 block">Selling Price</label>
                            <input type="number" className="input-field" value={form.selling_price || 0} onChange={(e) => setForm((f) => ({ ...f, selling_price: parseFloat(e.target.value) || 0 }))} />
                        </div>
                        <div>
                            <label className="text-xs text-surface-400 mb-1 block">Stock</label>
                            <input type="number" className="input-field" value={form.stock_qty || 0} onChange={(e) => setForm((f) => ({ ...f, stock_qty: parseInt(e.target.value) || 0 }))} />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs text-surface-400 mb-1 block">Unit</label>
                            <select className="input-field" value={form.unit || 'pcs'} onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}>
                                <option value="pcs">Pieces</option>
                                <option value="kg">Kg</option>
                                <option value="ltr">Litre</option>
                                <option value="box">Box</option>
                                <option value="pack">Pack</option>
                                <option value="dozen">Dozen</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-xs text-surface-400 mb-1 block">Vertical</label>
                            <select className="input-field" value={form.vertical_id || ''} onChange={(e) => setForm((f) => ({ ...f, vertical_id: parseInt(e.target.value) || undefined }))}>
                                <option value="">None</option>
                                {verticals.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
                            </select>
                        </div>
                    </div>

                    {/* Dynamic Metadata */}
                    <div className="border-t border-surface-700 pt-3 mt-3">
                        <label className="text-xs text-surface-400 mb-2 block">Custom Fields (domain metadata)</label>
                        {Object.entries(form.metadata || {}).map(([k, v]) => (
                            <div key={k} className="flex items-center gap-2 mb-1">
                                <span className="badge-info">{k}: {String(v)}</span>
                                <button onClick={() => removeMeta(k)} className="text-red-400 hover:text-red-300"><X className="h-3.5 w-3.5" /></button>
                            </div>
                        ))}
                        <div className="flex gap-2 mt-2">
                            <input placeholder="Key" className="input-field flex-1 text-sm" value={metaKey} onChange={(e) => setMetaKey(e.target.value)} />
                            <input placeholder="Value" className="input-field flex-1 text-sm" value={metaVal} onChange={(e) => setMetaVal(e.target.value)} />
                            <button onClick={addMeta} className="btn-secondary text-sm px-3">Add</button>
                        </div>
                    </div>
                </div>
                <div className="flex gap-3 mt-5">
                    <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
                    <button onClick={handleSave} className="btn-primary flex-1">Save</button>
                </div>
            </div>
        </div>
    );
}

// ─── Inventory Page ─────────────────────────────────────────────

export default function Inventory() {
    const products = useLiveQuery(() => db.products.toArray()) || [];
    const addToast = useAppStore((s) => s.addToast);
    const [sorting, setSorting] = useState<SortingState>([]);
    const [globalFilter, setGlobalFilter] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editProduct, setEditProduct] = useState<Product | null>(null);

    const columns = useMemo<ColumnDef<Product, any>[]>(
        () => [
            { accessorKey: 'item_name', header: 'Item Name', filterFn: 'fuzzy' as any },
            { accessorKey: 'product_name', header: 'Product', filterFn: 'fuzzy' as any },
            { accessorKey: 'category', header: 'Category' },
            { accessorKey: 'mrp', header: 'MRP', cell: (info) => `₹${info.getValue()?.toFixed(2) || '0.00'}` },
            { accessorKey: 'selling_price', header: 'Price', cell: (info) => `₹${info.getValue()?.toFixed(2) || '0.00'}` },
            { accessorKey: 'stock_qty', header: 'Stock' },
            { accessorKey: 'unit', header: 'Unit' },
            {
                id: 'actions',
                header: '',
                cell: ({ row }) => (
                    <div className="flex gap-1">
                        <button onClick={() => { setEditProduct(row.original); setShowModal(true); }} className="btn-ghost p-1.5">
                            <Pencil className="h-4 w-4 text-brand-400" />
                        </button>
                        <button onClick={() => handleDelete(row.original.id!)} className="btn-ghost p-1.5">
                            <Trash2 className="h-4 w-4 text-red-400" />
                        </button>
                    </div>
                ),
            },
        ],
        []
    );

    const table = useReactTable({
        data: products,
        columns,
        state: { sorting, globalFilter },
        onSortingChange: setSorting,
        onGlobalFilterChange: setGlobalFilter,
        globalFilterFn: fuzzyFilter,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
    });

    const handleDelete = async (id: number) => {
        if (confirm('Delete this product?')) {
            await db.products.delete(id);
            addToast('Product deleted', 'info');
        }
    };

    return (
        <div className="animate-fade-in space-y-4">
            {/* Header Row */}
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-500" />
                    <input
                        className="input-field pl-10"
                        placeholder="Search products..."
                        value={globalFilter}
                        onChange={(e) => setGlobalFilter(e.target.value)}
                    />
                </div>
                <button
                    onClick={() => { setEditProduct(null); setShowModal(true); }}
                    className="btn-primary flex items-center gap-2"
                >
                    <Plus className="h-4 w-4" /> Add Product
                </button>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="glass rounded-xl p-3">
                    <p className="text-xs text-surface-400">Total Products</p>
                    <p className="text-xl font-bold text-surface-100">{products.length}</p>
                </div>
                <div className="glass rounded-xl p-3">
                    <p className="text-xs text-surface-400">Total Stock</p>
                    <p className="text-xl font-bold text-surface-100">{products.reduce((s, p) => s + (p.stock_qty || 0), 0)}</p>
                </div>
                <div className="glass rounded-xl p-3">
                    <p className="text-xs text-surface-400">Categories</p>
                    <p className="text-xl font-bold text-surface-100">{new Set(products.map((p) => p.category)).size}</p>
                </div>
                <div className="glass rounded-xl p-3">
                    <p className="text-xs text-surface-400">Low Stock (&lt;10)</p>
                    <p className="text-xl font-bold text-amber-400">{products.filter((p) => p.stock_qty < 10).length}</p>
                </div>
            </div>

            {/* Data Table */}
            <div className="glass rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            {table.getHeaderGroups().map((hg) => (
                                <tr key={hg.id} className="border-b border-surface-700">
                                    {hg.headers.map((header) => (
                                        <th
                                            key={header.id}
                                            className="px-4 py-3 text-left text-xs font-medium text-surface-400 uppercase tracking-wider cursor-pointer select-none hover:text-surface-200"
                                            onClick={header.column.getToggleSortingHandler()}
                                        >
                                            <div className="flex items-center gap-1">
                                                {flexRender(header.column.columnDef.header, header.getContext())}
                                                {header.column.getCanSort() && <ArrowUpDown className="h-3 w-3" />}
                                            </div>
                                        </th>
                                    ))}
                                </tr>
                            ))}
                        </thead>
                        <tbody>
                            {table.getRowModel().rows.length === 0 ? (
                                <tr>
                                    <td colSpan={columns.length} className="px-4 py-12 text-center text-surface-500">
                                        No products found. Click "Add Product" to get started.
                                    </td>
                                </tr>
                            ) : (
                                table.getRowModel().rows.map((row) => (
                                    <tr key={row.id} className="border-b border-surface-800 hover:bg-surface-800/50 transition-colors">
                                        {row.getVisibleCells().map((cell) => (
                                            <td key={cell.id} className="px-4 py-3 whitespace-nowrap">
                                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                            </td>
                                        ))}
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {showModal && (
                <ProductModal product={editProduct} onClose={() => { setShowModal(false); setEditProduct(null); }} />
            )}
        </div>
    );
}
