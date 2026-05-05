"use client";

import { useActionState } from "react";
import Link from "next/link";
import { createPropertyAction, type FormState } from "./actions";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Field, FieldHint, Input, Label, Select, Textarea } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";

export function NewPropertyForm() {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    createPropertyAction,
    {},
  );
  const fe = state.fieldErrors ?? {};

  return (
    <Card>
      <CardBody>
        <form action={formAction} className="space-y-5">
          {state.error && <Alert tone="error">{state.error}</Alert>}

          <div className="grid sm:grid-cols-2 gap-4">
            <Field>
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" placeholder="e.g. 12 Oak Avenue" required />
              {fe.name && <FieldHint className="text-red-600">{fe.name}</FieldHint>}
            </Field>
            <Field>
              <Label htmlFor="type">Type</Label>
              <Select id="type" name="type" defaultValue="Residential">
                <option>Residential</option>
                <option>Sectional</option>
                <option>Commercial</option>
                <option>Other</option>
              </Select>
            </Field>
          </div>

          <Field>
            <Label htmlFor="addressLine1">Address line 1</Label>
            <Input id="addressLine1" name="addressLine1" required />
            {fe.addressLine1 && (
              <FieldHint className="text-red-600">{fe.addressLine1}</FieldHint>
            )}
          </Field>
          <Field>
            <Label htmlFor="addressLine2">Address line 2</Label>
            <Input id="addressLine2" name="addressLine2" />
          </Field>

          <div className="grid sm:grid-cols-3 gap-4">
            <Field>
              <Label htmlFor="city">City</Label>
              <Input id="city" name="city" required />
              {fe.city && <FieldHint className="text-red-600">{fe.city}</FieldHint>}
            </Field>
            <Field>
              <Label htmlFor="province">Province</Label>
              <Select id="province" name="province" defaultValue="Western Cape">
                <option>Eastern Cape</option>
                <option>Free State</option>
                <option>Gauteng</option>
                <option>KwaZulu-Natal</option>
                <option>Limpopo</option>
                <option>Mpumalanga</option>
                <option>Northern Cape</option>
                <option>North West</option>
                <option>Western Cape</option>
              </Select>
            </Field>
            <Field>
              <Label htmlFor="postalCode">Postal code</Label>
              <Input id="postalCode" name="postalCode" />
            </Field>
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            <Field>
              <Label htmlFor="purchaseDate">Purchase date</Label>
              <Input id="purchaseDate" name="purchaseDate" type="date" required />
            </Field>
            <Field>
              <Label htmlFor="purchasePrice">Purchase price (R)</Label>
              <Input
                id="purchasePrice"
                name="purchasePrice"
                type="number"
                min="0"
                step="0.01"
                required
              />
              {fe.purchasePrice && (
                <FieldHint className="text-red-600">{fe.purchasePrice}</FieldHint>
              )}
            </Field>
            <Field>
              <Label htmlFor="acquisitionCosts">Acquisition costs (R)</Label>
              <Input
                id="acquisitionCosts"
                name="acquisitionCosts"
                type="number"
                min="0"
                step="0.01"
                defaultValue="0"
              />
              <FieldHint>Transfer duty + attorney fees. Adds to CGT base cost.</FieldHint>
            </Field>
          </div>

          <Field>
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" name="notes" placeholder="Anything worth remembering" />
          </Field>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Link href="/properties">
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </Link>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Create property"}
            </Button>
          </div>
        </form>
      </CardBody>
    </Card>
  );
}
