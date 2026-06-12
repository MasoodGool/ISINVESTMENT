"use client";

import { useActionState, useEffect, useRef } from "react";
import {
  createUserAction,
  updateUserRoleAction,
  setUserActiveAction,
  resetPasswordAction,
  type ActionState,
} from "./actions";
import { Button } from "@/components/ui/button";
import { Field, FieldHint, Input, Label, Select } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import { ROLES, ROLE_DESCRIPTIONS, ROLE_LABELS } from "@/lib/rbac";

function useForm(action: (prev: ActionState, fd: FormData) => Promise<ActionState>) {
  return useActionState<ActionState, FormData>(action, {});
}

export function CreateUserForm() {
  const [state, formAction, pending] = useForm(createUserAction);
  const formRef = useRef<HTMLFormElement | null>(null);
  useEffect(() => {
    if (state.ok && formRef.current) formRef.current.reset();
  }, [state.ok]);
  const fe = state.fieldErrors ?? {};

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      {state.error && <Alert tone="error">{state.error}</Alert>}
      {state.ok && <Alert tone="success">User created. Share the password securely.</Alert>}
      <div className="grid sm:grid-cols-2 gap-4">
        <Field>
          <Label htmlFor="name">Full name</Label>
          <Input id="name" name="name" required />
          {fe.name && <FieldHint className="text-red-600">{fe.name}</FieldHint>}
        </Field>
        <Field>
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" required />
          {fe.email && <FieldHint className="text-red-600">{fe.email}</FieldHint>}
        </Field>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <Field>
          <Label htmlFor="role">Role</Label>
          <Select id="role" name="role" defaultValue="MANAGER">
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </Select>
          <FieldHint>
            {ROLES.map((r) => `${ROLE_LABELS[r]}: ${ROLE_DESCRIPTIONS[r]}`).join(" ")}
          </FieldHint>
        </Field>
        <Field>
          <Label htmlFor="password">Temporary password</Label>
          <Input id="password" name="password" type="text" autoComplete="off" required />
          {fe.password && <FieldHint className="text-red-600">{fe.password}</FieldHint>}
          <FieldHint>At least 10 characters. The user should change it after first sign-in.</FieldHint>
        </Field>
      </div>
      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? "Creating…" : "Create user"}
        </Button>
      </div>
    </form>
  );
}

export function ChangeRoleForm({
  userId,
  currentRole,
  disabled,
}: {
  userId: string;
  currentRole: string;
  disabled?: boolean;
}) {
  const [state, formAction, pending] = useForm(updateUserRoleAction);

  return (
    <form action={formAction} className="flex items-center gap-2">
      <input type="hidden" name="userId" value={userId} />
      <Select
        name="role"
        defaultValue={currentRole}
        disabled={disabled || pending}
        className="h-8 text-xs"
      >
        {ROLES.map((r) => (
          <option key={r} value={r}>
            {ROLE_LABELS[r]}
          </option>
        ))}
      </Select>
      <Button type="submit" size="sm" variant="outline" disabled={disabled || pending}>
        {pending ? "…" : "Set"}
      </Button>
      {state.error && <span className="text-xs text-red-600">{state.error}</span>}
    </form>
  );
}

export function ToggleActiveForm({
  userId,
  active,
  disabled,
}: {
  userId: string;
  active: boolean;
  disabled?: boolean;
}) {
  const [state, formAction, pending] = useForm(setUserActiveAction);

  return (
    <form action={formAction} className="inline-flex items-center gap-2">
      <input type="hidden" name="userId" value={userId} />
      <input type="hidden" name="active" value={active ? "false" : "true"} />
      <Button type="submit" size="sm" variant="outline" disabled={disabled || pending}>
        {pending ? "…" : active ? "Deactivate" : "Activate"}
      </Button>
      {state.error && <span className="text-xs text-red-600">{state.error}</span>}
    </form>
  );
}

export function ResetPasswordForm({ userId }: { userId: string }) {
  const [state, formAction, pending] = useForm(resetPasswordAction);
  const formRef = useRef<HTMLFormElement | null>(null);
  useEffect(() => {
    if (state.ok && formRef.current) formRef.current.reset();
  }, [state.ok]);

  return (
    <form ref={formRef} action={formAction} className="flex items-center gap-2">
      <input type="hidden" name="userId" value={userId} />
      <Input
        name="password"
        type="text"
        placeholder="New password"
        autoComplete="off"
        className="h-8 w-40 text-xs"
        required
      />
      <Button type="submit" size="sm" variant="outline" disabled={pending}>
        {pending ? "…" : "Reset"}
      </Button>
      {state.ok && <span className="text-xs text-green-700">Done</span>}
      {state.error && <span className="text-xs text-red-600">{state.error}</span>}
    </form>
  );
}
