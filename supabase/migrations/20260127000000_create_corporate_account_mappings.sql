-- Create corporate_account_mappings table for mapping Corporate Account Names to Accounts
-- Phase: Quota Attainment Tracking System

CREATE TABLE corporate_account_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  corporate_account_name TEXT NOT NULL UNIQUE,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX idx_corporate_account_mappings_corporate_account_name ON corporate_account_mappings(corporate_account_name);
CREATE INDEX idx_corporate_account_mappings_account_id ON corporate_account_mappings(account_id);

COMMENT ON TABLE corporate_account_mappings IS 'Maps Corporate Account Names from quota attainment spreadsheets to Accounts (many-to-one mapping)';
COMMENT ON COLUMN corporate_account_mappings.corporate_account_name IS 'The Corporate Account Name as it appears in the spreadsheet';
COMMENT ON COLUMN corporate_account_mappings.account_id IS 'The Account this Corporate Account Name maps to';

-- Enable Row Level Security
ALTER TABLE corporate_account_mappings ENABLE ROW LEVEL SECURITY;

-- Permissive policy (allow all for single-user app)
CREATE POLICY "Allow all on corporate_account_mappings" ON corporate_account_mappings FOR ALL USING (true);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_corporate_account_mappings_updated_at
  BEFORE UPDATE ON corporate_account_mappings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
