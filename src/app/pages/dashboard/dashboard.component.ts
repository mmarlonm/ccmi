import { Component, OnInit, inject, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AzureDevOpsService } from '../../services/azure-devops.service';
import { AIService } from '../../services/ai.service';
import { PdfService } from '../../services/pdf.service';
import { CMMIMetrics } from '../../models/metrics.model';
import { MetricsApiService, VersionInfo } from '../../services/metrics-api.service';
import { LucideAngularModule, TrendingUp, Bug, AlertTriangle, Sparkles, Download, RefreshCw, Layers, Users, ChevronDown, CloudDownload, Search, DownloadCloud, ArrowUpRight, MessageSquare, Send, X, Bot, User, Copy, Check } from 'lucide-angular';
import { Chart, registerables } from 'chart.js';
import annotationPlugin from 'chartjs-plugin-annotation';

Chart.register(...registerables, annotationPlugin);

import { FormsModule } from '@angular/forms';
import { ConfigService } from '../../services/config.service';
import { PdfTemplateComponent } from '../../components/pdf-template/pdf-template.component';
import { NotificationService } from '../../services/notification.service';
import { forkJoin, of } from 'rxjs';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, FormsModule, PdfTemplateComponent],
  template: `
<div id="dashboard-content" class="h-full overflow-y-auto overflow-x-hidden space-y-8 animate-in fade-in duration-1000">
  <header class="sticky top-0 z-40 bg-slate-50 dark:bg-slate-900 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200 dark:border-slate-800 pb-4 pt-3 md:pt-4 -mx-2 md:-mx-2.5 px-2 md:px-2.5 mb-6 shadow-md transition-all duration-300">
    <div class="shrink-0">
      <h2 class="text-2xl font-bold text-slate-800 dark:text-white">Métricas CMMI 5</h2>
      <p class="text-slate-500 dark:text-slate-400 mt-1 text-xs">Formato BFYPH047 - Recopilación y Análisis de Métricas</p>
    </div>
    
    <!-- Controls Area: Grouped together in a flex column, aligned to the right inside the header -->
    <div class="flex flex-col items-end gap-1.5 w-full md:w-auto shrink-0">
      <!-- Selects and buttons in a single line -->
      <div class="flex flex-row items-center gap-2 md:gap-3 justify-end w-full shrink-0">
        <select [(ngModel)]="selectedArea" (change)="onSelectionChange()" class="glass-input text-xs font-medium w-28 md:w-32 shrink-0">
          <option value="">Todas las Áreas</option>
          <option *ngFor="let item of areas" [value]="item.path">{{ item.name }}</option>
        </select>
        <select [(ngModel)]="selectedIteration" (change)="onSelectionChange()" class="glass-input text-xs font-medium w-24 md:w-28 shrink-0">
          <option value="">Todas las Iteraciones</option>
          <option *ngFor="let item of iterations" [value]="item.id">{{ item.name }}</option>
        </select>

        <select [(ngModel)]="selectedISW" (change)="onISWChange()" class="glass-input text-xs font-medium w-32 md:w-36 border-indigo-200 dark:border-indigo-800 shrink-0">
          <option value="">Todos los ISW</option>
          <option *ngFor="let isw of iswList" [value]="isw">{{ isw }}</option>
        </select>

        <!-- Status Indicator (Mongo DB Atlas integration) -->
        <div *ngIf="selectedIteration" 
             class="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-bold border h-[38px] box-border shrink-0 select-none"
             [ngClass]="analysisVersions.length > 0 
               ? 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/20 dark:border-emerald-800/40 dark:text-emerald-400' 
               : 'bg-slate-50 border-slate-200 text-slate-500 dark:bg-slate-800/40 dark:border-slate-700/50 dark:text-slate-400'">
          <span class="w-1.5 h-1.5 rounded-full shrink-0" 
                [ngClass]="analysisVersions.length > 0 ? 'bg-emerald-500' : 'bg-slate-400'"></span>
          {{ analysisVersions.length > 0 ? 'Guardado en BD' : 'No Guardado en BD' }}
        </div>

        <!-- Action Buttons Tray -->
        <div class="flex items-center gap-2 shrink-0 bg-slate-200/50 dark:bg-slate-800/60 p-1 rounded-xl border border-slate-300/40 dark:border-slate-700/50 h-[38px] box-border">
          <div class="relative group">
            <button (click)="reloadSprintData()" [disabled]="isReloading || !selectedIteration" 
              class="glass-button flex items-center justify-center h-[30px] w-[30px] p-0 rounded-lg transition-all duration-300 hover:scale-105 active:scale-95 shadow-sm cursor-pointer">
              <lucide-icon [name]="RefreshCw" size="15" [class.animate-spin]="isReloading"></lucide-icon>
            </button>
            <div class="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-1.5 bg-slate-900 dark:bg-slate-800 text-white text-[11px] font-medium rounded-lg opacity-0 scale-75 pointer-events-none group-hover:opacity-100 group-hover:scale-100 transition-all duration-250 shadow-xl whitespace-nowrap z-50 border border-slate-700">
              Recargar Sprint
            </div>
          </div>

          <div class="relative group">
            <button (click)="runAI()" [disabled]="isAnalyzing || !metrics" 
              class="glass-button flex items-center justify-center h-[30px] w-[30px] p-0 rounded-lg transition-all duration-300 hover:scale-105 active:scale-95 bg-indigo-600 hover:bg-indigo-700 text-white shadow-md cursor-pointer">
              <lucide-icon [name]="Sparkles" size="15" [class.animate-spin]="isAnalyzing"></lucide-icon>
            </button>
            <div class="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-1.5 bg-slate-900 dark:bg-slate-800 text-white text-[11px] font-medium rounded-lg opacity-0 scale-75 pointer-events-none group-hover:opacity-100 group-hover:scale-100 transition-all duration-250 shadow-xl whitespace-nowrap z-50 border border-slate-700">
              {{ isAnalyzing ? 'Analizando...' : (aiAnalysis ? 'Volver a analizar IA' : 'Generar Análisis IA') }}
            </div>
          </div>

          <div class="relative group">
            <button (click)="export()" [disabled]="!metrics || isExporting" 
              class="glass-button flex items-center justify-center h-[30px] w-[30px] p-0 rounded-lg transition-all duration-300 hover:scale-105 active:scale-95 shadow-sm cursor-pointer">
              <lucide-icon [name]="isExporting ? RefreshCw : Download" size="15" [class.animate-spin]="isExporting"></lucide-icon>
            </button>
            <div class="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-1.5 bg-slate-900 dark:bg-slate-800 text-white text-[11px] font-medium rounded-lg opacity-0 scale-75 pointer-events-none group-hover:opacity-100 group-hover:scale-100 transition-all duration-250 shadow-xl whitespace-nowrap z-50 border border-slate-700">
              {{ isExporting ? 'Generando PDF...' : 'Exportar PDF' }}
            </div>
          </div>
        </div>
      </div>

      <!-- Sprint Dates Display directly under buttons in the same container -->
      <div *ngIf="metrics?.startDate && selectedIteration" class="animate-in fade-in duration-500 mr-1 flex flex-wrap items-center justify-end gap-2">
        <span class="text-[10px] font-bold text-slate-500 dark:text-slate-400">
          Vigencia del Sprint: <strong class="text-indigo-600 dark:text-indigo-400">{{ metrics!.startDate | date:'dd MMM':'UTC' }} - {{ metrics!.endDate | date:'dd MMM yyyy':'UTC' }}</strong>
        </span>
        <span *ngIf="selectedVersionNumber" class="text-[9px] font-black px-2 py-0.5 rounded bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300 uppercase shadow-sm border border-purple-100 dark:border-purple-900/50 flex items-center gap-0.5">
          <lucide-icon [name]="Check" size="10" class="text-purple-600 dark:text-purple-400"></lucide-icon>
          Guardado BD (v{{ selectedVersionNumber }})
        </span>
        <span *ngIf="!selectedVersionNumber" class="text-[9px] font-black px-2 py-0.5 rounded bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300 uppercase shadow-sm border border-amber-100 dark:border-amber-900/50 flex items-center gap-0.5">
          <lucide-icon [name]="AlertTriangle" size="10" class="text-amber-500"></lucide-icon>
          No Guardado en BD
        </span>
      </div>
    </div>
  </header>

  <div *ngIf="metrics" class="space-y-6 relative transition-all duration-300" [class.opacity-45]="isReloading" [class.pointer-events-none]="isReloading">

    <!-- Reloading premium backdrop overlay -->
    <div *ngIf="isReloading" class="absolute inset-0 flex items-center justify-center bg-slate-50/20 dark:bg-slate-950/20 backdrop-blur-[2px] z-50 rounded-3xl min-h-[400px]">
      <div class="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md px-6 py-4 rounded-2xl shadow-2xl border border-slate-200/60 dark:border-slate-800/60 flex items-center gap-3 animate-in zoom-in-95 duration-200 sticky top-1/2 -translate-y-1/2">
        <lucide-icon [name]="RefreshCw" size="20" class="animate-spin text-indigo-600 dark:text-indigo-400"></lucide-icon>
        <span class="text-sm font-black text-slate-700 dark:text-slate-200">Recargando datos...</span>
      </div>
    </div>
    <!-- Sprint Delivery Timeline & Compliance (Visual Widget) -->
    <section class="glass-card !bg-white dark:!bg-slate-900 border-l-4 border-indigo-600 overflow-visible shadow-lg animate-in fade-in duration-500">
      <div class="p-6">
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div class="flex items-center gap-3">
            <div class="p-2 bg-indigo-500 rounded-xl shadow-md text-white">
              <lucide-icon [name]="TrendingUp" size="20"></lucide-icon>
            </div>
            <div>
              <h3 class="text-lg font-black text-slate-800 dark:text-white uppercase tracking-tight">CUMPLIMIENTO Y LÍNEA DE TIEMPO DEL SPRINT</h3>
              <p class="text-xs text-slate-400 dark:text-slate-400">Distribución temporal de entregas construidas en el Sprint vs. Fase Extendida</p>
            </div>
          </div>
          <div class="flex flex-wrap items-center gap-2 self-start md:self-auto">
            <span class="text-[10px] font-black px-2.5 py-1 rounded bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 uppercase shadow-sm border border-indigo-100 dark:border-indigo-900/50">
              Vigencia Oficial: {{ metrics!.startDate | date:'dd MMM':'UTC' }} - {{ metrics!.endDate | date:'dd MMM yyyy':'UTC' }}
            </span>
            <span *ngIf="selectedVersionNumber" class="text-[10px] font-black px-2.5 py-1 rounded bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300 uppercase shadow-sm border border-purple-100 dark:border-purple-900/50 flex items-center gap-1">
              <lucide-icon [name]="Check" size="11" class="text-purple-600 dark:text-purple-400"></lucide-icon>
              Guardado BD (v{{ selectedVersionNumber }})
            </span>
            <span *ngIf="!selectedVersionNumber && aiAnalysis" class="text-[10px] font-black px-2.5 py-1 rounded bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300 uppercase shadow-sm border border-amber-100 dark:border-amber-900/50 flex items-center gap-1">
              <lucide-icon [name]="AlertTriangle" size="11" class="text-amber-500"></lucide-icon>
              No Guardado en BD (Local Cache)
            </span>
          </div>
        </div>

        <!-- Summary Widgets -->
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div class="bg-indigo-50/50 dark:bg-indigo-950/20 p-4 rounded-2xl border border-indigo-100/50 dark:border-indigo-900/30 flex items-center gap-3 transition-all hover:shadow-md">
            <div class="p-3 rounded-xl bg-indigo-500/10 dark:bg-indigo-400/10 text-indigo-600 dark:text-indigo-350 shrink-0">
              <lucide-icon [name]="Layers" size="20"></lucide-icon>
            </div>
            <div class="min-w-0">
              <div class="text-[9px] text-slate-400 uppercase font-black tracking-wide">Total Entregables</div>
              <div class="text-2xl font-black text-slate-800 dark:text-white">{{ metrics.developmentRate.totalItems }}</div>
            </div>
          </div>

          <div class="bg-emerald-50/40 dark:bg-emerald-950/20 p-4 rounded-2xl border border-emerald-100/50 dark:border-emerald-900/30 flex items-center gap-3 transition-all hover:shadow-md">
            <div class="p-3 rounded-xl bg-emerald-500/10 dark:bg-emerald-400/10 text-emerald-600 dark:text-emerald-350 shrink-0">
              <lucide-icon [name]="Sparkles" size="20"></lucide-icon>
            </div>
            <div class="min-w-0">
              <div class="text-[9px] text-slate-400 uppercase font-black tracking-wide">En Sprint (A Tiempo)</div>
              <div class="text-2xl font-black text-emerald-600 dark:text-emerald-400">{{ timelineSummary.onTimeCount }}</div>
            </div>
          </div>

          <div class="bg-amber-50/40 dark:bg-amber-950/20 p-4 rounded-2xl border border-amber-100/50 dark:border-amber-900/30 flex items-center gap-3 transition-all hover:shadow-md">
            <div class="p-3 rounded-xl bg-amber-500/10 dark:bg-amber-400/10 text-amber-600 dark:text-amber-400 shrink-0">
              <lucide-icon [name]="AlertTriangle" size="20"></lucide-icon>
            </div>
            <div class="min-w-0">
              <div class="text-[9px] text-slate-400 uppercase font-black tracking-wide">Fase Extendida (Dias)</div>
              <div class="text-2xl font-black text-amber-600 dark:text-amber-400">
                {{ timelineSummary.maxLateDays }}
              </div>
            </div>
          </div>

          <div class="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center gap-3 transition-all hover:shadow-md">
            <div class="p-3 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-500 shrink-0">
              <lucide-icon [name]="RefreshCw" size="20" class="animate-spin-slow"></lucide-icon>
            </div>
            <div class="min-w-0">
              <div class="text-[9px] text-slate-400 uppercase font-black tracking-wide">Pendientes / Abiertos</div>
              <div class="text-2xl font-black text-slate-500 dark:text-slate-400">{{ timelineSummary.openCount }}</div>
            </div>
          </div>
        </div>

        <!-- The Visual Timeline Track -->
        <div class="relative pt-28 pb-28 px-4 bg-slate-50 dark:bg-slate-800/20 rounded-3xl border border-slate-100 dark:border-slate-800 mb-6 overflow-visible">
          
          <!-- Timeline grid and markers -->
          <div class="relative h-6 w-full flex items-center">
            
            <!-- Track line -->
            <div class="absolute h-2 left-0 right-0 rounded-full flex overflow-hidden bg-slate-200 dark:bg-slate-700">
              <!-- Sprint Track: 70% -->
              <div class="h-full w-[70%] bg-gradient-to-r from-indigo-500/30 to-blue-500/50 border-r border-dashed border-indigo-400/50" title="Vigencia del Sprint"></div>
              <!-- Post-Sprint Track: 30% -->
              <div class="h-full w-[30%] bg-gradient-to-r from-amber-500/20 to-rose-500/30" title="Fase Extendida (Post-Sprint)"></div>
            </div>

            <!-- Start Sprint label marker -->
            <div class="absolute left-0 -top-8 flex flex-col items-start select-none">
              <span class="text-[8px] font-black text-slate-400 uppercase tracking-tight">Inicio Sprint</span>
              <span class="text-[10px] font-black text-slate-700 dark:text-slate-200">{{ metrics!.startDate | date:'dd MMM':'UTC' }}</span>
              <div class="w-1.5 h-1.5 rounded-full bg-indigo-500 border border-white dark:border-slate-900 mt-1"></div>
            </div>

            <!-- End Sprint label marker -->
            <div class="absolute left-[70%] -top-8 flex flex-col items-center select-none transform -translate-x-1/2">
              <span class="text-[8px] font-black text-slate-400 uppercase tracking-tight">Fin Sprint</span>
              <span class="text-[10px] font-black text-slate-700 dark:text-slate-200">{{ metrics!.endDate | date:'dd MMM':'UTC' }}</span>
              <div class="w-1.5 h-1.5 rounded-full bg-red-500 border border-white dark:border-slate-900 mt-1"></div>
            </div>

            <!-- End Timeline label marker -->
            <div class="absolute right-0 -top-8 flex flex-col items-end select-none">
              <span class="text-[8px] font-black text-slate-400 uppercase tracking-tight">Fase Ext. (+15 días)</span>
              <span class="text-[10px] font-black text-slate-400 dark:text-slate-500">{{ addDays(metrics!.endDate, 15) | date:'dd MMM':'UTC' }}</span>
              <div class="w-1.5 h-1.5 rounded-full bg-rose-400 border border-white dark:border-slate-900 mt-1"></div>
            </div>
          
            <!-- Dots for deliverables -->
            <ng-container *ngFor="let item of timelineSummary.items">
              <div 
                [style.left.%]="item.leftPct"
                [style.transform]="getTimelineTransform(item.verticalTier, 32)"
                (click)="openWorkItem(item.id)"
                class="absolute group/marker flex flex-col items-center z-10 hover:z-50 select-none cursor-pointer transition-all duration-300">
                
                <!-- Connection Line (Stem) to the track -->
                <div *ngIf="item.verticalTier > 0" 
                     class="absolute w-0.5 border-l border-dashed border-slate-350 dark:border-slate-650 z-0"
                     [ngStyle]="getTimelineStemStyle(item.verticalTier, 32)">
                </div>
                
                <!-- The Dot Marker -->
                <div class="w-5 h-5 rounded-full flex items-center justify-center border border-white dark:border-slate-900 shadow-md transition-all duration-300 transform"
                  [ngClass]="{
                    'bg-emerald-500 hover:scale-150': item.deliveryStatus === 'on-time',
                    'bg-amber-500 hover:scale-150': item.deliveryStatus === 'late',
                    'bg-slate-400 hover:scale-150 animate-pulse': item.deliveryStatus === 'open'
                  }">
                  <!-- Mini type letter inside dot -->
                  <span class="text-[8px] font-black text-white leading-none">
                    {{ item.type === 'Feature' ? 'F' : 'U' }}
                  </span>
                </div>

                <!-- Rich Tooltip on Hover -->
                <div class="absolute bottom-8 scale-0 group-hover/marker:scale-100 transition-all duration-200 origin-bottom bg-slate-950/95 dark:bg-slate-900/95 text-white p-3 rounded-xl border border-slate-800 shadow-xl w-60 z-50 text-left pointer-events-none">
                  <div class="flex items-center justify-between border-b border-slate-800 pb-1.5 mb-1.5">
                    <span class="px-2 py-0.5 rounded text-[8px] font-black uppercase text-white"
                      [ngClass]="{
                        'bg-purple-600': item.type === 'Feature',
                        'bg-blue-600': item.type === 'User Story'
                      }">
                      {{ item.type === 'Feature' ? 'FEATURE' : 'USER STORY' }}
                    </span>
                    <span class="text-[10px] font-black text-slate-400">#{{ item.id }}</span>
                  </div>
                  <div class="text-[11px] font-bold truncate mb-1 text-slate-100">{{ item.title }}</div>
                  
                  <div class="text-[9px] space-y-0.5 text-slate-300">
                    <div><span class="text-slate-500 font-bold">ISW:</span> {{ item.isw || 'Sin asignar' }}</div>
                    <div><span class="text-slate-500 font-bold">Estado:</span> {{ item.status }}</div>
                    
                    <!-- Child Bugs List -->
                    <div *ngIf="item.relatedBugs?.length" class="mt-2 pt-2 border-t border-slate-800/40">
                      <span class="text-rose-450 font-bold block mb-1">🐞 Defectos Asociados (Hijos):</span>
                      <div class="space-y-1 max-h-24 overflow-y-auto pr-1">
                        <div *ngFor="let bug of item.relatedBugs" class="flex items-center justify-between text-[8px] text-slate-400">
                          <span class="truncate max-w-[150px]">#{{ bug.id }}: {{ bug.title }}</span>
                          <span class="px-1 rounded font-bold uppercase text-[7px]" [ngClass]="bug.status === 'Closed' || bug.status === 'Resolved' || bug.status === 'Done' ? 'bg-emerald-950 text-emerald-400' : 'bg-rose-950 text-rose-400'">{{ bug.status }}</span>
                        </div>
                      </div>
                    </div>

                    <div class="pt-1 mt-1 border-t border-slate-800/50 flex items-center justify-between">
                      <span class="text-slate-550 font-bold">Entrega:</span>
                      <span class="font-bold uppercase" 
                        [ngClass]="{
                          'text-emerald-400': item.deliveryStatus === 'on-time',
                          'text-amber-400': item.deliveryStatus === 'late',
                          'text-slate-400': item.deliveryStatus === 'open'
                        }">
                        {{ 
                          item.deliveryStatus === 'on-time' ? 'A tiempo' : 
                          item.deliveryStatus === 'late' ? 'Tarde (+' + item.daysLate + ' días)' : 
                          'Abierto' 
                        }}
                      </span>
                    </div>
                    <div *ngIf="item.closedTime" class="text-[8px] text-slate-400 text-right mt-1">
                      Cerrado el {{ item.closedTime | date:'dd MMM yyyy hh:mm a' }}
                    </div>
                  </div>
                </div>

                <!-- Label showing item ID -->
                <span class="text-[8px] font-bold text-slate-500 dark:text-slate-400 mt-1 select-none bg-white dark:bg-slate-800 px-1 rounded border border-slate-100 dark:border-slate-700 shadow-sm transition-all group-hover/marker:text-blue-500 group-hover/marker:border-blue-200 group-hover/marker:underline">
                  #{{ item.id }}
                </span>
              </div>
            </ng-container>
          </div>
        </div>

        <!-- Legend / Info footer -->
        <div class="flex flex-wrap gap-4 md:gap-6 justify-center text-[9px] md:text-[10px] text-slate-500 bg-slate-50 dark:bg-slate-800/10 p-3 rounded-2xl border border-slate-100 dark:border-slate-800 mb-4">
          <span class="flex items-center gap-1.5">
            <span class="w-3 h-3 rounded-full bg-emerald-500 border border-white dark:border-slate-900"></span>
            <span><strong>A tiempo:</strong> Entregado antes del {{ metrics!.endDate | date:'dd MMM':'UTC' }}</span>
          </span>
          <span class="flex items-center gap-1.5">
            <span class="w-3 h-3 rounded-full bg-amber-500 border border-white dark:border-slate-900"></span>
            <span><strong>Fase Extendida:</strong> Entregado después de fecha límite</span>
          </span>
          <span class="flex items-center gap-1.5">
            <span class="w-3 h-3 rounded-full bg-slate-400 border border-white dark:border-slate-900 animate-pulse"></span>
            <span><strong>Pendiente:</strong> Abierto en Azure</span>
          </span>
        </div>

        <!-- General Timeline Analysis -->
        <div class="bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-slate-100 dark:border-slate-800 p-5">
          <h4 class="text-xs font-bold uppercase text-slate-500 dark:text-slate-400 mb-3 flex items-center gap-1.5">
            <lucide-icon [name]="Sparkles" size="13" class="text-indigo-500"></lucide-icon>
            Análisis General del Cumplimiento
          </h4>
          <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <div class="text-center p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
              <div class="text-[10px] text-slate-400 uppercase font-bold mb-1">% A Tiempo</div>
              <div class="text-xl font-black" [ngClass]="{
                'text-emerald-600': (timelineSummary.onTimeCount / (timelineSummary.onTimeCount + timelineSummary.lateCount || 1)) >= 0.8,
                'text-amber-600': (timelineSummary.onTimeCount / (timelineSummary.onTimeCount + timelineSummary.lateCount || 1)) >= 0.5 && (timelineSummary.onTimeCount / (timelineSummary.onTimeCount + timelineSummary.lateCount || 1)) < 0.8,
                'text-rose-600': (timelineSummary.onTimeCount / (timelineSummary.onTimeCount + timelineSummary.lateCount || 1)) < 0.5
              }">
                {{ timelineSummary.onTimeCount + timelineSummary.lateCount > 0 ? ((timelineSummary.onTimeCount / (timelineSummary.onTimeCount + timelineSummary.lateCount)) * 100 | number:'1.0-0') : '—' }}%
              </div>
            </div>
            <div class="text-center p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
              <div class="text-[10px] text-slate-400 uppercase font-bold mb-1">Entregas en Fase Ext.</div>
              <div class="text-xl font-black" [ngClass]="timelineSummary.lateCount > 0 ? 'text-amber-600' : 'text-emerald-600'">{{ timelineSummary.lateCount }}</div>
            </div>
            <div class="text-center p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
              <div class="text-[10px] text-slate-400 uppercase font-bold mb-1">Max. Días Retraso</div>
              <div class="text-xl font-black" [ngClass]="timelineSummary.maxLateDays > 5 ? 'text-rose-600' : timelineSummary.maxLateDays > 0 ? 'text-amber-600' : 'text-emerald-600'">{{ timelineSummary.maxLateDays }}</div>
            </div>
            <div class="text-center p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
              <div class="text-[10px] text-slate-400 uppercase font-bold mb-1">Promedio Retraso</div>
              <div class="text-xl font-black" [ngClass]="timelineSummary.avgLateDays > 3 ? 'text-rose-600' : timelineSummary.avgLateDays > 0 ? 'text-amber-600' : 'text-slate-500'">{{ timelineSummary.avgLateDays }}d</div>
            </div>
          </div>

          <!-- AI Timeline Analysis Box (same format as other metrics) -->
          <div class="space-y-4">
            <div *ngIf="metricAnalyses['cumplimiento']" class="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-lg border border-[rgb(255,77,17)]">
              <h4 class="text-xs font-bold uppercase text-[rgb(255,77,17)] mb-2 flex items-center justify-between w-full">
                <span class="flex items-center">
                  <lucide-icon [name]="Sparkles" size="14" class="mr-1"></lucide-icon>
                  Análisis de resultados e Acciones
                </span>
                <button (click)="copyAnalysis('cumplimiento', metricAnalyses['cumplimiento'])"
                        class="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-[rgb(255,77,17)] transition-all flex items-center gap-1 text-[10px] normal-case cursor-pointer"
                        [title]="copiedKeys['cumplimiento'] ? 'Copiado' : 'Copiar análisis'">
                  <lucide-icon [name]="copiedKeys['cumplimiento'] ? Check : Copy" size="12"></lucide-icon>
                  <span>{{ copiedKeys['cumplimiento'] ? '¡Copiado!' : 'Copiar' }}</span>
                </button>
              </h4>
              <div class="text-sm leading-relaxed text-slate-700 dark:text-slate-300" [innerHTML]="formatAnalysisText(metricAnalyses['cumplimiento'])">
              </div>
            </div>
            <div *ngIf="!metricAnalyses['cumplimiento']" class="text-sm opacity-50 p-4 bg-slate-50 dark:bg-slate-800/30 rounded-lg">
              Genera el análisis IA para visualizar las recomendaciones.
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Section 3.1: Development Rate -->
    <section class="glass-card !bg-white dark:!bg-slate-900 border-l-4 border-blue-500 overflow-hidden">
      <div class="p-6">
        <div class="flex items-center justify-between mb-2">
          
            <div class="flex items-center justify-between gap-4 mb-4 flex-wrap">
              <h3 class="text-lg font-bold text-slate-400 uppercase tracking-tight">3.1 Métrica: Cálculo de la Tasa de Desarrollo en Procesos de Software<span *ngIf="selectedSprintDisplayName" class="text-indigo-500 dark:text-indigo-400"> - {{ selectedSprintDisplayName }}</span></h3>
              <button 
                (click)="openCommentModal('tasaDev', '3.1 Métrica: Cálculo de la Tasa de Desarrollo en Procesos de Software')"
                [ngClass]="{
                  'border-emerald-300 bg-emerald-50/40 text-emerald-600 dark:border-emerald-900/50 dark:bg-emerald-950/20 dark:text-emerald-400': metricComments['tasaDev'] && metricComments['tasaDev'].trim(),
                  'border-slate-200 bg-slate-50/50 text-slate-550 dark:border-slate-700/60 dark:bg-slate-800/20 dark:text-slate-450': !metricComments['tasaDev'] || !metricComments['tasaDev'].trim()
                }"
                class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[11px] font-bold transition-all active:scale-95 shadow-sm">
                <lucide-icon [name]="MessageSquare" size="13" [class.text-emerald-500]="metricComments['tasaDev'] && metricComments['tasaDev'].trim()"></lucide-icon>
                <span>{{ metricComments['tasaDev'] && metricComments['tasaDev'].trim() ? 'Nota Guardada' : 'Agregar Nota/Contexto' }}</span>
                <span *ngIf="metricComments['tasaDev'] && metricComments['tasaDev'].trim()" class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              </button>
            </div>
    
          <div class="px-3 py-1 rounded-full text-xs font-bold uppercase" [ngClass]="{
            'bg-green-100 text-green-700': metrics.developmentRate.status === 'green',
            'bg-yellow-100 text-yellow-700': metrics.developmentRate.status === 'yellow',
            'bg-red-100 text-red-700': metrics.developmentRate.status === 'red'
          }">
            {{ metrics.developmentRate.status }}
          </div>
        </div>

        <p class="text-xs text-slate-500 mb-6 leading-relaxed bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border-l-2 border-blue-500">
          Esta métrica mide el esfuerzo (tiempo) promedio de atención por unidad de tamaño (size) para los <strong>requerimientos</strong>.
          <br><span class="font-bold text-slate-700 dark:text-slate-350">Umbrales:</span> Verde &le; 1.7 | Amarillo &le; 2.0 | Rojo &gt; 2.0
        </p>

        <!-- Summary KPIs -->
        <div class="grid grid-cols-2 md:grid-cols-6 gap-4 mb-8">
          <div class="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800 text-center">
            <div class="text-xs text-slate-400 uppercase font-bold mb-1">Total Ítems</div>
            <div class="text-2xl font-bold">{{ metrics.developmentRate.totalItems }}</div>
          </div>
          <div class="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800 text-center">
            <div class="text-xs text-slate-400 uppercase font-bold mb-1">Est. Original (H)</div>
            <div class="text-2xl font-bold">{{ getTotalOriginalEstimate() | number:'1.1-1' }}</div>
            <div class="text-[8pt] opacity-50">Horas planificadas</div>
          </div>
          <div class="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800 text-center">
            <div class="text-xs text-slate-400 uppercase font-bold mb-1">Esfuerzo Real (H)</div>
            <div class="text-2xl font-bold">{{ metrics.developmentRate.totalEffort.toFixed(2) }}</div>
          </div>
          <div class="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800 text-center">
            <div class="text-xs text-slate-400 uppercase font-bold mb-1">Size Total</div>
            <div class="text-2xl font-bold">{{ metrics.developmentRate.totalSize }}</div>
          </div>
          <div class="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800 text-center relative overflow-hidden">
            <div class="text-xs text-slate-400 uppercase font-bold mb-1">Desviación Std</div>
            <div class="text-2xl font-bold" [class.text-emerald-600]="metrics.developmentRate.stdDeviation <= 1.00" [class.text-rose-500]="metrics.developmentRate.stdDeviation > 1.00">
              {{ metrics.developmentRate.stdDeviation.toFixed(2) }}
            </div>
            <div class="text-[8pt] opacity-50">Umbrales: 1.00</div>
          </div>
          <div class="p-4 rounded-xl text-center relative overflow-hidden border transition-all duration-300" [ngClass]="{
            'bg-emerald-50/50 border-emerald-100 dark:bg-emerald-950/10 dark:border-emerald-900/30': metrics.developmentRate.status === 'green',
            'bg-amber-50/50 border-amber-100 dark:bg-amber-950/10 dark:border-amber-900/30': metrics.developmentRate.status === 'yellow',
            'bg-rose-50/50 border-rose-100 dark:bg-rose-950/10 dark:border-rose-900/30': metrics.developmentRate.status === 'red'
          }">
            <div class="text-xs uppercase font-bold mb-1" [ngClass]="{
              'text-emerald-600 dark:text-emerald-400': metrics.developmentRate.status === 'green',
              'text-amber-600 dark:text-amber-400': metrics.developmentRate.status === 'yellow',
              'text-rose-600 dark:text-rose-400': metrics.developmentRate.status === 'red'
            }">KPI Tasa</div>
            <div class="text-3xl font-black" [ngClass]="{
              'text-emerald-700 dark:text-emerald-300': metrics.developmentRate.status === 'green',
              'text-amber-700 dark:text-amber-300': metrics.developmentRate.status === 'yellow',
              'text-rose-700 dark:text-rose-300': metrics.developmentRate.status === 'red'
            }">{{ metrics.developmentRate.rate.toFixed(2) }}</div>
            <div class="text-[8pt] opacity-85" [ngClass]="{
              'text-emerald-600/85 dark:text-emerald-400/85': metrics.developmentRate.status === 'green',
              'text-amber-600/85 dark:text-amber-400/85': metrics.developmentRate.status === 'yellow',
              'text-rose-600/85 dark:text-rose-400/85': metrics.developmentRate.status === 'red'
            }">Umbrales: 1.7, 2.0</div>
          </div>
        </div>
        
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start mb-6">
          <div class="lg:col-span-12 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
            <div class="h-64">
              <canvas #devRateChart></canvas>
            </div>
          </div>
        </div>

        <div *ngIf="metricAnalyses['tasa de desarrollo']" class="mt-6 p-5 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-[rgb(255,77,17)] mb-8 animate-in fade-in duration-300">
          <h4 class="text-xs font-bold uppercase text-[rgb(255,77,17)] mb-2 flex items-center justify-between w-full">
            <span class="flex items-center">
              <lucide-icon [name]="Sparkles" size="14" class="mr-1"></lucide-icon>
              Análisis de resultados e Acciones
            </span>
            <button (click)="copyAnalysis('tasa de desarrollo', metricAnalyses['tasa de desarrollo'])" 
                    class="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-[rgb(255,77,17)] transition-all flex items-center gap-1 text-[10px] normal-case cursor-pointer"
                    [title]="copiedKeys['tasa de desarrollo'] ? 'Copiado' : 'Copiar análisis'">
              <lucide-icon [name]="copiedKeys['tasa de desarrollo'] ? Check : Copy" size="12"></lucide-icon>
              <span>{{ copiedKeys['tasa de desarrollo'] ? '¡Copiado!' : 'Copiar' }}</span>
            </button>
          </h4>
          <div class="text-sm leading-relaxed text-slate-700 dark:text-slate-300" [innerHTML]="formatAnalysisText(metricAnalyses['tasa de desarrollo'])">
          </div>
        </div>
        
        <div *ngIf="!metricAnalyses['tasa de desarrollo']" class="mt-6 mb-8 text-sm opacity-50 p-4 bg-slate-50 dark:bg-slate-800/30 rounded-lg">
          Genera el análisis IA para visualizar las recomendaciones.
        </div>

        <!-- Detail Table -->
        <div class="overflow-x-auto rounded-xl border border-slate-100 dark:border-slate-800">
          <table class="w-full text-left text-sm">
            <thead class="bg-slate-50 dark:bg-slate-800/50 text-slate-400 uppercase text-[10px] font-bold">
              <tr>
                <th class="px-3 py-3 w-8"></th>
                <th class="px-3 py-3">Tipo</th>
                <th class="px-3 py-3">ID</th>
                <th class="px-3 py-3">ISW Asignado</th>
                <th class="px-3 py-3 text-left">Entrega vs Sprint</th>
                <th class="px-3 py-3">Nivel</th>
                <th class="px-3 py-3 text-center">Size <span class="text-indigo-400 normal-case font-normal">(editable)</span></th>
                <th class="px-3 py-3 text-center">Size Ideal</th>
                <th class="px-3 py-3 text-center">Est. Original (H)</th>
                <th class="px-3 py-3 text-center">Real (H)</th>
                <th class="px-3 py-3 text-center">Tasa</th>
              </tr>
            </thead>
            <tbody>
              <ng-container *ngFor="let item of getSortedReworkItems()">
                <!-- Main row -->
                <tr class="border-t border-slate-100 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
                    [class.bg-purple-50]="item.type==='Feature' && !isDark()"
                    [class.bg-slate-800]="item.type==='Feature' && isDark()">
                  <td class="px-3 py-2 text-center">
                    <button *ngIf="item.tasks?.length || item.relatedBugs?.length" (click)="toggleExpand(item.id, 1)"
                      class="w-6 h-6 rounded-full flex items-center justify-center text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 transition-all">
                      <lucide-icon [name]="ChevronDown" size="14" class="transition-transform duration-200"
                        [class.-rotate-90]="!expandedItemsM1.has(item.id)"></lucide-icon>
                    </button>
                    <span *ngIf="!item.tasks?.length && !item.relatedBugs?.length" class="text-slate-200 text-xs">—</span>
                  </td>
                  <td class="px-3 py-2">
                    <span class="px-2 py-0.5 rounded text-[10px] font-bold"
                      [ngClass]="{'bg-purple-100 text-purple-700': item.type==='Feature', 'bg-blue-100 text-blue-700': item.type==='User Story'}">
                      {{ item.type === 'Feature' ? 'FT' : 'US' }}
                    </span>
                  </td>
                  <td class="px-3 py-2 text-blue-600 hover:text-blue-800 hover:underline cursor-pointer font-bold" (click)="openWorkItem(item.id)">#{{ item.id }}</td>
                  <td class="px-3 py-2 text-xs text-slate-600 dark:text-slate-300 max-w-[160px] truncate" [title]="item.isw">{{ item.isw }}</td>
                  <td class="px-3 py-2 text-left">
                    <div class="flex flex-col items-start gap-0.5">
                      <!-- Badge -->
                      <span class="px-1.5 py-0.5 rounded text-[9px] font-black uppercase flex items-center gap-1 select-none shadow-sm"
                        [ngClass]="{
                          'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300': getDeliveryInfo(item).status === 'on-time',
                          'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300': getDeliveryInfo(item).status === 'late',
                          'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400': getDeliveryInfo(item).status === 'open'
                        }">
                        <span class="w-1 h-1 rounded-full"
                          [ngClass]="{
                            'bg-emerald-500': getDeliveryInfo(item).status === 'on-time',
                            'bg-amber-500': getDeliveryInfo(item).status === 'late',
                            'bg-slate-400': getDeliveryInfo(item).status === 'open'
                          }"></span>
                        {{ 
                          getDeliveryInfo(item).status === 'on-time' ? 'En Sprint' : 
                          getDeliveryInfo(item).status === 'late' ? '+' + getDeliveryInfo(item).days + 'd Tarde' : 
                          'Abierto' 
                        }}
                      </span>
                      <!-- Delivery date sub-text -->
                      <span *ngIf="getDeliveryInfo(item).date" class="text-[8px] text-slate-400 font-semibold leading-none">
                        {{ getDeliveryInfo(item).date | date:'dd/MM/yyyy' }}
                      </span>
                    </div>
                  </td>
                  <td class="px-3 py-2"><span class="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-[10px]">{{ item.level }}</span></td>
                  <td class="px-3 py-2 text-center">
                    <div class="flex items-center justify-center gap-1">
                      <span *ngIf="item.sizeSource === 'field'" title="Campo Size" class="w-2 h-2 rounded-full bg-green-500 shrink-0"></span>
                      <span *ngIf="item.sizeSource === 'discussion'" title="Del Discussion" class="w-2 h-2 rounded-full bg-amber-400 shrink-0"></span>
                      <span *ngIf="item.sizeSource === 'manual'" title="Manual" class="w-2 h-2 rounded-full bg-blue-500 shrink-0"></span>
                      <span *ngIf="item.sizeSource === 'none'" title="Sin size" class="w-2 h-2 rounded-full bg-red-400 shrink-0"></span>
                      <input type="number" min="0" step="0.5"
                        [value]="item.sizeEdited ?? item.size"
                        (change)="onSizeChange(item, $event)"
                        class="w-14 text-center font-bold rounded border border-slate-200 dark:border-slate-700 bg-transparent focus:outline-none focus:ring-1 focus:ring-indigo-400 py-0.5 text-sm"
                        [class.text-blue-600]="item.sizeSource === 'manual'"
                        [class.text-amber-600]="item.sizeSource === 'discussion'" />
                    </div>
                    <div class="text-[9px] text-center mt-0.5"
                      [class.text-green-500]="item.sizeSource==='field'"
                      [class.text-amber-500]="item.sizeSource==='discussion'"
                      [class.text-blue-500]="item.sizeSource==='manual'"
                      [class.text-red-400]="item.sizeSource==='none'">
                      {{ item.sizeSource === 'field' ? 'campo' : item.sizeSource === 'discussion' ? 'discussion' : item.sizeSource === 'manual' ? 'manual' : 'sin size' }}
                    </div>
                  </td>
                  <td class="px-3 py-2 text-center font-bold text-indigo-600 dark:text-indigo-400 text-xs">
                    {{ item.effort | number:'1.1-1' }}
                  </td>
                  <td class="px-3 py-2 text-center">
                    <span class="text-slate-500 dark:text-slate-400 font-medium text-xs">{{ sumTasks(item.tasks, 'originalEstimate') | number:'1.1-1' }}</span>
                  </td>
                  <td class="px-3 py-2 text-center">
                    <span class="text-emerald-600 dark:text-emerald-400 font-bold text-xs">{{ sumTasks(item.tasks, 'completedWork') | number:'1.1-1' }}</span>
                  </td>
                  <td class="px-3 py-2 text-center">
                    <span class="px-2 py-1 rounded-lg font-bold text-xs" [ngClass]="{
                      'text-green-600 bg-green-50': getEffectiveRate(item) <= 1.7,
                      'text-yellow-600 bg-yellow-50': getEffectiveRate(item) > 1.7 && getEffectiveRate(item) <= 2.0,
                      'text-red-600 bg-red-50': getEffectiveRate(item) > 2.0
                    }">{{ getEffectiveRate(item).toFixed(2) }}</span>
                  </td>
                </tr>

                <!-- Collapse: child tasks -->
                <tr *ngIf="expandedItemsM1.has(item.id) && (item.tasks?.length || item.relatedBugs?.length)" class="bg-slate-50/70 dark:bg-slate-800/40">
                  <td colspan="11" class="px-8 pb-3 pt-2">
                    <!-- Tasks Table -->
                    <div *ngIf="item.tasks?.length" class="rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 mt-1">
                      <table class="w-full text-xs">
                        <thead class="bg-slate-100 dark:bg-slate-700/60 text-slate-400 uppercase text-[10px]">
                          <tr>
                            <th class="px-3 py-2 text-left">ID</th>
                            <th class="px-3 py-2 text-left">Tarea</th>
                            <th class="px-3 py-2 text-left">Asignado</th>
                            <th class="px-3 py-2 text-center">Estimado (H)</th>
                            <th class="px-3 py-2 text-center">Completado (H)</th>
                            <th class="px-3 py-2 text-center">Desviación</th>
                          </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-100 dark:divide-slate-700">
                          <tr *ngFor="let task of item.tasks" class="hover:bg-white dark:hover:bg-slate-800 transition-colors">
                            <td class="px-3 py-1.5 text-blue-500 hover:text-blue-700 hover:underline cursor-pointer font-bold" (click)="openWorkItem(task.id)">#{{ task.id }}</td>
                            <td class="px-3 py-1.5 text-slate-700 dark:text-slate-350 max-w-[300px] truncate" [title]="task.title">{{ task.title }}</td>
                            <td class="px-3 py-1.5 text-slate-500 max-w-[120px] truncate" [title]="task.assignedTo">{{ task.assignedTo }}</td>
                            <td class="px-3 py-1.5 text-center font-medium">{{ formatEffort(task.originalEstimate) }}</td>
                            <td class="px-3 py-1.5 text-center font-medium text-emerald-600">{{ formatEffort(task.completedWork) }}</td>
                            <td class="px-3 py-1.5 text-center">
                              <div class="flex flex-col items-center">
                                <span class="px-1.5 py-0.5 rounded text-[10px] font-bold"
                                  [ngClass]="getTaskDeviationClass(task)">
                                  {{ getTaskDeviationString(task) }}
                                </span>
                                <span *ngIf="task.remainingWork > 0" class="text-[8px] text-red-500 font-bold flex items-center gap-0.5 mt-0.5" title="¡Cuidado! Hay Remaining Work > 0">
                                  <lucide-icon [name]="AlertTriangle" size="8"></lucide-icon>
                                  {{ task.remainingWork }}h pend.
                                </span>
                              </div>
                            </td>
                          </tr>
                        </tbody>
                        <tfoot class="bg-slate-100 dark:bg-slate-700/40 font-bold text-[10px] text-slate-500">
                          <tr>
                            <td colspan="3" class="px-3 py-1.5 text-right uppercase tracking-wide">Total:</td>
                            <td class="px-3 py-1.5 text-center">{{ sumTasks(item.tasks, 'originalEstimate') | number:'1.1-1' }}</td>
                            <td class="px-3 py-1.5 text-center text-emerald-600">{{ sumTasks(item.tasks, 'completedWork') | number:'1.1-1' }}</td>
                            <td class="px-3 py-1.5 text-center"></td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                    <div *ngIf="!item.tasks?.length" class="text-xs text-slate-400 italic py-2 text-center">
                      Sin tareas con patrón "{{ item.type === 'Feature' ? 'FT' : 'US' }} {{ item.id }}:"
                    </div>

                    <!-- Related Bugs Table -->
                    <div *ngIf="item.relatedBugs?.length" class="mt-3">
                      <div class="text-[10px] font-black text-rose-500 dark:text-rose-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                        <lucide-icon [name]="Bug" size="12" class="text-rose-500"></lucide-icon>
                        Bugs Relacionados ({{ item.relatedBugs?.length }})
                      </div>
                      <div class="rounded-lg overflow-hidden border border-rose-200 dark:border-rose-900/40 bg-rose-50/20 dark:bg-rose-950/10">
                        <table class="w-full text-xs">
                          <thead class="bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 uppercase text-[9px] font-bold">
                            <tr>
                              <th class="px-3 py-2 text-left">ID Bug</th>
                              <th class="px-3 py-2 text-left">Título</th>
                              <th class="px-3 py-2 text-left">Asignado</th>
                              <th class="px-3 py-2 text-left">Estado</th>
                              <th class="px-3 py-2 text-center">Estimado (H)</th>
                              <th class="px-3 py-2 text-center">Real (H)</th>
                            </tr>
                          </thead>
                          <tbody class="divide-y divide-rose-100 dark:divide-rose-900/20">
                            <tr *ngFor="let bug of item.relatedBugs" class="hover:bg-white/80 dark:hover:bg-slate-800/80 transition-colors">
                              <td class="px-3 py-1.5 text-rose-600 hover:text-rose-800 hover:underline cursor-pointer font-bold" (click)="openWorkItem(bug.id)">#{{ bug.id }}</td>
                              <td class="px-3 py-1.5 text-slate-700 dark:text-slate-350 max-w-[300px] truncate" [title]="bug.title">{{ bug.title }}</td>
                              <td class="px-3 py-1.5 text-slate-500 max-w-[120px] truncate" [title]="bug.assignedTo">{{ bug.assignedTo }}</td>
                              <td class="px-3 py-1.5">
                                <span class="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase"
                                  [ngClass]="{
                                    'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300': bug.status === 'Closed' || bug.status === 'Resolved',
                                    'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300': bug.status === 'Active',
                                    'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300': bug.status === 'Proposed' || bug.status === 'New'
                                  }">
                                  {{ bug.status }}
                                </span>
                              </td>
                              <td class="px-3 py-1.5 text-center font-medium">{{ bug.originalEstimate | number:'1.1-1' }}</td>
                              <td class="px-3 py-1.5 text-center font-medium text-emerald-600">{{ bug.completedWork | number:'1.1-1' }}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </td>
                </tr>
              </ng-container>
            </tbody>
          </table>
        </div>
        <!-- Size legend -->
        <div class="flex gap-4 text-[10px] text-slate-400 mt-2 px-1">
          <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-green-500"></span> Campo Size</span>
          <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-amber-400"></span> Discussion</span>
          <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-blue-500"></span> Manual</span>
          <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-red-400"></span> Sin size</span>
        </div>
      </div>
    </section>

    <!-- Section 3.2: Effort -->
    <section class="glass-card !bg-white dark:!bg-slate-900 border-l-4 border-violet-500 overflow-hidden">
      <div class="p-6">
        <div class="flex items-center justify-between mb-2">
          <div class="flex flex-col">
            
            <div class="flex items-center justify-between gap-4 mb-4 flex-wrap">
              <h3 class="text-lg font-bold text-slate-400 uppercase tracking-tight">3.2 Métrica: Desviación de estimación de desarrollo<span *ngIf="selectedSprintDisplayName" class="text-indigo-500 dark:text-indigo-400"> - {{ selectedSprintDisplayName }}</span></h3>
              <button 
                (click)="openCommentModal('desviacion', '3.2 Métrica: Desviación de estimación de desarrollo')"
                [ngClass]="{
                  'border-emerald-300 bg-emerald-50/40 text-emerald-600 dark:border-emerald-900/50 dark:bg-emerald-950/20 dark:text-emerald-400': metricComments['desviacion'] && metricComments['desviacion'].trim(),
                  'border-slate-200 bg-slate-50/50 text-slate-550 dark:border-slate-700/60 dark:bg-slate-800/20 dark:text-slate-450': !metricComments['desviacion'] || !metricComments['desviacion'].trim()
                }"
                class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[11px] font-bold transition-all active:scale-95 shadow-sm">
                <lucide-icon [name]="MessageSquare" size="13" [class.text-emerald-500]="metricComments['desviacion'] && metricComments['desviacion'].trim()"></lucide-icon>
                <span>{{ metricComments['desviacion'] && metricComments['desviacion'].trim() ? 'Nota Guardada' : 'Agregar Nota/Contexto' }}</span>
                <span *ngIf="metricComments['desviacion'] && metricComments['desviacion'].trim()" class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              </button>
            </div>
    
            <!-- Validation Warning -->
            <div *ngIf="getTotalRemainingWork() > 0" class="flex items-center gap-1.5 text-[10px] text-red-500 font-bold bg-red-50 px-2 py-0.5 rounded mt-1 border border-red-100">
              <lucide-icon [name]="AlertTriangle" size="10"></lucide-icon>
              DATOS NO VÁLIDOS: Existen {{ getTotalRemainingWork() | number:'1.1-1' }}h de Trabajo Pendiente (Remaining Work).
            </div>
          </div>
          <div class="px-3 py-1 rounded-full text-xs font-bold uppercase" [ngClass]="{
            'bg-green-100 text-green-700': metrics.effortVariance.status === 'green',
            'bg-yellow-100 text-yellow-700': metrics.effortVariance.status === 'yellow',
            'bg-red-100 text-red-700': metrics.effortVariance.status === 'red'
          }">
            {{ metrics.effortVariance.status }}
          </div>
        </div>

        <p class="text-xs text-slate-550 mb-6 leading-relaxed bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border-l-2 border-violet-500">
          Según fuentes oficiales Cálculo de la Desviación de Estimación de Desarrollo.
          <br><strong>Fórmula:</strong> Tasa de Desviación de Esfuerzo = [(Esfuerzo Real - Esfuerzo Planeado) / Esfuerzo Planeado] x 100
          <br><strong>Esfuerzo Real:</strong> Suma del "Completed Work" de las tareas.
          <br><strong>Esfuerzo Planeado:</strong> Suma del "Original Estimate" de las tareas.
          <br><strong>Procedimiento:</strong> Se calcula la variación porcentual entre el esfuerzo real registrado frente a la estimación original planificada para los entregables cerrados.
          <br><span class="font-bold text-slate-700 dark:text-slate-350">Umbrales:</span> Verde &le; 15% | Amarillo &le; 30% | Rojo &gt; 30%
        </p>

        <!-- Summary KPIs (like image) -->
        <div class="grid grid-cols-2 md:grid-cols-6 gap-4 mb-8">
          <div class="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800 text-center">
            <div class="text-xs text-slate-400 uppercase font-bold mb-1">Total Ítems</div>
            <div class="text-2xl font-bold">{{ metrics.developmentRate.totalItems }}</div>
          </div>
          <div class="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800 text-center">
            <div class="text-xs text-slate-400 uppercase font-bold mb-1">Total Estimado (H)</div>
            <div class="text-2xl font-bold">{{ metrics.effortVariance.planned | number:'1.2-2' }}</div>
          </div>
          <div class="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800 text-center">
            <div class="text-xs text-slate-400 uppercase font-bold mb-1">Total Real (H)</div>
            <div class="text-2xl font-bold">{{ metrics.effortVariance.actual | number:'1.2-2' }}</div>
          </div>
          <div class="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800 text-center">
            <div class="text-xs text-slate-400 uppercase font-bold mb-1">KPI % Desviación Global</div>
            <div class="text-2xl font-bold">
              {{ (metrics.effortVariance.rate * 100) > 0 ? '+' : '' }}{{ (metrics.effortVariance.rate * 100).toFixed(2) }}%
            </div>
            <div class="text-[8pt] opacity-50">Umbrales: 15%, 30%</div>
          </div>
          <div class="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800 text-center">
            <div class="text-xs text-slate-400 uppercase font-bold mb-1">Promedio % Desviación Ind.</div>
            <div class="text-2xl font-bold">{{ (metrics.effortVariance.avgIndividualRate || 0).toFixed(2) }}%</div>
          </div>
          <div class="p-4 rounded-xl text-center relative overflow-hidden border transition-all duration-300" [ngClass]="{
            'bg-emerald-50/50 border-emerald-100 dark:bg-emerald-950/10 dark:border-emerald-900/30': metrics.effortVariance.status === 'green',
            'bg-amber-50/50 border-amber-100 dark:bg-amber-950/10 dark:border-amber-900/30': metrics.effortVariance.status === 'yellow',
            'bg-rose-50/50 border-rose-100 dark:bg-rose-950/10 dark:border-rose-900/30': metrics.effortVariance.status === 'red'
          }">
            <div class="text-xs uppercase font-bold mb-1" [ngClass]="{
              'text-emerald-600 dark:text-emerald-400': metrics.effortVariance.status === 'green',
              'text-amber-600 dark:text-amber-400': metrics.effortVariance.status === 'yellow',
              'text-rose-600 dark:text-rose-400': metrics.effortVariance.status === 'red'
            }">Desviación Absoluta</div>
            <div class="text-3xl font-black" [ngClass]="{
              'text-emerald-700 dark:text-emerald-300': metrics.effortVariance.status === 'green',
              'text-amber-700 dark:text-amber-300': metrics.effortVariance.status === 'yellow',
              'text-rose-700 dark:text-rose-300': metrics.effortVariance.status === 'red'
            }">
              {{ (metrics.effortVariance.absoluteRate * 100).toFixed(2) }}%
            </div>
            <div class="text-[8pt] mt-1 opacity-80" [ngClass]="{
              'text-emerald-600/85 dark:text-emerald-400/85': metrics.effortVariance.status === 'green',
              'text-amber-600/85 dark:text-amber-400/85': metrics.effortVariance.status === 'yellow',
              'text-rose-600/85 dark:text-rose-400/85': metrics.effortVariance.status === 'red'
            }">Umbrales: 15%, 30%</div>
          </div>
        </div>
        
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start mb-6">
          <div class="lg:col-span-12 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
            <div class="h-64">
              <canvas #effortChart></canvas>
            </div>
          </div>
        </div>

        <div class="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-lg border border-[rgb(255,77,17)] mb-8 animate-in fade-in duration-300">
          <h4 class="text-xs font-bold uppercase text-[rgb(255,77,17)] mb-2 flex items-center justify-between w-full">
            <span class="flex items-center">
              <lucide-icon [name]="Sparkles" size="14" class="mr-1"></lucide-icon>
              Análisis de resultados e Acciones
            </span>
            <button *ngIf="metricAnalyses['tasa de desviación']" 
                    (click)="copyAnalysis('tasa de desviación', metricAnalyses['tasa de desviación'])" 
                    class="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-[rgb(255,77,17)] transition-all flex items-center gap-1 text-[10px] normal-case cursor-pointer"
                    [title]="copiedKeys['tasa de desviación'] ? 'Copiado' : 'Copiar análisis'">
              <lucide-icon [name]="copiedKeys['tasa de desviación'] ? Check : Copy" size="12"></lucide-icon>
              <span>{{ copiedKeys['tasa de desviación'] ? '¡Copiado!' : 'Copiar' }}</span>
            </button>
          </h4>
          <div *ngIf="metricAnalyses['tasa de desviación']" class="text-sm leading-relaxed text-slate-700 dark:text-slate-300" [innerHTML]="formatAnalysisText(metricAnalyses['tasa de desviación'], true)">
          </div>
          <div *ngIf="!metricAnalyses['tasa de desviación']" class="text-sm opacity-50">
            Genera el análisis IA para visualizar las recomendaciones.
          </div>
        </div>
      </div>
    </section>

    <!-- Section 3.2.5: Individual ISW Metrics -->
    <section class="glass-card !bg-white dark:!bg-slate-900 border-l-4 border-violet-400 overflow-hidden">
      <div class="p-6">
        <h3 class="text-lg font-bold text-slate-400 uppercase tracking-tight mb-6 flex items-center gap-2">
          <lucide-icon [name]="Users" size="20"></lucide-icon>
          Métricas Individuales por ISW
        </h3>

        <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          <div *ngFor="let g of iswMetrics" class="bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800 p-5 hover:shadow-lg transition-all duration-300">
            <div class="flex items-center justify-between mb-4">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-500 font-bold uppercase">
                  {{ g.name.substring(0,2) }}
                </div>
                <div>
                  <div class="text-sm font-bold text-slate-800 dark:text-slate-100">{{ g.name }}</div>
                  <div class="text-[10px] text-slate-400 uppercase font-bold">{{ g.itemsCount }} ítems asignados</div>
                </div>
              </div>
            </div>

            <div class="space-y-4">
              <!-- Dev Rate ISW -->
              <div class="flex items-center justify-between">
                <div class="text-xs text-slate-500">Tasa de Desarrollo</div>
                <div class="flex items-center gap-2">
                  <span class="text-sm font-black" [class.text-emerald-500]="g.devRate <= 1.7" [class.text-amber-500]="g.devRate > 1.7 && g.devRate <= 2.0" [class.text-red-500]="g.devRate > 2.0">
                    {{ g.devRate.toFixed(2) }}
                  </span>
                  <div class="w-2 h-2 rounded-full" [class.bg-emerald-500]="g.devRate <= 1.7" [class.bg-amber-500]="g.devRate > 1.7 && g.devRate <= 2.0" [class.bg-red-500]="g.devRate > 2.0"></div>
                </div>
              </div>

              <!-- Effort Variance ISW -->
              <div class="flex items-center justify-between">
                <div class="text-xs text-slate-500">Desviación Esfuerzo</div>
                <div class="flex items-center gap-2">
                  <span class="text-sm font-black" [class.text-emerald-500]="g.effortVariance <= 15" [class.text-amber-500]="g.effortVariance > 15 && g.effortVariance <= 30" [class.text-red-500]="g.effortVariance > 30">
                    {{ g.effortVariance.toFixed(1) }}%
                  </span>
                  <div class="w-2 h-2 rounded-full" [class.bg-emerald-500]="g.effortVariance <= 15" [class.bg-amber-500]="g.effortVariance > 15 && g.effortVariance <= 30" [class.bg-red-500]="g.effortVariance > 30"></div>
                </div>
              </div>

              <!-- Rework Rate ISW -->
              <div class="flex items-center justify-between">
                <div class="text-xs text-slate-500">Tasa de Retrabajo</div>
                <div class="flex items-center gap-2">
                  <span class="text-sm font-black" [class.text-emerald-500]="g.reworkRate <= 22" [class.text-amber-500]="g.reworkRate > 22 && g.reworkRate <= 30" [class.text-red-500]="g.reworkRate > 30">
                    {{ (g.reworkRate || 0).toFixed(1) }}%
                  </span>
                  <div class="w-2 h-2 rounded-full" [class.bg-emerald-500]="g.reworkRate <= 22" [class.bg-amber-500]="g.reworkRate > 22 && g.reworkRate <= 30" [class.bg-red-500]="g.reworkRate > 30"></div>
                </div>
              </div>

              <!-- Effort Progress Bar -->
              <div class="pt-2">
                <div class="flex justify-between text-[9px] uppercase font-bold text-slate-400 mb-1">
                  <span>Esfuerzo (Est vs Real)</span>
                  <span>{{ g.totalEffort.toFixed(1) }} / {{ g.totalPlanned.toFixed(1) }}h</span>
                </div>
                <div class="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                  <div class="h-full transition-all duration-500" 
                    [style.width.%]="g.totalPlanned > 0 ? (g.totalEffort / g.totalPlanned * 100) : 0"
                    [class.bg-emerald-500]="g.effortVariance <= 15"
                    [class.bg-amber-500]="g.effortVariance > 15 && g.effortVariance <= 30"
                    [class.bg-red-500]="g.effortVariance > 30">
                  </div>
                </div>
              </div>

              <!-- Detailed Items Breakdown -->
              <div class="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                <div class="text-[10px] uppercase font-bold text-slate-400 mb-2 flex items-center justify-between">
                  <span>Desglose por Ítem</span>
                  <span class="text-[8px] text-slate-300">Haz clic para ver tareas</span>
                </div>
                <div class="space-y-1.5 max-h-64 overflow-y-auto pr-1 custom-scrollbar">
                  <div *ngFor="let item of g.items" class="group flex flex-col p-2 rounded bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-800 hover:border-violet-200 dark:hover:border-violet-500/30 transition-all cursor-pointer"
                    (click)="toggleExpand(item.id, 2)">
                    <div class="flex items-center justify-between">
                      <div class="flex flex-col min-w-0">
                        <span class="text-[10px] font-bold text-violet-500 hover:text-violet-750 hover:underline cursor-pointer truncate flex items-center gap-1" (click)="$event.stopPropagation(); openWorkItem(item.id)">
                          #{{ item.id }}
                          <lucide-icon [name]="Layers" size="8" class="text-slate-300"></lucide-icon>
                        </span>
                        <span class="text-[9px] text-slate-400 truncate max-w-[100px]">{{ item.type === 'Feature' ? 'FT' : 'US' }}</span>
                      </div>
                      <div class="text-right shrink-0">
                        <div class="text-[10px] font-black" 
                          [class.text-emerald-500]="(item.effort - sumTasks(item.tasks, 'originalEstimate')) / (sumTasks(item.tasks, 'originalEstimate') || 1) <= 0.15"
                          [class.text-amber-500]="(item.effort - sumTasks(item.tasks, 'originalEstimate')) / (sumTasks(item.tasks, 'originalEstimate') || 1) > 0.15 && (item.effort - sumTasks(item.tasks, 'originalEstimate')) / (sumTasks(item.tasks, 'originalEstimate') || 1) <= 0.3"
                          [class.text-red-500]="(item.effort - sumTasks(item.tasks, 'originalEstimate')) / (sumTasks(item.tasks, 'originalEstimate') || 1) > 0.3">
                          {{ sumTasks(item.tasks, 'originalEstimate') > 0 ? (((item.effort - sumTasks(item.tasks, 'originalEstimate')) / sumTasks(item.tasks, 'originalEstimate')) * 100).toFixed(0) + '%' : '0%' }}
                        </div>
                      </div>
                    </div>
                    
                    <!-- Nested tasks detail -->
                    <div *ngIf="expandedItemsM2.has(item.id)" class="mt-2 pl-2 border-l-2 border-violet-100 dark:border-violet-900/50 space-y-1 animate-in slide-in-from-top-1 duration-200">
                      <div *ngFor="let task of item.tasks" class="flex items-center justify-between text-[8px] py-0.5 border-b border-slate-50 dark:border-slate-800/50 last:border-0">
                        <span class="text-slate-500 truncate max-w-[120px]" [title]="task.title">{{ task.title }}</span>
                        <div class="flex items-center gap-2">
                           <span class="text-slate-400">Real: {{ formatEffort(task.completedWork) }}h</span>
                          <span *ngIf="task.remainingWork > 0" class="text-rose-500 font-bold">!</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Section 3.3: Rework -->
    <section class="glass-card !bg-white dark:!bg-slate-900 border-l-4 border-rose-500 overflow-hidden">
      <div class="p-6">
        <div class="flex items-center justify-between mb-2">
          
            <div class="flex items-center justify-between gap-4 mb-4 flex-wrap">
              <h3 class="text-lg font-bold text-slate-400 uppercase tracking-tight">3.3 Métrica: Tasa de Retrabajo en Procesos de Software<span *ngIf="selectedSprintDisplayName" class="text-indigo-500 dark:text-indigo-400"> - {{ selectedSprintDisplayName }}</span></h3>
              <button 
                (click)="openCommentModal('retrabajo', '3.3 Métrica: Tasa de Retrabajo en Procesos de Software')"
                [ngClass]="{
                  'border-emerald-300 bg-emerald-50/40 text-emerald-600 dark:border-emerald-900/50 dark:bg-emerald-950/20 dark:text-emerald-400': metricComments['retrabajo'] && metricComments['retrabajo'].trim(),
                  'border-slate-200 bg-slate-50/50 text-slate-550 dark:border-slate-700/60 dark:bg-slate-800/20 dark:text-slate-450': !metricComments['retrabajo'] || !metricComments['retrabajo'].trim()
                }"
                class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[11px] font-bold transition-all active:scale-95 shadow-sm">
                <lucide-icon [name]="MessageSquare" size="13" [class.text-emerald-500]="metricComments['retrabajo'] && metricComments['retrabajo'].trim()"></lucide-icon>
                <span>{{ metricComments['retrabajo'] && metricComments['retrabajo'].trim() ? 'Nota Guardada' : 'Agregar Nota/Contexto' }}</span>
                <span *ngIf="metricComments['retrabajo'] && metricComments['retrabajo'].trim()" class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              </button>
            </div>
    
          <div class="px-3 py-1 rounded-full text-xs font-bold uppercase" [ngClass]="{
            'bg-green-100 text-green-700': metrics.rework.status === 'green',
            'bg-yellow-100 text-yellow-700': metrics.rework.status === 'yellow',
            'bg-red-100 text-red-700': metrics.rework.status === 'red'
          }">
            {{ metrics.rework.status }}
          </div>
        </div>
        
        <p class="text-xs text-slate-500 mb-6 leading-relaxed bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border-l-2 border-rose-500">
          Esta métrica calcula la tasa de retrabajo asociada a los <strong>requerimientos en estado Resuelto y Cerrado</strong>. 
          Para ello, considera tanto el esfuerzo invertido en tareas planeadas y correctivas, como el esfuerzo destinado a la atención de los bugs vinculados mediante las relaciones Affected by y Related.
          <br><span class="font-bold text-slate-700 dark:text-slate-350">Meta establecida:</span> 20.00% | <span class="font-bold text-slate-700 dark:text-slate-350">Umbrales:</span> Verde &le; 22% | Amarillo &le; 30% | Rojo &gt; 30%
        </p>

        <div class="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <div class="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800 text-center">
            <div class="text-[10px] text-slate-400 uppercase font-bold mb-1">Esfuerzo Req. (H)</div>
            <div class="text-2xl font-bold">{{ metrics.rework.reqEffort.toFixed(1) }}</div>
            <div class="text-[8px] opacity-50 uppercase">Tareas Planeadas</div>
          </div>
          <div class="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800 text-center">
            <div class="text-[10px] text-slate-400 uppercase font-bold mb-1">Retrabajo Req. (H)</div>
            <div class="text-2xl font-bold">{{ metrics.rework.reqRework.toFixed(1) }}</div>
            <div class="text-[8px] opacity-50 uppercase">Tareas Correctivas</div>
          </div>
          <div class="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800 text-center">
            <div class="text-[10px] text-slate-400 uppercase font-bold mb-1">Retrabajo Bugs (H)</div>
            <div class="text-2xl font-bold">{{ metrics.rework.bugRework.toFixed(1) }}</div>
            <div class="text-[8px] opacity-50 uppercase">Tareas de Bugs</div>
          </div>
          <div class="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800 text-center">
            <div class="text-[10px] text-slate-400 uppercase font-bold mb-1">Retrabajo Total (H)</div>
            <div class="text-2xl font-bold">{{ metrics.rework.totalRework.toFixed(1) }}</div>
            <div class="text-[8px] opacity-50 uppercase">Sumatoria Retrabajos</div>
          </div>
          <div class="p-4 rounded-xl text-center relative overflow-hidden border transition-all duration-300" [ngClass]="{
            'bg-emerald-50/50 border-emerald-100 dark:bg-emerald-950/10 dark:border-emerald-900/30': metrics.rework.status === 'green',
            'bg-amber-50/50 border-amber-100 dark:bg-amber-950/10 dark:border-amber-900/30': metrics.rework.status === 'yellow',
            'bg-rose-50/50 border-rose-100 dark:bg-rose-950/10 dark:border-rose-900/30': metrics.rework.status === 'red'
          }">
            <div class="text-xs uppercase font-bold mb-1" [ngClass]="{
              'text-emerald-600 dark:text-emerald-400': metrics.rework.status === 'green',
              'text-amber-600 dark:text-amber-400': metrics.rework.status === 'yellow',
              'text-rose-600 dark:text-rose-400': metrics.rework.status === 'red'
            }">KPI Tasa Retrabajo</div>
            <div class="text-3xl font-black" [ngClass]="{
              'text-emerald-700 dark:text-emerald-300': metrics.rework.status === 'green',
              'text-amber-700 dark:text-amber-300': metrics.rework.status === 'yellow',
              'text-rose-700 dark:text-rose-300': metrics.rework.status === 'red'
            }">{{ metrics.rework.rate.toFixed(2) }}%</div>
            <div class="text-[8pt] opacity-85" [ngClass]="{
              'text-emerald-600/85 dark:text-emerald-400/85': metrics.rework.status === 'green',
              'text-amber-600/85 dark:text-amber-400/85': metrics.rework.status === 'yellow',
              'text-rose-600/85 dark:text-rose-400/85': metrics.rework.status === 'red'
            }">Umbrales: 22%, 30%</div>
          </div>
        </div>

        <!-- Rework Breakdown Table -->
        <div class="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 mb-8">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="bg-slate-50 dark:bg-slate-900/50 text-[10px] uppercase font-black text-slate-400 border-b border-slate-200 dark:border-slate-800">
                <th class="p-3">ID</th>
                <th class="p-3">Tipo</th>
                <th class="p-3">ISW</th>
                <th class="p-3 text-center">Size</th>
                <th class="p-3 text-center">Esfuerzo Req.</th>
                <th class="p-3 text-center text-amber-500">Retr. Req.</th>
                <th class="p-3 text-center text-rose-500">Retr. Bug</th>
                <th class="p-3 text-center font-bold">Total</th>
                <th class="p-3 text-center">KPI Tasa</th>
              </tr>
            </thead>
            <tbody class="text-xs">
              <ng-container *ngFor="let item of getSortedReworkItems()">
                <tr class="border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50/50 dark:hover:bg-slate-800/20 cursor-pointer transition-colors"
                  (click)="toggleExpand(item.id, 3)">
                  <td class="p-3 font-bold text-indigo-500 hover:text-indigo-750 hover:underline cursor-pointer" (click)="$event.stopPropagation(); openWorkItem(item.id)">#{{ item.id }}</td>
                  <td class="p-3 text-slate-400">{{ item.type }}</td>
                  <td class="p-3 font-medium">{{ item.isw }}</td>
                  <td class="p-3 text-center font-bold text-slate-400">{{ getEffectiveSize(item) }}</td>
                  <td class="p-3 text-center font-bold">{{ getItemReworkData(item).effort.toFixed(1) }}h</td>
                  <td class="p-3 text-center text-amber-600 bg-amber-50/30 dark:bg-amber-900/10">{{ getItemReworkData(item).reqRework.toFixed(1) }}h</td>
                  <td class="p-3 text-center text-rose-600 bg-rose-50/30 dark:bg-rose-900/10">{{ getItemReworkData(item).bugRework.toFixed(1) }}h</td>
                  <td class="p-3 text-center font-black bg-slate-100/50 dark:bg-slate-800/30">{{ getItemReworkData(item).totalRework.toFixed(1) }}h</td>
                  <td class="p-3 text-center">
                    <span class="px-2 py-0.5 rounded-full font-bold text-[10px]" [ngClass]="{
                      'bg-emerald-100 text-emerald-700': getItemReworkData(item).rate <= 22,
                      'bg-amber-100 text-amber-700': getItemReworkData(item).rate > 22 && getItemReworkData(item).rate <= 30,
                      'bg-red-100 text-red-700': getItemReworkData(item).rate > 30
                    }">
                      {{ getItemReworkData(item).rate.toFixed(1) }}%
                    </span>
                  </td>
                </tr>
                <!-- Tasks Detail (por tarea) -->
                <tr *ngIf="expandedItemsM3.has(item.id)" class="bg-slate-50/50 dark:bg-slate-900/20">
                  <td colspan="9" class="p-0">
                    <div class="p-4 pl-12 space-y-4">
                      <!-- 1. Tareas de Requerimiento -->
                      <div *ngIf="item.tasks?.length" class="space-y-2">
                        <div class="text-[10px] uppercase font-bold text-slate-400 mb-2">Desglose de Esfuerzo y Retrabajo (Tareas)</div>
                        <div *ngFor="let task of item.tasks" class="flex items-center justify-between p-2 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                          <div class="flex items-center gap-3">
                            <lucide-icon [name]="RefreshCw" size="12" class="text-slate-300"></lucide-icon>
                            <span class="text-[11px] font-medium">{{ task.title }}</span>
                            <span class="text-[9px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-500 uppercase font-bold">{{ task.type || 'Planeada' }}</span>
                          </div>
                          <div class="flex items-center gap-4 text-[11px]">
                            <span class="text-slate-400">Tipo: <span class="text-slate-600 dark:text-slate-350 font-bold">{{ task.type || 'Planeada' }}</span></span>
                             <span class="font-bold text-indigo-500">{{ formatEffort(task.completedWork) }}h</span>
                          </div>
                        </div>
                      </div>

                      <!-- 2. Bugs Vinculados -->
                      <div *ngIf="item.relatedBugs?.length" class="space-y-2">
                        <div class="text-[10px] uppercase font-bold text-rose-500 mb-2 flex items-center gap-2">
                          <lucide-icon [name]="Bug" size="10"></lucide-icon>
                          Retrabajo Bugs (Incidencias Vinculadas)
                        </div>
                        <div *ngFor="let bug of item.relatedBugs" class="space-y-1">
                          <div class="flex items-center justify-between p-2 rounded bg-rose-50/50 dark:bg-rose-900/10 border border-rose-100 dark:border-rose-900/30 cursor-pointer hover:bg-rose-100/50 transition-colors"
                            (click)="toggleExpandBug(bug.id, $event)">
                            <div class="flex items-center gap-3">
                              <lucide-icon [name]="Bug" size="12" class="text-rose-500"></lucide-icon>
                              <div class="flex flex-col">
                                <span class="text-[11px] font-bold text-slate-700 dark:text-slate-200 hover:text-indigo-500 hover:underline cursor-pointer" (click)="$event.stopPropagation(); openWorkItem(bug.id)">Bug #{{ bug.id }}</span>
                                <span class="text-[9px] text-slate-500 truncate max-w-[400px]">{{ bug.title }}</span>
                              </div>
                            </div>
                            <div class="flex items-center gap-6 text-[10px]">
                              <div class="flex flex-col items-end">
                                <span class="text-[8px] uppercase text-slate-400 font-bold">Est. Total</span>
                                <span class="font-bold text-slate-600 dark:text-slate-350">{{ formatEffort(bug.originalEstimate) }}h</span>
                              </div>
                              <div class="flex flex-col items-end">
                                <span class="text-[8px] uppercase text-slate-400 font-bold">Real Total</span>
                                <span class="font-black text-rose-600">{{ formatEffort(bug.completedWork) }}h</span>
                              </div>
                              <lucide-icon [name]="ChevronDown" size="14" [class.rotate-180]="expandedBugs.has(bug.id)" class="transition-transform text-slate-300"></lucide-icon>
                            </div>
                          </div>
                          
                          <!-- Bug Tasks (Sub-level) -->
                          <div *ngIf="expandedBugs.has(bug.id)" class="pl-8 space-y-1 animate-in slide-in-from-top-1 duration-200">
                            <div *ngFor="let bt of bug.tasks" class="flex items-center justify-between p-1.5 px-3 rounded bg-white/50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50 text-[10px]">
                               <div class="flex items-center gap-2">
                                 <div class="w-1 h-1 rounded-full bg-rose-400"></div>
                                 <span class="text-slate-600 dark:text-slate-400">{{ bt.title }}</span>
                               </div>
                               <div class="flex items-center gap-4">
                                 <span class="text-slate-400">Est: {{ formatEffort(bt.originalEstimate) }}h</span>
                                 <span class="font-bold text-rose-500">Real: {{ formatEffort(bt.completedWork) }}h</span>
                               </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </td>
                </tr>
              </ng-container>
            </tbody>
          </table>
        </div>

        <!-- Rework AI Analysis Box -->
        <div *ngIf="metricAnalyses['retrabajo']" class="mt-6 p-5 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-[rgb(255,77,17)] animate-in fade-in duration-300">
          <h4 class="text-xs font-bold uppercase text-[rgb(255,77,17)] mb-2 flex items-center justify-between w-full">
            <span class="flex items-center">
              <lucide-icon [name]="Sparkles" size="14" class="mr-1"></lucide-icon>
              Análisis de resultados e Acciones
            </span>
            <button (click)="copyAnalysis('retrabajo', metricAnalyses['retrabajo'])" 
                    class="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-[rgb(255,77,17)] transition-all flex items-center gap-1 text-[10px] normal-case cursor-pointer"
                    [title]="copiedKeys['retrabajo'] ? 'Copiado' : 'Copiar análisis'">
              <lucide-icon [name]="copiedKeys['retrabajo'] ? Check : Copy" size="12"></lucide-icon>
              <span>{{ copiedKeys['retrabajo'] ? '¡Copiado!' : 'Copiar' }}</span>
            </button>
          </h4>
          <div class="text-sm leading-relaxed text-slate-700 dark:text-slate-300" [innerHTML]="formatAnalysisText(metricAnalyses['retrabajo'])">
          </div>
        </div>
        <div *ngIf="!metricAnalyses['retrabajo']" class="mt-6 text-sm opacity-50 p-4 bg-slate-50 dark:bg-slate-800/30 rounded-lg">
          Genera el análisis IA para visualizar las recomendaciones.
        </div>

      </div>
    </section>

    <!-- Section 3.4: Defect -->
    <section class="glass-card !bg-white dark:!bg-slate-900 border-l-4 border-emerald-500 overflow-hidden">
      <div class="p-6">
        <div class="flex items-center justify-between mb-2">
          
            <div class="flex items-center justify-between gap-4 mb-4 flex-wrap">
              <h3 class="text-lg font-bold text-slate-400 uppercase tracking-tight">3.4 Métrica: Densidad de Defectos<span *ngIf="selectedSprintDisplayName" class="text-indigo-500 dark:text-indigo-400"> - {{ selectedSprintDisplayName }}</span></h3>
              <button 
                (click)="openCommentModal('densidad', '3.4 Métrica: Densidad de Defectos')"
                [ngClass]="{
                  'border-emerald-300 bg-emerald-50/40 text-emerald-600 dark:border-emerald-900/50 dark:bg-emerald-950/20 dark:text-emerald-400': metricComments['densidad'] && metricComments['densidad'].trim(),
                  'border-slate-200 bg-slate-50/50 text-slate-550 dark:border-slate-700/60 dark:bg-slate-800/20 dark:text-slate-450': !metricComments['densidad'] || !metricComments['densidad'].trim()
                }"
                class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[11px] font-bold transition-all active:scale-95 shadow-sm">
                <lucide-icon [name]="MessageSquare" size="13" [class.text-emerald-500]="metricComments['densidad'] && metricComments['densidad'].trim()"></lucide-icon>
                <span>{{ metricComments['densidad'] && metricComments['densidad'].trim() ? 'Nota Guardada' : 'Agregar Nota/Contexto' }}</span>
                <span *ngIf="metricComments['densidad'] && metricComments['densidad'].trim()" class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              </button>
            </div>
    
          <div class="px-3 py-1 rounded-full text-xs font-bold uppercase" [ngClass]="{
            'bg-green-100 text-green-700': metrics.defectDensity.status === 'green',
            'bg-yellow-100 text-yellow-700': metrics.defectDensity.status === 'yellow',
            'bg-red-100 text-red-700': metrics.defectDensity.status === 'red'
          }">
            {{ metrics.defectDensity.status }}
          </div>
        </div>

        <p class="text-xs text-slate-500 mb-6 leading-relaxed bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border-l-2 border-emerald-500">
          Esta métrica realiza la medición de la cantidad de defectos promedio por unidad de tamaño (size). Considera el número de bugs detectados ("Affected by" y "Related") provenientes de la construcción de <strong>requerimientos</strong> o la atención de otros bugs.
          <br><span class="font-bold text-slate-700 dark:text-slate-350">Umbrales:</span> Verde &le; 0.18 | Amarillo &le; 0.23 | Rojo &gt; 0.23
        </p>

        <!-- Summary KPIs -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div class="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800 text-center">
            <div class="text-xs text-slate-400 uppercase font-bold mb-1">Total Incidencias (Bugs)</div>
            <div class="text-2xl font-bold">{{ metrics.defectDensity.bugs }}</div>
          </div>
          <div class="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800 text-center">
            <div class="text-xs text-slate-400 uppercase font-bold mb-1">Tamaño Total (Size)</div>
            <div class="text-2xl font-bold">{{ metrics.defectDensity.size }}</div>
          </div>
          <div class="p-4 rounded-xl text-center relative overflow-hidden border transition-all duration-300" [ngClass]="{
            'bg-emerald-50/50 border-emerald-100 dark:bg-emerald-950/10 dark:border-emerald-900/30': metrics.defectDensity.status === 'green',
            'bg-amber-50/50 border-amber-100 dark:bg-amber-950/10 dark:border-amber-900/30': metrics.defectDensity.status === 'yellow',
            'bg-rose-50/50 border-rose-100 dark:bg-rose-950/10 dark:border-rose-900/30': metrics.defectDensity.status === 'red'
          }">
            <div class="text-xs uppercase font-bold mb-1" [ngClass]="{
              'text-emerald-600 dark:text-emerald-400': metrics.defectDensity.status === 'green',
              'text-amber-600 dark:text-amber-400': metrics.defectDensity.status === 'yellow',
              'text-rose-600 dark:text-rose-400': metrics.defectDensity.status === 'red'
            }">KPI Densidad</div>
            <div class="text-3xl font-black" [ngClass]="{
              'text-emerald-700 dark:text-emerald-300': metrics.defectDensity.status === 'green',
              'text-amber-700 dark:text-amber-300': metrics.defectDensity.status === 'yellow',
              'text-rose-700 dark:text-rose-300': metrics.defectDensity.status === 'red'
            }">{{ metrics.defectDensity.density.toFixed(3) }}</div>
            <div class="text-[8pt] opacity-85" [ngClass]="{
              'text-emerald-600/85 dark:text-emerald-400/85': metrics.defectDensity.status === 'green',
              'text-amber-600/85 dark:text-amber-400/85': metrics.defectDensity.status === 'yellow',
              'text-rose-600/85 dark:text-rose-400/85': metrics.defectDensity.status === 'red'
            }">Umbrales: 0.18, 0.23</div>
          </div>
        </div>
        
        <!-- Sprint Comparison Selector -->
        <div class="mb-4">
          <button (click)="showComparePanel = !showComparePanel"
                  class="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors cursor-pointer mb-2">
            <lucide-icon [name]="showComparePanel ? ChevronDown : ChevronDown" size="13"></lucide-icon>
            {{ showComparePanel ? 'Ocultar' : 'Comparar sprints anteriores' }}
          </button>

          <div *ngIf="showComparePanel" class="bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800 p-4 animate-in fade-in duration-200">
            <p class="text-xs text-slate-400 mb-3 font-bold uppercase tracking-wide">Selecciona sprints a comparar</p>
            <div class="flex flex-wrap gap-2 mb-3">
              <label *ngFor="let iter of iterations" class="flex items-center gap-1.5 cursor-pointer group">
                <input type="checkbox"
                       [value]="iter.id"
                       [checked]="selectedCompareIterations.includes(iter.id)"
                       (change)="onCompareIterationToggle(iter.id, $event)"
                       class="w-3.5 h-3.5 rounded accent-emerald-500 cursor-pointer">
                <span class="text-[11px] font-medium text-slate-600 dark:text-slate-300 group-hover:text-emerald-600 transition-colors">{{ iter.name }}</span>
              </label>
            </div>
            <div class="flex gap-2">
              <button (click)="loadCompareDefectDensity()"
                      [disabled]="selectedCompareIterations.length === 0 || isLoadingCompare"
                      class="text-[11px] font-bold px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg transition-all cursor-pointer flex items-center gap-1.5">
                <lucide-icon *ngIf="isLoadingCompare" [name]="RefreshCw" size="11" class="animate-spin"></lucide-icon>
                {{ isLoadingCompare ? 'Cargando...' : 'Generar comparativa' }}
              </button>
              <button *ngIf="selectedCompareIterations.length > 0" (click)="clearCompareIterations()"
                      class="text-[11px] font-medium px-3 py-1.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 rounded-lg transition-all cursor-pointer">
                Limpiar
              </button>
            </div>
          </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start mb-6">
          <div class="lg:col-span-12 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
            <div class="h-64">
              <canvas #defectChart></canvas>
            </div>
          </div>
        </div>

        <div class="space-y-4 mb-8">
          <div *ngIf="metricAnalyses['densidad de defectos']" class="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-lg border border-[rgb(255,77,17)]">
            <h4 class="text-xs font-bold uppercase text-[rgb(255,77,17)] mb-2 flex items-center justify-between w-full">
              <span class="flex items-center">
                <lucide-icon [name]="Sparkles" size="14" class="mr-1"></lucide-icon>
                Análisis de resultados e Acciones
              </span>
              <button (click)="copyAnalysis('densidad de defectos', metricAnalyses['densidad de defectos'])" 
                      class="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-[rgb(255,77,17)] transition-all flex items-center gap-1 text-[10px] normal-case cursor-pointer"
                      [title]="copiedKeys['densidad de defectos'] ? 'Copiado' : 'Copiar análisis'">
                <lucide-icon [name]="copiedKeys['densidad de defectos'] ? Check : Copy" size="12"></lucide-icon>
                <span>{{ copiedKeys['densidad de defectos'] ? '¡Copiado!' : 'Copiar' }}</span>
              </button>
            </h4>
            <div class="text-sm leading-relaxed text-slate-700 dark:text-slate-300" [innerHTML]="formatAnalysisText(metricAnalyses['densidad de defectos'])">
            </div>
          </div>
          <div *ngIf="!metricAnalyses['densidad de defectos']" class="text-sm opacity-50 p-4 bg-slate-50 dark:bg-slate-800/30 rounded-lg">
            Genera el análisis IA para visualizar las recomendaciones.
          </div>
        </div>
      </div>
    </section>

    <!-- Section 3.5: Defect Removal Efficiency (EED) -->
    <section class="glass-card !bg-white dark:!bg-slate-900 border-l-4 border-amber-500 overflow-hidden">
      <div class="p-6">
        <div class="flex items-center justify-between mb-2">
          
            <div class="flex items-center justify-between gap-4 mb-4 flex-wrap">
              <h3 class="text-lg font-bold text-slate-400 uppercase tracking-tight">3.5 Métrica: Eficiencia en la Eliminación de Defectos (EED)<span *ngIf="selectedSprintDisplayName" class="text-indigo-500 dark:text-indigo-400"> - {{ selectedSprintDisplayName }}</span></h3>
              <button 
                (click)="openCommentModal('eed', '3.5 Métrica: Eficiencia en la Eliminación de Defectos (EED)')"
                [ngClass]="{
                  'border-emerald-300 bg-emerald-50/40 text-emerald-600 dark:border-emerald-900/50 dark:bg-emerald-950/20 dark:text-emerald-400': metricComments['eed'] && metricComments['eed'].trim(),
                  'border-slate-200 bg-slate-50/50 text-slate-550 dark:border-slate-700/60 dark:bg-slate-800/20 dark:text-slate-450': !metricComments['eed'] || !metricComments['eed'].trim()
                }"
                class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[11px] font-bold transition-all active:scale-95 shadow-sm">
                <lucide-icon [name]="MessageSquare" size="13" [class.text-emerald-500]="metricComments['eed'] && metricComments['eed'].trim()"></lucide-icon>
                <span>{{ metricComments['eed'] && metricComments['eed'].trim() ? 'Nota Guardada' : 'Agregar Nota/Contexto' }}</span>
                <span *ngIf="metricComments['eed'] && metricComments['eed'].trim()" class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              </button>
            </div>
    
          <div class="px-3 py-1 rounded-full text-xs font-bold uppercase" [ngClass]="{
            'bg-green-100 text-green-700': metrics.defectRemovalEfficiency.status === 'green',
            'bg-yellow-100 text-yellow-700': metrics.defectRemovalEfficiency.status === 'yellow',
            'bg-red-100 text-red-700': metrics.defectRemovalEfficiency.status === 'red'
          }">
            {{ metrics.defectRemovalEfficiency.status }}
          </div>
        </div>

        <p class="text-xs text-slate-550 mb-6 leading-relaxed bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border-l-2 border-amber-500">
          Esta métrica mide el porcentaje de bugs atendidos contra el total de bugs detectados durante el ciclo de vida de desarrollo. El resultado se expresa en porcentaje y permite evaluar cuántos bugs se detectan y se atienden satisfactoriamente antes de salir a producción. <br/><strong>Fórmula:</strong> KPI EED = (∑ Bugs Closed / # Total de bugs detectados) x 100. Se consideran atendidos en tiempo aquellos que fueron cerrados dentro de la vigencia del sprint.
          <br><span class="font-bold text-slate-700 dark:text-slate-350">Meta establecida:</span> 81.00% | <span class="font-bold text-slate-700 dark:text-slate-350">Umbrales:</span> Verde &ge; 81% | Amarillo &ge; 71% | Rojo &lt; 71%
        </p>

        <!-- KPI summary grid -->
        <div class="grid grid-cols-2 md:grid-cols-7 gap-4 mb-8">
          <div class="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800 text-center">
            <div class="text-[9px] text-slate-400 uppercase font-bold mb-1">Total Bugs</div>
            <div class="text-2xl font-bold">{{ metrics.defectRemovalEfficiency.totalBugs }}</div>
          </div>
          <div class="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800 text-center">
            <div class="text-[9px] text-emerald-500 uppercase font-bold mb-1">Closed en Tiempo</div>
            <div class="text-2xl font-bold text-emerald-600">{{ metrics.defectRemovalEfficiency.closedOnTime }}</div>
          </div>
          <div class="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800 text-center">
            <div class="text-[9px] text-rose-500 uppercase font-bold mb-1">Closed fuera Tiempo</div>
            <div class="text-2xl font-bold text-rose-600">{{ metrics.defectRemovalEfficiency.closedLate }}</div>
          </div>
          <div class="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800 text-center">
            <div class="text-[9px] text-blue-500 uppercase font-bold mb-1">Proposed</div>
            <div class="text-2xl font-bold text-blue-600">{{ metrics.defectRemovalEfficiency.proposed }}</div>
          </div>
          <div class="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800 text-center">
            <div class="text-[9px] text-violet-500 uppercase font-bold mb-1">Resolved</div>
            <div class="text-2xl font-bold text-violet-600">{{ metrics.defectRemovalEfficiency.resolved }}</div>
          </div>
          <div class="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800 text-center">
            <div class="text-[9px] text-amber-500 uppercase font-bold mb-1">Active</div>
            <div class="text-2xl font-bold text-amber-600">{{ metrics.defectRemovalEfficiency.active }}</div>
          </div>
          <div class="p-4 rounded-xl text-center relative overflow-hidden border transition-all duration-300 flex flex-col justify-center items-center" [ngClass]="{
            'bg-emerald-50/50 border-emerald-100 dark:bg-emerald-950/10 dark:border-emerald-900/30': metrics.defectRemovalEfficiency.status === 'green',
            'bg-amber-50/50 border-amber-100 dark:bg-amber-950/10 dark:border-amber-900/30': metrics.defectRemovalEfficiency.status === 'yellow',
            'bg-rose-50/50 border-rose-100 dark:bg-rose-950/10 dark:border-rose-900/30': metrics.defectRemovalEfficiency.status === 'red'
          }">
            <div class="text-xs uppercase font-bold mb-1" [ngClass]="{
              'text-emerald-600 dark:text-emerald-400': metrics.defectRemovalEfficiency.status === 'green',
              'text-amber-600 dark:text-amber-400': metrics.defectRemovalEfficiency.status === 'yellow',
              'text-rose-600 dark:text-rose-400': metrics.defectRemovalEfficiency.status === 'red'
            }">EED KPI</div>
            <div class="text-3xl font-black" [ngClass]="{
              'text-emerald-700 dark:text-emerald-300': metrics.defectRemovalEfficiency.status === 'green',
              'text-amber-700 dark:text-amber-300': metrics.defectRemovalEfficiency.status === 'yellow',
              'text-rose-700 dark:text-rose-300': metrics.defectRemovalEfficiency.status === 'red'
            }">{{ metrics.defectRemovalEfficiency.rate.toFixed(2) }}%</div>
            <div class="text-[8pt] opacity-85" [ngClass]="{
              'text-emerald-600/85 dark:text-emerald-400/85': metrics.defectRemovalEfficiency.status === 'green',
              'text-amber-600/85 dark:text-amber-400/85': metrics.defectRemovalEfficiency.status === 'yellow',
              'text-rose-600/85 dark:text-rose-400/85': metrics.defectRemovalEfficiency.status === 'red'
            }">Umbrales: 81%, 71%</div>
          </div>
        </div>

        <!-- Línea de Tiempo del Sprint (EED) -->
        <div class="mb-10 bg-slate-50 dark:bg-slate-800/10 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 overflow-visible">
          <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 border-b border-slate-200 dark:border-slate-800 pb-4">
            <div>
              <h4 class="text-sm font-black text-slate-700 dark:text-slate-350 uppercase tracking-wider flex items-center gap-2">
                <lucide-icon [name]="TrendingUp" size="16" class="text-amber-500"></lucide-icon>
                LÍNEA DE TIEMPO DEL SPRINT (EED)
              </h4>
              <p class="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">Distribución de requerimientos (US/FT) en el tiempo con sus defectos asociados ramificados</p>
            </div>
            
            <div class="flex flex-col lg:flex-row lg:items-center gap-4">
              <!-- Visual Filter Toggle -->
              <div class="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl text-[9px] font-black uppercase tracking-wider border border-slate-200/50 dark:border-slate-700/50">
                <button (click)="eedTimelineFilter = 'all'" 
                        [class]="eedTimelineFilter === 'all' ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'" 
                        class="px-2.5 py-1 rounded-lg transition-all duration-200 cursor-pointer">
                  Ver Todo (Sprint + Kanban)
                </button>
                <button (click)="eedTimelineFilter = 'sprint'" 
                        [class]="eedTimelineFilter === 'sprint' ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'" 
                        class="px-2.5 py-1 rounded-lg transition-all duration-200 cursor-pointer">
                  Solo Sprint
                </button>
              </div>

              <!-- Legend -->
              <div class="flex flex-wrap gap-4 text-[9px] uppercase font-black text-slate-500">
                <span class="flex items-center gap-1.5">
                  <span class="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/20"></span>
                  <span>Dentro de Sprint (A Tiempo)</span>
                </span>
                <span class="flex items-center gap-1.5">
                  <span class="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-sm shadow-rose-500/20"></span>
                  <span>Fuera de Sprint (Tarde / Abierto)</span>
                </span>
                <span class="flex items-center gap-1.5" *ngIf="eedTimelineFilter === 'all'">
                  <span class="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-sm shadow-blue-500/20"></span>
                  <span>Bugs de Otro Sprint (Kanban)</span>
                </span>
              </div>
            </div>
          </div>

          <!-- Horizontal Timeline Track for EED -->
          <div class="relative pt-32 pb-32 px-4 bg-slate-50 dark:bg-slate-800/20 rounded-3xl border border-slate-100 dark:border-slate-800 mb-6 overflow-visible select-none">
            
            <!-- Timeline grid and markers -->
            <div class="relative h-6 w-full flex items-center">
              
              <!-- Track line -->
              <div class="absolute h-2 left-0 right-0 rounded-full flex overflow-hidden bg-slate-200 dark:bg-slate-700">
                <!-- Sprint Track: 70% -->
                <div class="h-full w-[70%] bg-gradient-to-r from-indigo-500/30 to-blue-500/50 border-r border-dashed border-indigo-400/50" title="Vigencia del Sprint"></div>
                <!-- Post-Sprint Track: 30% -->
                <div class="h-full w-[30%] bg-gradient-to-r from-amber-500/20 to-rose-500/30" title="Fase Extendida (Post-Sprint)"></div>
              </div>

              <!-- Start Sprint label marker -->
              <div class="absolute left-0 -top-8 flex flex-col items-start select-none">
                <span class="text-[8px] font-black text-slate-400 uppercase tracking-tight">Inicio Sprint</span>
                <span class="text-[10px] font-black text-slate-700 dark:text-slate-200">{{ metrics!.startDate | date:'dd MMM':'UTC' }}</span>
                <div class="w-1.5 h-1.5 rounded-full bg-indigo-500 border border-white dark:border-slate-900 mt-1"></div>
              </div>

              <!-- End Sprint label marker -->
              <div class="absolute left-[70%] -top-8 flex flex-col items-center select-none transform -translate-x-1/2">
                <span class="text-[8px] font-black text-slate-400 uppercase tracking-tight">Fin Sprint</span>
                <span class="text-[10px] font-black text-slate-700 dark:text-slate-200">{{ metrics!.endDate | date:'dd MMM':'UTC' }}</span>
                <div class="w-1.5 h-1.5 rounded-full bg-red-500 border border-white dark:border-slate-900 mt-1"></div>
              </div>

              <!-- End Timeline label marker -->
              <div class="absolute right-0 -top-8 flex flex-col items-end select-none">
                <span class="text-[8px] font-black text-slate-400 uppercase tracking-tight">Fase Ext. (+15 días)</span>
                <span class="text-[10px] font-black text-slate-400 dark:text-slate-500">{{ addDays(metrics!.endDate, 15) | date:'dd MMM':'UTC' }}</span>
                <div class="w-1.5 h-1.5 rounded-full bg-rose-400 border border-white dark:border-slate-900 mt-1"></div>
              </div>

              <ng-container *ngFor="let node of getFilteredEEDTimelineData(); let idx = index">
                <div 
                  [style.left.%]="node.leftPct"
                  [style.transform]="getEEDTransform(node.verticalTier, 44)"
                  (mouseenter)="hoveredNodeId = node.id"
                  (mouseleave)="hoveredNodeId = null"
                  [style.zIndex]="hoveredNodeId === node.id ? 50 : 10"
                  class="absolute bottom-3 flex flex-col items-center overflow-visible select-none cursor-pointer">
                  
                  <!-- Connection Line (Stem) to the track -->
                  <div *ngIf="node.verticalTier > 0" 
                       class="absolute w-0.5 border-l border-dashed border-slate-350 dark:border-slate-650 z-0" 
                       [ngStyle]="getEEDStemStyle(node.verticalTier, 44)">
                  </div>

                  <!-- Horizontal bug branch line -->
                  <!-- Extending to the right if leftPct <= 75 -->
                  <div *ngIf="node.bugs?.length && node.leftPct <= 75" 
                       class="absolute left-3 top-3 w-4 border-t border-dashed border-slate-350 dark:border-slate-650 z-0">
                  </div>
                  <!-- Extending to the left if leftPct > 75 -->
                  <div *ngIf="node.bugs?.length && node.leftPct > 75" 
                       class="absolute right-3 top-3 w-4 border-t border-dashed border-slate-350 dark:border-slate-650 z-0">
                  </div>

                  <!-- Leaf Bugs container (Right side) -->
                  <div *ngIf="node.bugs?.length && node.leftPct <= 75" 
                       class="absolute left-7 top-1 flex items-center gap-1 z-30">
                    <div *ngFor="let bug of node.bugs" 
                         (click)="$event.stopPropagation(); openWorkItem(bug.id)" 
                         [title]="'Bug #' + bug.id + ': ' + bug.title + ' (' + bug.status + ')'"
                         class="group/bug relative w-4 h-4 rounded-full flex items-center justify-center text-[7px] border border-white dark:border-slate-900 shadow-sm cursor-pointer hover:scale-125 transition-transform"
                         [ngClass]="bug.deliveryStatus === 'dentro' ? 'bg-emerald-500 text-white' : (node.deliveryStatus === 'fuera' ? 'bg-amber-500 text-white' : 'bg-rose-500 text-white')">
                      <span>🐞</span>
                      <span class="absolute bottom-5 left-1/2 -translate-x-1/2 scale-0 group-hover/bug:scale-100 bg-slate-950/95 dark:bg-slate-900/95 text-white text-[8px] p-2 rounded shadow-lg border border-slate-800 w-60 text-left whitespace-normal z-50 pointer-events-none transition-all duration-200">
                        #{{ bug.id }}: {{ bug.title }} ({{ bug.status }})<br><span class="text-indigo-400 font-bold">Tags:</span> {{ bug.tags || 'Ninguno' }}
                      </span>
                    </div>
                  </div>
                  
                  <!-- Leaf Bugs container (Left side) -->
                  <div *ngIf="node.bugs?.length && node.leftPct > 75" 
                       class="absolute right-7 top-1 flex items-center gap-1 flex-row-reverse z-30">
                    <div *ngFor="let bug of node.bugs" 
                         (click)="$event.stopPropagation(); openWorkItem(bug.id)" 
                         [title]="'Bug #' + bug.id + ': ' + bug.title + ' (' + bug.status + ')'"
                         class="group/bug relative w-4 h-4 rounded-full flex items-center justify-center text-[7px] border border-white dark:border-slate-900 shadow-sm cursor-pointer hover:scale-125 transition-transform"
                         [ngClass]="bug.deliveryStatus === 'dentro' ? 'bg-emerald-500 text-white' : (node.deliveryStatus === 'fuera' ? 'bg-amber-500 text-white' : 'bg-rose-500 text-white')">
                      <span>🐞</span>
                      <span class="absolute bottom-5 left-1/2 -translate-x-1/2 scale-0 group-hover/bug:scale-100 bg-slate-950/95 dark:bg-slate-900/95 text-white text-[8px] p-2 rounded shadow-lg border border-slate-800 w-60 text-left whitespace-normal z-50 pointer-events-none transition-all duration-200">
                        #{{ bug.id }}: {{ bug.title }} ({{ bug.status }})<br><span class="text-indigo-400 font-bold">Tags:</span> {{ bug.tags || 'Ninguno' }}
                      </span>
                    </div>
                  </div>

                  <!-- Inner wrapper to isolate hover on the central node dot and label from the bug icons -->
                  <div class="flex flex-col items-center group/timeline-node relative overflow-visible w-full">
                    <!-- Central Node Dot (US/FT/ST) -->
                    <div class="w-6 h-6 rounded-full flex items-center justify-center border border-white dark:border-slate-900 shadow-md transition-all duration-300 transform hover:scale-125 cursor-pointer z-25"
                      [ngClass]="{
                        'bg-emerald-500 text-white': node.type !== 'Standalone' && node.deliveryStatus === 'dentro',
                        'bg-rose-500 text-white': node.type !== 'Standalone' && node.deliveryStatus === 'fuera',
                        'bg-blue-500 text-white shadow-sm shadow-blue-500/30': node.type === 'Standalone'
                      }"
                      (click)="openWorkItem(node.id)">
                      <span class="text-[8px] font-black leading-none">
                        {{ node.type === 'Feature' ? 'FT' : (node.type === 'User Story' ? 'US' : node.type === 'SprintStandalone' ? 'BG' : 'KB') }}
                      </span>
                    </div>

                    <!-- Label showing ID (opens in browser) -->
                    <span class="text-[8px] font-black mt-0.5 select-none cursor-pointer text-slate-650 dark:text-slate-400 hover:text-indigo-500 hover:underline bg-white dark:bg-slate-800 px-1 py-0.5 rounded shadow-sm border border-slate-100 dark:border-slate-700 z-20"
                      (click)="openWorkItem(node.id)">
                      {{ node.id === 'kanban_standalone' ? 'Bugs Kanban' : node.id === 'sprint_standalone' ? 'Bugs Sprint' : '#' + node.id }}
                    </span>

                    <!-- Rich Tooltip on Hover -->
                    <div class="absolute bottom-8 scale-0 group-hover/timeline-node:scale-100 transition-all duration-200 origin-bottom bg-slate-950/95 dark:bg-slate-900/95 text-white p-3 rounded-xl border border-slate-800 shadow-xl w-60 z-50 text-left pointer-events-none group-hover/timeline-node:pointer-events-auto">
                      <div class="flex items-center justify-between border-b border-slate-800 pb-1.5 mb-1.5">
                        <span class="px-2 py-0.5 rounded text-[8px] font-black uppercase text-white"
                          [ngClass]="{
                            'bg-purple-600': node.type === 'Feature',
                            'bg-blue-600': node.type === 'User Story',
                            'bg-emerald-600': node.type === 'SprintStandalone',
                            'bg-blue-500': node.type === 'Standalone'
                          }">
                          {{ node.type === 'Feature' ? 'FEATURE' : (node.type === 'User Story' ? 'USER STORY' : node.type === 'SprintStandalone' ? 'BUGS SIN US/FT' : 'KANBAN (OTRO SPRINT)') }}
                        </span>
                        <span class="text-[10px] font-black text-slate-400">{{ ['kanban_standalone', 'sprint_standalone'].includes(node.id) ? '' : '#' + node.id }}</span>
                      </div>
                      <div class="text-[11px] font-bold truncate mb-1 text-slate-100">{{ node.title }}</div>
                      
                      <div class="text-[9px] space-y-0.5 text-slate-300">
                        <div *ngIf="!['kanban_standalone', 'sprint_standalone'].includes(node.id)"><span class="text-slate-500 font-bold">ISW:</span> {{ node.isw || 'Sin asignar' }}</div>
                        <div *ngIf="!['kanban_standalone', 'sprint_standalone'].includes(node.id)"><span class="text-slate-500 font-bold">Estado:</span> {{ node.status }}</div>
                        <div *ngIf="node.bugs?.length"><span class="text-rose-400 font-bold">Defectos:</span> {{ node.bugs.length }} bugs</div>
                        
                        <!-- Child Stories List (for Feature) -->
                        <div *ngIf="node.type === 'Feature' && getChildStories(node.id).length" class="mt-2 pt-2 border-t border-slate-800/40">
                          <span class="text-blue-400 font-bold block mb-1">👤 Historias de Usuario (Hijos):</span>
                          <div class="space-y-1 max-h-24 overflow-y-auto pr-1">
                            <div *ngFor="let story of getChildStories(node.id)" class="flex items-center justify-between text-[8px] text-slate-400">
                              <span class="truncate max-w-[150px]">#{{ story.id }}: {{ story.title }}</span>
                              <span class="px-1 rounded font-bold uppercase text-[7px]" [ngClass]="['Closed', 'Resolved', 'Done', 'Completed'].includes(story.status) ? 'bg-emerald-950 text-emerald-400' : 'bg-rose-950 text-rose-400'">{{ story.status }}</span>
                            </div>
                          </div>
                        </div>

                        <!-- Child Tasks List (for User Story) -->
                        <div *ngIf="node.type === 'User Story' && node.tasks?.length" class="mt-2 pt-2 border-t border-slate-800/40">
                          <span class="text-indigo-400 font-bold block mb-1">📋 Tareas (Hijas):</span>
                          <div class="space-y-1 max-h-24 overflow-y-auto pr-1">
                            <div *ngFor="let task of node.tasks" class="flex items-center justify-between text-[8px] text-slate-400">
                              <span class="truncate max-w-[150px]">#{{ task.id }}: {{ task.title }}</span>
                              <span class="px-1 rounded font-bold uppercase text-[7px]" [ngClass]="['Closed', 'Resolved', 'Done', 'Completed'].includes(task.status) ? 'bg-emerald-950 text-emerald-400' : 'bg-rose-950 text-rose-400'">{{ task.status }}</span>
                            </div>
                          </div>
                        </div>

                        <!-- Child Bugs List -->
                        <div *ngIf="node.bugs?.length" class="mt-2 pt-2 border-t border-slate-800/40">
                          <span class="text-rose-455 font-bold block mb-1">🐞 Defectos Asociados (Hijos):</span>
                          <div class="space-y-1 max-h-24 overflow-y-auto pr-1">
                            <div *ngFor="let bug of node.bugs" class="flex items-center justify-between text-[8px] text-slate-400">
                              <span class="truncate max-w-[150px]" [title]="bug.title + (bug.tags ? ' | Tags: ' + bug.tags : '')">#{{ bug.id }}: {{ bug.title }} <span *ngIf="bug.tags" class="text-[7px] text-indigo-400 font-semibold">({{ bug.tags }})</span></span>
                              <span class="px-1 rounded font-bold uppercase text-[7px]" [ngClass]="bug.status === 'Closed' || bug.status === 'Resolved' || bug.status === 'Done' ? 'bg-emerald-950 text-emerald-400' : 'bg-rose-950 text-rose-400'">{{ bug.status }}</span>
                            </div>
                          </div>
                        </div>

                        <div *ngIf="!['kanban_standalone', 'sprint_standalone'].includes(node.id)" class="pt-1 mt-1 border-t border-slate-800/50 flex items-center justify-between">
                          <span class="text-slate-550 font-bold">Entrega:</span>
                          <span class="font-bold uppercase" 
                            [ngClass]="node.deliveryStatus === 'dentro' ? 'text-emerald-400' : 'text-rose-400'">
                            {{ node.deliveryStatus === 'dentro' ? 'Dentro del Sprint' : 'Fuera / Tarde' }}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                </div>
              </ng-container>
            </div>
          </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start mb-6">
          <div class="lg:col-span-12">
            <!-- Bugs Table for EED - separated in two tables -->
            <div class="space-y-8">
              
              <!-- Sprint Bugs Table -->
              <div>
                <div class="flex items-center justify-between mb-2">
                  <div class="flex items-center gap-2">
                    <span class="w-1.5 h-3 rounded-full bg-indigo-500 animate-pulse"></span>
                    <h5 class="text-[10px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-350">Defectos del Sprint (US y FT)</h5>
                  </div>
                  <span class="text-[9px] font-bold text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-800/40 px-2 py-0.5 rounded-md border border-slate-100 dark:border-slate-800/50">Cantidad: {{ getSprintBugsList().length }}</span>
                </div>
                <div class="overflow-x-auto rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
                  <table class="min-w-full divide-y divide-slate-100 dark:divide-slate-800 text-[11px]">
                    <thead class="bg-slate-50 dark:bg-slate-800/50 text-[10px] text-slate-400 uppercase font-bold">
                      <tr>
                        <th class="px-4 py-3 text-left">Proyecto</th>
                        <th class="px-4 py-3 text-left">Iteración</th>
                        <th class="px-4 py-3 text-center">Inicio</th>
                        <th class="px-4 py-3 text-center">Fin</th>
                        <th class="px-4 py-3 text-left">Tipo</th>
                        <th class="px-4 py-3 text-center">ID</th>
                        <th class="px-4 py-3 text-left">ISW</th>
                        <th class="px-4 py-3 text-center">Bug</th>
                        <th class="px-4 py-3 text-left">Título del Bug</th>
                        <th class="px-4 py-3 text-center">Creación</th>
                        <th class="px-4 py-3 text-center">Cierre</th>
                        <th class="px-4 py-3 text-center">Estado</th>
                        <th class="px-4 py-3 text-left">Observación</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300">
                      <tr *ngFor="let item of getSprintBugsList()" class="hover:bg-slate-50/50 dark:hover:bg-slate-800/10">
                        <td class="px-4 py-2.5 truncate max-w-[100px]" [title]="item.project">{{ item.project }}</td>
                        <td class="px-4 py-2.5 truncate max-w-[120px]" [title]="item.iteration">{{ item.iteration }}</td>
                        <td class="px-4 py-2.5 text-center">{{ item.startDate | date:'dd/MM/yyyy' }}</td>
                        <td class="px-4 py-2.5 text-center">{{ item.endDate | date:'dd/MM/yyyy' }}</td>
                        <td class="px-4 py-2.5 font-medium">{{ item.parentType }}</td>
                        <td class="px-4 py-2.5 text-center font-bold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer" (click)="item.parentId && openWorkItem(item.parentId)">{{ item.parentId || '—' }}</td>
                        <td class="px-4 py-2.5 truncate max-w-[90px]" [title]="item.isw">{{ item.isw }}</td>
                        <td class="px-4 py-2.5 text-center font-bold text-amber-600 hover:text-amber-800 hover:underline cursor-pointer" (click)="openWorkItem(item.bugId)">{{ item.bugId }}</td>
                        <td class="px-4 py-2.5 truncate max-w-[180px]" [title]="item.title">
                          <div class="font-semibold">{{ item.title }}</div>
                          <div *ngIf="item.tags" class="text-[9px] text-indigo-500 font-semibold truncate max-w-[170px]" [title]="item.tags">Tags: {{ item.tags }}</div>
                        </td>
                        <td class="px-4 py-2.5 text-center">{{ item.createdDate | date:'dd/MM/yyyy' }}</td>
                        <td class="px-4 py-2.5 text-center">{{ item.closedDate ? (item.closedDate | date:'dd/MM/yyyy') : '—' }}</td>
                        <td class="px-4 py-2.5 text-center">
                          <span class="px-2 py-0.5 rounded-full text-[9px] font-bold" [ngClass]="{
                            'bg-green-100 text-green-700': ['Closed', 'Done', 'Completed'].includes(item.status),
                            'bg-blue-100 text-blue-700': ['Proposed', 'New'].includes(item.status),
                            'bg-violet-100 text-violet-700': item.status === 'Resolved',
                            'bg-amber-100 text-amber-700': ['Active', 'Approved'].includes(item.status)
                          }">{{ item.status }}</span>
                        </td>
                        <td class="px-4 py-2.5">
                          <span class="font-medium" [ngClass]="{
                            'text-green-600': item.alignment === 'on-time',
                            'text-rose-500': item.alignment === 'late',
                            'text-slate-400': item.alignment === 'none'
                          }">
                            {{ item.alignment === 'on-time' ? 'Se cerró en tiempo' : item.alignment === 'late' ? 'Se cerró fuera de tiempo' : 'No cerrado' }}
                          </span>
                        </td>
                      </tr>
                      <tr *ngIf="getSprintBugsList().length === 0">
                        <td colspan="13" class="text-center py-6 text-slate-400 dark:text-slate-500 italic">No se detectaron bugs del sprint en este periodo.</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <!-- Kanban/Otro Sprint Bugs Table -->
              <div>
                <div class="flex items-center justify-between mb-2">
                  <div class="flex items-center gap-2">
                    <span class="w-1.5 h-3 rounded-full bg-blue-500"></span>
                    <h5 class="text-[10px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-350">Defectos de Otros Sprints (Atendidos por Kanban)</h5>
                  </div>
                  <span class="text-[9px] font-bold text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-800/40 px-2 py-0.5 rounded-md border border-slate-100 dark:border-slate-800/50">Cantidad: {{ getKanbanBugsList().length }}</span>
                </div>
                <div class="overflow-x-auto rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
                  <table class="min-w-full divide-y divide-slate-100 dark:divide-slate-800 text-[11px]">
                    <thead class="bg-slate-50 dark:bg-slate-800/50 text-[10px] text-slate-400 uppercase font-bold">
                      <tr>
                        <th class="px-4 py-3 text-left">Proyecto</th>
                        <th class="px-4 py-3 text-left">Iteración</th>
                        <th class="px-4 py-3 text-center">Inicio</th>
                        <th class="px-4 py-3 text-center">Fin</th>
                        <th class="px-4 py-3 text-left">Tipo</th>
                        <th class="px-4 py-3 text-center">ID</th>
                        <th class="px-4 py-3 text-left">ISW</th>
                        <th class="px-4 py-3 text-center">Bug</th>
                        <th class="px-4 py-3 text-left">Título del Bug</th>
                        <th class="px-4 py-3 text-center">Creación</th>
                        <th class="px-4 py-3 text-center">Cierre</th>
                        <th class="px-4 py-3 text-center">Estado</th>
                        <th class="px-4 py-3 text-left">Observación</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300">
                      <tr *ngFor="let item of getKanbanBugsList()" class="hover:bg-slate-50/50 dark:hover:bg-slate-800/10">
                        <td class="px-4 py-2.5 truncate max-w-[100px]" [title]="item.project">{{ item.project }}</td>
                        <td class="px-4 py-2.5 truncate max-w-[120px]" [title]="item.iteration">{{ item.iteration }}</td>
                        <td class="px-4 py-2.5 text-center">{{ item.startDate | date:'dd/MM/yyyy' }}</td>
                        <td class="px-4 py-2.5 text-center">{{ item.endDate | date:'dd/MM/yyyy' }}</td>
                        <td class="px-4 py-2.5">
                          <span class="px-2 py-0.5 rounded-full text-[9px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                                title="Bug de otro sprint atendido por Kanban">
                            Otro Sprint (Kanban)
                          </span>
                        </td>
                        <td class="px-4 py-2.5 text-center font-bold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer" (click)="item.parentId && openWorkItem(item.parentId)">{{ item.parentId || '—' }}</td>
                        <td class="px-4 py-2.5 truncate max-w-[90px]" [title]="item.isw">{{ item.isw }}</td>
                        <td class="px-4 py-2.5 text-center font-bold text-amber-600 hover:text-amber-800 hover:underline cursor-pointer" (click)="openWorkItem(item.bugId)">{{ item.bugId }}</td>
                        <td class="px-4 py-2.5 truncate max-w-[180px]" [title]="item.title">
                          <div class="font-semibold">{{ item.title }}</div>
                          <div *ngIf="item.tags" class="text-[9px] text-indigo-500 font-semibold truncate max-w-[170px]" [title]="item.tags">Tags: {{ item.tags }}</div>
                        </td>
                        <td class="px-4 py-2.5 text-center">{{ item.createdDate | date:'dd/MM/yyyy' }}</td>
                        <td class="px-4 py-2.5 text-center">{{ item.closedDate ? (item.closedDate | date:'dd/MM/yyyy') : '—' }}</td>
                        <td class="px-4 py-2.5 text-center">
                          <span class="px-2 py-0.5 rounded-full text-[9px] font-bold" [ngClass]="{
                            'bg-green-100 text-green-700': ['Closed', 'Done', 'Completed'].includes(item.status),
                            'bg-blue-100 text-blue-700': ['Proposed', 'New'].includes(item.status),
                            'bg-violet-100 text-violet-700': item.status === 'Resolved',
                            'bg-amber-100 text-amber-700': ['Active', 'Approved'].includes(item.status)
                          }">{{ item.status }}</span>
                        </td>
                        <td class="px-4 py-2.5">
                          <span class="font-medium text-slate-450 dark:text-slate-500">
                            —
                          </span>
                        </td>
                      </tr>
                      <tr *ngIf="getKanbanBugsList().length === 0">
                        <td colspan="13" class="text-center py-6 text-slate-400 dark:text-slate-500 italic">No se detectaron bugs Kanban de otros sprints en este periodo.</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
            <p class="text-[9px] text-slate-400 dark:text-slate-500 mt-2 italic leading-relaxed">
              La tabla indica los bugs creados a partir de las pruebas de requerimientos u otros bugs que tengan una relación "Affected by" o "Related". Para efectos de medición, los bugs relacionados sólo se contabilizan una vez aunque estén relacionados a varios ítems y aparezcan en la tabla más de una vez.
            </p>
          </div>
        </div>

        <div class="space-y-4 mb-8">
          <div *ngIf="metricAnalyses['eed']" class="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-lg border border-[rgb(255,77,17)]">
            <h4 class="text-xs font-bold uppercase text-[rgb(255,77,17)] mb-2 flex items-center justify-between w-full">
              <span class="flex items-center">
                <lucide-icon [name]="Sparkles" size="14" class="mr-1"></lucide-icon>
                Análisis de resultados e Acciones
              </span>
              <button (click)="copyAnalysis('eed', metricAnalyses['eed'])" 
                      class="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-[rgb(255,77,17)] transition-all flex items-center gap-1 text-[10px] normal-case cursor-pointer"
                      [title]="copiedKeys['eed'] ? 'Copiado' : 'Copiar análisis'">
                <lucide-icon [name]="copiedKeys['eed'] ? Check : Copy" size="12"></lucide-icon>
                <span>{{ copiedKeys['eed'] ? '¡Copiado!' : 'Copiar' }}</span>
              </button>
            </h4>
            <div class="text-sm leading-relaxed text-slate-700 dark:text-slate-350" [innerHTML]="formatAnalysisText(metricAnalyses['eed'])">
            </div>
          </div>
          <div *ngIf="!metricAnalyses['eed']" class="text-sm opacity-50 p-4 bg-slate-50 dark:bg-slate-800/30 rounded-lg">
            Genera el análisis IA para visualizar las recomendaciones.
          </div>
        </div>
      </div>
    </section>

    <!-- Section 3.6: Escaped Defects / Bugs Escapados -->
    <section class="glass-card !bg-white dark:!bg-slate-900 border-l-4 border-indigo-500 overflow-hidden mt-8">
      <div class="p-6">
        <div class="flex items-center justify-between mb-2">
          
            <div class="flex items-center justify-between gap-4 mb-4 flex-wrap">
              <h3 class="text-lg font-bold text-slate-400 uppercase tracking-tight">3.6 Métrica: Porcentaje de Bugs Escapados<span *ngIf="selectedSprintDisplayName" class="text-indigo-500 dark:text-indigo-400"> - {{ selectedSprintDisplayName }}</span></h3>
              <button 
                (click)="openCommentModal('escaped', '3.6 Métrica: Porcentaje de Bugs Escapados')"
                [ngClass]="{
                  'border-emerald-300 bg-emerald-50/40 text-emerald-600 dark:border-emerald-900/50 dark:bg-emerald-950/20 dark:text-emerald-400': metricComments['escaped'] && metricComments['escaped'].trim(),
                  'border-slate-200 bg-slate-50/50 text-slate-550 dark:border-slate-700/60 dark:bg-slate-800/20 dark:text-slate-450': !metricComments['escaped'] || !metricComments['escaped'].trim()
                }"
                class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[11px] font-bold transition-all active:scale-95 shadow-sm">
                <lucide-icon [name]="MessageSquare" size="13" [class.text-emerald-500]="metricComments['escaped'] && metricComments['escaped'].trim()"></lucide-icon>
                <span>{{ metricComments['escaped'] && metricComments['escaped'].trim() ? 'Nota Guardada' : 'Agregar Nota/Contexto' }}</span>
                <span *ngIf="metricComments['escaped'] && metricComments['escaped'].trim()" class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              </button>
            </div>
    
          <div class="px-3 py-1 rounded-full text-xs font-bold uppercase" [ngClass]="{
            'bg-green-100 text-green-700': filteredEscapedBugs.status === 'green',
            'bg-yellow-100 text-yellow-700': filteredEscapedBugs.status === 'yellow',
            'bg-red-100 text-red-700': filteredEscapedBugs.status === 'red'
          }">
            {{ filteredEscapedBugs.status }}
          </div>
        </div>

        <p class="text-xs text-slate-500 mb-6 leading-relaxed bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border-l-2 border-indigo-500">
          Esta métrica realiza la medición del porcentaje de bugs escapados a producción contra el número de bugs detectados antes de la entrega del paquete de liberación. <br/>
          <strong>Fórmula:</strong> KPI Defectos Escapados = (∑ bugs en producción / ∑ bugs detectados antes de la liberación) x 100.
          <br><span class="font-bold text-slate-700 dark:text-slate-350">Umbrales:</span> Verde &le; 33% | Amarillo &le; 40% | Rojo &gt; 40%
        </p>

        <!-- Sprint Comparison Selector for Escaped Bugs -->
        <div class="mb-4">
          <button (click)="showCompareEscapedPanel = !showCompareEscapedPanel"
                  class="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors cursor-pointer mb-2">
            <lucide-icon [name]="showCompareEscapedPanel ? ChevronDown : ChevronDown" size="13"></lucide-icon>
            {{ showCompareEscapedPanel ? 'Ocultar' : 'Comparar sprints anteriores' }}
          </button>

          <div *ngIf="showCompareEscapedPanel" class="bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800 p-4 animate-in fade-in duration-200">
            <p class="text-xs text-slate-400 mb-3 font-bold uppercase tracking-wide">Selecciona sprints a comparar en tendencia de bugs escapados</p>
            <div class="flex flex-wrap gap-2 mb-3">
              <label *ngFor="let iter of iterations" class="flex items-center gap-1.5 cursor-pointer group">
                <input type="checkbox"
                       [value]="iter.id"
                       [checked]="selectedCompareEscapedIterations.includes(iter.id)"
                       (change)="onCompareEscapedToggle(iter.id, $event)"
                       class="w-3.5 h-3.5 rounded accent-indigo-500 cursor-pointer">
                <span class="text-[11px] font-medium text-slate-600 dark:text-slate-300 group-hover:text-indigo-500 transition-colors">{{ iter.name }}</span>
              </label>
            </div>
            <div class="flex gap-2">
              <button (click)="loadCompareEscaped()"
                      [disabled]="selectedCompareEscapedIterations.length === 0 || isLoadingCompareEscaped"
                      class="text-[11px] font-bold px-3 py-1.5 bg-indigo-500 hover:bg-indigo-650 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg transition-all cursor-pointer flex items-center gap-1.5">
                <lucide-icon *ngIf="isLoadingCompareEscaped" [name]="RefreshCw" size="11" class="animate-spin"></lucide-icon>
                {{ isLoadingCompareEscaped ? 'Cargando...' : 'Generar comparativa' }}
              </button>
              <button *ngIf="selectedCompareEscapedIterations.length > 0" (click)="clearCompareEscaped()"
                      class="text-[11px] font-medium px-3 py-1.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 rounded-lg transition-all cursor-pointer">
                Limpiar
              </button>
            </div>
          </div>
        </div>

        <!-- KPI summary grid -->
        <div class="grid grid-cols-2 md:grid-cols-6 gap-4 mb-8">
          <div class="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800 text-center">
            <div class="text-[9px] text-slate-400 uppercase font-bold mb-1">Bugs Testing</div>
            <div class="text-2xl font-bold">{{ filteredEscapedBugs.bugsTesting }}</div>
          </div>
          <div class="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800 text-center">
            <div class="text-[9px] text-slate-400 uppercase font-bold mb-1">Bugs UAT</div>
            <div class="text-2xl font-bold">{{ filteredEscapedBugs.bugsUat }}</div>
          </div>
          <div class="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800 text-center">
            <div class="text-[9px] text-slate-400 uppercase font-bold mb-1">Bugs Producción</div>
            <div class="text-2xl font-bold text-rose-650">{{ filteredEscapedBugs.bugsProd }}</div>
          </div>
          <div class="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800 text-center">
            <div class="text-[9px] text-slate-400 uppercase font-bold mb-1">Total Bugs</div>
            <div class="text-2xl font-bold">{{ filteredEscapedBugs.totalBugs }}</div>
          </div>
          <div class="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800 text-center relative overflow-hidden flex flex-col justify-center items-center">
            <div class="text-[9px] text-slate-400 uppercase font-bold mb-1">Desviación Estándar</div>
            <div class="text-2xl font-bold">
              {{ filteredEscapedBugs.stdDeviation.toFixed(2) }}%
            </div>
            <div class="text-[8px] text-slate-400 mt-0.5">Umbral: 30.00%</div>
          </div>
          <div class="p-4 rounded-xl text-center relative overflow-hidden border transition-all duration-300 flex flex-col justify-center items-center" [ngClass]="{
            'bg-emerald-50/50 border-emerald-100 dark:bg-emerald-950/10 dark:border-emerald-900/30': filteredEscapedBugs.status === 'green',
            'bg-amber-50/50 border-amber-100 dark:bg-amber-950/10 dark:border-amber-900/30': filteredEscapedBugs.status === 'yellow',
            'bg-rose-50/50 border-rose-100 dark:bg-rose-950/10 dark:border-rose-900/30': filteredEscapedBugs.status === 'red'
          }">
            <div class="text-xs uppercase font-bold mb-1" [ngClass]="{
              'text-emerald-600 dark:text-emerald-400': filteredEscapedBugs.status === 'green',
              'text-amber-600 dark:text-amber-400': filteredEscapedBugs.status === 'yellow',
              'text-rose-600 dark:text-rose-400': filteredEscapedBugs.status === 'red'
            }">KPI Bugs Escapados</div>
            <div class="text-3xl font-black" [ngClass]="{
              'text-emerald-700 dark:text-emerald-300': filteredEscapedBugs.status === 'green',
              'text-amber-700 dark:text-amber-300': filteredEscapedBugs.status === 'yellow',
              'text-rose-700 dark:text-rose-300': filteredEscapedBugs.status === 'red'
            }">
              {{ filteredEscapedBugs.rate.toFixed(2) }}%
            </div>
            <div class="text-[8pt] opacity-85" [ngClass]="{
              'text-emerald-600/85 dark:text-emerald-400/85': filteredEscapedBugs.status === 'green',
              'text-amber-600/85 dark:text-amber-400/85': filteredEscapedBugs.status === 'yellow',
              'text-rose-600/85 dark:text-rose-400/85': filteredEscapedBugs.status === 'red'
            }">Umbrales: 33%, 40%</div>
          </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          <!-- Table -->
          <div class="bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div class="overflow-x-auto">
              <table class="w-full text-left border-collapse">
                <thead>
                  <tr class="bg-slate-100 dark:bg-slate-900 text-[10px] uppercase font-black text-slate-500 border-b border-slate-200 dark:border-slate-800">
                    <th class="p-3 w-8"></th>
                    <th class="p-3">Proyecto</th>
                    <th class="p-3">Iteración</th>
                    <th class="p-3 text-center">Testing</th>
                    <th class="p-3 text-center">UAT</th>
                    <th class="p-3 text-center">Prod</th>
                    <th class="p-3 text-center">Total</th>
                    <th class="p-3 text-center">%</th>
                  </tr>
                </thead>
                <tbody class="text-xs divide-y divide-slate-100 dark:divide-slate-800/50">
                  <ng-container *ngFor="let r of filteredEscapedBugs.rows">
                    <tr class="hover:bg-slate-100/50 dark:hover:bg-slate-850/50 transition-colors">
                      <td class="p-3 text-center">
                        <button *ngIf="r.bugs?.length" (click)="toggleExpandBugRow(r.fullIteration)"
                          class="w-6 h-6 rounded-full flex items-center justify-center text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 transition-all">
                          <lucide-icon [name]="ChevronDown" size="14" class="transition-transform duration-200"
                            [class.-rotate-90]="!expandedBugRows.has(r.fullIteration)"></lucide-icon>
                        </button>
                        <span *ngIf="!r.bugs?.length" class="text-slate-200 text-xs">—</span>
                      </td>
                      <td class="p-3 font-medium truncate max-w-[120px]" [title]="r.projectFull">{{ r.project }}</td>
                      <td class="p-3 font-medium">{{ r.iteration }}</td>
                      <td class="p-3 text-center text-slate-500">{{ r.testing }}</td>
                      <td class="p-3 text-center text-indigo-500">{{ r.uat }}</td>
                      <td class="p-3 text-center text-rose-500">{{ r.produccion }}</td>
                      <td class="p-3 text-center font-bold">{{ r.total }}</td>
                      <td class="p-3 text-center">
                        <span class="px-2 py-0.5 rounded-full font-bold text-[10px]" [ngClass]="{
                          'bg-emerald-100 text-emerald-700': r.rate <= 33,
                          'bg-amber-100 text-amber-700': r.rate > 33 && r.rate <= 40,
                          'bg-red-100 text-red-700': r.rate > 40
                        }">
                          {{ r.rate.toFixed(1) }}%
                        </span>
                      </td>
                    </tr>
                    <!-- Expanded bugs details row -->
                    <tr *ngIf="expandedBugRows.has(r.fullIteration)" class="bg-slate-50/70 dark:bg-slate-800/40">
                      <td colspan="8" class="p-0">
                        <div class="p-4">
                          <div class="space-y-2 max-h-96 overflow-y-auto">
                            <div *ngFor="let bug of r.bugs" class="bg-white dark:bg-slate-700/50 p-3 rounded-lg border border-slate-200 dark:border-slate-600 text-[10px]">
                              <div class="flex items-start justify-between gap-2">
                                <div class="flex-1 min-w-0">
                                  <div class="flex items-center gap-2 mb-1">
                                    <span class="font-bold text-blue-600 dark:text-blue-400">#{{ bug.id }}</span>
                                    <span class="px-2 py-0.5 rounded text-[9px] font-bold uppercase" [ngClass]="{
                                      'bg-slate-200 text-slate-700': bug.classification === 'testing',
                                      'bg-indigo-200 text-indigo-700': bug.classification === 'uat',
                                      'bg-rose-200 text-rose-700': bug.classification === 'produccion'
                                    }">
                                      {{ bug.classification }}
                                    </span>
                                  </div>
                                  <div class="text-slate-700 dark:text-slate-300 truncate max-w-md" [title]="bug.title">{{ bug.title }}</div>
                                  <div class="text-slate-500 dark:text-slate-400 mt-1 space-y-0.5">
                                    <div><span class="font-bold">Estado:</span> {{ bug.status }}</div>
                                    <div><span class="font-bold">Creado:</span> {{ bug.createdDate | date:'dd/MM/yyyy' }}</div>
                                  </div>
                                </div>
                              </div>
                            </div>
                            <div *ngIf="!r.bugs?.length" class="text-center py-4 text-slate-400 italic">
                              No hay bugs para esta fila.
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  </ng-container>
                  <tr *ngIf="filteredEscapedBugs.rows.length === 0">
                    <td colspan="8" class="text-center py-6 text-slate-400 italic">No hay datos de bugs para los filtros seleccionados.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Chart -->
          <div class="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
            <div class="h-80">
              <canvas #escapedChart></canvas>
            </div>
          </div>
        </div>

        <div class="mt-8 border-t border-slate-100 dark:border-slate-800 pt-6">
          <div class="space-y-4">
            <div *ngIf="metricAnalyses['escaped']" class="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-lg border border-[rgb(255,77,17)]">
              <h4 class="text-xs font-bold uppercase text-[rgb(255,77,17)] mb-2 flex items-center justify-between w-full">
                <span class="flex items-center">
                  <lucide-icon [name]="Sparkles" size="14" class="mr-1"></lucide-icon>
                  Análisis de resultados e Acciones
                </span>
                <button (click)="copyAnalysis('escaped', metricAnalyses['escaped'])" 
                        class="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-[rgb(255,77,17)] transition-all flex items-center gap-1 text-[10px] normal-case cursor-pointer"
                        [title]="copiedKeys['escaped'] ? 'Copiado' : 'Copiar análisis'">
                  <lucide-icon [name]="copiedKeys['escaped'] ? Check : Copy" size="12"></lucide-icon>
                  <span>{{ copiedKeys['escaped'] ? '¡Copiado!' : 'Copiar' }}</span>
                </button>
              </h4>
              <div class="text-sm leading-relaxed text-slate-700 dark:text-slate-300" [innerHTML]="formatAnalysisText(metricAnalyses['escaped'])">
              </div>
            </div>
            <div *ngIf="!metricAnalyses['escaped']" class="text-sm opacity-50 p-4 bg-slate-50 dark:bg-slate-800/30 rounded-lg">
              Genera el análisis IA para visualizar las recomendaciones.
            </div>
          </div>
        </div>

      </div>
    </section>

    <!-- Section 3.7: Test Execution / Ejecución de Pruebas -->
    <section class="glass-card !bg-white dark:!bg-slate-900 border-l-4 border-emerald-500 overflow-hidden mt-8">
      <div class="p-6">
        
            <div class="flex items-center justify-between gap-4 mb-4 flex-wrap">
              <h3 class="text-lg font-bold text-slate-400 uppercase tracking-tight">3.7 Métrica: % Ejecución de Pruebas<span *ngIf="selectedSprintDisplayName" class="text-indigo-500 dark:text-indigo-400"> - {{ selectedSprintDisplayName }}</span></h3>
              <button 
                (click)="openCommentModal('runRate', '3.7 Métrica: % Ejecución de Pruebas')"
                [ngClass]="{
                  'border-emerald-300 bg-emerald-50/40 text-emerald-600 dark:border-emerald-900/50 dark:bg-emerald-950/20 dark:text-emerald-400': metricComments['runRate'] && metricComments['runRate'].trim(),
                  'border-slate-200 bg-slate-50/50 text-slate-550 dark:border-slate-700/60 dark:bg-slate-800/20 dark:text-slate-450': !metricComments['runRate'] || !metricComments['runRate'].trim()
                }"
                class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[11px] font-bold transition-all active:scale-95 shadow-sm">
                <lucide-icon [name]="MessageSquare" size="13" [class.text-emerald-500]="metricComments['runRate'] && metricComments['runRate'].trim()"></lucide-icon>
                <span>{{ metricComments['runRate'] && metricComments['runRate'].trim() ? 'Nota Guardada' : 'Agregar Nota/Contexto' }}</span>
                <span *ngIf="metricComments['runRate'] && metricComments['runRate'].trim()" class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              </button>
            </div>
    

        <p class="text-xs text-slate-550 mb-6 leading-relaxed bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border-l-2 border-emerald-500">
          Esta métrica calcula el porcentaje de ejecución de pruebas en el proceso de desarrollo de software.<br/>
          <strong>Fórmula:</strong> KPI Run Rate = (∑ Test Points ejecutados / Total de Test Points) x 100. Solo se consideran los test points dentro de la vigencia del sprint.
          <br><span class="font-bold text-slate-700 dark:text-slate-350">Meta establecida:</span> 100.00% | <span class="font-bold text-slate-700 dark:text-slate-350">Umbrales:</span> Verde &ge; 90% | Amarillo &ge; 80% | Rojo &lt; 80%
        </p>

        <!-- KPI summary grid -->
        <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-8">
          <div class="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800 text-center">
            <div class="text-[9px] text-slate-400 uppercase font-bold mb-1">Total Test Points</div>
            <div class="text-2xl font-bold">{{ metrics.testExecution?.totalTestPoints || 0 }}</div>
          </div>
          <div class="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800 text-center">
            <div class="text-[9px] text-slate-400 uppercase font-bold mb-1">Passed en Tiempo</div>
            <div class="text-2xl font-bold">{{ metrics.testExecution?.passedEnTiempo || 0 }}</div>
          </div>
          <div class="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800 text-center">
            <div class="text-[9px] text-slate-400 uppercase font-bold mb-1">Passed fuera de Tiempo</div>
            <div class="text-2xl font-bold">{{ metrics.testExecution?.passedFueraDeTiempo || 0 }}</div>
          </div>
          <div class="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800 text-center">
            <div class="text-[9px] text-slate-400 uppercase font-bold mb-1">Failed</div>
            <div class="text-2xl font-bold">{{ metrics.testExecution?.failed || 0 }}</div>
          </div>
          <div class="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800 text-center">
            <div class="text-[9px] text-slate-400 uppercase font-bold mb-1">Blocked</div>
            <div class="text-2xl font-bold">{{ metrics.testExecution?.blocked || 0 }}</div>
          </div>
          <div class="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800 text-center">
            <div class="text-[9px] text-slate-400 uppercase font-bold mb-1">Not Executed</div>
            <div class="text-2xl font-bold">{{ metrics.testExecution?.notExecuted || 0 }}</div>
          </div>
          <div class="p-4 rounded-xl text-center relative overflow-hidden border transition-all duration-300 flex flex-col justify-center items-center" [ngClass]="{
            'bg-emerald-50/50 border-emerald-100 dark:bg-emerald-950/10 dark:border-emerald-900/30': metrics.testExecution?.status === 'green',
            'bg-amber-50/50 border-amber-100 dark:bg-amber-950/10 dark:border-amber-900/30': metrics.testExecution?.status === 'yellow',
            'bg-rose-50/50 border-rose-100 dark:bg-rose-950/10 dark:border-rose-900/30': metrics.testExecution?.status === 'red'
          }">
            <div class="text-xs uppercase font-bold mb-1" [ngClass]="{
              'text-emerald-600 dark:text-emerald-400': metrics.testExecution?.status === 'green',
              'text-amber-600 dark:text-amber-400': metrics.testExecution?.status === 'yellow',
              'text-rose-600 dark:text-rose-400': metrics.testExecution?.status === 'red'
            }">KPI Run Rate</div>
            <div class="text-3xl font-black" [ngClass]="{
              'text-emerald-700 dark:text-emerald-300': metrics.testExecution?.status === 'green',
              'text-amber-700 dark:text-amber-300': metrics.testExecution?.status === 'yellow',
              'text-rose-700 dark:text-rose-300': metrics.testExecution?.status === 'red'
            }">{{ metrics.testExecution?.rate?.toFixed(2) || '0.00' }}%</div>
            <div class="text-[8pt] opacity-85" [ngClass]="{
              'text-emerald-600/85 dark:text-emerald-400/85': metrics.testExecution?.status === 'green',
              'text-amber-600/85 dark:text-amber-400/85': metrics.testExecution?.status === 'yellow',
              'text-rose-600/85 dark:text-rose-400/85': metrics.testExecution?.status === 'red'
            }">Umbrales: 90%, 80%</div>
          </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <!-- Table -->
          <div class="lg:col-span-8 bg-white dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
            <div class="overflow-x-auto max-h-80">
              <table class="w-full text-left border-collapse">
                <thead>
                  <tr class="bg-slate-100 dark:bg-slate-900 text-[10px] uppercase font-black text-slate-500 border-b border-slate-200 dark:border-slate-800">
                    <th class="p-3 w-8"></th>
                    <th class="p-3">Test Title</th>
                    <th class="p-3">Test Point ID</th>
                    <th class="p-3">Test Case ID</th>
                    <th class="p-3">Tester</th>
                    <th class="p-3 text-center">En Tiempo</th>
                    <th class="p-3 text-center">Resultado</th>
                  </tr>
                </thead>
                <tbody class="text-xs divide-y divide-slate-100 dark:divide-slate-800/50">
                  <ng-container *ngFor="let group of getGroupedTestPoints()">
                    <!-- Parent row -->
                    <tr class="hover:bg-slate-100/50 dark:hover:bg-slate-850/50 transition-colors" 
                        [class.bg-emerald-50]="expandedTestPoints.has(group.key)"
                        (click)="toggleExpandTestPoints(group.key)">
                      <td class="p-3 text-center">
                        <lucide-icon [name]="ChevronDown" size="14" class="transition-transform duration-200 inline-block"
                          [class.-rotate-90]="!expandedTestPoints.has(group.key)"></lucide-icon>
                      </td>
                      <td class="p-3 font-bold truncate" [title]="group.title">{{ group.title }}
                        <span class="ml-2 text-[9px] bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">{{ group.points.length }}</span>
                      </td>
                      <td colspan="4" class="p-3 text-slate-400 italic">Click to expand</td>
                    </tr>
                    <!-- Child rows -->
                    <ng-container *ngIf="expandedTestPoints.has(group.key)">
                      <tr *ngFor="let pt of group.points" class="bg-slate-50/70 dark:bg-slate-800/40 hover:bg-white/50 dark:hover:bg-slate-700/30 transition-colors">
                        <td></td>
                        <td class="p-2 font-medium truncate max-w-[150px]" [title]="pt.testCaseTitle">{{ pt.testCaseTitle }}</td>
                        <td class="p-2 text-slate-500 font-mono text-[10px]">#{{ pt.testPointId }}</td>
                        <td class="p-2 text-indigo-500 font-bold hover:underline cursor-pointer" (click)="openWorkItem(pt.testCaseId); $event.stopPropagation()">#{{ pt.testCaseId }}</td>
                        <td class="p-2 text-slate-500">{{ pt.tester && pt.tester.trim() ? pt.tester : 'Sin asignar' }}</td>
                        <td class="p-2 text-center">
                          <span class="px-2 py-0.5 rounded-full font-bold text-[9px] uppercase" [ngClass]="{
                            'bg-emerald-100 text-emerald-700': pt.onTime,
                            'bg-red-100 text-red-700': !pt.onTime
                          }">
                            {{ pt.onTime ? 'Sí' : 'No' }}
                          </span>
                        </td>
                        <td class="p-2 text-center">
                          <span class="px-2 py-0.5 rounded-full font-bold text-[9px] uppercase" [ngClass]="{
                            'bg-emerald-100 text-emerald-700': pt.outcome.toLowerCase() === 'passed',
                            'bg-red-100 text-red-700': pt.outcome.toLowerCase() === 'failed',
                            'bg-amber-100 text-amber-700': pt.outcome.toLowerCase() === 'blocked',
                            'bg-slate-100 text-slate-550': pt.outcome.toLowerCase() === 'none' || pt.outcome.toLowerCase() === 'active',
                            'bg-purple-100 text-purple-700': pt.outcome.toLowerCase() === 'notapplicable' || pt.outcome.toLowerCase() === 'not applicable'
                          }">
                            {{ pt.outcome }}
                          </span>
                        </td>
                      </tr>
                    </ng-container>
                  </ng-container>
                  <tr *ngIf="!metrics?.testExecution?.testPoints?.length">
                    <td colspan="7" class="text-center py-6 text-slate-400 italic">No hay datos de pruebas para este periodo.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Chart -->
          <div class="lg:col-span-4 bg-white dark:bg-slate-800/50 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <h4 class="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">Distribución de resultados</h4>
            <div class="h-56 flex items-center justify-center">
              <canvas #testExecChart></canvas>
            </div>
            <!-- Mini legend totals -->
            <div class="mt-3 grid grid-cols-2 gap-1.5 text-[10px]">
              <div class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0"></span><span class="text-slate-600 dark:text-slate-400">En Tiempo: <strong>{{ metrics.testExecution?.passedEnTiempo || 0 }}</strong></span></div>
              <div class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0"></span><span class="text-slate-600 dark:text-slate-400">Fuera Tiempo: <strong>{{ metrics.testExecution?.passedFueraDeTiempo || 0 }}</strong></span></div>
              <div class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-red-500 shrink-0"></span><span class="text-slate-600 dark:text-slate-400">Failed: <strong>{{ metrics.testExecution?.failed || 0 }}</strong></span></div>
              <div class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0"></span><span class="text-slate-600 dark:text-slate-400">Blocked: <strong>{{ metrics.testExecution?.blocked || 0 }}</strong></span></div>
              <div class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-slate-400 shrink-0"></span><span class="text-slate-600 dark:text-slate-400">N/Exec: <strong>{{ metrics.testExecution?.notExecuted || 0 }}</strong></span></div>
              <div class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-slate-350 dark:bg-slate-600 shrink-0"></span><span class="text-slate-600 dark:text-slate-400">N/A: <strong>{{ metrics.testExecution?.notApplicable || 0 }}</strong></span></div>
            </div>
          </div>
        </div>

        <div class="mt-8 border-t border-slate-100 dark:border-slate-800 pt-6">
          <div class="space-y-4">
            <div class="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-lg border border-[rgb(255,77,17)]">
              <h4 class="text-xs font-bold uppercase text-[rgb(255,77,17)] mb-2 flex items-center justify-between w-full">
                <span class="flex items-center">
                  <lucide-icon [name]="Sparkles" size="14" class="mr-1"></lucide-icon>
                  Análisis de resultados e Acciones
                </span>
                <button *ngIf="metricAnalyses['testExecution'] || metricAnalyses['ejecución de pruebas']" 
                        (click)="copyAnalysis('testExecution', getTestExecutionAnalysis())" 
                        class="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-[rgb(255,77,17)] transition-all flex items-center gap-1 text-[10px] normal-case cursor-pointer"
                        [title]="copiedKeys['testExecution'] ? 'Copiado' : 'Copiar análisis'">
                  <lucide-icon [name]="copiedKeys['testExecution'] ? Check : Copy" size="12"></lucide-icon>
                  <span>{{ copiedKeys['testExecution'] ? '¡Copiado!' : 'Copiar' }}</span>
                </button>
              </h4>
              <div class="text-sm leading-relaxed text-slate-700 dark:text-slate-350" [innerHTML]="formatAnalysisText(getTestExecutionAnalysis())">
              </div>
            </div>
          </div>
        </div>

      </div>
    </section>

    <!-- Section 3.8: Satisfactory Tests / % Pruebas Satisfactorias -->
    <section class="glass-card !bg-white dark:!bg-slate-900 border-l-4 border-teal-500 overflow-hidden mt-8">
      <div class="p-6">
        <div class="flex items-center justify-between mb-2">
          
            <div class="flex items-center justify-between gap-4 mb-4 flex-wrap">
              <h3 class="text-lg font-bold text-slate-400 uppercase tracking-tight">3.8 Métrica: % Pruebas Satisfactorias<span *ngIf="selectedSprintDisplayName" class="text-indigo-500 dark:text-indigo-400"> - {{ selectedSprintDisplayName }}</span></h3>
              <button 
                (click)="openCommentModal('passRate', '3.8 Métrica: % Pruebas Satisfactorias')"
                [ngClass]="{
                  'border-emerald-300 bg-emerald-50/40 text-emerald-600 dark:border-emerald-900/50 dark:bg-emerald-950/20 dark:text-emerald-400': metricComments['passRate'] && metricComments['passRate'].trim(),
                  'border-slate-200 bg-slate-50/50 text-slate-550 dark:border-slate-700/60 dark:bg-slate-800/20 dark:text-slate-450': !metricComments['passRate'] || !metricComments['passRate'].trim()
                }"
                class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[11px] font-bold transition-all active:scale-95 shadow-sm">
                <lucide-icon [name]="MessageSquare" size="13" [class.text-emerald-500]="metricComments['passRate'] && metricComments['passRate'].trim()"></lucide-icon>
                <span>{{ metricComments['passRate'] && metricComments['passRate'].trim() ? 'Nota Guardada' : 'Agregar Nota/Contexto' }}</span>
                <span *ngIf="metricComments['passRate'] && metricComments['passRate'].trim()" class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              </button>
            </div>
    
          <div class="px-3 py-1 rounded-full text-xs font-bold uppercase" [ngClass]="{
            'bg-green-100 text-green-700': m38Stats.status === 'green',
            'bg-yellow-100 text-yellow-700': m38Stats.status === 'yellow',
            'bg-red-100 text-red-700': m38Stats.status === 'red'
          }">
            {{ m38Stats.status }}
          </div>
        </div>

        <p class="text-xs text-slate-550 mb-6 leading-relaxed bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border-l-2 border-teal-500">
          Esta métrica mide la efectividad de las pruebas ejecutadas, calculando el porcentaje de test points que finalizaron con resultado satisfactorio (Passed) respecto al total de pruebas que fueron ejecutadas.<br/>
          <strong>Fórmula:</strong> KPI Pass Rate = (∑ Test Points Passed / Total de Test Points Ejecutados) x 100. Solo se consideran los test points dentro de la vigencia del sprint.
          <br><span class="font-bold text-slate-700 dark:text-slate-350">Meta establecida:</span> 100.00% | <span class="font-bold text-slate-700 dark:text-slate-350">Umbrales:</span> Verde &ge; 90% | Amarillo &ge; 80% | Rojo &lt; 80%
        </p>

        <!-- KPI summary grid -->
        <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-9 gap-3 mb-8">
          <div class="bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 text-center">
            <div class="text-[9px] text-slate-400 uppercase font-bold mb-1">Total Test Point</div>
            <div class="text-xl font-bold">{{ m38Stats.total }}</div>
          </div>
          <div class="bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 text-center">
            <div class="text-[9px] text-emerald-500 uppercase font-bold mb-1">Passed en Tiempo</div>
            <div class="text-xl font-bold text-emerald-600 dark:text-emerald-400">{{ m38Stats.passedEnTiempo }}</div>
          </div>
          <div class="bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 text-center">
            <div class="text-[9px] text-rose-500 uppercase font-bold mb-1">Passed fuera de Tiempo</div>
            <div class="text-xl font-bold text-rose-600 dark:text-rose-400">{{ m38Stats.passedFueraDeTiempo }}</div>
          </div>
          <div class="bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 text-center">
            <div class="text-[9px] text-red-500 uppercase font-bold mb-1">Failed</div>
            <div class="text-xl font-bold text-red-500">{{ m38Stats.failed }}</div>
          </div>
          <div class="bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 text-center">
            <div class="text-[9px] text-slate-400 uppercase font-bold mb-1">Not Executed (None)</div>
            <div class="text-xl font-bold text-slate-500">{{ m38Stats.notExecuted }}</div>
          </div>
          <div class="bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 text-center">
            <div class="text-[9px] text-purple-400 uppercase font-bold mb-1">Not Applicable</div>
            <div class="text-xl font-bold text-purple-400">{{ m38Stats.notApplicable }}</div>
          </div>
          <div class="bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 text-center">
            <div class="text-[9px] text-amber-500 uppercase font-bold mb-1">Blocked</div>
            <div class="text-xl font-bold text-amber-500">{{ m38Stats.blocked }}</div>
          </div>
          <div class="bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 text-center">
            <div class="text-[9px] text-pink-500 uppercase font-bold mb-1">Paused</div>
            <div class="text-xl font-bold text-pink-500">{{ m38Stats.paused }}</div>
          </div>
          
          <div class="p-3.5 rounded-xl text-center relative overflow-hidden border transition-all duration-300 flex flex-col justify-center items-center col-span-2 md:col-span-1" [ngClass]="{
            'bg-emerald-50/50 border-emerald-100 dark:bg-emerald-950/10 dark:border-emerald-900/30': m38Stats.status === 'green',
            'bg-amber-50/50 border-amber-100 dark:bg-amber-950/10 dark:border-amber-900/30': m38Stats.status === 'yellow',
            'bg-rose-50/50 border-rose-100 dark:bg-rose-950/10 dark:border-rose-900/30': m38Stats.status === 'red'
          }">
            <div class="text-[10px] uppercase font-bold mb-0.5" [ngClass]="{
              'text-emerald-600 dark:text-emerald-400': m38Stats.status === 'green',
              'text-amber-600 dark:text-amber-400': m38Stats.status === 'yellow',
              'text-rose-600 dark:text-rose-400': m38Stats.status === 'red'
            }">KPI Pass Rate</div>
            <div class="text-2xl font-black flex items-center justify-center gap-0.5" [ngClass]="{
              'text-emerald-700 dark:text-emerald-300': m38Stats.status === 'green',
              'text-amber-700 dark:text-amber-300': m38Stats.status === 'yellow',
              'text-rose-700 dark:text-rose-300': m38Stats.status === 'red'
            }">
              {{ m38Stats.rate.toFixed(2) }}%
              <span *ngIf="m38Stats.status !== 'green'" class="text-rose-500 font-bold text-sm animate-pulse">!</span>
            </div>
            <div class="text-[8px] opacity-75" [ngClass]="{
              'text-emerald-600/80 dark:text-emerald-400/80': m38Stats.status === 'green',
              'text-amber-600/80 dark:text-amber-400/80': m38Stats.status === 'yellow',
              'text-rose-600/80 dark:text-rose-400/80': m38Stats.status === 'red'
            }">Umbrales: 90%, 80%</div>
          </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <!-- Table -->
          <div class="lg:col-span-8 bg-white dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
            <div class="overflow-x-auto max-h-80">
              <table class="w-full text-left border-collapse">
                <thead>
                  <tr class="bg-slate-100 dark:bg-slate-900 text-[10px] uppercase font-black text-slate-500 border-b border-slate-200 dark:border-slate-800">
                    <th class="p-3">Test Point ID</th>
                    <th class="p-3">Test Case ID</th>
                    <th class="p-3">Estatus</th>
                    <th class="p-3 text-center">Fecha Test Plan</th>
                    <th class="p-3 text-center">Fecha de Ejecución</th>
                    <th class="p-3 text-center">¿En Tiempo?</th>
                  </tr>
                </thead>
                <tbody class="text-xs divide-y divide-slate-100 dark:divide-slate-800/50">
                  <tr *ngFor="let pt of getFilteredM38TestPoints()" class="hover:bg-slate-50/50 dark:hover:bg-slate-850/50 transition-colors">
                    <td class="p-2.5 font-mono text-[10px] text-slate-500">#{{ pt.testPointId }}</td>
                    <td class="p-2.5 text-indigo-500 font-bold hover:underline cursor-pointer" (click)="openWorkItem(pt.testCaseId)">#{{ pt.testCaseId }}</td>
                    <td class="p-2.5">
                      <span class="px-2 py-0.5 rounded-full font-bold text-[9px] uppercase" [ngClass]="{
                        'bg-emerald-100 text-emerald-700': pt.outcome.toLowerCase() === 'passed',
                        'bg-red-100 text-red-700': pt.outcome.toLowerCase() === 'failed',
                        'bg-amber-100 text-amber-700': pt.outcome.toLowerCase() === 'blocked',
                        'bg-slate-100 text-slate-550': pt.outcome.toLowerCase() === 'none' || pt.outcome.toLowerCase() === 'active',
                        'bg-purple-100 text-purple-700': pt.outcome.toLowerCase() === 'notapplicable' || pt.outcome.toLowerCase() === 'not applicable'
                      }">
                        {{ pt.outcome }}
                      </span>
                    </td>
                    <td class="p-2.5 text-center text-slate-500">{{ pt.planEndDate ? (pt.planEndDate | date:'dd/MM/yyyy':'UTC') : (metrics.endDate | date:'dd/MM/yyyy':'UTC') }}</td>
                    <td class="p-2.5 text-center text-slate-500">
                      {{ (pt.outcome.toLowerCase() !== 'none' && pt.outcome.toLowerCase() !== 'active') ? (pt.lastUpdatedDate | date:'dd/MM/yyyy':'UTC') : '' }}
                    </td>
                    <td class="p-2.5 text-center">
                      <span class="px-2 py-0.5 rounded-full font-bold text-[9px] uppercase" *ngIf="pt.outcome.toLowerCase() !== 'none' && pt.outcome.toLowerCase() !== 'active' && pt.outcome.toLowerCase() !== 'notapplicable' && pt.outcome.toLowerCase() !== 'not applicable'" [ngClass]="{
                        'bg-emerald-100 text-emerald-700': pt.onTime,
                        'bg-red-100 text-red-700': !pt.onTime
                      }">
                        {{ pt.onTime ? 'Sí' : 'No' }}
                      </span>
                    </td>
                  </tr>
                  <tr *ngIf="!getFilteredM38TestPoints().length">
                    <td colspan="6" class="text-center py-6 text-slate-400 italic">No hay datos de pruebas para los filtros seleccionados.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Chart -->
          <div class="lg:col-span-4 bg-white dark:bg-slate-800/50 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <h4 class="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">Test Points</h4>
            <div class="h-56 flex items-center justify-center">
              <canvas #m38ChartCanvas></canvas>
            </div>
            <!-- Mini legend totals -->
            <div class="mt-4 flex flex-col gap-1.5 text-[10px] bg-slate-50 dark:bg-slate-900/40 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
              <div class="flex items-center justify-between"><span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-emerald-500"></span><span class="text-slate-600 dark:text-slate-400">Passed en Tiempo</span></span><strong>{{ m38Stats.passedEnTiempo }}</strong></div>
              <div class="flex items-center justify-between"><span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-rose-500"></span><span class="text-slate-600 dark:text-slate-400">Passed fuera de Tiempo</span></span><strong>{{ m38Stats.passedFueraDeTiempo }}</strong></div>
              <div class="flex items-center justify-between"><span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-slate-800 dark:bg-slate-400"></span><span class="text-slate-600 dark:text-slate-400">Otros Estatus</span></span><strong>{{ m38Stats.failed + m38Stats.notExecuted + m38Stats.blocked + m38Stats.paused }}</strong></div>
            </div>
          </div>
        </div>

        <div class="mt-8 border-t border-slate-100 dark:border-slate-800 pt-6">
          <div class="space-y-4">
            <div class="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-lg border border-[rgb(255,77,17)]">
              <h4 class="text-xs font-bold uppercase text-[rgb(255,77,17)] mb-2 flex items-center justify-between w-full">
                <span class="flex items-center">
                  <lucide-icon [name]="Sparkles" size="14" class="mr-1"></lucide-icon>
                  Análisis de resultados e Acciones
                </span>
                <button *ngIf="metricAnalyses['satisfactoryTests'] || metricAnalyses['pruebas satisfactorias']" 
                        (click)="copyAnalysis('satisfactoryTests', getSatisfactoryTestsAnalysis())" 
                        class="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-[rgb(255,77,17)] transition-all flex items-center gap-1 text-[10px] normal-case cursor-pointer"
                        [title]="copiedKeys['satisfactoryTests'] ? 'Copiado' : 'Copiar análisis'">
                  <lucide-icon [name]="copiedKeys['satisfactoryTests'] ? Check : Copy" size="12"></lucide-icon>
                  <span>{{ copiedKeys['satisfactoryTests'] ? '¡Copiado!' : 'Copiar' }}</span>
                </button>
              </h4>
              <div class="text-sm leading-relaxed text-slate-700 dark:text-slate-350" [innerHTML]="formatAnalysisText(getSatisfactoryTestsAnalysis())">
              </div>
            </div>
          </div>
        </div>

      </div>
    </section>
  </div>

  <!-- Setup Onboarding Screen (If no config is detected) -->
  <div *ngIf="!isConfigured() && !isLoading" class="flex flex-col items-center justify-center py-24 px-4 max-w-2xl mx-auto text-center animate-in fade-in duration-500">
    <div class="p-5 bg-indigo-50 dark:bg-indigo-950/30 rounded-full mb-6 border border-indigo-100/50 dark:border-indigo-900/30 shadow-md">
      <lucide-icon [name]="AlertTriangle" size="48" class="text-indigo-600 dark:text-indigo-400"></lucide-icon>
    </div>
    <h2 class="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tight mb-3">Primero configura para iniciar</h2>
    <p class="text-sm text-slate-500 dark:text-slate-400 max-w-md mb-8 leading-relaxed">
      ¡Bienvenido al Analizador de CMMI5! Para comenzar a consultar y auditar los datos de tus Sprints, primero debes configurar tus credenciales de Azure DevOps (Organización, Proyecto, Token PAT) y la API Key del servicio de Inteligencia Artificial.
    </p>
    <button (click)="goToConfig()" class="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 active:scale-95 transition-all text-white font-bold text-sm rounded-xl shadow-lg flex items-center gap-2 cursor-pointer">
      <span>Ir a Configuración</span>
      <lucide-icon [name]="TrendingUp" size="16"></lucide-icon>
    </button>
  </div>

  <div *ngIf="isLoading" class="flex flex-col items-center justify-center py-20 opacity-50">
    <lucide-icon [name]="RefreshCw" size="48" class="animate-spin mb-4"></lucide-icon>
    <p>Cargando datos de Azure DevOps...</p>
  </div>

  <!-- Hidden PDF Template -->
  <div style="position: absolute; left: -9999px; top: 0;">
    <app-pdf-template 
      id="professional-report"
      [metrics]="metrics"
      [config]="config"
      [metricAnalyses]="metricAnalyses"
      [charts]="chartImages"
      [period]="selectedIterationName"
      [filteredEscapedBugs]="filteredEscapedBugs"
      [satisfactoryTestsStats]="m38Stats"
      [satisfactoryTestsPoints]="getFilteredM38TestPoints()">
    </app-pdf-template>
  </div>

  <!-- Chatbot Toggle Button -->
  <div class="ia-chat-container">
    <button class="ia-chat-button" (click)="toggleChat()" aria-label="Abrir Chatbot">
      <!-- SVG Rostro IA si está cerrado -->
      <svg *ngIf="!chatOpen" viewBox="0 0 100 100" width="86%" height="86%" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <!-- Resplandor del rostro en alta definición -->
          <linearGradient id="face-glow" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#ff4d61" stop-opacity="0.5"/>
            <stop offset="50%" stop-color="#ff122b" stop-opacity="0.2"/>
            <stop offset="100%" stop-color="#ff122b" stop-opacity="0"/>
          </linearGradient>
          
          <!-- Desvanecimiento de líneas laterales para estética limpia -->
          <linearGradient id="line-fade" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stop-color="#ff122b" stop-opacity="0.15"/>
            <stop offset="30%" stop-color="#ff122b" stop-opacity="0.85"/>
            <stop offset="50%" stop-color="#ff4d61" stop-opacity="1"/>
            <stop offset="70%" stop-color="#ff122b" stop-opacity="0.85"/>
            <stop offset="100%" stop-color="#ff122b" stop-opacity="0.15"/>
          </linearGradient>

          <!-- Resplandor de fondo holográfico para profundidad 3D -->
          <radialGradient id="aura-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="#ff122b" stop-opacity="0.3"/>
            <stop offset="100%" stop-color="#1a0205" stop-opacity="0"/>
          </radialGradient>
        </defs>

        <!-- Efecto holográfico trasero -->
        <circle cx="50" cy="50" r="45" fill="url(#aura-glow)" />

        <!-- Rostro con Geometría Orgánica Ajustada -->
        <g class="animated-face">
          
          <!-- Silueta estilizada (Máscara base con sienes y pómulos definidos) -->
          <path d="M 50,20 C 38,20 34,26 34,36 C 34,39 32,45 32,50 C 32,58 35,66 39,72 C 42,76 46,78 50,78 C 54,78 58,76 61,72 C 65,66 68,58 68,50 C 68,45 66,39 66,36 C 66,26 62,20 50,20 Z" 
                fill="url(#face-glow)" opacity="0.12"/>

          <!-- Pómulos iluminados en 3D (Máscara de volumen) -->
          <path d="M33,50 C36,51 39,54 41,58 C38,60 34,58 33,50 Z" fill="url(#face-glow)" opacity="0.15"/>
          <path d="M67,50 C64,51 61,54 59,58 C62,60 66,58 67,50 Z" fill="url(#face-glow)" opacity="0.15"/>

          <!-- RED DE TRAZOS VECTORIALES CURVOS (Estilo Red Sináptica Premium) -->
          <g stroke="url(#line-fade)" stroke-width="0.55" fill="none" stroke-linecap="round" stroke-linejoin="round">
            
            <!-- Contornos del cabello cibernético (Estilo fluido femenino) -->
            <path class="synapse-edge" d="M31,18 C22,23 18,36 18,52 C18,68 23,80 27,86" />
            <path class="synapse-edge" d="M26,20 C17,30 14,45 14,62 C14,75 18,85 22,90" />
            <path class="synapse-edge" d="M69,18 C78,23 82,36 82,52 C82,68 77,80 73,86" />
            <path class="synapse-edge" d="M74,20 C83,30 86,45 86,62 C86,75 82,85 78,90" />

            <!-- Orejas Estilizadas Tech -->
            <path class="synapse-edge" d="M34,36 C30,36 29,46 31,54" />
            <path class="synapse-edge" d="M66,36 C70,36 71,46 69,54" />

            <!-- Contorno Superior de la Cabeza y Sienes -->
            <path class="synapse-edge" d="M34,36 C32,44 33,52 36,60" />
            <path class="synapse-edge" d="M66,36 C68,44 67,52 64,60" />

            <!-- Cejas Estilizadas Finas y Expresivas -->
            <path class="synapse-edge" d="M31,37 C34,33 40,33 44,36" />
            <path class="synapse-edge" d="M69,37 C66,33 60,33 56,36" />
            
            <!-- Conexión del Entrecejo y Frente (Detalles 3D) -->
            <path class="synapse-edge" d="M44,36 C47,37.5 53,37.5 56,36" />
            <path d="M50,20 L50,30" stroke-width="0.3" opacity="0.5" />
            <path class="synapse-edge" d="M42,26 C45,28 55,28 58,26" />
            <path d="M45,22 L55,22" stroke-width="0.3" opacity="0.4" />
            <path class="synapse-edge" d="M36,30 C42,32 58,32 64,30" />

            <!-- Perfilado de la Nariz en 3D -->
            <path class="synapse-edge" d="M50,37 L50,56 C48,58 46,58 50,59.5 C54,58 52,58 50,56" stroke-width="0.65" />
            <path class="synapse-edge" d="M47,57 C47,59.5 49,59.5 50,59.5" stroke-width="0.5" />
            <path class="synapse-edge" d="M53,57 C53,59.5 51,59.5 50,59.5" stroke-width="0.5" />
            <path d="M47.5,37 C48.5,43 48.5,50 49,55" stroke-width="0.3" opacity="0.4" />
            <path d="M52.5,37 C51.5,43 51.5,50 51,55" stroke-width="0.3" opacity="0.4" />
            
            <!-- Pómulos Delicados y Definición Facial -->
            <path class="synapse-edge" d="M34,46 C38,47.5 41,50 43,54 L39,63" />
            <path class="synapse-edge" d="M66,46 C62,47.5 59,50 57,54 L61,63" />
            <path class="synapse-edge" d="M34,50 C37,55 41,59 44,63" />
            <path class="synapse-edge" d="M66,50 C63,55 59,59 56,63" />
            
            <!-- Labios Realistas Proporcionados (Arco de cupido + sombras) -->
            <path class="synapse-edge" d="M43,67 C45,64.5 47,65.5 50,65.5 C53,65.5 55,64.5 57,67 Z" stroke-width="0.6"/>
            <path class="synapse-edge" d="M44.5,67 C46.5,71.5 53.5,71.5 55.5,67 Z" stroke-width="0.6"/>
            <path d="M42.5,67 C46,67.8 54,67.8 57.5,67" stroke-width="0.35" opacity="0.6"/>
            <path d="M45,69.5 C48,71.5 52,71.5 55,69.5" stroke-width="0.4" opacity="0.5" />

            <!-- Mandíbula Estilizada en V y Chin Outline -->
            <path class="synapse-edge" d="M39,63 C42,70 45,74 50,76 C55,74 58,70 61,63" />
            <path class="synapse-edge" d="M39,72 C42,75 58,75 61,72" />

            <!-- Cuello y Clavícula Realistas (Salida hacia los hombros) -->
            <path class="synapse-edge" d="M41.5,74 C41,82 38,88 34,92" />
            <path class="synapse-edge" d="M58.5,74 C59,82 62,88 66,92" />
            <path class="synapse-edge" d="M34,92 C42,94 45,91 50,91 C55,91 58,94 66,92" />
          </g>

          <!-- OJOS EXPRESIVOS Y REALISTAS CON CREASE Y LASHES -->
          <g stroke="url(#line-fade)" stroke-width="0.75" fill="none">
            <!-- Ojo Izquierdo -->
            <g class="ia-eye-left">
              <path class="synapse-edge" d="M33,46 C35,42.5 41,42.5 43,46 C41,48.5 35,48.5 33,46 Z"/>
              <path d="M32,43 C35,40.5 41,40.5 44,43" stroke-width="0.4" opacity="0.7" />
              <path d="M33,46.5 C35.5,48.5 39,48.5 41.5,46" stroke-width="0.3" opacity="0.6" />
              <circle class="neural-node" cx="38" cy="46" r="1.3" />
            </g>
            <!-- Ojo Derecho -->
            <g class="ia-eye-right">
              <path class="synapse-edge" d="M57,46 C59,42.5 65,42.5 67,46 C65,48.5 59,48.5 57,46 Z"/>
              <path d="M56,43 C59,40.5 65,40.5 68,43" stroke-width="0.4" opacity="0.7" />
              <path d="M58.5,46 C61,48.5 64.5,48.5 67,46.5" stroke-width="0.3" opacity="0.6" />
              <circle class="neural-node" cx="62" cy="46" r="1.3" />
            </g>
          </g>

          <!-- INTERCONEXIONES Y NODOS SINÁPTICOS REDISEÑADOS -->
          <g>
            <!-- Puntos de Luz Centrales (Eje de Simetría) -->
            <circle class="neural-node" cx="50" cy="20" r="1.2" />
            <circle class="neural-node" cx="50" cy="30" r="1.0" />
            <circle class="neural-node" cx="50" cy="37" r="1.3" />
            <circle class="neural-node" cx="50" cy="56" r="1.2" />
            <circle class="neural-node" cx="50" cy="65.5" r="1.1" />
            <circle class="neural-node" cx="50" cy="76" r="1.4" />
            <circle class="neural-node" cx="50" cy="91" r="1.2" />
            
            <!-- Puntos Laterales Simétricos -->
            <circle class="neural-node" cx="44.5" cy="36" r="1" />
            <circle class="neural-node" cx="55.5" cy="36" r="1" />
            <circle class="neural-node" cx="43" cy="54" r="0.9" />
            <circle class="neural-node" cx="57" cy="54" r="0.9" />
            <circle class="neural-node" cx="39" cy="63" r="1.1" />
            <circle class="neural-node" cx="61" cy="63" r="1.1" />
            <circle class="neural-node" cx="42.5" cy="67" r="1" />
            <circle class="neural-node" cx="57.5" cy="67" r="1" />
            <circle class="neural-node" cx="39" cy="72" r="1" />
            <circle class="neural-node" cx="61" cy="72" r="1" />

            <!-- Nodos del cabello y hombros -->
            <circle class="neural-node" cx="27" cy="86" r="1" />
            <circle class="neural-node" cx="73" cy="86" r="1" />
            <circle class="neural-node" cx="22" cy="90" r="0.8" opacity="0.7" />
            <circle class="neural-node" cx="78" cy="90" r="0.8" opacity="0.7" />
            <circle class="neural-node" cx="34" cy="92" r="1" />
            <circle class="neural-node" cx="66" cy="92" r="1" />

            <!-- Destellos periféricos flotantes sutiles -->
            <circle class="neural-node" cx="24" cy="32" r="0.8" opacity="0.5"/>
            <circle class="neural-node" cx="20" cy="50" r="1" opacity="0.5"/>
            <circle class="neural-node" cx="76" cy="32" r="0.8" opacity="0.5"/>
            <circle class="neural-node" cx="80" cy="50" r="1" opacity="0.5"/>
          </g>
        </g>
      </svg>
      <!-- X brillante de color neón rojo si está abierto -->
      <lucide-icon *ngIf="chatOpen" [name]="X" size="24" class="text-[#ff4d61] drop-shadow-[0_0_8px_#ff122b] animate-in fade-in zoom-in duration-300"></lucide-icon>
    </button>

    <!-- Insignia de notificación AI -->
    <span *ngIf="!chatOpen && metrics" class="absolute -top-1 -right-1 flex h-4 w-4 z-10">
      <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
      <span class="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 text-[8px] font-black text-white items-center justify-center">AI</span>
    </span>
  </div>

  <!-- Chatbot Container -->
  <div *ngIf="chatOpen" 
       class="fixed bottom-24 right-6 z-50 w-[420px] max-w-[calc(100vw-2rem)] h-[550px] max-h-[calc(100vh-8rem)] rounded-3xl shadow-2xl flex flex-col bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200/50 dark:border-slate-800/50 overflow-hidden animate-in slide-in-from-bottom-5 duration-350">
    
    <!-- Chat Header -->
    <header class="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-indigo-600 to-violet-600 text-white shrink-0 shadow-md">
      <div class="flex items-center gap-3">
        <div class="p-2 rounded-xl bg-white/10">
          <lucide-icon [name]="Sparkles" size="20" class="text-indigo-200 animate-pulse"></lucide-icon>
        </div>
        <div>
          <h3 class="text-xs font-black uppercase tracking-wider leading-none">Asistente CMMI 5</h3>
          <span class="text-[9px] text-indigo-200 font-medium">Consultas sobre la vista actual</span>
        </div>
      </div>
      <button (click)="toggleChat()" class="p-1 hover:bg-white/10 rounded-lg transition-colors cursor-pointer">
        <lucide-icon [name]="X" size="18"></lucide-icon>
      </button>
    </header>

    <!-- Chat Messages Area -->
    <div #chatScrollContainer 
         class="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50 dark:bg-slate-950/10">
      
      <div *ngFor="let msg of chatMessages" class="flex flex-col"
           [ngClass]="{'items-end': msg.role === 'user', 'items-start': msg.role === 'assistant'}">
        
        <div class="flex gap-2 max-w-[85%]" 
             [ngClass]="{'flex-row-reverse': msg.role === 'user'}">
          
          <!-- Avatar -->
          <div class="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-sm border"
               [ngClass]="{
                 'bg-indigo-100 border-indigo-200 dark:bg-indigo-950 dark:border-indigo-900 text-indigo-600 dark:text-indigo-400': msg.role === 'assistant',
                 'bg-slate-100 border-slate-200 dark:bg-slate-800 dark:border-slate-700 text-slate-600 dark:text-slate-400': msg.role === 'user'
               }">
            <lucide-icon [name]="msg.role === 'assistant' ? Bot : User" size="16"></lucide-icon>
          </div>

          <!-- Bubble -->
          <div class="p-3 rounded-2xl text-xs leading-relaxed shadow-sm whitespace-pre-wrap"
               [ngClass]="{
                 'bg-indigo-600 text-white rounded-tr-none': msg.role === 'user',
                 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-155 rounded-tl-none border border-slate-100 dark:border-slate-800/40': msg.role === 'assistant'
               }">{{ msg.content }}</div>
        </div>
        
        <!-- Timestamp -->
        <span class="text-[9px] text-slate-400/80 px-10 mt-1">
          {{ msg.timestamp | date:'HH:mm' }}
        </span>
      </div>

      <!-- Loading State / Typing Indicator -->
      <div *ngIf="chatLoading" class="flex gap-2 items-center">
        <div class="w-8 h-8 rounded-xl bg-indigo-100 border border-indigo-200 dark:bg-indigo-950 dark:border-indigo-900 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
          <lucide-icon [name]="Bot" size="16"></lucide-icon>
        </div>
        <div class="p-3 rounded-2xl rounded-tl-none bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-800/40 shadow-sm flex items-center gap-1">
          <span class="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce" style="animation-delay: 0ms"></span>
          <span class="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce" style="animation-delay: 150ms"></span>
          <span class="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce" style="animation-delay: 300ms"></span>
        </div>
      </div>
    </div>

    <!-- Chat Input Area -->
    <form (submit)="sendChatMessage(); $event.preventDefault()" 
          class="border-t border-slate-100 dark:border-slate-800/60 p-3 bg-white dark:bg-slate-900 flex gap-2 shrink-0 items-center">
      <input [(ngModel)]="chatQuestion" 
             name="chatQuestion"
             type="text" 
             placeholder="Pregunta sobre las métricas, ISWs, bugs..." 
             [disabled]="chatLoading"
             class="flex-1 text-xs py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-800 focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-500 bg-slate-50 dark:bg-slate-950/30 text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500" />
      
      <button type="submit" 
              [disabled]="!chatQuestion.trim() || chatLoading"
              class="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 disabled:opacity-40 disabled:scale-100 disabled:pointer-events-none transition-all text-white flex items-center justify-center shadow-lg shadow-indigo-500/20 cursor-pointer">
        <lucide-icon [name]="Send" size="14"></lucide-icon>
      </button>
    </form>
  </div>
</div>
  
    <!-- Dialog / Modal de Comentarios -->
    <div *ngIf="activeCommentMetricKey" class="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <!-- Backdrop -->
      <div class="absolute inset-0 bg-slate-900/60 backdrop-blur-md" (click)="closeCommentModal()"></div>
      
      <!-- Modal Content Card -->
      <div class="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden animate-in zoom-in-95 duration-200">
        <!-- Header -->
        <div class="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="p-2 bg-indigo-500/10 text-indigo-500 rounded-xl">
              <lucide-icon [name]="MessageSquare" size="20"></lucide-icon>
            </div>
            <div>
              <h4 class="text-xs font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">Notas de Auditoría</h4>
              <h3 class="text-base font-bold text-slate-800 dark:text-white leading-tight mt-0.5">{{ activeCommentTitle }}</h3>
            </div>
          </div>
          <button (click)="closeCommentModal()" class="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
            <lucide-icon [name]="X" size="18"></lucide-icon>
          </button>
        </div>
        
        <!-- Body -->
        <div class="p-6 space-y-4">
          <p class="text-xs text-slate-550 dark:text-slate-400 leading-normal">
            Ingresa comentarios, justificaciones técnicas o contexto especial de este sprint para la métrica. 
            La Inteligencia Artificial integrará este contexto directamente como justificación en el análisis oficial.
          </p>
          <textarea 
            [(ngModel)]="activeCommentText" 
            rows="5" 
            placeholder="Escribe aquí las observaciones del sprint (ej. 'Se detectó una desviación del 12% debido a la incapacidad médica de Yair durante 3 días...')."
            class="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 text-sm font-medium focus:ring-2 focus:ring-indigo-500 transition-all outline-none leading-relaxed text-slate-700 dark:text-slate-200 placeholder-slate-400">
          </textarea>
        </div>
        
        <!-- Footer -->
        <div class="p-6 bg-slate-50 dark:bg-slate-950 border-t border-slate-150 dark:border-slate-850 flex items-center justify-end gap-3 text-xs font-bold">
          <button 
            (click)="closeCommentModal()" 
            class="px-4 py-2 rounded-xl text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all">
            Cancelar
          </button>
          <button 
            (click)="saveCommentFromModal()" 
            class="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-600/20 active:scale-95 transition-all">
            Guardar Nota y Cerrar
          </button>
        </div>
      </div>
    </div>
    `
})
export class DashboardComponent implements OnInit, AfterViewInit {
  readonly TrendingUp = TrendingUp;
  readonly Copy = Copy;
  readonly Check = Check;
  readonly Bug = Bug;
  readonly AlertTriangle = AlertTriangle;
  readonly Sparkles = Sparkles;
  readonly Download = Download;
  readonly RefreshCw = RefreshCw;
  readonly ChevronDown = ChevronDown;
  readonly Layers = Layers;
  readonly Users = Users;
  readonly CloudDownload = CloudDownload;
  readonly Search = Search;
  readonly DownloadCloud = DownloadCloud;
  readonly ArrowUpRight = ArrowUpRight;
  readonly MessageSquare = MessageSquare;
  readonly Send = Send;
  readonly X = X;
  readonly Bot = Bot;
  readonly User = User;

