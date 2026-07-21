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
    <section ref={scope} className="py-20 text-gray-900 border-b border-gray-100">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mb-10 border-b border-gray-200 pb-4">
          <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-gray-500 font-bold">
            Section 02
          </p>
          <h2 className="mt-1 font-serif text-3xl font-medium tracking-tight md:text-4xl">
            Industry Readiness
          </h2>
        </div>

        <div className="space-y-8 max-w-4xl">
          {readinessBars.map((b) => (
            <div key={b.label}>
              <div className="mb-2 flex items-baseline justify-between">
                <span className="text-sm font-semibold text-gray-700">{b.label}</span>
                <CountUp to={b.value} suffix="%" className="font-serif text-[22px] text-gray-900" />
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
                <div
                  data-fill
                  data-value={b.value}
                  className="h-full rounded-full bg-gradient-to-r from-blue-400 to-[#005bb5]"
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
