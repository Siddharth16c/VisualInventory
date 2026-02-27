-- ============================================================
-- Visual Inventory — Supabase PostgreSQL Schema
-- Run this entire script in the Supabase SQL Editor
-- Project: https://app.supabase.com → SQL Editor
-- ============================================================

-- ─── Auth & Multi-Tenancy ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS firms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  address text,
  gstin text,
  contact text,
  email text,
  website text,
  enabled_features jsonb DEFAULT '{"billing":true,"catalogue":true,"routes":true,"suppliers":true,"media":true}'::jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS firm_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  firm_id uuid NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'store_owner_a',
  -- role: 'master_admin' | 'store_owner_a' | 'store_owner_b'
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id)  -- one user belongs to one firm
);

-- ─── Reference Data ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS verticals (
  id bigserial PRIMARY KEY,
  firm_id uuid NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
  name text NOT NULL
);

CREATE TABLE IF NOT EXISTS brands (
  id bigserial PRIMARY KEY,
  firm_id uuid NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
  vertical_id bigint REFERENCES verticals(id) ON DELETE SET NULL,
  name text NOT NULL
);

CREATE TABLE IF NOT EXISTS products (
  id bigserial PRIMARY KEY,
  firm_id uuid NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
  vertical_id bigint REFERENCES verticals(id) ON DELETE SET NULL,
  name text NOT NULL,
  category text NOT NULL
);

