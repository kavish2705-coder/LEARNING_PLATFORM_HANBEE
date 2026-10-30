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

// Refined, physical card with gentle cursor-tracked tilt and GPU-composited
// specular glow. Smooth, subtle, and free of jitter.
export default function AnimatedCard({ children, className, style, delay = 0 }: AnimatedCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-30px" });
  const reduceMotion = useReducedMotion();

  const mouseX = useMotionValue(0.5);
  const mouseY = useMotionValue(0.5);
  const springX = useSpring(mouseX, { stiffness: 160, damping: 24, mass: 0.4 });
  const springY = useSpring(mouseY, { stiffness: 160, damping: 24, mass: 0.4 });
  
  // Subtle 2.8-degree tactile tilt
  const rotateX = useTransform(springY, [0, 1], [2.8, -2.8]);
  const rotateY = useTransform(springX, [0, 1], [-2.8, 2.8]);
  
  // GPU-accelerated translate3d percentages relative to center
  const glareX = useTransform(springX, (v) => `${(v - 0.5) * 80}%`);
  const glareY = useTransform(springY, (v) => `${(v - 0.5) * 80}%`);

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

  return (
    <motion.div
      ref={ref}
      className={`${styles.card} ${className ?? ""}`}
      style={{
        ...style,
        rotateX: reduceMotion ? 0 : rotateX,
        rotateY: reduceMotion ? 0 : rotateY,
        transformPerspective: 1000,
      }}
      initial={{ opacity: 0, y: reduceMotion ? 0 : 20 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1], delay: Math.min(delay, 0.22) }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {!reduceMotion && (
        <motion.div
          className={styles.glare}
          style={{ x: glareX, y: glareY }}
          aria-hidden="true"
        />
      )}
      <div className={styles.content}>{children}</div>
    </motion.div>
  );
}
