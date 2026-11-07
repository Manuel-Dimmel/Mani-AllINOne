import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface VideoResolution {
  quality: string;
  fps: number;
  progressive: boolean;
  mime: string;
  filesize: number;
  filesize_human: string;
}

export interface VideoInfo {
  id: string;
  title: string;
  author: string;
  length: number;
  duration_formatted: string;
  views: number;
  publish_date: string;
  thumbnail_url: string;
  url: string;
  resolutions: VideoResolution[];
  audio_size_human: string;
  engine: string;
}

export interface DownloadJob {
  id: string;
  url: string;
  mode: 'video' | 'audio';
  quality: string;
  status: 'queued' | 'analyzing' | 'downloading' | 'processing' | 'finished' | 'error';
  percent: number;
  stage: string;
  title: string;
  author: string;
  thumbnail: string;
  filename: string;
  filepath: string;
  filesize: number;
  filesize_human: string;
  error: string | null;
  created_at?: string;
  completed_at?: string;
}

export interface HealthResponse {
  status: string;
  python_version: string;
  ffmpeg_available: boolean;
  download_dir: string;
}

@Injectable({
  providedIn: 'root',
})
export class YtDownloaderService {
  private readonly http = inject(HttpClient);
  private readonly apiBase = 'http://127.0.0.1:8765/api';

  checkHealth(): Observable<HealthResponse> {
    return this.http.get<HealthResponse>(`${this.apiBase}/health`);
  }

  getVideoInfo(url: string): Observable<VideoInfo> {
    return this.http.post<VideoInfo>(`${this.apiBase}/yt/info`, { url });
  }

  startDownload(
    url: string,
    mode: 'video' | 'audio',
    quality: string,
    audioFormat: 'mp3' | 'm4a' = 'mp3'
  ): Observable<{ job_id: string; job: DownloadJob }> {
    return this.http.post<{ job_id: string; job: DownloadJob }>(`${this.apiBase}/yt/download`, {
      url,
      mode,
      quality,
      audioFormat,
    });
  }

  getProgress(jobId: string): Observable<DownloadJob> {
    return this.http.get<DownloadJob>(`${this.apiBase}/yt/progress/${jobId}`);
  }

  getHistory(): Observable<{ jobs: DownloadJob[]; download_dir: string }> {
    return this.http.get<{ jobs: DownloadJob[]; download_dir: string }>(`${this.apiBase}/yt/history`);
  }

  openFolder(filepath?: string): Observable<{ ok: boolean }> {
    return this.http.post<{ ok: boolean }>(`${this.apiBase}/yt/open-folder`, { filepath });
  }

  getPythonSource(): Observable<{ source: string; path: string }> {
    return this.http.get<{ source: string; path: string }>(`${this.apiBase}/yt/source`);
  }

  getFileDownloadUrl(jobId: string): string {
    return `${this.apiBase}/yt/file/${jobId}`;
  }
}
