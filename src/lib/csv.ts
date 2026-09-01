import { downloadFile } from './ubl';

/** Formate un nombre pour Excel FR (virgule décimale). */
export function csvNum(n: number): string {
  return (Number(n) || 0).toFixed(2).replace('.', ',');
}

function cell(v: string | number): string {
  const s = typeof v === 'number' ? String(v) : v;
  return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/**
 * Télécharge un CSV compatible Excel francophone :
 * séparateur « ; », UTF-8 avec BOM.
 */
export function downloadCSV(filename: string, headers: string[], rows: (string | number)[][]): void {
  const lines = [headers, ...rows].map((r) => r.map(cell).join(';'));
  downloadFile(filename, '﻿' + lines.join('\r\n'), 'text/csv;charset=utf-8');
}
