-- VisualInventory Seed Data
-- Run this in Supabase SQL Editor
-- Generated: 2026-03-10

-- ─── Clear existing data (optional - uncomment if needed) ───────────
-- TRUNCATE TABLE items, orders, order_items, bills, prospects, routes, visits, 
--   stock_movements, purchase_orders, purchase_order_items, costs, account,
--   storage_places, storage_zones, storage_slots, item_locations,
--   subcategories, products, brands, verticals, packing_units CASCADE;

-- ─── Firm IDs (deterministic) ───────────────────────────────────────
-- These UUIDs are used as foreign keys throughout

-- ─── 1. FIRMS ──────────────────────────────────────────────────────
INSERT INTO firms (id, name, slug, address, gstin, contact, email, website, enabled_features, created_at) VALUES
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'R.S. Enterprises', 'rs-enterprises', '123 Main Market, Delhi 110001', '07AABCT1234A1Z5', '9876543210', 'rs.enterprises@email.com', 'www.rsenterprises.com', '{"billing":true,"inventory":true,"fieldops":true,"marketing":true,"media":true,"suppliers":true,"warehouse":true,"reports":true,"accounting":true,"splitviewer":true,"settings":true,"admin":false}', NOW()),
('b2c3d4e5-f6a7-8901-bcde-f12345678901', 'Kailash Cutlery', 'kailash-cutlery', '45 Industrial Area, Moradabad 244001', '09AABCK5678B1Z2', '9876543211', 'kailash.cutlery@email.com', 'www.kailashcutlery.com', '{"billing":true,"inventory":true,"fieldops":false,"marketing":true,"media":false,"suppliers":true,"warehouse":true,"reports":true,"accounting":true,"splitviewer":false,"settings":true,"admin":false}', NOW()),
('c3d4e5f6-a7b8-9012-cdef-123456789012', 'Kartik Traders', 'kartik-traders', '78 Fireworks Lane, Sivakasi 626123', '33AABCK9012C1Z3', '9876543212', 'kartik.traders@email.com', 'www.kartiktraders.com', '{"billing":true,"inventory":true,"fieldops":true,"marketing":false,"media":true,"suppliers":true,"warehouse":false,"reports":true,"accounting":false,"splitviewer":false,"settings":true,"admin":false}', NOW())
ON CONFLICT (id) DO UPDATE SET enabled_features = EXCLUDED.enabled_features;

-- ─── 2. FIRM_USERS ──────────────────────────────────────────────────
INSERT INTO firm_users (id, user_id, firm_id, role, created_at) VALUES
(gen_random_uuid(), gen_random_uuid(), 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'master_admin', NOW()),
(gen_random_uuid(), gen_random_uuid(), 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'store_owner', NOW()),
(gen_random_uuid(), gen_random_uuid(), 'b2c3d4e5-f6a7-8901-bcde-f12345678901', 'master_admin', NOW()),
(gen_random_uuid(), gen_random_uuid(), 'c3d4e5f6-a7b8-9012-cdef-123456789012', 'master_admin', NOW());

-- ─── 3. VERTICALS ───────────────────────────────────────────────────
-- R.S. Enterprises
INSERT INTO verticals (firm_id, name) VALUES
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Stationery'),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'FMCG'),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'General Items'),
-- Kailash Cutlery
('b2c3d4e5-f6a7-8901-bcde-f12345678901', 'Cutlery'),
('b2c3d4e5-f6a7-8901-bcde-f12345678901', 'Kitchenware'),
-- Kartik Traders
('c3d4e5f6-a7b8-9012-cdef-123456789012', 'Fireworks'),
('c3d4e5f6-a7b8-9012-cdef-123456789012', 'Gifts & Novelties'),
('c3d4e5f6-a7b8-9012-cdef-123456789012', 'General Items');

