import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AzureDevOpsService } from '../../services/azure-devops.service';
import { SprintTaskService } from '../../services/sprint-task.service';
import {
  SprintTaskDraft,
  WorkItemDraftConfig,
  DraftTaskItem,
  ImportResult,
  TaskSection,
  TASK_DEFINITIONS
} from '../../models/sprint-task-config.model';
import {
  LucideAngularModule,
  ClipboardList, ChevronDown, ChevronUp, Check, Save, Upload,
  AlertTriangle, RefreshCw, User, Clock, CheckSquare, Square,
  Layers, Code2, TestTube, MoreHorizontal, Loader2, X, Info,
  BookCheck, Zap, FileCode
} from 'lucide-angular';
import { finalize, catchError } from 'rxjs/operators';
import { of, forkJoin } from 'rxjs';

type StepState = 'select-sprint' | 'configure';

@Component({
  selector: 'app-sprint-config',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  styles: [`
    :host { display: block; }

    .step-badge {
      width: 32px; height: 32px;
      border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-weight: 700; font-size: 14px;
    }

    .section-header-dev     { background: linear-gradient(135deg, #4f46e5, #6366f1); }
    .section-header-testing { background: linear-gradient(135deg, #059669, #10b981); }
    .section-header-otras   { background: linear-gradient(135deg, #d97706, #f59e0b); }

    .section-card-dev     { border-left: 4px solid #6366f1; }
    .section-card-testing { border-left: 4px solid #10b981; }
    .section-card-otras   { border-left: 4px solid #f59e0b; }

    .badge-size {
      font-size: 11px; font-weight: 700; padding: 2px 8px;
      border-radius: 999px; letter-spacing: 0.05em;
    }
    .badge-field      { background: #dbeafe; color: #1d4ed8; }
    .badge-discussion { background: #ede9fe; color: #7c3aed; }
    .badge-none       { background: #f1f5f9; color: #64748b; }

    .wi-card {
      background: white;
      border-radius: 16px;
      border: 1.5px solid #e2e8f0;
      box-shadow: 0 1px 8px rgba(0,0,0,.04);
      overflow: hidden;
      transition: box-shadow .2s;
    }
    .wi-card:hover { box-shadow: 0 4px 20px rgba(0,0,0,.08); }
    .dark .wi-card { background: #1e293b; border-color: #334155; }

    .task-row {
      display: flex; align-items: center; gap: 8px;
      padding: 8px 12px;
      border-radius: 10px;
      transition: background .15s;
    }
    .task-row:hover { background: #f8fafc; }
    .dark .task-row:hover { background: #0f172a; }

    .task-row.selected-dev     { background: #eef2ff; }
    .task-row.selected-testing { background: #ecfdf5; }
    .task-row.selected-otras   { background: #fffbeb; }

    .hours-input {
      width: 70px; text-align: center;
      border: 1.5px solid #e2e8f0; border-radius: 8px;
      padding: 4px 8px; font-size: 13px;
      background: white; color: #1e293b;
      transition: border-color .15s;
    }
    .hours-input:focus { outline: none; border-color: #6366f1; box-shadow: 0 0 0 3px rgba(99,102,241,.15); }
    .dark .hours-input { background: #0f172a; border-color: #334155; color: #f1f5f9; }

    .user-select {
      border: 1.5px solid #e2e8f0; border-radius: 8px;
      padding: 6px 10px; font-size: 13px;
      background: white; color: #1e293b;
      transition: border-color .15s; cursor: pointer;
    }
    .user-select:focus { outline: none; border-color: #6366f1; box-shadow: 0 0 0 3px rgba(99,102,241,.15); }
    .dark .user-select { background: #0f172a; border-color: #334155; color: #f1f5f9; }

    .import-btn {
      background: linear-gradient(135deg, #4f46e5, #7c3aed);
      color: white; border: none; border-radius: 12px;
      padding: 12px 28px; font-weight: 700; font-size: 15px;
      cursor: pointer; display: flex; align-items: center; gap: 8px;
      box-shadow: 0 4px 16px rgba(79,70,229,.35);
      transition: all .2s;
    }
    .import-btn:hover { transform: translateY(-1px); box-shadow: 0 8px 24px rgba(79,70,229,.45); }
    .import-btn:active { transform: translateY(0); }
    .import-btn:disabled { opacity: .5; cursor: not-allowed; transform: none; }

    .save-btn {
      background: white; color: #4f46e5;
      border: 2px solid #4f46e5; border-radius: 12px;
      padding: 11px 24px; font-weight: 700; font-size: 15px;
      cursor: pointer; display: flex; align-items: center; gap: 8px;
      transition: all .2s;
    }
    .save-btn:hover { background: #eef2ff; }
    .dark .save-btn { background: transparent; color: #818cf8; border-color: #818cf8; }
    .dark .save-btn:hover { background: rgba(99,102,241,.15); }

    @keyframes fadeSlideIn {
      from { opacity: 0; transform: translateY(12px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    .animate-fsi { animation: fadeSlideIn .35s ease both; }

    .progress-bar-track { height: 6px; background: #e2e8f0; border-radius: 999px; overflow: hidden; }
    .progress-bar-fill  { height: 100%; border-radius: 999px; transition: width .4s ease;
                          background: linear-gradient(90deg, #4f46e5, #7c3aed); }

    .spinner { animation: spin 1s linear infinite; }
    @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  `],
  template: `
<div class="max-w-6xl mx-auto space-y-6 pb-10">

  <!-- Header -->
  <header class="animate-fsi">
    <div class="flex items-center gap-3 mb-1">
      <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-md shadow-indigo-500/20">
        <lucide-icon [name]="ClipboardList" size="20" class="text-white"></lucide-icon>
      </div>
      <div>
        <h2 class="text-2xl font-bold text-slate-800 dark:text-white">Configurar Sprint</h2>
        <p class="text-sm text-slate-500 dark:text-slate-400">Preconfigura tareas para US/FT antes de importar a Azure DevOps</p>
      </div>
    </div>
  </header>

  <!-- Step indicator -->
  <div class="flex items-center gap-3 animate-fsi" style="animation-delay:.05s">
    <div class="flex items-center gap-2">
      <div class="step-badge" [ngClass]="step === 'select-sprint' ? 'bg-indigo-500 text-white' : 'bg-green-500 text-white'">
        <lucide-icon *ngIf="step !== 'select-sprint'" [name]="Check" size="16"></lucide-icon>
        <span *ngIf="step === 'select-sprint'">1</span>
      </div>
      <span class="text-sm font-semibold" [ngClass]="step === 'select-sprint' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500'">Seleccionar Sprint</span>
    </div>
    <div class="flex-1 h-px bg-gradient-to-r from-slate-300 to-slate-200 dark:from-slate-600 dark:to-slate-700 max-w-16"></div>
    <div class="flex items-center gap-2">
      <div class="step-badge" [ngClass]="step === 'configure' ? 'bg-indigo-500 text-white' : 'bg-slate-200 text-slate-400 dark:bg-slate-700'">
        <span>2</span>
      </div>
      <span class="text-sm font-semibold" [ngClass]="step === 'configure' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'">Configurar Tareas</span>
    </div>
  </div>

  <!-- ─── PASO 1: Selección de Sprint ─────────────────────────────────────────── -->
  <div *ngIf="step === 'select-sprint'" class="glass-card animate-fsi" style="animation-delay:.1s">
    <div class="flex items-center gap-3 mb-6">
      <div class="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
        <lucide-icon [name]="Layers" size="16" class="text-indigo-600 dark:text-indigo-400"></lucide-icon>
      </div>
      <h3 class="text-lg font-semibold text-slate-800 dark:text-white">Selecciona el Sprint</h3>
    </div>

    <div *ngIf="loadingSprints" class="flex items-center gap-3 text-slate-500 py-4">
      <lucide-icon [name]="Loader2" size="18" class="spinner text-indigo-500"></lucide-icon>
      <span class="text-sm">Cargando sprints...</span>
    </div>

    <div *ngIf="!loadingSprints" class="space-y-4">
      <div>
        <label class="block text-sm font-medium mb-2 text-slate-600 dark:text-slate-300">Sprint disponible</label>
        <select [(ngModel)]="selectedSprintId" class="user-select w-full max-w-lg text-base" (change)="onSprintChange()">
          <option value="">-- Selecciona un sprint --</option>
          <option *ngFor="let s of sprints" [value]="s.id">{{ s.name }}</option>
        </select>
      </div>

      <!-- Draft restored notice -->
      <div *ngIf="draftRestored && existingDraft" class="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/40 rounded-xl">
        <lucide-icon [name]="Info" size="18" class="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5"></lucide-icon>
        <div class="flex-1 text-sm">
          <p class="font-semibold text-amber-800 dark:text-amber-300">Borrador encontrado</p>
          <p class="text-amber-700 dark:text-amber-400 mt-0.5">
            Sprint: <strong>{{ existingDraft.sprintName }}</strong> — Guardado el {{ existingDraft.lastSaved | date:'dd/MM/yyyy HH:mm' }}
          </p>
          <div class="flex gap-2 mt-2">
            <button (click)="resumeDraft()" class="text-xs bg-amber-500 hover:bg-amber-600 text-white px-3 py-1.5 rounded-lg font-semibold transition-colors">
              Retomar borrador
            </button>
            <button (click)="discardDraft()" class="text-xs bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600 px-3 py-1.5 rounded-lg font-semibold transition-colors hover:bg-slate-50 dark:hover:bg-slate-600">
              Descartar y crear nuevo
            </button>
          </div>
        </div>
      </div>

      <div class="flex gap-3 pt-2">
        <button
          (click)="loadSprintData()"
          [disabled]="!selectedSprintId || loadingItems"
          class="import-btn"
          style="padding: 10px 20px; font-size: 14px;">
          <lucide-icon *ngIf="!loadingItems" [name]="RefreshCw" size="16"></lucide-icon>
          <lucide-icon *ngIf="loadingItems" [name]="Loader2" size="16" class="spinner"></lucide-icon>
          {{ loadingItems ? 'Cargando...' : 'Cargar US / FT del Sprint' }}
        </button>
      </div>
    </div>
  </div>

  <!-- ─── PASO 2: Configuración de Tareas ──────────────────────────────────────── -->
  <div *ngIf="step === 'configure' && draft" class="space-y-5 animate-fsi" style="animation-delay:.05s">

    <!-- Toolbar -->
    <div class="glass-card p-4">
      <div class="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p class="text-xs text-slate-400 font-medium uppercase tracking-wider mb-0.5">Sprint configurado</p>
          <p class="text-lg font-bold text-slate-800 dark:text-white">{{ draft.sprintName }}</p>
          <p class="text-xs text-slate-500 mt-0.5">{{ draft.items.length }} items • {{ totalSelectedTasks }} tareas seleccionadas • {{ totalHours | number:'1.1-1' }}h totales</p>
        </div>

        <!-- Status badge -->
        <div class="flex items-center gap-2">
          <div *ngIf="draft.status === 'draft'" class="flex items-center gap-2 px-3 py-1.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/40 rounded-lg">
            <div class="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></div>
            <span class="text-xs font-semibold text-amber-700 dark:text-amber-400">Borrador local</span>
          </div>
          <div *ngIf="draft.status === 'partial'" class="flex items-center gap-2 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700/40 rounded-lg">
            <div class="w-2 h-2 rounded-full bg-blue-500"></div>
            <span class="text-xs font-semibold text-blue-700 dark:text-blue-400">Parcialmente importado</span>
          </div>
          <div *ngIf="draft.status === 'imported'" class="flex items-center gap-2 px-3 py-1.5 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700/40 rounded-lg">
            <lucide-icon [name]="Check" size="14" class="text-green-600 dark:text-green-400"></lucide-icon>
            <span class="text-xs font-semibold text-green-700 dark:text-green-400">Importado a Azure</span>
          </div>
        </div>

        <div class="flex items-center gap-3">
          <button (click)="goBack()" class="text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 flex items-center gap-1.5 px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <lucide-icon [name]="X" size="14"></lucide-icon> Cambiar sprint
          </button>
          <button (click)="saveDraft()" class="save-btn" style="padding: 9px 18px; font-size: 13px;">
            <lucide-icon [name]="Save" size="15"></lucide-icon> Guardar borrador
          </button>
          <button
            (click)="confirmImport()"
            [disabled]="importing || draft.status === 'imported'"
            class="import-btn" style="padding: 9px 18px; font-size: 13px;">
            <lucide-icon *ngIf="!importing" [name]="Upload" size="15"></lucide-icon>
            <lucide-icon *ngIf="importing" [name]="Loader2" size="15" class="spinner"></lucide-icon>
            {{ importing ? 'Importando...' : 'Importar a Azure' }}
          </button>
        </div>
      </div>

      <!-- Progress overall -->
      <div class="mt-3">
        <div class="flex justify-between text-xs text-slate-400 mb-1">
          <span>Items importados</span>
          <span>{{ importedCount }} / {{ draft.items.length }}</span>
        </div>
        <div class="progress-bar-track">
          <div class="progress-bar-fill" [style.width.%]="(importedCount / draft.items.length) * 100"></div>
        </div>
      </div>
    </div>

    <!-- Toast notification -->
    <div *ngIf="toastMessage" class="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-xl shadow-xl text-sm font-semibold animate-fsi"
      [ngClass]="toastType === 'success' ? 'bg-green-500 text-white' : toastType === 'error' ? 'bg-red-500 text-white' : 'bg-slate-800 text-white'">
      <lucide-icon [name]="toastType === 'success' ? Check : AlertTriangle" size="16"></lucide-icon>
      {{ toastMessage }}
    </div>

    <!-- Import result summary -->
    <div *ngIf="importResults.length > 0" class="glass-card p-4 border-l-4" [ngClass]="allImportSuccess ? 'border-green-500' : 'border-amber-500'">
      <h4 class="font-semibold text-slate-800 dark:text-white mb-2 flex items-center gap-2">
        <lucide-icon [name]="allImportSuccess ? BookCheck : AlertTriangle" size="16"
          [ngClass]="allImportSuccess ? 'text-green-500' : 'text-amber-500'"></lucide-icon>
        Resultado de importación
      </h4>
      <div *ngFor="let res of importResults" class="text-sm py-1 border-b border-slate-100 dark:border-slate-700 last:border-0">
        <span class="font-medium" [ngClass]="res.success ? 'text-green-600 dark:text-green-400' : 'text-red-500'">
          {{ res.success ? '✓' : '✗' }} WI #{{ res.workItemId }}
        </span>
        <span class="text-slate-500 ml-2">{{ res.createdTaskIds.length }} tareas creadas</span>
        <span *ngIf="res.errors.length > 0" class="text-red-500 ml-2">— {{ res.errors.join(', ') }}</span>
      </div>
    </div>

    <!-- WI Cards -->
    <div *ngFor="let wi of draft.items; let i = index" class="wi-card animate-fsi" [style.animation-delay]="(i * 0.04) + 's'">

      <!-- WI Header -->
      <div class="p-4 flex flex-wrap items-center gap-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
        (click)="toggleWiExpanded(wi.workItemId)">

        <div class="flex items-center gap-2 flex-1 min-w-0">
          <!-- Type icon -->
          <div class="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
            [ngClass]="wi.workItemType === 'Feature' ? 'bg-purple-100 dark:bg-purple-900/30' : 'bg-indigo-100 dark:bg-indigo-900/30'">
            <lucide-icon [name]="wi.workItemType === 'Feature' ? Zap : FileCode" size="14"
              [ngClass]="wi.workItemType === 'Feature' ? 'text-purple-600 dark:text-purple-400' : 'text-indigo-600 dark:text-indigo-400'"></lucide-icon>
          </div>
          <div class="min-w-0">
            <div class="flex items-center gap-2 flex-wrap">
              <span class="text-xs font-bold" [ngClass]="wi.workItemType === 'Feature' ? 'text-purple-600 dark:text-purple-400' : 'text-indigo-600 dark:text-indigo-400'">
                {{ wi.workItemType === 'Feature' ? 'FT' : 'US' }} #{{ wi.workItemId }}
              </span>
              <span class="badge-size" [ngClass]="'badge-' + wi.sizeSource">
                SIZE {{ wi.size > 0 ? wi.size : '?' }}
                <span *ngIf="wi.sizeSource === 'discussion'"> · discussion</span>
              </span>
              <span *ngIf="wi.imported" class="badge-size bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                ✓ Importado
              </span>
            </div>
            <p class="text-sm font-semibold text-slate-700 dark:text-slate-200 truncate mt-0.5">{{ wi.title }}</p>
          </div>
        </div>

        <div class="flex items-center gap-3 shrink-0">
          <div class="text-right">
            <p class="text-xs text-slate-400">Horas totales</p>
            <p class="text-sm font-bold text-slate-700 dark:text-slate-200">{{ getTotalHours(wi) | number:'1.1-1' }}h</p>
          </div>
          <lucide-icon [name]="isWiExpanded(wi.workItemId) ? ChevronUp : ChevronDown" size="18" class="text-slate-400"></lucide-icon>
        </div>
      </div>

      <!-- WI Body (expanded) -->
      <div *ngIf="isWiExpanded(wi.workItemId)" class="px-4 pb-5 space-y-4 border-t border-slate-100 dark:border-slate-700 pt-4">

        <!-- SIZE editor -->
        <div class="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
          <lucide-icon [name]="Info" size="14" class="text-slate-400 shrink-0"></lucide-icon>
          <label class="text-xs font-medium text-slate-500 dark:text-slate-400 shrink-0">Tamaño (SIZE):</label>
          <input type="number" [(ngModel)]="wi.size" min="0" (change)="onSizeChange(wi)"
            class="hours-input" style="width:60px" />
          <span class="text-xs text-slate-400">· Las horas se recalculan automáticamente</span>
        </div>

        <!-- Section: DEV -->
        <div class="section-card-dev rounded-xl overflow-hidden border border-slate-100 dark:border-slate-700">
          <div class="section-header-dev px-4 py-2.5 flex items-center justify-between cursor-pointer"
            (click)="toggleSection(wi.workItemId, 'dev')">
            <div class="flex items-center gap-2.5">
              <lucide-icon [name]="Code2" size="15" class="text-white/90"></lucide-icon>
              <span class="text-sm font-bold text-white">Tiempos DEV</span>
              <span class="text-xs bg-white/20 text-white px-2 py-0.5 rounded-full">{{ getTasksBySection(wi.tasks, 'dev').length }} tareas</span>
            </div>
            <div class="flex items-center gap-3">
              <span class="text-xs text-white/80 font-semibold">{{ getSectionHours(wi, 'dev') | number:'1.1-1' }}h</span>
              <!-- User assignment -->
              <select [(ngModel)]="wi.devAssignedTo" (change)="applyUserToSection(wi, 'dev')" (click)="$event.stopPropagation()"
                class="user-select text-xs" style="max-width:160px; padding: 4px 8px;">
                <option value="">Sin asignar</option>
                <option *ngFor="let u of draft.sprintUsers" [value]="u">{{ u }}</option>
              </select>
              <lucide-icon [name]="isSectionExpanded(wi.workItemId, 'dev') ? ChevronUp : ChevronDown" size="16" class="text-white/80"></lucide-icon>
            </div>
          </div>
          <div *ngIf="isSectionExpanded(wi.workItemId, 'dev')" class="p-3 space-y-1">
            <div *ngFor="let task of getTasksBySection(wi.tasks, 'dev')" class="task-row"
              [ngClass]="task.selected ? 'selected-dev' : ''">
              <button (click)="toggleTask(task)" class="shrink-0 transition-transform hover:scale-110">
                <lucide-icon [name]="task.selected ? CheckSquare : Square" size="18"
                  [ngClass]="task.selected ? 'text-indigo-500' : 'text-slate-300 dark:text-slate-600'"></lucide-icon>
              </button>
              <span class="flex-1 text-xs font-mono text-slate-700 dark:text-slate-200 truncate" [ngClass]="!task.selected ? 'opacity-40 line-through' : ''" [title]="getTaskTitle(wi, task)">{{ getTaskTitle(wi, task) }}</span>
              <div class="flex items-center gap-1.5 shrink-0">
                <lucide-icon [name]="Clock" size="13" class="text-slate-400"></lucide-icon>
                <input type="number" [(ngModel)]="task.hours" min="0" step="0.5"
                  [disabled]="!task.selected"
                  class="hours-input" />
                <span class="text-xs text-slate-400">h</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Section: TESTING -->
        <div class="section-card-testing rounded-xl overflow-hidden border border-slate-100 dark:border-slate-700">
          <div class="section-header-testing px-4 py-2.5 flex items-center justify-between cursor-pointer"
            (click)="toggleSection(wi.workItemId, 'testing')">
            <div class="flex items-center gap-2.5">
              <lucide-icon [name]="TestTube" size="15" class="text-white/90"></lucide-icon>
              <span class="text-sm font-bold text-white">Tiempos Testing</span>
              <span class="text-xs bg-white/20 text-white px-2 py-0.5 rounded-full">{{ getTasksBySection(wi.tasks, 'testing').length }} tareas</span>
            </div>
            <div class="flex items-center gap-3">
              <span class="text-xs text-white/80 font-semibold">{{ getSectionHours(wi, 'testing') | number:'1.1-1' }}h</span>
              <select [(ngModel)]="wi.testingAssignedTo" (change)="applyUserToSection(wi, 'testing')" (click)="$event.stopPropagation()"
                class="user-select text-xs" style="max-width:160px; padding: 4px 8px;">
                <option value="">Sin asignar</option>
                <option *ngFor="let u of draft.sprintUsers" [value]="u">{{ u }}</option>
              </select>
              <lucide-icon [name]="isSectionExpanded(wi.workItemId, 'testing') ? ChevronUp : ChevronDown" size="16" class="text-white/80"></lucide-icon>
            </div>
          </div>
          <div *ngIf="isSectionExpanded(wi.workItemId, 'testing')" class="p-3 space-y-1">
            <div *ngFor="let task of getTasksBySection(wi.tasks, 'testing')" class="task-row"
              [ngClass]="task.selected ? 'selected-testing' : ''">
              <button (click)="toggleTask(task)" class="shrink-0 transition-transform hover:scale-110">
                <lucide-icon [name]="task.selected ? CheckSquare : Square" size="18"
                  [ngClass]="task.selected ? 'text-green-500' : 'text-slate-300 dark:text-slate-600'"></lucide-icon>
              </button>
              <span class="flex-1 text-xs font-mono text-slate-700 dark:text-slate-200 truncate" [ngClass]="!task.selected ? 'opacity-40 line-through' : ''" [title]="getTaskTitle(wi, task)">{{ getTaskTitle(wi, task) }}</span>
              <div class="flex items-center gap-1.5 shrink-0">
                <lucide-icon [name]="Clock" size="13" class="text-slate-400"></lucide-icon>
                <input type="number" [(ngModel)]="task.hours" min="0" step="0.5"
                  [disabled]="!task.selected"
                  class="hours-input" />
                <span class="text-xs text-slate-400">h</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Section: OTRAS -->
        <div class="section-card-otras rounded-xl overflow-hidden border border-slate-100 dark:border-slate-700">
          <div class="section-header-otras px-4 py-2.5 flex items-center justify-between cursor-pointer"
            (click)="toggleSection(wi.workItemId, 'otras')">
            <div class="flex items-center gap-2.5">
              <lucide-icon [name]="MoreHorizontal" size="15" class="text-white/90"></lucide-icon>
              <span class="text-sm font-bold text-white">Otras Tareas</span>
              <span class="text-xs bg-white/20 text-white px-2 py-0.5 rounded-full">{{ getTasksBySection(wi.tasks, 'otras').length }} tareas</span>
            </div>
            <div class="flex items-center gap-3">
              <span class="text-xs text-white/80 font-semibold">{{ getSectionHours(wi, 'otras') | number:'1.1-1' }}h</span>
              <select [(ngModel)]="wi.otrasAssignedTo" (change)="applyUserToSection(wi, 'otras')" (click)="$event.stopPropagation()"
                class="user-select text-xs" style="max-width:160px; padding: 4px 8px;">
                <option value="">Sin asignar</option>
                <option *ngFor="let u of draft.sprintUsers" [value]="u">{{ u }}</option>
              </select>
              <lucide-icon [name]="isSectionExpanded(wi.workItemId, 'otras') ? ChevronUp : ChevronDown" size="16" class="text-white/80"></lucide-icon>
            </div>
          </div>
          <div *ngIf="isSectionExpanded(wi.workItemId, 'otras')" class="p-3 space-y-1">
            <div *ngFor="let task of getTasksBySection(wi.tasks, 'otras')" class="task-row"
              [ngClass]="task.selected ? 'selected-otras' : ''">
              <button (click)="toggleTask(task)" class="shrink-0 transition-transform hover:scale-110">
                <lucide-icon [name]="task.selected ? CheckSquare : Square" size="18"
                  [ngClass]="task.selected ? 'text-amber-500' : 'text-slate-300 dark:text-slate-600'"></lucide-icon>
              </button>
              <span class="flex-1 text-xs font-mono text-slate-700 dark:text-slate-200 truncate" [ngClass]="!task.selected ? 'opacity-40 line-through' : ''" [title]="getTaskTitle(wi, task)">{{ getTaskTitle(wi, task) }}</span>
              <div class="flex items-center gap-1.5 shrink-0">
                <lucide-icon [name]="Clock" size="13" class="text-slate-400"></lucide-icon>
                <input type="number" [(ngModel)]="task.hours" min="0" step="0.5"
                  [disabled]="!task.selected"
                  class="hours-input" />
                <span class="text-xs text-slate-400">h</span>
              </div>
            </div>
          </div>
        </div>

      </div><!-- /WI Body -->
    </div><!-- /WI Cards loop -->

    <!-- Bottom actions -->
    <div class="flex justify-end gap-3 pt-2">
      <button (click)="saveDraft()" class="save-btn">
        <lucide-icon [name]="Save" size="16"></lucide-icon> Guardar borrador
      </button>
      <button (click)="confirmImport()" [disabled]="importing || draft.status === 'imported'" class="import-btn">
        <lucide-icon *ngIf="!importing" [name]="Upload" size="16"></lucide-icon>
        <lucide-icon *ngIf="importing" [name]="Loader2" size="16" class="spinner"></lucide-icon>
        {{ importing ? 'Importando a Azure...' : 'Importar a Azure DevOps' }}
      </button>
    </div>

  </div><!-- /Step 2 -->

</div><!-- /max-w -->

<!-- Import Confirm Modal -->
<div *ngIf="showImportModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" (click)="showImportModal = false">
  <div class="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-6 max-w-md w-full mx-4 animate-fsi" (click)="$event.stopPropagation()">
    <div class="flex items-center gap-3 mb-4">
      <div class="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
        <lucide-icon [name]="Upload" size="20" class="text-indigo-600 dark:text-indigo-400"></lucide-icon>
      </div>
      <h3 class="text-lg font-bold text-slate-800 dark:text-white">Confirmar importación</h3>
    </div>
    <p class="text-sm text-slate-600 dark:text-slate-300 mb-2">
      Se crearán <strong>{{ totalSelectedTasks }}</strong> tareas en Azure DevOps para el sprint <strong>{{ draft?.sprintName }}</strong>.
    </p>
    <p class="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg mb-5 flex items-start gap-2">
      <lucide-icon [name]="AlertTriangle" size="14" class="shrink-0 mt-0.5"></lucide-icon>
      Esta acción crea las tareas en Azure DevOps. Los ítems ya importados no se duplicarán.
    </p>
    <div class="flex gap-3 justify-end">
      <button (click)="showImportModal = false" class="px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
        Cancelar
      </button>
      <button (click)="executeImport()" class="import-btn" style="padding: 9px 20px; font-size: 14px;">
        <lucide-icon [name]="Upload" size="15"></lucide-icon> Sí, importar
      </button>
    </div>
  </div>
</div>
  `
})
export class SprintConfigComponent implements OnInit {
  // Lucide icons
  readonly ClipboardList = ClipboardList;
  readonly ChevronDown = ChevronDown;
  readonly ChevronUp = ChevronUp;
  readonly Check = Check;
  readonly Save = Save;
  readonly Upload = Upload;
  readonly AlertTriangle = AlertTriangle;
  readonly RefreshCw = RefreshCw;
  readonly User = User;
  readonly Clock = Clock;
  readonly CheckSquare = CheckSquare;
  readonly Square = Square;
  readonly Layers = Layers;
  readonly Code2 = Code2;
  readonly TestTube = TestTube;
  readonly MoreHorizontal = MoreHorizontal;
  readonly Loader2 = Loader2;
  readonly X = X;
  readonly Info = Info;
  readonly BookCheck = BookCheck;
  readonly Zap = Zap;
  readonly FileCode = FileCode;

