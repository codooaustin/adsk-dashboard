-- Add composite index for events chart queries
-- Optimizes queries filtering by account_id, product_name, and event_date

CREATE INDEX IF NOT EXISTS idx_acc_bim360_raw_chart_query 
  ON acc_bim360_raw(account_id, product_name, event_date) 
  WHERE event_date IS NOT NULL AND product_name IS NOT NULL;

COMMENT ON INDEX idx_acc_bim360_raw_chart_query IS 'Composite index for optimized events chart queries on acc_bim360_raw table';
