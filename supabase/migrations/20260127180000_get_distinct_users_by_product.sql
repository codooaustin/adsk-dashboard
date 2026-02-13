-- Distinct users per product over a date range (union of desktop and cloud)
-- Used for "cumulative unique users" in KPI table so the same user is not counted multiple times across months

CREATE OR REPLACE FUNCTION get_distinct_users_by_product(
  p_account_id UUID,
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL,
  p_product_names TEXT[] DEFAULT NULL
)
RETURNS TABLE (
  product_name TEXT,
  user_count BIGINT
)
LANGUAGE sql
STABLE
AS $$
  SELECT u.product_name, COUNT(DISTINCT u.user_name)::BIGINT AS user_count
  FROM (
    SELECT d.product_name, d.user_name
    FROM daily_user_desktop_raw d
    WHERE d.account_id = p_account_id
      AND d.user_name IS NOT NULL
      AND (p_start_date IS NULL OR d.usage_date >= p_start_date)
      AND (p_end_date IS NULL OR d.usage_date <= p_end_date)
      AND (p_product_names IS NULL OR d.product_name = ANY(p_product_names))
    UNION
    SELECT c.product_name, c.user_name
    FROM daily_user_cloud_raw c
    WHERE c.account_id = p_account_id
      AND c.user_name IS NOT NULL
      AND (p_start_date IS NULL OR c.usage_date >= p_start_date)
      AND (p_end_date IS NULL OR c.usage_date <= p_end_date)
      AND (p_product_names IS NULL OR c.product_name = ANY(p_product_names))
  ) u
  GROUP BY u.product_name
  ORDER BY u.product_name;
$$;

COMMENT ON FUNCTION get_distinct_users_by_product IS 'Count of distinct users per product over a date range, union of desktop and cloud. Used for cumulative unique users in KPI table.';
