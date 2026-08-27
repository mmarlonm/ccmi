import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of, switchMap, map, catchError, forkJoin } from 'rxjs';
import { ConfigService } from './config.service';

export interface AdoOrganization {
  id: string;
  name: string;
}

export interface AdoProject {
  id: string;
  name: string;
}

export interface AdoTeam {
  id: string;
  name: string;
}

export interface AdoSprint {
  id: string;
  name: string;
  path: string;
  startDate: string | null;
  finishDate: string | null;
}

export interface SprintHierarchyNode {
  id: number;
  type: string;
  title: string;
  state?: string;
  activity?: string;
  tags?: string;
  parentId: number | null;
  missingParent: boolean;
  childIds: number[];
  originalEstimate: number;
  completedWork: number;
  activatedDate: string | null;
  closedDate: string | null;
  assignedToName: string;
  assignedToAvatarUrl: string | null;
  areaPath: string;
  iterationPath: string;
  webUrl: string;
}

export interface AdoChildTask {
  id: number;
  title: string;
  state: string;
  activity: string;
  assignedTo: string;
  originalEstimate: number;
  remainingWork: number;
}

export interface SprintAssignmentEvent {
  workItemId: number;
  changedDate: string;
  assignedToName: string;
}

export interface SprintTaskStateUpdate {
  workItemId: number;
  revisedDate: string;
  oldState: string | null;
  newState: string | null;
  oldAssignedToName: string | null;
  newAssignedToName: string | null;
  changedByName: string | null;
}

interface WorkItemWithRelations {
  id: number;
  fields: Record<string, unknown>;
}

interface RelationEdge {
  source: number;
  target: number;
  rel: string;
}

@Injectable({
  providedIn: 'root'
})
export class SprintGanttService {
  private http = inject(HttpClient);
  private configService = inject(ConfigService);

  private getHeaders(): HttpHeaders {
    const config = this.configService.getConfig();
    const token = btoa(`:${config?.azure.pat || ''}`);
    return new HttpHeaders({
      Authorization: `Basic ${token}`,
      'Content-Type': 'application/json'
    });
  }

  hasPatConfigured(): boolean {
    const config = this.configService.getConfig();
    return Boolean(config?.azure.pat);
  }

  getDefaultOrganization(): string {
    return this.configService.getConfig()?.azure.organization || '';
  }

  getDefaultProject(): string {
    return this.configService.getConfig()?.azure.project || '';
  }

  getOrganizations(): Observable<AdoOrganization[]> {
    if (!this.hasPatConfigured()) {
      return of([]);
    }

    const profileUrl = 'https://app.vssps.visualstudio.com/_apis/profile/profiles/me?api-version=7.0';
    const accountsBaseUrl = 'https://app.vssps.visualstudio.com/_apis/accounts';

    return this.http.get<{ id?: string }>(profileUrl, { headers: this.getHeaders() }).pipe(
      switchMap(profile => {
        if (!profile.id) {
          return of([]);
        }

        const accountsUrl = `${accountsBaseUrl}?memberId=${encodeURIComponent(profile.id)}&api-version=7.0`;
        return this.http.get<{ value?: Array<{ accountId?: string; accountName?: string }> }>(accountsUrl, { headers: this.getHeaders() }).pipe(
          map(res => {
            const orgs = (res.value || [])
              .map(org => ({
                id: org.accountId || org.accountName || '',
                name: org.accountName || ''
              }))
              .filter(org => Boolean(org.name));

            const unique = new Map<string, AdoOrganization>();
            orgs.forEach(org => unique.set(org.name.toLowerCase(), org));
            return Array.from(unique.values()).sort((a, b) => a.name.localeCompare(b.name));
          })
        );
      }),
      catchError(() => {
        const fallbackOrg = this.getDefaultOrganization();
        if (!fallbackOrg) {
          return of([]);
        }
        return of([{ id: fallbackOrg, name: fallbackOrg }]);
      })
    );
  }

  getProjects(organization: string): Observable<AdoProject[]> {
    if (!organization) {
      return of([]);
    }

    const url = `https://dev.azure.com/${encodeURIComponent(organization)}/_apis/projects?api-version=7.0`;
    return this.http.get<{ value?: Array<{ id?: string; name?: string }> }>(url, { headers: this.getHeaders() }).pipe(
      map(res => (res.value || [])
        .map(project => ({ id: project.id || project.name || '', name: project.name || '' }))
        .filter(project => Boolean(project.id && project.name))
        .sort((a, b) => a.name.localeCompare(b.name))
      ),
      catchError(() => of([]))
    );
  }

