'use client';

/**
 * MakeThisRealButton — Dream Builder → Killer App handoff (C8, 2026-05-18).
 *
 * Per /docs/sprint-may17/specs/B8-make-this-real.md.
 *
 * The seam between dreaming up a project and starting to build it:
 * tap → POST /api/v1/projects → set bkg-active-project localStorage →
 * fire genesis Time Machine snapshot → navigate to /killerapp?project=<id>.
 *
 * Disabled until rawInput non-empty. Loading spinner during POST.
 * Inline error on failure (user retries; input is preserved by parent).
 */

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { createSnapshot } from '@/lib/time-machine';

interface MakeThisRealButtonProps {
  /** The user's raw scope text. Required (non-empty) to enable button. */
  rawInput: string;
  /** Optional AI summary from the dream phase (e.g. profile.overallVibe). */
  aiSummary?: string | null;
  /** Optional jurisdiction string (e.g. "Marin County, CA"). */
  jurisdiction?: string | null;
  /** Optional project_type string (e.g. profile.aestheticDNA). */
  projectType?: string | null;
  /** Optional label override. Defaults to "Make This Real →". */
  label?: string;
  /** Optional onError to surface errors to parent UI. */
  onError?: (msg: string) => void;
}

const ACTIVE_PROJECT_KEY = 'bkg-active-project';

async function authedFetch(input: RequestInfo, init: RequestInit = {}) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  const headers = new Headers(init.headers || {});
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (!headers.has('Content-Type') && init.body) {
    headers.set('Content-Type', 'application/json');
  }
  return fetch(input, { ...init, headers });
}

export default function MakeThisRealButton({
  rawInput,
  aiSummary,
  jurisdiction,
  projectType,
  label = 'Make This Real →',
  onError,
}: MakeThisRealButtonProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const disabled = !rawInput.trim() || saving;

  const handleClick = useCallback(async () => {
    if (!rawInput.trim()) return;
    setSaving(true);
    setLocalError(null);
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      const res = await authedFetch('/api/v1/projects', {
        method: 'POST',
        body: JSON.stringify({
          raw_input: rawInput.trim(),
          jurisdiction: jurisdiction ?? null,
          project_type: projectType ?? null,
          notes: aiSummary ?? null,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (res.status === 401) {
        const msg = 'Sign in to save your dream.';
        setLocalError(msg);
        onError?.(msg);
        setSaving(false);
        return;
      }
      if (!res.ok) {
        const msg = 'Couldn’t save the project — try again.';
        setLocalError(msg);
        onError?.(msg);
        setSaving(false);
        return;
      }

      const json = (await res.json()) as { project?: { id: string } };
      const newId = json.project?.id;
      if (!newId) {
        const msg = 'No project id returned. Try again.';
        setLocalError(msg);
        onError?.(msg);
        setSaving(false);
        return;
      }

      // Atomic: localStorage write before navigation so the destination
      // sees the project on first paint.
      try {
        window.localStorage.setItem(ACTIVE_PROJECT_KEY, newId);
      } catch {
        // ignore
      }

      // Genesis Time Machine snapshot before navigation. Swallow failures.
      try {
        createSnapshot(
          newId,
          'manual_save',
          1,
          'Genesis — from Dream Builder',
          'dream-builder'
        );
      } catch (e) {
        console.warn('Genesis snapshot write failed', e);
      }

      // Broadcast for any open tabs / siblings.
      try {
        window.dispatchEvent(
          new CustomEvent('bkg:project:changed', { detail: { id: newId } })
        );
      } catch {
        // ignore
      }

      router.push(`/killerapp?project=${encodeURIComponent(newId)}`);
    } catch (e) {
      const msg =
        e instanceof Error && e.name === 'AbortError'
          ? 'Took too long — try again.'
          : 'Couldn’t save the project — try again.';
      setLocalError(msg);
      onError?.(msg);
      setSaving(false);
    }
  }, [rawInput, jurisdiction, projectType, aiSummary, router, onError]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%' }}>
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled}
        title={disabled && !saving ? 'Tell me what you want to build first.' : undefined}
        style={{
          width: '100%',
          maxWidth: 480,
          margin: '24px auto 0',
          padding: '0 24px',
          height: 56,
          borderRadius: 12,
          border: 'none',
          background: '#D85A30',
          color: '#fff',
          fontFamily: 'var(--font-archivo), system-ui, sans-serif',
          fontWeight: 600,
          fontSize: 16,
          letterSpacing: 0.2,
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.55 : 1,
          transition: 'opacity 0.18s ease, transform 0.18s ease',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
        }}
        onMouseEnter={(e) => {
          if (!disabled) e.currentTarget.style.transform = 'translateY(-1px)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
        }}
      >
        {saving ? (
          <>
            <span
              aria-hidden
              style={{
                width: 14,
                height: 14,
                borderRadius: '50%',
                border: '2px solid rgba(255,255,255,0.4)',
                borderTopColor: '#fff',
                animation: 'bkg-mtr-spin 0.8s linear infinite',
              }}
            />
            <span>Saving your dream…</span>
          </>
        ) : (
          label
        )}
      </button>
      {localError && (
        <p
          role="alert"
          style={{
            margin: '4px auto 0',
            maxWidth: 480,
            fontSize: 13,
            color: '#C0392B',
            textAlign: 'center',
            fontFamily: 'var(--font-archivo), system-ui, sans-serif',
          }}
        >
          {localError}
        </p>
      )}
      <style jsx>{`
        @keyframes bkg-mtr-spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}
