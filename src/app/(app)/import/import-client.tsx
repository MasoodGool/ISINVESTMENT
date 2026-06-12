"use client";

import { useActionState, useMemo, useState } from "react";
import { importRowsAction, type ImportState } from "./actions";
import {
  parseStatement,
  suggestCategory,
  looksLikeRent,
  type StatementRow,
} from "@/lib/bank-import";
import { EXPENSE_CATEGORIES, EXPENSE_GROUPS } from "@/lib/sars";
import { formatZar } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Field, FieldHint, Label, Select, Textarea } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import { Table, THead, TBody, Tr, Th, Td } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export interface PropertyOption {
  id: string;
  name: string;
  hasActiveLease: boolean;
}

type RowKind = "expense" | "rent" | "skip";

interface PreviewRow extends StatementRow {
  kind: RowKind;
  categoryCode: string;
}

export function ImportClient({ properties }: { properties: PropertyOption[] }) {
  const [propertyId, setPropertyId] = useState(properties[0]?.id ?? "");
  const [csvText, setCsvText] = useState("");
  const [rows, setRows] = useState<PreviewRow[] | null>(null);
  const [skipped, setSkipped] = useState<string[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);

  const property = properties.find((p) => p.id === propertyId);

  const [state, formAction, pending] = useActionState<ImportState, FormData>(
    importRowsAction,
    {},
  );

  function handleParse() {
    setParseError(null);
    const result = parseStatement(csvText);
    if (result.rows.length === 0) {
      setRows(null);
      setSkipped([]);
      setParseError(result.skipped[0] ?? "No transactions found in that CSV.");
      return;
    }
    setSkipped(result.skipped);
    setRows(
      result.rows.map((r) => {
        const isCredit = r.amountCents > 0;
        if (isCredit) {
          const rentish = looksLikeRent(r.description) && property?.hasActiveLease;
          return { ...r, kind: rentish ? "rent" : "skip", categoryCode: "OTHER" };
        }
        return { ...r, kind: "expense", categoryCode: suggestCategory(r.description) };
      }),
    );
  }

  async function handleFile(file: File) {
    setCsvText(await file.text());
  }

  function updateRow(index: number, patch: Partial<PreviewRow>) {
    setRows((prev) =>
      prev ? prev.map((r, i) => (i === index ? { ...r, ...patch } : r)) : prev,
    );
  }

  const included = useMemo(() => (rows ?? []).filter((r) => r.kind !== "skip"), [rows]);
  const payload = useMemo(
    () =>
      JSON.stringify({
        propertyId,
        rows: included.map((r) => ({
          date: r.date,
          description: r.description,
          amountCents: r.amountCents,
          kind: r.kind,
          categoryCode: r.kind === "expense" ? r.categoryCode : undefined,
        })),
      }),
    [propertyId, included],
  );

  if (state.ok && state.imported) {
    return (
      <Alert tone="success" title="Import complete">
        Imported {state.imported.expenses} expense(s) and {state.imported.payments} rent
        payment(s). They now appear on the property ledger, tax report, and rent roll.{" "}
        <button
          type="button"
          className="underline"
          onClick={() => window.location.reload()}
        >
          Import another statement
        </button>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>1 — Paste or upload your statement</CardTitle>
          <CardDescription>
            CSV exports from FNB, ABSA, Standard Bank, Nedbank, and Capitec are
            recognised: a date, a description, and an amount (or debit/credit) column.
          </CardDescription>
        </CardHeader>
        <CardBody className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <Field>
              <Label htmlFor="property">Property</Label>
              <Select
                id="property"
                value={propertyId}
                onChange={(e) => setPropertyId(e.target.value)}
              >
                {properties.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>
              {property && !property.hasActiveLease && (
                <FieldHint>
                  No active lease — credits can&apos;t be imported as rent for this
                  property.
                </FieldHint>
              )}
            </Field>
            <Field>
              <Label htmlFor="file">CSV file</Label>
              <input
                id="file"
                type="file"
                accept=".csv,text/csv,text/plain"
                className="block w-full text-sm text-zinc-600 file:mr-3 file:rounded-md file:border-0 file:bg-zinc-100 file:px-3 file:py-2 file:text-sm file:font-medium hover:file:bg-zinc-200"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void handleFile(f);
                }}
              />
              <FieldHint>…or paste the contents below.</FieldHint>
            </Field>
          </div>
          <Field>
            <Label htmlFor="csv">Statement CSV</Label>
            <Textarea
              id="csv"
              rows={8}
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              placeholder={"Date,Description,Amount\n2026-05-01,CITY OF CAPE TOWN RATES,-2180.00\n2026-05-03,EFT RENT S DLAMINI,18500.00"}
              className="font-mono text-xs"
            />
          </Field>
          {parseError && <Alert tone="error">{parseError}</Alert>}
          <div className="flex justify-end">
            <Button type="button" onClick={handleParse} disabled={!csvText.trim() || !propertyId}>
              Parse statement
            </Button>
          </div>
        </CardBody>
      </Card>

      {rows && (
        <Card>
          <CardHeader>
            <CardTitle>2 — Review and categorise</CardTitle>
            <CardDescription>
              Debits default to expenses with a suggested SARS category; credits that
              look like rent are matched to the active lease. Set anything you don&apos;t
              want to “Skip”.
            </CardDescription>
          </CardHeader>
          <CardBody className="space-y-4 p-0">
            <Table>
              <THead>
                <Tr>
                  <Th>Date</Th>
                  <Th>Description</Th>
                  <Th className="text-right">Amount</Th>
                  <Th>Import as</Th>
                  <Th>Category</Th>
                </Tr>
              </THead>
              <TBody>
                {rows.map((r, i) => (
                  <Tr key={i} className={r.kind === "skip" ? "opacity-50" : ""}>
                    <Td className="whitespace-nowrap text-zinc-500">{r.date}</Td>
                    <Td className="max-w-xs truncate" title={r.description}>
                      {r.description}
                    </Td>
                    <Td
                      className={`text-right tabular-nums font-medium whitespace-nowrap ${
                        r.amountCents < 0 ? "text-zinc-900" : "text-green-700"
                      }`}
                    >
                      {formatZar(r.amountCents, { detailed: true })}
                    </Td>
                    <Td>
                      <Select
                        value={r.kind}
                        onChange={(e) => updateRow(i, { kind: e.target.value as RowKind })}
                        className="h-8 text-xs"
                      >
                        <option value="expense">Expense</option>
                        <option value="rent" disabled={!property?.hasActiveLease}>
                          Rent payment
                        </option>
                        <option value="skip">Skip</option>
                      </Select>
                    </Td>
                    <Td>
                      {r.kind === "expense" ? (
                        <Select
                          value={r.categoryCode}
                          onChange={(e) => updateRow(i, { categoryCode: e.target.value })}
                          className="h-8 text-xs"
                        >
                          {EXPENSE_GROUPS.map((g) => (
                            <optgroup key={g} label={g}>
                              {EXPENSE_CATEGORIES.filter((c) => c.group === g).map((c) => (
                                <option key={c.code} value={c.code}>
                                  {c.label}
                                </option>
                              ))}
                            </optgroup>
                          ))}
                        </Select>
                      ) : r.kind === "rent" ? (
                        <Badge tone="green">Active lease</Badge>
                      ) : (
                        <span className="text-xs text-zinc-400">—</span>
                      )}
                    </Td>
                  </Tr>
                ))}
              </TBody>
            </Table>

            {skipped.length > 0 && (
              <div className="border-t border-zinc-100 px-5 py-3 text-xs text-zinc-500">
                {skipped.length} line(s) couldn&apos;t be parsed and were left out:{" "}
                {skipped.slice(0, 3).join(" · ")}
                {skipped.length > 3 ? " …" : ""}
              </div>
            )}

            <form action={formAction} className="flex items-center justify-between gap-3 border-t border-zinc-200 px-5 py-4">
              <input type="hidden" name="payload" value={payload} />
              <div className="text-sm text-zinc-600">
                {included.length} of {rows.length} row(s) selected ·{" "}
                {included.filter((r) => r.kind === "expense").length} expense(s),{" "}
                {included.filter((r) => r.kind === "rent").length} rent payment(s)
              </div>
              <div className="flex items-center gap-3">
                {state.error && <span className="text-sm text-red-600">{state.error}</span>}
                <Button type="submit" disabled={pending || included.length === 0}>
                  {pending ? "Importing…" : `Import ${included.length} row(s)`}
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
