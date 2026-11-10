import { Component, HostListener, computed, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { ThemeId, ThemeService } from './services/theme.service';
import { AppLanguage, LanguageService } from './services/language.service';
import { AppMode, ModeService } from './services/mode.service';

export interface AppNavLink {
  label: string;
  route: string;
  exact?: boolean;
  tag?: string;
}

@Component({
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App {
  protected readonly title = signal('AllInOne');
  protected readonly themeService = inject(ThemeService);
  protected readonly languageService = inject(LanguageService);
  protected readonly modeService = inject(ModeService);

  protected readonly themeMenuOpen = signal(false);
  protected readonly langMenuOpen = signal(false);

  // Filtered links depending on whether user is in 'games' or 'notebook' mode
  protected readonly navLinks = computed<AppNavLink[]>(() => {
    const isNotebook = this.modeService.isNotebook();
    if (isNotebook) {
      return [
        { label: 'Übersicht', route: '/', exact: true },
        { label: 'YT Downloader', route: '/programs/yt-downloader', tag: 'Python' },
        { label: 'BG Remover', route: '/programs/bg-remover', tag: 'AI' },
        { label: 'Konverter', route: '/programs/universal-converter' },
        { label: 'QR Studio', route: '/programs/qr-studio' },
        { label: 'Dev Tools', route: '/programs/dev-tools' },
        { label: 'Glücksrad', route: '/programs/decision-hub' },
        { label: 'Passwort Studio', route: '/programs/password-studio' },
      ];
    }
    return [
      { label: 'Übersicht', route: '/', exact: true },
      { label: 'Tapple', route: '/games/tapple' },
      { label: '5 Second Rule', route: '/games/five-seconds' },
      { label: 'Tick Tack Bumm', route: '/games/tick-tack-bumm' },
      { label: 'Anomia', route: '/games/anomia' },
      { label: 'Vollpfosten', route: '/games/vollpfosten' },
      { label: 'Tabu', route: '/games/tabu' },
      { label: 'Memory', route: '/games/memory' },
      { label: 'TicTacToe', route: '/games/tictactoe' },
      { label: 'Snake', route: '/games/snake' },
    ];
  });

  setMode(mode: AppMode): void {
    this.modeService.setMode(mode);
  }

  toggleThemeMenu(event: MouseEvent): void {
    event.stopPropagation();
    this.langMenuOpen.set(false);
    this.themeMenuOpen.update((open) => !open);
  }

  closeThemeMenu(): void {
    this.themeMenuOpen.set(false);
  }

  selectTheme(themeId: ThemeId): void {
    this.themeService.setTheme(themeId);
    this.closeThemeMenu();
  }

  toggleLangMenu(event: MouseEvent): void {
    event.stopPropagation();
    this.themeMenuOpen.set(false);
    this.langMenuOpen.update((open) => !open);
  }

  closeLangMenu(): void {
    this.langMenuOpen.set(false);
  }

  selectLanguage(lang: AppLanguage): void {
    this.languageService.setLanguage(lang);
    this.closeLangMenu();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.closeThemeMenu();
    this.closeLangMenu();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement | null;
    if (this.themeMenuOpen() && target && !target.closest('.theme-dropdown-container')) {
      this.closeThemeMenu();
    }
    if (this.langMenuOpen() && target && !target.closest('.lang-dropdown-container')) {
      this.closeLangMenu();
    }
  }
}
