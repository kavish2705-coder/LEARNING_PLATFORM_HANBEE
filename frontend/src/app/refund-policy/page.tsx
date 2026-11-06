import type { Metadata } from "next";
import Navbar from "../../components/Navbar/Navbar";
import styles from "../legal.module.css";

export const metadata: Metadata = {
  title: "Refund & Cancellation Policy — Hanbee",
  description: "Our refund and cancellation policy for tournament entry, driver license, and course access payments.",
};

export default function RefundPolicyPage() {
  return (
    <main className={styles.page}>
      <Navbar />
      <div className={styles.container}>
        <h1 className={styles.title}>Refund &amp; cancellation policy</h1>
        <p className={styles.updated}>Last updated: November 2026</p>

        <section className={styles.section}>
          <p>
            This policy covers one-time payments made on the Hanbee platform: tournament entry
            fees, driver license fees, and course access fees. These are not subscriptions —
            each payment unlocks a specific feature once confirmed.
          </p>
        </section>

        <section className={styles.section}>
          <h2>Before your payment is confirmed</h2>
          <p>
            Payments are verified manually by our staff against the bank reference you submit.
            If you paid by mistake and your payment has <strong>not yet been confirmed</strong>,
            contact us immediately at{" "}
            <a href="mailto:support@hanbee.in">support@hanbee.in</a> with your
            payment reference, and we will cancel the pending entry and refund the full amount to
            your original payment method within{" "}
            <span className={styles.placeholder}>X business days — set your real SLA here</span>.
          </p>
        </section>

        <section className={styles.section}>
          <h2>If your entry or application is rejected</h2>
          <p>
            If your team, driver license, or course access application is rejected after
            payment (for example, an ineligible entry or a failed eligibility check), you are
            entitled to a full refund of the fee you paid. Refunds are processed manually to
            your original payment method within{" "}
            <span className={styles.placeholder}>X business days — set your real SLA here</span>{" "}
            of the rejection.
          </p>
        </section>

        <section className={styles.section}>
          <h2>After your entry is confirmed and verified</h2>
          <p>
            Once your tournament entry, license, or course access is verified and active, the
            fee is non-refundable, except where required by law or where Hanbee cancels the
            tournament, course, or season outright — in which case affected participants receive
            a full refund.
          </p>
        </section>

        <section className={styles.section}>
          <h2>How refunds are paid</h2>
          <p>
            Refunds are returned to the same UPI ID or bank account the original payment came
            from. We do not refund to a different account or payment method.
          </p>
        </section>

        <section className={styles.section}>
          <h2>Contact for a refund request</h2>
          <p>
            Email <a href="mailto:support@hanbee.in">support@hanbee.in</a> with
            your payment reference / UTR number and the reason for your request.
          </p>
        </section>
      </div>
    </main>
  );
}
