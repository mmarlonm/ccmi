import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { AzureDevOpsService } from '../../services/azure-devops.service';
import { ConfigService } from '../../services/config.service';
import { CMMIMetrics } from '../../models/metrics.model';
import { 
  LucideAngularModule, 
  TrendingUp, 
  RefreshCw, 
  ChevronDown, 
  Download, 
  Users, 
  Briefcase, 
  Calendar,
  AlertTriangle,
  CheckCircle,
  HelpCircle,
  FileSpreadsheet,
  Layers,
  Clock
} from 'lucide-angular';

interface TaskRecord {
  collaborator: string;
  project: string;
  period: string; // "YYYY-MM"
  completedWork: number;
  isDev: boolean;
}

interface SizeRecord {
  collaborator: string;
  project: string;
  period: string; // "YYYY-MM"
  size: number;
  id: string;
  title: string;
}

interface CollaboratorDevRow {
  name: string;
  devHours: number;
  nonDevHours: number;
  totalHours: number;
  percentage: number;
  status: 'green' | 'yellow' | 'red';
}

interface CollaboratorSizeRow {
  name: string;
  totalSize: number;
  status: 'green' | 'yellow' | 'red';
}

interface CollaboratorRateRow {
  name: string;
  devHours: number;
  totalSize: number;
  rate: number;
  status: 'green' | 'yellow' | 'red';
}

