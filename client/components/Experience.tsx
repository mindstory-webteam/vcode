"use client";

import { useLayoutEffect, useRef } from "react";
import { gsap, prefersReducedMotion } from "../lib/gsap";
import { useStudentData } from "../data/StudentDataContext";
import CountUp from "./CountUp";
import {
  Clock,
  Briefcase,
  Users,
  Sparkles,
  Target,
  Activity,
  FileText,
  MessageSquare,
  Info,
} from "lucide-react";

const getIconForStat = (label: string) => {
  const lc = label.toLowerCase();
  const cls = "text-[#005bb5]";
  if (lc.includes("duration") || lc.includes("hrs"))
    return <Clock size={22} className={cls} />;
  if (lc.includes("projects"))
    return <Briefcase size={22} className={cls} />;
  if (lc.includes("accounts") || lc.includes("clients"))
    return <Users size={22} className={cls} />;
  if (lc.includes("creatives"))
    return <Sparkles size={22} className={cls} />;
  if (lc.includes("campaigns") || lc.includes("ad"))
    return <Target size={22} className={cls} />;
  if (lc.includes("audits"))
    return <Activity size={22} className={cls} />;
  if (lc.includes("reports"))
    return <FileText size={22} className={cls} />;
  if (lc.includes("content"))
    return <MessageSquare size={22} className={cls} />;
  return <Info size={22} className={cls} />;
};

export default function Experience() {
  const { experience, student } = useStudentData();
  const scope = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    const el = scope.current;
    if (!el || prefersReducedMotion()) return;

    const ctx = gsap.context(() => {
      gsap.from("[data-animate-exp]", {
        y: 20,
        opacity: 0,
        duration: 0.6,
        scrollTrigger: { trigger: el, start: "top 80%", once: true },
        ease: "power3.out"
      });
      
      gsap.from("[data-exp-card]", {
        y: 15,
        opacity: 0,
        duration: 0.5,
        stagger: 0.05,
        scrollTrigger: { trigger: el, start: "top 75%", once: true },
        ease: "power2.out"
      });
    }, el);

    return () => ctx.revert();
  }, []);

  // Prepend Internship Duration card if hours is present
  const allStats = [
    ...(experience.hours !== null
      ? [
          {
            label: "Internship Duration",
            value: experience.hours,
            suffix: " hrs",
          },
        ]
      : []),
    ...experience.stats,
  ];

  return (
    <section ref={scope} className=" pb-16">
      <div className="w-full max-w-[1600px] mx-auto relative px-4 sm:px-[100px]">
        <div data-animate-exp className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden px-8 md:px-14 pt-10 md:pt-12 pb-14">
          
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-8 border-b border-gray-200 mb-10 gap-4">
            <div className="flex items-center gap-4">
              <div>
                <p className="font-mono text-[10px] md:text-[11px] font-bold tracking-[0.2em] text-gray-500 uppercase">
                  Section 05
                </p>
                <h2 className="mt-0.5 font-serif text-2xl md:text-3xl text-gray-900 leading-tight">
                  Professional Experience
                </h2>
              </div>
            </div>
            
            {(experience.role || experience.organization) && (
              <div className="font-sans text-[14px] md:text-[16px] font-medium text-gray-500 sm:mt-4">
                {experience.role}
                {experience.role && experience.organization && " · "}
                {experience.organization}
              </div>
            )}
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-5">
            {allStats.map((s) => (
              <div 
                key={s.label} 
                data-exp-card
                className="border border-gray-200 rounded-3xl p-6 md:p-8 flex flex-col justify-between h-[160px] md:h-[180px] bg-white transition-shadow hover:shadow-md"
              >
                <div className="mb-4">
                  {getIconForStat(s.label)}
                </div>
                <div>
                  <h3 className="font-serif text-[34px] md:text-[40px] text-gray-900 leading-none tracking-tight">
                    <CountUp to={s.value} suffix={s.suffix} />
                  </h3>
                  <p className="text-gray-500 text-[13px] md:text-[14px] font-medium mt-3 leading-snug">
                    {s.label}
                  </p>
                </div>
              </div>
            ))}
          </div>

        </div>
      </div>
    </section>
  );
}
