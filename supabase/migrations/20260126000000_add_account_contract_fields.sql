-- Add contract and logo fields to accounts table
-- Phase: Account Management Enhancements

ALTER TABLE accounts
  ADD COLUMN logo_url TEXT,
  ADD COLUMN contract_type TEXT CHECK (contract_type IN ('Enterprise Business Agreement', 'Named User Subscriptions')),
  ADD COLUMN contract_start_date DATE,
  ADD COLUMN contract_end_date DATE,
  ADD COLUMN annual_contract_value NUMERIC;

COMMENT ON COLUMN accounts.logo_url IS 'URL to logo stored in Supabase Storage';
COMMENT ON COLUMN accounts.contract_type IS 'Type: Enterprise Business Agreement or Named User Subscriptions';
COMMENT ON COLUMN accounts.contract_start_date IS 'Contract start date';
COMMENT ON COLUMN accounts.contract_end_date IS 'Contract end date';
COMMENT ON COLUMN accounts.annual_contract_value IS 'Annual Contract Value (ACV) amount';
