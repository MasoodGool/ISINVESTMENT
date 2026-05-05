import { cn } from "@/lib/utils";
import { AlertTriangle, Info, CheckCircle2 } from "lucide-react";

type Tone = "info" | "warning" | "success" | "error";

const tones: Record<Tone, { wrap: string; icon: React.ReactNode }> = {
  info: {
    wrap: "border-blue-200 bg-blue-50 text-blue-900",
    icon: <Info className="h-4 w-4 text-blue-600 shrink-0" />,
  },
  warning: {
    wrap: "border-amber-200 bg-amber-50 text-amber-900",
    icon: <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />,
  },
  success: {
    wrap: "border-green-200 bg-green-50 text-green-900",
    icon: <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />,
  },
  error: {
    wrap: "border-red-200 bg-red-50 text-red-900",
    icon: <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />,
  },
};

export function Alert({
  tone = "info",
  title,
  children,
  className,
}: {
  tone?: Tone;
  title?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  const t = tones[tone];
  return (
    <div
      className={cn("flex gap-3 rounded-md border px-4 py-3 text-sm", t.wrap, className)}
    >
      <div className="pt-0.5">{t.icon}</div>
      <div>
        {title && <div className="font-medium">{title}</div>}
        {children && <div className="mt-0.5 text-sm">{children}</div>}
      </div>
    </div>
  );
}
