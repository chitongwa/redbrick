// ── Export helpers ──
// CSV: plain client-side Blob → anchor download (no dependencies).
// PDF: window.print() triggered against a "print-only" DOM region. The
//      browser's "Save as PDF" target produces investor-quality output and
//      keeps the bundle size lean (no jsPDF / html2canvas dependency).

// ──────────────────────────────────────────────────────────────────────────
//  CSV
// ──────────────────────────────────────────────────────────────────────────

/**
 * Escape a single CSV cell: wraps in quotes if it contains comma / quote /
 * newline, and doubles any embedded quotes.
 */
function csvCell(v) {
  if (v === null || v === undefined) return '';
  const s = String(v);
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/**
 * Turn an array of row objects into a CSV string.
 *
 * @param {Array<Record<string, any>>} rows
 * @param {Array<{ key: string, label: string }>} columns
 * @returns {string}
 */
export function toCSV(rows, columns) {
  if (!Array.isArray(rows) || rows.length === 0) {
    return columns.map((c) => csvCell(c.label)).join(',') + '\n';
  }
  const header = columns.map((c) => csvCell(c.label)).join(',');
  const body   = rows
    .map((row) => columns.map((c) => csvCell(row[c.key])).join(','))
    .join('\n');
  return `${header}\n${body}\n`;
}

/**
 * Trigger a browser download of a CSV file.
 *
 * @param {string} filename  e.g. "revenue-daily-2026-04-08.csv"
 * @param {Array<Record<string, any>>} rows
 * @param {Array<{ key: string, label: string }>} columns
 */
export function downloadCSV(filename, rows, columns) {
  const csv = toCSV(rows, columns);
  // Prepend a BOM so Excel auto-detects UTF-8.
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();

  // Cleanup on next tick so Safari picks up the download.
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
}

// ──────────────────────────────────────────────────────────────────────────
//  PDF via window.print()
// ──────────────────────────────────────────────────────────────────────────

/**
 * Print the entire Analytics page, using the app's @media print stylesheet.
 * The user picks "Save as PDF" in the native print dialog → investor PDF.
 *
 * @param {string} [title]  Optional title override (sets document.title so
 *                          the saved filename defaults to something sensible).
 */
export function printReport(title) {
  const previousTitle = document.title;
  if (title) document.title = title;

  // Small defer so any state updates (e.g. hiding the sidebar) paint before
  // the print dialog captures the page.
  setTimeout(() => {
    try {
      window.print();
    } finally {
      if (title) document.title = previousTitle;
    }
  }, 50);
}

/**
 * Get today's date in YYYY-MM-DD for use in export filenames.
 */
export function todayStamp() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm   = String(d.getMonth() + 1).padStart(2, '0');
  const dd   = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}
