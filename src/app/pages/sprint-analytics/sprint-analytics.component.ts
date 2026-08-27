import { Component, OnInit, OnDestroy, AfterViewInit, ViewChild, ElementRef, inject } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { LucideAngularModule, TrendingUp, TrendingDown, Minus, Activity, Loader2, Database } from 'lucide-angular';
import { MetricsApiService, MetricAnalysisSaveResponse } from '../../services/metrics-api.service';
import { Chart, ChartConfiguration, registerables } from 'chart.js';

Chart.register(...registerables);

interface SprintKpi {
  sprintId: string; sprintName: string; version: number; createdAt: string;
  tasaDev: number | null; tasaDesviacion: number | null; densidadDefectos: number | null;
  eed: number | null; bugsEscapados: number | null; runRate: number | null;
  passRate: number | null; retrabajo: number | null;
}

@Component({
  selector: 'app-sprint-analytics',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, DecimalPipe],
  templateUrl: './sprint-analytics.component.html',
})
export class SprintAnalyticsComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('lineQualityCanvas') lineQualityCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('barDevCanvas') barDevCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('lineTestCanvas') lineTestCanvas!: ElementRef<HTMLCanvasElement>;

  private apiService = inject(MetricsApiService);

  readonly TrendingUp = TrendingUp; readonly TrendingDown = TrendingDown;
  readonly Minus = Minus; readonly Activity = Activity;
  readonly Loader2 = Loader2; readonly Database = Database;

  isLoading = true;
  allSprints: MetricAnalysisSaveResponse[] = [];
  sprintKpis: SprintKpi[] = [];
  summaryCards: { label: string; value: string; sub: string }[] = [];
  heatmapCols = [
    { key: 'tasaDev', short: 'T.Dev', unit: '%', higherIsBetter: true, thresholds: [80, 60] },
    { key: 'tasaDesviacion', short: 'Desv.', unit: '%', higherIsBetter: false, thresholds: [10, 25] },
    { key: 'densidadDefectos', short: 'Def/SP', unit: '', higherIsBetter: false, thresholds: [0.5, 1.5] },
    { key: 'eed', short: 'EED', unit: '%', higherIsBetter: true, thresholds: [80, 60] },
    { key: 'bugsEscapados', short: 'Esc.%', unit: '%', higherIsBetter: false, thresholds: [5, 15] },
    { key: 'runRate', short: 'Run%', unit: '%', higherIsBetter: true, thresholds: [80, 60] },
    { key: 'passRate', short: 'Pass%', unit: '%', higherIsBetter: true, thresholds: [80, 60] },
    { key: 'retrabajo', short: 'Ret.%', unit: '%', higherIsBetter: false, thresholds: [10, 20] },
  ];
  heatmapRows: { sprintName: string; cells: { value: number | null; rag: 'green' | 'amber' | 'red'; unit: string }[] }[] = [];

  private lineQualityChart?: Chart;
  private barDevChart?: Chart;
  private lineTestChart?: Chart;
  private chartsReady = false; private pendingChartRender = false;

  ngOnInit() { this.loadData(); }
  ngAfterViewInit() {
    this.chartsReady = true;
    if (this.pendingChartRender) { this.pendingChartRender = false; setTimeout(() => this.renderTrendCharts(), 60); }
  }

  loadData() {
    this.isLoading = true;
    this.apiService.getAllSprintsAnalysis().subscribe(data => {
      const getSprintNumber = (name: string): number => {
        const match = name.match(/\d+/);
        return match ? parseInt(match[0], 10) : 0;
      };
      const sortedData = [...data].sort((a, b) => getSprintNumber(a.sprintName) - getSprintNumber(b.sprintName));
      this.allSprints = sortedData;
      this.sprintKpis = sortedData.map(s => this.extractKpis(s));
      this.buildSummaryCards(); this.buildHeatmap();
      this.isLoading = false;
      if (this.chartsReady) { setTimeout(() => this.renderTrendCharts(), 60); }
      else { this.pendingChartRender = true; }
    });
  }

  private extractKpis(s: MetricAnalysisSaveResponse): SprintKpi {
    const m = s.metrics as any;
    return {
      sprintId: s.sprintId, sprintName: s.sprintName, version: s.version, createdAt: s.createdAt,
      tasaDev: this.safeRate(m?.developmentRate), tasaDesviacion: this.safeRate(m?.deviationRate),
      densidadDefectos: this.safeDensity(m?.defectDensity), eed: this.safeRate(m?.defectRemovalEfficiency),
      bugsEscapados: this.safeRate(m?.escapedBugs), runRate: this.safeRate(m?.testExecution),
      passRate: this.safeRate(m?.satisfactoryTests), retrabajo: this.safeRate(m?.reworkRate),
    };
  }

  private safeRate(obj: any): number | null {
    if (!obj) return null;
    const a = obj.achievedValue ?? obj.achieved ?? null;
    const p = obj.plannedValue ?? obj.planned ?? null;
    if (a !== null && p !== null && p > 0) return Math.round((a / p) * 1000) / 10;
    const r = obj.rate ?? obj.percentage ?? obj.value ?? null;
    return r !== null ? Math.round(r * 10) / 10 : null;
  }

  private safeDensity(obj: any): number | null {
    if (!obj) return null;
    return obj.density ?? obj.value ?? null;
  }

  private buildSummaryCards() {
    const k = this.sprintKpis;
    const passRates = k.map(s => s.passRate).filter((v): v is number => v !== null);
    const bestPass = passRates.length ? Math.max(...passRates) : null;
    const bestSprint = bestPass !== null ? (k.find(s => s.passRate === bestPass)?.sprintName ?? '') : '';
    const eeds = k.map(s => s.eed).filter((v): v is number => v !== null);
    const avgEED = eeds.length ? Math.round(eeds.reduce((a,b)=>a+b,0)/eeds.length*10)/10 : null;
    const defs = k.map(s => s.densidadDefectos).filter((v): v is number => v !== null);
    const trend = defs.length >= 2 ? (defs[defs.length-1] < defs[0] ? '↓ Mejorando' : '↑ Aumentando') : '—';
    this.summaryCards = [
      { label: 'Sprints en BD', value: String(this.allSprints.length), sub: 'guardados en MongoDB Atlas' },
      { label: 'Mejor Pass Rate', value: bestPass !== null ? bestPass+'%' : '—', sub: bestSprint },
      { label: 'EED Promedio', value: avgEED !== null ? avgEED+'%' : '—', sub: 'Eficiencia Eliminacion Defectos' },
      { label: 'Tendencia Defectos', value: trend, sub: 'sprint inicial vs ultimo' },
    ];
  }

  private buildHeatmap() {
    this.heatmapRows = this.sprintKpis.map(k => ({
      sprintName: k.sprintName,
      cells: this.heatmapCols.map(col => {
        const value = k[col.key as keyof SprintKpi] as number | null;
        return { value, unit: col.unit, rag: this.getRag(value, col.thresholds, col.higherIsBetter) };
      })
    }));
  }

  private getRag(val: number | null, thr: number[], higher: boolean): 'green' | 'amber' | 'red' {
    if (val === null) return 'green';
    return higher ? (val >= thr[0] ? 'green' : val >= thr[1] ? 'amber' : 'red')
                  : (val <= thr[0] ? 'green' : val <= thr[1] ? 'amber' : 'red');
  }

  private renderTrendCharts() {
    if (!this.lineQualityCanvas || !this.barDevCanvas || !this.lineTestCanvas) return;
    this.lineQualityChart?.destroy(); this.barDevChart?.destroy(); this.lineTestChart?.destroy();
    const labels = this.sprintKpis.map(k => k.sprintName.replace(/Sprint\s*/i,'S').substring(0,18));
    const k = this.sprintKpis;
    this.lineQualityChart = new Chart(this.lineQualityCanvas.nativeElement, {
      type:'line', data:{ labels, datasets:[
        { label:'EED %', data:k.map(s=>s.eed), borderColor:'#6366f1', backgroundColor:'#6366f118', tension:0.4, fill:true, pointRadius:4, pointHoverRadius:6 },
        { label:'Densidad Def.', data:k.map(s=>s.densidadDefectos), borderColor:'#f59e0b', backgroundColor:'transparent', tension:0.4, pointRadius:4 },
        { label:'Bugs Escapados %', data:k.map(s=>s.bugsEscapados), borderColor:'#ef4444', backgroundColor:'transparent', tension:0.4, pointRadius:4 },
        { label:'Retrabajo %', data:k.map(s=>s.retrabajo), borderColor:'#8b5cf6', backgroundColor:'transparent', tension:0.4, pointRadius:4 },
      ]},
      options:{ responsive:true, maintainAspectRatio:false,
        plugins:{ legend:{ position:'bottom', labels:{ boxWidth:10, font:{size:10} } } },
        scales:{ y:{ ticks:{font:{size:10}} }, x:{ ticks:{font:{size:9}, maxRotation:45} } } }
    } as ChartConfiguration);
    this.barDevChart = new Chart(this.barDevCanvas.nativeElement, {
      type:'bar', data:{ labels, datasets:[
        { label:'Tasa Desarrollo %', data:k.map(s=>s.tasaDev), backgroundColor:'#6366f1cc', borderRadius:6 },
        { label:'Tasa Desviacion %', data:k.map(s=>s.tasaDesviacion), backgroundColor:'#f59e0bcc', borderRadius:6 },
      ]},
      options:{ responsive:true, maintainAspectRatio:false,
        plugins:{ legend:{ position:'bottom', labels:{ boxWidth:10, font:{size:10} } } },
        scales:{ y:{ ticks:{font:{size:10}} }, x:{ ticks:{font:{size:9}, maxRotation:45} } } }
    } as ChartConfiguration);
    this.lineTestChart = new Chart(this.lineTestCanvas.nativeElement, {
      type:'line', data:{ labels, datasets:[
        { label:'Run Rate %', data:k.map(s=>s.runRate), borderColor:'#10b981', backgroundColor:'#10b98118', tension:0.4, fill:true, pointRadius:4 },
        { label:'Pass Rate %', data:k.map(s=>s.passRate), borderColor:'#3b82f6', backgroundColor:'#3b82f618', tension:0.4, fill:true, pointRadius:4 },
      ]},
      options:{ responsive:true, maintainAspectRatio:false,
        plugins:{ legend:{ position:'bottom', labels:{ boxWidth:10, font:{size:10} } } },
        scales:{ y:{ min:0, max:100, ticks:{font:{size:10}} }, x:{ ticks:{font:{size:9}, maxRotation:45} } } }
    } as ChartConfiguration);
  }

  ngOnDestroy() {
    this.lineQualityChart?.destroy(); this.barDevChart?.destroy(); this.lineTestChart?.destroy();
  }
}
