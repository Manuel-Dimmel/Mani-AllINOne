import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
  computed,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { loadSavedPlayerNames, savePlayerNames } from '../../services/player-storage';

type HubTab = 'wheel' | 'teams' | 'dice' | 'oracle';
type SpinDurationMode = 3 | 5 | 8;
type TeamMode = 'byCount' | 'bySize' | 'bracket';
type DiceType = 4 | 6 | 8 | 10 | 12 | 20 | 100;

interface WheelHistoryItem {
  name: string;
  color: string;
  time: string;
  removed: boolean;
}

interface GeneratedTeam {
  id: number;
  name: string;
  color: string;
  members: string[];
  captainIndex: number;
}

interface BracketMatch {
  matchNumber: number;
  playerA: string;
  playerB: string | null; // null = Freilos (Bye)
}

interface DieState {
  id: number;
  value: number;
  held: boolean;
  rolling: boolean;
}

interface DiceHistoryEntry {
  id: number;
  diceLabel: string;
  values: number[];
  sum: number;
  max: number;
  badge: string | null;
  time: string;
}

interface OracleResponse {
  category: 'JA' | 'NEIN' | 'VIELLEICHT';
  headline: string;
  subtext: string;
  color: string;
  icon: string;
}

interface ConfettiParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  rotation: number;
  vRot: number;
  alpha: number;
}

const WHEEL_PALETTE: readonly string[] = [
  '#6366f1', // Indigo
  '#ec4899', // Pink
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#06b6d4', // Cyan
  '#8b5cf6', // Violet
  '#f43f5e', // Rose
  '#14b8a6', // Teal
  '#eab308', // Yellow
  '#3b82f6', // Blue
];

const CREATIVE_TEAM_NAMES: readonly string[] = [
  'Neon Titans',
  'Cyber Wolves',
  'Shadow Hawks',
  'Turbo Pandas',
  'Cosmic Vipers',
  'Quantum Foxes',
  'Apex Dragons',
  'Thunder Ninjas',
  'Nova Knights',
  'Blaze Mavericks',
  'Vortex Spartans',
  'Pixel Gladiators',
];

const ORACLE_ANSWERS: readonly OracleResponse[] = [
  {
    category: 'JA',
    headline: '100 % JA!',
    subtext: 'Die Sterne stehen perfekt – leg sofort los!',
    color: '#10b981',
    icon: '✅',
  },
  {
    category: 'JA',
    headline: 'Definitiv Ja!',
    subtext: 'Keine Zweifel, das wird eine legendäre Entscheidung.',
    color: '#10b981',
    icon: '🚀',
  },
  {
    category: 'JA',
    headline: 'Auf jeden Fall!',
    subtext: 'Das Schicksal nickt wohlwollend.',
    color: '#34d399',
    icon: '✨',
  },
  {
    category: 'JA',
    headline: 'Grünes Licht!',
    subtext: 'Mach es, bevor du es dir anders überlegst.',
    color: '#10b981',
    icon: '🟢',
  },
  {
    category: 'NEIN',
    headline: 'Auf keinen Fall!',
    subtext: 'Das Orakel schüttelt energisch den Kopf.',
    color: '#f43f5e',
    icon: '❌',
  },
  {
    category: 'NEIN',
    headline: 'Lieber nicht...',
    subtext: 'Spar dir die Energie für eine bessere Idee.',
    color: '#fb7185',
    icon: '🛑',
  },
  {
    category: 'NEIN',
    headline: 'Veto vom Schicksal!',
    subtext: 'Die Wahrscheinlichkeit für Chaos liegt bei 99,8 %.',
    color: '#f43f5e',
    icon: '⚡',
  },
  {
    category: 'VIELLEICHT',
    headline: 'Vielleicht...',
    subtext: 'Frag nochmal nach einem kühlen Getränk!',
    color: '#f59e0b',
    icon: '🔮',
  },
  {
    category: 'VIELLEICHT',
    headline: '50 / 50 Chance!',
    subtext: 'Wirf sicherheitshalber zusätzlich die Münze links.',
    color: '#fbbf24',
    icon: '⚖️',
  },
  {
    category: 'VIELLEICHT',
    headline: 'Noch unklar...',
    subtext: 'Bestechung durch Snacks könnte die Antwort verbessern.',
    color: '#f59e0b',
    icon: '🍕',
  },
];

