import { useState, useEffect, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, Stars } from '@react-three/drei';
import { BarChart3, RefreshCw, TrendingUp, TrendingDown, DollarSign, ShoppingCart, Clock, ChevronDown } from 'lucide-react';
import BrandHeatmap, { type BrandTile } from '@/components/analytics/BrandHeatmap';
import AccountArc, { type AccountFlowData } from '@/components/analytics/AccountArc';
import { DAL } from '@/db/dal';
import { useAppStore } from '@/store/store';

// ─── Period helpers ───────────────────────────────────────────────────────────

const NOW = new Date();

function isoStart(d: Date) {
    const c = new Date(d); c.setHours(0, 0, 0, 0);
    return c.toISOString();
}
function isoEnd(d: Date) {
    const c = new Date(d); c.setHours(23, 59, 59, 999);
    return c.toISOString();
}

const PERIODS: { label: string; from: () => string; to: () => string }[] = [
    {
        label: 'Today',
        from: () => isoStart(NOW),
        to: () => isoEnd(NOW),
    },
    {
        label: 'Last 7d',
        from: () => { const d = new Date(NOW); d.setDate(d.getDate() - 7); return isoStart(d); },
        to: () => isoEnd(NOW),
    },
    {
        label: 'MTD',
        from: () => isoStart(new Date(NOW.getFullYear(), NOW.getMonth(), 1)),
        to: () => isoEnd(NOW),
    },
    {
        label: 'Last 30d',
        from: () => { const d = new Date(NOW); d.setDate(d.getDate() - 30); return isoStart(d); },
        to: () => isoEnd(NOW),
    },
    {
        label: 'Last 90d',
        from: () => { const d = new Date(NOW); d.setDate(d.getDate() - 90); return isoStart(d); },
        to: () => isoEnd(NOW),
    },
    {
        label: 'YTD',
        from: () => isoStart(new Date(NOW.getFullYear(), 0, 1)),
        to: () => isoEnd(NOW),
    },
];

// ─── KPI Card ────────────────────────────────────────────────────────────────

interface KPICardProps {
    label: string;
    value: string;
    sub?: string;
    trend?: 'up' | 'down' | 'neutral';
    color: string;
    icon: React.ReactNode;
}

function KPICard({ label, value, sub, trend, color, icon }: KPICardProps) {
    return (
        <div className="glass rounded-xl p-3 flex items-center gap-3 min-w-[130px] flex-1"
            style={{ borderLeft: `3px solid ${color}` }}>
            <div className="p-2 rounded-lg" style={{ background: `${color}20` }}>
                <div style={{ color }}>{icon}</div>
            </div>
            <div className="min-w-0">
                <p className="text-xs text-surface-500 truncate">{label}</p>
                <p className="text-sm font-bold text-surface-100 truncate surface-100">{value}</p>
                {sub && (
                    <p className={`text-xs flex items-center gap-0.5 ${trend === 'up' ? 'text-green-400' : trend === 'down' ? 'text-red-400' : 'text-surface-500'}`}>
                        {trend === 'up' ? <TrendingUp className="h-3 w-3" /> : trend === 'down' ? <TrendingDown className="h-3 w-3" /> : null}
                        {sub}
                    </p>
                )}
            </div>
        </div>
    );
}

// ─── Format helpers ───────────────────────────────────────────────────────────

function fmt(v: number): string {
    if (v >= 10000000) return `₹${(v / 10000000).toFixed(2)}Cr`;
    if (v >= 100000) return `₹${(v / 100000).toFixed(2)}L`;
    if (v >= 1000) return `₹${(v / 1000).toFixed(1)}k`;
    return `₹${v.toFixed(0)}`;
}

// ─── Analytics Page ───────────────────────────────────────────────────────────

const EMPTY_FLOW: AccountFlowData = {
    revenue: 0, collected: 0, due: 0,
    procurement: 0, opex: 0, total_cost: 0,
    profit: 0, margin: 0,
};