@Component({
  selector: 'app-kpi-report',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  template: `
<div id="kpi-report-content" class="h-full overflow-y-auto overflow-x-hidden space-y-8 animate-in fade-in duration-1000 pb-8">
  
  <!-- Header: Sticky with filters matching app layout -->
  <header class="sticky top-0 z-40 bg-slate-50 dark:bg-slate-900 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200 dark:border-slate-800 pb-4 pt-3 md:pt-4 -mx-2 md:-mx-2.5 px-2 md:px-2.5 mb-6 shadow-md transition-all duration-300">
    <div class="shrink-0">
      <h2 class="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
        <lucide-icon [name]="FileSpreadsheet" class="text-indigo-600 dark:text-indigo-400" size="24"></lucide-icon>
        Reporte de KPIs
      </h2>
      <p class="text-slate-500 dark:text-slate-400 mt-1 text-xs">Métricas de Desempeño y Productividad del Personal CMMI 5</p>
    </div>
    
    <!-- Controls Area: Area, Year, Month Start, Month End filters -->
    <div class="flex flex-row items-center gap-2 md:gap-3 justify-end w-full md:w-auto shrink-0">
      <select [(ngModel)]="selectedArea" (change)="onPeriodChange()" class="glass-input text-xs font-medium w-28 md:w-32 shrink-0">
        <option value="">Todas las Áreas</option>
        <option *ngFor="let item of areas" [value]="item.path">{{ item.name }}</option>
      </select>

      <select [(ngModel)]="selectedYear" (change)="onPeriodChange()" class="glass-input text-xs font-medium w-20 shrink-0">
        <option *ngFor="let y of availableYears" [value]="y">{{ y }}</option>
      </select>

      <select [(ngModel)]="selectedMonthStart" (change)="onPeriodChange()" class="glass-input text-xs font-medium w-28 shrink-0">
        <option *ngFor="let m of availableMonths" [value]="m.value">Desde: {{ m.name }}</option>
      </select>

      <select [(ngModel)]="selectedMonthEnd" (change)="onPeriodChange()" class="glass-input text-xs font-medium w-28 shrink-0">
        <option *ngFor="let m of availableMonths" [value]="m.value">Hasta: {{ m.name }}</option>
      </select>

      <div class="flex items-center gap-2 shrink-0 bg-slate-200/50 dark:bg-slate-800/60 p-1 rounded-xl border border-slate-300/40 dark:border-slate-700/50 h-[38px] box-border">
        <button (click)="loadData()" [disabled]="isLoading" 
          class="glass-button flex items-center justify-center h-[30px] w-[30px] p-0 rounded-lg transition-all duration-300 hover:scale-105 active:scale-95 shadow-sm cursor-pointer"
          title="Recargar Datos">
          <lucide-icon [name]="RefreshCw" size="15" [class.animate-spin]="isLoading"></lucide-icon>
        </button>
      </div>
    </div>
  </header>

  <!-- Loading State -->
  <div *ngIf="isLoading" class="flex flex-col items-center justify-center py-20 space-y-4">
    <div class="p-4 bg-indigo-500/10 rounded-2xl border border-indigo-500/20 animate-pulse">
      <lucide-icon [name]="RefreshCw" size="36" class="animate-spin text-indigo-600 dark:text-indigo-400"></lucide-icon>
    </div>
    <p class="text-sm font-bold text-slate-600 dark:text-slate-300 animate-pulse">Cargando métricas de tareas...</p>
  </div>

  <!-- Slicers / Filters Section (Page-Level Slicers) -->
  <div *ngIf="!isLoading && metrics" class="grid grid-cols-1 md:grid-cols-3 gap-4">
    <!-- Collaborator Slicer -->
    <div class="glass-card !p-4 flex items-center gap-3">
      <div class="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 shrink-0">
        <lucide-icon [name]="Users" size="18"></lucide-icon>
      </div>
      <div class="min-w-0 flex-1">
        <label class="text-[10px] text-slate-400 uppercase font-black tracking-wider">Colaborador</label>
        <select [(ngModel)]="filterCollaborator" (change)="applyFilters()" class="w-full bg-transparent border-0 text-sm font-bold text-slate-700 dark:text-slate-200 outline-none p-0 mt-0.5 cursor-pointer">
          <option value="Todas">Todas</option>
          <option *ngFor="let col of collaboratorList" [value]="col">{{ col }}</option>
        </select>
      </div>
    </div>

    <!-- Year / Month Slicer -->
    <div class="glass-card !p-4 flex items-center gap-3">
      <div class="p-2.5 rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400 shrink-0">
        <lucide-icon [name]="Calendar" size="18"></lucide-icon>
      </div>
      <div class="min-w-0 flex-1">
        <label class="text-[10px] text-slate-400 uppercase font-black tracking-wider">Año, Mes</label>
        <select [(ngModel)]="filterPeriod" (change)="applyFilters()" class="w-full bg-transparent border-0 text-sm font-bold text-slate-700 dark:text-slate-200 outline-none p-0 mt-0.5 cursor-pointer">
          <option value="Todas">Todas</option>
          <option *ngFor="let p of periodList" [value]="p">{{ p }}</option>
        </select>
      </div>
    </div>

    <!-- Project Slicer -->
    <div class="glass-card !p-4 flex items-center gap-3">
      <div class="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 shrink-0">
        <lucide-icon [name]="Briefcase" size="18"></lucide-icon>
      </div>
      <div class="min-w-0 flex-1">
        <label class="text-[10px] text-slate-400 uppercase font-black tracking-wider">Proyecto</label>
        <select [(ngModel)]="filterProject" (change)="applyFilters()" class="w-full bg-transparent border-0 text-sm font-bold text-slate-700 dark:text-slate-200 outline-none p-0 mt-0.5 cursor-pointer">
          <option value="Todas">Todas</option>
          <option *ngFor="let proj of projectList" [value]="proj">{{ proj }}</option>
        </select>
      </div>
    </div>
  </div>

  <!-- Main Report Container -->
  <div *ngIf="!isLoading && metrics" class="space-y-8">
    
    <!-- METRIC 1: PO-KPI-01 - Porcentaje de Tiempo en Desarrollo de SW -->
    <section class="glass-card !bg-white dark:!bg-slate-900 border-l-4 border-indigo-650 overflow-hidden shadow-lg animate-in fade-in duration-500 p-6 space-y-6">
      <div class="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div class="flex items-center gap-3">
          <div class="p-2.5 bg-indigo-500 rounded-xl shadow-md text-white">
            <lucide-icon [name]="Clock" size="20"></lucide-icon>
          </div>
          <div>
            <span class="text-[9px] font-black px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 uppercase tracking-wider">
              PO-KPI-01
            </span>
            <h3 class="text-lg font-black text-slate-800 dark:text-white uppercase tracking-tight mt-0.5">Porcentaje de tiempo en Desarrollo de SW</h3>
            <p class="text-xs text-slate-400 dark:text-slate-400">Fecha de Actualización: <strong class="text-slate-600 dark:text-slate-350">{{ today | date:'dd/MM/yyyy' }}</strong></p>
          </div>
        </div>
        
        <!-- Objective -->
        <div class="text-xs bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200/60 dark:border-slate-800/60 max-w-md">
          <p class="font-bold text-slate-700 dark:text-slate-200">Objetivo:</p>
          <p class="text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
            Evaluar el tiempo invertido en trabajo de diseño y construcción de software para poder eficientar recursos en los proyectos y mejorar el proceso.
          </p>
        </div>
      </div>

      <!-- Semaphore Reference -->
      <div class="flex flex-wrap gap-4 text-xs border-t border-slate-100 dark:border-slate-850 pt-4">
        <span class="font-bold text-slate-700 dark:text-slate-300">Semáforo:</span>
        <div class="flex items-center gap-1.5">
          <span class="w-3 h-3 rounded-full bg-emerald-500"></span>
          <span class="text-slate-500 dark:text-slate-400"><strong class="text-emerald-600 dark:text-emerald-400">Óptimo:</strong> > 70% y < 100%</span>
        </div>
        <div class="flex items-center gap-1.5">
          <span class="w-3 h-3 rounded-full bg-amber-500"></span>
          <span class="text-slate-500 dark:text-slate-400"><strong class="text-amber-600 dark:text-amber-400">Tolerable:</strong> >= 50% y <= 70%</span>
        </div>
        <div class="flex items-center gap-1.5">
          <span class="w-3 h-3 rounded-full bg-rose-500"></span>
          <span class="text-slate-500 dark:text-slate-400"><strong class="text-rose-600 dark:text-rose-400">Deficiente:</strong> < 50% ó >= 100%</span>
        </div>
      </div>

      <!-- Table -->
      <div class="overflow-hidden border border-slate-200/60 dark:border-slate-800/60 rounded-2xl">
        <div class="overflow-x-auto w-full">
          <table class="w-full border-collapse text-left">
            <thead>
              <tr class="bg-slate-100/80 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-wider border-b border-slate-200/60 dark:border-slate-800/60">
                <th class="px-6 py-4">Nombre del Colaborador</th>
                <th class="px-6 py-4 text-right">Hrs. DevOps (Desarrollo)</th>
                <th class="px-6 py-4 text-right">Hrs. DevOps No (Gral)</th>
                <th class="px-6 py-4 text-right">% Desarrollo SW</th>
                <th class="px-6 py-4 class-center text-center">Estado</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-150 dark:divide-slate-800/50 text-sm">
              <tr *ngFor="let row of filteredDevRows" class="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-all">
                <td class="px-6 py-4 font-bold text-slate-700 dark:text-slate-200">{{ row.name }}</td>
                <td class="px-6 py-4 text-right font-semibold text-slate-600 dark:text-slate-350">{{ row.devHours | number:'1.2-2' }}</td>
                <td class="px-6 py-4 text-right font-semibold text-slate-600 dark:text-slate-350">{{ row.nonDevHours | number:'1.2-2' }}</td>
                <td class="px-6 py-4 text-right font-black" [ngClass]="{
                  'text-emerald-600 dark:text-emerald-400': row.status === 'green',
                  'text-amber-600 dark:text-amber-400': row.status === 'yellow',
                  'text-rose-600 dark:text-rose-400': row.status === 'red'
                }">{{ row.percentage | number:'1.2-2' }}%</td>
                <td class="px-6 py-4">
                  <div class="flex items-center justify-center">
                    <span class="flex h-6 px-2.5 items-center justify-center text-[10px] font-bold rounded-full uppercase tracking-wider border"
                      [ngClass]="{
                        'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/50': row.status === 'green',
                        'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/50': row.status === 'yellow',
                        'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900/50': row.status === 'red'
                      }">
                      {{ row.status === 'green' ? 'Óptimo' : row.status === 'yellow' ? 'Tolerable' : 'Deficiente' }}
                    </span>
                  </div>
                </td>
              </tr>
              <tr *ngIf="filteredDevRows.length === 0" class="text-center text-slate-400 dark:text-slate-500 py-10">
                <td colspan="5" class="py-12">No se encontraron registros de tareas para los filtros seleccionados.</td>
              </tr>
            </tbody>
            <tfoot *ngIf="filteredDevRows.length > 0" class="bg-slate-50/80 dark:bg-slate-800/30 text-slate-700 dark:text-slate-200 font-black border-t border-slate-200/80 dark:border-slate-800/80">
              <tr>
                <td class="px-6 py-4 uppercase text-xs">Total General</td>
                <td class="px-6 py-4 text-right">{{ totalDevHours | number:'1.2-2' }}</td>
                <td class="px-6 py-4 text-right">{{ totalNonDevHours | number:'1.2-2' }}</td>
                <td class="px-6 py-4 text-right text-indigo-600 dark:text-indigo-400">{{ averagePercentage | number:'1.2-2' }}%</td>
                <td class="px-6 py-4"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </section>

    <!-- METRIC 2: ISW-KPI-02 - Size Completado -->
    <section class="glass-card !bg-white dark:!bg-slate-900 border-l-4 border-violet-600 overflow-hidden shadow-lg animate-in fade-in duration-500 p-6 space-y-6">
      <div class="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div class="flex items-center gap-3">
          <div class="p-2.5 bg-violet-500 rounded-xl shadow-md text-white">
            <lucide-icon [name]="Layers" size="20"></lucide-icon>
          </div>
          <div>
            <span class="text-[9px] font-black px-2 py-0.5 rounded bg-violet-50 text-violet-700 dark:bg-violet-950 dark:text-violet-350 uppercase tracking-wider">
              ISW-KPI-02
            </span>
            <h3 class="text-lg font-black text-slate-800 dark:text-white uppercase tracking-tight mt-0.5">Size Completado</h3>
            <p class="text-xs text-slate-400 dark:text-slate-400">Fecha de Actualización: <strong class="text-slate-600 dark:text-slate-350">{{ today | date:'dd/MM/yyyy' }}</strong></p>
          </div>
        </div>
        
        <!-- Objective -->
        <div class="text-xs bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200/60 dark:border-slate-800/60 max-w-md">
          <p class="font-bold text-slate-700 dark:text-slate-200">Objetivo:</p>
          <p class="text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
            Evaluar el trabajo completado mensual de la construcción de software de MayanSoft para eficientar recursos en los proyectos, mejorar las asignaciones de trabajo y mejorar el proceso de software.
          </p>
        </div>
      </div>

      <!-- Semaphore Reference -->
      <div class="flex flex-wrap gap-4 text-xs border-t border-slate-100 dark:border-slate-850 pt-4">
        <span class="font-bold text-slate-700 dark:text-slate-300">Semáforo:</span>
        <div class="flex items-center gap-1.5">
          <span class="w-3 h-3 rounded-full bg-emerald-500"></span>
          <span class="text-slate-500 dark:text-slate-400"><strong class="text-emerald-600 dark:text-emerald-400">Óptimo:</strong> > 100</span>
        </div>
        <div class="flex items-center gap-1.5">
          <span class="w-3 h-3 rounded-full bg-amber-500"></span>
          <span class="text-slate-500 dark:text-slate-400"><strong class="text-amber-600 dark:text-amber-400">Tolerable:</strong> >= 60 y <= 100</span>
        </div>
        <div class="flex items-center gap-1.5">
          <span class="w-3 h-3 rounded-full bg-rose-500"></span>
          <span class="text-slate-500 dark:text-slate-400"><strong class="text-rose-600 dark:text-rose-400">Deficiente:</strong> < 60</span>
        </div>
      </div>

      <!-- Table -->
      <div class="overflow-hidden border border-slate-200/60 dark:border-slate-800/60 rounded-2xl">
        <div class="overflow-x-auto w-full">
          <table class="w-full border-collapse text-left">
            <thead>
              <tr class="bg-slate-100/80 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-wider border-b border-slate-200/60 dark:border-slate-800/60">
                <th class="px-6 py-4">Colaborador</th>
                <th class="px-6 py-4 text-right">Promedio de Sizes (Suma de Sizes)</th>
                <th class="px-6 py-4 text-center">Estado</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-150 dark:divide-slate-800/50 text-sm">
              <tr *ngFor="let row of filteredSizeRows" class="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-all">
                <td class="px-6 py-4 font-bold text-slate-700 dark:text-slate-200">{{ row.name }}</td>
                <td class="px-6 py-4 text-right font-black" [ngClass]="{
                  'text-emerald-600 dark:text-emerald-400': row.status === 'green',
                  'text-amber-600 dark:text-amber-400': row.status === 'yellow',
                  'text-rose-600 dark:text-rose-400': row.status === 'red'
                }">{{ row.totalSize | number:'1.2-2' }}</td>
                <td class="px-6 py-4">
                  <div class="flex items-center justify-center">
                    <span class="flex h-6 px-2.5 items-center justify-center text-[10px] font-bold rounded-full uppercase tracking-wider border"
                      [ngClass]="{
                        'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/50': row.status === 'green',
                        'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/50': row.status === 'yellow',
                        'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900/50': row.status === 'red'
                      }">
                      {{ row.status === 'green' ? 'Óptimo' : row.status === 'yellow' ? 'Tolerable' : 'Deficiente' }}
                    </span>
                  </div>
                </td>
              </tr>
              <tr *ngIf="filteredSizeRows.length === 0" class="text-center text-slate-400 dark:text-slate-500 py-10">
                <td colspan="3" class="py-12">No se encontraron registros de sizes para los filtros seleccionados.</td>
              </tr>
            </tbody>
            <tfoot *ngIf="filteredSizeRows.length > 0" class="bg-slate-50/80 dark:bg-slate-800/30 text-slate-700 dark:text-slate-200 font-black border-t border-slate-200/80 dark:border-slate-800/80">
              <tr>
                <td class="px-6 py-4 uppercase text-xs">Total (Promedio General)</td>
                <td class="px-6 py-4 text-right text-indigo-600 dark:text-indigo-400">{{ averageSizeAll | number:'1.2-2' }}</td>
                <td class="px-6 py-4"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </section>

    <!-- METRIC 3: ISW-KPI-03 - Tasa de Desarrollo -->
    <section class="glass-card !bg-white dark:!bg-slate-900 border-l-4 border-emerald-500 overflow-hidden shadow-lg animate-in fade-in duration-500 p-6 space-y-6">
      <div class="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div class="flex items-center gap-3">
          <div class="p-2.5 bg-emerald-500 rounded-xl shadow-md text-white">
            <lucide-icon [name]="TrendingUp" size="20"></lucide-icon>
          </div>
          <div>
            <span class="text-[9px] font-black px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-350 uppercase tracking-wider">
              ISW-KPI-03
            </span>
            <h3 class="text-lg font-black text-slate-800 dark:text-white uppercase tracking-tight mt-0.5">Tasa de desarrollo (Developing)</h3>
            <p class="text-xs text-slate-400 dark:text-slate-400">Fecha de Actualización: <strong class="text-slate-600 dark:text-slate-350">{{ today | date:'dd/MM/yyyy' }}</strong></p>
          </div>
        </div>
        
        <!-- Objective -->
        <div class="text-xs bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200/60 dark:border-slate-800/60 max-w-md">
          <p class="font-bold text-slate-700 dark:text-slate-200">Objetivo:</p>
          <p class="text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
            Evaluar el rendimiento de la productividad en la construcción de software de MayanSoft para mejorar la desviación de las estimaciones, seguimiento técnico de cada colaborador, eficientar recursos humanos en los proyectos y mejorar el proceso de desarrollo.
          </p>
        </div>
      </div>

      <!-- Semaphore Reference -->
      <div class="flex flex-wrap gap-4 text-xs border-t border-slate-100 dark:border-slate-850 pt-4">
        <span class="font-bold text-slate-700 dark:text-slate-300">Semáforo:</span>
        <div class="flex items-center gap-1.5">
          <span class="w-3 h-3 rounded-full bg-emerald-500"></span>
          <span class="text-slate-500 dark:text-slate-400"><strong class="text-emerald-600 dark:text-emerald-400">Óptimo:</strong> &lt; 0.70</span>
        </div>
        <div class="flex items-center gap-1.5">
          <span class="w-3 h-3 rounded-full bg-amber-500"></span>
          <span class="text-slate-500 dark:text-slate-400"><strong class="text-amber-600 dark:text-amber-400">Tolerable:</strong> &gt;= 0.70 y &lt;= 1.00</span>
        </div>
        <div class="flex items-center gap-1.5">
          <span class="w-3 h-3 rounded-full bg-rose-500"></span>
          <span class="text-slate-500 dark:text-slate-400"><strong class="text-rose-600 dark:text-rose-400">Deficiente:</strong> &gt; 1.00</span>
        </div>
      </div>

      <!-- Table -->
      <div class="overflow-hidden border border-slate-200/60 dark:border-slate-800/60 rounded-2xl">
        <div class="overflow-x-auto w-full">
          <table class="w-full border-collapse text-left">
            <thead>
              <tr class="bg-slate-100/80 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-wider border-b border-slate-200/60 dark:border-slate-800/60">
                <th class="px-6 py-4">Colaborador</th>
                <th class="px-6 py-4 text-right">Hrs. Desarrollo (Completed)</th>
                <th class="px-6 py-4 text-right">Size Completado</th>
                <th class="px-6 py-4 text-right">Tasa (Hrs/Size)</th>
                <th class="px-6 py-4 text-center">Estado</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-150 dark:divide-slate-800/50 text-sm">
              <tr *ngFor="let row of filteredRateRows" class="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-all">
                <td class="px-6 py-4 font-bold text-slate-700 dark:text-slate-200">{{ row.name }}</td>
                <td class="px-6 py-4 text-right font-semibold text-slate-600 dark:text-slate-350">{{ row.devHours | number:'1.2-2' }}</td>
                <td class="px-6 py-4 text-right font-semibold text-slate-600 dark:text-slate-350">{{ row.totalSize | number:'1.2-2' }}</td>
                <td class="px-6 py-4 text-right font-black" [ngClass]="{
                  'text-emerald-600 dark:text-emerald-400': row.status === 'green',
                  'text-amber-600 dark:text-amber-400': row.status === 'yellow',
                  'text-rose-600 dark:text-rose-400': row.status === 'red'
                }">{{ row.rate | number:'1.2-2' }}</td>
                <td class="px-6 py-4">
                  <div class="flex items-center justify-center">
                    <span class="flex h-6 px-2.5 items-center justify-center text-[10px] font-bold rounded-full uppercase tracking-wider border"
                      [ngClass]="{
                        'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/50': row.status === 'green',
                        'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/50': row.status === 'yellow',
                        'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900/50': row.status === 'red'
                      }">
                      {{ row.status === 'green' ? 'Óptimo' : row.status === 'yellow' ? 'Tolerable' : 'Deficiente' }}
                    </span>
                  </div>
                </td>
              </tr>
              <tr *ngIf="filteredRateRows.length === 0" class="text-center text-slate-400 dark:text-slate-500 py-10">
                <td colspan="5" class="py-12">No se encontraron registros de tasas para los filtros seleccionados.</td>
              </tr>
            </tbody>
            <tfoot *ngIf="filteredRateRows.length > 0" class="bg-slate-50/80 dark:bg-slate-800/30 text-slate-700 dark:text-slate-200 font-black border-t border-slate-200/80 dark:border-slate-800/80">
              <tr>
                <td class="px-6 py-4 uppercase text-xs">Total (Tasa General)</td>
                <td class="px-6 py-4 text-right">{{ totalRateHours | number:'1.2-2' }}</td>
                <td class="px-6 py-4 text-right">{{ totalRateSize | number:'1.2-2' }}</td>
                <td class="px-6 py-4 text-right text-indigo-600 dark:text-indigo-400">{{ overallRate | number:'1.2-2' }}</td>
                <td class="px-6 py-4"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </section>
  </div>

  <div *ngIf="!isLoading && !metrics" class="flex flex-col items-center justify-center py-20 text-center space-y-4 opacity-75">
    <lucide-icon [name]="FileSpreadsheet" size="48" class="text-slate-300 dark:text-slate-650"></lucide-icon>
    <div class="max-w-md">
      <h3 class="text-lg font-bold text-slate-700 dark:text-slate-300">Ningún Periodo Seleccionado</h3>
      <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">Por favor selecciona un Área, Año y Mes en los filtros de arriba para cargar el análisis de los KPIs.</p>
    </div>
  </div>

</div>
  `,
  styles: [`
    .glass-card {
      @apply bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xl shadow-slate-200/20 dark:shadow-none transition-all duration-300;
    }
  `]
})
export class KpiReportComponent implements OnInit {
  private adoService = inject(AzureDevOpsService);
  private configService = inject(ConfigService);

