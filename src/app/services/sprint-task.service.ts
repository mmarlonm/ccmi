import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { ConfigService } from './config.service';
import {
  SprintTaskDraft,
  WorkItemDraftConfig,
  DraftTaskItem,
  ImportResult,
  TASK_DEFINITIONS,
  TaskSection
} from '../models/sprint-task-config.model';

@Injectable({ providedIn: 'root' })
export class SprintTaskService {
  private readonly DRAFT_KEY = 'cmmi5_sprint_task_draft';
  private http = inject(HttpClient);
  private configService = inject(ConfigService);

  // ─── LocalStorage ────────────────────────────────────────────────────────────

  saveDraft(draft: SprintTaskDraft): void {
    draft.lastSaved = new Date().toISOString();
    localStorage.setItem(this.DRAFT_KEY, JSON.stringify(draft));
  }

  loadDraft(): SprintTaskDraft | null {
    const data = localStorage.getItem(this.DRAFT_KEY);
    return data ? JSON.parse(data) : null;
  }

  clearDraft(): void {
    localStorage.removeItem(this.DRAFT_KEY);
  }

  // ─── Construcción del borrador ────────────────────────────────────────────────

  /**
   * Dada una lista de US/FT cargados del sprint, construye la configuración inicial.
   */
  buildDraftConfig(
    sprintId: string,
    sprintName: string,
    iterationPath: string,
    workItems: any[]  // items de CMMIMetrics.developmentRate.items
  ): SprintTaskDraft {
    // Detectar usuarios únicos del sprint (de US/FT Y de sus tareas)
    const usersSet = new Set<string>();
    workItems.forEach(wi => {
      // Usuario del propio WI (assignedTo / isw)
      if (wi.isw && wi.isw !== 'Unassigned' && wi.isw !== 'Sin asignar') {
        usersSet.add(wi.isw);
      }
      // Usuarios asignados a las tareas del WI (captura a Georgina y otros)
      if (wi.tasks && Array.isArray(wi.tasks)) {
        wi.tasks.forEach((task: any) => {
          const assignee = task.assignedTo;
          if (assignee && assignee !== 'Sin asignar' && assignee !== 'Unassigned') {
            usersSet.add(assignee);
          }
        });
      }
    });
    const sprintUsers = Array.from(usersSet).sort((a, b) => a.localeCompare(b));

    const items: WorkItemDraftConfig[] = workItems
      .filter(wi => ['User Story', 'Feature', 'Requirement', 'Product Backlog Item', 'Requisito'].includes(wi.type))
      .map(wi => this.buildWorkItemConfig(wi, iterationPath, sprintUsers));

    return {
      sprintId,
      sprintName,
      iterationPath,
      sprintUsers,
      items,
      status: 'draft',
      lastSaved: new Date().toISOString()
    };
  }

  private buildWorkItemConfig(wi: any, iterationPath: string, sprintUsers: string[]): WorkItemDraftConfig {
    const size = wi.size || 0;
    const hours = this.getHoursForSize(size);
    const tasks = this.buildTaskItems(wi, size, hours, sprintUsers[0] || '');

    return {
      workItemId: parseInt(wi.id),
      workItemType: wi.type as any,
      title: wi.title,
      size,
      sizeSource: wi.sizeSource || 'none',
      iterationPath: wi.iterationPath || iterationPath,
      areaPath: wi.project || '',
      devAssignedTo: sprintUsers[0] || '',
      testingAssignedTo: sprintUsers[1] || sprintUsers[0] || '',
      otrasAssignedTo: sprintUsers[0] || '',
      tasks,
      imported: false
    };
  }

  private buildTaskItems(wi: any, size: number, hours: { dev: number; testing: number; otras: number }, defaultUser: string): DraftTaskItem[] {
    const prefix = wi.type === 'Feature' ? 'FT' : 'US';
    const id = wi.id;

    return TASK_DEFINITIONS.map(def => {
      let taskHours = 0;

      if (def.section === 'dev' && def.defaultPct && def.defaultPct > 0) {
        taskHours = parseFloat((hours.dev * def.defaultPct).toFixed(2));
      } else if (def.section === 'testing' && def.defaultPct) {
        taskHours = parseFloat((hours.testing * def.defaultPct).toFixed(2));
      } else if (def.section === 'otras' && def.defaultPct) {
        taskHours = parseFloat((hours.otras * def.defaultPct).toFixed(2));
      }

      return {
        taskCode: def.taskCode,
        name: def.name,
        section: def.section,
        selected: !def.isOptional || def.defaultPct! > 0,
        hours: taskHours,
        assignedTo: defaultUser
      };
    });
  }

  /**
   * Calcula horas por SIZE usando la tasa base: 1 SIZE = 0.81 h (DEV).
   * Distribución: DEV = size × 0.81, Testing = size × 0.405, Otras = size × 0.2025
   */
  getHoursForSize(size: number): { dev: number; testing: number; otras: number } {
    if (size <= 0) return { dev: 0, testing: 0, otras: 0 };
    const BASE_RATE = 0.81; // horas por SIZE para DEV total
    return {
      dev:     parseFloat((size * BASE_RATE).toFixed(2)),
      testing: parseFloat((size * BASE_RATE * 0.5).toFixed(2)),
      otras:   parseFloat((size * BASE_RATE * 0.25).toFixed(2))
    };
  }

