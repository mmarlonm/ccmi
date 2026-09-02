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
  Folder
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

  // Sprint Data
  iterations: any[] = [];
  selectedIteration: string = '';
  selectedIterationName: string = '';
  metrics: CMMIMetrics | null = null;
  loading = false;
  activeStage: number = 1;

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

  // SAAO Mapping Dictionary
  readonly macroTagMap: { [key: string]: { name: string; tag: string } } = {
    'BR_AnálisisDiseño': { name: 'Análisis y diseño', tag: 'BR_AnálisisDiseño' },
    'BR_Monitoreo': { name: 'Monitoreo y seguimiento', tag: 'BR_Monitoreo' },
    'BR_AdmDev': { name: 'Administración de desarrollo', tag: 'BR_AdmDev' },
    'BR_Dev': { name: 'Desarrollo sprint en curso', tag: 'BR_Dev' },
    'BR_LIB': { name: 'Liberación', tag: 'BR_LIB' }
  };

  ngOnInit(): void {
    this.loadSavedSelection();
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
      }
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

    // Save selection
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify({ iteration: this.selectedIteration }));

    // Load Sprint Data
    this.adoService.getMetrics(this.selectedIteration).subscribe({
      next: (m) => {
        this.metrics = m;
        this.loading = false;
        this.validatePeerReviewBeforeRisks();
        this.loadSavedSprintProcessData();
        this.linkPreAnalysesWithAzureItems();
      },
      error: () => {
        this.loading = false;
        this.notificationService.error('Error al cargar datos del sprint desde Azure DevOps.');
      }
    });
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

    this.metricsApiService.saveProcessData(this.selectedIteration, payload).subscribe();
    this.notificationService.success('Información guardada y sincronizada en MongoDB Atlas.');
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
        return this.saaoMacroTasks.some(m => m.tasks && m.tasks.length > 0) || this.isSpJsonParsed;
      case 8:
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

  // Stage 6: Excel File Reader for SAAO Macrotareas
  onExcelUpload(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.excelFileName = file.name;
    const reader = new FileReader();

    reader.onload = (e: ProgressEvent<FileReader>) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });

        // Search for sheet 'Tareas de gestión'
        const sheetName = workbook.SheetNames.find(s => s.toLowerCase().includes('tareas de gestión') || s.toLowerCase().includes('gestion'));

        if (!sheetName) {
          this.notificationService.error("No se encontró la pestaña 'Tareas de gestión' en el Excel.");
          return;
        }

        const sheet = workbook.Sheets[sheetName];
        const rows: any[] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        this.parseSaaoMacroTasksFromExcel(rows);
        this.notificationService.success(`Excel procesado exitosamente: ${this.saaoMacroTasks.length} Macrotareas extraídas.`);
      } catch (err) {
        this.notificationService.error('Error al leer el archivo Excel.');
      }
    };

    reader.readAsArrayBuffer(file);
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

    const macroMap = new Map<string, SaaoMacroTask>();

    for (let r = 1; r < rows.length; r++) {
      const row = rows[r];
      if (!row || row.length === 0) continue;

      // Extract title strictly from Title 2 column
      const rawTitle2 = row[title2ColIndex];
      const taskTitle = String(rawTitle2 !== undefined && rawTitle2 !== null && String(rawTitle2).trim() !== '' ? rawTitle2 : (row[2] || row[1] || '')).trim();
      
      const titleLower = taskTitle.toLowerCase();
      // Ignore header text or invalid single-word placeholders like 'task', 'riesgos' alone
      if (!taskTitle || titleLower === 'title 2' || titleLower === 'título 2' || titleLower === 'task' || titleLower === 'riesgos' || titleLower === 'titulo') continue;

      const assignedTo = String(row[assignedToColIndex] || row[4] || row[3] || '').trim().toLowerCase();
      const tagField = String(row[tagColIndex] || row[9] || row[8] || '').trim();

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
          tasks: [],
          status: 'pending'
        });
      }

      // Avoid pushing duplicate tasks
      const currentTasks = macroMap.get(uniqueKey)!.tasks;
      if (!currentTasks.includes(taskTitle)) {
        currentTasks.push(taskTitle);
      }
    }

    const result = Array.from(macroMap.values());
    if (result.length > 0) {
      this.saaoMacroTasks = result;
      // Extract collaborator names
      const collabs = Array.from(new Set(result.map(m => m.assignedTo)));
      this.saaoCollaboratorList = ['todos', ...collabs];
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
          'Presentación de Work Items',
          'Reunión evaluación de riesgos',
          'Utilizar el Modelo de Rendimiento'
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
          'Seguimiento diario de avance en Azure DevOps',
          'Revisión de métricas de calidad CMMI'
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
          'Elaboración de código y pruebas unitarias',
          'Peer Review de código'
        ],
        status: 'pending'
      }
    ];
  }

  // Get filtered Macrotareas by collaborator
  get filteredSaaoMacroTasks(): SaaoMacroTask[] {
    if (this.filterCollaborator === 'todos') return this.saaoMacroTasks;
    return this.saaoMacroTasks.filter(m => m.assignedTo.toLowerCase().includes(this.filterCollaborator.toLowerCase()));
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

    const payload = {
      type: 'CMMI5_AUTOFILL_SAAO',
      macroTitle: macroToUse.macroTitle,
      tasks: macroToUse.tasks,
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
