'use client';

/**
 * AskTheGarden — the magic, multimodal capture body inside the compass-nav
 * cluster. Text, photo, video, or file. Every input is persisted to the
 * user's account memory in Supabase (copilot_interactions + storage via
 * project_attachments), tagged to project + lane, then acknowledged in-UI.
 * A "recently sent" list reads back from Supabase so captures survive reload.
 *
 * NOT a dead button: the send path POSTs to /api/garden/capture (service-role
 * insert, server-side) and only acknowledges after the server confirms.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Ico } from './icons';
import type { ShellConfig } from './types';

interface RecentItem { id: string; query: string; created_at: string; has_attachment: boolean; }

const KINDS = [
  { id: 'photo', label: 'Photo', accept: 'image/*', icon: Ico.camera },
  { id: 'video', label: 'Video', accept: 'video/*', icon: Ico.video },
  { id: 'file', label: 'File', accept: 'image/*,video/*,.pdf,.doc,.docx,.txt,.csv,.heic', icon: Ico.clip },
] as const;

function whenLabel(iso: string): string {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return '';
  const diff = Date.now() - t;
  const min = Math.round(diff / 60000);
  if (min < 1) return 'now';
  if (min < 60) return `${min}m`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h`;
  return `${Math.round(hr / 24)}d`;
}

export function AskTheGarden({ config }: { config: ShellConfig }) {
  const pathname = usePathname() ?? '';
  const [text, setText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [errMsg, setErrMsg] = useState('');
  const [recent, setRecent] = useState<RecentItem[]>([]);
  const inputs = useRef<Record<string, HTMLInputElement | null>>({});

  const authHeader = useCallback(async (): Promise<Record<string, string>> => {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, []);

  const loadRecent = useCallback(async () => {
    try {
      const headers = await authHeader();
      const qs = new URLSearchParams();
      if (config.projectId) qs.set('projectId', config.projectId);
      qs.set('lane', config.laneSlug);
      const res = await fetch(`/api/garden/capture?${qs.toString()}`, { headers });
      if (!res.ok) return;
      const json = (await res.json()) as { items?: RecentItem[] };
      setRecent(json.items ?? []);
    } catch {
      /* recent list is best-effort */
    }
  }, [authHeader, config.projectId, config.laneSlug]);

  useEffect(() => { void loadRecent(); }, [loadRecent]);

  const canSend = (text.trim().length > 0 || !!file) && status !== 'sending';

  async function send() {
    if (!canSend) return;
    setStatus('sending');
    setErrMsg('');
    try {
      const form = new FormData();
      form.set('text', text.trim());
      form.set('lane', config.laneSlug);
      form.set('surface', pathname);
      if (config.projectId) form.set('projectId', config.projectId);
      if (config.projectName) form.set('projectName', config.projectName);
      if (file) form.set('file', file);
      const headers = await authHeader();
      const res = await fetch('/api/garden/capture', { method: 'POST', headers, body: form });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error((j as { error?: string }).error || `capture ${res.status}`);
      }
      setText('');
      setFile(null);
      setStatus('sent');
      void loadRecent();
      window.setTimeout(() => setStatus((s) => (s === 'sent' ? 'idle' : s)), 4000);
    } catch (e) {
      console.error('[AskTheGarden] capture failed:', e);
      setErrMsg(e instanceof Error ? e.message : 'Could not save');
      setStatus('error');
    }
  }

  return (
    <div className="ag-form">
      <textarea
        className="ag-textarea"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Ask or tell the garden — a question, a note, something you noticed…"
        onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') void send(); }}
      />

      <div className="ag-kinds">
        {KINDS.map((k) => (
          <label key={k.id} className="ag-chip">
            <k.icon /> {k.label}
            <input
              ref={(el) => { inputs.current[k.id] = el; }}
              type="file"
              accept={k.accept}
              onChange={(e) => { const f = e.target.files?.[0] ?? null; if (f) setFile(f); }}
            />
          </label>
        ))}
      </div>

      {file && (
        <div className="ag-file">
          <span className="ag-file-name">{file.name}</span>
          <button type="button" className="ag-file-x" aria-label="Remove file" onClick={() => setFile(null)}>✕</button>
        </div>
      )}

      <div className="ag-foot">
        {status === 'sent' ? (
          <span className="ag-ack"><span className="pip" /> Saved to your garden</span>
        ) : status === 'error' ? (
          <span className="ag-err">{errMsg || 'Could not save — try again'}</span>
        ) : (
          <span className="ag-hint">Goes to your account memory · tagged to {config.laneLabel}</span>
        )}
        <button type="button" className="ag-send" disabled={!canSend} onClick={() => void send()}>
          {status === 'sending' ? 'Saving…' : 'Send'}
        </button>
      </div>

      {recent.length > 0 && (
        <div className="ag-recent">
          {recent.map((r) => (
            <div key={r.id} className="ag-recent-item">
              <span className="ag-recent-when">{whenLabel(r.created_at)}</span>
              <span className="ag-recent-q">{r.has_attachment ? '📎 ' : ''}{r.query}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default AskTheGarden;
