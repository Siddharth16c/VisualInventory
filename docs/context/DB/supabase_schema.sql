-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.account (
  id bigint NOT NULL DEFAULT nextval('account_id_seq'::regclass),
  firm_id uuid NOT NULL,
  month_year text NOT NULL,
  total_revenue numeric NOT NULL DEFAULT 0,
  total_cost numeric NOT NULL DEFAULT 0,
  profit numeric NOT NULL DEFAULT 0,
  notes text,
  CONSTRAINT account_pkey PRIMARY KEY (id),
  CONSTRAINT account_firm_id_fkey FOREIGN KEY (firm_id) REFERENCES public.firms(id)
);
CREATE TABLE public.bills (
  id bigint NOT NULL DEFAULT nextval('bills_id_seq'::regclass),
  firm_id uuid NOT NULL,
  bill_number text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  prospect_id bigint,
  grand_total numeric NOT NULL,
  paid_amount numeric NOT NULL,
  notes text,
  CONSTRAINT bills_pkey PRIMARY KEY (id),
  CONSTRAINT bills_firm_id_fkey FOREIGN KEY (firm_id) REFERENCES public.firms(id),
  CONSTRAINT bills_prospect_id_fkey FOREIGN KEY (prospect_id) REFERENCES public.prospects(id)
);
CREATE TABLE public.brands (
  id bigint NOT NULL DEFAULT nextval('brands_id_seq'::regclass),
  vertical_id bigint,
  name text NOT NULL,
  CONSTRAINT brands_pkey PRIMARY KEY (id),
  CONSTRAINT brands_vertical_id_fkey FOREIGN KEY (vertical_id) REFERENCES public.verticals(id)
);
CREATE TABLE public.categories (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  name text NOT NULL,
  CONSTRAINT categories_pkey PRIMARY KEY (id)
);
CREATE TABLE public.costs (
  id bigint NOT NULL DEFAULT nextval('costs_id_seq'::regclass),
  firm_id uuid NOT NULL,
  cost_type text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  description text,
  date date NOT NULL,
  sales_order_id bigint,
  purchase_order_id bigint,
  CONSTRAINT costs_pkey PRIMARY KEY (id),
  CONSTRAINT costs_firm_id_fkey FOREIGN KEY (firm_id) REFERENCES public.firms(id),
  CONSTRAINT costs_sales_order_id_fkey FOREIGN KEY (sales_order_id) REFERENCES public.sales_orders(id),
  CONSTRAINT costs_purchase_order_id_fkey FOREIGN KEY (purchase_order_id) REFERENCES public.purchase_orders(id)
);
CREATE TABLE public.firm_users (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  firm_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'store_owner_a'::text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT firm_users_pkey PRIMARY KEY (id),
  CONSTRAINT firm_users_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT firm_users_firm_id_fkey FOREIGN KEY (firm_id) REFERENCES public.firms(id)
);
CREATE TABLE public.firms (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  address text,
  gstin text,
  contact text,
  email text,
  website text,
  enabled_features jsonb DEFAULT '{"media": true, "routes": true, "billing": true, "catalogue": true, "suppliers": true}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT firms_pkey PRIMARY KEY (id)
);
CREATE TABLE public.item_locations (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  firm_id uuid NOT NULL,
  item_id bigint NOT NULL,
  slot_id bigint,
  parcel_count integer NOT NULL DEFAULT 0,
  is_primary boolean DEFAULT true,
  last_verified_at timestamp with time zone,
  updated_at timestamp with time zone DEFAULT now(),
  deleted_at timestamp with time zone,
  packaging_type text,
  packaging_tags ARRAY DEFAULT '{}'::text[],
  pos_x numeric,
  pos_y numeric,
  pos_z numeric,
  dim_w numeric DEFAULT 0.5,
  dim_d numeric DEFAULT 0.5,
  dim_h numeric DEFAULT 0.5,
  CONSTRAINT item_locations_pkey PRIMARY KEY (id),
  CONSTRAINT item_locations_firm_id_fkey FOREIGN KEY (firm_id) REFERENCES public.firms(id),
  CONSTRAINT item_locations_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.items(id),
  CONSTRAINT item_locations_slot_id_fkey FOREIGN KEY (slot_id) REFERENCES public.storage_slots(id)
);
CREATE TABLE public.item_media (
  id bigint NOT NULL DEFAULT nextval('product_media_id_seq'::regclass),
  firm_id uuid NOT NULL,
  item_id bigint NOT NULL,
  media_role text NOT NULL DEFAULT 'gallery'::text,
  data_base64 text NOT NULL,
  filename text NOT NULL,
  mime_type text NOT NULL DEFAULT 'image/webp'::text,
  file_size_kb numeric,
  width numeric,
  height numeric,
  is_watermarked boolean NOT NULL,
  item_keyword text,
  CONSTRAINT item_media_pkey PRIMARY KEY (id),
  CONSTRAINT product_media_firm_id_fkey FOREIGN KEY (firm_id) REFERENCES public.firms(id),
  CONSTRAINT product_media_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.items(id),
  CONSTRAINT product_media_item_keyword_fkey FOREIGN KEY (item_keyword) REFERENCES public.items(keyword_id)
);
CREATE TABLE public.items (
  id bigint NOT NULL DEFAULT nextval('items_id_seq'::regclass),
  firm_id uuid NOT NULL,
  item_name text NOT NULL,
  product_id bigint,
  brand_id bigint,
  vertical_id bigint,
  variant_param1_id bigint,
  variant_param2_id bigint,
  variant_param3_id bigint,
  metadata jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone,
  keyword_id text NOT NULL UNIQUE,
  thumbnail_base64 text,
  marketing_images jsonb DEFAULT '[]'::jsonb,
  CONSTRAINT items_pkey PRIMARY KEY (id),
  CONSTRAINT items_firm_id_fkey FOREIGN KEY (firm_id) REFERENCES public.firms(id),
  CONSTRAINT items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id),
  CONSTRAINT items_brand_id_fkey FOREIGN KEY (brand_id) REFERENCES public.brands(id),
  CONSTRAINT items_vertical_id_fkey FOREIGN KEY (vertical_id) REFERENCES public.verticals(id),
  CONSTRAINT items_variant_param1_id_fkey FOREIGN KEY (variant_param1_id) REFERENCES public.variant_params_1(id),
  CONSTRAINT items_variant_param2_id_fkey FOREIGN KEY (variant_param2_id) REFERENCES public.variant_params_2(id),
  CONSTRAINT items_variant_param3_id_fkey FOREIGN KEY (variant_param3_id) REFERENCES public.variant_params_3(id)
);
CREATE TABLE public.package_items (
  id bigint NOT NULL DEFAULT nextval('package_items_id_seq'::regclass),
  package_id bigint NOT NULL,
  item_id bigint NOT NULL,
  parcel_count integer NOT NULL DEFAULT 1 CHECK (parcel_count > 0),
  unit_count integer,
  location_id bigint,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT package_items_pkey PRIMARY KEY (id),
  CONSTRAINT package_items_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.items(id),
  CONSTRAINT package_items_location_id_fkey FOREIGN KEY (location_id) REFERENCES public.item_locations(id),
  CONSTRAINT package_items_package_id_fkey FOREIGN KEY (package_id) REFERENCES public.storage_packages(id)
);
CREATE TABLE public.packing_units (
  id bigint NOT NULL DEFAULT nextval('packing_units_id_seq'::regclass),
  unit_name text NOT NULL,
  multiplier integer NOT NULL DEFAULT 1,
  CONSTRAINT packing_units_pkey PRIMARY KEY (id)
);
CREATE TABLE public.parceling_details (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  packaging_type text NOT NULL,
  location json,
  CONSTRAINT parceling_details_pkey PRIMARY KEY (id)
);
CREATE TABLE public.products (
  id bigint NOT NULL DEFAULT nextval('products_id_seq'::regclass),
  vertical_id bigint,
  name text NOT NULL,
  CONSTRAINT products_pkey PRIMARY KEY (id),
  CONSTRAINT products_vertical_id_fkey FOREIGN KEY (vertical_id) REFERENCES public.verticals(id)
);
CREATE TABLE public.prospects (
  id bigint NOT NULL DEFAULT nextval('prospects_id_seq'::regclass),
  firm_id uuid NOT NULL,
  prospectname text NOT NULL,
  area_town text NOT NULL DEFAULT ''::text,
  contact text NOT NULL DEFAULT ''::text,
  business_type text NOT NULL DEFAULT ''::text,
  route_id bigint,
  notes text,
  created_at date,
  CONSTRAINT prospects_pkey PRIMARY KEY (id),
  CONSTRAINT prospects_firm_id_fkey FOREIGN KEY (firm_id) REFERENCES public.firms(id),
  CONSTRAINT prospects_route_id_fkey FOREIGN KEY (route_id) REFERENCES public.routes(id)
);
CREATE TABLE public.purchase_log (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  purchase_date timestamp with time zone NOT NULL DEFAULT now(),
  purchase_id bigint NOT NULL,
  total_amount numeric NOT NULL,
  supplier_id bigint,
  shipment_date timestamp with time zone NOT NULL,
  CONSTRAINT purchase_log_pkey PRIMARY KEY (id),
  CONSTRAINT purchase_log_purchase_id_fkey FOREIGN KEY (purchase_id) REFERENCES public.purchase_orders(id),
  CONSTRAINT purchase_log_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id)
);
CREATE TABLE public.purchase_orders (
  id bigint NOT NULL DEFAULT nextval('purchase_orders_id_seq'::regclass),
  firm_id uuid NOT NULL,
  purchase_rate numeric NOT NULL,
  item_keyword text NOT NULL,
  CONSTRAINT purchase_orders_pkey PRIMARY KEY (id),
  CONSTRAINT purchase_orders_firm_id_fkey FOREIGN KEY (firm_id) REFERENCES public.firms(id),
  CONSTRAINT purchase_orders_item_keyword_fkey FOREIGN KEY (item_keyword) REFERENCES public.items(keyword_id)
);
CREATE TABLE public.routes (
  id bigint NOT NULL DEFAULT nextval('routes_id_seq'::regclass),
  firm_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  area_towns ARRAY DEFAULT '{}'::text[],
  color_tag text DEFAULT '#4f46e5'::text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT routes_pkey PRIMARY KEY (id),
  CONSTRAINT routes_firm_id_fkey FOREIGN KEY (firm_id) REFERENCES public.firms(id)
);
CREATE TABLE public.sales_order_items (
  id bigint NOT NULL DEFAULT nextval('order_items_id_seq'::regclass),
  sales_order_id bigint NOT NULL,
  item_name_SKU text NOT NULL,
  sold_units numeric NOT NULL,
  total numeric NOT NULL DEFAULT 0,
  CONSTRAINT sales_order_items_pkey PRIMARY KEY (id),
  CONSTRAINT order_items_order_id_fkey FOREIGN KEY (sales_order_id) REFERENCES public.sales_orders(id),
  CONSTRAINT sales_order_items_sales_order_id_fkey FOREIGN KEY (sales_order_id) REFERENCES public.sales_orders(id),
  CONSTRAINT sales_order_items_item_name_SKU_fkey FOREIGN KEY (item_name_SKU) REFERENCES public.items(keyword_id)
);
CREATE TABLE public.sales_orders (
  id bigint NOT NULL DEFAULT nextval('orders_id_seq'::regclass),
  firm_id uuid NOT NULL,
  prospect_id bigint NOT NULL,
  grand_total numeric DEFAULT 0,
  paid_amount numeric DEFAULT 0,
  due_amount numeric DEFAULT 0,
  due_date date,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  end_of_sale boolean,
  CONSTRAINT sales_orders_pkey PRIMARY KEY (id),
  CONSTRAINT orders_firm_id_fkey FOREIGN KEY (firm_id) REFERENCES public.firms(id),
  CONSTRAINT orders_prospect_id_fkey FOREIGN KEY (prospect_id) REFERENCES public.prospects(id)
);
CREATE TABLE public.stock_details (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  item_id bigint NOT NULL,
  unit_multiplier_name text NOT NULL,
  unit_multiplier numeric NOT NULL,
  pack_multiplier numeric NOT NULL,
  retail_unit_price numeric NOT NULL,
  wholesale_unit_price numeric NOT NULL,
  stock_type boolean NOT NULL,
  parcel_id bigint,
  last_updated timestamp with time zone NOT NULL,
  CONSTRAINT stock_details_pkey PRIMARY KEY (id),
  CONSTRAINT stock_details_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.items(id),
  CONSTRAINT stock_details_parcel_id_fkey FOREIGN KEY (parcel_id) REFERENCES public.parceling_details(id)
);
CREATE TABLE public.stock_movements (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  firm_id uuid NOT NULL,
  item_id bigint NOT NULL,
  movement_type text NOT NULL CHECK (movement_type = ANY (ARRAY['sale'::text, 'purchase'::text, 'transfer'::text, 'loss'::text, 'adjustment'::text, 'return'::text])),
  qty_change integer NOT NULL,
  parcel_change integer,
  from_location_id bigint,
  to_location_id bigint,
  order_id bigint,
  purchase_order_id bigint,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  created_by uuid,
  CONSTRAINT stock_movements_pkey PRIMARY KEY (id),
  CONSTRAINT stock_movements_firm_id_fkey FOREIGN KEY (firm_id) REFERENCES public.firms(id),
  CONSTRAINT stock_movements_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.items(id),
  CONSTRAINT stock_movements_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.sales_orders(id),
  CONSTRAINT stock_movements_purchase_order_id_fkey FOREIGN KEY (purchase_order_id) REFERENCES public.purchase_orders(id),
  CONSTRAINT stock_movements_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id),
  CONSTRAINT fk_from_location FOREIGN KEY (from_location_id) REFERENCES public.storage_slots(id),
  CONSTRAINT fk_to_location FOREIGN KEY (to_location_id) REFERENCES public.storage_slots(id)
);
CREATE TABLE public.storage_packages (
  id bigint NOT NULL DEFAULT nextval('storage_packages_id_seq'::regclass),
  firm_id uuid NOT NULL,
  zone_id bigint,
  slot_id bigint,
  package_type text NOT NULL DEFAULT 'other'::text,
  package_label text,
  description text,
  vertical_id bigint,
  created_at timestamp with time zone DEFAULT now(),
  deleted_at timestamp with time zone,
  CONSTRAINT storage_packages_pkey PRIMARY KEY (id),
  CONSTRAINT storage_packages_firm_id_fkey FOREIGN KEY (firm_id) REFERENCES public.firms(id),
  CONSTRAINT storage_packages_zone_id_fkey FOREIGN KEY (zone_id) REFERENCES public.storage_zones(id),
  CONSTRAINT storage_packages_slot_id_fkey FOREIGN KEY (slot_id) REFERENCES public.storage_slots(id),
  CONSTRAINT storage_packages_vertical_id_fkey FOREIGN KEY (vertical_id) REFERENCES public.verticals(id)
);
CREATE TABLE public.storage_places (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  firm_id uuid NOT NULL,
  place_name text NOT NULL,
  place_slug text NOT NULL,
  place_type text NOT NULL DEFAULT 'shop'::text CHECK (place_type = ANY (ARRAY['shop'::text, 'warehouse'::text, 'godown'::text])),
  floor_count integer NOT NULL DEFAULT 1,
  svg_layout_path text,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  deleted_at timestamp with time zone,
  width_meters numeric DEFAULT 20,
  depth_meters numeric DEFAULT 20,
  height_meters numeric DEFAULT 5.00,
  CONSTRAINT storage_places_pkey PRIMARY KEY (id),
  CONSTRAINT storage_places_firm_id_fkey FOREIGN KEY (firm_id) REFERENCES public.firms(id)
);
CREATE TABLE public.storage_slots (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  firm_id uuid NOT NULL,
  zone_id bigint NOT NULL,
  slot_name text NOT NULL,
  slot_label text,
  capacity_parcels integer,
  notes text,
  deleted_at timestamp with time zone,
  order_index integer DEFAULT 0,
  CONSTRAINT storage_slots_pkey PRIMARY KEY (id),
  CONSTRAINT storage_slots_firm_id_fkey FOREIGN KEY (firm_id) REFERENCES public.firms(id),
  CONSTRAINT storage_slots_zone_id_fkey FOREIGN KEY (zone_id) REFERENCES public.storage_zones(id)
);
CREATE TABLE public.storage_zones (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  firm_id uuid NOT NULL,
  place_id bigint NOT NULL,
  floor_num integer NOT NULL DEFAULT 0,
  zone_name text NOT NULL,
  zone_slug text NOT NULL,
  zone_label text,
  notes text,
  deleted_at timestamp with time zone,
  polygon_coords jsonb,
  zone_color text DEFAULT '#4f46e5'::text,
  bounding_box jsonb,
  CONSTRAINT storage_zones_pkey PRIMARY KEY (id),
  CONSTRAINT storage_zones_firm_id_fkey FOREIGN KEY (firm_id) REFERENCES public.firms(id),
  CONSTRAINT storage_zones_place_id_fkey FOREIGN KEY (place_id) REFERENCES public.storage_places(id)
);
CREATE TABLE public.suppliers (
  id bigint NOT NULL DEFAULT nextval('suppliers_id_seq'::regclass),
  name text NOT NULL,
  contact text,
  address text,
  notes text,
  CONSTRAINT suppliers_pkey PRIMARY KEY (id)
);
CREATE TABLE public.total_stock (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  item keyword text NOT NULL,
  total_units numeric NOT NULL,
  updated_at timestamp with time zone NOT NULL,
  CONSTRAINT total_stock_pkey PRIMARY KEY (id),
  CONSTRAINT total_stock_item keyword_fkey FOREIGN KEY (item keyword) REFERENCES public.items(keyword_id)
);
CREATE TABLE public.variant_params_1 (
  id bigint NOT NULL DEFAULT nextval('variant_params_1_id_seq'::regclass),
  name text NOT NULL,
  CONSTRAINT variant_params_1_pkey PRIMARY KEY (id)
);
CREATE TABLE public.variant_params_2 (
  id bigint NOT NULL DEFAULT nextval('variant_params_2_id_seq'::regclass),
  name text NOT NULL,
  CONSTRAINT variant_params_2_pkey PRIMARY KEY (id)
);
CREATE TABLE public.variant_params_3 (
  id bigint NOT NULL DEFAULT nextval('variant_params_3_id_seq'::regclass),
  name text NOT NULL,
  CONSTRAINT variant_params_3_pkey PRIMARY KEY (id)
);
CREATE TABLE public.verticals (
  id bigint NOT NULL DEFAULT nextval('verticals_id_seq'::regclass),
  name text NOT NULL,
  sort_order integer DEFAULT 0,
  icon_base64 text,
  CONSTRAINT verticals_pkey PRIMARY KEY (id)
);
CREATE TABLE public.visits (
  id bigint NOT NULL DEFAULT nextval('visits_id_seq'::regclass),
  firm_id uuid NOT NULL,
  prospect_id bigint NOT NULL,
  route_id bigint,
  visit_date date NOT NULL DEFAULT CURRENT_DATE,
  reason_response text,
  notes text,
  next_visit_plan date,
  CONSTRAINT visits_pkey PRIMARY KEY (id),
  CONSTRAINT visits_firm_id_fkey FOREIGN KEY (firm_id) REFERENCES public.firms(id),
  CONSTRAINT visits_prospect_id_fkey FOREIGN KEY (prospect_id) REFERENCES public.prospects(id),
  CONSTRAINT visits_route_id_fkey FOREIGN KEY (route_id) REFERENCES public.routes(id)
);
CREATE TABLE public.warehouse_cells (
  id bigint NOT NULL DEFAULT nextval('warehouse_cells_id_seq'::regclass),
  warehouse_id bigint NOT NULL,
  floor integer NOT NULL DEFAULT 0,
  section text NOT NULL,
  row_num integer NOT NULL,
  col_num integer NOT NULL,
  item_id bigint,
  parcel_count integer NOT NULL DEFAULT 0,
  notes text,
  CONSTRAINT warehouse_cells_pkey PRIMARY KEY (id),
  CONSTRAINT warehouse_cells_warehouse_id_fkey FOREIGN KEY (warehouse_id) REFERENCES public.warehouse_layout(id),
  CONSTRAINT warehouse_cells_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.items(id)
);
CREATE TABLE public.warehouse_layout (
  id bigint NOT NULL DEFAULT nextval('warehouse_layout_id_seq'::regclass),
  firm_id uuid NOT NULL,
  name text NOT NULL DEFAULT 'Main Warehouse'::text,
  floors integer NOT NULL DEFAULT 1,
  sections_per_floor integer NOT NULL DEFAULT 4,
  rows_per_section integer NOT NULL DEFAULT 10,
  cols_per_row integer NOT NULL DEFAULT 5,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT warehouse_layout_pkey PRIMARY KEY (id),
  CONSTRAINT warehouse_layout_firm_id_fkey FOREIGN KEY (firm_id) REFERENCES public.firms(id)
);