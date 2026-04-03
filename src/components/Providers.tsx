"use client";

import { AuthProvider } from "@/lib/auth";
import { AuthModalProvider } from "@/components/AuthModal";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <AuthModalProvider>
        {children}
      </AuthModalProvider>
    </AuthProvider>
  );
}
