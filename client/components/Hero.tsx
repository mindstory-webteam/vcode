"use client";

import { useLayoutEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { gsap, prefersReducedMotion } from "../lib/gsap";
import { useStudentData } from "../data/StudentDataContext";
import { useAuth } from "../contexts/AuthContext";

const RING_R = 26;
const RING_C = 2 * Math.PI * RING_R;

export default function Hero() {
  const { student } = useStudentData();
  const { logout } = useAuth();
  const router = useRouter();
  const scope = useRef<HTMLElement>(null);
  // Falls back to the bundled placeholder if student.photo is missing
  // (e.g. no profile image uploaded) or the image file fails to load.
  const [photoSrc, setPhotoSrc] = useState(student.photo ?? "/student.svg");

  const handleLogout = async () => {
    await logout();
    router.replace("/login");
  };

  useLayoutEffect(() => {
    const el = scope.current;
    if (!el || prefersReducedMotion()) return;

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

      tl.from("[data-hero-meta]", { y: 20, opacity: 0, duration: 0.6, stagger: 0.08 })
        .from("[data-hero-name] span", {
          yPercent: 110,
          duration: 0.9,
          stagger: 0.05,
          ease: "power4.out",
        }, "-=0.3")
        .from("[data-hero-sub]", { y: 24, opacity: 0, duration: 0.6, stagger: 0.1 }, "-=0.5")
        .from("[data-photo-frame]", {
          y: 40,
          opacity: 0,
          duration: 0.9,
          ease: "power3.out",
        }, "-=0.7")
        .from("[data-photo-offset]", {
          x: 0,
          y: 0,
          duration: 0.8,
          ease: "power3.inOut",
        }, "-=0.6")
        .from("[data-verified-tag]", {
          scale: 0,
          rotation: -12,
          duration: 0.5,
          ease: "back.out(2)",
        }, "-=0.4")
        .from("[data-grade-badge]", {
          y: 24,
          opacity: 0,
          duration: 0.6,
          ease: "back.out(1.6)",
        }, "-=0.35")
        .fromTo("[data-ring]",
          { strokeDashoffset: RING_C },
          {
            strokeDashoffset: RING_C * (1 - student.readiness / 100),
            duration: 1.4,
            ease: "power2.inOut",
          },
          "-=0.3"
        )
        .from("[data-ring-num]", {
          textContent: 0,
          snap: { textContent: 1 },
          duration: 1.4,
          ease: "power2.inOut",
        }, "<");
    }, el);

    return () => ctx.revert();
  }, [student.readiness]);

  const nameLetters = student.name.split("");

  return (
    <header ref={scope} className="relative overflow-hidden bg-ink text-paper">
      {/* faint grid texture */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            "linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)",
          backgroundSize: "56px 56px",
        }}
      />
      {/* soft gold glow behind the portrait */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-40 top-1/4 h-[480px] w-[480px] rounded-full bg-gold/10 blur-[140px]"
      />

      <div className="relative mx-auto max-w-6xl px-6 py-16 md:py-24">
        {/* document meta row */}
        <div className="flex flex-wrap items-center justify-between gap-3 font-mono text-[11px] uppercase tracking-[0.22em] text-paper/60">
          <span data-hero-meta>Viral Cat Academy · Grade Card</span>
          <span data-hero-meta className="hidden sm:inline">Doc {student.docNo}</span>
          <span data-hero-meta>Issued {student.issued}</span>
          <button
            data-hero-meta
            type="button"
            onClick={handleLogout}
            className="rounded-full border border-paper/25 px-4 py-1.5 font-mono text-[11px] uppercase tracking-[0.22em] text-paper/70 transition hover:border-gold hover:text-gold"
          >
            Log out
          </button>
        </div>

        <div className="mt-12 grid items-center gap-14 md:mt-16 md:grid-cols-[1.15fr_auto] lg:gap-20">
          {/* ── left: identity ─────────────────────────────── */}
          <div>
            <p data-hero-sub className="font-mono text-xs uppercase tracking-[0.3em] text-gold">
              Student · Batch {student.batch}
            </p>

            <h1
              data-hero-name
              className="mt-3 overflow-hidden font-display text-7xl font-semibold leading-none tracking-tight md:text-[8rem]"
              aria-label={student.name}
            >
              {nameLetters.map((ch, i) => (
                <span key={i} className="inline-block" aria-hidden>
                  {ch}
                </span>
              ))}
            </h1>

            <p data-hero-sub className="mt-5 max-w-xl text-lg text-paper/80">
              {student.program} · {student.duration}
            </p>
            <p data-hero-sub className="mt-4 max-w-xl text-sm leading-relaxed text-paper/60">
              {student.summary}
            </p>

            <div data-hero-sub className="mt-8 flex flex-wrap items-center gap-3">
              <span className="rounded-full bg-mint px-5 py-2 font-mono text-xs font-medium uppercase tracking-widest text-ink">
                {student.status}
              </span>
              <span className="rounded-full border border-paper/25 px-5 py-2 font-mono text-xs uppercase tracking-widest text-paper/70">
                ID {student.id}
              </span>
            </div>

            <p data-hero-sub className="mt-10 font-mono text-[11px] text-paper/45">
              Verify · {student.verifyUrl}
            </p>
          </div>

          {/* ── right: student portrait ─────────────────────── */}
          <div data-photo-frame className="relative mx-auto w-64 sm:w-72 md:w-80">
            {/* offset gold frame behind the photo */}
            <div
              data-photo-offset
              aria-hidden
              className="absolute -right-4 -top-4 h-full w-full rounded-3xl border-2 border-gold/50"
            />

            {/* photo */}
            <div className="relative aspect-[4/5] overflow-hidden rounded-3xl border border-paper/15 bg-[#1c2333] shadow-2xl shadow-black/50">
              <Image
                src={photoSrc || "/student.svg"}
                alt={`Portrait of ${student.name}`}
                fill
                sizes="(min-width: 768px) 320px, 288px"
                className="object-cover"
                priority
                unoptimized={photoSrc?.endsWith(".svg") ?? true}
                onError={() => setPhotoSrc("/student.svg")}
              />
              {/* bottom fade so the badge sits cleanly on the photo */}
              <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-ink/90 to-transparent" />

              {/* verified tag */}
              <span
                data-verified-tag
                className="absolute right-3 top-3 rounded-full border border-gold/60 bg-ink/70 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-gold backdrop-blur"
              >
                ✓ Verified
              </span>
            </div>

            {/* grade + readiness badge overlapping the photo */}
            <div
              data-grade-badge
              className="absolute -bottom-8 left-1/2 flex w-[105%] -translate-x-1/2 items-center gap-4 rounded-2xl border border-paper/10 bg-[#1b2231]/95 p-4 shadow-xl shadow-black/40 backdrop-blur"
            >
              {/* mini readiness ring */}
              <div className="relative h-16 w-16 shrink-0">
                <svg viewBox="0 0 64 64" className="h-full w-full -rotate-90">
                  <circle cx="32" cy="32" r={RING_R} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="5" />
                  <circle
                    data-ring
                    cx="32"
                    cy="32"
                    r={RING_R}
                    fill="none"
                    stroke="var(--color-gold)"
                    strokeWidth="5"
                    strokeLinecap="round"
                    strokeDasharray={RING_C}
                    strokeDashoffset={RING_C * (1 - student.readiness / 100)}
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center font-mono text-sm text-paper">
                  <span data-ring-num>{student.readiness}</span>%
                </span>
              </div>

              <div className="min-w-0">
                <p className="font-display text-3xl font-semibold leading-none text-gold">
                  {student.overallGrade}
                </p>
                <p className="mt-1 truncate font-mono text-[10px] uppercase tracking-[0.2em] text-paper/55">
                  Overall Grade · Industry Readiness
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* spacer for the overlapping badge */}
        <div className="h-10 md:h-6" />
      </div>
    </header>
  );
}