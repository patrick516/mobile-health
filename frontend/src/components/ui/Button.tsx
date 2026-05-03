import { cn } from "../../lib/utils";

type Variant = "primary" | "outline" | "danger" | "success" | "ghost";
type Size = "sm" | "md";

const base =
  "inline-flex items-center gap-1.5 rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer";

const variants: Record<Variant, string> = {
  primary:
    "bg-gradient-to-r from-fuchsia-600 to-violet-600 text-white shadow-sm hover:opacity-90",
  outline:
    "border border-purple-200 text-purple-900 hover:bg-purple-50 bg-white",
  danger: "bg-red-50 text-red-700 border border-red-200 hover:bg-red-100",
  success:
    "bg-green-50 text-green-700 border border-green-200 hover:bg-green-100",
  ghost: "text-gray-500 hover:bg-gray-100",
};

const sizes: Record<Size, string> = {
  sm: "px-2.5 py-1 text-xs",
  md: "px-4 py-2 text-sm",
};

interface Props extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

export function Button({
  variant = "outline",
  size = "md",
  loading,
  className,
  children,
  disabled,
  ...rest
}: Props) {
  return (
    <button
      className={cn(base, variants[variant], sizes[size], className)}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? <span className="animate-spin">⟳</span> : children}
    </button>
  );
}
