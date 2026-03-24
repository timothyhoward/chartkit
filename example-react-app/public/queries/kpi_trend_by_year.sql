WITH base_scope AS (
  SELECT
    country_id,
    fiscal_year,
    export_value,
    export_weight,
    unique_traders,
    export_value_cagr,
    export_weight_cagr,
    unique_traders_cagr
  FROM m_exports_g
  WHERE
    ({{marketId}} IS NULL OR country_id = {{marketId}})
),
ranked_scope AS (
  SELECT
    country_id,
    fiscal_year,
    export_value,
    export_weight,
    unique_traders,
    export_value_cagr,
    export_weight_cagr,
    unique_traders_cagr,
    DENSE_RANK() OVER (
      PARTITION BY fiscal_year, COALESCE(country_id, '__ALL__')
      ORDER BY export_value DESC NULLS LAST
    ) AS scoped_product_rank
  FROM base_scope
),
filtered AS (
  SELECT
    fiscal_year,
    export_value,
    export_weight,
    unique_traders,
    export_value_cagr,
    export_weight_cagr,
    unique_traders_cagr
  FROM base_scope
  WHERE {{productScope}} = 'all'

  UNION ALL

  SELECT
    fiscal_year,
    export_value,
    export_weight,
    unique_traders,
    export_value_cagr,
    export_weight_cagr,
    unique_traders_cagr
  FROM ranked_scope
  WHERE {{productScope}} != 'all' AND scoped_product_rank <= 25
),
ranked_for_concentration AS (
  SELECT
    fiscal_year,
    export_value,
    export_weight,
    unique_traders,
    export_value_cagr,
    export_weight_cagr,
    unique_traders_cagr,
    ROW_NUMBER() OVER (PARTITION BY fiscal_year ORDER BY export_value DESC) AS export_rank
  FROM filtered
),
yearly AS (
  SELECT
    fiscal_year,
    SUM(export_value) / 1000000.0 AS export_value_m,
    SUM(export_weight) AS export_weight_kg,
    SUM(unique_traders) AS exporters,
    100.0 * SUM(CASE WHEN export_rank <= 10 THEN export_value ELSE 0 END)
      / NULLIF(SUM(export_value), 0) AS top10_pct
  FROM ranked_for_concentration
  GROUP BY 1
)
SELECT
  strftime(fiscal_year, '%Y') AS fiscal_year,
  ROUND(export_value_m, 1) AS export_value_m,
  ROUND(export_weight_kg, 0) AS export_weight_kg,
  ROUND(exporters, 0) AS exporters,
  ROUND(top10_pct, 1) AS top10_pct
FROM yearly
ORDER BY fiscal_year;
