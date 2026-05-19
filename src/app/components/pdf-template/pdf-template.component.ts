import { Component, Input } from '@angular/core';
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
export class PdfTemplateComponent {
  @Input() metrics?: CMMIMetrics;
  @Input() config?: AppConfig | null;
  @Input() aiAnalysis: string = '';
  @Input() metricAnalyses: { [key: string]: string } = {};
  @Input() charts: { [key: string]: string } = {};
  @Input() period: string = 'Actual';

  currentDate = new Date().toLocaleDateString();
}
