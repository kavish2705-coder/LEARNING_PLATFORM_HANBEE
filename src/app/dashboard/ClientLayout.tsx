"use client";

import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import styles from "./layout.module.css";
import "./light-theme.css";
import { useTheme } from "./ThemeProvider";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const { theme, activeBackground } = useTheme();

  return (
    <div 
      className={`${styles.dashboardContainer} ${theme === 'Light' ? 'themeLight' : ''}`}
      style={{ backgroundImage: `url(${activeBackground})` }}
    >
      {/* Sidebar navigation */}
      <Sidebar />
      <div className={styles.mainArea}>
        <Header />
        <main className={styles.contentScroll}>
          {children}
        </main>
      </div>
    </div>
  );
}
