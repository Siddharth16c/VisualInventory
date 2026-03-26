-- ─── Migration 002: Packaging System ──────────────────────────────────────────
-- Purpose: Adds storage_packages table for custom inventory containers
--          (gunny bags, boxes, carry bags, etc.) placed in warehouse zones.
--          Also adds place_stock capability via item_locations improvements.
--
-- Run in Supabase SQL Editor
-- Generated: 2026-03-10

-- ─── storage_packages ─────────────────────────────────────────────────────────
-- Represents a physical container holding multiple items within a zone/slot.
-- Examples: "Gunny Bag #1 (Holi Pichkari Set)", "Brown Box - Fancy Fireworks"
CREATE TABLE IF NOT EXISTS storage_packages (
    id          bigserial PRIMARY KEY,
    firm_id     uuid NOT NULL REFERENCES firms(id) ON DELETE CASCADE,

    -- Location (zone required, slot optional)
    zone_id     bigint REFERENCES storage_zones(id) ON DELETE SET NULL,
    slot_id     bigint REFERENCES storage_slots(id) ON DELETE SET NULL,

    -- Package identity
    -- package_type is a static enum stored as text (no separate table needed)
    -- Valid values: 'gunny_bag' | 'cardboard_box' | 'carry_bag' | 'open_tying'
    --              | 'crate' | 'sack' | 'polythene_bundle' | 'wooden_crate' | 'other'
    package_type    text NOT NULL DEFAULT 'other',
    package_label   text,           -- Free text: "Holi Pichkari Large", "Murga Powder Holi"
    description     text,           -- Any notes about what's inside

    -- Categorisation (optional, for grouping by vertical)
    vertical_id bigint REFERENCES verticals(id) ON DELETE SET NULL,

    -- Soft delete
    created_at  timestamptz DEFAULT now(),
    deleted_at  timestamptz
);

-- ─── package_items ────────────────────────────────────────────────────────────
-- Junction table: which items (from inventory) are inside a storage_package
CREATE TABLE IF NOT EXISTS package_items (
    id          bigserial PRIMARY KEY,
    package_id  bigint NOT NULL REFERENCES storage_packages(id) ON DELETE CASCADE,
    item_id     bigint NOT NULL REFERENCES items(id) ON DELETE CASCADE,

    -- Quantity in this package
    parcel_count    integer NOT NULL DEFAULT 1 CHECK (parcel_count > 0),
    unit_count      integer,            -- Optional: individual units within parcels

    -- Link to the item_locations record (where this stock is drawn from)
    location_id     bigint REFERENCES item_locations(id) ON DELETE SET NULL,

    notes       text,
    created_at  timestamptz DEFAULT now()
);

-- ─── Row Level Security ────────────────────────────────────────────────────────
ALTER TABLE storage_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE package_items    ENABLE ROW LEVEL SECURITY;

-- Policies: Users can only see/modify packages for their firm
CREATE POLICY "storage_packages_firm_isolation" ON storage_packages
    USING (firm_id IN (
        SELECT firm_id FROM firm_users WHERE user_id = auth.uid()
    ));

CREATE POLICY "package_items_via_package" ON package_items
    USING (package_id IN (
        SELECT id FROM storage_packages
        WHERE firm_id IN (
            SELECT firm_id FROM firm_users WHERE user_id = auth.uid()
        )
    ));

-- ─── Indexes ──────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_storage_packages_firm_id     ON storage_packages(firm_id);
CREATE INDEX IF NOT EXISTS idx_storage_packages_zone_id     ON storage_packages(zone_id);
CREATE INDEX IF NOT EXISTS idx_storage_packages_deleted_at  ON storage_packages(deleted_at);
CREATE INDEX IF NOT EXISTS idx_package_items_package_id     ON package_items(package_id);
CREATE INDEX IF NOT EXISTS idx_package_items_item_id        ON package_items(item_id);

-- ─── storage_places: add dimension columns for dynamic scaling ────────────────
-- Allows users to set real-world dimensions so the 3D canvas matches reality
ALTER TABLE storage_places
    ADD COLUMN IF NOT EXISTS width_meters  numeric(8,2) DEFAULT 20.0,
    ADD COLUMN IF NOT EXISTS depth_meters  numeric(8,2) DEFAULT 20.0;

-- ─── Verification ─────────────────────────────────────────────────────────────
SELECT 'Migration 002 complete' AS status;
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('storage_packages', 'package_items');
