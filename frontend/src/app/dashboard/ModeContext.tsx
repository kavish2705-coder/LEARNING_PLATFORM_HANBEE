"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { usePathname } from "next/navigation";

type PlatformMode = "tournament" | "learning";

interface ModeContextType {
  mode: PlatformMode;
  setMode: (mode: PlatformMode) => void;
}

const ModeContext = createContext<ModeContextType | undefined>(undefined);

const LEARNING_ONLY_PREFIXES = ["/dashboard/courses", "/dashboard/certificate", "/dashboard/ai-assistant", "/dashboard/attendance"];
const TOURNAMENT_ONLY_PREFIXES = ["/dashboard/license", "/dashboard/leaderboard", "/dashboard/team"];

export function ModeProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mode, setMode] = useState<PlatformMode>("tournament");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const savedMode = localStorage.getItem("hanbee-platform-mode") as PlatformMode;
    if (savedMode && (savedMode === "tournament" || savedMode === "learning")) {
      setMode(savedMode);
    }
  }, []);

  useEffect(() => {
    if (!pathname) return;
    if (LEARNING_ONLY_PREFIXES.some((p) => pathname.startsWith(p))) setMode("learning");
    else if (TOURNAMENT_ONLY_PREFIXES.some((p) => pathname.startsWith(p))) setMode("tournament");
  }, [pathname]);

  const handleSetMode = (newMode: PlatformMode) => {
    setMode(newMode);
    localStorage.setItem("hanbee-platform-mode", newMode);
  };

  return (
    <ModeContext.Provider value={{ mode: mounted ? mode : "tournament", setMode: handleSetMode }}>
      {children}
    </ModeContext.Provider>
  );
}

export function useMode() {
  const context = useContext(ModeContext);
  if (context === undefined) {
    throw new Error("useMode must be used within a ModeProvider");
  }
  return context;
}
