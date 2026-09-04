import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { AzureDevOpsService } from '../../services/azure-devops.service';
import { MetricsApiService } from '../../services/metrics-api.service';
import { ConfigService } from '../../services/config.service';
import { NotificationService } from '../../services/notification.service';
import { CMMIMetrics } from '../../models/metrics.model';
import {
  LucideAngularModule,
  Workflow,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Upload,
  Calendar,
  UserCheck,
  CheckSquare,
  Sparkles,
  Link,
  ShieldCheck,
  ExternalLink,
  Clock,
  Layers,
  Save,
  HelpCircle,
  Copy,
  ChevronRight,
  Maximize2,
  Minimize2,
  ListOrdered,
  Terminal,
  Trash2,
  FolderTree,
  Folder,
  RefreshCw
} from 'lucide-angular';
import * as XLSX from 'xlsx';

export interface ItemIndividualAnalysis {
  itemId: string;
  itemType: string;
  title: string;
  currentIsw: string;
  reassignedIsw: string;
  reassignmentReason: string;
  analysisNotes: string;
  aiRecommendation?: string;
  isAiAnalyzing?: boolean;
  preAnalysisLinked?: boolean;
  estimatedPreHours?: number;
}

export interface ManualPreAnalysis {
  itemId: string;
  type: 'User Story' | 'Feature' | 'Bug Sprint' | 'Bug Kanban';
  title: string;
  estimatedHours: number;
  assignedIsw: string;
  notes: string;
  createdAt: string;
  isLinkedToAzure?: boolean;
}

export interface SaaoMacroTask {
  tag: string;
  macroTitle: string;
  releaseName: string;
  assignedTo: string;
  startDate: string;
  endDate: string;
  deliverableBigRock: string;
  estimatedHours?: number;
  estimatedMinutes?: number;
  tasks: string[];
  status: 'pending' | 'inserted' | 'saved';
}

export interface MinutaRiesgos {
  puntosDiscutidos: string;
  riesgosIdentificados: string;
  oportunidades: string;
  acuerdos: string;
  savedDate?: string;
}

export interface SprintEvidences {
  emailEvidenceUrl: string;
  risksMinutaUrl: string;
  releasePresentationUrl: string;
  sprintPresentationUrl: string;
  isReleasePresented: boolean;
  isSprintPresented: boolean;
}

export interface SharePointFolderItem {
  id: string;
  name: string;
  fileRef: string;
  folderChildCount: number;
  itemChildCount: number;
  totalSizeBytes: number;
  modifiedDate: string;
  editorName: string;
  spItemUrl: string;
  isVerified: boolean;
}

@Component({
  selector: 'app-sprint-process',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './sprint-process.component.html',
  styleUrls: ['./sprint-process.component.css']
})
export class SprintProcessComponent implements OnInit {
  private adoService = inject(AzureDevOpsService);
  private metricsApiService = inject(MetricsApiService);
  private configService = inject(ConfigService);
  private notificationService = inject(NotificationService);
  private sanitizer = inject(DomSanitizer);

  // User Local Email
  userEmail: string = '';

  // SharePoint API Inspector State
  sharePointRawJsonInput: string = '';
  spFolderItems: SharePointFolderItem[] = [];
  isSpJsonParsed: boolean = false;
  isSpLoading: boolean = false;
  spLoadError: string = '';
  spReleaseNumber: string = '';  // Ej: "15"
  spAvailableReleases: { name: string; fileRef: string }[] = [];
  selectedReleaseFolder: string = '';
  isFetchingReleases: boolean = false;

  /** Obtiene la lista completa de releases disponibles desde la carpeta 4. Releases */
  fetchAvailableReleases(): void {
    const cfg = this.configService.getConfig();
    if (!cfg?.sharePoint?.siteUrl) {
      return;
    }
    const { siteUrl, listPath, releasesFolder, viewId } = cfg.sharePoint;
    this.isFetchingReleases = true;

    this.metricsApiService.getSharePointFolder(siteUrl, listPath, releasesFolder, viewId).subscribe({
      next: (res) => {
        this.isFetchingReleases = false;
        if (res?.success && res.rows?.length) {
          // Filtrar solo carpetas de releases (fsobjType 1)
          this.spAvailableReleases = res.rows
            .filter((r: any) => r.fsobjType === '1' || r.fsobjType === 1 || r.folderChildCount > 0 || r.name.toLowerCase().includes('release'))
            .map((r: any) => ({ name: r.name, fileRef: r.fileRef }));

          // Intentar preseleccionar Release 15 o la coincidencia actual
          const defaultRel = this.spAvailableReleases.find(r => r.name.includes('15')) || this.spAvailableReleases[0];
          if (defaultRel && !this.selectedReleaseFolder) {
            this.selectedReleaseFolder = defaultRel.fileRef;
          }
        }
      },
      error: () => {
        this.isFetchingReleases = false;
      }
    });
  }

  spAccessToken: string = '';

  /** Carga automáticamente las evidencias de la carpeta del release seleccionado */
  loadSharePointFolderFromConfig(): void {
    const cfg = this.configService.getConfig();
    if (!cfg?.sharePoint?.siteUrl) {
      this.notificationService.error('Configura la URL de SharePoint en Configuración (⚙️) primero.');
      return;
    }

    const { siteUrl, listPath, releasesFolder, viewId } = cfg.sharePoint;

    let targetFolder = this.selectedReleaseFolder;
    if (!targetFolder) {
      const releaseNum = this.spReleaseNumber.trim();
      targetFolder = releaseNum
        ? `${releasesFolder}/5.5 Release ${releaseNum}`
        : releasesFolder;
    }

    this.isSpLoading = true;
    this.spLoadError = '';

    this.metricsApiService.getSharePointFolder(siteUrl, listPath, targetFolder, viewId, this.spAccessToken).subscribe({
      next: (res) => {
        this.isSpLoading = false;
        if (!res?.success || !res.rows?.length) {
          this.spLoadError = res?.error || 'No se encontraron elementos en la carpeta del release especificada. Copia el JSON o proporciona un Bearer token.';
          return;
        }
        this.spFolderItems = res.rows.map((r: any) => ({
          id: r.id || r.uniqueId || '',
          name: r.name || '',
          fileRef: r.fileRef || '',
          folderChildCount: r.folderChildCount || 0,
          itemChildCount: r.itemChildCount || 0,
          totalSizeBytes: r.totalSizeBytes || 0,
          modifiedDate: r.modifiedDate || '',
          editorName: r.editorName || '',
          spItemUrl: r.spItemUrl || '',
          isVerified: (r.folderChildCount > 0 || r.itemChildCount > 0 || r.totalSizeBytes > 0)
        }));
        this.isSpJsonParsed = true;
        this.saveSharePointState();
        this.notificationService.success(`✅ ${this.spFolderItems.length} carpetas/archivos cargados de SharePoint.`);
      },
      error: () => {
        this.isSpLoading = false;
        this.spLoadError = 'Error 401: SharePoint requiere credenciales. Pega el JSON del endpoint directamente en el área inferior.';
      }
    });
  }

  get safeSaaoUrl(): SafeResourceUrl {
    return this.sanitizer.bypassSecurityTrustResourceUrl(this.saaoUrl);
  }

  // Icons
  readonly Workflow = Workflow;
  readonly CheckCircle2 = CheckCircle2;
  readonly AlertTriangle = AlertTriangle;
  readonly FileText = FileText;
  readonly Upload = Upload;
  readonly Calendar = Calendar;
  readonly UserCheck = UserCheck;
  readonly CheckSquare = CheckSquare;
  readonly Sparkles = Sparkles;
  readonly Link = Link;
  readonly ShieldCheck = ShieldCheck;
  readonly ExternalLink = ExternalLink;
  readonly Clock = Clock;
  readonly Layers = Layers;
  readonly Save = Save;
  readonly HelpCircle = HelpCircle;
  readonly Copy = Copy;
  readonly ChevronRight = ChevronRight;
  readonly Maximize2 = Maximize2;
  readonly Minimize2 = Minimize2;
  readonly ListOrdered = ListOrdered;
  readonly Terminal = Terminal;
  readonly Trash2 = Trash2;
  readonly FolderTree = FolderTree;
  readonly Folder = Folder;
  readonly RefreshCw = RefreshCw;

  // Sprint Data & Local Draft Sprints
  iterations: any[] = [];
  customDraftSprints: any[] = [];
  selectedIteration: string = '';
  selectedIterationName: string = '';
  metrics: CMMIMetrics | null = null;
  loading = false;
  activeStage: number = 1;

  // Modal State for Draft Sprints
  isCreateDraftModalOpen: boolean = false;
  newDraftSprintName: string = '';

  openCreateDraftSprintModal(): void {
    this.newDraftSprintName = '';
    this.isCreateDraftModalOpen = true;
  }

  saveDraftSprint(): void {
    if (!this.newDraftSprintName.trim()) {
      this.notificationService.error('Ingresa un nombre para el Sprint/Iteración local.');
      return;
    }

    const draftName = this.newDraftSprintName.trim();
    const draftId = `draft_${Date.now()}`;
    const draftObj = { id: draftId, name: draftName, path: `[Borrador BD] ${draftName}`, isDraft: true };

    this.customDraftSprints.push(draftObj);
    localStorage.setItem('cmmi5_custom_draft_sprints', JSON.stringify(this.customDraftSprints));

    // Seleccionar de inmediato el borrador creado
    this.selectedIteration = draftId;
    this.selectedIterationName = draftName;
    this.isCreateDraftModalOpen = false;

    // Inicializar métricas vacías estructuradas para permitir pre-análisis y Big Rocks antes de Azure
    this.metrics = {
      iterationName: draftName,
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
      developmentRate: { rate: 0, effort: 0, size: 0, status: 'green', totalItems: 0, totalEffort: 0, totalSize: 0, stdDeviation: 0, items: [] },
      defectRemovalEfficiency: { totalBugs: 0, closedOnTime: 0, closedLate: 0, proposed: 0, resolved: 0, active: 0, rate: 0, status: 'green', bugsList: [] },
      effortVariance: { planned: 0, actual: 0, rate: 0, stdDeviation: 0, avgIndividualRate: 0, absoluteRate: 0, status: 'green' },
      rework: { reqEffort: 0, reqRework: 0, bugRework: 0, totalRework: 0, rate: 0, status: 'green' },
      defectDensity: { bugs: 0, size: 0, density: 0, status: 'green' },
      escapedBugs: { bugsTesting: 0, bugsUat: 0, bugsProd: 0, totalBugs: 0, rate: 0, status: 'green', stdDeviation: 0, bugsList: [] }
    };

    this.saveFullProcessToMongoDB();
    this.notificationService.success(`Sprint borrador "${draftName}" configurado en BD. Ya puedes agregar Pre-Análisis y Big Rocks.`);
  }

  // Storage keys
  private readonly STORAGE_KEY = 'cmmi5_analyzer_selection';

  // Stage 2: Individual Item Analyses & Manual Pre-Analyses (MongoDB)
  sprintAnalysisNotes: string = '';
  itemAnalysesMap: { [itemId: string]: ItemIndividualAnalysis } = {};
  collaboratorsList: string[] = ['Marlon', 'Yair', 'ISW MID 1', 'ISW MID 2', 'Sin Reasignar'];
  manualPreAnalyses: ManualPreAnalysis[] = [];
  newPreAnalysis: ManualPreAnalysis = {
    itemId: '',
    type: 'User Story',
    title: '',
    estimatedHours: 0,
    assignedIsw: 'Marlon',
    notes: '',
    createdAt: ''
  };

  // Stage 4: Minuta de Riesgos & Oportunidades
  minutaRiesgos: MinutaRiesgos = {
    puntosDiscutidos: '',
    riesgosIdentificados: '',
    oportunidades: '',
    acuerdos: ''
  };
  missingPeerReviewItems: any[] = [];

  // Stage 5 & 8: Evidencias & Cierre
  evidences: SprintEvidences = {
    emailEvidenceUrl: '',
    risksMinutaUrl: '',
    releasePresentationUrl: '',
    sprintPresentationUrl: '',
    isReleasePresented: false,
    isSprintPresented: false
  };

  // Stage 6: SAAO Assistant & Excel import
  excelFileName: string = '';
  saaoMacroTasks: SaaoMacroTask[] = [];
  filterCollaborator: string = 'marlon';
  saaoCollaboratorList: string[] = ['marlon', 'todos'];
  isSplitView: boolean = true;
  saaoUrl: string = 'https://saao.blueoceantech.com.mx/MacrotareaForm';

