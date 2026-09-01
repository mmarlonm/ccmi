import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ConfigService } from './config.service';
import { Observable, of, catchError, timeout, retry, timer, forkJoin } from 'rxjs';
import { map } from 'rxjs/operators';
import { CMMIMetrics } from '../models/metrics.model';

export interface GanttAiItemSummary {
  workItemId: number;
  title: string;
  plannedStart: string;
  plannedEnd: string;
  realStart: string;
  realEnd: string;
  late: boolean;
}

export interface GanttAiPersonSummary {
  person: string;
  plannedMarks: number;
  plannedItems: number;
  realAssignments: number;
  realItems: number;
}

export interface GanttAiTaskStageSummary {
  stage: string;
  plannedHours: number;
  realHours: number;
  taskCount: number;
}

export interface GanttAiTaskLayerSummary {
  matchedItemsWithTasks: number;
  totalPlannedTaskHours: number;
  totalRealTaskHours: number;
  dependencyViolations: number;
  adminTaskCount: number;
  adminPlannedHours: number;
  adminRealHours: number;
  stageBreakdown: GanttAiTaskStageSummary[];
  relatedItemTaskContext: string[];
  relatedBugTaskContext: string[];
}

export interface GanttAiInput {
  organization: string;
  project: string;
  team: string;
  sprint: string;
  baselineName: string;
  summary: {
    totalRows: number;
    matchedRows: number;
    unmatchedRows: number;
    matchedOnTime: number;
    matchedLate: number;
  };
  items: GanttAiItemSummary[];
  people: GanttAiPersonSummary[];
  taskLayer: GanttAiTaskLayerSummary;
}

@Injectable({
  providedIn: 'root'
})
export class AIService {
  private http = inject(HttpClient);
  private configService = inject(ConfigService);

  analyzeMetrics(metrics: CMMIMetrics, historicalMetrics: CMMIMetrics[] = [], metricComments: { [key: string]: string } = {}): Observable<string> {
    const config = this.configService.getConfig();
    if (!config || !config.ai.apiKey) return of('AI Configuration missing.');

    const helpers = this.buildPromptContext(metrics, historicalMetrics, metricComments);

    const prompt = `
      Actúa como un Auditor de Calidad CMMI Nivel 5 del proyecto OPE20 Bepensa. Analiza estas métricas y devuelve el resultado en ESPAÑOL. 
      ${helpers.commentsSummary}
      CONTEXTO DEL EQUIPO:
      - Todos los integrantes del equipo de desarrollo son ISW nivel MID (nivel intermedio).
      - No hay ISW SR (Senior) en el equipo. No menciones ISW SR en el análisis.
      - El equipo trabaja bajo metodología SCRUM con sprints.

      MÉTRICAS DEL SPRINT ACTUAL:
      0. Cumplimiento y Línea de Tiempo del Sprint:
      ${helpers.complianceSummary}

      1. Tasa de Desarrollo: ${metrics.developmentRate.rate.toFixed(2)} 
         (Semáforo: Verde ≤ 1.70 | Amarillo 1.71–2.00 | Rojo > 2.00)
         Esfuerzo total: ${metrics.developmentRate.totalEffort?.toFixed(1) ?? '—'} h | Size total: ${metrics.developmentRate.totalSize ?? '—'}
         
         Items del sprint:
${helpers.itemSummary}

         Resumen por ISW:
${helpers.iswSummary}

      2. Tasa de Desviación de Esfuerzo: ${Math.abs(metrics.effortVariance.rate * 100).toFixed(1)}%
         (Semáforo: Verde ≤ 15% | Amarillo 15–30% | Rojo > 30%)

      3. Tasa de Retrabajo: ${metrics.rework.rate.toFixed(1)}%
         (Semáforo: Verde ≤ 22% | Amarillo 22–30% | Rojo > 30%)
         Esfuerzo Requerimiento: ${metrics.rework.reqEffort.toFixed(1)}h | Retrabajo Total: ${metrics.rework.totalRework.toFixed(1)}h

      4. Densidad de Defectos: ${metrics.defectDensity.density.toFixed(3)}
         (Semáforo: Verde ≤ 0.18 | Amarillo 0.18–0.23 | Rojo > 0.23)

      5. Eficiencia en la Eliminación de Defectos (EED): ${metrics.defectRemovalEfficiency.rate.toFixed(2)}%
         (Semáforo: Verde ≥ 81% | Amarillo 71%–80% | Rojo < 71%)
         Total Bugs: ${metrics.defectRemovalEfficiency.totalBugs} | Closed en Tiempo: ${metrics.defectRemovalEfficiency.closedOnTime} | Closed fuera de Tiempo: ${metrics.defectRemovalEfficiency.closedLate}

      6. Porcentaje de Bugs Escapados: ${metrics.escapedBugs?.rate.toFixed(2) ?? '0.00'}%
         (Semáforo: Verde ≤ 33% | Amarillo 33%–40% | Rojo > 40%)
         Bugs Testing: ${metrics.escapedBugs?.bugsTesting ?? 0} | Bugs UAT: ${metrics.escapedBugs?.bugsUat ?? 0} | Bugs Producción: ${metrics.escapedBugs?.bugsProd ?? 0} | Total Bugs: ${metrics.escapedBugs?.totalBugs ?? 0}

      7. Porcentaje de Ejecución de Pruebas (Run Rate): ${metrics.testExecution?.rate.toFixed(2) ?? '0.00'}%
         (Semáforo: Verde ≥ 90% | Amarillo 80%–89% | Rojo < 80%)
         Total Test Points: ${metrics.testExecution?.totalTestPoints ?? 0} | Ejecutados: ${metrics.testExecution?.executed ?? 0} | Pasados a Tiempo: ${metrics.testExecution?.passedEnTiempo ?? 0} | Pasados Fuera de Tiempo: ${metrics.testExecution?.passedFueraDeTiempo ?? 0} | Fallidos: ${metrics.testExecution?.failed ?? 0} | Bloqueados: ${metrics.testExecution?.blocked ?? 0} | N/A: ${metrics.testExecution?.notApplicable ?? 0}

      8. Porcentaje de Pruebas Satisfactorias (Pass Rate): ${metrics.satisfactoryTests?.rate.toFixed(2) ?? '0.00'}%
         (Semáforo: Verde ≥ 90% | Amarillo 80%–89% | Rojo < 80%)
         Total Test Points: ${metrics.satisfactoryTests?.total ?? 0} | Pasados a Tiempo (Satisfactorios): ${metrics.satisfactoryTests?.passedEnTiempo ?? 0} | Pasados Fuera de Tiempo: ${metrics.satisfactoryTests?.passedFueraDeTiempo ?? 0} | Fallidos: ${metrics.satisfactoryTests?.failed ?? 0} | Bloqueados: ${metrics.satisfactoryTests?.blocked ?? 0} | N/A: ${metrics.satisfactoryTests?.notApplicable ?? 0}

      HISTORIAL DE SPRINTS ANTERIORES PARA CÁLCULO ACUMULADO REAL:
${helpers.historySummary}

      ESTRUCTURA REQUERIDA — para CADA métrica genera EXACTAMENTE estas secciones:
      [METRICA_INICIO: Nombre]
      (NOTA IMPORTANTE PARA LA PRIMERA MÉTRICA "Cumplimiento y Línea de Tiempo del Sprint" o "Cumplimiento": Para esta primera métrica, NO generes viñetas de metas, resultados, acciones correctivas ni análisis acumulado. En su lugar, genera únicamente un análisis de resultados muy profundo, detallado e hilado en texto libre para explicar el comportamiento temporal de las entregas y la variabilidad. Analiza OBLIGATORIAMENTE a nivel de tareas secundarias para ver por qué se desviaron las User Stories (US) o Features (FT), identificando qué tareas específicas del sprint sufrieron la mayor desviación de esfuerzo en horas (Trabajo Real vs Estimación original) y explica la causa raíz técnica/operativa basándote en la información provista. Para el resto de las métricas de la 1 a la 8, sigue obligatoriamente las secciones de abajo:)
      - Meta establecida para el periodo: (valor)
      - Resultado del periodo: (valor real con semáforo: Verde/Amarillo/Rojo)
      - Análisis de resultados: (Explica el resultado con un tono CRÍTICO y CONSTRUCTIVO. 
        Identifica áreas de mejora específicas basándote en los datos de los ítems. 
        Considera: ¿Hubo subestimación en tareas específicas? ¿La granularidad de las tareas fue suficiente? 
        ¿El esfuerzo se concentró en un solo ISW MID? 
        Incluso en resultados VERDE, busca micro-desviaciones o patrones de riesgo que podrían optimizarse.)
      - Acciones correctivas: (Define acciones concretas de mejora. 
        No te limites a "mantener", sugiere ajustes en la planeación, mentoría entre pares ISW MID, 
        o refinamiento de criterios de aceptación para reducir la incertidumbre técnica.)
      - Análisis acumulado del periodo:
        o Meta acumulada: (valor meta acumulada de la fase actual)
        o Resultado acumulado: (Calcula el valor real acumulado de toda la FASE, sumando o promediando matemáticamente los valores del SPRINT ACTUAL con los de todos los SPRINTS ANTERIORES listados en el HISTORIAL. Muestra el resultado acumulado real obtenido hasta ahora en la Fase 1.)
        (párrafo breve sobre cómo estas acciones impulsan la madurez CMMI Nivel 5 del equipo.)
      [METRICA_FIN]

      REGLAS IMPORTANTES:
      - PROHIBIDO USAR ASTERISCOS **: No incluyas nunca el símbolo ** ni formato markdown de negritas. Escribe todas las etiquetas y frases en texto directo (ejemplo: "Meta establecida para el periodo:" en lugar de "**Meta establecida para el periodo:**").
      - SÉ EXIGENTE: Como auditor CMMI5, tu objetivo es la perfección estadística. Si un ítem se desvía, señálalo aunque el promedio global sea bueno.
      - NO menciones ISW SR, no existe en este equipo. Solo ISW MID.
      - NO UTILICES NINGUNA UNIDAD COMO "/PT" O "/SP": Para la métrica "4. Densidad de Defectos", no utilices jamás ninguna unidad ni sufijo como "/PT", "/pt", "/SP" o "/sp" en los resultados o análisis. Muestra siempre los valores de las metas y resultados únicamente como números decimales directos (ej: ≤ 0.18, 0.026), omitiendo cualquier mención a PT o SP.
      - ANALIZA RESPONSABILIDADES DE TAREAS: Ten en cuenta que existe un responsable principal de la historia (ISW), pero debes identificar a las personas involucradas en las tareas secundarias (Responsable de la tarea). Por ejemplo, si la historia pertenece a Marlon pero la desviación de esfuerzo ocurrió en tareas secundarias asignadas a Yair, atribuye el análisis de esa desviación a Yair e inclúyelo en la explicación.
      - Para la métrica "2. Tasa de Desviación de Esfuerzo", el "Resultado del periodo" debe presentarse en valor absoluto (sin signo negativo, p. ej., 11.23% en lugar de -11.23%).
      - Usa nombres reales de los ISW del equipo cuando estén disponibles en la lista de items.
      - Tono profesional, analítico y enfocado en identificar brechas de proceso.
      - Devuelve solo el texto estructurado, sin introducciones ni conclusiones generales.
    `;

    if (config.ai.provider === 'openai') {
      return this.callOpenAI(config.ai.apiKey, config.ai.model, prompt);
    } else {
      return this.callGemini(config.ai.apiKey, config.ai.model, prompt);
    }
  }

