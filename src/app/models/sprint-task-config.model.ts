/**
 * Sprint Task Preconfiguration Models
 * Módulo: Configurar Sprint
 */

export type TaskSection = 'dev' | 'testing' | 'otras';
export type SizeSource = 'field' | 'discussion' | 'none';

/** Tabla de horas por SIZE */
export const SIZE_HOURS_TABLE: Record<number, { dev: number; testing: number; otras: number }> = {
  1:  { dev: 4,   testing: 2,  otras: 1 },
  2:  { dev: 8,   testing: 4,  otras: 2 },
  3:  { dev: 12,  testing: 6,  otras: 3 },
  5:  { dev: 20,  testing: 10, otras: 5 },
  8:  { dev: 32,  testing: 16, otras: 8 },
  13: { dev: 52,  testing: 26, otras: 13 },
  20: { dev: 80,  testing: 40, otras: 20 },
  40: { dev: 160, testing: 80, otras: 40 },
};

/** Distribución DEV por porcentaje */
export const DEV_DISTRIBUTION: Record<string, number> = {
  'Elaboración de código':                     0.80,
  'Review':                                    0.05,
  'Peer Review':                               0.05,
  'Pruebas funcionales ISW':                   0.10,
  'Corrección de defectos de Peer Review':     0,  // opcional, no tiene distribución fija
  'Corrección de defectos de pruebas ISW':     0,  // opcional, no tiene distribución fija
};

/** Definición de cada tarea del sistema */
export interface TaskDefinition {
  taskCode: string;      // ej. "01.01"
  name: string;          // ej. "Elaboración de código"
  section: TaskSection;
  defaultPct?: number;   // Porcentaje del total de la sección (DEV)
  isOptional: boolean;   // Si puede deseleccionarse
}

export const TASK_DEFINITIONS: TaskDefinition[] = [
  // --- DEV ---
  { taskCode: '01.01', name: 'Elaboración de código',             section: 'dev',     defaultPct: 0.80, isOptional: false },
  { taskCode: '01.03', name: 'Review',                            section: 'dev',     defaultPct: 0.05, isOptional: true },
  { taskCode: '01.04', name: 'Peer Review',                       section: 'dev',     defaultPct: 0.05, isOptional: true },
  { taskCode: '01.05', name: 'Pruebas funcionales ISW',           section: 'dev',     defaultPct: 0.10, isOptional: false },
  { taskCode: '01.07', name: 'Corrección de defectos de Peer Review',   section: 'dev', defaultPct: 0, isOptional: true },
  { taskCode: '01.07', name: 'Corrección de defectos de pruebas ISW',   section: 'dev', defaultPct: 0, isOptional: true },

  // --- TESTING ---
  { taskCode: '01',    name: 'Diseño de pruebas',                 section: 'testing', defaultPct: 0.20, isOptional: false },
  { taskCode: '02',    name: 'Ejecución de pruebas',              section: 'testing', defaultPct: 0.20, isOptional: false },
  { taskCode: '03',    name: 'Registro de defectos',              section: 'testing', defaultPct: 0.20, isOptional: false },
  { taskCode: '04',    name: 'Peer Review de especificación',     section: 'testing', defaultPct: 0.20, isOptional: true },
  { taskCode: '04',    name: 'Peer Review Test y especificación', section: 'testing', defaultPct: 0.20, isOptional: true },

  // --- OTRAS ---
  { taskCode: '01.00', name: 'Análisis',                          section: 'otras',   defaultPct: 0.34, isOptional: true },
  { taskCode: '01.00', name: 'Integración UAT',                   section: 'otras',   defaultPct: 0.33, isOptional: true },
  { taskCode: '01.00', name: 'Documentación y videos capacitación', section: 'otras', defaultPct: 0.33, isOptional: true },
];

/** Item de tarea dentro del borrador */
export interface DraftTaskItem {
  taskCode: string;
  name: string;
  section: TaskSection;
  selected: boolean;
  hours: number;
  assignedTo: string;   // email o displayName del usuario
}

/** Configuración de un Work Item (US o FT) dentro del borrador */
export interface WorkItemDraftConfig {
  workItemId: number;
  workItemType: string;
  title: string;
  size: number;
  sizeSource: SizeSource;
  iterationPath: string;
  areaPath: string;
  /** Usuarios asignados por sección */
  devAssignedTo: string;
  testingAssignedTo: string;
  otrasAssignedTo: string;
  /** Tareas preconfiguradas */
  tasks: DraftTaskItem[];
  /** Estado de importación */
  imported: boolean;
  importedTaskIds?: number[];
}

/** Borrador completo del sprint */
export interface SprintTaskDraft {
  sprintId: string;
  sprintName: string;
  iterationPath: string;
  /** Lista de usuarios detectados del sprint */
  sprintUsers: string[];
  /** Configuración por cada US/FT */
  items: WorkItemDraftConfig[];
  /** Estado general */
  status: 'draft' | 'partial' | 'imported';
  lastSaved: string; // ISO date string
}

/** Resultado de importación a Azure */
export interface ImportResult {
  workItemId: number;
  success: boolean;
  createdTaskIds: number[];
  errors: string[];
}
