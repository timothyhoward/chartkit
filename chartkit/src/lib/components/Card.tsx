import type { ReactNode } from "react";
import type { CardPadding } from "../runtime/definitions";
import { themeVars } from "./themeVars";
import { useChartKitNamespace } from "./useChartKitNamespace";

export interface CardProps {
  namespace: string;
  title?: string;
  subtitle?: string;
  backgroundColor?: string;
  borderColor?: string;
  padding?: CardPadding;
  children: ReactNode;
}

export function Card({
  namespace,
  title,
  subtitle,
  backgroundColor,
  borderColor,
  padding = "md",
  children,
}: CardProps) {
  const theme = useChartKitNamespace(namespace).theme;

  return (
    <article
      className={`ck-card ck-card-padding-${padding}`}
      style={{
        ...themeVars(theme),
        backgroundColor: backgroundColor ?? theme.card.background,
        borderColor: borderColor ?? theme.card.borderColor,
      }}
    >
      {title ? <h3>{title}</h3> : null}
      {subtitle ? <p className="ck-subtitle">{subtitle}</p> : null}
      <div className="ck-card-body">{children}</div>
    </article>
  );
}