CREATE TABLE IF NOT EXISTS packing_units (
  id bigserial PRIMARY KEY,
  firm_id uuid NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
  unit_name text NOT NULL,
  multiplier int NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS variant_params_1 (
  id bigserial PRIMARY KEY,
  firm_id uuid REFERENCES firms(id) ON DELETE CASCADE,
  product_id bigint REFERENCES products(id) ON DELETE CASCADE,
  name text NOT NULL
);

CREATE TABLE IF NOT EXISTS variant_params_2 (
  id bigserial PRIMARY KEY,
  firm_id uuid REFERENCES firms(id) ON DELETE CASCADE,
  product_id bigint REFERENCES products(id) ON DELETE CASCADE,
  name text NOT NULL
);

CREATE TABLE IF NOT EXISTS variant_params_3 (
  id bigserial PRIMARY KEY,
  firm_id uuid REFERENCES firms(id) ON DELETE CASCADE,
  product_id bigint REFERENCES products(id) ON DELETE CASCADE,
  name text NOT NULL
);

-- ─── Items ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS items (
  id bigserial PRIMARY KEY,
  firm_id uuid NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
  item_name text NOT NULL,
  category text NOT NULL DEFAULT '',
  product_id bigint REFERENCES products(id) ON DELETE SET NULL,
  brand_id bigint REFERENCES brands(id) ON DELETE SET NULL,
  vertical_id bigint REFERENCES verticals(id) ON DELETE SET NULL,
  packing_unit_id bigint REFERENCES packing_units(id) ON DELETE SET NULL,
  variant_param1_id bigint REFERENCES variant_params_1(id) ON DELETE SET NULL,
  variant_param2_id bigint REFERENCES variant_params_2(id) ON DELETE SET NULL,
  variant_param3_id bigint REFERENCES variant_params_3(id) ON DELETE SET NULL,
  p_unit int NOT NULL DEFAULT 1,
  p_unit_per_parcel int NOT NULL DEFAULT 1,
  stock_parcels int NOT NULL DEFAULT 0,
  stock_units int NOT NULL DEFAULT 0,
  retail_price_unit numeric NOT NULL DEFAULT 0,
  retail_price_container numeric NOT NULL DEFAULT 0,
  wholesale_price_unit numeric NOT NULL DEFAULT 0,
  wholesale_price_container numeric NOT NULL DEFAULT 0,
  mrp numeric NOT NULL DEFAULT 0,
  metadata jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz
);

-- ─── CRM ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS routes (
  id bigserial PRIMARY KEY,
  firm_id uuid NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  area_towns text[] DEFAULT '{}',
  color_tag text DEFAULT '#4f46e5',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS prospects (
  id bigserial PRIMARY KEY,
  firm_id uuid NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
  prospectname text NOT NULL,
  area_town text NOT NULL DEFAULT '',
  contact text NOT NULL DEFAULT '',
  business_type text NOT NULL DEFAULT '',
  route_id bigint REFERENCES routes(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS orders (
  id bigserial PRIMARY KEY,
  firm_id uuid NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
  prospect_id bigint NOT NULL REFERENCES prospects(id) ON DELETE CASCADE,
  prospect_name text NOT NULL,
  order_date date NOT NULL DEFAULT CURRENT_DATE,
  pricing_mode text NOT NULL DEFAULT 'retail',
  status text NOT NULL DEFAULT 'quote',
  subtotal numeric DEFAULT 0,
  tax_amount numeric DEFAULT 0,
  discount_amount numeric DEFAULT 0,
  grand_total numeric DEFAULT 0,
  paid_amount numeric DEFAULT 0,
  due_amount numeric DEFAULT 0,
  payment_status text NOT NULL DEFAULT 'unpaid',
  due_date date,
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS order_items (
  id bigserial PRIMARY KEY,
  order_id bigint NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  item_id bigint NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  item_name text NOT NULL,
  qty int NOT NULL DEFAULT 1,
  unit_price numeric NOT NULL DEFAULT 0,
  discount numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS bills (
  id bigserial PRIMARY KEY,
  firm_id uuid NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
  order_id bigint NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  bill_number text NOT NULL,
  business_name text NOT NULL DEFAULT '',
  print_format text NOT NULL DEFAULT 'a4',
  created_at timestamptz DEFAULT now()
);

-- ─── Visits & Travel ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS visits (
  id bigserial PRIMARY KEY,
  firm_id uuid NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
  prospect_id bigint NOT NULL REFERENCES prospects(id) ON DELETE CASCADE,
  route_id bigint REFERENCES routes(id) ON DELETE SET NULL,
  visit_date date NOT NULL DEFAULT CURRENT_DATE,
  outcome text,
  notes text,
  next_visit_plan date,      -- future reminder
  is_future_plan boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS travel_records (
  id bigserial PRIMARY KEY,
  firm_id uuid NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
  travel_date date NOT NULL DEFAULT CURRENT_DATE,
  route_id bigint REFERENCES routes(id) ON DELETE SET NULL,
  route_name text,
  is_ideal boolean NOT NULL DEFAULT false,
  notes text
);

-- ─── Suppliers (GLOBAL — no firm_id) ─────────────────────────────

CREATE TABLE IF NOT EXISTS suppliers (
  id bigserial PRIMARY KEY,
  name text NOT NULL,
  contact text,
  address text,
  vertical_id bigint REFERENCES verticals(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS purchase_orders (
  id bigserial PRIMARY KEY,
  firm_id uuid NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
  supplier_id bigint NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  order_date date NOT NULL DEFAULT CURRENT_DATE,
  status text NOT NULL DEFAULT 'received',
  subtotal numeric DEFAULT 0,
  freight_cost numeric DEFAULT 0,
  packaging_cost numeric DEFAULT 0,
  total_cost numeric DEFAULT 0,
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS purchase_order_items (
  id bigserial PRIMARY KEY,
  purchase_order_id bigint NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  item_id bigint REFERENCES items(id) ON DELETE SET NULL,
  item_name text NOT NULL,
  qty int NOT NULL DEFAULT 1,
  purchase_price_unit numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0
);

-- ─── Media ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS product_media (
  id bigserial PRIMARY KEY,
  firm_id uuid NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
  item_id bigint NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  media_role text NOT NULL DEFAULT 'gallery',
  storage_path text NOT NULL,  -- Supabase Storage path: 'firm_id/item_id/filename.webp'
  filename text NOT NULL,
  mime_type text NOT NULL DEFAULT 'image/webp',
  created_at timestamptz DEFAULT now()
);

-- ─── Financials ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS costs (
  id bigserial PRIMARY KEY,
  firm_id uuid NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
  cost_type text NOT NULL,
  cost_factor_id bigint,
  order_id bigint REFERENCES orders(id) ON DELETE SET NULL,
  purchase_order_id bigint REFERENCES purchase_orders(id) ON DELETE SET NULL,
  amount numeric NOT NULL DEFAULT 0,
  description text,
  date date NOT NULL DEFAULT CURRENT_DATE
);

CREATE TABLE IF NOT EXISTS account (
  id bigserial PRIMARY KEY,
  firm_id uuid NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
  month_year text NOT NULL,
  total_revenue numeric NOT NULL DEFAULT 0,
  total_cost numeric NOT NULL DEFAULT 0,
  profit numeric NOT NULL DEFAULT 0,
  notes text
);

CREATE TABLE IF NOT EXISTS marketing_catalogues (
  id bigserial PRIMARY KEY,
  firm_id uuid NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
  title text NOT NULL,
  item_ids jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- ─── Row Level Security ───────────────────────────────────────────
-- Enable RLS on all tenant-scoped tables.
-- master_admin role bypasses this using the service key on the server side.
-- Regular users only see their own firm's data.

ALTER TABLE verticals ENABLE ROW LEVEL SECURITY;
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE packing_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE variant_params_1 ENABLE ROW LEVEL SECURITY;
ALTER TABLE variant_params_2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE variant_params_3 ENABLE ROW LEVEL SECURITY;
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE prospects ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE travel_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE account ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_catalogues ENABLE ROW LEVEL SECURITY;

-- Helper function: get the authenticated user's firm_id
CREATE OR REPLACE FUNCTION get_my_firm_id()
RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT firm_id FROM firm_users WHERE user_id = auth.uid() LIMIT 1;
$$;

-- Apply the isolation policy to every tenant-scoped table:
CREATE POLICY "firm_isolation" ON verticals USING (firm_id = get_my_firm_id());
CREATE POLICY "firm_isolation" ON brands USING (firm_id = get_my_firm_id());
CREATE POLICY "firm_isolation" ON products USING (firm_id = get_my_firm_id());
CREATE POLICY "firm_isolation" ON packing_units USING (firm_id = get_my_firm_id());
CREATE POLICY "firm_isolation" ON items USING (firm_id = get_my_firm_id());
CREATE POLICY "firm_isolation" ON prospects USING (firm_id = get_my_firm_id());
CREATE POLICY "firm_isolation" ON orders USING (firm_id = get_my_firm_id());
CREATE POLICY "firm_isolation" ON bills USING (firm_id = get_my_firm_id());
CREATE POLICY "firm_isolation" ON routes USING (firm_id = get_my_firm_id());
CREATE POLICY "firm_isolation" ON visits USING (firm_id = get_my_firm_id());
CREATE POLICY "firm_isolation" ON travel_records USING (firm_id = get_my_firm_id());
CREATE POLICY "firm_isolation" ON purchase_orders USING (firm_id = get_my_firm_id());
CREATE POLICY "firm_isolation" ON product_media USING (firm_id = get_my_firm_id());
CREATE POLICY "firm_isolation" ON costs USING (firm_id = get_my_firm_id());
CREATE POLICY "firm_isolation" ON account USING (firm_id = get_my_firm_id());
CREATE POLICY "firm_isolation" ON marketing_catalogues USING (firm_id = get_my_firm_id());

-- variant_params are semi-global (scoped to product but shareable)
CREATE POLICY "firm_or_global" ON variant_params_1 USING (firm_id IS NULL OR firm_id = get_my_firm_id());
CREATE POLICY "firm_or_global" ON variant_params_2 USING (firm_id IS NULL OR firm_id = get_my_firm_id());
CREATE POLICY "firm_or_global" ON variant_params_3 USING (firm_id IS NULL OR firm_id = get_my_firm_id());

-- Suppliers are global - all authenticated users can read
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated_read" ON suppliers FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "authenticated_write" ON suppliers FOR ALL USING (auth.uid() IS NOT NULL);

-- order_items: allow if parent order belongs to user's firm
CREATE POLICY "firm_isolation" ON order_items
  USING (order_id IN (SELECT id FROM orders WHERE firm_id = get_my_firm_id()));
CREATE POLICY "firm_isolation" ON purchase_order_items
  USING (purchase_order_id IN (SELECT id FROM purchase_orders WHERE firm_id = get_my_firm_id()));

-- ─── Supabase Storage Bucket ──────────────────────────────────────
-- Run separately in Storage dashboard or via this SQL:
-- INSERT INTO storage.buckets (id, name, public) VALUES ('media', 'media', true);
-- CREATE POLICY "auth_upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'media' AND auth.uid() IS NOT NULL);
-- CREATE POLICY "public_view" ON storage.objects FOR SELECT USING (bucket_id = 'media');
-- CREATE POLICY "owner_delete" ON storage.objects FOR DELETE USING (bucket_id = 'media' AND auth.uid() IS NOT NULL);

-- ─── Warehouse Simulation ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS warehouse_layout (
  id bigserial PRIMARY KEY,
  firm_id uuid NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'Main Warehouse',
  floors int NOT NULL DEFAULT 1,
  sections_per_floor int NOT NULL DEFAULT 4,
  rows_per_section int NOT NULL DEFAULT 10,
  cols_per_row int NOT NULL DEFAULT 5,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS warehouse_cells (
  id bigserial PRIMARY KEY,
  warehouse_id bigint NOT NULL REFERENCES warehouse_layout(id) ON DELETE CASCADE,
  floor int NOT NULL DEFAULT 0,
  section text NOT NULL,       -- 'A', 'B', 'C'…
  row_num int NOT NULL,
  col_num int NOT NULL,
  item_id bigint REFERENCES items(id) ON DELETE SET NULL,
  parcel_count int NOT NULL DEFAULT 0,
  notes text,
  UNIQUE(warehouse_id, floor, section, row_num, col_num)
);

ALTER TABLE warehouse_layout ENABLE ROW LEVEL SECURITY;
ALTER TABLE warehouse_cells ENABLE ROW LEVEL SECURITY;

CREATE POLICY "firm_isolation" ON warehouse_layout USING (firm_id = get_my_firm_id());
CREATE POLICY "firm_isolation" ON warehouse_cells
  USING (warehouse_id IN (SELECT id FROM warehouse_layout WHERE firm_id = get_my_firm_id()));

-- ─── Performance Indexes ──────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_orders_firm_date ON orders(firm_id, created_at);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_items_firm ON items(firm_id);
CREATE INDEX IF NOT EXISTS idx_warehouse_cells_warehouse ON warehouse_cells(warehouse_id, item_id);