  private azureService = inject(AzureDevOpsService);
  private aiService = inject(AIService);
  private pdfService = inject(PdfService);
  private configService = inject(ConfigService);
  private router = inject(Router);
  private notificationService = inject(NotificationService);
  private metricsApiService = inject(MetricsApiService);

  metrics?: CMMIMetrics;
  config = this.configService.getConfig();
  aiAnalysis: string = '';
  isAnalyzing = false;
  isExporting = false;
  isLoading = true;

  // Database version management
  analysisVersions: VersionInfo[] = [];
  selectedVersionNumber: number | null = null;
  isLoadingVersions = false;

  areas: any[] = [];
  selectedArea: string = '';
  iterations: any[] = [];
  selectedIteration: string = '';
  selectedIterationName: string = 'Actual';
  chartImages: { [key: string]: string } = {};
  metricAnalyses: { [key: string]: string } = {};
  copiedKeys: { [key: string]: boolean } = {};
  expandedItemsM1 = new Set<string>();
  expandedItemsM2 = new Set<string>();
  expandedItemsM3 = new Set<string>();
  expandedItemsEED = new Set<string>();
  expandedBugs = new Set<number>();
  expandedBugRows = new Set<string>();
  expandedTestPoints = new Set<string>();
  hoveredNodeId: any = null;
  iswMetrics: any[] = [];
  iswList: string[] = [];
  selectedISW: string = '';
  private rawMetrics?: CMMIMetrics;
  timelineSummary: any = { onTimeCount: 0, lateCount: 0, openCount: 0, avgLateDays: 0, totalLateDays: 0, items: [] };
  eedTimelineData: any[] = [];
  eedTimelineFilter: 'all' | 'sprint' = 'all';
  iterationsLoaded = false; // guarantees loadData() always uses fresh iteration metadata

