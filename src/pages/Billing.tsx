import { useState, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Product, type Order, type OrderItem } from '@/db/dexie';
import { useAppStore, type CartItem } from '@/store/store';
import { Search, Plus, Minus, Trash2, Printer, ShoppingCart, User, X } from 'lucide-react';
import InvoiceA4 from '@/components/billing/InvoiceA4';
import InvoiceThermal from '@/components/billing/InvoiceThermal';
import PrintHandler from '@/components/billing/PrintHandler';

export default function Billing() {
    const products = useLiveQuery(() => db.products.toArray()) || [];
    const prospects = useLiveQuery(() => db.prospects.toArray()) || [];
    const {
        cartItems, selectedProspect, taxRate, globalDiscount,
        addToCart, removeFromCart, updateCartItemQty, updateCartItemPrice,
        updateCartItemDiscount, setSelectedProspect, setTaxRate,
        setGlobalDiscount, clearCart, getSubtotal, getTaxAmount, getGrandTotal,
    } = useAppStore();
    const addToast = useAppStore((s) => s.addToast);

    const [searchQuery, setSearchQuery] = useState('');
    const [showProspectPicker, setShowProspectPicker] = useState(false);
    const [showPrintPreview, setShowPrintPreview] = useState(false);
    const [lastOrder, setLastOrder] = useState<{ order: Order; items: CartItem[] } | null>(null);

    const filteredProducts = products.filter(
        (p) =>
            p.item_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.product_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.category?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleCreateOrder = async () => {
        if (cartItems.length === 0) {
            addToast('Cart is empty', 'error');
            return;
        }

        try {
            const now = new Date().toISOString();
            const order: Order = {
                prospect_id: selectedProspect?.id || 0,
                prospect_name: selectedProspect?.prospectname || 'Walk-in Customer',
                order_date: now,
                status: 'pending',
                subtotal: getSubtotal(),
                tax_amount: getTaxAmount(),
                discount_amount: globalDiscount,
                grand_total: getGrandTotal(),
                due_amount: getGrandTotal(),
                paid_amount: 0,
                createdAt: now,
            };

            const orderId = await db.orders.add(order);

            // Save line items
            const lineItems: OrderItem[] = cartItems.map((ci) => ({
                order_id: orderId as number,
                product_id: ci.product.id!,
                product_name: ci.product.product_name,
                qty: ci.qty,
                unit_price: ci.unit_price,
                discount: ci.discount,
                total: ci.qty * ci.unit_price - ci.discount,
            }));
            await db.order_items.bulkAdd(lineItems);

            setLastOrder({ order: { ...order, id: orderId as number }, items: [...cartItems] });
            setShowPrintPreview(true);
            addToast('Order created successfully!', 'success');
        } catch (e) {
            addToast('Failed to create order', 'error');
        }
    };

    return (
        <div className="animate-fade-in">
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
                {/* Product Search Panel */}
                <div className="lg:col-span-2 space-y-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-500" />
                        <input
                            className="input-field pl-10"
                            placeholder="Search products to add..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <div className="glass rounded-xl max-h-[60vh] overflow-y-auto divide-y divide-surface-800">
                        {filteredProducts.length === 0 ? (
                            <p className="p-4 text-center text-surface-500 text-sm">No products found</p>
                        ) : (
                            filteredProducts.map((p) => (
                                <div
                                    key={p.id}
                                    className="flex items-center justify-between px-4 py-3 hover:bg-surface-800/50 cursor-pointer transition-colors"
                                    onClick={() => addToCart(p)}
                                >
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-medium text-surface-100 truncate">{p.product_name}</p>
                                        <p className="text-xs text-surface-500">{p.item_name} · {p.category}</p>
                                    </div>
                                    <div className="text-right ml-3 flex-shrink-0">
                                        <p className="text-sm font-semibold text-brand-400">₹{p.selling_price.toFixed(2)}</p>
                                        <p className="text-xs text-surface-500">{p.stock_qty} {p.unit}</p>
                                    </div>
                                    <Plus className="h-4 w-4 text-surface-400 ml-2 flex-shrink-0" />
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Cart Panel */}
                <div className="lg:col-span-3 space-y-3">
                    {/* Prospect Selection */}
                    <div className="glass rounded-xl p-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <User className="h-4 w-4 text-surface-400" />
                                <span className="text-sm text-surface-300">
                                    {selectedProspect ? selectedProspect.prospectname : 'Walk-in Customer'}
                                </span>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => setShowProspectPicker(true)} className="btn-ghost text-xs px-2 py-1">
                                    {selectedProspect ? 'Change' : 'Select Customer'}
                                </button>
                                {selectedProspect && (
                                    <button onClick={() => setSelectedProspect(null)} className="btn-ghost p-1">
                                        <X className="h-3.5 w-3.5 text-red-400" />
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Cart Items */}
                    <div className="glass rounded-xl overflow-hidden">
                        <div className="p-3 border-b border-surface-700 flex items-center gap-2">
                            <ShoppingCart className="h-4 w-4 text-brand-400" />
                            <span className="text-sm font-semibold">Cart ({cartItems.length} items)</span>
                        </div>
                        {cartItems.length === 0 ? (
                            <p className="p-8 text-center text-surface-500 text-sm">
                                Click products to add them to cart
                            </p>
                        ) : (
                            <div className="divide-y divide-surface-800 max-h-[40vh] overflow-y-auto">
                                {cartItems.map((item) => (
                                    <div key={item.product.id} className="px-4 py-3">
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="min-w-0 flex-1">
                                                <p className="text-sm font-medium text-surface-100 truncate">{item.product.product_name}</p>
                                                <p className="text-xs text-surface-500">{item.product.item_name}</p>
                                            </div>
                                            <button onClick={() => removeFromCart(item.product.id!)} className="btn-ghost p-1">
                                                <Trash2 className="h-4 w-4 text-red-400" />
                                            </button>
                                        </div>
                                        <div className="flex items-center gap-3 mt-2">
                                            <div className="flex items-center gap-1.5">
                                                <button
                                                    onClick={() => updateCartItemQty(item.product.id!, item.qty - 1)}
                                                    className="h-7 w-7 flex items-center justify-center rounded-md bg-surface-700 hover:bg-surface-600 transition-colors"
                                                >
                                                    <Minus className="h-3 w-3" />
                                                </button>
                                                <input
                                                    type="number"
                                                    className="w-14 text-center input-field py-1 text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                    value={item.qty}
                                                    onChange={(e) => updateCartItemQty(item.product.id!, parseInt(e.target.value) || 0)}
                                                />
                                                <button
                                                    onClick={() => updateCartItemQty(item.product.id!, item.qty + 1)}
                                                    className="h-7 w-7 flex items-center justify-center rounded-md bg-surface-700 hover:bg-surface-600 transition-colors"
                                                >
                                                    <Plus className="h-3 w-3" />
                                                </button>
                                            </div>
                                            <span className="text-xs text-surface-500">×</span>
                                            <input
                                                type="number"
                                                className="w-20 input-field py-1 text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                value={item.unit_price}
                                                onChange={(e) => updateCartItemPrice(item.product.id!, parseFloat(e.target.value) || 0)}
                                            />
                                            <span className="ml-auto text-sm font-semibold text-surface-100">
                                                ₹{(item.qty * item.unit_price - item.discount).toFixed(2)}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Totals */}
                    {cartItems.length > 0 && (
                        <div className="glass rounded-xl p-4 space-y-3">
                            <div className="flex justify-between text-sm">
                                <span className="text-surface-400">Subtotal</span>
                                <span className="font-medium">₹{getSubtotal().toFixed(2)}</span>
                            </div>
                            <div className="flex items-center justify-between gap-3 text-sm">
                                <span className="text-surface-400 flex-shrink-0">Tax %</span>
                                <input
                                    type="number"
                                    className="w-20 input-field py-1 text-sm text-right [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                    value={taxRate}
                                    onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                                />
                                <span className="font-medium">₹{getTaxAmount().toFixed(2)}</span>
                            </div>
                            <div className="flex items-center justify-between gap-3 text-sm">
                                <span className="text-surface-400 flex-shrink-0">Discount</span>
                                <input
                                    type="number"
                                    className="w-24 input-field py-1 text-sm text-right [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                    value={globalDiscount}
                                    onChange={(e) => setGlobalDiscount(parseFloat(e.target.value) || 0)}
                                />
                            </div>
                            <div className="border-t border-surface-700 pt-3 flex justify-between">
                                <span className="text-lg font-bold">Grand Total</span>
                                <span className="text-lg font-bold text-brand-400">₹{getGrandTotal().toFixed(2)}</span>
                            </div>
                            <div className="flex gap-3">
                                <button onClick={clearCart} className="btn-danger flex-1 text-sm">Clear Cart</button>
                                <button onClick={handleCreateOrder} className="btn-primary flex-1 text-sm flex items-center justify-center gap-2">
                                    <Printer className="h-4 w-4" /> Create Order
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Prospect Picker Modal */}
            {showProspectPicker && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
                    <div className="glass rounded-2xl p-5 w-full max-w-md max-h-[70vh] overflow-y-auto animate-slide-up">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold">Select Customer</h3>
                            <button onClick={() => setShowProspectPicker(false)} className="btn-ghost p-1.5"><X className="h-5 w-5" /></button>
                        </div>
                        <div className="divide-y divide-surface-800">
                            {prospects.length === 0 ? (
                                <p className="py-8 text-center text-surface-500 text-sm">No prospects yet. Add them in the Prospects page.</p>
                            ) : (
                                prospects.map((p) => (
                                    <button
                                        key={p.id}
                                        className="w-full text-left px-3 py-3 hover:bg-surface-800/50 transition-colors rounded-lg"
                                        onClick={() => { setSelectedProspect(p); setShowProspectPicker(false); }}
                                    >
                                        <p className="text-sm font-medium">{p.prospectname}</p>
                                        <p className="text-xs text-surface-500">{p.area_town} · {p.business_type}</p>
                                    </button>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Print Preview Modal */}
            {showPrintPreview && lastOrder && (
                <PrintHandler
                    order={lastOrder.order}
                    items={lastOrder.items}
                    onClose={() => { setShowPrintPreview(false); clearCart(); }}
                />
            )}
        </div>
    );
}
