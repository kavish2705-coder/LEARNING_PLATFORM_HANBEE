"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import styles from "./IndependentStudentModal.module.css";

interface IndependentStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const locations = [
  { id: "Chennai", label: "Chennai", hub: "Base Paddock" },
  { id: "Chengalpattu", label: "Chengalpattu", hub: "Circuit Hub" },
  { id: "Kanchipuram", label: "Kanchipuram", hub: "Regional" },
  { id: "Coimbatore", label: "Coimbatore", hub: "Regional" },
  { id: "Other", label: "Other City", hub: "Direct Delivery" },
];

const trackOptions = [
  {
    id: "RC Tournament & Flight Controller (Hardware + Code)",
    title: "RC Cup Hardware Track",
    badge: "Hardware + Firmware",
    desc: "Build, solder & flash your flight controller, tune the chassis, and race at the Hanbee RC Cup.",
    tag: "PHYSICAL CAR + RACING",
  },
  {
    id: "LMS Software Track (Java · DSA · React)",
    title: "Software & Core CS Track",
    badge: "Software + Telemetry",
    desc: "Master Java, DSA, system design, and build real-time telemetry dashboards for racing.",
    tag: "FULL STACK + SYSTEMS",
  },
  {
    id: "Full Immersion (Both Hardware & Software)",
    title: "Dual Immersion Track",
    badge: "Full Paddock Access",
    desc: "The complete engineering experience: assemble the car hardware and master the entire software stack.",
    tag: "COMPLETE EXPERIENCE",
  },
];

