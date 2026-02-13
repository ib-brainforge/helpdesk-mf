// REVIEW: Client-side export utilities for CSV/Excel
// For large datasets, backend export via Redis Streams would be preferred

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

export const exportToExcel = async (data: Record<string, unknown>[], filename: string) => {
  // REVIEW: For Excel export, we would typically use a library like xlsx or ExcelJS
  // For now, falling back to CSV format with .xls extension
  // Backend implementation would use ClosedXML for proper Excel format
  console.warn('Excel export not yet implemented - falling back to CSV');
  exportToCSV(data, filename);
};

export const formatReportData = (
  data: Record<string, unknown>[],
): Record<string, unknown>[] => {
  return data.map((row) => {
    const formatted: Record<string, unknown> = {};
    Object.entries(row).forEach(([key, value]) => {
      // Format dates
      if (typeof value === 'string' && !isNaN(Date.parse(value)) && key.toLowerCase().includes('date')) {
        formatted[key] = new Date(value).toLocaleString();
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
