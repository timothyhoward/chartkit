WITH base_scope AS (
  SELECT
    country_id,
    fiscal_year,
    export_value,
    unique_traders,
    unique_traders_cagr,
    export_value_cagr,
    export_value_marketshare_country,
    export_value_rank_world_cgr,
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
    unique_traders,
    unique_traders_cagr,
    export_value_cagr,
    export_value_marketshare_country,
    export_value_rank_world_cgr,
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
    unique_traders,
    unique_traders_cagr,
    export_value_cagr,
    export_value_marketshare_country,
    export_value_rank_world_cgr,
    sector_id,
    cgr_desc
  FROM base_scope
  WHERE {{productScope}} = 'all'

  UNION ALL

  SELECT
    fiscal_year,
    export_value,
    unique_traders,
    unique_traders_cagr,
    export_value_cagr,
    export_value_marketshare_country,
    export_value_rank_world_cgr,
    sector_id,
    cgr_desc
  FROM ranked_scope
  WHERE {{productScope}} != 'all' AND scoped_product_rank <= 25
),
latest_year AS (
  SELECT MAX(fiscal_year) AS fiscal_year
  FROM filtered
),
latest AS (
  SELECT
    fiscal_year,
    export_value,
    unique_traders,
    unique_traders_cagr,
    export_value_cagr,
    export_value_marketshare_country,
    export_value_rank_world_cgr,
    sector_id,
    cgr_desc
  FROM filtered
  WHERE fiscal_year = (SELECT fiscal_year FROM latest_year)
),
grouped AS (
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
    END AS dimension_name,
    SUM(unique_traders) AS exporters,
    100.0 * SUM(unique_traders * unique_traders_cagr) / NULLIF(SUM(unique_traders), 0)
      AS exporters_cagr_5y,
    SUM(export_value) / 1000000.0 AS export_value_m,
    100.0 * SUM(export_value * export_value_cagr) / NULLIF(SUM(export_value), 0)
      AS export_value_cagr_5y,
    100.0 * SUM(export_value_marketshare_country * export_value) / NULLIF(SUM(export_value), 0)
      AS gms_pct,
    MIN(export_value_rank_world_cgr) AS gr
  FROM latest
  GROUP BY 1, 2
),
ranked AS (
  SELECT
    DENSE_RANK() OVER (ORDER BY export_value_m DESC) AS rank,
    dimension_name,
    ROUND(exporters, 0) AS exporters,
    ROUND(exporters_cagr_5y, 1) AS exporters_cagr_5y,
    ROUND(export_value_m, 1) AS export_value_m,
    ROUND(export_value_cagr_5y, 1) AS export_value_cagr_5y,
    ROUND(gms_pct, 1) AS gms_pct,
    CAST(gr AS BIGINT) AS gr
  FROM grouped
)
SELECT *
FROM ranked
ORDER BY rank
LIMIT 12;
