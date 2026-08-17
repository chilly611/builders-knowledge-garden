#!/usr/bin/env python3
"""Step 1b — collect the FLUX images queued by 01 into work/images/.

Resumable: re-run it after a timeout and it only polls what has not settled.

  python3 scripts/media/01b_poll_images.py
"""

import json
import os
import sys

import _lib as L

PREDS = os.path.join(L.WORK, "img_preds.json")
STATE = os.path.join(L.WORK, "img_done.json")


def main():
    L.ensure_dirs()
    if not os.path.exists(PREDS):
        raise SystemExit("no %s — run 01_generate_images.py first" % PREDS)
    preds = json.load(open(PREDS))

    def collect(name, d):
        out = d["output"]
        url = out[0] if isinstance(out, list) else out
        dest = os.path.join(L.IMAGES, name + ".png")
        L.download(url, dest)
        return "ok"

    print("polling %d image prediction(s)" % len(preds))
    done = L.poll(preds, collect, budget_s=1800, interval=6, state_path=STATE)

    ok = sorted(k for k, v in done.items() if v == "ok")
    bad = sorted(k for k, v in done.items() if v != "ok")
    print("\ncollected %d/%d" % (len(ok), len(preds)))
    if bad:
        print("NOT collected:")
        for b in bad:
            print("  %-26s %s" % (b, done[b]))
    print("next: python3 scripts/media/02_generate_3d.py")
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main())