-- ─── 4. BRANDS ─────────────────────────────────────────────────────
-- R.S. Enterprises brands
INSERT INTO brands (firm_id, name, vertical_id) VALUES
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Classmate', (SELECT id FROM verticals WHERE firm_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' AND name = 'Stationery')),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Nataraj', (SELECT id FROM verticals WHERE firm_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' AND name = 'Stationery')),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Camlin', (SELECT id FROM verticals WHERE firm_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' AND name = 'Stationery')),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Parle', (SELECT id FROM verticals WHERE firm_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' AND name = 'FMCG')),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Britannia', (SELECT id FROM verticals WHERE firm_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' AND name = 'FMCG')),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Nestle', (SELECT id FROM verticals WHERE firm_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' AND name = 'FMCG')),
-- Kailash Cutlery brands
('b2c3d4e5-f6a7-8901-bcde-f12345678901', 'Prestige', (SELECT id FROM verticals WHERE firm_id = 'b2c3d4e5-f6a7-8901-bcde-f12345678901' AND name = 'Cutlery')),
('b2c3d4e5-f6a7-8901-bcde-f12345678901', 'Pigeon', (SELECT id FROM verticals WHERE firm_id = 'b2c3d4e5-f6a7-8901-bcde-f12345678901' AND name = 'Cutlery')),
('b2c3d4e5-f6a7-8901-bcde-f12345678901', 'Milton', (SELECT id FROM verticals WHERE firm_id = 'b2c3d4e5-f6a7-8901-bcde-f12345678901' AND name = 'Kitchenware')),
('b2c3d4e5-f6a7-8901-bcde-f12345678901', 'Cello', (SELECT id FROM verticals WHERE firm_id = 'b2c3d4e5-f6a7-8901-bcde-f12345678901' AND name = 'Kitchenware')),
-- Kartik Traders brands
('c3d4e5f6-a7b8-9012-cdef-123456789012', 'Standard Fireworks', (SELECT id FROM verticals WHERE firm_id = 'c3d4e5f6-a7b8-9012-cdef-123456789012' AND name = 'Fireworks')),
('c3d4e5f6-a7b8-9012-cdef-123456789012', 'Ayyan Fireworks', (SELECT id FROM verticals WHERE firm_id = 'c3d4e5f6-a7b8-9012-cdef-123456789012' AND name = 'Fireworks')),
('c3d4e5f6-a7b8-9012-cdef-123456789012', 'Cockbrand', (SELECT id FROM verticals WHERE firm_id = 'c3d4e5f6-a7b8-9012-cdef-123456789012' AND name = 'Fireworks'));

-- ─── 5. PACKING_UNITS ──────────────────────────────────────────────
INSERT INTO packing_units (firm_id, unit_name, multiplier)
SELECT f.id, pu.unit_name, pu.multiplier
FROM (VALUES ('a1b2c3d4-e5f6-7890-abcd-ef1234567890'), ('b2c3d4e5-f6a7-8901-bcde-f12345678901'), ('c3d4e5f6-a7b8-9012-cdef-123456789012')) AS f(id)
CROSS JOIN (VALUES ('Piece', 1), ('Dozen', 12), ('Pack-5', 5), ('Pack-10', 10), ('Box-20', 20), ('Box-50', 50), ('Carton-100', 100)) AS pu(unit_name, multiplier);

