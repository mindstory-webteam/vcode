"use client";

import { useState, useEffect, type FormEvent, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, Mail, RefreshCw, AlertCircle } from "lucide-react";
import { GoogleLogin, useGoogleLogin, CredentialResponse } from "@react-oauth/google";
import { jwtDecode } from "jwt-decode";
import { io } from "socket.io-client";
import emailjs from "@emailjs/browser";
import { useAuth } from "../contexts/AuthContext";
import { api, ApiError, SOCKET_URL } from "../lib/api";
import VcaCat from "../components/VcaCat";

interface GoogleJwtPayload {
  sub: string;
  email: string;
  name?: string;
}

function AuthContent() {
  const { loginWithGoogle, otpLogin } = useAuth();
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
  const [originError, setOriginError] = useState(false);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState<{ email: string; status: string } | null>(null);
  const [generatedOtp, setGeneratedOtp] = useState<string | null>(null);
  const [otpExpiry, setOtpExpiry] = useState<number | null>(null);

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
  async function handlePostLoginRedirect(authUser: any) {
    let redirectUrl = params.get("redirect");
    if (!redirectUrl || redirectUrl === "/dashboard") {
      if (authUser.role === "student") {
        redirectUrl = `/student-progress-card/${authUser._id}`;
      } else {
        redirectUrl = "/student-progress-card/unknown";
      }
    }
    router.replace(redirectUrl);
  }

  // Helper to send OTP using EmailJS
  async function sendOtpViaEmail(targetEmail: string) {
    // 1. Generate 6-digit OTP passcode
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = Date.now() + 1 * 60 * 1000; // valid for 1 minute
    const timeStr = new Date(expiry).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    const serviceId = process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID || "service_vca";
    const templateId = process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID || "template_otp";
    const publicKey = process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY || "your_public_key";

    // Debug print in terminal console for easy developer testing
    console.log("==========================================");
    console.log(`[VCA LOGIN OTP CODE]: ${code} (expires ${timeStr})`);
    console.log("==========================================");

    if (publicKey === "your_public_key" || !publicKey) {
      setGeneratedOtp(code);
      setOtpExpiry(expiry);
      return;
    }

    // 2. Send email via EmailJS
    await emailjs.send(
      serviceId,
      templateId,
      {
        email: targetEmail,
        to_name: targetEmail.split("@")[0],
        passcode: code,
        time: timeStr
      },
      publicKey
    );

    setGeneratedOtp(code);
    setOtpExpiry(expiry);
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
      // Check application status first
      const checkRes = await api.get(`/api/auth/application-status/${encodeURIComponent(email)}`).catch(() => null);
      if (checkRes && (checkRes.status === "pending" || checkRes.status === "rejected")) {
        setSubmitted({ email, status: checkRes.status });
        return;
      }

      await sendOtpViaEmail(email);
      startResendTimer();
      setStep("otp");
      setInfoMsg(`OTP has been sent to ${email}`);
    } catch (err: any) {
      setError(err?.text || err?.message || "Failed to send OTP. Please try again.");
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
      await sendOtpViaEmail(email);
      startResendTimer();
      setInfoMsg(`A new OTP has been sent to ${email}`);
    } catch (err: any) {
      setError(err?.text || err?.message || "Failed to resend OTP.");
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

    if (!generatedOtp || !otpExpiry) {
      setError("No active OTP. Please request a new OTP code.");
      return;
    }

    if (Date.now() > otpExpiry) {
      setError("This OTP has expired. Please request a new OTP code.");
      return;
    }

    if (otpCode !== generatedOtp) {
      setError("Invalid OTP code. Please check and try again.");
      return;
    }

    setVerifyingOtp(true);
    try {
      const res = await otpLogin(email);
      if (res.pendingApproval) {
        setSubmitted({ email: res.email || email, status: res.status || "pending" });
      } else {
        // Clear the explicit logout flag since they are logging back in
        if (typeof window !== "undefined") {
          localStorage.removeItem("explicit_logout");
        }
        
        await handlePostLoginRedirect(res.user);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Authentication failed.");
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

  // Process Google User Data
  async function processGoogleAuth(googleEmail: string, googleName: string, googleSub: string) {
    setError(null);
    setOriginError(false);
    try {
      const res: any = await loginWithGoogle(googleEmail, googleName, googleSub);
      if (res && res.pendingApproval) {
        setSubmitted({ email: res.email || googleEmail, status: res.status || "pending" });
      } else {
        await handlePostLoginRedirect(res);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Google OAuth Authentication failed.");
    }
  }

  // Handle Standard Google Login Success
  async function handleGoogleSuccess(credentialResponse: CredentialResponse) {
    if (!credentialResponse.credential) return;
    try {
      const decoded = jwtDecode<GoogleJwtPayload>(credentialResponse.credential);
      if (decoded && decoded.email && decoded.sub) {
        await processGoogleAuth(decoded.email, decoded.name || "", decoded.sub);
      } else {
        setError("Could not retrieve Google profile details.");
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Google OAuth Authentication failed.");
    }
  }

  // Handle Redirect mode (receives credential from URL after Google redirect POST)
  useEffect(() => {
    const credentialUrl = params?.get("credential");
    if (credentialUrl) {
      // Clean up the URL
      window.history.replaceState(null, "", "/");
      handleGoogleSuccess({ credential: credentialUrl, clientId: "" });
    }
  }, [params]);

  // Custom Popup Google OAuth Handler (useGoogleLogin)
  const popupGoogleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        const res = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
          headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
        });
        const profile = await res.json();
        if (profile && profile.email && profile.sub) {
          await processGoogleAuth(profile.email, profile.name || "", profile.sub);
        } else {
          setError("Failed to fetch Google profile details.");
        }
      } catch {
        setError("Error fetching Google profile info.");
      }
    },
    onError: (err) => {
      console.error("Google Popup Auth Error:", err);
      setOriginError(true);
      setError("Google Login failed: The current URL origin (http://localhost:3000) is not listed in Authorized JavaScript Origins for your Google Client ID.");
    },
  });

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
          <a href="https://vcamasterclass.com/about-us" target="_blank" rel="noopener noreferrer" className="hover:underline opacity-80 hover:opacity-100 transition-opacity">About</a>
          <a href="https://vcamasterclass.com/privacy-policy" target="_blank" rel="noopener noreferrer" className="hover:underline opacity-80 hover:opacity-100 transition-opacity">Privacy</a>
          <a href="https://vcamasterclass.com/terms-and-conditions" target="_blank" rel="noopener noreferrer" className="hover:underline opacity-80 hover:opacity-100 transition-opacity">Terms of Use</a>
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

          {/* Google Origin Whitelist Instruction Banner */}
          {originError && (
            <div className="mt-4 rounded border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
              <div className="flex items-center gap-1.5 font-bold mb-1">
                <AlertCircle className="w-4 h-4 text-amber-600" />
                Google Console Configuration Required:
              </div>
              <p className="leading-relaxed">
                Add <code className="bg-amber-100 px-1 py-0.5 rounded font-mono font-semibold">http://localhost:3000</code> to <strong>Authorized JavaScript origins</strong> in your Google Cloud Console under Credentials &gt; OAuth 2.0 Client IDs.
              </p>
            </div>
          )}

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
            <div className="absolute inset-0 flex items-center font-medium">
            </div>
            <span className="relative bg-white px-3 text-xs uppercase tracking-wider text-gray-400 font-medium">
              or continue with
            </span>
          </div>

          <div className="flex flex-col items-center justify-center w-full">
            <GoogleLogin
              ux_mode="redirect"
              login_uri={typeof window !== 'undefined' ? `${window.location.origin}/api/auth/google` : 'http://localhost:3000/api/auth/google'}
              onSuccess={handleGoogleSuccess}
              onError={() => setError("Google OAuth login failed. Ensure http://localhost:3000 is added to Authorized JavaScript Origins in Google Cloud Console.")}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function PendingStatus({ email, initialStatus }: { email: string; initialStatus: string }) {
  const [status, setStatus] = useState(initialStatus);
  const [checking, setChecking] = useState(false);
  const [reason, setReason] = useState<string | null>(null);

  async function handleApprovedRedirect(data: any) {
    if (data?.token && typeof window !== "undefined") {
      localStorage.setItem("token", data.token);
    }

    const studentId = data?.user?._id || data?.user?.id || "unknown";
    window.location.href = `/student-progress-card/${studentId}`;
  }

  async function checkStatus() {
    setChecking(true);
    try {
      const res = await api.get(`/api/auth/application-status/${encodeURIComponent(email)}`);
      setStatus(res.status);
      setReason(res.rejectionReason || null);
      if (res.isApproved || res.status === "approved") {
        await handleApprovedRedirect(res);
      }
    } catch {
      // ignore
    } finally {
      setChecking(false);
    }
  }

  // Real-time Socket.io listener & automatic polling
  useEffect(() => {
    const socketUrl = SOCKET_URL;
    const socket = io(socketUrl, {
      transports: ["websocket", "polling"],
      reconnection: true,
    });

    socket.emit("join_application_room", email);

    socket.on("application_approved", async (data: any) => {
      if (data && data.email && data.email.toLowerCase() === email.toLowerCase()) {
        setStatus("approved");
        await handleApprovedRedirect(data);
      }
    });

    socket.on("application_rejected", (data: any) => {
      if (data && data.email && data.email.toLowerCase() === email.toLowerCase()) {
        setStatus("rejected");
        if (data.reason) {
          setReason(data.reason);
        }
      }
    });

    // Auto-polling fallback every 3 seconds
    const interval = setInterval(async () => {
      try {
        const res = await api.get(`/api/auth/application-status/${encodeURIComponent(email)}`);
        setStatus(res.status);
        setReason(res.rejectionReason || null);
        if (res.isApproved || res.status === "approved") {
          await handleApprovedRedirect(res);
        }
      } catch {
        // ignore
      }
    }, 3000);

    return () => {
      socket.disconnect();
      clearInterval(interval);
    };
  }, [email]);

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
          <a href="https://vcamasterclass.com/about-us" target="_blank" rel="noopener noreferrer" className="hover:underline opacity-80 hover:opacity-100 transition-opacity">About</a>
          <a href="https://vcamasterclass.com/privacy-policy" target="_blank" rel="noopener noreferrer" className="hover:underline opacity-80 hover:opacity-100 transition-opacity">Privacy</a>
          <a href="https://vcamasterclass.com/terms-and-conditions" target="_blank" rel="noopener noreferrer" className="hover:underline opacity-80 hover:opacity-100 transition-opacity">Terms of Use</a>
        </div>
      </div>

      {/* ── RIGHT PANEL — status ── */}
      <div className="flex flex-1 flex-col items-center justify-center bg-white px-8 py-16">
        <div className="w-full max-w-md text-center">
          <h1 className="text-3xl font-light leading-snug text-gray-700">
            Application <span className="font-semibold text-gray-800">submitted</span>
          </h1>
          <p className="mt-6 text-sm text-gray-500 leading-relaxed">
            {status === "pending" ? (
              <>
                Your application for <span className="font-medium text-gray-700">{email}</span> has been submitted successfully and is currently <span className="font-bold uppercase tracking-wider text-[#853a8c]">PENDING</span>. Our team will review your request shortly.
              </>
            ) : status === "rejected" ? (
              <>
                Your application for <span className="font-medium text-gray-700">{email}</span> was reviewed and unfortunately has been <span className="font-bold uppercase tracking-wider text-red-600">REJECTED</span>. If you believe this is a mistake, please contact the administration.
              </>
            ) : (
              <>
                Your application is <span className="font-bold uppercase tracking-wider text-[#853a8c]">{status}</span>.
              </>
            )}
          </p>
          {reason && status === "rejected" && <p className="mt-4 text-sm font-medium text-red-500">Reason: {reason}</p>}

          <div className="mt-8 flex justify-center gap-4">
            <button
              onClick={() => window.location.reload()}
              className="rounded px-6 py-2.5 text-[11px] font-bold uppercase tracking-widest text-white transition-opacity"
              style={{ background: "#853a8c" }}
            >
              Back to login
            </button>
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
