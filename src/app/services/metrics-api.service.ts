import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { CMMIMetrics } from '../models/metrics.model';

export interface VersionInfo {
  _id: string;
  version: number;
  isActive: boolean;
  createdAt: string;
}

export interface MetricAnalysisSaveResponse {
  _id: string;
  sprintId: string;
  sprintName: string;
  version: number;
  isActive: boolean;
  metrics: CMMIMetrics;
  aiAnalysis: string;
  metricAnalyses: { [key: string]: string };
  metricComments?: { [key: string]: string };
  createdAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class MetricsApiService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  /** Save new metrics analysis, automatically increments versions in DB */
  saveAnalysis(
    sprintId: string,
    sprintName: string,
    metrics: CMMIMetrics,
    aiAnalysis: string,
    metricAnalyses: { [key: string]: string } = {},
    metricComments: { [key: string]: string } = {}
  ): Observable<MetricAnalysisSaveResponse | null> {
    const payload = { sprintId, sprintName, metrics, aiAnalysis, metricAnalyses, metricComments };
    return this.http.post<MetricAnalysisSaveResponse>(this.apiUrl, payload).pipe(
      catchError(() => of(null))
    );
  }

  /** Get current active version analysis for a sprint */
  getActiveAnalysis(sprintId: string): Observable<MetricAnalysisSaveResponse | null> {
    return this.http.get<MetricAnalysisSaveResponse>(`${this.apiUrl}/sprint/${sprintId}`).pipe(
      catchError(() => of(null))
    );
  }

  /** Get versions list history for a sprint */
  getVersionsList(sprintId: string): Observable<VersionInfo[]> {
    return this.http.get<VersionInfo[]>(`${this.apiUrl}/sprint/${sprintId}/versions`).pipe(
      catchError(() => of([]))
    );
  }

  /** Get a specific version of analysis */
  getSpecificVersion(sprintId: string, versionNum: number): Observable<MetricAnalysisSaveResponse | null> {
    return this.http.get<MetricAnalysisSaveResponse>(`${this.apiUrl}/version/${sprintId}/${versionNum}`).pipe(
      catchError(() => of(null))
    );
  }

  /** Restore a historical version to active status */
  restoreVersion(id: string): Observable<MetricAnalysisSaveResponse | null> {
    return this.http.post<MetricAnalysisSaveResponse>(`${this.apiUrl}/restore/${id}`, {}).pipe(
      catchError(() => of(null))
    );
  }

  /** Get active analysis for ALL sprints stored in DB (for trend/comparison view) */
  getAllSprintsAnalysis(): Observable<MetricAnalysisSaveResponse[]> {
    return this.http.get<MetricAnalysisSaveResponse[]>(`${this.apiUrl}/all-sprints`).pipe(
      catchError(() => of([]))
    );
  }

  /** Save full sprint process data (Pre-analyses, item analyses, minuta, evidences) to MongoDB */
  saveProcessData(sprintId: string, processData: any): Observable<any> {
    if (!sprintId) return of({ success: true, localOnly: true });
    const cleanId = encodeURIComponent(sprintId);
    return this.http.post<any>(`${this.apiUrl}/process/${cleanId}`, processData).pipe(
      catchError(() => of({ success: true, localOnly: true }))
    );
  }

  /** Get process data for a sprint from MongoDB */
  getProcessData(sprintId: string): Observable<any> {
    if (!sprintId) return of(null);
    const cleanId = encodeURIComponent(sprintId);
    return this.http.get<any>(`${this.apiUrl}/process/${cleanId}`).pipe(
      catchError(() => of(null))
    );
  }