-- ─── 6. SUBCATEGORIES ──────────────────────────────────────────────
INSERT INTO subcategories (firm_id, name, vertical_id)
-- R.S. Enterprises
SELECT 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', sc.name, v.id
FROM verticals v
CROSS JOIN (VALUES ('School Supplies'), ('Office Supplies'), ('Art & Craft'), ('Premium')) AS sc(name)
WHERE v.firm_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' AND v.name = 'Stationery'
UNION ALL
SELECT 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', sc.name, v.id
FROM verticals v
CROSS JOIN (VALUES ('Bakery'), ('Confectionery'), ('Snacks'), ('Beverages')) AS sc(name)
WHERE v.firm_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' AND v.name = 'FMCG'
-- Kailash Cutlery
UNION ALL
SELECT 'b2c3d4e5-f6a7-8901-bcde-f12345678901', sc.name, v.id
FROM verticals v
CROSS JOIN (VALUES ('Dining'), ('Serving'), ('Premium')) AS sc(name)
WHERE v.firm_id = 'b2c3d4e5-f6a7-8901-bcde-f12345678901' AND v.name = 'Cutlery'
UNION ALL
SELECT 'b2c3d4e5-f6a7-8901-bcde-f12345678901', sc.name, v.id
FROM verticals v
CROSS JOIN (VALUES ('Cookware'), ('Storage'), ('Utensils')) AS sc(name)
WHERE v.firm_id = 'b2c3d4e5-f6a7-8901-bcde-f12345678901' AND v.name = 'Kitchenware'
-- Kartik Traders
UNION ALL
SELECT 'c3d4e5f6-a7b8-9012-cdef-123456789012', sc.name, v.id
FROM verticals v
CROSS JOIN (VALUES ('Indoor'), ('Outdoor'), ('Aerial'), ('Gift Boxes')) AS sc(name)
WHERE v.firm_id = 'c3d4e5f6-a7b8-9012-cdef-123456789012' AND v.name = 'Fireworks';

-- ─── 7. VARIANT_PARAMS (global) ────────────────────────────────────
INSERT INTO variant_params_1 (name, firm_id) VALUES
('Small', NULL), ('Medium', NULL), ('Large', NULL), ('Extra Large', NULL);
INSERT INTO variant_params_2 (name, firm_id) VALUES
('100pg', NULL), ('140pg', NULL), ('172pg', NULL), ('200pg', NULL), ('300pg', NULL);
INSERT INTO variant_params_3 (name, firm_id) VALUES
('Single Line', NULL), ('Double Line', NULL), ('Square', NULL), ('Plain', NULL), ('Ruled', NULL);

-- ─── 8. SUPPLIERS (global) ─────────────────────────────────────────
INSERT INTO suppliers (name, contact, address) VALUES
('Classmate India Pvt Ltd', 'support@classmate.in', 'Bangalore'),
('Parle Agro', 'orders@parleagro.com', 'Mumbai'),
('Britannia Industries', 'sales@britannia.co.in', 'Kolkata'),
('Prestige TTK', 'info@prestigettk.com', 'Chennai'),
('Milton Industries', 'sales@milton.in', 'Delhi'),
('Standard Fireworks', 'export@standardfireworks.com', 'Sivakasi'),
('Ayyan Fireworks', 'info@ayyan.in', 'Sivakasi');

-- ─── 9. ITEMS (1000+ items) ────────────────────────────────────────
-- This uses a function to generate items programmatically
-- For simplicity, we'll insert a representative sample

-- R.S. Enterprises - Stationery Items
INSERT INTO items (firm_id, item_name, category, vertical_id, brand_id, packing_unit_id, p_unit, p_unit_per_parcel, stock_parcels, stock_units, retail_price_unit, retail_price_container, wholesale_price_unit, wholesale_price_container, mrp, purchase_price_unit, keyword_id, reorder_threshold, created_at)
SELECT 
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    CONCAT(p.name, ' ', vp1.name, ' ', vp2.name),
    p.category,
    v.id,
    b.id,
    pu.id,
    (ARRAY[1,2,5,10])[1 + floor(random() * 4)],
    (ARRAY[1,5,10,12,20,50])[1 + floor(random() * 6)],
    floor(random() * 50),
    0,
    round((10 + random() * 200)::numeric, 2),
    round((50 + random() * 500)::numeric, 2),
    round((8 + random() * 150)::numeric, 2),
    round((40 + random() * 400)::numeric, 2),
    round((15 + random() * 250)::numeric, 2),
    round((5 + random() * 100)::numeric, 2),
    CONCAT('01-', LPAD(ROW_NUMBER() OVER()::text, 4, '0')),
    5 + floor(random() * 15),
    NOW()
