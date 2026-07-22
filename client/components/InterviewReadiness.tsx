"use client";

import { useLayoutEffect, useRef } from "react";
import { gsap, prefersReducedMotion } from "../lib/gsap";
import { useStudentData } from "../data/StudentDataContext";
import { Check } from "lucide-react";
import CountUp from "./CountUp";

export default function InterviewReadiness() {
  const { interviewReadiness, student } = useStudentData();
  const scope = useRef<HTMLElement>(null);

  // If backend returns empty, use a fallback mock data array for visual consistency
  const displayMetrics = interviewReadiness && interviewReadiness.length > 0
    ? interviewReadiness
    : [
        { label: "Resume Quality", value: 95 },
        { label: "Portfolio Quality", value: 92 },
        { label: "Communication", value: 94 },
        { label: "Presentation", value: 96 },
        { label: "Confidence", value: 93 },
      ];

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

      // Animations temporarily removed to prevent hot-reload blank screen bug
    }, el);

    return () => ctx.revert();
  }, [displayMetrics]);

  if (!displayMetrics || displayMetrics.length === 0) return null;

  return (
    <section ref={scope} className=" pb-16">
      <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-[100px]">
        <div data-animate-section className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden px-8 md:px-14 pt-10 md:pt-12 pb-16">
          
          {/* Header */}
          <div className="flex items-center justify-between pb-8 border-b border-gray-200 mb-14">
            <div className="flex items-start gap-4">
          
              <div>
                <p className="font-mono text-[10px] md:text-[11px] font-bold tracking-[0.2em] text-gray-500 uppercase">
                  Section 11
                </p>
                <h2 className="mt-1 font-serif text-3xl md:text-4xl text-gray-900 leading-tight">
                  Interview Readiness
                </h2>
              </div>
            </div>

            {/* Status Pill */}
            <div className="hidden md:flex items-center gap-2 px-5 py-2.5 rounded-full border border-green-300 bg-green-50 text-green-700">
              <Check size={16} strokeWidth={3} />
              <span className="font-bold text-[12px] tracking-wide uppercase">
                {student?.status || "Ready for Placement"}
              </span>
            </div>
          </div>

          {/* Cards Flex Layout */}
          <div className="flex flex-col lg:flex-row items-center justify-between gap-6 md:gap-[24px] w-full mt-4">
            {displayMetrics.map((item) => (
              <div 
                key={item.label}
                className="relative w-[280px] h-[280px] flex items-center justify-center transition-all hover:scale-105"
              >
                <svg className="absolute w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="46" fill="none" stroke="#f3f4f6" strokeWidth="5.5" />
                  <circle 
                    cx="50" 
                    cy="50" 
                    r="46" 
                    fill="none" 
                    stroke="#005bb5" 
                    strokeWidth="5.5" 
                    strokeLinecap="butt"
                    style={{
                      strokeDasharray: 2 * Math.PI * 46,
                      strokeDashoffset: (2 * Math.PI * 46) - (item.value / 100) * (2 * Math.PI * 46),
                      transition: "stroke-dashoffset 1.5s ease-in-out"
                    }}
                  />
                </svg>
                <div className="flex flex-col items-center justify-center text-center mt-2">
                  <CountUp to={item.value} suffix="%" className="font-serif text-[64px] text-gray-900 leading-none tracking-tight" />
                  <span className="font-mono text-[11px] font-bold tracking-[0.2em] text-gray-500 uppercase mt-3 px-4">
                    {item.label}
                  </span>
                </div>
              </div>
            ))}
          </div>

        </div>
      </div>
    </section>
  );
}
