"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { api } from "../lib/api";

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
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const data = await api.get("/api/auth/me");
      setUser(data.user);
    } catch {
      setUser(null);
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

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
