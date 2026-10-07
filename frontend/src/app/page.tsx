"use client";

import { useScroll, useTransform, motion } from "framer-motion";
import Navbar from "@/components/Navbar/Navbar";
import Hero from "@/components/Hero/Hero";

export default function Home() {
  const { scrollY } = useScroll();


  return (
    <main style={{ backgroundColor: "#1c1c1e", position: "relative" }}>
      <Navbar />

      {/* Hero section */}
      <Hero />

      {/* The upcoming part of the page */}
      <div
        style={{
          position: "relative",
          zIndex: 10,
          background: "linear-gradient(rgba(10, 10, 12, 0.4), rgba(10, 10, 12, 0.7)), url('/images/clouds-bg.png') center/cover no-repeat", // Dark tint over clouds for a seamless merge
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          /* Cloud like dispersion - Exact 35vh fade to match the overlap! */
          marginTop: "-35vh",
          WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.05) 10vh, rgba(0,0,0,0.3) 20vh, rgba(0,0,0,0.8) 30vh, black 35vh)",
          maskImage: "linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.05) 10vh, rgba(0,0,0,0.3) 20vh, rgba(0,0,0,0.8) 30vh, black 35vh)",
          padding: "calc(120px + 35vh) 40px 160px 40px",
          pointerEvents: "none", // Prevent this transparent layer from stealing clicks from the Hero CTA
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, ease: [0.2, 0.65, 0.3, 0.9] }}
          style={{ textAlign: "center", maxWidth: "800px", pointerEvents: "auto" }}
        >
          <h2 style={{
            fontFamily: "var(--font-heading)",
            fontSize: "clamp(36px, 5vw, 56px)",
            fontWeight: 300,
            color: "#fff",
            marginBottom: "24px",
            letterSpacing: "-1px"
          }}>
            Beyond Standard Learning
          </h2>
          <p style={{
            fontFamily: "var(--font-body)",
            fontSize: "clamp(18px, 2vw, 22px)",
            color: "rgba(255, 255, 255, 0.6)",
            lineHeight: 1.6
          }}>
            Experience an LMS built for doers. From mastering core engineering concepts to building and programming your own FC remote-controlled racing cars, Hanbee bridges the gap between theory and adrenaline-pumping reality.
          </p>
        </motion.div>

        {/* Features Grid */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: "24px",
          width: "100%",
          maxWidth: "1200px",
          marginTop: "80px",
          pointerEvents: "auto"
        }}>
          {[
            {
              title: "Led By Track Pros",
              desc: "Learn directly from engineering veterans who design real-world flight controllers and autonomous systems.",
              icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
            },
            {
              title: "Live Progress Telemetry",
              desc: "Monitor your learning milestones just like live race telemetry. Visualize your growth from novice to track-ready.",
              icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
            },
            {
              title: "Pit-Stop Mentorship",
              desc: "Get 1-on-1 guidance when debugging your RC car's code or tuning its FC for maximum speed and control.",
              icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
            },
            {
              title: "Code, Build, Race",
              desc: "Access our immersive LMS anywhere. Learn the theory at home, then take your skills straight to the asphalt.",
              icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>
            }
          ].map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.6, delay: 0.2 + i * 0.1, ease: "easeOut" }}
              style={{
                background: "rgba(255, 255, 255, 0.02)",
                border: "1px solid rgba(255, 255, 255, 0.06)",
                borderRadius: "24px",
                padding: "32px",
                display: "flex",
                flexDirection: "column",
                gap: "16px",
                transition: "transform 0.3s ease, background 0.3s ease"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-5px)";
                e.currentTarget.style.background = "rgba(255, 255, 255, 0.05)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.background = "rgba(255, 255, 255, 0.02)";
              }}
            >
              <div style={{ color: "#fff", width: "48px", height: "48px", borderRadius: "12px", background: "rgba(255, 255, 255, 0.05)", border: "1px solid rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {feature.icon}
              </div>
              <h3 style={{ fontFamily: "var(--font-heading)", fontSize: "22px", fontWeight: 400, color: "#fff" }}>
                {feature.title}
              </h3>
              <p style={{ fontFamily: "var(--font-body)", fontSize: "16px", color: "rgba(255, 255, 255, 0.5)", lineHeight: 1.5 }}>
                {feature.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Two tracks, one platform */}
      <section
        id="courses"
        style={{
          position: "relative",
          zIndex: 10,
          backgroundColor: "#1c1c1e",
          backgroundImage:
            "radial-gradient(ellipse 70% 55% at 12% -8%, rgba(8, 145, 178, 0.16), transparent 60%), radial-gradient(ellipse 60% 50% at 100% 0%, rgba(79, 70, 229, 0.10), transparent 60%)",
          padding: "140px 40px",
        }}
      >
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.7, ease: [0.2, 0.65, 0.3, 0.9] }}
            style={{ textAlign: "center", maxWidth: "680px", margin: "0 auto 72px" }}
          >
            <span style={{ fontFamily: "var(--font-body)", fontSize: "13px", letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.4)" }}>
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
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.6, delay: i * 0.12, ease: "easeOut" }}
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: "28px",
                  padding: "40px",
                }}
              >
                <span style={{ fontFamily: "var(--font-body)", fontSize: "12px", letterSpacing: "0.1em", textTransform: "uppercase", color: "#7dd3e8" }}>
                  {track.tag}
                </span>
                <h3 style={{ fontFamily: "var(--font-heading)", fontSize: "26px", fontWeight: 400, color: "#fff", margin: "14px 0 12px" }}>
                  {track.title}
                </h3>
                <p style={{ fontFamily: "var(--font-body)", fontSize: "16px", color: "rgba(255,255,255,0.55)", lineHeight: 1.6, marginBottom: "24px" }}>
                  {track.desc}
                </p>
                <ul style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  {track.points.map((point) => (
                    <li key={point} style={{ display: "flex", alignItems: "center", gap: "10px", fontFamily: "var(--font-body)", fontSize: "14px", color: "rgba(255,255,255,0.7)" }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7dd3e8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                        <path d="M20 6L9 17l-5-5" />
                      </svg>
                      {point}
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* For schools */}
      <section id="educators" style={{ position: "relative", zIndex: 10, backgroundColor: "#1c1c1e", padding: "0 40px 140px" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto", background: "linear-gradient(135deg, rgba(8,145,178,0.12), rgba(79,70,229,0.08))", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "32px", padding: "64px 48px", display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: "56px", alignItems: "center" }}>
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.7, ease: [0.2, 0.65, 0.3, 0.9] }}
          >
            <span style={{ fontFamily: "var(--font-body)", fontSize: "13px", letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.4)" }}>
              For schools
            </span>
            <h2 style={{ fontFamily: "var(--font-heading)", fontSize: "clamp(28px, 3.4vw, 40px)", fontWeight: 400, color: "#fff", margin: "16px 0 20px", letterSpacing: "-0.02em" }}>
              Bring your students to the track and the classroom.
            </h2>
            <p style={{ fontFamily: "var(--font-body)", fontSize: "16px", color: "rgba(255,255,255,0.55)", lineHeight: 1.65, marginBottom: "32px" }}>
              Register your school, and once a Hanbee staff member verifies it, invite your students, form tournament teams, and follow their course progress — all from one dashboard.
            </p>
            <motion.a
              href="/login?mode=signup&role=School"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              style={{ display: "inline-flex", alignItems: "center", gap: "10px", background: "#fff", color: "#0a0a0c", padding: "14px 28px", borderRadius: "999px", fontFamily: "var(--font-body)", fontWeight: 600, fontSize: "15px" }}
            >
              Register your school
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="M12 5l7 7-7 7" /></svg>
            </motion.a>
          </motion.div>

          <motion.ol
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.7, delay: 0.1, ease: [0.2, 0.65, 0.3, 0.9] }}
            style={{ display: "flex", flexDirection: "column", gap: "20px" }}
          >
            {[
              { n: "01", t: "Register your school", d: "Share your school's name — no paperwork required to get started." },
              { n: "02", t: "Get verified", d: "A Hanbee manager or staff member reviews and verifies your school." },
              { n: "03", t: "Invite your students", d: "Send join links by email, bulk or one at a time." },
              { n: "04", t: "Track and compete", d: "Form teams for the tournament and follow classroom progress." },
            ].map((step) => (
              <li key={step.n} style={{ display: "flex", gap: "16px", alignItems: "flex-start" }}>
                <span style={{ fontFamily: "monospace", fontSize: "14px", color: "rgba(255,255,255,0.35)", minWidth: "28px" }}>{step.n}</span>
                <div>
                  <strong style={{ fontFamily: "var(--font-heading)", fontWeight: 500, fontSize: "16px", color: "#fff", display: "block", marginBottom: "4px" }}>{step.t}</strong>
                  <span style={{ fontFamily: "var(--font-body)", fontSize: "14px", color: "rgba(255,255,255,0.5)" }}>{step.d}</span>
                </div>
              </li>
            ))}
          </motion.ol>
        </div>
      </section>

      {/* About */}
      <section id="about" style={{ position: "relative", zIndex: 10, backgroundColor: "#1c1c1e", padding: "0 40px 160px" }}>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.7, ease: [0.2, 0.65, 0.3, 0.9] }}
          style={{ maxWidth: "800px", margin: "0 auto", textAlign: "center" }}
        >
          <span style={{ fontFamily: "var(--font-body)", fontSize: "13px", letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.4)" }}>
            Why Hanbee
          </span>
          <h2 style={{ fontFamily: "var(--font-heading)", fontSize: "clamp(26px, 3.2vw, 36px)", fontWeight: 400, color: "#fff", margin: "16px 0 0", lineHeight: 1.4, letterSpacing: "-0.01em" }}>
            Most courses end where the real learning starts. We built Hanbee so the thing you coded actually has to work — on a track, against the clock, against other teams.
          </h2>
        </motion.div>
      </section>

      {/* Footer */}
      <footer style={{ position: "relative", zIndex: 10, backgroundColor: "#161618", borderTop: "1px solid rgba(255,255,255,0.06)", padding: "56px 40px 32px" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto", display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: "32px", paddingBottom: "40px" }}>
          <div>
            <span style={{ fontFamily: "var(--font-logo, var(--font-heading))", fontSize: "22px", color: "#fff", letterSpacing: "0.02em" }}>HANBEE</span>
            <p style={{ fontFamily: "var(--font-body)", fontSize: "14px", color: "rgba(255,255,255,0.4)", marginTop: "10px", maxWidth: "280px" }}>
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
