#!/usr/bin/env python3
"""Step 3 — publish the media library to the shared studio catalog.

Four asset families, each with its own storage prefix in the `brand-assets` bucket:

    assets/bkg/3d/models/<slug>.glb        model/gltf-binary  asset_type 3d-model
    assets/bkg/3d/plates/plate-<slug>.jpg  image/jpeg         asset_type plate
    assets/bkg/3d/blueprints/<slug>.png    image/png          asset_type plate  +tag blueprint
    assets/bkg/motion/<name>.mp4           video/mp4          asset_type motion

Plates and blueprints carry rendition_role='poster' and parent_asset_id -> their
specimen's GLB row, so a specimen is one graph rather than loose files. The GLB
row's params.poster_path points at its plate; the studio grid reads that to poster
its <model-viewer>.

public.studio_library is a VIEW over brand_assets, not a table. It filters to
bucket='brand-assets' AND status='published' AND visibility IN ('system','shared')
and COMPUTES public_url from storage_path. It also does not expose garden_scope,
key, filename, mime_type or status — all NOT NULL — so writing through the view is
impossible. Rows go to brand_assets; a row reaches the library only once published.

NOTE on status: brand_assets.status defaults to 'working', which is NOT in its own
CHECK list (draft|in_review|brand_qa|published|retired). Any insert that omits
status therefore fails. Every row this script writes sets status explicitly.

GATES per family (verified live 2026-08-17 on vlezoyalutexenbnzzui):
  * motion needs NOTHING — asset_type 'motion' and video/mp4 are already admitted.
  * models need BOTH  supabase/migrations/20260816_brand_assets_3d_model_type.sql
    (asset_type '3d-model' + generator 'flux+trellis') AND
    supabase/migrations/20260817_brand_assets_bucket_glb_mime.sql
    (bucket allow-list gains model/gltf-binary).
  Preflight is family-aware, so --only-family=motion runs before either lands.

SAFETY — this writes to shared multi-tenant prod (7 garden scopes, 264 rows):
  * dry-run by default; --go is required to mutate anything
  * the project ref in SUPABASE_URL is asserted against EXPECT_PROJECT_REF
  * live CHECK constraints are preflighted per family; a run aborts with the exact
    remediation rather than mis-tagging assets to squeeze past them
  * rows land status=draft unless --publish is passed
  * every write upserts on the unique `key`, so a re-run repairs a partial run
  * --verify GETs every public_url after the write and asserts 200

Credentials come from scripts/media/.env (gitignored) or the environment:
    SUPABASE_URL=https://vlezoyalutexenbnzzui.supabase.co
    SUPABASE_SERVICE_ROLE=<service role key>

  python3 scripts/media/03_upload_studio.py                              # dry run, all
  python3 scripts/media/03_upload_studio.py --only-family=motion --go    # motion only
  python3 scripts/media/03_upload_studio.py --go --publish --verify      # everything
"""

import csv
import glob
import json
import os
import subprocess
import sys
import urllib.error
import urllib.request

import _lib as L

EXPECT_PROJECT_REF = "vlezoyalutexenbnzzui"   # knowledge-gardens-prod, multi-tenant
BUCKET = "brand-assets"
GARDEN_SCOPE = "bkg"

P_MODELS = "assets/bkg/3d/models"
P_PLATES = "assets/bkg/3d/plates"
P_BLUEPRINTS = "assets/bkg/3d/blueprints"
P_MOTION = "assets/bkg/motion"

ASSET_TYPE_3D = "3d-model"          # added by 20260816_...sql
GENERATOR_3D = "flux+trellis"       # added by 20260816_...sql
# Higgsfield is not an admitted generator and this brief does not add one. 'upload'
# is already in the CHECK list and already used by live motion rows; the real
# lineage is recorded in model + params so nothing is lost.
GENERATOR_MOTION = "upload"
MODEL_MOTION = "higgsfield/seedance_2_5"

BASE_TAGS = ["bkg", "library-v1"]
SIZE_LIMIT = 2_000_000              # keep in step with 02b_poll_3d.SIZE_LIMIT
MOTION_DIR = os.path.expanduser("~/Downloads/kg-motion-v1")

