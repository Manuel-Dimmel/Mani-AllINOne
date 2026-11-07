import { Component, HostListener, OnDestroy, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { loadSavedPlayerNames, savePlayerNames } from '../../services/player-storage';

export type AnomiaLang = 'de' | 'en';

export type AnomiaSymbolId = 'circle' | 'star' | 'square' | 'triangle' | 'diamond' | 'bolt';

export interface AnomiaSymbolMeta {
  id: AnomiaSymbolId;
  color: string;
  glow: string;
  emoji: string;
  name: { de: string; en: string };
}

export interface AnomiaCard {
  id: number;
  type: 'normal' | 'wild';
  symbol?: AnomiaSymbolId;
  category?: { de: string; en: string };
  wildSymbols?: [AnomiaSymbolId, AnomiaSymbolId];
}

export interface AnomiaPlayer {
  id: number;
  name: string;
  color: string;
  faceUpPile: AnomiaCard[]; // Last element is the current top card
  scorePile: AnomiaCard[]; // Face-down won cards (+1 point each)
}

export interface AnomiaDuel {
  playerAId: number;
  playerBId: number;
  cardA: AnomiaCard;
  cardB: AnomiaCard;
  viaWildCard: boolean;
  cascadeLevel: number; // 0 = initial duel, >=1 = Chain Reaction (Kaskade)
}

export interface DuelHistoryEntry {
  id: number;
  winnerName: string;
  winnerColor: string;
  loserName: string;
  wonCategory: { de: string; en: string };
  symbolId: AnomiaSymbolId;
  cascadeLevel: number;
  viaWildCard: boolean;
  shoutedWord?: string;
}

export const ANOMIA_SYMBOLS: Record<AnomiaSymbolId, AnomiaSymbolMeta> = {
  circle: {
    id: 'circle',
    color: '#ef4444',
    glow: 'rgba(239, 68, 68, 0.55)',
    emoji: '🔴',
    name: { de: 'Roter Kreis', en: 'Red Circle' },
  },
  star: {
    id: 'star',
    color: '#3b82f6',
    glow: 'rgba(59, 130, 246, 0.55)',
    emoji: '🔵',
    name: { de: 'Blauer Stern', en: 'Blue Star' },
  },
  square: {
    id: 'square',
    color: '#10b981',
    glow: 'rgba(16, 185, 129, 0.55)',
    emoji: '🟢',
    name: { de: 'Grünes Quadrat', en: 'Green Square' },
  },
  triangle: {
    id: 'triangle',
    color: '#eab308',
    glow: 'rgba(234, 179, 8, 0.55)',
    emoji: '🟡',
    name: { de: 'Gelbes Dreieck', en: 'Yellow Triangle' },
  },
  diamond: {
    id: 'diamond',
    color: '#a855f7',
    glow: 'rgba(168, 85, 247, 0.55)',
    emoji: '🟣',
    name: { de: 'Violetter Diamant', en: 'Purple Diamond' },
  },
  bolt: {
    id: 'bolt',
    color: '#f97316',
    glow: 'rgba(249, 115, 22, 0.55)',
    emoji: '🟠',
    name: { de: 'Oranger Blitz', en: 'Orange Bolt' },
  },
};

export const SYMBOL_LIST: AnomiaSymbolMeta[] = Object.values(ANOMIA_SYMBOLS);

const PLAYER_COLORS = [
  '#f43f5e',
  '#06b6d4',
  '#10b981',
  '#f59e0b',
  '#8b5cf6',
  '#ec4899',
  '#3b82f6',
  '#84cc16',
];

/**
 * 108 unique, fast-paced, creative bilingual Anomia category cards (18 per symbol across the 6 symbols)
 */
export const ANOMIA_BASE_CATEGORIES: Array<{
  symbol: AnomiaSymbolId;
  de: string;
  en: string;
}> = [
  // CIRCLE (18)
  { symbol: 'circle', de: 'Pizzabelag', en: 'Pizza Topping' },
  { symbol: 'circle', de: 'Automarke', en: 'Car Brand' },
  { symbol: 'circle', de: 'Superheld', en: 'Superhero' },
  { symbol: 'circle', de: 'Eissorte', en: 'Ice Cream Flavor' },
  { symbol: 'circle', de: 'Hauptstadt', en: 'Capital City' },
  { symbol: 'circle', de: 'Musikinstrument', en: 'Musical Instrument' },
  { symbol: 'circle', de: 'Hunderasse', en: 'Dog Breed' },
  { symbol: 'circle', de: 'Kino-Blockbuster', en: 'Blockbuster Movie' },
  { symbol: 'circle', de: 'Achterbahn- oder Freizeitpark', en: 'Theme Park' },
  { symbol: 'circle', de: 'Frisur oder Haarschnitt', en: 'Hairstyle or Haircut' },
  { symbol: 'circle', de: 'Schuhmarke oder Schuhart', en: 'Shoe Brand or Style' },
  { symbol: 'circle', de: 'Tanzstil', en: 'Dance Style' },
  { symbol: 'circle', de: 'Berühmte Brücke oder Turm', en: 'Famous Bridge or Tower' },
  { symbol: 'circle', de: 'Kaffeespezialität', en: 'Coffee Drink' },
  { symbol: 'circle', de: 'Zirkusattraktion', en: 'Circus Act' },
  { symbol: 'circle', de: 'Währung der Welt', en: 'World Currency' },
  { symbol: 'circle', de: 'Gegenstand im Handschuhfach', en: 'Item in a Glovebox' },
  { symbol: 'circle', de: 'Olympische Disziplin', en: 'Olympic Event' },

  // STAR (18)
  { symbol: 'star', de: 'Tier im Ozean', en: 'Ocean Animal' },
  { symbol: 'star', de: 'Schulfach', en: 'School Subject' },
  { symbol: 'star', de: 'Brettspiel', en: 'Board Game' },
  { symbol: 'star', de: 'Land in Asien', en: 'Asian Country' },
  { symbol: 'star', de: 'Frühstücksessen', en: 'Breakfast Food' },
  { symbol: 'star', de: 'Berühmter Maler', en: 'Famous Painter' },
  { symbol: 'star', de: 'Sportart mit Ball', en: 'Ball Sport' },
  { symbol: 'star', de: 'Streaming-Serie', en: 'Streaming TV Show' },
  { symbol: 'star', de: 'Sternbild oder Planet', en: 'Constellation or Planet' },
  { symbol: 'star', de: 'Fluggesellschaft', en: 'Airline' },
  { symbol: 'star', de: 'Pastasorte', en: 'Type of Pasta' },
  { symbol: 'star', de: 'Zauberspruch oder Zaubertrick', en: 'Magic Trick or Spell' },
  { symbol: 'star', de: 'Dinosaurier-Art', en: 'Dinosaur Species' },
  { symbol: 'star', de: 'Parfüm- oder Luxusmarke', en: 'Luxury or Perfume Brand' },
  { symbol: 'star', de: 'Cocktailsorte', en: 'Cocktail' },
  { symbol: 'star', de: 'Programmiersprache', en: 'Programming Language' },
  { symbol: 'star', de: 'Gegenstand im Rucksack', en: 'Item in a Backpack' },
  { symbol: 'star', de: 'Musikfestival', en: 'Music Festival' },

  // SQUARE (18)
  { symbol: 'square', de: 'Gemüsesorte', en: 'Vegetable' },
  { symbol: 'square', de: 'Videospiel', en: 'Video Game' },
  { symbol: 'square', de: 'Kleidungsstück', en: 'Item of Clothing' },
  { symbol: 'square', de: 'Beruf in Uniform', en: 'Job With a Uniform' },
  { symbol: 'square', de: 'Fluss oder See', en: 'River or Lake' },
  { symbol: 'square', de: 'Märchenfigur', en: 'Fairy Tale Character' },
  { symbol: 'square', de: 'Werkzeug', en: 'Hand Tool' },
  { symbol: 'square', de: 'Schokoladenmarke', en: 'Chocolate Brand' },
  { symbol: 'square', de: 'Kartenspiel', en: 'Card Game' },
  { symbol: 'square', de: 'Bäckerei-Gebäck', en: 'Bakery Pastry' },
  { symbol: 'square', de: 'Kampfsportart', en: 'Martial Art' },
  { symbol: 'square', de: 'Griechischer Gott', en: 'Greek God' },
  { symbol: 'square', de: 'Zimmerpflanze', en: 'Houseplant' },
  { symbol: 'square', de: 'Auto- oder Verkehrszeichen', en: 'Road Sign' },
  { symbol: 'square', de: 'Wissenschaftler oder Erfinder', en: 'Scientist or Inventor' },
  { symbol: 'square', de: 'Suppenart', en: 'Type of Soup' },
  { symbol: 'square', de: 'Ding auf dem Schreibtisch', en: 'Item on a Desk' },
  { symbol: 'square', de: 'Land in Südamerika', en: 'South American Country' },

  // TRIANGLE (18)
  { symbol: 'triangle', de: 'Tropische Frucht', en: 'Tropical Fruit' },
  { symbol: 'triangle', de: 'Rock- oder Popband', en: 'Rock or Pop Band' },
  { symbol: 'triangle', de: 'Möbelstück', en: 'Piece of Furniture' },
  { symbol: 'triangle', de: 'Insekt oder Spinne', en: 'Insect or Spider' },
  { symbol: 'triangle', de: 'Wintersportart', en: 'Winter Sport' },
  { symbol: 'triangle', de: 'Chemisches Element', en: 'Chemical Element' },
  { symbol: 'triangle', de: 'Körperteil', en: 'Body Part' },
  { symbol: 'triangle', de: 'Feiertag oder Fest', en: 'Holiday or Festival' },
  { symbol: 'triangle', de: 'Gebirge oder Vulkan', en: 'Mountain or Volcano' },
  { symbol: 'triangle', de: 'Salatzutat', en: 'Salad Ingredient' },
  { symbol: 'triangle', de: 'Detektiv oder Ermittler', en: 'Fictional Detective' },
  { symbol: 'triangle', de: 'Wüsten- oder Savannentier', en: 'Desert or Savanna Animal' },
  { symbol: 'triangle', de: 'Kuchen- oder Tortensorte', en: 'Type of Cake or Pie' },
  { symbol: 'triangle', de: 'Schmuckstück', en: 'Piece of Jewelry' },
  { symbol: 'triangle', de: 'Fremdsprache', en: 'Foreign Language' },
  { symbol: 'triangle', de: 'Gegenstand im Badezimmer', en: 'Bathroom Item' },
  { symbol: 'triangle', de: 'Freizeitaktivität am See', en: 'Lake Activity' },
  { symbol: 'triangle', de: 'Historisches Bauwerk', en: 'Historical Landmark' },

  // DIAMOND (18)
  { symbol: 'diamond', de: 'Käsesorte', en: 'Type of Cheese' },
  { symbol: 'diamond', de: 'Zeichentrickfigur', en: 'Cartoon Character' },
  { symbol: 'diamond', de: 'Urlaubsinsel', en: 'Vacation Island' },
  { symbol: 'diamond', de: 'Heißgetränk', en: 'Hot Beverage' },
  { symbol: 'diamond', de: 'Vogelart', en: 'Bird Species' },
  { symbol: 'diamond', de: 'Smartphone-App', en: 'Smartphone App' },
  { symbol: 'diamond', de: 'Küchengerät', en: 'Kitchen Appliance' },
  { symbol: 'diamond', de: 'Film-Bösewicht', en: 'Movie Villain' },
  { symbol: 'diamond', de: 'Nuss- oder Samensorte', en: 'Type of Nut or Seed' },
  { symbol: 'diamond', de: 'Musical oder Oper', en: 'Musical or Opera' },
  { symbol: 'diamond', de: 'Katzenrasse oder Großkatze', en: 'Cat Breed or Big Cat' },
  { symbol: 'diamond', de: 'Grillgericht oder Beilage', en: 'BBQ Food or Side Dish' },
  { symbol: 'diamond', de: 'Gegenstand beim Camping', en: 'Camping Gear' },
  { symbol: 'diamond', de: 'Mode-Accessoire', en: 'Fashion Accessory' },
  { symbol: 'diamond', de: 'US-Bundesstaat', en: 'US State' },
  { symbol: 'diamond', de: 'Kinderbuch-Klassiker', en: 'Classic Children’s Book' },
  { symbol: 'diamond', de: 'Soße oder Dip', en: 'Sauce or Dip' },
  { symbol: 'diamond', de: 'Wetterphänomen', en: 'Weather Phenomenon' },

  // BOLT (18)
  { symbol: 'bolt', de: 'Fast-Food-Kette', en: 'Fast Food Chain' },
  { symbol: 'bolt', de: 'Raubtier', en: 'Predator Animal' },
  { symbol: 'bolt', de: 'Gewürz oder Kraut', en: 'Spice or Herb' },
  { symbol: 'bolt', de: 'Fortbewegungsmittel', en: 'Mode of Transport' },
  { symbol: 'bolt', de: 'Baum- oder Blumenart', en: 'Tree or Flower' },
  { symbol: 'bolt', de: 'Edelstein oder Metall', en: 'Gemstone or Metal' },
  { symbol: 'bolt', de: 'Hobby in der Natur', en: 'Outdoor Hobby' },
  { symbol: 'bolt', de: 'Buch- oder Romanheld', en: 'Book or Novel Hero' },
  { symbol: 'bolt', de: 'Energydrink oder Softdrink', en: 'Soft Drink or Soda' },
  { symbol: 'bolt', de: 'Videospiel-Konsole', en: 'Video Game Console' },
  { symbol: 'bolt', de: 'Reptil oder Amphibie', en: 'Reptile or Amphibian' },
  { symbol: 'bolt', de: 'Kino-Snack', en: 'Movie Theater Snack' },
  { symbol: 'bolt', de: 'Gegenstand im Werkzeugkasten', en: 'Item in a Toolbox' },
  { symbol: 'bolt', de: 'Berühmter Sportstar', en: 'Famous Sports Star' },
  { symbol: 'bolt', de: 'Fabelwesen oder Monster', en: 'Mythical Creature' },
  { symbol: 'bolt', de: 'Frühblüher oder Gartenblume', en: 'Garden Flower' },
  { symbol: 'bolt', de: 'Ausrede fürs Zuspätkommen', en: 'Excuse for Being Late' },
  { symbol: 'bolt', de: 'Ding, das im Dunkeln leuchtet', en: 'Thing That Glows in the Dark' },
];

export const CATEGORY_BANK = ANOMIA_BASE_CATEGORIES;

/**
 * Wild Cards (Joker-Karten) linking 2 different symbols
 */
export const ANOMIA_WILD_PAIRS: Array<[AnomiaSymbolId, AnomiaSymbolId]> = [
  ['circle', 'star'],
  ['square', 'triangle'],
  ['diamond', 'bolt'],
  ['circle', 'diamond'],
  ['star', 'bolt'],
  ['square', 'circle'],
  ['triangle', 'diamond'],
  ['bolt', 'square'],
];

@Component({
  selector: 'app-anomia-game',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="anomia-page">
      <!-- TOP NAVIGATION -->
      <div class="topbar">
        <a routerLink="/" class="back-btn">
          ← {{ isEn() ? 'Back to Hub' : 'Zurück zur Übersicht' }}
        </a>

        <div class="top-controls">
          <!-- LANGUAGE SWITCHER (DE / EN) -->
          <div class="lang-switch-group" title="Sprache / Language">
            <button
              type="button"
              class="lang-btn"
              [class.active]="lang() === 'de'"
              (click)="setLanguage('de')"
            >
              🇩🇪 DE
            </button>
            <button
              type="button"
              class="lang-btn"
              [class.active]="lang() === 'en'"
              (click)="setLanguage('en')"
            >
              🇬🇧 EN
            </button>
          </div>

          <!-- AUDIO TOGGLE -->
          <button
            type="button"
            class="switch-pill"
            [class.on]="soundOn()"
            (click)="toggleSound()"
          >
            <span class="led"></span>
            <span>
              {{
                soundOn()
                  ? isEn()
                    ? 'AUDIO: ON'
                    : 'AUDIO: AN'
                  : isEn()
                    ? 'AUDIO: MUTE'
                    : 'AUDIO: STUMM'
              }}
            </span>
          </button>

          <!-- RULES MODAL BUTTON -->
          <button
            type="button"
            class="btn-secondary sm"
            (click)="showRulesModal.set(!showRulesModal())"
          >
            📖
            {{
              isEn()
                ? showRulesModal()
                  ? 'Hide Rules'
                  : 'Game Rules'
                : showRulesModal()
                  ? 'Regeln ausblenden'
                  : 'Spielregeln'
            }}
          </button>

          <!-- SETUP MODAL BUTTON -->
          <button
            type="button"
            class="btn-secondary sm"
            (click)="showSetupModal.set(!showSetupModal())"
          >
            ⚙️
            {{ isEn() ? 'Settings & Players' : 'Einstellungen & Spieler' }} ({{
              players().length
            }})
          </button>
        </div>
      </div>

      <!-- COLLAPSIBLE RULES PANEL -->
      @if (showRulesModal()) {
        <section class="rules-panel glass-panel">
          <div class="rules-head">
            <div>
              <h3>
                📖
                {{
                  isEn()
                    ? 'Official Anomia Rules & Chain-Reaction Guide'
                    : 'Offizielle Anomia-Spielregeln & Kaskaden-Anleitung'
                }}
              </h3>
              <p>
                {{
                  isEn()
                    ? 'High-speed symbol matching & category duel card game for 2 to 8 players'
                    : 'Blitzschnelles Symbol-Duell & Kategorien-Kartenspiel für 2 bis 8 Spieler'
                }}
              </p>
            </div>
            <button
              type="button"
              class="btn-secondary sm"
              (click)="showRulesModal.set(false)"
            >
              ✕ {{ isEn() ? 'Close' : 'Schließen' }}
            </button>
          </div>

          <div class="rules-grid">
            <div class="rule-card">
              <h4>1️⃣ {{ isEn() ? 'Flip Cards & Symbols' : 'Karten aufdecken & Symbole' }}</h4>
              <p>
                @if (isEn()) {
                  Players take turns flipping a card from the central
                  <strong>Draw Pile</strong> onto their personal face-up stack. Each card shows a
                  <strong>category</strong> and one of <strong>6 glowing symbols</strong> in the
                  center.
                } @else {
                  Reihum deckt der aktive Spieler eine Karte vom zentralen
                  <strong>Nachziehstapel</strong> auf seinen eigenen offenen
                  <strong>Ablagestapel</strong> auf. Jede Karte zeigt einen
                  <strong>Begriff</strong> und eines von <strong>6 farbigen Symbolen</strong>.
                }
              </p>
            </div>

            <div class="rule-card">
              <h4>2️⃣ {{ isEn() ? '⚡ Anomia Duel!' : '⚡ Anomia-Duell!' }}</h4>
              <p>
                @if (isEn()) {
                  As soon as two players have the <strong>same symbol</strong> on top of their
                  face-up stacks, an immediate <strong>Face-Off Duel</strong> starts! You must
                  quickly shout a valid example for your
                  <strong>opponent's category</strong> before they name one for yours!
                } @else {
                  Sobald zwei Spieler <strong>dasselbe Symbol</strong> oben auf ihrem Stapel
                  liegen haben, startet sofort ein <strong>Kopf-an-Kopf-Duell</strong>! Jeder
                  Duellant muss schneller ein passendes Beispiel für die
                  <strong>Kategorie des Gegners</strong> rufen!
                }
              </p>
            </div>

            <div class="rule-card">
              <h4>
                3️⃣ {{ isEn() ? '🔥 Chain Reactions (Cascades)' : '🔥 Kettenreaktionen (Kaskaden)' }}
              </h4>
              <p>
                @if (isEn()) {
                  The duel winner takes the loser's top card into their
                  <strong>Score Pile (+1 pt)</strong>. Removing that card exposes the card
                  <strong>underneath</strong> in the loser's stack — if its symbol matches another
                  player, a <strong>Cascade Duel</strong> triggers immediately!
                } @else {
                  Der Sieger nimmt die oberste Karte des Verlierers auf seinen
                  <strong>Siegpunktestapel (+1 Punkt)</strong>. Dadurch wird die darunterliegende
                  Karte des Verlierers wieder sichtbar – passt ihr Symbol zu einem anderen Spieler,
                  entsteht sofort eine <strong>Kettenreaktion (Kaskade)</strong>!
                }
              </p>
            </div>

            <div class="rule-card">
              <h4>4️⃣ {{ isEn() ? '🃏 Wild Cards & Winning' : '🃏 Joker-Karten & Spielende' }}</h4>
              <p>
                @if (isEn()) {
                  <strong>Wild Cards</strong> show <strong>2 different symbols</strong> and are
                  placed in the center. While active, those two different symbols also match each
                  other! When the draw pile is empty, the player with the most cards in their
                  <strong>Score Pile</strong> wins.
                } @else {
                  <strong>Joker-Karten (Wild Cards)</strong> zeigen
                  <strong>2 verschiedene Symbole</strong> und werden offen in die Tischmitte
                  gelegt: Ab sofort lösen auch diese zwei unterschiedlichen Symbole ein Duell
                  gegeneinander aus! Ist der Nachziehstapel leer, gewinnt der Spieler mit den
                  meisten Siegpunkten.
                }
              </p>
            </div>
          </div>
        </section>
      }

      <!-- COLLAPSIBLE SETUP & SETTINGS PANEL -->
      @if (showSetupModal()) {
        <section class="setup-panel glass-panel">
          <div class="rules-head">
            <div>
              <h3>
                ⚙️
                {{
                  isEn()
                    ? 'Game Setup, Language & Players (2–8)'
                    : 'Spiel-Einstellungen, Sprache & Spieler (2–8)'
                }}
              </h3>
              <p>
                {{
                  isEn()
                    ? 'Customize players, deck size, Wild Cards, and card language'
                    : 'Spielernamen, Deckgröße, Joker-Karten und Kartensprache anpassen'
                }}
              </p>
            </div>
            <button
              type="button"
              class="btn-secondary sm"
              (click)="showSetupModal.set(false)"
            >
              ✓ {{ isEn() ? 'Done' : 'Fertig' }}
            </button>
          </div>

          <div class="setup-columns">
            <!-- PLAYER MANAGEMENT -->
            <div class="players-config">
              <label class="cfg-label">
                👥 {{ isEn() ? 'Players' : 'Spielerliste' }} ({{ players().length }} / 8)
              </label>

              <div class="player-edit-list">
                @for (p of players(); track p.id; let i = $index) {
                  <div class="player-edit-row">
                    <span class="p-dot" [style.background]="p.color">{{ i + 1 }}</span>
                    <input
                      type="text"
                      class="p-name-input"
                      [ngModel]="p.name"
                      (ngModelChange)="updatePlayerName(p.id, $event)"
                      [placeholder]="(isEn() ? 'Player ' : 'Spieler ') + (i + 1)"
                    />
                    <span class="p-score-tag">
                      🏆 {{ p.scorePile.length }}
                    </span>
                    @if (players().length > 2) {
                      <button
                        type="button"
                        class="remove-p-btn"
                        (click)="removePlayer(p.id)"
                        [title]="isEn() ? 'Remove player' : 'Spieler entfernen'"
                      >
                        ✕
                      </button>
                    }
                  </div>
                }
              </div>

              @if (players().length < 8) {
                <div class="add-player-row">
                  <input
                    type="text"
                    class="p-name-input"
                    [ngModel]="newPlayerName()"
                    (ngModelChange)="newPlayerName.set($event)"
                    (keydown.enter)="addPlayer()"
                    [placeholder]="isEn() ? 'New player name...' : 'Neuer Spielername...'"
                  />
                  <button type="button" class="btn-primary sm" (click)="addPlayer()">
                    + {{ isEn() ? 'Add' : 'Hinzufügen' }}
                  </button>
                </div>
              }
            </div>

            <!-- GAME OPTIONS -->
            <div class="rules-config">
              <label class="cfg-label">
                🎴 {{ isEn() ? 'Deck & Tabletop Options' : 'Deck- & Tisch-Optionen' }}
              </label>

              <div class="opt-row">
                <span>{{ isEn() ? 'Card & UI Language:' : 'Karten- & UI-Sprache:' }}</span>
                <div class="pill-group">
                  <button
                    type="button"
                    class="opt-pill"
                    [class.active]="lang() === 'de'"
                    (click)="setLanguage('de')"
                  >
                    🇩🇪 Deutsch (DE)
                  </button>
                  <button
                    type="button"
                    class="opt-pill"
                    [class.active]="lang() === 'en'"
                    (click)="setLanguage('en')"
                  >
                    🇬🇧 English (EN)
                  </button>
                </div>
              </div>

              <div class="opt-row">
                <span>
                  {{
                    isEn()
                      ? 'Category Cards in Draw Pile:'
                      : 'Anzahl Kategoriekarten im Nachziehstapel:'
                  }}
                </span>
                <div class="pill-group">
                  @for (cnt of [24, 36, 48, 72, 108]; track cnt) {
                    <button
                      type="button"
                      class="opt-pill"
                      [class.active]="configuredDeckSize() === cnt"
                      (click)="setDeckSize(cnt)"
                    >
                      {{ cnt }} {{ isEn() ? 'Cards' : 'Karten' }}
                    </button>
                  }
                </div>
              </div>

              <div class="opt-row">
                <span>
                  {{
                    isEn()
                      ? 'Wild Cards (Joker Cards with 2 symbols):'
                      : 'Joker-Karten (Wild Cards mit 2 Symbolen):'
                  }}
                </span>
                <div class="pill-group">
                  <button
                    type="button"
                    class="opt-pill"
                    [class.active]="includeWildCards()"
                    (click)="toggleWildCards(true)"
                  >
                    🃏 {{ isEn() ? 'Included (Recommended)' : 'Aktiviert (Original)' }}
                  </button>
                  <button
                    type="button"
                    class="opt-pill"
                    [class.active]="!includeWildCards()"
                    (click)="toggleWildCards(false)"
                  >
                    🚫 {{ isEn() ? 'No Wild Cards' : 'Ohne Joker-Karten' }}
                  </button>
                </div>
              </div>

              <div class="opt-row">
                <button type="button" class="btn-secondary sm" (click)="startNewGame()">
                  🔄
                  {{
                    isEn()
                      ? 'Shuffle & Restart Match Now'
                      : 'Deck neu mischen & Partie neu starten'
                  }}
                </button>
              </div>
            </div>
          </div>
        </section>
      }

      <!-- GAME OVER / CHAMPION PODIUM BANNER -->
      @if (gameFinished()) {
        <section class="champion-banner glass-panel">
          <div class="champ-left">
            <span class="trophy-icon">🏆</span>
            <div>
              <h2>
                @if (leadingPlayers().length > 1) {
                  {{ isEn() ? 'Tie at the Top!' : 'Unentschieden an der Spitze!' }}
                  ({{ leadingPlayerNames() }})
                } @else {
                  {{ leadingPlayerNames() }}
                  {{ isEn() ? 'wins the Anomia Championship!' : 'gewinnt die Anomia-Partie!' }}
                }
              </h2>
              <p>
                {{
                  isEn()
                    ? 'The draw pile is empty and all symbol duels & chain reactions are resolved!'
                    : 'Der Nachziehstapel ist leer und alle Duelle & Kaskaden sind entschieden!'
                }}
              </p>
            </div>
          </div>
          <div class="champ-actions">
            <button type="button" class="btn-primary" (click)="startNewGame()">
              🔄 {{ isEn() ? 'Play Again (New Deck)' : 'Noch eine Runde spielen' }}
            </button>
          </div>
        </section>
      }

      <!-- ⚡ HIGH-ENERGY ANOMIA DUEL & CASCADE ARENA -->
      @if (activeDuel(); as duel) {
        <section
          class="duel-arena-banner glass-panel"
          [class.cascade-mode]="duel.cascadeLevel > 0"
        >
          <div class="duel-top-bar">
            <div class="duel-badges">
              @if (duel.cascadeLevel > 0) {
                <span class="cascade-badge">
                  🔥
                  {{
                    isEn()
                      ? 'CHAIN REACTION (CASCADE #' + duel.cascadeLevel + ')!'
                      : 'KETTENREAKTION (KASKADE #' + duel.cascadeLevel + ')!'
                  }}
                </span>
              } @else {
                <span class="duel-alert-badge">
                  ⚡ {{ isEn() ? 'ANOMIA SYMBOL DUEL!' : 'ANOMIA SYMBOL-DUELL!' }}
                </span>
              }

              @if (duel.viaWildCard) {
                <span class="wild-match-badge">
                  🃏
                  {{
                    isEn()
                      ? 'Triggered by Active Wild Card!'
                      : 'Ausgelöst durch aktive Joker-Karte!'
                  }}
                </span>
              } @else if (duel.cardA.symbol) {
                <span
                  class="symbol-match-badge"
                  [style.border-color]="getSymbolMeta(duel.cardA.symbol).color"
                  [style.color]="getSymbolMeta(duel.cardA.symbol).color"
                >
                  {{ getSymbolMeta(duel.cardA.symbol).emoji }}
                  {{ getSymbolMeta(duel.cardA.symbol).name[lang()] }}
                </span>
              }
            </div>

            <button
              type="button"
              class="skip-duel-btn"
              (click)="cancelOrSkipDuel()"
              [title]="
                isEn()
                  ? 'Cancel duel if both players pass'
                  : 'Duell überspringen / Unentschieden'
              "
            >
              🤝 {{ isEn() ? 'Tie / Skip Duel' : 'Gleichstand / Überspringen' }}
            </button>
          </div>

          <div class="duel-instruction-headline">
            @if (duel.cascadeLevel > 0) {
              <h3>
                🔥
                {{
                  isEn()
                    ? 'A card underneath was exposed and matches another player!'
                    : 'Durch das Wegnehmen der Karte wurde darunter ein neues Symbol-Paar freigelegt!'
                }}
              </h3>
            } @else {
              <h3>
                ⚡
                {{
                  isEn()
                    ? 'SHOUT AN EXAMPLE FOR YOUR OPPONENT’S CATEGORY!'
                    : 'RUFE EIN BEISPIEL FÜR DIE KATEGORIE DEINES GEGNERS!'
                  }}
              </h3>
            }
          </div>

          <!-- HEAD-TO-HEAD DUELISTS -->
          <div class="duel-head-to-head">
            <!-- DUELIST A -->
            @if (getPlayerById(duel.playerAId); as playerA) {
              @if (getPlayerById(duel.playerBId); as playerB) {
                <div class="duelist-card" [style.border-color]="playerA.color">
                  <div class="duelist-header">
                    <span class="duelist-dot" [style.background]="playerA.color">A</span>
                    <div>
                      <h4>{{ playerA.name }}</h4>
                      <span class="duelist-sub">
                        {{ isEn() ? 'Score Pile:' : 'Siegpunkte:' }}
                        <strong>{{ playerA.scorePile.length }}</strong>
                      </span>
                    </div>
                  </div>

                  <!-- Own Card on Table -->
                  <div class="duelist-own-card">
                    <span class="mini-label">
                      {{ isEn() ? 'Card in front of' : 'Eigene Karte vor' }} {{ playerA.name }}:
                    </span>
                    <div class="mini-anomia-card">
                      @if (duel.cardA.symbol; as symA) {
                        <span
                          class="sym-dot"
                          [style.color]="getSymbolMeta(symA).color"
                        >
                          {{ getSymbolMeta(symA).emoji }}
                        </span>
                      }
                      <strong>{{ duel.cardA.category?.[lang()] }}</strong>
                    </div>
                  </div>

                  <!-- TARGET CATEGORY TO SHOUT -->
                  <div class="shout-target-box">
                    <span class="shout-prompt">
                      🗣️ {{ playerA.name }}
                      {{ isEn() ? 'MUST SHOUT AN EXAMPLE FOR:' : 'MUSS RUFEN FÜR:' }}
                    </span>
                    <div class="target-category-pill">
                      „{{ duel.cardB.category?.[lang()] }}“
                    </div>
                  </div>

                  <button
                    type="button"
                    class="duel-win-btn"
                    [style.background]="playerA.color"
                    (click)="resolveDuel(playerA.id, playerB.id)"
                  >
                    🏆 {{ playerA.name }}
                    {{ isEn() ? 'was faster! [Key 1]' : 'war schneller! [Taste 1]' }}
                  </button>
                </div>

                <!-- VS CENTER -->
                <div class="duel-vs-column">
                  <div class="vs-circle">VS</div>
                  <div class="cross-arrows">⇄</div>
                  <span class="vs-hint">
                    {{
                      isEn()
                        ? 'Cross-read opponent’s card!'
                        : 'Über Kreuz ablesen!'
                    }}
                  </span>
                </div>

                <!-- DUELIST B -->
                <div class="duelist-card" [style.border-color]="playerB.color">
                  <div class="duelist-header">
                    <span class="duelist-dot" [style.background]="playerB.color">B</span>
                    <div>
                      <h4>{{ playerB.name }}</h4>
                      <span class="duelist-sub">
                        {{ isEn() ? 'Score Pile:' : 'Siegpunkte:' }}
                        <strong>{{ playerB.scorePile.length }}</strong>
                      </span>
                    </div>
                  </div>

                  <!-- Own Card on Table -->
                  <div class="duelist-own-card">
                    <span class="mini-label">
                      {{ isEn() ? 'Card in front of' : 'Eigene Karte vor' }} {{ playerB.name }}:
                    </span>
                    <div class="mini-anomia-card">
                      @if (duel.cardB.symbol; as symB) {
                        <span
                          class="sym-dot"
                          [style.color]="getSymbolMeta(symB).color"
                        >
                          {{ getSymbolMeta(symB).emoji }}
                        </span>
                      }
                      <strong>{{ duel.cardB.category?.[lang()] }}</strong>
                    </div>
                  </div>

                  <!-- TARGET CATEGORY TO SHOUT -->
                  <div class="shout-target-box">
                    <span class="shout-prompt">
                      🗣️ {{ playerB.name }}
                      {{ isEn() ? 'MUST SHOUT AN EXAMPLE FOR:' : 'MUSS RUFEN FÜR:' }}
                    </span>
                    <div class="target-category-pill">
                      „{{ duel.cardA.category?.[lang()] }}“
                    </div>
                  </div>

                  <button
                    type="button"
                    class="duel-win-btn"
                    [style.background]="playerB.color"
                    (click)="resolveDuel(playerB.id, playerA.id)"
                  >
                    🏆 {{ playerB.name }}
                    {{ isEn() ? 'was faster! [Key 2]' : 'war schneller! [Taste 2]' }}
                  </button>
                </div>
              }
            }
          </div>

          <!-- OPTIONAL SPOKEN WORD LOG INPUT -->
          <div class="duel-word-note">
            <input
              type="text"
              class="duel-note-input"
              [ngModel]="duelSpokenExample()"
              (ngModelChange)="duelSpokenExample.set($event)"
              [placeholder]="
                isEn()
                  ? 'Optional: Type the winning word shouted (for the Duel History)...'
                  : 'Optional: Gerufenen Sieger-Begriff fürs Protokoll eintragen...'
              "
            />
          </div>
        </section>
      }

      <!-- MAIN TABLETOP CENTERPIECE -->
      <div class="anomia-tabletop">
        <!-- LEFT / TOP HUB: DRAW PILE & WILD CARD SLOT -->
        <aside class="table-center-hub glass-panel">
          <div class="hub-header">
            <span class="hub-badge">
              🎴 {{ isEn() ? 'ANOMIA TABLE CENTER' : 'ANOMIA TISCHMITTE' }}
            </span>
            <span class="cards-left-tag">
              {{ drawPile().length }}
              {{ isEn() ? 'cards left' : 'Karten übrig' }}
            </span>
          </div>

          <!-- ACTIVE TURN STATUS -->
          <div class="turn-status-card" [class.duel-paused]="!!activeDuel()">
            @if (activeDuel()) {
              <span class="turn-tag urgent">
                ⚡ {{ isEn() ? 'DRAWING PAUSED — DUEL ACTIVE' : 'AUFDECKEN PAUSIERT — DUELL LÄUFT' }}
              </span>
              <strong>
                {{
                  isEn()
                    ? 'Resolve the Face-Off Duel above first!'
                    : 'Entscheide zuerst das laufende Anomia-Duell!'
                }}
              </strong>
            } @else if (gameFinished()) {
              <span class="turn-tag">
                🏁 {{ isEn() ? 'MATCH FINISHED' : 'SPIEL BEENDET' }}
              </span>
              <strong>
                {{ isEn() ? 'All cards have been drawn!' : 'Alle Karten wurden aufgedeckt!' }}
              </strong>
            } @else if (currentTurnPlayer(); as activeP) {
              <span class="turn-tag">
                👉 {{ isEn() ? 'NEXT TO FLIP A CARD:' : 'ALS NÄCHSTES AM ZUG:' }}
              </span>
              <div class="turn-player-Chip">
                <span class="p-dot" [style.background]="activeP.color"></span>
                <strong>{{ activeP.name }}</strong>
              </div>
            }
          </div>

          <!-- DRAW PILE CARD VISUAL + BUTTON -->
          <div class="draw-pile-area">
            <div
              class="deck-visual"
              [class.empty]="drawPile().length === 0"
              [class.disabled]="!!activeDuel() || drawPile().length === 0"
              (click)="flipNextCard()"
            >
              <div class="deck-back-pattern">
                <span class="deck-logo">ANOMIA</span>
                <span class="deck-count-big">{{ drawPile().length }}</span>
                <span class="deck-sub">
                  {{ isEn() ? 'DRAW PILE' : 'NACHZIEHSTAPEL' }}
                </span>
              </div>
            </div>

            <button
              type="button"
              class="flip-card-btn"
              [disabled]="!!activeDuel() || drawPile().length === 0"
              (click)="flipNextCard()"
            >
              🃏
              {{
                isEn()
                  ? 'Flip Card [Spacebar]'
                  : 'Karte aufdecken [Leertaste]'
              }}
            </button>
          </div>

          <!-- ACTIVE WILD CARD (JOKER-KARTE) SLOT -->
          <div class="wild-card-slot" [class.active]="!!activeWildCard()">
            <div class="wild-slot-header">
              <span class="wild-title">
                🃏 {{ isEn() ? 'ACTIVE WILD CARD' : 'AKTIVE JOKER-KARTE' }}
              </span>
              <button
                type="button"
                class="wild-test-btn"
                [disabled]="!!activeDuel()"
                (click)="triggerRandomWildCard()"
                [title]="
                  isEn()
                    ? 'Draw or rotate a Wild Card pair now'
                    : 'Joker-Karte direkt aufdecken / wechseln'
                "
              >
                ✨ {{ isEn() ? 'Draw Wild Card' : 'Joker ziehen' }}
              </button>
            </div>

            @if (activeWildCard(); as wild) {
              @if (wild.wildSymbols; as pair) {
                <div class="wild-pair-display">
                  <div class="wild-sym-chip" [style.border-color]="getSymbolMeta(pair[0]).color">
                    <span class="wild-svg-wrap" [style.color]="getSymbolMeta(pair[0]).color">
                      <ng-container
                        *ngTemplateOutlet="symbolSvg; context: { $implicit: pair[0], size: 28 }"
                      ></ng-container>
                    </span>
                    <span>{{ getSymbolMeta(pair[0]).name[lang()] }}</span>
                  </div>

                  <span class="wild-link-icon">⚡=⚡</span>

                  <div class="wild-sym-chip" [style.border-color]="getSymbolMeta(pair[1]).color">
                    <span class="wild-svg-wrap" [style.color]="getSymbolMeta(pair[1]).color">
                      <ng-container
                        *ngTemplateOutlet="symbolSvg; context: { $implicit: pair[1], size: 28 }"
                      ></ng-container>
                    </span>
                    <span>{{ getSymbolMeta(pair[1]).name[lang()] }}</span>
                  </div>
                </div>
                <p class="wild-hint">
                  {{
                    isEn()
                      ? 'These 2 symbols currently trigger duels with each other!'
                      : 'Diese 2 unterschiedlichen Symbole lösen aktuell Duelle miteinander aus!'
                  }}
                </p>
              }
            } @else {
              <div class="wild-empty-state">
                <span>
                  {{
                    isEn()
                      ? 'No Wild Card active yet. Only identical symbols match right now.'
                      : 'Noch keine Joker-Karte aktiv. Aktuell zählen nur identische Symbole.'
                  }}
                </span>
              </div>
            }
          </div>

          <!-- 6 SYMBOLS LEGEND -->
          <div class="symbols-legend">
            <span class="legend-label">
              {{ isEn() ? 'The 6 Anomia Symbols:' : 'Die 6 Anomia-Symbole:' }}
            </span>
            <div class="legend-pills">
              @for (sym of symbolList; track sym.id) {
                <span class="sym-legend-pill" [style.border-color]="sym.color">
                  <span class="sym-mini-icon" [style.color]="sym.color">
                    <ng-container
                      *ngTemplateOutlet="symbolSvg; context: { $implicit: sym.id, size: 15 }"
                    ></ng-container>
                  </span>
                  <span>{{ sym.name[lang()] }}</span>
                </span>
              }
            </div>
          </div>

          <!-- STATUS MESSAGE -->
          @if (statusMessage()) {
            <div class="table-status-toast">
              {{ statusMessage() }}
            </div>
          }
        </aside>

        <!-- RIGHT AREA: PLAYER STACKS GRID (2 TO 8 PLAYERS) -->
        <section class="players-table-section">
          <div class="stacks-grid">
            @for (player of players(); track player.id; let idx = $index) {
              @let topCard = getTopCard(player);
              @let underCard = getUnderneathCard(player);
              @let inDuel = isPlayerInActiveDuel(player.id);
              @let isTurn = currentTurnIndex() === idx && !activeDuel() && !gameFinished();

              <div
                class="player-stack-pod glass-panel"
                [class.active-turn]="isTurn"
                [class.in-duel]="inDuel"
                [style.--p-color]="player.color"
              >
                <!-- PLAYER HEADER -->
                <div class="pod-header">
                  <div class="pod-player-id">
                    <span class="p-dot" [style.background]="player.color">{{ idx + 1 }}</span>
                    <div>
                      <h4>{{ player.name }}</h4>
                      <div class="pod-badges">
                        @if (inDuel) {
                          <span class="badge-duel">
                            ⚡ {{ isEn() ? 'IN DUEL!' : 'IM DUELL!' }}
                          </span>
                        } @else if (isTurn) {
                          <span class="badge-turn">
                            {{ isEn() ? 'NEXT FLIP' : 'AM ZUG' }}
                          </span>
                        }
                      </div>
                    </div>
                  </div>

                  <!-- SCORE PILE (SIEGPUNKTESTAPEL) -->
                  <div
                    class="score-pile-badge"
                    [title]="
                      isEn()
                        ? 'Face-down won cards (Score Pile)'
                        : 'Gewonnene Karten im Siegpunktestapel'
                    "
                  >
                    <span class="score-icon">🏆</span>
                    <div class="score-num">
                      <strong>{{ player.scorePile.length }}</strong>
                      <span>{{ isEn() ? 'Pts' : 'Pkt.' }}</span>
                    </div>
                  </div>
                </div>

                <!-- PERSONAL FACE-UP DISCARD STACK (ABLAGESTAPEL) -->
                <div class="faceup-card-slot">
                  @if (topCard && topCard.symbol; as symId) {
                    @let symMeta = getSymbolMeta(symId);
                    <div
                      class="anomia-playing-card"
                      [style.--sym-color]="symMeta.color"
                      [style.--sym-glow]="symMeta.glow"
                    >
                      <!-- Upside-down top text (authentic Anomia tabletop card look) -->
                      <div class="card-cat-upside">
                        {{ topCard.category?.[lang()] }}
                      </div>

                      <!-- Glowing Center Geometric Symbol -->
                      <div class="card-symbol-center" [style.color]="symMeta.color">
                        <ng-container
                          *ngTemplateOutlet="symbolSvg; context: { $implicit: symId, size: 62 }"
                        ></ng-container>
                      </div>

                      <!-- Right-side-up bottom category -->
                      <div class="card-cat-main">
                        {{ topCard.category?.[lang()] }}
                      </div>

                      <!-- Symbol Name Tag -->
                      <div class="card-sym-caption" [style.color]="symMeta.color">
                        {{ symMeta.name[lang()] }}
                      </div>
                    </div>
                  } @else {
                    <div class="empty-card-slot">
                      <span class="empty-icon">🃏</span>
                      <span>
                        {{
                          isEn()
                            ? 'Face-Up Stack Empty'
                            : 'Ablagestapel noch leer'
                        }}
                      </span>
                    </div>
                  }
                </div>

                <!-- STACK DEPTH & UNDERNEATH CARD PREVIEW FOR CASCADES -->
                <div class="pod-footer">
                  <span class="stack-depth-info">
                    📚 {{ isEn() ? 'Stack depth:' : 'Karten im Stapel:' }}
                    <strong>{{ player.faceUpPile.length }}</strong>
                  </span>

                  @if (underCard && underCard.symbol; as underSym) {
                    <span
                      class="underneath-preview"
                      [title]="
                        isEn()
                          ? 'Card underneath (exposed if top card is lost in a duel -> can trigger a Cascade!)'
                          : 'Darunterliegende Karte (wird bei Verlust freigelegt -> Kaskaden-Gefahr!)'
                      "
                    >
                      {{ isEn() ? 'Underneath:' : 'Darunter:' }}
                      <strong [style.color]="getSymbolMeta(underSym).color">
                        {{ getSymbolMeta(underSym).emoji }}
                        {{ underCard.category?.[lang()] }}
                      </strong>
                    </span>
                  } @else {
                    <span class="underneath-preview muted">
                      {{
                        isEn()
                          ? 'No card underneath'
                          : 'Keine Karte darunter'
                      }}
                    </span>
                  }
                </div>
              </div>
            }
          </div>

          <!-- DUEL & CASCADE HISTORY TICKER -->
          @if (duelHistory().length > 0) {
            <div class="duel-history-box glass-panel">
              <div class="history-head">
                <h4>
                  ⚡
                  {{
                    isEn()
                      ? 'Duel & Chain-Reaction Log'
                      : 'Duell- & Kaskaden-Protokoll'
                  }}
                  ({{ duelHistory().length }})
                </h4>
              </div>
              <div class="history-list">
                @for (item of duelHistory(); track item.id) {
                  <div class="history-chip" [class.is-cascade]="item.cascadeLevel > 0">
                    @if (item.cascadeLevel > 0) {
                      <span class="h-cascade-tag">
                        🔥 {{ isEn() ? 'Cascade #' : 'Kaskade #' }}{{ item.cascadeLevel }}
                      </span>
                    }
                    @if (item.viaWildCard) {
                      <span class="h-wild-tag">🃏 Wild</span>
                    }
                    <strong [style.color]="item.winnerColor">{{ item.winnerName }}</strong>
                    <span>{{ isEn() ? 'beat' : 'besiegt' }} {{ item.loserName }}</span>
                    <span class="h-cat">
                      ({{ getSymbolMeta(item.symbolId).emoji }} „{{ item.wonCategory[lang()] }}“
                      @if (item.shoutedWord) {
                        → <em>{{ item.shoutedWord }}</em>
                      }
                      )
                    </span>
                  </div>
                }
              </div>
            </div>
          }
        </section>
      </div>

      <!-- REUSABLE CRISP GEOMETRIC SVG TEMPLATE FOR THE 6 ANOMIA SYMBOLS -->
      <ng-template #symbolSvg let-symId let-size="size">
        @switch (symId) {
          @case ('circle') {
            <svg
              [attr.width]="size"
              [attr.height]="size"
              viewBox="0 0 100 100"
              class="anomia-svg"
            >
              <circle
                cx="50"
                cy="50"
                r="38"
                fill="currentColor"
                fill-opacity="0.22"
                stroke="currentColor"
                stroke-width="8"
              />
              <circle cx="50" cy="50" r="18" fill="currentColor" />
            </svg>
          }
          @case ('star') {
            <svg
              [attr.width]="size"
              [attr.height]="size"
              viewBox="0 0 100 100"
              class="anomia-svg"
            >
              <polygon
                points="50,8 63,35 93,39 71,60 76,90 50,75 24,90 29,60 7,39 37,35"
                fill="currentColor"
                fill-opacity="0.25"
                stroke="currentColor"
                stroke-width="6"
                stroke-linejoin="round"
              />
            </svg>
          }
          @case ('square') {
            <svg
              [attr.width]="size"
              [attr.height]="size"
              viewBox="0 0 100 100"
              class="anomia-svg"
            >
              <rect
                x="16"
                y="16"
                width="68"
                height="68"
                rx="12"
                fill="currentColor"
                fill-opacity="0.22"
                stroke="currentColor"
                stroke-width="8"
              />
              <rect x="35" y="35" width="30" height="30" rx="5" fill="currentColor" />
            </svg>
          }
          @case ('triangle') {
            <svg
              [attr.width]="size"
              [attr.height]="size"
              viewBox="0 0 100 100"
              class="anomia-svg"
            >
              <polygon
                points="50,12 90,84 10,84"
                fill="currentColor"
                fill-opacity="0.24"
                stroke="currentColor"
                stroke-width="8"
                stroke-linejoin="round"
              />
            </svg>
          }
          @case ('diamond') {
            <svg
              [attr.width]="size"
              [attr.height]="size"
              viewBox="0 0 100 100"
              class="anomia-svg"
            >
              <polygon
                points="50,8 90,50 50,92 10,50"
                fill="currentColor"
                fill-opacity="0.24"
                stroke="currentColor"
                stroke-width="8"
                stroke-linejoin="round"
              />
              <polygon points="50,28 72,50 50,72 28,50" fill="currentColor" />
            </svg>
          }
          @case ('bolt') {
            <svg
              [attr.width]="size"
              [attr.height]="size"
              viewBox="0 0 100 100"
              class="anomia-svg"
            >
              <polygon
                points="58,6 20,54 48,54 38,94 82,44 52,44"
                fill="currentColor"
                fill-opacity="0.28"
                stroke="currentColor"
                stroke-width="6"
                stroke-linejoin="round"
              />
            </svg>
          }
        }
      </ng-template>
    </div>
  `,
  styles: [
    `
      .anomia-page {
        display: flex;
        flex-direction: column;
        gap: 1.35rem;
        padding-bottom: 3rem;
      }

      /* TOPBAR */
      .topbar {
        display: flex;
        justify-content: space-between;
        align-items: center;
        flex-wrap: wrap;
        gap: 0.85rem;
      }

      .back-btn {
        padding: 0.55rem 1rem;
        border-radius: 12px;
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid var(--border-subtle);
        color: var(--text-secondary);
        font-weight: 600;
        font-size: 0.88rem;
      }

      .top-controls {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 0.6rem;
      }

      .lang-switch-group {
        display: inline-flex;
        background: rgba(255, 255, 255, 0.04);
        border: 1px solid var(--border-subtle);
        border-radius: 10px;
        padding: 0.18rem;
        gap: 0.2rem;
      }

      .lang-btn {
        padding: 0.32rem 0.65rem;
        border-radius: 7px;
        border: none;
        background: transparent;
        color: var(--text-secondary);
        font-size: 0.76rem;
        font-weight: 700;
        cursor: pointer;
        transition: all 0.18s ease;
      }

      .lang-btn.active {
        background: rgba(244, 63, 94, 0.24);
        color: #fff;
      }

      .switch-pill {
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.48rem 0.9rem;
        border-radius: 999px;
        border: 1px solid var(--border-subtle);
        background: rgba(255, 255, 255, 0.04);
        color: var(--text-secondary);
        font-size: 0.78rem;
        font-weight: 700;
        cursor: pointer;
      }

      .switch-pill.on {
        background: rgba(16, 185, 129, 0.14);
        border-color: rgba(16, 185, 129, 0.4);
        color: #6ee7b7;
      }

      .switch-pill .led {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: currentColor;
        box-shadow: 0 0 8px currentColor;
      }

      .btn-secondary.sm,
      .btn-primary.sm {
        padding: 0.48rem 0.9rem;
        font-size: 0.82rem;
      }

      /* RULES & SETUP MODALS */
      .rules-panel,
      .setup-panel {
        padding: 1.5rem;
        display: flex;
        flex-direction: column;
        gap: 1.15rem;
        border-color: rgba(244, 63, 94, 0.35);
      }

      .rules-head {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 1rem;
      }

      .rules-head h3 {
        margin: 0;
        font-size: 1.15rem;
      }

      .rules-head p {
        margin: 0.2rem 0 0;
        font-size: 0.85rem;
        color: var(--text-secondary);
      }

      .rules-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
        gap: 0.9rem;
      }

      .rule-card {
        padding: 1rem;
        border-radius: 14px;
        background: rgba(255, 255, 255, 0.03);
        border: 1px solid var(--border-subtle);
      }

      .rule-card h4 {
        margin: 0 0 0.4rem;
        font-size: 0.95rem;
        color: #fda4af;
      }

      .rule-card p {
        margin: 0;
        font-size: 0.82rem;
        line-height: 1.5;
        color: var(--text-secondary);
      }

      .setup-columns {
        display: grid;
        grid-template-columns: 1fr 1.2fr;
        gap: 1.5rem;
      }

      .cfg-label {
        display: block;
        font-size: 0.82rem;
        font-weight: 700;
        color: var(--text-secondary);
        margin-bottom: 0.65rem;
        text-transform: uppercase;
      }

      .player-edit-list {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        margin-bottom: 0.75rem;
      }

      .player-edit-row {
        display: flex;
        align-items: center;
        gap: 0.55rem;
      }

      .p-dot {
        width: 26px;
        height: 26px;
        border-radius: 50%;
        display: grid;
        place-items: center;
        font-size: 0.75rem;
        font-weight: 700;
        color: #fff;
        flex-shrink: 0;
      }

      .p-name-input {
        flex: 1;
        padding: 0.5rem 0.75rem;
        border-radius: 10px;
        border: 1px solid var(--border-subtle);
        background: rgba(0, 0, 0, 0.35);
        color: var(--text-primary);
        font-size: 0.86rem;
      }

      .p-score-tag {
        font-size: 0.8rem;
        color: var(--text-secondary);
      }

      .remove-p-btn {
        background: rgba(239, 68, 68, 0.15);
        border: 1px solid rgba(239, 68, 68, 0.35);
        color: #fca5a5;
        border-radius: 8px;
        padding: 0.35rem 0.55rem;
        cursor: pointer;
      }

      .add-player-row {
        display: flex;
        gap: 0.5rem;
      }

      .rules-config {
        display: flex;
        flex-direction: column;
        gap: 0.9rem;
      }

      .opt-row {
        display: flex;
        flex-direction: column;
        gap: 0.4rem;
        font-size: 0.84rem;
        color: var(--text-secondary);
      }

      .pill-group {
        display: flex;
        gap: 0.5rem;
        flex-wrap: wrap;
      }

      .opt-pill {
        padding: 0.48rem 0.85rem;
        border-radius: 10px;
        border: 1px solid var(--border-subtle);
        background: rgba(255, 255, 255, 0.04);
        color: var(--text-secondary);
        font-size: 0.8rem;
        font-weight: 600;
        cursor: pointer;
      }

      .opt-pill.active {
        background: rgba(244, 63, 94, 0.2);
        border-color: #f43f5e;
        color: #fff;
      }

      /* CHAMPION BANNER */
      .champion-banner {
        padding: 1.5rem 2rem;
        display: flex;
        justify-content: space-between;
        align-items: center;
        flex-wrap: wrap;
        gap: 1rem;
        background: linear-gradient(135deg, rgba(245, 158, 11, 0.22), rgba(244, 63, 94, 0.22));
        border-color: rgba(245, 158, 11, 0.55);
      }

      .champ-left {
        display: flex;
        align-items: center;
        gap: 1rem;
      }

      .trophy-icon {
        font-size: 2.6rem;
      }

      .champ-left h2 {
        margin: 0;
        font-family: var(--font-display);
        font-size: 1.45rem;
      }

      .champ-left p {
        margin: 0.2rem 0 0;
        color: var(--text-secondary);
        font-size: 0.9rem;
      }

      /* ⚡ HIGH-ENERGY DUEL ARENA */
      .duel-arena-banner {
        padding: 1.5rem;
        display: flex;
        flex-direction: column;
        gap: 1.15rem;
        background: radial-gradient(
            circle at 50% 0%,
            rgba(244, 63, 94, 0.26),
            rgba(15, 23, 42, 0.94) 75%
          );
        border: 2px solid rgba(244, 63, 94, 0.7);
        box-shadow: 0 0 36px rgba(244, 63, 94, 0.28);
        animation: pulseBorder 1.8s infinite alternate;
      }

      .duel-arena-banner.cascade-mode {
        background: radial-gradient(
            circle at 50% 0%,
            rgba(249, 115, 22, 0.34),
            rgba(15, 23, 42, 0.95) 75%
          );
        border-color: #f97316;
        box-shadow: 0 0 42px rgba(249, 115, 22, 0.4);
      }

      @keyframes pulseBorder {
        0% {
          box-shadow: 0 0 22px rgba(244, 63, 94, 0.25);
        }
        100% {
          box-shadow: 0 0 42px rgba(244, 63, 94, 0.5);
        }
      }

      .duel-top-bar {
        display: flex;
        justify-content: space-between;
        align-items: center;
        flex-wrap: wrap;
        gap: 0.75rem;
      }

      .duel-badges {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 0.55rem;
      }

      .duel-alert-badge {
        padding: 0.36rem 0.85rem;
        border-radius: 999px;
        background: rgba(244, 63, 94, 0.25);
        border: 1px solid #f43f5e;
        color: #fecdd3;
        font-size: 0.78rem;
        font-weight: 800;
        letter-spacing: 0.05em;
      }

      .cascade-badge {
        padding: 0.4rem 0.95rem;
        border-radius: 999px;
        background: linear-gradient(135deg, #f97316, #ef4444);
        color: #fff;
        font-size: 0.82rem;
        font-weight: 800;
        letter-spacing: 0.05em;
        box-shadow: 0 0 18px rgba(249, 115, 22, 0.6);
      }

      .wild-match-badge {
        padding: 0.34rem 0.75rem;
        border-radius: 999px;
        background: rgba(168, 85, 247, 0.22);
        border: 1px solid #a855f7;
        color: #e9d5ff;
        font-size: 0.76rem;
        font-weight: 700;
      }

      .symbol-match-badge {
        padding: 0.34rem 0.75rem;
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid currentColor;
        font-size: 0.78rem;
        font-weight: 700;
      }

      .skip-duel-btn {
        padding: 0.4rem 0.85rem;
        border-radius: 10px;
        border: 1px solid var(--border-subtle);
        background: rgba(255, 255, 255, 0.06);
        color: var(--text-secondary);
        font-size: 0.78rem;
        font-weight: 600;
        cursor: pointer;
      }

      .duel-instruction-headline h3 {
        margin: 0;
        text-align: center;
        font-family: var(--font-display);
        font-size: 1.25rem;
        color: #fff;
      }

      .duel-head-to-head {
        display: grid;
        grid-template-columns: 1fr auto 1fr;
        gap: 1.15rem;
        align-items: stretch;
      }

      .duelist-card {
        padding: 1.15rem;
        border-radius: 16px;
        background: rgba(15, 23, 42, 0.82);
        border: 2px solid var(--border-subtle);
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        gap: 0.9rem;
      }

      .duelist-header {
        display: flex;
        align-items: center;
        gap: 0.75rem;
      }

      .duelist-dot {
        width: 34px;
        height: 34px;
        border-radius: 50%;
        display: grid;
        place-items: center;
        font-weight: 800;
        color: #fff;
        font-size: 0.9rem;
      }

      .duelist-header h4 {
        margin: 0;
        font-size: 1.1rem;
      }

      .duelist-sub {
        font-size: 0.78rem;
        color: var(--text-secondary);
      }

      .duelist-own-card {
        display: flex;
        flex-direction: column;
        gap: 0.3rem;
        padding: 0.65rem 0.8rem;
        border-radius: 10px;
        background: rgba(255, 255, 255, 0.03);
        border: 1px solid var(--border-subtle);
      }

      .mini-label {
        font-size: 0.72rem;
        color: var(--text-muted);
      }

      .mini-anomia-card {
        display: flex;
        align-items: center;
        gap: 0.45rem;
        font-size: 0.9rem;
      }

      .shout-target-box {
        padding: 0.9rem;
        border-radius: 12px;
        background: linear-gradient(135deg, rgba(245, 158, 11, 0.16), rgba(244, 63, 94, 0.16));
        border: 1px solid rgba(251, 191, 36, 0.45);
        text-align: center;
        display: flex;
        flex-direction: column;
        gap: 0.35rem;
      }

      .shout-prompt {
        font-size: 0.72rem;
        font-weight: 800;
        letter-spacing: 0.05em;
        color: #fde047;
      }

      .target-category-pill {
        font-family: var(--font-display);
        font-size: 1.35rem;
        font-weight: 800;
        color: #fff;
      }

      .duel-win-btn {
        width: 100%;
        padding: 0.85rem 1rem;
        border-radius: 12px;
        border: none;
        color: #fff;
        font-weight: 800;
        font-size: 0.92rem;
        cursor: pointer;
        box-shadow: 0 8px 20px rgba(0, 0, 0, 0.35);
        transition: transform 0.15s ease, filter 0.15s ease;
      }

      .duel-win-btn:hover {
        transform: translateY(-2px);
        filter: brightness(1.1);
      }

      .duel-vs-column {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 0.4rem;
        padding: 0 0.35rem;
      }

      .vs-circle {
        width: 46px;
        height: 46px;
        border-radius: 50%;
        background: rgba(244, 63, 94, 0.22);
        border: 2px solid #f43f5e;
        display: grid;
        place-items: center;
        font-weight: 900;
        font-size: 0.9rem;
        color: #fff;
      }

      .cross-arrows {
        font-size: 1.6rem;
        color: #fde047;
      }

      .vs-hint {
        font-size: 0.7rem;
        color: var(--text-secondary);
        text-align: center;
        max-width: 90px;
      }

      .duel-word-note {
        display: flex;
      }

      .duel-note-input {
        width: 100%;
        padding: 0.55rem 0.85rem;
        border-radius: 10px;
        border: 1px solid var(--border-subtle);
        background: rgba(0, 0, 0, 0.35);
        color: var(--text-primary);
        font-size: 0.84rem;
      }

      /* MAIN TABLETOP LAYOUT */
      .anomia-tabletop {
        display: grid;
        grid-template-columns: 370px 1fr;
        gap: 1.5rem;
        align-items: start;
      }

      .table-center-hub {
        padding: 1.35rem;
        display: flex;
        flex-direction: column;
        gap: 1.1rem;
      }

      .hub-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .hub-badge {
        font-size: 0.74rem;
        font-weight: 800;
        letter-spacing: 0.06em;
        color: #fda4af;
      }

      .cards-left-tag {
        padding: 0.25rem 0.65rem;
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.06);
        font-size: 0.76rem;
        font-weight: 700;
        color: var(--text-secondary);
      }

      .turn-status-card {
        padding: 0.85rem 1rem;
        border-radius: 12px;
        background: rgba(255, 255, 255, 0.03);
        border: 1px solid var(--border-subtle);
        display: flex;
        flex-direction: column;
        gap: 0.35rem;
      }

      .turn-status-card.duel-paused {
        border-color: rgba(244, 63, 94, 0.55);
        background: rgba(244, 63, 94, 0.12);
      }

      .turn-tag {
        font-size: 0.68rem;
        font-weight: 800;
        letter-spacing: 0.06em;
        color: var(--text-muted);
      }

      .turn-tag.urgent {
        color: #fda4af;
      }

      .turn-player-Chip {
        display: flex;
        align-items: center;
        gap: 0.55rem;
        font-size: 1rem;
      }

      /* DRAW PILE VISUAL */
      .draw-pile-area {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.85rem;
      }

      .deck-visual {
        width: 190px;
        height: 235px;
        border-radius: 18px;
        background: linear-gradient(145deg, #1e293b, #0f172a);
        border: 2px solid rgba(244, 63, 94, 0.45);
        box-shadow:
          0 6px 0 #0f172a,
          0 7px 0 rgba(244, 63, 94, 0.35),
          0 12px 0 #0f172a,
          0 13px 0 rgba(244, 63, 94, 0.25),
          0 20px 35px rgba(0, 0, 0, 0.55);
        display: grid;
        place-items: center;
        cursor: pointer;
        user-select: none;
        transition: transform 0.18s ease, box-shadow 0.18s ease;
      }

      .deck-visual:hover:not(.disabled) {
        transform: translateY(-4px);
      }

      .deck-visual.disabled {
        opacity: 0.55;
        cursor: not-allowed;
      }

      .deck-back-pattern {
        width: 86%;
        height: 86%;
        border-radius: 14px;
        border: 1px dashed rgba(244, 63, 94, 0.4);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 0.35rem;
      }

      .deck-logo {
        font-family: var(--font-display);
        font-size: 0.95rem;
        font-weight: 900;
        letter-spacing: 0.16em;
        color: #fda4af;
      }

      .deck-count-big {
        font-family: var(--font-display);
        font-size: 2.6rem;
        font-weight: 900;
        color: #fff;
        line-height: 1;
      }

      .deck-sub {
        font-size: 0.68rem;
        font-weight: 700;
        letter-spacing: 0.08em;
        color: var(--text-muted);
      }

      .flip-card-btn {
        width: 100%;
        padding: 0.9rem 1.2rem;
        border-radius: 14px;
        border: none;
        background: linear-gradient(135deg, #f43f5e, #e11d48);
        color: #fff;
        font-family: var(--font-display);
        font-size: 0.98rem;
        font-weight: 800;
        cursor: pointer;
        box-shadow: 0 10px 24px rgba(244, 63, 94, 0.35);
        transition: all 0.18s ease;
      }

      .flip-card-btn:hover:not(:disabled) {
        transform: translateY(-2px);
        box-shadow: 0 14px 28px rgba(244, 63, 94, 0.5);
      }

      .flip-card-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      /* WILD CARD SLOT */
      .wild-card-slot {
        padding: 1rem;
        border-radius: 14px;
        background: rgba(255, 255, 255, 0.03);
        border: 1px dashed var(--border-subtle);
        display: flex;
        flex-direction: column;
        gap: 0.65rem;
      }

      .wild-card-slot.active {
        background: linear-gradient(145deg, rgba(168, 85, 247, 0.14), rgba(59, 130, 246, 0.12));
        border: 1px solid rgba(168, 85, 247, 0.55);
      }

      .wild-slot-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .wild-title {
        font-size: 0.74rem;
        font-weight: 800;
        letter-spacing: 0.06em;
        color: #d8b4fe;
      }

      .wild-test-btn {
        padding: 0.28rem 0.65rem;
        border-radius: 8px;
        border: 1px solid rgba(168, 85, 247, 0.45);
        background: rgba(168, 85, 247, 0.18);
        color: #e9d5ff;
        font-size: 0.72rem;
        font-weight: 700;
        cursor: pointer;
      }

      .wild-pair-display {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.4rem;
      }

      .wild-sym-chip {
        flex: 1;
        padding: 0.5rem;
        border-radius: 10px;
        background: rgba(15, 23, 42, 0.75);
        border: 1px solid var(--border-subtle);
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.25rem;
        font-size: 0.72rem;
        font-weight: 700;
        text-align: center;
      }

      .wild-link-icon {
        font-size: 0.85rem;
        font-weight: 900;
        color: #fde047;
      }

      .wild-hint {
        margin: 0;
        font-size: 0.74rem;
        color: var(--text-secondary);
        text-align: center;
      }

      .wild-empty-state {
        font-size: 0.78rem;
        color: var(--text-muted);
        text-align: center;
        padding: 0.35rem 0;
      }

      /* SYMBOLS LEGEND */
      .symbols-legend {
        display: flex;
        flex-direction: column;
        gap: 0.45rem;
      }

      .legend-label {
        font-size: 0.72rem;
        font-weight: 700;
        color: var(--text-muted);
        text-transform: uppercase;
      }

      .legend-pills {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 0.38rem;
      }

      .sym-legend-pill {
        display: inline-flex;
        align-items: center;
        gap: 0.38rem;
        padding: 0.3rem 0.55rem;
        border-radius: 8px;
        background: rgba(255, 255, 255, 0.03);
        border: 1px solid var(--border-subtle);
        font-size: 0.73rem;
        font-weight: 600;
      }

      .sym-mini-icon {
        display: inline-flex;
        align-items: center;
      }

      .table-status-toast {
        padding: 0.7rem 0.85rem;
        border-radius: 10px;
        background: rgba(14, 165, 233, 0.14);
        border: 1px solid rgba(56, 189, 248, 0.35);
        color: #bae6fd;
        font-size: 0.8rem;
        font-weight: 600;
        line-height: 1.4;
      }

      /* PLAYER STACKS GRID */
      .players-table-section {
        display: flex;
        flex-direction: column;
        gap: 1.25rem;
      }

      .stacks-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(245px, 1fr));
        gap: 1.1rem;
      }

      .player-stack-pod {
        padding: 1.1rem;
        display: flex;
        flex-direction: column;
        gap: 0.85rem;
        border: 1px solid var(--border-subtle);
        transition: all 0.2s ease;
      }

      .player-stack-pod.active-turn {
        border-color: var(--p-color, #38bdf8);
        box-shadow: 0 0 24px rgba(56, 189, 248, 0.18);
      }

      .player-stack-pod.in-duel {
        border-color: #f43f5e;
        box-shadow: 0 0 28px rgba(244, 63, 94, 0.38);
        transform: translateY(-3px);
      }

      .pod-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 0.5rem;
      }

      .pod-player-id {
        display: flex;
        align-items: center;
        gap: 0.6rem;
      }

      .pod-player-id h4 {
        margin: 0;
        font-size: 0.98rem;
      }

      .pod-badges {
        display: flex;
        gap: 0.35rem;
        margin-top: 0.18rem;
      }

      .badge-turn {
        padding: 0.12rem 0.48rem;
        border-radius: 6px;
        background: rgba(56, 189, 248, 0.18);
        color: #7dd3fc;
        font-size: 0.64rem;
        font-weight: 800;
      }

      .badge-duel {
        padding: 0.12rem 0.48rem;
        border-radius: 6px;
        background: rgba(244, 63, 94, 0.26);
        color: #fda4af;
        font-size: 0.64rem;
        font-weight: 800;
      }

      .score-pile-badge {
        display: flex;
        align-items: center;
        gap: 0.4rem;
        padding: 0.38rem 0.68rem;
        border-radius: 10px;
        background: rgba(245, 158, 11, 0.14);
        border: 1px solid rgba(245, 158, 11, 0.35);
      }

      .score-num {
        display: flex;
        align-items: baseline;
        gap: 0.22rem;
      }

      .score-num strong {
        font-size: 1.05rem;
        color: #fde047;
      }

      .score-num span {
        font-size: 0.68rem;
        color: var(--text-secondary);
      }

      /* ANOMIA PLAYING CARD */
      .faceup-card-slot {
        min-height: 215px;
        display: flex;
      }

      .anomia-playing-card {
        width: 100%;
        padding: 0.85rem 0.95rem;
        border-radius: 16px;
        background: radial-gradient(
            circle at 50% 50%,
            rgba(30, 41, 59, 0.95),
            rgba(15, 23, 42, 0.98)
          );
        border: 2px solid var(--sym-color, #fff);
        box-shadow:
          0 6px 20px rgba(0, 0, 0, 0.45),
          inset 0 0 24px var(--sym-glow, rgba(255, 255, 255, 0.1));
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: space-between;
        gap: 0.45rem;
        text-align: center;
      }

      .card-cat-upside {
        font-size: 0.78rem;
        font-weight: 700;
        color: rgba(255, 255, 255, 0.42);
        transform: rotate(180deg);
        user-select: none;
      }

      .card-symbol-center {
        display: grid;
        place-items: center;
        filter: drop-shadow(0 0 12px currentColor);
        margin: 0.15rem 0;
      }

      .card-cat-main {
        font-family: var(--font-display);
        font-size: 1.12rem;
        font-weight: 800;
        color: #fff;
        line-height: 1.25;
      }

      .card-sym-caption {
        font-size: 0.68rem;
        font-weight: 800;
        letter-spacing: 0.05em;
        text-transform: uppercase;
      }

      .empty-card-slot {
        width: 100%;
        border-radius: 16px;
        border: 1px dashed var(--border-subtle);
        background: rgba(255, 255, 255, 0.02);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 0.4rem;
        color: var(--text-muted);
        font-size: 0.82rem;
      }

      .empty-icon {
        font-size: 1.6rem;
        opacity: 0.5;
      }

      .pod-footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
        flex-wrap: wrap;
        gap: 0.4rem;
        padding-top: 0.45rem;
        border-top: 1px solid var(--border-subtle);
        font-size: 0.74rem;
        color: var(--text-secondary);
      }

      .underneath-preview {
        font-size: 0.72rem;
      }

      .underneath-preview.muted {
        color: var(--text-muted);
      }

      /* DUEL & CASCADE LOG */
      .duel-history-box {
        padding: 1.15rem 1.35rem;
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
      }

      .history-head h4 {
        margin: 0;
        font-size: 0.92rem;
        color: var(--text-secondary);
      }

      .history-list {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
      }

      .history-chip {
        display: inline-flex;
        align-items: center;
        gap: 0.38rem;
        padding: 0.35rem 0.7rem;
        border-radius: 10px;
        background: rgba(255, 255, 255, 0.04);
        border: 1px solid var(--border-subtle);
        font-size: 0.78rem;
      }

      .history-chip.is-cascade {
        border-color: rgba(249, 115, 22, 0.55);
        background: rgba(249, 115, 22, 0.12);
      }

      .h-cascade-tag {
        padding: 0.1rem 0.42rem;
        border-radius: 6px;
        background: #f97316;
        color: #fff;
        font-size: 0.66rem;
        font-weight: 800;
      }

      .h-wild-tag {
        padding: 0.1rem 0.42rem;
        border-radius: 6px;
        background: rgba(168, 85, 247, 0.3);
        color: #e9d5ff;
        font-size: 0.66rem;
        font-weight: 800;
      }

      .h-cat {
        color: var(--text-secondary);
      }

      @media (max-width: 1024px) {
        .anomia-tabletop {
          grid-template-columns: 1fr;
        }
        .setup-columns {
          grid-template-columns: 1fr;
        }
        .duel-head-to-head {
          grid-template-columns: 1fr;
        }
        .duel-vs-column {
          flex-direction: row;
        }
      }
    `,
  ],
})
export class AnomiaGameComponent implements OnDestroy {
  readonly symbolList = SYMBOL_LIST;

  // Language ('de' | 'en') persisted in localStorage
  readonly lang = signal<AnomiaLang>(
    (localStorage.getItem('allinone_anomia_lang') as AnomiaLang) === 'en' ? 'en' : 'de'
  );
  readonly isEn = computed(() => this.lang() === 'en');

  // UI & Audio Switches
  readonly soundOn = signal<boolean>(true);
  readonly showRulesModal = signal<boolean>(false);
  readonly showSetupModal = signal<boolean>(false);

  // Deck Configuration
  readonly configuredDeckSize = signal<number>(36);
  readonly includeWildCards = signal<boolean>(true);

  // Players (2 to 8) — persisted in localStorage across all games
  readonly players = signal<AnomiaPlayer[]>(
    loadSavedPlayerNames(['Spieler 1', 'Spieler 2', 'Spieler 3', 'Spieler 4']).map((name, idx) => ({
      id: idx + 1,
      name,
      color: PLAYER_COLORS[idx % PLAYER_COLORS.length],
      faceUpPile: [],
      scorePile: [],
    }))
  );
  readonly newPlayerName = signal<string>('');
  readonly currentTurnIndex = signal<number>(0);

  // Tabletop State
  readonly drawPile = signal<AnomiaCard[]>([]);
  readonly activeWildCard = signal<AnomiaCard | null>(null);
  readonly activeDuel = signal<AnomiaDuel | null>(null);
  readonly duelSpokenExample = signal<string>('');
  readonly duelHistory = signal<DuelHistoryEntry[]>([]);
  readonly statusMessage = signal<string>('');

  // Track skipped pairs on current turn so "Skip/Tie" doesn't infinitely loop the exact same two card IDs
  private ignoredCardPairs = new Set<string>();
  private audioCtx: AudioContext | null = null;
  private wildPairCursor = 0;

  readonly currentTurnPlayer = computed(
    () => this.players()[this.currentTurnIndex()] || this.players()[0] || null
  );

  readonly gameFinished = computed(
    () => this.drawPile().length === 0 && !this.activeDuel()
  );

  readonly leadingPlayers = computed(() => {
    const list = this.players();
    if (list.length === 0) return [];
    const maxScore = Math.max(...list.map((p) => p.scorePile.length));
    return list.filter((p) => p.scorePile.length === maxScore);
  });

  readonly leadingPlayerNames = computed(() =>
    this.leadingPlayers()
      .map((p) => `${p.name} (${p.scorePile.length})`)
      .join(', ')
  );

  constructor() {
    this.syncDefaultPlayerNames(this.lang());
    this.startNewGame();
  }

  ngOnDestroy(): void {
    if (this.audioCtx) {
      try {
        this.audioCtx.close();
      } catch {}
    }
  }

  setLanguage(l: AnomiaLang): void {
    this.lang.set(l);
    this.statusMessage.set('');
    try {
      localStorage.setItem('allinone_anomia_lang', l);
    } catch {}
    this.syncDefaultPlayerNames(l);
  }

  private syncDefaultPlayerNames(l: AnomiaLang): void {
    this.players.update((list) =>
      list.map((p, idx) => {
        if (l === 'en' && p.name === `Spieler ${idx + 1}`) {
          return { ...p, name: `Player ${idx + 1}` };
        }
        if (l === 'de' && p.name === `Player ${idx + 1}`) {
          return { ...p, name: `Spieler ${idx + 1}` };
        }
        return p;
      })
    );
  }

  toggleSound(): void {
    this.soundOn.set(!this.soundOn());
    if (this.soundOn()) {
      this.playTone(660, 0.08, 'sine');
    }
  }

  setDeckSize(size: number): void {
    this.configuredDeckSize.set(size);
    this.startNewGame();
  }

  toggleWildCards(enable: boolean): void {
    this.includeWildCards.set(enable);
    this.startNewGame();
  }

  getSymbolMeta(id: AnomiaSymbolId): AnomiaSymbolMeta {
    return ANOMIA_SYMBOLS[id];
  }

  getPlayerById(id: number): AnomiaPlayer | undefined {
    return this.players().find((p) => p.id === id);
  }

  getTopCard(player: AnomiaPlayer): AnomiaCard | null {
    return player.faceUpPile.length > 0
      ? player.faceUpPile[player.faceUpPile.length - 1]
      : null;
  }

  getUnderneathCard(player: AnomiaPlayer): AnomiaCard | null {
    return player.faceUpPile.length > 1
      ? player.faceUpPile[player.faceUpPile.length - 2]
      : null;
  }

  isPlayerInActiveDuel(playerId: number): boolean {
    const d = this.activeDuel();
    return !!d && (d.playerAId === playerId || d.playerBId === playerId);
  }

  /**
   * Builds and shuffles a balanced deck of normal category cards + Wild Cards
   */
  startNewGame(): void {
    const count = this.configuredDeckSize();
    const shuffledCategories = this.shuffleArray([...ANOMIA_BASE_CATEGORIES]).slice(0, count);

    const normalCards: AnomiaCard[] = shuffledCategories.map((item, idx) => ({
      id: idx + 1,
      type: 'normal',
      symbol: item.symbol,
      category: { de: item.de, en: item.en },
    }));

    let fullDeck = [...normalCards];

    if (this.includeWildCards()) {
      const wildCount = count >= 48 ? 6 : count >= 36 ? 5 : 4;
      const chosenWilds = this.shuffleArray([...ANOMIA_WILD_PAIRS]).slice(0, wildCount);
      const wildCards: AnomiaCard[] = chosenWilds.map((pair, idx) => ({
        id: 1000 + idx,
        type: 'wild',
        wildSymbols: pair,
      }));
      fullDeck = this.shuffleArray([...normalCards, ...wildCards]);
    } else {
      fullDeck = this.shuffleArray(normalCards);
    }

    this.drawPile.set(fullDeck);
    this.activeWildCard.set(null);
    this.activeDuel.set(null);
    this.duelSpokenExample.set('');
    this.duelHistory.set([]);
    this.ignoredCardPairs.clear();
    this.currentTurnIndex.set(0);

    this.players.update((list) =>
      list.map((p) => ({
        ...p,
        faceUpPile: [],
        scorePile: [],
      }))
    );

    this.statusMessage.set(
      this.isEn()
        ? '🃏 New Anomia deck shuffled! Press "Flip Card" (or Spacebar) to begin.'
        : '🃏 Neues Anomia-Deck gemischt! Klicke auf „Karte aufdecken“ (oder Leertaste).'
    );
  }

  /**
   * Active player flips the top card from the central Draw Pile
   */
  flipNextCard(): void {
    if (this.activeDuel()) return;
    const deck = this.drawPile();
    if (deck.length === 0) return;

    const [drawn, ...rest] = deck;
    this.drawPile.set(rest);

    // Case 1: Drawn card is a Wild Card (Joker-Karte)
    if (drawn.type === 'wild' && drawn.wildSymbols) {
      this.activeWildCard.set(drawn);
      const s1 = this.getSymbolMeta(drawn.wildSymbols[0]).name[this.lang()];
      const s2 = this.getSymbolMeta(drawn.wildSymbols[1]).name[this.lang()];
      this.playWildCardSound();
      this.statusMessage.set(
        this.isEn()
          ? `🃏 WILD CARD DRAWN! ${s1} and ${s2} now trigger duels with each other!`
          : `🃏 JOKER-KARTE GEZOGEN! ${s1} und ${s2} lösen ab sofort Duelle miteinander aus!`
      );

      // Check immediately if two players on the table have those two newly-linked symbols!
      const matchFound = this.checkForDuelAndTrigger(undefined, 0);
      if (!matchFound && this.drawPile().length === 0) {
        this.playVictoryFanfare();
      }
      return;
    }

    // Case 2: Normal Category Card -> place on current turn player's face-up stack
    const turnIdx = this.currentTurnIndex();
    const activePlayer = this.players()[turnIdx];
    if (!activePlayer) return;

    this.players.update((list) =>
      list.map((p, idx) =>
        idx === turnIdx ? { ...p, faceUpPile: [...p.faceUpPile, drawn] } : p
      )
    );

    this.playFlipSound();

    // Advance turn pointer for the next card flip
    const nextTurnIdx = (turnIdx + 1) % this.players().length;
    this.currentTurnIndex.set(nextTurnIdx);

    const symName = drawn.symbol ? this.getSymbolMeta(drawn.symbol).name[this.lang()] : '';
    const catName = drawn.category ? drawn.category[this.lang()] : '';
    this.statusMessage.set(
      this.isEn()
        ? `${activePlayer.name} flipped "${catName}" (${symName}).`
        : `${activePlayer.name} deckt „${catName}“ (${symName}) auf.`
    );

    // Check if the newly flipped card triggers a duel!
    const duelTriggered = this.checkForDuelAndTrigger(activePlayer.id, 0);

    if (!duelTriggered && this.drawPile().length === 0) {
      this.playVictoryFanfare();
    }
  }

  /**
   * Allows drawing/cycling an active Wild Card on demand to test or spice up the tabletop
   */
  triggerRandomWildCard(): void {
    if (this.activeDuel()) return;
    const pair = ANOMIA_WILD_PAIRS[this.wildPairCursor % ANOMIA_WILD_PAIRS.length];
    this.wildPairCursor++;
    const wildCard: AnomiaCard = {
      id: 2000 + this.wildPairCursor,
      type: 'wild',
      wildSymbols: pair,
    };
    this.activeWildCard.set(wildCard);
    this.playWildCardSound();

    const s1 = this.getSymbolMeta(pair[0]).name[this.lang()];
    const s2 = this.getSymbolMeta(pair[1]).name[this.lang()];
    this.statusMessage.set(
      this.isEn()
        ? `🃏 Active Wild Card placed: ${s1} ⚡=⚡ ${s2}!`
        : `🃏 Aktive Joker-Karte ausgelegt: ${s1} ⚡=⚡ ${s2}!`
    );

    this.checkForDuelAndTrigger(undefined, 0);
  }

  /**
   * Checks if any two players' current top face-up cards match (identical symbol or via active Wild Card).
   * Prioritizes pairs involving `priorityPlayerId` (e.g., the player who just flipped a card or whose stack just exposed a card underneath).
   */
  private checkForDuelAndTrigger(priorityPlayerId?: number, cascadeLevel = 0): boolean {
    const list = this.players();
    const pairs: Array<[AnomiaPlayer, AnomiaPlayer]> = [];

    // Prioritize checks involving the priority player first
    if (priorityPlayerId !== undefined) {
      const prioPlayer = list.find((p) => p.id === priorityPlayerId);
      if (prioPlayer) {
        for (const other of list) {
          if (other.id !== prioPlayer.id) {
            pairs.push([prioPlayer, other]);
          }
        }
      }
    }

    // Also check all other pairs on the table
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        pairs.push([list[i], list[j]]);
      }
    }

    for (const [pA, pB] of pairs) {
      const topA = this.getTopCard(pA);
      const topB = this.getTopCard(pB);
      if (!topA || !topB || !topA.symbol || !topB.symbol) continue;

      const pairKey = [topA.id, topB.id].sort((a, b) => a - b).join('-');
      if (this.ignoredCardPairs.has(pairKey)) continue;

      const matchResult = this.doSymbolsMatch(topA.symbol, topB.symbol);
      if (matchResult.matches) {
        this.activeDuel.set({
          playerAId: pA.id,
          playerBId: pB.id,
          cardA: topA,
          cardB: topB,
          viaWildCard: matchResult.viaWild,
          cascadeLevel,
        });

        if (cascadeLevel > 0) {
          this.playCascadeAlertSound(cascadeLevel);
        } else {
          this.playDuelAlertSound();
        }
        return true;
      }
    }

    this.activeDuel.set(null);
    return false;
  }

  private doSymbolsMatch(
    symA: AnomiaSymbolId,
    symB: AnomiaSymbolId
  ): { matches: boolean; viaWild: boolean } {
    if (symA === symB) {
      return { matches: true, viaWild: false };
    }
    const wild = this.activeWildCard();
    if (wild && wild.wildSymbols) {
      const [w1, w2] = wild.wildSymbols;
      if ((symA === w1 && symB === w2) || (symA === w2 && symB === w1)) {
        return { matches: true, viaWild: true };
      }
    }
    return { matches: false, viaWild: false };
  }

  /**
   * Resolves the current duel:
   * 1. Winner takes loser's top face-up card into their Score Pile (+1 point).
   * 2. Loser's stack now exposes the card underneath -> immediately check for a Chain Reaction (Kaskade)!
   */
  resolveDuel(winnerId: number, loserId: number): void {
    const duel = this.activeDuel();
    if (!duel) return;

    const winner = this.getPlayerById(winnerId);
    const loser = this.getPlayerById(loserId);
    const loserTopCard = loser ? this.getTopCard(loser) : null;
    if (!winner || !loser || !loserTopCard) return;

    const shouted = this.duelSpokenExample().trim();
    this.duelSpokenExample.set('');

    // Move loser's top card to winner's scorePile
    this.players.update((list) =>
      list.map((p) => {
        if (p.id === loserId) {
          return {
            ...p,
            faceUpPile: p.faceUpPile.slice(0, -1),
          };
        }
        if (p.id === winnerId) {
          return {
            ...p,
            scorePile: [...p.scorePile, loserTopCard],
          };
        }
        return p;
      })
    );

    // Record in Duel & Cascade log
    if (loserTopCard.category && loserTopCard.symbol) {
      this.duelHistory.update((hist) => [
        {
          id: Date.now() + Math.random(),
          winnerName: winner.name,
          winnerColor: winner.color,
          loserName: loser.name,
          wonCategory: loserTopCard.category!,
          symbolId: loserTopCard.symbol!,
          cascadeLevel: duel.cascadeLevel,
          viaWildCard: duel.viaWildCard,
          shoutedWord: shouted || undefined,
        },
        ...hist,
      ]);
    }

    this.playDuelWinSound();

    // KASKADEN-CHECK (Chain Reaction):
    // Because loser's top card was removed, check if loser's newly exposed card matches anyone!
    const nextCascadeLevel = duel.cascadeLevel + 1;
    const cascadeTriggered = this.checkForDuelAndTrigger(loserId, nextCascadeLevel);

    if (cascadeTriggered) {
      const nextDuel = this.activeDuel()!;
      const pA = this.getPlayerById(nextDuel.playerAId)?.name || '';
      const pB = this.getPlayerById(nextDuel.playerBId)?.name || '';
      this.statusMessage.set(
        this.isEn()
          ? `🔥 CHAIN REACTION (CASCADE #${nextCascadeLevel})! Removing ${loser.name}'s card exposed a new match between ${pA} & ${pB}!`
          : `🔥 KETTENREAKTION (KASKADE #${nextCascadeLevel})! Unter ${loser.name}s Stapel kam ein neues Symbol-Paar (${pA} vs. ${pB}) zum Vorschein!`
      );
    } else {
      const wonCatName = loserTopCard.category?.[this.lang()] || '';
      this.statusMessage.set(
        this.isEn()
          ? `🏆 ${winner.name} wins the duel against ${loser.name} and claims "${wonCatName}" (+1 pt)!`
          : `🏆 ${winner.name} gewinnt das Duell gegen ${loser.name} und sichert sich „${wonCatName}“ (+1 Punkt)!`
      );

      if (this.drawPile().length === 0) {
        this.playVictoryFanfare();
      }
    }
  }

  /**
   * If both players are stumped or agree to a tie, mark this exact card-pair as ignored so play can continue
   */
  cancelOrSkipDuel(): void {
    const duel = this.activeDuel();
    if (!duel) return;

    const pairKey = [duel.cardA.id, duel.cardB.id].sort((a, b) => a - b).join('-');
    this.ignoredCardPairs.add(pairKey);
    this.duelSpokenExample.set('');

    // Check if another pair is waiting
    const anotherDuel = this.checkForDuelAndTrigger(undefined, duel.cascadeLevel);
    if (!anotherDuel) {
      this.statusMessage.set(
        this.isEn()
          ? '🤝 Duel skipped as a tie. Both cards stay on their stacks.'
          : '🤝 Duell als Gleichstand übersprungen. Beide Karten bleiben liegen.'
      );
    }
  }

  // Player management
  addPlayer(): void {
    const current = this.players();
    if (current.length >= 8) return;
    const nextId = Math.max(0, ...current.map((p) => p.id)) + 1;
    const prefix = this.isEn() ? 'Player' : 'Spieler';
    const name = this.newPlayerName().trim() || `${prefix} ${current.length + 1}`;
    const color = PLAYER_COLORS[(nextId - 1) % PLAYER_COLORS.length];
    this.players.set([
      ...current,
      { id: nextId, name, color, faceUpPile: [], scorePile: [] },
    ]);
    this.newPlayerName.set('');
    savePlayerNames(this.players().map((p) => p.name));
  }

  removePlayer(id: number): void {
    if (this.players().length <= 2) return;
    this.players.update((list) => list.filter((p) => p.id !== id));
    savePlayerNames(this.players().map((p) => p.name));
    if (this.currentTurnIndex() >= this.players().length) {
      this.currentTurnIndex.set(0);
    }
    this.startNewGame();
  }

  updatePlayerName(id: number, name: string): void {
    this.players.update((list) =>
      list.map((p) => (p.id === id ? { ...p, name } : p))
    );
    savePlayerNames(this.players().map((p) => p.name));
  }

  @HostListener('window:keydown', ['$event'])
  handleKeyboard(e: KeyboardEvent): void {
    const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
    if (tag === 'input' || tag === 'textarea') return;

    const duel = this.activeDuel();
    if (duel) {
      if (e.key === '1') {
        e.preventDefault();
        this.resolveDuel(duel.playerAId, duel.playerBId);
      } else if (e.key === '2') {
        e.preventDefault();
        this.resolveDuel(duel.playerBId, duel.playerAId);
      }
      return;
    }

    if (e.code === 'Space') {
      e.preventDefault();
      this.flipNextCard();
    }
  }

  private shuffleArray<T>(arr: T[]): T[] {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  // Web Audio API Sound Effects
  private getAudioContext(): AudioContext | null {
    if (!this.soundOn()) return null;
    if (!this.audioCtx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) this.audioCtx = new AudioCtx();
    }
    return this.audioCtx;
  }

  private playTone(freq: number, duration: number, type: OscillatorType = 'sine'): void {
    const ctx = this.getAudioContext();
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch {}
  }

  private playFlipSound(): void {
    this.playTone(540, 0.06, 'triangle');
  }

  private playWildCardSound(): void {
    this.playTone(480, 0.09, 'sine');
    setTimeout(() => this.playTone(720, 0.12, 'sine'), 80);
  }

  private playDuelAlertSound(): void {
    this.playTone(620, 0.11, 'sawtooth');
    setTimeout(() => this.playTone(880, 0.18, 'sawtooth'), 100);
  }

  private playCascadeAlertSound(level: number): void {
    const base = 580 + Math.min(level * 90, 360);
    this.playTone(base, 0.09, 'square');
    setTimeout(() => this.playTone(base + 180, 0.1, 'square'), 85);
    setTimeout(() => this.playTone(base + 340, 0.2, 'sawtooth'), 170);
  }

  private playDuelWinSound(): void {
    this.playTone(587.33, 0.09, 'triangle');
    setTimeout(() => this.playTone(880, 0.15, 'triangle'), 90);
  }

  private playVictoryFanfare(): void {
    this.playTone(523.25, 0.12, 'triangle');
    setTimeout(() => this.playTone(659.25, 0.12, 'triangle'), 120);
    setTimeout(() => this.playTone(783.99, 0.14, 'triangle'), 240);
    setTimeout(() => this.playTone(1046.5, 0.28, 'triangle'), 360);
  }
}
