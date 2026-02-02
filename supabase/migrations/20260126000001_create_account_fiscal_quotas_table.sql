-- Create account_fiscal_quotas table for tracking ACV quotas across fiscal years
-- Phase: Account Management Enhancements

CREATE TABLE account_fiscal_quotas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  fiscal_year INTEGER NOT NULL,
  acv_quota NUMERIC NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(account_id, fiscal_year)
);

CREATE INDEX idx_account_fiscal_quotas_account_id ON account_fiscal_quotas(account_id);
CREATE INDEX idx_account_fiscal_quotas_fiscal_year ON account_fiscal_quotas(fiscal_year);

COMMENT ON TABLE account_fiscal_quotas IS 'ACV quotas for accounts across multiple fiscal years';
COMMENT ON COLUMN account_fiscal_quotas.fiscal_year IS 'Fiscal year as integer (e.g., 2025, 2026)';
COMMENT ON COLUMN account_fiscal_quotas.acv_quota IS 'ACV quota amount for the fiscal year';

-- Enable Row Level Security
ALTER TABLE account_fiscal_quotas ENABLE ROW LEVEL SECURITY;

-- Permissive policy (allow all for single-user app)
CREATE POLICY "Allow all on account_fiscal_quotas" ON account_fiscal_quotas FOR ALL USING (true);
