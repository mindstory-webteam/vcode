"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function BrandLogo() {
  const pathname = usePathname();
  // Both the login (/) and register (/register) pages have a purple left panel, so we use the white logo
  const isAuthPage = pathname === "/" || pathname === "/register";
  const logoSrc = isAuthPage ? "/imgs/white-logo-vca.png" : "/imgs/Logo-VCA.png";

  return (
    <Link href="/" className="fixed left-6 top-6 z-50">
      <Image
        src={logoSrc}
        alt="Viral Cat Academy"
        width={120}
        height={48}
        priority
        className="object-contain drop-shadow-sm"
      />
    </Link>
  );
}