  // --- Defect Density Sprint Comparison ---
  selectedCompareIterations: string[] = []; // iteration IDs selected for comparison
  comparedDensityData: { id: string; name: string; density: number; status: string }[] = [];
  isLoadingCompare = false;
  showComparePanel = false;

  // --- Escaped Bugs Sprint Comparison ---
  selectedCompareEscapedIterations: string[] = [];
  comparedEscapedData: { id: string; name: string; rate: number; status: string }[] = [];
  isLoadingCompareEscaped = false;
  showCompareEscapedPanel = false;

  // --- Comentarios de Métricas por el Usuario ---
  metricComments: { [key: string]: string } = {};
  expandedComments = new Set<string>();

  toggleComment(metricKey: string) {
    if (this.expandedComments.has(metricKey)) {
      this.expandedComments.delete(metricKey);
    } else {
      this.expandedComments.add(metricKey);
    }
  }

  // --- Dialog Modal de Comentarios ---
  activeCommentMetricKey: string | null = null;
  activeCommentText = '';
  activeCommentTitle = '';

  openCommentModal(metricKey: string, metricTitle: string) {
    this.activeCommentMetricKey = metricKey;
    this.activeCommentTitle = metricTitle;
    this.activeCommentText = this.metricComments[metricKey] || '';
  }

