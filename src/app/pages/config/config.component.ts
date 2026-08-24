import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ConfigService } from '../../services/config.service';
import { AppConfig, DevTaskTemplateItem, TimedTaskTemplateItem } from '../../models/config.model';
import { LucideAngularModule, Save, ShieldCheck, Cpu, ClipboardList, ChevronDown, ChevronUp } from 'lucide-angular';

@Component({
  selector: 'app-config',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  template: `
<div class="max-w-6xl mx-auto space-y-8 pt-4 md:pt-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
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

  <section class="glass-card space-y-4">
    <button class="w-full flex items-center justify-between text-left" (click)="toggleTemplatePanel()">
      <div class="flex items-center gap-3 text-teal-500">
        <lucide-icon [name]="ClipboardList" size="24"></lucide-icon>
        <div>
          <h3 class="text-xl font-semibold text-slate-800 dark:text-white">Estructura de tareas (Sprint)</h3>
          <p class="text-slate-500 dark:text-slate-400 text-sm">Plantilla editable para Dev, Testing y Otras tareas.</p>
        </div>
      </div>
      <lucide-icon [name]="templatePanelOpen ? ChevronUp : ChevronDown" size="18" class="text-slate-400"></lucide-icon>
    </button>

    <div *ngIf="templatePanelOpen" class="space-y-4 animate-in fade-in duration-200">
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div class="space-y-2">
          <h4 class="font-semibold text-sm">DevTasks</h4>
          <div *ngFor="let task of config.sprintTaskTemplate!.devTasks; let i=index" class="p-2 border rounded-lg space-y-2">
            <input [(ngModel)]="task.id" type="number" class="glass-input w-full text-xs" placeholder="Id">
            <input [(ngModel)]="task.name" type="text" class="glass-input w-full text-xs" placeholder="Name">
            <input [(ngModel)]="task.percentage" type="number" min="0" class="glass-input w-full text-xs" placeholder="Percentaje">
            <button class="text-red-500 text-xs" (click)="removeDevTask(i)">Eliminar</button>
          </div>
          <button class="glass-button text-xs px-2 py-1 w-full" (click)="addDevTask()">+ Agregar tarea</button>
        </div>

        <div class="space-y-2">
          <h4 class="font-semibold text-sm">TestingTasks</h4>
          <div *ngFor="let task of config.sprintTaskTemplate!.testingTasks; let i=index" class="p-2 border rounded-lg space-y-2">
            <input [(ngModel)]="task.id" type="number" class="glass-input w-full text-xs" placeholder="Id">
            <input [(ngModel)]="task.name" type="text" class="glass-input w-full text-xs" placeholder="Name">
            <input [(ngModel)]="task.originalStimated" type="number" min="0" step="0.5" class="glass-input w-full text-xs" placeholder="OriginalStimated">
            <button class="text-red-500 text-xs" (click)="removeTestingTask(i)">Eliminar</button>
          </div>
          <button class="glass-button text-xs px-2 py-1 w-full" (click)="addTestingTask()">+ Agregar tarea</button>
        </div>

        <div class="space-y-2">
          <h4 class="font-semibold text-sm">OtherTasks</h4>
          <div *ngFor="let task of config.sprintTaskTemplate!.otherTasks; let i=index" class="p-2 border rounded-lg space-y-2">
            <input [(ngModel)]="task.id" type="number" class="glass-input w-full text-xs" placeholder="Id">
            <input [(ngModel)]="task.name" type="text" class="glass-input w-full text-xs" placeholder="Name">
            <input [(ngModel)]="task.originalStimated" type="number" min="0" step="0.5" class="glass-input w-full text-xs" placeholder="OriginalStimated">
            <button class="text-red-500 text-xs" (click)="removeOtherTask(i)">Eliminar</button>
          </div>
          <button class="glass-button text-xs px-2 py-1 w-full" (click)="addOtherTask()">+ Agregar tarea</button>
        </div>
      </div>

      <div class="flex flex-wrap gap-2 pt-2">
        <button class="glass-button text-sm" (click)="exportTemplate()">Exportar template</button>
        <label class="glass-button text-sm cursor-pointer">
          Importar template
          <input type="file" accept="application/json" class="hidden" (change)="importTemplate($event)">
        </label>
      </div>
    </div>
  </section>

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
  readonly ClipboardList = ClipboardList;
  readonly ChevronDown = ChevronDown;
  readonly ChevronUp = ChevronUp;

  private configService = inject(ConfigService);

  config: AppConfig = this.configService.getConfig() || {
    azure: { pat: '', organization: '', project: '' },
    ai: { provider: 'openai', apiKey: '', model: '' },
    sprintTaskTemplate: this.configService.getDefaultSprintTaskTemplate()
  };
  templatePanelOpen = true;

  constructor() {
    if (!this.config.sprintTaskTemplate) {
      this.config.sprintTaskTemplate = this.configService.getDefaultSprintTaskTemplate();
    }
  }

  save() {
    this.configService.saveConfig(this.config);
    alert('Configuración guardada correctamente.');
  }

  toggleTemplatePanel(): void {
    this.templatePanelOpen = !this.templatePanelOpen;
  }

  addDevTask(): void {
    this.config.sprintTaskTemplate!.devTasks.push({ id: 0, name: '', percentage: 0 });
  }

  removeDevTask(index: number): void {
    this.config.sprintTaskTemplate!.devTasks.splice(index, 1);
  }

  addTestingTask(): void {
    this.config.sprintTaskTemplate!.testingTasks.push({ id: 0, name: '', originalStimated: 0 });
  }

  removeTestingTask(index: number): void {
    this.config.sprintTaskTemplate!.testingTasks.splice(index, 1);
  }

  addOtherTask(): void {
    this.config.sprintTaskTemplate!.otherTasks.push({ id: 0, name: '', originalStimated: 0 });
  }

  removeOtherTask(index: number): void {
    this.config.sprintTaskTemplate!.otherTasks.splice(index, 1);
  }

  exportTemplate(): void {
    const content = JSON.stringify(this.config.sprintTaskTemplate, null, 2);
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sprint-task-template.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  importTemplate(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        this.config.sprintTaskTemplate = this.normalizeTemplate(parsed);
      } catch {
        alert('El archivo no contiene un JSON válido.');
      }
    };
    reader.readAsText(file);
    input.value = '';
  }

  private normalizeTemplate(input: any): AppConfig['sprintTaskTemplate'] {
    const devRaw = Array.isArray(input?.devTasks) ? input.devTasks : (Array.isArray(input?.DevTasks) ? input.DevTasks : []);
    const testingRaw = Array.isArray(input?.testingTasks) ? input.testingTasks : (Array.isArray(input?.TestingTasks) ? input.TestingTasks : []);
    const otherRaw = Array.isArray(input?.otherTasks) ? input.otherTasks : (Array.isArray(input?.OtherTasks) ? input.OtherTasks : []);

    const devTasks: DevTaskTemplateItem[] = devRaw.map((item: any) => ({
      id: Number(item.id ?? item.Id ?? 0),
      name: String(item.name ?? item.Name ?? ''),
      percentage: Number(item.percentage ?? item.Percentaje ?? 0)
    }));

    const toTimed = (item: any): TimedTaskTemplateItem => ({
      id: Number(item.id ?? item.Id ?? 0),
      name: String(item.name ?? item.Name ?? ''),
      originalStimated: Number(item.originalStimated ?? item.OriginalStimated ?? 0)
    });

    return {
      devTasks,
      testingTasks: testingRaw.map(toTimed),
      otherTasks: otherRaw.map(toTimed)
    };
  }
}
