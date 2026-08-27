import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, Search } from 'lucide-angular';
import { catchError, forkJoin, of, switchMap } from 'rxjs';
import {
  AdoOrganization,
  AdoProject,
  AdoSprint,
  AdoTeam,
  SprintGanttService,
  SprintHierarchyNode,
  SprintTaskStateUpdate
} from '../../services/sprint-gantt.service';
import { ModuleViewStateService } from '../../services/module-view-state.service';

interface TaskStateTimeline {
  initialState: string;
  transitions: Array<{ revisedDate: string; toState: string; changedBy: string }>;
  initialAssignee: string;
  assigneeTransitions: Array<{ revisedDate: string; toAssignee: string }>;
  changeEvents: Array<{ revisedDate: string; changedBy: string }>;
}

interface TaskSnapshot {
  taskId: number;
  title: string;
  webUrl: string;
  state: string;
  closedDateField: string | null;
  activity: string;
  assignedTo: string;
  templateComponentNo: number | null;
  templateTaskId: number | null;
  completedWork: number;
  parentId: number;
  parentType: string;
  parentTitle: string;
  parentWebUrl: string;
  timeline: TaskStateTimeline;
}

interface OrderViolation {
  parentId: number;
  parentType: string;
  parentTitle: string;
  parentWebUrl: string;
  assignee: string;
  activity: string;
  taskId: number;
  taskTitle: string;
  templateTaskId: number;
  eventType: 'Active' | 'Closed';
  eventDate: string;
  blockingTemplateTaskIds: number[];
  blockingTaskNames: string[];
}

interface StepperNode {
  taskId: number;
  taskTitle: string;
  taskWebUrl: string;
  templateTaskId: number;
  state: string;
  stateLabel: string;
  startedAt: string | null;
  closedAt: string | null;
  isPending: boolean;
  hasError: boolean;
  errorMessage: string | null;
}

interface ActivityStepperFlow {
  activity: string;
  steps: StepperNode[];
  errorDescriptions: string[];
  hasInconsistency: boolean;
}

interface PersonStepperRow {
  assignee: string;
  activities: ActivityStepperFlow[];
  hasInconsistency: boolean;
}

interface ParentStepperGroup {
  parentId: number;
  parentType: string;
  parentTitle: string;
  parentWebUrl: string;
  persons: PersonStepperRow[];
  hasInconsistency: boolean;
}

interface IncorrectClosure {
  parentId: number;
  parentType: string;
  parentTitle: string;
  parentWebUrl: string;
  taskId: number;
  taskTitle: string;
  taskWebUrl: string;
  assignee: string;
  completedWork: number;
  closureCase: 'new-close-with-work' | 'new-active-close-without-work';
}

interface AssigneeIssueCount {
  assignee: string;
  affectedTasks: number;
}

@Component({
  selector: 'app-task-compliance',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './task-compliance.component.html'
})
export class TaskComplianceComponent implements OnInit {
  private sprintGanttService = inject(SprintGanttService);
  private moduleViewStateService = inject(ModuleViewStateService);
  private readonly mexicoDateTimeFormatter = new Intl.DateTimeFormat('es-MX', {
    timeZone: 'America/Mexico_City',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });

  hasPatConfigured = false;
  loadingCatalogs = false;
  loadingData = false;
  errorMessage = '';

  organizations: AdoOrganization[] = [];
  projects: AdoProject[] = [];
  teams: AdoTeam[] = [];
  sprints: AdoSprint[] = [];

  selectedOrganization = '';
  selectedProjectId = '';
  selectedTeamId = '';
  selectedSprintId = '';

  evaluatedTasks = 0;
  orderViolations: OrderViolation[] = [];
  stepperGroups: ParentStepperGroup[] = [];
  showOnlyInconsistencies = true;
  incorrectClosures: IncorrectClosure[] = [];
  orderViolationAssigneeCounts: AssigneeIssueCount[] = [];
  incorrectClosureAssigneeCounts: AssigneeIssueCount[] = [];
  readonly Search = Search;

  ngOnInit(): void {
    this.hasPatConfigured = this.sprintGanttService.hasPatConfigured();
    if (!this.hasPatConfigured) {
      this.errorMessage = 'Configura un PAT en Configuración para consultar Azure DevOps.';
      return;
    }
    const hasRestoredState = this.restoreFromViewState();
    if (hasRestoredState) {
      return;
    }
    this.loadOrganizations();
  }

  get canLoad(): boolean {
    return Boolean(this.selectedOrganization && this.selectedProjectId && this.selectedTeamId && this.selectedSprintId);
  }

  get totalParentsWithIssues(): number {
    const parentIds = new Set<number>();
    this.orderViolations.forEach(v => parentIds.add(v.parentId));
    this.incorrectClosures.forEach(v => parentIds.add(v.parentId));
    return parentIds.size;
  }

  onOrganizationChange(): void {
    this.selectedProjectId = '';
    this.selectedTeamId = '';
    this.selectedSprintId = '';
    this.projects = [];
    this.teams = [];
    this.sprints = [];
    this.resetResults();
    if (this.selectedOrganization) {
      this.loadProjects();
    }
    this.persistViewState();
  }

