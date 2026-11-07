import { Component, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-password-studio',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="tool-page">
      <div class="topbar">
        <a routerLink="/" class="back-btn">← Zurück zur Übersicht</a>
        <span class="crumb-pill">⚡ PROGRAMME • SECURITY</span>
      </div>

      <section class="tool-card glass-panel">
        <div class="tool-header">
          <div class="tool-icon">🔐</div>
          <div>
            <h1>Passwort & Crypto Studio</h1>
            <p>Generiere kryptografisch sichere Passwörter und berechne SHA-256 Hashes lokal im Browser.</p>
          </div>
        </div>

        <div class="pwd-display-box">
          <code class="pwd-output">{{ password() }}</code>
          <div class="pwd-actions">
            <button type="button" class="btn-secondary" (click)="generatePassword()">🔄 Neu</button>
            <button type="button" class="btn-primary" (click)="copyPassword()">
              {{ copied() ? '✓ Kopiert!' : '📋 Kopieren' }}
            </button>
          </div>
        </div>

        <div class="strength-bar-wrap">
          <div class="strength-meta">
            <span>Entropie: <strong>{{ entropyBits() }} Bits</strong></span>
            <span>Sicherheitsstufe: <strong>{{ strengthLabel() }}</strong></span>
          </div>
          <div class="strength-track">
            <div class="strength-fill" [style.width.%]="strengthPercent()"></div>
          </div>
        </div>

        <div class="controls-grid">
          <div class="control-box">
            <label>Passwortlänge: <strong>{{ length() }} Zeichen</strong></label>
            <input
              type="range"
              min="8"
              max="64"
              [ngModel]="length()"
              (ngModelChange)="length.set($event); generatePassword()"
            />
          </div>

          <div class="toggles-row">
            <label class="check-pill">
              <input type="checkbox" [ngModel]="useUpper()" (ngModelChange)="useUpper.set($event); generatePassword()" />
              <span>A–Z Großbuchstaben</span>
            </label>
            <label class="check-pill">
              <input type="checkbox" [ngModel]="useLower()" (ngModelChange)="useLower.set($event); generatePassword()" />
              <span>a–z Kleinbuchstaben</span>
            </label>
            <label class="check-pill">
              <input type="checkbox" [ngModel]="useNumbers()" (ngModelChange)="useNumbers.set($event); generatePassword()" />
              <span>0–9 Zahlen</span>
            </label>
            <label class="check-pill">
              <input type="checkbox" [ngModel]="useSymbols()" (ngModelChange)="useSymbols.set($event); generatePassword()" />
              <span>!&#64;#$% Sonderzeichen</span>
            </label>
          </div>
        </div>

        <div class="hash-section">
          <h3>SHA-256 Fingerabdruck des aktuellen Passworts</h3>
          <code class="hash-code">{{ sha256Hash() }}</code>
        </div>
      </section>
    </div>
  `,
  styles: [`
    .tool-page { display: flex; flex-direction: column; gap: 1.5rem; padding-bottom: 3rem; }
    .topbar { display: flex; justify-content: space-between; align-items: center; }
    .back-btn { padding: 0.55rem 1rem; border-radius: 12px; background: rgba(255,255,255,0.05); border: 1px solid var(--border-subtle); color: var(--text-secondary); font-weight: 600; font-size: 0.88rem; }
    .crumb-pill { font-size: 0.78rem; font-weight: 700; color: #6ee7b7; background: rgba(16,185,129,0.14); padding: 0.35rem 0.8rem; border-radius: 999px; }
    .tool-card { padding: 2rem; display: flex; flex-direction: column; gap: 1.5rem; }
    .tool-header { display: flex; align-items: center; gap: 1.2rem; }
    .tool-icon { width: 58px; height: 58px; border-radius: 16px; background: linear-gradient(135deg, #10b981, #06b6d4); display: grid; place-items: center; font-size: 1.8rem; }
    .tool-header h1 { margin: 0; font-family: var(--font-display); font-size: 1.75rem; }
    .tool-header p { margin: 0.25rem 0 0; color: var(--text-secondary); }
    .pwd-display-box { display: flex; justify-content: space-between; align-items: center; gap: 1rem; padding: 1.1rem 1.35rem; border-radius: 14px; background: rgba(0,0,0,0.45); border: 1px solid rgba(16,185,129,0.35); flex-wrap: wrap; }
    .pwd-output { font-family: var(--font-mono); font-size: 1.25rem; color: #6ee7b7; word-break: break-all; }
    .pwd-actions { display: flex; gap: 0.6rem; }
    .strength-bar-wrap { display: flex; flex-direction: column; gap: 0.45rem; }
    .strength-meta { display: flex; justify-content: space-between; font-size: 0.85rem; color: var(--text-secondary); }
    .strength-track { height: 8px; border-radius: 999px; background: rgba(255,255,255,0.08); overflow: hidden; }
    .strength-fill { height: 100%; background: linear-gradient(90deg, #f59e0b, #10b981, #06b6d4); transition: width 0.25s ease; }
    .controls-grid { display: flex; flex-direction: column; gap: 1.1rem; }
    .control-box { display: flex; flex-direction: column; gap: 0.5rem; }
    .control-box input[type='range'] { width: 100%; accent-color: #10b981; }
    .toggles-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 0.75rem; }
    .check-pill { display: flex; align-items: center; gap: 0.6rem; padding: 0.75rem 1rem; border-radius: 12px; background: rgba(255,255,255,0.04); border: 1px solid var(--border-subtle); cursor: pointer; font-size: 0.9rem; }
    .hash-section { padding-top: 1rem; border-top: 1px solid var(--border-subtle); }
    .hash-section h3 { margin: 0 0 0.5rem; font-size: 0.9rem; color: var(--text-secondary); }
    .hash-code { display: block; padding: 0.8rem 1rem; border-radius: 10px; background: rgba(0,0,0,0.35); font-family: var(--font-mono); font-size: 0.82rem; color: #94a3b8; word-break: break-all; }
  `],
})
export class PasswordStudioComponent implements OnInit {
  readonly length = signal<number>(20);
  readonly useUpper = signal<boolean>(true);
  readonly useLower = signal<boolean>(true);
  readonly useNumbers = signal<boolean>(true);
  readonly useSymbols = signal<boolean>(true);
  readonly password = signal<string>('');
  readonly sha256Hash = signal<string>('');
  readonly copied = signal<boolean>(false);

  readonly entropyBits = computed(() => {
    let pool = 0;
    if (this.useUpper()) pool += 26;
    if (this.useLower()) pool += 26;
    if (this.useNumbers()) pool += 10;
    if (this.useSymbols()) pool += 20;
    if (pool === 0) return 0;
    return Math.round(this.length() * Math.log2(pool));
  });

  readonly strengthPercent = computed(() => Math.min(100, Math.round((this.entropyBits() / 128) * 100)));

  readonly strengthLabel = computed(() => {
    const bits = this.entropyBits();
    if (bits >= 100) return 'Unknackbar (Militär-Standard)';
    if (bits >= 75) return 'Sehr stark';
    if (bits >= 55) return 'Gut';
    return 'Schwach';
  });

  ngOnInit(): void {
    this.generatePassword();
  }

  async generatePassword(): Promise<void> {
    let chars = '';
    if (this.useUpper()) chars += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    if (this.useLower()) chars += 'abcdefghijklmnopqrstuvwxyz';
    if (this.useNumbers()) chars += '0123456789';
    if (this.useSymbols()) chars += '!@#$%^&*()-_=+[]{};:,.<>?';
    if (!chars) {
      this.useLower.set(true);
      chars = 'abcdefghijklmnopqrstuvwxyz';
    }

    const array = new Uint32Array(this.length());
    crypto.getRandomValues(array);
    let result = '';
    for (let i = 0; i < this.length(); i++) {
      result += chars[array[i] % chars.length];
    }
    this.password.set(result);
    await this.computeHash(result);
  }

  private async computeHash(text: string): Promise<void> {
    const data = new TextEncoder().encode(text);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    this.sha256Hash.set(hashArray.map((b) => b.toString(16).padStart(2, '0')).join(''));
  }

  async copyPassword(): Promise<void> {
    await navigator.clipboard.writeText(this.password());
    this.copied.set(true);
    setTimeout(() => this.copied.set(false), 1800);
  }
}
