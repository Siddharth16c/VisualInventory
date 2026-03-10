 Task 1 —
 ________________________________________________________________
-- 1A: keyword_id + search + reorder threshold on items
ALTER TABLE public.items
  ADD COLUMN IF NOT EXISTS keyword_id text UNIQUE,
  ADD COLUMN IF NOT EXISTS subcategory_id bigint,
  ADD COLUMN IF NOT EXISTS reorder_threshold integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS purchase_price_unit numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tsvector_search tsvector GENERATED ALWAYS AS (
    to_tsvector('english',
      coalesce(item_name, '') || ' ' ||
      coalesce(category, '') || ' ' ||
      coalesce(keyword_id, '')
    )
  ) STORED;

CREATE INDEX IF NOT EXISTS items_search_idx ON public.items USING GIN(tsvector_search);
CREATE INDEX IF NOT EXISTS items_firm_created_idx ON public.items(firm_id, created_at);
CREATE INDEX IF NOT EXISTS items_firm_vertical_idx ON public.items(firm_id, vertical_id);
CREATE INDEX IF NOT EXISTS items_firm_brand_idx ON public.items(firm_id, brand_id);

-- 1B: keyword_id auto-generator trigger (preserves stock formula untouched)
CREATE OR REPLACE FUNCTION generate_keyword_id()
RETURNS TRIGGER AS $$
DECLARE
  brand_slug text;
  vertical_slug text;
  item_slug text;
  candidate text;
  counter int := 0;
  final_id text;
BEGIN
  SELECT UPPER(REGEXP_REPLACE(name, '[^a-zA-Z0-9]', '', 'g'))
    INTO brand_slug FROM public.brands WHERE id = NEW.brand_id;
  SELECT UPPER(REGEXP_REPLACE(name, '[^a-zA-Z0-9]', '', 'g'))
    INTO vertical_slug FROM public.verticals WHERE id = NEW.vertical_id;
  item_slug := UPPER(REGEXP_REPLACE(NEW.item_name, '[^a-zA-Z0-9]', '', 'g'));
  candidate := COALESCE(brand_slug,'GEN') || '-' || COALESCE(vertical_slug,'CAT') || '-' || item_slug;
  final_id := candidate;
  WHILE EXISTS (SELECT 1 FROM public.items WHERE keyword_id = final_id AND id != NEW.id) LOOP
    counter := counter + 1;
    final_id := candidate || '-' || counter::text;
  END LOOP;
  NEW.keyword_id := final_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_keyword_id
  BEFORE INSERT ON public.items
  FOR EACH ROW
  WHEN (NEW.keyword_id IS NULL)
  EXECUTE FUNCTION generate_keyword_id();

-- 1C: Backfill keyword_id for existing items
UPDATE public.items SET keyword_id = NULL WHERE keyword_id IS NULL;
-- (trigger fires on next touch — or run a manual backfill function below)

CREATE OR REPLACE FUNCTION backfill_keyword_ids()
RETURNS void AS $$
DECLARE
  r RECORD;
  brand_slug text;
  vertical_slug text;
  item_slug text;
  candidate text;
  final_id text;
  counter int;
BEGIN
  FOR r IN SELECT * FROM public.items WHERE keyword_id IS NULL LOOP
    counter := 0;
    SELECT UPPER(REGEXP_REPLACE(name, '[^a-zA-Z0-9]', '', 'g'))
      INTO brand_slug FROM public.brands WHERE id = r.brand_id;
    SELECT UPPER(REGEXP_REPLACE(name, '[^a-zA-Z0-9]', '', 'g'))
      INTO vertical_slug FROM public.verticals WHERE id = r.vertical_id;
    item_slug := UPPER(REGEXP_REPLACE(r.item_name, '[^a-zA-Z0-9]', '', 'g'));
    candidate := COALESCE(brand_slug,'GEN') || '-' || COALESCE(vertical_slug,'CAT') || '-' || item_slug;
    final_id := candidate;
    WHILE EXISTS (SELECT 1 FROM public.items WHERE keyword_id = final_id) LOOP
      counter := counter + 1;
      final_id := candidate || '-' || counter::text;
    END LOOP;
    UPDATE public.items SET keyword_id = final_id WHERE id = r.id;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

SELECT backfill_keyword_ids();
________________________________________________________
Task 2- Stock movement tables
___________________________________________________________

