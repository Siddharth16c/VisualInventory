/**
 * BillDetailsPanel - Right side panel with cart, pricing, payment controls
 * A4/Thermal/Receipt format toggle, prospect selector, editable cart items
 */

import { useState, useMemo } from 'react';
import { 
    User, X, Plus, Minus, Trash2, Printer, ShoppingCart, 
    CreditCard, Tag, FileText, CheckCircle, FileDigit,
    DollarSign
} from 'lucide-react';
import { useAppStore } from '@/store/store';
import type { Prospect } from '@/db/dexie';

interface BillDetailsPanelProps {
    prospects: Prospect[];
    printFormat: 'a4' | 'thermal' | 'receipt';
    onPrintFormatChange: (format: 'a4' | 'thermal' | 'receipt') => void;
    onSaveQuote: () => void;
    onSaveAndPrint: () => void;
}

// Format toggle button component
const FormatButton = ({ 
    format, 
    current, 
    onClick, 
    label, 
    icon: Icon 
}: { 
    format: 'a4' | 'thermal' | 'receipt'; 
    current: 'a4' | 'thermal' | 'receipt'; 
    onClick: () => void;
    label: string;
    icon: React.ElementType;
}) => (
    <button
        onClick={onClick}
        className={`flex-1 flex flex-col items-center gap-1 py-2 px-1 rounded-lg text-xs font-medium transition-colors ${
            current === format
                ? 'bg-surface-900 text-white'
                : 'bg-surface-100 text-surface-600 hover:bg-surface-200'
        }`}
    >
        <Icon className="h-4 w-4" />
        {label}
    </button>
);

// Payment status badge
const PaymentBadge = ({ status }: { status: 'unpaid' | 'partial' | 'paid' }) => {
    const styles = {
        paid: 'bg-emerald-100 text-emerald-700 border-emerald-200',
        partial: 'bg-amber-100 text-amber-700 border-amber-200',
        unpaid: 'bg-red-100 text-red-700 border-red-200',
    };
    const labels = { paid: 'Paid', partial: 'Partial', unpaid: 'Unpaid' };
    
    return (
        <span className={`px-3 py-1 rounded-full text-xs font-medium border ${styles[status]}`}>
            {labels[status]}
        </span>
    );
};

