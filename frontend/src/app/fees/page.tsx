import type { Metadata } from "next";
import Link from "next/link";
import Navbar from "../../components/Navbar/Navbar";
import { getDriverLicenseFee } from "../../lib/razorpay/server";
import styles from "../legal.module.css";

export const metadata: Metadata = {
  title: "Fees & Payment Information — Hanbee",
  description: "One-time Hanbee Driver License, tournament entry, and course access fees.",
};

export const dynamic = "force-dynamic";

export default async function FeesPage() {
  const licenseFee = await getDriverLicenseFee();

  return (
    <main className={styles.page}>
      <Navbar />
      <div className={styles.container}>
        <h1 className={styles.title}>Fees &amp; payment information</h1>
        <p className={styles.updated}>Last updated: November 2026</p>

        <section className={styles.section}>
          <p>
            Hanbee charges one-time fees only. There are no automatic renewals or recurring
            subscriptions. The exact amount and currency are shown before you confirm payment
            in Razorpay Checkout.
          </p>
        </section>

        <section className={styles.section}>
          <h2>Driver License</h2>
          <p>
            The one-time Driver License fee is{" "}
            <strong>{licenseFee.toLocaleString("en-IN", { style: "currency", currency: "INR" })}</strong>.
            A captured payment activates the license needed for eligible tournament entry.
          </p>
        </section>

        <section className={styles.section}>
          <h2>Tournament entry</h2>
          <p>
            Entry fees vary by tournament and are shown to the captain after Hanbee staff have
            reviewed the entry and contacted the team or solo player. Staff approval is required
            before payment is enabled. A captured payment registers the entry; entry fees are
            non-refundable after registration, subject to the{" "}
            <Link href="/refund-policy">Refund &amp; Cancellation Policy</Link> and applicable law.
          </p>
        </section>

        <section className={styles.section}>
          <h2>Course access</h2>
          <p>
            Course access is available to eligible independent students. Hanbee staff confirm
            the request and price with the student and parent/guardian before payment is enabled.
            The confirmed one-time amount is shown before checkout.
          </p>
        </section>

        <section className={styles.section}>
          <h2>Payment provider</h2>
          <p>
            Payments are processed through Razorpay Checkout. Available payment methods are
            displayed by Razorpay during checkout. Hanbee does not receive or store card
            security codes or UPI PINs. See our <Link href="/terms">Terms &amp; Conditions</Link>,{" "}
            <Link href="/privacy-policy">Privacy Policy</Link>, and{" "}
            <Link href="/refund-policy">Refund &amp; Cancellation Policy</Link>.
          </p>
        </section>

        <section className={styles.section}>
          <h2>Questions</h2>
          <p>
            Contact <a href="mailto:info@hanbee.in">info@hanbee.in</a> or visit our{" "}
            <Link href="/contact">Contact page</Link>.
          </p>
        </section>
      </div>
    </main>
  );
}
