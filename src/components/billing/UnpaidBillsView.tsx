/**
 * UnpaidBillsView - Shows unpaid/partially paid bills grouped by client
 * Inline editing for pending amounts, due date reminders
 */

import { useState, useMemo } from 'react';
import {
    AlertCircle, Calendar, CheckCircle, Edit2, Clock,
    ChevronDown, ChevronRight, User, CreditCard
} from 'lucide-react';
import { useAppStore } from '@/store/store';
import type { Order } from '@/db/types';


interface UnpaidBillsViewProps {
    orders: Order[];
    onEditBill: (order: Order) => void;
    onClearBill: (orderId: number) => void;
    onUpdatePayment: (orderId: number, newPaidAmount: number) => void;
}

// Get due date status
const getDueStatus = (dueDate?: string): { text: string; color: string } => {
    if (!dueDate) return { text: 'No due date', color: 'text-surface-400' };

    const due = new Date(dueDate);
    const now = new Date();
    const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return { text: `Overdue by ${Math.abs(diffDays)} days`, color: 'text-red-600' };
    if (diffDays === 0) return { text: 'Due today', color: 'text-amber-600' };
    if (diffDays <= 3) return { text: `Due in ${diffDays} days`, color: 'text-amber-500' };
    return { text: `Due in ${diffDays} days`, color: 'text-emerald-600' };
};

