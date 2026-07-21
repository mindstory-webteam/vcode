"use client";

import { useLayoutEffect, useRef } from "react";
import { gsap, prefersReducedMotion } from "../lib/gsap";
import { useStudentData } from "../data/StudentDataContext";
import CountUp from "./CountUp";

export default function Skills() {
  const { verifiedSkills } = useStudentData();
  const scope = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    const el = scope.current;
    if (!el || prefersReducedMotion()) return;

    const ctx = gsap.context(() => {
      gsap.from("[data-animate-section]", {
        y: 20,
        opacity: 0,
        duration: 0.6,
        scrollTrigger: { trigger: el, start: "top 80%", once: true },
        ease: "power3.out"
      });
      
      gsap.from("[data-skill-pill]", {
        y: 10,
        opacity: 0,
        duration: 0.4,
        stagger: 0.03,
        scrollTrigger: { trigger: el, start: "top 75%", once: true },
        ease: "power2.out"
      });
    }, el);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={scope} className="bg-[#f9fafb] pb-16">
      <div className="w-full max-w-[1600px] mx-auto relative px-4 sm:px-[100px]">
        <div data-animate-section className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden px-8 md:px-14 pt-10 md:pt-12 pb-14">
          
          {/* Header */}
          <div className="flex items-start gap-4 pb-8 border-b border-gray-200 mb-10">
            <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#005bb5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-1">
              <path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z"/>
              <path d="m9 12 2 2 4-4"/>
            </svg>
            <div>
              <p className="font-mono text-[10px] md:text-[11px] font-bold tracking-[0.2em] text-gray-500 uppercase">
                Section 06
              </p>
              <h2 className="mt-1 font-serif text-3xl md:text-4xl text-gray-900 leading-tight">
                Verified Skills
              </h2>
            </div>
          </div>

          {/* Pills Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-4 w-full">
            {verifiedSkills.map((s) => (
              <div 
                key={s.label}
                data-skill-pill
                className="flex items-center justify-between border border-gray-200 rounded-full px-6 py-3.5 transition-colors hover:border-blue-200"
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#005bb5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
                    <path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z"/>
                    <path d="m9 12 2 2 4-4"/>
                  </svg>
                  <span className="text-[15px] font-bold text-gray-800 truncate">
                    {s.label}
                  </span>
                </div>
                <span className="font-mono text-[13px] font-semibold text-gray-400 pl-4">
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
