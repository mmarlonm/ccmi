import { SprintTaskTemplate } from './config.model';

export type TaskCategory = 'dev' | 'testing' | 'other';

export interface DevelopmentComponent {
  componentNo: number;
  hours: number;
}

export interface DraftTaskItem {
  existingTaskId?: number;
  templateTaskId: number;
  name: string;
  category: TaskCategory;
  componentNo?: number;
  percentage?: number;
  originalEstimate: number;
  remainingWork: number;
  assignedTo: string;
  state?: string;
  isEditable?: boolean;
  useCustomTitle?: boolean;
}

export interface WorkItemDraftConfig {
  workItemId: number;
  workItemType: 'User Story' | 'Feature' | 'Bug';
  title: string;
  iterationPath: string;
  areaPath: string;
  workItemState?: string;
  isEditable?: boolean;
  isManualCapture?: boolean;
  bugTags: string[];
  devComponents: DevelopmentComponent[];
  devTaskPercentages: Array<{
    id: number;
    name: string;
    percentage: number;
  }>;
  devAssignedTo: string;
  devPeerReviewAssignedTo: string;
  testingAssignedTo: string;
  testingReviewAssignedTo: string;
  otherAssignedTo: string;
  tasks: DraftTaskItem[];
  usesExistingTasks?: boolean;
  imported: boolean;
  importedTaskIds?: number[];
}

export interface SprintTaskDraft {
  organization: string;
  projectName: string;
  projectId: string;
  teamId: string;
  teamName: string;
  sprintId: string;
  sprintName: string;
  iterationPath: string;
  teamUsers: string[];
  template: SprintTaskTemplate;
  items: WorkItemDraftConfig[];
  status: 'draft' | 'partial' | 'imported';
  lastSaved: string;
}

export interface ImportResult {
  workItemId: number;
  success: boolean;
  createdTaskIds: number[];
  errors: string[];
}