  onProjectChange(): void {
    this.selectedTeamId = '';
    this.selectedSprintId = '';
    this.teams = [];
    this.sprints = [];
    this.resetResults();
    if (this.selectedProjectId) {
      this.loadTeams();
    }
    this.persistViewState();
  }

  onTeamChange(): void {
    this.selectedSprintId = '';
    this.sprints = [];
    this.resetResults();
    if (this.selectedTeamId) {
      this.loadSprints();
    }
    this.persistViewState();
  }

  onSprintChange(): void {
    this.resetResults();
    this.persistViewState();
    if (!this.selectedSprintId || this.loadingCatalogs || this.loadingData) {
      return;
    }
    this.loadData();
  }

  loadData(): void {
    if (!this.canLoad || this.loadingData) {
      return;
    }

    const selectedProject = this.projects.find(project => project.id === this.selectedProjectId);
    const selectedSprint = this.sprints.find(sprint => sprint.id === this.selectedSprintId);
    if (!selectedProject || !selectedSprint) {
      this.errorMessage = 'No fue posible resolver proyecto/sprint seleccionados.';
      return;
    }

    this.loadingData = true;
    this.errorMessage = '';
    this.resetResults();

    this.sprintGanttService
      .getSprintHierarchyNodes(
        this.selectedOrganization,
        selectedProject.name,
        this.selectedTeamId,
        this.selectedSprintId,
        selectedSprint.path || selectedSprint.name
      )
      .pipe(
        switchMap(nodes => {
          const taskIds = nodes
            .filter(node => this.isTaskType(node.type))
            .map(node => node.id);
          if (taskIds.length === 0) {
            return of({ nodes, updatesByTaskId: {} as Record<number, SprintTaskStateUpdate[]> });
          }
          return forkJoin({
            nodes: of(nodes),
            updatesByTaskId: this.sprintGanttService.getWorkItemStateUpdates(
              this.selectedOrganization,
              selectedProject.name,
              taskIds
            ).pipe(catchError(() => of({} as Record<number, SprintTaskStateUpdate[]>))
            )
          });
        })
      )
      .subscribe({
        next: ({ nodes, updatesByTaskId }) => {
          this.loadingData = false;
          this.evaluateCompliance(nodes, updatesByTaskId);
          this.persistViewState();
          if (this.evaluatedTasks === 0) {
            this.errorMessage = 'No se encontraron tareas válidas para evaluar en el sprint seleccionado.';
          }
        },
        error: () => {
          this.loadingData = false;
          this.errorMessage = 'No fue posible evaluar cumplimiento de tareas.';
        }
      });
  }

  private loadOrganizations(): void {
    this.loadingCatalogs = true;
    this.sprintGanttService.getOrganizations().subscribe({
      next: organizations => {
        this.organizations = organizations;
        const defaultOrg = this.sprintGanttService.getDefaultOrganization();
        const selected =
          organizations.find(org => org.name === this.selectedOrganization) ||
          organizations.find(org => org.name.toLowerCase() === defaultOrg.toLowerCase()) ||
          organizations[0];
        this.selectedOrganization = selected?.name || '';
        this.loadingCatalogs = false;
        if (this.selectedOrganization) {
          this.loadProjects();
        }
        this.persistViewState();
      },
      error: () => {
        this.loadingCatalogs = false;
        this.errorMessage = 'No fue posible cargar organizaciones.';
      }
    });
  }

  private loadProjects(): void {
    this.loadingCatalogs = true;
    this.sprintGanttService.getProjects(this.selectedOrganization).subscribe({
      next: projects => {
        this.projects = projects;
        const defaultProjectName = this.sprintGanttService.getDefaultProject();
        const selected =
          projects.find(project => project.id === this.selectedProjectId) ||
          projects.find(project => project.name.toLowerCase() === defaultProjectName.toLowerCase()) ||
          projects[0];
        this.selectedProjectId = selected?.id || '';
        this.loadingCatalogs = false;
        if (this.selectedProjectId) {
          this.loadTeams();
        }
        this.persistViewState();
      },
      error: () => {
        this.loadingCatalogs = false;
        this.errorMessage = 'No fue posible cargar proyectos.';
      }
    });
  }

  private loadTeams(): void {
    this.loadingCatalogs = true;
    this.sprintGanttService.getTeams(this.selectedOrganization, this.selectedProjectId).subscribe({
      next: teams => {
        this.teams = teams;
        const selected = teams.find(team => team.id === this.selectedTeamId) || teams[0];
        this.selectedTeamId = selected?.id || '';
        this.loadingCatalogs = false;
        if (this.selectedTeamId) {
          this.loadSprints();
        }
        this.persistViewState();
      },
      error: () => {
        this.loadingCatalogs = false;
        this.errorMessage = 'No fue posible cargar equipos.';
      }
    });
  }

