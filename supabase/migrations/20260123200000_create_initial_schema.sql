-- Create initial database schema for account management app
-- Phase 2: Data Layer Setup

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Accounts table
CREATE TABLE accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  sfdc_account_id TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX idx_accounts_slug ON accounts(slug);
CREATE INDEX idx_accounts_name ON accounts(name);

COMMENT ON TABLE accounts IS 'Customer accounts managed by the Enterprise Account Manager';
COMMENT ON COLUMN accounts.slug IS 'URL-friendly identifier used in routes';
COMMENT ON COLUMN accounts.sfdc_account_id IS 'Salesforce Account ID (optional)';

-- Datasets table
CREATE TABLE datasets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  dataset_type TEXT NOT NULL CHECK (dataset_type IN ('acc_bim360', 'daily_user_cloud', 'daily_user_desktop', 'manual_adjustments')),
  original_filename TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  uploaded_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'processed', 'failed')),
  detected_headers JSONB,
  min_date DATE,
  max_date DATE,
  row_count INTEGER,
  error_message TEXT
);

CREATE INDEX idx_datasets_account_id ON datasets(account_id);
CREATE INDEX idx_datasets_status ON datasets(status);
CREATE INDEX idx_datasets_type ON datasets(dataset_type);
CREATE INDEX idx_datasets_uploaded_at ON datasets(uploaded_at DESC);

COMMENT ON TABLE datasets IS 'Metadata for uploaded usage data files';
COMMENT ON COLUMN datasets.dataset_type IS 'Type: acc_bim360, daily_user_cloud, daily_user_desktop, manual_adjustments';
COMMENT ON COLUMN datasets.detected_headers IS 'JSON array of column names from first row of uploaded file';
COMMENT ON COLUMN datasets.status IS 'Processing status: queued, processed, or failed';

-- Usage facts table (canonical, normalized daily facts)
CREATE TABLE usage_facts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  dataset_id UUID NOT NULL REFERENCES datasets(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  dataset_type TEXT NOT NULL,
  product_key TEXT NOT NULL,
  user_key TEXT NOT NULL,
  project_key TEXT,
  metric_tokens NUMERIC,
  metric_events INTEGER,
  usage_hours NUMERIC,
  use_count INTEGER,
  dimensions JSONB
);

CREATE INDEX idx_usage_facts_account_id ON usage_facts(account_id);
CREATE INDEX idx_usage_facts_dataset_id ON usage_facts(dataset_id);
CREATE INDEX idx_usage_facts_date ON usage_facts(date);
CREATE INDEX idx_usage_facts_product_key ON usage_facts(product_key);
CREATE INDEX idx_usage_facts_user_key ON usage_facts(user_key);
CREATE INDEX idx_usage_facts_account_date ON usage_facts(account_id, date);

COMMENT ON TABLE usage_facts IS 'Canonical, normalized daily facts table for all usage data';
COMMENT ON COLUMN usage_facts.product_key IS 'Normalized product identifier (references products table)';
COMMENT ON COLUMN usage_facts.user_key IS 'Normalized user identifier (typically email)';
COMMENT ON COLUMN usage_facts.dimensions IS 'Additional context stored as JSON (e.g., project details, feature categories)';

-- Products table
CREATE TABLE products (
  product_key TEXT PRIMARY KEY,
  canonical_name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('Construction', 'Cloud', 'Desktop')),
  color TEXT,
  logo_url TEXT,
  sort_order INTEGER DEFAULT 0
);

CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_sort_order ON products(sort_order);

COMMENT ON TABLE products IS 'Product catalog with canonical names, colors, and logos';
COMMENT ON COLUMN products.product_key IS 'Unique identifier used in usage_facts (e.g., normalized product name)';
COMMENT ON COLUMN products.color IS 'Hex color code for charts and visualizations';

-- Product aliases table
CREATE TABLE product_aliases (
  alias TEXT PRIMARY KEY,
  product_key TEXT NOT NULL REFERENCES products(product_key) ON DELETE CASCADE
);

CREATE INDEX idx_product_aliases_product_key ON product_aliases(product_key);

COMMENT ON TABLE product_aliases IS 'Maps various product name variations to canonical product_key';

-- Enable Row Level Security (permissive for single-user app)
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE datasets ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_facts ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_aliases ENABLE ROW LEVEL SECURITY;

-- Permissive policies (allow all for single-user app)
CREATE POLICY "Allow all on accounts" ON accounts FOR ALL USING (true);
CREATE POLICY "Allow all on datasets" ON datasets FOR ALL USING (true);
CREATE POLICY "Allow all on usage_facts" ON usage_facts FOR ALL USING (true);
CREATE POLICY "Allow all on products" ON products FOR ALL USING (true);
CREATE POLICY "Allow all on product_aliases" ON product_aliases FOR ALL USING (true);
