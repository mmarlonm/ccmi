import { Routes } from '@angular/router';
import { LayoutComponent } from './components/layout/layout.component';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { ConfigComponent } from './pages/config/config.component';

export const routes: Routes = [
  {
    path: '',
    component: LayoutComponent,
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: DashboardComponent },
      { path: 'report-completion', loadComponent: () => import('./pages/report-completion/report-completion.component').then(m => m.ReportCompletionComponent) },
      { path: 'config', component: ConfigComponent }
    ]
  },
  { path: '**', redirectTo: '' }
];
