// useDreamPersistence â universal hook for saving/loading dream project state
// Works across ALL dream interfaces (sim, timemachine, elements, worldwalker, etc.)
//
// Usage:
//   const { projectId, save, load, isSaving, projects, promptSignIn } = useDreamPersistence("oracle");
//
// For authenticated users: saves to Supabase via /api/v1/saved-projects
// For guests: falls back to localStorage
// Prompts sign-in when guest tries to save (via AuthModal)

"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useAuth } from "@/lib/auth";
import { useAuthModal } from "@/components/AuthModal";
import { supabase } from "@/lib/supabase";

export interface SavedProject {
  id: string;
  title: string;
  description?: string;
  interface: string;
  interfaces_used: string[];
  state: Record<string, unknown>;
  outputs: Record<string, unknown>;
  growth_stage: string;
  thumbnail_url?: string;
  created_at: string;
  updated_at: string;
}

interface UseDreamPersistenceOptions {
  autoSaveInterval?: number; // ms, 0 to disable. Default: 30000 (30s)
  localStorageKey?: string; // custom localStorage key
}

export function useDreamPersistence(
  interfaceName: string,
  options: UseDreamPersistenceOptions = {}
) {
  const { autoSaveInterval = 30000, localStorageKey } = options;
  const { user, isAuthenticated } = useAuth();
  const { openAuthModal } = useAuthModal();

  const [projectId, setProjectId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [projects, setProjects] = useState<SavedProject[]>([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(false);

  const stateRef = useRef<Record<string, unknown>>({});
  const autoSaveTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lsKey = localStorageKey || `bkg-dream-${interfaceName}`;

  // Get auth headers for API calls
  const getAuthHeaders = useCallback(async (): Promise<HeadersInit> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) return {};
    return { Authorization: `Bearer ${session.access_token}` };
  }, []);

  // âââ SAVE âââ
  const save = useCallback(async (
    state: Record<string, unknown>,
    meta?: { title?: string; description?: string; outputs?: Record<string, unknown>; growth_stage?: string }
  ): Promise<string | null> => {
    stateRef.current = state;

    // Guest: save to localStorage
    if (!isAuthenticated) {
      try {
        const localData = {
          interface: interfaceName,
          state,
          outputs: meta?.outputs || {},
          title: meta?.title || "Untitled Dream",
          updated_at: new Date().toISOString(),
        };
        localStorage.setItem(lsKey, JSON.stringify(localData));
        setLastSaved(new Date());
        return null; // No project ID for localStorage
      } catch {
        console.warn("localStorage save failed");
        return null;
      }
    }

    // Authenticated: save to API
    setIsSaving(true);
    try {
      const headers = await getAuthHeaders();
      const body: Record<string, unknown> = {
        title: meta?.title || "Untitled Dream",
        description: meta?.description,
        interface: interfaceName,
        interfaces_used: [interfaceName],
        state,
        outputs: meta?.outputs || {},
        growth_stage: meta?.growth_stage || "seed",
      };

      if (projectId) {
        // Update existing
        body.id = projectId;
        const res = await fetch("/api/v1/saved-projects", {
          method: "PATCH",
          headers: { "Content-Type": "application/json", ...headers },
          body: JSON.stringify(body),
        });
        if (res.ok) {
          setLastSaved(new Date());
          return projectId;
        }
      } else {
        // Create new
        const res = await fetch("/api/v1/saved-projects", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...headers },
          body: JSON.stringify(body),
        });
        if (res.ok) {
          const data = await res.json();
          setProjectId(data.project.id);
          setLastSaved(new Date());
          return data.project.id;
        }
      }
    } catch (err) {
      console.error("Save failed:", err);
    } finally {
      setIsSaving(false);
    }
    return null;
  }, [isAuthenticated, projectId, interfaceName, lsKey, getAuthHeaders]);

  // âââ LOAD âââ
  const load = useCallback(async (id?: string): Promise<Record<string, unknown> | null> => {
    // Load specific project by ID
    if (id && isAuthenticated) {
      try {
        const headers = await getAuthHeaders();
        const res = await fetch(`/api/v1/saved-projects?id=${id}`, {
          headers: { ...headers },
        });
        if (res.ok) {
          const data = await res.json();
          setProjectId(data.project.id);
          stateRef.current = data.project.state;
          return data.project.state;
        }
      } catch (err) {
        console.error("Load failed:", err);
      }
      return null;
    }

    // Load from localStorage (guest fallback)
    try {
      const raw = localStorage.getItem(lsKey);
      if (raw) {
        const data = JSON.parse(raw);
        stateRef.current = data.state;
        return data.state;
      }
    } catch {
      // Ignore parse errors
    }
    return null;
  }, [isAuthenticated, lsKey, getAuthHeaders]);

  // âââ LIST USER'S PROJECTS âââ
  const listProjects = useCallback(async () => {
    if (!isAuthenticated) {
      setProjects([]);
      return;
    }
    setIsLoadingProjects(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/v1/saved-projects?interface=${interfaceName}`, {
        headers: { ...headers },
      });
      if (res.ok) {
        const data = await res.json();
        setProjects(data.projects || []);
      }
    } catch (err) {
      console.error("List projects failed:", err);
    } finally {
      setIsLoadingProjects(false);
    }
  }, [isAuthenticated, interfaceName, getAuthHeaders]);

  // âââ DELETE PROJECT âââ
  const deleteProject = useCallback(async (id: string): Promise<boolean> => {
    if (!isAuthenticated) return false;
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/v1/saved-projects?id=${id}`, {
        method: "DELETE",
        headers: { ...headers },
      });
      if (res.ok) {
        setProjects(prev => prev.filter(p => p.id !== id));
        if (projectId === id) setProjectId(null);
        return true;
      }
    } catch (err) {
      console.error("Delete failed:", err);
    }
    return false;
  }, [isAuthenticated, projectId, getAuthHeaders]);

  // âââ PROMPT SIGN IN âââ
  // Call this when a guest tries to save â opens the auth modal
  const promptSignIn = useCallback((pendingState?: Record<string, unknown>) => {
    // Save to localStorage first so they don't lose work
    if (pendingState) {
      try {
        localStorage.setItem(lsKey, JSON.stringify({
          interface: interfaceName,
          state: pendingState,
          updated_at: new Date().toISOString(),
        }));
      } catch {
        // Ignore
      }
    }
    openAuthModal({
      message: "Sign in to save your dream and come back to it later",
      onSuccess: () => {
        // After sign-in, migrate localStorage data to the API
        listProjects();
      },
    });
  }, [openAuthModal, lsKey, interfaceName, listProjects]);

  // âââ AUTO-SAVE âââ
  useEffect(() => {
    if (!autoSaveInterval || autoSaveInterval <= 0) return;
    if (!isAuthenticated || !projectId) return;

    autoSaveTimerRef.current = setInterval(() => {
      if (Object.keys(stateRef.current).length > 0) {
        save(stateRef.current);
      }
    }, autoSaveInterval);

    return () => {
      if (autoSaveTimerRef.current) clearInterval(autoSaveTimerRef.current);
    };
  }, [autoSaveInterval, isAuthenticated, projectId, save]);

  // Load projects on auth change
  useEffect(() => {
    if (isAuthenticated) {
      listProjects();
    }
  }, [isAuthenticated, listProjects]);

  return {
    projectId,
    setProjectId,
    save,
    load,
    isSaving,
    lastSaved,
    projects,
    isLoadingProjects,
    listProjects,
    deleteProject,
    promptSignIn,
    isAuthenticated,
    user,
  };
}