FAMILIES = ("models", "plates", "blueprints", "motion")
DOTENV = os.path.join(L.HERE, ".env")


# ------------------------------------------------------------------- creds ----

def load_env():
    if os.path.exists(DOTENV):
        with open(DOTENV) as fh:
            for line in fh:
                line = line.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                k, v = line.split("=", 1)
                k = k.strip().replace("export ", "", 1).strip()
                os.environ.setdefault(k, v.strip().strip("'\""))
    url = os.environ.get("SUPABASE_URL", "").rstrip("/")
    key = os.environ.get("SUPABASE_SERVICE_ROLE") or os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        raise SystemExit(
            "SUPABASE_URL and SUPABASE_SERVICE_ROLE are required.\n"
            "  put them in scripts/media/.env (gitignored, never committed):\n"
            "    SUPABASE_URL=https://%s.supabase.co\n"
            "    SUPABASE_SERVICE_ROLE=<service role key>" % EXPECT_PROJECT_REF
        )
    ref = url.split("//", 1)[-1].split(".", 1)[0]
    if ref != EXPECT_PROJECT_REF:
        raise SystemExit(
            "REFUSING TO WRITE — SUPABASE_URL points at project %r, expected %r.\n"
            "  This catalog is shared and multi-tenant; check .env before retrying."
            % (ref, EXPECT_PROJECT_REF)
        )
    return url, key


def req(url, key, method="GET", body=None, ctype=None, prefer=None):
    headers = {"apikey": key, "Authorization": "Bearer " + key}
    if prefer:
        headers["Prefer"] = prefer
    data = None
    if body is not None:
        data = json.dumps(body).encode()
        headers["Content-Type"] = "application/json"
    elif ctype:
        headers["Content-Type"] = ctype
    r = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(r, timeout=300) as resp:
            payload = resp.read()
            return resp.status, (json.loads(payload) if payload[:1] in (b"{", b"[") else payload)
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode("utf-8", "replace")[:600]


# --------------------------------------------------------------- preflight ----

def probe(url, key, asset_type, generator, mime, suffix):
    """Attempt a real insert with these values, then delete it.

    Reading the CHECK error is the only way to test admissibility without DDL
    rights. visibility='private' keeps the probe out of studio_library even in the
    window before it is deleted.
    """
    pk = "__preflight_probe_%s__" % suffix
    status, body = req(
        url + "/rest/v1/brand_assets?on_conflict=key", key, "POST",
        body=[{
            "bucket": BUCKET, "storage_path": "__preflight__/probe." + suffix,
            "filename": "probe." + suffix, "mime_type": mime,
            "slug": pk, "title": "preflight probe",
            "asset_type": asset_type, "garden_scope": GARDEN_SCOPE,
            "generator": generator, "status": "draft", "visibility": "private",
            "key": pk,
        }],
        prefer="resolution=merge-duplicates,return=representation",
    )
    if status in (200, 201):
        req(url + "/rest/v1/brand_assets?key=eq." + pk, key, "DELETE")
        return True, None
    return False, body if isinstance(body, str) else json.dumps(body)


