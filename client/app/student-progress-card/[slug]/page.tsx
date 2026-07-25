"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { io } from "socket.io-client";
import { useAuth } from "../../../contexts/AuthContext";
import { api, ApiError } from "../../../lib/api";
import {
  StudentDataProvider,
  mapReportToStudentData,
  hasGradeCardData,
  type StudentData,
} from "../../../data/StudentDataContext";

import Hero from "../../../components/Hero";
import Evaluation from "../../../components/Evaluation";
import ReadinessBars from "../../../components/ReadinessBars";
import RadarChart from "../../../components/RadarChart";
import SkillScores from "../../../components/SkillScores";
import Experience from "../../../components/Experience";
import Skills from "../../../components/Skills";
import Portfolio from "../../../components/Portfolio";
import Achievements from "../../../components/Achievements";
import Mentor from "../../../components/Mentor";
import InterviewReadiness from "../../../components/InterviewReadiness";
import Verification from "../../../components/Verification";

export default function DashboardPage({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = use(params);
  const { user, loading: authLoading, logout } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<StudentData | null>(null);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get(`/api/public/verify/${resolvedParams.slug}`);
        const studentData = mapReportToStudentData(res.user, res.report);
        setData(studentData);

        // Silently correct the URL if they landed here via a fallback (like rollNumber)
        if (typeof window !== "undefined" && studentData.student.verifyUrl) {
          try {
            const expectedPath = new URL(studentData.student.verifyUrl).pathname;
            if (window.location.pathname !== expectedPath) {
              window.history.replaceState(null, "", expectedPath);
            }
          } catch (e) {
            // Ignore URL parsing errors
          }
        }
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Failed to load progress report");
      } finally {
        setFetching(false);
      }
    })();
  }, [resolvedParams.slug, router, refreshTrigger]);

  useEffect(() => {
    if (!data?.student?._id) return;

    const socketUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
    const socket = io(socketUrl, {
      transports: ["websocket", "polling"],
      reconnection: true,
    });

    socket.emit("join_progress_report_room", data.student._id);

    socket.on("progress_report_updated", () => {
      setRefreshTrigger((prev) => prev + 1);
    });

    return () => {
      socket.disconnect();
    };
  }, [data?.student?._id]);

  if (fetching) {
    return <CenteredMessage title="Loading your grade card…" />;
  }

  if (error) {
    return (
      <CenteredMessage
        title="Couldn't load your progress report"
        subtitle={error}
        action={user ? { label: "Log out", onClick: logout } : undefined}
      />
    );
  }

  if (!data || !hasGradeCardData(data)) {
    return (
      <CenteredMessage
        title="Your grade card isn't ready yet"
        subtitle="Your mentor hasn't published your evaluation yet. Check back soon."
        action={user ? { label: "Log out", onClick: logout } : undefined}
      />
    );
  }

  return (
    <StudentDataProvider data={data}>
      <main className=" text-gray-900 min-h-screen">
        <Hero />
        <Evaluation />
        <ReadinessBars />
        <RadarChart />
        <SkillScores />
        <Experience />
        <Skills />
        <Portfolio />
        <Achievements />
        <Mentor />
        <InterviewReadiness />
        <Verification />
      </main>
    </StudentDataProvider>
  );
}

function CenteredMessage({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-ink px-6 text-center text-paper">
      <h1 className="font-display text-2xl font-medium">{title}</h1>
      {subtitle && <p className="max-w-md text-sm text-paper/60">{subtitle}</p>}
      {action && (
        <button
          onClick={action.onClick}
          className="mt-2 rounded-full border border-paper/25 px-5 py-2 font-mono text-xs uppercase tracking-widest text-paper/80 hover:border-gold hover:text-gold"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