  closeCommentModal() {
    this.activeCommentMetricKey = null;
    this.activeCommentText = '';
    this.activeCommentTitle = '';
  }

  saveCommentFromModal() {
    if (!this.activeCommentMetricKey) return;
    
    // Save to local object and force Angular reactivity by cloning reference
    this.metricComments[this.activeCommentMetricKey] = this.activeCommentText;
    this.metricComments = { ...this.metricComments };
    
    // Sync into existing metricAnalyses object to bypass cloud DB schema limitations
    this.metricAnalyses[this.activeCommentMetricKey + '_comment'] = this.activeCommentText;
    
    // Persist to DB
    this.saveCommentsOnly(this.activeCommentMetricKey);
    this.closeCommentModal();
  }

  saveCommentsOnly(metricKey?: string) {
    if (!this.selectedIteration || !this.metrics) return;
    
    // Sync all comments to metricAnalyses before saving
    Object.keys(this.metricComments).forEach(key => {
      this.metricAnalyses[key + '_comment'] = this.metricComments[key];
    });

    this.metricsApiService.saveAnalysis(
      this.selectedIteration,
      this.selectedSprintDisplayName || this.selectedIterationName,
      this.metrics!,
      this.aiAnalysis || " ", // Enforce non-empty string to avoid API 400 validator issues in Render
      this.metricAnalyses,
      this.metricComments
    ).subscribe(dbRes => {
      if (dbRes) {
        this.notificationService.success('Comentarios guardados exitosamente.');
        if (metricKey) {
          this.expandedComments.delete(metricKey); // Cerrar el cuadro de nota automáticamente al guardar
        }
      }
    });
  }

