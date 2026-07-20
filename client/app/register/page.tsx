"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { api, ApiError } from "../../lib/api";

const initialForm = {
  name: "",
  email: "",
  password: "",
  phone: "",
  rollNumber: "",
  department: "",
  course: "",
  semester: "",
};

type FormState = typeof initialForm;

export default function RegisterPage() {
  const [form, setForm] = useState<FormState>(initialForm);
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState<{ email: string; status: string } | null>(null);

  function update<K extends keyof FormState>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      if (file) fd.append("profileImage", file);
      const res = await api.postForm("/api/auth/register-student", fd);
      setSubmitted({ email: res.application.email, status: res.application.status });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Registration failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return <PendingStatus email={submitted.email} initialStatus={submitted.status} />;
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-ink px-6 py-16 text-paper">
      <div className="w-full max-w-2xl">
        <p className="text-center font-mono text-xs uppercase tracking-[0.3em] text-gold">
          Viral Cat Academy
        </p>
        <h1 className="mt-3 text-center font-display text-3xl font-medium">Student Registration</h1>
        <p className="mt-2 text-center text-sm text-paper/55">
          Fill in your details and submit for SuperAdmin approval.
        </p>

        <form
          onSubmit={handleSubmit}
          className="mt-10 space-y-6 rounded-2xl border border-paper/15 bg-[#1b2231]/60 p-8"
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Full name" value={form.name} onChange={(v) => update("name", v)} required />
            <Field
              label="Email"
              type="email"
              value={form.email}
              onChange={(v) => update("email", v)}
              required
            />
            <Field
              label="Password"
              type="password"
              value={form.password}
              onChange={(v) => update("password", v)}
              required
            />
            <Field label="Phone" value={form.phone} onChange={(v) => update("phone", v)} />
            <Field
              label="Roll number"
              value={form.rollNumber}
              onChange={(v) => update("rollNumber", v)}
            />
            <Field
              label="Department"
              value={form.department}
              onChange={(v) => update("department", v)}
            />
            <Field label="Course" value={form.course} onChange={(v) => update("course", v)} />
            <Field label="Semester" value={form.semester} onChange={(v) => update("semester", v)} />
          </div>

          <label className="block">
            <span className="font-mono text-[11px] uppercase tracking-widest text-paper/60">
              Profile photo / document
            </span>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="mt-2 w-full rounded-lg border border-dashed border-paper/25 bg-ink/60 px-4 py-3 text-sm text-paper/70 file:mr-4 file:rounded-full file:border-0 file:bg-mint file:px-4 file:py-1.5 file:font-mono file:text-[11px] file:uppercase file:tracking-widest file:text-ink"
            />
          </label>

          {error && (
            <p className="rounded-lg bg-[#b8402e]/10 px-3 py-2 text-sm text-[#e6836f]">{error}</p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-full bg-mint px-5 py-3 font-mono text-xs font-medium uppercase tracking-widest text-ink transition-opacity disabled:opacity-50"
          >
            {submitting ? "Submitting…" : "Submit application"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-paper/50">
          Already approved?{" "}
          <Link href="/login" className="text-gold hover:underline">
            Log in
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

function Field({
  label,
  type = "text",
  value,
  onChange,
  required,
}: {
  label: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="font-mono text-[11px] uppercase tracking-widest text-paper/60">{label}</span>
      <input
        type={type}
        value={value}
        required={required}
        onChange={(e) => onChange(e.target.value)}
        className="mt-2 w-full rounded-lg border border-paper/20 bg-ink/60 px-4 py-2.5 text-sm text-paper placeholder:text-paper/30 focus:border-gold focus:outline-none"
      />
    </label>
  );
}

function PendingStatus({ email, initialStatus }: { email: string; initialStatus: string }) {
  const [status, setStatus] = useState(initialStatus);
  const [checking, setChecking] = useState(false);
  const [reason, setReason] = useState<string | null>(null);

  async function checkStatus() {
    setChecking(true);
    try {
      const res = await api.get(`/api/auth/application-status/${encodeURIComponent(email)}`);
      setStatus(res.status);
      setReason(res.rejectionReason || null);
    } catch {
      // ignore — keep last known status
    } finally {
      setChecking(false);
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-ink px-6 text-center text-paper">
      <p className="font-mono text-xs uppercase tracking-[0.3em] text-gold">Viral Cat Academy</p>
      <h1 className="font-display text-3xl font-medium">Application submitted</h1>
      <p className="max-w-md text-sm text-paper/60">
        Thanks! Your registration for <span className="text-paper">{email}</span> is now{" "}
        <span className="font-mono uppercase text-gold">{status}</span>. A SuperAdmin will review it
        shortly.
      </p>
      {reason && <p className="max-w-md text-sm text-[#e6836f]">Reason: {reason}</p>}

      <div className="mt-2 flex gap-3">
        <button
          onClick={checkStatus}
          disabled={checking}
          className="rounded-full border border-paper/25 px-5 py-2 font-mono text-xs uppercase tracking-widest text-paper/80 hover:border-gold hover:text-gold disabled:opacity-50"
        >
          {checking ? "Checking…" : "Check status"}
        </button>
        <Link
          href="/login"
          className="rounded-full bg-mint px-5 py-2 font-mono text-xs font-medium uppercase tracking-widest text-ink"
        >
          Go to login
        </Link>
      </div>
    </main>
  );
}
