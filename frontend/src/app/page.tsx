"use client";

import { useRef, useEffect, useState } from "react";
import Image from "next/image";
import IndependentStudentModal from "@/components/IndependentStudentModal/IndependentStudentModal";
import { motion, AnimatePresence } from "framer-motion";
import Navbar from "@/components/Navbar/Navbar";
import Hero from "@/components/Hero/Hero";
import AnimatedHeading from "@/components/AnimatedHeading/AnimatedHeading";
import SeasonLeague from "@/components/SeasonLeague/SeasonLeague";
import InteractiveCar from "@/components/InteractiveCar/InteractiveCar";
import RaceDaySchedule from "@/components/RaceDaySchedule/RaceDaySchedule";
import RegistrationSection from "@/components/RegistrationSection/RegistrationSection";
import {
  ArrowRight,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import styles from "./page.module.css";

const TECH_CONCEPTS = [
  {
    label: "Build the flight controller",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <rect x="5" y="5" width="14" height="14" rx="2.5" fill="#141620" stroke="#e58a2b" strokeWidth="1.6" />
        <rect x="8.5" y="8.5" width="7" height="7" rx="1" fill="#e58a2b" fillOpacity="0.4" stroke="#ffffff" strokeWidth="1" />
        <path d="M9 2V5M12 2V5M15 2V5M9 19V22M12 19V22M15 19V22M2 9H5M2 12H5M2 15H5M19 9H22M19 12H22M19 15H22" stroke="rgba(255,255,255,0.75)" strokeWidth="1.3" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    label: "Write your own code",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <path d="M7 8L3 12L7 16M17 8L21 12L17 16M14 4L10 20" stroke="#e58a2b" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    label: "Learn Java",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <path d="M8 2C8 3.5 10 3.5 10 5M12 2C12 3.5 14 3.5 14 5M16 2C16 3.5 18 3.5 18 5" stroke="#e58a2b" strokeWidth="1.3" strokeLinecap="round" />
        <path d="M4 7H18V13C18 15.2091 16.2091 17 14 17H8C5.79086 17 4 15.2091 4 13V7Z" fill="#141620" stroke="#ffffff" strokeWidth="1.5" />
        <path d="M18 9H19.5C20.8807 9 22 10.1193 22 11.5C22 12.8807 20.8807 14 19.5 14H18" stroke="#e58a2b" strokeWidth="1.4" strokeLinecap="round" />
        <path d="M3 20H19" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    label: "Explore algorithms",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="4" r="2.5" fill="#e58a2b" stroke="#ffffff" strokeWidth="1.2" />
        <path d="M10 6L6 11M14 6L18 11M6 13.5L4 18M6 13.5L8.5 18M18 13.5L15.5 18M18 13.5L20 18" stroke="rgba(255,255,255,0.45)" strokeWidth="1.4" strokeLinecap="round" />
        <circle cx="6" cy="12" r="2" fill="#181a24" stroke="#e58a2b" strokeWidth="1.4" />
        <circle cx="18" cy="12" r="2" fill="#181a24" stroke="#e58a2b" strokeWidth="1.4" />
        <circle cx="4" cy="19" r="1.5" fill="#ffffff" />
        <circle cx="8.5" cy="19" r="1.5" fill="#ffffff" />
        <circle cx="15.5" cy="19" r="1.5" fill="#ffffff" />
        <circle cx="20" cy="19" r="1.5" fill="#ffffff" />
      </svg>
    ),
  },
  {
    label: "Design with React",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <ellipse cx="12" cy="12" rx="10" ry="3.8" stroke="#58c4dc" strokeWidth="1.5" />
        <ellipse cx="12" cy="12" rx="10" ry="3.8" transform="rotate(60 12 12)" stroke="#58c4dc" strokeWidth="1.5" />
        <ellipse cx="12" cy="12" rx="10" ry="3.8" transform="rotate(120 12 12)" stroke="#58c4dc" strokeWidth="1.5" />
        <circle cx="12" cy="12" r="2" fill="#58c4dc" />
      </svg>
    ),
  },
  {
    label: "Race at the Hanbee RC Cup",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <path d="M6 3H18V10C18 13.3137 15.3137 16 12 16C8.68629 16 6 13.3137 6 10V3Z" fill="rgba(229,138,43,0.25)" stroke="#e58a2b" strokeWidth="1.5" />
        <path d="M6 5H3C2.44772 5 2 5.44772 2 6V7C2 9.20914 3.79086 11 6 11" stroke="#e58a2b" strokeWidth="1.4" strokeLinecap="round" />
        <path d="M18 5H21C21.5523 5 22 5.44772 22 6V7C22 9.20914 20.2091 11 18 11" stroke="#e58a2b" strokeWidth="1.4" strokeLinecap="round" />
        <path d="M12 16V19M8 21H16" stroke="#ffffff" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    ),
  },
];