  private adoService = inject(AzureDevOpsService);
  private sprintTaskService = inject(SprintTaskService);

  // State
  step: StepState = 'select-sprint';
  sprints: any[] = [];
  selectedSprintId = '';
  loadingSprints = false;
  loadingItems = false;
  importing = false;
  showImportModal = false;

  draft: SprintTaskDraft | null = null;
  existingDraft: SprintTaskDraft | null = null;
  draftRestored = false;
  importResults: ImportResult[] = [];

  // UI expansion state
  private expandedWis = new Set<number>();
  private expandedSections = new Map<string, boolean>();

  // Toast
  toastMessage = '';
  toastType: 'success' | 'error' | 'info' = 'success';
  private toastTimer: any;

  ngOnInit(): void {
    this.loadSprints();
    // Check for existing draft
    const saved = this.sprintTaskService.loadDraft();
    if (saved) {
      this.existingDraft = saved;
      this.draftRestored = true;
    }
  }

  loadSprints(): void {
    this.loadingSprints = true;
    this.adoService.getIterationNodes().subscribe({
      next: nodes => {
        this.sprints = nodes;
        this.loadingSprints = false;
      },
      error: () => { this.loadingSprints = false; }
    });
  }

  onSprintChange(): void { /* just for future hooks */ }

  resumeDraft(): void {
    if (!this.existingDraft) return;
    this.draft = this.existingDraft;
    this.draftRestored = false;
    this.step = 'configure';
    // Expand first WI by default
    if (this.draft.items.length > 0) {
      this.expandedWis.add(this.draft.items[0].workItemId);
      this.expandAllSectionsFor(this.draft.items[0].workItemId);
    }
  }

