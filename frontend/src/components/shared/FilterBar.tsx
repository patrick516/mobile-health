import { cn } from "../../lib/utils";

interface Pill {
  label: string;
  value: string;
}

interface Props {
  pills?: Pill[];
  activeValue?: string;
  onPillChange?: (v: string) => void;
  children?: React.ReactNode;
}

export function FilterBar({
  pills,
  activeValue,
  onPillChange,
  children,
}: Props) {
  return (
    <div className="flex items-center gap-2 px-5 py-3 border-b border-purple-100 flex-wrap">
      {pills?.map((p) => (
        <button
          key={p.value}
          onClick={() => onPillChange?.(p.value)}
          className={cn(
            "px-3 py-1 rounded-full text-xs font-medium border transition-all",
            activeValue === p.value
              ? "bg-fuchsia-50 border-fuchsia-300 text-fuchsia-700"
              : "border-purple-200 text-gray-500 hover:bg-purple-50",
          )}
        >
          {p.label}
        </button>
      ))}
      {children && (
        <div className="ml-auto flex items-center gap-2">{children}</div>
      )}
    </div>
  );
}
