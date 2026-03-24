import type { CSSProperties, ReactNode } from "react";

export interface GridProps {
  cols: number;
  children?: ReactNode;
}

export function Grid({ cols, children }: GridProps) {
  return (
    <div
      className="ck-layout-grid"
      data-cols={cols}
      style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` } as CSSProperties}
    >
      {children}
    </div>
  );
}