FROM verticals v
CROSS JOIN brands b
CROSS JOIN packing_units pu
CROSS JOIN variant_params_1 vp1
CROSS JOIN variant_params_2 vp2
CROSS JOIN (
    VALUES ('Notebook', 'Notebooks'), ('Register', 'Notebooks'), ('Ball Pen', 'Pens'), 
           ('Gel Pen', 'Pens'), ('Pencil', 'Pencils'), ('Eraser', 'Accessories'),
           ('Marker', 'Markers'), ('Highlighter', 'Markers')
) AS p(name, category)
WHERE v.firm_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' 
  AND v.name = 'Stationery'
  AND b.firm_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
  AND pu.firm_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
LIMIT 400;

-- R.S. Enterprises - FMCG Items
INSERT INTO items (firm_id, item_name, category, vertical_id, brand_id, packing_unit_id, p_unit, p_unit_per_parcel, stock_parcels, stock_units, retail_price_unit, retail_price_container, wholesale_price_unit, wholesale_price_container, mrp, purchase_price_unit, keyword_id, reorder_threshold, created_at)
SELECT 
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    CONCAT(p.name, ' ', floor(10 + random() * 100), 'g'),
    p.category,
    v.id,
    b.id,
    pu.id,
    1,
    (ARRAY[1,5,10,12,20,50])[1 + floor(random() * 6)],
    floor(random() * 30),
    0,
    round((5 + random() * 50)::numeric, 2),
    round((25 + random() * 200)::numeric, 2),
    round((4 + random() * 40)::numeric, 2),
    round((20 + random() * 150)::numeric, 2),
    round((6 + random() * 60)::numeric, 2),
    round((3 + random() * 30)::numeric, 2),
    CONCAT('02-', LPAD(ROW_NUMBER() OVER()::text, 4, '0')),
    10 + floor(random() * 20),
    NOW()
FROM verticals v
CROSS JOIN brands b
CROSS JOIN packing_units pu
CROSS JOIN (
    VALUES ('Biscuit', 'Bakery'), ('Cookie', 'Bakery'), ('Chocolate', 'Confectionery'),
           ('Toffee', 'Confectionery'), ('Chips', 'Snacks'), ('Namkeen', 'Snacks')
) AS p(name, category)
WHERE v.firm_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' 
  AND v.name = 'FMCG'
  AND b.firm_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
  AND pu.firm_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
LIMIT 200;

-- Kailash Cutlery Items
INSERT INTO items (firm_id, item_name, category, vertical_id, brand_id, packing_unit_id, p_unit, p_unit_per_parcel, stock_parcels, stock_units, retail_price_unit, retail_price_container, wholesale_price_unit, wholesale_price_container, mrp, purchase_price_unit, keyword_id, reorder_threshold, created_at)
SELECT 
    'b2c3d4e5-f6a7-8901-bcde-f12345678901',
    CONCAT(p.name, ' ', (ARRAY['Small', 'Medium', 'Large', 'Set of 6', 'Set of 12'])[1 + floor(random() * 5)]),
    p.category,
    v.id,
    b.id,
    pu.id,
    1,
    (ARRAY[1,6,12])[1 + floor(random() * 3)],
    floor(random() * 40),
    0,
    round((50 + random() * 500)::numeric, 2),
    round((100 + random() * 1000)::numeric, 2),
    round((40 + random() * 400)::numeric, 2),
    round((80 + random() * 800)::numeric, 2),
    round((60 + random() * 600)::numeric, 2),
    round((30 + random() * 300)::numeric, 2),
    CONCAT('03-', LPAD(ROW_NUMBER() OVER()::text, 4, '0')),
    5 + floor(random() * 10),
    NOW()
