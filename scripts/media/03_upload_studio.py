#!/usr/bin/env python3
"""Step 3 — publish optimized specimens to the shared studio library.

For each specimen this uploads two objects into the `brand-assets` bucket under
assets/bkg/3d/ and catalogs them in public.brand_assets:

    <slug>.glb   model/gltf-binary   asset_type 3d-model, rendition_role original
    <slug>.jpg   image/jpeg          asset_type poster,   rendition_role poster
                                     parent_asset_id -> the glb row

public.studio_library is a VIEW over brand_assets, not a table — it filters to
bucket='brand-assets' AND status='published' AND visibility IN ('system','shared'),
and it COMPUTES public_url from storage_path. So rows are written to brand_assets
and a specimen only appears in studio_library once it is published.

SAFETY — this writes to shared multi-tenant prod (vlezoyalutexenbnzzui):
  * dry-run by default; --go is required to mutate anything
  * the project ref in SUPABASE_URL is asserted against EXPECT_PROJECT_REF
  * the live CHECK constraints are preflighted; the run aborts with the exact
    remediation rather than mis-tagging specimens to squeeze past them
  * rows land as status=draft unless --publish is passed
  * every write is idempotent (upsert on the unique `key`), so a re-run repairs
    a partial run instead of duplicating it

Credentials come from scripts/media/.env (gitignored) or the environment:
    SUPABASE_URL=https://vlezoyalutexenbnzzui.supabase.co
    SUPABASE_SERVICE_ROLE=<service role key>

  python3 scripts/media/03_upload_studio.py                 # dry run
  python3 scripts/media/03_upload_studio.py --go            # upload + catalog as draft
  python3 scripts/media/03_upload_studio.py --go --publish  # ...and publish
"""

import glob
import json
import os
import sys
import urllib.error
import urllib.request

import _lib as L

EXPECT_PROJECT_REF = "vlezoyalutexenbnzzui"   # knowledge-gardens-prod, multi-tenant
BUCKET = "brand-assets"
PREFIX = "assets/bkg/3d"
GARDEN_SCOPE = "bkg"
ASSET_TYPE_3D = "3d-model"
GENERATOR = "flux+trellis"
BASE_TAGS = ["bkg", "3d", "library-v1"]
SIZE_LIMIT = 2_000_000        # keep in step with 02b_poll_3d.SIZE_LIMIT

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


def req(url, key, method="GET", body=None, raw=None, ctype=None, prefer=None):
    headers = {"apikey": key, "Authorization": "Bearer " + key}
    if prefer:
        headers["Prefer"] = prefer
    data = raw
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

def preflight(url, key):
    """Assert the live CHECK constraints admit what we are about to write."""
    status, body = req(url + "/rest/v1/brand_assets?select=id&limit=1", key)
    if status != 200:
        raise SystemExit("cannot reach brand_assets (%s): %s" % (status, body))

    # The only reliable way to test a CHECK without DDL rights is to attempt a
    # write and read the error. Do it inside a row we immediately delete.
    probe_key = "__preflight_probe_3d__"
    status, body = req(
        url + "/rest/v1/brand_assets?on_conflict=key", key, "POST",
        body=[{
            "bucket": BUCKET, "storage_path": "__preflight__/probe.glb",
            "filename": "probe.glb", "mime_type": "model/gltf-binary",
            "slug": probe_key, "title": "preflight probe",
            "asset_type": ASSET_TYPE_3D, "garden_scope": GARDEN_SCOPE,
            "generator": GENERATOR, "status": "draft", "visibility": "private",
            "key": probe_key,
        }],
        prefer="resolution=merge-duplicates,return=representation",
    )
    if status in (200, 201):
        req(url + "/rest/v1/brand_assets?key=eq." + probe_key, key, "DELETE")
        return True

    txt = body if isinstance(body, str) else json.dumps(body)
    if "asset_type_check" in txt or "generator_check" in txt:
        raise SystemExit(
            "PREFLIGHT FAILED — the live catalog still rejects 3-D specimens.\n\n"
            "  %s\n\n"
            "  brand_assets CHECK constraints do not yet admit\n"
            "    asset_type = '%s'   and/or   generator = '%s'\n\n"
            "  Apply this first (founder-supervised, shared prod):\n"
            "    supabase/migrations/20260816_brand_assets_3d_model_type.sql\n\n"
            "  Refusing to mis-tag specimens as 'illustration'/'flux' to get past it."
            % (txt[:300], ASSET_TYPE_3D, GENERATOR)
        )
    raise SystemExit("preflight write failed (%s): %s" % (status, txt[:400]))


