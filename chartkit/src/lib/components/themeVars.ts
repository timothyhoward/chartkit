import type { CSSProperties } from "react";
import type { ChartKitThemePreset } from "../runtime/theme";

export function themeVars(theme: ChartKitThemePreset): CSSProperties {
  return {
    "--ck-bg": theme.colors.bg,
    "--ck-surface": theme.colors.surface,
    "--ck-surface-muted": theme.colors.surfaceMuted,
    "--ck-border": theme.colors.border,
    "--ck-border-strong": theme.colors.borderStrong,
    "--ck-text": theme.colors.text,
    "--ck-muted": theme.colors.muted,
    "--ck-positive": theme.colors.positive,
    "--ck-negative": theme.colors.negative,
    "--ck-neutral": theme.colors.neutral,
    "--ck-tooltip-bg": theme.tooltip.background,
    "--ck-tooltip-border": theme.tooltip.borderColor,
    "--ck-tooltip-text": theme.tooltip.text,
    "--ck-tooltip-shadow": theme.tooltip.shadow,
    "--ck-card-bg": theme.card.background,
    "--ck-card-border": theme.card.borderColor,
    "--ck-card-radius": theme.card.radius,
    "--ck-control-active-text": theme.controls.activeText,
    "--ck-control-active-bg": theme.controls.activeBackground,
    "--ck-control-active-border": theme.controls.activeBorder,
    "--ck-table-header-bg": theme.dataTable.headerBackground,
    "--ck-table-row-hover": theme.dataTable.rowHover,
    "--ck-table-stripe": theme.dataTable.stripe,
    "--ck-font-family": theme.typography.fontFamily,
    "--ck-font-mono": theme.typography.monoFontFamily,
  } as CSSProperties;
}
