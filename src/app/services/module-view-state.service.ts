import { Injectable } from '@angular/core';
import {
  AdoOrganization,
  AdoProject,
  AdoSprint,
  AdoTeam,
  SprintAssignmentEvent,
  SprintHierarchyNode
} from './sprint-gantt.service';

export interface SprintGanttViewState {
  organizations: AdoOrganization[];
  projects: AdoProject[];
  teams: AdoTeam[];
  sprints: AdoSprint[];
  selectedOrganization: string;
  selectedProjectId: string;
  selectedTeamId: string;
  selectedSprintId: string;
  loadedSprintStartDate: string | null;
  loadedSprintFinishDate: string | null;
  allNodes: SprintHierarchyNode[];
  visibleRows: Array<{ node: SprintHierarchyNode; depth: number }>;
  collapsedRows: number[];
  realHoursByNode: Array<[number, number | null]>;
  plannedHoursByNode: Array<[number, number]>;
  plannedStartHoursByNode: Array<[number, number]>;
  sprintDays: Array<{ date: Date; key: string; label: string; isSprintStart: boolean; isSprintEnd: boolean }>;
  sprintStartFullDate: string;
  sprintEndFullDate: string;
  delayedEndFullDate: string;
  sprintStartLinePct: number;
  sprintEndLinePct: number;
  delayedEndLinePct: number;
  hasDelayedEndLine: boolean;
  sprintStartKey: string;
  sprintEndKey: string;
  sprintWindowStartKey: string;
  sprintWindowEndKey: string;
  baselineFileName: string;
  baselineWarnings: string[];
  baselineSummary: { totalRows: number; matchedRows: number; unmatchedRows: number; matchedOnTime: number; matchedLate: number };
  personComparison: Array<{ person: string; plannedMarks: number; plannedItems: number; realAssignments: number; realItems: number }>;
  baselineByNode: Array<[number, { startKey: string; endKey: string; plannedPeople: string[]; hasLateEnd: boolean }]>;
  assignmentEvents: SprintAssignmentEvent[];
  rawBaselineResult: unknown;
  isBaselinePanelCollapsed: boolean;
  showCompletedTime: boolean;
  showBaselineTime: boolean;
  comparisonAnalysisText: string;
  comparisonAnalysisCopied: boolean;
}

export interface TaskComplianceViewState {
  organizations: AdoOrganization[];
  projects: AdoProject[];
  teams: AdoTeam[];
  sprints: AdoSprint[];
  selectedOrganization: string;
  selectedProjectId: string;
  selectedTeamId: string;
  selectedSprintId: string;
  evaluatedTasks: number;
  orderViolations: unknown[];
  stepperGroups: unknown[];
  incorrectClosures: unknown[];
  orderViolationAssigneeCounts: Array<{ assignee: string; affectedTasks: number }>;
  incorrectClosureAssigneeCounts: Array<{ assignee: string; affectedTasks: number }>;
}

@Injectable({
  providedIn: 'root'
})
export class ModuleViewStateService {
  private sprintGanttState: SprintGanttViewState | null = null;
  private taskComplianceState: TaskComplianceViewState | null = null;

  setSprintGanttState(state: SprintGanttViewState): void {
    this.sprintGanttState = state;
  }

  getSprintGanttState(): SprintGanttViewState | null {
    return this.sprintGanttState;
  }

  setTaskComplianceState(state: TaskComplianceViewState): void {
    this.taskComplianceState = state;
  }

  getTaskComplianceState(): TaskComplianceViewState | null {
    return this.taskComplianceState;
  }
}

