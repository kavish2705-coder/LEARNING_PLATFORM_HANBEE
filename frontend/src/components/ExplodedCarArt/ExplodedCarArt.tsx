"use client";

import { motion } from "framer-motion";
import styles from "./ExplodedCarArt.module.css";

// Real reference artwork (not generated) -- the exploded and assembled
// HANBEE car illustrations for this section. The exploded view starts
// zoomed in and visible; once scrolled into view it holds briefly, then
// zooms out/fades while the assembled car zooms in/fades from a matching
// offset underneath it -- same object-literal whileInView pattern already
// used elsewhere on this page (photoBannerFrame, buildImageFrame etc.),
// deliberately avoiding custom hooks/state so there's nothing non-standard
// that could be the point of failure.
export default function ExplodedCarArt() {
  return (
    <div className={styles.wrap}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <motion.img
        src="/car-assembled.png"
        alt="A HANBEE RC race car, fully assembled"
        className={styles.layer}
        initial={{ opacity: 0, scale: 1.12 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true, amount: 0.5 }}
        transition={{ duration: 1.6, delay: 1.3, ease: [0.16, 1, 0.3, 1] }}
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <motion.img
        src="/car-exploded.png"
        alt="The same car, shown with every part separated before assembly"
        className={styles.layer}
        initial={{ opacity: 1, scale: 1 }}
        whileInView={{ opacity: 0, scale: 0.88 }}
        viewport={{ once: true, amount: 0.5 }}
        transition={{ duration: 1.4, delay: 1.1, ease: [0.4, 0, 0.2, 1] }}
      />
    </div>
  );
}
