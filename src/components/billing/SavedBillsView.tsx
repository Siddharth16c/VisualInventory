/**
 * SavedBillsView - Shows all saved bills grouped by client
 * Date filters (day/week/month), multi-select, bulk actions
 */

import { useState, useMemo } from 'react';
import {
    Calendar, Search, Download, Share2, Trash2, Printer,
    ChevronDown, ChevronRight, CheckSquare, Square,
    FileText, User
} from 'lucide-react';
import { useAppStore } from '@/store/store';
import type { Order } from '@/db/types';


interface SavedBillsViewProps {
    orders: Order[];
    onOpenBill: (order: Order) => void;
    onDeleteBill: (orderId: number) => void;
    onShareBill: (order: Order) => void;
    onDownloadBill: (order: Order) => void;
    onBulkDownload: (orderIds: number[]) => void;
    onBulkShare: (orderIds: number[]) => void;
}

// Date filter options
const DATE_FILTERS = [
    { value: 'day' as const, label: 'Today' },
    { value: 'week' as const, label: 'This Week' },
    { value: 'month' as const, label: 'This Month' },
    { value: 'all' as const, label: 'All Time' },
];

// Status badge component
const StatusBadge = ({ status }: { status: string }) => {
    const styles: Record<string, string> = {
        quote: 'bg-slate-100 text-slate-700 border-slate-200',
        pending: 'bg-amber-100 text-amber-700 border-amber-200',
        dispatched: 'bg-blue-100 text-blue-700 border-blue-200',
        delivered: 'bg-emerald-100 text-emerald-700 border-emerald-200',
        cancelled: 'bg-red-100 text-red-700 border-red-200',
    };
    return (
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${styles[status] || styles.pending}`}>
            {status}
        </span>
    );
};

// Payment badge component
const PaymentBadge = ({ status }: { status: string }) => {
    const styles: Record<string, string> = {
        paid: 'bg-emerald-100 text-emerald-700 border-emerald-200',
        partial: 'bg-amber-100 text-amber-700 border-amber-200',
        unpaid: 'bg-red-100 text-red-700 border-red-200',
    };
    return (
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${styles[status] || styles.unpaid}`}>
            {status}
        </span>
    );
};

// Check if date is within range
const isWithinDateRange = (dateStr: string, range: 'day' | 'week' | 'month') => {
    const date = new Date(dateStr);
    const now = new Date();

    switch (range) {
        case 'day':
            return date.toDateString() === now.toDateString();
        case 'week':
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            return date >= weekAgo;
        case 'month':
            const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            return date >= monthAgo;
        default:
            return true;
    }
};

