import type { Metadata } from "next";
import Link from "next/link";
import Navbar from "../../components/Navbar/Navbar";
import styles from "../legal.module.css";

export const metadata: Metadata = {
  title: "Contact — Hanbee",
  description: "How to reach Hanbee for support, school enquiries, or business details.",
};

export default function ContactPage() {
  return (
    <main className={styles.page}>
      <Navbar />
      <div className={styles.container}>
        <h1 className={styles.title}>Contact us</h1>
        <p className={styles.updated}>We usually reply within 2 business days.</p>

        <section className={styles.section}>
          <h2>In-app support (fastest)</h2>
          <p>
            If you already have a Hanbee account, the fastest way to reach us is the{" "}
            <strong>Chat</strong> section in your dashboard once signed in — it goes straight to
            a real, staff-monitored conversation, not a bot.
          </p>
        </section>

        <section className={styles.section}>
          <h2>Business &amp; contact details</h2>
          <ul className={styles.contactList}>
            <li><strong>Legal entity:</strong> Hanbee Technologies Private Limited</li>
            <li><strong>Registered address:</strong> Plot No. 28, 2nd Cross Street, Thiurpur Kumaran Nagar, Thirukkalukundram, Tamil Nadu 603109, India</li>
            <li><strong>Support email:</strong> <a href="mailto:support@hanbee.in">support@hanbee.in</a></li>
            <li><strong>Phone:</strong> <a href="tel:+919344477512">+91 93444 77512</a></li>
            <li><strong>Support hours:</strong> Mon&ndash;Fri, 10:00&ndash;19:00 IST</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>School enquiries</h2>
          <p>
            If you&apos;re a school interested in registering a team for the Hanbee RC Cup, email{" "}
            <a href="mailto:support@hanbee.in">support@hanbee.in</a> or use the{" "}
            <a href="/apply">school application form</a>.
          </p>
        </section>

        <section className={styles.section}>
          <h2>Related pages</h2>
          <p>
            For how refunds and cancellations work, see our{" "}
            <Link href="/refund-policy">Refund &amp; Cancellation Policy</Link>. For our fees,
            see <Link href="/fees">Fees &amp; Payments</Link>. For full terms of use, see our{" "}
            <Link href="/terms">Terms &amp; Conditions</Link>, and for
            how we handle your data, see our <Link href="/privacy-policy">Privacy Policy</Link>.
          </p>
        </section>
      </div>
    </main>
  );
}
