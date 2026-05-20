import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AzureDevOpsService } from '../../services/azure-devops.service';
import { AIService } from '../../services/ai.service';
import { ConfigService } from '../../services/config.service';
import { CMMIMetrics } from '../../models/metrics.model';
import { LucideAngularModule, FileText, RefreshCw, Send, CheckCircle, Calendar, Tag, AlertCircle, Copy, Check } from 'lucide-angular';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-report-completion',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, FormsModule],
  template: `
    <div class="p-4 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      <!-- Header -->
      <header class="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-850 pb-6">
        <div>
          <h2 class="text-2xl md:text-3xl font-black text-slate-800 dark:text-white tracking-tight flex items-center gap-3 flex-wrap">
            <div class="p-2 bg-indigo-500 rounded-xl shadow-lg shadow-indigo-500/20 shrink-0">
              <lucide-icon [name]="FileText" class="text-white" size="24"></lucide-icon>
            </div>
            Reporte de Finalización de Construcción
          </h2>
          <p class="text-slate-500 dark:text-slate-400 mt-1 font-medium text-xs md:text-sm">Generación automática de reporte ejecutivo para cierre de sprint.</p>
        </div>
        
        <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
          <select 
            [(ngModel)]="selectedIteration" 
            (ngModelChange)="loadData()"
            class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm font-bold shadow-sm focus:ring-2 focus:ring-indigo-500 transition-all outline-none w-full sm:min-w-[240px]">
            <option value="" disabled>Seleccionar Sprint...</option>
            <option *ngFor="let iter of iterations" [value]="iter.id">{{ iter.path }}</option>
          </select>
          
          <button 
            (click)="generateAIReport()" 
            [disabled]="!metrics || loadingAI"
            class="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2.5 rounded-xl font-bold shadow-lg shadow-indigo-600/20 transition-all active:scale-95 w-full sm:w-auto shrink-0">
            <lucide-icon [name]="loadingAI ? RefreshCw : Send" [class.animate-spin]="loadingAI" size="18"></lucide-icon>
            {{ loadingAI ? 'Generando...' : 'Generar Narrativa IA' }}
          </button>
        </div>
      </header>

      <div *ngIf="loading" class="flex flex-col items-center justify-center py-20 space-y-4">
        <div class="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        <p class="text-slate-500 font-bold animate-pulse text-sm uppercase tracking-widest">Cargando datos del sprint...</p>
      </div>

      <div *ngIf="metrics && !loading" class="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        <!-- Main Report Section -->
        <div class="lg:col-span-2 space-y-8">
          <!-- Data Table Card -->
          <div class="glass-card !bg-white dark:!bg-slate-900 border-l-4 border-indigo-500 overflow-hidden">
            <div class="p-4 md:p-6">
              <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
                <h3 class="text-base md:text-lg font-bold text-slate-800 dark:text-white uppercase tracking-tight flex items-center gap-2">
                  <lucide-icon [name]="Tag" size="18" class="text-indigo-500"></lucide-icon>
                  Detalle de Esfuerzo por Ítem
                </h3>
                <div class="text-[10px] font-black px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded text-slate-500 uppercase self-start sm:self-auto">
                  {{ metrics.iterationName }}
                </div>
              </div>

              <div class="overflow-x-auto rounded-xl border border-slate-100 dark:border-slate-800">
                <table class="w-full text-left text-sm min-w-[500px]">
                  <thead class="bg-slate-50 dark:bg-slate-800/50 text-slate-400 uppercase text-[10px] font-bold">
                    <tr>
                      <th class="px-4 py-3">Tipo</th>
                      <th class="px-4 py-3">Item (ID)</th>
                      <th class="px-4 py-3 text-right">Tiempo Planeado (H)</th>
                      <th class="px-4 py-3 text-right">Tiempo Completado (H)</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
                    <tr *ngFor="let item of reportItems" class="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                      <td class="px-4 py-3">
                        <span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase"
                          [ngClass]="{
                            'bg-purple-100 text-purple-700': item.type==='FT', 
                            'bg-blue-100 text-blue-700': item.type==='US',
                            'bg-rose-100 text-rose-700': item.type==='Bug'
                          }">
                          {{ item.type }}
                        </span>
                      </td>
                      <td class="px-4 py-3 font-bold text-slate-700 dark:text-slate-200">#{{ item.id }}</td>
                      <td class="px-4 py-3 text-right font-medium text-slate-600 dark:text-slate-400">{{ item.planned.toFixed(2) }}</td>
                      <td class="px-4 py-3 text-right font-black text-indigo-600 dark:text-indigo-400">{{ item.actual.toFixed(2) }}</td>
                    </tr>
                    <!-- Totals Row -->
                    <tr class="bg-indigo-50/30 dark:bg-indigo-900/10 font-black">
                      <td colspan="2" class="px-4 py-4 uppercase text-xs text-indigo-600">Total General</td>
                      <td class="px-4 py-4 text-right text-slate-800 dark:text-white">{{ totalPlanned.toFixed(2) }}</td>
                      <td class="px-4 py-4 text-right text-indigo-600 dark:text-indigo-300">{{ totalActual.toFixed(2) }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              
              <!-- Deviation Summary -->
              <div class="mt-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                <div class="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                  <div class="text-[10px] text-slate-400 font-bold uppercase mb-1">Diferencia Horas</div>
                  <div class="text-xl font-black" [class.text-emerald-500]="totalPlanned >= totalActual" [class.text-rose-500]="totalPlanned < totalActual">
                    {{ (totalPlanned - totalActual).toFixed(2) }}h {{ totalPlanned >= totalActual ? 'menos' : 'más' }}
                  </div>
                </div>
                <div class="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                  <div class="text-[10px] text-slate-400 font-bold uppercase mb-1">% Desviación</div>
                  <div class="text-xl font-black text-indigo-600">
                    {{ (totalPlanned > 0 ? (Math.abs(totalPlanned - totalActual) / totalPlanned * 100) : 0).toFixed(2) }}%
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- AI Narrative Card -->
          <div *ngIf="aiNarrative" class="glass-card !bg-white dark:!bg-slate-900 border-l-4 border-emerald-500 overflow-hidden animate-in slide-in-from-bottom-4 duration-500">
            <div class="p-4 md:p-6">
              <div class="flex flex-wrap items-center justify-between gap-2 mb-4">
                <h3 class="text-base md:text-lg font-bold text-slate-800 dark:text-white uppercase tracking-tight flex items-center gap-2">
                  <lucide-icon [name]="CheckCircle" size="18" class="text-emerald-500"></lucide-icon>
                  Narrativa Generada por IA
                </h3>
                <button 
                  (click)="copyNarrative()" 
                  class="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 hover:text-indigo-500 transition-colors uppercase">
                  <lucide-icon [name]="copied ? Check : Copy" size="12"></lucide-icon>
                  {{ copied ? 'Copiado' : 'Copiar Texto' }}
                </button>
              </div>
              
              <div class="bg-slate-50 dark:bg-slate-800/30 p-4 md:p-6 rounded-xl border border-slate-100 dark:border-slate-800 text-xs md:text-sm leading-relaxed text-slate-700 dark:text-slate-300 whitespace-pre-wrap italic font-medium">
                {{ aiNarrative }}
              </div>
            </div>
          </div>
        </div>

        <!-- Sidebar: Sprint Info -->
        <div class="space-y-6">
          <div class="glass-card p-4 md:p-6 space-y-6">
            <h4 class="text-xs font-black uppercase text-slate-400 tracking-widest border-b border-slate-100 dark:border-slate-800 pb-2 flex items-center gap-2">
              <lucide-icon [name]="Calendar" size="14"></lucide-icon>
              Información de Sprint
            </h4>
            
            <div class="space-y-4">
              <div>
                <label class="text-[10px] font-bold text-slate-400 uppercase">Iteración</label>
                <div class="text-sm font-bold text-slate-700 dark:text-slate-200">{{ metrics.iterationName }}</div>
              </div>
              
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="text-[10px] font-bold text-slate-400 uppercase">Inicio</label>
                  <div class="text-sm font-bold text-slate-700 dark:text-slate-200">{{ (metrics!.startDate | date:'dd/MM/yyyy':'UTC') || 'N/A' }}</div>
                </div>
                <div>
                  <label class="text-[10px] font-bold text-slate-400 uppercase">Fin</label>
                  <div class="text-sm font-bold text-slate-700 dark:text-slate-200">{{ (metrics!.endDate | date:'dd/MM/yyyy':'UTC') || 'N/A' }}</div>
                </div>
              </div>
            </div>
          </div>

          <div class="p-4 rounded-xl bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 flex gap-3">
            <lucide-icon [name]="AlertCircle" size="18" class="text-amber-500 shrink-0"></lucide-icon>
            <div class="text-xs text-amber-700 dark:text-amber-400 leading-tight">
              <strong>Nota:</strong> Los datos de tiempo planeado y completado se calculan basándose en todas las tareas del sprint vinculadas a sus respectivos ítems.
            </div>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div *ngIf="!metrics && !loading" class="flex flex-col items-center justify-center py-32 text-center space-y-4 opacity-50">
        <lucide-icon [name]="FileText" size="64" class="text-slate-300"></lucide-icon>
        <div>
          <h3 class="text-xl font-bold text-slate-400">Sin datos cargados</h3>
          <p class="text-sm">Selecciona una iteración arriba para generar el reporte.</p>
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
export class ReportCompletionComponent implements OnInit {
  private adoService = inject(AzureDevOpsService);
  private aiService = inject(AIService);
  private configService = inject(ConfigService);

  iterations: any[] = [];
  selectedIteration: string = '';
  metrics: CMMIMetrics | null = null;
  loading = false;
  loadingAI = false;
  aiNarrative = '';
  copied = false;

  // Static properties to avoid infinite re-rendering loops
  reportItems: any[] = [];
  totalPlanned = 0;
  totalActual = 0;

  readonly FileText = FileText;
  readonly RefreshCw = RefreshCw;
  readonly Send = Send;
  readonly CheckCircle = CheckCircle;
  readonly Calendar = Calendar;
  readonly Tag = Tag;
  readonly AlertCircle = AlertCircle;
  readonly Copy = Copy;
  readonly Check = Check;
  protected readonly Math = Math;

  private readonly STORAGE_KEY = 'cmmi5_analyzer_selection';

  ngOnInit() {
    this.loadSavedSelection();
    this.loadIterations();
  }

  loadSavedSelection() {
    const saved = localStorage.getItem(this.STORAGE_KEY);
    if (saved) {
      try {
        const { iteration } = JSON.parse(saved);
        this.selectedIteration = iteration || '';
      } catch (e) {}
    }
  }

  saveSelection() {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify({
      iteration: this.selectedIteration
    }));
  }

  loadIterations() {
    console.log('Report: Loading iterations...');
    this.adoService.getIterationNodes().subscribe({
      next: (iters) => {
        console.log('Report: Iterations loaded:', iters.length);
        this.iterations = iters;
        
        if (!this.selectedIteration && iters.length > 0) {
          this.selectedIteration = iters[iters.length - 1].id;
          this.loadData();
        } else if (this.selectedIteration) {
          this.loadData();
        }
      },
      error: (err) => console.error('Report: Failed to load iterations', err)
    });
  }

  loadData() {
    if (!this.selectedIteration || this.loading) return;
    this.saveSelection();
    
    console.log('Report: Loading data for iteration:', this.selectedIteration);
    this.loading = true;
    this.aiNarrative = '';
    this.metrics = null;
    this.reportItems = [];
    this.totalPlanned = 0;
    this.totalActual = 0;

    // Failsafe timeout to prevent infinite loading
    const failsafe = setTimeout(() => {
      if (this.loading) {
        this.loading = false;
        alert('Tiempo de espera agotado al conectar con Azure DevOps.');
      }
    }, 25000);

    this.adoService.getMetrics(this.selectedIteration).subscribe({
      next: (m) => {
        clearTimeout(failsafe);
        console.log('Report: Metrics received', m);
        this.metrics = m;
        this.calculateReportData();
        this.loading = false;
        
        // Restore cached AI Completion narrative if present
        const cachedNarrative = localStorage.getItem('cmmi5_ai_narrative_' + this.selectedIteration);
        if (cachedNarrative) {
          this.aiNarrative = cachedNarrative;
        } else {
          this.aiNarrative = '';
        }
      },
      error: (err) => {
        clearTimeout(failsafe);
        console.error('Report: Error loading metrics', err);
        this.loading = false;
      }
    });
  }

  private calculateReportData() {
    if (!this.metrics) return;
    
    const items: any[] = [];
    let plannedSum = 0;
    let actualSum = 0;

    // Combine US and FT
    (this.metrics.developmentRate.items || []).forEach(i => {
      // Filter tasks to only include THE SPECIFIC SUBTASKS requested (01.00 to 01.05)
      const devTasks = (i.tasks || []).filter(t => {
        const title = (t.title || '').toLowerCase();
        
        // Strictly include only the 4 requested construction tasks (excluding 01.00 Análisis)
        return title.includes('01.01') || // Código
               title.includes('01.03') || // Review
               title.includes('01.04') || // Peer Review
               title.includes('01.05');   // Pruebas ISW
      });

      const itemPlanned = devTasks.reduce((s, t) => s + (t.originalEstimate || 0), 0);
      const itemActual = devTasks.reduce((s, t) => s + (t.completedWork || 0), 0);

      items.push({
        type: i.type === 'Feature' ? 'FT' : 'US',
        id: i.id,
        planned: itemPlanned,
        actual: itemActual,
        title: i.title
      });
      plannedSum += itemPlanned;
      actualSum += itemActual;
    });

    this.reportItems = items;
    this.totalPlanned = plannedSum;
    this.totalActual = actualSum;
  }

  generateAIReport() {
    if (!this.metrics) return;
    console.log('Report: Generating AI Narrative...');
    this.loadingAI = true;
    this.aiNarrative = '';
    
    this.aiService.generateCompletionReport(this.metrics).subscribe({
      next: (text) => {
        console.log('Report: AI Narrative received (length:', text?.length, ')');
        this.aiNarrative = text;
        localStorage.setItem('cmmi5_ai_narrative_' + this.selectedIteration, text);
        this.loadingAI = false;
      },
      error: (err) => {
        console.error('Report: AI generation failed', err);
        this.aiNarrative = 'Error al generar la narrativa. Por favor intente de nuevo.';
        this.loadingAI = false;
      }
    });
  }

  copyNarrative() {
    if (!this.aiNarrative) return;
    navigator.clipboard.writeText(this.aiNarrative);
    this.copied = true;
    setTimeout(() => this.copied = false, 2000);
  }
}
