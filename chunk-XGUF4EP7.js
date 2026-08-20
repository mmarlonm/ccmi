import{D as C,K as F,Q as D,Xb as O,_b as N,i as p,m as b,n as P,v as h}from"./chunk-ACCCDTAK.js";var M=class I{http=D(O);configService=D(N);analyzeMetrics(e){let s=this.configService.getConfig();if(!s||!s.ai.apiKey)return p("AI Configuration missing.");let c=(e.developmentRate.items||[]).map(t=>{let o=(t.tasks||[]).reduce((n,m)=>n+(m.originalEstimate||0),0),l=t.effort,u=o>0?((l-o)/o*100).toFixed(1):"0";return`  - ${t.type==="Feature"?"FT":"US"} #${t.id} | Size: ${t.size} | Est. Original: ${o.toFixed(1)}h | Real: ${l.toFixed(1)}h | Var: ${u}% | ISW: ${t.isw}`}).join(`
`),i={};(e.developmentRate.items||[]).forEach(t=>{let o=t.isw||"Sin Asignar";i[o]||(i[o]={name:o,effort:0,planned:0,size:0}),i[o].effort+=t.effort,i[o].planned+=(t.tasks||[]).reduce((l,u)=>l+(u.originalEstimate||0),0),i[o].size+=t.sizeEdited!==void 0?t.sizeEdited:t.size});let a=Object.values(i).map(t=>{let o=t.size>0?(t.effort/t.size).toFixed(2):"N/A",l=t.planned>0?((t.effort-t.planned)/t.planned*100).toFixed(1):"0";return`  * ${t.name}: Tasa ${o} | Desviaci\xF3n ${l}% | Esfuerzo Real ${t.effort.toFixed(1)}h`}).join(`
`),d=`
      Act\xFAa como un Auditor de Calidad CMMI Nivel 5 del proyecto OPE20 Bepensa. Analiza estas m\xE9tricas y devuelve el resultado en ESPA\xD1OL. 

      CONTEXTO DEL EQUIPO:
      - Todos los integrantes del equipo de desarrollo son ISW nivel MID (nivel intermedio).
      - No hay ISW SR (Senior) en el equipo. No menciones ISW SR en el an\xE1lisis.
      - El equipo trabaja bajo metodolog\xEDa SCRUM con sprints.

      M\xC9TRICAS DEL SPRINT:
      0. Cumplimiento y L\xEDnea de Tiempo del Sprint:
      ${(()=>{let t=e.developmentRate?.items||[],o=e.endDate?new Date(e.endDate).getTime():0,l=0,u=0,n=0,m=0,g=[],A=[];t.forEach(r=>{let L=["Closed","Resolved","Done","Completed"].includes(r.status),v=r.closedDate?new Date(r.closedDate).getTime():r.changedDate?new Date(r.changedDate).getTime():0,y="Abierto",$=0;L?!v||v<=o?(l++,y="A tiempo"):(u++,$=Math.max(1,Math.round((v-o)/(1e3*60*60*24))),$>m&&(m=$),y="Fase Extendida ("+$+"d retraso)",g.push("  - "+(r.type==="Feature"?"FT":"US")+" #"+r.id+" | ISW: "+r.isw+" | Cerrado: "+(r.closedDate?r.closedDate.substring(0,10):"?")+" | ~"+$+"d tarde")):n++;let j=(r.tasks||[]).map(T=>"Tarea #"+T.id+': "'+T.title+'" (Est: '+(T.originalEstimate||0)+"h, Real: "+(T.completedWork||0)+"h, Estado: "+T.status+")").join("; ");A.push("  * ["+(r.type==="Feature"?"FT":"US")+" #"+r.id+'] "'+r.title+'" - ISW: '+r.isw+" | Estado: "+r.status+" | Entrega: "+y+" | Size: "+r.size+" | Tareas: ["+j+"]")});let S=e.defectRemovalEfficiency?.bugsList||[],R=e.escapedBugs?.bugsList||[],E=new Map;[...S,...R].forEach(r=>{E.set(r.bugId||r.id,r)});let f=Array.from(E.values()).map(r=>"  * [Bug #"+(r.bugId||r.id)+'] "'+r.title+'" - ISW: '+(r.isw||"Sin asignar")+" | Estado: "+r.status+" | Clasificaci\xF3n: "+(r.classification||"N/A")).join(`
`),x=l+u,k=x>0?(l/x*100).toFixed(0):"\u2014";return"         Total entregables: "+t.length+" | A tiempo: "+l+" | En Fase Extendida: "+u+" | Abiertos: "+n+`
         % Cumplimiento: `+k+"% | M\xE1x. d\xEDas de retraso: "+m+`d
         Detalle de Deliverables (Historias de Usuario / Features) y sus Tareas:
`+A.join(`
`)+`
         Detalle de Todos los Bugs de la Iteraci\xF3n:
`+(f||"Sin bugs detectados en este periodo.")})()}

      1. Tasa de Desarrollo: ${e.developmentRate.rate.toFixed(2)} 
         (Sem\xE1foro: Verde \u2264 1.70 | Amarillo 1.71\u20132.00 | Rojo > 2.00)
         Esfuerzo total: ${e.developmentRate.totalEffort?.toFixed(1)??"\u2014"} h | Size total: ${e.developmentRate.totalSize??"\u2014"}
         
         Items del sprint:
${c}

         Resumen por ISW:
${a}

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
        o Meta acumulada: (valor meta)
        o Resultado acumulado: (valor real + peque\xF1o margen estimado)
        (p\xE1rrafo breve sobre c\xF3mo estas acciones impulsan la madurez CMMI Nivel 5 del equipo.)
      [METRICA_FIN]

      REGLAS IMPORTANTES:
      - S\xC9 EXIGENTE: Como auditor CMMI5, tu objetivo es la perfecci\xF3n estad\xEDstica. Si un \xEDtem se desv\xEDa, se\xF1\xE1lalo aunque el promedio global sea bueno.
      - NO menciones ISW SR, no existe en este equipo. Solo ISW MID.
      - Para la m\xE9trica "2. Tasa de Desviaci\xF3n de Esfuerzo", el "Resultado del periodo" debe presentarse en valor absoluto (sin signo negativo, p. ej., 11.23% en lugar de -11.23%).
      - Usa nombres reales de los ISW del equipo cuando est\xE9n disponibles en la lista de items.
      - Tono profesional, anal\xEDtico y enfocado en identificar brechas de proceso.
      - Devuelve solo el texto estructurado, sin introducciones ni conclusiones generales.
    `;return s.ai.provider==="openai"?this.callOpenAI(s.ai.apiKey,s.ai.model,d):this.callGemini(s.ai.apiKey,s.ai.model,d)}generateCompletionReport(e){let s=this.configService.getConfig();if(!s||!s.ai.apiKey)return p("AI Configuration missing.");let c=[],i=0,a=0;(e.developmentRate.items||[]).forEach(g=>{let A=(g.tasks||[]).filter(E=>{let f=(E.title||"").toLowerCase();return f.includes("01.01")||f.includes("01.03")||f.includes("01.04")||f.includes("01.05")}),S=A.reduce((E,f)=>E+(f.originalEstimate||0),0),R=A.reduce((E,f)=>E+(f.completedWork||0),0);c.push(`${g.type==="Feature"?"FT":"US"} | ${g.id} | ${S.toFixed(2)} | ${R.toFixed(2)}`),i+=S,a+=R});let d=c.join(`
`),t=i,o=a,l=(t-o).toFixed(2),u=t>0?((t-o)/t*100).toFixed(2):"0.00",m=`
      Act\xFAa como el Responsable de Calidad y Planeaci\xF3n. Genera un REPORTE DE FINALIZACI\xD3N DE CONSTRUCCI\xD3N para el correo de David.
      El formato debe ser EXACTAMENTE el siguiente, llenando los datos con la informaci\xF3n proporcionada:

      Buen d\xEDa David,

      de acuerdo al proceso te env\xEDo el reporte de finalizaci\xF3n de construcci\xF3n del sprint ${e.iterationName||"Sprint X"}

      Tipo | Item | Tiempo planeado | Tiempo completado
      --- | --- | --- | ---
      ${d}
      Total | | ${t.toFixed(2)} | ${o.toFixed(2)}

      La construcci\xF3n de las historias de usuario finaliz\xF3 con una diferencia de ${Math.abs(parseFloat(l))} horas ${parseFloat(l)>0?"menos":"m\xE1s"}, lo que representa una desviaci\xF3n del ${Math.abs(parseFloat(u))}% respecto al tiempo planeado. 
      [A\xF1ade aqu\xED 2 o 3 oraciones justificando la desviaci\xF3n bas\xE1ndote en los \xEDtems analizados. Menciona los IDs espec\xEDficos de US/FT que se excedieron del tiempo planeado como causa de la desviaci\xF3n, y menciona si hubo bugs. S\xE9 anal\xEDtico y profesional.]

      Adjunto la gr\xE1fica del sprint burndown. Sin embargo, a\xFAn quedan tareas administrativas que no se han cerrado.

      REGLAS:
      - Idioma: Espa\xF1ol.
      - Mant\xE9n el formato de la tabla en Markdown para que se vea claramente.
      - La justificaci\xF3n debe ser coherente con los datos (ej: si la US 46900 tiene m\xE1s horas reales que planeadas, menci\xF3nala como causa).
    `;return s.ai.provider==="openai"?this.callOpenAI(s.ai.apiKey,s.ai.model,m):this.callGemini(s.ai.apiKey,s.ai.model,m)}analyzeGanttComparison(e){let s=this.configService.getConfig();if(!s||!s.ai.apiKey)return p("AI Configuration missing.");let c=e.items.filter(o=>o.late).slice(0,20).map(o=>`- #${o.workItemId}: Planeado ${o.plannedStart}\u2192${o.plannedEnd} | Real ${o.realStart||"N/A"}\u2192${o.realEnd||"N/A"}`).join(`
`),i=e.items.slice(0,30).map(o=>`- #${o.workItemId} | Planeado ${o.plannedStart}\u2192${o.plannedEnd} | Real ${o.realStart||"N/A"}\u2192${o.realEnd||"N/A"} | ${o.late?"Atrasado":"En tiempo"}`).join(`
`),a=e.people.slice(0,30).map(o=>`- ${o.person}: Planeado marcas=${o.plannedMarks}, Planeado items=${o.plannedItems}, Real asignaciones=${o.realAssignments}, Real items=${o.realItems}`).join(`
`),d=e.taskLayer.stageBreakdown.slice(0,20).map(o=>`- ${o.stage}: tareas=${o.taskCount}, planeado=${o.plannedHours.toFixed(1)}h, real=${o.realHours.toFixed(1)}h`).join(`
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
${i||"- Sin datos de \xEDtems"}

TOP ITEMS ATRASADOS
${c||"- Sin atrasos detectados"}

COMPARACI\xD3N POR PERSONA
${a||"- Sin datos por persona"}

CAPA DE TAREAS (ADO) PARA ITEMS CON MATCH
- Items con tareas: ${e.taskLayer.matchedItemsWithTasks}
- Horas planeadas (tareas): ${e.taskLayer.totalPlannedTaskHours.toFixed(1)}h
- Horas reales (tareas): ${e.taskLayer.totalRealTaskHours.toFixed(1)}h
- Posibles violaciones de dependencia temporal: ${e.taskLayer.dependencyViolations}
- Tareas administrativas: ${e.taskLayer.adminTaskCount} (Plan=${e.taskLayer.adminPlannedHours.toFixed(1)}h, Real=${e.taskLayer.adminRealHours.toFixed(1)}h)

DESGLOSE POR ETAPA (TAREAS)
${d||"- Sin desglose por etapa"}

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
- Restricciones de proceso a respetar en tu interpretaci\xF3n:
  a) Solo un desarrollador codifica un item (bug/feature/user story) a la vez.
  b) Peer review depende de codificaci\xF3n.
  c) Pruebas ISW dependen de peer review.
  d) Ejecuci\xF3n de pruebas depende de pruebas ISW.
  e) Existen tareas administrativas al inicio, durante y cierre de sprint que pueden impactar capacidad.
`;return s.ai.provider==="openai"?this.callOpenAI(s.ai.apiKey,s.ai.model,t):this.callGemini(s.ai.apiKey,s.ai.model,t)}askAboutMetrics(e,s,c){let i=this.configService.getConfig();if(!i||!i.ai.apiKey)return p("Configuraci\xF3n de IA no encontrada. Por favor configure su API Key en la pantalla de Configuraci\xF3n.");let a=`INFORMACI\xD3N DEL SPRINT ACTUAL:
`;a+=`- Iteraci\xF3n/Sprint: ${e.iterationName||"No especificada"}
`,e.startDate&&e.endDate&&(a+=`- Periodo: ${e.startDate} a ${e.endDate}
`),a+=`
1. TASA DE DESARROLLO:
`,a+=`- Valor: ${e.developmentRate.rate.toFixed(2)} (Sem\xE1foro: ${e.developmentRate.status})
`,a+=`- Esfuerzo Real Total: ${e.developmentRate.totalEffort?.toFixed(1)??0}h
`,a+=`- Puntos de Historia (Size) Total: ${e.developmentRate.totalSize??0}
`,a+=`- Cantidad de Items: ${e.developmentRate.totalItems??0}
`,e.developmentRate.items&&e.developmentRate.items.length>0&&(a+=`Items de Trabajo:
`,e.developmentRate.items.forEach(n=>{let m=(n.tasks||[]).reduce((g,A)=>g+(A.originalEstimate||0),0);a+=`  * [${n.type==="Feature"?"FT":"US"} #${n.id}] ${n.title} - ISW: ${n.isw} | Estado: ${n.status} | Estimado: ${m.toFixed(1)}h | Real: ${n.effort.toFixed(1)}h | Size: ${n.size}
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
`,e.defectRemovalEfficiency.bugsList.forEach(n=>{a+=`  * [Bug #${n.bugId}] ${n.title} - Asignado: ${n.isw||"Sin asignar"} | Estado: ${n.status} | Alineaci\xF3n: ${n.alignment} | Clasificaci\xF3n: ${n.classification||"N/A"}
`}));let d=e.escapedBugs;d&&(a+=`
6. BUGS ESCAPADOS:
`,a+=`- Tasa Escape: ${d.rate.toFixed(2)}% (Sem\xE1foro: ${d.status})
`,a+=`- Bugs Testing: ${d.bugsTesting??0}
`,a+=`- Bugs UAT: ${d.bugsUat??0}
`,a+=`- Bugs Producci\xF3n: ${d.bugsProd??0}
`,d.bugsList&&d.bugsList.length>0&&(a+=`Lista de Bugs Escapados:
`,d.bugsList.forEach(n=>{a+=`  * [Bug #${n.bugId}] ${n.title} - Asignado: ${n.isw||"Sin asignar"} | Estado: ${n.status} | Clasificaci\xF3n: ${n.classification}
`})));let t=e.testExecution;t&&(a+=`
7. EJECUCI\xD3N DE PRUEBAS:
`,a+=`- Tasa Ejecuci\xF3n: ${t.rate.toFixed(2)}% (Sem\xE1foro: ${t.status})
`,a+=`- Total Test Points: ${t.totalTestPoints??0}
`,a+=`- Ejecutados: ${t.executed??0}
`,a+=`- Pasados a Tiempo: ${t.passedEnTiempo??0}
`,a+=`- Pasados Fuera de Tiempo: ${t.passedFueraDeTiempo??0}
`,a+=`- Fallidos: ${t.failed??0}
`,a+=`- Bloqueados: ${t.blocked??0}
`,t.testPoints&&t.testPoints.length>0&&(a+=`Detalle de Puntos de Prueba:
`,t.testPoints.forEach(n=>{a+=`  * [Plan: ${n.planName}] Suite: ${n.suiteName} | Test Case: [#${n.testCaseId}] ${n.testCaseTitle} - Probador: ${n.tester} | Resultado: ${n.outcome} | En Tiempo: ${n.onTime?"S\xED":"No"}
`})));let o=e.satisfactoryTests;o&&(a+=`
8. PORCENTAJE DE PRUEBAS SATISFACTORIAS (KPI Pass Rate):
`,a+=`- Tasa Pruebas Satisfactorias (Pass Rate): ${o.rate.toFixed(2)}% (Sem\xE1foro: ${o.status})
`,a+=`- Total Test Points: ${o.total??0}
`,a+=`- Pasados a Tiempo (Satisfactorios): ${o.passedEnTiempo??0}
`,a+=`- Pasados Fuera de Tiempo: ${o.passedFueraDeTiempo??0}
`,a+=`- Fallidos: ${o.failed??0}
`,a+=`- Bloqueados: ${o.blocked??0}
`,a+=`- N/A: ${o.notApplicable??0}
`);let l="";c&&c.length>0&&(l=`HISTORIAL DE LA CONVERSACI\xD3N:
`,c.forEach(n=>{l+=`${n.role==="user"?"Usuario":"Asistente"}: ${n.content}
`}));let u=`
      Act\xFAa como un Asistente Virtual Experto en M\xE9tricas CMMI Nivel 5 para el proyecto OPE20 Bepensa.
      Tu objetivo es responder de manera clara, concisa y precisa a las preguntas del usuario sobre los datos y m\xE9tricas que se muestran en el dashboard actual.

      ${a}

      ${l}

      PREGUNTA DEL USUARIO:
      ${s}

      REGLAS PARA RESPONDER:
      1. Responde en ESPA\xD1OL.
      2. S\xE9 preciso e inf\xF3rmate de los datos proporcionados arriba. Si te preguntan por un \xEDtem espec\xEDfico, un ISW espec\xEDfico, un bug o una m\xE9trica en particular, busca en los datos provistos y da detalles espec\xEDficos (IDs, horas, porcentajes, nombres).
      3. Mant\xE9n un tono profesional, anal\xEDtico y constructivo, pero amigable.
      4. Si la pregunta no tiene relaci\xF3n con las m\xE9tricas o no se puede responder con la informaci\xF3n proporcionada, ind\xEDcalo amablemente y ofrece ayuda sobre lo que s\xED puedes responder bas\xE1ndote en los datos.
      5. Puedes estructurar tu respuesta con vi\xF1etas o tablas markdown sencillas para mejorar la legibilidad.
    `;return i.ai.provider==="openai"?this.callOpenAI(i.ai.apiKey,i.ai.model,u):this.callGemini(i.ai.apiKey,i.ai.model,u)}callOpenAI(e,s,c){return this.http.post("https://api.openai.com/v1/chat/completions",{model:s||"gpt-4",messages:[{role:"user",content:c}]},{headers:{Authorization:`Bearer ${e}`}}).pipe(b(14e4),C({count:1,delay:2e3}),P(i=>i?.choices?.[0]?.message?.content||"Respuesta vac\xEDa de OpenAI"),h(i=>{console.error("OpenAI Error/Timeout:",i);let a=i?.name==="TimeoutError"||i?.message?.includes("timeout"),d=i?.status===401||i?.status===403;return a?p("El an\xE1lisis tard\xF3 demasiado (>90s). Intenta de nuevo; el servidor de IA puede estar ocupado."):d?p("API Key de OpenAI inv\xE1lida o sin permisos. Verifica la clave en Configuraci\xF3n."):p(`Error al contactar OpenAI (${i?.status??"sin conexi\xF3n"}). Intenta de nuevo.`)}))}callGemini(e,s,c){let i=s||"gemini-1.5-flash";return this.http.post(`https://generativelanguage.googleapis.com/v1beta/models/${i}:generateContent?key=${e}`,{contents:[{parts:[{text:c}]}]}).pipe(b(9e4),C({count:1,delay:2e3}),P(a=>a?.candidates?.[0]?.content?.parts?.[0]?.text||"Respuesta vac\xEDa de Gemini"),h(a=>{console.error("Gemini Error/Timeout:",a);let d=a?.name==="TimeoutError"||a?.message?.includes("timeout"),t=a?.status===400||a?.status===401||a?.status===403,o=a?.status===429;return d?p("El an\xE1lisis tard\xF3 demasiado (>90s). Intenta de nuevo; Gemini puede estar ocupado."):o?p("Cuota de Gemini agotada. Espera un momento e intenta de nuevo."):t?p("API Key de Gemini inv\xE1lida. Verifica la clave en Configuraci\xF3n."):p(`Error al contactar Gemini (${a?.status??"sin conexi\xF3n"}). Intenta de nuevo.`)}))}static \u0275fac=function(s){return new(s||I)};static \u0275prov=F({token:I,factory:I.\u0275fac,providedIn:"root"})};export{M as a};
