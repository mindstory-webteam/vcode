"use client";

import { useLayoutEffect, useRef } from "react";
import { gsap, prefersReducedMotion } from "../lib/gsap";
import { useStudentData } from "../data/StudentDataContext";

const getIconForAchievement = (label: string) => {
  const lc = label.toLowerCase();
  
  if (lc.includes("performer") || lc.includes("trophy")) {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#000000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/>
        <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/>
        <path d="M4 22h16"/>
        <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/>
        <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/>
        <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>
      </svg>
    );
  }
  
  if (lc.includes("certified")) {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#000000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z"/>
        <path d="m9 12 2 2 4-4"/>
      </svg>
    );
  }
  
  if (lc.includes("completed") || lc.includes("100%")) {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#000000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <path d="m9 12 2 2 4-4"/>
      </svg>
    );
  }
  
  if (lc.includes("experience") || lc.includes("client")) {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#000000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect width="20" height="14" x="2" y="7" rx="2" ry="2"/>
        <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
      </svg>
    );
  }
  
  if (lc.includes("communication")) {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#000000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
    );
  }
  
  if (lc.includes("presentation")) {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#000000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect width="20" height="14" x="2" y="3" rx="2"/>
        <line x1="8" x2="16" y1="21" y2="21"/>
        <line x1="12" x2="12" y1="17" y2="21"/>
      </svg>
    );
  }
  
  if (lc.includes("problem") || lc.includes("solver")) {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#000000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.9 1.2 1.5 1.5 2.5"/>
        <path d="M9 18h6"/>
        <path d="M10 22h4"/>
      </svg>
    );
  }
  
  if (lc.includes("team") || lc.includes("player")) {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#000000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
        <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    );
  }
  
  // Default fallback icon
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#005bb5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <path d="M12 16v-4"/>
      <path d="M12 8h.01"/>
    </svg>
  );
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
    <section ref={scope} className="bg-[#f9fafb] pb-16">
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