  discardDraft(): void {
    this.sprintTaskService.clearDraft();
    this.existingDraft = null;
    this.draftRestored = false;
  }

  loadSprintData(): void {
    if (!this.selectedSprintId) return;
    this.loadingItems = true;

    const sprint = this.sprints.find(s => s.id === this.selectedSprintId);
    const sprintName = sprint?.name || this.selectedSprintId;

    this.adoService.getMetrics(this.selectedSprintId).subscribe({
      next: metrics => {
        this.loadingItems = false;
        const items = metrics.developmentRate?.items || [];

        if (items.length === 0) {
          this.showToast('No se encontraron US/FT en este sprint.', 'error');
          return;
        }

        const iterationPath = sprint?.path || this.selectedSprintId;
        this.draft = this.sprintTaskService.buildDraftConfig(
          this.selectedSprintId, sprintName, iterationPath, items
        );

        // Auto-expand first item with all sections
        if (this.draft.items.length > 0) {
          const firstId = this.draft.items[0].workItemId;
          this.expandedWis.add(firstId);
          this.expandAllSectionsFor(firstId);
        }

        this.sprintTaskService.saveDraft(this.draft);
        this.step = 'configure';
        this.showToast(`${items.length} items cargados correctamente`, 'success');
      },
      error: () => {
        this.loadingItems = false;
        this.showToast('Error al cargar el sprint. Verifica la configuración.', 'error');
      }
    });
  }

