#!/usr/bin/env bash
# scripts/transcribe-meeting.sh
#
# Transcribe a meeting recording into the BKG meeting-protocol format.
# Outputs: docs/meetings/raw/YYYY-MM-DD-{slug}.md
#
# Usage:
#   ./scripts/transcribe-meeting.sh                              # picks newest from ~/Desktop/The Builder Garden/incoming
#   ./scripts/transcribe-meeting.sh path/to/video.mp4            # auto slug from filename
#   ./scripts/transcribe-meeting.sh path/to/video.mp4 my-slug    # explicit slug
#   ./scripts/transcribe-meeting.sh path/to/video.mp4 my-slug 2026-05-22   # explicit slug + date
#
# Env vars:
#   HF_TOKEN          (optional) HuggingFace token; enables speaker diarization.
#   WHISPER_MODEL     (optional) Default: large-v3. Try medium for faster/lower-quality.
#   WHISPER_COMPUTE   (optional) Default: int8. Try float16 on CUDA, int8 on CPU/MPS.
#   KEEP_AUDIO        (optional) Set to 1 to preserve extracted audio for debugging.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VENV_DIR="$HOME/.builders-knowledge-garden/transcribe-venv"
INCOMING_DIR="$HOME/Desktop/The Builder Garden/incoming"
WHISPER_MODEL="${WHISPER_MODEL:-large-v3}"
WHISPER_COMPUTE="${WHISPER_COMPUTE:-int8}"

bold() { printf "\033[1m%s\033[0m\n" "$1"; }
ok() { printf "\033[32m✓\033[0m %s\n" "$1"; }
warn() { printf "\033[33m!\033[0m %s\n" "$1"; }
fail() { printf "\033[31m✗ %s\033[0m\n" "$1" >&2; exit 1; }

# --- Pre-flight ---
[[ -x "$VENV_DIR/bin/whisperx" ]] || fail "WhisperX not found at $VENV_DIR/bin/whisperx. Run scripts/setup-transcription.sh first."
command -v ffmpeg >/dev/null || fail "ffmpeg not in PATH. Run scripts/setup-transcription.sh first."

# --- Arg parsing ---
VIDEO="${1:-}"
SLUG="${2:-}"
DATE_OVERRIDE="${3:-}"

if [[ -z "$VIDEO" ]]; then
  [[ -d "$INCOMING_DIR" ]] || fail "No video path given and incoming folder doesn't exist: $INCOMING_DIR"
  # shellcheck disable=SC2012
  VIDEO=$(ls -t "$INCOMING_DIR"/*.{mp4,mov,m4a,webm,mkv,wav,mp3} 2>/dev/null | head -1 || true)
  [[ -n "$VIDEO" ]] || fail "No video/audio files in $INCOMING_DIR"
  bold "Using newest file from incoming: $(basename "$VIDEO")"
fi

[[ -f "$VIDEO" ]] || fail "File not found: $VIDEO"

# --- Slug + date derivation ---
BASENAME=$(basename "$VIDEO" | sed -E 's/\.[^.]+$//')

# Extract a date if it's already in the filename, else use today
if [[ -n "$DATE_OVERRIDE" ]]; then
  DATE="$DATE_OVERRIDE"
elif [[ "$BASENAME" =~ (20[0-9]{2}-[0-9]{2}-[0-9]{2}) ]]; then
  DATE="${BASH_REMATCH[1]}"
else
  DATE=$(date +%Y-%m-%d)
fi

if [[ -z "$SLUG" ]]; then
  # Clean up the basename into a slug: lowercase, strip date, replace spaces/special chars with dashes
  SLUG=$(echo "$BASENAME" \
    | sed -E "s/20[0-9]{2}-[0-9]{2}-[0-9]{2}//g" \
    | sed -E 's/\([^)]*\)//g' \
    | tr '[:upper:]' '[:lower:]' \
    | tr -c 'a-z0-9' '-' \
    | sed -E 's/-+/-/g' | sed -E 's/^-|-$//g')
  [[ -n "$SLUG" ]] || SLUG="meeting"
fi

OUTPUT_SLUG="${DATE}-${SLUG}"
OUTPUT_FILE="$REPO_ROOT/docs/meetings/raw/${OUTPUT_SLUG}.md"

if [[ -f "$OUTPUT_FILE" ]]; then
  warn "Output already exists: $OUTPUT_FILE"
  read -p "Overwrite? [y/N] " -n 1 -r REPLY
  echo
  [[ "$REPLY" =~ ^[Yy]$ ]] || { echo "Aborted."; exit 0; }
fi

mkdir -p "$REPO_ROOT/docs/meetings/raw"

# --- Extract audio ---
TMPDIR=$(mktemp -d)
trap '[[ "${KEEP_AUDIO:-0}" == "1" ]] || rm -rf "$TMPDIR"' EXIT
AUDIO="$TMPDIR/audio.wav"

bold "Extracting audio (16kHz mono)..."
ffmpeg -i "$VIDEO" -ar 16000 -ac 1 -c:a pcm_s16le "$AUDIO" -y -loglevel error
ok "Audio extracted: $(du -h "$AUDIO" | cut -f1)"

# --- Transcribe ---
DIARIZE_ARGS=()
DIARIZE_NOTE="(no speaker diarization — set HF_TOKEN to enable)"
if [[ -n "${HF_TOKEN:-}" ]]; then
  DIARIZE_ARGS=(--diarize --hf_token "$HF_TOKEN")
  DIARIZE_NOTE="(with speaker diarization)"
fi

bold "Transcribing with $WHISPER_MODEL $DIARIZE_NOTE..."
bold "This may take a few minutes. Coffee break recommended for long recordings."

"$VENV_DIR/bin/whisperx" "$AUDIO" \
  --model "$WHISPER_MODEL" \
  --compute_type "$WHISPER_COMPUTE" \
  --output_dir "$TMPDIR" \
  --output_format json \
  --language en \
  "${DIARIZE_ARGS[@]}" \
  >"$TMPDIR/whisperx.log" 2>&1 || {
    echo "--- last 30 lines of whisperx log ---"
    tail -30 "$TMPDIR/whisperx.log"
    fail "WhisperX failed. Full log: $TMPDIR/whisperx.log (KEEP_AUDIO=1 to preserve)"
  }

JSON_OUTPUT="$TMPDIR/audio.json"
[[ -f "$JSON_OUTPUT" ]] || fail "WhisperX produced no JSON output. Log: $TMPDIR/whisperx.log"
ok "Transcription complete"

# --- Format as protocol markdown ---
bold "Formatting as meeting-protocol raw transcript..."
"$VENV_DIR/bin/python" "$REPO_ROOT/scripts/format_transcript.py" \
  --input "$JSON_OUTPUT" \
  --slug "$OUTPUT_SLUG" \
  --date "$DATE" \
  --source-file "$(basename "$VIDEO")" \
  > "$OUTPUT_FILE"

ok "Wrote $OUTPUT_FILE"
echo
bold "==> Done"
echo
echo "Raw transcript:  $OUTPUT_FILE"
echo "Source:          $VIDEO"
echo
echo "Next steps:"
echo "  1. Open the file and fill in the Speaker mapping section at the top"
echo "     (map SPEAKER_00 / SPEAKER_01 / etc. to real names)"
echo "  2. Paste the raw into Chat with a 'process this transcript' prompt"
echo "     — the digest pipeline will produce docs/meetings/${OUTPUT_SLUG}.md"
echo "  3. git add docs/meetings/raw/${OUTPUT_SLUG}.md && git commit && git push"
