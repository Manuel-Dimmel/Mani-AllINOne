#!/usr/bin/env python3
"""
AllInOne - YouTube Downloader (Python Backend & CLI)
====================================================
Unterstützt:
- Video-Analyse (Titel, Kanal, Thumbnail, Dauer, Aufrufe, verfügbare Auflösungen bis 4K)
- Video-Download (MP4 in 2160p/4K, 1440p, 1080p, 720p, 480p, 360p inkl. FFmpeg-Merge)
- Audio-Download (MP3 320kbps oder Original M4A)
- Live-Fortschrittsanzeige für das Angular-Frontend
"""

import os
import re
import sys
import time
import uuid
import shutil
import threading
import subprocess
from pathlib import Path
from typing import Dict, Any, Optional

from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from pytubefix import YouTube
import yt_dlp

try:
    import imageio_ffmpeg
    FFMPEG_BIN = imageio_ffmpeg.get_ffmpeg_exe()
except Exception:
    FFMPEG_BIN = shutil.which("ffmpeg") or "ffmpeg"

# Download-Ordner im Benutzerverzeichnis (~/Downloads/AllInOne_YT)
DOWNLOAD_DIR = Path.home() / "Downloads" / "AllInOne_YT"
DOWNLOAD_DIR.mkdir(parents=True, exist_ok=True)

app = Flask(__name__)
CORS(app)

# Speicher für laufende und abgeschlossene Download-Jobs
JOBS: Dict[str, Dict[str, Any]] = {}
JOBS_LOCK = threading.Lock()


def sanitize_filename(name: str) -> str:
    """Entfernt ungültige Zeichen aus Dateinamen."""
    cleaned = re.sub(r'[\\/*?:"<>|]', "", name)
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    return cleaned[:150] or "youtube_video"


def format_duration(seconds: int) -> str:
    """Formatiert Sekunden als MM:SS oder HH:MM:SS."""
    if not seconds:
        return "00:00"
    seconds = int(seconds)
    h = seconds // 3600
    m = (seconds % 3600) // 60
    s = seconds % 60
    if h > 0:
        return f"{h:02d}:{m:02d}:{s:02d}"
    return f"{m:02d}:{s:02d}"


def format_bytes(size: Optional[int]) -> str:
    """Formatiert Bytes in lesbare Einheiten (MB, GB)."""
    if not size or size <= 0:
        return "Unbekannt"
    for unit in ["B", "KB", "MB", "GB"]:
        if size < 1024:
            return f"{size:.1f} {unit}"
        size /= 1024
    return f"{size:.1f} TB"