@Component({
  selector: 'app-decision-hub',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="tool-page">
      <!-- Topbar -->
      <div class="topbar">
        <a routerLink="/" class="back-btn">← Zurück zur Übersicht</a>
        <div class="topbar-right">
          <button
            type="button"
            class="sound-btn"
            [class.muted]="isMuted()"
            (click)="toggleMute()"
            title="Soundeffekte umschalten"
          >
            {{ isMuted() ? '🔇 Stumm' : '🔊 Sound An' }}
          </button>
          <span class="crumb-pill">⚡ PROGRAMME • PARTY & ZUFALL</span>
        </div>
      </div>

      <!-- Main Header & Mode Switcher -->
      <section class="tool-card glass-panel">
        <div class="tool-header-row">
          <div class="tool-header">
            <div class="tool-icon">🎡</div>
            <div>
              <h1>Entscheidungs-Hub</h1>
              <p>
                Interaktives Glücksrad, Team- & Turnier-Generator, 3D-Würfel-Arena und Schnell-Orakel mit Sound-Engine.
              </p>
            </div>
          </div>

          <!-- 4 Mode Tabs -->
          <div class="mode-tabs" role="tablist">
            <button
              type="button"
              class="mode-tab"
              [class.active]="activeTab() === 'wheel'"
              (click)="selectTab('wheel')"
            >
              <span class="tab-emoji">🎡</span>
              <span>Glücksrad</span>
            </button>
            <button
              type="button"
              class="mode-tab"
              [class.active]="activeTab() === 'teams'"
              (click)="selectTab('teams')"
            >
              <span class="tab-emoji">👥</span>
              <span>Team-Generator</span>
            </button>
            <button
              type="button"
              class="mode-tab"
              [class.active]="activeTab() === 'dice'"
              (click)="selectTab('dice')"
            >
              <span class="tab-emoji">🎲</span>
              <span>3D-Würfel-Arena</span>
            </button>
            <button
              type="button"
              class="mode-tab"
              [class.active]="activeTab() === 'oracle'"
              (click)="selectTab('oracle')"
            >
              <span class="tab-emoji">🪙</span>
              <span>Münze & Orakel</span>
            </button>
          </div>
        </div>

        <!-- ================================================================
             TAB 1: GLÜCKSRAD ("WHEEL OF NAMES")
             ================================================================ -->
        <div class="tab-panel" [class.tab-hidden]="activeTab() !== 'wheel'">
          <div class="wheel-layout">
            <!-- Left: Wheel Canvas Stage -->
            <div class="wheel-stage-card">
              <div class="wheel-canvas-wrap">
                <canvas
                  #wheelCanvas
                  width="500"
                  height="500"
                  class="wheel-canvas"
                  (click)="spinWheel()"
                ></canvas>

                <!-- Center Spin Trigger Button -->
                <button
                  type="button"
                  class="wheel-center-btn"
                  [disabled]="isSpinning() || wheelItems().length < 2"
                  (click)="spinWheel()"
                >
                  <span class="spin-label">{{ isSpinning() ? '🔥' : 'DREHEN' }}</span>
                </button>
              </div>

              <!-- Winner Banner / Action Bar -->
              @if (wheelWinner(); as winner) {
                <div class="winner-banner" [style.borderColor]="winner.color">
                  <div class="winner-badge-left">
                    <span class="winner-crown">🎉 GEWINNER</span>
                    <strong class="winner-name" [style.color]="winner.color">{{ winner.name }}</strong>
                  </div>
                  <div class="winner-actions">
                    @if (!eliminateWinner()) {
                      <button type="button" class="btn-secondary btn-sm" (click)="removeCurrentWinner()">
                        🗑️ Aus Rad entfernen
                      </button>
                    }
                    <button type="button" class="btn-primary btn-sm" (click)="spinWheel()">
                      🔄 Nochmal drehen
                    </button>
                  </div>
                </div>
              } @else {
                <div class="wheel-status-bar">
                  <span>
                    🎯 <strong>{{ wheelItems().length }}</strong> aktive Segmente im Rad
                  </span>
                  <button
                    type="button"
                    class="btn-primary"
                    [disabled]="isSpinning() || wheelItems().length < 2"
                    (click)="spinWheel()"
                  >
                    {{ isSpinning() ? '🎡 Rad dreht sich...' : '🎡 Jetzt drehen!' }}
                  </button>
                </div>
              }
            </div>

            <!-- Right: Controls, Templates, Entries & History -->
            <div class="wheel-controls-col">
              <!-- Quick Templates -->
              <div class="sub-card">
                <div class="sub-header">
                  <h3>⚡ Schnell-Vorlagen</h3>
                  <span class="badge-pill">1-Klick Laden</span>
                </div>
                <div class="preset-grid">
                  <button
                    type="button"
                    class="preset-chip"
                    [disabled]="isSpinning()"
                    (click)="loadWheelPreset('whoStarts')"
                  >
                    👥 Wer fängt an?
                  </button>
                  <button
                    type="button"
                    class="preset-chip"
                    [disabled]="isSpinning()"
                    (click)="loadWheelPreset('food')"
                  >
                    🍕 Was essen wir heute?
                  </button>
                  <button
                    type="button"
                    class="preset-chip"
                    [disabled]="isSpinning()"
                    (click)="loadWheelPreset('partyDare')"
                  >
                    🔥 Party-Pflicht / Strafe
                  </button>
                  <button
                    type="button"
                    class="preset-chip"
                    [disabled]="isSpinning()"
                    (click)="loadWheelPreset('nextGame')"
                  >
                    🎮 Welches Spiel als Nächstes?
                  </button>
                </div>
              </div>

              <!-- Entries Textarea & Quick Add -->
              <div class="sub-card">
                <div class="sub-header">
                  <h3>📝 Einträge verwalten ({{ wheelItems().length }})</h3>
                  <div class="inline-actions">
                    <button
                      type="button"
                      class="mini-btn"
                      [disabled]="isSpinning() || wheelItems().length < 2"
                      (click)="shuffleWheelEntries()"
                    >
                      🔀 Mischen
                    </button>
                    <button
                      type="button"
                      class="mini-btn"
                      [disabled]="isSpinning()"
                      (click)="sortWheelEntries()"
                    >
                      🔤 A–Z
                    </button>
                  </div>
                </div>

                <div class="quick-add-row">
                  <input
                    type="text"
                    class="text-input"
                    placeholder="Neuen Eintrag hinzufügen (Enter)..."
                    [ngModel]="newWheelEntry()"
                    (ngModelChange)="newWheelEntry.set($event)"
                    (keydown.enter)="addWheelEntry()"
                    [disabled]="isSpinning()"
                  />
                  <button
                    type="button"
                    class="btn-secondary"
                    [disabled]="isSpinning() || !newWheelEntry().trim()"
                    (click)="addWheelEntry()"
                  >
                    + Hinzufügen
                  </button>
                </div>

                <textarea
                  rows="6"
                  class="entries-textarea"
                  placeholder="Ein Eintrag pro Zeile..."
                  [ngModel]="wheelRawText()"
                  (ngModelChange)="onWheelTextChange($event)"
                  [disabled]="isSpinning()"
                ></textarea>
              </div>

              <!-- Spin Options -->
              <div class="sub-card">
                <div class="sub-header">
                  <h3>⚙️ Rad-Optionen</h3>
                </div>

                <div class="options-stack">
                  <label class="check-pill">
                    <input
                      type="checkbox"
                      [ngModel]="eliminateWinner()"
                      (ngModelChange)="eliminateWinner.set($event)"
                    />
                    <span>🎯 Gewinner nach dem Drehen automatisch aus dem Rad entfernen (Eliminations-Modus)</span>
                  </label>

                  <div class="duration-row">
                    <span class="duration-label">⏱️ Dreh-Dauer:</span>
                    <div class="segmented-group">
                      <button
                        type="button"
                        class="seg-btn"
                        [class.active]="spinDuration() === 3"
                        (click)="spinDuration.set(3)"
                      >
                        Kurz (3s)
                      </button>
                      <button
                        type="button"
                        class="seg-btn"
                        [class.active]="spinDuration() === 5"
                        (click)="spinDuration.set(5)"
                      >
                        Normal (5s)
                      </button>
                      <button
                        type="button"
                        class="seg-btn"
                        [class.active]="spinDuration() === 8"
                        (click)="spinDuration.set(8)"
                      >
                        Spannend (8s)
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Winner History -->
              @if (wheelHistory().length > 0) {
                <div class="sub-card">
                  <div class="sub-header">
                    <h3>🏆 Gewinner-Historie ({{ wheelHistory().length }})</h3>
                    <button type="button" class="mini-btn" (click)="wheelHistory.set([])">
                      Leeren
                    </button>
                  </div>
                  <div class="history-list">
                    @for (item of wheelHistory(); track $index) {
                      <div class="history-chip">
                        <span class="color-dot" [style.background]="item.color"></span>
                        <strong class="hist-name">{{ item.name }}</strong>
                        @if (item.removed) {
                          <span class="hist-tag">entfernt</span>
                        }
                        <span class="hist-time">{{ item.time }}</span>
                      </div>
                    }
                  </div>
                </div>
              }
            </div>
          </div>
        </div>

        <!-- ================================================================
             TAB 2: TEAM- & TURNIER-GENERATOR
             ================================================================ -->
        @if (activeTab() === 'teams') {
          <div class="teams-layout">
            <!-- Left Column: Player Input & Generator Settings -->
            <div class="teams-config-col">
              <div class="sub-card">
                <div class="sub-header">
                  <h3>👥 Spielerliste ({{ parsedPlayers().length }} Spieler)</h3>
                  <div class="inline-actions">
                    <button type="button" class="mini-btn" (click)="loadPlayerPreset(4)">4er</button>
                    <button type="button" class="mini-btn" (click)="loadPlayerPreset(6)">6er</button>
                    <button type="button" class="mini-btn" (click)="loadPlayerPreset(8)">8er</button>
                    <button type="button" class="mini-btn" (click)="loadPlayerPreset(10)">10er</button>
                    <button type="button" class="mini-btn" (click)="loadPlayerPreset(12)">12er</button>
                  </div>
                </div>

                <div class="quick-add-row">
                  <input
                    type="text"
                    class="text-input"
                    placeholder="Spielername eingeben (Enter)..."
                    [ngModel]="newPlayerName()"
                    (ngModelChange)="newPlayerName.set($event)"
                    (keydown.enter)="addPlayer()"
                  />
                  <button
                    type="button"
                    class="btn-secondary"
                    [disabled]="!newPlayerName().trim()"
                    (click)="addPlayer()"
                  >
                    + Spieler
                  </button>
                </div>

                <textarea
                  rows="7"
                  class="entries-textarea"
                  placeholder="Ein Spielername pro Zeile..."
                  [ngModel]="playersRawText()"
                  (ngModelChange)="playersRawText.set($event)"
                ></textarea>
              </div>

              <div class="sub-card">
                <div class="sub-header">
                  <h3>⚙️ Auslosungs-Modus & Optionen</h3>
                </div>

                <div class="mode-selector-grid">
                  <button
                    type="button"
                    class="mode-option-card"
                    [class.active]="teamMode() === 'byCount'"
                    (click)="teamMode.set('byCount'); generateTeamsOrBracket()"
                  >
                    <span class="mode-opt-icon">🛡️</span>
                    <strong>Nach Anzahl Teams</strong>
                    <small>Teilt Spieler auf X Teams auf</small>
                  </button>
                  <button
                    type="button"
                    class="mode-option-card"
                    [class.active]="teamMode() === 'bySize'"
                    (click)="teamMode.set('bySize'); generateTeamsOrBracket()"
                  >
                    <span class="mode-opt-icon">⚖️</span>
                    <strong>Nach Teamgröße</strong>
                    <small>z. B. 2er-, 3er- oder 4er-Teams</small>
                  </button>
                  <button
                    type="button"
                    class="mode-option-card"
                    [class.active]="teamMode() === 'bracket'"
                    (click)="teamMode.set('bracket'); generateTeamsOrBracket()"
                  >
                    <span class="mode-opt-icon">⚔️</span>
                    <strong>1v1 K.O.-Duelle</strong>
                    <small>Direkte Turnier-Paarungen</small>
                  </button>
                </div>

                @if (teamMode() === 'byCount') {
                  <div class="duration-row">
                    <span class="duration-label">Anzahl der Teams:</span>
                    <div class="segmented-group">
                      @for (cnt of [2, 3, 4, 5, 6]; track cnt) {
                        <button
                          type="button"
                          class="seg-btn"
                          [class.active]="targetTeamCount() === cnt"
                          (click)="targetTeamCount.set(cnt); generateTeamsOrBracket()"
                        >
                          {{ cnt }} Teams
                        </button>
                      }
                    </div>
                  </div>
                }

                @if (teamMode() === 'bySize') {
                  <div class="duration-row">
                    <span class="duration-label">Spieler pro Team:</span>
                    <div class="segmented-group">
                      @for (sz of [2, 3, 4, 5]; track sz) {
                        <button
                          type="button"
                          class="seg-btn"
                          [class.active]="targetTeamSize() === sz"
                          (click)="targetTeamSize.set(sz); generateTeamsOrBracket()"
                        >
                          {{ sz }}er-Teams
                        </button>
                      }
                    </div>
                  </div>
                }

                @if (teamMode() !== 'bracket') {
                  <div class="options-stack">
                    <label class="check-pill">
                      <input
                        type="checkbox"
                        [ngModel]="assignCaptains()"
                        (ngModelChange)="assignCaptains.set($event); generateTeamsOrBracket()"
                      />
                      <span>👑 Automatisch einen Team-Kapitän pro Team krönen</span>
                    </label>
                    <label class="check-pill">
                      <input
                        type="checkbox"
                        [ngModel]="useCreativeTeamNames()"
                        (ngModelChange)="useCreativeTeamNames.set($event); generateTeamsOrBracket()"
                      />
                      <span>⚡ Kreative E-Sport / Party Team-Namen generieren</span>
                    </label>
                  </div>
                }

                <div class="team-action-bar">
                  <button
                    type="button"
                    class="btn-primary full-btn"
                    [disabled]="parsedPlayers().length < 2"
                    (click)="generateTeamsOrBracket(true)"
                  >
                    🔀 Jetzt neu auslosen!
                  </button>
                  <button
                    type="button"
                    class="btn-secondary"
                    (click)="copyTeamsToClipboard()"
                  >
                    {{ teamsCopied() ? '✓ Kopiert!' : '📋 Kopieren' }}
                  </button>
                </div>
              </div>
            </div>

            <!-- Right Column: Generated Teams or 1v1 Bracket Display -->
            <div class="teams-output-col">
              @if (teamMode() !== 'bracket') {
                <div class="teams-grid" [class.shuffling]="isShufflingTeams()">
                  @for (team of generatedTeams(); track team.id) {
                    <div class="team-card" [style.borderTopColor]="team.color">
                      <div class="team-card-header">
                        <div class="team-title-wrap">
                          <span class="team-dot" [style.background]="team.color"></span>
                          <h4>{{ team.name }}</h4>
                        </div>
                        <span class="member-count-pill">{{ team.members.length }} Spieler</span>
                      </div>

                      <ul class="team-member-list">
                        @for (member of team.members; track $index) {
                          <li
                            class="team-member-item"
                            [class.is-captain]="assignCaptains() && $index === team.captainIndex"
                          >
                            <span class="member-avatar" [style.background]="team.color + '28'" [style.color]="team.color">
                              {{ member.slice(0, 2).toUpperCase() }}
                            </span>
                            <span class="member-name">{{ member }}</span>
                            @if (assignCaptains() && $index === team.captainIndex) {
                              <span class="captain-badge" title="Team-Kapitän">👑 Kapitän</span>
                            }
                          </li>
                        }
                      </ul>
                    </div>
                  }
                </div>
              } @else {
                <div class="bracket-card sub-card" [class.shuffling]="isShufflingTeams()">
                  <div class="sub-header">
                    <h3>⚔️ 1-gegen-1 K.O.-Turnier (Runde 1)</h3>
                    <span class="badge-pill">{{ generatedBracket().length }} Duelle</span>
                  </div>

                  <div class="bracket-list">
                    @for (match of generatedBracket(); track match.matchNumber) {
                      <div class="duel-row">
                        <span class="duel-num">Duell #{{ match.matchNumber }}</span>
                        <div class="duel-players">
                          <span class="duel-player player-a">{{ match.playerA }}</span>
                          <span class="vs-pill">VS</span>
                          @if (match.playerB) {
                            <span class="duel-player player-b">{{ match.playerB }}</span>
                          } @else {
                            <span class="duel-player player-bye">🎟️ Freilos (Direkt weiter)</span>
                          }
                        </div>
                      </div>
                    }
                  </div>
                </div>
              }
            </div>
          </div>
        }

        <!-- ================================================================
             TAB 3: 3D-WÜRFEL-ARENA (DICE ROLLER)
             ================================================================ -->
        @if (activeTab() === 'dice') {
          <div class="dice-layout">
            <!-- Top Controls Bar -->
            <div class="dice-controls-bar sub-card">
              <div class="dice-control-group">
                <span class="control-label">🎲 Würfel-Typ:</span>
                <div class="segmented-group">
                  @for (dtype of diceTypes; track dtype) {
                    <button
                      type="button"
                      class="seg-btn"
                      [class.active]="selectedDiceType() === dtype"
                      (click)="setDiceType(dtype)"
                    >
                      {{ dtype === 100 ? 'D100 (%)' : 'D' + dtype }}
                    </button>
                  }
                </div>
              </div>

              <div class="dice-control-group">
                <span class="control-label">🔢 Anzahl ({{ diceCount() }}):</span>
                <div class="segmented-group">
                  @for (cnt of [1, 2, 3, 4, 5, 6, 7, 8]; track cnt) {
                    <button
                      type="button"
                      class="seg-btn"
                      [class.active]="diceCount() === cnt"
                      (click)="setDiceCount(cnt)"
                    >
                      {{ cnt }}
                    </button>
                  }
                </div>
              </div>

              <div class="dice-cta-group">
                @if (hasHeldDice()) {
                  <button type="button" class="btn-secondary" (click)="releaseAllDice()">
                    🔓 Alle freigeben
                  </button>
                }
                <button
                  type="button"
                  class="btn-primary roll-cta-btn"
                  [disabled]="isRollingDice()"
                  (click)="rollDice()"
                >
                  {{ isRollingDice() ? '🎲 Würfel rollen...' : '🎲 Jetzt würfeln!' }}
                </button>
              </div>
            </div>

            <!-- Dice Arena Stage -->
            <div class="dice-arena-stage">
              <div class="arena-hint">
                💡 Tipp: Klicke auf einzelne Würfel, um sie für den nächsten Wurf zu <strong>halten / sperren (🔒 Hold)</strong> – ideal für Kniffel & Yahtzee!
              </div>

              <div class="dice-grid">
                @for (die of diceList(); track die.id) {
                  <button
                    type="button"
                    class="die-card"
                    [class.is-rolling]="die.rolling"
                    [class.is-held]="die.held"
                    [class.is-crit]="die.value === selectedDiceType() && selectedDiceType() >= 6"
                    [class.is-fumble]="die.value === 1 && selectedDiceType() === 20"
                    (click)="toggleHoldDie(die.id)"
                  >
                    <div class="die-top-meta">
                      <span class="die-type-tag">D{{ selectedDiceType() }}</span>
                      <span class="hold-indicator">{{ die.held ? '🔒 GEHALTEN' : '🔓' }}</span>
                    </div>

                    <!-- Classic 3D D6 with real Pips -->
                    @if (selectedDiceType() === 6) {
                      <div class="d6-cube">
                        @for (pip of [1, 2, 3, 4, 5, 6, 7, 8, 9]; track pip) {
                          <span
                            class="pip"
                            [class.visible]="hasPip(die.value, pip)"
                            [class.red-pip]="die.value === 1 && pip === 5"
                          ></span>
                        }
                      </div>
                    } @else {
                      <!-- Polygon RPG Die Display -->
                      <div class="poly-die" [attr.data-sides]="selectedDiceType()">
                        <span class="poly-value">{{ die.value }}</span>
                      </div>
                    }

                    <span class="die-numeric-sub">Wurf: <strong>{{ die.value }}</strong></span>
                  </button>
                }
              </div>

              <!-- Live Roll Stats & Pasch Banner -->
              <div class="dice-stats-row">
                <div class="stat-box">
                  <span class="stat-label">Gesamtsumme</span>
                  <strong class="stat-val accent-indigo">{{ diceSum() }}</strong>
                </div>
                <div class="stat-box">
                  <span class="stat-label">Höchster Wurf</span>
                  <strong class="stat-val accent-emerald">{{ diceMax() }}</strong>
                </div>
                <div class="stat-box">
                  <span class="stat-label">Durchschnitt</span>
                  <strong class="stat-val">{{ diceAverage() }}</strong>
                </div>
                <div class="stat-box special-stat-box" [class.has-special]="!!diceSpecialBadge()">
                  <span class="stat-label">Kombination / Pasch</span>
                  <strong class="stat-val special-text">
                    {{ diceSpecialBadge() || 'Kein Pasch' }}
                  </strong>
                </div>
              </div>
            </div>

            <!-- Roll History -->
            @if (diceHistory().length > 0) {
              <div class="sub-card">
                <div class="sub-header">
                  <h3>📜 Letzte 10 Würfe</h3>
                  <button type="button" class="mini-btn" (click)="diceHistory.set([])">
                    Verlauf löschen
                  </button>
                </div>
                <div class="dice-history-table">
                  @for (entry of diceHistory(); track entry.id) {
                    <div class="dice-hist-row">
                      <span class="dh-time">{{ entry.time }}</span>
                      <span class="dh-type">{{ entry.diceLabel }}</span>
                      <div class="dh-values">
                        @for (v of entry.values; track $index) {
                          <span class="dh-die-pill">{{ v }}</span>
                        }
                      </div>
                      @if (entry.badge) {
                        <span class="dh-badge">{{ entry.badge }}</span>
                      }
                      <span class="dh-sum">Summe: <strong>{{ entry.sum }}</strong></span>
                    </div>
                  }
                </div>
              </div>
            }
          </div>
        }

        <!-- ================================================================
             TAB 4: MÜNZWURF & SCHNELL-ORAKEL
             ================================================================ -->
        @if (activeTab() === 'oracle') {
          <div class="oracle-grid">
            <!-- Card 1: 3D Coin Flip -->
            <div class="sub-card oracle-card">
              <div class="sub-header">
                <h3>🪙 3D-Münzwurf</h3>
                <button type="button" class="mini-btn" (click)="resetCoinStats()">Reset</button>
              </div>
              <p class="card-desc">Kopf oder Zahl? Perfekt für schnelle 50/50-Entscheidungen.</p>

              <div class="coin-stage">
                <div
                  class="coin-3d"
                  [class.flipping]="isFlippingCoin()"
                  [style.transform]="'rotateY(' + coinRotationDeg() + 'deg)'"
                  (click)="flipCoin()"
                >
                  <div class="coin-face coin-heads">
                    <span class="coin-icon">🦅</span>
                    <span class="coin-title">KOPF</span>
                  </div>
                  <div class="coin-face coin-tails">
                    <span class="coin-icon">🏛️</span>
                    <span class="coin-title">ZAHL</span>
                  </div>
                </div>
              </div>

              <div class="coin-result-label">
                @if (isFlippingCoin()) {
                  <span>Münze wirbelt durch die Luft...</span>
                } @else {
                  <span>
                    Ergebnis:
                    <strong class="coin-winner-text">
                      {{ coinSide() === 'heads' ? '🦅 KOPF' : '🏛️ ZAHL' }}
                    </strong>
                  </span>
                }
              </div>

              <button
                type="button"
                class="btn-primary full-btn"
                [disabled]="isFlippingCoin()"
                (click)="flipCoin()"
              >
                🪙 Münze werfen
              </button>

              <div class="coin-stats-bar">
                <div class="coin-stat-pill">
                  <span>🦅 Kopf:</span>
                  <strong>{{ coinHeadsCount() }} ({{ coinHeadsPercent() }}%)</strong>
                </div>
                <div class="coin-stat-pill">
                  <span>🏛️ Zahl:</span>
                  <strong>{{ coinTailsCount() }} ({{ 100 - coinHeadsPercent() }}%)</strong>
                </div>
              </div>
            </div>

            <!-- Card 2: Magic Yes / No / Maybe Oracle -->
            <div class="sub-card oracle-card">
              <div class="sub-header">
                <h3>🔮 Magisches Orakel</h3>
                <span class="badge-pill">Ja / Nein / Vielleicht</span>
              </div>
              <p class="card-desc">Stell eine Frage und befrage die Entscheidungssphäre.</p>

              <input
                type="text"
                class="text-input"
                placeholder="Deine Frage (z. B. Noch eine Runde?)..."
                [ngModel]="oracleQuestion()"
                (ngModelChange)="oracleQuestion.set($event)"
                (keydown.enter)="askOracle()"
              />

              <div class="oracle-sphere-stage">
                <div
                  class="oracle-sphere"
                  [class.pulsing]="isAskingOracle()"
                  [style.borderColor]="currentOracleAnswer().color"
                >
                  <span class="oracle-big-icon">{{ currentOracleAnswer().icon }}</span>
                  <span
                    class="oracle-cat-tag"
                    [style.background]="currentOracleAnswer().color + '25'"
                    [style.color]="currentOracleAnswer().color"
                  >
                    {{ currentOracleAnswer().category }}
                  </span>
                  <h4 class="oracle-headline" [style.color]="currentOracleAnswer().color">
                    {{ currentOracleAnswer().headline }}
                  </h4>
                  <p class="oracle-subtext">{{ currentOracleAnswer().subtext }}</p>
                </div>
              </div>

              <button
                type="button"
                class="btn-primary full-btn"
                [disabled]="isAskingOracle()"
                (click)="askOracle()"
              >
                🔮 Orakel befragen
              </button>
            </div>

            <!-- Card 3: Random Number Generator (with No-Repeat Bingo/Lotto Mode) -->
            <div class="sub-card oracle-card">
              <div class="sub-header">
                <h3>🎰 Zufallszahl & Bingo-Pool</h3>
                <div class="inline-actions">
                  <button type="button" class="mini-btn" (click)="setRngPreset(1, 10)">1–10</button>
                  <button type="button" class="mini-btn" (click)="setRngPreset(1, 49)">1–49</button>
                  <button type="button" class="mini-btn" (click)="setRngPreset(1, 100)">1–100</button>
                </div>
              </div>

              <div class="rng-inputs-row">
                <div class="rng-field">
                  <label>Minimum</label>
                  <input
                    type="number"
                    class="text-input"
                    [ngModel]="rngMin()"
                    (ngModelChange)="rngMin.set(+$event); resetRngPool()"
                  />
                </div>
                <div class="rng-field">
                  <label>Maximum</label>
                  <input
                    type="number"
                    class="text-input"
                    [ngModel]="rngMax()"
                    (ngModelChange)="rngMax.set(+$event); resetRngPool()"
                  />
                </div>
              </div>

              <label class="check-pill">
                <input
                  type="checkbox"
                  [ngModel]="rngNoRepeat()"
                  (ngModelChange)="rngNoRepeat.set($event); resetRngPool()"
                />
                <span>🚫 Ohne Wiederholung ziehen (Lotto / Bingo Modus)</span>
              </label>

              <div class="rng-display-box">
                @if (rngCurrentValue() !== null) {
                  <span class="rng-big-number">{{ rngCurrentValue() }}</span>
                } @else {
                  <span class="rng-placeholder">?</span>
                }
                @if (rngNoRepeat()) {
                  <span class="rng-pool-meta">
                    Noch <strong>{{ rngRemainingCount() }}</strong> von {{ rngTotalRange() }} Zahlen im Pool
                  </span>
                }
              </div>

              <div class="team-action-bar">
                <button
                  type="button"
                  class="btn-primary full-btn"
                  [disabled]="rngNoRepeat() && rngRemainingCount() === 0"
                  (click)="drawRandomNumber()"
                >
                  🎲 Zahl ziehen
                </button>
                @if (rngDrawnHistory().length > 0) {
                  <button type="button" class="btn-secondary" (click)="resetRngPool()">
                    🔄 Reset
                  </button>
                }
              </div>

              @if (rngDrawnHistory().length > 0) {
                <div class="rng-drawn-wrap">
                  <span class="drawn-title">Gezogene Zahlen ({{ rngDrawnHistory().length }}):</span>
                  <div class="drawn-balls">
                    @for (num of rngDrawnHistory(); track $index) {
                      <span class="drawn-ball" [class.latest]="$index === 0">{{ num }}</span>
                    }
                  </div>
                </div>
              }
            </div>
          </div>
        }
      </section>
    </div>
  `,
  styles: [`
    .tool-page {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
      padding-bottom: 3rem;
    }

    .topbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 0.75rem;
    }

    .topbar-right {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .back-btn {
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
      background: rgba(255, 255, 255, 0.1);
      color: var(--text-primary);
    }

    .sound-btn {
      padding: 0.45rem 0.9rem;
      border-radius: 999px;
      background: rgba(99, 102, 241, 0.16);
      border: 1px solid rgba(99, 102, 241, 0.4);
      color: #c7d2fe;
      font-size: 0.8rem;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .sound-btn.muted {
      background: rgba(255, 255, 255, 0.05);
      border-color: var(--border-subtle);
      color: var(--text-muted);
    }

    .crumb-pill {
      font-size: 0.78rem;
      font-weight: 700;
      color: #f472b6;
      background: rgba(236, 72, 153, 0.14);
      padding: 0.38rem 0.85rem;
      border-radius: 999px;
      border: 1px solid rgba(236, 72, 153, 0.28);
    }

    .tool-card {
      padding: 2rem;
      display: flex;
      flex-direction: column;
      gap: 1.75rem;
    }

    .tool-header-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 1.25rem;
      padding-bottom: 1.25rem;
      border-bottom: 1px solid var(--border-subtle);
    }

    .tool-header {
      display: flex;
      align-items: center;
      gap: 1.15rem;
    }

    .tool-icon {
      width: 58px;
      height: 58px;
      border-radius: 16px;
      background: linear-gradient(135deg, #ec4899, #8b5cf6, #6366f1);
      display: grid;
      place-items: center;
      font-size: 1.85rem;
      box-shadow: 0 10px 24px -6px rgba(236, 72, 153, 0.55);
      flex-shrink: 0;
    }

    .tool-header h1 {
      margin: 0;
      font-family: var(--font-display);
      font-size: 1.75rem;
    }

    .tool-header p {
      margin: 0.25rem 0 0;
      color: var(--text-secondary);
      font-size: 0.94rem;
    }

    /* Mode Tabs */
    .mode-tabs {
      display: flex;
      gap: 0.5rem;
      background: rgba(0, 0, 0, 0.35);
      padding: 0.4rem;
      border-radius: 14px;
      border: 1px solid var(--border-subtle);
      flex-wrap: wrap;
    }

    .mode-tab {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.65rem 1.05rem;
      border-radius: 10px;
      border: 1px solid transparent;
      background: transparent;
      color: var(--text-secondary);
      font-weight: 600;
      font-size: 0.88rem;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .mode-tab:hover {
      color: var(--text-primary);
      background: rgba(255, 255, 255, 0.04);
    }

    .mode-tab.active {
      background: linear-gradient(135deg, rgba(99, 102, 241, 0.28), rgba(236, 72, 153, 0.24));
      border-color: rgba(139, 92, 246, 0.5);
      color: #ffffff;
      box-shadow: 0 4px 14px rgba(99, 102, 241, 0.25);
    }

    .tab-emoji {
      font-size: 1.08rem;
    }

    .tab-hidden {
      display: none !important;
    }

    /* Shared Sub-Cards */
    .sub-card {
      background: rgba(10, 14, 24, 0.55);
      border: 1px solid var(--border-subtle);
      border-radius: 16px;
      padding: 1.25rem;
      display: flex;
      flex-direction: column;
      gap: 0.95rem;
    }

    .sub-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 0.75rem;
      flex-wrap: wrap;
    }

    .sub-header h3 {
      margin: 0;
      font-size: 1rem;
      font-family: var(--font-display);
      color: var(--text-primary);
    }

    .badge-pill {
      font-size: 0.74rem;
      font-weight: 700;
      padding: 0.25rem 0.65rem;
      border-radius: 999px;
      background: rgba(99, 102, 241, 0.16);
      color: #a5b4fc;
      border: 1px solid rgba(99, 102, 241, 0.3);
    }

    .inline-actions {
      display: flex;
      gap: 0.4rem;
      flex-wrap: wrap;
    }

    .mini-btn {
      padding: 0.3rem 0.65rem;
      border-radius: 8px;
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid var(--border-subtle);
      color: var(--text-secondary);
      font-size: 0.78rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .mini-btn:hover:not(:disabled) {
      background: rgba(255, 255, 255, 0.14);
      color: var(--text-primary);
    }

    /* =====================================================================
       TAB 1: WHEEL OF NAMES
       ===================================================================== */
    .wheel-layout {
      display: grid;
      grid-template-columns: minmax(320px, 520px) 1fr;
      gap: 1.75rem;
      align-items: start;
    }

    @media (max-width: 980px) {
      .wheel-layout {
        grid-template-columns: 1fr;
      }
    }

    .wheel-stage-card {
      background: radial-gradient(circle at center, rgba(99, 102, 241, 0.14) 0%, rgba(10, 14, 24, 0.7) 72%);
      border: 1px solid var(--border-subtle);
      border-radius: 20px;
      padding: 1.5rem;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1.25rem;
    }

    .wheel-canvas-wrap {
      position: relative;
      width: 100%;
      max-width: 460px;
      aspect-ratio: 1 / 1;
      display: grid;
      place-items: center;
    }

    .wheel-canvas {
      width: 100%;
      height: 100%;
      cursor: pointer;
      filter: drop-shadow(0 16px 36px rgba(0, 0, 0, 0.65));
      transition: transform 0.2s ease;
    }

    .wheel-center-btn {
      position: absolute;
      width: 78px;
      height: 78px;
      border-radius: 50%;
      border: 4px solid rgba(255, 255, 255, 0.9);
      background: linear-gradient(135deg, #1e1b4b, #312e81);
      color: #ffffff;
      font-family: var(--font-display);
      font-weight: 800;
      font-size: 0.78rem;
      letter-spacing: 0.05em;
      cursor: pointer;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.65), inset 0 2px 6px rgba(255, 255, 255, 0.25);
      display: grid;
      place-items: center;
      transition: transform 0.2s ease, box-shadow 0.2s ease;
    }

    .wheel-center-btn:hover:not(:disabled) {
      transform: scale(1.07);
      box-shadow: 0 10px 28px rgba(99, 102, 241, 0.75);
    }

    .wheel-center-btn:disabled {
      cursor: not-allowed;
      opacity: 0.8;
    }

    .wheel-status-bar {
      width: 100%;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1rem;
      padding: 0.85rem 1.15rem;
      border-radius: 14px;
      background: rgba(0, 0, 0, 0.4);
      border: 1px solid var(--border-subtle);
      font-size: 0.9rem;
      color: var(--text-secondary);
    }

    .winner-banner {
      width: 100%;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 1rem;
      padding: 1rem 1.25rem;
      border-radius: 14px;
      background: rgba(16, 185, 129, 0.1);
      border: 2px solid #10b981;
      animation: popIn 0.35s cubic-bezier(0.16, 1, 0.3, 1);
    }

    @keyframes popIn {
      0% { transform: scale(0.92); opacity: 0; }
      100% { transform: scale(1); opacity: 1; }
    }

    .winner-badge-left {
      display: flex;
      flex-direction: column;
      gap: 0.15rem;
    }

    .winner-crown {
      font-size: 0.72rem;
      font-weight: 800;
      letter-spacing: 0.08em;
      color: var(--text-secondary);
    }

    .winner-name {
      font-family: var(--font-display);
      font-size: 1.4rem;
    }

    .winner-actions {
      display: flex;
      gap: 0.55rem;
      flex-wrap: wrap;
    }

    .btn-sm {
      padding: 0.55rem 0.95rem;
      font-size: 0.84rem;
    }

    .wheel-controls-col {
      display: flex;
      flex-direction: column;
      gap: 1.1rem;
    }

    .preset-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(185px, 1fr));
      gap: 0.55rem;
    }

    .preset-chip {
      padding: 0.65rem 0.85rem;
      border-radius: 11px;
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid var(--border-subtle);
      color: var(--text-primary);
      font-size: 0.84rem;
      font-weight: 600;
      text-align: left;
      cursor: pointer;
      transition: all 0.18s ease;
    }

    .preset-chip:hover:not(:disabled) {
      background: rgba(99, 102, 241, 0.16);
      border-color: rgba(99, 102, 241, 0.45);
      transform: translateY(-1px);
    }

    .quick-add-row {
      display: flex;
      gap: 0.55rem;
    }

    .text-input {
      flex: 1;
      padding: 0.68rem 0.95rem;
      border-radius: 11px;
      background: rgba(0, 0, 0, 0.45);
      border: 1px solid var(--border-subtle);
      color: var(--text-primary);
      font-family: inherit;
      font-size: 0.9rem;
      outline: none;
    }

    .text-input:focus {
      border-color: var(--accent-indigo);
    }

    .entries-textarea {
      width: 100%;
      padding: 0.8rem 0.95rem;
      border-radius: 12px;
      background: rgba(0, 0, 0, 0.45);
      border: 1px solid var(--border-subtle);
      color: var(--text-primary);
      font-family: var(--font-mono);
      font-size: 0.86rem;
      line-height: 1.5;
      resize: vertical;
      outline: none;
    }

    .entries-textarea:focus {
      border-color: var(--accent-indigo);
    }

    .options-stack {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .check-pill {
      display: flex;
      align-items: center;
      gap: 0.65rem;
      padding: 0.7rem 0.95rem;
      border-radius: 11px;
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid var(--border-subtle);
      cursor: pointer;
      font-size: 0.86rem;
      color: var(--text-secondary);
    }

    .check-pill input[type='checkbox'] {
      accent-color: #6366f1;
      width: 16px;
      height: 16px;
    }

    .duration-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 0.75rem;
    }

    .duration-label {
      font-size: 0.86rem;
      color: var(--text-secondary);
      font-weight: 600;
    }

    .segmented-group {
      display: flex;
      gap: 0.35rem;
      background: rgba(0, 0, 0, 0.4);
      padding: 0.28rem;
      border-radius: 10px;
      border: 1px solid var(--border-subtle);
      flex-wrap: wrap;
    }

    .seg-btn {
      padding: 0.42rem 0.75rem;
      border-radius: 7px;
      border: none;
      background: transparent;
      color: var(--text-secondary);
      font-size: 0.8rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .seg-btn.active {
      background: #6366f1;
      color: #ffffff;
    }

    .history-list {
      display: flex;
      flex-direction: column;
      gap: 0.45rem;
      max-height: 170px;
      overflow-y: auto;
    }

    .history-chip {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      padding: 0.5rem 0.75rem;
      border-radius: 9px;
      background: rgba(255, 255, 255, 0.03);
      font-size: 0.84rem;
    }

    .color-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      flex-shrink: 0;
    }

    .hist-name {
      flex: 1;
    }

    .hist-tag {
      font-size: 0.7rem;
      padding: 0.1rem 0.45rem;
      border-radius: 999px;
      background: rgba(244, 63, 94, 0.18);
      color: #fda4af;
    }

    .hist-time {
      font-family: var(--font-mono);
      font-size: 0.75rem;
      color: var(--text-muted);
    }

    /* =====================================================================
       TAB 2: TEAM & TOURNAMENT GENERATOR
       ===================================================================== */
    .teams-layout {
      display: grid;
      grid-template-columns: minmax(320px, 430px) 1fr;
      gap: 1.5rem;
      align-items: start;
    }

    @media (max-width: 980px) {
      .teams-layout {
        grid-template-columns: 1fr;
      }
    }

    .teams-config-col {
      display: flex;
      flex-direction: column;
      gap: 1.1rem;
    }

    .mode-selector-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 0.55rem;
    }

    .mode-option-card {
      padding: 0.75rem 0.65rem;
      border-radius: 12px;
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid var(--border-subtle);
      color: var(--text-secondary);
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      gap: 0.25rem;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .mode-option-card strong {
      font-size: 0.82rem;
      color: var(--text-primary);
    }

    .mode-option-card small {
      font-size: 0.7rem;
      color: var(--text-muted);
    }

    .mode-option-card.active {
      background: rgba(99, 102, 241, 0.16);
      border-color: #6366f1;
    }

    .mode-opt-icon {
      font-size: 1.35rem;
    }

    .team-action-bar {
      display: flex;
      gap: 0.6rem;
    }

    .full-btn {
      flex: 1;
    }

    .teams-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
      gap: 1rem;
      transition: opacity 0.2s ease, transform 0.2s ease;
    }

    .shuffling {
      opacity: 0.5;
      transform: scale(0.98);
    }

    .team-card {
      background: rgba(12, 17, 29, 0.75);
      border: 1px solid var(--border-subtle);
      border-top: 4px solid #6366f1;
      border-radius: 16px;
      padding: 1.15rem;
      display: flex;
      flex-direction: column;
      gap: 0.9rem;
    }

    .team-card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 0.5rem;
    }

    .team-title-wrap {
      display: flex;
      align-items: center;
      gap: 0.55rem;
    }

    .team-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
    }

    .team-title-wrap h4 {
      margin: 0;
      font-family: var(--font-display);
      font-size: 1.05rem;
    }

    .member-count-pill {
      font-size: 0.74rem;
      color: var(--text-muted);
      background: rgba(255, 255, 255, 0.05);
      padding: 0.2rem 0.55rem;
      border-radius: 999px;
    }

    .team-member-list {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 0.45rem;
    }

    .team-member-item {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      padding: 0.5rem 0.65rem;
      border-radius: 10px;
      background: rgba(255, 255, 255, 0.03);
      font-size: 0.88rem;
    }

    .team-member-item.is-captain {
      background: rgba(245, 158, 11, 0.1);
      border: 1px solid rgba(245, 158, 11, 0.3);
    }

    .member-avatar {
      width: 28px;
      height: 28px;
      border-radius: 8px;
      display: grid;
      place-items: center;
      font-size: 0.72rem;
      font-weight: 800;
      flex-shrink: 0;
    }

    .member-name {
      flex: 1;
      font-weight: 500;
    }

    .captain-badge {
      font-size: 0.72rem;
      font-weight: 700;
      color: #fbbf24;
      background: rgba(245, 158, 11, 0.18);
      padding: 0.15rem 0.5rem;
      border-radius: 999px;
    }

    /* 1v1 Bracket */
    .bracket-list {
      display: flex;
      flex-direction: column;
      gap: 0.65rem;
    }

    .duel-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      padding: 0.85rem 1.1rem;
      border-radius: 12px;
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid var(--border-subtle);
      flex-wrap: wrap;
    }

    .duel-num {
      font-family: var(--font-mono);
      font-size: 0.78rem;
      color: var(--text-muted);
      min-width: 70px;
    }

    .duel-players {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.85rem;
      flex-wrap: wrap;
    }

    .duel-player {
      padding: 0.45rem 0.9rem;
      border-radius: 9px;
      background: rgba(99, 102, 241, 0.14);
      border: 1px solid rgba(99, 102, 241, 0.3);
      font-weight: 600;
      font-size: 0.9rem;
      min-width: 130px;
      text-align: center;
    }

    .player-b {
      background: rgba(236, 72, 153, 0.14);
      border-color: rgba(236, 72, 153, 0.3);
    }

    .player-bye {
      background: rgba(16, 185, 129, 0.12);
      border-color: rgba(16, 185, 129, 0.3);
      color: #6ee7b7;
    }

    .vs-pill {
      font-family: var(--font-display);
      font-weight: 800;
      font-size: 0.78rem;
      color: #f59e0b;
    }

    /* =====================================================================
       TAB 3: 3D DICE ARENA
       ===================================================================== */
    .dice-layout {
      display: flex;
      flex-direction: column;
      gap: 1.35rem;
    }

    .dice-controls-bar {
      display: flex;
      flex-direction: row;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 1rem;
    }

    .dice-control-group {
      display: flex;
      align-items: center;
      gap: 0.65rem;
      flex-wrap: wrap;
    }

    .control-label {
      font-size: 0.86rem;
      font-weight: 600;
      color: var(--text-secondary);
    }

    .dice-cta-group {
      display: flex;
      gap: 0.6rem;
      align-items: center;
    }

    .roll-cta-btn {
      min-width: 175px;
    }

    .dice-arena-stage {
      background: radial-gradient(circle at center, rgba(16, 185, 129, 0.1) 0%, rgba(9, 13, 22, 0.75) 75%);
      border: 1px solid var(--border-subtle);
      border-radius: 20px;
      padding: 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 1.35rem;
    }

    .arena-hint {
      font-size: 0.83rem;
      color: var(--text-secondary);
      text-align: center;
    }

    .dice-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(135px, 1fr));
      gap: 1rem;
      justify-items: center;
    }

    .die-card {
      width: 100%;
      max-width: 165px;
      padding: 0.9rem;
      border-radius: 18px;
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid var(--border-subtle);
      color: var(--text-primary);
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.75rem;
      cursor: pointer;
      transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
    }

    .die-card:hover {
      transform: translateY(-3px);
      border-color: var(--border-highlight);
    }

    .die-card.is-held {
      border-color: #f59e0b;
      background: rgba(245, 158, 11, 0.12);
      box-shadow: 0 8px 22px -6px rgba(245, 158, 11, 0.45);
    }

    .die-card.is-crit {
      border-color: #10b981;
      box-shadow: 0 0 22px rgba(16, 185, 129, 0.35);
    }

    .die-card.is-fumble {
      border-color: #f43f5e;
    }

    .die-card.is-rolling .d6-cube,
    .die-card.is-rolling .poly-die {
      animation: tumbleDie 0.18s infinite linear;
    }

    @keyframes tumbleDie {
      0% { transform: rotate(0deg) scale(1); }
      25% { transform: rotate(-14deg) scale(1.06); }
      50% { transform: rotate(12deg) scale(0.95); }
      75% { transform: rotate(-10deg) scale(1.04); }
      100% { transform: rotate(0deg) scale(1); }
    }

    .die-top-meta {
      width: 100%;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.72rem;
      color: var(--text-muted);
    }

    .die-type-tag {
      font-family: var(--font-mono);
      font-weight: 700;
    }

    .hold-indicator {
      font-weight: 700;
      color: #fbbf24;
    }

    /* 3D D6 Cube with Pips */
    .d6-cube {
      width: 84px;
      height: 84px;
      border-radius: 18px;
      background: linear-gradient(145deg, #ffffff 0%, #e2e8f0 100%);
      box-shadow:
        inset 0 -4px 8px rgba(15, 23, 42, 0.25),
        inset 0 3px 6px rgba(255, 255, 255, 0.9),
        0 10px 20px rgba(0, 0, 0, 0.45);
      padding: 12px;
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      grid-template-rows: repeat(3, 1fr);
      place-items: center;
    }

    .pip {
      width: 13px;
      height: 13px;
      border-radius: 50%;
      background: #0f172a;
      box-shadow: inset 0 2px 3px rgba(0, 0, 0, 0.6);
      opacity: 0;
      transform: scale(0.4);
      transition: opacity 0.12s ease, transform 0.12s ease;
    }

    .pip.visible {
      opacity: 1;
      transform: scale(1);
    }

    .pip.red-pip {
      background: #ef4444;
      width: 16px;
      height: 16px;
    }

    /* Polygon RPG Die */
    .poly-die {
      width: 84px;
      height: 84px;
      border-radius: 20px;
      background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 55%, #db2777 100%);
      box-shadow:
        inset 0 2px 8px rgba(255, 255, 255, 0.35),
        0 10px 22px rgba(79, 70, 229, 0.45);
      display: grid;
      place-items: center;
      border: 2px solid rgba(255, 255, 255, 0.28);
      clip-path: polygon(22% 0%, 78% 0%, 100% 22%, 100% 78%, 78% 100%, 22% 100%, 0% 78%, 0% 22%);
    }

    .poly-value {
      font-family: var(--font-display);
      font-size: 1.75rem;
      font-weight: 800;
      color: #ffffff;
      text-shadow: 0 2px 8px rgba(0, 0, 0, 0.45);
    }

    .die-numeric-sub {
      font-size: 0.8rem;
      color: var(--text-secondary);
    }

    .dice-stats-row {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
      gap: 0.85rem;
    }

    .stat-box {
      padding: 0.9rem 1.1rem;
      border-radius: 14px;
      background: rgba(0, 0, 0, 0.42);
      border: 1px solid var(--border-subtle);
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .stat-box.has-special {
      border-color: rgba(245, 158, 11, 0.55);
      background: rgba(245, 158, 11, 0.12);
    }

    .stat-label {
      font-size: 0.78rem;
      color: var(--text-secondary);
    }

    .stat-val {
      font-family: var(--font-display);
      font-size: 1.4rem;
    }

    .accent-indigo { color: #818cf8; }
    .accent-emerald { color: #34d399; }
    .special-text { font-size: 1.05rem; color: #fbbf24; }

    .dice-history-table {
      display: flex;
      flex-direction: column;
      gap: 0.45rem;
    }

    .dice-hist-row {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.55rem 0.85rem;
      border-radius: 10px;
      background: rgba(255, 255, 255, 0.03);
      font-size: 0.85rem;
      flex-wrap: wrap;
    }

    .dh-time {
      font-family: var(--font-mono);
      font-size: 0.76rem;
      color: var(--text-muted);
    }

    .dh-type {
      font-weight: 700;
      color: #a5b4fc;
      min-width: 48px;
    }

    .dh-values {
      display: flex;
      gap: 0.35rem;
      flex: 1;
      flex-wrap: wrap;
    }

    .dh-die-pill {
      padding: 0.15rem 0.5rem;
      border-radius: 6px;
      background: rgba(255, 255, 255, 0.08);
      font-family: var(--font-mono);
      font-size: 0.78rem;
    }

    .dh-badge {
      font-size: 0.75rem;
      font-weight: 700;
      color: #fbbf24;
      background: rgba(245, 158, 11, 0.16);
      padding: 0.18rem 0.55rem;
      border-radius: 999px;
    }

    /* =====================================================================
       TAB 4: COIN FLIP, ORACLE & RNG
       ===================================================================== */
    .oracle-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 1.25rem;
      align-items: stretch;
    }

    .oracle-card {
      justify-content: space-between;
    }

    .card-desc {
      margin: 0;
      font-size: 0.85rem;
      color: var(--text-secondary);
    }

    /* 3D Coin */
    .coin-stage {
      height: 165px;
      display: grid;
      place-items: center;
      perspective: 900px;
    }

    .coin-3d {
      width: 128px;
      height: 128px;
      position: relative;
      transform-style: preserve-3d;
      transition: transform 0.9s cubic-bezier(0.2, 0.85, 0.3, 1);
      cursor: pointer;
    }

    .coin-face {
      position: absolute;
      inset: 0;
      border-radius: 50%;
      backface-visibility: hidden;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 0.25rem;
      border: 5px solid #fde047;
      box-shadow:
        inset 0 0 18px rgba(0, 0, 0, 0.35),
        0 12px 28px rgba(234, 179, 8, 0.35);
    }

    .coin-heads {
      background: radial-gradient(circle at 30% 30%, #fef08a, #eab308 65%, #a16207 100%);
      color: #422006;
    }

    .coin-tails {
      background: radial-gradient(circle at 30% 30%, #e0e7ff, #6366f1 65%, #312e81 100%);
      border-color: #a5b4fc;
      color: #ffffff;
      transform: rotateY(180deg);
    }

    .coin-icon {
      font-size: 2.35rem;
    }

    .coin-title {
      font-family: var(--font-display);
      font-weight: 800;
      font-size: 0.82rem;
      letter-spacing: 0.08em;
    }

    .coin-result-label {
      text-align: center;
      font-size: 0.92rem;
      color: var(--text-secondary);
    }

    .coin-winner-text {
      color: #fde047;
    }

    .coin-stats-bar {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.5rem;
    }

    .coin-stat-pill {
      padding: 0.5rem 0.7rem;
      border-radius: 10px;
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid var(--border-subtle);
      display: flex;
      justify-content: space-between;
      font-size: 0.8rem;
    }

    /* Oracle Sphere */
    .oracle-sphere-stage {
      display: grid;
      place-items: center;
      padding: 0.4rem 0;
    }

    .oracle-sphere {
      width: 100%;
      min-height: 165px;
      padding: 1.15rem;
      border-radius: 18px;
      background: radial-gradient(circle at top, rgba(139, 92, 246, 0.18), rgba(0, 0, 0, 0.55));
      border: 1px solid rgba(139, 92, 246, 0.4);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      gap: 0.35rem;
      transition: all 0.25s ease;
    }

    .oracle-sphere.pulsing {
      transform: scale(0.96);
      filter: brightness(1.3);
    }

    .oracle-big-icon {
      font-size: 2rem;
    }

    .oracle-cat-tag {
      font-size: 0.72rem;
      font-weight: 800;
      padding: 0.15rem 0.6rem;
      border-radius: 999px;
      letter-spacing: 0.06em;
    }

    .oracle-headline {
      margin: 0.15rem 0 0;
      font-family: var(--font-display);
      font-size: 1.25rem;
    }

    .oracle-subtext {
      margin: 0;
      font-size: 0.83rem;
      color: var(--text-secondary);
    }

    /* RNG Card */
    .rng-inputs-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.65rem;
    }

    .rng-field {
      display: flex;
      flex-direction: column;
      gap: 0.3rem;
    }

    .rng-field label {
      font-size: 0.76rem;
      color: var(--text-secondary);
    }

    .rng-display-box {
      min-height: 110px;
      border-radius: 14px;
      background: rgba(0, 0, 0, 0.45);
      border: 1px solid var(--border-subtle);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 0.25rem;
      padding: 0.85rem;
    }

    .rng-big-number {
      font-family: var(--font-display);
      font-size: 2.6rem;
      font-weight: 800;
      background: linear-gradient(135deg, #6ee7b7, #38bdf8, #818cf8);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    .rng-placeholder {
      font-size: 2.2rem;
      color: var(--text-muted);
    }

    .rng-pool-meta {
      font-size: 0.76rem;
      color: var(--text-secondary);
    }

    .rng-drawn-wrap {
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
    }

    .drawn-title {
      font-size: 0.76rem;
      color: var(--text-secondary);
    }

    .drawn-balls {
      display: flex;
      gap: 0.35rem;
      flex-wrap: wrap;
      max-height: 85px;
      overflow-y: auto;
    }

    .drawn-ball {
      width: 30px;
      height: 30px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.07);
      border: 1px solid var(--border-subtle);
      display: grid;
      place-items: center;
      font-family: var(--font-mono);
      font-size: 0.76rem;
      font-weight: 700;
    }

    .drawn-ball.latest {
      background: #10b981;
      color: #052e16;
      border-color: #6ee7b7;
    }
  `],
})
export class DecisionHubComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('wheelCanvas') wheelCanvasRef?: ElementRef<HTMLCanvasElement>;

  readonly activeTab = signal<HubTab>('wheel');
  readonly isMuted = signal<boolean>(false);

  // =========================================================================
  // 1. WHEEL OF NAMES STATE
  // =========================================================================
  readonly wheelRawText = signal<string>(
    [
      '🍕 Pizza Napoletana',
      '🍔 Smash Burger',
      '🍣 Sushi & Ramen',
      '🌮 Mexican Tacos',
      '🍝 Pasta Carbonara',
      '🥙 Döner Deluxe',
      '🍛 Thai Curry',
      '🥗 Crispy Bowl',
    ].join('\n')
  );
  readonly newWheelEntry = signal<string>('');
  readonly eliminateWinner = signal<boolean>(false);
  readonly spinDuration = signal<SpinDurationMode>(5);
  readonly isSpinning = signal<boolean>(false);
  readonly wheelWinner = signal<{ name: string; color: string; index: number } | null>(null);
  readonly wheelHistory = signal<WheelHistoryItem[]>([]);

  readonly wheelItems = computed<string[]>(() =>
    this.wheelRawText()
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
  );

  private wheelAngleRad = 0;
  private pointerKickRad = 0;
  private wheelRafId: number | null = null;
  private confettiRafId: number | null = null;
  private confettiParticles: ConfettiParticle[] = [];

  // =========================================================================
  // 2. TEAM & TOURNAMENT GENERATOR STATE
  // =========================================================================
  readonly playersRawText = signal<string>(
    loadSavedPlayerNames(['Alex', 'Lara', 'Maxim', 'Sophie', 'Jonas', 'Nina', 'Lukas', 'Mia']).join(
      '\n'
    )
  );
  readonly newPlayerName = signal<string>('');
  readonly teamMode = signal<TeamMode>('byCount');
  readonly targetTeamCount = signal<number>(2);
  readonly targetTeamSize = signal<number>(2);
  readonly assignCaptains = signal<boolean>(true);
  readonly useCreativeTeamNames = signal<boolean>(true);
  readonly isShufflingTeams = signal<boolean>(false);
  readonly teamsCopied = signal<boolean>(false);
  readonly generatedTeams = signal<GeneratedTeam[]>([]);
  readonly generatedBracket = signal<BracketMatch[]>([]);

  readonly parsedPlayers = computed<string[]>(() =>
    this.playersRawText()
      .split('\n')
      .map((p) => p.trim())
      .filter((p) => p.length > 0)
  );

  // =========================================================================
  // 3. 3D DICE ARENA STATE
  // =========================================================================
  readonly diceTypes: readonly DiceType[] = [4, 6, 8, 10, 12, 20, 100];
  readonly selectedDiceType = signal<DiceType>(6);
  readonly diceCount = signal<number>(5);
  readonly diceList = signal<DieState[]>([]);
  readonly isRollingDice = signal<boolean>(false);
  readonly diceHistory = signal<DiceHistoryEntry[]>([]);
  private diceIntervalId: ReturnType<typeof setInterval> | null = null;
  private diceTimeoutId: ReturnType<typeof setTimeout> | null = null;

  readonly hasHeldDice = computed<boolean>(() => this.diceList().some((d) => d.held));
  readonly diceSum = computed<number>(() =>
    this.diceList().reduce((acc, d) => acc + d.value, 0)
  );
  readonly diceMax = computed<number>(() =>
    this.diceList().reduce((max, d) => Math.max(max, d.value), 0)
  );
  readonly diceAverage = computed<string>(() => {
    const list = this.diceList();
    if (!list.length) return '0';
    return (this.diceSum() / list.length).toFixed(1);
  });

  readonly diceSpecialBadge = computed<string | null>(() => {
    const values = this.diceList().map((d) => d.value);
    if (values.length === 0) return null;

    if (this.selectedDiceType() === 20 && values.includes(20)) {
      return '🌟 NAT 20 • KRITISCHER TREFFER!';
    }

    if (values.length >= 2) {
      const counts = new Map<number, number>();
      for (const v of values) {
        counts.set(v, (counts.get(v) ?? 0) + 1);
      }
      const maxSame = Math.max(...counts.values());
      const freqValues = Array.from(counts.values()).sort((a, b) => b - a);

      if (maxSame >= 5) return '👑 KNIFFEL / 5er-PASCH!';
      if (maxSame === 4) return '🔥 VIERER-PASCH!';
      if (freqValues[0] === 3 && freqValues[1] >= 2) return '🏠 FULL HOUSE!';

      if (this.selectedDiceType() === 6 && values.length >= 5) {
        const uniqueSorted = Array.from(new Set(values)).sort((a, b) => a - b).join('');
        if (uniqueSorted.includes('12345') || uniqueSorted.includes('23456')) {
          return '🛣️ GROSSE STRASSE!';
        }
      }

      if (maxSame === 3) return '✨ DREIER-PASCH!';
      if (freqValues[0] === 2 && freqValues[1] === 2) return '🎭 DOPPEL-PASCH!';
      if (maxSame === 2) return '🎉 PASCH!';
    }
    return null;
  });

  // =========================================================================
  // 4. COIN FLIP, ORACLE & RNG STATE
  // =========================================================================
  readonly isFlippingCoin = signal<boolean>(false);
  readonly coinSide = signal<'heads' | 'tails'>('heads');
  readonly coinRotationDeg = signal<number>(0);
  readonly coinHeadsCount = signal<number>(0);
  readonly coinTailsCount = signal<number>(0);

  readonly coinHeadsPercent = computed<number>(() => {
    const total = this.coinHeadsCount() + this.coinTailsCount();
    if (total === 0) return 50;
    return Math.round((this.coinHeadsCount() / total) * 100);
  });

  readonly oracleQuestion = signal<string>('');
  readonly isAskingOracle = signal<boolean>(false);
  readonly currentOracleAnswer = signal<OracleResponse>(ORACLE_ANSWERS[0]);

  readonly rngMin = signal<number>(1);
  readonly rngMax = signal<number>(49);
  readonly rngNoRepeat = signal<boolean>(true);
  readonly rngCurrentValue = signal<number | null>(null);
  readonly rngDrawnHistory = signal<number[]>([]);

  readonly rngTotalRange = computed<number>(() => {
    const min = Math.min(this.rngMin(), this.rngMax());
    const max = Math.max(this.rngMin(), this.rngMax());
    return Math.max(1, max - min + 1);
  });

  readonly rngRemainingCount = computed<number>(() =>
    Math.max(0, this.rngTotalRange() - this.rngDrawnHistory().length)
  );

  // AudioContext
  private audioCtx: AudioContext | null = null;

  ngOnInit(): void {
    this.generateTeamsOrBracket(false);
    this.initDiceList(5, 6);
  }

  ngAfterViewInit(): void {
    this.drawWheel();
  }

  ngOnDestroy(): void {
    if (this.wheelRafId !== null) cancelAnimationFrame(this.wheelRafId);
    if (this.confettiRafId !== null) cancelAnimationFrame(this.confettiRafId);
    if (this.diceIntervalId !== null) clearInterval(this.diceIntervalId);
    if (this.diceTimeoutId !== null) clearTimeout(this.diceTimeoutId);
    if (this.audioCtx && this.audioCtx.state !== 'closed') {
      void this.audioCtx.close();
    }
  }

  selectTab(tab: HubTab): void {
    this.activeTab.set(tab);
    if (tab === 'wheel') {
      requestAnimationFrame(() => this.drawWheel());
    }
  }

  toggleMute(): void {
    this.isMuted.update((v) => !v);
  }

  // =========================================================================
  // WEB AUDIO API SOUND ENGINE
  // =========================================================================
  private getAudioContext(): AudioContext | null {
    if (this.isMuted()) return null;
    if (typeof window === 'undefined') return null;
    if (!this.audioCtx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.audioCtx = new AudioCtx();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      void this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  private playWheelTick(pitchFactor = 1): void {
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    const now = ctx.currentTime;
    osc.frequency.setValueAtTime(520 * pitchFactor, now);
    osc.frequency.exponentialRampToValueAtTime(140, now + 0.032);

    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.032);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.035);
  }

  private playWinFanfare(): void {
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      const start = ctx.currentTime + idx * 0.085;
      const dur = idx === notes.length - 1 ? 0.38 : 0.16;

      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0.18, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + dur);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + dur + 0.02);
    });
  }

  private playDiceClatter(): void {
    const ctx = this.getAudioContext();
    if (!ctx) return;

    for (let i = 0; i < 4; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      const t = ctx.currentTime + i * 0.065;
      osc.frequency.setValueAtTime(220 + Math.random() * 260, t);
      osc.frequency.exponentialRampToValueAtTime(90, t + 0.035);

      gain.gain.setValueAtTime(0.08, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.038);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.04);
    }
  }

  private playCoinPing(): void {
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    const now = ctx.currentTime;
    osc.frequency.setValueAtTime(1318.5, now); // E6
    osc.frequency.exponentialRampToValueAtTime(2637, now + 0.28);

    gain.gain.setValueAtTime(0.16, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.36);
  }

  // =========================================================================
  // 1. WHEEL OF NAMES METHODS
  // =========================================================================
  onWheelTextChange(val: string): void {
    this.wheelRawText.set(val);
    this.wheelWinner.set(null);
    this.drawWheel();
  }

  addWheelEntry(): void {
    const entry = this.newWheelEntry().trim();
    if (!entry) return;
    const current = this.wheelRawText().trim();
    this.wheelRawText.set(current ? `${current}\n${entry}` : entry);
    this.newWheelEntry.set('');
    this.wheelWinner.set(null);
    this.drawWheel();
  }

  shuffleWheelEntries(): void {
    const items = [...this.wheelItems()];
    for (let i = items.length - 1; i > 0; i--) {
      const j = this.secureRandomInt(0, i);
      [items[i], items[j]] = [items[j], items[i]];
    }
    this.wheelRawText.set(items.join('\n'));
    this.wheelWinner.set(null);
    this.drawWheel();
  }

  sortWheelEntries(): void {
    const sorted = [...this.wheelItems()].sort((a, b) => a.localeCompare(b, 'de'));
    this.wheelRawText.set(sorted.join('\n'));
    this.drawWheel();
  }

  loadWheelPreset(preset: 'whoStarts' | 'food' | 'partyDare' | 'nextGame'): void {
    const map: Record<typeof preset, string[]> = {
      whoStarts: loadSavedPlayerNames([
        'Spieler 1',
        'Spieler 2',
        'Spieler 3',
        'Spieler 4',
      ]),
      food: [
        '🍕 Pizza',
        '🍔 Burger & Pommes',
        '🍣 Sushi',
        '🍝 Pasta',
        '🥙 Döner',
        '🌮 Tacos',
        '🍛 Thailändisch',
        '🥗 Salat & Bowl',
      ],
      partyDare: [
        '🍻 Ex-Trinken / Shot!',
        '💪 10 Liegestütze sofort',
        '😳 Peinlichste Story erzählen',
        '🎭 2 Runden mit Akzent reden',
        '🎤 Einen Refrain laut singen',
        '📱 Letztes Galerie-Foto zeigen',
        '💃 15 Sek. Freestyle tanzen',
        '👑 Rechten Nachbarn 30s loben',
      ],
      nextGame: [
        '🔤 Tapple (Stadt Land Blitz)',
        '⏱️ 5 Second Rule',
        '💣 Tick Tack Bumm',
        '⚡ Anomia Duell',
        '🧠 Wer bin ich?',
      ],
    };
    this.wheelRawText.set(map[preset].join('\n'));
    this.wheelWinner.set(null);
    this.drawWheel();
  }

  removeCurrentWinner(): void {
    const winner = this.wheelWinner();
    if (!winner) return;
    const items = [...this.wheelItems()];
    if (winner.index >= 0 && winner.index < items.length) {
      items.splice(winner.index, 1);
      this.wheelRawText.set(items.join('\n'));
    }
    this.wheelWinner.set(null);
    this.drawWheel();
  }

  spinWheel(): void {
    const items = this.wheelItems();
    if (this.isSpinning() || items.length < 2) return;

    if (this.confettiRafId !== null) {
      cancelAnimationFrame(this.confettiRafId);
      this.confettiRafId = null;
      this.confettiParticles = [];
    }

    this.isSpinning.set(true);
    this.wheelWinner.set(null);

    const durationMs = this.spinDuration() * 1000;
    const startAngle = this.wheelAngleRad;
    const extraSpins = (5 + this.spinDuration()) * Math.PI * 2;
    const randomOffset = (this.secureRandomInt(0, 10000) / 10000) * Math.PI * 2;
    const totalDelta = extraSpins + randomOffset;

    const sliceAngle = (Math.PI * 2) / items.length;
    let lastSliceIndex = this.getPointerSliceIndex(startAngle, items.length);
    const startTime = performance.now();

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const t = Math.min(1, elapsed / durationMs);
      // Quintic ease-out for realistic long suspense tail
      const eased = 1 - Math.pow(1 - t, 5);

      this.wheelAngleRad = startAngle + totalDelta * eased;

      const currentSliceIndex = this.getPointerSliceIndex(this.wheelAngleRad, items.length);
      if (currentSliceIndex !== lastSliceIndex) {
        lastSliceIndex = currentSliceIndex;
        this.pointerKickRad = -0.42; // Deflect pointer needle
        this.playWheelTick(0.9 + (1 - t) * 0.35);
      }

      // Spring-return pointer needle
      this.pointerKickRad *= 0.82;
      this.drawWheel();

      if (t < 1) {
        this.wheelRafId = requestAnimationFrame(animate);
      } else {
        this.wheelRafId = null;
        this.pointerKickRad = 0;
        this.isSpinning.set(false);
        this.finalizeWheelWinner(sliceAngle);
      }
    };

    this.wheelRafId = requestAnimationFrame(animate);
  }

  private getPointerSliceIndex(angleRad: number, count: number): number {
    const twoPi = Math.PI * 2;
    const slice = twoPi / count;
    // Pointer sits at right-side (0 rad)
    const normalized = ((twoPi - (angleRad % twoPi)) + twoPi) % twoPi;
    return Math.floor(normalized / slice) % count;
  }

  private finalizeWheelWinner(sliceAngle: number): void {
    const items = this.wheelItems();
    if (items.length === 0) return;

    const winIndex = this.getPointerSliceIndex(this.wheelAngleRad, items.length);
    const winName = items[winIndex];
    const winColor = WHEEL_PALETTE[winIndex % WHEEL_PALETTE.length];

    this.wheelWinner.set({ name: winName, color: winColor, index: winIndex });
    this.playWinFanfare();
    this.launchCanvasConfetti();

    const shouldRemove = this.eliminateWinner() && items.length > 2;
    this.wheelHistory.update((hist) => [
      {
        name: winName,
        color: winColor,
        time: new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        removed: shouldRemove,
      },
      ...hist.slice(0, 14),
    ]);

    if (shouldRemove) {
      setTimeout(() => {
        const current = [...this.wheelItems()];
        const idx = current.indexOf(winName);
        if (idx !== -1 && current.length > 2) {
          current.splice(idx, 1);
          this.wheelRawText.set(current.join('\n'));
          this.drawWheel();
        }
      }, 1100);
    }
    void sliceAngle;
  }

  private launchCanvasConfetti(): void {
    this.confettiParticles = Array.from({ length: 55 }, () => ({
      x: 250,
      y: 250,
      vx: (Math.random() - 0.5) * 12,
      vy: (Math.random() - 0.7) * 12,
      size: 6 + Math.random() * 6,
      color: WHEEL_PALETTE[Math.floor(Math.random() * WHEEL_PALETTE.length)],
      rotation: Math.random() * Math.PI * 2,
      vRot: (Math.random() - 0.5) * 0.25,
      alpha: 1,
    }));

    const stepConfetti = () => {
      let alive = false;
      for (const p of this.confettiParticles) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.24; // gravity
        p.rotation += p.vRot;
        p.alpha -= 0.016;
        if (p.alpha > 0) alive = true;
      }
      this.drawWheel();
      if (alive) {
        this.confettiRafId = requestAnimationFrame(stepConfetti);
      } else {
        this.confettiParticles = [];
        this.confettiRafId = null;
        this.drawWheel();
      }
    };

    this.confettiRafId = requestAnimationFrame(stepConfetti);
  }

  drawWheel(): void {
    const canvas = this.wheelCanvasRef?.nativeElement;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    const cx = w / 2;
    const cy = h / 2;
    const radius = Math.min(cx, cy) - 24;

    ctx.clearRect(0, 0, w, h);

    const items = this.wheelItems();
    const count = Math.max(1, items.length);
    const sliceAngle = (Math.PI * 2) / count;

    // Outer metallic ring
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, radius + 10, 0, Math.PI * 2);
    ctx.fillStyle = '#1e293b';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
    ctx.stroke();
    ctx.restore();

    // Draw wheel segments
    for (let i = 0; i < count; i++) {
      const start = this.wheelAngleRad + i * sliceAngle;
      const end = start + sliceAngle;
      const color = WHEEL_PALETTE[i % WHEEL_PALETTE.length];

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, radius, start, end);
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();

      ctx.lineWidth = 2;
      ctx.strokeStyle = 'rgba(15, 23, 42, 0.65)';
      ctx.stroke();

      // Label text along radial center
      const label = items[i] ?? 'Leer';
      ctx.translate(cx, cy);
      ctx.rotate(start + sliceAngle / 2);
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#ffffff';
      const fontSize = count > 14 ? 12 : count > 9 ? 14 : 16;
      ctx.font = `700 ${fontSize}px Inter, sans-serif`;
      ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
      ctx.shadowBlur = 4;

      const truncated = label.length > 20 ? label.slice(0, 19) + '…' : label;
      ctx.fillText(truncated, radius - 20, 0);

      // Perimeter peg stud at segment boundary
      const pegX = Math.cos(0) * (radius + 4);
      const pegY = Math.sin(0) * (radius + 4);
      ctx.rotate(-sliceAngle / 2);
      ctx.beginPath();
      ctx.arc(pegX, pegY, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = '#f8fafc';
      ctx.fill();
      ctx.restore();
    }

    // Draw right-hand pointer needle with deflection
    ctx.save();
    ctx.translate(cx + radius + 14, cy);
    ctx.rotate(this.pointerKickRad);
    ctx.beginPath();
    ctx.moveTo(-34, 0);
    ctx.lineTo(8, -15);
    ctx.lineTo(8, 15);
    ctx.closePath();
    ctx.fillStyle = '#facc15';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.65)';
    ctx.shadowBlur = 10;
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();
    ctx.restore();

    // Draw Confetti Particles on top if active
    for (const p of this.confettiParticles) {
      if (p.alpha <= 0) continue;
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.alpha);
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.65);
      ctx.restore();
    }
  }

  // =========================================================================
  // 2. TEAM & TOURNAMENT GENERATOR METHODS
  // =========================================================================
  addPlayer(): void {
    const name = this.newPlayerName().trim();
    if (!name) return;
    const current = this.playersRawText().trim();
    this.playersRawText.set(current ? `${current}\n${name}` : name);
    this.newPlayerName.set('');
    this.generateTeamsOrBracket(false);
  }

  loadPlayerPreset(count: number): void {
    const defaultNames = [
      'Alex',
      'Lara',
      'Maxim',
      'Sophie',
      'Jonas',
      'Nina',
      'Lukas',
      'Mia',
      'Felix',
      'Elena',
      'Tim',
      'Hannah',
    ];
    this.playersRawText.set(defaultNames.slice(0, count).join('\n'));
    this.generateTeamsOrBracket(true);
  }

  generateTeamsOrBracket(playSound = true): void {
    const players = [...this.parsedPlayers()];
    if (players.length === 0) {
      this.generatedTeams.set([]);
      this.generatedBracket.set([]);
      return;
    }

    if (playSound) {
      savePlayerNames(players);
      this.isShufflingTeams.set(true);
      this.playDiceClatter();
      setTimeout(() => this.isShufflingTeams.set(false), 220);
    }

    // Fisher-Yates shuffle with CSPRNG
    for (let i = players.length - 1; i > 0; i--) {
      const j = this.secureRandomInt(0, i);
      [players[i], players[j]] = [players[j], players[i]];
    }

    const mode = this.teamMode();
    if (mode === 'bracket') {
      const matches: BracketMatch[] = [];
      let matchNumber = 1;
      for (let i = 0; i < players.length; i += 2) {
        matches.push({
          matchNumber: matchNumber++,
          playerA: players[i],
          playerB: players[i + 1] ?? null,
        });
      }
      this.generatedBracket.set(matches);
      return;
    }

    const numTeams =
      mode === 'byCount'
        ? Math.min(players.length, Math.max(2, this.targetTeamCount()))
        : Math.max(1, Math.ceil(players.length / Math.max(2, this.targetTeamSize())));

    // Shuffle creative names pool
    const namePool = [...CREATIVE_TEAM_NAMES];
    for (let i = namePool.length - 1; i > 0; i--) {
      const j = this.secureRandomInt(0, i);
      [namePool[i], namePool[j]] = [namePool[j], namePool[i]];
    }

    const teams: GeneratedTeam[] = Array.from({ length: numTeams }, (_, idx) => ({
      id: idx + 1,
      name: this.useCreativeTeamNames()
        ? `Team ${namePool[idx % namePool.length]}`
        : `Team ${idx + 1}`,
      color: WHEEL_PALETTE[idx % WHEEL_PALETTE.length],
      members: [],
      captainIndex: 0,
    }));

    players.forEach((player, idx) => {
      teams[idx % numTeams].members.push(player);
    });

    teams.forEach((team) => {
      team.captainIndex =
        team.members.length > 0 ? this.secureRandomInt(0, team.members.length - 1) : 0;
    });

    this.generatedTeams.set(teams);
  }

  async copyTeamsToClipboard(): Promise<void> {
    let text = '';
    if (this.teamMode() === 'bracket') {
      text = this.generatedBracket()
        .map(
          (m) =>
            `Duell #${m.matchNumber}: ${m.playerA} vs. ${m.playerB ?? 'Freilos'}`
        )
        .join('\n');
    } else {
      text = this.generatedTeams()
        .map((t) => {
          const members = t.members
            .map((m, i) => (this.assignCaptains() && i === t.captainIndex ? `${m} (👑)` : m))
            .join(', ');
          return `${t.name}: ${members}`;
        })
        .join('\n');
    }
    await navigator.clipboard.writeText(text);
    this.teamsCopied.set(true);
    setTimeout(() => this.teamsCopied.set(false), 1800);
  }

  // =========================================================================
  // 3. 3D DICE ARENA METHODS
  // =========================================================================
  private initDiceList(count: number, sides: DiceType): void {
    const current = this.diceList();
    const next: DieState[] = Array.from({ length: count }, (_, idx) => {
      const existing = current[idx];
      return {
        id: idx + 1,
        value: existing && existing.value <= sides ? existing.value : this.secureRandomInt(1, sides),
        held: existing ? existing.held : false,
        rolling: false,
      };
    });
    this.diceList.set(next);
  }

  setDiceType(type: DiceType): void {
    this.selectedDiceType.set(type);
    this.diceList.update((list) =>
      list.map((d) => ({
        ...d,
        held: false,
        value: this.secureRandomInt(1, type),
      }))
    );
  }

  setDiceCount(count: number): void {
    this.diceCount.set(count);
    this.initDiceList(count, this.selectedDiceType());
  }

  toggleHoldDie(id: number): void {
    if (this.isRollingDice()) return;
    this.diceList.update((list) =>
      list.map((d) => (d.id === id ? { ...d, held: !d.held } : d))
    );
  }

  releaseAllDice(): void {
    this.diceList.update((list) => list.map((d) => ({ ...d, held: false })));
  }

  rollDice(): void {
    if (this.isRollingDice()) return;
    const sides = this.selectedDiceType();

    this.isRollingDice.set(true);
    this.playDiceClatter();

    this.diceList.update((list) =>
      list.map((d) => (d.held ? d : { ...d, rolling: true }))
    );

    if (this.diceIntervalId) clearInterval(this.diceIntervalId);
    this.diceIntervalId = setInterval(() => {
      this.diceList.update((list) =>
        list.map((d) =>
          d.held ? d : { ...d, value: this.secureRandomInt(1, sides) }
        )
      );
    }, 65);

    if (this.diceTimeoutId) clearTimeout(this.diceTimeoutId);
    this.diceTimeoutId = setTimeout(() => {
      if (this.diceIntervalId) {
        clearInterval(this.diceIntervalId);
        this.diceIntervalId = null;
      }

      const finalDice = this.diceList().map((d) => ({
        ...d,
        rolling: false,
        value: d.held ? d.value : this.secureRandomInt(1, sides),
      }));
      this.diceList.set(finalDice);
      this.isRollingDice.set(false);

      const badge = this.diceSpecialBadge();
      if (badge) {
        this.playWinFanfare();
      }

      const values = finalDice.map((d) => d.value);
      const sum = values.reduce((a, b) => a + b, 0);
      const max = Math.max(...values);

      this.diceHistory.update((hist) => [
        {
          id: Date.now(),
          diceLabel: `${finalDice.length}×D${sides}`,
          values,
          sum,
          max,
          badge,
          time: new Date().toLocaleTimeString('de-DE', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          }),
        },
        ...hist.slice(0, 9),
      ]);
    }, 520);
  }

  hasPip(value: number, cell: number): boolean {
    const pipMap: Record<number, readonly number[]> = {
      1: [5],
      2: [1, 9],
      3: [1, 5, 9],
      4: [1, 3, 7, 9],
      5: [1, 3, 5, 7, 9],
      6: [1, 3, 4, 6, 7, 9],
    };
    return (pipMap[value] ?? []).includes(cell);
  }

  // =========================================================================
  // 4. COIN FLIP, ORACLE & RNG METHODS
  // =========================================================================
  flipCoin(): void {
    if (this.isFlippingCoin()) return;
    this.isFlippingCoin.set(true);
    this.playCoinPing();

    const isHeads = this.secureRandomInt(0, 1) === 0;
    const baseSpins = 5 * 360;
    const currentFullRotations = Math.floor(this.coinRotationDeg() / 360) * 360;
    const targetDeg = currentFullRotations + baseSpins + (isHeads ? 0 : 180);

    this.coinRotationDeg.set(targetDeg);

    setTimeout(() => {
      this.coinSide.set(isHeads ? 'heads' : 'tails');
      if (isHeads) {
        this.coinHeadsCount.update((c) => c + 1);
      } else {
        this.coinTailsCount.update((c) => c + 1);
      }
      this.isFlippingCoin.set(false);
    }, 900);
  }

  resetCoinStats(): void {
    this.coinHeadsCount.set(0);
    this.coinTailsCount.set(0);
  }

  askOracle(): void {
    if (this.isAskingOracle()) return;
    this.isAskingOracle.set(true);
    this.playWheelTick(1.25);

    setTimeout(() => {
      const idx = this.secureRandomInt(0, ORACLE_ANSWERS.length - 1);
      this.currentOracleAnswer.set(ORACLE_ANSWERS[idx]);
      this.isAskingOracle.set(false);
      this.playCoinPing();
    }, 320);
  }

  setRngPreset(min: number, max: number): void {
    this.rngMin.set(min);
    this.rngMax.set(max);
    this.resetRngPool();
  }

  resetRngPool(): void {
    this.rngCurrentValue.set(null);
    this.rngDrawnHistory.set([]);
  }

  drawRandomNumber(): void {
    const min = Math.min(this.rngMin(), this.rngMax());
    const max = Math.max(this.rngMin(), this.rngMax());

    if (!this.rngNoRepeat()) {
      const val = this.secureRandomInt(min, max);
      this.rngCurrentValue.set(val);
      this.rngDrawnHistory.update((h) => [val, ...h.slice(0, 29)]);
      this.playWheelTick(1.1);
      return;
    }

    const drawnSet = new Set(this.rngDrawnHistory());
    const available: number[] = [];
    for (let n = min; n <= max; n++) {
      if (!drawnSet.has(n)) available.push(n);
    }
    if (available.length === 0) return;

    const chosen = available[this.secureRandomInt(0, available.length - 1)];
    this.rngCurrentValue.set(chosen);
    this.rngDrawnHistory.update((h) => [chosen, ...h]);
    this.playWheelTick(1.15);
  }

  // =========================================================================
  // CRYPTOGRAPHIC RANDOM HELPER
  // =========================================================================
  private secureRandomInt(min: number, max: number): number {
    if (max <= min) return min;
    const range = max - min + 1;
    const arr = new Uint32Array(1);
    crypto.getRandomValues(arr);
    return min + (arr[0] % range);
  }
}
