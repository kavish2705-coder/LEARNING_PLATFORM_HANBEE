"use client";

import { useEffect, useRef } from "react";
import { motion, useInView } from "framer-motion";
import styles from "./ExplodedCarArt.module.css";

// Real video of the HANBEE car assembling, provided directly rather than
// generated or hand-drawn. Plays once, muted/inline, starting the moment
// this scrolls into view -- not looped, since this is a one-time
// "watch it come together" moment, not a looping background clip.
export default function ExplodedCarArt() {
  const ref = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.5 });

  useEffect(() => {
    if (inView) videoRef.current?.play().catch(() => {});
  }, [inView]);

  return (
    <div ref={ref} className={styles.wrap}>
      <motion.video
        ref={videoRef}
        src="/car-assembly.mp4"
        poster="/car-assembled.png"
        className={styles.layer}
        muted
        playsInline
        preload="metadata"
        initial={{ opacity: 0, scale: 1.26 }}
        whileInView={{ opacity: 1, scale: 1.22 }}
        viewport={{ once: true, amount: 0.5 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      />
    </div>
  );
}