  get selectedSprintDisplayName(): string {
    if (!this.selectedIteration) return '';
    const iter = this.iterations.find(i => i.id === this.selectedIteration || i.path === this.selectedIteration);
    if (!iter) return '';
    const name = iter.name || '';
    return /sprint/i.test(name) ? name : `Sprint ${name}`;
  }

  getFilteredEEDTimelineData() {
    if (this.eedTimelineFilter === 'sprint') {
      return this.eedTimelineData.filter(node => node.type !== 'Standalone');
    }
    return this.eedTimelineData;
  }

  getSprintBugsList() {
    if (!this.metrics?.defectRemovalEfficiency?.bugsList) return [];
    return this.metrics.defectRemovalEfficiency.bugsList.filter((item: any) => !item.isKanban);
  }

  getSortedReworkItems() {
    if (!this.metrics?.developmentRate?.items) return [];
    return [...this.metrics.developmentRate.items].sort((a, b) => {
      const aRework = this.getItemReworkData(a).totalRework;
      const bRework = this.getItemReworkData(b).totalRework;
      return aRework - bRework; // Ordenar de menor a mayor
    });
  }

  getKanbanBugsList() {
    if (!this.metrics?.defectRemovalEfficiency?.bugsList) return [];
    return this.metrics.defectRemovalEfficiency.bugsList.filter((item: any) => item.isKanban);
  }

