// Builder's Knowledge Garden — Auth & Subscription Context
// Supabase Auth integration
// DREAM (free) vs BUILD (paid) gating
// Uses real Supabase auth with mock tier defaults

"use client";

import { createContext, useContext, useState, useCallback, ReactNode, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import type { User as SupabaseUser } from "@supabase/supabase-js";

// ─── SUBSCRIPTION TIERS ───
export type Tier = "explorer" | "pro" | "team" | "enterprise" | "platform";

export interface TierConfig {
  id: Tier;
  name: string;
  price: string;
  priceMonthly: number;
  features: string[];
  limits: {
    aiQueriesPerDay: number;
    projects: number;
    teamMembers: number;
    voiceMinutesPerDay: number;
  };
  mode: "dream" | "build";
}

export const TIERS: Record<Tier, TierConfig> = {
  explorer: {
    id: "explorer", name: "Explorer", price: "Free", priceMonthly: 0,
    features: ["Browse all knowledge", "5 AI queries/day", "Dream Builder", "Community access"],
    limits: { aiQueriesPerDay: 5, projects: 0, teamMembers: 1, voiceMinutesPerDay: 0 },
    mode: "dream",
  },
  pro: {
    id: "pro", name: "Pro", price: "$49/mo", priceMonthly: 49,
    features: ["Unlimited AI copilot", "5 projects", "Estimating + scheduling", "Compliance checks", "Full marketplace"],
    limits: { aiQueriesPerDay: Infinity, projects: 5, teamMembers: 1, voiceMinutesPerDay: 30 },
    mode: "build",
  },
  team: {
    id: "team", name: "Team", price: "$199/mo", priceMonthly: 199,
    features: ["Unlimited projects", "Team management", "Financial tools + CRM", "Voice field ops", "XR instructions"],
    limits: { aiQueriesPerDay: Infinity, projects: Infinity, teamMembers: 50, voiceMinutesPerDay: Infinity },
    mode: "build",
  },
  enterprise: {
    id: "enterprise", name: "Enterprise", price: "$499+/mo", priceMonthly: 499,
    features: ["White-label + SSO", "Robot integration API", "Advanced analytics", "Dedicated support"],
    limits: { aiQueriesPerDay: Infinity, projects: Infinity, teamMembers: Infinity, voiceMinutesPerDay: Infinity },
    mode: "build",
  },
  platform: {
    id: "platform", name: "Platform", price: "Custom", priceMonthly: 0,
    features: ["API access", "Data licensing", "MCP server", "Bulk knowledge", "SLA", "Co-development"],
    limits: { aiQueriesPerDay: Infinity, projects: Infinity, teamMembers: Infinity, voiceMinutesPerDay: Infinity },
    mode: "build",
  },
};

// ─── USER STATE ───
export interface User {
  id: string;
  email: string;
  name: string;
  tier: Tier;
  orgId?: string;
  orgName?: string;
}

export interface AuthContextType {
  user: User | null;
  tier: TierConfig;
  isAuthenticated: boolean;
  isDreamMode: boolean;
  isBuildMode: boolean;
  aiQueriesUsedToday: number;
  canUseAI: boolean;
  canCreateProject: boolean;
  projectCount: number;
  login: () => void;
  logout: () => void;
  upgrade: (tier: Tier) => void;
  incrementAIQuery: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    // Return mock context when outside provider (development convenience)
    return {
      user: null,
      tier: TIERS.explorer,
      isAuthenticated: false,
      isDreamMode: true,
      isBuildMode: false,
      aiQueriesUsedToday: 0,
      canUseAI: true,
      canCreateProject: false,
      projectCount: 0,
      login: () => {},
      logout: () => {},
      upgrade: () => {},
      incrementAIQuery: () => {},
    };
  }
  return ctx;
}

