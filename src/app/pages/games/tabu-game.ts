import { Component, HostListener, OnDestroy, computed, effect, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { loadSavedPlayerNames, savePlayerNames } from '../../services/player-storage';
import { TABU_CARDS, TabuCard } from './tabu-cards';

export type CategoryChoice = 'general' | 'it' | 'both';
export type DifficultyChoice = 'easy' | 'hard' | 'mixed';

const USED_KEY = 'allinone_tabu_used_cards';
const TEAMS_KEY = 'allinone_tabu_teams';

export interface TabuSlot {
  id: number;
  name: string;
}

export type TabuPhase = 'setup' | 'prepare' | 'play' | 'moving' | 'won';
export type CellType = 'start' | 'squeak' | 'time' | 'special' | 'c0' | 'c1' | 'c2' | 'c3';
type CardAnim = '' | 'out-up' | 'out-down' | 'out-skip' | 'in';

export interface BoardCell {
  index: number;
  col: number; // 0..5 inside its quarter (2×2 quarters like a tic-tac-toe grid)
  row: number; // 0..7
  type: CellType;
  icon: string;
}

export interface TabuTeam {
  id: 0 | 1;
  name: string;
  color: string;
  players: string[];
  score: number;
  position: number; // total steps made (BOARD_LENGTH = finished)
  turns: number;
  doubleTime: boolean; // next turn has 120s
  doubleBuzz: boolean; // next turn buzzes count double
}

const COLS = 12;
const ROWS = 8;
const HALF_COLS = COLS / 2;
const HALF_ROWS = ROWS / 2;
export const BOARD_LENGTH = 2 * (COLS + ROWS) - 4; // 36

const SQUEAK_CELLS = [5, 13, 22, 29];
const TIME_CELLS = [9, 18, 27, 34];
const SPECIAL_CELLS = [3, 11, 16, 24, 31];

function buildBoard(): BoardCell[] {
  const coords: Array<[number, number]> = [];
  for (let x = 0; x < COLS; x++) coords.push([x, 0]);
  for (let y = 1; y < ROWS; y++) coords.push([COLS - 1, y]);
  for (let x = COLS - 2; x >= 0; x--) coords.push([x, ROWS - 1]);
  for (let y = ROWS - 2; y >= 1; y--) coords.push([0, y]);
  return coords.map(([x, y], i) => {
    let type: CellType = (`c${i % 4}`) as CellType;
    let icon = '';
    if (i === 0) {
      type = 'start';
      icon = '🏁';
    } else if (SQUEAK_CELLS.includes(i)) {
      type = 'squeak';
      icon = '🚨';
    } else if (TIME_CELLS.includes(i)) {
      type = 'time';
      icon = '⏳';
    } else if (SPECIAL_CELLS.includes(i)) {
      type = 'special';
      icon = '🃏';
    }
    return { index: i, col: x % HALF_COLS, row: y % HALF_ROWS, type, icon, q: (x < HALF_COLS ? 0 : 2) + (y < HALF_ROWS ? 0 : 1) } as BoardCell & {
      q: number;
    };
  });
}

const BOARD = buildBoard() as Array<BoardCell & { q: number }>;

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

@Component({
  selector: 'app-tabu-game',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="tabu-page">
      <header class="head">
        <a routerLink="/" class="back">← Zurück</a>
        <h1>🤫 <span class="grad">Tabu</span></h1>
        <button class="mini" (click)="muted.set(!muted())" [attr.aria-pressed]="muted()">
          {{ muted() ? '🔇' : '🔊' }}
        </button>
      </header>

      @switch (phase()) {
        @case ('setup') {
          <section class="glass-panel panel setup">
            <h2>Spieler &amp; Teams</h2>
            <p class="muted">
              Mindestens 4 Spieler – zieh die Namen per Drag &amp; Drop (⠿) zwischen den Teams. Erkläre den Suchbegriff
              ohne die 5 Tabu-Wörter – der Gegner passt am Quietscher auf! Wer zuerst eine volle
              Runde ({{ boardLength }} Felder) schafft, gewinnt.
            </p>
            <div class="cols">
              @for (col of cols(); track $index; let ci = $index) {
                <div class="col" [class.t1]="ci === 1" [class.over]="overCol() === ci"
                  (dragover)="onDragOver(ci, $event)" (dragleave)="overCol.set(-1)"
                  (drop)="onDrop(ci, null, $event)">
                  <h3>{{ ci === 0 ? 'Team Blau/Lila' : 'Team Pink/Orange' }} <small>({{ col.length }})</small></h3>
                  @for (p of col; track p.id) {
                    <div class="chip" [class.dragging]="dragId() === p.id"
                      (dragover)="onDragOver(ci, $event)" (drop)="onDrop(ci, p.id, $event)">
                      <span class="grip" draggable="true" title="Ziehen, um Team zu wechseln"
                        (dragstart)="onDragStart(p.id, $event)" (dragend)="dragId.set(-1); overCol.set(-1)">⠿</span>
                      <input [ngModel]="p.name" (ngModelChange)="setName(p.id, $event)" maxlength="18"
                        aria-label="Spielername" />
                      <button class="mini" (click)="movePlayer(p.id, ci === 0 ? 1 : 0)" title="Team wechseln">⇄</button>
                      <button class="mini" (click)="removePlayer(p.id)" [disabled]="totalPlayers() <= 4">✕</button>
                    </div>
                  }
                  <button class="mini wide" (click)="addPlayer(ci)" [disabled]="totalPlayers() >= 10">＋ Spieler</button>
                </div>
              }
            </div>
            @if (!canStart()) {
              <p class="muted">Mindestens 4 Spieler, jedes Team braucht mindestens 1 Spieler.</p>
            }
            <h3>Spielzeit pro Zug</h3>
            <div class="opts">
              @for (s of [30, 60, 90, 120]; track s) {
                <button class="mini" [class.sel]="timeChoice() === s" (click)="timeChoice.set(s)">{{ s }}s</button>
              }
            </div>
            <h3>Tabu-Quietscher</h3>
            <div class="opts">
              <button class="mini" [class.sel]="buzzGivesPoint()" (click)="buzzGivesPoint.set(true)">Gegner bekommt 1 Punkt</button>
              <button class="mini" [class.sel]="!buzzGivesPoint()" (click)="buzzGivesPoint.set(false)">Kein Punkt für den Gegner</button>
            </div>
            <h3>Kategorie</h3>
            <div class="opts">
              <button class="mini" [class.sel]="category() === 'general'" (click)="category.set('general')">🌍 Allgemein</button>
              <button class="mini" [class.sel]="category() === 'it'" (click)="category.set('it')">💻 Informatik</button>
              <button class="mini" [class.sel]="category() === 'both'" (click)="category.set('both')">🎲 Beides</button>
            </div>
            <h3>Schwierigkeit</h3>
            <div class="opts">
              <button class="mini" [class.sel]="difficulty() === 'easy'" (click)="difficulty.set('easy')">🟢 Leicht</button>
              <button class="mini" [class.sel]="difficulty() === 'hard'" (click)="difficulty.set('hard')">🔴 Schwer</button>
              <button class="mini" [class.sel]="difficulty() === 'mixed'" (click)="difficulty.set('mixed')">🟣 Gemischt</button>
            </div>
            <p class="muted">{{ poolSize() }} Karten im Stapel – keine Wiederholung, bis alle gespielt sind.</p>
            <div class="row">
              <button class="go" (click)="startGame()" [disabled]="!canStart()">Spiel starten</button>
            </div>
          </section>
        }

        @case ('prepare') {
          <section class="glass-panel panel prepare">
            <div class="scores">
              @for (t of teams(); track t.id) {
                <div class="score" [style.--c]="t.color" [class.active]="t.id === activeTeam().id">
                  <strong>{{ t.name }}</strong>
                  <span class="big">{{ t.position }}/{{ boardLength }}</span>
                  <small>{{ t.players.join(', ') }}</small>
                  @if (t.doubleTime) { <em>⏳ Doppelte Zeit</em> }
                  @if (t.doubleBuzz) { <em>🚨 Quietscher zählt doppelt</em> }
                </div>
              }
            </div>
            <h2 [style.color]="activeTeam().color">{{ activeTeam().name }} ist dran</h2>
            <p>
              🗣️ Erklärer: <b>{{ explainer() }}</b> &nbsp;|&nbsp; 🚨 Aufpasser:
              <b>{{ buzzer() }}</b>
            </p>
            <p class="muted">⏳ Sanduhr: {{ effectiveTime() }}s</p>
            <p class="muted">Der Erklärer darf die Karte erst nach dem Start sehen.</p>
            <button class="go" (click)="startTurn()">▶ Zug starten ({{ effectiveTime() }}s)</button>
          </section>
        }

        @case ('play') {
          <section class="play">
            <div class="hud glass-panel">
              <div class="hourglass" [class.run]="true">
                <svg viewBox="0 0 60 100" width="70" height="116" aria-hidden="true">
                  <defs>
                    <clipPath id="tbTop"><polygon points="8,8 52,8 33,50 27,50" /></clipPath>
                    <clipPath id="tbBot"><polygon points="27,50 33,50 52,92 8,92" /></clipPath>
                  </defs>
                  <rect x="0" y="0" width="60" height="6" rx="2" fill="#a855f7" />
                  <rect x="0" y="94" width="60" height="6" rx="2" fill="#a855f7" />
                  <rect clip-path="url(#tbTop)" x="0" [attr.y]="50 - 42 * fraction()" width="60" [attr.height]="42 * fraction()" fill="#facc15" />
                  <rect clip-path="url(#tbBot)" x="0" [attr.y]="92 - 42 * (1 - fraction())" width="60" [attr.height]="42 * (1 - fraction())" fill="#facc15" />
                  @if (fraction() > 0) { <line x1="30" y1="50" x2="30" y2="92" stroke="#facc15" stroke-width="1.5" /> }
                  <polygon points="8,8 52,8 33,50 52,92 8,92 27,50" fill="none" stroke="#e2e8f0" stroke-width="2.5" />
                </svg>
                <svg class="ring" viewBox="0 0 100 100" aria-hidden="true">
                  <circle cx="50" cy="50" r="44" class="ring-bg" />
                  <circle cx="50" cy="50" r="44" class="ring-fg" [class.low]="timeLeft() <= 10"
                    [style.stroke-dashoffset]="276.5 * (1 - fraction())" />
                </svg>
                <span class="secs" [class.low]="timeLeft() <= 10">{{ secondsLeft() }}</span>
              </div>
              <div class="hud-info">
                <b [style.color]="activeTeam().color">{{ activeTeam().name }}</b>
                <span>🗣️ {{ explainer() }} · 🚨 {{ buzzer() }}</span>
                <div class="counts">
                  <span class="ok">✅ {{ correct() }}</span>
                  <span class="bad">🚨 {{ buzzed() }}</span>
                  <span>⏭️ {{ skipped() }}</span>
                </div>
              </div>
            </div>

            <div class="holder">
              <div class="holder-back"></div>
              @if (card(); as c) {
                <article class="tcard" [class]="'tcard ' + cardAnim()">
                  <div class="term">{{ c.term }}</div>
                  <ul>
                    @for (w of c.taboo; track w) { <li>{{ w }}</li> }
                  </ul>
                </article>
              }
              <div class="holder-lip"><span>TABU</span></div>
            </div>

            <div class="actions">
              <button class="act ok" (click)="markCorrect()">✅ Richtig (+1)</button>
              <button class="squeaker" [class.squish]="squishing()" (click)="buzz()"
                aria-label="Tabu-Quietscher (Leertaste oder B)">
                <span class="sq-face">😱</span>
                <span class="sq-txt">TABU!</span>
              </button>
              <button class="act skip" (click)="skip()">⏭️ Überspringen</button>
            </div>
            <p class="muted center">Tastatur: <kbd>Leertaste</kbd> / <kbd>B</kbd> = Quietscher</p>
            <button class="mini" (click)="endTurnNow()">Zug beenden</button>
          </section>
        }

        @case ('moving') {
          <section class="glass-panel panel prepare">
            <h2>⏰ Zeit abgelaufen!</h2>
            <p class="msg">{{ moveMsg() }}</p>
          </section>
        }

        @case ('won') {
          <section class="glass-panel panel prepare">
            <h2 [style.color]="winner()?.color">🏆 {{ winner()?.name }} gewinnt!</h2>
            <p>Eine volle Runde um das Brett geschafft.</p>
            <div class="row">
              <button class="go" (click)="restart()">Neues Spiel</button>
            </div>
          </section>
        }
      }

      @if (phase() !== 'setup') {
        <p class="muted center tiny">
          Richtig = +1 · Quietscher = −1 für dich{{ buzzGivesPoint() ? ' & +1 Feld für den Gegner' : '' }} · 🚨 Quietscher-Feld: Quietscher zählt
          nächste Runde doppelt · ⏳ doppelte Zeit · 🃏 +2 Bonusfelder
        </p>
      }

      <button class="board-toggle" (click)="toggleBoard()">
        🗺️ Spielbrett <b>{{ overlay() && unfolded() ? 'Zuklappen' : 'Aufklappen' }}</b>
      </button>

      @if (overlay()) {
        <div class="overlay" (click)="toggleBoard()" role="dialog" aria-label="Spielbrett">
          <div class="scene" (click)="$event.stopPropagation()">
            <div class="board3d" [class.open]="unfolded()">
              @for (half of [0, 1]; track half) {
                <div class="half" [class.left]="half === 0" [class.right]="half === 1">
                  @for (q of quartersOf(half); track q) {
                    <div class="q" [class.qt]="q % 2 === 0" [class.ql]="q < 2" [class.qr]="q > 1"
                      [style.top]="(q % 2) * 50 + '%'">
                      <svg class="art" viewBox="0 0 120 80" preserveAspectRatio="none" width="200%" height="200%"
                        [style.left]="-(q < 2 ? 0 : 100) + '%'" [style.top]="-((q % 2) * 100) + '%'">
                        <rect width="120" height="80" fill="#fde047" />
                        <polygon points="0,0 60,0 0,80" fill="#fb923c" />
                        <polygon points="120,0 120,80 60,80" fill="#2dd4bf" />
                        <polygon points="60,0 120,0 60,80" fill="#a855f7" opacity="0.9" />
                        <g stroke="#0b0b12" stroke-width="1.4" stroke-linejoin="round">
                          <ellipse cx="60" cy="40" rx="24" ry="27" fill="#fef3c7" />
                          <path d="M42 24 Q60 6 78 24 Q60 18 42 24Z" fill="#ec4899" />
                          <ellipse cx="51" cy="35" rx="6" ry="4.5" fill="#fff" />
                          <ellipse cx="69" cy="33" rx="5" ry="6" fill="#fff" />
                          <circle cx="52" cy="35" r="2.2" fill="#0b0b12" />
                          <circle cx="69" cy="34" r="2.6" fill="#0b0b12" />
                          <path d="M58 38 L55 50 L62 49" fill="none" />
                          <path d="M47 55 Q60 70 74 53 Q60 60 47 55Z" fill="#ef4444" />
                          <path d="M54 58 L58 56 L62 58" fill="none" stroke="#fff" />
                        </g>
                        <text x="60" y="78" text-anchor="middle" font-size="5" font-weight="900" fill="#0b0b12">PSST… TABU!</text>
                      </svg>
                      <div class="grid">
                        @for (c of cellsOf(q); track c.index) {
                          <div class="cell" [class]="'cell ' + c.type" [style.grid-column]="c.col + 1" [style.grid-row]="c.row + 1">
                            <span class="n">{{ c.icon || c.index }}</span>
                            @for (t of teams(); track t.id) {
                              @if (t.position % boardLength === c.index) {
                                <i class="pawn" [class.p1]="t.id === 1" [style.--c]="t.color"></i>
                              }
                            }
                          </div>
                        }
                      </div>
                      <div class="fold-shadow"></div>
                    </div>
                  }
                </div>
              }
            </div>
            @if (moveMsg()) { <p class="board-msg">{{ moveMsg() }}</p> }
          </div>
        </div>
      }
    </div>
  `,
  styles: [
    `
      :host { display: block; }
      .tabu-page { max-width: 880px; margin: 0 auto; padding: 1rem; color: #e2e8f0; display: flex; flex-direction: column; gap: 1rem; }
      .head { display: flex; align-items: center; justify-content: space-between; gap: 1rem; }
      .head h1 { margin: 0; font-size: 1.8rem; }
      .grad { background: linear-gradient(135deg, #a855f7, #ec4899, #06b6d4); -webkit-background-clip: text; background-clip: text; color: transparent; }
      .back { color: #94a3b8; }
      .panel { background: rgba(15, 23, 42, 0.75); backdrop-filter: blur(12px); padding: 1.5rem; display: flex; flex-direction: column; gap: 1rem; box-shadow: 0 0 40px rgba(168, 85, 247, 0.18); }
      .panel h2 { margin: 0; }
      .muted { color: #94a3b8; font-size: 0.9rem; margin: 0; }
      .center { text-align: center; }
      .tiny { font-size: 0.75rem; }
      .msg { font-size: 1.1rem; }
      .row { display: flex; gap: 0.75rem; justify-content: space-between; align-items: center; flex-wrap: wrap; }
      .cols { display: grid; grid-template-columns: 1fr 1fr; gap: 0.8rem; }
      .col { --c: #8b5cf6; border: 2px dashed var(--c); border-radius: 14px; padding: 0.7rem; display: flex; flex-direction: column; gap: 0.5rem; min-height: 160px; background: rgba(2, 6, 23, 0.35); transition: background 0.15s, box-shadow 0.15s; }
      .col.t1 { --c: #fb7185; }
      .col.over { background: rgba(168, 85, 247, 0.18); box-shadow: 0 0 20px var(--c); }
      .col h3 { color: var(--c); }
      .chip { display: flex; gap: 0.4rem; align-items: center; background: rgba(15, 23, 42, 0.9); border: 1px solid var(--c); border-radius: 10px; padding: 0.3rem 0.4rem; }
      .chip.dragging { opacity: 0.4; }
      .chip input { min-width: 0; }
      .grip { cursor: grab; padding: 0 0.3rem; color: var(--c); font-size: 1.2rem; user-select: none; }
      @media (max-width: 560px) { .cols { grid-template-columns: 1fr; } }
      input { flex: 1; background: rgba(2, 6, 23, 0.6); border: 1px solid rgba(148, 163, 184, 0.3); border-radius: 10px; color: #fff; padding: 0.55rem 0.75rem; }
      .mini { background: rgba(30, 41, 59, 0.8); border: 1px solid rgba(148, 163, 184, 0.3); color: #e2e8f0; border-radius: 10px; padding: 0.4rem 0.75rem; cursor: pointer; transition: border-color 0.15s, box-shadow 0.15s, transform 0.15s; }
      .mini:hover:not(:disabled) { border-color: #a855f7; transform: translateY(-1px); }
      .mini.sel { border-color: #a855f7; background: rgba(124, 58, 237, 0.35); box-shadow: 0 0 12px rgba(168, 85, 247, 0.6); }
      .mini:disabled, .go:disabled { opacity: 0.4; cursor: not-allowed; }
      .go { background: linear-gradient(135deg, #a855f7, #ec4899, #06b6d4); color: #fff; border: 0; border-radius: 14px; padding: 0.85rem 1.6rem; font-weight: 800; font-size: 1rem; cursor: pointer; box-shadow: 0 8px 28px -6px rgba(168, 85, 247, 0.7); transition: transform 0.15s; }
      .go:hover:not(:disabled) { transform: translateY(-2px); }
      .prepare { text-align: center; align-items: center; }
      .scores { display: flex; gap: 1rem; width: 100%; }
      .score { --c: #888; flex: 1; border: 1px solid var(--c); border-radius: 14px; padding: 0.7rem; display: flex; flex-direction: column; gap: 0.2rem; opacity: 0.6; }
      .score.active { opacity: 1; box-shadow: 0 0 22px var(--c); }
      .score .big { font-size: 1.6rem; font-weight: 800; color: var(--c); }
      .score small, .score em { color: #94a3b8; font-size: 0.75rem; }
      .opts { display: flex; gap: 0.5rem; flex-wrap: wrap; }
      h3 { margin: 0; font-size: 0.95rem; color: #c4b5fd; }
      .times { display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap; justify-content: center; }

      .play { display: flex; flex-direction: column; gap: 1rem; align-items: center; }
      .hud { display: flex; gap: 1.2rem; align-items: center; padding: 0.8rem 1.2rem; width: 100%; background: rgba(15, 23, 42, 0.75); }
      .hourglass { position: relative; width: 130px; height: 130px; display: grid; place-items: center; }
      .hourglass > svg:first-child { position: relative; z-index: 1; filter: drop-shadow(0 0 8px rgba(250, 204, 21, 0.5)); }
      .ring { position: absolute; inset: 0; transform: rotate(-90deg); }
      .ring-bg { fill: none; stroke: rgba(148, 163, 184, 0.2); stroke-width: 5; }
      .ring-fg { fill: none; stroke: #06b6d4; stroke-width: 5; stroke-linecap: round; stroke-dasharray: 276.5; filter: drop-shadow(0 0 6px #06b6d4); transition: stroke-dashoffset 0.12s linear; }
      .ring-fg.low { stroke: #ef4444; filter: drop-shadow(0 0 8px #ef4444); }
      .secs { position: absolute; bottom: -6px; font-weight: 900; font-size: 1.3rem; background: #0f172a; border-radius: 8px; padding: 0 0.5rem; z-index: 2; }
      .secs.low { color: #ef4444; animation: pulse 0.5s infinite alternate; }
      .hud-info { display: flex; flex-direction: column; gap: 0.35rem; }
      .counts { display: flex; gap: 0.8rem; font-weight: 700; }
      .counts .ok { color: #4ade80; } .counts .bad { color: #f87171; }

      .holder { position: relative; width: min(340px, 90vw); height: 380px; margin-top: 0.5rem; }
      .holder-back { position: absolute; inset: 20px 0 0 0; border-radius: 18px; background: linear-gradient(160deg, #4338ca, #7c3aed); box-shadow: 0 20px 40px -10px rgba(76, 29, 149, 0.8), inset 0 0 0 4px rgba(0, 0, 0, 0.4); }
      .holder-lip { position: absolute; left: -8px; right: -8px; bottom: 0; height: 90px; border-radius: 10px 10px 22px 22px; background: linear-gradient(180deg, #6366f1, #3730a3); border: 3px solid #0b0b12; display: grid; place-items: center; z-index: 3; }
      .holder-lip span { font-weight: 900; letter-spacing: 0.3em; color: rgba(255, 255, 255, 0.35); }
      .tcard { position: absolute; left: 14px; right: 14px; top: 0; bottom: 60px; background: #fff; color: #111; border: 3px solid #0b0b12; border-radius: 12px; overflow: hidden; z-index: 2; display: flex; flex-direction: column; transition: transform 0.32s ease, opacity 0.32s ease; box-shadow: 0 8px 20px rgba(0, 0, 0, 0.4); }
      .tcard .term { background: #2563eb; color: #fff; font-weight: 900; font-size: 1.6rem; text-transform: uppercase; text-align: center; padding: 0.7rem 0.4rem; letter-spacing: 0.04em; }
      .tcard ul { list-style: none; margin: 0.7rem; padding: 0.4rem; border: 4px solid #dc2626; border-radius: 10px; flex: 1; display: flex; flex-direction: column; justify-content: space-around; text-align: center; font-weight: 800; font-size: 1.1rem; text-transform: uppercase; color: #b91c1c; }
      .tcard.out-up { transform: translateY(-130%) rotate(-4deg); opacity: 0; }
      .tcard.out-down { transform: translateY(40%) rotate(6deg); opacity: 0; }
      .tcard.out-skip { transform: translateX(120%) rotate(12deg); opacity: 0; }
      .tcard.in { animation: cardIn 0.32s ease; }

      .actions { display: flex; gap: 1rem; align-items: center; justify-content: center; flex-wrap: wrap; }
      .act { border: 0; border-radius: 14px; padding: 0.9rem 1.2rem; font-weight: 800; color: #fff; cursor: pointer; font-size: 1rem; }
      .act.ok { background: linear-gradient(135deg, #16a34a, #22c55e); box-shadow: 0 0 20px rgba(34, 197, 94, 0.5); }
      .act.skip { background: linear-gradient(135deg, #475569, #64748b); }
      .squeaker { width: 130px; height: 130px; border-radius: 50%; border: 5px solid #0b0b12; background: radial-gradient(circle at 35% 30%, #fde047, #f97316 60%, #c2410c); cursor: pointer; display: flex; flex-direction: column; align-items: center; justify-content: center; box-shadow: 0 10px 0 #7c2d12, 0 0 30px rgba(249, 115, 22, 0.6); transition: transform 0.1s; }
      .sq-face { font-size: 2.2rem; } .sq-txt { font-weight: 900; color: #0b0b12; letter-spacing: 0.1em; }
      .squeaker.squish { animation: squish 0.38s ease; }
      kbd { background: #1e293b; border-radius: 5px; padding: 0 0.4rem; border: 1px solid #475569; }

      .board-toggle { position: fixed; right: 0; top: 50%; transform: translateY(-50%); z-index: 60; background: linear-gradient(180deg, #7c3aed, #db2777); color: #fff; border: 0; border-radius: 14px 0 0 14px; padding: 0.9rem 0.7rem; cursor: pointer; display: flex; flex-direction: column; gap: 0.2rem; align-items: center; font-size: 0.8rem; writing-mode: vertical-rl; box-shadow: 0 0 24px rgba(236, 72, 153, 0.6); }
      .overlay { position: fixed; inset: 0; z-index: 50; background: rgba(2, 6, 23, 0.82); backdrop-filter: blur(8px); display: grid; place-items: center; animation: fade 0.3s ease; }
      .scene { perspective: 1400px; width: min(94vw, 960px); display: flex; flex-direction: column; gap: 1rem; align-items: center; }
      .board3d { transform-style: preserve-3d; display: flex; width: 100%; aspect-ratio: 3 / 2; max-height: 78vh; transform: rotateX(6deg); }
      .half { position: relative; width: 50%; height: 100%; transform-style: preserve-3d; transition: transform 0.9s cubic-bezier(0.4, 0, 0.2, 1); }
      .half.left { transform-origin: right center; transform: rotateY(85deg); }
      .half.right { transform-origin: left center; transform: rotateY(-85deg); }
      .board3d.open .half { transform: rotateY(0deg); }
      .board3d:not(.open) .half { transition-delay: 0.9s; }
      .q { position: absolute; left: 0; width: 100%; height: 50%; overflow: hidden; border: 3px solid #0b0b12; box-sizing: border-box; background: #fde047; box-shadow: 0 25px 50px rgba(0, 0, 0, 0.5); }
      .q.qt { transition: transform 0.9s cubic-bezier(0.4, 0, 0.2, 1); transform-origin: center bottom; transform: rotateX(175deg); }
      .q.qt.ql { border-radius: 14px 0 0 0; }
      .q.qt.qr { border-radius: 0 14px 0 0; }
      .q:not(.qt).ql { border-radius: 0 0 0 14px; }
      .q:not(.qt).qr { border-radius: 0 0 14px 0; }
      .board3d.open .q.qt { transform: rotateX(0deg); transition-delay: 0.9s; }
      .art { position: absolute; top: 0; }
      .grid { position: absolute; inset: 0; display: grid; grid-template-columns: repeat(6, 1fr); grid-template-rows: repeat(4, 1fr); }
      .cell { position: relative; border: 2px solid #0b0b12; display: grid; place-items: center; font-weight: 900; font-size: clamp(0.6rem, 1.8vw, 1.2rem); color: #0b0b12; }
      .cell.c0 { background: #fde047; } .cell.c1 { background: #fb923c; } .cell.c2 { background: #2dd4bf; } .cell.c3 { background: #c084fc; }
      .cell.start { background: #fff; } .cell.squeak { background: #ef4444; } .cell.time { background: #38bdf8; } .cell.special { background: #f472b6; }
      .pawn { position: absolute; width: 48%; height: 48%; bottom: 8%; left: 8%; background: var(--c); clip-path: polygon(50% 0, 100% 100%, 0 100%); filter: drop-shadow(0 0 3px #000); animation: hop 0.38s ease; z-index: 2; }
      .pawn.p1 { left: auto; right: 8%; }
      .fold-shadow { position: absolute; inset: 0; pointer-events: none; opacity: 0.9; transition: opacity 1s; }
      .ql .fold-shadow { background: linear-gradient(90deg, transparent 65%, rgba(0, 0, 0, 0.5)); }
      .qr .fold-shadow { background: linear-gradient(270deg, transparent 65%, rgba(0, 0, 0, 0.5)); }
      .board3d.open .fold-shadow { opacity: 0.3; }
      .board-msg { background: rgba(15, 23, 42, 0.9); border: 1px solid #a855f7; border-radius: 12px; padding: 0.6rem 1rem; margin: 0; text-align: center; }

      @keyframes hop { 0% { transform: translateY(0); } 40% { transform: translateY(-70%) scale(1.15); } 100% { transform: translateY(0); } }
      @keyframes squish { 0% { transform: scale(1); } 25% { transform: scale(1.25, 0.65) translateY(10px); } 55% { transform: scale(0.88, 1.15); } 80% { transform: scale(1.05, 0.96); } 100% { transform: scale(1); } }
      @keyframes cardIn { from { transform: translateY(30%) scale(0.95); opacity: 0; } to { transform: none; opacity: 1; } }
      @keyframes fade { from { opacity: 0; } to { opacity: 1; } }
      @keyframes pulse { to { transform: scale(1.15); } }
      @media (max-width: 640px) { .scores { flex-direction: column; } .holder { height: 340px; } }
    `,
  ],
})
export class TabuGameComponent implements OnDestroy {
  readonly boardLength = BOARD_LENGTH;

  readonly phase = signal<TabuPhase>('setup');
  private nextId = 1;
  readonly cols = signal<TabuSlot[][]>(this.initialColumns());
  readonly dragId = signal(-1);
  readonly overCol = signal(-1);
  readonly totalPlayers = computed(() => this.cols()[0].length + this.cols()[1].length);
  readonly muted = signal(false);

  readonly teams = signal<TabuTeam[]>([]);
  readonly activeIdx = signal<0 | 1>(0);
  readonly round = signal(0);
  readonly activeTeam = computed(
    () => this.teams()[this.activeIdx()] ?? this.emptyTeam(this.activeIdx()),
  );
  readonly opponent = computed(() => this.teams()[this.activeIdx() === 0 ? 1 : 0]);
  readonly explainer = computed(() => {
    const t = this.activeTeam();
    return t.players.length ? t.players[t.turns % t.players.length] : '';
  });
  readonly buzzer = computed(() => {
    const o = this.opponent();
    return o && o.players.length ? o.players[o.turns % o.players.length] : '';
  });
  readonly winner = signal<TabuTeam | null>(null);

  readonly timeChoice = signal(60);
  readonly buzzGivesPoint = signal(true);
  readonly category = signal<CategoryChoice>('both');
  readonly difficulty = signal<DifficultyChoice>('mixed');
  readonly pool = computed(() =>
    TABU_CARDS.filter(
      (c) =>
        (this.category() === 'both' || c.category === this.category()) &&
        (this.difficulty() === 'mixed' || c.difficulty === this.difficulty()),
    ),
  );
  readonly poolSize = computed(() => this.pool().length);
  readonly effectiveTime = computed(() => (this.activeTeam().doubleTime ? this.timeChoice() * 2 : this.timeChoice()));
  readonly totalTime = signal(60);
  readonly timeLeft = signal(60);
  readonly secondsLeft = computed(() => Math.ceil(this.timeLeft()));
  readonly fraction = computed(() => Math.max(0, Math.min(1, this.timeLeft() / this.totalTime())));

  readonly card = signal<TabuCard | null>(null);
  readonly cardAnim = signal<CardAnim>('');
  readonly correct = signal(0);
  readonly buzzed = signal(0);
  readonly skipped = signal(0);
  readonly squishing = signal(false);
  readonly moveMsg = signal('');

  readonly overlay = signal(false);
  readonly unfolded = signal(false);

  readonly canStart = computed(
    () =>
      this.cols()[0].filter((p) => p.name.trim()).length >= 1 &&
      this.cols()[1].filter((p) => p.name.trim()).length >= 1 &&
      this.cols()[0].concat(this.cols()[1]).filter((p) => p.name.trim()).length >= 4,
  );

  private deck: TabuCard[] = [];
  private timer: ReturnType<typeof setInterval> | null = null;
  private endAt = 0;
  private audioCtx: AudioContext | null = null;
  private destroyed = false;
  private pending = new Set<ReturnType<typeof setTimeout>>();
  private lastTick = -1;
  private animating = false;

  private readonly quarterCells = [0, 1, 2, 3].map((q) => BOARD.filter((c) => c.q === q));

  constructor() {
    // Countdown tick sound for the last five seconds
    effect(() => {
      const s = this.secondsLeft();
      if (this.phase() === 'play' && s <= 5 && s > 0 && s !== this.lastTick) {
        this.lastTick = s;
        this.playStep(900);
      }
    });
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    this.stopTimer();
    this.pending.forEach((t) => clearTimeout(t));
    this.audioCtx?.close().catch(() => undefined);
  }

  quartersOf(half: number): number[] {
    return half === 0 ? [0, 1] : [2, 3]; // [top, bottom]
  }

  cellsOf(q: number): Array<BoardCell & { q: number }> {
    return this.quarterCells[q];
  }

  // ---------- Setup ----------
  private initialColumns(): TabuSlot[][] {
    const names = loadSavedPlayerNames(['Spieler 1', 'Spieler 2', 'Spieler 3', 'Spieler 4']);
    const mk = (n: string): TabuSlot => ({ id: this.nextId++, name: n });
    try {
      const raw = typeof window !== 'undefined' ? localStorage.getItem(TEAMS_KEY) : null;
      if (raw) {
        const t = JSON.parse(raw) as { a: string[]; b: string[] };
        const joined = [...t.a, ...t.b].sort().join('|');
        if (joined === [...names].sort().join('|')) return [t.a.map(mk), t.b.map(mk)];
      }
    } catch {}
    return [names.filter((_, i) => i % 2 === 0).map(mk), names.filter((_, i) => i % 2 === 1).map(mk)];
  }

  setName(id: number, v: string): void {
    this.cols.update((c) => c.map((col) => col.map((p) => (p.id === id ? { ...p, name: v } : p))));
  }
  addPlayer(ci: number): void {
    const n = this.totalPlayers() + 1;
    this.cols.update((c) =>
      c.map((col, i) => (i === ci ? [...col, { id: this.nextId++, name: `Spieler ${n}` }] : col)),
    );
  }
  removePlayer(id: number): void {
    this.cols.update((c) => c.map((col) => col.filter((p) => p.id !== id)));
  }

  /** Moves a player to a team column, optionally placing him before another player. */
  movePlayer(id: number, toCol: number, beforeId: number | null = null): void {
    const all = this.cols().flat();
    const slot = all.find((p) => p.id === id);
    if (!slot || id === beforeId) return;
    const stripped = this.cols().map((col) => col.filter((p) => p.id !== id));
    const target = [...stripped[toCol]];
    const idx = beforeId === null ? -1 : target.findIndex((p) => p.id === beforeId);
    if (idx >= 0) target.splice(idx, 0, slot);
    else target.push(slot);
    stripped[toCol] = target;
    this.cols.set(stripped);
  }

  onDragStart(id: number, e: DragEvent): void {
    this.dragId.set(id);
    e.dataTransfer?.setData('text/plain', String(id));
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
      const chip = (e.target as HTMLElement).closest('.chip');
      if (chip) e.dataTransfer.setDragImage(chip, 20, 20);
    }
  }
  onDragOver(ci: number, e: DragEvent): void {
    e.preventDefault();
    this.overCol.set(ci);
  }
  onDrop(ci: number, beforeId: number | null, e: DragEvent): void {
    e.preventDefault();
    e.stopPropagation();
    const id = this.dragId();
    if (id >= 0) this.movePlayer(id, ci, beforeId);
    this.dragId.set(-1);
    this.overCol.set(-1);
  }

  private emptyTeam(id: 0 | 1): TabuTeam {
    return { id, name: '', color: '#888', players: [], score: 0, position: 0, turns: 0, doubleTime: false, doubleBuzz: false };
  }

  startGame(): void {
    if (!this.canStart()) return;
    const clean = (c: TabuSlot[]) => c.map((p) => p.name.trim()).filter((n) => n);
    const a = clean(this.cols()[0]);
    const b = clean(this.cols()[1]);
    savePlayerNames([...a, ...b]);
    try {
      localStorage.setItem(TEAMS_KEY, JSON.stringify({ a, b }));
    } catch {}
    this.teams.set([
      { ...this.emptyTeam(0), name: 'Team Blau/Lila', color: '#8b5cf6', players: a },
      { ...this.emptyTeam(1), name: 'Team Pink/Orange', color: '#fb7185', players: b },
    ]);
    this.deck = [];
    this.activeIdx.set(0);
    this.round.set(0);
    this.winner.set(null);
    this.moveMsg.set('');
    this.phase.set('prepare');
  }

  restart(): void {
    this.phase.set('setup');
  }

  // ---------- Turn ----------
  private drawCard(): TabuCard {
    if (!this.deck.length) {
      const used = this.loadUsed();
      let fresh = this.pool().filter((c) => !used.has(c.id));
      if (!fresh.length) {
        // every card of this pool was played: start over only for this pool
        this.pool().forEach((c) => used.delete(c.id));
        this.saveUsed(used);
        fresh = this.pool();
      }
      this.deck = shuffle(fresh);
    }
    const card = this.deck.pop()!;
    const used = this.loadUsed();
    used.add(card.id);
    this.saveUsed(used);
    return card;
  }

  private loadUsed(): Set<string> {
    if (typeof window === 'undefined') return new Set();
    try {
      return new Set(JSON.parse(localStorage.getItem(USED_KEY) ?? '[]') as string[]);
    } catch {
      return new Set();
    }
  }

  private saveUsed(used: Set<string>): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(USED_KEY, JSON.stringify([...used]));
    } catch {}
  }

  startTurn(): void {
    this.ensureAudio();
    const total = this.effectiveTime();
    this.totalTime.set(total);
    this.timeLeft.set(total);
    this.correct.set(0);
    this.buzzed.set(0);
    this.skipped.set(0);
    this.cardAnim.set('in');
    this.card.set(this.drawCard());
    this.lastTick = -1;
    this.animating = false;
    this.phase.set('play');
    this.endAt = Date.now() + total * 1000;
    this.stopTimer();
    this.timer = setInterval(() => {
      const left = (this.endAt - Date.now()) / 1000;
      if (left <= 0) {
        this.timeLeft.set(0);
        this.finishTurn();
      } else {
        this.timeLeft.set(left);
      }
    }, 100);
  }

  private stopTimer(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  endTurnNow(): void {
    this.finishTurn();
  }

  private nextCard(anim: CardAnim): void {
    if (this.animating || this.phase() !== 'play') return;
    this.animating = true;
    this.cardAnim.set(anim);
    this.later(320, () => {
      this.card.set(this.drawCard());
      this.cardAnim.set('in');
      this.animating = false;
    });
  }

  markCorrect(): void {
    if (this.phase() !== 'play' || this.animating) return;
    this.correct.update((n) => n + 1);
    this.playSuccess();
    this.nextCard('out-up');
  }

  buzz(): void {
    if (this.phase() !== 'play' || this.animating) return;
    this.buzzed.update((n) => n + 1);
    this.squishing.set(true);
    this.later(400, () => this.squishing.set(false));
    this.playSqueak();
    this.nextCard('out-down');
  }

  skip(): void {
    if (this.phase() !== 'play' || this.animating) return;
    this.skipped.update((n) => n + 1);
    this.playStep(300);
    this.nextCard('out-skip');
  }

  @HostListener('window:keydown', ['$event'])
  onKey(e: KeyboardEvent): void {
    if (this.phase() !== 'play' || e.repeat) return;
    if (e.code === 'Space' || e.key.toLowerCase() === 'b') {
      e.preventDefault();
      this.buzz();
    }
  }

  private finishTurn(): void {
    if (this.phase() !== 'play') return;
    this.stopTimer();
    this.phase.set('moving');
    this.playTimeUp();
    void this.runMoving();
  }

  private async runMoving(): Promise<void> {
    const me = this.activeIdx();
    const other = me === 0 ? 1 : 0;
    const t = this.teams()[me];
    const penalty = t.doubleBuzz ? 2 : 1;
    const net = Math.max(0, this.correct() - this.buzzed() * penalty);
    const gift = this.buzzGivesPoint() ? this.buzzed() : 0;
    // consume one-shot modifiers of the team that just played
    this.patchTeam(me, { doubleTime: false, doubleBuzz: false, turns: t.turns + 1, score: t.score + this.correct() });
    const parts = [
      `${t.name}: ${net} Feld${net === 1 ? '' : 'er'} (✅ ${this.correct()} − 🚨 ${this.buzzed()}${penalty === 2 ? ' ×2' : ''})`,
    ];
    if (gift > 0) parts.push(`${this.teams()[other].name}: +${gift} durch Quietscher`);
    this.moveMsg.set(parts.join(' · '));

    await this.openBoard();
    await this.sleep(500);
    if (this.destroyed) return;

    let won = await this.moveTeam(me, net);
    if (!won) won = await this.moveTeam(other, gift);
    if (this.destroyed) return;
    if (won) {
      await this.sleep(1500);
      await this.closeBoard();
      if (this.destroyed) return;
      this.winner.set(this.teams()[this.teams()[me].position >= BOARD_LENGTH ? me : other]);
      this.moveMsg.set('');
      this.phase.set('won');
      return;
    }
    await this.sleep(2500);
    await this.closeBoard();
    if (this.destroyed) return;
    this.moveMsg.set('');
    this.round.update((r) => r + 1);
    this.activeIdx.set(other);
    this.phase.set('prepare');
  }

  private patchTeam(i: number, p: Partial<TabuTeam>): void {
    this.teams.update((ts) => ts.map((t, idx) => (idx === i ? { ...t, ...p } : t)));
  }

  /** Moves a pawn step by step. Returns true if the team finished the lap. */
  private async moveTeam(i: number, steps: number, bonus = false): Promise<boolean> {
    for (let s = 0; s < steps; s++) {
      if (this.destroyed) return false;
      const pos = this.teams()[i].position + 1;
      this.patchTeam(i, { position: pos });
      this.playStep(500 + (pos % 5) * 60);
      await this.sleep(400);
      if (pos >= BOARD_LENGTH) return true;
    }
    if (bonus) return false;
    const pos = this.teams()[i].position % BOARD_LENGTH;
    if (steps > 0) {
      const cell = BOARD[pos];
      if (cell.type === 'squeak') {
        this.patchTeam(i, { doubleBuzz: true });
        this.moveMsg.update((m) => `${m} · 🚨 ${this.teams()[i].name}: Quietscher zählt nächste Runde doppelt!`);
      } else if (cell.type === 'time') {
        this.patchTeam(i, { doubleTime: true });
        this.moveMsg.update((m) => `${m} · ⏳ ${this.teams()[i].name}: nächste Runde doppelte Zeit!`);
      } else if (cell.type === 'special') {
        this.moveMsg.update((m) => `${m} · 🃏 Spezialkarte: ${this.teams()[i].name} +2 Bonusfelder!`);
        await this.sleep(600);
        return this.moveTeam(i, 2, true);
      }
    }
    return false;
  }

  // ---------- Board overlay ----------
  toggleBoard(): void {
    if (this.overlay() && this.unfolded()) void this.closeBoard();
    else if (!this.overlay()) void this.openBoard();
  }

  private async openBoard(): Promise<void> {
    if (this.overlay() && this.unfolded()) return;
    this.overlay.set(true);
    this.unfolded.set(false);
    await this.sleep(60);
    this.playFold();
    this.unfolded.set(true);
    await this.sleep(1900);
  }

  private async closeBoard(): Promise<void> {
    if (!this.overlay()) return;
    this.playFold();
    this.unfolded.set(false);
    await this.sleep(1900);
    this.overlay.set(false);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((res) => this.later(ms, res));
  }

  private later(ms: number, fn: () => void): void {
    const id = setTimeout(() => {
      this.pending.delete(id);
      if (!this.destroyed) fn();
    }, ms);
    this.pending.add(id);
  }

  // ---------- Audio (Web Audio API) ----------
  private ensureAudio(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.audioCtx) {
      const Ctor = window.AudioContext ?? (window as any).webkitAudioContext;
      if (!Ctor) return null;
      this.audioCtx = new Ctor();
    }
    if (this.audioCtx!.state === 'suspended') void this.audioCtx!.resume();
    return this.audioCtx;
  }

  private tone(
    ctx: AudioContext,
    type: OscillatorType,
    f0: number,
    f1: number,
    start: number,
    dur: number,
    gain: number,
    dest: AudioNode = ctx.destination,
  ): void {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, start);
    o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), start + dur);
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(gain, start + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    o.connect(g).connect(dest);
    o.start(start);
    o.stop(start + dur + 0.05);
  }

  /** Squeaky-toy buzzer: distorted triangle wave sweeping ~800 Hz → ~400 Hz with vibrato */
  private playSqueak(): void {
    const ctx = this.muted() ? null : this.ensureAudio();
    if (!ctx) return;
    const t = ctx.currentTime;
    const shaper = ctx.createWaveShaper();
    const curve = new Float32Array(256);
    for (let i = 0; i < 256; i++) {
      const x = (i / 255) * 2 - 1;
      curve[i] = Math.tanh(x * 4);
    }
    shaper.curve = curve;
    shaper.connect(ctx.destination);
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    o.type = 'triangle';
    o.frequency.setValueAtTime(800, t);
    o.frequency.exponentialRampToValueAtTime(1000, t + 0.05);
    o.frequency.exponentialRampToValueAtTime(400, t + 0.4);
    lfo.frequency.value = 38;
    lfoGain.gain.value = 40;
    lfo.connect(lfoGain).connect(o.frequency);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.35, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);
    o.connect(g).connect(shaper);
    o.start(t);
    lfo.start(t);
    o.stop(t + 0.5);
    lfo.stop(t + 0.5);
  }

  private playSuccess(): void {
    const ctx = this.muted() ? null : this.ensureAudio();
    if (!ctx) return;
    const t = ctx.currentTime;
    [523.25, 659.25, 783.99].forEach((f, i) => this.tone(ctx, 'sine', f, f, t + i * 0.06, 0.6, 0.18));
  }

  private playFold(): void {
    const ctx = this.muted() ? null : this.ensureAudio();
    if (!ctx) return;
    const t = ctx.currentTime;
    const len = Math.floor(ctx.sampleRate * 0.7);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(300, t);
    bp.frequency.exponentialRampToValueAtTime(1800, t + 0.35);
    bp.frequency.exponentialRampToValueAtTime(200, t + 0.7);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.25, t + 0.3);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.7);
    src.connect(bp).connect(g).connect(ctx.destination);
    src.start(t);
    this.tone(ctx, 'sine', 140, 40, t + 0.55, 0.3, 0.5); // thud
  }

  private playStep(freq = 600): void {
    const ctx = this.muted() ? null : this.ensureAudio();
    if (!ctx) return;
    const t = ctx.currentTime;
    this.tone(ctx, 'square', freq, freq * 0.6, t, 0.08, 0.1);
  }

  private playTimeUp(): void {
    const ctx = this.muted() ? null : this.ensureAudio();
    if (!ctx) return;
    const t = ctx.currentTime;
    this.tone(ctx, 'sine', 440, 440, t, 0.5, 0.25);
    this.tone(ctx, 'sine', 330, 330, t + 0.18, 0.8, 0.25);
  }
}
