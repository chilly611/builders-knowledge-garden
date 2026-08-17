#!/usr/bin/env python3
"""CPU rasterizer + contact sheet for the 3-D specimen library.

Renders every optimized .glb to a small shaded thumbnail and tiles them into a
contact sheet, so a PR shows what actually changed geometrically instead of just
listing filenames. No GPU and no browser: Draco is decoded by gltf-transform, the
glTF scene graph is walked in python, and triangles are z-buffered by numpy.

Rendering the mesh (not the source image) is the point — the two flagged v1
failures, ceiling-fan and thermostat, both had *good* source images and bad
geometry. A poster contact sheet would have shown nothing wrong.

  python3 scripts/media/preview.py                 # all of work/models
  python3 scripts/media/preview.py --only=a,b      # a subset
  python3 scripts/media/preview.py --sheet=v1-regen --title="Regenerated"

Outputs previews/<sheet>.jpg plus previews/thumbs/<slug>.jpg.
"""

import glob
import json
import math
import os
import struct
import subprocess
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFont

import _lib as L

DECODED = os.path.join(L.WORK, "decoded")
THUMBS = os.path.join(L.PREVIEWS, "thumbs")
GLTF_CLI = ["npx", "-y", "@gltf-transform/cli@4.4.2"]

CELL = 300           # rendered thumbnail edge, px
SS = 2               # supersample factor, downsampled at the end
COLS = 5
PAPER = (241, 237, 228)
INK = (38, 34, 30)
MUTED = (122, 114, 102)
RULE = (206, 198, 184)

COMPONENT = {5120: "b", 5121: "B", 5122: "h", 5123: "H", 5125: "I", 5126: "f"}
NCOMP = {"SCALAR": 1, "VEC2": 2, "VEC3": 3, "VEC4": 4, "MAT4": 16}


# ------------------------------------------------------------------ glb io ----

def decode_glb(src, dst):
    """Draco -> plain glTF buffers. gltf-transform decodes on read."""
    if os.path.exists(dst) and os.path.getmtime(dst) >= os.path.getmtime(src):
        return dst
    p = subprocess.run(GLTF_CLI + ["copy", src, dst],
                       capture_output=True, text=True, timeout=600)
    if p.returncode != 0 or not os.path.exists(dst):
        raise RuntimeError((p.stderr or p.stdout or "")[-400:])
    return dst


def read_glb(path):
    with open(path, "rb") as fh:
        blob = fh.read()
    if blob[:4] != b"glTF":
        raise ValueError("not a GLB: %s" % path)
    total = struct.unpack("<I", blob[8:12])[0]
    off, js, bin_ = 12, None, b""
    while off < min(total, len(blob)):
        clen, ctype = struct.unpack("<II", blob[off:off + 8])
        data = blob[off + 8: off + 8 + clen]
        if ctype == 0x4E4F534A:
            js = json.loads(data.decode("utf-8"))
        elif ctype == 0x004E4942:
            bin_ = data
        off += 8 + clen + ((4 - clen % 4) % 4 if clen % 4 else 0)
    if js is None:
        raise ValueError("no JSON chunk in %s" % path)
    return js, bin_


def accessor(js, bin_, idx):
    acc = js["accessors"][idx]
    n = NCOMP[acc["type"]]
    fmt = COMPONENT[acc["componentType"]]
    size = struct.calcsize("<" + fmt)
    count = acc["count"]
    if "bufferView" not in acc:
        return np.zeros((count, n), dtype=np.float64)
    bv = js["bufferViews"][acc["bufferView"]]
    base = bv.get("byteOffset", 0) + acc.get("byteOffset", 0)
    stride = bv.get("byteStride") or (size * n)
    if stride == size * n:
        raw = bin_[base: base + count * n * size]
        arr = np.frombuffer(raw, dtype=np.dtype("<" + fmt), count=count * n)
        arr = arr.reshape(count, n)
    else:  # interleaved
        arr = np.empty((count, n), dtype=np.dtype("<" + fmt))
        for i in range(count):
            o = base + i * stride
            arr[i] = np.frombuffer(bin_[o:o + size * n], dtype=np.dtype("<" + fmt), count=n)
    return arr.astype(np.float64)


def node_matrix(node):
    if "matrix" in node:
        return np.array(node["matrix"], dtype=np.float64).reshape(4, 4).T
    m = np.eye(4)
    if "scale" in node:
        m = np.diag(list(node["scale"]) + [1.0]) @ m
    if "rotation" in node:
        x, y, z, w = node["rotation"]
        r = np.array([
            [1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w), 0],
            [2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w), 0],
            [2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y), 0],
            [0, 0, 0, 1]], dtype=np.float64)
        m = r @ m
    if "translation" in node:
        t = np.eye(4)
        t[:3, 3] = node["translation"]
        m = t @ m
    return m


