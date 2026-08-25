import { Component, OnInit, OnDestroy, AfterViewInit, ViewChild, ElementRef, inject } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, TrendingUp, TrendingDown, Minus, GitCompare, Activity, Loader2, Database } from 'lucide-angular';
import { MetricsApiService, MetricAnalysisSaveResponse } from '../../services/metrics-api.service';
import { Chart, ChartConfiguration, registerables } from 'chart.js';
import { forkJoin } from 'rxjs';

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
  imports: [CommonModule, FormsModule, LucideAngularModule, DecimalPipe],
  templateUrl: './sprint-analytics.component.html',
})
export class SprintAnalyticsComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('radarCanvas') radarCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('lineQualityCanvas') lineQualityCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('barDevCanvas') barDevCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('lineTestCanvas') lineTestCanvas!: ElementRef<HTMLCanvasElement>;

  private apiService = inject(MetricsApiService);

  readonly TrendingUp = TrendingUp; readonly TrendingDown = TrendingDown;
  readonly Minus = Minus; readonly GitCompare = GitCompare;
  readonly Activity = Activity; readonly Loader2 = Loader2; readonly Database = Database;

  activeTab: 'version' | 'trends' = 'trends';
  isLoading = true; isLoadingVersions = false;
  allSprints: MetricAnalysisSaveResponse[] = [];
  sprintKpis: SprintKpi[] = [];
  selectedSprintId = '';
  versionsList: MetricAnalysisSaveResponse[] = [];
  kpiHealthList: { label: string; current: number | null; delta: number | null; improved: boolean; unit: string }[] = [];
  deltaRows: { label: string; unit: string; higherIsBetter: boolean; cells: { value: number | null; delta: number | null }[] }[] = [];
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

  private radarChart?: Chart; private lineQualityChart?: Chart;
  private barDevChart?: Chart; private lineTestChart?: Chart;
  private chartsReady = false; private pendingChartRender = false;

  ngOnInit() { this.loadData(); }
  ngAfterViewInit() {
    this.chartsReady = true;
    if (this.pendingChartRender) { this.pendingChartRender = false; setTimeout(() => this.renderTrendCharts(), 60); }
  }

  loadData() {
    this.isLoading = true;
    this.apiService.getAllSprintsAnalysis().subscribe(data => {
      // Sort sprints ascending by their numeric value in sprintName (e.g. S37, S38, S39)
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

  selectSprintForVersions(sprintId: string) {
    this.selectedSprintId = sprintId;
    this.isLoadingVersions = true;
    this.versionsList = []; this.kpiHealthList = []; this.deltaRows = [];
    this.radarChart?.destroy();
    this.apiService.getVersionsList(sprintId).subscribe(versions => {
      if (!versions.length) { this.isLoadingVersions = false; return; }
      const calls = versions.map(v => this.apiService.getSpecificVersion(sprintId, v.version));
      forkJoin(calls).subscribe(results => {
        // Sort versions ascending by version number
        const validResults = results.filter(r => r !== null) as MetricAnalysisSaveResponse[];
        validResults.sort((a, b) => a.version - b.version);
        
        this.versionsList = validResults;
        this.buildVersionComparison(); this.isLoadingVersions = false;
        setTimeout(() => this.renderRadarChart(), 80);
      });
    });
  }

  onTabChange(tab: 'version' | 'trends') {
    this.activeTab = tab;
    if (tab === 'trends') { setTimeout(() => this.renderTrendCharts(), 60); }
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

  private buildVersionComparison() {
    const kpis = this.versionsList.map(v => this.extractKpis(v));
    const defs = [
      { key: 'tasaDev', label: 'Tasa de Desarrollo', unit: '%', higherIsBetter: true },
      { key: 'tasaDesviacion', label: 'Tasa de Desviacion', unit: '%', higherIsBetter: false },
      { key: 'densidadDefectos', label: 'Densidad Defectos', unit: '', higherIsBetter: false },
      { key: 'eed', label: 'EED', unit: '%', higherIsBetter: true },
      { key: 'bugsEscapados', label: 'Bugs Escapados', unit: '%', higherIsBetter: false },
      { key: 'runRate', label: 'Run Rate', unit: '%', higherIsBetter: true },
      { key: 'passRate', label: 'Pass Rate', unit: '%', higherIsBetter: true },
      { key: 'retrabajo', label: 'Retrabajo', unit: '%', higherIsBetter: false },
    ] as const;
    this.deltaRows = defs.map(def => ({
      label: def.label, unit: def.unit, higherIsBetter: def.higherIsBetter,
      cells: kpis.map((k, i) => {
        const val = k[def.key as keyof SprintKpi] as number | null;
        const prev = i > 0 ? (kpis[i-1][def.key as keyof SprintKpi] as number | null) : null;
        return { value: val, delta: val !== null && prev !== null ? Math.round((val-prev)*10)/10 : null };
      })
    }));
    const last = kpis[kpis.length-1];
    const prev = kpis.length >= 2 ? kpis[kpis.length-2] : null;
    this.kpiHealthList = defs.map(def => {
      const current = last[def.key as keyof SprintKpi] as number | null;
      const pv = prev ? (prev[def.key as keyof SprintKpi] as number | null) : null;
      const delta = current !== null && pv !== null ? Math.round((current-pv)*10)/10 : null;
      return { label: def.label, current, delta, improved: delta !== null ? (def.higherIsBetter ? delta>0 : delta<0) : false, unit: def.unit };
    });
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

  private renderRadarChart() {
    if (!this.radarCanvas) return;
    this.radarChart?.destroy();
    const labels = ['T.Dev', 'EED', 'Run Rate', 'Pass Rate', 'Retrabajo', 'Bugs Esc.'];
    const palette = ['#6366f1','#8b5cf6','#ec4899','#f59e0b','#10b981','#3b82f6'];
    const datasets = this.versionsList.map((v, i) => {
      const k = this.extractKpis(v);
      return { label: 'v'+v.version, data: [k.tasaDev,k.eed,k.runRate,k.passRate,k.retrabajo,k.bugsEscapados].map(n=>n??0),
        backgroundColor: palette[i%palette.length]+'22', borderColor: palette[i%palette.length],
        pointBackgroundColor: palette[i%palette.length], borderWidth: 2 };
    });
    this.radarChart = new Chart(this.radarCanvas.nativeElement, {
      type:'radar', data:{ labels, datasets },
      options:{ responsive:true, maintainAspectRatio:false,
        scales:{ r:{ min:0, max:100, ticks:{ stepSize:25, font:{size:10} }, pointLabels:{ font:{size:11, weight:'bold'} } } },
        plugins:{ legend:{ position:'bottom', labels:{ boxWidth:12, font:{size:11} } } } }
    } as ChartConfiguration);
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
    this.radarChart?.destroy(); this.lineQualityChart?.destroy();
    this.barDevChart?.destroy(); this.lineTestChart?.destroy();
  }
}
