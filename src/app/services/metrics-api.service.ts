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
  createdAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class MetricsApiService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  /** Save new metrics analysis, automatically increments versions in DB */
  saveAnalysis(sprintId: string, sprintName: string, metrics: CMMIMetrics, aiAnalysis: string): Observable<MetricAnalysisSaveResponse | null> {
    const payload = { sprintId, sprintName, metrics, aiAnalysis };
    return this.http.post<MetricAnalysisSaveResponse>(this.apiUrl, payload).pipe(
      catchError(err => {
        console.error('API Service: failed to save analysis', err);
        return of(null);
      })
    );
  }

  /** Get current active version analysis for a sprint */
  getActiveAnalysis(sprintId: string): Observable<MetricAnalysisSaveResponse | null> {
    return this.http.get<MetricAnalysisSaveResponse>(`${this.apiUrl}/sprint/${sprintId}`).pipe(
      catchError(err => {
        console.warn(`API Service: no active analysis found for sprint ${sprintId}`);
        return of(null);
      })
    );
  }

  /** Get versions list history for a sprint */
  getVersionsList(sprintId: string): Observable<VersionInfo[]> {
    return this.http.get<VersionInfo[]>(`${this.apiUrl}/sprint/${sprintId}/versions`).pipe(
      catchError(err => {
        console.error(`API Service: failed to fetch versions list for ${sprintId}`, err);
        return of([]);
      })
    );
  }

  /** Get a specific version of analysis */
  getSpecificVersion(sprintId: string, versionNum: number): Observable<MetricAnalysisSaveResponse | null> {
    return this.http.get<MetricAnalysisSaveResponse>(`${this.apiUrl}/version/${sprintId}/${versionNum}`).pipe(
      catchError(err => {
        console.error(`API Service: failed to fetch version ${versionNum} for ${sprintId}`, err);
        return of(null);
      })
    );
  }

  /** Restore a historical version to active status */
  restoreVersion(id: string): Observable<MetricAnalysisSaveResponse | null> {
    return this.http.post<MetricAnalysisSaveResponse>(`${this.apiUrl}/restore/${id}`, {}).pipe(
      catchError(err => {
        console.error(`API Service: failed to restore version id ${id}`, err);
        return of(null);
      })
    );
  }
}
