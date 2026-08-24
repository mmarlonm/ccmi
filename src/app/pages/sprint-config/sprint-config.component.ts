import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { ConfigService } from '../../services/config.service';
import {
  AdoOrganization,
  AdoProject,
  AdoSprint,
  AdoTeam,
  SprintGanttService
} from '../../services/sprint-gantt.service';
import { SprintTaskService } from '../../services/sprint-task.service';
import { SprintTaskTemplate } from '../../models/config.model';
import {
  DraftTaskItem,
  ImportResult,
  SprintTaskDraft,
  WorkItemDraftConfig
} from '../../models/sprint-task-config.model';

@Component({
  selector: 'app-sprint-config',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
<div class="max-w-7xl mx-auto space-y-6 pt-4 md:pt-8 pb-10">
  <header>
    <h2 class="text-2xl font-bold text-slate-800 dark:text-white">Configurar Sprint</h2>
    <p class="text-sm text-slate-500 dark:text-slate-400">Configura tareas por User Story, Feature o Bug usando plantilla editable.</p>
  </header>

  <section class="glass-card space-y-4">
    <h3 class="text-lg font-semibold">Filtros de sprint</h3>
    <div class="grid grid-cols-1 md:grid-cols-4 gap-3">
      <select class="glass-input" [(ngModel)]="selectedOrganization" (ngModelChange)="onOrganizationChange()">
        <option value="">Organización</option>
        <option *ngFor="let org of organizations" [value]="org.name">{{ org.name }}</option>
      </select>
      <select class="glass-input" [(ngModel)]="selectedProjectId" (ngModelChange)="onProjectChange()" [disabled]="!selectedOrganization">
        <option value="">Proyecto</option>
        <option *ngFor="let project of projects" [value]="project.id">{{ project.name }}</option>
      </select>
      <select class="glass-input" [(ngModel)]="selectedTeamId" (ngModelChange)="onTeamChange()" [disabled]="!selectedProjectId">
        <option value="">Equipo</option>
        <option *ngFor="let team of teams" [value]="team.id">{{ team.name }}</option>
      </select>
      <select class="glass-input" [(ngModel)]="selectedSprintId" [disabled]="!selectedTeamId">
        <option value="">Sprint</option>
        <option *ngFor="let sprint of sprints" [value]="sprint.id">{{ sprint.name }}</option>
      </select>
    </div>
    <div class="flex flex-wrap gap-2">
      <button class="glass-button" (click)="loadSprintItems()" [disabled]="!canLoadSprint || loadingItems">
        {{ loadingItems ? 'Cargando...' : 'Cargar items del sprint' }}
      </button>
      <button class="glass-button" (click)="saveDraft()" [disabled]="!draft">Guardar borrador</button>
      <button class="glass-button" (click)="confirmImport()" [disabled]="!canImportToAzure || importing">Importar a Azure</button>
    </div>
    <p *ngIf="message" class="text-sm" [ngClass]="messageType === 'error' ? 'text-red-600' : 'text-green-600'">{{ message }}</p>
    <p *ngIf="captureMode === 'manual'" class="text-xs text-indigo-600 dark:text-indigo-300">
      Modo independiente por ID: solo se muestra el item capturado fuera de sprint.
    </p>
  </section>

  <section class="glass-card space-y-3">
    <h3 class="text-lg font-semibold">Captura por ID (fuera de sprint)</h3>
    <p class="text-xs text-slate-500">Usa Organización/Proyecto seleccionados; si no existen, se toma Configuración global.</p>
    <div class="flex gap-2">
      <input [(ngModel)]="manualItemId" type="number" min="1" class="glass-input w-56" placeholder="ID del item">
      <button class="glass-button" (click)="addItemById()" [disabled]="!manualItemId || loadingManual">Agregar item por ID</button>
    </div>
  </section>

  <section *ngIf="draft" class="glass-card space-y-4">
    <h3 class="text-lg font-semibold">Resumen previo a importación</h3>
    <div class="grid grid-cols-1 md:grid-cols-4 gap-3">
      <div class="rounded-lg border border-slate-200 dark:border-slate-700 p-3">
        <p class="text-xs text-slate-500">Total Desarrollo</p>
        <p class="text-xl font-bold">{{ getGlobalCategoryHours('dev') | number:'1.3-3' }}h</p>
      </div>
      <div class="rounded-lg border border-slate-200 dark:border-slate-700 p-3">
        <p class="text-xs text-slate-500">Total Testing</p>
        <p class="text-xl font-bold">{{ getGlobalCategoryHours('testing') | number:'1.3-3' }}h</p>
      </div>
      <div class="rounded-lg border border-slate-200 dark:border-slate-700 p-3">
        <p class="text-xs text-slate-500">Total Otras</p>
        <p class="text-xl font-bold">{{ getGlobalCategoryHours('other') | number:'1.3-3' }}h</p>
      </div>
      <div class="rounded-lg border border-indigo-300 dark:border-indigo-700 p-3 bg-indigo-50/60 dark:bg-indigo-900/20">
        <p class="text-xs text-slate-500">Total General</p>
        <p class="text-xl font-bold text-indigo-700 dark:text-indigo-300">{{ getGlobalTotalHours() | number:'1.3-3' }}h</p>
      </div>
    </div>
  </section>

  <section *ngIf="draft" class="space-y-4">
    <article *ngFor="let item of draft.items" class="glass-card overflow-hidden">
      <div class="w-full p-4 text-left hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors cursor-pointer" (click)="toggleItemExpanded(item.workItemId)">
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <div class="flex items-center gap-2 flex-wrap">
              <h4 class="font-semibold">
                <a
                  class="text-indigo-700 dark:text-indigo-300 hover:underline"
                  [href]="getWorkItemUrl(item.workItemId)"
                  target="_blank"
                  rel="noopener noreferrer"
                  (click)="$event.stopPropagation()"
                >
                  {{ getPrefix(item.workItemType) }} {{ item.workItemId }}
                </a>
                - {{ item.title }}
              </h4>
              <span
                class="text-[11px] px-2 py-0.5 rounded-full border"
                [ngClass]="isNewState(item.workItemState) ? 'text-emerald-700 border-emerald-300 bg-emerald-50 dark:text-emerald-300 dark:border-emerald-700 dark:bg-emerald-900/20' : 'text-amber-700 border-amber-300 bg-amber-50 dark:text-amber-300 dark:border-amber-700 dark:bg-amber-900/20'"
              >
                {{ item.workItemState || 'Sin estado' }}
              </span>
              <span *ngIf="item.imported" class="text-xs font-semibold text-green-600">Importado</span>
            </div>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs mt-2">
              <div class="rounded border border-slate-200 dark:border-slate-700 px-2 py-1">Desarrollo: <strong>{{ getCategoryHours(item, 'dev') | number:'1.3-3' }}h</strong></div>
              <div class="rounded border border-slate-200 dark:border-slate-700 px-2 py-1">Testing: <strong>{{ getCategoryHours(item, 'testing') | number:'1.3-3' }}h</strong></div>
              <div class="rounded border border-slate-200 dark:border-slate-700 px-2 py-1">Otras: <strong>{{ getCategoryHours(item, 'other') | number:'1.3-3' }}h</strong></div>
              <div class="rounded border border-indigo-300 dark:border-indigo-700 px-2 py-1 bg-indigo-50/60 dark:bg-indigo-900/20">Total: <strong>{{ getTotalHours(item) | number:'1.3-3' }}h</strong></div>
            </div>
            <div *ngIf="captureMode === 'manual'" class="text-xs text-slate-500 dark:text-slate-400 mt-2">
              Área: <strong>{{ item.areaPath || 'N/A' }}</strong> · Iteración: <strong>{{ item.iterationPath || 'N/A' }}</strong>
            </div>
            <div *ngIf="isItemReadOnly(item)" class="mt-2 text-xs text-amber-700 dark:text-amber-300">
              Item en modo lectura: solo se puede editar cuando el estado del padre es <strong>New</strong>.
            </div>
          </div>
          <span class="text-xs font-semibold text-slate-500 mt-1">{{ isItemExpanded(item.workItemId) ? 'Ocultar' : 'Mostrar' }}</span>
        </div>
      </div>

      <div *ngIf="isItemExpanded(item.workItemId)" class="p-4 pt-0 space-y-4">
        <div *ngIf="captureMode === 'manual' && item.workItemType === 'Bug'" class="p-3 border rounded-lg space-y-2">
          <h5 class="font-semibold text-sm">Tags de BUG (obligatorio)</h5>
          <div class="flex flex-wrap gap-2">
            <button
              *ngFor="let tag of bugTagOptions"
              type="button"
              class="px-3 py-1 rounded-full border text-xs transition-colors"
              [ngClass]="isBugTagSelected(item, tag) ? 'bg-indigo-600 text-white border-indigo-600' : 'border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300'"
              (click)="toggleBugTag(item, tag)"
              [disabled]="isItemReadOnly(item)"
            >
              {{ tag }}
            </button>
          </div>
          <p *ngIf="item.bugTags.length === 0" class="text-xs text-red-600">Selecciona al menos un tag.</p>
        </div>

        <div class="p-3 border rounded-lg space-y-2">
          <h5 class="font-semibold text-sm">Desarrollo</h5>
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div class="space-y-2">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
                <select class="glass-input text-sm" [(ngModel)]="item.devAssignedTo" (ngModelChange)="onDevAssignedToChanged(item)" [disabled]="isItemReadOnly(item)">
                  <option value="">Asignado DEV</option>
                  <option *ngFor="let user of getAssignableUsers()" [value]="user">{{ user }}</option>
                </select>
                <select class="glass-input text-sm" [(ngModel)]="item.devPeerReviewAssignedTo" (ngModelChange)="applyAssignees(item)" [disabled]="isItemReadOnly(item)">
                  <option value="">Peer Review código</option>
                  <option *ngFor="let user of getAssignableUsers()" [value]="user">{{ user }}</option>
                </select>
              </div>
              <div *ngIf="item.usesExistingTasks" class="text-xs text-indigo-600 dark:text-indigo-300">
                Este item ya tiene tareas creadas en Azure. Se editarán directamente sus valores existentes.
              </div>
              <div class="space-y-2" *ngIf="!item.usesExistingTasks">
                <div class="flex items-center justify-between">
                  <p class="text-xs font-semibold">Componentes</p>
                  <button class="glass-button text-xs px-2 py-1" (click)="addComponent(item)" [disabled]="isItemReadOnly(item)">+ Componente</button>
                </div>
                <div *ngFor="let component of item.devComponents; let ci = index" class="flex gap-2 items-center">
                  <span class="text-xs w-16">Comp {{ format2(component.componentNo) }}</span>
                  <input class="glass-input w-24 text-sm" type="number" min="0" step="any" [(ngModel)]="component.hours" (ngModelChange)="onDevComponentsChanged(item)" [disabled]="isItemReadOnly(item)">
                  <span class="text-xs">horas</span>
                  <button *ngIf="item.devComponents.length > 1" class="text-red-600 text-xs" (click)="removeComponent(item, ci)" [disabled]="isItemReadOnly(item)">Quitar</button>
                </div>
              </div>
              <div class="space-y-1" *ngIf="!item.usesExistingTasks">
                <p class="text-xs font-semibold text-slate-500">Distribución % por tarea DEV (editable por item)</p>
                <div *ngFor="let pct of item.devTaskPercentages; let pi=index" class="grid grid-cols-[1fr_100px] gap-2 items-center text-xs">
                  <span>{{ format2(pct.id) }} - {{ pct.name }}</span>
                  <input class="glass-input text-sm" type="number" min="0" step="any" [(ngModel)]="pct.percentage" (ngModelChange)="onDevPercentageChanged(item, pi)" [disabled]="isItemReadOnly(item)">
                </div>
              </div>
            </div>

            <div class="space-y-1 text-xs border border-slate-200 dark:border-slate-700 rounded-lg p-2">
              <p class="text-xs font-semibold text-slate-500">Tareas de desarrollo</p>
              <div *ngFor="let task of getTasks(item, 'dev')" class="flex gap-2 items-center">
                <span class="flex-1">{{ getTaskTitle(item, task) }}</span>
                <input
                  *ngIf="item.usesExistingTasks; else calculatedDevTime"
                  class="glass-input w-24 text-sm"
                  type="number"
                  min="0"
                  step="any"
                  [(ngModel)]="task.originalEstimate"
                  (ngModelChange)="syncRemaining(task)"
                  [disabled]="isTaskReadOnly(item, task)"
                >
                <ng-template #calculatedDevTime>
                  <span class="font-semibold">{{ task.originalEstimate | number:'1.3-3' }}h</span>
                </ng-template>
                <span>h</span>
                <span class="text-slate-500 truncate max-w-36">{{ task.assignedTo || 'Sin asignar' }}</span>
                <span
                  *ngIf="task.state"
                  class="text-[10px] px-1.5 py-0.5 rounded border"
                  [ngClass]="isNewState(task.state) ? 'text-emerald-700 border-emerald-300 dark:text-emerald-300 dark:border-emerald-700' : 'text-amber-700 border-amber-300 dark:text-amber-300 dark:border-amber-700'"
                >
                  {{ task.state }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <div class="p-3 border rounded-lg space-y-2">
            <h5 class="font-semibold text-sm">Testing</h5>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
              <select class="glass-input text-sm" [(ngModel)]="item.testingAssignedTo" (ngModelChange)="applyAssignees(item)" [disabled]="isItemReadOnly(item)">
                <option value="">Asignado Testing</option>
                <option *ngFor="let user of getAssignableUsers()" [value]="user">{{ user }}</option>
              </select>
              <select class="glass-input text-sm" [(ngModel)]="item.testingReviewAssignedTo" (ngModelChange)="applyAssignees(item)" [disabled]="isItemReadOnly(item)">
                <option value="">Revisor testing (Peer Review)</option>
                <option *ngFor="let user of getAssignableUsers()" [value]="user">{{ user }}</option>
              </select>
            </div>
            <div *ngFor="let task of getTasks(item, 'testing')" class="flex gap-2 items-center text-xs">
              <span class="flex-1">{{ getTaskTitle(item, task) }}</span>
              <input class="glass-input w-24 text-sm" type="number" min="0" step="any" [(ngModel)]="task.originalEstimate" (ngModelChange)="syncRemaining(task)" [disabled]="isTaskReadOnly(item, task)">
              <span>h</span>
              <span class="text-slate-500">{{ task.assignedTo || 'Sin asignar' }}</span>
              <span
                *ngIf="task.state"
                class="text-[10px] px-1.5 py-0.5 rounded border"
                [ngClass]="isNewState(task.state) ? 'text-emerald-700 border-emerald-300 dark:text-emerald-300 dark:border-emerald-700' : 'text-amber-700 border-amber-300 dark:text-amber-300 dark:border-amber-700'"
              >
                {{ task.state }}
              </span>
            </div>
          </div>

          <div class="p-3 border rounded-lg space-y-2">
            <h5 class="font-semibold text-sm">Otras tareas</h5>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
              <select class="glass-input text-sm" [(ngModel)]="item.otherAssignedTo" (ngModelChange)="applyAssignees(item)" [disabled]="isItemReadOnly(item)">
                <option value="">Asignado otras</option>
                <option *ngFor="let user of getAssignableUsers()" [value]="user">{{ user }}</option>
              </select>
            </div>
            <div *ngFor="let task of getTasks(item, 'other')" class="flex gap-2 items-center text-xs">
              <span class="flex-1">{{ getTaskTitle(item, task) }}</span>
              <input class="glass-input w-24 text-sm" type="number" min="0" step="any" [(ngModel)]="task.originalEstimate" (ngModelChange)="syncRemaining(task)" [disabled]="isTaskReadOnly(item, task)">
              <span>h</span>
              <span class="text-slate-500">{{ task.assignedTo || 'Sin asignar' }}</span>
              <button
                *ngIf="canDeleteAddedOtherTask(item, task)"
                type="button"
                class="text-red-600 text-xs hover:underline"
                (click)="removeOtherTask(item, task)"
              >
                Eliminar
              </button>
              <span
                *ngIf="task.state"
                class="text-[10px] px-1.5 py-0.5 rounded border"
                [ngClass]="isNewState(task.state) ? 'text-emerald-700 border-emerald-300 dark:text-emerald-300 dark:border-emerald-700' : 'text-amber-700 border-amber-300 dark:text-amber-300 dark:border-amber-700'"
              >
                {{ task.state }}
              </span>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_140px_auto] gap-2 items-end" *ngIf="!isItemReadOnly(item)">
              <div class="space-y-1 min-w-0">
                <label class="text-xs text-slate-500">Nombre nueva tarea</label>
                <input class="glass-input text-sm w-full" [(ngModel)]="newOtherTaskNameByItem[item.workItemId]" placeholder="Nombre de la tarea">
              </div>
              <div class="space-y-1 min-w-0">
                <label class="text-xs text-slate-500">Tiempo estimado</label>
                <input class="glass-input text-sm w-full" type="number" min="0" step="any" [(ngModel)]="newOtherTaskEstimateByItem[item.workItemId]">
              </div>
              <div class="md:self-end">
                <button class="glass-button text-xs px-3 py-2 whitespace-nowrap" (click)="addOtherTask(item)">+ Agregar</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </article>
  </section>

  <section *ngIf="importResults.length > 0" class="glass-card">
    <h3 class="text-lg font-semibold mb-2">Resultado de importación</h3>
    <div *ngFor="let result of importResults" class="text-sm py-1">
      <span [ngClass]="result.success ? 'text-green-600' : 'text-red-600'">{{ result.success ? '✓' : '✗' }} Item #{{ result.workItemId }}</span>
      <span class="text-slate-500"> | {{ result.createdTaskIds.length }} tareas</span>
      <span *ngIf="result.errors.length" class="text-red-600"> | {{ result.errors.join(', ') }}</span>
    </div>
  </section>
</div>
  `
})
export class SprintConfigComponent implements OnInit {
  private sprintGanttService = inject(SprintGanttService);
  private sprintTaskService = inject(SprintTaskService);
  private configService = inject(ConfigService);

  organizations: AdoOrganization[] = [];
  projects: AdoProject[] = [];
  teams: AdoTeam[] = [];
  sprints: AdoSprint[] = [];
  teamUsers: string[] = [];

  selectedOrganization = '';
  selectedProjectId = '';
  selectedTeamId = '';
  selectedSprintId = '';

  loadingItems = false;
  loadingManual = false;
  importing = false;
  captureMode: 'sprint' | 'manual' = 'sprint';

  manualItemId: number | null = null;
  draft: SprintTaskDraft | null = null;
  importResults: ImportResult[] = [];
  message = '';
  messageType: 'success' | 'error' = 'success';
  private expandedItemIds = new Set<number>();
  readonly bugTagOptions = ['noInyectado', 'inyectadoSprint', 'bugUAT', 'bugTesting'];
  newOtherTaskNameByItem: Record<number, string> = {};
  newOtherTaskEstimateByItem: Record<number, number> = {};

  template: SprintTaskTemplate = this.configService.getConfig()?.sprintTaskTemplate || this.configService.getDefaultSprintTaskTemplate();

  get canLoadSprint(): boolean {
    return Boolean(this.selectedOrganization && this.selectedProjectId && this.selectedTeamId && this.selectedSprintId);
  }

  get canImportToAzure(): boolean {
    if (!this.draft || this.draft.items.length === 0) {
      return false;
    }
    const editableItems = this.draft.items.filter(item => !this.isItemReadOnly(item));
    if (editableItems.length === 0) {
      return false;
    }
    return editableItems.every(item =>
      Boolean(
        item.devAssignedTo?.trim() &&
        item.devPeerReviewAssignedTo?.trim() &&
        item.testingAssignedTo?.trim() &&
        item.testingReviewAssignedTo?.trim() &&
        item.otherAssignedTo?.trim()
      )
    ) && editableItems.every(item => !this.requiresBugTags(item) || item.bugTags.length > 0);
  }

  private validateImportAssignments(): boolean {
    if (!this.draft) return false;
    const editableItems = this.draft.items.filter(item => !this.isItemReadOnly(item));
    if (editableItems.length === 0) {
      this.showMessage('No hay items editables: solo se puede importar cuando el item padre está en estado New.', 'error');
      return false;
    }
    const missing = editableItems
      .filter(item =>
        !item.devAssignedTo?.trim() ||
        !item.devPeerReviewAssignedTo?.trim() ||
        !item.testingAssignedTo?.trim() ||
        !item.testingReviewAssignedTo?.trim() ||
        !item.otherAssignedTo?.trim()
      )
      .map(item => item.workItemId);

    if (missing.length === 0) {
      const missingBugTags = editableItems
        .filter(item => this.requiresBugTags(item) && item.bugTags.length === 0)
        .map(item => item.workItemId);
      if (missingBugTags.length === 0) {
        return true;
      }
      const firstMissingTagId = missingBugTags[0];
      if (typeof firstMissingTagId === 'number') {
        this.expandedItemIds.add(firstMissingTagId);
      }
      this.showMessage(`No se puede importar: el BUG manual requiere tags en ${missingBugTags.map(id => `#${id}`).join(', ')}.`, 'error');
      return false;
    }

    const firstMissingId = missing[0];
    if (typeof firstMissingId === 'number') {
      this.expandedItemIds.add(firstMissingId);
    }
    this.showMessage(`No se puede importar: faltan responsables en los items ${missing.map(id => `#${id}`).join(', ')}.`, 'error');
    return false;
  }

  ngOnInit(): void {
    const saved = this.sprintTaskService.loadDraft();
    if (saved) {
      this.draft = saved;
      this.teamUsers = saved.teamUsers || [];
      this.template = saved.template || this.template;
      this.captureMode = saved.sprintId ? 'sprint' : 'manual';
      this.ensureDraftCompatibility(saved);
      this.expandFirstItem(saved);
    }
    this.loadOrganizations();
  }

  loadOrganizations(): void {
    this.sprintGanttService.getOrganizations().subscribe(orgs => {
      this.organizations = orgs;
      const defaultOrg = this.configService.getConfig()?.azure.organization || '';
      this.selectedOrganization = orgs.find(org => org.name.toLowerCase() === defaultOrg.toLowerCase())?.name || orgs[0]?.name || defaultOrg;
      if (this.selectedOrganization) this.onOrganizationChange();
    });
  }

  onOrganizationChange(): void {
    this.selectedProjectId = '';
    this.selectedTeamId = '';
    this.selectedSprintId = '';
    this.projects = [];
    this.teams = [];
    this.sprints = [];
    if (!this.selectedOrganization) return;
    this.sprintGanttService.getProjects(this.selectedOrganization).subscribe(projects => {
      this.projects = projects;
      const defaultProject = this.configService.getConfig()?.azure.project || '';
      this.selectedProjectId = projects.find(project => project.name.toLowerCase() === defaultProject.toLowerCase())?.id || projects[0]?.id || '';
      if (this.selectedProjectId) this.onProjectChange();
    });
  }

  onProjectChange(): void {
    this.selectedTeamId = '';
    this.selectedSprintId = '';
    this.teams = [];
    this.sprints = [];
    if (!this.selectedOrganization || !this.selectedProjectId) return;
    this.sprintGanttService.getTeams(this.selectedOrganization, this.selectedProjectId).subscribe(teams => {
      this.teams = teams.filter(team => team.name.trim().toLowerCase() === 'mayansoft');
      this.selectedTeamId = this.teams[0]?.id || '';
      if (this.selectedTeamId) this.onTeamChange();
      if (!this.selectedTeamId) {
        this.showMessage('No se encontró el equipo Mayansoft para este proyecto.', 'error');
      }
    });
  }

  onTeamChange(): void {
    this.selectedSprintId = '';
    this.sprints = [];
    this.loadTeamMembers();
    const projectName = this.getSelectedProjectName();
    if (!this.selectedOrganization || !this.selectedTeamId || !projectName) return;
    this.sprintGanttService.getSprints(this.selectedOrganization, projectName, this.selectedTeamId).subscribe(sprints => {
      this.sprints = sprints;
      this.selectedSprintId = sprints[sprints.length - 1]?.id || '';
    });
  }

  loadTeamMembers(): void {
    if (!this.selectedOrganization || !this.selectedProjectId || !this.selectedTeamId) {
      this.teamUsers = [];
      return;
    }
    this.sprintGanttService.getTeamMembers(this.selectedOrganization, this.selectedProjectId, this.selectedTeamId).subscribe(users => {
      this.teamUsers = users;
      if (this.draft) {
        this.draft.teamUsers = users;
      }
    });
  }

  loadSprintItems(): void {
    if (!this.canLoadSprint) return;
    const projectName = this.getSelectedProjectName();
    const sprint = this.sprints.find(s => s.id === this.selectedSprintId);
    if (!projectName || !sprint) return;

    this.loadingItems = true;
    this.sprintGanttService.getSprintHierarchyNodes(
      this.selectedOrganization,
      projectName,
      this.selectedTeamId,
      this.selectedSprintId,
      sprint.path || ''
    ).pipe(
      finalize(() => { this.loadingItems = false; })
    ).subscribe(nodes => {
      this.captureMode = 'sprint';
      const items = nodes
        .filter(node => this.isAllowedType(node.type))
        .map(node => ({
          id: node.id,
          type: node.type,
          title: node.title,
          state: node.state || '',
          tags: node.tags || '',
          isManualCapture: false,
          iterationPath: node.iterationPath || sprint.path || '',
          areaPath: node.areaPath || projectName
        }));
      if (items.length === 0) {
        this.draft = this.sprintTaskService.buildDraftConfig({
          organization: this.selectedOrganization,
          projectId: this.selectedProjectId,
          projectName,
          teamId: this.selectedTeamId,
          teamName: this.getSelectedTeamName(),
          sprintId: this.selectedSprintId,
          sprintName: sprint.name,
          iterationPath: sprint.path || '',
          teamUsers: this.teamUsers,
          template: this.template,
          items
        });
        this.expandFirstItem(this.draft);
        this.sprintTaskService.saveDraft(this.draft);
        this.showMessage('No se encontraron items permitidos.', 'error');
        return;
      }
      forkJoin(items.map(item =>
        this.sprintGanttService.getChildTasks(this.selectedOrganization, projectName, item.id)
      )).subscribe(existingTaskLists => {
        const enrichedItems = items.map((item, index) => ({
          ...item,
          existingTasks: existingTaskLists[index] || []
        }));
        this.draft = this.sprintTaskService.buildDraftConfig({
          organization: this.selectedOrganization,
          projectId: this.selectedProjectId,
          projectName,
          teamId: this.selectedTeamId,
          teamName: this.getSelectedTeamName(),
          sprintId: this.selectedSprintId,
          sprintName: sprint.name,
          iterationPath: sprint.path || '',
          teamUsers: this.teamUsers,
          template: this.template,
          items: enrichedItems
        });
        this.initializeNewOtherTaskInputs(this.draft);
        this.expandFirstItem(this.draft);
        this.sprintTaskService.saveDraft(this.draft);
        this.showMessage(`${enrichedItems.length} items cargados.`, 'success');
      });
    });
  }

  addItemById(): void {
    if (!this.manualItemId) return;
    const fallbackConfig = this.configService.getConfig();
    const organization = this.selectedOrganization || fallbackConfig?.azure.organization || '';
    const projectName = this.getSelectedProjectName() || fallbackConfig?.azure.project || '';
    if (!organization || !projectName) {
      this.showMessage('Falta organización/proyecto para cargar el item por ID.', 'error');
      return;
    }
    if (this.teamUsers.length === 0) {
      this.tryLoadFallbackTeamUsers(organization, projectName);
    }

    this.loadingManual = true;
    this.sprintGanttService.getWorkItemBasic(organization, projectName, this.manualItemId).pipe(
      finalize(() => { this.loadingManual = false; })
    ).subscribe(node => {
      if (!node) {
        this.showMessage('No se encontró el item.', 'error');
        return;
      }
      if (!this.isAllowedType(node.type)) {
        this.showMessage('Solo se permiten User Story, Feature o Bug.', 'error');
        return;
      }

      this.sprintGanttService.getChildTasks(organization, projectName, node.id).subscribe(existingTasks => {
        this.captureMode = 'manual';
        this.draft = this.sprintTaskService.buildDraftConfig({
          organization,
          projectId: this.selectedProjectId,
          projectName,
          teamId: this.selectedTeamId,
          teamName: this.getSelectedTeamName() || 'Mayansoft',
          sprintId: '',
          sprintName: 'Captura por ID',
          iterationPath: node.iterationPath || '',
          teamUsers: this.teamUsers,
          template: this.template,
          items: [{
            id: node.id,
            type: node.type,
            title: node.title,
            state: node.state || '',
            tags: node.tags || '',
            isManualCapture: true,
            existingTasks,
            iterationPath: node.iterationPath || '',
            areaPath: node.areaPath || projectName
          }]
        });
        this.initializeNewOtherTaskInputs(this.draft);
        this.expandFirstItem(this.draft);
        this.sprintTaskService.saveDraft(this.draft);
        this.showMessage(`Item #${node.id} cargado en modo independiente.`, 'success');
        this.manualItemId = null;
      });
    });
  }

  addComponent(item: WorkItemDraftConfig): void {
    if (this.isItemReadOnly(item) || item.usesExistingTasks) return;
    const next = item.devComponents.length + 1;
    item.devComponents.push({ componentNo: next, hours: 0 });
    this.onDevComponentsChanged(item);
  }

  removeComponent(item: WorkItemDraftConfig, index: number): void {
    if (this.isItemReadOnly(item) || item.usesExistingTasks) return;
    item.devComponents.splice(index, 1);
    item.devComponents.forEach((component, idx) => { component.componentNo = idx + 1; });
    this.onDevComponentsChanged(item);
  }

  onDevComponentsChanged(item: WorkItemDraftConfig): void {
    if (this.isItemReadOnly(item) || item.usesExistingTasks) return;
    this.sprintTaskService.recalculateDevTasks(item, this.template);
    this.sprintTaskService.applyAssignees(item);
  }

  onDevPercentageChanged(item: WorkItemDraftConfig, index: number): void {
    if (this.isItemReadOnly(item) || item.usesExistingTasks) return;
    if (index < 0 || index >= item.devTaskPercentages.length) return;
    const current = item.devTaskPercentages[index];
    current.percentage = Number(current.percentage || 0);
    this.sprintTaskService.recalculateDevTasks(item, this.template);
    this.sprintTaskService.applyAssignees(item);
  }

  applyAssignees(item: WorkItemDraftConfig): void {
    if (this.isItemReadOnly(item)) return;
    this.sprintTaskService.applyAssignees(item);
  }

  onDevAssignedToChanged(item: WorkItemDraftConfig): void {
    if (this.isItemReadOnly(item)) return;
    const selectedDev = item.devAssignedTo?.trim() || '';
    if (selectedDev) {
      if (!item.testingReviewAssignedTo?.trim()) {
        item.testingReviewAssignedTo = selectedDev;
      }
      if (!item.otherAssignedTo?.trim()) {
        item.otherAssignedTo = selectedDev;
      }
    }
    this.applyAssignees(item);
  }

  addOtherTask(item: WorkItemDraftConfig): void {
    if (this.isItemReadOnly(item)) return;
    const name = (this.newOtherTaskNameByItem[item.workItemId] || '').trim();
    const estimateRaw = this.newOtherTaskEstimateByItem[item.workItemId];
    const estimate = Number(estimateRaw);
    if (!name) {
      this.showMessage('Captura el nombre de la nueva tarea en Otras tareas.', 'error');
      return;
    }
    if (!Number.isFinite(estimate) || estimate < 0) {
      this.showMessage('Captura un tiempo estimado válido para la nueva tarea.', 'error');
      return;
    }

    const nextTaskId = this.getNextOtherTaskId(item);

    item.tasks.push({
      templateTaskId: nextTaskId,
      name,
      category: 'other',
      originalEstimate: estimate,
      remainingWork: estimate,
      assignedTo: item.otherAssignedTo || '',
      state: 'New',
      isEditable: true,
      useCustomTitle: true
    });
    this.applyAssignees(item);
    this.newOtherTaskNameByItem[item.workItemId] = this.getSuggestedOtherTaskName(item);
    this.newOtherTaskEstimateByItem[item.workItemId] = 0;
  }

  removeOtherTask(item: WorkItemDraftConfig, task: DraftTaskItem): void {
    if (!this.canDeleteAddedOtherTask(item, task)) return;
    const index = item.tasks.indexOf(task);
    if (index < 0) return;
    item.tasks.splice(index, 1);
    this.newOtherTaskNameByItem[item.workItemId] = this.getSuggestedOtherTaskName(item);
  }

  syncRemaining(task: DraftTaskItem): void {
    if (task.isEditable === false) return;
    task.remainingWork = Number(task.originalEstimate || 0);
  }

  saveDraft(): void {
    if (!this.draft) return;
    this.sprintTaskService.saveDraft(this.draft);
    this.showMessage('Borrador guardado.', 'success');
  }

  confirmImport(): void {
    if (!this.validateImportAssignments()) {
      return;
    }
    this.executeImport();
  }

  executeImport(): void {
    const draft = this.draft;
    if (!draft) return;
    this.importing = true;
    this.importResults = [];
    this.sprintTaskService.importAllToAzure(draft).pipe(
      finalize(() => { this.importing = false; })
    ).subscribe(results => {
      this.importResults = results;
      results.forEach(result => {
        const target = draft.items.find(item => item.workItemId === result.workItemId);
        if (!target) return;
        if (result.success) {
          target.imported = true;
          target.importedTaskIds = result.createdTaskIds;
        }
      });
      const allImported = draft.items.every(item => item.imported);
      const someImported = draft.items.some(item => item.imported);
      draft.status = allImported ? 'imported' : (someImported ? 'partial' : 'draft');
      this.sprintTaskService.saveDraft(draft);
      this.showMessage(allImported ? 'Importación completada.' : 'Importación completada con errores.', allImported ? 'success' : 'error');
    });
  }

  getAssignableUsers(): string[] {
    return this.teamUsers.length > 0 ? this.teamUsers : (this.draft?.teamUsers || []);
  }

  getTasks(item: WorkItemDraftConfig, category: 'dev' | 'testing' | 'other'): DraftTaskItem[] {
    return item.tasks.filter(task => task.category === category);
  }

  getTaskTitle(item: WorkItemDraftConfig, task: DraftTaskItem): string {
    return this.sprintTaskService.buildTaskTitle(item, task);
  }

  isItemReadOnly(item: WorkItemDraftConfig): boolean {
    return item.isEditable === false;
  }

  isTaskReadOnly(item: WorkItemDraftConfig, task: DraftTaskItem): boolean {
    return this.isItemReadOnly(item) || task.isEditable === false;
  }

  canDeleteAddedOtherTask(item: WorkItemDraftConfig, task: DraftTaskItem): boolean {
    return !this.isItemReadOnly(item)
      && task.category === 'other'
      && !task.existingTaskId
      && task.useCustomTitle === true
      && task.isEditable !== false;
  }

  isNewState(state: string | undefined): boolean {
    return this.sprintTaskService.isNewState(state);
  }

  isBugTagSelected(item: WorkItemDraftConfig, tag: string): boolean {
    return item.bugTags.includes(tag);
  }

  toggleBugTag(item: WorkItemDraftConfig, tag: string): void {
    if (this.isItemReadOnly(item)) return;
    const index = item.bugTags.findIndex(current => current === tag);
    if (index >= 0) {
      item.bugTags.splice(index, 1);
      return;
    }
    item.bugTags.push(tag);
  }

  getWorkItemUrl(workItemId: number): string {
    const organization = this.draft?.organization || this.selectedOrganization;
    const projectName = this.draft?.projectName || this.getSelectedProjectName();
    if (!organization || !projectName) {
      return '#';
    }
    return `https://dev.azure.com/${encodeURIComponent(organization)}/${encodeURIComponent(projectName)}/_workitems/edit/${workItemId}`;
  }

  getCategoryHours(item: WorkItemDraftConfig, category: 'dev' | 'testing' | 'other'): number {
    return this.sprintTaskService.getCategoryHours(item, category);
  }

  getTotalHours(item: WorkItemDraftConfig): number {
    return this.sprintTaskService.getTotalHours(item);
  }

  getGlobalCategoryHours(category: 'dev' | 'testing' | 'other'): number {
    if (!this.draft) return 0;
    return Number(this.draft.items.reduce((acc, item) => acc + this.getCategoryHours(item, category), 0).toFixed(3));
  }

  getGlobalTotalHours(): number {
    if (!this.draft) return 0;
    return Number(this.draft.items.reduce((acc, item) => acc + this.getTotalHours(item), 0).toFixed(3));
  }

  toggleItemExpanded(itemId: number): void {
    if (this.expandedItemIds.has(itemId)) {
      this.expandedItemIds.delete(itemId);
      return;
    }
    this.expandedItemIds.add(itemId);
  }

  isItemExpanded(itemId: number): boolean {
    return this.expandedItemIds.has(itemId);
  }

  getPrefix(type: WorkItemDraftConfig['workItemType']): string {
    if (type === 'Feature') return 'FT';
    if (type === 'Bug') return 'BUG';
    return 'US';
  }

  format2(value: number): string {
    return String(Math.max(0, Math.floor(value))).padStart(2, '0');
  }

  private getSelectedProjectName(): string {
    return this.projects.find(project => project.id === this.selectedProjectId)?.name || '';
  }

  private getSelectedTeamName(): string {
    return this.teams.find(team => team.id === this.selectedTeamId)?.name || '';
  }

  private isAllowedType(type: string): boolean {
    const normalized = type.trim().toLowerCase();
    return normalized === 'user story' || normalized === 'feature' || normalized === 'bug';
  }

  private showMessage(message: string, type: 'success' | 'error'): void {
    this.message = message;
    this.messageType = type;
    setTimeout(() => {
      this.message = '';
    }, 4000);
  }

  private requiresBugTags(item: WorkItemDraftConfig): boolean {
    return this.captureMode === 'manual' && item.workItemType === 'Bug' && item.isManualCapture === true;
  }

  private tryLoadFallbackTeamUsers(organization: string, projectName: string): void {
    if (!organization || !projectName) return;
    this.sprintGanttService.getProjects(organization).subscribe(projects => {
      const selectedProject = projects.find(project => project.name.toLowerCase() === projectName.toLowerCase()) || projects[0];
      if (!selectedProject) return;
      this.sprintGanttService.getTeams(organization, selectedProject.id).subscribe(teams => {
        const selectedTeam = teams.find(team => team.name.trim().toLowerCase() === 'mayansoft') || teams[0];
        if (!selectedTeam) return;
        this.sprintGanttService.getTeamMembers(organization, selectedProject.id, selectedTeam.id).subscribe(users => {
          this.teamUsers = users;
          if (this.draft) {
            this.draft.teamUsers = users;
          }
        });
      });
    });
  }

  private ensureDraftCompatibility(draft: SprintTaskDraft): void {
    draft.items.forEach(item => {
      if (!Array.isArray(item.bugTags)) {
        item.bugTags = [];
      }
      if (typeof item.isManualCapture !== 'boolean') {
        item.isManualCapture = !draft.sprintId;
      }
      if (typeof item.workItemState !== 'string') {
        item.workItemState = 'New';
      }
      if (typeof item.isEditable !== 'boolean') {
        item.isEditable = this.sprintTaskService.isNewState(item.workItemState);
      }
      if (typeof item.usesExistingTasks !== 'boolean') {
        item.usesExistingTasks = item.tasks.some(task => typeof task.existingTaskId === 'number');
      }
      if (!Array.isArray(item.devTaskPercentages) || item.devTaskPercentages.length === 0) {
        item.devTaskPercentages = this.template.devTasks.map(task => ({
          id: task.id,
          name: task.name,
          percentage: Number(task.percentage || 0)
        }));
      }
      if (!item.testingReviewAssignedTo) {
        const legacyReviewer = (item as any).testingPeerSpecAssignedTo || (item as any).testingPeerTestAssignedTo || item.testingAssignedTo || '';
        item.testingReviewAssignedTo = legacyReviewer;
      }
      item.tasks.forEach(task => {
        if (typeof task.state !== 'string') {
          task.state = 'New';
        }
        if (typeof task.isEditable !== 'boolean') {
          task.isEditable = this.sprintTaskService.isNewState(task.state) && item.isEditable !== false;
        }
      });
      this.sprintTaskService.recalculateDevTasks(item, this.template);
      this.sprintTaskService.applyAssignees(item);
    });
    this.initializeNewOtherTaskInputs(draft);
  }

  private expandFirstItem(draft: SprintTaskDraft): void {
    this.expandedItemIds.clear();
    const first = draft.items[0];
    if (first) {
      this.expandedItemIds.add(first.workItemId);
    }
  }

  private initializeNewOtherTaskInputs(draft: SprintTaskDraft): void {
    draft.items.forEach(item => {
      this.newOtherTaskNameByItem[item.workItemId] = this.getSuggestedOtherTaskName(item);
      if (typeof this.newOtherTaskEstimateByItem[item.workItemId] !== 'number') {
        this.newOtherTaskEstimateByItem[item.workItemId] = 0;
      }
    });
  }

  private getSuggestedOtherTaskName(item: WorkItemDraftConfig): string {
    const nextTaskId = this.getNextOtherTaskId(item);
    return `${this.getPrefix(item.workItemType)} ${item.workItemId} Task ${this.format2(nextTaskId)} Nueva tarea`;
  }

  private getNextOtherTaskId(item: WorkItemDraftConfig): number {
    const next = item.tasks
      .filter(task => task.category === 'other')
      .reduce((max, task) => {
        const taskId = Number(task.templateTaskId || 0);
        return taskId > 0 && taskId < 100 ? Math.max(max, taskId) : max;
      }, 0) + 1;
    return Math.min(next, 99);
  }
}
