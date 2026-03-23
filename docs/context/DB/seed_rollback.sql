-- VisualInventory - Undo Seed Data
-- Run this in Supabase SQL Editor to clear all seed data
-- WARNING: This will DELETE ALL data from the tables below

BEGIN;

-- 1. Delete child tables first (foreign key dependencies)
DELETE FROM order_items WHERE order_id IN (SELECT id FROM orders);
DELETE FROM purchase_order_items WHERE purchase_order_id IN (SELECT id FROM purchase_orders);
DELETE FROM item_locations WHERE firm_id IN ('33b0fa7a-217c-4c85-982e-e5301906bda7', 'a41012cc-d643-41ea-a0f4-7bb5c1f08a51', 'be17178e-4f92-4392-83de-1bfccdae1ff3');
DELETE FROM stock_movements WHERE firm_id IN ('33b0fa7a-217c-4c85-982e-e5301906bda7', 'a41012cc-d643-41ea-a0f4-7bb5c1f08a51', 'be17178e-4f92-4392-83de-1bfccdae1ff3');
DELETE FROM storage_slots WHERE firm_id IN ('33b0fa7a-217c-4c85-982e-e5301906bda7', 'a41012cc-d643-41ea-a0f4-7bb5c1f08a51', 'be17178e-4f92-4392-83de-1bfccdae1ff3');
DELETE FROM storage_zones WHERE firm_id IN ('33b0fa7a-217c-4c85-982e-e5301906bda7', 'a41012cc-d643-41ea-a0f4-7bb5c1f08a51', 'be17178e-4f92-4392-83de-1bfccdae1ff3');
DELETE FROM storage_places WHERE firm_id IN ('33b0fa7a-217c-4c85-982e-e5301906bda7', 'a41012cc-d643-41ea-a0f4-7bb5c1f08a51', 'be17178e-4f92-4392-83de-1bfccdae1ff3');

-- 2. Delete main tables
DELETE FROM items WHERE firm_id IN ('33b0fa7a-217c-4c85-982e-e5301906bda7', 'a41012cc-d643-41ea-a0f4-7bb5c1f08a51', 'be17178e-4f92-4392-83de-1bfccdae1ff3');
DELETE FROM orders WHERE firm_id IN ('33b0fa7a-217c-4c85-982e-e5301906bda7', 'a41012cc-d643-41ea-a0f4-7bb5c1f08a51', 'be17178e-4f92-4392-83de-1bfccdae1ff3');
DELETE FROM bills WHERE firm_id IN ('33b0fa7a-217c-4c85-982e-e5301906bda7', 'a41012cc-d643-41ea-a0f4-7bb5c1f08a51', 'be17178e-4f92-4392-83de-1bfccdae1ff3');
DELETE FROM prospects WHERE firm_id IN ('33b0fa7a-217c-4c85-982e-e5301906bda7', 'a41012cc-d643-41ea-a0f4-7bb5c1f08a51', 'be17178e-4f92-4392-83de-1bfccdae1ff3');
DELETE FROM routes WHERE firm_id IN ('33b0fa7a-217c-4c85-982e-e5301906bda7', 'a41012cc-d643-41ea-a0f4-7bb5c1f08a51', 'be17178e-4f92-4392-83de-1bfccdae1ff3');
DELETE FROM visits WHERE firm_id IN ('33b0fa7a-217c-4c85-982e-e5301906bda7', 'a41012cc-d643-41ea-a0f4-7bb5c1f08a51', 'be17178e-4f92-4392-83de-1bfccdae1ff3');
DELETE FROM purchase_orders WHERE firm_id IN ('33b0fa7a-217c-4c85-982e-e5301906bda7', 'a41012cc-d643-41ea-a0f4-7bb5c1f08a51', 'be17178e-4f92-4392-83de-1bfccdae1ff3');
DELETE FROM account WHERE firm_id IN ('33b0fa7a-217c-4c85-982e-e5301906bda7', 'a41012cc-d643-41ea-a0f4-7bb5c1f08a51', 'be17178e-4f92-4392-83de-1bfccdae1ff3');
DELETE FROM costs WHERE firm_id IN ('33b0fa7a-217c-4c85-982e-e5301906bda7', 'a41012cc-d643-41ea-a0f4-7bb5c1f08a51', 'be17178e-4f92-4392-83de-1bfccdae1ff3');
DELETE FROM product_media WHERE firm_id IN ('33b0fa7a-217c-4c85-982e-e5301906bda7', 'a41012cc-d643-41ea-a0f4-7bb5c1f08a51', 'be17178e-4f92-4392-83de-1bfccdae1ff3');
DELETE FROM marketing_catalogues WHERE firm_id IN ('33b0fa7a-217c-4c85-982e-e5301906bda7', 'a41012cc-d643-41ea-a0f4-7bb5c1f08a51', 'be17178e-4f92-4392-83de-1bfccdae1ff3');
DELETE FROM warehouse_cells WHERE warehouse_id IN (SELECT id FROM warehouse_layout WHERE firm_id IN ('33b0fa7a-217c-4c85-982e-e5301906bda7', 'a41012cc-d643-41ea-a0f4-7bb5c1f08a51', 'be17178e-4f92-4392-83de-1bfccdae1ff3'));
DELETE FROM warehouse_layout WHERE firm_id IN ('33b0fa7a-217c-4c85-982e-e5301906bda7', 'a41012cc-d643-41ea-a0f4-7bb5c1f08a51', 'be17178e-4f92-4392-83de-1bfccdae1ff3');

-- 3. Delete reference data (optional - uncomment if needed)
-- DELETE FROM subcategories WHERE firm_id IN ('33b0fa7a-217c-4c85-982e-e5301906bda7', 'a41012cc-d643-41ea-a0f4-7bb5c1f08a51', 'be17178e-4f92-4392-83de-1bfccdae1ff3');
-- DELETE FROM products WHERE firm_id IN ('33b0fa7a-217c-4c85-982e-e5301906bda7', 'a41012cc-d643-41ea-a0f4-7bb5c1f08a51', 'be17178e-4f92-4392-83de-1bfccdae1ff3');
-- DELETE FROM brands WHERE firm_id IN ('33b0fa7a-217c-4c85-982e-e5301906bda7', 'a41012cc-d643-41ea-a0f4-7bb5c1f08a51', 'be17178e-4f92-4392-83de-1bfccdae1ff3');
-- DELETE FROM verticals WHERE firm_id IN ('33b0fa7a-217c-4c85-982e-e5301906bda7', 'a41012cc-d643-41ea-a0f4-7bb5c1f08a51', 'be17178e-4f92-4392-83de-1bfccdae1ff3');
-- DELETE FROM packing_units WHERE firm_id IN ('33b0fa7a-217c-4c85-982e-e5301906bda7', 'a41012cc-d643-41ea-a0f4-7bb5c1f08a51', 'be17178e-4f92-4392-83de-1bfccdae1ff3');

-- 4. DO NOT delete firms table or suppliers (global)
-- Firms are preserved: Master HQ, R.S. Enterprises, Kailash Fataka, Kartik Traders

COMMIT;

-- Verify counts
SELECT 'items' as table_name, COUNT(*) as count FROM items
UNION ALL
SELECT 'orders', COUNT(*) FROM orders
UNION ALL
SELECT 'prospects', COUNT(*) FROM prospects
UNION ALL
SELECT 'stock_movements', COUNT(*) FROM stock_movements;
