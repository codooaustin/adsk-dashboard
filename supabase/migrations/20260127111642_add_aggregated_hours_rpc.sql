-- Add SQL aggregation function for hours data
-- Aggregates usage_hours from daily_user_desktop_raw by time period and product for chart queries
-- Returns pre-aggregated data instead of raw rows for performance

CREATE OR REPLACE FUNCTION get_aggregated_hours_data(
  p_account_id UUID,
  p_granularity TEXT,
  p_product_names TEXT[] DEFAULT NULL,
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL
)
RETURNS TABLE (
  period_date DATE,
  product_name TEXT,
  usage_hours NUMERIC
)
LANGUAGE plpgsql
AS $$
DECLARE
  date_trunc_expr TEXT;
  desktop_results RECORD;
BEGIN
  CASE p_granularity
    WHEN 'day' THEN date_trunc_expr := 'day';
    WHEN 'week' THEN date_trunc_expr := 'week';
    WHEN 'month' THEN date_trunc_expr := 'month';
    WHEN 'quarter' THEN date_trunc_expr := 'quarter';
    WHEN 'year' THEN date_trunc_expr := 'year';
    ELSE date_trunc_expr := 'day';
  END CASE;

  FOR desktop_results IN
    SELECT 
      DATE(date_trunc(date_trunc_expr, d.usage_date)) AS period_date,
      d.product_name AS product_name,
      SUM(d.usage_hours) AS usage_hours
    FROM daily_user_desktop_raw d
    WHERE d.account_id = p_account_id
      AND d.usage_hours IS NOT NULL
      AND (p_product_names IS NULL OR d.product_name = ANY(p_product_names))
      AND (p_start_date IS NULL OR d.usage_date >= p_start_date)
      AND (p_end_date IS NULL OR d.usage_date <= p_end_date)
    GROUP BY DATE(date_trunc(date_trunc_expr, d.usage_date)), d.product_name
    ORDER BY 1, 2
  LOOP
    period_date := desktop_results.period_date;
    product_name := desktop_results.product_name;
    usage_hours := desktop_results.usage_hours;
    RETURN NEXT;
  END LOOP;
END;
$$;

COMMENT ON FUNCTION get_aggregated_hours_data IS 'Aggregates hours data by time period and product for chart queries. Returns pre-aggregated data instead of raw rows for performance. ORDER BY ensures stable pagination.';
