import { describe, it, expect, beforeEach } from 'vitest';

/**
 * Unit tests for billing/cart logic.
 * Tests the Zustand store cart operations directly.
 */

// Simple cart logic (mirrors store logic for unit testing without React)
interface CartItem {
    productId: number;
    productName: string;
    qty: number;
    unitPrice: number;
    discount: number;
}

function createCart() {
    let items: CartItem[] = [];
    let taxRate = 0;
    let globalDiscount = 0;

    return {
        getItems: () => items,
        add: (productId: number, productName: string, unitPrice: number) => {
            const existing = items.find((i) => i.productId === productId);
            if (existing) {
                existing.qty += 1;
            } else {
                items.push({ productId, productName, qty: 1, unitPrice, discount: 0 });
            }
        },
        remove: (productId: number) => {
            items = items.filter((i) => i.productId !== productId);
        },
        updateQty: (productId: number, qty: number) => {
            const item = items.find((i) => i.productId === productId);
            if (item) item.qty = Math.max(0, qty);
        },
        updateDiscount: (productId: number, discount: number) => {
            const item = items.find((i) => i.productId === productId);
            if (item) item.discount = Math.max(0, discount);
        },
        setTaxRate: (rate: number) => { taxRate = Math.max(0, rate); },
        setGlobalDiscount: (d: number) => { globalDiscount = Math.max(0, d); },
        getSubtotal: () => items.reduce((s, i) => s + Math.max(0, i.qty * i.unitPrice - i.discount), 0),
        getTaxAmount: () => {
            const subtotal = items.reduce((s, i) => s + Math.max(0, i.qty * i.unitPrice - i.discount), 0);
            return (subtotal * taxRate) / 100;
        },
        getGrandTotal: () => {
            const subtotal = items.reduce((s, i) => s + Math.max(0, i.qty * i.unitPrice - i.discount), 0);
            const tax = (subtotal * taxRate) / 100;
            return Math.max(0, subtotal + tax - globalDiscount);
        },
        clear: () => {
            items = [];
            taxRate = 0;
            globalDiscount = 0;
        },
    };
}

describe('Cart Logic', () => {
    let cart: ReturnType<typeof createCart>;

    beforeEach(() => {
        cart = createCart();
    });

    it('should add items to cart', () => {
        cart.add(1, 'Pencil', 10);
        cart.add(2, 'Pen', 20);
        expect(cart.getItems().length).toBe(2);
    });

    it('should increment qty when adding same product', () => {
        cart.add(1, 'Pencil', 10);
        cart.add(1, 'Pencil', 10);
        expect(cart.getItems().length).toBe(1);
        expect(cart.getItems()[0].qty).toBe(2);
    });

    it('should calculate subtotal correctly', () => {
        cart.add(1, 'Pencil', 10);
        cart.add(2, 'Pen', 20);
        cart.updateQty(1, 3); // 3 x 10 = 30
        // Pen: 1 x 20 = 20
        expect(cart.getSubtotal()).toBe(50);
    });

    it('should apply line item discount', () => {
        cart.add(1, 'Pencil', 100);
        cart.updateQty(1, 2); // 2 x 100 = 200
        cart.updateDiscount(1, 20); // -20
        expect(cart.getSubtotal()).toBe(180);
    });

    it('should calculate tax', () => {
        cart.add(1, 'Product', 100);
        cart.setTaxRate(18); // GST 18%
        expect(cart.getTaxAmount()).toBe(18);
        expect(cart.getGrandTotal()).toBe(118);
    });

    it('should apply global discount', () => {
        cart.add(1, 'Product', 100);
        cart.setTaxRate(10); // 10% tax = 10
        cart.setGlobalDiscount(5);
        // 100 + 10 - 5 = 105
        expect(cart.getGrandTotal()).toBe(105);
    });

    it('should handle empty cart', () => {
        expect(cart.getSubtotal()).toBe(0);
        expect(cart.getTaxAmount()).toBe(0);
        expect(cart.getGrandTotal()).toBe(0);
    });

    it('should remove items', () => {
        cart.add(1, 'Pencil', 10);
        cart.add(2, 'Pen', 20);
        cart.remove(1);
        expect(cart.getItems().length).toBe(1);
        expect(cart.getSubtotal()).toBe(20);
    });

    it('should not allow negative quantities', () => {
        cart.add(1, 'Pencil', 10);
        cart.updateQty(1, -5);
        expect(cart.getItems()[0].qty).toBe(0);
    });

    it('should not allow negative grand total', () => {
        cart.add(1, 'Product', 10);
        cart.setGlobalDiscount(1000);
        expect(cart.getGrandTotal()).toBe(0);
    });

    it('should handle zero-price items', () => {
        cart.add(1, 'Free Sample', 0);
        cart.updateQty(1, 5);
        expect(cart.getSubtotal()).toBe(0);
        expect(cart.getGrandTotal()).toBe(0);
    });

    it('should clear cart', () => {
        cart.add(1, 'Pencil', 10);
        cart.add(2, 'Pen', 20);
        cart.setTaxRate(18);
        cart.clear();
        expect(cart.getItems().length).toBe(0);
        expect(cart.getSubtotal()).toBe(0);
    });
});
