/// <reference types="vitest" />
import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import Dexie from 'dexie';

// Use a test database name to avoid conflicts
class TestDB extends Dexie {
    products: any;
    orders: any;
    order_items: any;
    prospects: any;
    costs: any;

    constructor() {
        super('TestDB_Dexie');
        this.version(1).stores({
            products: '++id, item_name, category, product_name, type, brand_id, vertical_id, createdAt',
            orders: '++id, prospect_id, order_date, status, due_amount, createdAt',
            order_items: '++id, order_id, product_id',
            prospects: '++id, prospectname, area_town, contact, business_type, route_id',
            costs: '++id, cost_type, business_type, cost_factor_id, order_id, date',
        });
    }
}

describe('Dexie Database', () => {
    let testDb: TestDB;

    beforeEach(async () => {
        testDb = new TestDB();
        await testDb.open();
        // Clear all tables
        await testDb.products.clear();
        await testDb.orders.clear();
        await testDb.order_items.clear();
        await testDb.prospects.clear();
        await testDb.costs.clear();
    });

    it('should create and read a product', async () => {
        const id = await testDb.products.add({
            item_name: 'Pencil',
            product_name: 'Apsara Pencil',
            category: 'Stationery',
            type: 'writing',
            mrp: 10,
            selling_price: 8,
            unit: 'pcs',
            stock_qty: 100,
            metadata: { lead_grade: 'HB' },
            createdAt: new Date().toISOString(),
        });
        expect(id).toBeDefined();

        const product = await testDb.products.get(id);
        expect(product.item_name).toBe('Pencil');
        expect(product.metadata.lead_grade).toBe('HB');
    });

    it('should update a product', async () => {
        const id = await testDb.products.add({
            item_name: 'Pen',
            product_name: 'Pilot Pen',
            category: 'Stationery',
            type: 'writing',
            mrp: 20,
            selling_price: 18,
            unit: 'pcs',
            stock_qty: 50,
            createdAt: new Date().toISOString(),
        });

        await testDb.products.update(id, { stock_qty: 45 });
        const updated = await testDb.products.get(id);
        expect(updated.stock_qty).toBe(45);
    });

    it('should delete a product', async () => {
        const id = await testDb.products.add({
            item_name: 'Eraser',
            product_name: 'Natraj Eraser',
            category: 'Stationery',
            type: 'accessory',
            mrp: 5,
            selling_price: 4,
            unit: 'pcs',
            stock_qty: 200,
            createdAt: new Date().toISOString(),
        });

        await testDb.products.delete(id);
        const deleted = await testDb.products.get(id);
        expect(deleted).toBeUndefined();
    });

    it('should create an order with line items', async () => {
        const orderId = await testDb.orders.add({
            prospect_id: 1,
            prospect_name: 'Test Customer',
            order_date: new Date().toISOString(),
            status: 'pending',
            subtotal: 100,
            tax_amount: 5,
            discount_amount: 0,
            grand_total: 105,
            due_amount: 105,
            paid_amount: 0,
            createdAt: new Date().toISOString(),
        });

        await testDb.order_items.bulkAdd([
            { order_id: orderId, product_id: 1, product_name: 'Item A', qty: 2, unit_price: 25, discount: 0, total: 50 },
            { order_id: orderId, product_id: 2, product_name: 'Item B', qty: 1, unit_price: 50, discount: 0, total: 50 },
        ]);

        const items = await testDb.order_items.where('order_id').equals(orderId).toArray();
        expect(items.length).toBe(2);
        expect(items.reduce((s: number, i: any) => s + i.total, 0)).toBe(100);
    });

    it('should query products by category', async () => {
        await testDb.products.bulkAdd([
            { item_name: 'A', product_name: 'A', category: 'Stationery', type: 'a', mrp: 10, selling_price: 8, unit: 'pcs', stock_qty: 10, createdAt: new Date().toISOString() },
            { item_name: 'B', product_name: 'B', category: 'FMCG', type: 'b', mrp: 20, selling_price: 18, unit: 'pcs', stock_qty: 20, createdAt: new Date().toISOString() },
            { item_name: 'C', product_name: 'C', category: 'Stationery', type: 'c', mrp: 15, selling_price: 12, unit: 'pcs', stock_qty: 15, createdAt: new Date().toISOString() },
        ]);

        const stationery = await testDb.products.where('category').equals('Stationery').toArray();
        expect(stationery.length).toBe(2);
    });
});
