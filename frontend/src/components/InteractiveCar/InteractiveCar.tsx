"use client";

import { useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { Cpu, Shield, Zap, Radio } from "lucide-react";
import styles from "./InteractiveCar.module.css";

interface ComponentSpec {
  id: string;
  name: string;
  tag: string;
  icon: React.ElementType;
  metric: string;
  metricLabel: string;
  specs: { label: string; value: string }[];
  coords: { x: number; y: number };
}

const COMPONENTS: ComponentSpec[] = [
  {
    id: "fc",
    name: "Flight Controller",
    tag: "Controller",
    icon: Cpu,
    metric: "168 MHz",
    metricLabel: "ARM Processing",
    specs: [
      { label: "Core MCU", value: "STM32 Cortex-M4" },
      { label: "IMU", value: "6-Axis MPU6050" },
      { label: "Loop Rate", value: "1 kHz" },
      { label: "Firmware", value: "Java / C++" },
    ],
    coords: { x: 50, y: 44 },
  },
  {
    id: "chassis",
    name: "Chassis",
    tag: "Chassis",
    icon: Shield,
    metric: "840g",
    metricLabel: "Curb Weight",
    specs: [
      { label: "Material", value: "T300 Carbon Weave" },
      { label: "Wheelbase", value: "258 mm" },
      { label: "Downforce", value: "Venturi Tunnel Floor" },
      { label: "Suspension", value: "Oil-Filled Coilovers" },
    ],
    coords: { x: 30, y: 55 },
  },
  {
    id: "powertrain",
    name: "Drive & ESC",
    tag: "Drivetrain",
    icon: Zap,
    metric: "48 km/h",
    metricLabel: "Top Speed",
    specs: [
      { label: "Motor", value: "Brushless 3800KV" },
      { label: "Peak Current", value: "60A Continuous" },
      { label: "0–40 km/h", value: "1.4 s" },
      { label: "Battery", value: "11.1V 3S LiPo" },
    ],
    coords: { x: 74, y: 52 },
  },
  {
    id: "telemetry",
    name: "Telemetry",
    tag: "Telemetry",
    icon: Radio,
    metric: "<4 ms",
    metricLabel: "RF Latency",
    specs: [
      { label: "Protocol", value: "2.4 GHz FHSS" },
      { label: "Range", value: "300 m LOS" },
      { label: "Timing", value: "IR / RFID Transponder" },
      { label: "Bus", value: "CAN / UART" },
    ],
    coords: { x: 50, y: 72 },
  },
];

export default function InteractiveCar() {
  const [selected, setSelected] = useState(COMPONENTS[0]);

  return (
    <div className={styles.wrapper}>
      <div className={styles.selectorBar}>
        {COMPONENTS.map((comp) => {
          const active = selected.id === comp.id;
          const Icon = comp.icon;
          return (
            <button
              key={comp.id}
              onClick={() => setSelected(comp)}
              className={`${styles.chip} ${active ? styles.chipActive : ""}`}
            >
              <Icon size={15} />
              <span>{comp.name}</span>
            </button>
          );
        })}
      </div>

      <div className={styles.grid}>
        <div className={styles.visualFrame}>
          <div className={styles.carImageContainer}>
            <Image
              src="/rc-car-exploded.png"
              alt="Exploded diagram of Hanbee RC Racer"
              width={683}
              height={614}
              sizes="(max-width: 480px) 60vw, (max-width: 960px) 90vw, 55vw"
              className={styles.carImg}
            />
          </div>
        </div>

        <div className={styles.detailsPanel}>
          <AnimatePresence mode="wait">
            <motion.div
              key={selected.id}
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className={styles.details}
            >
              <div className={styles.tagRow}>
                <span className={styles.tagPill}>{selected.tag}</span>
                <span className={styles.metric}>
                  <strong>{selected.metric}</strong> {selected.metricLabel}
                </span>
              </div>

              <h3 className={styles.compTitle}>{selected.name}</h3>

              <div className={styles.specGrid}>
                {selected.specs.map((spec, i) => (
                  <div key={i} className={styles.specItem}>
                    <span className={styles.specLabel}>{spec.label}</span>
                    <strong className={styles.specVal}>{spec.value}</strong>
                  </div>
                ))}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
