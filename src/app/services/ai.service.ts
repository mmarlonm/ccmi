import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ConfigService } from './config.service';
import { Observable, of, catchError, timeout } from 'rxjs';
import { map } from 'rxjs/operators';
import { CMMIMetrics } from '../models/metrics.model';

@Injectable({
  providedIn: 'root'
})
export class AIService {
  private http = inject(HttpClient);
  private configService = inject(ConfigService);

  analyzeMetrics(metrics: CMMIMetrics): Observable<string> {
    const config = this.configService.getConfig();
    if (!config || !config.ai.apiKey) return of('AI Configuration missing.');

    // Build per-item summary for the AI
    const itemSummary = (metrics.developmentRate.items || [])
      .map(i => {
        const planned = (i.tasks || []).reduce((s, t) => s + (t.originalEstimate || 0), 0);
        const actual = i.effort;
        const variance = planned > 0 ? ((actual - planned) / planned * 100).toFixed(1) : '0';
        return `  - ${i.type === 'Feature' ? 'FT' : 'US'} #${i.id} | Size: ${i.size} | Est. Original: ${planned.toFixed(1)}h | Real: ${actual.toFixed(1)}h | Var: ${variance}% | ISW: ${i.isw}`;
      })
      .join('\n');

    // Build per-ISW summary for the AI
    const iswGroups: { [key: string]: any } = {};
    (metrics.developmentRate.items || []).forEach(item => {
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

    const prompt = `
      Actúa como un Auditor de Calidad CMMI Nivel 5 del proyecto OPE20 Bepensa. Analiza estas métricas y devuelve el resultado en ESPAÑOL. 

      CONTEXTO DEL EQUIPO:
      - Todos los integrantes del equipo de desarrollo son ISW nivel MID (nivel intermedio).
      - No hay ISW SR (Senior) en el equipo. No menciones ISW SR en el análisis.
      - El equipo trabaja bajo metodología SCRUM con sprints.

      MÉTRICAS DEL SPRINT:
      1. Tasa de Desarrollo: ${metrics.developmentRate.rate.toFixed(2)} 
         (Semáforo: Verde ≤ 1.70 | Amarillo 1.71–2.00 | Rojo > 2.00)
         Esfuerzo total: ${metrics.developmentRate.totalEffort?.toFixed(1) ?? '—'} h | Size total: ${metrics.developmentRate.totalSize ?? '—'}
         
         Items del sprint:
${itemSummary}

         Resumen por ISW:
${iswSummary}

      2. Tasa de Desviación de Esfuerzo: ${(metrics.effortVariance.rate * 100).toFixed(1)}%
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

      ESTRUCTURA REQUERIDA — para CADA métrica genera EXACTAMENTE estas secciones:
      [METRICA_INICIO: Nombre]
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
        o Meta acumulada: (valor meta)
        o Resultado acumulado: (valor real + pequeño margen estimado)
        (párrafo breve sobre cómo estas acciones impulsan la madurez CMMI Nivel 5 del equipo.)
      [METRICA_FIN]

      REGLAS IMPORTANTES:
      - SÉ EXIGENTE: Como auditor CMMI5, tu objetivo es la perfección estadística. Si un ítem se desvía, señálalo aunque el promedio global sea bueno.
      - NO menciones ISW SR, no existe en este equipo. Solo ISW MID.
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

  private callOpenAI(key: string, model: string, prompt: string): Observable<string> {
    return this.http.post<any>('https://api.openai.com/v1/chat/completions', {
      model: model || 'gpt-4',
      messages: [{ role: 'user', content: prompt }]
    }, {
      headers: { Authorization: `Bearer ${key}` }
    }).pipe(
      timeout(45000),
      map(res => res?.choices?.[0]?.message?.content || 'Respuesta vacía de OpenAI'),
      catchError(err => {
        console.error('OpenAI Error/Timeout:', err);
        return of('Error al generar narrativa con OpenAI. Verifique su API Key o conexión.');
      })
    );
  }

  private callGemini(key: string, model: string, prompt: string): Observable<string> {
    const modelName = model || 'gemini-1.5-flash';
    return this.http.post<any>(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${key}`, {
      contents: [{ parts: [{ text: prompt }] }]
    }).pipe(
      timeout(45000),
      map(res => res?.candidates?.[0]?.content?.parts?.[0]?.text || 'Respuesta vacía de Gemini'),
      catchError(err => {
        console.error('Gemini Error/Timeout:', err);
        return of('Error al generar narrativa con Gemini. Verifique su API Key o conexión.');
      })
    );
  }
}
