"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../contexts/AuthContext";

export default function LandingPage() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) router.replace("/dashboard");
  }, [loading, user, router]);

  const handleLogout = async () => {
    await logout();
    router.replace("/login");
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-ink px-6 py-16 text-paper">
      {/* faint grid texture, matching Hero */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            "linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)",
          backgroundSize: "56px 56px",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-40 top-1/4 h-[480px] w-[480px] rounded-full bg-gold/10 blur-[140px]"
      />

      {/* logout — pinned to the top-left corner, only shown while a session exists */}
      {!loading && user && (
        <button
          type="button"
          onClick={handleLogout}
          className="absolute left-6 top-6 z-10 rounded-full border border-paper/25 bg-ink/70 px-4 py-1.5 font-mono text-[11px] uppercase tracking-[0.22em] text-paper/70 backdrop-blur transition hover:border-gold hover:text-gold"
        >
          Log out
        </button>
      )}

      <div className="relative mx-auto w-full max-w-3xl text-center">
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-gold">Viral Cat Academy</p>
        <h1 className="mt-3 font-display text-5xl font-semibold tracking-tight md:text-6xl">
          Student Portal
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-paper/60">
          Access your verified grade card and progress report, or apply to join the next batch.
        </p>

        <div className="mt-12 grid gap-5 sm:grid-cols-2">
          <Link
            href="/login"
            className="group rounded-2xl border border-paper/15 bg-[#1b2231]/60 p-8 text-left transition-colors hover:border-gold/50"
          >
            <span className="rounded-full bg-mint px-4 py-1.5 font-mono text-[10px] font-medium uppercase tracking-widest text-ink">
              Existing Student
            </span>
            <h2 className="mt-5 font-display text-2xl font-medium">Log in</h2>
            <p className="mt-2 text-sm text-paper/55">
              Already enrolled? Sign in with your email and password to view your progress report.
            </p>
            <span className="mt-6 inline-block font-mono text-xs uppercase tracking-widest text-gold group-hover:underline">
              Continue →
            </span>
          </Link>

          <Link
            href="/register"
            className="group rounded-2xl border border-paper/15 bg-[#1b2231]/60 p-8 text-left transition-colors hover:border-gold/50"
          >
            <span className="rounded-full border border-paper/25 px-4 py-1.5 font-mono text-[10px] uppercase tracking-widest text-paper/70">
              New Student
            </span>
            <h2 className="mt-5 font-display text-2xl font-medium">Apply now</h2>
            <p className="mt-2 text-sm text-paper/55">
              Submit your registration and documents. A SuperAdmin will review and approve your account.
            </p>
            <span className="mt-6 inline-block font-mono text-xs uppercase tracking-widest text-gold group-hover:underline">
              Get started →
            </span>
          </Link>
        </div>
      </div>
    </main>
  );
}