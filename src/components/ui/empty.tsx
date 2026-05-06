import { cn } from "@/lib/utils";

export function EmptyState({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-lg border border-dashed border-zinc-300 bg-zinc-50/50 px-6 py-12 text-center",
        className,
      )}
    >
      <div className="text-base font-medium text-zinc-800">{title}</div>
      {description && <div className="mt-1 text-sm text-zinc-500">{description}</div>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
