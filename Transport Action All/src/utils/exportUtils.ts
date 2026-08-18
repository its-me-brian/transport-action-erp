/**
 * ============================================================================
 * EXPORT UTILITIES — Common export functions for CSV and PDF
 * ============================================================================
 *
 * Provides reusable export functions for all list screens:
 * - exportToCSV: Generates and downloads a CSV file
 * - exportToPDF: Opens a styled HTML page for browser print-to-PDF
 *
 * Usage:
 *   import { exportToCSV, exportToPDF } from '../utils/exportUtils';
 *
 *   exportToCSV(headers, rows, 'filename');
 *   exportToPDF(title, headers, rows, 'filename', { subtitle, footer });
 * ============================================================================
 */

export interface PDFColumn {
  key: string;
  label: string;
  align?: 'left' | 'center' | 'right';
  format?: (value: any) => string;
}

/**
 * Export data to CSV file and trigger download
 */
export function exportToCSV(
  headers: string[],
  rows: (string | number | boolean | null | undefined)[][],
  fileName: string
): void {
  const csvContent = [headers, ...rows]
    .map(row =>
      row
        .map(cell => {
          const str = String(cell ?? '');
          // Escape quotes and wrap in quotes if contains comma, newline, or quote
          if (str.includes(',') || str.includes('\n') || str.includes('"')) {
            return `"${str.replace(/"/g, '""')}"`;
          }
          return str;
        })
        .join(',')
    )
    .join('\n');

  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${fileName}_${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
}

/**
 * Export data to PDF via browser print dialog
 */
export function exportToPDF(
  title: string,
  columns: PDFColumn[],
  rows: Record<string, any>[],
  options: {
    subtitle?: string;
    footer?: string;
    fileName?: string;
  } = {}
): void {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const subtitle = options.subtitle || `Generated: ${new Date().toLocaleDateString('it-IT')} | Total: ${rows.length}`;
  const footer = options.footer || 'Transport Action ERP';

  const tableHeaders = columns
    .map(col => `<th style="text-align: ${col.align || 'left'}">${col.label}</th>`)
    .join('');

  const tableRows = rows
    .map(
      row =>
        `<tr>${columns
          .map(col => {
            const value = col.format ? col.format(row[col.key]) : (row[col.key] ?? '—');
            return `<td style="text-align: ${col.align || 'left'}">${value}</td>`;
          })
          .join('')}</tr>`
    )
    .join('');

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>${title}</title>
      <style>
        * { box-sizing: border-box; }
        body { font-family: Arial, sans-serif; padding: 24px; color: #1a1a2e; }
        h1 { font-size: 22px; margin: 0 0 4px 0; color: #1a1a2e; }
        .subtitle { color: #6b7280; font-size: 13px; margin-bottom: 20px; }
        table { width: 100%; border-collapse: collapse; margin-top: 12px; }
        th { background: #1a1a2e; color: white; padding: 10px 12px; text-align: left; font-size: 11px; font-weight: 600; }
        td { padding: 8px 12px; border-bottom: 1px solid #e5e7eb; font-size: 12px; }
        tr:nth-child(even) { background: #f9fafb; }
        tr:hover { background: #f3f4f6; }
        .footer { margin-top: 20px; font-size: 10px; color: #9ca3af; border-top: 1px solid #e5e7eb; padding-top: 8px; }
        @media print { body { padding: 0; } @page { margin: 15mm; } }
      </style>
    </head>
    <body>
      <h1>${title}</h1>
      <p class="subtitle">${subtitle}</p>
      <table>
        <thead><tr>${tableHeaders}</tr></thead>
        <tbody>${tableRows}</tbody>
      </table>
      <p class="footer">${footer}</p>
    </body>
    </html>
  `);
  printWindow.document.close();
  printWindow.print();
}

/**
 * Format date for export display
 */
export function formatDateExport(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('it-IT');
  } catch {
    return '—';
  }
}

/**
 * Format currency for export display
 */
export function formatCurrencyExport(
  amount: number | null | undefined,
  currency: string = 'EUR'
): string {
  if (amount === null || amount === undefined) return '—';
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency,
  }).format(amount);
}
