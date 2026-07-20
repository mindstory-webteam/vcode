"use client";

import { useLayoutEffect, useRef } from "react";
import { gsap, prefersReducedMotion } from "../lib/gsap";
import { useStudentData } from "../data/StudentDataContext";
import CountUp from "./CountUp";

export default function ReadinessBars() {
  const { readinessBars } = useStudentData();
  const scope = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    const el = scope.current;
    if (!el || prefersReducedMotion()) return;

    const ctx = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>("[data-fill]").forEach((bar, i) => {
        gsap.fromTo(
          bar,
          { width: "0%" },
          {
            width: bar.dataset.value + "%",
            duration: 1.3,
            delay: i * 0.12,
            ease: "power3.inOut",
            scrollTrigger: { trigger: el, start: "top 75%", once: true },
          }
        );
      });
    }, el);

    return () => ctx.revert();
  }, [readinessBars]);

  return (
    <section ref={scope} className="bg-ink py-20 text-paper">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mb-8 border-b border-paper/15 pb-4">
          <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-gold">
            Section 02
          </p>
          <h2 className="mt-1 font-display text-3xl font-medium tracking-tight md:text-4xl">
            Industry Readiness
          </h2>
        </div>

        <div className="space-y-8">
          {readinessBars.map((b) => (
            <div key={b.label}>
              <div className="mb-2 flex items-baseline justify-between">
                <span className="text-sm text-paper/80">{b.label}</span>
                <CountUp to={b.value} suffix="%" className="font-mono text-xl text-gold" />
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-paper/10">
                <div
                  data-fill
                  data-value={b.value}
                  className="h-full rounded-full bg-gradient-to-r from-cobalt to-gold"
                  style={{ width: `${b.value}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