  private loadSprints(): void {
    const selectedProject = this.projects.find(project => project.id === this.selectedProjectId);
    if (!selectedProject) {
      this.sprints = [];
      this.selectedSprintId = '';
      return;
    }
    this.loadingCatalogs = true;
    this.sprintGanttService.getSprints(this.selectedOrganization, selectedProject.name, this.selectedTeamId).subscribe({
      next: sprints => {
        this.sprints = sprints;
        const selected = sprints.find(sprint => sprint.id === this.selectedSprintId) || sprints[sprints.length - 1];
        this.selectedSprintId = selected?.id || '';
        this.loadingCatalogs = false;
        this.persistViewState();
        if (this.selectedSprintId && !this.loadingData) {
          this.loadData();
        }
      },
      error: () => {
        this.loadingCatalogs = false;
        this.errorMessage = 'No fue posible cargar sprints.';
      }
    });
  }

  private evaluateCompliance(
    nodes: SprintHierarchyNode[],
    updatesByTaskId: Record<number, SprintTaskStateUpdate[]>
  ): void {
    const nodeMap = new Map<number, SprintHierarchyNode>(nodes.map(node => [node.id, node]));
    const taskSnapshots: TaskSnapshot[] = [];

    nodes.forEach(node => {
      if (!this.isTaskType(node.type) || !node.parentId) {
        return;
      }
      const parent = nodeMap.get(node.parentId);
      if (!parent || !this.isSupportedParentType(parent.type)) {
        return;
      }

      const timeline = this.buildTaskTimeline(node, updatesByTaskId[node.id] || []);
      taskSnapshots.push({
        taskId: node.id,
        title: node.title || '',
        webUrl: node.webUrl || '',
        state: node.state || '',
        closedDateField: node.closedDate || null,
        activity: (node.activity || '').trim(),
        assignedTo: (node.assignedToName || 'Sin asignar').trim() || 'Sin asignar',
        templateComponentNo: this.extractTemplateComponentNo(node.title || ''),
        templateTaskId: this.extractTemplateTaskId(node.title || ''),
        completedWork: Number(node.completedWork || 0),
        parentId: parent.id,
        parentType: parent.type,
        parentTitle: parent.title || '',
        parentWebUrl: parent.webUrl || '',
        timeline
      });
    });

    this.evaluatedTasks = taskSnapshots.length;
    this.orderViolations = this.computeOrderViolations(taskSnapshots);
    this.stepperGroups = this.buildStepperGroups(taskSnapshots, this.orderViolations);
    this.incorrectClosures = this.computeIncorrectClosures(taskSnapshots);
    this.orderViolationAssigneeCounts = this.buildAssigneeIssueCounts(this.orderViolations);
    this.incorrectClosureAssigneeCounts = this.buildAssigneeIssueCounts(this.incorrectClosures);
  }

  private computeOrderViolations(tasks: TaskSnapshot[]): OrderViolation[] {
    const grouped = new Map<string, TaskSnapshot[]>();
    tasks
      .filter(task => task.templateTaskId !== null)
      .forEach(task => {
        const key = this.getOrderActivityGroupKey(task.parentId, task.activity);
        const list = grouped.get(key) || [];
        list.push(task);
        grouped.set(key, list);
      });

    const violations: OrderViolation[] = [];
    grouped.forEach(groupTasks => {
      if (groupTasks.length < 2) {
        return;
      }
      const taskDatesById = new Map<number, { startedAt: string | null; closedAt: string | null }>();
      groupTasks.forEach(task => {
        taskDatesById.set(task.taskId, {
          startedAt: this.resolveStartedAt(task),
          closedAt: this.resolveClosedAt(task)
        });
      });

      groupTasks.forEach(task => {
        const currentTemplateTaskId = task.templateTaskId;
        if (currentTemplateTaskId === null) {
          return;
        }

        const taskDates = taskDatesById.get(task.taskId);
        const eventDate = taskDates?.startedAt || taskDates?.closedAt || null;
        if (!eventDate || !this.isValidOperationalDate(eventDate)) {
          return;
        }

        const currentStartTime = this.getOperationalTime(taskDates?.startedAt || taskDates?.closedAt || null);
        if (currentStartTime === null) {
          return;
        }
        const currentReferenceDate = taskDates?.startedAt || taskDates?.closedAt || null;

        const eventType: 'Active' | 'Closed' = taskDates?.startedAt ? 'Active' : 'Closed';
        const eventAssignee = this.getTaskAssigneeAtEvent(task, eventDate);

        const blockingTasks = groupTasks
          .filter(candidate => candidate.taskId !== task.taskId && candidate.templateTaskId !== null && candidate.templateTaskId < currentTemplateTaskId)
          .filter(candidate => this.getTaskAssigneeAtEvent(candidate, eventDate) === eventAssignee)
          .filter(candidate => {
            if (task.templateComponentNo === null || candidate.templateComponentNo === null) {
              return true;
            }
            return candidate.templateComponentNo === task.templateComponentNo;
          })
          .filter(candidate => {
            const candidateDates = taskDatesById.get(candidate.taskId);
            const candidateClosedAt = candidateDates?.closedAt || null;
            const candidateClosedTime = this.getOperationalTime(candidateDates?.closedAt || null);
            if (candidateClosedTime === null) {
              return true;
            }
            if (this.isSameMexicoDisplayedMinute(candidateClosedAt, currentReferenceDate)) {
              return false;
            }
            return candidateClosedTime > currentStartTime;
          })
          .sort((a, b) => {
            const idA = Number(a.templateTaskId);
            const idB = Number(b.templateTaskId);
            if (idA !== idB) {
              return idA - idB;
            }
            return a.taskId - b.taskId;
          });
        const blockingTemplateTaskIds = blockingTasks
          .map(task => Number(task.templateTaskId))
          .sort((a, b) => a - b);
        const blockingTaskNames = blockingTasks
          .map(task => this.getCleanTaskName(task.title))
          .filter((value, index, array) => array.indexOf(value) === index);

        if (blockingTemplateTaskIds.length > 0) {
          violations.push({
            parentId: task.parentId,
            parentType: task.parentType,
            parentTitle: task.parentTitle,
            parentWebUrl: task.parentWebUrl,
            assignee: eventAssignee,
            activity: task.activity || 'Sin actividad',
            taskId: task.taskId,
            taskTitle: task.title,
            templateTaskId: currentTemplateTaskId,
            eventType,
            eventDate,
            blockingTemplateTaskIds,
            blockingTaskNames
          });
        }
      });
    });

    return violations.sort((a, b) => {
      if (a.parentId !== b.parentId) {
        return a.parentId - b.parentId;
      }
      if (a.assignee !== b.assignee) {
        return a.assignee.localeCompare(b.assignee);
      }
      return new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime();
    });
  }

