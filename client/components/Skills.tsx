"use client";

import { useLayoutEffect, useRef } from "react";
import { gsap, prefersReducedMotion } from "../lib/gsap";
import { useStudentData } from "../data/StudentDataContext";
import CountUp from "./CountUp";
import { BadgeCheck } from "lucide-react";

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
    <section ref={scope} className="pb-12 sm:pb-16">
      <div className="w-full max-w-[1600px] mx-auto relative px-4 sm:px-6 md:px-10 lg:px-16 xl:px-[100px]">
        <div data-animate-section className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden px-5 sm:px-8 md:px-12 lg:px-14 pt-8 sm:pt-10 md:pt-12 pb-8 sm:pb-12 md:pb-14">
          
          {/* Header */}
          <div className="flex items-start gap-4 pb-6 sm:pb-8 border-b border-gray-200 mb-8 sm:mb-10">
            <div>
              <p className="font-mono text-[10px] md:text-[11px] font-bold tracking-[0.2em] text-gray-500 uppercase">
                Section 06
              </p>
              <h2 className="mt-1 font-serif text-2xl sm:text-3xl md:text-4xl text-gray-900 leading-tight">
                Verified Skills
              </h2>
            </div>
          </div>

          {/* Pills Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-x-6 md:gap-y-4 w-full">
            {verifiedSkills.map((s) => (
              <div 
                key={s.label}
                data-skill-pill
                className="flex items-center justify-between border border-gray-200 rounded-full px-4 sm:px-6 py-2.5 sm:py-3.5 transition-colors hover:border-blue-200 gap-2"
              >
                <div className="flex items-center gap-2.5 sm:gap-3 overflow-hidden">
                  <BadgeCheck size={18} className="text-[#005bb5] flex-shrink-0" />
                  <span className="text-xs sm:text-sm md:text-[15px] font-bold text-gray-800 truncate">
                    {s.label}
                  </span>
                </div>
                <span className="font-mono text-xs sm:text-[13px] font-semibold text-gray-400 pl-2 sm:pl-4 shrink-0">
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
