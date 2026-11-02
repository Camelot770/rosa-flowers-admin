// Names and comments come from customers, and a cell starting with one of these runs as a formula in Excel
function safeCell(value: unknown): string {
  const text = value === null || value === undefined ? '' : String(value);
  const isPhoneOrNumber = /^[+-]?[\d\s()-]+$/.test(text);
  const guarded = /^[=+\-@\t\r]/.test(text) && !isPhoneOrNumber ? `'${text}` : text;
  return `"${guarded.replace(/"/g, '""')}"`;
}

// Semicolons and the BOM are what Excel with a Russian locale opens correctly by double click
export function downloadCsv(fileName: string, header: string[], rows: unknown[][]): void {
  const lines = [header, ...rows].map((row) => row.map(safeCell).join(';'));
  const blob = new Blob([`﻿${lines.join('\r\n')}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Safari starts the download a moment after the click
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
