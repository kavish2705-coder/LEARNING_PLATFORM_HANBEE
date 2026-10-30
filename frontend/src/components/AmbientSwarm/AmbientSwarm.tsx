"use client";

import { useEffect, useRef } from "react";
import styles from "./AmbientSwarm.module.css";

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  baseAlpha: number;
  phase: number;
};

// Autonomous ember/spark swarm -- not cursor-driven. Small glowing
// particles drift on their own slow, independent paths (like sparks
// kicked up off a track surface) and softly flicker. Replaces the static
// grid texture, which read as dated/generic; this is GPU-cheap (one
// canvas, additive glow via shadowBlur) and keeps the amber accent as
// the only hue in motion instead of introducing a new one.
export default function AmbientSwarm({ density = 46 }: { density?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const accent = getComputedStyle(document.documentElement).getPropertyValue("--landing-accent").trim() || "#c9782f";
    const [r, g, b] = hexToRgb(accent);

    let particles: Particle[] = [];
    let width = 0;
    let height = 0;
    let dpr = 1;
    let frame = 0;
    let raf = 0;

    function resize() {
      const parent = canvas!.parentElement;
      if (!parent) return;
      width = parent.clientWidth;
      height = parent.clientHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas!.width = width * dpr;
      canvas!.height = height * dpr;
      canvas!.style.width = `${width}px`;
      canvas!.style.height = `${height}px`;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);

      particles = Array.from({ length: density }, () => spawn());
    }

    function spawn(): Particle {
      return {
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.12,
        vy: -0.05 - Math.random() * 0.15,
        r: 0.6 + Math.random() * 1.8,
        baseAlpha: 0.15 + Math.random() * 0.35,
        phase: Math.random() * Math.PI * 2,
      };
    }

    function tick() {
      frame++;
      ctx!.clearRect(0, 0, width, height);
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        // gentle independent sway so paths don't read as uniform/linear
        p.x += Math.sin(frame * 0.004 + p.phase) * 0.08;

        if (p.y < -10) { p.y = height + 10; p.x = Math.random() * width; }
        if (p.x < -10) p.x = width + 10;
        if (p.x > width + 10) p.x = -10;

        const flicker = 0.6 + 0.4 * Math.sin(frame * 0.02 + p.phase);
        const alpha = p.baseAlpha * flicker;

        ctx!.beginPath();
        ctx!.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
        ctx!.shadowColor = `rgba(${r}, ${g}, ${b}, ${Math.min(alpha * 1.6, 0.8)})`;
        ctx!.shadowBlur = p.r * 5;
        ctx!.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx!.fill();
      }
      if (!reduceMotion) raf = requestAnimationFrame(tick);
    }

    resize();
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas.parentElement!);

    if (reduceMotion) {
      // Draw one still frame instead of animating.
      tick();
    } else {
      raf = requestAnimationFrame(tick);
    }

    return () => {
      cancelAnimationFrame(raf);
      resizeObserver.disconnect();
    };
  }, [density]);

  return <canvas ref={canvasRef} className={styles.canvas} aria-hidden="true" />;
}

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace("#", "");
  const n = parseInt(clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