// Payment badge
const PaymentBadge = ({ status }: { status: string }) => {
    const styles: Record<string, string> = {
        paid: 'bg-emerald-100 text-emerald-700',
        partial: 'bg-amber-100 text-amber-700',
        unpaid: 'bg-red-100 text-red-700',
    };
    const labels = { paid: 'Paid', partial: 'Partial', unpaid: 'Unpaid' };

    return (
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${styles[status] || styles.unpaid}`}>
            {labels[status as keyof typeof labels] || status}
        </span>
    );
};

export default function UnpaidBillsView({
    orders,
    onEditBill,
    onClearBill,
    onUpdatePayment,
}: UnpaidBillsViewProps) {
    const [expandedClients, setExpandedClients] = useState<Set<string>>(new Set());
    const [editingOrderId, setEditingOrderId] = useState<number | null>(null);
    const [editPaidAmount, setEditPaidAmount] = useState<number>(0);

    const addToast = useAppStore((s) => s.addToast);

    // Filter unpaid orders
    const unpaidOrders = useMemo(() => {
        return orders.filter(o => o.due_amount > 0 && o.payment_status !== 'paid');
    }, [orders]);

    // Group by client
    const groupedByClient = useMemo(() => {
        const grouped = new Map<string, Order[]>();
        unpaidOrders.forEach(order => {
            const key = order.prospect_name || 'Walk-in Customer';
            const existing = grouped.get(key) || [];
            existing.push(order);
            grouped.set(key, existing);
        });
        return grouped;
    }, [unpaidOrders]);

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

    // Start editing payment
    const startEditing = (order: Order) => {
        setEditingOrderId(order.id ?? null);
        setEditPaidAmount(order.paid_amount);
    };

    // Save payment edit
    const savePaymentEdit = (order: Order) => {
        const maxPaid = order.grand_total;
        const newPaidAmount = Math.min(Math.max(0, editPaidAmount), maxPaid);

        if (newPaidAmount !== order.paid_amount) {
            onUpdatePayment(order.id, newPaidAmount);
            addToast('Payment updated', 'success');
        }

        setEditingOrderId(null);
    };

    // Cancel editing
    const cancelEditing = () => {
        setEditingOrderId(null);
        setEditPaidAmount(0);
    };

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-red-500" />
                    <h2 className="font-semibold text-surface-900">
                        Unpaid Bills
                    </h2>
                    <span className="text-sm text-surface-500">
                        ({unpaidOrders.length} bills, ₹
                        {unpaidOrders.reduce((sum, o) => sum + o.due_amount, 0).toFixed(2)} due)
                    </span>
                </div>
            </div>

            {/* Client Groups */}
            <div className="space-y-3">
                {Array.from(groupedByClient.entries()).map(([clientName, clientOrders]) => {
                    const isExpanded = expandedClients.has(clientName);
                    const totalDue = clientOrders.reduce((sum, o) => sum + o.due_amount, 0);
                    const totalBills = clientOrders.length;

                    return (
                        <div key={clientName} className="bg-white rounded-xl border border-surface-200 overflow-hidden">
                            {/* Client Header - Red background for unpaid */}
                            <button
                                onClick={() => toggleClient(clientName)}
                                className="w-full flex items-center justify-between px-4 py-3 bg-red-50 hover:bg-red-100 transition-colors border-b border-red-100"
                            >
                                <div className="flex items-center gap-3">
                                    {isExpanded ? (
                                        <ChevronDown className="h-4 w-4 text-red-500" />
                                    ) : (
                                        <ChevronRight className="h-4 w-4 text-red-500" />
                                    )}
                                    <div className="flex items-center gap-2">
                                        <User className="h-4 w-4 text-red-500" />
                                        <span className="font-medium text-sm text-surface-900">{clientName}</span>
                                    </div>
                                    <span className="text-xs text-red-600 bg-red-100 px-2 py-0.5 rounded-full">
                                        {totalBills} unpaid
                                    </span>
                                </div>
                                <div className="text-right">
                                    <span className="text-sm font-bold text-red-600">
                                        ₹{totalDue.toFixed(2)} due
                                    </span>
                                </div>
                            </button>

                            {/* Bills List */}
                            {isExpanded && (
                                <div className="divide-y divide-surface-100">
                                    {clientOrders.map((order) => {
                                        const isEditing = editingOrderId === order.id;
                                        const dueStatus = getDueStatus(order.due_date ?? undefined);
                                        const orderDate = new Date(order.order_date);

                                        return (
                                            <div
                                                key={order.id}
                                                className="px-4 py-3 hover:bg-surface-50 transition-colors"
                                            >
                                                <div className="flex items-start justify-between gap-4">
                                                    {/* Left: Bill Info */}
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <span className="font-medium text-sm text-surface-900">
                                                                Order #{order.id}
                                                            </span>
                                                            <PaymentBadge status={order.payment_status} />
                                                        </div>

                                                        {/* Editable Fields */}
                                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2">
                                                            {/* Client Name */}
                                                            <div className="text-xs">
                                                                <span className="text-surface-400 block">Customer</span>
                                                                <span className="text-surface-700">{order.prospect_name}</span>
                                                            </div>

                                                            {/* Total Amount */}
                                                            <div className="text-xs">
                                                                <span className="text-surface-400 block">Total</span>
                                                                <span className="text-surface-900 font-medium">₹{order.grand_total.toFixed(2)}</span>
                                                            </div>

                                                            {/* Pending Amount - Editable */}
                                                            <div className="text-xs">
                                                                <span className="text-surface-400 block">Pending</span>
                                                                {isEditing ? (
                                                                    <div className="flex items-center gap-1">
                                                                        <span className="text-surface-400">₹</span>
                                                                        <input
                                                                            type="number"
                                                                            className="w-20 bg-surface-100 border border-surface-300 rounded px-1 py-0.5 text-xs"
                                                                            value={editPaidAmount}
                                                                            onChange={(e) => setEditPaidAmount(parseFloat(e.target.value) || 0)}
                                                                            max={order.grand_total}
                                                                            min={0}
                                                                            step="0.01"
                                                                            autoFocus
                                                                        />
                                                                    </div>
                                                                ) : (
                                                                    <span className="text-red-600 font-medium">
                                                                        ₹{order.due_amount.toFixed(2)}
                                                                    </span>
                                                                )}
                                                            </div>

                                                            {/* Due Date Status */}
                                                            <div className="text-xs">
                                                                <span className="text-surface-400 block">Due Status</span>
                                                                <span className={`font-medium ${dueStatus.color} flex items-center gap-1`}>
                                                                    <Clock className="h-3 w-3" />
                                                                    {dueStatus.text}
                                                                </span>
                                                            </div>
                                                        </div>

                                                        {/* Order Date */}
                                                        <div className="flex items-center gap-1 mt-2 text-xs text-surface-400">
                                                            <Calendar className="h-3 w-3" />
                                                            {orderDate.toLocaleDateString('en-IN')}
                                                        </div>
                                                    </div>

                                                    {/* Right: Actions */}
                                                    <div className="flex items-center gap-1">
                                                        {isEditing ? (
                                                            <>
                                                                <button
                                                                    onClick={() => savePaymentEdit(order)}
                                                                    className="p-1.5 bg-emerald-100 text-emerald-600 rounded-lg hover:bg-emerald-200"
                                                                    title="Save"
                                                                >
                                                                    <CheckCircle className="h-4 w-4" />
                                                                </button>
                                                                <button
                                                                    onClick={cancelEditing}
                                                                    className="p-1.5 bg-surface-100 text-surface-600 rounded-lg hover:bg-surface-200"
                                                                    title="Cancel"
                                                                >
                                                                    <span className="text-xs px-1">×</span>
                                                                </button>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <button
                                                                    onClick={() => startEditing(order)}
                                                                    className="p-1.5 hover:bg-surface-200 rounded-lg text-surface-400 hover:text-surface-600"
                                                                    title="Edit Payment"
                                                                >
                                                                    <Edit2 className="h-4 w-4" />
                                                                </button>
                                                                <button
                                                                    onClick={() => onClearBill(order.id)}
                                                                    className="p-1.5 hover:bg-emerald-100 rounded-lg text-surface-400 hover:text-emerald-600"
                                                                    title="Mark as Paid"
                                                                >
                                                                    <CheckCircle className="h-4 w-4" />
                                                                </button>
                                                                <button
                                                                    onClick={() => onEditBill(order)}
                                                                    className="p-1.5 hover:bg-surface-200 rounded-lg text-surface-400 hover:text-surface-600"
                                                                    title="Edit Bill"
                                                                >
                                                                    <CreditCard className="h-4 w-4" />
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>
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
                <div className="text-center py-12 text-surface-400 bg-emerald-50 rounded-xl border border-emerald-100">
                    <CheckCircle className="h-12 w-12 mx-auto mb-3 text-emerald-400" />
                    <p className="text-sm font-medium text-emerald-700">All bills are paid!</p>
                    <p className="text-xs mt-1 text-emerald-600">No outstanding payments</p>
                </div>
            )}
        </div>
    );
}
