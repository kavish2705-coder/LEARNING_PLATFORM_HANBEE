"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, useInView } from "framer-motion";
import styles from "./ExplodedCarArt.module.css";

// Real reference artwork (not generated, not hand-drawn) -- the exact
// exploded and assembled HANBEE car illustrations provided for this
// section. Swaps a single <img>'s src from exploded to assembled once,
// shortly after this scrolls into view, crossfading via AnimatePresence --
// a real DOM node swap rather than two permanently-stacked opacity
// layers, which is deliberate: the stacked-layer approach hit a paint/
// compositing mismatch in testing (DOM-verified opacity values didn't
// match what was actually rendered), so this avoids that failure mode
// entirely by only ever having one image element mounted at a time.
export default function ExplodedCarArt() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  const [assembled, setAssembled] = useState(false);

  useEffect(() => {
    if (!inView) return;
    const t = setTimeout(() => setAssembled(true), 900);
    return () => clearTimeout(t);
  }, [inView]);

  return (
    <div ref={ref} className={styles.wrap} role="img" aria-label="A HANBEE RC race car, shown exploded and assembling into its final form">
      <AnimatePresence mode="sync">
        {assembled ? (
          // eslint-disable-next-line @next/next/no-img-element
          <motion.img
            key="assembled"
            src="/car-assembled.png"
            alt=""
            className={styles.layer}
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <motion.img
            key="exploded"
            src="/car-exploded.png"
            alt=""
            className={styles.layer}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