  toggleExpandBug(bugId: number, event?: Event) {
    if (event) event.stopPropagation();
    if (this.expandedBugs.has(bugId)) {
      this.expandedBugs.delete(bugId);
    } else {
      this.expandedBugs.add(bugId);
    }
  }

  toggleExpandBugRow(iterationPath: string) {
    if (this.expandedBugRows.has(iterationPath)) {
      this.expandedBugRows.delete(iterationPath);
    } else {
      this.expandedBugRows.add(iterationPath);
    }
  }

  toggleExpandTestPoints(groupKey: string) {
    if (this.expandedTestPoints.has(groupKey)) {
      this.expandedTestPoints.delete(groupKey);
    } else {
      this.expandedTestPoints.add(groupKey);
    }
  }

  private _groupedTestPoints: { key: string; title: string; points: any[] }[] = [];
  private _testPointsVersion = 0;

  getGroupedTestPoints() {
    const testPoints = this.metrics?.testExecution?.testPoints;
    if (!testPoints) return [];

    // Detect changes by length (simple) and rebuild groups by suite
    const version = testPoints.length;
    if (version !== this._testPointsVersion) {
      this._testPointsVersion = version;
      const groups: { [key: string]: { title: string; points: any[] } } = {};
      testPoints.forEach((pt: any) => {
        const planId = pt.planId || '0';
        const suiteId = pt.suiteId || '0';
        const suiteName = pt.suiteName || pt.planName || 'Sin título';
        const key = `${planId}_${suiteId}`;
        if (!groups[key]) groups[key] = { title: suiteName, points: [] };
        groups[key].points.push(pt);
      });
      this._groupedTestPoints = Object.entries(groups).map(([key, val]) => ({ key, title: val.title, points: val.points }));
    }
    return this._groupedTestPoints;
  }

  private readonly STORAGE_KEY = 'cmmi5_dashboard_selection';

  @ViewChild('devRateChart') devRateChartCanvas!: ElementRef;
  @ViewChild('effortChart') effortChartCanvas!: ElementRef;
  @ViewChild('defectChart') defectChartCanvas!: ElementRef;
  @ViewChild('escapedChart') escapedChartCanvas!: ElementRef;
  @ViewChild('testExecChart') testExecChartCanvas!: ElementRef;
  @ViewChild('m38ChartCanvas') m38ChartCanvas!: ElementRef;

  filteredEscapedBugs = {
    bugsTesting: 0,
    bugsUat: 0,
    bugsProd: 0,
    totalBugs: 0,
    rate: 0,
    status: 'green' as 'green' | 'yellow' | 'red',
    stdDeviation: 0,
    rows: [] as any[]
  };

  isReloading = false;
  m38SelectedProject = '';
  m38SelectedTestPlan = '';
  m38SelectedTestSuite = '';
  m38StartDate = '';
  m38EndDate = '';
  m38MinDateLimit = '';
  m38MaxDateLimit = '';

  m38Stats = {
    total: 0,
    passedEnTiempo: 0,
    passedFueraDeTiempo: 0,
    failed: 0,
    blocked: 0,
    notApplicable: 0,
    notExecuted: 0,
    paused: 0,
    rate: 0,
    status: 'red' as 'green' | 'yellow' | 'red'
  };

  private charts: Chart[] = [];
  escapedChart: Chart | null = null;
  testExecChart: Chart | null = null;
  m38Chart: Chart | null = null;

  ngOnInit() {
    this.loadSavedSelection();
    if (this.isConfigured()) {
      this.loadAreas();
      this.loadIterations();
      this.loadData();
    } else {
      this.isLoading = false;
    }
  }


  loadSavedSelection() {
    const saved = localStorage.getItem(this.STORAGE_KEY);
    if (saved) {
      try {
        const { area, iteration } = JSON.parse(saved);
        this.selectedArea = area || '';
        this.selectedIteration = iteration || '';
      } catch (e) { }
    }
  }

