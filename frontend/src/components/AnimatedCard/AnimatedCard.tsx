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

// A "paddock card" -- cursor-tracked 3D tilt plus a light sweep across the
// glass surface on hover, instead of the generic whileHover={{y:-6}} lift
// used everywhere on the old page. Reads as a physical object catching
// light, not a templated SaaS card.
export default function AnimatedCard({ children, className, style, delay = 0 }: AnimatedCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  const reduceMotion = useReducedMotion();

  const mouseX = useMotionValue(0.5);
  const mouseY = useMotionValue(0.5);
  const springX = useSpring(mouseX, { stiffness: 220, damping: 22 });
  const springY = useSpring(mouseY, { stiffness: 220, damping: 22 });
  const rotateX = useTransform(springY, [0, 1], [6, -6]);
  const rotateY = useTransform(springX, [0, 1], [-6, 6]);
  const glareX = useTransform(springX, (v) => `${v * 100}%`);
  const glareY = useTransform(springY, (v) => `${v * 100}%`);

  function handleMouseMove(event: React.MouseEvent<HTMLDivElement>) {
    if (reduceMotion || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
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
        transformPerspective: 800,
      }}
      initial={{ opacity: 0, y: reduceMotion ? 0 : 26 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, ease: [0.19, 1, 0.22, 1], delay }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {!reduceMotion && (
        <motion.div
          className={styles.glare}
          style={{ left: glareX, top: glareY }}
          aria-hidden="true"
        />
      )}
      <div className={styles.content}>{children}</div>
    </motion.div>
  );
}