def extract_video_info(url: str) -> Dict[str, Any]:
    """Holt Video-Metadaten und verfügbare Qualitätsstufen über pytubefix (mit yt-dlp Fallback)."""
    try:
        yt = YouTube(url)
        video_streams = yt.streams.filter(type="video")
        audio_streams = yt.streams.filter(only_audio=True).order_by("abr").desc()

        best_audio = audio_streams.first()
        audio_size = best_audio.filesize if best_audio else 0

        resolutions_map: Dict[str, Dict[str, Any]] = {}
        for s in video_streams:
            res = s.resolution
            if not res:
                continue
            # Bevorzuge MP4-Streams oder höhere Bitrate
            existing = resolutions_map.get(res)
            est_size = (s.filesize or 0) + (0 if s.is_progressive else audio_size)
            if not existing or (s.mime_type == "video/mp4" and existing["mime"] != "video/mp4"):
                resolutions_map[res] = {
                    "quality": res,
                    "fps": getattr(s, "fps", 30),
                    "progressive": s.is_progressive,
                    "mime": s.mime_type,
                    "filesize": est_size,
                    "filesize_human": format_bytes(est_size),
                }

        sorted_res = sorted(
            resolutions_map.values(),
            key=lambda x: int(x["quality"].replace("p", "")),
            reverse=True,
        )

        publish_str = ""
        if yt.publish_date:
            publish_str = yt.publish_date.strftime("%d.%m.%Y")

        return {
            "id": yt.video_id,
            "title": yt.title,
            "author": yt.author,
            "length": yt.length,
            "duration_formatted": format_duration(yt.length),
            "views": yt.views,
            "publish_date": publish_str,
            "thumbnail_url": yt.thumbnail_url,
            "url": url,
            "resolutions": sorted_res,
            "audio_size_human": format_bytes(audio_size),
            "engine": "pytubefix",
        }
    except Exception as primary_err:
        # Fallback auf yt-dlp
        ydl_opts = {"quiet": True, "no_warnings": True, "noplaylist": True}
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
            duration = info.get("duration") or 0
            return {
                "id": info.get("id", ""),
                "title": info.get("title", "Unbekanntes Video"),
                "author": info.get("uploader", "YouTube"),
                "length": duration,
                "duration_formatted": format_duration(duration),
                "views": info.get("view_count", 0),
                "publish_date": info.get("upload_date", ""),
                "thumbnail_url": info.get("thumbnail", ""),
                "url": url,
                "resolutions": [
                    {"quality": "1080p", "fps": 30, "progressive": False, "mime": "video/mp4", "filesize": 0, "filesize_human": "Auto"},
                    {"quality": "720p", "fps": 30, "progressive": True, "mime": "video/mp4", "filesize": 0, "filesize_human": "Auto"},
                    {"quality": "480p", "fps": 30, "progressive": True, "mime": "video/mp4", "filesize": 0, "filesize_human": "Auto"},
                    {"quality": "360p", "fps": 30, "progressive": True, "mime": "video/mp4", "filesize": 0, "filesize_human": "Auto"},
                ],
                "audio_size_human": "Auto",
                "engine": f"yt-dlp (Fallback: {primary_err})",
            }


def update_job(job_id: str, **kwargs: Any) -> None:
    with JOBS_LOCK:
        if job_id in JOBS:
            JOBS[job_id].update(kwargs)


