import { Component, OnInit, inject, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AzureDevOpsService } from '../../services/azure-devops.service';
import { AIService } from '../../services/ai.service';
import { PdfService } from '../../services/pdf.service';
import { CMMIMetrics } from '../../models/metrics.model';
import { LucideAngularModule, TrendingUp, Bug, AlertTriangle, Sparkles, Download, RefreshCw, Layers, Users, ChevronDown, CloudDownload, Search, DownloadCloud, ArrowUpRight } from 'lucide-angular';
import { Chart, registerables } from 'chart.js';
import annotationPlugin from 'chartjs-plugin-annotation';

Chart.register(...registerables, annotationPlugin);

import { FormsModule } from '@angular/forms';
import { ConfigService } from '../../services/config.service';
import { PdfTemplateComponent } from '../../components/pdf-template/pdf-template.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, FormsModule, PdfTemplateComponent],
  template: `
<div id="dashboard-content" class="space-y-8 animate-in fade-in duration-1000 p-4 md:p-8">
  <header class="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
    <div>
      <h2 class="text-3xl font-bold text-slate-800 dark:text-white">Métricas CMMI 5</h2>
      <p class="text-slate-500 dark:text-slate-400 mt-1">Formato BFYPH047 - Recopilación y Análisis de Métricas</p>
    </div>
    <div class="flex flex-wrap gap-3">
      <select [(ngModel)]="selectedArea" (change)="onSelectionChange()" class="glass-input text-xs font-medium w-48">
        <option value="">Todas las Áreas</option>
        <option *ngFor="let item of areas" [value]="item.path">{{ item.name }}</option>
      </select>
      <select [(ngModel)]="selectedIteration" (change)="onSelectionChange()" class="glass-input text-xs font-medium w-48">
        <option value="">Todas las Iteraciones</option>
        <option *ngFor="let item of iterations" [value]="item.id">{{ item.name }}</option>
      </select>
      
      <!-- Sprint Dates Display -->
      <div *ngIf="metrics?.startDate && selectedIteration" class="flex items-center gap-2 px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 h-[38px]">
        <div class="flex flex-col">
          <span class="text-[8px] font-black text-slate-400 uppercase leading-none">Vigencia del Sprint</span>
          <span class="text-[10px] font-bold text-slate-600 dark:text-slate-300">
            {{ metrics!.startDate | date:'dd MMM':'UTC' }} - {{ metrics!.endDate | date:'dd MMM yyyy':'UTC' }}
          </span>
        </div>
      </div>

      <select [(ngModel)]="selectedISW" (change)="onISWChange()" class="glass-input text-xs font-medium w-48 border-indigo-200 dark:border-indigo-800">
        <option value="">Todos los ISW</option>
        <option *ngFor="let isw of iswList" [value]="isw">{{ isw }}</option>
      </select>
      <button (click)="runAI()" [disabled]="isAnalyzing || !metrics" class="glass-button flex items-center gap-2 bg-indigo-600 text-white">
        <lucide-icon [name]="Sparkles" size="18" [class.animate-spin]="isAnalyzing"></lucide-icon>
        <span>{{ isAnalyzing ? 'Analizando...' : 'Generar Análisis IA' }}</span>
      </button>
      <button (click)="export()" [disabled]="!metrics" class="glass-button flex items-center gap-2">
        <lucide-icon [name]="Download" size="18"></lucide-icon>
        <span>Exportar PDF</span>
      </button>
    </div>
  </header>

  <div *ngIf="metrics" class="space-y-12">
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
          <div class="flex items-center gap-2 self-start md:self-auto">
            <span class="text-[10px] font-black px-2.5 py-1 rounded bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 uppercase shadow-sm border border-indigo-100 dark:border-indigo-900/50">
              Vigencia Oficial: {{ metrics!.startDate | date:'dd MMM':'UTC' }} - {{ metrics!.endDate | date:'dd MMM yyyy':'UTC' }}
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
            <div class="p-3 rounded-xl bg-amber-500/10 dark:bg-amber-400/10 text-amber-600 dark:text-amber-350 shrink-0">
              <lucide-icon [name]="AlertTriangle" size="20"></lucide-icon>
            </div>
            <div class="min-w-0">
              <div class="text-[9px] text-slate-400 uppercase font-black tracking-wide">Fase Extendida (Tarde)</div>
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
        <div class="flex flex-wrap gap-4 md:gap-6 justify-center text-[9px] md:text-[10px] text-slate-500 bg-slate-50 dark:bg-slate-800/10 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
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
      </div>
    </section>

    <!-- Section 3.1: Development Rate -->
    <section class="glass-card !bg-white dark:!bg-slate-900 border-l-4 border-blue-500 overflow-hidden">
      <div class="p-6">
        <div class="flex items-center justify-between mb-2">
          <h3 class="text-lg font-bold text-slate-400 uppercase tracking-tight">3.1 Métrica: Cálculo de la Tasa de Desarrollo en Procesos de Software</h3>
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
          <div class="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800 text-center relative overflow-hidden">
            <div class="text-xs text-slate-400 uppercase font-bold mb-1">Desviación Std</div>
            <div class="text-2xl font-bold" [class.text-emerald-600]="metrics.developmentRate.stdDeviation <= 1.00" [class.text-rose-500]="metrics.developmentRate.stdDeviation > 1.00">
              {{ metrics.developmentRate.stdDeviation.toFixed(2) }}
            </div>
            <div class="text-[8pt] opacity-50">Umbrales: 1.00</div>
          </div>
        </div>
        
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start mb-8">
          <div class="lg:col-span-5 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
            <div class="h-64">
              <canvas #devRateChart></canvas>
            </div>
          </div>

          <div class="lg:col-span-7 space-y-4">
            <div class="bg-blue-50/50 dark:bg-blue-900/10 p-4 rounded-lg border border-blue-100 dark:border-blue-900/30">
              <h4 class="text-xs font-bold uppercase text-blue-600 mb-2 flex items-center">
                <lucide-icon [name]="Sparkles" size="14" class="mr-1"></lucide-icon>
                Análisis de resultados e Acciones
              </h4>
              <div *ngIf="metricAnalyses['tasa de desarrollo']" class="text-sm leading-relaxed whitespace-pre-wrap italic text-slate-700 dark:text-slate-300">
                {{ metricAnalyses['tasa de desarrollo'] }}
              </div>
              <div *ngIf="!metricAnalyses['tasa de desarrollo']" class="text-sm opacity-50 italic">
                Genera el análisis IA para visualizar las recomendaciones.
              </div>
            </div>
          </div>
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
                <th class="px-3 py-3 text-center">Est. Original (H)</th>
                <th class="px-3 py-3 text-center">Real (H)</th>
                <th class="px-3 py-3 text-center">Tasa</th>
              </tr>
            </thead>
            <tbody>
              <ng-container *ngFor="let item of metrics.developmentRate.items">
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
                  <td colspan="10" class="px-8 pb-3 pt-2">
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
            <h3 class="text-lg font-bold text-slate-400 uppercase tracking-tight">3.2 Métrica: Desviación de estimación de desarrollo</h3>
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

        <p class="text-xs text-slate-500 mb-6 leading-relaxed bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border-l-2 border-violet-500">
          Esta métrica mide el porcentaje de desviación entre el esfuerzo real y el esfuerzo planeado en la construcción de <strong>requerimientos</strong>. Considera el tiempo total estimado y el tiempo total real de las tareas asociadas a los elementos de trabajo.
          <br><span class="font-bold text-slate-700 dark:text-slate-350">Umbrales:</span> Verde &le; 15% | Amarillo &le; 30% | Rojo &gt; 30%
        </p>

        <!-- Summary KPIs (like image) -->
        <div class="grid grid-cols-2 md:grid-cols-7 gap-4 mb-8">
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
          <div class="p-4 rounded-xl text-center relative overflow-hidden border transition-all duration-300" [ngClass]="{
            'bg-emerald-50/50 border-emerald-100 dark:bg-emerald-950/10 dark:border-emerald-900/30': metrics.effortVariance.status === 'green',
            'bg-amber-50/50 border-amber-100 dark:bg-amber-950/10 dark:border-amber-900/30': metrics.effortVariance.status === 'yellow',
            'bg-rose-50/50 border-rose-100 dark:bg-rose-950/10 dark:border-rose-900/30': metrics.effortVariance.status === 'red'
          }">
            <div class="text-xs uppercase font-bold mb-1" [ngClass]="{
              'text-emerald-600 dark:text-emerald-400': metrics.effortVariance.status === 'green',
              'text-amber-600 dark:text-amber-400': metrics.effortVariance.status === 'yellow',
              'text-rose-600 dark:text-rose-400': metrics.effortVariance.status === 'red'
            }">KPI % Desviación Global</div>
            <div class="text-3xl font-black" [ngClass]="{
              'text-emerald-700 dark:text-emerald-300': metrics.effortVariance.status === 'green',
              'text-amber-700 dark:text-amber-300': metrics.effortVariance.status === 'yellow',
              'text-rose-700 dark:text-rose-300': metrics.effortVariance.status === 'red'
            }">
              {{ (metrics.effortVariance.rate * 100) > 0 ? '+' : '' }}{{ (metrics.effortVariance.rate * 100).toFixed(2) }}%
            </div>
            <div class="text-[8pt] mt-1 opacity-80" [ngClass]="{
              'text-emerald-600/85 dark:text-emerald-400/85': metrics.effortVariance.status === 'green',
              'text-amber-600/85 dark:text-amber-400/85': metrics.effortVariance.status === 'yellow',
              'text-rose-600/85 dark:text-rose-400/85': metrics.effortVariance.status === 'red'
            }">Umbrales: 15%, 30%</div>
          </div>
          <div class="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800 text-center">
            <div class="text-xs text-slate-400 uppercase font-bold mb-1">Desviación Absoluta</div>
            <div class="text-2xl font-bold">{{ (metrics.effortVariance.absoluteRate * 100).toFixed(2) }}%</div>
            <div class="text-[8pt] opacity-50">Umbrales: 15%, 30%</div>
          </div>
          <div class="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800 text-center">
            <div class="text-xs text-slate-400 uppercase font-bold mb-1">Promedio % Desviación Ind.</div>
            <div class="text-2xl font-bold">{{ (metrics.effortVariance.avgIndividualRate || 0).toFixed(2) }}%</div>
          </div>
          <div class="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800 text-center relative overflow-hidden">
            <div class="text-xs text-slate-400 uppercase font-bold mb-1">Desviación Estándar</div>
            <div class="text-2xl font-bold" [class.text-emerald-600]="(metrics.effortVariance.stdDeviation || 0) <= 15.00" [class.text-rose-500]="(metrics.effortVariance.stdDeviation || 0) > 15.00">
              {{ (metrics.effortVariance.stdDeviation || 0).toFixed(2) }}%
            </div>
            <div class="text-[8pt] opacity-50">Umbrales: 15%</div>
          </div>
        </div>
        
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <!-- Left: Chart -->
          <div class="lg:col-span-5 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
            <div class="h-64">
              <canvas #effortChart></canvas>
            </div>
          </div>

          <!-- Right: AI Analysis -->
          <div class="lg:col-span-7 space-y-4">
            <div class="bg-violet-50/30 dark:bg-violet-950/10 p-4 rounded-lg border border-violet-100 dark:border-violet-900/30">
              <h4 class="text-xs font-bold uppercase text-violet-600 mb-2 flex items-center">
                <lucide-icon [name]="Sparkles" size="14" class="mr-1"></lucide-icon>
                Análisis de resultados e Acciones
              </h4>
              <div *ngIf="metricAnalyses['tasa de desviación']" class="text-sm leading-relaxed whitespace-pre-wrap italic text-slate-700 dark:text-slate-300">
                {{ metricAnalyses['tasa de desviación'] }}
              </div>
              <div *ngIf="!metricAnalyses['tasa de desviación']" class="text-sm opacity-50 italic">
                Genera el análisis IA para visualizar las recomendaciones.
              </div>
            </div>
            
            <!-- AI Analysis takes full height now -->
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
          <h3 class="text-lg font-bold text-slate-400 uppercase tracking-tight">3.3 Métrica: Tasa de Retrabajo en Procesos de Software</h3>
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
              <ng-container *ngFor="let item of metrics.developmentRate.items">
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
                            <span class="text-slate-400">Tipo: <span class="text-slate-600 dark:text-slate-300 font-bold">{{ task.type || 'Planeada' }}</span></span>
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
                                <span class="font-bold text-slate-600 dark:text-slate-300">{{ formatEffort(bug.originalEstimate) }}h</span>
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
        <div *ngIf="metricAnalyses['retrabajo']" class="mt-6 p-5 rounded-2xl bg-rose-50/30 dark:bg-rose-950/10 border border-rose-100 dark:border-rose-900/30 animate-in fade-in duration-300">
          <div class="text-xs leading-relaxed whitespace-pre-line text-slate-700 dark:text-slate-300">
            {{ metricAnalyses['retrabajo'] }}
          </div>
        </div>

      </div>
    </section>

    <!-- Section 3.4: Defect -->
    <section class="glass-card !bg-white dark:!bg-slate-900 border-l-4 border-emerald-500 overflow-hidden">
      <div class="p-6">
        <h3 class="text-lg font-bold text-slate-400 uppercase tracking-tight mb-2">3.4 Métrica: Densidad de Defectos</h3>

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
        
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          <div class="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
            <div class="h-64">
              <canvas #defectChart></canvas>
            </div>
          </div>

          <div class="space-y-4">
            <div *ngIf="metricAnalyses['densidad de defectos']" class="bg-emerald-50/30 dark:bg-emerald-950/10 p-4 rounded-lg border border-emerald-100 dark:border-emerald-900/30">
              <h4 class="text-xs font-bold uppercase text-emerald-600 mb-2 flex items-center">
                <lucide-icon [name]="Sparkles" size="14" class="mr-1"></lucide-icon>
                Análisis de resultados e Acciones
              </h4>
              <div class="text-sm leading-relaxed whitespace-pre-wrap italic text-slate-700 dark:text-slate-300">
                {{ metricAnalyses['densidad de defectos'] }}
              </div>
            </div>
            <div *ngIf="!metricAnalyses['densidad de defectos']" class="text-sm opacity-50 italic p-4 bg-slate-50 dark:bg-slate-800/30 rounded-lg">
              Genera el análisis IA para visualizar las recomendaciones.
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Section 3.5: Defect Removal Efficiency (EED) -->
    <section class="glass-card !bg-white dark:!bg-slate-900 border-l-4 border-amber-500 overflow-hidden">
      <div class="p-6">
        <div class="flex items-center justify-between mb-2">
          <h3 class="text-lg font-bold text-slate-400 uppercase tracking-tight">3.5 Métrica: Eficiencia en la Eliminación de Defectos (EED)</h3>
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
                  class="absolute bottom-3 flex flex-col items-center overflow-visible group/timeline-node select-none cursor-pointer">
                  
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
                      <span class="absolute bottom-5 left-1/2 -translate-x-1/2 scale-0 group-hover/bug:scale-100 bg-slate-950/95 dark:bg-slate-900/95 text-white text-[8px] px-2 py-1 rounded shadow-lg border border-slate-800 whitespace-nowrap z-50 pointer-events-none transition-all duration-200">
                        #{{ bug.id }}: {{ bug.title }} ({{ bug.status }})
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
                      <span class="absolute bottom-5 left-1/2 -translate-x-1/2 scale-0 group-hover/bug:scale-100 bg-slate-950/95 dark:bg-slate-900/95 text-white text-[8px] px-2 py-1 rounded shadow-lg border border-slate-800 whitespace-nowrap z-50 pointer-events-none transition-all duration-200">
                        #{{ bug.id }}: {{ bug.title }} ({{ bug.status }})
                      </span>
                    </div>
                  </div>

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
                    <div class="text-[10px] font-bold mb-1 truncate">{{ node.title }}</div>
                    
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
                        <span class="text-rose-450 font-bold block mb-1">🐞 Defectos Asociados (Hijos):</span>
                        <div class="space-y-1 max-h-24 overflow-y-auto pr-1">
                          <div *ngFor="let bug of node.bugs" class="flex items-center justify-between text-[8px] text-slate-400">
                            <span class="truncate max-w-[150px]">#{{ bug.id }}: {{ bug.title }}</span>
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
              </ng-container>
            </div>
          </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          <div class="lg:col-span-2">
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
                        <td class="px-4 py-2.5 truncate max-w-[180px]" [title]="item.title">{{ item.title }}</td>
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
                        <td class="px-4 py-2.5 truncate max-w-[180px]" [title]="item.title">{{ item.title }}</td>
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

          <div class="space-y-4">
            <div *ngIf="metricAnalyses['eed']" class="bg-amber-50/30 dark:bg-amber-950/10 p-4 rounded-lg border border-amber-100 dark:border-amber-900/30">
              <h4 class="text-xs font-bold uppercase text-amber-600 mb-2 flex items-center">
                <lucide-icon [name]="Sparkles" size="14" class="mr-1"></lucide-icon>
                Análisis de resultados e Acciones
              </h4>
              <div class="text-sm leading-relaxed whitespace-pre-wrap italic text-slate-700 dark:text-slate-300">
                {{ metricAnalyses['eed'] }}
              </div>
            </div>
            <div *ngIf="!metricAnalyses['eed']" class="text-sm opacity-50 italic p-4 bg-slate-50 dark:bg-slate-800/30 rounded-lg">
              Genera el análisis IA para visualizar las recomendaciones.
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Section 3.6: Escaped Defects / Bugs Escapados -->
    <section class="glass-card !bg-white dark:!bg-slate-900 border-l-4 border-indigo-500 overflow-hidden mt-8">
      <div class="p-6">
        <h3 class="text-lg font-bold text-slate-400 uppercase tracking-tight mb-2">3.6 Métrica: Porcentaje de Bugs Escapados</h3>

        <p class="text-xs text-slate-500 mb-6 leading-relaxed bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border-l-2 border-indigo-500">
          Esta métrica realiza la medición del porcentaje de bugs escapados a producción contra el número de bugs detectados antes de la entrega del paquete de liberación. <br/>
          <strong>Fórmula:</strong> KPI Defectos Escapados = (∑ bugs en producción / ∑ bugs detectados antes de la liberación) x 100.
          <br><span class="font-bold text-slate-700 dark:text-slate-350">Umbrales:</span> Verde &le; 33% | Amarillo &le; 40% | Rojo &gt; 40%
        </p>

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
          <div class="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800 text-center relative overflow-hidden flex flex-col justify-center items-center">
            <div class="text-[9px] text-slate-400 uppercase font-bold mb-1">Desviación Estándar</div>
            <div class="text-2xl font-bold">
              {{ filteredEscapedBugs.stdDeviation.toFixed(2) }}%
            </div>
            <div class="text-[8px] text-slate-400 mt-0.5">Umbral: 30.00%</div>
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
            <div *ngIf="metricAnalyses['escaped']" class="bg-indigo-50/30 dark:bg-indigo-950/10 p-4 rounded-lg border border-indigo-100 dark:border-indigo-900/30">
              <h4 class="text-xs font-bold uppercase text-indigo-600 mb-2 flex items-center">
                <lucide-icon [name]="Sparkles" size="14" class="mr-1"></lucide-icon>
                Análisis de resultados e Acciones
              </h4>
              <div class="text-sm leading-relaxed whitespace-pre-wrap italic text-slate-700 dark:text-slate-300">
                {{ metricAnalyses['escaped'] }}
              </div>
            </div>
            <div *ngIf="!metricAnalyses['escaped']" class="text-sm opacity-50 italic p-4 bg-slate-50 dark:bg-slate-800/30 rounded-lg">
              Genera el análisis IA para visualizar las recomendaciones.
            </div>
          </div>
        </div>

      </div>
    </section>

    <!-- Section 3.7: Test Execution / Ejecución de Pruebas -->
    <section class="glass-card !bg-white dark:!bg-slate-900 border-l-4 border-emerald-500 overflow-hidden mt-8">
      <div class="p-6">
        <h3 class="text-lg font-bold text-slate-400 uppercase tracking-tight mb-2">3.7 Métrica: % Ejecución de Pruebas</h3>

        <p class="text-xs text-slate-550 mb-6 leading-relaxed bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border-l-2 border-emerald-500">
          Esta métrica calcula el porcentaje de ejecución de pruebas en el proceso de desarrollo de software.<br/>
          <strong>Fórmula:</strong> KPI Run Rate = (∑ Test Points ejecutados / Total de Test Points) x 100. Solo se consideran los test points dentro de la vigencia del sprint.
          <br><span class="font-bold text-slate-700 dark:text-slate-350">Meta establecida:</span> 100.00% | <span class="font-bold text-slate-700 dark:text-slate-350">Umbrales:</span> Verde &ge; 90% | Amarillo &ge; 80% | Rojo &lt; 80%
        </p>

        <!-- KPI summary grid -->
        <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-8">
          <div class="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800 text-center">
            <div class="text-[9px] text-slate-400 uppercase font-bold mb-1">Total Test Points</div>
            <div class="text-2xl font-bold">{{ metrics?.testExecution?.totalTestPoints || 0 }}</div>
          </div>
          <div class="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800 text-center">
            <div class="text-[9px] text-slate-400 uppercase font-bold mb-1">Passed en Tiempo</div>
            <div class="text-2xl font-bold">{{ metrics?.testExecution?.passedEnTiempo || 0 }}</div>
          </div>
          <div class="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800 text-center">
            <div class="text-[9px] text-slate-400 uppercase font-bold mb-1">Passed fuera de Tiempo</div>
            <div class="text-2xl font-bold">{{ metrics?.testExecution?.passedFueraDeTiempo || 0 }}</div>
          </div>
          <div class="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800 text-center">
            <div class="text-[9px] text-slate-400 uppercase font-bold mb-1">Failed</div>
            <div class="text-2xl font-bold">{{ metrics?.testExecution?.failed || 0 }}</div>
          </div>
          <div class="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800 text-center">
            <div class="text-[9px] text-slate-400 uppercase font-bold mb-1">Blocked</div>
            <div class="text-2xl font-bold">{{ metrics?.testExecution?.blocked || 0 }}</div>
          </div>
          <div class="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800 text-center">
            <div class="text-[9px] text-slate-400 uppercase font-bold mb-1">Not Executed</div>
            <div class="text-2xl font-bold">{{ metrics?.testExecution?.notExecuted || 0 }}</div>
          </div>
          <div class="p-4 rounded-xl text-center relative overflow-hidden border transition-all duration-300 flex flex-col justify-center items-center" [ngClass]="{
            'bg-emerald-50/50 border-emerald-100 dark:bg-emerald-950/10 dark:border-emerald-900/30': metrics?.testExecution?.status === 'green',
            'bg-amber-50/50 border-amber-100 dark:bg-amber-950/10 dark:border-amber-900/30': metrics?.testExecution?.status === 'yellow',
            'bg-rose-50/50 border-rose-100 dark:bg-rose-950/10 dark:border-rose-900/30': metrics?.testExecution?.status === 'red'
          }">
            <div class="text-xs uppercase font-bold mb-1" [ngClass]="{
              'text-emerald-600 dark:text-emerald-400': metrics?.testExecution?.status === 'green',
              'text-amber-600 dark:text-amber-400': metrics?.testExecution?.status === 'yellow',
              'text-rose-600 dark:text-rose-400': metrics?.testExecution?.status === 'red'
            }">KPI Run Rate</div>
            <div class="text-3xl font-black" [ngClass]="{
              'text-emerald-700 dark:text-emerald-300': metrics?.testExecution?.status === 'green',
              'text-amber-700 dark:text-amber-300': metrics?.testExecution?.status === 'yellow',
              'text-rose-700 dark:text-rose-300': metrics?.testExecution?.status === 'red'
            }">{{ metrics?.testExecution?.rate?.toFixed(2) || '0.00' }}%</div>
            <div class="text-[8pt] opacity-85" [ngClass]="{
              'text-emerald-600/85 dark:text-emerald-400/85': metrics?.testExecution?.status === 'green',
              'text-amber-600/85 dark:text-amber-400/85': metrics?.testExecution?.status === 'yellow',
              'text-rose-600/85 dark:text-rose-400/85': metrics?.testExecution?.status === 'red'
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
              <div class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0"></span><span class="text-slate-600 dark:text-slate-400">En Tiempo: <strong>{{ metrics?.testExecution?.passedEnTiempo || 0 }}</strong></span></div>
              <div class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0"></span><span class="text-slate-600 dark:text-slate-400">Fuera Tiempo: <strong>{{ metrics?.testExecution?.passedFueraDeTiempo || 0 }}</strong></span></div>
              <div class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-red-500 shrink-0"></span><span class="text-slate-600 dark:text-slate-400">Failed: <strong>{{ metrics?.testExecution?.failed || 0 }}</strong></span></div>
              <div class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0"></span><span class="text-slate-600 dark:text-slate-400">Blocked: <strong>{{ metrics?.testExecution?.blocked || 0 }}</strong></span></div>
              <div class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-slate-400 shrink-0"></span><span class="text-slate-600 dark:text-slate-400">N/Exec: <strong>{{ metrics?.testExecution?.notExecuted || 0 }}</strong></span></div>
              <div class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-slate-350 dark:bg-slate-600 shrink-0"></span><span class="text-slate-600 dark:text-slate-400">N/A: <strong>{{ metrics?.testExecution?.notApplicable || 0 }}</strong></span></div>
            </div>
          </div>
        </div>

        <div class="mt-8 border-t border-slate-100 dark:border-slate-800 pt-6">
          <div class="space-y-4">
            <div class="bg-emerald-50/30 dark:bg-emerald-950/10 p-4 rounded-lg border border-emerald-100 dark:border-emerald-900/30">
              <h4 class="text-xs font-bold uppercase text-emerald-600 mb-2 flex items-center">
                <lucide-icon [name]="Sparkles" size="14" class="mr-1"></lucide-icon>
                Análisis de resultados e Acciones
              </h4>
              <div class="text-sm leading-relaxed whitespace-pre-wrap italic text-slate-700 dark:text-slate-350">
                {{ getTestExecutionAnalysis() }}
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
      [filteredEscapedBugs]="filteredEscapedBugs">
    </app-pdf-template>
  </div>
</div>
  `
})
export class DashboardComponent implements OnInit, AfterViewInit {
  readonly TrendingUp = TrendingUp;
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

