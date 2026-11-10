import { TestBed } from '@angular/core/testing';
import { ThemeService, THEME_OPTIONS } from './theme.service';

describe('ThemeService', () => {
  let service: ThemeService;

  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
    document.body.removeAttribute('data-theme');
    TestBed.configureTestingModule({});
    service = TestBed.inject(ThemeService);
  });

  afterEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
    document.body.removeAttribute('data-theme');
  });

  it('should be created and have default theme', () => {
    expect(service).toBeTruthy();
    expect(service.activeThemeId()).toBe('default');
    expect(service.themes.length).toBe(3);
  });

  it('should apply default data-theme to html and body', () => {
    expect(document.documentElement.getAttribute('data-theme')).toBe('default');
    expect(document.body.getAttribute('data-theme')).toBe('default');
  });

  it('should switch to apple theme and update attributes and storage', () => {
    service.setTheme('apple');
    expect(service.activeThemeId()).toBe('apple');
    expect(service.currentTheme().name).toBe('Apple HIG');
    expect(document.documentElement.getAttribute('data-theme')).toBe('apple');
    expect(document.body.getAttribute('data-theme')).toBe('apple');
    expect(localStorage.getItem('allinone_active_theme')).toBe('apple');
  });

  it('should switch to frontend-ui theme and update attributes and storage', () => {
    service.setTheme('frontend-ui');
    expect(service.activeThemeId()).toBe('frontend-ui');
    expect(service.currentTheme().name).toBe('Frontend Engineering');
    expect(document.documentElement.getAttribute('data-theme')).toBe('frontend-ui');
    expect(document.body.getAttribute('data-theme')).toBe('frontend-ui');
    expect(localStorage.getItem('allinone_active_theme')).toBe('frontend-ui');
  });
});