  isLoading = false;
  metrics: CMMIMetrics | null = null;
  today = new Date();

  // Filters
  areas: any[] = [];
  selectedArea = '';

  availableYears: number[] = [];
  availableMonths = [
    { value: 1, name: 'Enero' },
    { value: 2, name: 'Febrero' },
    { value: 3, name: 'Marzo' },
    { value: 4, name: 'Abril' },
    { value: 5, name: 'Mayo' },
    { value: 6, name: 'Junio' },
    { value: 7, name: 'Julio' },
    { value: 8, name: 'Agosto' },
    { value: 9, name: 'Septiembre' },
    { value: 10, name: 'Octubre' },
    { value: 11, name: 'Noviembre' },
    { value: 12, name: 'Diciembre' }
  ];
  selectedYear = new Date().getFullYear();
  selectedMonthStart = new Date().getMonth() + 1;
  selectedMonthEnd = new Date().getMonth() + 1;

  filterCollaborator = 'Todas';
  filterPeriod = 'Todas';
  filterProject = 'Todas';

  // Data Lists for Slicers
  collaboratorList: string[] = [];
  periodList: string[] = [];
  projectList: string[] = [];

  // Data records
  allTaskRecords: TaskRecord[] = [];
  allSizeRecords: SizeRecord[] = [];

