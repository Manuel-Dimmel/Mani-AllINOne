const STORAGE_KEY = 'allinone_party_players';

export function loadSavedPlayerNames(
  fallback: string[] = ['Spieler 1', 'Spieler 2', 'Spieler 3']
): string[] {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length >= 2) {
      const cleaned = parsed
        .map((n) => (typeof n === 'string' ? n.trim() : ''))
        .filter((n) => n.length > 0)
        .slice(0, 8);
      if (cleaned.length >= 2) return cleaned;
    }
  } catch {}
  return fallback;
}

export function savePlayerNames(names: string[]): void {
  if (typeof window === 'undefined') return;
  try {
    const cleaned = names.map((n) => n.trim()).filter((n) => n.length > 0);
    if (cleaned.length >= 2) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cleaned));
    }
  } catch {}
}
