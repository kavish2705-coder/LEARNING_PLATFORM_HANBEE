"use client";

import { useRef, useEffect } from "react";
import { useScroll, useTransform, motion } from "framer-motion";
import Navbar from "@/components/Navbar/Navbar";
import Hero from "@/components/Hero/Hero";
import styles from "./page.module.css";

const tickerItems = ["BUILD THE FLIGHT CONTROLLER", "CODE IT YOURSELF", "RACE AT THE HANBEE RC CUP", "LEARN JAVA · DSA · REACT"];

export default function Home() {
  const { scrollY } = useScroll();
  const schoolVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = schoolVideoRef.current;
    if (!video) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            video.play().catch(() => {});
            observer.unobserve(video);
          }
        });
      },
      { threshold: 0.2 }
    );

    observer.observe(video);
    return () => observer.disconnect();
  }, []);


  return (
    <main style={{ backgroundColor: "#20202a", position: "relative" }}>
      <Navbar />

      {/* Hero section */}
      <Hero />

      {/* Moving ticker strip - breaks straight into the hero's bottom edge */}
      <div className={styles.marqueeWrap} style={{ position: "relative", zIndex: 10 }}>
        <div className={styles.marqueeTrack}>
          {[...tickerItems, ...tickerItems].map((item, i) => (
            <span className={styles.marqueeItem} key={i}>
              <span className={styles.marqueeDot} />
              {item}
            </span>
          ))}
        </div>
      </div>

      {/* Why it's different - glass box on photo background */}
      <section className={styles.differentSection} id="platform">
        {/* Background Image */}
        <div className={styles.differentImageBg}>
          <img
            src="/hanbee-cars.jpg"
            alt="Hanbee RC Racing Cars"
            className={styles.differentImage}
          />
          <div className={styles.differentOverlay} />
        </div>

        {/* Centered Glass Container Box */}
        <div className={`${styles.doersCard} ${styles.differentGrid}`} style={{ margin: "0 auto" }}>
          <div className={styles.orbBackground} style={{ opacity: 0.35 }}></div>

          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            style={{ position: "relative", zIndex: 2 }}
          >
            <span className={styles.categoryBadge}>
              Beyond standard learning
            </span>
            <h2 className={styles.doersTitle}>
              An LMS built for doers.
            </h2>
            <p className={styles.doersDesc}>
              From mastering core engineering concepts to building and programming your own FC racing car, Hanbee bridges the gap between theory and adrenaline-pumping reality.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.7, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            style={{ display: "flex", flexDirection: "column", gap: "16px", position: "relative", zIndex: 2 }}
          >
            {[
              {
                n: "01",
                t: "Led by track pros",
                d: "Learn directly from engineering veterans who design real-world flight controllers and autonomous systems."
              },
              {
                n: "02",
                t: "Live progress telemetry",
                d: "Monitor your learning milestones like live race telemetry — visualize your growth from novice to track-ready."
              },
              {
                n: "03",
                t: "Pit-stop mentorship",
                d: "Get 1-on-1 guidance when debugging your RC car's code or tuning its FC for maximum speed and control."
              },
              {
                n: "04",
                t: "Code, build, race",
                d: "Learn the theory at home, then take your skills straight to the asphalt at the Hanbee RC Cup."
              },
            ].map((feature) => (
              <motion.div
                key={feature.t}
                className={styles.doersItem}
                whileHover={{ x: 6, transition: { duration: 0.25, ease: [0.16, 1, 0.3, 1] } }}
              >
                <span className={styles.glowingNumber} style={{ minWidth: "32px", margin: 0, marginTop: "2px" }}>{feature.n}</span>
                <div>
                  <strong className={styles.doersItemTitle}>{feature.t}</strong>
                  <span className={styles.doersItemDesc}>{feature.d}</span>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Two tracks, one platform */}
      <section
        id="courses"
        style={{
          position: "relative",
          zIndex: 10,
          backgroundColor: "#242432",
          backgroundImage:
            "radial-gradient(ellipse 85% 65% at 50% 0%, rgba(157, 82, 20, 0.16), transparent 70%), radial-gradient(ellipse 70% 50% at 80% 80%, rgba(139, 92, 246, 0.12), transparent 60%), linear-gradient(180deg, #1e1e2a 0%, #262636 100%)",
          padding: "140px 40px",
        }}
      >
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            style={{ textAlign: "center", maxWidth: "680px", margin: "0 auto 72px" }}
          >
            <span style={{ fontFamily: "var(--font-body)", fontSize: "13px", letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.68)" }}>
              What you get
            </span>
            <h2 style={{ fontFamily: "var(--font-heading)", fontSize: "clamp(32px, 4vw, 48px)", fontWeight: 400, color: "#fff", margin: "16px 0 0", letterSpacing: "-0.02em" }}>
              Two tracks, one platform
            </h2>
          </motion.div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(380px, 1fr))", gap: "32px" }}>
            {[
              {
                tag: "Tournament",
                title: "Design, build, and race.",
                desc: "Program your own RC car's flight controller, form a team with your school, and compete at the Hanbee RC Cup. Solo entries welcome too.",
                points: ["Team or solo tournament entry", "Live leaderboard and results", "School-verified rosters"],
              },
              {
                tag: "Classroom",
                title: "Learn the fundamentals that matter.",
                desc: "Structured courses in Java, data structures, and React — video lessons, written notes, and auto-graded quizzes that unlock as you go.",
                points: ["Self-paced video and notes", "Auto-graded lesson checks", "Progress tracked per course"],
              },
            ].map((track, i) => (
              <motion.div
                key={track.tag}
                className={styles.glassCard}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.65, delay: i * 0.12, ease: [0.16, 1, 0.3, 1] }}
                whileHover={{ y: -6, scale: 1.015, transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] } }}
                style={{
                  borderRadius: "28px",
                  padding: "40px",
                }}
              >
                <div className={styles.orbBackground}></div>
                <span style={{ position: "relative", zIndex: 2, fontFamily: "var(--font-body)", fontSize: "12px", letterSpacing: "0.1em", textTransform: "uppercase", color: "#9d5214", textShadow: "0 0 10px rgba(157, 82, 20, 0.4)" }}>
                  {track.tag}
                </span>
                <h3 style={{ position: "relative", zIndex: 2, fontFamily: "var(--font-heading)", fontSize: "26px", fontWeight: 400, color: "#fff", margin: "14px 0 12px" }}>
                  {track.title}
                </h3>
                <p style={{ position: "relative", zIndex: 2, fontFamily: "var(--font-body)", fontSize: "16px", color: "rgba(255,255,255,0.78)", lineHeight: 1.6, marginBottom: "24px" }}>
                  {track.desc}
                </p>
                <ul style={{ position: "relative", zIndex: 2, display: "flex", flexDirection: "column", gap: "12px" }}>
                  {track.points.map((point) => (
                    <li key={point} style={{ display: "flex", alignItems: "center", gap: "10px", fontFamily: "var(--font-body)", fontSize: "14px", color: "rgba(255,255,255,0.7)" }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9d5214" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                        <path d="M20 6L9 17l-5-5" />
                      </svg>
                      {point}
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>

          <div style={{ marginTop: "72px" }}>
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              style={{ fontFamily: "var(--font-body)", fontSize: "13px", letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.68)", marginBottom: "20px" }}
            >
              Inside the RC track
            </motion.p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "20px" }}>
              {[
                { stage: "Flight controller fundamentals", desc: "Wire and program the brain of your car." },
                { stage: "Chassis & tuning", desc: "Suspension, gearing, and getting the balance right." },
                { stage: "Race strategy & telemetry", desc: "Read the data, plan the lap." },
                { stage: "Track day & competition rules", desc: "What it takes to line up at the Hanbee RC Cup." },
              ].map((item, i) => (
                <motion.div
                  key={item.stage}
                  className={styles.glassCard}
                  initial={{ opacity: 0, y: 30, scale: 0.95 }}
                  whileInView={{ opacity: 1, y: 0, scale: 1 }}
                  viewport={{ once: true, margin: "-40px" }}
                  transition={{ type: "spring", stiffness: 120, damping: 14, delay: i * 0.1 }}
                  whileHover={{ y: -8, scale: 1.02, transition: { type: "spring", stiffness: 300, damping: 20 } }}
                  style={{
                    borderRadius: "18px",
                    padding: "24px",
                  }}
                >
                  <div className={styles.glowingNumber}>{String(i + 1).padStart(2, "0")}</div>
                  <div style={{ position: "relative", zIndex: 2, fontFamily: "var(--font-heading)", fontSize: "18px", color: "#fff", marginBottom: "8px" }}>{item.stage}</div>
                  <div style={{ position: "relative", zIndex: 2, fontFamily: "var(--font-body)", fontSize: "14px", color: "rgba(255,255,255,0.72)", lineHeight: 1.5 }}>{item.desc}</div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* For schools */}
      <section className={styles.schoolSection} id="educators">
        {/* Background Race Track Video */}
        <div className={styles.schoolVideoBg}>
          <video
            ref={schoolVideoRef}
            className={styles.schoolVideo}
            playsInline
            muted
            preload="auto"
          >
            <source src="/race-track-video.mp4" type="video/mp4" />
          </video>
          <div className={styles.schoolOverlay} />
        </div>

        <div className={`${styles.schoolCard} ${styles.schoolGrid}`} style={{ margin: "0 auto" }}>
          <div className={styles.orbBackground} style={{ opacity: 0.35 }}></div>
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            style={{ position: "relative", zIndex: 2 }}
          >
            <span style={{ fontFamily: "var(--font-body)", fontSize: "13px", letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.6)" }}>
              For schools
            </span>
            <h2 style={{ fontFamily: "var(--font-heading)", fontSize: "clamp(28px, 3.4vw, 40px)", fontWeight: 400, color: "#fff", margin: "16px 0 20px", letterSpacing: "-0.02em" }}>
              Bring your students to the track and the classroom.
            </h2>
            <p style={{ fontFamily: "var(--font-body)", fontSize: "16px", color: "rgba(255,255,255,0.72)", lineHeight: 1.65, marginBottom: "32px" }}>
              Register your school, and once a Hanbee staff member verifies it, invite your students, form tournament teams, and follow their course progress — all from one dashboard.
            </p>
            <motion.a
              href="/login?mode=signup&role=School"
              className={styles.liquidGlassBtn}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.97 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
            >
              Register your school
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="M12 5l7 7-7 7" /></svg>
            </motion.a>
          </motion.div>

          <motion.ol
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.7, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            style={{ display: "flex", flexDirection: "column", gap: "16px", position: "relative", zIndex: 2 }}
          >
            {[
              { n: "01", t: "Register your school", d: "Share your school's name — no paperwork required to get started." },
              { n: "02", t: "Get verified", d: "A Hanbee manager or staff member reviews and verifies your school." },
              { n: "03", t: "Invite your students", d: "Send join links by email, bulk or one at a time." },
              { n: "04", t: "Track and compete", d: "Form teams for the tournament and follow classroom progress." },
            ].map((step) => (
              <li
                key={step.n}
                className={styles.schoolStepItem}
                style={{ display: "flex", gap: "16px", alignItems: "flex-start", position: "relative", zIndex: 2 }}
              >
                <span className={styles.glowingNumber} style={{ minWidth: "28px", margin: 0, marginTop: "2px" }}>{step.n}</span>
                <div>
                  <strong style={{ fontFamily: "var(--font-heading)", fontWeight: 500, fontSize: "16px", color: "#fff", display: "block", marginBottom: "4px" }}>{step.t}</strong>
                  <span style={{ fontFamily: "var(--font-body)", fontSize: "14px", color: "rgba(255,255,255,0.68)" }}>{step.d}</span>
                </div>
              </li>
            ))}
          </motion.ol>
        </div>
      </section>

      {/* About */}
      <section
        id="about"
        style={{
          position: "relative",
          zIndex: 10,
          backgroundColor: "#242432",
          backgroundImage:
            "linear-gradient(rgba(30, 30, 42, 0.65), rgba(32, 32, 46, 0.78)), radial-gradient(ellipse 60% 70% at 50% 100%, rgba(157, 82, 20, 0.26), transparent 65%), url('/rc-detail.jpg')",
          backgroundSize: "cover, cover, cover",
          backgroundPosition: "center, center, center 35%",
          backgroundRepeat: "no-repeat",
          padding: "100px 40px",
          overflow: "hidden",
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          style={{ maxWidth: "800px", margin: "0 auto", textAlign: "center" }}
        >
          <span style={{ fontFamily: "var(--font-body)", fontSize: "13px", letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.68)" }}>
            Why Hanbee
          </span>
          <h2 style={{ fontFamily: "var(--font-heading)", fontSize: "clamp(26px, 3.2vw, 36px)", fontWeight: 400, color: "#fff", margin: "16px 0 0", lineHeight: 1.4, letterSpacing: "-0.01em" }}>
            Most courses end where the real learning starts. We built Hanbee so the thing you coded actually has to work — on a track, against the clock, against other teams.
          </h2>
          <motion.a
            href="/login"
            className={styles.liquidGlassBtn}
            style={{ marginTop: "40px" }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.97 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
          >
            Start learning
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="M12 5l7 7-7 7" /></svg>
          </motion.a>
          <p style={{ fontFamily: "var(--font-body)", fontSize: "13.5px", color: "rgba(255,255,255,0.68)", marginTop: "18px" }}>
            Not ready to create an account?{" "}
            <a href="/apply" style={{ color: "#9d5214", textDecoration: "underline" }}>Just ask us a question</a>
          </p>
        </motion.div>
      </section>

      {/* FAQ */}
      <section style={{ position: "relative", zIndex: 10, backgroundColor: "#22222e", padding: "100px 40px" }}>
        <div style={{ maxWidth: "820px", margin: "0 auto" }}>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            style={{ fontFamily: "var(--font-body)", fontSize: "13px", letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.68)", textAlign: "center", marginBottom: "16px" }}
          >
            Questions
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.6, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
            style={{ fontFamily: "var(--font-heading)", fontSize: "clamp(28px, 3vw, 38px)", fontWeight: 400, color: "#fff", textAlign: "center", marginBottom: "56px", letterSpacing: "-0.02em" }}
          >
            Before you start
          </motion.h2>

          {[
            {
              q: "Do I need to be part of a school to enter the tournament?",
              a: "No. You can enter solo as a team of one, or join through your school if it's registered and verified on Hanbee.",
            },
            {
              q: "How does payment work?",
              a: "You confirm payment with the QR code shown at checkout, then a Hanbee staff member verifies it before your entry or course enrollment is confirmed.",
            },
            {
              q: "What do I need to actually enter the tournament?",
              a: "An RC car with a flight controller you've built and programmed yourself — that's what the tournament track teaches you to do.",
            },
            {
              q: "What happens if my school closes or I leave it?",
              a: "Your course progress and tournament history stay with you. You can continue as a solo student or join a new school later.",
            },
          ].map((item, i) => (
            <motion.details
              key={item.q}
              className={styles.faqItem}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.5, delay: i * 0.06, ease: [0.16, 1, 0.3, 1] }}
              style={{
                borderBottom: "1px solid rgba(255,255,255,0.08)",
                padding: "22px 0",
                cursor: "pointer",
              }}
            >
              <summary style={{ fontFamily: "var(--font-heading)", fontSize: "18px", fontWeight: 400, color: "#fff", listStyle: "none" }}>
                {item.q}
              </summary>
              <p style={{ fontFamily: "var(--font-body)", fontSize: "15px", color: "rgba(255,255,255,0.78)", lineHeight: 1.65, marginTop: "14px" }}>
                {item.a}
              </p>
            </motion.details>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer style={{ position: "relative", zIndex: 10, backgroundColor: "#1c1c26", borderTop: "1px solid rgba(255,255,255,0.06)", padding: "56px 40px 32px" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto", display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: "32px", paddingBottom: "40px" }}>
          <div>
            <span style={{ fontFamily: "var(--font-logo, var(--font-heading))", fontSize: "22px", color: "#fff", letterSpacing: "0.02em" }}>HANBEE</span>
            <p style={{ fontFamily: "var(--font-body)", fontSize: "14px", color: "rgba(255,255,255,0.68)", marginTop: "10px", maxWidth: "280px" }}>
              Learn beyond the obvious. Build beyond the expected.
            </p>
          </div>
          <div style={{ display: "flex", gap: "64px", flexWrap: "wrap" }}>
            <div>
              <div style={{ fontFamily: "var(--font-body)", fontSize: "12px", letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(255,255,255,0.35)", marginBottom: "16px" }}>Platform</div>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <a href="#courses" style={{ fontFamily: "var(--font-body)", fontSize: "14px", color: "rgba(255,255,255,0.6)" }}>Courses</a>
                <a href="#educators" style={{ fontFamily: "var(--font-body)", fontSize: "14px", color: "rgba(255,255,255,0.6)" }}>For Educators</a>
                <a href="#about" style={{ fontFamily: "var(--font-body)", fontSize: "14px", color: "rgba(255,255,255,0.6)" }}>About</a>
              </div>
            </div>
            <div>
              <div style={{ fontFamily: "var(--font-body)", fontSize: "12px", letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(255,255,255,0.35)", marginBottom: "16px" }}>Account</div>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <a href="/login" style={{ fontFamily: "var(--font-body)", fontSize: "14px", color: "rgba(255,255,255,0.6)" }}>Sign in</a>
                <a href="/login?mode=signup" style={{ fontFamily: "var(--font-body)", fontSize: "14px", color: "rgba(255,255,255,0.6)" }}>Create account</a>
              </div>
            </div>
          </div>
        </div>
        <div style={{ maxWidth: "1200px", margin: "0 auto", borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "24px", fontFamily: "var(--font-body)", fontSize: "13px", color: "rgba(255,255,255,0.3)" }}>
          © {new Date().getFullYear()} Hanbee. All rights reserved.
        </div>
      </footer>
    </main>
  );
}
