import type { ReactNode } from "react";

export interface MetricRowProps {
  children?: ReactNode;
}

export function MetricRow({ children }: MetricRowProps) {
  return <section className="ck-metric-row">{children}</section>;
}
