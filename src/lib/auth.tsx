// Builder's Knowledge Garden — Auth & Subscription Context
// DREAM (free) vs BUILD (paid) gating
// Mock mode works without Clerk/Stripe keys for development
// When keys are added, swap mock implementations for real ones

"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";

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
  // Mock auth state — replace with Clerk when keys arrive
  const [user, setUser] = useState<User | null>(null);
  const [aiQueries, setAIQueries] = useState(0);
  const [projectCount] = useState(0);

  const tier = TIERS[user?.tier || "explorer"];
  const isAuthenticated = !!user;
  const isDreamMode = tier.mode === "dream";
  const isBuildMode = tier.mode === "build";
  const canUseAI = aiQueries < tier.limits.aiQueriesPerDay;
  const canCreateProject = isBuildMode && projectCount < tier.limits.projects;

  const login = useCallback(() => {
    // Mock login — Clerk will handle this
    setUser({
      id: "mock-user-1",
      email: "builder@example.com",
      name: "Demo Builder",
      tier: "explorer",
    });
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setAIQueries(0);
  }, []);

  const upgrade = useCallback((newTier: Tier) => {
    // Mock upgrade — Stripe checkout will handle this
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