  analyzeSingleMetric(metricKey: string, metrics: CMMIMetrics, historicalMetrics: CMMIMetrics[] = [], metricComments: { [key: string]: string } = {}): Observable<string> {
    const config = this.configService.getConfig();
    if (!config || !config.ai.apiKey) return of('AI Configuration missing.');

    const helpers = this.buildPromptContext(metrics, historicalMetrics, metricComments);

    let specificMetricSection = '';
    let metricTitle = '';
    let metricInstruction = '';

    switch (metricKey) {
      case 'cumplimiento':
        metricTitle = 'Cumplimiento y Línea de Tiempo del Sprint';
        specificMetricSection = `0. Cumplimiento y Línea de Tiempo del Sprint:\n${helpers.complianceSummary}`;
        metricInstruction = `
      ESTRUCTURA REQUERIDA PARA ESTA MÉTRICA ("Cumplimiento y Línea de Tiempo del Sprint" o "Cumplimiento"):
      [METRICA_INICIO: Cumplimiento y Línea de Tiempo del Sprint]
      (NO generes viñetas de metas, resultados, acciones correctivas ni análisis acumulado. En su lugar, genera únicamente un análisis de resultados muy profundo, detallado e hilado en texto libre para explicar el comportamiento temporal de las entregas y la variabilidad. Analiza OBLIGATORIAMENTE a nivel de tareas secundarias para ver por qué se desviaron las User Stories (US) o Features (FT), identificando qué tareas específicas del sprint sufrieron la mayor desviación de esfuerzo en horas (Trabajo Real vs Estimación original) y explica la causa raíz técnica/operativa basándote en la información provista.)
      [METRICA_FIN]
        `;
        break;

      case 'tasa de desarrollo':
      case 'tasaDev':
        metricTitle = '1. Tasa de Desarrollo';
        specificMetricSection = `
      1. Tasa de Desarrollo: ${metrics.developmentRate.rate.toFixed(2)} 
         (Semáforo: Verde ≤ 1.70 | Amarillo 1.71–2.00 | Rojo > 2.00)
         Esfuerzo total: ${metrics.developmentRate.totalEffort?.toFixed(1) ?? '—'} h | Size total: ${metrics.developmentRate.totalSize ?? '—'}
         
         Items del sprint:
${helpers.itemSummary}

         Resumen por ISW:
${helpers.iswSummary}
        `;
        metricInstruction = this.getStandardMetricInstruction('1. Tasa de Desarrollo');
        break;

      case 'tasa de desviación':
      case 'desviacion':
        metricTitle = '2. Tasa de Desviación de Esfuerzo';
        specificMetricSection = `
      2. Tasa de Desviación de Esfuerzo: ${Math.abs(metrics.effortVariance.rate * 100).toFixed(1)}%
         (Semáforo: Verde ≤ 15% | Amarillo 15–30% | Rojo > 30%)
         Esfuerzo Planeado: ${metrics.effortVariance.planned?.toFixed(1) ?? '—'} h | Esfuerzo Real: ${metrics.effortVariance.actual?.toFixed(1) ?? '—'} h

         Items y Tareas del Sprint:
${helpers.itemSummary}
        `;
        metricInstruction = this.getStandardMetricInstruction('2. Tasa de Desviación de Esfuerzo');
        break;

      case 'retrabajo':
      case 'tasa de retrabajo':
        metricTitle = '3. Tasa de Retrabajo';
        specificMetricSection = `
      3. Tasa de Retrabajo: ${metrics.rework.rate.toFixed(1)}%
         (Semáforo: Verde ≤ 22% | Amarillo 22–30% | Rojo > 30%)
         Esfuerzo Requerimiento: ${metrics.rework.reqEffort.toFixed(1)}h | Retrabajo Total: ${metrics.rework.totalRework.toFixed(1)}h
        `;
        metricInstruction = this.getStandardMetricInstruction('3. Tasa de Retrabajo');
        break;

      case 'densidad de defectos':
      case 'densidad':
        metricTitle = '4. Densidad de Defectos';
        specificMetricSection = `
      4. Densidad de Defectos: ${metrics.defectDensity.density.toFixed(3)}
         (Semáforo: Verde ≤ 0.18 | Amarillo 0.18–0.23 | Rojo > 0.23)
         Bugs Totales: ${metrics.defectDensity.bugs} | Size Total: ${metrics.defectDensity.size}
        `;
        metricInstruction = this.getStandardMetricInstruction('4. Densidad de Defectos');
        break;

      case 'eed':
      case 'eficiencia de eliminación de defectos':
        metricTitle = '5. Eficiencia en la Eliminación de Defectos (EED)';
        specificMetricSection = `
      5. Eficiencia en la Eliminación de Defectos (EED): ${metrics.defectRemovalEfficiency.rate.toFixed(2)}%
         (Semáforo: Verde ≥ 81% | Amarillo 71%–80% | Rojo < 71%)
         Total Bugs: ${metrics.defectRemovalEfficiency.totalBugs} | Closed en Tiempo: ${metrics.defectRemovalEfficiency.closedOnTime} | Closed fuera de Tiempo: ${metrics.defectRemovalEfficiency.closedLate}
        `;
        metricInstruction = this.getStandardMetricInstruction('5. Eficiencia en la Eliminación de Defectos (EED)');
        break;

      case 'escaped':
      case 'bugs escapados':
        metricTitle = '6. Porcentaje de Bugs Escapados';
        specificMetricSection = `
      6. Porcentaje de Bugs Escapados: ${metrics.escapedBugs?.rate.toFixed(2) ?? '0.00'}%
         (Semáforo: Verde ≤ 33% | Amarillo 33%–40% | Rojo > 40%)
         Bugs Testing: ${metrics.escapedBugs?.bugsTesting ?? 0} | Bugs UAT: ${metrics.escapedBugs?.bugsUat ?? 0} | Bugs Producción: ${metrics.escapedBugs?.bugsProd ?? 0} | Total Bugs: ${metrics.escapedBugs?.totalBugs ?? 0}
        `;
        metricInstruction = this.getStandardMetricInstruction('6. Porcentaje de Bugs Escapados');
        break;

      case 'testExecution':
      case 'ejecución de pruebas':
      case 'runRate':
        metricTitle = '7. Porcentaje de Ejecución de Pruebas (Run Rate)';
        specificMetricSection = `
      7. Porcentaje de Ejecución de Pruebas (Run Rate): ${metrics.testExecution?.rate.toFixed(2) ?? '0.00'}%
         (Semáforo: Verde ≥ 90% | Amarillo 80%–89% | Rojo < 80%)
         Total Test Points: ${metrics.testExecution?.totalTestPoints ?? 0} | Ejecutados: ${metrics.testExecution?.executed ?? 0} | Pasados a Tiempo: ${metrics.testExecution?.passedEnTiempo ?? 0} | Pasados Fuera de Tiempo: ${metrics.testExecution?.passedFueraDeTiempo ?? 0} | Fallidos: ${metrics.testExecution?.failed ?? 0} | Bloqueados: ${metrics.testExecution?.blocked ?? 0} | N/A: ${metrics.testExecution?.notApplicable ?? 0}
        `;
        metricInstruction = this.getStandardMetricInstruction('7. Porcentaje de Ejecución de Pruebas (Run Rate)');
        break;

      case 'satisfactoryTests':
      case 'pruebas satisfactorias':
      case 'passRate':
        metricTitle = '8. Porcentaje de Pruebas Satisfactorias (Pass Rate)';
        specificMetricSection = `
      8. Porcentaje de Pruebas Satisfactorias (Pass Rate): ${metrics.satisfactoryTests?.rate.toFixed(2) ?? '0.00'}%
         (Semáforo: Verde ≥ 90% | Amarillo 80%–89% | Rojo < 80%)
         Total Test Points: ${metrics.satisfactoryTests?.total ?? 0} | Pasados a Tiempo (Satisfactorios): ${metrics.satisfactoryTests?.passedEnTiempo ?? 0} | Pasados Fuera de Tiempo: ${metrics.satisfactoryTests?.passedFueraDeTiempo ?? 0} | Fallidos: ${metrics.satisfactoryTests?.failed ?? 0} | Bloqueados: ${metrics.satisfactoryTests?.blocked ?? 0} | N/A: ${metrics.satisfactoryTests?.notApplicable ?? 0}
        `;
        metricInstruction = this.getStandardMetricInstruction('8. Porcentaje de Pruebas Satisfactorias (Pass Rate)');
        break;

      default:
        return this.analyzeMetrics(metrics, historicalMetrics, metricComments);
    }

    const prompt = `
      Actúa como un Auditor de Calidad CMMI Nivel 5 del proyecto OPE20 Bepensa. Analiza ÚNICAMENTE la métrica "${metricTitle}" y devuelve el resultado en ESPAÑOL. 
      ${helpers.commentsSummary}
      CONTEXTO DEL EQUIPO:
      - Todos los integrantes del equipo de desarrollo son ISW nivel MID (nivel intermedio).
      - No hay ISW SR (Senior) en el equipo. No menciones ISW SR en el análisis.
      - El equipo trabaja bajo metodología SCRUM con sprints.

      DATOS DE LA MÉTRICA:
      ${specificMetricSection}

      HISTORIAL DE SPRINTS ANTERIORES PARA CÁLCULO ACUMULADO REAL:
      ${helpers.historySummary}

      ${metricInstruction}

      REGLAS IMPORTANTES:
      - PROHIBIDO USAR ASTERISCOS **: No incluyas nunca el símbolo ** ni formato markdown de negritas. Escribe todas las etiquetas y frases en texto directo (ejemplo: "Meta establecida para el periodo:" en lugar de "**Meta establecida para el periodo:**").
      - SÉ EXIGENTE: Como auditor CMMI5, tu objetivo es la perfección estadística.
      - NO menciones ISW SR, no existe en este equipo. Solo ISW MID.
      - NO UTILICES NINGUNA UNIDAD COMO "/PT" O "/SP": Para la métrica "4. Densidad de Defectos", no utilices jamás ninguna unidad ni sufijo como "/PT", "/pt", "/SP" o "/sp" en los resultados o análisis. Muestra siempre los valores de las metas y resultados únicamente como números decimales directos (ej: ≤ 0.18, 0.026), omitiendo cualquier mención a PT o SP.
      - ANALIZA RESPONSABILIDADES DE TAREAS: Ten en cuenta que existe un responsable principal de la historia (ISW), pero debes identificar a las personas involucradas en las tareas secundarias (Responsable de la tarea).
      - Para la métrica "2. Tasa de Desviación de Esfuerzo", el "Resultado del periodo" debe presentarse en valor absoluto (sin signo negativo, p. ej., 11.23% en lugar de -11.23%).
      - Usa nombres reales de los ISW del equipo cuando estén disponibles en la lista de items.
      - Tono profesional, analítico y enfocado en identificar brechas de proceso.
      - Devuelve SOLO el bloque de la métrica formateado con [METRICA_INICIO: ...] y [METRICA_FIN], sin introducciones ni conclusiones generales.
    `;

    if (config.ai.provider === 'openai') {
      return this.callOpenAI(config.ai.apiKey, config.ai.model, prompt);
    } else {
      return this.callGemini(config.ai.apiKey, config.ai.model, prompt);
    }
  }

