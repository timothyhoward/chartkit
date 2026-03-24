WITH base_scope AS (
  SELECT
    country_id,
    fiscal_year,
    export_value,
    export_weight,
    unique_traders,
    sector_id,
    cgr_desc
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
    sector_id,
    cgr_desc,
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
    sector_id,
    cgr_desc
  FROM base_scope
  WHERE {{productScope}} = 'all'

  UNION ALL

  SELECT
    fiscal_year,
    export_value,
    export_weight,
    unique_traders,
    sector_id,
    cgr_desc
  FROM ranked_scope
  WHERE {{productScope}} != 'all' AND scoped_product_rank <= 25
),
latest_year AS (
  SELECT MAX(fiscal_year) AS fiscal_year
  FROM filtered
),
base AS (
  SELECT
    CASE
      WHEN {{dimension}} = 'sector' THEN sector_id
      ELSE cgr_desc
    END AS dimension_value,
    CASE
      WHEN {{dimension}} = 'sector' THEN CASE sector_id
        WHEN 'ADV' THEN 'Advanced Manufacturing and Defence'
        WHEN 'AGR' THEN 'Agribusiness and Food'
        WHEN 'CON' THEN 'Consumer and Retail'
        WHEN 'ENE' THEN 'Energy'
        WHEN 'HEA' THEN 'Health'
        WHEN 'INF' THEN 'Infrastructure'
        WHEN 'RES' THEN 'Resources'
        ELSE sector_id
      END
      ELSE cgr_desc
    END AS dimension_label,
    SUM(
      CASE
        WHEN {{measure}} = 'export_value' THEN export_value
        WHEN {{measure}} = 'export_weight' THEN export_weight
        ELSE unique_traders
      END
    ) AS metric_value
  FROM filtered
  WHERE fiscal_year = (SELECT fiscal_year FROM latest_year)
  GROUP BY 1, 2
),
ranked AS (
  SELECT
    dimension_value,
    dimension_label,
    metric_value,
    DENSE_RANK() OVER (ORDER BY metric_value DESC) AS dimension_rank
  FROM base
),
bucketed AS (
  SELECT
    CASE
      WHEN dimension_rank <= 8 THEN dimension_label
      ELSE 'Other'
    END AS category,
    metric_value
  FROM ranked
),
totals AS (
  SELECT SUM(metric_value) AS grand_total
  FROM bucketed
)
SELECT
  category,
  ROUND(SUM(metric_value) * 100.0 / NULLIF((SELECT grand_total FROM totals), 0), 2) AS pct_share
FROM bucketed
GROUP BY 1
ORDER BY pct_share DESC;
