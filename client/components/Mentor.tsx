"use client";

import { useLayoutEffect, useRef } from "react";
import { gsap, prefersReducedMotion } from "../lib/gsap";
import { useStudentData } from "../data/StudentDataContext";

function Star({ filled }: { filled: boolean }) {
  if (filled) {
    return (
      <svg data-star viewBox="0 0 24 24" className="h-[22px] w-[22px] fill-[#005bb5] stroke-[#005bb5] stroke-[1.5]" aria-hidden>
        <path strokeLinejoin="round" strokeLinecap="round" d="M12 2l2.9 6.26 6.86.6-5.2 4.53 1.55 6.7L12 16.55 5.89 20.1l1.55-6.7-5.2-4.54 6.86-.6L12 2z" />
      </svg>
    );
  }
  return (
    <svg data-star viewBox="0 0 24 24" className="h-[22px] w-[22px] fill-transparent stroke-gray-300 stroke-[1.5]" aria-hidden>
      <path strokeLinejoin="round" strokeLinecap="round" d="M12 2l2.9 6.26 6.86.6-5.2 4.53 1.55 6.7L12 16.55 5.89 20.1l1.55-6.7-5.2-4.54 6.86-.6L12 2z" />
    </svg>
  );
}

export default function Mentor() {
  const { mentorRatings, mentorRemark } = useStudentData();
  const scope = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = scope.current;
    if (!el || prefersReducedMotion()) return;

    const ctx = gsap.context(() => {
      gsap.from("[data-animate-section]", {
        y: 20,
        opacity: 0,
        duration: 0.6,
        stagger: 0.2,
        scrollTrigger: { trigger: el, start: "top 80%", once: true },
        ease: "power3.out"
      });

      gsap.from("[data-star]", {
        scale: 0,
        transformOrigin: "50% 50%",
        duration: 0.35,
        stagger: 0.035,
        ease: "back.out(2.5)",
        scrollTrigger: { trigger: "[data-ratings]", start: "top 78%", once: true },
      });

      gsap.from("[data-quote]", {
        opacity: 0,
        y: 30,
        duration: 0.8,
        ease: "power3.out",
        scrollTrigger: { trigger: "[data-quote]", start: "top 80%", once: true },
      });
    }, el);

    return () => ctx.revert();
  }, [mentorRatings, mentorRemark]);

  return (
    <div ref={scope} className="bg-[#f9fafb] pb-16">
      <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-[100px]">
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 md:gap-8 w-full">
          
          {/* SECTION 09: Mentor Evaluation */}
          <div data-animate-section className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden px-8 md:px-14 pt-10 md:pt-12 pb-14 h-full flex flex-col">
          
          <div className="flex items-start gap-4 pb-8 border-b border-gray-200 mb-10">
            <div>
              <p className="font-mono text-[10px] md:text-[11px] font-bold tracking-[0.2em] text-gray-500 uppercase">
                Section 09
              </p>
              <h2 className="mt-1 font-serif text-3xl md:text-4xl text-gray-900 leading-tight">
                Mentor Evaluation
              </h2>
            </div>
          </div>

          <div data-ratings className="max-w-3xl space-y-6">
            {mentorRatings.map((r) => (
              <div
                key={r.label}
                className="flex items-center justify-between"
              >
                <span className="text-[15px] md:text-[16px] font-bold text-gray-800">{r.label}</span>
                <div className="flex gap-1.5" aria-label={`${r.stars} out of 5 stars`}>
                  {Array.from({ length: 5 }, (_, i) => (
                    <Star key={i} filled={i < r.stars} />
                  ))}
                </div>
              </div>
            ))}
            
            <div className="mt-auto pt-8 flex items-center justify-between rounded-[16px] border border-blue-200 bg-white px-6 py-5 shadow-sm">
              <span className="font-bold text-[12px] md:text-[13px] uppercase tracking-[0.15em] text-[#005bb5]">
                Recommendation
              </span>
              <span className="font-bold text-[14px] md:text-[15px] text-[#005bb5]">Highly Recommended</span>
            </div>
          </div>
          
          </div>

          {/* SECTION 10: Mentor Remarks */}
          <div data-animate-section className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden px-8 md:px-14 pt-10 md:pt-12 pb-14 h-full flex flex-col">
          
          <div className="flex items-start gap-4 pb-8 border-b border-gray-200 mb-10">
        
            <div>
              <p className="font-mono text-[10px] md:text-[11px] font-bold tracking-[0.2em] text-gray-500 uppercase">
                Section 10
              </p>
              <h2 className="mt-1 font-serif text-3xl md:text-4xl text-gray-900 leading-tight">
                Mentor Remarks
              </h2>
            </div>
          </div>

          <figure data-quote className="border-l-[3px] border-[#005bb5] pl-6 md:pl-8 py-2 max-w-4xl">
            <blockquote className="font-serif text-[22px] md:text-[26px] leading-[1.6] text-gray-800">
              “{mentorRemark.quote}
              {mentorRemark.roles && mentorRemark.roles.length > 0 && (
                <>
                  {" "}He is recommended for{" "}
                  {mentorRemark.roles.map((role, i) => (
                    <span key={role}>
                      <span className="text-[#005bb5] font-medium">{role}</span>
                      {i < mentorRemark.roles.length - 2
                        ? ", "
                        : i === mentorRemark.roles.length - 2
                          ? ", and "
                          : ""}
                    </span>
                  ))}{" "}
                  roles.
                </>
              )}”
            </blockquote>
            <figcaption className="mt-8 font-bold text-[13px] text-gray-500">
              {mentorRemark.by}
            </figcaption>
          </figure>
          
          </div>
        </div>
      </div>
    </div>
  );
}
