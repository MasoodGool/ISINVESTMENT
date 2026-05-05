"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import {
  createLeaseAction,
  createRentPaymentAction,
  createExpenseAction,
  createLoanAction,
  createLoanStatementAction,
  type ActionState,
} from "./actions";
import { Button } from "@/components/ui/button";
import { Field, FieldHint, Input, Label, Select, Textarea } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import { EXPENSE_CATEGORIES, EXPENSE_GROUPS, getCategory } from "@/lib/sars";
import { isoDateInput } from "@/lib/format";

function useForm(
  action: (prev: ActionState, fd: FormData) => Promise<ActionState>,
) {
  return useActionState<ActionState, FormData>(action, {});
}

// --------------------------------------------------------------------------

export function LeaseForm({ propertyId }: { propertyId: string }) {
  const [state, formAction, pending] = useForm(createLeaseAction);
  const formRef = useRef<HTMLFormElement | null>(null);
  useEffect(() => {
    if (state.ok && formRef.current) formRef.current.reset();
  }, [state.ok]);
  const fe = state.fieldErrors ?? {};

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      <input type="hidden" name="propertyId" value={propertyId} />
      {state.error && <Alert tone="error">{state.error}</Alert>}
      {state.ok && <Alert tone="success">Lease created. Any prior active lease was ended.</Alert>}
      <div className="grid sm:grid-cols-2 gap-4">
        <Field>
          <Label htmlFor="tenantName">Tenant name</Label>
          <Input id="tenantName" name="tenantName" required />
          {fe.tenantName && <FieldHint className="text-red-600">{fe.tenantName}</FieldHint>}
        </Field>
        <Field>
          <Label htmlFor="tenantEmail">Tenant email</Label>
          <Input id="tenantEmail" name="tenantEmail" type="email" />
          {fe.tenantEmail && <FieldHint className="text-red-600">{fe.tenantEmail}</FieldHint>}
        </Field>
      </div>
      <Field>
        <Label htmlFor="tenantPhone">Tenant phone</Label>
        <Input id="tenantPhone" name="tenantPhone" />
      </Field>
      <div className="grid sm:grid-cols-3 gap-4">
        <Field>
          <Label htmlFor="startDate">Start date</Label>
          <Input id="startDate" name="startDate" type="date" required />
        </Field>
        <Field>
          <Label htmlFor="endDate">End date</Label>
          <Input id="endDate" name="endDate" type="date" />
          <FieldHint>Optional</FieldHint>
        </Field>
        <Field>
          <Label htmlFor="monthlyRent">Monthly rent (R)</Label>
          <Input id="monthlyRent" name="monthlyRent" type="number" min="0" step="0.01" required />
          {fe.monthlyRent && <FieldHint className="text-red-600">{fe.monthlyRent}</FieldHint>}
        </Field>
      </div>
      <Field>
        <Label htmlFor="depositAmount">Deposit (R)</Label>
        <Input id="depositAmount" name="depositAmount" type="number" min="0" step="0.01" defaultValue="0" />
      </Field>
      <Field>
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" name="notes" />
      </Field>
      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Create lease"}
        </Button>
      </div>
    </form>
  );
}

// --------------------------------------------------------------------------

export function RentPaymentForm({
  propertyId,
  leaseId,
}: {
  propertyId: string;
  leaseId: string;
}) {
  const [state, formAction, pending] = useForm(createRentPaymentAction);
  const formRef = useRef<HTMLFormElement | null>(null);
  useEffect(() => {
    if (state.ok && formRef.current) formRef.current.reset();
  }, [state.ok]);
  const fe = state.fieldErrors ?? {};
  const today = isoDateInput(new Date());

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      <input type="hidden" name="propertyId" value={propertyId} />
      <input type="hidden" name="leaseId" value={leaseId} />
      {state.error && <Alert tone="error">{state.error}</Alert>}
      {state.ok && <Alert tone="success">Payment recorded.</Alert>}
      <div className="grid sm:grid-cols-3 gap-4">
        <Field>
          <Label htmlFor="paidOn">Paid on</Label>
          <Input id="paidOn" name="paidOn" type="date" required defaultValue={today} />
        </Field>
        <Field>
          <Label htmlFor="periodStart">Period start</Label>
          <Input id="periodStart" name="periodStart" type="date" required />
        </Field>
        <Field>
          <Label htmlFor="periodEnd">Period end</Label>
          <Input id="periodEnd" name="periodEnd" type="date" required />
        </Field>
      </div>
      <div className="grid sm:grid-cols-3 gap-4">
        <Field>
          <Label htmlFor="amount">Amount (R)</Label>
          <Input id="amount" name="amount" type="number" min="0" step="0.01" required />
          {fe.amount && <FieldHint className="text-red-600">{fe.amount}</FieldHint>}
        </Field>
        <Field>
          <Label htmlFor="status">Status</Label>
          <Select id="status" name="status" defaultValue="Paid">
            <option>Paid</option>
            <option>Partial</option>
            <option>Late</option>
            <option>Pending</option>
          </Select>
        </Field>
        <Field>
          <Label htmlFor="reference">Reference</Label>
          <Input id="reference" name="reference" />
        </Field>
      </div>
      <Field>
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" name="notes" />
      </Field>
      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Record payment"}
        </Button>
      </div>
    </form>
  );
}

