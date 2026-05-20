# /intro — Cross-Browser Smoke Notes

**Owner:** Claude Code · **Last updated:** 2026-05-19 PT (template only — waiting for first /intro deploy)

Once `/intro` ships from Cowork, this file captures per-browser rendering deltas. Cowork can then pick up batch fixes.

## How to read

- ✅ = renders + animates as spec
- ⚠️ = renders but with a noticeable delta (timing, easing, paint flash)
- ❌ = broken / blocking
- _-_ = not yet tested

## Status matrix

| Act | Spec target | Chrome (Mac) | Safari (Mac) | Firefox (Mac) | Notes |
|---|---|---|---|---|---|
| 1 — Umbrella (0:00 → 0:08) | Logomark fade-up + tagline typewriter + 3-chrome orbit | _-_ | _-_ | _-_ | _waiting on first deploy_ |
| 2 — Problem (0:08 → 0:20) | 4 vignettes cross-dissolved | _-_ | _-_ | _-_ | _waiting on first deploy_ |
| 3 — #aikidotheAI (0:20 → 0:50) | Split-screen sequenced reveal | _-_ | _-_ | _-_ | _waiting on first deploy_ |
| 4 — Killer app live (0:50 → 1:10) | Iframe to `/killerapp/budget?...&hideShell=1` | _-_ | _-_ | _-_ | _waiting on first deploy_ |
| 5 — Vision (1:10 → 1:22) | 3 chromes explode + 5 future verticals | _-_ | _-_ | _-_ | _waiting on first deploy_ |

## Cross-cutting checks

- [ ] `prefers-reduced-motion` honored on all 3 browsers
- [ ] `Esc` skips on all 3 browsers
- [ ] `Space` pauses on all 3 browsers
- [ ] Final CTAs (`Start building →`, `Show me the demo project →`) link correctly

## Open polish items (for Cowork to sweep)

_(none yet)_
