// REVIEW: Client-side export utilities for CSV/Excel
// For large datasets, backend export via Redis Streams would be preferred

import { formatDateTime } from '@brainforgeau/components/utils';

export const exportToCSV = (data: Record<string, unknown>[], filename: string) => {
  if (!data || data.length === 0) {
    console.warn('No data to export');
    return;
  }

  // Get all unique columns from the data
  const columns = Array.from(
    new Set(data.flatMap((row) => Object.keys(row))),
  );

  // Create CSV header
  const header = columns.join(',');

  // Create CSV rows
  const rows = data.map((row) =>
    columns
      .map((col) => {
        const value = row[col];
        // Handle special characters and quotes
        if (value === null || value === undefined) return '';
        const stringValue = String(value);
        // Wrap in quotes if contains comma, newline, or quote
        if (stringValue.includes(',') || stringValue.includes('\n') || stringValue.includes('"')) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      })
      .join(','),
  );

  // Combine header and rows
  const csv = [header, ...rows].join('\n');

  // Create blob and download
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const exportToXlsx = async (data: Record<string, unknown>[], filename: string) => {
  if (!data || data.length === 0) {
    console.warn('No data to export');
    return;
  }

  const ExcelJS = await import('exceljs');
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Report');

  const columns = Array.from(new Set(data.flatMap((row) => Object.keys(row))));

  sheet.columns = columns.map((col) => ({
    header: col,
    key: col,
    width: Math.max(col.length + 4, 16),
  }));

  // Style the header row
  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE8F0FE' },
  };
  headerRow.border = {
    bottom: { style: 'thin' },
  };

  // Add data rows
  data.forEach((row) => {
    sheet.addRow(columns.map((col) => row[col] ?? ''));
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.xlsx`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const exportToExcel = exportToXlsx;

export const formatReportData = (
  data: Record<string, unknown>[],
  timezone?: string | null,
): Record<string, unknown>[] => {
  return data.map((row) => {
    const formatted: Record<string, unknown> = {};
    Object.entries(row).forEach(([key, value]) => {
      // Format dates
      if (typeof value === 'string' && !isNaN(Date.parse(value)) && key.toLowerCase().includes('date')) {
        formatted[key] = formatDateTime(value, { timezone });
      }
      // Format numbers
      else if (typeof value === 'number') {
        formatted[key] = value.toFixed(2);
      }
      // Keep everything else as is
      else {
        formatted[key] = value;
      }
    });
    return formatted;
  });
};
