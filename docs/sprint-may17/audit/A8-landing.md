# A8 — Landing Experiences Audit

## Status summary

Per Agent A10's parallel sweep: `/cinematic` and `/manifesto` BOTH return **200 OK** on prod. They exist; this auditor's WebFetch was provenance-blocked from those paths. Visual audit still needed at the 375px mobile viewport.

## Routes confirmed working (HTML fetches, response only)

- **`/`** (root): Live. Responsive hero "Every phase of building. One platform." Proper meta tags, OG images. **Status:** ship-ready.
- **`/launch`** (Smart Project Launcher): Live. "Smart Project Launcher" wizard with 4-mission flow + 12 building-type selector + cost ranges. Stacked emoji + text pattern → mobile-compatible. **Status:** ship-ready. **CAVEAT** per A2 audit: this page does NOT persist projects to Supabase. Keep out of demo path.
- **`/dream`** + **`/dream/oracle`**: Live (per A10's 200s). Copy refresh shipped 2026-05-18 (commit `3e9393e`) — palm-reader register removed.

## Routes that A10 confirmed return 200 but this auditor could not WebFetch

- **`/cinematic`** — 200, content-type text/html. Visual audit still needed.
- **`/manifesto`** — 200, content-type text/html. Visual audit still needed.

## Light-theme compliance

Cannot fully audit without browser viewport. Root + `/launch` use a dark hero in their fetched HTML — possibly a brand choice, possibly drift from the "Light theme is mandatory" rule. **Recommendation: visual inspection on real mobile browser before Tuesday dress rehearsal.**

## Three chromes (per CLAUDE.md)

- Green (Knowledge Garden): `#1D9E75`
- Warm (Dream): `#D85A30` + `#C4A44A`
- Red (Killer App): `#E8443A`

Fetched HTML does not surface inline chrome colors; need visual inspection.

## Asset integrity

No broken images detected in text fetches. Logo URL validated. OG image URLs present. No Lorem Ipsum found.

## Mobile viewport (375px)

Untested. Root uses `viewport: width=device-width, initial-scale=1, maximum-scale=1`. Launch page emoji-text pattern suggests responsive design but needs rendering audit.

## Demo-day recommendation

1. **Clarify cinematic + manifesto intent.** Are they investor-facing? If yes, walk them on real Safari + Chrome at 375px Tuesday evening. If no, drop them from the audit scope.
2. **Mobile rendering pass.** Test root, `/dream/oracle`, `/killerapp`, `/killerapp/workflows/*` at 375px. Check chrome color compliance and three-chrome separation.
3. **Verify `/dream/oracle` copy ship.** Confirm post-2026-05-18 commit `3e9393e` — "Seven questions. We'll sketch the home you keep almost-describing." replaces the old palm-reader intro on real mobile, not just SSR.

## Blockers for demo

None detected on the demo path. Cinematic/manifesto are aspirational landing surfaces, not part of the 4-minute Act-1-through-Act-4 narrative.
