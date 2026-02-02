-- Product names: distinct product_name from raw tables only. Display labels and tags for dashboard.
-- No usage_facts or product_key. One row per unique product_name.

CREATE TABLE product_names (
  product_name TEXT PRIMARY KEY,
  display_label TEXT,
  tag TEXT
);

CREATE INDEX idx_product_names_tag ON product_names(tag);

COMMENT ON TABLE product_names IS 'Distinct product_name from raw tables; display_label and tag for dashboard';
COMMENT ON COLUMN product_names.display_label IS 'User-defined label for filters/legends; NULL = use product_name';
COMMENT ON COLUMN product_names.tag IS 'Grouping tag; when "group by tag" is on, aggregate series by tag. NULL = ungrouped';

ALTER TABLE product_names ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all on product_names" ON product_names FOR ALL USING (true);
