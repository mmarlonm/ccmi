import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  AdoOrganization,
  AdoProject,
  AdoTeam,
  AdoSprint,
  SprintGanttService,
  SprintHierarchyNode,
  SprintAssignmentEvent
} from '../../services/sprint-gantt.service';
import { catchError, forkJoin, of, switchMap } from 'rxjs';
import { SprintGanttBaselineService } from '../../services/sprint-gantt-baseline.service';
import { AIService, GanttAiInput } from '../../services/ai.service';
import {
  SprintBaselineParseResult,
  SprintPersonComparisonSummary
} from '../../models/sprint-gantt-baseline.model';

interface SprintDay {
  date: Date;
  key: string;
  label: string;
  isSprintStart: boolean;
  isSprintEnd: boolean;
}

interface VisibleNodeRow {
  node: SprintHierarchyNode;
  depth: number;
}

type WorkflowRole = 'developer' | 'reviewer' | 'qa';

interface WorkflowTask {
  id: number;
  title: string;
  hours: number;
  role: WorkflowRole;
  stage: string;
}

interface WorkflowPlanResult {
  totalHours: number;
  startByTaskId: Map<number, number>;
}

interface BaselineSummary {
  totalRows: number;
  matchedRows: number;
  unmatchedRows: number;
  matchedOnTime: number;
  matchedLate: number;
}

interface BaselineComparisonNode {
  startKey: string;
  endKey: string;
  plannedPeople: string[];
  hasLateEnd: boolean;
}

interface CachedGanttAiAnalysis {
  baselineSignature: string;
  text: string;
}

interface TaskStageAggregate {
  stage: string;
  plannedHours: number;
  realHours: number;
  taskCount: number;
}

