import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface BgRemoveOptions {
  mode: 'ai' | 'grabcut' | 'chroma';
  bgType: 'transparent' | 'color' | 'blur';
  bgColor: string;
  feather: number;
  blurStrength: number;
  threshold: number;
}

export interface BgRemoveResult {
  id: string;
  original_url: string;
  result_url: string;
  result_base64: string;
  original_base64: string;
  filename: string;
  filepath: string;
  width: number;
  height: number;
  filesize_human: string;
  duration_ms: number;
  engine: string;
}

export interface BgHistoryItem {
  id: string;
  filename: string;
  filepath: string;
  filesize_human: string;
  width: number;
  height: number;
  engine: string;
  created_at: string;
  result_base64: string;
}

@Injectable({
  providedIn: 'root',
})
export class BgRemoverService {
  private readonly http = inject(HttpClient);
  private readonly apiBase = 'http://127.0.0.1:8765/api';

  removeBackground(file: File, options: BgRemoveOptions): Observable<BgRemoveResult> {
    const formData = new FormData();
    formData.append('image', file);
    formData.append('mode', options.mode);
    formData.append('bgType', options.bgType);
    formData.append('bgColor', options.bgColor);
    formData.append('feather', String(options.feather));
    formData.append('blurStrength', String(options.blurStrength));
    formData.append('threshold', String(options.threshold));

    return this.http.post<BgRemoveResult>(`${this.apiBase}/bg/remove`, formData);
  }

  removeBackgroundSample(sampleName: string, options: BgRemoveOptions): Observable<BgRemoveResult> {
    return this.http.post<BgRemoveResult>(`${this.apiBase}/bg/sample`, {
      sample: sampleName,
      ...options,
    });
  }

  getHistory(): Observable<{ items: BgHistoryItem[]; output_dir: string }> {
    return this.http.get<{ items: BgHistoryItem[]; output_dir: string }>(`${this.apiBase}/bg/history`);
  }

  openFolder(filepath?: string): Observable<{ ok: boolean }> {
    return this.http.post<{ ok: boolean }>(`${this.apiBase}/bg/open-folder`, { filepath });
  }

  getPythonSource(): Observable<{ source: string; path: string }> {
    return this.http.get<{ source: string; path: string }>(`${this.apiBase}/bg/source`);
  }

  getDownloadUrl(id: string): string {
    return `${this.apiBase}/bg/file/${id}`;
  }
}
