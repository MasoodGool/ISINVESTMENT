// Bank statement CSV parsing + SARS-aware auto-categorisation.
// Pure functions, no database access — runs client-side for preview and is
// unit-tested. Handles the export formats of the major SA banks (FNB, ABSA,
// Standard Bank, Nedbank, Capitec): single signed amount column or separate
// debit/credit columns; various date and number formats.

export interface StatementRow {
  /** ISO date YYYY-MM-DD */
  date: string;
  description: string;
  /** Signed cents. Negative = money out (debit), positive = money in. */
  amountCents: number;
}

export interface ParseResult {
  rows: StatementRow[];
  /** Human-readable notes about lines that were skipped. */
  skipped: string[];
}

// ---------------------------------------------------------------------------
// CSV tokenizer (RFC 4180-ish: quoted fields, doubled quotes, CR/LF).
// ---------------------------------------------------------------------------

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cell += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      cell = "";
      rows.push(row);
      row = [];
    } else {
      cell += ch;
    }
  }
  row.push(cell);
  rows.push(row);

  // Drop fully-empty trailing rows.
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

// ---------------------------------------------------------------------------
// Amount parsing: "1 234,56", "-1234.56", "(1 234.56)", "R 1,234.56" …
// ---------------------------------------------------------------------------

export function parseAmountCents(raw: string): number | null {
  let s = raw.trim();
  if (!s) return null;

  let negative = false;
  if (/^\(.*\)$/.test(s)) {
    negative = true;
    s = s.slice(1, -1);
  }
  if (s.endsWith("-")) {
    negative = true;
    s = s.slice(0, -1);
  }
  if (s.startsWith("-")) {
    negative = true;
    s = s.slice(1);
  }
  // Strip currency markers and spaces (incl. non-breaking).
  s = s.replace(/[Rr]\s*/g, "").replace(/[\s ]/g, "");

  // Decide the decimal separator: the last of "." or "," if followed by 1-2
  // digits; everything else is a thousands separator.
  const lastDot = s.lastIndexOf(".");
  const lastComma = s.lastIndexOf(",");
  const sepIndex = Math.max(lastDot, lastComma);
  let intPart = s;
  let fracPart = "";
  if (sepIndex !== -1 && s.length - sepIndex - 1 <= 2) {
    intPart = s.slice(0, sepIndex);
    fracPart = s.slice(sepIndex + 1);
  }
  intPart = intPart.replace(/[.,]/g, "");
  if (!/^\d*$/.test(intPart) || !/^\d*$/.test(fracPart)) return null;
  if (intPart === "" && fracPart === "") return null;

  const cents =
    (parseInt(intPart || "0", 10) * 100 || 0) +
    (fracPart ? parseInt(fracPart.padEnd(2, "0"), 10) : 0);
  return negative ? -cents : cents;
}

// ---------------------------------------------------------------------------
// Date parsing: YYYY-MM-DD, YYYY/MM/DD, DD/MM/YYYY, DD-MM-YYYY, DD MMM YYYY.
// SA bank exports are day-first when ambiguous.
// ---------------------------------------------------------------------------

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};

export function parseStatementDate(raw: string): string | null {
  const s = raw.trim();
  if (!s) return null;

  let y = 0, m = 0, d = 0;
  let match: RegExpMatchArray | null;

  if ((match = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/))) {
    [y, m, d] = [Number(match[1]), Number(match[2]), Number(match[3])];
  } else if ((match = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/))) {
    [d, m, y] = [Number(match[1]), Number(match[2]), Number(match[3])];
  } else if ((match = s.match(/^(\d{1,2})\s+([A-Za-z]{3,})\s+(\d{4})/))) {
    const month = MONTHS[match[2].slice(0, 3).toLowerCase()];
    if (!month) return null;
    [d, m, y] = [Number(match[1]), month, Number(match[3])];
  } else {
    return null;
  }

  if (m < 1 || m > 12 || d < 1 || d > 31 || y < 1990 || y > 2100) return null;
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

// ---------------------------------------------------------------------------
// Column detection from the header row.
// ---------------------------------------------------------------------------

interface ColumnMap {
  date: number;
  description: number;
  amount?: number;
  debit?: number;
  credit?: number;
}

function findColumn(header: string[], patterns: RegExp[]): number | undefined {
  for (const pattern of patterns) {
    const idx = header.findIndex((h) => pattern.test(h.trim().toLowerCase()));
    if (idx !== -1) return idx;
  }
  return undefined;
}

