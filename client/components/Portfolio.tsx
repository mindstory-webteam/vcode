"use client";

import { useLayoutEffect, useRef } from "react";
import { gsap, prefersReducedMotion } from "../lib/gsap";
import { useStudentData } from "../data/StudentDataContext";

export default function Portfolio() {
  const { portfolio } = useStudentData();
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
      
      gsap.from("[data-portfolio-card]", {
        y: 15,
        opacity: 0,
        duration: 0.5,
        stagger: 0.1,
        scrollTrigger: { trigger: el, start: "top 75%", once: true },
        ease: "power2.out"
      });
    }, el);

    return () => ctx.revert();
  }, []);

  if (!portfolio || portfolio.length === 0) return null;

  return (
    <section ref={scope} className="bg-[#f9fafb] pb-16">
      <div className="w-full max-w-[1600px] mx-auto relative px-4 sm:px-[100px]">
        <div data-animate-section className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden px-8 md:px-14 pt-10 md:pt-12 pb-14">
          
          {/* Header */}
          <div className="flex items-start gap-4 pb-8 border-b border-gray-200 mb-12">
            <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#005bb5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-1">
              <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
              <path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/>
            </svg>
            <div>
              <p className="font-mono text-[10px] md:text-[11px] font-bold tracking-[0.2em] text-gray-500 uppercase">
                Section 07
              </p>
              <h2 className="mt-1 font-serif text-3xl md:text-4xl text-gray-900 leading-tight">
                Portfolio Highlights
              </h2>
            </div>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 w-full mx-auto">
            {portfolio.map((p) => (
              <div 
                key={p.title} 
                data-portfolio-card 
                className="border border-gray-200 rounded-[28px] p-8 flex flex-col bg-white transition-shadow hover:shadow-md"
              >
                <h3 className="font-bold text-[18px] md:text-[20px] text-gray-900 mb-1 tracking-tight">
                  {p.title}
                </h3>
                <p className="text-[14px] text-gray-500 mb-7">
                  {p.role}
                </p>

                <div className="flex flex-wrap gap-2 mb-10">
                  {p.tools.map(t => (
                    <span 
                      key={t} 
                      className="border border-gray-200 rounded-full px-3.5 py-1 text-[12px] font-medium text-gray-600 tracking-wide"
                    >
                      {t}
                    </span>
                  ))}
                </div>

                <div className="mt-auto pt-6 border-t border-gray-100 flex items-center justify-between">
                  <p className="font-bold text-[13px] md:text-[14px] text-gray-900 max-w-[80%] leading-snug">
                    {p.result}
                  </p>
                  <a href={p.link || "#"} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-[#005bb5] font-bold text-[13px] hover:underline transition-all">
                    View
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                      <polyline points="15 3 21 3 21 9"/>
                      <line x1="10" y1="14" x2="21" y2="3"/>
                    </svg>
                  </a>
                </div>
              </div>
            ))}
          </div>

        </div>
      </div>
    </section>
  );
}
