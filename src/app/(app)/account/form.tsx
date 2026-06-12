"use client";

import { useActionState, useEffect, useRef } from "react";
import { changePasswordAction, type ActionState } from "./actions";
import { Button } from "@/components/ui/button";
import { Field, FieldHint, Input, Label } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";

export function ChangePasswordForm() {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    changePasswordAction,
    {},
  );
  const formRef = useRef<HTMLFormElement | null>(null);
  useEffect(() => {
    if (state.ok && formRef.current) formRef.current.reset();
  }, [state.ok]);
  const fe = state.fieldErrors ?? {};

  return (
    <form ref={formRef} action={formAction} className="space-y-4 max-w-sm">
      {state.error && <Alert tone="error">{state.error}</Alert>}
      {state.ok && <Alert tone="success">Password changed.</Alert>}
      <Field>
        <Label htmlFor="currentPassword">Current password</Label>
        <Input
          id="currentPassword"
          name="currentPassword"
          type="password"
          autoComplete="current-password"
          required
        />
        {fe.currentPassword && (
          <FieldHint className="text-red-600">{fe.currentPassword}</FieldHint>
        )}
      </Field>
      <Field>
        <Label htmlFor="newPassword">New password</Label>
        <Input
          id="newPassword"
          name="newPassword"
          type="password"
          autoComplete="new-password"
          required
        />
        {fe.newPassword && <FieldHint className="text-red-600">{fe.newPassword}</FieldHint>}
      </Field>
      <Field>
        <Label htmlFor="confirmPassword">Confirm new password</Label>
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
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Change password"}
      </Button>
    </form>
  );
}
