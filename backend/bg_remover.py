#!/usr/bin/env python3
"""
AllInOne - AI & OpenCV Background Remover (Python Engine & CLI)
===============================================================
Unterstützt:
- KI-Freistellung (rembg / U²-Net ONNX Neural Network)
- OpenCV GrabCut Segmentierung (für Objekte im Zentrum)
- Smart Chroma / LAB-Farbraum-Freistellung (für Studio- & Farbverlaufs-Hintergründe)
- Kanten-Glättung (Edge Feathering), Hintergrundfarben & Portrait-Bokeh-Blur
"""

import io
import os
import sys
import time
import uuid
import base64
import subprocess
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple

import numpy as np
import cv2
from PIL import Image, ImageDraw, ImageFilter

try:
    from rembg import remove as rembg_remove, new_session
    REMBG_AVAILABLE = True
except Exception:
    REMBG_AVAILABLE = False
    rembg_remove = None
    new_session = None

BG_OUTPUT_DIR = Path.home() / "Downloads" / "AllInOne_BG"
BG_OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

_REMBG_SESSION = None
BG_HISTORY: List[Dict[str, Any]] = []


def get_rembg_session():
    """Initialisiert die U²-Net ONNX Session einmalig im Speicher."""
    global _REMBG_SESSION
    if _REMBG_SESSION is None and REMBG_AVAILABLE and new_session is not None:
        # u2netp ist extrem schnell (~4 MB Modell) und präzise für Porträts & Objekte
        _REMBG_SESSION = new_session("u2netp")
    return _REMBG_SESSION


def format_bytes(size: int) -> str:
    for unit in ["B", "KB", "MB", "GB"]:
        if size < 1024:
            return f"{size:.1f} {unit}"
        size /= 1024
    return f"{size:.1f} TB"


def hex_to_rgb(hex_str: str) -> Tuple[int, int, int]:
    h = (hex_str or "#ffffff").lstrip("#")
    if len(h) == 3:
        h = "".join(c * 2 for c in h)
    try:
        return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16))
    except Exception:
        return (255, 255, 255)


def extract_alpha_ai(rgb_image: Image.Image) -> Tuple[np.ndarray, str]:
    """Freistellung mit U²-Net (rembg) und Fallback auf OpenCV GrabCut."""
    if REMBG_AVAILABLE and rembg_remove is not None:
        try:
            session = get_rembg_session()
            out_pil = rembg_remove(rgb_image, session=session)
            rgba = np.array(out_pil.convert("RGBA"))
            return rgba[:, :, 3], "rembg (U²-Net ONNX KI)"
        except Exception as e:
            alpha, _ = extract_alpha_grabcut(rgb_image)
            return alpha, f"OpenCV GrabCut (Fallback: {e})"
    return extract_alpha_grabcut(rgb_image)


def extract_alpha_grabcut(rgb_image: Image.Image) -> Tuple[np.ndarray, str]:
    """Freistellung mittels OpenCV GrabCut-Algorithmus."""
    img_np = np.array(rgb_image.convert("RGB"))
    h, w = img_np.shape[:2]

    # Skaliere sehr große Bilder für schnelles GrabCut herunter
    max_dim = 640
    scale = min(1.0, max_dim / max(h, w))
    if scale < 1.0:
        small = cv2.resize(img_np, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_AREA)
    else:
        small = img_np.copy()

    sh, sw = small.shape[:2]
    mask = np.zeros((sh, sw), np.uint8)
    bgd_model = np.zeros((1, 65), np.float64)
    fgd_model = np.zeros((1, 65), np.float64)

    margin_x = max(4, int(sw * 0.06))
    margin_y = max(4, int(sh * 0.06))
    rect = (margin_x, margin_y, max(10, sw - 2 * margin_x), max(10, sh - 2 * margin_y))

    cv2.grabCut(small, mask, rect, bgd_model, fgd_model, 5, cv2.GC_INIT_WITH_RECT)
    alpha_small = np.where((mask == 2) | (mask == 0), 0, 255).astype("uint8")

    # Morphologische Glättung
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
    alpha_small = cv2.morphologyEx(alpha_small, cv2.MORPH_CLOSE, kernel)

    if scale < 1.0:
        alpha = cv2.resize(alpha_small, (w, h), interpolation=cv2.INTER_LINEAR)
    else:
        alpha = alpha_small

    return alpha, "OpenCV GrabCut"


