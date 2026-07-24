import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "../contexts/AuthContext";
import Navbar from "../components/Navbar";

import GoogleAuthProviderWrapper from "../components/GoogleAuthProviderWrapper";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});


export const metadata: Metadata = {
  title: "Student Portal",
  description: "Progress report portal",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body>
        <GoogleAuthProviderWrapper>
          <AuthProvider>
            <Navbar />
            {children}
          </AuthProvider>
        </GoogleAuthProviderWrapper>
      </body>
    </html>
  );
}