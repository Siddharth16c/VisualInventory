import { useMemo } from 'react';
import { useLiveQuery } from '@/db/local/hooks';
import * as db from '@/db/local/queries';
import { DAL, getFirmId } from '@/db/dal';
import { useAppStore } from '@/store/store';
import { TrendingUp, TrendingDown, DollarSign, ShoppingCart, Users, Package, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Dashboard() {
    const orders = useLiveQuery(() => db.getOrders(getFirmId())) || [];
    const items = useLiveQuery(() => db.getItems(getFirmId())) || [];
    const prospects = useLiveQuery(() => db.getProspects(getFirmId())) || [];
    const costs = useLiveQuery(() => DAL.costs.getAll()) || [];
    const activeBusiness = useAppStore((s) => s.activeBusiness);

    const stats = useMemo(() => {
        const today = new Date().toISOString().split('T')[0];
        const todayOrders = orders.filter((o) => o.order_date.startsWith(today));
        const todayRevenue = todayOrders.reduce((s, o) => s + o.grand_total, 0);
        const totalRevenue = orders.reduce((s, o) => s + o.grand_total, 0);
        const totalCosts = costs.reduce((s, c) => s + c.amount, 0);
        const profit = totalRevenue - totalCosts;
        const margin = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;
        const lowStockCount = items.filter((i) => i.stock_parcels <= 5).length;
        const pendingOrders = orders.filter((o) => o.status === 'pending').length;
        const totalDue = orders.reduce((s, o) => s + o.due_amount, 0);

        return { todayRevenue, totalRevenue, totalCosts, profit, margin, lowStockCount, pendingOrders, totalDue, todayOrders: todayOrders.length };
    }, [orders, items, costs]);

    const recentOrders = orders.slice(-5).reverse();

    const paymentBadge = (status: string) => {
        if (status === 'paid') return 'text-emerald-600';
        if (status === 'partial') return 'text-yellow-600';
        return 'text-red-600';
    };

    return (
        <div className="animate-fade-in space-y-6">
            {/* Business name */}
            <h2 className="text-lg font-bold text-surface-900">{activeBusiness}</h2>

            {/* Main Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <StatCard icon={DollarSign} label="Today's Revenue" value={`Rs.${stats.todayRevenue.toFixed(0)}`} sub={`${stats.todayOrders} orders`} color="brand" />
                <StatCard icon={TrendingUp} label="Total Revenue" value={`Rs.${stats.totalRevenue.toFixed(0)}`} sub={`${orders.length} orders`} color="emerald" />
                <StatCard icon={TrendingDown} label="Total Costs" value={`Rs.${stats.totalCosts.toFixed(0)}`} sub={`${costs.length} entries`} color="amber" />
                <StatCard icon={DollarSign} label="Profit Margin" value={`${stats.margin.toFixed(1)}%`} sub={`Rs.${stats.profit.toFixed(0)} profit`} color={stats.profit >= 0 ? 'emerald' : 'red'} />
            </div>

            {/* Secondary Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <StatCard icon={Package} label="Items" value={String(items.length)} sub={`${stats.lowStockCount} low stock`} color="brand" />
                <StatCard icon={Users} label="Prospects" value={String(prospects.length)} color="violet" />
                <StatCard icon={ShoppingCart} label="Pending Orders" value={String(stats.pendingOrders)} color="amber" />
                <StatCard icon={DollarSign} label="Total Due" value={`Rs.${stats.totalDue.toFixed(0)}`} color="red" />
            </div>

            {/* Recent Orders */}
            <div className="glass rounded-xl">
                <div className="flex items-center justify-between px-4 py-3 border-b border-surface-200">
                    <h3 className="text-sm font-semibold text-surface-900">Recent Orders</h3>
                    <Link to="/billing" className="text-xs text-surface-500 hover:text-surface-900 flex items-center gap-1">
                        View all <ArrowRight className="h-3 w-3" />
                    </Link>
                </div>
                {recentOrders.length === 0 ? (
                    <p className="p-6 text-center text-surface-500 text-sm">No orders yet</p>
                ) : (
                    <div className="divide-y divide-surface-200">
                        {recentOrders.map((o) => (
                            <div key={o.id} className="px-4 py-3 flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-surface-900">#{o.id} — {o.prospect_name}</p>
                                    <p className="text-xs text-surface-500">{new Date(o.order_date).toLocaleDateString('en-IN')}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-semibold text-surface-900">Rs.{o.grand_total.toFixed(2)}</p>
                                    <div className="flex gap-1.5 items-center justify-end">
                                        <span className={`text-xs ${o.status === 'pending' ? 'text-amber-600' : o.status === 'delivered' ? 'text-emerald-600' : 'text-blue-600'}`}>
                                            {o.status}
                                        </span>
                                        <span className={`text-xs ${paymentBadge(o.payment_status)}`}>
                                            · {o.payment_status}
                                        </span>
                                    </div>
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
        brand: 'text-surface-700 bg-surface-100',
        emerald: 'text-emerald-700 bg-emerald-50',
        amber: 'text-amber-700 bg-amber-50',
        red: 'text-red-700 bg-red-50',
        violet: 'text-violet-700 bg-violet-50',
    };

    return (
        <div className="glass rounded-xl p-4 card-hover">
            <div className="flex items-center gap-2 mb-2">
                <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${colorClasses[color] || colorClasses.brand}`}>
                    <Icon className="h-4 w-4" />
                </div>
            </div>
            <p className="text-xl font-bold text-surface-900">{value}</p>
            <p className="text-xs text-surface-500">{label}</p>
            {sub && <p className="text-xs text-surface-500 mt-0.5">{sub}</p>}
        </div>
    );
}
