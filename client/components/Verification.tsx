"use client";

import { useLayoutEffect, useRef } from "react";
import { gsap, prefersReducedMotion } from "../lib/gsap";
import { useStudentData } from "../data/StudentDataContext";
import SectionHeading from "./SectionHeading";
import CountUp from "./CountUp";
import Reveal from "./Reveal";

/* ── Rotating circular-text academy seal ─────────────────────── */
function Seal() {
  const ref = useRef<SVGSVGElement>(null);

  useLayoutEffect(() => {
    if (!ref.current || prefersReducedMotion()) return;
    const tween = gsap.to(ref.current.querySelector("[data-seal-text]"), {
      rotation: 360,
      transformOrigin: "50% 50%",
      duration: 24,
      repeat: -1,
      ease: "none",
    });
    return () => {
      tween.kill();
    };
  }, []);

  return (
    <svg ref={ref} viewBox="0 0 160 160" className="h-32 w-32 md:h-36 md:w-36" aria-label="Academy seal">
      <defs>
        <path id="sealCircle" d="M80,80 m-58,0 a58,58 0 1,1 116,0 a58,58 0 1,1 -116,0" />
      </defs>
      <circle cx="80" cy="80" r="72" fill="none" stroke="var(--color-gold)" strokeWidth="2" />
      <circle cx="80" cy="80" r="44" fill="none" stroke="var(--color-gold)" strokeWidth="1" strokeDasharray="3 4" />
      <g data-seal-text>
        <text className="fill-gold font-mono text-[10.5px] uppercase" letterSpacing="3.5">
          <textPath href="#sealCircle">
            Viral Cat Academy · Verified Professional · Grade Card ·
          </textPath>
        </text>
      </g>
      <text x="80" y="86" textAnchor="middle" className="fill-gold font-display text-xl font-semibold">
        VCA
      </text>
    </svg>
  );
}

/* ── Fake QR block built from a deterministic dot grid ────────── */
function QrBlock({ code }: { code: string }) {
  const cells: boolean[] = [];
  let seed = 42;
  for (let i = 0; i < 121; i++) {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    cells.push(seed % 3 !== 0);
  }
  return (
    <svg viewBox="0 0 110 110" className="h-20 w-20" aria-label={`Verification QR for code ${code}`}>
      <rect width="110" height="110" fill="white" />
      {cells.map((on, i) =>
        on ? (
          <rect key={i} x={(i % 11) * 10} y={Math.floor(i / 11) * 10} width="9" height="9" fill="var(--color-ink)" />
        ) : null
      )}
      {/* finder squares */}
      {[[0, 0], [80, 0], [0, 80]].map(([x, y]) => (
        <g key={`${x}${y}`}>
          <rect x={x} y={y} width="30" height="30" fill="var(--color-ink)" />
          <rect x={x + 5} y={y + 5} width="20" height="20" fill="white" />
          <rect x={x + 10} y={y + 10} width="10" height="10" fill="var(--color-ink)" />
        </g>
      ))}
    </svg>
  );
}

