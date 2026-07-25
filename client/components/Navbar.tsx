"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "../contexts/AuthContext";
import { useState, useEffect, useRef } from "react";
import { LogOut, CalendarDays, LayoutDashboard, Bell } from "lucide-react";

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
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
        <div className="flex items-center pointer-events-auto" ref={dropdownRef}>
          {/* Profile Dropdown */}
          <div className="relative">
            <button 
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center justify-center w-10 h-10 rounded-full border border-gray-200 bg-white shadow-sm overflow-hidden hover:border-blue-500 transition-colors focus:outline-none"
            >
              {user.profileImage ? (
                <img src={user.profileImage} alt={user.name} className="w-full h-full object-cover" />
              ) : (
                <span className="font-bold text-gray-700 text-sm">
                  {user.name ? user.name.charAt(0).toUpperCase() : "U"}
                </span>
              )}
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
                      href={`/student-progress-card/${user.studentInfo?.rollNumber || user._id}`}
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors w-full text-left"
                    >
                      <LayoutDashboard size={16} className="text-gray-400" />
                      Progress Card
                    </Link>
                  )}

                  <Link
                    href="/attendance"
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors w-full text-left"
                  >
                    <CalendarDays size={16} className="text-gray-400" />
                    Attendance
                  </Link>
                  
                  {/* Notifications Link */}
                  <Link
                    href="/notifications"
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors w-full text-left"
                  >
                    <Bell size={16} className="text-gray-400" />
                    Notifications
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
