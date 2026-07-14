import{D as F,K as P,Q as h,Ub as M,Wc as N,i as p,m as y,n as C,v as D}from"./chunk-PXMJ256X.js";var O=class R{http=h(M);configService=h(N);analyzeMetrics(e){let r=this.configService.getConfig();if(!r||!r.ai.apiKey)return p("AI Configuration missing.");let c=(e.developmentRate.items||[]).map(o=>{let s=(o.tasks||[]).reduce((t,f)=>t+(f.originalEstimate||0),0),l=o.effort,u=s>0?((l-s)/s*100).toFixed(1):"0";return`  - ${o.type==="Feature"?"FT":"US"} #${o.id} | Size: ${o.size} | Est. Original: ${s.toFixed(1)}h | Real: ${l.toFixed(1)}h | Var: ${u}% | ISW: ${o.isw}`}).join(`
`),n={};(e.developmentRate.items||[]).forEach(o=>{let s=o.isw||"Sin Asignar";n[s]||(n[s]={name:s,effort:0,planned:0,size:0}),n[s].effort+=o.effort,n[s].planned+=(o.tasks||[]).reduce((l,u)=>l+(u.originalEstimate||0),0),n[s].size+=o.sizeEdited!==void 0?o.sizeEdited:o.size});let a=Object.values(n).map(o=>{let s=o.size>0?(o.effort/o.size).toFixed(2):"N/A",l=o.planned>0?((o.effort-o.planned)/o.planned*100).toFixed(1):"0";return`  * ${o.name}: Tasa ${s} | Desviaci\xF3n ${l}% | Esfuerzo Real ${o.effort.toFixed(1)}h`}).join(`
`),d=`
      Act\xFAa como un Auditor de Calidad CMMI Nivel 5 del proyecto OPE20 Bepensa. Analiza estas m\xE9tricas y devuelve el resultado en ESPA\xD1OL. 

      CONTEXTO DEL EQUIPO:
      - Todos los integrantes del equipo de desarrollo son ISW nivel MID (nivel intermedio).
      - No hay ISW SR (Senior) en el equipo. No menciones ISW SR en el an\xE1lisis.
      - El equipo trabaja bajo metodolog\xEDa SCRUM con sprints.

      M\xC9TRICAS DEL SPRINT:
      0. Cumplimiento y L\xEDnea de Tiempo del Sprint:
      ${(()=>{let o=e.developmentRate?.items||[],s=e.endDate?new Date(e.endDate).getTime():0,l=0,u=0,t=0,f=0,g=[],$=[];o.forEach(i=>{let B=["Closed","Resolved","Done","Completed"].includes(i.status),I=i.closedDate?new Date(i.closedDate).getTime():i.changedDate?new Date(i.changedDate).getTime():0,b="Abierto",T=0;B?!I||I<=s?(l++,b="A tiempo"):(u++,T=Math.max(1,Math.round((I-s)/(1e3*60*60*24))),T>f&&(f=T),b="Fase Extendida ("+T+"d retraso)",g.push("  - "+(i.type==="Feature"?"FT":"US")+" #"+i.id+" | ISW: "+i.isw+" | Cerrado: "+(i.closedDate?i.closedDate.substring(0,10):"?")+" | ~"+T+"d tarde")):t++;let z=(i.tasks||[]).map(A=>"Tarea #"+A.id+': "'+A.title+'" (Est: '+(A.originalEstimate||0)+"h, Real: "+(A.completedWork||0)+"h, Estado: "+A.status+")").join("; ");$.push("  * ["+(i.type==="Feature"?"FT":"US")+" #"+i.id+'] "'+i.title+'" - ISW: '+i.isw+" | Estado: "+i.status+" | Entrega: "+b+" | Size: "+i.size+" | Tareas: ["+z+"]")});let S=e.defectRemovalEfficiency?.bugsList||[],v=e.escapedBugs?.bugsList||[],E=new Map;[...S,...v].forEach(i=>{E.set(i.bugId||i.id,i)});let m=Array.from(E.values()).map(i=>"  * [Bug #"+(i.bugId||i.id)+'] "'+i.title+'" - ISW: '+(i.isw||"Sin asignar")+" | Estado: "+i.status+" | Clasificaci\xF3n: "+(i.classification||"N/A")).join(`
`),x=l+u,j=x>0?(l/x*100).toFixed(0):"\u2014";return"         Total entregables: "+o.length+" | A tiempo: "+l+" | En Fase Extendida: "+u+" | Abiertos: "+t+`
         % Cumplimiento: `+j+"% | M\xE1x. d\xEDas de retraso: "+f+`d
         Detalle de Deliverables (Historias de Usuario / Features) y sus Tareas:
`+$.join(`
`)+`
         Detalle de Todos los Bugs de la Iteraci\xF3n:
`+(m||"Sin bugs detectados en este periodo.")})()}

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
    `;return r.ai.provider==="openai"?this.callOpenAI(r.ai.apiKey,r.ai.model,d):this.callGemini(r.ai.apiKey,r.ai.model,d)}generateCompletionReport(e){let r=this.configService.getConfig();if(!r||!r.ai.apiKey)return p("AI Configuration missing.");let c=[],n=0,a=0;(e.developmentRate.items||[]).forEach(g=>{let $=(g.tasks||[]).filter(E=>{let m=(E.title||"").toLowerCase();return m.includes("01.01")||m.includes("01.03")||m.includes("01.04")||m.includes("01.05")}),S=$.reduce((E,m)=>E+(m.originalEstimate||0),0),v=$.reduce((E,m)=>E+(m.completedWork||0),0);c.push(`${g.type==="Feature"?"FT":"US"} | ${g.id} | ${S.toFixed(2)} | ${v.toFixed(2)}`),n+=S,a+=v});let d=c.join(`
`),o=n,s=a,l=(o-s).toFixed(2),u=o>0?((o-s)/o*100).toFixed(2):"0.00",f=`
      Act\xFAa como el Responsable de Calidad y Planeaci\xF3n. Genera un REPORTE DE FINALIZACI\xD3N DE CONSTRUCCI\xD3N para el correo de David.
      El formato debe ser EXACTAMENTE el siguiente, llenando los datos con la informaci\xF3n proporcionada:

      Buen d\xEDa David,

      de acuerdo al proceso te env\xEDo el reporte de finalizaci\xF3n de construcci\xF3n del sprint ${e.iterationName||"Sprint X"}

      Tipo | Item | Tiempo planeado | Tiempo completado
      --- | --- | --- | ---
      ${d}
      Total | | ${o.toFixed(2)} | ${s.toFixed(2)}

      La construcci\xF3n de las historias de usuario finaliz\xF3 con una diferencia de ${Math.abs(parseFloat(l))} horas ${parseFloat(l)>0?"menos":"m\xE1s"}, lo que representa una desviaci\xF3n del ${Math.abs(parseFloat(u))}% respecto al tiempo planeado. 
      [A\xF1ade aqu\xED 2 o 3 oraciones justificando la desviaci\xF3n bas\xE1ndote en los \xEDtems analizados. Menciona los IDs espec\xEDficos de US/FT que se excedieron del tiempo planeado como causa de la desviaci\xF3n, y menciona si hubo bugs. S\xE9 anal\xEDtico y profesional.]

      Adjunto la gr\xE1fica del sprint burndown. Sin embargo, a\xFAn quedan tareas administrativas que no se han cerrado.

      REGLAS:
      - Idioma: Espa\xF1ol.
      - Mant\xE9n el formato de la tabla en Markdown para que se vea claramente.
      - La justificaci\xF3n debe ser coherente con los datos (ej: si la US 46900 tiene m\xE1s horas reales que planeadas, menci\xF3nala como causa).
    `;return r.ai.provider==="openai"?this.callOpenAI(r.ai.apiKey,r.ai.model,f):this.callGemini(r.ai.apiKey,r.ai.model,f)}askAboutMetrics(e,r,c){let n=this.configService.getConfig();if(!n||!n.ai.apiKey)return p("Configuraci\xF3n de IA no encontrada. Por favor configure su API Key en la pantalla de Configuraci\xF3n.");let a=`INFORMACI\xD3N DEL SPRINT ACTUAL:
`;a+=`- Iteraci\xF3n/Sprint: ${e.iterationName||"No especificada"}
`,e.startDate&&e.endDate&&(a+=`- Periodo: ${e.startDate} a ${e.endDate}
`),a+=`
1. TASA DE DESARROLLO:
`,a+=`- Valor: ${e.developmentRate.rate.toFixed(2)} (Sem\xE1foro: ${e.developmentRate.status})
`,a+=`- Esfuerzo Real Total: ${e.developmentRate.totalEffort?.toFixed(1)??0}h
`,a+=`- Puntos de Historia (Size) Total: ${e.developmentRate.totalSize??0}
`,a+=`- Cantidad de Items: ${e.developmentRate.totalItems??0}
`,e.developmentRate.items&&e.developmentRate.items.length>0&&(a+=`Items de Trabajo:
`,e.developmentRate.items.forEach(t=>{let f=(t.tasks||[]).reduce((g,$)=>g+($.originalEstimate||0),0);a+=`  * [${t.type==="Feature"?"FT":"US"} #${t.id}] ${t.title} - ISW: ${t.isw} | Estado: ${t.status} | Estimado: ${f.toFixed(1)}h | Real: ${t.effort.toFixed(1)}h | Size: ${t.size}
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
`}));let d=e.escapedBugs;d&&(a+=`
6. BUGS ESCAPADOS:
`,a+=`- Tasa Escape: ${d.rate.toFixed(2)}% (Sem\xE1foro: ${d.status})
`,a+=`- Bugs Testing: ${d.bugsTesting??0}
`,a+=`- Bugs UAT: ${d.bugsUat??0}
`,a+=`- Bugs Producci\xF3n: ${d.bugsProd??0}
`,d.bugsList&&d.bugsList.length>0&&(a+=`Lista de Bugs Escapados:
`,d.bugsList.forEach(t=>{a+=`  * [Bug #${t.bugId}] ${t.title} - Asignado: ${t.isw||"Sin asignar"} | Estado: ${t.status} | Clasificaci\xF3n: ${t.classification}
`})));let o=e.testExecution;o&&(a+=`
7. EJECUCI\xD3N DE PRUEBAS:
`,a+=`- Tasa Ejecuci\xF3n: ${o.rate.toFixed(2)}% (Sem\xE1foro: ${o.status})
`,a+=`- Total Test Points: ${o.totalTestPoints??0}
`,a+=`- Ejecutados: ${o.executed??0}
`,a+=`- Pasados a Tiempo: ${o.passedEnTiempo??0}
`,a+=`- Pasados Fuera de Tiempo: ${o.passedFueraDeTiempo??0}
`,a+=`- Fallidos: ${o.failed??0}
`,a+=`- Bloqueados: ${o.blocked??0}
`,o.testPoints&&o.testPoints.length>0&&(a+=`Detalle de Puntos de Prueba:
`,o.testPoints.forEach(t=>{a+=`  * [Plan: ${t.planName}] Suite: ${t.suiteName} | Test Case: [#${t.testCaseId}] ${t.testCaseTitle} - Probador: ${t.tester} | Resultado: ${t.outcome} | En Tiempo: ${t.onTime?"S\xED":"No"}
`})));let s=e.satisfactoryTests;s&&(a+=`
8. PORCENTAJE DE PRUEBAS SATISFACTORIAS (KPI Pass Rate):
`,a+=`- Tasa Pruebas Satisfactorias (Pass Rate): ${s.rate.toFixed(2)}% (Sem\xE1foro: ${s.status})
`,a+=`- Total Test Points: ${s.total??0}
`,a+=`- Pasados a Tiempo (Satisfactorios): ${s.passedEnTiempo??0}
`,a+=`- Pasados Fuera de Tiempo: ${s.passedFueraDeTiempo??0}
`,a+=`- Fallidos: ${s.failed??0}
`,a+=`- Bloqueados: ${s.blocked??0}
`,a+=`- N/A: ${s.notApplicable??0}
`);let l="";c&&c.length>0&&(l=`HISTORIAL DE LA CONVERSACI\xD3N:
`,c.forEach(t=>{l+=`${t.role==="user"?"Usuario":"Asistente"}: ${t.content}
`}));let u=`
      Act\xFAa como un Asistente Virtual Experto en M\xE9tricas CMMI Nivel 5 para el proyecto OPE20 Bepensa.
      Tu objetivo es responder de manera clara, concisa y precisa a las preguntas del usuario sobre los datos y m\xE9tricas que se muestran en el dashboard actual.

      ${a}

      ${l}

      PREGUNTA DEL USUARIO:
      ${r}

      REGLAS PARA RESPONDER:
      1. Responde en ESPA\xD1OL.
      2. S\xE9 preciso e inf\xF3rmate de los datos proporcionados arriba. Si te preguntan por un \xEDtem espec\xEDfico, un ISW espec\xEDfico, un bug o una m\xE9trica en particular, busca en los datos provistos y da detalles espec\xEDficos (IDs, horas, porcentajes, nombres).
      3. Mant\xE9n un tono profesional, anal\xEDtico y constructivo, pero amigable.
      4. Si la pregunta no tiene relaci\xF3n con las m\xE9tricas o no se puede responder con la informaci\xF3n proporcionada, ind\xEDcalo amablemente y ofrece ayuda sobre lo que s\xED puedes responder bas\xE1ndote en los datos.
      5. Puedes estructurar tu respuesta con vi\xF1etas o tablas markdown sencillas para mejorar la legibilidad.
    `;return n.ai.provider==="openai"?this.callOpenAI(n.ai.apiKey,n.ai.model,u):this.callGemini(n.ai.apiKey,n.ai.model,u)}callOpenAI(e,r,c){return this.http.post("https://api.openai.com/v1/chat/completions",{model:r||"gpt-4",messages:[{role:"user",content:c}]},{headers:{Authorization:`Bearer ${e}`}}).pipe(y(14e4),F({count:1,delay:2e3}),C(n=>n?.choices?.[0]?.message?.content||"Respuesta vac\xEDa de OpenAI"),D(n=>{console.error("OpenAI Error/Timeout:",n);let a=n?.name==="TimeoutError"||n?.message?.includes("timeout"),d=n?.status===401||n?.status===403;return a?p("El an\xE1lisis tard\xF3 demasiado (>90s). Intenta de nuevo; el servidor de IA puede estar ocupado."):d?p("API Key de OpenAI inv\xE1lida o sin permisos. Verifica la clave en Configuraci\xF3n."):p(`Error al contactar OpenAI (${n?.status??"sin conexi\xF3n"}). Intenta de nuevo.`)}))}callGemini(e,r,c){let n=r||"gemini-1.5-flash";return this.http.post(`https://generativelanguage.googleapis.com/v1beta/models/${n}:generateContent?key=${e}`,{contents:[{parts:[{text:c}]}]}).pipe(y(9e4),F({count:1,delay:2e3}),C(a=>a?.candidates?.[0]?.content?.parts?.[0]?.text||"Respuesta vac\xEDa de Gemini"),D(a=>{console.error("Gemini Error/Timeout:",a);let d=a?.name==="TimeoutError"||a?.message?.includes("timeout"),o=a?.status===400||a?.status===401||a?.status===403,s=a?.status===429;return d?p("El an\xE1lisis tard\xF3 demasiado (>90s). Intenta de nuevo; Gemini puede estar ocupado."):s?p("Cuota de Gemini agotada. Espera un momento e intenta de nuevo."):o?p("API Key de Gemini inv\xE1lida. Verifica la clave en Configuraci\xF3n."):p(`Error al contactar Gemini (${a?.status??"sin conexi\xF3n"}). Intenta de nuevo.`)}))}static \u0275fac=function(r){return new(r||R)};static \u0275prov=P({token:R,factory:R.\u0275fac,providedIn:"root"})};export{O as a};
