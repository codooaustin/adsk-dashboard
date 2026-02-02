-- Add SQL aggregation function for users data
-- Counts distinct user_name from daily_user_desktop_raw and daily_user_cloud_raw by time period and product
-- Returns pre-aggregated data instead of raw rows for performance

CREATE OR REPLACE FUNCTION get_aggregated_users_data(
  p_account_id UUID,
  p_granularity TEXT,
  p_source TEXT,
  p_product_names TEXT[] DEFAULT NULL,
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL
)
RETURNS TABLE (
  period_date DATE,
  product_name TEXT,
  user_count BIGINT
)
LANGUAGE plpgsql
AS $$
DECLARE
  date_trunc_expr TEXT;
  desktop_results RECORD;
  cloud_results RECORD;
BEGIN
  CASE p_granularity
    WHEN 'day' THEN date_trunc_expr := 'day';
    WHEN 'week' THEN date_trunc_expr := 'week';
    WHEN 'month' THEN date_trunc_expr := 'month';
    WHEN 'quarter' THEN date_trunc_expr := 'quarter';
    WHEN 'year' THEN date_trunc_expr := 'year';
    ELSE date_trunc_expr := 'day';
  END CASE;

  -- Aggregate from desktop table
  IF p_source = 'desktop' OR p_source = 'all' THEN
    FOR desktop_results IN
      SELECT 
        DATE(date_trunc(date_trunc_expr, d.usage_date)) AS period_date,
        d.product_name AS product_name,
        COUNT(DISTINCT d.user_name) AS user_count
      FROM daily_user_desktop_raw d
      WHERE d.account_id = p_account_id
        AND d.user_name IS NOT NULL
        AND (p_product_names IS NULL OR d.product_name = ANY(p_product_names))
        AND (p_start_date IS NULL OR d.usage_date >= p_start_date)
        AND (p_end_date IS NULL OR d.usage_date <= p_end_date)
      GROUP BY DATE(date_trunc(date_trunc_expr, d.usage_date)), d.product_name
      ORDER BY 1, 2
    LOOP
      period_date := desktop_results.period_date;
      product_name := desktop_results.product_name;
      user_count := desktop_results.user_count;
      RETURN NEXT;
    END LOOP;
  END IF;

  -- Aggregate from cloud table
  IF p_source = 'cloud' OR p_source = 'all' THEN
    FOR cloud_results IN
      SELECT 
        DATE(date_trunc(date_trunc_expr, c.usage_date)) AS period_date,
        c.product_name AS product_name,
        COUNT(DISTINCT c.user_name) AS user_count
      FROM daily_user_cloud_raw c
      WHERE c.account_id = p_account_id
        AND c.user_name IS NOT NULL
        AND (p_product_names IS NULL OR c.product_name = ANY(p_product_names))
        AND (p_start_date IS NULL OR c.usage_date >= p_start_date)
        AND (p_end_date IS NULL OR c.usage_date <= p_end_date)
      GROUP BY DATE(date_trunc(date_trunc_expr, c.usage_date)), c.product_name
      ORDER BY 1, 2
    LOOP
      period_date := cloud_results.period_date;
      product_name := cloud_results.product_name;
      user_count := cloud_results.user_count;
      RETURN NEXT;
    END LOOP;
  END IF;
END;
$$;

COMMENT ON FUNCTION get_aggregated_users_data IS 'Counts distinct users by time period and product for chart queries. Returns pre-aggregated data instead of raw rows for performance. ORDER BY ensures stable pagination. Combines desktop and cloud data when source is "all".';