  private getStandardMetricInstruction(title: string): string {
    return `
      ESTRUCTURA REQUERIDA — genera EXACTAMENTE estas secciones delimitadas:
      [METRICA_INICIO: ${title}]
      - Meta establecida para el periodo: (valor)
      - Resultado del periodo: (valor real con semáforo: Verde/Amarillo/Rojo)
      - Análisis de resultados: (Explica el resultado con un tono CRÍTICO y CONSTRUCTIVO. 
        Identifica áreas de mejora específicas basándote en los datos de los ítems. 
        Considera: ¿Hubo subestimación en tareas específicas? ¿La granularidad de las tareas fue suficiente? 
        ¿El esfuerzo se concentró en un solo ISW MID? 
        Incluso en resultados VERDE, busca micro-desviaciones o patrones de riesgo que podrían optimizarse.)
      - Acciones correctivas: (Define acciones concretas de mejora. 
        No te limites a "mantener", sugiere ajustes en la planeación, mentoría entre pares ISW MID, 
        o refinamiento de criterios de aceptación para reducir la incertidumbre técnica.)
      - Análisis acumulado del periodo:
        o Meta acumulada: (valor meta acumulada de la fase actual)
        o Resultado acumulado: (Calcula el valor real acumulado de toda la FASE, sumando o promediando matemáticamente los valores del SPRINT ACTUAL con los de todos los SPRINTS ANTERIORES listados en el HISTORIAL. Muestra el resultado acumulado real obtenido hasta ahora en la Fase 1.)
        (párrafo breve sobre cómo estas acciones impulsan la madurez CMMI Nivel 5 del equipo.)
      [METRICA_FIN]
    `;
  }