  getTeams(organization: string, projectId: string): Observable<AdoTeam[]> {
    if (!organization || !projectId) {
      return of([]);
    }

    const url = `https://dev.azure.com/${encodeURIComponent(organization)}/_apis/projects/${encodeURIComponent(projectId)}/teams?api-version=7.0`;
    return this.http.get<{ value?: Array<{ id?: string; name?: string }> }>(url, { headers: this.getHeaders() }).pipe(
      map(res => (res.value || [])
        .map(team => ({ id: team.id || '', name: team.name || '' }))
        .filter(team => Boolean(team.id && team.name))
        .sort((a, b) => a.name.localeCompare(b.name))
      ),
      catchError(() => of([]))
    );
  }

  getSprints(organization: string, projectName: string, teamId: string): Observable<AdoSprint[]> {
    if (!organization || !projectName || !teamId) {
      return of([]);
    }
    const url = `https://dev.azure.com/${encodeURIComponent(organization)}/${encodeURIComponent(projectName)}/${encodeURIComponent(teamId)}/_apis/work/teamsettings/iterations?api-version=7.0`;
    return this.http.get<{ value?: Array<{ id?: string; name?: string; path?: string; attributes?: { startDate?: string; finishDate?: string } }> }>(url, { headers: this.getHeaders() }).pipe(
      map(res => (res.value || [])
        .map(sprint => ({
          id: sprint.id || '',
          name: sprint.name || '',
          path: sprint.path || '',
          startDate: sprint.attributes?.startDate || null,
          finishDate: sprint.attributes?.finishDate || null
        }))
        .filter(sprint => Boolean(sprint.id && sprint.name))
        .sort((a, b) => {
          const aStart = a.startDate ? new Date(a.startDate).getTime() : Number.MAX_SAFE_INTEGER;
          const bStart = b.startDate ? new Date(b.startDate).getTime() : Number.MAX_SAFE_INTEGER;
          return aStart - bStart;
        })
      ),
      catchError(() => of([]))
    );
  }

