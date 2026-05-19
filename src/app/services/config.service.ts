import { Injectable } from '@angular/core';
import { AppConfig } from '../models/config.model';

@Injectable({
  providedIn: 'root'
})
export class ConfigService {
  private readonly STORAGE_KEY = 'cmmi5_analyzer_config';

  getConfig(): AppConfig | null {
    const data = localStorage.getItem(this.STORAGE_KEY);
    return data ? JSON.parse(data) : null;
  }

  saveConfig(config: AppConfig): void {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(config));
  }

  hasConfig(): boolean {
    const config = this.getConfig();
    return !!(config?.azure.pat && config?.ai.apiKey);
  }
}