  // Filtered rows for Metric 1
  filteredDevRows: CollaboratorDevRow[] = [];
  totalDevHours = 0;
  totalNonDevHours = 0;
  averagePercentage = 0;

  // Filtered rows for Metric 2
  filteredSizeRows: CollaboratorSizeRow[] = [];
  averageSizeAll = 0;

  // Filtered rows for Metric 3
  filteredRateRows: CollaboratorRateRow[] = [];
  totalRateHours = 0;
  totalRateSize = 0;
  overallRate = 0;

  // Lucide icons list
  readonly FileSpreadsheet = FileSpreadsheet;
  readonly RefreshCw = RefreshCw;
  readonly Users = Users;
  readonly Briefcase = Briefcase;
  readonly Calendar = Calendar;
  readonly HelpCircle = HelpCircle;
  readonly Clock = Clock;
  readonly Layers = Layers;
  readonly TrendingUp = TrendingUp;

  private readonly STORAGE_KEY = 'cmmi5_kpi_report_selection_period';

  ngOnInit() {
    const currentYear = new Date().getFullYear();
    this.availableYears = [currentYear - 2, currentYear - 1, currentYear, currentYear + 1];

    this.loadSavedSelection();
    if (this.configService.getConfig()) {
      this.loadAreas();
    }
  }

