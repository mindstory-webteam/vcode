"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../contexts/AuthContext";
import { api, ApiError } from "../../lib/api";
import {
  StudentDataProvider,
  mapReportToStudentData,
  hasGradeCardData,
  type StudentData,
} from "../../data/StudentDataContext";

import Hero from "../../components/Hero";
import Evaluation from "../../components/Evaluation";
import ReadinessBars from "../../components/ReadinessBars";
import RadarChart from "../../components/RadarChart";
import Experience from "../../components/Experience";
import Skills from "../../components/Skills";
import Portfolio from "../../components/Portfolio";
import Achievements from "../../components/Achievements";
import Mentor from "../../components/Mentor";
import Verification from "../../components/Verification";

export default function DashboardPage() {
  const { user, loading: authLoading, logout } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<StudentData | null>(null);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      router.replace("/login?redirect=/dashboard");
      return;
    }

    if (user.role !== "student") {
      setFetching(false);
      return;
    }

    (async () => {
      try {
        const res = await api.get("/api/student/progress-report");
        setData(mapReportToStudentData(user, res.report));
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Failed to load progress report");
      } finally {
        setFetching(false);
      }
    })();
  }, [authLoading, user, router]);

  if (authLoading || fetching) {
    return <CenteredMessage title="Loading your grade card…" />;
  }

  if (!user) return null;

  if (user.role !== "student") {
    return (
      <CenteredMessage
        title="This portal is for students"
        subtitle={`You're signed in as ${user.role}. Please use your own portal to manage students.`}
        action={{ label: "Log out", onClick: logout }}
      />
    );
  }

  if (error) {
    return (
      <CenteredMessage
        title="Couldn't load your progress report"
        subtitle={error}
        action={{ label: "Log out", onClick: logout }}
      />
    );
  }

  if (!data || !hasGradeCardData(data)) {
    return (
      <CenteredMessage
        title="Your grade card isn't ready yet"
        subtitle="Your mentor hasn't published your evaluation yet. Check back soon."
        action={{ label: "Log out", onClick: logout }}
      />
    );
  }

  return (
    <StudentDataProvider data={data}>
      <main>
        <Hero />
        <Evaluation />
        <ReadinessBars />
        <RadarChart />
        <Experience />
        <Skills />
        <Portfolio />
        <Achievements />
        <Mentor />
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
