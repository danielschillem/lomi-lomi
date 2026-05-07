import React, { createContext, useContext, useEffect, useState } from "react";
import * as SecureStore from "expo-secure-store";

const THEME_KEY = "app_theme";

export type ThemeMode = "light" | "dark";

export interface ThemeColors {
  background: string;
  card: string;
  cardSecondary: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  border: string;
  inputBg: string;
  inputText: string;
  placeholder: string;
  accent: string;
  accentLight: string;
  tabBarBg: string;
  tabBarBorder: string;
  headerBg: string;
  headerText: string;
  statusBar: "light" | "dark";
  success: string;
  error: string;
  orange: string;
}

export const lightColors: ThemeColors = {
  background: "#f8f8f8",
  card: "#ffffff",
  cardSecondary: "#f3f4f6",
  text: "#1a1a1a",
  textSecondary: "#6b7280",
  textMuted: "#9ca3af",
  border: "#e5e7eb",
  inputBg: "#f3f4f6",
  inputText: "#1a1a1a",
  placeholder: "#9ca3af",
  accent: "#7c3aed",
  accentLight: "#a78bfa",
  tabBarBg: "#ffffff",
  tabBarBorder: "#e5e7eb",
  headerBg: "#ffffff",
  headerText: "#1a1a1a",
  statusBar: "dark",
  success: "#22c55e",
  error: "#ef4444",
  orange: "#f97316",
};

export const darkColors: ThemeColors = {
  background: "#0a0a0a",
  card: "#111111",
  cardSecondary: "#1a1a1a",
  text: "#ffffff",
  textSecondary: "#cccccc",
  textMuted: "#888888",
  border: "#1a1a1a",
  inputBg: "#1a1a1a",
  inputText: "#ffffff",
  placeholder: "#666666",
  accent: "#7c3aed",
  accentLight: "#a78bfa",
  tabBarBg: "#0a0a0a",
  tabBarBorder: "#1a1a1a",
  headerBg: "#0a0a0a",
  headerText: "#ffffff",
  statusBar: "light",
  success: "#22c55e",
  error: "#ef4444",
  orange: "#f97316",
};

interface ThemeContextValue {
  theme: ThemeMode;
  colors: ThemeColors;
  toggleTheme: () => void;
  setTheme: (t: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "light",
  colors: lightColors,
  toggleTheme: () => {},
  setTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>("light");

  useEffect(() => {
    SecureStore.getItemAsync(THEME_KEY)
      .then((saved) => {
        if (saved === "dark" || saved === "light") setThemeState(saved);
      })
      .catch(() => {});
  }, []);

  const setTheme = (t: ThemeMode) => {
    setThemeState(t);
    SecureStore.setItemAsync(THEME_KEY, t).catch(() => {});
  };

  const toggleTheme = () => setTheme(theme === "light" ? "dark" : "light");

  return (
    <ThemeContext.Provider
      value={{ theme, colors: theme === "light" ? lightColors : darkColors, toggleTheme, setTheme }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
