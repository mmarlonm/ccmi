import { Injectable } from '@angular/core';
import { AppConfig, SprintTaskTemplate } from '../models/config.model';

@Injectable({
  providedIn: 'root'
})
export class ConfigService {
  private readonly STORAGE_KEY = 'cmmi5_analyzer_config';

  getDefaultSprintTaskTemplate(): SprintTaskTemplate {
    return {
      devTasks: [
        { id: 1, name: 'Elaboración de código', percentage: 80 },
        { id: 3, name: 'Review', percentage: 5 },
        { id: 4, name: 'Peer Review', percentage: 5 },
        { id: 5, name: 'Pruebas funcionales ISW', percentage: 10 }
      ],
      testingTasks: [
        { id: 1, name: 'Diseño de pruebas', originalStimated: 0 },
        { id: 2, name: 'Ejecución de pruebas', originalStimated: 0 },
        { id: 3, name: 'Registro de defectos', originalStimated: 0 },
        { id: 4, name: 'Peer Review de especificación', originalStimated: 0 },
        { id: 4, name: 'Peer Review Test', originalStimated: 0 },
        { id: 1, name: 'Especificación', originalStimated: 0 }
      ],
      otherTasks: [
        { id: 0, name: 'Análisis', originalStimated: 0 },
        { id: 7, name: 'Integración UAT', originalStimated: 0 },
        { id: 8, name: 'Documentación', originalStimated: 0 },
        { id: 9, name: 'Video capacitación', originalStimated: 0 }
      ]
    };
  }

  getConfig(): AppConfig | null {
    const data = localStorage.getItem(this.STORAGE_KEY);
    if (!data) return null;
    const config = JSON.parse(data) as AppConfig;
    if (!config.sprintTaskTemplate) {
      config.sprintTaskTemplate = this.getDefaultSprintTaskTemplate();
    }
    return config;
  }

  saveConfig(config: AppConfig): void {
    if (!config.sprintTaskTemplate) {
      config.sprintTaskTemplate = this.getDefaultSprintTaskTemplate();
    }
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(config));
  }

  hasConfig(): boolean {
    const config = this.getConfig();
    return !!(config?.azure.pat && config?.ai.apiKey);
  }
}