/* ── Animated handwritten signature ───────────────────────────── */
function Signature() {
  const ref = useRef<SVGSVGElement>(null);

  useLayoutEffect(() => {
    const svg = ref.current;
    if (!svg) return;
    const paths = svg.querySelectorAll<SVGPathElement>("[data-sig-path]");

    if (prefersReducedMotion()) return;

    const tl = gsap.timeline({
      scrollTrigger: { trigger: svg, start: "top 85%", once: true },
    });

    paths.forEach((p) => {
      const len = p.getTotalLength();
      gsap.set(p, { strokeDasharray: len, strokeDashoffset: len });
      tl.to(p, { strokeDashoffset: 0, duration: 1.1, ease: "power2.inOut" }, ">-0.15");
    });

    return () => {
      tl.scrollTrigger?.kill();
      tl.kill();
    };
  }, []);

  return (
    <svg ref={ref} viewBox="0 0 320 120" className="h-24 w-full max-w-xs" aria-label="Mentor signature">
      {/* flowing signature strokes */}
      <path
        data-sig-path
        d="M28,84 C22,60 34,30 52,26 C70,22 74,44 62,58 C50,72 34,74 40,60 C50,38 82,30 104,42 C118,50 112,70 96,74 C112,64 138,50 158,54 C172,57 168,72 156,74 C170,68 192,56 210,60"
        fill="none"
        stroke="var(--color-ink)"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path
        data-sig-path
        d="M214,58 C230,50 252,44 268,52 C258,56 244,66 252,72 C260,78 282,68 296,54"
        fill="none"
        stroke="var(--color-ink)"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      {/* underline flourish */}
      <path
        data-sig-path
        d="M30,96 C110,104 220,102 300,90"
        fill="none"
        stroke="var(--color-gold-deep)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

/* ── Certificate footer ───────────────────────────────────────── */
export default function Verification() {
  const { interviewReadiness, student } = useStudentData();
  const scope = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    const el = scope.current;
    if (!el || prefersReducedMotion()) return;

    const ctx = gsap.context(() => {
      // Rubber stamp slams down when the certificate scrolls into view
      gsap.from("[data-stamp]", {
        scale: 2,
        opacity: 0,
        rotation: -24,
        duration: 0.55,
        ease: "power4.in",
        scrollTrigger: { trigger: "[data-certificate]", start: "top 70%", once: true },
      });
      gsap.from("[data-date-stamp]", {
        scale: 1.8,
        opacity: 0,
        rotation: 10,
        duration: 0.45,
        delay: 0.35,
        ease: "power4.in",
        scrollTrigger: { trigger: "[data-certificate]", start: "top 70%", once: true },
      });
    }, el);

    return () => ctx.revert();
  }, []);

  return (
    <>
      {/* Section 11 · Interview readiness */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <SectionHeading
          eyebrow="Section 11"
          title="Interview Readiness"
          badge={{ label: "Ready for placement", tone: "green" }}
        />

        <Reveal stagger="[data-item]" className="grid grid-cols-2 gap-4 md:grid-cols-5">
          {interviewReadiness.map((m) => (
            <div key={m.label} data-item className="rounded-2xl border border-line bg-white p-5 text-center">
              <CountUp to={m.value} suffix="%" className="font-display text-3xl font-semibold text-cobalt" />
              <p className="mt-2 text-xs text-ink/60">{m.label}</p>
            </div>
          ))}
        </Reveal>
      </section>

      {/* Verification footer — physical certificate */}
      <footer ref={scope} className="bg-ink py-20 text-paper">
        <div className="mx-auto max-w-6xl px-6">
          <p className="mb-8 text-center font-mono text-[11px] uppercase tracking-[0.3em] text-gold">
            Verified Professional Grade Card
          </p>

          <Reveal>
            <div
              data-certificate
              className="relative overflow-hidden rounded-2xl bg-paper text-ink shadow-2xl shadow-black/50"
            >
              {/* ── punch-hole perforation strip (left edge) ── */}
              <div aria-hidden className="absolute inset-y-0 left-0 hidden w-12 sm:block">
                <div className="flex h-full flex-col items-center justify-around py-6">
                  {Array.from({ length: 12 }, (_, i) => (
                    <span key={i} className="h-3.5 w-3.5 rounded-full bg-ink shadow-inner" />
                  ))}
                </div>
                {/* tear line */}
                <div className="absolute inset-y-4 right-0 border-r border-dashed border-ink/25" />
              </div>

              <div className="grid gap-12 p-8 sm:pl-20 md:grid-cols-2 md:p-12 md:pl-24">
                {/* ── LEFT · seal, stamps & punch marks ── */}
                <div>
                  <h2 className="font-display text-3xl font-medium md:text-4xl">
                    Authenticated by
                    <br />
                    Viral Cat Academy
                  </h2>
                  <p className="mt-4 max-w-sm text-sm text-ink/60">
                    Verify this credential at{" "}
                    <span className="font-medium text-ink">{student.verifyUrl}</span>.
                  </p>

                  <div className="mt-8 flex flex-wrap items-center gap-6">
                    <Seal />

                    {/* rubber stamp */}
                    <div
                      data-stamp
                      className="-rotate-[8deg] select-none rounded-md border-[3px] border-[#b8402e] px-4 py-2 text-center"
                      style={{ boxShadow: "inset 0 0 0 1.5px #b8402e" }}
                    >
                      <p className="font-mono text-lg font-bold uppercase tracking-[0.25em] text-[#b8402e]">
                        ✓ Verified
                      </p>
                      <p className="font-mono text-[9px] uppercase tracking-[0.3em] text-[#b8402e]/80">
                        Viral Cat Academy
                      </p>
                    </div>

                    {/* date stamp */}
                    <div
                      data-date-stamp
                      className="rotate-[5deg] select-none rounded border-2 border-ink/50 px-3 py-1.5 font-mono text-xs uppercase tracking-[0.2em] text-ink/60"
                    >
                      {student.issued}
                    </div>
                  </div>

                  <div className="mt-8 flex items-center gap-4">
                    <QrBlock code={student.id} />
                    <p className="max-w-40 font-mono text-[10px] uppercase leading-relaxed tracking-widest text-ink/50">
                      Verification QR · Scan to authenticate
                    </p>
                  </div>
                </div>

                {/* ── RIGHT · mentor signature ── */}
                <div className="flex flex-col justify-end md:items-end md:text-right">
                  <div className="w-full max-w-xs">
                    <Signature />
                    <div className="mt-2 border-t border-ink/30 pt-3">
                      <p className="font-medium text-ink">Mentor Signature</p>
                      <p className="mt-0.5 text-sm text-ink/55">Head of Digital Marketing · VCA</p>
                    </div>

                    <div className="mt-8 rounded-xl border border-line bg-white p-4 text-left md:text-right">
                      <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-ink/45">
                        Academy Seal · Official mark of authenticity
                      </p>
                      <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.25em] text-ink/45">
                        Doc {student.docNo}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* bottom strip */}
              <div className="border-t border-line bg-white/60 px-8 py-4 sm:pl-20 md:pl-24">
                <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-ink/40">
                  Generated by Viral Cat Academy Portal · Student {student.name} · ID {student.id}
                </p>
              </div>
            </div>
          </Reveal>
        </div>
      </footer>
    </>
  );
}