  private buildPromptContext(metrics: CMMIMetrics, historicalMetrics: CMMIMetrics[] = [], metricComments: { [key: string]: string } = {}) {
    let commentsSummary = '';
    const commentKeys = Object.keys(metricComments);
    if (commentKeys.length > 0) {
      commentsSummary = '\nCOMENTARIOS Y CONTEXTO DEL AUDITOR/SOCIOS PARA ESTE SPRINT (JUSTIFICACIONES DE NEGOCIO):\n';
      commentKeys.forEach(k => {
        if (metricComments[k]) {
          commentsSummary += `- Métrica o Sección "${k}": "${metricComments[k]}"\n`;
        }
      });
      commentsSummary += '-> REGLA: Incorpora estas notas/comentarios especiales de forma destacada en el análisis de la métrica correspondiente para dar explicación o justificar las desviaciones detectadas ante la dirección.\n\n';
    }

    const itemSummary = (metrics.developmentRate?.items || [])
      .map(i => {
        const planned = (i.tasks || []).reduce((s, t) => s + (t.originalEstimate || 0), 0);
        const actual = i.effort;
        const variance = planned > 0 ? ((actual - planned) / planned * 100).toFixed(1) : '0';
        return `  - ${i.type === 'Feature' ? 'FT' : 'US'} #${i.id} | Size: ${i.size} | Est. Original: ${planned.toFixed(1)}h | Real: ${actual.toFixed(1)}h | Var: ${variance}% | ISW: ${i.isw}`;
      })
      .join('\n');

    const iswGroups: { [key: string]: any } = {};
    (metrics.developmentRate?.items || []).forEach(item => {
      const isw = item.isw || 'Sin Asignar';
      if (!iswGroups[isw]) iswGroups[isw] = { name: isw, effort: 0, planned: 0, size: 0 };
      iswGroups[isw].effort += item.effort;
      iswGroups[isw].planned += (item.tasks || []).reduce((s: number, t: any) => s + (t.originalEstimate || 0), 0);
      iswGroups[isw].size += (item.sizeEdited !== undefined ? item.sizeEdited : item.size);
    });
    const iswSummary = Object.values(iswGroups).map((g: any) => {
      const rate = g.size > 0 ? (g.effort / g.size).toFixed(2) : 'N/A';
      const variance = g.planned > 0 ? ((g.effort - g.planned) / g.planned * 100).toFixed(1) : '0';
      return `  * ${g.name}: Tasa ${rate} | Desviación ${variance}% | Esfuerzo Real ${g.effort.toFixed(1)}h`;
    }).join('\n');

    let historySummary = 'Sin historial de sprints anteriores disponible.';
    if (historicalMetrics && historicalMetrics.length > 0) {
      historySummary = historicalMetrics.map(m => {
        return `  - ${m.iterationName || 'Sprint previo'}:
            * Tasa de Desarrollo: ${m.developmentRate.rate.toFixed(2)} (Esfuerzo: ${m.developmentRate.totalEffort.toFixed(1)}h, Size: ${m.developmentRate.totalSize})
            * Desviación Esfuerzo: ${Math.abs(m.effortVariance.rate * 100).toFixed(1)}% (Planeado: ${m.effortVariance.planned?.toFixed(1)}h, Real: ${m.effortVariance.actual?.toFixed(1)}h)
            * Tasa de Retrabajo: ${m.rework.rate.toFixed(1)}% (Req: ${m.rework.reqEffort.toFixed(1)}h, Retrabajo: ${m.rework.totalRework.toFixed(1)}h)
            * Densidad Defectos: ${m.defectDensity.density.toFixed(3)} (Bugs: ${m.defectDensity.bugs}, Size: ${m.defectDensity.size})
            * EED: ${m.defectRemovalEfficiency.rate.toFixed(2)}% (Bugs: ${m.defectRemovalEfficiency.totalBugs}, Cerrados a Tiempo: ${m.defectRemovalEfficiency.closedOnTime})
            * Bugs Escapados: ${m.escapedBugs?.rate.toFixed(2) ?? '0.00'}% (Total: ${m.escapedBugs?.totalBugs ?? 0}, Prod: ${m.escapedBugs?.bugsProd ?? 0})
            * Ejecución Pruebas (Run Rate): ${m.testExecution?.rate.toFixed(2) ?? '0.00'}% (Total: ${m.testExecution?.totalTestPoints ?? 0}, Ej: ${m.testExecution?.executed ?? 0})
            * Pruebas Satisfactorias (Pass Rate): ${m.satisfactoryTests?.rate.toFixed(2) ?? '0.00'}% (Total: ${m.satisfactoryTests?.total ?? 0}, Pasados: ${m.satisfactoryTests?.passedEnTiempo ?? 0})`;
      }).join('\n');
    }

    const items = metrics.developmentRate?.items || [];
    const endMs = metrics.endDate ? new Date(metrics.endDate).getTime() : 0;
    let onTime = 0, late = 0, open = 0, maxDays = 0;
    const lateItems: string[] = [];
    const detailedItemsList: string[] = [];
    items.forEach((item: any) => {
      const isClosed = ['Closed', 'Resolved', 'Done', 'Completed'].includes(item.status);
      const closedMs = item.closedDate ? new Date(item.closedDate).getTime() : (item.changedDate ? new Date(item.changedDate).getTime() : 0);
      let deliveryStatus = 'Abierto';
      let diffDays = 0;
      if (isClosed) {
        if (!closedMs || closedMs <= endMs) {
          onTime++;
          deliveryStatus = 'A tiempo';
        } else {
          late++;
          diffDays = Math.max(1, Math.round((closedMs - endMs) / (1000 * 60 * 60 * 24)));
          if (diffDays > maxDays) maxDays = diffDays;
          deliveryStatus = 'Fase Extendida (' + diffDays + 'd retraso)';
          lateItems.push('  - ' + (item.type === 'Feature' ? 'FT' : 'US') + ' #' + item.id + ' | ISW: ' + item.isw + ' | Cerrado: ' + (item.closedDate ? item.closedDate.substring(0, 10) : '?') + ' | ~' + diffDays + 'd tarde');
        }
      } else {
        open++;
      }
      
      const tasksInfo = (item.tasks || []).map((t: any) => {
        const devia = (t.completedWork || 0) - (t.originalEstimate || 0);
        const deviaStr = devia > 0 ? ' (Desviación: +' + devia.toFixed(1) + 'h)' : devia < 0 ? ' (Sub-ejecutada: ' + devia.toFixed(1) + 'h)' : ' (A tiempo)';
        return 'Tarea #' + t.id + ': "' + t.title + '" (Responsable: ' + (t.assignedTo || 'Sin asignar') + ', Est: ' + (t.originalEstimate || 0) + 'h, Real: ' + (t.completedWork || 0) + 'h, Estado: ' + t.status + deviaStr + ')';
      }).join('; ');
      detailedItemsList.push('  * [' + (item.type === 'Feature' ? 'FT' : 'US') + ' #' + item.id + '] "' + item.title + '" - ISW: ' + item.isw + ' | Estado: ' + item.status + ' | Entrega: ' + deliveryStatus + ' | Size: ' + item.size + ' | Tareas: [' + tasksInfo + ']');
    });

    const eedBugs = metrics.defectRemovalEfficiency?.bugsList || [];
    const escapedBugs = metrics.escapedBugs?.bugsList || [];
    const uniqueBugsMap = new Map<number, any>();
    [...eedBugs, ...escapedBugs].forEach((b: any) => {
      uniqueBugsMap.set(b.bugId || b.id, b);
    });
    const bugsDetail = Array.from(uniqueBugsMap.values()).map((b: any) => {
      return '  * [Bug #' + (b.bugId || b.id) + '] "' + b.title + '" - ISW: ' + (b.isw || 'Sin asignar') + ' | Estado: ' + b.status + ' | Clasificación: ' + (b.classification || 'N/A') + '';
    }).join('\n');

    const total = onTime + late;
    const pct = total > 0 ? ((onTime / total) * 100).toFixed(0) : '—';
    const complianceSummary = '         Total entregables: ' + items.length + ' | A tiempo: ' + onTime + ' | En Fase Extendida: ' + late + ' | Abiertos: ' + open + '\n         % Cumplimiento: ' + pct + '% | Máx. días de retraso: ' + maxDays + 'd\n         Detalle de Deliverables (Historias de Usuario / Features) y sus Tareas:\n' + detailedItemsList.join('\n') + '\n         Detalle de Todos los Bugs de la Iteración:\n' + (bugsDetail || 'Sin bugs detectados en este periodo.');

    return {
      commentsSummary,
      itemSummary,
      iswSummary,
      historySummary,
      complianceSummary
    };
  }