# ------------------------------------------------------------------ upload ----

def storage_put(url, key, path, blob, ctype, dry):
    dest = "%s/storage/v1/object/%s/%s" % (url, BUCKET, path)
    if dry:
        return True, "(dry-run)"
    headers = {"apikey": key, "Authorization": "Bearer " + key,
               "Content-Type": ctype, "x-upsert": "true"}
    r = urllib.request.Request(dest, data=blob, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(r, timeout=600) as resp:
            return resp.status in (200, 201), str(resp.status)
    except urllib.error.HTTPError as e:
        return False, "%s %s" % (e.code, e.read().decode("utf-8", "replace")[:200])


def public_url(url, path):
    return "%s/storage/v1/object/public/%s/%s" % (url, BUCKET, path)


def row_for(obj, kind, path, size, prompt, parent_id=None):
    slug = obj["slug"]
    is_glb = kind == "glb"
    return {
        "bucket": BUCKET,
        "storage_path": path,
        "filename": os.path.basename(path),
        "mime_type": "model/gltf-binary" if is_glb else "image/jpeg",
        "file_size_bytes": size,
        "slug": "bkg-3d-%s%s" % (slug, "" if is_glb else "-poster"),
        "title": obj["title"] if is_glb else obj["title"] + " (poster)",
        "description": obj["prompt_hint"][:500],
        "asset_type": ASSET_TYPE_3D if is_glb else "poster",
        "garden_scope": GARDEN_SCOPE,
        "generator": GENERATOR if is_glb else "flux",
        "model": "firtoz/trellis" if is_glb else "black-forest-labs/flux-dev",
        "prompt": prompt,
        "params": {
            "aesthetic": obj["aesthetic"],
            "domain": obj["domain"],
            "bytes": size,
            "pipeline": "flux-dev -> trellis -> gltf-transform draco",
            **({"texture_size": 1024, "mesh_simplify": 0.92} if is_glb else {}),
        },
        "tags": BASE_TAGS + [obj["domain"]] + ([] if is_glb else ["poster"]),
        "rendition_role": "original" if is_glb else "poster",
        "surfaces": [],
        "key": "bkg:%s" % path,
        **({"parent_asset_id": parent_id} if parent_id else {}),
    }


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


# -------------------------------------------------------------------- main ----

def main():
    args = sys.argv[1:]
    dry = "--go" not in args
    publish = "--publish" in args
    only = next((a.split("=", 1)[1] for a in args if a.startswith("--only=")), None)

    url, key = load_env()
    objs = {o["slug"]: o for o in L.load_objects()}
    prompts = {}
    pj = os.path.join(L.WORK, "img_preds.json")
    if os.path.exists(pj):
        prompts = {p["name"]: p.get("prompt", "") for p in json.load(open(pj))}

    paths = sorted(glob.glob(os.path.join(L.MODELS, "*.glb")))
    if only:
        wanted = set(only.split(","))
        paths = [p for p in paths if os.path.basename(p)[:-4] in wanted]

    # objects.yaml is the gate: only accepted specimens reach the shared library.
    # A slug still marked `regenerate` has a mesh on disk that did not pass
    # review, and shipping it would put a known-bad specimen in front of users.
    held = [p for p in paths
            if (objs.get(os.path.basename(p)[:-4]) or {}).get("status") != "ready"]
    if held:
        print("holding back %d specimen(s) not marked ready in objects.yaml:" % len(held))
        for p in held:
            slug = os.path.basename(p)[:-4]
            print("  %-26s status=%s" % (slug, (objs.get(slug) or {}).get("status", "?")))
        print("")
        paths = [p for p in paths if p not in held]

    if not paths:
        raise SystemExit("nothing ready to upload — run 02/02b, then mark rows ready")

    oversize = [p for p in paths if os.path.getsize(p) > SIZE_LIMIT]
    if oversize:
        raise SystemExit(
            "REFUSING — %d model(s) exceed the 2 MB gate:\n%s"
            % (len(oversize), "\n".join("  %s  %.2f MB" % (os.path.basename(p),
                                                           os.path.getsize(p) / 1e6)
                                        for p in oversize))
        )

    print("project : %s  (%s)" % (url, EXPECT_PROJECT_REF))
    print("mode    : %s%s" % ("DRY RUN — nothing will be written" if dry else "LIVE WRITE",
                              "" if dry else (" · publish" if publish else " · draft")))
    print("targets : %d specimen(s) -> %s/%s/\n" % (len(paths), BUCKET, PREFIX))

    if not dry:
        preflight(url, key)
        print("preflight OK — catalog admits %s / %s\n" % (ASSET_TYPE_3D, GENERATOR))

    status_val = "published" if publish else "draft"
    visibility = "shared" if publish else "private"
    results, failures = [], []

    for gp in paths:
        slug = os.path.basename(gp)[:-4]
        obj = objs.get(slug)
        if not obj:
            failures.append((slug, "not in objects.yaml"))
            continue
        pp = os.path.join(L.POSTERS, slug + ".jpg")
        gpath = "%s/%s.glb" % (PREFIX, slug)
        ppath = "%s/%s.jpg" % (PREFIX, slug)
        gsize = os.path.getsize(gp)
        prompt = prompts.get(slug, L.prompt_for(obj))

        ok, msg = storage_put(url, key, gpath, open(gp, "rb").read(),
                              "model/gltf-binary", dry)
        if not ok:
            failures.append((slug, "glb upload: " + msg))
            continue

        grow = row_for(obj, "glb", gpath, gsize, prompt)
        grow["status"], grow["visibility"] = status_val, visibility
        ok, gid = upsert(url, key, grow, dry)
        if not ok:
            failures.append((slug, "glb row: " + str(gid)))
            continue

        purl = None
        if os.path.exists(pp):
            psize = os.path.getsize(pp)
            ok, msg = storage_put(url, key, ppath, open(pp, "rb").read(),
                                  "image/jpeg", dry)
            if ok:
                prow = row_for(obj, "poster", ppath, psize, prompt, parent_id=gid)
                prow["status"], prow["visibility"] = status_val, visibility
                ok2, pid = upsert(url, key, prow, dry)
                if ok2:
                    purl = public_url(url, ppath)
                else:
                    failures.append((slug, "poster row: " + str(pid)))
            else:
                failures.append((slug, "poster upload: " + msg))

        results.append({
            "slug": slug, "title": obj["title"], "domain": obj["domain"],
            "bytes": gsize, "storage_path": gpath,
            "public_url": public_url(url, gpath), "poster_url": purl,
            "status": status_val,
        })
        print("  %-26s %.2f MB  %s" % (slug, gsize / 1e6, public_url(url, gpath)))

    out = os.path.join(L.WORK, "uploaded.json")
    json.dump(results, open(out, "w"), indent=1)
    print("\n%s %d specimen(s); manifest -> %s"
          % ("would upload" if dry else "uploaded", len(results), out))
    if failures:
        print("\nFAILURES (%d):" % len(failures))
        for s, m in failures:
            print("  %-26s %s" % (s, m))
    if dry:
        print("\nthis was a DRY RUN — re-run with --go to write")
    elif not publish:
        print("\nrows are status=draft — they do NOT appear in studio_library yet.\n"
              "re-run with --go --publish to promote them.")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
