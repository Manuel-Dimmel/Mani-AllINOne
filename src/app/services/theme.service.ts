import { Injectable, computed, signal } from '@angular/core';

export type ThemeId = 'default' | 'apple' | 'frontend-ui';

export interface ThemeOption {
  id: ThemeId;
  name: string;
  badge: string;
  tagline: string;
  icon: string;
}

export const THEME_OPTIONS: readonly ThemeOption[] = [
  {
    id: 'default',
    name: 'Nexus Glow',
    badge: 'Original',
    tagline: 'Neon orbs, glassmorphism & dynamic gradients',
    icon: '✦',
  },
  {
    id: 'apple',
    name: 'Apple HIG',
    badge: 'Human Interface',
    tagline: 'Liquid glass, SF typography & Cupertino restraint',
    icon: '',
  },
  {
    id: 'frontend-ui',
    name: 'Frontend Engineering',
    badge: 'Modern Dev',
    tagline: 'Anti-AI aesthetic, crisp slate grid & WCAG AAA contrast',
    icon: '⚡',
  },
] as const;

const STORAGE_KEY = 'allinone_active_theme';

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  readonly themes = THEME_OPTIONS;
  readonly activeThemeId = signal<ThemeId>(this.getInitialTheme());

  readonly currentTheme = computed(() => {
    const id = this.activeThemeId();
    return this.themes.find((t) => t.id === id) ?? this.themes[0];
  });

  constructor() {
    this.applyTheme(this.activeThemeId());
  }

  setTheme(themeId: ThemeId): void {
    if (this.activeThemeId() === themeId) return;
    this.activeThemeId.set(themeId);
    this.applyTheme(themeId);
    this.persistTheme(themeId);
  }

  private getInitialTheme(): ThemeId {
    if (typeof window === 'undefined') return 'default';
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as ThemeId | null;
      if (saved && (saved === 'default' || saved === 'apple' || saved === 'frontend-ui')) {
        return saved;
      }
    } catch {
      // Fallback if localStorage is inaccessible
    }
    return 'default';
  }

  private applyTheme(themeId: ThemeId): void {
    if (typeof document === 'undefined') return;
    document.documentElement.setAttribute('data-theme', themeId);
    if (document.body) {
      document.body.setAttribute('data-theme', themeId);
    }
  }

  private persistTheme(themeId: ThemeId): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY, themeId);
    } catch {
      // Ignore storage errors (private mode, quota, etc.)
    }
  }
}
