-- Global Tables Configuration
-- Controls which tables share data across all firms vs being firm-scoped

CREATE TABLE IF NOT EXISTS global_tables_config (
    id SERIAL PRIMARY KEY,
    table_name TEXT UNIQUE NOT NULL,
    is_global BOOLEAN DEFAULT FALSE,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default global tables (shared across all firms)
INSERT INTO global_tables_config (table_name, is_global, description) VALUES
    ('brands', true, 'Brand names shared across all firms'),
    ('variant_params_1', true, 'Variant parameter 1 (e.g., color, size)'),
    ('variant_params_2', true, 'Variant parameter 2'),
    ('variant_params_3', true, 'Variant parameter 3'),
    ('verticals', true, 'Business verticals/categories'),
    ('products', true, 'Product catalog shared across firms'),
    ('subcategories', true, 'Product subcategories'),
    ('suppliers', true, 'Supplier master data')
ON CONFLICT (table_name) DO NOTHING;

-- Tables that remain firm-scoped by default:
-- items, prospects, orders, bills, routes, visits, travel_records,
-- purchase_orders, item_media, costs, account, marketing_catalogues,
-- warehouse_layout, warehouse_cells, stock_movements, storage_places,
-- storage_zones, storage_slots, item_locations, storage_packages, package_items

-- Enable RLS
ALTER TABLE global_tables_config ENABLE ROW LEVEL SECURITY;

-- Policy: Only master_admin can manage global_tables_config
CREATE POLICY "Master admin can manage global tables config"
    ON global_tables_config
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_global_tables_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_global_tables_config_updated_at
    BEFORE UPDATE ON global_tables_config
    FOR EACH ROW
    EXECUTE FUNCTION update_global_tables_config_updated_at();
