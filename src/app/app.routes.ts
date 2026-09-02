import { Routes } from '@angular/router';
import { LayoutComponent } from './components/layout/layout.component';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { UpdateComponent } from './pages/update/update.component';
import { ConfigComponent } from './pages/config/config.component';

export const routes: Routes = [
  {
    path: '',
    component: LayoutComponent,
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: DashboardComponent },
      { path: 'update', component: UpdateComponent },
      { path: 'report-completion', loadComponent: () => import('./pages/report-completion/report-completion.component').then(m => m.ReportCompletionComponent) },
      { path: 'kpi-report', loadComponent: () => import('./pages/kpi-report/kpi-report.component').then(m => m.KpiReportComponent) },
      { path: 'sprint-gantt', loadComponent: () => import('./pages/sprint-gantt/sprint-gantt.component').then(m => m.SprintGanttComponent) },
      { path: 'task-compliance', loadComponent: () => import('./pages/task-compliance/task-compliance.component').then(m => m.TaskComplianceComponent) },
      { path: 'sprint-analytics', loadComponent: () => import('./pages/sprint-analytics/sprint-analytics.component').then(m => m.SprintAnalyticsComponent) },
      { path: 'proceso', loadComponent: () => import('./pages/sprint-process/sprint-process.component').then(m => m.SprintProcessComponent) },
      { path: 'config', component: ConfigComponent },
      { path: 'sprint-config', loadComponent: () => import('./pages/sprint-config/sprint-config.component').then(m => m.SprintConfigComponent) }
    ]
  },
  { path: '**', redirectTo: '' }
];
