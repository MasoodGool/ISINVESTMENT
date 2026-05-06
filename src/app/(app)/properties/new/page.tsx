import { NewPropertyForm } from "./form";

export default function NewPropertyPage() {
  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Add a property</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Capture acquisition details. Transfer duty and attorney fees are part of CGT
          base cost — track them under expenses after creation.
        </p>
      </div>
      <NewPropertyForm />
    </div>
  );
}
