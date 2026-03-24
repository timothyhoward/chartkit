import type { ChartKitThemePreset } from "../runtime/theme";

export function chartKitTooltipBase(theme: ChartKitThemePreset) {
  return {
    appendToBody: true,
    className: "ck-echart-tooltip",
    backgroundColor: theme.tooltip.background,
    borderColor: theme.tooltip.borderColor,
    borderWidth: 1,
    padding: [8, 10] as [number, number],
    textStyle: {
      color: theme.tooltip.text,
      fontSize: 12,
      fontFamily: theme.typography.fontFamily,
    },
    extraCssText: `box-shadow: ${theme.tooltip.shadow}; border-radius: 8px; z-index: 2147483647; font-feature-settings: "cv02", "tnum";`,
  };
}
