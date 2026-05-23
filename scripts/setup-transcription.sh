#!/usr/bin/env bash
# scripts/setup-transcription.sh
#
# One-time setup for local meeting transcription on macOS (Apple Silicon).
# Installs ffmpeg + Python 3.11 venv + WhisperX, prepares the incoming/
# folder, and prints the HuggingFace token steps for speaker diarization.
#
# Re-runnable. Skips any step already complete.
#
# Usage:
#   bash scripts/setup-transcription.sh

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VENV_DIR="$HOME/.builders-knowledge-garden/transcribe-venv"
INCOMING_DIR="$HOME/Desktop/The Builder Garden/incoming"

bold() { printf "\033[1m%s\033[0m\n" "$1"; }
ok() { printf "\033[32m✓\033[0m %s\n" "$1"; }
warn() { printf "\033[33m!\033[0m %s\n" "$1"; }
info() { printf "  %s\n" "$1"; }

bold "==> Builder's Knowledge Garden — Transcription Setup"
echo

# --- Step 1: Verify macOS ---
if [[ "$(uname)" != "Darwin" ]]; then
  echo "This script is macOS-only. For Linux/Windows, see docs/transcription-setup.md"
  exit 1
fi
ok "macOS detected"

# --- Step 2: Homebrew ---
if ! command -v brew &>/dev/null; then
  bold "Installing Homebrew..."
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
else
  ok "Homebrew already installed"
fi

# --- Step 3: ffmpeg + Python 3.11 ---
for pkg in ffmpeg python@3.11; do
  if brew list "$pkg" &>/dev/null; then
    ok "$pkg already installed"
  else
    bold "Installing $pkg via Homebrew..."
    brew install "$pkg"
  fi
done

# --- Step 4: Python venv ---
PYTHON_BIN="$(brew --prefix python@3.11)/bin/python3.11"
if [[ ! -x "$PYTHON_BIN" ]]; then
  echo "ERROR: python3.11 not found at $PYTHON_BIN after install."
  exit 1
fi

if [[ -d "$VENV_DIR" && -x "$VENV_DIR/bin/python" ]]; then
  ok "venv already exists at $VENV_DIR"
else
  bold "Creating venv at $VENV_DIR..."
  mkdir -p "$(dirname "$VENV_DIR")"
  "$PYTHON_BIN" -m venv "$VENV_DIR"
fi

# --- Step 5: Install WhisperX ---
bold "Installing/updating WhisperX (may take 2-3 minutes)..."
"$VENV_DIR/bin/pip" install --quiet --upgrade pip
"$VENV_DIR/bin/pip" install --quiet whisperx

if "$VENV_DIR/bin/whisperx" --help &>/dev/null; then
  ok "WhisperX installed"
else
  echo "ERROR: WhisperX install failed. Try running:"
  echo "  $VENV_DIR/bin/pip install whisperx"
  exit 1
fi

# --- Step 6: Incoming folder ---
if [[ -d "$INCOMING_DIR" ]]; then
  ok "Incoming folder exists: $INCOMING_DIR"
else
  bold "Creating incoming folder: $INCOMING_DIR"
  mkdir -p "$INCOMING_DIR"
fi

# --- Step 7: Wrapper script in PATH (optional) ---
WRAPPER="$HOME/.local/bin/transcribe-meeting"
mkdir -p "$(dirname "$WRAPPER")"
cat > "$WRAPPER" <<EOF
#!/usr/bin/env bash
# Wrapper for the Builder's Knowledge Garden transcribe-meeting script.
exec "$REPO_ROOT/scripts/transcribe-meeting.sh" "\$@"
EOF
chmod +x "$WRAPPER"
ok "Wrapper installed at $WRAPPER"
info "Add ~/.local/bin to your PATH if you want to call 'transcribe-meeting' from anywhere"
info "  echo 'export PATH=\"\$HOME/.local/bin:\$PATH\"' >> ~/.zshrc"

# --- Step 8: HuggingFace token ---
echo
bold "==> Speaker diarization requires a HuggingFace token (one-time)"
if [[ -n "${HF_TOKEN:-}" ]]; then
  ok "HF_TOKEN already set in this shell"
else
  warn "HF_TOKEN not set"
  cat <<'TOKENEOF'

  Speaker diarization uses pyannote.audio, which is gated on HuggingFace.
  To enable speaker labels in transcripts:

    1. Visit https://huggingface.co/pyannote/speaker-diarization-3.1 and click "Agree"
    2. Visit https://huggingface.co/pyannote/segmentation-3.0 and click "Agree"
    3. Get a token (read access is fine): https://huggingface.co/settings/tokens
    4. Save it to your shell:

         echo 'export HF_TOKEN=hf_xxxxxxxxxxxxxxxxxxxxxxxxx' >> ~/.zshrc
         source ~/.zshrc

  Without HF_TOKEN, transcription still works — you just get no speaker labels.
TOKENEOF
fi

echo
bold "==> Setup complete"
echo
echo "Usage:"
echo "  Drop a video file into:  $INCOMING_DIR"
echo "  Then run:                bash scripts/transcribe-meeting.sh"
echo
echo "Or explicit path + slug:"
echo "  bash scripts/transcribe-meeting.sh ~/path/to/video.mp4 john-mike-platform-review"
echo
echo "Output lands in: docs/meetings/raw/YYYY-MM-DD-{slug}.md"
echo "Ready to feed to the digest pipeline. See docs/meetings/README.md."
