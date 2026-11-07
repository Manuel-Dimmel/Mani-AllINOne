import {
  AfterViewInit,
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  ViewChild,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

interface Point {
  x: number;
  y: number;
}

@Component({
  selector: 'app-snake-game',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="game-page">
      <div class="topbar">
        <a routerLink="/" class="back-btn">← Zurück zur Übersicht</a>
        <span class="crumb-pill">🎮 SPIELE • ARCADE</span>
      </div>

      <section class="game-shell glass-panel">
        <div class="game-header">
          <div>
            <h1>🐍 Neon Snake Cybergrid</h1>
            <p>Steuerung mit Pfeiltasten oder W, A, S, D. Sammle die leuchtenden Energie-Kerne!</p>
          </div>
          <div class="score-boxes">
            <div class="score-card">
              <span>SCORE</span>
              <strong>{{ score() }}</strong>
            </div>
            <div class="score-card hi">
              <span>HIGHSCORE</span>
              <strong>{{ highScore() }}</strong>
            </div>
          </div>
        </div>

        <div class="canvas-wrap">
          <canvas #gameCanvas width="480" height="480"></canvas>

          @if (!isRunning()) {
            <div class="overlay">
              <h2>{{ gameOver() ? '💥 Game Over!' : '⚡ Bereit fürs Cybergrid?' }}</h2>
              @if (gameOver()) {
                <p>Dein Score: <strong>{{ score() }}</strong> Punkte</p>
              }
              <button type="button" class="btn-primary" (click)="startGame()">
                {{ gameOver() ? '🔄 Nochmal spielen' : '▶️ Spiel starten' }}
              </button>
            </div>
          }
        </div>
      </section>
    </div>
  `,
  styles: [`
    .game-page { display: flex; flex-direction: column; gap: 1.5rem; padding-bottom: 3rem; }
    .topbar { display: flex; justify-content: space-between; align-items: center; }
    .back-btn { padding: 0.55rem 1rem; border-radius: 12px; background: rgba(255,255,255,0.05); border: 1px solid var(--border-subtle); color: var(--text-secondary); font-weight: 600; font-size: 0.88rem; }
    .crumb-pill { font-size: 0.78rem; font-weight: 700; color: #67e8f9; background: rgba(6,182,212,0.16); padding: 0.35rem 0.8rem; border-radius: 999px; }
    .game-shell { padding: 2rem; display: flex; flex-direction: column; align-items: center; gap: 1.5rem; }
    .game-header { width: 100%; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem; }
    .game-header h1 { margin: 0; font-family: var(--font-display); font-size: 1.65rem; }
    .game-header p { margin: 0.25rem 0 0; color: var(--text-secondary); font-size: 0.9rem; }
    .score-boxes { display: flex; gap: 0.75rem; }
    .score-card { padding: 0.6rem 1.1rem; border-radius: 12px; background: rgba(255,255,255,0.05); border: 1px solid var(--border-subtle); display: flex; flex-direction: column; align-items: center; }
    .score-card span { font-size: 0.7rem; font-weight: 700; color: var(--text-muted); }
    .score-card strong { font-family: var(--font-display); font-size: 1.4rem; color: #22d3ee; }
    .score-card.hi strong { color: #c084fc; }
    .canvas-wrap { position: relative; border-radius: 16px; overflow: hidden; border: 2px solid rgba(6,182,212,0.4); box-shadow: 0 0 35px rgba(6,182,212,0.2); }
    canvas { display: block; background: #05070d; max-width: 100%; height: auto; }
    .overlay { position: absolute; inset: 0; background: rgba(7,9,14,0.82); backdrop-filter: blur(6px); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1rem; }
    .overlay h2 { margin: 0; font-size: 1.75rem; }
  `],
})
export class SnakeGameComponent implements AfterViewInit, OnDestroy {
  @ViewChild('gameCanvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;

  readonly score = signal<number>(0);
  readonly highScore = signal<number>(Number(localStorage.getItem('allinone_snake_hi') || 0));
  readonly isRunning = signal<boolean>(false);
  readonly gameOver = signal<boolean>(false);

  private readonly gridSize = 20;
  private readonly tileCount = 24;
  private snake: Point[] = [];
  private food: Point = { x: 12, y: 12 };
  private dir: Point = { x: 1, y: 0 };
  private nextDir: Point = { x: 1, y: 0 };
  private timer: ReturnType<typeof setInterval> | null = null;

  ngAfterViewInit(): void {
    this.resetBoard();
    this.draw();
  }

  ngOnDestroy(): void {
    this.stopLoop();
  }

  startGame(): void {
    this.resetBoard();
    this.score.set(0);
    this.gameOver.set(false);
    this.isRunning.set(true);
    this.stopLoop();
    this.timer = setInterval(() => this.tick(), 105);
  }

  private resetBoard(): void {
    this.snake = [
      { x: 8, y: 12 },
      { x: 7, y: 12 },
      { x: 6, y: 12 },
    ];
    this.dir = { x: 1, y: 0 };
    this.nextDir = { x: 1, y: 0 };
    this.spawnFood();
  }

  private spawnFood(): void {
    while (true) {
      const candidate = {
        x: Math.floor(Math.random() * this.tileCount),
        y: Math.floor(Math.random() * this.tileCount),
      };
      if (!this.snake.some((s) => s.x === candidate.x && s.y === candidate.y)) {
        this.food = candidate;
        break;
      }
    }
  }

  private tick(): void {
    this.dir = this.nextDir;
    const head = {
      x: this.snake[0].x + this.dir.x,
      y: this.snake[0].y + this.dir.y,
    };

    if (
      head.x < 0 ||
      head.x >= this.tileCount ||
      head.y < 0 ||
      head.y >= this.tileCount ||
      this.snake.some((s) => s.x === head.x && s.y === head.y)
    ) {
      this.endGame();
      return;
    }

    this.snake.unshift(head);

    if (head.x === this.food.x && head.y === this.food.y) {
      const nextScore = this.score() + 10;
      this.score.set(nextScore);
      if (nextScore > this.highScore()) {
        this.highScore.set(nextScore);
        localStorage.setItem('allinone_snake_hi', String(nextScore));
      }
      this.spawnFood();
    } else {
      this.snake.pop();
    }

    this.draw();
  }

  private endGame(): void {
    this.stopLoop();
    this.isRunning.set(false);
    this.gameOver.set(true);
  }

  private stopLoop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private draw(): void {
    const canvas = this.canvasRef.nativeElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#05070d';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Subtle Grid
    ctx.strokeStyle = 'rgba(255,255,255,0.03)';
    for (let i = 0; i < this.tileCount; i++) {
      ctx.beginPath();
      ctx.moveTo(i * this.gridSize, 0);
      ctx.lineTo(i * this.gridSize, canvas.height);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i * this.gridSize);
      ctx.lineTo(canvas.width, i * this.gridSize);
      ctx.stroke();
    }

    // Food
    ctx.fillStyle = '#f43f5e';
    ctx.shadowColor = '#f43f5e';
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(
      this.food.x * this.gridSize + this.gridSize / 2,
      this.food.y * this.gridSize + this.gridSize / 2,
      this.gridSize / 2 - 2,
      0,
      Math.PI * 2
    );
    ctx.fill();

    // Snake
    this.snake.forEach((seg, idx) => {
      ctx.fillStyle = idx === 0 ? '#22d3ee' : '#8b5cf6';
      ctx.shadowColor = idx === 0 ? '#22d3ee' : '#8b5cf6';
      ctx.shadowBlur = idx === 0 ? 10 : 4;
      ctx.fillRect(
        seg.x * this.gridSize + 1,
        seg.y * this.gridSize + 1,
        this.gridSize - 2,
        this.gridSize - 2
      );
    });
    ctx.shadowBlur = 0;
  }

  @HostListener('window:keydown', ['$event'])
  handleKey(e: KeyboardEvent): void {
    const key = e.key.toLowerCase();
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 'a', 's', 'd'].includes(key)) {
      e.preventDefault();
    }
    if ((key === 'arrowup' || key === 'w') && this.dir.y === 0) {
      this.nextDir = { x: 0, y: -1 };
    } else if ((key === 'arrowdown' || key === 's') && this.dir.y === 0) {
      this.nextDir = { x: 0, y: 1 };
    } else if ((key === 'arrowleft' || key === 'a') && this.dir.x === 0) {
      this.nextDir = { x: -1, y: 0 };
    } else if ((key === 'arrowright' || key === 'd') && this.dir.x === 0) {
      this.nextDir = { x: 1, y: 0 };
    }
  }
}
