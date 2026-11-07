import { Routes } from '@angular/router';
import { DashboardComponent } from './pages/dashboard/dashboard';
import { YtDownloaderComponent } from './pages/yt-downloader/yt-downloader';
import { BgRemoverComponent } from './pages/bg-remover/bg-remover';
import { PasswordStudioComponent } from './pages/programs/password-studio';
import { DevToolsComponent } from './pages/programs/dev-tools';
import { QrStudioComponent } from './pages/programs/qr-studio';
import { UniversalConverterComponent } from './pages/programs/universal-converter';
import { DecisionHubComponent } from './pages/programs/decision-hub';
import { SnakeGameComponent } from './pages/games/snake-game';
import { TicTacToeGameComponent } from './pages/games/tictactoe-game';
import { MemoryGameComponent } from './pages/games/memory-game';
import { TappleGameComponent } from './pages/games/tapple-game';
import { FiveSecondsGameComponent } from './pages/games/five-seconds-game';
import { TickTackBummGameComponent } from './pages/games/tick-tack-bumm-game';
import { AnomiaGameComponent } from './pages/games/anomia-game';
import { VollpfostenGameComponent } from './pages/games/vollpfosten-game';
import { TabuGameComponent } from './pages/games/tabu-game';

export const routes: Routes = [
  { path: '', component: DashboardComponent, title: 'AllInOne — Übersicht: Spiele & Programme' },
  {
    path: 'programs/yt-downloader',
    component: YtDownloaderComponent,
    title: 'YouTube Downloader (Python) — AllInOne',
  },
  {
    path: 'programs/bg-remover',
    component: BgRemoverComponent,
    title: 'AI Background Remover (Python) — AllInOne',
  },
  {
    path: 'programs/universal-converter',
    component: UniversalConverterComponent,
    title: 'Universal Converter Studio — AllInOne',
  },
  {
    path: 'programs/qr-studio',
    component: QrStudioComponent,
    title: 'QR-Code & WLAN-Karten Studio — AllInOne',
  },
  {
    path: 'programs/decision-hub',
    component: DecisionHubComponent,
    title: 'Entscheidungs-Hub & Glücksrad — AllInOne',
  },
  {
    path: 'programs/password-studio',
    component: PasswordStudioComponent,
    title: 'Passwort & Crypto Studio — AllInOne',
  },
  {
    path: 'programs/dev-tools',
    component: DevToolsComponent,
    title: 'Dev Converter & JSON Lab — AllInOne',
  },
  {
    path: 'games/tapple',
    component: TappleGameComponent,
    title: 'Tapple — Das Wort-Rad — AllInOne',
  },
  {
    path: 'games/five-seconds',
    component: FiveSecondsGameComponent,
    title: '5 Second Rule (5-Sekunden-Regel) — AllInOne',
  },
  {
    path: 'games/tick-tack-bumm',
    component: TickTackBummGameComponent,
    title: 'Tick Tack Bumm (Party Edition) — AllInOne',
  },
  {
    path: 'games/anomia',
    component: AnomiaGameComponent,
    title: 'Anomia — Kopf-an-Kopf Duelle — AllInOne',
  },
  {
    path: 'games/vollpfosten',
    component: VollpfostenGameComponent,
    title: 'Stadt Land Vollpfosten — Das Kartenspiel — AllInOne',
  },
  {
    path: 'games/snake',
    component: SnakeGameComponent,
    title: 'Neon Snake Cybergrid — AllInOne',
  },
  {
    path: 'games/tictactoe',
    component: TicTacToeGameComponent,
    title: 'Cyber Tic-Tac-Toe AI — AllInOne',
  },
  {
    path: 'games/memory',
    component: MemoryGameComponent,
    title: 'Quantum Memory Matrix — AllInOne',
  },
  {
    path: 'games/tabu',
    component: TabuGameComponent,
    title: 'Tabu — AllInOne',
  },
  { path: '**', redirectTo: '' },
];
