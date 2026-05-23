'use client';

// /billing — STRIPE-WIRE
// ======================
// Shows the current tier + status, an "Upgrade" path that POSTs to
// /api/v1/stripe/checkout, and a "Manage billing" button that POSTs
// to /api/v1/stripe/portal. Surfaces a test-mode banner so operators
// don't confuse a sandbox session with a real one.

import React, { useEffect, useState, useCallback } from 'react';
import { getSupabaseBrowser } from '@/lib/supabase-browser';

interface SubscriptionState {
  tier: string;
  status: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  stripe_configured: boolean;
}

const TIER_LABEL: Record<string, string> = {
  free: 'Free',
  explorer: 'Free',
  pro: 'Pro — $49/mo',
  team: 'Team — $149/mo',
  enterprise: 'Enterprise',
};

const UPGRADE_TIERS: Array<{ slug: 'pro' | 'team' | 'enterprise'; label: string; price: string }> = [
  { slug: 'pro', label: 'Pro', price: '$49 / month' },
  { slug: 'team', label: 'Team', price: '$149 / month (up to 10 users)' },
  { slug: 'enterprise', label: 'Enterprise', price: 'Contact sales' },
];

export default function BillingPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sub, setSub] = useState<SubscriptionState | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [stripeMode, setStripeMode] = useState<'test' | 'live' | 'unconfigured' | 'unknown'>('unknown');

  const authedFetch = useCallback(async (input: string, init?: RequestInit) => {
    const supa = getSupabaseBrowser();
    const { data } = await supa.auth.getSession();
    const token = data.session?.access_token;
    const headers = new Headers(init?.headers);
    headers.set('content-type', 'application/json');
    if (token) headers.set('authorization', `Bearer ${token}`);
    return fetch(input, { ...init, headers });
  }, []);

  const loadState = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await authedFetch('/api/v1/stripe/subscription');
      if (!res.ok) throw new Error(`subscription_fetch_${res.status}`);
      const json: SubscriptionState = await res.json();
      setSub(json);

      // Healthcheck tells us if we're in test/live mode. Best-effort.
      try {
        const hc = await fetch('/api/v1/healthcheck?detailed=1', {
          headers: { authorization: (await authedFetch('/__noop')).headers.get('authorization') || '' },
        });
        if (hc.ok) {
          const h = await hc.json();
          const m = h?.checks?.stripe?.value?.mode;
          if (m) setStripeMode(m);
        }
      } catch {
        // healthcheck is detailed-only authed, fine to skip
      }
    } catch (e: any) {
      setError(e?.message || 'failed_to_load');
    } finally {
      setLoading(false);
    }
  }, [authedFetch]);

  useEffect(() => {
    loadState();
  }, [loadState]);

  async function handleUpgrade(tier: 'pro' | 'team' | 'enterprise') {
    if (tier === 'enterprise') {
      window.location.href = 'mailto:hello@theknowledgegardens.com?subject=BKG%20Enterprise%20inquiry';
      return;
    }
    setBusy(`upgrade:${tier}`);
    try {
      const res = await authedFetch('/api/v1/stripe/checkout', {
        method: 'POST',
        body: JSON.stringify({ tier, interval: 'monthly' }),
      });
      if (res.status === 503) {
        setError('Stripe is not configured. Add STRIPE_SECRET_KEY in Vercel.');
        return;
      }
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'checkout_failed');
      if (json.url) {
        window.location.href = json.url;
      } else {
        throw new Error('no_checkout_url');
      }
    } catch (e: any) {
      setError(e?.message || 'checkout_failed');
    } finally {
      setBusy(null);
    }
  }

  async function handleManage() {
    setBusy('manage');
    try {
      const res = await authedFetch('/api/v1/stripe/portal', { method: 'POST' });
      if (res.status === 503) {
        setError('Stripe is not configured.');
        return;
      }
      if (res.status === 404) {
        setError('No subscription found yet — start by upgrading first.');
        return;
      }
      if (res.status === 409) {
        setError(
          'Customer Portal is not activated in the Stripe dashboard. Visit Stripe → Settings → Billing → Customer Portal and activate.',
        );
        return;
      }
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'portal_failed');
      if (json.url) {
        window.location.href = json.url;
      }
    } catch (e: any) {
      setError(e?.message || 'portal_failed');
    } finally {
      setBusy(null);
    }
  }

  const currentTier = sub?.tier || 'free';
  const tierLabel = TIER_LABEL[currentTier] || currentTier;
  const hasActiveSub =
    sub?.status === 'active' || sub?.status === 'trialing' || sub?.status === 'past_due';

  return (
    <main style={{ maxWidth: 880, margin: '0 auto', padding: '40px 24px', color: '#1a1a1a' }}>
      <h1 style={{ fontSize: 36, fontWeight: 700, marginBottom: 8 }}>Billing</h1>
      <p style={{ color: '#666', marginBottom: 24 }}>
        Manage your BKG subscription, payment method, and invoices.
      </p>

      {stripeMode === 'test' && (
        <div
          style={{
            background: '#fff8d4',
            border: '1px solid #f0c419',
            borderRadius: 8,
            padding: '12px 16px',
            marginBottom: 24,
            fontSize: 14,
          }}
        >
          <strong>Test mode</strong> — this Stripe environment is using a <code>sk_test_…</code> key.
          No real charges will be made; cards entered here must be Stripe test cards.
        </div>
      )}
      {stripeMode === 'unconfigured' && (
        <div
          style={{
            background: '#ffe6e6',
            border: '1px solid #d93025',
            borderRadius: 8,
            padding: '12px 16px',
            marginBottom: 24,
            fontSize: 14,
          }}
        >
          <strong>Stripe not configured</strong> — billing is currently disabled. Set{' '}
          <code>STRIPE_SECRET_KEY</code> in Vercel to enable.
        </div>
      )}

      {loading && <p>Loading subscription…</p>}

      {error && (
        <div
          style={{
            background: '#ffe6e6',
            border: '1px solid #d93025',
            borderRadius: 8,
            padding: '12px 16px',
            marginBottom: 24,
            color: '#a32115',
            fontSize: 14,
          }}
        >
          {error}
        </div>
      )}

      {!loading && sub && (
        <>
          <section
            style={{
              border: '1px solid #e6e6e6',
              borderRadius: 12,
              padding: 24,
              marginBottom: 32,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <div style={{ fontSize: 13, color: '#666', textTransform: 'uppercase', letterSpacing: 1 }}>
                  Current plan
                </div>
                <div style={{ fontSize: 28, fontWeight: 600 }}>{tierLabel}</div>
                <div style={{ fontSize: 14, color: '#444', marginTop: 4 }}>
                  Status: <strong>{sub.status}</strong>
                  {sub.cancel_at_period_end && (
                    <span style={{ marginLeft: 8, color: '#a32115' }}>
                      (cancels at period end)
                    </span>
                  )}
                </div>
                {sub.current_period_end && (
                  <div style={{ fontSize: 13, color: '#666', marginTop: 4 }}>
                    Renews:{' '}
                    {new Date(sub.current_period_end).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </div>
                )}
              </div>
              {hasActiveSub && (
                <button
                  onClick={handleManage}
                  disabled={busy === 'manage'}
                  style={{
                    padding: '12px 20px',
                    borderRadius: 8,
                    border: '1px solid #1a1a1a',
                    background: '#1a1a1a',
                    color: '#fff',
                    fontWeight: 500,
                    cursor: busy === 'manage' ? 'not-allowed' : 'pointer',
                  }}
                >
                  {busy === 'manage' ? 'Opening…' : 'Manage billing'}
                </button>
              )}
            </div>
          </section>

          <section>
            <h2 style={{ fontSize: 22, fontWeight: 600, marginBottom: 16 }}>Upgrade</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
              {UPGRADE_TIERS.map((t) => {
                const isCurrent = currentTier === t.slug;
                return (
                  <div
                    key={t.slug}
                    style={{
                      border: isCurrent ? '2px solid #2a7a2a' : '1px solid #e6e6e6',
                      borderRadius: 12,
                      padding: 20,
                    }}
                  >
                    <div style={{ fontSize: 18, fontWeight: 600 }}>{t.label}</div>
                    <div style={{ color: '#666', fontSize: 14, margin: '6px 0 16px' }}>{t.price}</div>
                    {isCurrent ? (
                      <div style={{ color: '#2a7a2a', fontWeight: 500, fontSize: 14 }}>Your current plan</div>
                    ) : (
                      <button
                        onClick={() => handleUpgrade(t.slug)}
                        disabled={busy === `upgrade:${t.slug}` || !sub.stripe_configured}
                        style={{
                          width: '100%',
                          padding: '10px 16px',
                          borderRadius: 8,
                          border: '1px solid #1a1a1a',
                          background: 'transparent',
                          color: '#1a1a1a',
                          fontWeight: 500,
                          cursor: !sub.stripe_configured ? 'not-allowed' : 'pointer',
                          opacity: !sub.stripe_configured ? 0.5 : 1,
                        }}
                      >
                        {busy === `upgrade:${t.slug}`
                          ? 'Redirecting…'
                          : t.slug === 'enterprise'
                            ? 'Contact sales'
                            : `Upgrade to ${t.label}`}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        </>
      )}
    </main>
  );
}
