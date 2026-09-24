"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

type Theme = "Dark" | "Light" | "System";

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  activeBackground: string;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("Dark");
  
  // Decide which background to use based on the theme
  const activeBackground = theme === "Light" 
    ? "/bg_light.png" 
    : "/bg_dark.png";

  return (
    <ThemeContext.Provider value={{ theme, setTheme, activeBackground }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
