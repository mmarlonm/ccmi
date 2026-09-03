import{a as B}from"./chunk-NKLAHAUQ.js";import{G as M,O as L,U as N,j as m,o as C,p as h,qc as k,w as x,y as O}from"./chunk-TUR36GAB.js";var z=class P{http=N(k);configService=N(B);analyzeMetrics(e,t=[],u={}){let d=this.configService.getConfig();if(!d||!d.ai.apiKey)return m("AI Configuration missing.");let a=this.buildPromptContext(e,t,u),s=`
      Act\xFAa como un Auditor de Calidad CMMI Nivel 5 del proyecto OPE20 Bepensa. Analiza estas m\xE9tricas y devuelve el resultado en ESPA\xD1OL. 
      ${a.commentsSummary}
      CONTEXTO DEL EQUIPO:
      - Todos los integrantes del equipo de desarrollo son ISW nivel MID (nivel intermedio).
      - No hay ISW SR (Senior) en el equipo. No menciones ISW SR en el an\xE1lisis.
      - El equipo trabaja bajo metodolog\xEDa SCRUM con sprints.

      M\xC9TRICAS DEL SPRINT ACTUAL:
      0. Cumplimiento y L\xEDnea de Tiempo del Sprint:
      ${a.complianceSummary}

      1. Tasa de Desarrollo: ${e.developmentRate.rate.toFixed(2)} 
         (Sem\xE1foro: Verde \u2264 1.70 | Amarillo 1.71\u20132.00 | Rojo > 2.00)
         Esfuerzo total: ${e.developmentRate.totalEffort?.toFixed(1)??"\u2014"} h | Size total: ${e.developmentRate.totalSize??"\u2014"}
         
         Items del sprint:
${a.itemSummary}

         Resumen por ISW:
${a.iswSummary}

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
${a.historySummary}

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
      - PROHIBIDO USAR ASTERISCOS **: No incluyas nunca el s\xEDmbolo ** ni formato markdown de negritas. Escribe todas las etiquetas y frases en texto directo (ejemplo: "Meta establecida para el periodo:" en lugar de "**Meta establecida para el periodo:**").
      - S\xC9 EXIGENTE: Como auditor CMMI5, tu objetivo es la perfecci\xF3n estad\xEDstica. Si un \xEDtem se desv\xEDa, se\xF1\xE1lalo aunque el promedio global sea bueno.
      - NO menciones ISW SR, no existe en este equipo. Solo ISW MID.
      - NO UTILICES NINGUNA UNIDAD COMO "/PT" O "/SP": Para la m\xE9trica "4. Densidad de Defectos", no utilices jam\xE1s ninguna unidad ni sufijo como "/PT", "/pt", "/SP" o "/sp" en los resultados o an\xE1lisis. Muestra siempre los valores de las metas y resultados \xFAnicamente como n\xFAmeros decimales directos (ej: \u2264 0.18, 0.026), omitiendo cualquier menci\xF3n a PT o SP.
      - ANALIZA RESPONSABILIDADES DE TAREAS: Ten en cuenta que existe un responsable principal de la historia (ISW), pero debes identificar a las personas involucradas en las tareas secundarias (Responsable de la tarea). Por ejemplo, si la historia pertenece a Marlon pero la desviaci\xF3n de esfuerzo ocurri\xF3 en tareas secundarias asignadas a Yair, atribuye el an\xE1lisis de esa desviaci\xF3n a Yair e incl\xFAyelo en la explicaci\xF3n.
      - Para la m\xE9trica "2. Tasa de Desviaci\xF3n de Esfuerzo", el "Resultado del periodo" debe presentarse en valor absoluto (sin signo negativo, p. ej., 11.23% en lugar de -11.23%).
      - Usa nombres reales de los ISW del equipo cuando est\xE9n disponibles en la lista de items.
      - Tono profesional, anal\xEDtico y enfocado en identificar brechas de proceso.
      - Devuelve solo el texto estructurado, sin introducciones ni conclusiones generales.
    `;return d.ai.provider==="openai"?this.callOpenAI(d.ai.apiKey,d.ai.model,s):this.callGemini(d.ai.apiKey,d.ai.model,s)}analyzeSingleMetric(e,t,u=[],d={}){let a=this.configService.getConfig();if(!a||!a.ai.apiKey)return m("AI Configuration missing.");let s=this.buildPromptContext(t,u,d),i="",l="",c="";switch(e){case"cumplimiento":l="Cumplimiento y L\xEDnea de Tiempo del Sprint",i=`0. Cumplimiento y L\xEDnea de Tiempo del Sprint:
${s.complianceSummary}`,c=`
      ESTRUCTURA REQUERIDA PARA ESTA M\xC9TRICA ("Cumplimiento y L\xEDnea de Tiempo del Sprint" o "Cumplimiento"):
      [METRICA_INICIO: Cumplimiento y L\xEDnea de Tiempo del Sprint]
      (NO generes vi\xF1etas de metas, resultados, acciones correctivas ni an\xE1lisis acumulado. En su lugar, genera \xFAnicamente un an\xE1lisis de resultados muy profundo, detallado e hilado en texto libre para explicar el comportamiento temporal de las entregas y la variabilidad. Analiza OBLIGATORIAMENTE a nivel de tareas secundarias para ver por qu\xE9 se desviaron las User Stories (US) o Features (FT), identificando qu\xE9 tareas espec\xEDficas del sprint sufrieron la mayor desviaci\xF3n de esfuerzo en horas (Trabajo Real vs Estimaci\xF3n original) y explica la causa ra\xEDz t\xE9cnica/operativa bas\xE1ndote en la informaci\xF3n provista.)
      [METRICA_FIN]
        `;break;case"tasa de desarrollo":case"tasaDev":l="1. Tasa de Desarrollo",i=`
      1. Tasa de Desarrollo: ${t.developmentRate.rate.toFixed(2)} 
         (Sem\xE1foro: Verde \u2264 1.70 | Amarillo 1.71\u20132.00 | Rojo > 2.00)
         Esfuerzo total: ${t.developmentRate.totalEffort?.toFixed(1)??"\u2014"} h | Size total: ${t.developmentRate.totalSize??"\u2014"}
         
         Items del sprint:
${s.itemSummary}

         Resumen por ISW:
${s.iswSummary}
        `,c=this.getStandardMetricInstruction("1. Tasa de Desarrollo");break;case"tasa de desviaci\xF3n":case"desviacion":l="2. Tasa de Desviaci\xF3n de Esfuerzo",i=`
      2. Tasa de Desviaci\xF3n de Esfuerzo: ${Math.abs(t.effortVariance.rate*100).toFixed(1)}%
         (Sem\xE1foro: Verde \u2264 15% | Amarillo 15\u201330% | Rojo > 30%)
         Esfuerzo Planeado: ${t.effortVariance.planned?.toFixed(1)??"\u2014"} h | Esfuerzo Real: ${t.effortVariance.actual?.toFixed(1)??"\u2014"} h

         Items y Tareas del Sprint:
${s.itemSummary}
        `,c=this.getStandardMetricInstruction("2. Tasa de Desviaci\xF3n de Esfuerzo");break;case"retrabajo":case"tasa de retrabajo":l="3. Tasa de Retrabajo",i=`
      3. Tasa de Retrabajo: ${t.rework.rate.toFixed(1)}%
         (Sem\xE1foro: Verde \u2264 22% | Amarillo 22\u201330% | Rojo > 30%)
         Esfuerzo Requerimiento: ${t.rework.reqEffort.toFixed(1)}h | Retrabajo Total: ${t.rework.totalRework.toFixed(1)}h
        `,c=this.getStandardMetricInstruction("3. Tasa de Retrabajo");break;case"densidad de defectos":case"densidad":l="4. Densidad de Defectos",i=`
      4. Densidad de Defectos: ${t.defectDensity.density.toFixed(3)}
         (Sem\xE1foro: Verde \u2264 0.18 | Amarillo 0.18\u20130.23 | Rojo > 0.23)
         Bugs Totales: ${t.defectDensity.bugs} | Size Total: ${t.defectDensity.size}
        `,c=this.getStandardMetricInstruction("4. Densidad de Defectos");break;case"eed":case"eficiencia de eliminaci\xF3n de defectos":l="5. Eficiencia en la Eliminaci\xF3n de Defectos (EED)",i=`
      5. Eficiencia en la Eliminaci\xF3n de Defectos (EED): ${t.defectRemovalEfficiency.rate.toFixed(2)}%
         (Sem\xE1foro: Verde \u2265 81% | Amarillo 71%\u201380% | Rojo < 71%)
         Total Bugs: ${t.defectRemovalEfficiency.totalBugs} | Closed en Tiempo: ${t.defectRemovalEfficiency.closedOnTime} | Closed fuera de Tiempo: ${t.defectRemovalEfficiency.closedLate}
        `,c=this.getStandardMetricInstruction("5. Eficiencia en la Eliminaci\xF3n de Defectos (EED)");break;case"escaped":case"bugs escapados":l="6. Porcentaje de Bugs Escapados",i=`
      6. Porcentaje de Bugs Escapados: ${t.escapedBugs?.rate.toFixed(2)??"0.00"}%
         (Sem\xE1foro: Verde \u2264 33% | Amarillo 33%\u201340% | Rojo > 40%)
         Bugs Testing: ${t.escapedBugs?.bugsTesting??0} | Bugs UAT: ${t.escapedBugs?.bugsUat??0} | Bugs Producci\xF3n: ${t.escapedBugs?.bugsProd??0} | Total Bugs: ${t.escapedBugs?.totalBugs??0}
        `,c=this.getStandardMetricInstruction("6. Porcentaje de Bugs Escapados");break;case"testExecution":case"ejecuci\xF3n de pruebas":case"runRate":l="7. Porcentaje de Ejecuci\xF3n de Pruebas (Run Rate)",i=`
      7. Porcentaje de Ejecuci\xF3n de Pruebas (Run Rate): ${t.testExecution?.rate.toFixed(2)??"0.00"}%
         (Sem\xE1foro: Verde \u2265 90% | Amarillo 80%\u201389% | Rojo < 80%)
         Total Test Points: ${t.testExecution?.totalTestPoints??0} | Ejecutados: ${t.testExecution?.executed??0} | Pasados a Tiempo: ${t.testExecution?.passedEnTiempo??0} | Pasados Fuera de Tiempo: ${t.testExecution?.passedFueraDeTiempo??0} | Fallidos: ${t.testExecution?.failed??0} | Bloqueados: ${t.testExecution?.blocked??0} | N/A: ${t.testExecution?.notApplicable??0}
        `,c=this.getStandardMetricInstruction("7. Porcentaje de Ejecuci\xF3n de Pruebas (Run Rate)");break;case"satisfactoryTests":case"pruebas satisfactorias":case"passRate":l="8. Porcentaje de Pruebas Satisfactorias (Pass Rate)",i=`
      8. Porcentaje de Pruebas Satisfactorias (Pass Rate): ${t.satisfactoryTests?.rate.toFixed(2)??"0.00"}%
         (Sem\xE1foro: Verde \u2265 90% | Amarillo 80%\u201389% | Rojo < 80%)
         Total Test Points: ${t.satisfactoryTests?.total??0} | Pasados a Tiempo (Satisfactorios): ${t.satisfactoryTests?.passedEnTiempo??0} | Pasados Fuera de Tiempo: ${t.satisfactoryTests?.passedFueraDeTiempo??0} | Fallidos: ${t.satisfactoryTests?.failed??0} | Bloqueados: ${t.satisfactoryTests?.blocked??0} | N/A: ${t.satisfactoryTests?.notApplicable??0}
        `,c=this.getStandardMetricInstruction("8. Porcentaje de Pruebas Satisfactorias (Pass Rate)");break;default:return this.analyzeMetrics(t,u,d)}let r=`
      Act\xFAa como un Auditor de Calidad CMMI Nivel 5 del proyecto OPE20 Bepensa. Analiza \xDANICAMENTE la m\xE9trica "${l}" y devuelve el resultado en ESPA\xD1OL. 
      ${s.commentsSummary}
      CONTEXTO DEL EQUIPO:
      - Todos los integrantes del equipo de desarrollo son ISW nivel MID (nivel intermedio).
      - No hay ISW SR (Senior) en el equipo. No menciones ISW SR en el an\xE1lisis.
      - El equipo trabaja bajo metodolog\xEDa SCRUM con sprints.

      DATOS DE LA M\xC9TRICA:
      ${i}

      HISTORIAL DE SPRINTS ANTERIORES PARA C\xC1LCULO ACUMULADO REAL:
      ${s.historySummary}

      ${c}

      REGLAS IMPORTANTES:
      - PROHIBIDO USAR ASTERISCOS **: No incluyas nunca el s\xEDmbolo ** ni formato markdown de negritas. Escribe todas las etiquetas y frases en texto directo (ejemplo: "Meta establecida para el periodo:" en lugar de "**Meta establecida para el periodo:**").
      - S\xC9 EXIGENTE: Como auditor CMMI5, tu objetivo es la perfecci\xF3n estad\xEDstica.
      - NO menciones ISW SR, no existe en este equipo. Solo ISW MID.
      - NO UTILICES NINGUNA UNIDAD COMO "/PT" O "/SP": Para la m\xE9trica "4. Densidad de Defectos", no utilices jam\xE1s ninguna unidad ni sufijo como "/PT", "/pt", "/SP" o "/sp" en los resultados o an\xE1lisis. Muestra siempre los valores de las metas y resultados \xFAnicamente como n\xFAmeros decimales directos (ej: \u2264 0.18, 0.026), omitiendo cualquier menci\xF3n a PT o SP.
      - ANALIZA RESPONSABILIDADES DE TAREAS: Ten en cuenta que existe un responsable principal de la historia (ISW), pero debes identificar a las personas involucradas en las tareas secundarias (Responsable de la tarea).
      - Para la m\xE9trica "2. Tasa de Desviaci\xF3n de Esfuerzo", el "Resultado del periodo" debe presentarse en valor absoluto (sin signo negativo, p. ej., 11.23% en lugar de -11.23%).
      - Usa nombres reales de los ISW del equipo cuando est\xE9n disponibles en la lista de items.
      - Tono profesional, anal\xEDtico y enfocado en identificar brechas de proceso.
      - Devuelve SOLO el bloque de la m\xE9trica formateado con [METRICA_INICIO: ...] y [METRICA_FIN], sin introducciones ni conclusiones generales.
    `;return a.ai.provider==="openai"?this.callOpenAI(a.ai.apiKey,a.ai.model,r):this.callGemini(a.ai.apiKey,a.ai.model,r)}getStandardMetricInstruction(e){return`
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
    `}buildPromptContext(e,t=[],u={}){let d="",a=Object.keys(u);a.length>0&&(d=`
COMENTARIOS Y CONTEXTO DEL AUDITOR/SOCIOS PARA ESTE SPRINT (JUSTIFICACIONES DE NEGOCIO):
`,a.forEach(o=>{u[o]&&(d+=`- M\xE9trica o Secci\xF3n "${o}": "${u[o]}"
`)}),d+=`-> REGLA: Incorpora estas notas/comentarios especiales de forma destacada en el an\xE1lisis de la m\xE9trica correspondiente para dar explicaci\xF3n o justificar las desviaciones detectadas ante la direcci\xF3n.

`);let s=(e.developmentRate?.items||[]).map(o=>{let p=(o.tasks||[]).reduce(($,D)=>$+(D.originalEstimate||0),0),E=o.effort,I=p>0?((E-p)/p*100).toFixed(1):"0";return`  - ${o.type==="Feature"?"FT":"US"} #${o.id} | Size: ${o.size} | Est. Original: ${p.toFixed(1)}h | Real: ${E.toFixed(1)}h | Var: ${I}% | ISW: ${o.isw}`}).join(`
`),i={};(e.developmentRate?.items||[]).forEach(o=>{let p=o.isw||"Sin Asignar";i[p]||(i[p]={name:p,effort:0,planned:0,size:0}),i[p].effort+=o.effort,i[p].planned+=(o.tasks||[]).reduce((E,I)=>E+(I.originalEstimate||0),0),i[p].size+=o.sizeEdited!==void 0?o.sizeEdited:o.size});let l=Object.values(i).map(o=>{let p=o.size>0?(o.effort/o.size).toFixed(2):"N/A",E=o.planned>0?((o.effort-o.planned)/o.planned*100).toFixed(1):"0";return`  * ${o.name}: Tasa ${p} | Desviaci\xF3n ${E}% | Esfuerzo Real ${o.effort.toFixed(1)}h`}).join(`
`),c="Sin historial de sprints anteriores disponible.";t&&t.length>0&&(c=t.map(o=>`  - ${o.iterationName||"Sprint previo"}:
            * Tasa de Desarrollo: ${o.developmentRate.rate.toFixed(2)} (Esfuerzo: ${o.developmentRate.totalEffort.toFixed(1)}h, Size: ${o.developmentRate.totalSize})
            * Desviaci\xF3n Esfuerzo: ${Math.abs(o.effortVariance.rate*100).toFixed(1)}% (Planeado: ${o.effortVariance.planned?.toFixed(1)}h, Real: ${o.effortVariance.actual?.toFixed(1)}h)
            * Tasa de Retrabajo: ${o.rework.rate.toFixed(1)}% (Req: ${o.rework.reqEffort.toFixed(1)}h, Retrabajo: ${o.rework.totalRework.toFixed(1)}h)
            * Densidad Defectos: ${o.defectDensity.density.toFixed(3)} (Bugs: ${o.defectDensity.bugs}, Size: ${o.defectDensity.size})
            * EED: ${o.defectRemovalEfficiency.rate.toFixed(2)}% (Bugs: ${o.defectRemovalEfficiency.totalBugs}, Cerrados a Tiempo: ${o.defectRemovalEfficiency.closedOnTime})
            * Bugs Escapados: ${o.escapedBugs?.rate.toFixed(2)??"0.00"}% (Total: ${o.escapedBugs?.totalBugs??0}, Prod: ${o.escapedBugs?.bugsProd??0})
            * Ejecuci\xF3n Pruebas (Run Rate): ${o.testExecution?.rate.toFixed(2)??"0.00"}% (Total: ${o.testExecution?.totalTestPoints??0}, Ej: ${o.testExecution?.executed??0})
            * Pruebas Satisfactorias (Pass Rate): ${o.satisfactoryTests?.rate.toFixed(2)??"0.00"}% (Total: ${o.satisfactoryTests?.total??0}, Pasados: ${o.satisfactoryTests?.passedEnTiempo??0})`).join(`
`));let r=e.developmentRate?.items||[],n=e.endDate?new Date(e.endDate).getTime():0,g=0,S=0,R=0,y=0,b=[],T=[];r.forEach(o=>{let p=["Closed","Resolved","Done","Completed"].includes(o.status),E=o.closedDate?new Date(o.closedDate).getTime():o.changedDate?new Date(o.changedDate).getTime():0,I="Abierto",$=0;p?!E||E<=n?(g++,I="A tiempo"):(S++,$=Math.max(1,Math.round((E-n)/(1e3*60*60*24))),$>y&&(y=$),I="Fase Extendida ("+$+"d retraso)",b.push("  - "+(o.type==="Feature"?"FT":"US")+" #"+o.id+" | ISW: "+o.isw+" | Cerrado: "+(o.closedDate?o.closedDate.substring(0,10):"?")+" | ~"+$+"d tarde")):R++;let D=(o.tasks||[]).map(A=>{let v=(A.completedWork||0)-(A.originalEstimate||0),V=v>0?" (Desviaci\xF3n: +"+v.toFixed(1)+"h)":v<0?" (Sub-ejecutada: "+v.toFixed(1)+"h)":" (A tiempo)";return"Tarea #"+A.id+': "'+A.title+'" (Responsable: '+(A.assignedTo||"Sin asignar")+", Est: "+(A.originalEstimate||0)+"h, Real: "+(A.completedWork||0)+"h, Estado: "+A.status+V+")"}).join("; ");T.push("  * ["+(o.type==="Feature"?"FT":"US")+" #"+o.id+'] "'+o.title+'" - ISW: '+o.isw+" | Estado: "+o.status+" | Entrega: "+I+" | Size: "+o.size+" | Tareas: ["+D+"]")});let f=e.defectRemovalEfficiency?.bugsList||[],U=e.escapedBugs?.bugsList||[],F=new Map;[...f,...U].forEach(o=>{F.set(o.bugId||o.id,o)});let w=Array.from(F.values()).map(o=>"  * [Bug #"+(o.bugId||o.id)+'] "'+o.title+'" - ISW: '+(o.isw||"Sin asignar")+" | Estado: "+o.status+" | Clasificaci\xF3n: "+(o.classification||"N/A")).join(`
`),j=g+S,q=j>0?(g/j*100).toFixed(0):"\u2014",G="         Total entregables: "+r.length+" | A tiempo: "+g+" | En Fase Extendida: "+S+" | Abiertos: "+R+`
         % Cumplimiento: `+q+"% | M\xE1x. d\xEDas de retraso: "+y+`d
         Detalle de Deliverables (Historias de Usuario / Features) y sus Tareas:
`+T.join(`
`)+`
         Detalle de Todos los Bugs de la Iteraci\xF3n:
`+(w||"Sin bugs detectados en este periodo.");return{commentsSummary:d,itemSummary:s,iswSummary:l,historySummary:c,complianceSummary:G}}generateCompletionReport(e){let t=this.configService.getConfig();if(!t||!t.ai.apiKey)return m("AI Configuration missing.");let u=[],d=0,a=0;(e.developmentRate.items||[]).forEach(S=>{let R=(S.tasks||[]).filter(T=>{let f=(T.title||"").toLowerCase();return f.includes("01.01")||f.includes("01.03")||f.includes("01.04")||f.includes("01.05")}),y=R.reduce((T,f)=>T+(f.originalEstimate||0),0),b=R.reduce((T,f)=>T+(f.completedWork||0),0);u.push(`${S.type==="Feature"?"FT":"US"} | ${S.id} | ${y.toFixed(2)} | ${b.toFixed(2)}`),d+=y,a+=b});let s=u.join(`
`),i=d,l=a,c=(i-l).toFixed(2),r=i>0?((i-l)/i*100).toFixed(2):"0.00",g=`
      Act\xFAa como el Responsable de Calidad y Planeaci\xF3n. Genera un REPORTE DE FINALIZACI\xD3N DE CONSTRUCCI\xD3N para el correo de David.
      El formato debe ser EXACTAMENTE el siguiente, llenando los datos con la informaci\xF3n proporcionada:

      Buen d\xEDa David,

      de acuerdo al proceso te env\xEDo el reporte de finalizaci\xF3n de construcci\xF3n del sprint ${e.iterationName||"Sprint X"}

      Tipo | Item | Tiempo planeado | Tiempo completado
      --- | --- | --- | ---
      ${s}
      Total | | ${i.toFixed(2)} | ${l.toFixed(2)}

      La construcci\xF3n de las historias de usuario finaliz\xF3 con una diferencia de ${Math.abs(parseFloat(c))} horas ${parseFloat(c)>0?"menos":"m\xE1s"}, lo que representa una desviaci\xF3n del ${Math.abs(parseFloat(r))}% respecto al tiempo planeado. 
      [A\xF1ade aqu\xED 2 o 3 oraciones justificando la desviaci\xF3n bas\xE1ndote en los \xEDtems analizados. Menciona los IDs espec\xEDficos de US/FT que se excedieron del tiempo planeado como causa de la desviaci\xF3n, y menciona si hubo bugs. S\xE9 anal\xEDtico y profesional.]

      Adjunto la gr\xE1fica del sprint burndown. Sin embargo, a\xFAn quedan tareas administrativas que no se han cerrado.

      REGLAS:
      - Idioma: Espa\xF1ol.
      - Mant\xE9n el formato de la tabla en Markdown para que se vea claramente.
      - La justificaci\xF3n debe ser coherente con los datos (ej: si la US 46900 tiene m\xE1s horas reales que planeadas, menci\xF3nala como causa).
    `;return t.ai.provider==="openai"?this.callOpenAI(t.ai.apiKey,t.ai.model,g):this.callGemini(t.ai.apiKey,t.ai.model,g)}analyzeGanttComparison(e){let t=this.configService.getConfig();if(!t||!t.ai.apiKey)return m("AI Configuration missing.");let u=e.items.filter(r=>r.late).slice(0,20).map(r=>`- #${r.workItemId}: Planeado ${r.plannedStart}\u2192${r.plannedEnd} | Real ${r.realStart||"N/A"}\u2192${r.realEnd||"N/A"}`).join(`
`),d=e.items.slice(0,30).map(r=>`- #${r.workItemId} | Planeado ${r.plannedStart}\u2192${r.plannedEnd} | Real ${r.realStart||"N/A"}\u2192${r.realEnd||"N/A"} | ${r.late?"Atrasado":"En tiempo"}`).join(`
`),a=e.people.slice(0,30).map(r=>`- ${r.person}: Planeado marcas=${r.plannedMarks}, Planeado items=${r.plannedItems}, Real asignaciones=${r.realAssignments}, Real items=${r.realItems}`).join(`
`),s=e.taskLayer.stageBreakdown.slice(0,20).map(r=>`- ${r.stage}: tareas=${r.taskCount}, planeado=${r.plannedHours.toFixed(1)}h, real=${r.realHours.toFixed(1)}h`).join(`
`),i=e.taskLayer.relatedItemTaskContext.slice(0,40).join(`
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
${d||"- Sin datos de \xEDtems"}

TOP ITEMS ATRASADOS
${u||"- Sin atrasos detectados"}

COMPARACI\xD3N POR PERSONA
${a||"- Sin datos por persona"}

CAPA DE TAREAS (ADO) PARA ITEMS CON MATCH
- Items con tareas: ${e.taskLayer.matchedItemsWithTasks}
- Horas planeadas (tareas): ${e.taskLayer.totalPlannedTaskHours.toFixed(1)}h
- Horas reales (tareas): ${e.taskLayer.totalRealTaskHours.toFixed(1)}h
- Posibles violaciones de dependencia temporal: ${e.taskLayer.dependencyViolations}
- Tareas administrativas: ${e.taskLayer.adminTaskCount} (Plan=${e.taskLayer.adminPlannedHours.toFixed(1)}h, Real=${e.taskLayer.adminRealHours.toFixed(1)}h)

DESGLOSE POR ETAPA (TAREAS)
${s||"- Sin desglose por etapa"}

CONTEXTO AMPLIADO POR ITEM PADRE (TAREAS RELACIONADAS)
${i||"- Sin tareas adicionales relacionadas por padre"}

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
`;return t.ai.provider==="openai"?this.callOpenAI(t.ai.apiKey,t.ai.model,c):this.callGemini(t.ai.apiKey,t.ai.model,c)}askAboutMetrics(e,t,u){let d=this.configService.getConfig();if(!d||!d.ai.apiKey)return m("Configuraci\xF3n de IA no encontrada. Por favor configure su API Key en la pantalla de Configuraci\xF3n.");let a=`INFORMACI\xD3N DEL SPRINT ACTUAL:
`;a+=`- Iteraci\xF3n/Sprint: ${e.iterationName||"No especificada"}
`,e.startDate&&e.endDate&&(a+=`- Periodo: ${e.startDate} a ${e.endDate}
`),a+=`
1. TASA DE DESARROLLO:
`,a+=`- Valor: ${e.developmentRate.rate.toFixed(2)} (Sem\xE1foro: ${e.developmentRate.status})
`,a+=`- Esfuerzo Real Total: ${e.developmentRate.totalEffort?.toFixed(1)??0}h
`,a+=`- Puntos de Historia (Size) Total: ${e.developmentRate.totalSize??0}
`,a+=`- Cantidad de Items: ${e.developmentRate.totalItems??0}
`,e.developmentRate.items&&e.developmentRate.items.length>0&&(a+=`Items de Trabajo:
`,e.developmentRate.items.forEach(n=>{let g=(n.tasks||[]).reduce((S,R)=>S+(R.originalEstimate||0),0);a+=`  * [${n.type==="Feature"?"FT":"US"} #${n.id}] ${n.title} - ISW: ${n.isw} | Estado: ${n.status} | Estimado: ${g.toFixed(1)}h | Real: ${n.effort.toFixed(1)}h | Size: ${n.size}
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
`}));let s=e.escapedBugs;s&&(a+=`
6. BUGS ESCAPADOS:
`,a+=`- Tasa Escape: ${s.rate.toFixed(2)}% (Sem\xE1foro: ${s.status})
`,a+=`- Bugs Testing: ${s.bugsTesting??0}
`,a+=`- Bugs UAT: ${s.bugsUat??0}
`,a+=`- Bugs Producci\xF3n: ${s.bugsProd??0}
`,s.bugsList&&s.bugsList.length>0&&(a+=`Lista de Bugs Escapados:
`,s.bugsList.forEach(n=>{a+=`  * [Bug #${n.bugId}] ${n.title} - Asignado: ${n.isw||"Sin asignar"} | Estado: ${n.status} | Clasificaci\xF3n: ${n.classification}
`})));let i=e.testExecution;i&&(a+=`
7. EJECUCI\xD3N DE PRUEBAS:
`,a+=`- Tasa Ejecuci\xF3n: ${i.rate.toFixed(2)}% (Sem\xE1foro: ${i.status})
`,a+=`- Total Test Points: ${i.totalTestPoints??0}
`,a+=`- Ejecutados: ${i.executed??0}
`,a+=`- Pasados a Tiempo: ${i.passedEnTiempo??0}
`,a+=`- Pasados Fuera de Tiempo: ${i.passedFueraDeTiempo??0}
`,a+=`- Fallidos: ${i.failed??0}
`,a+=`- Bloqueados: ${i.blocked??0}
`,i.testPoints&&i.testPoints.length>0&&(a+=`Detalle de Puntos de Prueba:
`,i.testPoints.forEach(n=>{a+=`  * [Plan: ${n.planName}] Suite: ${n.suiteName} | Test Case: [#${n.testCaseId}] ${n.testCaseTitle} - Probador: ${n.tester} | Resultado: ${n.outcome} | En Tiempo: ${n.onTime?"S\xED":"No"}
`})));let l=e.satisfactoryTests;l&&(a+=`
8. PORCENTAJE DE PRUEBAS SATISFACTORIAS (KPI Pass Rate):
`,a+=`- Tasa Pruebas Satisfactorias (Pass Rate): ${l.rate.toFixed(2)}% (Sem\xE1foro: ${l.status})
`,a+=`- Total Test Points: ${l.total??0}
`,a+=`- Pasados a Tiempo (Satisfactorios): ${l.passedEnTiempo??0}
`,a+=`- Pasados Fuera de Tiempo: ${l.passedFueraDeTiempo??0}
`,a+=`- Fallidos: ${l.failed??0}
`,a+=`- Bloqueados: ${l.blocked??0}
`,a+=`- N/A: ${l.notApplicable??0}
`);let c="";u&&u.length>0&&(c=`HISTORIAL DE LA CONVERSACI\xD3N:
`,u.forEach(n=>{c+=`${n.role==="user"?"Usuario":"Asistente"}: ${n.content}
`}));let r=`
      Act\xFAa como un Asistente Virtual Experto en M\xE9tricas CMMI Nivel 5 para el proyecto OPE20 Bepensa.
      Tu objetivo es responder de manera clara, concisa y precisa a las preguntas del usuario sobre los datos y m\xE9tricas que se muestran en el dashboard actual.

      ${a}

      ${c}

      PREGUNTA DEL USUARIO:
      ${t}

      REGLAS PARA RESPONDER:
      1. Responde en ESPA\xD1OL.
      2. S\xE9 preciso e inf\xF3rmate de los datos proporcionados arriba. Si te preguntan por un \xEDtem espec\xEDfico, un ISW espec\xEDfico, un bug o una m\xE9trica en particular, busca en los datos provistos y da detalles espec\xEDficos (IDs, horas, porcentajes, nombres).
      3. Mant\xE9n un tono profesional, anal\xEDtico y constructivo, pero amigable.
      4. Si la pregunta no tiene relaci\xF3n con las m\xE9tricas o no se puede responder con la informaci\xF3n proporcionada, ind\xEDcalo amablemente y ofrece ayuda sobre lo que s\xED puedes responder bas\xE1ndote en los datos.
      5. Puedes estructurar tu respuesta con vi\xF1etas o tablas markdown sencillas para mejorar la legibilidad.
    `;return d.ai.provider==="openai"?this.callOpenAI(d.ai.apiKey,d.ai.model,r):this.callGemini(d.ai.apiKey,d.ai.model,r)}callOpenAI(e,t,u){return this.http.post("https://api.openai.com/v1/chat/completions",{model:t||"gpt-4",messages:[{role:"user",content:u}]},{headers:{Authorization:`Bearer ${e}`}}).pipe(C(14e4),M({count:1,delay:2e3}),h(d=>d?.choices?.[0]?.message?.content||"Respuesta vac\xEDa de OpenAI"),O(d=>{console.error("OpenAI Error/Timeout:",d);let a=d?.name==="TimeoutError"||d?.message?.includes("timeout"),s=d?.status===401||d?.status===403;return a?m("El an\xE1lisis tard\xF3 demasiado (>90s). Intenta de nuevo; el servidor de IA puede estar ocupado."):s?m("API Key de OpenAI inv\xE1lida o sin permisos. Verifica la clave en Configuraci\xF3n."):m(`Error al contactar OpenAI (${d?.status??"sin conexi\xF3n"}). Intenta de nuevo.`)}))}callGemini(e,t,u){let d=(t||"gemini-1.5-flash").trim(),a=d;return d.startsWith("models/")&&(a=d.replace("models/","")),this.http.post(`https://generativelanguage.googleapis.com/v1beta/models/${a}:generateContent?key=${e}`,{contents:[{parts:[{text:u}]}]}).pipe(C(9e4),M({count:3,delay:(s,i)=>{if(s?.status===429){let l=(i+1)*4e3,c=s?.error?.error?.details;if(Array.isArray(c)){let r=c.find(n=>n?.["@type"]?.includes("RetryInfo")||n?.retryDelay);if(r?.retryDelay){let n=parseInt(r.retryDelay.replace("s",""),10);!isNaN(n)&&n>0&&(l=(n+2)*1e3)}}return console.warn(`Gemini 429 Rate Limit en ${a}. Esperando ${l/1e3}s para reintentar (Intento ${i}/3)...`),x(l)}return x(2e3)}}),h(s=>s?.candidates?.[0]?.content?.parts?.[0]?.text||"Respuesta vac\xEDa de Gemini"),O(s=>{console.error("Gemini Error/Timeout:",s);let i=s?.name==="TimeoutError"||s?.message?.includes("timeout"),l=s?.status===400||s?.status===401||s?.status===403;if(s?.status===429){let r=JSON.stringify(s?.error||"");return r.includes("GenerateRequestsPerDayPerProjectPerModel-FreeTier")||r.includes("limit: 20")?m(`Cuota diaria del modelo "${a}" agotada en la capa gratuita de Google (L\xEDmite: 20 peticiones/d\xEDa). Por favor cambia el modelo a "gemini-3.6-flash" o "gemini-1.5-flash" en el men\xFA Configuraci\xF3n.`):m(`Cuota/L\xEDmite de Gemini agotado (Error 429: Too Many Requests en ${a}). Espera unos segundos o cambia el modelo a "gemini-3.6-flash" o "gemini-1.5-flash" en Configuraci\xF3n.`)}return s?.status===404||JSON.stringify(s?.error||"").includes("no longer available")?m(`El modelo "${a}" ya no est\xE1 disponible en Google Gemini. Por favor c\xE1mbialo a "gemini-3.6-flash" o "gemini-1.5-flash" en el men\xFA Configuraci\xF3n.`):i?m("El an\xE1lisis tard\xF3 demasiado (>90s). Intenta de nuevo; Gemini puede estar ocupado."):l?m(`Error en Gemini (${s?.error?.error?.message||"API Key o Modelo no v\xE1lido"}). Verifica la clave y modelo en Configuraci\xF3n.`):m(`Error al contactar Gemini (${s?.status??"sin conexi\xF3n"}). Intenta de nuevo.`)}))}static \u0275fac=function(t){return new(t||P)};static \u0275prov=L({token:P,factory:P.\u0275fac,providedIn:"root"})};export{z as a};