FROM verticals v
CROSS JOIN brands b
CROSS JOIN packing_units pu
CROSS JOIN (
    VALUES ('Dinner Spoon', 'Spoons'), ('Tea Spoon', 'Spoons'), ('Dinner Fork', 'Forks'),
           ('Dinner Knife', 'Knives'), ('Pressure Cooker', 'Cookware'), ('Frying Pan', 'Cookware'),
           ('Tiffin Box', 'Storage'), ('Water Bottle', 'Storage')
) AS p(name, category)
WHERE v.firm_id = 'b2c3d4e5-f6a7-8901-bcde-f12345678901'
  AND b.firm_id = 'b2c3d4e5-f6a7-8901-bcde-f12345678901'
  AND pu.firm_id = 'b2c3d4e5-f6a7-8901-bcde-f12345678901'
LIMIT 350;

-- Kartik Traders - Fireworks Items
INSERT INTO items (firm_id, item_name, category, vertical_id, brand_id, packing_unit_id, p_unit, p_unit_per_parcel, stock_parcels, stock_units, retail_price_unit, retail_price_container, wholesale_price_unit, wholesale_price_container, mrp, purchase_price_unit, keyword_id, reorder_threshold, created_at)
SELECT 
    'c3d4e5f6-a7b8-9012-cdef-123456789012',
    CONCAT(p.name, ' ', (ARRAY['Small', 'Medium', 'Large', 'Jumbo', 'Pack of 5', 'Pack of 10'])[1 + floor(random() * 6)]),
    p.category,
    v.id,
    b.id,
    pu.id,
    1,
    (ARRAY[1,5,10,20,50,100])[1 + floor(random() * 6)],
    floor(random() * 60),
    0,
    round((20 + random() * 300)::numeric, 2),
    round((50 + random() * 500)::numeric, 2),
    round((15 + random() * 250)::numeric, 2),
    round((40 + random() * 400)::numeric, 2),
    round((25 + random() * 350)::numeric, 2),
    round((10 + random() * 200)::numeric, 2),
    CONCAT('04-', LPAD(ROW_NUMBER() OVER()::text, 4, '0')),
    10 + floor(random() * 25),
    NOW()
FROM verticals v
CROSS JOIN brands b
CROSS JOIN packing_units pu
CROSS JOIN (
    VALUES ('Sparklers', 'Sparklers'), ('Flower Pot', 'Fountains'), ('Chakkar', 'Ground'),
           ('Rocket', 'Aerial'), ('Cracker', 'Crackers'), ('Atom Bomb', 'Crackers'),
           ('Sky Lantern', 'Novelties'), ('Gift Box', 'Gift Boxes')
) AS p(name, category)
WHERE v.firm_id = 'c3d4e5f6-a7b8-9012-cdef-123456789012'
  AND v.name = 'Fireworks'
  AND b.firm_id = 'c3d4e5f6-a7b8-9012-cdef-123456789012'
  AND pu.firm_id = 'c3d4e5f6-a7b8-9012-cdef-123456789012'
LIMIT 300;

-- Update stock_units based on formula
UPDATE items SET stock_units = p_unit * p_unit_per_parcel * stock_parcels;

-- ─── 10. PROSPECTS ─────────────────────────────────────────────────
INSERT INTO prospects (firm_id, prospectname, area_town, contact, business_type, created_at)
SELECT 
    f.id,
    (ARRAY['Sharma General Store', 'Gupta Trading', 'Mehta Enterprises', 'Patel Brothers', 
           'Singh & Sons', 'Kumar Stores', 'Agarwal Mart', 'Jain Traders', 
           'Verma General Store', 'Yadav Enterprises'])[1 + floor(random() * 10)] || 
    CASE WHEN random() > 0.5 THEN ' Branch ' || floor(random() * 5 + 1)::text ELSE '' END,
    (ARRAY['Civil Lines', 'Market Area', 'Station Road', 'Industrial Area', 'Old City',
           'New Colony', 'Main Bazaar', 'Sector 15', 'Model Town', 'Gandhi Nagar'])[1 + floor(random() * 10)],
    '9' || floor(800000000 + random() * 199999999)::text,
    (ARRAY['Retailer', 'Wholesaler', 'Distributor', 'Kirana Store'])[1 + floor(random() * 4)],
    NOW()
