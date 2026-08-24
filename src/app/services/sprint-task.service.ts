import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, forkJoin, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { ConfigService } from './config.service';
import { SprintTaskTemplate, TimedTaskTemplateItem } from '../models/config.model';
import {
  DraftTaskItem,
  ImportResult,
  SprintTaskDraft,
  WorkItemDraftConfig
} from '../models/sprint-task-config.model';

interface ExistingChildTask {
  id: number;
  title: string;
  state: string;
  activity: string;
  assignedTo: string;
  originalEstimate: number;
  remainingWork: number;
}

interface DraftSourceItem {
  id: number;
  type: string;
  title: string;
  iterationPath: string;
  areaPath: string;
  state?: string;
  tags?: string;
  isManualCapture?: boolean;
  existingTasks?: ExistingChildTask[];
}

@Injectable({ providedIn: 'root' })
export class SprintTaskService {
  private readonly DRAFT_KEY = 'cmmi5_sprint_task_draft';
  private http = inject(HttpClient);
  private configService = inject(ConfigService);

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

  buildDraftConfig(input: {
    organization: string;
    projectId: string;
    projectName: string;
    teamId: string;
    teamName: string;
    sprintId: string;
    sprintName: string;
    iterationPath: string;
    teamUsers: string[];
    template: SprintTaskTemplate;
    items: DraftSourceItem[];
  }): SprintTaskDraft {
    const items = input.items
      .filter(item => this.isSupportedParentType(item.type))
      .map(item => this.buildWorkItemConfig(item, input.template));

    return {
      organization: input.organization,
      projectId: input.projectId,
      projectName: input.projectName,
      teamId: input.teamId,
      teamName: input.teamName,
      sprintId: input.sprintId,
      sprintName: input.sprintName,
      iterationPath: input.iterationPath,
      teamUsers: input.teamUsers,
      template: input.template,
      items,
      status: 'draft',
      lastSaved: new Date().toISOString()
    };
  }

  addItemToDraft(
    draft: SprintTaskDraft,
    sourceItem: DraftSourceItem
  ): SprintTaskDraft {
    if (!this.isSupportedParentType(sourceItem.type)) return draft;
    if (draft.items.some(item => item.workItemId === sourceItem.id)) return draft;
    draft.items.push(this.buildWorkItemConfig(sourceItem, draft.template));
    draft.status = draft.items.some(item => item.imported) ? 'partial' : 'draft';
    return draft;
  }

  recalculateDevTasks(item: WorkItemDraftConfig, template: SprintTaskTemplate): void {
    if (item.usesExistingTasks) {
      return;
    }
    if (item.devTaskPercentages.length === 0) {
      item.devTaskPercentages = template.devTasks.map(task => ({
        id: task.id,
        name: task.name,
        percentage: Number(task.percentage || 0)
      }));
    }
    const staticTasks = item.tasks.filter(task => task.category !== 'dev');
    const devTasks = this.buildDevTasks(item);
    item.tasks = [...devTasks, ...staticTasks];
  }

  recalculateFixedTasks(item: WorkItemDraftConfig, template: SprintTaskTemplate): void {
    if (item.usesExistingTasks) {
      return;
    }
    const devTasks = item.tasks.filter(task => task.category === 'dev');
    const testing = this.buildTimedTasks(
      template.testingTasks,
      'testing',
      task => this.resolveTestingAssignee(item, task.name)
    );
    const other = this.buildTimedTasks(
      template.otherTasks,
      'other',
      () => item.otherAssignedTo
    );
    item.tasks = [...devTasks, ...testing, ...other];
  }

  applyAssignees(item: WorkItemDraftConfig): void {
    item.tasks.forEach(task => {
      if (task.isEditable === false) {
        return;
      }
      if (task.category === 'dev') {
        task.assignedTo = this.isPeerReviewCode(task.name) ? item.devPeerReviewAssignedTo : item.devAssignedTo;
        return;
      }
      if (task.category === 'testing') {
        task.assignedTo = this.resolveTestingAssignee(item, task.name);
        return;
      }
      task.assignedTo = item.otherAssignedTo;
    });
  }

