import { Component, OnInit, inject, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AzureDevOpsService } from '../../services/azure-devops.service';
import { AIService } from '../../services/ai.service';
import { PdfService } from '../../services/pdf.service';
import { CMMIMetrics } from '../../models/metrics.model';
import { LucideAngularModule, TrendingUp, Bug, AlertTriangle, Sparkles, Download, RefreshCw, Layers, Users, ChevronDown } from 'lucide-angular';
import { Chart, registerables } from 'chart.js';
import annotationPlugin from 'chartjs-plugin-annotation';

Chart.register(...registerables, annotationPlugin);

import { FormsModule } from '@angular/forms';
import { PdfTemplateComponent } from '../../components/pdf-template/pdf-template.component';
import { ConfigService } from '../../services/config.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, FormsModule, PdfTemplateComponent],
  template: `
<div id="dashboard-content" class="space-y-8 animate-in fade-in duration-1000 p-4 md:p-8">
  <header class="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
    <div>
      <h2 class="text-3xl font-bold text-slate-800 dark:text-white">Panel de Métricas CMMI 5</h2>
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
    <section class="glass-card !bg-white dark:!bg-slate-900 border-l-4 border-indigo-600 overflow-hidden shadow-lg animate-in fade-in duration-500">
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
                {{ timelineSummary.lateCount }} 
                <span class="text-xs font-medium text-slate-400 dark:text-slate-500"> (+{{ timelineSummary.avgLateDays }}d prom)</span>
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
        <div class="relative pt-36 pb-16 px-4 bg-slate-50 dark:bg-slate-800/20 rounded-3xl border border-slate-100 dark:border-slate-800 mb-6 overflow-hidden">
          
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
                [style.transform]="'translate(-50%, ' + (item.verticalTier * -28) + 'px)'"
                class="absolute group/marker flex flex-col items-center z-10 select-none cursor-pointer transition-all duration-300">
                
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
                    
                    <div class="pt-1 mt-1 border-t border-slate-800/50 flex items-center justify-between">
                      <span class="text-slate-500 font-bold">Entrega:</span>
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
                <span class="text-[8px] font-bold text-slate-500 dark:text-slate-400 mt-1 select-none pointer-events-none bg-white dark:bg-slate-800 px-1 rounded border border-slate-100 dark:border-slate-700 shadow-sm">
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
        <div class="flex items-center justify-between mb-6">
          <h3 class="text-lg font-bold text-slate-400 uppercase tracking-tight">3.1 Métrica: Cálculo de la Tasa de Desarrollo en Procesos de Software</h3>
          <div class="px-3 py-1 rounded-full text-xs font-bold uppercase" [ngClass]="{
            'bg-green-100 text-green-700': metrics.developmentRate.status === 'green',
            'bg-yellow-100 text-yellow-700': metrics.developmentRate.status === 'yellow',
            'bg-red-100 text-red-700': metrics.developmentRate.status === 'red'
          }">
            {{ metrics.developmentRate.status }}
          </div>
        </div>

        <!-- Summary KPIs -->
        <div class="grid grid-cols-2 md:grid-cols-6 gap-4 mb-8">
          <div class="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800 text-center">
            <div class="text-xs text-slate-400 uppercase font-bold mb-1">Total Ítems</div>
            <div class="text-2xl font-bold">{{ metrics.developmentRate.totalItems }}</div>
          </div>
          <div class="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800 text-center">
            <div class="text-xs text-slate-400 uppercase font-bold mb-1">Est. Original (H)</div>
            <div class="text-2xl font-bold text-violet-600">{{ getTotalOriginalEstimate() | number:'1.1-1' }}</div>
            <div class="text-[8pt] opacity-50">Horas planificadas</div>
          </div>
          <div class="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800 text-center">
            <div class="text-xs text-slate-400 uppercase font-bold mb-1">Esfuerzo Real (H)</div>
            <div class="text-2xl font-bold text-indigo-600">{{ metrics.developmentRate.totalEffort.toFixed(2) }}</div>
          </div>
          <div class="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800 text-center">
            <div class="text-xs text-slate-400 uppercase font-bold mb-1">Size Total</div>
            <div class="text-2xl font-bold text-blue-600">{{ metrics.developmentRate.totalSize }}</div>
          </div>
          <div class="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800 text-center relative overflow-hidden">
            <div class="text-xs text-slate-400 uppercase font-bold mb-1">KPI Tasa</div>
            <div class="text-3xl font-black text-emerald-600">{{ metrics.developmentRate.rate.toFixed(2) }}</div>
            <div class="text-[8pt] opacity-50">Umbrales: 1.7, 2.0</div>
          </div>
          <div class="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800 text-center relative overflow-hidden">
            <div class="text-xs text-slate-400 uppercase font-bold mb-1">Desviación Std</div>
            <div class="text-2xl font-bold" [class.text-emerald-600]="metrics.developmentRate.stdDeviation <= 1.00" [class.text-rose-500]="metrics.developmentRate.stdDeviation > 1.00">
              {{ metrics.developmentRate.stdDeviation.toFixed(2) }}
            </div>
            <div class="text-[8pt] opacity-50">Umbrales: 1.00 ({{ (1.00 - metrics.developmentRate.stdDeviation) >= 0 ? '+' : '' }}{{ ((1.00 - metrics.developmentRate.stdDeviation) * 100).toFixed(2) }}%)</div>
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
                  <!-- Expand toggle -->
                  <td class="px-3 py-2 text-center">
                    <button *ngIf="item.tasks?.length" (click)="toggleExpand(item.id, 1)"
                      class="w-6 h-6 rounded-full flex items-center justify-center text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 transition-all">
                      <lucide-icon [name]="ChevronDown" size="14" class="transition-transform duration-200"
                        [class.-rotate-90]="!expandedItemsM1.has(item.id)"></lucide-icon>
                    </button>
                    <span *ngIf="!item.tasks?.length" class="text-slate-200 text-xs">—</span>
                  </td>
                  <td class="px-3 py-2">
                    <span class="px-2 py-0.5 rounded text-[10px] font-bold"
                      [ngClass]="{'bg-purple-100 text-purple-700': item.type==='Feature', 'bg-blue-100 text-blue-700': item.type==='User Story'}">
                      {{ item.type === 'Feature' ? 'FT' : 'US' }}
                    </span>
                  </td>
                  <td class="px-3 py-2 text-blue-600 font-bold">#{{ item.id }}</td>
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
                <tr *ngIf="expandedItemsM1.has(item.id) && item.tasks?.length" class="bg-slate-50/70 dark:bg-slate-800/40">
                  <td colspan="10" class="px-8 pb-3 pt-0">
                    <div class="rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 mt-1">
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
                            <td class="px-3 py-1.5 text-blue-500 font-bold">#{{ task.id }}</td>
                            <td class="px-3 py-1.5 text-slate-700 dark:text-slate-300 max-w-[300px] truncate" [title]="task.title">{{ task.title }}</td>
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
        <div class="flex items-center justify-between mb-6">
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

        <!-- Summary KPIs (like image) -->
        <div class="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <div class="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800 text-center">
            <div class="text-xs text-slate-400 uppercase font-bold mb-1">Total Ítems</div>
            <div class="text-2xl font-bold">{{ metrics.developmentRate.totalItems }}</div>
          </div>
          <div class="bg-violet-50/50 dark:bg-violet-950/10 p-4 rounded-xl border border-violet-100 dark:border-violet-900/30 text-center">
            <div class="text-xs text-violet-500 dark:text-violet-400 uppercase font-bold mb-1">Total Estimado (H)</div>
            <div class="text-2xl font-black text-violet-700 dark:text-violet-300">{{ metrics.effortVariance.planned | number:'1.2-2' }}</div>
          </div>
          <div class="bg-fuchsia-50/50 dark:bg-fuchsia-950/10 p-4 rounded-xl border border-fuchsia-100 dark:border-fuchsia-900/30 text-center">
            <div class="text-xs text-fuchsia-500 dark:text-fuchsia-400 uppercase font-bold mb-1">Total Real (H)</div>
            <div class="text-2xl font-black text-fuchsia-700 dark:text-fuchsia-300">{{ metrics.effortVariance.actual | number:'1.2-2' }}</div>
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
          <div class="bg-violet-50 dark:bg-violet-950/30 p-4 rounded-xl border border-violet-200 dark:border-violet-900 text-center relative overflow-hidden ring-2 ring-violet-500/20">
            <div class="text-xs text-violet-600 dark:text-violet-400 uppercase font-bold mb-1">Desviación Absoluta</div>
            <div class="text-3xl font-black text-violet-700 dark:text-violet-300">{{ (metrics.effortVariance.absoluteRate * 100).toFixed(2) }}%</div>
            <div class="text-[8pt] opacity-80 text-violet-500/80 dark:text-violet-400/80">Umbrales: 15%, 30%</div>
          </div>
          <div class="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800 text-center">
            <div class="text-xs text-slate-400 uppercase font-bold mb-1">Promedio % Desviación Ind.</div>
            <div class="text-2xl font-bold text-violet-600 dark:text-violet-400">{{ (metrics.effortVariance.avgIndividualRate || 0).toFixed(2) }}%</div>
          </div>
          <div class="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800 text-center relative overflow-hidden">
            <div class="text-xs text-slate-400 uppercase font-bold mb-1">Desviación Estándar</div>
            <div class="text-2xl font-bold" [class.text-emerald-600]="(metrics.effortVariance.stdDeviation || 0) <= 15.00" [class.text-rose-500]="(metrics.effortVariance.stdDeviation || 0) > 15.00">
              {{ (metrics.effortVariance.stdDeviation || 0).toFixed(2) }}%
            </div>
            <div class="text-[8pt] opacity-50">Umbrales: 15% ({{ (15.00 - (metrics.effortVariance.stdDeviation || 0)) >= 0 ? '+' : '' }}{{ ((15.00 - (metrics.effortVariance.stdDeviation || 0)) / 15.00 * 100).toFixed(2) }}%)</div>
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
            
            <div class="grid grid-cols-2 gap-4">
              <div class="p-3 rounded bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                <div class="text-[10px] text-slate-400 uppercase font-bold">Meta Periodo</div>
                <div class="text-sm font-bold">15%</div>
              </div>
              <div class="p-3 rounded bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                <div class="text-[10px] text-slate-400 uppercase font-bold">Resultado</div>
                <div class="text-sm font-bold" [class.text-red-500]="metrics.effortVariance.rate > 0.3" [class.text-emerald-500]="metrics.effortVariance.rate <= 0.15">
                  {{ (metrics.effortVariance.rate * 100).toFixed(2) }}%
                </div>
              </div>
            </div>
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
                        <span class="text-[10px] font-bold text-violet-500 truncate flex items-center gap-1">
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
        </p>

        <div class="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <div class="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800 text-center">
            <div class="text-[10px] text-slate-400 uppercase font-bold mb-1">Esfuerzo Req. (H)</div>
            <div class="text-2xl font-bold text-slate-600">{{ metrics.rework.reqEffort.toFixed(1) }}</div>
            <div class="text-[8px] opacity-50 uppercase">Tareas Planeadas</div>
          </div>
          <div class="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800 text-center">
            <div class="text-[10px] text-slate-400 uppercase font-bold mb-1">Retrabajo Req. (H)</div>
            <div class="text-2xl font-bold text-amber-600">{{ metrics.rework.reqRework.toFixed(1) }}</div>
            <div class="text-[8px] opacity-50 uppercase">Tareas Correctivas</div>
          </div>
          <div class="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800 text-center">
            <div class="text-[10px] text-slate-400 uppercase font-bold mb-1">Retrabajo Bugs (H)</div>
            <div class="text-2xl font-bold text-rose-600">{{ metrics.rework.bugRework.toFixed(1) }}</div>
            <div class="text-[8px] opacity-50 uppercase">Tareas de Bugs</div>
          </div>
          <div class="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800 text-center">
            <div class="text-[10px] text-slate-400 uppercase font-bold mb-1">Retrabajo Total (H)</div>
            <div class="text-2xl font-bold text-indigo-600">{{ metrics.rework.totalRework.toFixed(1) }}</div>
            <div class="text-[8px] opacity-50 uppercase">Sumatoria Retrabajos</div>
          </div>
          <div class="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800 text-center relative overflow-hidden ring-2 ring-rose-500/20">
            <div class="text-[10px] text-slate-400 uppercase font-bold mb-1">KPI Tasa Retrabajo</div>
            <div class="text-3xl font-black text-rose-600">{{ metrics.rework.rate.toFixed(2) }}%</div>
            <div class="text-[8px] opacity-50 uppercase">Meta: 20% | Umbral: 22%</div>
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
                  <td class="p-3 font-bold text-indigo-500">#{{ item.id }}</td>
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
                                <span class="text-[11px] font-bold text-slate-700 dark:text-slate-200">Bug #{{ bug.id }}</span>
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
        <h3 class="text-lg font-bold text-slate-400 uppercase tracking-tight mb-4">3.4 Métrica: Densidad de Defectos</h3>
        
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          <div class="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
            <div class="h-64">
              <canvas #defectChart></canvas>
            </div>
          </div>

          <div class="space-y-4">
            <ul class="list-disc ml-5 space-y-3 text-slate-700 dark:text-slate-300">
              <li><strong>Meta establecida para el periodo:</strong> 0.18</li>
              <li><strong>Resultado del periodo:</strong> <span class="text-emerald-600 font-bold">{{ metrics.defectDensity.density.toFixed(3) }}</span></li>
              
              <li *ngIf="metricAnalyses['densidad de defectos']">
                <strong>Análisis de resultados e Acciones:</strong>
                <div class="mt-2 text-sm leading-relaxed whitespace-pre-wrap bg-slate-50 dark:bg-slate-800/30 p-4 rounded-lg italic border-l-2 border-slate-300">
                  {{ metricAnalyses['densidad de defectos'] }}
                </div>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>

    <!-- Section 3.5: Risk -->
    <section class="glass-card !bg-white dark:!bg-slate-900 border-l-4 border-amber-500 overflow-hidden">
      <div class="p-6">
        <h3 class="text-lg font-bold text-slate-400 uppercase tracking-tight mb-4">3.5 Métrica: Criticidad de Riesgos</h3>
        
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          <div class="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center justify-center">
            <div class="text-center">
              <lucide-icon [name]="AlertTriangle" size="48" class="text-amber-500 mx-auto mb-2"></lucide-icon>
              <div class="text-3xl font-bold">{{ metrics.riskCriticality.totalScore.toFixed(1) }}%</div>
              <div class="text-xs opacity-50 uppercase">Score Ponderado</div>
            </div>
          </div>

          <div class="space-y-4">
            <ul class="list-disc ml-5 space-y-3 text-slate-700 dark:text-slate-300">
              <li><strong>Meta establecida para el periodo:</strong> 30%</li>
              <li><strong>Resultado del periodo:</strong> <span class="text-amber-600 font-bold">{{ metrics.riskCriticality.totalScore.toFixed(1) }}%</span></li>
              
              <li *ngIf="metricAnalyses['risk']">
                <strong>Análisis de resultados e Acciones:</strong>
                <div class="mt-2 text-sm leading-relaxed whitespace-pre-wrap bg-slate-50 dark:bg-slate-800/30 p-4 rounded-lg italic border-l-2 border-slate-300">
                  {{ metricAnalyses['risk'] }}
                </div>
              </li>
            </ul>
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
      [period]="selectedIterationName">
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
  expandedBugs = new Set<number>();
  iswMetrics: any[] = [];
  iswList: string[] = [];
  selectedISW: string = '';
  private rawMetrics?: CMMIMetrics;
  timelineSummary: any = { onTimeCount: 0, lateCount: 0, openCount: 0, avgLateDays: 0, items: [] };

  toggleExpandBug(bugId: number, event?: Event) {
    if (event) event.stopPropagation();
    if (this.expandedBugs.has(bugId)) {
      this.expandedBugs.delete(bugId);
    } else {
      this.expandedBugs.add(bugId);
    }
  }

  private readonly STORAGE_KEY = 'cmmi5_dashboard_selection';

  @ViewChild('devRateChart') devRateChartCanvas!: ElementRef;
  @ViewChild('effortChart') effortChartCanvas!: ElementRef;
  @ViewChild('defectChart') defectChartCanvas!: ElementRef;

  private charts: Chart[] = [];

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
      } catch (e) {}
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
    this.azureService.getIterationNodes().subscribe(data => {
      this.iterations = data;
      if (!this.selectedIteration && data.length > 0) {
        this.selectedIteration = data[0].id;
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
    if (!this.isConfigured() || !this.selectedIteration) {
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
    this.recalculateTotals();
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
    const set = section === 1 ? this.expandedItemsM1 : (section === 2 ? this.expandedItemsM2 : this.expandedItemsM3);
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
    if (!this.metrics?.developmentRate?.items) {
      return { onTimeCount: 0, lateCount: 0, openCount: 0, avgLateDays: 0, items: [] };
    }
    
    const items = this.metrics.developmentRate.items;
    const start = this.metrics.startDate ? this.getLocalCalendarDate(this.metrics.startDate, false) : 0;
    const end = this.metrics.endDate ? this.getLocalCalendarDate(this.metrics.endDate, true) : 0;
    
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
            const diffTime = closedTime - end;
            daysLate = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
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
    
    return {
      onTimeCount,
      lateCount,
      openCount,
      avgLateDays,
      items: processedItems
    };
  }

  getDeliveryInfo(item: any) {
    const isClosed = ['Closed', 'Resolved', 'Done', 'Completed'].includes(item.status);
    if (!isClosed) return { status: 'open', days: 0, date: '' };
    
    const end = this.metrics?.endDate ? this.getLocalCalendarDate(this.metrics.endDate, true) : 0;
    const closedDateStr = item.closedDate || item.changedDate;
    
    if (closedDateStr) {
      const closedTime = new Date(closedDateStr).getTime();
      if (closedTime <= end) {
        return { status: 'on-time', days: 0, date: closedDateStr };
      } else {
        const diffTime = closedTime - end;
        const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
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
    
    const closedTime = new Date(closedDateStr).getTime();
    
    if (closedTime <= end) {
      const relativeTime = closedTime - start;
      const pct = relativeTime / sprintDuration;
      return Math.min(Math.max(pct * 70, 2), 70);
    } else {
      const diffTime = closedTime - end;
      const daysLate = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      const pctLate = Math.min(daysLate / 15, 1);
      return Math.min(Math.max(70 + (pctLate * 25), 72), 95);
    }
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
    const itemRates  = items.map(i => parseFloat(this.getEffectiveRate(i).toFixed(2)));
    const itemColors = itemRates.map(r =>
      r <= 1.7  ? 'rgba(34, 197, 94, 0.75)'  :   // green
      r <= 2.0  ? 'rgba(234, 179, 8, 0.75)'  :   // yellow
                  'rgba(239, 68, 68, 0.75)'       // red
    );
    const itemBorders = itemRates.map(r =>
      r <= 1.7  ? '#16a34a' : r <= 2.0 ? '#ca8a04' : '#dc2626'
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
              zoneGreen:  { type: 'box', yMin: 0,   yMax: 1.7, backgroundColor: 'rgba(34, 197, 94, 0.04)',  borderWidth: 0 },
              zoneYellow: { type: 'box', yMin: 1.7, yMax: 2.0, backgroundColor: 'rgba(234, 179, 8, 0.04)',  borderWidth: 0 },
              zoneRed:    { type: 'box', yMin: 2.0, yMax: 6.0, backgroundColor: 'rgba(239, 68, 68, 0.04)',  borderWidth: 0 },
              lineGreen:  { type: 'line', yMin: 1.7, yMax: 1.7, borderColor: 'rgba(34, 197, 94, 0.6)',  borderWidth: 1.5, borderDash: [4, 4],
                label: { content: '1.70 ✓', display: true, position: 'end', color: '#16a34a', font: { size: 9 } } },
              lineRed:    { type: 'line', yMin: 2.0, yMax: 2.0, borderColor: 'rgba(239, 68, 68, 0.6)',  borderWidth: 1.5, borderDash: [4, 4],
                label: { content: '2.00 ✗', display: true, position: 'end', color: '#dc2626', font: { size: 9 } } }
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
      const actual  = i.effort;
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
              zoneGreen:  { type: 'box', yMin: -100, yMax: 15, backgroundColor: 'rgba(34, 197, 94, 0.04)',  borderWidth: 0 },
              zoneYellow: { type: 'box', yMin: 15,   yMax: 30, backgroundColor: 'rgba(234, 179, 8, 0.04)',  borderWidth: 0 },
              zoneRed:    { type: 'box', yMin: 30,   yMax: 200, backgroundColor: 'rgba(239, 68, 68, 0.04)',  borderWidth: 0 },
              line15:     { type: 'line', yMin: 15, yMax: 15, borderColor: 'rgba(234, 179, 8, 0.6)',  borderWidth: 1.5, borderDash: [4, 4],
                label: { content: '15%', display: true, position: 'end', color: '#ca8a04', font: { size: 9 } } },
              line30:     { type: 'line', yMin: 30, yMax: 30, borderColor: 'rgba(239, 68, 68, 0.6)',  borderWidth: 1.5, borderDash: [4, 4],
                label: { content: '30%', display: true, position: 'end', color: '#dc2626', font: { size: 9 } } }
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
  }

  runAI() {
    if (!this.metrics) return;
    this.isAnalyzing = true;
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
      if (lowerSeg.includes('criticidad de riesgos')) this.metricAnalyses['risk'] = seg.split(']')[1]?.trim();
    });
  }

  async export() {
    if (!this.metrics) return;
    this.isLoading = true;
    
    try {
      // Capture charts as base64
      this.chartImages = {
        devRate: this.charts[0]?.toBase64Image() || '',
        effort: this.charts[1]?.toBase64Image() || '',
        defect: this.charts[2]?.toBase64Image() || ''
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