// --------------------------------------------------------------------------

export function ExpenseForm({ propertyId }: { propertyId: string }) {
  const [state, formAction, pending] = useForm(createExpenseAction);
  const formRef = useRef<HTMLFormElement | null>(null);
  useEffect(() => {
    if (state.ok && formRef.current) formRef.current.reset();
  }, [state.ok]);
  const fe = state.fieldErrors ?? {};
  const today = isoDateInput(new Date());

  const [categoryCode, setCategoryCode] = useState("REPAIRS");
  const cat = getCategory(categoryCode);
  const isCapitalDefault = cat?.defaultIsCapital ?? false;
  const isMixed = cat?.kind === "mixed";

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      <input type="hidden" name="propertyId" value={propertyId} />
      {state.error && <Alert tone="error">{state.error}</Alert>}
      {state.ok && <Alert tone="success">Expense recorded.</Alert>}

      <div className="grid sm:grid-cols-2 gap-4">
        <Field>
          <Label htmlFor="date">Date</Label>
          <Input id="date" name="date" type="date" required defaultValue={today} />
        </Field>
        <Field>
          <Label htmlFor="amount">Amount (R)</Label>
          <Input id="amount" name="amount" type="number" min="0" step="0.01" required />
          {fe.amount && <FieldHint className="text-red-600">{fe.amount}</FieldHint>}
        </Field>
      </div>

      <Field>
        <Label htmlFor="categoryCode">Category</Label>
        <Select
          id="categoryCode"
          name="categoryCode"
          value={categoryCode}
          onChange={(e) => setCategoryCode(e.target.value)}
          required
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
        {cat && <FieldHint>{cat.guidance}</FieldHint>}
      </Field>

      {isCapitalDefault && (
        <Alert tone="warning" title="Capital expense">
          This category is treated as <b>capital</b> by default — it is{" "}
          <b>not deductible</b> against rental income, but is added to your CGT base
          cost when you sell.
        </Alert>
      )}
      {isMixed && !isCapitalDefault && (
        <Alert tone="info" title="Check capital vs revenue">
          This category can be either revenue or capital depending on the substance
          of the spend. Tick the capital box below if it is.
        </Alert>
      )}

      <Field>
        <Label htmlFor="description">Description</Label>
        <Input id="description" name="description" required />
        {fe.description && <FieldHint className="text-red-600">{fe.description}</FieldHint>}
      </Field>
      <Field>
        <Label htmlFor="vendor">Vendor / payee</Label>
        <Input id="vendor" name="vendor" />
      </Field>

      <Field>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="isCapital"
            defaultChecked={isCapitalDefault}
            className="h-4 w-4 rounded border-zinc-300"
          />
          Treat as capital (CGT base cost; not deductible this year)
        </label>
      </Field>

      <Field>
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" name="notes" />
      </Field>

      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Record expense"}
        </Button>
      </div>
    </form>
  );
}

// --------------------------------------------------------------------------

