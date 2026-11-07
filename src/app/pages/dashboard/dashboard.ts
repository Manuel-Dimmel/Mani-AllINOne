import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CATALOG_ITEMS, CatalogItem, CategoryType } from '../../models/catalog.model';
import { YtDownloaderService } from '../../services/yt-downloader.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="dashboard-wrapper">
      <!-- HERO BANNER -->
      <section class="hero-card glass-panel">
        <div class="hero-glow hero-glow-1"></div>
        <div class="hero-glow hero-glow-2" [style.background]="activeSpotlight().glowColor"></div>

        <div class="hero-content">
          <div class="hero-badge-row">
            <span class="pulse-badge">
              <span class="pulse-dot"></span>
              ALL-IN-ONE NEXUS
            </span>
            <span class="status-pill" [class.online]="backendOnline()">
              {{ backendOnline() ? '🐍 Python Engine Online' : '🐍 Python Backend bereit (Port 8765)' }}
            </span>
          </div>

          <h1 class="hero-title">
            Dein Hub für <span class="gradient-text-cyan">Spiele</span> &
            <span class="gradient-text-rose">Programme</span>
          </h1>
          <p class="hero-subtitle">
            Wechsle nahtlos zwischen leistungsstarken Python-Tools wie dem
            <strong>YouTube Downloader</strong> oder <strong>AI Background Remover</strong> und
            interaktiven Party- & Denkspielen wie <strong>Tapple</strong>, <strong>5 Second Rule</strong>,
            <strong>Tick Tack Bumm</strong> oder <strong>Anomia</strong>.
          </p>

          <div class="hero-actions">
            <a
              [routerLink]="activeSpotlight().route"
              class="btn-primary"
              [style.background]="activeSpotlight().accentGradient"
            >
              <span>{{ activeSpotlight().icon }} {{ activeSpotlight().title }} starten</span>
              <span class="arrow">→</span>
            </a>
            <button type="button" class="btn-secondary" (click)="selectCategory('programs')">
              ⚡ Programme ({{ programsCount() }})
            </button>
            <button type="button" class="btn-secondary" (click)="selectCategory('games')">
              🎮 Spiele ({{ gamesCount() }})
            </button>
          </div>
        </div>

        <!-- ROTATING SPOTLIGHT CAROUSEL CARD (ALL PROGRAMS & GAMES) -->
        @if (activeSpotlight(); as spot) {
          <div
            class="hero-spotlight"
            (mouseenter)="pauseSpotlight()"
            (mouseleave)="resumeSpotlight()"
          >
            <div
              class="spotlight-card"
              [style.--spot-glow]="spot.glowColor"
              [style.--spot-gradient]="spot.accentGradient"
            >
              <!-- AUTO-CYCLE PROGRESS BAR -->
              <div class="spotlight-progress-track">
                <div
                  class="spotlight-progress-fill"
                  [style.width.%]="spotlightProgress()"
                  [style.background]="spot.accentGradient"
                ></div>
              </div>

              <!-- TOP ROW: CATEGORY TAG, BADGE & PREV/NEXT CONTROLS -->
              <div class="spotlight-top">
                <div class="spotlight-badges">
                  <span class="spotlight-tag" [class.is-game]="spot.category === 'games'">
                    {{ spot.category === 'games' ? '🎮 SPIEL SPOTLIGHT' : '⚡ PROGRAMM SPOTLIGHT' }}
                  </span>
                  <span class="python-chip">{{ spot.badge }}</span>
                </div>

                <div class="spotlight-nav">
                  <button
                    type="button"
                    class="spot-nav-btn"
                    (click)="prevSpotlight()"
                    title="Vorheriges Highlight"
                  >
                    ‹
                  </button>
                  <span class="spot-counter">
                    {{ spotlightIndex() + 1 }} / {{ items().length }}
                  </span>
                  <button
                    type="button"
                    class="spot-nav-btn"
                    (click)="nextSpotlight()"
                    title="Nächstes Highlight"
                  >
                    ›
                  </button>
                </div>
              </div>

              <!-- ICON, TITLE & SUBTITLE -->
              <div class="spotlight-title-row">
                <div class="spotlight-icon" [style.background]="spot.accentGradient">
                  {{ spot.icon }}
                </div>
                <div class="spotlight-headings">
                  <h3>{{ spot.title }}</h3>
                  <p class="spot-sub">{{ spot.subtitle }}</p>
                </div>
              </div>

              <!-- SHORT DESCRIPTION -->
              <p class="spotlight-desc">{{ spot.description }}</p>

              <!-- 4 BULLET HIGHLIGHTS -->
              <div class="spotlight-features">
                @for (feat of spot.highlights; track feat) {
                  <div class="feat-item">✓ {{ feat }}</div>
                }
              </div>

              <!-- ACTION CTA BUTTON -->
              <a
                [routerLink]="spot.route"
                class="spotlight-cta"
                [style.background]="spot.accentGradient"
              >
                <span>{{ spot.category === 'games' ? '🎮 Jetzt spielen' : '🚀 Programm öffnen' }}</span>
                <span>↗</span>
              </a>

              <!-- QUICK ICON SELECTOR STRIP FOR ALL ITEMS -->
              <div class="spotlight-dots" role="tablist" aria-label="Spotlight Auswahl">
                @for (item of items(); track item.id; let idx = $index) {
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
      <section class="controls-bar glass-panel">
        <div class="category-tabs" role="tablist">
          <button
            type="button"
            class="tab-btn"
            [class.active]="selectedCategory() === 'all'"
            (click)="selectCategory('all')"
          >
            <span>✨ Alle</span>
            <span class="count-pill">{{ items().length }}</span>
          </button>

          <button
            type="button"
            class="tab-btn"
            [class.active]="selectedCategory() === 'programs'"
            (click)="selectCategory('programs')"
          >
            <span>⚡ Programme</span>
            <span class="count-pill">{{ programsCount() }}</span>
          </button>

          <button
            type="button"
            class="tab-btn"
            [class.active]="selectedCategory() === 'games'"
            (click)="selectCategory('games')"
          >
            <span>🎮 Spiele</span>
            <span class="count-pill">{{ gamesCount() }}</span>
          </button>

          <button
            type="button"
            class="tab-btn"
            [class.active]="selectedCategory() === 'favorites'"
            (click)="selectCategory('favorites')"
          >
            <span>⭐ Favoriten</span>
            <span class="count-pill">{{ favorites().length }}</span>
          </button>
        </div>

        <div class="search-box">
          <span class="search-icon">🔍</span>
          <input
            type="text"
            [ngModel]="searchQuery()"
            (ngModelChange)="searchQuery.set($event)"
            placeholder="Suche nach Programmen, Spielen, Python, Tapple..."
            class="search-input"
          />
          @if (searchQuery()) {
            <button type="button" class="clear-btn" (click)="searchQuery.set('')">✕</button>
          }
        </div>
      </section>

      <!-- CONTENT SECTIONS -->
      @if (selectedCategory() === 'all' && !searchQuery().trim()) {
        <!-- SECTION: PROGRAMME -->
        <section class="category-section">
          <div class="section-header">
            <div class="section-title-group">
              <div class="section-icon programs-bg">⚡</div>
              <div>
                <h2>Programme & Tools</h2>
                <p>Nützliche Anwendungen, Konverter & Python-gestützte Werkzeuge</p>
              </div>
            </div>
            <button type="button" class="section-link" (click)="selectCategory('programs')">
              Nur Programme zeigen →
            </button>
          </div>

          <div class="cards-grid">
            @for (item of programItems(); track item.id) {
              <ng-container *ngTemplateOutlet="cardTemplate; context: { $implicit: item }"></ng-container>
            }
          </div>
        </section>

        <!-- SECTION: SPIELE -->
        <section class="category-section">
          <div class="section-header">
            <div class="section-title-group">
              <div class="section-icon games-bg">🎮</div>
              <div>
                <h2>Spiele & Party-Games</h2>
                <p>Interaktive Party-, Karten- & Arcade-Games für 1 bis 8 Spieler</p>
              </div>
            </div>
            <button type="button" class="section-link" (click)="selectCategory('games')">
              Nur Spiele zeigen →
            </button>
          </div>

          <div class="cards-grid">
            @for (item of gameItems(); track item.id) {
              <ng-container *ngTemplateOutlet="cardTemplate; context: { $implicit: item }"></ng-container>
            }
          </div>
        </section>
      } @else {
        <!-- FILTERED VIEW -->
        <section class="category-section">
          <div class="section-header">
            <div class="section-title-group">
              <div class="section-icon" [class.programs-bg]="selectedCategory() === 'programs'" [class.games-bg]="selectedCategory() === 'games'">
                {{
                  selectedCategory() === 'programs'
                    ? '⚡'
                    : selectedCategory() === 'games'
                      ? '🎮'
                      : selectedCategory() === 'favorites'
                        ? '⭐'
                        : '🔎'
                }}
              </div>
              <div>
                <h2>{{ activeSectionTitle() }}</h2>
                <p>{{ filteredItems().length }} Einträge gefunden</p>
              </div>
            </div>
            @if (selectedCategory() !== 'all' || searchQuery()) {
              <button type="button" class="section-link" (click)="resetFilters()">
                Filter zurücksetzen ✕
              </button>
            }
          </div>

          @if (filteredItems().length > 0) {
            <div class="cards-grid">
              @for (item of filteredItems(); track item.id) {
                <ng-container *ngTemplateOutlet="cardTemplate; context: { $implicit: item }"></ng-container>
              }
            </div>
          } @else {
            <div class="empty-state glass-panel">
              <div class="empty-icon">🌌</div>
              <h3>Keine Einträge gefunden</h3>
              <p>
                Für deine aktuelle Auswahl oder Suche gibt es noch keine Treffer.
              </p>
              <button type="button" class="btn-secondary" (click)="resetFilters()">
                Alle Kategorien anzeigen
              </button>
            </div>
          }
        </section>
      }

      <!-- REUSABLE CARD TEMPLATE -->
      <ng-template #cardTemplate let-item>
        <article
          class="catalog-card glass-panel"
          [class.featured-card]="item.featured"
          [style.--card-glow]="item.glowColor"
          [style.--card-gradient]="item.accentGradient"
        >
          <div class="card-accent-bar" [style.background]="item.accentGradient"></div>

          <div class="card-top-row">
            <div class="card-icon-wrap" [style.background]="item.accentGradient">
              <span>{{ item.icon }}</span>
            </div>

            <div class="card-badges">
              <span class="item-badge" [attr.data-type]="item.badgeType">
                {{ item.badge }}
              </span>
              <button
                type="button"
                class="fav-btn"
                [class.active]="isFavorite(item.id)"
                (click)="toggleFavorite(item.id, $event)"
                title="Als Favorit merken"
              >
                {{ isFavorite(item.id) ? '★' : '☆' }}
              </button>
            </div>
          </div>

          <div class="card-body">
            <span class="card-category-label">{{ item.categoryLabel }}</span>
            <h3 class="card-title">{{ item.title }}</h3>
            <p class="card-subtitle">{{ item.subtitle }}</p>
            <p class="card-desc">{{ item.description }}</p>
          </div>

          <div class="card-tags">
            @for (tag of item.tags; track tag) {
              <span class="tag-chip">{{ tag }}</span>
            }
          </div>

          <div class="card-footer">
            <span class="stats-label">{{ item.statsLabel }}</span>
            <a [routerLink]="item.route" class="launch-btn" [style.background]="item.accentGradient">
              <span>{{ item.category === 'games' ? 'Spielen' : 'Öffnen' }}</span>
              <span class="launch-arrow">→</span>
            </a>
          </div>
        </article>
      </ng-template>
    </div>
  `,
  styles: [`
    .dashboard-wrapper {
      display: flex;
      flex-direction: column;
      gap: 2rem;
      padding-bottom: 3rem;
    }

    /* HERO */
    .hero-card {
      position: relative;
      overflow: hidden;
      padding: 2.35rem;
      display: grid;
      grid-template-columns: 1.25fr 1.05fr;
      gap: 2.25rem;
      align-items: center;
      border: 1px solid rgba(255, 255, 255, 0.12);
    }

    .hero-glow {
      position: absolute;
      border-radius: 50%;
      filter: blur(85px);
      pointer-events: none;
      z-index: 0;
      transition: background 0.5s ease;
    }

    .hero-glow-1 {
      width: 340px;
      height: 340px;
      background: rgba(99, 102, 241, 0.25);
      top: -120px;
      left: -80px;
    }

    .hero-glow-2 {
      width: 360px;
      height: 360px;
      background: rgba(244, 63, 94, 0.25);
      bottom: -140px;
      right: 8%;
    }

    .hero-content {
      position: relative;
      z-index: 1;
      display: flex;
      flex-direction: column;
      gap: 1.15rem;
    }

    .hero-badge-row {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.75rem;
    }

    .pulse-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.35rem 0.85rem;
      border-radius: 999px;
      font-size: 0.75rem;
      font-weight: 700;
      letter-spacing: 0.08em;
      background: rgba(99, 102, 241, 0.16);
      color: #a5b4fc;
      border: 1px solid rgba(99, 102, 241, 0.35);
    }

    .pulse-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #818cf8;
      box-shadow: 0 0 10px #818cf8;
    }

    .status-pill {
      padding: 0.35rem 0.85rem;
      border-radius: 999px;
      font-size: 0.76rem;
      font-weight: 600;
      background: rgba(255, 255, 255, 0.06);
      color: var(--text-secondary);
      border: 1px solid var(--border-subtle);
    }

    .status-pill.online {
      background: rgba(16, 185, 129, 0.14);
      color: #6ee7b7;
      border-color: rgba(16, 185, 129, 0.35);
    }

    .hero-title {
      font-family: var(--font-display);
      font-size: clamp(2rem, 3.6vw, 3rem);
      font-weight: 800;
      line-height: 1.12;
      margin: 0;
      letter-spacing: -0.03em;
    }

    .gradient-text-cyan {
      background: linear-gradient(135deg, #22d3ee 0%, #818cf8 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    .gradient-text-rose {
      background: linear-gradient(135deg, #fb7185 0%, #c084fc 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    .hero-subtitle {
      font-size: 0.98rem;
      line-height: 1.6;
      color: var(--text-secondary);
      margin: 0;
      max-width: 58ch;
    }

    .hero-subtitle strong {
      color: var(--text-primary);
    }

    .hero-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem;
      margin-top: 0.35rem;
    }

    /* ROTATING SPOTLIGHT CAROUSEL */
    .hero-spotlight {
      position: relative;
      z-index: 1;
    }

    .spotlight-card {
      position: relative;
      overflow: hidden;
      background: linear-gradient(160deg, rgba(24, 28, 44, 0.92) 0%, rgba(13, 17, 29, 0.96) 100%);
      border: 1px solid rgba(255, 255, 255, 0.16);
      border-radius: 20px;
      padding: 1.45rem;
      box-shadow: 0 22px 48px -14px var(--spot-glow, rgba(244, 63, 94, 0.32));
      display: flex;
      flex-direction: column;
      gap: 0.95rem;
      transition: box-shadow 0.35s ease, border-color 0.35s ease;
    }

    .spotlight-card:hover {
      border-color: rgba(255, 255, 255, 0.28);
    }

    .spotlight-progress-track {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 4px;
      background: rgba(255, 255, 255, 0.06);
    }

    .spotlight-progress-fill {
      height: 100%;
      transition: width 0.1s linear;
    }

    .spotlight-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 0.5rem;
      flex-wrap: wrap;
    }

    .spotlight-badges {
      display: flex;
      align-items: center;
      gap: 0.45rem;
      flex-wrap: wrap;
    }

    .spotlight-tag {
      font-size: 0.68rem;
      font-weight: 800;
      letter-spacing: 0.06em;
      color: #fda4af;
      background: rgba(244, 63, 94, 0.18);
      border: 1px solid rgba(244, 63, 94, 0.35);
      padding: 0.24rem 0.6rem;
      border-radius: 6px;
    }

    .spotlight-tag.is-game {
      color: #67e8f9;
      background: rgba(6, 182, 212, 0.16);
      border-color: rgba(6, 182, 212, 0.35);
    }

    .python-chip {
      font-family: var(--font-mono);
      font-size: 0.72rem;
      color: #fde047;
      background: rgba(234, 179, 8, 0.14);
      border: 1px solid rgba(234, 179, 8, 0.3);
      padding: 0.22rem 0.55rem;
      border-radius: 6px;
    }

    .spotlight-nav {
      display: flex;
      align-items: center;
      gap: 0.35rem;
    }

    .spot-nav-btn {
      width: 28px;
      height: 28px;
      border-radius: 8px;
      border: 1px solid var(--border-subtle);
      background: rgba(255, 255, 255, 0.05);
      color: var(--text-primary);
      font-size: 1.05rem;
      line-height: 1;
      cursor: pointer;
      display: grid;
      place-items: center;
      transition: all 0.18s ease;
    }

    .spot-nav-btn:hover {
      background: rgba(255, 255, 255, 0.14);
      border-color: rgba(255, 255, 255, 0.28);
    }

    .spot-counter {
      font-family: var(--font-mono);
      font-size: 0.72rem;
      color: var(--text-secondary);
      min-width: 38px;
      text-align: center;
    }

    .spotlight-title-row {
      display: flex;
      align-items: center;
      gap: 0.95rem;
    }

    .spotlight-icon {
      width: 54px;
      height: 54px;
      border-radius: 15px;
      display: grid;
      place-items: center;
      font-size: 1.7rem;
      flex-shrink: 0;
      box-shadow: 0 10px 22px -6px rgba(0, 0, 0, 0.55);
    }

    .spotlight-headings h3 {
      margin: 0;
      font-family: var(--font-display);
      font-size: 1.25rem;
      font-weight: 800;
    }

    .spot-sub {
      margin: 0.18rem 0 0;
      font-size: 0.82rem;
      font-weight: 600;
      color: #cbd5e1;
    }

    .spotlight-desc {
      margin: 0;
      font-size: 0.83rem;
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
      gap: 0.45rem 0.65rem;
      font-size: 0.78rem;
      color: #e2e8f0;
      background: rgba(0, 0, 0, 0.28);
      padding: 0.75rem 0.85rem;
      border-radius: 12px;
      border: 1px solid rgba(255, 255, 255, 0.05);
    }

    .feat-item {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .spotlight-cta {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.45rem;
      padding: 0.72rem;
      border-radius: 12px;
      color: #fff;
      font-weight: 700;
      font-size: 0.9rem;
      box-shadow: 0 10px 24px -8px var(--spot-glow, rgba(99, 102, 241, 0.5));
      transition: transform 0.2s ease, opacity 0.2s ease;
    }

    .spotlight-cta:hover {
      transform: translateY(-2px);
      opacity: 0.96;
    }

    .spotlight-dots {
      display: flex;
      justify-content: center;
      flex-wrap: wrap;
      gap: 0.32rem;
      padding-top: 0.25rem;
    }

    .spot-dot-btn {
      width: 30px;
      height: 30px;
      border-radius: 8px;
      border: 1px solid rgba(255, 255, 255, 0.07);
      background: rgba(255, 255, 255, 0.03);
      font-size: 0.88rem;
      cursor: pointer;
      display: grid;
      place-items: center;
      opacity: 0.55;
      transition: all 0.18s ease;
    }

    .spot-dot-btn:hover {
      opacity: 0.9;
      background: rgba(255, 255, 255, 0.08);
    }

    .spot-dot-btn.active {
      opacity: 1;
      background: rgba(255, 255, 255, 0.14);
      border-color: rgba(255, 255, 255, 0.38);
      transform: translateY(-2px);
    }

    /* CONTROLS BAR */
    .controls-bar {
      padding: 0.9rem 1.15rem;
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      align-items: center;
      gap: 1rem;
    }

    .category-tabs {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }

    .tab-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.55rem;
      padding: 0.6rem 1.05rem;
      border-radius: 12px;
      border: 1px solid transparent;
      background: rgba(255, 255, 255, 0.04);
      color: var(--text-secondary);
      font-weight: 600;
      font-size: 0.9rem;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .tab-btn:hover {
      color: var(--text-primary);
      background: rgba(255, 255, 255, 0.08);
    }

    .tab-btn.active {
      background: linear-gradient(135deg, rgba(99, 102, 241, 0.28), rgba(139, 92, 246, 0.28));
      color: #fff;
      border-color: rgba(139, 92, 246, 0.55);
      box-shadow: 0 4px 16px rgba(99, 102, 241, 0.25);
    }

    .count-pill {
      padding: 0.12rem 0.5rem;
      border-radius: 999px;
      font-size: 0.74rem;
      background: rgba(255, 255, 255, 0.1);
      color: var(--text-primary);
    }

    .search-box {
      position: relative;
      flex: 1;
      min-width: 250px;
      max-width: 380px;
      display: flex;
      align-items: center;
    }

    .search-icon {
      position: absolute;
      left: 0.9rem;
      font-size: 0.95rem;
      pointer-events: none;
    }

    .search-input {
      width: 100%;
      padding: 0.68rem 2.2rem 0.68rem 2.45rem;
      border-radius: 12px;
      border: 1px solid var(--border-subtle);
      background: rgba(7, 9, 14, 0.65);
      color: var(--text-primary);
      font-size: 0.9rem;
      outline: none;
      transition: border-color 0.2s ease, box-shadow 0.2s ease;
    }

    .search-input:focus {
      border-color: var(--accent-indigo);
      box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.2);
    }

    .clear-btn {
      position: absolute;
      right: 0.65rem;
      background: none;
      border: none;
      color: var(--text-secondary);
      cursor: pointer;
      font-size: 0.85rem;
      padding: 0.25rem;
    }

    /* CATEGORY SECTIONS */
    .category-section {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }

    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      gap: 1rem;
      padding: 0 0.25rem;
    }

    .section-title-group {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .section-icon {
      width: 46px;
      height: 46px;
      border-radius: 14px;
      display: grid;
      place-items: center;
      font-size: 1.35rem;
      background: rgba(255, 255, 255, 0.07);
      border: 1px solid var(--border-subtle);
    }

    .section-icon.programs-bg {
      background: linear-gradient(135deg, rgba(244, 63, 94, 0.2), rgba(168, 85, 247, 0.2));
      border-color: rgba(244, 63, 94, 0.35);
    }

    .section-icon.games-bg {
      background: linear-gradient(135deg, rgba(6, 182, 212, 0.2), rgba(139, 92, 246, 0.2));
      border-color: rgba(6, 182, 212, 0.35);
    }

    .section-title-group h2 {
      margin: 0;
      font-family: var(--font-display);
      font-size: 1.45rem;
      font-weight: 700;
    }

    .section-title-group p {
      margin: 0.2rem 0 0;
      font-size: 0.9rem;
      color: var(--text-secondary);
    }

    .section-link {
      background: none;
      border: none;
      color: #a5b4fc;
      font-weight: 600;
      font-size: 0.88rem;
      cursor: pointer;
      padding: 0.4rem 0.6rem;
      border-radius: 8px;
      transition: background 0.2s ease;
    }

    .section-link:hover {
      background: rgba(99, 102, 241, 0.12);
    }

    /* CARDS GRID */
    .cards-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(330px, 1fr));
      gap: 1.35rem;
    }

    .catalog-card {
      position: relative;
      overflow: hidden;
      padding: 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 1.1rem;
      transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.25s ease, box-shadow 0.25s ease;
    }

    .catalog-card:hover {
      transform: translateY(-5px);
      border-color: rgba(255, 255, 255, 0.22);
      box-shadow: 0 20px 40px -15px var(--card-glow, rgba(99, 102, 241, 0.3));
    }

    .catalog-card.featured-card {
      border-color: rgba(244, 63, 94, 0.38);
    }

    .card-accent-bar {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 4px;
    }

    .card-top-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 0.75rem;
    }

    .card-icon-wrap {
      width: 52px;
      height: 52px;
      border-radius: 15px;
      display: grid;
      place-items: center;
      font-size: 1.6rem;
      box-shadow: 0 10px 20px -6px rgba(0, 0, 0, 0.5);
    }

    .card-badges {
      display: flex;
      align-items: center;
      gap: 0.45rem;
    }

    .item-badge {
      padding: 0.3rem 0.7rem;
      border-radius: 999px;
      font-size: 0.74rem;
      font-weight: 600;
      background: rgba(255, 255, 255, 0.07);
      border: 1px solid var(--border-subtle);
      color: var(--text-primary);
    }

    .item-badge[data-type='python'] {
      background: rgba(244, 63, 94, 0.16);
      border-color: rgba(244, 63, 94, 0.4);
      color: #fda4af;
    }

    .fav-btn {
      width: 34px;
      height: 34px;
      border-radius: 10px;
      border: 1px solid var(--border-subtle);
      background: rgba(255, 255, 255, 0.04);
      color: var(--text-secondary);
      font-size: 1.05rem;
      cursor: pointer;
      display: grid;
      place-items: center;
      transition: all 0.2s ease;
    }

    .fav-btn.active {
      color: #fbbf24;
      border-color: rgba(251, 191, 36, 0.45);
      background: rgba(251, 191, 36, 0.12);
    }

    .card-body {
      display: flex;
      flex-direction: column;
      gap: 0.3rem;
      flex: 1;
    }

    .card-category-label {
      font-size: 0.74rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--text-muted);
    }

    .card-title {
      margin: 0;
      font-family: var(--font-display);
      font-size: 1.3rem;
      font-weight: 700;
    }

    .card-subtitle {
      margin: 0;
      font-size: 0.88rem;
      font-weight: 600;
      color: #cbd5e1;
    }

    .card-desc {
      margin: 0.4rem 0 0;
      font-size: 0.88rem;
      line-height: 1.55;
      color: var(--text-secondary);
    }

    .card-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 0.4rem;
    }

    .tag-chip {
      padding: 0.22rem 0.6rem;
      border-radius: 8px;
      font-size: 0.74rem;
      font-weight: 500;
      background: rgba(255, 255, 255, 0.05);
      color: var(--text-secondary);
      border: 1px solid rgba(255, 255, 255, 0.06);
    }

    .card-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-top: 0.9rem;
      border-top: 1px solid var(--border-subtle);
    }

    .stats-label {
      font-size: 0.8rem;
      font-weight: 500;
      color: var(--text-muted);
    }

    .launch-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.45rem;
      padding: 0.55rem 1.05rem;
      border-radius: 10px;
      color: #fff;
      font-weight: 600;
      font-size: 0.86rem;
      transition: transform 0.2s ease, opacity 0.2s ease;
    }

    .launch-btn:hover {
      transform: translateX(3px);
      opacity: 0.95;
    }

    .empty-state {
      padding: 3rem 1.5rem;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.75rem;
    }

    .empty-icon {
      font-size: 2.5rem;
    }

    @media (max-width: 960px) {
      .hero-card {
        grid-template-columns: 1fr;
        padding: 1.75rem;
      }
      .search-box {
        max-width: 100%;
      }
    }
  `],
})
export class DashboardComponent implements OnInit, OnDestroy {
  private readonly ytService = inject(YtDownloaderService);

  readonly items = signal<CatalogItem[]>(CATALOG_ITEMS);
  readonly selectedCategory = signal<CategoryType>('all');
  readonly searchQuery = signal<string>('');
  readonly favorites = signal<string[]>(this.loadFavorites());
  readonly backendOnline = signal<boolean>(false);

  // Rotating Spotlight Carousel State
  readonly spotlightIndex = signal<number>(0);
  readonly spotlightProgress = signal<number>(0);
  private spotlightPaused = false;
  private spotlightTimer: ReturnType<typeof setInterval> | null = null;

  readonly activeSpotlight = computed(
    () => this.items()[this.spotlightIndex()] || this.items()[0]
  );

  readonly programItems = computed(() =>
    this.items().filter((item) => item.category === 'programs')
  );

  readonly gameItems = computed(() =>
    this.items().filter((item) => item.category === 'games')
  );

  readonly programsCount = computed(() => this.programItems().length);
  readonly gamesCount = computed(() => this.gameItems().length);

  readonly activeSectionTitle = computed(() => {
    switch (this.selectedCategory()) {
      case 'programs':
        return 'Programme & Tools';
      case 'games':
        return 'Spiele & Party-Games';
      case 'favorites':
        return 'Deine Favoriten';
      default:
        return 'Suchergebnisse';
    }
  });

  readonly filteredItems = computed(() => {
    const cat = this.selectedCategory();
    const query = this.searchQuery().trim().toLowerCase();
    const favs = this.favorites();

    return this.items().filter((item) => {
      if (cat === 'programs' && item.category !== 'programs') return false;
      if (cat === 'games' && item.category !== 'games') return false;
      if (cat === 'favorites' && !favs.includes(item.id)) return false;

      if (!query) return true;
      return (
        item.title.toLowerCase().includes(query) ||
        item.subtitle.toLowerCase().includes(query) ||
        item.description.toLowerCase().includes(query) ||
        item.tags.some((t) => t.toLowerCase().includes(query))
      );
    });
  });

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
    const total = this.items().length;
    this.spotlightIndex.set((this.spotlightIndex() + 1) % total);
    this.spotlightProgress.set(0);
  }

  prevSpotlight(): void {
    const total = this.items().length;
    this.spotlightIndex.set((this.spotlightIndex() - 1 + total) % total);
    this.spotlightProgress.set(0);
  }

  goToSpotlight(index: number): void {
    this.spotlightIndex.set(index);
    this.spotlightProgress.set(0);
  }

  selectCategory(cat: CategoryType): void {
    this.selectedCategory.set(cat);
  }

  resetFilters(): void {
    this.selectedCategory.set('all');
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

  private loadFavorites(): string[] {
    try {
      const raw = localStorage.getItem('allinone_favorites');
      return raw ? JSON.parse(raw) : ['yt-downloader'];
    } catch {
      return ['yt-downloader'];
    }
  }
}
