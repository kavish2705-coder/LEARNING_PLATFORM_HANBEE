"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Cpu, Shield, Zap, Radio, Check } from "lucide-react";
import styles from "./InteractiveCar.module.css";

interface ComponentSpec {
  id: string;
  name: string;
  tag: string;
  icon: any;
  metric: string;
  metricLabel: string;
  whatYouBuild: string;
  description: string;
  specs: { label: string; value: string }[];
  coords: { x: number; y: number }; // Percentage position on car diagram
}

const COMPONENTS: ComponentSpec[] = [
  {
    id: "fc",
    name: "Autonomous Flight Controller",
    tag: "BRAIN & FIRMWARE",
    icon: Cpu,
    metric: "168 MHz",
    metricLabel: "32-Bit ARM Processing",
    whatYouBuild: "You program the flight controller from scratch in Java/C++, tuning the PID control loop to hold racing lines at high speed.",
    description: "The electronic nervous system of the RC racer. Reads gyro telemetry at 1,000Hz and calculates motor vectors with zero noticeable latency.",
    specs: [
      { label: "Core MCU", value: "STM32 ARM Cortex-M4" },
      { label: "IMU Gyro", value: "6-Axis MPU6050" },
      { label: "Loop Rate", value: "1,000 Hz Real-Time" },
      { label: "Firmware", value: "Student-Written Java/C++" }
    ],
    coords: { x: 50, y: 44 }
  },
  {
    id: "chassis",
    name: "Carbon Monocoque Chassis",
    tag: "AERODYNAMICS & RIGIDITY",
    icon: Shield,
    metric: "840g",
    metricLabel: "Total Wet Curb Weight",
    whatYouBuild: "You assemble the suspension geometry, balance camber/toe angles, and tune weight distribution for maximum mechanical grip.",
    description: "Ultra-rigid, race-proven carbon fiber monocoque engineered to absorb high G-load apex turns and resist torsional flex under heavy acceleration.",
    specs: [
      { label: "Material", value: "T300 Carbon Weave" },
      { label: "Wheelbase", value: "258 mm Competition Spec" },
      { label: "Downforce", value: "Venturi Tunnel Floor" },
      { label: "Suspension", value: "Oil-Filled Aluminum Coilovers" }
    ],
    coords: { x: 30, y: 55 }
  },
  {
    id: "powertrain",
    name: "Brushless Drive & ESC",
    tag: "POWER & PROPULSION",
    icon: Zap,
    metric: "48 KM/H",
    metricLabel: "Top Grid Speed",
    whatYouBuild: "You configure electronic speed controller timing maps and solder motor phases to handle maximum burst current during start launches.",
    description: "High-efficiency brushless electric motor paired with an intelligent ESC delivering instant torque from the starting grid to the finish line.",
    specs: [
      { label: "Motor Type", value: "Sensorless Brushless 3800KV" },
      { label: "Peak Current", value: "60A Continuous" },
      { label: "0-40 km/h", value: "1.4 Seconds" },
      { label: "Battery", value: "11.1V 3S High-C LiPo" }
    ],
    coords: { x: 74, y: 52 }
  },
  {
    id: "telemetry",
    name: "Telemetry & Lap Transponder",
    tag: "DATA & TIMING",
    icon: Radio,
    metric: "Sub-4ms",
    metricLabel: "RF Transmission Latency",
    whatYouBuild: "You stream live lap packets to the Hanbee pit wall leaderboard and calibrate RFID gate transponders for official race qualification.",
    description: "Multi-frequency transceiver module that continuously broadcasts throttle, RPM, and temperature data to your team's live pit dashboard.",
    specs: [
      { label: "Protocol", value: "2.4GHz FHSS Frequency Hopping" },
      { label: "Range", value: "Up to 300m Line of Sight" },
      { label: "Timing Gate", value: "Infrared / RFID Transponder" },
      { label: "Telemetry", value: "Bidirectional CAN / UART" }
    ],
    coords: { x: 50, y: 72 }
  }
];

export default function InteractiveCar() {
  const [selectedComp, setSelectedComp] = useState<ComponentSpec>(COMPONENTS[0]);

  return (
    <div className={styles.interactiveCarWrapper}>
      {/* Selector Navigation Chips */}
      <div className={styles.selectorBar}>
        {COMPONENTS.map((comp) => {
          const isSelected = selectedComp.id === comp.id;
          const Icon = comp.icon;
          return (
            <button
              key={comp.id}
              onClick={() => setSelectedComp(comp)}
              className={`${styles.compChip} ${isSelected ? styles.compChipActive : ""}`}
            >
              <Icon size={16} className={styles.chipIcon} />
              <span>{comp.name}</span>
              {isSelected && (
                <motion.div layoutId="carChipIndicator" className={styles.chipGlow} />
              )}
            </button>
          );
        })}
      </div>

      {/* Main Showcase Grid */}
      <div className={styles.showcaseGrid}>
        {/* Left: Interactive Visual Diagram Frame */}
        <div className={styles.visualFrame}>
          <div className={styles.diagramHeader}>
            <div className={styles.diagramBadge}>
              <span>TECHNICAL CAD DRAWING</span>
            </div>
            <span className={styles.diagramSerial}>CHASSIS SPEC: 2026-R1</span>
          </div>

          <div className={styles.carImageContainer}>
            <img 
              src="/rc-car-exploded.png" 
              alt="Exploded diagram of Hanbee RC Racer with labeled components" 
              className={styles.carImg}
            />

            {/* Hotspot Markers placed over the car */}
            {COMPONENTS.map((comp) => {
              const isActive = selectedComp.id === comp.id;
              return (
                <button
                  key={comp.id}
                  onClick={() => setSelectedComp(comp)}
                  className={`${styles.hotspotBtn} ${isActive ? styles.hotspotBtnActive : ""}`}
                  style={{ left: `${comp.coords.x}%`, top: `${comp.coords.y}%` }}
                  title={comp.name}
                >
                  <span className={styles.hotspotInner} />
                </button>
              );
            })}
          </div>

          <div className={styles.diagramFooter}>
            <span className={styles.diagramNote}>
              💡 Tap any glowing hotspot or category chip above to inspect its engineering specs.
            </span>
          </div>
        </div>

        {/* Right: Technical Details & Student Build Story */}
        <div className={styles.detailsPanel}>
          <AnimatePresence mode="wait">
            <motion.div
              key={selectedComp.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className={styles.detailsContent}
            >
              <div className={styles.tagLine}>
                <span className={styles.tagPill}>{selectedComp.tag}</span>
                <span className={styles.metricHighlight}>
                  <strong>{selectedComp.metric}</strong> {selectedComp.metricLabel}
                </span>
              </div>

              <h3 className={styles.compTitle}>{selectedComp.name}</h3>
              <p className={styles.compDesc}>{selectedComp.description}</p>

              {/* What the student actually learns/builds */}
              <div className={styles.buildCard}>
                <div className={styles.buildCardHeader}>
                  <Check size={14} className={styles.checkIcon} />
                  <span>STUDENT ENGINEERING SCOPE</span>
                </div>
                <p className={styles.buildCardText}>{selectedComp.whatYouBuild}</p>
              </div>

              {/* Spec Matrix */}
              <div className={styles.specGrid}>
                {selectedComp.specs.map((spec, idx) => (
                  <div key={idx} className={styles.specItem}>
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

