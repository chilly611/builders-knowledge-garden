#!/usr/bin/env python3
"""Step 2 — queue one Trellis image-to-3D job per collected image.

Reads work/images/*.png, submits firtoz/trellis with the locked v1 settings
(texture_size 1024, mesh_simplify 0.92), writes work/mesh_preds.json.

The model's input schema is fetched first and the payload is filtered to the keys
it actually declares — that guard is from the proven run and stops a silent
schema drift from failing all 26 jobs at once.

  python3 scripts/media/02_generate_3d.py [--only=slug,slug]
"""

import base64
import glob
import json
import os
import sys

import _lib as L

MODEL = "firtoz/trellis"
PREDS = os.path.join(L.WORK, "mesh_preds.json")

SETTINGS = {
    "texture_size": 1024,
    "mesh_simplify": 0.92,
    "generate_model": True,
    "generate_color": False,
    "generate_normal": False,
    "randomize_seed": False,
    "seed": 7,
}


def data_url(path):
    with open(path, "rb") as fh:
        return "data:image/png;base64," + base64.b64encode(fh.read()).decode()


def main():
    L.ensure_dirs()

    d = L.api("/models/" + MODEL, timeout=30)
    ver = d["latest_version"]["id"]
    props = d["latest_version"]["openapi_schema"]["components"]["schemas"]["Input"]["properties"]
    print("trellis version %s | declared inputs: %s" % (ver[:12], sorted(props)))

    dropped = [k for k in SETTINGS if k not in props]
    if dropped:
        print("WARNING — model no longer declares: %s (dropping)" % dropped)

    only = [a.split("=", 1)[1] for a in sys.argv if a.startswith("--only=")]
    wanted = set(",".join(only).split(",")) if only else None

    imgs = sorted(glob.glob(os.path.join(L.IMAGES, "*.png")))
    if wanted:
        imgs = [p for p in imgs if os.path.basename(p)[:-4] in wanted]
    if not imgs:
        raise SystemExit("no images in %s — run 01/01b first" % L.IMAGES)

    print("queueing %d mesh job(s)" % len(imgs))
    preds = []
    for path in imgs:
        slug = os.path.basename(path)[:-4]
        inp = {k: v for k, v in SETTINGS.items() if k in props}
        inp["images"] = [data_url(path)]
        resp = L.api("/predictions", {"version": ver, "input": inp}, timeout=120)
        preds.append({"name": slug, "id": resp["id"]})
        print("  queued %-26s %s" % (slug, resp["id"]))

    json.dump(preds, open(PREDS, "w"), indent=1)
    print("\nwrote %s (%d)" % (PREDS, len(preds)))
    print("next: python3 scripts/media/02b_poll_3d.py")
    return 0


if __name__ == "__main__":
    sys.exit(main())