export default function SavedBillsView({
    orders,
    onOpenBill,
    onDeleteBill,
    onShareBill,
    onDownloadBill,
    onBulkDownload,
    onBulkShare,
}: SavedBillsViewProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedClients, setExpandedClients] = useState<Set<string>>(new Set());

    // Store state
    const dateRange = useAppStore((s) => s.billDateRange);
    const selectedBillIds = useAppStore((s) => s.selectedBillIds);
    const setBillDateRange = useAppStore((s) => s.setBillDateRange);
    const toggleBillSelection = useAppStore((s) => s.toggleBillSelection);
    const selectAllBills = useAppStore((s) => s.selectAllBills);
    const clearBillSelection = useAppStore((s) => s.clearBillSelection);

    // Filter orders by date range
    const filteredByDate = useMemo(() => {
        if (dateRange === 'all') return orders;
        return orders.filter(o => isWithinDateRange(o.order_date, dateRange));
    }, [orders, dateRange]);

    // Filter by search
    const filteredOrders = useMemo(() => {
        if (!searchQuery.trim()) return filteredByDate;
        const q = searchQuery.toLowerCase();
        return filteredByDate.filter(o =>
            o.prospect_name.toLowerCase().includes(q) ||
            String(o.id).includes(q)
        );
    }, [filteredByDate, searchQuery]);

    // Group by client
    const groupedByClient = useMemo(() => {
        const grouped = new Map<string, Order[]>();
        filteredOrders.forEach(order => {
            const key = order.prospect_name || 'Walk-in Customer';
            const existing = grouped.get(key) || [];
            existing.push(order);
            grouped.set(key, existing);
        });
        return grouped;
    }, [filteredOrders]);

    // Toggle client expansion
    const toggleClient = (clientName: string) => {
        const newSet = new Set(expandedClients);
        if (newSet.has(clientName)) {
            newSet.delete(clientName);
        } else {
            newSet.add(clientName);
        }
        setExpandedClients(newSet);
    };

    // Select all bills
    const handleSelectAll = () => {
        const allIds = filteredOrders.map(o => o.id).filter((id): id is number => id !== undefined);
        selectAllBills(allIds);
    };

    // Bulk actions
    const hasSelection = selectedBillIds.size > 0;

    return (
        <div className="space-y-4">
            {/* Header with filters */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                {/* Date Filter Tabs */}
                <div className="flex rounded-lg overflow-hidden border border-surface-200">
                    {DATE_FILTERS.map((filter) => (
                        <button
                            key={filter.value}
                            onClick={() => setBillDateRange(filter.value)}
                            className={`px-3 py-1.5 text-xs font-medium transition-colors ${dateRange === filter.value
                                ? 'bg-surface-900 text-white'
                                : 'bg-white text-surface-600 hover:bg-surface-50'
                                }`}
                        >
                            {filter.label}
                        </button>
                    ))}
                </div>

                {/* Search */}
                <div className="relative max-w-xs">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-400" />
                    <input
                        className="input-field pl-10 text-sm w-full"
                        placeholder="Search bills..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            {/* Bulk Actions Bar */}
            {hasSelection && (
                <div className="bg-surface-900 text-white rounded-lg px-4 py-3 flex items-center justify-between">
                    <span className="text-sm font-medium">
                        {selectedBillIds.size} bill{selectedBillIds.size !== 1 ? 's' : ''} selected
                    </span>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => onBulkShare(Array.from(selectedBillIds))}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 rounded-lg text-xs hover:bg-white/20 transition-colors"
                        >
                            <Share2 className="h-3.5 w-3.5" />
                            Share
                        </button>
                        <button
                            onClick={() => onBulkDownload(Array.from(selectedBillIds))}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 rounded-lg text-xs hover:bg-white/20 transition-colors"
                        >
                            <Download className="h-3.5 w-3.5" />
                            Download ZIP
                        </button>
                        <button
                            onClick={clearBillSelection}
                            className="px-3 py-1.5 text-xs text-surface-300 hover:text-white"
                        >
                            Clear
                        </button>
                    </div>
                </div>
            )}

            {/* Client Groups */}
            <div className="space-y-3">
                {Array.from(groupedByClient.entries()).map(([clientName, clientOrders]) => {
                    const isExpanded = expandedClients.has(clientName);
                    const totalAmount = clientOrders.reduce((sum, o) => sum + o.grand_total, 0);
                    const selectedCount = clientOrders.filter(o => selectedBillIds.has(o.id)).length;

                    return (
                        <div key={clientName} className="bg-white rounded-xl border border-surface-200 overflow-hidden">
                            {/* Client Header */}
                            <button
                                onClick={() => toggleClient(clientName)}
                                className="w-full flex items-center justify-between px-4 py-3 bg-surface-50 hover:bg-surface-100 transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    {isExpanded ? (
                                        <ChevronDown className="h-4 w-4 text-surface-500" />
                                    ) : (
                                        <ChevronRight className="h-4 w-4 text-surface-500" />
                                    )}
                                    <div className="flex items-center gap-2">
                                        <User className="h-4 w-4 text-surface-400" />
                                        <span className="font-medium text-sm text-surface-900">{clientName}</span>
                                    </div>
                                    <span className="text-xs text-surface-400 bg-surface-200 px-2 py-0.5 rounded-full">
                                        {clientOrders.length} bills
                                    </span>
                                    {selectedCount > 0 && (
                                        <span className="text-xs text-white bg-surface-900 px-2 py-0.5 rounded-full">
                                            {selectedCount} selected
                                        </span>
                                    )}
                                </div>
                                <span className="text-sm font-bold text-surface-900">
                                    ₹{totalAmount.toFixed(2)}
                                </span>
                            </button>

                            {/* Bills List */}
                            {isExpanded && (
                                <div className="divide-y divide-surface-100">
                                    {clientOrders.map((order) => {
                                        const isSelected = selectedBillIds.has(order.id);
                                        const orderDate = new Date(order.order_date);

                                        return (
                                            <div
                                                key={order.id}
                                                className={`px-4 py-3 flex items-center gap-3 transition-colors ${isSelected ? 'bg-surface-50' : 'hover:bg-surface-50'
                                                    }`}
                                            >
                                                {/* Checkbox */}
                                                <button
                                                    onClick={() => toggleBillSelection(order.id)}
                                                    className="text-surface-400 hover:text-surface-600"
                                                >
                                                    {isSelected ? (
                                                        <CheckSquare className="h-5 w-5 text-surface-900" />
                                                    ) : (
                                                        <Square className="h-5 w-5" />
                                                    )}
                                                </button>

                                                {/* Bill Info */}
                                                <div
                                                    className="flex-1 cursor-pointer"
                                                    onClick={() => onOpenBill(order)}
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <FileText className="h-4 w-4 text-surface-400" />
                                                        <span className="font-medium text-sm text-surface-900">
                                                            Order #{order.id}
                                                        </span>
                                                        <StatusBadge status={order.status} />
                                                        <PaymentBadge status={order.payment_status} />
                                                    </div>
                                                    <div className="flex items-center gap-4 mt-1 text-xs text-surface-400">
                                                        <span className="flex items-center gap-1">
                                                            <Calendar className="h-3 w-3" />
                                                            {orderDate.toLocaleDateString('en-IN')}
                                                        </span>
                                                        <span>{order.pricing_mode === 'wholesale' ? 'Bulk' : 'Lean'}</span>
                                                        {order.due_amount > 0 && (
                                                            <span className="text-red-500">
                                                                Due: ₹{order.due_amount.toFixed(2)}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Amount */}
                                                <span className="font-bold text-sm text-surface-900">
                                                    ₹{order.grand_total.toFixed(2)}
                                                </span>

                                                {/* Actions */}
                                                <div className="flex items-center gap-1">
                                                    <button
                                                        onClick={() => onOpenBill(order)}
                                                        className="p-1.5 hover:bg-surface-200 rounded-lg text-surface-400 hover:text-surface-600"
                                                        title="Print"
                                                    >
                                                        <Printer className="h-4 w-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => onShareBill(order)}
                                                        className="p-1.5 hover:bg-surface-200 rounded-lg text-surface-400 hover:text-surface-600"
                                                        title="Share"
                                                    >
                                                        <Share2 className="h-4 w-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => onDownloadBill(order)}
                                                        className="p-1.5 hover:bg-surface-200 rounded-lg text-surface-400 hover:text-surface-600"
                                                        title="Download"
                                                    >
                                                        <Download className="h-4 w-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => onDeleteBill(order.id)}
                                                        className="p-1.5 hover:bg-red-100 rounded-lg text-surface-400 hover:text-red-600"
                                                        title="Delete"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Empty State */}
            {groupedByClient.size === 0 && (
                <div className="text-center py-12 text-surface-400">
                    <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">No bills found</p>
                    <p className="text-xs mt-1">Try adjusting your filters</p>
                </div>
            )}
        </div>
    );
}
