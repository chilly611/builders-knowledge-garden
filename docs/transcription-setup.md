# Local Meeting Transcription

Transcribe recorded meetings into the BKG meeting-protocol format using a single command on the MacBook. No cloud uploads, no per-minute costs, no third-party data exposure. Diarization (speaker labels) optional but recommended.

## What it does

You drop a meeting recording into `~/Desktop/The Builder Garden/incoming/` and run one command. A raw transcript appears at `docs/meetings/raw/YYYY-MM-DD-{slug}.md` in the format the [meeting protocol](meetings/README.md) expects. From there, paste the raw into a Chat session, and the digest pipeline produces the structured digest.

The transcript includes speaker labels (`SPEAKER_00`, `SPEAKER_01`, ...) that you map to real names at the top of the file before digesting. The mapping takes about 30 seconds — listen to the first few seconds of audio for each speaker and fill in the table.

## One-time setup

```bash
cd ~/Desktop/The\ Builder\ Garden/app   # or wherever the repo lives on this Mac
bash scripts/setup-transcription.sh
```

The script:
- Installs Homebrew (if missing) → `ffmpeg`, `python@3.11`
- Creates an isolated venv at `~/.builders-knowledge-garden/transcribe-venv`
- Installs WhisperX into it
- Creates the `incoming/` folder
- Installs a `transcribe-meeting` wrapper at `~/.local/bin/`
- Prints the HuggingFace token steps for diarization

### HuggingFace token (for speaker labels)

Speaker diarization uses [pyannote.audio](https://github.com/pyannote/pyannote-audio), a gated model. One-time setup:

1. Visit <https://huggingface.co/pyannote/speaker-diarization-3.1> → click **Agree and access repository**
2. Visit <https://huggingface.co/pyannote/segmentation-3.0> → click **Agree and access repository**
3. Create a read-only token at <https://huggingface.co/settings/tokens>
4. Save it permanently:

   ```bash
   echo 'export HF_TOKEN=hf_xxxxxxxxxxxxxxxxxxxx' >> ~/.zshrc
   source ~/.zshrc
   ```

Without `HF_TOKEN`, transcription still works — you just don't get speaker labels. Useful for monologues or single-speaker memos.

## Daily use

**Easiest path** — drop a recording in the incoming folder, then:

```bash
bash scripts/transcribe-meeting.sh
```

It picks the newest file from `~/Desktop/The Builder Garden/incoming/` and infers the slug + date from the filename.

**Explicit path + slug:**

```bash
bash scripts/transcribe-meeting.sh ~/Downloads/recording.mp4 platform-review-mike-john
```

**Explicit date too** (overrides anything in the filename):

```bash
bash scripts/transcribe-meeting.sh ~/Downloads/recording.mp4 platform-review 2026-05-22
```

Supported input formats: `.mp4`, `.mov`, `.m4a`, `.webm`, `.mkv`, `.wav`, `.mp3`.

## Performance expectations

On an M-series MacBook Air, the `large-v3` model runs roughly at **2-3× real-time on CPU** (a 30-minute meeting transcribes in 10-15 minutes). MPS/Metal acceleration in WhisperX has historically been unreliable, so the default is `int8` on CPU. If you upgrade to a MacBook Pro with more cores, this scales.

To trade quality for speed on a long recording:

```bash
WHISPER_MODEL=medium bash scripts/transcribe-meeting.sh recording.mp4
```

The `medium` model is ~3× faster than `large-v3` with noticeably worse accuracy on technical jargon (CSI division names, jurisdiction codes, contractor language) — only worth it if `large-v3` is taking too long.

## Output format

The raw transcript file follows the protocol structure:

```markdown
# Raw Transcript — 2026-05-22 — Platform Review Mike John

**Status:** Unedited. Permanent record. Do not modify.
**Digest:** `docs/meetings/2026-05-22-platform-review-mike-john.md` (to be written after this raw is reviewed)
**Source file:** `meeting-recording.mp4`
**Transcribed:** 2026-05-23 via local WhisperX (large-v3) on Apple Silicon
**Diarization:** pyannote.audio (speaker labels auto-assigned, must be mapped manually below)

## Speaker mapping — FILL THIS IN BEFORE DIGESTING

| Auto label | Real name | First seen | Approx. speaking time |
|---|---|---|---|
| `SPEAKER_00` | _???_ | 00:00 | 12:34 |
| `SPEAKER_01` | _???_ | 00:42 | 08:11 |
| `SPEAKER_02` | _???_ | 01:55 | 04:22 |

After mapping, do a find/replace across this file: `SPEAKER_00` → `John Bou`, etc.

---

**[00:00] SPEAKER_00:** All right, let me share my screen. So this is the killer app...

**[00:42] SPEAKER_01:** Before we get into that — can you walk me through how the §7159...
```

The find/replace step is intentional: it forces you to listen to a few seconds and confirm who's who, which is the right human-in-the-loop check before language travels into a digest.

## Workflow integration

```
1. Record meeting (Zoom, QuickTime, Granola, etc.)
2. Drop file into ~/Desktop/The Builder Garden/incoming/
3. Run: bash scripts/transcribe-meeting.sh
4. Open the generated raw file, fill in the Speaker mapping
5. Find/replace SPEAKER_XX → real names
6. git add docs/meetings/raw/YYYY-MM-DD-slug.md
7. Commit and push
8. Paste the raw content into Chat with: "Digest this transcript per the protocol"
9. The digest pipeline produces docs/meetings/YYYY-MM-DD-slug.md
```

## Troubleshooting

**"WhisperX not found"** — Run `bash scripts/setup-transcription.sh` first. If it's already run, the venv may have been deleted; just re-run.

**Diarization fails with "401 Unauthorized"** — Your HuggingFace token isn't accepted. Confirm you've clicked **Agree** on BOTH gated model pages (`speaker-diarization-3.1` AND `segmentation-3.0`), then verify the token has read access. Re-export and re-source `~/.zshrc`.

**Transcription is wildly inaccurate** — Check that the audio extracted cleanly: run with `KEEP_AUDIO=1` and play the resulting WAV. If the audio is garbled or silent, the source video is the problem. If the audio is fine but transcription is bad, the speakers may be using heavy crosstalk or low-quality mics; try a different recording setup next time.

**Speakers wrong / merged / split** — Diarization isn't perfect. Two people with similar voices can collapse into one speaker; one person changing tone (whispering, on speakerphone) can split into two. Fix manually in the file before digesting — the Speaker mapping table is a hint, not gospel.

**Process killed / out of memory** — `large-v3` needs ~3GB RAM. On an 8GB MacBook Air, close other apps. Or downgrade to `WHISPER_MODEL=medium` (~2GB) or `small` (~1GB).

## Privacy note

Everything runs locally on the MacBook. No audio leaves the machine. The HuggingFace token is only used to download the pyannote model the first time; after that, diarization runs offline using the cached model. This matters for any meeting with privileged content (client conversations, financial details, attorney-client communication around the §7159 work).
