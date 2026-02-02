-- Fix "column reference product_name is ambiguous" in get_aggregated_tokens_data.
-- RETURNS TABLE creates output params; qualify all table columns with aliases.

CREATE OR REPLACE FUNCTION get_aggregated_tokens_data(
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
  tokens_consumed NUMERIC
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

  IF p_source = 'desktop' OR p_source = 'all' THEN
    FOR desktop_results IN
      SELECT 
        DATE(date_trunc(date_trunc_expr, d.usage_date)) AS period_date,
        d.product_name AS product_name,
        SUM(d.tokens_consumed) AS tokens_consumed
      FROM daily_user_desktop_raw d
      WHERE d.account_id = p_account_id
        AND d.tokens_consumed IS NOT NULL
        AND (p_product_names IS NULL OR d.product_name = ANY(p_product_names))
        AND (p_start_date IS NULL OR d.usage_date >= p_start_date)
        AND (p_end_date IS NULL OR d.usage_date <= p_end_date)
      GROUP BY DATE(date_trunc(date_trunc_expr, d.usage_date)), d.product_name
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
        DATE(date_trunc(date_trunc_expr, c.usage_date)) AS period_date,
        c.product_name AS product_name,
        SUM(c.tokens_consumed) AS tokens_consumed
      FROM daily_user_cloud_raw c
      WHERE c.account_id = p_account_id
        AND c.tokens_consumed IS NOT NULL
        AND (p_product_names IS NULL OR c.product_name = ANY(p_product_names))
        AND (p_start_date IS NULL OR c.usage_date >= p_start_date)
        AND (p_end_date IS NULL OR c.usage_date <= p_end_date)
      GROUP BY DATE(date_trunc(date_trunc_expr, c.usage_date)), c.product_name
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