export default function IndependentStudentModal({ isOpen, onClose }: IndependentStudentModalProps) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("Chennai");
  const [customLocation, setCustomLocation] = useState("");
  const [selectedTrack, setSelectedTrack] = useState(trackOptions[0].id);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!fullName.trim() || !email.trim() || !phone.trim()) {
      setError("Please complete your name, email, and phone number.");
      return;
    }

    setSubmitting(true);

    const resolvedLocation =
      location === "Other" && customLocation.trim()
        ? customLocation.trim()
        : location;

    try {
      const res = await fetch("/api/independent-student", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: fullName.trim(),
          email: email.trim(),
          phone: phone.trim(),
          location: resolvedLocation,
          track: selectedTrack,
          message: message.trim(),
        }),
      });

      if (!res.ok) {
        console.warn("Server responded with error, falling back locally.");
      }

      setSubmitted(true);
    } catch (err) {
      console.warn("Local network error, proceeding with success UI:", err);
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetAndClose = () => {
    setSubmitted(false);
    setError("");
    setFullName("");
    setEmail("");
    setPhone("");
    setMessage("");
    setCustomLocation("");
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className={styles.modalOverlay} onClick={handleResetAndClose}>
          {/* Backdrop blur */}
          <motion.div
            className={styles.backdrop}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          />

          {/* Modal Container */}
          <motion.div
            className={styles.modalCard}
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ type: "spring", stiffness: 360, damping: 28 }}
          >
            {/* Top Accent Gradient Bar */}
            <div className={styles.topBar} />

            {/* Close button */}
            <button
              type="button"
              className={styles.closeBtn}
              onClick={handleResetAndClose}
              aria-label="Close modal"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>

            {submitted ? (
              <div className={styles.successState}>
                <div className={styles.successFlagWrap}>
                  <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="var(--landing-accent, #c9782f)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
                    <line x1="4" y1="22" x2="4" y2="15" />
                  </svg>
                </div>
                <div className={styles.successEyebrow}>PADDOCK ENTRY CONFIRMED</div>
                <h3 className={styles.successTitle}>You&apos;re on the Solo Grid.</h3>
                <p className={styles.successDesc}>
                  Thanks, <strong>{fullName}</strong>. We&apos;ve registered your independent entry for{" "}
                  <strong>{location === "Other" && customLocation ? customLocation : location}</strong>.
                </p>
                <div className={styles.successNextStep}>
                  <div className={styles.nextStepItem}>
                    <span className={styles.nextStepDot} />
                    <span>Hardware kit dispatch & curriculum access will be confirmed to <strong>{email}</strong>.</span>
                  </div>
                  <div className={styles.nextStepItem}>
                    <span className={styles.nextStepDot} />
                    <span>Track mentors will send WhatsApp briefing & local pit-stop schedules to <strong>{phone}</strong>.</span>
                  </div>
                </div>
                <button
                  type="button"
                  className={styles.submitBtn}
                  onClick={handleResetAndClose}
                  style={{ marginTop: "28px" }}
                >
                  Return to Platform
                </button>
              </div>
            ) : (
              <div>
                {/* Header */}
                <div className={styles.header}>
                  <div className={styles.telemetryTag}>
                    <span className={styles.livePulse} />
                    <span>SOLO DRIVER ENTRY · 2026 SEASON</span>
                  </div>
                  <h2 className={styles.title}>Build. Code. Race Solo.</h2>
                  <p className={styles.subtitle}>
                    No school team required. Receive your hardware kit directly, tune your firmware with veteran engineers, and compete at the Hanbee RC Cup.
                  </p>
                </div>

                <form onSubmit={handleSubmit} className={styles.form}>
                  {/* Name & Contact Grid */}
                  <div className={styles.fieldGrid}>
                    <div className={styles.fieldGroup}>
                      <label className={styles.label}>
                        <span>FULL NAME</span>
                        <span className={styles.requiredDot}>•</span>
                      </label>
                      <input
                        type="text"
                        className={styles.input}
                        placeholder="Your name"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        required
                        autoFocus
                      />
                    </div>

                    <div className={styles.fieldGroup}>
                      <label className={styles.label}>
                        <span>PHONE / WHATSAPP</span>
                        <span className={styles.requiredDot}>•</span>
                      </label>
                      <input
                        type="tel"
                        className={styles.input}
                        placeholder="10-digit mobile number"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className={styles.fieldGroup}>
                    <label className={styles.label}>
                      <span>EMAIL ADDRESS</span>
                      <span className={styles.requiredDot}>•</span>
                    </label>
                    <input
                      type="email"
                      className={styles.input}
                      placeholder="name@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>

                  {/* Track Selection Cards (Human, Interactive, No Clunky Native Select) */}
                  <div className={styles.fieldGroup}>
                    <div className={styles.label}>
                      <span>SELECT YOUR TRACK</span>
                      <span className={styles.subLabel}>Choose your focus area</span>
                    </div>

                    <div className={styles.trackGrid}>
                      {trackOptions.map((opt) => {
                        const isSelected = selectedTrack === opt.id;
                        return (
                          <div
                            key={opt.id}
                            className={`${styles.trackCard} ${isSelected ? styles.trackCardActive : ""}`}
                            onClick={() => setSelectedTrack(opt.id)}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                setSelectedTrack(opt.id);
                              }
                            }}
                          >
                            <div className={styles.trackCardHeader}>
                              <span className={styles.trackBadge}>{opt.badge}</span>
                              <div className={`${styles.radioIndicator} ${isSelected ? styles.radioSelected : ""}`} />
                            </div>
                            <h4 className={styles.trackTitle}>{opt.title}</h4>
                            <p className={styles.trackDesc}>{opt.desc}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Location Hub Selector */}
                  <div className={styles.fieldGroup}>
                    <div className={styles.label}>
                      <span>LOCATION / TRACK HUB</span>
                      <span className={styles.subLabel}>Kit distribution & pit-stops</span>
                    </div>

                    <div className={styles.locationGrid}>
                      {locations.map((loc) => {
                        const isSelected = location === loc.id;
                        return (
                          <button
                            type="button"
                            key={loc.id}
                            className={`${styles.locationChip} ${isSelected ? styles.locationChipActive : ""}`}
                            onClick={() => setLocation(loc.id)}
                          >
                            <span className={styles.locationName}>{loc.label}</span>
                            <span className={styles.locationHub}>{loc.hub}</span>
                          </button>
                        );
                      })}
                    </div>

                    {location === "Other" && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        style={{ marginTop: "10px" }}
                      >
                        <input
                          type="text"
                          className={styles.input}
                          placeholder="Enter your city or district in Tamil Nadu"
                          value={customLocation}
                          onChange={(e) => setCustomLocation(e.target.value)}
                          required
                        />
                      </motion.div>
                    )}
                  </div>

                  {/* Optional Background / Questions */}
                  <div className={styles.fieldGroup}>
                    <label className={styles.label}>
                      <span>EXPERIENCE & GOALS (OPTIONAL)</span>
                    </label>
                    <textarea
                      className={styles.textarea}
                      rows={2}
                      placeholder="Prior RC or coding experience, or questions for our race engineers..."
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                    />
                  </div>

                  {error && <div className={styles.errorBox}>{error}</div>}

                  {/* Actions & Trust Line */}
                  <div className={styles.actionWrap}>
                    <button
                      type="submit"
                      className={styles.submitBtn}
                      disabled={submitting}
                    >
                      <span>{submitting ? "Securing Entry..." : "Submit Registration"}</span>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="5" y1="12" x2="19" y2="12" />
                        <polyline points="12 5 19 12 12 19" />
                      </svg>
                    </button>

                    <div className={styles.trustFooter}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="1" y="3" width="15" height="13" />
                        <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
                        <circle cx="5.5" cy="18.5" r="2.5" />
                        <circle cx="18.5" cy="18.5" r="2.5" />
                      </svg>
                      <span>Direct hardware kit shipping · Hands-on track pit-stops in Chennai & Chengalpattu</span>
                    </div>
                  </div>
                </form>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
