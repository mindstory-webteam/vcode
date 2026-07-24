"use client";

import React from "react";
import { GoogleOAuthProvider } from "@react-oauth/google";

const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";

export default function GoogleAuthProviderWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!clientId || clientId === "your_google_client_id_here") {
    // Graceful fallback if Client ID is not configured yet
    return (
      <GoogleOAuthProvider clientId="dummy-client-id.apps.googleusercontent.com">
        {children}
      </GoogleOAuthProvider>
    );
  }

  return <GoogleOAuthProvider clientId={clientId}>{children}</GoogleOAuthProvider>;
}
