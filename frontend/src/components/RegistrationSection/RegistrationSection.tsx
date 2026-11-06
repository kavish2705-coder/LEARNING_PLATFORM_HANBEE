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

            <h3 className={styles.cardTitle}>Enter as a school squad</h3>
            <p className={styles.cardDesc}>
              Your school can field up to two teams of five. Faculty mentors get roster tools and course-progress dashboards, plus a dedicated pit bay on race days.
            </p>

            <div className={styles.perksList}>
              {[
                "Up to two teams and ten active students per school",
                "Access for a faculty mentor and school coordinator",
                "One registered substitute student per team",
                "Official event photos, race footage, and telemetry records",
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
                <span>Register your school</span>
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

            <h3 className={styles.cardTitle}>Join as an independent student</h3>
            <p className={styles.cardDesc}>
              No team at your school? You can still take part. Build your car, explore the full flight-controller and firmware modules, and race your way into the solo qualifying pool.
            </p>

            <div className={styles.perksList}>
              {[
                "Solo qualifying in the Hanbee F1 RC Racing League",
                "Courses in C++, Java, and flight-controller design",
                "Find teammates through student matchmaking",
                "Compete for championship points throughout all six months",
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
                <span>Join the independent pool</span>
                <ArrowRight size={16} />
              </button>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
