// Minimal CSV writer (RFC 4180). Values are quoted when they contain
// delimiters, quotes, or newlines; quotes are doubled.

export type CsvValue = string | number | boolean | Date | null | undefined;

function escapeCell(value: CsvValue): string {
  if (value === null || value === undefined) return "";
  let s: string;
  if (value instanceof Date) {
    s = value.toISOString().slice(0, 10);
  } else {
    s = String(value);
  }
  if (/[",\n\r]/.test(s)) {
    s = `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function toCsv(rows: CsvValue[][]): string {
  return rows.map((row) => row.map(escapeCell).join(",")).join("\r\n") + "\r\n";
}

/** Cents → Rand string with 2 decimals, the format accountants expect. */
export function centsToRandString(cents: number): string {
  return (cents / 100).toFixed(2);
}

export function csvResponse(filename: string, csv: string): Response {
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
