export type ChartKitThemeName = "chartkit" | "austrade" | "clarity" | "accessible";

export interface ChartKitThemePreset {
  name: ChartKitThemeName;
  typography: {
    fontFamily: string;
    monoFontFamily: string;
  };
  colors: {
    bg: string;
    surface: string;
    surfaceMuted: string;
    border: string;
    borderStrong: string;
    text: string;
    muted: string;
    positive: string;
    negative: string;
    neutral: string;
  };
  tooltip: {
    background: string;
    borderColor: string;
    text: string;
    shadow: string;
  };
  card: {
    background: string;
    borderColor: string;
    radius: string;
  };
  controls: {
    activeText: string;
    activeBackground: string;
    activeBorder: string;
  };
  charts: {
    palette: string[];
  };
  bigValue: {
    sparklineStroke: string;
    sparklineFill: string;
  };
  dataTable: {
    headerBackground: string;
    rowHover: string;
    stripe: string;
  };
}

const baseTypography = {
  fontFamily:
    '"Inter", "Segoe UI", -apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif',
  monoFontFamily:
    '"IBM Plex Mono", "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace',
};

const chartkitTheme: ChartKitThemePreset = {
  name: "chartkit",
  typography: baseTypography,
  colors: {
    bg: "#f5f6f8",
    surface: "#ffffff",
    surfaceMuted: "#eef0f4",
    border: "#d9dbe1",
    borderStrong: "#c7cbd4",
    text: "#1f2837",
    muted: "#5f6677",
    positive: "#1f9a53",
    negative: "#d64545",
    neutral: "#6b7280",
  },
  tooltip: {
    background: "#ffffff",
    borderColor: "#dbe1ea",
    text: "#1f2937",
    shadow: "0 10px 24px rgba(15, 23, 42, 0.16)",
  },
  card: {
    background: "#ffffff",
    borderColor: "#d9dbe1",
    radius: "18px",
  },
  controls: {
    activeText: "#6c37d6",
    activeBackground: "#fcfbff",
    activeBorder: "#cfc4ec",
  },
  charts: {
    palette: [
      "#8B5FBF",
      "#6E78C9",
      "#4F95D1",
      "#49B3C2",
      "#72C78D",
      "#E7C65B",
      "#E08A52",
      "#CF6178",
    ],
  },
  bigValue: {
    sparklineStroke: "#798190",
    sparklineFill: "rgba(164, 171, 183, 0.36)",
  },
  dataTable: {
    headerBackground: "#f3f5f8",
    rowHover: "#f7f9fb",
    stripe: "#fcfdff",
  },
};

const austradeTheme: ChartKitThemePreset = {
  ...chartkitTheme,
  name: "austrade",
  colors: {
    ...chartkitTheme.colors,
    bg: "#f4f4f2",
    surfaceMuted: "#f0f2f5",
    border: "#d5d8df",
    borderStrong: "#c4c8d0",
  },
  controls: {
    activeText: "#3d44cf",
    activeBackground: "#f6f7ff",
    activeBorder: "#c8ccf5",
  },
  charts: {
    palette: ["#8c6597", "#7d7cb4", "#6d89c2", "#5f9ecc", "#5cb2cd", "#59c0ba", "#f4ca58"],
  },
};

const clarityTheme: ChartKitThemePreset = {
  ...chartkitTheme,
  name: "clarity",
  charts: {
    palette: [
      "#4E79A7",
      "#F28E2B",
      "#E15759",
      "#76B7B2",
      "#59A14F",
      "#EDC948",
      "#B07AA1",
      "#9C755F",
    ],
  },
};

const accessibleTheme: ChartKitThemePreset = {
  ...chartkitTheme,
  name: "accessible",
  charts: {
    palette: [
      "#0072B2",
      "#E69F00",
      "#009E73",
      "#56B4E9",
      "#D55E00",
      "#CC79A7",
      "#F5C710",
      "#999999",
    ],
  },
};

const themePresets: Record<ChartKitThemeName, ChartKitThemePreset> = {
  chartkit: chartkitTheme,
  austrade: austradeTheme,
  clarity: clarityTheme,
  accessible: accessibleTheme,
};

export function resolveChartKitTheme(themeName?: ChartKitThemeName): ChartKitThemePreset {
  return themePresets[themeName ?? "chartkit"];
}

export function isChartKitThemeName(value: string): value is ChartKitThemeName {
  return value in themePresets;
}
