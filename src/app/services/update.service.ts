import { Injectable, NgZone } from '@angular/core';
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
  release?: any;
  [key: string]: any;
}

@Injectable({
  providedIn: 'root'
})
export class UpdateService {
  private ipc: any;
  public updateEvents = new Subject<UpdateEventPayload>();

  public isUpdateAvailable = false;
  public latestReleaseData: any = null;
  public downloadPercent = 0;
  public isDownloading = false;
  public isDownloaded = false;
  public lastEvent: UpdateEventPayload | null = null;

  private updateRepo = 'mmarlonm/ccmi';
  private checkInterval: any;

  constructor(private http: HttpClient, private ngZone: NgZone) {
    const win = window as any;
    this.ipc = win.require?.('electron')?.ipcRenderer;
    if (this.ipc) {
      this.ipc.on('update-status', (_event: any, payload: UpdateEventPayload) => {
        this.ngZone.run(() => {
          this.handleUpdateEvent(payload);
        });
      });
    }
    this.startAutoCheck();
  }

  private handleUpdateEvent(payload: UpdateEventPayload) {
    this.lastEvent = payload;
    if (payload.status === 'downloading') {
      this.isDownloading = true;
      this.isDownloaded = false;
      this.downloadPercent = 0;
    } else if (payload.status === 'download-progress' && payload.progress) {
      this.downloadPercent = Math.round(payload.progress.percent || 0);
      this.isDownloading = true;
    } else if (payload.status === 'update-downloaded') {
      this.isDownloaded = true;
      this.isDownloading = false;
      this.downloadPercent = 100;
    } else if (payload.status === 'error') {
      this.isDownloading = false;
    } else if (payload.status === 'update-available') {
      this.isUpdateAvailable = true;
    } else if (payload.status === 'update-not-available') {
      if (!this.isUpdateAvailable) {
        this.isUpdateAvailable = false;
      } else {
        return;
      }
    }
    this.updateEvents.next(payload);
  }

  startAutoCheck() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }
    
    // Check silently after startup
    setTimeout(() => {
      this.performSilentCheck();
    }, 3000);

    // Check every 10 minutes
    this.checkInterval = setInterval(() => {
      this.performSilentCheck();
    }, 10 * 60 * 1000);
  }

  extractVersionNumbers(version: string): string {
    if (!version) return '';
    const match = version.toString().match(/(\d+(?:\.\d+)*)/);
    return match ? match[1] : version.toString().trim();
  }

  isVersionNewer(local: string, remote: string): boolean {
    const cleanLocal = this.extractVersionNumbers(local);
    const cleanRemote = this.extractVersionNumbers(remote);
    
    if (cleanLocal === cleanRemote) return false;
    
    const localParts = cleanLocal.split('.').map(Number);
    const remoteParts = cleanRemote.split('.').map(Number);
    
    const maxLength = Math.max(localParts.length, remoteParts.length);
    for (let i = 0; i < maxLength; i++) {
      const localVal = localParts[i] || 0;
      const remoteVal = remoteParts[i] || 0;
      
      if (remoteVal > localVal) return true;
      if (remoteVal < localVal) return false;
    }
    return false;
  }

  performSilentCheck() {
    this.getUpdateSupport().subscribe(support => {
      const currentVersion = support.version || '1.0.5';
      this.searchLatestRelease(this.updateRepo).subscribe(release => {
        if (release) {
          this.latestReleaseData = release;
          const remoteVersion = release.tag_name;
          
          if (this.isVersionNewer(currentVersion, remoteVersion)) {
            this.isUpdateAvailable = true;
            this.updateEvents.next({ status: 'update-available', release });
          } else {
            this.isUpdateAvailable = false;
            this.updateEvents.next({ status: 'update-not-available', release });
          }
        }
      });
    });
  }

  searchLatestRelease(repo: string): Observable<GitHubRelease | null> {
    if (!repo || !repo.includes('/')) {
      return of(null);
    }
    const url = `https://api.github.com/repos/${repo}/releases/latest`;
    return this.http.get<GitHubRelease>(url).pipe(
      map(release => {
        if (release) {
          this.latestReleaseData = release;
        }
        return release;
      }),
      catchError(() => of(null))
    );
  }

  checkForUpdates(repo: string): Observable<any> {
    if (!this.ipc || !this.ipc.invoke) {
      return of({ error: 'Actualización no disponible en el navegador.' });
    }
    return from(this.ipc.invoke('update:check', repo));
  }

  downloadUpdate(url?: string): Observable<any> {
    if (!this.ipc || !this.ipc.invoke) {
      return of({ error: 'Actualización no disponible en el navegador.' });
    }
    return from(this.ipc.invoke('update:download', url));
  }

  installUpdate(): Observable<any> {
    if (!this.ipc || !this.ipc.invoke) {
      return of({ error: 'Actualización no disponible en el navegador.' });
    }
    return from(this.ipc.invoke('update:install'));
  }

  getUpdateSupport(): Observable<{supported: boolean, isPackaged: boolean, version?: string, error?: string}> {
    if (!this.ipc || !this.ipc.invoke) {
      return of({ supported: false, isPackaged: false, error: 'Actualización no disponible en el navegador.' });
    }
    return from(this.ipc.invoke('update:support')) as Observable<{supported: boolean, isPackaged: boolean, version?: string, error?: string}>;
  }
}
