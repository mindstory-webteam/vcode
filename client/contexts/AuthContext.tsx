"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { api, SOCKET_URL } from "../lib/api";

export interface AuthUser {
  _id: string;
  name: string;
  email: string;
  role: "student" | "faculty" | "superadmin";
  status: string;
  isActive: boolean;
  profileImage?: string | null;
  studentInfo?: {
    rollNumber?: string;
    department?: string;
    course?: string;
    semester?: string;
    assignedFaculty?: unknown;
  };
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  loginWithGoogle: (email: string, name: string, googleId: string) => Promise<AuthUser>;
  otpLogin: (email: string, passcode: string) => Promise<any>;
  requestOtp: (email: string) => Promise<any>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDeactivated, setIsDeactivated] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const data = await api.get("/api/auth/me");
      setUser(data.user);
    } catch (err: any) {
      setUser(null);
      if (typeof window !== "undefined") {
        localStorage.removeItem("token");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = useCallback(async (email: string, password: string) => {
    const data = await api.post("/api/auth/login", { email, password });
    if (data.token && typeof window !== "undefined") {
      localStorage.setItem("token", data.token);
    }
    setUser(data.user);
    return data.user as AuthUser;
  }, []);

  const loginWithGoogle = useCallback(async (email: string, name: string, googleId: string) => {
    const data = await api.post("/api/auth/google", { email, name, googleId });
    if (data.pendingApproval) {
      return data;
    }
    if (data.token && typeof window !== "undefined") {
      localStorage.setItem("token", data.token);
    }
    setUser(data.user);
    return data.user as AuthUser;
  }, []);

  const otpLogin = useCallback(async (email: string, passcode: string) => {
    const data = await api.post("/api/auth/otp-login", { email, passcode });
    if (data.token && typeof window !== "undefined") {
      localStorage.setItem("token", data.token);
    }
    if (data.user) {
      setUser(data.user);
    }
    return data;
  }, []);

  const requestOtp = useCallback(async (email: string) => {
    return await api.post("/api/auth/request-otp", { email });
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post("/api/auth/logout", {});
    } finally {
      if (typeof window !== "undefined") {
        localStorage.removeItem("token");
      }
      setUser(null);
    }
  }, []);

  // Listen to WebSocket deactivation/deletion alerts in real-time
  useEffect(() => {
    if (!user?._id) return;

    let socket: any = null;

    import("socket.io-client").then(({ io }) => {
      socket = io(SOCKET_URL, {
        transports: ["websocket", "polling"],
        reconnection: true,
      });

      socket.emit("join_progress_report_room", user._id);

      socket.on("user_deactivated", async () => {
        try {
          await logout();
        } catch (err) {
          // Ignore API failures (e.g. 403) since user is already deactivated
        }
        window.location.href = "/";
      });

      socket.on("user_deleted", async () => {
        try {
          await logout();
        } catch (err) {
          // Ignore API failures (e.g. 401) since user is already deleted
        }
        window.location.href = "/";
      });
    }).catch(err => {
      console.error("Failed to load socket.io-client:", err);
    });

    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [user?._id, logout]);

  return (
    <AuthContext.Provider value={{ user, loading, login, loginWithGoogle, otpLogin, requestOtp, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
