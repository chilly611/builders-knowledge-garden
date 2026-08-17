#!/usr/bin/env python3
"""Step 4 — press a blueprint hero plate for every object via the studio engine.

Calls the kg-visual-studio generate API once per taxonomy slug and saves the
result under work/blueprints/, so 03_upload_studio.py can catalog them:

    work/blueprints/<slug>.png    the plate
    work/blueprints/<slug>.json   sidecar: prompt, seed, technique, aspect, source

The endpoint is SYNCHRONOUS — one HTTP call per plate, each running a Flux
prediction server-side, so budget roughly 20-60s per slug. Runs are resumable:
a slug whose .png already exists is skipped, so an interrupted pass resumes
instead of re-billing. --force re-presses.

AUTH is cookie-based. POST /api/auth {"code": ...} sets an httpOnly `kgs` cookie
which every later call must carry. The studio validates that code against its own
STUDIO_ACCESS_CODE env var; our local copy of it is STUDIO_GATE_CODE.

CONTRACT NOTE, verified by reading app/api/generate/route.ts on 2026-08-17:
the route reads `mode` as `body.mode === "cutout" ? "cutout" : "plate"`. There is
no "press" mode — passing it silently lands on "plate". We pass "plate"
explicitly so the request says what it means. The response is
{url, cutoutUrl, kind, technique, mode, seed, prompt, aspect, inspireCount}.

  export STUDIO_GATE_CODE=...            # or put it in scripts/media/.env
  python3 scripts/media/04_blueprints.py --dry            # show the plan
  python3 scripts/media/04_blueprints.py --go             # press all pending
  python3 scripts/media/04_blueprints.py --go --only=dishwasher,breaker-panel
"""

import json
import os
import sys
import time
import urllib.error
import urllib.request

import _lib as L

STUDIO = os.environ.get("STUDIO_URL", "https://kg-visual-studio.vercel.app").rstrip("/")
TECHNIQUE = "blueprint"
PROFILE = "rdkg"
VARIANT_INDEX = 1
ASPECT = "1:1"
MODE = "plate"                 # see CONTRACT NOTE above
OUT = os.path.join(L.WORK, "blueprints")
DOTENV = os.path.join(L.HERE, ".env")
PAUSE = 2.0                    # be a polite neighbour to a synchronous endpoint


def load_code():
    if os.path.exists(DOTENV):
        with open(DOTENV) as fh:
            for line in fh:
                line = line.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                k, v = line.split("=", 1)
                os.environ.setdefault(k.strip().replace("export ", "", 1).strip(),
                                      v.strip().strip("'\""))
    code = os.environ.get("STUDIO_GATE_CODE") or os.environ.get("STUDIO_ACCESS_CODE")
    if not code:
        raise SystemExit(
            "STUDIO_GATE_CODE is required (the studio's own env var is STUDIO_ACCESS_CODE).\n"
            "  put it in scripts/media/.env (gitignored):\n"
            "    STUDIO_GATE_CODE=<the studio gate code>"
        )
    return code


def post(url, payload, cookie=None, timeout=180):
    headers = {"Content-Type": "application/json"}
    if cookie:
        headers["Cookie"] = cookie
    r = urllib.request.Request(url, data=json.dumps(payload).encode(),
                               headers=headers, method="POST")
    try:
        with urllib.request.urlopen(r, timeout=timeout) as resp:
            body = resp.read()
            setc = resp.headers.get_all("Set-Cookie") or []
            return resp.status, json.loads(body or b"{}"), setc
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode("utf-8", "replace")[:400], []


def authenticate(code):
    status, body, setc = post(STUDIO + "/api/auth", {"code": code}, timeout=60)
    if status != 200 or not isinstance(body, dict) or not body.get("ok"):
        raise SystemExit("studio auth failed (%s): %s" % (status, body))
    jar = []
    for raw in setc:
        name = raw.split("=", 1)[0].strip()
        if name == "kgs":
            jar.append(raw.split(";", 1)[0].strip())
    if not jar:
        raise SystemExit("studio auth returned no kgs cookie — cannot proceed")
    return "; ".join(jar)