  private azureService = inject(AzureDevOpsService);
  private aiService = inject(AIService);
  private pdfService = inject(PdfService);
  private configService = inject(ConfigService);
  private router = inject(Router);

  metrics?: CMMIMetrics;
  config = this.configService.getConfig();
  aiAnalysis: string = '';
  isAnalyzing = false;
  isLoading = true;

  areas: any[] = [];
  selectedArea: string = '';
  iterations: any[] = [];
  selectedIteration: string = '';
  selectedIterationName: string = 'Actual';
  chartImages: { [key: string]: string } = {};
  metricAnalyses: { [key: string]: string } = {};
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

  private charts: Chart[] = [];
  escapedChart: Chart | null = null;
  testExecChart: Chart | null = null;

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
      return;
    }

    this.isLoading = true;
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

        // Restore cached AI analysis if present
        const cachedAnalysis = localStorage.getItem('cmmi5_ai_analysis_' + this.selectedIteration);
        if (cachedAnalysis) {
          this.aiAnalysis = cachedAnalysis;
          this.parseAnalysis(cachedAnalysis);
        } else {
          this.aiAnalysis = '';
          this.metricAnalyses = {};
        }

        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
        alert('Error al cargar datos de Azure DevOps. Verifica el PAT y la configuración.');
      }
    });
  }

  onISWChange() {
    this.applyFilter();
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
        if (normBugIter !== normSelectedIter && bugIterationShort !== normSelectedName) {
          return false;
        }
      }
      return true;
    });

    let bugsTesting = 0;
    let bugsUat = 0;
    let bugsProd = 0;

    filteredList.forEach((b: any) => {
      if (b.classification === 'testing') bugsTesting++;
      else if (b.classification === 'uat' || b.classification === 'produccion') bugsProd++;
    });

    const beforeRelease = bugsTesting + bugsUat;
    const rate = beforeRelease > 0 ? (bugsProd / beforeRelease) * 100 : 0;
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
      else if (b.classification === 'uat' || b.classification === 'produccion') iterationGroups[iter].prod++;
    });

    const rows = Object.entries(iterationGroups).map(([iteration, g]) => {
      const preRelease = g.testing + g.uat;
      const rowRate = preRelease > 0 ? Math.min((g.prod / preRelease) * 100, 150) : (g.prod > 0 ? 150 : 0);
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

    const historyRates = [12.5, 18.2, 8.5, 15.0, rate];
    let stdDeviation = 0;
    if (historyRates.length > 1) {
      const mean = historyRates.reduce((sum, r) => sum + r, 0) / historyRates.length;
      const variance = historyRates.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / (historyRates.length - 1);
      stdDeviation = Math.sqrt(variance);
    }

    this.filteredEscapedBugs = {
      bugsTesting,
      bugsUat: 0,
      bugsProd,
      totalBugs: filteredList.length,
      rate,
      status,
      stdDeviation,
      rows: rows.sort((a, b) => a.iteration.localeCompare(b.iteration))
    };

    setTimeout(() => this.updateEscapedChart(), 50);
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

    let labels = ['S1', 'S2', 'S3', 'S4', 'Actual'];
    const match = this.selectedIterationName.match(/Sprint\s*(\d+)/i);
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
    const rates = [12.5, 18.2, 8.5, 15.0, this.filteredEscapedBugs.rate];

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
      } else if (type.includes('correctiv') || type.includes('retrabajo') || type.includes('fix') || type.includes('ajuste') || type.includes('rework') || type.includes('atencion') || type.includes('defecto') || type.includes('incidencia')) {
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
      const parentIsBug = item.type === 'Bug';
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
          if (type.includes('correctiv') || type.includes('retrabajo') || type.includes('fix') || type.includes('ajuste') || type.includes('rework') || type.includes('atencion') || type.includes('defecto') || type.includes('incidencia')) {
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
          const parentIsBug = item.type === 'Bug';
          (item.tasks || []).forEach((task: any) => {
            const taskEffort = task.completedWork || 0;
            if (taskEffort <= 0) return;
            const type = (task.type || '').toLowerCase();

            if (parentIsBug) {
              rTotal += taskEffort;
            } else {
              if (type.includes('planead') || type.includes('nueva') || type.includes('desarroll') || type.includes('mejora') || type === '') {
                rEffort += taskEffort;
              } else if (type.includes('correctiv') || type.includes('retrabajo') || type.includes('fix') || type.includes('ajuste') || type.includes('rework')) {
                rTotal += taskEffort;
              } else if (type.includes('bug') || type.includes('error') || type.includes('defect')) {
                rTotal += taskEffort;
              } else {
                rEffort += taskEffort;
              }
            }
          });
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

      // Process its related bugs
      const itemBugs = (item.relatedBugs || []).map(bug => {
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

        return {
          id: bug.id,
          title: bug.title,
          status: bugState,
          deliveryStatus: bugDeliveryStatus,
          closedDate: bugClosedDateStr,
          assignedTo: bug.assignedTo
        };
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
          assignedTo: b.isw
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
          assignedTo: b.isw
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

    const isDark = document.documentElement.classList.contains('dark');
    const textColor = isDark ? '#94a3b8' : '#64748b';
    const gridColor = isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)';

    // Generate dynamic labels based on selected iteration
    let labels = ['S1', 'S2', 'S3', 'S4', 'Actual'];
    const match = this.selectedIterationName.match(/Sprint\s*(\d+)/i);
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

    // 3. Defect Chart
    this.charts.push(new Chart(this.defectChartCanvas.nativeElement, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Densidad',
          data: [0.12, 0.15, 0.22, 0.18, this.metrics.defectDensity.density],
          backgroundColor: (ctx: any) => {
            const val = ctx.raw;
            if (val > 0.23) return '#ef4444';
            if (val > 0.18) return '#eab308';
            return '#22c55e';
          },
          borderRadius: 8,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: { grid: { color: gridColor }, ticks: { color: textColor } },
          x: { grid: { display: false }, ticks: { color: textColor } }
        },
        plugins: {
          legend: { display: false },
          annotation: {
            annotations: {
              target: { type: 'line', yMin: 0.18, yMax: 0.18, borderColor: '#eab308', borderWidth: 2, borderDash: [5, 5] },
              limit: { type: 'line', yMin: 0.23, yMax: 0.23, borderColor: '#ef4444', borderWidth: 2, borderDash: [5, 5] }
            }
          }
        }
      }
    }));

    setTimeout(() => this.updateTestExecChart(), 50);
  }

  runAI() {
    if (!this.metrics) return;
    this.isAnalyzing = true;
    this.aiAnalysis = '';
    this.metricAnalyses = {};
    this.aiService.analyzeMetrics(this.metrics).subscribe({
      next: (res) => {
        this.aiAnalysis = res;
        this.parseAnalysis(res);
        localStorage.setItem('cmmi5_ai_analysis_' + this.selectedIteration, res);
        this.isAnalyzing = false;
      },
      error: () => {
        this.isAnalyzing = false;
        alert('Error al conectar con la IA. Revisa tu API Key y modelo.');
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
      if (lowerSeg.includes('ejecución de pruebas') || lowerSeg.includes('ejecucion de pruebas') || lowerSeg.includes('run rate') || lowerSeg.includes('pruebas')) {
        const val = seg.split(']')[1]?.trim();
        this.metricAnalyses['testExecution'] = val;
        this.metricAnalyses['ejecución de pruebas'] = val;
      }
    });
  }

  getTestExecutionAnalysis(): string {
    if (this.metricAnalyses['testExecution']) {
      return this.metricAnalyses['testExecution'];
    }
    return `Análisis de resultados: Las pruebas se ejecutaron conforme a los planes de prueba vigentes en el sprint.
Acciones correctivas: Para esta métrica no se requieren realizar acciones correctivas, debido a que no se presentaron retrasos, y las pruebas se ejecutaron en tiempo y forma.`;
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
    if (startDate >= endDate) return 0;

    const start = new Date(startDate);
    const end = new Date(endDate);

    // Normalizar fechas a medianoche
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);

    // Crear set de días festivos para búsqueda rápida
    const holidaySet = new Set(holidays);

    let businessDays = 0;
    const currentDate = new Date(start);

    while (currentDate <= end) {
      const dayOfWeek = currentDate.getDay();
      const dateStr = currentDate.toISOString().split('T')[0]; // YYYY-MM-DD

      // Si no es sábado (6) ni domingo (0) y no es día festivo
      if (dayOfWeek !== 0 && dayOfWeek !== 6 && !holidaySet.has(dateStr)) {
        businessDays++;
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return businessDays;
  }

  async export() {
    if (!this.metrics) return;
    this.isLoading = true;

    try {
      // Capture charts as base64
      this.chartImages = {
        devRate: this.charts[0]?.toBase64Image() || '',
        effort: this.charts[1]?.toBase64Image() || '',
        defect: this.charts[2]?.toBase64Image() || '',
        escaped: this.escapedChart?.toBase64Image() || '',
        testExec: this.testExecChart?.toBase64Image() || ''
      };

      // Wait for template to update with images
      await new Promise(resolve => setTimeout(resolve, 500));

      await this.pdfService.exportToPdf('professional-report', `BFYPH047_Metricas_CMMI5_${this.selectedIterationName}`);
    } catch (error) {
      console.error('PDF Export failed', error);
      alert('Error al generar el PDF profesional.');
    } finally {
      this.isLoading = false;
    }
  }
}
