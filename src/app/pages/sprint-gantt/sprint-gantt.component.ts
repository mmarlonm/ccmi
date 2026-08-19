import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  AdoOrganization,
  AdoProject,
  AdoTeam,
  AdoSprint,
  SprintGanttService,
  SprintHierarchyNode
} from '../../services/sprint-gantt.service';
import { catchError, forkJoin, of, switchMap } from 'rxjs';

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

@Component({
  selector: 'app-sprint-gantt',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
<div class="max-w-[1800px] mx-auto space-y-6 pt-4 md:pt-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
  <header>
    <h2 class="text-3xl font-bold text-slate-800 dark:text-white">Seguimiento de Sprint - Gantt</h2>
    <p class="text-slate-500 dark:text-slate-400 mt-1">Comparación de horas planificadas vs horas reales por work item.</p>
  </header>

  <section class="glass-card space-y-4">
    <div *ngIf="!hasPatConfigured" class="rounded-lg border border-amber-300 bg-amber-100/70 dark:bg-amber-900/30 text-amber-900 dark:text-amber-200 p-3 text-sm">
      Configura un PAT en la sección de Configuración para cargar datos de Azure DevOps.
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
      <div>
        <label class="block text-sm font-medium mb-1.5 opacity-70">Organización</label>
        <select class="glass-input w-full" [(ngModel)]="selectedOrganization" (ngModelChange)="onOrganizationChange()">
          <option value="">-- Selecciona organización --</option>
          <option *ngFor="let org of organizations" [value]="org.name">{{ org.name }}</option>
        </select>
      </div>
      <div>
        <label class="block text-sm font-medium mb-1.5 opacity-70">Proyecto</label>
        <select class="glass-input w-full" [(ngModel)]="selectedProjectId" (ngModelChange)="onProjectChange()" [disabled]="!selectedOrganization">
          <option value="">-- Selecciona proyecto --</option>
          <option *ngFor="let project of projects" [value]="project.id">{{ project.name }}</option>
        </select>
      </div>
      <div>
        <label class="block text-sm font-medium mb-1.5 opacity-70">Team</label>
        <select class="glass-input w-full" [(ngModel)]="selectedTeamId" (ngModelChange)="onTeamChange()" [disabled]="!selectedProjectId">
          <option value="">-- Selecciona team --</option>
          <option *ngFor="let team of teams" [value]="team.id">{{ team.name }}</option>
        </select>
      </div>
      <div>
        <label class="block text-sm font-medium mb-1.5 opacity-70">Sprint</label>
        <select class="glass-input w-full" [(ngModel)]="selectedSprintId" (ngModelChange)="onSprintChange()" [disabled]="!selectedTeamId">
          <option value="">-- Selecciona sprint --</option>
          <option *ngFor="let sprint of sprints" [value]="sprint.id">{{ sprint.name }}</option>
        </select>
      </div>
    </div>

    <div class="flex items-center gap-3">
      <button class="glass-button" (click)="loadGanttData()" [disabled]="!canLoadGantt || loadingData">
        {{ loadingData ? 'Cargando...' : 'Cargar Gantt' }}
      </button>
      <span *ngIf="loadingCatalogs" class="text-sm text-slate-500 dark:text-slate-400">Actualizando catálogos...</span>
      <span *ngIf="errorMessage" class="text-sm text-red-600 dark:text-red-400">{{ errorMessage }}</span>
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
          <input type="checkbox" class="accent-indigo-600" [(ngModel)]="showPlannedTime">
          <span>Planeado</span>
        </label>
        <label class="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 cursor-pointer">
          <input type="checkbox" class="accent-emerald-600" [(ngModel)]="showCompletedTime">
          <span>Completado</span>
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

            <div *ngIf="showPlannedTime" class="absolute top-[8px] h-3 rounded-full bg-blue-500/90"
              [style.left.%]="getPlanBarLeftPct(row.node)"
              [style.width.%]="getPlanBarWidthPct(row.node)"
              [title]="'Planeado: ' + (getPlannedHours(row.node.id) | number:'1.0-1') + 'h'">
            </div>

            <div *ngIf="showCompletedTime"
              class="absolute top-[30px] h-3 rounded-full"
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
  showPlannedTime = false;
  showCompletedTime = true;

  get canLoadGantt(): boolean {
    return Boolean(this.selectedOrganization && this.selectedProjectId && this.selectedTeamId && this.selectedSprintId && this.hasPatConfigured);
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
        )
      )
      .subscribe({
        next: ({ nodes, sprintRange }) => {
          this.loadingData = false;
          this.loadedSprintStartDate = sprintRange.startDate || selectedSprint?.startDate || null;
          this.loadedSprintFinishDate = sprintRange.finishDate || selectedSprint?.finishDate || null;
          this.allNodes = this.sortNodesWithOrphansFirst(this.attachAdministrativeTasksSection(nodes));
          this.allNodesMap = new Map<number, SprintHierarchyNode>(this.allNodes.map(node => [node.id, node]));
          this.initializeCollapsedState(this.allNodes);
          this.recalculateRealHours();
          this.recalculatePlannedHours();
          this.rebuildVisibleRows();
          this.buildSprintTimeline();
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