  // SAAO Mapping Dictionary con estimaciones por defecto (hh:mm) para Big Rocks
  readonly macroTagMap: { [key: string]: { name: string; tag: string; defaultHours: number; defaultMinutes: number } } = {
    'BR_AnálisisDiseño': { name: 'Análisis y diseño', tag: 'BR_AnálisisDiseño', defaultHours: 8, defaultMinutes: 0 },
    'BR_Monitoreo': { name: 'Monitoreo y seguimiento', tag: 'BR_Monitoreo', defaultHours: 6, defaultMinutes: 0 },
    'BR_AdmDev': { name: 'Administración de desarrollo', tag: 'BR_AdmDev', defaultHours: 4, defaultMinutes: 0 },
    'BR_Dev': { name: 'Desarrollo sprint en curso', tag: 'BR_Dev', defaultHours: 40, defaultMinutes: 0 },
    'BR_LIB': { name: 'Liberación', tag: 'BR_LIB', defaultHours: 4, defaultMinutes: 0 }
  };



  ngOnInit(): void {
    this.loadSavedSelection();
    this.loadDraftSprints();
    this.loadIterations();
    this.initDefaultSaaoDemoData();
    this.loadPreAnalyses();
    this.fetchAvailableReleases();

    window.addEventListener('message', (event) => {
      if (event.data && event.data.type === 'CMMI5_EXTENSION_INVALIDATED') {
        this.addLog('⚠️ La extensión fue actualizada en Chrome. Por favor presiona F5 en esta página para reconectar.', 'warn');
        this.notificationService.error('⚠️ La extensión Mayansoft TT fue actualizada en Chrome. Por favor presiona F5 en esta página web para reconectar.');
      }
    });
  }

  loadDraftSprints(): void {
    const saved = localStorage.getItem('cmmi5_custom_draft_sprints');
    if (saved) {
      try { this.customDraftSprints = JSON.parse(saved); } catch (e) {}
    }
  }

  getItemAnalysis(item: any): ItemIndividualAnalysis {
    const id = item.id ? item.id.toString() : (item.bugId ? item.bugId.toString() : '');
    if (!this.itemAnalysesMap[id]) {
      this.itemAnalysesMap[id] = {
        itemId: id,
        itemType: item.type || (item.bugId ? 'Bug' : 'US'),
        title: item.title || '',
        currentIsw: item.isw || 'Unassigned',
        reassignedIsw: item.isw || 'Unassigned',
        reassignmentReason: '',
        analysisNotes: ''
      };
    }
    return this.itemAnalysesMap[id];
  }

  saveItemIndividualAnalysis(itemId: string): void {
    if (!this.selectedIteration || !itemId) return;
    localStorage.setItem(`cmmi5_process_item_analyses_${this.selectedIteration}`, JSON.stringify(this.itemAnalysesMap));

    if (this.metrics) {
      this.metricsApiService.saveAnalysis(
        this.selectedIteration,
        this.selectedIterationName,
        this.metrics,
        this.sprintAnalysisNotes,
        {},
        {}
      ).subscribe();
    }
    this.notificationService.success(`Análisis guardado para el ítem #${itemId}.`);
  }

  analyzeItemWithAI(item: any): void {
    const analysisObj = this.getItemAnalysis(item);
    analysisObj.isAiAnalyzing = true;

    setTimeout(() => {
      const planned = item.planned || 0;
      const effort = item.effort || 0;
      const diff = effort - planned;
      let advice = `Análisis IA para #${item.id}: `;

      if (diff > 2) {
        advice += `Se detecta una desviación importante (+${diff.toFixed(1)}h). Se recomienda reasignar tareas secundarias a otro ISW MID para balancear la carga del sprint.`;
      } else if (item.status === 'New' || item.status === 'Active') {
        advice += `El entregable sigue en estado ${item.status}. Si el tiempo restante del sprint es acotado, considerar reasignar la sub-tarea de pruebas o código.`;
      } else {
        advice += `El entregable marcha según la línea base. Mantener al responsable ${item.isw}.`;
      }

      analysisObj.aiRecommendation = advice;
      analysisObj.isAiAnalyzing = false;
      this.saveItemIndividualAnalysis(item.id);
    }, 800);
  }

  // Add Manual Pre-Analysis (Before Sprint creation in Azure DevOps)
  addManualPreAnalysis(): void {
    if (!this.newPreAnalysis.itemId || !this.newPreAnalysis.title) {
      this.notificationService.error('Por favor ingresa el número/ID y el título para el pre-análisis.');
      return;
    }

    const pre: ManualPreAnalysis = {
      ...this.newPreAnalysis,
      itemId: this.newPreAnalysis.itemId.trim(),
      createdAt: new Date().toISOString(),
      isLinkedToAzure: false
    };

    this.manualPreAnalyses.push(pre);
    this.savePreAnalysesState();

    // Reset Form
    this.newPreAnalysis = {
      itemId: '',
      type: 'User Story',
      title: '',
      estimatedHours: 0,
      assignedIsw: 'Marlon',
      notes: '',
      createdAt: ''
    };

    // Auto link if Azure items are currently loaded
    this.linkPreAnalysesWithAzureItems();
    this.notificationService.success(`Pre-análisis guardado exitosamente para el ítem #${pre.itemId}.`);
  }

  deletePreAnalysis(index: number): void {
    this.manualPreAnalyses.splice(index, 1);
    this.savePreAnalysesState();
    this.notificationService.success('Pre-análisis eliminado.');
  }

  savePreAnalysesState(): void {
    localStorage.setItem('cmmi5_manual_pre_analyses', JSON.stringify(this.manualPreAnalyses));
    this.metricsApiService.savePreAnalysis({ preAnalyses: this.manualPreAnalyses }).subscribe();
  }

  loadPreAnalyses(): void {
    const saved = localStorage.getItem('cmmi5_manual_pre_analyses');
    if (saved) {
      try { this.manualPreAnalyses = JSON.parse(saved); } catch (e) {}
    }

    this.metricsApiService.getPreAnalyses().subscribe({
      next: (res: any) => {
        if (res && Array.isArray(res) && res.length > 0) {
          this.manualPreAnalyses = res;
        }
        this.linkPreAnalysesWithAzureItems();
      },
      error: () => {}
    });
  }

  // Automatically match Manual Pre-Analyses with Azure DevOps items by ID
  linkPreAnalysesWithAzureItems(): void {
    if (!this.metrics?.developmentRate?.items || this.manualPreAnalyses.length === 0) return;

    this.metrics.developmentRate.items.forEach(item => {
      const idStr = item.id.toString();
      const match = this.manualPreAnalyses.find(p => p.itemId === idStr);

      if (match) {
        match.isLinkedToAzure = true;
        const analysisObj = this.getItemAnalysis(item);

        analysisObj.preAnalysisLinked = true;
        analysisObj.estimatedPreHours = match.estimatedHours;
        if (!analysisObj.analysisNotes) {
          analysisObj.analysisNotes = `[Pre-Análisis Vinculado]: ${match.notes}`;
        }
        if (match.assignedIsw && analysisObj.reassignedIsw === item.isw) {
          analysisObj.reassignedIsw = match.assignedIsw;
        }
      }
    });
  }

  loadSavedSelection(): void {
    const cfg = this.configService.getConfig();
    if (cfg?.userEmail) {
      this.userEmail = cfg.userEmail.trim();
      if (this.userEmail && !this.saaoCollaboratorList.includes(this.userEmail)) {
        this.saaoCollaboratorList.unshift(this.userEmail);
        this.filterCollaborator = this.userEmail;
      }
    }

    const saved = localStorage.getItem(this.STORAGE_KEY);
    if (saved) {
      try {
        const { iteration } = JSON.parse(saved);
        this.selectedIteration = iteration || '';
      } catch (e) {}
    }
  }

  loadIterations(): void {
    this.adoService.getIterationNodes().subscribe({
      next: (iters) => {
        this.iterations = iters;
        if (!this.selectedIteration && iters.length > 0) {
          this.selectedIteration = iters[iters.length - 1].id;
        }
        if (this.selectedIteration) {
          this.loadData();
        }
      },
      error: () => {
        this.notificationService.error('Error al cargar la lista de sprint.');
      }
    });
  }

  loadData(): void {
    if (!this.selectedIteration) return;
    this.loading = true;

    const iterObj = this.iterations.find(i => i.id === this.selectedIteration);
    if (iterObj) {
      this.selectedIterationName = iterObj.name || iterObj.path || '';
    }

    console.group(`🔍 [cmmi5-analyzer] Cargando datos para Sprint: "${this.selectedIterationName}" (ID: ${this.selectedIteration})`);
    console.log(`👤 Usuario configurado (userEmail): "${this.userEmail}"`);
    this.addLog(`🔍 Cargando datos de Azure DevOps para Sprint: "${this.selectedIterationName}"...`, 'info');

    // Save selection
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify({ iteration: this.selectedIteration }));

    // Cargar borrador/proceso guardado primero
    this.loadSavedSprintProcessData();