FROM firms f
CROSS JOIN generate_series(1, 30);

-- ─── 11. ROUTES ────────────────────────────────────────────────────
INSERT INTO routes (firm_id, name, description, color_tag, created_at)
SELECT 
    f.id,
    r.name,
    r.description,
    r.color,
    NOW()
FROM firms f
CROSS JOIN (
    VALUES ('City Center Route', 'Main market area', '#3B82F6'),
           ('Industrial Route', 'Factory and warehouse area', '#10B981'),
           ('Suburban Route', 'Outskirts and residential', '#F59E0B'),
           ('Highway Route', 'Highway adjacent shops', '#EF4444')
) AS r(name, description, color);

-- ─── 12. ORDERS ───────────────────────────────────────────────────
INSERT INTO orders (firm_id, prospect_id, prospect_name, order_date, pricing_mode, status, subtotal, tax_amount, discount_amount, grand_total, paid_amount, due_amount, payment_status, created_at)
SELECT 
    p.firm_id,
    p.id,
    p.prospectname,
    NOW() - (floor(random() * 30) || ' days')::interval,
    (ARRAY['retail', 'wholesale'])[1 + floor(random() * 2)],
    (ARRAY['quote', 'pending', 'dispatched', 'delivered'])[1 + floor(random() * 4)],
    round((500 + random() * 50000)::numeric, 2),
    0,
    0,
    round((500 + random() * 50000)::numeric, 2),
    round((random() * 50000)::numeric, 2),
    round((random() * 25000)::numeric, 2),
    (ARRAY['unpaid', 'partial', 'paid'])[1 + floor(random() * 3)],
    NOW() - (floor(random() * 30) || ' days')::interval
FROM prospects p
WHERE p.firm_id IN ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'b2c3d4e5-f6a7-8901-bcde-f12345678901', 'c3d4e5f6-a7b8-9012-cdef-123456789012')
LIMIT 150;

-- ─── 13. ORDER_ITEMS ──────────────────────────────────────────────
INSERT INTO order_items (order_id, item_id, item_name, qty, unit_price, discount, total)
SELECT 
    o.id,
    i.id,
    i.item_name,
    1 + floor(random() * 10),
    i.retail_price_unit,
    0,
    (1 + floor(random() * 10)) * i.retail_price_unit
FROM orders o
JOIN items i ON i.firm_id = o.firm_id
WHERE random() > 0.7
LIMIT 500;

-- ─── 14. BILLS ─────────────────────────────────────────────────────
INSERT INTO bills (firm_id, order_id, bill_number, business_name, print_format, created_at)
SELECT 
    o.firm_id,
    o.id,
    'INV-2026-' || LPAD(ROW_NUMBER() OVER()::text, 5, '0'),
    f.name,
    (ARRAY['a4', 'thermal', 'receipt'])[1 + floor(random() * 3)],
    o.created_at
FROM orders o
JOIN firms f ON f.id = o.firm_id
WHERE random() > 0.3
LIMIT 100;

-- ─── 15. PURCHASE_ORDERS ───────────────────────────────────────────
INSERT INTO purchase_orders (firm_id, supplier_id, order_date, status, subtotal, freight_cost, packaging_cost, total_cost, created_at)
SELECT 
    f.id,
    s.id,
    NOW() - (floor(random() * 60) || ' days')::interval,
    (ARRAY['pending', 'received', 'partial'])[1 + floor(random() * 3)],
    round((1000 + random() * 100000)::numeric, 2),
    round(random() * 500, 2),
    round(random() * 200, 2),
    round((1000 + random() * 100000)::numeric, 2),
    NOW() - (floor(random() * 60) || ' days')::interval
FROM firms f
CROSS JOIN suppliers s
LIMIT 60;