@Component({
  selector: 'app-sprint-gantt',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
<div class="max-w-[1800px] mx-auto space-y-6 pt-4 md:pt-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
  <header class="sticky top-0 z-40 bg-slate-50 dark:bg-slate-900 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200 dark:border-slate-800 pb-4 pt-3 md:pt-4 -mx-2 md:-mx-2.5 px-2 md:px-2.5 shadow-md transition-all duration-300">
    <div class="shrink-0">
      <h2 class="text-2xl font-bold text-slate-800 dark:text-white">Seguimiento de Sprint - Gantt</h2>
      <p class="text-slate-500 dark:text-slate-400 mt-1 text-xs">Comparación de planeado (Excel) vs real (Azure DevOps).</p>
    </div>

    <div class="flex flex-col items-end gap-1.5 w-full md:w-auto shrink-0">
      <div class="flex flex-row items-center gap-2 md:gap-3 justify-end w-full shrink-0 flex-wrap">
        <select class="glass-input text-xs font-medium w-36 md:w-40 shrink-0" [(ngModel)]="selectedOrganization" (ngModelChange)="onOrganizationChange()">
          <option value="">Organización</option>
          <option *ngFor="let org of organizations" [value]="org.name">{{ org.name }}</option>
        </select>
        <select class="glass-input text-xs font-medium w-32 md:w-36 shrink-0" [(ngModel)]="selectedProjectId" (ngModelChange)="onProjectChange()" [disabled]="!selectedOrganization">
          <option value="">Proyecto</option>
          <option *ngFor="let project of projects" [value]="project.id">{{ project.name }}</option>
        </select>
        <select class="glass-input text-xs font-medium w-32 md:w-36 shrink-0" [(ngModel)]="selectedTeamId" (ngModelChange)="onTeamChange()" [disabled]="!selectedProjectId">
          <option value="">Team</option>
          <option *ngFor="let team of teams" [value]="team.id">{{ team.name }}</option>
        </select>
        <select class="glass-input text-xs font-medium w-32 md:w-36 shrink-0" [(ngModel)]="selectedSprintId" (ngModelChange)="onSprintChange()" [disabled]="!selectedTeamId">
          <option value="">Sprint</option>
          <option *ngFor="let sprint of sprints" [value]="sprint.id">{{ sprint.name }}</option>
        </select>

        <div class="flex items-center gap-2 shrink-0 bg-slate-200/50 dark:bg-slate-800/60 p-1 rounded-xl border border-slate-300/40 dark:border-slate-700/50 h-[38px] box-border">
          <button (click)="loadGanttData()" [disabled]="!canLoadGantt || loadingData"
            class="glass-button flex items-center justify-center h-[30px] px-2 rounded-lg text-[11px]">
            {{ loadingData ? 'Cargando...' : 'Cargar' }}
          </button>
          <label class="glass-button cursor-pointer flex items-center justify-center h-[30px] px-2 rounded-lg text-[11px]" [class.opacity-60]="loadingData">
            Excel
            <input type="file" accept=".xlsx,.xls" class="hidden" (change)="onBaselineFileSelected($event)" [disabled]="loadingData">
          </label>
          <button (click)="runComparisonAnalysis()" [disabled]="!canGenerateComparisonAnalysis"
            class="glass-button flex items-center justify-center h-[30px] px-2 rounded-lg text-[11px] bg-indigo-600 hover:bg-indigo-700 text-white">
            {{ isAnalyzingComparison ? 'Analizando...' : 'Analizar IA' }}
          </button>
        </div>
      </div>
      <div class="text-[11px] mr-1 flex items-center gap-3">
        <span *ngIf="loadingCatalogs" class="text-slate-500 dark:text-slate-400">Actualizando catálogos...</span>
        <span *ngIf="errorMessage" class="text-red-600 dark:text-red-400">{{ errorMessage }}</span>
        <span *ngIf="baselineFileName" class="text-slate-500 dark:text-slate-400">Baseline: <strong>{{ baselineFileName }}</strong></span>
      </div>
    </div>
  </header>

  <section class="glass-card space-y-4">
    <div *ngIf="!hasPatConfigured" class="rounded-lg border border-amber-300 bg-amber-100/70 dark:bg-amber-900/30 text-amber-900 dark:text-amber-200 p-3 text-sm">
      Configura un PAT en la sección de Configuración para cargar datos de Azure DevOps.
    </div>

    <div *ngIf="baselineFileName" class="rounded-lg border border-slate-200/70 dark:border-slate-700/70 overflow-hidden">
      <button
        class="w-full px-3 py-2 text-left text-sm font-medium bg-slate-50 dark:bg-slate-800/60 flex items-center justify-between"
        (click)="toggleBaselinePanel()">
        <span>Resumen de Excel: <strong>{{ baselineFileName }}</strong></span>
        <span>{{ isBaselinePanelCollapsed ? 'Mostrar' : 'Ocultar' }}</span>
      </button>
      <div *ngIf="!isBaselinePanelCollapsed" class="p-3 space-y-3 text-xs text-slate-600 dark:text-slate-300">
        <div *ngIf="baselineSummary.totalRows > 0">
          Filas Excel: <strong>{{ baselineSummary.totalRows }}</strong> |
          Match ADO: <strong>{{ baselineSummary.matchedRows }}</strong> |
          Sin match: <strong>{{ baselineSummary.unmatchedRows }}</strong> |
          En tiempo: <strong>{{ baselineSummary.matchedOnTime }}</strong> |
          Atrasadas: <strong>{{ baselineSummary.matchedLate }}</strong>
        </div>
        <div *ngIf="baselineWarnings.length > 0" class="text-amber-600 dark:text-amber-300">
          Avisos de importación: {{ baselineWarnings.length }}
        </div>
        <div *ngIf="personComparison.length > 0" class="overflow-auto border border-slate-200/70 dark:border-slate-700/70 rounded-lg">
          <table class="min-w-[680px] w-full text-xs">
            <thead class="bg-slate-50 dark:bg-slate-800/60">
              <tr>
                <th class="text-left px-3 py-2">Persona</th>
                <th class="text-right px-3 py-2">Planeado (marcas)</th>
                <th class="text-right px-3 py-2">Planeado (items)</th>
                <th class="text-right px-3 py-2">Real (asignaciones)</th>
                <th class="text-right px-3 py-2">Real (items)</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let person of personComparison" class="border-t border-slate-200/60 dark:border-slate-700/60">
                <td class="px-3 py-2">{{ person.person }}</td>
                <td class="px-3 py-2 text-right">{{ person.plannedMarks }}</td>
                <td class="px-3 py-2 text-right">{{ person.plannedItems }}</td>
                <td class="px-3 py-2 text-right">{{ person.realAssignments }}</td>
                <td class="px-3 py-2 text-right">{{ person.realItems }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </section>

  <section *ngIf="comparisonAnalysisText" class="glass-card !bg-white dark:!bg-slate-900 border-l-4 border-indigo-600 overflow-visible shadow-lg animate-in fade-in duration-500">
    <div class="p-5 space-y-3">
      <div class="flex items-center justify-between gap-3">
        <div>
          <h3 class="text-base font-bold text-slate-800 dark:text-slate-100">Análisis IA: Real vs Planeado</h3>
          <p class="text-xs text-slate-500 dark:text-slate-400">Diagnóstico ejecutivo del sprint basado en baseline Excel y ejecución real en ADO.</p>
        </div>
        <button class="glass-button !text-[11px] !py-1.5 !px-2.5" (click)="copyComparisonAnalysis()">
          {{ comparisonAnalysisCopied ? 'Copiado' : 'Copiar análisis' }}
        </button>
      </div>
      <div class="rounded-xl border border-indigo-200/70 dark:border-indigo-700/60 bg-indigo-50/50 dark:bg-indigo-900/20 p-4 whitespace-pre-wrap text-sm leading-relaxed text-slate-700 dark:text-slate-200">
        {{ comparisonAnalysisText }}
      </div>
    </div>
  </section>

  <section *ngIf="visibleRows.length > 0" class="glass-card p-0 overflow-hidden">
    <div class="border-b border-slate-200/60 dark:border-slate-700/60 px-6 py-3 flex items-center justify-between">
      <div class="text-sm text-slate-600 dark:text-slate-300">
        <strong>{{ visibleRows.length }}</strong> filas visibles |
        <strong>{{ allNodes.length }}</strong> total de items
      </div>
      <div class="flex items-center gap-4">
        <label class="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 cursor-pointer">
          <input type="checkbox" class="accent-emerald-600" [(ngModel)]="showCompletedTime">
          <span>Completado</span>
        </label>
        <label class="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 cursor-pointer" *ngIf="baselineFileName">
          <input type="checkbox" class="accent-amber-600" [(ngModel)]="showBaselineTime">
          <span>Excel</span>
        </label>
      </div>
    </div>

    <div class="overflow-auto">
      <div class="min-w-[1100px]">
        <div class="flex sticky top-0 z-20 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm border-b border-slate-200 dark:border-slate-700">
          <div class="sticky left-0 z-30 shrink-0 border-r border-slate-200 dark:border-slate-700 bg-white/90 dark:bg-slate-900/90" [style.width.px]="itemColumnWidth + 290">
            <div class="flex text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              <div class="w-[90px] px-3 py-3 border-r border-slate-200 dark:border-slate-700">ID</div>
              <div class="w-[120px] px-3 py-3 border-r border-slate-200 dark:border-slate-700">Type</div>
              <div class="relative px-3 py-3 border-r border-slate-200 dark:border-slate-700" [style.width.px]="itemColumnWidth">
                Item
                <div class="absolute right-0 top-0 h-full w-2 cursor-col-resize" (mousedown)="onResizeStart($event)"></div>
              </div>
              <div class="w-[80px] px-3 py-3 border-r border-slate-200 dark:border-slate-700 text-right">Plan</div>
              <div class="w-[80px] px-3 py-3 text-right">Real</div>
            </div>
          </div>

          <div class="flex-1 relative" [style.minWidth.px]="getTimelineMinWidthPx()">
            <div class="grid text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400"
              [style.gridTemplateColumns]="'repeat(' + sprintDays.length + ', minmax(40px, 1fr))'">
              <div
                *ngFor="let day of sprintDays"
                class="px-2 py-3 text-center border-l border-slate-200/60 dark:border-slate-700/60"
                [ngClass]="{
                  '!bg-indigo-100 dark:!bg-indigo-900/50 !text-indigo-700 dark:!text-indigo-200': day.isSprintStart,
                  '!bg-fuchsia-100 dark:!bg-fuchsia-900/50 !text-fuchsia-700 dark:!text-fuchsia-200': day.isSprintEnd
                }"
                [title]="formatDayTooltip(day.date)">
                {{ day.label }}
              </div>
            </div>
            <div class="absolute top-0 bottom-0 w-[2px] bg-indigo-500/80 pointer-events-auto"
              [style.left.%]="sprintStartLinePct"
              [title]="'Inicio sprint: ' + sprintStartFullDate">
            </div>
            <div class="absolute top-0 bottom-0 w-[2px] bg-fuchsia-500/80 pointer-events-auto"
              [style.left.%]="sprintEndLinePct"
              [title]="'Fin sprint: ' + sprintEndFullDate">
            </div>
            <div *ngIf="hasDelayedEndLine" class="absolute top-0 bottom-0 w-[2px] bg-red-600/90 pointer-events-auto"
              [style.left.%]="delayedEndLinePct"
              [title]="'Fin real por desfase: ' + delayedEndFullDate">
            </div>
          </div>
        </div>

        <div class="flex border-b border-slate-200/60 dark:border-slate-700/60" *ngFor="let row of visibleRows">
          <div class="sticky left-0 z-10 shrink-0 border-r border-slate-200/60 dark:border-slate-700/60 bg-white dark:bg-slate-900" [style.width.px]="itemColumnWidth + 290">
            <div class="flex text-sm">
              <div class="w-[90px] px-3 py-2 border-r border-slate-200/60 dark:border-slate-700/60">
                <a *ngIf="isAzureNode(row.node)" class="text-indigo-600 hover:underline dark:text-indigo-400 font-medium" [href]="row.node.webUrl" target="_blank" rel="noopener noreferrer">
                  {{ getDisplayId(row.node.id) }}
                </a>
                <span *ngIf="!isAzureNode(row.node)" class="text-slate-700 dark:text-slate-200 font-medium">{{ getDisplayId(row.node.id) }}</span>
              </div>
              <div class="w-[120px] px-3 py-2 border-r border-slate-200/60 dark:border-slate-700/60 text-slate-600 dark:text-slate-300 truncate">
                {{ row.node.type }}
              </div>
              <div class="px-3 py-2 border-r border-slate-200/60 dark:border-slate-700/60" [style.width.px]="itemColumnWidth">
                <div class="flex items-center gap-2" [style.paddingLeft.px]="getRowIndentPx(row.node)">
                  <button
                    *ngIf="row.node.childIds.length > 0"
                    class="w-5 h-5 rounded border border-slate-300 dark:border-slate-600 text-xs leading-none cursor-pointer"
                    (click)="toggleRow(row.node.id)">
                    {{ isCollapsed(row.node.id) ? '+' : '-' }}
                  </button>
                  <span *ngIf="row.node.childIds.length === 0" class="w-5"></span>
                  <img *ngIf="row.node.assignedToAvatarUrl" [src]="row.node.assignedToAvatarUrl" alt="avatar" class="w-5 h-5 rounded-full shrink-0">
                  <div *ngIf="!row.node.assignedToAvatarUrl" class="w-5 h-5 rounded-full bg-slate-300 dark:bg-slate-700 shrink-0"></div>
                  <div class="min-w-0">
                    <div class="truncate text-slate-800 dark:text-slate-100">{{ row.node.title }}</div>
                    <div class="text-[11px] text-slate-500 dark:text-slate-400 truncate">{{ row.node.assignedToName }}</div>
                  </div>
                </div>
              </div>
              <div class="w-[80px] px-3 py-2 border-r border-slate-200/60 dark:border-slate-700/60 text-right text-slate-700 dark:text-slate-200">
                {{ getPlannedHours(row.node.id) | number:'1.0-1' }}
              </div>
              <div class="w-[80px] px-3 py-2 text-right" [ngClass]="row.node.childIds.length > 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-500 dark:text-slate-400'">
                {{ getRealHours(row.node.id) === null ? 'N/A' : (getRealHours(row.node.id)! | number:'1.0-1') }}
              </div>
            </div>
          </div>

          <div class="flex-1 relative h-14" [style.minWidth.px]="getTimelineMinWidthPx()">
            <div class="absolute inset-0 grid"
              [style.gridTemplateColumns]="'repeat(' + sprintDays.length + ', minmax(40px, 1fr))'">
              <div *ngFor="let day of sprintDays" class="border-l border-slate-200/40 dark:border-slate-700/40"></div>
            </div>

            <div *ngIf="showBaselineTime && hasBaselineForNode(row.node.id)" class="absolute top-[12px] h-2 rounded-full bg-amber-500/90"
              [style.left.%]="getBaselineBarLeftPct(row.node.id)"
              [style.width.%]="getBaselineBarWidthPct(row.node.id)"
              [title]="getBaselineBarTitle(row.node.id)">
            </div>

            <div *ngIf="showCompletedTime"
              class="absolute top-[22px] h-3 rounded-full"
              [ngClass]="getCompletedBarClass(row.node)"
              [style.left.%]="getRealBarLeftPct(row.node)"
              [style.width.%]="getRealBarWidthPct(row.node)"
              [title]="getRealHours(row.node.id) === null ? 'Real N/A' : ('Real: ' + (getRealHours(row.node.id)! | number:'1.0-1') + 'h / Cierre: ' + (getNodeClosedDateLabel(row.node) || 'Sin cierre'))">
            </div>

            <div class="absolute top-0 bottom-0 w-[2px] bg-indigo-500/70" [style.left.%]="sprintStartLinePct" [title]="'Inicio sprint: ' + sprintStartFullDate"></div>
            <div class="absolute top-0 bottom-0 w-[2px] bg-fuchsia-500/70" [style.left.%]="sprintEndLinePct" [title]="'Fin sprint: ' + sprintEndFullDate"></div>
            <div *ngIf="hasDelayedEndLine" class="absolute top-0 bottom-0 w-[2px] bg-red-600/80" [style.left.%]="delayedEndLinePct" [title]="'Fin real por desfase: ' + delayedEndFullDate"></div>
          </div>
        </div>
      </div>
    </div>
  </section>
</div>
  `
})
export class SprintGanttComponent implements OnInit, OnDestroy {
  private readonly mexicoTimeZone = 'America/Mexico_City';
  private readonly administrativeNodeId = -1;
  private sprintGanttService = inject(SprintGanttService);
  private baselineService = inject(SprintGanttBaselineService);
  private aiService = inject(AIService);

  hasPatConfigured = false;
  loadingCatalogs = false;
  loadingData = false;
  errorMessage = '';

  organizations: AdoOrganization[] = [];
  projects: AdoProject[] = [];
  teams: AdoTeam[] = [];
  sprints: AdoSprint[] = [];
  private loadedSprintStartDate: string | null = null;
  private loadedSprintFinishDate: string | null = null;

  selectedOrganization = '';
  selectedProjectId = '';
  selectedTeamId = '';
  selectedSprintId = '';

  allNodes: SprintHierarchyNode[] = [];
  allNodesMap = new Map<number, SprintHierarchyNode>();
  visibleRows: VisibleNodeRow[] = [];
  collapsedRows = new Set<number>();
  realHoursByNode = new Map<number, number | null>();
  plannedHoursByNode = new Map<number, number>();
  plannedStartHoursByNode = new Map<number, number>();

  sprintDays: SprintDay[] = [];
  sprintStartFullDate = '';
  sprintEndFullDate = '';
  delayedEndFullDate = '';
  sprintStartLinePct = 0;
  sprintEndLinePct = 100;
  delayedEndLinePct = 100;
  hasDelayedEndLine = false;
  private sprintStartKey = '';
  private sprintEndKey = '';
  private sprintWindowStartKey = '';
  private sprintWindowEndKey = '';

  itemColumnWidth = 420;
  private isResizing = false;
  private resizeStartX = 0;
  private resizeStartWidth = 420;
  private moveListener: ((event: MouseEvent) => void) | null = null;
  private upListener: ((event: MouseEvent) => void) | null = null;
  showCompletedTime = true;
  showBaselineTime = true;
  isBaselinePanelCollapsed = true;
  isAnalyzingComparison = false;
  comparisonAnalysisText = '';
  comparisonAnalysisCopied = false;
  baselineFileName = '';
  baselineWarnings: string[] = [];
  baselineSummary: BaselineSummary = {
    totalRows: 0,
    matchedRows: 0,
    unmatchedRows: 0,
    matchedOnTime: 0,
    matchedLate: 0
  };
  personComparison: SprintPersonComparisonSummary[] = [];
  private baselineByNode = new Map<number, BaselineComparisonNode>();
  private assignmentEvents: SprintAssignmentEvent[] = [];
  private rawBaselineResult: SprintBaselineParseResult | null = null;

  get canLoadGantt(): boolean {
    return Boolean(this.selectedOrganization && this.selectedProjectId && this.selectedTeamId && this.selectedSprintId && this.hasPatConfigured);
  }

  get canGenerateComparisonAnalysis(): boolean {
    return Boolean(
      this.baselineFileName &&
      this.baselineSummary.matchedRows > 0 &&
      this.selectedSprintId &&
      !this.loadingData &&
      !this.isAnalyzingComparison
    );
  }

  ngOnInit(): void {
    this.hasPatConfigured = this.sprintGanttService.hasPatConfigured();
    if (!this.hasPatConfigured) {
      return;
    }
    this.loadOrganizations();
  }

  ngOnDestroy(): void {
    this.removeResizeListeners();
  }

  onOrganizationChange(): void {
    this.selectedProjectId = '';
    this.selectedTeamId = '';
    this.selectedSprintId = '';
    this.projects = [];
    this.teams = [];
    this.sprints = [];
    this.clearData();
    if (!this.selectedOrganization) {
      return;
    }
    this.loadProjects();
  }

  onProjectChange(): void {
    this.selectedTeamId = '';
    this.selectedSprintId = '';
    this.teams = [];
    this.sprints = [];
    this.clearData();
    if (!this.selectedProjectId) {
      return;
    }
    this.loadTeams();
  }

  onTeamChange(): void {
    this.selectedSprintId = '';
    this.sprints = [];
    this.clearData();
    if (!this.selectedTeamId) {
      return;
    }
    this.loadSprints();
  }

  onSprintChange(): void {
    this.clearData();
    if (!this.selectedSprintId || this.loadingCatalogs || this.loadingData) {
      return;
    }
    this.loadGanttData();
  }

  loadGanttData(): void {
    if (!this.canLoadGantt) {
      return;
    }

    this.errorMessage = '';
    this.loadingData = true;
    const selectedProject = this.projects.find(project => project.id === this.selectedProjectId);
    const selectedSprint = this.sprints.find(sprint => sprint.id === this.selectedSprintId);
    const projectName = selectedProject?.name || '';
    const sprintPath = selectedSprint?.path || '';

    this.sprintGanttService
      .getSprintHierarchyNodes(this.selectedOrganization, projectName, this.selectedTeamId, this.selectedSprintId, sprintPath)
      .pipe(
        switchMap(nodes =>
          forkJoin({
            nodes: of(nodes),
            sprintRange: this.sprintGanttService
              .getSprintDateRange(this.selectedOrganization, projectName, this.selectedTeamId, this.selectedSprintId)
              .pipe(catchError(() => of({ startDate: selectedSprint?.startDate || null, finishDate: selectedSprint?.finishDate || null })))
          })
        ),
        switchMap(({ nodes, sprintRange }) => {
          const startDate = sprintRange.startDate || selectedSprint?.startDate || null;
          const finishDate = sprintRange.finishDate || selectedSprint?.finishDate || null;
          const nodeIds = nodes.map(node => node.id);
          return this.sprintGanttService.getSprintAssignmentHistory(
            this.selectedOrganization,
            projectName,
            nodeIds,
            startDate,
            finishDate
          ).pipe(
            catchError(() => of([])),
            switchMap(events => of({ nodes, sprintRange, events }))
          );
        })
      )
      .subscribe({
        next: ({ nodes, sprintRange, events }) => {
          this.loadingData = false;
          this.loadedSprintStartDate = sprintRange.startDate || selectedSprint?.startDate || null;
          this.loadedSprintFinishDate = sprintRange.finishDate || selectedSprint?.finishDate || null;
          this.assignmentEvents = events;
          this.allNodes = this.sortNodesWithOrphansFirst(this.attachAdministrativeTasksSection(nodes));
          this.allNodesMap = new Map<number, SprintHierarchyNode>(this.allNodes.map(node => [node.id, node]));
          this.initializeCollapsedState(this.allNodes);
          this.recalculateRealHours();
          this.recalculatePlannedHours();
          this.rebuildVisibleRows();
          this.buildSprintTimeline();
          this.rebuildBaselineComparison();
          if (this.allNodes.length === 0) {
            this.errorMessage = 'No se encontraron work items en el sprint seleccionado.';
          }
        },
        error: () => {
          this.loadingData = false;
          this.errorMessage = 'No fue posible cargar el Gantt del sprint.';
        }
      });
  }

  isCollapsed(nodeId: number): boolean {
    return this.collapsedRows.has(nodeId);
  }

  toggleRow(nodeId: number): void {
    if (this.collapsedRows.has(nodeId)) {
      this.collapsedRows.delete(nodeId);
    } else {
      this.collapsedRows.add(nodeId);
    }
    this.rebuildVisibleRows();
  }

  getRealHours(nodeId: number): number | null {
    return this.realHoursByNode.get(nodeId) ?? null;
  }

  getPlannedHours(nodeId: number): number {
    return this.plannedHoursByNode.get(nodeId) ?? 0;
  }

  getPlanBarLeftPct(node: SprintHierarchyNode): number {
    return this.getDateRangeBar(node, 'plan').leftPct;
  }

  getPlanBarWidthPct(node: SprintHierarchyNode): number {
    return this.getDateRangeBar(node, 'plan').widthPct;
  }

  getRealBarLeftPct(node: SprintHierarchyNode): number {
    return this.getDateRangeBar(node, 'real').leftPct;
  }

  getRealBarWidthPct(node: SprintHierarchyNode): number {
    return this.getDateRangeBar(node, 'real').widthPct;
  }

  onBaselineFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }

    this.errorMessage = '';
    this.baselineFileName = file.name;
    this.isBaselinePanelCollapsed = true;
    this.resetComparisonAnalysisState();
    file.arrayBuffer()
      .then(buffer => {
        this.rawBaselineResult = this.baselineService.parseTimelineWorkbook(buffer);
        this.baselineWarnings = this.rawBaselineResult.warnings;
        this.rebuildBaselineComparison();
      })
      .catch(() => {
        this.rawBaselineResult = null;
        this.baselineByNode.clear();
        this.baselineWarnings = ['No se pudo procesar el archivo Excel.'];
        this.baselineSummary = {
          totalRows: 0,
          matchedRows: 0,
          unmatchedRows: 0,
          matchedOnTime: 0,
          matchedLate: 0
        };
        this.personComparison = [];
        this.resetComparisonAnalysisState();
        this.errorMessage = 'No fue posible importar el baseline de Excel.';
      })
      .finally(() => {
        input.value = '';
      });
  }

  hasBaselineForNode(nodeId: number): boolean {
    return this.baselineByNode.has(nodeId);
  }

  getBaselineBarLeftPct(nodeId: number): number {
    return this.getBaselineBar(nodeId).leftPct;
  }

  getBaselineBarWidthPct(nodeId: number): number {
    return this.getBaselineBar(nodeId).widthPct;
  }

  getBaselineBarTitle(nodeId: number): string {
    const baseline = this.baselineByNode.get(nodeId);
    if (!baseline) {
      return 'Sin baseline';
    }
    const startLabel = this.formatDayTooltip(this.dayKeyToDate(baseline.startKey));
    const endLabel = this.formatDayTooltip(this.dayKeyToDate(baseline.endKey));
    return `Excel: ${startLabel} a ${endLabel}${baseline.hasLateEnd ? ' (cierre tardío)' : ''}`;
  }

  toggleBaselinePanel(): void {
    this.isBaselinePanelCollapsed = !this.isBaselinePanelCollapsed;
  }

  runComparisonAnalysis(): void {
    if (!this.canGenerateComparisonAnalysis) {
      return;
    }

    const input = this.buildComparisonAiInput();
    if (!input) {
      this.errorMessage = 'No hay suficientes datos para generar el análisis IA.';
      return;
    }

    this.errorMessage = '';
    this.isAnalyzingComparison = true;
    this.comparisonAnalysisCopied = false;
    this.comparisonAnalysisText = '';

    this.aiService.analyzeGanttComparison(input).subscribe({
      next: response => {
        const isErrorResponse = response && (
          response.startsWith('Error al') ||
          response.startsWith('El análisis tardó') ||
          response.startsWith('Cuota de') ||
          response.startsWith('API Key de') ||
          response.startsWith('AI Configuration') ||
          response.startsWith('Configuración de IA')
        );
        if (isErrorResponse) {
          this.errorMessage = response;
          this.isAnalyzingComparison = false;
          return;
        }

        this.comparisonAnalysisText = response;
        this.isAnalyzingComparison = false;
        this.saveComparisonAnalysisCache(response);
      },
      error: () => {
        this.isAnalyzingComparison = false;
        this.errorMessage = 'Error al generar análisis IA de comparación.';
      }
    });
  }

  copyComparisonAnalysis(): void {
    if (!this.comparisonAnalysisText) {
      return;
    }
    navigator.clipboard.writeText(this.comparisonAnalysisText).then(() => {
      this.comparisonAnalysisCopied = true;
      setTimeout(() => {
        this.comparisonAnalysisCopied = false;
      }, 2000);
    }).catch(() => {
      this.errorMessage = 'No se pudo copiar el análisis al portapapeles.';
    });
  }

  getTimelineMinWidthPx(): number {
    return Math.max(700, this.sprintDays.length * 40);
  }

  getNodeClosedDateLabel(node: SprintHierarchyNode): string | null {
    const closedKey = this.getNodeRealClosedDayKey(node);
    return closedKey ? this.formatDayTooltip(this.dayKeyToDate(closedKey)) : null;
  }

  getCompletedBarClass(node: SprintHierarchyNode): string {
    const realHours = this.getRealHours(node.id);
    if (realHours === null) {
      return 'bg-slate-400/80';
    }
    if (this.isClosedOutsideSprint(node)) {
      return 'bg-red-500/90';
    }
    if (this.isTaskType(node.type)) {
      const task = this.buildWorkflowTask(node);
      if (task.role === 'qa') {
        return 'bg-orange-500/90';
      }
      if (task.stage === 'dev-analysis') {
        return 'bg-violet-500/90';
      }
    }
    return 'bg-emerald-500/90';
  }

  isClosedOutsideSprint(node: SprintHierarchyNode): boolean {
    const closedKey = this.getNodeRealClosedDayKey(node);
    if (!closedKey || !this.sprintWindowEndKey) {
      return false;
    }
    return closedKey > this.sprintWindowEndKey;
  }

  onResizeStart(event: MouseEvent): void {
    event.preventDefault();
    this.isResizing = true;
    this.resizeStartX = event.clientX;
    this.resizeStartWidth = this.itemColumnWidth;
    this.moveListener = this.onResizeMove.bind(this);
    this.upListener = this.onResizeEnd.bind(this);
    window.addEventListener('mousemove', this.moveListener);
    window.addEventListener('mouseup', this.upListener);
  }

  formatDayTooltip(date: Date): string {
    return new Intl.DateTimeFormat('es-MX', {
      timeZone: this.mexicoTimeZone,
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(date);
  }

  getDisplayId(nodeId: number): string {
    return nodeId === this.administrativeNodeId ? 'ADM' : String(nodeId);
  }

  isAzureNode(node: SprintHierarchyNode): boolean {
    return node.id !== this.administrativeNodeId && node.webUrl.startsWith('http');
  }

  getRowIndentPx(node: SprintHierarchyNode): number {
    if (node.id === this.administrativeNodeId || node.parentId === null) {
      return 0;
    }
    return 16;
  }

  private loadOrganizations(): void {
    this.loadingCatalogs = true;
    this.sprintGanttService.getOrganizations().subscribe({
      next: orgs => {
        this.organizations = orgs;
        const defaultOrganization = this.sprintGanttService.getDefaultOrganization();
        const selected = orgs.find(org => org.name.toLowerCase() === defaultOrganization.toLowerCase()) || orgs[0];
        this.selectedOrganization = selected?.name || '';
        this.loadingCatalogs = false;
        if (this.selectedOrganization) {
          this.loadProjects();
        }
      },
      error: () => {
        this.loadingCatalogs = false;
        this.errorMessage = 'No fue posible cargar las organizaciones.';
      }
    });
  }

  private loadProjects(): void {
    this.loadingCatalogs = true;
    this.sprintGanttService.getProjects(this.selectedOrganization).subscribe({
      next: projects => {
        this.projects = projects;
        const defaultProject = this.sprintGanttService.getDefaultProject();
        const selected = projects.find(project => project.name.toLowerCase() === defaultProject.toLowerCase()) || projects[0];
        this.selectedProjectId = selected?.id || '';
        this.loadingCatalogs = false;
        if (this.selectedProjectId) {
          this.loadTeams();
        }
      },
      error: () => {
        this.loadingCatalogs = false;
        this.errorMessage = 'No fue posible cargar los proyectos.';
      }
    });
  }

  private loadTeams(): void {
    if (!this.selectedOrganization || !this.selectedProjectId) {
      return;
    }
    this.loadingCatalogs = true;
    this.sprintGanttService.getTeams(this.selectedOrganization, this.selectedProjectId).subscribe({
      next: teams => {
        this.teams = teams.filter(team => team.name.trim().toLowerCase() === 'mayansoft');
        this.selectedTeamId = this.teams[0]?.id || '';
        this.loadingCatalogs = false;
        if (this.selectedTeamId) {
          this.loadSprints();
        } else {
          this.errorMessage = 'No se encontró el team Mayansoft para este proyecto.';
        }
      },
      error: () => {
        this.loadingCatalogs = false;
        this.errorMessage = 'No fue posible cargar los teams.';
      }
    });
  }

  private loadSprints(): void {
    if (!this.selectedOrganization || !this.selectedProjectId || !this.selectedTeamId) {
      return;
    }
    this.loadingCatalogs = true;
    const selectedProject = this.projects.find(project => project.id === this.selectedProjectId);
    if (!selectedProject) {
      this.loadingCatalogs = false;
      return;
    }

    this.sprintGanttService.getSprints(this.selectedOrganization, selectedProject.name, this.selectedTeamId).subscribe({
      next: sprints => {
        this.sprints = sprints;
        this.selectedSprintId = sprints[sprints.length - 1]?.id || '';
        this.loadingCatalogs = false;
      },
      error: () => {
        this.loadingCatalogs = false;
        this.errorMessage = 'No fue posible cargar los sprints.';
      }
    });
  }

  private sortNodesWithOrphansFirst(nodes: SprintHierarchyNode[]): SprintHierarchyNode[] {
    const nodeMap = new Map<number, SprintHierarchyNode>();
    nodes.forEach(node => nodeMap.set(node.id, node));
    const roots = nodes
      .filter(node => node.parentId === null || !nodeMap.has(node.parentId))
      .sort((a, b) => {
        if (a.id === this.administrativeNodeId || b.id === this.administrativeNodeId) {
          return a.id === this.administrativeNodeId ? -1 : 1;
        }
        if (a.missingParent !== b.missingParent) {
          return a.missingParent ? -1 : 1;
        }
        return a.id - b.id;
      });

    const ordered: SprintHierarchyNode[] = [];
    const visited = new Set<number>();
    roots.forEach(root => this.pushDepthFirst(root, nodeMap, visited, ordered));
    nodes.forEach(node => {
      if (!visited.has(node.id)) {
        this.pushDepthFirst(node, nodeMap, visited, ordered);
      }
    });
    return ordered;
  }

  private attachAdministrativeTasksSection(nodes: SprintHierarchyNode[]): SprintHierarchyNode[] {
    const clonedNodes = nodes.map(node => ({
      ...node,
      childIds: [...node.childIds]
    }));
    const nodeMap = new Map<number, SprintHierarchyNode>();
    clonedNodes.forEach(node => nodeMap.set(node.id, node));

    const administrativeChildren = clonedNodes.filter(node =>
      node.type.toLowerCase() === 'task' && (node.parentId === null || !nodeMap.has(node.parentId))
    );

    if (administrativeChildren.length === 0) {
      return clonedNodes;
    }

    administrativeChildren.forEach(taskNode => {
      taskNode.parentId = this.administrativeNodeId;
      taskNode.missingParent = false;
    });

    const administrativeNode: SprintHierarchyNode = {
      id: this.administrativeNodeId,
      type: 'Sección',
      title: 'Tareas administrativas',
      parentId: null,
      missingParent: false,
      childIds: administrativeChildren.map(child => child.id).sort((a, b) => a - b),
      originalEstimate: 0,
      completedWork: 0,
      activatedDate: null,
      closedDate: null,
      assignedToName: 'Sin asignar',
      assignedToAvatarUrl: null,
      areaPath: '',
      iterationPath: '',
      webUrl: ''
    };

    return [administrativeNode, ...clonedNodes];
  }

  private pushDepthFirst(
    node: SprintHierarchyNode,
    nodeMap: Map<number, SprintHierarchyNode>,
    visited: Set<number>,
    ordered: SprintHierarchyNode[]
  ): void {
    if (visited.has(node.id)) {
      return;
    }
    visited.add(node.id);
    ordered.push(node);
    node.childIds.forEach(childId => {
      const child = nodeMap.get(childId);
      if (child) {
        this.pushDepthFirst(child, nodeMap, visited, ordered);
      }
    });
  }

  private initializeCollapsedState(nodes: SprintHierarchyNode[]): void {
    this.collapsedRows.clear();
    nodes.forEach(node => {
      if (node.childIds.length > 0) {
        this.collapsedRows.add(node.id);
      }
    });
  }

  private recalculateRealHours(): void {
    this.realHoursByNode.clear();
    const nodeMap = new Map<number, SprintHierarchyNode>();
    this.allNodes.forEach(node => nodeMap.set(node.id, node));

    const cache = new Map<number, { hours: number; taskCount: number }>();
    const summarizeTaskCompletedWork = (nodeId: number): { hours: number; taskCount: number } => {
      if (cache.has(nodeId)) {
        return cache.get(nodeId) || { hours: 0, taskCount: 0 };
      }
      const node = nodeMap.get(nodeId);
      if (!node) {
        return { hours: 0, taskCount: 0 };
      }

      let totalHours = this.isTaskType(node.type) ? node.completedWork : 0;
      let totalTasks = this.isTaskType(node.type) ? 1 : 0;
      node.childIds.forEach(childId => {
        const childSummary = summarizeTaskCompletedWork(childId);
        totalHours += childSummary.hours;
        totalTasks += childSummary.taskCount;
      });
      const summary = { hours: totalHours, taskCount: totalTasks };
      cache.set(nodeId, summary);
      return summary;
    };

    this.allNodes.forEach(node => {
      if (this.isTaskType(node.type)) {
        this.realHoursByNode.set(node.id, node.completedWork);
      } else {
        let totalHours = 0;
        let totalTasks = 0;
        node.childIds.forEach(childId => {
          const summary = summarizeTaskCompletedWork(childId);
          totalHours += summary.hours;
          totalTasks += summary.taskCount;
        });
        if (this.isParentItemType(node.type) || node.id === this.administrativeNodeId) {
          this.realHoursByNode.set(node.id, totalHours);
        } else {
          this.realHoursByNode.set(node.id, totalTasks > 0 ? totalHours : null);
        }
      }
    });
  }

  private recalculatePlannedHours(): void {
    this.plannedHoursByNode.clear();
    this.plannedStartHoursByNode.clear();
    const nodeMap = new Map<number, SprintHierarchyNode>();
    this.allNodes.forEach(node => nodeMap.set(node.id, node));

    const parentItems = this.allNodes.filter(node => this.isParentItemType(node.type));
    let sprintPlannedCursorHours = this.getSprintKickoffHours();

    parentItems.forEach(parentItem => {
      const descendantTasks = this.getDescendantTasks(parentItem.id, nodeMap);
      const plan = this.calculateWorkflowPlan(descendantTasks);

      this.plannedStartHoursByNode.set(parentItem.id, sprintPlannedCursorHours);
      this.plannedHoursByNode.set(parentItem.id, plan.totalHours);

      descendantTasks.forEach(task => {
        const relativeStart = plan.startByTaskId.get(task.id) || 0;
        this.plannedStartHoursByNode.set(task.id, sprintPlannedCursorHours + relativeStart);
        this.plannedHoursByNode.set(task.id, Math.max(0, task.originalEstimate));
      });

      const childNodes = this.getDescendants(parentItem.id, nodeMap).filter(node => !this.isTaskType(node.type));
      childNodes.forEach(child => {
        const childTaskIds = this.getDescendantTasks(child.id, nodeMap).map(task => task.id);
        const childStarts = childTaskIds
          .map(id => this.plannedStartHoursByNode.get(id))
          .filter((value): value is number => typeof value === 'number');
        const childHours = childTaskIds.reduce((sum, id) => sum + (this.plannedHoursByNode.get(id) || 0), 0);
        if (childStarts.length > 0) {
          this.plannedStartHoursByNode.set(child.id, Math.min(...childStarts));
        } else {
          this.plannedStartHoursByNode.set(child.id, sprintPlannedCursorHours);
        }
        this.plannedHoursByNode.set(child.id, childHours);
      });

      sprintPlannedCursorHours += plan.totalHours;
    });

    this.allNodes.forEach(node => {
      if (!this.plannedHoursByNode.has(node.id)) {
        this.plannedHoursByNode.set(node.id, Math.max(0, node.originalEstimate));
      }
      if (!this.plannedStartHoursByNode.has(node.id)) {
        this.plannedStartHoursByNode.set(node.id, this.getSprintKickoffHours());
      }
    });

    const adminNode = this.allNodes.find(node => node.id === this.administrativeNodeId);
    if (adminNode) {
      const adminTasks = this.getDescendantTasks(adminNode.id, nodeMap);
      const adminPlan = adminTasks.reduce((sum, task) => sum + Math.max(0, task.originalEstimate), 0);
      this.plannedHoursByNode.set(adminNode.id, adminPlan);
      this.plannedStartHoursByNode.set(adminNode.id, this.getSprintKickoffHours());
    }
  }

  private rebuildVisibleRows(): void {
    const nodeMap = new Map<number, SprintHierarchyNode>();
    this.allNodes.forEach(node => nodeMap.set(node.id, node));
    const roots = this.allNodes.filter(node => node.parentId === null || !nodeMap.has(node.parentId));
    const rows: VisibleNodeRow[] = [];

    const visit = (node: SprintHierarchyNode, depth: number): void => {
      rows.push({ node, depth });
      if (this.collapsedRows.has(node.id)) {
        return;
      }
      node.childIds.forEach(childId => {
        const child = nodeMap.get(childId);
        if (child) {
          visit(child, depth + 1);
        }
      });
    };

    roots.forEach(root => visit(root, 0));
    this.visibleRows = rows;
  }

  private buildSprintTimeline(): void {
    const selectedSprint = this.sprints.find(sprint => sprint.id === this.selectedSprintId);
    const sprintStartSource = this.loadedSprintStartDate || selectedSprint?.startDate || null;
    const sprintEndSource = this.loadedSprintFinishDate || selectedSprint?.finishDate || null;
    let sprintStartKey = this.toDayKeyFromAdoDate(sprintStartSource);
    let sprintEndKey = this.toDayKeyFromAdoDate(sprintEndSource);

    if (!sprintStartKey || !sprintEndKey || sprintStartKey > sprintEndKey) {
      const todayKey = this.toMexicoDayKey(new Date());
      sprintStartKey = todayKey;
      sprintEndKey = this.addDaysToDayKey(todayKey, 13);
    }

    this.sprintWindowStartKey = sprintStartKey;
    this.sprintWindowEndKey = sprintEndKey;

    let timelineStartKey = sprintStartKey;
    let timelineEndKey = sprintEndKey;
    const maxClosedKey = this.getMaxClosedDateKeyFromNodes();
    if (maxClosedKey && maxClosedKey > timelineEndKey) {
      timelineEndKey = maxClosedKey;
    }

    const days: SprintDay[] = [];
    let currentKey = timelineStartKey;
    while (currentKey <= timelineEndKey) {
      if (this.isWeekendDayKey(currentKey)) {
        currentKey = this.addDaysToDayKey(currentKey, 1);
        continue;
      }
      const day = this.dayKeyToDate(currentKey);
      const keyParts = currentKey.split('-').map(v => Number(v));
      days.push({
        date: day,
        key: currentKey,
        label: `${keyParts[2]}/${keyParts[1]}`,
        isSprintStart: false,
        isSprintEnd: false
      });
      currentKey = this.addDaysToDayKey(currentKey, 1);
    }
    if (days.length === 0) {
      const day = this.dayKeyToDate(sprintStartKey);
      const keyParts = sprintStartKey.split('-').map(v => Number(v));
      days.push({
        date: day,
        key: sprintStartKey,
        label: `${keyParts[2]}/${keyParts[1]}`,
        isSprintStart: true,
        isSprintEnd: true
      });
    }

    const startIndex = this.getClosestVisibleDayIndex(days, sprintStartKey, 'forward');
    const endIndex = this.getClosestVisibleDayIndex(days, sprintEndKey, 'backward');
    days[startIndex].isSprintStart = true;
    days[endIndex].isSprintEnd = true;

    this.sprintDays = days;
    this.sprintStartKey = timelineStartKey;
    this.sprintEndKey = timelineEndKey;
    this.sprintStartFullDate = this.formatDayTooltip(this.dayKeyToDate(sprintStartKey));
    this.sprintEndFullDate = this.formatDayTooltip(this.dayKeyToDate(sprintEndKey));
    this.hasDelayedEndLine = Boolean(maxClosedKey && maxClosedKey > sprintEndKey);
    this.delayedEndFullDate = this.hasDelayedEndLine
      ? this.formatDayTooltip(this.dayKeyToDate(maxClosedKey))
      : '';

    if (days.length <= 1) {
      this.sprintStartLinePct = 0;
      this.sprintEndLinePct = 100;
      this.delayedEndLinePct = 100;
      return;
    }
    const totalDays = Math.max(1, days.length);
    // Place milestone lines at the center of the corresponding day cell.
    this.sprintStartLinePct = ((startIndex + 0.5) / totalDays) * 100;
    this.sprintEndLinePct = ((endIndex + 0.5) / totalDays) * 100;
    if (this.hasDelayedEndLine && maxClosedKey) {
      const delayedEndIndex = this.getClosestVisibleDayIndex(days, maxClosedKey, 'backward');
      this.delayedEndLinePct = ((delayedEndIndex + 0.5) / totalDays) * 100;
    } else {
      this.delayedEndLinePct = this.sprintEndLinePct;
    }
  }

  private toDayKeyFromAdoDate(value: string | null): string {
    if (!value) {
      return '';
    }
    const trimmed = value.trim();
    if (!trimmed) {
      return '';
    }

    const match = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      return `${match[1]}-${match[2]}-${match[3]}`;
    }

    const date = new Date(trimmed);
    if (Number.isNaN(date.getTime())) {
      return '';
    }
    return this.toMexicoDayKey(date);
  }

  private toMexicoDayKey(date: Date): string {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: this.mexicoTimeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).formatToParts(date);
    const year = parts.find(part => part.type === 'year')?.value || '1970';
    const month = parts.find(part => part.type === 'month')?.value || '01';
    const day = parts.find(part => part.type === 'day')?.value || '01';
    return `${year}-${month}-${day}`;
  }

  private dayKeyToDate(dayKey: string): Date {
    const [year, month, day] = dayKey.split('-').map(value => Number(value));
    return new Date(Date.UTC(year, month - 1, day, 12, 0, 0, 0));
  }

  private addDaysToDayKey(dayKey: string, days: number): string {
    const date = this.dayKeyToDate(dayKey);
    date.setUTCDate(date.getUTCDate() + days);
    return date.toISOString().slice(0, 10);
  }

  private getDateRangeBar(node: SprintHierarchyNode, mode: 'plan' | 'real'): { leftPct: number; widthPct: number } {
    if (!this.sprintStartKey || !this.sprintEndKey || this.sprintDays.length === 0) {
      return { leftPct: 0, widthPct: 0 };
    }

    let startKey = this.sprintStartKey;

    let endKey = startKey;
    if (mode === 'plan') {
      const plannedHours = this.getPlannedHours(node.id);
      const plannedStartHours = this.plannedStartHoursByNode.get(node.id) || this.getSprintKickoffHours();
      const plannedStartDaysOffset = Math.floor(plannedStartHours / this.getEffectiveHoursPerDay());
      const plannedDays = Math.max(1, Math.ceil(plannedHours / this.getEffectiveHoursPerDay()));
      const planStartKey = this.addDaysToDayKey(this.sprintStartKey, plannedStartDaysOffset);
      startKey = planStartKey;
      endKey = this.addDaysToDayKey(planStartKey, plannedDays - 1);
    } else {
      const closedKey = this.getNodeRealClosedDayKey(node);
      const activatedKey = this.getNodeRealStartDayKey(node) || closedKey || this.sprintStartKey;
      startKey = activatedKey;
      endKey = closedKey || activatedKey;
    }

    return this.clampDateRangeToTimeline(startKey, endKey);
  }

  private getBaselineBar(nodeId: number): { leftPct: number; widthPct: number } {
    const baseline = this.baselineByNode.get(nodeId);
    if (!baseline) {
      return { leftPct: 0, widthPct: 0 };
    }
    return this.clampDateRangeToTimeline(baseline.startKey, baseline.endKey);
  }

  private rebuildBaselineComparison(): void {
    this.baselineByNode.clear();
    this.personComparison = [];
    this.baselineSummary = {
      totalRows: this.rawBaselineResult?.rows.length || 0,
      matchedRows: 0,
      unmatchedRows: 0,
      matchedOnTime: 0,
      matchedLate: 0
    };

    const plannedPersonMarks = new Map<string, number>();
    const plannedPersonItems = new Map<string, Set<number>>();

    if (!this.rawBaselineResult || this.rawBaselineResult.rows.length === 0) {
      this.resetComparisonAnalysisState();
      return;
    }

    let unmatchedRows = 0;
    this.rawBaselineResult.rows.forEach(row => {
      const node = this.allNodesMap.get(row.workItemId);
      if (!node) {
        unmatchedRows++;
      } else {
        const realEnd = this.getNodeRealClosedDayKey(node);
        const hasLateEnd = Boolean(realEnd && realEnd > row.plannedEndKey);
        this.baselineByNode.set(row.workItemId, {
          startKey: row.plannedStartKey,
          endKey: row.plannedEndKey,
          plannedPeople: row.personMarks,
          hasLateEnd
        });
        this.baselineSummary.matchedRows++;
        if (hasLateEnd) {
          this.baselineSummary.matchedLate++;
        } else {
          this.baselineSummary.matchedOnTime++;
        }
      }

      const normalizedPeople = row.personMarks
        .map(person => this.baselineService.normalizePersonName(person))
        .filter(person => Boolean(person));

      normalizedPeople.forEach(person => {
        plannedPersonMarks.set(person, (plannedPersonMarks.get(person) || 0) + 1);
        const itemSet = plannedPersonItems.get(person) || new Set<number>();
        itemSet.add(row.workItemId);
        plannedPersonItems.set(person, itemSet);
      });
    });

    this.baselineSummary.unmatchedRows = unmatchedRows;
    this.buildPersonComparison(plannedPersonMarks, plannedPersonItems);
    this.restoreCachedComparisonAnalysis();
  }

  private buildComparisonAiInput(): GanttAiInput | null {
    if (!this.baselineFileName || this.baselineSummary.matchedRows <= 0) {
      return null;
    }

    const selectedProject = this.projects.find(project => project.id === this.selectedProjectId);
    const selectedTeam = this.teams.find(team => team.id === this.selectedTeamId);
    const selectedSprint = this.sprints.find(sprint => sprint.id === this.selectedSprintId);

    const itemSummaries = Array.from(this.baselineByNode.entries()).map(([workItemId, baseline]) => {
      const node = this.allNodesMap.get(workItemId);
      const realStart = node ? (this.getNodeRealStartDayKey(node) || '') : '';
      const realEnd = node ? (this.getNodeRealClosedDayKey(node) || '') : '';
      return {
        workItemId,
        title: node?.title || '',
        plannedStart: baseline.startKey,
        plannedEnd: baseline.endKey,
        realStart,
        realEnd,
        late: baseline.hasLateEnd
      };
    });
    const matchedItemIds = itemSummaries.map(item => item.workItemId);
    const taskLayer = this.buildTaskLayerSummary(matchedItemIds);

    return {
      organization: this.selectedOrganization,
      project: selectedProject?.name || this.selectedProjectId,
      team: selectedTeam?.name || this.selectedTeamId,
      sprint: selectedSprint?.name || this.selectedSprintId,
      baselineName: this.baselineFileName,
      summary: {
        totalRows: this.baselineSummary.totalRows,
        matchedRows: this.baselineSummary.matchedRows,
        unmatchedRows: this.baselineSummary.unmatchedRows,
        matchedOnTime: this.baselineSummary.matchedOnTime,
        matchedLate: this.baselineSummary.matchedLate
      },
      items: itemSummaries,
      people: this.personComparison.map(person => ({
        person: person.person,
        plannedMarks: person.plannedMarks,
        plannedItems: person.plannedItems,
        realAssignments: person.realAssignments,
        realItems: person.realItems
      })),
      taskLayer
    };
  }

  private buildTaskLayerSummary(matchedItemIds: number[]): {
    matchedItemsWithTasks: number;
    totalPlannedTaskHours: number;
    totalRealTaskHours: number;
    dependencyViolations: number;
    adminTaskCount: number;
    adminPlannedHours: number;
    adminRealHours: number;
    stageBreakdown: TaskStageAggregate[];
    relatedItemTaskContext: string[];
    relatedBugTaskContext: string[];
  } {
    const nodeMap = new Map<number, SprintHierarchyNode>(this.allNodes.map(node => [node.id, node]));
    const stageMap = new Map<string, TaskStageAggregate>();
    let matchedItemsWithTasks = 0;
    let totalPlannedTaskHours = 0;
    let totalRealTaskHours = 0;
    let dependencyViolations = 0;
    let adminTaskCount = 0;
    let adminPlannedHours = 0;
    let adminRealHours = 0;
    const relatedItemTaskContext: string[] = [];
    const relatedBugTaskContext: string[] = [];

    matchedItemIds.forEach(itemId => {
      const itemNode = nodeMap.get(itemId);
      if (!itemNode) {
        return;
      }
      const tasks = this.getDescendantTasks(itemId, nodeMap);
      if (tasks.length === 0) {
        return;
      }
      matchedItemsWithTasks++;

      const parentItemId = this.resolveAnalysisParentId(itemNode, nodeMap);
      if (parentItemId) {
        const parentNode = nodeMap.get(parentItemId);
        const associatedItems = Array.from(nodeMap.values()).filter(node =>
          node.id === parentItemId || node.parentId === parentItemId
        );
        associatedItems.forEach(associated => {
          const associatedTasks = this.isTaskType(associated.type)
            ? [associated]
            : this.getDescendantTasks(associated.id, nodeMap);
          if (associatedTasks.length > 0) {
            relatedItemTaskContext.push(
              `- Padre #${parentItemId} (${parentNode?.type || 'N/A'}) -> Item #${associated.id} (${associated.type}) con ${associatedTasks.length} tareas`
            );
          }
          if (associated.type.trim().toLowerCase() === 'bug') {
            const bugTaskHours = associatedTasks.reduce((acc, task) => acc + Math.max(0, task.originalEstimate), 0);
            relatedBugTaskContext.push(
              `- Bug #${associated.id}: ${associated.title} | Tareas hijas=${associatedTasks.length} | Horas plan=${bugTaskHours.toFixed(1)}h`
            );
          }
        });
      }

      const sequenceEndByStage = new Map<string, string>();
      tasks.forEach(taskNode => {
        const taskMeta = this.buildWorkflowTask(taskNode);
        const stage = this.normalizeTaskStageForAnalysis(taskMeta.stage);
        const plannedHours = Math.max(0, taskNode.originalEstimate);
        const realHours = Math.max(0, taskNode.completedWork);
        totalPlannedTaskHours += plannedHours;
        totalRealTaskHours += realHours;

        const aggregate = stageMap.get(stage) || { stage, plannedHours: 0, realHours: 0, taskCount: 0 };
        aggregate.plannedHours += plannedHours;
        aggregate.realHours += realHours;
        aggregate.taskCount += 1;
        stageMap.set(stage, aggregate);

        if (this.isAdministrativeAnalysisStage(stage)) {
          adminTaskCount += 1;
          adminPlannedHours += plannedHours;
          adminRealHours += realHours;
        }

        const taskClosedKey = this.getNodeRealClosedDayKey(taskNode);
        if (!taskClosedKey) {
          return;
        }
        const previousEnd = sequenceEndByStage.get(stage);
        if (!previousEnd || taskClosedKey > previousEnd) {
          sequenceEndByStage.set(stage, taskClosedKey);
        }
      });

      const codingEnd = sequenceEndByStage.get('codificacion');
      const peerEnd = sequenceEndByStage.get('peer-review');
      const iswEnd = sequenceEndByStage.get('pruebas-isw');
      const qaEnd = sequenceEndByStage.get('pruebas-ejecucion');

      if (codingEnd && peerEnd && peerEnd < codingEnd) {
        dependencyViolations++;
      }
      if (peerEnd && iswEnd && iswEnd < peerEnd) {
        dependencyViolations++;
      }
      if (iswEnd && qaEnd && qaEnd < iswEnd) {
        dependencyViolations++;
      }
    });

    const stageBreakdown = Array.from(stageMap.values())
      .map(stage => ({
        stage: stage.stage,
        plannedHours: Number(stage.plannedHours.toFixed(2)),
        realHours: Number(stage.realHours.toFixed(2)),
        taskCount: stage.taskCount
      }))
      .sort((a, b) => b.realHours - a.realHours);

    return {
      matchedItemsWithTasks,
      totalPlannedTaskHours: Number(totalPlannedTaskHours.toFixed(2)),
      totalRealTaskHours: Number(totalRealTaskHours.toFixed(2)),
      dependencyViolations,
      adminTaskCount,
      adminPlannedHours: Number(adminPlannedHours.toFixed(2)),
      adminRealHours: Number(adminRealHours.toFixed(2)),
      stageBreakdown,
      relatedItemTaskContext: Array.from(new Set(relatedItemTaskContext.values())),
      relatedBugTaskContext: Array.from(new Set(relatedBugTaskContext.values()))
    };
  }

  private resolveAnalysisParentId(node: SprintHierarchyNode, nodeMap: Map<number, SprintHierarchyNode>): number | null {
    if (!node) return null;
    if (this.isTaskType(node.type)) return node.parentId || null;
    if (node.type.trim().toLowerCase() === 'bug') return node.parentId || node.id;
    if (this.isParentItemType(node.type)) return node.id;
    if (node.parentId && nodeMap.has(node.parentId)) return node.parentId;
    return node.id;
  }

  private normalizeTaskStageForAnalysis(stage: string): string {
    const normalized = stage.trim().toLowerCase();
    if (normalized === 'dev-coding') {
      return 'codificacion';
    }
    if (normalized === 'reviewer-peer' || normalized === 'dev-review') {
      return 'peer-review';
    }
    if (normalized === 'post-review-isw') {
      return 'pruebas-isw';
    }
    if (normalized === 'qa-execution') {
      return 'pruebas-ejecucion';
    }
    if (normalized === 'kickoff' || normalized === 'daily-scrum' || normalized === 'closing') {
      return 'administrativa';
    }
    return normalized;
  }

  private isAdministrativeAnalysisStage(stage: string): boolean {
    return stage === 'administrativa';
  }

  private getComparisonAnalysisCacheKey(): string {
    return `cmmi5_gantt_ai_analysis_${this.selectedOrganization}_${this.selectedProjectId}_${this.selectedTeamId}_${this.selectedSprintId}`;
  }

  private getBaselineSignature(): string {
    const timelineDays = this.rawBaselineResult?.timelineDays.join(',') || '';
    return [
      this.baselineFileName,
      this.baselineSummary.totalRows,
      this.baselineSummary.matchedRows,
      this.baselineSummary.unmatchedRows,
      this.baselineSummary.matchedOnTime,
      this.baselineSummary.matchedLate,
      timelineDays
    ].join('|');
  }

  private saveComparisonAnalysisCache(text: string): void {
    const key = this.getComparisonAnalysisCacheKey();
    const payload: CachedGanttAiAnalysis = {
      baselineSignature: this.getBaselineSignature(),
      text
    };
    localStorage.setItem(key, JSON.stringify(payload));
  }

  private restoreCachedComparisonAnalysis(): void {
    const key = this.getComparisonAnalysisCacheKey();
    const raw = localStorage.getItem(key);
    if (!raw) {
      this.comparisonAnalysisText = '';
      return;
    }
    try {
      const parsed = JSON.parse(raw) as CachedGanttAiAnalysis;
      if (parsed.baselineSignature === this.getBaselineSignature()) {
        this.comparisonAnalysisText = parsed.text || '';
        this.comparisonAnalysisCopied = false;
        return;
      }
    } catch {
      this.errorMessage = 'Se detectó caché inválido de análisis IA y se descartó.';
    }
    this.comparisonAnalysisText = '';
  }

  private resetComparisonAnalysisState(): void {
    this.isAnalyzingComparison = false;
    this.comparisonAnalysisCopied = false;
    this.comparisonAnalysisText = '';
  }

  private buildPersonComparison(
    plannedPersonMarks: Map<string, number>,
    plannedPersonItems: Map<string, Set<number>>
  ): void {
    const realPersonAssignments = new Map<string, number>();
    const realPersonItems = new Map<string, Set<number>>();

    this.assignmentEvents.forEach(event => {
      const person = this.baselineService.normalizePersonName(event.assignedToName || '');
      if (!person) {
        return;
      }
      realPersonAssignments.set(person, (realPersonAssignments.get(person) || 0) + 1);
      const itemSet = realPersonItems.get(person) || new Set<number>();
      itemSet.add(event.workItemId);
      realPersonItems.set(person, itemSet);
    });

    const allPeople = new Set<string>([
      ...Array.from(plannedPersonMarks.keys()),
      ...Array.from(realPersonAssignments.keys())
    ]);

    const result: SprintPersonComparisonSummary[] = Array.from(allPeople.values())
      .map(person => ({
        person: this.toDisplayPersonName(person),
        plannedMarks: plannedPersonMarks.get(person) || 0,
        plannedItems: plannedPersonItems.get(person)?.size || 0,
        realAssignments: realPersonAssignments.get(person) || 0,
        realItems: realPersonItems.get(person)?.size || 0
      }))
      .sort((a, b) => a.person.localeCompare(b.person));

    this.personComparison = result;
  }

  private clampDateRangeToTimeline(startKey: string, endKey: string): { leftPct: number; widthPct: number } {
    if (!this.sprintStartKey || !this.sprintEndKey || this.sprintDays.length === 0) {
      return { leftPct: 0, widthPct: 0 };
    }
    const totalDays = this.sprintDays.length;
    const safeStartKey = startKey <= endKey ? startKey : endKey;
    const safeEndKey = startKey <= endKey ? endKey : startKey;
    const rangeIndexes = this.getVisibleRangeIndexes(safeStartKey, safeEndKey);
    if (!rangeIndexes) {
      return { leftPct: 0, widthPct: 0 };
    }
    const clampedStart = rangeIndexes.startIndex;
    const clampedEnd = rangeIndexes.endIndex;

    if (clampedEnd < clampedStart) {
      return { leftPct: 0, widthPct: 0 };
    }

    return {
      leftPct: (clampedStart / totalDays) * 100,
      widthPct: Math.max((1 / totalDays) * 100, ((clampedEnd - clampedStart + 1) / totalDays) * 100)
    };
  }

  private getNodeRealStartDayKey(node: SprintHierarchyNode): string | null {
    const ownActivated = this.toDayKeyFromAdoDate(node.activatedDate);
    if (ownActivated) {
      return ownActivated;
    }

    const childTaskDates = this.getDescendantTaskDayKeys(node.id);
    if (childTaskDates.activated.length > 0) {
      return childTaskDates.activated.reduce((min, current) => current < min ? current : min);
    }
    return null;
  }

  private getNodeRealClosedDayKey(node: SprintHierarchyNode): string | null {
    const ownClosed = this.toDayKeyFromAdoDate(node.closedDate);
    if (ownClosed) {
      return ownClosed;
    }

    const childTaskDates = this.getDescendantTaskDayKeys(node.id);
    if (childTaskDates.closed.length > 0) {
      return childTaskDates.closed.reduce((max, current) => current > max ? current : max);
    }
    return null;
  }

  private getDescendantTaskDayKeys(nodeId: number): { activated: string[]; closed: string[] } {
    const activated: string[] = [];
    const closed: string[] = [];
    const visited = new Set<number>();
    const walk = (currentId: number): void => {
      if (visited.has(currentId)) {
        return;
      }
      visited.add(currentId);
      const current = this.allNodesMap.get(currentId);
      if (!current) {
        return;
      }
      if (this.isTaskType(current.type)) {
        if (current.activatedDate) {
          const activatedDateKey = this.toDayKeyFromAdoDate(current.activatedDate);
          if (activatedDateKey) {
            activated.push(activatedDateKey);
          }
        }
        if (current.closedDate) {
          const closedDateKey = this.toDayKeyFromAdoDate(current.closedDate);
          if (closedDateKey) {
            closed.push(closedDateKey);
          }
        }
      }
      current.childIds.forEach(childId => walk(childId));
    };

    walk(nodeId);
    return { activated, closed };
  }

  private diffDays(from: Date, to: Date): number {
    const fromUtc = Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate());
    const toUtc = Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate());
    return Math.floor((toUtc - fromUtc) / (24 * 60 * 60 * 1000));
  }

  private isWeekendDayKey(dayKey: string): boolean {
    const day = this.dayKeyToDate(dayKey).getUTCDay();
    return day === 0 || day === 6;
  }

  private getClosestVisibleDayIndex(days: SprintDay[], targetKey: string, prefer: 'forward' | 'backward'): number {
    if (days.length === 0) {
      return 0;
    }
    const exactIndex = days.findIndex(day => day.key === targetKey);
    if (exactIndex >= 0) {
      return exactIndex;
    }
    if (prefer === 'forward') {
      for (let i = 0; i < days.length; i++) {
        if (days[i].key > targetKey) {
          return i;
        }
      }
      return days.length - 1;
    }
    for (let i = days.length - 1; i >= 0; i--) {
      if (days[i].key < targetKey) {
        return i;
      }
    }
    return 0;
  }

  private getVisibleRangeIndexes(startKey: string, endKey: string): { startIndex: number; endIndex: number } | null {
    if (this.sprintDays.length === 0) {
      return null;
    }
    let startIndex = -1;
    for (let i = 0; i < this.sprintDays.length; i++) {
      const dayKey = this.sprintDays[i].key;
      if (dayKey >= startKey && dayKey <= endKey) {
        startIndex = i;
        break;
      }
    }

    let endIndex = -1;
    for (let i = this.sprintDays.length - 1; i >= 0; i--) {
      const dayKey = this.sprintDays[i].key;
      if (dayKey >= startKey && dayKey <= endKey) {
        endIndex = i;
        break;
      }
    }

    if (startIndex >= 0 && endIndex >= 0) {
      return { startIndex, endIndex };
    }

    const firstVisible = this.sprintDays[0].key;
    const lastVisible = this.sprintDays[this.sprintDays.length - 1].key;
    if (endKey < firstVisible) {
      return { startIndex: 0, endIndex: 0 };
    }
    if (startKey > lastVisible) {
      const lastIndex = this.sprintDays.length - 1;
      return { startIndex: lastIndex, endIndex: lastIndex };
    }

    const anchorIndex = this.getClosestVisibleDayIndex(this.sprintDays, startKey, 'forward');
    return { startIndex: anchorIndex, endIndex: anchorIndex };
  }

  private onResizeMove(event: MouseEvent): void {
    if (!this.isResizing) {
      return;
    }
    const delta = event.clientX - this.resizeStartX;
    const next = this.resizeStartWidth + delta;
    this.itemColumnWidth = Math.max(280, Math.min(900, next));
  }

  private onResizeEnd(_event: MouseEvent): void {
    this.isResizing = false;
    this.removeResizeListeners();
  }

  private removeResizeListeners(): void {
    if (this.moveListener) {
      window.removeEventListener('mousemove', this.moveListener);
    }
    if (this.upListener) {
      window.removeEventListener('mouseup', this.upListener);
    }
    this.moveListener = null;
    this.upListener = null;
  }

  private toDisplayPersonName(normalizedName: string): string {
    if (!normalizedName) {
      return '';
    }
    return normalizedName
      .split(' ')
      .filter(part => part.length > 0)
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

  private clearData(): void {
    this.allNodes = [];
    this.allNodesMap.clear();
    this.visibleRows = [];
    this.collapsedRows.clear();
    this.realHoursByNode.clear();
    this.plannedHoursByNode.clear();
    this.sprintDays = [];
    this.sprintStartKey = '';
    this.sprintEndKey = '';
    this.sprintWindowStartKey = '';
    this.sprintWindowEndKey = '';
    this.loadedSprintStartDate = null;
    this.loadedSprintFinishDate = null;
    this.delayedEndFullDate = '';
    this.hasDelayedEndLine = false;
    this.delayedEndLinePct = 100;
    this.assignmentEvents = [];
    this.baselineByNode.clear();
    this.personComparison = [];
    this.baselineSummary = {
      totalRows: this.rawBaselineResult?.rows.length || 0,
      matchedRows: 0,
      unmatchedRows: this.rawBaselineResult?.rows.length || 0,
      matchedOnTime: 0,
      matchedLate: 0
    };
    this.resetComparisonAnalysisState();
  }

  private isTaskType(type: string): boolean {
    return type.trim().toLowerCase() === 'task';
  }

  private isParentItemType(type: string): boolean {
    const normalized = type.trim().toLowerCase();
    return normalized === 'user story' || normalized === 'feature';
  }

  private getDescendantTasks(nodeId: number, nodeMap: Map<number, SprintHierarchyNode>): SprintHierarchyNode[] {
    const tasks: SprintHierarchyNode[] = [];
    const visited = new Set<number>();
    const walk = (currentId: number): void => {
      if (visited.has(currentId)) {
        return;
      }
      visited.add(currentId);
      const node = nodeMap.get(currentId);
      if (!node) {
        return;
      }
      node.childIds.forEach(childId => {
        const child = nodeMap.get(childId);
        if (!child) {
          return;
        }
        if (this.isTaskType(child.type)) {
          tasks.push(child);
        }
        walk(childId);
      });
    };

    walk(nodeId);
    return tasks;
  }

  private calculateWorkflowPlannedHours(tasks: SprintHierarchyNode[]): number {
    return this.calculateWorkflowPlan(tasks).totalHours;
  }

  private calculateWorkflowPlan(tasks: SprintHierarchyNode[]): WorkflowPlanResult {
    if (tasks.length === 0) {
      return { totalHours: 0, startByTaskId: new Map<number, number>() };
    }

    const workflowTasks: WorkflowTask[] = tasks
      .filter(task => Math.max(0, task.originalEstimate) > 0)
      .map(task => this.buildWorkflowTask(task));

    if (workflowTasks.length === 0) {
      return { totalHours: 0, startByTaskId: new Map<number, number>() };
    }

    const byStage = new Map<string, WorkflowTask[]>();
    workflowTasks.forEach(task => {
      const list = byStage.get(task.stage) || [];
      list.push(task);
      byStage.set(task.stage, list);
    });
    byStage.forEach(list => list.sort((a, b) => a.id - b.id));

    const deps = new Map<number, Set<number>>();
    const ensureDep = (taskId: number, dependsOnId: number): void => {
      if (!deps.has(taskId)) {
        deps.set(taskId, new Set<number>());
      }
      deps.get(taskId)?.add(dependsOnId);
    };
    const chainStage = (stage: string): void => {
      const stageTasks = byStage.get(stage) || [];
      for (let i = 1; i < stageTasks.length; i++) {
        ensureDep(stageTasks[i].id, stageTasks[i - 1].id);
      }
    };
    const firstOfStage = (stage: string): WorkflowTask | null => (byStage.get(stage) || [])[0] || null;
    const lastOfStage = (stage: string): WorkflowTask | null => {
      const list = byStage.get(stage) || [];
      return list.length > 0 ? list[list.length - 1] : null;
    };

    [
      'kickoff',
      'dev-spec-peer',
      'dev-analysis',
      'dev-coding',
      'dev-review',
      'reviewer-peer',
      'post-review-isw',
      'qa-execution',
      'qa-defects',
      'reviewer-peer-test',
      'design-tests',
      'daily-scrum',
      'closing'
    ].forEach(stage => chainStage(stage));

    const orderedDevStages = ['dev-spec-peer', 'dev-analysis', 'dev-coding', 'dev-review'];
    for (let i = 0; i < orderedDevStages.length - 1; i++) {
      const from = lastOfStage(orderedDevStages[i]);
      const to = firstOfStage(orderedDevStages[i + 1]);
      if (from && to) {
        ensureDep(to.id, from.id);
      }
    }

    const kickoffLast = lastOfStage('kickoff');
    const firstWorkStage = firstOfStage('dev-spec-peer') || firstOfStage('dev-analysis') || firstOfStage('dev-coding');
    if (kickoffLast && firstWorkStage) {
      ensureDep(firstWorkStage.id, kickoffLast.id);
    }

    const reviewerPeerFirst = firstOfStage('reviewer-peer');
    const devReviewLast = lastOfStage('dev-review');
    if (reviewerPeerFirst && devReviewLast) {
      ensureDep(reviewerPeerFirst.id, devReviewLast.id);
    }

    const iswFirst = firstOfStage('post-review-isw');
    if (iswFirst) {
      const reviewGate = lastOfStage('reviewer-peer') || lastOfStage('dev-review');
      if (reviewGate) {
        ensureDep(iswFirst.id, reviewGate.id);
      }
    }

    const qaExecFirst = firstOfStage('qa-execution');
    if (qaExecFirst) {
      const qaGate = lastOfStage('post-review-isw') || lastOfStage('reviewer-peer') || lastOfStage('dev-review');
      if (qaGate) {
        ensureDep(qaExecFirst.id, qaGate.id);
      }
    }

    const qaDefectsFirst = firstOfStage('qa-defects');
    const qaExecLast = lastOfStage('qa-execution');
    if (qaDefectsFirst && qaExecLast) {
      ensureDep(qaDefectsFirst.id, qaExecLast.id);
    }

    const peerReviewTestFirst = firstOfStage('reviewer-peer-test');
    const designTestsLast = lastOfStage('design-tests');
    if (peerReviewTestFirst && designTestsLast) {
      ensureDep(peerReviewTestFirst.id, designTestsLast.id);
    }

    const closingFirst = firstOfStage('closing');
    if (closingFirst) {
      const lastFunctional =
        lastOfStage('qa-defects') ||
        lastOfStage('qa-execution') ||
        lastOfStage('post-review-isw') ||
        lastOfStage('reviewer-peer') ||
        lastOfStage('dev-review') ||
        lastOfStage('dev-coding') ||
        lastOfStage('dev-analysis') ||
        lastOfStage('dev-spec-peer');
      if (lastFunctional) {
        ensureDep(closingFirst.id, lastFunctional.id);
      }
    }

    const roleAvailable: Record<WorkflowRole, number> = {
      developer: 0,
      reviewer: 0,
      qa: 0
    };
    const startTimes = new Map<number, number>();
    const finishTimes = new Map<number, number>();
    const tasksById = new Map<number, WorkflowTask>(workflowTasks.map(task => [task.id, task]));
    const pendingIds = new Set<number>(workflowTasks.map(task => task.id));

    while (pendingIds.size > 0) {
      const ready: WorkflowTask[] = [];
      pendingIds.forEach(taskId => {
        const task = tasksById.get(taskId);
        if (!task) {
          return;
        }
        const predecessors = deps.get(taskId) || new Set<number>();
        const blocked = Array.from(predecessors.values()).some(depId => !finishTimes.has(depId));
        if (!blocked) {
          ready.push(task);
        }
      });

      if (ready.length === 0) {
        const fallbackTaskId = Array.from(pendingIds.values()).sort((a, b) => a - b)[0];
        const fallbackTask = tasksById.get(fallbackTaskId);
        if (!fallbackTask) {
          break;
        }
        const start = roleAvailable[fallbackTask.role];
        const finish = start + fallbackTask.hours;
        roleAvailable[fallbackTask.role] = finish;
        startTimes.set(fallbackTask.id, start);
        finishTimes.set(fallbackTask.id, finish);
        pendingIds.delete(fallbackTask.id);
        continue;
      }

      ready.sort((a, b) => a.id - b.id);
      let selected = ready[0];
      let selectedStart = Number.MAX_SAFE_INTEGER;
      ready.forEach(task => {
        const predecessors = deps.get(task.id) || new Set<number>();
        const predecessorFinish = Array.from(predecessors.values()).reduce((max, depId) => {
          const depFinish = finishTimes.get(depId) || 0;
          return depFinish > max ? depFinish : max;
        }, 0);
        const start = Math.max(predecessorFinish, roleAvailable[task.role]);
        if (start < selectedStart || (start === selectedStart && task.id < selected.id)) {
          selected = task;
          selectedStart = start;
        }
      });

      const selectedDeps = deps.get(selected.id) || new Set<number>();
      const predecessorFinish = Array.from(selectedDeps.values()).reduce((max, depId) => {
        const depFinish = finishTimes.get(depId) || 0;
        return depFinish > max ? depFinish : max;
      }, 0);
      const start = Math.max(predecessorFinish, roleAvailable[selected.role]);
      const finish = start + selected.hours;
      roleAvailable[selected.role] = finish;
      startTimes.set(selected.id, start);
      finishTimes.set(selected.id, finish);
      pendingIds.delete(selected.id);
    }

    const maxFinish = Array.from(finishTimes.values()).reduce((max, value) => value > max ? value : max, 0);
    return {
      totalHours: maxFinish > 0 ? maxFinish : workflowTasks.reduce((sum, task) => sum + task.hours, 0),
      startByTaskId: startTimes
    };
  }

  private buildWorkflowTask(task: SprintHierarchyNode): WorkflowTask {
    const normalized = this.normalizeTitle(task.title);
    let stage = 'other';
    let role: WorkflowRole = 'developer';

    if (normalized.includes('peer review test')) {
      stage = 'reviewer-peer-test';
      role = 'reviewer';
    } else if (
      normalized.includes('registrar sprint en azure') ||
      normalized.includes('elaborar presentacion de sprint planning') ||
      normalized.includes('elaborar presentacion del sprint planning') ||
      normalized.includes('reunion evaluacion de riesgos') ||
      normalized.includes('reunion de evaluacion de riesgos') ||
      normalized.includes('presentacion de work items') ||
      normalized.includes('reunion de sprint planning')
    ) {
      stage = 'kickoff';
      role = 'developer';
    } else if (normalized.includes('daily scrum sprint')) {
      stage = 'daily-scrum';
      role = 'developer';
    } else if (
      normalized.includes('generar paquete de liberacion') ||
      normalized.includes('enviar correo de finalizacion de dev sprint') ||
      normalized.includes('enviar correo de finalizacion de testing sprint') ||
      normalized.includes('validar informacion registrada del sprint')
    ) {
      stage = 'closing';
      role = 'developer';
    } else if (normalized.includes('diseno de pruebas') || normalized.includes('diseño de pruebas')) {
      stage = 'design-tests';
      role = 'developer';
    } else if (normalized.includes('peer review de especificacion') || normalized.includes('peer review de especificación')) {
      stage = 'dev-spec-peer';
      role = 'developer';
    } else if (normalized.includes('analisis') || normalized.includes('análisis')) {
      stage = 'dev-analysis';
      role = 'developer';
    } else if (normalized.includes('elaboracion de codigo') || normalized.includes('elaboración de código')) {
      stage = 'dev-coding';
      role = 'developer';
    } else if (normalized.includes('peer review')) {
      stage = 'reviewer-peer';
      role = 'reviewer';
    } else if (/(\breview\b)/.test(normalized)) {
      stage = 'dev-review';
      role = 'developer';
    } else if (normalized.includes('pruebas funcionales') && normalized.includes('isw')) {
      stage = 'post-review-isw';
      role = 'developer';
    } else if (normalized.includes('ejecucion de pruebas') || normalized.includes('ejecución de pruebas')) {
      stage = 'qa-execution';
      role = 'qa';
    } else if (normalized.includes('registro de defectos')) {
      stage = 'qa-defects';
      role = 'qa';
    }

    return {
      id: task.id,
      title: task.title,
      hours: Math.max(0, task.originalEstimate),
      role,
      stage
    };
  }

  private normalizeTitle(title: string): string {
    return title
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  private getEffectiveHoursPerDay(): number {
    // Effective workday capacity requested by user
    return 7.4;
  }

  private getSprintKickoffHours(): number {
    // First day baseline activities provided by user: 5 sessions x 1h
    return 5;
  }

  private getDescendants(nodeId: number, nodeMap: Map<number, SprintHierarchyNode>): SprintHierarchyNode[] {
    const descendants: SprintHierarchyNode[] = [];
    const visited = new Set<number>();
    const walk = (currentId: number): void => {
      if (visited.has(currentId)) {
        return;
      }
      visited.add(currentId);
      const current = nodeMap.get(currentId);
      if (!current) {
        return;
      }
      current.childIds.forEach(childId => {
        const child = nodeMap.get(childId);
        if (!child) {
          return;
        }
        descendants.push(child);
        walk(childId);
      });
    };
    walk(nodeId);
    return descendants;
  }

  private getMaxClosedDateKeyFromNodes(): string {
    let maxKey = '';
    this.allNodes.forEach(node => {
      const key = this.getNodeRealClosedDayKey(node);
      if (!key) {
        return;
      }
      if (!maxKey || key > maxKey) {
        maxKey = key;
      }
    });
    return maxKey;
  }
}
