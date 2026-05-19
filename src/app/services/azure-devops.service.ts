import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { ConfigService } from './config.service';
import { Observable, forkJoin, of, catchError, switchMap, map, timeout } from 'rxjs';
import { CMMIMetrics } from '../models/metrics.model';

@Injectable({
  providedIn: 'root'
})
export class AzureDevOpsService {
  private http = inject(HttpClient);
  private configService = inject(ConfigService);

  private getHeaders(): HttpHeaders {
    const config = this.configService.getConfig();
    const token = btoa(`:${config?.azure.pat}`);
    return new HttpHeaders({
      'Authorization': `Basic ${token}`,
      'Content-Type': 'application/json'
    });
  }

  getIterationNodes(): Observable<any[]> {
    const config = this.configService.getConfig();
    if (!config || !config.azure.organization) return of([]);
    return this.http.get<any>(`https://dev.azure.com/${config.azure.organization}/${config.azure.project}/_apis/wit/classificationnodes/Iterations?$depth=5&api-version=7.0`, { headers: this.getHeaders() })
      .pipe(
        map(res => this.flattenNodes(res).filter(node => node.path.toLowerCase().includes('mayansoft'))),
        catchError(() => of([]))
      );
  }

  getAreas(): Observable<any[]> {
    const config = this.configService.getConfig();
    if (!config || !config.azure.organization) return of([]);
    return this.http.get<any>(`https://dev.azure.com/${config.azure.organization}/${config.azure.project}/_apis/wit/classificationnodes/Areas?$depth=2&api-version=7.0`, { headers: this.getHeaders() })
      .pipe(
        map(res => this.flattenNodes(res).filter(node => node.path.toLowerCase().includes('mayansoft'))),
        catchError(() => of([]))
      );
  }

  // iterationPathMap stores GUID -> full iteration path for fast lookup
  private iterationPathMap = new Map<string, string>();

  private flattenNodes(node: any, parentPath: string = ''): any[] {
    // ADO path from classificationnodes already includes project name, e.g:
    // \Bepensa - DSD Bebidas - OpeCD 2.0\Iteration\Sprint 36
    const nodePath = node.path || (parentPath ? `${parentPath}\\${node.name}` : node.name);
    const entry = { id: node.identifier, name: node.name, path: nodePath };
    this.iterationPathMap.set(node.identifier, nodePath);
    let result: any[] = [entry];
    if (node.children) {
      node.children.forEach((child: any) => {
        result = result.concat(this.flattenNodes(child, nodePath));
      });
    }
    return result;
  }

  // Cache team ID to avoid repeated API calls
  private cachedTeamId: string | null = null;

  private getDefaultTeam(): Observable<string> {
    if (this.cachedTeamId) return of(this.cachedTeamId);
    const config = this.configService.getConfig();
    if (!config) return of('');
    return this.http.get<any>(
      `https://dev.azure.com/${encodeURIComponent(config.azure.organization)}/_apis/projects/${encodeURIComponent(config.azure.project)}/teams?api-version=7.0`,
      { headers: this.getHeaders() }
    ).pipe(
      map(res => {
        const team = res.value?.[0];
        this.cachedTeamId = team?.id || '';
        console.log('Team found:', team?.name, 'ID:', this.cachedTeamId);
        return this.cachedTeamId || '';
      }),
      catchError(() => of(''))
    );
  }

