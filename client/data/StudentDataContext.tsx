"use client";

// ─────────────────────────────────────────────────────────────
// Drop-in replacement for the static `data/student.ts` import.
// Every grade-card component now reads from useStudentData()
// instead of importing static objects, so the page renders
// whatever the assigned faculty / superadmin has actually filled
// in on the student's ProgressReport.gradeCard — no component
// markup, classNames, or animations were changed.
// ─────────────────────────────────────────────────────────────

import { createContext, useContext, type ReactNode } from "react";
import { API_URL } from "../lib/api";

export interface SkillScore {
  label: string;
  score: number;
  grade: string;
}

export interface PortfolioItem {
  title: string;
  role: string;
  tools: string[];
  result: string;
  link?: string;
}

export interface StudentData {
  student: {
    _id: string;
    name: string;
    program: string;
    duration: string;
    batch: string;
    id: string;
    /**
     * Server-generated program code (VC-260001, VC-260002, …) taken straight
     * from gradeCard.program.code. Empty string for older records created
     * before auto-generation existed — consumers should fall back to `id`.
     */
    programCode: string;
    docNo: string;
    issued: string;
    overallGrade: string;
    readiness: number;
    status: string;
    verifyUrl: string;
    summary: string;
    photo?: string | null;
    certificatePdf?: string | null;
  };
  evaluation: SkillScore[];
  readinessBars: { label: string; value: number }[];
  experience: {
    role: string;
    organization: string;
    durationLabel: string;
    hours: number | null;
    stats: { value: number; suffix: string; label: string }[];
  };
  verifiedSkills: { label: string; score: number }[];
  portfolio: PortfolioItem[];
  achievements: string[];
  mentorRatings: { label: string; stars: number }[];
  mentorRemark: { quote: string; roles: string[]; by: string };
  interviewReadiness: { label: string; value: number }[];
}

const StudentDataContext = createContext<StudentData | undefined>(undefined);

export function StudentDataProvider({ data, children }: { data: StudentData; children: ReactNode }) {
  return <StudentDataContext.Provider value={data}>{children}</StudentDataContext.Provider>;
}

export function useStudentData(): StudentData {
  const ctx = useContext(StudentDataContext);
  if (!ctx) throw new Error("useStudentData must be used within a StudentDataProvider");
  return ctx;
}

/** Returns false when the faculty hasn't filled in any evaluation yet. */
export function hasGradeCardData(data: StudentData): boolean {
  return (
    data.evaluation.length > 0 ||
    data.readinessBars.some((b) => b.value > 0) ||
    data.student.overallGrade !== "—" ||
    data.student.program !== ""
  );
}

// ── mapping helpers ─────────────────────────────────────────

const STATUS_LABEL: Record<string, string> = {
  not_ready: "In Training",
  in_training: "In Training",
  job_ready: "Job Ready",
  placed: "Placed",
};

// Base host the verification slug is appended to. Change this if the
// academy's real verification domain differs.
const VERIFY_BASE = "viralcat.academy/verify";

/** URL-safe slug: lowercase, non-alphanumerics collapsed to single hyphens, trimmed. */
function slugify(str: string): string {
  return String(str || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Combines the student's name and verification code into one slug, e.g. "jishnu-mindstory-vc-240001". */
function buildVerifySlug(name: string, code: string): string {
  const namePart = slugify(name);
  const codePart = slugify(code);
  return [namePart, codePart].filter(Boolean).join("-");
}

function parseStat(raw: unknown): { value: number; suffix: string } {
  const match = String(raw ?? "").trim().match(/^(-?\d+(?:\.\d+)?)(.*)$/);
  if (!match) return { value: 0, suffix: "" };
  return { value: Number(match[1]), suffix: match[2] };
}

function formatDate(d?: string | null) {
  if (!d) return "";
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return String(d);
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });
}

function resolveImage(path?: string | null) {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  return `${API_URL}${path}`;
}