  private getOperationalTime(value: string | null | undefined): number | null {
    if (!value || !this.isValidOperationalDate(value)) {
      return null;
    }
    const time = new Date(value).getTime();
    return Number.isNaN(time) ? null : time;
  }

  private isSameMexicoDisplayedMinute(dateA: string | null | undefined, dateB: string | null | undefined): boolean {
    const keyA = this.getMexicoMinuteKey(dateA);
    const keyB = this.getMexicoMinuteKey(dateB);
    if (!keyA || !keyB) {
      return false;
    }
    return keyA === keyB;
  }

  private getMexicoMinuteKey(value: string | null | undefined): string | null {
    if (!value || !this.isValidOperationalDate(value)) {
      return null;
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return null;
    }
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Mexico_City',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).formatToParts(date);

    const byType = new Map(parts.map(part => [part.type, part.value]));
    const year = byType.get('year');
    const month = byType.get('month');
    const day = byType.get('day');
    const hour = byType.get('hour');
    const minute = byType.get('minute');
    if (!year || !month || !day || !hour || !minute) {
      return null;
    }
    return `${year}-${month}-${day} ${hour}:${minute}`;
  }

  private getTaskStateAtEvent(task: TaskSnapshot, eventDate: string): string {
    const eventTime = new Date(eventDate).getTime();
    if (Number.isNaN(eventTime)) {
      return this.normalizeState(task.state);
    }
    let state = task.timeline.initialState;
    task.timeline.transitions.forEach(transition => {
      const transitionTime = new Date(transition.revisedDate).getTime();
      if (Number.isNaN(transitionTime) || !this.isValidOperationalDate(transition.revisedDate)) {
        return;
      }
      if (transitionTime <= eventTime) {
        state = transition.toState;
      }
    });
    return this.normalizeState(state || task.state);
  }

  private getTaskAssigneeAtEvent(task: TaskSnapshot, eventDate: string): string {
    const eventTime = new Date(eventDate).getTime();
    if (Number.isNaN(eventTime)) {
      return task.assignedTo;
    }
    let assignee = task.timeline.initialAssignee || task.assignedTo;
    task.timeline.assigneeTransitions.forEach(transition => {
      const transitionTime = new Date(transition.revisedDate).getTime();
      if (Number.isNaN(transitionTime) || !this.isValidOperationalDate(transition.revisedDate)) {
        return;
      }
      if (transitionTime <= eventTime) {
        assignee = transition.toAssignee;
      }
    });
    return (assignee || task.assignedTo || 'Sin asignar').trim() || 'Sin asignar';
  }

  private hasPersonStartedTaskByEvent(task: TaskSnapshot, assignee: string, eventDate: string): boolean {
    const targetAssignee = this.normalizeKey(assignee);
    if (!targetAssignee) {
      return false;
    }
    const eventTime = new Date(eventDate).getTime();
    if (Number.isNaN(eventTime)) {
      return false;
    }
    return task.timeline.changeEvents.some(change => {
      const changeTime = new Date(change.revisedDate).getTime();
      if (Number.isNaN(changeTime) || !this.isValidOperationalDate(change.revisedDate) || changeTime > eventTime) {
        return false;
      }
      return this.normalizeKey(change.changedBy) === targetAssignee;
    });
  }