  goBack(): void {
    this.step = 'select-sprint';
    this.importResults = [];
  }

  saveDraft(): void {
    if (!this.draft) return;
    this.sprintTaskService.saveDraft(this.draft);
    this.showToast('Borrador guardado correctamente', 'success');
  }

  confirmImport(): void {
    this.showImportModal = true;
  }

  executeImport(): void {
    if (!this.draft) return;
    this.showImportModal = false;
    this.importing = true;
    this.importResults = [];

    this.sprintTaskService.importAllToAzure(this.draft).pipe(
      finalize(() => { this.importing = false; })
    ).subscribe({
      next: results => {
        this.importResults = results;
        const allSuccess = results.every(r => r.success);

        // Update draft items imported status
        results.forEach(res => {
          const item = this.draft!.items.find(i => i.workItemId === res.workItemId);
          if (item && res.success) {
            item.imported = true;
            item.importedTaskIds = res.createdTaskIds;
          }
        });

        // Update overall status
        const allImported = this.draft!.items.every(i => i.imported);
        const someImported = this.draft!.items.some(i => i.imported);
        this.draft!.status = allImported ? 'imported' : (someImported ? 'partial' : 'draft');

        this.sprintTaskService.saveDraft(this.draft!);

        if (allSuccess) {
          this.showToast('¡Todas las tareas importadas correctamente a Azure DevOps!', 'success');
        } else {
          this.showToast('Importación completada con algunos errores', 'error');
        }
      },
      error: () => {
        this.importing = false;
        this.showToast('Error al importar a Azure DevOps', 'error');
      }
    });
  }

