"use client";

import { useLayoutEffect, useRef } from "react";
import { gsap, prefersReducedMotion } from "../lib/gsap";
import { useStudentData } from "../data/StudentDataContext";
import CountUp from "./CountUp";

export default function SkillScores() {
  const { evaluation } = useStudentData();
  const scope = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    const el = scope.current;
    if (!el || prefersReducedMotion()) return;

    const ctx = gsap.context(() => {
      gsap.from("[data-animate-skills]", {
        y: 20,
        opacity: 0,
        duration: 0.6,
        scrollTrigger: { trigger: el, start: "top 80%", once: true },
        ease: "power3.out"
      });
    }, el);

    return () => ctx.revert();
  }, []);

  if (!evaluation || evaluation.length === 0) return null;

  return (
    <section ref={scope} className="pb-12 sm:pb-16">
      <div className="w-full max-w-[1600px] mx-auto relative px-4 sm:px-6 md:px-10 lg:px-16 xl:px-[100px]">
        <div data-animate-skills className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden px-5 sm:px-8 md:px-12 lg:px-14 pt-8 sm:pt-10 md:pt-12 pb-8 sm:pb-12 md:pb-14">
          
          {/* Header */}
          <div className="flex items-start gap-4 pb-6 sm:pb-8 border-b border-gray-200 mb-6 sm:mb-8 md:mb-10">
            <div>
              <p className="font-mono text-[10px] md:text-[11px] font-bold tracking-[0.2em] text-gray-500 uppercase">
                Section 04
              </p>
              <h2 className="mt-1 font-serif text-2xl sm:text-3xl md:text-4xl text-gray-900 leading-tight">
                Skill Scores
              </h2>
            </div>
          </div>

          {/* List */}
          <div className="max-w-4xl space-y-5 sm:space-y-6 md:space-y-8 pb-4">
            {evaluation.map((s) => (
              <div key={s.label} className="flex items-center justify-between gap-4 py-1">
                <span className="text-sm sm:text-[15px] font-medium text-gray-800">{s.label}</span>
                <span className="font-mono text-xs sm:text-[14px] font-semibold text-gray-500 shrink-0">
                  <CountUp to={s.score} />
                </span>
              </div>
            ))}
          </div>

        </div>
      </div>
    </section>
  );
}