  getMetrics(iterationIdOrPath: string): Observable<CMMIMetrics> {
    const config = this.configService.getConfig();
    if (!config || !config.azure.organization) return of({} as CMMIMetrics);

    const isGuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(iterationIdOrPath);

    if (isGuid) {
      console.log(`ADO Service: Fetching metrics for iteration GUID ${iterationIdOrPath}...`);
      return this.getDefaultTeam().pipe(
        timeout(10000),
        switchMap(teamId => {
          console.log(`ADO Service: Team ID identified: ${teamId || 'None (using WIQL fallback)'}`);
          if (!teamId) {
            const path = this.iterationPathMap.get(iterationIdOrPath) || iterationIdOrPath;
            console.log(`ADO Service: No team ID, falling back to WIQL using path: ${path}`);
            return this.getMetricsWIQL(path);
          }

          const workItemsUrl = `https://dev.azure.com/${encodeURIComponent(config.azure.organization)}/${encodeURIComponent(config.azure.project)}/${encodeURIComponent(teamId)}/_apis/work/teamsettings/iterations/${iterationIdOrPath}/workitems?api-version=7.0`;
          const iterationInfoUrl = `https://dev.azure.com/${encodeURIComponent(config.azure.organization)}/${encodeURIComponent(config.azure.project)}/${encodeURIComponent(teamId)}/_apis/work/teamsettings/iterations/${iterationIdOrPath}?api-version=7.0`;
          
          console.log('ADO Service: Fetching iteration workitems and info...');

          return forkJoin({
            workItems: this.http.get<any>(workItemsUrl, { headers: this.getHeaders() }).pipe(timeout(15000), catchError(e => { console.error('Work items fetch failed', e); return of({ workItemRelations: [] }); })),
            info: this.http.get<any>(iterationInfoUrl, { headers: this.getHeaders() }).pipe(timeout(15000), catchError(() => of(null)))
          }).pipe(
            switchMap(({ workItems, info }) => {
              const relations: any[] = workItems.workItemRelations || [];
              if (relations.length === 0) {
                console.warn('ADO Service: No relations found for this iteration.');
                return of(this.getEmptyMetrics());
              }
              const ids: number[] = relations.filter(r => r.target).map(r => r.target.id);
              console.log(`ADO Service: Found ${ids.length} work items in iteration.`);
              if (ids.length === 0) return of(this.getEmptyMetrics());

              const fields = [
                'System.Id', 'System.WorkItemType', 'System.Title', 'System.Parent', 'System.AreaPath',
                'Microsoft.VSTS.Scheduling.Size', 'Microsoft.VSTS.Scheduling.StoryPoints',
                'Microsoft.VSTS.Scheduling.CompletedWork', 'Microsoft.VSTS.Scheduling.OriginalEstimate',
                'Microsoft.VSTS.Scheduling.RemainingWork', 'System.AssignedTo', 'Microsoft.VSTS.Common.Priority',
                'Microsoft.VSTS.Common.Activity', 'System.CreatedDate', 'Microsoft.VSTS.Common.ClosedDate', 'System.ChangedDate', 'System.State'
              ].join(',');

              return this.getWorkItemDetails(ids, fields).pipe(
                timeout(20000),
                switchMap(details => {
                  const fetchedIds = new Set(details.map((d: any) => d.id));
                  const parentIds: number[] = [...new Set(
                    details
                      .filter((d: any) => d.fields['System.Parent'])
                      .map((d: any) => d.fields['System.Parent'] as number)
                      .filter((pid: number) => !fetchedIds.has(pid))
                  )];
                  if (parentIds.length === 0) return of(details);
                  console.log(`ADO Service: Resolving ${parentIds.length} parents...`);
                  return this.getWorkItemDetails(parentIds, fields).pipe(
                    map((parents: any[]) => {
                      const toAdd = parents.filter((p: any) => ['Feature', 'User Story'].includes(p.fields['System.WorkItemType']));
                      return [...details, ...toAdd];
                    })
                  );
                }),
                switchMap(details => this.enrichFeaturesWithDiscussionSize(details)),
                map(details => this.processWorkItemsFlat(details, info)),
                catchError(e => { console.error('ADO Service: Error processing details', e); return of(this.getEmptyMetrics()); })
              );
            }),
            catchError(err => {
              console.warn('ADO Service: Team API logic failed, trying WIQL fallback');
              const path = this.iterationPathMap.get(iterationIdOrPath) || iterationIdOrPath;
              console.log(`ADO Service: Falling back to WIQL using path: ${path}`);
              return this.getMetricsWIQL(path);
            })
          );
        }),
        timeout(30000),
        catchError(err => {
          console.error('ADO Service: getMetrics failed completely', err);
          return of(this.getEmptyMetrics());
        })
      );
    } else {
      return this.getMetricsWIQL(iterationIdOrPath);
    }
  }

