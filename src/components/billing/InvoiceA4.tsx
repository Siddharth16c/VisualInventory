import { forwardRef } from 'react';
import type { Order } from '@/db/dexie';
import type { CartItem } from '@/store/store';

interface InvoiceA4Props {
    order: Order;
    items: CartItem[];
    variantMap?: Map<number, string>;
}

const InvoiceA4 = forwardRef<HTMLDivElement, InvoiceA4Props>(({ order, items, variantMap }, ref) => {
    return (
        <div ref={ref} className="bg-white text-black p-8 max-w-[210mm] mx-auto" style={{ fontFamily: 'Inter, Arial, sans-serif' }}>
            {/* Header */}
            <div className="flex justify-between items-start border-b-2 border-gray-800 pb-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">INVOICE</h1>
                    <p className="text-sm text-gray-500 mt-1">VisualOS Inventory</p>
                </div>
                <div className="text-right text-sm text-gray-600">
                    <p className="font-semibold text-gray-900">Invoice #{order.id}</p>
                    <p>Date: {new Date(order.order_date).toLocaleDateString('en-IN')}</p>
                    <p>Time: {new Date(order.order_date).toLocaleTimeString('en-IN')}</p>
                </div>
            </div>

            {/* Bill To */}
            <div className="mb-6">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Bill To</h3>
                <p className="font-semibold text-gray-900">{order.prospect_name}</p>
            </div>

            {/* Pricing mode */}
            <div className="mb-4 text-xs text-gray-500">
                Mode: {order.pricing_mode === 'wholesale' ? 'Bulk (Wholesale)' : 'Lean (Retail)'}
            </div>

            {/* Line Items Table */}
            <table className="w-full text-sm mb-6">
                <thead>
                    <tr className="border-b-2 border-gray-200">
                        <th className="text-left py-2 font-semibold text-gray-600">#</th>
                        <th className="text-left py-2 font-semibold text-gray-600">Item</th>
                        <th className="text-right py-2 font-semibold text-gray-600">Qty</th>
                        <th className="text-right py-2 font-semibold text-gray-600">Price</th>
                        <th className="text-right py-2 font-semibold text-gray-600">Disc</th>
                        <th className="text-right py-2 font-semibold text-gray-600">Total</th>
                    </tr>
                </thead>
                <tbody>
                    {items.map((ci, idx) => (
                        <tr key={idx} className="border-b border-gray-100">
                            <td className="py-2 text-gray-500">{idx + 1}</td>
                            <td className="py-2">
                                <p className="font-medium text-gray-900">{ci.item.item_name}</p>
                                {ci.item.variant_param1_id && variantMap?.has(ci.item.variant_param1_id) && (
                                    <p className="text-xs text-gray-500">{variantMap.get(ci.item.variant_param1_id)}</p>
                                )}
                            </td>
                            <td className="py-2 text-right">{ci.qty}</td>
                            <td className="py-2 text-right">Rs.{ci.unit_price.toFixed(2)}</td>
                            <td className="py-2 text-right">Rs.{ci.discount.toFixed(2)}</td>
                            <td className="py-2 text-right font-medium">Rs.{(ci.qty * ci.unit_price - ci.discount).toFixed(2)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {/* Totals */}
            <div className="flex justify-end">
                <div className="w-64 space-y-1 text-sm">
                    <div className="flex justify-between">
                        <span className="text-gray-500">Subtotal</span>
                        <span>Rs.{order.subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-500">Tax</span>
                        <span>Rs.{order.tax_amount.toFixed(2)}</span>
                    </div>
                    {order.discount_amount > 0 && (
                        <div className="flex justify-between">
                            <span className="text-gray-500">Discount</span>
                            <span>-Rs.{order.discount_amount.toFixed(2)}</span>
                        </div>
                    )}
                    <div className="flex justify-between border-t-2 border-gray-800 pt-2 font-bold text-lg">
                        <span>Grand Total</span>
                        <span>Rs.{order.grand_total.toFixed(2)}</span>
                    </div>
                    {/* Payment Info */}
                    <div className="flex justify-between text-xs mt-2 pt-1 border-t border-gray-200">
                        <span className="text-gray-500">Paid</span>
                        <span>Rs.{order.paid_amount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                        <span className="text-gray-500">Due</span>
                        <span className={order.due_amount > 0 ? 'text-red-600 font-semibold' : ''}>Rs.{order.due_amount.toFixed(2)}</span>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="mt-12 pt-4 border-t border-gray-200 text-center text-xs text-gray-400">
                <p>Thank you for your business!</p>
                <p className="mt-1">Generated by VisualOS Inventory Suite</p>
            </div>
        </div>
    );
});

InvoiceA4.displayName = 'InvoiceA4';
export default InvoiceA4;
