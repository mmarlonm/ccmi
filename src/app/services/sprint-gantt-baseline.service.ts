import { Injectable } from '@angular/core';
import * as XLSX from 'xlsx';
import { SprintBaselineParseResult, SprintBaselineRow } from '../models/sprint-gantt-baseline.model';

type ExcelCell = string | number | boolean | Date | null | undefined;

@Injectable({
  providedIn: 'root'
})
export class SprintGanttBaselineService {
  private readonly spanishMonthMap: Record<string, number> = {
    ene: 1, enero: 1,
    feb: 2, febrero: 2,
    mar: 3, marzo: 3,
    abr: 4, abril: 4,
    may: 5, mayo: 5,
    jun: 6, junio: 6,
    jul: 7, julio: 7,
    ago: 8, agosto: 8,
    sep: 9, sept: 9, septiembre: 9,
    oct: 10, octubre: 10,
    nov: 11, noviembre: 11,
    dic: 12, diciembre: 12
  };

  parseTimelineWorkbook(content: ArrayBuffer): SprintBaselineParseResult {
    const workbook = XLSX.read(content, { type: 'array', cellDates: true });
    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) {
      return { rows: [], warnings: ['El archivo no contiene hojas.'], timelineDays: [] };
    }

    const sheet = workbook.Sheets[firstSheetName];
    const matrix = XLSX.utils.sheet_to_json<ExcelCell[]>(sheet, { header: 1, defval: '' });
    if (matrix.length === 0) {
      return { rows: [], warnings: ['La hoja está vacía.'], timelineDays: [] };
    }

    const timelineRange = this.detectTimelineColumnRange(matrix);
    if (!timelineRange) {
      return { rows: [], warnings: ['No se detectó el timeline (columnas por día).'], timelineDays: [] };
    }

    const fallbackYear = this.detectReferenceYear(matrix);
    const timelineHeader = this.detectTimelineHeaderRow(matrix, timelineRange.startCol, timelineRange.endCol, fallbackYear);
    const timelineByCol = new Map<number, string>();
    for (let col = timelineRange.startCol; col <= timelineRange.endCol; col++) {
      const dayKey = this.parseDayKey(matrix[timelineHeader]?.[col], fallbackYear);
      if (dayKey) {
        timelineByCol.set(col, dayKey);
      }
    }
    if (timelineByCol.size === 0) {
      return { rows: [], warnings: ['No se pudieron resolver fechas del timeline.'], timelineDays: [] };
    }

    const idColumn = this.detectIdColumn(matrix, timelineHeader + 1);
    const titleColumn = idColumn + 1;
    const warnings: string[] = [];
    const rows: SprintBaselineRow[] = [];

    for (let rowIndex = timelineHeader + 1; rowIndex < matrix.length; rowIndex++) {
      const row = matrix[rowIndex] || [];
      const workItemId = this.toPositiveInt(row[idColumn]);
      if (!workItemId) {
        continue;
      }

      const marks: Array<{ dayKey: string; value: string }> = [];
      timelineByCol.forEach((dayKey, col) => {
        const raw = row[col];
        const value = this.asCellText(raw);
        if (value) {
          marks.push({ dayKey, value });
        }
      });

      if (marks.length === 0) {
        warnings.push(`Fila ${rowIndex + 1}: item ${workItemId} sin marcas en timeline.`);
        continue;
      }

      const plannedDayKeys = marks.map(mark => mark.dayKey).sort();
      const title = this.asCellText(row[titleColumn]);
      rows.push({
        workItemId,
        title,
        plannedStartKey: plannedDayKeys[0],
        plannedEndKey: plannedDayKeys[plannedDayKeys.length - 1],
        plannedDayKeys,
        personMarks: marks.map(mark => mark.value)
      });
    }

