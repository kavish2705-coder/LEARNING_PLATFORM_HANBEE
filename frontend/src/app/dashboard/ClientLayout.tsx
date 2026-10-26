"use client";

import { useState } from "react";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import EmailNudgeBanner from "./components/EmailNudgeBanner";
import LearningComingSoon from "./components/LearningComingSoon";
import styles from "./layout.module.css";
import "./theme.css";
import { useTheme } from "./ThemeProvider";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const { activeTheme } = useTheme();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div 
      className={styles.dashboardContainer} 
      data-theme={activeTheme}
    >
      {/* Sidebar navigation */}
      <Sidebar isMobileMenuOpen={isMobileMenuOpen} setIsMobileMenuOpen={setIsMobileMenuOpen} />
      
      {/* Main Content */}
      <div className={styles.mainArea}>
        <Header toggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)} />
        <EmailNudgeBanner />
        <main className={styles.contentScroll}>
          <LearningComingSoon>{children}</LearningComingSoon>
        </main>
      </div>
    </div>
  );
}

