"use client";

import { createPropertyAction } from "./actions";
import { PropertyForm } from "@/components/property-form";

export function NewPropertyForm() {
  return (
    <PropertyForm
      action={createPropertyAction}
      submitLabel="Create property"
      cancelHref="/properties"
    />
  );
}
