"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { gsap, prefersReducedMotion } from "../lib/gsap";
import { useStudentData } from "../data/StudentDataContext";
import { useAuth } from "../contexts/AuthContext";
import { BadgeCheck, Briefcase, Clock, Download, Eye, QrCode } from "lucide-react";

export default function Hero() {
  const { student } = useStudentData();
  const { logout } = useAuth();
  const router = useRouter();
  const scope = useRef<HTMLElement>(null);
  const [photoSrc, setPhotoSrc] = useState(student.photo ?? "/student.svg");

  useEffect(() => {
    setPhotoSrc(student.photo ?? "/student.svg");
  }, [student.photo]);

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
    <header ref={scope} className="text-gray-900 font-sans selection:bg-blue-100 pb-12 sm:pb-16 pt-24 sm:pt-28 md:pt-[120px]">
      <div className="w-full max-w-[1600px] mx-auto relative px-4 sm:px-6 md:px-10 lg:px-16 xl:px-[100px]">
        
        {/* Certificate Card */}
        <div data-animate className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
          
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start p-6 sm:p-8 md:p-10 pb-6 md:pb-8 gap-4 sm:gap-6">
            <div className="flex items-start gap-4">
            
              <div>
                <h2 className="font-serif text-xl sm:text-2xl md:text-[28px] text-gray-900 leading-tight">
                  Viral Cat Academy
                </h2>
                <p className="font-mono text-[10px] md:text-[11px] font-bold tracking-[0.2em] text-gray-500 uppercase mt-1.5 sm:mt-2">
                  Grade Card · Industry Readiness Report
                </p>
              </div>
            </div>
            
            <div className="text-left sm:text-right flex flex-col gap-1 sm:gap-1.5">
              <p className="font-mono text-[10px] sm:text-[11px] md:text-xs text-gray-500 tracking-wider">
                Doc &bull; {student.docNo}
              </p>
              <p className="text-xs sm:text-sm md:text-[15px] text-gray-700 font-medium">
                Issued {student.issued}
              </p>
            </div>
          </div>

          {/* Divider */}
          <div className="h-px bg-gray-100 w-full"></div>

          {/* Body */}
          <div className="p-6 sm:p-8 md:p-12 md:pt-14">
            
            {/* Photo & Badge */}
            <div className="relative inline-block mb-8 sm:mb-10">
              <div className="w-28 h-28 sm:w-32 sm:h-32 md:w-[140px] md:h-[140px] rounded-3xl bg-gray-100 border border-gray-200 shadow-inner overflow-hidden relative flex items-center justify-center">
                <Image
                  src={photoSrc || "/student.svg"}
                  alt={`Portrait of ${student.name}`}
                  fill
                  sizes="(max-width: 768px) 128px, 140px"
                  className="object-cover opacity-90"
                  unoptimized={photoSrc?.endsWith(".svg") ?? true}
                  onError={() => setPhotoSrc("/student.svg")}
                />
              </div>
              <div className="absolute -bottom-3 -right-4 sm:-right-6 bg-white border border-gray-200 rounded-full px-2.5 sm:px-3 py-1 sm:py-1.5 flex items-center gap-1 sm:gap-1.5 shadow-sm">
                <BadgeCheck size={14} className="text-[#005bb5] shrink-0" />
                <span className="text-[#005bb5] text-[10px] sm:text-[11px] font-bold tracking-wide">Verified</span>
              </div>
            </div>

            {/* Student Name */}
            <div>
              <p className="font-mono text-[10px] sm:text-[11px] md:text-xs font-bold tracking-[0.2em] text-gray-500 uppercase">
                Student &middot; Batch {student.batch}
              </p>
              <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl lg:text-6xl text-gray-900 leading-tight tracking-tight mt-2 sm:mt-3 break-words">
                {student.name}
              </h1>
            </div>

            {/* Program Title */}
            <h2 className="text-[#005bb5] text-xl sm:text-2xl md:text-[28px] font-medium tracking-tight mt-6 sm:mt-8 md:mt-12">
              {student.program}
            </h2>

            {/* Meta row */}
            <div className="mt-4 sm:mt-5 flex flex-wrap items-center gap-4 sm:gap-6 text-xs sm:text-sm md:text-[15px] text-gray-600">
              <span className="font-mono text-gray-900 font-semibold tracking-widest uppercase text-xs md:text-sm">
                {student.id.startsWith("VC-") ? student.id : `VC-${student.id}`}
              </span>
              <div className="flex items-center gap-2">
                <Briefcase size={16} className="opacity-60 shrink-0" />
                <span>{student.program}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock size={16} className="opacity-60 shrink-0" />
                <span>{student.duration}</span>
              </div>
            </div>

            {/* Description */}
            <p className="mt-6 sm:mt-8 text-gray-600 leading-relaxed text-sm sm:text-[15px] md:text-[17px]">
              {student.summary}
            </p>

            {/* Stats Grid */}
            <div className="mt-8 sm:mt-10 md:mt-12 grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              {/* Card 1 */}
              <div className="border border-gray-200 rounded-2xl p-4 sm:p-5 md:p-6 shadow-[0_2px_8px_-4px_rgba(0,0,0,0.05)] flex flex-col justify-between min-h-[110px] md:h-[120px] bg-white">
                <div className="text-[10px] md:text-[11px] font-bold uppercase tracking-[0.2em] text-gray-500">
                  Overall Grade
                </div>
                <div className="font-serif text-2xl sm:text-3xl md:text-[40px] text-gray-900 flex items-start leading-none tracking-tight">
                  {student.overallGrade?.replace('+', '') || '—'}
                  {student.overallGrade?.includes('+') && <span className="text-base sm:text-lg md:text-[24px] mt-1">+</span>}
                  {student.overallGrade?.includes('-') && <span className="text-base sm:text-lg md:text-[24px] mt-1">-</span>}
                </div>
              </div>

              {/* Card 2 */}
              <div className="border border-gray-200 rounded-2xl p-4 sm:p-5 md:p-6 shadow-[0_2px_8px_-4px_rgba(0,0,0,0.05)] flex flex-col justify-between min-h-[110px] md:h-[120px] bg-white">
                <div className="text-[10px] md:text-[11px] font-bold uppercase tracking-[0.2em] text-gray-500">
                  Industry Readiness
                </div>
                <div className="font-serif text-2xl sm:text-3xl md:text-[40px] text-gray-900 leading-none tracking-tight">
                  {student.readiness}%
                </div>
              </div>

              {/* Card 3 */}
              <div className="border border-gray-200 rounded-2xl p-4 sm:p-5 md:p-6 shadow-[0_2px_8px_-4px_rgba(0,0,0,0.05)] flex flex-col justify-between min-h-[110px] md:h-[120px] bg-white">
                  <div className="flex items-center gap-1.5 text-[10px] md:text-[11px] font-bold uppercase tracking-[0.2em] text-gray-500">
                    <BadgeCheck size={14} className="text-green-600 shrink-0" />
                    Status
                  </div>
                <div className="font-serif text-lg sm:text-2xl md:text-[34px] text-gray-900 tracking-tight leading-none whitespace-nowrap overflow-hidden text-ellipsis capitalize">
                  {student.status?.replace('_', ' ') || '—'}
                </div>
              </div>

              {/* Card 4 */}
              <div className="border border-gray-200 rounded-2xl p-4 sm:p-5 md:p-6 shadow-[0_2px_8px_-4px_rgba(0,0,0,0.05)] flex flex-col justify-between min-h-[110px] md:h-[120px] bg-white">
                <div className="text-[10px] md:text-[11px] font-bold uppercase tracking-[0.2em] text-gray-500">
                  Cohort
                </div>
                <div className="font-serif text-lg sm:text-2xl md:text-[34px] text-gray-900 tracking-tight leading-none whitespace-nowrap overflow-hidden text-ellipsis">
                  {student.batch || '—'}
                </div>
              </div>
            </div>

            {/* Certificate QR Section */}
            <div className="mt-12 sm:mt-16 md:mt-20 flex flex-col items-center pb-6 sm:pb-10">
              {student.certificatePdf ? (
                <>
                  {/* QR Code pointing to certificate PDF */}
                  <div className="w-[120px] h-[120px] sm:w-[140px] sm:h-[140px] bg-white mb-4 sm:mb-6 flex items-center justify-center p-2 relative overflow-hidden group transition-colors">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=140x140&margin=0&data=${encodeURIComponent(student.certificatePdf)}`}
                      alt="Certificate QR Code"
                      className="w-full h-full object-contain relative z-10 transition-transform"
                    />
                    <div className="absolute inset-0 bg-[linear-gradient(to_right,#f0f0f0_1px,transparent_1px),linear-gradient(to_bottom,#f0f0f0_1px,transparent_1px)] bg-[size:10px_10px] z-0 opacity-50"></div>
                  </div>

                  {/* Scan label */}
                  <div className="flex items-center gap-1.5 text-gray-500 text-[10px] sm:text-[11px] font-mono tracking-widest uppercase mb-3">
                    <QrCode size={12} className="shrink-0" />
                    Scan to view certificate
                  </div>

                  {/* Action links */}
                  <div className="flex items-center gap-4 mt-1">
                    <a
                      href={student.certificatePdf}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-[#005bb5] hover:text-blue-800 transition-colors font-semibold text-sm sm:text-[15px]"
                    >
                      <Eye size={16} className="shrink-0" />
                      View
                    </a>
                    <a
                      href={student.certificatePdf}
                      target="_blank"
                      rel="noopener noreferrer"
                      download
                      className="flex items-center gap-1.5 text-[#005bb5] hover:text-blue-800 transition-colors font-semibold text-sm sm:text-[15px]"
                    >
                      <Download size={16} className="shrink-0" />
                      Download
                    </a>
                  </div>
                </>
              ) : (
                <div className="text-gray-400 font-medium text-sm sm:text-[15px]">
                  Certificate not yet uploaded
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </header>
  );
}