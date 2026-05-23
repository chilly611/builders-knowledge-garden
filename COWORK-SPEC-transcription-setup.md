# Cowork Spec — Set Up Local Meeting Transcription

**Audience:** A Claude Code or Cowork agent running on Chilly's MacBook with shell + filesystem access to the local clone of `chilly611/builders-knowledge-garden`.

**Goal:** Get `scripts/transcribe-meeting.sh` working end-to-end so Chilly can drop a meeting recording into `~/Desktop/The Builder Garden/incoming/` and run one command to produce a protocol-conformant raw transcript with speaker labels.

**Estimated time:** 10-15 minutes (most of it WhisperX installing dependencies).

**Files already in the repo (do not modify, just verify they exist):**
- `scripts/setup-transcription.sh` — the installer
- `scripts/transcribe-meeting.sh` — the daily-use script
- `scripts/format_transcript.py` — JSON → markdown formatter
- `docs/transcription-setup.md` — user-facing how-to

---

## Step 0 — Pre-flight

Confirm you're on the MacBook (not a Linux container, not a remote):

```bash
[[ "$(uname)" == "Darwin" ]] && echo "✓ macOS" || echo "✗ STOP — this spec is macOS-only"
```

Confirm the repo is clean (no uncommitted work to lose if something goes sideways):

```bash
cd ~/Desktop/The\ Builder\ Garden/app   # adjust path if the repo lives elsewhere
git status
```

If the working tree has uncommitted changes, stop and surface them to Chilly before continuing — don't risk losing in-flight work.

---

## Step 1 — Run the installer

```bash
bash scripts/setup-transcription.sh
```

This will:
1. Verify macOS
2. Install Homebrew (if missing)
3. Install `ffmpeg` and `python@3.11` via brew
4. Create a venv at `~/.builders-knowledge-garden/transcribe-venv`
5. Install WhisperX into the venv (~2-3 minutes, downloads PyTorch + faster-whisper)
6. Create `~/Desktop/The Builder Garden/incoming/`
7. Install a `transcribe-meeting` wrapper at `~/.local/bin/`
8. Print the HuggingFace token instructions

**Expected output ends with:**
```
==> Setup complete
```

**If it fails:**
- Brew install hangs → likely a network issue or Xcode CLT prompt; check for any dialog the user needs to dismiss
- `pip install whisperx` fails → most common cause is Python version mismatch. Verify `$(brew --prefix python@3.11)/bin/python3.11 --version` returns `Python 3.11.x`. If it returns 3.12 or 3.13, Homebrew may have aliased `python@3.11` to a newer version; force it with `brew install python@3.11 --force-bottle`.
- "command not found: brew" after install → the installer printed instructions for adding Homebrew to PATH; follow them, then re-run.

---

## Step 2 — Smoke-test transcription (no diarization)

We test the basic transcription path FIRST, before tackling the HuggingFace gate. This isolates failure modes.

Generate a 10-second test clip:

```bash
TMPDIR=$(mktemp -d)
say -o "$TMPDIR/test.aiff" "This is a test of the Builder's Knowledge Garden transcription pipeline. The system should produce a transcript with timestamps."
ffmpeg -i "$TMPDIR/test.aiff" -ar 16000 -ac 1 "$TMPDIR/test.wav" -y -loglevel error
```

Run the transcribe script WITHOUT diarization (HF_TOKEN unset):

```bash
unset HF_TOKEN
bash scripts/transcribe-meeting.sh "$TMPDIR/test.wav" smoke-test
```

**Expected:** A file at `docs/meetings/raw/$(date +%Y-%m-%d)-smoke-test.md` containing the spoken text with a single `[00:00]` timestamp. No speaker labels (correct — diarization was off).

**Verify and clean up:**
```bash
cat "docs/meetings/raw/$(date +%Y-%m-%d)-smoke-test.md"
rm "docs/meetings/raw/$(date +%Y-%m-%d)-smoke-test.md"  # don't commit the smoke test
```

**If transcription is wrong but file is produced:** Audio extraction worked; WhisperX may have model issues. Try `WHISPER_MODEL=small bash scripts/transcribe-meeting.sh ...` to confirm the pipeline is sound. The default `large-v3` model downloads on first use (~3GB) and can stall on slow connections.

**If no output file:** Read the WhisperX log path printed in the error. Most likely an install issue from Step 1 — re-run setup with `pip install --upgrade --force-reinstall whisperx`.

---

## Step 3 — HuggingFace token (diarization gate)

This step requires Chilly's manual involvement on the HuggingFace website. The agent can guide but cannot complete the click-throughs.

Prompt Chilly to:

