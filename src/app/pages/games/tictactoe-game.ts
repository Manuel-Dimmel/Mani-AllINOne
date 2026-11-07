import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

type Cell = 'X' | 'O' | null;

@Component({
  selector: 'app-tictactoe-game',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="game-page">
      <div class="topbar">
        <a routerLink="/" class="back-btn">← Zurück zur Übersicht</a>
        <span class="crumb-pill">🎮 SPIELE • STRATEGIE & KI</span>
      </div>

      <section class="game-shell glass-panel">
        <div class="header-row">
          <div>
            <h1>⚔️ Cyber Tic-Tac-Toe AI</h1>
            <p>Fordere die Minimax-KI heraus oder spiele lokal zu zweit.</p>
          </div>

          <div class="mode-switch">
            <button
              type="button"
              class="btn-secondary"
              [class.active-mode]="vsAi()"
              (click)="setMode(true)"
            >
              🤖 Gegen KI
            </button>
            <button
              type="button"
              class="btn-secondary"
              [class.active-mode]="!vsAi()"
              (click)="setMode(false)"
            >
              👥 2 Spieler
            </button>
          </div>
        </div>

        <div class="scoreboard">
          <div class="score-pill x-col">Spieler X: <strong>{{ scoreX() }}</strong></div>
          <div class="score-pill draw-col">Unentschieden: <strong>{{ draws() }}</strong></div>
          <div class="score-pill o-col">{{ vsAi() ? 'Cyber-KI (O)' : 'Spieler O' }}: <strong>{{ scoreO() }}</strong></div>
        </div>

        <div class="status-text">{{ statusText() }}</div>

        <div class="board">
          @for (cell of board(); track $index) {
            <button
              type="button"
              class="cell-btn"
              [class.x]="cell === 'X'"
              [class.o]="cell === 'O'"
              [class.win]="winningCells().includes($index)"
              [disabled]="!!cell || !!winner()"
              (click)="makeMove($index)"
            >
              {{ cell }}
            </button>
          }
        </div>

        <button type="button" class="btn-primary" (click)="resetRound()">
          🔄 Neue Runde starten
        </button>
      </section>
    </div>
  `,
  styles: [`
    .game-page { display: flex; flex-direction: column; gap: 1.5rem; padding-bottom: 3rem; }
    .topbar { display: flex; justify-content: space-between; align-items: center; }
    .back-btn { padding: 0.55rem 1rem; border-radius: 12px; background: rgba(255,255,255,0.05); border: 1px solid var(--border-subtle); color: var(--text-secondary); font-weight: 600; font-size: 0.88rem; }
    .crumb-pill { font-size: 0.78rem; font-weight: 700; color: #fcd34d; background: rgba(245,158,11,0.16); padding: 0.35rem 0.8rem; border-radius: 999px; }
    .game-shell { padding: 2rem; display: flex; flex-direction: column; align-items: center; gap: 1.4rem; }
    .header-row { width: 100%; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem; }
    .header-row h1 { margin: 0; font-family: var(--font-display); font-size: 1.65rem; }
    .header-row p { margin: 0.25rem 0 0; color: var(--text-secondary); font-size: 0.9rem; }
    .mode-switch { display: flex; gap: 0.5rem; }
    .active-mode { border-color: #f59e0b !important; background: rgba(245,158,11,0.18) !important; color: #fff !important; }
    .scoreboard { display: flex; gap: 1rem; flex-wrap: wrap; }
    .score-pill { padding: 0.55rem 1.1rem; border-radius: 12px; background: rgba(255,255,255,0.04); border: 1px solid var(--border-subtle); font-size: 0.9rem; }
    .status-text { font-size: 1.1rem; font-weight: 700; color: #f3f6fc; }
    .board { display: grid; grid-template-columns: repeat(3, 110px); gap: 0.85rem; }
    .cell-btn { width: 110px; height: 110px; border-radius: 18px; border: 1px solid var(--border-subtle); background: rgba(255,255,255,0.04); font-family: var(--font-display); font-size: 2.8rem; font-weight: 800; cursor: pointer; transition: all 0.18s ease; }
    .cell-btn:hover:not(:disabled) { background: rgba(255,255,255,0.09); transform: scale(1.03); }
    .cell-btn.x { color: #22d3ee; text-shadow: 0 0 14px rgba(34,211,238,0.5); }
    .cell-btn.o { color: #f43f5e; text-shadow: 0 0 14px rgba(244,63,94,0.5); }
    .cell-btn.win { border-color: #10b981; background: rgba(16,185,129,0.18); }
  `],
})
export class TicTacToeGameComponent {
  readonly board = signal<Cell[]>(Array(9).fill(null));
  readonly turn = signal<'X' | 'O'>('X');
  readonly vsAi = signal<boolean>(true);
  readonly winner = signal<'X' | 'O' | 'DRAW' | null>(null);
  readonly winningCells = signal<number[]>([]);

  readonly scoreX = signal<number>(0);
  readonly scoreO = signal<number>(0);
  readonly draws = signal<number>(0);

  private readonly lines = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6],
  ];

  statusText(): string {
    const w = this.winner();
    if (w === 'DRAW') return '🤝 Unentschieden!';
    if (w === 'X') return '🎉 Spieler X gewinnt!';
    if (w === 'O') return this.vsAi() ? '🤖 Cyber-KI gewinnt!' : '🎉 Spieler O gewinnt!';
    return `Am Zug: ${this.turn() === 'X' ? 'Spieler X' : this.vsAi() ? 'Cyber-KI (O)' : 'Spieler O'}`;
  }

  setMode(ai: boolean): void {
    this.vsAi.set(ai);
    this.resetRound();
  }

  makeMove(idx: number): void {
    const current = [...this.board()];
    if (current[idx] || this.winner()) return;

    current[idx] = this.turn();
    this.board.set(current);

    if (this.evaluateBoard(current)) return;

    const nextTurn = this.turn() === 'X' ? 'O' : 'X';
    this.turn.set(nextTurn);

    if (this.vsAi() && nextTurn === 'O') {
      setTimeout(() => this.makeAiMove(), 240);
    }
  }

  private makeAiMove(): void {
    const current = [...this.board()];
    const bestIdx = this.findBestMove(current);
    if (bestIdx !== -1) {
      current[bestIdx] = 'O';
      this.board.set(current);
      if (!this.evaluateBoard(current)) {
        this.turn.set('X');
      }
    }
  }

  private findBestMove(b: Cell[]): number {
    // 1. Kann KI direkt gewinnen?
    for (const [a, c, d] of this.lines) {
      const vals = [b[a], b[c], b[d]];
      if (vals.filter((v) => v === 'O').length === 2 && vals.includes(null)) {
        return [a, c, d].find((i) => b[i] === null)!;
      }
    }
    // 2. Muss Spieler X geblockt werden?
    for (const [a, c, d] of this.lines) {
      const vals = [b[a], b[c], b[d]];
      if (vals.filter((v) => v === 'X').length === 2 && vals.includes(null)) {
        return [a, c, d].find((i) => b[i] === null)!;
      }
    }
    // 3. Mitte oder Ecken
    if (b[4] === null) return 4;
    const corners = [0, 2, 6, 8].filter((i) => b[i] === null);
    if (corners.length > 0) return corners[Math.floor(Math.random() * corners.length)];
    const empty = b.map((v, i) => (v === null ? i : -1)).filter((i) => i !== -1);
    return empty.length > 0 ? empty[0] : -1;
  }

  private evaluateBoard(b: Cell[]): boolean {
    for (const line of this.lines) {
      const [a, c, d] = line;
      if (b[a] && b[a] === b[c] && b[a] === b[d]) {
        this.winner.set(b[a]);
        this.winningCells.set(line);
        if (b[a] === 'X') this.scoreX.update((n) => n + 1);
        else this.scoreO.update((n) => n + 1);
        return true;
      }
    }
    if (b.every((cell) => cell !== null)) {
      this.winner.set('DRAW');
      this.draws.update((n) => n + 1);
      return true;
    }
    return false;
  }

  resetRound(): void {
    this.board.set(Array(9).fill(null));
    this.turn.set('X');
    this.winner.set(null);
    this.winningCells.set([]);
  }
}
