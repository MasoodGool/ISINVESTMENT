"use client";

import { useActionState, useEffect, useRef } from "react";
import { Trash2 } from "lucide-react";
import {
  createTaxNoteAction,
  deleteTaxNoteAction,
  type NoteActionState,
} from "./actions";
import { Button } from "@/components/ui/button";
import { Field, Label, Textarea } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";

export interface TaxNote {
  id: string;
  body: string;
  createdAt: string;
}

export function TaxNotes({
  taxYear,
  notes,
  writable,
}: {
  taxYear: number;
  notes: TaxNote[];
  writable: boolean;
}) {
  const [state, formAction, pending] = useActionState<NoteActionState, FormData>(
    createTaxNoteAction,
    {},
  );
  const formRef = useRef<HTMLFormElement | null>(null);
  useEffect(() => {
    if (state.ok && formRef.current) formRef.current.reset();
  }, [state.ok]);

  return (
    <div className="space-y-4">
      {notes.length === 0 ? (
        <p className="text-sm text-zinc-500">
          No notes for this tax year yet. Use notes for anything your accountant
          should know — vacancy periods, insurance payouts, ring-fencing history.
        </p>
      ) : (
        <ul className="space-y-2">
          {notes.map((n) => (
            <li
              key={n.id}
              className="flex items-start justify-between gap-3 rounded-md border border-zinc-200 bg-zinc-50/50 px-4 py-3"
            >
              <div>
                <p className="text-sm text-zinc-800 whitespace-pre-wrap">{n.body}</p>
                <p className="mt-1 text-xs text-zinc-400">{n.createdAt}</p>
              </div>
              {writable && <DeleteNoteButton id={n.id} />}
            </li>
          ))}
        </ul>
      )}

      {writable && (
        <form ref={formRef} action={formAction} className="space-y-3">
          <input type="hidden" name="taxYear" value={taxYear} />
          {state.error && <Alert tone="error">{state.error}</Alert>}
          <Field>
            <Label htmlFor="note-body">Add a note</Label>
            <Textarea
              id="note-body"
              name="body"
              rows={2}
              placeholder="e.g. Unit vacant March–April while regrouting bathroom."
            />
          </Field>
          <div className="flex justify-end">
            <Button type="submit" size="sm" disabled={pending}>
              {pending ? "Saving…" : "Add note"}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}

function DeleteNoteButton({ id }: { id: string }) {
  const [, formAction, pending] = useActionState<NoteActionState, FormData>(
    deleteTaxNoteAction,
    {},
  );
  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (!window.confirm("Delete this note?")) e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        disabled={pending}
        className="rounded p-1 text-zinc-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
        title="Delete note"
      >
        <Trash2 className="h-3.5 w-3.5" />
        <span className="sr-only">Delete</span>
      </button>
    </form>
  );
}
