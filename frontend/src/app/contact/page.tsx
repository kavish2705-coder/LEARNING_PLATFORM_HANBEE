import type { Metadata } from "next";
import Navbar from "../../components/Navbar/Navbar";
import styles from "../legal.module.css";

export const metadata: Metadata = {
  title: "Contact — Hanbee",
  description: "How to reach Hanbee for support, school enquiries, or press.",
};

export default function ContactPage() {
  return (
    <main className={styles.page}>
      <Navbar />
      <div className={styles.container}>
        <h1 className={styles.title}>Contact us</h1>
        <p className={styles.updated}>We usually reply within 2 business days.</p>

        <section className={styles.section}>
          <h2>Support</h2>
          <ul className={styles.contactList}>
            <li>Email: <a href="mailto:hanbeetechnology@gmail.com">hanbeetechnology@gmail.com</a></li>
            <li>Platform account issues: <a href="mailto:info@hanbee.in">info@hanbee.in</a></li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>School enquiries</h2>
          <p>
            If you&apos;re a school interested in registering a team for the Hanbee RC Cup, email{" "}
            <a href="mailto:hanbeetechnology@gmail.com">hanbeetechnology@gmail.com</a> or use the{" "}
            <a href="/apply">school application form</a>.
          </p>
        </section>

        <section className={styles.section}>
          <h2>Registered business address</h2>
          <p>
            <span className={styles.placeholder}>Add your registered business address here</span> —
            required for payment-gateway verification (Cashfree, Razorpay, etc.) and should match
            your GST/business registration documents.
          </p>
        </section>

        <section className={styles.section}>
          <h2>Phone</h2>
          <p>
            <span className={styles.placeholder}>Add a support phone number here</span> — most
            payment gateways expect a working phone contact, not email only.
          </p>
        </section>
      </div>
    </main>
  );
}
