import { ChangeDetectorRef, Component, HostListener, OnDestroy, effect, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { loadSavedPlayerNames, savePlayerNames } from '../../services/player-storage';
import { LanguageService } from '../../services/language.service';

export type Language = 'de' | 'en';
export type SpecialEffectType = 'NONE' | 'BUCHSTABENDREHER' | 'DOPPELPACK' | 'AUSSETZER' | 'JACKPOT_BOOST';

export interface BilingualText {
  de: string;
  en: string;
}

export interface CategoryItem {
  id: number;
  icon: string;
  title: BilingualText;
  hint: BilingualText;
}

export interface VollpfostenCard {
  id: number;
  category: CategoryItem;
  letter: string;
  specialEffect: SpecialEffectType;
}

export interface Player {
  id: number;
  name: string;
  color: string;
  avatar: string;
  score: number;
  biggestPotWon: number;
  streak: number;
}

export interface RoundHistoryEntry {
  roundNumber: number;
  winnerName: string;
  winnerColor: string;
  winnerAvatar: string;
  category: BilingualText;
  letter: string;
  specialEffect: SpecialEffectType;
  cardsWon: number;
  spokenWord: string;
  wasTimeoutSkip?: boolean;
}

interface UndoSnapshot {
  drawDeck: VollpfostenCard[];
  letterPot: VollpfostenCard[];
  players: Player[];
  lastWinnerId: number | null;
  roundNumber: number;
  history: RoundHistoryEntry[];
  gameEnded: boolean;
}

@Component({
  selector: 'app-vollpfosten-game',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="vp-page">
      <!-- Ambient Background Glows -->
      <div class="ambient-orb orb-1"></div>
      <div class="ambient-orb orb-2"></div>
      <div class="ambient-orb orb-3"></div>

      <div class="vp-container">
        <!-- TOP NAVIGATION & ACTION BAR -->
        <header class="topbar glass-panel">
          <div class="topbar-left">
            <a routerLink="/" class="btn-secondary back-btn">
              <span>←</span>
              <span>{{ t('Zurück', 'Back') }}</span>
            </a>
            <div class="brand-title">
              <span class="brand-badge">🎴 PARTY CARD GAME</span>
              <h1>
                Stadt Land <span class="text-gradient">Vollpfosten</span>
                <small class="subtitle-tag">{{ t('Das Kartenspiel', 'The Card Game') }}</small>
              </h1>
            </div>
          </div>

          <div class="topbar-actions">
            <!-- Language Switcher DE / EN -->
            <div class="lang-switch" role="group" aria-label="Language Switcher">
              <button
                type="button"
                class="lang-btn"
                [class.active]="lang === 'de'"
                (click)="setLanguage('de')"
              >
                🇩🇪 DE
              </button>
              <button
                type="button"
                class="lang-btn"
                [class.active]="lang === 'en'"
                (click)="setLanguage('en')"
              >
                🇬🇧 EN
              </button>
            </div>

            <!-- Sound Toggle -->
            <button
              type="button"
              class="btn-secondary icon-btn"
              (click)="soundEnabled = !soundEnabled"
              [title]="t('Soundeffekte an/aus', 'Toggle Sound Effects')"
            >
              {{ soundEnabled ? '🔊' : '🔇' }}
            </button>

            <!-- Collapsible Rules Toggle -->
            <button
              type="button"
              class="btn-secondary"
              [class.panel-active]="showRulesPanel"
              (click)="toggleRulesPanel()"
            >
              <span>📖</span>
              <span>{{ t('Spielregeln', 'Rules') }}</span>
            </button>

            <!-- Collapsible Settings & Players Toggle -->
            <button
              type="button"
              class="btn-secondary"
              [class.panel-active]="showSettingsPanel"
              (click)="toggleSettingsPanel()"
            >
              <span>⚙️</span>
              <span>{{ t('Einstellungen & Spieler', 'Settings & Players') }}</span>
            </button>

            <!-- New Game Reset -->
            <button type="button" class="btn-primary" (click)="startNewGame()">
              <span>🔄</span>
              <span>{{ t('Neues Spiel', 'New Game') }}</span>
            </button>
          </div>
        </header>

        <!-- COLLAPSIBLE RULES PANEL -->
        <section *ngIf="showRulesPanel" class="collapsible-panel glass-panel animate-slide-down">
          <div class="panel-header">
            <div>
              <span class="section-kicker">📖 {{ t('OFFIZIELLE KURZANLEITUNG', 'OFFICIAL QUICK RULES') }}</span>
              <h2>{{ t('So funktioniert Stadt Land Vollpfosten – Das Kartenspiel', 'How to Play Stadt Land Vollpfosten – The Card Game') }}</h2>
            </div>
            <button type="button" class="btn-secondary close-pill" (click)="showRulesPanel = false">✕</button>
          </div>

          <div class="rules-grid">
            <div class="rule-card">
              <div class="rule-icon">🃏</div>
              <h3>{{ t('1. Zwei Karten liegen aus', '1. Dual Card Tabletop') }}</h3>
              <p>
                {{
                  t(
                    'Links liegt der Nachziehstapel mit der aktuellen KATEGORIE (Vorderseite). Rechts daneben liegt die umgedrehte Karte mit dem geforderten BUCHSTABEN (Rückseite).',
                    'On the left is the draw deck showing the active CATEGORY (front). On the right is the flipped card showing the required LETTER (back).'
                  )
                }}
              </p>
            </div>

            <div class="rule-card">
              <div class="rule-icon">⚡</div>
              <h3>{{ t('2. Gleichzeitig rufen!', '2. Shout Simultaneously!') }}</h3>
              <p>
                {{
                  t(
                    'Alle spielen gleichzeitig! Wer zuerst einen passenden Begriff zur Kategorie mit dem gezeigten Buchstaben ruft, gewinnt die Buchstaben-Karte(n) im Pot. Danach wird sofort die nächste Karte aufgedeckt.',
                    'Everyone plays at once! The first player to shout a valid word matching the category and letter wins all cards in the letter pot, and the next card is flipped.'
                  )
                }}
              </p>
            </div>

            <div class="rule-card">
              <div class="rule-icon">⏳</div>
              <h3>{{ t('3. Keiner weiß was (Jackpot-Pot)', '3. Nobody Knows (Jackpot Pot)') }}</h3>
              <p>
                {{
                  t(
                    'Fällt innerhalb von 30 Sekunden niemandem etwas ein, bleibt die Buchstaben-Karte liegen und die aktuelle Kategorie-Karte wird daraufgelegt (Pot wächst!). Der nächste Gewinner räumt den gesamten Stapel ab!',
                    'If nobody finds an answer within 30 seconds, the letter card stays in the pot and the category card is flipped on top of it (Pot grows!). The next winner takes the entire stack!'
                  )
                }}
              </p>
            </div>

            <div class="rule-card">
              <div class="rule-icon">🔥</div>
              <h3>{{ t('4. Die 4 Spezialkarten', '4. The 4 Special Effects') }}</h3>
              <ul class="special-rules-list">
                <li>
                  <strong>🔄 {{ t('Buchstabendreher:', 'Letter Twister:') }}</strong>
                  {{ t('Das Wort muss mit dem Buchstaben ENDEN statt beginnen!', 'The word must END with the displayed letter instead of starting with it!') }}
                </li>
                <li>
                  <strong>✌️ {{ t('Doppelpack:', 'Double Trouble:') }}</strong>
                  {{ t('Du musst ZWEI passende Begriffe mit dem Anfangsbuchstaben nennen!', 'You must name TWO valid words starting with the displayed letter!') }}
                </li>
                <li>
                  <strong>🤐 {{ t('Aussetzer:', 'Sit Out:') }}</strong>
                  {{ t('Der Gewinner der letzten Runde muss bei dieser Karte den Mund halten!', 'The winner of the previous round must stay silent for this card!') }}
                </li>
                <li>
                  <strong>🤷 {{ t('Keiner weiß was:', 'Nobody Knows:') }}</strong>
                  {{ t('Karte darüberlegen – alle Karten im Pot gehen an den nächsten Gewinner!', 'Stack another card on top – all stacked cards go to the next winner!') }}
                </li>
              </ul>
            </div>
          </div>
        </section>

        <!-- COLLAPSIBLE SETTINGS & PLAYERS PANEL -->
        <section *ngIf="showSettingsPanel" class="collapsible-panel glass-panel animate-slide-down">
          <div class="panel-header">
            <div>
              <span class="section-kicker">⚙️ {{ t('SPIEL-KONFIGURATION', 'GAME SETUP & PLAYERS') }}</span>
              <h2>{{ t('Einstellungen & Spieler (2–8 Personen)', 'Settings & Players (2–8 Players)') }}</h2>
            </div>
            <button type="button" class="btn-secondary close-pill" (click)="showSettingsPanel = false">✕</button>
          </div>

          <div class="settings-layout">
            <!-- Left column: Game Options -->
            <div class="settings-column">
              <div class="setting-group">
                <label class="setting-label">{{ t('Sprache / Language', 'Language / Sprache') }}</label>
                <div class="option-pills">
                  <button
                    type="button"
                    class="pill-btn"
                    [class.active]="lang === 'de'"
                    (click)="setLanguage('de')"
                  >
                    🇩🇪 Deutsch (DE)
                  </button>
                  <button
                    type="button"
                    class="pill-btn"
                    [class.active]="lang === 'en'"
                    (click)="setLanguage('en')"
                  >
                    🇬🇧 English (EN)
                  </button>
                </div>
              </div>

              <div class="setting-group">
                <label class="setting-label">{{ t('Kartenstapel-Größe', 'Deck Size') }}</label>
                <div class="option-pills">
                  <button
                    type="button"
                    class="pill-btn"
                    [class.active]="configuredDeckSize === 20"
                    (click)="configuredDeckSize = 20"
                  >
                    ⚡ 20 {{ t('Karten (Schnell)', 'Cards (Quick)') }}
                  </button>
                  <button
                    type="button"
                    class="pill-btn"
                    [class.active]="configuredDeckSize === 35"
                    (click)="configuredDeckSize = 35"
                  >
                    🎴 35 {{ t('Karten (Original)', 'Cards (Standard)') }}
                  </button>
                  <button
                    type="button"
                    class="pill-btn"
                    [class.active]="configuredDeckSize === 48"
                    (click)="configuredDeckSize = 48"
                  >
                    🔥 48 {{ t('Karten (XL Party)', 'Cards (XL Party)') }}
                  </button>
                  <button
                    type="button"
                    class="pill-btn"
                    [class.active]="configuredDeckSize === 100"
                    (click)="configuredDeckSize = 100"
                  >
                    💯 100 {{ t('Karten (Marathon)', 'Cards (Marathon)') }}
                  </button>
                </div>
              </div>

              <div class="setting-group">
                <label class="setting-label">{{ t('Countdown („Keiner weiß was“-Timer)', 'Countdown ("Nobody Knows" Timer)') }}</label>
                <div class="option-pills">
                  <button
                    type="button"
                    class="pill-btn"
                    [class.active]="timerDuration === 20"
                    (click)="setTimerDuration(20)"
                  >
                    ⏱️ 20s ({{ t('Turbo', 'Turbo') }})
                  </button>
                  <button
                    type="button"
                    class="pill-btn"
                    [class.active]="timerDuration === 30"
                    (click)="setTimerDuration(30)"
                  >
                    ⏱️ 30s ({{ t('Offiziell', 'Official') }})
                  </button>
                  <button
                    type="button"
                    class="pill-btn"
                    [class.active]="timerDuration === 45"
                    (click)="setTimerDuration(45)"
                  >
                    ⏱️ 45s ({{ t('Entspannt', 'Relaxed') }})
                  </button>
                </div>
              </div>

              <div class="setting-group checkboxes-row">
                <label class="checkbox-toggle">
                  <input type="checkbox" [(ngModel)]="includeSpecialCards" />
                  <span>{{ t('Spezialkarten aktivieren (Buchstabendreher, Doppelpack, Aussetzer)', 'Enable Special Cards (Letter Twister, Double Trouble, Sit Out)') }}</span>
                </label>

                <label class="checkbox-toggle">
                  <input type="checkbox" [(ngModel)]="autoStackOnTimeout" />
                  <span>{{ t('Bei Ablauf von 30s automatisch „Keiner weiß was“ auslösen', 'Automatically trigger "Nobody Knows" card stack when timer hits 0s') }}</span>
                </label>
              </div>

              <div class="settings-cta">
                <button type="button" class="btn-primary" (click)="startNewGame(); showSettingsPanel = false">
                  🚀 {{ t('Neues Spiel mit Einstellungen starten', 'Apply & Start New Game') }}
                </button>
              </div>
            </div>

            <!-- Right column: Players Management -->
            <div class="settings-column">
              <div class="players-header-row">
                <label class="setting-label">
                  {{ t('Spielerliste', 'Players') }} ({{ players.length }}/8)
                </label>
                <button
                  type="button"
                  class="btn-secondary sm-btn"
                  [disabled]="players.length >= 8"
                  (click)="addPlayer()"
                >
                  ➕ {{ t('Spieler hinzufügen', 'Add Player') }}
                </button>
              </div>

              <div class="player-edit-list">
                <div *ngFor="let p of players; let i = index" class="player-edit-item">
                  <span class="player-key-badge" [style.background]="p.color">{{ i + 1 }}</span>
                  <span class="player-avatar-icon">{{ p.avatar }}</span>
                  <input
                    type="text"
                    class="player-name-input"
                    [(ngModel)]="p.name"
                    (ngModelChange)="persistPlayers()"
                    [placeholder]="t('Spielername...', 'Player name...')"
                    maxlength="22"
                  />
                  <button
                    type="button"
                    class="remove-player-btn"
                    [disabled]="players.length <= 2"
                    (click)="removePlayer(i)"
                    [title]="t('Spieler entfernen', 'Remove player')"
                  >
                    🗑️
                  </button>
                </div>
              </div>
              <p class="helper-hint">
                💡 {{ t('Tipp: Du kannst im Spiel die Tasten 1 bis 8 auf der Tastatur drücken, um blitzschnell Punkte zu vergeben!', 'Tip: Press keys 1–8 on your keyboard during the game to award points instantly!') }}
              </p>
            </div>
          </div>
        </section>

        <!-- STATUS BANNER / NOTIFICATION TOAST -->
        <div *ngIf="statusBanner" class="status-toast glass-panel" [attr.data-type]="statusBanner.type">
          <span class="toast-icon">{{ statusBanner.icon }}</span>
          <span class="toast-text">{{ statusBanner.text }}</span>
        </div>

        <!-- MAIN GAMEPLAY AREA (WHEN GAME IS ACTIVE) -->
        <ng-container *ngIf="!gameEnded && currentCategoryCard && currentLetterCard; else gameOverTemplate">
          <!-- TIMER & ROUND METRICS BAR -->
          <div class="timer-bar-wrapper glass-panel" [class.timer-warning]="timeLeft <= 8" [class.timer-critical]="timeLeft <= 4">
            <div class="timer-meta">
              <div class="round-Readout">
                <span class="meta-pill">
                  🏁 {{ t('Runde', 'Round') }} {{ roundNumber }}
                </span>
                <span class="meta-pill deck-pill">
                  🗂️ {{ t('Nachziehstapel:', 'Draw Deck:') }} <strong>{{ drawDeck.length }}</strong> {{ t('Karten', 'cards') }}
                </span>
                <span class="meta-pill pot-pill" [class.jackpot-hot]="letterPot.length > 1">
                  🏆 {{ t('Karten im Pot:', 'Cards in Pot:') }}
                  <strong>{{ letterPot.length }}</strong>
                  <span *ngIf="letterPot.length > 1" class="jackpot-tag">JACKPOT!</span>
                </span>
              </div>

              <div class="timer-controls">
                <div class="countdown-digits" [class.pulse-urgent]="timeLeft <= 5 && !timerPaused">
                  <span>⏳ {{ timeLeft }}s</span>
                </div>
                <button
                  type="button"
                  class="btn-secondary sm-btn"
                  (click)="toggleTimerPause()"
                >
                  {{ timerPaused ? '▶️ ' + t('Weiter', 'Resume') : '⏸️ ' + t('Pause', 'Pause') }}
                </button>
                <button
                  type="button"
                  class="btn-secondary sm-btn"
                  (click)="resetRoundTimer()"
                  [title]="t('30s Timer zurücksetzen', 'Reset 30s Timer')"
                >
                  🔄 30s
                </button>
              </div>
            </div>

            <div class="progress-track">
              <div
                class="progress-fill"
                [style.width.%]="(timeLeft / timerDuration) * 100"
                [class.fill-warning]="timeLeft <= 10"
                [class.fill-danger]="timeLeft <= 5"
              ></div>
            </div>
          </div>

          <!-- ACTIVE SPECIAL CARD ALERT BANNER -->
          <div
            *ngIf="currentLetterCard.specialEffect !== 'NONE'"
            class="special-alert-banner"
            [attr.data-effect]="currentLetterCard.specialEffect"
          >
            <div class="special-alert-icon">
              {{ getSpecialIcon(currentLetterCard.specialEffect) }}
            </div>
            <div class="special-alert-content">
              <div class="special-alert-title">
                ⚡ {{ t('SPEZIALKARTE AKTIV:', 'SPECIAL CARD ACTIVE:') }}
                {{ getSpecialTitle(currentLetterCard.specialEffect) }}
              </div>
              <div class="special-alert-desc">
                {{ getSpecialDescription(currentLetterCard.specialEffect, currentLetterCard.letter) }}
              </div>
            </div>
          </div>

          <!-- DUAL CARD TABLETOP: LEFT (CATEGORY PILE) & RIGHT (LETTER / JACKPOT PILE) -->
          <div class="tabletop-stage">
            <!-- LEFT CARD: NACHZIEHSTAPEL (VORDERSEITE - KATEGORIE) -->
            <div class="card-slot">
              <div class="slot-header">
                <span class="slot-badge">👈 {{ t('NACHZIEHSTAPEL (VORDERSEITE)', 'DRAW PILE (FRONT SIDE)') }}</span>
                <span class="slot-count">{{ drawDeck.length }} {{ t('übrig', 'left') }}</span>
              </div>

              <div class="card-stack-visual">
                <!-- Underlying stack shadow layers -->
                <div class="stack-layer layer-3" *ngIf="drawDeck.length > 2"></div>
                <div class="stack-layer layer-2" *ngIf="drawDeck.length > 1"></div>

                <!-- Active Front Card: Category -->
                <div class="playing-card category-card" [class.flip-anim]="cardFlipping">
                  <div class="card-corner top-left">
                    <span class="corner-label">{{ t('KATEGORIE', 'CATEGORY') }}</span>
                    <span class="corner-num">#{{ currentCategoryCard.category.id }}</span>
                  </div>

                  <div class="category-centerpiece">
                    <div class="category-emoji">{{ currentCategoryCard.category.icon }}</div>
                    <div class="category-main-title">
                      {{ lang === 'de' ? currentCategoryCard.category.title.de : currentCategoryCard.category.title.en }}
                    </div>
                    <div class="category-sub-translation">
                      {{ lang === 'de' ? currentCategoryCard.category.title.en : currentCategoryCard.category.title.de }}
                    </div>
                    <div class="category-hint-pill">
                      💡 {{ lang === 'de' ? currentCategoryCard.category.hint.de : currentCategoryCard.category.hint.en }}
                    </div>
                  </div>

                  <div class="card-footer-strip">
                    <span>🎴 STADT LAND VOLLPFOSTEN</span>
                    <span class="deck-remaining-badge">
                      {{ t('Noch', 'Left:') }} {{ drawDeck.length }} {{ t('Karten', 'cards') }}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <!-- CENTER CONNECTOR ARROW & QUICK SKIP ("KEINER WEISS WAS") -->
            <div class="tabletop-bridge">
              <div class="bridge-formula">
                <span class="formula-step">{{ t('Begriff finden', 'Find a word') }}</span>
                <span class="formula-arrow">⚡</span>
                <span class="formula-rule" [class.rule-twister]="currentLetterCard.specialEffect === 'BUCHSTABENDREHER'">
                  <ng-container *ngIf="currentLetterCard.specialEffect === 'BUCHSTABENDREHER'">
                    {{ t('ENDET mit', 'ENDS with') }} „{{ currentLetterCard.letter }}“
                  </ng-container>
                  <ng-container *ngIf="currentLetterCard.specialEffect === 'DOPPELPACK'">
                    {{ t('2x STARTET mit', '2x STARTS with') }} „{{ currentLetterCard.letter }}“
                  </ng-container>
                  <ng-container *ngIf="currentLetterCard.specialEffect !== 'BUCHSTABENDREHER' && currentLetterCard.specialEffect !== 'DOPPELPACK'">
                    {{ t('STARTET mit', 'STARTS with') }} „{{ currentLetterCard.letter }}“
                  </ng-container>
                </span>
              </div>

              <button
                type="button"
                class="nobody-knows-btn"
                (click)="triggerNobodyKnows(false)"
                [title]="t('Leertaste drücken oder klicken, wenn nach 30s keiner eine Antwort weiß', 'Press Spacebar or click when nobody knows an answer')"
              >
                <span class="nk-icon">🤷</span>
                <span class="nk-text">
                  <strong>{{ t('Keiner weiß was', 'Nobody Knows') }}</strong>
                  <small>{{ t('Karte darüberlegen (Pot +1) [Leertaste]', 'Flip card on top (Pot +1) [Space]') }}</small>
                </span>
              </button>
            </div>

            <!-- RIGHT CARD: UMGEDREHTE KARTE (RÜCKSEITE - BUCHSTABE & POT) -->
            <div class="card-slot">
              <div class="slot-header">
                <span class="slot-badge">👉 {{ t('BUCHSTABEN-STAPEL (RÜCKSEITE)', 'LETTER PILE (BACK SIDE)') }}</span>
                <span class="slot-count jackpot-count" [class.multi-pot]="letterPot.length > 1">
                  🏆 {{ t('Karten im Pot:', 'Cards in Pot:') }} {{ letterPot.length }}
                </span>
              </div>

              <div class="card-stack-visual">
                <!-- Underlying Jackpot Pot layers -->
                <div class="stack-layer pot-layer-3" *ngIf="letterPot.length > 2"></div>
                <div class="stack-layer pot-layer-2" *ngIf="letterPot.length > 1"></div>

                <!-- Active Back Card: Letter & Special Effect -->
                <div
                  class="playing-card letter-card"
                  [class.flip-anim]="cardFlipping"
                  [attr.data-special]="currentLetterCard.specialEffect"
                >
                  <div class="card-corner top-left">
                    <span class="corner-label">
                      {{
                        currentLetterCard.specialEffect === 'BUCHSTABENDREHER'
                          ? t('ENDBUCHSTABE', 'ENDING LETTER')
                          : t('ANFANGSBUCHSTABE', 'STARTING LETTER')
                      }}
                    </span>
                    <span class="pot-chip" [class.pot-chip-hot]="letterPot.length > 1">
                      {{
                        letterPot.length === 1
                          ? '1 ' + t('Karte im Pot', 'Card in Pot')
                          : '🔥 ' + letterPot.length + ' ' + t('Karten im Jackpot!', 'Cards in Jackpot!')
                      }}
                    </span>
                  </div>

                  <!-- Huge Letter Display -->
                  <div class="letter-centerpiece">
                    <div class="giant-letter-ring" [attr.data-special]="currentLetterCard.specialEffect">
                      <span class="giant-letter">{{ currentLetterCard.letter }}</span>
                    </div>

                    <!-- Special Effect Badge inside the Letter Card -->
                    <div class="card-effect-box" [attr.data-special]="currentLetterCard.specialEffect">
                      <span class="effect-icon">{{ getSpecialIcon(currentLetterCard.specialEffect) }}</span>
                      <div class="effect-text-group">
                        <span class="effect-name">{{ getSpecialTitle(currentLetterCard.specialEffect) }}</span>
                        <span class="effect-sub">{{ getSpecialShortRule(currentLetterCard.specialEffect, currentLetterCard.letter) }}</span>
                      </div>
                    </div>
                  </div>

                  <div class="card-footer-strip">
                    <span>
                      {{
                        currentLetterCard.specialEffect === 'AUSSETZER' && lastWinnerPlayer
                          ? '🤐 ' + lastWinnerPlayer.name + ' ' + t('setzt aus!', 'sits out!')
                          : t('Wer ruft zuerst?', 'Who shouts first?')
                      }}
                    </span>
                    <span class="letter-small-repeat">{{ currentLetterCard.letter }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- SIMULTANEOUS SHOUT & POINT CLAIMING SECTION -->
          <section class="claim-arena glass-panel">
            <div class="claim-header">
              <div>
                <span class="section-kicker">⚡ {{ t(' RUNDEN-ENTSCHEIDUNG (ALLE SPIELEN GLEICHZEITIG)', 'SIMULTANEOUS SHOUT & CLAIM') }}</span>
                <h2>
                  {{ t('Wer hat zuerst den gültigen Begriff gerufen?', 'Who shouted the valid answer first?') }}
                </h2>
              </div>

              <!-- Optional Spoken Word Log Input + Undo Button -->
              <div class="word-log-controls">
                <div class="word-input-wrap">
                  <span class="word-input-icon">💬</span>
                  <input
                    type="text"
                    class="word-input"
                    [(ngModel)]="spokenWordInput"
                    [placeholder]="
                      currentLetterCard.specialEffect === 'DOPPELPACK'
                        ? t('Gerufene 2 Wörter (optional)...', '2 spoken words (optional)...')
                        : t('Gerufenes Wort notieren (optional)...', 'Log spoken word (optional)...')
                    "
                    maxlength="50"
                  />
                </div>

                <button
                  type="button"
                  class="btn-secondary undo-btn"
                  [disabled]="!lastUndoSnapshot"
                  (click)="undoLastAction()"
                  [title]="t('Letzte Aktion rückgängig machen', 'Undo last action')"
                >
                  ↩️ {{ t('Rückgängig', 'Undo') }}
                </button>
              </div>
            </div>

            <!-- Player Quick-Claim Grid -->
            <div class="players-claim-grid">
              <button
                *ngFor="let player of players; let i = index"
                type="button"
                class="player-claim-card"
                [style.--player-color]="player.color"
                [class.is-leader]="isLeadingPlayer(player)"
                [class.is-muted-winner]="isPlayerMutedByAussetzer(player)"
                [disabled]="isPlayerMutedByAussetzer(player)"
                (click)="claimCardForPlayer(player)"
              >
                <div class="claim-card-top">
                  <div class="player-identity">
                    <span class="player-avatar">{{ player.avatar }}</span>
                    <div class="player-name-wrap">
                      <span class="player-name">{{ player.name }}</span>
                      <span class="shortcut-hint">[{{ t('Taste', 'Key') }} {{ i + 1 }}]</span>
                    </div>
                  </div>

                  <div class="player-score-badge">
                    <span class="score-num">{{ player.score }}</span>
                    <span class="score-unit">{{ t('Karten', 'Cards') }}</span>
                  </div>
                </div>

                <!-- Action Callout inside Player Button -->
                <div class="claim-action-bar" *ngIf="!isPlayerMutedByAussetzer(player); else mutedPlayerTemplate">
                  <span class="bolt-icon">⚡</span>
                  <span>
                    {{ player.name }} {{ t("hat's gerufen!", 'shouted it!') }}
                  </span>
                  <span class="pot-gain-pill">+{{ letterPot.length }}</span>
                </div>

                <ng-template #mutedPlayerTemplate>
                  <div class="claim-action-bar muted-bar">
                    <span>🤐</span>
                    <span>{{ t('AUSSETZER – Mund halten!', 'SIT OUT – Keep quiet!') }}</span>
                  </div>
                </ng-template>
              </button>
            </div>
          </section>
        </ng-container>

        <!-- GAME OVER / PODIUM SCREEN -->
        <ng-template #gameOverTemplate>
          <section class="gameover-panel glass-panel animate-slide-down">
            <div class="gameover-header">
              <span class="trophy-hero">🏆</span>
              <span class="section-kicker">{{ t('STAPEL AUFGEBRAUCHT – SPIELENDE!', 'DECK EXHAUSTED – GAME OVER!') }}</span>
              <h2>{{ getWinnerHeadline() }}</h2>
              <p>
                {{
                  t(
                    'Alle Karten vom Nachziehstapel wurden gespielt. Hier ist das offizielle Endergebnis:',
                    'All cards from the draw deck have been played. Here are the final standings:'
                  )
                }}
              </p>
            </div>

            <div class="podium-list">
              <div
                *ngFor="let p of sortedPlayers; let idx = index"
                class="podium-row"
                [class.first-place]="idx === 0"
                [style.--player-color]="p.color"
              >
                <div class="podium-rank">
                  <span *ngIf="idx === 0">🥇</span>
                  <span *ngIf="idx === 1">🥈</span>
                  <span *ngIf="idx === 2">🥉</span>
                  <span *ngIf="idx > 2">#{{ idx + 1 }}</span>
                </div>

                <div class="podium-player">
                  <span class="podium-avatar">{{ p.avatar }}</span>
                  <div>
                    <div class="podium-name">{{ p.name }}</div>
                    <div class="podium-sub">
                      {{ t('Größter gewonnener Jackpot:', 'Biggest Jackpot won:') }} {{ p.biggestPotWon }}
                      {{ t('Karten', 'cards') }}
                    </div>
                  </div>
                </div>

                <div class="podium-score">
                  <strong>{{ p.score }}</strong>
                  <span>{{ t('gesammelte Karten', 'collected cards') }}</span>
                </div>
              </div>
            </div>

            <div class="gameover-actions">
              <button type="button" class="btn-primary" (click)="startNewGame()">
                🔄 {{ t('Revanche starten', 'Play Again') }}
              </button>
              <button
                type="button"
                class="btn-secondary"
                *ngIf="lastUndoSnapshot"
                (click)="undoLastAction()"
              >
                ↩️ {{ t('Letzte Karte korrigieren', 'Undo Last Card') }}
              </button>
              <button type="button" class="btn-secondary" (click)="showSettingsPanel = true">
                ⚙️ {{ t('Spieler & Einstellungen anpassen', 'Change Players & Settings') }}
              </button>
            </div>
          </section>
        </ng-template>

        <!-- RECENT ROUND LOG / CHRONIK -->
        <section *ngIf="history.length > 0" class="history-panel glass-panel">
          <div class="history-header">
            <h3>📜 {{ t('Runden-Chronik & Gewonnene Karten', 'Round History & Won Cards') }}</h3>
            <span class="history-sub">{{ history.length }} {{ t('Einträge', 'entries') }}</span>
          </div>

          <div class="history-list">
            <div *ngFor="let item of history.slice(0, 10)" class="history-row" [class.history-skip]="item.wasTimeoutSkip">
              <span class="history-round">#{{ item.roundNumber }}</span>

              <div class="history-card-info">
                <span class="history-cat">
                  {{ lang === 'de' ? item.category.de : item.category.en }}
                </span>
                <span class="history-letter-badge">{{ item.letter }}</span>
                <span *ngIf="item.specialEffect !== 'NONE'" class="history-special-tag">
                  {{ getSpecialIcon(item.specialEffect) }} {{ getSpecialTitle(item.specialEffect) }}
                </span>
              </div>

              <div class="history-word" *ngIf="item.spokenWord">
                „{{ item.spokenWord }}“
              </div>

              <div class="history-winner" *ngIf="!item.wasTimeoutSkip; else skipBadgeTemplate">
                <span class="winner-dot" [style.background]="item.winnerColor"></span>
                <span>{{ item.winnerAvatar }} {{ item.winnerName }}</span>
                <strong class="won-count">+{{ item.cardsWon }} {{ item.cardsWon === 1 ? t('Karte', 'card') : t('Karten', 'cards') }}</strong>
              </div>

              <ng-template #skipBadgeTemplate>
                <div class="history-winner skip-label">
                  🤷 {{ t('Keiner wusste was → Pot erhöht!', 'Nobody knew → Added to Pot!') }}
                </div>
              </ng-template>
            </div>
          </div>
        </section>
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        min-height: 100dvh;
      }

      .vp-page {
        position: relative;
        min-height: 100dvh;
        padding: 1.5rem 1.25rem 4rem;
        overflow-x: hidden;
      }

      .ambient-orb {
        position: fixed;
        border-radius: 50%;
        filter: blur(110px);
        opacity: 0.28;
        pointer-events: none;
        z-index: 0;
      }

      .orb-1 {
        width: 420px;
        height: 420px;
        background: #6366f1;
        top: -120px;
        left: -100px;
      }

      .orb-2 {
        width: 380px;
        height: 380px;
        background: #f59e0b;
        top: 30%;
        right: -120px;
      }

      .orb-3 {
        width: 440px;
        height: 440px;
        background: #ec4899;
        bottom: -160px;
        left: 25%;
      }

      .vp-container {
        position: relative;
        z-index: 1;
        max-width: 1260px;
        margin: 0 auto;
        display: flex;
        flex-direction: column;
        gap: 1.25rem;
      }

      /* TOPBAR */
      .topbar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
        padding: 1rem 1.35rem;
        flex-wrap: wrap;
      }

      .topbar-left {
        display: flex;
        align-items: center;
        gap: 1rem;
        flex-wrap: wrap;
      }

      .back-btn {
        padding: 0.55rem 0.95rem;
        font-size: 0.85rem;
      }

      .brand-badge {
        display: inline-block;
        font-size: 0.68rem;
        font-weight: 700;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        color: #f59e0b;
        margin-bottom: 0.15rem;
      }

      .brand-title h1 {
        margin: 0;
        font-family: var(--font-display);
        font-size: clamp(1.25rem, 2.2vw, 1.65rem);
        font-weight: 800;
        letter-spacing: -0.02em;
        display: flex;
        align-items: baseline;
        gap: 0.5rem;
        flex-wrap: wrap;
      }

      .text-gradient {
        background: linear-gradient(135deg, #f59e0b 0%, #ef4444 50%, #ec4899 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
      }

      .subtitle-tag {
        font-size: 0.82rem;
        font-weight: 500;
        color: var(--text-secondary);
      }

      .topbar-actions {
        display: flex;
        align-items: center;
        gap: 0.6rem;
        flex-wrap: wrap;
      }

      .lang-switch {
        display: inline-flex;
        background: rgba(255, 255, 255, 0.04);
        border: 1px solid var(--border-subtle);
        border-radius: 12px;
        padding: 0.2rem;
      }

      .lang-btn {
        border: none;
        background: transparent;
        color: var(--text-secondary);
        font-size: 0.8rem;
        font-weight: 700;
        padding: 0.42rem 0.7rem;
        border-radius: 9px;
        cursor: pointer;
        transition: all 0.2s ease;
      }

      .lang-btn.active {
        background: linear-gradient(135deg, #6366f1, #8b5cf6);
        color: #fff;
        box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
      }

      .icon-btn {
        padding: 0.65rem 0.85rem;
      }

      .panel-active {
        border-color: #8b5cf6 !important;
        background: rgba(139, 92, 246, 0.18) !important;
      }

      /* COLLAPSIBLE PANELS */
      .collapsible-panel {
        padding: 1.5rem;
        border: 1px solid rgba(139, 92, 246, 0.3);
      }

      .animate-slide-down {
        animation: slideDown 0.22s ease-out;
      }

      @keyframes slideDown {
        from {
          opacity: 0;
          transform: translateY(-8px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      .panel-header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 1rem;
        margin-bottom: 1.25rem;
      }

      .section-kicker {
        display: block;
        font-size: 0.72rem;
        font-weight: 700;
        letter-spacing: 0.11em;
        text-transform: uppercase;
        color: #06b6d4;
        margin-bottom: 0.25rem;
      }

      .panel-header h2 {
        margin: 0;
        font-family: var(--font-display);
        font-size: 1.3rem;
      }

      .close-pill {
        padding: 0.4rem 0.75rem;
      }

      .rules-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
        gap: 1rem;
      }

      .rule-card {
        background: rgba(255, 255, 255, 0.03);
        border: 1px solid var(--border-subtle);
        border-radius: 16px;
        padding: 1.15rem;
      }

      .rule-icon {
        font-size: 1.65rem;
        margin-bottom: 0.5rem;
      }

      .rule-card h3 {
        margin: 0 0 0.45rem;
        font-size: 1rem;
        color: var(--text-primary);
      }

      .rule-card p {
        margin: 0;
        font-size: 0.88rem;
        line-height: 1.55;
        color: var(--text-secondary);
      }

      .special-rules-list {
        margin: 0;
        padding-left: 1.1rem;
        font-size: 0.84rem;
        line-height: 1.55;
        color: var(--text-secondary);
        display: flex;
        flex-direction: column;
        gap: 0.35rem;
      }

      .special-rules-list strong {
        color: var(--text-primary);
      }

      /* SETTINGS LAYOUT */
      .settings-layout {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
        gap: 1.5rem;
      }

      .settings-column {
        display: flex;
        flex-direction: column;
        gap: 1rem;
      }

      .setting-group {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }

      .setting-label {
        font-size: 0.85rem;
        font-weight: 600;
        color: var(--text-secondary);
      }

      .option-pills {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
      }

      .pill-btn {
        padding: 0.55rem 0.95rem;
        border-radius: 10px;
        border: 1px solid var(--border-subtle);
        background: rgba(255, 255, 255, 0.04);
        color: var(--text-primary);
        font-size: 0.84rem;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.18s ease;
      }

      .pill-btn.active {
        background: rgba(99, 102, 241, 0.25);
        border-color: #6366f1;
        color: #fff;
        font-weight: 700;
      }

      .checkboxes-row {
        gap: 0.65rem;
        margin-top: 0.25rem;
      }

      .checkbox-toggle {
        display: flex;
        align-items: center;
        gap: 0.6rem;
        font-size: 0.88rem;
        color: var(--text-primary);
        cursor: pointer;
      }

      .checkbox-toggle input {
        width: 17px;
        height: 17px;
        accent-color: #8b5cf6;
      }

      .players-header-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
      }

      .sm-btn {
        padding: 0.45rem 0.85rem;
        font-size: 0.8rem;
      }

      .player-edit-list {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
        gap: 0.55rem;
      }

      .player-edit-item {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.45rem 0.6rem;
        background: rgba(255, 255, 255, 0.04);
        border: 1px solid var(--border-subtle);
        border-radius: 12px;
      }

      .player-key-badge {
        width: 24px;
        height: 24px;
        border-radius: 7px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-size: 0.76rem;
        font-weight: 800;
        color: #fff;
        flex-shrink: 0;
      }

      .player-avatar-icon {
        font-size: 1.15rem;
      }

      .player-name-input {
        width: 100%;
        background: transparent;
        border: none;
        color: var(--text-primary);
        font-size: 0.88rem;
        font-weight: 600;
        outline: none;
      }

      .remove-player-btn {
        border: none;
        background: transparent;
        cursor: pointer;
        opacity: 0.65;
        font-size: 0.9rem;
      }

      .remove-player-btn:disabled {
        opacity: 0.2;
        cursor: not-allowed;
      }

      .helper-hint {
        margin: 0;
        font-size: 0.8rem;
        color: var(--text-secondary);
      }

      /* STATUS TOAST */
      .status-toast {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        padding: 0.85rem 1.25rem;
        border-left: 4px solid #10b981;
        animation: slideDown 0.2s ease-out;
      }

      .status-toast[data-type='warning'] {
        border-left-color: #f59e0b;
        background: rgba(245, 158, 11, 0.13);
      }

      .status-toast[data-type='special'] {
        border-left-color: #ec4899;
        background: rgba(236, 72, 153, 0.14);
      }

      .toast-icon {
        font-size: 1.3rem;
      }

      .toast-text {
        font-weight: 600;
        font-size: 0.94rem;
      }

      /* TIMER & METRICS BAR */
      .timer-bar-wrapper {
        padding: 0.95rem 1.25rem;
        display: flex;
        flex-direction: column;
        gap: 0.7rem;
        transition: border-color 0.25s ease, box-shadow 0.25s ease;
      }

      .timer-bar-wrapper.timer-warning {
        border-color: rgba(245, 158, 11, 0.5);
      }

      .timer-bar-wrapper.timer-critical {
        border-color: rgba(244, 63, 94, 0.75);
        box-shadow: 0 0 28px rgba(244, 63, 94, 0.25);
      }

      .timer-meta {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
        flex-wrap: wrap;
      }

      .round-Readout {
        display: flex;
        align-items: center;
        gap: 0.6rem;
        flex-wrap: wrap;
      }

      .meta-pill {
        display: inline-flex;
        align-items: center;
        gap: 0.4rem;
        padding: 0.38rem 0.8rem;
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid var(--border-subtle);
        font-size: 0.84rem;
        color: var(--text-secondary);
      }

      .meta-pill strong {
        color: var(--text-primary);
      }

      .pot-pill.jackpot-hot {
        background: rgba(245, 158, 11, 0.18);
        border-color: rgba(245, 158, 11, 0.55);
        color: #fde68a;
      }

      .jackpot-tag {
        background: #f59e0b;
        color: #090d16;
        font-size: 0.68rem;
        font-weight: 800;
        padding: 0.1rem 0.45rem;
        border-radius: 999px;
        margin-left: 0.25rem;
      }

      .timer-controls {
        display: flex;
        align-items: center;
        gap: 0.55rem;
      }

      .countdown-digits {
        font-family: var(--font-mono);
        font-size: 1.15rem;
        font-weight: 800;
        padding: 0.35rem 0.85rem;
        border-radius: 10px;
        background: rgba(255, 255, 255, 0.06);
        border: 1px solid var(--border-subtle);
      }

      .pulse-urgent {
        color: #f43f5e;
        border-color: rgba(244, 63, 94, 0.6);
        animation: urgentPulse 0.6s infinite alternate;
      }

      @keyframes urgentPulse {
        from {
          transform: scale(1);
        }
        to {
          transform: scale(1.06);
        }
      }

      .progress-track {
        width: 100%;
        height: 8px;
        background: rgba(255, 255, 255, 0.07);
        border-radius: 999px;
        overflow: hidden;
      }

      .progress-fill {
        height: 100%;
        background: linear-gradient(90deg, #10b981, #06b6d4);
        border-radius: 999px;
        transition: width 0.35s linear;
      }

      .progress-fill.fill-warning {
        background: linear-gradient(90deg, #f59e0b, #eab308);
      }

      .progress-fill.fill-danger {
        background: linear-gradient(90deg, #ef4444, #f43f5e);
      }

      /* SPECIAL CARD ALERT BANNER */
      .special-alert-banner {
        display: flex;
        align-items: center;
        gap: 1rem;
        padding: 0.95rem 1.35rem;
        border-radius: 18px;
        border: 1px solid rgba(245, 158, 11, 0.5);
        background: linear-gradient(135deg, rgba(245, 158, 11, 0.18), rgba(236, 72, 153, 0.14));
        box-shadow: 0 10px 30px -8px rgba(245, 158, 11, 0.3);
        animation: slideDown 0.25s ease-out;
      }

      .special-alert-banner[data-effect='BUCHSTABENDREHER'] {
        border-color: rgba(244, 63, 94, 0.65);
        background: linear-gradient(135deg, rgba(244, 63, 94, 0.22), rgba(245, 158, 11, 0.15));
      }

      .special-alert-banner[data-effect='DOPPELPACK'] {
        border-color: rgba(6, 182, 212, 0.65);
        background: linear-gradient(135deg, rgba(6, 182, 212, 0.22), rgba(99, 102, 241, 0.18));
      }

      .special-alert-banner[data-effect='AUSSETZER'] {
        border-color: rgba(168, 85, 247, 0.65);
        background: linear-gradient(135deg, rgba(168, 85, 247, 0.22), rgba(236, 72, 153, 0.18));
      }

      .special-alert-icon {
        font-size: 2.1rem;
        flex-shrink: 0;
      }

      .special-alert-title {
        font-family: var(--font-display);
        font-weight: 800;
        font-size: 1rem;
        letter-spacing: 0.02em;
        color: #fff;
      }

      .special-alert-desc {
        font-size: 0.9rem;
        color: rgba(255, 255, 255, 0.88);
        margin-top: 0.15rem;
      }

      /* DUAL CARD TABLETOP */
      .tabletop-stage {
        display: grid;
        grid-template-columns: 1fr auto 1fr;
        align-items: center;
        gap: 1.35rem;
        margin: 0.25rem 0;
      }

      @media (max-width: 960px) {
        .tabletop-stage {
          grid-template-columns: 1fr;
        }
      }

      .card-slot {
        display: flex;
        flex-direction: column;
        gap: 0.65rem;
      }

      .slot-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0 0.35rem;
      }

      .slot-badge {
        font-size: 0.75rem;
        font-weight: 800;
        letter-spacing: 0.09em;
        text-transform: uppercase;
        color: var(--text-secondary);
      }

      .slot-count {
        font-size: 0.8rem;
        font-weight: 700;
        color: var(--text-secondary);
        background: rgba(255, 255, 255, 0.06);
        padding: 0.25rem 0.65rem;
        border-radius: 999px;
      }

      .jackpot-count.multi-pot {
        background: linear-gradient(135deg, #f59e0b, #ef4444);
        color: #fff;
        box-shadow: 0 4px 14px rgba(245, 158, 11, 0.45);
      }

      .card-stack-visual {
        position: relative;
        min-height: 360px;
      }

      .stack-layer {
        position: absolute;
        inset: 0;
        border-radius: 26px;
        background: rgba(18, 24, 38, 0.85);
        border: 1px solid rgba(255, 255, 255, 0.1);
        pointer-events: none;
      }

      .layer-2 {
        transform: translate(6px, 6px) rotate(1.2deg);
      }

      .layer-3 {
        transform: translate(12px, 12px) rotate(2.4deg);
      }

      .pot-layer-2 {
        transform: translate(-6px, 6px) rotate(-1.5deg);
        border-color: rgba(245, 158, 11, 0.4);
      }

      .pot-layer-3 {
        transform: translate(-12px, 12px) rotate(-3deg);
        border-color: rgba(245, 158, 11, 0.3);
      }

      .playing-card {
        position: relative;
        z-index: 2;
        min-height: 360px;
        border-radius: 26px;
        padding: 1.4rem 1.5rem;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        box-shadow: 0 22px 48px -12px rgba(0, 0, 0, 0.65);
        transition: transform 0.28s ease, box-shadow 0.28s ease;
        overflow: hidden;
      }

      .playing-card:hover {
        transform: translateY(-3px);
      }

      .flip-anim {
        animation: cardFlipIn 0.34s cubic-bezier(0.22, 1, 0.36, 1);
      }

      @keyframes cardFlipIn {
        0% {
          opacity: 0.3;
          transform: perspective(900px) rotateY(-25deg) scale(0.96);
        }
        100% {
          opacity: 1;
          transform: perspective(900px) rotateY(0deg) scale(1);
        }
      }

      /* LEFT CARD: CATEGORY FRONT */
      .category-card {
        background:
          radial-gradient(circle at 85% 15%, rgba(99, 102, 241, 0.28), transparent 55%),
          radial-gradient(circle at 15% 85%, rgba(6, 182, 212, 0.22), transparent 55%),
          linear-gradient(160deg, #131b2e 0%, #0d1322 100%);
        border: 2px solid rgba(99, 102, 241, 0.45);
      }

      /* RIGHT CARD: LETTER BACK */
      .letter-card {
        background:
          radial-gradient(circle at 80% 20%, rgba(245, 158, 11, 0.26), transparent 55%),
          radial-gradient(circle at 20% 80%, rgba(236, 72, 153, 0.24), transparent 55%),
          linear-gradient(160deg, #1b162a 0%, #101223 100%);
        border: 2px solid rgba(245, 158, 11, 0.5);
      }

      .letter-card[data-special='BUCHSTABENDREHER'] {
        border-color: #f43f5e;
        box-shadow: 0 20px 50px -12px rgba(244, 63, 94, 0.4);
      }

      .letter-card[data-special='DOPPELPACK'] {
        border-color: #06b6d4;
        box-shadow: 0 20px 50px -12px rgba(6, 182, 212, 0.4);
      }

      .letter-card[data-special='AUSSETZER'] {
        border-color: #a855f7;
        box-shadow: 0 20px 50px -12px rgba(168, 85, 247, 0.4);
      }

      .card-corner {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.5rem;
      }

      .corner-label {
        font-size: 0.72rem;
        font-weight: 800;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        color: rgba(255, 255, 255, 0.65);
      }

      .corner-num {
        font-family: var(--font-mono);
        font-size: 0.8rem;
        font-weight: 700;
        color: #818cf8;
        background: rgba(99, 102, 241, 0.16);
        padding: 0.2rem 0.55rem;
        border-radius: 8px;
      }

      .pot-chip {
        font-size: 0.76rem;
        font-weight: 800;
        padding: 0.25rem 0.65rem;
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.08);
        color: #fde68a;
      }

      .pot-chip-hot {
        background: linear-gradient(135deg, #f59e0b, #ef4444);
        color: #fff;
      }

      /* CATEGORY CENTERPIECE */
      .category-centerpiece {
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        gap: 0.55rem;
        padding: 1rem 0.5rem;
      }

      .category-emoji {
        font-size: 3.4rem;
        line-height: 1;
        filter: drop-shadow(0 8px 16px rgba(0, 0, 0, 0.35));
      }

      .category-main-title {
        font-family: var(--font-display);
        font-size: clamp(1.55rem, 2.6vw, 2.15rem);
        font-weight: 800;
        line-height: 1.15;
        color: #ffffff;
        letter-spacing: -0.02em;
      }

      .category-sub-translation {
        font-size: 0.95rem;
        font-weight: 600;
        color: #9ba6be;
      }

      .category-hint-pill {
        margin-top: 0.35rem;
        font-size: 0.8rem;
        color: #cbd5e1;
        background: rgba(255, 255, 255, 0.06);
        border: 1px solid rgba(255, 255, 255, 0.1);
        padding: 0.38rem 0.85rem;
        border-radius: 999px;
      }

      /* LETTER CENTERPIECE */
      .letter-centerpiece {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.95rem;
        padding: 0.5rem 0;
      }

      .giant-letter-ring {
        width: 148px;
        height: 148px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        background: radial-gradient(circle, rgba(245, 158, 11, 0.24) 0%, rgba(15, 23, 42, 0.75) 75%);
        border: 3px solid rgba(245, 158, 11, 0.65);
        box-shadow: 0 0 36px rgba(245, 158, 11, 0.3);
      }

      .giant-letter-ring[data-special='BUCHSTABENDREHER'] {
        border-color: #f43f5e;
        background: radial-gradient(circle, rgba(244, 63, 94, 0.28) 0%, rgba(15, 23, 42, 0.75) 75%);
        box-shadow: 0 0 36px rgba(244, 63, 94, 0.4);
      }

      .giant-letter-ring[data-special='DOPPELPACK'] {
        border-color: #06b6d4;
        background: radial-gradient(circle, rgba(6, 182, 212, 0.28) 0%, rgba(15, 23, 42, 0.75) 75%);
        box-shadow: 0 0 36px rgba(6, 182, 212, 0.4);
      }

      .giant-letter-ring[data-special='AUSSETZER'] {
        border-color: #a855f7;
        background: radial-gradient(circle, rgba(168, 85, 247, 0.28) 0%, rgba(15, 23, 42, 0.75) 75%);
        box-shadow: 0 0 36px rgba(168, 85, 247, 0.4);
      }

      .giant-letter {
        font-family: var(--font-display);
        font-size: 5.4rem;
        font-weight: 900;
        line-height: 1;
        color: #ffffff;
        text-shadow: 0 6px 22px rgba(0, 0, 0, 0.6);
      }

      .card-effect-box {
        width: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.65rem;
        padding: 0.6rem 0.9rem;
        border-radius: 14px;
        background: rgba(255, 255, 255, 0.06);
        border: 1px solid rgba(255, 255, 255, 0.12);
      }

      .card-effect-box[data-special='BUCHSTABENDREHER'] {
        background: rgba(244, 63, 94, 0.18);
        border-color: rgba(244, 63, 94, 0.5);
      }

      .card-effect-box[data-special='DOPPELPACK'] {
        background: rgba(6, 182, 212, 0.18);
        border-color: rgba(6, 182, 212, 0.5);
      }

      .card-effect-box[data-special='AUSSETZER'] {
        background: rgba(168, 85, 247, 0.18);
        border-color: rgba(168, 85, 247, 0.5);
      }

      .effect-icon {
        font-size: 1.45rem;
      }

      .effect-text-group {
        display: flex;
        flex-direction: column;
        text-align: left;
      }

      .effect-name {
        font-size: 0.8rem;
        font-weight: 800;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        color: #fff;
      }

      .effect-sub {
        font-size: 0.78rem;
        color: rgba(255, 255, 255, 0.8);
      }

      .card-footer-strip {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding-top: 0.75rem;
        border-top: 1px solid rgba(255, 255, 255, 0.08);
        font-size: 0.75rem;
        font-weight: 700;
        color: rgba(255, 255, 255, 0.6);
      }

      .letter-small-repeat {
        font-family: var(--font-display);
        font-size: 1rem;
        font-weight: 900;
        color: #f59e0b;
      }

      /* TABLETOP BRIDGE / KEINER WEISS WAS BUTTON */
      .tabletop-bridge {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.9rem;
      }

      .bridge-formula {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.25rem;
        text-align: center;
        background: rgba(255, 255, 255, 0.04);
        border: 1px solid var(--border-subtle);
        padding: 0.65rem 0.95rem;
        border-radius: 16px;
      }

      .formula-step {
        font-size: 0.75rem;
        color: var(--text-secondary);
        text-transform: uppercase;
        letter-spacing: 0.08em;
        font-weight: 700;
      }

      .formula-arrow {
        font-size: 1.25rem;
      }

      .formula-rule {
        font-size: 0.86rem;
        font-weight: 800;
        color: #fde68a;
      }

      .formula-rule.rule-twister {
        color: #fda4af;
      }

      .nobody-knows-btn {
        display: flex;
        align-items: center;
        gap: 0.7rem;
        padding: 0.85rem 1.15rem;
        border-radius: 16px;
        border: 1px solid rgba(245, 158, 11, 0.45);
        background: linear-gradient(135deg, rgba(245, 158, 11, 0.16), rgba(239, 68, 68, 0.14));
        color: var(--text-primary);
        cursor: pointer;
        transition: all 0.2s ease;
        text-align: left;
        max-width: 230px;
      }

      .nobody-knows-btn:hover {
        transform: translateY(-2px);
        border-color: #f59e0b;
        background: linear-gradient(135deg, rgba(245, 158, 11, 0.28), rgba(239, 68, 68, 0.22));
        box-shadow: 0 10px 24px -6px rgba(245, 158, 11, 0.35);
      }

      .nk-icon {
        font-size: 1.65rem;
      }

      .nk-text {
        display: flex;
        flex-direction: column;
        gap: 0.15rem;
      }

      .nk-text strong {
        font-size: 0.9rem;
        color: #fde68a;
      }

      .nk-text small {
        font-size: 0.72rem;
        color: var(--text-secondary);
        line-height: 1.3;
      }

      /* CLAIM ARENA */
      .claim-arena {
        padding: 1.35rem 1.5rem;
        display: flex;
        flex-direction: column;
        gap: 1.15rem;
      }

      .claim-header {
        display: flex;
        align-items: flex-end;
        justify-content: space-between;
        gap: 1rem;
        flex-wrap: wrap;
      }

      .claim-header h2 {
        margin: 0;
        font-family: var(--font-display);
        font-size: 1.25rem;
      }

      .word-log-controls {
        display: flex;
        align-items: center;
        gap: 0.6rem;
        flex-wrap: wrap;
      }

      .word-input-wrap {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid var(--border-subtle);
        border-radius: 12px;
        padding: 0.48rem 0.85rem;
        min-width: 260px;
      }

      .word-input {
        background: transparent;
        border: none;
        color: var(--text-primary);
        font-size: 0.88rem;
        width: 100%;
        outline: none;
      }

      .players-claim-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(245px, 1fr));
        gap: 0.85rem;
      }

      .player-claim-card {
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        gap: 0.8rem;
        padding: 1rem 1.1rem;
        border-radius: 18px;
        background: rgba(255, 255, 255, 0.035);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-top: 3px solid var(--player-color, #6366f1);
        color: var(--text-primary);
        cursor: pointer;
        transition: all 0.18s ease;
        text-align: left;
      }

      .player-claim-card:hover:not(:disabled) {
        transform: translateY(-3px);
        background: rgba(255, 255, 255, 0.075);
        border-color: var(--player-color, #6366f1);
        box-shadow: 0 12px 28px -8px rgba(0, 0, 0, 0.55);
      }

      .player-claim-card.is-leader {
        background: linear-gradient(180deg, rgba(245, 158, 11, 0.1), rgba(255, 255, 255, 0.03));
      }

      .player-claim-card.is-muted-winner {
        opacity: 0.52;
        cursor: not-allowed;
        border-top-color: #64748b;
        background: rgba(15, 23, 42, 0.5);
      }

      .claim-card-top {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.75rem;
      }

      .player-identity {
        display: flex;
        align-items: center;
        gap: 0.65rem;
      }

      .player-avatar {
        font-size: 1.65rem;
      }

      .player-name-wrap {
        display: flex;
        flex-direction: column;
      }

      .player-name {
        font-weight: 800;
        font-size: 1rem;
      }

      .shortcut-hint {
        font-size: 0.72rem;
        color: var(--text-secondary);
        font-family: var(--font-mono);
      }

      .player-score-badge {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
      }

      .score-num {
        font-family: var(--font-display);
        font-size: 1.45rem;
        font-weight: 900;
        line-height: 1;
        color: #fff;
      }

      .score-unit {
        font-size: 0.68rem;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        color: var(--text-secondary);
      }

      .claim-action-bar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.45rem;
        padding: 0.52rem 0.75rem;
        border-radius: 11px;
        background: rgba(255, 255, 255, 0.06);
        font-size: 0.82rem;
        font-weight: 700;
      }

      .pot-gain-pill {
        background: var(--player-color, #6366f1);
        color: #fff;
        font-weight: 800;
        font-size: 0.76rem;
        padding: 0.15rem 0.5rem;
        border-radius: 999px;
      }

      .muted-bar {
        background: rgba(244, 63, 94, 0.15);
        color: #fda4af;
        justify-content: center;
      }

      /* GAME OVER PODIUM */
      .gameover-panel {
        padding: 2.2rem 1.75rem;
        text-align: center;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 1.5rem;
      }

      .trophy-hero {
        font-size: 4rem;
        display: block;
        margin-bottom: 0.35rem;
      }

      .gameover-header h2 {
        margin: 0.25rem 0 0.5rem;
        font-family: var(--font-display);
        font-size: clamp(1.6rem, 3vw, 2.3rem);
      }

      .gameover-header p {
        margin: 0;
        color: var(--text-secondary);
      }

      .podium-list {
        width: 100%;
        max-width: 680px;
        display: flex;
        flex-direction: column;
        gap: 0.65rem;
      }

      .podium-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
        padding: 0.95rem 1.25rem;
        border-radius: 16px;
        background: rgba(255, 255, 255, 0.04);
        border: 1px solid var(--border-subtle);
        border-left: 4px solid var(--player-color, #6366f1);
        text-align: left;
      }

      .podium-row.first-place {
        background: linear-gradient(135deg, rgba(245, 158, 11, 0.18), rgba(255, 255, 255, 0.05));
        border-color: rgba(245, 158, 11, 0.55);
      }

      .podium-rank {
        font-size: 1.5rem;
        font-weight: 800;
        min-width: 38px;
      }

      .podium-player {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        flex: 1;
      }

      .podium-avatar {
        font-size: 1.75rem;
      }

      .podium-name {
        font-weight: 800;
        font-size: 1.05rem;
      }

      .podium-sub {
        font-size: 0.78rem;
        color: var(--text-secondary);
      }

      .podium-score {
        text-align: right;
        display: flex;
        flex-direction: column;
      }

      .podium-score strong {
        font-family: var(--font-display);
        font-size: 1.5rem;
        color: #fde68a;
      }

      .podium-score span {
        font-size: 0.74rem;
        color: var(--text-secondary);
      }

      .gameover-actions {
        display: flex;
        flex-wrap: wrap;
        justify-content: center;
        gap: 0.75rem;
      }

      /* HISTORY LOG */
      .history-panel {
        padding: 1.25rem 1.5rem;
      }

      .history-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 0.85rem;
      }

      .history-header h3 {
        margin: 0;
        font-size: 1rem;
      }

      .history-sub {
        font-size: 0.8rem;
        color: var(--text-secondary);
      }

      .history-list {
        display: flex;
        flex-direction: column;
        gap: 0.45rem;
      }

      .history-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.75rem;
        padding: 0.55rem 0.85rem;
        border-radius: 12px;
        background: rgba(255, 255, 255, 0.03);
        border: 1px solid var(--border-subtle);
        font-size: 0.85rem;
        flex-wrap: wrap;
      }

      .history-round {
        font-family: var(--font-mono);
        color: var(--text-muted);
        font-weight: 700;
      }

      .history-card-info {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        flex: 1;
        flex-wrap: wrap;
      }

      .history-cat {
        font-weight: 700;
      }

      .history-letter-badge {
        background: rgba(245, 158, 11, 0.2);
        color: #fde68a;
        font-weight: 800;
        padding: 0.1rem 0.5rem;
        border-radius: 6px;
        font-family: var(--font-mono);
      }

      .history-special-tag {
        font-size: 0.75rem;
        padding: 0.1rem 0.5rem;
        border-radius: 999px;
        background: rgba(236, 72, 153, 0.18);
        color: #fbcfe8;
      }

      .history-word {
        font-style: italic;
        color: #cbd5e1;
      }

      .history-winner {
        display: flex;
        align-items: center;
        gap: 0.45rem;
      }

      .winner-dot {
        width: 9px;
        height: 9px;
        border-radius: 50%;
      }

      .won-count {
        color: #10b981;
        margin-left: 0.25rem;
      }

      .skip-label {
        color: #f59e0b;
        font-weight: 600;
      }
    `,
  ],
})
export class VollpfostenGameComponent implements OnDestroy {
  private readonly cdr = inject(ChangeDetectorRef);
  protected readonly languageService = inject(LanguageService);
  lang: Language = this.languageService.currentLang();
  soundEnabled = true;
  showRulesPanel = false;
  showSettingsPanel = false;

  configuredDeckSize = 35;
  timerDuration = 30;
  includeSpecialCards = true;
  autoStackOnTimeout = true;

  private readonly playerPalette = [
    { color: '#6366f1', avatar: '🦊' },
    { color: '#ec4899', avatar: '🐯' },
    { color: '#10b981', avatar: '🐼' },
    { color: '#f59e0b', avatar: '🦁' },
    { color: '#06b6d4', avatar: '🐸' },
    { color: '#a855f7', avatar: '🐙' },
    { color: '#f43f5e', avatar: '🦄' },
    { color: '#84cc16', avatar: '🐨' },
  ];

  players: Player[] = loadSavedPlayerNames([
    'Spieler 1',
    'Spieler 2',
    'Spieler 3',
    'Spieler 4',
  ]).map((name, idx) => {
    const style = this.playerPalette[idx % this.playerPalette.length];
    return {
      id: idx + 1,
      name,
      color: style.color,
      avatar: style.avatar,
      score: 0,
      biggestPotWon: 0,
      streak: 0,
    };
  });

  /**
   * 48 funny & creative bilingual categories inspired by Stadt Land Vollpfosten!
   */
  readonly allCategories: CategoryItem[] = [
    {
      id: 1,
      icon: '💔',
      title: { de: 'Scheidungsgrund', en: 'Reason for Divorce' },
      hint: { de: 'Warum kracht es in der Ehe?', en: 'Why does a marriage fall apart?' },
    },
    {
      id: 2,
      icon: '🤬',
      title: { de: 'Schimpfwort (jugendfrei oder frech)', en: 'Curse Word or Insult' },
      hint: { de: 'Fluch oder Beleidigung', en: 'Something shouted in traffic' },
    },
    {
      id: 3,
      icon: '🧪',
      title: { de: 'Flüssigkeit', en: 'Liquid' },
      hint: { de: 'Alles, was fließt oder trinkbar ist', en: 'Anything pourable or drinkable' },
    },
    {
      id: 4,
      icon: '🧤',
      title: { de: 'Dinge im Handschuhfach', en: 'Things in a Glovebox' },
      hint: { de: 'Was liegt im Auto herum?', en: 'Items found inside a car glovebox' },
    },
    {
      id: 5,
      icon: '👔',
      title: { de: 'Ausrede beim Chef', en: 'Excuse for the Boss' },
      hint: { de: 'Warum kommst du zu spät?', en: 'Why are you late for work?' },
    },
    {
      id: 6,
      icon: '🍕',
      title: { de: 'Pizzabelag', en: 'Pizza Topping' },
      hint: { de: 'Klassisch oder völlig verrückt', en: 'Classic or weird pizza ingredient' },
    },
    {
      id: 7,
      icon: '😘',
      title: { de: 'Peinlicher Kosename', en: 'Cringey Pet Name' },
      hint: { de: 'Schatzi, Mausi, Bärchen...', en: 'Honey, Muffin, Pumpkin...' },
    },
    {
      id: 8,
      icon: '🔪',
      title: { de: 'Mordwaffe im Krimi', en: 'Crime Murder Weapon' },
      hint: { de: 'Womit schlägt der Täter zu?', en: 'Classic detective movie weapon' },
    },
    {
      id: 9,
      icon: '🍔',
      title: { de: 'Ungesundes Essen', en: 'Junk Food' },
      hint: { de: 'Kalorienbombe oder Fast Food', en: 'Guilty pleasure snack or fast food' },
    },
    {
      id: 10,
      icon: '🦨',
      title: { de: 'Dinge, die stinken', en: 'Things That Smell Bad' },
      hint: { de: 'Nase zuhalten!', en: 'Hold your nose!' },
    },
    {
      id: 11,
      icon: '🎬',
      title: { de: 'Todesursache im Actionfilm', en: 'Action Movie Cause of Death' },
      hint: { de: 'Explosion, Hai, Klippe...', en: 'Explosion, shark, volcano...' },
    },
    {
      id: 12,
      icon: '🕺',
      title: { de: 'Peinliches Hobby', en: 'Embarrassing Hobby' },
      hint: { de: 'Was verschweigt man beim ersten Date?', en: 'What do you hide on a first date?' },
    },
    {
      id: 13,
      icon: '🍺',
      title: { de: 'Dinge auf dem Oktoberfest', en: 'Things at a Festival or Fair' },
      hint: { de: 'Festzelt, Riesenrad, Brezel...', en: 'Beer tent, pretzel, rides...' },
    },
    {
      id: 14,
      icon: '🛋️',
      title: { de: 'Grund zum Streiten in der WG', en: 'Roommate Argument Reason' },
      hint: { de: 'Abwasch, Müll, Kühlschrank...', en: 'Dirty dishes, trash, noise...' },
    },
    {
      id: 15,
      icon: '🏝️',
      title: { de: 'Mitnehmen auf eine einsame Insel', en: 'Bring to a Deserted Island' },
      hint: { de: 'Überlebenswichtig oder nützlich', en: 'Survival gear or comfort item' },
    },
    {
      id: 16,
      icon: '🦸',
      title: { de: 'Nutzlose Superkraft', en: 'Useless Superpower' },
      hint: { de: 'Kreativ oder super spezifisch', en: 'Funny or unhelpful ability' },
    },
    {
      id: 17,
      icon: '🛒',
      title: { de: 'Dinge an der Supermarktkasse', en: 'Items Near the Checkout Lane' },
      hint: { de: 'Kaugummi, Batterien, Klatschpresse...', en: 'Gum, batteries, magazines...' },
    },
    {
      id: 18,
      icon: '👻',
      title: { de: 'Wovor man im Dunkeln Angst hat', en: 'Things Scary in the Dark' },
      hint: { de: 'Geräusche, Monster, Spinnen...', en: 'Noises, monsters, spiders...' },
    },
    {
      id: 19,
      icon: '🚿',
      title: { de: 'Dinge im Badezimmer', en: 'Things in a Bathroom' },
      hint: { de: 'Alles rund um Dusche & Spiegel', en: 'Around the sink or shower' },
    },
    {
      id: 20,
      icon: '🎉',
      title: { de: 'Mitbringsel zur Hausparty', en: 'House Party Item to Bring' },
      hint: { de: 'Snacks, Getränke, Musik...', en: 'Snacks, drinks, games...' },
    },
    {
      id: 21,
      icon: '🧦',
      title: { de: 'Schlechtes Weihnachtsgeschenk', en: 'Terrible Christmas Gift' },
      hint: { de: 'Socken, Bügeleisen, Gutschein...', en: 'Socks, vacuum cleaner, soap...' },
    },
    {
      id: 22,
      icon: '🚓',
      title: { de: 'Grund für eine Verhaftung', en: 'Reason to Get Arrested' },
      hint: { de: 'Verbotenes oder Straftat', en: 'Crime or misdemeanor' },
    },
    {
      id: 23,
      icon: '🦷',
      title: { de: 'Was wehtut', en: 'Something Painful' },
      hint: { de: 'Zahnarzt, Sonnenbrand, Legostein...', en: 'Sunburn, stepping on Lego...' },
    },
    {
      id: 24,
      icon: '📱',
      title: { de: 'App auf dem Smartphone', en: 'Smartphone App' },
      hint: { de: 'Social Media, Spiele, Tools...', en: 'Social media, maps, games...' },
    },
    {
      id: 25,
      icon: '🧹',
      title: { de: 'Unbeliebte Hausarbeit', en: 'Hated Household Chore' },
      hint: { de: 'Bügeln, Fensterputzen, Müll...', en: 'Ironing, scrubbing floors...' },
    },
    {
      id: 26,
      icon: '🎸',
      title: { de: 'Musikinstrument oder Band', en: 'Musical Instrument or Band' },
      hint: { de: 'Alles, was Krach oder Musik macht', en: 'Makes music or noise' },
    },
    {
      id: 27,
      icon: '🏖️',
      title: { de: 'Dinge am Strand', en: 'Things at the Beach' },
      hint: { de: 'Sonnencreme, Muschel, Handtuch...', en: 'Sunscreen, towel, seashell...' },
    },
    {
      id: 28,
      icon: '🥶',
      title: { de: 'Etwas Kaltes', en: 'Something Cold' },
      hint: { de: 'Eiswürfel, Nordpol, Ex-Partner...', en: 'Ice cube, snow, freezer...' },
    },
    {
      id: 29,
      icon: '🔴',
      title: { de: 'Etwas Rotes', en: 'Something Red' },
      hint: { de: 'Feuerwehr, Erdbeere, Ampel...', en: 'Firetruck, strawberry, ruby...' },
    },
    {
      id: 30,
      icon: '🟢',
      title: { de: 'Etwas Grünes', en: 'Something Green' },
      hint: { de: 'Frosch, Brokkoli, Rasen...', en: 'Frog, broccoli, grass...' },
    },
    {
      id: 31,
      icon: '💼',
      title: { de: 'Traumberuf als Kind', en: 'Childhood Dream Job' },
      hint: { de: 'Astronaut, Tierarzt, Pirat...', en: 'Astronaut, vet, firefighter...' },
    },
    {
      id: 32,
      icon: '🎒',
      title: { de: 'Dinge im Schulranzen', en: 'Things in a School Backpack' },
      hint: { de: 'Pausenbrot, Lineal, Spickzettel...', en: 'Ruler, lunchbox, cheat sheet...' },
    },
    {
      id: 33,
      icon: '🏥',
      title: { de: 'Körperteil oder Organ', en: 'Body Part or Organ' },
      hint: { de: 'Von Kopf bis Fuß', en: 'From head to toe' },
    },
    {
      id: 34,
      icon: '🐾',
      title: { de: 'Tier mit 4 Beinen (oder mehr)', en: 'Animal with 4+ Legs' },
      hint: { de: 'Haustier, Wildtier oder Insekt', en: 'Pet, wild animal, or bug' },
    },
    {
      id: 35,
      icon: '🍸',
      title: { de: 'Cocktail oder Getränk an der Bar', en: 'Bar Drink or Cocktail' },
      hint: { de: 'Mit oder ohne Alkohol', en: 'Alcoholic or mocktail' },
    },
    {
      id: 36,
      icon: '🧳',
      title: { de: 'Was man im Urlaub immer vergisst', en: 'Forgotten When Packing for Vacation' },
      hint: { de: 'Ladekabel, Zahnbürste, Reisepass...', en: 'Charger, toothbrush, passport...' },
    },
    {
      id: 37,
      icon: '🧀',
      title: { de: 'Dinge im Kühlschrank', en: 'Things in a Fridge' },
      hint: { de: 'Käse, Senf, Licht, Reste...', en: 'Cheese, mustard, leftovers...' },
    },
    {
      id: 38,
      icon: '🎪',
      title: { de: 'Dinge im Zirkus oder Jahrmarkt', en: 'Things at a Circus' },
      hint: { de: 'Clown, Trapez, Zuckerwatte...', en: 'Clown, trapeze, cotton candy...' },
    },
    {
      id: 39,
      icon: '💍',
      title: { de: 'Grund zum Feiern', en: 'Reason to Celebrate' },
      hint: { de: 'Hochzeit, Geburtstag, Lottogewinn...', en: 'Wedding, birthday, promotion...' },
    },
    {
      id: 40,
      icon: '🛠️',
      title: { de: 'Werkzeug im Baumarkt', en: 'Hardware Store Tool' },
      hint: { de: 'Hammer, Bohrer, Zollstock...', en: 'Hammer, drill, wrench...' },
    },
    {
      id: 41,
      icon: '📺',
      title: { de: 'TV-Show oder Serie', en: 'TV Show or Series' },
      hint: { de: 'Streaming-Hit oder Klassiker', en: 'Streaming hit or classic TV' },
    },
    {
      id: 42,
      icon: '🧁',
      title: { de: 'Süßigkeit oder Nachtisch', en: 'Candy or Dessert' },
      hint: { de: 'Schokolade, Eis, Pudding...', en: 'Chocolate, cake, ice cream...' },
    },
    {
      id: 43,
      icon: '🏰',
      title: { de: 'Märchenfigur oder Fabelwesen', en: 'Fairy Tale or Mythical Creature' },
      hint: { de: 'Drache, Einhorn, Hexe...', en: 'Dragon, unicorn, witch...' },
    },
    {
      id: 44,
      icon: '✈️',
      title: { de: 'Urlaubsland oder Hauptstadt', en: 'Vacation Country or Capital' },
      hint: { de: 'Wohin geht die Reise?', en: 'Where would you travel?' },
    },
    {
      id: 45,
      icon: '🛋️',
      title: { de: 'Möbelstück oder Deko', en: 'Piece of Furniture' },
      hint: { de: 'Sofa, Schrank, Stehlampe...', en: 'Couch, table, lamp...' },
    },
    {
      id: 46,
      icon: '🧥',
      title: { de: 'Kleidungsstück oder Accessoire', en: 'Clothing or Accessory' },
      hint: { de: 'Vom Hut bis zu den Schuhen', en: 'From hat to shoes' },
    },
    {
      id: 47,
      icon: '🏆',
      title: { de: 'Sportart oder Spiel', en: 'Sport or Game' },
      hint: { de: 'Mit Ball, Schläger oder Brett', en: 'Ball sport, olympic event, or game' },
    },
    {
      id: 48,
      icon: '🔊',
      title: { de: 'Etwas, das laut ist', en: 'Something Very Loud' },
      hint: { de: 'Sirene, Rasenmäher, Baby...', en: 'Siren, lawnmower, thunder...' },
    },
    {
      id: 49,
      icon: '🥨',
      title: { de: 'Typisch Deutsch', en: 'Typically German' },
      hint: { de: 'Socken in Sandalen, Autobahn, Pfand...', en: 'Autobahn, pretzels, punctuality...' },
    },
    {
      id: 50,
      icon: '🚩',
      title: { de: 'Red Flag beim ersten Date', en: 'First Date Red Flag' },
      hint: { de: 'Unpünktlich, redet nur über Ex...', en: 'Rude to waiter, talks about ex...' },
    },
    {
      id: 51,
      icon: '🛒',
      title: { de: 'Was man nachts an der Tankstelle kauft', en: 'Bought at a Gas Station at Night' },
      hint: { de: 'Bier, Chips, Eis, Zigaretten...', en: 'Energy drink, chips, ice cream...' },
    },
    {
      id: 52,
      icon: '👵',
      title: { de: 'Dinge in Omas Handtasche', en: 'Things in Grandma’s Purse' },
      hint: { de: 'Stofftaschentuch, Hustenbonbon...', en: 'Cough drops, tissues, hard candy...' },
    },
    {
      id: 53,
      icon: '🎤',
      title: { de: 'Karaoke-Song zum Mitgrölen', en: 'Karaoke Sing-Along Song' },
      hint: { de: 'Partyschlager, Pop-Hit oder Rock-Hymne', en: 'Party anthem or pop classic' },
    },
    {
      id: 54,
      icon: '🤥',
      title: { de: 'Typische Notlüge im Alltag', en: 'Common Everyday White Lie' },
      hint: { de: 'Bin gleich da, Akku war leer...', en: 'On my way, traffic was crazy...' },
    },
    {
      id: 55,
      icon: '🧟',
      title: { de: 'Waffe gegen Zombies', en: 'Weapon Against Zombies' },
      hint: { de: 'Bratpfanne, Kettensäge, Schaufel...', en: 'Frying pan, chainsaw, baseball bat...' },
    },
    {
      id: 56,
      icon: '⛺',
      title: { de: 'Dinge beim Camping oder Festival', en: 'Camping or Festival Gear' },
      hint: { de: 'Zelt, Gaskocher, Dosenravioli...', en: 'Tent, sleeping bag, flashlight...' },
    },
    {
      id: 57,
      icon: '🩺',
      title: { de: 'Grund für einen Arztbesuch', en: 'Reason to See a Doctor' },
      hint: { de: 'Schnupfen, Hexenschuss, Krankschreibung...', en: 'Flu, back pain, sick note...' },
    },
    {
      id: 58,
      icon: '💸',
      title: { de: 'Was man kauft, wenn man im Lotto gewinnt', en: 'Bought After Winning the Lottery' },
      hint: { de: 'Yacht, Villa, Sportwagen, Insel...', en: 'Yacht, mansion, sports car, island...' },
    },
    {
      id: 59,
      icon: '🧀',
      title: { de: 'Käsesorte oder Wurstsorte', en: 'Type of Cheese or Sausage' },
      hint: { de: 'Gouda, Camembert, Salami, Bratwurst...', en: 'Cheddar, Gouda, Brie, Salami...' },
    },
    {
      id: 60,
      icon: '🚗',
      title: { de: 'Automarke oder Fahrzeug', en: 'Car Brand or Vehicle' },
      hint: { de: 'Vom Sportwagen bis zum Traktor', en: 'From sports car to tractor' },
    },
    {
      id: 61,
      icon: '☕',
      title: { de: 'Dinge im Büro oder Homeoffice', en: 'Things in an Office or Home Office' },
      hint: { de: 'Tacker, Kaffeetasse, Jogginghose...', en: 'Stapler, coffee mug, sweatpants...' },
    },
    {
      id: 62,
      icon: '👶',
      title: { de: 'Was Babys oder Kleinkinder machen', en: 'Things Babies or Toddlers Do' },
      hint: { de: 'Sabbern, schreien, krabbeln...', en: 'Drool, cry, crawl, throw food...' },
    },
    {
      id: 63,
      icon: '🎃',
      title: { de: 'Verkleidung an Karneval oder Halloween', en: 'Carnival or Halloween Costume' },
      hint: { de: 'Pirat, Vampir, Krankenschwester...', en: 'Pirate, vampire, superhero, witch...' },
    },
    {
      id: 64,
      icon: '📦',
      title: { de: 'Was im Keller oder auf dem Dachboden verstaubt', en: 'Gathering Dust in the Basement or Attic' },
      hint: { de: 'Weihnachtsdeko, Heimtrainer, Kartons...', en: 'Old toys, exercise bike, boxes...' },
    },
    {
      id: 65,
      icon: '🍳',
      title: { de: 'Küchengerät oder Kochutensil', en: 'Kitchen Appliance or Utensil' },
      hint: { de: 'Toaster, Schneebesen, Mixer...', en: 'Toaster, whisk, blender, spatula...' },
    },
    {
      id: 66,
      icon: '🌱',
      title: { de: 'Gewürz, Kraut oder Soße', en: 'Spice, Herb, or Sauce' },
      hint: { de: 'Knoblauch, Basilikum, Ketchup, Chili...', en: 'Garlic, basil, ketchup, mustard...' },
    },
    {
      id: 67,
      icon: '🐕',
      title: { de: 'Typischer Hundename oder Katzenname', en: 'Typical Dog or Cat Name' },
      hint: { de: 'Bello, Luna, Balu, Mieze...', en: 'Buddy, Luna, Max, Whiskers...' },
    },
    {
      id: 68,
      icon: '🎢',
      title: { de: 'Attraktion im Freizeitpark', en: 'Theme Park Attraction' },
      hint: { de: 'Achterbahn, Geisterbahn, Wildwasserbahn...', en: 'Rollercoaster, haunted house, bumper cars...' },
    },
    {
      id: 69,
      icon: '🥯',
      title: { de: 'Auf dem Frühstückstisch', en: 'On the Breakfast Table' },
      hint: { de: 'Brötchen, Marmelade, Rührei, Kaffee...', en: 'Croissant, jam, scrambled eggs, coffee...' },
    },
    {
      id: 70,
      icon: '🍿',
      title: { de: 'Filmgenre oder berühmter Film', en: 'Movie Genre or Famous Film' },
      hint: { de: 'Komödie, Thriller, Titanic, Matrix...', en: 'Comedy, thriller, Titanic, Avatar...' },
    },
    {
      id: 71,
      icon: '🎮',
      title: { de: 'Videospiel oder Brettspiel', en: 'Video Game or Board Game' },
      hint: { de: 'Mario Kart, Monopoly, Uno, Sims...', en: 'Mario Kart, Monopoly, Minecraft, Uno...' },
    },
    {
      id: 72,
      icon: '🍯',
      title: { de: 'Etwas Klebriges', en: 'Something Sticky' },
      hint: { de: 'Honig, Kaugummi, Sekundenkleber...', en: 'Honey, chewing gum, superglue, syrup...' },
    },
    {
      id: 73,
      icon: '🎈',
      title: { de: 'Etwas Rundes oder Kugelförmiges', en: 'Something Round or Spherical' },
      hint: { de: 'Fußball, Vollmond, Melone, Münze...', en: 'Soccer ball, full moon, melon, coin...' },
    },
    {
      id: 74,
      icon: '🪶',
      title: { de: 'Etwas Weiches oder Flauschiges', en: 'Something Soft or Fluffy' },
      hint: { de: 'Kopfkissen, Watte, Teddybär, Katze...', en: 'Pillow, cotton candy, teddy bear...' },
    },
    {
      id: 75,
      icon: '🌶️',
      title: { de: 'Etwas Scharfes oder Heißes', en: 'Something Spicy or Hot' },
      hint: { de: 'Jalapeño, Wasabi, Bügeleisen, Lava...', en: 'Chili pepper, wasabi, lava, sauna...' },
    },
    {
      id: 76,
      icon: '💎',
      title: { de: 'Etwas sehr Teures (Luxusartikel)', en: 'Something Very Expensive (Luxury)' },
      hint: { de: 'Diamant, Kaviar, Rolex, Privatjet...', en: 'Diamond, caviar, Rolex, private jet...' },
    },
    {
      id: 77,
      icon: '🪙',
      title: { de: 'Was unter dem Sofakissen liegt', en: 'Found Under the Couch Cushions' },
      hint: { de: 'Krümel, Fernbedienung, Kleingeld, Socke...', en: 'Crumbs, remote control, coins, sock...' },
    },
    {
      id: 78,
      icon: '🏋️',
      title: { de: 'Neujahrsvorsatz (der selten klappt)', en: 'New Year’s Resolution' },
      hint: { de: 'Abnehmen, mehr Sport, weniger Handy...', en: 'Lose weight, work out, save money...' },
    },
    {
      id: 79,
      icon: '🧙',
      title: { de: 'Bösewicht aus Film, Buch oder Comic', en: 'Movie, Book, or Comic Villain' },
      hint: { de: 'Joker, Darth Vader, Voldemort, Bowser...', en: 'Joker, Darth Vader, Thanos, Voldemort...' },
    },
    {
      id: 80,
      icon: '👑',
      title: { de: 'Promi, den fast jeder kennt', en: 'World-Famous Celebrity' },
      hint: { de: 'Schauspieler, Musikstar oder Sport-Legende', en: 'Actor, pop star, or sports legend' },
    },
    {
      id: 81,
      icon: '🏛️',
      title: { de: 'Berühmte Sehenswürdigkeit', en: 'Famous Landmark or Sight' },
      hint: { de: 'Eiffelturm, Kolosseum, Pyramiden...', en: 'Eiffel Tower, Colosseum, Taj Mahal...' },
    },
    {
      id: 82,
      icon: '🌳',
      title: { de: 'Baum, Blume oder Pflanze', en: 'Tree, Flower, or Plant' },
      hint: { de: 'Rose, Kaktus, Eiche, Tulpe...', en: 'Rose, cactus, oak, sunflower...' },
    },
    {
      id: 83,
      icon: '🍎',
      title: { de: 'Obst oder Gemüse', en: 'Fruit or Vegetable' },
      hint: { de: 'Apfel, Gurke, Mango, Aubergine...', en: 'Apple, cucumber, mango,broccoli...' },
    },
    {
      id: 84,
      icon: '🦅',
      title: { de: 'Tier, das fliegen oder schwimmen kann', en: 'Animal That Flies or Swims' },
      hint: { de: 'Adler, Delfin, Pinguin, Mücke...', en: 'Eagle, dolphin, penguin, shark...' },
    },
    {
      id: 85,
      icon: '🕷️',
      title: { de: 'Krabbelvieh oder Ungeziefer', en: 'Creepy Crawly or Bug' },
      hint: { de: 'Spinne, Ameise, Wespe, Nacktschnecke...', en: 'Spider, ant, wasp, cockroach...' },
    },
    {
      id: 86,
      icon: '⛈️',
      title: { de: 'Wetterphänomen oder Naturgewalt', en: 'Weather Phenomenon or Natural Force' },
      hint: { de: 'Hagel, Tornado, Gewitter, Nebel...', en: 'Hail, tornado, thunderstorm, fog...' },
    },
    {
      id: 87,
      icon: '📚',
      title: { de: 'Schulfach oder Studienfach', en: 'School Subject or College Major' },
      hint: { de: 'Mathe, Sport, Chemie, Philosophie...', en: 'Math, P.E., chemistry, history...' },
    },
    {
      id: 88,
      icon: '👮',
      title: { de: 'Beruf mit Uniform oder Arbeitskleidung', en: 'Job With a Uniform' },
      hint: { de: 'Pilot, Polizei, Feuerwehr, Koch...', en: 'Pilot, police officer, firefighter, chef...' },
    },
    {
      id: 89,
      icon: '👜',
      title: { de: 'Dinge in der Hosentasche oder Handtasche', en: 'Things in Your Pocket or Bag' },
      hint: { de: 'Schlüssel, Lippenstift, Kaugummi, Handy...', en: 'Keys, lip balm, wallet, phone...' },
    },
    {
      id: 90,
      icon: '🚉',
      title: { de: 'Was am Bahnhof oder Flughafen nervt', en: 'Annoying at a Train Station or Airport' },
      hint: { de: 'Verspätung, Sicherheitskontrolle, Koffer...', en: 'Delays, long security lines, lost luggage...' },
    },
    {
      id: 91,
      icon: '🎂',
      title: { de: 'Dinge auf einem Kindergeburtstag', en: 'At a Kids’ Birthday Party' },
      hint: { de: 'Topfschlagen, Luftballons, Torte, Clown...', en: 'Balloons, cake, clown, party hats...' },
    },
    {
      id: 92,
      icon: '💒',
      title: { de: 'Dinge auf einer Hochzeit', en: 'Things at a Wedding' },
      hint: { de: 'Brautstrauß, Ringe, Torte, Walzer...', en: 'Bouquet, wedding rings, cake, tuxedo...' },
    },
    {
      id: 93,
      icon: '🏥',
      title: { de: 'Dinge im Krankenhaus oder Erste-Hilfe-Kasten', en: 'In a Hospital or First-Aid Kit' },
      hint: { de: 'Pflaster, Spritze, Verband, Krücken...', en: 'Band-aid, syringe, bandage, crutches...' },
    },
    {
      id: 94,
      icon: '🔌',
      title: { de: 'Gerät mit Stecker oder Akku', en: 'Device With a Plug or Battery' },
      hint: { de: 'Föhn, Staubsauger, Laptop, Bohrmaschine...', en: 'Hairdryer, vacuum, laptop, drill...' },
    },
    {
      id: 95,
      icon: '🧴',
      title: { de: 'Drogerie-Artikel', en: 'Drugstore or Toiletries Item' },
      hint: { de: 'Shampoo, Deo, Zahnpasta, Klopapier...', en: 'Shampoo, deodorant, toothpaste, soap...' },
    },
    {
      id: 96,
      icon: '🥖',
      title: { de: 'Vom Bäcker oder Konditor', en: 'From the Bakery or Pastry Shop' },
      hint: { de: 'Brezel, Croissant, Berliner, Schwarzwälder...', en: 'Pretzel, bagel, donut, sourdough...' },
    },
    {
      id: 97,
      icon: '🍖',
      title: { de: 'Was auf den Grill gehört', en: 'Things Put on the BBQ Grill' },
      hint: { de: 'Steak, Grillkäse, Maiskolben, Würstchen...', en: 'Steak, halloumi, corn on the cob, burger...' },
    },
    {
      id: 98,
      icon: '🍦',
      title: { de: 'Eissorte in der Eisdiele', en: 'Ice Cream Flavor' },
      hint: { de: 'Stracciatella, Pistazie, Schlumpf, Vanille...', en: 'Vanilla, pistachio, cookie dough, mango...' },
    },
    {
      id: 99,
      icon: '🥗',
      title: { de: 'Gesundes Essen oder Superfood', en: 'Healthy Food or Superfood' },
      hint: { de: 'Avocado, Quinoa, Spinat, Haferflocken...', en: 'Avocado, kale, quinoa, oatmeal...' },
    },
    {
      id: 100,
      icon: '🥫',
      title: { de: 'Essen aus der Dose oder dem Glas', en: 'Canned or Jarred Food' },
      hint: { de: 'Ravioli, saure Gurken, Thunfisch, Mais...', en: 'Pickles, baked beans, tuna, soup...' },
    },
    {
      id: 101,
      icon: '🛸',
      title: { de: 'Im Weltall oder in der Science-Fiction', en: 'In Outer Space or Sci-Fi' },
      hint: { de: 'Planet, Schwarzes Loch, Lichtschwert, Alien...', en: 'Planet, black hole, alien, spaceship...' },
    },
    {
      id: 102,
      icon: '🏴‍☠️',
      title: { de: 'Was ein Pirat oder Ritter braucht', en: 'What a Pirate or Knight Needs' },
      hint: { de: 'Augenklappe, Schatzkarte, Schwert, Rüstung...', en: 'Eyepatch, treasure map, sword, armor...' },
    },
    {
      id: 103,
      icon: '🕵️',
      title: { de: 'Spitzname für Geld', en: 'Slang Word for Money' },
      hint: { de: 'Kohle, Knete, Zaster, Mäuse, Kröten...', en: 'Cash, bucks, dough, cheddar,loot...' },
    },
    {
      id: 104,
      icon: '😴',
      title: { de: 'Warum man nachts nicht schlafen kann', en: 'Reason You Can’t Sleep at Night' },
      hint: { de: 'Schnarchen, Mücke, Vollmond, Kaffee...', en: 'Snoring, mosquito, caffeine, noise...' },
    },
    {
      id: 105,
      icon: '🚿',
      title: { de: 'Was man heimlich unter der Dusche tut', en: 'Things Done in the Shower' },
      hint: { de: 'Singen, philosophieren, Streitgespräch üben...', en: 'Sing loudly, daydream, win fake arguments...' },
    },
    {
      id: 106,
      icon: '📸',
      title: { de: 'Typisches Urlaubsfoto-Motiv', en: 'Typical Vacation Photo Subject' },
      hint: { de: 'Sonnenuntergang, Cocktail, Füße am Strand...', en: 'Sunset, cocktail, feet on the beach...' },
    },
    {
      id: 107,
      icon: '🐕‍🦺',
      title: { de: 'Grund, warum der Hund bellt', en: 'Reason the Dog Is Barking' },
      hint: { de: 'Postbote, Eichhörnchen, Türklingel...', en: 'Mailman, squirrel, doorbell, vacuum...' },
    },
    {
      id: 108,
      icon: '🧓',
      title: { de: 'Satz, den Eltern immer sagen', en: 'Phrase Parents Always Say' },
      hint: { de: 'Räum dein Zimmer auf, zieh ne Jacke an...', en: 'Clean your room, wear a jacket, we have food at home...' },
    },
    {
      id: 109,
      icon: '⚡',
      title: { de: 'Was im ungünstigsten Moment kaputtgeht', en: 'Breaks at the Worst Possible Moment' },
      hint: { de: 'Reißverschluss, Regenschirm, WLAN, Auto...', en: 'Zipper, umbrella, Wi-Fi, car battery...' },
    },
    {
      id: 110,
      icon: '🏆',
      title: { de: 'Wofür man eine Medaille verdienen sollte', en: 'Everyday Feat Deserving a Medal' },
      hint: { de: 'Montags aufstehen, Spannbettlaken falten...', en: 'Waking up on Monday, folding a fitted sheet...' },
    },
  ];

  // Standard playable letters (excluding Q, X, Y for smoother party play, and friendly ending letters for Buchstabendreher)
  private readonly standardLetters = [
    'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L',
    'M', 'N', 'O', 'P', 'R', 'S', 'T', 'U', 'V', 'W', 'Z',
  ];
  private readonly endingLetters = ['E', 'N', 'R', 'T', 'S', 'L', 'D', 'M', 'G', 'K', 'A', 'O'];

  drawDeck: VollpfostenCard[] = [];
  letterPot: VollpfostenCard[] = [];

  roundNumber = 1;
  lastWinnerId: number | null = null;
  gameEnded = false;
  cardFlipping = false;

  timeLeft = 30;
  timerPaused = false;
  private timerIntervalId: ReturnType<typeof setInterval> | null = null;

  spokenWordInput = '';
  history: RoundHistoryEntry[] = [];
  lastUndoSnapshot: UndoSnapshot | null = null;

  statusBanner: { icon: string; text: string; type: 'info' | 'warning' | 'special' } | null = null;
  private bannerTimeoutId: ReturnType<typeof setTimeout> | null = null;

  private audioCtx: AudioContext | null = null;

  constructor() {
    this.startNewGame();
    effect(() => {
      this.lang = this.languageService.currentLang();
      this.cdr.markForCheck();
    });
  }

  ngOnDestroy(): void {
    this.clearTimer();
    if (this.bannerTimeoutId) {
      clearTimeout(this.bannerTimeoutId);
    }
  }

  /**
   * Keyboard shortcuts:
   * - Keys 1..8 claim the current pot for Player 1..8 (when not typing in an input)
   * - Spacebar triggers "Keiner weiß was" (when not typing in an input)
   */
  @HostListener('window:keydown', ['$event'])
  handleKeydown(event: KeyboardEvent): void {
    const target = event.target as HTMLElement | null;
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
      return;
    }

    if (this.gameEnded) {
      return;
    }

    // Keys 1..8 -> Claim for player
    if (event.key >= '1' && event.key <= '8') {
      const idx = parseInt(event.key, 10) - 1;
      if (idx >= 0 && idx < this.players.length) {
        const player = this.players[idx];
        if (!this.isPlayerMutedByAussetzer(player)) {
          event.preventDefault();
          this.claimCardForPlayer(player);
        } else {
          this.playBuzzerSound();
        }
      }
      return;
    }

    // Spacebar -> "Keiner weiß was"
    if (event.code === 'Space') {
      event.preventDefault();
      this.triggerNobodyKnows(false);
    }
  }

  get currentCategoryCard(): VollpfostenCard | null {
    return this.drawDeck.length > 0 ? this.drawDeck[0] : null;
  }

  get currentLetterCard(): VollpfostenCard | null {
    return this.letterPot.length > 0 ? this.letterPot[this.letterPot.length - 1] : null;
  }

  get lastWinnerPlayer(): Player | null {
    if (this.lastWinnerId === null) {
      return null;
    }
    return this.players.find((p) => p.id === this.lastWinnerId) ?? null;
  }

  get sortedPlayers(): Player[] {
    return [...this.players].sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      return b.biggestPotWon - a.biggestPotWon;
    });
  }

  t(de: string, en: string): string {
    return this.lang === 'de' ? de : en;
  }

  setLanguage(newLang: Language): void {
    this.languageService.setLanguage(newLang);
    this.lang = newLang;
    // Update default player names if untouched
    this.players.forEach((p, idx) => {
      if (p.name === `Spieler ${idx + 1}` && newLang === 'en') {
        p.name = `Player ${idx + 1}`;
      } else if (p.name === `Player ${idx + 1}` && newLang === 'de') {
        p.name = `Spieler ${idx + 1}`;
      }
    });
  }

  toggleRulesPanel(): void {
    this.showRulesPanel = !this.showRulesPanel;
    if (this.showRulesPanel) {
      this.showSettingsPanel = false;
    }
  }

  toggleSettingsPanel(): void {
    this.showSettingsPanel = !this.showSettingsPanel;
    if (this.showSettingsPanel) {
      this.showRulesPanel = false;
    }
  }

  setTimerDuration(seconds: number): void {
    this.timerDuration = seconds;
    this.resetRoundTimer();
  }

  persistPlayers(): void {
    savePlayerNames(this.players.map((p) => p.name));
  }

  addPlayer(): void {
    if (this.players.length >= 8) {
      return;
    }
    const nextIdx = this.players.length;
    const style = this.playerPalette[nextIdx % this.playerPalette.length];
    this.players.push({
      id: Date.now() + nextIdx,
      name: this.lang === 'de' ? `Spieler ${nextIdx + 1}` : `Player ${nextIdx + 1}`,
      color: style.color,
      avatar: style.avatar,
      score: 0,
      biggestPotWon: 0,
      streak: 0,
    });
    this.persistPlayers();
  }

  removePlayer(index: number): void {
    if (this.players.length <= 2) {
      return;
    }
    const removed = this.players[index];
    this.players.splice(index, 1);
    if (this.lastWinnerId === removed.id) {
      this.lastWinnerId = null;
    }
    this.persistPlayers();
  }

  startNewGame(): void {
    // Reset player scores
    this.players.forEach((p) => {
      p.score = 0;
      p.biggestPotWon = 0;
      p.streak = 0;
    });

    this.roundNumber = 1;
    this.lastWinnerId = null;
    this.gameEnded = false;
    this.spokenWordInput = '';
    this.history = [];
    this.lastUndoSnapshot = null;

    // Build shuffled deck
    const shuffledCategories = this.shuffleArray([...this.allCategories]).slice(
      0,
      Math.max(10, Math.min(this.configuredDeckSize, this.allCategories.length))
    );

    const builtCards: VollpfostenCard[] = shuffledCategories.map((cat, idx) => {
      let specialEffect: SpecialEffectType = 'NONE';

      // Assign Special Effects to ~32% of cards after the very first starter card
      if (this.includeSpecialCards && idx > 0) {
        const roll = Math.random();
        if (roll < 0.12) {
          specialEffect = 'BUCHSTABENDREHER';
        } else if (roll < 0.23) {
          specialEffect = 'DOPPELPACK';
        } else if (roll < 0.34) {
          specialEffect = 'AUSSETZER';
        }
      }

      const letterPool =
        specialEffect === 'BUCHSTABENDREHER' ? this.endingLetters : this.standardLetters;
      const randomLetter = letterPool[Math.floor(Math.random() * letterPool.length)];

      return {
        id: idx + 1,
        category: cat,
        letter: randomLetter,
        specialEffect,
      };
    });

    // Flip the first card onto the letter pile, rest form the draw deck
    const firstLetterCard = builtCards.shift()!;
    firstLetterCard.specialEffect = 'NONE'; // First card starts clean with no lastWinner needed
    this.letterPot = [firstLetterCard];
    this.drawDeck = builtCards;

    this.triggerFlipAnimation();
    this.startRoundTimer();
    this.showBanner(
      '🎴',
      this.t(
        'Neues Spiel gestartet! Wer ruft zuerst einen passenden Begriff?',
        'New game started! Who shouts a matching word first?'
      ),
      'info'
    );
  }

  /**
   * Awards all cards currently in the letterPot to the claiming player
   * and flips the active category card onto the letter pile!
   */
  claimCardForPlayer(player: Player): void {
    if (this.gameEnded || !this.currentCategoryCard || !this.currentLetterCard) {
      return;
    }

    if (this.isPlayerMutedByAussetzer(player)) {
      this.playBuzzerSound();
      this.showBanner(
        '🤐',
        this.t(
          `${player.name} hat diese Runde AUSSETZER und muss den Mund halten!`,
          `${player.name} sits out this round and must keep quiet!`
        ),
        'warning'
      );
      return;
    }

    this.saveUndoSnapshot();

    const wonCount = this.letterPot.length;
    const activeCat = this.currentCategoryCard.category.title;
    const activeLetter = this.currentLetterCard.letter;
    const activeSpecial = this.currentLetterCard.specialEffect;

    // Award points
    player.score += wonCount;
    if (wonCount > player.biggestPotWon) {
      player.biggestPotWon = wonCount;
    }
    this.players.forEach((p) => {
      p.streak = p.id === player.id ? p.streak + 1 : 0;
    });

    // Record history entry
    this.history.unshift({
      roundNumber: this.roundNumber,
      winnerName: player.name,
      winnerColor: player.color,
      winnerAvatar: player.avatar,
      category: activeCat,
      letter: activeLetter,
      specialEffect: activeSpecial,
      cardsWon: wonCount,
      spokenWord: this.spokenWordInput.trim(),
    });

    this.spokenWordInput = '';
    this.lastWinnerId = player.id;
    this.playWinSound(wonCount > 1);

    // Move top category card from drawDeck to start a fresh letterPot of size 1
    const flippedCard = this.drawDeck.shift()!;
    this.letterPot = [flippedCard];
    this.roundNumber++;

    if (this.drawDeck.length === 0) {
      // Deck is now exhausted!
      this.gameEnded = true;
      this.clearTimer();
      this.showBanner(
        '🏆',
        this.t(
          `${player.name} holt die letzte Karte (+${wonCount})! Das Spiel ist beendet!`,
          `${player.name} claims the final card (+${wonCount})! Game Over!`
        ),
        'special'
      );
      return;
    }

    this.triggerFlipAnimation();
    this.resetRoundTimer();

    const nextSpecial = this.currentLetterCard?.specialEffect ?? 'NONE';
    if (nextSpecial !== 'NONE') {
      this.showBanner(
        this.getSpecialIcon(nextSpecial),
        `${player.name} +${wonCount}! ⚡ ${this.getSpecialTitle(nextSpecial)}: ${this.getSpecialDescription(
          nextSpecial,
          this.currentLetterCard!.letter
        )}`,
        'special'
      );
    } else {
      this.showBanner(
        '⚡',
        this.t(
          `${player.name} gewinnt ${wonCount === 1 ? '1 Karte' : wonCount + ' Jackpot-Karten'}! Nächste Karte aufgedeckt.`,
          `${player.name} wins ${wonCount === 1 ? '1 card' : wonCount + ' Jackpot cards'}! Next card flipped.`
        ),
        'info'
      );
    }
  }

  /**
   * "Keiner weiß was" (Nobody Knows):
   * Triggered after 30 seconds or manually via button/Spacebar.
   * The current Category card is flipped on top of the Letter Pot (so Pot increases by +1!).
   * The next winner gets ALL stacked cards in the pot!
   */
  triggerNobodyKnows(fromTimeout: boolean): void {
    if (this.gameEnded || !this.currentCategoryCard || !this.currentLetterCard) {
      return;
    }

    this.saveUndoSnapshot();

    this.history.unshift({
      roundNumber: this.roundNumber,
      winnerName: '',
      winnerColor: '#f59e0b',
      winnerAvatar: '🤷',
      category: this.currentCategoryCard.category.title,
      letter: this.currentLetterCard.letter,
      specialEffect: this.currentLetterCard.specialEffect,
      cardsWon: 0,
      spokenWord: '',
      wasTimeoutSkip: true,
    });

    const flippedCard = this.drawDeck.shift()!;
    this.letterPot.push(flippedCard);
    this.roundNumber++;
    this.playStackSound();

    if (this.drawDeck.length === 0) {
      // No more category cards left in the deck
      this.gameEnded = true;
      this.clearTimer();
      this.showBanner(
        '🏁',
        this.t(
          'Keine Karten mehr im Nachziehstapel – Spielende!',
          'No more cards in the draw deck – Game Over!'
        ),
        'warning'
      );
      return;
    }

    this.triggerFlipAnimation();
    this.resetRoundTimer();

    const potCount = this.letterPot.length;
    this.showBanner(
      '🤷',
      fromTimeout
        ? this.t(
            `30s abgelaufen! „Keiner weiß was“ – Karte darübergelegt! Jackpot liegt jetzt bei ${potCount} Karten!`,
            `30s expired! "Nobody Knows" – Card stacked on top! Jackpot is now ${potCount} cards!`
          )
        : this.t(
            `„Keiner weiß was“! Karte darübergelegt – es liegen jetzt ${potCount} Karten im Jackpot-Pot!`,
            `"Nobody Knows"! Card stacked on top – there are now ${potCount} cards in the Jackpot pot!`
          ),
      'warning'
    );
  }

  undoLastAction(): void {
    if (!this.lastUndoSnapshot) {
      return;
    }
    const snap = this.lastUndoSnapshot;
    this.drawDeck = snap.drawDeck.map((c) => ({ ...c }));
    this.letterPot = snap.letterPot.map((c) => ({ ...c }));
    this.players = snap.players.map((p) => ({ ...p }));
    this.lastWinnerId = snap.lastWinnerId;
    this.roundNumber = snap.roundNumber;
    this.history = snap.history.map((h) => ({ ...h }));
    this.gameEnded = snap.gameEnded;
    this.lastUndoSnapshot = null;

    this.resetRoundTimer();
    this.showBanner(
      '↩️',
      this.t('Letzte Aktion wurde rückgängig gemacht.', 'Last action was undone.'),
      'info'
    );
  }

  isPlayerMutedByAussetzer(player: Player): boolean {
    if (!this.currentLetterCard || this.currentLetterCard.specialEffect !== 'AUSSETZER') {
      return false;
    }
    return this.lastWinnerId !== null && player.id === this.lastWinnerId;
  }

  isLeadingPlayer(player: Player): boolean {
    if (player.score === 0) {
      return false;
    }
    const maxScore = Math.max(...this.players.map((p) => p.score));
    return player.score === maxScore;
  }

  getSpecialIcon(effect: SpecialEffectType): string {
    switch (effect) {
      case 'BUCHSTABENDREHER':
        return '🔄';
      case 'DOPPELPACK':
        return '✌️';
      case 'AUSSETZER':
        return '🤐';
      case 'JACKPOT_BOOST':
        return '⏳';
      default:
        return '🎯';
    }
  }

  getSpecialTitle(effect: SpecialEffectType): string {
    switch (effect) {
      case 'BUCHSTABENDREHER':
        return this.t('Buchstabendreher', 'Letter Twister');
      case 'DOPPELPACK':
        return this.t('Doppelpack', 'Double Trouble');
      case 'AUSSETZER':
        return this.t('Aussetzer', 'Sit Out (Mute Winner)');
      default:
        return this.t('Standard-Regel', 'Standard Rule');
    }
  }

  getSpecialShortRule(effect: SpecialEffectType, letter: string): string {
    switch (effect) {
      case 'BUCHSTABENDREHER':
        return this.t(
          `Wort muss mit „${letter}“ ENDEN!`,
          `Word must END with "${letter}"!`
        );
      case 'DOPPELPACK':
        return this.t(
          `Nenne ZWEI Begriffe mit „${letter}“!`,
          `Name TWO words starting with "${letter}"!`
        );
      case 'AUSSETZER':
        return this.lastWinnerPlayer
          ? this.t(
              `${this.lastWinnerPlayer.name} muss den Mund halten!`,
              `${this.lastWinnerPlayer.name} must keep quiet!`
            )
          : this.t(
              `Vorheriger Gewinner setzt aus! (Noch keiner)`,
              `Previous winner sits out!`
            );
      default:
        return this.t(
          `Wort beginnt mit „${letter}“`,
          `Word starts with "${letter}"`
        );
    }
  }

  getSpecialDescription(effect: SpecialEffectType, letter: string): string {
    switch (effect) {
      case 'BUCHSTABENDREHER':
        return this.t(
          `Achtung Richtungswechsel! Das gerufene Wort muss mit dem Buchstaben „${letter}“ ENDEN (nicht beginnen)!`,
          `Plot twist! The spoken word must END with the letter "${letter}" instead of starting with it!`
        );
      case 'DOPPELPACK':
        return this.t(
          `Doppelt hält besser! Du musst ZWEI passende Begriffe nennen, die mit „${letter}“ beginnen!`,
          `Double Trouble! You must shout TWO valid words starting with "${letter}"!`
        );
      case 'AUSSETZER':
        return this.lastWinnerPlayer
          ? this.t(
              `Mund halten! ${this.lastWinnerPlayer.name} hat die letzte Karte gewonnen und muss diese Runde aussetzen!`,
              `Keep quiet! ${this.lastWinnerPlayer.name} won the last round and must sit out this card!`
            )
          : this.t(
              `Der Gewinner der vorherigen Runde muss bei dieser Karte aussetzen!`,
              `The winner of the previous round must sit out for this card!`
            );
      default:
        return '';
    }
  }

  getWinnerHeadline(): string {
    const top = this.sortedPlayers[0];
    if (!top) {
      return '';
    }
    const tiedWinners = this.sortedPlayers.filter((p) => p.score === top.score);
    if (tiedWinners.length > 1) {
      const names = tiedWinners.map((p) => p.name).join(' & ');
      return this.t(
        `Unentschieden an der Spitze: ${names} (${top.score} Karten)!`,
        `Tie at the top: ${names} (${top.score} cards)!`
      );
    }
    return this.t(
      `${top.avatar} ${top.name} gewinnt mit ${top.score} Karten!`,
      `${top.avatar} ${top.name} wins with ${top.score} cards!`
    );
  }

  // TIMER MANAGEMENT
  startRoundTimer(): void {
    this.clearTimer();
    this.timeLeft = this.timerDuration;
    this.timerPaused = false;

    this.timerIntervalId = setInterval(() => {
      if (this.timerPaused || this.gameEnded) {
        return;
      }

      if (this.timeLeft > 0) {
        this.timeLeft--;
        if (this.timeLeft > 0 && this.timeLeft <= 5) {
          this.playTickSound();
        }
      }

      if (this.timeLeft <= 0) {
        if (this.autoStackOnTimeout) {
          this.triggerNobodyKnows(true);
        } else {
          this.timerPaused = true;
          this.playBuzzerSound();
          this.showBanner(
            '⏳',
            this.t(
              'Zeit abgelaufen! Klicke auf „Keiner weiß was“, um eine neue Karte darüberzulegen.',
              'Time is up! Click "Nobody Knows" to stack the next card on top.'
            ),
            'warning'
          );
        }
      }
      this.cdr.markForCheck();
    }, 1000);
  }

  resetRoundTimer(): void {
    this.startRoundTimer();
  }

  toggleTimerPause(): void {
    this.timerPaused = !this.timerPaused;
  }

  private clearTimer(): void {
    if (this.timerIntervalId) {
      clearInterval(this.timerIntervalId);
      this.timerIntervalId = null;
    }
  }

  private saveUndoSnapshot(): void {
    this.lastUndoSnapshot = {
      drawDeck: this.drawDeck.map((c) => ({ ...c })),
      letterPot: this.letterPot.map((c) => ({ ...c })),
      players: this.players.map((p) => ({ ...p })),
      lastWinnerId: this.lastWinnerId,
      roundNumber: this.roundNumber,
      history: this.history.map((h) => ({ ...h })),
      gameEnded: this.gameEnded,
    };
  }

  private triggerFlipAnimation(): void {
    this.cardFlipping = false;
    setTimeout(() => {
      this.cardFlipping = true;
      this.cdr.markForCheck();
    }, 10);
    setTimeout(() => {
      this.cardFlipping = false;
      this.cdr.markForCheck();
    }, 380);
  }

  private showBanner(icon: string, text: string, type: 'info' | 'warning' | 'special'): void {
    this.statusBanner = { icon, text, type };
    if (this.bannerTimeoutId) {
      clearTimeout(this.bannerTimeoutId);
    }
    this.bannerTimeoutId = setTimeout(() => {
      this.statusBanner = null;
      this.cdr.markForCheck();
    }, 5200);
  }

  private shuffleArray<T>(arr: T[]): T[] {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  // WEB AUDIO API SOUND SYNTHESIS
  private getAudioContext(): AudioContext | null {
    if (!this.soundEnabled || typeof window === 'undefined') {
      return null;
    }
    if (!this.audioCtx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.audioCtx = new AudioCtx();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }
    return this.audioCtx;
  }

  private playWinSound(isJackpot: boolean): void {
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const notes = isJackpot ? [523.25, 659.25, 783.99, 1046.5] : [587.33, 880];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.075);

      gain.gain.setValueAtTime(0.14, ctx.currentTime + idx * 0.075);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.075 + 0.22);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + idx * 0.075);
      osc.stop(ctx.currentTime + idx * 0.075 + 0.23);
    });
  }

  private playStackSound(): void {
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(340, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(210, ctx.currentTime + 0.18);

    gain.gain.setValueAtTime(0.14, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.21);
  }

  private playTickSound(): void {
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(820, ctx.currentTime);

    gain.gain.setValueAtTime(0.06, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.065);
  }

  private playBuzzerSound(): void {
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(155, ctx.currentTime);

    gain.gain.setValueAtTime(0.11, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.26);
  }
}
