"use client";

import { useStudentData } from "../data/StudentDataContext";
import Reveal from "./Reveal";
import { BadgeCheck, Briefcase, Download, Eye, QrCode } from "lucide-react";

/* ── Certificate footer ───────────────────────────────────────── */
export default function Verification() {
  const { student } = useStudentData();

  return (
    <>
      {/* Verification footer — physical certificate */}
      <footer className="pb-16 sm:pb-20 text-gray-900">
        <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 md:px-10 lg:px-16 xl:px-[100px]">

          <Reveal>
            <div
              data-certificate
              className="relative overflow-hidden rounded-3xl bg-white border border-gray-200 text-gray-900 shadow-sm"
            >
              <div className="grid gap-6 sm:gap-8 md:gap-10 p-6 sm:p-8 md:p-12 grid-cols-1 md:grid-cols-3 items-center">

                {/* ── LEFT · Mentor Signature ── */}
                <div className="flex flex-col items-center md:items-start justify-end pt-6 md:pt-24 text-center md:text-left">
                  <div className="w-full max-w-xs flex flex-col items-center md:items-start">
                    <img 
                      src="/imgs/digital-sign.png" 
                      alt="Mentor Signature" 
                      className="h-44 w-auto object-contain -my-12 mix-blend-multiply animate-in fade-in duration-500" 
                    />
                    <div className="w-full pt-2">
                      <p className="font-bold text-gray-900">Mentor Signature</p>
                      <p className="mt-0.5 text-xs sm:text-sm text-gray-500">Head of Digital Marketing · VCA</p>
                    </div>
                  </div>
                </div>

                {/* ── CENTER · Academy Seal ── */}
                <div className="flex flex-col items-center justify-end text-center pt-6 md:pt-24">
                  <div className="w-full max-w-xs">
                    <div className="mt-2 pt-3">
                      <p className="font-bold text-gray-900">Academy Seal</p>
                      <p className="text-xs sm:text-sm text-gray-500">Official mark of authenticity</p>
                      <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-gray-400 font-semibold mt-1">
                        Doc {student.docNo}
                      </p>
                    </div>
                  </div>
                </div>

                {/* ── RIGHT · Certificate QR or Verify QR ── */}
                <div className="flex flex-col items-center text-center justify-center pt-6 md:pt-0">
                  {student.certificatePdf ? (
                    <>
                      {/* QR pointing to certificate PDF */}
                      <div className="w-[120px] h-[120px] sm:w-[140px] sm:h-[140px] bg-white mb-4 sm:mb-6 flex items-center justify-center p-2 relative overflow-hidden  group transition-colors">
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

              {/* bottom strip */}
              <div className="border-t border-gray-200 bg-gray-50 px-4 sm:px-8 py-3 sm:py-4 text-center md:text-left">
                <p className="font-mono text-[9px] sm:text-[10px] uppercase tracking-[0.2em] sm:tracking-[0.3em] text-gray-400 font-semibold break-words">
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