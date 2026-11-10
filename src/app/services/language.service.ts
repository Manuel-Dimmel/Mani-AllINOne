import { Injectable, computed, signal } from '@angular/core';

export type AppLanguage = 'de' | 'en';

export interface LanguageOption {
  code: AppLanguage;
  name: string;
  nativeName: string;
  flag: string;
  shortLabel: string;
  tagline: string;
}

export const LANGUAGE_OPTIONS: readonly LanguageOption[] = [
  {
    code: 'de',
    name: 'Deutsch',
    nativeName: 'Deutsch',
    flag: '🇩🇪',
    shortLabel: 'DE',
    tagline: 'Karten, Fragen & Benutzeroberfläche auf Deutsch',
  },
  {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    flag: '🇬🇧',
    shortLabel: 'EN',
    tagline: 'Cards, prompts & user interface in English',
  },
] as const;

export const GLOBAL_LANG_STORAGE_KEY = 'allinone_global_lang';

export const GAME_LANG_KEYS = [
  'allinone_tapple_lang',
  'allinone_anomia_lang',
  'allinone_5sec_lang',
  'allinone_ticktack_lang',
  'allinone_vollpfosten_lang',
];

@Injectable({
  providedIn: 'root',
})
export class LanguageService {
  readonly languages = LANGUAGE_OPTIONS;
  readonly currentLang = signal<AppLanguage>(this.getInitialLanguage());
  readonly isEn = computed(() => this.currentLang() === 'en');

  readonly activeOption = computed(() => {
    const code = this.currentLang();
    return this.languages.find((l) => l.code === code) ?? this.languages[0];
  });

  constructor() {
    this.applyLanguage(this.currentLang());
  }

  setLanguage(lang: AppLanguage): void {
    if (this.currentLang() === lang) return;
    this.currentLang.set(lang);
    this.applyLanguage(lang);
    this.persistLanguage(lang);
  }

  private getInitialLanguage(): AppLanguage {
    if (typeof window === 'undefined') return 'de';
    try {
      const globalVal = localStorage.getItem(GLOBAL_LANG_STORAGE_KEY) as AppLanguage | null;
      if (globalVal === 'de' || globalVal === 'en') {
        return globalVal;
      }
      for (const k of GAME_LANG_KEYS) {
        const gameVal = localStorage.getItem(k) as AppLanguage | null;
        if (gameVal === 'de' || gameVal === 'en') {
          return gameVal;
        }
      }
    } catch {}
    return 'de';
  }

  private applyLanguage(lang: AppLanguage): void {
    if (typeof document === 'undefined') return;
    document.documentElement.setAttribute('lang', lang);
  }

  private persistLanguage(lang: AppLanguage): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(GLOBAL_LANG_STORAGE_KEY, lang);
      for (const k of GAME_LANG_KEYS) {
        localStorage.setItem(k, lang);
      }
    } catch {}
  }
}