def run_download_worker(job_id: str, url: str, mode: str, quality: str, audio_format: str) -> None:
    """Hintergrund-Thread für den Video- oder Audio-Download inkl. FFmpeg-Verarbeitung."""
    temp_dir = DOWNLOAD_DIR / f".tmp_{job_id}"
    temp_dir.mkdir(parents=True, exist_ok=True)

    try:
        update_job(job_id, status="analyzing", stage="Analysiere YouTube-Streams...", percent=5)

        def on_progress(stream, chunk, bytes_remaining):
            total = stream.filesize
            if total > 0:
                downloaded = total - bytes_remaining
                pct = int((downloaded / total) * 80) + 10
                update_job(
                    job_id,
                    status="downloading",
                    percent=min(pct, 90),
                    downloaded_bytes=downloaded,
                    total_bytes=total,
                    stage=f"Lade herunter... ({format_bytes(downloaded)} / {format_bytes(total)})",
                )

        yt = YouTube(url, on_progress_callback=on_progress)
        safe_title = sanitize_filename(yt.title)
        update_job(job_id, title=yt.title, thumbnail=yt.thumbnail_url, author=yt.author)

        if mode == "audio":
            audio_stream = yt.streams.filter(only_audio=True).order_by("abr").desc().first()
            if not audio_stream:
                raise RuntimeError("Kein Audio-Stream gefunden.")

            update_job(job_id, status="downloading", stage="Lade Audio-Stream herunter...", percent=15)
            raw_file = audio_stream.download(output_path=str(temp_dir), filename="raw_audio")

            if audio_format == "mp3":
                update_job(job_id, status="processing", stage="Konvertiere zu MP3 (FFmpeg)...", percent=92)
                final_filename = f"{safe_title}.mp3"
                final_path = DOWNLOAD_DIR / final_filename
                cmd = [
                    FFMPEG_BIN, "-y",
                    "-i", raw_file,
                    "-vn", "-ab", "192k", "-ar", "44100", "-f", "mp3",
                    str(final_path),
                ]
                subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            else:
                final_filename = f"{safe_title}.m4a"
                final_path = DOWNLOAD_DIR / final_filename
                shutil.move(raw_file, str(final_path))

        else:
            # Video-Modus
            prog_stream = None
            if quality != "best":
                prog_stream = yt.streams.filter(progressive=True, file_extension="mp4", res=quality).first()

            if prog_stream:
                update_job(job_id, status="downloading", stage=f"Lade {quality} MP4 herunter...", percent=15)
                final_filename = f"{safe_title} ({quality}).mp4"
                final_path = DOWNLOAD_DIR / final_filename
                prog_stream.download(output_path=str(DOWNLOAD_DIR), filename=final_filename)
            else:
                # Adaptive Stream (z.B. 1080p, 1440p, 4K) + Audio mit FFmpeg zusammenführen
                video_candidates = yt.streams.filter(type="video", res=quality) if quality != "best" else yt.streams.filter(type="video").order_by("resolution").desc()
                video_stream = (
                    video_candidates.filter(file_extension="mp4").first()
                    or video_candidates.first()
                    or yt.streams.get_highest_resolution()
                )
                audio_stream = yt.streams.filter(only_audio=True).order_by("abr").desc().first()

                if not video_stream:
                    raise RuntimeError("Kein passender Video-Stream gefunden.")

                actual_res = video_stream.resolution or quality
                update_job(job_id, status="downloading", stage=f"Lade Video-Stream ({actual_res}) herunter...", percent=15)
                raw_video = video_stream.download(output_path=str(temp_dir), filename="raw_video")

                if audio_stream and not video_stream.is_progressive:
                    update_job(job_id, status="downloading", stage="Lade zugehörigen Audio-Stream...", percent=75)
                    raw_audio = audio_stream.download(output_path=str(temp_dir), filename="raw_audio")

                    update_job(job_id, status="processing", stage="Führe Video & Audio mit FFmpeg zusammen...", percent=92)
                    final_filename = f"{safe_title} ({actual_res}).mp4"
                    final_path = DOWNLOAD_DIR / final_filename
                    cmd = [
                        FFMPEG_BIN, "-y",
                        "-i", raw_video,
                        "-i", raw_audio,
                        "-c:v", "copy",
                        "-c:a", "aac",
                        "-strict", "experimental",
                        str(final_path),
                    ]
                    subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                else:
                    final_filename = f"{safe_title} ({actual_res}).mp4"
                    final_path = DOWNLOAD_DIR / final_filename
                    shutil.move(raw_video, str(final_path))

        filesize = final_path.stat().st_size if final_path.exists() else 0
        update_job(
            job_id,
            status="finished",
            percent=100,
            stage="Download abgeschlossen!",
            filename=final_filename,
            filepath=str(final_path),
            filesize=filesize,
            filesize_human=format_bytes(filesize),
            completed_at=time.strftime("%H:%M:%S"),
        )
    except Exception as exc:
        update_job(
            job_id,
            status="error",
            stage=f"Fehler: {exc}",
            error=str(exc),
        )
    finally:
        shutil.rmtree(temp_dir, ignore_errors=True)


# =====================================================================
# REST API Endpunkte für Angular
# =====================================================================

@app.route("/api/health", methods=["GET"])
def api_health():
    return jsonify({
        "status": "online",
        "python_version": sys.version.split()[0],
        "ffmpeg_available": bool(FFMPEG_BIN and os.path.exists(FFMPEG_BIN)),
        "download_dir": str(DOWNLOAD_DIR),
    })


@app.route("/api/yt/info", methods=["POST"])
def api_yt_info():
    data = request.get_json(silent=True) or {}
    url = (data.get("url") or "").strip()
    if not url:
        return jsonify({"error": "Bitte gib eine gültige YouTube-URL ein."}), 400
    try:
        info = extract_video_info(url)
        return jsonify(info)
    except Exception as e:
        return jsonify({"error": f"Video konnte nicht geladen werden: {e}"}), 400


