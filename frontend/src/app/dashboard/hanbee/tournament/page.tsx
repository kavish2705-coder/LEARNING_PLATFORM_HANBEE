"use client";

import { useState } from "react";
import styles from "../../dashboard.module.css";
import TournamentManager from "../../components/hanbee/TournamentManager";
import TournamentReviewQueue from "../../components/hanbee/TournamentReviewQueue";
import TournamentResults from "../../components/hanbee/TournamentResults";

type Tab = "entries" | "setup" | "results";

const tabs: { id: Tab; label: string }[] = [
  { id: "entries", label: "Entries" },
  { id: "setup", label: "Setup" },
  { id: "results", label: "Results" },
];

export default function HanbeeTournamentPage() {
  // Entries is what the sidebar label ("Tournament entries") actually
  // promises -- the review queue used to render third, below tournament
  // setup and the results form, so the task staff come here for was the
  // last thing on the page. Entries now opens first; setup/results moved
  // to their own tabs instead of stacking unconditionally.
  const [tab, setTab] = useState<Tab>("entries");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div className={styles.tableFilters} role="tablist" aria-label="Tournament sections">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            className={`${styles.filterBtn} ${tab === t.id ? styles.filterBtnActive : ""}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "entries" && <TournamentReviewQueue />}
      {tab === "setup" && <TournamentManager />}
      {tab === "results" && <TournamentResults />}
    </div>
  );
}
