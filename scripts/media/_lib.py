"""Shared helpers for the BKG 3-D media pipeline.

Deliberately stdlib-only (preview.py is the one exception — it needs numpy+PIL to
rasterize). objects.yaml is read through PyYAML when it is installed and through a
small strict parser when it is not, so a clean machine can run the pipeline with
nothing but python3 and node.
"""

import json
import os
import re
import sys
import time
import urllib.error
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
TAXONOMY = os.path.join(HERE, "objects.yaml")

# Intermediates (images, prediction ids, raw meshes) live here and are gitignored.
# Only the taxonomy, the scripts, and previews/ are committed.
WORK = os.path.join(HERE, "work")
IMAGES = os.path.join(WORK, "images")
RAW = os.path.join(WORK, "raw")
MODELS = os.path.join(WORK, "models")
POSTERS = os.path.join(WORK, "posters")
PREVIEWS = os.path.join(HERE, "previews")

VALID_STATUS = ("ready", "regenerate", "todo")
VALID_AESTHETIC = ("photoreal", "ceramic")

# Wrapped around a photoreal object's prompt_hint. Ceramic hints are used verbatim.
BASE_STYLE = (
    "professional studio product photograph of a single {obj}, entire object fully "
    "visible and centered, three-quarter angle view, isolated on a seamless pale "
    "warm-gray background, soft even studio lighting, photorealistic, high detail"
)

REPLICATE_API = "https://api.replicate.com/v1"
# Replicate 403s some default python UAs; the proven runs pinned curl's.
UA = "curl/8.5.0"


def ensure_dirs():
    for d in (WORK, IMAGES, RAW, MODELS, POSTERS, PREVIEWS):
        os.makedirs(d, exist_ok=True)


# ---------------------------------------------------------------- taxonomy ----

_SCALAR = re.compile(r'^([a-z_]+):\s*(?:"(.*)"|(.*))$')


def _parse_objects_yaml(text):
    """Strict mini-parser for the exact shape objects.yaml uses.

    Supports only what the file needs: `objects:` holding a list of maps whose
    values are plain or double-quoted single-line scalars. Anything else raises,
    so a hand-edit that drifts from the shape fails loudly instead of silently
    dropping a specimen.
    """
    objs, cur, in_list = [], None, False
    for lineno, raw in enumerate(text.splitlines(), 1):
        line = raw.split("#", 1)[0].rstrip() if not raw.strip().startswith("#") else ""
        if not line.strip():
            continue
        if re.match(r"^objects:\s*$", line):
            in_list = True
            continue
        if not in_list:
            continue  # top-level scalars (version:) are not needed by the pipeline
        m = re.match(r"^  - ([a-z_]+):\s*(?:\"(.*)\"|(.*))$", line)
        if m:
            if cur:
                objs.append(cur)
            cur = {}
            key = m.group(1)
            cur[key] = m.group(2) if m.group(2) is not None else m.group(3).strip()
            continue
        m = re.match(r"^    ([a-z_]+):\s*(?:\"(.*)\"|(.*))$", line)
        if m and cur is not None:
            cur[m.group(1)] = m.group(2) if m.group(2) is not None else m.group(3).strip()
            continue
        raise ValueError(
            "objects.yaml line %d does not match the expected shape: %r" % (lineno, raw)
        )
    if cur:
        objs.append(cur)
    return objs


def load_objects(path=TAXONOMY):
    with open(path, "r") as fh:
        text = fh.read()
    try:
        import yaml  # optional

        objs = yaml.safe_load(text)["objects"]
    except ImportError:
        objs = _parse_objects_yaml(text)

    required = ("slug", "title", "domain", "aesthetic", "prompt_hint", "status")
    seen = set()
    for o in objs:
        missing = [k for k in required if not o.get(k)]
        if missing:
            raise ValueError("%s missing fields: %s" % (o.get("slug", "?"), missing))
        if o["status"] not in VALID_STATUS:
            raise ValueError("%s: bad status %r" % (o["slug"], o["status"]))
        if o["aesthetic"] not in VALID_AESTHETIC:
            raise ValueError("%s: bad aesthetic %r" % (o["slug"], o["aesthetic"]))
        if not re.match(r"^[a-z0-9]+(-[a-z0-9]+)*$", o["slug"]):
            raise ValueError("%s: slug must be kebab-case" % o["slug"])
        if o["slug"] in seen:
            raise ValueError("duplicate slug %s" % o["slug"])
        seen.add(o["slug"])
    return objs


