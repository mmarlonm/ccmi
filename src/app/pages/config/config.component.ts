import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ConfigService } from '../../services/config.service';
import { AppConfig } from '../../models/config.model';
import { LucideAngularModule, Save, ShieldCheck, Cpu } from 'lucide-angular';

@Component({
  selector: 'app-config',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  template: `
<div class="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
  <header>
    <h2 class="text-3xl font-bold text-slate-800 dark:text-white">Configuración del Sistema</h2>
    <p class="text-slate-500 dark:text-slate-400 mt-1">Administra tus credenciales de Azure DevOps e Inteligencia Artificial.</p>
  </header>

  <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
    <!-- Azure DevOps Config -->
    <section class="glass-card space-y-6">
      <div class="flex items-center gap-3 text-indigo-500">
        <lucide-icon [name]="ShieldCheck" size="24"></lucide-icon>
        <h3 class="text-xl font-semibold">Azure DevOps</h3>
      </div>

      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium mb-1.5 opacity-70">Organización</label>
          <input [(ngModel)]="config.azure.organization" type="text" placeholder="ej. mi-org" class="glass-input w-full">
        </div>
        <div>
          <label class="block text-sm font-medium mb-1.5 opacity-70">Proyecto</label>
          <input [(ngModel)]="config.azure.project" type="text" placeholder="ej. MiProyecto" class="glass-input w-full">
        </div>
        <div>
          <label class="block text-sm font-medium mb-1.5 opacity-70">Personal Access Token (PAT)</label>
          <input [(ngModel)]="config.azure.pat" type="password" placeholder="Tu PAT de Azure" class="glass-input w-full">
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium mb-1.5 opacity-70">Area Path (Opcional)</label>
            <input [(ngModel)]="config.azure.areaPath" type="text" placeholder="ej. MiEquipo" class="glass-input w-full text-xs">
          </div>
          <div>
            <label class="block text-sm font-medium mb-1.5 opacity-70">Iteration Path (Opcional)</label>
            <input [(ngModel)]="config.azure.iterationPath" type="text" placeholder="ej. Sprint 1" class="glass-input w-full text-xs">
          </div>
        </div>
      </div>
    </section>

    <!-- AI Config -->
    <section class="glass-card space-y-6">
      <div class="flex items-center gap-3 text-purple-500">
        <lucide-icon [name]="Cpu" size="24"></lucide-icon>
        <h3 class="text-xl font-semibold">Inteligencia Artificial</h3>
      </div>

      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium mb-1.5 opacity-70">Proveedor</label>
          <select [(ngModel)]="config.ai.provider" class="glass-input w-full appearance-none">
            <option value="openai">OpenAI (ChatGPT)</option>
            <option value="gemini">Google Gemini</option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium mb-1.5 opacity-70">API Key</label>
          <input [(ngModel)]="config.ai.apiKey" type="password" placeholder="sk-..." class="glass-input w-full">
        </div>
        <div>
          <label class="block text-sm font-medium mb-1.5 opacity-70">Modelo</label>
          <input [(ngModel)]="config.ai.model" type="text" placeholder="ej. gpt-4o o gemini-1.5-pro" class="glass-input w-full">
        </div>
      </div>
    </section>
  </div>

  <div class="flex justify-end pt-4">
    <button (click)="save()" class="glass-button flex items-center gap-2">
      <lucide-icon [name]="Save" size="18"></lucide-icon>
      <span>Guardar Configuración</span>
    </button>
  </div>
</div>
  `
})
export class ConfigComponent {
  readonly Save = Save;
  readonly ShieldCheck = ShieldCheck;
  readonly Cpu = Cpu;

  private configService = inject(ConfigService);

  config: AppConfig = this.configService.getConfig() || {
    azure: { pat: '', organization: '', project: '' },
    ai: { provider: 'openai', apiKey: '', model: '' }
  };

  save() {
    this.configService.saveConfig(this.config);
    alert('Configuración guardada correctamente.');
  }
}
