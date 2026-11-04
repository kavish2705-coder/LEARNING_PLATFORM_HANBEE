"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { 
  GraduationCap, 
  Terminal, 
  ArrowRight, 
  Check, 
  ShieldCheck, 
  Users, 
  Cpu, 
  Sparkles,
  Trophy
} from "lucide-react";
import styles from "./RegistrationSection.module.css";

interface RegistrationSectionProps {
  onOpenStudentModal: () => void;
}

export default function RegistrationSection({ onOpenStudentModal }: RegistrationSectionProps) {

  return (
    <div className={styles.registrationContainer}>
      {/* Dual Interactive Paddock Cards */}
      <div className={styles.paddockGrid}>
        {/* Card 1: School Squad */}
        <div className={styles.paddockCard}>
          <div className={styles.cardGlowBorder} />
          <div className={styles.paddockCardContent}>
            <div className={styles.paddockHeader}>
              <div className={styles.iconBadge}>
                <GraduationCap size={20} />
              </div>

            </div>

            <h3 className={styles.cardTitle}>School Squad Entry</h3>
            <p className={styles.cardDesc}>
              Each registered school fields up to 2 competition teams (5 students each). Faculty mentors receive verified roster tools, curriculum progress dashboards, and dedicated pit bays on track days.
            </p>

            <div className={styles.perksList}>
              {[
                "2 competition teams per school (10 active students total)",
                "Dedicated faculty mentor & school coordinator access",
                "Registered substitute student allowance per team",
                "Official event photography, race footage & telemetry records",
              ].map((perk, idx) => (
                <div key={idx} className={styles.perkRow}>
                  <div className={styles.perkCheckWrap}>
                    <Check size={14} />
                  </div>
                  <span>{perk}</span>
                </div>
              ))}
            </div>

            <div className={styles.cardActionRow}>
              <a href="/login?mode=signup&role=School" className={styles.primaryPaddockBtn}>
                <span>Register Your School</span>
                <ArrowRight size={16} />
              </a>

            </div>
          </div>
        </div>

        {/* Card 2: Independent Student */}
        <div className={styles.paddockCard}>
          <div className={styles.cardGlowBorder} />
          <div className={styles.paddockCardContent}>
            <div className={styles.paddockHeader}>
              <div className={styles.iconBadge}>
                <Terminal size={20} />
              </div>

            </div>

            <h3 className={styles.cardTitle}>Independent Student</h3>
            <p className={styles.cardDesc}>
              If your school doesn&apos;t field a squad yet, you don&apos;t have to sit out. Build your car, access complete flight controller and firmware modules, and enter the solo qualifying pool.
            </p>

            <div className={styles.perksList}>
              {[
                "Solo qualifier entry into the Hanbee F1 RC Racing League",
                "Complete access to C++, Java & flight controller curriculum",
                "Option to join student matchmaking pools to form teams",
                "Full F1 championship points eligibility all six months",
              ].map((perk, idx) => (
                <div key={idx} className={styles.perkRow}>
                  <div className={styles.perkCheckWrap}>
                    <Check size={14} />
                  </div>
                  <span>{perk}</span>
                </div>
              ))}
            </div>

            <div className={styles.cardActionRow}>
              <button onClick={onOpenStudentModal} className={styles.secondaryPaddockBtn}>
                <span>Join Independent Pool</span>
                <ArrowRight size={16} />
              </button>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