def extract_alpha_chroma(rgb_image: Image.Image, threshold: int = 32) -> Tuple[np.ndarray, str]:
    """Freistellung über Eck-Farbsampling im wahrnehmungsorientierten CIE-LAB Farbraum."""
    img_np = np.array(rgb_image.convert("RGB"))
    lab = cv2.cvtColor(img_np, cv2.COLOR_RGB2LAB).astype(np.float32)
    h, w = img_np.shape[:2]
    pad = max(4, min(h, w) // 20)

    corners = np.concatenate([
        lab[:pad, :pad].reshape(-1, 3),
        lab[:pad, -pad:].reshape(-1, 3),
        lab[-pad:, :pad].reshape(-1, 3),
        lab[-pad:, -pad:].reshape(-1, 3),
    ], axis=0)
    bg_lab = np.median(corners, axis=0)

    dist = np.linalg.norm(lab - bg_lab, axis=2)
    t_low = max(8.0, float(threshold))
    t_high = t_low + 18.0
    alpha = np.clip((dist - t_low) / (t_high - t_low) * 255.0, 0, 255).astype(np.uint8)
    return alpha, "OpenCV LAB Chroma-Key"


def process_image_background(
    pil_img: Image.Image,
    filename_hint: str = "bild.png",
    mode: str = "ai",
    bg_type: str = "transparent",
    bg_color: str = "#6366f1",
    feather: int = 2,
    blur_strength: int = 18,
    threshold: int = 32,
) -> Dict[str, Any]:
    """Hauptfunktion: Entfernt den Hintergrund und wendet Nachbearbeitung an."""
    t0 = time.time()
    rgb_img = pil_img.convert("RGB")
    w, h = rgb_img.size

    if mode == "grabcut":
        alpha_np, engine_name = extract_alpha_grabcut(rgb_img)
    elif mode == "chroma":
        alpha_np, engine_name = extract_alpha_chroma(rgb_img, threshold=threshold)
    else:
        alpha_np, engine_name = extract_alpha_ai(rgb_img)

    # Kanten-Weichzeichnung (Edge Feathering)
    feather = max(0, min(15, int(feather)))
    if feather > 0:
        ksize = feather * 2 + 1
        alpha_np = cv2.GaussianBlur(alpha_np, (ksize, ksize), 0)

    alpha_pil = Image.fromarray(alpha_np, mode="L")
    fg_rgba = rgb_img.copy()
    fg_rgba.putalpha(alpha_pil)

    # Hintergrund-Komposition
    if bg_type == "color":
        solid_bg = Image.new("RGBA", (w, h), (*hex_to_rgb(bg_color), 255))
        final_img = Image.alpha_composite(solid_bg, fg_rgba)
    elif bg_type == "blur":
        radius = max(4, min(50, int(blur_strength)))
        blurred_bg = rgb_img.filter(ImageFilter.GaussianBlur(radius=radius)).convert("RGBA")
        final_img = Image.alpha_composite(blurred_bg, fg_rgba)
    else:
        final_img = fg_rgba

    # Speichere Ergebnis als PNG
    job_id = str(uuid.uuid4())[:8]
    stem = Path(filename_hint).stem
    safe_stem = "".join(c for c in stem if c.isalnum() or c in ("-", "_"))[:60] or "image"
    out_filename = f"{safe_stem}_nobg_{job_id}.png"
    out_path = BG_OUTPUT_DIR / out_filename
    final_img.save(out_path, format="PNG")

    # Kodierung als Base64 für sofortige Vorschau im Vorher/Nachher-Slider
    orig_buf = io.BytesIO()
    rgb_img.save(orig_buf, format="JPEG", quality=88)
    orig_b64 = "data:image/jpeg;base64," + base64.b64encode(orig_buf.getvalue()).decode("ascii")

    res_buf = io.BytesIO()
    final_img.save(res_buf, format="PNG")
    res_bytes = res_buf.getvalue()
    res_b64 = "data:image/png;base64," + base64.b64encode(res_bytes).decode("ascii")

    duration_ms = int((time.time() - t0) * 1000)
    filesize_human = format_bytes(len(res_bytes))

    entry = {
        "id": job_id,
        "filename": out_filename,
        "filepath": str(out_path),
        "width": w,
        "height": h,
        "filesize_human": filesize_human,
        "duration_ms": duration_ms,
        "engine": engine_name,
        "created_at": time.strftime("%H:%M:%S"),
        "original_base64": orig_b64,
        "result_base64": res_b64,
    }
    BG_HISTORY.insert(0, entry)
    if len(BG_HISTORY) > 15:
        BG_HISTORY.pop()

    return entry


def generate_demo_sample(sample_name: str) -> Tuple[Image.Image, str]:
    """Erzeugt ein kontrastreiches Beispielbild zum sofortigen 1-Klick-Testen."""
    w, h = 640, 480
    # Farbverlauf-Hintergrund
    bg = np.zeros((h, w, 3), dtype=np.uint8)
    if sample_name == "crystal":
        bg[:, :] = [28, 35, 65]
    elif sample_name == "badge":
        bg[:, :] = [45, 25, 55]
    else:
        bg[:, :] = [22, 48, 58]

    img = Image.fromarray(bg, mode="RGB")
    draw = ImageDraw.Draw(img)

    if sample_name == "crystal":
        # Leuchtender Kristall im Zentrum
        pts = [(320, 75), (465, 200), (410, 405), (230, 405), (175, 200)]
        draw.polygon(pts, fill=(244, 63, 94), outline=(255, 200, 215))
        draw.polygon([(320, 75), (465, 200), (320, 250)], fill=(251, 113, 133))
        draw.polygon([(320, 75), (175, 200), (320, 250)], fill=(225, 29, 72))
        draw.polygon([(175, 200), (320, 250), (230, 405)], fill=(190, 18, 60))
        draw.polygon([(465, 200), (320, 250), (410, 405)], fill=(244, 63, 94))
        return img, "ruby_crystal_demo.png"

    elif sample_name == "badge":
        # Goldenes Gaming-Schild / Trophäe
        shield = [(320, 70), (470, 125), (440, 310), (320, 420), (200, 310), (170, 125)]
        draw.polygon(shield, fill=(245, 158, 11), outline=(254, 243, 199))
        inner = [(320, 105), (435, 148), (410, 290), (320, 380), (230, 290), (205, 148)]
        draw.polygon(inner, fill=(217, 119, 6))
        draw.ellipse([265, 180, 375, 290], fill=(254, 240, 138))
        return img, "cyber_trophy_demo.png"

    else:
        # Neon Bot / Charakter-Porträt
        draw.rounded_rectangle([200, 120, 440, 350], radius=48, fill=(99, 102, 241), outline=(199, 210, 254), width=6)
        # Antenne
        draw.line([(320, 65), (320, 120)], fill=(165, 180, 252), width=10)
        draw.ellipse([302, 42, 338, 78], fill=(34, 211, 238))
        # Augen
        draw.ellipse([240, 175, 295, 230], fill=(34, 211, 238))
        draw.ellipse([345, 175, 400, 230], fill=(34, 211, 238))
        # Mund / Visor
        draw.rounded_rectangle([255, 268, 385, 302], radius=14, fill=(15, 23, 42))
        # Körper-Ansatz
        draw.polygon([(235, 350), (405, 350), (450, 435), (190, 435)], fill=(79, 70, 229))
        return img, "neon_bot_demo.png"


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Verwendung: python3 bg_remover.py <bilddatei> [ai|grabcut|chroma]")
        sys.exit(1)
    in_path = Path(sys.argv[1])
    mode_arg = sys.argv[2] if len(sys.argv) > 2 else "ai"
    pil = Image.open(in_path)
    res = process_image_background(pil, filename_hint=in_path.name, mode=mode_arg)
    print(f"✅ Hintergrund entfernt ({res['engine']}) in {res['duration_ms']} ms -> {res['filepath']}")
