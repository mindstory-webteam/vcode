"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";
import { gsap, ScrollTrigger, prefersReducedMotion } from "../lib/gsap";

interface RevealProps {
  children: ReactNode;
  className?: string;
  /** Selector for children to stagger; omit to animate the wrapper itself. */
  stagger?: string;
  delay?: number;
  y?: number;
}

/**
 * Fades + lifts content in when it scrolls into view.
 * Uses ScrollTrigger.batch with per-item triggers and clearProps so
 * every card is guaranteed to end fully visible (no stuck opacity).
 */
export default function Reveal({
  children,
  className,
  stagger,
  delay = 0,
  y = 28,
}: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion()) return;

    const targets: HTMLElement[] = stagger
      ? gsap.utils.toArray<HTMLElement>(el.querySelectorAll(stagger))
      : [el];
    if (!targets.length) return;

    const ctx = gsap.context(() => {
      gsap.set(targets, { opacity: 0, y });

      ScrollTrigger.batch(targets, {
        start: "top 92%",
        once: true,
        onEnter: (batch) =>
          gsap.to(batch, {
            opacity: 1,
            y: 0,
            duration: 0.7,
            delay,
            ease: "power3.out",
            stagger: 0.08,
            overwrite: true,
            // Remove inline styles when done so hover transforms
            // (e.g. hover:-translate-y-1) work again afterwards.
            clearProps: "opacity,transform",
          }),
      });

      // Safety net: anything visible but still hidden after 2.5s fades in.
      gsap.delayedCall(2.5, () => {
        targets.forEach((t) => {
          if (Number(gsap.getProperty(t, "opacity")) < 1 && !ScrollTrigger.isInViewport(t)) return;
          gsap.to(t, { opacity: 1, y: 0, duration: 0.4, clearProps: "opacity,transform" });
        });
      });
    }, el);

    return () => ctx.revert();
  }, [stagger, delay, y]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
