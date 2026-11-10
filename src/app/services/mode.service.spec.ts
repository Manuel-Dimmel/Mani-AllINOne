import { TestBed } from '@angular/core/testing';
import { ModeService, MODE_STORAGE_KEY } from './mode.service';

describe('ModeService', () => {
  let service: ModeService;

  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-mode');
    document.body.removeAttribute('data-mode');
    TestBed.configureTestingModule({});
    service = TestBed.inject(ModeService);
  });

  afterEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-mode');
    document.body.removeAttribute('data-mode');
  });

  it('should be created and default to games mode', () => {
    expect(service).toBeTruthy();
    expect(service.activeMode()).toBe('games');
    expect(service.isGames()).toBe(true);
    expect(service.isNotebook()).toBe(false);
    expect(document.documentElement.getAttribute('data-mode')).toBe('games');
  });

  it('should switch mode to notebook and persist in localStorage', () => {
    service.setMode('notebook');
    expect(service.activeMode()).toBe('notebook');
    expect(service.isGames()).toBe(false);
    expect(service.isNotebook()).toBe(true);
    expect(document.documentElement.getAttribute('data-mode')).toBe('notebook');
    expect(localStorage.getItem(MODE_STORAGE_KEY)).toBe('notebook');
  });

  it('should toggle between modes', () => {
    service.toggleMode();
    expect(service.activeMode()).toBe('notebook');
    service.toggleMode();
    expect(service.activeMode()).toBe('games');
  });
});
