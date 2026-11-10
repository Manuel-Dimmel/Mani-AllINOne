import { Injectable, computed, signal } from '@angular/core';

export type AppMode = 'games' | 'notebook';

export interface ModeOption {
  id: AppMode;
  name: string;
  shortLabel: string;
  icon: string;
  description: string;
}

export const MODE_OPTIONS: readonly ModeOption[] = [
  {
    id: 'games',
    name: 'Spiele',
    shortLabel: 'Spiele',
    icon: '🎮',
    description: 'Gesellschafts- und Denkspiele für gemeinsame Runden',
  },
  {
    id: 'notebook',
    name: 'Notebook',
    shortLabel: 'Notebook',
    icon: '📓',
    description: 'Python-Tools, Medien-Engines und Entwickler-Dienstprogramme',
  },
] as const;

export const MODE_STORAGE_KEY = 'allinone_active_mode';

@Injectable({
  providedIn: 'root',
})
export class ModeService {
  readonly modes = MODE_OPTIONS;
  readonly activeMode = signal<AppMode>(this.getInitialMode());

  readonly isGames = computed(() => this.activeMode() === 'games');
  readonly isNotebook = computed(() => this.activeMode() === 'notebook');

  readonly currentModeOption = computed(() => {
    const mode = this.activeMode();
    return this.modes.find((m) => m.id === mode) ?? this.modes[0];
  });

  constructor() {
    this.applyMode(this.activeMode());
  }

  setMode(mode: AppMode): void {
    if (this.activeMode() === mode) return;
    this.activeMode.set(mode);
    this.applyMode(mode);
    this.persistMode(mode);
  }

  toggleMode(): void {
    this.setMode(this.activeMode() === 'games' ? 'notebook' : 'games');
  }

  private getInitialMode(): AppMode {
    if (typeof window === 'undefined') return 'games';
    try {
      const saved = localStorage.getItem(MODE_STORAGE_KEY) as AppMode | null;
      if (saved === 'games' || saved === 'notebook') {
        return saved;
      }
    } catch {}
    return 'games';
  }

  private applyMode(mode: AppMode): void {
    if (typeof document === 'undefined') return;
    document.documentElement.setAttribute('data-mode', mode);
    if (document.body) {
      document.body.setAttribute('data-mode', mode);
    }
  }

  private persistMode(mode: AppMode): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(MODE_STORAGE_KEY, mode);
    } catch {}
  }
}