  private resolveClosedAt(task: TaskSnapshot): string | null {
    const closedTransitions = task.timeline.transitions
      .filter(transition => this.isClosedState(transition.toState) && this.isValidOperationalDate(transition.revisedDate));
    if (closedTransitions.length > 0) {
      return closedTransitions[closedTransitions.length - 1].revisedDate;
    }
    if (this.isClosedState(task.state) && task.closedDateField && this.isValidOperationalDate(task.closedDateField)) {
      return task.closedDateField;
    }
    return null;
  }

  private resolveStartedAt(task: TaskSnapshot): string | null {
    const assigneeKey = this.normalizeKey(task.assignedTo);
    const firstAssigneeChange =
      task.timeline.changeEvents.find(change =>
        this.normalizeKey(change.changedBy) === assigneeKey && this.isValidOperationalDate(change.revisedDate)
      )?.revisedDate || null;

    const firstActive =
      task.timeline.transitions.find(transition =>
        this.isActiveState(transition.toState) && this.isValidOperationalDate(transition.revisedDate)
      )?.revisedDate || null;

    if (!firstAssigneeChange && !firstActive) {
      return null;
    }
    if (!firstAssigneeChange) {
      return firstActive;
    }
    if (!firstActive) {
      return firstAssigneeChange;
    }
    const assigneeTime = new Date(firstAssigneeChange).getTime();
    const activeTime = new Date(firstActive).getTime();
    return assigneeTime <= activeTime ? firstAssigneeChange : firstActive;
  }

  getNodeClass(node: StepperNode): string {
    if (node.hasError) {
      return 'bg-rose-600 text-white border-rose-500';
    }
    if (!node.isPending) {
      return 'bg-emerald-600 text-white border-emerald-500';
    }
    return 'bg-slate-200 text-slate-600 border-slate-300 dark:bg-slate-700 dark:text-slate-250 dark:border-slate-600';
  }

  getConnectorClass(current: StepperNode, next: StepperNode): string {
    if (current.hasError || next.hasError) {
      return 'border-rose-500 border-dashed';
    }
    if (!current.isPending && !next.isPending) {
      return 'border-emerald-500';
    }
    return 'border-slate-300 dark:border-slate-600';
  }

  getGroupStatusBadgeClass(hasInconsistency: boolean): string {
    return hasInconsistency
      ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300'
      : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300';
  }

  getGroupStatusText(hasInconsistency: boolean): string {
    return hasInconsistency ? '🔴 Secuencia Incompleta / Con Inconsistencias' : '🟢 Secuencia Correcta';
  }

  formatMexicoDateTime(value: string | null): string {
    if (!value || !this.isValidOperationalDate(value)) {
      return '';
    }
    return this.mexicoDateTimeFormatter.format(new Date(value));
  }