def select(objs, argv=None):
    """Default selection is everything not already accepted."""
    argv = sys.argv if argv is None else argv
    if "--all" in argv:
        picked = objs
    else:
        picked = [o for o in objs if o["status"] in ("todo", "regenerate")]
    only = [a.split("=", 1)[1] for a in argv if a.startswith("--only=")]
    if only:
        wanted = set(",".join(only).split(","))
        picked = [o for o in picked if o["slug"] in wanted]
        unknown = wanted - {o["slug"] for o in picked}
        if unknown:
            raise SystemExit("--only names unknown/unselected slugs: %s" % sorted(unknown))
    return picked


def prompt_for(obj):
    if obj["aesthetic"] == "ceramic":
        return obj["prompt_hint"]
    return BASE_STYLE.format(obj=obj["prompt_hint"])


def set_status(slug, status, path=TAXONOMY):
    """Rewrite one specimen's status in place, preserving comments and layout."""
    if status not in VALID_STATUS:
        raise ValueError(status)
    with open(path, "r") as fh:
        lines = fh.readlines()
    idx = None
    for i, line in enumerate(lines):
        if re.match(r"^  - slug:\s*%s\s*$" % re.escape(slug), line.rstrip()):
            idx = i
            break
    if idx is None:
        raise ValueError("slug not found in taxonomy: %s" % slug)
    for j in range(idx + 1, min(idx + 12, len(lines))):
        if lines[j].startswith("  - "):
            break
        if re.match(r"^    status:", lines[j]):
            lines[j] = "    status: %s\n" % status
            with open(path, "w") as fh:
                fh.writelines(lines)
            return True
    raise ValueError("no status line under %s" % slug)


# --------------------------------------------------------------- replicate ----


def token():
    t = os.environ.get("REPLICATE_API_TOKEN")
    if not t:
        raise SystemExit(
            "REPLICATE_API_TOKEN is not set.\n"
            "  export it, or put it in scripts/media/.env (gitignored) and run:\n"
            "  set -a; . scripts/media/.env; set +a"
        )
    return t


def api(path, body=None, method=None, timeout=60):
    url = path if path.startswith("http") else REPLICATE_API + path
    data = json.dumps(body).encode() if body is not None else None
    headers = {"Authorization": "Bearer " + token(), "User-Agent": UA}
    if data:
        headers["Content-Type"] = "application/json"
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    for attempt in range(4):
        try:
            with urllib.request.urlopen(req, timeout=timeout) as r:
                return json.loads(r.read())
        except urllib.error.HTTPError as e:
            # 429/5xx are transient; 4xx else is a real error worth surfacing.
            if e.code in (429, 500, 502, 503, 504) and attempt < 3:
                time.sleep(2 ** attempt * 3)
                continue
            raise SystemExit("replicate %s %s -> %s %s" % (method or "GET", url, e.code, e.read()[:400]))
        except Exception:
            if attempt < 3:
                time.sleep(2 ** attempt * 3)
                continue
            raise
    raise SystemExit("unreachable")


def poll(preds, on_success, budget_s=3600, interval=8, state_path=None):
    """Poll a list of {name,id} predictions until all settle or the budget runs out.

    Resumable: state is checkpointed after every change, so re-running picks up
    where a killed run stopped instead of re-billing the finished ones.
    """
    names = {p["name"] for p in preds}
    prior = {}
    if state_path and os.path.exists(state_path):
        prior = json.load(open(state_path))
    # Resume only the specimens THIS run is about. Carrying the whole prior state
    # would make a --only re-run think it was already finished (len(done) >= len(
    # preds)) and exit without collecting anything.
    done = {k: v for k, v in prior.items() if k in names}

    def save():
        if state_path:
            merged = dict(prior)
            merged.update(done)
            json.dump(merged, open(state_path, "w"), indent=1)

    t0 = time.time()
    while len(done) < len(preds):
        progressed = False
        for p in preds:
            if p["name"] in done:
                continue
            try:
                d = api("/predictions/" + p["id"], timeout=30)
            except SystemExit as e:
                print("  poll error %s: %s" % (p["name"], e))
                continue
            st = d.get("status")
            if st == "succeeded":
                try:
                    done[p["name"]] = on_success(p["name"], d)
                except Exception as e:
                    done[p["name"]] = "post-error: %s" % e
                    print("  POST-PROCESS FAILED %s: %s" % (p["name"], e))
                else:
                    print("  ok %s" % p["name"])
                progressed = True
            elif st in ("failed", "canceled"):
                done[p["name"]] = "failed: %s" % str(d.get("error"))[:160]
                print("  FAILED %s — %s" % (p["name"], str(d.get("error"))[:160]))
                progressed = True
        if progressed:
            save()
        if len(done) >= len(preds):
            break
        if time.time() - t0 > budget_s:
            print("  budget exhausted with %d/%d settled — re-run to resume"
                  % (len(done), len(preds)))
            break
        time.sleep(interval)
    save()
    return done


def download(url, dest):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=300) as r, open(dest, "wb") as fh:
        fh.write(r.read())
    return os.path.getsize(dest)
