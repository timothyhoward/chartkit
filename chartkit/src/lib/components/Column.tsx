import type { ReactNode } from "react";

export interface ColumnProps {
  children?: ReactNode;
}

export function Column({ children }: ColumnProps) {
  return <div className="ck-layout-column">{children}</div>;
}
