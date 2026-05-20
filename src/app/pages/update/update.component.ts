import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, CloudDownload, Search, RefreshCw, DownloadCloud, ArrowUpRight } from 'lucide-angular';
import { UpdateService } from '../../services/update.service';

@Component({
  selector: 'app-update',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  template: `
    <div class="space-y-8 animate-in fade-in duration-1000 p-4 md:p-8">
      <header class="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
        <div>
          <h2 class="text-3xl font-bold text-slate-800 dark:text-white">Actualización de Aplicación</h2>
          <p class="text-slate-500 dark:text-slate-400 mt-1">Busca un release en GitHub, descarga el paquete y aplica la instalación.</p>
        </div>
      </header>

      <section class="glass-card !bg-white dark:!bg-slate-900 border-l-4 border-emerald-500 overflow-hidden shadow-lg p-6">
        <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-4">
          <div class="flex items-center gap-3">
            <div class="p-2 bg-slate-900 text-white rounded-xl shadow-sm">
              <lucide-icon [name]="CloudDownload" size="20"></lucide-icon>
            </div>
            <div>
              <h3 class="text-lg font-black text-slate-800 dark:text-white uppercase tracking-tight">Actualización de Aplicación</h3>
              <p class="text-xs text-slate-400 dark:text-slate-400">Busca el release en GitHub, descarga la actualización y aplica el paquete instalado.</p>
            </div>
          </div>
          <button (click)="searchLatestRelease()" class="glass-button flex items-center gap-2 bg-slate-900 text-white px-4 py-2">
            <lucide-icon [name]="Search" size="16"></lucide-icon>
            Buscar release
          </button>
        </div>

        <div class="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
          <div class="space-y-4">
            <div class="grid gap-3 sm:grid-cols-2">
              <input [(ngModel)]="updateRepo" placeholder="owner/repo" class="glass-input w-full" />
              <button (click)="checkForUpdates()" [disabled]="!updateRepo || isUpdateChecking" class="glass-button w-full bg-emerald-600 text-white flex items-center justify-center gap-2">
                <lucide-icon [name]="RefreshCw" size="16"></lucide-icon>
                {{ isUpdateChecking ? 'Buscando...' : 'Buscar manual' }}
              </button>
            </div>

            <div class="bg-slate-50 dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
              <div class="flex justify-between items-start gap-3">
                <div>
                  <div class="text-[10px] uppercase font-bold text-slate-500">Estado</div>
                  <div class="text-base font-semibold text-slate-800 dark:text-white">{{ updateStatusMessage }}</div>
                </div>
                <div class="text-xs text-slate-400">{{ updateProgress }}%</div>
              </div>
              <div *ngIf="latestRelease" class="mt-3 text-sm text-slate-600 dark:text-slate-300">
                <div><strong>{{ latestRelease.name || latestRelease.tag_name }}</strong></div>
                <div class="text-[11px] text-slate-500">Publicado: {{ latestRelease.published_at | date:'dd MMM yyyy' }}</div>
                <div class="mt-2 text-[12px] leading-5 line-clamp-4">{{ latestRelease.body || 'Sin descripción del release.' }}</div>
              </div>
              <div *ngIf="!latestRelease" class="mt-3 text-[12px] text-slate-500">Introduce un repositorio y busca un release.</div>
            </div>
          </div>

          <div class="space-y-4">
            <button (click)="downloadUpdate()" [disabled]="!canAutoUpdate || isUpdateDownloading || updateDownloaded" class="glass-button w-full bg-blue-600 text-white flex items-center justify-center gap-2 py-3">
              <lucide-icon [name]="DownloadCloud" size="16"></lucide-icon>
              Descargar actualización
            </button>
            <button (click)="installUpdate()" [disabled]="!canAutoUpdate || !updateDownloaded" class="glass-button w-full bg-emerald-600 text-white flex items-center justify-center gap-2 py-3">
              <lucide-icon [name]="ArrowUpRight" size="16"></lucide-icon>
              Instalar actualización
            </button>
            <div class="rounded-2xl border border-slate-200 dark:border-slate-800 p-4 bg-slate-50 dark:bg-slate-900 text-sm text-slate-600 dark:text-slate-300">
              <p class="font-semibold mb-2">Nota</p>
              <p>Esta función busca un release en GitHub y descarga la actualización al paquete instalado. Solo funciona cuando la app está empaquetada e instalada.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  `
})
export class UpdateComponent {
  readonly CloudDownload = CloudDownload;
  readonly Search = Search;
  readonly RefreshCw = RefreshCw;
  readonly DownloadCloud = DownloadCloud;
  readonly ArrowUpRight = ArrowUpRight;

