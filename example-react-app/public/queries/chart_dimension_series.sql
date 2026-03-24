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
    country_id,
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
    country_id,
    fiscal_year,
    export_value,
    export_weight,
    unique_traders,
    sector_id,
    cgr_desc
  FROM ranked_scope
  WHERE {{productScope}} != 'all' AND scoped_product_rank <= 25
),
base AS (
  SELECT
    strftime(fiscal_year, '%Y') AS fiscal_year,
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
  GROUP BY 1, 2, 3
),
ranked_dimensions AS (
  SELECT
    dimension_value,
    dimension_label,
    DENSE_RANK() OVER (ORDER BY SUM(metric_value) DESC) AS dimension_rank
  FROM base
  GROUP BY 1, 2
),
bucketed AS (
  SELECT
    base.fiscal_year,
    CASE
      WHEN ranked_dimensions.dimension_rank <= 8 THEN CONCAT('rank_', CAST(ranked_dimensions.dimension_rank AS VARCHAR))
      ELSE 'other'
    END AS series_value,
    CASE
      WHEN ranked_dimensions.dimension_rank <= 8 THEN base.dimension_label
      ELSE 'Other'
    END AS series_name,
    base.metric_value
  FROM base
  JOIN ranked_dimensions USING (dimension_value, dimension_label)
)
SELECT
  fiscal_year,
  fiscal_year AS fiscal_year_label,
  series_value,
  series_name,
  ROUND(SUM(metric_value), 2) AS metric_value
FROM bucketed
GROUP BY 1, 2, 3, 4
ORDER BY fiscal_year, metric_value DESC;
