import { Component, HostListener, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { ThemeId, ThemeService } from './services/theme.service';
import { AppLanguage, LanguageService } from './services/language.service';

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

  protected readonly themeMenuOpen = signal(false);
  protected readonly langMenuOpen = signal(false);

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
