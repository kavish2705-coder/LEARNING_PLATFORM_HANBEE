import type { Metadata } from "next";
import Link from "next/link";
import Navbar from "../../components/Navbar/Navbar";
import styles from "../legal.module.css";

export const metadata: Metadata = {
  title: "About — Hanbee",
  description: "Who Hanbee is and what the Hanbee RC Cup league is about.",
};

export default function AboutPage() {
  return (
    <main className={styles.page}>
      <Navbar />
      <div className={styles.container}>
        <h1 className={styles.title}>About Hanbee</h1>
        <p className={styles.updated}>An inter-school autonomous &amp; RC racing league.</p>

        <section className={styles.section}>
          <p>
            Hanbee runs a hands-on engineering program for school students: build an RC car,
            write the firmware that drives it, and race it against other schools in a season-long
            championship. Students learn Java, data structures, and systems thinking by applying
            them to something that has to actually work on a track, not just pass a test.
          </p>
          <p>
            Schools can register their students as teams; independent students who aren&apos;t
            part of a registered school can also join solo.
          </p>
        </section>

        <section className={styles.section}>
          <h2>What we offer</h2>
          <ul>
            <li>A structured curriculum in Java, DSA, and React, delivered through our learning platform.</li>
            <li>Hands-on hardware: an RC car kit and flight-controller firmware students write themselves.</li>
            <li>A real competitive season — the Hanbee RC Cup — with verified results and a leaderboard.</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>Contact</h2>
          <p>
            For general enquiries, reach us at{" "}
            <a href="mailto:support@hanbee.in">support@hanbee.in</a>. See our{" "}
            <Link href="/contact">Contact page</Link> for more ways to reach us.
          </p>
        </section>
      </div>
    </main>
  );
}
