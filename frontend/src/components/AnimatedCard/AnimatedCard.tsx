"use client";

import { useRef } from "react";
import { motion, useMotionValue, useSpring, useTransform, useInView, useReducedMotion } from "framer-motion";
import styles from "./AnimatedCard.module.css";

type AnimatedCardProps = {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  delay?: number;
};

// Refined, physical card with gentle cursor-tracked tilt and specular glow.
// Smooth, subtle, and free of jitter.
export default function AnimatedCard({ children, className, style, delay = 0 }: AnimatedCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-30px" });
  const reduceMotion = useReducedMotion();

  const mouseX = useMotionValue(0.5);
  const mouseY = useMotionValue(0.5);
  const springX = useSpring(mouseX, { stiffness: 180, damping: 22, mass: 0.3 });
  const springY = useSpring(mouseY, { stiffness: 180, damping: 22, mass: 0.3 });
  
  // Subtle 2.5-degree tactile tilt
  const rotateX = useTransform(springY, [0, 1], [2.5, -2.5]);
  const rotateY = useTransform(springX, [0, 1], [-2.5, 2.5]);
  
  const glareX = useTransform(springX, (v) => `${v * 100}%`);
  const glareY = useTransform(springY, (v) => `${v * 100}%`);

  function handleMouseMove(event: React.MouseEvent<HTMLDivElement>) {
    if (reduceMotion || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    mouseX.set((event.clientX - rect.left) / rect.width);
    mouseY.set((event.clientY - rect.top) / rect.height);
  }

  function handleMouseLeave() {
    mouseX.set(0.5);
    mouseY.set(0.5);
  }

  if (reduceMotion) {
    return (
      <div ref={ref} className={`${styles.card} ${className ?? ""}`} style={style}>
        <div className={styles.content}>{children}</div>
      </div>
    );
  }

  return (
    <motion.div
      ref={ref}
      className={`${styles.card} ${className ?? ""}`}
      style={{
        ...style,
        rotateX,
        rotateY,
        transformPerspective: 1000,
      }}
      initial={{ opacity: 0, y: 20 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1], delay: Math.min(delay, 0.22) }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <motion.div
        className={styles.glare}
        style={{ left: glareX, top: glareY }}
        aria-hidden="true"
      />
      <div className={styles.content}>{children}</div>
    </motion.div>
  );
}
