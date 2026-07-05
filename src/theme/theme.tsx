import React, { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useColorScheme } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { palettes, spacing, radius, fontSize, typography, type ColorScheme, type Palette } from "./tokens";

const STORAGE_KEY = "if-theme-pref";
type ThemePref = "light" | "dark" | "system";

interface ThemeContextValue {
  scheme: ColorScheme;
  pref: ThemePref;
  colors: Palette;
  spacing: typeof spacing;
  radius: typeof radius;
  fontSize: typeof fontSize;
  typography: typeof typography;
  setPref: (p: ThemePref) => void;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme();
  const [pref, setPrefState] = useState<ThemePref>("dark");

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((v) => {
      if (v === "light" || v === "dark" || v === "system") setPrefState(v);
    });
  }, []);

  const setPref = (p: ThemePref) => {
    setPrefState(p);
    AsyncStorage.setItem(STORAGE_KEY, p);
  };

  const scheme: ColorScheme = pref === "system" ? (system === "light" ? "light" : "dark") : pref;

  const value = useMemo<ThemeContextValue>(
    () => ({
      scheme,
      pref,
      colors: palettes[scheme],
      spacing,
      radius,
      fontSize,
      typography,
      setPref,
      toggle: () => setPref(scheme === "dark" ? "light" : "dark"),
    }),
    [scheme, pref],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