  /** Recalcula horas de las tareas de un WI dado su nuevo SIZE */
  recalculateHours(config: WorkItemDraftConfig): WorkItemDraftConfig {
    const hours = this.getHoursForSize(config.size);
    config.tasks = config.tasks.map(task => {
      const def = TASK_DEFINITIONS.find(d => d.name === task.name && d.section === task.section);
      if (!def || !def.defaultPct) return task;

      let taskHours = 0;
      if (task.section === 'dev')     taskHours = parseFloat((hours.dev     * def.defaultPct).toFixed(2));
      if (task.section === 'testing') taskHours = parseFloat((hours.testing * def.defaultPct).toFixed(2));
      if (task.section === 'otras')   taskHours = parseFloat((hours.otras   * def.defaultPct).toFixed(2));

      return { ...task, hours: taskHours };
    });
    return config;
  }

  /** Construye el título de la tarea según formato definido */
  buildTaskTitle(wi: WorkItemDraftConfig, task: DraftTaskItem): string {
    const prefix = wi.workItemType === 'Feature' ? 'FT' : 'US';
    return `${prefix} ${wi.workItemId}: Task ${task.taskCode} ${task.name}`;
  }

  // ─── Azure DevOps Integration ─────────────────────────────────────────────────

  private getHeaders(): HttpHeaders {
    const config = this.configService.getConfig();
    const token = btoa(`:${config?.azure.pat}`);
    return new HttpHeaders({
      'Authorization': `Basic ${token}`,
      'Content-Type': 'application/json-patch+json'
    });
  }

  /** Importa todas las tareas seleccionadas de todos los WI a Azure DevOps */
  importAllToAzure(draft: SprintTaskDraft): Observable<ImportResult[]> {
    const itemsToImport = draft.items.filter(wi => !wi.imported);
    if (itemsToImport.length === 0) return of([]);

    const requests = itemsToImport.map(wi => this.importWorkItemTasks(wi, draft));
    return forkJoin(requests);
  }

  /** Importa las tareas de un único WI a Azure */
  importWorkItemTasks(wi: WorkItemDraftConfig, draft: SprintTaskDraft): Observable<ImportResult> {
    const config = this.configService.getConfig();
    if (!config) return of({ workItemId: wi.workItemId, success: false, createdTaskIds: [], errors: ['No config'] });

    const selectedTasks = wi.tasks.filter(t => t.selected);
    if (selectedTasks.length === 0) {
      return of({ workItemId: wi.workItemId, success: true, createdTaskIds: [], errors: [] });
    }

    const taskRequests = selectedTasks.map(task => this.createAzureTask(wi, task, config));

    return forkJoin(taskRequests).pipe(
      map((results: any[]) => {
        const createdIds = results.filter(r => r.id).map(r => r.id);
        const errors = results.filter(r => r.error).map(r => r.error);
        return {
          workItemId: wi.workItemId,
          success: errors.length === 0,
          createdTaskIds: createdIds,
          errors
        };
      }),
      catchError(err => of({
        workItemId: wi.workItemId,
        success: false,
        createdTaskIds: [],
        errors: [err.message || 'Error desconocido']
      }))
    );
  }

  private createAzureTask(wi: WorkItemDraftConfig, task: DraftTaskItem, config: any): Observable<any> {
    const url = `https://dev.azure.com/${encodeURIComponent(config.azure.organization)}/${encodeURIComponent(config.azure.project)}/_apis/wit/workitems/$Task?api-version=7.0`;

    const body = [
      { op: 'add', path: '/fields/System.Title',           value: this.buildTaskTitle(wi, task) },
      { op: 'add', path: '/fields/System.IterationPath',   value: wi.iterationPath },
      { op: 'add', path: '/fields/System.AreaPath',        value: wi.areaPath },
      { op: 'add', path: '/fields/Microsoft.VSTS.Scheduling.OriginalEstimate', value: task.hours },
      { op: 'add', path: '/relations/-', value: {
          rel: 'System.LinkTypes.Hierarchy-Reverse',
          url: `https://dev.azure.com/${encodeURIComponent(config.azure.organization)}/${encodeURIComponent(config.azure.project)}/_apis/wit/workItems/${wi.workItemId}`,
          attributes: { comment: 'Task preconfigured by CMMI5 Analyzer' }
        }
      }
    ];

    // Add AssignedTo if we have a user
    if (task.assignedTo && task.assignedTo.trim()) {
      body.splice(4, 0, { op: 'add', path: '/fields/System.AssignedTo', value: task.assignedTo });
    }

    return this.http.post<any>(url, body, { headers: this.getHeaders() }).pipe(
      map(res => ({ id: res.id })),
      catchError(err => of({ error: `Task "${task.name}": ${err.error?.message || err.message}` }))
    );
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────────

  getTasksBySection(tasks: DraftTaskItem[], section: TaskSection): DraftTaskItem[] {
    return tasks.filter(t => t.section === section);
  }

  getSectionTotalHours(tasks: DraftTaskItem[], section: TaskSection): number {
    return tasks
      .filter(t => t.section === section && t.selected)
      .reduce((acc, t) => acc + t.hours, 0);
  }

  getTotalSelectedHours(tasks: DraftTaskItem[]): number {
    return tasks.filter(t => t.selected).reduce((acc, t) => acc + t.hours, 0);
  }
}
