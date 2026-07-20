"use client";

import { useLayoutEffect, useRef } from "react";
import { gsap, prefersReducedMotion } from "../lib/gsap";
import { useStudentData } from "../data/StudentDataContext";
import SectionHeading from "./SectionHeading";
import Reveal from "./Reveal";

export default function Evaluation() {
  const { evaluation } = useStudentData();
  const scope = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    const el = scope.current;
    if (!el || prefersReducedMotion()) return;

    const ctx = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>("[data-bar]").forEach((bar) => {
        gsap.fromTo(
          bar,
          { scaleX: 0 },
          {
            scaleX: 1,
            duration: 1.1,
            ease: "power3.out",
            scrollTrigger: { trigger: bar, start: "top 90%", once: true },
          }
        );
      });
    }, el);

    return () => ctx.revert();
  }, [evaluation]);

  return (
    <section ref={scope} className="mx-auto max-w-6xl px-6 py-20">
      <SectionHeading
        eyebrow="Section 01"
        title="Professional Evaluation"
        badge={{ label: "Overall A+ · Verified", tone: "blue" }}
      />

      <Reveal stagger="[data-item]" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {evaluation.map((s) => (
          <article
            key={s.label}
            data-item
            className="group rounded-2xl border border-line bg-white p-6 transition-shadow hover:shadow-lg hover:shadow-ink/5"
          >
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-sm font-medium text-ink">{s.label}</h3>
              <span
                className={`rounded-lg px-2.5 py-1 font-display text-lg font-semibold leading-none ${
                  s.grade === "A+" ? "bg-gold/15 text-gold-deep" : "bg-cobalt/10 text-cobalt"
                }`}
              >
                {s.grade}
              </span>
            </div>

            <p className="mt-5 font-mono text-3xl text-ink">
              {s.score}
              <span className="text-sm text-ink/40">/100</span>
            </p>

            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-line">
              <div
                data-bar
                className="h-full origin-left rounded-full bg-cobalt"
                style={{ width: `${s.score}%` }}
              />
            </div>
          </article>
        ))}
      </Reveal>
    </section>
  );
}
