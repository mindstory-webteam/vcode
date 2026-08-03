"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../contexts/AuthContext";
import Navbar from "../../components/Navbar";
import { Bell, Loader2, Trash2 } from "lucide-react";
import { api } from "../../lib/api";

export default function NotificationsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    try {
      const res = await api.get("/api/notifications/mine");
      if (res.success) {
        const list = res.notifications || [];
        setNotifications(list);
        const hasUnread = list.some((n: any) => !n.readBy?.includes(user?._id));
        if (hasUnread) {
          api.put("/api/notifications/read-all").catch(err => {
            console.error("Failed to mark notifications as read on backend:", err);
          });
        }
      }
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push("/");
    } else {
      fetchNotifications();
    }
  }, [user, authLoading, router]);

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/api/notifications/${id}`);
      setNotifications(prev => prev.filter(n => n._id !== id));
    } catch (err) {
      console.error("Failed to delete notification:", err);
    }
  };

  if (authLoading || !user || loading) {
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

        {notifications.length === 0 ? (
          <div className="rounded-2xl border border-gray-100 bg-white p-12 shadow-sm flex flex-col items-center justify-center text-center">
            <div className="rounded-full bg-gray-50 p-4 mb-4">
              <Bell className="h-8 w-8 text-gray-300" />
            </div>
            <h2 className="text-lg font-medium text-gray-900 mb-1">No new notifications</h2>
            <p className="text-sm text-gray-500 max-w-sm">
              You're all caught up! When you have new alerts, messages, or updates, they will appear here.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {notifications.map((n) => (
              <div 
                key={n._id}
                className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm flex items-start justify-between gap-6 hover:shadow-md transition-shadow duration-200"
              >
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-semibold text-gray-900 mb-1">{n.title}</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">{n.message}</p>
                  <span className="text-xs text-gray-400 mt-2 block font-mono">
                    {new Date(n.createdAt).toLocaleDateString()} {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <button
                  onClick={() => handleDelete(n._id)}
                  className="text-gray-400 hover:text-red-600 p-2 rounded-lg hover:bg-red-50 transition-colors shrink-0"
                  title="Delete notification"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
