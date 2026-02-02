-- Create quota_attainment_transactions table for storing all quota attainment transaction data
-- Phase: Quota Attainment Tracking System

CREATE TABLE quota_attainment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  upload_batch_id UUID NOT NULL,
  commission_month TEXT NOT NULL,
  transaction_date DATE,
  fiscal_year INTEGER,
  final_credited_amount NUMERIC,
  
  -- Core fields from spreadsheet
  sales_rep_name TEXT,
  agreement_id TEXT,
  quota TEXT,
  adsk_data_source TEXT,
  src_id TEXT,
  account_type TEXT,
  corporate_account_name TEXT,
  corporate_account_csn TEXT,
  end_user_trade_number TEXT,
  end_user_name TEXT,
  sales_channel TEXT,
  sales_team TEXT,
  consulting_indicator TEXT,
  order_number TEXT,
  customer_po_number TEXT,
  original_order_date DATE,
  wws_geo TEXT,
  wws_area TEXT,
  wws_sub_area TEXT,
  offer_detail TEXT,
  solutions_division TEXT,
  market_group TEXT,
  product_class TEXT,
  material_group TEXT,
  etr_indicator TEXT,
  sold_to_customer_number TEXT,
  sold_to_customer_name TEXT,
  dealer_number TEXT,
  dealer_account_name TEXT,
  dealer_country TEXT,
  end_user_trade_country_cd TEXT,
  end_user_trade_state_province_cd TEXT,
  end_user_trade_city TEXT,
  end_user_trade_zip TEXT,
  ship_to_state_region TEXT,
  territory_acs TEXT,
  territory_aec TEXT,
  territory_mfg TEXT,
  territory_me TEXT,
  territory_delcam TEXT,
  territory_innovyze TEXT,
  currency_code TEXT,
  contract_start_date DATE,
  contract_end_date DATE,
  settlement_start_date DATE,
  settlement_end_date DATE,
  invoice_amt_dc NUMERIC,
  total_days INTEGER,
  annual_inv_amt_dc NUMERIC,
  trigger_multiplier NUMERIC,
  plan_currency TEXT,
  multiplier_factor NUMERIC,
  spiff_multiplier NUMERIC,
  assignment_multiplier NUMERIC,
  manual_transaction TEXT,
  territory_channel TEXT,
  invoice_cycle_nbr TEXT,
  product_from TEXT,
  bsm_estore_order_origin TEXT,
  offer_category TEXT,
  load_date DATE,
  early_renewal_multiplier NUMERIC,
  premium_boost_multiplier NUMERIC,
  trigger_id TEXT,
  portfolio_name TEXT,
  
  uploaded_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX idx_quota_attainment_transactions_account_id ON quota_attainment_transactions(account_id);
CREATE INDEX idx_quota_attainment_transactions_fiscal_year ON quota_attainment_transactions(fiscal_year);
CREATE INDEX idx_quota_attainment_transactions_commission_month ON quota_attainment_transactions(commission_month);
CREATE INDEX idx_quota_attainment_transactions_transaction_date ON quota_attainment_transactions(transaction_date);
CREATE INDEX idx_quota_attainment_transactions_account_fiscal_year ON quota_attainment_transactions(account_id, fiscal_year);
CREATE INDEX idx_quota_attainment_transactions_upload_batch_id ON quota_attainment_transactions(upload_batch_id);

COMMENT ON TABLE quota_attainment_transactions IS 'Transaction-level quota attainment data from uploaded Excel spreadsheets';
COMMENT ON COLUMN quota_attainment_transactions.account_id IS 'The Account this transaction belongs to';
COMMENT ON COLUMN quota_attainment_transactions.upload_batch_id IS 'The upload batch this transaction came from';
COMMENT ON COLUMN quota_attainment_transactions.commission_month IS 'Month name from spreadsheet (e.g., "January")';
COMMENT ON COLUMN quota_attainment_transactions.transaction_date IS 'Transaction Date converted from Excel serial date';
COMMENT ON COLUMN quota_attainment_transactions.fiscal_year IS 'Calculated fiscal year (Feb-Jan: Jan 2026 = FY 2025)';
COMMENT ON COLUMN quota_attainment_transactions.final_credited_amount IS 'Final Credited Amnt - the amount used for quota retirement';
COMMENT ON COLUMN quota_attainment_transactions.corporate_account_name IS 'Original Corporate Account Name from spreadsheet for audit purposes';

-- Enable Row Level Security
ALTER TABLE quota_attainment_transactions ENABLE ROW LEVEL SECURITY;

-- Permissive policy (allow all for single-user app)
CREATE POLICY "Allow all on quota_attainment_transactions" ON quota_attainment_transactions FOR ALL USING (true);
