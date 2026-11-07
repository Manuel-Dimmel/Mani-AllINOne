import { Component, ElementRef, ViewChild, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

type MainTab = 'images' | 'audio' | 'data' | 'units' | 'encoding';

type ImageTargetFormat = 'png' | 'jpeg' | 'webp' | 'bmp' | 'ico' | 'svg' | 'base64' | 'pdf';
type ImageEffect = 'none' | 'grayscale' | 'sepia' | 'invert' | 'contrast';

interface ConvertedImageItem {
  id: string;
  name: string;
  originalSize: number;
  originalWidth: number;
  originalHeight: number;
  sourceDataUrl: string;
  convertedUrl: string;
  convertedBlob: Blob | null;
  convertedSize: number;
  targetFormat: ImageTargetFormat;
  outputWidth: number;
  outputHeight: number;
  base64String?: string;
  status: 'ready' | 'converting' | 'done' | 'error';
}

type AudioTargetFormat = 'wav16' | 'wav32' | 'json';

type DataSourceFormat = 'auto' | 'json' | 'csv' | 'tsv' | 'yaml' | 'xml';
type DataTargetFormat =
  | 'json-pretty'
  | 'json-min'
  | 'csv-comma'
  | 'csv-semi'
  | 'tsv'
  | 'yaml'
  | 'xml'
  | 'sql'
  | 'markdown'
  | 'html';

type UnitCategory =
  | 'length'
  | 'weight'
  | 'temperature'
  | 'speed'
  | 'area'
  | 'volume'
  | 'data'
  | 'cooking';

interface UnitDef {
  id: string;
  label: string;
  symbol: string;
  factorToBase: number; // for linear units: value * factorToBase = base unit
}

@Component({
  selector: 'app-universal-converter',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="tool-page">
      <div class="topbar">
        <a routerLink="/" class="back-btn">← Zurück zur Übersicht</a>
        <span class="crumb-pill">🔄 PROGRAMME • ALLES-KONVERTER</span>
      </div>

      <section class="tool-card glass-panel">
        <div class="tool-header">
          <div class="tool-icon">🔄</div>
          <div>
            <h1>Universal Converter Studio – Alles-Konverter</h1>
            <p>
              Bilder, Audio &amp; Video-Extraktion, Tabellen/Daten, Maßeinheiten, Farben, Zahlensysteme &amp;
              Morse/Binär – 100 % lokal im Browser.
            </p>
          </div>
        </div>

        <!-- MAIN TABS -->
        <div class="category-tabs">
          <button
            type="button"
            class="cat-tab"
            [class.active]="activeTab() === 'images'"
            (click)="activeTab.set('images')"
          >
            <span class="tab-emoji">🖼️</span>
            <span>Bilder &amp; PDF</span>
            <span class="tab-badge">Batch</span>
          </button>
          <button
            type="button"
            class="cat-tab"
            [class.active]="activeTab() === 'audio'"
            (click)="activeTab.set('audio')"
          >
            <span class="tab-emoji">🎵</span>
            <span>Audio &amp; Video→WAV</span>
            <span class="tab-badge">WebAudio</span>
          </button>
          <button
            type="button"
            class="cat-tab"
            [class.active]="activeTab() === 'data'"
            (click)="activeTab.set('data')"
          >
            <span class="tab-emoji">📊</span>
            <span>Daten &amp; Tabellen</span>
            <span class="tab-badge">10 Formate</span>
          </button>
          <button
            type="button"
            class="cat-tab"
            [class.active]="activeTab() === 'units'"
            (click)="activeTab.set('units')"
          >
            <span class="tab-emoji">📐</span>
            <span>Maßeinheiten &amp; Alltag</span>
            <span class="tab-badge">8 Rechner</span>
          </button>
          <button
            type="button"
            class="cat-tab"
            [class.active]="activeTab() === 'encoding'"
            (click)="activeTab.set('encoding')"
          >
            <span class="tab-emoji">🎨</span>
            <span>Farben, Zahlen &amp; Code</span>
            <span class="tab-badge">Morse/HEX</span>
          </button>
        </div>

        @if (statusBanner()) {
          <div class="status-banner" [class.error]="statusError()">
            <span>{{ statusBanner() }}</span>
            <button type="button" class="close-banner" (click)="statusBanner.set('')">✕</button>
          </div>
        }

        <!-- ==========================================
             TAB 1: BILDER-KONVERTER & KOMPRESSOR
             ========================================== -->
        @if (activeTab() === 'images') {
          <div class="tab-body">
            <div class="controls-grid">
              <div class="control-box">
                <label>Ziel-Format</label>
                <select [ngModel]="imgTargetFormat()" (ngModelChange)="onImgFormatChange($event)">
                  <option value="webp">WebP (Beste Kompression)</option>
                  <option value="png">PNG (Verlustfrei + Transparenz)</option>
                  <option value="jpeg">JPEG / JPG (Foto-Standard)</option>
                  <option value="bmp">BMP (Unkomprimiertes Bitmap)</option>
                  <option value="ico">ICO (64×64 Browser-Favicon)</option>
                  <option value="svg">SVG (Eingebettetes Vektor-SVG)</option>
                  <option value="pdf">PDF (Einzel- oder Sammel-PDF)</option>
                  <option value="base64">Base64 Data-URL (Für HTML/CSS)</option>
                </select>
              </div>

              <div class="control-box">
                <label>Qualität ({{ imgQuality() }}%)</label>
                <input
                  type="range"
                  min="10"
                  max="100"
                  step="5"
                  [ngModel]="imgQuality()"
                  (ngModelChange)="imgQuality.set(+$event); convertAllImages()"
                />
                <div class="range-hints">
                  <span>Kleinere Datei (10%)</span>
                  <span>Maximum (100%)</span>
                </div>
              </div>

              <div class="control-box">
                <label>Skalierung / Größe</label>
                <div class="inline-row">
                  <select [ngModel]="imgScaleMode()" (ngModelChange)="imgScaleMode.set($event); convertAllImages()">
                    <option value="100">100% (Originalgröße)</option>
                    <option value="75">75% Skalierung</option>
                    <option value="50">50% Skalierung</option>
                    <option value="25">25% Skalierung</option>
                    <option value="custom">Max. Breite (px)</option>
                  </select>
                  @if (imgScaleMode() === 'custom') {
                    <input
                      type="number"
                      min="16"
                      max="8000"
                      class="num-input-sm"
                      [ngModel]="imgCustomMaxWidth()"
                      (ngModelChange)="imgCustomMaxWidth.set(+$event || 800); convertAllImages()"
                      placeholder="Max px"
                    />
                  }
                </div>
              </div>

              <div class="control-box">
                <label>Bild-Filter / Effekt</label>
                <select [ngModel]="imgEffect()" (ngModelChange)="imgEffect.set($event); convertAllImages()">
                  <option value="none">Original (Kein Filter)</option>
                  <option value="grayscale">Graustufen (Schwarz-Weiß)</option>
                  <option value="sepia">Sepia (Retro-Look)</option>
                  <option value="invert">Invertiert (Negativ)</option>
                  <option value="contrast">Kontrast +20% &amp; Schärfe</option>
                </select>
              </div>
            </div>

            <!-- Upload Zone + Demo Generator -->
            <div
              class="dropzone"
              [class.dragging]="isDraggingImages()"
              (dragover)="onImgDragOver($event)"
              (dragleave)="isDraggingImages.set(false)"
              (drop)="onImgDrop($event)"
              (click)="imgFileInput.click()"
            >
              <input
                #imgFileInput
                type="file"
                accept="image/*,.svg,.avif,.bmp,.ico"
                multiple
                hidden
                (change)="onImgFileSelect($event)"
              />
              <div class="drop-icon">🖼️</div>
              <div class="drop-title">
                Bilder hierher ziehen oder klicken zum Auswählen (Batch-Upload möglich)
              </div>
              <div class="drop-sub">
                Unterstützt: PNG, JPG/JPEG, WebP, BMP, GIF, SVG, AVIF → Konvertiert sofort im Browser
              </div>
            </div>

            <div class="action-bar">
              <button type="button" class="btn-secondary" (click)="generateDemoImages()">
                ✨ 3 Demo-Bilder zum Sofort-Testen generieren
              </button>
              @if (images().length > 0) {
                <button type="button" class="btn-primary" (click)="convertAllImages()">
                  ⚡ Alle neu konvertieren ({{ images().length }})
                </button>
                <button type="button" class="btn-secondary" (click)="downloadAllImagesAsPdf()">
                  📑 Sammel-PDF aus allen Bildern herunterladen
                </button>
                <button type="button" class="btn-secondary" (click)="clearImages()">
                  🗑️ Liste leeren
                </button>
              }
            </div>

            @if (images().length > 0) {
              <div class="img-results-list">
                @for (item of images(); track item.id) {
                  <div class="img-result-card">
                    <div class="img-thumb-wrap">
                      <img [src]="item.convertedUrl || item.sourceDataUrl" [alt]="item.name" />
                    </div>
                    <div class="img-meta">
                      <div class="img-title-row">
                        <strong>{{ item.name }}</strong>
                        <span class="format-pill">→ {{ item.targetFormat.toUpperCase() }}</span>
                      </div>
                      <div class="img-dims">
                        Original: {{ item.originalWidth }}×{{ item.originalHeight }} px ({{ formatBytes(item.originalSize) }})
                        • Neu: {{ item.outputWidth }}×{{ item.outputHeight }} px ({{ formatBytes(item.convertedSize) }})
                      </div>
                      <div class="img-badges">
                        @if (getSavingsPercent(item) > 0) {
                          <span class="save-badge positive">
                            -{{ getSavingsPercent(item) }}% kleiner eingespart
                          </span>
                        } @else {
                          <span class="save-badge neutral">
                            {{ formatBytes(item.convertedSize) }} Ausgangsgröße
                          </span>
                        }
                      </div>
                      @if (item.targetFormat === 'base64' && item.base64String) {
                        <div class="base64-inline">
                          <input type="text" readonly [value]="item.base64String" />
                          <button type="button" class="btn-secondary btn-xs" (click)="copyText(item.base64String!)">
                            📋 Base64 kopieren
                          </button>
                        </div>
                      }
                    </div>
                    <div class="img-actions">
                      <button type="button" class="btn-primary btn-sm" (click)="downloadConvertedImage(item)">
                        ⬇️ Download .{{ getImageExtension(item.targetFormat) }}
                      </button>
                    </div>
                  </div>
                }
              </div>
            }
          </div>
        }

        <!-- ==========================================
             TAB 2: AUDIO- & VIDEO-ZU-AUDIO KONVERTER
             ========================================== -->
        @if (activeTab() === 'audio') {
          <div class="tab-body">
            <div
              class="dropzone compact"
              (dragover)="$event.preventDefault()"
              (drop)="onAudioDrop($event)"
              (click)="audioFileInput.click()"
            >
              <input
                #audioFileInput
                type="file"
                accept="audio/*,video/*,.mp3,.wav,.m4a,.ogg,.aac,.flac,.mp4,.mov,.webm"
                hidden
                (change)="onAudioFileSelect($event)"
              />
              <div class="drop-icon">🎵</div>
              <div class="drop-title">
                Audio- oder Videodatei auswählen (extrahiert auch die Tonspur aus MP4/MOV/WebM!)
              </div>
              <div class="drop-sub">
                Unterstützt: MP3, WAV, M4A, OGG, AAC, FLAC, MP4, MOV, WebM
              </div>
            </div>

            <div class="action-bar">
              <button type="button" class="btn-secondary" (click)="generateSynthDemoAudio()">
                🎹 Synthesizer Demo-Track generieren (Sofort-Test)
              </button>
              @if (audioBuffer()) {
                <button type="button" class="btn-primary" (click)="processAndExportAudio()">
                  ⚡ Audio konvertieren &amp; Vorschau aktualisieren
                </button>
                @if (audioOutputUrl()) {
                  <button type="button" class="btn-primary" (click)="downloadConvertedAudio()">
                    ⬇️ Konvertierte Datei herunterladen ({{ formatBytes(audioOutputSize()) }})
                  </button>
                }
              }
            </div>

            @if (audioBuffer()) {
              <div class="audio-studio-card">
                <div class="audio-info-row">
                  <div>
                    <strong>📂 Quelle: {{ audioSourceName() }}</strong>
                    <span class="audio-meta-text">
                      • Dauer: {{ audioDuration().toFixed(2) }}s • Original: {{ audioOriginalSampleRate() }} Hz ({{ audioOriginalChannels() }} Ch)
                    </span>
                  </div>
                  @if (audioOutputSize() > 0) {
                    <span class="format-pill">Ausgabe: {{ formatBytes(audioOutputSize()) }}</span>
                  }
                </div>

                <!-- Waveform Canvas -->
                <div class="waveform-wrap">
                  <canvas #waveformCanvas width="860" height="140"></canvas>
                </div>

                <div class="controls-grid">
                  <div class="control-box">
                    <label>Ziel-Format</label>
                    <select [ngModel]="audioTargetFormat()" (ngModelChange)="audioTargetFormat.set($event); processAndExportAudio()">
                      <option value="wav16">WAV (16-Bit PCM Standard)</option>
                      <option value="wav32">WAV (32-Bit Float Studio-Qualität)</option>
                      <option value="json">JSON Waveform-Peaks (Für Web-Visualisierer)</option>
                    </select>
                  </div>

                  <div class="control-box">
                    <label>Kanäle</label>
                    <select [ngModel]="audioChannels()" (ngModelChange)="audioChannels.set(+$event); processAndExportAudio()">
                      <option [ngValue]="2">Stereo (2 Kanäle)</option>
                      <option [ngValue]="1">Mono (1 Kanal Mixdown – 50% kleiner)</option>
                    </select>
                  </div>

                  <div class="control-box">
                    <label>Sample-Rate</label>
                    <select [ngModel]="audioSampleRate()" (ngModelChange)="audioSampleRate.set(+$event); processAndExportAudio()">
                      <option [ngValue]="48000">48.000 Hz (Video/Studio)</option>
                      <option [ngValue]="44100">44.100 Hz (CD-Qualität)</option>
                      <option [ngValue]="22050">22.050 Hz (Kompakt-Audio)</option>
                      <option [ngValue]="16000">16.000 Hz (Sprache / KI / Whisper)</option>
                    </select>
                  </div>

                  <div class="control-box">
                    <label>Geschwindigkeit / Pitch ({{ audioSpeed() }}x)</label>
                    <input
                      type="range"
                      min="0.5"
                      max="2.0"
                      step="0.1"
                      [ngModel]="audioSpeed()"
                      (ngModelChange)="audioSpeed.set(+$event); processAndExportAudio()"
                    />
                  </div>

                  <div class="control-box">
                    <label>Trimming Start (Sekunden)</label>
                    <input
                      type="number"
                      min="0"
                      [max]="audioTrimEnd()"
                      step="0.1"
                      [ngModel]="audioTrimStart()"
                      (ngModelChange)="audioTrimStart.set(+$event || 0); processAndExportAudio()"
                    />
                  </div>

                  <div class="control-box">
                    <label>Trimming Ende (Sekunden)</label>
                    <input
                      type="number"
                      [min]="audioTrimStart()"
                      [max]="audioDuration()"
                      step="0.1"
                      [ngModel]="audioTrimEnd()"
                      (ngModelChange)="audioTrimEnd.set(+$event || audioDuration()); processAndExportAudio()"
                    />
                  </div>

                  <div class="control-box">
                    <label>Lautstärke ({{ audioGainPercent() }}%)</label>
                    <input
                      type="range"
                      min="20"
                      max="200"
                      step="5"
                      [ngModel]="audioGainPercent()"
                      (ngModelChange)="audioGainPercent.set(+$event); processAndExportAudio()"
                    />
                  </div>

                  <div class="control-box checkbox-box">
                    <label>Peak-Normalisierung</label>
                    <label class="toggle-row">
                      <input
                        type="checkbox"
                        [ngModel]="audioNormalize()"
                        (ngModelChange)="audioNormalize.set($event); processAndExportAudio()"
                      />
                      <span>Automatisch auf 0 dB normalisieren</span>
                    </label>
                  </div>
                </div>

                @if (audioOutputUrl() && audioTargetFormat() !== 'json') {
                  <div class="audio-player-bar">
                    <span>🎧 Vorschau (Konvertiertes Ergebnis):</span>
                    <audio [src]="audioOutputUrl()" controls></audio>
                  </div>
                }

                @if (audioTargetFormat() === 'json' && audioJsonPreview()) {
                  <div class="editor-col">
                    <label>JSON Waveform-Daten</label>
                    <textarea rows="5" readonly [value]="audioJsonPreview()"></textarea>
                  </div>
                }
              </div>
            }
          </div>
        }

        <!-- ==========================================
             TAB 3: DATEN- & TABELLEN-KONVERTER
             ========================================== -->
        @if (activeTab() === 'data') {
          <div class="tab-body">
            <div class="controls-grid">
              <div class="control-box">
                <label>Quell-Format</label>
                <select [ngModel]="dataSourceFormat()" (ngModelChange)="dataSourceFormat.set($event); convertData()">
                  <option value="auto">✨ Automatisch erkennen ({{ detectedDataFormat().toUpperCase() }})</option>
                  <option value="json">JSON</option>
                  <option value="csv">CSV (Komma oder Semikolon)</option>
                  <option value="tsv">TSV (Tab-getrennt)</option>
                  <option value="yaml">YAML</option>
                  <option value="xml">XML</option>
                </select>
              </div>

              <div class="control-box">
                <label>Ziel-Format</label>
                <select [ngModel]="dataTargetFormat()" (ngModelChange)="dataTargetFormat.set($event); convertData()">
                  <option value="json-pretty">JSON (Pretty / Formatiert)</option>
                  <option value="json-min">JSON (Minified / Einzeilig)</option>
                  <option value="csv-comma">CSV (Komma-getrennt)</option>
                  <option value="csv-semi">CSV (Semikolon für deutsches Excel)</option>
                  <option value="tsv">TSV (Tabulator-getrennt)</option>
                  <option value="yaml">YAML</option>
                  <option value="xml">XML Dokument</option>
                  <option value="sql">SQL INSERT Statements</option>
                  <option value="markdown">Markdown-Tabelle</option>
                  <option value="html">HTML-Tabelle (&lt;table&gt;)</option>
                </select>
              </div>

              @if (dataTargetFormat() === 'sql') {
                <div class="control-box">
                  <label>SQL Tabellenname</label>
                  <input
                    type="text"
                    [ngModel]="sqlTableName()"
                    (ngModelChange)="sqlTableName.set($event); convertData()"
                    placeholder="users_table"
                  />
                </div>
              }

              <div class="control-box">
                <label>Datei importieren</label>
                <button type="button" class="btn-secondary full-w" (click)="dataFileInput.click()">
                  📂 Datei laden (.json, .csv, .yaml, .xml)
                </button>
                <input
                  #dataFileInput
                  type="file"
                  accept=".json,.csv,.tsv,.yaml,.yml,.xml,.txt"
                  hidden
                  (change)="onDataFileUpload($event)"
                />
              </div>
            </div>

            <div class="action-bar">
              <button type="button" class="btn-secondary" (click)="loadDataExample('products')">
                📦 Beispiel: E-Commerce Produkte (JSON)
              </button>
              <button type="button" class="btn-secondary" (click)="loadDataExample('csv')">
                📊 Beispiel: Mitarbeiter-Liste (CSV)
              </button>
              <button type="button" class="btn-secondary" (click)="loadDataExample('yaml')">
                ⚙️ Beispiel: Server-Konfiguration (YAML)
              </button>
              <button type="button" class="btn-primary" (click)="copyText(dataOutput())">
                📋 Ergebnis kopieren
              </button>
              <button type="button" class="btn-primary" (click)="downloadDataOutput()">
                ⬇️ Als .{{ getDataFileExtension() }} speichern
              </button>
            </div>

            <div class="editor-grid">
              <div class="editor-col">
                <label>Eingabe ({{ dataRecordCount() }} Datensätze erkannt)</label>
                <textarea
                  rows="15"
                  [ngModel]="dataInput()"
                  (ngModelChange)="dataInput.set($event); convertData()"
                  placeholder="JSON, CSV, TSV, YAML oder XML hier einfügen..."
                ></textarea>
              </div>
              <div class="editor-col">
                <label>Konvertierte Ausgabe ({{ dataTargetFormat().toUpperCase() }})</label>
                <textarea
                  rows="15"
                  readonly
                  [ngModel]="dataOutput()"
                  placeholder="Ergebnis erscheint sofort hier..."
                ></textarea>
              </div>
            </div>
          </div>
        }

        <!-- ==========================================
             TAB 4: MASSEINHEITEN & ALLTAGS-KONVERTER
             ========================================== -->
        @if (activeTab() === 'units') {
          <div class="tab-body">
            <div class="sub-pills">
              <button
                type="button"
                class="sub-pill"
                [class.active]="unitCategory() === 'length'"
                (click)="setUnitCategory('length')"
              >
                📏 Länge
              </button>
              <button
                type="button"
                class="sub-pill"
                [class.active]="unitCategory() === 'weight'"
                (click)="setUnitCategory('weight')"
              >
                ⚖️ Gewicht
              </button>
              <button
                type="button"
                class="sub-pill"
                [class.active]="unitCategory() === 'temperature'"
                (click)="setUnitCategory('temperature')"
              >
                🌡️ Temperatur
              </button>
              <button
                type="button"
                class="sub-pill"
                [class.active]="unitCategory() === 'speed'"
                (click)="setUnitCategory('speed')"
              >
                🚀 Geschwindigkeit
              </button>
              <button
                type="button"
                class="sub-pill"
                [class.active]="unitCategory() === 'area'"
                (click)="setUnitCategory('area')"
              >
                🟩 Fläche
              </button>
              <button
                type="button"
                class="sub-pill"
                [class.active]="unitCategory() === 'volume'"
                (click)="setUnitCategory('volume')"
              >
                🧪 Volumen
              </button>
              <button
                type="button"
                class="sub-pill"
                [class.active]="unitCategory() === 'data'"
                (click)="setUnitCategory('data')"
              >
                💾 Datenspeicher &amp; Speed
              </button>
              <button
                type="button"
                class="sub-pill"
                [class.active]="unitCategory() === 'cooking'"
                (click)="setUnitCategory('cooking')"
              >
                🍳 Kochen &amp; Backen
              </button>
            </div>

            <div class="unit-converter-hero">
              <div class="control-box">
                <label>Wert eingeben</label>
                <input
                  type="number"
                  step="any"
                  class="big-num-input"
                  [ngModel]="unitInputValue()"
                  (ngModelChange)="unitInputValue.set(+$event || 0)"
                />
              </div>

              <div class="control-box">
                <label>Ausgangs-Einheit</label>
                <select [ngModel]="unitFromId()" (ngModelChange)="unitFromId.set($event)">
                  @for (u of currentUnitDefs(); track u.id) {
                    <option [value]="u.id">{{ u.label }} ({{ u.symbol }})</option>
                  }
                </select>
              </div>

              @if (unitCategory() === 'cooking') {
                <div class="control-box">
                  <label>Zutat (für Gramm ↔ Volumen)</label>
                  <select [ngModel]="cookingDensity()" (ngModelChange)="cookingDensity.set(+$event)">
                    <option [ngValue]="1.0">Wasser / Milch / Flüssiges (1.0 g/ml)</option>
                    <option [ngValue]="0.55">Weizenmehl (0.55 g/ml)</option>
                    <option [ngValue]="0.85">Zucker / Feinkristall (0.85 g/ml)</option>
                    <option [ngValue]="0.91">Butter / Öl (0.91 g/ml)</option>
                    <option [ngValue]="0.4">Haferflocken / Kakao (0.40 g/ml)</option>
                  </select>
                </div>
              }

              @if (unitCategory() === 'data') {
                <div class="control-box">
                  <label>Internet-Bandbreite (Mbit/s)</label>
                  <input
                    type="number"
                    min="1"
                    step="10"
                    [ngModel]="downloadBandwidthMbps()"
                    (ngModelChange)="downloadBandwidthMbps.set(+$event || 100)"
                  />
                </div>
              }
            </div>

            <!-- Grid of all converted units simultaneously -->
            <div class="units-result-grid">
              @for (item of computedUnitResults(); track item.id) {
                <div
                  class="unit-result-card"
                  [class.highlight]="item.id === unitFromId()"
                  (click)="copyText(item.formatted + ' ' + item.symbol)"
                  title="Klicken zum Kopieren"
                >
                  <div class="unit-card-label">{{ item.label }}</div>
                  <div class="unit-card-val">
                    {{ item.formatted }} <span class="unit-sym">{{ item.symbol }}</span>
                  </div>
                </div>
              }
            </div>

            @if (unitCategory() === 'data') {
              <div class="download-time-banner">
                <span>⚡ Geschätzte Übertragungszeit bei <strong>{{ downloadBandwidthMbps() }} Mbit/s</strong>:</span>
                <strong>{{ computedDownloadTime() }}</strong>
              </div>
            }
          </div>
        }

        <!-- ==========================================
             TAB 5: FARBEN, ZAHLENSYSTEME & TEXT-CODE
             ========================================== -->
        @if (activeTab() === 'encoding') {
          <div class="tab-body">
            <div class="triple-section-grid">
              <!-- SECTION A: FARBEN-KONVERTER -->
              <div class="sub-panel">
                <div class="sub-panel-header">
                  <h3>🎨 Farben-Konverter &amp; Kontrast</h3>
                  <input
                    type="color"
                    class="color-picker-native"
                    [ngModel]="colorHex()"
                    (ngModelChange)="updateFromHex($event)"
                  />
                </div>

                <div class="color-preview-swatch" [style.background]="colorHex()">
                  <span class="swatch-tag light" [style.color]="'#ffffff'">
                    Weiß-Kontrast: {{ colorContrastWhite() }}:1 ({{ colorContrastWhite() >= 4.5 ? 'AA ✓' : 'Niedrig' }})
                  </span>
                  <span class="swatch-tag dark" [style.color]="'#07090e'">
                    Schwarz-Kontrast: {{ colorContrastBlack() }}:1 ({{ colorContrastBlack() >= 4.5 ? 'AA ✓' : 'Niedrig' }})
                  </span>
                </div>

                <div class="kv-list">
                  <div class="kv-row">
                    <label>HEX</label>
                    <div class="kv-input-wrap">
                      <input type="text" [ngModel]="colorHex()" (ngModelChange)="updateFromHex($event)" />
                      <button type="button" class="btn-secondary btn-xs" (click)="copyText(colorHex())">📋</button>
                    </div>
                  </div>
                  <div class="kv-row">
                    <label>RGB</label>
                    <div class="kv-input-wrap">
                      <input type="text" [ngModel]="colorRgbString()" (ngModelChange)="updateFromRgbString($event)" />
                      <button type="button" class="btn-secondary btn-xs" (click)="copyText(colorRgbString())">📋</button>
                    </div>
                  </div>
                  <div class="kv-row">
                    <label>HSL</label>
                    <div class="kv-input-wrap">
                      <input type="text" readonly [value]="colorHslString()" />
                      <button type="button" class="btn-secondary btn-xs" (click)="copyText(colorHslString())">📋</button>
                    </div>
                  </div>
                  <div class="kv-row">
                    <label>CMYK</label>
                    <div class="kv-input-wrap">
                      <input type="text" readonly [value]="colorCmykString()" />
                      <button type="button" class="btn-secondary btn-xs" (click)="copyText(colorCmykString())">📋</button>
                    </div>
                  </div>
                  <div class="kv-row">
                    <label>CSS Filter</label>
                    <div class="kv-input-wrap">
                      <input type="text" readonly [value]="colorCssFilter()" />
                      <button type="button" class="btn-secondary btn-xs" (click)="copyText(colorCssFilter())">📋</button>
                    </div>
                  </div>
                </div>
              </div>

              <!-- SECTION B: ZAHLENSYSTEME & RÖMISCHE ZAHLEN -->
              <div class="sub-panel">
                <div class="sub-panel-header">
                  <h3>🔢 Zahlensysteme &amp; Römisch</h3>
                  <span class="format-pill">Echtzeit-Sync</span>
                </div>

                <div class="kv-list">
                  <div class="kv-row">
                    <label>Dezimal (Base 10)</label>
                    <div class="kv-input-wrap">
                      <input type="text" [ngModel]="numDec()" (ngModelChange)="updateFromBase($event, 10)" />
                      <button type="button" class="btn-secondary btn-xs" (click)="copyText(numDec())">📋</button>
                    </div>
                  </div>
                  <div class="kv-row">
                    <label>Binär (Base 2)</label>
                    <div class="kv-input-wrap">
                      <input type="text" [ngModel]="numBin()" (ngModelChange)="updateFromBase($event, 2)" />
                      <button type="button" class="btn-secondary btn-xs" (click)="copyText(numBin())">📋</button>
                    </div>
                  </div>
                  <div class="kv-row">
                    <label>Oktal (Base 8)</label>
                    <div class="kv-input-wrap">
                      <input type="text" [ngModel]="numOct()" (ngModelChange)="updateFromBase($event, 8)" />
                      <button type="button" class="btn-secondary btn-xs" (click)="copyText(numOct())">📋</button>
                    </div>
                  </div>
                  <div class="kv-row">
                    <label>Hexadezimal (Base 16)</label>
                    <div class="kv-input-wrap">
                      <input type="text" [ngModel]="numHex()" (ngModelChange)="updateFromBase($event, 16)" />
                      <button type="button" class="btn-secondary btn-xs" (click)="copyText(numHex())">📋</button>
                    </div>
                  </div>
                  <div class="kv-row">
                    <label>Römische Zahl (I–M)</label>
                    <div class="kv-input-wrap">
                      <input type="text" [ngModel]="numRoman()" (ngModelChange)="updateFromRoman($event)" />
                      <button type="button" class="btn-secondary btn-xs" (click)="copyText(numRoman())">📋</button>
                    </div>
                  </div>
                </div>
              </div>

              <!-- SECTION C: TEXT, MORSECODE, BINÄR & CAESAR -->
              <div class="sub-panel full-span">
                <div class="sub-panel-header">
                  <h3>📡 Text ↔ Morsecode (mit Audio-Piepton!), Binärcode, ASCII &amp; ROT13</h3>
                  <div class="inline-row">
                    <button type="button" class="btn-primary btn-sm" (click)="playMorseAudio()">
                      🔊 Morsecode als Audio-Piepton abspielen
                    </button>
                  </div>
                </div>

                <div class="text-code-grid">
                  <div class="editor-col">
                    <label>Klartext (Normaler Text)</label>
                    <textarea
                      rows="3"
                      [ngModel]="plainText()"
                      (ngModelChange)="updateFromPlainText($event)"
                      placeholder="Text eingeben..."
                    ></textarea>
                  </div>

                  <div class="editor-col">
                    <label>Morsecode (••• --- •••)</label>
                    <textarea
                      rows="3"
                      [ngModel]="morseText()"
                      (ngModelChange)="updateFromMorse($event)"
                      placeholder="... --- ..."
                    ></textarea>
                  </div>

                  <div class="editor-col">
                    <label>8-Bit Binärcode (01001000...)</label>
                    <textarea
                      rows="3"
                      [ngModel]="binaryText()"
                      (ngModelChange)="updateFromBinaryText($event)"
                      placeholder="01010011 01001111 01010011"
                    ></textarea>
                  </div>

                  <div class="editor-col">
                    <label>ASCII Dezimal-Codes &amp; ROT13 Chiffre</label>
                    <textarea
                      rows="3"
                      readonly
                      [value]="'ASCII: ' + asciiText() + '\nROT13: ' + rot13Text()"
                    ></textarea>
                  </div>
                </div>
              </div>
            </div>
          </div>
        }
      </section>
    </div>
  `,
  styles: [`
    .tool-page { display: flex; flex-direction: column; gap: 1.5rem; padding-bottom: 3rem; }
    .topbar { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.75rem; }
    .back-btn { padding: 0.55rem 1rem; border-radius: 12px; background: rgba(255,255,255,0.05); border: 1px solid var(--border-subtle); color: var(--text-secondary); font-weight: 600; font-size: 0.88rem; }
    .crumb-pill { font-size: 0.78rem; font-weight: 700; color: #93c5fd; background: rgba(59,130,246,0.16); padding: 0.35rem 0.8rem; border-radius: 999px; }

    .tool-card { padding: 2rem; display: flex; flex-direction: column; gap: 1.4rem; }
    .tool-header { display: flex; align-items: center; gap: 1.2rem; }
    .tool-icon { width: 58px; height: 58px; border-radius: 16px; background: linear-gradient(135deg, #3b82f6, #8b5cf6, #ec4899); display: grid; place-items: center; font-size: 1.8rem; flex-shrink: 0; }
    .tool-header h1 { margin: 0; font-family: var(--font-display); font-size: 1.75rem; }
    .tool-header p { margin: 0.25rem 0 0; color: var(--text-secondary); font-size: 0.94rem; }

    /* Category Tabs */
    .category-tabs { display: grid; grid-template-columns: repeat(5, 1fr); gap: 0.65rem; }
    .cat-tab {
      display: flex; align-items: center; justify-content: center; gap: 0.55rem;
      padding: 0.85rem 0.9rem; border-radius: 14px;
      background: rgba(255,255,255,0.04); border: 1px solid var(--border-subtle);
      color: var(--text-secondary); font-weight: 600; font-size: 0.88rem;
      cursor: pointer; transition: all 0.2s ease;
    }
    .cat-tab:hover { background: rgba(255,255,255,0.08); color: var(--text-primary); }
    .cat-tab.active {
      background: linear-gradient(135deg, rgba(99,102,241,0.28), rgba(139,92,246,0.22));
      border-color: #8b5cf6; color: #ffffff;
      box-shadow: 0 6px 20px -6px rgba(139,92,246,0.45);
    }
    .tab-emoji { font-size: 1.15rem; }
    .tab-badge {
      font-size: 0.68rem; padding: 0.15rem 0.45rem; border-radius: 999px;
      background: rgba(255,255,255,0.1); color: #cbd5e1; font-weight: 700;
    }

    .status-banner {
      display: flex; justify-content: space-between; align-items: center;
      padding: 0.75rem 1rem; border-radius: 12px;
      background: rgba(16,185,129,0.15); border: 1px solid rgba(16,185,129,0.35);
      color: #6ee7b7; font-size: 0.88rem;
    }
    .status-banner.error { background: rgba(239,68,68,0.15); border-color: rgba(239,68,68,0.4); color: #fca5a5; }
    .close-banner { background: transparent; border: none; color: inherit; cursor: pointer; font-size: 1rem; }

    .tab-body { display: flex; flex-direction: column; gap: 1.25rem; }

    .controls-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 1rem; }
    .control-box {
      display: flex; flex-direction: column; gap: 0.45rem;
      padding: 0.9rem 1rem; border-radius: 14px;
      background: rgba(5,7,11,0.55); border: 1px solid var(--border-subtle);
    }
    .control-box label { font-size: 0.8rem; font-weight: 600; color: var(--text-secondary); }
    select, input[type="text"], input[type="number"] {
      width: 100%; padding: 0.6rem 0.8rem; border-radius: 10px;
      background: rgba(15,20,32,0.9); border: 1px solid var(--border-subtle);
      color: var(--text-primary); font-size: 0.88rem; outline: none;
    }
    select:focus, input[type="text"]:focus, input[type="number"]:focus, textarea:focus {
      border-color: #6366f1;
    }
    input[type="range"] { width: 100%; accent-color: #8b5cf6; cursor: pointer; }
    .range-hints { display: flex; justify-content: space-between; font-size: 0.72rem; color: var(--text-muted); }
    .inline-row { display: flex; align-items: center; gap: 0.5rem; }
    .num-input-sm { max-width: 95px; }
    .full-w { width: 100%; }

    /* Dropzone */
    .dropzone {
      border: 2px dashed rgba(139,92,246,0.45); border-radius: 16px;
      padding: 2rem 1.5rem; text-align: center; cursor: pointer;
      background: rgba(99,102,241,0.06); transition: all 0.2s ease;
    }
    .dropzone.compact { padding: 1.35rem 1.2rem; }
    .dropzone:hover, .dropzone.dragging {
      border-color: #ec4899; background: rgba(139,92,246,0.14);
    }
    .drop-icon { font-size: 2.2rem; margin-bottom: 0.4rem; }
    .drop-title { font-weight: 700; font-size: 1rem; color: var(--text-primary); }
    .drop-sub { font-size: 0.82rem; color: var(--text-secondary); margin-top: 0.25rem; }

    .action-bar { display: flex; flex-wrap: wrap; gap: 0.65rem; align-items: center; }
    .btn-sm { padding: 0.5rem 0.9rem; font-size: 0.84rem; }
    .btn-xs { padding: 0.35rem 0.65rem; font-size: 0.78rem; }

    /* Image Results */
    .img-results-list { display: flex; flex-direction: column; gap: 0.85rem; }
    .img-result-card {
      display: grid; grid-template-columns: 88px 1fr auto; gap: 1rem; align-items: center;
      padding: 0.9rem 1.1rem; border-radius: 14px;
      background: rgba(5,7,11,0.65); border: 1px solid var(--border-subtle);
    }
    .img-thumb-wrap {
      width: 88px; height: 68px; border-radius: 10px; overflow: hidden;
      background: repeating-conic-gradient(#1e293b 0% 25%, #0f172a 0% 50%) 50% / 14px 14px;
      display: grid; place-items: center;
    }
    .img-thumb-wrap img { max-width: 100%; max-height: 100%; object-fit: contain; }
    .img-meta { display: flex; flex-direction: column; gap: 0.3rem; min-width: 0; }
    .img-title-row { display: flex; align-items: center; gap: 0.6rem; flex-wrap: wrap; }
    .format-pill {
      font-size: 0.74rem; font-weight: 700; padding: 0.2rem 0.55rem; border-radius: 999px;
      background: rgba(99,102,241,0.2); color: #a5b4fc;
    }
    .img-dims { font-size: 0.82rem; color: var(--text-secondary); }
    .save-badge {
      display: inline-block; font-size: 0.75rem; font-weight: 700;
      padding: 0.2rem 0.55rem; border-radius: 6px;
    }
    .save-badge.positive { background: rgba(16,185,129,0.18); color: #6ee7b7; }
    .save-badge.neutral { background: rgba(148,163,184,0.15); color: #cbd5e1; }
    .base64-inline { display: flex; gap: 0.45rem; margin-top: 0.3rem; }
    .base64-inline input { font-family: var(--font-mono); font-size: 0.75rem; }

    /* Audio Studio */
    .audio-studio-card {
      display: flex; flex-direction: column; gap: 1.1rem;
      padding: 1.25rem; border-radius: 16px;
      background: rgba(5,7,11,0.6); border: 1px solid var(--border-subtle);
    }
    .audio-info-row { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem; }
    .audio-meta-text { font-size: 0.85rem; color: var(--text-secondary); }
    .waveform-wrap {
      width: 100%; border-radius: 12px; overflow: hidden;
      background: #05070b; border: 1px solid var(--border-subtle);
    }
    .waveform-wrap canvas { width: 100%; height: 130px; display: block; }
    .checkbox-box { justify-content: center; }
    .toggle-row { display: flex; align-items: center; gap: 0.5rem; cursor: pointer; font-size: 0.85rem; color: var(--text-primary); }
    .audio-player-bar {
      display: flex; align-items: center; justify-content: space-between; gap: 1rem; flex-wrap: wrap;
      padding: 0.75rem 1rem; border-radius: 12px; background: rgba(99,102,241,0.12);
    }
    .audio-player-bar audio { flex: 1; min-width: 240px; height: 38px; }

    /* Data & Editors */
    .editor-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.2rem; }
    .editor-col { display: flex; flex-direction: column; gap: 0.45rem; }
    .editor-col label { font-size: 0.83rem; font-weight: 600; color: var(--text-secondary); }
    textarea {
      width: 100%; padding: 0.9rem; border-radius: 12px;
      background: rgba(5,7,11,0.78); border: 1px solid var(--border-subtle);
      color: #e2e8f0; font-family: var(--font-mono); font-size: 0.84rem;
      resize: vertical; outline: none;
    }

    /* Units Converter */
    .sub-pills { display: flex; flex-wrap: wrap; gap: 0.5rem; }
    .sub-pill {
      padding: 0.55rem 0.95rem; border-radius: 999px;
      background: rgba(255,255,255,0.05); border: 1px solid var(--border-subtle);
      color: var(--text-secondary); font-weight: 600; font-size: 0.84rem; cursor: pointer;
    }
    .sub-pill.active {
      background: rgba(6,182,212,0.2); border-color: #06b6d4; color: #67e8f9;
    }
    .unit-converter-hero {
      display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1rem;
    }
    .big-num-input { font-size: 1.15rem !important; font-weight: 700; color: #67e8f9 !important; }
    .units-result-grid {
      display: grid; grid-template-columns: repeat(auto-fill, minmax(210px, 1fr)); gap: 0.85rem;
    }
    .unit-result-card {
      padding: 0.95rem 1.1rem; border-radius: 14px; cursor: pointer;
      background: rgba(5,7,11,0.65); border: 1px solid var(--border-subtle);
      transition: all 0.15s ease;
    }
    .unit-result-card:hover { border-color: #6366f1; transform: translateY(-1px); }
    .unit-result-card.highlight {
      border-color: #06b6d4; background: rgba(6,182,212,0.1);
    }
    .unit-card-label { font-size: 0.78rem; color: var(--text-secondary); margin-bottom: 0.3rem; }
    .unit-card-val { font-family: var(--font-mono); font-size: 1.08rem; font-weight: 700; color: var(--text-primary); word-break: break-all; }
    .unit-sym { font-size: 0.82rem; color: #93c5fd; font-weight: 600; }
    .download-time-banner {
      display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem;
      padding: 0.9rem 1.2rem; border-radius: 12px;
      background: rgba(6,182,212,0.14); border: 1px solid rgba(6,182,212,0.35); color: #a5f3fc;
    }

    /* Encoding / Colors / Numbers */
    .triple-section-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.2rem; }
    .sub-panel {
      display: flex; flex-direction: column; gap: 0.95rem;
      padding: 1.25rem; border-radius: 16px;
      background: rgba(5,7,11,0.6); border: 1px solid var(--border-subtle);
    }
    .sub-panel.full-span { grid-column: 1 / -1; }
    .sub-panel-header { display: flex; justify-content: space-between; align-items: center; gap: 0.75rem; flex-wrap: wrap; }
    .sub-panel-header h3 { margin: 0; font-size: 1.05rem; font-family: var(--font-display); }
    .color-picker-native { width: 44px; height: 34px; border: none; border-radius: 8px; background: transparent; cursor: pointer; }
    .color-preview-swatch {
      height: 68px; border-radius: 12px; padding: 0.6rem 0.9rem;
      display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.4rem;
      border: 1px solid rgba(255,255,255,0.18);
    }
    .swatch-tag { font-size: 0.76rem; font-weight: 700; padding: 0.2rem 0.5rem; border-radius: 6px; background: rgba(0,0,0,0.28); }
    .swatch-tag.dark { background: rgba(255,255,255,0.65); }
    .kv-list { display: flex; flex-direction: column; gap: 0.65rem; }
    .kv-row { display: grid; grid-template-columns: 130px 1fr; align-items: center; gap: 0.6rem; }
    .kv-row label { font-size: 0.8rem; color: var(--text-secondary); font-weight: 600; }
    .kv-input-wrap { display: flex; gap: 0.4rem; }
    .kv-input-wrap input { font-family: var(--font-mono); font-size: 0.82rem; }
    .text-code-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }

    @media (max-width: 980px) {
      .category-tabs { grid-template-columns: repeat(2, 1fr); }
      .editor-grid, .triple-section-grid, .text-code-grid { grid-template-columns: 1fr; }
      .img-result-card { grid-template-columns: 1fr; }
    }
  `],
})
export class UniversalConverterComponent {
  @ViewChild('waveformCanvas') waveformCanvasRef?: ElementRef<HTMLCanvasElement>;

  readonly activeTab = signal<MainTab>('images');
  readonly statusBanner = signal<string>('');
  readonly statusError = signal<boolean>(false);

  // =========================================================================
  // 1. BILDER-KONVERTER & KOMPRESSOR STATE
  // =========================================================================
  readonly images = signal<ConvertedImageItem[]>([]);
  readonly imgTargetFormat = signal<ImageTargetFormat>('webp');
  readonly imgQuality = signal<number>(85);
  readonly imgScaleMode = signal<'100' | '75' | '50' | '25' | 'custom'>('100');
  readonly imgCustomMaxWidth = signal<number>(1200);
  readonly imgEffect = signal<ImageEffect>('none');
  readonly isDraggingImages = signal<boolean>(false);

  // =========================================================================
  // 2. AUDIO & VIDEO-ZU-AUDIO STATE
  // =========================================================================
  readonly audioBuffer = signal<AudioBuffer | null>(null);
  readonly audioSourceName = signal<string>('');
  readonly audioDuration = signal<number>(0);
  readonly audioOriginalSampleRate = signal<number>(44100);
  readonly audioOriginalChannels = signal<number>(2);

  readonly audioTargetFormat = signal<AudioTargetFormat>('wav16');
  readonly audioChannels = signal<number>(2);
  readonly audioSampleRate = signal<number>(44100);
  readonly audioSpeed = signal<number>(1.0);
  readonly audioTrimStart = signal<number>(0);
  readonly audioTrimEnd = signal<number>(0);
  readonly audioGainPercent = signal<number>(100);
  readonly audioNormalize = signal<boolean>(true);

  readonly audioOutputUrl = signal<string>('');
  readonly audioOutputBlob = signal<Blob | null>(null);
  readonly audioOutputSize = signal<number>(0);
  readonly audioJsonPreview = signal<string>('');

  // =========================================================================
  // 3. DATEN- & TABELLEN-KONVERTER STATE
  // =========================================================================
  readonly dataSourceFormat = signal<DataSourceFormat>('auto');
  readonly dataTargetFormat = signal<DataTargetFormat>('csv-semi');
  readonly sqlTableName = signal<string>('allinone_items');
  readonly dataInput = signal<string>('');
  readonly dataOutput = signal<string>('');
  readonly detectedDataFormat = signal<string>('json');
  readonly dataRecordCount = signal<number>(0);

  // =========================================================================
  // 4. MASSEINHEITEN & ALLTAGS-KONVERTER STATE
  // =========================================================================
  readonly unitCategory = signal<UnitCategory>('length');
  readonly unitInputValue = signal<number>(100);
  readonly unitFromId = signal<string>('m');
  readonly cookingDensity = signal<number>(1.0);
  readonly downloadBandwidthMbps = signal<number>(250);

  private readonly unitCatalog: Record<UnitCategory, UnitDef[]> = {
    length: [
      { id: 'mm', label: 'Millimeter', symbol: 'mm', factorToBase: 0.001 },
      { id: 'cm', label: 'Zentimeter', symbol: 'cm', factorToBase: 0.01 },
      { id: 'm', label: 'Meter', symbol: 'm', factorToBase: 1 },
      { id: 'km', label: 'Kilometer', symbol: 'km', factorToBase: 1000 },
      { id: 'inch', label: 'Zoll / Inch', symbol: 'in', factorToBase: 0.0254 },
      { id: 'ft', label: 'Fuß / Feet', symbol: 'ft', factorToBase: 0.3048 },
      { id: 'yd', label: 'Yard', symbol: 'yd', factorToBase: 0.9144 },
      { id: 'mi', label: 'Meile (Statute)', symbol: 'mi', factorToBase: 1609.344 },
      { id: 'nmi', label: 'Seemeile (Nautisch)', symbol: 'nmi', factorToBase: 1852 },
    ],
    weight: [
      { id: 'mg', label: 'Milligramm', symbol: 'mg', factorToBase: 0.000001 },
      { id: 'g', label: 'Gramm', symbol: 'g', factorToBase: 0.001 },
      { id: 'kg', label: 'Kilogramm', symbol: 'kg', factorToBase: 1 },
      { id: 't', label: 'Metrische Tonne', symbol: 't', factorToBase: 1000 },
      { id: 'oz', label: 'Unze (Ounce)', symbol: 'oz', factorToBase: 0.0283495231 },
      { id: 'lb', label: 'Pfund (Pound)', symbol: 'lb', factorToBase: 0.45359237 },
      { id: 'st', label: 'Stone (UK)', symbol: 'st', factorToBase: 6.35029318 },
    ],
    temperature: [
      { id: 'c', label: 'Grad Celsius', symbol: '°C', factorToBase: 1 },
      { id: 'f', label: 'Grad Fahrenheit', symbol: '°F', factorToBase: 1 },
      { id: 'k', label: 'Kelvin', symbol: 'K', factorToBase: 1 },
    ],
    speed: [
      { id: 'kmh', label: 'Kilometer pro Stunde', symbol: 'km/h', factorToBase: 1 / 3.6 },
      { id: 'ms', label: 'Meter pro Sekunde', symbol: 'm/s', factorToBase: 1 },
      { id: 'mph', label: 'Meilen pro Stunde', symbol: 'mph', factorToBase: 0.44704 },
      { id: 'kn', label: 'Knoten (Seemeilen/h)', symbol: 'kn', factorToBase: 0.514444 },
      { id: 'mach', label: 'Mach (Schallgeschwindigkeit)', symbol: 'Mach', factorToBase: 343 },
    ],
    area: [
      { id: 'cm2', label: 'Quadratzentimeter', symbol: 'cm²', factorToBase: 0.0001 },
      { id: 'm2', label: 'Quadratmeter', symbol: 'm²', factorToBase: 1 },
      { id: 'ha', label: 'Hektar', symbol: 'ha', factorToBase: 10000 },
      { id: 'km2', label: 'Quadratkilometer', symbol: 'km²', factorToBase: 1_000_000 },
      { id: 'sqft', label: 'Square Feet', symbol: 'sq ft', factorToBase: 0.09290304 },
      { id: 'acre', label: 'Acre', symbol: 'ac', factorToBase: 4046.8564224 },
    ],
    volume: [
      { id: 'ml', label: 'Milliliter', symbol: 'ml', factorToBase: 0.001 },
      { id: 'l', label: 'Liter', symbol: 'L', factorToBase: 1 },
      { id: 'm3', label: 'Kubikmeter', symbol: 'm³', factorToBase: 1000 },
      { id: 'gal', label: 'US Gallon', symbol: 'gal', factorToBase: 3.785411784 },
      { id: 'floz', label: 'US Fluid Ounce', symbol: 'fl oz', factorToBase: 0.0295735296 },
      { id: 'cup', label: 'US Cup (Tasse)', symbol: 'cup', factorToBase: 0.2365882365 },
    ],
    data: [
      { id: 'b', label: 'Byte', symbol: 'B', factorToBase: 1 },
      { id: 'kb', label: 'Kilobyte (10³)', symbol: 'KB', factorToBase: 1_000 },
      { id: 'mb', label: 'Megabyte (10⁶)', symbol: 'MB', factorToBase: 1_000_000 },
      { id: 'gb', label: 'Gigabyte (10⁹)', symbol: 'GB', factorToBase: 1_000_000_000 },
      { id: 'tb', label: 'Terabyte (10¹²)', symbol: 'TB', factorToBase: 1_000_000_000_000 },
      { id: 'mib', label: 'Mebibyte (2²⁰)', symbol: 'MiB', factorToBase: 1048576 },
      { id: 'gib', label: 'Gibibyte (2³⁰)', symbol: 'GiB', factorToBase: 1073741824 },
    ],
    cooking: [
      { id: 'ml', label: 'Milliliter', symbol: 'ml', factorToBase: 1 },
      { id: 'tl', label: 'Teelöffel (5 ml)', symbol: 'TL', factorToBase: 5 },
      { id: 'el', label: 'Esslöffel (15 ml)', symbol: 'EL', factorToBase: 15 },
      { id: 'cup', label: 'Tasse / Cup (240 ml)', symbol: 'Cup', factorToBase: 240 },
      { id: 'g', label: 'Gramm (nach Zutaten-Dichte)', symbol: 'g', factorToBase: 1 },
    ],
  };

  readonly currentUnitDefs = computed(() => this.unitCatalog[this.unitCategory()]);

  readonly computedUnitResults = computed(() => {
    const cat = this.unitCategory();
    const defs = this.unitCatalog[cat];
    const val = this.unitInputValue();
    const fromId = this.unitFromId();
    const density = this.cookingDensity();

    if (cat === 'temperature') {
      let celsius = val;
      if (fromId === 'f') celsius = ((val - 32) * 5) / 9;
      else if (fromId === 'k') celsius = val - 273.15;

      return defs.map((d) => {
        let out = celsius;
        if (d.id === 'f') out = (celsius * 9) / 5 + 32;
        else if (d.id === 'k') out = celsius + 273.15;
        return { ...d, value: out, formatted: this.formatNumber(out) };
      });
    }

    if (cat === 'cooking') {
      const fromDef = defs.find((d) => d.id === fromId) ?? defs[0];
      const baseMl = fromId === 'g' ? val / density : val * fromDef.factorToBase;
      return defs.map((d) => {
        const out = d.id === 'g' ? baseMl * density : baseMl / d.factorToBase;
        return { ...d, value: out, formatted: this.formatNumber(out) };
      });
    }

    const fromDef = defs.find((d) => d.id === fromId) ?? defs[0];
    const baseVal = val * fromDef.factorToBase;
    return defs.map((d) => {
      const out = baseVal / d.factorToBase;
      return { ...d, value: out, formatted: this.formatNumber(out) };
    });
  });

  readonly computedDownloadTime = computed(() => {
    if (this.unitCategory() !== 'data') return '';
    const defs = this.unitCatalog.data;
    const fromDef = defs.find((d) => d.id === this.unitFromId()) ?? defs[0];
    const totalBytes = this.unitInputValue() * fromDef.factorToBase;
    const totalBits = totalBytes * 8;
    const bps = Math.max(1, this.downloadBandwidthMbps()) * 1_000_000;
    const seconds = totalBits / bps;
    if (seconds < 1) return `${(seconds * 1000).toFixed(0)} ms`;
    if (seconds < 60) return `${seconds.toFixed(1)} Sekunden`;
    const mins = Math.floor(seconds / 60);
    const remSec = Math.round(seconds % 60);
    if (mins < 60) return `${mins} Min. ${remSec} Sek.`;
    const hours = Math.floor(mins / 60);
    return `${hours} Std. ${mins % 60} Min.`;
  });

  // =========================================================================
  // 5. FARBEN, ZAHLENSYSTEME & TEXT-CODE STATE
  // =========================================================================
  readonly colorHex = signal<string>('#6366f1');
  readonly colorRgb = signal<{ r: number; g: number; b: number }>({ r: 99, g: 102, b: 241 });
  readonly colorRgbString = computed(() => {
    const { r, g, b } = this.colorRgb();
    return `rgb(${r}, ${g}, ${b})`;
  });
  readonly colorHslString = computed(() => {
    const { r, g, b } = this.colorRgb();
    const { h, s, l } = this.rgbToHsl(r, g, b);
    return `hsl(${h}deg, ${s}%, ${l}%)`;
  });
  readonly colorCmykString = computed(() => {
    const { r, g, b } = this.colorRgb();
    const { c, m, y, k } = this.rgbToCmyk(r, g, b);
    return `cmyk(${c}%, ${m}%, ${y}%, ${k}%)`;
  });
  readonly colorCssFilter = computed(() => {
    const { r, g, b } = this.colorRgb();
    const { h, s, l } = this.rgbToHsl(r, g, b);
    return `brightness(0) saturate(100%) invert(${l}%) sepia(${Math.round(s * 0.8)}%) saturate(${s * 4}%) hue-rotate(${h}deg)`;
  });
  readonly colorContrastWhite = computed(() => {
    const { r, g, b } = this.colorRgb();
    const lum = this.relativeLuminance(r, g, b);
    return +((1.05) / (lum + 0.05)).toFixed(2);
  });
  readonly colorContrastBlack = computed(() => {
    const { r, g, b } = this.colorRgb();
    const lum = this.relativeLuminance(r, g, b);
    return +((lum + 0.05) / 0.05).toFixed(2);
  });

  readonly numDec = signal<string>('2026');
  readonly numBin = signal<string>((2026).toString(2));
  readonly numOct = signal<string>((2026).toString(8));
  readonly numHex = signal<string>((2026).toString(16).toUpperCase());
  readonly numRoman = signal<string>('MMXXVI');

  readonly plainText = signal<string>('SOS ALLINONE');
  readonly morseText = signal<string>('... --- ... / .- .-.. .-.. .. -. --- -. .');
  readonly binaryText = signal<string>('01010011 01001111 01010011 00100000 01000001 01001100 01001100 01001001 01001110 01001111 01001110 01000101');
  readonly asciiText = computed(() =>
    Array.from(this.plainText())
      .map((ch) => ch.charCodeAt(0))
      .join(' ')
  );
  readonly rot13Text = computed(() =>
    this.plainText().replace(/[a-zA-Z]/g, (c) => {
      const base = c <= 'Z' ? 65 : 97;
      return String.fromCharCode(((c.charCodeAt(0) - base + 13) % 26) + base);
    })
  );

  constructor() {
    this.loadDataExample('products');
  }

  private notify(msg: string, isError = false): void {
    this.statusBanner.set(msg);
    this.statusError.set(isError);
  }

  copyText(text: string): void {
    if (!text) return;
    navigator.clipboard?.writeText(text);
    this.notify('✓ In die Zwischenablage kopiert.');
  }

  formatBytes(bytes: number): string {
    if (!bytes || bytes <= 0) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(2)} MB`;
  }

  private formatNumber(n: number): string {
    if (!Number.isFinite(n)) return '0';
    if (Math.abs(n) >= 1_000_000 || (Math.abs(n) > 0 && Math.abs(n) < 0.0001)) {
      return n.toExponential(4);
    }
    return Number(n.toFixed(6)).toString();
  }

  // =========================================================================
  // TAB 1: IMAGE CONVERTER METHODS
  // =========================================================================
  onImgFormatChange(fmt: ImageTargetFormat): void {
    this.imgTargetFormat.set(fmt);
    this.convertAllImages();
  }

  onImgDragOver(ev: DragEvent): void {
    ev.preventDefault();
    this.isDraggingImages.set(true);
  }

  onImgDrop(ev: DragEvent): void {
    ev.preventDefault();
    this.isDraggingImages.set(false);
    const files = ev.dataTransfer?.files;
    if (files?.length) this.handleImageFiles(Array.from(files));
  }

  onImgFileSelect(ev: Event): void {
    const input = ev.target as HTMLInputElement;
    if (input.files?.length) {
      this.handleImageFiles(Array.from(input.files));
      input.value = '';
    }
  }

  private handleImageFiles(files: File[]): void {
    for (const file of files) {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        this.addImageFromDataUrl(file.name, file.size, dataUrl);
      };
      reader.readAsDataURL(file);
    }
  }

  private addImageFromDataUrl(name: string, originalSize: number, dataUrl: string): void {
    const img = new Image();
    img.onload = () => {
      const item: ConvertedImageItem = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        name,
        originalSize,
        originalWidth: img.naturalWidth || 800,
        originalHeight: img.naturalHeight || 600,
        sourceDataUrl: dataUrl,
        convertedUrl: '',
        convertedBlob: null,
        convertedSize: 0,
        targetFormat: this.imgTargetFormat(),
        outputWidth: img.naturalWidth || 800,
        outputHeight: img.naturalHeight || 600,
        status: 'ready',
      };
      this.images.update((list) => [...list, item]);
      this.convertSingleImage(item.id);
    };
    img.src = dataUrl;
  }

  generateDemoImages(): void {
    const demos = [
      { name: 'neon-cyber-poster.png', c1: '#4f46e5', c2: '#ec4899', title: 'NEON CYBERPUNK' },
      { name: 'alpine-landscape.jpg', c1: '#059669', c2: '#0284c7', title: 'ALPINE PEAK 4K' },
      { name: 'ui-icon-badge.png', c1: '#f59e0b', c2: '#ef4444', title: 'VECTOR STUDIO' },
    ];

    for (const d of demos) {
      const canvas = document.createElement('canvas');
      canvas.width = 960;
      canvas.height = 600;
      const ctx = canvas.getContext('2d')!;
      const grad = ctx.createLinearGradient(0, 0, 960, 600);
      grad.addColorStop(0, d.c1);
      grad.addColorStop(1, d.c2);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 960, 600);

      // Decorative circles & grid
      ctx.strokeStyle = 'rgba(255,255,255,0.18)';
      ctx.lineWidth = 3;
      for (let r = 60; r <= 300; r += 60) {
        ctx.beginPath();
        ctx.arc(480, 300, r, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 54px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(d.title, 480, 295);
      ctx.font = '24px monospace';
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.fillText('960 × 600 px • Universal Converter Demo', 480, 345);

      const dataUrl = canvas.toDataURL('image/png');
      const approxBytes = Math.round((dataUrl.length * 3) / 4);
      this.addImageFromDataUrl(d.name, approxBytes, dataUrl);
    }
    this.notify('✓ 3 Demo-Bilder generiert und sofort konvertiert.');
  }

  convertAllImages(): void {
    for (const item of this.images()) {
      this.convertSingleImage(item.id);
    }
  }

  private convertSingleImage(id: string): void {
    const current = this.images().find((x) => x.id === id);
    if (!current) return;

    const img = new Image();
    img.onload = () => {
      const fmt = this.imgTargetFormat();
      const quality = Math.max(0.1, Math.min(1, this.imgQuality() / 100));
      const scaleMode = this.imgScaleMode();

      let targetW = current.originalWidth;
      let targetH = current.originalHeight;

      if (fmt === 'ico') {
        targetW = 64;
        targetH = 64;
      } else if (scaleMode === 'custom') {
        const maxW = Math.max(16, this.imgCustomMaxWidth());
        const ratio = maxW / current.originalWidth;
        targetW = Math.round(current.originalWidth * ratio);
        targetH = Math.round(current.originalHeight * ratio);
      } else {
        const factor = Number(scaleMode) / 100;
        targetW = Math.max(1, Math.round(current.originalWidth * factor));
        targetH = Math.max(1, Math.round(current.originalHeight * factor));
      }

      const canvas = document.createElement('canvas');
      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext('2d')!;

      // Apply visual filter
      const eff = this.imgEffect();
      if (eff === 'grayscale') ctx.filter = 'grayscale(100%)';
      else if (eff === 'sepia') ctx.filter = 'sepia(100%)';
      else if (eff === 'invert') ctx.filter = 'invert(100%)';
      else if (eff === 'contrast') ctx.filter = 'contrast(120%) saturate(115%)';

      if (fmt === 'jpeg' || fmt === 'bmp' || fmt === 'pdf') {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, targetW, targetH);
      }
      ctx.drawImage(img, 0, 0, targetW, targetH);

      let blob: Blob;
      let previewUrl: string;
      let base64Str: string | undefined;

      if (fmt === 'svg') {
        const pngDataUrl = canvas.toDataURL('image/png');
        const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${targetW} ${targetH}" width="${targetW}" height="${targetH}">\n  <image href="${pngDataUrl}" width="${targetW}" height="${targetH}" />\n</svg>`;
        blob = new Blob([svgContent], { type: 'image/svg+xml' });
        previewUrl = URL.createObjectURL(blob);
      } else if (fmt === 'bmp') {
        const imgData = ctx.getImageData(0, 0, targetW, targetH);
        blob = this.encodeBmpFromImageData(imgData);
        previewUrl = canvas.toDataURL('image/png');
      } else if (fmt === 'ico') {
        const pngDataUrl = canvas.toDataURL('image/png');
        blob = this.encodeIcoFromPngDataUrl(pngDataUrl, targetW, targetH);
        previewUrl = pngDataUrl;
      } else if (fmt === 'pdf') {
        const jpegDataUrl = canvas.toDataURL('image/jpeg', quality);
        blob = this.buildPdfFromJpegDataUrls([{ dataUrl: jpegDataUrl, width: targetW, height: targetH }]);
        previewUrl = jpegDataUrl;
      } else if (fmt === 'base64') {
        const webpDataUrl = canvas.toDataURL('image/webp', quality);
        base64Str = webpDataUrl;
        blob = new Blob([webpDataUrl], { type: 'text/plain' });
        previewUrl = webpDataUrl;
      } else {
        const mime = fmt === 'png' ? 'image/png' : fmt === 'jpeg' ? 'image/jpeg' : 'image/webp';
        const dataUrl = canvas.toDataURL(mime, quality);
        blob = this.dataUrlToBlob(dataUrl);
        previewUrl = dataUrl;
      }

      this.images.update((list) =>
        list.map((it) =>
          it.id === id
            ? {
                ...it,
                targetFormat: fmt,
                convertedBlob: blob,
                convertedUrl: previewUrl,
                convertedSize: blob.size,
                outputWidth: targetW,
                outputHeight: targetH,
                base64String: base64Str,
                status: 'done',
              }
            : it
        )
      );
    };
    img.src = current.sourceDataUrl;
  }

  getSavingsPercent(item: ConvertedImageItem): number {
    if (!item.originalSize || !item.convertedSize) return 0;
    const diff = item.originalSize - item.convertedSize;
    return Math.round((diff / item.originalSize) * 100);
  }

  getImageExtension(fmt: ImageTargetFormat): string {
    if (fmt === 'jpeg') return 'jpg';
    if (fmt === 'base64') return 'txt';
    return fmt;
  }

  downloadConvertedImage(item: ConvertedImageItem): void {
    if (!item.convertedBlob) return;
    const baseName = item.name.replace(/\.[^.]+$/, '');
    const ext = this.getImageExtension(item.targetFormat);
    this.triggerDownload(item.convertedBlob, `${baseName}-converted.${ext}`);
  }

  async downloadAllImagesAsPdf(): Promise<void> {
    const items = this.images();
    if (!items.length) return;

    const pages: { dataUrl: string; width: number; height: number }[] = [];
    for (const item of items) {
      const canvas = document.createElement('canvas');
      canvas.width = item.outputWidth;
      canvas.height = item.outputHeight;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const img = await this.loadImageElement(item.sourceDataUrl);
      const eff = this.imgEffect();
      if (eff === 'grayscale') ctx.filter = 'grayscale(100%)';
      else if (eff === 'sepia') ctx.filter = 'sepia(100%)';
      else if (eff === 'invert') ctx.filter = 'invert(100%)';
      else if (eff === 'contrast') ctx.filter = 'contrast(120%) saturate(115%)';

      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      pages.push({
        dataUrl: canvas.toDataURL('image/jpeg', Math.max(0.2, this.imgQuality() / 100)),
        width: canvas.width,
        height: canvas.height,
      });
    }

    const pdfBlob = this.buildPdfFromJpegDataUrls(pages);
    this.triggerDownload(pdfBlob, `sammel-dokument-${items.length}-bilder.pdf`);
    this.notify(`✓ Sammel-PDF mit ${items.length} Seite(n) erstellt.`);
  }

  private loadImageElement(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = (err) => reject(err);
      img.src = src;
    });
  }

  clearImages(): void {
    this.images.set([]);
  }

  private dataUrlToBlob(dataUrl: string): Blob {
    const parts = dataUrl.split(',');
    const mimeMatch = parts[0].match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
    const bstr = atob(parts[1]);
    const u8 = new Uint8Array(bstr.length);
    for (let i = 0; i < bstr.length; i++) u8[i] = bstr.charCodeAt(i);
    return new Blob([u8], { type: mime });
  }

  private encodeBmpFromImageData(imgData: ImageData): Blob {
    const w = imgData.width;
    const h = imgData.height;
    const rowStride = Math.floor((24 * w + 31) / 32) * 4;
    const pixelArraySize = rowStride * h;
    const fileSize = 54 + pixelArraySize;
    const buf = new ArrayBuffer(fileSize);
    const view = new DataView(buf);

    // BITMAPFILEHEADER (14 bytes)
    view.setUint8(0, 0x42); // 'B'
    view.setUint8(1, 0x4d); // 'M'
    view.setUint32(2, fileSize, true);
    view.setUint32(10, 54, true);

    // BITMAPINFOHEADER (40 bytes)
    view.setUint32(14, 40, true);
    view.setInt32(18, w, true);
    view.setInt32(22, -h, true); // top-down
    view.setUint16(26, 1, true);
    view.setUint16(28, 24, true);
    view.setUint32(34, pixelArraySize, true);

    const src = imgData.data;
    let offset = 54;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = (y * w + x) * 4;
        view.setUint8(offset + x * 3, src[idx + 2]); // B
        view.setUint8(offset + x * 3 + 1, src[idx + 1]); // G
        view.setUint8(offset + x * 3 + 2, src[idx]); // R
      }
      offset += rowStride;
    }
    return new Blob([buf], { type: 'image/bmp' });
  }

  private encodeIcoFromPngDataUrl(pngDataUrl: string, w: number, h: number): Blob {
    const bstr = atob(pngDataUrl.split(',')[1]);
    const pngBytes = new Uint8Array(bstr.length);
    for (let i = 0; i < bstr.length; i++) pngBytes[i] = bstr.charCodeAt(i);

    const header = new ArrayBuffer(22);
    const v = new DataView(header);
    v.setUint16(0, 0, true); // reserved
    v.setUint16(2, 1, true); // ICO type
    v.setUint16(4, 1, true); // 1 image
    v.setUint8(6, w >= 256 ? 0 : w);
    v.setUint8(7, h >= 256 ? 0 : h);
    v.setUint8(8, 0);
    v.setUint8(9, 0);
    v.setUint16(10, 1, true);
    v.setUint16(12, 32, true);
    v.setUint32(14, pngBytes.length, true);
    v.setUint32(18, 22, true);

    return new Blob([header, pngBytes as BlobPart], { type: 'image/x-icon' });
  }

  /**
   * Builds a valid multi-page %PDF-1.4 binary embedding JPEG streams (/DCTDecode).
   */
  private buildPdfFromJpegDataUrls(pages: { dataUrl: string; width: number; height: number }[]): Blob {
    const enc = new TextEncoder();
    const chunks: BlobPart[] = [];
    const offsets: number[] = [0]; // 1-indexed object byte offsets
    let currentByteOffset = 0;

    const pushStr = (s: string) => {
      const bytes = enc.encode(s);
      chunks.push(bytes as BlobPart);
      currentByteOffset += bytes.length;
    };
    const pushBytes = (b: Uint8Array) => {
      chunks.push(b as BlobPart);
      currentByteOffset += b.length;
    };

    pushStr('%PDF-1.4\n');

    // Object 1: Catalog, Object 2: Pages
    const pageCount = pages.length;
    const kidsRefs = pages.map((_, idx) => `${3 + idx * 3} 0 R`).join(' ');

    offsets[1] = currentByteOffset;
    pushStr(`1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n`);

    offsets[2] = currentByteOffset;
    pushStr(`2 0 obj\n<< /Type /Pages /Kids [${kidsRefs}] /Count ${pageCount} >>\nendobj\n`);

    pages.forEach((p, idx) => {
      const pageObjId = 3 + idx * 3;
      const contentObjId = pageObjId + 1;
      const imgObjId = pageObjId + 2;

      const bstr = atob(p.dataUrl.split(',')[1]);
      const jpegBytes = new Uint8Array(bstr.length);
      for (let i = 0; i < bstr.length; i++) jpegBytes[i] = bstr.charCodeAt(i);

      const wPt = 595; // A4 width in points
      const hPt = Math.max(200, Math.round((p.height / p.width) * wPt));

      offsets[pageObjId] = currentByteOffset;
      pushStr(
        `${pageObjId} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${wPt} ${hPt}] /Resources << /XObject << /Im0 ${imgObjId} 0 R >> >> /Contents ${contentObjId} 0 R >>\nendobj\n`
      );

      const streamCmd = `q ${wPt} 0 0 ${hPt} 0 0 cm /Im0 Do Q\n`;
      offsets[contentObjId] = currentByteOffset;
      pushStr(
        `${contentObjId} 0 obj\n<< /Length ${streamCmd.length} >>\nstream\n${streamCmd}endstream\nendobj\n`
      );

      offsets[imgObjId] = currentByteOffset;
      pushStr(
        `${imgObjId} 0 obj\n<< /Type /XObject /Subtype /Image /Width ${p.width} /Height ${p.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpegBytes.length} >>\nstream\n`
      );
      pushBytes(jpegBytes);
      pushStr(`\nendstream\nendobj\n`);
    });

    const totalObjs = 2 + pageCount * 3;
    const xrefOffset = currentByteOffset;
    pushStr(`xref\n0 ${totalObjs + 1}\n0000000000 65535 f \n`);
    for (let i = 1; i <= totalObjs; i++) {
      const padded = String(offsets[i]).padStart(10, '0');
      pushStr(`${padded} 00000 n \n`);
    }
    pushStr(`trailer\n<< /Size ${totalObjs + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`);

    return new Blob(chunks, { type: 'application/pdf' });
  }

  // =========================================================================
  // TAB 2: AUDIO & VIDEO-TO-AUDIO CONVERTER METHODS
  // =========================================================================
  onAudioDrop(ev: DragEvent): void {
    ev.preventDefault();
    const file = ev.dataTransfer?.files?.[0];
    if (file) this.decodeAudioFile(file);
  }

  onAudioFileSelect(ev: Event): void {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      this.decodeAudioFile(file);
      input.value = '';
    }
  }

  private async decodeAudioFile(file: File): Promise<void> {
    try {
      const arrayBuf = await file.arrayBuffer();
      const ctx = new AudioContext();
      const decoded = await ctx.decodeAudioData(arrayBuf);
      await ctx.close();

      this.setLoadedAudioBuffer(decoded, file.name);
      this.notify(`✓ Audiospur aus "${file.name}" erfolgreich dekodiert.`);
    } catch {
      this.notify('Audiospur konnte nicht dekodiert werden. Bitte prüfe das Dateiformat.', true);
    }
  }

  generateSynthDemoAudio(): void {
    const sr = 44100;
    const duration = 4.0;
    const length = sr * duration;
    const ctx = new OfflineAudioContext(2, length, sr);
    const buffer = ctx.createBuffer(2, length, sr);

    const left = buffer.getChannelData(0);
    const right = buffer.getChannelData(1);
    const notes = [261.63, 329.63, 392.0, 523.25]; // C4, E4, G4, C5 chord progression

    for (let i = 0; i < length; i++) {
      const t = i / sr;
      const noteIdx = Math.min(3, Math.floor(t));
      const freq = notes[noteIdx];
      const localT = t % 1.0;
      const env = Math.exp(-localT * 3.2);
      const wave =
        Math.sin(2 * Math.PI * freq * t) * 0.55 +
        Math.sin(2 * Math.PI * freq * 1.5 * t) * 0.25 +
        Math.sin(2 * Math.PI * freq * 2 * t) * 0.15;
      left[i] = wave * env;
      right[i] = wave * env * Math.cos(t * 2);
    }

    this.setLoadedAudioBuffer(buffer, 'synth-arpeggio-demo.wav');
    this.notify('✓ 4-Sekunden Stereo Synthesizer-Demo generiert.');
  }

  private setLoadedAudioBuffer(buf: AudioBuffer, name: string): void {
    this.audioBuffer.set(buf);
    this.audioSourceName.set(name);
    this.audioDuration.set(buf.duration);
    this.audioOriginalSampleRate.set(buf.sampleRate);
    this.audioOriginalChannels.set(buf.numberOfChannels);
    this.audioTrimStart.set(0);
    this.audioTrimEnd.set(+buf.duration.toFixed(2));
    this.processAndExportAudio();
  }

  processAndExportAudio(): void {
    const srcBuf = this.audioBuffer();
    if (!srcBuf) return;

    const targetSr = this.audioSampleRate();
    const targetCh = this.audioChannels();
    const speed = Math.max(0.5, Math.min(2.0, this.audioSpeed()));
    const startSec = Math.max(0, Math.min(srcBuf.duration, this.audioTrimStart()));
    const endSec = Math.max(startSec + 0.05, Math.min(srcBuf.duration, this.audioTrimEnd()));
    const gain = this.audioGainPercent() / 100;
    const normalize = this.audioNormalize();

    const trimmedDuration = (endSec - startSec) / speed;
    const outSamples = Math.max(1, Math.floor(trimmedDuration * targetSr));

    const outChannels: Float32Array[] = [];
    for (let ch = 0; ch < targetCh; ch++) {
      outChannels.push(new Float32Array(outSamples));
    }

    let maxPeak = 0.0001;
    for (let i = 0; i < outSamples; i++) {
      const srcTime = startSec + (i / targetSr) * speed;
      const srcIdx = Math.min(srcBuf.length - 1, Math.floor(srcTime * srcBuf.sampleRate));

      if (targetCh === 1) {
        let sum = 0;
        for (let c = 0; c < srcBuf.numberOfChannels; c++) {
          sum += srcBuf.getChannelData(c)[srcIdx] || 0;
        }
        const val = (sum / srcBuf.numberOfChannels) * gain;
        outChannels[0][i] = val;
        if (Math.abs(val) > maxPeak) maxPeak = Math.abs(val);
      } else {
        for (let c = 0; c < targetCh; c++) {
          const srcChan = srcBuf.getChannelData(Math.min(c, srcBuf.numberOfChannels - 1));
          const val = (srcChan[srcIdx] || 0) * gain;
          outChannels[c][i] = val;
          if (Math.abs(val) > maxPeak) maxPeak = Math.abs(val);
        }
      }
    }

    if (normalize && maxPeak > 0) {
      const normFactor = 0.98 / maxPeak;
      for (let c = 0; c < targetCh; c++) {
        const arr = outChannels[c];
        for (let i = 0; i < outSamples; i++) {
          arr[i] = Math.max(-1, Math.min(1, arr[i] * normFactor));
        }
      }
    }

    setTimeout(() => this.drawWaveform(outChannels[0]), 0);

    const fmt = this.audioTargetFormat();
    if (fmt === 'json') {
      const peaks: number[] = [];
      const buckets = 120;
      const step = Math.max(1, Math.floor(outSamples / buckets));
      for (let b = 0; b < buckets; b++) {
        let peak = 0;
        for (let j = 0; j < step; j++) {
          const idx = b * step + j;
          if (idx < outSamples) peak = Math.max(peak, Math.abs(outChannels[0][idx]));
        }
        peaks.push(+peak.toFixed(3));
      }
      const jsonStr = JSON.stringify(
        {
          source: this.audioSourceName(),
          durationSeconds: +trimmedDuration.toFixed(2),
          sampleRate: targetSr,
          channels: targetCh,
          peaks,
        },
        null,
        2
      );
      this.audioJsonPreview.set(jsonStr);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      this.audioOutputBlob.set(blob);
      this.audioOutputSize.set(blob.size);
      this.audioOutputUrl.set('');
      return;
    }

    const isFloat32 = fmt === 'wav32';
    const wavBlob = this.encodeWavFile(outChannels, targetSr, isFloat32);
    if (this.audioOutputUrl()) URL.revokeObjectURL(this.audioOutputUrl());
    const url = URL.createObjectURL(wavBlob);
    this.audioOutputBlob.set(wavBlob);
    this.audioOutputSize.set(wavBlob.size);
    this.audioOutputUrl.set(url);
  }

  private encodeWavFile(channels: Float32Array[], sampleRate: number, float32: boolean): Blob {
    const numChannels = channels.length;
    const numSamples = channels[0].length;
    const bytesPerSample = float32 ? 4 : 2;
    const blockAlign = numChannels * bytesPerSample;
    const byteRate = sampleRate * blockAlign;
    const dataSize = numSamples * blockAlign;
    const buffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(buffer);

    const writeAscii = (offset: number, str: string) => {
      for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
    };

    writeAscii(0, 'RIFF');
    view.setUint32(4, 36 + dataSize, true);
    writeAscii(8, 'WAVE');
    writeAscii(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, float32 ? 3 : 1, true); // 1 = PCM, 3 = IEEE Float
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bytesPerSample * 8, true);
    writeAscii(36, 'data');
    view.setUint32(40, dataSize, true);

    let offset = 44;
    for (let i = 0; i < numSamples; i++) {
      for (let ch = 0; ch < numChannels; ch++) {
        const sample = Math.max(-1, Math.min(1, channels[ch][i]));
        if (float32) {
          view.setFloat32(offset, sample, true);
          offset += 4;
        } else {
          const int16 = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
          view.setInt16(offset, int16, true);
          offset += 2;
        }
      }
    }
    return new Blob([buffer], { type: 'audio/wav' });
  }

  private drawWaveform(samples: Float32Array): void {
    const canvas = this.waveformCanvasRef?.nativeElement;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    const grad = ctx.createLinearGradient(0, 0, w, 0);
    grad.addColorStop(0, '#6366f1');
    grad.addColorStop(0.5, '#ec4899');
    grad.addColorStop(1, '#06b6d4');
    ctx.fillStyle = grad;

    const bars = 140;
    const step = Math.max(1, Math.floor(samples.length / bars));
    const barWidth = w / bars;

    for (let i = 0; i < bars; i++) {
      let peak = 0;
      for (let j = 0; j < step; j++) {
        const val = Math.abs(samples[i * step + j] || 0);
        if (val > peak) peak = val;
      }
      const barH = Math.max(4, peak * (h - 16));
      const x = i * barWidth + 1;
      const y = (h - barH) / 2;
      ctx.fillRect(x, y, Math.max(2, barWidth - 2), barH);
    }
  }

  downloadConvertedAudio(): void {
    const blob = this.audioOutputBlob();
    if (!blob) return;
    const baseName = this.audioSourceName().replace(/\.[^.]+$/, '') || 'audio';
    const ext = this.audioTargetFormat() === 'json' ? 'json' : 'wav';
    this.triggerDownload(blob, `${baseName}-${this.audioSampleRate()}Hz.${ext}`);
  }

  // =========================================================================
  // TAB 3: DATA & TABLE CONVERTER METHODS
  // =========================================================================
  loadDataExample(kind: 'products' | 'csv' | 'yaml'): void {
    if (kind === 'products') {
      this.dataSourceFormat.set('auto');
      this.dataInput.set(
        JSON.stringify(
          [
            { id: 101, name: 'Quantum Laptop Pro', category: 'Hardware', priceEur: 1499.9, inStock: true },
            { id: 102, name: 'Mechanical Cyber Keyboard', category: 'Peripherie', priceEur: 189.5, inStock: true },
            { id: 103, name: '4K OLED Studio Monitor', category: 'Displays', priceEur: 899.0, inStock: false },
            { id: 104, name: 'USB-C AI Audio Interface', category: 'Audio', priceEur: 249.0, inStock: true },
          ],
          null,
          2
        )
      );
    } else if (kind === 'csv') {
      this.dataSourceFormat.set('auto');
      this.dataInput.set(
        `mitarbeiterId;name;abteilung;standort;gehaltEur\n1;Anna Bergmann;Engineering;München;78000\n2;Lukas Weber;Product Design;Berlin;69500\n3;Sarah Klein;Data Science;Zürich;92000\n4;David König;DevOps & Cloud;Wien;74000`
      );
    } else {
      this.dataSourceFormat.set('auto');
      this.dataInput.set(
        `- service: api-gateway\n  port: 8080\n  replicas: 3\n  region: eu-central-1\n- service: auth-worker\n  port: 9000\n  replicas: 2\n  region: eu-west-1\n- service: realtime-sync\n  port: 443\n  replicas: 5\n  region: us-east-1`
      );
    }
    this.convertData();
  }

  onDataFileUpload(ev: Event): void {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      this.dataInput.set(String(reader.result || ''));
      this.convertData();
      this.notify(`✓ Datei "${file.name}" geladen und konvertiert.`);
    };
    reader.readAsText(file);
    input.value = '';
  }

  convertData(): void {
    const raw = this.dataInput().trim();
    if (!raw) {
      this.dataOutput.set('');
      this.dataRecordCount.set(0);
      return;
    }

    try {
      const srcFmt = this.dataSourceFormat() === 'auto' ? this.detectFormat(raw) : this.dataSourceFormat();
      this.detectedDataFormat.set(srcFmt);

      const records = this.parseToRecords(raw, srcFmt);
      this.dataRecordCount.set(records.length);

      const out = this.serializeRecords(records, this.dataTargetFormat());
      this.dataOutput.set(out);
    } catch (e: any) {
      this.dataOutput.set(`Konvertierungs-Hinweis: ${e?.message || 'Ungültige Struktur'}`);
    }
  }

  private detectFormat(raw: string): 'json' | 'csv' | 'tsv' | 'yaml' | 'xml' {
    if (raw.startsWith('{') || raw.startsWith('[')) return 'json';
    if (raw.startsWith('<')) return 'xml';
    if (raw.startsWith('- ') || (raw.includes(':\n') && !raw.includes(';'))) return 'yaml';
    if (raw.split('\n')[0]?.includes('\t')) return 'tsv';
    return 'csv';
  }

  private parseToRecords(raw: string, fmt: string): Record<string, any>[] {
    if (fmt === 'json') {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.map((item) => (typeof item === 'object' && item !== null ? item : { value: item }));
      }
      return [parsed];
    }

    if (fmt === 'csv' || fmt === 'tsv') {
      const lines = raw.split(/\r?\n/).filter((l) => l.trim().length > 0);
      if (!lines.length) return [];
      const firstLine = lines[0];
      const sep = fmt === 'tsv' ? '\t' : firstLine.includes(';') ? ';' : ',';
      const headers = this.splitCsvRow(firstLine, sep);
      return lines.slice(1).map((line) => {
        const vals = this.splitCsvRow(line, sep);
        const obj: Record<string, any> = {};
        headers.forEach((h, i) => {
          obj[h] = this.coercePrimitive(vals[i] ?? '');
        });
        return obj;
      });
    }

    if (fmt === 'yaml') {
      const records: Record<string, any>[] = [];
      let current: Record<string, any> = {};
      const lines = raw.split(/\r?\n/);
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        if (trimmed.startsWith('- ')) {
          if (Object.keys(current).length > 0) records.push(current);
          current = {};
          const rest = trimmed.slice(2).trim();
          if (rest.includes(':')) {
            const [k, ...vParts] = rest.split(':');
            current[k.trim()] = this.coercePrimitive(vParts.join(':').trim());
          }
        } else if (trimmed.includes(':')) {
          const [k, ...vParts] = trimmed.split(':');
          current[k.trim()] = this.coercePrimitive(vParts.join(':').trim());
        }
      }
      if (Object.keys(current).length > 0) records.push(current);
      return records;
    }

    if (fmt === 'xml') {
      const parser = new DOMParser();
      const doc = parser.parseFromString(raw, 'application/xml');
      const root = doc.documentElement;
      const children = Array.from(root.children);
      if (!children.length) return [{ [root.tagName]: root.textContent }];
      return children.map((el) => {
        const obj: Record<string, any> = {};
        Array.from(el.children).forEach((prop) => {
          obj[prop.tagName] = this.coercePrimitive(prop.textContent ?? '');
        });
        if (Object.keys(obj).length === 0) obj['value'] = el.textContent;
        return obj;
      });
    }

    return [];
  }

  private splitCsvRow(row: string, sep: string): string[] {
    const out: string[] = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < row.length; i++) {
      const ch = row[i];
      if (ch === '"') {
        inQuotes = !inQuotes;
      } else if (ch === sep && !inQuotes) {
        out.push(cur.trim());
        cur = '';
      } else {
        cur += ch;
      }
    }
    out.push(cur.trim());
    return out;
  }

  private coercePrimitive(val: string): any {
    const unquoted = val.replace(/^["']|["']$/g, '');
    if (unquoted === 'true') return true;
    if (unquoted === 'false') return false;
    if (unquoted !== '' && !Number.isNaN(Number(unquoted))) return Number(unquoted);
    return unquoted;
  }

  private serializeRecords(records: Record<string, any>[], target: DataTargetFormat): string {
    if (!records.length) return '';
    const headerSet = new Set<string>();
    for (const r of records) {
      Object.keys(r).forEach((k) => headerSet.add(k));
    }
    const headers = Array.from(headerSet);

    switch (target) {
      case 'json-pretty':
        return JSON.stringify(records, null, 2);
      case 'json-min':
        return JSON.stringify(records);
      case 'csv-comma':
      case 'csv-semi':
      case 'tsv': {
        const sep = target === 'tsv' ? '\t' : target === 'csv-semi' ? ';' : ',';
        const escapeCell = (v: any) => {
          const s = String(v ?? '');
          return s.includes(sep) || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
        };
        const rows = [
          headers.map(escapeCell).join(sep),
          ...records.map((r) => headers.map((h) => escapeCell(r[h])).join(sep)),
        ];
        return rows.join('\n');
      }
      case 'yaml': {
        return records
          .map((r) =>
            headers
              .map((h, idx) => `${idx === 0 ? '- ' : '  '}${h}: ${JSON.stringify(r[h] ?? '')}`)
              .join('\n')
          )
          .join('\n');
      }
      case 'xml': {
        const itemsXml = records
          .map((r) => {
            const fields = headers
              .map((h) => `    <${h}>${this.escapeHtml(String(r[h] ?? ''))}</${h}>`)
              .join('\n');
            return `  <item>\n${fields}\n  </item>`;
          })
          .join('\n');
        return `<?xml version="1.0" encoding="UTF-8"?>\n<dataset>\n${itemsXml}\n</dataset>`;
      }
      case 'sql': {
        const table = (this.sqlTableName() || 'items').replace(/[^a-zA-Z0-9_]/g, '');
        const cols = headers.map((h) => `\`${h}\``).join(', ');
        const lines = records.map((r) => {
          const vals = headers
            .map((h) => {
              const v = r[h];
              if (typeof v === 'number') return String(v);
              if (typeof v === 'boolean') return v ? '1' : '0';
              return `'${String(v ?? '').replace(/'/g, "''")}'`;
            })
            .join(', ');
          return `INSERT INTO \`${table}\` (${cols}) VALUES (${vals});`;
        });
        return lines.join('\n');
      }
      case 'markdown': {
        const headLine = `| ${headers.join(' | ')} |`;
        const sepLine = `| ${headers.map(() => '---').join(' | ')} |`;
        const bodyLines = records.map((r) => `| ${headers.map((h) => String(r[h] ?? '')).join(' | ')} |`);
        return [headLine, sepLine, ...bodyLines].join('\n');
      }
      case 'html': {
        const ths = headers.map((h) => `      <th>${this.escapeHtml(h)}</th>`).join('\n');
        const trs = records
          .map((r) => {
            const tds = headers.map((h) => `      <td>${this.escapeHtml(String(r[h] ?? ''))}</td>`).join('\n');
            return `    <tr>\n${tds}\n    </tr>`;
          })
          .join('\n');
        return `<table>\n  <thead>\n    <tr>\n${ths}\n    </tr>\n  </thead>\n  <tbody>\n${trs}\n  </tbody>\n</table>`;
      }
    }
  }

  private escapeHtml(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  getDataFileExtension(): string {
    const t = this.dataTargetFormat();
    if (t.startsWith('json')) return 'json';
    if (t.startsWith('csv')) return 'csv';
    if (t === 'tsv') return 'tsv';
    if (t === 'yaml') return 'yaml';
    if (t === 'xml') return 'xml';
    if (t === 'sql') return 'sql';
    if (t === 'markdown') return 'md';
    return 'html';
  }

  downloadDataOutput(): void {
    const content = this.dataOutput();
    if (!content) return;
    const ext = this.getDataFileExtension();
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    this.triggerDownload(blob, `converted-data.${ext}`);
  }

  // =========================================================================
  // TAB 4: UNITS CONVERTER METHODS
  // =========================================================================
  setUnitCategory(cat: UnitCategory): void {
    this.unitCategory.set(cat);
    const defs = this.unitCatalog[cat];
    this.unitFromId.set(defs[0].id);
  }

  // =========================================================================
  // TAB 5: COLORS, NUMBERS & TEXT/MORSE METHODS
  // =========================================================================
  updateFromHex(hexInput: string): void {
    this.colorHex.set(hexInput);
    const clean = hexInput.trim().replace(/^#/, '');
    if (/^[0-9a-fA-F]{6}$/.test(clean)) {
      const r = parseInt(clean.slice(0, 2), 16);
      const g = parseInt(clean.slice(2, 4), 16);
      const b = parseInt(clean.slice(4, 6), 16);
      this.colorRgb.set({ r, g, b });
    }
  }

  updateFromRgbString(str: string): void {
    const m = str.match(/(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
    if (!m) return;
    const r = Math.min(255, Math.max(0, +m[1]));
    const g = Math.min(255, Math.max(0, +m[2]));
    const b = Math.min(255, Math.max(0, +m[3]));
    this.colorRgb.set({ r, g, b });
    const hex = '#' + [r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('');
    this.colorHex.set(hex);
  }

  private rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
    r /= 255;
    g /= 255;
    b /= 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0;
    let s = 0;
    const l = (max + min) / 2;
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r:
          h = (g - b) / d + (g < b ? 6 : 0);
          break;
        case g:
          h = (b - r) / d + 2;
          break;
        case b:
          h = (r - g) / d + 4;
          break;
      }
      h /= 6;
    }
    return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
  }

  private rgbToCmyk(r: number, g: number, b: number): { c: number; m: number; y: number; k: number } {
    const r1 = r / 255;
    const g1 = g / 255;
    const b1 = b / 255;
    const k = 1 - Math.max(r1, g1, b1);
    if (k === 1) return { c: 0, m: 0, y: 0, k: 100 };
    const c = (1 - r1 - k) / (1 - k);
    const m = (1 - g1 - k) / (1 - k);
    const y = (1 - b1 - k) / (1 - k);
    return {
      c: Math.round(c * 100),
      m: Math.round(m * 100),
      y: Math.round(y * 100),
      k: Math.round(k * 100),
    };
  }

  private relativeLuminance(r: number, g: number, b: number): number {
    const [rs, gs, bs] = [r, g, b].map((c) => {
      const s = c / 255;
      return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
  }

  updateFromBase(value: string, base: 2 | 8 | 10 | 16): void {
    const clean = value.trim();
    if (!clean) return;
    const parsed = parseInt(clean, base);
    if (Number.isNaN(parsed) || parsed < 0) return;
    this.numDec.set(parsed.toString(10));
    this.numBin.set(parsed.toString(2));
    this.numOct.set(parsed.toString(8));
    this.numHex.set(parsed.toString(16).toUpperCase());
    this.numRoman.set(this.toRoman(parsed));
  }

  updateFromRoman(roman: string): void {
    this.numRoman.set(roman.toUpperCase());
    const val = this.fromRoman(roman.toUpperCase().trim());
    if (val > 0) {
      this.numDec.set(val.toString(10));
      this.numBin.set(val.toString(2));
      this.numOct.set(val.toString(8));
      this.numHex.set(val.toString(16).toUpperCase());
    }
  }

  private toRoman(num: number): string {
    if (num <= 0 || num > 39999) return 'N/A (1–39999)';
    const pairs: [number, string][] = [
      [1000, 'M'],
      [900, 'CM'],
      [500, 'D'],
      [400, 'CD'],
      [100, 'C'],
      [90, 'XC'],
      [50, 'L'],
      [40, 'XL'],
      [10, 'X'],
      [9, 'IX'],
      [5, 'V'],
      [4, 'IV'],
      [1, 'I'],
    ];
    let res = '';
    let n = num;
    for (const [v, sym] of pairs) {
      while (n >= v) {
        res += sym;
        n -= v;
      }
    }
    return res;
  }

  private fromRoman(s: string): number {
    const map: Record<string, number> = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };
    let total = 0;
    for (let i = 0; i < s.length; i++) {
      const cur = map[s[i]] || 0;
      const next = map[s[i + 1]] || 0;
      if (cur < next) total -= cur;
      else total += cur;
    }
    return total;
  }

  // Morse code dictionary
  private readonly morseMap: Record<string, string> = {
    A: '.-', B: '-...', C: '-.-.', D: '-..', E: '.', F: '..-.',
    G: '--.', H: '....', I: '..', J: '.---', K: '-.-', L: '.-..',
    M: '--', N: '-.', O: '---', P: '.--.', Q: '--.-', R: '.-.',
    S: '...', T: '-', U: '..-', V: '...-', W: '.--', X: '-..-',
    Y: '-.--', Z: '--..',
    '0': '-----', '1': '.----', '2': '..---', '3': '...--', '4': '....-',
    '5': '.....', '6': '-....', '7': '--...', '8': '---..', '9': '----.',
    ' ': '/',
  };

  updateFromPlainText(txt: string): void {
    this.plainText.set(txt);
    const morse = Array.from(txt.toUpperCase())
      .map((ch) => this.morseMap[ch] || '')
      .filter(Boolean)
      .join(' ');
    this.morseText.set(morse);

    const bin = Array.from(txt)
      .map((ch) => ch.charCodeAt(0).toString(2).padStart(8, '0'))
      .join(' ');
    this.binaryText.set(bin);
  }

  updateFromMorse(morse: string): void {
    this.morseText.set(morse);
    const rev: Record<string, string> = {};
    Object.entries(this.morseMap).forEach(([k, v]) => (rev[v] = k));
    const plain = morse
      .trim()
      .split(/\s+/)
      .map((token) => rev[token] || '')
      .join('');
    this.plainText.set(plain);
    const bin = Array.from(plain)
      .map((ch) => ch.charCodeAt(0).toString(2).padStart(8, '0'))
      .join(' ');
    this.binaryText.set(bin);
  }

  updateFromBinaryText(bin: string): void {
    this.binaryText.set(bin);
    const plain = bin
      .trim()
      .split(/\s+/)
      .map((b) => {
        const code = parseInt(b, 2);
        return Number.isNaN(code) ? '' : String.fromCharCode(code);
      })
      .join('');
    this.plainText.set(plain);
    const morse = Array.from(plain.toUpperCase())
      .map((ch) => this.morseMap[ch] || '')
      .filter(Boolean)
      .join(' ');
    this.morseText.set(morse);
  }

  playMorseAudio(): void {
    const code = this.morseText();
    if (!code) return;
    const ctx = new AudioContext();
    let t = ctx.currentTime + 0.05;
    const dot = 0.07;

    for (const ch of code) {
      if (ch === '.' || ch === '•') {
        this.scheduleBeep(ctx, t, dot);
        t += dot * 2;
      } else if (ch === '-') {
        this.scheduleBeep(ctx, t, dot * 3);
        t += dot * 4;
      } else if (ch === ' ') {
        t += dot * 2;
      } else if (ch === '/') {
        t += dot * 5;
      }
    }
    this.notify('🔊 Spiele Morsecode-Audiosignal ab...');
  }

  private scheduleBeep(ctx: AudioContext, start: number, duration: number): void {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 680;
    gain.gain.setValueAtTime(0.25, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(start);
    osc.stop(start + duration);
  }

  private triggerDownload(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2500);
  }
}
