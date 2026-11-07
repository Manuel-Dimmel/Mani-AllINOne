import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  DownloadJob,
  HealthResponse,
  VideoInfo,
  YtDownloaderService,
} from '../../services/yt-downloader.service';

@Component({
  selector: 'app-yt-downloader',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="yt-page">
      <!-- TOP BAR -->
      <div class="page-topbar">
        <a routerLink="/" class="back-btn">
          <span>←</span>
          <span>Zurück zur Übersicht</span>
        </a>

        <div class="topbar-actions">
          <div class="backend-pill" [class.online]="health()?.status === 'online'">
            <span class="dot"></span>
            @if (health(); as h) {
              <span>Python {{ h.python_version }} • {{ h.ffmpeg_available ? 'FFmpeg aktiv' : 'Standard' }}</span>
            } @else {
              <span>Verbinde mit Python-Backend (Port 8765)...</span>
            }
          </div>

          <button type="button" class="btn-secondary code-toggle-btn" (click)="togglePythonCode()">
            🐍 {{ showPythonCode() ? 'Python-Code ausblenden' : 'Python-Code anzeigen' }}
          </button>

          <button type="button" class="btn-secondary" (click)="openDownloadsFolder()">
            📂 Download-Ordner öffnen
          </button>
        </div>
      </div>

      <!-- HEADER HERO -->
      <header class="yt-hero glass-panel">
        <div class="yt-hero-head">
          <div class="yt-icon-box">🎬</div>
          <div>
            <div class="category-crumb">PROGRAMME • PYTHON MEDIA ENGINE</div>
            <h1>YouTube Video & Audio Downloader</h1>
            <p>
              Füge einen YouTube-Link ein, wähle deine gewünschte Auflösung (bis zu 4K Ultra HD) oder
              extrahiere direkt eine MP3-Audiodatei über das lokale Python-Backend.
            </p>
          </div>
        </div>

        <!-- URL INPUT BAR -->
        <div class="url-bar-container">
          <div class="url-input-wrap">
            <span class="url-prefix">🔗</span>
            <input
              type="url"
              [ngModel]="videoUrl()"
              (ngModelChange)="videoUrl.set($event)"
              (keydown.enter)="analyzeVideo()"
              placeholder="https://www.youtube.com/watch?v=... hier einfügen"
              class="url-input"
            />
            @if (videoUrl()) {
              <button type="button" class="icon-clear" (click)="clearInput()" title="Leeren">✕</button>
            }
          </div>

          <div class="url-buttons">
            <button type="button" class="btn-secondary" (click)="pasteClipboard()" title="Aus Zwischenablage einfügen">
              📋 Einfügen
            </button>
            <button
              type="button"
              class="btn-analyze"
              [disabled]="analyzing() || !videoUrl().trim()"
              (click)="analyzeVideo()"
            >
              @if (analyzing()) {
                <span class="spinner"></span>
                <span>Analysiere...</span>
              } @else {
                <span>🔎 Video laden</span>
              }
            </button>
          </div>
        </div>

        <div class="quick-demo-row">
          <span>Schnelltest:</span>
          <button
            type="button"
            class="demo-chip"
            (click)="loadSample('https://www.youtube.com/watch?v=aqz-KE-bpKQ')"
          >
            🐰 Big Buck Bunny (4K 60fps)
          </button>
          <button
            type="button"
            class="demo-chip"
            (click)="loadSample('https://www.youtube.com/watch?v=jNQXAC9IVRw')"
          >
            🐘 Me at the zoo (Kurzes Testvideo)
          </button>
        </div>

        @if (errorMsg()) {
          <div class="error-banner">
            <span>⚠️ {{ errorMsg() }}</span>
            @if (!health()) {
              <small>
                Tipp: Starte das Python-Backend mit <code>npm run backend</code> oder
                <code>./backend/.venv/bin/python3 backend/yt_downloader.py</code>
              </small>
            }
          </div>
        }
      </header>

      <!-- PYTHON SOURCE CODE VIEWER (COLLAPSIBLE) -->
      @if (showPythonCode()) {
        <section class="code-panel glass-panel">
          <div class="code-header">
            <div>
              <h3>🐍 backend/yt_downloader.py</h3>
              <p>{{ pythonPath() || 'Python Backend & CLI Skript' }}</p>
            </div>
            <button type="button" class="btn-secondary" (click)="copyPythonCode()">
              {{ copiedCode() ? '✓ Kopiert!' : '📋 Code kopieren' }}
            </button>
          </div>
          <pre class="code-block"><code>{{ pythonSource() }}</code></pre>
        </section>
      }

      <!-- VIDEO INFO & FORMAT SELECTION -->
      @if (videoInfo(); as info) {
        <section class="video-workspace glass-panel">
          <div class="video-preview-col">
            <div class="thumb-wrapper">
              <img [src]="info.thumbnail_url" [alt]="info.title" class="video-thumb" />
              <span class="duration-badge">{{ info.duration_formatted }}</span>
            </div>

            <div class="video-meta">
              <span class="channel-badge">📺 {{ info.author }}</span>
              <h2 class="video-title">{{ info.title }}</h2>
              <div class="meta-stats">
                <span>👁️ {{ info.views | number }} Aufrufe</span>
                @if (info.publish_date) {
                  <span>• 📅 {{ info.publish_date }}</span>
                }
                <span>• ⚙️ {{ info.engine }}</span>
              </div>
            </div>
          </div>

          <div class="format-selector-col">
            <!-- MODE SWITCH -->
            <div class="mode-tabs">
              <button
                type="button"
                class="mode-tab"
                [class.active]="downloadMode() === 'video'"
                (click)="downloadMode.set('video')"
              >
                🎬 Video (.MP4)
              </button>
              <button
                type="button"
                class="mode-tab"
                [class.active]="downloadMode() === 'audio'"
                (click)="downloadMode.set('audio')"
              >
                🎵 Nur Audio (.MP3 / .M4A)
              </button>
            </div>

            @if (downloadMode() === 'video') {
              <div class="quality-section">
                <label class="section-label">Qualität & Auflösung wählen:</label>
                <div class="quality-grid">
                  @for (res of info.resolutions; track res.quality) {
                    <button
                      type="button"
                      class="quality-card"
                      [class.selected]="selectedQuality() === res.quality"
                      (click)="selectedQuality.set(res.quality)"
                    >
                      <div class="q-top">
                        <span class="q-res">{{ res.quality }}</span>
                        @if (res.quality === '2160p') {
                          <span class="q-tag ultra">4K UHD</span>
                        } @else if (res.quality === '1440p') {
                          <span class="q-tag qhd">2K QHD</span>
                        } @else if (res.quality === '1080p') {
                          <span class="q-tag fhd">Full HD</span>
                        } @else if (res.quality === '720p') {
                          <span class="q-tag hd">HD</span>
                        }
                      </div>
                      <div class="q-sub">
                        <span>MP4 • {{ res.fps || 30 }} FPS</span>
                        <span>~{{ res.filesize_human }}</span>
                      </div>
                    </button>
                  }
                </div>
              </div>
            } @else {
              <div class="quality-section">
                <label class="section-label">Audio-Format wählen:</label>
                <div class="quality-grid">
                  <button
                    type="button"
                    class="quality-card"
                    [class.selected]="selectedAudioFormat() === 'mp3'"
                    (click)="selectedAudioFormat.set('mp3')"
                  >
                    <div class="q-top">
                      <span class="q-res">MP3 Audio</span>
                      <span class="q-tag fhd">Empfohlen</span>
                    </div>
                    <div class="q-sub">
                      <span>192 kbps • FFmpeg Konvertierung</span>
                      <span>~{{ info.audio_size_human }}</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    class="quality-card"
                    [class.selected]="selectedAudioFormat() === 'm4a'"
                    (click)="selectedAudioFormat.set('m4a')"
                  >
                    <div class="q-top">
                      <span class="q-res">M4A Original</span>
                      <span class="q-tag hd">Verlustfrei</span>
                    </div>
                    <div class="q-sub">
                      <span>Originaler YouTube Audio-Stream</span>
                      <span>~{{ info.audio_size_human }}</span>
                    </div>
                  </button>
                </div>
              </div>
            }

            <div class="download-trigger-row">
              <button
                type="button"
                class="btn-download-now"
                [disabled]="isDownloading()"
                (click)="triggerDownload()"
              >
                @if (isDownloading()) {
                  <span class="spinner"></span>
                  <span>Download läuft ({{ activeJob()?.percent || 0 }}%)...</span>
                } @else {
                  <span>🚀 Jetzt als {{ downloadMode() === 'video' ? selectedQuality() + ' MP4' : selectedAudioFormat().toUpperCase() }} herunterladen</span>
                }
              </button>
            </div>
          </div>
        </section>
      }

      <!-- ACTIVE DOWNLOAD PROGRESS -->
      @if (activeJob(); as job) {
        <section class="progress-card glass-panel" [attr.data-status]="job.status">
          <div class="progress-header">
            <div class="progress-info">
              <span class="status-Chip" [attr.data-status]="job.status">
                {{
                  job.status === 'finished'
                    ? '✅ Abgeschlossen'
                    : job.status === 'error'
                      ? '❌ Fehler'
                      : '⏳ Python Worker aktiv'
                }}
              </span>
              <h4>{{ job.title }} ({{ job.quality }})</h4>
              <p>{{ job.stage }}</p>
            </div>
            <div class="progress-pct">{{ job.percent }}%</div>
          </div>

          <div class="progress-bar-track">
            <div
              class="progress-bar-fill"
              [style.width.%]="job.percent"
              [class.finished]="job.status === 'finished'"
            ></div>
          </div>

          @if (job.status === 'finished') {
            <div class="finished-actions">
              <div class="saved-path">
                <span>📁 Gespeichert in:</span>
                <code>{{ job.filepath }}</code>
                <span class="size-badge">{{ job.filesize_human }}</span>
              </div>
              <div class="action-btns">
                <a
                  [href]="getBrowserDownloadUrl(job.id)"
                  class="btn-primary"
                  download
                >
                  💾 Im Browser speichern
                </a>
                <button
                  type="button"
                  class="btn-secondary"
                  (click)="openDownloadsFolder(job.filepath)"
                >
                  📂 Im Finder zeigen
                </button>
              </div>
            </div>
          }
        </section>
      }

      <!-- DOWNLOAD HISTORY -->
      @if (history().length > 0) {
        <section class="history-section glass-panel">
          <div class="history-header">
            <h3>📥 Letzte Downloads</h3>
            <span class="folder-hint">Zielordner: ~/Downloads/AllInOne_YT</span>
          </div>

          <div class="history-list">
            @for (item of history(); track item.id) {
              <div class="history-item">
                <div class="h-left">
                  <span class="h-mode-icon">{{ item.mode === 'audio' ? '🎵' : '🎬' }}</span>
                  <div>
                    <div class="h-title">{{ item.filename || item.title }}</div>
                    <div class="h-sub">
                      <span>{{ item.quality }}</span>
                      @if (item.filesize_human) {
                        <span>• {{ item.filesize_human }}</span>
                      }
                      <span>• {{ item.stage }}</span>
                    </div>
                  </div>
                </div>

                @if (item.status === 'finished') {
                  <div class="h-actions">
                    <a [href]="getBrowserDownloadUrl(item.id)" class="btn-secondary sm" download>
                      💾 Speichern
                    </a>
                    <button
                      type="button"
                      class="btn-secondary sm"
                      (click)="openDownloadsFolder(item.filepath)"
                    >
                      📂 Finder
                    </button>
                  </div>
                }
              </div>
            }
          </div>
        </section>
      }
    </div>
  `,
  styles: [`
    .yt-page {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
      padding-bottom: 3rem;
    }

    .page-topbar {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      align-items: center;
      gap: 1rem;
    }

    .back-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.55rem 1rem;
      border-radius: 12px;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid var(--border-subtle);
      color: var(--text-secondary);
      font-weight: 600;
      font-size: 0.88rem;
      transition: all 0.2s ease;
    }

    .back-btn:hover {
      color: var(--text-primary);
      background: rgba(255, 255, 255, 0.1);
    }

    .topbar-actions {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.65rem;
    }

    .backend-pill {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 0.9rem;
      border-radius: 999px;
      font-size: 0.8rem;
      font-weight: 600;
      background: rgba(245, 158, 11, 0.14);
      border: 1px solid rgba(245, 158, 11, 0.35);
      color: #fcd34d;
    }

    .backend-pill.online {
      background: rgba(16, 185, 129, 0.14);
      border-color: rgba(16, 185, 129, 0.35);
      color: #6ee7b7;
    }

    .backend-pill .dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: currentColor;
      box-shadow: 0 0 8px currentColor;
    }

    /* HERO */
    .yt-hero {
      padding: 2rem;
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
      border-color: rgba(244, 63, 94, 0.28);
    }

    .yt-hero-head {
      display: flex;
      align-items: center;
      gap: 1.25rem;
    }

    .yt-icon-box {
      width: 64px;
      height: 64px;
      border-radius: 18px;
      background: linear-gradient(135deg, #ef4444 0%, #f43f5e 50%, #a855f7 100%);
      display: grid;
      place-items: center;
      font-size: 2rem;
      flex-shrink: 0;
      box-shadow: 0 12px 28px -6px rgba(244, 63, 94, 0.5);
    }

    .category-crumb {
      font-size: 0.74rem;
      font-weight: 700;
      letter-spacing: 0.08em;
      color: #fb7185;
      margin-bottom: 0.25rem;
    }

    .yt-hero-head h1 {
      margin: 0;
      font-family: var(--font-display);
      font-size: clamp(1.5rem, 2.6vw, 2.1rem);
      font-weight: 800;
    }

    .yt-hero-head p {
      margin: 0.35rem 0 0;
      color: var(--text-secondary);
      font-size: 0.95rem;
      max-width: 68ch;
    }

    /* URL BAR */
    .url-bar-container {
      display: flex;
      gap: 0.75rem;
      flex-wrap: wrap;
    }

    .url-input-wrap {
      flex: 1;
      min-width: 280px;
      position: relative;
      display: flex;
      align-items: center;
    }

    .url-prefix {
      position: absolute;
      left: 1rem;
      font-size: 1.1rem;
      pointer-events: none;
    }

    .url-input {
      width: 100%;
      padding: 0.95rem 2.6rem 0.95rem 2.85rem;
      border-radius: 14px;
      border: 1px solid rgba(255, 255, 255, 0.14);
      background: rgba(7, 9, 14, 0.78);
      color: var(--text-primary);
      font-size: 0.98rem;
      outline: none;
      transition: border-color 0.2s ease, box-shadow 0.2s ease;
    }

    .url-input:focus {
      border-color: #f43f5e;
      box-shadow: 0 0 0 3px rgba(244, 63, 94, 0.22);
    }

    .icon-clear {
      position: absolute;
      right: 0.85rem;
      background: none;
      border: none;
      color: var(--text-secondary);
      cursor: pointer;
      font-size: 0.95rem;
    }

    .url-buttons {
      display: flex;
      gap: 0.65rem;
    }

    .btn-analyze {
      display: inline-flex;
      align-items: center;
      gap: 0.55rem;
      padding: 0 1.5rem;
      border-radius: 14px;
      border: none;
      background: linear-gradient(135deg, #ef4444 0%, #f43f5e 50%, #a855f7 100%);
      color: #fff;
      font-weight: 700;
      font-size: 0.95rem;
      cursor: pointer;
      box-shadow: 0 10px 24px -6px rgba(244, 63, 94, 0.55);
      transition: transform 0.2s ease, opacity 0.2s ease;
    }

    .btn-analyze:hover:not(:disabled) {
      transform: translateY(-2px);
    }

    .btn-analyze:disabled {
      opacity: 0.55;
      cursor: not-allowed;
    }

    .quick-demo-row {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.55rem;
      font-size: 0.82rem;
      color: var(--text-muted);
    }

    .demo-chip {
      padding: 0.3rem 0.7rem;
      border-radius: 8px;
      border: 1px solid var(--border-subtle);
      background: rgba(255, 255, 255, 0.04);
      color: var(--text-secondary);
      font-size: 0.78rem;
      cursor: pointer;
      transition: all 0.18s ease;
    }

    .demo-chip:hover {
      color: var(--text-primary);
      border-color: rgba(244, 63, 94, 0.4);
      background: rgba(244, 63, 94, 0.12);
    }

    .error-banner {
      padding: 0.95rem 1.2rem;
      border-radius: 12px;
      background: rgba(239, 68, 68, 0.14);
      border: 1px solid rgba(239, 68, 68, 0.4);
      color: #fca5a5;
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
      font-size: 0.9rem;
    }

    /* PYTHON CODE PANEL */
    .code-panel {
      padding: 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .code-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .code-header h3 {
      margin: 0;
      font-size: 1.05rem;
    }

    .code-header p {
      margin: 0.2rem 0 0;
      font-size: 0.8rem;
      color: var(--text-muted);
      font-family: var(--font-mono);
    }

    .code-block {
      margin: 0;
      padding: 1.15rem;
      border-radius: 12px;
      background: #05070b;
      border: 1px solid var(--border-subtle);
      color: #e2e8f0;
      font-family: var(--font-mono);
      font-size: 0.8rem;
      line-height: 1.55;
      max-height: 420px;
      overflow: auto;
    }

    /* VIDEO WORKSPACE */
    .video-workspace {
      padding: 1.75rem;
      display: grid;
      grid-template-columns: 360px 1fr;
      gap: 2rem;
      align-items: start;
    }

    .video-preview-col {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .thumb-wrapper {
      position: relative;
      border-radius: 14px;
      overflow: hidden;
      aspect-ratio: 16 / 9;
      background: #000;
      border: 1px solid var(--border-subtle);
    }

    .video-thumb {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }

    .duration-badge {
      position: absolute;
      bottom: 0.65rem;
      right: 0.65rem;
      padding: 0.25rem 0.55rem;
      border-radius: 6px;
      background: rgba(0, 0, 0, 0.82);
      color: #fff;
      font-family: var(--font-mono);
      font-size: 0.78rem;
      font-weight: 600;
    }

    .channel-badge {
      display: inline-block;
      font-size: 0.8rem;
      font-weight: 600;
      color: #fb7185;
      margin-bottom: 0.3rem;
    }

    .video-title {
      margin: 0;
      font-size: 1.15rem;
      font-weight: 700;
      line-height: 1.35;
    }

    .meta-stats {
      margin-top: 0.5rem;
      display: flex;
      flex-wrap: wrap;
      gap: 0.45rem;
      font-size: 0.8rem;
      color: var(--text-secondary);
    }

    /* FORMAT SELECTOR */
    .format-selector-col {
      display: flex;
      flex-direction: column;
      gap: 1.35rem;
    }

    .mode-tabs {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.65rem;
      background: rgba(0, 0, 0, 0.3);
      padding: 0.4rem;
      border-radius: 14px;
      border: 1px solid var(--border-subtle);
    }

    .mode-tab {
      padding: 0.75rem 1rem;
      border-radius: 10px;
      border: none;
      background: transparent;
      color: var(--text-secondary);
      font-weight: 700;
      font-size: 0.92rem;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .mode-tab.active {
      background: linear-gradient(135deg, rgba(244, 63, 94, 0.25), rgba(168, 85, 247, 0.25));
      color: #fff;
      border: 1px solid rgba(244, 63, 94, 0.45);
    }

    .section-label {
      display: block;
      font-size: 0.85rem;
      font-weight: 600;
      color: var(--text-secondary);
      margin-bottom: 0.75rem;
    }

    .quality-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(175px, 1fr));
      gap: 0.75rem;
    }

    .quality-card {
      padding: 0.9rem 1rem;
      border-radius: 12px;
      border: 1px solid var(--border-subtle);
      background: rgba(255, 255, 255, 0.03);
      color: var(--text-primary);
      text-align: left;
      cursor: pointer;
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
      transition: all 0.18s ease;
    }

    .quality-card:hover {
      background: rgba(255, 255, 255, 0.07);
      border-color: rgba(255, 255, 255, 0.2);
    }

    .quality-card.selected {
      background: rgba(244, 63, 94, 0.16);
      border-color: #f43f5e;
      box-shadow: 0 0 0 2px rgba(244, 63, 94, 0.25);
    }

    .q-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .q-res {
      font-family: var(--font-display);
      font-size: 1.05rem;
      font-weight: 700;
    }

    .q-tag {
      font-size: 0.68rem;
      font-weight: 700;
      padding: 0.15rem 0.45rem;
      border-radius: 5px;
      text-transform: uppercase;
    }

    .q-tag.ultra {
      background: rgba(168, 85, 247, 0.25);
      color: #d8b4fe;
    }

    .q-tag.qhd, .q-tag.fhd {
      background: rgba(244, 63, 94, 0.25);
      color: #fda4af;
    }

    .q-tag.hd {
      background: rgba(6, 182, 212, 0.22);
      color: #67e8f9;
    }

    .q-sub {
      display: flex;
      justify-content: space-between;
      font-size: 0.76rem;
      color: var(--text-secondary);
    }

    .btn-download-now {
      width: 100%;
      padding: 1rem 1.5rem;
      border-radius: 14px;
      border: none;
      background: linear-gradient(135deg, #ef4444 0%, #f43f5e 50%, #a855f7 100%);
      color: #fff;
      font-size: 1rem;
      font-weight: 700;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.6rem;
      box-shadow: 0 12px 28px -6px rgba(244, 63, 94, 0.55);
      transition: transform 0.2s ease, opacity 0.2s ease;
    }

    .btn-download-now:hover:not(:disabled) {
      transform: translateY(-2px);
    }

    .btn-download-now:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    /* PROGRESS CARD */
    .progress-card {
      padding: 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 1rem;
      border-color: rgba(99, 102, 241, 0.35);
    }

    .progress-card[data-status='finished'] {
      border-color: rgba(16, 185, 129, 0.45);
    }

    .progress-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1rem;
    }

    .status-Chip {
      display: inline-block;
      font-size: 0.75rem;
      font-weight: 700;
      padding: 0.22rem 0.6rem;
      border-radius: 6px;
      background: rgba(99, 102, 241, 0.2);
      color: #a5b4fc;
      margin-bottom: 0.35rem;
    }

    .status-Chip[data-status='finished'] {
      background: rgba(16, 185, 129, 0.2);
      color: #6ee7b7;
    }

    .progress-info h4 {
      margin: 0;
      font-size: 1.05rem;
    }

    .progress-info p {
      margin: 0.25rem 0 0;
      font-size: 0.86rem;
      color: var(--text-secondary);
    }

    .progress-pct {
      font-family: var(--font-display);
      font-size: 1.8rem;
      font-weight: 800;
      color: #f43f5e;
    }

    .progress-bar-track {
      width: 100%;
      height: 10px;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.08);
      overflow: hidden;
    }

    .progress-bar-fill {
      height: 100%;
      border-radius: 999px;
      background: linear-gradient(90deg, #6366f1, #ec4899, #f43f5e);
      transition: width 0.3s ease;
    }

    .progress-bar-fill.finished {
      background: linear-gradient(90deg, #10b981, #06b6d4);
    }

    .finished-actions {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      align-items: center;
      gap: 1rem;
      padding-top: 0.5rem;
      border-top: 1px solid var(--border-subtle);
    }

    .saved-path {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.84rem;
      color: var(--text-secondary);
    }

    .saved-path code {
      padding: 0.25rem 0.55rem;
      border-radius: 6px;
      background: rgba(0, 0, 0, 0.35);
      color: #e2e8f0;
      font-family: var(--font-mono);
      font-size: 0.78rem;
    }

    .size-badge {
      padding: 0.2rem 0.55rem;
      border-radius: 6px;
      background: rgba(16, 185, 129, 0.16);
      color: #6ee7b7;
      font-weight: 600;
      font-size: 0.76rem;
    }

    .action-btns {
      display: flex;
      gap: 0.65rem;
    }

    /* HISTORY */
    .history-section {
      padding: 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .history-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .history-header h3 {
      margin: 0;
      font-size: 1.1rem;
    }

    .folder-hint {
      font-family: var(--font-mono);
      font-size: 0.78rem;
      color: var(--text-muted);
    }

    .history-list {
      display: flex;
      flex-direction: column;
      gap: 0.65rem;
    }

    .history-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1rem;
      padding: 0.85rem 1rem;
      border-radius: 12px;
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid var(--border-subtle);
    }

    .h-left {
      display: flex;
      align-items: center;
      gap: 0.85rem;
    }

    .h-mode-icon {
      font-size: 1.35rem;
    }

    .h-title {
      font-weight: 600;
      font-size: 0.92rem;
    }

    .h-sub {
      display: flex;
      gap: 0.45rem;
      font-size: 0.78rem;
      color: var(--text-secondary);
      margin-top: 0.15rem;
    }

    .h-actions {
      display: flex;
      gap: 0.5rem;
    }

    .btn-secondary.sm {
      padding: 0.45rem 0.8rem;
      font-size: 0.8rem;
    }

    .spinner {
      width: 16px;
      height: 16px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-top-color: #fff;
      border-radius: 50%;
      animation: spin 0.7s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    @media (max-width: 900px) {
      .video-workspace {
        grid-template-columns: 1fr;
      }
    }
  `],
})
export class YtDownloaderComponent implements OnInit, OnDestroy {
  private readonly ytService = inject(YtDownloaderService);
  private pollTimer: ReturnType<typeof setInterval> | null = null;

  readonly health = signal<HealthResponse | null>(null);
  readonly videoUrl = signal<string>('');
  readonly analyzing = signal<boolean>(false);
  readonly errorMsg = signal<string>('');
  readonly videoInfo = signal<VideoInfo | null>(null);

  readonly downloadMode = signal<'video' | 'audio'>('video');
  readonly selectedQuality = signal<string>('1080p');
  readonly selectedAudioFormat = signal<'mp3' | 'm4a'>('mp3');

  readonly activeJob = signal<DownloadJob | null>(null);
  readonly isDownloading = signal<boolean>(false);
  readonly history = signal<DownloadJob[]>([]);

  readonly showPythonCode = signal<boolean>(false);
  readonly pythonSource = signal<string>('');
  readonly pythonPath = signal<string>('');
  readonly copiedCode = signal<boolean>(false);

  ngOnInit(): void {
    this.checkBackend();
    this.loadHistory();
  }

  ngOnDestroy(): void {
    this.stopPolling();
  }

  checkBackend(): void {
    this.ytService.checkHealth().subscribe({
      next: (res) => this.health.set(res),
      error: () => this.health.set(null),
    });
  }

  loadHistory(): void {
    this.ytService.getHistory().subscribe({
      next: (res) => this.history.set(res.jobs),
      error: () => {},
    });
  }

  async pasteClipboard(): Promise<void> {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        this.videoUrl.set(text.trim());
        this.analyzeVideo();
      }
    } catch {
      this.errorMsg.set('Zwischenablage-Zugriff nicht erlaubt. Bitte per Cmd+V einfügen.');
    }
  }

  clearInput(): void {
    this.videoUrl.set('');
    this.errorMsg.set('');
  }

  loadSample(url: string): void {
    this.videoUrl.set(url);
    this.analyzeVideo();
  }

  analyzeVideo(): void {
    const url = this.videoUrl().trim();
    if (!url) return;

    this.analyzing.set(true);
    this.errorMsg.set('');

    this.ytService.getVideoInfo(url).subscribe({
      next: (info) => {
        this.videoInfo.set(info);
        this.analyzing.set(false);
        if (info.resolutions.length > 0) {
          const has1080 = info.resolutions.find((r) => r.quality === '1080p');
          this.selectedQuality.set(has1080 ? '1080p' : info.resolutions[0].quality);
        }
      },
      error: (err) => {
        this.analyzing.set(false);
        this.errorMsg.set(
          err?.error?.error ||
            'Verbindung zum Python-Backend auf Port 8765 fehlgeschlagen. Läuft der Python-Server?'
        );
      },
    });
  }

  triggerDownload(): void {
    const info = this.videoInfo();
    if (!info) return;

    this.isDownloading.set(true);
    this.errorMsg.set('');

    this.ytService
      .startDownload(
        info.url,
        this.downloadMode(),
        this.selectedQuality(),
        this.selectedAudioFormat()
      )
      .subscribe({
        next: (res) => {
          this.activeJob.set(res.job);
          this.startPolling(res.job_id);
        },
        error: (err) => {
          this.isDownloading.set(false);
          this.errorMsg.set(err?.error?.error || 'Download konnte nicht gestartet werden.');
        },
      });
  }

  private startPolling(jobId: string): void {
    this.stopPolling();
    this.pollTimer = setInterval(() => {
      this.ytService.getProgress(jobId).subscribe({
        next: (job) => {
          this.activeJob.set(job);
          if (job.status === 'finished' || job.status === 'error') {
            this.isDownloading.set(false);
            this.stopPolling();
            this.loadHistory();
            if (job.status === 'error' && job.error) {
              this.errorMsg.set(job.error);
            }
          }
        },
        error: () => {
          this.isDownloading.set(false);
          this.stopPolling();
        },
      });
    }, 650);
  }

  private stopPolling(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  getBrowserDownloadUrl(jobId: string): string {
    return this.ytService.getFileDownloadUrl(jobId);
  }

  openDownloadsFolder(filepath?: string): void {
    this.ytService.openFolder(filepath).subscribe();
  }

  togglePythonCode(): void {
    const next = !this.showPythonCode();
    this.showPythonCode.set(next);
    if (next && !this.pythonSource()) {
      this.ytService.getPythonSource().subscribe({
        next: (res) => {
          this.pythonSource.set(res.source);
          this.pythonPath.set(res.path);
        },
        error: () => {
          this.pythonSource.set('# Python-Backend auf Port 8765 nicht erreichbar.\n# Datei liegt unter: backend/yt_downloader.py');
        },
      });
    }
  }

  async copyPythonCode(): Promise<void> {
    if (!this.pythonSource()) return;
    await navigator.clipboard.writeText(this.pythonSource());
    this.copiedCode.set(true);
    setTimeout(() => this.copiedCode.set(false), 2000);
  }
}
