import type { Metadata } from "next";
import Navbar from "../../components/Navbar/Navbar";
import styles from "../legal.module.css";

export const metadata: Metadata = {
  title: "Terms & Conditions — Hanbee",
  description: "Terms of use for the Hanbee learning and tournament platform.",
};

export default function TermsPage() {
  return (
    <main className={styles.page}>
      <Navbar />
      <div className={styles.container}>
        <h1 className={styles.title}>Terms &amp; conditions</h1>
        <p className={styles.updated}>Last updated: November 2026</p>

        <section className={styles.section}>
          <p>
            These terms are between you and Hanbee Technologies Private Limited, registered at
            Plot No. 28, 2nd Cross Street, Thiurpur Kumaran Nagar, Thirukkalukundram, Tamil Nadu
            603109, India (&quot;Hanbee&quot;). By creating an account or using the Hanbee
            learning and tournament platform (the &quot;Platform&quot;), you agree to these
            terms.
          </p>
        </section>

        <section className={styles.section}>
          <h2>Who can use the Platform</h2>
          <p>
            Students join either through a school registered on the Platform, or as an
            independent student. Students under 18 must have guardian consent, confirmed by
            their school or directly at sign-up for independent students. School staff,
            Hanbee staff, and manager accounts are approved before they can access role-specific
            features.
          </p>
        </section>

        <section className={styles.section}>
          <h2>Course access and tournament entry</h2>
          <p>
            Some features — course access, driver licenses, and tournament entry — require a
            one-time payment processed through Razorpay. Access or registration is granted only
            after Razorpay confirms the payment as captured. For independent tournament entries,
            Hanbee staff review the entry and contact the captain or solo player before enabling
            payment. Entry into a tournament also requires passing the relevant car/safety
            inspection where applicable. Tournament entry fees are non-refundable after
            registration, subject to applicable law and our{" "}
            <a href="/refund-policy">Refund &amp; Cancellation Policy</a>.
          </p>
        </section>

        <section className={styles.section}>
          <h2>Conduct</h2>
          <ul>
            <li>Chat and messaging features are for coordinating teams, classes, and tournament logistics. Abusive, harassing, or off-topic use may result in account suspension.</li>
            <li>Teams and students must compete fairly; falsified results or ineligible entries can be rejected or reversed by Hanbee staff.</li>
            <li>Don&apos;t attempt to access accounts, data, or features that don&apos;t belong to your role.</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>Account suspension</h2>
          <p>
            We may suspend or restrict an account that violates these terms, that we reasonably
            believe is fraudulent (including payment fraud), or at a school&apos;s request for
            its own students.
          </p>
        </section>

        <section className={styles.section}>
          <h2>Changes to these terms</h2>
          <p>
            We may update these terms as the Platform changes. Continued use after an update
            means you accept the revised terms.
          </p>
        </section>

        <section className={styles.section}>
          <h2>Contact</h2>
          <p>
            Questions about these terms: <a href="mailto:info@hanbee.in">info@hanbee.in</a>.
          </p>
        </section>
      </div>
    </main>
  );
}