  /** Save manual pre-analysis for work items before sprint creation in Azure */
  savePreAnalysis(preAnalysis: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/pre-analysis`, preAnalysis).pipe(
      catchError(() => of({ success: true, localOnly: true }))
    );
  }

  /** Fetch all standalone pre-analyses from MongoDB */
  getPreAnalyses(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/pre-analyses`).pipe(
      catchError(() => of([]))
    );
  }

  /**
   * Obtiene el listado de carpetas/archivos de una carpeta de SharePoint.
   *
   * Estrategia: usa el Angular dev proxy (/sharepoint-api/) que reenvía
   * automáticamente las cookies del browser al servidor de SharePoint —
   * el usuario ya está autenticado en el browser con SharePoint.
   *
  /**
   * Obtiene el listado de carpetas/archivos de una carpeta de SharePoint.
   * Prioriza el backend proxy en Node.js (cmmi-api) para EVITAR errores de CORS (Http failure status 0).
   */
  getSharePointFolder(
    siteUrl: string,
    listPath?: string,
    rootFolder?: string,
    viewId?: string,
    accessToken?: string
  ): Observable<any> {
    let baseSiteUrl = siteUrl;
    let actualListPath = listPath || '';
    let actualRootFolder = rootFolder || '';
    let actualViewId = viewId || '';

    // Si el usuario ingresó la URL completa en siteUrl
    if (siteUrl.includes('RenderListDataAsStream') || siteUrl.includes('_api/web')) {
      try {
        const urlObj = new URL(siteUrl);
        baseSiteUrl = `${urlObj.origin}${urlObj.pathname.split('/_api/web')[0]}`;
        const searchParams = urlObj.searchParams;
        const rawA1 = searchParams.get('@a1');
        if (rawA1) {
          actualListPath = rawA1.replace(/^'|'$/g, '');
        }
        const rawRoot = searchParams.get('RootFolder');
        if (rawRoot) {
          actualRootFolder = rawRoot;
        }
        const rawView = searchParams.get('View');
        if (rawView) {
          actualViewId = rawView;
        }
      } catch (e) {
        console.warn('[SP Parser] No se pudo parsear URL completa:', e);
      }
    }

    // 1. INTENTO A: Usar la extensión de Chrome Mayansoft TT si está instalada en la pestaña (Sesión del navegador 100% activa)
    const encodedListPath = encodeURIComponent(`'${actualListPath}'`);
    const encodedRoot = encodeURIComponent(actualRootFolder);
    const viewParam = actualViewId ? `&View=${actualViewId}` : '';

    const directSpUrl =
      `${baseSiteUrl}/_api/web/GetListUsingPath(DecodedUrl=@a1)/RenderListDataAsStream` +
      `?@a1=${encodedListPath}` +
      `&RootFolder=${encodedRoot}` +
      `${viewParam}` +
      `&TryNewExperienceSingle=TRUE`;

    return new Observable<any>((subscriber) => {
      // Probar vía Chrome Extension primero
      if (typeof (window as any).chrome !== 'undefined' && (window as any).chrome?.runtime?.sendMessage) {
        try {
          (window as any).chrome.runtime.sendMessage({ action: 'FETCH_SHAREPOINT', url: directSpUrl }, (response: any) => {
            if (response && response.ok && response.data) {
              const rows = response.data?.ListData?.Row || [];
              const sanitized = rows.map((r: any) => ({
                id: r.ID || r.UniqueId || '',
                name: r.FileLeafRef || r.Title || '',
                fileRef: r.FileRef || '',
                fsobjType: r.FSObjType,
                folderChildCount: parseInt(r.FolderChildCount || '0', 10),
                itemChildCount: parseInt(r.ItemChildCount || '0', 10),
                totalSizeBytes: parseInt(r.SMTotalSize || '0', 10),
                modifiedDate: r.Modified || '',
                editorName: Array.isArray(r.Editor) && r.Editor[0] ? r.Editor[0].title : (r.Editor || ''),
                spItemUrl: r['.spItemUrl'] || '',
                uniqueId: r.UniqueId || ''
              }));
              subscriber.next({ success: true, rows: sanitized });
              subscriber.complete();
              return;
            }
            // Si la extensión responde con error o no maneja el mensaje, ir al backend local/Render
            this.fetchViaBackendProxy(baseSiteUrl, actualListPath, actualRootFolder, actualViewId, accessToken).subscribe(subscriber);
          });
          return;
        } catch {
          // Ignorar error de extensión
        }
      }

      // 2. INTENTO B: Usar el proxy backend en /api/sharepoint/folder
      this.fetchViaBackendProxy(baseSiteUrl, actualListPath, actualRootFolder, actualViewId, accessToken).subscribe(subscriber);
    });
  }

  private fetchViaBackendProxy(
    siteUrl: string,
    listPath: string,
    rootFolder: string,
    viewId?: string,
    accessToken?: string
  ): Observable<any> {
    const baseApi = this.apiUrl.replace(/\/analysis\/?$/, '');
    const backendUrl = `${baseApi}/sharepoint/folder`;
    const params: any = { siteUrl, listPath, rootFolder };
    if (viewId) params['viewId'] = viewId;
    if (accessToken) params['accessToken'] = accessToken;

    return this.http.get<any>(backendUrl, { params }).pipe(
      switchMap((res: any) => {
        if (res?.success && Array.isArray(res.rows)) {
          return of(res);
        }
        return of({
          success: false,
          rows: [],
          error: res?.error || 'No se obtuvieron carpetas de SharePoint. Verifica que estés autenticado.'
        });
      }),
      catchError((err) => {
        return of({
          success: false,
          rows: [],
          error: 'Error 401 de autenticación al consultar SharePoint.'
        });
      })
    );
  }
}