CREATE TABLE IF NOT EXISTS public.stock_movements (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  firm_id uuid NOT NULL REFERENCES public.firms(id),
  item_id bigint NOT NULL REFERENCES public.items(id),
  movement_type text NOT NULL
    CHECK (movement_type IN ('sale','purchase','transfer','loss','adjustment','return')),
  qty_change integer NOT NULL,         -- negative = out, positive = in
  parcel_change integer,               -- mirrors qty in parcel units
  from_location_id bigint,             -- NULL until location tables exist
  to_location_id bigint,
  order_id bigint REFERENCES public.orders(id) ON DELETE SET NULL,
  purchase_order_id bigint REFERENCES public.purchase_orders(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

CREATE INDEX stock_movements_item_idx ON public.stock_movements(item_id);
CREATE INDEX stock_movements_firm_idx ON public.stock_movements(firm_id, created_at);
CREATE INDEX stock_movements_type_idx ON public.stock_movements(movement_type);

-- RLS
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "firm_read_movements" ON public.stock_movements
  FOR SELECT USING (firm_id = get_my_firm_id());

CREATE POLICY "firm_insert_movements" ON public.stock_movements
  FOR INSERT WITH CHECK (firm_id = get_my_firm_id());

CREATE POLICY "owner_update_movements" ON public.stock_movements
  FOR UPDATE USING (
    firm_id = get_my_firm_id() AND
    EXISTS (
      SELECT 1 FROM public.firm_users
      WHERE user_id = auth.uid()
      AND role IN ('master_admin','store_owner')
    )
  );

___________________________________________________________________
Task 3 — Location System (3-Layer, Unstructured-Store Compatible)
______________________________________________________________________________

-- LAYER 1: Storage Places (your 3 locations)
CREATE TABLE IF NOT EXISTS public.storage_places (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  firm_id uuid NOT NULL REFERENCES public.firms(id),
  place_name text NOT NULL,      -- "KT Shop", "Shop N2", "Warehouse"
  place_slug text NOT NULL,      -- "KT", "N2", "WH1"
  place_type text NOT NULL DEFAULT 'shop'
    CHECK (place_type IN ('shop','warehouse','godown')),
  floor_count integer NOT NULL DEFAULT 1,
  svg_layout_path text,          -- Inkscape SVG file reference
  notes text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(firm_id, place_slug)
);

-- LAYER 2: Zones (named sections, no grid required)
CREATE TABLE IF NOT EXISTS public.storage_zones (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  firm_id uuid NOT NULL REFERENCES public.firms(id),
  place_id bigint NOT NULL REFERENCES public.storage_places(id),
  floor_num integer NOT NULL DEFAULT 0,
  zone_name text NOT NULL,       -- "Front Section", "Back Wall", "Near Door"
  zone_slug text NOT NULL,       -- "FR", "BK", "ND"
  zone_label text,               -- auto: "KT-F0-FR"
  svg_region_id text,            -- matches Inkscape path id for highlight
  -- CCTV FUTURE: cctv_feed_url text, pixel_watch_enabled boolean DEFAULT false,
  -- master_snapshot_url text, change_threshold_pct numeric DEFAULT 10
  notes text,
  UNIQUE(place_id, floor_num, zone_slug)
);

CREATE OR REPLACE FUNCTION set_zone_label()
RETURNS TRIGGER AS $$
DECLARE v_slug text;
BEGIN
  SELECT place_slug INTO v_slug FROM public.storage_places WHERE id = NEW.place_id;
  NEW.zone_label := v_slug || '-F' || NEW.floor_num || '-' || NEW.zone_slug;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_zone_label
  BEFORE INSERT OR UPDATE ON public.storage_zones
  FOR EACH ROW EXECUTE FUNCTION set_zone_label();

-- LAYER 3: Slots (free-text named spots — no shelves needed)
CREATE TABLE IF NOT EXISTS public.storage_slots (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  firm_id uuid NOT NULL REFERENCES public.firms(id),
  zone_id bigint NOT NULL REFERENCES public.storage_zones(id),
  slot_name text NOT NULL,       -- "Stack A", "Corner Pile", "Near Blue Door"
  slot_label text,               -- auto: "KT-F0-FR-STACK_A"
  capacity_parcels integer,      -- NULL = chaotic/unknown, fine for now
  -- CCTV FUTURE:
  -- voxel_x_min int, voxel_x_max int,
  -- voxel_y_min int, voxel_y_max int,
  -- master_image_url text,
  -- last_activity_detected_at timestamptz,
  notes text
);

CREATE OR REPLACE FUNCTION set_slot_label()
RETURNS TRIGGER AS $$
DECLARE v_zone_label text;
BEGIN
  SELECT zone_label INTO v_zone_label FROM public.storage_zones WHERE id = NEW.zone_id;
  NEW.slot_label := v_zone_label || '-' || UPPER(REPLACE(NEW.slot_name,' ','_'));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_slot_label
  BEFORE INSERT OR UPDATE ON public.storage_slots
  FOR EACH ROW EXECUTE FUNCTION set_slot_label();

-- LINK: Items ↔ Slots
CREATE TABLE IF NOT EXISTS public.item_locations (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  firm_id uuid NOT NULL REFERENCES public.firms(id),
  item_id bigint NOT NULL REFERENCES public.items(id),
  slot_id bigint NOT NULL REFERENCES public.storage_slots(id),
  parcel_count integer NOT NULL DEFAULT 0,
  is_primary boolean DEFAULT true,
  last_verified_at timestamptz,
  -- CCTV FUTURE: synced_from_pixel_watch boolean DEFAULT false
  updated_at timestamptz DEFAULT now(),
  UNIQUE(item_id, slot_id)
);

-- RLS for location tables
ALTER TABLE public.storage_places ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.storage_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.storage_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.item_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "firm_all_places" ON public.storage_places
  FOR ALL USING (firm_id = get_my_firm_id());
CREATE POLICY "firm_all_zones" ON public.storage_zones
  FOR ALL USING (firm_id = get_my_firm_id());
CREATE POLICY "firm_all_slots" ON public.storage_slots
  FOR ALL USING (firm_id = get_my_firm_id());
CREATE POLICY "firm_all_item_locations" ON public.item_locations
  FOR ALL USING (firm_id = get_my_firm_id());

-- Update stock_movements FKs now that location tables exist
ALTER TABLE public.stock_movements
  ADD CONSTRAINT fk_from_location
    FOREIGN KEY (from_location_id) REFERENCES public.storage_slots(id) ON DELETE SET NULL,
  ADD CONSTRAINT fk_to_location
    FOREIGN KEY (to_location_id) REFERENCES public.storage_slots(id) ON DELETE SET NULL;


__________________________________________________________

Task 4 — RLS Hardening (Existing Tables)
___________________________________________________________________

-- Uses your existing get_my_firm_id() function — no changes to that

-- Items
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "firm_read_items" ON public.items;
DROP POLICY IF EXISTS "owner_write_items" ON public.items;

CREATE POLICY "firm_read_items" ON public.items
  FOR SELECT USING (firm_id = get_my_firm_id());
CREATE POLICY "firm_write_items" ON public.items
  FOR ALL USING (firm_id = get_my_firm_id());

-- Orders
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "firm_all_orders" ON public.orders
  FOR ALL USING (firm_id = get_my_firm_id());

-- Order items (no firm_id — inherit via order)
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "firm_order_items" ON public.order_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_items.order_id
      AND o.firm_id = get_my_firm_id()
    )
  );

