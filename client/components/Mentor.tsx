"use client";

import { useLayoutEffect, useRef } from "react";
import { gsap, prefersReducedMotion } from "../lib/gsap";
import { useStudentData } from "../data/StudentDataContext";

function Star({ filled }: { filled: boolean }) {
  return (
    <svg
      data-star
      viewBox="0 0 24 24"
      className={`h-5 w-5 ${filled ? "fill-yellow-400" : "fill-gray-200"}`}
      aria-hidden
    >
      <path d="M12 2l2.9 6.26 6.86.6-5.2 4.53 1.55 6.7L12 16.55 5.89 20.1l1.55-6.7-5.2-4.54 6.86-.6L12 2z" />
    </svg>
  );
}

export default function Mentor() {
  const { mentorRatings, mentorRemark } = useStudentData();
  const scope = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    const el = scope.current;
    if (!el || prefersReducedMotion()) return;

    const ctx = gsap.context(() => {
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
    <section ref={scope} className="py-20 text-gray-900 border-t border-gray-100">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mb-10 border-b border-gray-200 pb-4">
          <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-gray-500 font-bold">
            Sections 09 – 10
          </p>
          <h2 className="mt-1 font-serif text-3xl font-medium tracking-tight md:text-4xl">
            Mentor Evaluation & Remarks
          </h2>
        </div>

        <div className="grid gap-12 lg:grid-cols-2">
          {/* ratings */}
          <div data-ratings className="space-y-5">
            {mentorRatings.map((r) => (
              <div
                key={r.label}
                className="flex items-center justify-between border-b border-gray-100 pb-4"
              >
                <span className="text-sm text-gray-700 font-medium">{r.label}</span>
                <div className="flex gap-1" aria-label={`${r.stars} out of 5 stars`}>
                  {Array.from({ length: 5 }, (_, i) => (
                    <Star key={i} filled={i < r.stars} />
                  ))}
                </div>
              </div>
            ))}
            <div className="flex items-center justify-between rounded-xl border border-green-200 bg-green-50 px-5 py-4 shadow-sm">
              <span className="font-mono text-[11px] uppercase tracking-widest text-gray-500 font-semibold">
                Recommendation
              </span>
              <span className="font-medium text-green-700">Highly Recommended</span>
            </div>
          </div>

          {/* quote */}
          <figure data-quote className="border-l-2 border-[#005bb5] pl-6 md:pl-8">
            <blockquote className="font-serif text-2xl leading-snug text-gray-900 md:text-[1.7rem]">
              “{mentorRemark.quote}
              {mentorRemark.roles.length > 0 && (
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
            <figcaption className="mt-6 font-mono text-xs uppercase tracking-widest text-gray-500">
              — {mentorRemark.by}
            </figcaption>
          </figure>
        </div>
      </div>
    </section>
  );
}
