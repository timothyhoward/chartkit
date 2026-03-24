export type SqlParamValue = string | number | boolean | null | undefined;

export type DataFormat = "csv" | "parquet";
export type DataLoadStrategy = "on_demand" | "preload";

export interface DataSourceDefinition {
  id: string;
  format: DataFormat;
  url: string;
  loadStrategy: DataLoadStrategy;
  source?: string;
  refreshCadence?: "monthly";
}
export type HostParams = Record<string, SqlParamValue>;

export interface QueryDefinition {
  id: string;
  src: string;
  dependsOn?: string[];
  excludeDependsOn?: string[];
}

export type CardPadding = "none" | "sm" | "md" | "lg";

export interface DataTableColumnDefinition {
  field: string;
  label?: string;
  fmt?: string;
  align?: "left" | "center" | "right";
  width?: string;
  minWidth?: string;
}
