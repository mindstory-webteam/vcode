"use client";

import { useLayoutEffect, useRef } from "react";
import { gsap, prefersReducedMotion } from "../lib/gsap";
import { useStudentData } from "../data/StudentDataContext";

function Star({ filled }: { filled: boolean }) {
  return (
    <svg
      data-star
      viewBox="0 0 24 24"
      className={`h-5 w-5 ${filled ? "fill-gold" : "fill-paper/20"}`}
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
    <section ref={scope} className="bg-ink py-20 text-paper">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mb-10 border-b border-paper/15 pb-4">
          <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-gold">
            Sections 09 – 10
          </p>
          <h2 className="mt-1 font-display text-3xl font-medium tracking-tight md:text-4xl">
            Mentor Evaluation & Remarks
          </h2>
        </div>

        <div className="grid gap-12 lg:grid-cols-2">
          {/* ratings */}
          <div data-ratings className="space-y-5">
            {mentorRatings.map((r) => (
              <div
                key={r.label}
                className="flex items-center justify-between border-b border-paper/10 pb-4"
              >
                <span className="text-sm text-paper/80">{r.label}</span>
                <div className="flex gap-1" aria-label={`${r.stars} out of 5 stars`}>
                  {Array.from({ length: 5 }, (_, i) => (
                    <Star key={i} filled={i < r.stars} />
                  ))}
                </div>
              </div>
            ))}
            <div className="flex items-center justify-between rounded-xl border border-mint/30 bg-mint/10 px-5 py-4">
              <span className="font-mono text-[11px] uppercase tracking-widest text-paper/60">
                Recommendation
              </span>
              <span className="font-medium text-mint">Highly Recommended</span>
            </div>
          </div>

          {/* quote */}
          <figure data-quote className="border-l-2 border-gold pl-6 md:pl-8">
            <blockquote className="font-display text-2xl leading-snug text-paper md:text-[1.7rem]">
              “{mentorRemark.quote}
              {mentorRemark.roles.length > 0 && (
                <>
                  {" "}He is recommended for{" "}
                  {mentorRemark.roles.map((role, i) => (
                    <span key={role}>
                      <span className="text-gold">{role}</span>
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
            <figcaption className="mt-6 font-mono text-xs uppercase tracking-widest text-paper/50">
              — {mentorRemark.by}
            </figcaption>
          </figure>
        </div>
      </div>
    </section>
  );
}