  buildTaskTitle(item: WorkItemDraftConfig, task: DraftTaskItem): string {
    if (task.existingTaskId || task.useCustomTitle) {
      return task.name;
    }
    const prefix = this.getPrefix(item.workItemType);
    const taskId = this.pad2(task.templateTaskId);
    if (task.category === 'dev') {
      const component = this.pad2(task.componentNo || 1);
      return `${prefix} ${item.workItemId} Task ${component}.${taskId} ${task.name}`;
    }
    return `${prefix} ${item.workItemId} Task ${taskId} ${task.name}`;
  }

  importAllToAzure(draft: SprintTaskDraft): Observable<ImportResult[]> {
    const itemsToImport = draft.items.filter(item => !item.imported);
    if (itemsToImport.length === 0) return of([]);
    return forkJoin(itemsToImport.map(item => this.importWorkItemTasks(item)));
  }

  importWorkItemTasks(item: WorkItemDraftConfig): Observable<ImportResult> {
    const config = this.configService.getConfig();
    if (!config) {
      return of({ workItemId: item.workItemId, success: false, createdTaskIds: [], errors: ['No config'] });
    }
    if (item.isEditable === false) {
      return of({
        workItemId: item.workItemId,
        success: false,
        createdTaskIds: [],
        errors: [`El item padre está en estado "${item.workItemState || 'N/A'}" y es solo lectura.`]
      });
    }
    if (item.workItemType === 'Bug' && item.isManualCapture && item.bugTags.length === 0) {
      return of({
        workItemId: item.workItemId,
        success: false,
        createdTaskIds: [],
        errors: ['Debe seleccionar al menos un tag para el BUG manual.']
      });
    }

    const editableTasks = item.tasks.filter(task => task.isEditable !== false);
    const taskRequests = editableTasks
      .filter(task => task.existingTaskId || task.originalEstimate > 0)
      .map(task => task.existingTaskId
        ? this.updateAzureTask(task.existingTaskId, task, config.azure.organization, config.azure.project)
        : this.createAzureTask(item, task, config.azure.organization, config.azure.project)
      );

    const tagRequest = this.shouldReplaceParentBugTags(item)
      ? this.updateParentBugTags(item.workItemId, item.bugTags, config.azure.organization, config.azure.project)
      : of<{ id?: number; error?: string }>({});

    return tagRequest.pipe(
      switchMap(tagResult => {
        if (tagResult.error) {
          return of({
            workItemId: item.workItemId,
            success: false,
            createdTaskIds: [],
            errors: [String(tagResult.error)]
          });
        }
        if (taskRequests.length === 0) {
          return of({
            workItemId: item.workItemId,
            success: true,
            createdTaskIds: [],
            errors: []
          });
        }
        return forkJoin(taskRequests).pipe(
          map(results => {
            const createdTaskIds = results.filter(r => r.id).map(r => r.id as number);
            const errors = results.filter(r => r.error).map(r => String(r.error));
            return {
              workItemId: item.workItemId,
              success: errors.length === 0,
              createdTaskIds,
              errors
            };
          }),
          catchError(err => of({
            workItemId: item.workItemId,
            success: false,
            createdTaskIds: [],
            errors: [err?.message || 'Error desconocido']
          }))
        );
      })
    );
  }

  getCategoryHours(item: WorkItemDraftConfig, category: 'dev' | 'testing' | 'other'): number {
    return this.roundTo3(item.tasks
      .filter(task => task.category === category)
      .reduce((acc, task) => acc + task.originalEstimate, 0));
  }

  getTotalHours(item: WorkItemDraftConfig): number {
    return this.roundTo3(item.tasks.reduce((acc, task) => acc + task.originalEstimate, 0));
  }

  isNewState(state: string | undefined): boolean {
    return (state || '').trim().toLowerCase() === 'new';
  }

