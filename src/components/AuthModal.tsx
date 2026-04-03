// AuthModal â reusable sign-in/sign-up modal that can be triggered from any interface
// Usage: <AuthModal open={showAuth} onClose={() => setShowAuth(false)} />
// Or use the hook: const { showAuthModal, AuthModalComponent } = useAuthModal();

"use client";

import { useState, useCallback, useEffect, createContext, useContext, ReactNode } from "react";
import { supabase } from "@/lib/supabase";

// âââ MODAL COMPONENT âââ

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialMode?: "signin" | "signup";
  message?: string; // Custom prompt, e.g. "Sign in to save your dream"
}

export function AuthModal({ open, onClose, onSuccess, initialMode = "signin", message }: AuthModalProps) {
  const [mode, setMode] = useState<"signin" | "signup">(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  // Reset on open
  useEffect(() => {
    if (open) {
      setError("");
      setSuccess("");
      setMode(initialMode);
    }
  }, [open, initialMode]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      if (mode === "signup") {
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { name: name || email.split("@")[0] } },
        });
        if (signUpError) {
          setError(signUpError.message);
        } else {
          setSuccess("Account created! Check your email to confirm, then sign in.");
          setTimeout(() => { setMode("signin"); setSuccess(""); }, 3000);
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) {
          setError(signInError.message);
        } else {
          setSuccess("Signed in!");
          onSuccess?.();
          setTimeout(onClose, 500);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError("");
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: window.location.href },
      });
      if (error) setError(error.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    }
  };

  if (!open) return null;

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: "fixed", inset: 0, zIndex: 10000,
        background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 16, animation: "authFadeIn 0.2s ease",
      }}
    >
      <div
        style={{
          width: "100%", maxWidth: 400,
          background: "#fff", borderRadius: 16,
          padding: "32px 28px", boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
          animation: "authSlideUp 0.3s cubic-bezier(0.34,1.56,0.64,1)",
        }}
      >
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>ð¿</div>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: "#111", margin: "0 0 6px" }}>
            {mode === "signup" ? "Join Builder's KG" : "Welcome Back"}
          </h2>
          <p style={{ fontSize: 13, color: "#666", margin: 0 }}>
            {message || (mode === "signup"
              ? "Create your free account to save your projects"
              : "Sign in to access your saved projects"
            )}
          </p>
        </div>

        {/* Google Sign-In */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          style={{
            width: "100%", padding: "10px 16px",
            background: "#fff", border: "1px solid #ddd", borderRadius: 8,
            fontSize: 14, fontWeight: 500, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            color: "#333", fontFamily: "inherit", transition: "background 0.15s",
            marginBottom: 16,
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "#f5f5f5")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "#fff")}
        >
          <svg width="18" height="18" viewBox="0 0 18 18"><path d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 002.38-5.88c0-.57-.05-.99-.15-1.17z" fill="#4285F4"/><path d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2a4.8 4.8 0 01-7.18-2.54H1.83v2.07A8 8 0 008.98 17z" fill="#34A853"/><path d="M4.5 10.52a4.8 4.8 0 010-3.04V5.41H1.83a8 8 0 000 7.18l2.67-2.07z" fill="#FBBC05"/><path d="M8.98 3.58c1.32 0 2.29.46 3.13 1.26l2.24-2.24A7.97 7.97 0 008.98 0 8 8 0 001.83 5.41l2.67 2.07A4.77 4.77 0 018.98 3.58z" fill="#EA4335"/></svg>
          Continue with Google
        </button>

        {/* Divider */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "0 0 16px" }}>
          <div style={{ flex: 1, height: 1, background: "#e5e5e5" }} />
          <span style={{ fontSize: 11, color: "#999" }}>or</span>
          <div style={{ flex: 1, height: 1, background: "#e5e5e5" }} />
        </div>

        {/* Error / Success */}
        {error && (
          <div style={{
            background: "#fff0f0", border: "1px solid #ffcccc", color: "#cc0000",
            padding: "10px 12px", borderRadius: 8, fontSize: 13, marginBottom: 12, textAlign: "center",
          }}>
            {error}
          </div>
        )}
        {success && (
          <div style={{
            background: "#f0faf5", border: "1px solid #ccead5", color: "#1D9E75",
            padding: "10px 12px", borderRadius: 8, fontSize: 13, marginBottom: 12, textAlign: "center",
          }}>
            {success}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {mode === "signup" && (
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              style={inputStyle}
            />
          )}
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="Email"
            style={inputStyle}
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="Password"
            minLength={6}
            style={inputStyle}
          />
          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%", padding: 12,
              background: loading ? "#999" : "#1D9E75",
              color: "#fff", border: "none", borderRadius: 8,
              fontSize: 14, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer",
              fontFamily: "inherit", transition: "background 0.15s",
            }}
          >
            {loading ? "Loading..." : mode === "signup" ? "Create Account" : "Sign In"}
          </button>
        </form>

        {/* Toggle mode */}
        <div style={{ textAlign: "center", marginTop: 16 }}>
          <span style={{ fontSize: 13, color: "#666" }}>
            {mode === "signup" ? "Already have an account? " : "Don't have an account? "}
          </span>
          <button
            type="button"
            onClick={() => { setMode(mode === "signup" ? "signin" : "signup"); setError(""); setSuccess(""); }}
            style={{
              background: "none", border: "none", color: "#1D9E75",
              fontSize: 13, fontWeight: 600, cursor: "pointer",
              fontFamily: "inherit", textDecoration: "underline",
            }}
          >
            {mode === "signup" ? "Sign In" : "Sign Up"}
          </button>
        </div>

        {/* Continue as guest */}
        <button
          type="button"
          onClick={onClose}
          style={{
            width: "100%", marginTop: 12, padding: 10,
            background: "transparent", border: "1px solid #e5e5e5", borderRadius: 8,
            fontSize: 13, color: "#666", cursor: "pointer", fontFamily: "inherit",
            transition: "background 0.15s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "#f9f9f9")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
        >
          Continue without signing in
        </button>

        <p style={{ fontSize: 10, color: "#999", textAlign: "center", margin: "12px 0 0" }}>
          By continuing, you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>

      <style>{`
        @keyframes authFadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes authSlideUp { from { opacity: 0; transform: translateY(20px) scale(0.95) } to { opacity: 1; transform: translateY(0) scale(1) } }
      `}</style>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "10px 12px",
  border: "1px solid #ddd", borderRadius: 8,
  fontSize: 14, fontFamily: "inherit", color: "#333",
  background: "#fff", boxSizing: "border-box",
  transition: "border-color 0.15s",
  outline: "none",
};

// âââ AUTH MODAL CONTEXT âââ
// Provides a global way to open the auth modal from any component

interface AuthModalContextType {
  openAuthModal: (options?: { message?: string; onSuccess?: () => void }) => void;
  closeAuthModal: () => void;
  isAuthModalOpen: boolean;
}

const AuthModalContext = createContext<AuthModalContextType>({
  openAuthModal: () => {},
  closeAuthModal: () => {},
  isAuthModalOpen: false,
});

export function useAuthModal() {
  return useContext(AuthModalContext);
}

export function AuthModalProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState<string | undefined>();
  const [onSuccessCallback, setOnSuccessCallback] = useState<(() => void) | undefined>();

  const openAuthModal = useCallback((options?: { message?: string; onSuccess?: () => void }) => {
    setMessage(options?.message);
    setOnSuccessCallback(() => options?.onSuccess);
    setOpen(true);
  }, []);

  const closeAuthModal = useCallback(() => {
    setOpen(false);
    setMessage(undefined);
    setOnSuccessCallback(undefined);
  }, []);

  return (
    <AuthModalContext.Provider value={{ openAuthModal, closeAuthModal, isAuthModalOpen: open }}>
      {children}
      <AuthModal
        open={open}
        onClose={closeAuthModal}
        onSuccess={onSuccessCallback}
        message={message}
      />
    </AuthModalContext.Provider>
  );
}
