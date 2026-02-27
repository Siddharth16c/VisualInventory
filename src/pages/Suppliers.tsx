import { useState } from 'react';
import { useLiveQuery } from '@/hooks/useLiveQuery';
import { DAL } from '@/db/dal';
import { useAppStore } from '@/store/store';
import {
    Truck, Plus, Search, ChevronDown, ChevronRight,
    Package, Calendar, TrendingUp, FileText, X, Loader2
} from 'lucide-react';

type SupplierWithVolume = {
    id: number;
    name: string;
    contact?: string | null;
    address?: string | null;
    vertical_id?: number | null;
    notes?: string | null;
    created_at: string;
};

function formatMonth(dateStr: string) {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
}

export default function Suppliers() {
    const addToast = useAppStore(s => s.addToast);
    const [search, setSearch] = useState('');
    const [expandedId, setExpandedId] = useState<number | null>(null);
    const [showForm, setShowForm] = useState(false);
    const [showPoForm, setShowPoForm] = useState<number | null>(null); // supplier id
    const [loadingVolume, setLoadingVolume] = useState(false);
    const [volumeData, setVolumeData] = useState<any[]>([]);
    const [poHistory, setPoHistory] = useState<any[]>([]);

    // Form state
    const [form, setForm] = useState({ name: '', contact: '', address: '', notes: '' });
    const [poForm, setPoForm] = useState({
        order_date: new Date().toISOString().split('T')[0],
        subtotal: '', freight_cost: '', packaging_cost: '', notes: '', status: 'received'
    });

    const suppliers = useLiveQuery(() => DAL.suppliers.getAll(), [] as any[],
        ['suppliers']
    ) as SupplierWithVolume[];

    const verticals = useLiveQuery(() => DAL.verticals.getAll(), [] as any[], ['verticals']) as any[];

    const filtered = suppliers.filter(s =>
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        (s.contact || '').includes(search)
    );

    const handleAddSupplier = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await DAL.suppliers.add(form);
            addToast('Supplier added', 'success');
            setForm({ name: '', contact: '', address: '', notes: '' });
            setShowForm(false);
        } catch (err: any) {
            addToast(`Error: ${err.message}`, 'error');
        }
    };

    const handleExpand = async (supplierId: number) => {
        if (expandedId === supplierId) { setExpandedId(null); return; }
        setExpandedId(supplierId);
        setLoadingVolume(true);
        try {
            const [vol, po] = await Promise.all([
                DAL.suppliers.getBusinessVolume(supplierId),
                DAL.purchase_orders.getBySupplier(supplierId),
            ]);
            setVolumeData(vol || []);
            setPoHistory(po || []);
        } catch (err: any) {
            addToast(`Load error: ${err.message}`, 'error');
        } finally {
            setLoadingVolume(false);
        }
    };

    const handleAddPo = async (e: React.FormEvent, supplierId: number) => {
        e.preventDefault();
        try {
            const subtotal = parseFloat(poForm.subtotal) || 0;
            const freight = parseFloat(poForm.freight_cost) || 0;
            const packaging = parseFloat(poForm.packaging_cost) || 0;
            await DAL.purchase_orders.add({
                supplier_id: supplierId,
                order_date: poForm.order_date,
                status: poForm.status,
                subtotal,
                freight_cost: freight,
                packaging_cost: packaging,
                total_cost: subtotal + freight + packaging,
                notes: poForm.notes,
            });
            addToast('Purchase order recorded', 'success');
            setShowPoForm(null);
            await handleExpand(supplierId); // refresh
        } catch (err: any) {
            addToast(`Error: ${err.message}`, 'error');
        }
    };

    // Monthly volume rollup helper
    const monthlyVolume = () => {
        const map = new Map<string, number>();
        volumeData.forEach(po => {
            const month = formatMonth(po.order_date);
            map.set(month, (map.get(month) || 0) + (po.total_cost || 0));
        });
        return Array.from(map.entries()).slice(0, 6);
    };

    return (
        <div className="animate-fade-in space-y-4">
            {/* Header */}
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-surface-900 flex items-center gap-2">
                        <Truck className="h-6 w-6 text-brand-600" /> Suppliers
                    </h1>
                    <p className="text-sm text-surface-500 mt-0.5">Manage suppliers and purchase history</p>
                </div>
                <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2">
                    <Plus className="h-4 w-4" /> Add Supplier
                </button>
            </div>

            {/* Search */}
            <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-400" />
                <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search suppliers..."
                    className="input-field pl-10"
                />
            </div>

            {/* Add Supplier Form */}
            {showForm && (
                <div className="glass rounded-xl p-6 border border-brand-200">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold text-surface-900">New Supplier</h3>
                        <button onClick={() => setShowForm(false)} className="btn-ghost p-1"><X className="h-4 w-4" /></button>
                    </div>
                    <form onSubmit={handleAddSupplier} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="sm:col-span-2">
                            <label className="label">Supplier / Manufacturer Name *</label>
                            <input required className="input-field" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Apsara Industries" />
                        </div>
                        <div>
                            <label className="label">Contact</label>
                            <input className="input-field" value={form.contact} onChange={e => setForm({ ...form, contact: e.target.value })} placeholder="Phone or email" />
                        </div>
                        <div>
                            <label className="label">Address</label>
                            <input className="input-field" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="City / Region" />
                        </div>
                        <div className="sm:col-span-2">
                            <label className="label">Notes</label>
                            <textarea className="input-field h-20 resize-none" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Any remarks about this supplier..." />
                        </div>
                        <div className="sm:col-span-2 flex gap-2 justify-end">
                            <button type="button" onClick={() => setShowForm(false)} className="btn-ghost">Cancel</button>
                            <button type="submit" className="btn-primary">Save Supplier</button>
                        </div>
                    </form>
                </div>
            )}

            {/* Supplier List */}
            <div className="space-y-3">
                {filtered.length === 0 && (
                    <div className="glass rounded-xl p-12 text-center text-surface-400">
                        <Truck className="h-10 w-10 mx-auto mb-3 opacity-20" />
                        <p>No suppliers yet. Add your first one above.</p>
                    </div>
                )}
                {filtered.map(supplier => (
                    <div key={supplier.id} className="glass rounded-xl overflow-hidden">
                        {/* Row header */}
                        <button
                            onClick={() => handleExpand(supplier.id)}
                            className="w-full flex items-center justify-between p-4 hover:bg-surface-50 transition-colors"
                        >
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-bold text-sm">
                                    {supplier.name.charAt(0).toUpperCase()}
                                </div>
                                <div className="text-left">
                                    <p className="font-semibold text-surface-900">{supplier.name}</p>
                                    <p className="text-xs text-surface-500">{supplier.contact || 'No contact'} {supplier.address ? `· ${supplier.address}` : ''}</p>
                                </div>
                            </div>
                            {expandedId === supplier.id ? <ChevronDown className="h-4 w-4 text-surface-400" /> : <ChevronRight className="h-4 w-4 text-surface-400" />}
                        </button>

                        {/* Expanded detail */}
                        {expandedId === supplier.id && (
                            <div className="border-t border-surface-200 p-4 space-y-4">
                                {loadingVolume ? (
                                    <div className="flex items-center gap-2 text-surface-400 justify-center py-4">
                                        <Loader2 className="h-4 w-4 animate-spin" /> Loading history…
                                    </div>
                                ) : (
                                    <>
                                        {/* Monthly Volume */}
                                        {monthlyVolume().length > 0 && (
                                            <div>
                                                <h4 className="text-sm font-semibold text-surface-700 flex items-center gap-1.5 mb-2">
                                                    <TrendingUp className="h-4 w-4 text-brand-500" /> Business Volume by Month
                                                </h4>
                                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                                    {monthlyVolume().map(([month, amount]) => (
                                                        <div key={month} className="bg-surface-50 rounded-lg p-3 text-center">
                                                            <p className="text-xs text-surface-500">{month}</p>
                                                            <p className="font-bold text-surface-900">₹{(amount as number).toLocaleString('en-IN')}</p>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Purchase Orders */}
                                        <div>
                                            <div className="flex items-center justify-between mb-2">
                                                <h4 className="text-sm font-semibold text-surface-700 flex items-center gap-1.5">
                                                    <Package className="h-4 w-4 text-brand-500" /> Purchase Order History
                                                </h4>
                                                <button
                                                    onClick={() => setShowPoForm(showPoForm === supplier.id ? null : supplier.id)}
                                                    className="btn-ghost text-xs flex items-center gap-1"
                                                >
                                                    <Plus className="h-3 w-3" /> Record PO
                                                </button>
                                            </div>

                                            {/* New PO Form */}
                                            {showPoForm === supplier.id && (
                                                <form onSubmit={e => handleAddPo(e, supplier.id)} className="bg-surface-50 rounded-lg p-4 mb-3 space-y-3">
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <div>
                                                            <label className="label">Date</label>
                                                            <input type="date" className="input-field" value={poForm.order_date} onChange={e => setPoForm({ ...poForm, order_date: e.target.value })} />
                                                        </div>
                                                        <div>
                                                            <label className="label">Status</label>
                                                            <select className="input-field" value={poForm.status} onChange={e => setPoForm({ ...poForm, status: e.target.value })}>
                                                                <option value="ordered">Ordered</option>
                                                                <option value="received">Received</option>
                                                                <option value="partial">Partial</option>
                                                                <option value="cancelled">Cancelled</option>
                                                            </select>
                                                        </div>
                                                        <div>
                                                            <label className="label">Subtotal (₹)</label>
                                                            <input type="number" className="input-field" value={poForm.subtotal} onChange={e => setPoForm({ ...poForm, subtotal: e.target.value })} placeholder="0" />
                                                        </div>
                                                        <div>
                                                            <label className="label">Freight (₹)</label>
                                                            <input type="number" className="input-field" value={poForm.freight_cost} onChange={e => setPoForm({ ...poForm, freight_cost: e.target.value })} placeholder="0" />
                                                        </div>
                                                        <div>
                                                            <label className="label">Packaging (₹)</label>
                                                            <input type="number" className="input-field" value={poForm.packaging_cost} onChange={e => setPoForm({ ...poForm, packaging_cost: e.target.value })} placeholder="0" />
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <label className="label">Remarks / Notes</label>
                                                        <textarea className="input-field h-16 resize-none" value={poForm.notes} onChange={e => setPoForm({ ...poForm, notes: e.target.value })} placeholder="Any notes about this purchase order..." />
                                                    </div>
                                                    <div className="flex gap-2 justify-end">
                                                        <button type="button" onClick={() => setShowPoForm(null)} className="btn-ghost text-sm">Cancel</button>
                                                        <button type="submit" className="btn-primary text-sm">Record</button>
                                                    </div>
                                                </form>
                                            )}

                                            {poHistory.length === 0 ? (
                                                <p className="text-sm text-surface-400 text-center py-3">No purchase orders yet</p>
                                            ) : (
                                                <div className="overflow-x-auto">
                                                    <table className="w-full text-xs">
                                                        <thead>
                                                            <tr className="text-surface-500 border-b border-surface-200">
                                                                <th className="text-left pb-2">Date</th>
                                                                <th className="text-left pb-2">Status</th>
                                                                <th className="text-right pb-2">Subtotal</th>
                                                                <th className="text-right pb-2">Freight</th>
                                                                <th className="text-right pb-2">Total</th>
                                                                <th className="text-left pb-2 pl-3">Notes</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {poHistory.map(po => (
                                                                <tr key={po.id} className="border-b border-surface-100 hover:bg-surface-50">
                                                                    <td className="py-2 flex items-center gap-1 text-surface-600">
                                                                        <Calendar className="h-3 w-3" />
                                                                        {new Date(po.order_date).toLocaleDateString('en-IN')}
                                                                    </td>
                                                                    <td className="py-2">
                                                                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${po.status === 'received' ? 'bg-green-100 text-green-700' : po.status === 'ordered' ? 'bg-blue-100 text-blue-700' : po.status === 'partial' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                                                                            {po.status}
                                                                        </span>
                                                                    </td>
                                                                    <td className="py-2 text-right">₹{(po.subtotal || 0).toLocaleString('en-IN')}</td>
                                                                    <td className="py-2 text-right">₹{((po.freight_cost || 0) + (po.packaging_cost || 0)).toLocaleString('en-IN')}</td>
                                                                    <td className="py-2 text-right font-semibold">₹{(po.total_cost || 0).toLocaleString('en-IN')}</td>
                                                                    <td className="py-2 pl-3 text-surface-500 max-w-[150px] truncate">{po.notes || '—'}</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            )}
                                        </div>

                                        {/* Notes */}
                                        {supplier.notes && (
                                            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex gap-2">
                                                <FileText className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
                                                <p className="text-sm text-amber-800">{supplier.notes}</p>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
