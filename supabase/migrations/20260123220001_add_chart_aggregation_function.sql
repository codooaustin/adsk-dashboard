-- Create PostgreSQL function for efficient chart data aggregation
-- This function aggregates tokens by time period and product at the database level
-- instead of fetching all rows and aggregating in JavaScript

CREATE OR REPLACE FUNCTION get_aggregated_tokens_data(
  p_account_id UUID,
  p_granularity TEXT, -- 'day', 'week', 'month', 'quarter', 'year'
  p_source TEXT, -- 'all', 'desktop', 'cloud'
  p_product_names TEXT[] DEFAULT NULL, -- NULL means all products
  p_start_date DATE DEFAULT NULL, -- Start date filter (inclusive)
  p_end_date DATE DEFAULT NULL -- End date filter (inclusive)
)
RETURNS TABLE (
  period_date DATE,
  product_name TEXT,
  tokens_consumed NUMERIC
) 
LANGUAGE plpgsql
AS $$
DECLARE
  date_trunc_expr TEXT;
  desktop_results RECORD;
  cloud_results RECORD;
BEGIN
  -- Map granularity to PostgreSQL date_trunc() period
  CASE p_granularity
    WHEN 'day' THEN date_trunc_expr := 'day';
    WHEN 'week' THEN date_trunc_expr := 'week';
    WHEN 'month' THEN date_trunc_expr := 'month';
    WHEN 'quarter' THEN date_trunc_expr := 'quarter';
    WHEN 'year' THEN date_trunc_expr := 'year';
    ELSE date_trunc_expr := 'day';
  END CASE;

  -- Build and execute query based on source
  -- Use UNION ALL to combine desktop and cloud results when source is 'all'
  IF p_source = 'desktop' OR p_source = 'all' THEN
    FOR desktop_results IN
      SELECT 
        DATE(date_trunc(date_trunc_expr, usage_date)) as period_date,
        product_name,
        SUM(tokens_consumed) as tokens_consumed
      FROM daily_user_desktop_raw
      WHERE account_id = p_account_id
        AND tokens_consumed IS NOT NULL
        AND (p_product_names IS NULL OR product_name = ANY(p_product_names))
      GROUP BY DATE(date_trunc(date_trunc_expr, usage_date)), product_name
    LOOP
      period_date := desktop_results.period_date;
      product_name := desktop_results.product_name;
      tokens_consumed := desktop_results.tokens_consumed;
      RETURN NEXT;
    END LOOP;
  END IF;

  IF p_source = 'cloud' OR p_source = 'all' THEN
    FOR cloud_results IN
      SELECT 
        DATE(date_trunc(date_trunc_expr, usage_date)) as period_date,
        product_name,
        SUM(tokens_consumed) as tokens_consumed
      FROM daily_user_cloud_raw
      WHERE account_id = p_account_id
        AND tokens_consumed IS NOT NULL
        AND (p_product_names IS NULL OR product_name = ANY(p_product_names))
        AND (p_start_date IS NULL OR usage_date >= p_start_date)
        AND (p_end_date IS NULL OR usage_date <= p_end_date)
      GROUP BY DATE(date_trunc(date_trunc_expr, usage_date)), product_name
    LOOP
      period_date := cloud_results.period_date;
      product_name := cloud_results.product_name;
      tokens_consumed := cloud_results.tokens_consumed;
      RETURN NEXT;
    END LOOP;
  END IF;
END;
$$;

COMMENT ON FUNCTION get_aggregated_tokens_data IS 'Aggregates tokens data by time period and product for chart queries. Returns pre-aggregated data instead of raw rows for performance.';