-- Purchase orders
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "firm_all_purchase_orders" ON public.purchase_orders
  FOR ALL USING (firm_id = get_my_firm_id());

-- Costs + Account — owner only
ALTER TABLE public.costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner_only_costs" ON public.costs
  FOR ALL USING (
    firm_id = get_my_firm_id() AND
    EXISTS (
      SELECT 1 FROM public.firm_users
      WHERE user_id = auth.uid() AND role = 'master_admin'
    )
  );
CREATE POLICY "owner_only_account" ON public.account
  FOR ALL USING (
    firm_id = get_my_firm_id() AND
    EXISTS (
      SELECT 1 FROM public.firm_users
      WHERE user_id = auth.uid() AND role = 'master_admin'
    )
  );

-- Prospects, brands, verticals, routes — all firm users
ALTER TABLE public.prospects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verticals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.routes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "firm_all_prospects" ON public.prospects FOR ALL USING (firm_id = get_my_firm_id());
CREATE POLICY "firm_all_brands" ON public.brands FOR ALL USING (firm_id = get_my_firm_id());
CREATE POLICY "firm_all_verticals" ON public.verticals FOR ALL USING (firm_id = get_my_firm_id());
CREATE POLICY "firm_all_routes" ON public.routes FOR ALL USING (firm_id = get_my_firm_id());
