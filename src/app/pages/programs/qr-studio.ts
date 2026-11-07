import {
  AfterViewInit,
  Component,
  ElementRef,
  ViewChild,
  computed,
  effect,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import QRCode, { QRCodeErrorCorrectionLevel } from 'qrcode';

export type QrMode = 'url' | 'wifi' | 'vcard' | 'contact' | 'text';
export type ContactSubMode = 'whatsapp' | 'email' | 'sms';
export type ModuleStyle = 'square' | 'rounded' | 'dots';
export type FinderStyle = 'square' | 'rounded' | 'circle';
export type WifiEncryption = 'WPA' | 'WEP' | 'nopass';

export interface ColorPreset {
  id: string;
  name: string;
  fg1: string;
  fg2: string;
  bg: string;
  useGradient: boolean;
}

@Component({
  selector: 'app-qr-studio',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="tool-page">
      <div class="topbar">
        <a routerLink="/" class="back-btn">← Zurück zur Übersicht</a>
        <span class="crumb-pill">⚡ PROGRAMME • QR &amp; WIFI STUDIO</span>
      </div>

      <section class="tool-card glass-panel">
        <div class="tool-header">
          <div class="tool-icon">📱</div>
          <div>
            <h1>QR-Code &amp; WLAN-Karten Studio</h1>
            <p>
              Erstelle individuell designte, 100% scannbare QR-Codes mit Farbverläufen, Logos,
              vCards und druckfertigen WLAN-Gast-Karten.
            </p>
          </div>
        </div>

        <!-- Mode Tabs -->
        <div class="mode-tabs" role="tablist">
          <button
            type="button"
            class="mode-tab"
            [class.active]="mode() === 'url'"
            (click)="setMode('url')"
          >
            <span>🌐</span> Website / URL
          </button>
          <button
            type="button"
            class="mode-tab"
            [class.active]="mode() === 'wifi'"
            (click)="setMode('wifi')"
          >
            <span>📶</span> WLAN-Gast-Zugang
          </button>
          <button
            type="button"
            class="mode-tab"
            [class.active]="mode() === 'vcard'"
            (click)="setMode('vcard')"
          >
            <span>👤</span> Visitenkarte (vCard)
          </button>
          <button
            type="button"
            class="mode-tab"
            [class.active]="mode() === 'contact'"
            (click)="setMode('contact')"
          >
            <span>💬</span> WhatsApp / E-Mail / SMS
          </button>
          <button
            type="button"
            class="mode-tab"
            [class.active]="mode() === 'text'"
            (click)="setMode('text')"
          >
            <span>📝</span> Freitext / Notiz
          </button>
        </div>

        <div class="studio-layout">
          <!-- Left Column: Content & Styling Controls -->
          <div class="studio-controls">
            <!-- 1. URL Mode -->
            @if (mode() === 'url') {
              <div class="panel-section">
                <div class="section-head">
                  <h3>🌐 Ziel-URL eingeben</h3>
                  <span class="badge-hint">Direkt-Link</span>
                </div>
                <div class="field-group">
                  <label>Website-Adresse (HTTPS)</label>
                  <input
                    type="url"
                    class="text-input"
                    placeholder="https://deine-website.de"
                    [ngModel]="urlInput()"
                    (ngModelChange)="urlInput.set($event)"
                  />
                </div>
                <div class="quick-chips">
                  <span class="chip-label">Schnell-Vorlagen:</span>
                  <button
                    type="button"
                    class="chip-btn"
                    (click)="urlInput.set('https://github.com/')"
                  >
                    GitHub Profil
                  </button>
                  <button
                    type="button"
                    class="chip-btn"
                    (click)="urlInput.set('https://linkedin.com/in/')"
                  >
                    LinkedIn
                  </button>
                  <button
                    type="button"
                    class="chip-btn"
                    (click)="urlInput.set('https://maps.google.com/?q=Berlin')"
                  >
                    Google Maps Standort
                  </button>
                  <button
                    type="button"
                    class="chip-btn"
                    (click)="urlInput.set('https://youtube.com/')"
                  >
                    YouTube Kanal
                  </button>
                </div>
              </div>
            }

            <!-- 2. Wi-Fi Mode -->
            @if (mode() === 'wifi') {
              <div class="panel-section">
                <div class="section-head">
                  <h3>📶 WLAN-Zugangsdaten</h3>
                  <label class="card-toggle-pill">
                    <input
                      type="checkbox"
                      [ngModel]="showWifiCard()"
                      (ngModelChange)="showWifiCard.set($event)"
                    />
                    <span>🪪 Druckbare WLAN-Gast-Karte</span>
                  </label>
                </div>

                <div class="form-grid-2">
                  <div class="field-group">
                    <label>WLAN-Name (SSID)</label>
                    <input
                      type="text"
                      class="text-input"
                      placeholder="z.B. Gast-WLAN 5G"
                      [ngModel]="wifiSsid()"
                      (ngModelChange)="wifiSsid.set($event)"
                    />
                  </div>
                  <div class="field-group">
                    <label>Verschlüsselung</label>
                    <select
                      class="select-input"
                      [ngModel]="wifiEncryption()"
                      (ngModelChange)="wifiEncryption.set($event)"
                    >
                      <option value="WPA">WPA / WPA2 / WPA3 (Standard)</option>
                      <option value="WEP">WEP (Veraltet)</option>
                      <option value="nopass">Offenes Netzwerk (Kein Passwort)</option>
                    </select>
                  </div>
                </div>

                @if (wifiEncryption() !== 'nopass') {
                  <div class="field-group">
                    <label>WLAN-Passwort</label>
                    <input
                      type="text"
                      class="text-input mono"
                      placeholder="Sicheres Gäste-Passwort..."
                      [ngModel]="wifiPassword()"
                      (ngModelChange)="wifiPassword.set($event)"
                    />
                  </div>
                }

                <div class="toggles-row">
                  <label class="check-pill">
                    <input
                      type="checkbox"
                      [ngModel]="wifiHidden()"
                      (ngModelChange)="wifiHidden.set($event)"
                    />
                    <span>Verstecktes Netzwerk (Hidden SSID)</span>
                  </label>
                  <label class="check-pill">
                    <input
                      type="checkbox"
                      [ngModel]="wifiShowPwdOnCard()"
                      (ngModelChange)="wifiShowPwdOnCard.set($event)"
                    />
                    <span>Passwort im Klartext auf Karte drucken</span>
                  </label>
                </div>

                <div class="field-group">
                  <label>Karten-Untertitel / Willkommensgruß</label>
                  <input
                    type="text"
                    class="text-input"
                    placeholder="Mit Kamera scannen zum automatischen Verbinden"
                    [ngModel]="wifiCardNote()"
                    (ngModelChange)="wifiCardNote.set($event)"
                  />
                </div>
              </div>
            }

            <!-- 3. vCard Mode -->
            @if (mode() === 'vcard') {
              <div class="panel-section">
                <div class="section-head">
                  <h3>👤 Digitale Visitenkarte (vCard 3.0)</h3>
                  <span class="badge-hint">iOS &amp; Android Direkt-Import</span>
                </div>
                <div class="form-grid-2">
                  <div class="field-group">
                    <label>Vorname</label>
                    <input
                      type="text"
                      class="text-input"
                      placeholder="Max"
                      [ngModel]="vcardFirstName()"
                      (ngModelChange)="vcardFirstName.set($event)"
                    />
                  </div>
                  <div class="field-group">
                    <label>Nachname</label>
                    <input
                      type="text"
                      class="text-input"
                      placeholder="Mustermann"
                      [ngModel]="vcardLastName()"
                      (ngModelChange)="vcardLastName.set($event)"
                    />
                  </div>
                  <div class="field-group">
                    <label>Telefon / Mobil</label>
                    <input
                      type="tel"
                      class="text-input"
                      placeholder="+49 170 1234567"
                      [ngModel]="vcardPhone()"
                      (ngModelChange)="vcardPhone.set($event)"
                    />
                  </div>
                  <div class="field-group">
                    <label>E-Mail-Adresse</label>
                    <input
                      type="email"
                      class="text-input"
                      placeholder="max@beispiel.de"
                      [ngModel]="vcardEmail()"
                      (ngModelChange)="vcardEmail.set($event)"
                    />
                  </div>
                  <div class="field-group">
                    <label>Firma / Organisation</label>
                    <input
                      type="text"
                      class="text-input"
                      placeholder="AllInOne Studio GmbH"
                      [ngModel]="vcardOrg()"
                      (ngModelChange)="vcardOrg.set($event)"
                    />
                  </div>
                  <div class="field-group">
                    <label>Position / Rolle</label>
                    <input
                      type="text"
                      class="text-input"
                      placeholder="Lead Developer"
                      [ngModel]="vcardTitle()"
                      (ngModelChange)="vcardTitle.set($event)"
                    />
                  </div>
                </div>
                <div class="field-group">
                  <label>Website</label>
                  <input
                    type="url"
                    class="text-input"
                    placeholder="https://beispiel.de"
                    [ngModel]="vcardUrl()"
                    (ngModelChange)="vcardUrl.set($event)"
                  />
                </div>
              </div>
            }

            <!-- 4. Contact / Messaging Mode -->
            @if (mode() === 'contact') {
              <div class="panel-section">
                <div class="section-head">
                  <h3>💬 Direkt-Nachricht starten</h3>
                  <div class="sub-pills">
                    <button
                      type="button"
                      class="sub-pill"
                      [class.active]="contactSubMode() === 'whatsapp'"
                      (click)="contactSubMode.set('whatsapp')"
                    >
                      🟢 WhatsApp
                    </button>
                    <button
                      type="button"
                      class="sub-pill"
                      [class.active]="contactSubMode() === 'email'"
                      (click)="contactSubMode.set('email')"
                    >
                      ✉️ E-Mail
                    </button>
                    <button
                      type="button"
                      class="sub-pill"
                      [class.active]="contactSubMode() === 'sms'"
                      (click)="contactSubMode.set('sms')"
                    >
                      📲 SMS
                    </button>
                  </div>
                </div>

                @if (contactSubMode() === 'whatsapp') {
                  <div class="field-group">
                    <label>WhatsApp Nummer (inkl. Ländervorwahl ohne +)</label>
                    <input
                      type="tel"
                      class="text-input"
                      placeholder="491701234567"
                      [ngModel]="contactTarget()"
                      (ngModelChange)="contactTarget.set($event)"
                    />
                  </div>
                }

                @if (contactSubMode() === 'email') {
                  <div class="form-grid-2">
                    <div class="field-group">
                      <label>Empfänger E-Mail</label>
                      <input
                        type="email"
                        class="text-input"
                        placeholder="kontakt@firma.de"
                        [ngModel]="contactEmail()"
                        (ngModelChange)="contactEmail.set($event)"
                      />
                    </div>
                    <div class="field-group">
                      <label>Betreff (Subject)</label>
                      <input
                        type="text"
                        class="text-input"
                        placeholder="Anfrage über QR-Code"
                        [ngModel]="contactSubject()"
                        (ngModelChange)="contactSubject.set($event)"
                      />
                    </div>
                  </div>
                }

                @if (contactSubMode() === 'sms') {
                  <div class="field-group">
                    <label>Ziel-Telefonnummer</label>
                    <input
                      type="tel"
                      class="text-input"
                      placeholder="+491701234567"
                      [ngModel]="contactTarget()"
                      (ngModelChange)="contactTarget.set($event)"
                    />
                  </div>
                }

                <div class="field-group">
                  <label>Vorausgefüllte Nachricht</label>
                  <textarea
                    rows="3"
                    class="text-input textarea"
                    placeholder="Hallo! Ich habe deinen QR-Code gescannt..."
                    [ngModel]="contactMessage()"
                    (ngModelChange)="contactMessage.set($event)"
                  ></textarea>
                </div>
              </div>
            }

            <!-- 5. Free Text Mode -->
            @if (mode() === 'text') {
              <div class="panel-section">
                <div class="section-head">
                  <h3>📝 Freitext / Notiz / Seriennummer</h3>
                  <span class="badge-hint">{{ textInput().length }} Zeichen</span>
                </div>
                <div class="field-group">
                  <label>Beliebiger Text-Inhalt</label>
                  <textarea
                    rows="4"
                    class="text-input textarea"
                    placeholder="Gib hier beliebigen Text, Notizen, Codes oder JSON-Daten ein..."
                    [ngModel]="textInput()"
                    (ngModelChange)="textInput.set($event)"
                  ></textarea>
                </div>
              </div>
            }

            <!-- DESIGN & STYLING SECTION -->
            <div class="panel-section">
              <div class="section-head">
                <h3>🎨 Design &amp; Styling</h3>
                <span class="badge-hint">Echtzeit-Matrix</span>
              </div>

              <!-- Style Presets -->
              <div class="field-group">
                <label>Farb-Schemata (Presets)</label>
                <div class="preset-grid">
                  @for (preset of colorPresets; track preset.id) {
                    <button
                      type="button"
                      class="preset-chip"
                      [class.active]="activePresetId() === preset.id"
                      (click)="applyColorPreset(preset)"
                    >
                      <span
                        class="preset-swatch"
                        [style.background]="
                          preset.useGradient
                            ? 'linear-gradient(135deg, ' + preset.fg1 + ', ' + preset.fg2 + ')'
                            : preset.fg1
                        "
                      ></span>
                      <span>{{ preset.name }}</span>
                    </button>
                  }
                </div>
              </div>

              <div class="form-grid-2">
                <!-- Module Dot Style -->
                <div class="field-group">
                  <label>Punkt-Stil (Module)</label>
                  <div class="seg-group">
                    <button
                      type="button"
                      class="seg-btn"
                      [class.active]="moduleStyle() === 'square'"
                      (click)="moduleStyle.set('square')"
                    >
                      ⬛ Klassisch
                    </button>
                    <button
                      type="button"
                      class="seg-btn"
                      [class.active]="moduleStyle() === 'rounded'"
                      (click)="moduleStyle.set('rounded')"
                    >
                      ▢ Abgerundet
                    </button>
                    <button
                      type="button"
                      class="seg-btn"
                      [class.active]="moduleStyle() === 'dots'"
                      (click)="moduleStyle.set('dots')"
                    >
                      ⚫ Kreispunkte
                    </button>
                  </div>
                </div>

                <!-- Finder Pattern Style -->
                <div class="field-group">
                  <label>Eck-Augen-Stil (Finder)</label>
                  <div class="seg-group">
                    <button
                      type="button"
                      class="seg-btn"
                      [class.active]="finderStyle() === 'square'"
                      (click)="finderStyle.set('square')"
                    >
                      ▣ Eckig
                    </button>
                    <button
                      type="button"
                      class="seg-btn"
                      [class.active]="finderStyle() === 'rounded'"
                      (click)="finderStyle.set('rounded')"
                    >
                      回 Soft
                    </button>
                    <button
                      type="button"
                      class="seg-btn"
                      [class.active]="finderStyle() === 'circle'"
                      (click)="finderStyle.set('circle')"
                    >
                      ◎ Kreis
                    </button>
                  </div>
                </div>
              </div>

              <!-- Colors & Gradient -->
              <div class="color-controls-row">
                <div class="color-picker-item">
                  <label>Vordergrund 1</label>
                  <div class="color-input-wrap">
                    <input
                      type="color"
                      [ngModel]="fgColor1()"
                      (ngModelChange)="fgColor1.set($event); activePresetId.set('custom')"
                    />
                    <code>{{ fgColor1() }}</code>
                  </div>
                </div>

                <div class="color-picker-item">
                  <label class="grad-toggle-label">
                    <input
                      type="checkbox"
                      [ngModel]="useGradient()"
                      (ngModelChange)="useGradient.set($event); activePresetId.set('custom')"
                    />
                    <span>Verlauf (Farbe 2)</span>
                  </label>
                  <div class="color-input-wrap" [class.disabled]="!useGradient()">
                    <input
                      type="color"
                      [disabled]="!useGradient()"
                      [ngModel]="fgColor2()"
                      (ngModelChange)="fgColor2.set($event); activePresetId.set('custom')"
                    />
                    <code>{{ fgColor2() }}</code>
                  </div>
                </div>

                <div class="color-picker-item">
                  <label>Hintergrund</label>
                  <div class="color-input-wrap">
                    <input
                      type="color"
                      [ngModel]="bgColor()"
                      (ngModelChange)="bgColor.set($event); activePresetId.set('custom')"
                    />
                    <code>{{ bgColor() }}</code>
                  </div>
                </div>
              </div>

              <!-- Center Logo / Emoji & Size -->
              <div class="field-group">
                <div class="logo-header-row">
                  <label>Logo / Icon in der Mitte</label>
                  @if (hasActiveLogo()) {
                    <span class="ec-badge">🛡️ Fehlerkorrektur H (30%) aktiv</span>
                  }
                </div>
                <div class="emoji-bar">
                  @for (emo of emojiOptions; track emo.value) {
                    <button
                      type="button"
                      class="emoji-btn"
                      [class.active]="!customLogoDataUrl() && centerEmoji() === emo.value"
                      (click)="selectEmoji(emo.value)"
                      [title]="emo.label"
                    >
                      {{ emo.value === '' ? 'Keins' : emo.value }}
                    </button>
                  }
                  <label class="upload-logo-btn">
                    <input type="file" accept="image/*" (change)="onLogoUpload($event)" hidden />
                    <span>📁 Eigenes Bild</span>
                  </label>
                  @if (customLogoDataUrl()) {
                    <button
                      type="button"
                      class="clear-logo-btn"
                      (click)="clearCustomLogo()"
                    >
                      ✕ Bild entfernen
                    </button>
                  }
                </div>
              </div>

              <div class="form-grid-2">
                <div class="field-group">
                  <label>Bildgröße: <strong>{{ qrSize() }} × {{ qrSize() }} px</strong></label>
                  <input
                    type="range"
                    min="240"
                    max="800"
                    step="20"
                    [ngModel]="qrSize()"
                    (ngModelChange)="qrSize.set(+$event)"
                  />
                </div>

                <div class="field-group">
                  <label>Fehlerkorrektur-Level</label>
                  <select
                    class="select-input"
                    [ngModel]="effectiveErrorCorrection()"
                    [disabled]="hasActiveLogo()"
                    (ngModelChange)="errorCorrection.set($event)"
                  >
                    <option value="L">L — Niedrig (~7% Reserve)</option>
                    <option value="M">M — Standard (~15% Reserve)</option>
                    <option value="Q">Q — Hoch (~25% Reserve)</option>
                    <option value="H">H — Maximum (~30% für Logos)</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <!-- Right Column: Live QR Preview & Export -->
          <div class="studio-preview">
            <div class="preview-card glass-panel">
              <div class="preview-top">
                <span class="preview-badge">
                  <span class="live-dot"></span> LIVE VORSCHAU
                </span>
                <span class="matrix-meta">
                  Matrix {{ matrixSize() }}×{{ matrixSize() }} • EC-{{ effectiveErrorCorrection() }}
                </span>
              </div>

              <!-- Standard QR Canvas or Printable Wi-Fi Card Preview -->
              <div class="canvas-stage" [class.wifi-card-stage]="mode() === 'wifi' && showWifiCard()">
                @if (mode() === 'wifi' && showWifiCard()) {
                  <div class="wifi-printable-card">
                    <div class="wifi-card-head">
                      <span class="wifi-card-badge">📶 GÄSTE-WLAN</span>
                      <h4>{{ wifiSsid() || 'Gast-Netzwerk' }}</h4>
                      <p>{{ wifiCardNote() || 'Mit Kamera scannen zum Verbinden' }}</p>
                    </div>
                    <div class="wifi-qr-holder">
                      <canvas #qrCanvas class="qr-canvas"></canvas>
                    </div>
                    <div class="wifi-card-foot">
                      <div class="wifi-cred-row">
                        <span class="cred-label">Netzwerk (SSID)</span>
                        <strong class="cred-val">{{ wifiSsid() || '—' }}</strong>
                      </div>
                      @if (wifiEncryption() !== 'nopass' && wifiShowPwdOnCard()) {
                        <div class="wifi-cred-row">
                          <span class="cred-label">Passwort</span>
                          <code class="cred-pwd">{{ wifiPassword() || '—' }}</code>
                        </div>
                      }
                      <div class="wifi-scan-hint">
                        <span>📷 Kamera-App öffnen &amp; auf QR-Code richten</span>
                      </div>
                    </div>
                  </div>
                } @else {
                  <div class="qr-canvas-frame">
                    <canvas #qrCanvas class="qr-canvas"></canvas>
                  </div>
                }
              </div>

              <!-- Export Actions -->
              <div class="export-actions">
                <button type="button" class="btn-primary full-btn" (click)="downloadPng()">
                  📥 Als PNG herunterladen ({{ qrSize() }}px)
                </button>

                @if (mode() === 'wifi') {
                  <button type="button" class="btn-wifi-card full-btn" (click)="downloadWifiCardPng()">
                    🪪 WLAN-Karte als PNG speichern (Druckfertig)
                  </button>
                }

                <div class="export-row-2">
                  <button type="button" class="btn-secondary" (click)="downloadSvg()">
                    📐 Als SVG Vektor
                  </button>
                  <button type="button" class="btn-secondary" (click)="copyQrImageOrPayload()">
                    {{ copyStatus() ? '✓ ' + copyStatus() : '📋 Bild / Payload kopieren' }}
                  </button>
                </div>
              </div>

              <!-- Raw Payload Inspector -->
              <div class="payload-inspector">
                <div class="payload-head">
                  <span>Kodierter QR-Payload</span>
                  <button type="button" class="mini-copy" (click)="copyPayloadText()">
                    Text kopieren
                  </button>
                </div>
                <code class="payload-code">{{ qrPayload() }}</code>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  `,
  styles: [`
    .tool-page { display: flex; flex-direction: column; gap: 1.5rem; padding-bottom: 3rem; }
    .topbar { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.75rem; }
    .back-btn { padding: 0.55rem 1rem; border-radius: 12px; background: rgba(255,255,255,0.05); border: 1px solid var(--border-subtle); color: var(--text-secondary); font-weight: 600; font-size: 0.88rem; transition: all 0.2s ease; }
    .back-btn:hover { background: rgba(255,255,255,0.1); color: var(--text-primary); }
    .crumb-pill { font-size: 0.78rem; font-weight: 700; color: #38bdf8; background: rgba(6,182,212,0.14); padding: 0.35rem 0.85rem; border-radius: 999px; border: 1px solid rgba(6,182,212,0.28); }

    .tool-card { padding: 2rem; display: flex; flex-direction: column; gap: 1.65rem; }
    .tool-header { display: flex; align-items: center; gap: 1.2rem; }
    .tool-icon { width: 58px; height: 58px; border-radius: 16px; background: linear-gradient(135deg, #06b6d4, #6366f1); display: grid; place-items: center; font-size: 1.8rem; flex-shrink: 0; box-shadow: 0 10px 24px -6px rgba(6,182,212,0.45); }
    .tool-header h1 { margin: 0; font-family: var(--font-display); font-size: 1.75rem; }
    .tool-header p { margin: 0.25rem 0 0; color: var(--text-secondary); font-size: 0.95rem; }

    /* Mode Tabs */
    .mode-tabs { display: flex; flex-wrap: wrap; gap: 0.6rem; padding: 0.45rem; border-radius: 16px; background: rgba(0,0,0,0.35); border: 1px solid var(--border-subtle); }
    .mode-tab { flex: 1 1 auto; display: inline-flex; align-items: center; justify-content: center; gap: 0.5rem; padding: 0.7rem 1rem; border-radius: 11px; border: 1px solid transparent; background: transparent; color: var(--text-secondary); font-weight: 600; font-size: 0.88rem; cursor: pointer; transition: all 0.2s ease; }
    .mode-tab:hover { color: var(--text-primary); background: rgba(255,255,255,0.04); }
    .mode-tab.active { background: linear-gradient(135deg, rgba(6,182,212,0.22), rgba(99,102,241,0.24)); border-color: rgba(6,182,212,0.45); color: #f8fafc; box-shadow: 0 4px 14px -4px rgba(6,182,212,0.35); }

    /* Studio Grid Layout */
    .studio-layout { display: grid; grid-template-columns: 1.25fr 0.95fr; gap: 1.65rem; align-items: start; }
    @media (max-width: 980px) {
      .studio-layout { grid-template-columns: 1fr; }
    }

    .studio-controls { display: flex; flex-direction: column; gap: 1.25rem; }
    .panel-section { padding: 1.35rem; border-radius: 16px; background: rgba(255,255,255,0.025); border: 1px solid var(--border-subtle); display: flex; flex-direction: column; gap: 1rem; }
    .section-head { display: flex; justify-content: space-between; align-items: center; gap: 0.75rem; flex-wrap: wrap; }
    .section-head h3 { margin: 0; font-size: 1.02rem; font-family: var(--font-display); color: var(--text-primary); }
    .badge-hint { font-size: 0.75rem; font-weight: 600; padding: 0.25rem 0.65rem; border-radius: 999px; background: rgba(99,102,241,0.16); color: #a5b4fc; border: 1px solid rgba(99,102,241,0.3); }

    .card-toggle-pill { display: inline-flex; align-items: center; gap: 0.45rem; padding: 0.32rem 0.75rem; border-radius: 999px; background: rgba(16,185,129,0.15); border: 1px solid rgba(16,185,129,0.35); color: #6ee7b7; font-size: 0.78rem; font-weight: 600; cursor: pointer; }

    .form-grid-2 { display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 0.9rem; }
    .field-group { display: flex; flex-direction: column; gap: 0.42rem; }
    .field-group label { font-size: 0.82rem; font-weight: 600; color: var(--text-secondary); }
    .field-group input[type='range'] { width: 100%; accent-color: #06b6d4; cursor: pointer; }

    .text-input, .select-input { width: 100%; padding: 0.72rem 0.95rem; border-radius: 11px; border: 1px solid var(--border-subtle); background: rgba(0,0,0,0.42); color: var(--text-primary); font-size: 0.9rem; font-family: inherit; outline: none; transition: border-color 0.2s ease, box-shadow 0.2s ease; }
    .text-input:focus, .select-input:focus { border-color: #06b6d4; box-shadow: 0 0 0 3px rgba(6,182,212,0.16); }
    .text-input.mono { font-family: var(--font-mono); color: #6ee7b7; }
    .textarea { resize: vertical; min-height: 76px; }

    .quick-chips { display: flex; align-items: center; flex-wrap: wrap; gap: 0.45rem; }
    .chip-label { font-size: 0.78rem; color: var(--text-muted); margin-right: 0.2rem; }
    .chip-btn { padding: 0.32rem 0.7rem; border-radius: 8px; border: 1px solid var(--border-subtle); background: rgba(255,255,255,0.04); color: var(--text-secondary); font-size: 0.78rem; cursor: pointer; transition: all 0.18s ease; }
    .chip-btn:hover { background: rgba(6,182,212,0.15); color: #38bdf8; border-color: rgba(6,182,212,0.35); }

    .toggles-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 0.65rem; }
    .check-pill { display: flex; align-items: center; gap: 0.55rem; padding: 0.65rem 0.9rem; border-radius: 11px; background: rgba(255,255,255,0.035); border: 1px solid var(--border-subtle); cursor: pointer; font-size: 0.85rem; color: var(--text-primary); }

    /* Sub-pills for Contact Mode */
    .sub-pills { display: flex; gap: 0.4rem; }
    .sub-pill { padding: 0.35rem 0.75rem; border-radius: 9px; border: 1px solid var(--border-subtle); background: rgba(255,255,255,0.04); color: var(--text-secondary); font-size: 0.8rem; font-weight: 600; cursor: pointer; }
    .sub-pill.active { background: rgba(6,182,212,0.2); border-color: #06b6d4; color: #fff; }

    /* Presets */
    .preset-grid { display: flex; flex-wrap: wrap; gap: 0.5rem; }
    .preset-chip { display: inline-flex; align-items: center; gap: 0.45rem; padding: 0.42rem 0.75rem; border-radius: 10px; border: 1px solid var(--border-subtle); background: rgba(0,0,0,0.35); color: var(--text-secondary); font-size: 0.8rem; font-weight: 600; cursor: pointer; transition: all 0.18s ease; }
    .preset-chip:hover { border-color: var(--border-highlight); color: var(--text-primary); }
    .preset-chip.active { border-color: #06b6d4; background: rgba(6,182,212,0.14); color: #fff; }
    .preset-swatch { width: 14px; height: 14px; border-radius: 4px; border: 1px solid rgba(255,255,255,0.25); }

    /* Segmented Buttons */
    .seg-group { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.4rem; }
    .seg-btn { padding: 0.55rem 0.5rem; border-radius: 9px; border: 1px solid var(--border-subtle); background: rgba(0,0,0,0.35); color: var(--text-secondary); font-size: 0.79rem; font-weight: 600; cursor: pointer; transition: all 0.18s ease; }
    .seg-btn:hover { color: var(--text-primary); background: rgba(255,255,255,0.06); }
    .seg-btn.active { background: rgba(99,102,241,0.24); border-color: #6366f1; color: #fff; }

    /* Color Pickers */
    .color-controls-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 0.75rem; }
    .color-picker-item { display: flex; flex-direction: column; gap: 0.4rem; }
    .color-picker-item label { font-size: 0.8rem; font-weight: 600; color: var(--text-secondary); }
    .grad-toggle-label { display: inline-flex; align-items: center; gap: 0.4rem; cursor: pointer; }
    .color-input-wrap { display: flex; align-items: center; gap: 0.55rem; padding: 0.4rem 0.65rem; border-radius: 10px; background: rgba(0,0,0,0.4); border: 1px solid var(--border-subtle); }
    .color-input-wrap.disabled { opacity: 0.4; pointer-events: none; }
    .color-input-wrap input[type='color'] { width: 28px; height: 28px; border: none; background: none; cursor: pointer; padding: 0; }
    .color-input-wrap code { font-family: var(--font-mono); font-size: 0.78rem; color: var(--text-secondary); }

    /* Emoji & Logo Bar */
    .logo-header-row { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem; }
    .ec-badge { font-size: 0.74rem; font-weight: 600; color: #6ee7b7; background: rgba(16,185,129,0.14); padding: 0.18rem 0.55rem; border-radius: 999px; }
    .emoji-bar { display: flex; flex-wrap: wrap; gap: 0.42rem; align-items: center; }
    .emoji-btn { min-width: 40px; height: 38px; padding: 0 0.6rem; border-radius: 9px; border: 1px solid var(--border-subtle); background: rgba(0,0,0,0.35); color: var(--text-secondary); font-size: 0.95rem; cursor: pointer; transition: all 0.18s ease; }
    .emoji-btn:hover { border-color: var(--border-highlight); color: var(--text-primary); }
    .emoji-btn.active { background: rgba(6,182,212,0.22); border-color: #06b6d4; color: #fff; }
    .upload-logo-btn { display: inline-flex; align-items: center; height: 38px; padding: 0 0.8rem; border-radius: 9px; border: 1px dashed rgba(6,182,212,0.5); background: rgba(6,182,212,0.1); color: #38bdf8; font-size: 0.8rem; font-weight: 600; cursor: pointer; }
    .upload-logo-btn:hover { background: rgba(6,182,212,0.2); }
    .clear-logo-btn { height: 38px; padding: 0 0.7rem; border-radius: 9px; border: 1px solid rgba(244,63,94,0.4); background: rgba(244,63,94,0.14); color: #fda4af; font-size: 0.78rem; cursor: pointer; }

    /* Preview Column */
    .studio-preview { position: sticky; top: 1.25rem; }
    .preview-card { padding: 1.5rem; display: flex; flex-direction: column; gap: 1.25rem; background: rgba(12, 17, 28, 0.84); }
    .preview-top { display: flex; justify-content: space-between; align-items: center; }
    .preview-badge { display: inline-flex; align-items: center; gap: 0.45rem; font-size: 0.76rem; font-weight: 700; color: #6ee7b7; letter-spacing: 0.04em; }
    .live-dot { width: 8px; height: 8px; border-radius: 50%; background: #10b981; box-shadow: 0 0 8px #10b981; }
    .matrix-meta { font-family: var(--font-mono); font-size: 0.76rem; color: var(--text-muted); }

    .canvas-stage { display: flex; justify-content: center; align-items: center; padding: 1.35rem; border-radius: 18px; background: radial-gradient(circle at center, rgba(99,102,241,0.12), rgba(0,0,0,0.45)); border: 1px solid var(--border-subtle); }
    .qr-canvas-frame { display: inline-flex; padding: 0.65rem; border-radius: 18px; background: rgba(255,255,255,0.04); box-shadow: 0 18px 40px -12px rgba(0,0,0,0.65); }
    .qr-canvas { width: 100%; max-width: 290px; height: auto; border-radius: 12px; display: block; }

    /* Printable Wi-Fi Card Preview */
    .wifi-printable-card { width: 100%; max-width: 340px; padding: 1.35rem; border-radius: 18px; background: linear-gradient(160deg, #0f172a 0%, #1e1b4b 100%); border: 1px solid rgba(99,102,241,0.4); box-shadow: 0 20px 45px -15px rgba(0,0,0,0.75); display: flex; flex-direction: column; align-items: center; gap: 1rem; text-align: center; }
    .wifi-card-head { display: flex; flex-direction: column; align-items: center; gap: 0.25rem; }
    .wifi-card-badge { font-size: 0.7rem; font-weight: 800; letter-spacing: 0.08em; padding: 0.22rem 0.65rem; border-radius: 999px; background: rgba(6,182,212,0.2); color: #38bdf8; }
    .wifi-card-head h4 { margin: 0.2rem 0 0; font-size: 1.25rem; font-family: var(--font-display); color: #fff; }
    .wifi-card-head p { margin: 0; font-size: 0.78rem; color: #94a3b8; }
    .wifi-qr-holder { padding: 0.55rem; border-radius: 14px; background: rgba(255,255,255,0.06); }
    .wifi-card-foot { width: 100%; display: flex; flex-direction: column; gap: 0.45rem; padding-top: 0.5rem; border-top: 1px solid rgba(255,255,255,0.1); }
    .wifi-cred-row { display: flex; justify-content: space-between; align-items: center; font-size: 0.82rem; padding: 0.35rem 0.65rem; border-radius: 8px; background: rgba(0,0,0,0.3); }
    .cred-label { color: #94a3b8; }
    .cred-val { color: #f8fafc; }
    .cred-pwd { font-family: var(--font-mono); color: #6ee7b7; font-weight: 600; }
    .wifi-scan-hint { font-size: 0.74rem; color: #a5b4fc; margin-top: 0.2rem; }

    /* Export Buttons */
    .export-actions { display: flex; flex-direction: column; gap: 0.65rem; }
    .full-btn { width: 100%; }
    .btn-wifi-card { display: inline-flex; align-items: center; justify-content: center; gap: 0.5rem; padding: 0.75rem 1.2rem; border-radius: 12px; border: 1px solid rgba(16,185,129,0.4); background: linear-gradient(135deg, rgba(16,185,129,0.25), rgba(6,182,212,0.25)); color: #ecfdf5; font-weight: 600; font-size: 0.9rem; cursor: pointer; transition: all 0.2s ease; }
    .btn-wifi-card:hover { transform: translateY(-1px); border-color: #10b981; box-shadow: 0 8px 20px -6px rgba(16,185,129,0.4); }
    .export-row-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 0.65rem; }

    /* Payload Inspector */
    .payload-inspector { display: flex; flex-direction: column; gap: 0.4rem; padding-top: 0.75rem; border-top: 1px solid var(--border-subtle); }
    .payload-head { display: flex; justify-content: space-between; align-items: center; font-size: 0.78rem; color: var(--text-secondary); }
    .mini-copy { border: none; background: transparent; color: #38bdf8; font-size: 0.76rem; font-weight: 600; cursor: pointer; }
    .mini-copy:hover { text-decoration: underline; }
    .payload-code { display: block; max-height: 84px; overflow-y: auto; padding: 0.65rem 0.8rem; border-radius: 10px; background: rgba(0,0,0,0.4); font-family: var(--font-mono); font-size: 0.76rem; color: #94a3b8; word-break: break-all; white-space: pre-wrap; }
  `],
})
export class QrStudioComponent implements AfterViewInit {
  @ViewChild('qrCanvas') qrCanvasRef?: ElementRef<HTMLCanvasElement>;

  // Mode state
  readonly mode = signal<QrMode>('url');

  // 1. URL state
  readonly urlInput = signal<string>('https://github.com/angular/angular');

  // 2. Wi-Fi state
  readonly wifiSsid = signal<string>('Studio-Guest-5G');
  readonly wifiPassword = signal<string>('Welcome2025!');
  readonly wifiEncryption = signal<WifiEncryption>('WPA');
  readonly wifiHidden = signal<boolean>(false);
  readonly showWifiCard = signal<boolean>(true);
  readonly wifiShowPwdOnCard = signal<boolean>(true);
  readonly wifiCardNote = signal<string>('Mit Kamera scannen zum automatischen Verbinden');

  // 3. vCard state
  readonly vcardFirstName = signal<string>('Alex');
  readonly vcardLastName = signal<string>('Vanguard');
  readonly vcardPhone = signal<string>('+49 170 9876543');
  readonly vcardEmail = signal<string>('alex@allinone-studio.dev');
  readonly vcardOrg = signal<string>('AllInOne Digital Lab');
  readonly vcardTitle = signal<string>('Senior Solutions Architect');
  readonly vcardUrl = signal<string>('https://allinone-studio.dev');

  // 4. Contact (WhatsApp / Email / SMS) state
  readonly contactSubMode = signal<ContactSubMode>('whatsapp');
  readonly contactTarget = signal<string>('491709876543');
  readonly contactEmail = signal<string>('hello@allinone-studio.dev');
  readonly contactSubject = signal<string>('Projektanfrage via QR-Code');
  readonly contactMessage = signal<string>('Hallo! Ich habe gerade deinen QR-Code gescannt.');

  // 5. Free text state
  readonly textInput = signal<string>('AllInOne Studio — Lokaler QR-Code Generator (100% Offline)');

  // Styling & Design state
  readonly moduleStyle = signal<ModuleStyle>('rounded');
  readonly finderStyle = signal<FinderStyle>('rounded');
  readonly fgColor1 = signal<string>('#06b6d4');
  readonly fgColor2 = signal<string>('#6366f1');
  readonly useGradient = signal<boolean>(true);
  readonly bgColor = signal<string>('#0b0f19');
  readonly activePresetId = signal<string>('cyber-cyan');

  readonly centerEmoji = signal<string>('🌐');
  readonly customLogoDataUrl = signal<string | null>(null);
  private loadedLogoImage: HTMLImageElement | null = null;

  readonly qrSize = signal<number>(480);
  readonly errorCorrection = signal<QRCodeErrorCorrectionLevel>('M');
  readonly matrixSize = signal<number>(29);
  readonly copyStatus = signal<string>('');

  readonly emojiOptions: ReadonlyArray<{ label: string; value: string }> = [
    { label: 'Keins', value: '' },
    { label: 'WLAN', value: '📶' },
    { label: 'Website', value: '🌐' },
    { label: 'Kontakt', value: '👤' },
    { label: 'Chat', value: '💬' },
    { label: 'Gaming', value: '🎮' },
    { label: 'Energie', value: '⚡' },
    { label: 'Herz', value: '❤️' },
    { label: 'Feuer', value: '🔥' },
  ];

  readonly colorPresets: ReadonlyArray<ColorPreset> = [
    {
      id: 'cyber-cyan',
      name: 'Cyber Cyan',
      fg1: '#06b6d4',
      fg2: '#6366f1',
      bg: '#0b0f19',
      useGradient: true,
    },
    {
      id: 'neon-violet',
      name: 'Neon Violet',
      fg1: '#a855f7',
      fg2: '#ec4899',
      bg: '#0f0a1c',
      useGradient: true,
    },
    {
      id: 'emerald-matrix',
      name: 'Emerald Matrix',
      fg1: '#10b981',
      fg2: '#06b6d4',
      bg: '#061411',
      useGradient: true,
    },
    {
      id: 'sunset-gold',
      name: 'Sunset Gold',
      fg1: '#f59e0b',
      fg2: '#ef4444',
      bg: '#180d09',
      useGradient: true,
    },
    {
      id: 'classic-print',
      name: 'Classic Print (Weiß)',
      fg1: '#0f172a',
      fg2: '#334155',
      bg: '#ffffff',
      useGradient: false,
    },
  ];

  readonly hasActiveLogo = computed(
    () => Boolean(this.customLogoDataUrl()) || this.centerEmoji().trim().length > 0
  );

  readonly effectiveErrorCorrection = computed<QRCodeErrorCorrectionLevel>(() =>
    this.hasActiveLogo() ? 'H' : this.errorCorrection()
  );

  readonly qrPayload = computed<string>(() => {
    const currentMode = this.mode();
    switch (currentMode) {
      case 'url': {
        const raw = this.urlInput().trim();
        return raw || 'https://example.com';
      }
      case 'wifi': {
        const ssid = this.escapeWifiField(this.wifiSsid().trim() || 'Guest-WiFi');
        const enc = this.wifiEncryption();
        const pwd = enc === 'nopass' ? '' : this.escapeWifiField(this.wifiPassword());
        const hidden = this.wifiHidden() ? 'true' : 'false';
        return `WIFI:T:${enc};S:${ssid};P:${pwd};H:${hidden};;`;
      }
      case 'vcard': {
        const fn = this.vcardFirstName().trim();
        const ln = this.vcardLastName().trim();
        const fullName = [fn, ln].filter(Boolean).join(' ') || 'Max Mustermann';
        const lines = [
          'BEGIN:VCARD',
          'VERSION:3.0',
          `N:${ln};${fn};;;`,
          `FN:${fullName}`,
        ];
        if (this.vcardOrg().trim()) lines.push(`ORG:${this.vcardOrg().trim()}`);
        if (this.vcardTitle().trim()) lines.push(`TITLE:${this.vcardTitle().trim()}`);
        if (this.vcardPhone().trim()) lines.push(`TEL;TYPE=CELL:${this.vcardPhone().trim()}`);
        if (this.vcardEmail().trim()) lines.push(`EMAIL:${this.vcardEmail().trim()}`);
        if (this.vcardUrl().trim()) lines.push(`URL:${this.vcardUrl().trim()}`);
        lines.push('END:VCARD');
        return lines.join('\n');
      }
      case 'contact': {
        const sub = this.contactSubMode();
        const msg = this.contactMessage().trim();
        if (sub === 'whatsapp') {
          const digits = this.contactTarget().replace(/[^\d]/g, '') || '491700000000';
          const query = msg ? `?text=${encodeURIComponent(msg)}` : '';
          return `https://wa.me/${digits}${query}`;
        }
        if (sub === 'email') {
          const mail = this.contactEmail().trim() || 'info@example.com';
          const params: string[] = [];
          if (this.contactSubject().trim()) {
            params.push(`subject=${encodeURIComponent(this.contactSubject().trim())}`);
          }
          if (msg) {
            params.push(`body=${encodeURIComponent(msg)}`);
          }
          return `mailto:${mail}${params.length ? '?' + params.join('&') : ''}`;
        }
        const phone = this.contactTarget().trim() || '+491700000000';
        return `smsto:${phone}:${msg}`;
      }
      case 'text':
      default: {
        return this.textInput().trim() || ' ';
      }
    }
  });

  constructor() {
    effect(() => {
      // Track reactive dependencies so canvas updates immediately
      this.qrPayload();
      this.moduleStyle();
      this.finderStyle();
      this.fgColor1();
      this.fgColor2();
      this.useGradient();
      this.bgColor();
      this.centerEmoji();
      this.customLogoDataUrl();
      this.qrSize();
      this.effectiveErrorCorrection();
      this.showWifiCard();

      queueMicrotask(() => this.renderQrToCanvas());
    });
  }

  ngAfterViewInit(): void {
    this.renderQrToCanvas();
  }

  setMode(newMode: QrMode): void {
    this.mode.set(newMode);
    if (!this.customLogoDataUrl()) {
      const defaultEmojiMap: Record<QrMode, string> = {
        url: '🌐',
        wifi: '📶',
        vcard: '👤',
        contact: '💬',
        text: '',
      };
      this.centerEmoji.set(defaultEmojiMap[newMode]);
    }
  }

  applyColorPreset(preset: ColorPreset): void {
    this.activePresetId.set(preset.id);
    this.fgColor1.set(preset.fg1);
    this.fgColor2.set(preset.fg2);
    this.bgColor.set(preset.bg);
    this.useGradient.set(preset.useGradient);
  }

  selectEmoji(emoji: string): void {
    this.customLogoDataUrl.set(null);
    this.loadedLogoImage = null;
    this.centerEmoji.set(emoji);
  }

  onLogoUpload(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || '');
      const img = new Image();
      img.onload = () => {
        this.loadedLogoImage = img;
        this.customLogoDataUrl.set(dataUrl);
        this.renderQrToCanvas();
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
    input.value = '';
  }

  clearCustomLogo(): void {
    this.loadedLogoImage = null;
    this.customLogoDataUrl.set(null);
  }

  renderQrToCanvas(targetCanvas?: HTMLCanvasElement, customSize?: number): void {
    const canvas = targetCanvas ?? this.qrCanvasRef?.nativeElement;
    if (!canvas) return;

    const payload = this.qrPayload() || ' ';
    const ecLevel = this.effectiveErrorCorrection();

    let qr: QRCode.QRCode;
    try {
      qr = QRCode.create(payload, { errorCorrectionLevel: ecLevel });
    } catch {
      qr = QRCode.create('https://example.com', { errorCorrectionLevel: 'M' });
    }

    const N = qr.modules.size;
    this.matrixSize.set(N);

    const size = customSize ?? this.qrSize();
    const quietZone = 3.5; // modules around QR
    const totalModules = N + quietZone * 2;
    const cellSize = size / totalModules;
    const offset = quietZone * cellSize;

    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 1. Background
    ctx.fillStyle = this.bgColor();
    this.drawRoundedRect(ctx, 0, 0, size, size, size * 0.045);
    ctx.fill();

    // 2. Foreground Paint (Solid or Linear Gradient)
    let fgStyle: string | CanvasGradient = this.fgColor1();
    if (this.useGradient()) {
      const grad = ctx.createLinearGradient(0, 0, size, size);
      grad.addColorStop(0, this.fgColor1());
      grad.addColorStop(1, this.fgColor2());
      fgStyle = grad;
    }
    ctx.fillStyle = fgStyle;
    ctx.strokeStyle = fgStyle;

    // Compute optional center cutout for logo so modules don't clash under the badge
    const hasLogo = this.hasActiveLogo();
    const logoRadiusModules = hasLogo ? Math.max(3.2, N * 0.115) : 0;
    const centerMod = (N - 1) / 2;

    // 3. Draw Data Modules (excluding the three 7x7 Finder Patterns)
    const modStyle = this.moduleStyle();
    for (let r = 0; r < N; r++) {
      for (let c = 0; c < N; c++) {
        if (!qr.modules.get(r, c)) continue;
        if (this.isFinderPatternModule(r, c, N)) continue;
        if (
          hasLogo &&
          Math.abs(r - centerMod) < logoRadiusModules &&
          Math.abs(c - centerMod) < logoRadiusModules
        ) {
          continue;
        }

        const x = offset + c * cellSize;
        const y = offset + r * cellSize;

        if (modStyle === 'dots') {
          ctx.beginPath();
          ctx.arc(
            x + cellSize / 2,
            y + cellSize / 2,
            cellSize * 0.44,
            0,
            Math.PI * 2
          );
          ctx.fill();
        } else if (modStyle === 'rounded') {
          this.drawRoundedRect(
            ctx,
            x + cellSize * 0.05,
            y + cellSize * 0.05,
            cellSize * 0.9,
            cellSize * 0.9,
            cellSize * 0.32
          );
          ctx.fill();
        } else {
          ctx.fillRect(x, y, cellSize + 0.35, cellSize + 0.35);
        }
      }
    }

    // 4. Draw the 3 Finder Patterns (7x7 eyes)
    this.drawFinderEye(ctx, offset, offset, cellSize, fgStyle);
    this.drawFinderEye(ctx, offset + (N - 7) * cellSize, offset, cellSize, fgStyle);
    this.drawFinderEye(ctx, offset, offset + (N - 7) * cellSize, cellSize, fgStyle);

    // 5. Draw Center Logo / Emoji Badge if active
    if (hasLogo) {
      const badgeSize = size * 0.21;
      const bx = (size - badgeSize) / 2;
      const by = (size - badgeSize) / 2;

      ctx.save();
      ctx.fillStyle = this.bgColor();
      ctx.strokeStyle = fgStyle;
      ctx.lineWidth = Math.max(2, size * 0.008);
      this.drawRoundedRect(ctx, bx, by, badgeSize, badgeSize, badgeSize * 0.28);
      ctx.fill();
      ctx.stroke();

      if (this.customLogoDataUrl() && this.loadedLogoImage) {
        const pad = badgeSize * 0.14;
        ctx.save();
        this.drawRoundedRect(
          ctx,
          bx + pad,
          by + pad,
          badgeSize - pad * 2,
          badgeSize - pad * 2,
          badgeSize * 0.18
        );
        ctx.clip();
        ctx.drawImage(
          this.loadedLogoImage,
          bx + pad,
          by + pad,
          badgeSize - pad * 2,
          badgeSize - pad * 2
        );
        ctx.restore();
      } else if (this.centerEmoji()) {
        ctx.font = `${Math.round(badgeSize * 0.56)}px "Apple Color Emoji", "Segoe UI Emoji", sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.centerEmoji(), size / 2, size / 2 + badgeSize * 0.03);
      }
      ctx.restore();
    }
  }

  private isFinderPatternModule(r: number, c: number, N: number): boolean {
    const topLeft = r < 7 && c < 7;
    const topRight = r < 7 && c >= N - 7;
    const bottomLeft = r >= N - 7 && c < 7;
    return topLeft || topRight || bottomLeft;
  }

  private drawFinderEye(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    cellSize: number,
    fgStyle: string | CanvasGradient
  ): void {
    const style = this.finderStyle();
    const outerSize = cellSize * 7;
    const innerOffset = cellSize * 2;
    const innerSize = cellSize * 3;

    ctx.save();
    ctx.fillStyle = fgStyle;
    ctx.strokeStyle = fgStyle;
    ctx.lineWidth = cellSize;

    if (style === 'circle') {
      // Outer ring (radius = 3 * cellSize centered at +3.5*cellSize)
      ctx.beginPath();
      ctx.arc(
        x + outerSize / 2,
        y + outerSize / 2,
        cellSize * 3,
        0,
        Math.PI * 2
      );
      ctx.stroke();

      // Inner circle (3x3 diameter -> 1.5 * cellSize radius)
      ctx.beginPath();
      ctx.arc(
        x + outerSize / 2,
        y + outerSize / 2,
        innerSize / 2,
        0,
        Math.PI * 2
      );
      ctx.fill();
    } else if (style === 'rounded') {
      this.drawRoundedRect(
        ctx,
        x + cellSize / 2,
        y + cellSize / 2,
        cellSize * 6,
        cellSize * 6,
        cellSize * 1.65
      );
      ctx.stroke();

      this.drawRoundedRect(
        ctx,
        x + innerOffset,
        y + innerOffset,
        innerSize,
        innerSize,
        cellSize * 0.85
      );
      ctx.fill();
    } else {
      ctx.strokeRect(
        x + cellSize / 2,
        y + cellSize / 2,
        cellSize * 6,
        cellSize * 6
      );
      ctx.fillRect(x + innerOffset, y + innerOffset, innerSize, innerSize);
    }
    ctx.restore();
  }

  private drawRoundedRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number
  ): void {
    const radius = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + w, y, x + w, y + h, radius);
    ctx.arcTo(x + w, y + h, x, y + h, radius);
    ctx.arcTo(x, y + h, x, y, radius);
    ctx.arcTo(x, y, x + w, y, radius);
    ctx.closePath();
  }

  downloadPng(): void {
    const canvas = this.qrCanvasRef?.nativeElement;
    if (!canvas) return;
    this.renderQrToCanvas(canvas, this.qrSize());
    const link = document.createElement('a');
    link.download = `qr-${this.mode()}-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  }

  downloadWifiCardPng(): void {
    const cardW = 720;
    const cardH = 960;
    const offscreen = document.createElement('canvas');
    offscreen.width = cardW;
    offscreen.height = cardH;
    const ctx = offscreen.getContext('2d');
    if (!ctx) return;

    // Sleek printable card background
    const bgGrad = ctx.createLinearGradient(0, 0, cardW, cardH);
    bgGrad.addColorStop(0, '#0f172a');
    bgGrad.addColorStop(1, '#1e1b4b');
    ctx.fillStyle = bgGrad;
    this.drawRoundedRect(ctx, 0, 0, cardW, cardH, 36);
    ctx.fill();

    // Subtle border
    ctx.strokeStyle = 'rgba(99, 102, 241, 0.5)';
    ctx.lineWidth = 4;
    this.drawRoundedRect(ctx, 14, 14, cardW - 28, cardH - 28, 28);
    ctx.stroke();

    // Header texts
    ctx.fillStyle = '#38bdf8';
    ctx.font = '700 22px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('📶 GÄSTE-WLAN ZUGANG', cardW / 2, 78);

    ctx.fillStyle = '#ffffff';
    ctx.font = '700 42px Inter, sans-serif';
    ctx.fillText(this.wifiSsid() || 'Gast-Netzwerk', cardW / 2, 134);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '500 22px Inter, sans-serif';
    ctx.fillText(
      this.wifiCardNote() || 'Mit Kamera scannen zum automatischen Verbinden',
      cardW / 2,
      174
    );

    // Render QR Code onto temporary canvas and place in center
    const qrTemp = document.createElement('canvas');
    const qrBoxSize = 480;
    this.renderQrToCanvas(qrTemp, qrBoxSize);
    ctx.drawImage(qrTemp, (cardW - qrBoxSize) / 2, 210, qrBoxSize, qrBoxSize);

    // Credentials Footer Box
    const footY = 730;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    this.drawRoundedRect(ctx, 64, footY, cardW - 128, 140, 20);
    ctx.fill();

    ctx.textAlign = 'left';
    ctx.fillStyle = '#94a3b8';
    ctx.font = '600 22px Inter, sans-serif';
    ctx.fillText('Netzwerk (SSID):', 96, footY + 52);

    ctx.textAlign = 'right';
    ctx.fillStyle = '#f8fafc';
    ctx.font = '700 24px Inter, sans-serif';
    ctx.fillText(this.wifiSsid() || '—', cardW - 96, footY + 52);

    if (this.wifiEncryption() !== 'nopass' && this.wifiShowPwdOnCard()) {
      ctx.textAlign = 'left';
      ctx.fillStyle = '#94a3b8';
      ctx.font = '600 22px Inter, sans-serif';
      ctx.fillText('Passwort:', 96, footY + 104);

      ctx.textAlign = 'right';
      ctx.fillStyle = '#6ee7b7';
      ctx.font = '700 24px "JetBrains Mono", monospace';
      ctx.fillText(this.wifiPassword() || '—', cardW - 96, footY + 104);
    }

    ctx.textAlign = 'center';
    ctx.fillStyle = '#a5b4fc';
    ctx.font = '500 20px Inter, sans-serif';
    ctx.fillText('📷 Smartphone-Kamera öffnen & auf den QR-Code richten', cardW / 2, 916);

    const link = document.createElement('a');
    link.download = `wlan-karte-${(this.wifiSsid() || 'gast').toLowerCase().replace(/\s+/g, '-')}.png`;
    link.href = offscreen.toDataURL('image/png');
    link.click();
  }

  downloadSvg(): void {
    const svgContent = this.generateSvgString();
    const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = `qr-${this.mode()}-${Date.now()}.svg`;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
  }

  private generateSvgString(): string {
    const payload = this.qrPayload() || ' ';
    const ecLevel = this.effectiveErrorCorrection();
    const qr = QRCode.create(payload, { errorCorrectionLevel: ecLevel });
    const N = qr.modules.size;
    const size = this.qrSize();
    const quietZone = 3.5;
    const totalModules = N + quietZone * 2;
    const cell = size / totalModules;
    const offset = quietZone * cell;

    const hasLogo = this.hasActiveLogo();
    const logoRadiusModules = hasLogo ? Math.max(3.2, N * 0.115) : 0;
    const centerMod = (N - 1) / 2;

    const fillRef = this.useGradient() ? 'url(#qrGrad)' : this.fgColor1();
    const parts: string[] = [];

    parts.push(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">`
    );
    if (this.useGradient()) {
      parts.push(
        `<defs><linearGradient id="qrGrad" x1="0%" y1="0%" x2="100%" y2="100%">` +
          `<stop offset="0%" stop-color="${this.fgColor1()}"/>` +
          `<stop offset="100%" stop-color="${this.fgColor2()}"/>` +
          `</linearGradient></defs>`
      );
    }

    parts.push(
      `<rect width="${size}" height="${size}" rx="${(size * 0.045).toFixed(1)}" fill="${this.bgColor()}"/>`
    );

    const modStyle = this.moduleStyle();
    for (let r = 0; r < N; r++) {
      for (let c = 0; c < N; c++) {
        if (!qr.modules.get(r, c)) continue;
        if (this.isFinderPatternModule(r, c, N)) continue;
        if (
          hasLogo &&
          Math.abs(r - centerMod) < logoRadiusModules &&
          Math.abs(c - centerMod) < logoRadiusModules
        ) {
          continue;
        }

        const x = offset + c * cell;
        const y = offset + r * cell;
        if (modStyle === 'dots') {
          parts.push(
            `<circle cx="${(x + cell / 2).toFixed(2)}" cy="${(y + cell / 2).toFixed(2)}" r="${(cell * 0.44).toFixed(2)}" fill="${fillRef}"/>`
          );
        } else if (modStyle === 'rounded') {
          parts.push(
            `<rect x="${(x + cell * 0.05).toFixed(2)}" y="${(y + cell * 0.05).toFixed(2)}" width="${(cell * 0.9).toFixed(2)}" height="${(cell * 0.9).toFixed(2)}" rx="${(cell * 0.32).toFixed(2)}" fill="${fillRef}"/>`
          );
        } else {
          parts.push(
            `<rect x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${(cell + 0.3).toFixed(2)}" height="${(cell + 0.3).toFixed(2)}" fill="${fillRef}"/>`
          );
        }
      }
    }

    // Finder eyes in SVG
    const eyeCoords = [
      [offset, offset],
      [offset + (N - 7) * cell, offset],
      [offset, offset + (N - 7) * cell],
    ];
    for (const [ex, ey] of eyeCoords) {
      if (this.finderStyle() === 'circle') {
        const cx = ex + cell * 3.5;
        const cy = ey + cell * 3.5;
        parts.push(
          `<circle cx="${cx.toFixed(2)}" cy="${cy.toFixed(2)}" r="${(cell * 3).toFixed(2)}" fill="none" stroke="${fillRef}" stroke-width="${cell.toFixed(2)}"/>`,
          `<circle cx="${cx.toFixed(2)}" cy="${cy.toFixed(2)}" r="${(cell * 1.5).toFixed(2)}" fill="${fillRef}"/>`
        );
      } else {
        const outerRx = this.finderStyle() === 'rounded' ? cell * 1.65 : 0;
        const innerRx = this.finderStyle() === 'rounded' ? cell * 0.85 : 0;
        parts.push(
          `<rect x="${(ex + cell / 2).toFixed(2)}" y="${(ey + cell / 2).toFixed(2)}" width="${(cell * 6).toFixed(2)}" height="${(cell * 6).toFixed(2)}" rx="${outerRx.toFixed(2)}" fill="none" stroke="${fillRef}" stroke-width="${cell.toFixed(2)}"/>`,
          `<rect x="${(ex + cell * 2).toFixed(2)}" y="${(ey + cell * 2).toFixed(2)}" width="${(cell * 3).toFixed(2)}" height="${(cell * 3).toFixed(2)}" rx="${innerRx.toFixed(2)}" fill="${fillRef}"/>`
        );
      }
    }

    if (hasLogo && this.centerEmoji() && !this.customLogoDataUrl()) {
      const badgeSize = size * 0.21;
      const bx = (size - badgeSize) / 2;
      const by = (size - badgeSize) / 2;
      parts.push(
        `<rect x="${bx.toFixed(2)}" y="${by.toFixed(2)}" width="${badgeSize.toFixed(2)}" height="${badgeSize.toFixed(2)}" rx="${(badgeSize * 0.28).toFixed(2)}" fill="${this.bgColor()}" stroke="${fillRef}" stroke-width="${Math.max(2, size * 0.008).toFixed(1)}"/>`,
        `<text x="${(size / 2).toFixed(2)}" y="${(size / 2 + badgeSize * 0.18).toFixed(2)}" text-anchor="center" dominant-baseline="middle" style="font-size:${Math.round(badgeSize * 0.52)}px;text-anchor:middle">${this.centerEmoji()}</text>`
      );
    }

    parts.push('</svg>');
    return parts.join('');
  }

  async copyQrImageOrPayload(): Promise<void> {
    const canvas = this.qrCanvasRef?.nativeElement;
    if (canvas && typeof ClipboardItem !== 'undefined' && navigator.clipboard?.write) {
      try {
        const blob = await new Promise<Blob | null>((resolve) =>
          canvas.toBlob((b) => resolve(b), 'image/png')
        );
        if (blob) {
          await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
          this.triggerCopyFeedback('Bild kopiert!');
          return;
        }
      } catch {
        // Fallback to text copy below
      }
    }
    await this.copyPayloadText();
  }

  async copyPayloadText(): Promise<void> {
    await navigator.clipboard.writeText(this.qrPayload());
    this.triggerCopyFeedback('Payload kopiert!');
  }

  private triggerCopyFeedback(msg: string): void {
    this.copyStatus.set(msg);
    setTimeout(() => this.copyStatus.set(''), 2000);
  }

  private escapeWifiField(val: string): string {
    return val.replace(/([\\;,:])/g, '\\$1');
  }
}
