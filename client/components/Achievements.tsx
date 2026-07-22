"use client";

import { useLayoutEffect, useRef } from "react";
import { gsap, prefersReducedMotion } from "../lib/gsap";
import { useStudentData } from "../data/StudentDataContext";
import {
  Trophy,
  BadgeCheck,
  CheckCircle,
  Briefcase,
  MessageSquare,
  Monitor,
  Lightbulb,
  Users,
  Info,
} from "lucide-react";

const getIconForAchievement = (label: string) => {
  const lc = label.toLowerCase();
  const cls = "text-gray-800";

  if (lc.includes("performer") || lc.includes("trophy"))
    return <Trophy size={24} className={cls} />;
  if (lc.includes("certified"))
    return <BadgeCheck size={24} className={cls} />;
  if (lc.includes("completed") || lc.includes("100%"))
    return <CheckCircle size={24} className={cls} />;
  if (lc.includes("experience") || lc.includes("client"))
    return <Briefcase size={24} className={cls} />;
  if (lc.includes("communication"))
    return <MessageSquare size={24} className={cls} />;
  if (lc.includes("presentation"))
    return <Monitor size={24} className={cls} />;
  if (lc.includes("problem") || lc.includes("solver"))
    return <Lightbulb size={24} className={cls} />;
  if (lc.includes("team") || lc.includes("player"))
    return <Users size={24} className={cls} />;
  return <Info size={24} className="text-[#005bb5]" />;
};

export default function Achievements() {
  const { achievements } = useStudentData();
  const scope = useRef<HTMLElement>(null);
  
  const validAchievements = achievements ? achievements.filter(a => typeof a === 'string' && a.trim().length > 0) : [];
  
  const displayAchievements = validAchievements.length > 0 
    ? validAchievements 
    : [
        "Top Performer", 
        "Agency Certified", 
        "100% Internship Completed", 
        "Live Client Experience", 
        "Excellent Communication", 
        "Presentation Excellence", 
        "Problem Solver", 
        "Team Player"
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
      // Card stagger animation removed to prevent hot-reload blanking issues
    }, el);

    return () => ctx.revert();
  }, [displayAchievements]);

  if (!displayAchievements || displayAchievements.length === 0) return null;

  return (
    <section ref={scope} className=" pb-16">
      <div className="w-full max-w-[1600px] mx-auto relative px-4 sm:px-[100px]">
        <div data-animate-section className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden px-8 md:px-14 pt-10 md:pt-12 pb-14">
          
          {/* Header */}
          <div className="flex items-start gap-4 pb-8 border-b border-gray-200 mb-10">
         
            <div>
              <p className="font-mono text-[10px] md:text-[11px] font-bold tracking-[0.2em] text-gray-500 uppercase">
                Section 08
              </p>
              <h2 className="mt-1 font-serif text-3xl md:text-4xl text-gray-900 leading-tight">
                Achievements
              </h2>
            </div>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-5 w-full">
            {displayAchievements.map((a) => (
              <div 
                key={a}
                data-achievement-card
                className="border border-gray-200 rounded-[20px] p-4 md:p-6 flex flex-col items-center justify-center text-center min-h-[140px] bg-white transition-all hover:border-blue-200 hover:shadow-sm"
              >
                <div className="mb-4">
                  {getIconForAchievement(a)}
                </div>
                <h3 className="font-bold text-[13px] md:text-[14px] text-gray-800 leading-tight">
                  {a}
                </h3>
              </div>
            ))}
          </div>

        </div>
      </div>
    </section>
  );
}
