import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { of } from 'rxjs';
import { DashboardComponent } from './dashboard';
import { ModeService } from '../../services/mode.service';
import { LanguageService } from '../../services/language.service';
import { YtDownloaderService } from '../../services/yt-downloader.service';

describe('DashboardComponent', () => {
  let mockYtService: { checkHealth: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    localStorage.clear();
    mockYtService = {
      checkHealth: vi.fn().mockReturnValue(of({ status: 'ok' })),
    };

    await TestBed.configureTestingModule({
      imports: [DashboardComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        ModeService,
        LanguageService,
        { provide: YtDownloaderService, useValue: mockYtService },
      ],
    }).compileComponents();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should create dashboard and render unslopped workspace layout', () => {
    const fixture = TestBed.createComponent(DashboardComponent);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();

    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.hero-card')).toBeTruthy();
    expect(compiled.querySelector('.controls-bar')).toBeTruthy();
    expect(compiled.querySelector('.cards-grid')).toBeTruthy();
  });

  it('should show only games when mode is games', () => {
    const fixture = TestBed.createComponent(DashboardComponent);
    const modeService = TestBed.inject(ModeService);
    modeService.setMode('games');
    fixture.detectChanges();

    const component = fixture.componentInstance;
    expect(component.modeItems().length).toBeGreaterThan(0);
    expect(component.modeItems().every((i) => i.category === 'games')).toBe(true);

    const activeSpot = component.activeSpotlight();
    expect(activeSpot.category).toBe('games');
  });

  it('should show only notebook tools when mode is notebook', () => {
    const fixture = TestBed.createComponent(DashboardComponent);
    const modeService = TestBed.inject(ModeService);
    modeService.setMode('notebook');
    fixture.detectChanges();

    const component = fixture.componentInstance;
    expect(component.modeItems().length).toBeGreaterThan(0);
    expect(component.modeItems().every((i) => i.category === 'programs')).toBe(true);

    const activeSpot = component.activeSpotlight();
    expect(activeSpot.category).toBe('programs');
  });

  it('should filter items by search query', () => {
    const fixture = TestBed.createComponent(DashboardComponent);
    const modeService = TestBed.inject(ModeService);
    modeService.setMode('games');
    const component = fixture.componentInstance;
    fixture.detectChanges();

    component.searchQuery.set('Tapple');
    fixture.detectChanges();

    const items = component.displayedItems();
    expect(items.length).toBeGreaterThan(0);
    expect(items.every((i) => i.title.toLowerCase().includes('tapple') || i.tags.some((t) => t.toLowerCase().includes('tapple')))).toBe(true);
  });

  it('should toggle favorites and filter by favorites tab', () => {
    const fixture = TestBed.createComponent(DashboardComponent);
    const modeService = TestBed.inject(ModeService);
    modeService.setMode('games');
    const component = fixture.componentInstance;
    fixture.detectChanges();

    const testId = component.modeItems()[0].id;
    const initialFav = component.isFavorite(testId);

    const mockEvent = new MouseEvent('click');
    component.toggleFavorite(testId, mockEvent);
    expect(component.isFavorite(testId)).toBe(!initialFav);

    component.selectFilter('favorites');
    fixture.detectChanges();
    expect(component.displayedItems().every((i) => component.isFavorite(i.id))).toBe(true);
  });

  it('should cycle spotlight next and previous within active mode', () => {
    const fixture = TestBed.createComponent(DashboardComponent);
    const modeService = TestBed.inject(ModeService);
    modeService.setMode('games');
    const component = fixture.componentInstance;
    fixture.detectChanges();

    const initialIdx = component.spotlightIndex();
    component.nextSpotlight();
    expect(component.spotlightIndex()).toBe((initialIdx + 1) % component.modeItems().length);

    component.prevSpotlight();
    expect(component.spotlightIndex()).toBe(initialIdx);
  });
});
