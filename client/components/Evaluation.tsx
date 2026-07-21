"use client";

import { useLayoutEffect, useRef } from "react";
import { gsap, prefersReducedMotion } from "../lib/gsap";
import { useStudentData } from "../data/StudentDataContext";

export default function Evaluation() {
  const { student, evaluation } = useStudentData();
  const scope = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    const el = scope.current;
    if (!el || prefersReducedMotion()) return;

    const ctx = gsap.context(() => {
      gsap.from("[data-animate-eval]", {
        y: 20,
        opacity: 0,
        duration: 0.6,
        scrollTrigger: { trigger: el, start: "top 80%", once: true },
        ease: "power3.out"
      });
    }, el);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={scope} className="bg-[#f9fafb] pb-16">
      <div className="w-full max-w-[1600px] mx-auto relative px-4 sm:px-[100px]">
        <div data-animate-eval className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden px-8 md:px-14 pt-10 md:pt-12 pb-6 md:pb-10">
          
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between pb-8 border-b border-gray-200 mb-2 gap-4">
            <div className="flex items-start gap-4">
              <div>
                <p className="font-mono text-[10px] md:text-[11px] font-bold tracking-[0.2em] text-gray-500 uppercase">
                  Section 01
                </p>
                <h2 className="mt-1 font-serif text-3xl md:text-4xl text-gray-900 leading-tight">
                  Professional Evaluation
                </h2>
              </div>
            </div>
            
            <div className="font-mono text-[11px] md:text-xs font-bold tracking-widest text-gray-400 uppercase sm:mt-4">
              Overall {student.overallGrade?.replace('+', '') || 'A'}{student.overallGrade?.includes('+') ? '+' : ''}
            </div>
          </div>

          {/* Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 md:gap-x-20">
            {evaluation.map((s, i) => (
              <div key={s.label} className="flex items-center justify-between py-6 border-b border-gray-100">
                <div>
                  <h3 className="text-[17px] font-medium text-gray-900">{s.label}</h3>
                  <p className="text-[12px] font-mono text-gray-400 mt-1 uppercase tracking-widest">
                    Score {s.score}/100
                  </p>
                </div>
                <div className={`font-serif text-[22px] font-bold ${s.grade.includes('+') ? 'text-gray-400' : 'text-[#005bb5]'}`}>
                  {s.grade}
                </div>
              </div>
            ))}
          </div>
          
        </div>
      </div>
    </section>
  );
}