@app.route("/api/yt/download", methods=["POST"])
def api_yt_download():
    data = request.get_json(silent=True) or {}
    url = (data.get("url") or "").strip()
    mode = data.get("mode", "video")          # 'video' | 'audio'
    quality = data.get("quality", "1080p")     # '2160p' | '1080p' | '720p' | 'best' ...
    audio_format = data.get("audioFormat", "mp3")  # 'mp3' | 'm4a'

    if not url:
        return jsonify({"error": "URL fehlt."}), 400

    job_id = str(uuid.uuid4())[:8]
    with JOBS_LOCK:
        JOBS[job_id] = {
            "id": job_id,
            "url": url,
            "mode": mode,
            "quality": quality if mode == "video" else audio_format.upper(),
            "status": "queued",
            "percent": 0,
            "stage": "Starte Download...",
            "title": "YouTube Video",
            "author": "",
            "thumbnail": "",
            "filename": "",
            "filepath": "",
            "filesize": 0,
            "filesize_human": "",
            "error": None,
            "created_at": time.strftime("%H:%M:%S"),
        }

    thread = threading.Thread(
        target=run_download_worker,
        args=(job_id, url, mode, quality, audio_format),
        daemon=True,
    )
    thread.start()
    return jsonify({"job_id": job_id, "job": JOBS[job_id]})


@app.route("/api/yt/progress/<job_id>", methods=["GET"])
def api_yt_progress(job_id: str):
    with JOBS_LOCK:
        job = JOBS.get(job_id)
        if not job:
            return jsonify({"error": "Job nicht gefunden."}), 404
        return jsonify(job)


@app.route("/api/yt/file/<job_id>", methods=["GET"])
def api_yt_file(job_id: str):
    with JOBS_LOCK:
        job = JOBS.get(job_id)
    if not job or job.get("status") != "finished":
        return jsonify({"error": "Datei noch nicht bereit."}), 404
    filepath = job.get("filepath")
    if not filepath or not os.path.exists(filepath):
        return jsonify({"error": "Datei auf der Festplatte nicht gefunden."}), 404
    return send_file(filepath, as_attachment=True, download_name=job.get("filename"))


@app.route("/api/yt/history", methods=["GET"])
def api_yt_history():
    with JOBS_LOCK:
        items = list(reversed(list(JOBS.values())))
    return jsonify({"jobs": items, "download_dir": str(DOWNLOAD_DIR)})


@app.route("/api/yt/open-folder", methods=["POST"])
def api_open_folder():
    data = request.get_json(silent=True) or {}
    filepath = data.get("filepath")
    try:
        if filepath and os.path.exists(filepath):
            subprocess.Popen(["open", "-R", filepath])
        else:
            subprocess.Popen(["open", str(DOWNLOAD_DIR)])
        return jsonify({"ok": True})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/yt/source", methods=["GET"])
def api_source():
    try:
        source_code = Path(__file__).read_text(encoding="utf-8")
        return jsonify({"source": source_code, "path": str(Path(__file__).resolve())})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# =====================================================================
# Background Remover REST API Endpunkte (Python rembg + OpenCV)
# =====================================================================

from PIL import Image
from bg_remover import (
    BG_HISTORY,
    BG_OUTPUT_DIR,
    generate_demo_sample,
    process_image_background,
)


