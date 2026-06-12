"use client";

import { useActionState } from "react";
import { setupAction, type SetupState } from "./actions";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Field, FieldHint, Input, Label } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";

export function SetupForm() {
  const [state, formAction, pending] = useActionState<SetupState, FormData>(
    setupAction,
    {},
  );
  const fe = state.fieldErrors ?? {};

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">
          ISINVESTMENT
        </div>
        <CardTitle className="mt-1">Create your administrator account</CardTitle>
        <CardDescription className="mt-1">
          This is a one-time setup. You can invite the rest of your team from
          Settings afterwards.
        </CardDescription>
      </CardHeader>
      <CardBody>
        <form action={formAction} className="space-y-4">
          {state.error && <Alert tone="error">{state.error}</Alert>}
          <Field>
            <Label htmlFor="name">Full name</Label>
            <Input id="name" name="name" required autoFocus />
            {fe.name && <FieldHint className="text-red-600">{fe.name}</FieldHint>}
          </Field>
          <Field>
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" autoComplete="email" required />
            {fe.email && <FieldHint className="text-red-600">{fe.email}</FieldHint>}
          </Field>
          <Field>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
            />
            {fe.password && <FieldHint className="text-red-600">{fe.password}</FieldHint>}
          </Field>
          <Field>
            <Label htmlFor="confirmPassword">Confirm password</Label>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              required
            />
            {fe.confirmPassword && (
              <FieldHint className="text-red-600">{fe.confirmPassword}</FieldHint>
            )}
          </Field>
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Creating…" : "Create account & sign in"}
          </Button>
        </form>
      </CardBody>
    </Card>
  );
}
