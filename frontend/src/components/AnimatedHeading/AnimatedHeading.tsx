"use client";

import { useRef } from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";
import styles from "./AnimatedHeading.module.css";

type AnimatedHeadingProps = {
  children: string;
  as?: "h1" | "h2" | "h3";
  className?: string;
  style?: React.CSSProperties;
  delay?: number;
};

// Fluid, smooth heading reveal. Rises with a graceful fade-and-glide
// without jarring skew distortions, clipped font descenders, or sluggish delays.
export default function AnimatedHeading({ children, as = "h2", className, style, delay = 0 }: AnimatedHeadingProps) {
  const ref = useRef<HTMLHeadingElement>(null);
  const inView = useInView(ref, { once: true, margin: "-30px" });
  const reduceMotion = useReducedMotion();
  const words = children.split(" ");

  if (reduceMotion) {
    if (as === "h1") return <h1 ref={ref} className={className} style={style}>{children}</h1>;
    if (as === "h3") return <h3 ref={ref} className={className} style={style}>{children}</h3>;
    return <h2 ref={ref} className={className} style={style}>{children}</h2>;
  }

  // Tightly bounded stagger so even multi-word headlines resolve quickly and fluidly
  const maxStaggerDelay = 0.22;
  const perWordStagger = words.length > 1 ? Math.min(0.024, maxStaggerDelay / words.length) : 0;

  const words_ = words.map((word, i) => (
    <span key={i} className={styles.wordClip}>
      <motion.span
        className={styles.word}
        initial={{ y: 16, opacity: 0 }}
        animate={inView ? { y: 0, opacity: 1 } : {}}
        transition={{
          duration: 0.55,
          ease: [0.16, 1, 0.3, 1],
          delay: delay + i * perWordStagger,
        }}
      >
        {word}
        {i < words.length - 1 ? "\u00A0" : ""}
      </motion.span>
    </span>
  ));

  if (as === "h1") return <h1 ref={ref} className={className} style={style}>{words_}</h1>;
  if (as === "h3") return <h3 ref={ref} className={className} style={style}>{words_}</h3>;
  return <h2 ref={ref} className={className} style={style}>{words_}</h2>;
}
