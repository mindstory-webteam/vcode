"use client";

import { useLayoutEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { gsap, prefersReducedMotion } from "../lib/gsap";
import { useStudentData } from "../data/StudentDataContext";
import { useAuth } from "../contexts/AuthContext";

export default function Hero() {
  const { student } = useStudentData();
  const { logout } = useAuth();
  const router = useRouter();
  const scope = useRef<HTMLElement>(null);
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

      tl.from("[data-animate]", { 
        y: 20, 
        opacity: 0, 
        duration: 0.6, 
        stagger: 0.05 
      });
    }, el);

    return () => ctx.revert();
  }, []);

  return (
    <header ref={scope} className="bg-[#f9fafb] text-gray-900 font-sans selection:bg-blue-100 pb-16 pt-[120px]">
      <div className="w-full max-w-[1600px] mx-auto relative px-[100px]">
        
        {/* Certificate Card */}
        <div data-animate className="bg-white rounded-3xl overflow-hidden">
          
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start p-8 md:p-10 pb-6 md:pb-8 gap-6">
            <div className="flex items-start gap-4">
            
              <div>
                <h2 className="font-serif text-2xl md:text-[28px] text-gray-900 leading-tight">
                  Viral Cat Academy
                </h2>
                <p className="font-mono text-[10px] md:text-[11px] font-bold tracking-[0.2em] text-gray-500 uppercase mt-2">
                  Grade Card · Industry Readiness Report
                </p>
              </div>
            </div>
            
            <div className="text-left sm:text-right flex flex-col gap-1.5">
              <p className="font-mono text-[11px] md:text-xs text-gray-500 tracking-wider">
                Doc &bull; {student.docNo}
              </p>
              <p className="text-sm md:text-[15px] text-gray-700 font-medium">
                Issued {student.issued}
              </p>
            </div>
          </div>

          {/* Divider */}
          <div className="h-px bg-gray-100 w-full"></div>

          {/* Body */}
          <div className="p-8 md:p-12 md:pt-14">
            
            {/* Photo & Badge */}
            <div className="relative inline-block mb-10">
              <div className="w-32 h-32 md:w-[140px] md:h-[140px] rounded-3xl bg-gray-100 border border-gray-200 shadow-inner overflow-hidden relative flex items-center justify-center">
                <Image
                  src={photoSrc || "/student.svg"}
                  alt={`Portrait of ${student.name}`}
                  fill
                  sizes="140px"
                  className="object-cover opacity-90"
                  unoptimized={photoSrc?.endsWith(".svg") ?? true}
                  onError={() => setPhotoSrc("/student.svg")}
                />
              </div>
              <div className="absolute -bottom-3 -right-6 bg-white border border-gray-200 rounded-full px-3 py-1.5 flex items-center gap-1.5 shadow-sm">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#005bb5" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/>
                  <path d="m9 12 2 2 4-4"/>
                </svg>
                <span className="text-[#005bb5] text-[11px] font-bold tracking-wide">Verified</span>
              </div>
            </div>

            {/* Student Name */}
            <div>
              <p className="font-mono text-[11px] md:text-xs font-bold tracking-[0.2em] text-gray-500 uppercase">
                Student &middot; Batch {student.batch}
              </p>
              <h1 className="font-serif text-[64px] md:text-[88px] text-gray-900 leading-none tracking-tight mt-3">
                {student.name}
              </h1>
            </div>

            {/* Program Title */}
            <h2 className="text-[#005bb5] text-2xl md:text-[28px] font-medium tracking-tight mt-10 md:mt-12">
              {student.program}
            </h2>

            {/* Meta row */}
            <div className="mt-5 flex flex-wrap items-center gap-6 text-sm md:text-[15px] text-gray-600">
              <span className="font-mono text-gray-900 font-semibold tracking-widest uppercase text-xs md:text-sm">
                VC-{student.id}
              </span>
              <div className="flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-60">
                  <rect width="20" height="14" x="2" y="7" rx="2" ry="2"/>
                  <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
                </svg>
                <span>{student.program}</span>
              </div>
              <div className="flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-60">
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="12 6 12 12 16 14"/>
                </svg>
                <span>{student.duration}</span>
              </div>
            </div>

            {/* Description */}
            <p className="mt-8 text-gray-600 leading-relaxed text-[15px] md:text-[17px]">
              {student.summary}
            </p>

            {/* Stats Grid */}
            <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* Card 1 */}
              <div className="border border-gray-200 rounded-2xl p-6 shadow-[0_2px_8px_-4px_rgba(0,0,0,0.05)] flex flex-col justify-between h-[120px] bg-white">
                <div className="text-[10px] md:text-[11px] font-bold uppercase tracking-[0.2em] text-gray-500">
                  Overall Grade
                </div>
                <div className="font-serif text-[34px] md:text-[40px] text-gray-900 flex items-start leading-none tracking-tight">
                  {student.overallGrade?.replace('+', '') || '—'}
                  {student.overallGrade?.includes('+') && <span className="text-[20px] md:text-[24px] mt-1.5">+</span>}
                  {student.overallGrade?.includes('-') && <span className="text-[20px] md:text-[24px] mt-1.5">-</span>}
                </div>
              </div>

              {/* Card 2 */}
              <div className="border border-gray-200 rounded-2xl p-6 shadow-[0_2px_8px_-4px_rgba(0,0,0,0.05)] flex flex-col justify-between h-[120px] bg-white">
                <div className="text-[10px] md:text-[11px] font-bold uppercase tracking-[0.2em] text-gray-500">
                  Industry Readiness
                </div>
                <div className="font-serif text-[34px] md:text-[40px] text-gray-900 leading-none tracking-tight">
                  {student.readiness}%
                </div>
              </div>

              {/* Card 3 */}
              <div className="border border-gray-200 rounded-2xl p-6 shadow-[0_2px_8px_-4px_rgba(0,0,0,0.05)] flex flex-col justify-between h-[120px] bg-white">
                <div className="flex items-center gap-1.5 text-[10px] md:text-[11px] font-bold uppercase tracking-[0.2em] text-gray-500">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                    <polyline points="22 4 12 14.01 9 11.01"/>
                  </svg>
                  Status
                </div>
                <div className="font-serif text-[28px] md:text-[34px] text-gray-900 tracking-tight leading-none whitespace-nowrap overflow-hidden text-ellipsis capitalize">
                  {student.status?.replace('_', ' ') || '—'}
                </div>
              </div>

              {/* Card 4 */}
              <div className="border border-gray-200 rounded-2xl p-6 shadow-[0_2px_8px_-4px_rgba(0,0,0,0.05)] flex flex-col justify-between h-[120px] bg-white">
                <div className="text-[10px] md:text-[11px] font-bold uppercase tracking-[0.2em] text-gray-500">
                  Cohort
                </div>
                <div className="font-serif text-[28px] md:text-[34px] text-gray-900 tracking-tight leading-none whitespace-nowrap overflow-hidden text-ellipsis">
                  {student.batch || '—'}
                </div>
              </div>
            </div>

            {/* QR Verification Section */}
            <div className="mt-20 flex flex-col items-center pb-10">
              {/* Blank QR Box Placeholder */}
              <div className="w-[140px] h-[140px] border border-gray-200 rounded-2xl shadow-sm bg-white mb-6 flex items-center justify-center p-2 relative overflow-hidden">
                {/* Very subtle grid background */}
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#f0f0f0_1px,transparent_1px),linear-gradient(to_bottom,#f0f0f0_1px,transparent_1px)] bg-[size:10px_10px]"></div>
              </div>

              {/* Verification Link */}
              <a href={student.verifyUrl || "#"} className="flex items-center gap-2 text-[#005bb5] hover:text-blue-800 transition-colors font-semibold text-[15px]">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="5" height="5" x="3" y="3" rx="1"/>
                  <rect width="5" height="5" x="16" y="3" rx="1"/>
                  <rect width="5" height="5" x="3" y="16" rx="1"/>
                  <path d="M21 16h-3a2 2 0 0 0-2 2v3"/>
                  <path d="M21 21v.01"/>
                  <path d="M12 7v3a2 2 0 0 1-2 2H7"/>
                </svg>
                Verify Student Profile
              </a>

              {/* Plain Text URL */}
              <div className="mt-3 text-gray-500 font-mono text-[11px] tracking-widest uppercase">
                {student.verifyUrl ? student.verifyUrl.replace('https://', '') : `viralcat.academy/v/${student.id}`}
              </div>
            </div>

          </div>
        </div>
      </div>
    </header>
  );
}