import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

interface MemoryCard {
  id: number;
  icon: string;
  flipped: boolean;
  matched: boolean;
}

@Component({
  selector: 'app-memory-game',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="game-page">
      <div class="topbar">
        <a routerLink="/" class="back-btn">← Zurück zur Übersicht</a>
        <span class="crumb-pill">🎮 SPIELE • BRAIN & PUZZLE</span>
      </div>

      <section class="game-shell glass-panel">
        <div class="header-row">
          <div>
            <h1>🧠 Quantum Memory Matrix</h1>
            <p>Finde alle 8 Symbolpaare in so wenigen Zügen wie möglich!</p>
          </div>
          <div class="stats">
            <span class="stat-pill">Züge: <strong>{{ moves() }}</strong></span>
            <span class="stat-pill">Paare: <strong>{{ matchedCount() }} / 8</strong></span>
            <button type="button" class="btn-secondary" (click)="restart()">🔄 Neustart</button>
          </div>
        </div>

        @if (matchedCount() === 8) {
          <div class="win-banner">
            🎉 Perfekt gelöst in <strong>{{ moves() }}</strong> Zügen!
          </div>
        }

        <div class="memory-grid">
          @for (card of cards(); track card.id) {
            <button
              type="button"
              class="mem-card"
              [class.revealed]="card.flipped || card.matched"
              [class.matched]="card.matched"
              (click)="flipCard(card.id)"
            >
              <span>{{ card.flipped || card.matched ? card.icon : '✦' }}</span>
            </button>
          }
        </div>
      </section>
    </div>
  `,
  styles: [`
    .game-page { display: flex; flex-direction: column; gap: 1.5rem; padding-bottom: 3rem; }
    .topbar { display: flex; justify-content: space-between; align-items: center; }
    .back-btn { padding: 0.55rem 1rem; border-radius: 12px; background: rgba(255,255,255,0.05); border: 1px solid var(--border-subtle); color: var(--text-secondary); font-weight: 600; font-size: 0.88rem; }
    .crumb-pill { font-size: 0.78rem; font-weight: 700; color: #d8b4fe; background: rgba(139,92,246,0.16); padding: 0.35rem 0.8rem; border-radius: 999px; }
    .game-shell { padding: 2rem; display: flex; flex-direction: column; align-items: center; gap: 1.5rem; }
    .header-row { width: 100%; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem; }
    .header-row h1 { margin: 0; font-family: var(--font-display); font-size: 1.65rem; }
    .header-row p { margin: 0.25rem 0 0; color: var(--text-secondary); font-size: 0.9rem; }
    .stats { display: flex; align-items: center; gap: 0.75rem; }
    .stat-pill { padding: 0.55rem 1rem; border-radius: 12px; background: rgba(255,255,255,0.05); border: 1px solid var(--border-subtle); font-size: 0.9rem; }
    .win-banner { padding: 0.9rem 1.4rem; border-radius: 12px; background: rgba(16,185,129,0.18); border: 1px solid rgba(16,185,129,0.45); color: #6ee7b7; font-size: 1rem; }
    .memory-grid { display: grid; grid-template-columns: repeat(4, 96px); gap: 0.85rem; }
    .mem-card { width: 96px; height: 96px; border-radius: 16px; border: 1px solid var(--border-subtle); background: rgba(255,255,255,0.04); color: var(--text-muted); font-size: 2rem; cursor: pointer; transition: all 0.2s ease; display: grid; place-items: center; }
    .mem-card:hover { border-color: rgba(139,92,246,0.5); transform: translateY(-2px); }
    .mem-card.revealed { background: linear-gradient(135deg, rgba(99,102,241,0.28), rgba(168,85,247,0.28)); border-color: #a855f7; color: #fff; }
    .mem-card.matched { background: rgba(16,185,129,0.2); border-color: #10b981; }
  `],
})
export class MemoryGameComponent implements OnInit {
  private readonly icons = ['🚀', '🪐', '⚡', '💎', '🔥', '🎮', '🐍', '🎵'];
  readonly cards = signal<MemoryCard[]>([]);
  readonly moves = signal<number>(0);
  readonly matchedCount = signal<number>(0);
  private locked = false;

  ngOnInit(): void {
    this.restart();
  }

  restart(): void {
    const deck = [...this.icons, ...this.icons]
      .sort(() => Math.random() - 0.5)
      .map((icon, id) => ({ id, icon, flipped: false, matched: false }));
    this.cards.set(deck);
    this.moves.set(0);
    this.matchedCount.set(0);
    this.locked = false;
  }

  flipCard(id: number): void {
    if (this.locked) return;
    const current = [...this.cards()];
    const target = current.find((c) => c.id === id);
    if (!target || target.flipped || target.matched) return;

    target.flipped = true;
    this.cards.set(current);

    const open = current.filter((c) => c.flipped && !c.matched);
    if (open.length === 2) {
      this.moves.update((m) => m + 1);
      if (open[0].icon === open[1].icon) {
        open[0].matched = true;
        open[1].matched = true;
        this.cards.set([...current]);
        this.matchedCount.update((c) => c + 1);
      } else {
        this.locked = true;
        setTimeout(() => {
          open[0].flipped = false;
          open[1].flipped = false;
          this.cards.set([...current]);
          this.locked = false;
        }, 650);
      }
    }
  }
}
