import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { LucideAngularModule, LayoutDashboard, Settings, FileText, Moon, Sun, ChevronLeft, ChevronRight, ClipboardList, DownloadCloud } from 'lucide-angular';
import { UpdateService } from '../../services/update.service';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, LucideAngularModule],
  template: `
<div class="flex flex-col md:flex-row h-screen w-screen overflow-hidden bg-slate-50 dark:bg-slate-900 transition-colors duration-300 pb-16 md:pb-0">
  
  <!-- Mobile Header -->
  <header class="flex md:hidden items-center justify-between px-6 py-4 glass-panel border-b border-white/10 m-2 rounded-2xl shrink-0">
    <div>
      <h1 class="text-base font-bold bg-gradient-to-r from-indigo-500 to-purple-600 bg-clip-text text-transparent">
        CMMI 5 Analyzer
      </h1>
      <p class="text-[8px] text-slate-400 font-medium tracking-widest uppercase">Metrics & AI</p>
    </div>
    <button (click)="toggleDarkMode()" class="p-2 rounded-xl bg-slate-200/50 dark:bg-slate-800/50 cursor-pointer active:scale-95 transition-all">
      <lucide-icon [name]="isDarkMode ? Sun : Moon" size="18"></lucide-icon>
    </button>
  </header>

  <!-- Sidebar (Desktop only) -->
  <aside 
    class="hidden md:flex glass-panel border-r border-white/20 dark:border-slate-800 m-4 rounded-3xl flex-col shrink-0 transition-all duration-300 ease-in-out relative"
    [ngClass]="isMenuCollapsed ? 'w-20' : 'w-64'">
    
    <!-- Collapse / Expand Toggle Handle -->
    <button 
      (click)="toggleMenu()"
      class="absolute -right-3 top-7 w-6 h-6 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center cursor-pointer shadow-lg shadow-indigo-600/30 hover:scale-110 active:scale-95 transition-all z-50 border border-indigo-500">
      <lucide-icon [name]="isMenuCollapsed ? ChevronRight : ChevronLeft" size="14"></lucide-icon>
    </button>

    <div class="p-6 flex items-center justify-between relative overflow-hidden h-20 shrink-0">
      <div *ngIf="!isMenuCollapsed" class="animate-in fade-in slide-in-from-left-4 duration-300">
        <h1 class="text-xl font-bold bg-gradient-to-r from-indigo-500 to-purple-600 bg-clip-text text-transparent whitespace-nowrap">
          CMMI 5 Analyzer
        </h1>
        <p class="text-xs text-slate-400 font-medium tracking-widest mt-1 uppercase whitespace-nowrap">Metrics & AI</p>
      </div>
      <div *ngIf="isMenuCollapsed" class="mx-auto animate-in fade-in zoom-in-75 duration-350 shrink-0">
        <div class="w-8 h-8 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 flex items-center justify-center text-white font-black text-xs shadow-md shadow-indigo-500/20">
          C5
        </div>
      </div>
    </div>

    <nav class="flex-1 px-3 space-y-2 overflow-y-auto">
      <a 
        routerLink="/dashboard" 
        routerLinkActive="!bg-indigo-500/10 !text-indigo-500" 
        class="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-200/50 dark:hover:bg-slate-800/50 transition-all text-slate-600 dark:text-slate-300"
        [class.justify-center]="isMenuCollapsed"
        [title]="isMenuCollapsed ? 'Dashboard' : ''">
        <lucide-icon [name]="LayoutDashboard" size="20" class="shrink-0"></lucide-icon>
        <span *ngIf="!isMenuCollapsed" class="font-medium animate-in fade-in duration-300 whitespace-nowrap">Dashboard</span>
      </a>
      <a 
        routerLink="/report-completion" 
        routerLinkActive="!bg-indigo-500/10 !text-indigo-500" 
        class="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-200/50 dark:hover:bg-slate-800/50 transition-all text-slate-600 dark:text-slate-300"
        [class.justify-center]="isMenuCollapsed"
        [title]="isMenuCollapsed ? 'Reporte Finalización' : ''">
        <lucide-icon [name]="FileText" size="20" class="shrink-0"></lucide-icon>
        <span *ngIf="!isMenuCollapsed" class="font-medium animate-in fade-in duration-300 whitespace-nowrap">Reporte Finalización</span>
      </a>
      <a 
        routerLink="/sprint-config" 
        routerLinkActive="!bg-indigo-500/10 !text-indigo-500" 
        class="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-200/50 dark:hover:bg-slate-800/50 transition-all text-slate-600 dark:text-slate-300"
        [class.justify-center]="isMenuCollapsed"
        [title]="isMenuCollapsed ? 'Configurar Sprint' : ''">
        <lucide-icon [name]="ClipboardList" size="20" class="shrink-0"></lucide-icon>
        <span *ngIf="!isMenuCollapsed" class="font-medium animate-in fade-in duration-300 whitespace-nowrap">Configurar Sprint</span>
      </a>
      <a 
        routerLink="/update" 
        routerLinkActive="!bg-indigo-500/10 !text-indigo-500" 
        class="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-200/50 dark:hover:bg-slate-800/50 transition-all text-slate-600 dark:text-slate-300 relative"
        [class.justify-center]="isMenuCollapsed"
        [title]="isMenuCollapsed ? 'Actualización' : ''">
        <div class="relative shrink-0 flex items-center justify-center">
          <lucide-icon [name]="DownloadCloud" size="20"></lucide-icon>
          <span *ngIf="hasUpdate && isMenuCollapsed" class="absolute -top-1.5 -right-2.5 flex h-3.5 px-1 items-center justify-center rounded-full bg-indigo-600 text-[7px] font-black text-white shadow-sm animate-pulse uppercase tracking-tight z-10 leading-none">
            Update
          </span>
        </div>
        <span *ngIf="!isMenuCollapsed" class="font-medium animate-in fade-in duration-300 whitespace-nowrap flex items-center gap-2">
          Actualización
          <span *ngIf="hasUpdate" class="text-[9px] font-bold bg-indigo-500 text-white px-1.5 py-0.5 rounded-full uppercase tracking-wider animate-pulse">
            Update
          </span>
        </span>
      </a>
      <a 
        routerLink="/config" 
        routerLinkActive="!bg-indigo-500/10 !text-indigo-500" 
        class="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-200/50 dark:hover:bg-slate-800/50 transition-all text-slate-600 dark:text-slate-300"
        [class.justify-center]="isMenuCollapsed"
        [title]="isMenuCollapsed ? 'Configuración' : ''">
        <lucide-icon [name]="Settings" size="20" class="shrink-0"></lucide-icon>
        <span *ngIf="!isMenuCollapsed" class="font-medium animate-in fade-in duration-300 whitespace-nowrap">Configuración</span>
      </a>
    </nav>

    <div class="p-4 border-t border-white/10 shrink-0">
      <button (click)="toggleDarkMode()" class="w-full flex items-center justify-between px-4 py-2 rounded-xl bg-slate-200/50 dark:bg-slate-800/50 transition-all cursor-pointer" [class.justify-center]="isMenuCollapsed">
        <span *ngIf="!isMenuCollapsed" class="text-sm font-medium animate-in fade-in duration-300 whitespace-nowrap">{{ isDarkMode ? 'Light' : 'Dark' }} Mode</span>
        <lucide-icon [name]="isDarkMode ? Sun : Moon" size="18" class="shrink-0"></lucide-icon>
      </button>
    </div>
  </aside>

  <!-- Main Content -->
  <main class="flex-1 overflow-y-auto p-4 md:p-8 relative">
    <router-outlet></router-outlet>
  </main>

  <!-- Mobile Bottom Navigation -->
  <nav class="flex md:hidden items-center justify-around py-3 bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg border-t border-slate-200/50 dark:border-slate-800/50 fixed bottom-0 left-0 right-0 z-50 shadow-lg shrink-0">
    <a routerLink="/dashboard" routerLinkActive="!text-indigo-500 font-bold" class="flex flex-col items-center justify-center gap-1 text-[10px] text-slate-500">
      <lucide-icon [name]="LayoutDashboard" size="20"></lucide-icon>
      <span>Dashboard</span>
    </a>
    <a routerLink="/report-completion" routerLinkActive="!text-indigo-500 font-bold" class="flex flex-col items-center justify-center gap-1 text-[10px] text-slate-500">
      <lucide-icon [name]="FileText" size="20"></lucide-icon>
      <span>Reporte</span>
    </a>
    <a routerLink="/sprint-config" routerLinkActive="!text-indigo-500 font-bold" class="flex flex-col items-center justify-center gap-1 text-[10px] text-slate-500">
      <lucide-icon [name]="ClipboardList" size="20"></lucide-icon>
      <span>Sprint</span>
    </a>
    <a routerLink="/update" routerLinkActive="!text-indigo-500 font-bold" class="flex flex-col items-center justify-center gap-1 text-[10px] text-slate-500">
      <div class="relative flex items-center justify-center">
        <lucide-icon [name]="DownloadCloud" size="20"></lucide-icon>
        <span *ngIf="hasUpdate" class="absolute -top-1.5 -right-2.5 flex h-3.5 px-1 items-center justify-center rounded-full bg-indigo-600 text-[7px] font-black text-white shadow-sm animate-pulse uppercase tracking-tight z-10 leading-none">
          Update
        </span>
      </div>
      <span>Actualización</span>
    </a>
    <a routerLink="/config" routerLinkActive="!text-indigo-500 font-bold" class="flex flex-col items-center justify-center gap-1 text-[10px] text-slate-500">
      <lucide-icon [name]="Settings" size="20"></lucide-icon>
      <span>Config</span>
    </a>
  </nav>

</div>
  `
})
export class LayoutComponent {
  readonly LayoutDashboard = LayoutDashboard;
  readonly Settings = Settings;
  readonly FileText = FileText;
  readonly Moon = Moon;
  readonly Sun = Sun;
  readonly ChevronLeft = ChevronLeft;
  readonly ChevronRight = ChevronRight;
  readonly ClipboardList = ClipboardList;
  readonly DownloadCloud = DownloadCloud;

  isDarkMode = false;
  isMenuCollapsed = false;

  constructor(private updateService: UpdateService) {
    // Default to Light Mode as requested
    this.isDarkMode = false;
    document.documentElement.classList.remove('dark');

    // Restore persistent menu state
    const savedState = localStorage.getItem('cmmi5_menu_collapsed');
    this.isMenuCollapsed = savedState === 'true';
  }

  get hasUpdate(): boolean {
    return this.updateService.isUpdateAvailable;
  }

  toggleDarkMode() {
    this.isDarkMode = !this.isDarkMode;
    if (this.isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }

  toggleMenu() {
    this.isMenuCollapsed = !this.isMenuCollapsed;
    localStorage.setItem('cmmi5_menu_collapsed', String(this.isMenuCollapsed));
  }
}
