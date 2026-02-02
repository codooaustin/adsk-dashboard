-- Product groups: aggregate multiple products into one dashboard series (e.g. Revit Suite = Revit + Revit LT)
-- Global groups only (no account_id)

CREATE TABLE product_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0
);

CREATE INDEX idx_product_groups_sort_order ON product_groups(sort_order);

CREATE TABLE product_group_members (
  group_id UUID NOT NULL REFERENCES product_groups(id) ON DELETE CASCADE,
  product_key TEXT NOT NULL REFERENCES products(product_key) ON DELETE CASCADE,
  PRIMARY KEY (group_id, product_key)
);

CREATE INDEX idx_product_group_members_group ON product_group_members(group_id);
CREATE INDEX idx_product_group_members_product ON product_group_members(product_key);

ALTER TABLE product_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_group_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all on product_groups" ON product_groups FOR ALL USING (true);
CREATE POLICY "Allow all on product_group_members" ON product_group_members FOR ALL USING (true);
