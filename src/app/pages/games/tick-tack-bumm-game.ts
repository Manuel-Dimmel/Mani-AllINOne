import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, HostListener, OnDestroy, effect, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { loadSavedPlayerNames, savePlayerNames } from '../../services/player-storage';
import { LanguageService } from '../../services/language.service';

type Lang = 'de' | 'en';
type DieMode = 'CATEGORY' | 'TICK' | 'TACK' | 'BOMBE';
type BombState = 'IDLE' | 'TICKING' | 'EXPLODED' | 'GAME_OVER';
type TimerPreset = 'CLASSIC' | 'FAST';
type DeckFilter = 'ALL' | 'SYLLABLES' | 'CATEGORIES';

interface BummCard {
  id: number;
  mode: DieMode;
  de: string;
  en: string;
  hintDe: string;
  hintEn: string;
  examplesDe: string[];
  examplesEn: string[];
}

interface Player {
  id: number;
  name: string;
  avatar: string;
  penalties: number;
  wonCards: BummCard[];
}

interface SpokenWordEntry {
  word: string;
  playerName: string;
  playerAvatar: string;
  timestamp: string;
}

@Component({
  selector: 'app-tick-tack-bumm-game',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="ttb-shell" [class.screen-shake]="bombState === 'EXPLODED' && shakeActive">
      <!-- Ambient Background Glows -->
      <div class="ambient-orb orb-red" [class.orb-active]="bombState === 'TICKING'"></div>
      <div class="ambient-orb orb-amber" [class.orb-exploded]="bombState === 'EXPLODED'"></div>

      <!-- Top Navigation Bar -->
      <header class="ttb-topbar glass-panel">
        <div class="topbar-left">
          <a routerLink="/" class="btn-secondary back-btn">
            <span>←</span>
            <span>{{ lang === 'de' ? 'Zurück zur Lobby' : 'Back to Lobby' }}</span>
          </a>
          <div class="title-group">
            <span class="game-badge">💣 PARTY EDITION</span>
            <h1>Tick Tack Bumm</h1>
          </div>
        </div>

        <div class="topbar-center">
          <div class="progress-pill">
            <span class="pill-label">{{ lang === 'de' ? 'Kartenstapel' : 'Card Deck' }}</span>
            <strong class="pill-value">{{ currentCardNumber }} / {{ maxCards }}</strong>
            <div class="mini-progress-bar">
              <div
                class="mini-progress-fill"
                [style.width.%]="(currentCardNumber / maxCards) * 100"
              ></div>
            </div>
          </div>
        </div>

        <div class="topbar-actions">
          <!-- Language Toggle -->
          <div class="lang-switch" role="group" aria-label="Language Switcher">
            <button
              type="button"
              class="lang-btn"
              [class.active]="lang === 'de'"
              (click)="setLang('de')"
            >
              🇩🇪 DE
            </button>
            <button
              type="button"
              class="lang-btn"
              [class.active]="lang === 'en'"
              (click)="setLang('en')"
            >
              🇬🇧 EN
            </button>
          </div>

          <!-- Audio Toggle -->
          <button
            type="button"
            class="btn-secondary icon-btn"
            (click)="toggleSound()"
            [title]="
              soundEnabled
                ? lang === 'de'
                  ? 'Ton ausschalten'
                  : 'Mute sound'
                : lang === 'de'
                  ? 'Ton einschalten'
                  : 'Unmute sound'
            "
          >
            {{ soundEnabled ? '🔊' : '🔇' }}
          </button>

          <!-- Rules Toggle -->
          <button
            type="button"
            class="btn-secondary"
            [class.panel-open-btn]="showRules"
            (click)="showRules = !showRules"
          >
            📖 {{ lang === 'de' ? 'Spielregeln' : 'Rules' }}
          </button>

          <!-- Settings Toggle -->
          <button
            type="button"
            class="btn-secondary"
            [class.panel-open-btn]="showSettings"
            (click)="showSettings = !showSettings"
          >
            ⚙️ {{ lang === 'de' ? 'Einstellungen & Spieler' : 'Settings & Players' }}
          </button>
        </div>
      </header>

      <!-- Collapsible Rules Panel -->
      <section *ngIf="showRules" class="collapsible-drawer glass-panel animate-slide-down">
        <div class="drawer-header">
          <div>
            <span class="drawer-kicker">📖 {{ lang === 'de' ? 'OFFIZIELLE SPIELANLEITUNG' : 'OFFICIAL GAME RULES' }}</span>
            <h2>
              {{
                lang === 'de'
                  ? 'Tick Tack Bumm – Wer behält die Nerven?'
                  : 'Tick Tack Bumm – Keep Your Cool Before It Booms!'
              }}
            </h2>
          </div>
          <button type="button" class="btn-secondary close-btn" (click)="showRules = false">✕</button>
        </div>

        <div class="rules-grid">
          <div class="rule-card">
            <div class="rule-num">1</div>
            <h3>{{ lang === 'de' ? 'Würfeln & Karte aufdecken' : 'Roll Die & Reveal Card' }}</h3>
            <p>
              {{
                lang === 'de'
                  ? 'Zu Beginn jeder Runde gibt der Spezialwürfel den Modus vor (Kategorie, TICK, TACK oder BOMBE) und eine neue Karte wird gezogen.'
                  : 'At the start of each round, the Special Die sets the mode (Category, TICK, TACK, or BOMB) and a new card is revealed.'
              }}
            </p>
          </div>

          <div class="rule-card">
            <div class="rule-num">2</div>
            <h3>{{ lang === 'de' ? 'Unberechenbare Bombe (10–60s)' : 'Unpredictable Bomb (10–60s)' }}</h3>
            <p>
              {{
                lang === 'de'
                  ? 'Starte die rote Bombe! Niemand weiß, wann sie explodiert – der geheime Zufalls-Timer tickt zwischen 10 und 60 Sekunden.'
                  : 'Start the red bomb! Nobody knows when it will explode — the secret random timer ticks anywhere between 10 and 60 seconds.'
              }}
            </p>
          </div>

          <div class="rule-card">
            <div class="rule-num">3</div>
            <h3>{{ lang === 'de' ? 'Wort rufen & Weitergeben' : 'Shout a Word & Pass On' }}</h3>
            <p>
              {{
                lang === 'de'
                  ? 'Der aktive Spieler nennt schnell ein passendes Wort (keine Dopplungen in derselben Runde!) und gibt die Bombe im Uhrzeigersinn weiter.'
                  : 'The active player quickly names a valid word (no duplicates in the same round!) and passes the bomb clockwise.'
              }}
            </p>
          </div>

          <div class="rule-card">
            <div class="rule-num">4</div>
            <h3>{{ lang === 'de' ? 'BOOOOM! & Spielende (13 Karten)' : 'BOOOOM! & Game End (13 Cards)' }}</h3>
            <p>
              {{
                lang === 'de'
                  ? 'Bei wem die Bombe explodiert, kassiert die Karte als Strafpunkt! Nach 13 Karten gewinnt, wer die WENIGSTEN Strafkarten hat.'
                  : 'Whoever holds the bomb when it explodes takes the card as a penalty point! After 13 cards, the player with the FEWEST penalty cards wins.'
              }}
            </p>
          </div>
        </div>

        <div class="die-modes-legend">
          <div class="legend-item">
            <span class="legend-icon">🎯</span>
            <div>
              <strong>{{ lang === 'de' ? 'Klassische Kategorie' : 'Classic Category' }}</strong>
              <span>{{ lang === 'de' ? 'Nenne einen Begriff passend zum Thema (z.B. „Auf dem Bauernhof“).' : 'Name a term matching the category (e.g. "On the Farm").' }}</span>
            </div>
          </div>
          <div class="legend-item">
            <span class="legend-icon">🔤</span>
            <div>
              <strong>{{ lang === 'de' ? 'TICK (Wortanfang)' : 'TICK (Start of Word)' }}</strong>
              <span>{{ lang === 'de' ? 'Die Silbe muss ganz am Anfang stehen (z.B. SCHUL... → Schultasche).' : 'The syllable must be at the very beginning (e.g. RE... → Replay).' }}</span>
            </div>
          </div>
          <div class="legend-item">
            <span class="legend-icon">🔚</span>
            <div>
              <strong>{{ lang === 'de' ? 'TACK (Wortende)' : 'TACK (End of Word)' }}</strong>
              <span>{{ lang === 'de' ? 'Die Silbe muss ganz am Ende stehen (z.B. ...UNG → Zeitung).' : 'The syllable must be at the very end (e.g. ...ING → Running).' }}</span>
            </div>
          </div>
          <div class="legend-item">
            <span class="legend-icon">💣</span>
            <div>
              <strong>{{ lang === 'de' ? 'BOMBE (Überall im Wort)' : 'BOMB (Anywhere in Word)' }}</strong>
              <span>{{ lang === 'de' ? 'Die Silbe darf am Anfang, in der Mitte oder am Ende stehen!' : 'The syllable can appear at the start, middle, or end of the word!' }}</span>
            </div>
          </div>
        </div>
      </section>

      <!-- Collapsible Settings & Players Panel -->
      <section *ngIf="showSettings" class="collapsible-drawer glass-panel animate-slide-down">
        <div class="drawer-header">
          <div>
            <span class="drawer-kicker">⚙️ {{ lang === 'de' ? 'KONFIGURATION & SPIELER' : 'SETUP & PLAYERS' }}</span>
            <h2>{{ lang === 'de' ? 'Spieleinstellungen & Runde anpassen' : 'Customize Match & Players' }}</h2>
          </div>
          <button type="button" class="btn-secondary close-btn" (click)="showSettings = false">✕</button>
        </div>

        <div class="settings-columns">
          <!-- Left column: Match options -->
          <div class="settings-box">
            <h3>{{ lang === 'de' ? 'Bomben- & Runden-Optionen' : 'Bomb & Round Options' }}</h3>

            <div class="setting-row">
              <label>{{ lang === 'de' ? 'Sprache / Language' : 'Language / Sprache' }}</label>
              <div class="segmented-control">
                <button type="button" [class.active]="lang === 'de'" (click)="setLang('de')">🇩🇪 Deutsch</button>
                <button type="button" [class.active]="lang === 'en'" (click)="setLang('en')">🇬🇧 English</button>
              </div>
            </div>

            <div class="setting-row">
              <label>{{ lang === 'de' ? 'Geheimer Bomben-Timer' : 'Secret Bomb Timer' }}</label>
              <div class="segmented-control">
                <button
                  type="button"
                  [class.active]="timerPreset === 'CLASSIC'"
                  (click)="timerPreset = 'CLASSIC'"
                  [disabled]="bombState === 'TICKING'"
                >
                  💣 {{ lang === 'de' ? 'Klassisch (10–60s)' : 'Classic (10–60s)' }}
                </button>
                <button
                  type="button"
                  [class.active]="timerPreset === 'FAST'"
                  (click)="timerPreset = 'FAST'"
                  [disabled]="bombState === 'TICKING'"
                >
                  ⚡ {{ lang === 'de' ? 'Action (10–35s)' : 'Fast (10–35s)' }}
                </button>
              </div>
            </div>

            <div class="setting-row">
              <label>{{ lang === 'de' ? 'Spiellänge (Kartenstapel)' : 'Match Length (Card Deck)' }}</label>
              <div class="segmented-control">
                <button
                  type="button"
                  [class.active]="maxCards === 13"
                  (click)="setMaxCards(13)"
                  [disabled]="bombState === 'TICKING'"
                >
                  13 {{ lang === 'de' ? 'Karten (Original)' : 'Cards (Official)' }}
                </button>
                <button
                  type="button"
                  [class.active]="maxCards === 7"
                  (click)="setMaxCards(7)"
                  [disabled]="bombState === 'TICKING'"
                >
                  7 {{ lang === 'de' ? 'Karten (Kurzrunde)' : 'Cards (Quick Game)' }}
                </button>
              </div>
            </div>

            <div class="setting-row">
              <label>{{ lang === 'de' ? 'Karten-Set Auswahl' : 'Card Deck Filter' }}</label>
              <div class="segmented-control">
                <button
                  type="button"
                  [class.active]="deckFilter === 'ALL'"
                  (click)="setDeckFilter('ALL')"
                  [disabled]="bombState === 'TICKING'"
                >
                  🎲 {{ lang === 'de' ? 'Party-Mix (Alle)' : 'Party Mix (All)' }}
                </button>
                <button
                  type="button"
                  [class.active]="deckFilter === 'SYLLABLES'"
                  (click)="setDeckFilter('SYLLABLES')"
                  [disabled]="bombState === 'TICKING'"
                >
                  🔤 {{ lang === 'de' ? 'Nur Silben' : 'Syllables Only' }}
                </button>
                <button
                  type="button"
                  [class.active]="deckFilter === 'CATEGORIES'"
                  (click)="setDeckFilter('CATEGORIES')"
                  [disabled]="bombState === 'TICKING'"
                >
                  🎯 {{ lang === 'de' ? 'Nur Kategorien' : 'Categories Only' }}
                </button>
              </div>
            </div>

            <div class="setting-actions">
              <button type="button" class="btn-secondary" (click)="resetMatch()">
                🔄 {{ lang === 'de' ? 'Komplettes Spiel zurücksetzen' : 'Reset Entire Match' }}
              </button>
            </div>
          </div>

          <!-- Right column: Players (2-8) -->
          <div class="settings-box">
            <div class="players-header-row">
              <h3>{{ lang === 'de' ? 'Spieler im Uhrzeigersinn (2–8)' : 'Players Clockwise (2–8)' }}</h3>
              <span class="player-count-badge">{{ players.length }} / 8</span>
            </div>

            <div class="add-player-bar">
              <input
                type="text"
                class="ttb-input"
                [(ngModel)]="newPlayerName"
                (keydown.enter)="addPlayer()"
                [placeholder]="lang === 'de' ? 'Neuer Spielername...' : 'New player name...'"
                maxlength="18"
              />
              <button
                type="button"
                class="btn-primary"
                (click)="addPlayer()"
                [disabled]="players.length >= 8 || !newPlayerName.trim()"
              >
                + {{ lang === 'de' ? 'Hinzufügen' : 'Add' }}
              </button>
            </div>

            <div class="settings-player-list">
              <div *ngFor="let p of players; let idx = index" class="settings-player-item">
                <span class="player-idx">#{{ idx + 1 }}</span>
                <span class="player-avatar">{{ p.avatar }}</span>
                <input
                  type="text"
                  class="player-name-edit"
                  [(ngModel)]="p.name"
                  (ngModelChange)="persistPlayers()"
                  maxlength="18"
                />
                <span class="penalty-pill">{{ p.penalties }} 🔥</span>
                <button
                  type="button"
                  class="remove-player-btn"
                  (click)="removePlayer(idx)"
                  [disabled]="players.length <= 2 || bombState === 'TICKING'"
                  [title]="lang === 'de' ? 'Spieler entfernen' : 'Remove player'"
                >
                  ✕
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Main Game Layout -->
      <main class="ttb-main-grid">
        <!-- LEFT COLUMN: Special Die & Active Card -->
        <section class="card-and-die-column">
          <!-- Party Edition Special Die Card -->
          <div class="special-die-panel glass-panel">
            <div class="panel-header-row">
              <span class="panel-kicker">🎲 {{ lang === 'de' ? 'SPEZIALWÜRFEL' : 'SPECIAL DIE' }}</span>
              <button
                type="button"
                class="btn-secondary btn-sm"
                (click)="rollDieAndDrawCard()"
                [disabled]="bombState === 'TICKING'"
              >
                🎲 {{ lang === 'de' ? 'Neu würfeln & Karte ziehen' : 'Roll Die & New Card' }}
              </button>
            </div>

            <div class="die-stage" [class.die-rolling]="isRollingDie">
              <div class="die-cube" [attr.data-mode]="currentCard.mode">
                <span class="die-face-icon">{{ getModeIcon(currentCard.mode) }}</span>
                <span class="die-face-label">{{ getModeShortTitle(currentCard.mode) }}</span>
              </div>
              <div class="die-description">
                <h3>{{ getModeFullTitle(currentCard.mode) }}</h3>
                <p>{{ getModeRuleText(currentCard.mode) }}</p>
              </div>
            </div>
          </div>

          <!-- Active Category / Syllable Card -->
          <div
            class="active-bumm-card glass-panel"
            [attr.data-mode]="currentCard.mode"
            [class.card-ticking]="bombState === 'TICKING'"
            [class.card-exploded]="bombState === 'EXPLODED'"
          >
            <div class="card-top-meta">
              <span class="card-mode-tag">{{ getModeBadgeText(currentCard.mode) }}</span>
              <span class="card-counter">
                {{ lang === 'de' ? 'Karte' : 'Card' }} {{ currentCardNumber }} / {{ maxCards }}
              </span>
            </div>

            <div class="card-Prompt-box">
              <div class="syllable-or-topic">
                {{ lang === 'de' ? currentCard.de : currentCard.en }}
              </div>
              <p class="card-hint">
                {{ lang === 'de' ? currentCard.hintDe : currentCard.hintEn }}
              </p>
            </div>

            <!-- Examples / Inspiration (Blurred while ticking unless toggled) -->
            <div class="card-examples-section">
              <div class="examples-header">
                <span>💡 {{ lang === 'de' ? 'Beispiel-Ideen' : 'Example Ideas' }}</span>
                <button
                  type="button"
                  class="peek-btn"
                  (click)="showExamples = !showExamples"
                >
                  {{
                    showExamples
                      ? lang === 'de'
                        ? '🙈 Ausblenden'
                        : '🙈 Hide'
                      : lang === 'de'
                        ? '👀 Spicken'
                        : '👀 Peek'
                  }}
                </button>
              </div>
              <div class="examples-chips" [class.blurred]="bombState === 'TICKING' && !showExamples">
                <span
                  *ngFor="let ex of lang === 'de' ? currentCard.examplesDe : currentCard.examplesEn"
                  class="example-chip"
                >
                  {{ ex }}
                </span>
              </div>
            </div>
          </div>

          <!-- Spoken Words Log (No Duplicates Check) -->
          <div class="spoken-words-panel glass-panel">
            <div class="panel-header-row">
              <span class="panel-kicker">
                🗣️ {{ lang === 'de' ? 'GENANNTE WÖRTER DIESER RUNDE' : 'WORDS SPOKEN THIS ROUND' }}
              </span>
              <span class="word-count-chip">
                {{ spokenWords.length }} {{ lang === 'de' ? 'Wörter' : 'words' }}
              </span>
            </div>

            <p *ngIf="spokenWords.length === 0" class="empty-words-hint">
              {{
                lang === 'de'
                  ? 'Noch keine Wörter notiert. Tippe unten ein Wort ein oder gib die Bombe im Party-Modus direkt per Leertaste weiter!'
                  : 'No words logged yet. Type a word below or pass the bomb directly via Spacebar in live party mode!'
              }}
            </p>

            <div *ngIf="spokenWords.length > 0" class="spoken-word-list">
              <div *ngFor="let item of spokenWords; let i = index" class="spoken-word-chip">
                <span class="word-order">#{{ spokenWords.length - i }}</span>
                <strong class="word-text">{{ item.word }}</strong>
                <span class="word-player">{{ item.playerAvatar }} {{ item.playerName }}</span>
              </div>
            </div>
          </div>
        </section>

        <!-- CENTER COLUMN: The 3D Ticking Bomb & Action Controls -->
        <section class="bomb-centerpiece-column glass-panel" [class.ticking-border]="bombState === 'TICKING'">
          <!-- Status Banner -->
          <div class="bomb-status-banner" [attr.data-state]="bombState">
            <ng-container *ngIf="bombState === 'IDLE'">
              <span class="status-dot idle-dot"></span>
              <span>
                {{
                  lang === 'de'
                    ? 'Bereit! ' + activePlayer.name + ' hält die Bombe.'
                    : 'Ready! ' + activePlayer.name + ' holds the bomb.'
                }}
              </span>
            </ng-container>

            <ng-container *ngIf="bombState === 'TICKING'">
              <span class="status-dot ticking-dot"></span>
              <span class="tick-tack-text">
                {{ tickPhase === 'TICK' ? 'TICK...' : 'TACK...' }}
                {{
                  lang === 'de'
                    ? activePlayer.name + ' ist dran! Schnell ein Wort nennen!'
                    : activePlayer.name + ' is up! Name a word quickly!'
                }}
              </span>
            </ng-container>

            <ng-container *ngIf="bombState === 'EXPLODED'">
              <span class="status-dot boom-dot"></span>
              <span class="boom-banner-text">
                💥 BOOOOOM!
                {{
                  lang === 'de'
                    ? 'Explodiert bei ' + lastLoserName + '! (+1 Strafkarte)'
                    : 'Exploded on ' + lastLoserName + '! (+1 penalty card)'
                }}
              </span>
            </ng-container>

            <ng-container *ngIf="bombState === 'GAME_OVER'">
              <span class="status-dot victory-dot"></span>
              <span>
                🏆
                {{
                  lang === 'de'
                    ? 'Alle ' + maxCards + ' Karten gespielt! Match beendet!'
                    : 'All ' + maxCards + ' cards played! Match finished!'
                }}
              </span>
            </ng-container>
          </div>

          <!-- Active Holder Spotlight -->
          <div class="holder-spotlight" [class.holder-danger]="bombState === 'TICKING'">
            <div class="holder-avatar-ring">
              <span class="holder-avatar">{{ activePlayer.avatar }}</span>
              <span *ngIf="bombState === 'TICKING'" class="holding-bomb-badge">💣</span>
            </div>
            <div class="holder-info">
              <span class="holder-label">
                {{
                  bombState === 'TICKING'
                    ? lang === 'de'
                      ? '🔥 HÄLT GERADE DIE TICKENDE BOMBE:'
                      : '🔥 CURRENTLY HOLDING THE TICKING BOMB:'
                    : lang === 'de'
                      ? 'STARTET DIE NÄCHSTE RUNDE:'
                      : 'STARTS THE NEXT ROUND:'
                }}
              </span>
              <h2 class="holder-name">{{ activePlayer.name }}</h2>
              <span class="next-player-preview">
                {{ lang === 'de' ? 'Nächster im Uhrzeigersinn:' : 'Next clockwise:' }}
                <strong>{{ nextPlayer.avatar }} {{ nextPlayer.name }}</strong>
              </span>
            </div>
          </div>

          <!-- 3D-Style Animated Ticking Bomb -->
          <div class="bomb-visual-stage">
            <!-- Explosion Smoke & Fire Burst Overlay -->
            <div *ngIf="bombState === 'EXPLODED'" class="explosion-fx-wrapper">
              <div class="shockwave-ring"></div>
              <div class="fireball-core"></div>
              <div class="smoke-cloud smoke-1"></div>
              <div class="smoke-cloud smoke-2"></div>
              <div class="smoke-cloud smoke-3"></div>
              <div class="boom-comic-badge">BOOOOM!</div>
            </div>

            <!-- The 3D Sphere Bomb -->
            <div
              class="bomb-3d-wrapper"
              [class.bomb-ticking-anim]="bombState === 'TICKING'"
              [class.bomb-passing-anim]="passWhooshActive"
              [class.bomb-charred]="bombState === 'EXPLODED'"
            >
              <!-- Fuse Neck & Rope -->
              <div class="bomb-cap"></div>
              <div class="fuse-cord">
                <div
                  *ngIf="bombState === 'TICKING'"
                  class="fuse-spark-cluster"
                >
                  <span class="spark s1"></span>
                  <span class="spark s2"></span>
                  <span class="spark s3"></span>
                  <span class="spark s4"></span>
                  <span class="spark-core">✨</span>
                </div>
              </div>

              <!-- Main Bomb Sphere -->
              <div class="bomb-sphere">
                <div class="bomb-specular-highlight"></div>

                <!-- Pulsing Electronic Red LED Light -->
                <div
                  class="bomb-led-housing"
                  [class.led-on]="bombState === 'TICKING' && ledHigh"
                  [class.led-dim]="bombState === 'TICKING' && !ledHigh"
                  [class.led-exploded]="bombState === 'EXPLODED'"
                >
                  <div class="led-diode"></div>
                </div>

                <!-- Bomb Center Emblem -->
                <div class="bomb-emblem">
                  <span class="emblem-top">TICK • TACK</span>
                  <span class="emblem-main">BUMM!</span>
                  <span class="emblem-timer-secret">
                    {{
                      bombState === 'TICKING'
                        ? '??? SEC'
                        : timerPreset === 'CLASSIC'
                          ? '10–60s'
                          : '10–35s'
                    }}
                  </span>
                </div>
              </div>

              <!-- Shadow underneath bomb -->
              <div class="bomb-floor-shadow"></div>
            </div>
          </div>

          <!-- Optional Word Check Input & Duplicate Warning -->
          <div class="word-check-container">
            <div class="word-input-row">
              <input
                type="text"
                class="ttb-input word-entry-input"
                [class.input-error-shake]="wordErrorMsg !== ''"
                [(ngModel)]="currentWordInput"
                (keydown.enter)="submitWordAndPass()"
                [disabled]="bombState !== 'TICKING'"
                [placeholder]="
                  bombState === 'TICKING'
                    ? lang === 'de'
                      ? 'Optional: Gesagtes Wort eintippen (Prüfung auf Dopplung) + Enter...'
                      : 'Optional: Type spoken word (duplicate check) + Enter...'
                    : lang === 'de'
                      ? 'Starte zuerst die Bombe...'
                      : 'Start the bomb first...'
                "
              />
              <button
                *ngIf="bombState === 'TICKING' && currentWordInput.trim()"
                type="button"
                class="btn-primary check-word-btn"
                (click)="submitWordAndPass()"
              >
                ✓ {{ lang === 'de' ? 'Prüfen & Weiter' : 'Check & Pass' }}
              </button>
            </div>

            <div *ngIf="wordErrorMsg" class="word-warning-banner">
              ⚠️ {{ wordErrorMsg }}
            </div>
          </div>

          <!-- Giant Red Start / Pass Bomb Button -->
          <div class="giant-action-area">
            <button
              *ngIf="bombState === 'IDLE'"
              type="button"
              class="giant-bomb-btn start-mode"
              (click)="startBomb()"
            >
              <span class="btn-main-line">🔴 {{ lang === 'de' ? 'BOMBE STARTEN!' : 'START THE BOMB!' }}</span>
              <span class="btn-sub-line">
                {{
                  lang === 'de'
                    ? 'Geheimer Timer (' + (timerPreset === 'CLASSIC' ? '10–60' : '10–35') + ' Sek.) • [Leertaste]'
                    : 'Secret Timer (' + (timerPreset === 'CLASSIC' ? '10–60' : '10–35') + ' sec) • [Spacebar]'
                }}
              </span>
            </button>

            <button
              *ngIf="bombState === 'TICKING'"
              type="button"
              class="giant-bomb-btn pass-mode"
              (click)="passBombQuick()"
            >
              <span class="btn-main-line">
                💣 {{ lang === 'de' ? 'WORT GESAGT → BOMBE WEITERGEBEN!' : 'WORD SPOKEN → PASS THE BOMB!' }}
              </span>
              <span class="btn-sub-line">
                {{
                  lang === 'de'
                    ? 'Weiter an ' + nextPlayer.name + ' • [Leertaste drücken]'
                    : 'Pass to ' + nextPlayer.name + ' • [Press Spacebar]'
                }}
              </span>
            </button>

            <button
              *ngIf="bombState === 'EXPLODED'"
              type="button"
              class="giant-bomb-btn next-round-mode"
              (click)="nextCardRound()"
            >
              <span class="btn-main-line">
                🎲
                {{
                  currentCardNumber < maxCards
                    ? lang === 'de'
                      ? 'NÄCHSTE KARTE & WÜRFELN (' + (currentCardNumber + 1) + '/' + maxCards + ')'
                      : 'NEXT CARD & ROLL DIE (' + (currentCardNumber + 1) + '/' + maxCards + ')'
                    : lang === 'de'
                      ? '🏆 ENDERGEBNIS ANZEIGEN'
                      : '🏆 SHOW FINAL STANDINGS'
                }}
              </span>
              <span class="btn-sub-line">
                {{
                  lang === 'de'
                    ? lastLoserName + ' beginnt die nächste Runde • [Leertaste]'
                    : lastLoserName + ' starts the next round • [Spacebar]'
                }}
              </span>
            </button>

            <button
              *ngIf="bombState === 'GAME_OVER'"
              type="button"
              class="giant-bomb-btn victory-mode"
              (click)="resetMatch()"
            >
              <span class="btn-main-line">
                🎉 {{ lang === 'de' ? 'NEUES SPIEL STARTEN (13 KARTEN)' : 'PLAY AGAIN (13 CARDS)' }}
              </span>
              <span class="btn-sub-line">
                {{ lang === 'de' ? 'Strafpunkte zurücksetzen & neu mischen' : 'Reset penalty cards & shuffle deck' }}
              </span>
            </button>
          </div>
        </section>

        <!-- RIGHT COLUMN: Players Clockwise Circle & Scoreboard -->
        <section class="players-column glass-panel">
          <div class="panel-header-row">
            <div>
              <span class="panel-kicker">🔄 {{ lang === 'de' ? 'IM UHRZEIGERSINN' : 'CLOCKWISE ORDER' }}</span>
              <h3>{{ lang === 'de' ? 'Spielerrunde & Strafkarten' : 'Player Ring & Penalties' }}</h3>
            </div>
            <span class="goal-hint">
              {{ lang === 'de' ? 'Weniger 🔥 = Besser!' : 'Fewer 🔥 = Better!' }}
            </span>
          </div>

          <div class="player-circle-list">
            <div
              *ngFor="let p of players; let i = index"
              class="player-seat-card"
              [class.seat-active]="i === activePlayerIndex && bombState !== 'GAME_OVER'"
              [class.seat-ticking]="i === activePlayerIndex && bombState === 'TICKING'"
              [class.seat-exploded]="i === lastLoserIndex && bombState === 'EXPLODED'"
              (click)="selectStartingPlayer(i)"
              [title]="
                bombState === 'IDLE'
                  ? lang === 'de'
                    ? 'Klicken, damit ' + p.name + ' startet'
                    : 'Click to let ' + p.name + ' start'
                  : ''
              "
            >
              <div class="seat-left">
                <div class="seat-order-badge">{{ i + 1 }}</div>
                <div class="seat-avatar">{{ p.avatar }}</div>
                <div class="seat-name-wrap">
                  <div class="seat-name-line">
                    <strong>{{ p.name }}</strong>
                    <span *ngIf="i === activePlayerIndex && bombState === 'TICKING'" class="live-bomb-tag">
                      💣 {{ lang === 'de' ? 'AM ZUG!' : 'HOLDING!' }}
                    </span>
                    <span *ngIf="i === activePlayerIndex && bombState === 'IDLE'" class="ready-tag">
                      {{ lang === 'de' ? 'Startet' : 'Starts' }}
                    </span>
                    <span *ngIf="i === lastLoserIndex && bombState === 'EXPLODED'" class="boom-tag">
                      💥 BOOOM!
                    </span>
                  </div>
                  <div class="seat-sub-line">
                    <span *ngIf="p.wonCards.length === 0" class="clean-sheet">
                      ✨ {{ lang === 'de' ? 'Noch 0 Strafkarten' : '0 penalty cards so far' }}
                    </span>
                    <span *ngIf="p.wonCards.length > 0" class="penalty-cards-list">
                      {{ lang === 'de' ? 'Kassiert:' : 'Took:' }}
                      <em *ngFor="let c of p.wonCards; let last = last">
                        {{ lang === 'de' ? c.de : c.en }}{{ !last ? ', ' : '' }}
                      </em>
                    </span>
                  </div>
                </div>
              </div>

              <div class="seat-right">
                <div class="penalty-counter" [class.has-penalties]="p.penalties > 0">
                  <span class="penalty-number">{{ p.penalties }}</span>
                  <span class="penalty-label">{{ lang === 'de' ? 'Strafpkt.' : 'Penalties' }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Game Over Final Podium Box -->
          <div *ngIf="bombState === 'GAME_OVER'" class="podium-summary-box">
            <div class="podium-header">
              <span>🏆 {{ lang === 'de' ? 'ENDERGEBNIS NACH ' + maxCards + ' KARTEN' : 'FINAL STANDINGS AFTER ' + maxCards + ' CARDS' }}</span>
            </div>
            <div class="podium-winner-highlight">
              <div class="winner-crown">👑</div>
              <div>
                <h4>
                  {{ getWinnersText() }}
                </h4>
                <p>
                  {{
                    lang === 'de'
                      ? 'Gewonnen mit den wenigsten Explosionen (' + lowestPenaltyScore + ' Strafkarten)!'
                      : 'Won with the fewest explosions (' + lowestPenaltyScore + ' penalty cards)!'
                  }}
                </p>
              </div>
            </div>
          </div>

          <!-- Quick Keyboard Tip -->
          <div class="keyboard-shortcut-card">
            <span class="key-cap">Space</span>
            <span>
              {{
                lang === 'de'
                  ? 'Leertaste startet die Bombe oder gibt sie blitzschnell an den nächsten Spieler weiter!'
                  : 'Spacebar starts the bomb or passes it lightning-fast to the next player!'
              }}
            </span>
          </div>
        </section>
      </main>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        min-height: 100dvh;
        background: radial-gradient(circle at 50% 15%, rgba(244, 63, 94, 0.12), transparent 55%),
          radial-gradient(circle at 85% 80%, rgba(245, 158, 11, 0.1), transparent 50%),
          var(--bg-primary);
        color: var(--text-primary);
      }

      .ttb-shell {
        position: relative;
        max-width: 1440px;
        margin: 0 auto;
        padding: 1.25rem 1.5rem 3rem;
        overflow: hidden;
      }

      /* Screen Shake on Explosion */
      .screen-shake {
        animation: explosionShake 0.65s cubic-bezier(0.36, 0.07, 0.19, 0.97) both;
      }

      @keyframes explosionShake {
        0%, 100% { transform: translate(0, 0) rotate(0deg); }
        10% { transform: translate(-10px, -8px) rotate(-1.5deg); }
        20% { transform: translate(10px, 6px) rotate(1.5deg); }
        30% { transform: translate(-12px, 4px) rotate(-1deg); }
        40% { transform: translate(10px, -6px) rotate(1deg); }
        50% { transform: translate(-8px, 8px) rotate(-1.2deg); }
        60% { transform: translate(8px, 4px) rotate(0.8deg); }
        70% { transform: translate(-6px, -4px) rotate(-0.5deg); }
        80% { transform: translate(4px, 4px) rotate(0.4deg); }
      }

      /* Ambient Orbs */
      .ambient-orb {
        position: fixed;
        border-radius: 50%;
        filter: blur(95px);
        pointer-events: none;
        z-index: 0;
        transition: all 0.5s ease;
      }

      .orb-red {
        width: 420px;
        height: 420px;
        top: 12%;
        left: 35%;
        background: rgba(244, 63, 94, 0.12);
      }

      .orb-red.orb-active {
        background: rgba(244, 63, 94, 0.28);
        transform: scale(1.2);
      }

      .orb-amber {
        width: 360px;
        height: 360px;
        bottom: 10%;
        right: 15%;
        background: rgba(245, 158, 11, 0.08);
      }

      .orb-amber.orb-exploded {
        background: rgba(245, 158, 11, 0.45);
        transform: scale(1.45);
      }

      /* Topbar */
      .ttb-topbar {
        position: relative;
        z-index: 10;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
        padding: 0.9rem 1.25rem;
        margin-bottom: 1.25rem;
        flex-wrap: wrap;
      }

      .topbar-left {
        display: flex;
        align-items: center;
        gap: 1rem;
      }

      .back-btn {
        padding: 0.55rem 0.95rem;
        font-size: 0.85rem;
      }

      .title-group {
        display: flex;
        flex-direction: column;
      }

      .game-badge {
        font-size: 0.68rem;
        font-weight: 700;
        letter-spacing: 0.1em;
        color: #fb7185;
        text-transform: uppercase;
      }

      .title-group h1 {
        margin: 0;
        font-family: var(--font-display);
        font-size: 1.45rem;
        font-weight: 800;
        background: linear-gradient(90deg, #ffffff, #fda4af, #fcd34d);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
      }

      .topbar-center {
        display: flex;
        align-items: center;
      }

      .progress-pill {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        background: rgba(255, 255, 255, 0.04);
        border: 1px solid var(--border-subtle);
        padding: 0.45rem 0.95rem;
        border-radius: 999px;
      }

      .pill-label {
        font-size: 0.78rem;
        color: var(--text-secondary);
      }

      .pill-value {
        font-family: var(--font-mono);
        font-size: 0.9rem;
        color: #fcd34d;
      }

      .mini-progress-bar {
        width: 72px;
        height: 6px;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 999px;
        overflow: hidden;
      }

      .mini-progress-fill {
        height: 100%;
        background: linear-gradient(90deg, #f43f5e, #f59e0b);
        transition: width 0.35s ease;
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
        padding: 0.4rem 0.65rem;
        border-radius: 9px;
        cursor: pointer;
        transition: all 0.2s ease;
      }

      .lang-btn.active {
        background: linear-gradient(135deg, #f43f5e, #f59e0b);
        color: #fff;
        box-shadow: 0 4px 12px rgba(244, 63, 94, 0.35);
      }

      .icon-btn {
        padding: 0.55rem 0.8rem;
        font-size: 1rem;
      }

      .panel-open-btn {
        border-color: rgba(244, 63, 94, 0.5);
        background: rgba(244, 63, 94, 0.15);
      }

      /* Collapsible Drawers (Rules & Settings) */
      .collapsible-drawer {
        position: relative;
        z-index: 10;
        padding: 1.4rem 1.5rem;
        margin-bottom: 1.25rem;
        border-color: rgba(255, 255, 255, 0.14);
      }

      .animate-slide-down {
        animation: slideDown 0.25s ease-out;
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

      .drawer-header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 1rem;
        margin-bottom: 1.15rem;
      }

      .drawer-kicker {
        font-size: 0.72rem;
        font-weight: 700;
        letter-spacing: 0.08em;
        color: #fb7185;
        text-transform: uppercase;
      }

      .drawer-header h2 {
        margin: 0.2rem 0 0;
        font-size: 1.2rem;
        font-family: var(--font-display);
      }

      .close-btn {
        padding: 0.4rem 0.75rem;
      }

      .rules-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
        gap: 0.9rem;
        margin-bottom: 1.1rem;
      }

      .rule-card {
        background: rgba(255, 255, 255, 0.03);
        border: 1px solid var(--border-subtle);
        border-radius: 14px;
        padding: 1rem;
      }

      .rule-num {
        width: 26px;
        height: 26px;
        border-radius: 50%;
        background: linear-gradient(135deg, #f43f5e, #f59e0b);
        color: #fff;
        font-weight: 800;
        font-size: 0.8rem;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        margin-bottom: 0.55rem;
      }

      .rule-card h3 {
        margin: 0 0 0.4rem;
        font-size: 0.95rem;
      }

      .rule-card p {
        margin: 0;
        font-size: 0.83rem;
        color: var(--text-secondary);
        line-height: 1.45;
      }

      .die-modes-legend {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
        gap: 0.75rem;
        padding-top: 0.9rem;
        border-top: 1px solid var(--border-subtle);
      }

      .legend-item {
        display: flex;
        align-items: flex-start;
        gap: 0.65rem;
        font-size: 0.8rem;
      }

      .legend-icon {
        font-size: 1.3rem;
      }

      .legend-item div {
        display: flex;
        flex-direction: column;
        gap: 0.15rem;
      }

      .legend-item span {
        color: var(--text-secondary);
      }

      /* Settings Layout */
      .settings-columns {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
        gap: 1.25rem;
      }

      .settings-box {
        background: rgba(255, 255, 255, 0.025);
        border: 1px solid var(--border-subtle);
        border-radius: 16px;
        padding: 1.1rem;
      }

      .settings-box h3 {
        margin: 0 0 0.9rem;
        font-size: 0.98rem;
      }

      .setting-row {
        display: flex;
        flex-direction: column;
        gap: 0.45rem;
        margin-bottom: 0.95rem;
      }

      .setting-row label {
        font-size: 0.8rem;
        color: var(--text-secondary);
        font-weight: 600;
      }

      .segmented-control {
        display: flex;
        gap: 0.4rem;
        flex-wrap: wrap;
      }

      .segmented-control button {
        flex: 1;
        min-width: 110px;
        padding: 0.55rem 0.75rem;
        border-radius: 10px;
        border: 1px solid var(--border-subtle);
        background: rgba(255, 255, 255, 0.04);
        color: var(--text-secondary);
        font-size: 0.82rem;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;
      }

      .segmented-control button.active {
        background: rgba(244, 63, 94, 0.2);
        border-color: #f43f5e;
        color: #fff;
      }

      .segmented-control button:disabled {
        opacity: 0.45;
        cursor: not-allowed;
      }

      .setting-actions {
        margin-top: 1rem;
        padding-top: 0.85rem;
        border-top: 1px solid var(--border-subtle);
      }

      .players-header-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 0.75rem;
      }

      .players-header-row h3 {
        margin: 0;
      }

      .player-count-badge {
        font-family: var(--font-mono);
        font-size: 0.78rem;
        padding: 0.2rem 0.6rem;
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.08);
      }

      .add-player-bar {
        display: flex;
        gap: 0.5rem;
        margin-bottom: 0.85rem;
      }

      .ttb-input {
        flex: 1;
        background: rgba(10, 14, 24, 0.8);
        border: 1px solid var(--border-subtle);
        border-radius: 12px;
        padding: 0.65rem 0.9rem;
        color: var(--text-primary);
        font-size: 0.9rem;
        outline: none;
        transition: border-color 0.2s ease;
      }

      .ttb-input:focus {
        border-color: #f43f5e;
      }

      .settings-player-list {
        display: flex;
        flex-direction: column;
        gap: 0.45rem;
        max-height: 240px;
        overflow-y: auto;
      }

      .settings-player-item {
        display: flex;
        align-items: center;
        gap: 0.55rem;
        background: rgba(255, 255, 255, 0.03);
        border: 1px solid var(--border-subtle);
        padding: 0.4rem 0.65rem;
        border-radius: 10px;
      }

      .player-idx {
        font-family: var(--font-mono);
        font-size: 0.75rem;
        color: var(--text-muted);
        width: 22px;
      }

      .player-avatar {
        font-size: 1.15rem;
      }

      .player-name-edit {
        flex: 1;
        background: transparent;
        border: 1px solid transparent;
        color: var(--text-primary);
        font-size: 0.88rem;
        font-weight: 600;
        padding: 0.25rem 0.45rem;
        border-radius: 6px;
      }

      .player-name-edit:focus {
        border-color: var(--border-highlight);
        background: rgba(0, 0, 0, 0.3);
        outline: none;
      }

      .penalty-pill {
        font-size: 0.76rem;
        font-family: var(--font-mono);
        color: #fda4af;
      }

      .remove-player-btn {
        border: none;
        background: rgba(244, 63, 94, 0.14);
        color: #fda4af;
        width: 26px;
        height: 26px;
        border-radius: 7px;
        cursor: pointer;
      }

      .remove-player-btn:disabled {
        opacity: 0.3;
        cursor: not-allowed;
      }

      /* Main 3-Column Game Grid */
      .ttb-main-grid {
        position: relative;
        z-index: 5;
        display: grid;
        grid-template-columns: 1.05fr 1.3fr 1fr;
        gap: 1.25rem;
        align-items: start;
      }

      @media (max-width: 1180px) {
        .ttb-main-grid {
          grid-template-columns: 1fr;
        }
      }

      .card-and-die-column {
        display: flex;
        flex-direction: column;
        gap: 1rem;
      }

      .panel-header-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.75rem;
        margin-bottom: 0.8rem;
      }

      .panel-kicker {
        font-size: 0.72rem;
        font-weight: 700;
        letter-spacing: 0.08em;
        color: var(--text-secondary);
        text-transform: uppercase;
      }

      .btn-sm {
        padding: 0.42rem 0.75rem;
        font-size: 0.78rem;
      }

      /* Special Die Panel */
      .special-die-panel {
        padding: 1.15rem 1.25rem;
      }

      .die-stage {
        display: flex;
        align-items: center;
        gap: 1rem;
      }

      .die-stage.die-rolling .die-cube {
        animation: dieRollSpin 0.45s cubic-bezier(0.34, 1.56, 0.64, 1);
      }

      @keyframes dieRollSpin {
        0% { transform: rotateX(0deg) rotateZ(0deg) scale(0.85); }
        50% { transform: rotateX(180deg) rotateZ(180deg) scale(1.15); }
        100% { transform: rotateX(360deg) rotateZ(360deg) scale(1); }
      }

      .die-cube {
        width: 78px;
        height: 78px;
        border-radius: 18px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 0.2rem;
        flex-shrink: 0;
        background: linear-gradient(145deg, #1e293b, #0f172a);
        border: 2px solid rgba(255, 255, 255, 0.18);
        box-shadow: inset 0 2px 6px rgba(255, 255, 255, 0.15),
          0 10px 22px rgba(0, 0, 0, 0.45);
      }

      .die-cube[data-mode='CATEGORY'] {
        border-color: #38bdf8;
        box-shadow: 0 8px 20px rgba(56, 189, 248, 0.25);
      }

      .die-cube[data-mode='TICK'] {
        border-color: #10b981;
        box-shadow: 0 8px 20px rgba(16, 185, 129, 0.25);
      }

      .die-cube[data-mode='TACK'] {
        border-color: #a855f7;
        box-shadow: 0 8px 20px rgba(168, 85, 247, 0.25);
      }

      .die-cube[data-mode='BOMBE'] {
        border-color: #f43f5e;
        box-shadow: 0 8px 20px rgba(244, 63, 94, 0.3);
      }

      .die-face-icon {
        font-size: 1.7rem;
        line-height: 1;
      }

      .die-face-label {
        font-family: var(--font-mono);
        font-size: 0.7rem;
        font-weight: 800;
        letter-spacing: 0.06em;
        color: #fff;
      }

      .die-description h3 {
        margin: 0 0 0.25rem;
        font-size: 1.02rem;
        font-family: var(--font-display);
      }

      .die-description p {
        margin: 0;
        font-size: 0.83rem;
        color: var(--text-secondary);
        line-height: 1.4;
      }

      /* Active Card */
      .active-bumm-card {
        padding: 1.35rem;
        position: relative;
        overflow: hidden;
        transition: all 0.25s ease;
        border-width: 2px;
      }

      .active-bumm-card[data-mode='CATEGORY'] {
        border-color: rgba(56, 189, 248, 0.35);
      }
      .active-bumm-card[data-mode='TICK'] {
        border-color: rgba(16, 185, 129, 0.35);
      }
      .active-bumm-card[data-mode='TACK'] {
        border-color: rgba(168, 85, 247, 0.35);
      }
      .active-bumm-card[data-mode='BOMBE'] {
        border-color: rgba(244, 63, 94, 0.4);
      }

      .active-bumm-card.card-ticking {
        box-shadow: 0 0 32px rgba(244, 63, 94, 0.22);
      }

      .card-top-meta {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 1rem;
      }

      .card-mode-tag {
        font-size: 0.74rem;
        font-weight: 800;
        padding: 0.3rem 0.7rem;
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.08);
        letter-spacing: 0.04em;
      }

      .card-counter {
        font-family: var(--font-mono);
        font-size: 0.78rem;
        color: var(--text-secondary);
      }

      .card-Prompt-box {
        text-align: center;
        padding: 1.35rem 1rem;
        margin-bottom: 1rem;
        border-radius: 16px;
        background: radial-gradient(circle at center, rgba(255, 255, 255, 0.07), rgba(0, 0, 0, 0.3));
        border: 1px solid rgba(255, 255, 255, 0.1);
      }

      .syllable-or-topic {
        font-family: var(--font-display);
        font-size: 2rem;
        font-weight: 900;
        letter-spacing: 0.03em;
        color: #ffffff;
        text-shadow: 0 4px 16px rgba(0, 0, 0, 0.5);
        margin-bottom: 0.45rem;
      }

      .card-hint {
        margin: 0;
        font-size: 0.86rem;
        color: #cbd5e1;
      }

      .card-examples-section {
        border-top: 1px solid var(--border-subtle);
        padding-top: 0.85rem;
      }

      .examples-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        font-size: 0.78rem;
        color: var(--text-secondary);
        margin-bottom: 0.55rem;
      }

      .peek-btn {
        border: 1px solid var(--border-subtle);
        background: rgba(255, 255, 255, 0.05);
        color: var(--text-primary);
        border-radius: 8px;
        padding: 0.2rem 0.55rem;
        font-size: 0.74rem;
        cursor: pointer;
      }

      .examples-chips {
        display: flex;
        flex-wrap: wrap;
        gap: 0.4rem;
        transition: filter 0.25s ease;
      }

      .examples-chips.blurred {
        filter: blur(5px);
        user-select: none;
      }

      .example-chip {
        font-size: 0.76rem;
        padding: 0.25rem 0.6rem;
        border-radius: 8px;
        background: rgba(255, 255, 255, 0.06);
        color: #e2e8f0;
      }

      /* Spoken Words Panel */
      .spoken-words-panel {
        padding: 1.1rem 1.25rem;
      }

      .word-count-chip {
        font-family: var(--font-mono);
        font-size: 0.75rem;
        padding: 0.2rem 0.55rem;
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.07);
      }

      .empty-words-hint {
        margin: 0;
        font-size: 0.82rem;
        color: var(--text-muted);
        line-height: 1.45;
      }

      .spoken-word-list {
        display: flex;
        flex-wrap: wrap;
        gap: 0.45rem;
        max-height: 150px;
        overflow-y: auto;
      }

      .spoken-word-chip {
        display: inline-flex;
        align-items: center;
        gap: 0.4rem;
        padding: 0.32rem 0.65rem;
        border-radius: 999px;
        background: rgba(16, 185, 129, 0.12);
        border: 1px solid rgba(16, 185, 129, 0.3);
        font-size: 0.8rem;
      }

      .word-order {
        font-family: var(--font-mono);
        font-size: 0.7rem;
        color: #34d399;
      }

      .word-player {
        font-size: 0.72rem;
        color: var(--text-secondary);
      }

      /* CENTER COLUMN: The 3D Bomb & Controls */
      .bomb-centerpiece-column {
        padding: 1.35rem;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 1.1rem;
        transition: border-color 0.3s ease, box-shadow 0.3s ease;
      }

      .bomb-centerpiece-column.ticking-border {
        border-color: rgba(244, 63, 94, 0.65);
        box-shadow: 0 0 40px rgba(244, 63, 94, 0.22);
      }

      .bomb-status-banner {
        width: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.6rem;
        padding: 0.65rem 1rem;
        border-radius: 12px;
        background: rgba(255, 255, 255, 0.04);
        border: 1px solid var(--border-subtle);
        font-size: 0.88rem;
        font-weight: 600;
        text-align: center;
      }

      .bomb-status-banner[data-state='TICKING'] {
        background: rgba(244, 63, 94, 0.16);
        border-color: rgba(244, 63, 94, 0.45);
        color: #fecdd3;
      }

      .bomb-status-banner[data-state='EXPLODED'] {
        background: rgba(245, 158, 11, 0.22);
        border-color: rgba(245, 158, 11, 0.65);
        color: #fef08a;
      }

      .status-dot {
        width: 10px;
        height: 10px;
        border-radius: 50%;
        flex-shrink: 0;
      }

      .idle-dot {
        background: #38bdf8;
      }

      .ticking-dot {
        background: #f43f5e;
        box-shadow: 0 0 12px #f43f5e;
        animation: fastPulse 0.45s infinite alternate;
      }

      .boom-dot {
        background: #f59e0b;
      }

      .victory-dot {
        background: #10b981;
      }

      @keyframes fastPulse {
        from { transform: scale(0.85); opacity: 0.6; }
        to { transform: scale(1.3); opacity: 1; }
      }

      /* Holder Spotlight */
      .holder-spotlight {
        width: 100%;
        display: flex;
        align-items: center;
        gap: 1rem;
        padding: 0.9rem 1.15rem;
        border-radius: 16px;
        background: rgba(255, 255, 255, 0.03);
        border: 1px solid var(--border-subtle);
      }

      .holder-spotlight.holder-danger {
        background: linear-gradient(135deg, rgba(244, 63, 94, 0.16), rgba(245, 158, 11, 0.1));
        border-color: rgba(244, 63, 94, 0.45);
      }

      .holder-avatar-ring {
        position: relative;
        width: 58px;
        height: 58px;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.07);
        border: 2px solid rgba(255, 255, 255, 0.2);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.85rem;
        flex-shrink: 0;
      }

      .holding-bomb-badge {
        position: absolute;
        bottom: -4px;
        right: -4px;
        font-size: 1.1rem;
        animation: bounceBomb 0.5s infinite alternate;
      }

      @keyframes bounceBomb {
        from { transform: translateY(0); }
        to { transform: translateY(-4px); }
      }

      .holder-info {
        display: flex;
        flex-direction: column;
        gap: 0.15rem;
      }

      .holder-label {
        font-size: 0.7rem;
        font-weight: 800;
        letter-spacing: 0.08em;
        color: #fb7185;
      }

      .holder-name {
        margin: 0;
        font-family: var(--font-display);
        font-size: 1.4rem;
        font-weight: 800;
      }

      .next-player-preview {
        font-size: 0.8rem;
        color: var(--text-secondary);
      }

      /* 3D Bomb Stage */
      .bomb-visual-stage {
        position: relative;
        width: 100%;
        height: 290px;
        display: flex;
        align-items: center;
        justify-content: center;
        overflow: visible;
      }

      .bomb-3d-wrapper {
        position: relative;
        width: 200px;
        height: 230px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: flex-end;
        transition: transform 0.25s ease;
      }

      .bomb-3d-wrapper.bomb-ticking-anim {
        animation: bombHeartbeat 0.52s infinite ease-in-out;
      }

      @keyframes bombHeartbeat {
        0%, 100% { transform: scale(1) rotate(-1deg); }
        50% { transform: scale(1.055) rotate(1.5deg); }
      }

      .bomb-3d-wrapper.bomb-passing-anim {
        animation: passWhoosh 0.32s ease-out;
      }

      @keyframes passWhoosh {
        0% { transform: translateX(0) scale(1); }
        40% { transform: translateX(36px) rotate(16deg) scale(0.9); }
        70% { transform: translateX(-24px) rotate(-10deg) scale(0.95); }
        100% { transform: translateX(0) rotate(0) scale(1); }
      }

      .bomb-3d-wrapper.bomb-charred .bomb-sphere {
        filter: brightness(0.6) contrast(1.4);
      }

      /* Bomb Fuse Neck & Sparking Cord */
      .bomb-cap {
        width: 48px;
        height: 20px;
        background: linear-gradient(90deg, #334155, #64748b, #1e293b);
        border-radius: 8px 8px 2px 2px;
        border: 2px solid #475569;
        margin-bottom: -6px;
        z-index: 3;
      }

      .fuse-cord {
        position: absolute;
        top: 6px;
        left: 52%;
        width: 44px;
        height: 38px;
        border-top: 5px solid #d97706;
        border-right: 5px solid #b45309;
        border-top-right-radius: 26px;
        z-index: 2;
      }

      .fuse-spark-cluster {
        position: absolute;
        right: -14px;
        bottom: -10px;
        width: 28px;
        height: 28px;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .spark-core {
        font-size: 1.35rem;
        animation: sparkFlicker 0.18s infinite alternate;
        filter: drop-shadow(0 0 10px #fbbf24);
      }

      .spark {
        position: absolute;
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: #fef08a;
        box-shadow: 0 0 8px #f59e0b;
      }

      .spark.s1 { animation: sparkFly1 0.4s infinite; }
      .spark.s2 { animation: sparkFly2 0.35s infinite; }
      .spark.s3 { animation: sparkFly3 0.45s infinite; }
      .spark.s4 { animation: sparkFly4 0.38s infinite; }

      @keyframes sparkFlicker {
        from { transform: scale(0.85) rotate(-12deg); }
        to { transform: scale(1.25) rotate(15deg); }
      }

      @keyframes sparkFly1 {
        0% { transform: translate(0, 0) scale(1); opacity: 1; }
        100% { transform: translate(-18px, -16px) scale(0.2); opacity: 0; }
      }
      @keyframes sparkFly2 {
        0% { transform: translate(0, 0) scale(1); opacity: 1; }
        100% { transform: translate(18px, -14px) scale(0.2); opacity: 0; }
      }
      @keyframes sparkFly3 {
        0% { transform: translate(0, 0) scale(1); opacity: 1; }
        100% { transform: translate(14px, 16px) scale(0.2); opacity: 0; }
      }
      @keyframes sparkFly4 {
        0% { transform: translate(0, 0) scale(1); opacity: 1; }
        100% { transform: translate(-15px, 14px) scale(0.2); opacity: 0; }
      }

      /* 3D Bomb Sphere */
      .bomb-sphere {
        position: relative;
        width: 184px;
        height: 184px;
        border-radius: 50%;
        background: radial-gradient(circle at 32% 28%, #475569 0%, #1e293b 32%, #090d16 75%, #020617 100%);
        box-shadow: inset -14px -16px 28px rgba(0, 0, 0, 0.85),
          inset 8px 8px 18px rgba(255, 255, 255, 0.14),
          0 18px 38px rgba(0, 0, 0, 0.65);
        border: 2px solid rgba(255, 255, 255, 0.12);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        z-index: 3;
      }

      .bomb-specular-highlight {
        position: absolute;
        top: 22px;
        left: 28px;
        width: 44px;
        height: 24px;
        border-radius: 50%;
        background: radial-gradient(circle, rgba(255, 255, 255, 0.38), transparent 70%);
        transform: rotate(-32deg);
        pointer-events: none;
      }

      /* Pulsing Red Electronic LED */
      .bomb-led-housing {
        width: 34px;
        height: 34px;
        border-radius: 50%;
        background: #1e1b2e;
        border: 3px solid #334155;
        display: flex;
        align-items: center;
        justify-content: center;
        margin-bottom: 0.5rem;
        transition: all 0.12s ease;
      }

      .led-diode {
        width: 18px;
        height: 18px;
        border-radius: 50%;
        background: #7f1d1d;
        transition: all 0.1s ease;
      }

      .bomb-led-housing.led-on {
        border-color: #fda4af;
        box-shadow: 0 0 26px #f43f5e, 0 0 48px rgba(244, 63, 94, 0.8);
      }

      .bomb-led-housing.led-on .led-diode {
        background: #ff2a55;
        box-shadow: inset 0 0 6px #ffffff;
      }

      .bomb-led-housing.led-dim .led-diode {
        background: #991b1b;
      }

      .bomb-led-housing.led-exploded .led-diode {
        background: #f59e0b;
        box-shadow: 0 0 24px #f59e0b;
      }

      .bomb-emblem {
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        user-select: none;
      }

      .emblem-top {
        font-size: 0.62rem;
        font-weight: 800;
        letter-spacing: 0.16em;
        color: #94a3b8;
      }

      .emblem-main {
        font-family: var(--font-display);
        font-size: 1.45rem;
        font-weight: 900;
        letter-spacing: 0.06em;
        background: linear-gradient(180deg, #fde047, #f97316, #ef4444);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
      }

      .emblem-timer-secret {
        margin-top: 0.2rem;
        font-family: var(--font-mono);
        font-size: 0.72rem;
        padding: 0.12rem 0.5rem;
        border-radius: 999px;
        background: rgba(244, 63, 94, 0.2);
        border: 1px solid rgba(244, 63, 94, 0.4);
        color: #fda4af;
      }

      .bomb-floor-shadow {
        width: 140px;
        height: 18px;
        border-radius: 50%;
        background: radial-gradient(ellipse, rgba(0, 0, 0, 0.75), transparent 70%);
        margin-top: 8px;
      }

      /* Explosion FX Overlay */
      .explosion-fx-wrapper {
        position: absolute;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10;
        pointer-events: none;
      }

      .shockwave-ring {
        position: absolute;
        width: 240px;
        height: 240px;
        border-radius: 50%;
        border: 6px solid #f59e0b;
        animation: shockwaveExpand 0.75s ease-out forwards;
      }

      @keyframes shockwaveExpand {
        0% { transform: scale(0.3); opacity: 1; }
        100% { transform: scale(1.75); opacity: 0; }
      }

      .fireball-core {
        position: absolute;
        width: 210px;
        height: 210px;
        border-radius: 50%;
        background: radial-gradient(circle, #fef08a 0%, #f97316 45%, #ef4444 72%, transparent 100%);
        animation: fireballPulse 0.8s ease-out forwards;
      }

      @keyframes fireballPulse {
        0% { transform: scale(0.2); opacity: 1; }
        50% { transform: scale(1.25); opacity: 0.95; }
        100% { transform: scale(1.4); opacity: 0.15; }
      }

      .smoke-cloud {
        position: absolute;
        border-radius: 50%;
        background: radial-gradient(circle, rgba(100, 116, 139, 0.65), transparent 70%);
        animation: smokeDrift 1.2s ease-out forwards;
      }

      .smoke-1 { width: 150px; height: 150px; top: 10px; left: 22%; }
      .smoke-2 { width: 170px; height: 170px; top: 20px; right: 20%; }
      .smoke-3 { width: 140px; height: 140px; bottom: 10px; left: 35%; }

      @keyframes smokeDrift {
        0% { transform: scale(0.4) translateY(0); opacity: 0.9; }
        100% { transform: scale(1.4) translateY(-30px); opacity: 0; }
      }

      .boom-comic-badge {
        position: relative;
        padding: 0.65rem 1.4rem;
        background: linear-gradient(135deg, #ef4444, #f59e0b);
        color: #fff;
        font-family: var(--font-display);
        font-size: 2.1rem;
        font-weight: 900;
        letter-spacing: 0.06em;
        border-radius: 16px;
        border: 3px solid #fef08a;
        box-shadow: 0 12px 35px rgba(239, 68, 68, 0.75);
        transform: rotate(-6deg);
        animation: boomPop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
      }

      @keyframes boomPop {
        0% { transform: scale(0.2) rotate(-20deg); }
        100% { transform: scale(1) rotate(-6deg); }
      }

      /* Word Check Input */
      .word-check-container {
        width: 100%;
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }

      .word-input-row {
        display: flex;
        gap: 0.5rem;
      }

      .word-entry-input {
        font-size: 0.92rem;
      }

      .input-error-shake {
        border-color: #f43f5e !important;
        animation: errorHorizontalShake 0.35s ease;
      }

      @keyframes errorHorizontalShake {
        0%, 100% { transform: translateX(0); }
        25% { transform: translateX(-6px); }
        75% { transform: translateX(6px); }
      }

      .check-word-btn {
        white-space: nowrap;
      }

      .word-warning-banner {
        padding: 0.55rem 0.85rem;
        border-radius: 10px;
        background: rgba(244, 63, 94, 0.18);
        border: 1px solid rgba(244, 63, 94, 0.5);
        color: #fecdd3;
        font-size: 0.82rem;
        font-weight: 600;
      }

      /* Giant Red Action Button */
      .giant-action-area {
        width: 100%;
      }

      .giant-bomb-btn {
        width: 100%;
        border: none;
        border-radius: 18px;
        padding: 1.15rem 1.4rem;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 0.3rem;
        cursor: pointer;
        color: #ffffff;
        transition: transform 0.15s ease, box-shadow 0.2s ease;
      }

      .giant-bomb-btn:hover {
        transform: translateY(-2px);
      }

      .giant-bomb-btn:active {
        transform: translateY(1px) scale(0.99);
      }

      .giant-bomb-btn.start-mode {
        background: linear-gradient(135deg, #e11d48 0%, #f43f5e 50%, #f97316 100%);
        box-shadow: 0 12px 30px -6px rgba(244, 63, 94, 0.65);
        border: 1px solid rgba(255, 255, 255, 0.25);
      }

      .giant-bomb-btn.pass-mode {
        background: linear-gradient(135deg, #dc2626 0%, #ea580c 55%, #d97706 100%);
        box-shadow: 0 14px 36px -4px rgba(239, 68, 68, 0.8);
        border: 2px solid #fde047;
        animation: urgentBtnPulse 0.7s infinite alternate;
      }

      @keyframes urgentBtnPulse {
        from { box-shadow: 0 10px 26px -4px rgba(239, 68, 68, 0.65); }
        to { box-shadow: 0 16px 42px 2px rgba(245, 158, 11, 0.85); }
      }

      .giant-bomb-btn.next-round-mode {
        background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 55%, #ec4899 100%);
        box-shadow: 0 12px 28px -6px rgba(139, 92, 246, 0.65);
        border: 1px solid rgba(255, 255, 255, 0.22);
      }

      .giant-bomb-btn.victory-mode {
        background: linear-gradient(135deg, #059669 0%, #10b981 55%, #06b6d4 100%);
        box-shadow: 0 12px 28px -6px rgba(16, 185, 129, 0.6);
      }

      .btn-main-line {
        font-family: var(--font-display);
        font-size: 1.18rem;
        font-weight: 900;
        letter-spacing: 0.03em;
      }

      .btn-sub-line {
        font-size: 0.8rem;
        opacity: 0.9;
      }

      /* RIGHT COLUMN: Players Clockwise & Scoreboard */
      .players-column {
        padding: 1.25rem;
        display: flex;
        flex-direction: column;
        gap: 1rem;
      }

      .players-column h3 {
        margin: 0.15rem 0 0;
        font-size: 1.05rem;
      }

      .goal-hint {
        font-size: 0.75rem;
        padding: 0.25rem 0.6rem;
        border-radius: 999px;
        background: rgba(16, 185, 129, 0.12);
        color: #6ee7b7;
        font-weight: 600;
      }

      .player-circle-list {
        display: flex;
        flex-direction: column;
        gap: 0.6rem;
      }

      .player-seat-card {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.75rem;
        padding: 0.75rem 0.9rem;
        border-radius: 14px;
        background: rgba(255, 255, 255, 0.03);
        border: 1px solid var(--border-subtle);
        cursor: pointer;
        transition: all 0.2s ease;
      }

      .player-seat-card:hover {
        background: rgba(255, 255, 255, 0.06);
      }

      .player-seat-card.seat-active {
        border-color: rgba(56, 189, 248, 0.55);
        background: rgba(56, 189, 248, 0.09);
      }

      .player-seat-card.seat-ticking {
        border-color: #f43f5e;
        background: linear-gradient(90deg, rgba(244, 63, 94, 0.22), rgba(245, 158, 11, 0.08));
        box-shadow: 0 6px 20px rgba(244, 63, 94, 0.22);
      }

      .player-seat-card.seat-exploded {
        border-color: #f59e0b;
        background: rgba(245, 158, 11, 0.2);
      }

      .seat-left {
        display: flex;
        align-items: center;
        gap: 0.65rem;
        min-width: 0;
      }

      .seat-order-badge {
        width: 22px;
        height: 22px;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.08);
        font-family: var(--font-mono);
        font-size: 0.72rem;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }

      .seat-avatar {
        font-size: 1.45rem;
        flex-shrink: 0;
      }

      .seat-name-wrap {
        display: flex;
        flex-direction: column;
        gap: 0.15rem;
        min-width: 0;
      }

      .seat-name-line {
        display: flex;
        align-items: center;
        gap: 0.45rem;
        flex-wrap: wrap;
      }

      .live-bomb-tag {
        font-size: 0.68rem;
        font-weight: 800;
        padding: 0.12rem 0.45rem;
        border-radius: 999px;
        background: #f43f5e;
        color: #fff;
      }

      .ready-tag {
        font-size: 0.68rem;
        font-weight: 700;
        padding: 0.12rem 0.45rem;
        border-radius: 999px;
        background: rgba(56, 189, 248, 0.2);
        color: #7dd3fc;
      }

      .boom-tag {
        font-size: 0.68rem;
        font-weight: 800;
        padding: 0.12rem 0.45rem;
        border-radius: 999px;
        background: #f59e0b;
        color: #000;
      }

      .seat-sub-line {
        font-size: 0.74rem;
        color: var(--text-secondary);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 210px;
      }

      .clean-sheet {
        color: #6ee7b7;
      }

      .seat-right {
        flex-shrink: 0;
      }

      .penalty-counter {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        min-width: 54px;
        padding: 0.3rem 0.5rem;
        border-radius: 10px;
        background: rgba(255, 255, 255, 0.04);
        border: 1px solid var(--border-subtle);
      }

      .penalty-counter.has-penalties {
        background: rgba(244, 63, 94, 0.14);
        border-color: rgba(244, 63, 94, 0.38);
      }

      .penalty-number {
        font-family: var(--font-mono);
        font-size: 1.05rem;
        font-weight: 800;
        color: #fda4af;
      }

      .penalty-label {
        font-size: 0.64rem;
        color: var(--text-secondary);
      }

      /* Podium Box */
      .podium-summary-box {
        padding: 1rem;
        border-radius: 14px;
        background: linear-gradient(135deg, rgba(16, 185, 129, 0.18), rgba(6, 182, 212, 0.12));
        border: 1px solid rgba(16, 185, 129, 0.45);
      }

      .podium-header {
        font-size: 0.72rem;
        font-weight: 800;
        letter-spacing: 0.08em;
        color: #6ee7b7;
        margin-bottom: 0.5rem;
      }

      .podium-winner-highlight {
        display: flex;
        align-items: center;
        gap: 0.75rem;
      }

      .winner-crown {
        font-size: 2rem;
      }

      .podium-winner-highlight h4 {
        margin: 0 0 0.2rem;
        font-size: 1.05rem;
      }

      .podium-winner-highlight p {
        margin: 0;
        font-size: 0.8rem;
        color: #d1fae5;
      }

      .keyboard-shortcut-card {
        display: flex;
        align-items: center;
        gap: 0.65rem;
        padding: 0.7rem 0.85rem;
        border-radius: 12px;
        background: rgba(255, 255, 255, 0.03);
        border: 1px solid var(--border-subtle);
        font-size: 0.78rem;
        color: var(--text-secondary);
      }

      .key-cap {
        font-family: var(--font-mono);
        font-size: 0.75rem;
        font-weight: 700;
        padding: 0.25rem 0.55rem;
        border-radius: 6px;
        background: rgba(255, 255, 255, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.22);
        color: #fff;
      }
    `,
  ],
})
export class TickTackBummGameComponent implements OnDestroy {
  private readonly cdr = inject(ChangeDetectorRef);
  protected readonly languageService = inject(LanguageService);
  lang: Lang = this.languageService.currentLang();
  soundEnabled = true;
  showRules = false;
  showSettings = false;
  showExamples = false;

  timerPreset: TimerPreset = 'CLASSIC'; // CLASSIC = 10-60s, FAST = 10-35s
  deckFilter: DeckFilter = 'ALL';
  maxCards = 13;
  currentCardNumber = 1;

  bombState: BombState = 'IDLE';
  tickPhase: 'TICK' | 'TACK' = 'TICK';
  ledHigh = false;
  isRollingDie = false;
  passWhooshActive = false;
  shakeActive = false;

  activePlayerIndex = 0;
  lastLoserIndex = -1;
  lastLoserName = '';

  currentWordInput = '';
  wordErrorMsg = '';
  spokenWords: SpokenWordEntry[] = [];

  newPlayerName = '';

  private readonly avatarPool = ['🦊', '🐼', '🐯', '🐸', '🦁', '🐙', '🦄', '🦉', '🐨', '🦖'];

  players: Player[] = loadSavedPlayerNames(['Spieler 1', 'Spieler 2', 'Spieler 3', 'Spieler 4']).map(
    (name, idx) => ({
      id: idx + 1,
      name,
      avatar: this.avatarPool[idx % this.avatarPool.length],
      penalties: 0,
      wonCards: [],
    })
  );

  // 108 Bilingual Cards across all 4 official modes (65 Category, 15 TICK, 14 TACK, 14 BOMBE)
  readonly allCards: BummCard[] = [
    // 🎯 KLASSISCHE KATEGORIEN (65 CATEGORIES: IDs 1–65)
    {
      id: 1,
      mode: 'CATEGORY',
      de: 'Auf dem Bauernhof',
      en: 'On the Farm',
      hintDe: 'Tiere, Geräte oder Dinge auf einem Bauernhof',
      hintEn: 'Animals, tools, or things found on a farm',
      examplesDe: ['Traktor', 'Kuhstall', 'Heugabel', 'Hühner', 'Scheune'],
      examplesEn: ['Tractor', 'Barn', 'Pitchfork', 'Rooster', 'Haystack'],
    },
    {
      id: 2,
      mode: 'CATEGORY',
      de: 'Dinge im Reisekoffer',
      en: 'Things in a Suitcase',
      hintDe: 'Was packt man für den Urlaub ein?',
      hintEn: 'What do you pack for a vacation?',
      examplesDe: ['Zahnbürste', 'Reisepass', 'Sonnencreme', 'Socken', 'Badehose'],
      examplesEn: ['Toothbrush', 'Passport', 'Sunscreen', 'Socks', 'Swimsuit'],
    },
    {
      id: 3,
      mode: 'CATEGORY',
      de: 'Berufe & Jobs',
      en: 'Professions & Jobs',
      hintDe: 'Nenne einen anerkannten Beruf',
      hintEn: 'Name any occupation or profession',
      examplesDe: ['Feuerwehrmann', 'Architektin', 'Bäcker', 'Pilot', 'Tierarzt'],
      examplesEn: ['Firefighter', 'Architect', 'Baker', 'Pilot', 'Vet'],
    },
    {
      id: 4,
      mode: 'CATEGORY',
      de: 'Pizza-Beläge',
      en: 'Pizza Toppings',
      hintDe: 'Zutaten, die man auf eine Pizza legen kann',
      hintEn: 'Ingredients you can put on a pizza',
      examplesDe: ['Mozzarella', 'Salami', 'Champignons', 'Oliven', 'Basilikum'],
      examplesEn: ['Mozzarella', 'Pepperoni', 'Mushrooms', 'Olives', 'Basil'],
    },
    {
      id: 5,
      mode: 'CATEGORY',
      de: 'Im Badezimmer',
      en: 'In the Bathroom',
      hintDe: 'Gegenstände rund um Dusche, Waschbecken & Spiegel',
      hintEn: 'Items around the shower, sink & mirror',
      examplesDe: ['Handtuch', 'Föhn', 'Duschgel', 'Zahnseide', 'Badematte'],
      examplesEn: ['Towel', 'Hairdryer', 'Shampoo', 'Floss', 'Bathmat'],
    },
    {
      id: 6,
      mode: 'CATEGORY',
      de: 'Sportarten',
      en: 'Sports & Athletics',
      hintDe: 'Olympische Disziplinen, Ball- oder Wintersport',
      hintEn: 'Olympic events, ball games, or winter sports',
      examplesDe: ['Tischtennis', 'Eishockey', 'Bogenschießen', 'Volleyball', 'Rudern'],
      examplesEn: ['Table Tennis', 'Ice Hockey', 'Archery', 'Volleyball', 'Rowing'],
    },
    {
      id: 7,
      mode: 'CATEGORY',
      de: 'Dinge, die rund sind',
      en: 'Things That Are Round',
      hintDe: 'Kugelförmige oder kreisrunde Objekte',
      hintEn: 'Spherical or circular objects',
      examplesDe: ['Münze', 'Globus', 'Autoreifen', 'Seifenblase', 'Vollmond'],
      examplesEn: ['Coin', 'Globe', 'Car Tire', 'Soap Bubble', 'Full Moon'],
    },
    {
      id: 8,
      mode: 'CATEGORY',
      de: 'In der Küche',
      en: 'In the Kitchen',
      hintDe: 'Küchengeräte, Geschirr oder Besteck',
      hintEn: 'Kitchen appliances, dishes, or cutlery',
      examplesDe: ['Schneebesen', 'Pfanne', 'Toaster', 'Nudelholz', 'Kühlschrank'],
      examplesEn: ['Whisk', 'Frying Pan', 'Toaster', 'Rolling Pin', 'Fridge'],
    },
    {
      id: 9,
      mode: 'CATEGORY',
      de: 'Am Strand & Meer',
      en: 'At the Beach & Sea',
      hintDe: 'Was sieht oder nutzt man am Strand?',
      hintEn: 'What do you see or use at the beach?',
      examplesDe: ['Muschel', 'Sonnenschirm', 'Luftmatratze', 'Sandburg', 'Möwe'],
      examplesEn: ['Seashell', 'Parasol', 'Surfboard', 'Sandcastle', 'Seagull'],
    },
    {
      id: 10,
      mode: 'CATEGORY',
      de: 'Musikinstrumente',
      en: 'Musical Instruments',
      hintDe: 'Streich-, Blas-, Tasten- oder Schlaginstrumente',
      hintEn: 'String, wind, keyboard, or percussion instruments',
      examplesDe: ['Saxophon', 'Geige', 'Schlagzeug', 'Klavier', 'Harfe'],
      examplesEn: ['Saxophone', 'Violin', 'Drums', 'Piano', 'Harp'],
    },
    {
      id: 11,
      mode: 'CATEGORY',
      de: 'Im Supermarkt',
      en: 'In the Supermarket',
      hintDe: 'Produkte, Abteilungen oder Dinge beim Einkaufen',
      hintEn: 'Products, aisles, or things found while grocery shopping',
      examplesDe: ['Einkaufswagen', 'Kassenband', 'Tiefkühlpizza', 'Pfandautomat', 'Joghurt'],
      examplesEn: ['Shopping Cart', 'Checkout', 'Frozen Pizza', 'Barcode', 'Yogurt'],
    },
    {
      id: 12,
      mode: 'CATEGORY',
      de: 'Eissorten',
      en: 'Ice Cream Flavors',
      hintDe: 'Kugeln in der Eisdiele',
      hintEn: 'Scoops you can order at an ice cream parlor',
      examplesDe: ['Stracciatella', 'Pistazie', 'Erdbeere', 'Vanille', 'Zitrone'],
      examplesEn: ['Rocky Road', 'Pistachio', 'Strawberry', 'Vanilla', 'Mint Chocolate'],
    },
    {
      id: 13,
      mode: 'CATEGORY',
      de: 'Auf dem Jahrmarkt / Rummel',
      en: 'At the Funfair / Carnival',
      hintDe: 'Fahrgeschäfte, Leckereien und Buden',
      hintEn: 'Rides, treats, and stalls at a carnival',
      examplesDe: ['Zuckerwatte', 'Riesenrad', 'Autoscooter', 'Gebrannte Mandeln', 'Geisterbahn'],
      examplesEn: ['Cotton Candy', 'Ferris Wheel', 'Bumper Cars', 'Rollercoaster', 'Popcorn'],
    },
    {
      id: 14,
      mode: 'CATEGORY',
      de: 'Dinge, die fliegen können',
      en: 'Things That Can Fly',
      hintDe: 'Tiere, Fahrzeuge oder Objekte in der Luft',
      hintEn: 'Animals, vehicles, or objects in the air',
      examplesDe: ['Hubschrauber', 'Libelle', 'Heißluftballon', 'Papierflieger', 'Adler'],
      examplesEn: ['Helicopter', 'Dragonfly', 'Hot Air Balloon', 'Paper Plane', 'Eagle'],
    },
    {
      id: 15,
      mode: 'CATEGORY',
      de: 'Im Klassenzimmer',
      en: 'In the Classroom',
      hintDe: 'Gegenstände aus der Schulzeit',
      hintEn: 'Objects found in a school classroom',
      examplesDe: ['Kreidetafel', 'Geodreieck', 'Klassenbuch', 'Schwamm', 'Schulranzen'],
      examplesEn: ['Chalkboard', 'Ruler', 'Textbook', 'Globe', 'Backpack'],
    },
    {
      id: 16,
      mode: 'CATEGORY',
      de: 'Superhelden & Comicfiguren',
      en: 'Superheroes & Comic Characters',
      hintDe: 'Bekannte Helden oder Schurken aus Comics & Filmen',
      hintEn: 'Famous heroes or villains from comics & movies',
      examplesDe: ['Spider-Man', 'Batman', 'Wonder Woman', 'Asterix', 'Donald Duck'],
      examplesEn: ['Spider-Man', 'Batman', 'Wonder Woman', 'Iron Man', ' Wolverine'],
    },
    {
      id: 17,
      mode: 'CATEGORY',
      de: 'Beim Camping & Zelten',
      en: 'Camping & Outdoors',
      hintDe: 'Ausrüstung für eine Nacht in der Natur',
      hintEn: 'Gear for a night out in nature',
      examplesDe: ['Schlafsack', 'Taschenlampe', 'Gaskocher', 'Isomatte', 'Lagerfeuer'],
      examplesEn: ['Sleeping Bag', 'Flashlight', 'Campfire', 'Tent', 'Thermos'],
    },
    {
      id: 18,
      mode: 'CATEGORY',
      de: 'Hauptstädte der Welt',
      en: 'World Capitals',
      hintDe: 'Nenne eine Hauptstadt eines Landes',
      hintEn: 'Name any national capital city',
      examplesDe: ['Berlin', 'Tokio', 'Paris', 'Rom', 'Ottawa'],
      examplesEn: ['Berlin', 'Tokyo', 'Paris', 'Rome', 'Ottawa'],
    },
    {
      id: 19,
      mode: 'CATEGORY',
      de: 'Dinge mit Tasten oder Knöpfen',
      en: 'Things with Keys or Buttons',
      hintDe: 'Geräte, Kleidung oder Instrumente zum Drücken',
      hintEn: 'Devices, clothing, or instruments you press',
      examplesDe: ['Fernbedienung', 'Taschenrechner', 'Hemd', 'Aufzug', 'Gamecontroller'],
      examplesEn: ['Remote Control', 'Calculator', 'Shirt', 'Elevator', 'Controller'],
    },
    {
      id: 20,
      mode: 'CATEGORY',
      de: 'Im Krankenhaus / Beim Arzt',
      en: 'At the Hospital / Doctor',
      hintDe: 'Medizinische Dinge und Begriffe',
      hintEn: 'Medical items and terms',
      examplesDe: ['Stethoskop', 'Pflaster', 'Röntgenbild', 'Fieberthermometer', 'Rollstuhl'],
      examplesEn: ['Stethoscope', 'Bandage', 'X-Ray', 'Thermometer', 'Wheelchair'],
    },
    {
      id: 21,
      mode: 'CATEGORY',
      de: 'Märchen & Fabelwesen',
      en: 'Fairy Tales & Mythical Creatures',
      hintDe: 'Magische Figuren oder bekannte Märchen',
      hintEn: 'Magical creatures or famous fairy tales',
      examplesDe: ['Einhorn', 'Drache', 'Aschenputtel', 'Meerjungfrau', 'Rumpelstilzchen'],
      examplesEn: ['Unicorn', 'Dragon', 'Cinderella', 'Mermaid', 'Phoenix'],
    },
    {
      id: 22,
      mode: 'CATEGORY',
      de: 'Dinge im Werkzeugkasten',
      en: 'Things in a Toolbox',
      hintDe: 'Werkzeuge zum Bauen und Reparieren',
      hintEn: 'Tools used for building and repairing',
      examplesDe: ['Schraubenzieher', 'Wasserwaage', 'Zange', 'Hammer', 'Zollstock'],
      examplesEn: ['Screwdriver', 'Spirit Level', 'Pliers', 'Hammer', 'Tape Measure'],
    },
    {
      id: 23,
      mode: 'CATEGORY',
      de: 'Frühstückstisch',
      en: 'On the Breakfast Table',
      hintDe: 'Was isst oder trinkt man morgens?',
      hintEn: 'What do you eat or drink in the morning?',
      examplesDe: ['Croissant', 'Marmelade', 'Rührei', 'Orangensaft', 'Müsli'],
      examplesEn: ['Croissant', 'Jam', 'Scrambled Eggs', 'Orange Juice', 'Pancakes'],
    },
    {
      id: 24,
      mode: 'CATEGORY',
      de: 'Tiere im Zoo / auf Safari',
      en: 'Zoo & Safari Animals',
      hintDe: 'Exotische und wilde Tiere',
      hintEn: 'Exotic and wild animals',
      examplesDe: ['Giraffe', 'Erdmännchen', 'Flamingo', 'Nashorn', 'Känguru'],
      examplesEn: ['Giraffe', 'Meerkat', 'Flamingo', 'Rhino', 'Kangaroo'],
    },
    {
      id: 25,
      mode: 'CATEGORY',
      de: 'Dinge im Weltraum',
      en: 'Things in Outer Space',
      hintDe: 'Astronomie, Raumfahrt und Himmelskörper',
      hintEn: 'Astronomy, space travel, and celestial bodies',
      examplesDe: ['Satellit', 'Schwarzes Loch', 'Milchstraße', 'Astronaut', 'Komet'],
      examplesEn: ['Satellite', 'Black Hole', 'Milky Way', 'Astronaut', 'Comet'],
    },
    {
      id: 26,
      mode: 'CATEGORY',
      de: 'Kleidungsstücke für den Winter',
      en: 'Winter Clothing',
      hintDe: 'Was hält bei Schnee und Kälte warm?',
      hintEn: 'What keeps you warm in snow and freezing weather?',
      examplesDe: ['Wollmütze', 'Fäustlinge', 'Daunenjacke', 'Schal', 'Thermosocken'],
      examplesEn: ['Beanie', 'Mittens', 'Parka', 'Scarf', 'Thermal Socks'],
    },
    {
      id: 27,
      mode: 'CATEGORY',
      de: 'Brett- & Kartenspiele',
      en: 'Board & Card Games',
      hintDe: 'Klassiker für den Spieleabend',
      hintEn: 'Classics for game night',
      examplesDe: ['Schach', 'Monopoly', 'Uno', 'Kniffel', 'Mensch ärgere Dich nicht'],
      examplesEn: ['Chess', 'Monopoly', 'Uno', 'Scrabble', 'Catan'],
    },
    {
      id: 28,
      mode: 'CATEGORY',
      de: 'Dinge, die rot sind',
      en: 'Things That Are Red',
      hintDe: 'Früchte, Objekte oder Zeichen in Rot',
      hintEn: 'Fruits, objects, or signs that are red',
      examplesDe: ['Feuerwehrauto', 'Erdbeere', 'Stoppschild', 'Marienkäfer', 'Tomate'],
      examplesEn: ['Fire Truck', 'Strawberry', 'Stop Sign', 'Ladybug', 'Tomato'],
    },
    {
      id: 29,
      mode: 'CATEGORY',
      de: 'Auf einer Hochzeit',
      en: 'At a Wedding',
      hintDe: 'Traditionen, Gäste und Dinge bei einer Heirat',
      hintEn: 'Traditions, guests, and items at a wedding',
      examplesDe: ['Brautstrauß', 'Eheringe', 'Hochzeitstorte', 'Schleier', 'Trauzeuge'],
      examplesEn: ['Bouquet', 'Wedding Rings', 'Wedding Cake', 'Veil', 'Best Man'],
    },
    {
      id: 30,
      mode: 'CATEGORY',
      de: 'Im Büro / Auf dem Schreibtisch',
      en: 'In the Office / On a Desk',
      hintDe: 'Büromaterial und Arbeitsgeräte',
      hintEn: 'Office supplies and work equipment',
      examplesDe: ['Tacker', 'Büroklammer', 'Textmarker', 'Aktenordner', 'Locher'],
      examplesEn: ['Stapler', 'Paperclip', 'Highlighter', 'Folder', 'Hole Punch'],
    },
    {
      id: 31,
      mode: 'CATEGORY',
      de: 'Gewürze & Kräuter',
      en: 'Spices & Herbs',
      hintDe: 'Was gibt dem Essen Geschmack?',
      hintEn: 'What adds flavor to food?',
      examplesDe: ['Zimt', 'Rosmarin', 'Curry', 'Muskatnuss', 'Schnittlauch'],
      examplesEn: ['Cinnamon', 'Rosemary', 'Curry', 'Nutmeg', 'Chives'],
    },
    {
      id: 32,
      mode: 'CATEGORY',
      de: 'Im Kino',
      en: 'At the Movie Theater',
      hintDe: 'Alles rund um den Kinobesuch',
      hintEn: 'Everything around going to the cinema',
      examplesDe: ['Popcorn', 'Leinwand', 'Nachos', 'Filmprojektor', 'Logenplatz'],
      examplesEn: ['Popcorn', 'Big Screen', 'Nachos', 'Projector', 'Trailer'],
    },
    {
      id: 33,
      mode: 'CATEGORY',
      de: 'Dinge, die Strom brauchen',
      en: 'Things That Need Electricity',
      hintDe: 'Geräte mit Stecker oder Akku',
      hintEn: 'Appliances with a plug or battery',
      examplesDe: ['Staubsauger', 'Waschmaschine', 'Smartphone', 'Mikrowelle', 'Bohrmaschine'],
      examplesEn: ['Vacuum Cleaner', 'Washing Machine', 'Smartphone', 'Microwave', 'Drill'],
    },
    {
      id: 34,
      mode: 'CATEGORY',
      de: 'Im Wald',
      en: 'In the Forest',
      hintDe: 'Pflanzen, Tiere und Dinge beim Waldspaziergang',
      hintEn: 'Plants, animals, and things seen on a forest walk',
      examplesDe: ['Tannenzapfen', 'Eichhörnchen', 'Moos', 'Fliegenpilz', 'Specht'],
      examplesEn: ['Pinecone', 'Squirrel', 'Moss', 'Mushroom', 'Woodpecker'],
    },
    {
      id: 35,
      mode: 'CATEGORY',
      de: 'Getränke ohne Alkohol',
      en: 'Non-Alcoholic Drinks',
      hintDe: 'Erfrischungen, Säfte und Heißgetränke',
      hintEn: 'Refreshments, juices, and hot drinks',
      examplesDe: ['Apfelschorle', 'Eistee', 'Kakao', 'Limonade', 'Cappuccino'],
      examplesEn: ['Lemonade', 'Iced Tea', 'Hot Cocoa', 'Smoothie', 'Espresso'],
    },
    {
      id: 36,
      mode: 'CATEGORY',
      de: 'Automarken',
      en: 'Car Brands',
      hintDe: 'Hersteller von Autos aus aller Welt',
      hintEn: 'Automobile manufacturers from around the world',
      examplesDe: ['Porsche', 'Mercedes', 'Toyota', 'Ferrari', 'Volvo'],
      examplesEn: ['Porsche', 'Mercedes', 'Toyota', 'Ferrari', 'Volvo'],
    },
    {
      id: 37,
      mode: 'CATEGORY',
      de: 'Dinge im Handtaschen-Chaos',
      en: 'Things Inside a Handbag',
      hintDe: 'Was trägt man unterwegs in der Tasche mit sich?',
      hintEn: 'What do people carry around in a purse or bag?',
      examplesDe: ['Schlüsselbund', 'Lippenstift', 'Kaugummi', 'Geldbörse', 'Taschentücher'],
      examplesEn: ['Keychain', 'Lipstick', 'Chewing Gum', 'Wallet', 'Tissues'],
    },
    {
      id: 38,
      mode: 'CATEGORY',
      de: 'Unter Wasser / Im Ozean',
      en: 'Underwater / In the Ocean',
      hintDe: 'Meeresbewohner und Dinge am Meeresgrund',
      hintEn: 'Sea creatures and things on the ocean floor',
      examplesDe: ['Seepferdchen', 'Korallenriff', 'U-Boot', 'Qualle', 'Schatztruhe'],
      examplesEn: ['Seahorse', 'Coral Reef', 'Submarine', 'Jellyfish', 'Treasure Chest'],
    },
    {
      id: 39,
      mode: 'CATEGORY',
      de: 'Auf einer Geburtstagsparty',
      en: 'At a Birthday Party',
      hintDe: 'Deko, Stimmung und Geschenke',
      hintEn: 'Decorations, treats, and gifts',
      examplesDe: ['Luftballons', 'Konfetti', 'Geburtstagskerzen', 'Girlande', 'Geschenkpapier'],
      examplesEn: ['Balloons', 'Confetti', 'Birthday Candles', 'Party Hat', 'Wrapping Paper'],
    },
    {
      id: 40,
      mode: 'CATEGORY',
      de: 'Wetterphänomene',
      en: 'Weather Phenomena',
      hintDe: 'Stürme, Niederschlag und Himmelserscheinungen',
      hintEn: 'Storms, precipitation, and sky events',
      examplesDe: ['Regenbogen', 'Hagel', 'Gewitter', 'Nebel', 'Wirbelsturm'],
      examplesEn: ['Rainbow', 'Hail', 'Thunderstorm', 'Fog', 'Tornado'],
    },
    {
      id: 41,
      mode: 'CATEGORY',
      de: 'Obst & Beeren',
      en: 'Fruits & Berries',
      hintDe: 'Süße Früchte aus Garten und Tropen',
      hintEn: 'Sweet fruits from orchards and the tropics',
      examplesDe: ['Himbeere', 'Mango', 'Kirsche', 'Ananas', 'Granatapfel'],
      examplesEn: ['Raspberry', 'Mango', 'Cherry', 'Pineapple', 'Pomegranate'],
    },
    {
      id: 42,
      mode: 'CATEGORY',
      de: 'Gemüsesorten',
      en: 'Vegetables',
      hintDe: 'Knackiges aus dem Gemüsebeet',
      hintEn: 'Crunchy produce from the garden',
      examplesDe: ['Brokkoli', 'Zucchini', 'Paprika', 'Blumenkohl', 'Karotte'],
      examplesEn: ['Broccoli', 'Zucchini', 'Bell Pepper', 'Cauliflower', 'Carrot'],
    },
    {
      id: 43,
      mode: 'CATEGORY',
      de: 'Im Mittelalter / Auf einer Burg',
      en: 'Middle Ages / At a Castle',
      hintDe: 'Ritter, Burgen und historische Begriffe',
      hintEn: 'Knights, castles, and medieval terms',
      examplesDe: ['Zugbrücke', 'Ritterrüstung', 'Katapult', 'Burggraben', 'Schwert'],
      examplesEn: ['Drawbridge', 'Armor', 'Catapult', 'Moat', 'Sword'],
    },
    {
      id: 44,
      mode: 'CATEGORY',
      de: 'Dinge, die gut riechen',
      en: 'Things That Smell Good',
      hintDe: 'Düfte, Blumen oder frisch Zubereitetes',
      hintEn: 'Scents, flowers, or freshly made treats',
      examplesDe: ['Frischer Kaffee', 'Lavendel', 'Parfüm', 'Vanillekipferl', 'Rosenblüte'],
      examplesEn: ['Fresh Coffee', 'Lavender', 'Perfume', 'Cinnamon Rolls', 'Rose'],
    },
    {
      id: 45,
      mode: 'CATEGORY',
      de: 'Insekten & Krabbeltiere',
      en: 'Insects & Creepy-Crawlies',
      hintDe: 'Kleine Sechs- oder Achtbeiner',
      hintEn: 'Small six- or eight-legged creatures',
      examplesDe: ['Schmetterling', 'Hummel', 'Ameise', 'Grashüpfer', 'Glühwürmchen'],
      examplesEn: ['Butterfly', 'Bumblebee', 'Ant', 'Grasshopper', 'Firefly'],
    },
    {
      id: 46,
      mode: 'CATEGORY',
      de: 'Beim Friseur',
      en: 'At the Hair Salon',
      hintDe: 'Frisuren und Friseur-Zubehör',
      hintEn: 'Hairstyles and salon tools',
      examplesDe: ['Lockenwickler', 'Haarschere', 'Kamm', 'Haarspray', 'Rasierer'],
      examplesEn: ['Curlers', 'Scissors', 'Comb', 'Hairspray', 'Clippers'],
    },
    {
      id: 47,
      mode: 'CATEGORY',
      de: 'In der Bäckerei',
      en: 'At the Bakery',
      hintDe: 'Backwaren, Brote und süße Teilchen',
      hintEn: 'Pastries, breads, and sweet treats',
      examplesDe: ['Laugenbrezel', 'Franzbrötchen', 'Sauerteigbrot', 'Berliner', 'Apfelstrudel'],
      examplesEn: ['Pretzel', 'Cinnamon Bun', 'Sourdough', 'Donut', 'Apple Strudel'],
    },
    {
      id: 48,
      mode: 'CATEGORY',
      de: 'Dinge mit Rädern',
      en: 'Things with Wheels',
      hintDe: 'Fahrzeuge und rollende Gegenstände',
      hintEn: 'Vehicles and rolling objects',
      examplesDe: ['Skateboard', 'Schubkarre', 'Kinderwagen', 'Inlineskates', 'Koffer'],
      examplesEn: ['Skateboard', 'Wheelbarrow', 'Stroller', 'Rollerblades', 'Suitcase'],
    },
    {
      id: 49,
      mode: 'CATEGORY',
      de: 'Weihnachten & Advent',
      en: 'Christmas & Holidays',
      hintDe: 'Festliche Begriffe zur Weihnachtszeit',
      hintEn: 'Festive terms for the holiday season',
      examplesDe: ['Adventskranz', 'Lebkuchen', 'Lametta', 'Nussknacker', 'Rentier'],
      examplesEn: ['Wreath', 'Gingerbread', 'Tinsel', 'Nutcracker', 'Reindeer'],
    },
    {
      id: 50,
      mode: 'CATEGORY',
      de: 'Auf einem Piratenschiff',
      en: 'On a Pirate Ship',
      hintDe: 'Seeräuber, Schätze und Schiffsbegriffe',
      hintEn: 'Buccaneers, treasure, and ship terms',
      examplesDe: ['Augenklappe', 'Holzbein', 'Schatzkarte', 'Papagei', 'Kanonenkugel'],
      examplesEn: ['Eyepatch', 'Peg Leg', 'Treasure Map', 'Parrot', 'Cannonball'],
    },
    {
      id: 51,
      mode: 'CATEGORY',
      de: 'Körperteile & Organe',
      en: 'Body Parts & Organs',
      hintDe: 'Anatomie des Menschen',
      hintEn: 'Human anatomy',
      examplesDe: ['Ellbogen', 'Schlüsselbein', 'Lunge', 'Augenbraue', 'Kniescheibe'],
      examplesEn: ['Elbow', 'Collarbone', 'Lungs', 'Eyebrow', 'Kneecap'],
    },
    {
      id: 52,
      mode: 'CATEGORY',
      de: 'Dinge aus Holz',
      en: 'Things Made of Wood',
      hintDe: 'Gegenstände, die typischerweise aus Holz bestehen',
      hintEn: 'Objects typically crafted from wood',
      examplesDe: ['Schaukelstuhl', 'Zahnstocher', 'Kochlöffel', 'Parkettboden', 'Bleistift'],
      examplesEn: ['Rocking Chair', 'Toothpick', 'Wooden Spoon', 'Chessboard', 'Pencil'],
    },
    {
      id: 53,
      mode: 'CATEGORY',
      de: 'Im Freizeitpark',
      en: 'At the Theme Park',
      hintDe: 'Attraktionen und Erlebnisse im Erlebnispark',
      hintEn: 'Attractions and experiences at an amusement park',
      examplesDe: ['Wildwasserbahn', 'Freifallturm', 'Maskottchen', 'Kettenkarussell', 'Achterbahn'],
      examplesEn: ['Log Flume', 'Drop Tower', 'Mascot', 'Swing Ride', 'Rollercoaster'],
    },
    {
      id: 54,
      mode: 'CATEGORY',
      de: 'Süßigkeiten & Snacks',
      en: 'Candy & Snacks',
      hintDe: 'Naschereien für den Filmabend',
      hintEn: 'Treats for a cozy movie night',
      examplesDe: ['Gummibärchen', 'Kartoffelchips', 'Lakritz', 'Schokoriegel', 'Salzstangen'],
      examplesEn: ['Gummy Bears', 'Potato Chips', 'Licorice', 'Chocolate Bar', 'Pretzel Sticks'],
    },
    {
      id: 55,
      mode: 'CATEGORY',
      de: 'Am Flughafen & Im Flugzeug',
      en: 'At the Airport & On a Plane',
      hintDe: 'Alles rund ums Fliegen und Verreisen',
      hintEn: 'Everything related to flying and air travel',
      examplesDe: ['Bordkarte', 'Schwimmweste', 'Rollfeld', 'Handgepäck', 'Tower'],
      examplesEn: ['Boarding Pass', 'Life Vest', 'Runway', 'Carry-on', 'Control Tower'],
    },
    {
      id: 56,
      mode: 'CATEGORY',
      de: 'Hunderassen',
      en: 'Dog Breeds',
      hintDe: 'Bekannte Vierbeiner vom Dackel bis zur Dogge',
      hintEn: 'Famous canine breeds big and small',
      examplesDe: ['Dackel', 'Golden Retriever', 'Dalmatiner', 'Mops', 'Schäferhund'],
      examplesEn: ['Dachshund', 'Golden Retriever', 'Dalmatian', 'Pug', 'Poodle'],
    },
    {
      id: 57,
      mode: 'CATEGORY',
      de: 'Dinge, die man abschließen kann',
      en: 'Things You Can Lock',
      hintDe: 'Mit Schlüssel, Zahlencode oder Passwort',
      hintEn: 'With a key, combination, or password',
      examplesDe: ['Fahrradschloss', 'Tresor', 'Tagebuch', 'Haustür', 'Spind'],
      examplesEn: ['Bike Lock', 'Safe', 'Diary', 'Front Door', 'Locker'],
    },
    {
      id: 58,
      mode: 'CATEGORY',
      de: 'Im Wohnzimmer',
      en: 'In the Living Room',
      hintDe: 'Möbel und gemütliche Einrichtung',
      hintEn: 'Furniture and cozy home decor',
      examplesDe: ['Kuscheldecke', 'Stehlampe', 'Couchtisch', 'Bücherregal', 'Kamin'],
      examplesEn: ['Throw Blanket', 'Floor Lamp', 'Coffee Table', 'Bookshelf', 'Fireplace'],
    },
    {
      id: 59,
      mode: 'CATEGORY',
      de: 'Blumen & Zimmerpflanzen',
      en: 'Flowers & Houseplants',
      hintDe: 'Blüten im Strauß oder auf der Fensterbank',
      hintEn: 'Blooms in a bouquet or on the windowsill',
      examplesDe: ['Sonnenblume', 'Orchidee', 'Kaktus', 'Tulpe', 'Gänseblümchen'],
      examplesEn: ['Sunflower', 'Orchid', 'Cactus', 'Tulip', 'Daisy'],
    },
    {
      id: 60,
      mode: 'CATEGORY',
      de: 'Vögel',
      en: 'Birds',
      hintDe: 'Singvögel, Greifvögel oder Wasservögel',
      hintEn: 'Songbirds, birds of prey, or waterfowl',
      examplesDe: ['Rotkehlchen', 'Pinguin', 'Pfau', 'Kolibri', 'Storch'],
      examplesEn: ['Robin', 'Penguin', 'Peacock', 'Hummingbird', 'Stork'],
    },
    {
      id: 61,
      mode: 'CATEGORY',
      de: 'Dinge, die schmelzen können',
      en: 'Things That Can Melt',
      hintDe: 'Bei Hitze oder Sonnenschein',
      hintEn: 'When exposed to heat or sunshine',
      examplesDe: ['Schneemann', 'Kerzenwachs', 'Eiswürfel', 'Butter', 'Schokolade'],
      examplesEn: ['Snowman', 'Candle Wax', 'Ice Cube', 'Butter', 'Chocolate'],
    },
    {
      id: 62,
      mode: 'CATEGORY',
      de: 'Berühmte Sehenswürdigkeiten',
      en: 'Famous Landmarks',
      hintDe: 'Bauwerke und Wahrzeichen weltweit',
      hintEn: 'Monuments and landmarks around the world',
      examplesDe: ['Eiffelturm', 'Freiheitsstatue', 'Kolosseum', 'Taj Mahal', 'Big Ben'],
      examplesEn: ['Eiffel Tower', 'Statue of Liberty', 'Colosseum', 'Taj Mahal', 'Big Ben'],
    },
    {
      id: 63,
      mode: 'CATEGORY',
      de: 'Ausreden beim Zuspätkommen',
      en: 'Excuses for Being Late',
      hintDe: 'Warum hat man es nicht pünktlich geschafft?',
      hintEn: 'Why did someone not make it on time?',
      examplesDe: ['Verschlafen', 'Stau', 'Zugausfall', 'Platter Reifen', 'Schlüssel gesucht'],
      examplesEn: ['Overslept', 'Traffic Jam', 'Train Delay', 'Flat Tire', 'Lost Keys'],
    },
    {
      id: 64,
      mode: 'CATEGORY',
      de: 'Im Museum',
      en: 'At the Museum',
      hintDe: 'Ausstellungsstücke, Kunst und Geschichte',
      hintEn: 'Exhibits, art, and history',
      examplesDe: ['Ölgemälde', 'Dinosaurierskelett', 'Statue', 'Mumie', 'Audioguide'],
      examplesEn: ['Oil Painting', 'Dinosaur Skeleton', 'Sculpture', 'Mummy', 'Audio Guide'],
    },
    {
      id: 65,
      mode: 'CATEGORY',
      de: 'Halloween & Grusel-Nacht',
      en: 'Halloween & Spooky Night',
      hintDe: 'Gruselige Deko, Kostüme und Figuren',
      hintEn: 'Spooky decorations, costumes, and creatures',
      examplesDe: ['Kürbislaterne', 'Spinnennetz', 'Vampir', 'Fledermaus', 'Hexenhut'],
      examplesEn: ['Jack-o-Lantern', 'Cobweb', 'Vampire', 'Bat', 'Witch Hat'],
    },

    // 🔤 TICK (15 SILBEN AM WORTANFANG / START OF WORD: IDs 66–80)
    {
      id: 66,
      mode: 'TICK',
      de: 'SCHUL...',
      en: 'SUN...',
      hintDe: 'TICK: Das Wort muss mit „SCHUL“ beginnen!',
      hintEn: 'TICK: The word must start with "SUN"!',
      examplesDe: ['Schultasche', 'Schulhof', 'Schulbus', 'Schulferien', 'Schulbank'],
      examplesEn: ['Sunflower', 'Sunshine', 'Sunglasses', 'Sunset', 'Sunday'],
    },
    {
      id: 67,
      mode: 'TICK',
      de: 'VER...',
      en: 'RE...',
      hintDe: 'TICK: Das Wort muss mit „VER“ beginnen!',
      hintEn: 'TICK: The word must start with "RE"!',
      examplesDe: ['Versprechen', 'Verkehr', 'Versteck', 'Verband', 'Vertrag'],
      examplesEn: ['Replay', 'Return', 'Respect', 'Remote', 'Recipe'],
    },
    {
      id: 68,
      mode: 'TICK',
      de: 'AUF...',
      en: 'OVER...',
      hintDe: 'TICK: Das Wort muss mit „AUF“ beginnen!',
      hintEn: 'TICK: The word must start with "OVER"!',
      examplesDe: ['Aufzug', 'Aufgabe', 'Auftritt', 'Auflauf', 'Aufkleber'],
      examplesEn: ['Overtime', 'Overcoat', 'Overlook', 'Overflow', 'Overnight'],
    },
    {
      id: 69,
      mode: 'TICK',
      de: 'WASSER...',
      en: 'WATER...',
      hintDe: 'TICK: Das Wort muss mit „WASSER“ beginnen!',
      hintEn: 'TICK: The word must start with "WATER"!',
      examplesDe: ['Wasserfall', 'Wasserball', 'Wassermelone', 'Wasserhahn', 'Wasserkocher'],
      examplesEn: ['Waterfall', 'Watermelon', 'Waterproof', 'Watercolor', 'Waterslide'],
    },
    {
      id: 70,
      mode: 'TICK',
      de: 'HAUS...',
      en: 'BOOK...',
      hintDe: 'TICK: Das Wort muss mit „HAUS“ beginnen!',
      hintEn: 'TICK: The word must start with "BOOK"!',
      examplesDe: ['Haustür', 'Haustier', 'Hausmeister', 'Hausaufgabe', 'Hausschuhe'],
      examplesEn: ['Bookshelf', 'Bookmark', 'Bookstore', 'Bookworm', 'Booklet'],
    },
    {
      id: 71,
      mode: 'TICK',
      de: 'VOR...',
      en: 'PRE...',
      hintDe: 'TICK: Das Wort muss mit „VOR“ beginnen!',
      hintEn: 'TICK: The word must start with "PRE"!',
      examplesDe: ['Vorhang', 'Vorschlag', 'Vorspeise', 'Vorbild', 'Vorfahrt'],
      examplesEn: ['Preview', 'Predict', 'Prepare', 'Present', 'Prefix'],
    },
    {
      id: 72,
      mode: 'TICK',
      de: 'SOMMER...',
      en: 'SNOW...',
      hintDe: 'TICK: Das Wort muss mit „SOMMER“ beginnen!',
      hintEn: 'TICK: The word must start with "SNOW"!',
      examplesDe: ['Sommerfest', 'Sommernacht', 'Sommerregen', 'Sommersprossen', 'Sommerzeit'],
      examplesEn: ['Snowman', 'Snowflake', 'Snowboard', 'Snowstorm', 'Snowball'],
    },
    {
      id: 73,
      mode: 'TICK',
      de: 'AB...',
      en: 'UN...',
      hintDe: 'TICK: Das Wort muss mit „AB“ beginnen!',
      hintEn: 'TICK: The word must start with "UN"!',
      examplesDe: ['Abenteuer', 'Abfahrt', 'Abschied', 'Abendessen', 'Abkürzung'],
      examplesEn: ['Unlock', 'Unfair', 'Unpack', 'Unknown', 'Undo'],
    },
    {
      id: 74,
      mode: 'TICK',
      de: 'HAND...',
      en: 'HAND...',
      hintDe: 'TICK: Das Wort muss mit „HAND“ beginnen!',
      hintEn: 'TICK: The word must start with "HAND"!',
      examplesDe: ['Handschuh', 'Handtuch', 'Handgelenk', 'Handtasche', 'Handwerk'],
      examplesEn: ['Handshake', 'Handbag', 'Handmade', 'Handwriting', 'Handlebar'],
    },
    {
      id: 75,
      mode: 'TICK',
      de: 'NACHT...',
      en: 'NIGHT...',
      hintDe: 'TICK: Das Wort muss mit „NACHT“ beginnen!',
      hintEn: 'TICK: The word must start with "NIGHT"!',
      examplesDe: ['Nachtisch', 'Nachthemd', 'Nachtschicht', 'Nachtigall', 'Nachttisch'],
      examplesEn: ['Nightmare', 'Nightfall', 'Nightclub', 'Nightgown', 'Nightingale'],
    },
    {
      id: 76,
      mode: 'TICK',
      de: 'FEUER...',
      en: 'FIRE...',
      hintDe: 'TICK: Das Wort muss mit „FEUER“ beginnen!',
      hintEn: 'TICK: The word must start with "FIRE"!',
      examplesDe: ['Feuerwerk', 'Feuerwehr', 'Feuerzeug', 'Feuerlöscher', 'Feuerstelle'],
      examplesEn: ['Fireworks', 'Firefighter', 'Fireplace', 'Firefly', 'Firewood'],
    },
    {
      id: 77,
      mode: 'TICK',
      de: 'LUFT...',
      en: 'AIR...',
      hintDe: 'TICK: Das Wort muss mit „LUFT“ beginnen!',
      hintEn: 'TICK: The word must start with "AIR"!',
      examplesDe: ['Luftballon', 'Luftmatratze', 'Luftpost', 'Luftschloss', 'Luftfahrt'],
      examplesEn: ['Airplane', 'Airport', 'Airbag', 'Airline', 'Airship'],
    },
    {
      id: 78,
      mode: 'TICK',
      de: 'GOLD...',
      en: 'SEA...',
      hintDe: 'TICK: Das Wort muss mit „GOLD“ beginnen!',
      hintEn: 'TICK: The word must start with "SEA"!',
      examplesDe: ['Goldfisch', 'Goldschatz', 'Goldmedaille', 'Goldkette', 'Goldgrube'],
      examplesEn: ['Seahorse', 'Seagull', 'Seashell', 'Seafood', 'Seashore'],
    },
    {
      id: 79,
      mode: 'TICK',
      de: 'REISE...',
      en: 'OUT...',
      hintDe: 'TICK: Das Wort muss mit „REISE“ beginnen!',
      hintEn: 'TICK: The word must start with "OUT"!',
      examplesDe: ['Reisepass', 'Reisekoffer', 'Reisebüro', 'Reisefieber', 'Reiseziel'],
      examplesEn: ['Outside', 'Outline', 'Outdoors', 'Outfit', 'Outcome'],
    },
    {
      id: 80,
      mode: 'TICK',
      de: 'KINDER...',
      en: 'STAR...',
      hintDe: 'TICK: Das Wort muss mit „KINDER“ beginnen!',
      hintEn: 'TICK: The word must start with "STAR"!',
      examplesDe: ['Kindergarten', 'Kinderwagen', 'Kinderzimmer', 'Kinderbuch', 'Kinderlied'],
      examplesEn: ['Starlight', 'Starfish', 'Stardust', 'Starship', 'Starter'],
    },

    // 🔚 TACK (14 SILBEN AM WORTENDE / END OF WORD: IDs 81–94)
    {
      id: 81,
      mode: 'TACK',
      de: '...UNG',
      en: '...ING',
      hintDe: 'TACK: Das Wort muss auf „UNG“ enden!',
      hintEn: 'TACK: The word must end with "ING"!',
      examplesDe: ['Zeitung', 'Heizung', 'Wohnung', 'Hoffnung', 'Landung'],
      examplesEn: ['Running', 'Morning', 'Painting', 'Building', 'Lightning'],
    },
    {
      id: 82,
      mode: 'TACK',
      de: '...HEIT',
      en: '...NESS',
      hintDe: 'TACK: Das Wort muss auf „HEIT“ enden!',
      hintEn: 'TACK: The word must end with "NESS"!',
      examplesDe: ['Freiheit', 'Gesundheit', 'Wahrheit', 'Sicherheit', 'Schönheit'],
      examplesEn: ['Kindness', 'Darkness', 'Fitness', 'Happiness', 'Witness'],
    },
    {
      id: 83,
      mode: 'TACK',
      de: '...ER',
      en: '...ER',
      hintDe: 'TACK: Das Wort muss auf „ER“ enden!',
      hintEn: 'TACK: The word must end with "ER"!',
      examplesDe: ['Fenster', 'Bäcker', 'Sommer', 'Wecker', 'Koffer'],
      examplesEn: ['Teacher', 'Summer', 'Thunder', 'Player', 'Toaster'],
    },
    {
      id: 84,
      mode: 'TACK',
      de: '...SCHAFT',
      en: '...TION',
      hintDe: 'TACK: Das Wort muss auf „SCHAFT“ enden!',
      hintEn: 'TACK: The word must end with "TION"!',
      examplesDe: ['Freundschaft', 'Mannschaft', 'Landschaft', 'Wissenschaft', 'Botschaft'],
      examplesEn: ['Station', 'Action', 'Vacation', 'Motion', 'Celebration'],
    },
    {
      id: 85,
      mode: 'TACK',
      de: '...CHEN',
      en: '...MENT',
      hintDe: 'TACK: Das Wort muss auf „CHEN“ enden!',
      hintEn: 'TACK: The word must end with "MENT"!',
      examplesDe: ['Märchen', 'Brötchen', 'Kätzchen', 'Kuchen', 'Lachen'],
      examplesEn: ['Moment', 'Apartment', 'Element', 'Document', 'Movement'],
    },
    {
      id: 86,
      mode: 'TACK',
      de: '...BAR',
      en: '...ABLE',
      hintDe: 'TACK: Das Wort muss auf „BAR“ enden!',
      hintEn: 'TACK: The word must end with "ABLE"!',
      examplesDe: ['Wunderbar', 'Essbar', 'Nachbar', 'Sichtbar', 'Dankbar'],
      examplesEn: ['Table', 'Comfortable', 'Washable', 'Cable', 'Reliable'],
    },
    {
      id: 87,
      mode: 'TACK',
      de: '...KEIT',
      en: '...FUL',
      hintDe: 'TACK: Das Wort muss auf „KEIT“ enden!',
      hintEn: 'TACK: The word must end with "FUL"!',
      examplesDe: ['Geschwindigkeit', 'Möglichkeit', 'Süßigkeit', 'Aufmerksamkeit', 'Ehrlichkeit'],
      examplesEn: ['Colorful', 'Helpful', 'Wonderful', 'Peaceful', 'Powerful'],
    },
    {
      id: 88,
      mode: 'TACK',
      de: '...LOS',
      en: '...LESS',
      hintDe: 'TACK: Das Wort muss auf „LOS“ enden!',
      hintEn: 'TACK: The word must end with "LESS"!',
      examplesDe: ['Sprachlos', 'Wolkenlos', 'Schwerelos', 'Endlos', 'Furchtlos'],
      examplesEn: ['Fearless', 'Wireless', 'Endless', 'Careless', 'Weightless'],
    },
    {
      id: 89,
      mode: 'TACK',
      de: '...WERK',
      en: '...WORK',
      hintDe: 'TACK: Das Wort muss auf „WERK“ enden!',
      hintEn: 'TACK: The word must end with "WORK"!',
      examplesDe: ['Feuerwerk', 'Handwerk', 'Kunstwerk', 'Netzwerk', 'Kraftwerk'],
      examplesEn: ['Homework', 'Teamwork', 'Network', 'Artwork', 'Clockwork'],
    },
    {
      id: 90,
      mode: 'TACK',
      de: '...PLATZ',
      en: '...LAND',
      hintDe: 'TACK: Das Wort muss auf „PLATZ“ enden!',
      hintEn: 'TACK: The word must end with "LAND"!',
      examplesDe: ['Spielplatz', 'Marktplatz', 'Parkplatz', 'Sportplatz', 'Campingplatz'],
      examplesEn: ['Island', 'Wonderland', 'Homeland', 'Farmland', 'Highland'],
    },
    {
      id: 91,
      mode: 'TACK',
      de: '...SCHUH',
      en: '...BALL',
      hintDe: 'TACK: Das Wort muss auf „SCHUH“ enden!',
      hintEn: 'TACK: The word must end with "BALL"!',
      examplesDe: ['Handschuh', 'Hausschuh', 'Turnschuh', 'Schlittschuh', 'Wanderschuhe'],
      examplesEn: ['Football', 'Basketball', 'Snowball', 'Pinball', 'Volleyball'],
    },
    {
      id: 92,
      mode: 'TACK',
      de: '...ZEUG',
      en: '...SHIP',
      hintDe: 'TACK: Das Wort muss auf „ZEUG“ enden!',
      hintEn: 'TACK: The word must end with "SHIP"!',
      examplesDe: ['Flugzeug', 'Spielzeug', 'Werkzeug', 'Schlagzeug', 'Feuerzeug'],
      examplesEn: ['Friendship', 'Spaceship', 'Championship', 'Scholarship', 'Airship'],
    },
    {
      id: 93,
      mode: 'TACK',
      de: '...ZIMMER',
      en: '...ROOM',
      hintDe: 'TACK: Das Wort muss auf „ZIMMER“ enden!',
      hintEn: 'TACK: The word must end with "ROOM"!',
      examplesDe: ['Wohnzimmer', 'Badezimmer', 'Schlafzimmer', 'Klassenzimmer', 'Wartezimmer'],
      examplesEn: ['Bedroom', 'Bathroom', 'Classroom', 'Mushroom', 'Showroom'],
    },
    {
      id: 94,
      mode: 'TACK',
      de: '...BAUM',
      en: '...WOOD',
      hintDe: 'TACK: Das Wort muss auf „BAUM“ enden!',
      hintEn: 'TACK: The word must end with "WOOD"!',
      examplesDe: ['Apfelbaum', 'Tannenbaum', 'Kirschbaum', 'Stammbaum', 'Purzelbaum'],
      examplesEn: ['Firewood', 'Hollywood', 'Childhood', 'Redwood', 'Driftwood'],
    },

    // 💣 BOMBE (14 SILBEN ÜBERALL IM WORT / ANYWHERE IN WORD: IDs 95–108)
    {
      id: 95,
      mode: 'BOMBE',
      de: '...EIS...',
      en: '...ICE...',
      hintDe: 'BOMBE: „EIS“ darf am Anfang, in der Mitte oder am Ende stehen!',
      hintEn: 'BOMB: "ICE" can be at the start, middle, or end!',
      examplesDe: ['Eisbär', 'Reisepass', 'Speisekarte', 'Meister', 'Gleis'],
      examplesEn: ['Iceberg', 'Police', 'Slice', 'Juice', 'Notice'],
    },
    {
      id: 96,
      mode: 'BOMBE',
      de: '...BAU...',
      en: '...ART...',
      hintDe: 'BOMBE: „BAU“ darf überall im Wort vorkommen!',
      hintEn: 'BOMB: "ART" can appear anywhere in the word!',
      examplesDe: ['Baumhaus', 'Bauernhof', 'Umbau', 'Bauchgefühl', 'Bergbau'],
      examplesEn: ['Artist', 'Party', 'Smart', 'Cartoon', 'Garden'],
    },
    {
      id: 97,
      mode: 'BOMBE',
      de: '...TAG...',
      en: '...DAY...',
      hintDe: 'BOMBE: „TAG“ darf überall im Wort vorkommen!',
      hintEn: 'BOMB: "DAY" can appear anywhere in the word!',
      examplesDe: ['Geburtstag', 'Tageslicht', 'Sonntag', 'Eintagsfliege', 'Alltag'],
      examplesEn: ['Daylight', 'Birthday', 'Holiday', 'Today', 'Daydream'],
    },
    {
      id: 98,
      mode: 'BOMBE',
      de: '...STEIN...',
      en: '...STAR...',
      hintDe: 'BOMBE: „STEIN“ darf überall im Wort vorkommen!',
      hintEn: 'BOMB: "STAR" can appear anywhere in the word!',
      examplesDe: ['Steinpilz', 'Edelstein', 'Backstein', 'Steinzeit', 'Schornstein'],
      examplesEn: ['Starlight', 'Mustard', 'Startle', 'Superstar', 'Starfish'],
    },
    {
      id: 99,
      mode: 'BOMBE',
      de: '...LICHT...',
      en: '...LIGHT...',
      hintDe: 'BOMBE: „LICHT“ darf überall im Wort vorkommen!',
      hintEn: 'BOMB: "LIGHT" can appear anywhere in the word!',
      examplesDe: ['Lichterkette', 'Teelicht', 'Blaulicht', 'Pflicht', 'Rotlicht'],
      examplesEn: ['Flashlight', 'Lightbulb', 'Sunlight', 'Flight', 'Delight'],
    },
    {
      id: 100,
      mode: 'BOMBE',
      de: '...SPIEL...',
      en: '...PLAY...',
      hintDe: 'BOMBE: „SPIEL“ darf überall im Wort vorkommen!',
      hintEn: 'BOMB: "PLAY" can appear anywhere in the word!',
      examplesDe: ['Spielplatz', 'Brettspiel', 'Beispiel', 'Spielzeug', 'Heimspiel'],
      examplesEn: ['Playground', 'Player', 'Replay', 'Display', 'Playful'],
    },
    {
      id: 101,
      mode: 'BOMBE',
      de: '...RAD...',
      en: '...CAR...',
      hintDe: 'BOMBE: „RAD“ darf überall im Wort vorkommen!',
      hintEn: 'BOMB: "CAR" can appear anywhere in the word!',
      examplesDe: ['Fahrrad', 'Riesenrad', 'Radiergummi', 'Motorrad', 'Lenkrad'],
      examplesEn: ['Carpet', 'Postcard', 'Carrot', 'Scar', 'Boxcar'],
    },
    {
      id: 102,
      mode: 'BOMBE',
      de: '...TON...',
      en: '...RING...',
      hintDe: 'BOMBE: „TON“ darf überall im Wort vorkommen!',
      hintEn: 'BOMB: "RING" can appear anywhere in the word!',
      examplesDe: ['Karton', 'Tonstudio', 'Beton', 'Klingelton', 'Marathon'],
      examplesEn: ['Ringtone', 'Spring', 'Earring', 'String', 'Bring'],
    },
    {
      id: 103,
      mode: 'BOMBE',
      de: '...ZUG...',
      en: '...TRAIN...',
      hintDe: 'BOMBE: „ZUG“ darf überall im Wort vorkommen!',
      hintEn: 'BOMB: "TRAIN" can appear anywhere in the word!',
      examplesDe: ['Aufzug', 'Zugvogel', 'Umzug', 'Flugzeug', 'Schlafanzug'],
      examplesEn: ['Trainer', 'Rainstorm', 'Brain', 'Strain', 'Trainee'],
    },
    {
      id: 104,
      mode: 'BOMBE',
      de: '...BALL...',
      en: '...LINE...',
      hintDe: 'BOMBE: „BALL“ darf überall im Wort vorkommen!',
      hintEn: 'BOMB: "LINE" can appear anywhere in the word!',
      examplesDe: ['Fußball', 'Ballett', 'Luftballon', 'Wasserball', 'Kristallkugel'],
      examplesEn: ['Online', 'Airline', 'Lineup', 'Timeline', 'Headline'],
    },
    {
      id: 105,
      mode: 'BOMBE',
      de: '...BUCH...',
      en: '...PORT...',
      hintDe: 'BOMBE: „BUCH“ darf überall im Wort vorkommen!',
      hintEn: 'BOMB: "PORT" can appear anywhere in the word!',
      examplesDe: ['Buchstabe', 'Tagebuch', 'Kochbuch', 'Buchenwald', 'Wörterbuch'],
      examplesEn: ['Airport', 'Passport', 'Portrait', 'Support', 'Portable'],
    },
    {
      id: 106,
      mode: 'BOMBE',
      de: '...SCHIRM...',
      en: '...WIND...',
      hintDe: 'BOMBE: „SCHIRM“ darf überall im Wort vorkommen!',
      hintEn: 'BOMB: "WIND" can appear anywhere in the word!',
      examplesDe: ['Regenschirm', 'Bildschirm', 'Fallschirm', 'Sonnenschirm', 'Schirmherr'],
      examplesEn: ['Window', 'Windmill', 'Rewind', 'Windshield', 'Tailwind'],
    },
    {
      id: 107,
      mode: 'BOMBE',
      de: '...GLAS...',
      en: '...BELL...',
      hintDe: 'BOMBE: „GLAS“ darf überall im Wort vorkommen!',
      hintEn: 'BOMB: "BELL" can appear anywhere in the word!',
      examplesDe: ['Fernglas', 'Glashaus', 'Weinglas', 'Altglas', 'Glasfaser'],
      examplesEn: ['Doorbell', 'Bellhop', 'Umbrella', 'Dumbbell', 'Bluebell'],
    },
    {
      id: 108,
      mode: 'BOMBE',
      de: '...UHR...',
      en: '...TIME...',
      hintDe: 'BOMBE: „UHR“ darf überall im Wort vorkommen!',
      hintEn: 'BOMB: "TIME" can appear anywhere in the word!',
      examplesDe: ['Sanduhr', 'Uhrzeiger', 'Armbanduhr', 'Kuckucksuhr', 'Stoppuhr'],
      examplesEn: ['Timeline', 'Bedtime', 'Timer', 'Overtime', 'Sometimes'],
    },
  ];

  deckQueue: BummCard[] = [];
  currentCard: BummCard = this.allCards[0];

  private explosionTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private tickIntervalId: ReturnType<typeof setInterval> | null = null;
  private audioCtx: AudioContext | null = null;

  constructor() {
    this.buildAndShuffleDeck();
    effect(() => {
      this.lang = this.languageService.currentLang();
      this.cdr.markForCheck();
    });
  }

  ngOnDestroy(): void {
    this.clearTimers();
    if (this.audioCtx) {
      this.audioCtx.close().catch(() => {});
    }
  }

  get activePlayer(): Player {
    return this.players[this.activePlayerIndex] || this.players[0];
  }

  get nextPlayer(): Player {
    const nextIdx = (this.activePlayerIndex + 1) % this.players.length;
    return this.players[nextIdx] || this.players[0];
  }

  get lowestPenaltyScore(): number {
    if (this.players.length === 0) return 0;
    return Math.min(...this.players.map((p) => p.penalties));
  }

  @HostListener('window:keydown', ['$event'])
  handleKeydown(event: KeyboardEvent): void {
    const target = event.target as HTMLElement | null;
    const isInput =
      target &&
      (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);

    if (event.code === 'Space' && !isInput) {
      event.preventDefault();
      if (this.bombState === 'IDLE') {
        this.startBomb();
      } else if (this.bombState === 'TICKING') {
        this.passBombQuick();
      } else if (this.bombState === 'EXPLODED') {
        this.nextCardRound();
      }
    }
  }

  setLang(newLang: Lang): void {
    this.languageService.setLanguage(newLang);
    this.lang = newLang;
    // Update default player names if untouched
    this.players.forEach((p, idx) => {
      if (newLang === 'en' && p.name === `Spieler ${idx + 1}`) {
        p.name = `Player ${idx + 1}`;
      } else if (newLang === 'de' && p.name === `Player ${idx + 1}`) {
        p.name = `Spieler ${idx + 1}`;
      }
    });
  }

  toggleSound(): void {
    this.soundEnabled = !this.soundEnabled;
  }

  setMaxCards(count: number): void {
    if (this.bombState === 'TICKING') return;
    this.maxCards = count;
    this.resetMatch();
  }

  setDeckFilter(filter: DeckFilter): void {
    if (this.bombState === 'TICKING') return;
    this.deckFilter = filter;
    this.buildAndShuffleDeck();
  }

  buildAndShuffleDeck(): void {
    let filtered = [...this.allCards];
    if (this.deckFilter === 'SYLLABLES') {
      filtered = this.allCards.filter((c) => c.mode !== 'CATEGORY');
    } else if (this.deckFilter === 'CATEGORIES') {
      filtered = this.allCards.filter((c) => c.mode === 'CATEGORY');
    }

    // Fisher-Yates shuffle
    for (let i = filtered.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [filtered[i], filtered[j]] = [filtered[j], filtered[i]];
    }

    this.deckQueue = filtered;
    this.currentCard = this.deckQueue[0];
  }

  rollDieAndDrawCard(): void {
    if (this.bombState === 'TICKING') return;
    this.isRollingDie = true;
    this.playDieRollSound();

    // Move first card to end and pick next
    if (this.deckQueue.length > 1) {
      const first = this.deckQueue.shift()!;
      this.deckQueue.push(first);
      this.currentCard = this.deckQueue[0];
    }

    this.spokenWords = [];
    this.wordErrorMsg = '';
    this.currentWordInput = '';
    this.showExamples = false;

    setTimeout(() => {
      this.isRollingDie = false;
      this.cdr.markForCheck();
    }, 450);
  }

  persistPlayers(): void {
    savePlayerNames(this.players.map((p) => p.name));
  }

  addPlayer(): void {
    const trimmed = this.newPlayerName.trim();
    if (!trimmed || this.players.length >= 8) return;
    const avatar = this.avatarPool[this.players.length % this.avatarPool.length];
    this.players.push({
      id: Date.now(),
      name: trimmed,
      avatar,
      penalties: 0,
      wonCards: [],
    });
    this.newPlayerName = '';
    this.persistPlayers();
  }

  removePlayer(index: number): void {
    if (this.players.length <= 2 || this.bombState === 'TICKING') return;
    this.players.splice(index, 1);
    if (this.activePlayerIndex >= this.players.length) {
      this.activePlayerIndex = 0;
    }
    this.persistPlayers();
  }

  selectStartingPlayer(index: number): void {
    if (this.bombState !== 'IDLE') return;
    this.activePlayerIndex = index;
  }

  /**
   * Starts the unpredictable secret timer (10-60s Classic or 10-35s Fast)
   */
  startBomb(): void {
    if (this.bombState === 'TICKING') return;

    this.clearTimers();
    this.bombState = 'TICKING';
    this.spokenWords = [];
    this.wordErrorMsg = '';
    this.currentWordInput = '';
    this.showExamples = false;
    this.tickPhase = 'TICK';
    this.ledHigh = true;

    const minSec = 10;
    const maxSec = this.timerPreset === 'CLASSIC' ? 60 : 35;
    const randomDurationMs = Math.floor((minSec + Math.random() * (maxSec - minSec)) * 1000);

    // Immediate first tick sound
    this.playTickTackSound('TICK');

    // Steady Tick-Tack interval (players cannot tell when it will explode!)
    this.tickIntervalId = setInterval(() => {
      this.tickPhase = this.tickPhase === 'TICK' ? 'TACK' : 'TICK';
      this.ledHigh = !this.ledHigh;
      this.playTickTackSound(this.tickPhase);
      this.cdr.markForCheck();
    }, 480);

    // Secret explosion timer
    this.explosionTimeoutId = setTimeout(() => {
      this.triggerExplosion();
      this.cdr.markForCheck();
    }, randomDurationMs);
  }

  /**
   * Validates spoken word (no duplicates + syllable position check) and passes the bomb clockwise
   */
  submitWordAndPass(): void {
    if (this.bombState !== 'TICKING') return;

    const rawWord = this.currentWordInput.trim();
    if (!rawWord) {
      this.passBombQuick();
      return;
    }

    const normalized = rawWord.toUpperCase();

    // 1. Check for duplicate word in this round
    const alreadyUsed = this.spokenWords.some((entry) => entry.word.toUpperCase() === normalized);
    if (alreadyUsed) {
      this.wordErrorMsg =
        this.lang === 'de'
          ? `„${rawWord}“ wurde in dieser Runde bereits gesagt! Nenne ein anderes Wort!`
          : `"${rawWord}" was already used in this round! Name a different word!`;
      this.playErrorBuzz();
      return;
    }

    // 2. Check syllable rule if card is TICK, TACK, or BOMBE
    if (this.currentCard.mode !== 'CATEGORY') {
      const rawCardSyllable = (
        this.lang === 'de' ? this.currentCard.de : this.currentCard.en
      )
        .replace(/\./g, '')
        .trim()
        .toUpperCase();

      if (normalized === rawCardSyllable) {
        this.wordErrorMsg =
          this.lang === 'de'
            ? `Du musst ein vollständiges Wort mit „${rawCardSyllable}“ bilden!`
            : `You must form a complete word containing "${rawCardSyllable}"!`;
        this.playErrorBuzz();
        return;
      }

      if (this.currentCard.mode === 'TICK' && !normalized.startsWith(rawCardSyllable)) {
        this.wordErrorMsg =
          this.lang === 'de'
            ? `Bei TICK muss das Wort mit „${rawCardSyllable}...“ beginnen!`
            : `In TICK mode, the word must start with "${rawCardSyllable}..."!`;
        this.playErrorBuzz();
        return;
      }

      if (this.currentCard.mode === 'TACK' && !normalized.endsWith(rawCardSyllable)) {
        this.wordErrorMsg =
          this.lang === 'de'
            ? `Bei TACK muss das Wort auf „...${rawCardSyllable}“ enden!`
            : `In TACK mode, the word must end with "...${rawCardSyllable}"!`;
        this.playErrorBuzz();
        return;
      }

      if (this.currentCard.mode === 'BOMBE' && !normalized.includes(rawCardSyllable)) {
        this.wordErrorMsg =
          this.lang === 'de'
            ? `Das Wort muss die Silbe „${rawCardSyllable}“ enthalten!`
            : `The word must contain the syllable "${rawCardSyllable}"!`;
        this.playErrorBuzz();
        return;
      }
    }

    // Valid word: log it and pass bomb!
    this.spokenWords.unshift({
      word: rawWord,
      playerName: this.activePlayer.name,
      playerAvatar: this.activePlayer.avatar,
      timestamp: new Date().toLocaleTimeString([], { minute: '2-digit', second: '2-digit' }),
    });

    this.currentWordInput = '';
    this.wordErrorMsg = '';
    this.advancePlayerClockwise();
  }

  /**
   * Passes the bomb clockwise immediately (or validates input if user typed a word first)
   */
  passBombQuick(): void {
    if (this.bombState !== 'TICKING') return;
    if (this.currentWordInput.trim()) {
      this.submitWordAndPass();
      return;
    }
    this.wordErrorMsg = '';
    this.advancePlayerClockwise();
  }

  private advancePlayerClockwise(): void {
    this.activePlayerIndex = (this.activePlayerIndex + 1) % this.players.length;
    this.passWhooshActive = true;
    this.playPassWhooshSound();
    setTimeout(() => {
      this.passWhooshActive = false;
    }, 320);
  }

  private triggerExplosion(): void {
    this.clearTimers();
    this.bombState = 'EXPLODED';
    this.shakeActive = true;
    this.wordErrorMsg = '';

    const loser = this.activePlayer;
    loser.penalties += 1;
    loser.wonCards.push(this.currentCard);
    this.lastLoserIndex = this.activePlayerIndex;
    this.lastLoserName = loser.name;

    this.playExplosionBoomSound();

    setTimeout(() => {
      this.shakeActive = false;
      this.cdr.markForCheck();
    }, 700);
  }

  nextCardRound(): void {
    if (this.currentCardNumber >= this.maxCards) {
      this.bombState = 'GAME_OVER';
      this.playVictoryFanfare();
      return;
    }

    this.currentCardNumber += 1;
    this.bombState = 'IDLE';
    this.rollDieAndDrawCard();
  }

  resetMatch(): void {
    this.clearTimers();
    this.bombState = 'IDLE';
    this.currentCardNumber = 1;
    this.activePlayerIndex = 0;
    this.lastLoserIndex = -1;
    this.lastLoserName = '';
    this.spokenWords = [];
    this.currentWordInput = '';
    this.wordErrorMsg = '';
    this.players.forEach((p) => {
      p.penalties = 0;
      p.wonCards = [];
    });
    this.buildAndShuffleDeck();
  }

  getWinnersText(): string {
    const min = this.lowestPenaltyScore;
    const winners = this.players.filter((p) => p.penalties === min);
    const names = winners.map((w) => `${w.avatar} ${w.name}`).join(' & ');
    return this.lang === 'de' ? `Sieg für ${names}!` : `Victory for ${names}!`;
  }

  // UI Mode Helpers
  getModeIcon(mode: DieMode): string {
    switch (mode) {
      case 'CATEGORY':
        return '🎯';
      case 'TICK':
        return '🔤';
      case 'TACK':
        return '🔚';
      case 'BOMBE':
        return '💣';
    }
  }

  getModeShortTitle(mode: DieMode): string {
    switch (mode) {
      case 'CATEGORY':
        return this.lang === 'de' ? 'THEMA' : 'TOPIC';
      case 'TICK':
        return 'TICK';
      case 'TACK':
        return 'TACK';
      case 'BOMBE':
        return this.lang === 'de' ? 'BOMBE' : 'BOMB';
    }
  }

  getModeFullTitle(mode: DieMode): string {
    switch (mode) {
      case 'CATEGORY':
        return this.lang === 'de' ? '🎯 Klassische Kategorie' : '🎯 Classic Category';
      case 'TICK':
        return this.lang === 'de'
          ? '🔤 TICK (Silbe am Wortanfang)'
          : '🔤 TICK (Syllable at Start)';
      case 'TACK':
        return this.lang === 'de' ? '🔚 TACK (Silbe am Wortende)' : '🔚 TACK (Syllable at End)';
      case 'BOMBE':
        return this.lang === 'de'
          ? '💣 BOMBE (Silbe irgendwo im Wort)'
          : '💣 BOMB (Syllable Anywhere)';
    }
  }

  getModeRuleText(mode: DieMode): string {
    switch (mode) {
      case 'CATEGORY':
        return this.lang === 'de'
          ? 'Nenne einen passenden Begriff zur gezogenen Kategorie!'
          : 'Name a matching term for the revealed category!';
      case 'TICK':
        return this.lang === 'de'
          ? 'Die Kartensilbe muss ganz am ANFANG deines Wortes stehen!'
          : 'The syllable on the card must be at the VERY BEGINNING of your word!';
      case 'TACK':
        return this.lang === 'de'
          ? 'Die Kartensilbe muss ganz am ENDE deines Wortes stehen!'
          : 'The syllable on the card must be at the VERY END of your word!';
      case 'BOMBE':
        return this.lang === 'de'
          ? 'Freie Wahl: Die Silbe darf am Anfang, in der Mitte oder am Ende stehen!'
          : 'Free position: The syllable may appear at the start, middle, or end!';
    }
  }

  getModeBadgeText(mode: DieMode): string {
    switch (mode) {
      case 'CATEGORY':
        return this.lang === 'de' ? '🎯 KATEGORIE-KARTE' : '🎯 CATEGORY CARD';
      case 'TICK':
        return this.lang === 'de' ? '🔤 TICK • WORTANFANG' : '🔤 TICK • WORD START';
      case 'TACK':
        return this.lang === 'de' ? '🔚 TACK • WORTENDE' : '🔚 TACK • WORD END';
      case 'BOMBE':
        return this.lang === 'de' ? '💣 BOMBE • ÜBERALL IM WORT' : '💣 BOMB • ANYWHERE IN WORD';
    }
  }

  private clearTimers(): void {
    if (this.explosionTimeoutId) {
      clearTimeout(this.explosionTimeoutId);
      this.explosionTimeoutId = null;
    }
    if (this.tickIntervalId) {
      clearInterval(this.tickIntervalId);
      this.tickIntervalId = null;
    }
  }

  // ============================================================================
  // WEB AUDIO API SOUND SYNTHESIS (Tick-Tack, Whoosh, BOOOOM Explosion, Fanfare)
  // ============================================================================
  private getAudioContext(): AudioContext | null {
    if (!this.soundEnabled) return null;
    try {
      if (!this.audioCtx) {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        this.audioCtx = new AudioCtx();
      }
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }
      return this.audioCtx;
    } catch {
      return null;
    }
  }

  private playTickTackSound(phase: 'TICK' | 'TACK'): void {
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    // Mechanical woodblock / electronic bomb tick-tack pitches
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(phase === 'TICK' ? 1150 : 860, now);
    osc.frequency.exponentialRampToValueAtTime(phase === 'TICK' ? 420 : 310, now + 0.045);

    gain.gain.setValueAtTime(0.28, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.055);
  }

  private playPassWhooshSound(): void {
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(260, now);
    osc.frequency.exponentialRampToValueAtTime(680, now + 0.14);

    gain.gain.setValueAtTime(0.22, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.17);
  }

  private playDieRollSound(): void {
    const ctx = this.getAudioContext();
    if (!ctx) return;

    [0, 0.07, 0.14].forEach((offset, i) => {
      const now = ctx.currentTime + offset;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(420 + i * 140, now);

      gain.gain.setValueAtTime(0.09, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.055);
    });
  }

  private playErrorBuzz(): void {
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.setValueAtTime(125, now + 0.09);

    gain.gain.setValueAtTime(0.22, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.23);
  }

  private playExplosionBoomSound(): void {
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // 1. Sub-bass shockwave boom
    const subOsc = ctx.createOscillator();
    const subGain = ctx.createGain();
    subOsc.type = 'sawtooth';
    subOsc.frequency.setValueAtTime(130, now);
    subOsc.frequency.exponentialRampToValueAtTime(28, now + 0.85);

    subGain.gain.setValueAtTime(0.55, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.9);

    subOsc.connect(subGain);
    subGain.connect(ctx.destination);
    subOsc.start(now);
    subOsc.stop(now + 0.92);

    // 2. White noise explosion burst
    const bufferSize = ctx.sampleRate * 0.85;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const whiteNoise = ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1200, now);
    filter.frequency.exponentialRampToValueAtTime(140, now + 0.8);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.6, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.85);

    whiteNoise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(ctx.destination);

    whiteNoise.start(now);
    whiteNoise.stop(now + 0.85);
  }

  private playVictoryFanfare(): void {
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, idx) => {
      const now = ctx.currentTime + idx * 0.11;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(0.22, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.32);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.35);
    });
  }
}