  // ─── UI helpers ───────────────────────────────────────────────────────────────

  toggleWiExpanded(id: number): void {
    if (this.expandedWis.has(id)) {
      this.expandedWis.delete(id);
    } else {
      this.expandedWis.add(id);
      this.expandAllSectionsFor(id);
    }
  }

  isWiExpanded(id: number): boolean {
    return this.expandedWis.has(id);
  }

  private expandAllSectionsFor(wiId: number): void {
    this.expandedSections.set(`${wiId}_dev`, true);
    this.expandedSections.set(`${wiId}_testing`, true);
    this.expandedSections.set(`${wiId}_otras`, true);
  }

  toggleSection(wiId: number, section: TaskSection): void {
    const key = `${wiId}_${section}`;
    this.expandedSections.set(key, !this.expandedSections.get(key));
  }

  isSectionExpanded(wiId: number, section: TaskSection): boolean {
    const key = `${wiId}_${section}`;
    return this.expandedSections.get(key) ?? true;
  }

  toggleTask(task: DraftTaskItem): void {
    task.selected = !task.selected;
  }

  onSizeChange(wi: WorkItemDraftConfig): void {
    this.sprintTaskService.recalculateHours(wi);
  }

  applyUserToSection(wi: WorkItemDraftConfig, section: TaskSection): void {
    const user = section === 'dev' ? wi.devAssignedTo
               : section === 'testing' ? wi.testingAssignedTo
               : wi.otrasAssignedTo;
    wi.tasks.filter(t => t.section === section).forEach(t => t.assignedTo = user);
  }

