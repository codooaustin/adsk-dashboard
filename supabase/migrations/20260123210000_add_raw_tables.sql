-- Create raw tables for fast ingestion
-- Phase 3 Optimization: Raw tables + batch normalization

-- ACC/BIM360 raw table (event-based data)
CREATE TABLE acc_bim360_raw (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dataset_id UUID NOT NULL REFERENCES datasets(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  event_date DATE NOT NULL,
  user_email TEXT NOT NULL,
  project_name TEXT,
  product_name TEXT NOT NULL,
  feature_category TEXT,
  project_id TEXT,
  raw_data JSONB,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX idx_acc_bim360_raw_dataset_id ON acc_bim360_raw(dataset_id);
CREATE INDEX idx_acc_bim360_raw_account_id ON acc_bim360_raw(account_id);
CREATE INDEX idx_acc_bim360_raw_event_date ON acc_bim360_raw(event_date);
CREATE INDEX idx_acc_bim360_raw_account_date ON acc_bim360_raw(account_id, event_date);

COMMENT ON TABLE acc_bim360_raw IS 'Raw ACC/BIM360 event-based data before normalization';
COMMENT ON COLUMN acc_bim360_raw.raw_data IS 'Additional fields not captured in structured columns';

-- Daily User Cloud raw table
CREATE TABLE daily_user_cloud_raw (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dataset_id UUID NOT NULL REFERENCES datasets(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  usage_date DATE NOT NULL,
  product_name TEXT NOT NULL,
  user_name TEXT NOT NULL,
  tokens_consumed NUMERIC,
  raw_data JSONB,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX idx_daily_user_cloud_raw_dataset_id ON daily_user_cloud_raw(dataset_id);
CREATE INDEX idx_daily_user_cloud_raw_account_id ON daily_user_cloud_raw(account_id);
CREATE INDEX idx_daily_user_cloud_raw_usage_date ON daily_user_cloud_raw(usage_date);
CREATE INDEX idx_daily_user_cloud_raw_account_date ON daily_user_cloud_raw(account_id, usage_date);

COMMENT ON TABLE daily_user_cloud_raw IS 'Raw daily user cloud consumption data before normalization';

-- Daily User Desktop raw table
CREATE TABLE daily_user_desktop_raw (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dataset_id UUID NOT NULL REFERENCES datasets(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  usage_date DATE NOT NULL,
  product_name TEXT NOT NULL,
  product_version TEXT,
  user_name TEXT NOT NULL,
  machine_name TEXT,
  license_server_name TEXT,
  tokens_consumed NUMERIC,
  usage_hours NUMERIC,
  use_count INTEGER,
  raw_data JSONB,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX idx_daily_user_desktop_raw_dataset_id ON daily_user_desktop_raw(dataset_id);
CREATE INDEX idx_daily_user_desktop_raw_account_id ON daily_user_desktop_raw(account_id);
CREATE INDEX idx_daily_user_desktop_raw_usage_date ON daily_user_desktop_raw(usage_date);
CREATE INDEX idx_daily_user_desktop_raw_account_date ON daily_user_desktop_raw(account_id, usage_date);

COMMENT ON TABLE daily_user_desktop_raw IS 'Raw daily user desktop usage data before normalization';

-- Manual Adjustments raw table
CREATE TABLE manual_adjustments_raw (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dataset_id UUID NOT NULL REFERENCES datasets(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  usage_date DATE NOT NULL,
  transaction_date DATE,
  reason_type TEXT,
  product_name TEXT,
  reason_comment TEXT,
  tokens_consumed NUMERIC,
  raw_data JSONB,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX idx_manual_adjustments_raw_dataset_id ON manual_adjustments_raw(dataset_id);
CREATE INDEX idx_manual_adjustments_raw_account_id ON manual_adjustments_raw(account_id);
CREATE INDEX idx_manual_adjustments_raw_usage_date ON manual_adjustments_raw(usage_date);
CREATE INDEX idx_manual_adjustments_raw_account_date ON manual_adjustments_raw(account_id, usage_date);

COMMENT ON TABLE manual_adjustments_raw IS 'Raw manual adjustment data before normalization';

-- Enable RLS on raw tables
ALTER TABLE acc_bim360_raw ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_user_cloud_raw ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_user_desktop_raw ENABLE ROW LEVEL SECURITY;
ALTER TABLE manual_adjustments_raw ENABLE ROW LEVEL SECURITY;

-- Permissive policies (single-user app)
CREATE POLICY "Allow all on acc_bim360_raw" ON acc_bim360_raw FOR ALL USING (true);
CREATE POLICY "Allow all on daily_user_cloud_raw" ON daily_user_cloud_raw FOR ALL USING (true);
CREATE POLICY "Allow all on daily_user_desktop_raw" ON daily_user_desktop_raw FOR ALL USING (true);
CREATE POLICY "Allow all on manual_adjustments_raw" ON manual_adjustments_raw FOR ALL USING (true);
