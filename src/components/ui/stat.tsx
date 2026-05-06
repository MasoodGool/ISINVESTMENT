import { cn } from "@/lib/utils";

export function Stat({
  label,
  value,
  hint,
  tone = "neutral",
  className,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  tone?: "neutral" | "green" | "red";
  className?: string;
}) {
  const valueTone =
    tone === "green" ? "text-green-700" : tone === "red" ? "text-red-700" : "text-zinc-900";
  return (
    <div className={cn("rounded-lg border border-zinc-200 bg-white p-4", className)}>
      <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">{label}</div>
      <div className={cn("mt-1 text-2xl font-semibold tabular-nums", valueTone)}>{value}</div>
      {hint && <div className="mt-1 text-xs text-zinc-500">{hint}</div>}
    </div>
  );
}
