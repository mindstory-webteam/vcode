"use client";

import { useState, useEffect, type FormEvent, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, Mail, ShieldCheck, RefreshCw } from "lucide-react";
import { GoogleLogin, CredentialResponse } from "@react-oauth/google";
import { jwtDecode } from "jwt-decode";
import { useAuth } from "../contexts/AuthContext";
import { api, ApiError } from "../lib/api";
import VcaCat from "../components/VcaCat";

interface GoogleJwtPayload {
  sub: string;
  email: string;
  name?: string;
}

function AuthContent() {
  const { loginWithGoogle } = useAuth();
  const router = useRouter();
  const params = useSearchParams();

  // State: 'email' (Step 1) | 'otp' (Step 2)
  const [step, setStep] = useState<"email" | "otp">("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [resendTimer, setResendTimer] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);

  // Helper to start/reset the 60s timer and persist to localStorage
  const startResendTimer = () => {
    const expiryTime = Date.now() + 60 * 1000;
    if (typeof window !== "undefined") {
      localStorage.setItem("otp_resend_expiry", expiryTime.toString());
    }
    setResendTimer(60);
  };

  // Restore timer from localStorage on step change or mount
  useEffect(() => {
    if (step === "otp" && typeof window !== "undefined") {
      const storedExpiry = localStorage.getItem("otp_resend_expiry");
      if (storedExpiry) {
        const remaining = Math.max(0, Math.ceil((parseInt(storedExpiry, 10) - Date.now()) / 1000));
        if (remaining > 0) {
          setResendTimer(remaining);
        } else {
          localStorage.removeItem("otp_resend_expiry");
        }
      }
    }
  }, [step]);

  // Interval timer tick down
  useEffect(() => {
    if (resendTimer <= 0) return;
    const interval = setInterval(() => {
      setResendTimer((prev) => {
        if (prev <= 1) {
          if (typeof window !== "undefined") {
            localStorage.removeItem("otp_resend_expiry");
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [resendTimer]);

  // Handle Redirect after login
  async function handlePostLoginRedirect(authUser: { role: string; studentInfo?: { rollNumber?: string } }) {
    let redirectUrl = params.get("redirect");
    if (!redirectUrl || redirectUrl === "/dashboard") {
      if (authUser.role === "student") {
        try {
          const res = await api.get("/api/student/progress-report");
          const report = res.report;
          let vcode =
            report?.gradeCard?.program?.code ||
            report?.verification?.verificationCode ||
            authUser.studentInfo?.rollNumber ||
            "unknown";
          if (!vcode.startsWith("VC-")) vcode = `VC-${vcode}`;
          redirectUrl = `/student-progress-card/${vcode}`;
        } catch {
          let fallbackCode = authUser.studentInfo?.rollNumber || "unknown";
          if (!fallbackCode.startsWith("VC-")) fallbackCode = `VC-${fallbackCode}`;
          redirectUrl = `/student-progress-card/${fallbackCode}`;
        }
      } else {
        redirectUrl = "/student-progress-card/unknown";
      }
    }
    router.replace(redirectUrl);
  }

  // Step 1: Send OTP
  async function handleSendOtp(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setInfoMsg(null);

    const emailRegex = /^[^\s@]+@gmail\.com$/i;
    if (!emailRegex.test(email)) {
      setError("Please enter a valid @gmail.com address.");
      return;
    }

    setSendingOtp(true);
    try {
      startResendTimer();
      setStep("otp");
      setInfoMsg(`OTP has been sent to ${email}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to send OTP. Please try again.");
    } finally {
      setSendingOtp(false);
    }
  }

  // Resend OTP handler
  async function handleResendOtp() {
    if (resendTimer > 0) return;
    setError(null);
    setInfoMsg(null);
    setSendingOtp(true);
    try {
      startResendTimer();
      setInfoMsg(`A new OTP has been sent to ${email}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to resend OTP.");
    } finally {
      setSendingOtp(false);
    }
  }

  // Step 2: Verify OTP
  async function handleVerifyOtp(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const otpCode = otp.join("");
    if (otpCode.length < 6) {
      setError("Please enter the 6-digit OTP code.");
      return;
    }

    setVerifyingOtp(true);
    try {
      setInfoMsg("OTP UI verified! (Backend OTP endpoint to be connected)");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Invalid or expired OTP.");
    } finally {
      setVerifyingOtp(false);
    }
  }

  // Handle OTP digit changes
  function handleOtpChange(index: number, val: string) {
    if (!/^\d*$/.test(val)) return;
    const newOtp = [...otp];
    newOtp[index] = val.slice(-1);
    setOtp(newOtp);

    // Auto-focus next input
    if (val && index < 5) {
      const nextInput = document.getElementById(`otp-input-${index + 1}`);
      nextInput?.focus();
    }
  }

  // Google OAuth Login
  async function handleGoogleSuccess(credentialResponse: CredentialResponse) {
    if (!credentialResponse.credential) return;
    setError(null);
    try {
      const decoded = jwtDecode<GoogleJwtPayload>(credentialResponse.credential);
      if (decoded && decoded.email && decoded.sub) {
        const user = await loginWithGoogle(decoded.email, decoded.name || "", decoded.sub);
        await handlePostLoginRedirect(user);
      } else {
        setError("Could not retrieve Google profile details.");
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Google OAuth Authentication failed.");
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

      {/* ── RIGHT PANEL — Unified Auth (OTP & Google OAuth) ── */}
      <div className="flex flex-1 flex-col items-center justify-center bg-white px-8 py-16">
        <div className="w-full max-w-sm">
          <h1 className="text-3xl font-light leading-snug text-gray-700">
          <span className="font-semibold text-gray-800">Student Portal</span>
          </h1>
          <p className="mt-2 text-xs text-gray-500">
            Sign in using OTP or Google Login
          </p>

          {/* Messages */}
          {error && <p className="mt-4 rounded bg-red-50 px-3 py-2 text-sm text-red-500">{error}</p>}
          {infoMsg && <p className="mt-4 rounded bg-purple-50 px-3 py-2 text-sm text-[#853a8c]">{infoMsg}</p>}

          {/* STEP 1: EMAIL INPUT */}
          {step === "email" && (
            <form onSubmit={handleSendOtp} className="mt-8 space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Gmail Address
                </label>
                <div className="relative">
                  <input
                    type="email"
                    placeholder="student@gmail.com"
                    value={email}
                    required
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded border border-gray-300 px-4 py-3 pl-10 text-sm tracking-wide text-gray-700 placeholder:text-gray-400 focus:border-[#853a8c] focus:outline-none focus:ring-1 focus:ring-[#853a8c]/30 transition"
                  />
                  <Mail className="absolute left-3 top-3.5 h-4 w-4 text-gray-400" />
                </div>
              </div>

              <button
                type="submit"
                disabled={sendingOtp}
                className="flex w-full items-center justify-center gap-2 rounded py-3 text-xs font-bold uppercase tracking-widest text-white transition-opacity disabled:opacity-60"
                style={{ background: "#853a8c" }}
              >
                {sendingOtp ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    <span>Send OTP</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* STEP 2: OTP VERIFICATION */}
          {step === "otp" && (
            <form onSubmit={handleVerifyOtp} className="mt-8 space-y-6">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Enter 6-Digit OTP
                  </label>
                  <button
                    type="button"
                    onClick={() => setStep("email")}
                    className="text-xs text-[#853a8c] hover:underline"
                  >
                    Change Email
                  </button>
                </div>
                <div className="flex gap-2 justify-between">
                  {otp.map((digit, idx) => (
                    <input
                      key={idx}
                      id={`otp-input-${idx}`}
                      type="text"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(idx, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Backspace" && !digit && idx > 0) {
                          document.getElementById(`otp-input-${idx - 1}`)?.focus();
                        }
                      }}
                      className="w-11 h-12 text-center text-lg font-bold border border-gray-300 rounded focus:border-[#853a8c] focus:outline-none focus:ring-1 focus:ring-[#853a8c]/30"
                    />
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={verifyingOtp}
                className="flex w-full items-center justify-center gap-2 rounded py-3 text-xs font-bold uppercase tracking-widest text-white transition-opacity disabled:opacity-60"
                style={{ background: "#853a8c" }}
              >
                {verifyingOtp ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    <ShieldCheck className="h-4 w-4" />
                    <span>Verify & Login</span>
                  </>
                )}
              </button>

              <div className="text-center">
                <button
                  type="button"
                  disabled={resendTimer > 0 || sendingOtp}
                  onClick={handleResendOtp}
                  className={`inline-flex items-center gap-1.5 text-xs transition-colors ${
                    resendTimer > 0
                      ? "text-gray-400 cursor-not-allowed"
                      : "text-gray-500 hover:text-[#853a8c]"
                  }`}
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${sendingOtp ? "animate-spin" : ""}`} />
                  <span>
                    {resendTimer > 0 ? `Resend OTP in ${resendTimer}s` : "Resend OTP"}
                  </span>
                </button>
              </div>
            </form>
          )}

          {/* ALTERNATIVE GOOGLE OAUTH LOGIN AT BOTTOM */}
          <div className="relative my-8 flex items-center justify-center">
            <div className="absolute inset-0 flex items-center">
            </div>
            <span className="relative bg-white px-3 text-xs uppercase tracking-wider text-gray-400 font-medium">
              or continue with
            </span>
          </div>

          <div className="flex flex-col items-center justify-center">
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() => setError("Google OAuth login failed.")}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <AuthContent />
    </Suspense>
  );
}
