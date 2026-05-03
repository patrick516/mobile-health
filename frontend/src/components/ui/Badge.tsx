import { cn } from "../../lib/utils";

type Variant = "success" | "danger" | "warning" | "info" | "purple" | "gray";

const styles: Record<Variant, string> = {
  success: "bg-green-50 text-green-700 border border-green-200",
  danger: "bg-red-50 text-red-700 border border-red-200",
  warning: "bg-amber-50 text-amber-700 border border-amber-200",
  info: "bg-blue-50 text-blue-700 border border-blue-200",
  purple: "bg-purple-50 text-purple-700 border border-purple-200",
  gray: "bg-gray-100 text-gray-600 border border-gray-200",
};

interface Props {
  variant?: Variant;
  children: React.ReactNode;
  className?: string;
}

export function Badge({ variant = "gray", children, className }: Props) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold",
        styles[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}