-- ─── 16. STOCK_MOVEMENTS ───────────────────────────────────────────
INSERT INTO stock_movements (firm_id, item_id, movement_type, qty_change, parcel_change, notes, created_at)
SELECT 
    i.firm_id,
    i.id,
    (ARRAY['sale', 'purchase', 'adjustment', 'loss'])[1 + floor(random() * 4)],
    CASE WHEN random() > 0.5 THEN -1 * floor(random() * 20 + 1) ELSE floor(random() * 50 + 1) END,
    floor(random() * 10 + 1),
    'Sample stock movement',
    NOW() - (floor(random() * 30) || ' days')::interval
FROM items i
WHERE random() > 0.5
LIMIT 300;

-- ─── 17. STORAGE_PLACES ────────────────────────────────────────────
INSERT INTO storage_places (firm_id, place_name, place_slug, place_type, floor_count, created_at)
SELECT 
    f.id,
    'Main Warehouse',
    'main-wh',
    'warehouse',
    2,
    NOW()
FROM firms f;

-- ─── 18. STORAGE_ZONES ─────────────────────────────────────────────
INSERT INTO storage_zones (firm_id, place_id, floor_num, zone_name, zone_slug, zone_color, created_at)
SELECT 
    sp.firm_id,
    sp.id,
    f.floor,
    'Zone ' || chr(64 + z.zone),
    'f' || f.floor || '-z' || z.zone,
    (ARRAY['#3B82F6', '#10B981', '#F59E0B', '#EF4444'])[z.zone],
    NOW()
FROM storage_places sp
CROSS JOIN (VALUES (1), (2)) AS f(floor)
CROSS JOIN (VALUES (1), (2), (3), (4)) AS z(zone);

-- ─── 19. STORAGE_SLOTS ─────────────────────────────────────────────
INSERT INTO storage_slots (firm_id, zone_id, slot_name, capacity_parcels, order_index, created_at)
SELECT 
    sz.firm_id,
    sz.id,
    'Slot ' || s.slot,
    10 + floor(random() * 40),
    s.slot,
    NOW()
FROM storage_zones sz
CROSS JOIN generate_series(1, 6) AS s(slot);

-- ─── 20. ACCOUNT (Monthly P&L) ─────────────────────────────────────
INSERT INTO account (firm_id, month_year, total_revenue, total_cost, profit, notes)
SELECT 
    f.id,
    '2025-' || LPAD(m.month::text, 2, '0'),
    round((50000 + random() * 450000)::numeric, 2),
    round((30000 + random() * 300000)::numeric, 2),
    round((20000 + random() * 150000)::numeric, 2),
    ''
FROM firms f
CROSS JOIN generate_series(1, 12) AS m(month);

-- ─── 21. COSTS ─────────────────────────────────────────────────────
INSERT INTO costs (firm_id, cost_type, amount, description, date)
SELECT 
    f.id,
    (ARRAY['rent', 'utilities', 'salaries', 'transport', 'maintenance', 'misc'])[1 + floor(random() * 6)],
    round((1000 + random() * 50000)::numeric, 2),
    'Sample cost entry',
    (NOW() - (floor(random() * 365) || ' days')::interval)::date
FROM firms f
CROSS JOIN generate_series(1, 30);

-- ─── 22. VISITS ────────────────────────────────────────────────────
INSERT INTO visits (firm_id, prospect_id, route_id, visit_date, outcome, notes, created_at)
SELECT 
    p.firm_id,
    p.id,
    r.id,
    (NOW() - (floor(random() * 30) || ' days')::interval)::date,
    (ARRAY['order_placed', 'follow_up', 'not_interested', 'callback'])[1 + floor(random() * 4)],
    'Sample visit',
    NOW() - (floor(random() * 30) || ' days')::interval
FROM prospects p
LEFT JOIN routes r ON r.firm_id = p.firm_id
WHERE random() > 0.3
LIMIT 150;

-- ─── Done! ─────────────────────────────────────────────────────────
SELECT 'Seed completed!' AS status;
SELECT COUNT(*) AS total_items FROM items;
SELECT firm_id, COUNT(*) AS items_per_firm FROM items GROUP BY firm_id;