  private buildWorkItemConfig(
    sourceItem: DraftSourceItem,
    template: SprintTaskTemplate
  ): WorkItemDraftConfig {
    const workItemState = sourceItem.state || '';
    const item: WorkItemDraftConfig = {
      workItemId: sourceItem.id,
      workItemType: this.toSupportedType(sourceItem.type),
      title: sourceItem.title,
      iterationPath: sourceItem.iterationPath,
      areaPath: sourceItem.areaPath,
      workItemState,
      isEditable: this.isNewState(workItemState),
      isManualCapture: Boolean(sourceItem.isManualCapture),
      bugTags: this.parseTags(sourceItem.tags),
      devComponents: [{ componentNo: 1, hours: 0 }],
      devAssignedTo: '',
      devPeerReviewAssignedTo: '',
      testingAssignedTo: '',
      testingReviewAssignedTo: '',
      otherAssignedTo: '',
      devTaskPercentages: template.devTasks.map(task => ({
        id: task.id,
        name: task.name,
        percentage: Number(task.percentage || 0)
      })),
      tasks: [],
      usesExistingTasks: false,
      imported: false
    };

    const existingTasks = sourceItem.existingTasks || [];
    if (existingTasks.length > 0) {
      item.tasks = existingTasks.map(task => this.mapExistingTask(item, task));
      item.usesExistingTasks = true;
      this.deriveSectionAssigneesFromTasks(item);
      return item;
    }

    item.tasks = [
      ...this.buildDevTasks(item),
      ...this.buildTimedTasks(template.testingTasks, 'testing', task => this.resolveTestingAssignee(item, task.name)),
      ...this.buildTimedTasks(template.otherTasks, 'other', () => item.otherAssignedTo)
    ];
    return item;
  }

  private mapExistingTask(item: WorkItemDraftConfig, task: ExistingChildTask): DraftTaskItem {
    const normalizedActivity = task.activity.trim().toLowerCase();
    const isDevByName = /\btask\s+\d{2}\.\d{2}\b/i.test(task.title);
    const category: 'dev' | 'testing' | 'other' = normalizedActivity === 'testing'
      ? 'testing'
      : (isDevByName ? 'dev' : 'other');
    const componentNo = category === 'dev' ? this.extractComponentNo(task.title) : undefined;
    const templateTaskId = this.extractTemplateTaskId(task.title, category) || 0;
    const isEditable = this.isNewState(task.state) && item.isEditable !== false;

    return {
      existingTaskId: task.id,
      templateTaskId,
      name: task.title,
      category,
      componentNo,
      percentage: undefined,
      originalEstimate: Number(task.originalEstimate || 0),
      remainingWork: Number(task.remainingWork || 0),
      assignedTo: task.assignedTo || '',
      state: task.state,
      isEditable,
      useCustomTitle: true
    };
  }

  private deriveSectionAssigneesFromTasks(item: WorkItemDraftConfig): void {
    const devTasks = item.tasks.filter(task => task.category === 'dev');
    const testingTasks = item.tasks.filter(task => task.category === 'testing');
    const otherTasks = item.tasks.filter(task => task.category === 'other');
    const findFirstAssigned = (tasks: DraftTaskItem[]) => tasks.find(task => task.assignedTo?.trim())?.assignedTo || '';

    item.devPeerReviewAssignedTo = findFirstAssigned(devTasks.filter(task => this.isPeerReviewCode(task.name)));
    item.devAssignedTo = findFirstAssigned(devTasks.filter(task => !this.isPeerReviewCode(task.name)));
    item.testingReviewAssignedTo = findFirstAssigned(testingTasks.filter(task =>
      this.isPeerReviewSpec(task.name) || this.isPeerReviewTest(task.name)
    ));
    item.testingAssignedTo = findFirstAssigned(testingTasks.filter(task =>
      !this.isPeerReviewSpec(task.name) && !this.isPeerReviewTest(task.name)
    ));
    item.otherAssignedTo = findFirstAssigned(otherTasks);
  }

