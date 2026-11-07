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

            <h3 className={styles.cardTitle}>Enter as a school team</h3>
            <p className={styles.cardDesc}>
              Your school can field up to two teams of five students, with real mentor supervision throughout. Faculty get roster tools and course-progress dashboards, so you can track exactly how each student is doing.
            </p>

            <div className={styles.perksList}>
              {[
                "Up to two teams and ten active students per school",
                "Dedicated access for a faculty mentor and school coordinator",
                "One registered substitute student per team",
                "Official event photos and progress records parents can review",
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
              No team at your school? Your child can still take part on their own. They learn real coding and engineering skills, build their own working model, and join a verified solo qualifying pool.
            </p>

            <div className={styles.perksList}>
              {[
                "A verified solo path into the Hanbee Student Engineering Program",
                "Courses in C++, Java, and embedded controller design",
                "Find teammates through student matchmaking",
                "Clear, trackable progress every month for six months",
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