export default function Analytics() {
    const addToast = useAppStore(s => s.addToast);

    const [periodIdx, setPeriodIdx] = useState(2); // MTD default
    const [selectedVertical, setSelectedVertical] = useState<string>('all');
    const [brands, setBrands] = useState<BrandTile[]>([]);
    const [flow, setFlow] = useState<AccountFlowData>(EMPTY_FLOW);
    const [verticals, setVerticals] = useState<string[]>([]);
    const [selectedBrand, setSelectedBrand] = useState<BrandTile | null>(null);
    const [loading, setLoading] = useState(true);

    const period = PERIODS[periodIdx];

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const from = period.from();
            const to = period.to();
            const [brandData, flowData] = await Promise.all([
                DAL.analytics.getBrandMetrics(from, to),
                DAL.analytics.getAccountFlow(from, to),
            ]);
            setBrands(brandData);
            setFlow(flowData);

            // Extract unique verticals for filter
            const verts = [...new Set(brandData.map((b: BrandTile) => b.vertical_name))].sort();
            setVerticals(verts);
        } catch (e: any) {
            addToast(`Analytics error: ${e.message}`, 'error');
        } finally {
            setLoading(false);
        }
    }, [period, addToast]);

    useEffect(() => { load(); }, [load]);

    const filteredBrands = selectedVertical === 'all'
        ? brands
        : brands.filter(b => b.vertical_name === selectedVertical);

    const totalRevenue = filteredBrands.reduce((s, b) => s + b.revenue, 0);
    const topBrand = [...filteredBrands].sort((a, b) => b.revenue - a.revenue)[0];

    return (
        <div className="animate-fade-in flex flex-col h-full gap-3" style={{ height: 'calc(100vh - 64px)' }}>

            {/* ── Header ─────────────────────────────────────────────────── */}
            <div className="flex flex-wrap items-center gap-2 px-1">
                <BarChart3 className="h-5 w-5 text-indigo-400" />
                <h1 className="text-sm font-bold text-surface-100">Analytics</h1>

                {/* Period tabs */}
                <div className="flex gap-1 flex-wrap">
                    {PERIODS.map((p, i) => (
                        <button
                            key={p.label}
                            onClick={() => setPeriodIdx(i)}
                            className={`text-xs px-2.5 py-1 rounded-full transition-all ${i === periodIdx
                                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/40'
                                : 'btn-ghost text-surface-400'
                                }`}
                        >
                            {p.label}
                        </button>
                    ))}
                </div>

                {/* Vertical filter */}
                <div className="relative">
                    <select
                        value={selectedVertical}
                        onChange={e => setSelectedVertical(e.target.value)}
                        className="input-field text-xs py-1 pr-6 pl-2 appearance-none cursor-pointer"
                    >
                        <option value="all">All Verticals</option>
                        {verticals.map(v => <option key={v} value={v}>{v}</option>)}
                    </select>
                    <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 h-3 w-3 text-surface-400 pointer-events-none" />
                </div>

                <div className="flex-1" />
                <button onClick={load} disabled={loading} className="btn-ghost p-1.5 rounded-lg">
                    <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin text-indigo-400' : 'text-surface-400'}`} />
                </button>
            </div>

            {/* ── KPI row ────────────────────────────────────────────────── */}
            <div className="flex gap-2 overflow-x-auto pb-1 px-1">
                <KPICard
                    label="Revenue"
                    value={fmt(flow.revenue)}
                    sub={flow.revenue > 0 ? `${flow.margin.toFixed(1)}% margin` : 'No orders'}
                    trend={flow.profit > 0 ? 'up' : 'down'}
                    color="#6366f1"
                    icon={<DollarSign className="h-4 w-4" />}
                />
                <KPICard
                    label="Profit"
                    value={fmt(flow.profit)}
                    sub={`Cost: ${fmt(flow.total_cost)}`}
                    trend={flow.profit > 0 ? 'up' : 'down'}
                    color={flow.profit >= 0 ? '#22c55e' : '#ef4444'}
                    icon={<TrendingUp className="h-4 w-4" />}
                />
                <KPICard
                    label="Collected"
                    value={fmt(flow.collected)}
                    sub={`Due: ${fmt(flow.due)}`}
                    trend={flow.due > 0 ? 'down' : 'up'}
                    color="#06b6d4"
                    icon={<ShoppingCart className="h-4 w-4" />}
                />
                <KPICard
                    label="Procurement"
                    value={fmt(flow.procurement)}
                    sub={`OpEx: ${fmt(flow.opex)}`}
                    trend="neutral"
                    color="#f97316"
                    icon={<Clock className="h-4 w-4" />}
                />
                {topBrand && (
                    <KPICard
                        label="Top Brand"
                        value={topBrand.brand_name}
                        sub={`${fmt(topBrand.revenue)} · ${topBrand.order_count} orders`}
                        trend="up"
                        color="#a855f7"
                        icon={<BarChart3 className="h-4 w-4" />}
                    />
                )}
            </div>

            {/* ── Brand selected info ────────────────────────────────────── */}
            {selectedBrand && (
                <div className="flex items-center gap-3 mx-1 px-3 py-2 rounded-lg"
                    style={{ background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.3)' }}>
                    <div>
                        <span className="text-xs text-surface-500">Selected: </span>
                        <span className="text-sm font-semibold text-indigo-300">{selectedBrand.brand_name}</span>
                        <span className="text-xs text-surface-500 ml-2">({selectedBrand.vertical_name})</span>
                    </div>
                    <span className="text-sm text-surface-200">{fmt(selectedBrand.revenue)}</span>
                    <span className="text-xs text-surface-500">{selectedBrand.order_count} orders</span>
                    <span className="text-xs text-surface-500">
                        {totalRevenue > 0 ? ((selectedBrand.revenue / totalRevenue) * 100).toFixed(1) : 0}% of total
                    </span>
                    <button onClick={() => setSelectedBrand(null)} className="ml-auto text-xs text-surface-500 hover:text-surface-300">✕</button>
                </div>
            )}

            {/* ── Canvas panels ──────────────────────────────────────────── */}
            <div className="flex flex-1 gap-3 min-h-0 overflow-hidden px-1 pb-2">

                {/* Heatmap panel */}
                <div className="flex-1 rounded-xl overflow-hidden" style={{
                    background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)',
                    border: '1px solid rgba(99,102,241,0.2)',
                    boxShadow: '0 0 40px rgba(99,102,241,0.1)',
                }}>
                    <div className="flex items-center justify-between px-3 pt-2 pb-0">
                        <span className="text-xs font-semibold text-surface-300">Brand Revenue Heatmap</span>
                        <span className="text-xs text-surface-600">Area = Revenue · Click to select</span>
                    </div>
                    {loading ? (
                        <div className="flex items-center justify-center h-full text-surface-500 text-sm">
                            <RefreshCw className="h-5 w-5 animate-spin mr-2" /> Loading…
                        </div>
                    ) : (
                        <Canvas
                            orthographic
                            camera={{ zoom: 90, position: [0, 0, 5] }}
                            style={{ width: '100%', height: 'calc(100% - 28px)' }}
                            gl={{ antialias: true, alpha: true }}
                        >
                            <ambientLight intensity={0.6} />
                            <directionalLight position={[3, 3, 5]} intensity={1.2} />
                            <pointLight position={[-2, 2, 3]} intensity={0.8} color="#6366f1" />
                            <Stars radius={20} depth={5} count={400} factor={1} saturation={0} fade speed={0.3} />
                            <BrandHeatmap
                                brands={filteredBrands}
                                width={6}
                                height={4.5}
                                onBrandClick={setSelectedBrand}
                                selectedBrandId={selectedBrand?.brand_id ?? null}
                            />
                            <OrbitControls
                                enableRotate={false}
                                enableZoom
                                enablePan
                                minZoom={60}
                                maxZoom={400}
                            />
                        </Canvas>
                    )}
                </div>

                {/* Account Arc panel */}
                <div className="w-64 xl:w-72 rounded-xl overflow-hidden flex flex-col" style={{
                    background: 'linear-gradient(135deg, #0f172a 0%, #042f2e 100%)',
                    border: '1px solid rgba(6,182,212,0.2)',
                    boxShadow: '0 0 40px rgba(6,182,212,0.08)',
                }}>
                    <div className="px-3 pt-2 pb-0">
                        <span className="text-xs font-semibold text-surface-300">Account Flow</span>
                    </div>
                    {loading ? (
                        <div className="flex items-center justify-center flex-1 text-surface-500 text-sm">
                            <RefreshCw className="h-5 w-5 animate-spin" />
                        </div>
                    ) : (
                        <Canvas
                            camera={{ position: [0, 0, 3.5], fov: 40 }}
                            style={{ flex: 1 }}
                            gl={{ antialias: true, alpha: true }}
                        >
                            <ambientLight intensity={0.7} />
                            <pointLight position={[2, 2, 3]} intensity={1.5} color="#06b6d4" />
                            <pointLight position={[-2, -2, 2]} intensity={0.8} color="#22c55e" />
                            <Environment preset="night" />
                            <AccountArc data={flow} />
                            <OrbitControls enableRotate={false} enableZoom={false} enablePan={false} />
                        </Canvas>
                    )}

                    {/* Legend below arc */}
                    <div className="px-3 pb-3 grid grid-cols-2 gap-1 text-xs">
                        {[
                            { label: 'Revenue', color: '#e2e8f0' },
                            { label: 'Cost', color: '#ef4444' },
                            { label: 'Profit', color: '#22c55e' },
                            { label: 'Collected', color: '#06b6d4' },
                        ].map(i => (
                            <div key={i.label} className="flex items-center gap-1">
                                <span className="inline-block w-2 h-2 rounded-full" style={{ background: i.color }} />
                                <span style={{ color: '#94a3b8' }}>{i.label}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
