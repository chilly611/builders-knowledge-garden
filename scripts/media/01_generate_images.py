#!/usr/bin/env python3
"""Step 1 — queue one FLUX-dev image per selected specimen.

Reads objects.yaml, submits a prediction for every `todo`/`regenerate` row, and
writes work/img_preds.json for 01b to collect. Logic is the proven v1 run's;
only the paths and the prompt source (taxonomy instead of an inline dict) moved.

  python3 scripts/media/01_generate_images.py [--all] [--only=slug,slug]
"""

import json
import os
import sys

import _lib as L

MODEL = "black-forest-labs/flux-dev"
PREDS = os.path.join(L.WORK, "img_preds.json")


def main():
    L.ensure_dirs()
    objs = L.load_objects()
    picked = L.select(objs)
    if not picked:
        print("nothing to generate — no todo/regenerate rows (use --all to force)")
        return 0

    print("queueing %d image(s) on %s" % (len(picked), MODEL))
    preds = []
    for o in picked:
        prompt = L.prompt_for(o)
        d = L.api(
            "/models/%s/predictions" % MODEL,
            {
                "input": {
                    "prompt": prompt,
                    "aspect_ratio": "1:1",
                    "output_format": "png",
                    "disable_safety_checker": True,
                    "guidance": 3,
                }
            },
        )
        preds.append({"name": o["slug"], "id": d["id"], "prompt": prompt})
        print("  queued %-26s %s" % (o["slug"], d["id"]))

    json.dump(preds, open(PREDS, "w"), indent=1)
    print("\nwrote %s (%d)" % (PREDS, len(preds)))
    print("next: python3 scripts/media/01b_poll_images.py")
    return 0


if __name__ == "__main__":
    sys.exit(main())
