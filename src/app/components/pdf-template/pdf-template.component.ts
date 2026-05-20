import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CMMIMetrics } from '../../models/metrics.model';
import { AppConfig } from '../../models/config.model';

@Component({
  selector: 'app-pdf-template',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pdf-template.component.html',
  styleUrls: ['./pdf-template.component.css']
})
export class PdfTemplateComponent implements OnChanges {
  @Input() metrics?: CMMIMetrics;
  @Input() config?: AppConfig | null;
  @Input() aiAnalysis: string = '';
  @Input() metricAnalyses: { [key: string]: string } = {};
  @Input() charts: { [key: string]: string } = {};
  @Input() period: string = 'Actual';
  @Input() filteredEscapedBugs?: any;

  currentDate = new Date().toLocaleDateString();
  eedTimelineData: any[] = [];

  ngOnChanges(changes: SimpleChanges) {
    if (changes['metrics']) {
      this.eedTimelineData = this.getEEDTimelineData();
    }
  }

  getLocalCalendarDate(dateStr: string | undefined, isEndOfDay: boolean = false): number {
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
  }

  getEEDTimelineData(): any[] {
    if (!this.metrics?.developmentRate?.items) return [];

    const end = this.metrics.endDate ? this.getLocalCalendarDate(this.metrics.endDate, true) : 0;
    const tree: any[] = [];
    const seenBugs = new Set<number>();

    // 1. Process all User Stories and Features
    this.metrics.developmentRate.items.forEach(item => {
      const isClosed = ['Closed', 'Resolved', 'Done', 'Completed'].includes(item.status);
      let deliveryStatus: 'dentro' | 'fuera' = 'fuera';
      
      const closedDateStr = item.closedDate || item.changedDate;
      if (isClosed && closedDateStr) {
        const closedTime = this.getLocalCalendarDate(closedDateStr, false);
        if (closedTime <= end) {
          deliveryStatus = 'dentro';
        }
      }

      // Process its related bugs
      const itemBugs = (item.relatedBugs || []).map(bug => {
        seenBugs.add(bug.id);
        const bugState = bug.status || 'Active';
        const bugClosed = ['Closed', 'Resolved', 'Done', 'Completed'].includes(bugState);
        let bugDeliveryStatus: 'dentro' | 'fuera' = 'fuera';
        
        const bugClosedDateStr = bug.closedDate || bug.changedDate;
        if (bugClosed) {
          if (bugClosedDateStr) {
            const bugClosedTime = this.getLocalCalendarDate(bugClosedDateStr, false);
            if (bugClosedTime <= end) {
              bugDeliveryStatus = 'dentro';
            }
          }
        }
        
        return {
          id: bug.id,
          title: bug.title,
          status: bugState,
          deliveryStatus: bugDeliveryStatus,
          closedDate: bugClosedDateStr,
          assignedTo: bug.assignedTo
        };
      });

      tree.push({
        id: item.id,
        type: item.type,
        title: item.title,
        status: item.status,
        deliveryStatus,
        closedDate: closedDateStr,
        isw: item.isw,
        bugs: itemBugs,
        tasks: item.tasks || [],
        parentId: item.parentId || ''
      });
    });

    // 2. Process Standalone bugs (those in defectRemovalEfficiency.bugsList not linked to any requirement)
    const allEEDBugs = this.metrics.defectRemovalEfficiency.bugsList || [];
    
    // Split into Kanban standalone bugs and Sprint standalone bugs
    const kanbanBugs = allEEDBugs.filter(b => b.isKanban);
    const sprintStandaloneBugs = allEEDBugs.filter(b => !b.isKanban && (b.parentType === 'Standalone' || !seenBugs.has(parseInt(b.bugId))));

    if (kanbanBugs.length > 0) {
      tree.push({
        id: 'kanban_standalone',
        type: 'Standalone',
        title: 'Bugs de Otro Sprint (Atendidos por Kanban)',
        status: '',
        deliveryStatus: 'dentro',
        bugs: kanbanBugs.map(b => ({
          id: parseInt(b.bugId),
          title: b.title,
          status: b.status,
          deliveryStatus: b.alignment === 'on-time' ? 'dentro' : 'fuera',
          closedDate: b.closedDate,
          assignedTo: b.isw
        }))
      });
    }

    if (sprintStandaloneBugs.length > 0) {
      const hasLateOrOpen = sprintStandaloneBugs.some(b => b.alignment === 'late' || b.alignment === 'none');
      tree.push({
        id: 'sprint_standalone',
        type: 'SprintStandalone',
        title: 'Bugs del Sprint (Sin Story/FT)',
        status: '',
        deliveryStatus: hasLateOrOpen ? 'fuera' : 'dentro',
        bugs: sprintStandaloneBugs.map(b => ({
          id: parseInt(b.bugId),
          title: b.title,
          status: b.status,
          deliveryStatus: b.alignment === 'on-time' ? 'dentro' : 'fuera',
          closedDate: b.closedDate,
          assignedTo: b.isw
        }))
      });
    }

    return tree;
  }

  getChildStories(featureId: string): any[] {
    if (!this.metrics?.developmentRate?.items) return [];
    return this.metrics.developmentRate.items.filter(item => item.parentId === featureId && item.type === 'User Story');
  }

  openWorkItem(id: number | string | undefined): void {
    if (!id || id === 'standalone' || id === 'kanban_standalone' || id === 'sprint_standalone') return;
    const org = this.config?.azure?.organization;
    const proj = this.config?.azure?.project;
    if (!org || !proj) return;
    const url = `https://dev.azure.com/${org}/${proj}/_workitems/edit/${id}`;
    
    const win = window as any;
    if (win.require) {
      try {
        const { shell } = win.require('electron');
        shell.openExternal(url);
        return;
      } catch (e) {
        console.error('Failed to open external link using Electron shell:', e);
      }
    }
    window.open(url, '_blank');
  }
}