  private updateService = inject(UpdateService);

  updateRepo = 'mmarlonm/ccmi';
  latestRelease: any = null;
  updateStatusMessage = 'Sin revisar';
  updateProgress = 0;
  updateAvailable = false;
  updateDownloaded = false;
  isUpdateChecking = false;
  isUpdateDownloading = false;
  canAutoUpdate = !!(window as any).require?.('electron');

  constructor() {
    this.subscribeToUpdateEvents();
  }

  subscribeToUpdateEvents() {
    this.updateService.updateEvents.subscribe(event => {
      this.updateStatusMessage = event.status.replace(/-/g, ' ');
      if (event.status === 'download-progress' && event.progress) {
        this.updateProgress = Math.round(event.progress.percent || 0);
        this.isUpdateDownloading = true;
      }
      if (event.status === 'update-downloaded') {
        this.updateDownloaded = true;
        this.isUpdateDownloading = false;
        this.updateStatusMessage = 'Descargado, listo para instalar';
      }
      if (event.status === 'update-available') {
        this.updateAvailable = true;
        this.updateStatusMessage = 'Actualización disponible';
      }
      if (event.status === 'update-not-available') {
        this.updateAvailable = false;
        this.updateStatusMessage = 'No hay actualizaciones disponibles';
      }
      if (event.status === 'error') {
        this.updateStatusMessage = `Error: ${event.error || 'No se pudo actualizar'}`;
        this.isUpdateChecking = false;
        this.isUpdateDownloading = false;
      }
    });
  }

  searchLatestRelease() {
    if (!this.updateRepo || !this.updateRepo.includes('/')) {
      this.updateStatusMessage = 'Ingresa un repositorio válido owner/repo.';
      return;
    }
    this.updateStatusMessage = 'Buscando release...';
    this.updateService.searchLatestRelease(this.updateRepo).subscribe(release => {
      if (!release) {
        this.latestRelease = null;
        this.updateStatusMessage = 'No se encontró ningún release.';
        return;
      }
      this.latestRelease = release;
      this.updateStatusMessage = `Último release: ${release.tag_name}`;
    });
  }

  checkForUpdates() {
    if (!this.canAutoUpdate) {
      this.updateStatusMessage = 'Actualización solo disponible en app instalada.';
      return;
    }
    this.isUpdateChecking = true;
    this.updateService.checkForUpdates(this.updateRepo).subscribe(result => {
      if (result?.error) {
        this.updateStatusMessage = `Error: ${result.error}`;
      } else {
        this.updateStatusMessage = 'Buscando actualizaciones...';
      }
      this.isUpdateChecking = false;
    });
  }

  downloadUpdate() {
    if (!this.canAutoUpdate) {
      this.updateStatusMessage = 'Actualización solo disponible en app instalada.';
      return;
    }
    this.isUpdateDownloading = true;
    this.updateService.downloadUpdate().subscribe(result => {
      if (result?.error) {
        this.updateStatusMessage = `Error: ${result.error}`;
        this.isUpdateDownloading = false;
      } else {
        this.updateStatusMessage = 'Descargando actualización...';
      }
    });
  }

  installUpdate() {
    if (!this.canAutoUpdate) {
      this.updateStatusMessage = 'Actualización solo disponible en app instalada.';
      return;
    }
    this.updateService.installUpdate().subscribe(result => {
      if (result?.error) {
        this.updateStatusMessage = `Error: ${result.error}`;
      } else {
        this.updateStatusMessage = 'Instalando actualización...';
      }
    });
  }
}