@app.route("/api/bg/remove", methods=["POST"])
def api_bg_remove():
    if "image" not in request.files:
        return jsonify({"error": "Keine Bilddatei übermittelt."}), 400

    file = request.files["image"]
    mode = request.form.get("mode", "ai")
    bg_type = request.form.get("bgType", "transparent")
    bg_color = request.form.get("bgColor", "#6366f1")
    feather = int(request.form.get("feather", 1))
    blur_strength = int(request.form.get("blurStrength", 18))
    threshold = int(request.form.get("threshold", 30))

    try:
        pil_img = Image.open(file.stream)
        entry = process_image_background(
            pil_img,
            filename_hint=file.filename or "upload.png",
            mode=mode,
            bg_type=bg_type,
            bg_color=bg_color,
            feather=feather,
            blur_strength=blur_strength,
            threshold=threshold,
        )
        return jsonify(entry)
    except Exception as e:
        return jsonify({"error": f"Fehler bei der Bildverarbeitung: {e}"}), 400


@app.route("/api/bg/sample", methods=["POST"])
def api_bg_sample():
    data = request.get_json(silent=True) or {}
    sample_name = data.get("sample", "bot")
    mode = data.get("mode", "ai")
    bg_type = data.get("bgType", "transparent")
    bg_color = data.get("bgColor", "#6366f1")
    feather = int(data.get("feather", 1))
    blur_strength = int(data.get("blurStrength", 18))
    threshold = int(data.get("threshold", 30))

    try:
        pil_img, name = generate_demo_sample(sample_name)
        entry = process_image_background(
            pil_img,
            filename_hint=name,
            mode=mode,
            bg_type=bg_type,
            bg_color=bg_color,
            feather=feather,
            blur_strength=blur_strength,
            threshold=threshold,
        )
        return jsonify(entry)
    except Exception as e:
        return jsonify({"error": f"Beispielbild-Verarbeitung fehlgeschlagen: {e}"}), 400


@app.route("/api/bg/history", methods=["GET"])
def api_bg_history():
    return jsonify({"items": BG_HISTORY, "output_dir": str(BG_OUTPUT_DIR)})


@app.route("/api/bg/file/<item_id>", methods=["GET"])
def api_bg_file(item_id: str):
    item = next((x for x in BG_HISTORY if x["id"] == item_id), None)
    if not item or not os.path.exists(item["filepath"]):
        return jsonify({"error": "Datei nicht gefunden."}), 404
    return send_file(item["filepath"], as_attachment=True, download_name=item["filename"])


@app.route("/api/bg/open-folder", methods=["POST"])
def api_bg_open_folder():
    data = request.get_json(silent=True) or {}
    filepath = data.get("filepath")
    try:
        if filepath and os.path.exists(filepath):
            subprocess.Popen(["open", "-R", filepath])
        else:
            subprocess.Popen(["open", str(BG_OUTPUT_DIR)])
        return jsonify({"ok": True})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/bg/source", methods=["GET"])
def api_bg_source():
    try:
        bg_file = Path(__file__).parent / "bg_remover.py"
        return jsonify({"source": bg_file.read_text(encoding="utf-8"), "path": str(bg_file.resolve())})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


def cli_main():
    """Kommandozeilen-Modus: python3 yt_downloader.py <youtube-url> [mp3|1080p|720p]"""
    url = sys.argv[1]
    opt = sys.argv[2] if len(sys.argv) > 2 else "1080p"
    print(f"🔎 Analysiere: {url}")
    info = extract_video_info(url)
    print(f"🎬 Titel: {info['title']} ({info['duration_formatted']}) von {info['author']}")
    job_id = "cli"
    JOBS[job_id] = {"id": job_id}
    mode = "audio" if opt.lower() in ("mp3", "m4a", "audio") else "video"
    run_download_worker(job_id, url, mode, opt, "mp3")
    result = JOBS[job_id]
    if result.get("status") == "finished":
        print(f"✅ Fertig gespeichert unter: {result['filepath']} ({result['filesize_human']})")
    else:
        print(f"❌ Fehler: {result.get('error')}")


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1].startswith("http"):
        cli_main()
    else:
        print("🚀 Starte AllInOne Python YouTube-Downloader Server auf http://127.0.0.1:8765 ...")
        print(f"📂 Download-Ordner: {DOWNLOAD_DIR}")
        app.run(host="127.0.0.1", port=8765, debug=False)
