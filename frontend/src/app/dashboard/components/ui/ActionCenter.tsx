import Link from "next/link";
import type { ReactNode } from "react";
import styles from "./ActionCenter.module.css";

export type DashboardActionItem = {
  id: string;
  title: string;
  description: string;
  href: string;
  icon: ReactNode;
  meta?: string;
};

export default function ActionCenter({
  title = "Your next steps",
  description,
  items,
}: {
  title?: string;
  description: string;
  items: DashboardActionItem[];
}) {
  return (
    <section className={styles.section} aria-labelledby="dashboard-action-center-title">
      <header className={styles.header}>
        <div>
          <h2 id="dashboard-action-center-title" className={styles.title}>{title}</h2>
          <p className={styles.description}>{description}</p>
        </div>
      </header>
      {items.length > 0 ? (
        <div className={styles.grid}>
          {items.map((item) => (
            <Link key={item.id} href={item.href} className={styles.action}>
              <span className={styles.icon} aria-hidden="true">{item.icon}</span>
              <span className={styles.content}>
                <span className={styles.actionTitle}>{item.title}</span>
                <span className={styles.actionDescription}>{item.description}</span>
              </span>
              {item.meta && <span className={styles.meta}>{item.meta}</span>}
              <span className={styles.arrow} aria-hidden="true">→</span>
            </Link>
          ))}
        </div>
      ) : (
        <p className={styles.empty}>You’re all caught up. New actions will appear here when they need your attention.</p>
      )}
    </section>
  );
}
