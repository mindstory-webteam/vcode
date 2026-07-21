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
    <section ref={scope} className="bg-[#f9fafb] pb-16">
      <div className="w-full max-w-[1600px] mx-auto relative px-4 sm:px-[100px]">
        <div data-animate-skills className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden px-8 md:px-14 pt-10 md:pt-12 pb-14">
          
          {/* Header */}
          <div className="flex items-start gap-4 pb-8 border-b border-gray-200 mb-10">
            <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#005bb5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-1">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
            </svg>
            <div>
              <p className="font-mono text-[10px] md:text-[11px] font-bold tracking-[0.2em] text-gray-500 uppercase">
                Section 04
              </p>
              <h2 className="mt-1 font-serif text-3xl md:text-4xl text-gray-900 leading-tight">
                Skill Scores
              </h2>
            </div>
          </div>

          {/* List */}
          <div className="max-w-4xl space-y-6 md:space-y-8 pb-4">
            {evaluation.map((s) => (
              <div key={s.label} className="flex items-center justify-between">
                <span className="text-[15px] font-medium text-gray-800">{s.label}</span>
                <span className="font-mono text-[14px] font-semibold text-gray-500">
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
