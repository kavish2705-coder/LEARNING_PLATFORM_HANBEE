"use client";

import React, { useRef } from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";
import styles from "./AnimatedHeading.module.css";

type AnimatedHeadingProps = {
  children: React.ReactNode;
  as?: "h1" | "h2" | "h3";
  className?: string;
  style?: React.CSSProperties;
  delay?: number;
};

function extractText(node: React.ReactNode): string {
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(extractText).join(" ");
  if (React.isValidElement(node) && (node.props as { children?: React.ReactNode })?.children) {
    return extractText((node.props as { children?: React.ReactNode }).children);
  }
  return "";
}

// Fluid, smooth heading reveal. Rises with a graceful fade-and-glide
// without jarring skew distortions, clipped font descenders, or sluggish delays.
export default function AnimatedHeading({
  children,
  as: Component = "h2",
  className,
  style,
  delay = 0,
}: AnimatedHeadingProps) {
  const ref = useRef<HTMLHeadingElement>(null);
  const inView = useInView(ref, { once: true, margin: "-30px" });
  const reduceMotion = useReducedMotion();

  const text = extractText(children).trim();
  const words = text ? text.split(/\s+/).filter(Boolean) : [];

  if (reduceMotion || words.length === 0) {
    return (
      <Component ref={ref} className={className} style={style}>
        {children}
      </Component>
    );
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

  return (
    <Component ref={ref} className={className} style={style}>
      {words_}
    </Component>
  );
}
