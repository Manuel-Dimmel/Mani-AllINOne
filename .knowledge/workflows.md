# Workflows & Execution Lifecycles

## 1. Core End-to-End Lifecycles

### Workflow A: YouTube Video & Audio Download Flow
```mermaid
sequenceDiagram
    autonumber
    actor User as User
    participant UI as YtDownloaderComponent
    participant Svc as YtDownloaderService
    participant API as Flask API (yt_downloader.py)
    participant Worker as Background Worker (Thread)
    participant OS as FFmpeg & File System

    User->>UI: Pastes YouTube URL & clicks "Analysieren"
    UI->>Svc: analyzeVideo(url)
    Svc->>API: POST /api/yt/info
    API-->>Svc: Video info (title, formats, thumbnail, 4K availability)
    Svc-->>UI: Displays format picker
    User->>UI: Selects format (e.g. 1080p MP4 or MP3) & clicks "Download"
    UI->>Svc: startDownload(url, format)
    Svc->>API: POST /api/yt/download
    API->>Worker: Spawns run_download_worker() in threading.Thread
    API-->>Svc: Returns { jobId }
    
    loop Every 500ms
        UI->>Svc: getJobStatus(jobId)
        Svc->>API: GET /api/yt/job/{jobId}
        Worker->>OS: Download video/audio streams via yt-dlp
        Worker->>OS: Merge streams with FFmpeg
        Worker->>API: Updates JOBS[jobId] progress %
        API-->>Svc: Progress JSON (percent, speed, ETA)
        Svc-->>UI: Updates progress bar
    end

    Worker->>API: Status marked 'finished', sets filepath in ~/Downloads/AllInOne_YT
    UI->>User: Renders "Im Finder anzeigen" & direct download button
    User->>UI: Clicks "Im Finder anzeigen"
    UI->>API: POST /api/yt/open-folder
    API->>OS: subprocess.Popen(["open", "-R", filepath])
```

---

### Workflow B: AI Background Removal Flow
```mermaid
sequenceDiagram
    autonumber
    actor User as User
    participant UI as BgRemoverComponent
    participant Svc as BgRemoverService
    participant API as Flask API (yt_downloader.py / bg_remover.py)
    participant Model as ONNX Runtime / rembg / OpenCV

    User->>UI: Drops image & selects mode (AI U²-Net, GrabCut, Chroma)
    User->>UI: Adjusts feathering / background color / bokeh blur
    UI->>Svc: removeBackground(file, options)
    Svc->>API: POST /api/bg/remove (Multipart FormData)
    
    alt Mode == 'ai'
        API->>Model: rembg_remove(pil_img, session='u2netp')
    else Mode == 'grabcut'
        API->>Model: cv2.grabCut() with central bounding rectangle
    else Mode == 'chroma'
        API->>Model: LAB color space delta E thresholding
    end

    API->>Model: Post-processing (Feathering, bokeh blur, background fill)
    API-->>Svc: JSON { result_base64, original_base64, filepath, duration_ms }
    Svc-->>UI: Updates image signals
    UI->>User: Displays interactive Before/After comparison slider
```

---

### Workflow C: Party Game Player Synchronization Flow
```mermaid
sequenceDiagram
    autonumber
    actor User as Player / Host
    participant GameA as TappleGameComponent
    participant Store as player-storage.ts
    participant LS as Browser LocalStorage
    participant GameB as TabuGameComponent

    User->>GameA: Opens Tapple game
    GameA->>Store: loadSavedPlayerNames()
    Store->>LS: getItem('allinone_party_players')
    LS-->>Store: ['Alex', 'Sam', 'Maria']
    Store-->>GameA: Populates player signals

    User->>GameA: Adds 'Taylor' to the match
    GameA->>Store: savePlayerNames(['Alex', 'Sam', 'Maria', 'Taylor'])
    Store->>LS: setItem('allinone_party_players', JSON.stringify(...))

    User->>GameB: Navigates to Tabu
    GameB->>Store: loadSavedPlayerNames()
    Store->>LS: getItem('allinone_party_players')
    LS-->>Store: ['Alex', 'Sam', 'Maria', 'Taylor']
    Store-->>GameB: Automatically populates Team A / Team B assignment
```

---

### Workflow D: Dynamic Theme Switching Flow
```mermaid
sequenceDiagram
    autonumber
    actor User as User
    participant Shell as App Shell (Navbar Top Actions)
    participant ThemeSvc as ThemeService
    participant DOM as document.documentElement
    participant LS as Browser LocalStorage

    User->>Shell: Clicks Theme Dropdown & selects "Apple HIG"
    Shell->>ThemeSvc: setTheme('apple')
    ThemeSvc->>ThemeSvc: activeThemeId.set('apple')
    ThemeSvc->>DOM: setAttribute('data-theme', 'apple')
    DOM-->>User: CSS theme variables activate immediately (Liquid Glass, SF Font)
    ThemeSvc->>LS: setItem('allinone_active_theme', 'apple')
```

---

### Workflow E: Bilingual Language Switching & Cross-Game Sync Flow
```mermaid
sequenceDiagram
    autonumber
    actor User as Player
    participant Shell as App Shell / Top Actions
    participant LangSvc as LanguageService
    participant DOM as document.documentElement
    participant LS as Browser LocalStorage
    participant Game as Anomia / Tapple / 5s Game

    User->>Shell: Toggles language switch to "EN"
    Shell->>LangSvc: setLanguage('en')
    LangSvc->>LangSvc: currentLang.set('en')
    LangSvc->>DOM: setAttribute('lang', 'en')
    LangSvc->>LS: setItem('allinone_global_lang', 'en')
    LangSvc->>LS: setItem('allinone_tapple_lang', 'en'), etc.
    
    Game->>LangSvc: reacts to currentLang() signal change
    Game-->>User: Deck & categories re-render immediately in English
```

---

## 2. Asynchronous & Background Job Management

### Python Thread Synchronization
- Download workers are spun off using standard Python `threading.Thread(target=run_download_worker, ...)` to ensure the Flask main event loop is never blocked during long-running 4K video downloads.
- State access across threads is protected via `JOBS_LOCK = threading.Lock()`.
- Jobs remain addressable by UUID for subsequent status polling and Finder reveal actions.
