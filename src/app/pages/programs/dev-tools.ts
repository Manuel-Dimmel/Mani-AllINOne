import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-dev-tools',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="tool-page">
      <div class="topbar">
        <a routerLink="/" class="back-btn">← Zurück zur Übersicht</a>
        <span class="crumb-pill">💻 PROGRAMME • DEVELOPER</span>
      </div>

      <section class="tool-card glass-panel">
        <div class="tool-header">
          <div class="tool-icon">🛠️</div>
          <div>
            <h1>Dev Converter & JSON Lab</h1>
            <p>JSON Formatter, Minifier, Base64 & URL Encoder/Decoder in einem Arbeitsbereich.</p>
          </div>
        </div>

        <div class="action-bar">
          <button type="button" class="btn-primary" (click)="formatJson()">✨ JSON Formatieren</button>
          <button type="button" class="btn-secondary" (click)="minifyJson()">📦 JSON Minifizieren</button>
          <button type="button" class="btn-secondary" (click)="encodeBase64()">🔐 Base64 Encode</button>
          <button type="button" class="btn-secondary" (click)="decodeBase64()">🔓 Base64 Decode</button>
          <button type="button" class="btn-secondary" (click)="loadDemoJson()">📄 Beispiel laden</button>
        </div>

        @if (statusMessage()) {
          <div class="status-banner" [class.error]="isError()">{{ statusMessage() }}</div>
        }

        <div class="editor-grid">
          <div class="editor-col">
            <label>Eingabe</label>
            <textarea
              [ngModel]="inputText()"
              (ngModelChange)="inputText.set($event)"
              rows="14"
              placeholder="JSON oder Text hier einfügen..."
            ></textarea>
          </div>
          <div class="editor-col">
            <label>Ausgabe</label>
            <textarea
              [ngModel]="outputText()"
              readonly
              rows="14"
              placeholder="Ergebnis erscheint hier..."
            ></textarea>
          </div>
        </div>
      </section>
    </div>
  `,
  styles: [`
    .tool-page { display: flex; flex-direction: column; gap: 1.5rem; padding-bottom: 3rem; }
    .topbar { display: flex; justify-content: space-between; align-items: center; }
    .back-btn { padding: 0.55rem 1rem; border-radius: 12px; background: rgba(255,255,255,0.05); border: 1px solid var(--border-subtle); color: var(--text-secondary); font-weight: 600; font-size: 0.88rem; }
    .crumb-pill { font-size: 0.78rem; font-weight: 700; color: #93c5fd; background: rgba(59,130,246,0.16); padding: 0.35rem 0.8rem; border-radius: 999px; }
    .tool-card { padding: 2rem; display: flex; flex-direction: column; gap: 1.35rem; }
    .tool-header { display: flex; align-items: center; gap: 1.2rem; }
    .tool-icon { width: 58px; height: 58px; border-radius: 16px; background: linear-gradient(135deg, #3b82f6, #6366f1); display: grid; place-items: center; font-size: 1.8rem; }
    .tool-header h1 { margin: 0; font-family: var(--font-display); font-size: 1.75rem; }
    .tool-header p { margin: 0.25rem 0 0; color: var(--text-secondary); }
    .action-bar { display: flex; flex-wrap: wrap; gap: 0.65rem; }
    .status-banner { padding: 0.75rem 1rem; border-radius: 10px; background: rgba(16,185,129,0.15); border: 1px solid rgba(16,185,129,0.35); color: #6ee7b7; font-size: 0.88rem; }
    .status-banner.error { background: rgba(239,68,68,0.15); border-color: rgba(239,68,68,0.4); color: #fca5a5; }
    .editor-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.25rem; }
    .editor-col { display: flex; flex-direction: column; gap: 0.5rem; }
    .editor-col label { font-size: 0.85rem; font-weight: 600; color: var(--text-secondary); }
    textarea { width: 100%; padding: 1rem; border-radius: 12px; background: rgba(5,7,11,0.75); border: 1px solid var(--border-subtle); color: #e2e8f0; font-family: var(--font-mono); font-size: 0.85rem; resize: vertical; outline: none; }
    textarea:focus { border-color: #6366f1; }
    @media (max-width: 820px) { .editor-grid { grid-template-columns: 1fr; } }
  `],
})
export class DevToolsComponent {
  readonly inputText = signal<string>('{"project":"AllInOne","categories":["Spiele","Programme"],"pythonEngine":true}');
  readonly outputText = signal<string>('');
  readonly statusMessage = signal<string>('');
  readonly isError = signal<boolean>(false);

  formatJson(): void {
    try {
      const parsed = JSON.parse(this.inputText());
      this.outputText.set(JSON.stringify(parsed, null, 2));
      this.isError.set(false);
      this.statusMessage.set('✓ Gültiges JSON erfolgreich formatiert.');
    } catch (e: any) {
      this.isError.set(true);
      this.statusMessage.set(`JSON-Fehler: ${e?.message || 'Ungültiges Format'}`);
    }
  }

  minifyJson(): void {
    try {
      const parsed = JSON.parse(this.inputText());
      this.outputText.set(JSON.stringify(parsed));
      this.isError.set(false);
      this.statusMessage.set('✓ JSON erfolgreich komprimiert.');
    } catch (e: any) {
      this.isError.set(true);
      this.statusMessage.set(`JSON-Fehler: ${e?.message || 'Ungültiges Format'}`);
    }
  }

  encodeBase64(): void {
    try {
      this.outputText.set(btoa(unescape(encodeURIComponent(this.inputText()))));
      this.isError.set(false);
      this.statusMessage.set('✓ In Base64 kodiert.');
    } catch {
      this.isError.set(true);
      this.statusMessage.set('Konnte nicht in Base64 kodiert werden.');
    }
  }

  decodeBase64(): void {
    try {
      this.outputText.set(decodeURIComponent(escape(atob(this.inputText().trim()))));
      this.isError.set(false);
      this.statusMessage.set('✓ Base64 erfolgreich dekodiert.');
    } catch {
      this.isError.set(true);
      this.statusMessage.set('Ungültiger Base64-String.');
    }
  }

  loadDemoJson(): void {
    this.inputText.set(
      JSON.stringify({
        hub: 'AllInOne',
        version: '2.0',
        categories: {
          programs: ['YouTube Downloader (Python)', 'Passwort & Crypto Studio', 'Dev Converter'],
          games: ['Neon Snake', 'Cyber Tic-Tac-Toe AI', 'Quantum Memory'],
        },
      })
    );
    this.formatJson();
  }
}
