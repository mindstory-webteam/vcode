"use client";

import { useLayoutEffect, useRef } from "react";
import { gsap, prefersReducedMotion } from "../lib/gsap";
import { useStudentData } from "../data/StudentDataContext";
import { ExternalLink } from "lucide-react";

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
    <section ref={scope} className="pb-12 sm:pb-16">
      <div className="w-full max-w-[1600px] mx-auto relative px-4 sm:px-6 md:px-10 lg:px-16 xl:px-[100px]">
        <div data-animate-section className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden px-5 sm:px-8 md:px-12 lg:px-14 pt-8 sm:pt-10 md:pt-12 pb-8 sm:pb-12 md:pb-14">
          
          {/* Header */}
          <div className="flex items-start gap-4 pb-6 sm:pb-8 border-b border-gray-200 mb-8 sm:mb-10 md:mb-12">
            <div>
              <p className="font-mono text-[10px] md:text-[11px] font-bold tracking-[0.2em] text-gray-500 uppercase">
                Section 07
              </p>
              <h2 className="mt-1 font-serif text-2xl sm:text-3xl md:text-4xl text-gray-900 leading-tight">
                Portfolio Highlights
              </h2>
            </div>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 md:gap-8 w-full mx-auto">
            {portfolio.map((p) => (
              <div 
                key={p.title} 
                data-portfolio-card 
                className="border border-gray-200 rounded-2xl sm:rounded-[28px] p-5 sm:p-6 md:p-8 flex flex-col bg-white transition-shadow hover:shadow-md"
              >
                <h3 className="font-bold text-base sm:text-[18px] md:text-[20px] text-gray-900 mb-1 tracking-tight">
                  {p.title}
                </h3>
                <p className="text-xs sm:text-[14px] text-gray-500 mb-5 sm:mb-7">
                  {p.role}
                </p>

                <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-6 sm:mb-10">
                  {p.tools.map(t => (
                    <span 
                      key={t} 
                      className="border border-gray-200 rounded-full px-2.5 sm:px-3.5 py-0.5 sm:py-1 text-[11px] sm:text-[12px] font-medium text-gray-600 tracking-wide"
                    >
                      {t}
                    </span>
                  ))}
                </div>

                <div className="mt-auto pt-4 sm:pt-6 border-t border-gray-100 flex items-center justify-between gap-3">
                  <p className="font-bold text-xs sm:text-[13px] md:text-[14px] text-gray-900 max-w-[75%] sm:max-w-[80%] leading-snug">
                    {p.result}
                  </p>
                  {p.link ? (
                    <a href={p.link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 sm:gap-1.5 text-[#005bb5] font-bold text-xs sm:text-[13px] shrink-0 transition-all">
                      View
                      <ExternalLink size={14} />
                    </a>
                  ) : null}
                </div>
              </div>
            ))}
          </div>

        </div>
      </div>
    </section>
  );
}