export default function BillDetailsPanel({
    prospects,
    printFormat,
    onPrintFormatChange,
    onSaveQuote,
    onSaveAndPrint,
}: BillDetailsPanelProps) {
    const [showProspectSearch, setShowProspectSearch] = useState(false);
    const [prospectQuery, setProspectQuery] = useState('');
    const [paidAmount, setPaidAmount] = useState<number | ''>('');
    
    // Store state
    const cartItems = useAppStore((s) => s.cartItems);
    const selectedProspect = useAppStore((s) => s.selectedProspect);
    const pricingMode = useAppStore((s) => s.pricingMode);
    const taxRate = useAppStore((s) => s.taxRate);
    const globalDiscount = useAppStore((s) => s.globalDiscount);
    const setSelectedProspect = useAppStore((s) => s.setSelectedProspect);
    const removeFromCart = useAppStore((s) => s.removeFromCart);
    const updateCartItemQty = useAppStore((s) => s.updateCartItemQty);
    const updateCartItemPrice = useAppStore((s) => s.updateCartItemPrice);
    const updateCartItemDiscount = useAppStore((s) => s.updateCartItemDiscount);
    const setTaxRate = useAppStore((s) => s.setTaxRate);
    const setGlobalDiscount = useAppStore((s) => s.setGlobalDiscount);
    const getSubtotal = useAppStore((s) => s.getSubtotal);
    const getTaxAmount = useAppStore((s) => s.getTaxAmount);
    const getGrandTotal = useAppStore((s) => s.getGrandTotal);
    const clearCart = useAppStore((s) => s.clearCart);

    // Calculated values
    const subtotal = getSubtotal();
    const taxAmt = getTaxAmount();
    const grandTotal = getGrandTotal();
    const paid = Number(paidAmount) || 0;
    const dueAmount = Math.max(0, grandTotal - paid);
    
    const paymentStatus: 'unpaid' | 'partial' | 'paid' = useMemo(() => {
        if (paid >= grandTotal) return 'paid';
        if (paid > 0) return 'partial';
        return 'unpaid';
    }, [paid, grandTotal]);

    // Filtered prospects
    const filteredProspects = useMemo(() => {
        if (!prospectQuery.trim()) return prospects.slice(0, 10);
        const q = prospectQuery.toLowerCase();
        return prospects.filter(
            (p) =>
                p.prospectname.toLowerCase().includes(q) ||
                p.area_town?.toLowerCase().includes(q) ||
                p.contact?.toLowerCase().includes(q)
        ).slice(0, 10);
    }, [prospects, prospectQuery]);

    return (
        <div className="h-full flex flex-col bg-surface-50">
            {/* Header - Customer & Print Format */}
            <div className="p-4 space-y-4 border-b border-surface-200 bg-white">
                {/* Customer Selector */}
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <User className="h-4 w-4 text-surface-500" />
                        <span className="font-semibold text-sm text-surface-900">Customer</span>
                    </div>
                    
                    {selectedProspect ? (
                        <div className="flex items-center justify-between bg-surface-100 rounded-lg px-3 py-2">
                            <div>
                                <p className="text-sm font-medium text-surface-900">{selectedProspect.prospectname}</p>
                                {selectedProspect.area_town && (
                                    <p className="text-xs text-surface-400">{selectedProspect.area_town}</p>
                                )}
                            </div>
                            <button 
                                onClick={() => setSelectedProspect(null)}
                                className="p-1 hover:bg-surface-200 rounded"
                            >
                                <X className="h-4 w-4 text-surface-400" />
                            </button>
                        </div>
                    ) : (
                        <div className="relative">
                            <input
                                className="w-full input-field text-sm"
                                placeholder="Search customer..."
                                value={prospectQuery}
                                onChange={(e) => setProspectQuery(e.target.value)}
                                onFocus={() => setShowProspectSearch(true)}
                            />
                            {showProspectSearch && (
                                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-surface-300 rounded-lg max-h-48 overflow-y-auto z-20 shadow-lg">
                                    {filteredProspects.length === 0 ? (
                                        <div className="px-3 py-2 text-sm text-surface-400">
                                            No customers found
                                        </div>
                                    ) : (
                                        filteredProspects.map((p) => (
                                            <div
                                                key={p.id}
                                                className="px-3 py-2 hover:bg-surface-50 cursor-pointer text-sm"
                                                onClick={() => {
                                                    setSelectedProspect(p);
                                                    setShowProspectSearch(false);
                                                    setProspectQuery('');
                                                }}
                                            >
                                                <p className="font-medium text-surface-900">{p.prospectname}</p>
                                                {p.area_town && (
                                                    <p className="text-xs text-surface-400">{p.area_town}</p>
                                                )}
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}
                            {/* Click outside to close */}
                            {showProspectSearch && (
                                <div 
                                    className="fixed inset-0 z-10"
                                    onClick={() => setShowProspectSearch(false)}
                                />
                            )}
                        </div>
                    )}
                </div>

                {/* Print Format Toggle */}
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <Printer className="h-4 w-4 text-surface-500" />
                        <span className="font-semibold text-sm text-surface-900">Print Format</span>
                    </div>
                    <div className="flex gap-2">
                        <FormatButton
                            format="a4"
                            current={printFormat}
                            onClick={() => onPrintFormatChange('a4')}
                            label="A4"
                            icon={FileText}
                        />
                        <FormatButton
                            format="thermal"
                            current={printFormat}
                            onClick={() => onPrintFormatChange('thermal')}
                            label="Thermal"
                            icon={FileDigit}
                        />
                        <FormatButton
                            format="receipt"
                            current={printFormat}
                            onClick={() => onPrintFormatChange('receipt')}
                            label="Receipt"
                            icon={DollarSign}
                        />
                    </div>
                </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* Cart Items */}
                <div className="bg-white rounded-xl border border-surface-200 overflow-hidden">
                    <div className="px-4 py-3 border-b border-surface-200 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <ShoppingCart className="h-4 w-4 text-surface-500" />
                            <span className="font-semibold text-sm text-surface-900">
                                Cart ({cartItems.length})
                            </span>
                        </div>
                        {cartItems.length > 0 && (
                            <button
                                onClick={clearCart}
                                className="text-xs text-red-500 hover:text-red-700"
                            >
                                Clear All
                            </button>
                        )}
                    </div>

                    {cartItems.length === 0 ? (
                        <div className="p-8 text-center text-surface-400">
                            <ShoppingCart className="h-8 w-8 mx-auto mb-2 opacity-30" />
                            <p className="text-sm">Your cart is empty</p>
                            <p className="text-xs mt-1">Add items from the catalog</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-surface-100">
                            {cartItems.map((ci) => (
                                <div key={ci.item.id} className="p-3 space-y-2">
                                    {/* Item Name & Remove */}
                                    <div className="flex items-start justify-between gap-2">
                                        <p className="text-sm font-medium text-surface-900 line-clamp-2 flex-1">
                                            {ci.item.item_name}
                                        </p>
                                        <button
                                            onClick={() => removeFromCart(ci.item.id!)}
                                            className="p-1 hover:bg-red-50 rounded text-red-400 hover:text-red-600"
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                    </div>

                                    {/* Controls Row */}
                                    <div className="flex items-center gap-2 flex-wrap">
                                        {/* Quantity */}
                                        <div className="flex items-center bg-surface-100 rounded-lg border border-surface-200">
                                            <button
                                                onClick={() => updateCartItemQty(ci.item.id!, ci.qty - 1)}
                                                className="p-1.5 hover:bg-surface-200 rounded-l-lg text-surface-500"
                                            >
                                                <Minus className="h-3 w-3" />
                                            </button>
                                            <input
                                                type="number"
                                                min="1"
                                                className="w-10 bg-transparent text-center text-sm border-none focus:ring-0 p-1"
                                                value={ci.qty}
                                                onChange={(e) => updateCartItemQty(ci.item.id!, parseInt(e.target.value) || 1)}
                                            />
                                            <button
                                                onClick={() => updateCartItemQty(ci.item.id!, ci.qty + 1)}
                                                className="p-1.5 hover:bg-surface-200 rounded-r-lg text-surface-500"
                                            >
                                                <Plus className="h-3 w-3" />
                                            </button>
                                        </div>

                                        {/* Unit Price */}
                                        <div className="flex items-center gap-1">
                                            <span className="text-xs text-surface-400">₹</span>
                                            <input
                                                type="number"
                                                step="0.01"
                                                className="w-16 bg-surface-100 border border-surface-200 rounded text-sm text-center p-1"
                                                value={ci.unit_price}
                                                onChange={(e) => updateCartItemPrice(ci.item.id!, parseFloat(e.target.value) || 0)}
                                            />
                                        </div>

                                        {/* Discount */}
                                        <div className="flex items-center gap-1">
                                            <Tag className="h-3 w-3 text-surface-400" />
                                            <input
                                                type="number"
                                                step="0.01"
                                                className="w-14 bg-surface-100 border border-surface-200 rounded text-sm text-center p-1 text-xs"
                                                placeholder="Disc"
                                                value={ci.discount || ''}
                                                onChange={(e) => updateCartItemDiscount(ci.item.id!, parseFloat(e.target.value) || 0)}
                                            />
                                        </div>

                                        {/* Line Total */}
                                        <span className="text-sm font-semibold text-surface-900 ml-auto">
                                            ₹{(ci.qty * ci.unit_price - ci.discount).toFixed(2)}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Totals & Tax */}
                <div className="bg-white rounded-xl border border-surface-200 p-4 space-y-3">
                    {/* Subtotal */}
                    <div className="flex justify-between text-sm">
                        <span className="text-surface-500">Subtotal</span>
                        <span className="text-surface-900 font-medium">₹{subtotal.toFixed(2)}</span>
                    </div>

                    {/* Tax */}
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-surface-500">Tax %</span>
                        <input
                            type="number"
                            className="w-16 bg-surface-100 border border-surface-200 rounded text-right text-sm p-1"
                            value={taxRate || ''}
                            onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                            placeholder="0"
                        />
                    </div>
                    {taxAmt > 0 && (
                        <div className="flex justify-between text-sm">
                            <span className="text-surface-500">Tax Amount</span>
                            <span className="text-surface-900">₹{taxAmt.toFixed(2)}</span>
                        </div>
                    )}

                    {/* Global Discount */}
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-surface-500">Discount</span>
                        <input
                            type="number"
                            className="w-20 bg-surface-100 border border-surface-200 rounded text-right text-sm p-1"
                            value={globalDiscount || ''}
                            onChange={(e) => setGlobalDiscount(parseFloat(e.target.value) || 0)}
                            placeholder="0"
                        />
                    </div>

                    {/* Grand Total */}
                    <div className="border-t border-surface-200 pt-3 flex justify-between">
                        <span className="text-surface-900 font-bold">Grand Total</span>
                        <span className="text-surface-900 font-bold text-lg">₹{grandTotal.toFixed(2)}</span>
                    </div>
                </div>

                {/* Payment Section */}
                <div className="bg-white rounded-xl border border-surface-200 p-4 space-y-4">
                    <div className="flex items-center gap-2">
                        <CreditCard className="h-4 w-4 text-surface-500" />
                        <span className="font-semibold text-sm text-surface-900">Payment</span>
                    </div>

                    {/* Payment Status */}
                    <div className="flex items-center justify-center">
                        <PaymentBadge status={paymentStatus} />
                    </div>

                    {/* Paid Amount */}
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-surface-500">Paid Amount</span>
                        <input
                            type="number"
                            className="w-28 bg-surface-100 border border-surface-200 rounded text-right text-sm p-2 font-medium"
                            value={paidAmount}
                            onChange={(e) => setPaidAmount(e.target.value ? parseFloat(e.target.value) : '')}
                            placeholder="0.00"
                        />
                    </div>

                    {/* Due Amount */}
                    <div className="flex justify-between text-sm">
                        <span className="text-surface-500">Due Amount</span>
                        <span className={`font-semibold ${dueAmount > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                            ₹{dueAmount.toFixed(2)}
                        </span>
                    </div>
                </div>
            </div>

            {/* Footer - Action Buttons */}
            <div className="p-4 border-t border-surface-200 bg-white space-y-2">
                <button
                    onClick={onSaveAndPrint}
                    disabled={cartItems.length === 0}
                    className="w-full btn-primary py-3 text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                    <CheckCircle className="h-4 w-4" />
                    Save & Print Bill
                </button>
                <button
                    onClick={onSaveQuote}
                    disabled={cartItems.length === 0}
                    className="w-full btn-secondary py-3 text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                    <FileText className="h-4 w-4" />
                    Save as Quote
                </button>
            </div>
        </div>
    );
}
