import type { Metadata } from "next";
import Navbar from "../../components/Navbar/Navbar";
import styles from "../legal.module.css";

export const metadata: Metadata = {
  title: "Refund & Cancellation Policy — Hanbee",
  description: "Refund and cancellation terms for Hanbee tournament entries and digital access fees.",
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
            Hanbee charges one-time fees for tournament entries, Driver Licenses, and course
            access. These are not subscriptions. Tournament entry payments are accepted only
            after Hanbee staff have reviewed the entry and contacted the captain or solo player.
          </p>
        </section>

        <section className={styles.section}>
          <h2>Failed or pending payments</h2>
          <p>
            An entry or access is not registered until Razorpay confirms that the payment was
            captured. If Razorpay shows a failed or pending payment but your bank account was
            debited, contact{" "}
            <a href="mailto:info@hanbee.in">info@hanbee.in</a> with your Razorpay payment ID
            and order ID. We will check the transaction with our payment provider. A payment
            that never reached Hanbee is not treated as a completed entry; any bank reversal is
            subject to the bank and payment provider&apos;s process.
          </p>
        </section>

        <section className={styles.section}>
          <h2>Tournament entry fees</h2>
          <p>
            Hanbee staff review the team or solo entry and contact the captain or player before
            enabling payment. Once Razorpay confirms payment and the entry is registered, the
            tournament entry fee is non-refundable, including if a participant later withdraws,
            does not attend, or does not win a prize. Paying an entry fee does not guarantee a
            prize; prizes are awarded under the published tournament rules.
          </p>
        </section>

        <section className={styles.section}>
          <h2>Driver License and course access</h2>
          <p>
            These one-time fees are non-refundable after the corresponding license or course
            access has been activated, except where required by applicable law or where Hanbee
            cannot provide the paid service. Any additional conditions disclosed before payment
            also apply.
          </p>
        </section>

        <section className={styles.section}>
          <h2>Duplicate payments and service issues</h2>
          <p>
            If you believe you were charged more than once for the same entry or access, contact
            us with each Razorpay payment ID. We will investigate the records with Razorpay.
            Where a refund is due under applicable law or because Hanbee cannot provide the
            service, it will be handled through the original payment method and provider process.
          </p>
        </section>

        <section className={styles.section}>
          <h2>Contact for payment support</h2>
          <p>
            Email <a href="mailto:info@hanbee.in">info@hanbee.in</a> with your Razorpay
            payment ID, order ID, the email on your Hanbee account, and a description of the
            issue. Do not send card details, passwords, or UPI PINs by email.
          </p>
        </section>
      </div>
    </main>
  );
}
