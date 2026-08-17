# scripts/media — the 3-D specimen pipeline

Turns [`objects.yaml`](objects.yaml) into optimized GLB meshes with poster images
and publishes them to the shared studio library.

Doctrine this serves: **every noun gets a specimen.** A taxonomy row is the unit
of work; the pipeline is the thing that makes a row real.

```
objects.yaml
    │
    ├─ 01_generate_images.py ─→ 01b_poll_images.py   FLUX-dev      work/images/*.png
    ├─ 02_generate_3d.py     ─→ 02b_poll_3d.py       Trellis       work/models/*.glb
    │                                                + Draco       work/posters/*.jpg
    ├─ preview.py                                    CPU raster    previews/*.jpg   ← committed
    └─ 03_upload_studio.py                           Supabase      brand-assets/assets/bkg/3d/
```

## Run it

```bash
set -a; . scripts/media/.env; set +a          # REPLICATE_API_TOKEN, SUPABASE_*
cd scripts/media

python3 01_generate_images.py                 # queue images for todo/regenerate rows
python3 01b_poll_images.py                    # collect them
python3 02_generate_3d.py                     # queue meshes
python3 02b_poll_3d.py                        # collect, Draco-compress, cut posters
python3 preview.py                            # contact sheet
python3 03_upload_studio.py                   # DRY RUN — prints what it would write
python3 03_upload_studio.py --go --publish    # write for real
```

Every script takes `--only=slug,slug`. `01`/`preview` also take `--all` to force
rows already marked `ready`. The pollers are resumable — re-run after a timeout
and only unsettled jobs are polled, so a killed run never re-bills finished work.

## Requirements

`python3` and `node` (for `npx @gltf-transform/cli`). `preview.py` additionally
needs `numpy` and `Pillow`. PyYAML is optional — `_lib.py` falls back to a strict
mini-parser so a clean machine needs no `pip install`.

## objects.yaml

| field | meaning |
|---|---|
| `slug` | kebab-case id. Becomes the filename, the storage path, and the catalog slug. Never reuse one. |
| `title` | human title for the library row |
| `domain` | trade bucket; also emitted as a tag |
| `aesthetic` | `photoreal` (wrapped in `BASE_STYLE`) or `ceramic` (prompt used verbatim) |
| `prompt_hint` | the object description |
| `status` | `ready` (accepted, skipped) · `regenerate` (rejected, prompt fixed, re-run) · `todo` (never generated) |

A default run picks up `todo` and `regenerate` only.

## Prompt rules that came from failures

Image-to-3D reconstructs volume, not silhouette. Two v1 specimens had good source
images and unusable geometry, and the fixes generalize:

- **Thin flat parts vanish or turn to wafers.** `ceiling-fan` lost its blades.
  Say `THICK`, `solid`, and give a camera angle that shows depth
  (`viewed from slightly below`).
- **Small faces on small plates extrude into cubes.** `thermostat` became a
  cube with an embossed circle. Say `LARGE flat ... plate` and `shallow depth`.

The same language is pre-applied to the at-risk v2 rows (`window-double-hung`,
`gfci-outlet`, `light-switch-dimmer`, `pvc-p-trap`, `ladder-6ft`, …).

## Why previews render the mesh, not the poster

`preview.py` is a real rasterizer: it decodes Draco via `gltf-transform`, walks
the glTF scene graph, and z-buffers triangles with numpy. It renders **geometry**
because that is where the failures are — both v1 rejects had perfectly good
posters. A poster contact sheet would have shown nothing wrong.

Sheets are committed (small jpgs) so a PR shows what changed visually.

## Publishing target — read before running 03

`public.studio_library` is a **VIEW**, not a table. It selects from
`public.brand_assets` where `bucket='brand-assets' AND status='published' AND
visibility IN ('system','shared')`, and it **computes** `public_url` from
`storage_path`. So:

- rows are written to `brand_assets`; `public_url` is never inserted
- a specimen appears in `studio_library` only once it is `published`

Each specimen writes two rows — the GLB (`asset_type='3d-model'`,
`rendition_role='original'`) and its poster (`asset_type='poster'`,
`rendition_role='poster'`, `parent_asset_id` → the GLB row). The spec's `bytes`
lands in the real column `file_size_bytes`, and is mirrored into `params.bytes`.

**`03_upload_studio.py` writes to shared, multi-tenant prod
(`vlezoyalutexenbnzzui`).** Guards, all of them load-bearing:

1. dry-run by default; `--go` required to mutate
2. the project ref in `SUPABASE_URL` is asserted before any write
3. the live CHECK constraints are preflighted — see below
4. rows land `draft` unless `--publish`
5. writes upsert on the unique `key`, so a re-run repairs a partial run

### Migration gate

`brand_assets` currently rejects `asset_type='3d-model'` and
`generator='flux+trellis'`. `supabase/migrations/20260816_brand_assets_3d_model_type.sql`
adds both values (additive and idempotent) and is **not applied** — shared prod,
founder applies supervised. Until it lands, `03` aborts with that instruction
rather than mis-tagging specimens as `illustration`/`flux` to get past the check.

## Size gate

Every GLB must be **under 2 MB**. `02b` reports anything over after Draco and
leaves it out of the ready set; `03` refuses to upload an oversize file at all.
If a specimen blows the budget, lower `mesh_simplify` in `02_generate_3d.py`
for that slug and re-run it with `--only=`.