  private buildStepperGroups(tasks: TaskSnapshot[], violations: OrderViolation[]): ParentStepperGroup[] {
    const violationByTaskId = new Map<number, OrderViolation[]>();
    violations.forEach(violation => {
      const list = violationByTaskId.get(violation.taskId) || [];
      list.push(violation);
      violationByTaskId.set(violation.taskId, list);
    });

    const grouped = new Map<number, { parentId: number; parentType: string; parentTitle: string; parentWebUrl: string; tasks: TaskSnapshot[] }>();
    tasks.forEach(task => {
      const group = grouped.get(task.parentId);
      if (group) {
        group.tasks.push(task);
        return;
      }
      grouped.set(task.parentId, {
        parentId: task.parentId,
        parentType: task.parentType,
        parentTitle: task.parentTitle,
        parentWebUrl: task.parentWebUrl,
        tasks: [task]
      });
    });

    const groups: ParentStepperGroup[] = [];
    grouped.forEach(parentGroup => {
      const byPerson = new Map<string, TaskSnapshot[]>();
      parentGroup.tasks.forEach(task => {
        const key = this.normalizeKey(task.assignedTo) || 'sin-asignar';
        const personTasks = byPerson.get(key) || [];
        personTasks.push(task);
        byPerson.set(key, personTasks);
      });

      const persons: PersonStepperRow[] = [];
      byPerson.forEach(tasksByPerson => {
        const byActivity = new Map<string, TaskSnapshot[]>();
        tasksByPerson.forEach(task => {
          const activity = task.activity || 'Sin actividad';
          const key = this.normalizeKey(activity) || 'sin-actividad';
          const activityTasks = byActivity.get(key) || [];
          activityTasks.push(task);
          byActivity.set(key, activityTasks);
        });

        const activities: ActivityStepperFlow[] = [];
        byActivity.forEach(tasksByActivity => {
          const sortedSteps = tasksByActivity
            .filter(task => task.templateTaskId !== null)
            .sort((a, b) => {
              const idA = a.templateTaskId || 0;
              const idB = b.templateTaskId || 0;
              if (idA !== idB) return idA - idB;
              return a.taskId - b.taskId;
            });

          const flowTaskIds = new Set<number>(sortedSteps.map(step => step.taskId));
          const flowViolations = violations
            .filter(violation => flowTaskIds.has(violation.taskId))
            .sort((a, b) => {
            const t = new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime();
            if (t !== 0) return t;
            return a.taskId - b.taskId;
          });
          const taskNameByTemplateId = new Map<number, string>();
          const taskNameByTaskId = new Map<number, string>();
          sortedSteps.forEach(step => {
            const cleanName = this.getCleanTaskName(step.title);
            taskNameByTaskId.set(step.taskId, cleanName);
            const templateTaskId = step.templateTaskId || 0;
            if (templateTaskId >= 0 && !taskNameByTemplateId.has(templateTaskId)) {
              taskNameByTemplateId.set(templateTaskId, cleanName);
            }
          });
          const directPredecessorNameByTaskId = new Map<number, string>();
          sortedSteps.forEach((step, currentIndex) => {
            const currentTemplateTaskId = step.templateTaskId ?? null;
            if (currentTemplateTaskId === null) {
              return;
            }
            for (let idx = currentIndex - 1; idx >= 0; idx -= 1) {
              const candidate = sortedSteps[idx];
              const candidateTemplateTaskId = candidate.templateTaskId ?? null;
              if (candidateTemplateTaskId === null) {
                continue;
              }
              if (candidateTemplateTaskId < currentTemplateTaskId) {
                directPredecessorNameByTaskId.set(step.taskId, this.getCleanTaskName(candidate.title));
                break;
              }
            }
          });
          const firstViolationPositionByTaskId = new Map<number, number>();
          flowViolations.forEach((violation, idx) => {
            if (!firstViolationPositionByTaskId.has(violation.taskId)) {
              firstViolationPositionByTaskId.set(violation.taskId, idx + 1);
            }
          });

          const nodes: StepperNode[] = sortedSteps.map(task => {
            const relatedViolations = violationByTaskId.get(task.taskId) || [];
            const primaryViolation = relatedViolations[0];
            const hasError = relatedViolations.length > 0;
            const violationPosition = firstViolationPositionByTaskId.get(task.taskId) || 1;
            const blockingTaskId = primaryViolation?.blockingTemplateTaskIds?.[0] || 0;
            const blockingTaskName =
              primaryViolation?.blockingTaskNames?.[0] ||
              taskNameByTemplateId.get(blockingTaskId) ||
              'tarea previa sin identificar';
            const errorMessage = hasError && primaryViolation
              ? `Error de secuencia: "${blockingTaskName}" inconclusa`
              : null;
            const normalizedState = this.normalizeState(task.state);
            const isPending = this.isNewState(normalizedState) || this.isActiveState(normalizedState);
            const startedAt = this.resolveStartedAt(task);
            const closedAt = this.resolveClosedAt(task);
            return {
              taskId: task.taskId,
              taskTitle: task.title,
              taskWebUrl: task.webUrl,
              templateTaskId: task.templateTaskId || 0,
              state: task.state,
              stateLabel: this.toStateLabel(task.state),
              startedAt,
              closedAt,
              isPending,
              hasError,
              errorMessage: hasError ? `${errorMessage} (posición ${violationPosition})` : null
            };
          });

          const errorDescriptions = flowViolations
            .map(violation => {
              const position = firstViolationPositionByTaskId.get(violation.taskId) || 1;
              const blockingTaskId = violation.blockingTemplateTaskIds[0] || 0;
              const executedTaskName = taskNameByTaskId.get(violation.taskId) || this.getCleanTaskName(violation.taskTitle);
              const directPredecessorTaskName = directPredecessorNameByTaskId.get(violation.taskId);
              const blockingTaskName =
                directPredecessorTaskName ||
                violation.blockingTaskNames?.[0] ||
                taskNameByTemplateId.get(blockingTaskId) ||
                'tarea previa sin identificar';
              return `La tarea "${executedTaskName}" se ejecutó sin haber completado "${blockingTaskName}".`;
            })
            .filter((value, index, array) => array.indexOf(value) === index);

          activities.push({
            activity: sortedSteps[0]?.activity || 'Sin actividad',
            steps: nodes,
            errorDescriptions,
            hasInconsistency: nodes.some(node => node.hasError)
          });
        });

        activities.sort((a, b) => a.activity.localeCompare(b.activity));
        const visibleActivities = activities.filter(activity => !this.showOnlyInconsistencies || activity.hasInconsistency);
        persons.push({
          assignee: tasksByPerson[0]?.assignedTo || 'Sin asignar',
          activities: visibleActivities,
          hasInconsistency: activities.some(activity => activity.hasInconsistency)
        });
      });

      persons.sort((a, b) => a.assignee.localeCompare(b.assignee));
      const hasInconsistency = persons.some(person => person.hasInconsistency);
      if (this.showOnlyInconsistencies && !hasInconsistency) {
        return;
      }
      groups.push({
        parentId: parentGroup.parentId,
        parentType: parentGroup.parentType,
        parentTitle: parentGroup.parentTitle,
        parentWebUrl: parentGroup.parentWebUrl,
        persons: persons.filter(person => !this.showOnlyInconsistencies || person.hasInconsistency),
        hasInconsistency
      });
    });

    return groups.sort((a, b) => a.parentId - b.parentId);
  }