// ─── PROVIDER ───
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [aiQueries, setAIQueries] = useState(0);
  const [projectCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize auth state from Supabase session
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setUser({
            id: session.user.id,
            email: session.user.email || "",
            name: session.user.user_metadata?.name || session.user.email?.split("@")[0] || "Builder",
            tier: "explorer", // Default to explorer; Stripe integration will upgrade tiers
            orgId: session.user.user_metadata?.orgId,
            orgName: session.user.user_metadata?.orgName,
          });
        }
      } catch (error) {
        console.error("Failed to initialize auth:", error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (session?.user) {
          setUser({
            id: session.user.id,
            email: session.user.email || "",
            name: session.user.user_metadata?.name || session.user.email?.split("@")[0] || "Builder",
            tier: "explorer",
            orgId: session.user.user_metadata?.orgId,
            orgName: session.user.user_metadata?.orgName,
          });
        } else {
          setUser(null);
          setAIQueries(0);
        }
      }
    );

    return () => subscription?.unsubscribe();
  }, []);

  // Fetch subscription tier from API when user is authenticated
  useEffect(() => {
    const fetchSubscriptionTier = async () => {
      if (!user?.email) return;

      try {
        const response = await fetch(`/api/v1/stripe/subscription?email=${encodeURIComponent(user.email)}`);
        if (response.ok) {
          const data = await response.json();
          setUser(prevUser => {
            if (!prevUser) return prevUser;
            return { ...prevUser, tier: (data.tier as Tier) || "explorer" };
          });
        }
      } catch (error) {
        console.error("Failed to fetch subscription tier:", error);
      }
    };

    fetchSubscriptionTier();
  }, [user?.email]);

  const tier = TIERS[user?.tier || "explorer"];
  const isAuthenticated = !!user;
  const isDreamMode = tier.mode === "dream";
  const isBuildMode = tier.mode === "build";
  const canUseAI = aiQueries < tier.limits.aiQueriesPerDay;
  const canCreateProject = isBuildMode && projectCount < tier.limits.projects;

  const login = useCallback(() => {
    // Note: actual login happens in /login page
    // This is a placeholder for programmatic login if needed
    console.log("Use /login page for authentication");
  }, []);

  const logout = useCallback(async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setAIQueries(0);
    } catch (error) {
      console.error("Failed to sign out:", error);
    }
  }, []);

  const upgrade = useCallback((newTier: Tier) => {
    // Stripe checkout will handle tier upgrades
    // This is a placeholder for future Stripe integration
    if (user) {
      setUser({ ...user, tier: newTier });
    }
  }, [user]);

  const incrementAIQuery = useCallback(() => {
    setAIQueries(q => q + 1);
  }, []);

  return (
    <AuthContext.Provider value={{
      user, tier, isAuthenticated, isDreamMode, isBuildMode,
      aiQueriesUsedToday: aiQueries, canUseAI, canCreateProject, projectCount,
      login, logout, upgrade, incrementAIQuery,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

// ─── GATING COMPONENT ───
// Wraps any BUILD-mode content with an upgrade prompt for DREAM-mode users
interface BuildGateProps {
  children: ReactNode;
  feature: string;
  requiredTier?: Tier;
}

export function BuildGate({ children, feature, requiredTier = "pro" }: BuildGateProps) {
  const { isBuildMode, tier, upgrade } = useAuth();

  if (isBuildMode && TIERS[tier.id].priceMonthly >= TIERS[requiredTier].priceMonthly) {
    return <>{children}</>;
  }

  return (
    <div className="text-center py-8 px-6" style={{ animation: "fadeIn 0.3s ease" }}>
      <div className="text-3xl mb-3">🔒</div>
      <h3 className="text-lg font-semibold mb-2">{feature} requires {TIERS[requiredTier].name}</h3>
      <p className="text-xs max-w-sm mx-auto mb-4" style={{ color: "var(--fg-secondary)" }}>
        Upgrade to {TIERS[requiredTier].name} ({TIERS[requiredTier].price}) to unlock {feature.toLowerCase()} and all BUILD mode features.
      </p>
      <button
        onClick={() => upgrade(requiredTier)}
        className="px-6 py-2.5 rounded-full text-white text-sm font-medium transition-all hover:scale-105"
        style={{ background: "#1D9E75" }}>
        Upgrade to {TIERS[requiredTier].name} →
      </button>
      <p className="text-[9px] mt-2" style={{ color: "var(--fg-tertiary)" }}>
        Dream Builder is free forever · BUILD mode starts at $49/mo
      </p>
    </div>
  );
}

// ─── AI RATE LIMITER ───
export function AIRateLimit({ children }: { children: ReactNode }) {
  const { canUseAI, tier, aiQueriesUsedToday, upgrade } = useAuth();

  if (canUseAI) return <>{children}</>;

  return (
    <div className="text-center py-6 px-4" style={{ animation: "fadeIn 0.3s ease" }}>
      <div className="text-2xl mb-2">⏳</div>
      <h3 className="text-sm font-semibold mb-1">Daily AI limit reached</h3>
      <p className="text-[11px] mb-3" style={{ color: "var(--fg-secondary)" }}>
        You&apos;ve used {aiQueriesUsedToday} of {tier.limits.aiQueriesPerDay} AI queries today.
        Upgrade to Pro for unlimited.
      </p>
      <button
        onClick={() => upgrade("pro")}
        className="px-5 py-2 rounded-full text-white text-xs font-medium transition-all hover:scale-105"
        style={{ background: "#1D9E75" }}>
        Upgrade to Pro — $49/mo →
      </button>
    </div>
  );
}