    const timelineDays = Array.from(new Set(Array.from(timelineByCol.values()))).sort();
    return { rows, warnings, timelineDays };
  }

  normalizePersonName(value: string): string {
    return value.trim().replace(/\s+/g, ' ').toLowerCase();
  }

  private detectTimelineColumnRange(matrix: ExcelCell[][]): { startCol: number; endCol: number } | null {
    let best: { startCol: number; endCol: number; score: number } | null = null;
    const maxRows = Math.min(matrix.length, 15);

    for (let rowIndex = 0; rowIndex < maxRows; rowIndex++) {
      const row = matrix[rowIndex] || [];
      let start = -1;
      let run = 0;
      let bestRunStart = -1;
      let bestRunEnd = -1;
      let prev = -1;

      for (let col = 0; col < row.length; col++) {
        const num = this.toPositiveInt(row[col]);
        if (num > 0 && num <= 31 && (run === 0 || num === prev + 1)) {
          if (run === 0) {
            start = col;
          }
          run++;
          prev = num;
          if (run > 4) {
            bestRunStart = start;
            bestRunEnd = col;
          }
        } else {
          run = 0;
          prev = -1;
        }
      }

      if (bestRunStart >= 0 && bestRunEnd >= bestRunStart) {
        const score = bestRunEnd - bestRunStart + 1;
        if (!best || score > best.score) {
          best = { startCol: bestRunStart, endCol: bestRunEnd, score };
        }
      }
    }

    if (!best) {
      return null;
    }
    return { startCol: best.startCol, endCol: best.endCol };
  }

  private detectTimelineHeaderRow(matrix: ExcelCell[][], startCol: number, endCol: number, fallbackYear: number): number {
    let bestRow = 0;
    let bestCount = -1;
    const maxRows = Math.min(matrix.length, 15);
    for (let rowIndex = 0; rowIndex < maxRows; rowIndex++) {
      const row = matrix[rowIndex] || [];
      let parsed = 0;
      for (let col = startCol; col <= endCol; col++) {
        if (this.parseDayKey(row[col], fallbackYear)) {
          parsed++;
        }
      }
      if (parsed > bestCount) {
        bestCount = parsed;
        bestRow = rowIndex;
      }
    }
    return bestRow;
  }

  private detectIdColumn(matrix: ExcelCell[][], startRow: number): number {
    let bestCol = 0;
    let bestHits = -1;
    const maxRows = Math.min(matrix.length, startRow + 120);
    const maxCols = 12;
    for (let col = 0; col < maxCols; col++) {
      let hits = 0;
      for (let row = startRow; row < maxRows; row++) {
        const id = this.toPositiveInt(matrix[row]?.[col]);
        if (id) {
          hits++;
        }
      }
      if (hits > bestHits) {
        bestHits = hits;
        bestCol = col;
      }
    }
    return bestCol;
  }

  private parseDayKey(value: ExcelCell, fallbackYear: number): string | null {
    if (value instanceof Date) {
      if (Number.isNaN(value.getTime())) {
        return null;
      }
      return value.toISOString().slice(0, 10);
    }

    if (typeof value === 'number') {
      if (!Number.isFinite(value) || value < 1000) {
        return null;
      }
      const excelDate = XLSX.SSF.parse_date_code(value);
      if (!excelDate) {
        return null;
      }
      return `${excelDate.y.toString().padStart(4, '0')}-${excelDate.m.toString().padStart(2, '0')}-${excelDate.d.toString().padStart(2, '0')}`;
    }

    const text = this.asCellText(value);
    if (!text) {
      return null;
    }

    const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (iso) {
      return `${iso[1]}-${iso[2]}-${iso[3]}`;
    }

    const slash = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (slash) {
      const day = Number(slash[1]);
      const month = Number(slash[2]);
      const year = Number(slash[3]);
      return `${year.toString().padStart(4, '0')}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    }

    const dash = text.match(/^(\d{1,2})-([a-záéíóúñ]+)$/i);
    if (dash) {
      const day = Number(dash[1]);
      const monthKey = this.removeDiacritics(dash[2].toLowerCase());
      const month = this.spanishMonthMap[monthKey];
      if (!month) {
        return null;
      }
      return `${fallbackYear.toString().padStart(4, '0')}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    }

    const longEs = text.match(/^(\d{1,2})\s+de\s+([a-záéíóúñ]+)\s+de\s+(\d{4})$/i);
    if (longEs) {
      const day = Number(longEs[1]);
      const monthKey = this.removeDiacritics(longEs[2].toLowerCase());
      const month = this.spanishMonthMap[monthKey];
      const year = Number(longEs[3]);
      if (!month) {
        return null;
      }
      return `${year.toString().padStart(4, '0')}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    }

    return null;
  }

  private removeDiacritics(value: string): string {
    return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }

  private detectReferenceYear(matrix: ExcelCell[][]): number {
    const yearHits = new Map<number, number>();
    const maxRows = Math.min(matrix.length, 20);
    for (let rowIndex = 0; rowIndex < maxRows; rowIndex++) {
      const row = matrix[rowIndex] || [];
      for (let col = 0; col < Math.min(row.length, 40); col++) {
        const value = row[col];
        if (value instanceof Date && !Number.isNaN(value.getTime())) {
          const year = value.getUTCFullYear();
          yearHits.set(year, (yearHits.get(year) || 0) + 1);
          continue;
        }
        const text = this.asCellText(value);
        if (!text) {
          continue;
        }
        const match = text.match(/(?:^|[^\d])(20\d{2})(?:[^\d]|$)/);
        if (match) {
          const year = Number(match[1]);
          yearHits.set(year, (yearHits.get(year) || 0) + 1);
        }
      }
    }
    if (yearHits.size === 0) {
      return new Date().getUTCFullYear();
    }
    let bestYear = new Date().getUTCFullYear();
    let bestHits = -1;
    yearHits.forEach((hits, year) => {
      if (hits > bestHits) {
        bestHits = hits;
        bestYear = year;
      }
    });
    return bestYear;
  }

  private asCellText(value: ExcelCell): string {
    if (value === null || value === undefined) {
      return '';
    }
    if (typeof value === 'string') {
      return value.trim();
    }
    if (typeof value === 'number') {
      if (!Number.isFinite(value)) {
        return '';
      }
      return String(value).trim();
    }
    if (typeof value === 'boolean') {
      return value ? 'true' : '';
    }
    if (value instanceof Date) {
      if (Number.isNaN(value.getTime())) {
        return '';
      }
      return value.toISOString().slice(0, 10);
    }
    return '';
  }

  private toPositiveInt(value: ExcelCell): number {
    if (typeof value === 'number') {
      const rounded = Math.round(value);
      return Number.isFinite(rounded) && rounded > 0 ? rounded : 0;
    }
    const text = this.asCellText(value);
    if (!text) {
      return 0;
    }
    const parsed = Number(text);
    if (!Number.isFinite(parsed)) {
      return 0;
    }
    const rounded = Math.round(parsed);
    return rounded > 0 ? rounded : 0;
  }
}