  private computeIncorrectClosures(tasks: TaskSnapshot[]): IncorrectClosure[] {
    const result: IncorrectClosure[] = [];
    tasks.forEach(task => {
      const lifecycle = this.getStateLifecycleFromLatestNew(task);
      if (lifecycle.length < 2 || !this.isNewState(lifecycle[0])) {
        return;
      }

      const firstClosedIndex = lifecycle.findIndex(state => this.isClosedState(state));
      if (firstClosedIndex < 0) {
        return;
      }

      const statesBeforeClose = lifecycle.slice(0, firstClosedIndex);
      const hasActiveBeforeClosed = statesBeforeClose.some(state => this.isActiveState(state));
      const hasDirectNewToClose = firstClosedIndex === 1 && this.isNewState(lifecycle[0]) && this.isClosedState(lifecycle[1]);

      if (hasDirectNewToClose && task.completedWork > 0) {
        result.push({
          parentId: task.parentId,
          parentType: task.parentType,
          parentTitle: task.parentTitle,
          parentWebUrl: task.parentWebUrl,
          taskId: task.taskId,
          taskTitle: task.title,
          taskWebUrl: task.webUrl,
          assignee: task.assignedTo,
          completedWork: task.completedWork,
          closureCase: 'new-close-with-work'
        });
        return;
      }

      if (hasActiveBeforeClosed && task.completedWork <= 0) {
        result.push({
          parentId: task.parentId,
          parentType: task.parentType,
          parentTitle: task.parentTitle,
          parentWebUrl: task.parentWebUrl,
          taskId: task.taskId,
          taskTitle: task.title,
          taskWebUrl: task.webUrl,
          assignee: task.assignedTo,
          completedWork: task.completedWork,
          closureCase: 'new-active-close-without-work'
        });
      }
    });

    return result.sort((a, b) => {
      if (a.parentId !== b.parentId) {
        return a.parentId - b.parentId;
      }
      return a.taskId - b.taskId;
    });
  }

  private buildTaskTimeline(node: SprintHierarchyNode, updates: SprintTaskStateUpdate[]): TaskStateTimeline {
    const transitions = updates
      .map(update => ({
        revisedDate: update.revisedDate,
        toState: this.normalizeState(update.newState || ''),
        changedBy: (update.changedByName || '').trim()
      }))
      .filter(transition => Boolean(transition.toState) && this.isValidOperationalDate(transition.revisedDate));

    const assigneeTransitions = updates
      .map(update => ({
        revisedDate: update.revisedDate,
        toAssignee: (update.newAssignedToName || '').trim()
      }))
      .filter(transition => Boolean(transition.toAssignee) && this.isValidOperationalDate(transition.revisedDate));

    const changeEvents = updates
      .map(update => ({
        revisedDate: update.revisedDate,
        changedBy: (update.changedByName || '').trim()
      }))
      .filter(event => Boolean(event.changedBy) && this.isValidOperationalDate(event.revisedDate));

    const initialFromUpdate = this.normalizeState(updates[0]?.oldState || '');
    const initialState = initialFromUpdate || this.normalizeState(node.state || '') || 'new';
    const initialAssignee = (updates[0]?.oldAssignedToName || node.assignedToName || 'Sin asignar').trim() || 'Sin asignar';

    return {
      initialState,
      transitions,
      initialAssignee,
      assigneeTransitions,
      changeEvents
    };
  }

  private getStateTrail(task: TaskSnapshot): string[] {
    const states: string[] = [task.timeline.initialState];
    task.timeline.transitions.forEach(transition => {
      if (!transition.toState) {
        return;
      }
      if (states[states.length - 1] !== transition.toState) {
        states.push(transition.toState);
      }
    });
    const finalState = this.normalizeState(task.state);
    if (finalState && states[states.length - 1] !== finalState) {
      states.push(finalState);
    }
    return states.filter(Boolean);
  }

  private getStateLifecycleFromLatestNew(task: TaskSnapshot): string[] {
    const trail = this.getStateTrail(task);
    if (trail.length === 0) {
      return [];
    }
    let lastNewIndex = -1;
    trail.forEach((state, index) => {
      if (this.isNewState(state)) {
        lastNewIndex = index;
      }
    });
    if (lastNewIndex < 0) {
      return [];
    }
    return trail.slice(lastNewIndex);
  }

