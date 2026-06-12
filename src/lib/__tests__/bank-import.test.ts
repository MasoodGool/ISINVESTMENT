import { describe, expect, it } from "vitest";
import {
  detectColumns,
  looksLikeRent,
  parseAmountCents,
  parseCsv,
  parseStatement,
  parseStatementDate,
  suggestCategory,
} from "@/lib/bank-import";

describe("parseCsv", () => {
  it("splits rows and cells", () => {
    expect(parseCsv("a,b\nc,d")).toEqual([
      ["a", "b"],
      ["c", "d"],
    ]);
  });

  it("handles quoted cells with commas, quotes, and newlines", () => {
    expect(parseCsv('"a,1","say ""hi""","two\nlines"')).toEqual([
      ["a,1", 'say "hi"', "two\nlines"],
    ]);
  });

  it("handles CRLF and skips empty trailing lines", () => {
    expect(parseCsv("a,b\r\nc,d\r\n\r\n")).toEqual([
      ["a", "b"],
      ["c", "d"],
    ]);
  });
});

describe("parseAmountCents", () => {
  it("parses plain and signed decimals", () => {
    expect(parseAmountCents("1234.56")).toBe(123456);
    expect(parseAmountCents("-1234.56")).toBe(-123456);
    expect(parseAmountCents("1234.5")).toBe(123450);
  });

  it("parses comma decimal separators and space thousands", () => {
    expect(parseAmountCents("1 234,56")).toBe(123456);
    expect(parseAmountCents("12 345")).toBe(1234500);
  });

  it("parses thousands separators with dot decimals", () => {
    expect(parseAmountCents("1,234.56")).toBe(123456);
    expect(parseAmountCents("1.234,56")).toBe(123456);
  });

  it("parses parentheses and trailing-minus negatives", () => {
    expect(parseAmountCents("(1234.56)")).toBe(-123456);
    expect(parseAmountCents("1234.56-")).toBe(-123456);
  });

  it("strips currency markers", () => {
    expect(parseAmountCents("R 1 234.56")).toBe(123456);
  });

  it("rejects garbage", () => {
    expect(parseAmountCents("")).toBeNull();
    expect(parseAmountCents("abc")).toBeNull();
    expect(parseAmountCents("12a4")).toBeNull();
  });
});

describe("parseStatementDate", () => {
  it("parses ISO and slash formats", () => {
    expect(parseStatementDate("2026-05-03")).toBe("2026-05-03");
    expect(parseStatementDate("2026/05/03")).toBe("2026-05-03");
  });

  it("parses day-first formats (SA convention)", () => {
    expect(parseStatementDate("03/05/2026")).toBe("2026-05-03");
    expect(parseStatementDate("3-5-2026")).toBe("2026-05-03");
  });

  it("parses written months", () => {
    expect(parseStatementDate("3 May 2026")).toBe("2026-05-03");
    expect(parseStatementDate("03 Sep 2026")).toBe("2026-09-03");
  });

  it("rejects invalid dates", () => {
    expect(parseStatementDate("")).toBeNull();
    expect(parseStatementDate("31/13/2026")).toBeNull();
    expect(parseStatementDate("hello")).toBeNull();
  });
});

describe("detectColumns", () => {
  it("finds date/description/amount headers", () => {
    const map = detectColumns(["Date", "Description", "Amount"]);
    expect(map).toEqual({ date: 0, description: 1, amount: 2, debit: undefined, credit: undefined });
  });

  it("finds debit/credit style headers", () => {
    const map = detectColumns(["Transaction Date", "Narrative", "Money Out", "Money In"]);
    expect(map?.debit).toBe(2);
    expect(map?.credit).toBe(3);
  });

  it("returns null when essentials are missing", () => {
    expect(detectColumns(["Foo", "Bar"])).toBeNull();
  });
});

describe("parseStatement", () => {
  it("parses a simple single-amount statement", () => {
    const { rows, skipped } = parseStatement(
      "Date,Description,Amount\n2026-05-01,CITY OF CAPE TOWN,-2180.00\n2026-05-03,EFT RENT,18500.00",
    );
    expect(skipped).toEqual([]);
    expect(rows).toEqual([
      { date: "2026-05-01", description: "CITY OF CAPE TOWN", amountCents: -218000 },
      { date: "2026-05-03", description: "EFT RENT", amountCents: 1850000 },
    ]);
  });

  it("skips metadata lines above the header", () => {
    const { rows } = parseStatement(
      "Account,123456789\nStatement period,May 2026\nDate,Description,Amount\n01/05/2026,LEVY,-1485.00",
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].amountCents).toBe(-148500);
  });

  it("handles debit/credit columns with debits made negative", () => {
    const { rows } = parseStatement(
      "Date,Details,Debit,Credit\n2026-05-02,PLUMBER,950.00,\n2026-05-03,RENT RECEIVED,,18500.00",
    );
    expect(rows[0].amountCents).toBe(-95000);
    expect(rows[1].amountCents).toBe(1850000);
  });

  it("reports unparseable lines without dropping the rest", () => {
    const { rows, skipped } = parseStatement(
      "Date,Description,Amount\nnot-a-date,JUNK,xx\n2026-05-01,OK,-10.00",
    );
    expect(rows).toHaveLength(1);
    expect(skipped).toHaveLength(1);
  });
});

describe("suggestCategory", () => {
  it("matches SA-specific vendors and terms", () => {
    expect(suggestCategory("CITY OF CAPE TOWN RATES")).toBe("RATES_TAXES");
    expect(suggestCategory("BODY CORP LEVY MAY")).toBe("LEVIES_NORMAL");
    expect(suggestCategory("ADT SECURITY DEBIT ORDER")).toBe("SECURITY");
    expect(suggestCategory("PAM GOLDING COMMISSION")).toBe("AGENT_FEES");
    expect(suggestCategory("ESKOM PREPAID")).toBe("ELECTRICITY");
    expect(suggestCategory("SBSA HOME LOAN")).toBe("BOND_INTEREST");
    expect(suggestCategory("CAPE PLUMBERS GEYSER")).toBe("REPAIRS");
  });

  it("prefers levies over municipal when both could match", () => {
    expect(suggestCategory("MUNICIPAL LEVIES")).toBe("LEVIES_NORMAL");
  });

  it("falls back to OTHER", () => {
    expect(suggestCategory("XYZZY UNKNOWN 42")).toBe("OTHER");
  });
});

describe("looksLikeRent", () => {
  it("spots rent-ish credits", () => {
    expect(looksLikeRent("EFT RENT S DLAMINI")).toBe(true);
    expect(looksLikeRent("TENANT PAYMENT")).toBe(true);
    expect(looksLikeRent("INTEREST RECEIVED")).toBe(false);
  });
});
