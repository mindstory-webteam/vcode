"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "../contexts/AuthContext";
import { ApiError } from "../lib/api";
import VcaCat from "../components/VcaCat";


export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
      router.replace(params.get("redirect") || "/dashboard");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen">
      {/* ── LEFT PANEL — purple cat ── */}
      <div
        className="relative hidden w-[38%] flex-col items-center justify-center overflow-hidden lg:flex"
        style={{ background: "linear-gradient(160deg, #6b2d72 0%, #853a8c 50%, #5a2460 100%)" }}
      >
        {/* radial glow */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: "radial-gradient(ellipse at 50% 50%, rgba(255,255,255,0.08) 0%, transparent 65%)" }}
        />
        {/* cat + tagline — perfectly centred */}
        <div className="relative z-10 flex flex-col items-center gap-10 px-10">
          <VcaCat />
          <p className="text-center text-sm font-medium leading-relaxed text-white/65">
            Your academic journey,<br />all in one place.
          </p>
        </div>
        {/* footer pinned to bottom */}
        <div className="absolute bottom-6 z-10 flex gap-5 text-[11px] text-white">
          <span>About</span>
          <span>Privacy</span>
          <span>Terms of Use</span>
        </div>
      </div>

      {/* ── RIGHT PANEL — form ── */}
      <div className="flex flex-1 flex-col items-center justify-center bg-white px-8 py-16">
        <div className="w-full max-w-sm">
          <h1 className="text-3xl font-light leading-snug text-gray-700">
            Login to your<br />
            <span className="font-semibold text-gray-800">student dashboard</span>
          </h1>

          <form onSubmit={handleSubmit} className="mt-10 space-y-4">
            <input
              type="email"
              placeholder="EMAIL"
              value={email}
              required
              autoComplete="email"
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded border border-gray-300 px-4 py-3 text-sm tracking-wide text-gray-700 placeholder:text-[11px] placeholder:font-semibold placeholder:tracking-[0.2em] placeholder:text-gray-400 focus:border-[#853a8c] focus:outline-none focus:ring-1 focus:ring-[#853a8c]/30 transition"
            />
            <input
              type="password"
              placeholder="PASSWORD"
              value={password}
              required
              autoComplete="current-password"
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded border border-gray-300 px-4 py-3 text-sm tracking-wide text-gray-700 placeholder:text-[11px] placeholder:font-semibold placeholder:tracking-[0.2em] placeholder:text-gray-400 focus:border-[#853a8c] focus:outline-none focus:ring-1 focus:ring-[#853a8c]/30 transition"
            />

            {error && (
              <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-500">{error}</p>
            )}

            <div className="flex items-center gap-5 pt-1">
              <button
                type="submit"
                disabled={submitting}
                className="rounded px-8 py-2.5 text-sm font-bold uppercase tracking-widest text-white transition-opacity disabled:opacity-60"
                style={{ background: "#853a8c" }}
              >
                {submitting ? "Signing in…" : "Login"}
              </button>
              <Link
                href="/register"
                className="text-sm text-gray-400 transition-colors"
              >
                Don&apos;t have an account? <span className="underline hover:text-[#853a8c] ">Register</span>
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
