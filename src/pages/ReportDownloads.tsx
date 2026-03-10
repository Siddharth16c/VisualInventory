import { useState, useCallback, useRef } from 'react';
import { FileText, Download, RefreshCw, TrendingUp, Users, Package, AlertCircle, ChevronDown } from 'lucide-react';
import { DAL } from '@/db/dal';
import { useAppStore } from '@/store/store';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// ─── Period helpers ───────────────────────────────────────────────────────────

const NOW = new Date();
const isoStart = (d: Date) => { const c = new Date(d); c.setHours(0, 0, 0, 0); return c.toISOString(); };
const isoEnd = (d: Date) => { const c = new Date(d); c.setHours(23, 59, 59, 999); return c.toISOString(); };
const dateStr = (d: Date) => d.toISOString().split('T')[0];

const PERIODS = [
    { label: 'Today', from: () => isoStart(NOW), to: () => isoEnd(NOW) },
    { label: 'Last 7d', from: () => { const d = new Date(NOW); d.setDate(d.getDate() - 7); return isoStart(d); }, to: () => isoEnd(NOW) },
    { label: 'MTD', from: () => isoStart(new Date(NOW.getFullYear(), NOW.getMonth(), 1)), to: () => isoEnd(NOW) },
    { label: 'Last 30d', from: () => { const d = new Date(NOW); d.setDate(d.getDate() - 30); return isoStart(d); }, to: () => isoEnd(NOW) },
    { label: 'Last 90d', from: () => { const d = new Date(NOW); d.setDate(d.getDate() - 90); return isoStart(d); }, to: () => isoEnd(NOW) },
    { label: 'YTD', from: () => isoStart(new Date(NOW.getFullYear(), 0, 1)), to: () => isoEnd(NOW) },
];

const fmt = (v: number) => v >= 100000 ? `Rs.${(v / 100000).toFixed(2)}L` : v >= 1000 ? `Rs.${(v / 1000).toFixed(1)}k` : `Rs.${v.toFixed(0)}`;

// ─── PDF generation ───────────────────────────────────────────────────────────

