import { useState } from 'react';
import { useSupabaseQuery } from '@/hooks/useSupabaseQuery';
import { DAL } from '@/db/dal';
import { useAppStore } from '@/store/store';
import { Plus, Trash2, X, DollarSign, TrendingUp, TrendingDown } from 'lucide-react';

export default function Accounting() {
    const orders = useSupabaseQuery(['orders'], () => DAL.sales_orders.getAll(), []);
    const costs = useSupabaseQuery(['costs'], () => DAL.costs.getAll(), []);
    const addToast = useAppStore((s) => s.addToast);
    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState<any>({
        cost_type: '',
        business_type: '',
        amount: 0,
        description: '',
        date: new Date().toISOString().split('T')[0],
    });

    const [filterMonth, setFilterMonth] = useState(new Date().toISOString().substring(0, 7));

    const monthOrders = orders.filter((o: any) => (o.order_date || o.created_at || '').startsWith(filterMonth));
    const monthCosts = costs.filter((c: any) => (c.date || '').startsWith(filterMonth));
    const revenue = monthOrders.reduce((s: number, o: any) => s + Number(o.grand_total ?? 0), 0);
    const totalCost = monthCosts.reduce((s: number, c: any) => s + Number(c.amount ?? 0), 0);
    const profit = revenue - totalCost;

    const handleSaveCost = async () => {
        if (!form.cost_type || !form.amount) {
            addToast('Type and amount required', 'error');
            return;
        }
        await DAL.costs.add(form);
        addToast('Cost recorded', 'success');
        setShowModal(false);
        setForm({ cost_type: '', business_type: '', amount: 0, description: '', date: new Date().toISOString().split('T')[0] });
    };

    const handleDeleteCost = async (id: number) => {
        await DAL.costs.delete(id);
        addToast('Cost deleted', 'info');
    };

    return (
        <div className="animate-fade-in space-y-4">
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
                <input
                    type="month"
                    className="input-field max-w-xs"
                    value={filterMonth}
                    onChange={(e) => setFilterMonth(e.target.value)}
                />
                <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
                    <Plus className="h-4 w-4" /> Add Cost
                </button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="glass rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-1">
                        <TrendingUp className="h-4 w-4 text-emerald-400" />
                        <span className="text-xs text-surface-500">Revenue</span>
                    </div>
                    <p className="text-2xl font-bold text-emerald-400">Rs.{revenue.toFixed(2)}</p>
                    <p className="text-xs text-surface-500">{monthOrders.length} orders</p>
                </div>
                <div className="glass rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-1">
                        <TrendingDown className="h-4 w-4 text-red-500" />
                        <span className="text-xs text-surface-500">Costs</span>
                    </div>
                    <p className="text-2xl font-bold text-red-400">Rs.{totalCost.toFixed(2)}</p>
                    <p className="text-xs text-surface-500">{monthCosts.length} entries</p>
                </div>
                <div className="glass rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-1">
                        <DollarSign className="h-4 w-4 text-brand-500" />
                        <span className="text-xs text-surface-500">Profit</span>
                    </div>
                    <p className={`text-2xl font-bold ${profit >= 0 ? 'text-brand-400' : 'text-red-400'}`}>
                        Rs.{profit.toFixed(2)}
                    </p>
                    <p className="text-xs text-surface-500">{revenue > 0 ? `${((profit / revenue) * 100).toFixed(1)}% margin` : '-'}</p>
                </div>
            </div>

            {/* Costs Table */}
            <div className="glass rounded-xl overflow-hidden">
                <div className="p-3 border-b border-surface-200">
                    <h3 className="text-sm font-semibold">Cost Entries</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-surface-200">
                                <th className="text-left px-4 py-2 text-xs text-surface-500 uppercase">Date</th>
                                <th className="text-left px-4 py-2 text-xs text-surface-500 uppercase">Type</th>
                                <th className="text-left px-4 py-2 text-xs text-surface-500 uppercase">Business</th>
                                <th className="text-left px-4 py-2 text-xs text-surface-500 uppercase">Description</th>
                                <th className="text-right px-4 py-2 text-xs text-surface-500 uppercase">Amount</th>
                                <th className="px-4 py-2"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {monthCosts.length === 0 ? (
                                <tr><td colSpan={6} className="px-4 py-8 text-center text-surface-500">No costs for this month</td></tr>
                            ) : (
                                monthCosts.map((c: any) => (
                                    <tr key={c.id} className="border-b border-surface-100 hover:bg-surface-50">
                                        <td className="px-4 py-2 text-surface-500">{c.date}</td>
                                        <td className="px-4 py-2 text-surface-500"><span className="badge-info">{c.cost_type}</span></td>
                                        <td className="px-4 py-2 text-surface-500">{c.business_type}</td>
                                        <td className="px-4 py-2 text-surface-500">{c.description}</td>
                                        <td className="px-4 py-2 text-right font-semibold text-red-500">Rs.{Number(c.amount).toFixed(2)}</td>
                                        <td className="px-4 py-2 text-surface-500">
                                            <button onClick={() => handleDeleteCost(c.id!)} className="btn-ghost p-1"><Trash2 className="h-4 w-4 text-red-400" /></button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Orders Revenue Table */}
            <div className="glass rounded-xl overflow-hidden">
                <div className="p-3 border-b border-surface-200">
                    <h3 className="text-sm font-semibold">Orders Revenue</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-surface-200">
                                <th className="text-left px-4 py-2 text-xs text-surface-500 uppercase">ID</th>
                                <th className="text-left px-4 py-2 text-xs text-surface-500 uppercase">Customer</th>
                                <th className="text-left px-4 py-2 text-xs text-surface-500 uppercase">Date</th>
                                <th className="text-left px-4 py-2 text-xs text-surface-500 uppercase">Status</th>
                                <th className="text-right px-4 py-2 text-xs text-surface-500 uppercase">Total</th>
                                <th className="text-right px-4 py-2 text-xs text-surface-500 uppercase">Due</th>
                            </tr>
                        </thead>
                        <tbody>
                            {monthOrders.length === 0 ? (
                                <tr><td colSpan={6} className="px-4 py-8 text-center text-surface-500">No orders this month</td></tr>
                            ) : (
                                monthOrders.map((o: any) => (
                                    <tr key={o.id} className="border-b border-surface-100 hover:bg-surface-50">
                                        <td className="px-4 py-2 font-medium text-surface-500">#{o.id}</td>
                                        <td className="px-4 py-2 text-surface-500">{o.prospect_name}</td>
                                        <td className="px-4 py-2 text-surface-500">{new Date(o.order_date || o.created_at).toLocaleDateString('en-IN')}</td>
                                        <td className="px-4 py-2">
                                            <span className={o.status === 'pending' ? 'badge-warning' : o.status === 'delivered' ? 'badge-success' : 'badge-info'}>{o.status}</span>
                                        </td>
                                        <td className="px-4 py-2 text-right font-semibold text-emerald-400">Rs.{Number(o.grand_total).toFixed(2)}</td>
                                        <td className="px-4 py-2 text-right text-amber-400">Rs.{Number(o.due_amount).toFixed(2)}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Add Cost Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                    <div className="glass rounded-2xl p-6 w-full max-w-md animate-slide-up">
                        <div className="flex justify-between mb-5">
                            <h3 className="text-lg font-semibold text-surface-500">Add Cost</h3>
                            <button onClick={() => setShowModal(false)} className="btn-ghost p-1.5"><X className="h-5 w-5" /></button>
                        </div>
                        <div className="space-y-3">
                            <div>
                                <label className="text-xs text-surface-400 mb-1 block">Cost Type</label>
                                <select className="input-field" value={form.cost_type || ''} onChange={(e) => setForm({ ...form, cost_type: e.target.value })}>
                                    <option value="">Select...</option>
                                    <option value="logistics">Logistics</option>
                                    <option value="salary">Salary</option>
                                    <option value="rent">Rent</option>
                                    <option value="purchase">Purchase</option>
                                    <option value="marketing">Marketing</option>
                                    <option value="utility">Utility</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-xs text-surface-400 mb-1 block">Business Type</label>
                                <input className="input-field" value={form.business_type || ''} onChange={(e) => setForm({ ...form, business_type: e.target.value })} />
                            </div>
                            <div>
                                <label className="text-xs text-surface-400 mb-1 block">Amount</label>
                                <input type="text" inputMode="decimal" className="input-field" value={form.amount || ''} onChange={(e) => setForm({ ...form, amount: parseFloat(e.target.value) || 0 })} />
                            </div>
                            <div>
                                <label className="text-xs text-surface-400 mb-1 block">Description</label>
                                <input className="input-field" value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                            </div>
                            <div>
                                <label className="text-xs text-surface-500 mb-1 block">Date</label>
                                <input type="date" className="input-field" value={form.date || ''} onChange={(e) => setForm({ ...form, date: e.target.value })} />
                            </div>
                        </div>
                        <div className="flex gap-3 mt-5">
                            <button onClick={() => setShowModal(false)} className="btn-secondary flex-1">Cancel</button>
                            <button onClick={handleSaveCost} className="btn-primary flex-1">Save</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
