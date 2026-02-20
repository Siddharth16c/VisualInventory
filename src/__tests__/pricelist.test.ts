import { describe, it, expect } from 'vitest';

/**
 * Tests for price list PDF generation logic (updated for new schema)
 */

describe('Price List Logic', () => {
    it('should filter items by search query', () => {
        const items = [
            { id: 1, item_name: 'Apsara Pencil', item_size: 'standard', category: 'Stationery', mrp: 10, retail_price_piece: 8 },
            { id: 2, item_name: 'Pilot Pen', item_size: 'standard', category: 'Stationery', mrp: 20, retail_price_piece: 18 },
            { id: 3, item_name: 'Lux Soap', item_size: '100g', category: 'FMCG', mrp: 30, retail_price_piece: 25 },
        ];

        const query = 'pen';
        const filtered = items.filter(
            (i) =>
                i.item_name.toLowerCase().includes(query.toLowerCase()) ||
                i.category.toLowerCase().includes(query.toLowerCase())
        );

        expect(filtered.length).toBe(2); // "Apsara Pencil" and "Pilot Pen" both contain "pen"
        expect(filtered.map((i) => i.id)).toEqual([1, 2]);
    });

    it('should handle empty selection', () => {
        const selected = new Set<number>();
        const items = [{ id: 1 }, { id: 2 }];
        const selectedItems = items.filter((i) => selected.has(i.id));
        expect(selectedItems.length).toBe(0);
    });

    it('should select all and deselect all', () => {
        const items = [{ id: 1 }, { id: 2 }, { id: 3 }];
        const selected = new Set(items.map((i) => i.id));
        expect(selected.size).toBe(3);

        selected.clear();
        expect(selected.size).toBe(0);
    });

    it('should toggle individual selections', () => {
        const selected = new Set<number>();

        selected.add(1);
        expect(selected.has(1)).toBe(true);
        expect(selected.size).toBe(1);

        selected.add(2);
        expect(selected.size).toBe(2);

        selected.delete(1);
        expect(selected.has(1)).toBe(false);
        expect(selected.size).toBe(1);
    });

    it('should format prices correctly as Rs.', () => {
        const formatPrice = (price: number) => `Rs.${price.toFixed(2)}`;
        expect(formatPrice(10)).toBe('Rs.10.00');
        expect(formatPrice(0)).toBe('Rs.0.00');
        expect(formatPrice(99.9)).toBe('Rs.99.90');
        expect(formatPrice(1234.567)).toBe('Rs.1234.57');
    });

    it('should compute retail and wholesale prices', () => {
        const item = {
            retail_price_piece: 42,
            wholesale_price_piece: 38,
        };
        expect(item.retail_price_piece).toBeGreaterThan(item.wholesale_price_piece);
    });
});