def preflight(url, key, families):
    status, body = req(url + "/rest/v1/brand_assets?select=id&limit=1", key)
    if status != 200:
        raise SystemExit("cannot reach brand_assets (%s): %s" % (status, body))

    if "models" in families:
        ok, err = probe(url, key, ASSET_TYPE_3D, GENERATOR_3D, "model/gltf-binary", "3d")
        if not ok:
            if "asset_type_check" in (err or "") or "generator_check" in (err or ""):
                raise SystemExit(
                    "PREFLIGHT FAILED — the live catalog still rejects 3-D specimens.\n\n"
                    "  %s\n\n"
                    "  brand_assets CHECK constraints do not yet admit\n"
                    "    asset_type = '%s'   and/or   generator = '%s'\n\n"
                    "  Apply first (shared prod):\n"
                    "    supabase/migrations/20260816_brand_assets_3d_model_type.sql\n"
                    "    supabase/migrations/20260817_brand_assets_bucket_glb_mime.sql\n\n"
                    "  Refusing to mis-tag specimens to get past it.\n"
                    "  Motion needs neither migration: --only-family=motion"
                    % ((err or "")[:300], ASSET_TYPE_3D, GENERATOR_3D)
                )
            raise SystemExit("preflight (3d) failed: %s" % (err or "")[:400])
        print("preflight OK — catalog admits %s / %s" % (ASSET_TYPE_3D, GENERATOR_3D))

    if {"plates", "blueprints", "motion"} & set(families):
        at = "motion" if "motion" in families else "plate"
        mime = "video/mp4" if at == "motion" else "image/jpeg"
        gen = GENERATOR_MOTION if at == "motion" else "flux"
        ok, err = probe(url, key, at, gen, mime, "std")
        if not ok:
            raise SystemExit("preflight (%s) failed: %s" % (at, (err or "")[:400]))
        print("preflight OK — catalog admits %s / %s" % (at, gen))
    print("")


# ------------------------------------------------------------------ upload ----

