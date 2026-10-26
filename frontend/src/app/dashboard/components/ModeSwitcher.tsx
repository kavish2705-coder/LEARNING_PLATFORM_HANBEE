"use client";

import React, { type KeyboardEvent } from "react";
import { useMode } from "../ModeContext";
import styles from "../layout.module.css";
import { Trophy, BookOpen } from "lucide-react";

export default function ModeSwitcher() {
  const { mode, setMode } = useMode();

  const handleKeyDown = (e: KeyboardEvent<HTMLButtonElement>, targetMode: "tournament" | "learning") => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setMode(targetMode);
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      setMode("tournament");
    } else if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      setMode("learning");
    }
  };

  return (
    <div className={styles.modeSwitcherContainer} role="tablist" aria-label="Dashboard mode switcher">
      <div 
        className={styles.modeSwitcherGlider} 
        style={{ transform: mode === "tournament" ? "translateX(0)" : "translateX(100%)" }}
        aria-hidden="true"
      />
      <button 
        type="button"
        role="tab"
        id="mode-tab-tournament"
        aria-selected={mode === "tournament"}
        aria-label="Tournament Mode"
        tabIndex={mode === "tournament" ? 0 : -1}
        className={`${styles.modeOption} ${mode === "tournament" ? styles.modeOptionActive : ""}`}
        onClick={() => setMode("tournament")}
        onKeyDown={(e) => handleKeyDown(e, "tournament")}
      >
        <Trophy size={14} aria-hidden="true" />
        <span>Tournament</span>
      </button>
      <button 
        type="button"
        role="tab"
        id="mode-tab-learning"
        aria-selected={mode === "learning"}
        aria-label="Learning Mode"
        tabIndex={mode === "learning" ? 0 : -1}
        className={`${styles.modeOption} ${mode === "learning" ? styles.modeOptionActive : ""}`}
        onClick={() => setMode("learning")}
        onKeyDown={(e) => handleKeyDown(e, "learning")}
      >
        <BookOpen size={14} aria-hidden="true" />
        <span>Learning</span>
      </button>
    </div>
  );
}
