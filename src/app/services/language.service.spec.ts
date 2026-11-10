import { TestBed } from '@angular/core/testing';
import {
  LanguageService,
  GLOBAL_LANG_STORAGE_KEY,
  GAME_LANG_KEYS,
  LANGUAGE_OPTIONS,
} from './language.service';

describe('LanguageService', () => {
  let service: LanguageService;

  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('lang');
    TestBed.configureTestingModule({});
    service = TestBed.inject(LanguageService);
  });

  afterEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('lang');
  });

  it('should be created and default to German', () => {
    expect(service).toBeTruthy();
    expect(service.currentLang()).toBe('de');
    expect(service.isEn()).toBe(false);
    expect(service.languages.length).toBe(2);
    expect(document.documentElement.getAttribute('lang')).toBe('de');
  });

  it('should switch language to English and persist globally and for games', () => {
    service.setLanguage('en');
    expect(service.currentLang()).toBe('en');
    expect(service.isEn()).toBe(true);
    expect(service.activeOption().shortLabel).toBe('EN');
    expect(document.documentElement.getAttribute('lang')).toBe('en');
    expect(localStorage.getItem(GLOBAL_LANG_STORAGE_KEY)).toBe('en');

    // All game keys must also be synchronized
    for (const key of GAME_LANG_KEYS) {
      expect(localStorage.getItem(key)).toBe('en');
    }
  });

  it('should switch back to German and update all keys', () => {
    service.setLanguage('en');
    service.setLanguage('de');
    expect(service.currentLang()).toBe('de');
    expect(service.isEn()).toBe(false);
    expect(localStorage.getItem(GLOBAL_LANG_STORAGE_KEY)).toBe('de');
    for (const key of GAME_LANG_KEYS) {
      expect(localStorage.getItem(key)).toBe('de');
    }
  });
});