  generateCompletionReport(metrics: CMMIMetrics): Observable<string> {
    const config = this.configService.getConfig();
    if (!config || !config.ai.apiKey) return of('AI Configuration missing.');

    const itemsList: string[] = [];
    let calcPlanned = 0;
    let calcActual = 0;

    (metrics.developmentRate.items || []).forEach(i => {
      const devTasks = (i.tasks || []).filter(t => {
        const title = (t.title || '').toLowerCase();

        return title.includes('01.01') ||
          title.includes('01.03') ||
          title.includes('01.04') ||
          title.includes('01.05');
      });
      const p = devTasks.reduce((s, t) => s + (t.originalEstimate || 0), 0);
      const a = devTasks.reduce((s, t) => s + (t.completedWork || 0), 0);

      itemsList.push(`${i.type === 'Feature' ? 'FT' : 'US'} | ${i.id} | ${p.toFixed(2)} | ${a.toFixed(2)}`);
      calcPlanned += p;
      calcActual += a;
    });

    const items = itemsList.join('\n');
    const totalPlanned = calcPlanned;
    const totalActual = calcActual;
    const diff = (totalPlanned - totalActual).toFixed(2);
    const deviation = totalPlanned > 0 ? ((totalPlanned - totalActual) / totalPlanned * 100).toFixed(2) : '0.00';
    const iteration = metrics.iterationName || 'Sprint X';

    const prompt = `
      Actúa como el Responsable de Calidad y Planeación. Genera un REPORTE DE FINALIZACIÓN DE CONSTRUCCIÓN para el correo de David.
      El formato debe ser EXACTAMENTE el siguiente, llenando los datos con la información proporcionada:

      Buen día David,

      de acuerdo al proceso te envío el reporte de finalización de construcción del sprint ${iteration}

      Tipo | Item | Tiempo planeado | Tiempo completado
      --- | --- | --- | ---
      ${items}
      Total | | ${totalPlanned.toFixed(2)} | ${totalActual.toFixed(2)}

      La construcción de las historias de usuario finalizó con una diferencia de ${Math.abs(parseFloat(diff))} horas ${parseFloat(diff) > 0 ? 'menos' : 'más'}, lo que representa una desviación del ${Math.abs(parseFloat(deviation))}% respecto al tiempo planeado. 
      [Añade aquí 2 o 3 oraciones justificando la desviación basándote en los ítems analizados. Menciona los IDs específicos de US/FT que se excedieron del tiempo planeado como causa de la desviación, y menciona si hubo bugs. Sé analítico y profesional.]

      Adjunto la gráfica del sprint burndown. Sin embargo, aún quedan tareas administrativas que no se han cerrado.

      REGLAS:
      - Idioma: Español.
      - Mantén el formato de la tabla en Markdown para que se vea claramente.
      - La justificación debe ser coherente con los datos (ej: si la US 46900 tiene más horas reales que planeadas, menciónala como causa).
    `;

    if (config.ai.provider === 'openai') {
      return this.callOpenAI(config.ai.apiKey, config.ai.model, prompt);
    } else {
      return this.callGemini(config.ai.apiKey, config.ai.model, prompt);
    }
  }

