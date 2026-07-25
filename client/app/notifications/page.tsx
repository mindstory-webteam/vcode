"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../contexts/AuthContext";
import Navbar from "../../components/Navbar";
import { Bell, Loader2 } from "lucide-react";

export default function NotificationsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push("/");
    }
  }, [user, authLoading, router]);

  if (authLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <Navbar />
      
      <main className="mx-auto max-w-3xl px-6 pt-32 pb-20">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="font-serif text-3xl font-medium tracking-tight flex items-center gap-3">
              <Bell className="h-8 w-8 text-blue-500" />
              Notifications
            </h1>
            <p className="mt-1 text-sm text-gray-500">Stay updated on your progress and announcements.</p>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-12 shadow-sm flex flex-col items-center justify-center text-center">
          <div className="rounded-full bg-gray-50 p-4 mb-4">
            <Bell className="h-8 w-8 text-gray-300" />
          </div>
          <h2 className="text-lg font-medium text-gray-900 mb-1">No new notifications</h2>
          <p className="text-sm text-gray-500 max-w-sm">
            You're all caught up! When you have new alerts, messages, or updates, they will appear here.
          </p>
        </div>
      </main>
    </div>
  );
}
