"use client";

import { useLayoutEffect, useRef } from "react";
import { gsap, prefersReducedMotion } from "../lib/gsap";
import { useStudentData } from "../data/StudentDataContext";
import CountUp from "./CountUp";

export default function ReadinessBars() {
  const { student, readinessBars } = useStudentData();
  const scope = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    const el = scope.current;
    if (!el || prefersReducedMotion()) return;

    const ctx = gsap.context(() => {
      gsap.from("[data-animate-readiness]", {
        y: 20,
        opacity: 0,
        duration: 0.6,
        scrollTrigger: { trigger: el, start: "top 80%", once: true },
        ease: "power3.out"
      });

      const circle = el.querySelector("[data-circle-progress]") as SVGCircleElement;
      if (circle) {
        const radius = circle.r.baseVal.value;
        const circumference = radius * 2 * Math.PI;
        gsap.fromTo(
          circle,
          { strokeDasharray: circumference, strokeDashoffset: circumference },
          {
            strokeDashoffset: circumference - (student.readiness / 100) * circumference,
            duration: 1.5,
            ease: "power3.inOut",
            scrollTrigger: { trigger: circle, start: "top 85%", once: true }
          }
        );
      }
    }, el);

    return () => ctx.revert();
  }, [student.readiness]);

  return (
    <section ref={scope} className="bg-[#f9fafb] pb-16">
      <div className="w-full max-w-[1600px] mx-auto relative px-4 sm:px-[100px]">
        <div data-animate-readiness className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden px-8 md:px-14 pt-10 md:pt-12 pb-14">
          
          {/* Header */}
          <div className="flex items-start gap-4 pb-8 border-b border-gray-200 mb-14">
            <div>
              <p className="font-mono text-[10px] md:text-[11px] font-bold tracking-[0.2em] text-gray-500 uppercase">
                Section 02
              </p>
              <h2 className="mt-1 font-serif text-3xl md:text-4xl text-gray-900 leading-tight">
                Industry Readiness
              </h2>
            </div>
          </div>

          {/* Circular Progress Gauge */}
          <div className="flex justify-center mb-16">
            <div className="relative w-[280px] h-[280px] flex items-center justify-center">
              <svg className="absolute w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="46" fill="none" stroke="#f3f4f6" strokeWidth="5.5" />
                <circle 
                  data-circle-progress 
                  cx="50" 
                  cy="50" 
                  r="46" 
                  fill="none" 
                  stroke="#005bb5" 
                  strokeWidth="5.5" 
                  strokeLinecap="butt" 
                />
              </svg>
              <div className="flex flex-col items-center justify-center text-center mt-2">
                <CountUp to={student.readiness} suffix="%" className="font-serif text-[64px] text-gray-900 leading-none tracking-tight" />
                <span className="font-mono text-[11px] font-bold tracking-[0.2em] text-gray-500 uppercase mt-3">
                  Industry Readiness
                </span>
              </div>
            </div>
          </div>

          {/* Sub-items List */}
          <div className="max-w-3xl mx-auto space-y-6 md:space-y-7 pb-8">
            {readinessBars.map((b) => (
              <div key={b.label} className="flex items-center justify-between">
                <span className="text-[15px] font-medium text-gray-700">{b.label}</span>
                <span className="font-mono text-[13px] font-bold text-gray-900">
                  <CountUp to={b.value} suffix="%" />
                </span>
              </div>
            ))}
          </div>

        </div>
      </div>
    </section>
  );
}
