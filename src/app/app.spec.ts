import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { App } from './app';
import { routes } from './app.routes';
import { ThemeService } from './services/theme.service';
import { LanguageService } from './services/language.service';
import { ModeService } from './services/mode.service';

describe('App', () => {
  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter(routes), provideHttpClient(), ThemeService, LanguageService, ModeService],
    }).compileComponents();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render top row with brand, mode switcher on left and controls in right corner', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;
    const topRow = compiled.querySelector('.nav-top-row');
    expect(topRow).toBeTruthy();

    const brand = topRow?.querySelector('.brand');
    expect(brand).toBeTruthy();
    expect(brand?.textContent).toContain('AllInOne');

    const modeSwitcher = topRow?.querySelector('.mode-switcher');
    expect(modeSwitcher).toBeTruthy();

    const topActions = topRow?.querySelector('.nav-top-actions');
    expect(topActions).toBeTruthy();

    const langBtn = topActions?.querySelector('.lang-toggle-btn');
    const themeBtn = topActions?.querySelector('.theme-toggle-btn');
    expect(langBtn).toBeTruthy();
    expect(themeBtn).toBeTruthy();
  });

  it('should switch mode between games and notebook and filter nav links', async () => {
    const fixture = TestBed.createComponent(App);
    const modeService = TestBed.inject(ModeService);
    fixture.detectChanges();
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;
    const modeBtns = compiled.querySelectorAll<HTMLButtonElement>('.mode-btn');
    expect(modeBtns.length).toBe(2);

    // Initial mode is games
    expect(modeService.activeMode()).toBe('games');
    const gamesNavLabels = Array.from(compiled.querySelectorAll('.nav-item .nav-label')).map(
      (el) => el.textContent?.trim()
    );
    expect(gamesNavLabels).toContain('Tapple');
    expect(gamesNavLabels).not.toContain('YT Downloader');

    // Click Notebook mode button
    modeBtns[1].click();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(modeService.activeMode()).toBe('notebook');
    const notebookNavLabels = Array.from(compiled.querySelectorAll('.nav-item .nav-label')).map(
      (el) => el.textContent?.trim()
    );
    expect(notebookNavLabels).toContain('YT Downloader');
    expect(notebookNavLabels).not.toContain('Tapple');
  });

  it('should toggle language dropdown and switch language globally', async () => {
    const fixture = TestBed.createComponent(App);
    const langService = TestBed.inject(LanguageService);
    fixture.detectChanges();
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;
    const langBtn = compiled.querySelector<HTMLButtonElement>('.lang-toggle-btn');
    expect(langBtn?.textContent).toContain('DE');
    expect(compiled.querySelector('.lang-menu')).toBeFalsy();

    langBtn?.click();
    fixture.detectChanges();
    expect(compiled.querySelector('.lang-menu')).toBeTruthy();

    const items = compiled.querySelectorAll<HTMLButtonElement>('.lang-menu .dropdown-item');
    expect(items.length).toBe(2);

    // Select English
    items[1]?.click();
    fixture.detectChanges();

    expect(langService.currentLang()).toBe('en');
    expect(compiled.querySelector('.lang-menu')).toBeFalsy();
    expect(langBtn?.textContent).toContain('EN');
  });

  it('should render theme dropdown button and switch theme', async () => {
    const fixture = TestBed.createComponent(App);
    const themeService = TestBed.inject(ThemeService);
    fixture.detectChanges();
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;
    const toggleBtn = compiled.querySelector<HTMLButtonElement>('.theme-toggle-btn');
    expect(toggleBtn).toBeTruthy();
    expect(compiled.querySelector('.theme-menu')).toBeFalsy();

    toggleBtn?.click();
    fixture.detectChanges();
    expect(compiled.querySelector('.theme-menu')).toBeTruthy();

    const items = compiled.querySelectorAll<HTMLButtonElement>('.theme-menu .dropdown-item');
    expect(items.length).toBe(3);

    // Select Apple theme
    items[1]?.click();
    fixture.detectChanges();
    expect(themeService.activeThemeId()).toBe('apple');
    expect(compiled.querySelector('.theme-menu')).toBeFalsy();
  });

  it('should close dropdowns on Escape key', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    const langBtn = fixture.nativeElement.querySelector('.lang-toggle-btn') as HTMLButtonElement;
    langBtn.click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.lang-menu')).toBeTruthy();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.lang-menu')).toBeFalsy();
  });
});