async function generatePDF(
    type: string,
    period: string,
    firmName: string,
    sales: any,
    topProspects: any[],
    stock: any[],
    dues: any[],
    itemSales: any[],
    flow: any,
) {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const W = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    let y = 15;

    const addPage = () => { doc.addPage(); y = 15; };
    const checkY = (need: number) => { if (y + need > pageH - 15) addPage(); };

    // ── Header ────────────────────────────────────────────────────
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, W, 28, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16); doc.setFont('helvetica', 'bold');
    doc.text(`${firmName} — ${type}`, 12, 12);
    doc.setFontSize(9); doc.setFont('helvetica', 'normal');
    doc.text(`Period: ${period}  |  Generated: ${new Date().toLocaleString('en-IN')}`, 12, 20);
    y = 35;

    // ── KPI Summary row ───────────────────────────────────────────
    if (sales) {
        const boxes = [
            { label: 'Orders', value: String(sales.count) },
            { label: 'Revenue', value: fmt(sales.revenue) },
            { label: 'Collected', value: fmt(sales.collected) },
            { label: 'Due', value: fmt(sales.due) },
        ];
        const bw = (W - 24) / boxes.length;
        boxes.forEach((b, i) => {
            const bx = 12 + i * bw;
            doc.setFillColor(30, 41, 59);
            doc.roundedRect(bx, y, bw - 2, 14, 2, 2, 'F');
            doc.setTextColor(148, 163, 184); doc.setFontSize(7);
            doc.text(b.label, bx + 3, y + 5);
            doc.setTextColor(241, 245, 249); doc.setFontSize(10); doc.setFont('helvetica', 'bold');
            doc.text(b.value, bx + 3, y + 11);
        });
        y += 22;
    }

    // ── Section: Orders list ──────────────────────────────────────
    if ((type === 'Sales Snapshot' || type === 'Full P&L') && sales?.orders?.length) {
        checkY(12);
        doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(99, 102, 241);
        doc.text('Orders', 12, y); y += 4;
        autoTable(doc, {
            startY: y,
            head: [['Date', 'Customer', 'Status', 'Payment', 'Grand Total', 'Paid', 'Due']],
            body: sales.orders.slice(0, 50).map((o: any) => [
                o.created_at?.split('T')[0] ?? '',
                o.prospect_name ?? '',
                o.status ?? '',
                o.payment_status ?? '',
                fmt(Number(o.grand_total ?? 0)),
                fmt(Number(o.paid_amount ?? 0)),
                fmt(Number(o.due_amount ?? 0)),
            ]),
            theme: 'striped',
            headStyles: { fillColor: [30, 41, 59], textColor: [148, 163, 184], fontSize: 7 },
            bodyStyles: { fontSize: 7, textColor: [51, 65, 85] },
            alternateRowStyles: { fillColor: [248, 250, 252] },
            margin: { left: 12, right: 12 },
        });
        y = (doc as any).lastAutoTable.finalY + 8;
    }

    // ── Section: Top Prospects ────────────────────────────────────
    if (topProspects.length > 0) {
        checkY(12);
        doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(99, 102, 241);
        doc.text('Top Customers', 12, y); y += 4;
        autoTable(doc, {
            startY: y,
            head: [['Customer', 'Orders', 'Revenue', 'Due']],
            body: topProspects.map(p => [p.name, p.orders, fmt(p.revenue), fmt(p.due)]),
            theme: 'striped',
            headStyles: { fillColor: [30, 41, 59], textColor: [148, 163, 184], fontSize: 8 },
            bodyStyles: { fontSize: 8 },
            margin: { left: 12, right: 12 },
        });
        y = (doc as any).lastAutoTable.finalY + 8;
    }

    // ── Section: Item Sales ───────────────────────────────────────
    if (itemSales.length > 0 && (type === 'Full P&L' || type === 'Sales Snapshot')) {
        checkY(12);
        doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(99, 102, 241);
        doc.text('Item-wise Sales', 12, y); y += 4;
        autoTable(doc, {
            startY: y,
            head: [['Item', 'Qty Sold', 'Revenue']],
            body: itemSales.slice(0, 30).map(i => [i.name, i.qty, fmt(i.revenue)]),
            theme: 'striped',
            headStyles: { fillColor: [30, 41, 59], textColor: [148, 163, 184], fontSize: 8 },
            bodyStyles: { fontSize: 8 },
            margin: { left: 12, right: 12 },
        });
        y = (doc as any).lastAutoTable.finalY + 8;
    }

    // ── Section: Stock Snapshot ───────────────────────────────────
    if (stock.length > 0 && (type === 'Stock Health' || type === 'Full P&L')) {
        checkY(12);
        doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(99, 102, 241);
        doc.text('Stock Snapshot', 12, y); y += 4;
        autoTable(doc, {
            startY: y,
            head: [['Item', 'Category', 'Parcels', 'Units', 'Retail/Box', 'Stock Value']],
            body: stock.slice(0, 50).map((i: any) => [
                i.item_name, i.category, i.stock_parcels, i.stock_units,
                fmt(Number(i.retail_price_container ?? 0)), fmt(i.stock_value),
            ]),
            theme: 'striped',
            headStyles: { fillColor: [30, 41, 59], textColor: [148, 163, 184], fontSize: 7 },
            bodyStyles: { fontSize: 7 },
            margin: { left: 12, right: 12 },
        });
        y = (doc as any).lastAutoTable.finalY + 8;
    }

    // ── Section: Customer Dues ────────────────────────────────────
    if (dues.length > 0 && (type === 'Customer Dues' || type === 'Full P&L')) {
        checkY(12);
        doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(239, 68, 68);
        doc.text('Outstanding Dues', 12, y); y += 4;
        autoTable(doc, {
            startY: y,
            head: [['Customer', 'Order Date', 'Grand Total', 'Due', 'Status']],
            body: dues.map((o: any) => [
                o.prospects?.prospectname ?? o.prospect_name,
                o.order_date ?? '',
                fmt(Number(o.grand_total ?? 0)),
                fmt(Number(o.due_amount ?? 0)),
                o.payment_status,
            ]),
            theme: 'striped',
            headStyles: { fillColor: [127, 29, 29], textColor: [254, 202, 202], fontSize: 8 },
            bodyStyles: { fontSize: 8 },
            margin: { left: 12, right: 12 },
        });
        y = (doc as any).lastAutoTable.finalY + 8;
    }

    // ── Footer on each page ───────────────────────────────────────
    const pages = (doc.internal as any).getNumberOfPages();
    for (let i = 1; i <= pages; i++) {
        doc.setPage(i);
        doc.setFontSize(7); doc.setTextColor(148, 163, 184);
        doc.text(`Page ${i} of ${pages}  |  Visual Inventory`, W / 2, pageH - 5, { align: 'center' });
    }

    return doc;
}