const LEAGUE_COMPANIES = [
  {
    name: "STM32",
    logo: (
      <svg width="34" height="26" viewBox="0 0 48 36" fill="none">
        <path d="M4 28L18 8H30L16 28H4Z" fill="#e58a2b" />
        <path d="M22 28L36 8H44L30 28H22Z" fill="#ffffff" />
      </svg>
    ),
  },
  {
    name: "BOSCH",
    logo: (
      <svg width="32" height="32" viewBox="0 0 40 40" fill="none">
        <circle cx="20" cy="20" r="16" stroke="#ffffff" strokeWidth="3" />
        <rect x="13" y="11" width="14" height="18" rx="2" stroke="#e58a2b" strokeWidth="2.5" />
        <circle cx="20" cy="20" r="3.5" fill="#ffffff" />
      </svg>
    ),
  },
  {
    name: "ANSYS",
    logo: (
      <svg width="30" height="30" viewBox="0 0 40 40" fill="none">
        <path d="M8 32L24 6L32 6L40 32H31L28 24H17L14 32H8ZM19 18H26L22.5 9L19 18Z" fill="#e58a2b" />
      </svg>
    ),
  },
  {
    name: "MathWorks",
    logo: (
      <svg width="36" height="28" viewBox="0 0 48 40" fill="none">
        <path d="M6 30C12 28 16 12 24 12C32 12 36 32 42 22" stroke="#e58a2b" strokeWidth="3.5" strokeLinecap="round" />
        <path d="M6 22C14 22 18 34 26 34C34 34 38 18 42 18" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeDasharray="3 3" />
      </svg>
    ),
  },
  {
    name: "FUTABA",
    logo: (
      <svg width="32" height="32" viewBox="0 0 40 40" fill="none">
        <rect x="5" y="5" width="30" height="30" rx="8" fill="#181a24" stroke="#ffffff" strokeWidth="2" />
        <path d="M14 12H26M14 19H23M14 12V28" stroke="#e58a2b" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    name: "BAMBU LAB",
    logo: (
      <svg width="32" height="32" viewBox="0 0 40 40" fill="none">
        <rect x="6" y="6" width="12" height="12" rx="3" fill="#e58a2b" />
        <rect x="22" y="6" width="12" height="12" rx="3" fill="#ffffff" />
        <rect x="6" y="22" width="12" height="12" rx="3" fill="#ffffff" />
        <rect x="22" y="22" width="12" height="12" rx="3" fill="#e58a2b" />
      </svg>
    ),
  },
];

export default function Home() {
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const trackVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = trackVideoRef.current;
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
      { threshold: 0.15 }
    );

    observer.observe(video);
    return () => observer.disconnect();
  }, []);

  return (
    <main className={styles.mainWrapper}>
      <Navbar />

      {/* Hero section */}
      <Hero onOpenStudentModal={() => setIsStudentModalOpen(true)} />

      {/* Broad Tie-Up Companies Ribbon (Matching User Reference: Broad, Big, 6 Companies, Left-to-Right) */}
      <section className={styles.partnersRibbon}>
        <div className={styles.partnersTrackWrapper}>
          <div className={styles.partnersTrack}>
            {[...LEAGUE_COMPANIES, ...LEAGUE_COMPANIES].map((company, i) => (
              <div className={styles.partnerCard} key={i}>
                <div className={styles.partnerLogoWrap}>
                  {company.logo}
                </div>
                <span className={styles.partnerName}>{company.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 1: The Six-Month Competition Plan */}
      <section className={styles.sectionDark} id="courses">
        <div className={styles.container}>
          <motion.div
            className={styles.sectionHeader}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-30px" }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          >
            <span className={styles.badge}>The season, at a glance</span>
            <AnimatedHeading as="h2" className={styles.mainTitle}>
              Six months. Six races. Every round counts.
            </AnimatedHeading>
            <p className={styles.subtitle}>
              Earn points month by month and see how far your team can climb.
            </p>
          </motion.div>

          <SeasonLeague />
        </div>
      </section>

      {/* Concept Ticker with Custom Themed Vectors (Placed right above The League Racer) */}
      <div className={styles.techTickerWrap}>
        <div className={styles.techTickerTrack}>
          {[...TECH_CONCEPTS, ...TECH_CONCEPTS, ...TECH_CONCEPTS].map((concept, i) => (
            <div className={styles.techTickerItem} key={i}>
              <div className={styles.techTickerIcon}>
                {concept.icon}
              </div>
              <span className={styles.techTickerText}>{concept.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* SECTION 2: The Machine (Interactive Car CAD Explorer) */}
      <section className={styles.sectionMid} id="machine">
        <div className={styles.container}>
          <motion.div
            className={styles.sectionHeader}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-30px" }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          >
            <span className={styles.badge}>Meet your machine</span>
            <AnimatedHeading as="h2" className={styles.mainTitle}>
              From the workbench to the starting grid.
            </AnimatedHeading>
            <p className={styles.subtitle}>
              One shared design. Every team builds, tunes, and races its own.
            </p>
          </motion.div>

          <InteractiveCar />
        </div>
      </section>

      {/* SECTION 3: Race Day Operations & Protocol */}
      <section className={styles.sectionDark} id="event-day">
        <div className={styles.container}>
          <motion.div
            className={styles.sectionHeader}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-30px" }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          >
            <span className={styles.badge}>Race day</span>
            <AnimatedHeading as="h2" className={styles.mainTitle}>
              From morning inspection to the podium.
            </AnimatedHeading>
            <p className={styles.subtitle}>
              A race day, from the first check to the final awards.
            </p>
          </motion.div>

          <RaceDaySchedule />
        </div>
      </section>

      {/* SECTION 4: Grid Registration (Schools vs. Solo) */}
      <section className={styles.sectionMid} id="educators">
        <div className={styles.container}>
          <motion.div
            className={styles.sectionHeader}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-30px" }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          >
            <span className={styles.badge}>Find your place on the grid</span>
            <AnimatedHeading as="h2" className={styles.mainTitle}>
              Choose your way into the race.
            </AnimatedHeading>
            <p className={styles.subtitle}>
              Come with your school team, or join as an independent student. Either way, there is a place for you to build, test, and race.
            </p>
          </motion.div>

          <RegistrationSection onOpenStudentModal={() => setIsStudentModalOpen(true)} />
        </div>
      </section>

      {/* SECTION 6: Track Atmosphere Video Banner */}
      <section className={styles.cinematicBanner}>
        <div className={styles.videoBackdrop}>
          <video
            ref={trackVideoRef}
            className={styles.bannerVideo}
            playsInline
            muted
            loop
            preload="none"
          >
            <source src="/race-track-video.mp4" type="video/mp4" />
          </video>
          <div className={styles.bannerOverlay} />
        </div>

        <div className={styles.bannerContent}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
          >
            <span className={styles.bannerEyebrow}>Every round keeps you in the race</span>
            <h2 className={styles.bannerHeading}>One tough round doesn&apos;t end your season.</h2>
            <p className={styles.bannerText}>
              Your points add up across all six rounds. A difficult month is a setback—not the finish line.
            </p>
            <div className={styles.bannerActionGroup}>
              <a href="/login?mode=signup" className={styles.bannerPrimaryBtn}>
                Join the grid
                <ArrowRight size={16} />
              </a>
              <a href="/apply" className={styles.bannerSecondaryBtn}>
                Talk to us about your school
              </a>
            </div>
          </motion.div>
        </div>
      </section>

      {/* SECTION 7: Competition Rules & FAQ */}
      <section className={styles.faqSection} id="about">
        <div className={styles.containerSm}>
          <div className={styles.sectionHeader}>
            <span className={styles.badge}>FAQ</span>
            <AnimatedHeading as="h2" className={styles.mainTitle}>
              A few things you might be wondering.
            </AnimatedHeading>
          </div>

          <div className={styles.faqList}>
            {[
              {
                q: "How do points add up across the season?",
                a: "Each round follows the F1 points scale: 1st: 25, 2nd: 18, 3rd: 15, 4th: 12, 5th: 10, 6th: 8, 7th: 6, 8th: 4, 9th: 2, and 10th: 1. Your points add up across all six rounds.",
              },
              {
                q: "What if there's a collision or a mechanical problem?",
                a: "If another car hits you and it wasn't your fault, Race Control grants a restart. Teams also get one repair window per round for mechanical issues.",
              },
              {
                q: "How does the Grand Championship round work?",
                a: "After Month 5, the top eight teams on the season leaderboard qualify for the Grand Championship Final. Every other team races in the Placement Finals for season rankings and awards.",
              },
              {
                q: "Can we bring in a substitute driver?",
                a: "Yes. Each team may register one substitute student, with school approval and a heads-up to the Race Director.",
              },
              {
                q: "What happens if teams finish level on points?",
                a: "We break ties in this order: most round wins, most second-place finishes, then each team's finishing place in the Grand Championship Final.",
              },
            ].map((faq, idx) => (
              <details key={idx} className={styles.faqCard}>
                <summary className={styles.faqSummary}>
                  <span>{faq.q}</span>
                  <ChevronDown size={18} className={styles.faqChevron} />
                </summary>
                <p className={styles.faqAnswer}>{faq.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* FOOTER - Futuristic Motorsport Telemetry & Paddock Directory */}
      <footer className={styles.footer}>
        <div className={styles.footerGlowLine} />

        <div className={styles.container}>
          <div className={styles.footerMainGrid}>
            {/* Left: Brand Identity & Quick Connect */}
            <div className={styles.footerBrandCol}>
              <div className={styles.footerLogoRow}>
                <Image
                  src="/brand/hanbee-logo-white.png"
                  alt="HANBEE"
                  width={198}
                  height={18}
                  className={styles.footerLogoImg}
                />
              </div>
              <div className={styles.footerSocialRow}>
                <a
                  href="https://www.linkedin.com/company/hanbee-india/posts/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.socialIconBtn}
                  aria-label="Connect on LinkedIn"
                  title="Connect on LinkedIn"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9v8.37H9.2V10.9H6.46M7.83 6.25c-.95 0-1.72.78-1.72 1.73s.77 1.73 1.72 1.73 1.73-.78 1.73-1.73-.78-1.73-1.73-1.73Z"/>
                  </svg>
                </a>
                <a
                  href="https://www.instagram.com/hanbee.in?igsh=b2thYzA4Mm05enNk"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.socialIconBtn}
                  aria-label="Follow on Instagram"
                  title="Follow on Instagram"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
                    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
                    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
                  </svg>
                </a>
              </div>
            </div>

            {/* Middle: 3 Structured Navigation Columns */}
            <div className={styles.footerNavGroup}>
              <div className={styles.footerNavCol}>
                <span className={styles.footerSectionHeader}>Join the race</span>
                <ul className={styles.footerLinkList}>
                  <li><a href="#educators" className={styles.footerLink}>Enter as a school</a></li>
                  <li><button onClick={() => setIsStudentModalOpen(true)} className={styles.footerLinkBtn}>Join as an independent student</button></li>
                  <li><a href="/login?mode=signup" className={styles.footerLink}>Register your team</a></li>
                  <li><a href="/apply" className={styles.footerLink}>Ask about schools</a></li>
                </ul>
              </div>

              <div className={styles.footerNavCol}>
                <span className={styles.footerSectionHeader}>Learning &amp; tools</span>
                <ul className={styles.footerLinkList}>
                  <li><a href="/login" className={styles.footerLink}>Student Portal</a></li>
                  <li><a href="/login" className={styles.footerLink}>Faculty Dashboard</a></li>
                  <li><a href="/login" className={styles.footerLink}>Course Modules</a></li>
                </ul>
              </div>

              <div className={styles.footerNavCol}>
                <span className={styles.footerSectionHeader}>Good to know</span>
                <ul className={styles.footerLinkList}>
                  <li><a href="/about" className={styles.footerLink}>About Hanbee</a></li>
                  <li><a href="/contact" className={styles.footerLink}>Get in touch</a></li>
                  <li><a href="/fees" className={styles.footerLink}>Fees &amp; payments</a></li>
                  <li><a href="/privacy-policy" className={styles.footerLink}>Privacy policy</a></li>
                  <li><a href="/terms" className={styles.footerLink}>Terms &amp; conditions</a></li>
                  <li><a href="/refund-policy" className={styles.footerLink}>Refunds &amp; cancellations</a></li>
                </ul>
              </div>

              <div className={styles.footerNavCol}>
                <span className={styles.footerSectionHeader}>Stay in touch</span>
                <ul className={styles.footerLinkList}>
                  <li>
                    <a
                      href="https://www.linkedin.com/company/hanbee-india/posts/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.footerSocialLink}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9v8.37H9.2V10.9H6.46M7.83 6.25c-.95 0-1.72.78-1.72 1.73s.77 1.73 1.72 1.73 1.73-.78 1.73-1.73-.78-1.73-1.73-1.73Z"/>
                      </svg>
                      <span>LinkedIn</span>
                    </a>
                  </li>
                  <li>
                    <a
                      href="https://www.instagram.com/hanbee.in?igsh=b2thYzA4Mm05enNk"
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.footerSocialLink}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
                        <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
                        <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
                      </svg>
                      <span>Instagram</span>
                    </a>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Bottom Bar: Telemetry Line, Copyright & Back to Top */}
          <div className={styles.footerBottomBar}>
            <div className={styles.bottomLeft}>
              <span className={styles.copyrightText}>
                &copy; {new Date().getFullYear()} Hanbee F1 RC Racing League. All rights reserved.
              </span>
            </div>

          </div>
        </div>
      </footer>

      <IndependentStudentModal
        isOpen={isStudentModalOpen}
        onClose={() => setIsStudentModalOpen(false)}
      />
    </main>
  );
}
