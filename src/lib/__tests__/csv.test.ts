import { describe, expect, it } from "vitest";
import { centsToRandString, toCsv } from "@/lib/csv";

describe("toCsv", () => {
  it("joins rows with CRLF and cells with commas", () => {
    expect(toCsv([["a", "b"], ["c", "d"]])).toBe("a,b\r\nc,d\r\n");
  });

  it("quotes cells containing commas, quotes, and newlines", () => {
    expect(toCsv([["hello, world"]])).toBe('"hello, world"\r\n');
    expect(toCsv([['say "hi"']])).toBe('"say ""hi"""\r\n');
    expect(toCsv([["line1\nline2"]])).toBe('"line1\nline2"\r\n');
  });

  it("renders null/undefined as empty and dates as ISO days", () => {
    expect(toCsv([[null, undefined, new Date(Date.UTC(2026, 5, 12))]])).toBe(
      ",,2026-06-12\r\n",
    );
  });

  it("renders numbers and booleans plainly", () => {
    expect(toCsv([[42, true]])).toBe("42,true\r\n");
  });
});

describe("centsToRandString", () => {
  it("formats cents as rands with 2 decimals", () => {
    expect(centsToRandString(1850000)).toBe("18500.00");
    expect(centsToRandString(1)).toBe("0.01");
    expect(centsToRandString(-2500)).toBe("-25.00");
    expect(centsToRandString(0)).toBe("0.00");
  });
});