/**
 * Maps { user, report } from GET /api/student/progress-report (or the
 * faculty/superadmin equivalents) into the exact shape the components
 * previously read from data/student.ts.
 */
export function mapReportToStudentData(user: any, report: any): StudentData {
  const gc = report?.gradeCard || {};
  const program = gc.program || {};
  const verification = gc.verification || {};
  const readinessBreakdown = gc.readinessBreakdown || {};
  const experience = gc.experience || {};
  const mentorEvaluation = gc.mentorEvaluation || {};
  const mentorRemarks = gc.mentorRemarks || {};
  const interviewReadiness = gc.interviewReadiness || {};

  const studentId = user?._id || user?.id || report?.student?._id || report?.student?.id || (typeof report?.student === 'string' ? report.student : "") || "";

  let verifyUrl = verification.verifyUrl || "";
  if (typeof window !== "undefined" && studentId) {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
    verifyUrl = `${baseUrl}/student-progress-card/${studentId}`;
  }

  return {
    student: {
      _id: user?._id || user?.id || report?.student?._id || report?.student?.id || (typeof report?.student === 'string' ? report.student : "") || "",
      name: user?.name || "",
      program: program.name || "",
      duration: program.durationLabel || "",
      batch: program.batch || "",
      id: verification.verificationCode || program.code || user?.studentInfo?.rollNumber || "",
      // Auto-generated by the server on first grade-card save; never edited client-side.
      programCode: (program.code || "").trim(),
      docNo: verification.docId || "",
      issued: formatDate(verification.issuedDate),
      overallGrade: gc.overallGrade || "—",
      readiness: gc.industryReadiness ?? 0,
      status: STATUS_LABEL[gc.placementStatus as string] || "In Training",
      verifyUrl,
      summary: program.summary || "",
      photo: resolveImage(user?.profileImage),
      certificatePdf: resolveImage(report?.certificatePdf),
    },
    evaluation: (gc.skillScores || []).map((s: any) => ({
      label: s.skillName,
      score: s.score ?? 0,
      grade: s.grade || "—",
    })),
    readinessBars: [
      { label: "Technical Skills", value: readinessBreakdown.technicalSkills ?? 0 },
      { label: "Client Readiness", value: readinessBreakdown.clientReadiness ?? 0 },
      { label: "Communication", value: readinessBreakdown.communication ?? 0 },
      { label: "Portfolio Depth", value: readinessBreakdown.portfolioDepth ?? 0 },
    ],
    experience: {
      role: experience.role || "",
      organization: experience.organization || "",
      durationLabel: experience.durationLabel || "",
      hours: experience.hours ?? null,
      stats: (experience.stats || []).map((s: any) => ({
        label: s.label,
        ...parseStat(s.value),
      })),
    },
    verifiedSkills: (gc.verifiedSkills || []).map((s: any) => ({
      label: s.skillName,
      score: s.score ?? 0,
    })),
    portfolio: (gc.portfolioHighlights || []).map((p: any) => ({
      title: p.title,
      role: p.role || "",
      tools: p.tools || [],
      result: p.result || "",
      link: p.link || "",
    })),
    achievements: gc.achievements || [],
    mentorRatings: (mentorEvaluation.ratings || []).map((r: any) => ({
      label: r.criteria,
      stars: r.score,
    })),
    mentorRemark: {
      quote: mentorRemarks.text || "",
      roles: [],
      by: [mentorRemarks.mentorName, mentorRemarks.mentorTitle].filter(Boolean).join(" · "),
    },
    interviewReadiness: [
      { label: "Resume Quality", value: interviewReadiness.resumeQuality ?? 0 },
      { label: "Portfolio Quality", value: interviewReadiness.portfolioQuality ?? 0 },
      { label: "Communication", value: interviewReadiness.communication ?? 0 },
      { label: "Presentation & Confidence", value: interviewReadiness.presentationConfidence ?? 0 },
    ],
  };
}