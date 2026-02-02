-- Add color to product_names for chart styling.

ALTER TABLE product_names ADD COLUMN color TEXT;

COMMENT ON COLUMN product_names.color IS 'Hex color (#rrggbb) for charts; NULL = use default palette.';
