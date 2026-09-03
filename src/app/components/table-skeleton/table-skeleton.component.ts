import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-table-skeleton',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div *ngIf="isLoading" class="relative overflow-hidden border border-slate-200/80 dark:border-slate-800/80 rounded-2xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-md shadow-xs">
      
      <!-- Top Loading Accent Line (Animated Shimmer Bar) -->
      <div class="h-1 w-full bg-slate-100 dark:bg-slate-800 overflow-hidden relative">
        <div class="absolute inset-0 bg-gradient-to-r from-transparent via-indigo-500 to-transparent animate-shimmer"></div>
      </div>

      <!-- Center Loading Badge Banner -->
      <div *ngIf="showBadge" class="py-4 flex justify-center items-center gap-3 bg-indigo-500/5 border-b border-indigo-500/10">
        <span class="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></span>
        <span class="text-xs font-bold text-indigo-600 dark:text-indigo-400 tracking-wide animate-pulse">
          {{ message }}
        </span>
      </div>

      <!-- Skeleton Table Rows -->
      <div class="p-4 space-y-3">
        
        <!-- Skeleton Header -->
        <div class="grid grid-cols-12 gap-4 pb-2 border-b border-slate-200/60 dark:border-slate-800/60">
          <div class="col-span-2 h-4 bg-slate-200 dark:bg-slate-800 rounded-md animate-pulse"></div>
          <div class="col-span-2 h-4 bg-slate-200 dark:bg-slate-800 rounded-md animate-pulse"></div>
          <div class="col-span-4 h-4 bg-slate-200 dark:bg-slate-800 rounded-md animate-pulse"></div>
          <div class="col-span-2 h-4 bg-slate-200 dark:bg-slate-800 rounded-md animate-pulse"></div>
          <div class="col-span-2 h-4 bg-slate-200 dark:bg-slate-800 rounded-md animate-pulse"></div>
        </div>

        <!-- Skeleton Rows loop -->
        <div *ngFor="let row of [1, 2, 3, 4, 5]" class="grid grid-cols-12 gap-4 py-2.5 items-center border-b border-slate-150 dark:border-slate-800/40 last:border-0">
          <div class="col-span-2 h-3.5 bg-slate-200/80 dark:bg-slate-800/80 rounded-md animate-pulse"></div>
          <div class="col-span-2 h-3.5 bg-indigo-100 dark:bg-indigo-950/40 rounded-full animate-pulse"></div>
          <div class="col-span-4 h-3.5 bg-slate-200/80 dark:bg-slate-800/80 rounded-md animate-pulse" [style.width.%]="row % 2 === 0 ? 85 : 65"></div>
          <div class="col-span-2 h-3.5 bg-slate-200/80 dark:bg-slate-800/80 rounded-md animate-pulse"></div>
          <div class="col-span-2 h-3.5 bg-slate-200/80 dark:bg-slate-800/80 rounded-md animate-pulse"></div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    @keyframes shimmer {
      0% { transform: translateX(-100%); }
      100% { transform: translateX(100%); }
    }
    .animate-shimmer {
      animation: shimmer 1.5s infinite linear;
    }
  `]
})
export class TableSkeletonComponent {
  @Input() isLoading = false;
  @Input() message = 'Cargando datos de la tabla...';
  @Input() showBadge = true;
  @Input() rowsCount = 5;
}
