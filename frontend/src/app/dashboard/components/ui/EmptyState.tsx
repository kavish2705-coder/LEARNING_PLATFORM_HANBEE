"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import styles from "./EmptyState.module.css";

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
}

// An empty state is an invitation to act, not a dead end -- every
// instance names what's missing and gives the one next step that fills it.
export default function EmptyState({ icon, title, description, actionLabel, actionHref, onAction }: EmptyStateProps) {
  return (
    <div className={styles.emptyState}>
      <div className={styles.emptyIcon}>{icon}</div>
      <h3 className={styles.emptyTitle}>{title}</h3>
      <p className={styles.emptyDescription}>{description}</p>
      {actionLabel && actionHref && (
        <Link href={actionHref} className={styles.emptyAction}>{actionLabel}</Link>
      )}
      {actionLabel && onAction && !actionHref && (
        <button type="button" className={styles.emptyAction} onClick={onAction}>{actionLabel}</button>
      )}
    </div>
  );
}
