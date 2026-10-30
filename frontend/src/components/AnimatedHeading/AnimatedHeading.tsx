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

// Per-word "shutter lift" reveal instead of the generic fade+translateY(30)
// used everywhere else on this page -- each word sits in its own clipped
// window and slides up into view with a slight skew, like a pit-board
// flipping to the next line, rather than the whole block fading in flat.
export default function AnimatedHeading({ children, as = "h2", className, style, delay = 0 }: AnimatedHeadingProps) {
  const ref = useRef<HTMLHeadingElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const reduceMotion = useReducedMotion();
  const words = children.split(" ");

  if (reduceMotion) {
    if (as === "h1") return <h1 ref={ref} className={className} style={style}>{children}</h1>;
    if (as === "h3") return <h3 ref={ref} className={className} style={style}>{children}</h3>;
    return <h2 ref={ref} className={className} style={style}>{children}</h2>;
  }

  const words_ = words.map((word, i) => (
    <span key={i} className={styles.wordClip}>
      <motion.span
        className={styles.word}
        initial={{ y: "115%", skewY: 6, opacity: 0 }}
        animate={inView ? { y: "0%", skewY: 0, opacity: 1 } : {}}
        transition={{
          duration: 0.65,
          ease: [0.19, 1, 0.22, 1],
          delay: delay + i * 0.045,
        }}
      >
        {word}
        {i < words.length - 1 ? " " : ""}
      </motion.span>
    </span>
  ));

  if (as === "h1") return <h1 ref={ref} className={className} style={style}>{words_}</h1>;
  if (as === "h3") return <h3 ref={ref} className={className} style={style}>{words_}</h3>;
  return <h2 ref={ref} className={className} style={style}>{words_}</h2>;
}
