-- Add token_quota column to account_fiscal_quotas table
-- Phase: Move Token Quota to Fiscal Quotas

ALTER TABLE account_fiscal_quotas
  ADD COLUMN token_quota NUMERIC;

COMMENT ON COLUMN account_fiscal_quotas.token_quota IS 'Token quota for the fiscal year (only relevant for Enterprise Business Agreement contracts)';

-- Update table comment
COMMENT ON TABLE account_fiscal_quotas IS 'ACV quotas and token quotas for accounts across multiple fiscal years';
