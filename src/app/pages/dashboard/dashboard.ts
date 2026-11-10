import { Component, OnDestroy, OnInit, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CATALOG_ITEMS, CatalogItem } from '../../models/catalog.model';
import { YtDownloaderService } from '../../services/yt-downloader.service';
import { ModeService } from '../../services/mode.service';
import { LanguageService } from '../../services/language.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="dashboard-wrapper">
      <!-- HERO WORKSPACE SECTION -->
      <section class="hero-card" [attr.data-mode]="modeService.activeMode()">
        <div class="hero-top-accent"></div>

        <div class="hero-content">
          <div class="hero-meta-row">
            <span class="mode-tag-chip">
              <span class="mode-tag-dot"></span>
              {{ modeService.isGames() ? 'MODUS: SPIELE' : 'MODUS: NOTEBOOK' }}
            </span>

            @if (modeService.isNotebook()) {
              <span class="status-chip" [class.online]="backendOnline()">
                <span class="status-dot"></span>
                {{ backendOnline() ? 'Python Engine Online (:8765)' : 'Python Backend bereit' }}
              </span>
            } @else {
              <span class="status-chip online">
                <span class="status-dot"></span>
                {{ langService.isEn() ? 'Local Multiplayer Ready' : 'Lokaler Mehrspieler bereit' }}
              </span>
            }

            <span class="count-chip">
              {{ totalModeCount() }} {{ modeService.isGames() ? (langService.isEn() ? 'Games' : 'Spiele') : (langService.isEn() ? 'Tools' : 'Werkzeuge') }}
            </span>
          </div>

          <h1 class="hero-title">
            @if (modeService.isGames()) {
              {{ langService.isEn() ? 'Board & Social Games' : 'Gesellschafts- & Denkspiele' }}
            } @else {
              {{ langService.isEn() ? 'Notebook & Local Engines' : 'Notebook & Lokale Werkzeuge' }}
            }
          </h1>

          <p class="hero-subtitle">
            @if (modeService.isGames()) {
              {{
                langService.isEn()
                  ? 'Engaging party and tabletop games for groups at the table or screen — no accounts, no ads, instant offline play.'
                  : 'Lokale Partyspiele für gemeinsame Runden am Tisch oder Bildschirm – ohne Internetzwang, ohne Werbung, sofort spielbereit.'
              }}
            } @else {
              {{
                langService.isEn()
                  ? 'High-performance local Python and browser utilities for video downloads, AI cutouts, format conversion, and diagnostics.'
                  : 'Leistungsstarke Offline-Engines für Video-Download, KI-Freistellung, universelle Dateikonvertierung und Systemdiagnose.'
              }}
            }
          </p>

          <div class="hero-actions">
            @if (activeSpotlight(); as spot) {
              <a [routerLink]="spot.route" class="btn-primary">
                <span>{{ spot.icon }} {{ spot.title }}</span>
                <span class="arrow">→</span>
              </a>
            }

            <button
              type="button"
              class="btn-secondary"
              (click)="modeService.toggleMode()"
              [title]="modeService.isGames() ? 'Zu Notebook & Werkzeugen wechseln' : 'Zu den Spielen wechseln'"
            >
              <span>{{ modeService.isGames() ? '📓 Zu Notebook & Tools' : '🎮 Zu den Spielen' }}</span>
            </button>
          </div>
        </div>

        <!-- SPOTLIGHT CARD: ROTATES ONLY WITHIN ACTIVE MODE -->
        @if (activeSpotlight(); as spot) {
          <div
            class="hero-spotlight"
            (mouseenter)="pauseSpotlight()"
            (mouseleave)="resumeSpotlight()"
          >
            <div class="spotlight-card">
              <!-- HAIRLINE PROGRESS INDICATOR -->
              <div class="spotlight-progress-track">
                <div class="spotlight-progress-fill" [style.width.%]="spotlightProgress()"></div>
              </div>

              <!-- TOP BAR: BADGES + NAV -->
              <div class="spotlight-top">
                <div class="spotlight-badges">
                  <span class="spot-pill">
                    {{ modeService.isGames() ? 'SPIEL-SPOTLIGHT' : 'TOOL-SPOTLIGHT' }}
                  </span>
                  <span class="spot-badge-chip">{{ spot.badge }}</span>
                </div>

                <div class="spotlight-nav">
                  <button
                    type="button"
                    class="spot-nav-btn"
                    (click)="prevSpotlight()"
                    title="Vorheriges Highlight"
                    aria-label="Vorheriges Highlight"
                  >
                    ‹
                  </button>
                  <span class="spot-counter">
                    {{ formatIndex(spotlightIndex() + 1) }} / {{ formatIndex(modeItems().length) }}
                  </span>
                  <button
                    type="button"
                    class="spot-nav-btn"
                    (click)="nextSpotlight()"
                    title="Nächstes Highlight"
                    aria-label="Nächstes Highlight"
                  >
                    ›
                  </button>
                </div>
              </div>

              <!-- TITLE ROW -->
              <div class="spotlight-title-row">
                <div class="spotlight-icon-box">
                  {{ spot.icon }}
                </div>
                <div class="spotlight-headings">
                  <h3>{{ spot.title }}</h3>
                  <p class="spot-sub">{{ spot.subtitle }}</p>
                </div>
              </div>

              <!-- DESCRIPTION -->
              <p class="spotlight-desc">{{ spot.description }}</p>

              <!-- HIGHLIGHTS LIST -->
              <div class="spotlight-features">
                @for (feat of spot.highlights; track feat) {
                  <div class="feat-item">
                    <span class="feat-bullet">✓</span>
                    <span class="feat-text">{{ feat }}</span>
                  </div>
                }
              </div>

              <!-- BOTTOM LAUNCH CTA -->
              <div class="spotlight-footer">
                <a [routerLink]="spot.route" class="spotlight-cta">
                  <span>{{ modeService.isGames() ? 'Jetzt spielen' : 'Programm öffnen' }}</span>
                  <span class="cta-arrow">→</span>
                </a>
              </div>

              <!-- SELECTOR STRIP FOR ITEMS IN CURRENT MODE -->
              <div class="spotlight-dots" role="tablist" aria-label="Spotlight Schnellauswahl">
                @for (item of modeItems(); track item.id; let idx = $index) {
                  <button
                    type="button"
                    class="spot-dot-btn"
                    [class.active]="spotlightIndex() === idx"
                    [title]="item.title"
                    (click)="goToSpotlight(idx)"
                  >
                    <span>{{ item.icon }}</span>
                  </button>
                }
              </div>
            </div>
          </div>
        }
      </section>

      <!-- FILTER & SEARCH BAR -->
      <section class="controls-bar">
        <div class="filter-tabs" role="tablist">
          <button
            type="button"
            class="tab-btn"
            [class.active]="selectedFilter() === 'all' && !selectedTag()"
            (click)="selectFilter('all')"
          >
            <span>{{ modeService.isGames() ? (langService.isEn() ? 'All Games' : 'Alle Spiele') : (langService.isEn() ? 'All Tools' : 'Alle Werkzeuge') }}</span>
            <span class="count-pill">{{ totalModeCount() }}</span>
          </button>

          <button
            type="button"
            class="tab-btn"
            [class.active]="selectedFilter() === 'favorites'"
            (click)="selectFilter('favorites')"
          >
            <span>★ {{ langService.isEn() ? 'Favorites' : 'Favoriten' }}</span>
            <span class="count-pill">{{ favoriteCount() }}</span>
          </button>
        </div>

        <div class="search-box">
          <svg class="search-icon" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path fill-rule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clip-rule="evenodd" />
          </svg>
          <input
            type="text"
            [ngModel]="searchQuery()"
            (ngModelChange)="searchQuery.set($event)"
            [placeholder]="
              modeService.isGames()
                ? (langService.isEn() ? 'Search games, rules, buzzer...' : 'Suche nach Spielen, Regeln, Tapple...')
                : (langService.isEn() ? 'Search tools, python, converter...' : 'Suche nach Tools, Python, Konverter...')
            "
            class="search-input"
          />
          @if (searchQuery()) {
            <button type="button" class="clear-btn" (click)="searchQuery.set('')" title="Suche leeren">✕</button>
          }
        </div>
      </section>

      <!-- TAG FILTER STRIP (OPTIONAL DRILL-DOWN) -->
      @if (availableTags().length > 0) {
        <div class="tags-strip" aria-label="Schlagwort-Filter">
          <span class="tags-label">{{ langService.isEn() ? 'Filter by topic:' : 'Themen:' }}</span>
          @for (tag of availableTags(); track tag) {
            <button
              type="button"
              class="tag-filter-chip"
              [class.active]="selectedTag() === tag"
              (click)="toggleTag(tag)"
            >
              {{ tag }}
            </button>
          }
          @if (selectedTag()) {
            <button type="button" class="tag-reset-link" (click)="selectedTag.set(null)">
              {{ langService.isEn() ? 'Clear topic ✕' : 'Thema aufheben ✕' }}
            </button>
          }
        </div>
      }

      <!-- CATALOG GRID -->
      <section class="catalog-section">
        <div class="section-meta-row">
          <div class="section-title-wrap">
            <h2 class="section-heading">
              @if (selectedFilter() === 'favorites') {
                {{ langService.isEn() ? 'Saved Favorites' : 'Gespeicherte Favoriten' }}
              } @else if (selectedTag()) {
                {{ langService.isEn() ? 'Filtered by: ' + selectedTag() : 'Gefiltert nach: ' + selectedTag() }}
              } @else if (searchQuery()) {
                {{ langService.isEn() ? 'Search Results' : 'Suchergebnisse' }}
              } @else {
                {{ modeService.isGames() ? (langService.isEn() ? 'Active Games Collection' : 'Aktive Spielesammlung') : (langService.isEn() ? 'Local Tools & Engines' : 'Lokale Werkzeuge & Engines') }}
              }
            </h2>
            <span class="section-count-label">
              {{ displayedItems().length }} {{ displayedItems().length === 1 ? (langService.isEn() ? 'entry' : 'Eintrag') : (langService.isEn() ? 'entries' : 'Einträge') }}
            </span>
          </div>

          @if (selectedFilter() !== 'all' || selectedTag() || searchQuery()) {
            <button type="button" class="reset-filters-btn" (click)="resetFilters()">
              {{ langService.isEn() ? 'Reset filters ✕' : 'Filter zurücksetzen ✕' }}
            </button>
          }
        </div>

        @if (displayedItems().length > 0) {
          <div class="cards-grid">
            @for (item of displayedItems(); track item.id) {
              <article class="catalog-card">
                <div class="card-accent-line"></div>

                <div class="card-top">
                  <div class="card-icon-box">
                    <span>{{ item.icon }}</span>
                  </div>

                  <div class="card-top-badges">
                    <span class="card-badge-chip">{{ item.badge }}</span>
                    <button
                      type="button"
                      class="fav-btn"
                      [class.active]="isFavorite(item.id)"
                      (click)="toggleFavorite(item.id, $event)"
                      [title]="isFavorite(item.id) ? 'Aus Favoriten entfernen' : 'Zu Favoriten hinzufügen'"
                      [attr.aria-label]="isFavorite(item.id) ? 'Aus Favoriten entfernen' : 'Zu Favoriten hinzufügen'"
                    >
                      {{ isFavorite(item.id) ? '★' : '☆' }}
                    </button>
                  </div>
                </div>

                <div class="card-body">
                  <span class="card-cat-meta">{{ item.categoryLabel }}</span>
                  <h3 class="card-title">{{ item.title }}</h3>
                  <p class="card-subtitle">{{ item.subtitle }}</p>
                  <p class="card-description">{{ item.description }}</p>
                </div>

                <div class="card-tags-row">
                  @for (t of item.tags.slice(0, 4); track t) {
                    <span class="card-tag">{{ t }}</span>
                  }
                </div>

                <div class="card-footer">
                  <span class="card-stats">{{ item.statsLabel || '' }}</span>
                  <a [routerLink]="item.route" class="card-launch-btn">
                    <span>{{ item.category === 'games' ? (langService.isEn() ? 'Play' : 'Spielen') : (langService.isEn() ? 'Open' : 'Öffnen') }}</span>
                    <span class="arrow">→</span>
                  </a>
                </div>
              </article>
            }
          </div>
        } @else {
          <div class="empty-state">
            <div class="empty-icon-box">∅</div>
            <h3>{{ langService.isEn() ? 'No items found' : 'Keine Einträge gefunden' }}</h3>
            <p>
              {{
                langService.isEn()
                  ? 'No entries match your current search or filter criteria in this mode.'
                  : 'Für deine aktuelle Auswahl oder Suche gibt es in diesem Modus keine Treffer.'
              }}
            </p>
            <button type="button" class="btn-secondary" (click)="resetFilters()">
              {{ langService.isEn() ? 'Show all entries' : 'Alle Einträge anzeigen' }}
            </button>
          </div>
        }
      </section>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }

    .dashboard-wrapper {
      display: flex;
      flex-direction: column;
      gap: 24px;
      padding-bottom: 48px;
    }

    /* =========================================================================
       HERO CARD (UNSLOPPED DIGITAL WORKSHOP / DESK)
       ========================================================================= */
    .hero-card {
      position: relative;
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-xl);
      padding: 28px;
      display: grid;
      grid-template-columns: 1.25fr 1fr;
      gap: 28px;
      align-items: stretch;
      overflow: hidden;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.25);
    }

    .hero-top-accent {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 2px;
      background: var(--accent);
      opacity: 0.8;
    }

    .hero-content {
      display: flex;
      flex-direction: column;
      gap: 16px;
      justify-content: center;
      z-index: 1;
    }

    .hero-meta-row {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px;
    }

    .mode-tag-chip {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 3px 8px;
      border-radius: var(--radius-sm);
      background: var(--bg-surface-active);
      border: 1px solid var(--border-strong);
      color: var(--text-primary);
      font-family: var(--font-mono);
      font-size: 0.72rem;
      font-weight: 600;
      letter-spacing: 0.05em;
    }

    .mode-tag-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--accent);
    }

    .status-chip {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 3px 8px;
      border-radius: var(--radius-sm);
      background: var(--bg-surface-elevated);
      border: 1px solid var(--border-subtle);
      color: var(--text-secondary);
      font-family: var(--font-mono);
      font-size: 0.72rem;
    }

    .status-chip.online {
      color: #6ee7b7;
      border-color: rgba(16, 185, 129, 0.3);
      background: rgba(16, 185, 129, 0.08);
    }

    .status-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: currentColor;
    }

    .count-chip {
      padding: 3px 8px;
      border-radius: var(--radius-sm);
      background: var(--bg-surface-elevated);
      border: 1px solid var(--border-subtle);
      color: var(--text-muted);
      font-family: var(--font-mono);
      font-size: 0.72rem;
      font-variant-numeric: tabular-nums;
    }

    .hero-title {
      margin: 0;
      font-family: var(--font-sans);
      font-size: clamp(1.75rem, 3vw, 2.35rem);
      font-weight: 700;
      line-height: 1.18;
      letter-spacing: -0.02em;
      color: var(--text-primary);
    }

    .hero-subtitle {
      margin: 0;
      font-size: 0.95rem;
      line-height: 1.6;
      color: var(--text-secondary);
      max-width: 58ch;
    }

    .hero-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      align-items: center;
      margin-top: 4px;
    }

    .hero-actions .btn-primary,
    .hero-actions .btn-secondary {
      font-size: 0.88rem;
      padding: 8px 16px;
    }

    /* =========================================================================
       SPOTLIGHT COMPONENT (TACTILE & QUIET)
       ========================================================================= */
    .hero-spotlight {
      display: flex;
      flex-direction: column;
    }

    .spotlight-card {
      position: relative;
      background: var(--bg-surface-elevated);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-lg);
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 14px;
      height: 100%;
      overflow: hidden;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    }

    .spotlight-progress-track {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 2px;
      background: rgba(255, 255, 255, 0.05);
    }

    .spotlight-progress-fill {
      height: 100%;
      background: var(--accent);
      transition: width 0.09s linear;
    }

    .spotlight-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 8px;
    }

    .spotlight-badges {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-wrap: wrap;
    }

    .spot-pill {
      font-family: var(--font-mono);
      font-size: 0.68rem;
      font-weight: 700;
      letter-spacing: 0.05em;
      color: var(--accent);
      background: var(--accent-subtle);
      padding: 2px 6px;
      border-radius: var(--radius-sm);
      border: 1px solid var(--accent);
    }

    .spot-badge-chip {
      font-family: var(--font-mono);
      font-size: 0.68rem;
      color: var(--text-secondary);
      background: var(--bg-surface-active);
      border: 1px solid var(--border-subtle);
      padding: 2px 6px;
      border-radius: var(--radius-sm);
    }

    .spotlight-nav {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .spot-nav-btn {
      width: 26px;
      height: 26px;
      border-radius: var(--radius-sm);
      border: 1px solid var(--border-subtle);
      background: var(--bg-surface-active);
      color: var(--text-primary);
      font-size: 0.95rem;
      line-height: 1;
      cursor: pointer;
      display: grid;
      place-items: center;
      transition: all 0.15s ease;
    }

    .spot-nav-btn:hover {
      background: var(--bg-surface-hover);
      border-color: var(--border-strong);
    }

    .spot-counter {
      font-family: var(--font-mono);
      font-size: 0.72rem;
      color: var(--text-muted);
      min-width: 48px;
      text-align: center;
      font-variant-numeric: tabular-nums;
    }

    .spotlight-title-row {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .spotlight-icon-box {
      width: 44px;
      height: 44px;
      border-radius: var(--radius-md);
      background: var(--bg-surface-active);
      border: 1px solid var(--border-subtle);
      display: grid;
      place-items: center;
      font-size: 1.45rem;
      flex-shrink: 0;
    }

    .spotlight-headings h3 {
      margin: 0;
      font-size: 1.15rem;
      font-weight: 700;
      color: var(--text-primary);
      letter-spacing: -0.01em;
    }

    .spot-sub {
      margin: 2px 0 0;
      font-size: 0.8rem;
      color: var(--text-muted);
    }

    .spotlight-desc {
      margin: 0;
      font-size: 0.85rem;
      line-height: 1.5;
      color: var(--text-secondary);
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .spotlight-features {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 6px 10px;
      padding: 10px 12px;
      background: var(--bg-canvas);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
      font-size: 0.76rem;
    }

    .feat-item {
      display: flex;
      align-items: center;
      gap: 6px;
      overflow: hidden;
    }

    .feat-bullet {
      color: var(--accent);
      font-weight: 700;
    }

    .feat-text {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      color: var(--text-secondary);
    }

    .spotlight-footer {
      display: flex;
      align-items: center;
    }

    .spotlight-cta {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      width: 100%;
      padding: 8px 14px;
      border-radius: var(--radius-md);
      background: var(--accent);
      color: #0b0d12;
      font-weight: 600;
      font-size: 0.85rem;
      text-decoration: none;
      transition: opacity 0.15s ease, transform 0.15s ease;
    }

    .spotlight-cta:hover {
      opacity: 0.92;
      transform: translateY(-1px);
    }

    .spotlight-dots {
      display: flex;
      justify-content: center;
      flex-wrap: wrap;
      gap: 4px;
      padding-top: 2px;
    }

    .spot-dot-btn {
      width: 28px;
      height: 28px;
      border-radius: var(--radius-sm);
      border: 1px solid var(--border-subtle);
      background: var(--bg-surface-active);
      font-size: 0.82rem;
      cursor: pointer;
      display: grid;
      place-items: center;
      opacity: 0.6;
      transition: all 0.15s ease;
    }

    .spot-dot-btn:hover {
      opacity: 0.9;
      background: var(--bg-surface-hover);
    }

    .spot-dot-btn.active {
      opacity: 1;
      border-color: var(--accent);
      background: var(--accent-subtle);
    }

    /* =========================================================================
       CONTROLS BAR (TABS & SEARCH)
       ========================================================================= */
    .controls-bar {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      padding: 10px 14px;
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-lg);
    }

    .filter-tabs {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-wrap: wrap;
    }

    .tab-btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 6px 12px;
      border-radius: var(--radius-md);
      border: 1px solid transparent;
      background: transparent;
      color: var(--text-secondary);
      font-size: 0.85rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .tab-btn:hover {
      color: var(--text-primary);
      background: var(--bg-surface-hover);
    }

    .tab-btn.active {
      color: var(--text-primary);
      background: var(--bg-surface-active);
      border-color: var(--border-strong);
    }

    .count-pill {
      font-family: var(--font-mono);
      font-size: 0.72rem;
      padding: 1px 6px;
      border-radius: var(--radius-sm);
      background: var(--bg-surface-elevated);
      color: var(--text-muted);
      border: 1px solid var(--border-subtle);
      font-variant-numeric: tabular-nums;
    }

    .search-box {
      position: relative;
      display: flex;
      align-items: center;
      min-width: 260px;
      flex: 1;
      max-width: 360px;
    }

    .search-icon {
      position: absolute;
      left: 10px;
      width: 16px;
      height: 16px;
      color: var(--text-muted);
      pointer-events: none;
    }

    .search-input {
      width: 100%;
      padding: 7px 28px 7px 32px;
      border-radius: var(--radius-md);
      border: 1px solid var(--border-subtle);
      background: var(--bg-canvas);
      color: var(--text-primary);
      font-size: 0.85rem;
      outline: none;
      transition: border-color 0.15s ease;
    }

    .search-input:focus {
      border-color: var(--accent);
    }

    .search-input::placeholder {
      color: var(--text-muted);
    }

    .clear-btn {
      position: absolute;
      right: 8px;
      background: none;
      border: none;
      color: var(--text-muted);
      cursor: pointer;
      font-size: 0.85rem;
      padding: 2px 4px;
    }

    .clear-btn:hover {
      color: var(--text-primary);
    }

    /* TAGS STRIP */
    .tags-strip {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-wrap: wrap;
      padding: 0 4px;
      font-size: 0.78rem;
    }

    .tags-label {
      color: var(--text-muted);
      margin-right: 2px;
      font-size: 0.76rem;
    }

    .tag-filter-chip {
      padding: 3px 8px;
      border-radius: var(--radius-sm);
      border: 1px solid var(--border-subtle);
      background: var(--bg-surface);
      color: var(--text-secondary);
      font-size: 0.74rem;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .tag-filter-chip:hover {
      color: var(--text-primary);
      border-color: var(--border-strong);
    }

    .tag-filter-chip.active {
      background: var(--accent-subtle);
      border-color: var(--accent);
      color: var(--accent);
    }

    .tag-reset-link {
      background: none;
      border: none;
      color: var(--text-muted);
      font-size: 0.74rem;
      cursor: pointer;
      padding: 2px 6px;
      text-decoration: underline;
    }

    .tag-reset-link:hover {
      color: var(--text-primary);
    }

    /* =========================================================================
       CATALOG GRID & CARDS
       ========================================================================= */
    .catalog-section {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .section-meta-row {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      padding: 0 4px;
    }

    .section-title-wrap {
      display: flex;
      align-items: baseline;
      gap: 10px;
    }

    .section-heading {
      margin: 0;
      font-size: 1.15rem;
      font-weight: 700;
      color: var(--text-primary);
      letter-spacing: -0.01em;
    }

    .section-count-label {
      font-family: var(--font-mono);
      font-size: 0.76rem;
      color: var(--text-muted);
      font-variant-numeric: tabular-nums;
    }

    .reset-filters-btn {
      background: none;
      border: none;
      color: var(--accent);
      font-size: 0.8rem;
      font-weight: 500;
      cursor: pointer;
      padding: 2px 6px;
    }

    .reset-filters-btn:hover {
      text-decoration: underline;
    }

    .cards-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(310px, 1fr));
      gap: 16px;
    }

    .catalog-card {
      position: relative;
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-lg);
      padding: 18px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      overflow: hidden;
      transition: border-color 0.15s ease, background-color 0.15s ease, transform 0.15s ease;
    }

    .catalog-card:hover {
      background: var(--bg-surface-hover);
      border-color: var(--border-strong);
      transform: translateY(-2px);
    }

    .card-accent-line {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 2px;
      background: var(--accent);
      opacity: 0.45;
    }

    .catalog-card:hover .card-accent-line {
      opacity: 1;
    }

    .card-top {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 8px;
    }

    .card-icon-box {
      width: 42px;
      height: 42px;
      border-radius: var(--radius-md);
      background: var(--bg-surface-active);
      border: 1px solid var(--border-subtle);
      display: grid;
      place-items: center;
      font-size: 1.35rem;
    }

    .card-top-badges {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .card-badge-chip {
      font-family: var(--font-mono);
      font-size: 0.68rem;
      padding: 2px 6px;
      border-radius: var(--radius-sm);
      background: var(--bg-surface-active);
      border: 1px solid var(--border-subtle);
      color: var(--text-secondary);
    }

    .fav-btn {
      width: 28px;
      height: 28px;
      border-radius: var(--radius-sm);
      border: 1px solid var(--border-subtle);
      background: var(--bg-surface-active);
      color: var(--text-muted);
      font-size: 0.95rem;
      cursor: pointer;
      display: grid;
      place-items: center;
      transition: all 0.15s ease;
    }

    .fav-btn:hover {
      color: #fbbf24;
      border-color: rgba(251, 191, 36, 0.4);
    }

    .fav-btn.active {
      color: #fbbf24;
      background: rgba(251, 191, 36, 0.12);
      border-color: rgba(251, 191, 36, 0.5);
    }

    .card-body {
      display: flex;
      flex-direction: column;
      gap: 4px;
      flex: 1;
    }

    .card-cat-meta {
      font-family: var(--font-mono);
      font-size: 0.68rem;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .card-title {
      margin: 0;
      font-size: 1.1rem;
      font-weight: 700;
      color: var(--text-primary);
      letter-spacing: -0.01em;
    }

    .card-subtitle {
      margin: 0;
      font-size: 0.8rem;
      color: var(--text-secondary);
      font-weight: 500;
    }

    .card-description {
      margin: 4px 0 0;
      font-size: 0.82rem;
      line-height: 1.5;
      color: var(--text-muted);
      display: -webkit-box;
      -webkit-line-clamp: 3;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .card-tags-row {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
    }

    .card-tag {
      padding: 1px 6px;
      border-radius: var(--radius-sm);
      font-size: 0.7rem;
      background: var(--bg-surface-active);
      color: var(--text-muted);
      border: 1px solid var(--border-subtle);
    }

    .card-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-top: 10px;
      border-top: 1px solid var(--border-subtle);
    }

    .card-stats {
      font-family: var(--font-mono);
      font-size: 0.72rem;
      color: var(--text-muted);
      font-variant-numeric: tabular-nums;
    }

    .card-launch-btn {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 5px 10px;
      border-radius: var(--radius-sm);
      background: var(--bg-surface-active);
      border: 1px solid var(--border-subtle);
      color: var(--text-primary);
      font-size: 0.8rem;
      font-weight: 500;
      text-decoration: none;
      transition: all 0.15s ease;
    }

    .card-launch-btn:hover {
      background: var(--accent);
      border-color: var(--accent);
      color: #0b0d12;
    }

    .card-launch-btn .arrow {
      transition: transform 0.15s ease;
    }

    .card-launch-btn:hover .arrow {
      transform: translateX(2px);
    }

    /* EMPTY STATE */
    .empty-state {
      padding: 48px 16px;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      background: var(--bg-surface);
      border: 1px dashed var(--border-subtle);
      border-radius: var(--radius-lg);
    }

    .empty-icon-box {
      font-family: var(--font-mono);
      font-size: 1.8rem;
      color: var(--text-muted);
    }

    .empty-state h3 {
      margin: 0;
      font-size: 1.05rem;
      color: var(--text-primary);
    }

    .empty-state p {
      margin: 0;
      font-size: 0.88rem;
      color: var(--text-secondary);
      max-width: 44ch;
    }

    @media (max-width: 960px) {
      .hero-card {
        grid-template-columns: 1fr;
        padding: 20px;
        gap: 20px;
      }

      .search-box {
        max-width: 100%;
      }
    }
  `],
})
export class DashboardComponent implements OnInit, OnDestroy {
  private readonly ytService = inject(YtDownloaderService);
  readonly modeService = inject(ModeService);
  readonly langService = inject(LanguageService);

  readonly allItems = signal<CatalogItem[]>(CATALOG_ITEMS);
  readonly searchQuery = signal<string>('');
  readonly selectedFilter = signal<'all' | 'favorites'>('all');
  readonly selectedTag = signal<string | null>(null);
  readonly favorites = signal<string[]>(this.loadFavorites());
  readonly backendOnline = signal<boolean>(false);

  // Rotating Spotlight Carousel State
  readonly spotlightIndex = signal<number>(0);
  readonly spotlightProgress = signal<number>(0);
  private spotlightPaused = false;
  private spotlightTimer: ReturnType<typeof setInterval> | null = null;

  // Active items strictly filtered by the current mode (Games vs Notebook)
  readonly modeItems = computed(() => {
    const isNotebook = this.modeService.isNotebook();
    const targetCategory = isNotebook ? 'programs' : 'games';
    return this.allItems().filter((item) => item.category === targetCategory);
  });

  readonly totalModeCount = computed(() => this.modeItems().length);

  readonly favoriteCount = computed(() => {
    const favs = this.favorites();
    return this.modeItems().filter((item) => favs.includes(item.id)).length;
  });

  readonly activeSpotlight = computed(() => {
    const items = this.modeItems();
    if (items.length === 0) return this.allItems()[0];
    const idx = Math.min(this.spotlightIndex(), items.length - 1);
    return items[idx] || items[0];
  });

  readonly availableTags = computed(() => {
    const tagSet = new Set<string>();
    for (const item of this.modeItems()) {
      for (const t of item.tags) {
        tagSet.add(t);
      }
    }
    return Array.from(tagSet).slice(0, 8);
  });

  readonly displayedItems = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();
    const filter = this.selectedFilter();
    const tag = this.selectedTag();
    const favs = this.favorites();

    return this.modeItems().filter((item) => {
      if (filter === 'favorites' && !favs.includes(item.id)) {
        return false;
      }
      if (tag && !item.tags.includes(tag)) {
        return false;
      }
      if (!query) return true;
      return (
        item.title.toLowerCase().includes(query) ||
        item.subtitle.toLowerCase().includes(query) ||
        item.description.toLowerCase().includes(query) ||
        item.tags.some((t) => t.toLowerCase().includes(query))
      );
    });
  });

  constructor() {
    // Reset spotlight index and tag when mode changes
    effect(() => {
      this.modeService.activeMode();
      this.spotlightIndex.set(0);
      this.spotlightProgress.set(0);
      this.selectedTag.set(null);
    });
  }

  ngOnInit(): void {
    this.ytService.checkHealth().subscribe({
      next: () => this.backendOnline.set(true),
      error: () => this.backendOnline.set(false),
    });
    this.startSpotlightRotation();
  }

  ngOnDestroy(): void {
    this.stopSpotlightRotation();
  }

  private startSpotlightRotation(): void {
    this.stopSpotlightRotation();
    // Tick every 90ms -> ~4.5 seconds per slide (100% / 50 steps = 2% per step)
    this.spotlightTimer = setInterval(() => {
      if (this.spotlightPaused) return;
      const nextPct = this.spotlightProgress() + 2;
      if (nextPct >= 100) {
        this.nextSpotlight();
      } else {
        this.spotlightProgress.set(nextPct);
      }
    }, 90);
  }

  private stopSpotlightRotation(): void {
    if (this.spotlightTimer) {
      clearInterval(this.spotlightTimer);
      this.spotlightTimer = null;
    }
  }

  pauseSpotlight(): void {
    this.spotlightPaused = true;
  }

  resumeSpotlight(): void {
    this.spotlightPaused = false;
  }

  nextSpotlight(): void {
    const total = this.modeItems().length;
    if (total <= 1) return;
    this.spotlightIndex.set((this.spotlightIndex() + 1) % total);
    this.spotlightProgress.set(0);
  }

  prevSpotlight(): void {
    const total = this.modeItems().length;
    if (total <= 1) return;
    this.spotlightIndex.set((this.spotlightIndex() - 1 + total) % total);
    this.spotlightProgress.set(0);
  }

  goToSpotlight(index: number): void {
    this.spotlightIndex.set(index);
    this.spotlightProgress.set(0);
  }

  selectFilter(filter: 'all' | 'favorites'): void {
    this.selectedFilter.set(filter);
    this.selectedTag.set(null);
  }

  toggleTag(tag: string): void {
    if (this.selectedTag() === tag) {
      this.selectedTag.set(null);
    } else {
      this.selectedTag.set(tag);
    }
  }

  resetFilters(): void {
    this.selectedFilter.set('all');
    this.selectedTag.set(null);
    this.searchQuery.set('');
  }

  isFavorite(id: string): boolean {
    return this.favorites().includes(id);
  }

  toggleFavorite(id: string, event: Event): void {
    event.stopPropagation();
    event.preventDefault();
    const current = this.favorites();
    const updated = current.includes(id)
      ? current.filter((item) => item !== id)
      : [...current, id];
    this.favorites.set(updated);
    try {
      localStorage.setItem('allinone_favorites', JSON.stringify(updated));
    } catch {}
  }

  formatIndex(n: number): string {
    return n < 10 ? '0' + n : '' + n;
  }

  private loadFavorites(): string[] {
    try {
      const raw = localStorage.getItem('allinone_favorites');
      return raw ? JSON.parse(raw) : ['yt-downloader', 'tapple-wheel'];
    } catch {
      return ['yt-downloader', 'tapple-wheel'];
    }
  }
}