def collect_triangles(js, bin_):
    """Walk the scene graph and return an (N,3,3) array of world-space triangles."""
    tris = []

    def visit(ni, parent):
        node = js["nodes"][ni]
        world = parent @ node_matrix(node)
        if "mesh" in node:
            for prim in js["meshes"][node["mesh"]].get("primitives", []):
                if prim.get("mode", 4) != 4:      # triangles only
                    continue
                pi = prim.get("attributes", {}).get("POSITION")
                if pi is None:
                    continue
                pos = accessor(js, bin_, pi)[:, :3]
                if "indices" in prim:
                    idx = accessor(js, bin_, prim["indices"]).astype(np.int64).ravel()
                else:
                    idx = np.arange(len(pos), dtype=np.int64)
                idx = idx[: (len(idx) // 3) * 3].reshape(-1, 3)
                h = np.concatenate([pos, np.ones((len(pos), 1))], axis=1)
                # macOS Accelerate raises spurious FP warnings on SIMD padding
                # lanes; the finite-filter below is the real data guard.
                with np.errstate(all="ignore"):
                    wp = (world @ h.T).T[:, :3]
                tris.append(wp[idx])
        for c in node.get("children", []):
            visit(c, world)

    scene = js.get("scenes", [{}])[js.get("scene", 0)]
    for ni in scene.get("nodes", range(len(js.get("nodes", [])))):
        visit(ni, np.eye(4))
    if not tris:
        return np.zeros((0, 3, 3))
    out = np.concatenate(tris, axis=0)
    # Drop anything a malformed mesh could inject; NaN would poison the bbox and
    # blank the whole render rather than just its own triangle.
    return out[np.isfinite(out).all(axis=(1, 2))]


# --------------------------------------------------------------- rasterize ----

def render(tris, size):
    """Z-buffered Lambert render, three-quarter view from slightly above."""
    img = np.zeros((size, size, 3), dtype=np.float64)
    img[:] = np.array(PAPER) / 255.0
    if len(tris) == 0:
        return img

    v = tris.reshape(-1, 3)
    lo, hi = v.min(axis=0), v.max(axis=0)
    center = (lo + hi) / 2.0
    extent = float((hi - lo).max()) or 1.0
    t = (tris - center) / extent          # unit-ish box at origin

    yaw, pitch = math.radians(35.0), math.radians(20.0)
    cy, sy = math.cos(yaw), math.sin(yaw)
    cp, sp = math.cos(pitch), math.sin(pitch)
    ry = np.array([[cy, 0, sy], [0, 1, 0], [-sy, 0, cy]])
    rx = np.array([[1, 0, 0], [0, cp, -sp], [0, sp, cp]])
    t = t @ ry.T @ rx.T

    # glTF is Y-up; screen y grows downward.
    margin = 0.86
    sx = (t[:, :, 0] * margin + 0.5) * size
    sy_ = (-t[:, :, 1] * margin + 0.5) * size
    depth = t[:, :, 2]

    n = np.cross(t[:, 1] - t[:, 0], t[:, 2] - t[:, 0])
    ln = np.linalg.norm(n, axis=1, keepdims=True)
    ln[ln < 1e-12] = 1.0          # slivers shade flat instead of exploding to inf
    n = n / ln
    light = np.array([0.35, 0.72, 0.60])
    light = light / np.linalg.norm(light)
    with np.errstate(all="ignore"):
        lam = np.abs(n @ light)
    shade = 0.24 + 0.76 * lam ** 0.85           # ambient + diffuse

    base = np.array([0.42, 0.38, 0.34])
    warm = np.array([0.97, 0.94, 0.88])
    colors = base[None, :] + (warm - base)[None, :] * shade[:, None]

    zbuf = np.full((size, size), np.inf)
    order = np.argsort(-depth.mean(axis=1))     # far to near

    for i in order:
        x0, x1, x2 = sx[i]
        y0, y1, y2 = sy_[i]
        minx, maxx = int(max(0, math.floor(min(x0, x1, x2)))), int(min(size - 1, math.ceil(max(x0, x1, x2))))
        miny, maxy = int(max(0, math.floor(min(y0, y1, y2)))), int(min(size - 1, math.ceil(max(y0, y1, y2))))
        if minx > maxx or miny > maxy:
            continue
        area = (x1 - x0) * (y2 - y0) - (x2 - x0) * (y1 - y0)
        if abs(area) < 1e-12:
            continue
        ys, xs = np.mgrid[miny:maxy + 1, minx:maxx + 1]
        px, py = xs + 0.5, ys + 0.5
        w0 = ((x1 - px) * (y2 - py) - (x2 - px) * (y1 - py)) / area
        w1 = ((x2 - px) * (y0 - py) - (x0 - px) * (y2 - py)) / area
        w2 = 1.0 - w0 - w1
        inside = (w0 >= 0) & (w1 >= 0) & (w2 >= 0)
        if not inside.any():
            continue
        z = w0 * depth[i, 0] + w1 * depth[i, 1] + w2 * depth[i, 2]
        sub = zbuf[miny:maxy + 1, minx:maxx + 1]
        hit = inside & (z < sub)
        if not hit.any():
            continue
        sub[hit] = z[hit]
        img[miny:maxy + 1, minx:maxx + 1][hit] = colors[i]
    return img


def font(sz, bold=False):
    names = (["HelveticaNeue.ttc", "Helvetica.ttc", "Arial Bold.ttf"] if bold
             else ["HelveticaNeue.ttc", "Helvetica.ttc", "Arial.ttf"])
    for base in ("/System/Library/Fonts/", "/System/Library/Fonts/Supplemental/", "/Library/Fonts/"):
        for n in names:
            try:
                return ImageFont.truetype(base + n, sz)
            except Exception:
                continue
    return ImageFont.load_default()


# -------------------------------------------------------------------- main ----

def main():
    L.ensure_dirs()
    os.makedirs(DECODED, exist_ok=True)
    os.makedirs(THUMBS, exist_ok=True)

    args = sys.argv[1:]
    only = next((a.split("=", 1)[1] for a in args if a.startswith("--only=")), None)
    sheet = next((a.split("=", 1)[1] for a in args if a.startswith("--sheet=")), "contact-sheet")
    title = next((a.split("=", 1)[1] for a in args if a.startswith("--title=")), "BKG 3-D specimen library")

    paths = sorted(glob.glob(os.path.join(L.MODELS, "*.glb")))
    if only:
        wanted = set(only.split(","))
        paths = [p for p in paths if os.path.basename(p)[:-4] in wanted]
    if not paths:
        raise SystemExit("no .glb in %s" % L.MODELS)

    titles = {o["slug"]: o["title"] for o in L.load_objects()}
    cells = []
    for p in paths:
        slug = os.path.basename(p)[:-4]
        mb = os.path.getsize(p) / 1e6
        try:
            js, bin_ = read_glb(decode_glb(p, os.path.join(DECODED, slug + ".glb")))
            tris = collect_triangles(js, bin_)
            arr = render(tris, CELL * SS)
            im = Image.fromarray((np.clip(arr, 0, 1) * 255).astype(np.uint8))
            im = im.resize((CELL, CELL), Image.LANCZOS)
            im.save(os.path.join(THUMBS, slug + ".jpg"), quality=88, optimize=True)
            cells.append((slug, im, len(tris), mb))
            print("  rendered %-26s %6d tris  %.2f MB" % (slug, len(tris), mb))
        except Exception as e:
            im = Image.new("RGB", (CELL, CELL), PAPER)
            ImageDraw.Draw(im).text((14, CELL // 2), "render failed", fill=(170, 60, 40), font=font(15))
            cells.append((slug, im, 0, mb))
            print("  FAILED   %-26s %s" % (slug, str(e)[:120]))

    # ---- contact sheet
    pad, label_h, head_h = 16, 34, 62
    cols = min(COLS, len(cells))
    rows = (len(cells) + cols - 1) // cols
    W = pad + cols * (CELL + pad)
    H = head_h + pad + rows * (CELL + label_h + pad)
    sheet_img = Image.new("RGB", (W, H), PAPER)
    d = ImageDraw.Draw(sheet_img)

    f_title, f_meta, f_slug = font(22, True), font(12), font(14, True)
    d.text((pad, 18), title, fill=INK, font=f_title)
    over = [c for c in cells if c[3] > 2.0]
    meta = "%d specimens · all under 2 MB" % len(cells) if not over else \
           "%d specimens · %d OVER 2 MB" % (len(cells), len(over))
    d.text((pad, 44), meta, fill=MUTED, font=f_meta)
    d.line([(pad, head_h - 4), (W - pad, head_h - 4)], fill=RULE, width=1)

    for i, (slug, im, ntris, mb) in enumerate(cells):
        cx = pad + (i % cols) * (CELL + pad)
        cy = head_h + pad + (i // cols) * (CELL + label_h + pad)
        sheet_img.paste(im, (cx, cy))
        d.rectangle([cx, cy, cx + CELL - 1, cy + CELL - 1], outline=RULE, width=1)
        d.text((cx, cy + CELL + 6), titles.get(slug, slug), fill=INK, font=f_slug)
        d.text((cx, cy + CELL + 21), "%s · %d tris · %.2f MB" % (slug, ntris, mb),
               fill=MUTED, font=f_meta)

    out = os.path.join(L.PREVIEWS, sheet + ".jpg")
    sheet_img.save(out, quality=84, optimize=True)
    print("\nwrote %s (%.0f KB)" % (out, os.path.getsize(out) / 1024))
    return 0


if __name__ == "__main__":
    sys.exit(main())
