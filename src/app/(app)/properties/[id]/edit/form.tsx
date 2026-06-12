"use client";

import { updatePropertyAction } from "./actions";
import { PropertyForm, type PropertyFormDefaults } from "@/components/property-form";

export function EditPropertyForm({
  propertyId,
  defaults,
}: {
  propertyId: string;
  defaults: PropertyFormDefaults;
}) {
  return (
    <PropertyForm
      action={updatePropertyAction}
      submitLabel="Save changes"
      cancelHref={`/properties/${propertyId}`}
      defaults={defaults}
      hiddenFields={{ propertyId }}
    />
  );
}
