import { Component, HostListener, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  BgHistoryItem,
  BgRemoveOptions,
  BgRemoveResult,
  BgRemoverService,
} from '../../services/bg-remover.service';

@Component({
  selector: 'app-bg-remover',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="bg-page">
      <!-- TOP BAR -->
      <div class="page-topbar">
        <a routerLink="/" class="back-btn">
          <span>←</span>
          <span>Zurück zur Übersicht</span>
        </a>

        <div class="topbar-actions">
          <span class="engine-pill">
            <span class="dot"></span>
            🐍 Python AI • rembg (U²-Net ONNX) & OpenCV
          </span>

          <button type="button" class="btn-secondary" (click)="togglePythonCode()">
            🐍 {{ showPythonCode() ? 'Python-Code ausblenden' : 'Python-Code anzeigen' }}
          </button>

          <button type="button" class="btn-secondary" (click)="openOutputFolder()">
            📂 Zielordner öffnen
          </button>
        </div>
      </div>

      <!-- HEADER -->
      <header class="bg-hero glass-panel">
        <div class="hero-left">
          <div class="bg-icon-box">🪄</div>
          <div>
            <div class="crumb">PROGRAMME • PYTHON COMPUTER VISION & AI</div>
            <h1>AI Background Remover Studio</h1>
            <p>
              Entferne Bildhintergründe automatisch per lokalem Python-KI-Modell (<strong>U²-Net ONNX</strong>)
              oder <strong>OpenCV GrabCut</strong> – inklusive Kanten-Glättung, Portrait-Bokeh und Vorher/Nachher-Vergleich.
            </p>
          </div>
        </div>
      </header>

      <!-- PYTHON CODE VIEWER -->
      @if (showPythonCode()) {
        <section class="code-panel glass-panel">
          <div class="code-header">
            <div>
              <h3>🐍 backend/bg_remover.py</h3>
              <p>{{ pythonPath() || 'Python Background Remover Engine' }}</p>
            </div>
            <button type="button" class="btn-secondary" (click)="copyPythonCode()">
              {{ copiedCode() ? '✓ Kopiert!' : '📋 Code kopieren' }}
            </button>
          </div>
          <pre class="code-block"><code>{{ pythonSource() }}</code></pre>
        </section>
      }

      @if (errorMsg()) {
        <div class="error-banner">⚠️ {{ errorMsg() }}</div>
      }

      <!-- MAIN WORKSPACE -->
      <div class="workspace-grid">
        <!-- LEFT: UPLOAD & OPTIONS -->
        <aside class="controls-col glass-panel">
          <!-- UPLOAD DROPZONE -->
          <div
            class="dropzone"
            [class.dragging]="isDragging()"
            (dragover)="onDragOver($event)"
            (dragleave)="onDragLeave($event)"
            (drop)="onDrop($event)"
            (click)="fileInput.click()"
          >
            <input
              #fileInput
              type="file"
              accept="image/png,image/jpeg,image/webp"
              hidden
              (change)="onFileSelected($event)"
            />
            <div class="drop-icon">🖼️</div>
            <h4>Bild hierher ziehen oder klicken</h4>
            <p>Unterstützt PNG, JPG, WEBP oder direkt per <code>Cmd+V</code> einfügen</p>
            @if (selectedFile(); as f) {
              <span class="file-chip">📄 {{ f.name }}</span>
            }
          </div>

          <!-- QUICK DEMO SAMPLES -->
          <div class="demo-box">
            <span class="demo-label">Oder 1-Klick-Beispielbild testen:</span>
            <div class="demo-btns">
              <button type="button" class="demo-btn" [disabled]="processing()" (click)="runSample('bot')">
                🤖 Neon Bot
              </button>
              <button type="button" class="demo-btn" [disabled]="processing()" (click)="runSample('crystal')">
                💎 Kristall
              </button>
              <button type="button" class="demo-btn" [disabled]="processing()" (click)="runSample('badge')">
                🏆 Trophäe
              </button>
            </div>
          </div>

          <hr class="divider" />

          <!-- PYTHON ENGINE MODE -->
          <div class="control-group">
            <label class="group-title">1. Python Freistellungs-Engine</label>
            <div class="mode-cards">
              <button
                type="button"
                class="mode-card"
                [class.active]="mode() === 'ai'"
                (click)="mode.set('ai')"
              >
                <strong>🧠 U²-Net KI (rembg)</strong>
                <span>Neuronales Netz für Personen & Objekte</span>
              </button>

              <button
                type="button"
                class="mode-card"
                [class.active]="mode() === 'grabcut'"
                (click)="mode.set('grabcut')"
              >
                <strong>🎯 OpenCV GrabCut</strong>
                <span>Kontur-Segmentierung für zentrale Motive</span>
              </button>

              <button
                type="button"
                class="mode-card"
                [class.active]="mode() === 'chroma'"
                (click)="mode.set('chroma')"
              >
                <strong>🎨 Smart Chroma (LAB)</strong>
                <span>Ultraschnell bei einfarbigen Hintergründen</span>
              </button>
            </div>
          </div>

          <!-- BACKGROUND REPLACEMENT -->
          <div class="control-group">
            <label class="group-title">2. Neuer Hintergrund</label>
            <div class="bg-type-pills">
              <button
                type="button"
                class="pill-btn"
                [class.active]="bgType() === 'transparent'"
                (click)="bgType.set('transparent')"
              >
                🏁 Transparent
              </button>
              <button
                type="button"
                class="pill-btn"
                [class.active]="bgType() === 'color'"
                (click)="bgType.set('color')"
              >
                🎨 Farbe
              </button>
              <button
                type="button"
                class="pill-btn"
                [class.active]="bgType() === 'blur'"
                (click)="bgType.set('blur')"
              >
                📸 Bokeh Blur
              </button>
            </div>

            @if (bgType() === 'color') {
              <div class="color-picker-row">
                <input
                  type="color"
                  [ngModel]="bgColor()"
                  (ngModelChange)="bgColor.set($event)"
                  class="color-input"
                />
                <div class="color-presets">
                  @for (c of colorPresets; track c) {
                    <button
                      type="button"
                      class="color-dot"
                      [style.background]="c"
                      [class.selected]="bgColor() === c"
                      (click)="bgColor.set(c)"
                    ></button>
                  }
                </div>
              </div>
            }

            @if (bgType() === 'blur') {
              <div class="slider-row">
                <div class="slider-head">
                  <span>Unschärfe-Radius (Bokeh)</span>
                  <strong>{{ blurStrength() }} px</strong>
                </div>
                <input
                  type="range"
                  min="5"
                  max="45"
                  [ngModel]="blurStrength()"
                  (ngModelChange)="blurStrength.set($event)"
                />
              </div>
            }
          </div>

          <!-- FEATHERING & THRESHOLD -->
          <div class="control-group">
            <div class="slider-row">
              <div class="slider-head">
                <span>Kanten-Glättung (Edge Feathering)</span>
                <strong>{{ feather() }} px</strong>
              </div>
              <input
                type="range"
                min="0"
                max="10"
                [ngModel]="feather()"
                (ngModelChange)="feather.set($event)"
              />
            </div>

            @if (mode() === 'chroma') {
              <div class="slider-row">
                <div class="slider-head">
                  <span>Chroma Farb-Toleranz</span>
                  <strong>{{ threshold() }}</strong>
                </div>
                <input
                  type="range"
                  min="10"
                  max="80"
                  [ngModel]="threshold()"
                  (ngModelChange)="threshold.set($event)"
                />
              </div>
            }
          </div>

          <!-- ACTION BUTTON -->
          <button
            type="button"
            class="btn-process"
            [disabled]="processing() || (!selectedFile() && !activeSample())"
            (click)="processCurrent()"
          >
            @if (processing()) {
              <span class="spinner"></span>
              <span>Python verarbeitet Bild...</span>
            } @else {
              <span>🪄 Hintergrund jetzt entfernen</span>
            }
          </button>
        </aside>

        <!-- RIGHT: PREVIEW & COMPARISON -->
        <section class="preview-col glass-panel">
          <div class="preview-toolbar">
            <div class="view-tabs">
              <button
                type="button"
                class="view-tab"
                [class.active]="viewMode() === 'slider'"
                (click)="viewMode.set('slider')"
              >
                ↔️ Vorher / Nachher Slider
              </button>
              <button
                type="button"
                class="view-tab"
                [class.active]="viewMode() === 'result'"
                (click)="viewMode.set('result')"
              >
                ✨ Nur Freigestellt
              </button>
              <button
                type="button"
                class="view-tab"
                [class.active]="viewMode() === 'split'"
                (click)="viewMode.set('split')"
              >
                🖼️ Nebeneinander
              </button>
            </div>

            @if (result(); as res) {
              <div class="meta-pills">
                <span class="meta-chip">{{ res.width }}×{{ res.height }} px</span>
                <span class="meta-chip">{{ res.duration_ms }} ms</span>
                <span class="meta-chip">{{ res.engine }}</span>
              </div>
            }
          </div>

          <!-- STAGE -->
          @if (result(); as res) {
            <div class="stage-container">
              @if (viewMode() === 'slider') {
                <div class="compare-stage checkerboard">
                  <!-- NACHHER (RESULT) FULL -->
                  <img [src]="res.result_base64" alt="Freigestellt" class="stage-img" />

                  <!-- VORHER (ORIGINAL) CLIPPED -->
                  <div
                    class="original-overlay"
                    [style.clip-path]="'inset(0 ' + (100 - sliderPos()) + '% 0 0)'"
                  >
                    <img [src]="res.original_base64" alt="Original" class="stage-img" />
                  </div>

                  <!-- DIVIDER LINE -->
                  <div class="slider-line" [style.left.%]="sliderPos()">
                    <div class="slider-handle">↔</div>
                  </div>

                  <span class="corner-label left">VORHER (Original)</span>
                  <span class="corner-label right">NACHHER (Freigestellt)</span>

                  <input
                    type="range"
                    min="0"
                    max="100"
                    [ngModel]="sliderPos()"
                    (ngModelChange)="sliderPos.set($event)"
                    class="compare-range-overlay"
                    aria-label="Vorher Nachher Vergleich"
                  />
                </div>
              } @else if (viewMode() === 'result') {
                <div class="single-stage checkerboard">
                  <img [src]="res.result_base64" alt="Freigestellt" class="stage-img" />
                </div>
              } @else {
                <div class="split-stage">
                  <div class="split-box">
                    <span class="split-title">Original</span>
                    <img [src]="res.original_base64" alt="Original" class="stage-img" />
                  </div>
                  <div class="split-box checkerboard">
                    <span class="split-title">Freigestellt ({{ res.filesize_human }})</span>
                    <img [src]="res.result_base64" alt="Freigestellt" class="stage-img" />
                  </div>
                </div>
              }
            </div>

            <!-- RESULT FOOTER ACTIONS -->
            <div class="result-footer">
              <div class="saved-info">
                <span>📁 Gespeichert unter:</span>
                <code>{{ res.filepath }}</code>
                <span class="size-pill">{{ res.filesize_human }}</span>
              </div>

              <div class="export-btns">
                <a [href]="getDownloadUrl(res.id)" class="btn-primary" download>
                  💾 Als PNG speichern
                </a>
                <button
                  type="button"
                  class="btn-secondary"
                  (click)="openOutputFolder(res.filepath)"
                >
                  📂 Im Finder zeigen
                </button>
              </div>
            </div>
          } @else {
            <div class="empty-stage">
              <div class="empty-orb">🪄</div>
              <h3>Wähle links ein Bild oder klicke auf ein Beispiel</h3>
              <p>
                Du kannst jedes Foto per Drag & Drop hineinziehen oder oben links auf
                <strong>🤖 Neon Bot</strong> / <strong>💎 Kristall</strong> klicken, um die Python-Freistellung sofort live zu testen.
              </p>
              <button type="button" class="btn-primary" (click)="runSample('bot')">
                🚀 Beispielbild sofort freistellen
              </button>
            </div>
          }
        </section>
      </div>

      <!-- HISTORY -->
      @if (history().length > 0) {
        <section class="history-panel glass-panel">
          <div class="history-head">
            <h3>🖼️ Zuletzt freigestellte Bilder</h3>
            <span>Ordner: ~/Downloads/AllInOne_BG</span>
          </div>
          <div class="history-grid">
            @for (item of history(); track item.id) {
              <div class="hist-card">
                <div class="hist-thumb checkerboard">
                  <img [src]="item.result_base64" [alt]="item.filename" />
                </div>
                <div class="hist-meta">
                  <div class="hist-name">{{ item.filename }}</div>
                  <div class="hist-sub">{{ item.width }}×{{ item.height }} • {{ item.filesize_human }}</div>
                </div>
                <div class="hist-actions">
                  <a [href]="getDownloadUrl(item.id)" class="btn-secondary sm" download>💾</a>
                  <button type="button" class="btn-secondary sm" (click)="openOutputFolder(item.filepath)">
                    📂
                  </button>
                </div>
              </div>
            }
          </div>
        </section>
      }
    </div>
  `,
  styles: [`
    .bg-page {
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
    }

    .topbar-actions {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.65rem;
    }

    .engine-pill {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 0.95rem;
      border-radius: 999px;
      font-size: 0.8rem;
      font-weight: 600;
      background: rgba(6, 182, 212, 0.14);
      border: 1px solid rgba(6, 182, 212, 0.35);
      color: #67e8f9;
    }

    .engine-pill .dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #22d3ee;
      box-shadow: 0 0 8px #22d3ee;
    }

    /* HERO */
    .bg-hero {
      padding: 1.75rem 2rem;
      border-color: rgba(6, 182, 212, 0.3);
    }

    .hero-left {
      display: flex;
      align-items: center;
      gap: 1.25rem;
    }

    .bg-icon-box {
      width: 62px;
      height: 62px;
      border-radius: 18px;
      background: linear-gradient(135deg, #06b6d4 0%, #6366f1 50%, #ec4899 100%);
      display: grid;
      place-items: center;
      font-size: 2rem;
      flex-shrink: 0;
      box-shadow: 0 12px 26px -6px rgba(6, 182, 212, 0.5);
    }

    .crumb {
      font-size: 0.74rem;
      font-weight: 700;
      letter-spacing: 0.08em;
      color: #22d3ee;
      margin-bottom: 0.25rem;
    }

    .hero-left h1 {
      margin: 0;
      font-family: var(--font-display);
      font-size: clamp(1.45rem, 2.4vw, 2rem);
      font-weight: 800;
    }

    .hero-left p {
      margin: 0.35rem 0 0;
      color: var(--text-secondary);
      font-size: 0.94rem;
      max-width: 72ch;
    }

    /* CODE VIEWER */
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

    .code-header h3 { margin: 0; font-size: 1.05rem; }
    .code-header p { margin: 0.2rem 0 0; font-size: 0.8rem; color: var(--text-muted); font-family: var(--font-mono); }

    .code-block {
      margin: 0;
      padding: 1.1rem;
      border-radius: 12px;
      background: #05070b;
      border: 1px solid var(--border-subtle);
      color: #e2e8f0;
      font-family: var(--font-mono);
      font-size: 0.8rem;
      line-height: 1.55;
      max-height: 380px;
      overflow: auto;
    }

    .error-banner {
      padding: 0.9rem 1.2rem;
      border-radius: 12px;
      background: rgba(239, 68, 68, 0.14);
      border: 1px solid rgba(239, 68, 68, 0.4);
      color: #fca5a5;
      font-size: 0.9rem;
    }

    /* WORKSPACE */
    .workspace-grid {
      display: grid;
      grid-template-columns: 380px 1fr;
      gap: 1.5rem;
      align-items: start;
    }

    .controls-col {
      padding: 1.4rem;
      display: flex;
      flex-direction: column;
      gap: 1.15rem;
    }

    .dropzone {
      border: 2px dashed rgba(255, 255, 255, 0.16);
      border-radius: 16px;
      padding: 1.35rem 1rem;
      text-align: center;
      cursor: pointer;
      background: rgba(255, 255, 255, 0.02);
      transition: all 0.2s ease;
    }

    .dropzone:hover, .dropzone.dragging {
      border-color: #22d3ee;
      background: rgba(6, 182, 212, 0.08);
    }

    .drop-icon { font-size: 2rem; margin-bottom: 0.35rem; }
    .dropzone h4 { margin: 0; font-size: 0.95rem; }
    .dropzone p { margin: 0.3rem 0 0; font-size: 0.78rem; color: var(--text-secondary); }

    .file-chip {
      display: inline-block;
      margin-top: 0.65rem;
      padding: 0.25rem 0.65rem;
      border-radius: 999px;
      font-size: 0.76rem;
      font-weight: 600;
      background: rgba(6, 182, 212, 0.18);
      color: #67e8f9;
    }

    .demo-box {
      display: flex;
      flex-direction: column;
      gap: 0.45rem;
    }

    .demo-label {
      font-size: 0.76rem;
      color: var(--text-muted);
      font-weight: 600;
    }

    .demo-btns {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 0.45rem;
    }

    .demo-btn {
      padding: 0.48rem 0.4rem;
      border-radius: 10px;
      border: 1px solid var(--border-subtle);
      background: rgba(255, 255, 255, 0.04);
      color: var(--text-primary);
      font-size: 0.78rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.18s ease;
    }

    .demo-btn:hover:not(:disabled) {
      border-color: #22d3ee;
      background: rgba(6, 182, 212, 0.14);
    }

    .divider {
      border: none;
      border-top: 1px solid var(--border-subtle);
      margin: 0.1rem 0;
    }

    .control-group {
      display: flex;
      flex-direction: column;
      gap: 0.65rem;
    }

    .group-title {
      font-size: 0.82rem;
      font-weight: 700;
      color: var(--text-secondary);
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .mode-cards {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .mode-card {
      padding: 0.7rem 0.9rem;
      border-radius: 12px;
      border: 1px solid var(--border-subtle);
      background: rgba(255, 255, 255, 0.03);
      color: var(--text-primary);
      text-align: left;
      cursor: pointer;
      display: flex;
      flex-direction: column;
      gap: 0.15rem;
      transition: all 0.18s ease;
    }

    .mode-card strong { font-size: 0.88rem; }
    .mode-card span { font-size: 0.75rem; color: var(--text-secondary); }

    .mode-card.active {
      border-color: #22d3ee;
      background: rgba(6, 182, 212, 0.14);
      box-shadow: 0 0 0 1px rgba(6, 182, 212, 0.3);
    }

    .bg-type-pills {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 0.45rem;
    }

    .pill-btn {
      padding: 0.55rem 0.4rem;
      border-radius: 10px;
      border: 1px solid var(--border-subtle);
      background: rgba(255, 255, 255, 0.04);
      color: var(--text-secondary);
      font-size: 0.8rem;
      font-weight: 600;
      cursor: pointer;
    }

    .pill-btn.active {
      color: #fff;
      border-color: #8b5cf6;
      background: rgba(139, 92, 246, 0.22);
    }

    .color-picker-row {
      display: flex;
      align-items: center;
      gap: 0.65rem;
      margin-top: 0.25rem;
    }

    .color-input {
      width: 38px;
      height: 34px;
      border: none;
      background: none;
      cursor: pointer;
    }

    .color-presets {
      display: flex;
      gap: 0.4rem;
      flex-wrap: wrap;
    }

    .color-dot {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      border: 2px solid rgba(255, 255, 255, 0.2);
      cursor: pointer;
    }

    .color-dot.selected {
      border-color: #fff;
      transform: scale(1.15);
    }

    .slider-row {
      display: flex;
      flex-direction: column;
      gap: 0.3rem;
    }

    .slider-head {
      display: flex;
      justify-content: space-between;
      font-size: 0.8rem;
      color: var(--text-secondary);
    }

    .slider-row input[type='range'] {
      width: 100%;
      accent-color: #22d3ee;
    }

    .btn-process {
      width: 100%;
      padding: 0.95rem;
      border-radius: 14px;
      border: none;
      background: linear-gradient(135deg, #06b6d4 0%, #6366f1 50%, #ec4899 100%);
      color: #fff;
      font-weight: 700;
      font-size: 0.95rem;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.55rem;
      box-shadow: 0 10px 25px -6px rgba(6, 182, 212, 0.5);
    }

    .btn-process:disabled {
      opacity: 0.55;
      cursor: not-allowed;
    }

    /* PREVIEW COLUMN */
    .preview-col {
      padding: 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
      min-height: 540px;
    }

    .preview-toolbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 0.75rem;
    }

    .view-tabs {
      display: flex;
      gap: 0.4rem;
      background: rgba(0, 0, 0, 0.3);
      padding: 0.35rem;
      border-radius: 12px;
      border: 1px solid var(--border-subtle);
    }

    .view-tab {
      padding: 0.5rem 0.85rem;
      border-radius: 8px;
      border: none;
      background: transparent;
      color: var(--text-secondary);
      font-size: 0.82rem;
      font-weight: 600;
      cursor: pointer;
    }

    .view-tab.active {
      background: rgba(6, 182, 212, 0.2);
      color: #fff;
    }

    .meta-pills {
      display: flex;
      gap: 0.45rem;
      flex-wrap: wrap;
    }

    .meta-chip {
      padding: 0.25rem 0.65rem;
      border-radius: 999px;
      font-size: 0.75rem;
      font-family: var(--font-mono);
      background: rgba(255, 255, 255, 0.06);
      color: var(--text-secondary);
    }

    /* CHECKERBOARD TRANSPARENCY GRID */
    .checkerboard {
      background-color: #121621;
      background-image:
        linear-gradient(45deg, #1d2333 25%, transparent 25%),
        linear-gradient(-45deg, #1d2333 25%, transparent 25%),
        linear-gradient(45deg, transparent 75%, #1d2333 75%),
        linear-gradient(-45deg, transparent 75%, #1d2333 75%);
      background-size: 24px 24px;
      background-position: 0 0, 0 12px, 12px -12px, -12px 0;
    }

    .stage-container {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .compare-stage, .single-stage {
      position: relative;
      width: 100%;
      max-height: 460px;
      border-radius: 16px;
      overflow: hidden;
      border: 1px solid var(--border-subtle);
      display: grid;
      place-items: center;
    }

    .stage-img {
      display: block;
      max-width: 100%;
      max-height: 450px;
      object-fit: contain;
      user-select: none;
      pointer-events: none;
    }

    .original-overlay {
      position: absolute;
      inset: 0;
      display: grid;
      place-items: center;
      background: #0b0e17;
    }

    .slider-line {
      position: absolute;
      top: 0;
      bottom: 0;
      width: 2px;
      background: #22d3ee;
      box-shadow: 0 0 12px #22d3ee;
      pointer-events: none;
    }

    .slider-handle {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: #22d3ee;
      color: #06121c;
      font-weight: 800;
      display: grid;
      place-items: center;
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.5);
    }

    .corner-label {
      position: absolute;
      bottom: 0.75rem;
      padding: 0.25rem 0.65rem;
      border-radius: 6px;
      font-size: 0.72rem;
      font-weight: 700;
      background: rgba(0, 0, 0, 0.72);
      color: #fff;
      pointer-events: none;
    }

    .corner-label.left { left: 0.75rem; }
    .corner-label.right { right: 0.75rem; }

    .compare-range-overlay {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      opacity: 0;
      cursor: ew-resize;
      margin: 0;
    }

    .split-stage {
      width: 100%;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }

    .split-box {
      position: relative;
      border-radius: 14px;
      overflow: hidden;
      border: 1px solid var(--border-subtle);
      padding: 0.5rem;
      display: grid;
      place-items: center;
      background: #0b0e17;
    }

    .split-title {
      position: absolute;
      top: 0.6rem;
      left: 0.6rem;
      padding: 0.2rem 0.55rem;
      border-radius: 6px;
      font-size: 0.72rem;
      font-weight: 700;
      background: rgba(0, 0, 0, 0.7);
    }

    .result-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 1rem;
      padding-top: 1rem;
      border-top: 1px solid var(--border-subtle);
    }

    .saved-info {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 0.5rem;
      font-size: 0.82rem;
      color: var(--text-secondary);
    }

    .saved-info code {
      padding: 0.22rem 0.5rem;
      border-radius: 6px;
      background: rgba(0, 0, 0, 0.35);
      color: #e2e8f0;
      font-family: var(--font-mono);
      font-size: 0.76rem;
    }

    .size-pill {
      padding: 0.2rem 0.55rem;
      border-radius: 6px;
      background: rgba(6, 182, 212, 0.16);
      color: #67e8f9;
      font-weight: 600;
      font-size: 0.76rem;
    }

    .export-btns {
      display: flex;
      gap: 0.65rem;
    }

    .empty-stage {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      gap: 0.8rem;
      padding: 2rem;
    }

    .empty-orb {
      width: 68px;
      height: 68px;
      border-radius: 20px;
      background: rgba(6, 182, 212, 0.12);
      border: 1px solid rgba(6, 182, 212, 0.3);
      display: grid;
      place-items: center;
      font-size: 2.2rem;
    }

    .empty-stage h3 { margin: 0; font-size: 1.2rem; }
    .empty-stage p { margin: 0; color: var(--text-secondary); max-width: 48ch; font-size: 0.9rem; line-height: 1.55; }

    /* HISTORY */
    .history-panel {
      padding: 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .history-head {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .history-head h3 { margin: 0; font-size: 1.05rem; }
    .history-head span { font-family: var(--font-mono); font-size: 0.78rem; color: var(--text-muted); }

    .history-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
      gap: 0.85rem;
    }

    .hist-card {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.65rem;
      border-radius: 12px;
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid var(--border-subtle);
    }

    .hist-thumb {
      width: 54px;
      height: 54px;
      border-radius: 10px;
      overflow: hidden;
      flex-shrink: 0;
      display: grid;
      place-items: center;
    }

    .hist-thumb img {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }

    .hist-meta { flex: 1; min-width: 0; }
    .hist-name { font-size: 0.82rem; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .hist-sub { font-size: 0.74rem; color: var(--text-secondary); margin-top: 0.15rem; }
    .hist-actions { display: flex; gap: 0.35rem; }
    .btn-secondary.sm { padding: 0.4rem 0.6rem; font-size: 0.8rem; }

    .spinner {
      width: 16px;
      height: 16px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-top-color: #fff;
      border-radius: 50%;
      animation: spin 0.7s linear infinite;
    }

    @keyframes spin { to { transform: rotate(360deg); } }

    @media (max-width: 960px) {
      .workspace-grid { grid-template-columns: 1fr; }
      .split-stage { grid-template-columns: 1fr; }
    }
  `],
})
export class BgRemoverComponent implements OnInit {
  private readonly bgService = inject(BgRemoverService);

  readonly selectedFile = signal<File | null>(null);
  readonly activeSample = signal<string | null>(null);
  readonly isDragging = signal<boolean>(false);
  readonly processing = signal<boolean>(false);
  readonly errorMsg = signal<string>('');

  readonly mode = signal<'ai' | 'grabcut' | 'chroma'>('ai');
  readonly bgType = signal<'transparent' | 'color' | 'blur'>('transparent');
  readonly bgColor = signal<string>('#6366f1');
  readonly feather = signal<number>(1);
  readonly blurStrength = signal<number>(18);
  readonly threshold = signal<number>(30);

  readonly colorPresets = ['#ffffff', '#0f172a', '#6366f1', '#ec4899', '#10b981', '#f59e0b'];

  readonly viewMode = signal<'slider' | 'result' | 'split'>('slider');
  readonly sliderPos = signal<number>(50);
  readonly result = signal<BgRemoveResult | null>(null);
  readonly history = signal<BgHistoryItem[]>([]);

  readonly showPythonCode = signal<boolean>(false);
  readonly pythonSource = signal<string>('');
  readonly pythonPath = signal<string>('');
  readonly copiedCode = signal<boolean>(false);

  ngOnInit(): void {
    this.loadHistory();
  }

  loadHistory(): void {
    this.bgService.getHistory().subscribe({
      next: (res) => this.history.set(res.items),
      error: () => {},
    });
  }

  onDragOver(e: DragEvent): void {
    e.preventDefault();
    this.isDragging.set(true);
  }

  onDragLeave(e: DragEvent): void {
    e.preventDefault();
    this.isDragging.set(false);
  }

  onDrop(e: DragEvent): void {
    e.preventDefault();
    this.isDragging.set(false);
    const file = e.dataTransfer?.files?.[0];
    if (file && file.type.startsWith('image/')) {
      this.selectedFile.set(file);
      this.activeSample.set(null);
      this.processCurrent();
    }
  }

  onFileSelected(e: Event): void {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      this.selectedFile.set(file);
      this.activeSample.set(null);
      this.processCurrent();
    }
  }

  @HostListener('window:paste', ['$event'])
  onPaste(e: ClipboardEvent): void {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        const file = items[i].getAsFile();
        if (file) {
          this.selectedFile.set(file);
          this.activeSample.set(null);
          this.processCurrent();
          break;
        }
      }
    }
  }

  runSample(name: string): void {
    this.activeSample.set(name);
    this.selectedFile.set(null);
    this.processCurrent();
  }

  processCurrent(): void {
    const options: BgRemoveOptions = {
      mode: this.mode(),
      bgType: this.bgType(),
      bgColor: this.bgColor(),
      feather: this.feather(),
      blurStrength: this.blurStrength(),
      threshold: this.threshold(),
    };

    const file = this.selectedFile();
    const sample = this.activeSample();

    if (!file && !sample) return;

    this.processing.set(true);
    this.errorMsg.set('');

    const req$ = file
      ? this.bgService.removeBackground(file, options)
      : this.bgService.removeBackgroundSample(sample!, options);

    req$.subscribe({
      next: (res) => {
        this.result.set(res);
        this.processing.set(false);
        this.loadHistory();
      },
      error: (err) => {
        this.processing.set(false);
        this.errorMsg.set(
          err?.error?.error || 'Hintergrund-Entfernung fehlgeschlagen. Läuft das Python-Backend?'
        );
      },
    });
  }

  getDownloadUrl(id: string): string {
    return this.bgService.getDownloadUrl(id);
  }

  openOutputFolder(filepath?: string): void {
    this.bgService.openFolder(filepath).subscribe();
  }

  togglePythonCode(): void {
    const next = !this.showPythonCode();
    this.showPythonCode.set(next);
    if (next && !this.pythonSource()) {
      this.bgService.getPythonSource().subscribe({
        next: (res) => {
          this.pythonSource.set(res.source);
          this.pythonPath.set(res.path);
        },
        error: () => {
          this.pythonSource.set('# Datei liegt unter: backend/bg_remover.py');
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
