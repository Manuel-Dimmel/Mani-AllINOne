# Conventions, Gotchas & Guardrails

## 1. Project-Specific "Gotchas" (Pitfalls to Avoid)

> [!CAUTION]
> **1. Zoneless Change Detection (NO `zone.js`)**
> Angular 22 runs in zoneless mode. Asynchronous callbacks (`setTimeout`, `setInterval`, `requestAnimationFrame`, or native event listeners) **WILL NOT** automatically trigger view updates if you mutate plain component properties.
> - **Rule:** Always use Angular Signals (`signal()`, `computed()`), or inject `ChangeDetectorRef` and call `this.cdr.markForCheck()` inside timer ticks. Failing to do this causes game timers to freeze visually.

> [!CAUTION]
> **2. Never Link External Audio Files**
> Do not import `.mp3`, `.wav`, or `.ogg` files into assets or reference external URLs. Remote files are prone to 404s, CORS restrictions, and network latency.
> - **Rule:** All sound effects (buzzers, ticks, bombs, success chimes) must be generated procedurally via the native Web Audio API using `AudioContext` and `OscillatorNode`. Always wrap audio calls in `try / catch` to satisfy browser autoplay restrictions.

> [!CAUTION]
> **3. Mandatory Catalog Registration**
> Adding a new game or tool page without registering it in `src/app/models/catalog.model.ts` will make it completely invisible in the dashboard search, filter tabs, and hero spotlight.
> - **Rule:** Every new page requires 4 synchronized steps:
>   1. Component file in `src/app/pages/(programs|games)/`.
>   2. Catalog entry in `src/app/models/catalog.model.ts`.
>   3. Route entry in `src/app/app.routes.ts`.
>   4. Navigation link in `src/app/app.html` (if global nav presence is desired).

> [!WARNING]
> **4. Vercel SPA Wildcard Rewrites**
> Direct URL navigation to sub-routes (e.g. `/games/tapple`) on Vercel will produce HTTP 404 errors if the rewrite rule is missing.
> - **Rule:** `dist/AllInOne/browser/vercel.json` must always specify:
>   `{ "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }`

> [!WARNING]
> **5. Global Player Pool & Language Synchronization Discipline**
> Never build isolated player inputs or local-only language toggles in party games.
> - **Rule (Players):** Always load via `loadSavedPlayerNames()` and persist changes using `savePlayerNames()` from `src/app/services/player-storage.ts`.
> - **Rule (Language):** Inject `LanguageService` from `src/app/services/language.service.ts` to consume and toggle the global `currentLang` signal. It guarantees dual persistence across `allinone_global_lang` and individual legacy game keys.

---

## 2. Key Architecture Decision Records (ADRs)

- **ADR-001 (Zoneless Angular 22 + Signals):** Chosen to eliminate the Zone.js monkey-patching overhead, resulting in smaller bundle sizes, faster initial load times, and crystal-clear reactive dependency graphs.
- **ADR-002 (Local Daemon Companion Architecture):** Heavy processing (yt-dlp, FFmpeg muxing, deep learning U²-Net matting) runs on a local Flask server on port 8765. This avoids expensive cloud servers while allowing 95% of the application to run fully serverless on Vercel.
- **ADR-003 (Pure CSS3 Custom Properties Design System):** The UI avoids Tailwind CSS and Bootstrap in favor of scoped CSS variables and modular stylesheets (`Nexus Glow`, `Apple HIG`, `Frontend UI`). This ensures zero build-step overhead for CSS utilities and complete pixel-level control.
- **ADR-004 (Synthesized Web Audio Engine):** Audio is synthesized mathematically at runtime. This avoids asset loading failures, reduces bundle size to 0 KB for audio, and enables micro-adjustments to frequencies and envelopes.
- **ADR-005 (Vitest Testing Harness):** Vitest + jsdom replaced Karma and Jest for rapid feedback loops and native ES modules support.
- **ADR-006 (Centralized Language & Player Stores):** Player rosters and language choices are synchronized across party games through browser storage with fallback defaults, ensuring zero-friction party transitions between games without re-entering names or changing languages repeatedly.

---

## 3. Code Style & Testing Rules

### Standalone Component Architecture
- Every Angular component must be `standalone: true` (Angular 22 default).
- Prefer inline templates and styles for compact or highly cohesive pages, or dedicated `.html`/`.css` files when templates exceed ~150 lines.
- Always use Modern Angular Control Flow syntax:
  - `@if (condition) { ... } @else { ... }`
  - `@for (item of items(); track item.id) { ... }`
  - `@switch (mode()) { @case ('a') { ... } }`

### Unit Testing Guidelines
- All shared services (`ThemeService`, `LanguageService`, `PlayerStorage`, etc.) must have corresponding `.spec.ts` tests.
- When testing zoneless components in Vitest, run `await fixture.whenStable()` or `fixture.detectChanges()` after simulating user events.
- Test suites must run cleanly with:
  ```bash
  npm test
  ```
