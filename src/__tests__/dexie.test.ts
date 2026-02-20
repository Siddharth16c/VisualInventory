/// <reference types="vitest" />
import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import Dexie from 'dexie';

// Use a test database class that mirrors the new schema
class TestDB extends Dexie {
    items: any;
    products: any;
    orders: any;
    order_items: any;
    prospects: any;
    costs: any;
    packing_units: any;
    bills: any;

    constructor() {
        super('TestDB_Dexie');
        this.version(2).stores({
            items: '++id, item_name, item_size, category, product_id, brand_id, vertical_id, packing_unit_id, createdAt',
            products: '++id, &name, category, vertical_id',
            orders: '++id, prospect_id, order_date, status, payment_status, due_amount, createdAt',
            order_items: '++id, order_id, item_id',
            prospects: '++id, prospectname, area_town, contact, business_type, route_id',
            costs: '++id, cost_type, business_type, cost_factor_id, order_id, date',
            packing_units: '++id, unit_name, multiplier',
            bills: '++id, order_id, bill_number, business_name, createdAt',
        });
    }
}

describe('Dexie Database', () => {
    let testDb: TestDB;

    beforeEach(async () => {
        testDb = new TestDB();
        await testDb.open();
        await testDb.items.clear();
        await testDb.products.clear();
        await testDb.orders.clear();
        await testDb.order_items.clear();
        await testDb.prospects.clear();
        await testDb.costs.clear();
        await testDb.packing_units.clear();
        await testDb.bills.clear();
    });

    it('should create and read an item', async () => {
        const id = await testDb.items.add({
            item_name: 'Apsara Long 172pg',
            item_size: '172 pages',
            category: 'Stationery',
            mrp: 50,
            retail_price_piece: 42,
            retail_price_pack: 504,
            wholesale_price_piece: 38,
            wholesale_price_pack: 456,
            stock_qty: 100,
            metadata: { lead_grade: 'HB' },
            createdAt: new Date().toISOString(),
        });
        expect(id).toBeDefined();

        const item = await testDb.items.get(id);
        expect(item.item_name).toBe('Apsara Long 172pg');
        expect(item.item_size).toBe('172 pages');
        expect(item.retail_price_piece).toBe(42);
        expect(item.wholesale_price_piece).toBe(38);
        expect(item.metadata.lead_grade).toBe('HB');
    });

    it('should update an item', async () => {
        const id = await testDb.items.add({
            item_name: 'Pilot Pen',
            item_size: 'standard',
            category: 'Stationery',
            mrp: 20,
            retail_price_piece: 18,
            retail_price_pack: 0,
            wholesale_price_piece: 15,
            wholesale_price_pack: 0,
            stock_qty: 50,
            createdAt: new Date().toISOString(),
        });

        await testDb.items.update(id, { stock_qty: 45 });
        const updated = await testDb.items.get(id);
        expect(updated.stock_qty).toBe(45);
    });

    it('should delete an item', async () => {
        const id = await testDb.items.add({
            item_name: 'Natraj Eraser',
            item_size: 'small',
            category: 'Stationery',
            mrp: 5,
            retail_price_piece: 4,
            retail_price_pack: 0,
            wholesale_price_piece: 3,
            wholesale_price_pack: 0,
            stock_qty: 200,
            createdAt: new Date().toISOString(),
        });

        await testDb.items.delete(id);
        const deleted = await testDb.items.get(id);
        expect(deleted).toBeUndefined();
    });

    it('should create an order with line items and bill', async () => {
        const orderId = await testDb.orders.add({
            prospect_id: 1,
            prospect_name: 'Test Customer',
            order_date: new Date().toISOString(),
            pricing_mode: 'retail',
            status: 'pending',
            subtotal: 100,
            tax_amount: 5,
            discount_amount: 0,
            grand_total: 105,
            due_amount: 105,
            paid_amount: 0,
            payment_status: 'unpaid',
            createdAt: new Date().toISOString(),
        });

        await testDb.order_items.bulkAdd([
            { order_id: orderId, item_id: 1, item_name: 'Item A', qty: 2, unit_price: 25, discount: 0, total: 50 },
            { order_id: orderId, item_id: 2, item_name: 'Item B', qty: 1, unit_price: 50, discount: 0, total: 50 },
        ]);

        // Also create a bill
        await testDb.bills.add({
            order_id: orderId,
            bill_number: `INV-2026-${String(orderId).padStart(4, '0')}`,
            business_name: 'R.S. Enterprises',
            print_format: 'a4',
            createdAt: new Date().toISOString(),
        });

        const items = await testDb.order_items.where('order_id').equals(orderId).toArray();
        expect(items.length).toBe(2);
        expect(items.reduce((s: number, i: any) => s + i.total, 0)).toBe(100);

        const bills = await testDb.bills.where('order_id').equals(orderId).toArray();
        expect(bills.length).toBe(1);
        expect(bills[0].bill_number).toContain('INV-');
    });

    it('should query items by category', async () => {
        await testDb.items.bulkAdd([
            { item_name: 'A', item_size: '', category: 'Stationery', mrp: 10, retail_price_piece: 8, retail_price_pack: 0, wholesale_price_piece: 7, wholesale_price_pack: 0, stock_qty: 10, createdAt: new Date().toISOString() },
            { item_name: 'B', item_size: '', category: 'FMCG', mrp: 20, retail_price_piece: 18, retail_price_pack: 0, wholesale_price_piece: 15, wholesale_price_pack: 0, stock_qty: 20, createdAt: new Date().toISOString() },
            { item_name: 'C', item_size: '', category: 'Stationery', mrp: 15, retail_price_piece: 12, retail_price_pack: 0, wholesale_price_piece: 10, wholesale_price_pack: 0, stock_qty: 15, createdAt: new Date().toISOString() },
        ]);

        const stationery = await testDb.items.where('category').equals('Stationery').toArray();
        expect(stationery.length).toBe(2);
    });

    it('should store packing units and link to items', async () => {
        const puId = await testDb.packing_units.add({ unit_name: 'dozen', multiplier: 12 });
        const itemId = await testDb.items.add({
            item_name: 'Test Item',
            item_size: '',
            category: 'Stationery',
            packing_unit_id: puId,
            mrp: 100,
            retail_price_piece: 80,
            retail_price_pack: 960,
            wholesale_price_piece: 70,
            wholesale_price_pack: 840,
            stock_qty: 50,
            createdAt: new Date().toISOString(),
        });

        const item = await testDb.items.get(itemId);
        expect(item.packing_unit_id).toBe(puId);

        const pu = await testDb.packing_units.get(puId);
        expect(pu.multiplier).toBe(12);
    });
});
