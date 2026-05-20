import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { from, Observable, of, Subject } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

export interface GitHubRelease {
  name: string;
  tag_name: string;
  body: string;
  html_url: string;
  published_at: string;
  draft: boolean;
  prerelease: boolean;
  assets: Array<{ name: string; browser_download_url: string; size: number }>;
}

export interface UpdateEventPayload {
  status: string;
  progress?: { percent?: number };
  error?: string;
  [key: string]: any;
}

@Injectable({
  providedIn: 'root'
})
export class UpdateService {
  private ipc: any;
  public updateEvents = new Subject<UpdateEventPayload>();

  constructor(private http: HttpClient) {
    const win = window as any;
    this.ipc = win.require?.('electron')?.ipcRenderer;
    if (this.ipc) {
      this.ipc.on('update-status', (_event: any, payload: UpdateEventPayload) => {
        this.updateEvents.next(payload);
      });
    }
  }

  searchLatestRelease(repo: string): Observable<GitHubRelease | null> {
    if (!repo || !repo.includes('/')) {
      return of(null);
    }
    const url = `https://api.github.com/repos/${repo}/releases/latest`;
    return this.http.get<GitHubRelease>(url).pipe(
      catchError(() => of(null))
    );
  }

  checkForUpdates(repo: string): Observable<any> {
    if (!this.ipc || !this.ipc.invoke) {
      return of({ error: 'Actualización no disponible en el navegador.' });
    }
    return from(this.ipc.invoke('update:check', repo));
  }

  downloadUpdate(): Observable<any> {
    if (!this.ipc || !this.ipc.invoke) {
      return of({ error: 'Actualización no disponible en el navegador.' });
    }
    return from(this.ipc.invoke('update:download'));
  }

  installUpdate(): Observable<any> {
    if (!this.ipc || !this.ipc.invoke) {
      return of({ error: 'Actualización no disponible en el navegador.' });
    }
    return from(this.ipc.invoke('update:install'));
  }
}