def fetch(url, dest):
    with urllib.request.urlopen(urllib.request.Request(url), timeout=300) as r:
        blob = r.read()
    if not blob:
        raise RuntimeError("empty body")
    with open(dest, "wb") as fh:
        fh.write(blob)
    return len(blob)


def main():
    args = sys.argv[1:]
    go = "--go" in args
    force = "--force" in args
    only = next((set(a.split("=", 1)[1].split(",")) for a in args
                 if a.startswith("--only=")), None)
    limit = next((int(a.split("=", 1)[1]) for a in args if a.startswith("--limit=")), None)

    os.makedirs(OUT, exist_ok=True)
    objs = L.load_objects()
    if only:
        objs = [o for o in objs if o["slug"] in only]

    pending = [o for o in objs
               if force or not os.path.exists(os.path.join(OUT, o["slug"] + ".png"))]
    if limit:
        pending = pending[:limit]

    print("studio  : %s" % STUDIO)
    print("technique %s · profile %s · aspect %s · mode %s · variant %d"
          % (TECHNIQUE, PROFILE, ASPECT, MODE, VARIANT_INDEX))
    print("taxonomy: %d slug(s) · already pressed %d · pending %d"
          % (len(objs), len(objs) - len([o for o in objs if not os.path.exists(
              os.path.join(OUT, o["slug"] + ".png"))]), len(pending)))
    print("out     : %s\n" % OUT)

    if not pending:
        print("nothing pending — every slug already has a blueprint (use --force to re-press)")
        return 0
    if not go:
        for o in pending[:12]:
            print("  would press  %s" % o["slug"])
        if len(pending) > 12:
            print("  ... and %d more" % (len(pending) - 12))
        print("\ndry run — re-run with --go to press")
        return 0

    code = load_code()
    cookie = authenticate(code)
    print("authenticated — pressing %d blueprint(s)\n" % len(pending))

    ok, failed = 0, []
    for i, o in enumerate(pending, 1):
        slug = o["slug"]
        subject = o.get("prompt_hint") or o.get("title") or slug
        status, body, _ = post(STUDIO + "/api/generate", {
            "subject": subject,
            "technique": TECHNIQUE,
            "profile": PROFILE,
            "variantIndex": VARIANT_INDEX,
            "mode": MODE,
            "aspect": ASPECT,
        }, cookie=cookie)

        if status != 200 or not isinstance(body, dict) or not body.get("url"):
            failed.append((slug, "generate %s: %s" % (status, str(body)[:200])))
            print("  [%2d/%2d] %-28s FAIL %s" % (i, len(pending), slug, str(body)[:90]))
            continue

        png = os.path.join(OUT, slug + ".png")
        try:
            n = fetch(body["url"], png)
        except Exception as e:                              # noqa: BLE001
            failed.append((slug, "download: %r" % e))
            print("  [%2d/%2d] %-28s FAIL download" % (i, len(pending), slug))
            continue

        json.dump({
            "slug": slug, "prompt": body.get("prompt"), "seed": body.get("seed"),
            "technique": body.get("technique"), "aspect": body.get("aspect"),
            "model": "kg-visual-studio/api/generate", "source_url": body["url"],
        }, open(os.path.join(OUT, slug + ".json"), "w"), indent=1)

        ok += 1
        print("  [%2d/%2d] %-28s %6.2f MB  seed=%s"
              % (i, len(pending), slug, n / 1e6, body.get("seed")))
        time.sleep(PAUSE)

    print("\npressed %d blueprint(s) -> %s" % (ok, OUT))
    if failed:
        print("\nFAILURES (%d):" % len(failed))
        for s, m in failed:
            print("  %-28s %s" % (s, m))
        print("\nre-run to retry only the misses (finished slugs are skipped)")
    print("\nnext: python3 scripts/media/03_upload_studio.py --only-family=blueprints --go")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
