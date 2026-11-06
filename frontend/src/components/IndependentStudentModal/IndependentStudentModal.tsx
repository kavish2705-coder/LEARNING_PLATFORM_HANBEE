"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import styles from "./IndependentStudentModal.module.css";

interface IndependentStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const locations = [
  { id: "Chennai", label: "Chennai" },
  { id: "Chengalpattu", label: "Chengalpattu" },
  { id: "Kanchipuram", label: "Kanchipuram" },
  { id: "Coimbatore", label: "Coimbatore" },
  { id: "Other", label: "Other city" },
];

const trackOptions = [
  {
    id: "Tournament Track (Hardware & Code)",
    title: "Tournament Track",
    badge: "Hardware",
    desc: "Build and program your RC car's flight controller, tune the chassis, and race solo at the Hanbee RC Cup.",
  },
  {
    id: "Classroom Track (Java · DSA · React)",
    title: "Classroom Track",
    badge: "Software",
    desc: "Structured courses in Java, data structures, and React with self-paced lessons and auto-graded checks.",
  },
  {
    id: "Both Tracks (Tournament + Classroom)",
    title: "Both Tracks",
    badge: "Full Access",
    desc: "Build and race the car in the tournament, plus complete access to all classroom coding courses.",
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
        const body = await res.json().catch(() => null);
        setError(body?.error || "We couldn't save your application. Please try again.");
        return;
      }

      setSubmitted(true);
    } catch (err) {
      setError("We couldn't reach the server. Check your connection and try again.");
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
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--landing-accent)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <div className={styles.successEyebrow}>APPLICATION RECEIVED</div>
                <h3 className={styles.successTitle}>Thank you, {fullName}</h3>
                <p className={styles.successDesc}>
                  We&apos;ve recorded your application for{" "}
                  <strong>{location === "Other" && customLocation ? customLocation : location}</strong>.
                </p>
                <div className={styles.successNextStep}>
                  <div className={styles.nextStepItem}>
                    <span className={styles.nextStepDot} />
                    <span>We&apos;ll send course information and kit details to <strong>{email}</strong>.</span>
                  </div>
                  <div className={styles.nextStepItem}>
                    <span className={styles.nextStepDot} />
                    <span>Our team will message you on WhatsApp at <strong>{phone}</strong> to confirm your onboarding.</span>
                  </div>
                </div>
                <button
                  type="button"
                  className={styles.submitBtn}
                  onClick={handleResetAndClose}
                  style={{ marginTop: "24px" }}
                >
                  Back to Home
                </button>
              </div>
            ) : (
              <div>
                {/* Header */}
                <div className={styles.header}>
                  <div className={styles.telemetryTag}>
                    <span className={styles.livePulse} />
                    <span>Independent Student</span>
                  </div>
                  <h2 className={styles.title}>Apply as a Solo Student</h2>
                  <p className={styles.subtitle}>
                    You don&apos;t need a school team to join. Build your car, take the courses, and compete on your own at the Hanbee RC Cup.
                  </p>
                </div>

                <form onSubmit={handleSubmit} className={styles.form}>
                  {/* Name & Contact Grid */}
                  <div className={styles.fieldGrid}>
                    <div className={styles.fieldGroup}>
                      <label className={styles.label}>
                        <span>Full Name</span>
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
                        <span>Phone / WhatsApp</span>
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
                      <span>Email Address</span>
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

                  {/* Track Selection */}
                  <div className={styles.fieldGroup}>
                    <div className={styles.label}>
                      <span>Select Track</span>
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

                  {/* Location Selector */}
                  <div className={styles.fieldGroup}>
                    <div className={styles.label}>
                      <span>Location</span>
                      <span className={styles.subLabel}>Where are you based?</span>
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
                          placeholder="Enter your city or district"
                          value={customLocation}
                          onChange={(e) => setCustomLocation(e.target.value)}
                          required
                        />
                      </motion.div>
                    )}
                  </div>

                  {/* Optional Notes / Questions */}
                  <div className={styles.fieldGroup}>
                    <label className={styles.label}>
                      <span>Notes or questions (Optional)</span>
                    </label>
                    <textarea
                      className={styles.textarea}
                      rows={2}
                      placeholder="Any questions for the team, or previous coding / RC experience..."
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                    />
                  </div>

                  {error && <div className={styles.errorBox}>{error}</div>}

                  {/* Submit & Trust Note */}
                  <div className={styles.actionWrap}>
                    <button
                      type="submit"
                      className={styles.submitBtn}
                      disabled={submitting}
                    >
                      <span>{submitting ? "Submitting application..." : "Submit Application"}</span>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="5" y1="12" x2="19" y2="12" />
                        <polyline points="12 5 19 12 12 19" />
                      </svg>
                    </button>

                    <div className={styles.trustFooter}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 16 14" />
                      </svg>
                      <span>Our team will review your application and contact you on WhatsApp/email with next steps.</span>
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