  private extractTemplateTaskId(title: string): number | null {
    const devMatch = title.match(/\bTask\s+\d{2}\.(\d{2})\b/i);
    if (devMatch) {
      const parsedDev = Number(devMatch[1]);
      return Number.isFinite(parsedDev) ? parsedDev : null;
    }
    const simpleMatch = title.match(/\bTask\s+(\d{2})\b/i);
    if (!simpleMatch) {
      return null;
    }
    const parsed = Number(simpleMatch[1]);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private extractTemplateComponentNo(title: string): number | null {
    const match = (title || '').match(/\bTask\s+(\d{2})\.\d{2}\b/i);
    if (!match) {
      return null;
    }
    const parsed = Number(match[1]);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private getCleanTaskName(title: string): string {
    const withoutPrefix = (title || '').replace(/^\s*(US|BUG|FT)\s+\d+\s*:\s*/i, '').trim();
    return withoutPrefix || title || 'Tarea sin nombre';
  }

  private toStateLabel(state: string): string {
    const normalized = this.normalizeState(state);
    if (this.isClosedState(normalized)) {
      return 'Completado';
    }
    if (this.isActiveState(normalized)) {
      return 'En curso';
    }
    if (this.isNewState(normalized)) {
      return 'Pendiente';
    }
    return state || 'Pendiente';
  }

  private isValidOperationalDate(value: string | null | undefined): boolean {
    if (!value) {
      return false;
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return false;
    }
    const year = date.getUTCFullYear();
    if (year >= 9998 || year < 2000) {
      return false;
    }
    const nowPlusOneDay = Date.now() + (24 * 60 * 60 * 1000);
    return date.getTime() <= nowPlusOneDay;
  }

  private normalizeState(state: string): string {
    return (state || '').trim().toLowerCase();
  }

  private isTaskType(type: string): boolean {
    return this.normalizeKey(type) === 'task';
  }

  private isSupportedParentType(type: string): boolean {
    const normalized = this.normalizeKey(type);
    return normalized === 'user story' || normalized === 'feature' || normalized === 'bug';
  }

  private isNewState(state: string): boolean {
    return this.normalizeState(state) === 'new';
  }

  private isActiveState(state: string): boolean {
    return this.normalizeState(state) === 'active';
  }

  private isClosedState(state: string): boolean {
    const normalized = this.normalizeState(state);
    return normalized === 'closed' || normalized === 'done' || normalized === 'resolved' || normalized === 'completed';
  }

  private getOrderActivityGroupKey(parentId: number, activity: string): string {
    return `${parentId}|${this.normalizeKey(activity || 'sin actividad')}`;
  }

  private normalizeKey(value: string): string {
    return (value || '').trim().toLowerCase();
  }

  private buildAssigneeIssueCounts(rows: Array<{ assignee: string; taskId: number }>): AssigneeIssueCount[] {
    const grouped = new Map<string, { assignee: string; tasks: Set<number> }>();
    rows.forEach(row => {
      const normalized = this.normalizeKey(row.assignee) || 'sin-asignar';
      const assigneeLabel = (row.assignee || 'Sin asignar').trim() || 'Sin asignar';
      const current = grouped.get(normalized) || { assignee: assigneeLabel, tasks: new Set<number>() };
      current.tasks.add(row.taskId);
      grouped.set(normalized, current);
    });

    return Array.from(grouped.values())
      .map(group => ({
        assignee: group.assignee,
        affectedTasks: group.tasks.size
      }))
      .sort((a, b) => {
        if (b.affectedTasks !== a.affectedTasks) {
          return b.affectedTasks - a.affectedTasks;
        }
        return a.assignee.localeCompare(b.assignee);
      });
  }

  private resetResults(): void {
    this.evaluatedTasks = 0;
    this.orderViolations = [];
    this.stepperGroups = [];
    this.incorrectClosures = [];
    this.orderViolationAssigneeCounts = [];
    this.incorrectClosureAssigneeCounts = [];
  }

  private persistViewState(): void {
    this.moduleViewStateService.setTaskComplianceState({
      organizations: this.organizations,
      projects: this.projects,
      teams: this.teams,
      sprints: this.sprints,
      selectedOrganization: this.selectedOrganization,
      selectedProjectId: this.selectedProjectId,
      selectedTeamId: this.selectedTeamId,
      selectedSprintId: this.selectedSprintId,
      evaluatedTasks: this.evaluatedTasks,
      orderViolations: this.orderViolations,
      stepperGroups: this.stepperGroups,
      incorrectClosures: this.incorrectClosures,
      orderViolationAssigneeCounts: this.orderViolationAssigneeCounts,
      incorrectClosureAssigneeCounts: this.incorrectClosureAssigneeCounts
    });
  }

  private restoreFromViewState(): boolean {
    const state = this.moduleViewStateService.getTaskComplianceState();
    if (!state) {
      return false;
    }
    this.organizations = state.organizations || [];
    this.projects = state.projects || [];
    this.teams = state.teams || [];
    this.sprints = state.sprints || [];
    this.selectedOrganization = state.selectedOrganization || '';
    this.selectedProjectId = state.selectedProjectId || '';
    this.selectedTeamId = state.selectedTeamId || '';
    this.selectedSprintId = state.selectedSprintId || '';
    this.evaluatedTasks = state.evaluatedTasks || 0;
    this.orderViolations = (state.orderViolations || []) as OrderViolation[];
    this.stepperGroups = (state.stepperGroups || []) as ParentStepperGroup[];
    this.incorrectClosures = (state.incorrectClosures || []) as IncorrectClosure[];
    this.orderViolationAssigneeCounts = state.orderViolationAssigneeCounts || [];
    this.incorrectClosureAssigneeCounts = state.incorrectClosureAssigneeCounts || [];
    return Boolean(this.organizations.length > 0 || this.evaluatedTasks > 0);
  }
}
