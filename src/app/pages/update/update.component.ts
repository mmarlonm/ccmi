import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, CloudDownload, Search, RefreshCw, DownloadCloud, ArrowUpRight, ShieldCheck, ChevronDown, ChevronUp, AlertTriangle, Info, History } from 'lucide-angular';
import { UpdateService } from '../../services/update.service';

@Component({
  selector: 'app-update',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  template: `
    <div class="space-y-8 animate-in fade-in duration-750 p-4 md:p-8">
      <!-- Header -->
      <header class="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
        <div>
          <h2 class="text-3xl font-extrabold bg-gradient-to-r from-slate-800 via-indigo-900 to-slate-800 dark:from-white dark:via-indigo-200 dark:to-white bg-clip-text text-transparent">
            Actualizaciones del Sistema
          </h2>
          <p class="text-slate-500 dark:text-slate-400 mt-1">
            Gestiona la versión de tu software y mantén la aplicación con las últimas mejoras de seguridad y rendimiento.
          </p>
        </div>
        <div class="flex items-center gap-2 text-xs font-medium text-slate-400 bg-slate-100 dark:bg-slate-800/50 px-3 py-1.5 rounded-full border border-slate-200/50 dark:border-slate-800/30 shrink-0">
          <span class="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
          Versión Actual: <span class="font-bold text-slate-700 dark:text-slate-200">v{{ currentVersion || '1.0.5' }}</span>
        </div>
      </header>

      <!-- Main Status Card -->
      <div class="grid gap-6">
        
        <!-- State A: Tu sistema está al día -->
        <div *ngIf="!updateAvailable" class="glass-card flex flex-col items-center text-center p-8 md:p-12 relative overflow-hidden">
          <div class="absolute -right-16 -top-16 w-36 h-36 bg-emerald-500/5 dark:bg-emerald-500/10 rounded-full blur-3xl"></div>
          <div class="absolute -left-16 -bottom-16 w-36 h-36 bg-indigo-500/5 dark:bg-indigo-500/10 rounded-full blur-3xl"></div>
          
          <!-- Animated Check Shield -->
          <div class="relative flex items-center justify-center w-24 h-24 rounded-full bg-emerald-500/10 dark:bg-emerald-500/20 border border-emerald-500/30 shadow-[0_0_40px_rgba(16,185,129,0.15)] mb-6 transition-transform duration-500 hover:scale-105">
            <lucide-icon [name]="ShieldCheck" size="44" class="text-emerald-500 dark:text-emerald-400 animate-pulse"></lucide-icon>
          </div>

          <h3 class="text-2xl font-bold text-slate-800 dark:text-white mb-2">
            Tu aplicación está al día
          </h3>
          <p class="text-slate-500 dark:text-slate-400 max-w-md text-sm leading-relaxed mb-6">
            Tienes instalada la última versión disponible del CMMI 5 Analyzer. El sistema está optimizado y no requiere actualizaciones pendientes.
          </p>

          <div class="flex flex-wrap items-center justify-center gap-3">
            <span class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 border border-emerald-500/20">
              Versión Instalada: v{{ currentVersion }}
            </span>
            <span *ngIf="latestRelease" class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 dark:bg-slate-800/80 dark:text-slate-350 border border-slate-200/50 dark:border-slate-700/50">
              Última revisión: {{ latestRelease.tag_name }}
            </span>
          </div>

          <div class="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800/50 w-full max-w-sm flex justify-center">
            <button (click)="checkForUpdates()" [disabled]="isUpdateChecking" 
                    class="glass-button flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-5 py-2.5 rounded-xl shadow-lg shadow-indigo-500/20 transition-all hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 select-none cursor-pointer">
              <lucide-icon [name]="RefreshCw" size="16" [class.animate-spin]="isUpdateChecking"></lucide-icon>
              {{ isUpdateChecking ? 'Buscando actualizaciones...' : 'Comprobar actualizaciones' }}
            </button>
          </div>
        </div>

        <!-- State B: Actualización Disponible -->
        <div *ngIf="updateAvailable" class="glass-card p-6 md:p-8 relative overflow-hidden bg-gradient-to-br from-indigo-500/5 to-purple-500/5 dark:from-indigo-950/20 dark:to-purple-950/20 border-l-4 border-indigo-500">
          <div class="absolute -right-20 -top-20 w-48 h-48 bg-indigo-500/10 dark:bg-indigo-500/20 rounded-full blur-3xl"></div>
          
          <div class="flex flex-col lg:flex-row lg:items-start justify-between gap-6 mb-6">
            <div class="space-y-2">
              <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase bg-indigo-500 text-white animate-pulse">
                Nueva versión
              </span>
              <h3 class="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tight">
                ¡Actualización Disponible!
              </h3>
              <p class="text-sm text-slate-500 dark:text-slate-400">
                Se ha detectado una nueva versión del software en GitHub con mejoras y correcciones.
              </p>
            </div>
            
            <div class="flex items-center gap-4 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md px-4 py-3 rounded-2xl border border-slate-200/50 dark:border-slate-800/80 shrink-0">
              <div class="text-center">
                <span class="block text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500">Versión actual</span>
                <span class="text-sm font-bold text-slate-600 dark:text-slate-300">v{{ currentVersion }}</span>
              </div>
              <lucide-icon [name]="ArrowUpRight" size="18" class="text-indigo-500"></lucide-icon>
              <div class="text-center">
                <span class="block text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500">Nueva versión</span>
                <span class="text-sm font-bold text-indigo-600 dark:text-indigo-400 font-extrabold">v{{ latestRelease?.tag_name || '1.0.0' }}</span>
              </div>
            </div>
          </div>

          <div class="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
            <!-- Left side: release notes & status -->
            <div class="space-y-4">
              <div class="bg-slate-950/5 dark:bg-slate-950/30 p-5 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 shadow-inner">
                <!-- Release Notes Header -->
                <div class="flex items-center gap-2 mb-3 text-slate-700 dark:text-slate-300 border-b border-slate-200/50 dark:border-slate-800/50 pb-2">
                  <lucide-icon [name]="History" size="16" class="text-indigo-500"></lucide-icon>
                  <span class="font-bold text-xs uppercase tracking-wider">Notas de la versión</span>
                </div>
                
                <!-- Release Notes Content -->
                <div class="max-h-48 overflow-y-auto pr-2 scrollbar-thin text-xs text-slate-650 dark:text-slate-300 leading-relaxed font-sans space-y-2">
                  <div class="font-bold text-sm text-slate-800 dark:text-white">
                    {{ latestRelease?.name || latestRelease?.tag_name }}
                  </div>
                  <div class="text-[10px] text-slate-400 mb-2">
                    Publicado: {{ latestRelease?.published_at | date:'dd MMM yyyy, HH:mm' }}
                  </div>
                  <p class="whitespace-pre-line leading-relaxed text-slate-600 dark:text-slate-300">
                    {{ latestRelease?.body || 'Sin descripción detallada del release.' }}
                  </p>
                </div>
              </div>

              <!-- Status Message -->
              <div class="flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-100/80 dark:bg-slate-900/60 border border-slate-200/50 dark:border-slate-800/40 text-xs text-slate-650 dark:text-slate-300">
                <lucide-icon [name]="Info" size="16" class="text-indigo-500 shrink-0"></lucide-icon>
                <div class="flex-1 flex justify-between items-center">
                  <span>{{ updateStatusMessage }}</span>
                  <span *ngIf="isUpdateDownloading || updateDownloaded" class="font-bold text-indigo-600 dark:text-indigo-400">
                    {{ updateProgress }}%
                  </span>
                </div>
              </div>

              <!-- Download progress bar -->
              <div *ngIf="isUpdateDownloading || updateDownloaded" class="space-y-1.5 animate-in fade-in duration-300">
                <div class="w-full bg-slate-200 dark:bg-slate-800 h-3 rounded-full overflow-hidden shadow-inner p-0.5 border border-slate-300/20 dark:border-slate-800/40">
                  <div class="bg-gradient-to-r from-indigo-500 to-purple-600 h-full rounded-full transition-all duration-300 shadow-[0_0_8px_rgba(99,102,241,0.5)]" 
                       [style.width.%]="updateProgress"></div>
                </div>
              </div>
            </div>

            <!-- Right side: action buttons -->
            <div class="flex flex-col justify-between gap-4">
              <div class="space-y-3">
                <!-- Action Button 1: Download -->
                <button (click)="downloadUpdate()" 
                        [disabled]="!canAutoUpdate || isUpdateDownloading || updateDownloaded || !latestRelease" 
                        class="glass-button w-full flex items-center justify-center gap-2.5 py-4 text-white font-bold transition-all duration-300 select-none group relative overflow-hidden cursor-pointer"
                        [ngClass]="(canAutoUpdate && latestRelease && !isUpdateDownloading && !updateDownloaded) 
                          ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 shadow-lg shadow-indigo-600/30 hover:scale-[1.02] active:scale-[0.98]' 
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed border border-slate-200 dark:border-slate-800/80'">
                  <lucide-icon [name]="DownloadCloud" size="18" [class.animate-spin]="isUpdateDownloading"></lucide-icon>
                  <span>
                    {{ isUpdateDownloading ? 'Descargando (' + updateProgress + '%)' : (updateDownloaded ? 'Descarga Completa' : 'Descargar Actualización') }}
                  </span>
                </button>

                <!-- Action Button 2: Install / Actualizar Ahora -->
                <button (click)="installUpdate()" 
                        [disabled]="!canAutoUpdate || !updateDownloaded" 
                        class="w-full flex items-center justify-center gap-2.5 py-4 rounded-xl text-white font-bold transition-all duration-300 select-none relative overflow-hidden animate-pulse"
                        [ngClass]="(canAutoUpdate && updateDownloaded) 
                          ? 'bg-gradient-to-r from-emerald-500 to-teal-650 hover:from-emerald-450 hover:to-teal-550 shadow-lg shadow-emerald-500/30 hover:scale-[1.02] active:scale-[0.98] ring-4 ring-emerald-500/20 cursor-pointer font-black' 
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed border border-slate-200 dark:border-slate-800/80'">
                  <lucide-icon [name]="ArrowUpRight" size="18" class="animate-bounce"></lucide-icon>
                  Actualizar Ahora
                </button>
              </div>

              <!-- Information Card -->
              <div class="rounded-2xl border border-slate-200/50 dark:border-slate-800/50 p-4 bg-white/40 dark:bg-slate-900/40 text-xs text-slate-500 dark:text-slate-400 leading-relaxed shadow-sm">
                <p class="font-bold mb-1.5 flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400">
                  <span class="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></span>
                  Actualización Automática
                </p>
                <p>
                  El sistema descargará el nuevo paquete instalador y aplicará los cambios automáticamente. Si tienes problemas, puedes utilizar las opciones de reinstalación manual de la sección avanzada.
                </p>
              </div>
            </div>
          </div>
        </div>

      </div>

      <!-- Advanced Section Accordion -->
      <div class="border border-slate-200/50 dark:border-slate-800/80 rounded-2xl overflow-hidden glass-panel">
        <button (click)="showAdvanced = !showAdvanced" 
                class="w-full flex items-center justify-between py-4 px-6 bg-slate-50/50 dark:bg-slate-900/30 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-all text-slate-700 dark:text-slate-350 cursor-pointer font-bold text-sm select-none">
          <span class="flex items-center gap-2">
            <lucide-icon [name]="Search" size="16" class="text-slate-400"></lucide-icon>
            Opciones avanzadas y reinstalación manual
          </span>
          <lucide-icon [name]="showAdvanced ? ChevronUp : ChevronDown" size="16" class="text-slate-400"></lucide-icon>
        </button>

        <div *ngIf="showAdvanced" class="p-6 border-t border-slate-200/50 dark:border-slate-800/50 space-y-6 bg-white/20 dark:bg-slate-900/10 animate-in slide-in-from-top-4 duration-300">
          
          <!-- Alert box -->
          <div class="flex gap-3 p-4 rounded-xl bg-amber-500/10 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300 border border-amber-500/25 text-xs leading-relaxed">
            <lucide-icon [name]="AlertTriangle" size="18" class="text-amber-500 shrink-0"></lucide-icon>
            <div>
              <span class="font-bold block mb-0.5">Uso avanzado</span>
              Estas herramientas te permiten descargar versiones manualmente saltándote la verificación automática o especificar un repositorio de GitHub alternativo para pruebas. Úsalo con precaución.
            </div>
          </div>

          <div class="grid gap-6 md:grid-cols-2">
            <!-- Repo & check -->
            <div class="space-y-4">
              <div>
                <label class="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Repositorio de GitHub</label>
                <div class="flex gap-2">
                  <input [(ngModel)]="updateRepo" placeholder="owner/repo" class="glass-input w-full text-xs py-2 h-10 bg-white/50" />
                  <button (click)="searchLatestRelease()" [disabled]="!updateRepo"
                          class="glass-button flex items-center justify-center gap-1.5 bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white text-xs px-4 h-10 select-none cursor-pointer">
                    <lucide-icon [name]="Search" size="14"></lucide-icon>
                    Buscar
                  </button>
                </div>
              </div>

              <div class="bg-slate-50/50 dark:bg-slate-900/60 p-4 rounded-xl border border-slate-200/50 dark:border-slate-800/50 space-y-2 text-xs">
                <div class="flex justify-between"><span class="text-slate-400">Soporte Electron:</span> <span class="font-semibold text-slate-700 dark:text-slate-300">{{ canAutoUpdate ? 'Sí (Aplicación)' : 'No (Navegador)' }}</span></div>
                <div class="flex justify-between"><span class="text-slate-400">Updater de Electron:</span> <span class="font-semibold text-slate-700 dark:text-slate-300">{{ isElectronUpdaterSupported ? 'Soportado' : 'No soportado' }}</span></div>
                <div class="flex justify-between"><span class="text-slate-400">Repositorio actual:</span> <span class="font-semibold text-slate-700 dark:text-slate-300">{{ updateRepo }}</span></div>
              </div>
            </div>

            <!-- Manual downloads & diagnostics -->
            <div class="space-y-4">
              <div>
                <label class="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Descarga Directa (.exe)</label>
                <button (click)="downloadUpdate()" 
                        [disabled]="isUpdateDownloading || updateDownloaded || !latestRelease" 
                        class="glass-button w-full flex items-center justify-center gap-2 text-xs py-3 bg-indigo-600/90 text-white cursor-pointer select-none">
                  <lucide-icon [name]="DownloadCloud" size="14"></lucide-icon>
                  Descargar última versión manual
                </button>
              </div>

              <div>
                <label class="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Instalación Forzada</label>
                <button (click)="installUpdate()" 
                        [disabled]="!updateDownloaded" 
                        class="w-full flex items-center justify-center gap-2 text-xs py-3 rounded-xl text-white font-bold bg-emerald-600 hover:bg-emerald-500 cursor-pointer select-none transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                  <lucide-icon [name]="ArrowUpRight" size="14"></lucide-icon>
                  Forzar Instalación del Paquete
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class UpdateComponent implements OnInit {
  readonly CloudDownload = CloudDownload;
  readonly Search = Search;
  readonly RefreshCw = RefreshCw;
  readonly DownloadCloud = DownloadCloud;
  readonly ArrowUpRight = ArrowUpRight;
  readonly ShieldCheck = ShieldCheck;
  readonly ChevronDown = ChevronDown;
  readonly ChevronUp = ChevronUp;
  readonly AlertTriangle = AlertTriangle;
  readonly Info = Info;
  readonly History = History;

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
  currentVersion = '';
  isElectronUpdaterSupported = false;
  showAdvanced = false;

  constructor() {
    this.subscribeToUpdateEvents();
  }

  ngOnInit() {
    this.updateService.getUpdateSupport().subscribe(result => {
      this.canAutoUpdate = !!(window as any).require?.('electron');
      this.currentVersion = result.version || '1.0.5';
      this.isElectronUpdaterSupported = result.supported && result.isPackaged;
      
      if (!this.canAutoUpdate) {
        this.updateStatusMessage = 'Actualización no disponible en el navegador web.';
      } else {
        this.updateStatusMessage = 'Listo para buscar actualizaciones.';
      }

      // Restaurar estado de descargas o actualizaciones en curso desde el servicio compartido
      if (this.updateService.latestReleaseData) {
        this.latestRelease = this.updateService.latestReleaseData;
        this.updateAvailable = this.updateService.isUpdateAvailable;
        
        if (this.updateService.isDownloaded) {
          this.updateDownloaded = true;
          this.isUpdateDownloading = false;
          this.updateProgress = 100;
          this.updateStatusMessage = 'Descargado, listo para instalar';
        } else if (this.updateService.isDownloading) {
          this.isUpdateDownloading = true;
          this.updateProgress = this.updateService.downloadPercent;
          this.updateStatusMessage = `descargando: ${this.updateProgress}%`;
        } else {
          const isNewer = this.updateService.isVersionNewer(this.currentVersion, this.latestRelease.tag_name);
          if (isNewer) {
            this.updateAvailable = true;
            this.updateStatusMessage = `Nueva versión disponible: ${this.latestRelease.tag_name}`;
          } else {
            this.updateAvailable = false;
            this.updateStatusMessage = `Tienes la versión más reciente instalada (${this.latestRelease.tag_name})`;
          }
        }
      } else {
        this.checkForUpdates();
      }
    });
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
        this.updateProgress = 100;
      }
      if (event.status === 'update-available') {
        this.updateAvailable = true;
        this.latestRelease = event.release || this.updateService.latestReleaseData;
        this.updateStatusMessage = `Último release: ${this.latestRelease?.tag_name || 'disponible'}`;
      }
      if (event.status === 'update-not-available') {
        if (!this.updateService.isUpdateAvailable) {
          this.updateAvailable = false;
          this.updateStatusMessage = 'No hay actualizaciones disponibles';
        }
      }
      if (event.status === 'error') {
        this.updateStatusMessage = `Error: ${event.error || 'No se pudo descargar'}`;
        this.isUpdateChecking = false;
        this.isUpdateDownloading = false;
      }
    });
  }

  getWindowsAssetUrl(): string | null {
    if (!this.latestRelease || !this.latestRelease.assets) return null;
    const exeAsset = this.latestRelease.assets.find((asset: any) => asset.name.toLowerCase().endsWith('.exe'));
    return exeAsset ? exeAsset.browser_download_url : null;
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
      
      const isNewer = this.updateService.isVersionNewer(this.currentVersion, release.tag_name);
      
      if (isNewer) {
        this.updateAvailable = true;
        this.updateService.isUpdateAvailable = true;
        this.updateStatusMessage = `Nueva versión disponible: ${release.tag_name}`;
      } else {
        this.updateAvailable = false;
        this.updateService.isUpdateAvailable = false;
        this.updateStatusMessage = `Tienes la versión más reciente instalada (${release.tag_name})`;
      }
    });
  }

  checkForUpdates() {
    this.isUpdateChecking = true;
    this.updateStatusMessage = 'Buscando actualizaciones...';
    
    this.updateService.searchLatestRelease(this.updateRepo).subscribe(release => {
      this.isUpdateChecking = false;
      if (!release) {
        this.updateStatusMessage = 'No se pudo obtener información de actualizaciones.';
        return;
      }
      
      this.latestRelease = release;
      const isNewer = this.updateService.isVersionNewer(this.currentVersion, release.tag_name);
      
      if (isNewer) {
        this.updateAvailable = true;
        this.updateService.isUpdateAvailable = true;
        this.updateStatusMessage = `Nueva versión disponible: ${release.tag_name}`;
      } else {
        this.updateAvailable = false;
        this.updateService.isUpdateAvailable = false;
        this.updateStatusMessage = `Tienes la versión más reciente instalada (${release.tag_name})`;
      }
    });
  }

  downloadUpdate() {
    if (!this.canAutoUpdate) {
      this.updateStatusMessage = 'Actualización solo disponible en la aplicación instalada.';
      return;
    }
    this.isUpdateDownloading = true;
    this.updateProgress = 0;
    this.updateDownloaded = false;
    
    const winAssetUrl = this.getWindowsAssetUrl();
    if (winAssetUrl) {
      this.updateStatusMessage = 'Iniciando descarga directa del instalador...';
      this.updateService.downloadUpdate(winAssetUrl).subscribe(result => {
        if (result?.error) {
          this.updateStatusMessage = `Error: ${result.error}`;
          this.isUpdateDownloading = false;
        } else {
          this.updateStatusMessage = 'Descargando instalación directamente...';
        }
      });
    } else {
      this.updateStatusMessage = 'Iniciando descarga vía autoUpdater...';
      this.updateService.downloadUpdate().subscribe(result => {
        if (result?.error) {
          this.updateStatusMessage = `Error: ${result.error}`;
          this.isUpdateDownloading = false;
        } else {
          this.updateStatusMessage = 'Descargando actualización...';
        }
      });
    }
  }

  installUpdate() {
    if (!this.canAutoUpdate) {
      this.updateStatusMessage = 'Actualización solo disponible en la aplicación instalada.';
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