  saveSelection() {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify({
      area: this.selectedArea,
      iteration: this.selectedIteration
    }));
  }

  loadAreas() {
    this.azureService.getAreas().subscribe(data => this.areas = data);
  }

  loadIterations() {
    this.azureService.getIterationNodes().subscribe({
      next: data => {
        this.iterations = data;
        this.iterationsLoaded = true;

        // Safety net: if the saved sprint was deleted from ADO, pick the latest
        if (this.selectedIteration && this.iterations.length > 0) {
          const stillExists = this.iterations.some(i => i.id === this.selectedIteration);
          if (!stillExists) {
            this.selectedIteration = this.iterations[this.iterations.length - 1].id;
          }
        }

        // Always trigger a fresh data load with the latest iteration metadata
        this.loadData();
      },
      error: err => {
        console.error('Dashboard: Failed to load iterations', err);
        this.iterationsLoaded = true; // unblock loadData even on failure
        if (!this.selectedIteration) {
          this.isLoading = false;
        } else {
          this.loadData(); // retry with saved sprint
        }
      }
    });
  }

  onSelectionChange() {
    this.isReloading = true;
    this.aiAnalysis = '';
    this.metricAnalyses = {};
    this.selectedCompareIterations = [];
    this.comparedDensityData = [];
    this.selectedCompareEscapedIterations = [];
    this.comparedEscapedData = [];
    this.saveSelection();
    const iter = this.iterations.find(i => i.id === this.selectedIteration || i.path === this.selectedIteration);
    this.selectedIterationName = iter ? iter.name : 'Actual';
    this.loadData();
  }

  ngAfterViewInit() {
  }

  loadData() {
    // Guard: iterations must be loaded before we can fetch metrics (prevents race from ngOnInit)
    if (!this.iterationsLoaded) return;
    if (!this.isConfigured()) {
      this.isLoading = false;
      this.isReloading = false;
      return;
    }

    // Safety net: if selectedIteration is empty (nothing saved) or the saved sprint was deleted,
    // fall back to the most-recently-started sprint (iterations are already date-sorted ascending).
    if (!this.selectedIteration && this.iterations.length > 0) {
      this.selectedIteration = this.iterations[this.iterations.length - 1].id;
    }
    if (this.selectedIteration && this.iterations.length > 0) {
      const stillExists = this.iterations.some(i => i.id === this.selectedIteration);
      if (!stillExists) {
        this.selectedIteration = this.iterations[this.iterations.length - 1].id;
      }
    }

    if (!this.selectedIteration) {
      this.isLoading = false;
      this.isReloading = false;
      return;
    }

    this.isLoading = true;
    this.isReloading = true;
    this.azureService.getMetrics(this.selectedIteration).subscribe({
      next: (data) => {
        this.rawMetrics = data;

        // Extract unique ISWs for the dropdown
        if (data.developmentRate?.items) {
          const isws = data.developmentRate.items
            .map(i => i.isw)
            .filter(isw => !!isw);
          this.iswList = Array.from(new Set(isws)).sort();
        }

        this.applyFilter();

        // Pre-populate comparison sprints for escaped bugs chart automatically if none are selected yet
        if (this.selectedCompareEscapedIterations.length === 0 && this.iterations.length > 0) {
          const currentIndex = this.iterations.findIndex(i => i.id === this.selectedIteration);
          if (currentIndex !== -1) {
            const prevIterations = this.iterations
              .slice(Math.max(0, currentIndex - 4), currentIndex)
              .map(i => i.id);
            if (prevIterations.length > 0) {
              this.selectedCompareEscapedIterations = prevIterations;
              this.loadCompareEscaped();
            }
          }
        }

        // Load database version history list
        this.loadVersionsHistory();

        // 1. Check for active analysis in the Mongo database first to populate the DB badge/version selector
        this.metricsApiService.getActiveAnalysis(this.selectedIteration).subscribe(dbAnalysis => {
          if (dbAnalysis) {
            this.aiAnalysis = dbAnalysis.aiAnalysis;
            this.metricComments = dbAnalysis.metricComments || {};
            // Extract comments from metricAnalyses for cloud schema fallback compatibility
            if (dbAnalysis.metricAnalyses) {
              Object.keys(dbAnalysis.metricAnalyses).forEach(key => {
                if (key.endsWith('_comment')) {
                  const metricKey = key.replace('_comment', '');
                  this.metricComments[metricKey] = dbAnalysis.metricAnalyses[key];
                }
              });
              this.metricComments = { ...this.metricComments };
            }
            // Load per-metric analyses directly from DB if available, otherwise parse from raw text
            if (dbAnalysis.metricAnalyses && Object.keys(dbAnalysis.metricAnalyses).length > 0) {
              this.metricAnalyses = dbAnalysis.metricAnalyses;
            } else {
              this.parseAnalysis(dbAnalysis.aiAnalysis);
            }
            this.selectedVersionNumber = dbAnalysis.version;
            this.isLoading = false;
            this.isReloading = false;
          } else {
            this.metricComments = {};
            // 2. Fall back to cached localStorage analysis if not saved on database yet
            const cachedAnalysis = localStorage.getItem('cmmi5_ai_analysis_' + this.selectedIteration);
            if (cachedAnalysis) {
              this.aiAnalysis = cachedAnalysis;
              this.parseAnalysis(cachedAnalysis);
            } else {
              this.aiAnalysis = '';
              this.metricAnalyses = {};
            }
            this.selectedVersionNumber = null;
            this.isLoading = false;
            this.isReloading = false;
          }
        });
      },
      error: () => {
        this.isLoading = false;
        this.isReloading = false;
        this.notificationService.error('Error al cargar datos de Azure DevOps. Verifica el PAT y la configuración.');
      }
    });
  }

  onISWChange() {
    this.isReloading = true;
    setTimeout(() => {
      this.applyFilter();
      this.isReloading = false;
    }, 450);
  }

  private applyFilter() {
    if (!this.rawMetrics) return;

    // Deep clone rawMetrics
    const filtered: CMMIMetrics = JSON.parse(JSON.stringify(this.rawMetrics));

    if (this.selectedISW) {
      // Filter items in Development Rate
      if (filtered.developmentRate?.items) {
        filtered.developmentRate.items = filtered.developmentRate.items.filter(i => i.isw === this.selectedISW);
      }
      // Note: Risk and Defect Density are usually project-wide, 
      // but if items are filtered, density might change. 
      // For now, we only filter the items list.
    }

    this.metrics = filtered;

    // Auto-expand EED timeline items that have bugs
    if (this.metrics?.developmentRate?.items) {
      this.expandedItemsEED.clear();
      this.metrics.developmentRate.items.forEach(item => {
        if (item.relatedBugs && item.relatedBugs.length > 0) {
          this.expandedItemsEED.add(item.id);
        }
      });
      this.expandedItemsEED.add('kanban_standalone');
      this.expandedItemsEED.add('sprint_standalone');
    }

    this.recalculateTotals();
    this.eedTimelineData = this.getEEDTimelineData();
    this.updateEscapedBugsFilteredData();
    this.initM38Filters();
  }

  onEscapedFilterChange() {
    this.updateEscapedBugsFilteredData();
  }

  updateEscapedBugsFilteredData() {
    if (!this.metrics?.escapedBugs?.bugsList) return;

    const list = this.metrics.escapedBugs.bugsList;
    const selectedIterationNode = this.iterations.find(i => i.id === this.selectedIteration || i.path === this.selectedIteration);
    const selectedIterationPath = selectedIterationNode?.path || selectedIterationNode?.name || '';
    const start = this.metrics.startDate ? new Date(this.metrics.startDate).getTime() : 0;
    const end = this.metrics.endDate ? new Date(new Date(this.metrics.endDate).setHours(23, 59, 59, 999)).getTime() : Infinity;


    const filteredList = list.filter((b: any) => {
      if (this.selectedArea) {
        const normSelectedArea = this.selectedArea.toLowerCase().replace(/^\\/, '').replace(/\\/g, '/').replace('/area/', '/');
        const normBugArea = b.project.toLowerCase().replace(/^\\/, '').replace(/\\/g, '/').replace('/area/', '/');
        if (normBugArea !== normSelectedArea && !normBugArea.startsWith(normSelectedArea + '/')) {
          return false;
        }
      }
      if (selectedIterationPath) {
        const normSelectedIter = selectedIterationPath.toLowerCase().replace(/^\\/, '').replace(/\\/g, '/');
        const normBugIter = b.iteration.toLowerCase().replace(/^\\/, '').replace(/\\/g, '/');
        const normSelectedName = (selectedIterationNode?.name || '').toLowerCase();
        const bugIterationShort = (b.iteration.split('\\').pop() || b.iteration).toLowerCase();
        
        const bugTags = (b.tags || '').toLowerCase().split(/[;,]/).map((t: string) => t.trim());
        const hasInyectado = bugTags.some((t: string) => t.includes('inyectadosprint') || t.includes('inyectado sprint'));
        const hasUat = bugTags.some((t: string) => t.includes('buguat') || t.includes('bug uat') || t === 'uat');

        if (normBugIter !== normSelectedIter && bugIterationShort !== normSelectedName && !b.isSprintRelated && !hasInyectado && !hasUat) {
          return false;
        }
      }
      return true;
    });

    let bugsTesting = 0;
    let bugsUat = 0;
    let bugsProd = 0;

    filteredList.forEach((b: any) => {
      const bugTags = (b.tags || '').toLowerCase().split(/[;,]/).map((t: string) => t.trim());
      const hasUat = bugTags.some((t: string) => t.includes('buguat') || t.includes('bug uat') || t === 'uat');
      
      if (b.classification === 'uat' || hasUat) {
        b.classification = 'produccion';
      }
      if (b.classification === 'testing') bugsTesting++;
      else if (b.classification === 'uat') bugsUat++;
      else if (b.classification === 'produccion') bugsProd++;
    });

    const totalBugs = bugsTesting + bugsUat + bugsProd;
    const rate = totalBugs > 0
      ? (bugsProd / totalBugs) * 100
      : 0;
    const status = rate <= 33 ? 'green' : (rate <= 40 ? 'yellow' : 'red');

    const iterationGroups: { [key: string]: { testing: number, uat: number, prod: number, total: number, project: string, bugs: any[] } } = {};
    filteredList.forEach((b: any) => {
      const iter = b.iteration;
      if (!iterationGroups[iter]) {
        iterationGroups[iter] = { testing: 0, uat: 0, prod: 0, total: 0, project: b.project, bugs: [] };
      }
      iterationGroups[iter].total++;
      iterationGroups[iter].bugs.push(b);
      if (b.classification === 'testing') iterationGroups[iter].testing++;
      else if (b.classification === 'uat') iterationGroups[iter].uat++;
      else if (b.classification === 'produccion') iterationGroups[iter].prod++;
    });

    const rows = Object.entries(iterationGroups).map(([iteration, g]) => {
      const rowRate = g.total > 0 ? Math.min((g.prod / g.total) * 100, 150) : 0;
      return {
        project: g.project.split('\\').pop() || g.project,
        projectFull: g.project,
        iteration: iteration.split('\\').pop() || iteration,
        fullIteration: iteration,
        testing: g.testing,
        uat: g.uat,
        produccion: g.prod,
        total: g.total,
        rate: rowRate,
        bugs: g.bugs
      };
    });

    const historyRates = this.comparedEscapedData.length > 0
      ? [...this.comparedEscapedData.map(d => d.rate), rate]
      : [12.5, 18.2, 8.5, 15.0, rate];
    let stdDeviation = 0;
    if (historyRates.length > 1) {
      const mean = historyRates.reduce((sum, r) => sum + r, 0) / historyRates.length;
      const variance = historyRates.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / (historyRates.length - 1);
      stdDeviation = Math.sqrt(variance);
    }

    this.filteredEscapedBugs = {
      bugsTesting,
      bugsUat,
      bugsProd,
      totalBugs,
      rate,
      status,
      stdDeviation,
      rows: rows.sort((a, b) => a.iteration.localeCompare(b.iteration))
    };

    setTimeout(() => this.updateEscapedChart(), 50);
  }

  initM38Filters() {
    const testPoints = this.metrics?.testExecution?.testPoints;
    if (!testPoints || testPoints.length === 0) {
      this.m38MinDateLimit = '';
      this.m38MaxDateLimit = '';
      this.m38StartDate = '';
      this.m38EndDate = '';
      return;
    }

    let minTime = Infinity;
    let maxTime = -Infinity;

    testPoints.forEach(pt => {
      if (pt.lastUpdatedDate) {
        const t = new Date(pt.lastUpdatedDate).getTime();
        if (t < minTime) minTime = t;
        if (t > maxTime) maxTime = t;
      }
    });

    if (minTime === Infinity) minTime = new Date(this.metrics!.startDate || new Date()).getTime();
    if (maxTime === -Infinity) maxTime = new Date(this.metrics!.endDate || new Date()).getTime();

    this.m38MinDateLimit = new Date(minTime).toISOString().split('T')[0];
    this.m38MaxDateLimit = new Date(maxTime).toISOString().split('T')[0];

    this.m38StartDate = this.m38MinDateLimit;
    this.m38EndDate = this.m38MaxDateLimit;

    this.m38SelectedProject = '';
    this.m38SelectedTestPlan = '';
    this.m38SelectedTestSuite = '';

    this.updateM38Calculations();
  }

  getM38Projects(): string[] {
    const testPoints = this.metrics?.testExecution?.testPoints;
    if (!testPoints) return [];
    const projects = testPoints.map(pt => pt.projectName).filter(Boolean);
    return Array.from(new Set(projects)).sort() as string[];
  }

  getM38TestPlans(): string[] {
    const testPoints = this.metrics?.testExecution?.testPoints;
    if (!testPoints) return [];
    const plans = testPoints
      .filter(pt => !this.m38SelectedProject || pt.projectName === this.m38SelectedProject)
      .map(pt => pt.planName)
      .filter(Boolean);
    return Array.from(new Set(plans)).sort() as string[];
  }

  getM38TestSuites(): string[] {
    const testPoints = this.metrics?.testExecution?.testPoints;
    if (!testPoints) return [];
    const suites = testPoints
      .filter(pt => (!this.m38SelectedProject || pt.projectName === this.m38SelectedProject) &&
        (!this.m38SelectedTestPlan || pt.planName === this.m38SelectedTestPlan))
      .map(pt => pt.suiteName)
      .filter(Boolean);
    return Array.from(new Set(suites)).sort() as string[];
  }

  getFilteredM38TestPoints() {
    const testPoints = this.metrics?.testExecution?.testPoints;
    if (!testPoints) return [];

    return testPoints.filter(pt => {
      if (this.m38SelectedProject && pt.projectName !== this.m38SelectedProject) return false;
      if (this.m38SelectedTestPlan && pt.planName !== this.m38SelectedTestPlan) return false;
      if (this.m38SelectedTestSuite && pt.suiteName !== this.m38SelectedTestSuite) return false;
      if (pt.lastUpdatedDate) {
        const ptTime = new Date(pt.lastUpdatedDate).getTime();
        if (this.m38StartDate) {
          const parts = this.m38StartDate.split('-');
          const startYear = parseInt(parts[0], 10);
          const startMonth = parseInt(parts[1], 10) - 1;
          const startDay = parseInt(parts[2], 10);
          const startLimitUTC = Date.UTC(startYear, startMonth, startDay, 0, 0, 0, 0);
          if (ptTime < startLimitUTC) return false;
        }
        if (this.m38EndDate) {
          const parts = this.m38EndDate.split('-');
          const endYear = parseInt(parts[0], 10);
          const endMonth = parseInt(parts[1], 10) - 1;
          const endDay = parseInt(parts[2], 10);
          const endLimitUTC = Date.UTC(endYear, endMonth, endDay, 23, 59, 59, 999);
          if (ptTime > endLimitUTC) return false;
        }
      }
      return true;
    });
  }

  onM38ProjectChange() {
    this.isReloading = true;
    setTimeout(() => {
      this.m38SelectedTestPlan = '';
      this.m38SelectedTestSuite = '';
      this.updateM38Calculations();
      this.isReloading = false;
    }, 450);
  }

  onM38TestPlanChange() {
    this.isReloading = true;
    setTimeout(() => {
      this.m38SelectedTestSuite = '';
      this.updateM38Calculations();
      this.isReloading = false;
    }, 450);
  }

  onM38TestSuiteChange() {
    this.isReloading = true;
    setTimeout(() => {
      this.updateM38Calculations();
      this.isReloading = false;
    }, 450);
  }

  onM38DateChange() {
    this.isReloading = true;
    setTimeout(() => {
      this.updateM38Calculations();
      this.isReloading = false;
    }, 450);
  }

  updateM38Calculations() {
    const pts = this.getFilteredM38TestPoints();

    let total = pts.length;
    let passedEnTiempo = 0;
    let passedFueraDeTiempo = 0;
    let failed = 0;
    let notExecuted = 0;
    let notApplicable = 0;
    let blocked = 0;
    let paused = 0;

    pts.forEach(pt => {
      const outStr = (pt.outcome || 'None').toLowerCase();
      if (outStr === 'passed') {
        if (pt.onTime) {
          passedEnTiempo++;
        } else {
          passedFueraDeTiempo++;
        }
      } else if (outStr === 'failed') {
        failed++;
      } else if (outStr === 'blocked') {
        blocked++;
      } else if (outStr === 'notapplicable' || outStr === 'not applicable') {
        notApplicable++;
      } else if (outStr === 'paused') {
        paused++;
      } else {
        notExecuted++;
      }
    });

    const denominator = total - notApplicable;
    const rate = denominator > 0 ? (passedEnTiempo / denominator) * 100 : 0;
    const status = rate >= 90 ? 'green' : (rate >= 80 ? 'yellow' : 'red');

    this.m38Stats = {
      total,
      passedEnTiempo,
      passedFueraDeTiempo,
      failed,
      notExecuted,
      notApplicable,
      blocked,
      paused,
      rate,
      status
    };

    setTimeout(() => this.updateM38Chart(), 50);
  }

  updateM38Chart() {
    if (!this.m38ChartCanvas) return;

    if (this.m38Chart) {
      this.m38Chart.destroy();
      this.m38Chart = null;
    }

    const isDark = this.isDark();
    const textColor = isDark ? '#94a3b8' : '#64748b';

    const passedEnTiempo = this.m38Stats.passedEnTiempo;
    const passedFueraDeTiempo = this.m38Stats.passedFueraDeTiempo;
    const otrosEstatus = this.m38Stats.failed + this.m38Stats.notExecuted + this.m38Stats.blocked + this.m38Stats.paused;
    const total = passedEnTiempo + passedFueraDeTiempo + otrosEstatus;

    this.m38Chart = new Chart(this.m38ChartCanvas.nativeElement, {
      type: 'doughnut',
      data: {
        labels: ['Passed en Tiempo', 'Passed fuera de Tiempo', 'Otros Estatus'],
        datasets: [
          {
            data: [passedEnTiempo, passedFueraDeTiempo, otrosEstatus],
            backgroundColor: [
              '#10b981', // green
              '#ef4444', // red/pink
              '#0f172a'  // black
            ],
            borderColor: isDark ? '#1e293b' : '#ffffff',
            borderWidth: 2,
            hoverOffset: 6
          }
        ]
      },
      options: {
        cutout: '70%',
        responsive: true,
        maintainAspectRatio: false,
        layout: { padding: { top: 8, bottom: 8, left: 8, right: 8 } },
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            enabled: true,
            backgroundColor: isDark ? '#0f172a' : '#f8fafc',
            titleColor: isDark ? '#f8fafc' : '#0f172a',
            bodyColor: isDark ? '#e2e8f0' : '#334155',
            borderColor: isDark ? '#334155' : '#cbd5e1',
            borderWidth: 1,
            callbacks: {
              label: (ctx: any) => {
                const val = ctx.parsed;
                const pct = total > 0 ? ((val / total) * 100).toFixed(2) : '0.00';
                return ` ${ctx.label}: ${val} (${pct}%)`;
              }
            }
          }
        }
      }
    });
  }

  updateEscapedChart() {
    if (!this.escapedChartCanvas) return;

    if (this.escapedChart) {
      this.escapedChart.destroy();
      this.escapedChart = null;
    }

    const isDark = document.documentElement.classList.contains('dark');
    const textColor = isDark ? '#94a3b8' : '#64748b';
    const gridColor = isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)';

    const sorted = [...this.comparedEscapedData].sort((a, b) => {
      const ai = this.iterations.findIndex((it: any) => it.id === a.id);
      const bi = this.iterations.findIndex((it: any) => it.id === b.id);
      return ai - bi;
    });

    const compareWithoutCurrent = sorted.filter(d => d.id !== this.selectedIteration);

    let labels: string[] = [];
    let rates: number[] = [];

    if (compareWithoutCurrent.length > 0) {
      labels = [...compareWithoutCurrent.map(d => this.shortSprintLabel(d.name)), this.shortSprintLabel(this.selectedIterationName || 'Actual')];
      rates = [...compareWithoutCurrent.map(d => d.rate), this.filteredEscapedBugs.rate];
    } else {
      let defaultLabels = ['S1', 'S2', 'S3', 'S4', 'Actual'];
      const iterForChart1 = this.iterations.find(i => i.id === this.selectedIteration || i.path === this.selectedIteration);
      const sprintText1 = iterForChart1 ? iterForChart1.path : this.selectedIterationName;
      const match = sprintText1.match(/Sprint\s*(\d+)/i);
      if (match) {
        const currentNum = parseInt(match[1]);
        defaultLabels = [
          `Sprint ${currentNum - 4}`,
          `Sprint ${currentNum - 3}`,
          `Sprint ${currentNum - 2}`,
          `Sprint ${currentNum - 1}`,
          `Sprint ${currentNum}`
        ];
      } else {
        defaultLabels = ['Anterior 4', 'Anterior 3', 'Anterior 2', 'Anterior 1', this.selectedIterationName];
      }
      labels = defaultLabels;
      rates = [12.5, 18.2, 8.5, 15.0, this.filteredEscapedBugs.rate];
    }

    this.escapedChart = new Chart(this.escapedChartCanvas.nativeElement, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          {
            label: '% Bugs Escapados',
            data: rates,
            borderColor: '#6366f1',
            backgroundColor: 'rgba(99, 102, 241, 0.1)',
            borderWidth: 3,
            fill: true,
            tension: 0.3,
            pointBackgroundColor: '#6366f1',
            pointRadius: 4,
            pointHoverRadius: 6
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            grid: { color: gridColor },
            ticks: { color: textColor },
            min: 0,
            max: 150,
            title: { display: true, text: '% Escapados', color: textColor, font: { size: 10 } }
          },
          x: {
            grid: { display: false },
            ticks: { color: textColor }
          }
        },
        plugins: {
          legend: { display: false },
          annotation: {
            annotations: {
              target: {
                type: 'line',
                yMin: 33,
                yMax: 33,
                borderColor: '#22c55e',
                borderWidth: 2,
                borderDash: [5, 5],
                label: {
                  content: 'Umbral Verde (33%)',
                  display: true,
                  position: 'start',
                  backgroundColor: 'rgba(34, 197, 94, 0.8)',
                  color: '#fff',
                  font: { size: 8 }
                }
              },
              limit: {
                type: 'line',
                yMin: 40,
                yMax: 40,
                borderColor: '#ef4444',
                borderWidth: 2,
                borderDash: [5, 5],
                label: {
                  content: 'Umbral Rojo (40%)',
                  display: true,
                  position: 'end',
                  backgroundColor: 'rgba(239, 68, 68, 0.8)',
                  color: '#fff',
                  font: { size: 8 }
                }
              }
            }
          }
        }
      }
    });
  }

  /** Called when user changes size inline in the table */
  /** Calculates rework metrics for a single work item */
  getItemReworkData(item: any) {
    let effort = 0;
    let reqRework = 0;
    let bugRework = 0;

    // Normal tasks effort (Requirement Rework or Development)
    (item.tasks || []).forEach((task: any) => {
      const taskEffort = task.completedWork || 0;
      if (taskEffort <= 0) return;

      const type = (task.type || '').toLowerCase();

      if (type.includes('planead') || type.includes('nueva') || type.includes('desarroll') || type.includes('mejora') || type === '') {
        effort += taskEffort;
      } else if (type.includes('correctiv') || type.includes('retrabajo') || type.includes('fix') || type.includes('ajuste') || type.includes('rework') || type.includes('atencion') || type.includes('defecto') || type.includes('incidencia') || type.includes('registro')) {
        reqRework += taskEffort;
      } else if (type.includes('bug') || type.includes('error') || type.includes('defect')) {
        bugRework += taskEffort;
      } else {
        effort += taskEffort;
      }
    });

    // Bugs effort
    (item.relatedBugs || []).forEach((bug: any) => {
      bugRework += bug.completedWork || 0;
    });

    const totalRework = reqRework + bugRework;
    const rate = effort > 0 ? (totalRework / effort) * 100 : 0;

    return { effort, reqRework, bugRework, totalRework, rate };
  }

  onSizeChange(item: any, event: Event): void {
    const newSize = parseFloat((event.target as HTMLInputElement).value);
    if (!isNaN(newSize) && newSize >= 0) {
      item.sizeEdited = newSize;
      item.sizeSource = 'manual';
      // Recalculate totals on the metrics object
      this.recalculateTotals();
    }
  }

  /** Returns the effective size: manual override first, then original */
  getEffectiveSize(item: any): number {
    return item.sizeEdited !== undefined ? item.sizeEdited : item.size;
  }

  /** Returns the effective rate using sizeEdited if set */
  getEffectiveRate(item: any): number {
    const size = this.getEffectiveSize(item);
    return size > 0 ? item.effort / size : 0;
  }

  /** Toggle collapse state of an item row for a specific section */
  toggleExpand(id: string, section: number = 1): void {
    const set = section === 1 ? this.expandedItemsM1 :
      section === 2 ? this.expandedItemsM2 :
        section === 3 ? this.expandedItemsM3 : this.expandedItemsEED;
    if (set.has(id)) {
      set.delete(id);
    } else {
      set.add(id);
    }
  }

  /** Returns true if the document is in dark mode */
  isDark(): boolean {
    return document.documentElement.classList.contains('dark');
  }

  /** Sum a numeric field over tasks array (replaces pipe) */
  sumTasks(tasks: any[], field: 'originalEstimate' | 'completedWork'): number {
    return (tasks || []).reduce((s: number, t: any) => s + (t[field] || 0), 0);
  }

  /** Total original estimate across all sprint items' tasks */
  getTotalOriginalEstimate(): number {
    if (!this.metrics?.developmentRate?.items) return 0;
    return this.metrics.developmentRate.items
      .reduce((total, item) => total + (item.planned || 0), 0);
  }

  /** Total remaining work across all sprint items' tasks */
  getTotalRemainingWork(): number {
    if (!this.metrics?.developmentRate?.items) return 0;
    return this.metrics.developmentRate.items
      .reduce((total, item) => {
        const itemRem = (item.tasks || []).reduce((s: number, t: any) => s + (t.remainingWork || 0), 0);
        return total + itemRem;
      }, 0);
  }

  /** Recalculates total rate after manual size changes */
  private recalculateTotals(): void {
    if (!this.metrics?.developmentRate?.items) return;
    const items = this.metrics.developmentRate.items;

    // 1. Recalculate Development Rate
    const totalEffort = items.reduce((acc, i) => acc + i.effort, 0);
    const totalSize = items.reduce((acc, i) => acc + this.getEffectiveSize(i), 0);

    this.metrics.developmentRate.totalEffort = totalEffort;
    this.metrics.developmentRate.totalSize = totalSize;
    this.metrics.developmentRate.rate = totalSize > 0 ? totalEffort / totalSize : 0;
    this.metrics.developmentRate.status =
      this.metrics.developmentRate.rate <= 1.7 ? 'green' :
        this.metrics.developmentRate.rate <= 2.0 ? 'yellow' : 'red';

    // 4. Recalculate Defect Density
    if (this.metrics.defectDensity) {
      this.metrics.defectDensity.size = totalSize;
      const density = totalSize > 0 ? this.metrics.defectDensity.bugs / totalSize : 0;
      this.metrics.defectDensity.density = density;
      this.metrics.defectDensity.status =
        density <= 0.18 ? 'green' :
          density <= 0.23 ? 'yellow' : 'red';
    }

    // Calculate Dev Rate Standard Deviation
    if (items.length > 0) {
      const rates = items.map(i => this.getEffectiveRate(i));
      const mean = rates.reduce((a, b) => a + b, 0) / items.length;
      const variance = rates.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / items.length;
      this.metrics.developmentRate.stdDeviation = Math.sqrt(variance);
    } else {
      this.metrics.developmentRate.stdDeviation = 0;
    }

    // 2. Recalculate Effort Variance
    const totalPlanned = this.getTotalOriginalEstimate();
    this.metrics.effortVariance.planned = totalPlanned;
    this.metrics.effortVariance.actual = totalEffort;

    if (totalPlanned > 0) {
      const variance = (totalEffort - totalPlanned) / totalPlanned;
      this.metrics.effortVariance.rate = variance;
      this.metrics.effortVariance.absoluteRate = Math.abs(variance);
      const variancePercent = Math.abs(variance) * 100;
      this.metrics.effortVariance.status =
        variancePercent <= 15 ? 'green' :
          variancePercent <= 30 ? 'yellow' : 'red';
    } else {
      this.metrics.effortVariance.rate = 0;
      this.metrics.effortVariance.status = 'green';
    }

    // Calculate Effort Variance Standard Deviation (on individual % variances)
    const itemsVariances = items.map(i => {
      const p = i.planned || 0;
      const a = i.effort;
      return p > 0 ? ((a - p) / p) * 100 : 0;
    });

    const avgIndividualVariance = itemsVariances.length > 0
      ? itemsVariances.reduce((a, b) => a + b, 0) / itemsVariances.length
      : 0;
    this.metrics.effortVariance.avgIndividualRate = avgIndividualVariance;

    if (itemsVariances.length > 0) {
      const meanV = itemsVariances.reduce((a, b) => a + b, 0) / itemsVariances.length;
      const varianceV = itemsVariances.reduce((a, b) => a + Math.pow(b - meanV, 2), 0) / itemsVariances.length;
      this.metrics.effortVariance.stdDeviation = Math.sqrt(varianceV);
    } else {
      this.metrics.effortVariance.stdDeviation = 0;
    }

    // 3. Recalculate Rework (Aligned with Service)
    const isRequirementDone = (state: string) => ['Closed', 'Resolved', 'Done', 'Completed'].includes(state);
    let totalReqRework = 0;
    let totalBugRework = 0;
    let closedReqEffort = 0;

    items.forEach(item => {
      const parentIsBug = item.type === 'Bug' || item.type === 'Defecto';
      // Find original item in rawMetrics to get its real status
      const originalItem = this.rawMetrics?.developmentRate?.items?.find(i => i.id === item.id);
      const status = originalItem?.status || '';
      const itemDone = isRequirementDone(status);

      if (itemDone) {
        closedReqEffort += item.effort;
      }

      (item.tasks || []).forEach(task => {
        const effort = task.completedWork || 0;
        if (effort <= 0) return;
        const type = (task.type || '').toLowerCase();

        if (parentIsBug) {
          totalBugRework += effort;
        } else {
          if (type.includes('correctiv') || type.includes('retrabajo') || type.includes('fix') || type.includes('ajuste') || type.includes('rework') || type.includes('atencion') || type.includes('defecto') || type.includes('incidencia') || type.includes('registro')) {
            totalReqRework += effort;
          } else if (type.includes('bug') || type.includes('error') || type.includes('defect')) {
            totalBugRework += effort;
          }
        }
      });

      // Add effort from related bugs
      (item.relatedBugs || []).forEach((bug: any) => {
        totalBugRework += bug.completedWork || 0;
      });
    });

    const totalRework = totalReqRework + totalBugRework;
    const reworkRate = closedReqEffort > 0 ? (totalRework / closedReqEffort) * 100 : 0;

    this.metrics.rework = {
      reqEffort: closedReqEffort,
      reqRework: totalReqRework,
      bugRework: totalBugRework,
      totalRework,
      rate: reworkRate,
      status: reworkRate <= 22 ? 'green' : (reworkRate <= 30 ? 'yellow' : 'red')
    };

    this.iswMetrics = this.calculateMetricsByISW();
    this.timelineSummary = this.calculateTimelineSummary();

    // Refresh charts with updated data
    setTimeout(() => this.initCharts(), 50);
  }

  /** Groups items by ISW and calculates their individual metrics */
  calculateMetricsByISW(): any[] {
    if (!this.metrics?.developmentRate?.items) return [];

    const groups: { [key: string]: any } = {};

    this.metrics.developmentRate.items.forEach(item => {
      const isw = item.isw || 'Sin Asignar';
      if (!groups[isw]) {
        groups[isw] = {
          name: isw,
          totalEffort: 0,
          totalPlanned: 0,
          totalSize: 0,
          itemsCount: 0,
          items: []
        };
      }

      const planned = item.planned || 0;
      groups[isw].totalEffort += item.effort;
      groups[isw].totalPlanned += planned;
      groups[isw].totalSize += this.getEffectiveSize(item);
      groups[isw].itemsCount++;
      groups[isw].items.push(item);
    });

    return Object.values(groups).map(g => ({
      ...g,
      devRate: g.totalSize > 0 ? g.totalEffort / g.totalSize : 0,
      effortVariance: g.totalPlanned > 0 ? ((g.totalEffort - g.totalPlanned) / g.totalPlanned) * 100 : 0,
      reworkRate: (() => {
        let rEffort = 0;
        let rTotal = 0;
        g.items.forEach((item: any) => {
          const parentIsBug = item.type === 'Bug' || item.type === 'Defecto';
          (item.tasks || []).forEach((task: any) => {
            const taskEffort = task.completedWork || 0;
            if (taskEffort <= 0) return;
            const type = (task.type || '').toLowerCase();
            const title = (task.title || '').toLowerCase();

            if (parentIsBug) {
              rTotal += taskEffort;
            } else {
              if (type.includes('planead') || type.includes('nueva') || type.includes('desarroll') || type.includes('mejora') || type === '') {
                rEffort += taskEffort;
              } else if (type.includes('correctiv') || type.includes('retrabajo') || type.includes('fix') || type.includes('ajuste') || type.includes('rework') || type.includes('bug') || type.includes('error') || type.includes('defect') || type.includes('atencion') || type.includes('incidencia') || type.includes('registro') || title.includes('registro de defecto') || title.includes('registro de defectos')) {
                rTotal += taskEffort;
              } else {
                rEffort += taskEffort;
              }
            }
          });
          if (!parentIsBug && item.relatedBugs?.length) {
            item.relatedBugs.forEach((bug: any) => {
              if (bug && bug.tasks?.length) {
                bug.tasks.forEach((bt: any) => {
                  if (bt) {
                    rTotal += bt.completedWork || 0;
                  }
                });
              } else if (bug) {
                rTotal += bug.completedWork || 0;
              }
            });
          }
        });
        return rEffort > 0 ? (rTotal / rEffort) * 100 : 0;
      })()
    })).sort((a, b) => b.totalEffort - a.totalEffort);
  }

  calculateTimelineSummary() {
    const metrics = this.metrics;
    if (!metrics?.developmentRate?.items) {
      return { onTimeCount: 0, lateCount: 0, openCount: 0, avgLateDays: 0, items: [] };
    }

    const items = metrics.developmentRate.items;
    const start = metrics.startDate ? this.getLocalCalendarDate(metrics.startDate, false) : 0;
    const end = metrics.endDate ? this.getLocalCalendarDate(metrics.endDate, true) : 0;

    let onTimeCount = 0;
    let lateCount = 0;
    let openCount = 0;
    let totalLateDays = 0;

    const processedItems = items.map(item => {
      const isClosed = ['Closed', 'Resolved', 'Done', 'Completed'].includes(item.status);
      let deliveryStatus: 'on-time' | 'late' | 'open' = 'open';
      let daysLate = 0;
      let closedTime = 0;

      if (isClosed) {
        const closedDateStr = item.closedDate || item.changedDate;
        if (closedDateStr) {
          closedTime = new Date(closedDateStr).getTime();
          if (closedTime <= end) {
            deliveryStatus = 'on-time';
            onTimeCount++;
          } else {
            deliveryStatus = 'late';
            lateCount++;
            // Calcular días hábiles de retraso: empezar desde el día SIGUIENTE al fin del sprint
            // para que el último día del sprint no cuente como día de retraso
            const endDate = metrics.endDate;
            const dayAfterSprintEnd = endDate
              ? this.getLocalCalendarDate(this.addDays(endDate, 1).toISOString(), false)
              : end + 24 * 60 * 60 * 1000;
            daysLate = this.calculateBusinessDays(dayAfterSprintEnd, closedTime, this.getHolidays());
            totalLateDays += daysLate;
          }
        } else {
          deliveryStatus = 'on-time';
          onTimeCount++;
        }
      } else {
        openCount++;
      }

      return {
        ...item,
        deliveryStatus,
        daysLate,
        closedTime,
        leftPct: 98,
        verticalTier: 0
      };
    });

    // Sort processed items by horizontal timeline position (leftPct) to calculate vertical stacking (tiers)
    processedItems.forEach(item => {
      item.leftPct = this.getItemTimelinePosition(item);
    });

    processedItems.sort((a, b) => a.leftPct - b.leftPct);

    // Calculate vertical tier to prevent overlap
    const pctThreshold = 3.5;
    processedItems.forEach((item, index) => {
      let tier = 0;
      // Compare with previous items to find overlap
      for (let i = 0; i < index; i++) {
        const prev = processedItems[i];
        if (Math.abs(item.leftPct - prev.leftPct) < pctThreshold && prev.verticalTier === tier) {
          tier++;
          i = -1; // Restart loop to check if we overlap with this new tier too
        }
      }
      item.verticalTier = tier;
    });

    const avgLateDays = lateCount > 0 ? Math.round(totalLateDays / lateCount) : 0;
    const maxLateDays = processedItems.reduce((max, item) => Math.max(max, item.daysLate || 0), 0);

    return {
      onTimeCount,
      lateCount,
      openCount,
      avgLateDays,
      totalLateDays,
      maxLateDays,
      items: processedItems
    };
  }

  getEEDTimelineData(): any[] {
    if (!this.metrics?.developmentRate?.items) return [];

    const end = this.metrics.endDate ? this.getLocalCalendarDate(this.metrics.endDate, true) : 0;
    const tree: any[] = [];
    const seenBugs = new Set<number>();
    const renderedBugIds = new Set<number>();

    // 1. Process all User Stories and Features
    this.metrics.developmentRate.items.forEach(item => {
      const isClosed = ['Closed', 'Resolved', 'Done', 'Completed'].includes(item.status);
      let deliveryStatus: 'dentro' | 'fuera' = 'fuera';

      const closedDateStr = item.closedDate || item.changedDate;
      if (isClosed && closedDateStr) {
        const closedTime = this.getLocalCalendarDate(closedDateStr, false);
        if (closedTime <= end) {
          deliveryStatus = 'dentro';
        }
      }

      // Process its related bugs (deduplicated across the timeline)
      const itemBugs: any[] = [];
      (item.relatedBugs || []).forEach(bug => {
        if (!renderedBugIds.has(bug.id)) {
          renderedBugIds.add(bug.id);
          seenBugs.add(bug.id);
          const bugState = bug.status || 'Active';
          const bugClosed = ['Closed', 'Resolved', 'Done', 'Completed'].includes(bugState);
          let bugDeliveryStatus: 'dentro' | 'fuera' = 'fuera';

          const bugClosedDateStr = bug.closedDate || bug.changedDate;
          if (bugClosed) {
            if (bugClosedDateStr) {
              const bugClosedTime = this.getLocalCalendarDate(bugClosedDateStr, false);
              if (bugClosedTime <= end) {
                bugDeliveryStatus = 'dentro';
              }
            }
          }

          itemBugs.push({
            id: bug.id,
            title: bug.title,
            status: bugState,
            deliveryStatus: bugDeliveryStatus,
            closedDate: bugClosedDateStr,
            assignedTo: bug.assignedTo,
            tags: bug.tags || ''
          });
        }
      });

      tree.push({
        id: item.id,
        type: item.type,
        title: item.title,
        status: item.status,
        deliveryStatus,
        closedDate: closedDateStr,
        isw: item.isw,
        bugs: itemBugs,
        tasks: item.tasks || [],
        parentId: item.parentId || '',
        leftPct: this.getItemTimelinePosition(item)
      });
    });

    // 2. Process Standalone bugs (those in defectRemovalEfficiency.bugsList not linked to any requirement)
    const allEEDBugs = this.metrics.defectRemovalEfficiency.bugsList || [];

    // Split into Kanban standalone bugs and Sprint standalone bugs
    const kanbanBugs = allEEDBugs.filter(b => b.isKanban);
    const sprintStandaloneBugs = allEEDBugs.filter(b => !b.isKanban && (b.parentType === 'Standalone' || !seenBugs.has(parseInt(b.bugId))));

    const start = this.metrics?.startDate ? this.getLocalCalendarDate(this.metrics.startDate, false) : 0;
    const sprintDuration = end - start;

    const getTimelinePctForBugs = (bugsList: any[]) => {
      let avgTime = 0;
      let count = 0;
      bugsList.forEach(b => {
        if (b.closedDate) {
          avgTime += this.getLocalCalendarDate(b.closedDate, false);
          count++;
        }
      });
      const closedTime = count > 0 ? (avgTime / count) : 0;
      let leftPct = 85; // fallback
      if (closedTime && sprintDuration > 0) {
        if (closedTime <= end) {
          const relativeTime = closedTime - start;
          const pct = relativeTime / sprintDuration;
          leftPct = Math.min(Math.max(pct * 70, 2), 70);
        } else {
          const endDate = this.metrics?.endDate;
          const dayAfterSprintEnd = endDate
            ? this.getLocalCalendarDate(this.addDays(endDate, 1).toISOString(), false)
            : end + 24 * 60 * 60 * 1000;
          const daysLate = this.calculateBusinessDays(dayAfterSprintEnd, closedTime, this.getHolidays());
          const extPercent = Math.min(daysLate / 15, 1);
          leftPct = Math.min(Math.max(70 + extPercent * 28, 70), 98);
        }
      }
      return leftPct;
    };

    if (kanbanBugs.length > 0) {
      const leftPct = getTimelinePctForBugs(kanbanBugs);
      tree.push({
        id: 'kanban_standalone',
        type: 'Standalone',
        title: 'Bugs de Otro Sprint (Atendidos por Kanban)',
        status: '',
        deliveryStatus: 'dentro',
        leftPct,
        bugs: kanbanBugs.map(b => ({
          id: parseInt(b.bugId),
          title: b.title,
          status: b.status,
          deliveryStatus: b.alignment === 'on-time' ? 'dentro' : 'fuera',
          closedDate: b.closedDate,
          assignedTo: b.isw,
          tags: b.tags || ''
        })),
        verticalTier: 0
      });
    }

    if (sprintStandaloneBugs.length > 0) {
      const leftPct = getTimelinePctForBugs(sprintStandaloneBugs);
      // Determine deliveryStatus for the group: 'fuera' if any bug is late or open (none)
      const hasLateOrOpen = sprintStandaloneBugs.some(b => b.alignment === 'late' || b.alignment === 'none');
      tree.push({
        id: 'sprint_standalone',
        type: 'SprintStandalone',
        title: 'Bugs del Sprint (Sin Story/FT)',
        status: '',
        deliveryStatus: hasLateOrOpen ? 'fuera' : 'dentro',
        leftPct,
        bugs: sprintStandaloneBugs.map(b => ({
          id: parseInt(b.bugId),
          title: b.title,
          status: b.status,
          deliveryStatus: b.alignment === 'on-time' ? 'dentro' : 'fuera',
          closedDate: b.closedDate,
          assignedTo: b.isw,
          tags: b.tags || ''
        })),
        verticalTier: 0
      });
    }

    // Sort tree by leftPct to calculate vertical stacking (tiers)
    tree.sort((a, b) => a.leftPct - b.leftPct);

    // Calculate vertical tier to prevent overlap
    const pctThreshold = 4.5;
    tree.forEach((item, index) => {
      let tier = 0;
      // Compare with previous items to find overlap
      for (let i = 0; i < index; i++) {
        const prev = tree[i];
        if (Math.abs(item.leftPct - prev.leftPct) < pctThreshold && prev.verticalTier === tier) {
          tier++;
          i = -1; // Restart loop to check if we overlap with this new tier too
        }
      }
      item.verticalTier = tier;
    });

    return tree;
  }

  getDeliveryInfo(item: any) {
    const isClosed = ['Closed', 'Resolved', 'Done', 'Completed'].includes(item.status);
    if (!isClosed) return { status: 'open', days: 0, date: '' };

    const end = this.metrics?.endDate ? this.getLocalCalendarDate(this.metrics.endDate, true) : 0;
    const closedDateStr = item.closedDate || item.changedDate;

    if (closedDateStr) {
      const closedTime = this.getLocalCalendarDate(closedDateStr, false);
      if (closedTime <= end) {
        return { status: 'on-time', days: 0, date: closedDateStr };
      } else {
        const endDate = this.metrics?.endDate;
        const dayAfterSprintEnd = endDate
          ? this.getLocalCalendarDate(this.addDays(endDate, 1).toISOString(), false)
          : end + 24 * 60 * 60 * 1000;
        const days = this.calculateBusinessDays(dayAfterSprintEnd, closedTime, this.getHolidays());
        return { status: 'late', days, date: closedDateStr };
      }
    }

    return { status: 'on-time', days: 0, date: '' };
  }

  getItemTimelinePosition(item: any): number {
    if (!this.metrics?.startDate || !this.metrics?.endDate) return 98;

    const start = this.getLocalCalendarDate(this.metrics.startDate, false);
    const end = this.getLocalCalendarDate(this.metrics.endDate, true);
    const sprintDuration = end - start;

    if (sprintDuration <= 0) return 50;

    const isClosed = ['Closed', 'Resolved', 'Done', 'Completed'].includes(item.status);
    if (!isClosed) return 98;

    const closedDateStr = item.closedDate || item.changedDate;
    if (!closedDateStr) return 35;

    const closedTime = this.getLocalCalendarDate(closedDateStr, false);

    if (closedTime <= end) {
      const relativeTime = closedTime - start;
      const pct = relativeTime / sprintDuration;
      return Math.min(Math.max(pct * 70, 2), 70);
    } else {
      const endDate = this.metrics?.endDate;
      const dayAfterSprintEnd = endDate
        ? this.getLocalCalendarDate(this.addDays(endDate, 1).toISOString(), false)
        : end + 24 * 60 * 60 * 1000;
      const daysLate = this.calculateBusinessDays(dayAfterSprintEnd, closedTime, this.getHolidays());
      const pctLate = Math.min(daysLate / 15, 1);
      return Math.min(Math.max(70 + (pctLate * 25), 72), 95);
    }
  }

  getEEDFactor(tier: number): number {
    if (!tier) return 0;
    const isOdd = tier % 2 !== 0;
    return isOdd ? -Math.ceil(tier / 2) : (tier / 2);
  }

  getTimelineTransform(tier: number, step: number = 36): string {
    const factor = this.getEEDFactor(tier);
    return `translate(-50%, ${factor * step}px)`;
  }

  getChildStories(featureId: string): any[] {
    if (!this.metrics?.developmentRate?.items) return [];
    return this.metrics.developmentRate.items.filter(item => item.parentId === featureId && item.type === 'User Story');
  }

  getTimelineStemStyle(tier: number, step: number = 36) {
    const factor = this.getEEDFactor(tier);
    if (factor === 0) return { display: 'none' };
    const height = Math.abs(factor * step);
    if (factor < 0) {
      return { top: '10px', height: `${height}px` };
    } else {
      return { top: `${10 - height}px`, height: `${height}px` };
    }
  }

  getEEDTransform(tier: number, step: number = 44): string {
    const factor = this.getEEDFactor(tier);
    return `translate(-50%, ${factor * step}px)`;
  }

  getEEDStemStyle(tier: number, step: number = 44) {
    const factor = this.getEEDFactor(tier);
    if (factor === 0) return { display: 'none' };
    const height = Math.abs(factor * step);
    if (factor < 0) {
      return { top: '12px', height: `${height}px` };
    } else {
      return { top: `${12 - height}px`, height: `${height}px` };
    }
  }

  openWorkItem(id: number | string | undefined): void {
    if (!id || id === 'standalone' || id === 'kanban_standalone' || id === 'sprint_standalone') return;
    const org = this.config?.azure?.organization;
    const proj = this.config?.azure?.project;
    if (!org || !proj) return;
    const url = `https://dev.azure.com/${org}/${proj}/_workitems/edit/${id}`;

    // Check if running inside Electron
    const win = window as any;
    if (win.require) {
      try {
        const { shell } = win.require('electron');
        shell.openExternal(url);
        return;
      } catch (e) {
        console.error('Failed to open external link using Electron shell:', e);
      }
    }

    // Fallback to standard web browser open
    window.open(url, '_blank');
  }

  addDays(dateStr: string | undefined, days: number): Date {
    if (!dateStr) return new Date();
    const d = new Date(dateStr);
    d.setDate(d.getDate() + days);
    return d;
  }

  getLocalCalendarDate(dateStr: string | undefined, isEndOfDay: boolean = false): number {
    if (!dateStr) return 0;
    const d = new Date(dateStr);
    const year = d.getUTCFullYear();
    const month = d.getUTCMonth();
    const day = d.getUTCDate();
    const localDate = new Date(year, month, day);
    if (isEndOfDay) {
      localDate.setHours(23, 59, 59, 999);
    } else {
      localDate.setHours(0, 0, 0, 0);
    }
    return localDate.getTime();
  }

  isConfigured(): boolean {
    return this.configService.hasConfig();
  }

  goToConfig() {
    this.router.navigate(['/config']);
  }

  getTaskDeviationString(task: any): string {
    const planned = task.originalEstimate || 0;
    const actual = task.completedWork || 0;
    if (planned <= 0) return '0%';
    const dev = ((actual - planned) / planned) * 100;
    const sign = dev > 0 ? '+' : '';
    return `${sign}${dev.toFixed(0)}%`;
  }

  getTaskDeviationClass(task: any): string {
    const planned = task.originalEstimate || 0;
    const actual = task.completedWork || 0;
    if (planned <= 0) return 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500';
    const devPct = Math.abs(((actual - planned) / planned) * 100);
    if (devPct <= 15) return 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300';
    if (devPct <= 30) return 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300';
    return 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300';
  }

  formatEffort(val: number | undefined | null): string {
    if (val === undefined || val === null) return '0.0';
    const str = val.toString();
    const decimalPart = str.split('.')[1] || '';
    if (decimalPart.length > 1) {
      return parseFloat(val.toFixed(3)).toString();
    }
    return val.toFixed(1);
  }

  initCharts() {
    if (!this.metrics || !this.devRateChartCanvas || !this.effortChartCanvas || !this.defectChartCanvas) return;

    // Destroy existing charts
    this.charts.forEach(c => c.destroy());
    this.charts = [];

    if (this.testExecChart) {
      this.testExecChart.destroy();
      this.testExecChart = null;
    }

    if (this.m38Chart) {
      this.m38Chart.destroy();
      this.m38Chart = null;
    }

    const isDark = document.documentElement.classList.contains('dark');
    const textColor = isDark ? '#94a3b8' : '#64748b';
    const gridColor = isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)';

    // Generate dynamic labels based on selected iteration
    let labels = ['S1', 'S2', 'S3', 'S4', 'Actual'];
    const iterForChart2 = this.iterations.find(i => i.id === this.selectedIteration || i.path === this.selectedIteration);
    const sprintText2 = iterForChart2 ? iterForChart2.path : this.selectedIterationName;
    const match = sprintText2.match(/Sprint\s*(\d+)/i);
    if (match) {
      const currentNum = parseInt(match[1]);
      labels = [
        `Sprint ${currentNum - 4}`,
        `Sprint ${currentNum - 3}`,
        `Sprint ${currentNum - 2}`,
        `Sprint ${currentNum - 1}`,
        `Sprint ${currentNum}`
      ];
    } else {
      labels = ['Anterior 4', 'Anterior 3', 'Anterior 2', 'Anterior 1', this.selectedIterationName];
    }

    // 1. Development Rate Chart — real items from selected sprint
    const items = this.metrics.developmentRate.items;
    const itemLabels = items.map(i => `${i.type === 'Feature' ? 'FT' : 'US'} #${i.id}`);
    const itemRates = items.map(i => parseFloat(this.getEffectiveRate(i).toFixed(2)));
    const itemColors = itemRates.map(r =>
      r <= 1.7 ? 'rgba(34, 197, 94, 0.75)' :   // green
        r <= 2.0 ? 'rgba(234, 179, 8, 0.75)' :   // yellow
          'rgba(239, 68, 68, 0.75)'       // red
    );
    const itemBorders = itemRates.map(r =>
      r <= 1.7 ? '#16a34a' : r <= 2.0 ? '#ca8a04' : '#dc2626'
    );
    const globalRate = parseFloat(this.metrics.developmentRate.rate.toFixed(2));

    this.charts.push(new Chart(this.devRateChartCanvas.nativeElement, {
      type: 'bar',
      data: {
        labels: itemLabels,
        datasets: [
          {
            label: 'Tasa individual (Esfuerzo / Size)',
            data: itemRates,
            backgroundColor: itemColors,
            borderColor: itemBorders,
            borderWidth: 1.5,
            borderRadius: 4,
            order: 2
          },
          {
            label: `KPI Global: ${globalRate}`,
            data: new Array(itemLabels.length).fill(globalRate),
            type: 'line' as any,
            borderColor: '#3b82f6',
            backgroundColor: 'transparent',
            borderWidth: 2.5,
            borderDash: [6, 3],
            pointRadius: 0,
            tension: 0,
            order: 1
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            min: 0,
            grid: { color: gridColor },
            ticks: { color: textColor },
            title: { display: true, text: 'Tasa (H/SP)', color: textColor, font: { size: 10 } }
          },
          x: {
            grid: { display: false },
            ticks: { color: textColor, font: { size: 9 }, maxRotation: 45 }
          }
        },
        plugins: {
          legend: {
            display: true,
            position: 'top',
            labels: { color: textColor, font: { size: 10 }, boxWidth: 12 }
          },
          annotation: {
            annotations: {
              zoneGreen: { type: 'box', yMin: 0, yMax: 1.7, backgroundColor: 'rgba(34, 197, 94, 0.04)', borderWidth: 0 },
              zoneYellow: { type: 'box', yMin: 1.7, yMax: 2.0, backgroundColor: 'rgba(234, 179, 8, 0.04)', borderWidth: 0 },
              zoneRed: { type: 'box', yMin: 2.0, yMax: 6.0, backgroundColor: 'rgba(239, 68, 68, 0.04)', borderWidth: 0 },
              lineGreen: {
                type: 'line', yMin: 1.7, yMax: 1.7, borderColor: 'rgba(34, 197, 94, 0.6)', borderWidth: 1.5, borderDash: [4, 4],
                label: { content: '1.70 ✓', display: true, position: 'end', color: '#16a34a', font: { size: 9 } }
              },
              lineRed: {
                type: 'line', yMin: 2.0, yMax: 2.0, borderColor: 'rgba(239, 68, 68, 0.6)', borderWidth: 1.5, borderDash: [4, 4],
                label: { content: '2.00 ✗', display: true, position: 'end', color: '#dc2626', font: { size: 9 } }
              }
            }
          },
          tooltip: {
            callbacks: {
              label: (ctx: any) => {
                if (ctx.datasetIndex === 0) {
                  const item = items[ctx.dataIndex];
                  const sz = this.getEffectiveSize(item);
                  return [`Tasa: ${ctx.raw}`, `Esfuerzo real: ${item.effort.toFixed(1)}h`, `Size: ${sz}`];
                }
                return `KPI Global: ${ctx.raw}`;
              }
            }
          }
        }
      }
    }));

    // 2. Effort Variance Chart — real items
    const itemVariances = items.map(i => {
      const planned = this.sumTasks(i.tasks, 'originalEstimate');
      const actual = i.effort;
      return planned > 0 ? parseFloat(((actual - planned) / planned * 100).toFixed(1)) : 0;
    });

    const varianceColors = itemVariances.map(v =>
      v <= 15 ? 'rgba(99, 102, 241, 0.75)' :  // blueish-indigo for variance
        v <= 30 ? 'rgba(234, 179, 8, 0.75)' :   // yellow
          'rgba(239, 68, 68, 0.75)'     // red
    );
    const globalVariance = parseFloat((this.metrics.effortVariance.rate * 100).toFixed(1));

    this.charts.push(new Chart(this.effortChartCanvas.nativeElement, {
      type: 'bar',
      data: {
        labels: itemLabels,
        datasets: [
          {
            label: 'Desviación individual (%)',
            data: itemVariances,
            backgroundColor: varianceColors,
            borderColor: varianceColors.map(c => c.replace('0.75', '1')),
            borderWidth: 1.5,
            borderRadius: 4,
            order: 2
          },
          {
            label: `KPI Global: ${globalVariance}%`,
            data: new Array(itemLabels.length).fill(globalVariance),
            type: 'line' as any,
            borderColor: '#6366f1',
            backgroundColor: 'transparent',
            borderWidth: 2.5,
            borderDash: [6, 3],
            pointRadius: 0,
            tension: 0,
            order: 1
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            grid: { color: gridColor },
            ticks: { color: textColor },
            title: { display: true, text: 'Desviación (%)', color: textColor, font: { size: 10 } }
          },
          x: {
            grid: { display: false },
            ticks: { color: textColor, font: { size: 9 }, maxRotation: 45 }
          }
        },
        plugins: {
          legend: {
            display: true,
            position: 'top',
            labels: { color: textColor, font: { size: 10 }, boxWidth: 12 }
          },
          annotation: {
            annotations: {
              zoneGreen: { type: 'box', yMin: -100, yMax: 15, backgroundColor: 'rgba(34, 197, 94, 0.04)', borderWidth: 0 },
              zoneYellow: { type: 'box', yMin: 15, yMax: 30, backgroundColor: 'rgba(234, 179, 8, 0.04)', borderWidth: 0 },
              zoneRed: { type: 'box', yMin: 30, yMax: 200, backgroundColor: 'rgba(239, 68, 68, 0.04)', borderWidth: 0 },
              line15: {
                type: 'line', yMin: 15, yMax: 15, borderColor: 'rgba(234, 179, 8, 0.6)', borderWidth: 1.5, borderDash: [4, 4],
                label: { content: '15%', display: true, position: 'end', color: '#ca8a04', font: { size: 9 } }
              },
              line30: {
                type: 'line', yMin: 30, yMax: 30, borderColor: 'rgba(239, 68, 68, 0.6)', borderWidth: 1.5, borderDash: [4, 4],
                label: { content: '30%', display: true, position: 'end', color: '#dc2626', font: { size: 9 } }
              }
            }
          },
          tooltip: {
            callbacks: {
              label: (ctx: any) => {
                if (ctx.datasetIndex === 0) {
                  const item = items[ctx.dataIndex];
                  const planned = item.planned || 0;
                  return [
                    `Desviación: ${ctx.raw}%`,
                    `Estimado: ${planned.toFixed(1)}h`,
                    `Real: ${item.effort.toFixed(1)}h`
                  ];
                }
                return `KPI Global: ${ctx.raw}%`;
              }
            }
          }
        }
      }
    }));

    // 3. Defect Chart — Mixed bar (colored) + line (trend wave)
    const defectInitLabel = [this.shortSprintLabel(this.selectedIterationName || 'Actual')];
    const defectInitValue = [this.metrics.defectDensity.density];
    this.charts.push(new Chart(this.defectChartCanvas.nativeElement, {
      type: 'bar',
      data: {
        labels: defectInitLabel,
        datasets: [
          {
            type: 'bar' as const,
            label: 'Densidad',
            data: defectInitValue,
            backgroundColor: (ctx: any) => {
              const val = ctx.raw;
              if (val > 0.23) return 'rgba(239,68,68,0.82)';
              if (val > 0.18) return 'rgba(234,179,8,0.82)';
              return 'rgba(34,197,94,0.82)';
            },
            borderColor: (ctx: any) => {
              const val = ctx.raw;
              if (val > 0.23) return '#ef4444';
              if (val > 0.18) return '#eab308';
              return '#22c55e';
            },
            borderWidth: 1,
            borderRadius: 6,
            borderSkipped: false,
            order: 2,
          },
          {
            type: 'line' as const,
            label: 'Tendencia',
            data: defectInitValue,
            borderColor: 'rgba(99,102,241,0.9)',
            backgroundColor: 'rgba(99,102,241,0.08)',
            borderWidth: 2.5,
            pointRadius: 5,
            pointBackgroundColor: (ctx: any) => {
              const val = (ctx.raw as number);
              if (val > 0.23) return '#ef4444';
              if (val > 0.18) return '#eab308';
              return '#22c55e';
            },
            pointBorderColor: '#fff',
            pointBorderWidth: 1.5,
            tension: 0.4,
            fill: false,
            order: 1,
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        scales: {
          y: {
            beginAtZero: true,
            grid: { color: gridColor },
            ticks: { color: textColor, callback: (v: any) => v.toFixed(2) }
          },
          x: { grid: { display: false }, ticks: { color: textColor, maxRotation: 45, minRotation: 30 } }
        },
        plugins: {
          legend: {
            display: true,
            labels: { color: textColor, boxWidth: 12, font: { size: 11 } }
          },
          tooltip: {
            callbacks: {
              label: (ctx: any) => ` Densidad: ${Number(ctx.raw).toFixed(3)}`
            }
          },
          annotation: {
            annotations: {
              target: {
                type: 'line', yMin: 0.18, yMax: 0.18,
                borderColor: '#eab308', borderWidth: 2, borderDash: [6, 4],
                label: { display: true, content: '0.18', position: 'end', color: '#eab308', font: { size: 9, weight: 'bold' }, padding: 3 }
              },
              limit: {
                type: 'line', yMin: 0.23, yMax: 0.23,
                borderColor: '#ef4444', borderWidth: 2, borderDash: [6, 4],
                label: { display: true, content: '0.23', position: 'end', color: '#ef4444', font: { size: 9, weight: 'bold' }, padding: 3 }
              }
            }
          }
        }
      }
    }));

    setTimeout(() => this.updateTestExecChart(), 50);
    setTimeout(() => this.updateM38Chart(), 50);

    // If there are already compared sprints selected, reload their chart after init
    if (this.comparedDensityData.length > 0) {
      setTimeout(() => this.updateDefectChart(), 80);
    }
  }

  // ── Sprint Comparison for Escaped Bugs ─────────────────────────────────────

  onCompareEscapedToggle(iterationId: string, event: Event) {
    const checked = (event.target as HTMLInputElement).checked;
    if (checked) {
      if (!this.selectedCompareEscapedIterations.includes(iterationId)) {
        this.selectedCompareEscapedIterations = [...this.selectedCompareEscapedIterations, iterationId];
      }
    } else {
      this.selectedCompareEscapedIterations = this.selectedCompareEscapedIterations.filter(id => id !== iterationId);
    }
  }

  clearCompareEscaped() {
    this.selectedCompareEscapedIterations = [];
    this.comparedEscapedData = [];
    this.updateEscapedChart();
  }

  loadCompareEscaped() {
    if (this.selectedCompareEscapedIterations.length === 0 || !this.metrics) return;
    this.isLoadingCompareEscaped = true;

    const observables = this.selectedCompareEscapedIterations.map((id: string) =>
      this.azureService.getMetrics(id)
    );

    forkJoin(observables).subscribe({
      next: (results: any[]) => {
        this.comparedEscapedData = results.map((m: any, i: number) => {
          const iterId = this.selectedCompareEscapedIterations[i];
          const iter = this.iterations.find((it: any) => it.id === iterId);
          const eb = m?.escapedBugs;
          let bugsTesting = eb?.bugsTesting ?? 0;
          let bugsUat = eb?.bugsUat ?? 0;
          let bugsProd = eb?.bugsProd ?? 0;
          // Remember: UAT is Production for us.
          const total = bugsTesting + bugsUat + bugsProd;
          const rate = total > 0 ? ((bugsProd + bugsUat) / total) * 100 : 0;
          const status = rate <= 33 ? 'green' : (rate <= 40 ? 'yellow' : 'red');
          return { id: iterId, name: iter?.name ?? iterId, rate, status };
        });
        this.isLoadingCompareEscaped = false;
        this.updateEscapedChart();
        this.notificationService.success(`Comparativa de ${results.length} sprint(s) cargada.`);
      },
      error: () => {
        this.isLoadingCompareEscaped = false;
        this.notificationService.error('Error al cargar métricas de sprints para comparar.');
      }
    });
  }

  // ── Sprint Comparison for Defect Density ──────────────────────────────────

  onCompareIterationToggle(iterationId: string, event: Event) {
    const checked = (event.target as HTMLInputElement).checked;
    if (checked) {
      if (!this.selectedCompareIterations.includes(iterationId)) {
        this.selectedCompareIterations = [...this.selectedCompareIterations, iterationId];
      }
    } else {
      this.selectedCompareIterations = this.selectedCompareIterations.filter(id => id !== iterationId);
    }
  }

  clearCompareIterations() {
    this.selectedCompareIterations = [];
    this.comparedDensityData = [];
    this.updateDefectChart();
  }

  loadCompareDefectDensity() {
    if (this.selectedCompareIterations.length === 0 || !this.metrics) return;
    this.isLoadingCompare = true;

    const observables = this.selectedCompareIterations.map((id: string) =>
      this.azureService.getMetrics(id)
    );

    forkJoin(observables).subscribe({
      next: (results: any[]) => {
        this.comparedDensityData = results.map((m: any, i: number) => {
          const iterId = this.selectedCompareIterations[i];
          const iter = this.iterations.find((it: any) => it.id === iterId);
          const density = m?.defectDensity?.density ?? 0;
          const status = density > 0.23 ? 'red' : density > 0.18 ? 'yellow' : 'green';
          return { id: iterId, name: iter?.name ?? iterId, density, status };
        });
        this.isLoadingCompare = false;
        this.updateDefectChart();
        this.notificationService.success(`Comparativa de ${results.length} sprint(s) cargada.`);
      },
      error: () => {
        this.isLoadingCompare = false;
        this.notificationService.error('Error al cargar métricas de sprints para comparar.');
      }
    });
  }

  /** Extract short sprint label: 'Mayansoft - Sprint 27' -> 'S27', 'Sprint 3' -> 'S3', unknown -> original */
  shortSprintLabel(name: string): string {
    const match = name.match(/(\d+)\s*$/);
    return match ? `S${match[1]}` : name;
  }

  updateDefectChart() {
    const defectChartInstance = this.charts[2]; // Index 2 = defect chart
    if (!defectChartInstance || !this.metrics) return;

    const currentName = this.shortSprintLabel(this.selectedIterationName || 'Actual');
    const currentDensity = this.metrics.defectDensity.density;

    // Sort compare data chronologically (by iteration order in iterations array)
    const sorted = [...this.comparedDensityData].sort((a, b) => {
      const ai = this.iterations.findIndex((it: any) => it.id === a.id);
      const bi = this.iterations.findIndex((it: any) => it.id === b.id);
      return ai - bi;
    });

    // Remove current sprint from compare list if it sneaked in
    const compareWithoutCurrent = sorted.filter(d => d.id !== this.selectedIteration);

    const labels = [...compareWithoutCurrent.map(d => this.shortSprintLabel(d.name)), currentName];
    const values = [...compareWithoutCurrent.map(d => d.density), currentDensity];

    // Update both datasets: bars (index 0) and trend line (index 1)
    defectChartInstance.data.labels = labels;
    defectChartInstance.data.datasets[0].data = values; // bars
    defectChartInstance.data.datasets[1].data = values; // trend line
    defectChartInstance.update('active');
  }

  runAI() {
    if (!this.metrics) return;
    this.isAnalyzing = true;
    this.aiAnalysis = '';
    this.metricAnalyses = {};

    // 1. Identify previous sprints within Bepensa - Fase 1 that are older than the current selected one
    const currentIdx = this.iterations.findIndex(i => i.id === this.selectedIteration);
    let historicalObservables = of([] as CMMIMetrics[]);

    if (currentIdx > 0) {
      // Sprints are date-sorted ascending. All sprints before currentIdx are historical.
      const previousSprintIds = this.iterations
        .slice(0, currentIdx)
        .filter(i => (i.path || '').toLowerCase().includes('mayansoft'))
        .map(i => i.id);

      if (previousSprintIds.length > 0) {
        historicalObservables = forkJoin(
          previousSprintIds.map(id => this.azureService.getMetrics(id))
        );
      }
    }

    historicalObservables.subscribe({
      next: (historicalData: CMMIMetrics[]) => {
        // Filter out empty metrics if any failed to load
        const cleanHistory = historicalData.filter(h => h.developmentRate && h.developmentRate.items);

        this.aiService.analyzeMetrics(this.metrics!, cleanHistory, this.metricComments).subscribe({
          next: (res) => {
            const isErrorResponse = res && (
              res.startsWith('Error al') ||
              res.startsWith('El análisis tardó') ||
              res.startsWith('Cuota de') ||
              res.startsWith('API Key de') ||
              res.startsWith('AI Configuration') ||
              res.startsWith('Configuración de IA')
            );
            if (isErrorResponse) {
              this.isAnalyzing = false;
              this.notificationService.error(res);
              return;
            }
            this.aiAnalysis = res;
            this.parseAnalysis(res);
            localStorage.setItem('cmmi5_ai_analysis_' + this.selectedIteration, res);
            this.isAnalyzing = false;
            this.notificationService.success('Análisis de IA generado exitosamente.');

            // Save to Mongo DB Atlas with individual per-metric analyses
            this.metricsApiService.saveAnalysis(
              this.selectedIteration,
              this.selectedSprintDisplayName || this.selectedIterationName,
              this.metrics!,
              res,
              this.metricAnalyses,
              this.metricComments
            ).subscribe(dbRes => {
              if (dbRes) {
                this.loadVersionsHistory();
                this.notificationService.success('Análisis guardado exitosamente en BD Atlas');
              }
            });
          },
          error: (err: any) => {
            this.isAnalyzing = false;
            const detail = err && (err.message || err.error?.message || err.statusText) ? `: ${err.message || err.error?.message || err.statusText}` : '';
            this.notificationService.error('Error al generar el análisis de IA. Revisa tu API Key y modelo' + detail);
          }
        });
      },
      error: (err: any) => {
        console.error('Error fetching historical metrics for AI context:', err);
        // Fallback to analyzing current metric data without history if call fails
        this.aiService.analyzeMetrics(this.metrics!, [], this.metricComments).subscribe({
          next: (res) => {
            this.aiAnalysis = res;
            this.parseAnalysis(res);
            localStorage.setItem('cmmi5_ai_analysis_' + this.selectedIteration, res);
            this.isAnalyzing = false;
            this.notificationService.success('Análisis de IA generado sin historial.');

            // Save to Mongo DB Atlas with individual per-metric analyses
            this.metricsApiService.saveAnalysis(
              this.selectedIteration,
              this.selectedSprintDisplayName || this.selectedIterationName,
              this.metrics!,
              res,
              this.metricAnalyses,
              this.metricComments
            ).subscribe(dbRes => {
              if (dbRes) {
                this.loadVersionsHistory();
                this.notificationService.success('Análisis guardado exitosamente en BD Atlas');
              }
            });
          },
          error: (err2: any) => {
            this.isAnalyzing = false;
            this.notificationService.error('Error al generar el análisis de IA.');
          }
        });
      }
    });
  }

  parseAnalysis(text: string) {
    this.metricAnalyses = {};
    const segments = text.split('[METRICA_FIN]');
    segments.forEach(seg => {
      const lowerSeg = seg.toLowerCase();
      if (lowerSeg.includes('tasa de desarrollo')) this.metricAnalyses['tasa de desarrollo'] = seg.split(']')[1]?.trim();
      if (lowerSeg.includes('tasa de desviación')) this.metricAnalyses['tasa de desviación'] = seg.split(']')[1]?.trim();
      if (lowerSeg.includes('cumplimiento') || lowerSeg.includes('línea de tiempo') || lowerSeg.includes('linea de tiempo') || lowerSeg.includes('sprint timeline')) {
        let val = seg.split(']')[1]?.trim();
        if (val) {
          const analysisHeaderMatch = val.match(/-\s*Análisis de resultados:?([\s\S]*?)(?=-\s*Acciones correctivas:?|-\s*Análisis acumulado|$)/i);
          if (analysisHeaderMatch && analysisHeaderMatch[1]) {
            val = analysisHeaderMatch[1].trim();
          } else {
            val = val
              .replace(/-\s*Meta establecida para el periodo:[^\n]*/gi, '')
              .replace(/-\s*Resultado del periodo:[^\n]*/gi, '')
              .replace(/-\s*Análisis de resultados:?/gi, '')
              .replace(/-\s*Acciones correctivas:?[\s\S]*?(?=-\s*Análisis acumulado|$)/gi, '')
              .replace(/-\s*Análisis acumulado del periodo:?[\s\S]*/gi, '')
              .trim();
          }
          this.metricAnalyses['cumplimiento'] = val;
        }
      }
      if (lowerSeg.includes('tasa de retrabajo') || lowerSeg.includes('retrabajo')) {
        const val = seg.split(']')[1]?.trim();
        this.metricAnalyses['retrabajo'] = val;
        this.metricAnalyses['tasa de retrabajo'] = val;
      }
      if (lowerSeg.includes('densidad de defectos')) this.metricAnalyses['densidad de defectos'] = seg.split(']')[1]?.trim();
      if (lowerSeg.includes('eficiencia en la eliminación de defectos') || lowerSeg.includes('eed') || lowerSeg.includes('eliminación de defectos')) {
        const val = seg.split(']')[1]?.trim();
        this.metricAnalyses['eed'] = val;
        this.metricAnalyses['eficiencia de eliminación de defectos'] = val;
      }
      if (lowerSeg.includes('porcentaje de bugs escapados') || lowerSeg.includes('bugs escapados') || lowerSeg.includes('escapados')) {
        const val = seg.split(']')[1]?.trim();
        this.metricAnalyses['escaped'] = val;
        this.metricAnalyses['bugs escapados'] = val;
      }
      if (lowerSeg.includes('ejecución de pruebas') || lowerSeg.includes('ejecucion de pruebas') || lowerSeg.includes('run rate') || (lowerSeg.includes('pruebas') && !lowerSeg.includes('satisfactorias') && !lowerSeg.includes('satisfactory'))) {
        const val = seg.split(']')[1]?.trim();
        this.metricAnalyses['testExecution'] = val;
        this.metricAnalyses['ejecución de pruebas'] = val;
      }
      if (lowerSeg.includes('pruebas satisfactorias') || lowerSeg.includes('pass rate') || lowerSeg.includes('satisfactorias')) {
        const val = seg.split(']')[1]?.trim();
        this.metricAnalyses['satisfactoryTests'] = val;
        this.metricAnalyses['pruebas satisfactorias'] = val;
      }
    });
  }

  formatAnalysisText(text: string, isMetric32: boolean = false): string {
    if (!text) return '';
    let formatted = text
      .replace(/\/UP/gi, '') // Remove any raw '/UP' or '/up' tags generated by AI or system
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
      
    if (isMetric32) {
      // Find the line/bullet containing "Resultado del periodo" and strip any negative sign before numbers
      const lines = formatted.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].toLowerCase().includes('resultado del periodo')) {
          lines[i] = lines[i].replace(/-(\d+(\.\d+)?%?)/g, '$1');
        }
      }
      formatted = lines.join('\n');
    }
      
    const headers = [
      'Meta establecida para el periodo',
      'Resultado del periodo',
      'Análisis de resultados',
      'Acciones correctivas',
      'Análisis acumulado del periodo',
      'Meta acumulada',
      'Resultado acumulado'
    ];
    
    headers.forEach(h => {
      const regex = new RegExp(`(-?\\s*|o\\s*)(${h})(:?)`, 'gi');
      formatted = formatted.replace(regex, '$1<strong>$2</strong>$3');
    });
    
    return formatted.replace(/\n/g, '<br>');
  }

  getTestExecutionAnalysis(): string {
    if (this.metricAnalyses['testExecution']) {
      return this.metricAnalyses['testExecution'];
    }
    return 'Genera el análisis IA para visualizar las recomendaciones.';
  }

  getSatisfactoryTestsAnalysis(): string {
    if (this.metricAnalyses['satisfactoryTests']) {
      return this.metricAnalyses['satisfactoryTests'];
    }
    return 'Genera el análisis IA para visualizar las recomendaciones.';
  }

  copyAnalysis(key: string, text: string) {
    if (!text || text === 'Genera el análisis IA para visualizar las recomendaciones.') return;
    navigator.clipboard.writeText(text).then(() => {
      this.copiedKeys[key] = true;
      setTimeout(() => {
        this.copiedKeys[key] = false;
      }, 2000);
    }).catch(err => {
      console.error('Error al copiar el texto: ', err);
    });
  }

  reloadSprintData() {
    if (!this.selectedIteration) return;
    localStorage.removeItem('cmmi5_ai_analysis_' + this.selectedIteration);
    this.aiAnalysis = '';
    this.metricAnalyses = {};
    this.selectedVersionNumber = null;
    this.loadData();
  }

  loadVersionsHistory() {
    if (!this.selectedIteration) return;
    this.isLoadingVersions = true;
    this.metricsApiService.getVersionsList(this.selectedIteration).subscribe(list => {
      this.analysisVersions = list;
      this.isLoadingVersions = false;
    });
  }

  onVersionChange() {
    if (!this.selectedIteration || !this.selectedVersionNumber) return;
    this.isReloading = true;
    this.metricsApiService.getSpecificVersion(this.selectedIteration, this.selectedVersionNumber).subscribe(dbRes => {
      if (dbRes) {
        this.aiAnalysis = dbRes.aiAnalysis;
        if (dbRes.metricAnalyses && Object.keys(dbRes.metricAnalyses).length > 0) {
          this.metricAnalyses = dbRes.metricAnalyses;
        } else {
          this.parseAnalysis(dbRes.aiAnalysis);
        }
        localStorage.setItem('cmmi5_ai_analysis_' + this.selectedIteration, dbRes.aiAnalysis);
        this.notificationService.success(`Versión v${dbRes.version} cargada del historial.`);
      }
      this.isReloading = false;
    });
  }

  restoreSelectedVersion(versionId: string) {
    if (!versionId) return;
    this.isReloading = true;
    this.metricsApiService.restoreVersion(versionId).subscribe(dbRes => {
      if (dbRes) {
        this.aiAnalysis = dbRes.aiAnalysis;
        if (dbRes.metricAnalyses && Object.keys(dbRes.metricAnalyses).length > 0) {
          this.metricAnalyses = dbRes.metricAnalyses;
        } else {
          this.parseAnalysis(dbRes.aiAnalysis);
        }
        this.selectedVersionNumber = dbRes.version;
        localStorage.setItem('cmmi5_ai_analysis_' + this.selectedIteration, dbRes.aiAnalysis);
        this.loadVersionsHistory();
        this.notificationService.success(`Versión v${dbRes.version} restablecida como activa.`);
      }
      this.isReloading = false;
    });
  }

  updateTestExecChart() {
    if (!this.testExecChartCanvas) return;

    if (this.testExecChart) {
      this.testExecChart.destroy();
      this.testExecChart = null;
    }

    const isDark = document.documentElement.classList.contains('dark');
    const textColor = isDark ? '#94a3b8' : '#64748b';
    const gridColor = isDark ? 'rgba(148,163,184,0.08)' : 'rgba(100,116,139,0.08)';

    const execData = this.metrics?.testExecution || {
      passed: 0,
      passedEnTiempo: 0,
      passedFueraDeTiempo: 0,
      failed: 0,
      blocked: 0,
      notExecuted: 0,
      notApplicable: 0
    };

    const total = (execData.passedEnTiempo || 0) + (execData.passedFueraDeTiempo || 0) + (execData.failed || 0) + (execData.blocked || 0) + (execData.notExecuted || 0) + (execData.notApplicable || 0);

    this.testExecChart = new Chart(this.testExecChartCanvas.nativeElement, {
      type: 'doughnut',
      data: {
        labels: ['Passed en Tiempo', 'Passed fuera de Tiempo', 'Failed', 'Blocked', 'Not Executed', 'N/A'],
        datasets: [
          {
            data: [
              execData.passedEnTiempo || 0,
              execData.passedFueraDeTiempo || 0,
              execData.failed || 0,
              execData.blocked || 0,
              execData.notExecuted || 0,
              execData.notApplicable || 0
            ],
            backgroundColor: [
              '#10b981',
              '#f43f5e',
              '#ef4444',
              '#f59e0b',
              '#64748b',
              '#cbd5e1'
            ],
            borderColor: isDark ? '#1e293b' : '#ffffff',
            borderWidth: 2,
            hoverOffset: 6
          }
        ]
      },
      options: {
        cutout: '70%',
        responsive: true,
        maintainAspectRatio: false,
        layout: { padding: { top: 8, bottom: 8, left: 8, right: 8 } },
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            enabled: true,
            backgroundColor: isDark ? '#0f172a' : '#f8fafc',
            titleColor: isDark ? '#f8fafc' : '#0f172a',
            bodyColor: isDark ? '#e2e8f0' : '#334155',
            borderColor: isDark ? '#334155' : '#cbd5e1',
            borderWidth: 1,
            callbacks: {
              label: (ctx: any) => {
                const val = ctx.parsed;
                const pct = total > 0 ? ((val / total) * 100).toFixed(1) : '0.0';
                return ` ${ctx.label}: ${val} (${pct}%)`;
              }
            }
          }
        }
      }
    });
  }

  /**
   * Retorna un array de días festivos en formato YYYY-MM-DD
   * Incluye días festivos colombianos
   */
  getHolidays(): string[] {
    const year = new Date().getFullYear();
    return [
      // Días festivos fijos en Colombia
      `${year}-01-01`, // Año Nuevo
      `${year}-01-08`, // Epifanía
      `${year}-03-29`, // Viernes Santo (ejemplo, variar según el año)
      `${year}-05-01`, // Día del Trabajo
      `${year}-06-10`, // Corpus Christi
      `${year}-06-17`, // Sagrado Corazón
      `${year}-07-01`, // San Pedro y San Pablo
      `${year}-07-04`, // Independencia
      `${year}-08-07`, // Batalla de Boyacá
      `${year}-08-15`, // Asunción
      `${year}-11-01`, // Todos los Santos
      `${year}-11-11`, // Independencia de Cartagena
      `${year}-12-08`, // Inmaculada Concepción
      `${year}-12-25`, // Navidad
    ];
  }

  /**
   * Calcula los días hábiles entre dos fechas, excluyendo sábados, domingos y días festivos
   * @param startDate - Fecha de inicio (timestamp)
   * @param endDate - Fecha de fin (timestamp)
   * @param holidays - Array de fechas festivas en formato YYYY-MM-DD
   * @returns Número de días hábiles
   */
  calculateBusinessDays(startDate: number, endDate: number, holidays: string[] = []): number {
    // If the item closed the same calendar day as dayAfterSprintEnd (same hours, different minutes),
    // still count it as 1 day late — it closed AFTER the sprint ended.
    if (startDate > endDate) return 0;

    const start = new Date(startDate);
    const end = new Date(endDate);

    // Normalizar fechas a medianoche
    const startNorm = new Date(start);
    startNorm.setHours(0, 0, 0, 0);
    const endNorm = new Date(end);
    endNorm.setHours(0, 0, 0, 0);

    // Crear set de días festivos para búsqueda rápida
    const holidaySet = new Set(holidays);

    // Si mismo día calendario pero el item SÍ está fuera (startDate < endDate en ms),
    // garantizar al menos 1 día hábil de retraso
    if (startNorm.getTime() === endNorm.getTime()) {
      const dayOfWeek = startNorm.getDay();
      const dateStr = startNorm.toISOString().split('T')[0];
      return (dayOfWeek !== 0 && dayOfWeek !== 6 && !holidaySet.has(dateStr)) ? 1 : 1;
    }

    let businessDays = 0;
    const currentDate = new Date(startNorm);

    while (currentDate <= endNorm) {
      const dayOfWeek = currentDate.getDay();
      const dateStr = currentDate.toISOString().split('T')[0]; // YYYY-MM-DD

      // Si no es sábado (6) ni domingo (0) y no es día festivo
      if (dayOfWeek !== 0 && dayOfWeek !== 6 && !holidaySet.has(dateStr)) {
        businessDays++;
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return Math.max(businessDays, 1); // Siempre al menos 1 si llegó hasta aquí
  }

  async export() {
    if (!this.metrics) return;
    this.isExporting = true;
    this.isLoading = true;

    try {
      // Capture charts as base64
      this.chartImages = {
        devRate: this.charts[0]?.toBase64Image() || '',
        effort: this.charts[1]?.toBase64Image() || '',
        defect: this.charts[2]?.toBase64Image() || '',
        escaped: this.escapedChart?.toBase64Image() || '',
        testExec: this.testExecChart?.toBase64Image() || '',
        satisfactoryTests: this.m38Chart?.toBase64Image() || ''
      };

      // Wait for template to update with images
      await new Promise(resolve => setTimeout(resolve, 500));

      await this.pdfService.exportToPdf('professional-report', `BFYPH047_Metricas_CMMI5_${this.selectedIterationName}`);
    } catch (error) {
      console.error('PDF Export failed', error);
      this.notificationService.error('Error al generar el PDF profesional.');
    } finally {
      this.isExporting = false;
      this.isLoading = false;
    }
  }

  // --- Chatbot virtual methods ---
  @ViewChild('chatScrollContainer') private chatScrollContainer!: ElementRef;

  chatOpen = false;
  chatMessages: Array<{ role: 'user' | 'assistant', content: string, timestamp: Date }> = [
    {
      role: 'assistant',
      content: '¡Hola! Soy tu Asistente CMMI 5. Puedes preguntarme cualquier cosa sobre la información que está en la vista del sprint actual (métricas, desviaciones, items de trabajo, bugs, probadores, etc.). ¿En qué puedo ayudarte hoy?',
      timestamp: new Date()
    }
  ];
  chatQuestion = '';
  chatLoading = false;

  toggleChat() {
    this.chatOpen = !this.chatOpen;
    if (this.chatOpen) {
      this.scrollToBottom();
    }
  }

  sendChatMessage() {
    if (!this.chatQuestion.trim() || this.chatLoading) return;

    const userText = this.chatQuestion.trim();
    this.chatQuestion = '';

    // Add user message to history
    this.chatMessages.push({
      role: 'user',
      content: userText,
      timestamp: new Date()
    });
    this.scrollToBottom();

    if (!this.metrics) {
      this.chatMessages.push({
        role: 'assistant',
        content: 'No hay datos cargados para analizar en este momento. Por favor, asegúrate de que el sprint tenga información.',
        timestamp: new Date()
      });
      this.scrollToBottom();
      return;
    }

    this.chatLoading = true;

    // Call AIService
    this.aiService.askAboutMetrics(
      this.metrics,
      userText,
      this.chatMessages.map(m => ({ role: m.role, content: m.content }))
    ).subscribe({
      next: (response) => {
        this.chatMessages.push({
          role: 'assistant',
          content: response,
          timestamp: new Date()
        });
        this.chatLoading = false;
        this.scrollToBottom();
      },
      error: (err) => {
        console.error('Chat AI Error:', err);
        this.chatMessages.push({
          role: 'assistant',
          content: 'Ocurrió un error al procesar tu pregunta. Por favor, intenta de nuevo.',
          timestamp: new Date()
        });
        this.chatLoading = false;
        this.scrollToBottom();
      }
    });
  }

  private scrollToBottom(): void {
    try {
      setTimeout(() => {
        if (this.chatScrollContainer) {
          this.chatScrollContainer.nativeElement.scrollTop = this.chatScrollContainer.nativeElement.scrollHeight;
        }
      }, 100);
    } catch (err) { }
  }
}
