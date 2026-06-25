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
      { path: 'config', component: ConfigComponent },
      { path: 'sprint-config', loadComponent: () => import('./pages/sprint-config/sprint-config.component').then(m => m.SprintConfigComponent) }
    ]
  },
  { path: '**', redirectTo: '' }
];
