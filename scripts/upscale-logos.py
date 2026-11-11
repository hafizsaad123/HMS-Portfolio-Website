#!/usr/bin/env python3
"""Produce premium-quality upscaled PNG marks from the 6 tiny logo uploads.

The sources (14-23px) are true gradient logos — raster is the authentic
medium for them. We upscale 5x with BICUBIC (preserves the smooth
gradients) and apply a gentle unsharp mask so edges keep their definition.
At every display size used on the site (12px sidebar pills, 22px About
cards, 2x retina = 44px) the 70-115px output is oversampled — crisp.
"""
from PIL import Image, ImageFilter
import numpy as np
import os

UPLOAD = "/home/z/my-project/upload"
OUT = "/home/z/my-project/public/images/marks"
os.makedirs(OUT, exist_ok=True)

LOGOS = {
    "image 48.png": "ai-matterz",
    "image 49.png": "uplynk-pk",
    "image 51.png": "count3",
    "image 52.png": "surplus-pakistan",
    "image 53.png": "simulationsx",
    "image 54.png": "novelops",
}

SCALE = 5

for fname, slug in LOGOS.items():
    im = Image.open(f"{UPLOAD}/{fname}").convert("RGBA")
    # upscale in two steps with BICUBIC for smoother interpolation
    w, h = im.size
    mid = im.resize((w * 3, h * 3), Image.BICUBIC)
    big = mid.resize((w * SCALE, h * SCALE), Image.BICUBIC)
    # gentle unsharp: restores edge definition lost in interpolation
    a = np.array(big).astype(float)
    sharp = big.filter(ImageFilter.UnsharpMask(radius=2.2, percent=55, threshold=1))
    sa = np.array(sharp).astype(float)
    # only sharpen RGB, keep original alpha (avoid alpha halos)
    out = np.dstack([
        np.clip(sa[:, :, :3], 0, 255),
        a[:, :, 3],
    ]).astype(np.uint8)
    res = Image.fromarray(out, "RGBA")
    # trim fully-transparent border rows/cols (tighten the box)
    alpha = np.array(res)[:, :, 3]
    ys, xs = np.where(alpha > 8)
    if len(xs):
        res = res.crop((max(xs.min()-1,0), max(ys.min()-1,0),
                        min(xs.max()+2, res.width), min(ys.max()+2, res.height)))
    path = f"{OUT}/{slug}.png"
    res.save(path, optimize=True)
    kb = os.path.getsize(path) / 1024
    print(f"{slug}: {im.size} -> {res.size}  ({kb:.1f} KB)")
print("done")