  analyzeGanttComparison(input: GanttAiInput): Observable<string> {
    const config = this.configService.getConfig();
    if (!config || !config.ai.apiKey) return of('AI Configuration missing.');

    const topLateItems = input.items
      .filter(item => item.late)
      .slice(0, 20)
      .map(item => `- #${item.workItemId}: Planeado ${item.plannedStart}→${item.plannedEnd} | Real ${item.realStart || 'N/A'}→${item.realEnd || 'N/A'}`)
      .join('\n');

    const representativeItems = input.items
      .slice(0, 30)
      .map(item => `- #${item.workItemId} | Planeado ${item.plannedStart}→${item.plannedEnd} | Real ${item.realStart || 'N/A'}→${item.realEnd || 'N/A'} | ${item.late ? 'Atrasado' : 'En tiempo'}`)
      .join('\n');

    const peopleSummary = input.people
      .slice(0, 30)
      .map(person => `- ${person.person}: Planeado marcas=${person.plannedMarks}, Planeado items=${person.plannedItems}, Real asignaciones=${person.realAssignments}, Real items=${person.realItems}`)
      .join('\n');

    const taskStageSummary = input.taskLayer.stageBreakdown
      .slice(0, 20)
      .map(stage => `- ${stage.stage}: tareas=${stage.taskCount}, planeado=${stage.plannedHours.toFixed(1)}h, real=${stage.realHours.toFixed(1)}h`)
      .join('\n');

    const relatedItemTaskSummary = input.taskLayer.relatedItemTaskContext
      .slice(0, 40)
      .join('\n');

    const relatedBugTaskSummary = input.taskLayer.relatedBugTaskContext
      .slice(0, 40)
      .join('\n');

    const prompt = `
Actúa como un analista senior de gestión de sprints en un contexto CMMI.
Tu tarea es analizar la comparación REAL vs PLANEADO (Excel timeline) y redactar un análisis ejecutivo en ESPAÑOL.

CONTEXTO
- Organización: ${input.organization || 'N/A'}
- Proyecto: ${input.project || 'N/A'}
- Team: ${input.team || 'N/A'}
- Sprint: ${input.sprint || 'N/A'}
- Baseline: ${input.baselineName || 'N/A'}

CONSIDERACIONES DE GRANULARIDAD (MUY IMPORTANTE)
- El Excel de planeación NO incluye el desglose completo de tareas técnicas por work item; representa una planeación resumida por duración/marcas.
- Azure DevOps SÍ incluye mayor detalle operativo (tareas, reasignaciones y movimientos durante el sprint).
- Por lo anterior, NO debes interpretar como desviación negativa automática que en ADO exista mayor cantidad de asignaciones o mayor detalle que en Excel.
- La comparación por persona debe usarse para detectar concentración, cambios de carga o riesgos de coordinación, no para penalizar diferencias de granularidad del desglose.

RESUMEN GENERAL
- Filas Excel: ${input.summary.totalRows}
- Match con ADO: ${input.summary.matchedRows}
- Sin match: ${input.summary.unmatchedRows}
- En tiempo: ${input.summary.matchedOnTime}
- Atrasadas: ${input.summary.matchedLate}

ITEMS REPRESENTATIVOS
${representativeItems || '- Sin datos de ítems'}

TOP ITEMS ATRASADOS
${topLateItems || '- Sin atrasos detectados'}

COMPARACIÓN POR PERSONA
${peopleSummary || '- Sin datos por persona'}

CAPA DE TAREAS (ADO) PARA ITEMS CON MATCH
- Items con tareas: ${input.taskLayer.matchedItemsWithTasks}
- Horas planeadas (tareas): ${input.taskLayer.totalPlannedTaskHours.toFixed(1)}h
- Horas reales (tareas): ${input.taskLayer.totalRealTaskHours.toFixed(1)}h
- Posibles violaciones de dependencia temporal: ${input.taskLayer.dependencyViolations}
- Tareas administrativas: ${input.taskLayer.adminTaskCount} (Plan=${input.taskLayer.adminPlannedHours.toFixed(1)}h, Real=${input.taskLayer.adminRealHours.toFixed(1)}h)

DESGLOSE POR ETAPA (TAREAS)
${taskStageSummary || '- Sin desglose por etapa'}

CONTEXTO AMPLIADO POR ITEM PADRE (TAREAS RELACIONADAS)
${relatedItemTaskSummary || '- Sin tareas adicionales relacionadas por padre'}

BUGS RELACIONADOS Y SUS TAREAS HIJAS
${relatedBugTaskSummary || '- Sin bugs/tareas hijas relacionadas'}

ENTREGABLE REQUERIDO (texto único, no tablas):
1) Paso 1 (obligatorio): Diagnóstico general de cumplimiento por ITEM (cierre vs planeado Excel).
2) Paso 2 (obligatorio): Análisis por TAREAS ADO para explicar causas (plan vs real), respetando dependencias.
3) Riesgos operativos detectados (fechas, dependencias y distribución por persona).
4) Acciones concretas para el siguiente sprint (máximo 6 bullets).
5) Cierre ejecutivo con prioridad de atención (alta/media/baja).

REGLAS
- No inventes datos no presentes.
- Sé directo, profesional y accionable.
- Si faltan datos, dilo explícitamente y sugiere cómo capturarlos.
- Prohibido concluir “mala planeación” solo porque Real (ADO) tenga más tareas/asignaciones que Planeado (Excel); primero explica la diferencia de nivel de detalle entre fuentes.
- Si detectas diferencias de volumen entre Planeado y Real, trátalas como hipótesis de desagregación operativa y evalúa impacto real en fechas/cierres, no como incumplimiento por sí mismo.
- Debes incorporar explícitamente en el diagnóstico las tareas relacionadas del mismo item padre y los bugs asociados con sus tareas hijas para no perder contexto operacional.
- Restricciones de proceso a respetar en tu interpretación:
  a) Solo un desarrollador codifica un item (bug/feature/user story) a la vez.
  b) Peer review depende de codificación.
  c) Pruebas ISW dependen de peer review.
  d) Ejecución de pruebas depende de pruebas ISW.
  e) Existen tareas administrativas al inicio, durante y cierre de sprint que pueden impactar capacidad.
`;

    if (config.ai.provider === 'openai') {
      return this.callOpenAI(config.ai.apiKey, config.ai.model, prompt);
    }
    return this.callGemini(config.ai.apiKey, config.ai.model, prompt);
  }

