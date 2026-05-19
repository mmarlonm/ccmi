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
}
