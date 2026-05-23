#!/usr/bin/env python3
"""
Format WhisperX JSON output as a BKG meeting-protocol raw transcript (markdown).

Usage:
    format_transcript.py --input audio.json --slug 2026-05-22-bkg-review --date 2026-05-22 --source-file video.mp4

Outputs markdown to stdout. The output matches the structure expected by
docs/meetings/raw/*.md per docs/meetings/README.md.
"""

import argparse
import json
import sys
from collections import defaultdict
from datetime import datetime


def fmt_timestamp(seconds: float) -> str:
    """Convert seconds to HH:MM:SS (drops hours if zero)."""
    seconds = int(seconds or 0)
    h, rem = divmod(seconds, 3600)
    m, s = divmod(rem, 60)
    if h:
        return f"{h:d}:{m:02d}:{s:02d}"
    return f"{m:02d}:{s:02d}"


def format_transcript(data: dict, slug: str, date: str, source_file: str) -> str:
    """Render WhisperX JSON as protocol-formatted markdown."""
    segments = data.get("segments", [])

    # --- Speaker discovery ---
    speakers_seen = []
    speaker_totals = defaultdict(float)
    for seg in segments:
        spk = seg.get("speaker") or "UNKNOWN"
        if spk not in speakers_seen:
            speakers_seen.append(spk)
        start = seg.get("start") or 0
        end = seg.get("end") or 0
        speaker_totals[spk] += max(0, end - start)

    has_diarization = any(s.get("speaker") for s in segments)
    today = datetime.now().strftime("%Y-%m-%d")

    # --- Header ---
    lines: list[str] = []
    # Strip leading YYYY-MM-DD- from slug so the H1 reads cleanly
    import re
    title_core = re.sub(r"^20[0-9]{2}-[0-9]{2}-[0-9]{2}-?", "", slug)
    title_slug = title_core.replace("-", " ").title() if title_core else "Meeting"
    lines.append(f"# Raw Transcript — {date} — {title_slug}")
    lines.append("")
    lines.append("**Status:** Unedited. Permanent record. Do not modify.")
    lines.append(f"**Digest:** `docs/meetings/{slug}.md` (to be written after this raw is reviewed)")
    lines.append(f"**Source file:** `{source_file}`")
    lines.append(f"**Transcribed:** {today} via local WhisperX (large-v3) on Apple Silicon")
    if has_diarization:
        lines.append("**Diarization:** pyannote.audio (speaker labels auto-assigned, must be mapped manually below)")
    else:
        lines.append("**Diarization:** none (HF_TOKEN not set during transcription)")
    lines.append("")

    # --- Speaker mapping table (user fills this in) ---
    if has_diarization and speakers_seen:
        lines.append("## Speaker mapping — FILL THIS IN BEFORE DIGESTING")
        lines.append("")
        lines.append("WhisperX assigns generic labels. Map them to real names before processing into a digest.")
        lines.append("Match by listening to the recording around the first appearance of each speaker.")
        lines.append("")
        lines.append("| Auto label | Real name | First seen | Approx. speaking time |")
        lines.append("|---|---|---|---|")
        for spk in speakers_seen:
            first_seg = next((s for s in segments if s.get("speaker") == spk), None)
            first_ts = fmt_timestamp(first_seg.get("start", 0)) if first_seg else "?"
            total = fmt_timestamp(speaker_totals[spk])
            lines.append(f"| `{spk}` | _???_ | {first_ts} | {total} |")
        lines.append("")
        lines.append("After mapping, do a find/replace across this file: `SPEAKER_00` → `John Bou`, etc.")
        lines.append("")

    lines.append("---")
    lines.append("")

    # --- Body: collapse consecutive same-speaker segments into paragraphs ---
    current_speaker = None
    paragraph: list[str] = []

    def flush(speaker, start_ts, paragraph):
        if not paragraph:
            return
        speaker_label = speaker or "UNKNOWN"
        ts = fmt_timestamp(start_ts) if start_ts is not None else "—"
        text = " ".join(paragraph).strip()
        if has_diarization:
            lines.append(f"**[{ts}] {speaker_label}:** {text}")
        else:
            lines.append(f"**[{ts}]** {text}")
        lines.append("")

    paragraph_start = None
    for seg in segments:
        text = (seg.get("text") or "").strip()
        if not text:
            continue
        spk = seg.get("speaker") or "UNKNOWN"

        if spk != current_speaker:
            flush(current_speaker, paragraph_start, paragraph)
            paragraph = [text]
            paragraph_start = seg.get("start", 0)
            current_speaker = spk
        else:
            paragraph.append(text)

    flush(current_speaker, paragraph_start, paragraph)

    return "\n".join(lines)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", required=True, help="Path to WhisperX JSON output")
    parser.add_argument("--slug", required=True, help="Output slug (YYYY-MM-DD-name)")
    parser.add_argument("--date", required=True, help="Meeting date (YYYY-MM-DD)")
    parser.add_argument("--source-file", default="(unknown)", help="Original video/audio filename")
    args = parser.parse_args()

    with open(args.input) as f:
        data = json.load(f)

    sys.stdout.write(format_transcript(data, args.slug, args.date, args.source_file))
    sys.stdout.write("\n")


if __name__ == "__main__":
    main()
