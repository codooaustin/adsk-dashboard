-- Add token quantity and token quota fields to accounts table for EBA contracts
-- Phase: Enhanced Date Pickers and EBA Token Fields

ALTER TABLE accounts
  ADD COLUMN token_quantity NUMERIC,
  ADD COLUMN token_quota NUMERIC;

COMMENT ON COLUMN accounts.token_quantity IS 'Token quantity for Enterprise Business Agreement (EBA) contracts';
COMMENT ON COLUMN accounts.token_quota IS 'Token quota for Enterprise Business Agreement (EBA) contracts';
