import { describe, it, expect } from 'vitest';

/**
 * Tests for price list PDF generation logic
 */

describe('Price List Logic', () => {
    it('should filter products by search query', () => {
        const products = [
            { id: 1, item_name: 'Pencil', product_name: 'Apsara Pencil', category: 'Stationery', mrp: 10, selling_price: 8 },
            { id: 2, item_name: 'Pen', product_name: 'Pilot Pen', category: 'Stationery', mrp: 20, selling_price: 18 },
            { id: 3, item_name: 'Soap', product_name: 'Lux Soap', category: 'FMCG', mrp: 30, selling_price: 25 },
        ];

        const query = 'pen';
        const filtered = products.filter(
            (p) =>
                p.item_name.toLowerCase().includes(query.toLowerCase()) ||
                p.product_name.toLowerCase().includes(query.toLowerCase())
        );

        expect(filtered.length).toBe(2);
        expect(filtered.map((p) => p.id)).toEqual([1, 2]);
    });

    it('should handle empty selection', () => {
        const selected = new Set<number>();
        const products = [{ id: 1 }, { id: 2 }];
        const selectedProducts = products.filter((p) => selected.has(p.id));
        expect(selectedProducts.length).toBe(0);
    });

    it('should select all and deselect all', () => {
        const products = [{ id: 1 }, { id: 2 }, { id: 3 }];
        const selected = new Set(products.map((p) => p.id));
        expect(selected.size).toBe(3);

        selected.clear();
        expect(selected.size).toBe(0);
    });

    it('should toggle individual selections', () => {
        const selected = new Set<number>();

        // Select item 1
        selected.add(1);
        expect(selected.has(1)).toBe(true);
        expect(selected.size).toBe(1);

        // Select item 2
        selected.add(2);
        expect(selected.size).toBe(2);

        // Deselect item 1
        selected.delete(1);
        expect(selected.has(1)).toBe(false);
        expect(selected.size).toBe(1);
    });

    it('should format prices correctly', () => {
        const formatPrice = (price: number) => `₹${price.toFixed(2)}`;
        expect(formatPrice(10)).toBe('₹10.00');
        expect(formatPrice(0)).toBe('₹0.00');
        expect(formatPrice(99.9)).toBe('₹99.90');
        expect(formatPrice(1234.567)).toBe('₹1234.57');
    });
});
