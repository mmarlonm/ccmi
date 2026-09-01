import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
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
}
