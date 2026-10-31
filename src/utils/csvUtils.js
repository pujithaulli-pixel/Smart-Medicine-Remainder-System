/**
 * CSV Export Utility for Smart Medical Reminder System
 * Provides UTF-8 CSV file generation with BOM (\uFEFF) for full compatibility
 * with Microsoft Excel, Google Sheets, LibreOffice, and text processors
 * across English, Hindi (हिन्दी), and Telugu (తెలుగు) scripts.
 */

/**
 * Escapes a single CSV field value.
 * Wraps values in double quotes if they contain commas, double quotes, or newlines.
 * Replaces existing double quotes with escaped pairs ("").
 */
export const escapeCsvValue = (val) => {
  if (val === null || val === undefined) return '';
  const str = String(val);
  if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

/**
 * Converts headers and row data into a formatted CSV string with UTF-8 BOM.
 */
export const formatCsvContent = (headers, rows) => {
  const headerLine = headers.map(escapeCsvValue).join(',');
  const rowLines = rows.map((row) => row.map(escapeCsvValue).join(','));
  return `\uFEFF${[headerLine, ...rowLines].join('\r\n')}`;
};

/**
 * Triggers a browser download of the CSV content.
 * Returns true on success or throws an error on failure.
 */
export const downloadCsvFile = (filename, headers, rows) => {
  try {
    const csvContent = formatCsvContent(headers, rows);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    return true;
  } catch (error) {
    console.error('[CSV Export Error]:', error);
    throw new Error(`Failed to export CSV: ${error.message || 'Unknown browser error'}`);
  }
};
