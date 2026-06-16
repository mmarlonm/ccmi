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
        map(res => {
          const nodes = this.flattenNodes(res);
          return nodes
            .filter(node => node.path.toLowerCase().includes('mayansoft'))
            .sort((a: any, b: any) => {
              const da = a.startDate ? new Date(a.startDate).getTime() : 0;
              const db = b.startDate ? new Date(b.startDate).getTime() : 0;
              return da - db; // ascending: oldest → newest
            });
        }),
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
    const attrs = node.attributes || {};
    const entry = { id: node.identifier, name: node.name, path: nodePath, startDate: attrs.startDate || '' };
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
        return this.cachedTeamId || '';
      }),
      catchError(() => of(''))
    );
  }

  private formatTesterName(point: any): string {
    const name = point.tester?.displayName || point.tester?.name || point.testerName || point.assignedTo?.displayName || point.assignedTo?.name || point.lastResult?.tester?.displayName || point.lastResult?.owner?.displayName || point.lastResult?.owner?.name || '';
    if (!name) {
      return 'Sin asignar';
    }
    const cleaned = name.replace(/\(([^)]+)\)/g, '').trim();
    return cleaned || 'Sin asignar';
  }

  getMetrics(iterationIdOrPath: string): Observable<CMMIMetrics> {
    const config = this.configService.getConfig();
    if (!config || !config.azure.organization) return of({} as CMMIMetrics);

    const isGuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(iterationIdOrPath);

    if (isGuid) {
      return this.getDefaultTeam().pipe(
        timeout(10000),
        switchMap(teamId => {
          if (!teamId) {
            const path = this.iterationPathMap.get(iterationIdOrPath) || iterationIdOrPath;
            return this.getMetricsWIQL(path);
          }

          const workItemsUrl = `https://dev.azure.com/${encodeURIComponent(config.azure.organization)}/${encodeURIComponent(config.azure.project)}/${encodeURIComponent(teamId)}/_apis/work/teamsettings/iterations/${iterationIdOrPath}/workitems?api-version=7.0`;
          const iterationInfoUrl = `https://dev.azure.com/${encodeURIComponent(config.azure.organization)}/${encodeURIComponent(config.azure.project)}/${encodeURIComponent(teamId)}/_apis/work/teamsettings/iterations/${iterationIdOrPath}?api-version=7.0`;


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
              if (ids.length === 0) return of(this.getEmptyMetrics());

              const fields = [
                'System.Id', 'System.WorkItemType', 'System.Title', 'System.Parent', 'System.AreaPath', 'System.IterationPath',
                'Microsoft.VSTS.Scheduling.Size', 'Microsoft.VSTS.Scheduling.StoryPoints',
                'Microsoft.VSTS.Scheduling.CompletedWork', 'Microsoft.VSTS.Scheduling.OriginalEstimate',
                'Microsoft.VSTS.Scheduling.RemainingWork', 'System.AssignedTo', 'Microsoft.VSTS.Common.Priority',
                'Microsoft.VSTS.Common.Activity', 'System.CreatedDate', 'Microsoft.VSTS.Common.ClosedDate', 'System.ChangedDate', 'System.State', 'System.Tags'
              ].join(',');

              return this.getWorkItemDetails(ids, fields).pipe(
                timeout(20000),
                switchMap(details => this.expandWorkItemsRecursively(details, fields, 3)),
                switchMap(details => this.enrichFeaturesWithDiscussionSize(details)),
                switchMap(details => {
                  const absoluteIterationPath = this.iterationPathMap.get(iterationIdOrPath) || iterationIdOrPath;
                  const metrics = this.processWorkItemsFlat(details, info, absoluteIterationPath);
                  return this.enrichMetricsWithTestExecution(metrics, absoluteIterationPath);
                }),
                catchError(e => { console.error('ADO Service: Error processing details', e); return of(this.getEmptyMetrics()); })
              );
            }),
            catchError(err => {
              console.warn('ADO Service: Team API logic failed, trying WIQL fallback');
              const path = this.iterationPathMap.get(iterationIdOrPath) || iterationIdOrPath;
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
          'System.Id', 'System.WorkItemType', 'System.Title', 'System.Parent', 'System.AreaPath', 'System.IterationPath',
          'Microsoft.VSTS.Scheduling.Size', 'Microsoft.VSTS.Scheduling.StoryPoints',
          'Microsoft.VSTS.Scheduling.CompletedWork', 'Microsoft.VSTS.Scheduling.OriginalEstimate',
          'Microsoft.VSTS.Scheduling.RemainingWork', 'System.AssignedTo', 'Microsoft.VSTS.Common.Priority',
          'Microsoft.VSTS.Common.Activity', 'System.CreatedDate', 'Microsoft.VSTS.Common.ClosedDate', 'System.ChangedDate', 'System.State', 'System.Tags'
        ].join(',');

        return this.getWorkItemDetails(ids, fields).pipe(
          timeout(20000),
          switchMap(details => this.expandWorkItemsRecursively(details, fields, 3)),
          switchMap(allDetails => this.enrichFeaturesWithDiscussionSize(allDetails)),
          switchMap(allDetails => {
            const metrics = this.processWorkItemsFlat(allDetails, { path: iterationPath, name: iterationPath.split('\\').pop() || '' }, iterationPath);
            return this.enrichMetricsWithTestExecution(metrics, iterationPath);
          })
        );
      }),
      catchError(err => {
        console.error('WIQL Error or Timeout:', err);
        return of(this.getEmptyMetrics());
      })
    );
  }

  private expandWorkItemsRecursively(initialItems: any[], fields: string, depth: number = 3): Observable<any[]> {
    if (depth <= 0) return of(initialItems);

    const fetchedIds = new Set<number>(initialItems.map(item => parseInt(item.id.toString())));
    const idsToFetch = new Set<number>();

    initialItems.forEach(item => {
      // 1. Parent relation (System.Parent)
      const parentId = item.fields?.['System.Parent'];
      if (parentId) {
        const pId = parseInt(parentId.toString());
        if (!fetchedIds.has(pId)) {
          idsToFetch.add(pId);
        }
      }

      // 2. Relations links (e.g. child tasks of bugs, affected by bugs, etc)
      if (item.relations) {
        item.relations.forEach((rel: any) => {
          const idMatch = rel.url?.match(/workItems\/(\d+)/i);
          if (idMatch) {
            const targetId = parseInt(idMatch[1]);
            if (!fetchedIds.has(targetId)) {
              idsToFetch.add(targetId);
            }
          }
        });
      }
    });

    if (idsToFetch.size === 0) return of(initialItems);

    return this.getWorkItemDetails(Array.from(idsToFetch), fields).pipe(
      switchMap(newItems => {
        const combined = [...initialItems, ...newItems];
        return this.expandWorkItemsRecursively(combined, fields, depth - 1);
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

  private processWorkItemsFlat(items: any[], iterationInfo?: any, absoluteIterationPath?: string): CMMIMetrics {
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

    const bugParentAreaMap = new Map<number, string>();
    const bugParentIterationMap = new Map<number, string>();

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

      const parentArea = p.fields['System.AreaPath'] || 'OPE20';
      const parentIteration = p.fields['System.IterationPath'] || absoluteIterationPath || iterationInfo?.path || '';
      linkedBugs.forEach(lb => {
        const lbId = parseInt(lb.id.toString());
        bugParentAreaMap.set(lbId, parentArea);
        bugParentIterationMap.set(lbId, parentIteration);
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
          status: b.fields['System.State'],
          tags: b.fields['System.Tags'] || ''
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
        parentId: p.fields['System.Parent']?.toString() || '',
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
        tasks: bTasks,
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

    // Defect Removal Efficiency (EED) calculation
    const getLocalCalendarDate = (dateStr: string | undefined, isEndOfDay: boolean = false): number => {
      if (!dateStr) return 0;
      const d = new Date(dateStr);
      const year = d.getUTCFullYear();
      const month = d.getUTCMonth();
      const day = d.getUTCDate();
      const localDate = new Date(year, month, day);
      if (isEndOfDay) {
        localDate.setHours(23, 59, 59, 999);
      } else {
        localDate.setHours(0, 0, 0, 0);
      }
      return localDate.getTime();
    };

    const start = startDate ? getLocalCalendarDate(startDate, false) : 0;
    const end = endDate ? getLocalCalendarDate(endDate, true) : 0;
    const eedBugs: any[] = [];
    const seenBugs = new Set<number>();

    // First, collect bugs linked to requirements
    devItems.forEach(item => {
      item.relatedBugs?.forEach(bug => {
        // Skip UAT bugs for EED metric
        const bugTags = (bug.tags || '').toLowerCase().split(';').map((t: string) => t.trim());
        if (bugTags.some((t: string) => t === 'uat' || t.includes('uat'))) {
          return;
        }

        if (!seenBugs.has(bug.id)) {
          seenBugs.add(bug.id);
          const state = bug.status || 'Active';
          const isClosed = ['Closed', 'Resolved', 'Done', 'Completed'].includes(state);
          let closedTime = 0;
          let alignment: 'on-time' | 'late' | 'none' = 'none';

          if (isClosed) {
            const closedDateStr = bug.closedDate || bug.changedDate;
            if (closedDateStr) {
              closedTime = getLocalCalendarDate(closedDateStr, false);
              const isWithinSprint = (!start || closedTime >= start) && (!end || closedTime <= end);
              if (isWithinSprint) {
                alignment = 'on-time';
              } else {
                alignment = 'late';
              }
            } else {
              alignment = 'on-time';
            }
          }

          eedBugs.push({
            project: item.project,
            iteration: iterationName,
            startDate,
            endDate,
            parentType: item.type === 'Feature' ? 'Feature' : 'User Story',
            parentId: item.id,
            isw: bug.assignedTo || item.isw || 'Sin asignar',
            bugId: bug.id.toString(),
            title: bug.title,
            createdDate: bug.createdDate,
            closedDate: bug.closedDate,
            status: state,
            alignment,
            isKanban: false
          });
        }
      });
    });

    // Then, collect standalone bugs in the iteration that weren't linked
    bugs.forEach(b => {
      const bId = parseInt(b.id.toString());
      if (!seenBugs.has(bId)) {
        // Skip UAT bugs for EED metric
        const bugTagsStr = b.fields['System.Tags'] || '';
        const bugTags = bugTagsStr.toLowerCase().split(';').map((t: string) => t.trim());
        if (bugTags.some((t: string) => t === 'uat' || t.includes('uat'))) {
          return;
        }

        seenBugs.add(bId);
        const state = b.fields['System.State'];
        const isClosed = ['Closed', 'Resolved', 'Done', 'Completed'].includes(state);
        let closedTime = 0;
        let alignment: 'on-time' | 'late' | 'none' = 'none';

        if (isClosed) {
          const closedDateStr = b.fields['Microsoft.VSTS.Common.ClosedDate'] || b.fields['System.ChangedDate'];
          if (closedDateStr) {
            closedTime = getLocalCalendarDate(closedDateStr, false);
            const isWithinSprint = (!start || closedTime >= start) && (!end || closedTime <= end);
            if (isWithinSprint) {
              alignment = 'on-time';
            } else {
              alignment = 'late';
            }
          } else {
            alignment = 'on-time';
          }
        }

        const assignedTo = b.fields['System.AssignedTo'];
        const isw = getDisplayName(assignedTo) || 'Sin asignar';

        const createdDateStr = b.fields['System.CreatedDate'];
        const createdTime = createdDateStr ? getLocalCalendarDate(createdDateStr, false) : 0;
        const isKanban = start > 0 && createdTime > 0 && createdTime < start;

        eedBugs.push({
          project: b.fields['System.AreaPath'] || 'OPE20',
          iteration: iterationName,
          startDate,
          endDate,
          parentType: 'Standalone',
          parentId: '',
          isw: isw,
          bugId: b.id.toString(),
          title: b.fields['System.Title'] || '',
          createdDate: b.fields['System.CreatedDate'],
          closedDate: b.fields['Microsoft.VSTS.Common.ClosedDate'],
          status: state,
          alignment,
          isKanban
        });
      }
    });

    const sprintBugs = eedBugs.filter(eb => !eb.isKanban);
    const totalBugs = sprintBugs.length;
    const closedEnTiempo = sprintBugs.filter(eb => eb.alignment === 'on-time').length;
    const closedFueraTiempo = sprintBugs.filter(eb => eb.alignment === 'late').length;
    const proposedCount = sprintBugs.filter(eb => ['Proposed', 'New'].includes(eb.status)).length;
    const resolvedCount = sprintBugs.filter(eb => eb.status === 'Resolved').length;
    const activeCount = sprintBugs.filter(eb => ['Active', 'Approved', 'Committed'].includes(eb.status)).length;

    // EED represents Defect Removal Efficiency: (Total Closed Bugs / Total Bugs) * 100
    const eedRate = totalBugs > 0 ? (closedEnTiempo / totalBugs) * 100 : 100;
    const eedStatus = eedRate >= 81 ? 'green' : (eedRate >= 71 ? 'yellow' : 'red');

    // --- ESCAPED BUGS METRIC (3.6) CALCULATION ---
    const getBugClassification = (tagsStr: string | undefined): 'testing' | 'uat' | 'produccion' | 'ignore' => {
      const tags = (tagsStr || '').toLowerCase().split(';').map(t => t.trim());

      const hasNoInyectado = tags.some(t =>
        t.includes('noinyectado') ||
        t.includes('no inyectado') ||
        (t.includes('no') && t.includes('inyect')) ||
        (t.includes('sin') && t.includes('inyect'))
      );
      if (hasNoInyectado) {
        return 'ignore';
      }

      const hasUat = tags.some(t => t.includes('uat'));
      if (hasUat) {
        return 'produccion';
      }

      const hasProd = tags.some(t =>
        t.includes('prod') ||
        t.includes('producci') ||
        t.includes('escapado')
      );
      if (hasProd) {
        return 'produccion';
      }

      return 'testing';
    };

    const escapedBugsList = bugs.map(b => {
      const tagsStr = b.fields['System.Tags'] || '';
      const classification = getBugClassification(tagsStr);

      if (classification === 'ignore') return null;

      const bId = parseInt(b.id.toString());
      const parentAreaPath = bugParentAreaMap.get(bId) || b.fields['System.AreaPath'] || 'OPE20';
      const parentIterationPath = bugParentIterationMap.get(bId) || b.fields['System.IterationPath'] || absoluteIterationPath || iterationInfo?.path || '';

      return {
        project: parentAreaPath,
        iteration: parentIterationPath,
        bugId: b.id.toString(),
        title: b.fields['System.Title'] || '',
        createdDate: b.fields['System.CreatedDate'],
        closedDate: b.fields['Microsoft.VSTS.Common.ClosedDate'],
        status: b.fields['System.State'] || '',
        isw: getDisplayName(b.fields['System.AssignedTo']) || 'Sin asignar',
        classification: classification
      };
    }).filter(b => b !== null);

    let escapedBugsTesting = 0;
    let escapedBugsUat = 0;
    let escapedBugsProd = 0;

    escapedBugsList.forEach((b: any) => {
      if (b.classification === 'testing') escapedBugsTesting++;
      else if (b.classification === 'uat') escapedBugsUat++;
      else if (b.classification === 'produccion') escapedBugsProd++;
    });

    const escapedTotalBugs = escapedBugsTesting + escapedBugsUat + escapedBugsProd;
    const escapedRate = escapedTotalBugs > 0 
      ? ((escapedBugsProd + escapedBugsUat) / escapedTotalBugs) * 100 
      : 0;
    const escapedStatus = escapedRate <= 33 ? 'green' : (escapedRate <= 40 ? 'yellow' : 'red');

    // Print to console as requested
    bugs.forEach(b => {
      const tagsStr = b.fields['System.Tags'] || '';
      const bugIteration = b.fields['System.IterationPath'] || absoluteIterationPath || iterationInfo?.path || '';
    });

    const escapedBugsResult = {
      bugsTesting: escapedBugsTesting,
      bugsUat: escapedBugsUat,
      bugsProd: escapedBugsProd,
      totalBugs: escapedTotalBugs,
      rate: escapedRate,
      status: escapedStatus as 'green' | 'yellow' | 'red',
      stdDeviation: 0,
      bugsList: escapedBugsList as any[],
      rows: []
    };

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
      defectRemovalEfficiency: {
        totalBugs: totalBugs,
        closedOnTime: closedEnTiempo,
        closedLate: closedFueraTiempo,
        proposed: proposedCount,
        resolved: resolvedCount,
        active: activeCount,
        rate: eedRate,
        status: eedStatus,
        bugsList: eedBugs
      },
      escapedBugs: escapedBugsResult
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
      defectRemovalEfficiency: {
        totalBugs: 0,
        closedOnTime: 0,
        closedLate: 0,
        proposed: 0,
        resolved: 0,
        active: 0,
        rate: 0,
        status: 'green',
        bugsList: []
      },
      escapedBugs: {
        bugsTesting: 0,
        bugsUat: 0,
        bugsProd: 0,
        totalBugs: 0,
        rate: 0,
        status: 'green',
        stdDeviation: 0,
        bugsList: []
      },
      satisfactoryTests: {
        total: 0,
        passedEnTiempo: 0,
        passedFueraDeTiempo: 0,
        failed: 0,
        blocked: 0,
        notApplicable: 0,
        notExecuted: 0,
        paused: 0,
        rate: 100,
        status: 'green'
      }
    };
  }

  private getWithFallback(urls: string[]): Observable<any> {
    const tryUrl = (index: number): Observable<any> => {
      if (index >= urls.length) {
        return of({ value: [] });
      }
      const url = urls[index];
      return this.http.get<any>(url, { headers: this.getHeaders() }).pipe(
        catchError(() => tryUrl(index + 1))
      );
    };
    return tryUrl(0);
  }

  getTestPlans(iterationPath?: string): Observable<any[]> {
    const config = this.configService.getConfig();
    if (!config || !config.azure.organization) return of([]);
    const org = encodeURIComponent(config.azure.organization);
    const proj = encodeURIComponent(config.azure.project);
    const urls = [
      `https://dev.azure.com/${org}/${proj}/_apis/testplan/plans?api-version=7.0`,
      `https://dev.azure.com/${org}/${proj}/_apis/test/plans?api-version=5.0`,
      `https://dev.azure.com/${org}/${proj}/_apis/test/plans?api-version=5.1`
    ];
    return this.getWithFallback(urls).pipe(
      map(res => {
        let plans = res?.value || [];
        if (iterationPath) {
          const normalizedPath = iterationPath.toLowerCase().replace(/\\/g, '/');
          const iterationParts = normalizedPath.split(/[\/]/).map(s => s.trim()).filter(Boolean);
          const sprintSegment = iterationParts.length > 0 ? iterationParts[iterationParts.length - 1] : '';

          plans = plans.filter((p: any) => {
            const pArea = (p.areaPath || '').toLowerCase().replace(/\\/g, '/');
            const pIter = (p.iteration || '').toLowerCase().replace(/\\/g, '/');
            const pName = (p.name || '').toLowerCase();

            if (!pArea.includes('mayansoft')) return false;

            if (pIter && normalizedPath && pIter.includes(normalizedPath)) return true;

            if (sprintSegment) {
              if ((pIter && pIter.includes(sprintSegment)) || (pName && pName.includes(sprintSegment))) return true;
            }

            return false;
          });
        }
        console.log(`ADO TestPlans: ${plans.length} plan(s) encontrados`, plans.map((p: any) => ({ id: p.id, name: p.name })));
        return plans;
      })
    );
  }

  getTestPlanDetails(planId: number): Observable<any> {
    const config = this.configService.getConfig();
    if (!config || !config.azure.organization) return of({});
    const org = encodeURIComponent(config.azure.organization);
    const proj = encodeURIComponent(config.azure.project);
    const urls = [
      `https://dev.azure.com/${org}/${proj}/_apis/testplan/Plans/${planId}?api-version=7.0`,
      `https://dev.azure.com/${org}/${proj}/_apis/test/plans/${planId}?api-version=5.0`
    ];
    return this.getWithFallback(urls).pipe(
      catchError(() => of({}))
    );
  }

  getTestSuites(planId: number): Observable<any[]> {
    const config = this.configService.getConfig();
    if (!config || !config.azure.organization) return of([]);
    const org = encodeURIComponent(config.azure.organization);
    const proj = encodeURIComponent(config.azure.project);
    const urls = [
      `https://dev.azure.com/${org}/${proj}/_apis/testplan/Plans/${planId}/suites?api-version=7.0`,
      `https://dev.azure.com/${org}/${proj}/_apis/test/Plans/${planId}/suites?api-version=5.0`,
      `https://dev.azure.com/${org}/${proj}/_apis/test/plans/${planId}/suites?api-version=5.0`
    ];
    return this.getWithFallback(urls).pipe(
      map(res => res?.value || [])
    );
  }

  getTestPoints(planId: number, suiteId: number): Observable<any[]> {
    const config = this.configService.getConfig();
    if (!config || !config.azure.organization) return of([]);
    const org = encodeURIComponent(config.azure.organization);
    const proj = encodeURIComponent(config.azure.project);
    const urls = [
      `https://dev.azure.com/${org}/${proj}/_apis/test/Plans/${planId}/Suites/${suiteId}/points?api-version=7.0`,
      `https://dev.azure.com/${org}/${proj}/_apis/test/Plans/${planId}/Suites/${suiteId}/points?api-version=5.0`,
      `https://dev.azure.com/${org}/${proj}/_apis/test/plans/${planId}/suites/${suiteId}/points?api-version=5.0`
    ];
    return this.getWithFallback(urls).pipe(
      map(res => res?.value || [])
    );
  }

  enrichMetricsWithTestExecution(metrics: CMMIMetrics, absoluteIterationPath: string): Observable<CMMIMetrics> {
    const config = this.configService.getConfig();
    if (!config || !config.azure.organization) return of(metrics);

    const start = metrics.startDate ? new Date(metrics.startDate).getTime() : 0;
    const end = metrics.endDate ? new Date(new Date(metrics.endDate).setHours(23, 59, 59, 999)).getTime() : Infinity;

    return this.getTestPlans(absoluteIterationPath).pipe(
      switchMap(plans => {
        if (plans.length === 0) {
          metrics.testExecution = this.getEmptyTestExecution();
          metrics.satisfactoryTests = this.getEmptySatisfactoryTests();
          return of(metrics);
        }

        const planSuiteObs = plans.map(plan =>
          this.getTestPlanDetails(plan.id).pipe(
            switchMap(detailedPlan =>
              this.getTestSuites(plan.id).pipe(
                map(suites => ({ plan: { ...plan, ...detailedPlan }, suites }))
              )
            )
          )
        );

        return forkJoin(planSuiteObs).pipe(
          switchMap(planSuitesList => {
            const pointObs: Observable<any>[] = [];
            planSuitesList.forEach(({ plan, suites }) => {
              suites.forEach((suite: any) => {
                pointObs.push(
                  this.getTestPoints(plan.id, suite.id).pipe(
                    map(points => ({ plan, suite, points }))
                  )
                );
              });
            });

            if (pointObs.length === 0) {
              metrics.testExecution = this.getEmptyTestExecution();
              metrics.satisfactoryTests = this.getEmptySatisfactoryTests();
              return of(metrics);
            }

            return forkJoin(pointObs).pipe(
              map(allPointsList => {
                const allPoints: any[] = [];

                allPointsList.forEach(({ plan, suite, points }) => {
                  points.forEach((pt: any) => {
                    // Use the most recent execution date from result history
                    // Priority: lastResultDetails.dateCompleted > lastRun.completedDate > lastUpdatedDate
                    const execDate = pt.lastResultDetails?.dateCompleted
                      || pt.lastResultDetails?.dateStarted
                      || pt.lastRun?.completedDate
                      || pt.lastRun?.dateCompleted
                      || '';
                    const configDate = pt.lastUpdatedDate || '';

                    // Use exec date if available, else fall back to config date
                    // CORRECCIÓN: Se eliminó el duplicado de 'const lastUpdated' previo para evitar el error TS2451
                    const lastUpdated = execDate || configDate;
                    const lastUpdatedTime = lastUpdated ? new Date(lastUpdated).getTime() : 0;

                    // onTime = execution happened within the test plan calendar window (or sprint fallback)
                    const planStartStr = plan.startDate || metrics.startDate || '';
                    const planEndStr = plan.endDate || metrics.endDate || '';

                    let onTime = false;
                    if (lastUpdatedTime > 0) {
                      let planEndUTC = Infinity;
                      if (planEndStr) {
                        const planEndObj = new Date(planEndStr);
                        const planEndYear = planEndObj.getUTCFullYear();
                        const planEndMonth = planEndObj.getUTCMonth();
                        const planEndDay = planEndObj.getUTCDate();
                        planEndUTC = Date.UTC(planEndYear, planEndMonth, planEndDay, 18, 0, 0, 0);
                      }

                      let planStartUTC = 0;
                      if (planStartStr) {
                        const planStartObj = new Date(planStartStr);
                        const planStartYear = planStartObj.getUTCFullYear();
                        const planStartMonth = planStartObj.getUTCMonth();
                        const planStartDay = planStartObj.getUTCDate();
                        planStartUTC = Date.UTC(planStartYear, planStartMonth, planStartDay, 0, 0, 0, 0);
                      }

                      onTime = lastUpdatedTime >= planStartUTC && lastUpdatedTime <= planEndUTC;
                    }

                    // Extract tester name properly
                    const testerRaw = pt.assignedTo || pt.tester;
                    let testerName = testerRaw
                      ? (typeof testerRaw === 'object'
                        ? (testerRaw.displayName || testerRaw.uniqueName || '')
                        : String(testerRaw))
                      : '';
                    if (testerName.includes('<')) {
                      testerName = testerName.split('<')[0].trim();
                    }

                    // Include ALL test points from the sprint's plan (the plan membership IS the sprint filter)
                    allPoints.push({
                      planId: plan.id,
                      planName: plan.name,
                      planStartDate: plan.startDate || '',
                      planEndDate: plan.endDate || '',
                      suiteId: suite.id,
                      suiteName: suite.name,
                      projectName: plan.project?.name || config.azure.project || '',
                      testPointId: pt.id,
                      testCaseId: pt.testCase?.id ? parseInt(pt.testCase.id) : (pt.testCaseId ? parseInt(pt.testCaseId) : 0),
                      testCaseTitle: pt.testCaseTitle || pt.testCase?.name || pt.testCase?.title || `Test Case #${pt.testCase?.id || pt.testCaseId || ''}`,
                      outcome: pt.outcome || 'None',
                      tester: testerName,
                      lastUpdatedDate: lastUpdated,
                      isExecutedInSprint: onTime,
                      onTime: onTime
                    });
                  });
                });


                // KPI: total = all points in the plan; executed = those with a terminal outcome
                const totalTestPoints = allPoints.length;

                let passed = 0;
                let passedEnTiempo = 0;
                let passedFueraDeTiempo = 0;
                let failed = 0;
                let blocked = 0;
                let notApplicable = 0;
                let notExecuted = 0;

                allPoints.forEach(pt => {
                  const outStr = pt.outcome.toLowerCase();
                  if (outStr === 'passed') {
                    passed++;
                    if (pt.isExecutedInSprint) {
                      passedEnTiempo++;
                    } else {
                      passedFueraDeTiempo++;
                    }
                  }
                  else if (outStr === 'failed') failed++;
                  else if (outStr === 'blocked') blocked++;
                  else if (outStr === 'notapplicable' || outStr === 'not applicable') notApplicable++;
                  else notExecuted++; // 'none', 'active', 'unspecified', etc.
                });

                const executed = totalTestPoints - notExecuted;
                const rate = totalTestPoints > 0 ? (passedEnTiempo / totalTestPoints) * 100 : 0;
                const status = rate >= 90 ? 'green' : (rate >= 80 ? 'yellow' : 'red');

                metrics.testExecution = {
                  totalTestPoints,
                  executed,
                  notExecuted,
                  passed,
                  passedEnTiempo,
                  passedFueraDeTiempo,
                  failed,
                  blocked,
                  notApplicable,
                  rate,
                  status: status as 'green' | 'yellow' | 'red',
                  testPoints: allPoints
                };

                const m38Denominator = totalTestPoints - notApplicable;
                const m38Rate = m38Denominator > 0 ? (passedEnTiempo / m38Denominator) * 100 : 0;
                const m38Status = m38Rate >= 90 ? 'green' : (m38Rate >= 80 ? 'yellow' : 'red');

                metrics.satisfactoryTests = {
                  total: totalTestPoints,
                  passedEnTiempo,
                  passedFueraDeTiempo,
                  failed,
                  blocked,
                  notApplicable,
                  notExecuted,
                  paused: 0,
                  rate: m38Rate,
                  status: m38Status as 'green' | 'yellow' | 'red'
                };

                console.log('ADO TestExecution resultado:', { totalTestPoints, executed, rate: rate.toFixed(2) + '%', status });

                return metrics;
              })
            );
          }),
          catchError(err => {
            console.error('Error fetching suites and points:', err);
            metrics.testExecution = this.getEmptyTestExecution();
            metrics.satisfactoryTests = this.getEmptySatisfactoryTests();
            return of(metrics);
          })
        );
      }),
      catchError(err => {
        console.error('Error in enrichMetricsWithTestExecution:', err);
        metrics.testExecution = this.getEmptyTestExecution();
        metrics.satisfactoryTests = this.getEmptySatisfactoryTests();
        return of(metrics);
      })
    );
  }

  private getEmptyTestExecution() {
    return {
      totalTestPoints: 0,
      executed: 0,
      notExecuted: 0,
      passed: 0,
      passedEnTiempo: 0,
      passedFueraDeTiempo: 0,
      failed: 0,
      blocked: 0,
      notApplicable: 0,
      rate: 100,
      status: 'green' as const,
      testPoints: []
    };
  }

  private getEmptySatisfactoryTests() {
    return {
      total: 0,
      passedEnTiempo: 0,
      passedFueraDeTiempo: 0,
      failed: 0,
      blocked: 0,
      notApplicable: 0,
      notExecuted: 0,
      paused: 0,
      rate: 100,
      status: 'green' as const
    };
  }

  private fetchEscapedBugsData(): Observable<any> {
    const config = this.configService.getConfig();
    if (!config || !config.azure.organization) {
      return of({
        bugsTesting: 0,
        bugsUat: 0,
        bugsProd: 0,
        totalBugs: 0,
        rate: 0,
        status: 'green',
        stdDeviation: 0,
        bugsList: [],
        rows: []
      });
    }
    const headers = this.getHeaders();
    const project = config.azure.project;
    const wiqlQuery = `SELECT [System.Id] FROM WorkItems WHERE [System.TeamProject] = '${project.replace(/'/g, "''")}' AND [System.WorkItemType] = 'Bug' AND [System.CreatedDate] >= @today - 180`;

    return this.http.post<any>(
      `https://dev.azure.com/${encodeURIComponent(config.azure.organization)}/${encodeURIComponent(config.azure.project)}/_apis/wit/wiql?api-version=7.0`,
      { query: wiqlQuery },
      { headers }
    ).pipe(
      timeout(15000),
      switchMap(res => {
        const ids: number[] = (res.workItems || []).map((wi: any) => wi.id);
        if (ids.length === 0) {
          return of({
            bugsTesting: 0,
            bugsUat: 0,
            bugsProd: 0,
            totalBugs: 0,
            rate: 0,
            status: 'green',
            stdDeviation: 0,
            bugsList: [],
            rows: []
          });
        }
        const fields = [
          'System.Id', 'System.WorkItemType', 'System.Title', 'System.IterationPath', 'System.AreaPath',
          'System.CreatedDate', 'Microsoft.VSTS.Common.ClosedDate', 'System.State', 'System.AssignedTo', 'System.Tags'
        ].join(',');

        // Split IDs into chunks of 200 to avoid request URI too long error
        const chunks: number[][] = [];
        for (let i = 0; i < ids.length; i += 200) {
          chunks.push(ids.slice(i, i + 200));
        }

        const chunkObs = chunks.map(chunk => this.getWorkItemDetails(chunk, fields));
        return forkJoin(chunkObs).pipe(
          map(results => {
            // Flatten results array
            const details: any[] = [];
            results.forEach(res => details.push(...res));
            return this.processEscapedBugs(details);
          })
        );
      }),
      catchError(err => {
        console.error('Error in fetchEscapedBugsData:', err);
        return of({
          bugsTesting: 0,
          bugsUat: 0,
          bugsProd: 0,
          totalBugs: 0,
          rate: 0,
          status: 'green',
          stdDeviation: 0,
          bugsList: [],
          rows: []
        });
      })
    );
  }

  private processEscapedBugs(details: any[]): any {
    const getBugClassification = (tagsStr: string | undefined): 'testing' | 'uat' | 'produccion' | 'ignore' => {
      const tags = (tagsStr || '').toLowerCase().split(';').map(t => t.trim());

      // Omit if "no inyectado" is found (e.g. noinyectado, no inyectado, no_inyectado, sin inyectar)
      const hasNoInyectado = tags.some(t =>
        t.includes('noinyectado') ||
        t.includes('no inyectado') ||
        (t.includes('no') && t.includes('inyect')) ||
        (t.includes('sin') && t.includes('inyect'))
      );
      if (hasNoInyectado) {
        return 'ignore';
      }

      // UAT with "inyectado sprint" tag (e.g. bugUAT with inyectadoSprint)
      const hasUat = tags.some(t => t.includes('uat'));
      if (hasUat) {
        return 'produccion';
      }

      // Production bugs
      const hasProd = tags.some(t =>
        t.includes('prod') ||
        t.includes('producci') ||
        t.includes('escapado')
      );
      if (hasProd) {
        return 'produccion';
      }

      return 'testing';
    };

    const getDisplayName = (val: any) => {
      if (!val) return 'Sin asignar';
      return typeof val === 'object' ? val.displayName : val;
    };

    const bugsList = details.map(b => {
      const tagsStr = b.fields['System.Tags'] || '';
      const classification = getBugClassification(tagsStr);
      if (classification === 'ignore') return null;
      return {
        project: b.fields['System.AreaPath'] || 'OPE20',
        iteration: b.fields['System.IterationPath'] || '',
        bugId: b.id.toString(),
        title: b.fields['System.Title'] || '',
        createdDate: b.fields['System.CreatedDate'],
        closedDate: b.fields['Microsoft.VSTS.Common.ClosedDate'],
        status: b.fields['System.State'],
        isw: getDisplayName(b.fields['System.AssignedTo']),
        classification
      };
    }).filter(b => b !== null) as any[];

    let bugsTesting = 0;
    let bugsUat = 0;
    let bugsProd = 0;

    bugsList.forEach(b => {
      if (b.classification === 'testing') bugsTesting++;
      else if (b.classification === 'uat' || b.classification === 'produccion') bugsProd++;
    });

    const beforeRelease = bugsTesting + bugsUat;
    const rate = beforeRelease > 0 
      ? (bugsProd / beforeRelease) * 100 
      : (bugsProd > 0 ? 100 : 0);
    const status = rate <= 33 ? 'green' : (rate <= 40 ? 'yellow' : 'red');

    const iterationGroups: { [key: string]: { testing: number, uat: number, prod: number, total: number, project: string } } = {};
    bugsList.forEach(b => {
      const iter = b.iteration;
      if (!iterationGroups[iter]) {
        iterationGroups[iter] = { testing: 0, uat: 0, prod: 0, total: 0, project: b.project };
      }
      iterationGroups[iter].total++;
      if (b.classification === 'testing') iterationGroups[iter].testing++;
      else if (b.classification === 'uat' || b.classification === 'produccion') iterationGroups[iter].prod++;
    });

    const rows = Object.entries(iterationGroups).map(([iteration, g]) => {
      const preRelease = g.testing + g.uat;
      const rowRate = preRelease > 0 ? Math.min((g.prod / preRelease) * 100, 150) : (g.prod > 0 ? 150 : 0);
      return {
        project: g.project,
        iteration: iteration.split('\\').pop() || iteration,
        fullIteration: iteration,
        testing: g.testing,
        uat: g.uat,
        produccion: g.prod,
        total: g.total,
        rate: rowRate
      };
    });

    // Calculate standard deviation of rates
    const rates = rows.map(r => r.rate);
    let stdDeviation = 0;
    if (rates.length > 1) {
      const mean = rates.reduce((sum, r) => sum + r, 0) / rates.length;
      const variance = rates.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / (rates.length - 1);
      stdDeviation = Math.sqrt(variance);
    }

    return {
      bugsTesting,
      bugsUat: 0,
      bugsProd,
      totalBugs: bugsList.length,
      rate,
      status,
      stdDeviation,
      bugsList,
      rows
    };
  }
}