export function LoanForm({ propertyId }: { propertyId: string }) {
  const [state, formAction, pending] = useForm(createLoanAction);
  const formRef = useRef<HTMLFormElement | null>(null);
  useEffect(() => {
    if (state.ok && formRef.current) formRef.current.reset();
  }, [state.ok]);
  const fe = state.fieldErrors ?? {};

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      <input type="hidden" name="propertyId" value={propertyId} />
      {state.error && <Alert tone="error">{state.error}</Alert>}
      {state.ok && <Alert tone="success">Loan recorded.</Alert>}
      <div className="grid sm:grid-cols-2 gap-4">
        <Field>
          <Label htmlFor="lender">Lender</Label>
          <Input id="lender" name="lender" placeholder="e.g. Standard Bank" required />
          {fe.lender && <FieldHint className="text-red-600">{fe.lender}</FieldHint>}
        </Field>
        <Field>
          <Label htmlFor="accountNumber">Account number</Label>
          <Input id="accountNumber" name="accountNumber" />
        </Field>
      </div>
      <div className="grid sm:grid-cols-3 gap-4">
        <Field>
          <Label htmlFor="originalBalance">Original balance (R)</Label>
          <Input id="originalBalance" name="originalBalance" type="number" min="0" step="0.01" required />
          {fe.originalBalance && (
            <FieldHint className="text-red-600">{fe.originalBalance}</FieldHint>
          )}
        </Field>
        <Field>
          <Label htmlFor="startDate">Start date</Label>
          <Input id="startDate" name="startDate" type="date" required />
        </Field>
        <Field>
          <Label htmlFor="termMonths">Term (months)</Label>
          <Input id="termMonths" name="termMonths" type="number" min="1" defaultValue="240" required />
        </Field>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <Field>
          <Label htmlFor="interestRate">Interest rate (% p.a.)</Label>
          <Input id="interestRate" name="interestRate" type="number" min="0" step="0.01" required />
        </Field>
        <Field>
          <Label htmlFor="initiationFees">Initiation fees (R)</Label>
          <Input
            id="initiationFees"
            name="initiationFees"
            type="number"
            min="0"
            step="0.01"
            defaultValue="0"
          />
          <FieldHint>Auto-amortised over the loan term (Practice Note 31).</FieldHint>
        </Field>
      </div>
      <Field>
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" name="notes" />
      </Field>
      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Add loan"}
        </Button>
      </div>
    </form>
  );
}

// --------------------------------------------------------------------------

export function LoanStatementForm({
  propertyId,
  loanId,
}: {
  propertyId: string;
  loanId: string;
}) {
  const [state, formAction, pending] = useForm(createLoanStatementAction);
  const formRef = useRef<HTMLFormElement | null>(null);
  useEffect(() => {
    if (state.ok && formRef.current) formRef.current.reset();
  }, [state.ok]);
  const fe = state.fieldErrors ?? {};

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      <input type="hidden" name="propertyId" value={propertyId} />
      <input type="hidden" name="loanId" value={loanId} />
      {state.error && <Alert tone="error">{state.error}</Alert>}
      {state.ok && <Alert tone="success">Statement recorded.</Alert>}
      <div className="grid sm:grid-cols-2 gap-4">
        <Field>
          <Label htmlFor="periodStart">Period start</Label>
          <Input id="periodStart" name="periodStart" type="date" required />
        </Field>
        <Field>
          <Label htmlFor="periodEnd">Period end</Label>
          <Input id="periodEnd" name="periodEnd" type="date" required />
        </Field>
      </div>
      <div className="grid sm:grid-cols-3 gap-4">
        <Field>
          <Label htmlFor="openingBalance">Opening balance (R)</Label>
          <Input id="openingBalance" name="openingBalance" type="number" min="0" step="0.01" required />
        </Field>
        <Field>
          <Label htmlFor="closingBalance">Closing balance (R)</Label>
          <Input id="closingBalance" name="closingBalance" type="number" min="0" step="0.01" required />
        </Field>
        <Field>
          <Label htmlFor="interestCharged">Interest charged (R)</Label>
          <Input
            id="interestCharged"
            name="interestCharged"
            type="number"
            min="0"
            step="0.01"
            required
          />
          {fe.interestCharged && (
            <FieldHint className="text-red-600">{fe.interestCharged}</FieldHint>
          )}
          <FieldHint>This is the SARS-deductible figure.</FieldHint>
        </Field>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <Field>
          <Label htmlFor="feesCharged">Fees charged (R)</Label>
          <Input id="feesCharged" name="feesCharged" type="number" min="0" step="0.01" defaultValue="0" />
        </Field>
        <Field>
          <Label htmlFor="principalPaid">Principal paid (R)</Label>
          <Input id="principalPaid" name="principalPaid" type="number" min="0" step="0.01" defaultValue="0" />
        </Field>
      </div>
      <Field>
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" name="notes" />
      </Field>
      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Add statement"}
        </Button>
      </div>
    </form>
  );
}
