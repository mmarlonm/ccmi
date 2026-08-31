import{a as B}from"./chunk-SRHVJMYA.js";import{F as M,N as L,T as N,fc as k,i as m,n as C,o as x,v as h,x as O}from"./chunk-UOJCRCRI.js";var z=class P{http=N(k);configService=N(B);analyzeMetrics(e,t=[],u={}){let n=this.configService.getConfig();if(!n||!n.ai.apiKey)return m("AI Configuration missing.");let o=this.buildPromptContext(e,t,u),i=`
      Act\xFAa como un Auditor de Calidad CMMI Nivel 5 del proyecto OPE20 Bepensa. Analiza estas m\xE9tricas y devuelve el resultado en ESPA\xD1OL. 
      ${o.commentsSummary}
      CONTEXTO DEL EQUIPO:
      - Todos los integrantes del equipo de desarrollo son ISW nivel MID (nivel intermedio).
      - No hay ISW SR (Senior) en el equipo. No menciones ISW SR en el an\xE1lisis.
      - El equipo trabaja bajo metodolog\xEDa SCRUM con sprints.

      M\xC9TRICAS DEL SPRINT ACTUAL:
      0. Cumplimiento y L\xEDnea de Tiempo del Sprint:
      ${o.complianceSummary}

      1. Tasa de Desarrollo: ${e.developmentRate.rate.toFixed(2)} 
         (Sem\xE1foro: Verde \u2264 1.70 | Amarillo 1.71\u20132.00 | Rojo > 2.00)
         Esfuerzo total: ${e.developmentRate.totalEffort?.toFixed(1)??"\u2014"} h | Size total: ${e.developmentRate.totalSize??"\u2014"}
         
         Items del sprint:
${o.itemSummary}

         Resumen por ISW:
${o.iswSummary}

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
${o.historySummary}

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
    `;return n.ai.provider==="openai"?this.callOpenAI(n.ai.apiKey,n.ai.model,i):this.callGemini(n.ai.apiKey,n.ai.model,i)}analyzeSingleMetric(e,t,u=[],n={}){let o=this.configService.getConfig();if(!o||!o.ai.apiKey)return m("AI Configuration missing.");let i=this.buildPromptContext(t,u,n),s="",l="",c="";switch(e){case"cumplimiento":l="Cumplimiento y L\xEDnea de Tiempo del Sprint",s=`0. Cumplimiento y L\xEDnea de Tiempo del Sprint:
${i.complianceSummary}`,c=`
      ESTRUCTURA REQUERIDA PARA ESTA M\xC9TRICA ("Cumplimiento y L\xEDnea de Tiempo del Sprint" o "Cumplimiento"):
      [METRICA_INICIO: Cumplimiento y L\xEDnea de Tiempo del Sprint]
      (NO generes vi\xF1etas de metas, resultados, acciones correctivas ni an\xE1lisis acumulado. En su lugar, genera \xFAnicamente un an\xE1lisis de resultados muy profundo, detallado e hilado en texto libre para explicar el comportamiento temporal de las entregas y la variabilidad. Analiza OBLIGATORIAMENTE a nivel de tareas secundarias para ver por qu\xE9 se desviaron las User Stories (US) o Features (FT), identificando qu\xE9 tareas espec\xEDficas del sprint sufrieron la mayor desviaci\xF3n de esfuerzo en horas (Trabajo Real vs Estimaci\xF3n original) y explica la causa ra\xEDz t\xE9cnica/operativa bas\xE1ndote en la informaci\xF3n provista.)
      [METRICA_FIN]
        `;break;case"tasa de desarrollo":case"tasaDev":l="1. Tasa de Desarrollo",s=`
      1. Tasa de Desarrollo: ${t.developmentRate.rate.toFixed(2)} 
         (Sem\xE1foro: Verde \u2264 1.70 | Amarillo 1.71\u20132.00 | Rojo > 2.00)
         Esfuerzo total: ${t.developmentRate.totalEffort?.toFixed(1)??"\u2014"} h | Size total: ${t.developmentRate.totalSize??"\u2014"}
         
         Items del sprint:
${i.itemSummary}

         Resumen por ISW:
${i.iswSummary}
        `,c=this.getStandardMetricInstruction("1. Tasa de Desarrollo");break;case"tasa de desviaci\xF3n":case"desviacion":l="2. Tasa de Desviaci\xF3n de Esfuerzo",s=`
      2. Tasa de Desviaci\xF3n de Esfuerzo: ${Math.abs(t.effortVariance.rate*100).toFixed(1)}%
         (Sem\xE1foro: Verde \u2264 15% | Amarillo 15\u201330% | Rojo > 30%)
         Esfuerzo Planeado: ${t.effortVariance.planned?.toFixed(1)??"\u2014"} h | Esfuerzo Real: ${t.effortVariance.actual?.toFixed(1)??"\u2014"} h

         Items y Tareas del Sprint:
${i.itemSummary}
        `,c=this.getStandardMetricInstruction("2. Tasa de Desviaci\xF3n de Esfuerzo");break;case"retrabajo":case"tasa de retrabajo":l="3. Tasa de Retrabajo",s=`
      3. Tasa de Retrabajo: ${t.rework.rate.toFixed(1)}%
         (Sem\xE1foro: Verde \u2264 22% | Amarillo 22\u201330% | Rojo > 30%)
         Esfuerzo Requerimiento: ${t.rework.reqEffort.toFixed(1)}h | Retrabajo Total: ${t.rework.totalRework.toFixed(1)}h
        `,c=this.getStandardMetricInstruction("3. Tasa de Retrabajo");break;case"densidad de defectos":case"densidad":l="4. Densidad de Defectos",s=`
      4. Densidad de Defectos: ${t.defectDensity.density.toFixed(3)}
         (Sem\xE1foro: Verde \u2264 0.18 | Amarillo 0.18\u20130.23 | Rojo > 0.23)
         Bugs Totales: ${t.defectDensity.bugs} | Size Total: ${t.defectDensity.size}
        `,c=this.getStandardMetricInstruction("4. Densidad de Defectos");break;case"eed":case"eficiencia de eliminaci\xF3n de defectos":l="5. Eficiencia en la Eliminaci\xF3n de Defectos (EED)",s=`
      5. Eficiencia en la Eliminaci\xF3n de Defectos (EED): ${t.defectRemovalEfficiency.rate.toFixed(2)}%
         (Sem\xE1foro: Verde \u2265 81% | Amarillo 71%\u201380% | Rojo < 71%)
         Total Bugs: ${t.defectRemovalEfficiency.totalBugs} | Closed en Tiempo: ${t.defectRemovalEfficiency.closedOnTime} | Closed fuera de Tiempo: ${t.defectRemovalEfficiency.closedLate}
        `,c=this.getStandardMetricInstruction("5. Eficiencia en la Eliminaci\xF3n de Defectos (EED)");break;case"escaped":case"bugs escapados":l="6. Porcentaje de Bugs Escapados",s=`
      6. Porcentaje de Bugs Escapados: ${t.escapedBugs?.rate.toFixed(2)??"0.00"}%
         (Sem\xE1foro: Verde \u2264 33% | Amarillo 33%\u201340% | Rojo > 40%)
         Bugs Testing: ${t.escapedBugs?.bugsTesting??0} | Bugs UAT: ${t.escapedBugs?.bugsUat??0} | Bugs Producci\xF3n: ${t.escapedBugs?.bugsProd??0} | Total Bugs: ${t.escapedBugs?.totalBugs??0}
        `,c=this.getStandardMetricInstruction("6. Porcentaje de Bugs Escapados");break;case"testExecution":case"ejecuci\xF3n de pruebas":case"runRate":l="7. Porcentaje de Ejecuci\xF3n de Pruebas (Run Rate)",s=`
      7. Porcentaje de Ejecuci\xF3n de Pruebas (Run Rate): ${t.testExecution?.rate.toFixed(2)??"0.00"}%
         (Sem\xE1foro: Verde \u2265 90% | Amarillo 80%\u201389% | Rojo < 80%)
         Total Test Points: ${t.testExecution?.totalTestPoints??0} | Ejecutados: ${t.testExecution?.executed??0} | Pasados a Tiempo: ${t.testExecution?.passedEnTiempo??0} | Pasados Fuera de Tiempo: ${t.testExecution?.passedFueraDeTiempo??0} | Fallidos: ${t.testExecution?.failed??0} | Bloqueados: ${t.testExecution?.blocked??0} | N/A: ${t.testExecution?.notApplicable??0}
        `,c=this.getStandardMetricInstruction("7. Porcentaje de Ejecuci\xF3n de Pruebas (Run Rate)");break;case"satisfactoryTests":case"pruebas satisfactorias":case"passRate":l="8. Porcentaje de Pruebas Satisfactorias (Pass Rate)",s=`
      8. Porcentaje de Pruebas Satisfactorias (Pass Rate): ${t.satisfactoryTests?.rate.toFixed(2)??"0.00"}%
         (Sem\xE1foro: Verde \u2265 90% | Amarillo 80%\u201389% | Rojo < 80%)
         Total Test Points: ${t.satisfactoryTests?.total??0} | Pasados a Tiempo (Satisfactorios): ${t.satisfactoryTests?.passedEnTiempo??0} | Pasados Fuera de Tiempo: ${t.satisfactoryTests?.passedFueraDeTiempo??0} | Fallidos: ${t.satisfactoryTests?.failed??0} | Bloqueados: ${t.satisfactoryTests?.blocked??0} | N/A: ${t.satisfactoryTests?.notApplicable??0}
        `,c=this.getStandardMetricInstruction("8. Porcentaje de Pruebas Satisfactorias (Pass Rate)");break;default:return this.analyzeMetrics(t,u,n)}let r=`
      Act\xFAa como un Auditor de Calidad CMMI Nivel 5 del proyecto OPE20 Bepensa. Analiza \xDANICAMENTE la m\xE9trica "${l}" y devuelve el resultado en ESPA\xD1OL. 
      ${i.commentsSummary}
      CONTEXTO DEL EQUIPO:
      - Todos los integrantes del equipo de desarrollo son ISW nivel MID (nivel intermedio).
      - No hay ISW SR (Senior) en el equipo. No menciones ISW SR en el an\xE1lisis.
      - El equipo trabaja bajo metodolog\xEDa SCRUM con sprints.

      DATOS DE LA M\xC9TRICA:
      ${s}

      HISTORIAL DE SPRINTS ANTERIORES PARA C\xC1LCULO ACUMULADO REAL:
      ${i.historySummary}

      ${c}

      REGLAS IMPORTANTES:
      - S\xC9 EXIGENTE: Como auditor CMMI5, tu objetivo es la perfecci\xF3n estad\xEDstica.
      - NO menciones ISW SR, no existe en este equipo. Solo ISW MID.
      - NO UTILICES NINGUNA UNIDAD COMO "/PT" O "/SP": Para la m\xE9trica "4. Densidad de Defectos", no utilices jam\xE1s ninguna unidad ni sufijo como "/PT", "/pt", "/SP" o "/sp" en los resultados o an\xE1lisis. Muestra siempre los valores de las metas y resultados \xFAnicamente como n\xFAmeros decimales directos (ej: \u2264 0.18, 0.026), omitiendo cualquier menci\xF3n a PT o SP.
      - ANALIZA RESPONSABILIDADES DE TAREAS: Ten en cuenta que existe un responsable principal de la historia (ISW), pero debes identificar a las personas involucradas en las tareas secundarias (Responsable de la tarea).
      - Para la m\xE9trica "2. Tasa de Desviaci\xF3n de Esfuerzo", el "Resultado del periodo" debe presentarse en valor absoluto (sin signo negativo, p. ej., 11.23% en lugar de -11.23%).
      - Usa nombres reales de los ISW del equipo cuando est\xE9n disponibles en la lista de items.
      - Tono profesional, anal\xEDtico y enfocado en identificar brechas de proceso.
      - Devuelve SOLO el bloque de la m\xE9trica formateado con [METRICA_INICIO: ...] y [METRICA_FIN], sin introducciones ni conclusiones generales.
    `;return o.ai.provider==="openai"?this.callOpenAI(o.ai.apiKey,o.ai.model,r):this.callGemini(o.ai.apiKey,o.ai.model,r)}getStandardMetricInstruction(e){return`
      ESTRUCTURA REQUERIDA \u2014 genera EXACTAMENTE estas secciones delimitadas:
      [METRICA_INICIO: ${e}]
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
    `}buildPromptContext(e,t=[],u={}){let n="",o=Object.keys(u);o.length>0&&(n=`
COMENTARIOS Y CONTEXTO DEL AUDITOR/SOCIOS PARA ESTE SPRINT (JUSTIFICACIONES DE NEGOCIO):
`,o.forEach(a=>{u[a]&&(n+=`- M\xE9trica o Secci\xF3n "${a}": "${u[a]}"
`)}),n+=`-> REGLA: Incorpora estas notas/comentarios especiales de forma destacada en el an\xE1lisis de la m\xE9trica correspondiente para dar explicaci\xF3n o justificar las desviaciones detectadas ante la direcci\xF3n.

`);let i=(e.developmentRate?.items||[]).map(a=>{let p=(a.tasks||[]).reduce(($,D)=>$+(D.originalEstimate||0),0),E=a.effort,I=p>0?((E-p)/p*100).toFixed(1):"0";return`  - ${a.type==="Feature"?"FT":"US"} #${a.id} | Size: ${a.size} | Est. Original: ${p.toFixed(1)}h | Real: ${E.toFixed(1)}h | Var: ${I}% | ISW: ${a.isw}`}).join(`
`),s={};(e.developmentRate?.items||[]).forEach(a=>{let p=a.isw||"Sin Asignar";s[p]||(s[p]={name:p,effort:0,planned:0,size:0}),s[p].effort+=a.effort,s[p].planned+=(a.tasks||[]).reduce((E,I)=>E+(I.originalEstimate||0),0),s[p].size+=a.sizeEdited!==void 0?a.sizeEdited:a.size});let l=Object.values(s).map(a=>{let p=a.size>0?(a.effort/a.size).toFixed(2):"N/A",E=a.planned>0?((a.effort-a.planned)/a.planned*100).toFixed(1):"0";return`  * ${a.name}: Tasa ${p} | Desviaci\xF3n ${E}% | Esfuerzo Real ${a.effort.toFixed(1)}h`}).join(`
`),c="Sin historial de sprints anteriores disponible.";t&&t.length>0&&(c=t.map(a=>`  - ${a.iterationName||"Sprint previo"}:
            * Tasa de Desarrollo: ${a.developmentRate.rate.toFixed(2)} (Esfuerzo: ${a.developmentRate.totalEffort.toFixed(1)}h, Size: ${a.developmentRate.totalSize})
            * Desviaci\xF3n Esfuerzo: ${Math.abs(a.effortVariance.rate*100).toFixed(1)}% (Planeado: ${a.effortVariance.planned?.toFixed(1)}h, Real: ${a.effortVariance.actual?.toFixed(1)}h)
            * Tasa de Retrabajo: ${a.rework.rate.toFixed(1)}% (Req: ${a.rework.reqEffort.toFixed(1)}h, Retrabajo: ${a.rework.totalRework.toFixed(1)}h)
            * Densidad Defectos: ${a.defectDensity.density.toFixed(3)} (Bugs: ${a.defectDensity.bugs}, Size: ${a.defectDensity.size})
            * EED: ${a.defectRemovalEfficiency.rate.toFixed(2)}% (Bugs: ${a.defectRemovalEfficiency.totalBugs}, Cerrados a Tiempo: ${a.defectRemovalEfficiency.closedOnTime})
            * Bugs Escapados: ${a.escapedBugs?.rate.toFixed(2)??"0.00"}% (Total: ${a.escapedBugs?.totalBugs??0}, Prod: ${a.escapedBugs?.bugsProd??0})
            * Ejecuci\xF3n Pruebas (Run Rate): ${a.testExecution?.rate.toFixed(2)??"0.00"}% (Total: ${a.testExecution?.totalTestPoints??0}, Ej: ${a.testExecution?.executed??0})
            * Pruebas Satisfactorias (Pass Rate): ${a.satisfactoryTests?.rate.toFixed(2)??"0.00"}% (Total: ${a.satisfactoryTests?.total??0}, Pasados: ${a.satisfactoryTests?.passedEnTiempo??0})`).join(`
`));let r=e.developmentRate?.items||[],d=e.endDate?new Date(e.endDate).getTime():0,T=0,S=0,R=0,b=0,y=[],g=[];r.forEach(a=>{let p=["Closed","Resolved","Done","Completed"].includes(a.status),E=a.closedDate?new Date(a.closedDate).getTime():a.changedDate?new Date(a.changedDate).getTime():0,I="Abierto",$=0;p?!E||E<=d?(T++,I="A tiempo"):(S++,$=Math.max(1,Math.round((E-d)/(1e3*60*60*24))),$>b&&(b=$),I="Fase Extendida ("+$+"d retraso)",y.push("  - "+(a.type==="Feature"?"FT":"US")+" #"+a.id+" | ISW: "+a.isw+" | Cerrado: "+(a.closedDate?a.closedDate.substring(0,10):"?")+" | ~"+$+"d tarde")):R++;let D=(a.tasks||[]).map(A=>{let v=(A.completedWork||0)-(A.originalEstimate||0),V=v>0?" (Desviaci\xF3n: +"+v.toFixed(1)+"h)":v<0?" (Sub-ejecutada: "+v.toFixed(1)+"h)":" (A tiempo)";return"Tarea #"+A.id+': "'+A.title+'" (Responsable: '+(A.assignedTo||"Sin asignar")+", Est: "+(A.originalEstimate||0)+"h, Real: "+(A.completedWork||0)+"h, Estado: "+A.status+V+")"}).join("; ");g.push("  * ["+(a.type==="Feature"?"FT":"US")+" #"+a.id+'] "'+a.title+'" - ISW: '+a.isw+" | Estado: "+a.status+" | Entrega: "+I+" | Size: "+a.size+" | Tareas: ["+D+"]")});let f=e.defectRemovalEfficiency?.bugsList||[],U=e.escapedBugs?.bugsList||[],F=new Map;[...f,...U].forEach(a=>{F.set(a.bugId||a.id,a)});let w=Array.from(F.values()).map(a=>"  * [Bug #"+(a.bugId||a.id)+'] "'+a.title+'" - ISW: '+(a.isw||"Sin asignar")+" | Estado: "+a.status+" | Clasificaci\xF3n: "+(a.classification||"N/A")).join(`
`),j=T+S,q=j>0?(T/j*100).toFixed(0):"\u2014",G="         Total entregables: "+r.length+" | A tiempo: "+T+" | En Fase Extendida: "+S+" | Abiertos: "+R+`
         % Cumplimiento: `+q+"% | M\xE1x. d\xEDas de retraso: "+b+`d
         Detalle de Deliverables (Historias de Usuario / Features) y sus Tareas:
`+g.join(`
`)+`
         Detalle de Todos los Bugs de la Iteraci\xF3n:
`+(w||"Sin bugs detectados en este periodo.");return{commentsSummary:n,itemSummary:i,iswSummary:l,historySummary:c,complianceSummary:G}}generateCompletionReport(e){let t=this.configService.getConfig();if(!t||!t.ai.apiKey)return m("AI Configuration missing.");let u=[],n=0,o=0;(e.developmentRate.items||[]).forEach(S=>{let R=(S.tasks||[]).filter(g=>{let f=(g.title||"").toLowerCase();return f.includes("01.01")||f.includes("01.03")||f.includes("01.04")||f.includes("01.05")}),b=R.reduce((g,f)=>g+(f.originalEstimate||0),0),y=R.reduce((g,f)=>g+(f.completedWork||0),0);u.push(`${S.type==="Feature"?"FT":"US"} | ${S.id} | ${b.toFixed(2)} | ${y.toFixed(2)}`),n+=b,o+=y});let i=u.join(`
`),s=n,l=o,c=(s-l).toFixed(2),r=s>0?((s-l)/s*100).toFixed(2):"0.00",T=`
      Act\xFAa como el Responsable de Calidad y Planeaci\xF3n. Genera un REPORTE DE FINALIZACI\xD3N DE CONSTRUCCI\xD3N para el correo de David.
      El formato debe ser EXACTAMENTE el siguiente, llenando los datos con la informaci\xF3n proporcionada:

      Buen d\xEDa David,

      de acuerdo al proceso te env\xEDo el reporte de finalizaci\xF3n de construcci\xF3n del sprint ${e.iterationName||"Sprint X"}

      Tipo | Item | Tiempo planeado | Tiempo completado
      --- | --- | --- | ---
      ${i}
      Total | | ${s.toFixed(2)} | ${l.toFixed(2)}

      La construcci\xF3n de las historias de usuario finaliz\xF3 con una diferencia de ${Math.abs(parseFloat(c))} horas ${parseFloat(c)>0?"menos":"m\xE1s"}, lo que representa una desviaci\xF3n del ${Math.abs(parseFloat(r))}% respecto al tiempo planeado. 
      [A\xF1ade aqu\xED 2 o 3 oraciones justificando la desviaci\xF3n bas\xE1ndote en los \xEDtems analizados. Menciona los IDs espec\xEDficos de US/FT que se excedieron del tiempo planeado como causa de la desviaci\xF3n, y menciona si hubo bugs. S\xE9 anal\xEDtico y profesional.]

      Adjunto la gr\xE1fica del sprint burndown. Sin embargo, a\xFAn quedan tareas administrativas que no se han cerrado.

      REGLAS:
      - Idioma: Espa\xF1ol.
      - Mant\xE9n el formato de la tabla en Markdown para que se vea claramente.
      - La justificaci\xF3n debe ser coherente con los datos (ej: si la US 46900 tiene m\xE1s horas reales que planeadas, menci\xF3nala como causa).
    `;return t.ai.provider==="openai"?this.callOpenAI(t.ai.apiKey,t.ai.model,T):this.callGemini(t.ai.apiKey,t.ai.model,T)}analyzeGanttComparison(e){let t=this.configService.getConfig();if(!t||!t.ai.apiKey)return m("AI Configuration missing.");let u=e.items.filter(r=>r.late).slice(0,20).map(r=>`- #${r.workItemId}: Planeado ${r.plannedStart}\u2192${r.plannedEnd} | Real ${r.realStart||"N/A"}\u2192${r.realEnd||"N/A"}`).join(`
`),n=e.items.slice(0,30).map(r=>`- #${r.workItemId} | Planeado ${r.plannedStart}\u2192${r.plannedEnd} | Real ${r.realStart||"N/A"}\u2192${r.realEnd||"N/A"} | ${r.late?"Atrasado":"En tiempo"}`).join(`
`),o=e.people.slice(0,30).map(r=>`- ${r.person}: Planeado marcas=${r.plannedMarks}, Planeado items=${r.plannedItems}, Real asignaciones=${r.realAssignments}, Real items=${r.realItems}`).join(`
`),i=e.taskLayer.stageBreakdown.slice(0,20).map(r=>`- ${r.stage}: tareas=${r.taskCount}, planeado=${r.plannedHours.toFixed(1)}h, real=${r.realHours.toFixed(1)}h`).join(`
`),s=e.taskLayer.relatedItemTaskContext.slice(0,40).join(`
`),l=e.taskLayer.relatedBugTaskContext.slice(0,40).join(`
`),c=`
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
${u||"- Sin atrasos detectados"}

COMPARACI\xD3N POR PERSONA
${o||"- Sin datos por persona"}

CAPA DE TAREAS (ADO) PARA ITEMS CON MATCH
- Items con tareas: ${e.taskLayer.matchedItemsWithTasks}
- Horas planeadas (tareas): ${e.taskLayer.totalPlannedTaskHours.toFixed(1)}h
- Horas reales (tareas): ${e.taskLayer.totalRealTaskHours.toFixed(1)}h
- Posibles violaciones de dependencia temporal: ${e.taskLayer.dependencyViolations}
- Tareas administrativas: ${e.taskLayer.adminTaskCount} (Plan=${e.taskLayer.adminPlannedHours.toFixed(1)}h, Real=${e.taskLayer.adminRealHours.toFixed(1)}h)

DESGLOSE POR ETAPA (TAREAS)
${i||"- Sin desglose por etapa"}

CONTEXTO AMPLIADO POR ITEM PADRE (TAREAS RELACIONADAS)
${s||"- Sin tareas adicionales relacionadas por padre"}

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
`;return t.ai.provider==="openai"?this.callOpenAI(t.ai.apiKey,t.ai.model,c):this.callGemini(t.ai.apiKey,t.ai.model,c)}askAboutMetrics(e,t,u){let n=this.configService.getConfig();if(!n||!n.ai.apiKey)return m("Configuraci\xF3n de IA no encontrada. Por favor configure su API Key en la pantalla de Configuraci\xF3n.");let o=`INFORMACI\xD3N DEL SPRINT ACTUAL:
`;o+=`- Iteraci\xF3n/Sprint: ${e.iterationName||"No especificada"}
`,e.startDate&&e.endDate&&(o+=`- Periodo: ${e.startDate} a ${e.endDate}
`),o+=`
1. TASA DE DESARROLLO:
`,o+=`- Valor: ${e.developmentRate.rate.toFixed(2)} (Sem\xE1foro: ${e.developmentRate.status})
`,o+=`- Esfuerzo Real Total: ${e.developmentRate.totalEffort?.toFixed(1)??0}h
`,o+=`- Puntos de Historia (Size) Total: ${e.developmentRate.totalSize??0}
`,o+=`- Cantidad de Items: ${e.developmentRate.totalItems??0}
`,e.developmentRate.items&&e.developmentRate.items.length>0&&(o+=`Items de Trabajo:
`,e.developmentRate.items.forEach(d=>{let T=(d.tasks||[]).reduce((S,R)=>S+(R.originalEstimate||0),0);o+=`  * [${d.type==="Feature"?"FT":"US"} #${d.id}] ${d.title} - ISW: ${d.isw} | Estado: ${d.status} | Estimado: ${T.toFixed(1)}h | Real: ${d.effort.toFixed(1)}h | Size: ${d.size}
`})),o+=`
2. DESVIACI\xD3N DE ESFUERZO:
`,o+=`- Tasa Desviaci\xF3n: ${(e.effortVariance.rate*100).toFixed(1)}% (Sem\xE1foro: ${e.effortVariance.status})
`,o+=`- Esfuerzo Planeado: ${e.effortVariance.planned?.toFixed(1)??0}h
`,o+=`- Esfuerzo Real: ${e.effortVariance.actual?.toFixed(1)??0}h
`,o+=`
3. TASA DE RETRABAJO:
`,o+=`- Tasa Retrabajo: ${e.rework.rate.toFixed(1)}% (Sem\xE1foro: ${e.rework.status})
`,o+=`- Esfuerzo Requerimientos: ${e.rework.reqEffort?.toFixed(1)??0}h
`,o+=`- Retrabajo Total: ${e.rework.totalRework?.toFixed(1)??0}h
`,o+=`
4. DENSIDAD DE DEFECTOS:
`,o+=`- Densidad: ${e.defectDensity.density.toFixed(3)} (Sem\xE1foro: ${e.defectDensity.status})
`,o+=`- Bugs Totales: ${e.defectDensity.bugs??0}
`,o+=`- Size Total: ${e.defectDensity.size??0}
`,o+=`
5. EFICIENCIA EN ELIMINACI\xD3N DE DEFECTOS (EED):
`,o+=`- Eficiencia: ${e.defectRemovalEfficiency.rate.toFixed(2)}% (Sem\xE1foro: ${e.defectRemovalEfficiency.status})
`,o+=`- Bugs Cerrados a Tiempo: ${e.defectRemovalEfficiency.closedOnTime??0}
`,o+=`- Bugs Cerrados Fuera de Tiempo: ${e.defectRemovalEfficiency.closedLate??0}
`,e.defectRemovalEfficiency.bugsList&&e.defectRemovalEfficiency.bugsList.length>0&&(o+=`Lista de Bugs EED:
`,e.defectRemovalEfficiency.bugsList.forEach(d=>{o+=`  * [Bug #${d.bugId}] ${d.title} - Asignado: ${d.isw||"Sin asignar"} | Estado: ${d.status} | Alineaci\xF3n: ${d.alignment} | Clasificaci\xF3n: ${d.classification||"N/A"}
`}));let i=e.escapedBugs;i&&(o+=`
6. BUGS ESCAPADOS:
`,o+=`- Tasa Escape: ${i.rate.toFixed(2)}% (Sem\xE1foro: ${i.status})
`,o+=`- Bugs Testing: ${i.bugsTesting??0}
`,o+=`- Bugs UAT: ${i.bugsUat??0}
`,o+=`- Bugs Producci\xF3n: ${i.bugsProd??0}
`,i.bugsList&&i.bugsList.length>0&&(o+=`Lista de Bugs Escapados:
`,i.bugsList.forEach(d=>{o+=`  * [Bug #${d.bugId}] ${d.title} - Asignado: ${d.isw||"Sin asignar"} | Estado: ${d.status} | Clasificaci\xF3n: ${d.classification}
`})));let s=e.testExecution;s&&(o+=`
7. EJECUCI\xD3N DE PRUEBAS:
`,o+=`- Tasa Ejecuci\xF3n: ${s.rate.toFixed(2)}% (Sem\xE1foro: ${s.status})
`,o+=`- Total Test Points: ${s.totalTestPoints??0}
`,o+=`- Ejecutados: ${s.executed??0}
`,o+=`- Pasados a Tiempo: ${s.passedEnTiempo??0}
`,o+=`- Pasados Fuera de Tiempo: ${s.passedFueraDeTiempo??0}
`,o+=`- Fallidos: ${s.failed??0}
`,o+=`- Bloqueados: ${s.blocked??0}
`,s.testPoints&&s.testPoints.length>0&&(o+=`Detalle de Puntos de Prueba:
`,s.testPoints.forEach(d=>{o+=`  * [Plan: ${d.planName}] Suite: ${d.suiteName} | Test Case: [#${d.testCaseId}] ${d.testCaseTitle} - Probador: ${d.tester} | Resultado: ${d.outcome} | En Tiempo: ${d.onTime?"S\xED":"No"}
`})));let l=e.satisfactoryTests;l&&(o+=`
8. PORCENTAJE DE PRUEBAS SATISFACTORIAS (KPI Pass Rate):
`,o+=`- Tasa Pruebas Satisfactorias (Pass Rate): ${l.rate.toFixed(2)}% (Sem\xE1foro: ${l.status})
`,o+=`- Total Test Points: ${l.total??0}
`,o+=`- Pasados a Tiempo (Satisfactorios): ${l.passedEnTiempo??0}
`,o+=`- Pasados Fuera de Tiempo: ${l.passedFueraDeTiempo??0}
`,o+=`- Fallidos: ${l.failed??0}
`,o+=`- Bloqueados: ${l.blocked??0}
`,o+=`- N/A: ${l.notApplicable??0}
`);let c="";u&&u.length>0&&(c=`HISTORIAL DE LA CONVERSACI\xD3N:
`,u.forEach(d=>{c+=`${d.role==="user"?"Usuario":"Asistente"}: ${d.content}
`}));let r=`
      Act\xFAa como un Asistente Virtual Experto en M\xE9tricas CMMI Nivel 5 para el proyecto OPE20 Bepensa.
      Tu objetivo es responder de manera clara, concisa y precisa a las preguntas del usuario sobre los datos y m\xE9tricas que se muestran en el dashboard actual.

      ${o}

      ${c}

      PREGUNTA DEL USUARIO:
      ${t}

      REGLAS PARA RESPONDER:
      1. Responde en ESPA\xD1OL.
      2. S\xE9 preciso e inf\xF3rmate de los datos proporcionados arriba. Si te preguntan por un \xEDtem espec\xEDfico, un ISW espec\xEDfico, un bug o una m\xE9trica en particular, busca en los datos provistos y da detalles espec\xEDficos (IDs, horas, porcentajes, nombres).
      3. Mant\xE9n un tono profesional, anal\xEDtico y constructivo, pero amigable.
      4. Si la pregunta no tiene relaci\xF3n con las m\xE9tricas o no se puede responder con la informaci\xF3n proporcionada, ind\xEDcalo amablemente y ofrece ayuda sobre lo que s\xED puedes responder bas\xE1ndote en los datos.
      5. Puedes estructurar tu respuesta con vi\xF1etas o tablas markdown sencillas para mejorar la legibilidad.
    `;return n.ai.provider==="openai"?this.callOpenAI(n.ai.apiKey,n.ai.model,r):this.callGemini(n.ai.apiKey,n.ai.model,r)}callOpenAI(e,t,u){return this.http.post("https://api.openai.com/v1/chat/completions",{model:t||"gpt-4",messages:[{role:"user",content:u}]},{headers:{Authorization:`Bearer ${e}`}}).pipe(C(14e4),M({count:1,delay:2e3}),x(n=>n?.choices?.[0]?.message?.content||"Respuesta vac\xEDa de OpenAI"),O(n=>{console.error("OpenAI Error/Timeout:",n);let o=n?.name==="TimeoutError"||n?.message?.includes("timeout"),i=n?.status===401||n?.status===403;return o?m("El an\xE1lisis tard\xF3 demasiado (>90s). Intenta de nuevo; el servidor de IA puede estar ocupado."):i?m("API Key de OpenAI inv\xE1lida o sin permisos. Verifica la clave en Configuraci\xF3n."):m(`Error al contactar OpenAI (${n?.status??"sin conexi\xF3n"}). Intenta de nuevo.`)}))}callGemini(e,t,u){let n=(t||"gemini-1.5-flash").trim(),o=n;return n.startsWith("models/")&&(o=n.replace("models/","")),this.http.post(`https://generativelanguage.googleapis.com/v1beta/models/${o}:generateContent?key=${e}`,{contents:[{parts:[{text:u}]}]}).pipe(C(9e4),M({count:3,delay:(i,s)=>i?.status===429?(console.warn(`Gemini API 429 Rate Limit (Cuota/L\xEDmite excedido). Reintentando en ${s*2}.5s (Intento ${s}/3)...`),h(s*2500)):h(2e3)}),x(i=>i?.candidates?.[0]?.content?.parts?.[0]?.text||"Respuesta vac\xEDa de Gemini"),O(i=>{console.error("Gemini Error/Timeout:",i);let s=i?.name==="TimeoutError"||i?.message?.includes("timeout"),l=i?.status===400||i?.status===401||i?.status===403;return i?.status===429?m("Cuota/L\xEDmite de Gemini agotado (Error 429: Too Many Requests). Espera 30 segundos o cambia de modelo/proveedor en Configuraci\xF3n."):s?m("El an\xE1lisis tard\xF3 demasiado (>90s). Intenta de nuevo; Gemini puede estar ocupado."):l?m(`Error en Gemini (${i?.error?.error?.message||"API Key o Modelo no v\xE1lido"}). Verifica la clave y modelo en Configuraci\xF3n.`):m(`Error al contactar Gemini (${i?.status??"sin conexi\xF3n"}). Intenta de nuevo.`)}))}static \u0275fac=function(t){return new(t||P)};static \u0275prov=L({token:P,factory:P.\u0275fac,providedIn:"root"})};export{z as a};
