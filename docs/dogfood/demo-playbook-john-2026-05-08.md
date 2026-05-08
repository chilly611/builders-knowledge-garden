# Demo Playbook — John + Contractor Friend

> Built 2026-05-07 as part of the demo readiness pass. Pair this with `demo-readiness-2026-05-07.md` (the audit findings) and the latest `tasks.todo.md` state-of-play.

## Who you're showing this to

- **John** — practicing GC, Pasadena/LA-area, lost a $30k deposit on a code-compliance miss. Immediate problem-product fit on q5 (Code Compliance) and q15 (Daily Log + photo evidence).
- **Contractor friend** — generalist GC, smaller volume, more day-to-day operations focus. Likely pulled in by the workflow breadth + supply ordering.

Neither has seen the app. Tomorrow is their first 30 seconds.

## What to send (the link + the framing)

```
Hey John —

Wanted you to be the first GC to take this for a spin. It's a builder-facing
operating system — every workflow you run on a job has a tool here, and
they all talk to the same project context.

Try it: builders.theknowledgegardens.com/killerapp

Type a project description in the box at the top. Pretend it's the next ADU
or remodel you're about to bid. Hit Enter — the AI will tell you what jumps
out, then route you to the right next workflow.

Click anywhere. Every workflow remembers the project. Save your work by
signing in (top right) — anonymous projects work but disappear if you
refresh.

Tell me the first 30 seconds: what do you click? What confuses you? What
makes you go "oh, this is different"?

— Chilly
```

Say it casually. Don't oversell. The product does the convincing.

## Demo path (scripted, the safe loop)

Use this if you're walking through it live with him on the phone or in person.
Stay on this loop until the unscripted reactions stabilize.

1. **Land cold** — `/killerapp`. Hero loads. "The operating system for your build." Pause. Read it out loud. Let the gravity sit.
2. **Type an ADU scope** — "1800 sf detached ADU in Pasadena off back of 1950s ranch, slab-on-grade, $400k budget, late summer start." Hit Enter.
3. **Watch the AI take stream** — should land in ~5–10 seconds. Read along. Point out: it knows the Pasadena ADU 1,200 sf cap, the expansive-soil concern, the framing-through-rain issue.
4. **Click "Check codes →"** — the static button row at the bottom. URL preserves `?project=...`. Project Spine v1 carries the context. Banner shows "YOUR PROJECT" + the scope, "AI TAKE" + the take, peer-link row to other workflows.
5. **Walk through 2-3 code rules** — Pro toggle on/off shows the difference between simple-view and pro-view. Citations link to real BKG entities.
6. **Click "← back to summary"** in the banner — back to home. "Saved · &lt;scope preview&gt;" pill in top right confirms the project survived.
7. **Click into Estimating (q2)** — banner carries through. AI estimate streams. The budget snapshot reads "starter values" not "demo mode" (the new copy).
8. **Click into Daily Log (q15)** — Hank's primary workflow on real jobs. **Show the "Upload progress photos" panel at the top.** Drag-drop or tap-camera. Drop a real jobsite photo — it persists, thumbnails appear, lightbox-on-click. This is one of the top three "oh" moments for John.
9. **Top-right pill: sign in** — "sign in — your work won't save if you refresh." Click it. Auth flow. Land back on the same project.

## What's intentionally rough (don't dodge — name it first)

