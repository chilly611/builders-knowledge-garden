// SaveProjectButton â drop-in save button for any dream interface
// Shows save state, prompts sign-in for guests, shows "saved" confirmation
//
// Usage:
//   <SaveProjectButton
//     interfaceName="oracle"
//     getState={() => ({ answers, profile, renders })}
//     getTitle={() => `Oracle Dream â ${profile?.style || "Untitled"}`}
//   />

"use client";

import { useState, useCallback } from "react";
import { useDreamPersistence } from "@/lib/use-dream-persistence";

interface SaveProjectButtonProps {
  interfaceName: string;
  getState: () => Record<string, unknown>;
  getTitle?: () => string;
  getDescription?: () => string;
  style?: React.CSSProperties;
  compact?: boolean;
}

export default function SaveProjectButton({
  interfaceName,
  getState,
  getTitle,
  getDescription,
  style,
  compact = false,
}: SaveProjectButtonProps) {
  const {
    save,
    isSaving,
    lastSaved,
    isAuthenticated,
    promptSignIn,
  } = useDreamPersistence(interfaceName);

  const [showSaved, setShowSaved] = useState(false);

  const handleSave = useCallback(async () => {
    const state = getState();

    if (!isAuthenticated) {
      promptSignIn(state);
      return;
    }

    const title = getTitle?.() || `${interfaceName} Dream`;
    const description = getDescription?.();

    await save(state, { title, description });
    setShowSaved(true);
    setTimeout(() => setShowSaved(false), 2000);
  }, [getState, getTitle, getDescription, isAuthenticated, promptSignIn, save, interfaceName]);

  const label = isSaving
    ? "Saving..."
    : showSaved
    ? "Saved!"
    : !isAuthenticated
    ? "Save (Sign In)"
    : "Save Project";

  const icon = isSaving ? "â³" : showSaved ? "â" : "ð¾";

  return (
    <button
      onClick={handleSave}
      disabled={isSaving}
      title={lastSaved ? `Last saved: ${lastSaved.toLocaleTimeString()}` : "Save your project"}
      style={{
        display: "flex", alignItems: "center", gap: compact ? 4 : 8,
        padding: compact ? "6px 12px" : "10px 16px",
        borderRadius: 10,
        border: showSaved ? "1px solid #1D9E7540" : "1px solid var(--border, #e5e5e5)",
        background: showSaved ? "#1D9E7510" : "#fff",
        color: showSaved ? "#1D9E75" : "var(--fg, #111)",
        fontSize: compact ? 12 : 13,
        fontWeight: 600,
        cursor: isSaving ? "not-allowed" : "pointer",
        fontFamily: "inherit",
        transition: "all 0.2s",
        ...style,
      }}
    >
      <span style={{ fontSize: compact ? 14 : 16 }}>{icon}</span>
      {!compact && <span>{label}</span>}
    </button>
  );
}
