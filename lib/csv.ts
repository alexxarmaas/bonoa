export type CsvCell = string | number | boolean | null | undefined;

export function escapeCsvCell(value: CsvCell, delimiter = ",") {
  if (value === null || value === undefined) return "";
  const raw = String(value);
  // Spreadsheet formula injection protection for user-supplied text.
  const text = typeof value === "string" && (/^[\t\r\n]/.test(raw) || /^[\s\u0000-\u001f]*[=+\-@]/.test(raw)) ? "'" + raw : raw;
  if (text.includes(delimiter) || /["\n\r]/.test(text)) return '"' + text.replace(/"/g, '""') + '"';
  return text;
}

export function buildCsv(headers: string[], rows: CsvCell[][], delimiter = ",") {
  return "\uFEFF" + [headers, ...rows]
    .map((row) => row.map((cell) => escapeCsvCell(cell, delimiter)).join(delimiter))
    .join("\r\n") + "\r\n";
}

export function downloadCsv(filename: string, headers: string[], rows: CsvCell[][], delimiter = ",") {
  const blob = new Blob([buildCsv(headers, rows, delimiter)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function safeFilename(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "bonoa";
}