  loadSavedSelection() {
    const saved = localStorage.getItem(this.STORAGE_KEY);
    if (saved) {
      try {
        const { area, year, monthStart, monthEnd } = JSON.parse(saved);
        this.selectedArea = area || '';
        this.selectedYear = year || new Date().getFullYear();
        this.selectedMonthStart = monthStart || (new Date().getMonth() + 1);
        this.selectedMonthEnd = monthEnd || (new Date().getMonth() + 1);
      } catch (e) {
        this.selectedYear = new Date().getFullYear();
        this.selectedMonthStart = new Date().getMonth() + 1;
        this.selectedMonthEnd = new Date().getMonth() + 1;
      }
    } else {
      this.selectedYear = new Date().getFullYear();
      this.selectedMonthStart = new Date().getMonth() + 1;
      this.selectedMonthEnd = new Date().getMonth() + 1;
    }
  }

  saveSelection() {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify({
      area: this.selectedArea,
      year: this.selectedYear,
      monthStart: this.selectedMonthStart,
      monthEnd: this.selectedMonthEnd
    }));
  }

  loadAreas() {
    this.adoService.getAreas().subscribe(data => {
      this.areas = data;
      this.loadData();
    });
  }

  onPeriodChange() {
    this.saveSelection();
    this.loadData();
  }

  loadData() {
    this.isLoading = true;
    const year = Number(this.selectedYear);
    const monthStart = Number(this.selectedMonthStart);
    const monthEnd = Number(this.selectedMonthEnd);

    // Determine area path (default to one containing "mayansoft" or fallback)
    let areaPath = this.selectedArea;
    if (!areaPath && this.areas.length > 0) {
      const msArea = this.areas.find(a => a.path.toLowerCase().includes('mayansoft'));
      areaPath = msArea ? msArea.path : this.areas[0].path;
    }
    if (!areaPath) areaPath = 'Mayansoft';

    // The second metric only takes into account items from Mayansoft
    let msAreaPath = '';
    if (this.areas.length > 0) {
      const msArea = this.areas.find(a => a.path.toLowerCase().includes('mayansoft'));
      msAreaPath = msArea ? msArea.path : '';
    }
    if (!msAreaPath) msAreaPath = 'Mayansoft';

    // Load both tasks (first metric) and monthlyItems (second metric) in parallel
    forkJoin({
      tasks: this.adoService.getKpiTasksForMonth(areaPath, year, monthStart, monthEnd),
      monthlyItems: this.adoService.getKpisForMonth(msAreaPath, year, monthStart, monthEnd)
    }).subscribe({
      next: ({ tasks, monthlyItems }) => {
        this.processKpis(tasks, monthlyItems, year, monthStart, monthEnd);
        this.isLoading = false;
      },
      error: (err) => {
        console.error('KPI Report: failed to load data', err);
        this.processKpis([], [], year, monthStart, monthEnd);
        this.isLoading = false;
      }
    });
  }

  private processKpis(tasks: any[], monthlyItems: any[], year: number, monthStart: number, monthEnd: number) {
    this.allTaskRecords = [];
    this.allSizeRecords = [];
    
    // Mock metrics object to satisfy template *ngIf
    this.metrics = {
      iterationName: `${year}-${String(monthStart).padStart(2, '0')} a ${String(monthEnd).padStart(2, '0')}`,
      startDate: `${year}-${String(monthStart).padStart(2, '0')}-01`,
      endDate: ''
    } as any;

    // Process PO-KPI-01 (Task records from getKpiTasksForMonth)
    tasks.forEach(t => {
      const assignedTo = t.fields['System.AssignedTo'];
      const name = assignedTo ? (typeof assignedTo === 'object' ? assignedTo.displayName : assignedTo) : 'Sin asignar';
      if (name === 'Sin asignar' || name === 'Unassigned') return;
      
      const work = t.fields['Microsoft.VSTS.Scheduling.CompletedWork'] || 0;
      if (work <= 0) return;

      const proj = t.fields['System.AreaPath'] || 'Todas';
      
      const closedDate = t.fields['Microsoft.VSTS.Common.ClosedDate'] || t.fields['System.ChangedDate'];
      let period = `${year}-${String(monthStart).padStart(2, '0')}`;
      if (closedDate) {
        const date = new Date(closedDate);
        period = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      }

      this.allTaskRecords.push({
        collaborator: name,
        project: proj,
        period,
        completedWork: work,
        isDev: this.isDevelopmentTask({
          type: t.fields['System.WorkItemType'] || '',
          title: t.fields['System.Title'] || '',
          discipline: t.fields['Microsoft.VSTS.Common.Activity'] || ''
        })
      });
    });

    // Process ISW-KPI-02 (Size records) using monthly items
    
    // Map ID -> WorkItemType for parent checking
    const typeMap = new Map<number, string>();
    monthlyItems.forEach(item => {
      typeMap.set(Number(item.id), item.fields['System.WorkItemType']);
    });

    monthlyItems.forEach(i => {
      const type = i.fields['System.WorkItemType'];
      const status = i.fields['System.State'];
      const parentId = i.fields['System.Parent']?.toString() || '';
      const size = i.fields['Microsoft.VSTS.Scheduling.Size'] || i.fields['Microsoft.VSTS.Scheduling.StoryPoints'] || 0;
      const areaPath = i.fields['System.AreaPath'] || '';
      
      // Metric rules:
      // Item: Requerimientos, Features y Bugs (User Story, Requirement, Bug, Defecto, Requisito, Feature)
      // Sin parent: parentId is empty or null (or if it's a Feature/User Story, its parent is a higher-level classification node like Feature/Epic, so we allow it. For Bugs, we only allow if parent is empty or a Feature).
      const isReqOrBugOrFt = ['User Story', 'Requirement', 'Product Backlog Item', 'Requisito', 'Bug', 'Defecto', 'Feature'].includes(type);
      const isResolvedOrClosed = ['Closed', 'Resolved', 'Done', 'Completed'].includes(status);
      const isSizeValid = size > 1 && size < 56;
      const isMayansoft = areaPath.toLowerCase().includes('mayansoft');

      // Smart parent logic:
      let hasNoParent = false;
      const isUserStoryOrReqOrFt = ['User Story', 'Requirement', 'Product Backlog Item', 'Requisito', 'Feature'].includes(type);
      if (isUserStoryOrReqOrFt) {
        // User stories / Requirements are the peer estimation units, we count them even if they belong to a Feature
        hasNoParent = true;
      } else {
        // It's a Bug or Defect. Count it if it has no parent, or if the parent is a Feature (not double counting a User Story)
        const parentIdNum = parentId ? Number(parentId) : 0;
        const parentType = parentIdNum ? typeMap.get(parentIdNum) : null;
        hasNoParent = !parentId || parentType === 'Feature';
      }

      const accepted = isReqOrBugOrFt && isResolvedOrClosed && hasNoParent && isSizeValid && isMayansoft;
      const assignedTo = i.fields['System.AssignedTo'];
      const collaboratorName = assignedTo ? (typeof assignedTo === 'object' ? assignedTo.displayName : assignedTo) : 'Sin asignar';

      if (accepted) {
        const closedDate = i.fields['Microsoft.VSTS.Common.ClosedDate'] || i.fields['System.ChangedDate'];
        let period = `${year}-${String(monthStart).padStart(2, '0')}`;
        if (closedDate) {
          const date = new Date(closedDate);
          period = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        }

        this.allSizeRecords.push({
          collaborator: collaboratorName,
          project: areaPath || 'OPE20',
          period,
          size: size,
          id: i.id.toString(),
          title: i.fields['System.Title'] || ''
        });
      }
    });

    // Populate filter lists (merge lists from both tasks and sizes for complete slicers coverage)
    const allCollaborators = new Set<string>([
      ...this.allTaskRecords.map(r => r.collaborator),
      ...this.allSizeRecords.map(r => r.collaborator)
    ]);
    const allPeriods = new Set<string>([
      ...this.allTaskRecords.map(r => r.period),
      ...this.allSizeRecords.map(r => r.period)
    ]);
    const allProjects = new Set<string>([
      ...this.allTaskRecords.map(r => r.project),
      ...this.allSizeRecords.map(r => r.project)
    ]);

    this.collaboratorList = Array.from(allCollaborators).filter(c => c !== 'Sin asignar').sort();
    this.periodList = Array.from(allPeriods).filter(p => p !== 'Sin fecha').sort();
    this.projectList = Array.from(allProjects).sort();

    // Reset filters if previous selections are no longer valid
    if (this.filterCollaborator !== 'Todas' && !allCollaborators.has(this.filterCollaborator)) this.filterCollaborator = 'Todas';
    if (this.filterPeriod !== 'Todas' && !allPeriods.has(this.filterPeriod)) this.filterPeriod = 'Todas';
    if (this.filterProject !== 'Todas' && !allProjects.has(this.filterProject)) this.filterProject = 'Todas';

    this.applyFilters();
  }

  private isDevelopmentTask(task: any): boolean {
    const type = (task.type || '').toLowerCase();
    const title = (task.title || '').toLowerCase();
    const discipline = (task.discipline || '').toLowerCase();
    
    const devKeywords = [
      'desarrollo', 'development', 'construccion', 'construction', 
      'diseño', 'design', 'coding', 'programacion', 'programming', 
      'build', 'implementacion', 'implementation'
    ];
    
    return devKeywords.some(kw => type.includes(kw) || discipline.includes(kw) || title.includes(kw));
  }

  applyFilters() {
    // --- Filter and Group for PO-KPI-01 (Task records) ---
    const filteredDevRecords = this.allTaskRecords.filter(r => {
      if (this.filterCollaborator !== 'Todas' && r.collaborator !== this.filterCollaborator) return false;
      if (this.filterPeriod !== 'Todas' && r.period !== this.filterPeriod) return false;
      if (this.filterProject !== 'Todas' && r.project !== this.filterProject) return false;
      return true;
    });

    const devGrouping = new Map<string, { dev: number, nonDev: number }>();
    filteredDevRecords.forEach(r => {
      if (!devGrouping.has(r.collaborator)) {
        devGrouping.set(r.collaborator, { dev: 0, nonDev: 0 });
      }
      const g = devGrouping.get(r.collaborator)!;
      if (r.isDev) {
        g.dev += r.completedWork;
      } else {
        g.nonDev += r.completedWork;
      }
    });

    // --- Filter and Group for ISW-KPI-02 (Size records) ---
    const filteredSizeRecords = this.allSizeRecords.filter(r => {
      if (this.filterCollaborator !== 'Todas' && r.collaborator !== this.filterCollaborator) return false;
      if (this.filterPeriod !== 'Todas' && r.period !== this.filterPeriod) return false;
      if (this.filterProject !== 'Todas' && r.project !== this.filterProject) return false;
      return true;
    });

    const sizeGrouping = new Map<string, number>();
    filteredSizeRecords.forEach(r => {
      const current = sizeGrouping.get(r.collaborator) || 0;
      sizeGrouping.set(r.collaborator, current + r.size);
    });

    // Get the union of all active collaborators across both datasets to keep tables aligned
    const allActiveCollaborators = Array.from(new Set([
      ...devGrouping.keys(),
      ...sizeGrouping.keys()
    ])).sort();

    this.filteredDevRows = [];
    this.totalDevHours = 0;
    this.totalNonDevHours = 0;

    allActiveCollaborators.forEach(name => {
      const val = devGrouping.get(name) || { dev: 0, nonDev: 0 };
      const total = val.dev + val.nonDev;
      const percentage = total > 0 ? (val.dev / total) * 100 : 0;
      
      let status: 'green' | 'yellow' | 'red' = 'red';
      if (percentage > 70 && percentage < 100) {
        status = 'green';
      } else if (percentage >= 50 && percentage <= 70) {
        status = 'yellow';
      }

      this.filteredDevRows.push({
        name,
        devHours: val.dev,
        nonDevHours: val.nonDev,
        totalHours: total,
        percentage,
        status
      });

      this.totalDevHours += val.dev;
      this.totalNonDevHours += val.nonDev;
    });

    const totalHoursAll = this.totalDevHours + this.totalNonDevHours;
    this.averagePercentage = totalHoursAll > 0 ? (this.totalDevHours / totalHoursAll) * 100 : 0;

    // --- Filter and Group for ISW-KPI-02 (Size records) ---
    this.filteredSizeRows = [];
    let sizeSum = 0;

    allActiveCollaborators.forEach(name => {
      const val = sizeGrouping.get(name) || 0;
      let status: 'green' | 'yellow' | 'red' = 'red';
      if (val > 100) {
        status = 'green';
      } else if (val >= 60 && val <= 100) {
        status = 'yellow';
      }

      this.filteredSizeRows.push({
        name,
        totalSize: val,
        status
      });
      sizeSum += val;
    });

    this.averageSizeAll = this.filteredSizeRows.length > 0 ? sizeSum / this.filteredSizeRows.length : 0;

    // --- Filter and Group for ISW-KPI-03 (Tasa de Desarrollo) ---
    this.filteredRateRows = [];
    this.totalRateHours = 0;
    this.totalRateSize = 0;

    allActiveCollaborators.forEach(name => {
      const devHours = devGrouping.get(name)?.dev || 0;
      const sizeVal = sizeGrouping.get(name) || 0;
      const rate = sizeVal > 0 ? devHours / sizeVal : 0;

      let status: 'green' | 'yellow' | 'red' = 'red';
      if (rate < 0.70) {
        status = 'green';
      } else if (rate >= 0.70 && rate <= 1.0) {
        status = 'yellow';
      }

      this.filteredRateRows.push({
        name,
        devHours,
        totalSize: sizeVal,
        rate,
        status
      });

      this.totalRateHours += devHours;
      this.totalRateSize += sizeVal;
    });

    this.overallRate = this.totalRateSize > 0 ? this.totalRateHours / this.totalRateSize : 0;
  }
}