  private buildDevTasks(item: WorkItemDraftConfig): DraftTaskItem[] {
    const result: DraftTaskItem[] = [];
    item.devComponents.forEach(component => {
      item.devTaskPercentages.forEach(taskPct => {
        const hours = this.roundTo3((component.hours * taskPct.percentage) / 100);
        result.push({
          templateTaskId: taskPct.id,
          name: taskPct.name,
          category: 'dev',
          componentNo: component.componentNo,
          percentage: taskPct.percentage,
          originalEstimate: hours,
          remainingWork: hours,
          assignedTo: this.isPeerReviewCode(taskPct.name) ? item.devPeerReviewAssignedTo : item.devAssignedTo,
          state: 'New',
          isEditable: item.isEditable !== false
        });
      });
    });
    return result;
  }

  private buildTimedTasks(
    tasks: TimedTaskTemplateItem[],
    category: 'testing' | 'other',
    assigneeResolver: (task: TimedTaskTemplateItem) => string
  ): DraftTaskItem[] {
    return tasks.map(task => {
      const hours = Number(task.originalStimated || 0);
      return {
        templateTaskId: task.id,
        name: task.name,
        category,
        originalEstimate: hours,
        remainingWork: hours,
        assignedTo: assigneeResolver(task),
        state: 'New',
        isEditable: true
      };
    });
  }

  private createAzureTask(
    item: WorkItemDraftConfig,
    task: DraftTaskItem,
    organization: string,
    project: string
  ): Observable<{ id?: number; error?: string }> {
    const url = `https://dev.azure.com/${encodeURIComponent(organization)}/${encodeURIComponent(project)}/_apis/wit/workitems/$Task?api-version=7.0`;
    const body: any[] = [
      { op: 'add', path: '/fields/System.Title', value: this.buildTaskTitle(item, task) },
      { op: 'add', path: '/fields/System.IterationPath', value: item.iterationPath },
      { op: 'add', path: '/fields/System.AreaPath', value: item.areaPath },
      { op: 'add', path: '/fields/Microsoft.VSTS.Scheduling.OriginalEstimate', value: task.originalEstimate },
      { op: 'add', path: '/fields/Microsoft.VSTS.Scheduling.RemainingWork', value: task.remainingWork },
      { op: 'add', path: '/fields/Microsoft.VSTS.Common.Activity', value: task.category === 'testing' ? 'Testing' : 'Development' },
      {
        op: 'add',
        path: '/relations/-',
        value: {
          rel: 'System.LinkTypes.Hierarchy-Reverse',
          url: `https://dev.azure.com/${encodeURIComponent(organization)}/${encodeURIComponent(project)}/_apis/wit/workItems/${item.workItemId}`,
          attributes: { comment: 'Task preconfigured by CMMI5 Analyzer' }
        }
      }
    ];

    if (task.assignedTo && task.assignedTo.trim()) {
      body.splice(3, 0, { op: 'add', path: '/fields/System.AssignedTo', value: task.assignedTo.trim() });
    }

    return this.http.post<any>(url, body, { headers: this.getHeaders() }).pipe(
      map(res => ({ id: Number(res.id) })),
      catchError(err => of({ error: `Task "${task.name}": ${err?.error?.message || err?.message || 'Error desconocido'}` }))
    );
  }

  private updateAzureTask(
    taskId: number,
    task: DraftTaskItem,
    organization: string,
    project: string
  ): Observable<{ id?: number; error?: string }> {
    const url = `https://dev.azure.com/${encodeURIComponent(organization)}/${encodeURIComponent(project)}/_apis/wit/workitems/${taskId}?api-version=7.0`;
    const body: any[] = [
      { op: 'add', path: '/fields/Microsoft.VSTS.Scheduling.OriginalEstimate', value: task.originalEstimate },
      { op: 'add', path: '/fields/Microsoft.VSTS.Scheduling.RemainingWork', value: task.remainingWork }
    ];
    if (task.assignedTo && task.assignedTo.trim()) {
      body.push({ op: 'add', path: '/fields/System.AssignedTo', value: task.assignedTo.trim() });
    }

    return this.http.patch<any>(url, body, { headers: this.getHeaders() }).pipe(
      map(res => ({ id: Number(res.id || taskId) })),
      catchError(err => of({ error: `Task "${task.name}": ${err?.error?.message || err?.message || 'Error desconocido'}` }))
    );
  }