  getTeamMembers(organization: string, projectId: string, teamId: string): Observable<string[]> {
    if (!organization || !projectId || !teamId) {
      return of([]);
    }
    const url = `https://dev.azure.com/${encodeURIComponent(organization)}/_apis/projects/${encodeURIComponent(projectId)}/teams/${encodeURIComponent(teamId)}/members?api-version=7.0`;
    return this.http.get<{ value?: Array<{ identity?: { displayName?: string; uniqueName?: string } }> }>(url, { headers: this.getHeaders() }).pipe(
      map(res => (res.value || [])
        .map(member => member.identity?.displayName || member.identity?.uniqueName || '')
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b))
      ),
      catchError(() => of([]))
    );
  }

  getWorkItemBasic(organization: string, projectName: string, workItemId: number): Observable<SprintHierarchyNode | null> {
    if (!organization || !projectName || !workItemId) {
      return of(null);
    }
    const url = `https://dev.azure.com/${encodeURIComponent(organization)}/${encodeURIComponent(projectName)}/_apis/wit/workitems/${workItemId}?fields=System.Id,System.WorkItemType,System.Title,System.AreaPath,System.IterationPath,System.AssignedTo,System.State,System.Tags&api-version=7.0`;
    return this.http.get<any>(url, { headers: this.getHeaders() }).pipe(
      map(item => {
        const assigned = this.extractAssignedToName(item?.fields?.['System.AssignedTo']) || 'Sin asignar';
        return {
          id: Number(item?.id || 0),
          type: String(item?.fields?.['System.WorkItemType'] || ''),
          title: String(item?.fields?.['System.Title'] || ''),
          state: String(item?.fields?.['System.State'] || ''),
          tags: String(item?.fields?.['System.Tags'] || ''),
          parentId: null,
          missingParent: false,
          childIds: [],
          originalEstimate: 0,
          completedWork: 0,
          activatedDate: null,
          closedDate: null,
          assignedToName: assigned,
          assignedToAvatarUrl: null,
          areaPath: String(item?.fields?.['System.AreaPath'] || ''),
          iterationPath: String(item?.fields?.['System.IterationPath'] || ''),
          webUrl: `https://dev.azure.com/${encodeURIComponent(organization)}/${encodeURIComponent(projectName)}/_workitems/edit/${workItemId}`
        } as SprintHierarchyNode;
      }),
      catchError(() => of(null))
    );
  }

  getChildTasks(organization: string, projectName: string, workItemId: number): Observable<AdoChildTask[]> {
    if (!organization || !projectName || !workItemId) {
      return of([]);
    }

    const wiqlUrl = `https://dev.azure.com/${encodeURIComponent(organization)}/${encodeURIComponent(projectName)}/_apis/wit/wiql?api-version=7.0`;
    const escapedProject = projectName.replace(/'/g, "''");
    const query = `
      SELECT [System.Id]
      FROM WorkItems
      WHERE [System.TeamProject] = '${escapedProject}'
        AND [System.WorkItemType] = 'Task'
        AND [System.Parent] = ${workItemId}
    `;

    const fields = [
      'System.Id',
      'System.Title',
      'System.State',
      'System.AssignedTo',
      'Microsoft.VSTS.Scheduling.OriginalEstimate',
      'Microsoft.VSTS.Scheduling.RemainingWork',
      'Microsoft.VSTS.Common.Activity'
    ];

    return this.http.post<{ workItems?: Array<{ id?: number }> }>(
      wiqlUrl,
      { query },
      { headers: this.getHeaders() }
    ).pipe(
      map(res => (res.workItems || []).map(item => Number(item.id || 0)).filter(id => id > 0)),
      switchMap(ids => {
        if (ids.length === 0) {
          return of([]);
        }
        return this.getWorkItemsBatch(organization, projectName, ids, fields).pipe(
          map(items => items.map(item => ({
            id: item.id,
            title: String(item.fields['System.Title'] || ''),
            state: String(item.fields['System.State'] || ''),
            activity: String(item.fields['Microsoft.VSTS.Common.Activity'] || ''),
            assignedTo: this.extractAssignedToName(item.fields['System.AssignedTo']) || '',
            originalEstimate: this.toNumber(item.fields['Microsoft.VSTS.Scheduling.OriginalEstimate']),
            remainingWork: this.toNumber(item.fields['Microsoft.VSTS.Scheduling.RemainingWork'])
          })).sort((a, b) => a.id - b.id))
        );
      }),
      catchError(() => of([]))
    );
  }

  getSprintDateRange(organization: string, projectName: string, teamId: string, sprintId: string): Observable<{ startDate: string | null; finishDate: string | null }> {
    if (!organization || !projectName || !teamId || !sprintId) {
      return of({ startDate: null, finishDate: null });
    }

    const url = `https://dev.azure.com/${encodeURIComponent(organization)}/${encodeURIComponent(projectName)}/${encodeURIComponent(teamId)}/_apis/work/teamsettings/iterations/${encodeURIComponent(sprintId)}?api-version=7.0`;
    return this.http.get<{ attributes?: { startDate?: string; finishDate?: string } }>(url, { headers: this.getHeaders() }).pipe(
      map(res => ({
        startDate: res.attributes?.startDate || null,
        finishDate: res.attributes?.finishDate || null
      })),
      catchError(() => of({ startDate: null, finishDate: null }))
    );
  }

  getSprintAssignmentHistory(
    organization: string,
    projectName: string,
    workItemIds: number[],
    sprintStartDate: string | null,
    sprintEndDate: string | null
  ): Observable<SprintAssignmentEvent[]> {
    if (!organization || !projectName || workItemIds.length === 0 || !sprintStartDate || !sprintEndDate) {
      return of([]);
    }

    const uniqueIds = Array.from(new Set(workItemIds.filter(id => id > 0)));
    if (uniqueIds.length === 0) {
      return of([]);
    }

    const sprintStart = new Date(sprintStartDate);
    const sprintEnd = new Date(sprintEndDate);
    if (Number.isNaN(sprintStart.getTime()) || Number.isNaN(sprintEnd.getTime())) {
      return of([]);
    }
    sprintStart.setHours(0, 0, 0, 0);
    sprintEnd.setHours(23, 59, 59, 999);

    const requests = uniqueIds.map(workItemId => {
      const url = `https://dev.azure.com/${encodeURIComponent(organization)}/${encodeURIComponent(projectName)}/_apis/wit/workItems/${workItemId}/updates?api-version=7.0`;
      return this.http.get<{ value?: Array<{ revisedDate?: string; fields?: Record<string, { oldValue?: unknown; newValue?: unknown }> }> }>(
        url,
        { headers: this.getHeaders() }
      ).pipe(
        map(res => {
          const events: SprintAssignmentEvent[] = [];
          (res.value || []).forEach(update => {
            const revisedDateRaw = update.revisedDate || '';
            const revisedDate = new Date(revisedDateRaw);
            if (Number.isNaN(revisedDate.getTime())) {
              return;
            }
            if (revisedDate < sprintStart || revisedDate > sprintEnd) {
              return;
            }
            const assignedToUpdate = update.fields?.['System.AssignedTo'];
            const assignedToName = this.extractAssignedToName(assignedToUpdate?.newValue);
            if (!assignedToName) {
              return;
            }
            events.push({
              workItemId,
              changedDate: revisedDate.toISOString(),
              assignedToName
            });
          });
          return events;
        }),
        catchError(() => of([]))
      );
    });

    return forkJoin(requests).pipe(
      map(items => items.flat())
    );
  }

  getWorkItemStateUpdates(
    organization: string,
    projectName: string,
    workItemIds: number[]
  ): Observable<Record<number, SprintTaskStateUpdate[]>> {
    if (!organization || !projectName || workItemIds.length === 0) {
      return of({});
    }

    const uniqueIds = Array.from(new Set(workItemIds.filter(id => id > 0)));
    if (uniqueIds.length === 0) {
      return of({});
    }

    const requests = uniqueIds.map(workItemId => {
      const url = `https://dev.azure.com/${encodeURIComponent(organization)}/${encodeURIComponent(projectName)}/_apis/wit/workItems/${workItemId}/updates?api-version=7.0`;
      return this.http.get<{ value?: Array<{ revisedDate?: string; revisedBy?: unknown; fields?: Record<string, { oldValue?: unknown; newValue?: unknown }> }> }>(
        url,
        { headers: this.getHeaders() }
      ).pipe(
        map(res => {
          const updates: SprintTaskStateUpdate[] = [];
          (res.value || []).forEach(update => {
            const revisedDateRaw = update.revisedDate || '';
            const revisedDate = new Date(revisedDateRaw);
            if (Number.isNaN(revisedDate.getTime())) {
              return;
            }
            const stateUpdate = update.fields?.['System.State'];
            const assignedToUpdate = update.fields?.['System.AssignedTo'];
            const oldState = typeof stateUpdate?.oldValue === 'string' ? stateUpdate.oldValue : null;
            const newState = typeof stateUpdate?.newValue === 'string' ? stateUpdate.newValue : null;
            const oldAssignedToName = this.extractAssignedToName(assignedToUpdate?.oldValue) || null;
            const newAssignedToName = this.extractAssignedToName(assignedToUpdate?.newValue) || null;
            const changedByName = this.extractAssignedToName(update.revisedBy) || null;

            if (!oldState && !newState && !oldAssignedToName && !newAssignedToName && !changedByName) {
              return;
            }
            updates.push({
              workItemId,
              revisedDate: revisedDate.toISOString(),
              oldState,
              newState,
              oldAssignedToName,
              newAssignedToName,
              changedByName
            });
          });
          updates.sort((a, b) => new Date(a.revisedDate).getTime() - new Date(b.revisedDate).getTime());
          return { workItemId, updates };
        }),
        catchError(() => of({ workItemId, updates: [] as SprintTaskStateUpdate[] }))
      );
    });

    return forkJoin(requests).pipe(
      map(results => {
        const byWorkItemId: Record<number, SprintTaskStateUpdate[]> = {};
        results.forEach(result => {
          byWorkItemId[result.workItemId] = result.updates;
        });
        return byWorkItemId;
      })
    );
  }

  getSprintHierarchyNodes(organization: string, projectName: string, teamId: string, sprintId: string, sprintPath: string): Observable<SprintHierarchyNode[]> {
    if (!organization || !projectName || !teamId || !sprintId) {
      return of([]);
    }

    const sprintItemsUrl = `https://dev.azure.com/${encodeURIComponent(organization)}/${encodeURIComponent(projectName)}/${encodeURIComponent(teamId)}/_apis/work/teamsettings/iterations/${encodeURIComponent(sprintId)}/workitems?api-version=7.0`;
    return forkJoin({
      relationsRes: this.http.get<{ workItemRelations?: Array<{ rel?: string; source?: { id?: number; url?: string }; target?: { id?: number; url?: string } }> }>(
        sprintItemsUrl,
        { headers: this.getHeaders() }
      ).pipe(
        catchError(() => of({ workItemRelations: [] }))
      ),
      resolvedSprintPath: this.resolveSprintPath(organization, projectName, teamId, sprintId, sprintPath)
    }).pipe(
      switchMap(({ relationsRes, resolvedSprintPath }) => this.getSprintWorkItemIdsByWiql(organization, projectName, resolvedSprintPath).pipe(
        map(wiqlIds => ({ res: relationsRes, wiqlIds }))
      )),
      switchMap(({ res, wiqlIds }) => {
        const relations = res.workItemRelations || [];
        const idSet = new Set<number>();

        relations.forEach(rel => {
          if (rel.source?.id) {
            idSet.add(rel.source.id);
          }
          if (rel.target?.id) {
            idSet.add(rel.target.id);
          }
          const sourceFromUrl = this.extractIdFromUrl(rel.source?.url || '');
          const targetFromUrl = this.extractIdFromUrl(rel.target?.url || '');
          if (sourceFromUrl) {
            idSet.add(sourceFromUrl);
          }
          if (targetFromUrl) {
            idSet.add(targetFromUrl);
          }
        });
        wiqlIds.forEach(id => idSet.add(id));

        const ids = Array.from(idSet.values()).sort((a, b) => a - b);
        if (ids.length === 0) {
          return of([]);
        }

        const fields = [
          'System.Id',
          'System.WorkItemType',
          'System.Title',
          'System.State',
          'Microsoft.VSTS.Common.Activity',
          'System.Tags',
          'System.Parent',
          'System.AssignedTo',
          'System.AreaPath',
          'System.IterationPath',
          'Microsoft.VSTS.Scheduling.OriginalEstimate',
          'Microsoft.VSTS.Scheduling.CompletedWork',
          'Microsoft.VSTS.Common.ActivatedDate',
          'Microsoft.VSTS.Common.ClosedDate'
        ];
        return this.getWorkItemsWithAncestorsAndRelated(organization, projectName, ids, fields).pipe(
          switchMap(items => this.getWorkItemRelationEdges(organization, projectName, items.map(item => item.id)).pipe(
            map(extraEdges => this.buildHierarchy(items, relations, extraEdges, organization, projectName))
          ))
        );
      }),
      catchError(() => of([]))
    );
  }

  private getSprintWorkItemIdsByWiql(
    organization: string,
    projectName: string,
    sprintPath: string
  ): Observable<number[]> {
    if (!sprintPath) {
      return of([]);
    }
    const wiqlUrl = `https://dev.azure.com/${encodeURIComponent(organization)}/${encodeURIComponent(projectName)}/_apis/wit/wiql?api-version=7.0`;
    const projectEscaped = projectName.replace(/'/g, "''");
    const pathCandidates = this.buildIterationPathCandidates(sprintPath, projectName);
    if (pathCandidates.length === 0) {
      return of([]);
    }

    const whereByPath = pathCandidates.map(path => {
      const escapedPath = path.replace(/'/g, "''");
      return `([System.IterationPath] = '${escapedPath}' OR [System.IterationPath] UNDER '${escapedPath}')`;
    }).join(' OR ');

    const queryWithProject = `
      SELECT [System.Id]
      FROM WorkItems
      WHERE [System.TeamProject] = '${projectEscaped}'
        AND (${whereByPath})
    `;
    const queryWithoutProject = `
      SELECT [System.Id]
      FROM WorkItems
      WHERE (${whereByPath})
    `;

    const extractIds = (res: { workItems?: Array<{ id?: number }> }): number[] => {
      return (res.workItems || [])
        .map(item => item.id || 0)
        .filter(id => id > 0);
    };

    return this.http.post<{ workItems?: Array<{ id?: number }> }>(
      wiqlUrl,
      { query: queryWithProject },
      { headers: this.getHeaders() }
    ).pipe(
      map(extractIds),
      switchMap(ids => {
        if (ids.length > 0) {
          return of(ids);
        }
        return this.http.post<{ workItems?: Array<{ id?: number }> }>(
          wiqlUrl,
          { query: queryWithoutProject },
          { headers: this.getHeaders() }
        ).pipe(
          map(extractIds)
        );
      }),
      catchError(() => of([]))
    );
  }

  private buildIterationPathCandidates(sprintPath: string, projectName: string): string[] {
    const project = projectName.trim();
    const raw = sprintPath.trim().replace(/\//g, '\\');
    if (!raw) {
      return [];
    }

    const cleaned = raw.replace(/^\\+/, '').replace(/\\+/g, '\\');
    const candidates = new Set<string>();
    candidates.add(cleaned);

    if (project) {
      const projectPrefix = `${project}\\`;
      if (!cleaned.toLowerCase().startsWith(projectPrefix.toLowerCase())) {
        candidates.add(`${projectPrefix}${cleaned}`);
      }
    }

    const firstSlash = cleaned.indexOf('\\');
    if (firstSlash > 0 && firstSlash < cleaned.length - 1) {
      const withoutFirstSegment = cleaned.slice(firstSlash + 1);
      candidates.add(withoutFirstSegment);
      if (project && !withoutFirstSegment.toLowerCase().startsWith(`${project.toLowerCase()}\\`)) {
        candidates.add(`${project}\\${withoutFirstSegment}`);
      }
    }

    return Array.from(candidates.values()).filter(path => path.length > 0);
  }

  private resolveSprintPath(
    organization: string,
    projectName: string,
    teamId: string,
    sprintId: string,
    fallbackPath: string
  ): Observable<string> {
    const cleanedFallback = (fallbackPath || '').trim();
    if (cleanedFallback) {
      return of(cleanedFallback);
    }

    const teamSprintUrl = `https://dev.azure.com/${encodeURIComponent(organization)}/${encodeURIComponent(projectName)}/${encodeURIComponent(teamId)}/_apis/work/teamsettings/iterations/${encodeURIComponent(sprintId)}?api-version=7.0`;
    return this.http.get<{ path?: string; name?: string }>(teamSprintUrl, { headers: this.getHeaders() }).pipe(
      switchMap(teamSprint => {
        const fromTeam = (teamSprint.path || '').trim();
        if (fromTeam) {
          return of(fromTeam);
        }
        return this.resolveSprintPathFromClassification(organization, projectName, sprintId).pipe(
          map(path => path || (teamSprint.name || ''))
        );
      }),
      catchError(() => this.resolveSprintPathFromClassification(organization, projectName, sprintId).pipe(
        map(path => path || '')
      ))
    );
  }

  private resolveSprintPathFromClassification(
    organization: string,
    projectName: string,
    sprintId: string
  ): Observable<string> {
    const url = `https://dev.azure.com/${encodeURIComponent(organization)}/${encodeURIComponent(projectName)}/_apis/wit/classificationnodes/Iterations?$depth=10&api-version=7.0`;
    return this.http.get<any>(url, { headers: this.getHeaders() }).pipe(
      map(root => {
        const queue: any[] = [root];
        while (queue.length > 0) {
          const current = queue.shift();
          if (!current) {
            continue;
          }
          if ((current.identifier || '') === sprintId) {
            return String(current.path || '').trim();
          }
          const children: any[] = Array.isArray(current.children) ? current.children : [];
          children.forEach((child: any) => queue.push(child));
        }
        return '';
      }),
      catchError(() => of(''))
    );
  }

  private getWorkItemsWithAncestorsAndRelated(
    organization: string,
    projectName: string,
    initialIds: number[],
    fields: string[],
    maxDepth: number = 5
  ): Observable<WorkItemWithRelations[]> {
    const visited = new Set<number>();
    const collected = new Map<number, WorkItemWithRelations>();

    const loadLevel = (ids: number[], depth: number): Observable<WorkItemWithRelations[]> => {
      const pendingIds = ids.filter(id => !visited.has(id));
      pendingIds.forEach(id => visited.add(id));
      if (pendingIds.length === 0) {
        return of(Array.from(collected.values()));
      }

      return this.getWorkItemsBatch(organization, projectName, pendingIds, fields).pipe(
        switchMap(items => {
          items.forEach(item => collected.set(item.id, item));
          if (depth >= maxDepth) {
            return of(Array.from(collected.values()));
          }

          const nextIds = new Set<number>();
          items.forEach(item => {
            const parentId = this.toNumber(item.fields['System.Parent']);
            if (parentId > 0 && !visited.has(parentId)) {
              nextIds.add(parentId);
            }
          });

          if (nextIds.size === 0) {
            return of(Array.from(collected.values()));
          }
          return loadLevel(Array.from(nextIds.values()), depth + 1);
        })
      );
    };

    return loadLevel(initialIds, 0);
  }

  private getWorkItemRelationEdges(
    organization: string,
    projectName: string,
    ids: number[]
  ): Observable<RelationEdge[]> {
    if (ids.length === 0) {
      return of([]);
    }

    const chunks: number[][] = [];
    const chunkSize = 200;
    for (let i = 0; i < ids.length; i += chunkSize) {
      chunks.push(ids.slice(i, i + chunkSize));
    }

    const requests = chunks.map(chunk => {
      const url = `https://dev.azure.com/${encodeURIComponent(organization)}/${encodeURIComponent(projectName)}/_apis/wit/workitemsbatch?api-version=7.0`;
      return this.http.post<{ value?: Array<{ id?: number; relations?: Array<{ rel?: string; url?: string }> }> }>(
        url,
        { ids: chunk, errorPolicy: 'omit', $expand: 'relations' },
        { headers: this.getHeaders() }
      ).pipe(
        map(res => {
          const edges: RelationEdge[] = [];
          (res.value || []).forEach(item => {
            const sourceId = item.id || 0;
            if (!sourceId) {
              return;
            }
            (item.relations || []).forEach(rel => {
              const relType = rel.rel || '';
              const targetId = this.extractIdFromUrl(rel.url || '');
              if (!targetId || !relType) {
                return;
              }
              if (!relType.includes('Related') && !relType.includes('Hierarchy')) {
                return;
              }
              edges.push({ source: sourceId, target: targetId, rel: relType });
            });
          });
          return edges;
        }),
        catchError(() => of([]))
      );
    });

    return forkJoin(requests).pipe(
      map(all => all.flat())
    );
  }

  private getWorkItemsBatch(
    organization: string,
    projectName: string,
    ids: number[],
    fields: string[]
  ): Observable<WorkItemWithRelations[]> {
    const url = `https://dev.azure.com/${encodeURIComponent(organization)}/${encodeURIComponent(projectName)}/_apis/wit/workitemsbatch?api-version=7.0`;
    return this.http.post<{ value?: WorkItemWithRelations[] }>(
      url,
      { ids, fields, errorPolicy: 'omit' },
      { headers: this.getHeaders() }
    ).pipe(
      map(res => res.value || []),
      catchError(() => of([]))
    );
  }

  private buildHierarchy(
    items: WorkItemWithRelations[],
    relations: Array<{ rel?: string; source?: { id?: number }; target?: { id?: number } }>,
    extraEdges: RelationEdge[],
    organization: string,
    projectName: string
  ): SprintHierarchyNode[] {
    const nodeMap = new Map<number, SprintHierarchyNode>();

    items.forEach(item => {
      const assignedTo = item.fields['System.AssignedTo'] as
        | { displayName?: string; imageUrl?: string; _links?: { avatar?: { href?: string } } }
        | string
        | undefined;

      const assignedToName = typeof assignedTo === 'string'
        ? assignedTo
        : (assignedTo?.displayName || 'Sin asignar');

      const assignedToAvatarUrl = typeof assignedTo === 'object'
        ? (assignedTo?.imageUrl || assignedTo?._links?.avatar?.href || null)
        : null;

      nodeMap.set(item.id, {
        id: item.id,
        type: String(item.fields['System.WorkItemType'] || 'Unknown'),
        title: String(item.fields['System.Title'] || ''),
        state: String(item.fields['System.State'] || ''),
        activity: String(item.fields['Microsoft.VSTS.Common.Activity'] || ''),
        tags: String(item.fields['System.Tags'] || ''),
        parentId: null,
        missingParent: false,
        childIds: [],
        originalEstimate: this.toNumber(item.fields['Microsoft.VSTS.Scheduling.OriginalEstimate']),
        completedWork: this.toNumber(item.fields['Microsoft.VSTS.Scheduling.CompletedWork']),
        activatedDate: this.toNullableIso(item.fields['Microsoft.VSTS.Common.ActivatedDate']),
        closedDate: this.toNullableIso(item.fields['Microsoft.VSTS.Common.ClosedDate']),
        assignedToName,
        assignedToAvatarUrl,
        areaPath: String(item.fields['System.AreaPath'] || ''),
        iterationPath: String(item.fields['System.IterationPath'] || ''),
        webUrl: `https://dev.azure.com/${encodeURIComponent(organization)}/${encodeURIComponent(projectName)}/_workitems/edit/${item.id}`
      });
    });

    const relationEdges: RelationEdge[] = [];
    relations.forEach(rel => {
      const source = rel.source?.id;
      const target = rel.target?.id;
      if (!source || !target || !rel.rel) {
        return;
      }
      relationEdges.push({ source, target, rel: rel.rel });
    });
    relationEdges.push(...extraEdges);

    const parentByChild = new Map<number, number>();
    const relatedPairs: Array<{ source: number; target: number }> = [];
    relationEdges.forEach(edge => {
      if (edge.rel.includes('Hierarchy-Forward')) {
        const source = edge.source;
        const target = edge.target;
        if (!parentByChild.has(target)) {
          parentByChild.set(target, source);
        }
      } else if (edge.rel.includes('Hierarchy-Reverse')) {
        const source = edge.source;
        const target = edge.target;
        if (!parentByChild.has(source)) {
          parentByChild.set(source, target);
        }
      } else if (edge.rel.includes('Related')) {
        relatedPairs.push({ source: edge.source, target: edge.target });
      }
    });

    nodeMap.forEach(node => {
      const parentFromRelation = parentByChild.get(node.id);
      const parentFromField = this.toNumber(items.find(i => i.id === node.id)?.fields['System.Parent']);
      const resolvedParent = parentFromRelation || parentFromField || null;

      if (resolvedParent && nodeMap.has(resolvedParent)) {
        node.parentId = resolvedParent;
      } else if (resolvedParent && !nodeMap.has(resolvedParent)) {
        node.parentId = null;
        node.missingParent = true;
      }
    });

    const walkUpToItemParent = (startId: number): number | null => {
      const visited = new Set<number>();
      let currentId: number | null = startId;
      while (currentId) {
        if (visited.has(currentId)) {
          break;
        }
        visited.add(currentId);
        const currentNode = nodeMap.get(currentId);
        if (!currentNode) {
          return null;
        }
        if (this.isFeatureOrUserStoryType(currentNode.type)) {
          return currentNode.id;
        }
        currentId = currentNode.parentId;
      }
      return null;
    };

    relatedPairs.forEach(pair => {
      const sourceNode = nodeMap.get(pair.source);
      const targetNode = nodeMap.get(pair.target);
      if (!sourceNode || !targetNode) {
        return;
      }

      if (this.isBugType(sourceNode.type) && !this.isTaskType(targetNode.type) && !this.isBugType(targetNode.type)) {
        sourceNode.parentId = targetNode.id;
        sourceNode.missingParent = false;
      } else if (this.isBugType(targetNode.type) && !this.isTaskType(sourceNode.type) && !this.isBugType(sourceNode.type)) {
        targetNode.parentId = sourceNode.id;
        targetNode.missingParent = false;
      }
    });

    nodeMap.forEach(node => {
      if (this.isBugType(node.type) && node.parentId) {
        const itemParentId = walkUpToItemParent(node.parentId);
        if (itemParentId) {
          node.parentId = itemParentId;
          node.missingParent = false;
        }
      }
    });

    const resolveVisibleParent = (startId: number | null): number | null => {
      const visited = new Set<number>();
      let currentId = startId;
      while (currentId) {
        if (visited.has(currentId)) {
          break;
        }
        visited.add(currentId);
        const currentNode = nodeMap.get(currentId);
        if (!currentNode) {
          return null;
        }
        if (!this.isDiscardedTopType(currentNode.type)) {
          return currentNode.id;
        }
        currentId = currentNode.parentId;
      }
      return null;
    };

    nodeMap.forEach(node => {
      node.parentId = resolveVisibleParent(node.parentId);
    });

    nodeMap.forEach(node => {
      node.childIds = [];
    });

    nodeMap.forEach(node => {
      if (node.parentId && nodeMap.has(node.parentId)) {
        nodeMap.get(node.parentId)?.childIds.push(node.id);
      }
    });

    const nodes = Array.from(nodeMap.values());
    nodes.forEach(node => {
      node.childIds.sort((a, b) => a - b);
    });

    return nodes
      .filter(node => !this.isDiscardedTopType(node.type))
      .sort((a, b) => a.id - b.id);
  }

  private extractIdFromUrl(url: string): number | null {
    if (!url) {
      return null;
    }
    const match = url.match(/workItems\/(\d+)/i);
    if (!match) {
      return null;
    }
    return Number(match[1]);
  }

  private toNumber(value: unknown): number {
    if (typeof value === 'number') {
      return Number.isFinite(value) ? value : 0;
    }
    if (typeof value === 'string') {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : 0;
    }
    return 0;
  }

  private toNullableIso(value: unknown): string | null {
    if (typeof value !== 'string' || !value.trim()) {
      return null;
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return null;
    }
    return date.toISOString();
  }

  private extractAssignedToName(value: unknown): string {
    if (typeof value === 'string') {
      return value.trim();
    }
    if (value && typeof value === 'object') {
      const candidate = value as { displayName?: unknown; uniqueName?: unknown; name?: unknown };
      if (typeof candidate.displayName === 'string' && candidate.displayName.trim()) {
        return candidate.displayName.trim();
      }
      if (typeof candidate.uniqueName === 'string' && candidate.uniqueName.trim()) {
        return candidate.uniqueName.trim();
      }
      if (typeof candidate.name === 'string' && candidate.name.trim()) {
        return candidate.name.trim();
      }
    }
    return '';
  }

  private isTaskType(type: string): boolean {
    return type.trim().toLowerCase() === 'task';
  }

  private isBugType(type: string): boolean {
    return type.trim().toLowerCase() === 'bug';
  }

  private isFeatureOrUserStoryType(type: string): boolean {
    const normalized = type.trim().toLowerCase();
    return normalized === 'feature' || normalized === 'user story';
  }

  private isDiscardedTopType(type: string): boolean {
    const normalized = type.trim().toLowerCase();
    return normalized === 'epic' || normalized === 'issue';
  }
}
