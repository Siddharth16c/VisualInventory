import { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Item, type Order, type OrderItem, type Bill } from '@/db/dexie';
import { useAppStore, type CartItem } from '@/store/store';
import PrintHandler from '@/components/billing/PrintHandler';
import {
    Search, Plus, Minus, Trash2, Printer, ShoppingCart, User, X,
    CreditCard, Tag, FileText, Clock, CheckCircle, Truck, RotateCcw,
} from 'lucide-react';

type Tab = 'new' | 'saved';

export default function Billing() {
    const items = useLiveQuery(() => db.items.toArray()) || [];
    const prospects = useLiveQuery(() => db.prospects.toArray()) || [];
    const orders = useLiveQuery(() => db.orders.orderBy('createdAt').reverse().toArray()) || [];
    const variants = useLiveQuery(() => db.variant_params_1.toArray()) || [];
    const addToast = useAppStore((s) => s.addToast);
    const activeBusiness = useAppStore((s) => s.activeBusiness);

    // Cart state
    const cartItems = useAppStore((s) => s.cartItems);
    const selectedProspect = useAppStore((s) => s.selectedProspect);
    const pricingMode = useAppStore((s) => s.pricingMode);
    const taxRate = useAppStore((s) => s.taxRate);
    const globalDiscount = useAppStore((s) => s.globalDiscount);
    const addToCart = useAppStore((s) => s.addToCart);
    const removeFromCart = useAppStore((s) => s.removeFromCart);
    const updateCartItemQty = useAppStore((s) => s.updateCartItemQty);
    const updateCartItemPrice = useAppStore((s) => s.updateCartItemPrice);
    const updateCartItemDiscount = useAppStore((s) => s.updateCartItemDiscount);
    const setSelectedProspect = useAppStore((s) => s.setSelectedProspect);
    const setPricingMode = useAppStore((s) => s.setPricingMode);
    const setTaxRate = useAppStore((s) => s.setTaxRate);
    const setGlobalDiscount = useAppStore((s) => s.setGlobalDiscount);
    const clearCart = useAppStore((s) => s.clearCart);
    const getSubtotal = useAppStore((s) => s.getSubtotal);
    const getTaxAmount = useAppStore((s) => s.getTaxAmount);
    const getGrandTotal = useAppStore((s) => s.getGrandTotal);

    const [activeTab, setActiveTab] = useState<Tab>('new');
    const [searchQuery, setSearchQuery] = useState('');
    const [showProspectSearch, setShowProspectSearch] = useState(false);
    const [prospectQuery, setProspectQuery] = useState('');
    const [printFormat, setPrintFormat] = useState<'a4' | 'thermal' | 'rawbt'>('a4');
    const [paidAmount, setPaidAmount] = useState<number | ''>('');

    // PrintHandler state
    const [showPrintHandler, setShowPrintHandler] = useState(false);
    const [printOrder, setPrintOrder] = useState<Order | null>(null);
    const [printCartItems, setPrintCartItems] = useState<CartItem[]>([]);

    // Saved bills search
    const [billSearch, setBillSearch] = useState('');

    // Filtered items for search
    const filteredItems = useMemo(
        () =>
            searchQuery.trim()
                ? items.filter(
                    (i) =>
                        i.item_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        i.category.toLowerCase().includes(searchQuery.toLowerCase())
                )
                : [],
        [items, searchQuery]
    );

    // Filtered prospects
    const filteredProspects = useMemo(
        () =>
            prospects.filter(
                (p) =>
                    p.prospectname.toLowerCase().includes(prospectQuery.toLowerCase()) ||
                    p.area_town.toLowerCase().includes(prospectQuery.toLowerCase())
            ),
        [prospects, prospectQuery]
    );

    // Filtered saved orders
    const filteredOrders = useMemo(() => {
        if (!billSearch.trim()) return orders;
        const q = billSearch.toLowerCase();
        return orders.filter(
            (o) =>
                o.prospect_name.toLowerCase().includes(q) ||
                String(o.id).includes(q)
        );
    }, [orders, billSearch]);

    // Variant map
    const variantMap = useMemo(() => {
        const m = new Map<number, string>();
        variants.forEach((v) => m.set(v.id!, v.name));
        return m;
    }, [variants]);

    const subtotal = getSubtotal();
    const taxAmt = getTaxAmount();
    const grandTotal = getGrandTotal();
    const paid = Number(paidAmount) || 0;
    const dueAmount = Math.max(0, grandTotal - paid);
    const paymentStatus: 'unpaid' | 'partial' | 'paid' =
        paid >= grandTotal ? 'paid' : paid > 0 ? 'partial' : 'unpaid';

    const paymentBadge = {
        paid: { text: 'Paid', cls: 'badge-success' },
        partial: { text: 'Partial', cls: 'badge-warning' },
        unpaid: { text: 'Unpaid', cls: 'badge-danger' },
    }[paymentStatus];

    const statusBadge = (status: string) => {
        switch (status) {
            case 'delivered': return 'badge-success';
            case 'dispatched': return 'badge-info';
            default: return 'badge-warning';
        }
    };

    const handleCreateOrder = async () => {
        if (cartItems.length === 0) {
            addToast('Cart is empty', 'error');
            return;
        }

        const order: Omit<Order, 'id'> = {
            prospect_id: selectedProspect?.id ?? 0,
            prospect_name: selectedProspect?.prospectname || 'Walk-in Customer',
            order_date: new Date().toISOString(),
            pricing_mode: pricingMode,
            status: 'pending',
            subtotal,
            tax_amount: taxAmt,
            discount_amount: globalDiscount,
            grand_total: grandTotal,
            paid_amount: paid,
            due_amount: dueAmount,
            payment_status: paymentStatus,
            notes: '',
            createdAt: new Date().toISOString(),
        };

        const orderId = await db.orders.add(order);

        // Save order items
        const orderItems: Omit<OrderItem, 'id'>[] = cartItems.map((ci) => ({
            order_id: orderId as number,
            item_id: ci.item.id!,
            item_name: ci.item.item_name,
            qty: ci.qty,
            unit_price: ci.unit_price,
            discount: ci.discount,
            total: ci.qty * ci.unit_price - ci.discount,
        }));
        await db.order_items.bulkAdd(orderItems);

        // Deduct stock (parcels)
        for (const ci of cartItems) {
            const current = await db.items.get(ci.item.id!);
            if (current) {
                const newParcels = Math.max(0, current.stock_parcels - ci.qty);
                await db.items.update(ci.item.id!, {
                    stock_parcels: newParcels,
                    stock_units: current.p_unit * current.P_unit_per_parcel * newParcels,
                });
            }
        }

        // Save bill record
        const billNumber = `INV-${new Date().getFullYear()}-${String(orderId).padStart(4, '0')}`;
        await db.bills.add({
            order_id: orderId as number,
            bill_number: billNumber,
            business_name: activeBusiness,
            print_format: printFormat,
            createdAt: new Date().toISOString(),
        });

        // Show PrintHandler with the saved data
        const savedOrder: Order = { ...order, id: orderId as number };
        const savedCartItems = [...cartItems];
        setPrintOrder(savedOrder);
        setPrintCartItems(savedCartItems);
        setShowPrintHandler(true);

        addToast(`Order #${orderId} created — ${billNumber}`, 'success');
        clearCart();
        setPaidAmount('');
    };

    // Open print handler for a saved order
    const handleOpenSavedBill = async (order: Order) => {
        const orderItemsData = await db.order_items.where('order_id').equals(order.id!).toArray();
        // Convert order items back to CartItem format
        const cartItemsFromOrder: CartItem[] = [];
        for (const oi of orderItemsData) {
            const item = await db.items.get(oi.item_id);
            if (item) {
                cartItemsFromOrder.push({
                    item,
                    qty: oi.qty,
                    unit_price: oi.unit_price,
                    discount: oi.discount,
                });
            }
        }

        setPrintOrder(order);
        setPrintCartItems(cartItemsFromOrder);
        setShowPrintHandler(true);
    };

    const handleUpdateStatus = async (orderId: number, status: 'quote' | 'pending' | 'dispatched' | 'delivered' | 'cancelled') => {
        await db.orders.update(orderId, { status });
        addToast(`Order #${orderId} → ${status}`, 'success');
    };

    return (
        <div className="animate-fade-in">
            {/* Tab bar */}
            <div className="flex border-b border-surface-300 mb-4">
                <button
                    onClick={() => setActiveTab('new')}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'new' ? 'border-surface-900 text-surface-900' : 'border-transparent text-surface-400 hover:text-surface-600'}`}
                >
                    <ShoppingCart className="h-4 w-4 inline mr-1.5" /> New Bill
                </button>
                <button
                    onClick={() => setActiveTab('saved')}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'saved' ? 'border-surface-900 text-surface-900' : 'border-transparent text-surface-400 hover:text-surface-600'}`}
                >
                    <FileText className="h-4 w-4 inline mr-1.5" /> Saved Bills ({orders.length})
                </button>
            </div>

            {activeTab === 'new' ? (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    {/* Left: Product Search + Cart */}
                    <div className="lg:col-span-2 space-y-3">
                        {/* Pricing Mode Toggle */}
                        <div className="flex items-center gap-3">
                            <span className="text-xs text-surface-500 font-medium">Pricing:</span>
                            <div className="flex rounded-lg overflow-hidden border border-surface-300">
                                <button
                                    onClick={() => setPricingMode('retail')}
                                    className={`px-4 py-1.5 text-xs font-medium transition-colors ${pricingMode === 'retail'
                                        ? 'bg-surface-900 text-white'
                                        : 'text-surface-500 hover:bg-surface-100'
                                        }`}
                                >
                                    Lean (Retail)
                                </button>
                                <button
                                    onClick={() => setPricingMode('wholesale')}
                                    className={`px-4 py-1.5 text-xs font-medium transition-colors ${pricingMode === 'wholesale'
                                        ? 'bg-surface-900 text-white'
                                        : 'text-surface-500 hover:bg-surface-100'
                                        }`}
                                >
                                    Bulk (Wholesale)
                                </button>
                            </div>
                            <span className={paymentBadge.cls}>{paymentBadge.text}</span>
                        </div>

                        {/* Item search */}
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-400" />
                            <input
                                className="input-field pl-10"
                                placeholder="Search items to add..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>

                        {/* Search results */}
                        {filteredItems.length > 0 && (
                            <div className="glass rounded-xl max-h-48 overflow-y-auto divide-y divide-surface-200">
                                {filteredItems.map((item) => (
                                    <div
                                        key={item.id}
                                        className="flex items-center justify-between px-4 py-2 hover:bg-surface-50 cursor-pointer transition-colors"
                                        onClick={() => {
                                            addToCart(item);
                                            setSearchQuery('');
                                            addToast(`${item.item_name} added`, 'info');
                                        }}
                                    >
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium truncate text-surface-900">{item.item_name}</p>
                                            <p className="text-xs text-surface-400">
                                                {item.category} · {item.stock_parcels} parcels
                                            </p>
                                        </div>
                                        <div className="text-right ml-3 flex-shrink-0">
                                            <p className="text-sm font-semibold text-surface-900">
                                                Rs.{(pricingMode === 'wholesale' ? item.wholesale_price_container : item.retail_price_container).toFixed(2)}
                                            </p>
                                            <Plus className="h-4 w-4 text-surface-400 ml-auto" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Cart items */}
                        <div className="glass rounded-xl">
                            <div className="px-4 py-3 border-b border-surface-200 flex items-center gap-2">
                                <ShoppingCart className="h-4 w-4 text-surface-500" />
                                <h3 className="font-semibold text-sm text-surface-900">Cart ({cartItems.length} items)</h3>
                            </div>

                            {cartItems.length === 0 ? (
                                <p className="p-8 text-center text-surface-400 text-sm">
                                    Search and add items to the cart
                                </p>
                            ) : (
                                <div className="divide-y divide-surface-200">
                                    {cartItems.map((ci) => (
                                        <div key={ci.item.id} className="px-4 py-3 space-y-2">
                                            <div className="flex items-start justify-between">
                                                <div className="min-w-0">
                                                    <p className="text-sm font-medium truncate text-surface-900">{ci.item.item_name}</p>
                                                    <p className="text-xs text-surface-400">
                                                        {ci.item.variant_param1_id && variantMap.has(ci.item.variant_param1_id) && (
                                                            <span>{variantMap.get(ci.item.variant_param1_id)} · </span>
                                                        )}
                                                        {ci.item.category}
                                                    </p>
                                                </div>
                                                <button onClick={() => removeFromCart(ci.item.id!)} className="p-1 hover:bg-red-50 rounded transition-colors">
                                                    <Trash2 className="h-3.5 w-3.5 text-red-500" />
                                                </button>
                                            </div>
                                            <div className="flex items-center gap-3 flex-wrap">
                                                {/* Qty controls */}
                                                <div className="flex items-center gap-1 bg-surface-100 rounded-lg border border-surface-200">
                                                    <button onClick={() => updateCartItemQty(ci.item.id!, ci.qty - 1)} className="text-surface-500 p-1 hover:bg-surface-200 rounded-l-lg">
                                                        <Minus className="h-3 w-3" />
                                                    </button>
                                                    <input
                                                        type="number"
                                                        className="text-surface-500 w-12 bg-transparent text-center text-sm border-none focus:ring-0 p-1"
                                                        value={ci.qty}
                                                        onChange={(e) => updateCartItemQty(ci.item.id!, parseInt(e.target.value) || 1)}
                                                    />
                                                    <button onClick={() => updateCartItemQty(ci.item.id!, ci.qty + 1)} className="text-surface-500 p-1 hover:bg-surface-200 rounded-r-lg">
                                                        <Plus className="h-3 w-3" />
                                                    </button>
                                                </div>

                                                {/* Editable price */}
                                                <div className="flex items-center gap-1">
                                                    <span className="text-xs text-surface-400">Rs.</span>
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        className="text-surface-500 w-20 bg-surface-100 border border-surface-200 rounded-lg text-sm text-center focus:ring-1 focus:ring-surface-900 p-1"
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
                                                        className="w-16 bg-surface-100 border border-surface-200 rounded-lg text-sm text-center focus:ring-1 focus:ring-surface-900 p-1"
                                                        placeholder="Disc"
                                                        value={ci.discount || ''}
                                                        onChange={(e) => updateCartItemDiscount(ci.item.id!, parseFloat(e.target.value) || 0)}
                                                    />
                                                </div>

                                                {/* Line total */}
                                                <p className="text-sm font-semibold text-surface-900 ml-auto">
                                                    Rs.{Math.max(0, ci.qty * ci.unit_price - ci.discount).toFixed(2)}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right: Bill Summary */}
                    <div className="space-y-3">
                        {/* Prospect selector */}
                        <div className="glass rounded-xl p-4 space-y-3">
                            <div className="flex items-center gap-2">
                                <User className="h-4 w-4 text-surface-500" />
                                <h3 className="font-semibold text-sm text-surface-900">Customer</h3>
                            </div>
                            {selectedProspect ? (
                                <div className="flex items-center justify-between bg-surface-50 rounded-lg px-3 py-2">
                                    <div>
                                        <p className="text-sm font-medium text-surface-900">{selectedProspect.prospectname}</p>
                                        <p className="text-xs text-surface-400">{selectedProspect.area_town}</p>
                                    </div>
                                    <button onClick={() => setSelectedProspect(null)}>
                                        <X className="h-4 w-4 text-surface-400" />
                                    </button>
                                </div>
                            ) : (
                                <div className="relative">
                                    <input
                                        className="input-field text-sm"
                                        placeholder="Search prospect..."
                                        value={prospectQuery}
                                        onChange={(e) => { setProspectQuery(e.target.value); setShowProspectSearch(true); }}
                                        onFocus={() => setShowProspectSearch(true)}
                                    />
                                    {showProspectSearch && prospectQuery && (
                                        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-surface-300 rounded-lg max-h-40 overflow-y-auto z-10 shadow-lg">
                                            {filteredProspects.map((p) => (
                                                <div
                                                    key={p.id}
                                                    className="px-3 py-2 hover:bg-surface-50 cursor-pointer text-sm text-surface-500"
                                                    onClick={() => {
                                                        setSelectedProspect(p);
                                                        setShowProspectSearch(false);
                                                        setProspectQuery('');
                                                    }}
                                                >
                                                    {p.prospectname} — {p.area_town}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Print format */}
                        <div className="glass rounded-xl p-4 space-y-2">
                            <div className="flex items-center gap-2">
                                <Printer className="h-4 w-4 text-surface-500" />
                                <h3 className="font-semibold text-sm text-surface-900">Print Format</h3>
                            </div>
                            <div className="grid grid-cols-3 gap-1">
                                {(['a4', 'thermal', 'rawbt'] as const).map((fmt) => (
                                    <button
                                        key={fmt}
                                        onClick={() => setPrintFormat(fmt)}
                                        className={`px-2 py-1.5 text-xs rounded-lg font-medium text-center transition-colors ${printFormat === fmt
                                            ? 'bg-surface-900 text-white'
                                            : 'bg-surface-100 text-surface-500 hover:bg-surface-200'
                                            }`}
                                    >
                                        {fmt === 'a4' ? 'A4' : fmt === 'thermal' ? 'Thermal' : 'RawBT'}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Totals */}
                        <div className="glass rounded-xl p-4 space-y-3">
                            <div className="flex justify-between text-sm">
                                <span className="text-surface-500">Subtotal</span>
                                <span className="text-surface-900">Rs.{subtotal.toFixed(2)}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-surface-500">Tax %</span>
                                <input
                                    type="number"
                                    className="w-16 bg-surface-100 border border-surface-200 rounded text-right text-sm focus:ring-1 focus:ring-surface-900 px-2 py-1"
                                    value={taxRate || ''}
                                    onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                                    placeholder="0"
                                />
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-surface-500">Tax Amount</span>
                                <span className="text-surface-900">Rs.{taxAmt.toFixed(2)}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-surface-500">Discount</span>
                                <input
                                    type="number"
                                    className="w-20 bg-surface-100 border border-surface-200 rounded text-right text-sm focus:ring-1 focus:ring-surface-900 px-2 py-1"
                                    value={globalDiscount || ''}
                                    onChange={(e) => setGlobalDiscount(parseFloat(e.target.value) || 0)}
                                    placeholder="0"
                                />
                            </div>

                            <div className="border-t border-surface-200 pt-2 flex justify-between font-bold text-lg">
                                <span className="text-surface-900">Total</span>
                                <span className="text-surface-900">Rs.{grandTotal.toFixed(2)}</span>
                            </div>

                            {/* Payment */}
                            <div className="border-t border-surface-200 pt-3 space-y-2">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-surface-500 flex items-center gap-1.5">
                                        <CreditCard className="h-3.5 w-3.5" /> Paid Amount
                                    </span>
                                    <input
                                        type="number"
                                        className="text-surface-500 w-24 bg-surface-100 border border-surface-200 rounded text-right text-sm focus:ring-1 focus:ring-emerald-500 px-2 py-1"
                                        value={paidAmount}
                                        onChange={(e) => setPaidAmount(e.target.value ? parseFloat(e.target.value) : '')}
                                        placeholder="0.00"
                                    />
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-surface-500">Due Amount</span>
                                    <span className={dueAmount > 0 ? 'text-red-600 font-semibold' : 'text-emerald-600'}>
                                        Rs.{dueAmount.toFixed(2)}
                                    </span>
                                </div>
                                <div className="flex justify-center">
                                    <span className={paymentBadge.cls}>{paymentBadge.text}</span>
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={handleCreateOrder}
                            disabled={cartItems.length === 0}
                            className="btn-primary w-full py-3 text-base flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            <Printer className="h-5 w-5" />
                            Create Bill & Print
                        </button>
                    </div>
                </div>
            ) : (
                /* ─── Saved Bills Tab ─── */
                <div className="space-y-3">
                    <div className="relative max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-400" />
                        <input
                            className="input-field pl-10"
                            placeholder="Search orders by prospect or ID..."
                            value={billSearch}
                            onChange={(e) => setBillSearch(e.target.value)}
                        />
                    </div>

                    {filteredOrders.length === 0 ? (
                        <div className="glass rounded-xl p-12 text-center text-surface-400">
                            No orders found
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {filteredOrders.map((order) => (
                                <div key={order.id} className="glass rounded-xl p-4 space-y-2">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-semibold text-surface-900">
                                                Order #{order.id} — {order.prospect_name}
                                            </p>
                                            <p className="text-xs text-surface-400">
                                                {new Date(order.order_date).toLocaleString('en-IN')} · {order.pricing_mode === 'wholesale' ? 'Bulk' : 'Lean'}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-bold text-surface-900">Rs.{order.grand_total.toFixed(2)}</p>
                                            <div className="flex gap-1 mt-1">
                                                <span className={statusBadge(order.status)}>{order.status}</span>
                                                <span className={{
                                                    paid: 'badge-success',
                                                    partial: 'badge-warning',
                                                    unpaid: 'badge-danger',
                                                }[order.payment_status]}>{order.payment_status}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Due info */}
                                    {order.due_amount > 0 && (
                                        <p className="text-xs text-red-600">
                                            Due: Rs.{order.due_amount.toFixed(2)} (Paid: Rs.{order.paid_amount.toFixed(2)})
                                        </p>
                                    )}

                                    {/* Action buttons */}
                                    <div className="flex items-center gap-2 pt-1">
                                        <button
                                            onClick={() => handleOpenSavedBill(order)}
                                            className="btn-secondary text-xs flex items-center gap-1.5"
                                        >
                                            <Printer className="h-3.5 w-3.5" /> Print/Share
                                        </button>
                                        {order.status === 'pending' && (
                                            <button
                                                onClick={() => handleUpdateStatus(order.id!, 'dispatched')}
                                                className="btn-ghost text-xs flex items-center gap-1.5"
                                            >
                                                <Truck className="h-3.5 w-3.5" /> Dispatched
                                            </button>
                                        )}
                                        {order.status === 'dispatched' && (
                                            <button
                                                onClick={() => handleUpdateStatus(order.id!, 'delivered')}
                                                className="btn-ghost text-xs flex items-center gap-1.5"
                                            >
                                                <CheckCircle className="h-3.5 w-3.5" /> Delivered
                                            </button>
                                        )}
                                        {order.status !== 'pending' && (
                                            <button
                                                onClick={() => handleUpdateStatus(order.id!, 'pending')}
                                                className="btn-ghost text-xs flex items-center gap-1.5 text-surface-400"
                                            >
                                                <RotateCcw className="h-3.5 w-3.5" /> Reset
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* PrintHandler overlay */}
            {showPrintHandler && printOrder && (
                <PrintHandler
                    order={printOrder}
                    items={printCartItems}
                    onClose={() => { setShowPrintHandler(false); setPrintOrder(null); setPrintCartItems([]); }}
                />
            )}
        </div>
    );
}
