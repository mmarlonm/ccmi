export interface AppConfig {
  userEmail?: string;
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
  sharePoint?: {
    siteUrl: string;       // Ej: https://blueoceantechnologies739.sharepoint.com/ProjectCenterOnline/RepositoriosDesarrolloMedida
    listPath: string;      // Ej: /ProjectCenterOnline/RepositoriosDesarrolloMedida/PMD00222  2023  OPE20F1 Evidencias CMMI
    releasesFolder: string;// Ej: /ProjectCenterOnline/RepositoriosDesarrolloMedida/PMD00222  2023  OPE20F1 Evidencias CMMI/4. Releases
    viewId?: string;       // GUID de la vista: 36d4bf7b-b63b-4516-89a4-569399e42b68
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