  private getMetricsWIQL(iterationPath: string): Observable<CMMIMetrics> {
    const config = this.configService.getConfig();
    if (!config) return of(this.getEmptyMetrics());
    const headers = this.getHeaders();

    // Resolve GUID to path if available in map
    let path = iterationPath;
    const isGuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(iterationPath);
    if (isGuid && this.iterationPathMap.has(iterationPath)) {
      path = this.iterationPathMap.get(iterationPath)!;
    }

    // Normalize path: remove leading backslash and strip the internal \Iteration\ node segment
    // ADO returns: \ProjectName\Iteration\SubPath\Sprint 36
    // WIQL needs:   ProjectName\SubPath\Sprint 36
    path = path.replace(/^\\/, '');
    const iterationSegmentMatch = path.match(/^([^\\]+)\\Iteration\\(.+)$/i);
    if (iterationSegmentMatch) {
      path = `${iterationSegmentMatch[1]}\\${iterationSegmentMatch[2]}`;
    }

    console.log('WIQL path:', path);
    const escaped = path.replace(/'/g, "''");
    const wiqlQuery = `SELECT [System.Id] FROM WorkItems WHERE [System.IterationPath] UNDER '${escaped}'`;

    return this.http.post<any>(
      `https://dev.azure.com/${encodeURIComponent(config.azure.organization)}/${encodeURIComponent(config.azure.project)}/_apis/wit/wiql?api-version=7.0`,
      { query: wiqlQuery },
      { headers }
    ).pipe(
      timeout(15000),
      switchMap(res => {
        const ids: number[] = (res.workItems || []).map((wi: any) => wi.id);
        if (ids.length === 0) return of(this.getEmptyMetrics());

        const fields = [
          'System.Id', 'System.WorkItemType', 'System.Title', 'System.Parent', 'System.AreaPath',
          'Microsoft.VSTS.Scheduling.Size', 'Microsoft.VSTS.Scheduling.StoryPoints',
          'Microsoft.VSTS.Scheduling.CompletedWork', 'Microsoft.VSTS.Scheduling.OriginalEstimate',
          'System.AssignedTo', 'Microsoft.VSTS.Common.Priority', 'System.CreatedDate', 'Microsoft.VSTS.Common.ClosedDate', 'System.ChangedDate', 'System.State'
        ].join(',');

          return this.getWorkItemDetails(ids, fields).pipe(
            timeout(20000),
            switchMap(details => this.enrichFeaturesWithDiscussionSize(details)),
            map(details => this.processWorkItemsFlat(details))
          );
      }),
      catchError(err => {
        console.error('WIQL Error or Timeout:', err);
        return of(this.getEmptyMetrics());
      })
    );
  }

  private getWorkItemDetails(ids: number[], fields: string): Observable<any[]> {
    const config = this.configService.getConfig();
    if (!config) return of([]);
    const headers = this.getHeaders();
    const batchSize = 200;
    const batches = [];
    for (let i = 0; i < ids.length; i += batchSize) {
      const batchIds = ids.slice(i, i + batchSize).join(',');
      batches.push(
        this.http.get<any>(`https://dev.azure.com/${config.azure.organization}/${config.azure.project}/_apis/wit/workitems?ids=${batchIds}&fields=${fields}&expand=relations&api-version=7.0`, { headers })
      );
    }
    return forkJoin(batches).pipe(
      map((results: any[]) => results.flatMap(r => r.value)),
      catchError(err => {
        console.error('Error fetching work item details:', err);
        return of([]);
      })
    );
  }

  /**
   * For Features (or any item) with Size = 0, fetch their Discussion comments
   * and parse a line matching /Size\s*=\s*(\d+)/i to extract the size.
   */
  private enrichFeaturesWithDiscussionSize(items: any[]): Observable<any[]> {
    const config = this.configService.getConfig();
    if (!config) return of(items);
    const headers = this.getHeaders();

    // Find Feature items with no size
    const needsComment = items.filter(i =>
      i.fields['System.WorkItemType'] === 'Feature' &&
      !i.fields['Microsoft.VSTS.Scheduling.Size'] &&
      !i.fields['Microsoft.VSTS.Scheduling.StoryPoints']
    );

    if (needsComment.length === 0) return of(items);

    const commentRequests = needsComment.map(item =>
      this.http.get<any>(
        `https://dev.azure.com/${config.azure.organization}/${config.azure.project}/_apis/wit/workItems/${item.id}/comments?api-version=7.0-preview.3`,
        { headers }
      ).pipe(
        map(res => {
          const comments: any[] = res.comments || [];
          // Search newest-first for pattern like: Size = 19  or  size=8
          for (const c of [...comments].reverse()) {
            const text: string = c.text || c.renderedText || '';
            const match = text.match(/Size\s*=\s*(\d+(?:\.\d+)?)/i);
            if (match) {
              item.fields['_discussionSize'] = parseFloat(match[1]);
              console.log(`FT ${item.id}: found Size=${match[1]} in discussion`);
              break;
            }
          }
          return item;
        }),
        catchError(() => of(item)) // if comments API fails, just return item as-is
      )
    );

    return forkJoin(commentRequests).pipe(
      map(enriched => {
        // Merge enriched features back into the full items array
        const enrichedMap = new Map(enriched.map((i: any) => [i.id, i]));
        return items.map(i => enrichedMap.has(i.id) ? enrichedMap.get(i.id) : i);
      })
    );
  }

  private processWorkItemsFlat(items: any[], iterationInfo?: any): CMMIMetrics {
    const iterationName = iterationInfo?.name || '';
    const startDate = iterationInfo?.attributes?.startDate || '';
    const endDate = iterationInfo?.attributes?.finishDate || '';

    const parents = items.filter(i => ['User Story', 'Feature'].includes(i.fields['System.WorkItemType']));
    const tasks = items.filter(i => i.fields['System.WorkItemType'] === 'Task');
    const bugs = items.filter(i => i.fields['System.WorkItemType'] === 'Bug');
    const risks = items.filter(i => i.fields['System.WorkItemType'] === 'Risk');

    const itemsMap = new Map<number, any>(items.map(i => [parseInt(i.id.toString()), i]));
    const parentEffortMap = new Map<number, { completed: number, planned: number, isw: string }>();

    tasks.forEach(task => {
      const parentId = task.fields['System.Parent'];
      if (parentId) {
        const current = parentEffortMap.get(parentId) || { completed: 0, planned: 0, isw: '' };
        current.completed += task.fields['Microsoft.VSTS.Scheduling.CompletedWork'] || 0;
        current.planned += task.fields['Microsoft.VSTS.Scheduling.OriginalEstimate'] || 0;
        current.isw = task.fields['System.AssignedTo']?.displayName || current.isw;
        parentEffortMap.set(parentId, current);
      }
    });

    // Bi-directional map of all work item relations
    const relationMap = new Map<number, Set<number>>();
    items.forEach(item => {
      const id = parseInt(item.id.toString());
      if (!relationMap.has(id)) relationMap.set(id, new Set<number>());
      
      // Add System.Parent
      const parentId = item.fields['System.Parent'];
      if (parentId) {
        relationMap.get(id)!.add(parentId);
        if (!relationMap.has(parentId)) relationMap.set(parentId, new Set<number>());
        relationMap.get(parentId)!.add(id);
      }

      // Add Relations
      if (item.relations) {
        item.relations.forEach((rel: any) => {
            const idMatch = rel.url.match(/workItems\/(\d+)/i);
            if (idMatch) {
              const targetId = parseInt(idMatch[1]);
              relationMap.get(id)!.add(targetId);
              if (!relationMap.has(targetId)) relationMap.set(targetId, new Set<number>());
              relationMap.get(targetId)!.add(id);
            }
          });
        }
      });

      const getDisplayName = (val: any) => {
        if (!val) return null;
        return typeof val === 'object' ? val.displayName : val;
      };

      const devItemsRaw = parents.map(p => {
        const parentId = parseInt(p.id.toString(), 10);
        const parentType = p.fields['System.WorkItemType'] === 'Feature' ? 'FT' : 'US';
        const titlePattern = new RegExp(`${parentType}\\s*${parentId}\\s*:`, 'i');

        const matchingTasks = tasks.filter(t => {
          const title: string = t.fields['System.Title'] || '';
          return titlePattern.test(title) || t.fields['System.Parent'] === parentId;
        });

        const linkedIds = relationMap.get(parentId) || new Set<number>();
        const taskIds = matchingTasks.map(t => parseInt(t.id.toString()));
        
        const linkedBugs = bugs.filter(b => {
          const bId = parseInt(b.id.toString());
          // Linked to Requirement directly
          if (linkedIds.has(bId)) return true;
          // Linked to any Task of the Requirement
          return taskIds.some(tid => relationMap.get(tid)?.has(bId));
        });
        
        const relatedBugs = linkedBugs.map(b => {
          const bugId = b.id;
          const bTasks = tasks.filter(t => t.fields['System.Parent'] === bugId).map(t => ({
            id: t.id,
            title: t.fields['System.Title'] || '',
            assignedTo: getDisplayName(t.fields['System.AssignedTo']) || 'Sin asignar',
            originalEstimate: t.fields['Microsoft.VSTS.Scheduling.OriginalEstimate'] || 0,
            completedWork: t.fields['Microsoft.VSTS.Scheduling.CompletedWork'] || 0,
            remainingWork: t.fields['Microsoft.VSTS.Scheduling.RemainingWork'] || 0,
            type: t.fields['Custom.TaskType'] || t.fields['Microsoft.VSTS.Common.Activity'] || '',
            discipline: t.fields['Custom.Discipline'] || '',
            createdDate: t.fields['System.CreatedDate'],
            closedDate: t.fields['Microsoft.VSTS.Common.ClosedDate'],
            changedDate: t.fields['System.ChangedDate'],
            status: t.fields['System.State']
          }));

          const completed = bTasks.reduce((s, t) => s + t.completedWork, 0) || b.fields['Microsoft.VSTS.Scheduling.CompletedWork'] || 0;
          const planned = bTasks.reduce((s, t) => s + t.originalEstimate, 0) || b.fields['Microsoft.VSTS.Scheduling.OriginalEstimate'] || 0;

          return {
            id: bugId,
            title: b.fields['System.Title'] || '',
            assignedTo: getDisplayName(b.fields['System.AssignedTo']) || 'Sin asignar',
            originalEstimate: planned,
            completedWork: completed,
            remainingWork: b.fields['Microsoft.VSTS.Scheduling.RemainingWork'] || 0,
            tasks: bTasks,
            createdDate: b.fields['System.CreatedDate'],
            closedDate: b.fields['Microsoft.VSTS.Common.ClosedDate'],
            changedDate: b.fields['System.ChangedDate'],
            status: b.fields['System.State']
          };
        });

        const allTasks = matchingTasks.map(t => ({
          id: t.id,
          title: t.fields['System.Title'] || '',
          assignedTo: getDisplayName(t.fields['System.AssignedTo']) || 'Sin asignar',
          originalEstimate: t.fields['Microsoft.VSTS.Scheduling.OriginalEstimate'] || 0,
          completedWork: t.fields['Microsoft.VSTS.Scheduling.CompletedWork'] || 0,
          remainingWork: t.fields['Microsoft.VSTS.Scheduling.RemainingWork'] || 0,
          type: t.fields['Custom.TaskType'] || t.fields['Microsoft.VSTS.Common.Activity'] || '',
          discipline: t.fields['Custom.Discipline'] || '',
          createdDate: t.fields['System.CreatedDate'],
          closedDate: t.fields['Microsoft.VSTS.Common.ClosedDate'],
          changedDate: t.fields['System.ChangedDate'],
          status: t.fields['System.State']
        }));

        const totalPlannedOriginal = allTasks.reduce((s, t) => s + t.originalEstimate, 0);
        const totalPlannedCompleted = allTasks.reduce((s, t) => s + t.completedWork, 0);
        
        const assignedTo = p.fields['System.AssignedTo'];
        const effortData = parentEffortMap.get(parentId) || { isw: 'Unassigned' };
        const isw = getDisplayName(assignedTo) || effortData.isw || 'Unassigned';

        const fieldSize = p.fields['Microsoft.VSTS.Scheduling.Size'] || p.fields['Microsoft.VSTS.Scheduling.StoryPoints'] || 0;
        const size = fieldSize || p.fields['_discussionSize'] || 0;

        return {
          project: p.fields['System.AreaPath'] || 'OPE20',
          type: p.fields['System.WorkItemType'],
          id: p.id.toString(),
          isw,
          level: p.fields['Custom.Level'] || 'ISW MID',
          size,
          sizeSource: (fieldSize > 0 ? 'field' : (p.fields['_discussionSize'] > 0 ? 'discussion' : 'none')) as any,
          planned: totalPlannedOriginal,
          effort: totalPlannedCompleted, // Only planned effort for Metric 1 & 2
          rate: size > 0 ? totalPlannedCompleted / size : 0,
          status: p.fields['System.State'],
          title: p.fields['System.Title'] || '',
          tasks: allTasks,
          relatedBugs: relatedBugs,
          createdDate: p.fields['System.CreatedDate'],
          closedDate: p.fields['Microsoft.VSTS.Common.ClosedDate'],
          changedDate: p.fields['System.ChangedDate']
        };
      });

      // Find bugs that are NOT linked to any parent already in devItems
      const linkedBugIds = new Set<number>();
      devItemsRaw.forEach(di => di.relatedBugs?.forEach(rb => linkedBugIds.add(rb.id)));
      
      const standaloneBugs = bugs.filter(b => !linkedBugIds.has(parseInt(b.id.toString())));
      const bugItems = standaloneBugs.map(b => {
        const bugId = b.id;
        const bTasks = tasks.filter(t => t.fields['System.Parent'] === bugId).map(t => ({
          id: t.id,
          title: t.fields['System.Title'] || '',
          assignedTo: getDisplayName(t.fields['System.AssignedTo']) || 'Sin asignar',
          originalEstimate: t.fields['Microsoft.VSTS.Scheduling.OriginalEstimate'] || 0,
          completedWork: t.fields['Microsoft.VSTS.Scheduling.CompletedWork'] || 0,
          remainingWork: t.fields['Microsoft.VSTS.Scheduling.RemainingWork'] || 0,
          type: t.fields['Custom.TaskType'] || t.fields['Microsoft.VSTS.Common.Activity'] || '',
          discipline: t.fields['Custom.Discipline'] || '',
          createdDate: t.fields['System.CreatedDate'],
          closedDate: t.fields['Microsoft.VSTS.Common.ClosedDate'],
          changedDate: t.fields['System.ChangedDate'],
          status: t.fields['System.State']
        }));

        const effort = bTasks.reduce((s, t) => s + t.completedWork, 0) || b.fields['Microsoft.VSTS.Scheduling.CompletedWork'] || 0;
        const assignedTo = b.fields['System.AssignedTo'];
        const isw = getDisplayName(assignedTo) || 'Unassigned';

        return {
          project: b.fields['System.AreaPath'] || 'OPE20',
          type: 'Bug',
          id: b.id.toString(),
          isw,
          level: b.fields['Custom.Level'] || 'ISW MID',
          size: 0,
          sizeSource: 'none' as any,
          effort: effort,
          rate: 0,
          title: b.fields['System.Title'] || '',
          tasks: [],
          createdDate: b.fields['System.CreatedDate'],
          closedDate: b.fields['Microsoft.VSTS.Common.ClosedDate'],
          changedDate: b.fields['System.ChangedDate'],
          status: b.fields['System.State'],
          relatedBugs: [{
            id: bugId,
            title: b.fields['System.Title'] || '',
            assignedTo: isw,
            originalEstimate: bTasks.reduce((s, t) => s + t.originalEstimate, 0) || b.fields['Microsoft.VSTS.Scheduling.OriginalEstimate'] || 0,
            completedWork: effort,
            remainingWork: b.fields['Microsoft.VSTS.Scheduling.RemainingWork'] || 0,
            tasks: bTasks,
            createdDate: b.fields['System.CreatedDate'],
            closedDate: b.fields['Microsoft.VSTS.Common.ClosedDate'],
            changedDate: b.fields['System.ChangedDate'],
            status: b.fields['System.State']
          }]
        };
      });


    const devItems = devItemsRaw;
    const totalEffortGlobal = tasks.reduce((acc, t) => acc + (t.fields['Microsoft.VSTS.Scheduling.CompletedWork'] || 0), 0) + bugs.reduce((acc, b) => acc + (b.fields['Microsoft.VSTS.Scheduling.CompletedWork'] || 0), 0);
    const totalPlannedGlobal = tasks.reduce((acc, t) => acc + (t.fields['Microsoft.VSTS.Scheduling.OriginalEstimate'] || 0), 0) + bugs.reduce((acc, b) => acc + (b.fields['Microsoft.VSTS.Scheduling.OriginalEstimate'] || 0), 0);
    const totalSize = devItems.reduce((acc, i) => acc + i.size, 0);
    
    const devRate = totalSize > 0 ? totalEffortGlobal / totalSize : 0;
    const effortRate = totalPlannedGlobal > 0 ? (totalEffortGlobal - totalPlannedGlobal) / totalPlannedGlobal : 0;

    // Metric 3: Rework Calculation
    const isRequirementDone = (state: string) => ['Closed', 'Resolved', 'Done', 'Completed'].includes(state);
    
    // 1. Numerator: All Rework (Bugs + Corrective Tasks) in the iteration
    let totalReqRework = 0;
    let totalBugRework = 0;
    
    // Corrective tasks from all sources
    tasks.forEach(task => {
      const type = (task.fields['Custom.TaskType'] || task.fields['Microsoft.VSTS.Common.Activity'] || '').toLowerCase();
      const effort = (task.fields['Microsoft.VSTS.Scheduling.CompletedWork'] || 0);
      
      if (type.includes('correctiv') || type.includes('retrabajo') || type.includes('fix') || type.includes('ajuste') || type.includes('rework') || type.includes('atencion') || type.includes('defecto') || type.includes('incidencia')) {
        totalReqRework += effort;
      } else if (type.includes('bug') || type.includes('error')) {
        totalBugRework += effort;
      }
    });

    // All bugs effort (if not already counted via tasks)
    bugs.forEach(bug => {
      const bTasks = tasks.filter(t => t.fields['System.Parent'] === bug.id);
      if (bTasks.length === 0) {
        totalBugRework += (bug.fields['Microsoft.VSTS.Scheduling.CompletedWork'] || 0);
      }
    });

    const totalReworkHours = totalReqRework + totalBugRework;

    // 2. Denominator: Planned effort of CLOSED Requirements
    let closedReqEffort = 0;
    devItemsRaw.forEach(item => {
      const parent = itemsMap.get(parseInt(item.id));
      if (parent && isRequirementDone(parent.fields['System.State'])) {
        closedReqEffort += item.effort;
      }
    });

    const reworkRate = closedReqEffort > 0 ? (totalReworkHours / closedReqEffort) * 100 : 0;
    
    // Defect Density calculation
    const defectDensity = totalSize > 0 ? bugs.length / totalSize : 0;

    return {
      iterationName,
      startDate,
      endDate,
      developmentRate: {
        rate: devRate,
        effort: totalEffortGlobal,
        size: totalSize,
        status: devRate <= 1.7 ? 'green' : devRate <= 2.0 ? 'yellow' : 'red',
        totalItems: devItems.length,
        totalEffort: totalEffortGlobal,
        totalSize: totalSize,
        stdDeviation: 0,
        items: devItems
      },
      effortVariance: {
        planned: totalPlannedGlobal,
        actual: totalEffortGlobal,
        rate: effortRate,
        stdDeviation: 0,
        avgIndividualRate: 0,
        absoluteRate: Math.abs(effortRate),
        status: Math.abs(effortRate) <= 0.15 ? 'green' : (Math.abs(effortRate) <= 0.3 ? 'yellow' : 'red')
      },
      rework: {
        reqEffort: closedReqEffort,
        reqRework: totalReqRework,
        bugRework: totalBugRework,
        totalRework: totalReworkHours,
        rate: reworkRate,
        status: reworkRate <= 22 ? 'green' : (reworkRate <= 30 ? 'yellow' : 'red')
      },
      defectDensity: {
        bugs: bugs.length,
        size: totalSize,
        density: defectDensity,
        status: defectDensity <= 0.18 ? 'green' : (defectDensity <= 0.23 ? 'yellow' : 'red')
      },
      riskCriticality: {
        risks: risks.map(i => ({
          id: i.id,
          title: i.fields['System.Title'],
          impact: i.fields['Microsoft.VSTS.Common.Priority'] || 3,
          probability: 0.5,
          score: (i.fields['Microsoft.VSTS.Common.Priority'] || 3) * 5
        })),
        totalScore: risks.length > 0 ? 15 : 0 // Simplified
      }
    };
  }

  private getEmptyMetrics(): CMMIMetrics {
    return {
      iterationName: '',
      startDate: '',
      endDate: '',
      developmentRate: { rate: 0, effort: 0, size: 0, status: 'green', totalItems: 0, totalEffort: 0, totalSize: 0, stdDeviation: 0, items: [] },
      effortVariance: { planned: 0, actual: 0, rate: 0, stdDeviation: 0, avgIndividualRate: 0, absoluteRate: 0, status: 'green' },
      rework: { reqEffort: 0, reqRework: 0, bugRework: 0, totalRework: 0, rate: 0, status: 'green' },
      defectDensity: { bugs: 0, size: 0, density: 0, status: 'green' },
      riskCriticality: { risks: [], totalScore: 0 }
    };
  }
}
