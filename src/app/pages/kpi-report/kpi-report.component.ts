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
  Clock,
  Search,
  Code,
  Play,
  Copy,
  Table,
  Check,
  Plus,
  Trash2,
  Filter,
  Save,
  FolderOpen
} from 'lucide-angular';
import * as XLSX from 'xlsx';
import { TableSkeletonComponent } from '../../components/table-skeleton/table-skeleton.component';

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

export interface WiqlQueryResultRow {
  id: number;
  type: string;
  title: string;
  state: string;
  assignedTo: string;
  areaPath: string;
  iterationPath: string;
  completedWork: number;
  originalEstimate: number;
  remainingWork: number;
  size: number;
  tags: string;
  createdDate: string;
  closedDate: string;
}

@Component({
  selector: 'app-kpi-report',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, TableSkeletonComponent],
  template: `
<div id="kpi-report-content" class="h-full overflow-y-auto overflow-x-hidden space-y-8 animate-in fade-in duration-1000 pb-8">
  
  <!-- Header: Sticky with tab selection -->
  <header class="sticky top-0 z-40 bg-slate-50 dark:bg-slate-900 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200 dark:border-slate-800 pb-4 pt-3 md:pt-4 -mx-2 md:-mx-2.5 px-2 md:px-2.5 mb-6 shadow-md transition-all duration-300">
    <div class="shrink-0 flex items-center gap-4">
      <div>
        <h2 class="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
          <lucide-icon [name]="FileSpreadsheet" class="text-indigo-600 dark:text-indigo-400" size="24"></lucide-icon>
          Reporte & Consultas Azure DevOps
        </h2>
        <p class="text-slate-500 dark:text-slate-400 mt-0.5 text-xs">Métricas CMMI 5 y Consultas Personalizadas WIQL</p>
      </div>

      <!-- Tab Switcher -->
      <div class="hidden sm:flex p-1 bg-slate-200/60 dark:bg-slate-800/80 rounded-2xl border border-slate-300/40 dark:border-slate-700/50">
        <button (click)="activeTab = 'kpis'" [class]="activeTab === 'kpis' ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-md font-bold' : 'text-slate-600 dark:text-slate-400 font-medium hover:text-slate-900'" class="px-3.5 py-1.5 text-xs rounded-xl transition-all duration-200 flex items-center gap-1.5 cursor-pointer">
          <lucide-icon [name]="TrendingUp" size="14"></lucide-icon>
          <span>KPIs de Desempeño</span>
        </button>
        <button (click)="activeTab = 'wiql'" [class]="activeTab === 'wiql' ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-md font-bold' : 'text-slate-600 dark:text-slate-400 font-medium hover:text-slate-900'" class="px-3.5 py-1.5 text-xs rounded-xl transition-all duration-200 flex items-center gap-1.5 cursor-pointer">
          <lucide-icon [name]="Code" size="14"></lucide-icon>
          <span>Consultas WIQL Libre</span>
        </button>
      </div>
    </div>
    
    <!-- Controls Area: Area, Year, Month Start, Month End filters (only for KPIs tab) -->
    <div *ngIf="activeTab === 'kpis'" class="flex flex-row items-center gap-2 md:gap-3 justify-end w-full md:w-auto shrink-0">
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

    <!-- Controls Area for WIQL Tab -->
    <div *ngIf="activeTab === 'wiql'" class="flex items-center gap-2">
      <button (click)="exportWiqlToExcel()" [disabled]="wiqlResults.length === 0" class="px-4 py-2 text-xs font-bold rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 transition-all flex items-center gap-1.5 shadow-md shadow-emerald-600/20 cursor-pointer">
        <lucide-icon [name]="Download" size="14"></lucide-icon>
        <span>Exportar Excel ({{ wiqlResults.length }})</span>
      </button>
    </div>
  </header>

  <!-- Mobile Tab Switcher -->
  <div class="sm:hidden flex p-1 bg-slate-200/60 dark:bg-slate-800/80 rounded-2xl border border-slate-300/40 dark:border-slate-700/50">
    <button (click)="activeTab = 'kpis'" [class]="activeTab === 'kpis' ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-md font-bold' : 'text-slate-600 dark:text-slate-400 font-medium'" class="flex-1 py-2 text-xs rounded-xl transition-all duration-200 flex items-center justify-center gap-1.5">
      <lucide-icon [name]="TrendingUp" size="14"></lucide-icon>
      <span>KPIs</span>
    </button>
    <button (click)="activeTab = 'wiql'" [class]="activeTab === 'wiql' ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-md font-bold' : 'text-slate-600 dark:text-slate-400 font-medium'" class="flex-1 py-2 text-xs rounded-xl transition-all duration-200 flex items-center justify-center gap-1.5">
      <lucide-icon [name]="Code" size="14"></lucide-icon>
      <span>Query WIQL</span>
    </button>
  </div>

  <!-- TAB 1: KPIS REPORT -->
  <ng-container *ngIf="activeTab === 'kpis'">
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

    <!-- Loading Skeleton for KPIs Tab -->
    <app-table-skeleton 
      [isLoading]="isLoading" 
      message="Calculando métricas CMMI 5 y procesando tareas..." 
      [rowsCount]="5">
    </app-table-skeleton>

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
  </ng-container>

  <!-- TAB 2: WIQL CUSTOM QUERY ENGINE -->
  <ng-container *ngIf="activeTab === 'wiql'">
    <div class="space-y-6">
      
      <!-- WIQL Editor Card -->
      <div class="glass-card p-6 space-y-4 border border-indigo-500/20 bg-indigo-500/5">
        <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div class="flex items-center gap-3">
            <span class="p-2.5 rounded-2xl bg-indigo-600 text-white shadow-md shadow-indigo-600/20">
              <lucide-icon [name]="Code" size="22"></lucide-icon>
            </span>
            <div>
              <h3 class="text-lg font-bold text-slate-800 dark:text-white">Editor de Consultas WIQL (Work Item Query Language)</h3>
              <p class="text-xs text-slate-500 dark:text-slate-400">Escribe o selecciona una consulta personalizada para consultar directamente Work Items en Azure DevOps.</p>
            </div>
          </div>

          <div class="flex flex-wrap items-center gap-2">
            <button (click)="openSaveQueryModal()" class="px-4 py-2.5 text-xs font-bold rounded-xl border bg-white dark:bg-slate-800 border-indigo-200 dark:border-indigo-800/60 text-indigo-600 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs">
              <lucide-icon [name]="Save" size="14"></lucide-icon>
              <span>Guardar en Azure</span>
            </button>

            <button (click)="runWiqlQuery()" [disabled]="isExecutingWiql" class="px-5 py-2.5 text-xs font-bold rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 transition-all flex items-center gap-2 shadow-md shadow-indigo-600/20 cursor-pointer">
              <span *ngIf="isExecutingWiql" class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              <lucide-icon *ngIf="!isExecutingWiql" [name]="Play" size="14"></lucide-icon>
              <span>{{ isExecutingWiql ? 'Ejecutando...' : 'Ejecutar Consulta' }}</span>
            </button>
          </div>
        </div>

        <!-- Visual Clause Builder (Estilo Azure DevOps) -->
        <div class="space-y-3 bg-white/60 dark:bg-slate-900/60 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800/80">
          <div class="flex items-center justify-between">
            <label class="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
              <lucide-icon [name]="Filter" size="14" class="text-indigo-500"></lucide-icon>
              <span>Cláusulas de Filtro (Estilo Azure DevOps Editor)</span>
            </label>
            <button (click)="addClause()" type="button" class="px-3 py-1 text-xs font-bold rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 transition-all flex items-center gap-1 cursor-pointer">
              <lucide-icon [name]="Plus" size="13"></lucide-icon>
              <span>Agregar Cláusula</span>
            </button>
          </div>

          <!-- List of Clauses -->
          <div class="space-y-2">
            <div *ngFor="let clause of queryClauses; let i = index" class="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-700/60 transition-all">
              
              <!-- Logical Operator (AND/OR) -->
              <div class="w-full sm:w-24 shrink-0">
                <select *ngIf="i > 0" [(ngModel)]="clause.logicalOperator" (change)="buildWiqlFromClauses()" class="glass-input w-full text-xs font-bold text-indigo-600 dark:text-indigo-400">
                  <option value="AND">AND</option>
                  <option value="OR">OR</option>
                </select>
                <span *ngIf="i === 0" class="text-xs font-bold text-slate-400 px-2 py-1.5 block">Y si...</span>
              </div>

              <!-- Field Selector -->
              <div class="flex-1">
                <select [(ngModel)]="clause.field" (change)="buildWiqlFromClauses()" class="glass-input w-full text-xs font-semibold">
                  <option *ngFor="let f of availableFields" [value]="f.value">{{ f.label }}</option>
                </select>
              </div>

              <!-- Operator Selector -->
              <div class="w-full sm:w-44 shrink-0">
                <select [(ngModel)]="clause.operator" (change)="buildWiqlFromClauses()" class="glass-input w-full text-xs font-semibold">
                  <option *ngFor="let op of getOperatorsForField(clause.field)" [value]="op.value">{{ op.label }}</option>
                </select>
              </div>

              <!-- Value Input (Con selector multiple por comas para Work Item Type) -->
              <div class="flex-1">
                <!-- Special multiselect UI for Work Item Type -->
                <div *ngIf="clause.field === 'System.WorkItemType'" class="space-y-1.5">
                  <div class="flex flex-wrap gap-1 bg-white/80 dark:bg-slate-900/80 p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 min-h-[36px] items-center">
                    <button *ngFor="let typeName of availableWorkItemTypes" 
                            (click)="toggleWorkItemType(clause, typeName)"
                            type="button" 
                            [ngClass]="{
                              'bg-indigo-600 text-white border-indigo-600 shadow-xs': isTypeSelected(clause.value, typeName),
                              'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-indigo-300': !isTypeSelected(clause.value, typeName)
                            }"
                            class="px-2 py-0.5 text-[10px] font-bold rounded-lg border transition-all cursor-pointer flex items-center gap-1">
                      <span>{{ typeName }}</span>
                      <span *ngIf="isTypeSelected(clause.value, typeName)" class="text-[9px]">✓</span>
                    </button>
                  </div>
                  <input [(ngModel)]="clause.value" (input)="buildWiqlFromClauses()" type="text" placeholder="Tipos separados por coma (ej: Bug, User Story)" class="glass-input w-full text-[11px] font-mono py-1">
                </div>

                <!-- Special select UI for Area Path -->
                <div *ngIf="clause.field === 'System.AreaPath'" class="space-y-1">
                  <select [(ngModel)]="clause.value" (change)="buildWiqlFromClauses()" class="glass-input w-full text-xs font-medium">
                    <option value="">-- Seleccionar Área de Azure --</option>
                    <option *ngFor="let areaItem of availableAreaPaths" [value]="areaItem.path">
                      {{ areaItem.name }} ({{ areaItem.path }})
                    </option>
                  </select>
                  <input [(ngModel)]="clause.value" (input)="buildWiqlFromClauses()" type="text" placeholder="o escribe la ruta (ej: Bepensa\Mayansoft)" class="glass-input w-full text-[10px] font-mono py-1">
                </div>

                <!-- Special select UI for Iteration Path -->
                <div *ngIf="clause.field === 'System.IterationPath'" class="space-y-1">
                  <select [(ngModel)]="clause.value" (change)="buildWiqlFromClauses()" class="glass-input w-full text-xs font-medium">
                    <option value="">-- Seleccionar Iteración / Sprint --</option>
                    <option *ngFor="let iterItem of availableIterationPaths" [value]="iterItem.path">
                      {{ iterItem.name }} ({{ iterItem.path }})
                    </option>
                  </select>
                  <input [(ngModel)]="clause.value" (input)="buildWiqlFromClauses()" type="text" placeholder="o escribe la ruta del Sprint" class="glass-input w-full text-[10px] font-mono py-1">
                </div>

                <!-- Generic text input for other fields -->
                <input *ngIf="clause.field !== 'System.WorkItemType' && clause.field !== 'System.AreaPath' && clause.field !== 'System.IterationPath'" [(ngModel)]="clause.value" (input)="buildWiqlFromClauses()" type="text" placeholder="Valor (ej: Marlon, Active, Closed)" class="glass-input w-full text-xs font-mono">
              </div>

              <!-- Remove button -->
              <button (click)="removeClause(i)" [disabled]="queryClauses.length <= 1" type="button" class="p-2 text-slate-400 hover:text-rose-500 disabled:opacity-30 transition-all rounded-lg shrink-0 cursor-pointer" title="Eliminar fila">
                <lucide-icon [name]="Trash2" size="15"></lucide-icon>
              </button>
            </div>
          </div>
        </div>

        <!-- Consultas Guardadas en Azure DevOps (My Queries) -->
        <div class="space-y-2 pt-1">
          <div class="flex items-center justify-between">
            <label class="text-[11px] font-bold uppercase text-indigo-600 dark:text-indigo-400 tracking-wider flex items-center gap-1.5">
              <lucide-icon [name]="FolderOpen" size="13"></lucide-icon>
              <span>Mis Consultas Personales en Azure DevOps (My Queries):</span>
            </label>
            <button (click)="loadSavedQueriesFromAzure()" type="button" class="text-[11px] text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-1 cursor-pointer font-bold">
              <lucide-icon [name]="RefreshCw" size="12" [class.animate-spin]="isLoadingSavedQueries"></lucide-icon>
              <span>{{ isLoadingSavedQueries ? 'Cargando...' : 'Obtener Mis Consultas' }}</span>
            </button>
          </div>

          <div *ngIf="savedAzureQueries.length > 0" class="flex flex-wrap gap-2">
            <button *ngFor="let sq of savedAzureQueries" (click)="selectSavedQuery(sq)" type="button" class="px-3 py-1.5 text-xs font-semibold rounded-xl border bg-indigo-50/80 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800/60 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 hover:border-indigo-400 transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs">
              <lucide-icon [name]="FolderOpen" size="12" class="text-indigo-500"></lucide-icon>
              <span>{{ sq.name }}</span>
            </button>
          </div>

          <div *ngIf="savedAzureQueries.length === 0 && !isLoadingSavedQueries" class="text-xs text-slate-400 italic bg-white/40 dark:bg-slate-900/40 p-2.5 rounded-xl border border-slate-200/50 dark:border-slate-800/50 flex items-center justify-between">
            <span>No se encontraron consultas en tu carpeta personal 'My Queries' de Azure DevOps o falta presionar 'Obtener Mis Consultas'.</span>
            <button (click)="loadSavedQueriesFromAzure()" type="button" class="text-xs font-bold text-indigo-600 dark:text-indigo-400 underline cursor-pointer ml-2">Cargar Mis Consultas</button>
          </div>
        </div>

        <!-- Plantillas Predeterminadas de Consulta -->
        <div class="space-y-2 pt-1">
          <label class="text-[11px] font-bold uppercase text-slate-400 tracking-wider">Cargar Filtro Rápido:</label>
          <div class="flex flex-wrap gap-2">
            <button *ngFor="let tpl of wiqlTemplates" (click)="applyWiqlTemplate(tpl)" type="button" class="px-3 py-1.5 text-xs rounded-xl border bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 hover:border-indigo-300 transition-all cursor-pointer flex items-center gap-1.5">
              <lucide-icon [name]="Table" size="12" class="text-indigo-500"></lucide-icon>
              <span>{{ tpl.name }}</span>
            </button>
          </div>
        </div>

        <!-- Accordeon Avanzado para ver/editar codigo WIQL directo -->
        <details class="group">
          <summary class="text-xs font-semibold text-slate-400 hover:text-indigo-500 cursor-pointer select-none">
            ⚙️ Ver / Editar Código WIQL Generado Directo (Avanzado)
          </summary>
          <div class="mt-2">
            <textarea [(ngModel)]="customWiqlQuery" rows="3" placeholder="SELECT [System.Id], [System.Title] FROM WorkItems WHERE..." class="glass-input w-full font-mono text-[11px] leading-relaxed text-indigo-900 dark:text-indigo-200"></textarea>
          </div>
        </details>

        <!-- Status / Error Banner -->
        <div *ngIf="wiqlError" class="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-600 dark:text-rose-400 flex items-center gap-2">
          <lucide-icon [name]="AlertTriangle" size="14" class="shrink-0"></lucide-icon>
          <span>{{ wiqlError }}</span>
        </div>
      </div>

      <!-- Loading Skeleton for WIQL Query -->
      <app-table-skeleton 
        [isLoading]="isExecutingWiql" 
        message="Consultando Work Items en Azure DevOps via WIQL..." 
        [rowsCount]="6">
      </app-table-skeleton>

      <!-- Results Section -->
      <div *ngIf="!isExecutingWiql && (wiqlResults.length > 0 || hasSearchedWiql)" class="glass-card p-6 space-y-4">
        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div class="flex items-center gap-2">
            <h4 class="text-base font-bold text-slate-800 dark:text-white">Resultados de la Consulta ({{ filteredWiqlResults.length }} de {{ wiqlResults.length }})</h4>
          </div>

          <!-- Search Filter -->
          <div class="relative w-full sm:w-64">
            <lucide-icon [name]="Search" size="14" class="absolute left-3 top-2.5 text-slate-400"></lucide-icon>
            <input [(ngModel)]="wiqlSearchText" (input)="filterWiqlResults()" type="text" placeholder="Buscar en resultados..." class="glass-input w-full text-xs pl-8">
          </div>
        </div>

        <!-- Table -->
        <div class="overflow-hidden border border-slate-200/60 dark:border-slate-800/60 rounded-2xl">
          <div class="overflow-x-auto w-full max-h-[500px]">
            <table class="w-full border-collapse text-left text-xs">
              <thead class="sticky top-0 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold uppercase text-[10px] tracking-wider z-10">
                <tr>
                  <th class="px-4 py-3">ID</th>
                  <th class="px-4 py-3">Tipo</th>
                  <th class="px-4 py-3">Título</th>
                  <th class="px-4 py-3">Estado</th>
                  <th class="px-4 py-3">Asignado A</th>
                  <th class="px-4 py-3 text-right">Hrs. Completadas</th>
                  <th class="px-4 py-3 text-right">Size</th>
                  <th class="px-4 py-3">Área</th>
                  <th class="px-4 py-3">Iteración</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-150 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                <tr *ngFor="let item of filteredWiqlResults" class="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-all">
                  <td class="px-4 py-3 font-mono font-bold text-indigo-600 dark:text-indigo-400">#{{ item.id }}</td>
                  <td class="px-4 py-3">
                    <span class="px-2 py-0.5 text-[10px] font-bold rounded-full border" [ngClass]="{
                      'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300': item.type === 'User Story' || item.type === 'Requirement',
                      'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300': item.type === 'Bug',
                      'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300': item.type === 'Task',
                      'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300': item.type === 'Feature'
                    }">{{ item.type }}</span>
                  </td>
                  <td class="px-4 py-3 font-semibold max-w-xs truncate" [title]="item.title">{{ item.title }}</td>
                  <td class="px-4 py-3">
                    <span class="px-2 py-0.5 text-[10px] font-bold rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      {{ item.state }}
                    </span>
                  </td>
                  <td class="px-4 py-3 truncate max-w-[140px]" [title]="item.assignedTo">{{ item.assignedTo }}</td>
                  <td class="px-4 py-3 text-right font-mono font-bold">{{ item.completedWork | number:'1.1-2' }}</td>
                  <td class="px-4 py-3 text-right font-mono font-bold text-violet-600 dark:text-violet-400">{{ item.size }}</td>
                  <td class="px-4 py-3 text-[11px] text-slate-500 truncate max-w-[150px]" [title]="item.areaPath">{{ item.areaPath }}</td>
                  <td class="px-4 py-3 text-[11px] text-slate-500 truncate max-w-[150px]" [title]="item.iterationPath">{{ item.iterationPath }}</td>
                </tr>
                <tr *ngIf="filteredWiqlResults.length === 0" class="text-center text-slate-400 py-8">
                  <td colspan="9" class="py-8">No se encontraron Work Items con los filtros aplicados.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  </ng-container>

  <!-- MODAL: Guardar Consulta en Azure DevOps -->
  <div *ngIf="showSaveQueryModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
    <div class="glass-card w-full max-w-md p-6 space-y-5 border border-indigo-500/30 bg-white/95 dark:bg-slate-900/95 shadow-2xl">
      <div class="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
        <h3 class="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
          <lucide-icon [name]="Save" class="text-indigo-600 dark:text-indigo-400" size="18"></lucide-icon>
          Guardar Consulta en Azure DevOps
        </h3>
        <button (click)="closeSaveQueryModal()" class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm font-bold cursor-pointer">✕</button>
      </div>

      <div class="space-y-4">
        <div>
          <label class="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1">Nombre de la Consulta:</label>
          <input [(ngModel)]="saveQueryName" type="text" placeholder="Ej: Mis Bugs Críticos - 2026" class="glass-input w-full text-xs font-semibold">
        </div>

        <div>
          <label class="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1">Ubicación en Azure DevOps:</label>
          <select [(ngModel)]="saveQueryFolder" class="glass-input w-full text-xs font-semibold">
            <option value="My Queries">Mis Consultas (My Queries)</option>
            <option value="Shared Queries">Consultas Compartidas (Shared Queries)</option>
          </select>
        </div>

        <div *ngIf="saveQuerySuccessMsg" class="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
          <lucide-icon [name]="CheckCircle" size="14" class="shrink-0"></lucide-icon>
          <span>{{ saveQuerySuccessMsg }}</span>
        </div>

        <div *ngIf="saveQueryErrorMsg" class="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-600 dark:text-rose-400 flex items-center gap-2">
          <lucide-icon [name]="AlertTriangle" size="14" class="shrink-0"></lucide-icon>
          <span>{{ saveQueryErrorMsg }}</span>
        </div>
      </div>

      <div class="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
        <button (click)="closeSaveQueryModal()" type="button" class="px-4 py-2 text-xs font-bold rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer">
          Cancelar
        </button>
        <button (click)="confirmSaveQueryToAzure()" [disabled]="isSavingQuery" type="button" class="px-5 py-2 text-xs font-bold rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 transition-all flex items-center gap-1.5 cursor-pointer shadow-md shadow-indigo-600/20">
          <span *ngIf="isSavingQuery" class="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
          <lucide-icon *ngIf="!isSavingQuery" [name]="Save" size="14"></lucide-icon>
          <span>{{ isSavingQuery ? 'Guardando...' : 'Guardar en Azure' }}</span>
        </button>
      </div>
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

  activeTab: 'kpis' | 'wiql' = 'kpis';
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

  // --- WIQL STATE ---
  customWiqlQuery = `SELECT [System.Id], [System.WorkItemType], [System.Title], [System.State], [System.AssignedTo] FROM WorkItems WHERE [System.TeamProject] = @project ORDER BY [System.Id] DESC`;
  isExecutingWiql = false;
  hasSearchedWiql = false;
  wiqlError = '';
  wiqlSearchText = '';
  wiqlResults: WiqlQueryResultRow[] = [];
  filteredWiqlResults: WiqlQueryResultRow[] = [];

  wiqlTemplates = [
    {
      name: '🐛 Bugs Abiertos',
      query: `SELECT [System.Id], [System.WorkItemType], [System.Title], [System.State], [System.AssignedTo] FROM WorkItems WHERE [System.WorkItemType] = 'Bug' AND [System.State] IN ('New', 'Active', 'Approved') ORDER BY [System.Id] DESC`
    },
    {
      name: '📦 Entregables sin Size',
      query: `SELECT [System.Id], [System.WorkItemType], [System.Title], [System.State] FROM WorkItems WHERE [System.WorkItemType] IN ('User Story', 'Feature', 'Requirement') AND ([Microsoft.VSTS.Scheduling.Size] = 0 OR [Microsoft.VSTS.Scheduling.Size] IS NULL) ORDER BY [System.Id] DESC`
    },
    {
      name: '⏱️ Tareas con Horas Completadas',
      query: `SELECT [System.Id], [System.Title], [Microsoft.VSTS.Scheduling.CompletedWork], [System.AssignedTo] FROM WorkItems WHERE [System.WorkItemType] = 'Task' AND [Microsoft.VSTS.Scheduling.CompletedWork] > 0 ORDER BY [System.ChangedDate] DESC`
    },
    {
      name: '🎯 Features y User Stories Cerradas',
      query: `SELECT [System.Id], [System.WorkItemType], [System.Title], [System.State], [Microsoft.VSTS.Scheduling.Size] FROM WorkItems WHERE [System.WorkItemType] IN ('User Story', 'Feature') AND [System.State] IN ('Closed', 'Done', 'Resolved') ORDER BY [System.Id] DESC`
    }
  ];

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
  readonly Code = Code;
  readonly Play = Play;
  readonly Search = Search;
  readonly Table = Table;
  readonly Download = Download;
  readonly AlertTriangle = AlertTriangle;
  readonly Plus = Plus;
  readonly Trash2 = Trash2;
  readonly Filter = Filter;
  readonly Save = Save;
  readonly FolderOpen = FolderOpen;
  readonly CheckCircle = CheckCircle;

  // Modal Save Query state
  showSaveQueryModal = false;
  saveQueryName = '';
  saveQueryFolder = 'My Queries';
  isSavingQuery = false;
  saveQuerySuccessMsg = '';
  saveQueryErrorMsg = '';

  openSaveQueryModal() {
    this.showSaveQueryModal = true;
    this.saveQueryName = '';
    this.saveQuerySuccessMsg = '';
    this.saveQueryErrorMsg = '';
  }

  closeSaveQueryModal() {
    this.showSaveQueryModal = false;
  }

  confirmSaveQueryToAzure() {
    if (!this.saveQueryName.trim()) {
      this.saveQueryErrorMsg = 'Por favor escribe un nombre para la consulta.';
      return;
    }

    this.isSavingQuery = true;
    this.saveQueryErrorMsg = '';
    this.saveQuerySuccessMsg = '';

    this.adoService.saveQueryToAzureDevOps(this.saveQueryName.trim(), this.customWiqlQuery, this.saveQueryFolder).subscribe({
      next: () => {
        this.isSavingQuery = false;
        this.saveQuerySuccessMsg = `¡Consulta "${this.saveQueryName}" guardada exitosamente en Azure DevOps (${this.saveQueryFolder})!`;
        this.loadSavedQueriesFromAzure();
        setTimeout(() => {
          this.closeSaveQueryModal();
        }, 1800);
      },
      error: (err) => {
        this.isSavingQuery = false;
        this.saveQueryErrorMsg = err.error?.message || err.message || 'Error al guardar la consulta en Azure DevOps.';
      }
    });
  }

  // Saved Queries state
  savedAzureQueries: { id: string; name: string; path: string; wiql: string }[] = [];
  isLoadingSavedQueries = false;

  loadSavedQueriesFromAzure() {
    this.isLoadingSavedQueries = true;
    this.adoService.getSavedQueriesFromAzureDevOps().subscribe({
      next: (queries) => {
        this.isLoadingSavedQueries = false;
        this.savedAzureQueries = queries;
      },
      error: () => {
        this.isLoadingSavedQueries = false;
        this.savedAzureQueries = [];
      }
    });
  }

  selectSavedQuery(q: { name: string; wiql: string }) {
    if (!q || !q.wiql) return;
    this.saveQueryName = q.name || '';
    this.customWiqlQuery = q.wiql;
    this.parseWiqlToClauses(q.wiql);
  }

  /**
   * Parsea cualquier sentencia WIQL (incluyendo WorkItemLinks, Target.[Field], Source.[Field], etc.)
   * para reconstruir y prellenar la tabla de cláusulas visuales.
   */
  parseWiqlToClauses(wiql: string) {
    // 1. Extraer la sección de condiciones (entre WHERE y ORDER BY / MODE / final)
    const whereMatch = wiql.match(/WHERE\s+(.+?)(\s+ORDER\s+BY|\s+MODE|\s*$)/i);
    if (!whereMatch) return;

    let whereClause = whereMatch[1].trim();

    // 2. Extraer todas las expresiones de condicion individuales: (Source.|Target.)?[FieldName] OPERATOR VALUE
    // Ejemplo: Target.[System.WorkItemType] in ('User Story', 'Feature', 'Bug')
    // Ejemplo: Source.[System.IterationPath] under 'Bepensa - DSD Bebidas - OpeCD 2.0'
    // Ejemplo: [System.State] = 'Active'
    const clauseRegex = /(?:(Source|Target)\.)?\[([^\]]+)\]\s+(in|not in|under|not under|=|>|<|>=|<=|contains|not contains|is null|is not null|!=|<>)\s+('(?:''|[^'])*'|\((?:[^()]*|\((?:[^()]*)*\))*\)|[^\s()]+)/gi;

    const newClauses: { logicalOperator: 'AND' | 'OR'; field: string; operator: string; value: string }[] = [];
    const seenMap = new Set<string>();

    let match: RegExpExecArray | null;
    while ((match = clauseRegex.exec(whereClause)) !== null) {
      const prefix = match[1] ? match[1] + '.' : '';
      const rawFieldName = match[2];
      let operator = match[3].toUpperCase();
      let rawVal = match[4].trim();

      // Ignorar relaciones de jerarquía puras si se prefiere focus en los filtros de campos
      if (rawFieldName === 'System.Links.LinkType') continue;

      const field = rawFieldName; // ej: System.WorkItemType, System.State, System.IterationPath, etc.

      // Limpiar paréntesis y comillas del valor
      if (operator === 'IN' || operator === 'NOT IN') {
        rawVal = rawVal.replace(/^\(\s*/, '').replace(/\s*\)$/, '');
        rawVal = rawVal.split(',').map(v => v.trim().replace(/^'/, '').replace(/'$/, '').replace(/''/g, "'")).join(', ');
      } else {
        rawVal = rawVal.replace(/^'/, '').replace(/'$/, '').replace(/''/g, "'");
      }

      // Evitar duplicados exactos si provienen de múltiples sub-ramas (Source vs Target)
      const dedupeKey = `${field}:${operator}:${rawVal}`;
      if (!seenMap.has(dedupeKey)) {
        seenMap.add(dedupeKey);
        newClauses.push({
          logicalOperator: newClauses.length === 0 ? 'AND' : 'AND',
          field,
          operator,
          value: rawVal
        });
      }
    }

    if (newClauses.length > 0) {
      this.queryClauses = newClauses;
    }
  }

  // Visual Builder Clauses (Estilo Azure DevOps)
  queryClauses: { logicalOperator: 'AND' | 'OR'; field: string; operator: string; value: string }[] = [
    { logicalOperator: 'AND', field: 'System.WorkItemType', operator: '=', value: 'Bug' },
    { logicalOperator: 'AND', field: 'System.State', operator: 'IN', value: 'New, Active, Approved' }
  ];

  availableWorkItemTypes = [
    'Bug',
    'User Story',
    'Task',
    'Feature',
    'Requirement',
    'Epic',
    'Issue',
    'Defecto',
    'Requisito'
  ];

  availableFields = [
    { label: 'Work Item Type (Tipo)', value: 'System.WorkItemType' },
    { label: 'State (Estado)', value: 'System.State' },
    { label: 'Assigned To (Asignado A)', value: 'System.AssignedTo' },
    { label: 'Title (Título)', value: 'System.Title' },
    { label: 'Area Path (Área)', value: 'System.AreaPath' },
    { label: 'Iteration Path (Iteración)', value: 'System.IterationPath' },
    { label: 'Completed Work (Horas Comp.)', value: 'Microsoft.VSTS.Scheduling.CompletedWork' },
    { label: 'Size / Story Points', value: 'Microsoft.VSTS.Scheduling.Size' },
    { label: 'Tags (Etiquetas)', value: 'System.Tags' },
    { label: 'ID del Elemento', value: 'System.Id' }
  ];

  isTypeSelected(clauseValue: string, typeName: string): boolean {
    const selected = clauseValue.split(',').map(s => s.trim().toLowerCase());
    return selected.includes(typeName.toLowerCase());
  }

  toggleWorkItemType(clause: { value: string; operator: string }, typeName: string) {
    let selected = clause.value
      ? clause.value.split(',').map(s => s.trim()).filter(s => s.length > 0)
      : [];

    const index = selected.findIndex(s => s.toLowerCase() === typeName.toLowerCase());
    if (index >= 0) {
      selected.splice(index, 1);
    } else {
      selected.push(typeName);
    }

    clause.value = selected.join(', ');
    if (selected.length > 1 && (clause.operator === '=' || clause.operator === '')) {
      clause.operator = 'IN';
    } else if (selected.length <= 1 && clause.operator === 'IN') {
      clause.operator = '=';
    }

    this.buildWiqlFromClauses();
  }

  availableOperators = [
    { label: '= (Igual a)', value: '=' },
    { label: '<> (Diferente de)', value: '<>' },
    { label: 'UNDER (Bajo la ruta / sub-áreas)', value: 'UNDER' },
    { label: 'NOT UNDER (No bajo la ruta)', value: 'NOT UNDER' },
    { label: 'IN (En la lista)', value: 'IN' },
    { label: 'NOT IN (No en la lista)', value: 'NOT IN' },
    { label: 'CONTAINS (Contiene palabras)', value: 'CONTAINS' },
    { label: '> (Mayor que)', value: '>' },
    { label: '>= (Mayor o igual)', value: '>=' },
    { label: '< (Menor que)', value: '<' },
    { label: '<= (Menor o igual)', value: '<=' },
    { label: 'IS EMPTY (Está vacío)', value: 'IS EMPTY' },
    { label: 'IS NOT EMPTY (No está vacío)', value: 'IS NOT EMPTY' }
  ];

  getOperatorsForField(field: string) {
    if (field === 'System.AreaPath' || field === 'System.IterationPath') {
      return [
        { label: '= (Ruta exacta)', value: '=' },
        { label: '<> (Diferente de)', value: '<>' },
        { label: 'UNDER (Bajo la ruta / sub-áreas)', value: 'UNDER' },
        { label: 'NOT UNDER (No bajo la ruta)', value: 'NOT UNDER' },
        { label: 'IN (En la lista de rutas)', value: 'IN' },
        { label: 'NOT IN (No en la lista)', value: 'NOT IN' },
        { label: 'IS EMPTY (Está vacío)', value: 'IS EMPTY' }
      ];
    }
    return this.availableOperators;
  }

  addClause() {
    this.queryClauses.push({
      logicalOperator: 'AND',
      field: 'System.WorkItemType',
      operator: '=',
      value: ''
    });
    this.buildWiqlFromClauses();
  }

  removeClause(index: number) {
    if (this.queryClauses.length > 1) {
      this.queryClauses.splice(index, 1);
      this.buildWiqlFromClauses();
    }
  }

  buildWiqlFromClauses() {
    if (this.queryClauses.length === 0) {
      this.customWiqlQuery = `SELECT [System.Id], [System.WorkItemType], [System.Title], [System.State], [System.AssignedTo] FROM WorkItems ORDER BY [System.Id] DESC`;
      return;
    }

    const conditions = this.queryClauses.map((c, i) => {
      const prefix = i === 0 ? '' : `${c.logicalOperator} `;
      let valExpr = '';

      // Auto-switch to IN if operator is '=' but value contains multiple items separated by comma
      const isMultipleValues = c.value.includes(',');
      let effectiveOperator = c.operator;
      if (isMultipleValues && effectiveOperator === '=') {
        effectiveOperator = 'IN';
        c.operator = 'IN';
      }

      // Fix operator if area/iteration field was set to CONTAINS by mistake
      if ((c.field === 'System.AreaPath' || c.field === 'System.IterationPath') && effectiveOperator === 'CONTAINS') {
        effectiveOperator = 'UNDER';
        c.operator = 'UNDER';
      }

      if (effectiveOperator === 'IS EMPTY' || effectiveOperator === 'IS NOT EMPTY') {
        valExpr = `[${c.field}] ${effectiveOperator}`;
      } else if (effectiveOperator === 'IN' || effectiveOperator === 'NOT IN') {
        const items = c.value.split(',').map(v => v.trim()).filter(v => v.length > 0).map(v => `'${v}'`).join(', ');
        valExpr = `[${c.field}] ${effectiveOperator} (${items || "''"})`;
      } else if (effectiveOperator === 'CONTAINS') {
        valExpr = `[${c.field}] CONTAINS '${c.value}'`;
      } else if (effectiveOperator === 'UNDER' || effectiveOperator === 'NOT UNDER') {
        valExpr = `[${c.field}] ${effectiveOperator} '${c.value}'`;
      } else if (!isNaN(Number(c.value)) && c.value.trim() !== '') {
        valExpr = `[${c.field}] ${effectiveOperator} ${c.value}`;
      } else {
        valExpr = `[${c.field}] ${effectiveOperator} '${c.value}'`;
      }

      return `${prefix}${valExpr}`;
    }).join(' ');

    this.customWiqlQuery = `SELECT [System.Id], [System.WorkItemType], [System.Title], [System.State], [System.AssignedTo], [Microsoft.VSTS.Scheduling.CompletedWork], [Microsoft.VSTS.Scheduling.Size], [System.AreaPath], [System.IterationPath] FROM WorkItems WHERE ${conditions} ORDER BY [System.Id] DESC`;
  }

  private readonly STORAGE_KEY = 'cmmi5_kpi_report_selection_period';

  ngOnInit() {
    const currentYear = new Date().getFullYear();
    this.availableYears = [currentYear - 2, currentYear - 1, currentYear, currentYear + 1];

    this.loadSavedSelection();
    if (this.configService.getConfig()) {
      this.loadAreas();
      this.loadSavedQueriesFromAzure();
    }
  }

  applyWiqlTemplate(tpl: { name: string; query: string }) {
    this.customWiqlQuery = tpl.query;
  }

  runWiqlQuery() {
    if (!this.customWiqlQuery.trim()) return;

    this.isExecutingWiql = true;
    this.wiqlError = '';
    this.hasSearchedWiql = true;

    this.adoService.executeCustomWiqlQuery(this.customWiqlQuery.trim()).subscribe({
      next: (items) => {
        this.isExecutingWiql = false;
        this.wiqlResults = items.map((i: any) => {
          const assigned = i.fields['System.AssignedTo'];
          const assignedTo = assigned ? (typeof assigned === 'object' ? assigned.displayName : assigned) : 'Sin asignar';
          const size = i.fields['Microsoft.VSTS.Scheduling.Size'] || i.fields['Microsoft.VSTS.Scheduling.StoryPoints'] || 0;

          return {
            id: Number(i.id),
            type: i.fields['System.WorkItemType'] || '',
            title: i.fields['System.Title'] || '',
            state: i.fields['System.State'] || '',
            assignedTo,
            areaPath: i.fields['System.AreaPath'] || '',
            iterationPath: i.fields['System.IterationPath'] || '',
            completedWork: i.fields['Microsoft.VSTS.Scheduling.CompletedWork'] || 0,
            originalEstimate: i.fields['Microsoft.VSTS.Scheduling.OriginalEstimate'] || 0,
            remainingWork: i.fields['Microsoft.VSTS.Scheduling.RemainingWork'] || 0,
            size,
            tags: i.fields['System.Tags'] || '',
            createdDate: i.fields['System.CreatedDate'] || '',
            closedDate: i.fields['Microsoft.VSTS.Common.ClosedDate'] || ''
          };
        });
        this.filterWiqlResults();
      },
      error: (err) => {
        this.isExecutingWiql = false;
        this.wiqlError = err.message || 'Error al ejecutar la consulta WIQL en Azure DevOps.';
        this.wiqlResults = [];
        this.filteredWiqlResults = [];
      }
    });
  }

  filterWiqlResults() {
    const q = this.wiqlSearchText.toLowerCase().trim();
    if (!q) {
      this.filteredWiqlResults = [...this.wiqlResults];
      return;
    }
    this.filteredWiqlResults = this.wiqlResults.filter(r =>
      r.id.toString().includes(q) ||
      r.title.toLowerCase().includes(q) ||
      r.type.toLowerCase().includes(q) ||
      r.assignedTo.toLowerCase().includes(q) ||
      r.state.toLowerCase().includes(q) ||
      r.areaPath.toLowerCase().includes(q) ||
      r.iterationPath.toLowerCase().includes(q)
    );
  }

  exportWiqlToExcel() {
    if (this.wiqlResults.length === 0) return;

    const data = this.filteredWiqlResults.map(r => ({
      'ID': r.id,
      'Tipo Work Item': r.type,
      'Título': r.title,
      'Estado': r.state,
      'Asignado A': r.assignedTo,
      'Horas Completadas': r.completedWork,
      'Estimado Original': r.originalEstimate,
      'Horas Restantes': r.remainingWork,
      'Size / Story Points': r.size,
      'Área Path': r.areaPath,
      'Iteration Path': r.iterationPath,
      'Tags': r.tags,
      'Fecha Creación': r.createdDate,
      'Fecha Cierre': r.closedDate
    }));

    const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(data);
    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Resultados WIQL');
    XLSX.writeFile(wb, `Resultados_WIQL_Azure_${new Date().toISOString().slice(0, 10)}.xlsx`);
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

  availableAreaPaths: { name: string; path: string }[] = [];
  availableIterationPaths: { name: string; path: string }[] = [];

  loadAreas() {
    forkJoin({
      areas: this.adoService.getAreas(),
      iterations: this.adoService.getIterationNodes()
    }).subscribe({
      next: ({ areas, iterations }) => {
        this.areas = areas;
        this.availableAreaPaths = (areas || []).map((a: any) => ({
          name: a.name || a.path.split('\\').pop(),
          path: a.path
        }));
        this.availableIterationPaths = (iterations || []).map((it: any) => ({
          name: it.name || it.path.split('\\').pop(),
          path: it.path
        }));
        this.loadData();
      },
      error: () => {
        this.loadData();
      }
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

    let areaPath = this.selectedArea;
    if (!areaPath && this.areas.length > 0) {
      const msArea = this.areas.find(a => a.path.toLowerCase().includes('mayansoft'));
      areaPath = msArea ? msArea.path : this.areas[0].path;
    }
    if (!areaPath) areaPath = 'Mayansoft';

    let msAreaPath = '';
    if (this.areas.length > 0) {
      const msArea = this.areas.find(a => a.path.toLowerCase().includes('mayansoft'));
      msAreaPath = msArea ? msArea.path : '';
    }
    if (!msAreaPath) msAreaPath = 'Mayansoft';

    forkJoin({
      tasks: this.adoService.getKpiTasksForMonth(areaPath, year, monthStart, monthEnd),
      monthlyItems: this.adoService.getKpisForMonth(msAreaPath, year, monthStart, monthEnd)
    }).subscribe({
      next: ({ tasks, monthlyItems }) => {
        this.processKpis(tasks, monthlyItems, year, monthStart, monthEnd);
        this.isLoading = false;
      },
      error: () => {
        this.processKpis([], [], year, monthStart, monthEnd);
        this.isLoading = false;
      }
    });
  }

  private processKpis(tasks: any[], monthlyItems: any[], year: number, monthStart: number, monthEnd: number) {
    this.allTaskRecords = [];
    this.allSizeRecords = [];
    
    this.metrics = {
      iterationName: `${year}-${String(monthStart).padStart(2, '0')} a ${String(monthEnd).padStart(2, '0')}`,
      startDate: `${year}-${String(monthStart).padStart(2, '0')}-01`,
      endDate: ''
    } as any;

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
      
      const isReqOrBugOrFt = ['User Story', 'Requirement', 'Product Backlog Item', 'Requisito', 'Bug', 'Defecto', 'Feature'].includes(type);
      const isResolvedOrClosed = ['Closed', 'Resolved', 'Done', 'Completed'].includes(status);
      const isSizeValid = size > 1 && size < 56;
      const isMayansoft = areaPath.toLowerCase().includes('mayansoft');

      let hasNoParent = false;
      const isUserStoryOrReqOrFt = ['User Story', 'Requirement', 'Product Backlog Item', 'Requisito', 'Feature'].includes(type);
      if (isUserStoryOrReqOrFt) {
        hasNoParent = true;
      } else {
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
