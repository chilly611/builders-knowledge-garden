# [WS1] Presentation: Deep-dive Pieces 13–20 (Modality Mirror → Stance Card)

## The Moat

> The RSI Heartbeat is the platform. One self-improving knowledge graph per garden, ingesting source data on a domain cadence, re-verifying every entity, surfacing freshness on every claim, learning from use. The platform doesn't hold knowledge — it improves itself in public. Every other platform in our space holds static data and ages. We get more right every week. That is the moat in the AI era.

## Summary

Replaces the "Pieces 13 — 20 forthcoming" closing note in the presentation site with eight full `.pl-piece-detail` deep-dive blocks, completing the 20-piece Pattern Language. Each block follows the locked piece-12 template: header + plain-English + three BKG examples with inline parchment/copper SVG mini-mockups + 14-axis dot row + why-it-matters. CSS is not touched.

## Files changed

- `docs/strategy/the-knowledge-gardens-os.html`

## Pieces added (in order)

1. **13 · Modality Mirror** — visual / voice / gestural / agent-API renderings. Examples: Daily Field Log, project setup, Equipment Schedule. Primary axes: Modality, Device class.
2. **14 · Tempo Adapt** — primitives breathe per time pressure. Examples: L&I compliance (32d vs 2d), Field Log (sunny vs thunderstorm), Pay App (day 25 vs day 30). Primary axis: Tempo.
3. **15 · Cultural Render** — language / units / jurisdiction / currency as data. Examples: Equipment Schedule (Phoenix vs Monterrey), Permit search (CA CBC vs TX IBC), Pay App (G702/USD vs CCDC 12/CAD). Primary axis: Cultural frame.
4. **16 · Accessibility Adapt** — color/motor/cognitive/neurodivergent profiles operationalized. Examples: budget cockpit (default vs low-vision 1.4×), Estimating flow (default vs quiet mode one-task-per-screen), mobile Field Log (default vs motor-friendly thumb targets). Primary axis: Accessibility.
5. **17 · Cross-Surface Bridge** — context flows Dream → Garden → Killer App. Examples: Dream sketch → Pay App phase anchor, Code citation → Plan compliance worksheet, Field Log countertop note → supplier marketplace. Primary axis: Surface.
6. **18 · Lifecycle Memory** — projects live years; the platform remembers. Examples: Reflect stage (April '26 estimate vs April '27 final), Pay App with June-estimate variance callout, framer crew timeline (last project 4d vs this project 3.5d). Primary axis: Time horizon.
7. **19 · Trust Posture Adapt** — defensiveness scales inversely with user trust. Examples: 1st vs 50th submission (modal vs toast), new vs tenured listing rollout (4-step review vs 4 seconds), 1st export with three caveats vs 50th clean. Primary axis: Trust posture.
8. **20 · Stance Card** — the operational mechanism, 14-axis snapshot every primitive reads. Examples: homeowner Sat noon → F0 invitation; contractor Fri 5pm → F4 procurement; agent 2:14 UTC → F6 JSON-LD. Primary axes: Lane + Surface. **All 14 axis dots active** (the only piece where every dot is active — by design, since the Stance Card is the assembler).

## Hard-gates self-check

- [x] **All 8 pieces written, in order 13 → 20** — verified by grep on `<span class="num">(13|14|...|20)</span>` returning 8 sequential hits.
- [x] **Each block has header + plain English + 3 SVG examples + 14-axis dots + why-it-matters** — verified by structural diff against piece 12.
- [x] **CSS untouched** — `<style>` block still opens line 19, closes line 1310; no edits in that range.
- [x] **Piece 20 marks all 14 dots `active` and `lane` + `surface` as `primary`** — verified by reading the axis row of piece 20 in the diff.
- [x] **Closing "forthcoming" note removed** — `grep -c forthcoming` returns 0.
- [x] **HTML tag counts balanced** — see delta below.
- [x] **Brand spine respected** — every SVG uses `#F8F3EB` parchment fill, `#B87333` copper / `rgba(184,115,51,0.35)` hairlines, Cormorant Georgia italic for prose, monospace (Space Mono) for data labels, `#0F2419` forest-ink for text. No gradients, no shadows, no gold/navy/red outside brand spine, no emoji.
- [x] **No buzzwords** — no "revolutionize / disrupt / innovative / cutting-edge / leveraging / synergies / our AI thinks / trust us". (One use of "leverage" as a noun in "Memory is leverage" — idiomatic, kept.)
- [x] **Brand test passed** — every block was screened against "Would a curator at Royal Botanic Gardens AND a staff engineer at Stripe both respect this?" Examples lean on concrete user-state (Saturday noon, Friday 5pm, 2:14 UTC; 12 tons vs 42 kW; G702 vs CCDC 12), not abstractions.

## Tag-balance delta

| Tag | Before | After | Delta |
|---|---|---|---|
| `<div` / `</div>` | 528 / 528 | 671 / 671 | +143 / +143 (balanced) |
| `<svg` / `</svg>` | 42 / 42 | 66 / 66 | +24 / +24 (3 SVGs × 8 pieces) |
| `<span` / `</span>` | 299 / 299 | 445 / 445 | +146 / +146 (balanced) |
| `<text` / `</text>` | — | 586 / 586 | balanced |
| Total lines | 2459 | 2693 | +234 |

## Judgment calls

1. **SVG sizing.** Piece 12 uses `viewBox="0 0 200 120"` for its examples. I matched that for all 24 new SVGs to keep visual rhythm consistent across the rendering category.
2. **Stance Card "primary" choice.** The brief said "all 14 dots active" and "`lane` + `surface` as primary." I followed that literally — both `lane` and `surface` carry `class="axis-dot active primary"` … wait, re-read: spec says `class="axis-dot active"` for active and `class="axis-dot primary"` for primary. In piece 12 the primary dots do NOT carry `active` (they get only `primary`). I followed piece 12's convention — primary dots get `class="axis-dot primary"` only, all others active dots get `class="axis-dot active"`. For piece 20 that means 12 dots `active` + 2 dots `primary` (lane, surface) = 14 visually filled. CSS treats both states with copper fill, so this reads correctly as "all 14 lit".
3. **"Leverage" in why-it-matters of piece 18.** Used as the noun ("Memory is leverage") — concrete, idiomatic, not the buzzword verb. Kept.
4. **No new `pl-explainer` closing block.** The brief said "replace the forthcoming note." I removed it cleanly; the section now ends with piece 20, which flows naturally into the Stance Card section that follows at line 2398.

## Deploy target

`frontiermap.theknowledgegardens.com/TheKnowledgeGardensOS`

## Branch

`feature/ws1-presentation-deep-dive` (local only, not pushed per WS1 instructions). Commit message: `[WS1] presentation: deep-dive pieces 13–20 (Modality Mirror → Stance Card)`