// ─── Preview Stats ────────────────────────────────────────────────────────────

function StatRow({ label, value, color }: { label: string; value: string; color?: string }) {
    return (
        <div className="flex justify-between items-center py-1.5 border-b border-surface-200/10">
            <span className="text-xs text-surface-400">{label}</span>
            <span className="text-xs font-semibold" style={{ color: color ?? '#e2e8f0' }}>{value}</span>
        </div>
    );
}

// ─── Reports Page ─────────────────────────────────────────────────────────────

const REPORT_TYPES = ['Sales Snapshot', 'Full P&L', 'Stock Health', 'Customer Dues'] as const;
type ReportType = typeof REPORT_TYPES[number];

export default function ReportDownloads() {
    const addToast = useAppStore(s => s.addToast);
    const activeBusiness = useAppStore(s => s.activeBusiness);
    const firmName = (activeBusiness as any)?.name ?? 'Visual Inventory';

    const [periodIdx, setPeriodIdx] = useState(2);   // MTD
    const [reportType, setReportType] = useState<ReportType>('Sales Snapshot');
    const [loading, setLoading] = useState(false);
    const [generating, setGenerating] = useState(false);

    // Preview data
    const [sales, setSales] = useState<any>(null);
    const [topProspects, setTopProspects] = useState<any[]>([]);
    const [stock, setStock] = useState<any[]>([]);
    const [dues, setDues] = useState<any[]>([]);
    const [itemSales, setItemSales] = useState<any[]>([]);
    const [flow, setFlow] = useState<any>(null);
    const [loaded, setLoaded] = useState(false);

    const period = PERIODS[periodIdx];

    const loadData = useCallback(async () => {
        setLoading(true);
        setLoaded(false);
        try {
            const from = period.from();
            const to = period.to();
            const [salesData, prospectsData, stockData, duesData, itemData, flowData] = await Promise.all([
                DAL.reports.getSalesSummary(from, to),
                DAL.reports.getTopProspects(from, to),
                reportType === 'Stock Health' || reportType === 'Full P&L' ? DAL.reports.getStockSnapshot() : Promise.resolve([]),
                reportType === 'Customer Dues' || reportType === 'Full P&L' ? DAL.reports.getCustomerDues() : Promise.resolve([]),
                DAL.reports.getItemSales(from, to),
                DAL.analytics.getAccountFlow(from, to),
            ]);
            setSales(salesData);
            setTopProspects(prospectsData);
            setStock(stockData);
            setDues(duesData);
            setItemSales(itemData);
            setFlow(flowData);
            setLoaded(true);
        } catch (e: any) {
            addToast(`Load error: ${e.message}`, 'error');
        } finally {
            setLoading(false);
        }
    }, [period, reportType, addToast]);

    const handleDownload = async () => {
        if (!loaded) { addToast('Load data first', 'info'); return; }
        setGenerating(true);
        try {
            const doc = await generatePDF(
                reportType,
                `${period.label} (${dateStr(new Date(period.from()))} → ${dateStr(new Date(period.to()))})`,
                firmName, sales, topProspects, stock, dues, itemSales, flow
            );
            doc.save(`${firmName.replace(/\s+/g, '_')}_${reportType.replace(/\s+/g, '_')}_${dateStr(NOW)}.pdf`);
            addToast('PDF downloaded!', 'success');
        } catch (e: any) {
            addToast(`PDF error: ${e.message}`, 'error');
        } finally {
            setGenerating(false);
        }
    };

    const totalStockValue = stock.reduce((s: number, i: any) => s + (i.stock_value ?? 0), 0);
    const totalDue = dues.reduce((s: number, d: any) => s + Number(d.due_amount ?? 0), 0);

    return (
        <div className="animate-fade-in max-w-5xl mx-auto flex flex-col gap-4">
            {/* Header */}
            <div className="flex flex-wrap items-center gap-3">
                <FileText className="h-5 w-5 text-indigo-400" />
                <h1 className="text-sm font-bold text-surface-100">Reports</h1>
            </div>

            {/* Controls */}
            <div className="glass rounded-xl p-4 flex flex-wrap gap-3 items-end">
                {/* Report type */}
                <div className="flex-1 min-w-[180px]">
                    <label className="text-xs text-surface-400 mb-1 block">Report Type</label>
                    <div className="relative">
                        <select
                            value={reportType}
                            onChange={e => { setReportType(e.target.value as ReportType); setLoaded(false); }}
                            className="input-field text-sm w-full appearance-none pr-8"
                        >
                            {REPORT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-surface-400 pointer-events-none" />
                    </div>
                </div>

                {/* Period */}
                <div className="flex-1 min-w-[200px]">
                    <label className="text-xs text-surface-400 mb-1 block">Period</label>
                    <div className="flex flex-wrap gap-1">
                        {PERIODS.map((p, i) => (
                            <button
                                key={p.label}
                                onClick={() => { setPeriodIdx(i); setLoaded(false); }}
                                className={`text-xs px-2.5 py-1 rounded-full ${i === periodIdx ? 'bg-indigo-600 text-white' : 'btn-ghost text-surface-400'}`}
                            >
                                {p.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                    <button onClick={loadData} disabled={loading} className="btn-primary flex items-center gap-1.5 text-sm">
                        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                        {loading ? 'Loading…' : 'Load Preview'}
                    </button>
                    <button onClick={handleDownload} disabled={!loaded || generating} className="btn-ghost flex items-center gap-1.5 text-sm border border-indigo-500/30 text-indigo-300 disabled:opacity-50">
                        <Download className={`h-4 w-4 ${generating ? 'animate-bounce' : ''}`} />
                        {generating ? 'Generating…' : 'Download PDF'}
                    </button>
                </div>
            </div>

            {/* Preview */}
            {loaded && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Sales Summary */}
                    <div className="glass rounded-xl p-4 col-span-1">
                        <div className="flex items-center gap-2 mb-3">
                            <TrendingUp className="h-4 w-4 text-indigo-400" />
                            <span className="text-xs font-semibold text-surface-200">Sales Summary</span>
                        </div>
                        <StatRow label="Orders" value={String(sales?.count ?? 0)} />
                        <StatRow label="Revenue" value={fmt(sales?.revenue ?? 0)} color="#6366f1" />
                        <StatRow label="Collected" value={fmt(sales?.collected ?? 0)} color="#22c55e" />
                        <StatRow label="Outstanding" value={fmt(sales?.due ?? 0)} color="#f97316" />
                        {flow && <>
                            <StatRow label="Procurement" value={fmt(flow.procurement ?? 0)} color="#ef4444" />
                            <StatRow label="OpEx" value={fmt(flow.opex ?? 0)} color="#ef4444" />
                            <StatRow label="Net Profit" value={fmt(flow.profit ?? 0)} color={flow.profit >= 0 ? '#22c55e' : '#ef4444'} />
                            <StatRow label="Margin" value={`${(flow.margin ?? 0).toFixed(1)}%`} color={flow.margin >= 0 ? '#22c55e' : '#ef4444'} />
                        </>}
                    </div>

                    {/* Top Prospects */}
                    <div className="glass rounded-xl p-4 col-span-1">
                        <div className="flex items-center gap-2 mb-3">
                            <Users className="h-4 w-4 text-purple-400" />
                            <span className="text-xs font-semibold text-surface-200">Top Customers</span>
                        </div>
                        {topProspects.length === 0 ? (
                            <p className="text-xs text-surface-500">No orders in this period</p>
                        ) : topProspects.slice(0, 8).map((p, i) => (
                            <div key={i} className="flex items-center gap-2 py-1 border-b border-surface-200/10">
                                <span className="text-xs text-surface-500 w-4">{i + 1}</span>
                                <span className="text-xs text-surface-300 flex-1 truncate">{p.name}</span>
                                <span className="text-xs font-semibold text-indigo-300">{fmt(p.revenue)}</span>
                                {p.due > 0 && <span className="text-xs text-orange-400">+{fmt(p.due)} due</span>}
                            </div>
                        ))}
                    </div>

                    {/* Stock / Dues summary */}
                    <div className="glass rounded-xl p-4 col-span-1">
                        {(reportType === 'Stock Health' || reportType === 'Full P&L') && stock.length > 0 && (
                            <>
                                <div className="flex items-center gap-2 mb-3">
                                    <Package className="h-4 w-4 text-green-400" />
                                    <span className="text-xs font-semibold text-surface-200">Stock</span>
                                </div>
                                <StatRow label="Total Items" value={String(stock.length)} />
                                <StatRow label="Total Stock Value" value={fmt(totalStockValue)} color="#22c55e" />
                                <StatRow label="Zero Stock Items" value={String(stock.filter((i: any) => i.stock_parcels <= 0).length)} color="#ef4444" />
                            </>
                        )}
                        {(reportType === 'Customer Dues' || reportType === 'Full P&L') && (
                            <>
                                <div className="flex items-center gap-2 mb-3 mt-3">
                                    <AlertCircle className="h-4 w-4 text-orange-400" />
                                    <span className="text-xs font-semibold text-surface-200">Outstanding Dues</span>
                                </div>
                                <StatRow label="Customers with dues" value={String(dues.length)} color="#f97316" />
                                <StatRow label="Total Outstanding" value={fmt(totalDue)} color="#ef4444" />
                            </>
                        )}
                        {/* Top items */}
                        {itemSales.length > 0 && (
                            <>
                                <div className="text-xs font-semibold text-surface-200 mt-3 mb-2">Top Items by Revenue</div>
                                {itemSales.slice(0, 6).map((i, idx) => (
                                    <div key={idx} className="flex justify-between py-0.5">
                                        <span className="text-xs text-surface-400 truncate flex-1">{i.name}</span>
                                        <span className="text-xs text-surface-300 ml-2">{fmt(i.revenue)}</span>
                                    </div>
                                ))}
                            </>
                        )}
                    </div>
                </div>
            )}

            {!loaded && !loading && (
                <div className="glass rounded-xl p-8 text-center text-surface-400 text-sm">
                    <FileText className="h-10 w-10 mx-auto mb-3 opacity-30" />
                    <p>Select a report type and period, then click <strong>Load Preview</strong></p>
                    <p className="text-xs mt-1 text-surface-600">PDF is generated client-side — no data leaves your device</p>
                </div>
            )}
        </div>
    );
}
