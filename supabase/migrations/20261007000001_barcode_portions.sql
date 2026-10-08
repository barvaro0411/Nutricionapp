-- Nullable metadata preserves legacy entries without guessing their units or portions.
ALTER TABLE public.barcode_products
  ADD COLUMN IF NOT EXISTS unit text CHECK (unit IN ('g','ml')),
  ADD COLUMN IF NOT EXISTS container_size numeric CHECK (container_size > 0 AND container_size <= 20000),
  ADD COLUMN IF NOT EXISTS quantity_text text CHECK (length(quantity_text) <= 300);

NOTIFY pgrst, 'reload schema';