  private updateParentBugTags(
    workItemId: number,
    bugTags: string[],
    organization: string,
    project: string
  ): Observable<{ id?: number; error?: string }> {
    const url = `https://dev.azure.com/${encodeURIComponent(organization)}/${encodeURIComponent(project)}/_apis/wit/workitems/${workItemId}?api-version=7.0`;
    const body = [
      { op: 'add', path: '/fields/System.Tags', value: bugTags.join(';') }
    ];
    return this.http.patch<any>(url, body, { headers: this.getHeaders() }).pipe(
      map(res => ({ id: Number(res.id || workItemId) })),
      catchError(err => of({ error: `BUG #${workItemId}: ${err?.error?.message || err?.message || 'Error desconocido'}` }))
    );
  }

  private shouldReplaceParentBugTags(item: WorkItemDraftConfig): boolean {
    return item.workItemType === 'Bug' && item.isManualCapture === true;
  }

  private getHeaders(): HttpHeaders {
    const config = this.configService.getConfig();
    const token = btoa(`:${config?.azure.pat || ''}`);
    return new HttpHeaders({
      Authorization: `Basic ${token}`,
      'Content-Type': 'application/json-patch+json'
    });
  }

  private isSupportedParentType(type: string): boolean {
    const normalized = type.trim().toLowerCase();
    return normalized === 'user story' || normalized === 'feature' || normalized === 'bug';
  }

  private toSupportedType(type: string): 'User Story' | 'Feature' | 'Bug' {
    const normalized = type.trim().toLowerCase();
    if (normalized === 'feature') return 'Feature';
    if (normalized === 'bug') return 'Bug';
    return 'User Story';
  }

  private getPrefix(type: WorkItemDraftConfig['workItemType']): 'US' | 'FT' | 'BUG' {
    if (type === 'Feature') return 'FT';
    if (type === 'Bug') return 'BUG';
    return 'US';
  }

  private pad2(value: number): string {
    return String(Math.max(0, Math.floor(value))).padStart(2, '0');
  }

  private resolveTestingAssignee(item: WorkItemDraftConfig, taskName: string): string {
    if (this.isPeerReviewSpec(taskName) || this.isPeerReviewTest(taskName)) return item.testingReviewAssignedTo;
    return item.testingAssignedTo;
  }

  private isPeerReviewCode(name: string): boolean {
    return name.trim().toLowerCase() === 'peer review';
  }

  private isPeerReviewSpec(name: string): boolean {
    return name.trim().toLowerCase() === 'peer review de especificación';
  }

  private isPeerReviewTest(name: string): boolean {
    return name.trim().toLowerCase() === 'peer review test';
  }

  private extractComponentNo(title: string): number | undefined {
    const match = title.match(/\bTask\s+(\d{2})\.(\d{2})\b/i);
    if (!match) {
      return undefined;
    }
    const parsed = Number(match[1]);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  private extractTemplateTaskId(title: string, category: 'dev' | 'testing' | 'other'): number | undefined {
    if (category === 'dev') {
      const match = title.match(/\bTask\s+\d{2}\.(\d{2})\b/i);
      if (!match) return undefined;
      const parsed = Number(match[1]);
      return Number.isFinite(parsed) ? parsed : undefined;
    }
    const match = title.match(/\bTask\s+(\d{2})\b/i);
    if (!match) return undefined;
    const parsed = Number(match[1]);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  private parseTags(tags: string | undefined): string[] {
    if (!tags) {
      return [];
    }
    return tags
      .split(/[;,]/)
      .map(tag => tag.trim())
      .filter(Boolean);
  }

  private roundTo3(value: number): number {
    return Number(value.toFixed(3));
  }
}
