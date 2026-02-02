-- Remove token_quota column from accounts table
-- Phase: Move Token Quota to Fiscal Quotas
-- Note: token_quota is now stored per fiscal year in account_fiscal_quotas table
-- token_quantity remains on accounts table as it doesn't change yearly

ALTER TABLE accounts
  DROP COLUMN IF EXISTS token_quota;
