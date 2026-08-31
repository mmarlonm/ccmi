import{a as k}from"./chunk-EYHTWIUQ.js";import{D as h,L as M,R as C,dc as L,i as f,m as P,n as x,v as D}from"./chunk-TJU5QLH6.js";var j=class y{http=C(L);configService=C(k);analyzeMetrics(e,r=[],p={}){let n=this.configService.getConfig();if(!n||!n.ai.apiKey)return f("AI Configuration missing.");let a="",u=Object.keys(p);u.length>0&&(a=`
COMENTARIOS Y CONTEXTO DEL AUDITOR/SOCIOS PARA ESTE SPRINT (JUSTIFICACIONES DE NEGOCIO):
`,u.forEach(o=>{p[o]&&(a+=`- M\xE9trica o Secci\xF3n "${o}": "${p[o]}"
`)}),a+=`-> REGLA: Incorpora estas notas/comentarios especiales de forma destacada en el an\xE1lisis de la m\xE9trica correspondiente para dar explicaci\xF3n o justificar las desviaciones detectadas ante la direcci\xF3n.

`);let d=(e.developmentRate.items||[]).map(o=>{let c=(o.tasks||[]).reduce(($,g)=>$+(g.originalEstimate||0),0),m=o.effort,A=c>0?((m-c)/c*100).toFixed(1):"0";return`  - ${o.type==="Feature"?"FT":"US"} #${o.id} | Size: ${o.size} | Est. Original: ${c.toFixed(1)}h | Real: ${m.toFixed(1)}h | Var: ${A}% | ISW: ${o.isw}`}).join(`
`),l={};(e.developmentRate.items||[]).forEach(o=>{let c=o.isw||"Sin Asignar";l[c]||(l[c]={name:c,effort:0,planned:0,size:0}),l[c].effort+=o.effort,l[c].planned+=(o.tasks||[]).reduce((m,A)=>m+(A.originalEstimate||0),0),l[c].size+=o.sizeEdited!==void 0?o.sizeEdited:o.size});let E=Object.values(l).map(o=>{let c=o.size>0?(o.effort/o.size).toFixed(2):"N/A",m=o.planned>0?((o.effort-o.planned)/o.planned*100).toFixed(1):"0";return`  * ${o.name}: Tasa ${c} | Desviaci\xF3n ${m}% | Esfuerzo Real ${o.effort.toFixed(1)}h`}).join(`
`),s="Sin historial de sprints anteriores disponible.";r&&r.length>0&&(s=r.map(o=>`  - ${o.iterationName||"Sprint previo"}:
            * Tasa de Desarrollo: ${o.developmentRate.rate.toFixed(2)} (Esfuerzo: ${o.developmentRate.totalEffort.toFixed(1)}h, Size: ${o.developmentRate.totalSize})
            * Desviaci\xF3n Esfuerzo: ${Math.abs(o.effortVariance.rate*100).toFixed(1)}% (Planeado: ${o.effortVariance.planned?.toFixed(1)}h, Real: ${o.effortVariance.actual?.toFixed(1)}h)
            * Tasa de Retrabajo: ${o.rework.rate.toFixed(1)}% (Req: ${o.rework.reqEffort.toFixed(1)}h, Retrabajo: ${o.rework.totalRework.toFixed(1)}h)
            * Densidad Defectos: ${o.defectDensity.density.toFixed(3)} (Bugs: ${o.defectDensity.bugs}, Size: ${o.defectDensity.size})
            * EED: ${o.defectRemovalEfficiency.rate.toFixed(2)}% (Bugs: ${o.defectRemovalEfficiency.totalBugs}, Cerrados a Tiempo: ${o.defectRemovalEfficiency.closedOnTime})
            * Bugs Escapados: ${o.escapedBugs?.rate.toFixed(2)??"0.00"}% (Total: ${o.escapedBugs?.totalBugs??0}, Prod: ${o.escapedBugs?.bugsProd??0})
            * Ejecuci\xF3n Pruebas (Run Rate): ${o.testExecution?.rate.toFixed(2)??"0.00"}% (Total: ${o.testExecution?.totalTestPoints??0}, Ej: ${o.testExecution?.executed??0})
            * Pruebas Satisfactorias (Pass Rate): ${o.satisfactoryTests?.rate.toFixed(2)??"0.00"}% (Total: ${o.satisfactoryTests?.total??0}, Pasados: ${o.satisfactoryTests?.passedEnTiempo??0})`).join(`
`));let t=`
      Act\xFAa como un Auditor de Calidad CMMI Nivel 5 del proyecto OPE20 Bepensa. Analiza estas m\xE9tricas y devuelve el resultado en ESPA\xD1OL. 
      ${a}
      CONTEXTO DEL EQUIPO:
      - Todos los integrantes del equipo de desarrollo son ISW nivel MID (nivel intermedio).
      - No hay ISW SR (Senior) en el equipo. No menciones ISW SR en el an\xE1lisis.
      - El equipo trabaja bajo metodolog\xEDa SCRUM con sprints.

      M\xC9TRICAS DEL SPRINT ACTUAL:
      0. Cumplimiento y L\xEDnea de Tiempo del Sprint:
      ${(()=>{let o=e.developmentRate?.items||[],c=e.endDate?new Date(e.endDate).getTime():0,m=0,A=0,$=0,g=0,T=[],O=[];o.forEach(i=>{let G=["Closed","Resolved","Done","Completed"].includes(i.status),v=i.closedDate?new Date(i.closedDate).getTime():i.changedDate?new Date(i.changedDate).getTime():0,b="Abierto",R=0;G?!v||v<=c?(m++,b="A tiempo"):(A++,R=Math.max(1,Math.round((v-c)/(1e3*60*60*24))),R>g&&(g=R),b="Fase Extendida ("+R+"d retraso)",T.push("  - "+(i.type==="Feature"?"FT":"US")+" #"+i.id+" | ISW: "+i.isw+" | Cerrado: "+(i.closedDate?i.closedDate.substring(0,10):"?")+" | ~"+R+"d tarde")):$++;let q=(i.tasks||[]).map(S=>{let I=(S.completedWork||0)-(S.originalEstimate||0),V=I>0?" (Desviaci\xF3n: +"+I.toFixed(1)+"h)":I<0?" (Sub-ejecutada: "+I.toFixed(1)+"h)":" (A tiempo)";return"Tarea #"+S.id+': "'+S.title+'" (Responsable: '+(S.assignedTo||"Sin asignar")+", Est: "+(S.originalEstimate||0)+"h, Real: "+(S.completedWork||0)+"h, Estado: "+S.status+V+")"}).join("; ");O.push("  * ["+(i.type==="Feature"?"FT":"US")+" #"+i.id+'] "'+i.title+'" - ISW: '+i.isw+" | Estado: "+i.status+" | Entrega: "+b+" | Size: "+i.size+" | Tareas: ["+q+"]")});let B=e.defectRemovalEfficiency?.bugsList||[],z=e.escapedBugs?.bugsList||[],F=new Map;[...B,...z].forEach(i=>{F.set(i.bugId||i.id,i)});let U=Array.from(F.values()).map(i=>"  * [Bug #"+(i.bugId||i.id)+'] "'+i.title+'" - ISW: '+(i.isw||"Sin asignar")+" | Estado: "+i.status+" | Clasificaci\xF3n: "+(i.classification||"N/A")).join(`
`),N=m+A,w=N>0?(m/N*100).toFixed(0):"\u2014";return"         Total entregables: "+o.length+" | A tiempo: "+m+" | En Fase Extendida: "+A+" | Abiertos: "+$+`
         % Cumplimiento: `+w+"% | M\xE1x. d\xEDas de retraso: "+g+`d
         Detalle de Deliverables (Historias de Usuario / Features) y sus Tareas:
`+O.join(`
`)+`
         Detalle de Todos los Bugs de la Iteraci\xF3n:
`+(U||"Sin bugs detectados en este periodo.")})()}

      1. Tasa de Desarrollo: ${e.developmentRate.rate.toFixed(2)} 
         (Sem\xE1foro: Verde \u2264 1.70 | Amarillo 1.71\u20132.00 | Rojo > 2.00)
         Esfuerzo total: ${e.developmentRate.totalEffort?.toFixed(1)??"\u2014"} h | Size total: ${e.developmentRate.totalSize??"\u2014"}
         
         Items del sprint:
${d}

         Resumen por ISW:
${E}

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
${s}

      ESTRUCTURA REQUERIDA \u2014 para CADA m\xE9trica genera EXACTAMENTE estas secciones:
      [METRICA_INICIO: Nombre]
      (NOTA IMPORTANTE PARA LA PRIMERA M\xC9TRICA "Cumplimiento y L\xEDnea de Tiempo del Sprint" o "Cumplimiento": Para esta primera m\xE9trica, NO generes vi\xF1etas de metas, resultados, acciones correctivas ni an\xE1lisis acumulado. En su lugar, genera \xFAnicamente un an\xE1lisis de resultados muy profundo, detallado e hilado en texto libre para explicar el comportamiento temporal de las entregas y la variabilidad. Analiza OBLIGATORIAMENTE a nivel de tareas secundarias para ver por qu\xE9 se desviaron las User Stories (US) o Features (FT), identificando qu\xE9 tareas espec\xEDficas del sprint sufrieron la mayor desviaci\xF3n de esfuerzo en horas (Trabajo Real vs Estimaci\xF3n original) y explica la causa ra\xEDz t\xE9cnica/operativa bas\xE1ndote en la informaci\xF3n provista. Para el resto de las m\xE9tricas de la 1 a la 8, sigue obligatoriamente las secciones de abajo:)
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
      - NO UTILICES NINGUNA UNIDAD COMO "/PT" O "/SP": Para la m\xE9trica "4. Densidad de Defectos", no utilices jam\xE1s ninguna unidad ni sufijo como "/PT", "/pt", "/SP" o "/sp" en los resultados o an\xE1lisis. Muestra siempre los valores de las metas y resultados \xFAnicamente como n\xFAmeros decimales directos (ej: \u2264 0.18, 0.026), omitiendo cualquier menci\xF3n a PT o SP.
      - ANALIZA RESPONSABILIDADES DE TAREAS: Ten en cuenta que existe un responsable principal de la historia (ISW), pero debes identificar a las personas involucradas en las tareas secundarias (Responsable de la tarea). Por ejemplo, si la historia pertenece a Marlon pero la desviaci\xF3n de esfuerzo ocurri\xF3 en tareas secundarias asignadas a Yair, atribuye el an\xE1lisis de esa desviaci\xF3n a Yair e incl\xFAyelo en la explicaci\xF3n.
      - Para la m\xE9trica "2. Tasa de Desviaci\xF3n de Esfuerzo", el "Resultado del periodo" debe presentarse en valor absoluto (sin signo negativo, p. ej., 11.23% en lugar de -11.23%).
      - Usa nombres reales de los ISW del equipo cuando est\xE9n disponibles en la lista de items.
      - Tono profesional, anal\xEDtico y enfocado en identificar brechas de proceso.
      - Devuelve solo el texto estructurado, sin introducciones ni conclusiones generales.
    `;return n.ai.provider==="openai"?this.callOpenAI(n.ai.apiKey,n.ai.model,t):this.callGemini(n.ai.apiKey,n.ai.model,t)}generateCompletionReport(e){let r=this.configService.getConfig();if(!r||!r.ai.apiKey)return f("AI Configuration missing.");let p=[],n=0,a=0;(e.developmentRate.items||[]).forEach(c=>{let m=(c.tasks||[]).filter(g=>{let T=(g.title||"").toLowerCase();return T.includes("01.01")||T.includes("01.03")||T.includes("01.04")||T.includes("01.05")}),A=m.reduce((g,T)=>g+(T.originalEstimate||0),0),$=m.reduce((g,T)=>g+(T.completedWork||0),0);p.push(`${c.type==="Feature"?"FT":"US"} | ${c.id} | ${A.toFixed(2)} | ${$.toFixed(2)}`),n+=A,a+=$});let u=p.join(`
`),d=n,l=a,E=(d-l).toFixed(2),s=d>0?((d-l)/d*100).toFixed(2):"0.00",o=`
      Act\xFAa como el Responsable de Calidad y Planeaci\xF3n. Genera un REPORTE DE FINALIZACI\xD3N DE CONSTRUCCI\xD3N para el correo de David.
      El formato debe ser EXACTAMENTE el siguiente, llenando los datos con la informaci\xF3n proporcionada:

      Buen d\xEDa David,

      de acuerdo al proceso te env\xEDo el reporte de finalizaci\xF3n de construcci\xF3n del sprint ${e.iterationName||"Sprint X"}

      Tipo | Item | Tiempo planeado | Tiempo completado
      --- | --- | --- | ---
      ${u}
      Total | | ${d.toFixed(2)} | ${l.toFixed(2)}

      La construcci\xF3n de las historias de usuario finaliz\xF3 con una diferencia de ${Math.abs(parseFloat(E))} horas ${parseFloat(E)>0?"menos":"m\xE1s"}, lo que representa una desviaci\xF3n del ${Math.abs(parseFloat(s))}% respecto al tiempo planeado. 
      [A\xF1ade aqu\xED 2 o 3 oraciones justificando la desviaci\xF3n bas\xE1ndote en los \xEDtems analizados. Menciona los IDs espec\xEDficos de US/FT que se excedieron del tiempo planeado como causa de la desviaci\xF3n, y menciona si hubo bugs. S\xE9 anal\xEDtico y profesional.]

      Adjunto la gr\xE1fica del sprint burndown. Sin embargo, a\xFAn quedan tareas administrativas que no se han cerrado.

      REGLAS:
      - Idioma: Espa\xF1ol.
      - Mant\xE9n el formato de la tabla en Markdown para que se vea claramente.
      - La justificaci\xF3n debe ser coherente con los datos (ej: si la US 46900 tiene m\xE1s horas reales que planeadas, menci\xF3nala como causa).
    `;return r.ai.provider==="openai"?this.callOpenAI(r.ai.apiKey,r.ai.model,o):this.callGemini(r.ai.apiKey,r.ai.model,o)}analyzeGanttComparison(e){let r=this.configService.getConfig();if(!r||!r.ai.apiKey)return f("AI Configuration missing.");let p=e.items.filter(s=>s.late).slice(0,20).map(s=>`- #${s.workItemId}: Planeado ${s.plannedStart}\u2192${s.plannedEnd} | Real ${s.realStart||"N/A"}\u2192${s.realEnd||"N/A"}`).join(`
`),n=e.items.slice(0,30).map(s=>`- #${s.workItemId} | Planeado ${s.plannedStart}\u2192${s.plannedEnd} | Real ${s.realStart||"N/A"}\u2192${s.realEnd||"N/A"} | ${s.late?"Atrasado":"En tiempo"}`).join(`
`),a=e.people.slice(0,30).map(s=>`- ${s.person}: Planeado marcas=${s.plannedMarks}, Planeado items=${s.plannedItems}, Real asignaciones=${s.realAssignments}, Real items=${s.realItems}`).join(`
`),u=e.taskLayer.stageBreakdown.slice(0,20).map(s=>`- ${s.stage}: tareas=${s.taskCount}, planeado=${s.plannedHours.toFixed(1)}h, real=${s.realHours.toFixed(1)}h`).join(`
`),d=e.taskLayer.relatedItemTaskContext.slice(0,40).join(`
`),l=e.taskLayer.relatedBugTaskContext.slice(0,40).join(`
`),E=`
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
${n||"- Sin datos de \xEDtems"}

TOP ITEMS ATRASADOS
${p||"- Sin atrasos detectados"}

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
${l||"- Sin bugs/tareas hijas relacionadas"}

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
`;return r.ai.provider==="openai"?this.callOpenAI(r.ai.apiKey,r.ai.model,E):this.callGemini(r.ai.apiKey,r.ai.model,E)}askAboutMetrics(e,r,p){let n=this.configService.getConfig();if(!n||!n.ai.apiKey)return f("Configuraci\xF3n de IA no encontrada. Por favor configure su API Key en la pantalla de Configuraci\xF3n.");let a=`INFORMACI\xD3N DEL SPRINT ACTUAL:
`;a+=`- Iteraci\xF3n/Sprint: ${e.iterationName||"No especificada"}
`,e.startDate&&e.endDate&&(a+=`- Periodo: ${e.startDate} a ${e.endDate}
`),a+=`
1. TASA DE DESARROLLO:
`,a+=`- Valor: ${e.developmentRate.rate.toFixed(2)} (Sem\xE1foro: ${e.developmentRate.status})
`,a+=`- Esfuerzo Real Total: ${e.developmentRate.totalEffort?.toFixed(1)??0}h
`,a+=`- Puntos de Historia (Size) Total: ${e.developmentRate.totalSize??0}
`,a+=`- Cantidad de Items: ${e.developmentRate.totalItems??0}
`,e.developmentRate.items&&e.developmentRate.items.length>0&&(a+=`Items de Trabajo:
`,e.developmentRate.items.forEach(t=>{let o=(t.tasks||[]).reduce((c,m)=>c+(m.originalEstimate||0),0);a+=`  * [${t.type==="Feature"?"FT":"US"} #${t.id}] ${t.title} - ISW: ${t.isw} | Estado: ${t.status} | Estimado: ${o.toFixed(1)}h | Real: ${t.effort.toFixed(1)}h | Size: ${t.size}
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
`,e.defectRemovalEfficiency.bugsList.forEach(t=>{a+=`  * [Bug #${t.bugId}] ${t.title} - Asignado: ${t.isw||"Sin asignar"} | Estado: ${t.status} | Alineaci\xF3n: ${t.alignment} | Clasificaci\xF3n: ${t.classification||"N/A"}
`}));let u=e.escapedBugs;u&&(a+=`
6. BUGS ESCAPADOS:
`,a+=`- Tasa Escape: ${u.rate.toFixed(2)}% (Sem\xE1foro: ${u.status})
`,a+=`- Bugs Testing: ${u.bugsTesting??0}
`,a+=`- Bugs UAT: ${u.bugsUat??0}
`,a+=`- Bugs Producci\xF3n: ${u.bugsProd??0}
`,u.bugsList&&u.bugsList.length>0&&(a+=`Lista de Bugs Escapados:
`,u.bugsList.forEach(t=>{a+=`  * [Bug #${t.bugId}] ${t.title} - Asignado: ${t.isw||"Sin asignar"} | Estado: ${t.status} | Clasificaci\xF3n: ${t.classification}
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
`,d.testPoints.forEach(t=>{a+=`  * [Plan: ${t.planName}] Suite: ${t.suiteName} | Test Case: [#${t.testCaseId}] ${t.testCaseTitle} - Probador: ${t.tester} | Resultado: ${t.outcome} | En Tiempo: ${t.onTime?"S\xED":"No"}
`})));let l=e.satisfactoryTests;l&&(a+=`
8. PORCENTAJE DE PRUEBAS SATISFACTORIAS (KPI Pass Rate):
`,a+=`- Tasa Pruebas Satisfactorias (Pass Rate): ${l.rate.toFixed(2)}% (Sem\xE1foro: ${l.status})
`,a+=`- Total Test Points: ${l.total??0}
`,a+=`- Pasados a Tiempo (Satisfactorios): ${l.passedEnTiempo??0}
`,a+=`- Pasados Fuera de Tiempo: ${l.passedFueraDeTiempo??0}
`,a+=`- Fallidos: ${l.failed??0}
`,a+=`- Bloqueados: ${l.blocked??0}
`,a+=`- N/A: ${l.notApplicable??0}
`);let E="";p&&p.length>0&&(E=`HISTORIAL DE LA CONVERSACI\xD3N:
`,p.forEach(t=>{E+=`${t.role==="user"?"Usuario":"Asistente"}: ${t.content}
`}));let s=`
      Act\xFAa como un Asistente Virtual Experto en M\xE9tricas CMMI Nivel 5 para el proyecto OPE20 Bepensa.
      Tu objetivo es responder de manera clara, concisa y precisa a las preguntas del usuario sobre los datos y m\xE9tricas que se muestran en el dashboard actual.

      ${a}

      ${E}

      PREGUNTA DEL USUARIO:
      ${r}

      REGLAS PARA RESPONDER:
      1. Responde en ESPA\xD1OL.
      2. S\xE9 preciso e inf\xF3rmate de los datos proporcionados arriba. Si te preguntan por un \xEDtem espec\xEDfico, un ISW espec\xEDfico, un bug o una m\xE9trica en particular, busca en los datos provistos y da detalles espec\xEDficos (IDs, horas, porcentajes, nombres).
      3. Mant\xE9n un tono profesional, anal\xEDtico y constructivo, pero amigable.
      4. Si la pregunta no tiene relaci\xF3n con las m\xE9tricas o no se puede responder con la informaci\xF3n proporcionada, ind\xEDcalo amablemente y ofrece ayuda sobre lo que s\xED puedes responder bas\xE1ndote en los datos.
      5. Puedes estructurar tu respuesta con vi\xF1etas o tablas markdown sencillas para mejorar la legibilidad.
    `;return n.ai.provider==="openai"?this.callOpenAI(n.ai.apiKey,n.ai.model,s):this.callGemini(n.ai.apiKey,n.ai.model,s)}callOpenAI(e,r,p){return this.http.post("https://api.openai.com/v1/chat/completions",{model:r||"gpt-4",messages:[{role:"user",content:p}]},{headers:{Authorization:`Bearer ${e}`}}).pipe(P(14e4),h({count:1,delay:2e3}),x(n=>n?.choices?.[0]?.message?.content||"Respuesta vac\xEDa de OpenAI"),D(n=>{console.error("OpenAI Error/Timeout:",n);let a=n?.name==="TimeoutError"||n?.message?.includes("timeout"),u=n?.status===401||n?.status===403;return a?f("El an\xE1lisis tard\xF3 demasiado (>90s). Intenta de nuevo; el servidor de IA puede estar ocupado."):u?f("API Key de OpenAI inv\xE1lida o sin permisos. Verifica la clave en Configuraci\xF3n."):f(`Error al contactar OpenAI (${n?.status??"sin conexi\xF3n"}). Intenta de nuevo.`)}))}callGemini(e,r,p){let n=r||"gemini-1.5-flash";return this.http.post(`https://generativelanguage.googleapis.com/v1beta/models/${n}:generateContent?key=${e}`,{contents:[{parts:[{text:p}]}]}).pipe(P(9e4),h({count:1,delay:2e3}),x(a=>a?.candidates?.[0]?.content?.parts?.[0]?.text||"Respuesta vac\xEDa de Gemini"),D(a=>{console.error("Gemini Error/Timeout:",a);let u=a?.name==="TimeoutError"||a?.message?.includes("timeout"),d=a?.status===400||a?.status===401||a?.status===403,l=a?.status===429;return u?f("El an\xE1lisis tard\xF3 demasiado (>90s). Intenta de nuevo; Gemini puede estar ocupado."):l?f("Cuota de Gemini agotada. Espera un momento e intenta de nuevo."):d?f("API Key de Gemini inv\xE1lida. Verifica la clave en Configuraci\xF3n."):f(`Error al contactar Gemini (${a?.status??"sin conexi\xF3n"}). Intenta de nuevo.`)}))}static \u0275fac=function(r){return new(r||y)};static \u0275prov=M({token:y,factory:y.\u0275fac,providedIn:"root"})};export{j as a};
