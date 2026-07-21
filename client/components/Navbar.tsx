"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "../contexts/AuthContext";
import { useState, useEffect } from "react";

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
      } else {
        setHidden(false);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav className={`fixed top-0 w-full z-50 flex items-center justify-between px-[100px] py-6 pointer-events-none transition-transform duration-300 ease-in-out ${hidden ? "-translate-y-full" : "translate-y-0"}`}>
      <Link href="/" className="pointer-events-auto">
        <Image
          src={logoSrc}
          alt="Viral Cat Academy"
          width={120}
          height={48}
          priority
          className="object-contain drop-shadow-sm"
        />
      </Link>
      
      {user && !isAuthPage && (
        <button
          type="button"
          onClick={handleLogout}
          className="pointer-events-auto rounded-full border border-gray-200 px-5 py-2 font-mono text-[11px] uppercase tracking-widest text-gray-500 bg-white/80 backdrop-blur transition hover:border-red-500 hover:text-red-600 shadow-sm"
        >
          Log out
        </button>
      )}
    </nav>
  );
}