- **Photo/video evidence upload — SHIPPED 2026-05-07 PM.** Wired into q15 (daily-log progress photos), q5 (code-compliance inspection photos — John's $30k story), q2 (estimating jobsite reference), q11 (supply-ordering material receipts), q8 (permits doc), q4 (signed contract PDF). PDFs + photos + videos (50MB cap). Lightbox preview, 3-col rehydration grid.
- **Inspector captions — SHIPPED 2026-05-08.** Click any thumbnail in q5 (or anywhere), open lightbox, type a caption like "south corner flashing — torn after windstorm", click Save. Persists with the photo.
- **Receipt OCR for q11 + q17 — SHIPPED 2026-05-08.** Drop a Home Depot receipt photo OR a PDF supplier invoice. ~5 sec later an editable card appears with vendor + total + category (q17 has 7 categories, q11 has 4). Line items expand to show what the AI extracted line-by-line. Click Save to write the budget row. Never auto-writes — user always confirms. **This is the demo "oh" moment for John on the budget side.**
- **EXIF parsing** — Phase 4 (next session). Will surface "this was on-site at <time> in <location>" trust signal once the exifr dependency is installed.
- **Multi-jurisdiction code data** — currently CA + NV. Pasadena works. Out-of-state contractors hit a wall (block-on-roadmap, ~5 weeks per jurisdiction).
- **Voice 1.5** — push-to-talk works on the AI fab and search. TTS replies and command vocabulary are not shipped yet.
- **Spanish contracts** — flagged by 4/10 personas, not yet built.
- **The 8 SOON workflows in the picker** — q1, q3, q20-q27. The top eight surfaces (q2-q19) are LIVE. The "SOON" ones are marked clearly.

## Capture verbatim — what to write down during the call

- First click after the AI take. (Did they go to the static button row, the stage chips up top, or scroll down to the picker?)
- First confusion. (What word didn't they understand? What did they expect to happen that didn't?)
- First "oh" moment. (What made them sit up?)
- What they tried that didn't work. (Misclicks, missed CTAs, scroll issues.)
- What they said about the AI take's specificity. (Did the Pasadena-ADU-cap concrete-detail land?)

Paste these straight into a `docs/dogfood/john-2026-05-08-call.md` so the next session can act on them.

## Mobile path (iPhone Safari)

Have them open the same URL on their phone. The 2026-05-07 push tightened mobile pill widths and AI fab panel, but the full walkthrough hasn't been done on a real iPhone yet.

What might still break:
- **Banner peer-link row** — six "MOVE TO" buttons may wrap to 2-3 rows. Functional but not pretty.
- **Workflow picker rows** — 7 stages × 27 workflow rows. Long scroll. Each row should hit 44px+ touch target.
- **Photo upload from camera roll** — wired Phase 2. Tap the upload zone, iOS opens the camera/library. Test on a real iPhone before the call.

## Talking points if they ask "what's different from Procore?"

Don't get into a feature spec war. Lead with:

1. **Procore is built for the GC running 50 jobs at once.** This is built for the GC running 1-5 jobs and the small builder doing side work. The AI does what a junior PM would do — except always available.
2. **Every workflow in BKG talks to every other workflow.** Procore makes you click between modules. BKG carries one project across 17 workflows.
3. **Citations ground every answer.** The AI never makes up code numbers. Hallucination guard is verified — ask the AI a fake code (NEC 919.7(D)(4)) and it admits it doesn't know. Procore doesn't have an AI like this.
4. **Pricing is set up for the contractor, not the construction company.** $99/mo Pro tier (vs. Procore $375/user/mo enterprise floor). Building Intelligence API (coming) for AI-native shops.

## The ask — what you want from them

- "Use it on a real bid this week if you can. Even just for the AI take and code lookup."
- "Send me the rough edges. Anything weird, missing, slow, broken."
- "If it's good enough to keep using, I want you to be customer #1 — paid Pro for a year. We'll close that out next session."

Don't push the close. The demo close-rate signal is "did they want to come back to the URL by themselves tomorrow."

## After the call

- Update `docs/dogfood/john-2026-05-08-call.md` with verbatim reactions
- File new P0/P1 fixes in `tasks.todo.md` against the verbatim findings
- If receipt OCR / inspector captions / EXIF parsing comes up: that's Phase 3. q11 receipt vision-pass is the highest-ROI follow-on.
- If multi-jurisdiction was the #1 ask: time to scope IL/NYC/FL data acquisition

Good luck. The product is honest enough to demo. Let it speak.