export function detectColumns(header: string[]): ColumnMap | null {
  const date = findColumn(header, [/^date$/, /transaction date/, /^post(ing)? date/, /date/]);
  const description = findColumn(header, [
    /^description$/, /narrative/, /reference/, /details/, /transaction(?! date)/, /descr/,
  ]);
  const amount = findColumn(header, [/^amount/, /value/]);
  const debit = findColumn(header, [/debit/, /money out/, /paid out/]);
  const credit = findColumn(header, [/credit/, /money in/, /paid in/]);

  if (date === undefined || description === undefined) return null;
  if (amount === undefined && debit === undefined && credit === undefined) return null;
  return { date, description, amount, debit, credit };
}

// ---------------------------------------------------------------------------
// Full statement parse: header detection + per-line extraction.
// ---------------------------------------------------------------------------

export function parseStatement(text: string): ParseResult {
  const raw = parseCsv(text);
  if (raw.length === 0) return { rows: [], skipped: ["No CSV content found."] };

  // The header is the first row that yields a valid column map (banks often
  // prepend account metadata above the real header).
  let columns: ColumnMap | null = null;
  let headerIndex = -1;
  for (let i = 0; i < Math.min(raw.length, 10); i++) {
    columns = detectColumns(raw[i]);
    if (columns) {
      headerIndex = i;
      break;
    }
  }
  if (!columns) {
    return {
      rows: [],
      skipped: [
        "Couldn't find a header row. Expect columns like Date, Description, Amount (or Debit/Credit).",
      ],
    };
  }

  const rows: StatementRow[] = [];
  const skipped: string[] = [];

  for (let i = headerIndex + 1; i < raw.length; i++) {
    const line = raw[i];
    const date = parseStatementDate(line[columns.date] ?? "");
    const description = (line[columns.description] ?? "").trim();

    let amountCents: number | null = null;
    if (columns.amount !== undefined) {
      amountCents = parseAmountCents(line[columns.amount] ?? "");
    }
    if (amountCents === null && columns.debit !== undefined) {
      const debit = parseAmountCents(line[columns.debit] ?? "");
      if (debit !== null && debit !== 0) amountCents = -Math.abs(debit);
    }
    if (amountCents === null && columns.credit !== undefined) {
      const credit = parseAmountCents(line[columns.credit] ?? "");
      if (credit !== null && credit !== 0) amountCents = Math.abs(credit);
    }

    if (!date || amountCents === null || amountCents === 0) {
      const preview = line.join(",").slice(0, 60);
      skipped.push(`Line ${i + 1}: ${preview || "(empty)"}`);
      continue;
    }
    rows.push({ date, description: description || "(no description)", amountCents });
  }

  return { rows, skipped };
}

// ---------------------------------------------------------------------------
// Auto-categorisation. Keyword rules tuned for SA landlord statements;
// first match wins, ordered most-specific first.
// ---------------------------------------------------------------------------

const CATEGORY_RULES: Array<{ pattern: RegExp; code: string }> = [
  { pattern: /levy|levies|body corp/i, code: "LEVIES_NORMAL" },
  { pattern: /rates|municipal|city of|municipality|ethekwini|tshwane|joburg|ekurhuleni/i, code: "RATES_TAXES" },
  { pattern: /insur|santam|hollard|outsurance|discovery insure|king price/i, code: "INSURANCE_BUILDING" },
  { pattern: /plumb|geyser|roof|repair|maintain|maintenance|handyman|glass|paint|pest/i, code: "REPAIRS" },
  { pattern: /garden|pool|lawn/i, code: "GARDEN" },
  { pattern: /security|adt |armed|fidelity|alarm/i, code: "SECURITY" },
  { pattern: /clean/i, code: "CLEANING" },
  { pattern: /electric|eskom|prepaid|power/i, code: "ELECTRICITY" },
  { pattern: /water/i, code: "WATER" },
  { pattern: /refuse|waste/i, code: "REFUSE" },
  { pattern: /sewer/i, code: "SEWERAGE" },
  { pattern: /agent|commission|pam golding|rawson|remax|seeff|harcourts|rental management/i, code: "AGENT_FEES" },
  { pattern: /property24|privateproperty|advert|gumtree/i, code: "ADVERTISING" },
  { pattern: /accounting|accountant|tax prac|bookkeep/i, code: "ACCOUNTING" },
  { pattern: /attorney|legal|eviction/i, code: "LEGAL" },
  { pattern: /bank fee|service fee|account fee|monthly fee|#monthly|admin charge/i, code: "BANK_CHARGES" },
  { pattern: /bond|home ?loan|mortgage/i, code: "BOND_INTEREST" },
];

export function suggestCategory(description: string): string {
  for (const rule of CATEGORY_RULES) {
    if (rule.pattern.test(description)) return rule.code;
  }
  return "OTHER";
}

/** Looks like rent coming in (credit with rent-ish wording). */
export function looksLikeRent(description: string): boolean {
  return /rent|huur|tenant|lease/i.test(description);
}
