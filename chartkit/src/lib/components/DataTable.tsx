import { Children, isValidElement, type ReactNode } from "react";
import { useQuery } from "../useQuery";
import { formatChartKitDisplayValue, formatChartKitNumber } from "../format";
import type { DataTableColumnDefinition } from "../runtime/definitions";
import { DataColumn, type DataColumnProps } from "./DataColumn";
import { OverflowTooltip } from "./OverflowTooltip";
import { asString } from "./utils";
import { themeVars } from "./themeVars";
import { useChartKitNamespace } from "./useChartKitNamespace";

interface DataTableProps {
  namespace: string;
  data: string;
  columns?: DataTableColumnDefinition[];
  children?: ReactNode;
}

function collectColumns(children?: ReactNode): DataTableColumnDefinition[] {
  return Children.toArray(children).flatMap((child) => {
    if (!isValidElement<DataColumnProps>(child) || child.type !== DataColumn) {
      return [];
    }
    return [
        {
          field: child.props.field,
          label: child.props.label,
          fmt: child.props.fmt,
          align: child.props.align,
          width: child.props.width,
          minWidth: child.props.minWidth,
        },
      ];
  });
}

export function DataTable({ namespace, data, columns, children }: DataTableProps) {
  const theme = useChartKitNamespace(namespace).theme;
  const { loading, error, rows } = useQuery(namespace, data);

  if (loading) {
    return <div className="ck-inline-status">Loading...</div>;
  }
  if (error) {
    return <div className="ck-inline-status">Error: {error}</div>;
  }
  if (rows.length === 0) {
    return <div className="ck-inline-status">No data.</div>;
  }

  const childColumns = collectColumns(children);
  const tableColumns: DataTableColumnDefinition[] =
    columns && columns.length > 0
      ? columns
      : childColumns.length > 0
        ? childColumns
        : Object.keys(rows[0]).map((field) => ({ field }));

  const numericColumns = new Set(
    tableColumns
      .map((column) => column.field)
      .filter((field) =>
      rows.every((row) => {
        const value = row[field];
        if (value === null || value === undefined || value === "") {
          return true;
        }
        if (typeof value === "number" || typeof value === "bigint") {
          return true;
        }
        if (typeof value === "string") {
          const stripped = value.replace(/[$,%\s,A-Za-z]/g, "");
          return stripped !== "" && Number.isFinite(Number(stripped));
        }
        return false;
      }),
    ),
  );

  const formatCell = (value: unknown, fmt?: string): string => {
    if (fmt) {
      return formatChartKitDisplayValue(value, fmt);
    }
    if (value === null || value === undefined) {
      return "\u2013";
    }
    if (typeof value === "number") {
      const fractionDigits = Number.isInteger(value) ? 0 : 2;
      return formatChartKitNumber(value, `num${fractionDigits}`);
    }
    if (typeof value === "bigint") {
      return formatChartKitNumber(Number(value), "num0");
    }
    return asString(value);
  };

  const getLabel = (column: DataTableColumnDefinition): string => column.label ?? column.field;

  const alignmentClass = (align: "left" | "center" | "right" | undefined, field: string) => {
    if (align === "right") {
      return "ck-table-cell-number";
    }
    if (align === "center") {
      return "ck-table-cell-center";
    }
    if (numericColumns.has(field)) {
      return "ck-table-cell-number";
    }
    return undefined;
  };

  const columnStyle = (column: DataTableColumnDefinition) => ({
    width: column.width,
    minWidth: column.minWidth,
  });

  return (
    <div className="ck-table-wrap" style={themeVars(theme)}>
      <table className="ck-table">
        <colgroup>
          {tableColumns.map((column) => (
            <col key={column.field} style={columnStyle(column)} />
          ))}
        </colgroup>
        <thead>
          <tr>
            {tableColumns.map((column) => (
              <th
                key={column.field}
                className={alignmentClass(column.align, column.field)}
                style={columnStyle(column)}
              >
                <OverflowTooltip text={getLabel(column)} className="ck-table-heading" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index}>
              {tableColumns.map((column) => {
                const displayValue = formatCell(row[column.field], column.fmt);

                return (
                  <td
                    key={column.field}
                    className={alignmentClass(column.align, column.field)}
                    style={columnStyle(column)}
                  >
                    <OverflowTooltip
                      text={displayValue}
                      className="ck-table-cell-value"
                    />
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
