/**
 * Futuristic, dark-first design tokens for CrewLink mobile.
 * Brand: neon emerald primary on deep space-navy, glassmorphic surfaces.
 */

export type ColorScheme = "light" | "dark";

export interface Palette {
  background: string;
  backgroundElevated: string;
  surface: string;
  surface2: string;
  card: string;
  cardBorder: string;
  glass: string; // translucent fill for blur cards
  border: string;
  text: string;
  textMuted: string;
  textFaint: string;
  primary: string;
  primaryDim: string;
  onPrimary: string;
  accent: string; // cyan
  violet: string;
  success: string;
  warning: string;
  warningText: string;
  destructive: string;
  onDestructive: string;
  tabBar: string;
  tabInactive: string;
  inputBg: string;
  shadow: string;
  // gradient stops
  gradHero: [string, string];
  gradEmerald: [string, string];
  gradCyan: [string, string];
  gradViolet: [string, string];
  gradLime: [string, string];
  gradDark: [string, string];
}

export const dark: Palette = {
  background: "#0A0E18",
  backgroundElevated: "#0F1524",
  surface: "#121A2B",
  surface2: "#17223A",
  card: "#121A2B",
  cardBorder: "#1F2C45",
  glass: "rgba(23,34,58,0.55)",
  border: "#243149",
  text: "#EAF1FB",
  textMuted: "#93A1BA",
  textFaint: "#5E6C86",
  primary: "#27E5A3",
  primaryDim: "#159C73",
  onPrimary: "#04130C",
  accent: "#3FD8F6",
  violet: "#8E7DFF",
  success: "#2FD58C",
  warning: "#FFB23E",
  warningText: "#1B1300",
  destructive: "#FF5D6E",
  onDestructive: "#1A0307",
  tabBar: "rgba(12,17,30,0.85)",
  tabInactive: "#6B7890",
  inputBg: "#0F1726",
  shadow: "#000000",
  gradHero: ["#27E5A3", "#22B6FF"],
  gradEmerald: ["#27E5A3", "#11A7C8"],
  gradCyan: ["#3FD8F6", "#5A7BFF"],
  gradViolet: ["#8E7DFF", "#C16BFF"],
  gradLime: ["#9EE651", "#27E5A3"],
  gradDark: ["#0F1524", "#0A0E18"],
};

export const light: Palette = {
  background: "#F5F8FC",
  backgroundElevated: "#FFFFFF",
  surface: "#FFFFFF",
  surface2: "#EDF2F9",
  card: "#FFFFFF",
  cardBorder: "#E4EAF3",
  glass: "rgba(255,255,255,0.7)",
  border: "#E1E8F2",
  text: "#0D1626",
  textMuted: "#566179",
  textFaint: "#8A95AB",
  primary: "#0DA871",
  primaryDim: "#0A8159",
  onPrimary: "#FFFFFF",
  accent: "#0AA6CC",
  violet: "#6F5DF0",
  success: "#0FB877",
  warning: "#E0890B",
  warningText: "#FFFFFF",
  destructive: "#E23B4E",
  onDestructive: "#FFFFFF",
  tabBar: "rgba(255,255,255,0.9)",
  tabInactive: "#8A95AB",
  inputBg: "#F1F5FA",
  shadow: "#1B2740",
  gradHero: ["#0DA871", "#1488E6"],
  gradEmerald: ["#0DA871", "#0A8FB0"],
  gradCyan: ["#0AA6CC", "#3F6BF0"],
  gradViolet: ["#6F5DF0", "#A24BF0"],
  gradLime: ["#5DB81F", "#0DA871"],
  gradDark: ["#FFFFFF", "#EDF2F9"],
};

export const palettes: Record<ColorScheme, Palette> = { light, dark };

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 22,
  xxl: 28,
  pill: 999,
} as const;

export const fontSize = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  xxl: 26,
  xxxl: 34,
  display: 42,
} as const;

export const typography = {
  // System fonts read as modern/clean; weights carry the "futuristic" feel.
  display: { fontWeight: "800" as const, letterSpacing: -0.5 },
  title: { fontWeight: "700" as const, letterSpacing: -0.3 },
  body: { fontWeight: "500" as const },
  label: { fontWeight: "600" as const, letterSpacing: 0.2 },
};
