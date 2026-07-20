"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);

  // Re-measure trigger positions once fonts/images are loaded so
  // sections lower on the page never get stuck at opacity 0.
  window.addEventListener("load", () => ScrollTrigger.refresh());
}

export { gsap, ScrollTrigger };

/** True when the visitor prefers reduced motion. */
export const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;