  askAboutMetrics(metrics: CMMIMetrics, question: string, chatHistory: Array<{ role: 'user' | 'assistant', content: string }>): Observable<string> {
    const config = this.configService.getConfig();
    if (!config || !config.ai.apiKey) return of('Configuración de IA no encontrada. Por favor configure su API Key en la pantalla de Configuración.');

    // Build the metrics summary context
    let contextStr = `INFORMACIÓN DEL SPRINT ACTUAL:\n`;
    contextStr += `- Iteración/Sprint: ${metrics.iterationName || 'No especificada'}\n`;
    if (metrics.startDate && metrics.endDate) {
      contextStr += `- Periodo: ${metrics.startDate} a ${metrics.endDate}\n`;
    }

    // 1. Tasa de desarrollo
    contextStr += `\n1. TASA DE DESARROLLO:\n`;
    contextStr += `- Valor: ${metrics.developmentRate.rate.toFixed(2)} (Semáforo: ${metrics.developmentRate.status})\n`;
    contextStr += `- Esfuerzo Real Total: ${metrics.developmentRate.totalEffort?.toFixed(1) ?? 0}h\n`;
    contextStr += `- Puntos de Historia (Size) Total: ${metrics.developmentRate.totalSize ?? 0}\n`;
    contextStr += `- Cantidad de Items: ${metrics.developmentRate.totalItems ?? 0}\n`;
    if (metrics.developmentRate.items && metrics.developmentRate.items.length > 0) {
      contextStr += `Items de Trabajo:\n`;
      metrics.developmentRate.items.forEach(i => {
        const est = (i.tasks || []).reduce((s, t) => s + (t.originalEstimate || 0), 0);
        contextStr += `  * [${i.type === 'Feature' ? 'FT' : 'US'} #${i.id}] ${i.title} - ISW: ${i.isw} | Estado: ${i.status} | Estimado: ${est.toFixed(1)}h | Real: ${i.effort.toFixed(1)}h | Size: ${i.size}\n`;
      });
    }

    // 2. Desviación de Esfuerzo
    contextStr += `\n2. DESVIACIÓN DE ESFUERZO:\n`;
    contextStr += `- Tasa Desviación: ${(metrics.effortVariance.rate * 100).toFixed(1)}% (Semáforo: ${metrics.effortVariance.status})\n`;
    contextStr += `- Esfuerzo Planeado: ${metrics.effortVariance.planned?.toFixed(1) ?? 0}h\n`;
    contextStr += `- Esfuerzo Real: ${metrics.effortVariance.actual?.toFixed(1) ?? 0}h\n`;

    // 3. Retrabajo
    contextStr += `\n3. TASA DE RETRABAJO:\n`;
    contextStr += `- Tasa Retrabajo: ${metrics.rework.rate.toFixed(1)}% (Semáforo: ${metrics.rework.status})\n`;
    contextStr += `- Esfuerzo Requerimientos: ${metrics.rework.reqEffort?.toFixed(1) ?? 0}h\n`;
    contextStr += `- Retrabajo Total: ${metrics.rework.totalRework?.toFixed(1) ?? 0}h\n`;

    // 4. Densidad de Defectos
    contextStr += `\n4. DENSIDAD DE DEFECTOS:\n`;
    contextStr += `- Densidad: ${metrics.defectDensity.density.toFixed(3)} (Semáforo: ${metrics.defectDensity.status})\n`;
    contextStr += `- Bugs Totales: ${metrics.defectDensity.bugs ?? 0}\n`;
    contextStr += `- Size Total: ${metrics.defectDensity.size ?? 0}\n`;

    // 5. EED
    contextStr += `\n5. EFICIENCIA EN ELIMINACIÓN DE DEFECTOS (EED):\n`;
    contextStr += `- Eficiencia: ${metrics.defectRemovalEfficiency.rate.toFixed(2)}% (Semáforo: ${metrics.defectRemovalEfficiency.status})\n`;
    contextStr += `- Bugs Cerrados a Tiempo: ${metrics.defectRemovalEfficiency.closedOnTime ?? 0}\n`;
    contextStr += `- Bugs Cerrados Fuera de Tiempo: ${metrics.defectRemovalEfficiency.closedLate ?? 0}\n`;
    if (metrics.defectRemovalEfficiency.bugsList && metrics.defectRemovalEfficiency.bugsList.length > 0) {
      contextStr += `Lista de Bugs EED:\n`;
      metrics.defectRemovalEfficiency.bugsList.forEach(b => {
        contextStr += `  * [Bug #${b.bugId}] ${b.title} - Asignado: ${b.isw || 'Sin asignar'} | Estado: ${b.status} | Alineación: ${b.alignment} | Clasificación: ${b.classification || 'N/A'}\n`;
      });
    }

    // 6. Bugs Escapados
    const escapedBugs = metrics.escapedBugs;
    if (escapedBugs) {
      contextStr += `\n6. BUGS ESCAPADOS:\n`;
      contextStr += `- Tasa Escape: ${escapedBugs.rate.toFixed(2)}% (Semáforo: ${escapedBugs.status})\n`;
      contextStr += `- Bugs Testing: ${escapedBugs.bugsTesting ?? 0}\n`;
      contextStr += `- Bugs UAT: ${escapedBugs.bugsUat ?? 0}\n`;
      contextStr += `- Bugs Producción: ${escapedBugs.bugsProd ?? 0}\n`;
      if (escapedBugs.bugsList && escapedBugs.bugsList.length > 0) {
        contextStr += `Lista de Bugs Escapados:\n`;
        escapedBugs.bugsList.forEach(b => {
          contextStr += `  * [Bug #${b.bugId}] ${b.title} - Asignado: ${b.isw || 'Sin asignar'} | Estado: ${b.status} | Clasificación: ${b.classification}\n`;
        });
      }
    }

    // 7. Ejecución de Pruebas
    const testExecution = metrics.testExecution;
    if (testExecution) {
      contextStr += `\n7. EJECUCIÓN DE PRUEBAS:\n`;
      contextStr += `- Tasa Ejecución: ${testExecution.rate.toFixed(2)}% (Semáforo: ${testExecution.status})\n`;
      contextStr += `- Total Test Points: ${testExecution.totalTestPoints ?? 0}\n`;
      contextStr += `- Ejecutados: ${testExecution.executed ?? 0}\n`;
      contextStr += `- Pasados a Tiempo: ${testExecution.passedEnTiempo ?? 0}\n`;
      contextStr += `- Pasados Fuera de Tiempo: ${testExecution.passedFueraDeTiempo ?? 0}\n`;
      contextStr += `- Fallidos: ${testExecution.failed ?? 0}\n`;
      contextStr += `- Bloqueados: ${testExecution.blocked ?? 0}\n`;
      if (testExecution.testPoints && testExecution.testPoints.length > 0) {
        contextStr += `Detalle de Puntos de Prueba:\n`;
        testExecution.testPoints.forEach(tp => {
          contextStr += `  * [Plan: ${tp.planName}] Suite: ${tp.suiteName} | Test Case: [#${tp.testCaseId}] ${tp.testCaseTitle} - Probador: ${tp.tester} | Resultado: ${tp.outcome} | En Tiempo: ${tp.onTime ? 'Sí' : 'No'}\n`;
        });
      }
    }

    // 8. Pruebas Satisfactorias
    const satisfactoryTests = metrics.satisfactoryTests;
    if (satisfactoryTests) {
      contextStr += `\n8. PORCENTAJE DE PRUEBAS SATISFACTORIAS (KPI Pass Rate):\n`;
      contextStr += `- Tasa Pruebas Satisfactorias (Pass Rate): ${satisfactoryTests.rate.toFixed(2)}% (Semáforo: ${satisfactoryTests.status})\n`;
      contextStr += `- Total Test Points: ${satisfactoryTests.total ?? 0}\n`;
      contextStr += `- Pasados a Tiempo (Satisfactorios): ${satisfactoryTests.passedEnTiempo ?? 0}\n`;
      contextStr += `- Pasados Fuera de Tiempo: ${satisfactoryTests.passedFueraDeTiempo ?? 0}\n`;
      contextStr += `- Fallidos: ${satisfactoryTests.failed ?? 0}\n`;
      contextStr += `- Bloqueados: ${satisfactoryTests.blocked ?? 0}\n`;
      contextStr += `- N/A: ${satisfactoryTests.notApplicable ?? 0}\n`;
    }

    // Build chat history into the prompt
    let chatHistoryStr = '';
    if (chatHistory && chatHistory.length > 0) {
      chatHistoryStr = `HISTORIAL DE LA CONVERSACIÓN:\n`;
      chatHistory.forEach(msg => {
        chatHistoryStr += `${msg.role === 'user' ? 'Usuario' : 'Asistente'}: ${msg.content}\n`;
      });
    }

    const askPrompt = `
      Actúa como un Asistente Virtual Experto en Métricas CMMI Nivel 5 para el proyecto OPE20 Bepensa.
      Tu objetivo es responder de manera clara, concisa y precisa a las preguntas del usuario sobre los datos y métricas que se muestran en el dashboard actual.

      ${contextStr}

      ${chatHistoryStr}

      PREGUNTA DEL USUARIO:
      ${question}

      REGLAS PARA RESPONDER:
      1. Responde en ESPAÑOL.
      2. Sé preciso e infórmate de los datos proporcionados arriba. Si te preguntan por un ítem específico, un ISW específico, un bug o una métrica en particular, busca en los datos provistos y da detalles específicos (IDs, horas, porcentajes, nombres).
      3. Mantén un tono profesional, analítico y constructivo, pero amigable.
      4. Si la pregunta no tiene relación con las métricas o no se puede responder con la información proporcionada, indícalo amablemente y ofrece ayuda sobre lo que sí puedes responder basándote en los datos.
      5. Puedes estructurar tu respuesta con viñetas o tablas markdown sencillas para mejorar la legibilidad.
    `;

    if (config.ai.provider === 'openai') {
      return this.callOpenAI(config.ai.apiKey, config.ai.model, askPrompt);
    } else {
      return this.callGemini(config.ai.apiKey, config.ai.model, askPrompt);
    }
  }

