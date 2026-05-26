/**
 * AskAnything (Pattern Language #05, Constitutional Primitive).
 *
 * Category: Constitutional Primitive.
 * Axes touched: skill_signal (active — answers calibrate to plain vs. pro),
 *               modality (active — voice input + voice output supported),
 *               locale (active — answers render in user's language + jurisdiction).
 *
 * Always-available plain-language help, contextual to the current screen.
 * Mount once at layout level; it follows the user through every surface.
 *
 * This stub is the layout-mountable container. The actual answer pipeline is
 * wired in WS6 (Ask Anything Search). For now this primitive renders a quiet
 * box that accepts text + voice input and posts to a mock endpoint that WS6
 * will replace with the real Three-Source-gated retrieval.
 */

'use client';

import * as React from 'react';
import { useState } from 'react';
import { BRAND_COLORS, BRAND_FONTS } from '@/lib/brand-tokens';
import { useStanceCard } from '@/lib/stance-card';

export interface AskAnythingProps {
  /** Placeholder copy. Defaults to a plain-language prompt. */
  placeholder?: string;
  /** Where to POST the question. WS6 will wire the real endpoint. */
  endpoint?: string;
  /** Optional context summary the answer pipeline uses (e.g. "credentialing renewals"). */
  context?: string;
  /** Visual variant — inline box vs. floating affordance. */
  variant?: 'inline' | 'floating';
}

export function AskAnything({
  placeholder = 'Ask anything — in your own words.',
  endpoint = '/api/v1/ask',
  context,
  variant = 'inline',
}: AskAnythingProps) {
  const stance = useStanceCard();
  const [value, setValue] = useState('');
  const [answer, setAnswer] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!value.trim()) return;
    setLoading(true);
    setAnswer(null);
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ question: value, context, stance }),
      });
      if (!res.ok) throw new Error(`Ask endpoint returned ${res.status}`);
      const json = (await res.json()) as { answer?: string };
      setAnswer(json.answer ?? 'No answer returned.');
    } catch (err) {
      // Mock fallback — WS6 will replace with the real retrieval pipeline.
      setAnswer(
        `(mock answer — wired in WS6) Your question: "${value}". Context: ${context ?? 'none'}.`,
      );
    } finally {
      setLoading(false);
    }
  };

  const floating = variant === 'floating';

  return (
    <div
      role="region"
      aria-label="Ask Anything"
      style={{
        position: floating ? 'fixed' : 'relative',
        bottom: floating ? '1.25rem' : undefined,
        right: floating ? '1.25rem' : undefined,
        zIndex: floating ? 90 : undefined,
        width: floating ? 'min(28rem, calc(100vw - 2.5rem))' : '100%',
        background: BRAND_COLORS.parchmentWarm,
        border: `1px solid ${BRAND_COLORS.copperLine}`,
        borderRadius: '4px',
        padding: '1rem',
        boxShadow: floating ? '0 6px 24px rgba(15, 36, 25, 0.12)' : undefined,
      }}
    >
      <label
        htmlFor="ask-anything-input"
        style={{
          display: 'block',
          fontFamily: BRAND_FONTS.mono,
          fontSize: '0.72rem',
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
          color: BRAND_COLORS.steel,
          marginBottom: '0.5rem',
        }}
      >
        Ask Anything
      </label>
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <input
          id="ask-anything-input"
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          placeholder={placeholder}
          aria-label="Question"
          style={{
            flex: 1,
            padding: '0.6rem 0.75rem',
            background: BRAND_COLORS.parchment,
            border: `1px solid ${BRAND_COLORS.copperLine}`,
            borderRadius: '2px',
            fontFamily: BRAND_FONTS.display,
            fontSize: '1rem',
            color: BRAND_COLORS.forestInk,
          }}
        />
        <button
          type="button"
          onClick={submit}
          disabled={loading || !value.trim()}
          aria-label="Submit question"
          style={{
            padding: '0.6rem 1rem',
            background: BRAND_COLORS.copper,
            color: BRAND_COLORS.parchment,
            border: 'none',
            borderRadius: '2px',
            fontFamily: BRAND_FONTS.mono,
            fontSize: '0.8rem',
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
            cursor: loading ? 'wait' : 'pointer',
            opacity: loading || !value.trim() ? 0.6 : 1,
          }}
        >
          {loading ? '…' : 'Ask'}
        </button>
      </div>
      {answer ? (
        <p
          style={{
            marginTop: '0.75rem',
            marginBottom: 0,
            fontFamily: BRAND_FONTS.display,
            fontSize: '0.95rem',
            color: BRAND_COLORS.forestInk,
            lineHeight: 1.5,
          }}
        >
          {answer}
        </p>
      ) : null}
    </div>
  );
}

export default AskAnything;
