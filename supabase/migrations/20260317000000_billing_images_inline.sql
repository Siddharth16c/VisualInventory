-- Store images directly in database (base64 encoded)
-- No external storage buckets needed - works offline with SQLite WASM

-- Add thumbnail_base64 to items table (64x64 WebP ~5-10KB)
ALTER TABLE public.items 
ADD COLUMN IF NOT EXISTS thumbnail_base64 TEXT;

-- Add icon_base64 to verticals table (48x48 WebP ~3-5KB)
ALTER TABLE public.verticals
ADD COLUMN IF NOT EXISTS icon_base64 TEXT;

-- Add marketing_images to items for catalogue/sharing (JSON array of base64)
ALTER TABLE public.items
ADD COLUMN IF NOT EXISTS marketing_images JSONB DEFAULT '[]';

-- marketing_images structure:
-- [
--   { "type": "image", "data": "base64...", "width": 800, "height": 600 },
--   { "type": "video", "data": "base64...", "thumbnail": "base64..." }
-- ]

-- Add bill_format column to bills table
ALTER TABLE public.bills
ADD COLUMN IF NOT EXISTS bill_format TEXT DEFAULT 'a4' CHECK (bill_format IN ('a4', 'thermal', 'receipt'));

-- Add credit_amount and is_paid to orders for payment tracking
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS credit_amount NUMERIC DEFAULT 0;

ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS is_paid BOOLEAN DEFAULT false;

-- Update existing orders' is_paid based on payment_status
UPDATE public.orders
SET is_paid = (payment_status = 'paid')
WHERE is_paid IS NULL;

-- Create indexes for faster unpaid bills query
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON public.orders(payment_status) WHERE payment_status != 'paid';
CREATE INDEX IF NOT EXISTS idx_orders_is_paid ON public.orders(is_paid) WHERE is_paid = false;
CREATE INDEX IF NOT EXISTS idx_orders_firm_date ON public.orders(firm_id, order_date DESC);

-- Comments
COMMENT ON COLUMN public.items.thumbnail_base64 IS 'Base64 encoded WebP thumbnail (64x64px)';
COMMENT ON COLUMN public.verticals.icon_base64 IS 'Base64 encoded WebP icon (48x48px)';
COMMENT ON COLUMN public.items.marketing_images IS 'JSON array of marketing images/videos for catalogue';
COMMENT ON COLUMN public.orders.credit_amount IS 'Amount pending to be paid (grand_total - paid_amount)';
COMMENT ON COLUMN public.orders.is_paid IS 'Computed from payment_status for quick filtering';