  private callOpenAI(key: string, model: string, prompt: string): Observable<string> {
    return this.http.post<any>('https://api.openai.com/v1/chat/completions', {
      model: model || 'gpt-4',
      messages: [{ role: 'user', content: prompt }]
    }, {
      headers: { Authorization: `Bearer ${key}` }
    }).pipe(
      timeout(140000),
      retry({ count: 1, delay: 2000 }),
      map(res => res?.choices?.[0]?.message?.content || 'Respuesta vacía de OpenAI'),
      catchError(err => {
        console.error('OpenAI Error/Timeout:', err);
        const isTimeout = err?.name === 'TimeoutError' || err?.message?.includes('timeout');
        const isAuth = err?.status === 401 || err?.status === 403;
        if (isTimeout) return of('El análisis tardó demasiado (>90s). Intenta de nuevo; el servidor de IA puede estar ocupado.');
        if (isAuth) return of('API Key de OpenAI inválida o sin permisos. Verifica la clave en Configuración.');
        return of(`Error al contactar OpenAI (${err?.status ?? 'sin conexión'}). Intenta de nuevo.`);
      })
    );
  }

  private callGemini(key: string, model: string, prompt: string): Observable<string> {
    const cleanModel = (model || 'gemini-1.5-flash').trim();
    let modelName = cleanModel;
    if (cleanModel.startsWith('models/')) {
      modelName = cleanModel.replace('models/', '');
    }

    return this.http.post<any>(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${key}`, {
      contents: [{ parts: [{ text: prompt }] }]
    }).pipe(
      timeout(90000),
      retry({
        count: 3,
        delay: (error, retryCount) => {
          if (error?.status === 429) {
            let delayMs = (retryCount + 1) * 4000;
            const details = error?.error?.error?.details;
            if (Array.isArray(details)) {
              const retryInfo = details.find((d: any) => d?.['@type']?.includes('RetryInfo') || d?.retryDelay);
              if (retryInfo?.retryDelay) {
                const sec = parseInt(retryInfo.retryDelay.replace('s', ''), 10);
                if (!isNaN(sec) && sec > 0) delayMs = (sec + 2) * 1000;
              }
            }
            console.warn(`Gemini 429 Rate Limit en ${modelName}. Esperando ${delayMs / 1000}s para reintentar (Intento ${retryCount}/3)...`);
            return timer(delayMs);
          }
          return timer(2000);
        }
      }),
      map(res => res?.candidates?.[0]?.content?.parts?.[0]?.text || 'Respuesta vacía de Gemini'),
      catchError(err => {
        console.error('Gemini Error/Timeout:', err);
        const isTimeout = err?.name === 'TimeoutError' || err?.message?.includes('timeout');
        const isAuth = err?.status === 400 || err?.status === 401 || err?.status === 403;
        const isQuota = err?.status === 429;
        if (isQuota) {
          const rawMsg = JSON.stringify(err?.error || '');
          if (rawMsg.includes('GenerateRequestsPerDayPerProjectPerModel-FreeTier') || rawMsg.includes('limit: 20')) {
            return of(`Cuota diaria del modelo "${modelName}" agotada en la capa gratuita de Google (Límite: 20 peticiones/día). Por favor cambia el modelo a "gemini-3.6-flash" o "gemini-1.5-flash" en el menú Configuración.`);
          }
          return of(`Cuota/Límite de Gemini agotado (Error 429: Too Many Requests en ${modelName}). Espera unos segundos o cambia el modelo a "gemini-3.6-flash" o "gemini-1.5-flash" en Configuración.`);
        }
        if (err?.status === 404 || JSON.stringify(err?.error || '').includes('no longer available')) {
          return of(`El modelo "${modelName}" ya no está disponible en Google Gemini. Por favor cámbialo a "gemini-3.6-flash" o "gemini-1.5-flash" en el menú Configuración.`);
        }
        if (isTimeout) return of('El análisis tardó demasiado (>90s). Intenta de nuevo; Gemini puede estar ocupado.');
        if (isAuth) return of(`Error en Gemini (${err?.error?.error?.message || 'API Key o Modelo no válido'}). Verifica la clave y modelo en Configuración.`);
        return of(`Error al contactar Gemini (${err?.status ?? 'sin conexión'}). Intenta de nuevo.`);
      })
    );
  }
}
