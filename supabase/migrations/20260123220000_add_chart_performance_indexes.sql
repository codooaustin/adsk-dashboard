-- Add composite indexes for chart query performance
-- These indexes optimize filtered queries by account_id, product_name, and usage_date

-- Composite index for desktop raw table chart queries
-- Covers: account_id, product_name, usage_date with tokens_consumed filter
CREATE INDEX IF NOT EXISTS idx_daily_user_desktop_raw_chart_query 
  ON daily_user_desktop_raw(account_id, product_name, usage_date) 
  WHERE tokens_consumed IS NOT NULL;

-- Composite index for cloud raw table chart queries
-- Covers: account_id, product_name, usage_date with tokens_consumed filter
CREATE INDEX IF NOT EXISTS idx_daily_user_cloud_raw_chart_query 
  ON daily_user_cloud_raw(account_id, product_name, usage_date) 
  WHERE tokens_consumed IS NOT NULL;

COMMENT ON INDEX idx_daily_user_desktop_raw_chart_query IS 'Composite index for optimized chart queries on desktop raw table';
COMMENT ON INDEX idx_daily_user_cloud_raw_chart_query IS 'Composite index for optimized chart queries on cloud raw table';