def storage_put(url, key, path, blob, ctype, dry):
    if dry:
        return True, "(dry-run)"
    dest = "%s/storage/v1/object/%s/%s" % (url, BUCKET, path)
    headers = {"apikey": key, "Authorization": "Bearer " + key,
               "Content-Type": ctype, "x-upsert": "true"}
    r = urllib.request.Request(dest, data=blob, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(r, timeout=600) as resp:
            return resp.status in (200, 201), str(resp.status)
    except urllib.error.HTTPError as e:
        txt = e.read().decode("utf-8", "replace")[:300]
        if e.code in (400, 415) and "mime" in txt.lower():
            txt += ("  <- bucket allow-list rejects this type; apply "
                    "supabase/migrations/20260817_brand_assets_bucket_glb_mime.sql")
        return False, "%s %s" % (e.code, txt)


def public_url(url, path):
    return "%s/storage/v1/object/public/%s/%s" % (url, BUCKET, path)


def upsert(url, key, row, dry):
    if dry:
        return True, None
    status, body = req(
        url + "/rest/v1/brand_assets?on_conflict=key", key, "POST", body=[row],
        prefer="resolution=merge-duplicates,return=representation",
    )
    if status in (200, 201) and isinstance(body, list) and body:
        return True, body[0].get("id")
    return False, "%s %s" % (status, body if isinstance(body, str) else json.dumps(body)[:300])


def base_row(path, mime, size, slug, title, asset_type, tags,
             generator=None, model=None, prompt=None, params=None,
             width=None, height=None, duration_ms=None,
             rendition_role=None, parent_id=None, description=None):
    row = {
        "bucket": BUCKET,
        "storage_path": path,
        "filename": os.path.basename(path),
        "mime_type": mime,
        "file_size_bytes": size,
        "slug": slug,
        "title": title,
        "asset_type": asset_type,
        "garden_scope": GARDEN_SCOPE,
        "generator": generator,
        "model": model,
        "prompt": prompt,
        "params": dict(params or {}, bytes=size),
        "tags": tags,
        "surfaces": [],
        "key": "bkg:%s" % path,          # storage path is the natural idempotency key
    }
    for k, v in (("width", width), ("height", height), ("duration_ms", duration_ms),
                 ("rendition_role", rendition_role), ("parent_asset_id", parent_id),
                 ("description", description)):
        if v is not None:
            row[k] = v
    return row


# ------------------------------------------------------------------- probes ----

def img_dims(p):
    """width/height without a Pillow dependency, via ffprobe (already required)."""
    try:
        out = subprocess.run(
            ["ffprobe", "-v", "error", "-select_streams", "v:0",
             "-show_entries", "stream=width,height", "-of", "csv=p=0:s=x", p],
            capture_output=True, text=True, timeout=30).stdout.strip()
        w, h = out.split("x")[:2]
        return int(w), int(h)
    except Exception:
        return None, None


def video_meta(p):
    try:
        out = subprocess.run(
            ["ffprobe", "-v", "error", "-select_streams", "v:0",
             "-show_entries", "stream=width,height:format=duration",
             "-of", "default=nw=1:nk=1", p],
            capture_output=True, text=True, timeout=30).stdout.split()
        w, h, dur = int(out[0]), int(out[1]), float(out[2])
        return w, h, int(round(dur * 1000))
    except Exception:
        return None, None, None


# -------------------------------------------------------------------- main ----

def collect_specimens(objs, only):
    """ready specimens that have a mesh on disk, with their plate if present."""
    out = []
    for gp in sorted(glob.glob(os.path.join(L.MODELS, "*.glb"))):
        slug = os.path.basename(gp)[:-4]
        if only and slug not in only:
            continue
        obj = objs.get(slug)
        if not obj:
            out.append((slug, None, gp, None, "not in objects.yaml"))
            continue
        if obj.get("status") != "ready":
            out.append((slug, obj, gp, None, "status=%s" % obj.get("status")))
            continue
        pp = os.path.join(L.POSTERS, slug + ".jpg")
        out.append((slug, obj, gp, pp if os.path.exists(pp) else None, None))
    return out


def collect_motion():
    """the Higgsfield keepers, gated on the manifest the motion lane produced."""
    man = os.path.join(MOTION_DIR, "manifest.csv")
    keepers = os.path.join(MOTION_DIR, "keepers")
    if not (os.path.exists(man) and os.path.isdir(keepers)):
        return [], None
    kept = {}
    with open(man, newline="") as fh:
        for r in csv.DictReader(fh):
            if (r.get("keep") or "").strip().lower() != "y":
                continue
            f = os.path.basename((r.get("file") or "").strip())
            if f.endswith(".mp4"):
                kept[f] = r
    rows = []
    for f in sorted(os.listdir(keepers)):
        if f.endswith(".mp4") and f in kept:
            rows.append((os.path.join(keepers, f), kept[f]))
    return rows, man


def main():
    args = sys.argv[1:]
    dry = "--go" not in args
    publish = "--publish" in args
    verify = "--verify" in args
    only = next((set(a.split("=", 1)[1].split(",")) for a in args
                 if a.startswith("--only=")), None)
    fams = next((tuple(a.split("=", 1)[1].split(",")) for a in args
                 if a.startswith("--only-family=")), FAMILIES)
    bad = [f for f in fams if f not in FAMILIES]
    if bad:
        raise SystemExit("unknown family %r — pick from %s" % (bad, ", ".join(FAMILIES)))

    url, key = load_env()
    objs = {o["slug"]: o for o in L.load_objects()}
    prompts = {}
    pj = os.path.join(L.WORK, "img_preds.json")
    if os.path.exists(pj):
        prompts = {p["name"]: p.get("prompt", "") for p in json.load(open(pj))}

    specimens = collect_specimens(objs, only) if {"models", "plates"} & set(fams) else []
    ready = [s for s in specimens if s[4] is None]
    held = [s for s in specimens if s[4] is not None]
    motion, man = collect_motion() if "motion" in fams else ([], None)
    blueprints = sorted(glob.glob(os.path.join(L.WORK, "blueprints", "*.png"))) \
        if "blueprints" in fams else []

    if held:
        print("holding back %d specimen(s) not ready:" % len(held))
        for slug, _o, _g, _p, why in held:
            print("  %-28s %s" % (slug, why))
        print("")

    oversize = [g for _s, _o, g, _p, _w in ready if os.path.getsize(g) > SIZE_LIMIT]
    if oversize:
        raise SystemExit(
            "REFUSING — %d model(s) exceed the %d-byte gate:\n%s"
            % (len(oversize), SIZE_LIMIT,
               "\n".join("  %s  %.2f MB" % (os.path.basename(p), os.path.getsize(p) / 1e6)
                         for p in oversize)))

    print("project : %s  (%s)" % (url, EXPECT_PROJECT_REF))
    print("mode    : %s%s" % ("DRY RUN — nothing will be written" if dry else "LIVE WRITE",
                              "" if dry else (" · publish" if publish else " · draft")))
    print("families: %s" % ", ".join(fams))
    print("payload : %d specimen(s)  %d blueprint(s)  %d motion clip(s)"
          % (len(ready), len(blueprints), len(motion)))
    if "motion" in fams and not motion:
        print("          (no motion — %s/manifest.csv + keepers/ not found)" % MOTION_DIR)
    print("")

    if not (ready or blueprints or motion):
        raise SystemExit("nothing to upload for families: %s" % ", ".join(fams))

    if not dry:
        preflight(url, key, fams)

    status_val = "published" if publish else "draft"
    visibility = "shared" if publish else "private"
    urls, failures = [], []

    # ---- specimens: GLB first so its id can parent the plate ----
    for slug, obj, gp, pp, _why in ready:
        prompt = prompts.get(slug, L.prompt_for(obj))
        gpath = "%s/%s.glb" % (P_MODELS, slug)
        ppath = "%s/plate-%s.jpg" % (P_PLATES, slug)
        gid = None

        if "models" in fams:
            ok, msg = storage_put(url, key, gpath, open(gp, "rb").read(),
                                  "model/gltf-binary", dry)
            if not ok:
                failures.append((slug, "glb upload: " + msg))
                continue
            row = base_row(
                gpath, "model/gltf-binary", os.path.getsize(gp),
                "bkg-3d-%s" % slug, obj["title"], ASSET_TYPE_3D,
                BASE_TAGS + ["3d", obj["domain"]],
                generator=GENERATOR_3D, model="firtoz/trellis", prompt=prompt,
                params={"aesthetic": obj["aesthetic"], "domain": obj["domain"],
                        "pipeline": "flux-dev -> trellis -> gltf-transform draco",
                        "texture_size": 1024, "mesh_simplify": 0.92,
                        # the studio grid posters <model-viewer> from this
                        "poster_path": ppath if pp else None},
                rendition_role="original", description=obj["prompt_hint"][:500])
            row["status"], row["visibility"] = status_val, visibility
            ok, gid = upsert(url, key, row, dry)
            if not ok:
                failures.append((slug, "glb row: " + str(gid)))
                continue
            urls.append(public_url(url, gpath))
            print("  %-28s %6.2f MB  glb" % (slug, os.path.getsize(gp) / 1e6))

        if "plates" in fams and pp:
            ok, msg = storage_put(url, key, ppath, open(pp, "rb").read(),
                                  "image/jpeg", dry)
            if not ok:
                failures.append((slug, "plate upload: " + msg))
                continue
            w, h = img_dims(pp)
            row = base_row(
                ppath, "image/jpeg", os.path.getsize(pp),
                "bkg-plate-%s" % slug, "%s (plate)" % obj["title"], "plate",
                BASE_TAGS + ["plate", obj["domain"]],
                generator="flux", model="black-forest-labs/flux-dev", prompt=prompt,
                params={"aesthetic": obj["aesthetic"], "domain": obj["domain"]},
                width=w, height=h, rendition_role="poster",
                parent_id=gid if gid else None)
            row["status"], row["visibility"] = status_val, visibility
            ok, pid = upsert(url, key, row, dry)
            if not ok:
                failures.append((slug, "plate row: " + str(pid)))
                continue
            urls.append(public_url(url, ppath))

    # ---- blueprints (produced by 04_blueprints.py) ----
    for bp in blueprints:
        slug = os.path.basename(bp)[:-4]
        obj = objs.get(slug) or {}
        bpath = "%s/%s.png" % (P_BLUEPRINTS, slug)
        ok, msg = storage_put(url, key, bpath, open(bp, "rb").read(), "image/png", dry)
        if not ok:
            failures.append((slug, "blueprint upload: " + msg))
            continue
        w, h = img_dims(bp)
        sidecar = bp[:-4] + ".json"
        meta = json.load(open(sidecar)) if os.path.exists(sidecar) else {}
        row = base_row(
            bpath, "image/png", os.path.getsize(bp),
            "bkg-blueprint-%s" % slug,
            "%s (blueprint)" % (obj.get("title") or slug), "plate",
            BASE_TAGS + ["blueprint", obj.get("domain", "")] if obj.get("domain")
            else BASE_TAGS + ["blueprint"],
            generator="flux", model=meta.get("model") or "kg-visual-studio",
            prompt=meta.get("prompt"),
            params={"technique": "blueprint", "profile": "rdkg",
                    "seed": meta.get("seed"), "source": "kg-visual-studio/api/generate"},
            width=w, height=h, rendition_role="hero")
        row["status"], row["visibility"] = status_val, visibility
        ok, bid = upsert(url, key, row, dry)
        if not ok:
            failures.append((slug, "blueprint row: " + str(bid)))
            continue
        urls.append(public_url(url, bpath))
        print("  %-28s %6.2f MB  blueprint" % (slug, os.path.getsize(bp) / 1e6))

    # ---- motion (needs no migration) ----
    for mp, rec in motion:
        name = os.path.basename(mp)[:-4]
        mpath = "%s/%s.mp4" % (P_MOTION, name)
        ok, msg = storage_put(url, key, mpath, open(mp, "rb").read(), "video/mp4", dry)
        if not ok:
            failures.append((name, "motion upload: " + msg))
            continue
        w, h, dur = video_meta(mp)
        fam = (rec.get("family") or "").strip()
        row = base_row(
            mpath, "video/mp4", os.path.getsize(mp),
            "bkg-motion-%s" % name, name.replace("kg-", "").replace("-v1", "").replace("-", " "),
            "motion", BASE_TAGS + ["motion", fam] if fam else BASE_TAGS + ["motion"],
            generator=GENERATOR_MOTION, model=MODEL_MOTION,
            prompt=(rec.get("prompt") or "").strip() or None,
            params={"family": fam,
                    "seamless": (rec.get("seamless") or "").strip(),
                    "loop_method": (rec.get("loop_method") or "").strip(),
                    "seam_ssim": (rec.get("seam_ssim") or "").strip(),
                    "provenance": "higgsfield seedance_2_5; generator column is "
                                  "'upload' because 'higgsfield' is not an admitted value",
                    "source_manifest": man},
            width=w, height=h, duration_ms=dur, rendition_role="original")
        row["status"], row["visibility"] = status_val, visibility
        ok, mid = upsert(url, key, row, dry)
        if not ok:
            failures.append((name, "motion row: " + str(mid)))
            continue
        urls.append(public_url(url, mpath))
        print("  %-28s %6.2f MB  motion" % (name, os.path.getsize(mp) / 1e6))

    out = os.path.join(L.WORK, "uploaded.json")
    json.dump({"urls": urls, "failures": failures, "status": status_val},
              open(out, "w"), indent=1)

    print("\n%s %d object(s); manifest -> %s"
          % ("would upload" if dry else "uploaded", len(urls), out))

    # ---- verify ----
    if verify and not dry:
        print("\nverifying %d public URL(s)…" % len(urls))
        bad = []
        for u in urls:
            try:
                with urllib.request.urlopen(
                        urllib.request.Request(u, method="GET"), timeout=60) as r:
                    code = r.status
            except urllib.error.HTTPError as e:
                code = e.code
            except Exception as e:                       # noqa: BLE001
                code = repr(e)
            if code != 200:
                bad.append((u, code))
        if bad:
            print("FAILED verification (%d):" % len(bad))
            for u, c in bad:
                print("  %s  -> %s" % (c, u))
            failures.extend(bad)
        else:
            print("all %d URL(s) returned 200" % len(urls))

    if urls:
        print("\n--- public URLs ---")
        for u in urls:
            print(u)

    if failures:
        print("\nFAILURES (%d):" % len(failures))
        for a, b in failures:
            print("  %-28s %s" % (a, b))
    if dry:
        print("\nthis was a DRY RUN — re-run with --go to write")
    elif not publish:
        print("\nrows are status=draft — NOT visible in studio_library yet.\n"
              "re-run with --go --publish to promote them.")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
