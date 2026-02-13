import { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/dexie';
import { TrendingUp, TrendingDown, DollarSign, ShoppingCart, Users, Package, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Dashboard() {
    const orders = useLiveQuery(() => db.orders.toArray()) || [];
    const products = useLiveQuery(() => db.products.toArray()) || [];
    const prospects = useLiveQuery(() => db.prospects.toArray()) || [];
    const costs = useLiveQuery(() => db.costs.toArray()) || [];

    const stats = useMemo(() => {
        const today = new Date().toISOString().split('T')[0];
        const todayOrders = orders.filter((o) => o.order_date.startsWith(today));
        const todayRevenue = todayOrders.reduce((s, o) => s + o.grand_total, 0);
        const totalRevenue = orders.reduce((s, o) => s + o.grand_total, 0);
        const totalCosts = costs.reduce((s, c) => s + c.amount, 0);
        const profit = totalRevenue - totalCosts;
        const margin = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;
        const lowStockCount = products.filter((p) => p.stock_qty < 10).length;
        const pendingOrders = orders.filter((o) => o.status === 'pending').length;
        const totalDue = orders.reduce((s, o) => s + o.due_amount, 0);

        return { todayRevenue, totalRevenue, totalCosts, profit, margin, lowStockCount, pendingOrders, totalDue, todayOrders: todayOrders.length };
    }, [orders, products, costs]);

    const recentOrders = orders.slice(-5).reverse();

    return (
        <div className="animate-fade-in space-y-6">
            {/* Main Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <StatCard icon={DollarSign} label="Today's Revenue" value={`₹${stats.todayRevenue.toFixed(0)}`} sub={`${stats.todayOrders} orders`} color="brand" />
                <StatCard icon={TrendingUp} label="Total Revenue" value={`₹${stats.totalRevenue.toFixed(0)}`} sub={`${orders.length} orders`} color="emerald" />
                <StatCard icon={TrendingDown} label="Total Costs" value={`₹${stats.totalCosts.toFixed(0)}`} sub={`${costs.length} entries`} color="amber" />
                <StatCard icon={DollarSign} label="Profit Margin" value={`${stats.margin.toFixed(1)}%`} sub={`₹${stats.profit.toFixed(0)} profit`} color={stats.profit >= 0 ? 'emerald' : 'red'} />
            </div>

            {/* Secondary Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <StatCard icon={Package} label="Products" value={String(products.length)} sub={`${stats.lowStockCount} low stock`} color="brand" />
                <StatCard icon={Users} label="Prospects" value={String(prospects.length)} color="violet" />
                <StatCard icon={ShoppingCart} label="Pending Orders" value={String(stats.pendingOrders)} color="amber" />
                <StatCard icon={DollarSign} label="Total Due" value={`₹${stats.totalDue.toFixed(0)}`} color="red" />
            </div>

            {/* Recent Orders */}
            <div className="glass rounded-xl">
                <div className="flex items-center justify-between px-4 py-3 border-b border-surface-700">
                    <h3 className="text-sm font-semibold">Recent Orders</h3>
                    <Link to="/billing" className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1">
                        View all <ArrowRight className="h-3 w-3" />
                    </Link>
                </div>
                {recentOrders.length === 0 ? (
                    <p className="p-6 text-center text-surface-500 text-sm">No orders yet</p>
                ) : (
                    <div className="divide-y divide-surface-800">
                        {recentOrders.map((o) => (
                            <div key={o.id} className="px-4 py-3 flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium">#{o.id} — {o.prospect_name}</p>
                                    <p className="text-xs text-surface-500">{new Date(o.order_date).toLocaleDateString('en-IN')}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-semibold text-brand-400">₹{o.grand_total.toFixed(2)}</p>
                                    <span className={`text-xs ${o.status === 'pending' ? 'badge-warning' : o.status === 'delivered' ? 'badge-success' : 'badge-info'}`}>
                                        {o.status}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

function StatCard({
    icon: Icon,
    label,
    value,
    sub,
    color = 'brand',
}: {
    icon: any;
    label: string;
    value: string;
    sub?: string;
    color?: string;
}) {
    const colorClasses: Record<string, string> = {
        brand: 'text-brand-400 bg-brand-500/10',
        emerald: 'text-emerald-400 bg-emerald-500/10',
        amber: 'text-amber-400 bg-amber-500/10',
        red: 'text-red-400 bg-red-500/10',
        violet: 'text-violet-400 bg-violet-500/10',
    };

    return (
        <div className="glass rounded-xl p-4 card-hover">
            <div className="flex items-center gap-2 mb-2">
                <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${colorClasses[color] || colorClasses.brand}`}>
                    <Icon className="h-4 w-4" />
                </div>
            </div>
            <p className="text-xl font-bold text-surface-100">{value}</p>
            <p className="text-xs text-surface-500">{label}</p>
            {sub && <p className="text-xs text-surface-500 mt-0.5">{sub}</p>}
        </div>
    );
}
