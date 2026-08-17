#!/usr/bin/env python3
"""Step 2b — collect Trellis meshes, Draco-compress them, and cut posters.

Three things happen here, in order, per specimen:
  1. download the raw .glb                      -> work/raw/<slug>.glb
  2. gltf-transform optimize --compress draco   -> work/models/<slug>.glb
  3. downscale the source image to a poster jpg -> work/posters/<slug>.jpg

Step 2 is the size gate's whole reason for existing: raw Trellis output runs
6-10 MB and the library budget is 2 MB. Anything still over budget after Draco is
reported and left OUT of the ready set rather than quietly shipped.

Resumable — re-run after a timeout and only unsettled jobs are polled.

  python3 scripts/media/02b_poll_3d.py
"""

import glob
import json
import os
import subprocess
import sys

import _lib as L

PREDS = os.path.join(L.WORK, "mesh_preds.json")
STATE = os.path.join(L.WORK, "mesh_done.json")

# The library gate. Decimal MB, not MiB — the stricter of the two readings, so a
# passing specimen is under 2 MB however you count.
SIZE_LIMIT = 2_000_000
GLTF_CLI = ["npx", "-y", "@gltf-transform/cli@4.4.2"]
POSTER_PX = 640
POSTER_QUALITY = 82


# Escalation ladder for the 2 MB gate, cheapest-quality-loss first.
#
# Texture, not geometry, is what blows the budget: Trellis bakes a 1024px map and
# Draco only compresses geometry, so a 2.1 MB raw mesh can come out of `optimize
# --compress draco` at 2.27 MB. Halving the map is worth ~3x and is invisible at
# specimen scale; only if that is not enough do we start discarding vertices.
LADDER = [
    ([], "draco"),
    (["--texture-size", "768"], "draco + 768px texture"),
    (["--texture-size", "512"], "draco + 512px texture"),
    (["--texture-size", "512", "--simplify-ratio", "0.6"], "draco + 512px + 60% verts"),
]


def optimize(raw_path, out_path, limit=None):
    """Draco-compress, escalating until the result fits.

    Returns (bytes, note, None) or (None, None, error-string).
    """
    limit = SIZE_LIMIT if limit is None else limit
    last_size, last_err = None, None
    for extra, note in LADDER:
        cmd = GLTF_CLI + ["optimize", raw_path, out_path, "--compress", "draco"] + extra
        p = subprocess.run(cmd, capture_output=True, text=True, timeout=900)
        if p.returncode != 0 or not os.path.exists(out_path):
            last_err = "gltf-transform failed: " + " / ".join(
                (p.stderr or p.stdout or "").strip().splitlines()[-4:])
            continue
        last_size = os.path.getsize(out_path)
        if last_size <= limit:
            return last_size, note, None
    if last_size is None:
        return None, None, last_err or "gltf-transform produced no output"
    return last_size, LADDER[-1][1], None  # over budget; caller reports it


def poster(slug):
    """Cut a small jpg poster from the specimen's source image."""
    src = os.path.join(L.IMAGES, slug + ".png")
    dst = os.path.join(L.POSTERS, slug + ".jpg")
    if not os.path.exists(src):
        return None
    p = subprocess.run(
        ["sips", "-s", "format", "jpeg", "-s", "formatOptions", str(POSTER_QUALITY),
         "-Z", str(POSTER_PX), src, "--out", dst],
        capture_output=True, text=True,
    )
    return dst if p.returncode == 0 and os.path.exists(dst) else None


def main():
    L.ensure_dirs()
    if not os.path.exists(PREDS):
        raise SystemExit("no %s — run 02_generate_3d.py first" % PREDS)
    preds = json.load(open(PREDS))

    def collect(slug, d):
        out = d.get("output") or {}
        url = out.get("model_file") if isinstance(out, dict) else None
        if not url and isinstance(out, dict):
            url = next((v for v in out.values()
                        if isinstance(v, str) and v.endswith(".glb")), None)
        if not url and isinstance(out, str) and out.endswith(".glb"):
            url = out
        if not url:
            keys = list(out) if isinstance(out, dict) else type(out).__name__
            return "no-glb in output (%s)" % keys

        raw = os.path.join(L.RAW, slug + ".glb")
        raw_bytes = L.download(url, raw)
        final = os.path.join(L.MODELS, slug + ".glb")
        size, note, err = optimize(raw, final)
        if err:
            return err
        poster(slug)
        flag = "" if size <= SIZE_LIMIT else "  ** STILL OVER 2MB **"
        print("     %-26s raw %.2fMB -> %.2fMB  [%s]%s"
              % (slug, raw_bytes / 1e6, size / 1e6, note, flag))
        return "ok" if size <= SIZE_LIMIT else "oversize:%d" % size

    print("polling %d mesh prediction(s) — meshes take several minutes each"
          % len(preds))
    done = L.poll(preds, collect, budget_s=5400, interval=10, state_path=STATE)

    ok = sorted(k for k, v in done.items() if v == "ok")
    bad = sorted(k for k, v in done.items() if v != "ok")
    print("\nwithin budget: %d/%d" % (len(ok), len(preds)))
    if bad:
        print("NOT ready:")
        for b in bad:
            print("  %-26s %s" % (b, done[b]))
    print("next: python3 scripts/media/preview.py")
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main())
