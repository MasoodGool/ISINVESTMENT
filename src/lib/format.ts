// Money is stored as ZAR cents; convert at the boundary.

export function centsToRand(cents: number): number {
  return cents / 100;
}

export function randToCents(rand: number): number {
  return Math.round(rand * 100);
}

const zarFormatter = new Intl.NumberFormat("en-ZA", {
  style: "currency",
  currency: "ZAR",
  maximumFractionDigits: 0,
});

const zarFormatterDetailed = new Intl.NumberFormat("en-ZA", {
  style: "currency",
  currency: "ZAR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatZar(cents: number, opts: { detailed?: boolean } = {}): string {
  const value = centsToRand(cents);
  return opts.detailed ? zarFormatterDetailed.format(value) : zarFormatter.format(value);
}

export function formatPercent(value: number, fractionDigits = 1): string {
  return `${value.toFixed(fractionDigits)}%`;
}

const dateFormatter = new Intl.DateTimeFormat("en-ZA", {
  year: "numeric",
  month: "short",
  day: "2-digit",
});

const monthFormatter = new Intl.DateTimeFormat("en-ZA", {
  year: "numeric",
  month: "long",
});

export function formatDate(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return dateFormatter.format(date);
}

export function formatMonth(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return monthFormatter.format(date);
}

export function isoDateInput(d: Date | string | null | undefined): string {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toISOString().slice(0, 10);
}
