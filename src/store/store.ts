import { create } from 'zustand';
import type { Item, Prospect } from '@/db/dexie';

// ─── Cart Slice ─────────────────────────────────────────────────

export interface CartItem {
    item: Item;
    qty: number;
    unit_price: number;     // temporarily editable price for this bill
    discount: number;
}

interface CartSlice {
    cartItems: CartItem[];
    selectedProspect: Prospect | null;
    pricingMode: 'retail' | 'wholesale';    // Bulk (wholesale) / Lean (retail)
    taxRate: number;
    globalDiscount: number;

    addToCart: (item: Item) => void;
    removeFromCart: (itemId: number) => void;
    updateCartItemQty: (itemId: number, qty: number) => void;
    updateCartItemPrice: (itemId: number, price: number) => void;
    updateCartItemDiscount: (itemId: number, discount: number) => void;
    setSelectedProspect: (prospect: Prospect | null) => void;
    setPricingMode: (mode: 'retail' | 'wholesale') => void;
    setTaxRate: (rate: number) => void;
    setGlobalDiscount: (discount: number) => void;
    clearCart: () => void;

    getSubtotal: () => number;
    getTaxAmount: () => number;
    getGrandTotal: () => number;
}

// ─── UI Slice ───────────────────────────────────────────────────

interface UISlice {
    sidebarOpen: boolean;
    activeModal: string | null;
    toasts: Array<{ id: string; message: string; type: 'success' | 'error' | 'info' }>;
    activeBusiness: string;     // Current business name

    toggleSidebar: () => void;
    setSidebarOpen: (open: boolean) => void;
    openModal: (modalId: string) => void;
    closeModal: () => void;
    addToast: (message: string, type: 'success' | 'error' | 'info') => void;
    removeToast: (id: string) => void;
    setActiveBusiness: (name: string) => void;
}

// ─── Media Slice ────────────────────────────────────────────────

interface MediaSlice {
    ffmpegProgress: number;
    isProcessing: boolean;
    processingMessage: string;

    setFFmpegProgress: (progress: number) => void;
    setIsProcessing: (processing: boolean) => void;
    setProcessingMessage: (message: string) => void;
}

// ─── Combined Store ─────────────────────────────────────────────

export type AppStore = CartSlice & UISlice & MediaSlice;

export const useAppStore = create<AppStore>((set, get) => ({

    // ── Cart State ──────────────────────────────────────────────
    cartItems: [],
    selectedProspect: null,
    pricingMode: 'retail',
    taxRate: 0,
    globalDiscount: 0,

    addToCart: (item) =>
        set((state) => {
            const existing = state.cartItems.find((i) => i.item.id === item.id);
            if (existing) {
                return {
                    cartItems: state.cartItems.map((i) =>
                        i.item.id === item.id ? { ...i, qty: i.qty + 1 } : i
                    ),
                };
            }
            // Default price: container price based on pricing mode
            const defaultPrice = state.pricingMode === 'wholesale'
                ? item.wholesale_price_container
                : item.retail_price_container;
            return {
                cartItems: [
                    ...state.cartItems,
                    { item, qty: 1, unit_price: defaultPrice || 0, discount: 0 },
                ],
            };
        }),

    removeFromCart: (itemId) =>
        set((state) => ({
            cartItems: state.cartItems.filter((i) => i.item.id !== itemId),
        })),

    updateCartItemQty: (itemId, qty) =>
        set((state) => ({
            cartItems: state.cartItems.map((i) =>
                i.item.id === itemId ? { ...i, qty: Math.max(1, qty) } : i
            ),
        })),

    updateCartItemPrice: (itemId, price) =>
        set((state) => ({
            cartItems: state.cartItems.map((i) =>
                i.item.id === itemId ? { ...i, unit_price: Math.max(0, price) } : i
            ),
        })),

    updateCartItemDiscount: (itemId, discount) =>
        set((state) => ({
            cartItems: state.cartItems.map((i) =>
                i.item.id === itemId ? { ...i, discount: Math.max(0, discount) } : i
            ),
        })),

    setSelectedProspect: (prospect) => set({ selectedProspect: prospect }),
    setPricingMode: (mode) =>
        set((state) => {
            // Update all cart item prices when mode changes — use container prices
            const cartItems = state.cartItems.map((ci) => ({
                ...ci,
                unit_price: mode === 'wholesale'
                    ? ci.item.wholesale_price_container
                    : ci.item.retail_price_container,
            }));
            return { pricingMode: mode, cartItems };
        }),
    setTaxRate: (rate) => set({ taxRate: Math.max(0, rate) }),
    setGlobalDiscount: (discount) => set({ globalDiscount: Math.max(0, discount) }),
    clearCart: () => set({ cartItems: [], selectedProspect: null, taxRate: 0, globalDiscount: 0 }),

    getSubtotal: () => {
        const { cartItems } = get();
        return cartItems.reduce((sum, ci) => {
            const lineTotal = ci.qty * ci.unit_price - ci.discount;
            return sum + Math.max(0, lineTotal);
        }, 0);
    },

    getTaxAmount: () => {
        const { taxRate } = get();
        const subtotal = get().getSubtotal();
        return (subtotal * taxRate) / 100;
    },

    getGrandTotal: () => {
        const subtotal = get().getSubtotal();
        const tax = get().getTaxAmount();
        const { globalDiscount } = get();
        return Math.max(0, subtotal + tax - globalDiscount);
    },

    // ── UI State ────────────────────────────────────────────────
    sidebarOpen: false,
    activeModal: null,
    toasts: [],
    activeBusiness: 'R.S. Enterprises',

    toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
    setSidebarOpen: (open) => set({ sidebarOpen: open }),
    openModal: (modalId) => set({ activeModal: modalId }),
    closeModal: () => set({ activeModal: null }),

    addToast: (message, type) =>
        set((state) => {
            const id = Date.now().toString(36) + Math.random().toString(36).substr(2);
            setTimeout(() => get().removeToast(id), 4000);
            return { toasts: [...state.toasts, { id, message, type }] };
        }),
    removeToast: (id) =>
        set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
    setActiveBusiness: (name) => set({ activeBusiness: name }),

    // ── Media State ─────────────────────────────────────────────
    ffmpegProgress: 0,
    isProcessing: false,
    processingMessage: '',

    setFFmpegProgress: (progress) => set({ ffmpegProgress: progress }),
    setIsProcessing: (processing) => set({ isProcessing: processing }),
    setProcessingMessage: (message) => set({ processingMessage: message }),
}));
