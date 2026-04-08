/**
 * Hook that returns a function to export an array of objects as CSV.
 */
export function useCsvExport() {
  return function exportCsv(data, filename = 'export.csv') {
    if (!data.length) return;
    const headers = Object.keys(data[0]);
    const rows = data.map((row) =>
      headers.map((h) => {
        const val = row[h] ?? '';
        const str = String(val).replace(/"/g, '""');
        return `"${str}"`;
      }).join(',')
    );
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };
}
