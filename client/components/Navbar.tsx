"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "../contexts/AuthContext";
import { useState, useEffect, useRef } from "react";
import { LogOut, CalendarDays, LayoutDashboard, Bell, Trash2 } from "lucide-react";
import { api, SOCKET_URL } from "../lib/api";

export default function Navbar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const router = useRouter();

  // Both the login (/) and register (/register) pages have a purple left panel, so we use the white logo
  const isAuthPage = pathname === "/" || pathname === "/register";
  const logoSrc = isAuthPage ? "/imgs/white-logo-vca.png" : "/imgs/Logo-VCA.png";

  const handleLogout = async () => {
    await logout();
    router.replace("/");
  };

  const [hidden, setHidden] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);

  // Check for existing unread notifications on load
  useEffect(() => {
    if (user) {
      api.get("/api/notifications/mine").then(res => {
        if (res.success) {
          const list = res.notifications || [];
          setNotifications(list);
          const unread = list.some((n: any) => !n.readBy?.includes(user._id));
          setHasUnread(unread);
        }
      }).catch((e) => console.error("Error loading notifications:", e));
    }
  }, [user]);

  // Setup Socket.io
  useEffect(() => {
    if (!user) return;

    let socket: any = null;

    import("socket.io-client").then(({ io }) => {
      const socketUrl = SOCKET_URL;
      socket = io(socketUrl, {
        transports: ["websocket", "polling"],
        reconnection: true,
      });

      socket.emit("join_notification_rooms", {
        userId: user._id,
        department: user.studentInfo?.department
      });

      socket.on("new_notification", (notification: any) => {
        setHasUnread(true);
        setNotifications(prev => [notification, ...prev]);
      });
    }).catch(err => {
      console.error("Failed to load socket.io-client:", err);
    });

    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [user]);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 80) {
        setHidden(true);
        setDropdownOpen(false);
      } else {
        setHidden(false);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
        setNotifDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleDeleteNotification = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await api.delete(`/api/notifications/${id}`);
      setNotifications(prev => prev.filter(n => n._id !== id));
    } catch (err) {
      console.error("Failed to delete notification:", err);
    }
  };

  let logoHref = "/";
  if (pathname.startsWith("/student-progress-card/")) {
    logoHref = pathname;
  } else if (user && user.role === "student") {
    const slug = user.studentInfo?.rollNumber || user._id;
    logoHref = `/student-progress-card/${slug}`;
  }

  return (
    <nav className={`fixed top-0 w-full z-50 flex items-center justify-between px-4 sm:px-6 md:px-10 lg:px-16 xl:px-[100px] py-4 sm:py-6 pointer-events-none transition-transform duration-300 ease-in-out ${hidden ? "-translate-y-full" : "translate-y-0"}`}>
      <Link href={logoHref} className="pointer-events-auto">
        <Image
          src={logoSrc}
          alt="Viral Cat Academy"
          width={120}
          height={48}
          priority
          className="w-24 sm:w-28 md:w-30 h-auto object-contain drop-shadow-sm"
        />
      </Link>
      


      {user && !isAuthPage && (
        <div className="flex items-center gap-4 pointer-events-auto" ref={dropdownRef}>
          {/* Notifications Dropdown */}
          <div className="relative">
            <button 
              onClick={() => {
                setNotifDropdownOpen(!notifDropdownOpen);
                setDropdownOpen(false);
                if (hasUnread) {
                  setHasUnread(false);
                  api.put("/api/notifications/read-all").then(() => {
                    setNotifications(prev => prev.map(n => ({
                      ...n,
                      readBy: [...(n.readBy || []), user._id]
                    })));
                  }).catch(e => console.error("Failed to mark notifications as read:", e));
                }
              }}
              className="relative flex items-center justify-center w-10 h-10 rounded-full border border-gray-200 bg-white shadow-sm  transition-all focus:outline-none"
              title="Notifications"
            >
              <Bell size={18} className={hasUnread ? "text-blue-600 " : "text-gray-600"} />
              {hasUnread && (
                <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-red-500 rounded-full border border-white " />
              )}
              {hasUnread && (
                <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-red-500 rounded-full border border-white" />
              )}
            </button>
            
            {notifDropdownOpen && (
              <div className="absolute -right-14 sm:right-0 mt-3 w-[calc(100vw-32px)] sm:w-80 bg-white rounded-2xl shadow-xl border border-gray-100 py-3 flex flex-col z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="px-4 pb-3 border-b border-gray-100 flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Notifications</span>
                </div>
                
                <div className="max-h-80 overflow-y-auto py-1">
                  {notifications.length === 0 ? (
                    <div className="px-6 py-10 text-center flex flex-col items-center gap-2">
                      <Bell size={24} className="text-gray-300 " />
                      <span className="text-sm font-medium text-gray-400">All caught up!</span>
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <div 
                        key={n._id} 
                        className="group px-4 py-3 hover:bg-gray-50 transition-colors flex items-start justify-between gap-3 border-b border-gray-50 last:border-b-0"
                      >
                        <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                          <span className="text-xs font-semibold text-gray-800 break-words">{n.title}</span>
                          <span className="text-xs text-gray-500 leading-relaxed break-words">{n.message}</span>
                          <span className="text-[9px] text-gray-400 mt-1 font-mono">
                            {new Date(n.sentAt || n.scheduledFor || n.createdAt).toLocaleDateString()} {new Date(n.sentAt || n.scheduledFor || n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <button
                          onClick={(e) => handleDeleteNotification(n._id, e)}
                          className="text-gray-300 hover:text-red-500 p-1 rounded-md hover:bg-red-50 transition-colors shrink-0"
                          title="Delete notification"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Profile Dropdown */}
          <div className="relative">
            <button 
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center justify-center w-10 h-10 rounded-full border border-gray-200 bg-white shadow-sm overflow-hidden hover:border-blue-500 transition-colors focus:outline-none"
            >
              <img 
                src={user.profileImage || "/dummy-profile-img.jpg"} 
                alt={user.name} 
                className="w-full h-full object-cover" 
              />
            </button>
            
            {dropdownOpen && (
              <div className="absolute right-0 mt-3 w-56 bg-white rounded-xl shadow-lg border border-gray-100 py-3 flex flex-col z-50 overflow-hidden">
                <div className="px-4 pb-3 border-b border-gray-100 flex flex-col gap-1">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Signed in as</span>
                  <span className="text-sm font-medium text-gray-900 truncate" title={user.email}>{user.email}</span>
                </div>
                
                <div className="py-1">
                  {/* Progress Card Link */}
                  {user && user.role === "student" && (
                    <Link
                      href={`/student-progress-card/${user._id}`}
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors w-full text-left"
                    >
                      Progress Card
                    </Link>
                  )}

                  <Link
                    href="/attendance"
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors w-full text-left"
                  >
                    Attendance
                  </Link>
                </div>
                
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex items-center gap-3 px-4 py-3 mt-1 text-sm text-red-600 font-medium hover:bg-red-50 transition-colors w-full text-left"
                >
                  <LogOut size={16} />
                  Log out
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
