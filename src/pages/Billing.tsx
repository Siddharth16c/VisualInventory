/**
 * Billing Page - Refactored with 60/40 layout
 * New Bill | Saved Bills | Unpaid Bills tabs
 * Uses AdvancedSearch, VerticalCatalog, BillDetailsPanel components
 */

import { useState, useCallback, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DAL } from '@/db/dal';
import { useAppStore } from '@/store/store';
import type { Item, Prospect } from '@/db/dexie';
import type { Vertical, Brand, Subcategory, Order } from '@/db/types';

// Components
import AdvancedSearch from '@/components/billing/AdvancedSearch';
import VerticalCatalog from '@/components/billing/VerticalCatalog';
import ItemCard from '@/components/billing/ItemCard';
import BillDetailsPanel from '@/components/billing/BillDetailsPanel';
import SavedBillsView from '@/components/billing/SavedBillsView';
import UnpaidBillsView from '@/components/billing/UnpaidBillsView';
import PrintHandler from '@/components/billing/PrintHandler';

// Icons
import {
    ShoppingCart, FileText, AlertCircle, Plus, Minus,
    Search, Filter, ChevronDown, ChevronRight
} from 'lucide-react';


type Tab = 'new' | 'saved' | 'unpaid';

export default function Billing() {
    const [activeTab, setActiveTab] = useState<Tab>('new');
    const [printFormat, setPrintFormat] = useState<'a4' | 'thermal' | 'receipt'>('a4');
    const [showPrintHandler, setShowPrintHandler] = useState(false);
    const [printOrder, setPrintOrder] = useState<Order | null>(null);
    const [searchResults, setSearchResults] = useState<Item[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    // Store
    const cartItems = useAppStore((s) => s.cartItems);
    const searchQuery = useAppStore((s) => s.searchQuery);
    const searchFilters = useAppStore((s) => s.searchFilters);
    const selectedProspect = useAppStore((s) => s.selectedProspect);
    const pricingMode = useAppStore((s) => s.pricingMode);
    const addToCart = useAppStore((s) => s.addToCart);
    const clearCart = useAppStore((s) => s.clearCart);
    const addToast = useAppStore((s) => s.addToast);
    const getSubtotal = useAppStore((s) => s.getSubtotal);
    const getTaxAmount = useAppStore((s) => s.getTaxAmount);
    const getGrandTotal = useAppStore((s) => s.getGrandTotal);
    const paidAmount = useAppStore((s) => s.taxRate); // Reuse taxRate store for paid amount tracking
    const setPaidAmount = useAppStore((s) => s.setTaxRate);

    // Data fetching with TanStack Query
    const { data: items = [] } = useQuery({
        queryKey: ['items'],
        queryFn: () => DAL.items.getAll(),
    });

    const { data: prospects = [] } = useQuery({
        queryKey: ['prospects'],
        queryFn: () => DAL.prospects.getAll(),
    });

    const { data: orders = [], refetch: refetchOrders } = useQuery({
        queryKey: ['orders'],
        queryFn: () => DAL.orders.getAll(),
    });

    const { data: verticals = [] } = useQuery({
        queryKey: ['verticals'],
        queryFn: () => DAL.verticals.getAll(),
    });

    const { data: brands = [] } = useQuery({
        queryKey: ['brands'],
        queryFn: () => DAL.brands.getAll(),
    });

    const { data: subcategories = [] } = useQuery({
        queryKey: ['subcategories'],
        queryFn: () => DAL.subcategories.getAll(),
    });

    // Search handler with Typesense fallback
    const handleSearch = useCallback(async (query: string) => {
        if (!query.trim() && !searchFilters.vertical_id && !searchFilters.brand_id && !searchFilters.subcategory_id) {
            setSearchResults([]);
            return;
        }

        setIsSearching(true);
        try {
            const results = await DAL.items.search({
                query: query || undefined,
                brand_id: searchFilters.brand_id,
                vertical_id: searchFilters.vertical_id,
                subcategory_id: searchFilters.subcategory_id,
                limit: 50,
            });
            setSearchResults(results as Item[]);
        } catch (error) {
            console.error('Search error:', error);
            addToast('Search failed', 'error');
        } finally {
            setIsSearching(false);
        }
    }, [searchFilters, addToast]);

    // Create order
    const handleCreateOrder = async (isQuote: boolean = false) => {
        if (cartItems.length === 0) {
            addToast('Cart is empty', 'error');
            return;
        }

        const subtotal = getSubtotal();
        const taxAmt = getTaxAmount();
        const grandTotal = getGrandTotal();
        const paid = Number(paidAmount) || 0;
        const due = Math.max(0, grandTotal - paid);
        const paymentStatus: 'unpaid' | 'partial' | 'paid' =
            paid >= grandTotal ? 'paid' : paid > 0 ? 'partial' : 'unpaid';

        // DAL.orders.add injects firm_id + created_at server-side; cast to any to avoid
        // requiring those fields here (they aren't available client-side at insert time)
        const order = {
            prospect_id: selectedProspect?.id ?? 0,
            prospect_name: selectedProspect?.prospectname || 'Walk-in Customer',
            order_date: new Date().toISOString(),
            pricing_mode: pricingMode,
            status: isQuote ? 'quote' : 'pending',
            subtotal,
            tax_amount: taxAmt,
            discount_amount: 0,
            grand_total: grandTotal,
            paid_amount: paid,
            due_amount: due,
            payment_status: paymentStatus,
            notes: '',
        } as Parameters<typeof DAL.orders.add>[0];

        try {
            const savedOrder: any = await DAL.orders.add(order);
            const orderId = savedOrder.id;

            // Save order items
            for (const ci of cartItems) {
                await DAL.order_items.add({
                    order_id: orderId,
                    item_id: ci.item.id!,
                    item_name: ci.item.item_name,
                    qty: ci.qty,
                    unit_price: ci.unit_price,
                    discount: ci.discount,
                    total: ci.qty * ci.unit_price - ci.discount,
                });
            }

            // Deduct stock if not quote
            if (!isQuote) {
                for (const ci of cartItems) {
                    try {
                        const current = await DAL.items.getById(ci.item.id!);
                        if (current) {
                            const newParcels = Math.max(0, (current.stock_parcels ?? 0) - ci.qty);
                            await DAL.items.update(ci.item.id!, {
                                stock_parcels: newParcels,
                                stock_units: (current.p_unit ?? 1) * (current.P_unit_per_parcel ?? 1) * newParcels,
                            });
                        }
                    } catch { /* item may not exist */ }
                }

                // Save bill record
                await DAL.bills.add({
                    order_id: orderId,
                    bill_number: `INV-${new Date().getFullYear()}-${String(orderId).padStart(4, '0')}`,
                    business_name: 'R.S. Enterprises',
                    print_format: printFormat,
                });
            }

            const finalOrder = { ...order, id: orderId };
            setPrintOrder(finalOrder);
            setShowPrintHandler(true);

            const msg = isQuote ? `Quote #${orderId} created` : `Bill #${orderId} created`;
            addToast(msg, 'success');
            clearCart();
            setPaidAmount(0);
            refetchOrders();
        } catch (error) {
            console.error('Create order error:', error);
            addToast('Failed to create order', 'error');
        }
    };

    // Open saved bill
    const handleOpenBill = async (order: Order) => {
        setPrintOrder(order);
        setShowPrintHandler(true);
    };

    // Delete bill
    const handleDeleteBill = async (orderId: number) => {
        if (!confirm('Delete this bill? This cannot be undone.')) return;
        try {
            await DAL.orders.delete(orderId);
            addToast('Bill deleted', 'success');
            refetchOrders();
        } catch (error) {
            addToast('Failed to delete bill', 'error');
        }
    };

    // Update payment
    const handleUpdatePayment = async (orderId: number, newPaidAmount: number) => {
        try {
            const order = orders.find(o => o.id === orderId);
            if (!order) return;

            const newDue = Math.max(0, order.grand_total - newPaidAmount);
            const newStatus: 'unpaid' | 'partial' | 'paid' =
                newPaidAmount >= order.grand_total ? 'paid' : newPaidAmount > 0 ? 'partial' : 'unpaid';

            await DAL.orders.update(orderId, {
                paid_amount: newPaidAmount,
                due_amount: newDue,
                payment_status: newStatus,
            });

            addToast('Payment updated', 'success');
            refetchOrders();
        } catch (error) {
            addToast('Failed to update payment', 'error');
        }
    };

    // Clear bill (mark as paid)
    const handleClearBill = async (orderId: number) => {
        try {
            const order = orders.find(o => o.id === orderId);
            if (!order) return;

            await DAL.orders.update(orderId, {
                paid_amount: order.grand_total,
                due_amount: 0,
                payment_status: 'paid',
            });

            addToast('Bill marked as paid', 'success');
            refetchOrders();
        } catch (error) {
            addToast('Failed to clear bill', 'error');
        }
    };

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Alt+S = Save
            if (e.altKey && e.key === 's') {
                e.preventDefault();
                if (activeTab === 'new' && cartItems.length > 0) {
                    handleCreateOrder(false);
                }
            }
            // F10 = Print
            if (e.key === 'F10') {
                e.preventDefault();
                if (activeTab === 'new' && cartItems.length > 0) {
                    handleCreateOrder(false);
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [activeTab, cartItems.length]);

    // Tab badges
    const unpaidCount = orders.filter((o: any) => o.due_amount > 0 && o.payment_status !== 'paid').length;

    return (
        <div className="h-full flex flex-col">
            {/* Tab Navigation */}
            <div className="flex items-center border-b border-surface-200 bg-white">
                <button
                    onClick={() => setActiveTab('new')}
                    className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'new'
                        ? 'border-surface-900 text-surface-900'
                        : 'border-transparent text-surface-500 hover:text-surface-700'
                        }`}
                >
                    <ShoppingCart className="h-4 w-4" />
                    New Bill
                </button>
                <button
                    onClick={() => setActiveTab('saved')}
                    className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'saved'
                        ? 'border-surface-900 text-surface-900'
                        : 'border-transparent text-surface-500 hover:text-surface-700'
                        }`}
                >
                    <FileText className="h-4 w-4" />
                    Saved Bills
                    {orders.length > 0 && (
                        <span className="ml-1 text-xs bg-surface-200 text-surface-600 px-2 py-0.5 rounded-full">
                            {orders.length}
                        </span>
                    )}
                </button>
                <button
                    onClick={() => setActiveTab('unpaid')}
                    className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'unpaid'
                        ? 'border-red-600 text-red-600'
                        : 'border-transparent text-surface-500 hover:text-surface-700'
                        }`}
                >
                    <AlertCircle className="h-4 w-4" />
                    Unpaid
                    {unpaidCount > 0 && (
                        <span className="ml-1 text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">
                            {unpaidCount}
                        </span>
                    )}
                </button>
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-hidden">
                {activeTab === 'new' && (
                    <div className="h-full flex">
                        {/* Left: 60% - Catalog & Search */}
                        <div className="w-[60%] overflow-y-auto p-4 space-y-4">
                            {/* Advanced Search */}
                            <AdvancedSearch
                                verticals={verticals}
                                brands={brands}
                                subcategories={subcategories}
                                onSearch={handleSearch}
                                isSearching={isSearching}
                                resultsCount={searchResults.length}
                            />

                            {/* Results or Catalog */}
                            {searchQuery || searchResults.length > 0 ? (
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-sm font-semibold text-surface-900">
                                            Search Results ({searchResults.length})
                                        </h3>
                                    </div>
                                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 gap-2.5">
                                        {searchResults.map((item) => (
                                            <ItemCard
                                                key={item.id}
                                                item={item}
                                                pricingMode={pricingMode}
                                                onAddToCart={addToCart}
                                            />
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <VerticalCatalog
                                    items={items}
                                    verticals={verticals}
                                    pricingMode={pricingMode}
                                    onAddToCart={addToCart}
                                />
                            )}
                        </div>

                        {/* Right: 40% - Bill Details Panel */}
                        <div className="w-[40%] border-l border-surface-200">
                            <BillDetailsPanel
                                prospects={prospects}
                                printFormat={printFormat}
                                onPrintFormatChange={setPrintFormat}
                                onSaveQuote={() => handleCreateOrder(true)}
                                onSaveAndPrint={() => handleCreateOrder(false)}
                            />
                        </div>
                    </div>
                )}

                {activeTab === 'saved' && (
                    <div className="h-full overflow-y-auto p-4">
                        <SavedBillsView
                            orders={orders as Order[]}
                            onOpenBill={handleOpenBill}
                            onDeleteBill={handleDeleteBill}
                            onShareBill={(order) => {
                                // TODO: Backend - Implement share functionality
                                addToast('Share feature coming soon', 'info');
                            }}
                            onDownloadBill={(order) => {
                                // TODO: Backend - Implement PDF download
                                addToast('Download feature coming soon', 'info');
                            }}
                            onBulkDownload={(ids) => {
                                // TODO: Backend - Implement bulk ZIP download
                                addToast('Bulk download coming soon', 'info');
                            }}
                            onBulkShare={(ids) => {
                                // TODO: Backend - Implement bulk share
                                addToast('Bulk share coming soon', 'info');
                            }}
                        />
                    </div>
                )}

                {activeTab === 'unpaid' && (
                    <div className="h-full overflow-y-auto p-4">
                        <UnpaidBillsView
                            orders={orders as Order[]}
                            onEditBill={handleOpenBill}
                            onClearBill={handleClearBill}
                            onUpdatePayment={handleUpdatePayment}
                        />
                    </div>
                )}
            </div>

            {/* Print Handler Overlay */}
            {showPrintHandler && printOrder && (
                <PrintHandler
                    order={printOrder as any}
                    items={cartItems}
                    onClose={() => {
                        setShowPrintHandler(false);
                        setPrintOrder(null);
                    }}
                />
            )}
        </div>
    );
}
