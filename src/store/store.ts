import { create } from 'zustand';
import type { Product, Prospect } from '@/db/dexie';

// ─── Cart Slice ─────────────────────────────────────────────────

export interface CartItem {
    product: Product;
    qty: number;
    unit_price: number;
    discount: number;
}

interface CartSlice {
    cartItems: CartItem[];
    selectedProspect: Prospect | null;
    taxRate: number;
    globalDiscount: number;

    addToCart: (product: Product) => void;
    removeFromCart: (productId: number) => void;
    updateCartItemQty: (productId: number, qty: number) => void;
    updateCartItemPrice: (productId: number, price: number) => void;
    updateCartItemDiscount: (productId: number, discount: number) => void;
    setSelectedProspect: (prospect: Prospect | null) => void;
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

    toggleSidebar: () => void;
    setSidebarOpen: (open: boolean) => void;
    openModal: (modalId: string) => void;
    closeModal: () => void;
    addToast: (message: string, type: 'success' | 'error' | 'info') => void;
    removeToast: (id: string) => void;
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
    taxRate: 0,
    globalDiscount: 0,

    addToCart: (product) =>
        set((state) => {
            const existing = state.cartItems.find((i) => i.product.id === product.id);
            if (existing) {
                return {
                    cartItems: state.cartItems.map((i) =>
                        i.product.id === product.id ? { ...i, qty: i.qty + 1 } : i
                    ),
                };
            }
            return {
                cartItems: [
                    ...state.cartItems,
                    { product, qty: 1, unit_price: product.selling_price, discount: 0 },
                ],
            };
        }),

    removeFromCart: (productId) =>
        set((state) => ({
            cartItems: state.cartItems.filter((i) => i.product.id !== productId),
        })),

    updateCartItemQty: (productId, qty) =>
        set((state) => ({
            cartItems: state.cartItems.map((i) =>
                i.product.id === productId ? { ...i, qty: Math.max(0, qty) } : i
            ),
        })),

    updateCartItemPrice: (productId, price) =>
        set((state) => ({
            cartItems: state.cartItems.map((i) =>
                i.product.id === productId ? { ...i, unit_price: Math.max(0, price) } : i
            ),
        })),

    updateCartItemDiscount: (productId, discount) =>
        set((state) => ({
            cartItems: state.cartItems.map((i) =>
                i.product.id === productId ? { ...i, discount: Math.max(0, discount) } : i
            ),
        })),

    setSelectedProspect: (prospect) => set({ selectedProspect: prospect }),
    setTaxRate: (rate) => set({ taxRate: Math.max(0, rate) }),
    setGlobalDiscount: (discount) => set({ globalDiscount: Math.max(0, discount) }),
    clearCart: () => set({ cartItems: [], selectedProspect: null, taxRate: 0, globalDiscount: 0 }),

    getSubtotal: () => {
        const { cartItems } = get();
        return cartItems.reduce((sum, item) => {
            const lineTotal = item.qty * item.unit_price - item.discount;
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

    // ── Media State ─────────────────────────────────────────────
    ffmpegProgress: 0,
    isProcessing: false,
    processingMessage: '',

    setFFmpegProgress: (progress) => set({ ffmpegProgress: progress }),
    setIsProcessing: (processing) => set({ isProcessing: processing }),
    setProcessingMessage: (message) => set({ processingMessage: message }),
}));
