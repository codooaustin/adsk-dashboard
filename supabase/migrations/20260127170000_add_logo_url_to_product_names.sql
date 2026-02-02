-- Add logo_url to product_names for product management UI.

ALTER TABLE product_names ADD COLUMN logo_url TEXT;

COMMENT ON COLUMN product_names.logo_url IS 'URL to logo in storage; used in product management and optionally in charts.';
