"use client";

import { Suspense, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "../../contexts/AuthContext";
import { ApiError } from "../../lib/api";

function LoginForm() {
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
    <main className="flex min-h-screen items-center justify-center bg-ink px-6 py-16 text-paper">
      <div className="w-full max-w-md">
        <p className="text-center font-mono text-xs uppercase tracking-[0.3em] text-gold">
          Viral Cat Academy
        </p>
        <h1 className="mt-3 text-center font-display text-3xl font-medium">Student Login</h1>
        <p className="mt-2 text-center text-sm text-paper/55">
          Sign in to view your grade card and progress report.
        </p>

        <form
          onSubmit={handleSubmit}
          className="mt-10 space-y-5 rounded-2xl border border-paper/15 bg-[#1b2231]/60 p-8"
        >
          <Field label="Email" type="email" value={email} onChange={setEmail} required autoComplete="email" />
          <Field
            label="Password"
            type="password"
            value={password}
            onChange={setPassword}
            required
            autoComplete="current-password"
          />

          {error && (
            <p className="rounded-lg bg-[#b8402e]/10 px-3 py-2 text-sm text-[#e6836f]">{error}</p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-full bg-mint px-5 py-3 font-mono text-xs font-medium uppercase tracking-widest text-ink transition-opacity disabled:opacity-50"
          >
            {submitting ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-paper/50">
          New here?{" "}
          <Link href="/register" className="text-gold hover:underline">
            Apply for admission
          </Link>
        </p>
        <p className="mt-2 text-center text-sm text-paper/50">
          <Link href="/" className="text-paper/40 hover:text-paper/70 hover:underline">
            ← Back
          </Link>
        </p>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-ink text-paper/50">
          Loading…
        </main>
      }
    >
      <LoginForm />
    </Suspense>
  );
}

function Field({
  label,
  type,
  value,
  onChange,
  required,
  autoComplete,
}: {
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  autoComplete?: string;
}) {
  return (
    <label className="block">
      <span className="font-mono text-[11px] uppercase tracking-widest text-paper/60">{label}</span>
      <input
        type={type}
        value={value}
        required={required}
        autoComplete={autoComplete}
        onChange={(e) => onChange(e.target.value)}
        className="mt-2 w-full rounded-lg border border-paper/20 bg-ink/60 px-4 py-2.5 text-sm text-paper placeholder:text-paper/30 focus:border-gold focus:outline-none"
      />
    </label>
  );
}