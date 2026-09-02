import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { LucideAngularModule, LayoutDashboard, Settings, FileText, Moon, Sun, ChevronLeft, ChevronRight, ClipboardList, DownloadCloud, FileSpreadsheet, BarChart3, FolderOpen, TrendingUp, ChevronDown, ChevronUp, ListChecks, CalendarCog, Workflow } from 'lucide-angular';
import { UpdateService } from '../../services/update.service';
import { NotificationComponent } from '../notification/notification.component';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, LucideAngularModule, NotificationComponent],
  templateUrl: './layout.component.html',
})
export class LayoutComponent {
  readonly LayoutDashboard = LayoutDashboard;
  readonly Settings = Settings;
  readonly FileText = FileText;
  readonly Moon = Moon;
  readonly Sun = Sun;
  readonly ChevronLeft = ChevronLeft;
  readonly ChevronRight = ChevronRight;
  readonly ClipboardList = ClipboardList;
  readonly ListChecks = ListChecks;
  readonly CalendarCog = CalendarCog;
  readonly Workflow = Workflow;
  readonly DownloadCloud = DownloadCloud;
  readonly FileSpreadsheet = FileSpreadsheet;
  readonly BarChart3 = BarChart3;
  readonly FolderOpen = FolderOpen;
  readonly TrendingUp = TrendingUp;
  readonly ChevronDown = ChevronDown;
  readonly ChevronUp = ChevronUp;

  isDarkMode = false;
  isMenuCollapsed = false;
  isReportesOpen = true;

  constructor(private updateService: UpdateService) {
    this.isDarkMode = false;
    document.documentElement.classList.remove('dark');
    const savedState = localStorage.getItem('cmmi5_menu_collapsed');
    this.isMenuCollapsed = savedState === 'true';
    const savedReportes = localStorage.getItem('cmmi5_reportes_open');
    this.isReportesOpen = savedReportes !== 'false';
  }

  get hasUpdate(): boolean { return this.updateService.isUpdateAvailable; }

  toggleDarkMode() {
    this.isDarkMode = !this.isDarkMode;
    this.isDarkMode ? document.documentElement.classList.add('dark') : document.documentElement.classList.remove('dark');
  }

  toggleMenu() {
    this.isMenuCollapsed = !this.isMenuCollapsed;
    localStorage.setItem('cmmi5_menu_collapsed', String(this.isMenuCollapsed));
  }

  toggleReportes() {
    this.isReportesOpen = !this.isReportesOpen;
    localStorage.setItem('cmmi5_reportes_open', String(this.isReportesOpen));
  }
}
