-- RPC: discover product names from raw tables and upsert into product_names (ON CONFLICT DO NOTHING).
-- Returns { added, already_existing }.

CREATE OR REPLACE FUNCTION discover_product_names()
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  raw_count BIGINT;
  ins_count BIGINT;
  added BIGINT;
  already_existing BIGINT;
BEGIN
  WITH raw AS (
    SELECT DISTINCT product_name FROM daily_user_desktop_raw
    WHERE product_name IS NOT NULL AND TRIM(product_name) <> ''
    UNION
    SELECT DISTINCT product_name FROM daily_user_cloud_raw
    WHERE product_name IS NOT NULL AND TRIM(product_name) <> ''
    UNION
    SELECT DISTINCT product_name FROM acc_bim360_raw
    WHERE product_name IS NOT NULL AND TRIM(product_name) <> ''
    UNION
    SELECT DISTINCT product_name FROM manual_adjustments_raw
    WHERE product_name IS NOT NULL AND TRIM(product_name) <> ''
  ),
  inserted AS (
    INSERT INTO product_names (product_name)
    SELECT product_name FROM raw
    ON CONFLICT (product_name) DO NOTHING
    RETURNING product_name
  )
  SELECT (SELECT COUNT(*)::BIGINT FROM raw), (SELECT COUNT(*)::BIGINT FROM inserted)
  INTO raw_count, ins_count;

  added := ins_count;
  already_existing := raw_count - ins_count;
  IF already_existing < 0 THEN
    already_existing := 0;
  END IF;

  RETURN jsonb_build_object('added', added, 'already_existing', already_existing);
END;
$$;

COMMENT ON FUNCTION discover_product_names IS 'Discover distinct product_name from raw tables, insert into product_names (ON CONFLICT DO NOTHING). Returns { added, already_existing }.';
