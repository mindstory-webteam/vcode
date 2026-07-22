"use client";

import { useLayoutEffect, useRef } from "react";
import { gsap, prefersReducedMotion } from "../lib/gsap";
import { useStudentData } from "../data/StudentDataContext";
import SectionHeading from "./SectionHeading";
import CountUp from "./CountUp";
import Reveal from "./Reveal";
import { QrCode } from "lucide-react";



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
  const { student } = useStudentData();

  return (
    <>
      <footer className="pb-20 text-gray-900 ">
        <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-[100px]">

          <Reveal>
            <div
              data-certificate
              className="relative overflow-hidden rounded-3xl bg-white border border-gray-200 text-gray-900 shadow-sm"
            >
              <div className="grid gap-10 p-8 md:p-12 md:grid-cols-3 items-center">

                {/* ── LEFT · Mentor Signature ── */}
                <div className="flex flex-col items-start">
                  <div className="w-full max-w-xs">
                    <Signature />
                    <div className="mt-2 border-t border-gray-200 pt-3">
                      <p className="font-bold text-gray-900">Mentor Signature</p>
                      <p className="mt-0.5 text-sm text-gray-500">Head of Digital Marketing · VCA</p>
                    </div>
                  </div>
                </div>

                {/* ── CENTER · Academy Seal ── */}
                <div className="flex flex-col items-center justify-center text-center">
                  <p className="font-bold text-[15px] text-gray-900 mt-2">Academy Seal</p>
                  <p className="text-sm text-gray-500">Official mark of authenticity</p>
                  <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-gray-400 font-semibold mt-1">
                    Doc {student.docNo}
                  </p>
                </div>

                {/* ── RIGHT · Real QR Code (styled like Hero.tsx) ── */}
                <div className="flex flex-col items-center text-center justify-center">
                  {/* QR Code */}
                  <div className="w-[140px] h-[140px] bg-white mb-6 flex items-center justify-center p-2 relative overflow-hidden border border-gray-200 rounded-xl group transition-colors">
                    <img 
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=140x140&margin=0&data=${encodeURIComponent(student.verifyUrl)}`} 
                      alt="Student Verification QR" 
                      className="w-full h-full object-contain relative z-10 transition-transform" 
                    />
                    {/* Very subtle grid background as fallback */}
                    <div className="absolute inset-0 bg-[linear-gradient(to_right,#f0f0f0_1px,transparent_1px),linear-gradient(to_bottom,#f0f0f0_1px,transparent_1px)] bg-[size:10px_10px] z-0 opacity-50"></div>
                  </div>

                  {/* Verification Link */}
                  <a href={student.verifyUrl || "#"} className="flex items-center gap-2 text-[#005bb5] hover:text-blue-800 transition-colors font-semibold text-[15px]">
                    <QrCode size={18} />
                    Verify Student Profile
                  </a>

                  {/* Plain Text URL */}
                  <div className="mt-3 text-gray-500 font-mono text-[11px] tracking-widest uppercase">
                    {student.verifyUrl ? student.verifyUrl.replace('https://', '') : `viralcat.academy/v/${student.id}`}
                  </div>
                </div>

              </div>

              {/* bottom strip */}
              <div className="border-t border-gray-200 bg-gray-50 px-8 py-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-gray-400 font-semibold">
                  Generated by Viral Cat Academy Portal · {student.name} · {student.id}
                </p>
              </div>
            </div>
          </Reveal>
        </div>
      </footer>
    </>
  );
}