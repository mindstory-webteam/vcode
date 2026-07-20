"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { api, ApiError } from "../../lib/api";
import VcaCat from "../../components/VcaCat";

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
    <div className="flex min-h-screen">
      {/* ── LEFT PANEL — purple cat ── */}
      <div
        className="relative hidden w-[38%] flex-col items-center justify-center overflow-hidden lg:flex"
        style={{ background: "linear-gradient(160deg, #6b2d72 0%, #853a8c 50%, #5a2460 100%)" }}
      >
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: "radial-gradient(ellipse at 50% 50%, rgba(255,255,255,0.08) 0%, transparent 65%)" }}
        />
        <div className="relative z-10 flex flex-col items-center gap-10 px-10">
          <VcaCat />
          <p className="text-center text-sm font-medium leading-relaxed text-white/65">
            Your academic journey,<br />all in one place.
          </p>
        </div>
        <div className="absolute bottom-6 z-10 flex gap-5 text-[11px] text-white">
          <span>About</span>
          <span>Privacy</span>
          <span>Terms of Use</span>
        </div>
      </div>

      {/* ── RIGHT PANEL — form ── */}
      <div className="flex flex-1 flex-col items-center justify-center bg-white px-8 py-16">
        <div className="w-full max-w-xl">
          <h1 className="text-3xl font-light leading-snug text-gray-700">
            Student <span className="font-semibold text-gray-800">Registration</span>
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            Fill in your details and submit for SuperAdmin approval.
          </p>

          <form onSubmit={handleSubmit} className="mt-10 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Full name" value={form.name} onChange={(v) => update("name", v)} required />
              <Field label="Email" type="email" value={form.email} onChange={(v) => update("email", v)} required />
              <Field label="Password" type="password" value={form.password} onChange={(v) => update("password", v)} required />
              <Field label="Phone" value={form.phone} onChange={(v) => update("phone", v)} />
              <Field label="Roll number" value={form.rollNumber} onChange={(v) => update("rollNumber", v)} />
              <Field label="Department" value={form.department} onChange={(v) => update("department", v)} />
              <Field label="Course" value={form.course} onChange={(v) => update("course", v)} />
              <Field label="Semester" value={form.semester} onChange={(v) => update("semester", v)} />
            </div>

            <div className="relative pt-2">
              <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.2em] text-gray-400">
                Profile photo / document
              </span>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="w-full rounded border border-gray-300 bg-white px-4 py-3 text-sm tracking-wide text-gray-700 file:mr-4 file:cursor-pointer file:rounded file:border-0 file:bg-[#853a8c] file:px-4 file:py-1.5 file:font-semibold file:text-[11px] file:uppercase file:tracking-[0.2em] file:text-white hover:file:bg-[#6b2d72] focus:border-[#853a8c] focus:outline-none focus:ring-1 focus:ring-[#853a8c]/30 transition"
              />
            </div>

            {error && (
              <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-500">{error}</p>
            )}

            <div className="flex flex-col sm:flex-row sm:items-center gap-5 pt-6">
              <button
                type="submit"
                disabled={submitting}
                className="rounded px-8 py-2.5 text-sm font-bold uppercase tracking-widest text-white transition-opacity disabled:opacity-60"
                style={{ background: "#853a8c" }}
              >
                {submitting ? "Registering…" : "Register"}
              </button>
              <Link href="/" className="text-sm text-gray-400 transition-colors ">
                Already have an account? <span className="underline hover:text-[#853a8c]">Log in</span>
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
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
    <div className="relative">
      <input
        type={type}
        placeholder={label.toUpperCase()}
        value={value}
        required={required}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded border border-gray-300 px-4 py-3 text-sm tracking-wide text-gray-700 placeholder:text-[11px] placeholder:font-semibold placeholder:tracking-[0.2em] placeholder:text-gray-400 focus:border-[#853a8c] focus:outline-none focus:ring-1 focus:ring-[#853a8c]/30 transition"
      />
    </div>
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
    <div className="flex min-h-screen">
      {/* ── LEFT PANEL — purple cat ── */}
      <div
        className="relative hidden w-[38%] flex-col items-center justify-center overflow-hidden lg:flex"
        style={{ background: "linear-gradient(160deg, #6b2d72 0%, #853a8c 50%, #5a2460 100%)" }}
      >
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: "radial-gradient(ellipse at 50% 50%, rgba(255,255,255,0.08) 0%, transparent 65%)" }}
        />
        <div className="relative z-10 flex flex-col items-center gap-10 px-10">
          <VcaCat />
          <p className="text-center text-sm font-medium leading-relaxed text-white/65">
            Your academic journey,<br />all in one place.
          </p>
        </div>
        <div className="absolute bottom-6 z-10 flex gap-5 text-[11px] text-white">
          <span>About</span>
          <span>Privacy</span>
          <span>Terms of Use</span>
        </div>
      </div>

      {/* ── RIGHT PANEL — status ── */}
      <div className="flex flex-1 flex-col items-center justify-center bg-white px-8 py-16">
        <div className="w-full max-w-md text-center">
          <h1 className="text-3xl font-light leading-snug text-gray-700">
            Application <span className="font-semibold text-gray-800">submitted</span>
          </h1>
          <p className="mt-6 text-sm text-gray-500 leading-relaxed">
            Thanks! Your registration for <span className="font-medium text-gray-700">{email}</span> is now{" "}
            <span className="font-bold uppercase tracking-wider" style={{ color: "#853a8c" }}>{status}</span>. A SuperAdmin will review it shortly.
          </p>
          {reason && <p className="mt-2 text-sm text-red-500">Reason: {reason}</p>}

          <div className="mt-8 flex justify-center gap-4">
            <button
              onClick={checkStatus}
              disabled={checking}
              className="rounded border border-gray-300 px-6 py-2 text-[11px] font-bold uppercase tracking-widest text-gray-600 transition-colors hover:border-[#853a8c] hover:text-[#853a8c] disabled:opacity-50"
            >
              {checking ? "Checking…" : "Check status"}
            </button>
            <Link
              href="/"
              className="rounded px-6 py-2 text-[11px] font-bold uppercase tracking-widest text-white transition-opacity"
              style={{ background: "#853a8c" }}
            >
              Go to login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
