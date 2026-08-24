export interface AppConfig {
  azure: {
    pat: string;
    organization: string;
    project: string;
    areaPath?: string;
    iterationPath?: string;
  };
  ai: {
    provider: 'openai' | 'gemini';
    apiKey: string;
    model: string;
  };
  sprintTaskTemplate?: SprintTaskTemplate;
}

export interface DevTaskTemplateItem {
  id: number;
  name: string;
  percentage: number;
}

export interface TimedTaskTemplateItem {
  id: number;
  name: string;
  originalStimated: number;
}

export interface SprintTaskTemplate {
  devTasks: DevTaskTemplateItem[];
  testingTasks: TimedTaskTemplateItem[];
  otherTasks: TimedTaskTemplateItem[];
}
