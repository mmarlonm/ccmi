export interface SprintBaselineRow {
  workItemId: number;
  title: string;
  plannedStartKey: string;
  plannedEndKey: string;
  plannedDayKeys: string[];
  personMarks: string[];
}

export interface SprintBaselineParseResult {
  rows: SprintBaselineRow[];
  warnings: string[];
  timelineDays: string[];
}

export interface SprintPersonPlanSummary {
  person: string;
  plannedMarks: number;
  plannedItems: number;
}

export interface SprintPersonRealSummary {
  person: string;
  realAssignments: number;
  realItems: number;
}

export interface SprintPersonComparisonSummary {
  person: string;
  plannedMarks: number;
  plannedItems: number;
  realAssignments: number;
  realItems: number;
}
