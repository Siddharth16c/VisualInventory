-- Add sort_order column to verticals table for custom ordering

ALTER TABLE verticals ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

COMMENT ON COLUMN verticals.sort_order IS 'Sort order for verticals (lower = first)';
