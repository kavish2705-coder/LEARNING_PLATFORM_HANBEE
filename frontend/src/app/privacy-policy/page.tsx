import type { Metadata } from "next";
import Navbar from "../../components/Navbar/Navbar";
import styles from "../legal.module.css";

export const metadata: Metadata = {
  title: "Privacy Policy — Hanbee",
  description: "How Hanbee collects, uses, and protects your data.",
};

export default function PrivacyPolicyPage() {
  return (
    <main className={styles.page}>
      <Navbar />
      <div className={styles.container}>
        <h1 className={styles.title}>Privacy Policy</h1>
        <p className={styles.updated}>Last updated: November 2026</p>

        <section className={styles.section}>
          <p>
            This policy explains what information Hanbee (&quot;we&quot;, &quot;us&quot;)
            collects through the Hanbee learning and tournament platform (the
            &quot;Platform&quot;), how we use it, and the choices you have.
          </p>
        </section>

        <section className={styles.section}>
          <h2>What we collect</h2>
          <ul>
            <li>Account details: name, email, role (student, school staff, Hanbee staff, manager), and school affiliation.</li>
            <li>Course and tournament activity: enrollment, lesson progress, quiz results, race results, and team membership.</li>
            <li>Payment-related data: transaction reference, amount, and payment status for tournament entry fees, driver license fees, and course access — handled through our payment partner; we do not store your card, UPI PIN, or full bank account details ourselves.</li>
            <li>Communications: messages sent through the Platform&apos;s chat feature, and any messages you send us directly (email, contact form).</li>
            <li>Basic technical data: browser type, device, and IP address, collected automatically for security and to keep the service working.</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>How we use it</h2>
          <ul>
            <li>To run your account, show your course/tournament progress, and operate team and leaderboard features.</li>
            <li>To process payments and confirm tournament entries, course access, and driver licenses.</li>
            <li>To communicate with you about your account, your school&apos;s approval status, or tournament updates.</li>
            <li>To keep the Platform secure and prevent abuse (for example, rate-limiting messages).</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>Who can see your data</h2>
          <p>
            Your course and tournament data is visible to your own school&apos;s staff and to
            Hanbee staff/managers who administer the league, as required to run the program.
            It is never sold. We share payment details only with our payment processing
            partner, to the extent needed to confirm your payment.
          </p>
        </section>

        <section className={styles.section}>
          <h2>Children&apos;s data</h2>
          <p>
            Many of our users are school students. Where a student enrolls through a school,
            the school is responsible for obtaining guardian consent before adding students to
            the Platform. Independent students joining without a school confirm guardian
            consent directly during sign-up.
          </p>
        </section>

        <section className={styles.section}>
          <h2>Data retention and deletion</h2>
          <p>
            We keep account and activity data for as long as your account is active, and for a
            reasonable period after to meet legal and accounting requirements (including
            payment records). To request deletion of your personal data, contact us at{" "}
            <a href="mailto:hanbeetechnology@gmail.com">hanbeetechnology@gmail.com</a>.
          </p>
        </section>

        <section className={styles.section}>
          <h2>Contact</h2>
          <p>
            Questions about this policy: <a href="mailto:hanbeetechnology@gmail.com">hanbeetechnology@gmail.com</a>.
          </p>
        </section>
      </div>
    </main>
  );
}
