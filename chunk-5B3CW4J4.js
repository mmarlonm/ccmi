import{a as M}from"./chunk-EYHTWIUQ.js";import{D as h,L as O,R as C,dc as N,i as m,m as v,n as x,v as P}from"./chunk-TJU5QLH6.js";var k=class I{http=C(N);configService=C(M);analyzeMetrics(e,i=[]){let l=this.configService.getConfig();if(!l||!l.ai.apiKey)return m("AI Configuration missing.");let r=(e.developmentRate.items||[]).map(t=>{let o=(t.tasks||[]).reduce((f,E)=>f+(E.originalEstimate||0),0),s=t.effort,p=o>0?((s-o)/o*100).toFixed(1):"0";return`  - ${t.type==="Feature"?"FT":"US"} #${t.id} | Size: ${t.size} | Est. Original: ${o.toFixed(1)}h | Real: ${s.toFixed(1)}h | Var: ${p}% | ISW: ${t.isw}`}).join(`
`),a={};(e.developmentRate.items||[]).forEach(t=>{let o=t.isw||"Sin Asignar";a[o]||(a[o]={name:o,effort:0,planned:0,size:0}),a[o].effort+=t.effort,a[o].planned+=(t.tasks||[]).reduce((s,p)=>s+(p.originalEstimate||0),0),a[o].size+=t.sizeEdited!==void 0?t.sizeEdited:t.size});let u=Object.values(a).map(t=>{let o=t.size>0?(t.effort/t.size).toFixed(2):"N/A",s=t.planned>0?((t.effort-t.planned)/t.planned*100).toFixed(1):"0";return`  * ${t.name}: Tasa ${o} | Desviaci\xF3n ${s}% | Esfuerzo Real ${t.effort.toFixed(1)}h`}).join(`
`),d="Sin historial de sprints anteriores disponible.";i&&i.length>0&&(d=i.map(t=>`  - ${t.iterationName||"Sprint previo"}:
            * Tasa de Desarrollo: ${t.developmentRate.rate.toFixed(2)} (Esfuerzo: ${t.developmentRate.totalEffort.toFixed(1)}h, Size: ${t.developmentRate.totalSize})
            * Desviaci\xF3n Esfuerzo: ${Math.abs(t.effortVariance.rate*100).toFixed(1)}% (Planeado: ${t.effortVariance.planned?.toFixed(1)}h, Real: ${t.effortVariance.actual?.toFixed(1)}h)
            * Tasa de Retrabajo: ${t.rework.rate.toFixed(1)}% (Req: ${t.rework.reqEffort.toFixed(1)}h, Retrabajo: ${t.rework.totalRework.toFixed(1)}h)
            * Densidad Defectos: ${t.defectDensity.density.toFixed(3)} (Bugs: ${t.defectDensity.bugs}, Size: ${t.defectDensity.size})
            * EED: ${t.defectRemovalEfficiency.rate.toFixed(2)}% (Bugs: ${t.defectRemovalEfficiency.totalBugs}, Cerrados a Tiempo: ${t.defectRemovalEfficiency.closedOnTime})
            * Bugs Escapados: ${t.escapedBugs?.rate.toFixed(2)??"0.00"}% (Total: ${t.escapedBugs?.totalBugs??0}, Prod: ${t.escapedBugs?.bugsProd??0})
            * Ejecuci\xF3n Pruebas (Run Rate): ${t.testExecution?.rate.toFixed(2)??"0.00"}% (Total: ${t.testExecution?.totalTestPoints??0}, Ej: ${t.testExecution?.executed??0})
            * Pruebas Satisfactorias (Pass Rate): ${t.satisfactoryTests?.rate.toFixed(2)??"0.00"}% (Total: ${t.satisfactoryTests?.total??0}, Pasados: ${t.satisfactoryTests?.passedEnTiempo??0})`).join(`
`));let c=`
      Act\xFAa como un Auditor de Calidad CMMI Nivel 5 del proyecto OPE20 Bepensa. Analiza estas m\xE9tricas y devuelve el resultado en ESPA\xD1OL. 

      CONTEXTO DEL EQUIPO:
      - Todos los integrantes del equipo de desarrollo son ISW nivel MID (nivel intermedio).
      - No hay ISW SR (Senior) en el equipo. No menciones ISW SR en el an\xE1lisis.
      - El equipo trabaja bajo metodolog\xEDa SCRUM con sprints.

      M\xC9TRICAS DEL SPRINT ACTUAL:
      0. Cumplimiento y L\xEDnea de Tiempo del Sprint:
      ${(()=>{let t=e.developmentRate?.items||[],o=e.endDate?new Date(e.endDate).getTime():0,s=0,p=0,f=0,E=0,R=[],$=[];t.forEach(n=>{let B=["Closed","Resolved","Done","Completed"].includes(n.status),y=n.closedDate?new Date(n.closedDate).getTime():n.changedDate?new Date(n.changedDate).getTime():0,b="Abierto",T=0;B?!y||y<=o?(s++,b="A tiempo"):(p++,T=Math.max(1,Math.round((y-o)/(1e3*60*60*24))),T>E&&(E=T),b="Fase Extendida ("+T+"d retraso)",R.push("  - "+(n.type==="Feature"?"FT":"US")+" #"+n.id+" | ISW: "+n.isw+" | Cerrado: "+(n.closedDate?n.closedDate.substring(0,10):"?")+" | ~"+T+"d tarde")):f++;let z=(n.tasks||[]).map(S=>"Tarea #"+S.id+': "'+S.title+'" (Est: '+(S.originalEstimate||0)+"h, Real: "+(S.completedWork||0)+"h, Estado: "+S.status+")").join("; ");$.push("  * ["+(n.type==="Feature"?"FT":"US")+" #"+n.id+'] "'+n.title+'" - ISW: '+n.isw+" | Estado: "+n.status+" | Entrega: "+b+" | Size: "+n.size+" | Tareas: ["+z+"]")});let A=e.defectRemovalEfficiency?.bugsList||[],g=e.escapedBugs?.bugsList||[],D=new Map;[...A,...g].forEach(n=>{D.set(n.bugId||n.id,n)});let L=Array.from(D.values()).map(n=>"  * [Bug #"+(n.bugId||n.id)+'] "'+n.title+'" - ISW: '+(n.isw||"Sin asignar")+" | Estado: "+n.status+" | Clasificaci\xF3n: "+(n.classification||"N/A")).join(`
`),F=s+p,j=F>0?(s/F*100).toFixed(0):"\u2014";return"         Total entregables: "+t.length+" | A tiempo: "+s+" | En Fase Extendida: "+p+" | Abiertos: "+f+`
         % Cumplimiento: `+j+"% | M\xE1x. d\xEDas de retraso: "+E+`d
         Detalle de Deliverables (Historias de Usuario / Features) y sus Tareas:
`+$.join(`
`)+`
         Detalle de Todos los Bugs de la Iteraci\xF3n:
`+(L||"Sin bugs detectados en este periodo.")})()}

      1. Tasa de Desarrollo: ${e.developmentRate.rate.toFixed(2)} 
         (Sem\xE1foro: Verde \u2264 1.70 | Amarillo 1.71\u20132.00 | Rojo > 2.00)
         Esfuerzo total: ${e.developmentRate.totalEffort?.toFixed(1)??"\u2014"} h | Size total: ${e.developmentRate.totalSize??"\u2014"}
         
         Items del sprint:
${r}

         Resumen por ISW:
${u}

      2. Tasa de Desviaci\xF3n de Esfuerzo: ${Math.abs(e.effortVariance.rate*100).toFixed(1)}%
         (Sem\xE1foro: Verde \u2264 15% | Amarillo 15\u201330% | Rojo > 30%)

      3. Tasa de Retrabajo: ${e.rework.rate.toFixed(1)}%
         (Sem\xE1foro: Verde \u2264 22% | Amarillo 22\u201330% | Rojo > 30%)
         Esfuerzo Requerimiento: ${e.rework.reqEffort.toFixed(1)}h | Retrabajo Total: ${e.rework.totalRework.toFixed(1)}h

      4. Densidad de Defectos: ${e.defectDensity.density.toFixed(3)}
         (Sem\xE1foro: Verde \u2264 0.18 | Amarillo 0.18\u20130.23 | Rojo > 0.23)

      5. Eficiencia en la Eliminaci\xF3n de Defectos (EED): ${e.defectRemovalEfficiency.rate.toFixed(2)}%
         (Sem\xE1foro: Verde \u2265 81% | Amarillo 71%\u201380% | Rojo < 71%)
         Total Bugs: ${e.defectRemovalEfficiency.totalBugs} | Closed en Tiempo: ${e.defectRemovalEfficiency.closedOnTime} | Closed fuera de Tiempo: ${e.defectRemovalEfficiency.closedLate}

      6. Porcentaje de Bugs Escapados: ${e.escapedBugs?.rate.toFixed(2)??"0.00"}%
         (Sem\xE1foro: Verde \u2264 33% | Amarillo 33%\u201340% | Rojo > 40%)
         Bugs Testing: ${e.escapedBugs?.bugsTesting??0} | Bugs UAT: ${e.escapedBugs?.bugsUat??0} | Bugs Producci\xF3n: ${e.escapedBugs?.bugsProd??0} | Total Bugs: ${e.escapedBugs?.totalBugs??0}

      7. Porcentaje de Ejecuci\xF3n de Pruebas (Run Rate): ${e.testExecution?.rate.toFixed(2)??"0.00"}%
         (Sem\xE1foro: Verde \u2265 90% | Amarillo 80%\u201389% | Rojo < 80%)
         Total Test Points: ${e.testExecution?.totalTestPoints??0} | Ejecutados: ${e.testExecution?.executed??0} | Pasados a Tiempo: ${e.testExecution?.passedEnTiempo??0} | Pasados Fuera de Tiempo: ${e.testExecution?.passedFueraDeTiempo??0} | Fallidos: ${e.testExecution?.failed??0} | Bloqueados: ${e.testExecution?.blocked??0} | N/A: ${e.testExecution?.notApplicable??0}

      8. Porcentaje de Pruebas Satisfactorias (Pass Rate): ${e.satisfactoryTests?.rate.toFixed(2)??"0.00"}%
         (Sem\xE1foro: Verde \u2265 90% | Amarillo 80%\u201389% | Rojo < 80%)
         Total Test Points: ${e.satisfactoryTests?.total??0} | Pasados a Tiempo (Satisfactorios): ${e.satisfactoryTests?.passedEnTiempo??0} | Pasados Fuera de Tiempo: ${e.satisfactoryTests?.passedFueraDeTiempo??0} | Fallidos: ${e.satisfactoryTests?.failed??0} | Bloqueados: ${e.satisfactoryTests?.blocked??0} | N/A: ${e.satisfactoryTests?.notApplicable??0}

      HISTORIAL DE SPRINTS ANTERIORES PARA C\xC1LCULO ACUMULADO REAL:
${d}

      ESTRUCTURA REQUERIDA \u2014 para CADA m\xE9trica genera EXACTAMENTE estas secciones:
      [METRICA_INICIO: Nombre]
      (NOTA IMPORTANTE PARA LA PRIMERA M\xC9TRICA "Cumplimiento y L\xEDnea de Tiempo del Sprint" o "Cumplimiento": Para esta primera m\xE9trica, NO generes vi\xF1etas de metas, resultados, acciones correctivas ni an\xE1lisis acumulado. En su lugar, genera \xFAnicamente un an\xE1lisis de resultados muy profundo, detallado e hilado en texto libre para explicar el comportamiento temporal de las entregas y la variabilidad. Para el resto de las m\xE9tricas de la 1 a la 8, sigue obligatoriamente las secciones de abajo:)
      - Meta establecida para el periodo: (valor)
      - Resultado del periodo: (valor real con sem\xE1foro: Verde/Amarillo/Rojo)
      - An\xE1lisis de resultados: (Explica el resultado con un tono CR\xCDTICO y CONSTRUCTIVO. 
        Identifica \xE1reas de mejora espec\xEDficas bas\xE1ndote en los datos de los \xEDtems. 
        Considera: \xBFHubo subestimaci\xF3n en tareas espec\xEDficas? \xBFLa granularidad de las tareas fue suficiente? 
        \xBFEl esfuerzo se concentr\xF3 en un solo ISW MID? 
        Incluso en resultados VERDE, busca micro-desviaciones o patrones de riesgo que podr\xEDan optimizarse.)
      - Acciones correctivas: (Define acciones concretas de mejora. 
        No te limites a "mantener", sugiere ajustes en la planeaci\xF3n, mentor\xEDa entre pares ISW MID, 
        o refinamiento de criterios de aceptaci\xF3n para reducir la incertidumbre t\xE9cnica.)
      - An\xE1lisis acumulado del periodo:
        o Meta acumulada: (valor meta acumulada de la fase actual)
        o Resultado acumulado: (Calcula el valor real acumulado de toda la FASE, sumando o promediando matem\xE1ticamente los valores del SPRINT ACTUAL con los de todos los SPRINTS ANTERIORES listados en el HISTORIAL. Muestra el resultado acumulado real obtenido hasta ahora en la Fase 1.)
        (p\xE1rrafo breve sobre c\xF3mo estas acciones impulsan la madurez CMMI Nivel 5 del equipo.)
      [METRICA_FIN]

      REGLAS IMPORTANTES:
      - S\xC9 EXIGENTE: Como auditor CMMI5, tu objetivo es la perfecci\xF3n estad\xEDstica. Si un \xEDtem se desv\xEDa, se\xF1\xE1lalo aunque el promedio global sea bueno.
      - NO menciones ISW SR, no existe en este equipo. Solo ISW MID.
      - Para la m\xE9trica "2. Tasa de Desviaci\xF3n de Esfuerzo", el "Resultado del periodo" debe presentarse en valor absoluto (sin signo negativo, p. ej., 11.23% en lugar de -11.23%).
      - Usa nombres reales de los ISW del equipo cuando est\xE9n disponibles en la lista de items.
      - Tono profesional, anal\xEDtico y enfocado en identificar brechas de proceso.
      - Devuelve solo el texto estructurado, sin introducciones ni conclusiones generales.
    `;return l.ai.provider==="openai"?this.callOpenAI(l.ai.apiKey,l.ai.model,c):this.callGemini(l.ai.apiKey,l.ai.model,c)}generateCompletionReport(e){let i=this.configService.getConfig();if(!i||!i.ai.apiKey)return m("AI Configuration missing.");let l=[],r=0,a=0;(e.developmentRate.items||[]).forEach(f=>{let E=(f.tasks||[]).filter(A=>{let g=(A.title||"").toLowerCase();return g.includes("01.01")||g.includes("01.03")||g.includes("01.04")||g.includes("01.05")}),R=E.reduce((A,g)=>A+(g.originalEstimate||0),0),$=E.reduce((A,g)=>A+(g.completedWork||0),0);l.push(`${f.type==="Feature"?"FT":"US"} | ${f.id} | ${R.toFixed(2)} | ${$.toFixed(2)}`),r+=R,a+=$});let u=l.join(`
`),d=r,c=a,t=(d-c).toFixed(2),o=d>0?((d-c)/d*100).toFixed(2):"0.00",p=`
      Act\xFAa como el Responsable de Calidad y Planeaci\xF3n. Genera un REPORTE DE FINALIZACI\xD3N DE CONSTRUCCI\xD3N para el correo de David.
      El formato debe ser EXACTAMENTE el siguiente, llenando los datos con la informaci\xF3n proporcionada:

      Buen d\xEDa David,

      de acuerdo al proceso te env\xEDo el reporte de finalizaci\xF3n de construcci\xF3n del sprint ${e.iterationName||"Sprint X"}

      Tipo | Item | Tiempo planeado | Tiempo completado
      --- | --- | --- | ---
      ${u}
      Total | | ${d.toFixed(2)} | ${c.toFixed(2)}

      La construcci\xF3n de las historias de usuario finaliz\xF3 con una diferencia de ${Math.abs(parseFloat(t))} horas ${parseFloat(t)>0?"menos":"m\xE1s"}, lo que representa una desviaci\xF3n del ${Math.abs(parseFloat(o))}% respecto al tiempo planeado. 
      [A\xF1ade aqu\xED 2 o 3 oraciones justificando la desviaci\xF3n bas\xE1ndote en los \xEDtems analizados. Menciona los IDs espec\xEDficos de US/FT que se excedieron del tiempo planeado como causa de la desviaci\xF3n, y menciona si hubo bugs. S\xE9 anal\xEDtico y profesional.]

      Adjunto la gr\xE1fica del sprint burndown. Sin embargo, a\xFAn quedan tareas administrativas que no se han cerrado.

      REGLAS:
      - Idioma: Espa\xF1ol.
      - Mant\xE9n el formato de la tabla en Markdown para que se vea claramente.
      - La justificaci\xF3n debe ser coherente con los datos (ej: si la US 46900 tiene m\xE1s horas reales que planeadas, menci\xF3nala como causa).
    `;return i.ai.provider==="openai"?this.callOpenAI(i.ai.apiKey,i.ai.model,p):this.callGemini(i.ai.apiKey,i.ai.model,p)}analyzeGanttComparison(e){let i=this.configService.getConfig();if(!i||!i.ai.apiKey)return m("AI Configuration missing.");let l=e.items.filter(o=>o.late).slice(0,20).map(o=>`- #${o.workItemId}: Planeado ${o.plannedStart}\u2192${o.plannedEnd} | Real ${o.realStart||"N/A"}\u2192${o.realEnd||"N/A"}`).join(`
`),r=e.items.slice(0,30).map(o=>`- #${o.workItemId} | Planeado ${o.plannedStart}\u2192${o.plannedEnd} | Real ${o.realStart||"N/A"}\u2192${o.realEnd||"N/A"} | ${o.late?"Atrasado":"En tiempo"}`).join(`
`),a=e.people.slice(0,30).map(o=>`- ${o.person}: Planeado marcas=${o.plannedMarks}, Planeado items=${o.plannedItems}, Real asignaciones=${o.realAssignments}, Real items=${o.realItems}`).join(`
`),u=e.taskLayer.stageBreakdown.slice(0,20).map(o=>`- ${o.stage}: tareas=${o.taskCount}, planeado=${o.plannedHours.toFixed(1)}h, real=${o.realHours.toFixed(1)}h`).join(`
`),d=e.taskLayer.relatedItemTaskContext.slice(0,40).join(`
`),c=e.taskLayer.relatedBugTaskContext.slice(0,40).join(`
`),t=`
Act\xFAa como un analista senior de gesti\xF3n de sprints en un contexto CMMI.
Tu tarea es analizar la comparaci\xF3n REAL vs PLANEADO (Excel timeline) y redactar un an\xE1lisis ejecutivo en ESPA\xD1OL.

CONTEXTO
- Organizaci\xF3n: ${e.organization||"N/A"}
- Proyecto: ${e.project||"N/A"}
- Team: ${e.team||"N/A"}
- Sprint: ${e.sprint||"N/A"}
- Baseline: ${e.baselineName||"N/A"}

CONSIDERACIONES DE GRANULARIDAD (MUY IMPORTANTE)
- El Excel de planeaci\xF3n NO incluye el desglose completo de tareas t\xE9cnicas por work item; representa una planeaci\xF3n resumida por duraci\xF3n/marcas.
- Azure DevOps S\xCD incluye mayor detalle operativo (tareas, reasignaciones y movimientos durante el sprint).
- Por lo anterior, NO debes interpretar como desviaci\xF3n negativa autom\xE1tica que en ADO exista mayor cantidad de asignaciones o mayor detalle que en Excel.
- La comparaci\xF3n por persona debe usarse para detectar concentraci\xF3n, cambios de carga o riesgos de coordinaci\xF3n, no para penalizar diferencias de granularidad del desglose.

RESUMEN GENERAL
- Filas Excel: ${e.summary.totalRows}
- Match con ADO: ${e.summary.matchedRows}
- Sin match: ${e.summary.unmatchedRows}
- En tiempo: ${e.summary.matchedOnTime}
- Atrasadas: ${e.summary.matchedLate}

ITEMS REPRESENTATIVOS
${r||"- Sin datos de \xEDtems"}

TOP ITEMS ATRASADOS
${l||"- Sin atrasos detectados"}

COMPARACI\xD3N POR PERSONA
${a||"- Sin datos por persona"}

CAPA DE TAREAS (ADO) PARA ITEMS CON MATCH
- Items con tareas: ${e.taskLayer.matchedItemsWithTasks}
- Horas planeadas (tareas): ${e.taskLayer.totalPlannedTaskHours.toFixed(1)}h
- Horas reales (tareas): ${e.taskLayer.totalRealTaskHours.toFixed(1)}h
- Posibles violaciones de dependencia temporal: ${e.taskLayer.dependencyViolations}
- Tareas administrativas: ${e.taskLayer.adminTaskCount} (Plan=${e.taskLayer.adminPlannedHours.toFixed(1)}h, Real=${e.taskLayer.adminRealHours.toFixed(1)}h)

DESGLOSE POR ETAPA (TAREAS)
${u||"- Sin desglose por etapa"}

CONTEXTO AMPLIADO POR ITEM PADRE (TAREAS RELACIONADAS)
${d||"- Sin tareas adicionales relacionadas por padre"}

BUGS RELACIONADOS Y SUS TAREAS HIJAS
${c||"- Sin bugs/tareas hijas relacionadas"}

ENTREGABLE REQUERIDO (texto \xFAnico, no tablas):
1) Paso 1 (obligatorio): Diagn\xF3stico general de cumplimiento por ITEM (cierre vs planeado Excel).
2) Paso 2 (obligatorio): An\xE1lisis por TAREAS ADO para explicar causas (plan vs real), respetando dependencias.
3) Riesgos operativos detectados (fechas, dependencias y distribuci\xF3n por persona).
4) Acciones concretas para el siguiente sprint (m\xE1ximo 6 bullets).
5) Cierre ejecutivo con prioridad de atenci\xF3n (alta/media/baja).

REGLAS
- No inventes datos no presentes.
- S\xE9 directo, profesional y accionable.
- Si faltan datos, dilo expl\xEDcitamente y sugiere c\xF3mo capturarlos.
- Prohibido concluir \u201Cmala planeaci\xF3n\u201D solo porque Real (ADO) tenga m\xE1s tareas/asignaciones que Planeado (Excel); primero explica la diferencia de nivel de detalle entre fuentes.
- Si detectas diferencias de volumen entre Planeado y Real, tr\xE1talas como hip\xF3tesis de desagregaci\xF3n operativa y eval\xFAa impacto real en fechas/cierres, no como incumplimiento por s\xED mismo.
- Debes incorporar expl\xEDcitamente en el diagn\xF3stico las tareas relacionadas del mismo item padre y los bugs asociados con sus tareas hijas para no perder contexto operacional.
- Restricciones de proceso a respetar en tu interpretaci\xF3n:
  a) Solo un desarrollador codifica un item (bug/feature/user story) a la vez.
  b) Peer review depende de codificaci\xF3n.
  c) Pruebas ISW dependen de peer review.
  d) Ejecuci\xF3n de pruebas depende de pruebas ISW.
  e) Existen tareas administrativas al inicio, durante y cierre de sprint que pueden impactar capacidad.
`;return i.ai.provider==="openai"?this.callOpenAI(i.ai.apiKey,i.ai.model,t):this.callGemini(i.ai.apiKey,i.ai.model,t)}askAboutMetrics(e,i,l){let r=this.configService.getConfig();if(!r||!r.ai.apiKey)return m("Configuraci\xF3n de IA no encontrada. Por favor configure su API Key en la pantalla de Configuraci\xF3n.");let a=`INFORMACI\xD3N DEL SPRINT ACTUAL:
`;a+=`- Iteraci\xF3n/Sprint: ${e.iterationName||"No especificada"}
`,e.startDate&&e.endDate&&(a+=`- Periodo: ${e.startDate} a ${e.endDate}
`),a+=`
1. TASA DE DESARROLLO:
`,a+=`- Valor: ${e.developmentRate.rate.toFixed(2)} (Sem\xE1foro: ${e.developmentRate.status})
`,a+=`- Esfuerzo Real Total: ${e.developmentRate.totalEffort?.toFixed(1)??0}h
`,a+=`- Puntos de Historia (Size) Total: ${e.developmentRate.totalSize??0}
`,a+=`- Cantidad de Items: ${e.developmentRate.totalItems??0}
`,e.developmentRate.items&&e.developmentRate.items.length>0&&(a+=`Items de Trabajo:
`,e.developmentRate.items.forEach(s=>{let p=(s.tasks||[]).reduce((f,E)=>f+(E.originalEstimate||0),0);a+=`  * [${s.type==="Feature"?"FT":"US"} #${s.id}] ${s.title} - ISW: ${s.isw} | Estado: ${s.status} | Estimado: ${p.toFixed(1)}h | Real: ${s.effort.toFixed(1)}h | Size: ${s.size}
`})),a+=`
2. DESVIACI\xD3N DE ESFUERZO:
`,a+=`- Tasa Desviaci\xF3n: ${(e.effortVariance.rate*100).toFixed(1)}% (Sem\xE1foro: ${e.effortVariance.status})
`,a+=`- Esfuerzo Planeado: ${e.effortVariance.planned?.toFixed(1)??0}h
`,a+=`- Esfuerzo Real: ${e.effortVariance.actual?.toFixed(1)??0}h
`,a+=`
3. TASA DE RETRABAJO:
`,a+=`- Tasa Retrabajo: ${e.rework.rate.toFixed(1)}% (Sem\xE1foro: ${e.rework.status})
`,a+=`- Esfuerzo Requerimientos: ${e.rework.reqEffort?.toFixed(1)??0}h
`,a+=`- Retrabajo Total: ${e.rework.totalRework?.toFixed(1)??0}h
`,a+=`
4. DENSIDAD DE DEFECTOS:
`,a+=`- Densidad: ${e.defectDensity.density.toFixed(3)} (Sem\xE1foro: ${e.defectDensity.status})
`,a+=`- Bugs Totales: ${e.defectDensity.bugs??0}
`,a+=`- Size Total: ${e.defectDensity.size??0}
`,a+=`
5. EFICIENCIA EN ELIMINACI\xD3N DE DEFECTOS (EED):
`,a+=`- Eficiencia: ${e.defectRemovalEfficiency.rate.toFixed(2)}% (Sem\xE1foro: ${e.defectRemovalEfficiency.status})
`,a+=`- Bugs Cerrados a Tiempo: ${e.defectRemovalEfficiency.closedOnTime??0}
`,a+=`- Bugs Cerrados Fuera de Tiempo: ${e.defectRemovalEfficiency.closedLate??0}
`,e.defectRemovalEfficiency.bugsList&&e.defectRemovalEfficiency.bugsList.length>0&&(a+=`Lista de Bugs EED:
`,e.defectRemovalEfficiency.bugsList.forEach(s=>{a+=`  * [Bug #${s.bugId}] ${s.title} - Asignado: ${s.isw||"Sin asignar"} | Estado: ${s.status} | Alineaci\xF3n: ${s.alignment} | Clasificaci\xF3n: ${s.classification||"N/A"}
`}));let u=e.escapedBugs;u&&(a+=`
6. BUGS ESCAPADOS:
`,a+=`- Tasa Escape: ${u.rate.toFixed(2)}% (Sem\xE1foro: ${u.status})
`,a+=`- Bugs Testing: ${u.bugsTesting??0}
`,a+=`- Bugs UAT: ${u.bugsUat??0}
`,a+=`- Bugs Producci\xF3n: ${u.bugsProd??0}
`,u.bugsList&&u.bugsList.length>0&&(a+=`Lista de Bugs Escapados:
`,u.bugsList.forEach(s=>{a+=`  * [Bug #${s.bugId}] ${s.title} - Asignado: ${s.isw||"Sin asignar"} | Estado: ${s.status} | Clasificaci\xF3n: ${s.classification}
`})));let d=e.testExecution;d&&(a+=`
7. EJECUCI\xD3N DE PRUEBAS:
`,a+=`- Tasa Ejecuci\xF3n: ${d.rate.toFixed(2)}% (Sem\xE1foro: ${d.status})
`,a+=`- Total Test Points: ${d.totalTestPoints??0}
`,a+=`- Ejecutados: ${d.executed??0}
`,a+=`- Pasados a Tiempo: ${d.passedEnTiempo??0}
`,a+=`- Pasados Fuera de Tiempo: ${d.passedFueraDeTiempo??0}
`,a+=`- Fallidos: ${d.failed??0}
`,a+=`- Bloqueados: ${d.blocked??0}
`,d.testPoints&&d.testPoints.length>0&&(a+=`Detalle de Puntos de Prueba:
`,d.testPoints.forEach(s=>{a+=`  * [Plan: ${s.planName}] Suite: ${s.suiteName} | Test Case: [#${s.testCaseId}] ${s.testCaseTitle} - Probador: ${s.tester} | Resultado: ${s.outcome} | En Tiempo: ${s.onTime?"S\xED":"No"}
`})));let c=e.satisfactoryTests;c&&(a+=`
8. PORCENTAJE DE PRUEBAS SATISFACTORIAS (KPI Pass Rate):
`,a+=`- Tasa Pruebas Satisfactorias (Pass Rate): ${c.rate.toFixed(2)}% (Sem\xE1foro: ${c.status})
`,a+=`- Total Test Points: ${c.total??0}
`,a+=`- Pasados a Tiempo (Satisfactorios): ${c.passedEnTiempo??0}
`,a+=`- Pasados Fuera de Tiempo: ${c.passedFueraDeTiempo??0}
`,a+=`- Fallidos: ${c.failed??0}
`,a+=`- Bloqueados: ${c.blocked??0}
`,a+=`- N/A: ${c.notApplicable??0}
`);let t="";l&&l.length>0&&(t=`HISTORIAL DE LA CONVERSACI\xD3N:
`,l.forEach(s=>{t+=`${s.role==="user"?"Usuario":"Asistente"}: ${s.content}
`}));let o=`
      Act\xFAa como un Asistente Virtual Experto en M\xE9tricas CMMI Nivel 5 para el proyecto OPE20 Bepensa.
      Tu objetivo es responder de manera clara, concisa y precisa a las preguntas del usuario sobre los datos y m\xE9tricas que se muestran en el dashboard actual.

      ${a}

      ${t}

      PREGUNTA DEL USUARIO:
      ${i}

      REGLAS PARA RESPONDER:
      1. Responde en ESPA\xD1OL.
      2. S\xE9 preciso e inf\xF3rmate de los datos proporcionados arriba. Si te preguntan por un \xEDtem espec\xEDfico, un ISW espec\xEDfico, un bug o una m\xE9trica en particular, busca en los datos provistos y da detalles espec\xEDficos (IDs, horas, porcentajes, nombres).
      3. Mant\xE9n un tono profesional, anal\xEDtico y constructivo, pero amigable.
      4. Si la pregunta no tiene relaci\xF3n con las m\xE9tricas o no se puede responder con la informaci\xF3n proporcionada, ind\xEDcalo amablemente y ofrece ayuda sobre lo que s\xED puedes responder bas\xE1ndote en los datos.
      5. Puedes estructurar tu respuesta con vi\xF1etas o tablas markdown sencillas para mejorar la legibilidad.
    `;return r.ai.provider==="openai"?this.callOpenAI(r.ai.apiKey,r.ai.model,o):this.callGemini(r.ai.apiKey,r.ai.model,o)}callOpenAI(e,i,l){return this.http.post("https://api.openai.com/v1/chat/completions",{model:i||"gpt-4",messages:[{role:"user",content:l}]},{headers:{Authorization:`Bearer ${e}`}}).pipe(v(14e4),h({count:1,delay:2e3}),x(r=>r?.choices?.[0]?.message?.content||"Respuesta vac\xEDa de OpenAI"),P(r=>{console.error("OpenAI Error/Timeout:",r);let a=r?.name==="TimeoutError"||r?.message?.includes("timeout"),u=r?.status===401||r?.status===403;return a?m("El an\xE1lisis tard\xF3 demasiado (>90s). Intenta de nuevo; el servidor de IA puede estar ocupado."):u?m("API Key de OpenAI inv\xE1lida o sin permisos. Verifica la clave en Configuraci\xF3n."):m(`Error al contactar OpenAI (${r?.status??"sin conexi\xF3n"}). Intenta de nuevo.`)}))}callGemini(e,i,l){let r=i||"gemini-1.5-flash";return this.http.post(`https://generativelanguage.googleapis.com/v1beta/models/${r}:generateContent?key=${e}`,{contents:[{parts:[{text:l}]}]}).pipe(v(9e4),h({count:1,delay:2e3}),x(a=>a?.candidates?.[0]?.content?.parts?.[0]?.text||"Respuesta vac\xEDa de Gemini"),P(a=>{console.error("Gemini Error/Timeout:",a);let u=a?.name==="TimeoutError"||a?.message?.includes("timeout"),d=a?.status===400||a?.status===401||a?.status===403,c=a?.status===429;return u?m("El an\xE1lisis tard\xF3 demasiado (>90s). Intenta de nuevo; Gemini puede estar ocupado."):c?m("Cuota de Gemini agotada. Espera un momento e intenta de nuevo."):d?m("API Key de Gemini inv\xE1lida. Verifica la clave en Configuraci\xF3n."):m(`Error al contactar Gemini (${a?.status??"sin conexi\xF3n"}). Intenta de nuevo.`)}))}static \u0275fac=function(i){return new(i||I)};static \u0275prov=O({token:I,factory:I.\u0275fac,providedIn:"root"})};export{k as a};
