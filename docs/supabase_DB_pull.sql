-- ═══════════════════════════════════════════════════════════════════════════
-- SUPABASE SCHEMA EXPORT - Run in SQL Editor to pull schema details
-- Copy results and save to a file for reference
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. ALL TABLES with columns and types
SELECT 
    t.table_name,
    c.column_name,
    c.data_type,
    c.is_nullable,
    c.column_default,
    c.character_maximum_length
FROM information_schema.tables t
JOIN information_schema.columns c ON t.table_name = c.table_name
WHERE t.table_schema = 'public'
    AND t.table_type = 'BASE TABLE'
ORDER BY t.table_name, c.ordinal_position;

-- 2. PRIMARY KEYS
SELECT 
    tc.table_name,
    kcu.column_name,
    tc.constraint_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
WHERE tc.constraint_type = 'PRIMARY KEY'
    AND tc.table_schema = 'public'
ORDER BY tc.table_name;

-- 3. FOREIGN KEYS
SELECT 
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    tc.constraint_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu 
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public'
ORDER BY tc.table_name;

-- 4. INDEXES
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- 5. RLS POLICIES
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- 6. TRIGGERS
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement,
    action_timing
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;

-- 7. VIEWS
SELECT 
    table_name,
    view_definition
FROM information_schema.views
WHERE table_schema = 'public'
ORDER BY table_name;

-- 8. FUNCTIONS
SELECT 
    routine_name,
    routine_type,
    data_type,
    routine_definition
FROM information_schema.routines
WHERE routine_schema = 'public'
ORDER BY routine_name;

-- 9. TABLE ROW COUNTS
SELECT 
    schemaname,
    relname as table_name,
    n_live_tup as row_count
FROM pg_stat_user_tables
ORDER BY n_live_tup DESC;

-- ═══════════════════════════════════════════════════════════════════════════
-- RLS DISABLE SCRIPT - Run if you want to disable RLS on all tables
-- ═══════════════════════════════════════════════════════════════════════════

-- Disable RLS on all tables (run this to fix RLS errors)
ALTER TABLE verticals DISABLE ROW LEVEL SECURITY;
ALTER TABLE brands DISABLE ROW LEVEL SECURITY;
ALTER TABLE products DISABLE ROW LEVEL SECURITY;
ALTER TABLE packing_units DISABLE ROW LEVEL SECURITY;
ALTER TABLE items DISABLE ROW LEVEL SECURITY;
ALTER TABLE prospects DISABLE ROW LEVEL SECURITY;
ALTER TABLE orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE order_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE bills DISABLE ROW LEVEL SECURITY;
ALTER TABLE routes DISABLE ROW LEVEL SECURITY;
ALTER TABLE visits DISABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers DISABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE costs DISABLE ROW LEVEL SECURITY;
ALTER TABLE account DISABLE ROW LEVEL SECURITY;
ALTER TABLE firms DISABLE ROW LEVEL SECURITY;
ALTER TABLE firm_users DISABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_catalogues DISABLE ROW LEVEL SECURITY;
ALTER TABLE warehouse_layout DISABLE ROW LEVEL SECURITY;
ALTER TABLE warehouse_cells DISABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements DISABLE ROW LEVEL SECURITY;
ALTER TABLE storage_places DISABLE ROW LEVEL SECURITY;
ALTER TABLE storage_zones DISABLE ROW LEVEL SECURITY;
ALTER TABLE storage_slots DISABLE ROW LEVEL SECURITY;
ALTER TABLE item_locations DISABLE ROW LEVEL SECURITY;
ALTER TABLE subcategories DISABLE ROW LEVEL SECURITY;
ALTER TABLE variant_params_1 DISABLE ROW LEVEL SECURITY;
ALTER TABLE variant_params_2 DISABLE ROW LEVEL SECURITY;
ALTER TABLE variant_params_3 DISABLE ROW LEVEL SECURITY;
ALTER TABLE product_media DISABLE ROW LEVEL SECURITY;

-- ═══════════════════════════════════════════════════════════════════════════
-- OR: Fix RLS Policies to allow all operations for authenticated users
-- ═══════════════════════════════════════════════════════════════════════════

-- Create permissive policy for verticals (example - repeat for other tables)
-- DROP POLICY IF EXISTS "firm_isolation" ON verticals;
-- CREATE POLICY "allow_all" ON verticals FOR ALL USING (true) WITH CHECK (true);

-- ═══════════════════════════════════════════════════════════════════════════
-- COMPLETE SCHEMA DUMP (one big query for copy-paste)
-- ═══════════════════════════════════════════════════════════════════════════

-- Run this to get everything in one result
SELECT 'TABLE' as type, table_name as name, 
    (SELECT string_agg(column_name || ' ' || data_type || 
        CASE WHEN is_nullable = 'NO' THEN ' NOT NULL' ELSE '' END, 
        E'\n' ORDER BY ordinal_position)
    FROM information_schema.columns c 
    WHERE c.table_name = t.table_name AND c.table_schema = 'public') as definition
FROM information_schema.tables t
WHERE table_schema = 'public' AND table_type = 'BASE TABLE'

UNION ALL

SELECT 'POLICY' as type, tablename as name, 
    policyname || ' (' || cmd || '): ' || COALESCE(qual::text, 'true') as definition
FROM pg_policies
WHERE schemaname = 'public'

UNION ALL

SELECT 'TRIGGER' as type, event_object_table as name,
    trigger_name || ' ' || action_timing || ' ' || event_manipulation || 
    ' EXECUTE ' || action_statement as definition
FROM information_schema.triggers
WHERE trigger_schema = 'public'

ORDER BY type, name;