1. Visit <https://huggingface.co/pyannote/speaker-diarization-3.1> and click **Agree and access repository**
2. Visit <https://huggingface.co/pyannote/segmentation-3.0> and click **Agree and access repository**
3. Create a token at <https://huggingface.co/settings/tokens> (read access is sufficient)
4. Paste the token into the next shell command:

```bash
# Replace hf_xxx... with the actual token
echo 'export HF_TOKEN=hf_xxxxxxxxxxxxxxxxxxxxxxxxxx' >> ~/.zshrc
source ~/.zshrc
echo "HF_TOKEN length: ${#HF_TOKEN}"   # should be around 40 chars
```

---

## Step 4 — Smoke-test diarization

Generate a two-speaker test clip:

```bash
TMPDIR=$(mktemp -d)
say -v "Alex" -o "$TMPDIR/a.aiff" "Hello, this is Alex speaking from the Builder's Knowledge Garden."
say -v "Victoria" -o "$TMPDIR/v.aiff" "Hi Alex, this is Victoria. The audit retention should be seven years."
ffmpeg -i "concat:$TMPDIR/a.aiff|$TMPDIR/v.aiff" "$TMPDIR/test.wav" -ar 16000 -ac 1 -y -loglevel error
bash scripts/transcribe-meeting.sh "$TMPDIR/test.wav" diarization-smoke-test
```

**Expected output file should contain:**
- A "Speaker mapping" table with two rows (`SPEAKER_00`, `SPEAKER_01`)
- Two `[timestamp] SPEAKER_XX:` lines in the body

If only one speaker is detected, that's also OK for a smoke test — the diarization model can struggle on short synthetic clips. The critical signal is that the speaker-mapping section appears and `pyannote` didn't fail on auth.

**Clean up:**
```bash
rm "docs/meetings/raw/$(date +%Y-%m-%d)-diarization-smoke-test.md"
```

**If diarization fails with 401 Unauthorized:**
- Token not actually accepted. Verify Chilly clicked Agree on BOTH gated models (segmentation-3.0 AND speaker-diarization-3.1, not just one).
- Token may need read scope on `models`. Re-issue at the tokens page with broader read access.

**If diarization fails with "no such model":**
- First-run model download failed; try again with a stable connection. Models cache to `~/.cache/huggingface/`.

---

## Step 5 — Document completion

Append a session entry to `docs/session-log.md`:

```markdown
## YYYY-MM-DD — Cowork Session: Local Transcription Setup

**Agent:** Cowork (or Claude Code, whichever ran this)
**Outcome:** WhisperX + ffmpeg + pyannote diarization installed and smoke-tested on the MacBook. `scripts/transcribe-meeting.sh` end-to-end verified with synthetic two-speaker clip. HuggingFace token configured in ~/.zshrc.

**Verified:**
- `bash scripts/setup-transcription.sh` completes without error
- Smoke transcription (no diarization) produces correct output
- Smoke transcription (with diarization) produces speaker-mapping table

**For Chilly:** You can now drop any meeting recording into `~/Desktop/The Builder Garden/incoming/` and run `bash scripts/transcribe-meeting.sh` to produce a protocol-conformant raw transcript. See `docs/transcription-setup.md` for daily-use details. Next test: run it against the actual May 22 platform-review recording.
```

Commit and push:

```bash
git add docs/session-log.md
git commit -m "docs(session-log): cowork transcription setup verified end-to-end"
git push origin main
```

---

## Step 6 — Hand back

Report to Chilly:
- ✓ Setup completed
- ✓ Smoke tests passed (or which ones failed and what was tried)
- HF token status (set / Chilly still needs to do the click-throughs / something else)
- Next concrete action: "Drop the May 22 recording into the incoming folder and run `bash scripts/transcribe-meeting.sh` to get a real diarized transcript of that meeting."

Do NOT process the actual May 22 video as part of this session unless Chilly explicitly asks. The setup is the deliverable; running it on real meeting audio is his call.

---

## Known limitations to flag honestly

1. **CPU-only by default.** WhisperX's MPS (Metal) support is historically unstable; we default to `int8` on CPU to avoid surprise failures. On an M1/M2 MacBook Air, a 30-min meeting transcribes in ~10-15 minutes. Acceptable but not instant.

2. **Diarization is imperfect.** Two people with similar voices can collapse into one speaker; one person on a bad mic can split into two. The "Speaker mapping" table is a hint, not gospel — Chilly will need to listen and verify before any digest gets published.

3. **First-run downloads are slow.** First `transcribe-meeting.sh` call downloads the WhisperX model (~3GB for large-v3) and the pyannote models (~500MB). Subsequent runs are local-only and fast.

4. **No real-time transcription.** This pipeline is for post-meeting processing. For real-time, use Otter/Granola/Zoom (see `docs/transcription-setup.md` privacy note).
