import { cn } from "../../lib/utils";

interface Props {
  initials: string;
  color: string;
  size?: "sm" | "md" | "lg" | "xl";
  isOnline?: boolean;
  isVerified?: boolean;
  className?: string;
}

const sizes = {
  sm: "w-7 h-7 text-xs",
  md: "w-9 h-9 text-sm",
  lg: "w-16 h-16 text-xl",
  xl: "w-20 h-20 text-2xl",
};

export function Avatar({
  initials,
  color,
  size = "md",
  isOnline,
  isVerified,
  className,
}: Props) {
  return (
    <div className={cn("relative flex-shrink-0", className)}>
      <div
        className={cn(
          "rounded-full flex items-center justify-center font-bold text-white",
          sizes[size],
        )}
        style={{ background: color }}
      >
        {initials}
      </div>
      {isOnline && (
        <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white" />
      )}
      {isVerified && !isOnline && (
        <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white" />
      )}
    </div>
  );
}