    // Load Sprint Data
    this.adoService.getMetrics(this.selectedIteration).subscribe({
      next: (m) => {
        this.metrics = m;
        this.loading = false;

        const itemsCount = m?.developmentRate?.items?.length || 0;
        console.log(`📊 Respuesta de Azure DevOps recibida: ${itemsCount} work items devueltos.`);
        this.addLog(`📊 Azure DevOps devolvió ${itemsCount} work items para el sprint.`, 'success');

        if (itemsCount > 0) {
          if (this.saaoMacroTasks && this.saaoMacroTasks.some(m => m.tasks && m.tasks.length > 0)) {
            this.syncSaaoTasksWithAzure();
          } else {
            this.buildSaaoMacroTasksFromAzure();
          }
        } else {
          console.warn(`⚠️ No se devolvieron Work Items desde Azure DevOps para esta iteración. Verificando fallback de IDs en tareas SAAO...`);
          this.addLog(`⚠️ Azure DevOps no devolvió ítems para este sprint. Revisando sub-tareas en memoria...`, 'warn');
          this.ensureAzureIdOnSaaoTasks();
        }
        console.groupEnd();
      },
      error: (err) => {
        this.loading = false;
        console.error(`❌ Error al consultar métricas de Azure DevOps:`, err);
        this.addLog(`❌ Error al consultar Azure DevOps: ${err?.message || 'Error de conexión'}`, 'error');
        this.notificationService.error('Error al cargar datos del sprint desde Azure DevOps.');
        console.groupEnd();
      }
    });
  }

  normalizeText(text: string): string {
    if (!text) return '';
    return String(text)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  cleanWorkItemTitle(rawTitle: string): string {
    if (!rawTitle) return '';
    let title = String(rawTitle).trim();
    let prev = '';
    while (title !== prev) {
      prev = title;
      // Quitar puntuación/corchetes/paréntesis/hashtags iniciales
      title = title.replace(/^[\s:\-_\>\/\\\[\]\(\)#]+/, '').trim();
      // Quitar 'Task 12345:' o 'Task 12345'
      title = title.replace(/^Task\s*#?\s*\d+\s*:?\s*/i, '').trim();
      // Quitar prefijos tipo 'US 47846:', 'FT 47950:', 'Bug 1234:', 'Feature 1234:', 'User Story 1234:'
      title = title.replace(/^(US|FT|Feature|Bug|User Story|Epic|Requirement|Requisito)\s*#?\s*\d+\s*:?\s*/i, '').trim();
      // Quitar prefijos de sub-tarea como 'Task 01.00', 'Task 01.01', 'Task 04', '01.00', '01.01'
      title = title.replace(/^(Task\s*)?\d{1,2}(\.\d{1,2})?\s*:?\s*/i, '').trim();
      // Limpiar signos al inicio dejados tras la remoción de prefijos
      title = title.replace(/^[\s:\-_\>\/\\\[\]\(\)#]+/, '').trim();
    }
    return title;
  }

  findAzureIdForTaskTitle(rawTaskTitle: string): { id: string; cleanTitle: string } | null {
    if (!rawTaskTitle) return null;
    const cleanTitle = this.cleanWorkItemTitle(rawTaskTitle);
    if (!cleanTitle) return null;

    const existingIdMatch = String(rawTaskTitle).match(/Task\s*#?\s*(\d{4,6})/i) || String(rawTaskTitle).match(/^(\d{4,6})[\s:\-_]/) || String(rawTaskTitle).match(/\[(\d{4,6})\]/);
    const existingId = existingIdMatch ? existingIdMatch[1] : '';

    const normTarget = this.normalizeText(cleanTitle);

    const azureItems = this.metrics?.developmentRate?.items || [];
    const allWorkItems = (this.metrics as any)?.allWorkItems || [];
    const candidates: { id: string; title: string; normTitle: string; assignedTo: string }[] = [];

    // 1. Process allWorkItems (flat list of all work items & tasks returned from Azure)
    allWorkItems.forEach((wi: any) => {
      if (wi.id && wi.title) {
        const cleaned = this.cleanWorkItemTitle(wi.title);
        if (cleaned) {
          candidates.push({
            id: String(wi.id),
            title: cleaned,
            normTitle: this.normalizeText(cleaned),
            assignedTo: String(wi.assignedTo || wi.isw || '').toLowerCase()
          });
        }
      }
    });

    // 2. Process developmentRate.items (parent items and their tasks / relatedBugs)
    azureItems.forEach((item: any) => {
      if (item.id && item.title) {
        const cleaned = this.cleanWorkItemTitle(item.title);
        if (cleaned) {
          candidates.push({
            id: String(item.id),
            title: cleaned,
            normTitle: this.normalizeText(cleaned),
            assignedTo: String(item.isw || item.assignedTo || '').toLowerCase()
          });
        }
      }
      if (item.tasks && Array.isArray(item.tasks)) {
        item.tasks.forEach((sub: any) => {
          const subId = sub.id || item.id;
          const subTitle = sub.title || sub.name || '';
          if (subId && subTitle) {
            const cleanedSub = this.cleanWorkItemTitle(subTitle);
            if (cleanedSub) {
              candidates.push({
                id: String(subId),
                title: cleanedSub,
                normTitle: this.normalizeText(cleanedSub),
                assignedTo: String(sub.assignedTo || sub.isw || item.isw || '').toLowerCase()
              });
            }
          }
        });
      }
      if (item.relatedBugs && Array.isArray(item.relatedBugs)) {
        item.relatedBugs.forEach((bug: any) => {
          if (bug.id && bug.title) {
            const cleanedBug = this.cleanWorkItemTitle(bug.title);
            if (cleanedBug) {
              candidates.push({
                id: String(bug.id),
                title: cleanedBug,
                normTitle: this.normalizeText(cleanedBug),
                assignedTo: String(bug.assignedTo || bug.isw || '').toLowerCase()
              });
            }
          }
        });
      }
    });

    if (this.manualPreAnalyses && this.manualPreAnalyses.length > 0) {
      this.manualPreAnalyses.forEach((p: any) => {
        if (p.itemId && p.title) {
          const cleanedP = this.cleanWorkItemTitle(p.title);
          if (cleanedP) {
            candidates.push({
              id: String(p.itemId),
              title: cleanedP,
              normTitle: this.normalizeText(cleanedP),
              assignedTo: String(p.assignedTo || '').toLowerCase()
            });
          }
        }
      });
    }

    if (candidates.length === 0) {
      if (existingId) return { id: existingId, cleanTitle };
      return null;
    }

    // Priorizar fuertemente las tareas asignadas al correo/usuario configurado localmente (userEmail)
    const userTokens = this.userEmail
      ? this.userEmail.trim().toLowerCase().split(/[\._\-\s@]+/).filter(t => t.length > 2 && t !== 'com' && t !== 'mx' && t !== 'blueoceantech' && t !== 'grupoblueocean')
      : [];

    const isUserMatch = (assignedTo: string) => {
      if (!assignedTo) return false;
      if (userTokens.length > 0) {
        return userTokens.some(t => assignedTo.includes(t));
      }
      return false;
    };

    candidates.sort((a, b) => {
      const aMatch = isUserMatch(a.assignedTo) ? 1 : 0;
      const bMatch = isUserMatch(b.assignedTo) ? 1 : 0;
      return bMatch - aMatch;
    });

    if (!normTarget) {
      if (existingId) return { id: existingId, cleanTitle };
      return null;
    }

    const stopwords = new Set(['de', 'del', 'la', 'las', 'el', 'los', 'en', 'para', 'por', 'con', 'un', 'una', 'unos', 'unas', 'y', 'o', 'a', 'al']);

    // Strategy 1: Exact normalized match
    for (const cand of candidates) {
      if (!cand.normTitle) continue;
      if (cand.normTitle === normTarget) {
        return { id: cand.id, cleanTitle };
      }
    }

    // Strategy 2: Substring match on normalized text
    for (const cand of candidates) {
      if (!cand.normTitle) continue;
      if (cand.normTitle.includes(normTarget) || normTarget.includes(cand.normTitle)) {
        return { id: cand.id, cleanTitle };
      }
    }

    // Strategy 3: Token overlap matching (handling Spanish word order/variations)
    const targetTokens = normTarget
      .split(/\s+/)
      .filter(t => t.length > 2 && !stopwords.has(t));

    if (targetTokens.length > 0) {
      let bestMatch: { id: string; score: number } | null = null;
      for (const cand of candidates) {
        if (!cand.normTitle) continue;
        const candTokens = cand.normTitle
          .split(/\s+/)
          .filter(t => t.length > 2 && !stopwords.has(t));

        if (candTokens.length === 0) continue;

        let matchedCount = 0;
        targetTokens.forEach(token => {
          if (candTokens.some(ct => ct === token || ct.includes(token) || token.includes(ct))) {
            matchedCount++;
          }
        });

        const score = matchedCount / targetTokens.length;
        if (score >= 0.4 && (!bestMatch || score > bestMatch.score)) {
          bestMatch = { id: cand.id, score };
        }
      }

      if (bestMatch) {
        return { id: bestMatch.id, cleanTitle };
      }
    }

    if (existingId) return { id: existingId, cleanTitle };
    return null;
  }

  formatTaskWithAzureId(id: string | number, title: string): string {
    const cleanId = String(id || '').trim();
    const cleanName = this.cleanWorkItemTitle(title);
    if (cleanId && cleanName) {
      return `Task ${cleanId}: ${cleanName}`;
    }
    return cleanName;
  }

  formatTaskWithAzureIdFallback(taskTitle: string, defaultId: string = ''): string {
    if (!taskTitle) return '';
    const found = this.findAzureIdForTaskTitle(taskTitle);
    if (found && found.id) {
      return `Task ${found.id}: ${found.cleanTitle}`;
    }
    const cleanName = this.cleanWorkItemTitle(taskTitle);
    if (defaultId && cleanName) {
      return `Task ${defaultId}: ${cleanName}`;
    }
    const idMatch = String(taskTitle).match(/^Task\s*(\d+)\s*:?\s*/i) || String(taskTitle).match(/^(\d{4,6})[\s:\-_]/);
    if (idMatch && idMatch[1] && cleanName) {
      return `Task ${idMatch[1]}: ${cleanName}`;
    }
    return cleanName;
  }

  syncSaaoTasksWithAzure(): void {
    if (!this.saaoMacroTasks || this.saaoMacroTasks.length === 0) return;

    let modified = false;

    this.saaoMacroTasks.forEach(macro => {
      if (this.userEmail && (!macro.assignedTo || macro.assignedTo === 'marlon')) {
        macro.assignedTo = this.userEmail.split('@')[0].toLowerCase();
      }

      macro.tasks = (macro.tasks || []).map(taskStr => {
        if (!taskStr) return '';
        const cleanStr = String(taskStr).trim();

        // Descartar metadatos o filas basura del Excel
        const lower = cleanStr.toLowerCase();
        if (lower.startsWith('fecha') || lower.startsWith('tasa') || lower.startsWith('hrs por') || lower.startsWith('cantidad') || lower.startsWith('team')) {
          modified = true;
          return '';
        }

        const found = this.findAzureIdForTaskTitle(cleanStr);
        if (found && found.id) {
          const formatted = `Task ${found.id}: ${found.cleanTitle}`;
          if (formatted !== cleanStr) modified = true;
          return formatted;
        }

        const idMatch = cleanStr.match(/^Task\s*(\d+)\s*:?\s*/i) || cleanStr.match(/^(\d{4,6})[\s:\-_]/);
        const cleanName = this.cleanWorkItemTitle(cleanStr);
        if (idMatch && idMatch[1] && cleanName) {
          const formatted = `Task ${idMatch[1]}: ${cleanName}`;
          if (formatted !== cleanStr) modified = true;
          return formatted;
        }

        return cleanName;
      }).filter(Boolean);
    });

    if (modified) {
      this.saaoMacroTasks = [...this.saaoMacroTasks];
      this.saveFullProcessToMongoDB();
    }
  }

  ensureAzureIdOnSaaoTasks(): void {
    this.syncSaaoTasksWithAzure();
  }

  buildSaaoMacroTasksFromAzure(): void {
    if (!this.metrics?.developmentRate?.items || this.metrics.developmentRate.items.length === 0) {
      console.warn(`⚠️ buildSaaoMacroTasksFromAzure: No hay items en metrics.developmentRate.items`);
      return;
    }

    const releaseMatch = this.selectedIterationName.match(/Release\s*#?\s*(\d+)/i);
    const releaseNum = releaseMatch ? releaseMatch[1] : '15';

    console.group(`🧱 [Etapa 7] Construyendo Macrotareas SAAO con IDs reales de Azure DevOps (Release #${releaseNum})`);
    this.addLog(`🧱 [Etapa 7] Procesando Work Items de Azure DevOps para usuario "${this.userEmail || 'todos'}"...`, 'info');

    const categories = [
      { key: 'BR_AnálisisDiseño', title: `Ope 20>Release #${releaseNum}>Análisis y diseño`, defaultHours: 8 },
      { key: 'BR_Monitoreo', title: `Ope 20>Release #${releaseNum}>Monitoreo y seguimiento`, defaultHours: 6 },
      { key: 'BR_AdmDev', title: `Ope 20>Release #${releaseNum}>Administración de desarrollo`, defaultHours: 4 },
      { key: 'BR_Dev', title: `Ope 20>Release #${releaseNum}>Desarrollo sprint en curso`, defaultHours: 40 },
      { key: 'BR_LIB', title: `Ope 20>Release #${releaseNum}>Liberación`, defaultHours: 4 }
    ];

    const macroMap = new Map<string, SaaoMacroTask>();

    categories.forEach(cat => {
      macroMap.set(cat.key, {
        tag: cat.key,
        macroTitle: cat.title,
        releaseName: `Release #${releaseNum}`,
        assignedTo: this.userEmail ? this.userEmail.trim().toLowerCase() : 'marlon',
        startDate: this.metrics?.startDate || '',
        endDate: this.metrics?.endDate || '',
        deliverableBigRock: cat.title,
        estimatedHours: cat.defaultHours,
        estimatedMinutes: 0,
        tasks: [],
        status: 'pending'
      });
    });

    const userTokens = this.userEmail
      ? this.userEmail.trim().toLowerCase().split(/[\._\-\s@]+/).filter(t => t.length > 2 && t !== 'com' && t !== 'mx' && t !== 'blueoceantech')
      : [];

    let totalMatchedTasks = 0;

    this.metrics.developmentRate.items.forEach((item: any) => {
      const realAzureId = item.id;
      if (!realAzureId) {
        console.warn(`⚠️ Ítem sin ID de Azure ignorado:`, item);
        return;
      }

      // Filtrar por el usuario/correo configurado en CMMI de forma robusta por tokens
      const itemAssigned = String(item.isw || item.assignedTo || '').trim().toLowerCase();
      if (userTokens.length > 0 && itemAssigned && itemAssigned !== 'unassigned') {
        const isMatch = userTokens.some(token => itemAssigned.includes(token));
        if (!isMatch) {
          console.log(`⏩ Tarea ID #${realAzureId} ("${item.title}") asignada a "${itemAssigned}" saltada por no coincidir con usuario "${this.userEmail}".`);
          return; // Saltar tareas asignadas a otros colaboradores
        }
      }

      const cleanTitle = this.cleanWorkItemTitle(item.title || '');
      if (!cleanTitle) return;

      const formattedTitle = `Task ${realAzureId}: ${cleanTitle}`;
      const titleLower = cleanTitle.toLowerCase();

      let targetTag = 'BR_Dev';
      if (titleLower.includes('análisis') || titleLower.includes('analisis') || titleLower.includes('diseño')) {
        targetTag = 'BR_AnálisisDiseño';
      } else if (titleLower.includes('monitoreo') || titleLower.includes('seguimiento') || titleLower.includes('riesgos')) {
        targetTag = 'BR_Monitoreo';
      } else if (titleLower.includes('administración') || titleLower.includes('adm')) {
        targetTag = 'BR_AdmDev';
      } else if (titleLower.includes('liberación') || titleLower.includes('liberacion')) {
        targetTag = 'BR_LIB';
      }

      const macro = macroMap.get(targetTag);
      if (macro && !macro.tasks.includes(formattedTitle)) {
        macro.tasks.push(formattedTitle);
        totalMatchedTasks++;
        console.log(`✅ [Formateada] -> Tag: ${targetTag} | ${formattedTitle}`);
      }

      // Procesar sub-tareas si existen en el item de Azure
      if (item.tasks && Array.isArray(item.tasks)) {
        item.tasks.forEach((sub: any) => {
          const subAssigned = String(sub.assignedTo || sub.isw || item.isw || '').trim().toLowerCase();
          if (userTokens.length > 0 && subAssigned && subAssigned !== 'unassigned') {
            const isSubMatch = userTokens.some(token => subAssigned.includes(token));
            if (!isSubMatch) return;
          }

          const subId = sub.id || item.id;
          const subClean = this.cleanWorkItemTitle(sub.title || sub.name || '');
          if (subClean) {
            const formattedSub = `Task ${subId}: ${subClean}`;
            const subLower = subClean.toLowerCase();

            let subTargetTag = targetTag;
            if (subLower.includes('análisis') || subLower.includes('analisis') || subLower.includes('diseño')) {
              subTargetTag = 'BR_AnálisisDiseño';
            } else if (subLower.includes('monitoreo') || subLower.includes('seguimiento') || subLower.includes('riesgos')) {
              subTargetTag = 'BR_Monitoreo';
            } else if (subLower.includes('administración') || subLower.includes('adm')) {
              subTargetTag = 'BR_AdmDev';
            } else if (subLower.includes('liberación') || subLower.includes('liberacion')) {
              subTargetTag = 'BR_LIB';
            }

            const subMacro = macroMap.get(subTargetTag) || macro;
            if (subMacro && !subMacro.tasks.includes(formattedSub)) {
              subMacro.tasks.push(formattedSub);
              totalMatchedTasks++;
              console.log(`  └─ ✅ Sub-tarea formateada -> [${subTargetTag}] ${formattedSub}`);
            }
          }
        });
      }
    });

    // Si la macrotarea de Desarrollo quedó sin sub-tareas, poblarla con las tareas filtradas del sprint
    const devMacro = macroMap.get('BR_Dev');
    if (devMacro && devMacro.tasks.length === 0) {
      console.warn(`⚠️ La macrotarea BR_Dev no acumuló tareas específicas. Usando fallback de lista general de items...`);
      this.metrics.developmentRate.items.forEach((item: any) => {
        if (!item.id || !item.title) return;
        const itemAssigned = String(item.isw || item.assignedTo || '').trim().toLowerCase();
        if (userTokens.length > 0 && itemAssigned && itemAssigned !== 'unassigned') {
          const isMatch = userTokens.some(token => itemAssigned.includes(token));
          if (!isMatch) return;
        }
        const clean = this.cleanWorkItemTitle(item.title);
        const formattedFallback = `Task ${item.id}: ${clean}`;
        if (!devMacro.tasks.includes(formattedFallback)) {
          devMacro.tasks.push(formattedFallback);
          totalMatchedTasks++;
        }
      });
    }

    this.saaoMacroTasks = Array.from(macroMap.values());
    const collabs = Array.from(new Set(this.saaoMacroTasks.map(m => m.assignedTo)));
    this.saaoCollaboratorList = ['todos', ...collabs];
    if (this.userEmail) {
      this.filterCollaborator = this.userEmail.trim().toLowerCase();
    }
    console.log(`✨ Total de tareas formateadas a "Task {id}: {nombre}": ${totalMatchedTasks}`);
    console.groupEnd();
    this.addLog(`✨ Etapa 7 completada: ${totalMatchedTasks} tareas formateadas como "Task {id}: {nombre}".`, 'success');

    this.saveFullProcessToMongoDB();
  }

  get filteredSaaoMacroTasks(): SaaoMacroTask[] {
    if (!this.saaoMacroTasks || this.saaoMacroTasks.length === 0) return [];

    // Formatear proactivamente si tenemos métricas de Azure y aún hay tareas sin ID 'Task {id}:'
    if (this.metrics?.developmentRate?.items && this.metrics.developmentRate.items.length > 0) {
      let unformattedCount = 0;
      this.saaoMacroTasks.forEach(macro => {
        (macro.tasks || []).forEach(t => {
          if (t && !/^Task\s*\d+/i.test(t)) {
            unformattedCount++;
          }
        });
      });
      if (unformattedCount > 0) {
        this.syncSaaoTasksWithAzure();
      }
    }

    if (!this.filterCollaborator || this.filterCollaborator === 'todos') {
      return this.saaoMacroTasks.filter(m => m.tasks && m.tasks.length > 0);
    }

    const filter = this.filterCollaborator.toLowerCase().trim();
    const userTokens = filter.split(/[\._\-\s@]+/).filter(t => t.length > 2 && t !== 'com' && t !== 'mx' && t !== 'blueoceantech' && t !== 'grupoblueocean');

    return this.saaoMacroTasks.filter(m => {
      if (!m.tasks || m.tasks.length === 0) return false;
      const assigned = (m.assignedTo || '').toLowerCase().trim();
      if (!assigned) return true;
      if (assigned.includes(filter) || filter.includes(assigned)) return true;
      if (userTokens.length > 0) {
        return userTokens.some(token => assigned.includes(token));
      }
      return false;
    });
  }

  onExcelUpload(event: any): void {
    const file = event.target.files?.[0];
    if (!file) return;

    this.excelFileName = file.name;
    const reader = new FileReader();
    reader.onload = (e: any) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });

        // 1. Buscar pestaña por nombre 'Tareas de gestión', 'Gestión', 'Planning', 'Tasks'
        let targetSheetName = workbook.SheetNames.find(s => {
          const l = s.toLowerCase();
          return l.includes('tareas de') || l.includes('gestión') || l.includes('gestion') || l.includes('planning') || l.includes('tasks');
        });

        // 2. Si no hay por nombre, buscar la pestaña que tenga la columna 'Title 2' o 'Título 2' o 'Tag'
        if (!targetSheetName) {
          for (const sName of workbook.SheetNames) {
            const sheet = workbook.Sheets[sName];
            const rows: any[] = XLSX.utils.sheet_to_json(sheet, { header: 1 });
            const hasHeader = rows.slice(0, 5).some(row =>
              Array.isArray(row) && row.some(cell => {
                const cStr = String(cell || '').toLowerCase();
                return cStr.includes('title 2') || cStr.includes('título 2') || cStr.includes('macrotarea') || cStr.includes('br_');
              })
            );
            if (hasHeader) {
              targetSheetName = sName;
              break;
            }
          }
        }

        if (!targetSheetName) targetSheetName = workbook.SheetNames[0];

        console.log(`📊 Leyendo pestaña de Excel seleccionada: "${targetSheetName}"`);
        const rows: any[] = XLSX.utils.sheet_to_json(workbook.Sheets[targetSheetName], { header: 1 });
        this.processExcelRows(rows);
      } catch (err) {
        console.error('Error procesando Excel:', err);
        this.notificationService.error('Error al procesar el archivo de Excel.');
      }
    };
    reader.readAsArrayBuffer(file);
  }

  processExcelRows(rows: any[]): void {
    if (!rows || rows.length < 2) return;

    let title2ColIndex = -1;
    let assignedToColIndex = -1;
    let tagColIndex = -1;
    let idColIndex = -1;

    for (let h = 0; h < Math.min(rows.length, 5); h++) {
      const headerRow = rows[h];
      if (Array.isArray(headerRow)) {
        headerRow.forEach((colVal: any, idx: number) => {
          const valStr = String(colVal || '').trim().toLowerCase();
          if (valStr.includes('title 2') || valStr.includes('título 2') || valStr.includes('nombre tarea') || valStr.includes('task title')) {
            title2ColIndex = idx;
          }
          if (valStr.includes('assigned to') || valStr.includes('asignado a') || valStr.includes('isw') || valStr.includes('responsable')) {
            assignedToColIndex = idx;
          }
          if (valStr.includes('tags') || valStr.includes('etiqueta') || valStr.includes('macrotarea')) {
            tagColIndex = idx;
          }
          if (valStr === 'id' || valStr.includes('work item id') || valStr.includes('task id') || valStr === 'id tarea') {
            idColIndex = idx;
          }
        });
      }
    }

    const releaseMatch = this.selectedIterationName ? this.selectedIterationName.match(/Release\s*#?\s*(\d+)/i) : null;
    const releaseNum = releaseMatch ? releaseMatch[1] : '15';

    const categories = [
      { key: 'BR_AnálisisDiseño', title: `Ope 20>Release #${releaseNum}>Análisis y diseño`, defaultHours: 8 },
      { key: 'BR_Monitoreo', title: `Ope 20>Release #${releaseNum}>Monitoreo y seguimiento`, defaultHours: 6 },
      { key: 'BR_AdmDev', title: `Ope 20>Release #${releaseNum}>Administración de desarrollo`, defaultHours: 4 },
      { key: 'BR_Dev', title: `Ope 20>Release #${releaseNum}>Desarrollo sprint en curso`, defaultHours: 40 },
      { key: 'BR_LIB', title: `Ope 20>Release #${releaseNum}>Liberación`, defaultHours: 4 }
    ];

    const macroMap = new Map<string, SaaoMacroTask>();
    categories.forEach(cat => {
      macroMap.set(cat.key, {
        tag: cat.key,
        macroTitle: cat.title,
        releaseName: `Release #${releaseNum}`,
        assignedTo: this.userEmail ? this.userEmail.trim().toLowerCase() : 'marlon',
        startDate: this.metrics?.startDate || '',
        endDate: this.metrics?.endDate || '',
        deliverableBigRock: cat.title,
        estimatedHours: cat.defaultHours,
        estimatedMinutes: 0,
        tasks: [],
        status: 'pending'
      });
    });

    const userTokens = this.userEmail
      ? this.userEmail.trim().toLowerCase().split(/[\._\-\s@]+/).filter(t => t.length > 2 && t !== 'com' && t !== 'mx' && t !== 'blueoceantech' && t !== 'grupoblueocean')
      : [];

    const azureItems = this.metrics?.developmentRate?.items || [];
    let formattedCount = 0;

    // Lista de palabras de resumen/metadatos del Excel que NUNCA son tareas
    const metadataBlacklist = [
      'fecha inicio', 'fecha fin', 'días de sprint', 'dias de sprint',
      'cantidad de historias', 'tasa de esfuerzo', 'hrs por día', 'hrs por dia',
      'team', 'marlon garcía', 'georgina concepción', 'yair meza', 'luis fernando',
      'marlon.garcia@', 'georgina.chan@', 'yair.magana@', 'fernando.cab@',
      'resumen', 'métricas', 'metricas', 'porcentaje', 'totales'
    ];

    for (let r = 1; r < rows.length; r++) {
      const row = rows[r];
      if (!Array.isArray(row) || row.length === 0) continue;

      // 1. Extraer responsable de la fila
      let assignedTo = '';
      if (assignedToColIndex !== -1 && row[assignedToColIndex]) {
        assignedTo = String(row[assignedToColIndex]).trim().toLowerCase();
      }

      // Filtrar por usuario local configurado si viene especificado en la fila
      if (userTokens.length > 0 && assignedTo && !assignedTo.includes('<')) {
        const isMatch = userTokens.some(token => assignedTo.includes(token));
        if (!isMatch) continue;
      }

      // 2. Extraer Título REAL de la tarea (ignorar números puros y metadatos del Excel)
      let rawTaskTitle = '';
      if (title2ColIndex !== -1 && row[title2ColIndex]) {
        const valStr = String(row[title2ColIndex]).trim();
        if (valStr && !/^\d+(\.\d+)?$/.test(valStr) && valStr.length > 2) {
          rawTaskTitle = valStr;
        }
      }

      // Escanear celdas si no venía en la columna detectada
      if (!rawTaskTitle) {
        for (let c = 0; c < row.length; c++) {
          if (c === assignedToColIndex || c === tagColIndex || c === idColIndex) continue;
          const valStr = String(row[c] || '').trim();
          const lower = valStr.toLowerCase();

          // Descartar si es un metadato de resumen o número
          const isBlacklisted = metadataBlacklist.some(b => lower.includes(b));
          if (valStr && !/^\d+(\.\d+)?$/.test(valStr) && valStr.length > 3 && !isBlacklisted &&
              lower !== 'title 2' && lower !== 'título 2' && lower !== 'task' && lower !== 'riesgos' && lower !== 'titulo') {
            rawTaskTitle = valStr;
            break;
          }
        }
      }

      if (!rawTaskTitle) continue;

      const lowerCheck = rawTaskTitle.toLowerCase();
      const isBlacklisted = metadataBlacklist.some(b => lowerCheck.includes(b));
      if (isBlacklisted || lowerCheck === 'title 2' || lowerCheck === 'título 2' || lowerCheck === 'task' || lowerCheck === 'titulo') {
        continue;
      }

      const cleanName = this.cleanWorkItemTitle(rawTaskTitle);
      if (!cleanName) continue;

      // 3. Extraer ID si venía explícito en columna o título
      let azureId = '';
      if (idColIndex !== -1 && row[idColIndex]) {
        const rawId = String(row[idColIndex]).trim();
        const idMatch = rawId.match(/(\d{4,6})/);
        if (idMatch) azureId = idMatch[1];
      }
      if (!azureId) {
        const titleIdMatch = rawTaskTitle.match(/Task\s*#?\s*(\d{4,6})/i) || rawTaskTitle.match(/^(\d{4,6})[\s:\-_]/) || rawTaskTitle.match(/\[(\d{4,6})\]/);
        if (titleIdMatch) azureId = titleIdMatch[1];
      }

      // 4. BUSCAR ID REAL EN AZURE DEVOPS para esta tarea de Excel usando el buscador centralizado
      const foundAzure = this.findAzureIdForTaskTitle(rawTaskTitle);
      let finalTaskFormatted = cleanName;

      if (foundAzure && foundAzure.id) {
        finalTaskFormatted = `Task ${foundAzure.id}: ${foundAzure.cleanTitle}`;
        formattedCount++;
      } else if (azureId) {
        finalTaskFormatted = `Task ${azureId}: ${cleanName}`;
        formattedCount++;
      } else {
        finalTaskFormatted = cleanName;
      }

      // 5. Clasificar en la Big Rock / Macrotarea correspondiente
      let tagField = '';
      if (tagColIndex !== -1 && row[tagColIndex]) {
        tagField = String(row[tagColIndex]).trim();
      }

      let matchedTagKey = '';
      Object.keys(this.macroTagMap).forEach(key => {
        if (tagField.includes(key)) matchedTagKey = key;
      });

      if (!matchedTagKey) {
        const cLower = cleanName.toLowerCase();
        if (cLower.includes('análisis') || cLower.includes('analisis') || cLower.includes('diseño') || cLower.includes('work item') || cLower.includes('riesgos') || cLower.includes('rendimiento') || cLower.includes('presentación') || cLower.includes('presentacion')) {
          matchedTagKey = 'BR_AnálisisDiseño';
        } else if (cLower.includes('monitoreo') || cLower.includes('seguimiento') || cLower.includes('métricas') || cLower.includes('metricas') || cLower.includes('calidad')) {
          matchedTagKey = 'BR_Monitoreo';
        } else if (cLower.includes('administración') || cLower.includes('adm') || cLower.includes('gestión')) {
          matchedTagKey = 'BR_AdmDev';
        } else if (cLower.includes('liberación') || cLower.includes('liberacion') || cLower.includes('despliegue')) {
          matchedTagKey = 'BR_LIB';
        } else {
          matchedTagKey = 'BR_Dev';
        }
      }

      const macroObj = macroMap.get(matchedTagKey);
      if (macroObj && !macroObj.tasks.includes(finalTaskFormatted)) {
        macroObj.tasks.push(finalTaskFormatted);
      }
    }

    this.saaoMacroTasks = Array.from(macroMap.values());
    const collabs = Array.from(new Set(this.saaoMacroTasks.map(m => m.assignedTo)));
    this.saaoCollaboratorList = ['todos', ...collabs];
    if (this.userEmail) {
      this.filterCollaborator = this.userEmail.trim().toLowerCase();
    }

    this.syncSaaoTasksWithAzure();

    // Si aún no se han cargado datos del sprint desde Azure DevOps pero tenemos una iteración seleccionada, cargarlos para asociar IDs
    if ((!this.metrics?.developmentRate?.items || this.metrics.developmentRate.items.length === 0) && this.selectedIteration) {
      this.adoService.getMetrics(this.selectedIteration).subscribe({
        next: (m) => {
          this.metrics = m;
          this.syncSaaoTasksWithAzure();
        }
      });
    }

    this.addLog(`📊 Excel procesado: ${formattedCount} tareas vinculadas con sus IDs de Azure DevOps en formato "Task {id}: {nombre}".`, 'success');
    this.notificationService.success(`📊 Excel cargado: ${formattedCount} tareas vinculadas con sus IDs de Azure DevOps.`);
  }

  // Load saved process data from localStorage for selected sprint
  loadSavedSprintProcessData(): void {
    if (!this.selectedIteration) return;

    // Load Analysis Notes
    const savedNotes = localStorage.getItem(`cmmi5_process_analysis_${this.selectedIteration}`);
    if (savedNotes) this.sprintAnalysisNotes = savedNotes;

    // Load Minuta Riesgos
    const savedMinuta = localStorage.getItem(`cmmi5_process_minuta_${this.selectedIteration}`);
    if (savedMinuta) {
      try { this.minutaRiesgos = JSON.parse(savedMinuta); } catch (e) {}
    }

    // Load Evidences
    const savedEvidences = localStorage.getItem(`cmmi5_process_evidences_${this.selectedIteration}`);
    if (savedEvidences) {
      try { this.evidences = JSON.parse(savedEvidences); } catch (e) {}
    }

    // Load Individual Item Analyses
    const savedItemAnalyses = localStorage.getItem(`cmmi5_process_item_analyses_${this.selectedIteration}`);
    if (savedItemAnalyses) {
      try { this.itemAnalysesMap = JSON.parse(savedItemAnalyses); } catch (e) {}
    }

    // Load SharePoint Inspector State
    this.loadSharePointState();

    // Cargar proceso completo desde MongoDB Atlas (incluye saaoMacroTasks guardadas previamente)
    this.metricsApiService.getProcessData(this.selectedIteration).subscribe({
      next: (data) => {
        if (data) {
          if (data.sprintAnalysisNotes) this.sprintAnalysisNotes = data.sprintAnalysisNotes;
          if (data.minutaRiesgos) this.minutaRiesgos = data.minutaRiesgos;
          if (data.evidences) this.evidences = data.evidences;
          if (data.itemAnalysesMap) this.itemAnalysesMap = data.itemAnalysesMap;

          // Si ya tenemos datos de Azure DevOps, prevalecen los IDs REALES de Azure DevOps
          if (this.metrics?.developmentRate?.items && this.metrics.developmentRate.items.length > 0) {
            this.buildSaaoMacroTasksFromAzure();
          } else if (data.saaoMacroTasks && Array.isArray(data.saaoMacroTasks) && data.saaoMacroTasks.length > 0) {
            this.saaoMacroTasks = data.saaoMacroTasks;
            const collabs: string[] = Array.from(new Set<string>(data.saaoMacroTasks.map((m: any) => String(m.assignedTo || '')))).filter(Boolean);
            this.saaoCollaboratorList = ['todos', ...collabs];
          }
        }
      }
    });
  }

  // Save Analysis Notes to DB / LocalStorage
  saveSprintAnalysis(): void {
    if (!this.selectedIteration) return;
    localStorage.setItem(`cmmi5_process_analysis_${this.selectedIteration}`, this.sprintAnalysisNotes);
    this.saveFullProcessToMongoDB();
  }

  // Save Minuta de Riesgos y Oportunidades
  saveMinutaRiesgos(): void {
    if (!this.selectedIteration) return;
    this.minutaRiesgos.savedDate = new Date().toISOString();
    localStorage.setItem(`cmmi5_process_minuta_${this.selectedIteration}`, JSON.stringify(this.minutaRiesgos));
    this.saveFullProcessToMongoDB();
  }

  // Save Evidences
  saveEvidences(): void {
    if (!this.selectedIteration) return;
    localStorage.setItem(`cmmi5_process_evidences_${this.selectedIteration}`, JSON.stringify(this.evidences));
    this.saveFullProcessToMongoDB();
  }

  // Save full sprint process data to MongoDB Atlas
  saveFullProcessToMongoDB(): void {
    if (!this.selectedIteration) return;

    const payload = {
      sprintName: this.selectedIterationName,
      sprintAnalysisNotes: this.sprintAnalysisNotes,
      itemAnalysesMap: this.itemAnalysesMap,
      minutaRiesgos: this.minutaRiesgos,
      evidences: this.evidences,
      saaoMacroTasks: this.saaoMacroTasks,
      isFullyCertified: this.isSprintFullyCertified
    };

    // Guardar respaldo en LocalStorage
    localStorage.setItem(`cmmi5_process_macro_tasks_${this.selectedIteration}`, JSON.stringify(this.saaoMacroTasks));

    this.metricsApiService.saveProcessData(this.selectedIteration, payload).subscribe({
      next: () => {},
      error: () => {}
    });
    this.notificationService.success('Información del sprint guardada localmente y enviada a MongoDB Atlas.');
  }

  // CMMI 5 Validation: Validate Task 04 Peer Review de especificación BEFORE risks meeting
  validatePeerReviewBeforeRisks(): void {
    this.missingPeerReviewItems = [];
    if (!this.metrics?.developmentRate?.items) return;

    this.metrics.developmentRate.items.forEach(item => {
      const tasks = item.tasks || [];
      const specPeerReviewTask = tasks.find(t => {
        const title = (t.title || '').toLowerCase();
        return title.includes('04 peer review de especificación') || title.includes('peer review de especificación');
      });

      // If task exists but is NOT closed, or doesn't exist for deliverable
      if (specPeerReviewTask) {
        const isClosed = ['Closed', 'Resolved', 'Done', 'Completed'].includes(specPeerReviewTask.status || '');
        if (!isClosed) {
          this.missingPeerReviewItems.push({
            id: item.id,
            title: item.title,
            type: item.type,
            isw: item.isw,
            statusTask: specPeerReviewTask.status
          });
        }
      } else {
        // If deliverable has no Peer Review spec task created yet
        this.missingPeerReviewItems.push({
          id: item.id,
          title: item.title,
          type: item.type,
          isw: item.isw,
          statusTask: 'Sin Crear'
        });
      }
    });
  }

  // Check if Sprint Certification (Green Badge) is 100% complete
  get isSprintFullyCertified(): boolean {
    if (!this.metrics) return false;
    const hasAnalysis = !!this.sprintAnalysisNotes.trim() || Object.keys(this.itemAnalysesMap).length > 0 || this.manualPreAnalyses.length > 0 || this.spFolderItems.some(i => i.name.toLowerCase().includes('análisis') && i.isVerified);
    const hasMinuta = !!(this.minutaRiesgos.puntosDiscutidos || this.minutaRiesgos.acuerdos) || this.spFolderItems.some(i => i.name.toLowerCase().includes('minuta') && i.isVerified);
    const hasNoPeerReviewDeficit = this.missingPeerReviewItems.length === 0;
    const hasPresentations = (this.evidences.isReleasePresented || !!this.evidences.releasePresentationUrl) && (this.evidences.isSprintPresented || !!this.evidences.sprintPresentationUrl) || this.spFolderItems.some(i => i.name.toLowerCase().includes('presentaci') && i.isVerified);
    const hasEvidences = !!(this.evidences.emailEvidenceUrl && this.evidences.risksMinutaUrl) || this.spFolderItems.some(i => (i.name.toLowerCase().includes('liberaci') || i.name.toLowerCase().includes('sprint')) && i.isVerified);

    return hasAnalysis && hasMinuta && hasNoPeerReviewDeficit && hasPresentations && hasEvidences;
  }

  // Verifica si el sprint ha superado su fecha fin (fuera de tiempo)
  get isSprintExpired(): boolean {
    if (!this.metrics?.endDate) return false;
    const end = new Date(this.metrics.endDate);
    if (isNaN(end.getTime())) return false;
    end.setHours(23, 59, 59, 999);
    return new Date() > end;
  }

  // Comprueba la completitud de evidencias e inspeccion de SharePoint para cada etapa del pipeline
  isStageComplete(stage: number): boolean {
    switch (stage) {
      case 1:
        return !!this.metrics && (this.metrics.developmentRate?.totalItems > 0 || !!this.metrics.iterationName);
      case 2:
        const hasSpAnalysis = this.spFolderItems.some(i => i.name.toLowerCase().includes('análisis') && i.isVerified);
        return !!this.sprintAnalysisNotes.trim() || Object.keys(this.itemAnalysesMap).length > 0 || this.manualPreAnalyses.length > 0 || hasSpAnalysis;
      case 3:
        const hasSpSprintFolder = this.spFolderItems.some(i => i.name.toLowerCase().includes('sprint') && i.isVerified);
        return this.saaoMacroTasks.length > 0 || (this.metrics?.developmentRate?.items?.some(i => i.tasks?.length > 0) ?? false) || hasSpSprintFolder;
      case 4:
        const hasSpRisks = this.spFolderItems.some(i => (i.name.toLowerCase().includes('minuta') || i.name.toLowerCase().includes('riesgos')) && i.isVerified);
        return (!!(this.minutaRiesgos.puntosDiscutidos || this.minutaRiesgos.acuerdos) || hasSpRisks) && this.missingPeerReviewItems.length === 0;
      case 5:
        const hasSpPres = this.spFolderItems.some(i => (i.name.toLowerCase().includes('presentaci') || i.name.toLowerCase().includes('análisis')) && i.isVerified);
        return ((this.evidences.isReleasePresented || !!this.evidences.releasePresentationUrl) && (this.evidences.isSprintPresented || !!this.evidences.sprintPresentationUrl)) || hasSpPres;
      case 6:
        return this.saaoMacroTasks.length > 0 || this.isSpJsonParsed;
      case 7:
        return this.saaoMacroTasks.length > 0 || this.isSpJsonParsed;
      case 8:
        return this.saaoMacroTasks.some(m => m.tasks && m.tasks.length > 0) || this.isSpJsonParsed;
      case 9:
        const hasSpReleaseOrLiberacion = this.spFolderItems.some(i => (i.name.toLowerCase().includes('liberaci') || i.name.toLowerCase().includes('sprint')) && i.isVerified);
        const hasEvidences = !!(this.evidences.emailEvidenceUrl && this.evidences.risksMinutaUrl) || hasSpReleaseOrLiberacion;
        return hasEvidences || (this.isSpJsonParsed && this.spFolderItems.some(i => i.isVerified));
      default:
        return true;
    }
  }

  // Procesa el JSON del endpoint de SharePoint REST API
  parseSharePointJsonInput(): void {
    if (!this.sharePointRawJsonInput.trim()) {
      this.notificationService.error('Por favor pega la respuesta JSON del endpoint de SharePoint.');
      return;
    }

    try {
      let parsedObj = JSON.parse(this.sharePointRawJsonInput.trim());
      let rows: any[] = [];
      if (parsedObj?.ListData?.Row) {
        rows = parsedObj.ListData.Row;
      } else if (Array.isArray(parsedObj)) {
        rows = parsedObj;
      } else if (parsedObj?.Row) {
        rows = parsedObj.Row;
      } else if (parsedObj?.d?.results) {
        rows = parsedObj.d.results;
      }

      if (!rows || rows.length === 0) {
        this.notificationService.error('No se encontraron filas ("Row") en la estructura JSON de SharePoint proporcionada.');
        return;
      }

      this.spFolderItems = rows.map((r: any) => {
        const name = r.FileLeafRef || r.Title || r.Name || 'Carpeta / Archivo';
        const folderChildCount = parseInt(r.FolderChildCount || r.ItemChildCount || '0', 10);
        const itemChildCount = parseInt(r.ItemChildCount || '0', 10);
        const totalSizeBytes = parseInt(r.SMTotalSize || r.File_x0020_Size || '0', 10);
        const editor = Array.isArray(r.Editor) && r.Editor.length > 0 ? r.Editor[0].title : (r.Editor || 'Desconocido');
        const modified = r.Modified || r.Created_x0020_Date || '';
        const spItemUrl = r['.spItemUrl'] || r.FileRef || '';

        const hasContents = folderChildCount > 0 || itemChildCount > 0 || totalSizeBytes > 0;

        return {
          id: r.ID || r.UniqueId || Math.random().toString(),
          name,
          fileRef: r.FileRef || '',
          folderChildCount,
          itemChildCount,
          totalSizeBytes,
          modifiedDate: modified,
          editorName: editor,
          spItemUrl,
          isVerified: hasContents
        };
      });

      this.isSpJsonParsed = true;
      this.saveSharePointState();
      this.notificationService.success(`✅ ${this.spFolderItems.length} elementos de SharePoint analizados y verificados correctamente.`);
    } catch (err: any) {
      this.notificationService.error('Error al analizar la estructura JSON de SharePoint. Verifica la sintaxis.');
    }
  }

  saveSharePointState(): void {
    if (!this.selectedIteration) return;
    localStorage.setItem(`cmmi5_process_sp_items_${this.selectedIteration}`, JSON.stringify(this.spFolderItems));
  }

  loadSharePointState(): void {
    if (!this.selectedIteration) return;
    const saved = localStorage.getItem(`cmmi5_process_sp_items_${this.selectedIteration}`);
    if (saved) {
      try {
        this.spFolderItems = JSON.parse(saved);
        this.isSpJsonParsed = this.spFolderItems.length > 0;
      } catch (e) {}
    }
  }

  // Asigna dinámicamente la clase CSS de la tab del pipeline (Rojo si el sprint ya venció y falta evidencia)
  getStageClass(stage: number): string {
    const isActive = this.activeStage === stage;
    const isComplete = this.isStageComplete(stage);
    const expired = this.isSprintExpired;

    if (expired && !isComplete) {
      return isActive
        ? 'bg-rose-600 text-white font-bold shadow-lg shadow-rose-600/30 border border-rose-500 animate-pulse'
        : 'bg-rose-500/15 text-rose-600 dark:text-rose-400 font-bold border border-rose-500/40 hover:bg-rose-500/25';
    }

    if (isActive) {
      return 'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-500/20';
    }

    if (isComplete) {
      return 'text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 font-semibold border border-emerald-500/20';
    }

    return 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800';
  }

  // Clase CSS para la insignia numérica de la tab
  getStageBadgeClass(stage: number): string {
    const isActive = this.activeStage === stage;
    const isComplete = this.isStageComplete(stage);
    const expired = this.isSprintExpired;

    if (expired && !isComplete) {
      return 'bg-rose-600 text-white font-black';
    }

    if (isActive) {
      return 'bg-white text-indigo-600 font-black';
    }

    if (isComplete) {
      return 'bg-emerald-500 text-white font-black';
    }

    return 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300';
  }



  // Parse Macrotareas from sheet rows (Prioritizing 'Title 2' column)
  parseSaaoMacroTasksFromExcel(rows: any[]): void {
    if (!rows || rows.length < 2) return;

    // 1. Detect column headers in first 3 rows for 'Title 2', 'Assigned To' and 'Tag'
    let title2ColIndex = 2; // Default to Column C (index 2) for Title 2
    let assignedToColIndex = 4; // Default to Column E (index 4) for Assigned To
    let tagColIndex = 9; // Default to Column J (index 9) for Tag PBOT

    for (let h = 0; h < Math.min(rows.length, 3); h++) {
      const headerRow = rows[h];
      if (Array.isArray(headerRow)) {
        headerRow.forEach((colVal: any, idx: number) => {
          const valStr = String(colVal || '').trim().toLowerCase();
          if (valStr.includes('title 2') || valStr.includes('título 2') || valStr.includes('title2') || valStr.includes('título2')) {
            title2ColIndex = idx;
          }
          if (valStr.includes('assigned') || valStr.includes('asignado')) {
            assignedToColIndex = idx;
          }
          if (valStr.includes('tag') || valStr.includes('bigrock')) {
            tagColIndex = idx;
          }
        });
      }
    }

    // Detectar también columna de ID de WorkItem (ID, WorkItem ID, Task ID, etc.)
    let idColIndex = -1;
    for (let h = 0; h < Math.min(rows.length, 3); h++) {
      const headerRow = rows[h];
      if (Array.isArray(headerRow)) {
        headerRow.forEach((colVal: any, idx: number) => {
          const valStr = String(colVal || '').trim().toLowerCase();
          if (valStr === 'id' || valStr.includes('work item id') || valStr.includes('task id') || valStr === 'id tarea') {
            idColIndex = idx;
          }
        });
      }
    }

    const macroMap = new Map<string, SaaoMacroTask>();

    for (let r = 1; r < rows.length; r++) {
      const row = rows[r];
      if (!row || row.length === 0) continue;

      // Extract title strictly from Title 2 column
      const rawTitle2 = row[title2ColIndex];
      let taskTitle = String(rawTitle2 !== undefined && rawTitle2 !== null && String(rawTitle2).trim() !== '' ? rawTitle2 : (row[2] || row[1] || '')).trim();
      
      const titleLower = taskTitle.toLowerCase();
      // Ignore header text or invalid single-word placeholders like 'task', 'riesgos' alone
      if (!taskTitle || titleLower === 'title 2' || titleLower === 'título 2' || titleLower === 'task' || titleLower === 'riesgos' || titleLower === 'titulo') continue;

      // Extraer ID de Azure DevOps si está presente en la columna ID o dentro del título
      let workItemId = '';
      if (idColIndex !== -1 && row[idColIndex]) {
        const rawId = String(row[idColIndex]).trim();
        const idMatch = rawId.match(/(\d+)/);
        if (idMatch) workItemId = idMatch[1];
      }

      if (!workItemId) {
        const titleIdMatch = taskTitle.match(/Task\s*#?\s*(\d+)/i) || taskTitle.match(/(\d{4,6})/);
        if (titleIdMatch) workItemId = titleIdMatch[1];
      }

      // Si tenemos ID de Azure y la tarea no tiene aún el formato 'Task {id}: {nombre}', formatearla
      if (workItemId && !taskTitle.toLowerCase().includes(`task ${workItemId}`)) {
        const cleanName = taskTitle.replace(/^task\s*\d+\s*:?\s*/i, '').trim();
        taskTitle = `Task ${workItemId}: ${cleanName}`;
      }

      const assignedTo = String(row[assignedToColIndex] || row[4] || row[3] || '').trim().toLowerCase();
      const tagField = String(row[tagColIndex] || row[9] || row[8] || '').trim();

      // Si el usuario configuró su correo/usuario local en Configuración, importar únicamente sus tareas
      if (this.userEmail) {
        const cleanUser = this.userEmail.trim().toLowerCase();
        const userPrefix = cleanUser.split('@')[0];
        if (assignedTo && !assignedTo.includes(cleanUser) && !assignedTo.includes(userPrefix) && !cleanUser.includes(assignedTo)) {
          continue;
        }
      }

      // Extract BR_ tag
      let matchedTagKey = '';
      Object.keys(this.macroTagMap).forEach(key => {
        if (tagField.includes(key) || taskTitle.includes(key)) {
          matchedTagKey = key;
        }
      });

      if (!matchedTagKey) {
        // Fallback matching based on task name
        if (titleLower.includes('análisis') || titleLower.includes('analisis') || titleLower.includes('diseño')) matchedTagKey = 'BR_AnálisisDiseño';
        else if (titleLower.includes('monitoreo') || titleLower.includes('seguimiento')) matchedTagKey = 'BR_Monitoreo';
        else if (titleLower.includes('administración') || titleLower.includes('adm')) matchedTagKey = 'BR_AdmDev';
        else if (titleLower.includes('liberación') || titleLower.includes('liberacion')) matchedTagKey = 'BR_LIB';
        else matchedTagKey = 'BR_Dev';
      }

      // Extract iteration path or row text to get the actual Release number (e.g. Release 15 from "...\Release 15\Sprint 39")
      const rowIterationPath = row.join(' ');
      const relMatch = rowIterationPath.match(/Release\s*#?\s*(\d+)/i) || this.selectedIterationName.match(/Release\s*#?\s*(\d+)/i);
      const releaseNum = relMatch ? relMatch[1] : '15';

      const macroInfo = this.macroTagMap[matchedTagKey];
      const macroTitle = `Ope 20>Release #${releaseNum}>${macroInfo.name}`;
      const uniqueKey = `${assignedTo}_${matchedTagKey}`;

      if (!macroMap.has(uniqueKey)) {
        macroMap.set(uniqueKey, {
          tag: matchedTagKey,
          macroTitle,
          releaseName: `Release #${releaseNum}`,
          assignedTo: assignedTo || 'marlon',
          startDate: this.metrics?.startDate || '',
          endDate: this.metrics?.endDate || '',
          deliverableBigRock: macroTitle,
          estimatedHours: macroInfo.defaultHours,
          estimatedMinutes: macroInfo.defaultMinutes,
          tasks: [],
          status: 'pending'
        });
      }

      // Avoid pushing duplicate tasks
      const foundAzure = this.findAzureIdForTaskTitle(taskTitle);
      let finalFormattedTask = taskTitle;
      if (foundAzure && foundAzure.id) {
        finalFormattedTask = `Task ${foundAzure.id}: ${foundAzure.cleanTitle}`;
      } else {
        const cleanName = this.cleanWorkItemTitle(taskTitle);
        if (workItemId && cleanName) {
          finalFormattedTask = `Task ${workItemId}: ${cleanName}`;
        } else if (cleanName) {
          finalFormattedTask = cleanName;
        }
      }

      const currentTasks = macroMap.get(uniqueKey)!.tasks;
      if (!currentTasks.includes(finalFormattedTask)) {
        currentTasks.push(finalFormattedTask);
      }
    }

    const result = Array.from(macroMap.values());
    if (result.length > 0) {
      this.saaoMacroTasks = result;
      // Extract collaborator names
      const collabs = Array.from(new Set(result.map(m => m.assignedTo)));
      this.saaoCollaboratorList = ['todos', ...collabs];
      // Guardar e inmediatamente vincular con Azure DevOps para obtener los IDs reales
      this.syncSaaoTasksWithAzure();
    }
  }

  // Initialize demo data for SAAO Macrotareas if no file uploaded yet
  initDefaultSaaoDemoData(): void {
    const releaseNum = '15';
    this.saaoMacroTasks = [
      {
        tag: 'BR_AnálisisDiseño',
        macroTitle: `Ope 20>Release #${releaseNum}>Análisis y diseño`,
        releaseName: `Release #${releaseNum}`,
        assignedTo: 'marlon',
        startDate: '2024-08-01',
        endDate: '2024-08-14',
        deliverableBigRock: `Ope 20>Release #${releaseNum}>Análisis y diseño`,
        tasks: [
          'Task 48111: Presentación de Work Items',
          'Task 48112: Reunión evaluación de riesgos',
          'Task 48113: Utilizar el Modelo de Rendimiento'
        ],
        status: 'pending'
      },
      {
        tag: 'BR_Monitoreo',
        macroTitle: `Ope 20>Release #${releaseNum}>Monitoreo y seguimiento`,
        releaseName: `Release #${releaseNum}`,
        assignedTo: 'marlon',
        startDate: '2024-08-01',
        endDate: '2024-08-14',
        deliverableBigRock: `Ope 20>Release #${releaseNum}>Monitoreo y seguimiento`,
        tasks: [
          'Task 48114: Seguimiento diario de avance en Azure DevOps',
          'Task 48115: Revisión de métricas de calidad CMMI'
        ],
        status: 'pending'
      },
      {
        tag: 'BR_Dev',
        macroTitle: `Ope 20>Release #${releaseNum}>Desarrollo sprint en curso`,
        releaseName: `Release #${releaseNum}`,
        assignedTo: 'marlon',
        startDate: '2024-08-01',
        endDate: '2024-08-14',
        deliverableBigRock: `Ope 20>Release #${releaseNum}>Desarrollo sprint en curso`,
        tasks: [
          'Task 48116: Elaboración de código y pruebas unitarias',
          'Task 48117: Peer Review de código'
        ],
        status: 'pending'
      }
    ];
  }



  // Copy Task Title
  copyToClipboard(text: string): void {
    navigator.clipboard.writeText(text);
    this.notificationService.success('Texto copiado al portapapeles.');
  }

  // Generate 1-Click SAAO Automation Script & Bookmarklet Plugin with Floating UI Overlay
  getSaaoBookmarkletUrl(macro: SaaoMacroTask): string {
    const tasksJson = JSON.stringify(macro.tasks);
    const jsCode = `
(function autoFillSaaoPlugin() {
  const macroTitle = "${macro.macroTitle}";
  const tasks = ${tasksJson};

  // Crear widget flotante en SAAO
  let overlay = document.getElementById('saao-plugin-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'saao-plugin-overlay';
    overlay.style.cssText = 'position:fixed;top:20px;right:20px;z-index:999999;background:#0f172a;color:#fff;padding:16px 20px;border-radius:18px;box-shadow:0 20px 25px -5px rgba(0,0,0,0.5);font-family:system-ui,sans-serif;font-size:13px;border:2px solid #6366f1;max-width:380px;';
    document.body.appendChild(overlay);
  }

  function showOverlayStatus(msg, statusColor = '#818cf8', progress = '') {
    overlay.innerHTML = \`
      <div style="font-weight:900;color:\${statusColor};font-size:14px;margin-bottom:6px;display:flex;align-items:center;gap:6px;">
        <span>⚡ Plugin Autollenado SAAO</span>
      </div>
      <div style="font-size:12px;opacity:0.9;line-height:1.4;">\${msg}</div>
      \${progress ? \`<div style="margin-top:8px;font-weight:bold;color:#10b981;font-size:12px;">\${progress}</div>\` : ''}
    \`;
  }

  showOverlayStatus(\`Iniciando Macrotarea: <b>\${macroTitle}</b>\`);

  // 1. Inyectar título de Macrotarea en Blazor Radzen
  const macroTextarea = document.querySelector('textarea[maxlength="500"]') || document.querySelector('textarea');
  if (macroTextarea) {
    macroTextarea.value = macroTitle;
    macroTextarea.dispatchEvent(new Event('input', { bubbles: true }));
    macroTextarea.dispatchEvent(new Event('change', { bubbles: true }));
  }

  // 2. Agregar tareas de forma secuencial
  let index = 0;
  function processNextTask() {
    if (index >= tasks.length) {
      showOverlayStatus("🎉 ¡Todas las tareas han sido agregadas exitosamente a SAAO!", "#10b981", "✅ Proceso 100% Completado");
      const saveButton = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Guardar'));
      if (saveButton && confirm("¿Deseas guardar automáticamente esta Macrotarea en SAAO?")) {
        saveButton.click();
      }
      setTimeout(() => { overlay.remove(); }, 6000);
      return;
    }

    const currentTask = tasks[index];
    const taskInput = document.querySelector('.rz-fieldset-content textarea') || document.querySelectorAll('textarea')[1];
    const addButton = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Agregar nueva tarea'));

    if (taskInput && addButton) {
      showOverlayStatus(\`Insertando tarea \${index + 1}/\${tasks.length}:<br><b>\${currentTask}</b>\`, '#818cf8', \`Progreso: \${index + 1} de \${tasks.length}\`);
      taskInput.value = currentTask;
      taskInput.dispatchEvent(new Event('input', { bubbles: true }));
      taskInput.dispatchEvent(new Event('change', { bubbles: true }));

      setTimeout(() => {
        addButton.click();
        index++;
        setTimeout(processNextTask, 650);
      }, 350);
    } else {
      showOverlayStatus("⚠️ Esperando renderizado de formulario Radzen...", "#f59e0b");
      setTimeout(processNextTask, 800);
    }
  }

  setTimeout(processNextTask, 500);
})();
    `.replace(/\n/g, ' ').trim();

    return `javascript:${encodeURIComponent(jsCode)}`;
  }

  generateSaaoAutoScript(macro: SaaoMacroTask): void {
    const tasksJson = JSON.stringify(macro.tasks);
    const script = `
(function autoFillSaaoPlugin() {
  const macroTitle = "${macro.macroTitle}";
  const tasks = ${tasksJson};

  // Widget flotante de progreso en SAAO
  let overlay = document.getElementById('saao-plugin-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'saao-plugin-overlay';
    overlay.style.cssText = 'position:fixed;top:20px;right:20px;z-index:999999;background:#0f172a;color:#fff;padding:16px 20px;border-radius:18px;box-shadow:0 20px 25px -5px rgba(0,0,0,0.5);font-family:system-ui,sans-serif;font-size:13px;border:2px solid #6366f1;max-width:380px;';
    document.body.appendChild(overlay);
  }

  function showOverlayStatus(msg, statusColor = '#818cf8', progress = '') {
    overlay.innerHTML = \`
      <div style="font-weight:900;color:\${statusColor};font-size:14px;margin-bottom:6px;display:flex;align-items:center;gap:6px;">
        <span>⚡ Plugin Autollenado SAAO</span>
      </div>
      <div style="font-size:12px;opacity:0.9;line-height:1.4;">\${msg}</div>
      \${progress ? \`<div style="margin-top:8px;font-weight:bold;color:#10b981;font-size:12px;">\${progress}</div>\` : ''}
    \`;
  }

  showOverlayStatus(\`Iniciando Macrotarea: <b>\${macroTitle}</b>\`);

  // 1. Inyectar título de Macrotarea en Blazor Radzen
  const macroTextarea = document.querySelector('textarea[maxlength="500"]') || document.querySelector('textarea');
  if (macroTextarea) {
    macroTextarea.value = macroTitle;
    macroTextarea.dispatchEvent(new Event('input', { bubbles: true }));
    macroTextarea.dispatchEvent(new Event('change', { bubbles: true }));
  }

  // 2. Agregar tareas secuencialmente
  let index = 0;
  function processNextTask() {
    if (index >= tasks.length) {
      showOverlayStatus("🎉 ¡Todas las tareas han sido agregadas a SAAO!", "#10b981", "✅ Proceso 100% Completado");
      const saveButton = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Guardar'));
      if (saveButton && confirm("¿Deseas guardar automáticamente esta Macrotarea en SAAO?")) {
        saveButton.click();
      }
      setTimeout(() => { overlay.remove(); }, 6000);
      return;
    }

    const currentTask = tasks[index];
    const taskInput = document.querySelector('.rz-fieldset-content textarea') || document.querySelectorAll('textarea')[1];
    const addButton = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Agregar nueva tarea'));

    if (taskInput && addButton) {
      showOverlayStatus(\`Insertando tarea \${index + 1}/\${tasks.length}:<br><b>\${currentTask}</b>\`, '#818cf8', \`Progreso: \${index + 1} de \${tasks.length}\`);
      taskInput.value = currentTask;
      taskInput.dispatchEvent(new Event('input', { bubbles: true }));
      taskInput.dispatchEvent(new Event('change', { bubbles: true }));

      setTimeout(() => {
        addButton.click();
        index++;
        setTimeout(processNextTask, 650);
      }, 350);
    } else {
      setTimeout(processNextTask, 800);
    }
  }

  setTimeout(processNextTask, 500);
})();
    `.trim();

    navigator.clipboard.writeText(script);
    macro.status = 'inserted';
    this.addLog('⚡ Script de autollenado generado y copiado al portapapeles para Macrotarea: "' + macro.macroTitle + '"', 'success');
    this.notificationService.success('⚡ ¡Plugin de Autollenado SAAO copiado! Pégalo en la consola de SAAO (F12) para ejecutar con indicador visual flotante.');
  }

  // Generate Master Plugin Script for ALL Macrotareas at once
  generateAllSaaoAutoScript(): void {
    if (this.saaoMacroTasks.length === 0) {
      this.notificationService.error('No hay Macrotareas cargadas para automatizar.');
      this.addLog('❌ Error: No hay Macrotareas cargadas en el sistema.', 'error');
      return;
    }

    const allMacrosJson = JSON.stringify(this.saaoMacroTasks);
    const script = `
(function masterSaaoAutoFillPlugin() {
  const allMacros = ${allMacrosJson};

  function setRadzenValue(el, val) {
    if (!el) return;
    el.focus();
    const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value")?.set ||
                   Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
    if (setter) setter.call(el, val); else el.value = val;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    el.blur();
  }

  function clickRadzenBtn(btn) {
    if (!btn) return;
    btn.focus();
    ['mousedown', 'mouseup', 'click'].forEach(t => {
      btn.dispatchEvent(new MouseEvent(t, { view: window, bubbles: true, cancelable: true, buttons: 1 }));
    });
  }

  function getMacrotareaTextarea() {
    const labels = Array.from(document.querySelectorAll('label'));
    const macroLabel = labels.find(l => {
      const txt = (l.textContent || '').trim();
      return txt.includes('Macrotarea *') || (txt.includes('Macrotarea') && !txt.includes('sin detalle'));
    });
    if (macroLabel) {
      const container = macroLabel.closest('.row') || macroLabel.parentElement?.parentElement;
      if (container) {
        const ta = container.querySelector('textarea');
        if (ta) return ta;
      }
    }
    const allTextareas = Array.from(document.querySelectorAll('textarea'));
    const nonTaskTextareas = allTextareas.filter(t => !t.closest('fieldset')?.querySelector('legend')?.textContent?.includes('Agregar Tareas'));
    if (nonTaskTextareas.length >= 2) return nonTaskTextareas[1];
    return nonTaskTextareas[0] || allTextareas[0];
  }

  function getSubtaskTextarea() {
    const fieldset = Array.from(document.querySelectorAll('fieldset')).find(f => {
      const legend = f.querySelector('.rz-fieldset-legend-text');
      return legend && legend.textContent.includes('Agregar Tareas');
    });
    if (fieldset) {
      const ta = fieldset.querySelector('textarea');
      if (ta) return ta;
    }
    const textareas = Array.from(document.querySelectorAll('textarea'));
    return textareas[textareas.length - 1];
  }

  function getAddMacroButton() {
    const candidates = Array.from(document.querySelectorAll('button, a, .rz-tabview-nav li a'));
    return candidates.find(el => {
      const txt = (el.textContent || '').trim();
      const hasAddIcon = el.querySelector('i.rzi, span.rzi')?.textContent?.includes('add_circle_outline');
      const isAddText = (txt.includes('Agregar') || txt.includes('ﾠAgregar')) && !txt.includes('nueva tarea') && !txt.includes('Guardar');
      return hasAddIcon || isAddText;
    });
  }

  function getAddTaskButton() {
    return Array.from(document.querySelectorAll('button')).find(b => {
      const txt = (b.textContent || '').trim();
      return txt.includes('Agregar nueva tarea');
    });
  }

  function getSaveFormButton() {
    return Array.from(document.querySelectorAll('button')).find(b => {
      const txt = (b.textContent || '').trim();
      return txt === 'Guardar' || (txt.includes('Guardar') && !txt.includes('comentario') && !txt.includes('tarea'));
    });
  }

  let overlay = document.getElementById('saao-plugin-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'saao-plugin-overlay';
    overlay.style.cssText = 'position:fixed;top:20px;right:20px;z-index:999999;background:#0f172a;color:#fff;padding:20px 24px;border-radius:20px;box-shadow:0 25px 30px -5px rgba(0,0,0,0.6);font-family:system-ui,sans-serif;font-size:13px;border:2px solid #6366f1;max-width:420px;';
    document.body.appendChild(overlay);
  }

  function showStatus(title, detail, color='#818cf8', progress='') {
    overlay.innerHTML = \`
      <div style="font-weight:900;color:\${color};font-size:15px;margin-bottom:8px;display:flex;align-items:center;gap:8px;">
        <span>⚡ Master Plugin SAAO (Automatización Masiva)</span>
      </div>
      <div style="font-weight:bold;font-size:13px;color:#f8fafc;margin-bottom:4px;">\${title}</div>
      <div style="font-size:12px;opacity:0.85;line-height:1.4;">\${detail}</div>
      \${progress ? \`<div style="margin-top:10px;font-weight:bold;color:#10b981;font-size:12px;background:#064e3b;padding:4px 8px;border-radius:8px;display:inline-block;">\${progress}</div>\` : ''}
    \`;
  }

  let macroIndex = 0;

  function processNextMacro() {
    if (macroIndex >= allMacros.length) {
      showStatus("🎉 ¡AUTOMATIZACIÓN COMPLETA CMMI 5!", "Se han creado exitosamente las " + allMacros.length + " Macrotareas y todas sus sub-tareas en SAAO.", "#10b981", "✅ Proceso 100% Finalizado");
      setTimeout(() => { overlay.remove(); }, 8000);
      return;
    }

    const currentMacro = allMacros[macroIndex];
    showStatus("Procesando Macrotarea " + (macroIndex + 1) + " de " + allMacros.length, "<b>" + currentMacro.macroTitle + "</b>", "#818cf8", "Macrotarea " + (macroIndex + 1) + "/" + allMacros.length);

    // 0. Si el formulario no está visible, hacer clic en "Agregar" Macrotarea
    let macroTextarea = getMacrotareaTextarea();
    if (!macroTextarea) {
      const addMacroBtn = getAddMacroButton();
      if (addMacroBtn) {
        showStatus("Abriendo formulario de Macrotarea " + (macroIndex + 1) + " (Clic en 'Agregar')...", "#f59e0b");
        clickRadzenBtn(addMacroBtn);
        setTimeout(processNextMacro, 1100);
        return;
      }
    }

    // 1. Inyectar título en el campo 'Macrotarea *' (no Hashtag)
    macroTextarea = getMacrotareaTextarea();
    if (macroTextarea) {
      setRadzenValue(macroTextarea, currentMacro.macroTitle);
    }

    // 2. Inyectar sub-tareas en 'Agregar Tareas'
    let taskIndex = 0;
    function processNextTask() {
      if (taskIndex >= currentMacro.tasks.length) {
        showStatus("Guardando Macrotarea " + (macroIndex + 1), "Guardando en SAAO...", "#f59e0b");
        const saveBtn = getSaveFormButton();
        if (saveBtn) {
          clickRadzenBtn(saveBtn);
        }
        macroIndex++;
        setTimeout(processNextMacro, 2200);
        return;
      }

      const taskName = currentMacro.tasks[taskIndex];
      const taskInput = getSubtaskTextarea();
      const addBtn = getAddTaskButton();

      if (taskInput && addBtn) {
        showStatus("Insertando tarea " + (taskIndex + 1) + "/" + currentMacro.tasks.length, "<b>" + taskName + "</b>", '#818cf8', "Macrotarea " + (macroIndex + 1) + "/" + allMacros.length + " • Tarea " + (taskIndex + 1) + "/" + currentMacro.tasks.length);
        setRadzenValue(taskInput, taskName);

        setTimeout(() => {
          clickRadzenBtn(addBtn);
          taskIndex++;
          setTimeout(processNextTask, 700);
        }, 400);
      } else {
        setTimeout(processNextTask, 800);
      }
    }

    setTimeout(processNextTask, 600);
  }

  setTimeout(processNextMacro, 500);
})();
    `.trim();

    navigator.clipboard.writeText(script);
    this.addLog('🚀 Master Plugin generado y copiado al portapapeles para TODAS las ' + this.saaoMacroTasks.length + ' Macrotareas.', 'success');
    this.notificationService.success('🚀 ¡Master Plugin SAAO copiado! Se automatizarán masivamente las ' + this.saaoMacroTasks.length + ' Macrotareas.');
  }

  automationLogs: Array<{ timestamp: string, message: string, type: 'info' | 'success' | 'error' | 'warn' }> = [
    { timestamp: new Date().toLocaleTimeString(), message: '⚡ Consola de Automatización SAAO lista. Haz clic en "Copiar Master Plugin" o "Enviar a Extensión".', type: 'info' }
  ];

  addLog(message: string, type: 'info' | 'success' | 'error' | 'warn' = 'info'): void {
    const timestamp = new Date().toLocaleTimeString();
    this.automationLogs.unshift({ timestamp, message, type });
    if (this.automationLogs.length > 80) this.automationLogs.pop();
  }

  clearLogs(): void {
    this.automationLogs = [];
    this.addLog('Consola de automatización limpiada.', 'info');
    this.notificationService.info('Consola de automatización limpiada.');
  }

  showBookmarkletHelp(): void {
    this.notificationService.info('📌 Arrastra este botón a tu barra de marcadores del navegador. Luego ve a SAAO y haz clic en el marcador para ejecutar el autollenado.');
  }

  // Send Direct Message to Extension Mayansoft TT (ado-time-tracker)
  sendDirectExtensionMessage(macro?: SaaoMacroTask): void {
    const macroToUse = macro || this.saaoMacroTasks[0];
    if (!macroToUse) {
      this.notificationService.error('No hay Macrotareas cargadas.');
      this.addLog('❌ Error: No hay Macrotareas cargadas en la lista.', 'error');
      return;
    }

    const formattedTasks = (macroToUse.tasks || []).map(t => this.formatTaskWithAzureIdFallback(t));

    const payload = {
      type: 'CMMI5_AUTOFILL_SAAO',
      macroTitle: macroToUse.macroTitle,
      tasks: formattedTasks,
      startDate: macroToUse.startDate,
      endDate: macroToUse.endDate,
      releaseName: macroToUse.releaseName,
      deliverableBigRock: macroToUse.deliverableBigRock,
      assignedTo: macroToUse.assignedTo
    };

    this.addLog('🚀 Orden emitida a Extensión Mayansoft TT: "' + macroToUse.macroTitle + '" (' + macroToUse.tasks.length + ' tareas)', 'info');
    console.log('%c🚀 [cmmi5-analyzer] Emitiendo orden de autollenado SAAO a la Extensión Mayansoft TT:', 'color:#6366f1;font-weight:bold;font-size:15px;', payload);

    // 1. Disparar evento postMessage
    window.postMessage(payload, '*');

    // 2. Disparar CustomEvent nativo en el documento
    document.dispatchEvent(new CustomEvent('CMMI5_AUTOFILL_SAAO_EVENT', {
      detail: payload
    }));

    // Autogenerar y copiar script listo para inyección inmediata
    this.generateSaaoAutoScript(macroToUse);
  }

  // Send Big Rock Order to Extension Mayansoft TT (EntregableForm)
  sendBigRockToExtension(macro?: SaaoMacroTask): void {
    const macroToUse = macro || this.saaoMacroTasks[0];
    if (!macroToUse) {
      this.notificationService.error('No hay Big Rocks/Macrotareas cargadas.');
      this.addLog('❌ Error: No hay Macrotareas cargadas en la lista.', 'error');
      return;
    }

    const payload = {
      type: 'CMMI5_AUTOFILL_SAAO',
      isBigRock: true,
      macroTitle: macroToUse.macroTitle,
      startDate: macroToUse.startDate,
      endDate: macroToUse.endDate,
      releaseName: macroToUse.releaseName,
      estimatedHours: macroToUse.estimatedHours || 4,
      estimatedMinutes: macroToUse.estimatedMinutes || 0,
      assignedTo: 'georgina.chan'
    };

    this.addLog('🧱 Orden de Big Rock emitida a Extensión Mayansoft TT: "' + macroToUse.macroTitle + '" (Responsable: georgina.chan)', 'info');
    console.log('%c🧱 [cmmi5-analyzer] Emitiendo orden de Big Rock SAAO a la Extensión:', 'color:#f59e0b;font-weight:bold;font-size:15px;', payload);

    window.postMessage(payload, '*');
    document.dispatchEvent(new CustomEvent('CMMI5_AUTOFILL_SAAO_EVENT', { detail: payload }));

    this.notificationService.success(`🧱 Orden de creación enviada para Big Rock "${macroToUse.macroTitle}". Redirigiendo a EntregableForm en SAAO...`);
  }

  // Open SAAO external site
  openSaaoSite(): void {
    this.addLog('🌐 Abriendo sitio oficial SAAO en nueva pestaña...', 'info');
    window.open(this.saaoUrl, '_blank');
  }

  // Open SAAO in an auxiliary side-by-side window
  openSaaoSideBySideWindow(): void {
    this.addLog('🌐 Abriendo SAAO en ventana asistida dividida al lado derecho...', 'info');
    const width = Math.floor(window.screen.width / 2);
    const height = window.screen.height;
    const left = width;
    const features = 'width=' + width + ',height=' + height + ',left=' + left + ',top=0,resizable=yes,scrollbars=yes';
    window.open(this.saaoUrl, 'SAAO_SideBySide_Window', features);
    this.notificationService.success('Ventana asistida de SAAO abierta al lado derecho de la pantalla.');
  }
}