  getTasksBySection(tasks: DraftTaskItem[], section: TaskSection): DraftTaskItem[] {
    return this.sprintTaskService.getTasksBySection(tasks, section);
  }

  getSectionHours(wi: WorkItemDraftConfig, section: TaskSection): number {
    return this.sprintTaskService.getSectionTotalHours(wi.tasks, section);
  }

  getTotalHours(wi: WorkItemDraftConfig): number {
    return this.sprintTaskService.getTotalSelectedHours(wi.tasks);
  }

  /** Retorna el título formateado exactamente como se importará a Azure DevOps */
  getTaskTitle(wi: WorkItemDraftConfig, task: DraftTaskItem): string {
    return this.sprintTaskService.buildTaskTitle(wi, task);
  }

  get totalSelectedTasks(): number {
    if (!this.draft) return 0;
    return this.draft.items.reduce((acc, wi) => acc + wi.tasks.filter(t => t.selected).length, 0);
  }

  get totalHours(): number {
    if (!this.draft) return 0;
    return this.draft.items.reduce((acc, wi) => acc + this.getTotalHours(wi), 0);
  }

  get importedCount(): number {
    if (!this.draft) return 0;
    return this.draft.items.filter(i => i.imported).length;
  }

  get allImportSuccess(): boolean {
    return this.importResults.length > 0 && this.importResults.every(r => r.success);
  }

  showToast(message: string, type: 'success' | 'error' | 'info' = 'success'): void {
    this.toastMessage = message;
    this.toastType = type;
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => { this.toastMessage = ''; }, 4000);
  }
}
