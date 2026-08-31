/**
 * Billing Page - Redesigned with 3-column layout
 * Left sidebar: Verticals with icons
 * Center: Items grid with thumbnails
 * Right: Billing details panel
 */

import { useState, useCallback, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DAL } from '@/db/dal';
import { useAppStore } from '@/store/store';
import { useDataStore } from '@/store/dataStore';
import type { Item, Prospect, Vertical, Brand, Subcategory, Order } from '@/db/types';

// Components
import VerticalSidebar from '@/components/billing/VerticalSidebar';
import ItemsGridView from '@/components/billing/ItemsGridView';
import BillDetailsPanel from '@/components/billing/BillDetailsPanel';
import SavedBillsView from '@/components/billing/SavedBillsView';
import UnpaidBillsView from '@/components/billing/UnpaidBillsView';
import PrintHandler from '@/components/billing/PrintHandler';
import AddItemModal from '@/components/billing/AddItemModal';

// Icons
import { ShoppingCart, FileText, AlertCircle, Plus } from 'lucide-react';

type Tab = 'new' | 'saved' | 'unpaid' | 'cart';

export default function Billing() {
  const [activeTab, setActiveTab] = useState<Tab>('new');
  const [printFormat, setPrintFormat] = useState<'a4' | 'thermal' | 'receipt'>('a4');
  const [showPrintHandler, setShowPrintHandler] = useState(false);
  const [printOrder, setPrintOrder] = useState<Order | null>(null);
  const [selectedVerticalId, setSelectedVerticalId] = useState<number | null>(null);
  
  const [showAddItemModal, setShowAddItemModal] = useState(false);

  // Store
  const cartItems = useAppStore((s) => s.cartItems);
  const selectedProspect = useAppStore((s) => s.selectedProspect);
  const pricingMode = useAppStore((s) => s.pricingMode);
  const addToCart = useAppStore((s) => s.addToCart);
  const clearCart = useAppStore((s) => s.clearCart);
  const addToast = useAppStore((s) => s.addToast);
  const getSubtotal = useAppStore((s) => s.getSubtotal);
  const getTaxAmount = useAppStore((s) => s.getTaxAmount);
  const getGrandTotal = useAppStore((s) => s.getGrandTotal);
  const paidAmount = useAppStore((s) => s.taxRate);
  const setPaidAmount = useAppStore((s) => s.setTaxRate);

  // Data fetching - heavy read tables come from Zustand store (cached 30m)
  const items = useDataStore((s) => s.items);
  const verticals = useDataStore((s) => s.verticals);
  
  // ensure store has loaded data (non-blocking)
  useEffect(() => {
    useDataStore.getState().loadData();
  }, []);

  const { data: prospects = [] } = useQuery({
    queryKey: ['prospects'],
    queryFn: () => DAL.prospects.getAll(),
  });

  const { data: orders = [], refetch: refetchOrders } = useQuery({
    queryKey: ['orders'],
    queryFn: () => DAL.sales_orders.getAll(),
  });

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
    const credit = Math.max(0, grandTotal - paid);
    const paymentStatus: 'unpaid' | 'partial' | 'paid' =
      paid >= grandTotal ? 'paid' : paid > 0 ? 'partial' : 'unpaid';

    const order = {
      firm_id: 1, // Assuming single firm for now
      prospect_id: selectedProspect?.id ?? 0,
      // prospect_name: selectedProspect?.prospectname || 'Walk-in Customer',
      due_date: new Date().toISOString(),
      // pricing_mode: f,
      // status: isQuote ? 'quote' : 'pending',
      // subtotal,
      // tax_amount: taxAmt,
      // discount_amount: 0,
      grand_total: grandTotal,
      paid_amount: paid,
      due_amount: credit,
      // credit_amount: credit,
      // payment_status: paymentStatus,
      // is_paid: paymentStatus === 'paid',
      notes: '',
      created_at: new Date().toISOString(),
    } as Parameters<typeof DAL.sales_orders.add>[0];

    try {
      const savedOrder: any = await DAL.sales_orders.add(order);
      const orderId = savedOrder.id;

      for (const ci of cartItems) {
        await DAL.sales_order_items.add({
          sales_order_id: orderId,
          item_id: ci.item.id!,
          //  item_name_SKU: ci.item.item_name,
          qty: ci.qty,
          unit_price: ci.unit_price,
          // discount: ci.discount,
          // total: ci.qty * ci.unit_price - ci.discount,
        });
      }

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
          } catch { }
        }

        await DAL.bills.add({
          order_id: orderId,
          bill_number: `INV-${new Date().getFullYear()}-${String(orderId).padStart(4, '0')}`,
          // business_name: 'R.S. Enterprises',
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

  const handleOpenBill = async (order: Order) => {
    setPrintOrder(order);
    setShowPrintHandler(true);
  };

  const handleDeleteBill = async (orderId: number) => {
    if (!confirm('Delete this bill? This cannot be undone.')) return;
    try {
      await DAL.sales_orders.delete(orderId);
      addToast('Bill deleted', 'success');
      refetchOrders();
    } catch (error) {
      addToast('Failed to delete bill', 'error');
    }
  };

  const handleUpdatePayment = async (orderId: number, newPaidAmount: number) => {
    try {
      const order = orders.find(o => o.id === orderId);
      if (!order) return;

      const newDue = Math.max(0, order.grand_total - newPaidAmount);
      const newStatus: 'unpaid' | 'partial' | 'paid' =
        newPaidAmount >= order.grand_total ? 'paid' : newPaidAmount > 0 ? 'partial' : 'unpaid';

      await DAL.sales_orders.update(orderId, {
        paid_amount: newPaidAmount,
        due_amount: newDue,
        credit_amount: newDue,
        payment_status: newStatus,
        is_paid: newStatus === 'paid',
      });

      addToast('Payment updated', 'success');
      refetchOrders();
    } catch (error) {
      addToast('Failed to update payment', 'error');
    }
  };

  const handleClearBill = async (orderId: number) => {
    try {
      const order = orders.find(o => o.id === orderId);
      if (!order) return;

      await DAL.sales_orders.update(orderId, {
        paid_amount: order.grand_total,
        due_amount: 0,
        credit_amount: 0,
        payment_status: 'paid',
        is_paid: true,
      });

      addToast('Bill marked as paid', 'success');
      refetchOrders();
    } catch (error) {
      addToast('Failed to clear bill', 'error');
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && e.key === 's') {
        e.preventDefault();
        if (activeTab === 'new' && cartItems.length > 0) {
          handleCreateOrder(false);
        }
      }
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

  const unpaidCount = orders.filter((o: any) => o.due_amount > 0 && o.payment_status !== 'paid').length;

  return (
    <div className="h-full flex flex-col">
      {/* Tabs */}
      <div className="flex items-center border-b border-surface-200 bg-white overflow-x-auto">
        <button
          onClick={() => setActiveTab('new')}
          className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'new'
              ? 'border-surface-900 text-surface-900'
              : 'border-transparent text-surface-500 hover:text-surface-700'
          }`}
        >
          <ShoppingCart className="h-4 w-4" />
          <span className="hidden sm:inline">New Bill</span>
          <span className="sm:hidden">New</span>
        </button>
        <button
          onClick={() => setActiveTab('saved')}
          className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'saved'
              ? 'border-surface-900 text-surface-900'
              : 'border-transparent text-surface-500 hover:text-surface-700'
          }`}
        >
          <FileText className="h-4 w-4" />
          <span className="hidden sm:inline">Saved Bills</span>
          <span className="sm:hidden">Saved</span>
          {orders.length > 0 && (
            <span className="ml-1 text-xs bg-surface-200 text-surface-600 px-1.5 py-0.5 rounded-full">
              {orders.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('unpaid')}
          className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'unpaid'
              ? 'border-red-600 text-red-600'
              : 'border-transparent text-surface-500 hover:text-surface-700'
          }`}
        >
          <AlertCircle className="h-4 w-4" />
          <span className="hidden sm:inline">Unpaid</span>
          <span className="sm:hidden">Due</span>
          {unpaidCount > 0 && (
            <span className="ml-1 text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full">
              {unpaidCount}
            </span>
          )}``
        </button>
        <button
          onClick={() => setActiveTab('cart')}
          className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'cart'
              ? 'border-surface-900 text-surface-900'
              : 'border-transparent text-surface-500 hover:text-surface-700'
          }`}
        >
          <ShoppingCart className="h-4 w-4" />
          <span className="hidden sm:inline">Cart</span>
          <span className="sm:hidden">Cart</span>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'new' && (
          <div className="h-full flex">
            {/* Left Sidebar: Verticals */}
            <VerticalSidebar
              verticals={verticals}
              items={items}
              selectedVerticalId={selectedVerticalId}
              onSelectVertical={setSelectedVerticalId}
              onAddItem={() => setShowAddItemModal(true)}
              pricingMode={pricingMode}
            />

            {/* Center: Items Grid */}
            <div className="flex-1 overflow-y-auto p-4">
              <ItemsGridView
                items={items}
                verticals={verticals}
                selectedVerticalId={selectedVerticalId}
                pricingMode={pricingMode}
                onAddToCart={addToCart}
                onAddItem={() => setShowAddItemModal(true)}
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
              onShareBill={(order) => addToast('Share feature coming soon', 'info')}
              onDownloadBill={(order) => addToast('Download feature coming soon', 'info')}
              onBulkDownload={(ids) => addToast('Bulk download coming soon', 'info')}
              onBulkShare={(ids) => addToast('Bulk share coming soon', 'info')}
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
        
      {activeTab === 'cart' && (
        <div className="h-full flex">
              <BillDetailsPanel
                prospects={prospects}
                printFormat={printFormat}
                onPrintFormatChange={setPrintFormat}
                onSaveQuote={() => handleCreateOrder(true)}
                onSaveAndPrint={() => handleCreateOrder(false)}
              />
            </div>
        )}
      </div>


      {/* Print Handler */}
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

      {/* Add Item Modal */}
      {showAddItemModal && (
        <AddItemModal
          isOpen={showAddItemModal}
          onClose={() => setShowAddItemModal(false)}
          onCreated={(item) => {
            setShowAddItemModal(false);
            refetchOrders();
            addToast(`Item "${item.item_name}" created`, 'success');
          }}
          preselectedVerticalId={selectedVerticalId || undefined}
        />
      )}
    </div>
  );
}