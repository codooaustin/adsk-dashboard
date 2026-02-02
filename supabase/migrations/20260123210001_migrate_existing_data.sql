-- Optional migration: Backfill raw tables from existing usage_facts
-- This is optional - new uploads will use the optimized flow automatically
-- Only run this if you want to backfill raw tables from existing normalized data

-- Note: This migration is intentionally minimal because:
-- 1. Raw tables preserve original data structure which may not be fully reconstructable from normalized data
-- 2. New uploads will automatically use the optimized raw table flow
-- 3. Existing usage_facts data remains accessible for queries

-- If you need to backfill raw tables, you would need to:
-- 1. Query usage_facts grouped by dataset_id
-- 2. Attempt to reconstruct raw format from dimensions JSONB
-- 3. Insert into appropriate raw table
-- 
-- However, this is complex and lossy, so it's recommended to:
-- - Keep existing usage_facts as-is
-- - Use new optimized flow for all new uploads
-- - Raw tables will be populated going forward

-- This migration file exists to document the approach but does not perform backfill
-- If backfill is needed in the future, implement it based on specific requirements

COMMENT ON TABLE acc_bim360_raw IS 'Raw ACC/BIM360 data. New uploads populate this table for fast ingestion.';
COMMENT ON TABLE daily_user_cloud_raw IS 'Raw daily user cloud data. New uploads populate this table for fast ingestion.';
COMMENT ON TABLE daily_user_desktop_raw IS 'Raw daily user desktop data. New uploads populate this table for fast ingestion.';
COMMENT ON TABLE manual_adjustments_raw IS 'Raw manual adjustments data. New uploads populate this table for fast ingestion.';
